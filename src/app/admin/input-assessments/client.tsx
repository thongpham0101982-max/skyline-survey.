"use client"
const DEFAULT_WATERMARK_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%23007A87'><path d='M10,80 Q50,40 90,20 Q60,50 10,80 Z'/><path d='M30,80 Q60,55 90,35 Q65,60 30,80 Z'/></svg>";

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  Plus, Search, Edit2, Trash2, Users, Settings, Clock, BarChart3,
  Upload, Download, Layers, Database, UserCheck, Calendar, X, Check, AlertCircle,
  ChevronDown, ChevronUp, Loader2, BookOpen, GraduationCap, RefreshCw,
  Tag, FolderOpen, Hash, MoreVertical, PenLine, CheckCircle2,
  Filter, ClipboardCheck, ArrowRight, UserPlus, Info,
  FileSpreadsheet, Pencil, Mail, FileText
} from "lucide-react"
import * as XLSX from "xlsx"

// ========= TYPES =========
interface AcademicYear { id: string; name: string; status: string }
interface Campus { id: string; campusName: string; campusCode: string; manager?: { fullName: string } }
interface User { id: string; fullName: string }
interface AssessmentSubject { id: string; name: string; code: string; status: string; sortOrder: number }
interface EduSystem { id: string; name: string; code: string }
interface AssessmentConfig { id: string; name: string; categoryType: string; sortOrder: number; code: string; academicYearId?: string }
interface Teacher { userId: string; teacherName: string; departmentId?: string }
interface Department { id: string; name: string }
interface Batch { id: string; periodId: string; batchNumber: number; name: string; startDate: string; endDate: string; status: string; campusId?: string; assignedUserId?: string; assignedUser?: { id: string; fullName: string } }
interface Period {
  id: string; code: string; name: string; academicYearId: string;
  campusId?: string; assignedUserId?: string; startDate?: string; endDate?: string;
  description?: string; status: string; batches?: Batch[];
}
interface Student {
  id: string; studentCode: string; fullName: string; dateOfBirth?: string;
  grade?: string; admissionCriteria?: string; className?: string; surveySystem?: string;
  targetType?: string; hocKy?: string; kqgdTieuHoc?: string; kqHocTap?: string;
  kqRenLuyen?: string; admissionResult?: string; batchId?: string; periodId: string;
  hoSoCtQuocTe?: string; surveyFormType?: string; admissionCampus?: string;
  }
interface Assignment {
  id: string; periodId: string; batchId?: string; userId: string; 
  subjectId: string; grade: string; educationSystem: string;
  user?: { fullName: string }; subject?: { name: string }; batch?: { name: string };
}

interface Props {
  academicYears: AcademicYear[]; campuses: Campus[]; examBoardUsers: User[];
  subjects: AssessmentSubject[]; eduSystems: EduSystem[]; grades: string[];
  configs: AssessmentConfig[]; teachers: Teacher[]; departments: Department[];
  giaoVuCSUsers?: User[];
  gdcsUsers?: any[];
  currentUser?: { id: string; role: string; campusIds: string[]; fullName?: string } | null;
}

// ========= CONSTANTS =========
const CATEGORY_TYPES = [
  { code: "DOI_TUONG_TS",  label: "Đối tượng Tuyển sinh", color: "from-pink-500 to-rose-500" },
  { code: "DIEN_KS",       label: "Diện Khảo sát",      color: "from-violet-500 to-indigo-500" },
  { code: "HINH_THUC_KS",  label: "Hình thức KS",        color: "from-blue-500 to-cyan-500" },
  { code: "HS_HT_HOC_SINH", label: "Hồ sơ/Bảng điểm",   color: "from-emerald-500 to-teal-500" },
  { code: "HOC_KY",        label: "Học kỳ / Năm TS",     color: "from-amber-500 to-orange-500" },
  { code: "KY_KS",          label: "Kỳ Khảo sát",         color: "from-orange-500 to-red-500" },
  { code: "KQ_HOC_TAP",    label: "Kết quả Học tập",     color: "from-sky-500 to-blue-500" },
  { code: "KQ_REN_LUYEN",  label: "Kết quả Rèn luyện",   color: "from-green-500 to-emerald-500" },
]
const STATUS_OPTS = ["ACTIVE", "LOCKED", "DRAFT", "CLOSED"]
const STATUS_MAP: Record<string,{label:string,cls:string}> = {
  ACTIVE:   { label:"Đang mở",   cls:"bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" },
  LOCKED:   { label:"Đã khóa",   cls:"bg-slate-200 text-slate-700 ring-1 ring-slate-300" },
  DRAFT:    { label:"Bản nháp",  cls:"bg-amber-100 text-amber-700 ring-1 ring-amber-200" },
  CLOSED:   { label:"Kết thúc", cls:"bg-red-100 text-red-700 ring-1 ring-red-200" },
  INACTIVE: { label:"Tắt",      cls:"bg-slate-100 text-slate-500 ring-1 ring-slate-200" },
}

function Badge({ s }: { s: string }) {
  const m = STATUS_MAP[s] || STATUS_MAP.INACTIVE
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${m.cls}`}>{m.label}</span>
}

function Field({ label, required, children }: { label:string; required?:boolean; children:React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1 text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
const inp = "w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all placeholder:text-slate-300 shadow-sm"

function Modal({ open, onClose, title, size="md", children, footer }: {
  open:boolean; onClose:()=>void; title:string; size?:"sm"|"md"|"lg";
  children:React.ReactNode; footer:React.ReactNode
}) {
  if (!open) return null
  const w = size==="lg" ? "max-w-3xl" : size==="sm" ? "max-w-sm" : "max-w-lg"
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"/>
      <div className={`relative bg-white w-full ${w} rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200`} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-base font-black text-slate-800">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors text-slate-500 shadow-sm"><X className="w-4 h-4"/></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3 flex-shrink-0">{footer}</div>
      </div>
    </div>
  )
}

function ConfirmDialog({ open, onClose, onConfirm, message }: { open:boolean; onClose:()=>void; onConfirm:()=>void; message:string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-rose-200">
          <AlertCircle className="w-7 h-7 text-rose-600"/>
        </div>
        <h3 className="text-base font-black text-slate-800 mb-2">Xác nhận xóa</h3>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Hủy</button>
          <button onClick={()=>{onConfirm(); onClose()}} className="flex-1 py-3 bg-rose-600 text-white rounded-2xl text-sm font-bold hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all">Xóa</button>
        </div>
      </div>
    </div>
  )
}

function Toast({ msg, type }: { msg:string; type:"ok"|"err" }) {
  return (
    <div className={`fixed top-5 right-5 z-[400] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold animate-in slide-in-from-top-3 duration-300 ${type==="ok"?"bg-emerald-600 text-white":"bg-rose-600 text-white border-2 border-white/20"}`}>
      {type==="ok" ? <CheckCircle2 className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
      {msg}
    </div>
  )
}

function Spin() { return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-indigo-500 animate-spin opacity-50"/></div> }
function Empty({ icon:Icon, text, sub }: { icon:any; text:string; sub?:string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-5 border-2 border-dashed border-slate-200"><Icon className="w-10 h-10 text-slate-200"/></div>
      <p className="font-black text-slate-400 text-lg">{text}</p>
      {sub && <p className="text-xs text-slate-300 mt-1 font-bold uppercase tracking-widest">{sub}</p>}
    </div>
  )
}

const defaultThuChucMung = `Chúc mừng em đã vượt qua kỳ khảo sát đầu vào lớp {{grade}} học kì {{hocKy}} hệ {{surveyFormType}} năm học 2026-2027. Em đã chính thức đặt bước chân đầu tiên trên con đường trở thành học sinh của Trường TH, THCS, THPT Sky-Line – một cột mốc quan trọng trong hành trình học tập của em.

Thầy cô tại Sky-Line vui mừng chào đón em đến với ngôi trường hạnh phúc, nơi không chỉ giúp em trau dồi kiến thức mà còn phát triển toàn diện cả về năng lực và nhân cách. Chúng tôi tin rằng, với sự nỗ lực và quyết tâm, em sẽ tiếp tục gặt hái nhiều thành công trong những năm học sắp tới.

Nhà trường hy vọng rằng, với tinh thần ham học hỏi, em sẽ là một mảnh ghép sắc màu góp phần làm phong phú thêm bức tranh học đường tại Sky-Line. Nơi đây, em và các bạn không chỉ học tập để phát triển bản thân, mà còn giúp đỡ nhau tiến bộ và đóng góp tích cực cho cộng đồng.

Chúc em có những năm tháng học tập đầy ý nghĩa và trải nghiệm thú vị tại Sky-Line. Hãy luôn giữ vững niềm đam mê học hỏi và khát khao khám phá tri thức em nhé!`;

const defaultCamKet = `Hệ thống Giáo dục Sky-Line chúc mừng em đã vượt qua kỳ khảo sát đầu vào lớp {{grade}} học kì {{hocKy}} hệ {{surveyFormType}} năm học 2026-2027. Để tạo điều kiện tốt nhất cho hành trình phát triển toàn diện của học sinh tại trường, Nhà trường và Gia đình cùng thống nhất ký kết Bản Cam kết học tập này.

Gia đình và học sinh cam kết thực hiện đầy đủ các nội dung sau:
1. Học sinh nỗ lực rèn luyện, hoàn thành tốt các mục tiêu học tập và rèn luyện theo định hướng giáo dục của nhà trường.
2. Gia đình phối hợp chặt chẽ với Nhà trường trong việc theo dõi, hỗ trợ học sinh học tập tại nhà và tham gia đầy đủ các hoạt động giáo dục.
3. Thực hiện nghiêm túc nội quy học sinh, tôn trọng thầy cô, bạn bè và giữ gìn hình ảnh học sinh văn minh Sky-Line.

Bản cam kết được thực hiện dưới sự đồng thuận của cả hai bên và có giá trị kể từ ngày ký.`;

const defaultThuMoi = `Hội đồng Tuyển sinh Hệ thống Giáo dục Sky-Line trân trọng gửi lời chào và lời chúc sức khỏe, an khang đến Quý phụ huynh cùng gia đình.

Nhằm tạo điều kiện tốt nhất để nhà trường hiểu rõ hơn về năng lực tư duy, ngôn ngữ cũng như thiên hướng phát triển tự nhiên của học sinh, qua đó xây dựng lộ trình rèn luyện tối ưu nhất, chúng tôi trân trọng kính mời Quý phụ huynh cùng học sinh tham gia buổi Khảo sát Năng lực Đầu vào hệ {{surveyFormType}} năm học 2026-2027.

* Quý Phụ huynh vui lòng chuẩn bị các hồ sơ cần thiết và theo dõi lịch hẹn khảo sát chi tiết được sắp xếp từ Ban Tuyển sinh.

Sự hiện diện và đồng hành của Quý phụ huynh cùng học sinh là niềm hân hạnh lớn cho Sky-Line, giúp nhà trường có sự chuẩn bị chu đáo nhất đón chào các em gia nhập mái trường hạnh phúc của chúng ta.

Trân trọng kính mời Quý phụ huynh và các em học sinh!`;

const getDefaultContent = (type) => {
  if (type === "cam_ket_hoc_tap") return defaultCamKet;
  if (type === "thu_moi") return defaultThuMoi;
  return defaultThuChucMung;
};

const renderTemplate = (template, student) => {
  if (!template) return "";
  
  const rawGrade = student?.grade || "1";
  const gradeMatch = rawGrade.toString().match(/\d+/);
  const numericGrade = gradeMatch ? gradeMatch[0] : rawGrade;
  
  const comSubs = Array.isArray(student?.committedSubjects) 
    ? student.committedSubjects.join(", ") 
    : (student?.committedSubjects || "");
  
  return template
    .replace(/\{\{fullName\}\}/g, student?.fullName || "Lê Trà My")
    .replace(/\{\{grade\}\}/g, numericGrade)
    .replace(/\{\{hocKy\}\}/g, student?.hocKy || "1")
    .replace(/\{\{surveyFormType\}\}/g, student?.surveyFormType || "Hội nhập S")
    .replace(/\{\{admissionCampus\}\}/g, student?.admissionCampus || "")
    .replace(/\{\{directorNote\}\}/g, student?.directorNote || "")
    .replace(/\{\{committedSubjects\}\}/g, comSubs)
    .replace(/\{\{signatureName\}\}/g, student?.signatureName || "");
};

// ========= MAIN =========
export function InputAssessmentsClient({ academicYears = [], campuses = [], examBoardUsers = [], subjects: initialSubjects = [], eduSystems = [], configs: initialConfigs = [], grades = [], teachers = [], departments = [], giaoVuCSUsers = [], gdcsUsers = [], currentUser = null }: Props) {
  const [tab, setTab] = useState("periods")

  // ───────── CONFIGS STATE (MOVED TO TOP TO PREVENT TDZ REFERENCE ERROR) ─────────
  const [configs, setConfigs] = useState<AssessmentConfig[]>(initialConfigs)
  const [cLoading, setCLoading] = useState(false)
  const [cModal, setCModal] = useState(false)
  const [editC, setEditC] = useState<AssessmentConfig|null>(null)
  const [cForm, setCForm] = useState({ categoryType:"DIEN_KS", code:"", name:"" })

  // Admission Documents State
  const defaultDocGroups = useMemo(() => [
    { id: "khoi_1", label: "Khối 1" },
    { id: "khoi_2_5", label: "Khối 2 đến 5" },
    { id: "khoi_6", label: "Khối 6" },
    { id: "khoi_7_9", label: "Khối 7 đến 9" },
    { id: "khoi_10", label: "Khối 10" },
    { id: "khoi_11_12", label: "Khối 11 đến 12" },
    { id: "doi_tuong_tuyen_sinh", label: "Đối tượng Hồ sơ" },
  ], []);

  const [customDocGroups, setCustomDocGroups] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedGroups = localStorage.getItem('admission_doc_groups');
      if (savedGroups) {
        try {
          setCustomDocGroups(JSON.parse(savedGroups));
        } catch (e) {}
      } else {
        setCustomDocGroups(defaultDocGroups);
      }
    }
  }, [defaultDocGroups]);

  const docGroups = useMemo(() => {
    return customDocGroups;
  }, [customDocGroups]);

  const [docGroupTargets, setDocGroupTargets] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTargets = localStorage.getItem('admission_doc_targets');
      if (savedTargets) {
        try {
          setDocGroupTargets(JSON.parse(savedTargets));
        } catch (e) {}
      }
    }
  }, []);

  const [docGroupGrades, setDocGroupGrades] = useState<Record<string, string[]>>({
    "khoi_1": ["Khối 1"],
    "khoi_2_5": ["Khối 2", "Khối 3", "Khối 4", "Khối 5"],
    "khoi_6": ["Khối 6"],
    "khoi_7_9": ["Khối 7", "Khối 8", "Khối 9"],
    "khoi_10": ["Khối 10"],
    "khoi_11_12": ["Khối 11", "Khối 12"]
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedGrades = localStorage.getItem('admission_doc_grades_mapping');
      if (savedGrades) {
        try {
          setDocGroupGrades(JSON.parse(savedGrades));
        } catch (e) {}
      }
    }
  }, []);

  const [selectedDocGroup, setSelectedDocGroup] = useState("khoi_1");
  const getDocStorageKey = useCallback((group: string) => {
    return 'admission_docs_' + group;
  }, []);

  const [docList, setDocList] = useState([]);
  const filteredDocList = useMemo(() => {
    const activeTargets = docGroupTargets[selectedDocGroup] || [];
    const activeGrades = docGroupGrades[selectedDocGroup] || [];
    return docList.filter(d => {
      // When checkboxes are explicitly checked on screen, ONLY include documents explicitly matching them.
      const matchTarget = activeTargets.length === 0 || (d.targets && d.targets.some(t => activeTargets.includes(t)));
      const matchGrade = activeGrades.length === 0 || (d.grades && d.grades.some(g => activeGrades.includes(g)));
      return matchTarget && matchGrade;
    });
  }, [docList, selectedDocGroup, docGroupTargets, docGroupGrades]);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [docFormName, setDocFormName] = useState("");
  const [docFormQty, setDocFormQty] = useState("");
  const [docFormNote, setDocFormNote] = useState("");
  const [docFormSelectedTargets, setDocFormSelectedTargets] = useState([]);
  const [docFormSelectedGrades, setDocFormSelectedGrades] = useState([]);

  const defaultDocumentsGrade1 = useMemo(() => [
    { id: 1, name: "Đơn đăng ký nhập học (theo mẫu của Hệ thống)", qty: "01 bản chính", note: "" },
    { id: 2, name: "Bản sao Giấy khai sinh (hợp lệ)", qty: "01 bản", note: "" },
    { id: 3, name: "Giấy khám sức khỏe học sinh (trong vòng 6 tháng)", qty: "01 bản chính", note: "" },
    { id: 4, name: "Ảnh thẻ 3x4 (nền trắng, mới nhất)", qty: "04 ảnh", note: "" },
    { id: 5, name: "Bản sao Sổ hộ khẩu hoặc Giấy xác nhận cư trú (CT07)", qty: "01 bản", note: "" },
    { id: 6, name: "Giấy chứng nhận hoàn thành chương trình Mầm non", qty: "01 bản sao", note: "Nếu có" },
    { id: 7, name: "Bản sao Sổ tiêm chủng của học sinh", qty: "01 bản", note: "" },
    { id: 8, name: "Hồ sơ ưu đãi/giảm phí (nếu thuộc diện ưu tiên)", qty: "01 bộ", note: "Bản sao" },
  ], []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storageKey = getDocStorageKey(selectedDocGroup);
      const savedDocs = localStorage.getItem(storageKey);
      if (savedDocs) {
        try {
          setDocList(JSON.parse(savedDocs));
        } catch (e) {
          setDocList([]);
        }
      } else if (selectedDocGroup === "khoi_1") {
        setDocList(defaultDocumentsGrade1);
        localStorage.setItem(storageKey, JSON.stringify(defaultDocumentsGrade1));
      } else {
        setDocList([]);
      }
    }
  }, [selectedDocGroup, defaultDocumentsGrade1, getDocStorageKey]);

  const [rcCampusId, setRcCampusId] = useState("")
  const [rcReportType, setRcReportType] = useState("thu_chuc_mung")
  const [rcTargetGroup, setRcTargetGroup] = useState("all")
  const [rcTitle, setRcTitle] = useState("BÁO CÁO KẾT QUẢ KHẢO SÁT NĂNG LỰC ĐẦU VÀO")
  const [rcLogo, setRcLogo] = useState("")
  const [rcSignature, setRcSignature] = useState("")
  const [rcBackground, setRcBackground] = useState("")
  const [rcDirectorName, setRcDirectorName] = useState("")
  const [rcContent, setRcContent] = useState("")
  const [rcFooter, setRcFooter] = useState("")

  // USER MANDATE: Fetch and memoize document checklist for Live Preview stacking
  const previewDocList = useMemo(() => {
    if (typeof window === "undefined") return defaultDocumentsGrade1;
    const activeGroup = (rcTargetGroup && rcTargetGroup !== "all") ? rcTargetGroup : "khoi_1";
    const saved = localStorage.getItem('admission_docs_' + activeGroup);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch(e) {}
    }
    return defaultDocumentsGrade1;
  }, [rcTargetGroup, defaultDocumentsGrade1]);

  useEffect(() => {
    if (campuses && campuses.length > 0 && !rcCampusId) {
      setRcCampusId(campuses[0].id)
    }
  }, [campuses, rcCampusId])

  useEffect(() => {
    if (typeof window !== "undefined" && rcCampusId && rcReportType && rcTargetGroup) {
      const selectedCampus = campuses.find(c => c.id === rcCampusId);
      const defaultManagerName = selectedCampus?.manager?.fullName || "";
      
      const typeKey = rcTargetGroup === "all" ? rcReportType : rcReportType + '_' + rcTargetGroup;
      const savedCampus = localStorage.getItem('report_config_' + rcCampusId + '_' + typeKey);
      const savedGlobal = localStorage.getItem('report_config_global_' + typeKey);
      
      let campusData = {};
      let globalData = {};
      
      if (savedCampus) {
        try { campusData = JSON.parse(savedCampus); } catch (e) {}
      }
      if (savedGlobal) {
        try { globalData = JSON.parse(savedGlobal); } catch (e) {}
      }
      
      // Fallback: If no global data yet, check if there's old campus data we can copy to populate global
      if (Object.keys(globalData).length === 0 && Object.keys(campusData).length > 0) {
        globalData = {
          title: campusData.title,
          logo: campusData.logo,
          background: campusData.background,
          content: campusData.content,
          footer: campusData.footer
        };
      }
      
      // Fallback for old saved campus config without ReportType
      if (Object.keys(campusData).length === 0 && Object.keys(globalData).length === 0) {
        let oldSaved = null;
        if (rcReportType === "thu_chuc_mung") {
          oldSaved = localStorage.getItem('report_config_' + rcCampusId);
        }
        if (oldSaved) {
          try {
            const parsed = JSON.parse(oldSaved);
            campusData = {
              signature: parsed.signature,
              directorName: parsed.directorName
            };
            globalData = {
              title: parsed.title,
              logo: parsed.logo,
              background: parsed.background,
              content: parsed.content,
              footer: parsed.footer
            };
          } catch (e) {}
        }
      }
      
      setRcTitle(globalData.title || (rcReportType === "thu_chuc_mung" ? "BÁO CÁO KẾT QUẢ KHẢO SÁT NĂNG LỰC ĐẦU VÀO" : rcReportType === "thu_moi" ? "THƯ MỜI" : "BẢN CAM KẾT HỌC TẬP"));
      setRcLogo(globalData.logo || "");
      setRcBackground(globalData.background || "");
      setRcContent(globalData.content || getDefaultContent(rcReportType));
      setRcFooter(globalData.footer || "");
      
      setRcSignature(campusData.signature || "");
      setRcDirectorName(campusData.directorName || defaultManagerName);
    }
  }, [rcCampusId, rcReportType, rcTargetGroup, campuses])

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setRcLogo(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSignatureUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setRcSignature(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleBackgroundUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setRcBackground(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFooterUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setRcFooter(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const saveReportConfig = () => {
    if (!rcCampusId) return notify("Vui lòng chọn Cơ sở", "err")
    if (!rcReportType) return notify("Vui lòng chọn Loại báo cáo", "err")
    if (!rcTargetGroup) return notify("Vui lòng chọn Đối tượng áp dụng", "err")
    
    const typeKey = rcTargetGroup === "all" ? rcReportType : rcReportType + '_' + rcTargetGroup;
    
    // Save Global parts (applies to all campuses)
    const globalData = {
      title: rcTitle,
      logo: rcLogo,
      background: rcBackground,
      content: rcContent,
      footer: rcFooter
    }
    localStorage.setItem('report_config_global_' + typeKey, JSON.stringify(globalData))
    
    // Save Campus-specific parts (applies only to current campus)
    const campusData = {
      signature: rcSignature,
      directorName: rcDirectorName,
      // Keep other fields for backward compatibility
      title: rcTitle,
      logo: rcLogo,
      background: rcBackground,
      content: rcContent,
      footer: rcFooter
    }
    localStorage.setItem('report_config_' + rcCampusId + '_' + typeKey, JSON.stringify(campusData))
    
    notify("Đã lưu cấu hình báo cáo thành công!")
  }
  const [yearId, setYearId] = useState(academicYears[0]?.id || "")
  const [toast, setToast] = useState<{msg:string;type:"ok"|"err"}|null>(null)
  const notify = (msg:string, type:"ok"|"err"="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null),3200) }
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
        { 
          "Mã HS KS *": "HS_001", 
          "Họ và Tên *": "Nguyễn Văn A", 
          "Ngày sinh": "20/05/2010",
          "Giới tính": "Nam",
          "Khối": "6",
          "Học kỳ / Năm TS": "HK1",
          "Hệ Khảo sát": "",
          "Hồ sơ / Bảng điểm": "",
          "Đối tượng Tuyển sinh": "",
          "Diện khảo sát": "",
          "Hình thức KS": "",
          "Kết quả Học tập": "",
          "Kết quả Rèn luyện": ""
        }
      ])
    ws["!cols"] = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "DS_HocSinh")
    XLSX.writeFile(wb, "Mau_Import_HS_KhaoSat.xlsx")
  }


  // ───────── COMMON STATES ─────────
  const [periods, setPeriods] = useState<Period[]>([])

  const visiblePeriods = useMemo(() => {
    if (!currentUser || !currentUser.role) return periods; // Safe Fallback: Show all periods if session is not loaded yet or null
    const userRole = (currentUser.role || "").toUpperCase();
    if (userRole === "ADMIN" || userRole === "KT_DBCL") return periods;
    
    if (["GDCS", "GĐ_CS", "GIAO_VU_CS", "GĐCS"].includes(userRole)) {
      const allowedIds = currentUser.campusIds || [];
      return periods.map(p => {
        const allowedBatches = (p.batches || []).filter(b => {
          if (!b.campusId) {
            // Smart Fallback: Check if batch name contains any allowed campus code/name
            const matchesFallback = allowedIds.some(id => {
              const campus = campuses.find(c => c.id === id);
              if (!campus) return false;
              return b.name.includes(campus.campusCode) || b.name.includes(campus.campusName);
            });
            return matchesFallback;
          }
          return allowedIds.includes(b.campusId);
        });
        
        return {
          ...p,
          batches: allowedBatches
        };
      });
    }
    
    return periods;
  }, [periods, currentUser, campuses]);


  const [pLoading, setPLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string|null>(null)
  const [confirm, setConfirm] = useState<{msg:string; fn:()=>void}|null>(null)

  // ───────── PERIODS CRUD ─────────
  const [pModal, setPModal] = useState(false)
  const [editP, setEditP] = useState<Period|null>(null)
  const [pForm, setPForm] = useState({ code:"", name:"", assignedUserId:"", startDate:"", endDate:"", description:"", status:"ACTIVE" })

  // ───────── BATCH CRUD ─────────
  const [bModal, setBModal] = useState(false)
  const [editB, setEditB] = useState<Batch|null>(null)
  const [targetPeriodId, setTargetPeriodId] = useState("")
  const [bForm, setBForm] = useState({ batchNumber:"1", name:"", startDate:"", endDate:"", status:"ACTIVE", campusId: "", assignedUserId: "" })



  // ───────── STUDENTS STATE ─────────
  const [students, setStudents] = useState<Student[]>([])
  const [sLoading, setSLoading] = useState(false)
  const [sPeriodId, setSPeriodId] = useState("")
  const [sBatchId, setSBatchId] = useState("")
  const [sSearch, setSSearch] = useState("")
  const [importing, setImporting] = useState(false)
  const [sModal, setSModal] = useState(false)
  const [editS, setEditS] = useState<Student|null>(null)
  const [sSelected, setSSelected] = useState<string[]>([])

  // ───────── REPORTS STATE ─────────
  const [reportPeriodId, setReportPeriodId] = useState("");
  const [reportBatchId, setReportBatchId] = useState("all");
  const [reportStudentId, setReportStudentId] = useState("");
  const [reportStudents, setReportStudents] = useState<any[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportForm, setReportForm] = useState({
    admissionResult: "",
    admissionCampus: "",
    signatureName: "",
    directorNote: "",
    committedSubjects: [] as string[]
  });

  const [saveReportLoading, setSaveReportLoading] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isInvitation, setIsInvitation] = useState(false);
  const [isCommitment, setIsCommitment] = useState(false);
  const [includeChecklistSheet, setIncludeChecklistSheet] = useState(false);
  const handleSaveReportResult = async () => {
    if (!selectedReportStudent) return;
    setSaveReportLoading(true);
    try {
      const userRole = (currentUser?.role || "").toUpperCase();
      const isGDCSUser = ["GDCS", "GĐ_CS", "GIAO_VU_CS", "GĐCS"].includes(userRole);
      
      let finalCampus = reportForm.admissionCampus;
      let finalSignature = reportForm.signatureName;
      
      if (isGDCSUser && currentUser) {
        finalSignature = currentUser.fullName || reportForm.signatureName || "";
        const userCampus = campuses.find(c => currentUser.campusIds.includes(c.id));
        if (userCampus) {
          finalCampus = userCampus.campusName;
        }
      }

      // Auto-fill from derived campus object if manually empty
      if (!finalCampus && resolvedStudentCampusObj?.campusName) {
        finalCampus = resolvedStudentCampusObj.campusName;
      }
      if (!finalSignature && resolvedStudentCampusObj?.manager?.fullName) {
        finalSignature = resolvedStudentCampusObj.manager.fullName;
      }

      let finalNote = reportForm.directorNote;
      if (reportForm.admissionResult === "Đạt cam kết" && reportForm.committedSubjects.length > 0) {
        finalNote = `Môn cam kết: [${reportForm.committedSubjects.join(", ")}]

${reportForm.directorNote}`;
      }
      const r = await fetch("/api/input-assessment-students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedReportStudent.id,
          data: {
            ...selectedReportStudent,
            admissionResult: reportForm.admissionResult,
            admissionCampus: finalCampus,
            signatureName: finalSignature,
            directorNote: finalNote
          }
        })
      });
      if (r.ok) {
        notify("Đã lưu kết quả tổng hợp thành công!");
        setReportStudents(prev => prev.map(s => s.id === selectedReportStudent.id ? { 
          ...s, 
          admissionResult: reportForm.admissionResult,
          admissionCampus: finalCampus,
          signatureName: finalSignature,
          directorNote: finalNote
        } : s));
      } else {
        notify("Lỗi khi lưu kết quả tổng hợp", "err");
      }
    } catch(e) {
      notify("Lỗi hệ thống", "err");
    }
    setSaveReportLoading(false);
  };

  const fetchReportData = useCallback(async (pId: string) => {
    if (!pId) return;
    setReportLoading(true);
    try {
      const r = await fetch(`/api/teacher-assessments?action=getReport&periodId=${pId}`);
      if (r.ok) {
        const data = await r.json();
        setReportStudents(data);
        if (data.length > 0) {
          setReportStudentId(data[0].id);
        } else {
          setReportStudentId("");
        }
      }
    } catch(e) {}
    setReportLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "reports" && reportPeriodId) {
      fetchReportData(reportPeriodId);
    }
  }, [tab, reportPeriodId, fetchReportData]);

  // Set default reportPeriodId when periods are loaded
  useEffect(() => {
    if (visiblePeriods.length > 0 && !reportPeriodId) {
      setReportPeriodId(visiblePeriods[0].id);
    }
  }, [visiblePeriods, reportPeriodId]);

  const reportSelPeriod = useMemo(() => visiblePeriods.find(p => p.id === reportPeriodId), [periods, reportPeriodId]);
  const reportBatches = useMemo(() => reportSelPeriod?.batches || [], [reportSelPeriod]);

  const filteredReportStudents = useMemo(() => {
    if (!Array.isArray(reportStudents)) return [];
    return reportStudents.filter(s => reportBatchId === "all" || s.batchId === reportBatchId);
  }, [reportStudents, reportBatchId]);

  const selectedReportStudent = useMemo(() => {
    if (!Array.isArray(reportStudents)) return undefined;
    return reportStudents.find(s => s.id === reportStudentId);
  }, [reportStudents, reportStudentId]);
  const resolvedStudentCampusObj = useMemo(() => {
    if (!selectedReportStudent) return null;
    let tc = campuses.find(c => 
      c.campusName && (c.campusName === reportForm.admissionCampus || c.campusName === selectedReportStudent.admissionCampus)
    );
    if (!tc && selectedReportStudent.batchId) {
      const b = reportBatches.find(bx => bx.id === selectedReportStudent.batchId);
      if (b?.campusId) {
        tc = campuses.find(c => c.id === b.campusId);
      }
    }
    return tc || null;
  }, [selectedReportStudent, reportForm.admissionCampus, campuses, reportBatches]);

  const autoCampusDirectorName = useMemo(() => resolvedStudentCampusObj?.manager?.fullName || "", [resolvedStudentCampusObj]);

  const modalDocList = useMemo(() => {
    if (typeof window === "undefined" || !selectedReportStudent) return [];
    
    let studentGroup = "khoi_1";
    const getNumericGrade = (g) => {
      if (!g) return null;
      const match = g.toString().match(/\d+/);
      return match ? parseInt(match[0], 10) : null;
    };
    const sGradeNum = getNumericGrade(selectedReportStudent.grade);
    
    const gradeMatchedGroups = docGroups.filter(g => {
      const mappedGrades = docGroupGrades[g.id] || [];
      const hasGradeMatch = mappedGrades.some(gradeStr => {
        if (!selectedReportStudent.grade) return false;
        const sGrade = selectedReportStudent.grade.toString().toLowerCase();
        const gStr = gradeStr.toLowerCase();
        return sGrade === gStr || sGrade.includes(gStr) || gStr.includes(sGrade);
      });
      if (hasGradeMatch) return true;
      
      if (sGradeNum !== null) {
        if (g.id === "khoi_1" && sGradeNum === 1) return true;
        if (g.id === "khoi_2_5" && sGradeNum >= 2 && sGradeNum <= 5) return true;
        if (g.id === "khoi_6" && sGradeNum === 6) return true;
        if (g.id === "khoi_7_9" && sGradeNum >= 7 && sGradeNum <= 9) return true;
        if (g.id === "khoi_10" && sGradeNum === 10) return true;
        if (g.id === "khoi_11_12" && sGradeNum >= 11 && sGradeNum <= 12) return true;
      }
      return false;
    });

    if (selectedReportStudent.targetType) {
      const targetMatch = gradeMatchedGroups.find(g => {
        const mappedTs = docGroupTargets[g.id] || [];
        return mappedTs.some(ts => ts.toLowerCase() === selectedReportStudent.targetType.toLowerCase());
      });
      
      if (targetMatch) {
        studentGroup = targetMatch.id;
      } else {
        const anyTargetMatch = docGroups.find(g => {
          const mappedTs = docGroupTargets[g.id] || [];
          return mappedTs.some(ts => ts.toLowerCase() === selectedReportStudent.targetType.toLowerCase());
        });
        if (anyTargetMatch) {
          studentGroup = anyTargetMatch.id;
        } else {
          studentGroup = gradeMatchedGroups[0]?.id || "doi_tuong_tuyen_sinh";
        }
      }
    } else {
      studentGroup = gradeMatchedGroups[0]?.id || "khoi_1";
    }
    
    const saved = localStorage.getItem('admission_docs_' + studentGroup);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(d => {
            let matchT = true;
            if (selectedReportStudent.targetType && d.targets && d.targets.length > 0) {
              matchT = d.targets.some(t => t.toLowerCase() === selectedReportStudent.targetType.toLowerCase());
            }
            let matchG = true;
            if (selectedReportStudent.grade && d.grades && d.grades.length > 0) {
              const sG = selectedReportStudent.grade.toString().toLowerCase();
              matchG = d.grades.some(g => { const gr = g.toLowerCase(); return gr === sG || gr.includes(sG) || sG.includes(gr); });
            }
            return matchT && matchG;
          });
        }
        return parsed;
      } catch (e) {}
    }
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    
    // USER MANDATE: Page 2 Checklist must always display for ALL grades as default fallback
    return defaultDocumentsGrade1;
  }, [selectedReportStudent, defaultDocumentsGrade1, docGroups, docGroupTargets, docGroupGrades]);

  const studentCampusConfig = useMemo(() => {
    if (typeof window === "undefined" || !selectedReportStudent) return null;
    
    // Find campus matching active selection in UI form or saved student record
    const effCampus = reportForm.admissionCampus || selectedReportStudent.admissionCampus;
    let targetCampus = campuses.find(c => 
      c.campusName === effCampus ||
      effCampus?.includes(c.campusCode) ||
      effCampus?.includes(c.campusName)
    );
    
    // Fallback: Find campus by student's batch/period
    if (!targetCampus && selectedReportStudent.batchId) {
      const batchObj = reportBatches.find(b => b.id === selectedReportStudent.batchId);
      if (batchObj?.campusId) {
        targetCampus = campuses.find(c => c.id === batchObj.campusId);
      }
    }
    
    if (!targetCampus && campuses.length > 0) {
      targetCampus = campuses[0];
    }
    
    if (targetCampus) {
      let typeKey = isInvitation ? 'thu_moi' : isCommitment ? 'cam_ket_hoc_tap' : 'thu_chuc_mung';
      let candidateKeys = [];
      const baseKey = isInvitation ? 'thu_moi' : isCommitment ? 'cam_ket_hoc_tap' : 'thu_chuc_mung';
      if (selectedReportStudent.targetType) {
        candidateKeys.push(baseKey + '_doi_tuong_tuyen_sinh');
      }
      const getNumericGrade = (g) => {
        if (!g) return null;
        const match = g.toString().match(/\d+/);
        return match ? parseInt(match[0], 10) : null;
      };
      const gradeNum = getNumericGrade(selectedReportStudent.grade);
      if (gradeNum === 1) {
        candidateKeys.push(baseKey + '_khoi_1');
      } else if (gradeNum >= 2 && gradeNum <= 5) {
        candidateKeys.push(baseKey + '_khoi_2_5');
      } else if (gradeNum === 6) {
        candidateKeys.push(baseKey + '_khoi_6');
      } else if (gradeNum >= 7 && gradeNum <= 9) {
        candidateKeys.push(baseKey + '_khoi_7_9');
      } else if (gradeNum === 10) {
        candidateKeys.push(baseKey + '_khoi_10');
      } else if (gradeNum >= 11 && gradeNum <= 12) {
        candidateKeys.push(baseKey + '_khoi_11_12');
      }
      
      const matchingKey = candidateKeys.find(k => {
        return localStorage.getItem('report_config_' + targetCampus.id + '_' + k) || localStorage.getItem('report_config_global_' + k);
      });
      if (matchingKey) {
        typeKey = matchingKey;
      }
      const savedCampus = localStorage.getItem('report_config_' + targetCampus.id + '_' + typeKey);
      const savedGlobal = localStorage.getItem('report_config_global_' + typeKey);
      
      let campusData = {};
      let globalData = {};
      
      if (savedCampus) {
        try { campusData = JSON.parse(savedCampus); } catch (e) {}
      }
      if (savedGlobal) {
        try { globalData = JSON.parse(savedGlobal); } catch (e) {}
      }
      
      // Fallback for old saved campus config
      if (!isCommitment && Object.keys(campusData).length === 0) {
        const oldSaved = localStorage.getItem('report_config_' + targetCampus.id);
        if (oldSaved) {
          try { campusData = JSON.parse(oldSaved); } catch (e) {}
        }
      }
      
      // If global is not yet saved, use campus data as fallback for global fields
      const mergedTitle = globalData.title || campusData.title || (typeKey === "thu_chuc_mung" ? "BÁO CÁO KẾT QUẢ KHẢO SÁT NĂNG LỰC ĐẦU VÀO" : typeKey === "thu_moi" ? "THƯ MỜI" : "BẢN CAM KẾT HỌC TẬP");
      const mergedLogo = globalData.logo || campusData.logo || "";
      const mergedBackground = globalData.background || campusData.background || "";
      const mergedContent = globalData.content || campusData.content || "";
      const mergedFooter = globalData.footer || campusData.footer || "";
      
      return {
        title: mergedTitle,
        logo: mergedLogo,
        background: mergedBackground,
        content: mergedContent,
        footer: mergedFooter,
        signature: campusData.signature || "",
        directorName: campusData.directorName || targetCampus.manager?.fullName || ""
      };
    }
    return null;
  }, [selectedReportStudent, campuses, reportBatches, isCommitment, reportForm.admissionCampus]);

  const campusNameSuffix = useMemo(() => {
    if (!selectedReportStudent) return "GLOBAL";
    
    const effCampus = reportForm.admissionCampus || selectedReportStudent.admissionCampus;
    let campus = campuses.find(c => 
      c.campusName === effCampus ||
      effCampus?.includes(c.campusCode) ||
      effCampus?.includes(c.campusName)
    );
    
    if (!campus && selectedReportStudent.batchId) {
      const batchObj = reportBatches.find(b => b.id === selectedReportStudent.batchId);
      if (batchObj?.campusId) {
        campus = campuses.find(c => c.id === batchObj.campusId);
      }
    }
    
    if (campus) {
      return campus.campusCode ? campus.campusCode.toUpperCase() : campus.campusName.toUpperCase();
    }
    return "GLOBAL";
  }, [selectedReportStudent, campuses, reportBatches, reportForm.admissionCampus]);

  const campusTitleSuffix = useMemo(() => {
    const code = campusNameSuffix ? campusNameSuffix.toUpperCase() : "GLOBAL";
    if (code.includes("CS1") || code.includes("RIVERSIDE")) return "RIVERSIDE";
    if (code.includes("CS2") || code.includes("CENTRAL")) return "CENTRAL";
    if (code.includes("CS3") || code.includes("GLOBAL")) return "GLOBAL";
    if (code.includes("CS4") || code.includes("HILL")) return "HILL";
    if (code.includes("CS5") || code.includes("BEACH")) return "BEACH";
    return code;
  }, [campusNameSuffix]);

  const previewSchoolName = useMemo(() => {
    const campus = campuses.find(c => c.id === rcCampusId);
    const code = campus ? (campus.campusCode || "").toUpperCase() : "";
    if (code.includes("CS4") || code.includes("HILL")) {
      return "TRƯỜNG TH, THCS, THPT SKY-LINE HILL";
    }
    return "TRƯỜNG TH, THCS, THPT SKY-LINE";
  }, [rcCampusId, campuses]);

  const previewTitleSuffix = useMemo(() => {
    const campus = campuses.find(c => c.id === rcCampusId);
    const code = campus ? (campus.campusCode || "").toUpperCase() : "";
    if (code.includes("CS1") || code.includes("RIVERSIDE")) return "RIVERSIDE";
    if (code.includes("CS2") || code.includes("CENTRAL")) return "CENTRAL";
    if (code.includes("CS3") || code.includes("GLOBAL")) return "GLOBAL";
    if (code.includes("CS4") || code.includes("HILL")) return "HILL";
    if (code.includes("CS5") || code.includes("BEACH")) return "BEACH";
    return code || "CƠ SỞ";
  }, [rcCampusId, campuses]);

  const studentSchoolName = useMemo(() => {
    const code = campusNameSuffix ? campusNameSuffix.toUpperCase() : "";
    if (code.includes("CS4") || code.includes("HILL")) {
      return "TRƯỜNG TH, THCS, THPT SKY-LINE HILL";
    }
    return "TRƯỜNG TH, THCS, THPT SKY-LINE";
  }, [campusNameSuffix]);

  const formattedLetterDate = useMemo(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `Đà Nẵng, ngày ${day} tháng ${month} năm ${year}`;
  }, []);

  const campusStats = useMemo(() => {
    if (!Array.isArray(reportStudents)) return [];
    
    const map = new Map<string, {
      campusName: string;
      total: number;
      passed: number;
      failed: number;
      committed: number;
      pending: number;
    }>();
    
    campuses.forEach(c => {
      map.set(c.id, {
        campusName: c.campusName,
        total: 0,
        passed: 0,
        failed: 0,
        committed: 0,
        pending: 0
      });
    });
    
    const fallbackId = "unassigned";
    map.set(fallbackId, {
      campusName: "Khác / Chưa phân",
      total: 0,
      passed: 0,
      failed: 0,
      committed: 0,
      pending: 0
    });

    const targetStudents = filteredReportStudents;
    
    targetStudents.forEach(s => {
      const batchObj = reportBatches.find(b => b.id === s.batchId);
      const campusId = batchObj?.campusId || fallbackId;
      
      let stat = map.get(campusId);
      if (!stat) {
        stat = {
          campusName: campuses.find(c => c.id === campusId)?.campusName || "Khác / Chưa phân",
          total: 0,
          passed: 0,
          failed: 0,
          committed: 0,
          pending: 0
        };
        map.set(campusId, stat);
      }
      
      stat.total++;
      if (s.admissionResult === "Đạt") {
        stat.passed++;
      } else if (s.admissionResult === "Không đạt") {
        stat.failed++;
      } else if (s.admissionResult === "Đạt cam kết") {
        stat.committed++;
      } else {
        stat.pending++;
      }
    });
    
    return Array.from(map.entries())
      .map(([id, val]) => ({ id, ...val }))
      .filter(item => item.id !== fallbackId || item.total > 0);
  }, [filteredReportStudents, reportBatches, campuses]);

  const overallKPIs = useMemo(() => {
    const total = filteredReportStudents.length;
    let passed = 0;
    let failed = 0;
    let committed = 0;
    let pending = 0;
    
    filteredReportStudents.forEach(s => {
      if (s.admissionResult === "Đạt") passed++;
      else if (s.admissionResult === "Không đạt") failed++;
      else if (s.admissionResult === "Đạt cam kết") committed++;
      else pending++;
    });
    
    const approvedRate = total > 0 ? Math.round(((total - pending) / total) * 100) : 0;
    
    return { total, passed, failed, committed, pending, approvedRate };
  }, [filteredReportStudents]);

  const canApprove = useMemo(() => {
    if (!currentUser) return false;
    const userRole = (currentUser.role || "").toUpperCase();
    if (userRole === "ADMIN" || userRole === "KT_DBCL") return true;
    if (["GDCS", "GĐ_CS", "GIAO_VU_CS", "GĐCS"].includes(userRole)) {
      const periodCampusId = reportSelPeriod?.campusId;
      const activeBatch = reportBatches.find(b => b.id === reportBatchId);
      const batchCampusId = activeBatch?.campusId;
      let targetCampusId = batchCampusId || periodCampusId;
      
      // Smart Fallback: Parse campus from batch name or period name if campusId is null/missing
      if (!targetCampusId) {
        const fullNameStr = `${activeBatch?.name || ""} ${reportSelPeriod?.name || ""}`;
        const matchedCampus = campuses.find(c => 
          fullNameStr.includes(c.campusCode) || 
          fullNameStr.includes(c.campusName) ||
          (c.campusCode === "CS3" && fullNameStr.includes("CS3")) ||
          (c.campusCode === "CS1" && fullNameStr.includes("CS1")) ||
          (c.campusCode === "CS2" && fullNameStr.includes("CS2"))
        );
        if (matchedCampus) {
          targetCampusId = matchedCampus.id;
        }
      }
      
      if (!targetCampusId) return true; // Default to allow if no campus can be identified
      return currentUser.campusIds.length === 0 || currentUser.campusIds.includes(targetCampusId);
    }
    return false;
  }, [currentUser, reportSelPeriod, reportBatches, reportBatchId, campuses]);

  useEffect(() => {
    if (selectedReportStudent) {
      let commSubs: string[] = [];
      let cleanNote = selectedReportStudent.directorNote || "";
      const match = cleanNote.match(/^Môn cam kết: \[(.*?)\](?:\r?\n\r?\n)?/);
      if (match) {
        commSubs = match[1] ? match[1].split(", ") : [];
        cleanNote = cleanNote.replace(/^Môn cam kết: \[(.*?)\](?:\r?\n\r?\n)?/, "");
      }
      setReportForm({
        admissionResult: selectedReportStudent.admissionResult || "",
        admissionCampus: selectedReportStudent.admissionCampus || "",
        signatureName: selectedReportStudent.signatureName || "",
        directorNote: cleanNote,
        committedSubjects: commSubs
      });
    }
  }, [selectedReportStudent]);

  useEffect(() => {
    if (filteredReportStudents.length > 0) {
      if (!filteredReportStudents.some(s => s.id === reportStudentId)) {
        setReportStudentId(filteredReportStudents[0].id);
      }
    } else {
      setReportStudentId("");
    }
  }, [filteredReportStudents, reportStudentId]);
  const [sForm, setSForm] = useState({ studentCode:"", fullName:"", dateOfBirth:"", gender:"", grade:"", admissionCriteria:"", className:"", hocKy:"", kqgdTieuHoc:"", kqHocTap:"", kqRenLuyen:"", targetType:"", surveySystem:"", hoSoCtQuocTe:"", surveyFormType:"", batchId:"" })
  const fileRef = useRef<HTMLInputElement>(null)


  // ───────── SUBJECTS & MAPPING STATE ─────────
  const [subjectsList, setSubjectsList] = useState<any[]>(initialSubjects||[]);
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);
  const [columnConfigForm, setColumnConfigForm] = useState({ subjectId: "", name: "", scoreNames: [], commentNames: [], showScoreInReport: [], showCommentInReport: [], scoreColumns: 1, commentColumns: 1 });
  const [editingSubjectId, setEditingSubjectId] = useState<string|null>(null);
  const [subjectForm, setSubjectForm] = useState({ code:"", name:"", subjectType:"", scoreColumns: 1, commentColumns: 1, status: "ACTIVE", exemptCriteria: [] as string[] });
  const [selGrades, setSelGrades] = useState<string[]>((Array.isArray(grades) && grades[0]) ? [grades[0]] : []);
  const [selEdus, setSelEdus] = useState<string[]>((Array.isArray(eduSystems) && eduSystems[0]?.code) ? [eduSystems[0].code] : []);
  const [mappings, setMappings] = useState<any[]>([]);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [assignSelSubjects, setAssignSelSubjects] = useState<string[]>([]);
  const [editingMappingSubjectId, setEditingMappingSubjectId] = useState<string|null>(null);
  const [allMappings, setAllMappings] = useState<any[]>([]);
  const [allMappingsLoading, setAllMappingsLoading] = useState(false);
  const fetchAllMappings = async () => {
    setAllMappingsLoading(true);
    try {
      const r = await fetch("/api/grade-subject-mappings?_t=" + Date.now(), { cache: "no-store" });
      if (r.ok) setAllMappings(await r.json());
    } catch (e) {}
    setAllMappingsLoading(false);
  };
  useEffect(() => { if (tab === "mapping") fetchAllMappings(); }, [tab]);

  // ───────── ASSIGNMENT STATE ─────────
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [asLoading, setAsLoading] = useState(false)
  const [asPeriodId, setAsPeriodId] = useState("")
  const [asBatchId, setAsBatchId] = useState("")
  const [asDeptId, setAsDeptId] = useState("")
  const [asTeacherId, setAsTeacherId] = useState("")
  const [asSelSubjects, setAsSelSubjects] = useState<string[]>([])
  const [asSelGrades, setAsSelGrades] = useState<string[]>([])
  const [asSelSystems, setAsSelSystems] = useState<string[]>([])
  const [asSubmitting, setAsSubmitting] = useState(false)

  useEffect(() => {
    if (visiblePeriods.length > 0) {
      if (!sPeriodId || !visiblePeriods.some(p => p.id === sPeriodId)) {
        setSPeriodId(visiblePeriods[0].id);
      }
      if (!asPeriodId || !visiblePeriods.some(p => p.id === asPeriodId)) {
        setAsPeriodId(visiblePeriods[0].id);
      }
    } else {
      setSPeriodId("");
      setAsPeriodId("");
    }
  }, [visiblePeriods, sPeriodId, asPeriodId]);

  // ───────── FETCHERS ─────────
  const fetchPeriods = useCallback(async () => {
    if (!yearId) return
    setPLoading(true)
    try {
      const r = await fetch(`/api/input-assessments?academicYearId=${yearId}&t=${Date.now()}`)
      if (r.ok) { 
        const d = await r.json()
        setPeriods(d)
        if (d.length) {
          if (!sPeriodId) setSPeriodId(d[0].id)
          if (!asPeriodId) setAsPeriodId(d[0].id)
        }
      }
    } finally { setPLoading(false) }
  }, [yearId, sPeriodId, asPeriodId])


  const fetchSubjects=async()=>{const r=await fetch("/api/input-assessment-categories?type=subject");if(r.ok)setSubjectsList(await r.json())};
  useEffect(() => {
    fetchSubjects();
  }, []);
  const fetchMappings=async()=>{setMappingLoading(true);try{const r=await fetch(`/api/grade-subject-mappings?grades=${selGrades.join(",")}&eduSystems=${selEdus.join(",")}`);if(r.ok)setMappings(await r.json())}catch(e){}setMappingLoading(false)};

  useEffect(()=>{if(selGrades.length&&selEdus.length)fetchMappings();else setMappings([])},[selGrades,selEdus]);

  const handleColumnConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = {
      type: "subject",
      id: columnConfigForm.subjectId,
      data: {
        columnNames: JSON.stringify({
          scores: columnConfigForm.scoreNames,
          comments: columnConfigForm.commentNames,
          showScoreInReport: columnConfigForm.showScoreInReport,
          showCommentInReport: columnConfigForm.showCommentInReport
        })
      }
    };
    const r = await fetch("/api/input-assessment-categories", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    if (r.ok) {
      setIsColumnConfigOpen(false);
      fetchSubjects();
    } else notify((await r.json()).error, "err");
  };     
  
  const handleSubjectSubmit=async(e:React.FormEvent)=>{e.preventDefault();const p=editingSubjectId?{type:"subject",id:editingSubjectId,data:{name:subjectForm.name,subjectType:subjectForm.subjectType||null, scoreColumns: subjectForm.scoreColumns, commentColumns: subjectForm.commentColumns, status: subjectForm.status, exemptCriteria: JSON.stringify(subjectForm.exemptCriteria)}}:{type:"subject",data:{code:subjectForm.code,name:subjectForm.name,subjectType:subjectForm.subjectType||null, scoreColumns: subjectForm.scoreColumns, commentColumns: subjectForm.commentColumns, status: subjectForm.status||"ACTIVE", exemptCriteria: JSON.stringify(subjectForm.exemptCriteria)}};const r=await fetch("/api/input-assessment-categories",{method:editingSubjectId?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)});if(r.ok){setIsSubjectOpen(false);fetchSubjects()}else notify((await r.json()).error, "err")};
  
  const deleteSubject=async(id:string)=>{if(!confirm("Xóa?"))return;await fetch("/api/input-assessment-categories?type=subject&id="+id,{method:"DELETE"});fetchSubjects()};
  
  const addMapping=async(sid:string)=>{const r=await fetch("/api/grade-subject-mappings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({grades:selGrades,eduSystems:selEdus,subjectId:sid})});if(r.ok)fetchMappings();else notify((await r.json()).error, "err")};
  
  const removeMapping=async(sid:string)=>{await fetch("/api/grade-subject-mappings?subjectId="+sid+"&grades="+selGrades.join(",")+"&eduSystems="+selEdus.join(","),{method:"DELETE"});fetchMappings()};
  
  const assignedIds=[...new Set(mappings.map(m=>m.subjectId))];
  const uniqueAssigned=assignedIds.map(sid=>mappings.find(x=>x.subjectId===sid)).filter(Boolean);
  const availableSubjects=subjectsList.filter(s=>!assignedIds.includes(s.id));
  const toggleGrade=(g:string)=>setSelGrades(p=>p.includes(g)?p.filter(x=>x!==g):[...p,g]);
  const toggleEdu=(c:string)=>setSelEdus(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c]);

  const fetchStudents = useCallback(async () => {
    if (!sPeriodId) return
    setSLoading(true)
    try {
      let url = `/api/input-assessment-students?periodId=${sPeriodId}`
      if (sBatchId) url += `&batchId=${sBatchId}`
      const r = await fetch(url)
      if (r.ok) setStudents(await r.json())
    } finally { setSLoading(false) }
  }, [sPeriodId, sBatchId])

  const fetchConfigs = useCallback(async () => {
    setCLoading(true)
    try { const r = await fetch("/api/assessment-configs"); if (r.ok) setConfigs(await r.json()) }
    finally { setCLoading(false) }
  }, [])

  const fetchAssignments = useCallback(async () => {
    if (!asPeriodId) return
    setAsLoading(true)
    try {
      const r = await fetch(`/api/input-assessment-assignments?periodId=${asPeriodId}`)
      if (r.ok) setAssignments(await r.json())
    } finally { setAsLoading(false) }
  }, [asPeriodId])

  useEffect(() => { fetchPeriods() }, [fetchPeriods])
  useEffect(() => { if (tab === "students") fetchStudents() }, [tab, fetchStudents])
  useEffect(() => { if (tab === "categories") fetchConfigs() }, [tab, fetchConfigs])
  useEffect(() => { if (tab === "assignments") fetchAssignments() }, [tab, fetchAssignments])

  // ───────── ACTIONS ─────────
  const openAddPeriod = () => { setEditP(null); setPForm({ code:"", name:"", assignedUserId:"", startDate:"", endDate:"", description:"", status:"ACTIVE" }); setPModal(true) }
  const openEditPeriod = (p:Period) => { setEditP(p); setPForm({ code:p.code, name:p.name, assignedUserId:p.assignedUserId||"", startDate:p.startDate?.slice(0,10)||"", endDate:p.endDate?.slice(0,10)||"", description:p.description||"", status:p.status }); setPModal(true) }
  const savePeriod = async () => {
    if (!pForm.code.trim()||!pForm.name.trim()) return notify("Cần nhập Mã và Tên","err")
    const r = await fetch("/api/input-assessments", { method: editP?"PUT":"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action: editP?"UPDATE_PERIOD":"CREATE_PERIOD", id:editP?.id, data:{...pForm, academicYearId:yearId} }) })
    if (r.ok) { setPModal(false); fetchPeriods(); notify(editP?"Đã cập nhật kỳ khảo sát":"Đã tạo kỳ khảo sát mới") }
    else notify("Lỗi","err")
  }
  const doDeletePeriod = async (id:string) => { const r = await fetch(`/api/input-assessments?type=period&id=${id}`,{method:"DELETE"}); if (r.ok) { fetchPeriods(); notify("Đã xóa kỳ khảo sát") } }

  const openAddBatch = (pid:string) => { 
    setTargetPeriodId(pid); 
    setEditB(null); 
    const period = visiblePeriods.find(p => p.id === pid);
    let nextBatchNum = 1;
    if (period && period.batches && period.batches.length > 0) {
        nextBatchNum = Math.max(...period.batches.map(b => b.batchNumber)) + 1;
    }
    setBForm({ batchNumber: String(nextBatchNum), name:"", startDate:"", endDate:"", status:"ACTIVE", campusId: "", assignedUserId: "" }); 
    setBModal(true); 
  }
  const openEditBatch = (b:Batch) => { 
    setTargetPeriodId(b.periodId); 
    setEditB(b); 
    let baseName = b.name;
    const match = b.name.match(/Đợt \d+ - (.*?) \|/);
    if (match) {
      baseName = match[1];
    } else {
      const match2 = b.name.match(/Đợt \d+ - (.*)/);
      if (match2) baseName = match2[1];
    }
    setBForm({ batchNumber:String(b.batchNumber), name:baseName, startDate:b.startDate?.slice(0,10)||"", endDate:b.endDate?.slice(0,10)||"", status:b.status, campusId: b.campusId||"", assignedUserId: b.assignedUserId||"" }); 
    setBModal(true) 
  }
  const saveBatch = async () => {
    if (!bForm.name.trim()||!bForm.startDate||!bForm.endDate) return notify("Cần nhập đủ Tên, Ngày bắt/kết thúc","err")
    
    const selectedCampus = campuses.find(c => c.id === bForm.campusId);
    const campusName = selectedCampus ? selectedCampus.campusName : "Tất cả";
    const startStr = bForm.startDate ? bForm.startDate.split('-').reverse().join('/') : "";
    const endStr = bForm.endDate ? bForm.endDate.split('-').reverse().join('/') : "";
    
    const fullScientificName = `Đợt ${bForm.batchNumber || "1"} - ${bForm.name} | ${campusName} (${startStr} ~ ${endStr})`;
    
    const r = await fetch("/api/input-assessments", { 
      method: editB?"PUT":"POST", 
      headers:{"Content-Type":"application/json"}, 
      body: JSON.stringify({ 
        action: editB?"UPDATE_BATCH":"CREATE_BATCH", 
        id:editB?.id, 
        data:{...bForm, name: fullScientificName, periodId:targetPeriodId, batchNumber:parseInt(bForm.batchNumber)||1} 
      }) 
    })
    if (r.ok) { setBModal(false); fetchPeriods(); notify(editB?"Đã cập nhật đợt":"Đã tạo đợt mới") }
    else notify("Lỗi","err")
  }
  const doDeleteBatch = async (id:string) => { const r = await fetch(`/api/input-assessments?type=batch&id=${id}`,{method:"DELETE"}); if (r.ok) { fetchPeriods(); notify("Đã xóa đợt") } }

    const openAddStudent = async () => {
    setEditS(null);
    const initialBatchId = sBatchId || (selPeriod?.batches?.[0]?.id || "");
    
    let genCode = "HS001";
    try {
      const r = await fetch("/api/input-assessment-students?get_max_code=true");
      if (r.ok) {
        const res = await r.json();
        if (res.nextCode) genCode = res.nextCode;
      }
    } catch (e) {
      let nextNum = 1;
      if (students && students.length > 0) {
        const nums = students.map((s) => {
          const match = String(s.studentCode || "").match(/\d+$/);
          return match ? parseInt(match[0], 10) : 0;
        }).filter(n => !isNaN(n) && n > 0);
        if (nums.length > 0) {
          nextNum = Math.max(...nums) + 1;
        }
      }
      genCode = "HS" + nextNum.toString().padStart(3, "0");
    }

    setSForm({ studentCode: genCode, fullName: "", dateOfBirth: "", grade: "", admissionCriteria: "", className: "", hocKy: "", kqgdTieuHoc: "", kqHocTap: "", kqRenLuyen: "", targetType: "", surveySystem: "", hoSoCtQuocTe: "", surveyFormType: "", gender: "", batchId: initialBatchId });
    setSModal(true);
  }
  const openEditStudent = (s:Student) => { setEditS(s); setSForm({ studentCode:s.studentCode, fullName:s.fullName, dateOfBirth:s.dateOfBirth?.slice(0,10)||"", grade:s.grade||"", admissionCriteria:s.admissionCriteria||"", className:s.className||"", hocKy:s.hocKy||"", kqgdTieuHoc:s.kqgdTieuHoc||"", kqHocTap:s.kqHocTap||"", kqRenLuyen:s.kqRenLuyen||"", targetType:s.targetType||"", surveySystem:s.surveySystem||"", hoSoCtQuocTe:s.hoSoCtQuocTe||"", surveyFormType:s.surveyFormType||"" , gender:s.gender||"", batchId:s.batchId||"" }); setSModal(true) }
  const saveStudent = async () => {
    if (!sForm.studentCode.trim()||!sForm.fullName.trim()) return notify("Cần nhập Mã HS và Họ tên","err")
    const r = editS
      ? await fetch("/api/input-assessment-students", { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id:editS.id, data:sForm }) })
      : await fetch("/api/input-assessment-students", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"CREATE", data:{...sForm, periodId:sPeriodId, batchId:sForm.batchId || sBatchId || null} }) })
    if (r.ok) { setSModal(false); fetchStudents(); notify(editS?"Đã cập nhật học sinh":"Đã thêm học sinh") }
    else notify("Lỗi","err")
  }
  const doDeleteStudent = async (id:string) => { const r = await fetch(`/api/input-assessment-students?id=${id}`,{method:"DELETE"}); if (r.ok) { fetchStudents(); notify("Đã xóa") } }
  const doDeleteSelected = async () => {
    const r = await fetch(`/api/input-assessment-students?ids=${sSelected.join(",")}`,{method:"DELETE"})
    if (r.ok) { setSSelected([]); fetchStudents(); notify(`Đã xóa ${sSelected.length} học sinh`) }
  }
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file||!sPeriodId) return
    setImporting(true)
    try {
      const d = await file.arrayBuffer()
      const wb = XLSX.read(d)
            let ws = null;
      let rows: any[] = [];
      let headerRowIndex = -1;

      for (const sheetName of wb.SheetNames) {
        const currentWs = wb.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(currentWs, { header: 1 }) as any[][];
        if (!rawData || rawData.length === 0) continue;

        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i];
          if (row.some(cell => {
            const c = String(cell).toLowerCase();
            return c.includes("mã") || c.includes("học sinh") || c.includes("tên") || c.includes("hs") || c.includes("student");
          })) {
            headerRowIndex = i;
            ws = currentWs;
            break;
          }
        }
        if (ws) break;
      }

      if (!ws || headerRowIndex === -1) {
        notify("Không tìm thấy dữ liệu học sinh trong file","err");
        setImporting(false);
        return;
      }

      rows = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex, defval: "" }) as any[];


      const mapped = rows.map((row:any) => {
        const findVal = (row: any, keywords: string[]) => {
          const keys = Object.keys(row);
          for (const key of keys) {
            const k = key.toLowerCase().trim();
            if (keywords.some(kw => k.includes(kw.toLowerCase()))) return row[key];
          }
          return null;
        };

        let parsedDate = null;
        const gender = row["Giới tính"] || row["Gioi tinh"] || row["gender"];
          const rawDate = row["Ngay sinh"] || row["Ngày sinh"] || row["dateOfBirth"];
        if (rawDate) {
          if (typeof rawDate === "number") {
            const date = new Date(Math.round((rawDate - 25569)*86400*1000));
            parsedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000).toISOString();
          } else if (typeof rawDate === "string") {
            const parts = rawDate.split(/[\/\-]/);
            if (parts.length === 3 && parts[0].length <= 2) {
               parsedDate = parts[2] + "-" + parts[1].padStart(2,"0") + "-" + parts[0].padStart(2,"0") + "T00:00:00.000Z";
            } else { 
               const d = new Date(rawDate);
               if (!isNaN(d.getTime())) parsedDate = d.toISOString();
            }
          }
        }
        const studentCode = String(findVal(row, ["mã hs ks", "ma_hs_ks", "mahs", "studentcode"]) || "").trim();
        const fullName = String(findVal(row, ["họ và tên", "họ tên", "ho ten", "fullname", "full name"]) || "").trim();
        
        const grade = String(findVal(row, ["khối", "khoi", "grade"]) || "").trim();
        const className = String(findVal(row, ["lớp", "lop", "class"]) || "").trim();
        const hocKy = String(findVal(row, ["học kỳ", "hoc ky", "semester"]) || "").trim();
        const admissionCriteria = String(findVal(row, ["diện khảo sát", "dien khao sat", "criteria"]) || "").trim();
        const surveySystem = String(findVal(row, ["hình thức ks", "hinh thuc ks", "survey system"]) || "").trim();
        const targetType = String(findVal(row, ["đối tượng", "doi tuong", "loại tuyển sinh", "loai tuyen sinh", "target type"]) || "").trim();
        const surveyFormType = String(findVal(row, ["hệ khảo sát", "he khao sat", "h? kh?o st"]) || "").trim();
          const hoSoCtQuocTe = String(findVal(row, ["hồ sơ / bảng điểm", "hồ sơ", "ho so"]) || "").trim();
          const kqHocTap = String(findVal(row, ["kết quả học tập", "kq hoc tap", "k?t qu? h?c t?p"]) || "").trim();
          const kqRenLuyen = String(findVal(row, ["kết quả rèn luyện", "kq ren luyen", "k?t qu? r?n luy?n"]) || "").trim();

return {
          studentCode,
          fullName,
          dateOfBirth: parsedDate,
              gender: gender ? String(gender).trim() : null,
          grade,
          hocKy,
          admissionCriteria,
          surveySystem,
          targetType,
            surveyFormType,
            hoSoCtQuocTe,
            kqHocTap,
            kqRenLuyen,
            periodId: sPeriodId,
          batchId: sBatchId || null
        };

      }).filter((r:any) => r.studentCode && r.fullName)
      const res = await fetch("/api/input-assessment-students", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({action:"BULK_CREATE", data:mapped}) })
      if (res.ok) { 
        const dr = await res.json();
        if (dr.errors && dr.errors.length > 0) {
          notify(`Import xong nhưng có ${dr.errors.length} lỗi. Kiểm tra console.`, "err");
          console.error("Import Errors:", dr.errors);
        } else {
          notify("Import thành công " + (dr.created || "") + " học sinh"); 
        }
        fetchStudents() 
      } else {
        const errData = await res.json().catch(()=>({}));
        notify("Lỗi server: " + (errData.error || res.statusText), "err");
      }
    } finally { setImporting(false); if (fileRef.current) fileRef.current.value="" }
  }

  const openAddConfig = (type:string) => { setEditC(null); setCForm({ categoryType:type, code:"", name:"" }); setCModal(true) }
  const openEditConfig = (c:AssessmentConfig) => { setEditC(c); setCForm({ categoryType:c.categoryType, code:c.code, name:c.name }); setCModal(true) }
  const saveConfig = async () => {
    if (!cForm.code.trim()||!cForm.name.trim()) return notify("Cần nhập Mã và Tên","err")
    const r = editC
      ? await fetch("/api/assessment-configs", { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id:editC.id, name:cForm.name, code:cForm.code }) })
      : await fetch("/api/assessment-configs", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(cForm) })
    if (r.ok) { setCModal(false); fetchConfigs(); notify("Xong") }
  }
  const doDeleteConfig = async (id:string) => { const r = await fetch(`/api/assessment-configs?id=${id}`,{method:"DELETE"}); if (r.ok) { fetchConfigs(); notify("Xóa xong") } }

  // ───────── ASSIGNMENT ACTIONS ─────────
  const filteredTeachers = useMemo(() => {
    if (!asDeptId) return teachers
    return teachers.filter(t => t.departmentId === asDeptId)
  }, [teachers, asDeptId])

  const submitAssignment = async () => {
    if (!asPeriodId || !asTeacherId || !asSelSubjects.length || !asSelGrades.length || !asSelSystems.length) {
      return notify("Vui lòng chọn đầy đủ Kỳ, GV, Môn, Khối và Hệ học", "err")
    }
    setAsSubmitting(true)
    try {
      const payloads: any[] = []
      asSelSubjects.forEach(subjectId => {
        asSelGrades.forEach(grade => {
          asSelSystems.forEach(systemCode => {
            payloads.push({
              teacherId: asTeacherId,
              subjectId,
              grade,
              educationSystem: systemCode
            })
          })
        })
      })
      const res = await fetch("/api/input-assessment-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BULK_ASSIGN",
          periodId: asPeriodId,
          batchId: asBatchId || null,
          assignments: payloads
        })
      })
      if (res.ok) {
        const j = await res.json();
        if (j.emailError) { notify(`Phân công thành công NHƯNG gửi mail thất bại: ${j.emailError}`, "err") } else { notify("Đã hoàn tất phân công và gửi email") }
        fetchAssignments()
        // Reset parts but keep period/dept
        setAsSelSubjects([]); setAsSelGrades([]); setAsSelSystems([])
      } else {
        const j = await res.json()
        notify(j.error || "Lỗi phân công", "err")
      }
    } finally { setAsSubmitting(false) }
  }

  
  const groupedAssignments = useMemo(() => {
    const groups: Record<string, any> = {};
    assignments.forEach(a => {
        const key = `${a.userId}_${a.batchId}`;
        if (!groups[key]) {
            groups[key] = {
                ...a,
                ids: [a.id],
                subjects: a.subject ? [a.subject.name] : [],
                subjectIds: a.subjectId ? [a.subjectId] : [],
                grades: [a.grade],
                educationSystems: [a.educationSystem]
            };
        } else {
            groups[key].ids.push(a.id);
            if (a.subject && !groups[key].subjects.includes(a.subject.name)) {
                groups[key].subjects.push(a.subject.name);
            }
            if (a.subjectId && !groups[key].subjectIds.includes(a.subjectId)) {
                groups[key].subjectIds.push(a.subjectId);
            }
            if (!groups[key].grades.includes(a.grade)) {
                groups[key].grades.push(a.grade);
            }
            if (!groups[key].educationSystems.includes(a.educationSystem)) {
                groups[key].educationSystems.push(a.educationSystem);
            }
        }
    });
    return Object.values(groups);
  }, [assignments]);

  const openEditAssignment = (a: any) => {
    if (a.periodId) setAsPeriodId(a.periodId);
    if (a.batchId) setAsBatchId(a.batchId); else setAsBatchId("");
    if (a.user?.departmentId) setAsDeptId(a.user?.departmentId); else setAsDeptId("");
    setAsTeacherId(a.userId);
    setAsSelSubjects(a.subjectIds || []);
    setAsSelGrades(a.grades || []);
    setAsSelSystems(a.educationSystems);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const deleteAssignment = async (ids: string[]) => {
    const res = await fetch(`/api/input-assessment-assignments?ids=${ids.join(",")}`, { method: "DELETE" })
    if (res.ok) {
      notify("Đã xóa phân công")
      fetchAssignments()
    }
  }

  // ====================== UI HELPERS ======================
  const selPeriod = visiblePeriods.find(p => p.id === sPeriodId)
  const asSelPeriod = visiblePeriods.find(p => p.id === asPeriodId)
  const filtStu = students.filter(s => !sSearch || s.studentCode.toLowerCase().includes(sSearch.toLowerCase()) || s.fullName.toLowerCase().includes(sSearch.toLowerCase()))

    // Merged Student object to ensure printed outputs reflect LIVE unsaved form updates
  const mergedStudent = useMemo(() => {
    if (!selectedReportStudent) return null;
    return {
      ...selectedReportStudent,
      admissionResult: reportForm.admissionResult || selectedReportStudent.admissionResult,
      admissionCampus: reportForm.admissionCampus || selectedReportStudent.admissionCampus,
      signatureName: reportForm.signatureName || selectedReportStudent.signatureName,
      directorNote: reportForm.directorNote || selectedReportStudent.directorNote,
      committedSubjects: reportForm.committedSubjects
    };
  }, [selectedReportStudent, reportForm]);

  // ====================== RENDER ======================
  return (
    <div className="space-y-4 font-sans max-w-[1600px] mx-auto pb-20">
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      {confirm && <ConfirmDialog open={true} onClose={()=>setConfirm(null)} onConfirm={confirm.fn} message={confirm.msg}/>}

      <div className="no-print flex flex-col gap-4 w-full">
      {/* HEADER BAR */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 rounded-2xl flex items-center justify-center shadow-indigo-100 shadow-xl border border-white/20">
            <ClipboardCheck className="w-6 h-6 text-white"/>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Quản lý KSNL Đầu vào</h1>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em]">Hệ thống khảo sát & phân công giáo viên</p>
          </div>
        </div>
        <div className="flex items-center gap-2 pr-1.5 py-1.5 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
          <Calendar className="w-4 h-4 text-slate-400 ml-3"/>
          <select value={yearId} onChange={e=>{setYearId(e.target.value); setSPeriodId(""); setAsPeriodId(""); setStudents([]); setAssignments([])}} className="bg-transparent text-sm font-black text-slate-700 outline-none pr-4 py-1.5 cursor-pointer">
            {academicYears.map(ay=><option key={ay.id} value={ay.id}>Năm học {ay.name}</option>)}
          </select>
        </div>
      </div>

      {/* TAB NAV */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-1.5 flex flex-wrap gap-1">
        {[
          { id:"periods",    label:"Kỳ khảo sát",       icon:Clock },
          { id:"categories", label:"Danh mục",          icon:Settings },
          { id:"subjects",   label:"Môn khảo sát",      icon:BookOpen },
          { id:"mapping",    label:"Cấu hình theo Khối",  icon:Layers },
          { id:"students",   label:"DS HS khảo sát",     icon:Users },
          { id:"assignments",label:"Phân công GV",        icon:UserCheck },
          { id:"reports",    label:"Kết quả Tổng hợp",   icon:BarChart3 },
          { id:"report_config", label:"Cấu hình Báo cáo", icon: PenLine },
          { id:"admission_documents", label:"Hồ sơ nhập học", icon: Tag },
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-[13px] font-black tracking-tight transition-all duration-300 whitespace-nowrap ${tab===t.id?"bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.03]":"text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}>
            <t.icon className={`w-4 h-4 ${tab===t.id?"text-white":"opacity-70"}`}/>
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== TAB: ASSIGNMENTS (PHÂN CÔNG) ===== */}
      {tab==="assignments" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
             <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse">
                <UserCheck className="w-6 h-6 text-indigo-500"/>
             </div>
             <div>
                <h2 className="text-lg font-black text-slate-800">Phân công Giáo viên Khảo sát</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Giao nhiệm vụ phụ trách môn thi cho giáo viên từ Tổ chuyên môn</p>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Configuration */}
            <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="h-1.5 bg-indigo-500 w-full flex-shrink-0"/>
              <div className="p-8 space-y-8 flex-1">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-lg shadow-indigo-100">1</div>
                    <span className="font-black text-slate-800 tracking-tight">Kỳ Khảo sát & Người phụ trách</span>
                  </div>

                  <div className="space-y-5">
                    <Field label="Kỳ khảo sát" required>
                      <select value={asPeriodId} onChange={e=>{setAsPeriodId(e.target.value); setAsBatchId("")}} className={inp}>
                        <option value="">-- Chọn Kỳ --</option>
                        {visiblePeriods.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </Field>

                    <Field label="Đợt khảo sát (Không bắt buộc)">
                      <select value={asBatchId} onChange={e=>setAsBatchId(e.target.value)} className={inp} disabled={!asPeriodId}>
                         <option value="">-- Tất cả đợt --</option>
                         {visiblePeriods.find(p=>p.id===asPeriodId)?.batches?.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </Field>

                    <Field label="Lọc theo Tổ chuyên môn (Không bắt buộc)">
                      <select value={asDeptId} onChange={e=>setAsDeptId(e.target.value)} className={inp}>
                        <option value="">Tất cả Tổ chuyên môn</option>
                        {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </Field>

                    <Field label="Giáo viên phụ trách" required>
                      <select value={asTeacherId} onChange={e=>setAsTeacherId(e.target.value)} className={inp+" bg-slate-50/50 border-indigo-100 hover:border-indigo-300 focus:bg-white"}>
                        <option value="">-- Chọn Giáo viên --</option>
                        {filteredTeachers.map(t=><option key={t.userId} value={t.userId}>{t.teacherName}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Scope Selection */}
            <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="h-1.5 bg-emerald-500 w-full flex-shrink-0"/>
              <div className="p-8 space-y-8 flex-1">
                 <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-lg shadow-emerald-100">2</div>
                    <span className="font-black text-slate-800 tracking-tight">Phạm vi Phân công</span>
                  </div>

                  <div className="space-y-8">
                    {/* Subjects Tags */}
                    <div>
                      <div className="flex items-center justify-between mb-3 px-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><BookOpen className="w-3.5 h-3.5"/> Môn khảo sát *</label>
                        <button onClick={() => setAsSelSubjects(asSelSubjects.length === subjectsList.length ? [] : subjectsList.map(s=>s.id))} className="text-[10px] font-black text-indigo-500 hover:bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-wider transition-colors">
                          {asSelSubjects.length === subjectsList.length ? "Bỏ chọn hết" : "Chọn tất cả"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {subjectsList.map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => setAsSelSubjects(p => p.includes(sub.id) ? p.filter(x=>x!==sub.id) : [...p, sub.id])}
                            className={`px-4 py-2.5 rounded-2xl text-xs font-bold border-2 transition-all ${asSelSubjects.includes(sub.id) ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-white border-slate-100 text-slate-500 hover:border-indigo-200 hover:text-indigo-500"}`}
                          >
                            {sub.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      {/* Grades Tags */}
                      <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Layers className="w-3.5 h-3.5"/> Khối *</label>
                          <button onClick={() => setAsSelGrades(asSelGrades.length === grades.length ? [] : grades)} className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Chọn hết</button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {grades.map(g => (
                            <button
                              key={g}
                              onClick={() => setAsSelGrades(p => p.includes(g) ? p.filter(x=>x!==g) : [...p, g])}
                              className={`py-2 rounded-xl text-[11px] font-black border-2 transition-all ${asSelGrades.includes(g) ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" : "bg-white border-white text-slate-400 hover:border-emerald-200 hover:text-emerald-500"}`}
                            >
                              K{g}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* System Tags */}
                      <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5"/> Hệ học *</label>
                          <button onClick={() => setAsSelSystems(asSelSystems.length === eduSystems.length ? [] : eduSystems.map(es=>es.code))} className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">Chọn hết</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {eduSystems.map(es => (
                            <button
                              key={es.code}
                              onClick={() => setAsSelSystems(p => p.includes(es.code) ? p.filter(x=>x!==es.code) : [...p, es.code])}
                              className={`px-3 py-2 rounded-xl text-[11px] font-black border-2 transition-all ${asSelSystems.includes(es.code) ? "bg-amber-500 border-amber-500 text-white shadow-sm" : "bg-white border-white text-slate-400 hover:border-amber-200 hover:text-amber-500"}`}
                            >
                              {es.code}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit/Save Button */}
          <div className="flex justify-center -mt-3">
             <button
               onClick={submitAssignment}
               disabled={asSubmitting}
               className="group flex items-center gap-3 px-12 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-base hover:bg-black hover:scale-105 transition-all shadow-2xl shadow-indigo-200 disabled:opacity-50"
             >
               {asSubmitting ? <Loader2 className="w-6 h-6 animate-spin"/> : <UserPlus className="w-6 h-6 group-hover:rotate-12 transition-all"/>}
               Xác nhận Phân công cho Giáo viên
             </button>
          </div>

          {/* List of existing assignments */}
          <div className="space-y-4">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2"><Search className="w-5 h-5 text-indigo-500"/> Danh sách đã Phân công</h3>
                <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-black">{groupedAssignments.length} nhóm phân công</span>
             </div>

             <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
                {asLoading ? <Spin/> : assignments.length === 0 ? (
                  <Empty icon={UserPlus} text="Chưa có phân công nào" sub="Sử dụng form bên trên để tiến hành phân công GV"/>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Giáo viên</th>
                          <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Môn học</th>
                          <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Khối</th>
                          <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hệ học</th>
                          <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {groupedAssignments.map(a => (
                          <tr key={a.id} className="group hover:bg-slate-50/70 transition-colors">
                            <td className="p-5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-xs">
                                  {a.user?.fullName?.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-black text-slate-700">{a.user?.fullName}</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{a.batch?.name || "Tất cả đợt"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-5 px-6">
                                <div className="flex flex-wrap gap-1">
                                  {a.subjects.map((sub: string) => (
                                    <span key={sub} className="px-3 py-1 bg-white border border-indigo-100 rounded-lg text-xs font-black text-indigo-600 shadow-sm">{sub}</span>
                                  ))}
                                </div>
                              </td>
                            <td className="p-5">
                                <div className="flex flex-wrap gap-1">
                                  {a.grades.map((g: string) => (
                                    <span key={g} className="text-xs font-black text-slate-600 bg-slate-100 px-2 py-1 rounded-md">Khối {g}</span>
                                  ))}
                                </div>
                              </td>
                            <td className="p-5">
                                <div className="flex flex-wrap gap-1">
                                  {a.educationSystems.map((sys: string) => (
                                    <span key={sys} className="px-2 py-0.5 border border-amber-100 bg-amber-50 text-amber-700 rounded-md text-[10px] font-black uppercase">{sys}</span>
                                  ))}
                                </div>
                              </td>
                            <td className="p-5 text-right flex items-center justify-end">
                               <button 
                                 onClick={() => openEditAssignment(a)}
                                 className="p-2.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all mr-1"
                               >
                                 <Edit2 className="w-4 h-4"/>
                               </button>
                               <button 
                                 onClick={() => setConfirm({ msg: `Xóa phân công của GV ${a.user?.fullName}?`, fn: () => deleteAssignment(a.ids) })}
                                 className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                               >
                                 <Trash2 className="w-4 h-4"/>
                               </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* ===== TAB: PERIODS (RESTORED) ===== */}
      {tab==="periods" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2"><Clock className="w-4 h-4"/> Kỳ & Đợt Khảo sát</h2>
            <div className="flex gap-2">
              <button onClick={fetchPeriods} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"><RefreshCw className="w-4 h-4"/></button>
              <button onClick={openAddPeriod} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-[13px] font-black rounded-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
                <Plus className="w-4 h-4"/> Tạo Kỳ mới
              </button>
            </div>
          </div>

          {pLoading ? <Spin/> : periods.length === 0 ? <Empty icon={Calendar} text="Chưa có Kỳ khảo sát nào" sub="Bấm Tạo Kỳ mới để bắt đầu" /> : (
            <div className="space-y-3">
              {visiblePeriods.map(p => (
                <div key={p.id} className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden group/p hover:border-indigo-200 transition-all">
                  <div className="px-6 py-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer" onClick={()=>setExpandedId(expandedId===p.id?null:p.id)}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center flex-shrink-0 group-hover/p:bg-indigo-600 group-hover/p:text-white transition-all">
                        <Clock className="w-5 h-5"/>
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-black text-slate-800 text-lg">{p.name}</span>
                          <Badge s={p.status}/>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-black uppercase tracking-widest">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/> {p.startDate?.slice(0,10)} → {p.endDate?.slice(0,10)||"?"}</span>
                          <span className="w-1 h-1 bg-slate-200 rounded-full"/>
                          <span className="text-indigo-500">{p.batches?.length||0} đợt ghi nhận</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 ">
                      <button onClick={e=>{e.stopPropagation(); openAddBatch(p.id)}} className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-xl transition-all border border-emerald-100">
                        <Plus className="w-3.5 h-3.5"/> Thêm Đợt
                      </button>
                      <button onClick={e=>{e.stopPropagation(); openEditPeriod(p)}} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 className="w-4 h-4"/></button>
                      <button onClick={e=>{e.stopPropagation(); setConfirm({msg:`Xóa kỳ "${p.name}"?`,fn:()=>doDeletePeriod(p.id)})}} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4 h-4"/></button>
                      <span className="text-slate-300 ml-2">{expandedId===p.id?<ChevronUp className="w-5 h-5"/>:<ChevronDown className="w-5 h-5"/>}</span>
                    </div>
                  </div>
                  {expandedId===p.id && (
                    <div className="border-t border-slate-100 p-6 bg-slate-50/30">
                       {(!p.batches || p.batches.length === 0) ? (
                         <div className="text-center py-8 text-slate-400 font-bold text-xs uppercase tracking-wider bg-white rounded-2xl border-2 border-dashed border-slate-200">Chưa có Đợt khảo sát nào ghi nhận</div>
                       ) : (
                         <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-sm">
                           <table className="w-full text-left border-collapse">
                             <thead>
                               <tr className="bg-slate-50/70 border-b border-slate-100">
                                 <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-6">Mã Đợt</th>
                                 <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung khảo sát</th>
                                 <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cơ sở</th>
                                 <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian</th>
                                 <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</th>
                                 <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Người phụ trách</th>
                                 <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-6">Thao tác</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                               {p.batches?.map(b => {
                                 const selectedCampus = campuses.find(c => c.id === b.campusId);
                                 const campusName = selectedCampus ? selectedCampus.campusName : "Tất cả";
                                 const assignee = giaoVuCSUsers.find(u => u.id === b.assignedUserId);
                                 const assigneeName = assignee ? assignee.fullName : "-- Chưa gán --";
                                 
                                 let baseName = b.name;
                                 const match = b.name.match(/Đợt \\d+ - (.*?) \\|/);
                                 if (match) {
                                   baseName = match[1];
                                 } else {
                                   const match2 = b.name.match(/Đợt \\d+ - (.*)/);
                                   if (match2) baseName = match2[1];
                                 }

                                 return (
                                   <tr key={b.id} className="group hover:bg-slate-50/50 transition-colors">
                                     <td className="p-4 pl-6">
                                       <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 font-black text-indigo-600 text-xs">
                                         #{b.batchNumber}
                                       </span>
                                     </td>
                                     <td className="p-4">
                                       <p className="text-sm font-black text-slate-700">{baseName}</p>
                                       <p className="text-[10px] font-bold text-slate-400 truncate max-w-xs">{b.name}</p>
                                     </td>
                                     <td className="p-4">
                                       <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-black text-slate-600">
                                         {campusName}
                                       </span>
                                     </td>
                                     <td className="p-4">
                                       <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                         <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                         <span>{b.startDate?.slice(0, 10).split('-').reverse().join('/')}</span>
                                         <span className="text-slate-300">→</span>
                                         <span>{b.endDate?.slice(0, 10).split('-').reverse().join('/')}</span>
                                       </div>
                                     </td>
                                     <td className="p-4">
                                       <Badge s={b.status} />
                                     </td>
                                     <td className="p-4">
                                       <div className="flex items-center gap-2">
                                         <div className="w-6 h-6 bg-emerald-50 rounded-full flex items-center justify-center text-[10px] font-black text-emerald-600 border border-emerald-100">
                                           {assigneeName.charAt(0)}
                                         </div>
                                         <span className="text-xs font-bold text-slate-600">{assigneeName}</span>
                                       </div>
                                     </td>
                                     <td className="p-4 text-right pr-6">
                                       <div className="flex items-center justify-end gap-1">
                                         <button onClick={() => openEditBatch(b)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Chỉnh sửa">
                                           <Edit2 className="w-3.5 h-3.5" />
                                         </button>
                                         <button onClick={() => setConfirm({ msg: `Xóa đợt "` + b.name + `"?`, fn: () => doDeleteBatch(b.id) })} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Xóa">
                                           <Trash2 className="w-3.5 h-3.5" />
                                         </button>
                                       </div>
                                     </td>
                                   </tr>
                                 );
                               })}
                             </tbody>
                           </table>
                         </div>
                       )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== TAB: STUDENTS (RESTORED) ===== */}
      {tab==="students" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
           <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
              <div className="flex flex-wrap items-end gap-5">
                 <div className="flex-1 min-w-[280px] space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                       <Field label="Kỳ khảo sát" required>
                          <select value={sPeriodId} onChange={e=>{setSPeriodId(e.target.value); setSBatchId("")}} className={inp}>
                             <option value="">-- Chọn Kỳ --</option>
                             {visiblePeriods.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                       </Field>
                       <Field label="Đợt khảo sát">
                          <select value={sBatchId} onChange={e=>setSBatchId(e.target.value)} className={inp} disabled={!sPeriodId}>
                             <option value="">-- Tất cả đợt --</option>
                             {selPeriod?.batches?.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                       </Field>
                    </div>
                    <div className="relative">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300"/>
                       <input value={sSearch} onChange={e=>setSSearch(e.target.value)} placeholder="Tìm theo mã định danh hoặc tên học sinh..." className={inp+" pl-11"}/>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 pb-1">
                    <button onClick={fetchStudents} disabled={!sPeriodId} className="px-6 py-3 bg-slate-800 text-white text-xs font-black rounded-2xl hover:bg-black disabled:opacity-30 transition-all uppercase tracking-widest shadow-lg shadow-slate-100">Tìm kiếm</button>
                    <button onClick={openAddStudent} disabled={!sPeriodId} className="px-6 py-3 bg-indigo-600 text-white text-xs font-black rounded-2xl hover:bg-indigo-700 disabled:opacity-30 transition-all uppercase tracking-widest shadow-lg shadow-indigo-100">Thêm mới</button>
                    <button onClick={handleDownloadTemplate} disabled={!sPeriodId} className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center hover:bg-blue-700 shadow-lg shadow-blue-50 transition-all mr-2">
                       <Download className="w-5 h-5"/>
                    </button>
                    <button onClick={()=>fileRef.current?.click()} disabled={!sPeriodId||importing} className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center hover:bg-emerald-700 shadow-lg shadow-emerald-50 transition-all">
                       <Upload className="w-5 h-5"/>
                    </button>
                    <input type="file" ref={fileRef} accept=".xlsx" className="hidden" onChange={handleImport}/>
                 </div>
              </div>
           </div>

           <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden min-h-[400px]">
              {sLoading ? <Spin/> : filtStu.length === 0 ? <Empty icon={Users} text="Không tìm thấy học sinh nào" sub="Hãy chọn Kỳ và bấm 'Tìm kiếm'"/> : (
                <div className="overflow-x-auto">
                   <table className="w-full text-left whitespace-nowrap">
                      <thead className="bg-slate-50 border-b border-slate-100">
                         <tr>
                            <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã HS KS</th>
                            <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ và Tên</th>
                            <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Khối</th>
                              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Giới tính</th>
                              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ngày sinh</th>
                              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Hệ Khảo sát</th>
                              
                              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Hồ sơ / Bảng điểm</th>
                              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Học kỳ / Năm TS</th>
                              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Đối tượng TS</th>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Diện khảo sát</th>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Hình thức KS</th>
                                
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">KQ Học tập</th>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">KQ Rèn luyện</th>
                              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filtStu.map(s => (
                          <tr key={s.id} className="group hover:bg-slate-50/50">
                             <td className="p-5"><span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{s.studentCode}</span></td>
                             <td className="p-5"><span className="text-sm font-black text-slate-700">{s.fullName}</span></td>
                             <td className="p-5 text-center text-xs font-black text-slate-400">{s.grade}</td>
                             <td className="p-5 text-center text-xs font-black text-slate-400">{s.gender || "-"}</td>
                               <td className="p-5 text-center"><span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('vi-VN') : "-"}</span></td>
                               <td className="p-5 text-center"><span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{s.surveyFormType || "-"}</span></td>
                               
                               <td className="p-5 text-center"><span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{s.hoSoCtQuocTe || "-"}</span></td>
                               <td className="p-5 text-center"><span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{s.hocKy || "-"}</span></td>
                               <td className="p-5 text-center"><span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{s.targetType || "-"}</span></td>
                                 <td className="p-5 text-center"><span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{s.admissionCriteria || "-"}</span></td>
                                 <td className="p-5 text-center"><span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{s.surveySystem || "-"}</span></td>
                                 
                                 <td className="p-5 text-center"><span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{s.kqHocTap || "-"}</span></td>
                                 <td className="p-5 text-center"><span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{s.kqRenLuyen || "-"}</span></td>
                               <td className="p-5 text-right">
                                <div className="flex items-center justify-end gap-1 ">
                                   <button onClick={()=>openEditStudent(s)} className="p-2.5 text-slate-300 hover:text-indigo-600"><Edit2 className="w-4 h-4"/></button>
                                   <button onClick={()=>setConfirm({msg:`Xóa học sinh này?`,fn:()=>doDeleteStudent(s.id)})} className="p-2.5 text-slate-300 hover:text-rose-600"><Trash2 className="w-4 h-4"/></button>
                                </div>
                             </td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
              )}
           </div>
        </div>
      )}

      {/* ===== TAB: CATEGORIES (RESTORED) ===== */}
      {tab==="categories" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
           {CATEGORY_TYPES.map(type => (
             <div key={type.code} className="bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col overflow-hidden">
                <div className={`h-1.5 bg-gradient-to-r ${type.color}`}/>
                <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                   <div>
                      <h4 className="text-sm font-black text-slate-800 tracking-tight">{type.label}</h4>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{type.code}</span>
                   </div>
                   <button onClick={()=>openAddConfig(type.code)} className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-slate-100"><Plus className="w-4 h-4"/></button>
                </div>
                <div className="p-4 flex-1 space-y-1.5">
                   {configs.filter(c => c.categoryType === type.code).map(c => (
                     <div key={c.id} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                        <span className="text-xs font-black text-slate-600 truncate">{c.name}</span>
                        <div className="flex items-center gap-0.5 ">
                           <button onClick={()=>openEditConfig(c)} className="p-1.5 text-slate-300 hover:text-indigo-600"><Edit2 className="w-3 h-3"/></button>
                           <button onClick={()=>setConfirm({msg:`Xóa "${c.name}"?`,fn:()=>doDeleteConfig(c.id)})} className="p-1.5 text-slate-300 hover:text-rose-600"><Trash2 className="w-3 h-3"/></button>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
           ))}
        </div>
      )}

      {/* ===== TAB: SUBJECTS (MON KHAO SAT) ===== */}
      {tab === "subjects" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2"><BookOpen className="w-4 h-4"/> Danh sach Mon Khao sat</h2>
            <button
              onClick={() => { setEditingSubjectId(null); setSubjectForm({ code:"", name:"", subjectType:"", scoreColumns:1, commentColumns:1, status:"ACTIVE", exemptCriteria:[] as string[] }); setIsSubjectOpen(true) }}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-[13px] font-black rounded-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
            >
              <Plus className="w-4 h-4"/> Them Mon moi
            </button>
          </div>

          {subjectsList.length === 0 ? (
            <Empty icon={BookOpen} text="Chua co Mon khao sat nao" sub="Bam them de bat dau"/>
          ) : (
            <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ma mon</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ten Mon</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Loai</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cot Diem</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cot NX</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Trang thai</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Mien giam</th>
                      <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tac</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {subjectsList.map((sub) => {
                      let parsedCols = { scores: [], comments: [], showScoreInReport: [], showCommentInReport: [] };
                      try { if (sub.columnNames) parsedCols = JSON.parse(sub.columnNames); } catch {}
                      return (
                        <tr key={sub.id} className="group hover:bg-slate-50/70 transition-colors">
                          <td className="p-5"><span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{sub.code}</span></td>
                          <td className="p-5"><span className="text-sm font-black text-slate-700">{sub.name}</span></td>
                          <td className="p-5 text-center">
                            {sub.subjectType ? (<span className="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-100 rounded-lg text-[10px] font-black uppercase tracking-wider">{sub.subjectType === "VIET_NAM" ? "GV VN" : "GV NN"}</span>) : (<span className="text-slate-300 text-xs">-</span>)}
                          </td>
                          <td className="p-5 text-center"><span className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 font-black text-xs inline-flex items-center justify-center">{sub.scoreColumns ?? 0}</span></td>
                          <td className="p-5 text-center"><span className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 font-black text-xs inline-flex items-center justify-center">{sub.commentColumns ?? 0}</span></td>
                          <td className="p-5 text-center"><Badge s={sub.status || "ACTIVE"}/></td>
                          <td className="p-5 text-center">
                            {(() => { try { const arr = JSON.parse(sub.exemptCriteria || "[]"); return (Array.isArray(arr) && arr.length > 0) ? <div className="flex flex-wrap gap-1 justify-center">{arr.map((c: string) => <span key={c} className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">{c}</span>)}</div> : <span className="text-slate-300 text-xs">—</span>; } catch { return <span className="text-slate-300 text-xs">—</span>; } })()}
                          </td>
                          <td className="p-5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button title="Cau hinh ten cot" onClick={() => { setColumnConfigForm({ subjectId: sub.id, name: sub.name, scoreColumns: sub.scoreColumns ?? 1, commentColumns: sub.commentColumns ?? 1, scoreNames: parsedCols.scores || [], commentNames: parsedCols.comments || [], showScoreInReport: parsedCols.showScoreInReport || [], showCommentInReport: parsedCols.showCommentInReport || [] }); setIsColumnConfigOpen(true); }} className="p-2.5 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"><PenLine className="w-4 h-4"/></button>
                              <button onClick={() => { setEditingSubjectId(sub.id); setSubjectForm({ code: sub.code, name: sub.name, subjectType: sub.subjectType || "", scoreColumns: sub.scoreColumns ?? 1, commentColumns: sub.commentColumns ?? 1, status: sub.status || "ACTIVE", exemptCriteria: (() => { try { return JSON.parse(sub.exemptCriteria || "[]"); } catch { return []; } })() }); setIsSubjectOpen(true); }} className="p-2.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 className="w-4 h-4"/></button>
                              <button onClick={() => setConfirm({ msg: `Xoa mon ${sub.name}?`, fn: () => deleteSubject(sub.id) })} className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4 h-4"/></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}      {/* ===== TAB: MAPPING (CAU HINH KHOI) ===== */}
      {tab === "mapping" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* TOP PANEL: Form ThemMoi / Sua */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-5 border-b pb-4">
              <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600"><Settings className="w-5 h-5"/></div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{editingMappingSubjectId ? "Chỉnh sửa Cấu hình Môn" : "Gán Môn Khảo Sát"}</h3>
                <p className="text-xs font-medium text-slate-500 mt-0.5">{editingMappingSubjectId ? "Đang chỉnh sửa - thay đổi Khối/Hệ rồi bấm Cập Nhật" : "Chọn Khối, Hệ học và các Môn để cấu hình đồng loạt"}</p>
                {editingMappingSubjectId && <button onClick={() => { setEditingMappingSubjectId(null); setSelGrades([]); setSelEdus([]); setAssignSelSubjects([]); }} className="text-xs text-red-500 hover:underline font-bold mt-1">✕ Hủy chỉnh sửa</button>}
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left: Grade & Edu */}
              <div className="lg:col-span-5 space-y-6 bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="block font-bold text-slate-700 text-xs uppercase tracking-wider">Khối:</span>
                    <button onClick={() => setSelGrades(selGrades.length === grades.length ? [] : [...grades])} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors">Chọn tất cả</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {grades.map((g: string) => (
                      <button key={g} onClick={() => toggleGrade(g)} className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${selGrades.includes(g) ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'}`}>
                        {selGrades.includes(g) && <Check className="w-3 h-3 inline mr-1"/>} K{g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="block font-bold text-slate-700 text-xs uppercase tracking-wider">Hệ học:</span>
                    <button onClick={() => setSelEdus(selEdus.length === eduSystems.length ? [] : eduSystems.map((e: any) => e.code))} className="text-[10px] font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-md transition-colors">Chọn tất cả</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {eduSystems.map((es: any) => (
                      <button key={es.code} onClick={() => toggleEdu(es.code)} className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${selEdus.includes(es.code) ? 'bg-purple-500 text-white shadow-md shadow-purple-200' : 'bg-white text-slate-600 border border-slate-200 hover:border-purple-300'}`}>
                        {selEdus.includes(es.code) && <Check className="w-3 h-3 inline mr-1"/>} {es.code}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Subjects to Assign */}
              <div className="lg:col-span-7 bg-slate-50/50 p-5 rounded-xl border border-slate-100 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="block font-bold text-slate-700 text-xs uppercase tracking-wider">Chọn Môn Khảo Sát:</span>
                  <button onClick={() => setAssignSelSubjects(assignSelSubjects.length === subjectsList.length ? [] : subjectsList.map((s:any)=>s.id))} className="text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md transition-colors">Chọn tất cả</button>
                </div>
                <div className="flex flex-wrap gap-2 mb-4 max-h-[150px] overflow-y-auto pr-1">
                  {subjectsList.map((s:any) => (
                    <button key={s.id} onClick={() => setAssignSelSubjects(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])} className={`text-xs px-3 py-2 rounded-xl font-bold transition-all border ${assignSelSubjects.includes(s.id) ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'}`}>
                      {s.name}
                    </button>
                  ))}
                </div>
                
                <div className="mt-auto pt-4 border-t border-slate-200/60">
                  <button 
                    onClick={async () => {
                      if(!selGrades.length || !selEdus.length || !assignSelSubjects.length) {
                        notify("Vui lòng chọn đủ Khối, Hệ học và ít nhất 1 Môn KS!", "err"); return;
                      }
                      setMappingLoading(true);
                      // If editing, delete ALL old mappings for these subjects first
                      if (editingMappingSubjectId) {
                        const oldMappingIds = allMappings
                          .filter((m: any) => assignSelSubjects.includes(m.subjectId))
                          .map((m: any) => m.id);
                        for (const id of oldMappingIds) {
                          await fetch("/api/grade-subject-mappings?id=" + id, { method: "DELETE" });
                        }
                      }
                      // Create new mappings
                      for(const sid of assignSelSubjects) {
                        await fetch("/api/grade-subject-mappings", {
                          method: "POST", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ grades: selGrades, eduSystems: selEdus, subjectId: sid })
                        });
                      }
                      const wasEditing = !!editingMappingSubjectId;
                      setMappingLoading(false);
                      await fetchAllMappings();
                      setSelGrades([]); setSelEdus([]); setAssignSelSubjects([]); setEditingMappingSubjectId(null);
                      notify(wasEditing ? "Cập nhật cấu hình thành công!" : "Lưu cấu hình thành công!");
                    }}
                    disabled={mappingLoading || (!selGrades.length || !selEdus.length || !assignSelSubjects.length)}
                    className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2"
                  >
                    {mappingLoading ? <FileSpreadsheet className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
                    {editingMappingSubjectId ? "Cập Nhật Cấu Hình" : "Lưu Cấu Hình"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM PANEL: Table of existing configurations */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b bg-slate-50/80 flex justify-between items-center">
              <h4 className="font-bold text-slate-800 flex items-center gap-2"><Layers className="w-4 h-4 text-indigo-500"/> Danh sách Cấu hình đã lưu</h4>
              <button onClick={fetchAllMappings} className="text-xs text-indigo-600 hover:underline font-medium">Làm mới</button>
            </div>
            
            {allMappingsLoading ? (
              <div className="p-8 text-center text-slate-400">Đang tải danh sách...</div>
            ) : allMappings.length === 0 ? (
              <div className="p-12 text-center text-slate-400">Chưa có cấu hình môn khảo sát nào.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest w-16">STT</th>
                      <th className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Môn Khảo Sát</th>
                      <th className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Khối Áp Dụng</th>
                      <th className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Hệ Áp Dụng</th>
                      <th className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest text-center w-24">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      // Group mappings by subject
                      const groups = new Map();
                      allMappings.forEach(m => {
                        const key = m.subjectId;
                        if (!groups.has(key)) {
                          groups.set(key, { subject: m.subject, grades: new Set(), edus: new Set(), ids: [] });
                        }
                        const g = groups.get(key);
                        g.grades.add(m.grade);
                        g.edus.add(m.educationSystem);
                        g.ids.push(m.id);
                      });
                      
                      return Array.from(groups.values()).map((g:any, i) => {
                        const allGrades = grades.length > 0 && g.grades.size === grades.length;
                        const allEdus = eduSystems.length > 0 && g.edus.size === eduSystems.length;
                        
                        return (
                          <tr key={g.subject?.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-400">{i+1}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-base">{g.subject?.name}</span>
                                {g.subject?.code && <span className="text-xs font-mono text-slate-400">{g.subject.code}</span>}
                                {g.subject?.subjectType && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold uppercase">
                                    {g.subject.subjectType === "VIET_NAM" ? "GV VN" : "GV NN"}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {allGrades ? (
                                <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md text-xs">Tất cả Khối</span>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {Array.from(g.grades).sort((a:any, b:any) => parseInt(a) - parseInt(b)).map((grade:any) => (
                                    <span key={grade} className="font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md text-xs">K{grade}</span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {allEdus ? (
                                <span className="font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-md text-xs">Tất cả Hệ học</span>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {Array.from(g.edus).sort().map((edu:any) => (
                                    <span key={edu} className="font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2 py-1 rounded-md text-xs">{edu}</span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex justify-center gap-1">
                                <button onClick={() => {
                                  setSelGrades(Array.from(g.grades) as string[]);
                                  setSelEdus(Array.from(g.edus) as string[]);
                                  setAssignSelSubjects([g.subject?.id]);
                                  setEditingMappingSubjectId(g.subject?.id);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Chỉnh sửa (Sẽ nạp lên form phía trên)">
                                  <Pencil className="w-4 h-4"/>
                                </button>
                                <button onClick={async () => {
                                  if(confirm(`Xóa toàn bộ cấu hình của môn ${g.subject?.name}?`)) {
                                    for (const id of g.ids) {
                                      await fetch("/api/grade-subject-mappings?id=" + id, { method: "DELETE" });
                                    }
                                    fetchAllMappings();
                                  }
                                }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Xóa toàn bộ môn này">
                                  <Trash2 className="w-4 h-4"/>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ===== TAB: REPORT CONFIG ===== */}
      {tab === "report_config" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Left: Settings Panel */}
          <div className="lg:col-span-5 bg-white border border-slate-200 shadow-sm rounded-3xl p-8 space-y-6">
            <div className="flex items-center gap-3 border-b pb-4 mb-2">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Settings className="w-5 h-5"/>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">Cấu hình Báo cáo</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Thiết lập Logo và chữ ký Giám đốc Cơ sở</p>
              </div>
            </div>

            <Field label="Chọn cơ sở áp dụng" required>
              <select value={rcCampusId} onChange={e => setRcCampusId(e.target.value)} className={inp}>
                <option value="">-- Chọn Cơ sở --</option>
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>{c.campusName}</option>
                ))}
              </select>
            </Field>

            <Field label="Loại báo cáo" required>
              <select value={rcReportType} onChange={e => setRcReportType(e.target.value)} className={inp}>
                <option value="thu_moi">Thư mời</option>
                <option value="thu_chuc_mung">Thư chúc mừng</option>
                <option value="cam_ket_hoc_tap">Cam kết học tập</option>
              </select>
            </Field>

             <Field label="Áp dụng cho Đối tượng / Khối" required>
               <select value={rcTargetGroup} onChange={e => setRcTargetGroup(e.target.value)} className={inp}>
                 <option value="all">Tất cả các khối (Mặc định)</option>
                 {docGroups.map(g => (
                   <option key={g.id} value={g.id}>{g.label}</option>
                 ))}
               </select>
             </Field>

            <Field label="Tiêu đề Báo cáo" required>
              <input value={rcTitle} onChange={e => setRcTitle(e.target.value)} placeholder="Nhập tiêu đề báo cáo..." className={inp} />
            </Field>

            <Field label="Nội dung văn bản (Mẫu)" required>
              <textarea 
                value={rcContent} 
                onChange={e => setRcContent(e.target.value)} 
                rows={8} 
                placeholder="Nhập nội dung mẫu..." 
                className={`${inp} py-3 font-normal resize-none text-xs leading-relaxed font-sans`}
              />
              <p className="text-[10px] text-slate-400 mt-1 font-semibold leading-normal">
                Các từ khóa tự điền: <span className="text-indigo-600 font-bold">{"{{fullName}}"}</span>, <span className="text-indigo-600 font-bold">{"{{grade}}"}</span>, <span className="text-indigo-600 font-bold">{"{{hocKy}}"}</span>, <span className="text-indigo-600 font-bold">{"{{surveyFormType}}"}</span>
              </p>
            </Field>

            <Field label="Họ tên Giám đốc Cơ sở" required>
              <input value={rcDirectorName} onChange={e => setRcDirectorName(e.target.value)} placeholder="Nhập họ tên GĐCS..." className={inp} />
            </Field>

            <div className="space-y-4 pt-2">
              {/* Logo Upload */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Upload Logo Trường</label>
                <div className="flex items-center gap-4">
                  {rcLogo ? (
                    <div className="relative w-16 h-16 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center group">
                      <img src={rcLogo} alt="Logo" className="max-w-full max-h-full object-contain rounded-lg" />
                      <button onClick={() => setRcLogo("")} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-rose-700 transition-colors">
                        <X className="w-3 h-3"/>
                      </button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:border-indigo-400 hover:text-indigo-600 transition-all">
                      <Upload className="w-5 h-5"/>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  )}
                  <div className="text-xs">
                    <p className="font-bold text-slate-600">Logo chính của trường</p>
                    <p className="text-slate-400">Định dạng JPG, PNG, WEBP. Tối đa 2MB.</p>
                  </div>
                </div>
              </div>

              {/* Signature Upload */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Upload Chữ ký Giám đốc Cơ sở</label>
                <div className="flex items-center gap-4">
                  {rcSignature ? (
                    <div className="relative w-16 h-16 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center group">
                      <img src={rcSignature} alt="Chữ ký" className="max-w-full max-h-full object-contain rounded-lg" />
                      <button onClick={() => setRcSignature("")} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-rose-700 transition-colors">
                        <X className="w-3 h-3"/>
                      </button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:border-indigo-400 hover:text-indigo-600 transition-all">
                      <Upload className="w-5 h-5"/>
                      <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
                    </label>
                  )}
                  <div className="text-xs">
                    <p className="font-bold text-slate-600">Chữ ký cá nhân (nền trong suốt)</p>
                    <p className="text-slate-400">Định dạng PNG khuyên dùng để có độ hiển thị cao.</p>
                  </div>
                </div>
              </div>

              {/* Background Upload */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Upload Hình nền Văn bản</label>
                <div className="flex items-center gap-4">
                  {rcBackground ? (
                    <div className="relative w-16 h-16 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center group">
                      <img src={rcBackground} alt="Hình nền" className="max-w-full max-h-full object-contain rounded-lg" />
                      <button onClick={() => setRcBackground("")} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-rose-700 transition-colors">
                        <X className="w-3 h-3"/>
                      </button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:border-indigo-400 hover:text-indigo-600 transition-all">
                      <Upload className="w-5 h-5"/>
                      <input type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload} />
                    </label>
                  )}
                  <div className="text-xs">
                    <p className="font-bold text-slate-600">Hình nền / Watermark cho văn bản</p>
                    <p className="text-slate-400">Định dạng JPG, PNG, WEBP. Tự động hiển thị mờ làm nền.</p>
                  </div>
                </div>
              </div>

              {/* Footer Upload */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Upload Hình Footer Văn bản</label>
                <div className="flex items-center gap-4">
                  {rcFooter ? (
                    <div className="relative w-16 h-16 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center group">
                      <img src={rcFooter} alt="Hình Footer" className="max-w-full max-h-full object-contain rounded-lg" />
                      <button onClick={() => setRcFooter("")} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-rose-700 transition-colors">
                        <X className="w-3 h-3"/>
                      </button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:border-indigo-400 hover:text-indigo-600 transition-all">
                      <Upload className="w-5 h-5"/>
                      <input type="file" accept="image/*" className="hidden" onChange={handleFooterUpload} />
                    </label>
                  )}
                  <div className="text-xs">
                    <p className="font-bold text-slate-600">Hình Footer cho văn bản (Banner địa chỉ)</p>
                    <p className="text-slate-400">Định dạng JPG, PNG, WEBP. Thay thế dải địa chỉ chữ mặc định.</p>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={saveReportConfig} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> Lưu cấu hình
            </button>
          </div>

          {/* Right: Live Preview Panel */}
          <div className="lg:col-span-7 bg-slate-50 border border-slate-200 shadow-inner rounded-3xl p-8 flex flex-col justify-between min-h-[450px]">
            <div>
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-4">Xem trước tiêu đề báo cáo</span>
              <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-lg flex flex-col justify-between w-full aspect-[210/297] relative overflow-hidden">
                {/* Background Watermark for Preview */}
                <div 
                  className="absolute pointer-events-none"
                  style={{
                    backgroundImage: `url('${rcBackground || DEFAULT_WATERMARK_SVG}')`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    backgroundSize: rcBackground ? 'cover' : 'contain',
                    opacity: rcBackground ? 0.15 : 0.05,
                    top: rcBackground ? '0' : '50%',
                    left: rcBackground ? '0' : '50%',
                    width: rcBackground ? '100%' : '70%',
                    height: rcBackground ? '100%' : '50%',
                    transform: rcBackground ? 'none' : 'translate(-50%, -50%) rotate(-15deg)'
                  }}
                />
                
                {/* Wrapped Content Group (aligns top) */}
                <div className="space-y-5 flex flex-col relative z-10 w-full">
                  {/* Report Header (Matching Print Layout exactly) */}
                  <div className="border-b border-slate-200 pb-2">
                    <div className="flex justify-between items-center mb-1">
                      {rcLogo ? (
                        <img src={rcLogo} alt="Logo" className="h-8 object-contain" />
                      ) : (
                        <span className="text-[10px] font-black tracking-tight text-teal-600 uppercase" style={{ fontFamily: "Arial, sans-serif" }}>SKY-LINE</span>
                      )}
                    </div>
                    <div className="text-left">
                      <h4 className="font-extrabold text-[9px] uppercase tracking-wider text-slate-800" style={{ fontFamily: "Arial, sans-serif" }}>{previewSchoolName}</h4>
                    </div>
                  </div>

                  {/* Centered Title */}
                  <div className="text-center my-1">
                    <h2 className="text-xs font-black tracking-widest text-indigo-950 uppercase" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                      {rcTitle}
                    </h2>
                  </div>

                  {/* Live Preview Dynamic Body */}
                  
                  {/* Live Preview Greeting Line */}
                  <p className="text-[11px] italic mb-1 text-slate-700 font-black">
                    {rcReportType === 'thu_moi' ? (
                      <>Kính gửi Quý Phụ huynh và em <strong className="font-black not-italic">{(selectedReportStudent || {fullName:"Lê Trà My"}).fullName}</strong>,</>
                    ) : (
                      <>Thân gửi em <strong className="font-black not-italic">{(selectedReportStudent || {fullName:"Lê Trà My"}).fullName}</strong>,</>
                    )}
                  </p>
                  <div className="space-y-3 py-2 text-[10px] leading-relaxed text-slate-600 text-justify overflow-y-auto max-h-[360px] pr-1 scrollbar-thin">
                    {renderTemplate(rcContent, selectedReportStudent || { fullName: "Lê Trà My", grade: "1", hocKy: "1", surveyFormType: "Hội nhập S" }).split('\n').filter(Boolean).map((para, idx) => (
                      <p key={idx} className="indent-4" style={{ textIndent: "1rem" }}>{para}</p>
                    ))}
                  </div>

                  {/* Signature Footer */}
                  <div className="flex justify-end pt-2">
                    <div className="text-center space-y-1 min-w-[160px]">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">GIÁM ĐỐC ĐIỀU HÀNH SKY-LINE {previewTitleSuffix}</p>
                      <div className="h-12 flex items-center justify-center">
                        {rcSignature ? (
                          <img src={rcSignature} alt="Chữ ký Preview" className="max-h-full object-contain" />
                        ) : (
                          <div className="text-[8px] font-semibold text-slate-300 italic">Chưa upload chữ ký</div>
                        )}
                      </div>
                      <p className="text-[11px] font-black text-slate-700">{rcDirectorName || "-- Họ tên --"}</p>
                    </div>
                  </div>
                </div>

                {/* Live Preview Footer Contact (anchored to bottom via flex justify-between) */}
                {rcFooter ? (
                  <div className="pt-2 mt-4 border-t border-slate-200 relative z-10 w-full">
                    <img src={rcFooter} alt="Footer Preview" className="w-full h-auto" />
                  </div>
                ) : (
                  <div className="border-t border-teal-500/30 pt-2 mt-4 text-[6px] text-slate-400 font-sans leading-normal relative z-10 w-full" style={{ fontFamily: "Arial, sans-serif" }}>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-left">
                        <p className="font-bold text-teal-600 uppercase text-[5px] tracking-wider">SKY-LINE Riverside</p>
                        <p className="text-[4px] text-slate-500 leading-tight">Lô A2.4 Trần Đăng Ninh, Hải Châu, Đà Nẵng</p>
                        <p className="font-bold text-teal-600 uppercase text-[5px] tracking-wider mt-0.5">SKY-LINE Central</p>
                        <p className="text-[4px] text-slate-500 leading-tight">Số 48 Nguyễn Du, Hải Châu, Đà Nẵng</p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-teal-600 uppercase text-[5px] tracking-wider">SKY-LINE Beach</p>
                        <p className="text-[4px] text-slate-500 leading-tight">Số 199 Trần Anh Tông, Thanh Khê, Đà Nẵng</p>
                        <p className="font-bold text-teal-600 uppercase text-[5px] tracking-wider mt-0.5">SKY-LINE Hill</p>
                        <p className="text-[4px] text-slate-500 leading-tight">Khối Hà My Đông A, Điện Dương, Q.Nam</p>
                      </div>
                      <div className="text-right flex flex-col justify-start">
                        <p className="font-bold text-teal-600 uppercase text-[5px] tracking-wide">www.skylineschool.edu.vn</p>
                        <p className="text-[4px] text-slate-500 leading-tight mt-0.5">Hotline: (+84.236) 378 7777</p>
                        <p className="text-[4px] text-slate-500 leading-tight">Hotline: (+84.236) 356 8777</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECOND PREVIEW CARD: ADMISSION DOCUMENTS (HỒ SƠ NHẬP HỌC) - USER MANDATED FOR LIVE PREVIEW STACKING */}
              <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-lg flex flex-col justify-between w-full aspect-[210/297] relative overflow-hidden mt-8">
                {/* Background Watermark */}
                <div 
                  className="absolute pointer-events-none"
                  style={{
                    backgroundImage: `url('${rcBackground || DEFAULT_WATERMARK_SVG}')`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    backgroundSize: rcBackground ? 'cover' : 'contain',
                    opacity: rcBackground ? 0.15 : 0.05,
                    top: rcBackground ? '0' : '50%',
                    left: rcBackground ? '0' : '50%',
                    width: rcBackground ? '100%' : '70%',
                    height: rcBackground ? '100%' : '50%',
                    transform: rcBackground ? 'none' : 'translate(-50%, -50%) rotate(-15deg)'
                  }}
                />
                
                {/* Wrapped Content Group */}
                <div className="space-y-5 flex flex-col relative z-10 w-full">
                  {/* Header (Synchronized perfectly) */}
                  <div className="border-b border-slate-200 pb-2">
                    <div className="flex justify-between items-center mb-1">
                      {rcLogo ? (
                        <img src={rcLogo} alt="Logo" className="h-8 object-contain" />
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-black tracking-tight text-teal-600 uppercase" style={{ fontFamily: "Arial, sans-serif" }}>SKY-LINE</span>
                          <svg className="w-3 h-3 text-teal-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="text-left">
                      <h4 className="font-extrabold text-[9px] uppercase tracking-wider text-slate-800" style={{ fontFamily: "Arial, sans-serif" }}>{previewSchoolName}</h4>
                    </div>
                  </div>

                  {/* Centered Title */}
                  <div className="text-center my-2">
                    <h2 className="text-xs font-black tracking-widest text-indigo-950 uppercase" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                      DANH MỤC HỒ SƠ NHẬP HỌC
                    </h2>
                  </div>

                  {/* Checklist Table (Preview Scale) */}
                  <div className="mt-2 overflow-hidden border border-slate-950">
                    <table className="w-full border-collapse text-left text-[9px] text-slate-900" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                      <thead>
                        <tr className="bg-white border-b border-slate-950">
                          <th className="px-3 py-1.5 font-bold border-r border-slate-950 text-center uppercase text-slate-950" style={{ borderRightWidth: '1px', borderColor: '#000' }}>Hồ sơ yêu cầu</th>
                          <th className="px-3 py-1.5 font-bold text-center uppercase text-slate-950 w-20">Số lượng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewDocList.map((item, idx) => (
                          <tr key={item.id} className="border-b border-slate-950 last:border-b-0">
                            <td className="px-3 py-1.5 border-r border-slate-950 font-medium text-slate-900" style={{ borderRightWidth: '1px', borderColor: '#000' }}>{idx + 1}. {item.name}</td>
                            <td className="px-3 py-1.5 text-center text-slate-950 font-bold">{item.qty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <p className="mt-4 text-[9px] text-slate-950 font-bold text-left leading-relaxed" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                    Quý phụ huynh vui lòng bổ sung hồ sơ thiếu (nếu có) trong vòng 10 ngày kể từ ngày nộp Hồ sơ.
                  </p>
                </div>

                {/* Footer Contact (Synchronized perfectly) */}
                {rcFooter ? (
                  <div className="pt-2 mt-4 border-t border-slate-200 relative z-10 w-full">
                    <img src={rcFooter} alt="Footer Preview" className="w-full h-auto" />
                  </div>
                ) : (
                  <div className="border-t border-teal-500/30 pt-2 mt-4 text-[6px] text-slate-400 font-sans leading-normal relative z-10 w-full" style={{ fontFamily: "Arial, sans-serif" }}>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-left">
                        <p className="font-bold text-teal-600 uppercase text-[5px] tracking-wider">SKY-LINE Riverside</p>
                        <p className="text-[4px] text-slate-500 leading-tight">Lô A2.4 Trần Đăng Ninh, Hải Châu, Đà Nẵng</p>
                        <p className="font-bold text-teal-600 uppercase text-[5px] tracking-wider mt-0.5">SKY-LINE Central</p>
                        <p className="text-[4px] text-slate-500 leading-tight">Số 48 Nguyễn Du, Hải Châu, Đà Nẵng</p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-teal-600 uppercase text-[5px] tracking-wider">SKY-LINE Beach</p>
                        <p className="text-[4px] text-slate-500 leading-tight">Số 199 Trần Anh Tông, Thanh Khê, Đà Nẵng</p>
                        <p className="font-bold text-teal-600 uppercase text-[5px] tracking-wider mt-0.5">SKY-LINE Hill</p>
                        <p className="text-[4px] text-slate-500 leading-tight">Khối Hà My Đông A, Điện Dương, Q.Nam</p>
                      </div>
                      <div className="text-right flex flex-col justify-start">
                        <p className="font-bold text-teal-600 uppercase text-[5px] tracking-wide">www.skylineschool.edu.vn</p>
                        <p className="text-[4px] text-slate-500 leading-tight mt-0.5">Hotline: (+84.236) 378 7777</p>
                        <p className="text-[4px] text-slate-500 leading-tight">Hotline: (+84.236) 356 8777</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest pt-4">Bản xem trước tự động cập nhật thời gian thực</div>
          </div>
        </div>
      )}

      {/* ===== TAB: ADMISSION DOCUMENTS (HỒ SƠ NHẬP HỌC) ===== */}
      {tab === "admission_documents" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-slate-200/60 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                <Tag className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800">Danh mục Hồ sơ nhập học</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cấu hình danh sách giấy tờ cần nộp theo từng đối tượng tuyển sinh</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  setConfirm({
                    msg: "Bạn có chắc chắn muốn khôi phục danh sách hồ sơ mẫu cho đối tượng này không?",
                    fn: () => {
                      setDocList(defaultDocumentsGrade1);
                      localStorage.setItem(getDocStorageKey(selectedDocGroup), JSON.stringify(defaultDocumentsGrade1));
                    }
                  });
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Khôi phục mẫu
              </button>
              <button 
                onClick={() => {
                  setEditingDoc(null);
                  setDocFormName("");
                  setDocFormQty("");
                  setDocFormNote("");
                  setDocFormSelectedTargets(docGroupTargets[selectedDocGroup] || []);
                  setDocFormSelectedGrades(docGroupGrades[selectedDocGroup] || []);
                  setIsDocModalOpen(true);
                }}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm hồ sơ mới
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="group space-y-2">
              <label className="block text-xs font-bold tracking-widest uppercase mb-2 text-indigo-900/70 ml-1">Chọn Đối tượng Hồ sơ</label>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative w-64">
                  <select 
                    value={selectedDocGroup} 
                    onChange={(e) => setSelectedDocGroup(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 pr-10 text-sm font-black text-slate-700 outline-none appearance-none cursor-pointer hover:bg-slate-100/50 focus:border-indigo-500 focus:bg-white transition-all duration-300"
                  >
                    {docGroups.map(g => (
                      <option key={g.id} value={g.id}>{g.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-slate-600 transition-colors" />
                </div>

                <button 
                  onClick={() => {
                    const newName = prompt("Nhập tên Đối tượng Hồ sơ mới:");
                    if (newName && newName.trim()) {
                      const newId = "custom_" + Date.now();
                      const updated = [...customDocGroups, { id: newId, label: newName.trim() }];
                      setCustomDocGroups(updated);
                      localStorage.setItem('admission_doc_groups', JSON.stringify(updated));
                      setSelectedDocGroup(newId);
                    }
                  }}
                  className="px-4 py-3.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center gap-2 text-xs font-black transition-all border border-indigo-100 shadow-sm"
                  title="Thêm đối tượng mới"
                >
                  <Plus className="w-4 h-4" />
                  Thêm đối tượng
                </button>

                {selectedDocGroup && (
                  <>
                    <button 
                      onClick={() => {
                        const current = customDocGroups.find(g => g.id === selectedDocGroup);
                        const newName = prompt("Sửa tên Đối tượng Hồ sơ:", current?.label);
                        if (newName && newName.trim()) {
                          const updated = customDocGroups.map(g => g.id === selectedDocGroup ? { ...g, label: newName.trim() } : g);
                          setCustomDocGroups(updated);
                          localStorage.setItem('admission_doc_groups', JSON.stringify(updated));
                        }
                      }}
                      className="w-10 h-10 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-600 flex items-center justify-center transition-all border border-amber-100 shadow-sm"
                      title="Sửa tên đối tượng"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        const current = customDocGroups.find(g => g.id === selectedDocGroup);
                        setConfirm({
                          msg: `Bạn có chắc chắn muốn xóa Đối tượng "${current?.label}" và toàn bộ hồ sơ đi kèm?`,
                          fn: () => {
                            const updated = customDocGroups.filter(g => g.id !== selectedDocGroup);
                            setCustomDocGroups(updated);
                            localStorage.setItem('admission_doc_groups', JSON.stringify(updated));
                            localStorage.removeItem(getDocStorageKey(selectedDocGroup));
                            setSelectedDocGroup("khoi_1");
                          }
                        });
                      }}
                      className="w-10 h-10 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-all border border-rose-100 shadow-sm"
                      title="Xóa đối tượng"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Association checkboxes */}
            <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="block text-[10px] font-bold tracking-wider uppercase text-slate-400 ml-1">
                  Áp dụng cho Đối tượng Tuyển sinh (từ Danh mục):
                </span>
                <button
                  onClick={() => {
                    localStorage.setItem('admission_doc_targets', JSON.stringify(docGroupTargets));
                    notify("Đã lưu cấu hình áp dụng đối tượng tuyển sinh thành công!");
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-emerald-100"
                >
                  <Check className="w-3.5 h-3.5" />
                  Lưu cấu hình áp dụng
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {configs.filter(c => c.categoryType === "DOI_TUONG_TS").map(c => {
                  const isChecked = (docGroupTargets[selectedDocGroup] || []).includes(c.name);
                  return (
                    <label key={c.id} className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-200/60 shadow-sm cursor-pointer hover:bg-indigo-50/20 hover:border-indigo-200 transition-all select-none">
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={(e) => {
                          const currentTargets = docGroupTargets[selectedDocGroup] || [];
                          let updated;
                          if (e.target.checked) {
                            updated = [...currentTargets, c.name];
                          } else {
                            updated = currentTargets.filter(name => name !== c.name);
                          }
                          const updatedMappings = { ...docGroupTargets, [selectedDocGroup]: updated };
                          setDocGroupTargets(updatedMappings);
                          localStorage.setItem('admission_doc_targets', JSON.stringify(updatedMappings));
                        }}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition-all cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-600">{c.name}</span>
                    </label>
                  );
                })}
                {configs.filter(c => c.categoryType === "DOI_TUONG_TS").length === 0 && (
                  <span className="text-xs text-slate-400 italic ml-1">Chưa có Đối tượng Tuyển sinh nào trong Danh mục</span>
                )}
              </div>
            </div>

            {/* Grade association checkboxes */}
            <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="block text-[10px] font-bold tracking-wider uppercase text-slate-400 ml-1">
                  Áp dụng cho Khối lớp học:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const updated = ["Khối 2", "Khối 3", "Khối 4", "Khối 5"];
                      const updatedMappings = { ...docGroupGrades, [selectedDocGroup]: updated };
                      setDocGroupGrades(updatedMappings);
                      localStorage.setItem('admission_doc_grades_mapping', JSON.stringify(updatedMappings));
                    }}
                    type="button"
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-[10px] font-black transition-all border border-indigo-100"
                  >
                    Chọn nhanh Khối 2,3,4,5
                  </button>
                  <button
                    onClick={() => {
                      localStorage.setItem('admission_doc_grades_mapping', JSON.stringify(docGroupGrades));
                      notify("Đã lưu cấu hình áp dụng khối lớp thành công!");
                    }}
                    type="button"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-emerald-100"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Lưu cấu hình Khối
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {["Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5", "Khối 6", "Khối 7", "Khối 8", "Khối 9", "Khối 10", "Khối 11", "Khối 12"].map(g => {
                  const isChecked = (docGroupGrades[selectedDocGroup] || []).includes(g);
                  return (
                    <label key={g} className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-200/60 shadow-sm cursor-pointer hover:bg-indigo-50/20 hover:border-indigo-200 transition-all select-none">
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={(e) => {
                          const currentGrades = docGroupGrades[selectedDocGroup] || [];
                          let updated;
                          if (e.target.checked) {
                            updated = [...currentGrades, g];
                          } else {
                            updated = currentGrades.filter(name => name !== g);
                          }
                          const updatedMappings = { ...docGroupGrades, [selectedDocGroup]: updated };
                          setDocGroupGrades(updatedMappings);
                          localStorage.setItem('admission_doc_grades_mapping', JSON.stringify(updatedMappings));
                        }}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition-all cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-600">{g}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {filteredDocList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
                  <Tag className="w-8 h-8 text-slate-300" />
                </div>
                <p className="font-bold text-slate-400">Chưa cấu hình hồ sơ nào cho đối tượng này</p>
                <p className="text-xs text-slate-300 mt-1 max-w-xs leading-normal">Hãy nhấp vào "Thêm hồ sơ mới" ở góc trên bên phải để bắt đầu thiết lập danh sách hồ sơ nhập học.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-inner">
                <table className="w-full border-collapse text-left text-sm text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 font-black text-slate-900 text-center w-16">TT</th>
                      <th className="px-6 py-4 font-black text-slate-900">Hồ sơ yêu cầu</th>
                      <th className="px-6 py-4 font-black text-slate-900 text-center w-36">Số lượng</th>
                      <th className="px-6 py-4 font-black text-slate-900 text-center w-48">Ghi chú</th>
                      <th className="px-6 py-4 font-black text-slate-900 text-center w-32">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredDocList.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3.5 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="px-6 py-3.5">
                          <div className="font-bold text-slate-800">{item.name}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.grades && item.grades.length > 0 && item.grades.map(g => (
                              <span key={g} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] font-black border border-emerald-100">{g}</span>
                            ))}
                            {item.targets && item.targets.length > 0 && item.targets.map(t => (
                              <span key={t} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black border border-indigo-100">{t}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-center font-bold text-slate-600">{item.qty || "—"}</td>
                        <td className="px-6 py-3.5 text-center text-xs italic text-slate-400 font-semibold">{item.note || "—"}</td>
                        <td className="px-6 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => {
                                setEditingDoc(item);
                                setDocFormName(item.name);
                                setDocFormQty(item.qty);
                                setDocFormNote(item.note);
                                setDocFormSelectedTargets(item.targets || []);
                                setDocFormSelectedGrades(item.grades || []);
                                setIsDocModalOpen(true);
                              }}
                              className="w-8 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-colors"
                              title="Sửa hồ sơ"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => {
                                setConfirm({
                                  msg: "Bạn có chắc chắn muốn xóa hồ sơ này không?",
                                  fn: () => {
                                    const updated = docList.filter(d => d.id !== item.id);
                                    setDocList(updated);
                                    localStorage.setItem(getDocStorageKey(selectedDocGroup), JSON.stringify(updated));
                                  }
                                });
                              }}
                              className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors"
                              title="Xóa hồ sơ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== DOCUMENT MODAL (FORM THÊM/SỬA HỒ SƠ) ===== */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">{editingDoc ? "Cập nhật Hồ sơ" : "Thêm Hồ sơ Mới"}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Đối tượng: {selectedDocGroup === "khoi_1" ? "Khối 1" : selectedDocGroup === "khoi_2_5" ? "Khối 2 đến 5" : selectedDocGroup === "khoi_6" ? "Khối 6" : selectedDocGroup === "khoi_7_9" ? "Khối 7 đến 9" : selectedDocGroup === "khoi_10" ? "Khối 10" : selectedDocGroup === "khoi_11_12" ? "Khối 11 đến 12" : "Đối tượng Tuyển sinh"}</p>
                </div>
              </div>
              <button onClick={() => setIsDocModalOpen(false)} className="w-8 h-8 rounded-lg bg-slate-200/50 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Tên Hồ sơ yêu cầu <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  value={docFormName} 
                  onChange={(e) => setDocFormName(e.target.value)} 
                  placeholder="Ví dụ: Đơn đăng ký nhập học" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all animate-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Số lượng</label>
                  <input 
                    type="text" 
                    value={docFormQty} 
                    onChange={(e) => setDocFormQty(e.target.value)} 
                    placeholder="Ví dụ: 01 bản" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all animate-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Ghi chú</label>
                  <input 
                    type="text" 
                    value={docFormNote} 
                    onChange={(e) => setDocFormNote(e.target.value)} 
                    placeholder="Ví dụ: Bản sao y" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all animate-none"
                  />
                </div>
              </div>
              <div className="pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Áp dụng cho Khối lớp học</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {["Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5", "Khối 6", "Khối 7", "Khối 8", "Khối 9", "Khối 10", "Khối 11", "Khối 12"].map(g => {
                    const isChecked = docFormSelectedGrades.includes(g);
                    return (
                      <label key={g} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 hover:bg-emerald-50/50 rounded-lg border border-slate-200 cursor-pointer select-none transition-colors">
                        <input type="checkbox" checked={isChecked} onChange={(e) => { if(e.target.checked) setDocFormSelectedGrades(p=>[...p,g]); else setDocFormSelectedGrades(p=>p.filter(x=>x!==g)); }} className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300" />
                        <span className="text-[11px] font-bold text-slate-600">{g}</span>
                      </label>
                    );
                  })}
                </div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Áp dụng cho Đối tượng Tuyển sinh</label>
                <div className="flex flex-wrap gap-2">
                  {configs.filter(c => c.categoryType === "DOI_TUONG_TS").map(c => {
                    const isChecked = docFormSelectedTargets.includes(c.name);
                    return (
                      <label key={c.id} className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-200 cursor-pointer select-none transition-colors">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDocFormSelectedTargets(p => [...p, c.name]);
                            } else {
                              setDocFormSelectedTargets(p => p.filter(x => x !== c.name));
                            }
                          }}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                        <span className="text-xs font-bold text-slate-600">{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsDocModalOpen(false)} 
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl text-xs font-black transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={() => {
                  if (!docFormName.trim()) {
                    notify("Vui lòng nhập tên hồ sơ!", "err");
                    return;
                  }
                  
                  let updated = [];
                  if (editingDoc) {
                    updated = docList.map(d => d.id === editingDoc.id ? { ...d, name: docFormName, qty: docFormQty, note: docFormNote, targets: docFormSelectedTargets, grades: docFormSelectedGrades } : d);
                  } else {
                    const newId = docList.length > 0 ? Math.max(...docList.map(d => d.id)) + 1 : 1;
                    updated = [...docList, { id: newId, name: docFormName, qty: docFormQty, note: docFormNote, targets: docFormSelectedTargets, grades: docFormSelectedGrades }];
                  }
                  
                  setDocList(updated);
                  localStorage.setItem(getDocStorageKey(selectedDocGroup), JSON.stringify(updated));
                  setIsDocModalOpen(false);
                }} 
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-colors shadow-lg shadow-indigo-100"
              >
                Lưu hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== OTHER TABS PLACEHOLDERS ===== */}
      {tab === "reports" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          
          {/* TOP SELECTORS BAR */}
          <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-slate-200/60 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="group">
              <label className="block text-xs font-bold tracking-widest uppercase mb-2 text-indigo-900/70 flex items-center gap-2 ml-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500"/> Kỳ Khảo sát
              </label>
              <div className="relative">
                <select 
                  value={reportPeriodId} 
                  onChange={e => {
                    setReportPeriodId(e.target.value);
                    setReportBatchId("all");
                    setReportStudentId("");
                  }}
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-5 pr-10 py-3.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 appearance-none font-semibold text-slate-700 shadow-sm transition-all group-hover:shadow-md cursor-pointer"
                >
                  {visiblePeriods.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                  {periods.length === 0 && <option value="">Không có kỳ KS nào</option>}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-indigo-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div className="group">
              <label className="block text-xs font-bold tracking-widest uppercase mb-2 text-indigo-900/70 flex items-center gap-2 ml-1">
                <Layers className="w-3.5 h-3.5 text-indigo-500"/> Đợt khảo sát
              </label>
              <div className="relative">
                <select 
                  value={reportBatchId} 
                  onChange={e => {
                    setReportBatchId(e.target.value);
                    setReportStudentId("");
                  }}
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-5 pr-10 py-3.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 appearance-none font-semibold text-slate-700 shadow-sm transition-all group-hover:shadow-md cursor-pointer"
                >
                  <option value="all">Tất cả các đợt</option>
                  {reportBatches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-indigo-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div className="group">
              <label className="block text-xs font-bold tracking-widest uppercase mb-2 text-indigo-900/70 flex items-center gap-2 ml-1">
                <Users className="w-3.5 h-3.5 text-indigo-500"/> Chọn Học sinh ({filteredReportStudents.length})
              </label>
              <div className="relative">
                <select 
                  value={reportStudentId} 
                  onChange={e => setReportStudentId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-5 pr-10 py-3.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 appearance-none font-semibold text-slate-700 shadow-sm transition-all group-hover:shadow-md cursor-pointer"
                >
                  {filteredReportStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.studentCode} - {s.fullName} {s.className ? `(${s.className})` : ""} {s.admissionResult ? `[✓ Đã duyệt: ${s.admissionResult}]` : "[⏳ Chưa duyệt]"}</option>
                  ))}
                  {filteredReportStudents.length === 0 && <option value="">Không có học sinh nào</option>}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-indigo-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>

          {/* STATS DASHBOARD BAR */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* KPI Cards Grid */}
            <div className="xl:col-span-4 grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between group hover:border-indigo-300 hover:shadow-md transition-all">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tổng Học sinh</span>
                <div className="flex items-baseline gap-2 mt-4">
                  <span className="text-3xl font-black text-slate-800">{overallKPIs.total}</span>
                  <span className="text-xs text-slate-400 font-bold">HS</span>
                </div>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col justify-between group hover:border-emerald-300 hover:shadow-md transition-all">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Đã xét duyệt</span>
                <div className="flex items-baseline gap-2 mt-4">
                  <span className="text-3xl font-black text-emerald-600">{overallKPIs.total - overallKPIs.pending}</span>
                  <span className="text-xs text-emerald-500 font-bold">({overallKPIs.approvedRate}%)</span>
                </div>
              </div>
              <div className="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Tổng Đạt</span>
                <div className="text-3xl font-black text-emerald-700 mt-4">{overallKPIs.passed}</div>
              </div>
              <div className="bg-amber-50/50 p-5 rounded-3xl border border-amber-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Đạt Cam kết</span>
                <div className="text-3xl font-black text-amber-700 mt-4">{overallKPIs.committed}</div>
              </div>
            </div>

            {/* Campus Breakdown Table Card */}
            <div className="xl:col-span-8 bg-white rounded-3xl border border-slate-200/60 shadow-sm p-6 overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-black text-slate-800 text-sm tracking-tight uppercase flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></span>
                  Số liệu phân theo Cơ sở tuyển sinh
                </h4>
                <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full uppercase">Chi tiết các cơ sở</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cơ sở</th>
                      <th className="pb-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng HS</th>
                      <th className="pb-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-500">Đạt</th>
                      <th className="pb-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest text-amber-500">Cam kết</th>
                      <th className="pb-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest text-rose-500">Không Đạt</th>
                      <th className="pb-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest text-slate-400">Chưa Duyệt</th>
                      <th className="pb-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Tỷ lệ duyệt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {campusStats.map(stat => {
                      const campusApprovedRate = stat.total > 0 ? Math.round(((stat.total - stat.pending) / stat.total) * 100) : 0;
                      return (
                        <tr key={stat.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 text-sm font-black text-slate-700">{stat.campusName}</td>
                          <td className="py-3 text-center font-bold text-slate-500 text-sm">{stat.total}</td>
                          <td className="py-3 text-center font-black text-emerald-600 text-sm">{stat.passed}</td>
                          <td className="py-3 text-center font-black text-amber-500 text-sm">{stat.committed}</td>
                          <td className="py-3 text-center font-black text-rose-500 text-sm">{stat.failed}</td>
                          <td className="py-3 text-center font-bold text-slate-400 text-sm">{stat.pending}</td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs font-black text-slate-600">{campusApprovedRate}%</span>
                              <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${campusApprovedRate}%` }}></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {campusStats.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-xs font-bold text-slate-400 uppercase">Không có dữ liệu cơ sở</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* MAIN CONTAINER */}
          {reportLoading ? (
            <div className="p-20 text-center">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4 opacity-50"/>
              <p className="font-bold text-slate-400">Đang tải kết quả...</p>
            </div>
          ) : !selectedReportStudent ? (
            <div className="bg-white border border-slate-200 rounded-[2rem] p-12 text-center text-slate-400">
              Chưa có dữ liệu học sinh trong kỳ/đợt khảo sát đã chọn.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* STUDENT BRIEF DETAIL CARD */}
              <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 self-start transition-all duration-300">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mt-10 -mr-10 mix-blend-multiply filter blur-2xl opacity-70"></div>
                  
                  <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
                    <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-3xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-100 mb-4">
                      {selectedReportStudent.fullName?.charAt(0)}
                    </div>
                    <h3 className="font-black text-slate-800 text-lg leading-snug">{selectedReportStudent.fullName}</h3>
                    <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-xs mt-2 border border-indigo-100/50">{selectedReportStudent.studentCode}</span>
                  </div>

                  <div className="py-5 border-t border-slate-100 mt-4 grid grid-cols-2 gap-x-3 gap-y-4 text-sm">
                    <div className="flex flex-col">
                      <span className="text-slate-400 font-black uppercase text-[9px] tracking-widest mb-0.5">Ngày sinh</span>
                      <span className="font-bold text-slate-800 text-[13px]">{selectedReportStudent.dateOfBirth ? new Date(selectedReportStudent.dateOfBirth).toLocaleDateString("vi-VN") : "—"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 font-black uppercase text-[9px] tracking-widest mb-0.5">Giới tính</span>
                      <span className="font-bold text-slate-800 text-[13px]">{selectedReportStudent.gender === "M" || selectedReportStudent.gender === "Nam" ? "Nam" : selectedReportStudent.gender === "F" || selectedReportStudent.gender === "Nữ" ? "Nữ" : selectedReportStudent.gender || "—"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 font-black uppercase text-[9px] tracking-widest mb-0.5">Khối học</span>
                      <span className="font-black text-slate-900 text-sm">K{selectedReportStudent.grade || "—"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 font-black uppercase text-[9px] tracking-widest mb-0.5">Đối tượng TS</span>
                      <span className="font-bold text-slate-800 text-[13px] truncate" title={selectedReportStudent.targetType}>{selectedReportStudent.targetType || "—"}</span>
                    </div>
                    
                    <div className="col-span-2 h-px bg-slate-100/50 my-0.5"></div>
                    
                    <div className="flex flex-col">
                      <span className="text-slate-400 font-black uppercase text-[9px] tracking-widest mb-0.5">Hệ Khảo sát</span>
                      <div>
                        <span className="font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100/70 text-[11px] inline-block">{selectedReportStudent.surveyFormType || "—"}</span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 font-black uppercase text-[9px] tracking-widest mb-0.5">Diện Khảo sát</span>
                      <span className="font-bold text-slate-700 text-[13px]">{selectedReportStudent.admissionCriteria || "—"}</span>
                    </div>

                    <div className="col-span-2 bg-slate-50 border border-slate-100 rounded-2xl p-3 space-y-2 mt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-black uppercase text-[9px] tracking-widest">Trạng thái duyệt</span>
                        {selectedReportStudent.admissionResult ? (
                          <span className="font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 text-[10px] flex items-center gap-1 shadow-sm shadow-emerald-100/50 animate-fade-in">
                            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                            {selectedReportStudent.admissionResult}
                          </span>
                        ) : (
                          <span className="font-black text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-[10px]">
                            Chưa duyệt
                          </span>
                        )}
                      </div>
                      {selectedReportStudent.signatureName && (
                        <div className="flex items-center justify-between border-t border-slate-200/50 pt-2 text-[12px]">
                          <span className="text-slate-400 font-bold">Người ký:</span>
                          <span className="font-bold text-slate-700">{selectedReportStudent.signatureName}</span>
                        </div>
                      )}
                      {selectedReportStudent.admissionCampus && (
                        <div className="flex items-center justify-between pt-0.5 text-[12px]">
                          <span className="text-slate-400 font-bold">Cơ sở:</span>
                          <span className="font-bold text-slate-700">{selectedReportStudent.admissionCampus}</span>
                        </div>
                      )}
                    </div>
                    {(selectedReportStudent.admissionResult === "Đạt" || selectedReportStudent.admissionResult === "Đạt cam kết") && (
                      <div className="space-y-2 mt-4 animate-fade-in">
                        <button
                          onClick={() => { setIsInvitation(false); setIsCommitment(false); setIsPrintModalOpen(true); }}
                          className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-100 transition-all flex justify-center items-center gap-2"
                        >
                          <GraduationCap className="w-4 h-4"/>
                          Xuất Thư Chúc mừng
                        </button>
                        {selectedReportStudent.admissionResult === "Đạt cam kết" && (
                          <button
                            onClick={() => { setIsInvitation(false); setIsCommitment(true); setIsPrintModalOpen(true); }}
                            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-amber-100 transition-all flex justify-center items-center gap-2"
                          >
                            <PenLine className="w-4 h-4"/>
                            Xuất Cam kết học tập
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ADMISSION DECISION FORM */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <h4 className="font-black text-slate-800 text-sm flex items-center justify-between border-b pb-3 mb-2">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500"/>
                      Xét duyệt Tuyển sinh
                    </span>
                    {selectedReportStudent.admissionResult ? (
                      <span className="px-2.5 py-1 text-[10px] font-black bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200 uppercase tracking-wider flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        Đã duyệt ({selectedReportStudent.admissionResult})
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-[10px] font-black bg-slate-100 text-slate-500 rounded-full border border-slate-200 uppercase tracking-wider">
                        Chưa duyệt
                      </span>
                    )}
                  </h4>
                  
                  {!canApprove && (
                    <div className="bg-rose-50 text-rose-600 p-3.5 rounded-2xl text-xs font-semibold border border-rose-100 flex items-center gap-2 animate-pulse mb-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0"/>
                      Bạn không có quyền xét duyệt kết quả cho cơ sở này.
                    </div>
                  )}

                  <Field label="Kết quả Xét tuyển">
                    <select 
                      value={reportForm.admissionResult} 
                      onChange={e => setReportForm(f => ({ ...f, admissionResult: e.target.value }))}
                      className={inp}
                      disabled={!canApprove}
                    >
                      <option value="">-- Chưa xét duyệt --</option>
                      <option value="Đạt">Đạt</option>
                      <option value="Không đạt">Không đạt</option>
                      <option value="Đạt cam kết">Đạt cam kết</option>
                    </select>
                  </Field>

                  {reportForm.admissionResult === "Đạt cam kết" && (
                    <Field label="Môn Cam Kết">
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 max-h-48 overflow-y-auto">
                        {initialSubjects.map(sub => {
                          const isChecked = reportForm.committedSubjects.includes(sub.name);
                          return (
                            <label key={sub.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:text-indigo-600 transition-colors">
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                disabled={!canApprove}
                                onChange={() => {
                                  setReportForm(f => {
                                    const next = isChecked 
                                      ? f.committedSubjects.filter(name => name !== sub.name)
                                      : [...f.committedSubjects, sub.name];
                                    return { ...f, committedSubjects: next };
                                  });
                                }}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                              />
                              {sub.name}
                            </label>
                          );
                        })}
                      </div>
                    </Field>
                  )}

                  {!(["GDCS", "GĐ_CS", "GIAO_VU_CS", "GĐCS"].includes((currentUser?.role || "").toUpperCase())) && (
                    <>
                      <Field label="Cơ sở nhập học">
                        <select 
                          value={reportForm.admissionCampus} 
                          onChange={e => setReportForm(f => ({ ...f, admissionCampus: e.target.value }))}
                          className={inp}
                          disabled={!canApprove}
                        >
                          <option value="">-- Chọn cơ sở --</option>
                          {campuses.map(c => (
                            <option key={c.id} value={c.campusName}>{c.campusName}</option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Người duyệt / Phê duyệt">
                        {selectedReportStudent.admissionResult ? (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-700 flex items-center gap-2.5 shadow-sm select-none transition-all">
                            <UserCheck className="w-4 h-4 text-indigo-500" />
                            {reportForm.signatureName || selectedReportStudent.signatureName || autoCampusDirectorName || "Hệ thống ghi nhận"}
                          </div>
                        ) : (
                          <select 
                            value={reportForm.signatureName}
                            onChange={e => setReportForm(f => ({ ...f, signatureName: e.target.value }))}
                            className={inp}
                            disabled={!canApprove}
                          >
                            <option value="">-- Chọn người phê duyệt --</option>
                            {gdcsUsers.map(u => (
                              <option key={u.id} value={u.fullName || u.email}>{u.fullName || u.email}</option>
                            ))}
                          </select>
                        )}
                      </Field>
                    </>
                  )}

                  <Field label="Ý kiến / Ghi chú Hội đồng">
                    <textarea 
                      value={reportForm.directorNote}
                      onChange={e => setReportForm(f => ({ ...f, directorNote: e.target.value }))}
                      className={`${inp} h-24 resize-none`}
                      placeholder="Nhập ý kiến hoặc lý do..."
                      disabled={!canApprove}
                    />
                  </Field>

                  <button
                    onClick={handleSaveReportResult}
                    disabled={saveReportLoading || !canApprove}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-100 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                  >
                    {saveReportLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
                    Lưu kết quả tổng hợp
                  </button>
                </div>
              </div>

              {/* SUBJECTS RESULTS DISPLAY */}
              <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-800 text-base flex items-center gap-2"><BookOpen className="w-5 h-5 text-indigo-500"/> Kết quả khảo sát các môn</h3>
                  <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold">{(selectedReportStudent.scores || []).length} Môn đã chấm</span>
                </div>

                {(!selectedReportStudent.scores || selectedReportStudent.scores.length === 0) ? (
                  <div className="bg-slate-50 border-2 border-dashed rounded-3xl p-12 text-center text-slate-400">
                    Học sinh này chưa có kết quả đánh giá môn học nào.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* PREMIUM QUICK SCORE DASHBOARD MATRIX */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {(selectedReportStudent.scores || []).map((sc: any) => {
                        const subject = sc.subject || {};
                        const sName = subject.name || "Môn học";
                        const sCode = (subject.code || "").toLowerCase();
                        let val = "—";
                        let rawScore = ""; // To hold psychology numeric score
                        try {
                          if (sc.scores) {
                            const parsed = JSON.parse(sc.scores);
                            const vArr = Array.isArray(parsed) ? parsed : [parsed];
                            if (sCode.includes("tly")) {
                               const scNum = parseFloat(vArr[6] || vArr[20] || "0");
                               rawScore = scNum.toString();
                               let lvl = "Bình thường";
                               if (scNum > 15 && scNum <= 31) lvl = "Dấu hiệu nhẹ";
                               else if (scNum > 31 && scNum <= 47) lvl = "Dấu hiệu vừa";
                               else if (scNum > 47 && scNum <= 63) lvl = "Nguy cơ cao";
                               else if (scNum > 63) lvl = "Nguy cơ rất cao";
                               val = lvl; // Show derived conclusion directly
                            }
                            else if (sCode.includes("tci") || sCode.includes("cpt")) val = vArr.filter(x => x === "3").length + " Đ";
                            else if (sCode.includes("nltd")) val = vArr[4] ? vArr[4] + "%" : "—";
                            else val = vArr.find(x => x !== undefined && x !== "" && x !== null) || "—";
                          }
                        } catch { val = sc.scores || "—"; }

                        return (
                          <div key={sc.id} className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-3 shadow-lg shadow-indigo-100 border border-white/10 relative overflow-hidden group hover:-translate-y-0.5 transition-all duration-300">
                            <div className="absolute -right-2 -top-2 w-12 h-12 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-colors"></div>
                            <div className="text-[8px] font-black text-white/70 uppercase tracking-widest truncate mb-1.5 flex items-center gap-1">
                              <div className="w-1 h-1 bg-white rounded-full opacity-70"></div>
                              {sName}
                            </div>
                            <div className={`drop-shadow-sm flex items-baseline gap-1.5 font-black text-white ${sCode.includes("tly") ? "text-[13px] mt-0.5 leading-tight tracking-tight" : "text-xl"}`}>
                              {val}
                              {sCode.includes("tly") ? (
                                 <span className="text-[9px] opacity-80 font-bold bg-black/20 backdrop-blur-sm px-1.5 py-0.5 rounded-lg shrink-0">
                                   {rawScore}đ
                                 </span>
                              ) : (
                                 <span className="text-[8px] opacity-60 font-medium tracking-normal">đ</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-4">                    {selectedReportStudent.scores.map((sc: any) => {
                      const subject = sc.subject || {};
                      const subName = (subject.name || "").toLowerCase();
                      const subCode = (subject.code || "").toLowerCase();
                      const subNameNormalized = subName.normalize("NFC");
                      const isPsych = subName.includes("tâm lý") || subCode.includes("tly");
                      const isChildDev = subNameNormalized.includes("chuẩn phát triển") || subNameNormalized.includes("bộ chuẩn phát triển") || subCode.includes("cpt") || subCode.includes("tci");
                      const isThinkingSkills = subNameNormalized.includes("năng lực tư duy") || subCode.includes("nltd");

                      let scoreVals = [];
                      let commentVals = [];
                      try { if (sc.scores) { const parsed = JSON.parse(sc.scores); scoreVals = Array.isArray(parsed) ? parsed : [parsed]; } } catch { scoreVals = [sc.scores]; }
                      try { if (sc.comments) { const parsed = JSON.parse(sc.comments); commentVals = Array.isArray(parsed) ? parsed : [parsed]; } } catch { commentVals = [sc.comments]; }

                      let parsedCols = { scores: [], comments: [] };
                      try { if (subject.columnNames) { const parsed = JSON.parse(subject.columnNames); parsedCols = { scores: Array.isArray(parsed.scores) ? parsed.scores : [], comments: Array.isArray(parsed.comments) ? parsed.comments : [] }; } } catch {}

                      return (
                        <div key={sc.id} className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow">
                          
                          {/* Card Header */}
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-slate-800 text-lg">{subject.name}</h4>
                                {subject.code && <span className="font-mono text-xs font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded">{subject.code}</span>}
                                {subject.subjectType && (
                                  <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100/50">
                                    {subject.subjectType === "VIET_NAM" ? "GV VN" : "GV NN"}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 font-semibold mt-1">Giáo viên chấm: <span className="text-slate-600 font-bold">{sc.teacherName || "—"}</span> | Cập nhật: {new Date(sc.updatedAt).toLocaleDateString("vi-VN")}</p>
                            </div>
                          </div>

                          {/* Card Content depending on Subject Type */}
                          {isPsych ? (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4">
                                <div>
                                  <span className="text-xs font-black uppercase tracking-widest text-indigo-500">Tổng điểm đánh giá</span>
                                  <div className="text-2xl font-black text-indigo-700 mt-1">{scoreVals[6] || scoreVals[20] || "0"} Điểm</div>
                                </div>
                                {(() => {
                                  const score = parseFloat(scoreVals[6] || scoreVals[20] || "0");
                                  let level = "Bình thường"; let color = "text-emerald-700 bg-emerald-50 border-emerald-200";
                                  if (score > 15 && score <= 31) { level = "Dấu hiệu nhẹ"; color = "text-blue-700 bg-blue-50 border-blue-200"; }
                                  else if (score > 31 && score <= 47) { level = "Dấu hiệu vừa"; color = "text-amber-700 bg-amber-50 border-amber-200"; }
                                  else if (score > 47 && score <= 63) { level = "Nguy cơ cao"; color = "text-orange-700 bg-orange-50 border-orange-200"; }
                                  else if (score > 63) { level = "Nguy cơ rất cao"; color = "text-red-700 bg-red-50 border-red-200"; }
                                  return (
                                    <div className={`px-4 py-2 rounded-xl border font-black text-xs uppercase tracking-wider shadow-sm ${color}`}>
                                      {level}
                                    </div>
                                  );
                                })()}
                              </div>
                              <div className="space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                                  Kết luận sơ bộ
                                </span>
                                <p className={`text-sm font-medium leading-relaxed whitespace-pre-wrap ${commentVals[0] ? "text-slate-700" : "text-slate-400 italic"}`}>
                                  {commentVals[0] || "Chưa cập nhật nội dung nhận định chi tiết."}
                                </p>
                              </div>
                              {commentVals[1] && (
                                <div className="space-y-1 bg-amber-50/30 p-4 rounded-2xl border border-amber-100/50">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Khuyến nghị dành cho phụ huynh</span>
                                  <p className="text-sm font-medium text-amber-800 leading-relaxed whitespace-pre-wrap">{commentVals[1]}</p>
                                </div>
                              )}
                            </div>
                          ) : isChildDev ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-3 gap-3">
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                                  <div className="text-xs font-black uppercase tracking-wider text-emerald-600">Đạt</div>
                                  <div className="text-xl font-black text-emerald-700 mt-1">{(Array.isArray(scoreVals) ? scoreVals : []).filter(v => v === "3").length}</div>
                                </div>
                                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-center">
                                  <div className="text-xs font-black uppercase tracking-wider text-rose-600">Không đạt</div>
                                  <div className="text-xl font-black text-rose-700 mt-1">{(Array.isArray(scoreVals) ? scoreVals : []).filter(v => v === "2").length}</div>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                                  <div className="text-xs font-black uppercase tracking-wider text-slate-500">Không làm</div>
                                  <div className="text-xl font-black text-slate-600 mt-1">{(Array.isArray(scoreVals) ? scoreVals : []).filter(v => v === "1").length}</div>
                                </div>
                              </div>
                              {commentVals[0] && (
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">
                                  <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 not-italic mb-1">Nhận xét chung</span>
                                  "${commentVals[0]}"
                                </div>
                              )}
                            </div>
                          ) : isThinkingSkills ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-slate-50 border rounded-xl p-3 text-center">
                                  <div className="text-[10px] font-black uppercase text-slate-400">Logic</div>
                                  <div className="text-base font-black text-slate-700 mt-1">{scoreVals[0] || "—"}</div>
                                </div>
                                <div className="bg-slate-50 border rounded-xl p-3 text-center">
                                  <div className="text-[10px] font-black uppercase text-slate-400">Lập tưởng</div>
                                  <div className="text-base font-black text-slate-700 mt-1">{scoreVals[1] || "—"}</div>
                                </div>
                                <div className="bg-slate-50 border rounded-xl p-3 text-center">
                                  <div className="text-[10px] font-black uppercase text-slate-400">Phản biện</div>
                                  <div className="text-base font-black text-slate-700 mt-1">{scoreVals[2] || "—"}</div>
                                </div>
                                <div className="bg-slate-50 border rounded-xl p-3 text-center">
                                  <div className="text-[10px] font-black uppercase text-slate-400">GQ Vấn đề</div>
                                  <div className="text-base font-black text-slate-700 mt-1">{scoreVals[3] || "—"}</div>
                                </div>
                              </div>
                              <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-center font-bold text-sky-700 text-xs">
                                Hoàn thành Thử thách: {scoreVals[4] || "0"}%
                              </div>
                              {commentVals[0] && (
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">
                                  <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 not-italic mb-1">Nhận xét chung</span>
                                  "${commentVals[0]}"
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Display standard scores columns */}
                              <div className="flex flex-wrap gap-4">
                                {Array.from({length: (subject.scoreColumns ?? 1)}).map((_, colIdx) => {
                                  let colName = "Điểm " + (colIdx + 1);
                                  if (parsedCols.scores && parsedCols.scores[colIdx]) colName = parsedCols.scores[colIdx];
                                  const isTotal = colName.toLowerCase().includes("tổng");
                                  const val = scoreVals[colIdx];
                                  
                                  return (
                                    <div key={colIdx} className="bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3 flex-1 min-w-[100px] text-center shadow-sm">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{colName}</span>
                                      <div className={`text-lg font-black mt-1 ${isTotal ? "text-indigo-600" : "text-slate-700"}`}>
                                        {val !== undefined && val !== "" ? val : "—"}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Display standard comments columns */}
                              {commentVals.length > 0 && commentVals.some(v => v) && (
                                <div className="space-y-2">
                                  {Array.from({length: (subject.commentColumns ?? 1)}).map((_, colIdx) => {
                                    let colName = "Nhận xét " + (colIdx + 1);
                                    if (parsedCols.comments && parsedCols.comments[colIdx]) colName = parsedCols.comments[colIdx];
                                    const val = commentVals[colIdx];
                                    if (!val) return null;

                                    return (
                                      <div key={colIdx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">
                                        <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 not-italic mb-1">{colName}</span>
                                        "${val}"
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

      </div>

      {/* ============= MODALS ============= */}

      <Modal open={isSubjectOpen} onClose={()=>setIsSubjectOpen(false)} title="Thông tin Môn Khảo sát" footer={<><button onClick={()=>setIsSubjectOpen(false)} className="flex-1 py-3 text-xs font-black uppercase text-slate-400">Hủy</button> <button onClick={handleSubjectSubmit} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100">Hoàn tất</button></>}>
        <div className="space-y-4">
           <Field label="Mã Môn" required><input value={subjectForm.code} onChange={e=>setSubjectForm(f=>({...f,code:e.target.value.toUpperCase()}))} className={inp}/></Field>
           <Field label="Tên Môn" required><input value={subjectForm.name} onChange={e=>setSubjectForm(f=>({...f,name:e.target.value}))} className={inp}/></Field>
           <Field label="Phân loại (Anh văn)"><select value={subjectForm.subjectType} onChange={e=>setSubjectForm(f=>({...f,subjectType:e.target.value}))} className={inp}><option value="">-- Môn bình thường --</option><option value="VIET_NAM">Tiếng Anh (GV VN)</option><option value="NUOC_NGOAI">Tiếng Anh (GV Nước ngoài)</option></select></Field>
           <div className="grid grid-cols-2 gap-3"><Field label="Số cột Điểm"><input type="number" min="0" max="5" value={subjectForm.scoreColumns} onChange={e=>setSubjectForm(f=>({...f,scoreColumns:parseInt(e.target.value)||0}))} className={inp}/></Field><Field label="Số cột Nhận xét"><input type="number" min="0" max="5" value={subjectForm.commentColumns} onChange={e=>setSubjectForm(f=>({...f,commentColumns:parseInt(e.target.value)||0}))} className={inp}/></Field></div>
           <Field label="Trạng thái"><select value={subjectForm.status} onChange={e=>setSubjectForm(f=>({...f,status:e.target.value}))} className={inp}><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Ngừng</option></select></Field>
           <Field label="Miễn giảm theo Diện KS">
             <div className="flex flex-wrap gap-2 p-3 bg-violet-50/50 rounded-xl border border-violet-100">
               {configs.filter(c => c.categoryType === "DIEN_KS").map(c => (
                 <button type="button" key={c.code} onClick={() => setSubjectForm(f => ({...f, exemptCriteria: f.exemptCriteria.includes(c.name) ? f.exemptCriteria.filter(x => x !== c.name) : [...f.exemptCriteria, c.name]}))}
                   className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition-all ${subjectForm.exemptCriteria.includes(c.name) ? 'bg-violet-500 text-white border-violet-500 shadow-md shadow-violet-200' : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'}`}
                 >{subjectForm.exemptCriteria.includes(c.name) && <span className="mr-1">✓</span>}{c.name}</button>
               ))}
               {configs.filter(c => c.categoryType === "DIEN_KS").length === 0 && <span className="text-xs text-slate-400">Chưa có Diện KS nào trong Danh mục</span>}
             </div>
             <p className="text-[10px] text-slate-400 mt-1">Chọn các Diện KS được miễn giảm môn này</p>
           </Field>
        </div>
      </Modal>

      <Modal open={isColumnConfigOpen} onClose={()=>setIsColumnConfigOpen(false)} title={`Cấu hình cột: ${columnConfigForm.name}`} footer={<><button onClick={()=>setIsColumnConfigOpen(false)} className="flex-1 py-3 text-xs font-black uppercase text-slate-400">Hủy</button> <button onClick={handleColumnConfigSubmit} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100">Lưu cấu hình</button></>}>
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
           <div>
              <h4 className="text-sm font-black text-slate-700 mb-3 border-b pb-2">Tên cột Điểm (Tối đa {columnConfigForm.scoreColumns})</h4>
              <div className="space-y-3">
                 {Array.from({length: columnConfigForm.scoreColumns}).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 w-16">Cột {i+1}</span>
                       <input value={columnConfigForm.scoreNames[i]||""} onChange={e=>{const n=[...columnConfigForm.scoreNames];n[i]=e.target.value;setColumnConfigForm(f=>({...f,scoreNames:n}))}} placeholder="Vd: Điểm viết" className={inp}/>
                       <label className="flex items-center gap-1 text-[10px] font-black text-indigo-600 whitespace-nowrap"><input type="checkbox" checked={columnConfigForm.showScoreInReport[i]||false} onChange={e=>{const r=[...columnConfigForm.showScoreInReport];r[i]=e.target.checked;setColumnConfigForm(f=>({...f,showScoreInReport:r}))}} className="rounded text-indigo-600"/> Lên Phiếu</label>
                    </div>
                 ))}
              </div>
           </div>
           <div>
              <h4 className="text-sm font-black text-slate-700 mb-3 border-b pb-2">Tên cột Nhận xét (Tối đa {columnConfigForm.commentColumns})</h4>
              <div className="space-y-3">
                 {Array.from({length: columnConfigForm.commentColumns}).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 w-16">NX {i+1}</span>
                       <input value={columnConfigForm.commentNames[i]||""} onChange={e=>{const n=[...columnConfigForm.commentNames];n[i]=e.target.value;setColumnConfigForm(f=>({...f,commentNames:n}))}} placeholder="Vd: Nhận xét chung" className={inp}/>
                       <label className="flex items-center gap-1 text-[10px] font-black text-indigo-600 whitespace-nowrap"><input type="checkbox" checked={columnConfigForm.showCommentInReport[i]||false} onChange={e=>{const r=[...columnConfigForm.showCommentInReport];r[i]=e.target.checked;setColumnConfigForm(f=>({...f,showCommentInReport:r}))}} className="rounded text-indigo-600"/> Lên Phiếu</label>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </Modal>

      <Modal open={pModal} onClose={()=>setPModal(false)} title="Thông tin Kỳ khảo sát" footer={<><button onClick={()=>setPModal(false)} className="flex-1 py-3 font-black text-xs uppercase tracking-widest text-slate-500 hover:text-slate-700">Hủy</button> <button onClick={savePeriod} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200">Lưu thông tin</button></>}>
        <div className="space-y-4">
           <Field label="Mã định danh" required><input value={pForm.code} onChange={e=>setPForm(f=>({...f,code:e.target.value.toUpperCase()}))} className={inp}/></Field>
           <Field label="Kỳ Khảo sát" required>
             <select
               value={pForm.name}
               onChange={e => {
                 const sel = configs.find(c => c.categoryType === "KY_KS" && c.name === e.target.value)
                 setPForm(f => ({ ...f, name: e.target.value, code: sel ? sel.code : f.code }))
               }}
               className={inp}
             >
               <option value="">-- Chọn loại kỳ khảo sát --</option>
               {configs.filter(c => c.categoryType === "KY_KS").map(c => (
                 <option key={c.id} value={c.name}>{c.name}</option>
               ))}
             </select>
           </Field>
           <div className="grid grid-cols-2 gap-3"><Field label="Ngày bắt đầu"><input type="date" value={pForm.startDate} onChange={e=>setPForm(f=>({...f,startDate:e.target.value}))} className={inp}/></Field><Field label="Ngày kết thúc"><input type="date" value={pForm.endDate} onChange={e=>setPForm(f=>({...f,endDate:e.target.value}))} className={inp}/></Field></div>
           <Field label="Người phụ trách">
                <select value={pForm.assignedUserId} onChange={e=>setPForm(f=>({...f,assignedUserId:e.target.value}))} className={inp}>
                   <option value="">-- Chưa gán --</option>
                   {examBoardUsers.map(u=><option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select>
             </Field>
         </div>
      </Modal>

      <Modal open={bModal} onClose={()=>setBModal(false)} title="Thông tin Đợt khảo sát" size="md" footer={<><button onClick={()=>setBModal(false)} className="flex-1 py-3 text-xs font-black uppercase text-slate-400">Hủy</button> <button onClick={saveBatch} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-50">Hoàn tất</button></>}>
        <div className="space-y-4">
           <div className="grid grid-cols-2 gap-3"><Field label="Số đợt"><input type="number" value={bForm.batchNumber} onChange={e=>setBForm(f=>({...f,batchNumber:e.target.value}))} className={inp}/></Field><Field label="Trạng thái"><select value={bForm.status} onChange={e=>setBForm(f=>({...f,status:e.target.value}))} className={inp}>{STATUS_OPTS.map(o=><option key={o} value={o}>{STATUS_MAP[o].label}</option>)}</select></Field></div>
           <Field label="Tên đợt" required>
             <input value={bForm.name} onChange={e=>setBForm(f=>({...f,name:e.target.value}))} placeholder="Vd: Khảo sát lẻ, Đánh giá Năng lực" className={inp}/>
             <div className="mt-1.5 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
               <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Hiển thị khoa học & Xét duyệt:</p>
               <p className="text-xs font-bold text-indigo-600 truncate">
                 {`Đợt ${bForm.batchNumber || "1"} - ${bForm.name || "Khảo sát đầu vào"} | ${campuses.find(c => c.id === bForm.campusId)?.campusName || "Chưa chọn cơ sở"} (${bForm.startDate ? bForm.startDate.split('-').reverse().join('/') : "__/__/____"} ~ ${bForm.endDate ? bForm.endDate.split('-').reverse().join('/') : "__/__/____"})`}
               </p>
             </div>
           </Field>
           <div className="grid grid-cols-2 gap-3">
             <Field label="Cơ sở">
               <select value={bForm.campusId} onChange={e=>setBForm(f=>({...f,campusId:e.target.value}))} className={inp}>
                 <option value="">-- Chọn Cơ sở --</option>
                 {campuses.map(c => (
                   <option key={c.id} value={c.id}>{c.campusName}</option>
                 ))}
               </select>
             </Field>
             <Field label="Người phụ trách">
               <select value={bForm.assignedUserId} onChange={e=>setBForm(f=>({...f,assignedUserId:e.target.value}))} className={inp}>
                 <option value="">-- Chưa gán --</option>
                 {giaoVuCSUsers.map(u => (
                   <option key={u.id} value={u.id}>{u.fullName}</option>
                 ))}
               </select>
             </Field>
           </div>
           <div className="grid grid-cols-2 gap-3"><Field label="Từ ngày"><input type="date" value={bForm.startDate} onChange={e=>setBForm(f=>({...f,startDate:e.target.value}))} className={inp}/></Field><Field label="Đến ngày"><input type="date" value={bForm.endDate} onChange={e=>setBForm(f=>({...f,endDate:e.target.value}))} className={inp}/></Field></div>
        </div>
      </Modal>

      <Modal open={sModal} onClose={()=>setSModal(false)} title="Thông tin Học sinh" size="lg" footer={<><button onClick={()=>setSModal(false)} className="flex-1 text-xs font-black uppercase text-slate-400">Đóng</button> <button onClick={saveStudent} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-50">Lưu dữ liệu</button></>}>
        <div className="space-y-4 pt-1">
           <div className="grid grid-cols-2 gap-4">
              <Field label="Mã HS KS" required><input value={sForm.studentCode} onChange={e=>setSForm(f=>({...f,studentCode:e.target.value}))} className={inp} disabled={!!editS}/></Field>
              <Field label="Ngày sinh"><input type="date" value={sForm.dateOfBirth} onChange={e=>setSForm(f=>({...f,dateOfBirth:e.target.value}))} className={inp}/></Field>
           </div>
           <Field label="Họ và Tên" required><input value={sForm.fullName} onChange={e=>setSForm(f=>({...f,fullName:e.target.value}))} className={inp}/></Field>
            
            <div className="grid grid-cols-3 gap-4">
               <Field label="Giới tính"><select value={sForm.gender} onChange={e=>setSForm(f=>({...f,gender:e.target.value}))} className={inp}><option value="">--</option><option value="Nam">Nam</option><option value="Nữ">Nữ</option></select></Field>
               <Field label="Khối"><select value={sForm.grade} onChange={e=>setSForm(f=>({...f,grade:e.target.value}))} className={inp}><option value="">--</option>{grades.map(g=><option key={g} value={g}>{g}</option>)}</select></Field>
               <Field label="Học kỳ / Năm TS">
                 <select value={sForm.hocKy} onChange={e=>setSForm(f=>({...f,hocKy:e.target.value}))} className={inp}>
                   <option value="">--</option>
                   {configs.filter(c => c.categoryType === "HOC_KY").map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                 </select>
               </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <Field label="Hồ sơ/Bảng điểm">
                 <select value={sForm.hoSoCtQuocTe} onChange={e=>setSForm(f=>({...f,hoSoCtQuocTe:e.target.value}))} className={inp}>
                   <option value="">--</option>
                   {configs.filter(c => c.categoryType === "HS_HT_HOC_SINH").map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                 </select>
               </Field>
               <Field label="Đợt khảo sát">
                 <select value={sForm.batchId} onChange={e=>setSForm(f=>({...f,batchId:e.target.value}))} className={inp}>
                   <option value="">-- Không có / Mặc định --</option>
                   {selPeriod?.batches?.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                 </select>
               </Field>
            </div>

           <div className="grid grid-cols-3 gap-4">
               <Field label="Đối tượng Tuyển sinh">
                 <div className="flex items-center gap-1.5">
                   <select value={sForm.targetType} onChange={e=>setSForm(f=>({...f,targetType:e.target.value}))} className={inp + " flex-1 min-w-[120px]"}>
                     <option value="">--</option>
                     {configs.filter(c => c.categoryType === "DOI_TUONG_TS").map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                   </select>
                   <button 
                     type="button"
                     onClick={() => openAddConfig("DOI_TUONG_TS")}
                     className="w-10 h-10 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-all border border-indigo-100 shadow-sm shrink-0"
                     title="Thêm đối tượng mới"
                   >
                     <Plus className="w-4 h-4" />
                   </button>
                   {sForm.targetType && (
                     <>
                       <button 
                         type="button"
                         onClick={() => {
                           const current = configs.find(c => c.categoryType === "DOI_TUONG_TS" && c.name === sForm.targetType);
                           if (current) openEditConfig(current);
                         }}
                         className="w-10 h-10 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-600 flex items-center justify-center transition-all border border-amber-100 shadow-sm shrink-0"
                         title="Sửa tên đối tượng"
                       >
                         <Pencil className="w-3.5 h-3.5" />
                       </button>
                       <button 
                         type="button"
                         onClick={() => {
                           const current = configs.find(c => c.categoryType === "DOI_TUONG_TS" && c.name === sForm.targetType);
                           if (current) {
                             setConfirm({
                               msg: `Bạn có chắc chắn muốn xóa Đối tượng Tuyển sinh "${current.name}"?`,
                               fn: () => {
                                 doDeleteConfig(current.id);
                                 setSForm(f => ({ ...f, targetType: "" }));
                               }
                             });
                           }
                         }}
                         className="w-10 h-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-all border border-rose-100 shadow-sm shrink-0"
                         title="Xóa đối tượng"
                       >
                         <Trash2 className="w-3.5 h-3.5" />
                       </button>
                     </>
                   )}
                 </div>
               </Field>
               <Field label="Diện Khảo sát">
                <select value={sForm.admissionCriteria} onChange={e=>setSForm(f=>({...f,admissionCriteria:e.target.value}))} className={inp}>
                  <option value="">--</option>
                  {configs.filter(c => c.categoryType === "DIEN_KS").map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Hình thức KS">
                <select value={sForm.surveySystem} onChange={e=>setSForm(f=>({...f,surveySystem:e.target.value}))} className={inp}>
                  <option value="">--</option>
                  {configs.filter(c => c.categoryType === "HINH_THUC_KS").map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </Field>
           </div>

           <div className="grid grid-cols-3 gap-4">
                <Field label="Kết quả Học tập">
                  <select value={sForm.kqHocTap} onChange={e=>setSForm(f=>({...f,kqHocTap:e.target.value}))} className={inp}>
                    <option value="">--</option>
                    {configs.filter(c => c.categoryType === "KQ_HOC_TAP").map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Kết quả Rèn luyện">
                  <select value={sForm.kqRenLuyen} onChange={e=>setSForm(f=>({...f,kqRenLuyen:e.target.value}))} className={inp}>
                    <option value="">--</option>
                    {configs.filter(c => c.categoryType === "KQ_REN_LUYEN").map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Hệ Khảo sát">
                  <select value={sForm.surveyFormType} onChange={e=>setSForm(f=>({...f,surveyFormType:e.target.value}))} className={inp}>
                    <option value="">--</option>
                    {eduSystems.map(es => <option key={es.code} value={es.name}>{es.name}</option>)}
                  </select>
                </Field>
             </div>
        </div>
      </Modal>

      <Modal open={cModal} onClose={()=>setCModal(false)} title="Giá trị Danh mục" size="sm" footer={<><button onClick={()=>setCModal(false)} className="flex-1 text-xs font-black uppercase text-slate-400">Hủy</button> <button onClick={saveConfig} className="flex-1 py-4 bg-amber-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest">Lưu</button></>}>
        <div className="space-y-4">
           <Field label="Loại"><input value={cForm.categoryType} disabled className={inp}/></Field>
           <Field label="Mã (Code)"><input value={cForm.code} onChange={e=>setCForm(f=>({...f,code:e.target.value.toUpperCase()}))} className={inp}/></Field>
           <Field label="Tên hiển thị"><input value={cForm.name} onChange={e=>setCForm(f=>({...f,name:e.target.value}))} className={inp}/></Field>
        </div>
      </Modal>

      {/* PRINT MODAL */}
      {isPrintModalOpen && selectedReportStudent && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto no-print-backdrop">
<style>{`
            /* FORCE EXPLICIT A4 PORTRAIT CONFIGURATION */
            @page { 
              size: A4 portrait !important; 
              margin: 12mm 15mm !important; 
            }
            
            @media print {
              @page {
                size: A4 portrait !important;
                margin: 12mm 15mm !important;
              }
              /* USER MANDATED HTML/BODY RESET WITH ZERO FIXED HEIGHTS & FIT TO PRINT BOUNDS */
              html, body {
                width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                font-family: "Times New Roman", serif !important;
                background: white !important;
                overflow: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              
              /* 1. DISABLE ALL ANIMATIONS THAT CAUSE RENDER-FREEZE GLITCHES */
              *, *::before, *::after {
                animation: none !important;
                transition: none !important;
                animation-duration: 0s !important;
                transition-duration: 0s !important;
                box-sizing: border-box !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              body * {
                visibility: hidden !important;
              }
              /* 2. TELEPORT TO TOP TO ENSURE ZERO-OFFSET ANCHORING */
              .no-print-backdrop {
                visibility: visible !important;
                opacity: 1 !important;
                transform: none !important;
                overflow: visible !important;
                max-height: none !important;
                max-width: none !important;
                box-shadow: none !important;
                border: none !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                display: block !important;
                margin: 0 !important;
                padding: 0 !important;
                z-index: 999999999 !important;
                background: transparent !important;
                backdrop-filter: none !important;
              }
              .no-print-backdrop > div {
                visibility: visible !important;
                opacity: 1 !important;
                transform: none !important;
                overflow: visible !important;
                max-height: none !important;
                max-width: none !important;
                box-shadow: none !important;
                border: none !important;
                position: relative !important;
                display: block !important;
                margin: 0 !important;
                padding: 0 !important;
                background: transparent !important;
              }
              /* Ensure descendants that ARE NOT manually excluded also become visible */
              #print-main-container, #print-main-container * {
                visibility: visible !important;
              }
              /* 4. HIDE THE HEADER CONTROLS MANUALLY */
              .no-print-backdrop .no-print, .no-print-backdrop .no-print * {
                display: none !important;
                visibility: hidden !important;
              }
              /* 4.5 UNCLOG WRAPPER ELEMENT HIERARCHIES */
              #print-modal-inner-wrapper {
                display: block !important;
                width: 100% !important;
                max-width: none !important;
                height: auto !important;
                max-height: none !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
                transform: none !important;
                animation: none !important;
                box-shadow: none !important;
                border: none !important;
                background: transparent !important;
              }
              #print-body-scroll-wrapper {
                display: block !important;
                width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                max-height: none !important;
                height: auto !important;
                overflow: visible !important;
                background: transparent !important;
                box-shadow: none !important;
              }
              /* 5. RESTORE SEQUENTIAL FLOW: STACK MULTIPLE PAGES VERTICALLY WITHOUT OVERLAP */
              #print-main-container {
                position: relative !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: stretch !important;
                width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                gap: 0 !important;
                z-index: 999999999 !important;
                background: white !important;
                transform: none !important;
              }
              /* USER MANDATED FLEX CONTAINER WITHOUT ANY HEIGHTS */
              .print-page, #print-letter-area {
                width: 180mm !important; /* 210mm - (15mm * 2) = 180mm content width */
                margin: 0 auto !important;
                height: auto !important;
                min-height: 0 !important;
                max-height: none !important;
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important; /* Handled by @page margins */
                overflow: visible !important;
                box-sizing: border-box !important;
                
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-start !important;
                
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                page-break-after: avoid !important; /* USER MANDATE: page-break-after: avoid */
                break-after: avoid !important;
                position: relative !important;
                background: white !important;
              }
              /* USER MANDATED CONTENT TYPOGRAPHY RULES */
              .print-page p, #print-letter-area p {
                text-align: justify !important;
                line-height: 1.7 !important;
                font-size: 15px !important;
                font-family: "Times New Roman", serif !important;
              }
              .print-page h2, #print-letter-area h2 {
                text-align: center !important;
                text-transform: uppercase !important;
                color: #0f172a !important;
                font-family: "Times New Roman", serif !important;
                font-size: 20px !important;
                font-weight: bold !important;
                margin-top: 12px !important;
                margin-bottom: 16px !important;
              }
              .print-page:last-child {
                page-break-after: avoid !important;
                break-after: auto !important;
              }
              /* Enforce scaling dynamically for all elements */
              .print-page img[alt="Logo"] {
                max-height: 32px !important;
              }
              .print-page h2 {
                font-size: 18px !important;
                margin-top: 6px !important;
                margin-bottom: 6px !important;
              }
              .print-page p {
                font-size: 13px !important;
                line-height: 1.45 !important;
              }
              .print-page img[alt="Signature"] {
                max-height: 48px !important;
              }
              .print-page img[alt="Footer Print"] {
                max-height: 80px !important;
                object-fit: contain !important;
              }
              .no-print {
                display: none !important;
              }
            }
            .print-page::before {
              content: "";
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              opacity: ${studentCampusConfig?.background ? '0.15' : '0.05'};
              background-image: url('${studentCampusConfig?.background || "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\" fill=\"%23007A87\"><path d=\"M10,80 Q50,40 90,20 Q60,50 10,80 Z\"/><path d=\"M30,80 Q60,55 90,35 Q65,60 30,80 Z\"/></svg>"}');
              background-repeat: no-repeat;
              background-position: center;
              background-size: ${studentCampusConfig?.background ? 'cover' : 'contain'};
              pointer-events: none;
              ${studentCampusConfig?.background ? '' : `
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-15deg);
                width: 70%;
                height: 50%;
              `}
            }
            #print-letter-area, .print-page {
              width: 210mm !important;
              height: auto !important; /* Follows content naturally on screen */
              min-height: 200px !important;
              max-height: none !important;
              margin: 0 auto !important;
              padding: 12mm 15mm !important; /* Simulates physical @page margins on screen! */
              flex-shrink: 0 !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: flex-start !important;
              overflow: visible !important;
              box-sizing: border-box !important;
              background: white !important;
              font-family: "Times New Roman", serif !important;
            }
          `}</style>
          
          <div id="print-modal-inner-wrapper" className="relative bg-white rounded-3xl shadow-2xl flex flex-col max-w-4xl w-full max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 no-print">
              <div className="flex items-center gap-2">
                {isInvitation ? <Mail className="w-5 h-5 text-indigo-600"/> : <GraduationCap className="w-5 h-5 text-indigo-600"/>}
                <h3 className="text-base font-black text-slate-800">{isInvitation ? "Mẫu Thư mời khảo sát" : isCommitment ? "Bản Cam kết học tập" : "Mẫu Thư Chúc mừng"}</h3>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    const originalTitle = document.title;
                    const academicYearStr = selectedReportStudent?.academicYear?.substring(0, 4) || new Date().getFullYear().toString();
                    const monthStr = "T" + String(new Date().getMonth() + 1).padStart(2, '0');
                    const studentName = selectedReportStudent?.fullName || "";
                    const pdfFileName = `${academicYearStr}_${monthStr}_TCM_${studentName}`;
                    
                    document.title = pdfFileName;
                    window.print();
                    setTimeout(() => {
                      document.title = originalTitle;
                    }, 1000);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-100 flex items-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Lưu File (PDF)
                </button>
                <button 
                  onClick={() => {
                    const originalTitle = document.title;
                    const academicYearStr = selectedReportStudent?.academicYear?.substring(0, 4) || new Date().getFullYear().toString();
                    const monthStr = "T" + String(new Date().getMonth() + 1).padStart(2, '0');
                    const studentName = selectedReportStudent?.fullName || "";
                    const pdfFileName = `${academicYearStr}_${monthStr}_TCM_${studentName}`;
                    
                    document.title = pdfFileName;
                    window.print();
                    setTimeout(() => {
                      document.title = originalTitle;
                    }, 1000);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-100 flex items-center gap-2 transition-all"
                >
                  In thư (Print)
                </button>
                <button 
                  onClick={() => setIsPrintModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 shadow-sm transition-colors"
                >
                  <X className="w-4 h-4"/>
                </button>
              </div>
            </div>
            
            {/* Modal Body / Paper Container */}
            <div id="print-body-scroll-wrapper" className="overflow-y-auto p-8 bg-slate-100 flex justify-center max-h-[80vh]">
              <div id="print-main-container" className="flex flex-col gap-8 items-center">
                <div 
                  id="print-letter-area" 
                  className="bg-white shadow-lg border border-slate-200 relative flex flex-col justify-between text-slate-800 text-sm leading-relaxed print-page"
                  style={{ fontFamily: "'Times New Roman', Times, serif", flexShrink: 0 }}
              >
                {/* Top Logo and Header */}
                <div className="flex flex-col relative z-10 w-full">
                  <div className="flex flex-col gap-1 border-b pb-2 mb-3">
                    <div className="flex items-center justify-between">
                      {studentCampusConfig?.logo ? (
                        <img src={studentCampusConfig.logo} alt="Logo" className="h-12 object-contain" />
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-2xl font-black tracking-tight text-teal-600" style={{ fontFamily: "Arial, sans-serif" }}>SKY-LINE</span>
                          <svg className="w-6 h-6 text-teal-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="text-left">
                      <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-800" style={{ fontFamily: "Arial, sans-serif" }}>{studentSchoolName}</h4>
                    </div>
                  </div>

                  {/* Letter Title */}
                  <div className="text-center my-4">
                    <h2 className="text-2xl font-black tracking-widest text-indigo-950 uppercase mb-2" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                      {isInvitation ? (studentCampusConfig?.title || "THƯ MỜI") : isCommitment ? (studentCampusConfig?.title || "BẢN CAM KẾT HỌC TẬP") : (studentCampusConfig?.title || "THƯ CHÚC MỪNG")}
                    </h2>
                  </div>

                  {/* Greeting */}
                  <p className="text-[16px] italic mb-3 text-slate-800">
                    {isInvitation ? (
                      <>Kính gửi Quý Phụ huynh và em <strong className="font-black not-italic text-slate-900">{selectedReportStudent.fullName}</strong>,</>
                    ) : (
                      <>Thân gửi em <strong className="font-black not-italic text-slate-900">{selectedReportStudent.fullName}</strong>,</>
                    )}
                  </p>

                  {/* Body Paragraphs */}
                  {isInvitation ? (
                    studentCampusConfig?.content ? (
                      <div className="space-y-2.5 text-justify text-[14px] leading-relaxed text-slate-800 font-serif" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                        {renderTemplate(studentCampusConfig.content, mergedStudent || selectedReportStudent).split('\n').filter(Boolean).map((para, idx) => (
                          <p key={idx} className="indent-8" style={{ textIndent: "2rem" }}>{para}</p>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-6 text-justify text-[15px] leading-relaxed">
                        <p className="indent-8" style={{ textIndent: "2rem" }}>
                          Hội đồng Tuyển sinh Hệ thống Giáo dục Sky-Line trân trọng gửi lời chào và lời chúc sức khỏe, an khang đến Quý phụ huynh cùng gia đình.
                        </p>
                        
                        <p className="indent-8" style={{ textIndent: "2rem" }}>
                          Nhằm tạo điều kiện tốt nhất để nhà trường hiểu rõ hơn về năng lực tư duy, ngôn ngữ cũng như thiên hướng phát triển tự nhiên của học sinh, qua đó xây dựng lộ trình rèn luyện tối ưu nhất, chúng tôi trân trọng kính mời Quý phụ huynh cùng học sinh tham gia buổi <strong className="font-bold">Khảo sát Năng lực Đầu vào</strong> hệ <strong className="font-bold">{selectedReportStudent.surveyFormType || "Hội nhập Global"}</strong> năm học <strong className="font-bold">2026-2027</strong>.
                        </p>
                        
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2 text-sm text-slate-700 ml-4 font-sans leading-relaxed shadow-inner">
                          <p><strong>• Thời gian khảo sát:</strong> Theo lịch hẹn cụ thể được sắp xếp từ Ban Tuyển sinh.</p>
                          <p><strong>• Địa điểm khảo sát:</strong> {selectedReportStudent.admissionCampus || "Hệ thống Giáo dục Sky-Line"}.</p>
                          <p><strong>• Nội dung khảo sát:</strong> Đánh giá tư duy ngôn ngữ, tư duy logic tự nhiên và khả năng tương tác xã hội phù hợp theo độ tuổi.</p>
                        </div>
                        
                        <p className="indent-8" style={{ textIndent: "2rem" }}>
                          Sự hiện diện và đồng hành của Quý phụ huynh cùng học sinh là niềm hân hạnh lớn cho Sky-Line, giúp nhà trường có sự chuẩn bị chu đáo nhất đón chào các em gia nhập mái trường hạnh phúc của chúng ta.
                        </p>
                        
                        <p className="indent-8 italic text-slate-600" style={{ textIndent: "2rem" }}>
                          Trân trọng kính mời Quý phụ huynh và các em học sinh!
                        </p>
                      </div>
                    )
                  ) : isCommitment ? (
                    <div className="space-y-2 text-justify text-[13px] leading-relaxed text-slate-800 font-serif">
                      {renderTemplate(
                        studentCampusConfig?.content || getDefaultContent("cam_ket_hoc_tap"),
                        selectedReportStudent
                      ).split('\n').filter(Boolean).map((para, idx) => {
                        const isList = /^[\d•\-*]+/.test(para.trim());
                        return (
                          <p key={idx} className={isList ? "pl-4" : "indent-8"} style={isList ? {} : { textIndent: "2rem" }}>
                            {para}
                          </p>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2.5 text-justify text-[14px] leading-relaxed text-slate-800 font-serif" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                      {renderTemplate(
                        studentCampusConfig?.content || getDefaultContent("thu_chuc_mung"),
                        selectedReportStudent
                      ).split('\n').filter(Boolean).map((para, idx) => (
                        <p key={idx} className="indent-8" style={{ textIndent: "2rem" }}>
                          {para}
                        </p>
                      ))}
                    </div>
                  )}


                {/* Bottom Signature Area */}
                {isCommitment ? (
                  <div className="grid grid-cols-2 gap-8 mt-6 text-center">
                    <div className="flex flex-col items-center">
                      <p className="font-bold uppercase text-slate-700 text-xs tracking-wider">ĐẠI DIỆN GIA ĐÌNH</p>
                      <p className="italic text-[10px] text-slate-400 mt-1">(Ký và ghi rõ họ tên)</p>
                      <div className="h-16 flex items-end justify-center">
                        <span className="text-slate-300 italic text-xs">Ký tên</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <p className="italic text-slate-500 mb-1 text-xs">{formattedLetterDate}</p>
                      <p className="font-bold uppercase text-indigo-950 text-xs tracking-wider">TM. HỘI ĐỒNG TUYỂN SINH</p>
                      <p className="font-bold uppercase text-indigo-900/80 text-[10px] tracking-wider mb-4">GIÁM ĐỐC ĐIỀU HÀNH SKY-LINE {campusTitleSuffix}</p>
                      
                      <div className="h-16 flex items-center justify-center">
                        {studentCampusConfig?.signature ? (
                          <img src={studentCampusConfig.signature} alt="Signature" className="max-h-full object-contain" />
                        ) : (
                          <span className="font-serif italic text-xl text-slate-400 font-light tracking-widest opacity-60" style={{ fontFamily: "'Brush Script MT', cursive, sans-serif" }}>
                            {mergedStudent?.signatureName || studentCampusConfig?.directorName || "Đỗ Quang Trung"}
                          </span>
                        )}
                      </div>
                      
                      <p className="font-bold text-slate-700 mt-2 text-sm">
                        {mergedStudent?.signatureName || studentCampusConfig?.directorName || "Đỗ Quang Trung"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-end text-right mt-8 pr-4">
                    <p className="italic text-slate-500 mb-1">{formattedLetterDate}</p>
                    <p className="font-bold uppercase text-indigo-950 text-xs tracking-wider">TM. HỘI ĐỒNG TUYỂN SINH</p>
                    {isInvitation && !studentCampusConfig?.signature ? (
                      <p className="font-bold uppercase text-indigo-900/80 text-[10px] tracking-wider mb-6">TRƯỞNG BAN TUYỂN SINH SKY-LINE</p>
                    ) : (
                      <p className="font-bold uppercase text-indigo-900/80 text-[10px] tracking-wider mb-6">GIÁM ĐỐC ĐIỀU HÀNH SKY-LINE {campusTitleSuffix}</p>
                    )}
                    
                    <div className="h-16 flex items-center justify-center pr-12">
                      {studentCampusConfig?.signature ? (
                        <img src={studentCampusConfig.signature} alt="Signature" className="max-h-full object-contain" />
                      ) : isInvitation ? (
                        <span className="font-serif italic text-xl text-slate-400 font-light tracking-widest opacity-60" style={{ fontFamily: "'Brush Script MT', cursive, sans-serif" }}>
                          Ban Tuyển sinh
                        </span>
                      ) : (
                        <span className="font-serif italic text-xl text-slate-400 font-light tracking-widest opacity-60" style={{ fontFamily: "'Brush Script MT', cursive, sans-serif" }}>
                          {mergedStudent?.signatureName || studentCampusConfig?.directorName || "Đỗ Quang Trung"}
                        </span>
                      )}
                    </div>
                    
                    <p className="font-bold text-slate-700 mt-2 text-sm">
                      {mergedStudent?.signatureName || studentCampusConfig?.directorName || (isInvitation ? "Ban Tuyển sinh" : "Đỗ Quang Trung")}
                    </p>
                  </div>
                )}
                </div>

                {/* Footer Contact */}
                {studentCampusConfig?.footer ? (
                  <div className="border-t border-slate-200 pt-3 mt-6 relative z-10 w-full">
                    <img src={studentCampusConfig.footer} alt="Footer Print" className="w-full h-auto" />
                  </div>
                ) : (
                  <div className="w-full pt-1 mt-4 relative z-10" style={{ fontFamily: "Arial, sans-serif" }}>
                    {/* High-fidelity Header Title & Line */}
                    <div className="flex items-center gap-2 mb-2.5 w-full">
                      <span className="font-bold text-[#00A6A9] whitespace-nowrap uppercase text-[11.5px] tracking-wide">HỆ THỐNG GIÁO DỤC SKY-LINE</span>
                      <div className="flex-grow border-t border-[#00A6A9]/70 h-0 mt-0.5"></div>
                      <span className="font-semibold text-[#00A6A9] whitespace-nowrap lowercase text-[11px] pr-2">www.skylineschool.edu.vn</span>
                    </div>
                    
                    {/* Information Grid */}
                    <div className="grid grid-cols-12 gap-2 w-full relative pr-8 text-[9px]">
                      {/* Left Column (3 branches) */}
                      <div className="col-span-4 flex flex-col gap-1.5 text-left">
                        <div>
                          <p className="font-bold text-[#00A6A9] text-[9.5px] leading-tight">SKY-LINE Riverside</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Lô A2.4 Trần Đăng Ninh, P. Hòa Cường, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#00A6A9] text-[9.5px] leading-tight">SKY-LINE Central</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Số 48 Nguyễn Du, P. Hải Châu, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#00A6A9] text-[9.5px] leading-tight">SKY-LINE Global</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Lô A2 Trần Đăng Ninh, P. Hòa Cường, TP. Đà Nẵng</p>
                        </div>
                      </div>

                      {/* Middle Column (3 branches) */}
                      <div className="col-span-5 flex flex-col gap-1.5 text-left pl-1">
                        <div>
                          <p className="font-bold text-[#00A6A9] text-[9.5px] leading-tight">SKY-LINE Beach</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Số 199 Trần Anh Tông, P. Thanh Khê, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#00A6A9] text-[9.5px] leading-tight">SKY-LINE Hill</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Khối Hà My Đông A, P. Điện Bàn Đông, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#00A6A9] text-[9.5px] leading-tight">Trung tâm sống thành công - SLS</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Số 48 Nguyễn Du, P. Hải Châu, TP. Đà Nẵng</p>
                        </div>
                      </div>

                      {/* Right Column (Contacts) */}
                      <div className="col-span-3 flex items-center justify-end gap-1.5 text-right pr-8 self-center">
                        <div className="w-4.5 h-4.5 rounded-full border border-slate-800 flex items-center justify-center flex-shrink-0 p-[3.5px] scale-[0.85]">
                          <Phone className="w-full h-full text-slate-800" fill="currentColor" />
                        </div>
                        <div className="flex flex-col text-[8.5px] font-semibold text-slate-800 tracking-tight leading-tight">
                          <p>(+84.236) 378 7777</p>
                          <p>(+84.236) 356 8777</p>
                          <p>(+84.236) 378 7779</p>
                          <p>(+84.235) 375 1777</p>
                        </div>
                      </div>
                    </div>

                    {/* The Large Elegant Teal Checkmark Vector positioned absolute over the right corner */}
                    <div className="absolute right-[-5px] top-[2px] w-16 h-12 opacity-100 pointer-events-none flex items-center justify-center text-[#00A6A9]">
                      <svg viewBox="0 0 120 60" className="w-full h-full fill-current" style={{ filter: "drop-shadow(0px 1px 1px rgba(0,166,169,0.1))" }}>
                        <path d="M 8 26 C 24 32, 50 52, 62 60 C 78 36, 102 16, 118 3 C 95 16, 76 44, 62 62 C 48 46, 25 32, 8 26 Z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

                {modalDocList && modalDocList.length > 0 && (
                  <div 
                    className="bg-white shadow-lg border border-slate-200 relative flex flex-col justify-between text-slate-800 text-sm leading-relaxed print-page mt-8"
                    style={{ fontFamily: "'Times New Roman', Times, serif", flexShrink: 0 }}
                  >
                    <div className="flex flex-col relative z-10 w-full">
                      {/* Top Logo and Header (Synchronized perfectly with Page 1) */}
                      <div className="flex flex-col gap-1 border-b pb-2 mb-3">
                        <div className="flex items-center justify-between">
                          {studentCampusConfig?.logo ? (
                            <img src={studentCampusConfig.logo} alt="Logo" className="h-12 object-contain" />
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="text-2xl font-black tracking-tight text-teal-600" style={{ fontFamily: "Arial, sans-serif" }}>SKY-LINE</span>
                              <svg className="w-6 h-6 text-teal-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="text-left">
                          <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-800" style={{ fontFamily: "Arial, sans-serif" }}>{studentSchoolName}</h4>
                        </div>
                      </div>

                      {/* Page Title */}
                      <div className="text-center my-6">
                        <h2 className="text-xl font-bold tracking-widest text-indigo-950 uppercase mb-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                          DANH MỤC HỒ SƠ NHẬP HỌC
                        </h2>
                      </div>

                      {/* Checklist Table (Redesigned 2-Column, Sharp Dark Borders) */}
                      <div className="mt-4 overflow-hidden border border-slate-950">
                        <table className="w-full border-collapse text-left text-[13px] text-slate-900" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                          <thead>
                            <tr className="bg-white border-b border-slate-950">
                              <th className="px-5 py-2.5 font-bold border-r border-slate-950 text-center uppercase text-slate-950" style={{ borderRightWidth: '1px', borderColor: '#000' }}>Hồ sơ yêu cầu</th>
                              <th className="px-5 py-2.5 font-bold text-center uppercase text-slate-950 w-32">Số lượng</th>
                            </tr>
                          </thead>
                          <tbody>
                            {modalDocList.map((item, idx) => (
                              <tr key={item.id} className="border-b border-slate-950 last:border-b-0">
                                <td className="px-5 py-2.5 border-r border-slate-950 font-medium text-slate-900" style={{ borderRightWidth: '1px', borderColor: '#000' }}>{idx + 1}. {item.name}</td>
                                <td className="px-5 py-2.5 text-center text-slate-950 font-bold">{item.qty}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <p className="mt-8 text-[13px] text-slate-950 font-bold text-left leading-relaxed" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                        Quý phụ huynh vui lòng bổ sung hồ sơ thiếu (nếu có) trong vòng 10 ngày kể từ ngày nộp Hồ sơ.
                      </p>
                    </div>

                    {/* Footer Contact */}
                    {studentCampusConfig?.footer ? (
                      <div className="border-t border-slate-200 pt-3 mt-6 relative z-10 w-full">
                        <img src={studentCampusConfig.footer} alt="Footer Print" className="w-full h-auto" />
                      </div>
                    ) : (
                      <div className="w-full pt-1 mt-4 relative z-10" style={{ fontFamily: "Arial, sans-serif" }}>
                    {/* High-fidelity Header Title & Line */}
                    <div className="flex items-center gap-2 mb-2.5 w-full">
                      <span className="font-bold text-[#00A6A9] whitespace-nowrap uppercase text-[11.5px] tracking-wide">HỆ THỐNG GIÁO DỤC SKY-LINE</span>
                      <div className="flex-grow border-t border-[#00A6A9]/70 h-0 mt-0.5"></div>
                      <span className="font-semibold text-[#00A6A9] whitespace-nowrap lowercase text-[11px] pr-2">www.skylineschool.edu.vn</span>
                    </div>
                    
                    {/* Information Grid */}
                    <div className="grid grid-cols-12 gap-2 w-full relative pr-8 text-[9px]">
                      {/* Left Column (3 branches) */}
                      <div className="col-span-4 flex flex-col gap-1.5 text-left">
                        <div>
                          <p className="font-bold text-[#00A6A9] text-[9.5px] leading-tight">SKY-LINE Riverside</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Lô A2.4 Trần Đăng Ninh, P. Hòa Cường, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#00A6A9] text-[9.5px] leading-tight">SKY-LINE Central</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Số 48 Nguyễn Du, P. Hải Châu, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#00A6A9] text-[9.5px] leading-tight">SKY-LINE Global</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Lô A2 Trần Đăng Ninh, P. Hòa Cường, TP. Đà Nẵng</p>
                        </div>
                      </div>

                      {/* Middle Column (3 branches) */}
                      <div className="col-span-5 flex flex-col gap-1.5 text-left pl-1">
                        <div>
                          <p className="font-bold text-[#00A6A9] text-[9.5px] leading-tight">SKY-LINE Beach</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Số 199 Trần Anh Tông, P. Thanh Khê, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#00A6A9] text-[9.5px] leading-tight">SKY-LINE Hill</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Khối Hà My Đông A, P. Điện Bàn Đông, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#00A6A9] text-[9.5px] leading-tight">Trung tâm sống thành công - SLS</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Số 48 Nguyễn Du, P. Hải Châu, TP. Đà Nẵng</p>
                        </div>
                      </div>

                      {/* Right Column (Contacts) */}
                      <div className="col-span-3 flex items-center justify-end gap-1.5 text-right pr-8 self-center">
                        <div className="w-4.5 h-4.5 rounded-full border border-slate-800 flex items-center justify-center flex-shrink-0 p-[3.5px] scale-[0.85]">
                          <Phone className="w-full h-full text-slate-800" fill="currentColor" />
                        </div>
                        <div className="flex flex-col text-[8.5px] font-semibold text-slate-800 tracking-tight leading-tight">
                          <p>(+84.236) 378 7777</p>
                          <p>(+84.236) 356 8777</p>
                          <p>(+84.236) 378 7779</p>
                          <p>(+84.235) 375 1777</p>
                        </div>
                      </div>
                    </div>

                    {/* The Large Elegant Teal Checkmark Vector positioned absolute over the right corner */}
                    <div className="absolute right-[-5px] top-[2px] w-16 h-12 opacity-100 pointer-events-none flex items-center justify-center text-[#00A6A9]">
                      <svg viewBox="0 0 120 60" className="w-full h-full fill-current" style={{ filter: "drop-shadow(0px 1px 1px rgba(0,166,169,0.1))" }}>
                        <path d="M 8 26 C 24 32, 50 52, 62 60 C 78 36, 102 16, 118 3 C 95 16, 76 44, 62 62 C 48 46, 25 32, 8 26 Z" />
                      </svg>
                    </div>
                  </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
    )}
  </div>
  )
}

