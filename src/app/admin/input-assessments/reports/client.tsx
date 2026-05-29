"use client"
import { useState, useEffect, useMemo, useRef } from "react"
import { 
  Baby, Clock, Settings, Users, BarChart3, Calendar,
  Plus, Trash2, Edit2, Search, RefreshCw, ChevronDown, ChevronUp,
  X, CheckCircle, CheckCircle2, AlertCircle, Download, Upload, Star, Heart, Sparkles, UserCheck, Eye, Send, ClipboardList, Mail, GraduationCap, Phone, Loader2, PenLine, Tag, Check, Printer
} from "lucide-react"

// Types
interface Campus { id: string; campusName: string; campusCode?: string; manager?: { fullName?: string } }
interface Period { id: string; code: string; name: string; status: string; batches: Batch[] }
interface Batch { id: string; periodId: string; batchNumber: number; name: string; startDate: string; endDate: string; status: string; campusId?: string }
interface AcademicYear { id: string; name: string }

const DEFAULT_WATERMARK_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%23007A87'><path d='M10,80 Q50,40 90,20 Q60,50 10,80 Z'/><path d='M30,80 Q60,55 90,35 Q65,60 30,80 Z'/></svg>";

const getCampusFullName = (codeOrName: string) => {
  const clean = (codeOrName || "").toUpperCase();
  if (clean.includes("CS1") || clean.includes("RIVERSIDE")) return "Sky-Line Riverside";
  if (clean.includes("CS2") || clean.includes("CENTRAL")) return "Sky-Line Central";
  if (clean.includes("CS3") || clean.includes("GLOBAL")) return "Sky-Line Global";
  if (clean.includes("CS4") || clean.includes("HILL")) return "Sky-Line Hill";
  if (clean.includes("CS5") || clean.includes("BEACH")) return "Sky-Line Beach";
  return codeOrName;
};

const getCampusDefaultManager = (campusCodeOrName: string) => {
  const clean = (campusCodeOrName || "").toUpperCase();
  if (clean.includes("CS1") || clean.includes("RIVERSIDE")) return "Tống Thiên Long";
  if (clean.includes("CS2") || clean.includes("CENTRAL")) return "Lê Thị Hoàng Yến";
  if (clean.includes("CS3") || clean.includes("GLOBAL")) return "Trần Thị Thanh";
  if (clean.includes("CS4") || clean.includes("HILL")) return "Cao Thanh Trung";
  if (clean.includes("CS5") || clean.includes("BEACH")) return "Đỗ Quang Trung";
  return "Trần Thị Thanh";
};

// Default template strings
const defaultPreschoolInvitation = `Hội đồng Tuyển sinh Hệ thống Giáo dục Sky-Line trân trọng gửi lời chào và lời chúc sức khỏe, an khang đến Quý phụ huynh cùng gia đình.

Nhằm tạo điều kiện tốt nhất để nhà trường hiểu rõ hơn về năng lực tư duy, ngôn ngữ cũng như thiên hướng phát triển tự nhiên của học sinh, qua đó xây dựng lộ trình rèn luyện tối ưu nhất, chúng tôi trân trọng kính mời Quý phụ huynh cùng học sinh tham gia buổi Khảo sát Năng lực Đầu vào hệ {{surveyFormType}} năm học {{academicYear}}.

• Thời gian khảo sát: Theo lịch hẹn cụ thể được sắp xếp từ Ban Tuyển sinh.
• Nội dung khảo sát: Đánh giá tư duy ngôn ngữ, tư duy logic tự nhiên và khả năng tương tác xã hội phù hợp theo độ tuổi.

Sự hiện diện và đồng hành của Quý phụ huynh cùng học sinh là niềm hân hạnh lớn cho Sky-Line, giúp nhà trường có sự chuẩn bị chu đáo nhất đón chào các em gia nhập mái trường hạnh phúc của chúng ta.

Trân trọng kính mời Quý phụ huynh và các em học sinh!`;

const defaultPreschoolCongratulations = `Chúc mừng con đã vượt qua kỳ khảo sát đầu vào lớp {{grade}} hệ {{surveyFormType}} năm học {{academicYear}}. Con đã chính thức đặt bước chân đầu tiên trên con đường trở thành học sinh của Trường Mầm non Sky-Line (Cơ sở {{admissionCampus}}) – một cột mốc quan trọng trong hành trình phát triển của con.

Thầy cô tại Sky-Line vui mừng chào đón con đến với ngôi trường hạnh phúc, nơi không chỉ cung cấp kiến thức mà còn giúp con phát triển toàn diện cả về năng lực và nhân cách. Chúng tôi tin rằng, con sẽ có những trải nghiệm thật tuyệt vời và đáng nhớ trong những năm học sắp tới.

Nhà trường hy vọng rằng, với sự nhanh nhẹn và đáng yêu của mình, con sẽ là một mảnh ghép sắc màu góp phần làm phong phú thêm bức tranh học đường tại Sky-Line. Nơi đây, con sẽ được học hỏi những điều mới lạ, được chơi đùa cùng các bạn và được các cô giáo yêu thương chăm sóc.

Chúc con có những năm tháng học tập đầy ý nghĩa và trải nghiệm thú vị tại Sky-Line. Hãy luôn giữ vững niềm vui thích học hỏi và khát khao khám phá thế giới xung quanh con nhé!`;

const defaultPreschoolCommitment = `Hệ thống Giáo dục Sky-Line chúc mừng con đã vượt qua kỳ khảo sát đầu vào lớp {{grade}} hệ {{surveyFormType}} năm học {{academicYear}}. Để tạo điều kiện tốt nhất cho hành trình phát triển toàn diện của học sinh tại trường, Nhà trường và Gia đình cùng thống nhất ký kết Bản Cam kết rèn luyện này.

Gia đình cam kết thực hiện đầy đủ các nội dung sau:
1. Đồng hành cùng con trong các hoạt động rèn luyện thói quen tự lập, nề nếp sinh hoạt và kỹ năng tự phục vụ cơ bản phù hợp với độ tuổi mầm non.
2. Phối hợp chặt chẽ với giáo viên chủ nhiệm trong việc theo dõi sức khỏe, tâm lý của con và tích cực trao đổi thông tin thường xuyên.
3. Tham gia đầy đủ các chương trình hội thảo, hoạt động trải nghiệm dành cho Phụ huynh và học sinh do nhà trường tổ chức.

Bản cam kết được thực hiện dưới sự đồng thuận của cả hai bên và có giá trị kể từ ngày ký.`;

const defaultThuMoi = `Hội đồng Tuyển sinh Hệ thống Giáo dục Sky-Line trân trọng gửi lời chào và lời chúc sức khỏe, an khang đến Quý phụ huynh cùng gia đình.

Nhằm tạo điều kiện tốt nhất để nhà trường hiểu rõ hơn về năng lực tư duy, kiến thức của học sinh, qua đó xây dựng lộ trình rèn luyện tối ưu nhất, chúng tôi trân trọng kính mời Quý phụ huynh cùng học sinh tham gia buổi Khảo sát Năng lực Đầu vào lớp {{grade}} hệ {{surveyFormType}} năm học {{academicYear}}.

• Thời gian khảo sát: Theo lịch hẹn cụ thể được sắp xếp từ Ban Tuyển sinh.
• Nội dung khảo sát: Đánh giá tư duy toán học, tư duy ngôn ngữ và khả năng tương tác xã hội.

Sự hiện diện và đồng hành của Quý phụ huynh cùng học sinh là niềm hân hạnh lớn cho Sky-Line, giúp nhà trường có sự chuẩn bị chu đáo nhất đón chào các em gia nhập mái trường hạnh phúc của chúng ta.

Trân trọng kính mời Quý phụ huynh và các em học sinh!`;

const defaultThuChucMung = `Chúc mừng em đã vượt qua kỳ khảo sát đầu vào lớp {{grade}} học kì {{hocKy}} hệ {{surveyFormType}} năm học {{academicYear}}. Em đã chính thức đặt bước chân đầu tiên trên con đường trở thành học sinh của Trường TH, THCS, THPT Sky-Line – một cột mốc quan trọng trong hành trình học tập của em.

Thầy cô tại Sky-Line vui mừng chào đón em đến với ngôi trường hạnh phúc, nơi không chỉ cung cấp kiến thức mà còn giúp em phát triển toàn diện cả về năng lực và nhân cách. Chúng tôi tin rằng, em sẽ có những trải nghiệm thật tuyệt vời và đáng nhớ trong những năm học sắp tới.

Nhà trường hy vọng rằng, với sự tự tin và khát khao học hỏi của mình, em sẽ là một mảnh ghép sắc màu góp phần làm phong phú thêm bức tranh học đường tại Sky-Line. Hãy luôn giữ vững niềm vui thích học hỏi và khát khao khám phá thế giới xung quanh em nhé!`;

const defaultCamKet = `Hệ thống Giáo dục Sky-Line chúc mừng em đã vượt qua kỳ khảo sát đầu vào lớp {{grade}} học kì {{hocKy}} hệ {{surveyFormType}} năm học {{academicYear}}. Để tạo điều kiện tốt nhất cho hành trình phát triển toàn diện của học sinh tại trường, Nhà trường và Gia đình cùng thống nhất ký kết Bản Cam kết học tập này.

Gia đình cam kết thực hiện đầy đủ các nội dung sau:
1. Đồng hành cùng con trong các hoạt động rèn luyện thói quen tự lập, nề nếp sinh hoạt và học tập.
2. Phối hợp chặt chẽ với giáo viên chủ nhiệm trong việc theo dõi sức khỏe, tâm lý và học tập của con.
3. Tham gia đầy đủ các chương trình hội thảo, hoạt động trải nghiệm dành cho Phụ huynh và học sinh do nhà trường tổ chức.

Bản cam kết được thực hiện dưới sự đồng thuận của cả hai bên và có giá trị kể từ ngày ký.`;

const renderTemplate = (content: string, student: any) => {
  if (!content) return "";
  return content
    .replace(/\{\{fullName\}\}/g, student?.fullName || "")
    .replace(/\{\{grade\}\}/g, student?.grade || "")
    .replace(/\{\{admissionCampus\}\}/g, student?.admissionCampus || "")
    .replace(/\{\{academicYear\}\}/g, student?.academicYear || "2025-2026")
    .replace(/\{\{surveyFormType\}\}/g, student?.surveyFormType || "")
    .replace(/\{\{hocKy\}\}/g, student?.hocKy || "1")
    .replace(/\{\{signatureName\}\}/g, student?.signatureName || "");
};

const inp = "w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 text-sm font-medium text-slate-700 transition-all shadow-sm";

function Toast({ msg, type }: { msg: string; type: string }) {
  return (
    <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl font-bold text-sm animate-in slide-in-from-right-4 fade-in duration-300 ${type === "err" ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"}`}>
      {type === "err" ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
      {msg}
    </div>
  );
}

function Field({ label, required, children }: any) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
        {label}{required && <span className="text-rose-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function Modal({ open, onClose, title, children, footer, size = "md" }: any) {
  if (!open) return null;
  const sizeMap: Record<string, string> = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className={`bg-white rounded-3xl shadow-2xl w-full ${sizeMap[size]} overflow-hidden animate-in zoom-in-95 duration-200`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="font-black text-slate-800 text-base flex items-center gap-2"><ClipboardList className="w-5 h-5 text-indigo-500" />{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[75vh]">{children}</div>
        {footer && <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">{footer}</div>}
      </div>
    </div>
  );
}

export function ReportsClient({
  academicYears, campuses, giaoVuCSUsers, gdcsUsers, teachers, departments, generalPeriods, preschoolPeriods, currentUser
}: any) {
  const [tab, setTab] = useState("report_config");
  const [selectedLevel, setSelectedLevel] = useState<"preschool" | "high">("high");
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [confirm, setConfirm] = useState<{ msg: string; fn: () => void } | null>(null);

  const notify = (msg: string, type: string = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Report config states
  const [rcCampusId, setRcCampusId] = useState("");
  const [rcReportType, setRcReportType] = useState("thu_chuc_mung");
  const [rcTargetGroup, setRcTargetGroup] = useState("all");
  const [rcTitle, setRcTitle] = useState("");
  const [rcContent, setRcContent] = useState("");
  const [rcDirectorName, setRcDirectorName] = useState("");
  const [rcLogo, setRcLogo] = useState("");
  const [rcSignature, setRcSignature] = useState("");
  const [rcBackground, setRcBackground] = useState("");
  const [rcFooter, setRcFooter] = useState("");

  const docGroups = [
    { id: "all", label: "Tất cả các khối (Mặc định)" },
    { id: "khoi_1", label: "Hồ sơ Khối 1" },
    { id: "khoi_2_5", label: "Hồ sơ Khối 2-5" },
    { id: "khoi_6", label: "Hồ sơ Khối 6" },
    { id: "khoi_10_noi_tinh", label: "Hồ sơ Khối 10 (Nội tỉnh)" },
    { id: "khoi_10_ngoai_tinh", label: "Hồ sơ Khối 10 (Ngoại tỉnh)" }
  ];

  // Active periods depending on level
  const activePeriods = useMemo(() => {
    return selectedLevel === "preschool" ? preschoolPeriods : generalPeriods;
  }, [selectedLevel, preschoolPeriods, generalPeriods]);

  // Unified loading of configuration
  useEffect(() => {
    if (typeof window === "undefined" || !rcCampusId) return;
    const campusObj = campuses.find((c: any) => c.id === rcCampusId);
    
    // Resolve key
    const typeKey = selectedLevel === "preschool" 
      ? rcReportType + "_preschool"
      : rcReportType + "_" + rcTargetGroup;
      
    const savedCampus = localStorage.getItem('report_config_' + rcCampusId + '_' + typeKey);
    const savedGlobal = localStorage.getItem('report_config_global_' + typeKey);

    let campusData: any = {};
    let globalData: any = {};

    if (savedCampus) { try { campusData = JSON.parse(savedCampus); } catch(e) {} }
    if (savedGlobal) { try { globalData = JSON.parse(savedGlobal); } catch(e) {} }

    // Load defaults if no saved configs
    const defaultText = selectedLevel === "preschool"
      ? (rcReportType === "thu_moi" ? defaultPreschoolInvitation : rcReportType === "cam_ket_hoc_tap" ? defaultPreschoolCommitment : defaultPreschoolCongratulations)
      : (rcReportType === "thu_moi" ? defaultThuMoi : rcReportType === "cam_ket_hoc_tap" ? defaultCamKet : defaultThuChucMung);

    const mLogo = localStorage.getItem('report_config_master_logo') || "";
    const mBg = localStorage.getItem('report_config_master_background') || "";
    const mFooter = localStorage.getItem('report_config_master_footer') || "";
    const mSig = localStorage.getItem('report_config_master_signature') || "";

    setRcLogo(mLogo || globalData.logo || campusData.logo || "");
    setRcBackground(mBg || globalData.background || campusData.background || "");
    setRcFooter(mFooter || globalData.footer || campusData.footer || "");
    setRcContent(globalData.content || campusData.content || defaultText);
    setRcTitle(globalData.title || campusData.title || (rcReportType === "thu_moi" ? "THƯ MỜI" : rcReportType === "cam_ket_hoc_tap" ? "BẢN CAM KẾT HỌC TẬP" : "THƯ CHÚC MỪNG"));
    
    const savedSignature = localStorage.getItem('report_config_signature_' + rcCampusId) || campusData.signature || mSig || "";
    const savedDirector = localStorage.getItem('report_config_director_' + rcCampusId) || campusData.directorName || campusObj?.manager?.fullName || getCampusDefaultManager(campusObj?.campusName || "");
    
    setRcSignature(savedSignature);
    setRcDirectorName(savedDirector);
  }, [rcCampusId, rcReportType, rcTargetGroup, selectedLevel, campuses]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => { setRcLogo(reader.result as string); }; reader.readAsDataURL(file); }
  };
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => { setRcSignature(reader.result as string); }; reader.readAsDataURL(file); }
  };
  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => { setRcBackground(reader.result as string); }; reader.readAsDataURL(file); }
  };
  const handleFooterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => { setRcFooter(reader.result as string); }; reader.readAsDataURL(file); }
  };

  const saveReportConfig = () => {
    if (!rcCampusId) return notify("Vui lòng chọn Cơ sở", "err");
    if (!rcReportType) return notify("Vui lòng chọn Loại báo cáo", "err");
    
    const typeKey = selectedLevel === "preschool" 
      ? rcReportType + "_preschool"
      : rcReportType + "_" + rcTargetGroup;

    const globalData = { title: rcTitle, logo: rcLogo, background: rcBackground, content: rcContent, footer: rcFooter };
    localStorage.setItem('report_config_global_' + typeKey, JSON.stringify(globalData));
    localStorage.setItem('report_config_master_logo', rcLogo || "");
    localStorage.setItem('report_config_master_background', rcBackground || "");
    localStorage.setItem('report_config_master_footer', rcFooter || "");
    localStorage.setItem('report_config_master_signature', rcSignature || "");
    localStorage.setItem('report_config_signature_' + rcCampusId, rcSignature || "");
    localStorage.setItem('report_config_director_' + rcCampusId, rcDirectorName || "");
    
    const campusData = { signature: rcSignature, directorName: rcDirectorName, title: rcTitle, logo: rcLogo, background: rcBackground, content: rcContent, footer: rcFooter };
    localStorage.setItem('report_config_' + rcCampusId + '_' + typeKey, JSON.stringify(campusData));
    
    notify("Lưu cấu hình báo cáo thành công!");
  };

  // Student Export Tab States
  const [cPeriodId, setCPeriodId] = useState("");
  const [cBatchId, setCBatchId] = useState("all");
  const [cCampusId, setCCampusId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedReportStudent, setSelectedReportStudent] = useState<any>(null);
  const [isInvitation, setIsInvitation] = useState(false);
  const [isCommitment, setIsCommitment] = useState(false);

  // Auto select first period when level changes
  useEffect(() => {
    if (activePeriods.length > 0) {
      setCPeriodId(activePeriods[0].id);
      setCBatchId("all");
    } else {
      setCPeriodId("");
      setCBatchId("all");
    }
    setStudents([]);
  }, [selectedLevel, activePeriods]);

  // Load students based on filters
  useEffect(() => {
    if (!cPeriodId) {
      setStudents([]);
      return;
    }
    setLoadingStudents(true);
    const apiRoute = selectedLevel === "preschool"
      ? "/api/preschool-input-assessment-students"
      : "/api/input-assessment-students";

    fetch(`${apiRoute}?periodId=${cPeriodId}&batchId=${cBatchId || "all"}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStudents(data);
        } else {
          setStudents([]);
        }
        setLoadingStudents(false);
      })
      .catch(err => {
        console.error("Fetch students error:", err);
        setStudents([]);
        setLoadingStudents(false);
      });
  }, [cPeriodId, cBatchId, selectedLevel]);

  const activePeriod = activePeriods.find(p => p.id === cPeriodId);
  const activeBatches = activePeriod?.batches || [];

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // search query
      const matchQuery = !searchQuery ? true : (
        s.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentCode?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      // campus query
      const matchCampus = !cCampusId ? true : (
        s.admissionCampus === cCampusId ||
        s.admissionCampus?.includes(cCampusId)
      );
      return matchQuery && matchCampus;
    });
  }, [students, searchQuery, cCampusId]);

  // Print modal configuration resolver
  const studentCampusConfig = useMemo(() => {
    if (!selectedReportStudent) return null;
    const effCampus = selectedReportStudent.admissionCampus;
    let targetCampus = campuses.find((c: any) => 
      c.id === effCampus || c.campusName === effCampus || c.campusCode === effCampus ||
      effCampus?.includes(c.campusCode) || effCampus?.includes(c.campusName)
    );
    if (!targetCampus && campuses.length > 0) targetCampus = campuses[0];

    if (targetCampus) {
      // Guess group/grade logic
      let studentGroup = "all";
      const gClean = String(selectedReportStudent.grade || "").toLowerCase();
      if (gClean.includes("mầm non") || gClean.includes("nhóm") || selectedLevel === "preschool") {
        studentGroup = "preschool";
      } else if (gClean.includes("6") || gClean.includes("7") || gClean.includes("8") || gClean.includes("9")) {
        studentGroup = "khoi_6";
      } else if (gClean.includes("10") || gClean.includes("11") || gClean.includes("12")) {
        studentGroup = "khoi_10_noi_tinh"; // guess
      } else {
        studentGroup = "khoi_1";
      }

      const baseKey = isInvitation ? 'thu_moi' : isCommitment ? 'cam_ket_hoc_tap' : 'thu_chuc_mung';
      const typeKey = selectedLevel === "preschool" ? baseKey + "_preschool" : baseKey + "_" + studentGroup;

      const savedCampus = localStorage.getItem('report_config_' + targetCampus.id + '_' + typeKey);
      const savedGlobal = localStorage.getItem('report_config_global_' + typeKey);

      let campusData: any = {};
      let globalData: any = {};
      if (savedCampus) { try { campusData = JSON.parse(savedCampus); } catch (e) {} }
      if (savedGlobal) { try { globalData = JSON.parse(savedGlobal); } catch (e) {} }

      const mergedTitle = globalData.title || campusData.title || (isInvitation ? "THƯ MỜI" : isCommitment ? "BẢN CAM KẾT HỌC TẬP" : "THƯ CHÚC MỪNG");
      const mLogo = localStorage.getItem('report_config_master_logo') || "";
      const mBg = localStorage.getItem('report_config_master_background') || "";
      const mFooter = localStorage.getItem('report_config_master_footer') || "";
      const mSig = localStorage.getItem('report_config_master_signature') || "";

      const mergedLogo = mLogo || globalData.logo || campusData.logo || "";
      const mergedBackground = mBg || globalData.background || campusData.background || "";
      const mergedContent = globalData.content || campusData.content || "";
      const mergedFooter = mFooter || globalData.footer || campusData.footer || "";
      const campusSig = localStorage.getItem('report_config_signature_' + targetCampus.id) || campusData.signature || mSig || "";
      const campusDir = localStorage.getItem('report_config_director_' + targetCampus.id) || campusData.directorName || targetCampus.manager?.fullName || getCampusDefaultManager(targetCampus.campusName || "");

      return {
        title: mergedTitle,
        logo: mergedLogo,
        background: mergedBackground,
        content: mergedContent,
        footer: mergedFooter,
        signature: campusSig,
        directorName: campusDir
      };
    }
    return null;
  }, [selectedReportStudent, isInvitation, isCommitment, selectedLevel, campuses]);

  // SMTP Email Send Modal States
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSendingStatus, setEmailSendingStatus] = useState("");
  const [attachLetters, setAttachLetters] = useState(true);

  const handleOpenEmailModal = () => {
    const activePeriodName = activePeriod?.name || "Kỳ khảo sát";
    const activeBatchName = cBatchId !== "all" ? (activeBatches.find(b => b.id === cBatchId)?.name || "Đợt") : "Tất cả các đợt";
    
    setEmailSubject(`[Báo cáo nhanh] Kết quả Khảo sát đầu vào KSNL - Kỳ: ${activePeriodName} - Đợt: ${activeBatchName}`);
    setRecipientEmail("bankhaothi@skylineschool.edu.vn, tuyensinh.cs3@skylineschool.edu.vn");
    setAttachLetters(true);
    setIsEmailModalOpen(true);
  };

  const handleSendEmailsSubmit = async () => {
    if (!recipientEmail) return alert("Vui lòng nhập Email người nhận");
    setEmailSending(true);
    setEmailSendingStatus("Đang khởi tạo gửi mail...");

    try {
      const activePeriodName = activePeriod?.name || "Kỳ khảo sát";
      const activeBatchName = cBatchId !== "all" ? (activeBatches.find(b => b.id === cBatchId)?.name || "Đợt") : "Tất cả các đợt";

      const apiRoute = selectedLevel === "preschool"
        ? "/api/admin/preschool-send-quick-email"
        : "/api/admin/send-quick-email";

      const res = await fetch(apiRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipientEmail,
          subject: emailSubject,
          periodName: activePeriodName,
          batchName: activeBatchName,
          students: filteredStudents,
          attachLetters: attachLetters
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert("Đã gửi email báo cáo thành công!");
        setIsEmailModalOpen(false);
      } else {
        alert("Gửi email thất bại: " + (data.error || "Lỗi không xác định"));
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message);
    } finally {
      setEmailSending(false);
      setEmailSendingStatus("");
    }
  };

  // PDF Download Helper
  const handlePrintPDF = async () => {
    if (typeof window === "undefined") return;
    window.print();
  };

  const formattedLetterDate = useMemo(() => {
    const d = new Date();
    return `Đà Nẵng, ngày ${String(d.getDate()).padStart(2, "0")} tháng ${String(d.getMonth() + 1).padStart(2, "0")} năm ${d.getFullYear()}`;
  }, []);

  const campusTitleSuffix = useMemo(() => {
    if (!selectedReportStudent) return "GLOBAL";
    const eff = (selectedReportStudent.admissionCampus || "").toUpperCase();
    if (eff.includes("CS1") || eff.includes("RIVERSIDE")) return "RIVERSIDE";
    if (eff.includes("CS2") || eff.includes("CENTRAL")) return "CENTRAL";
    if (eff.includes("CS3") || eff.includes("GLOBAL")) return "GLOBAL";
    if (eff.includes("CS4") || eff.includes("HILL")) return "HILL";
    if (eff.includes("CS5") || eff.includes("BEACH")) return "BEACH";
    return "GLOBAL";
  }, [selectedReportStudent]);

  return (
    <div className="space-y-4 font-sans max-w-[1440px] mx-auto pb-16">
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {confirm && <ConfirmDialog open={true} onClose={() => setConfirm(null)} onConfirm={confirm.fn} message={confirm.msg} />}

      {/* Main Header / Top Selectors */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <ClipboardList className="w-6 h-6"/>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Trung tâm Xuất Báo cáo KSNL</h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Xuất mẫu in, Thư chúc mừng, Thư mời và Cam kết học tập</p>
          </div>
        </div>

        {/* Level toggle switch */}
        <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex gap-1.5 shadow-inner">
          <button
            onClick={() => setSelectedLevel("high")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-tight transition-all duration-300 ${selectedLevel === "high" ? "bg-white text-indigo-600 shadow-md scale-[1.02]" : "text-slate-500 hover:text-slate-800"}`}
          >
            <GraduationCap className="w-4 h-4 text-indigo-500" />
            Khảo thí Phổ thông
          </button>
          <button
            onClick={() => setSelectedLevel("preschool")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-tight transition-all duration-300 ${selectedLevel === "preschool" ? "bg-white text-violet-600 shadow-md scale-[1.02]" : "text-slate-500 hover:text-slate-800"}`}
          >
            <Baby className="w-4 h-4 text-violet-500" />
            Khảo thí Mầm non
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-1.5">
        <div className="flex flex-wrap gap-1">
          {[
            { id: "report_config", label: "Cấu hình báo cáo", icon: Settings },
            { id: "letters", label: "Xuất thư chúc mừng", icon: GraduationCap },
            { id: "results", label: "Trả kết quả", icon: BarChart3 }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${tab === t.id ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
            >
              <t.icon className={`w-4 h-4 ${tab === t.id ? "text-white" : "text-slate-400"}`} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENTS */}

      {/* 1. REPORT CONFIG */}
      {tab === "report_config" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Left panel settings */}
          <div className="lg:col-span-5 bg-white border border-slate-200 shadow-sm rounded-3xl p-8 space-y-6">
            <div className="flex items-center gap-3 border-b pb-4 mb-2">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Settings className="w-5 h-5"/>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">Cấu hình Thiết kế Mẫu in</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Thiết lập bố cục logo, chữ ký cho {selectedLevel === "preschool" ? "Mầm non" : "Phổ thông"}</p>
              </div>
            </div>

            <Field label="Chọn cơ sở áp dụng" required>
              <select value={rcCampusId} onChange={e => setRcCampusId(e.target.value)} className={inp}>
                <option value="">-- Chọn Cơ sở --</option>
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>{getCampusFullName(c.campusName || "")}</option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Loại báo cáo" required>
                <select value={rcReportType} onChange={e => setRcReportType(e.target.value)} className={inp}>
                  <option value="thu_moi">Thư mời</option>
                  <option value="thu_chuc_mung">Thư chúc mừng</option>
                  <option value="cam_ket_hoc_tap">Cam kết học tập</option>
                </select>
              </Field>

              {selectedLevel === "high" && (
                <Field label="Nhóm/Khối áp dụng" required>
                  <select value={rcTargetGroup} onChange={e => setRcTargetGroup(e.target.value)} className={inp}>
                    {docGroups.map(g => (
                      <option key={g.id} value={g.id}>{g.label}</option>
                    ))}
                  </select>
                </Field>
              )}
            </div>

            <Field label="Tiêu đề Báo cáo" required>
              <input value={rcTitle} onChange={e => setRcTitle(e.target.value)} placeholder="Nhập tiêu đề..." className={inp} />
            </Field>

            <Field label="Nội dung mẫu văn bản" required>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-400 font-bold">Soạn thảo nội dung mẫu</span>
                <button
                  onClick={() => {
                    const defaultText = selectedLevel === "preschool"
                      ? (rcReportType === "thu_moi" ? defaultPreschoolInvitation : rcReportType === "cam_ket_hoc_tap" ? defaultPreschoolCommitment : defaultPreschoolCongratulations)
                      : (rcReportType === "thu_moi" ? defaultThuMoi : rcReportType === "cam_ket_hoc_tap" ? defaultCamKet : defaultThuChucMung);
                    setRcContent(defaultText);
                  }}
                  className="text-[10px] font-extrabold text-indigo-600 hover:underline cursor-pointer"
                >
                  Khôi phục mặc định
                </button>
              </div>
              <textarea
                value={rcContent}
                onChange={e => setRcContent(e.target.value)}
                rows={8}
                placeholder="Nhập nội dung mẫu..."
                className={`${inp} py-3 font-normal resize-none text-xs leading-relaxed font-sans`}
              />
              <p className="text-[10px] text-slate-400 mt-1 font-semibold leading-normal">
                Từ khóa tự điền: <span className="text-indigo-600 font-bold">{"{{fullName}}"}</span>, <span className="text-indigo-600 font-bold">{"{{grade}}"}</span>, <span className="text-indigo-600 font-bold">{"{{surveyFormType}}"}</span>, <span className="text-indigo-600 font-bold">{"{{academicYear}}"}</span>
              </p>
            </Field>

            <Field label="Họ tên Giám đốc Điều hành" required>
              <input value={rcDirectorName} onChange={e => setRcDirectorName(e.target.value)} placeholder="Nhập họ tên GĐCS..." className={inp} />
            </Field>

            {/* Upload fields */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-4">
                {/* Logo */}
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Logo Trường</label>
                  <div className="flex items-center gap-2">
                    {rcLogo ? (
                      <div className="relative w-12 h-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center p-1 group">
                        <img src={rcLogo} className="max-w-full max-h-full object-contain rounded-lg" />
                        <button onClick={() => setRcLogo("")} className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center shadow-md"><X className="w-2.5 h-2.5"/></button>
                      </div>
                    ) : (
                      <label className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:border-indigo-400 hover:text-indigo-600 transition-all">
                        <Upload className="w-4 h-4"/>
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Signature */}
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Chữ ký GĐCS</label>
                  <div className="flex items-center gap-2">
                    {rcSignature ? (
                      <div className="relative w-12 h-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center p-1 group">
                        <img src={rcSignature} className="max-w-full max-h-full object-contain rounded-lg" />
                        <button onClick={() => setRcSignature("")} className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center shadow-md"><X className="w-2.5 h-2.5"/></button>
                      </div>
                    ) : (
                      <label className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:border-indigo-400 hover:text-indigo-600 transition-all">
                        <Upload className="w-4 h-4"/>
                        <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Background */}
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Watermark nền</label>
                  <div className="flex items-center gap-2">
                    {rcBackground ? (
                      <div className="relative w-12 h-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center p-1 group">
                        <img src={rcBackground} className="max-w-full max-h-full object-contain rounded-lg" />
                        <button onClick={() => setRcBackground("")} className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center shadow-md"><X className="w-2.5 h-2.5"/></button>
                      </div>
                    ) : (
                      <label className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:border-indigo-400 hover:text-indigo-600 transition-all">
                        <Upload className="w-4 h-4"/>
                        <input type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Footer Văn bản</label>
                  <div className="flex items-center gap-2">
                    {rcFooter ? (
                      <div className="relative w-12 h-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center p-1 group">
                        <img src={rcFooter} className="max-w-full max-h-full object-contain rounded-lg" />
                        <button onClick={() => setRcFooter("")} className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center shadow-md"><X className="w-2.5 h-2.5"/></button>
                      </div>
                    ) : (
                      <label className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:border-indigo-400 hover:text-indigo-600 transition-all">
                        <Upload className="w-4 h-4"/>
                        <input type="file" accept="image/*" className="hidden" onChange={handleFooterUpload} />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <button onClick={saveReportConfig} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 cursor-pointer">
              <Check className="w-4 h-4" /> Lưu cấu hình mẫu in
            </button>
          </div>

          {/* Right panel live preview */}
          <div className="lg:col-span-7 bg-slate-50 border border-slate-200 shadow-inner rounded-3xl p-8 flex flex-col justify-between min-h-[500px]">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-5">Khung Xem trước thiết kế A4 thực tế</span>
            <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-lg flex flex-col justify-between w-full aspect-[210/297] relative overflow-hidden">
              {/* Background Watermark for Preview */}
              <div 
                className="absolute pointer-events-none"
                style={{
                  backgroundImage: `url('${rcBackground || DEFAULT_WATERMARK_SVG}')`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  backgroundSize: 'contain',
                  opacity: rcBackground ? 0.45 : 0.05,
                  top: '50%',
                  left: '50%',
                  width: '80%',
                  height: '80%',
                  transform: 'translate(-50%, -50%)'
                }}
              />

              {/* Top info */}
              <div className="relative z-10 space-y-4 flex flex-col h-full justify-between">
                <div>
                  <div className="border-b border-slate-200 pb-2 mb-3">
                    {rcLogo ? (
                      <img src={rcLogo} alt="Logo" className="h-8 object-contain mb-1" />
                    ) : (
                      <span className="text-[10px] font-black tracking-tight text-teal-600 uppercase">SKY-LINE</span>
                    )}
                    <h4 className="font-extrabold text-[9px] uppercase tracking-wider text-slate-800">
                      {selectedLevel === "preschool" ? "TRƯỜNG MẦM NON SKY-LINE" : "TRƯỜNG TH, THCS, THPT SKY-LINE"}
                    </h4>
                  </div>

                  <div className="text-center mb-3">
                    <h2 className="text-xs font-black tracking-widest text-indigo-950 uppercase" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                      {rcTitle}
                    </h2>
                  </div>

                  {/* Greeting */}
                  <p className="text-[10px] italic mb-2 text-slate-700 font-bold">
                    {rcReportType === 'thu_moi' ? (
                      <>Kính gửi Quý Phụ huynh và bé <strong className="font-bold not-italic">Nguyễn Minh An</strong>,</>
                    ) : (
                      <>Thân gửi con <strong className="font-bold not-italic">Nguyễn Minh An</strong>,</>
                    )}
                  </p>

                  {/* Template text */}
                  <div className="space-y-3 py-2 text-[10px] leading-relaxed text-slate-600 text-justify font-serif max-h-[300px] overflow-y-auto pr-1">
                    {renderTemplate(
                      rcContent || "",
                      { fullName: "Nguyễn Minh An", grade: "1", surveyFormType: "Chất lượng cao", academicYear: "2025-2026", hocKy: "1" }
                    ).split('\n').filter(Boolean).map((para, idx) => {
                      const isList = /^\s*[\d•\-*]+/.test(para);
                      return (
                        <p key={idx} className={isList ? "pl-4 font-semibold" : "indent-4"} style={isList ? {} : { textIndent: "1cm" }}>
                          {para}
                        </p>
                      );
                    })}
                  </div>
                </div>

                {/* Signatures */}
                {rcReportType === "cam_ket_hoc_tap" ? (
                  <div className="grid grid-cols-2 gap-4 text-center mt-auto">
                    <div className="space-y-1">
                      <p className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">ĐẠI DIỆN GIA ĐÌNH</p>
                      <div className="h-10 flex items-end justify-center">
                        <span className="text-[7px] text-slate-300 italic">Ký tên</span>
                      </div>
                    </div>
                    <div className="space-y-1 min-w-[70px]">
                      <p className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">TM. HỘI ĐỒNG TUYỂN SINH</p>
                      <div className="h-10 flex items-center justify-center">
                        {rcSignature ? (
                          <img src={rcSignature} alt="Chữ ký" className="max-h-full object-contain" />
                        ) : (
                          <div className="text-[7px] text-slate-300 italic">Chưa upload</div>
                        )}
                      </div>
                      <p className="text-[9px] font-black text-slate-700">{rcDirectorName || "-- Họ tên --"}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end mt-auto">
                    <div className="text-center space-y-1 min-w-[140px]">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">TM. HỘI ĐỒNG TUYỂN SINH</p>
                      <div className="h-10 flex items-center justify-center">
                        {rcSignature ? (
                          <img src={rcSignature} alt="Chữ ký" className="max-h-full object-contain" />
                        ) : (
                          <div className="text-[8px] text-slate-300 italic">Chưa upload chữ ký</div>
                        )}
                      </div>
                      <p className="text-[11px] font-black text-slate-700">{rcDirectorName || "-- Họ tên --"}</p>
                    </div>
                  </div>
                )}

                {/* Footer Banner */}
                {rcFooter ? (
                  <div className="pt-2 border-t border-slate-200 mt-2">
                    <img src={rcFooter} alt="Footer" className="w-full h-auto" />
                  </div>
                ) : (
                  <div className="border-t border-teal-500/30 pt-2 text-[5px] text-slate-400 text-center">
                    <p className="font-bold">www.skylineschool.edu.vn • Hotline: (+84.236) 378 7777</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. LETTERS EXPORT TABLE */}
      {tab === "letters" && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 ml-1">Kỳ Khảo sát</span>
                <select value={cPeriodId} onChange={e => { setCPeriodId(e.target.value); setCBatchId("all"); }} className="bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 rounded-xl outline-none min-w-[200px]">
                  {activePeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  {activePeriods.length === 0 && <option value="">Không có kỳ nào</option>}
                </select>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 ml-1">Đợt Khảo sát</span>
                <select value={cBatchId} onChange={e => setCBatchId(e.target.value)} className="bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 rounded-xl outline-none min-w-[150px]">
                  <option value="all">Tất cả các đợt</option>
                  {activeBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 ml-1">Cơ sở đăng ký</span>
                <select value={cCampusId} onChange={e => setCCampusId(e.target.value)} className="bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 rounded-xl outline-none min-w-[150px]">
                  <option value="">Tất cả Cơ sở</option>
                  {campuses.map(c => <option key={c.id} value={c.id}>{getCampusFullName(c.campusName || "")}</option>)}
                </select>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm tên học sinh..."
                className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-indigo-400 font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Students Grid */}
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            {loadingStudents ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đang tải danh sách học sinh...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-30 text-indigo-500" />
                <p className="text-sm font-bold">Không tìm thấy học sinh nào trong đợt này</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-100">
                    <th className="px-6 py-4 text-center w-12">STT</th>
                    <th className="px-6 py-4">Mã HS</th>
                    <th className="px-6 py-4">Họ và Tên</th>
                    <th className="px-6 py-4 text-center">Khối</th>
                    <th className="px-6 py-4 text-center">Phái</th>
                    <th className="px-6 py-4">Hệ Đăng ký</th>
                    <th className="px-6 py-4">Kết quả Phê duyệt</th>
                    <th className="px-6 py-4 w-[280px]">In / Xuất mẫu thư</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {filteredStudents.map((s, idx) => {
                    const dob = s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "—";
                    const gender = s.gender === "M" || s.gender === "MALE" || s.gender === "Nam" ? "Nam" : s.gender === "F" || s.gender === "FEMALE" || s.gender === "Nữ" ? "Nữ" : "—";
                    
                    // Approval results badges
                    const result = s.admissionResult || s.devAssessmentResult || "Chưa duyệt";
                    const isPassed = result.includes("Đạt") || result.includes("Đại") || result.includes("MIỄN") || result.includes("DAT");

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors font-medium text-slate-700">
                        <td className="px-6 py-4 text-center text-slate-400">{idx + 1}</td>
                        <td className="px-6 py-4 font-black">{s.studentCode || "—"}</td>
                        <td className="px-6 py-4 font-black text-slate-800 text-sm">{s.fullName}</td>
                        <td className="px-6 py-4 text-center">{s.grade || "—"}</td>
                        <td className="px-6 py-4 text-center text-slate-500">{gender}</td>
                        <td className="px-6 py-4 text-slate-500">{s.surveyFormType || "—"}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider ${isPassed ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-100"}`}>
                            {result}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1.5 flex-wrap">
                            <button
                              onClick={() => { setIsInvitation(true); setIsCommitment(false); setSelectedReportStudent(s); setIsPrintModalOpen(true); }}
                              className="px-2.5 py-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                            >
                              <Mail className="w-3 h-3"/> Thư mời
                            </button>
                            <button
                              onClick={() => { setIsInvitation(false); setIsCommitment(false); setSelectedReportStudent(s); setIsPrintModalOpen(true); }}
                              className="px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle className="w-3 h-3"/> Chúc mừng
                            </button>
                            {selectedLevel === "preschool" ? (
                              <button
                                onClick={() => { setIsInvitation(false); setIsCommitment(true); setSelectedReportStudent(s); setIsPrintModalOpen(true); }}
                                className="px-2.5 py-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg hover:bg-amber-600 hover:text-white transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                              >
                                <PenLine className="w-3 h-3"/> Bản Cam kết
                              </button>
                            ) : (
                              (result.includes("cam kết") || result.includes("Đạt cam kết")) && (
                                <button
                                  onClick={() => { setIsInvitation(false); setIsCommitment(true); setSelectedReportStudent(s); setIsPrintModalOpen(true); }}
                                  className="px-2.5 py-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg hover:bg-amber-600 hover:text-white transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                                >
                                  <PenLine className="w-3 h-3"/> Bản Cam kết
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 3. EMAIL REPORT RESULTS */}
      {tab === "results" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Statistics summary */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 space-y-6">
            <h3 className="text-base font-extrabold text-slate-800 border-b pb-3 mb-2 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-500"/> Thống kê tổng quan</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl text-center space-y-1">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block">Tổng học sinh</span>
                <span className="text-2xl font-black text-slate-800 block">{filteredStudents.length}</span>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl text-center space-y-1">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block">Số em đạt</span>
                <span className="text-2xl font-black text-slate-800 block">
                  {filteredStudents.filter(s => {
                    const r = s.admissionResult || s.devAssessmentResult || "";
                    return r.includes("Đạt") || r.includes("DAT") || r.includes("MIỄN");
                  }).length}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Chi tiết theo Trạng thái duyệt</span>
              <div className="space-y-2">
                {Array.from(new Set(students.map(s => s.admissionResult || s.devAssessmentResult || "Chưa duyệt"))).map(st => {
                  const count = students.filter(s => (s.admissionResult || s.devAssessmentResult || "Chưa duyệt") === st).length;
                  return (
                    <div key={st} className="flex justify-between items-center bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 text-xs font-semibold text-slate-600">
                      <span>{st}</span>
                      <span className="bg-white border px-2 py-0.5 rounded-lg text-slate-800 font-bold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Email triggers */}
          <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-3 mb-2">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2"><Mail className="w-5 h-5 text-indigo-500"/> Trả kết quả / Gửi mail nhanh</h3>
              <button
                onClick={handleOpenEmailModal}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-100 flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5"/>
                Gửi Email báo cáo nhanh
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-3 text-xs leading-relaxed text-slate-600">
              <p className="font-bold text-slate-700 text-sm">💡 Chức năng Trả kết quả & Email nhanh:</p>
              <p>1. Gửi email tổng hợp nhanh danh sách kết quả xét tuyển cho Ban giám hiệu, các bộ phận tuyển sinh và tư vấn của cơ sở.</p>
              <p>2. Hệ thống tự động tạo, tối ưu hóa kích thước và đính kèm các tệp **PDF Thư chúc mừng / Bản cam kết** trực tiếp cho từng bé đạt yêu cầu khi gửi mail.</p>
              <p>3. Đảm bảo bảo mật tối đa, đồng bộ hóa 100% thời gian thực kết quả duyệt.</p>
            </div>
          </div>
        </div>
      )}

      {/* PRINT DIALOG PREVIEW MODAL */}
      <Modal open={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} title={isInvitation ? "Mẫu Thư mời khảo sát" : isCommitment ? "Bản Cam kết học tập" : "Mẫu Thư Chúc mừng"} size="xl" footer={<><button onClick={() => setIsPrintModalOpen(false)} className="flex-1 text-xs font-black uppercase text-slate-400 hover:text-slate-600">Đóng</button><button onClick={handlePrintPDF} className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer"><Printer className="w-4 h-4" /> In / Tải PDF</button></>}>
        <div className="bg-slate-50 p-4 border border-slate-100 rounded-3xl overflow-y-auto max-h-[60vh] flex items-center justify-center">
          <div id="print-area-reports" className="bg-white rounded-none border border-slate-300 w-[210mm] min-w-[210mm] max-w-[210mm] h-[297mm] min-h-[297mm] p-[20mm_20mm_35mm_20mm] box-border relative flex flex-col justify-start overflow-hidden select-none font-serif text-slate-800 leading-normal" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            
            {/* Watermark */}
            {studentCampusConfig?.background && (
              <img crossOrigin={(studentCampusConfig.background || "").startsWith("data:") ? undefined : "anonymous"} className="print-watermark" src={studentCampusConfig.background} alt="Watermark" style={{ display: "block", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "110mm", height: "auto", opacity: 0.04, zIndex: 0, pointerEvents: "none" }} />
            )}

            {/* Content wrapped */}
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                {/* Header logo */}
                <div className="header-container" style={{ display: "flex", flexDirection: "column", borderBottom: "1.5px solid #00A6A9", paddingBottom: "8px", marginBottom: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {studentCampusConfig?.logo ? (
                      <img src={studentCampusConfig.logo} alt="Logo" style={{ maxHeight: "48px", objectFit: "contain" }} />
                    ) : (
                      <svg style={{ height: "48px", fill: "#00A6A9" }} viewBox="0 0 260 50"><text x="0" y="38" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="34" letterSpacing="-1">SKY-LINE</text><circle cx="178" cy="26" r="6" /></svg>
                    )}
                  </div>
                  <div style={{ textAlign: "left", marginTop: "4px" }}>
                    <h4 style={{ fontFamily: "Arial, sans-serif", fontSize: "11pt", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", color: "#1e293b", margin: 0 }}>
                      {selectedLevel === "preschool" ? "TRƯỜNG MẦM NON SKY-LINE" : "TRƯỜNG TIỂU HỌC, THCS VÀ THPT SKY-LINE"}
                    </h4>
                  </div>
                </div>

                {/* Title */}
                <h2 style={{ textAlign: "center", fontSize: "22pt", fontWeight: "bold", color: "#0f172a", textTransform: "uppercase", letterSpacing: "2px", margin: "16px 0 24px 0" }}>
                  {studentCampusConfig?.title}
                </h2>

                {/* Greeting */}
                <p style={{ fontSize: "14pt", fontStyle: "italic", marginBottom: "12px", color: "#1e293b", textIndent: 0 }}>
                  {isInvitation ? (
                    <>Kính gửi Quý Phụ huynh và em <strong style={{ fontWeight: "bold", color: "#0f172a" }}>{selectedReportStudent?.fullName}</strong>,</>
                  ) : (
                    <>Thân gửi con <strong style={{ fontWeight: "bold", color: "#0f172a" }}>{selectedReportStudent?.fullName}</strong>,</>
                  )}
                </p>

                {/* Body template text */}
                <div style={{ flexGrow: 1, fontFamily: '"Times New Roman", Times, serif' }}>
                  {renderTemplate(
                    studentCampusConfig?.content || "",
                    selectedReportStudent
                  ).split('\n').filter(Boolean).map((para, idx) => {
                    const isList = /^\s*[\d•\-*]+/.test(para);
                    return (
                      <p key={idx} style={isList ? { paddingLeft: "24px", fontWeight: "bold", color: "#374151", margin: "4px 0", fontSize: "13.5pt" } : { textIndent: "10mm", margin: "0 0 14px 0", textAlign: "justify", lineBreak: "auto", lineHeight: "1.6", fontSize: "13.5pt" }}>
                        {para}
                      </p>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Signatures dual-mode support */}
              {isCommitment ? (
                <div style={{ width: "100%", display: "flex", justifyContent: "space-between", marginTop: "auto", paddingTop: "20px", pageBreakInside: "avoid", breakInside: "avoid" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", width: "45%" }}>
                    <p style={{ fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", margin: 0, textAlign: "center", textIndent: 0, color: "#475569" }}>ĐẠI DIỆN GIA ĐÌNH</p>
                    <p style={{ fontSize: "9pt", fontStyle: "italic", color: "#64748b", marginTop: "4px", textIndent: 0 }}>(Ký và ghi rõ họ tên)</p>
                    <div style={{ height: "60px", display: "flex", alignItems: "flex-end", justifyContent: "center", margin: "8px 0" }}>
                      <span style={{ fontSize: "10pt", color: "#cbd5e1", fontStyle: "italic" }}>Ký tên</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", width: "45%" }}>
                    <p style={{ fontSize: "12pt", fontStyle: "italic", color: "#555555", marginBottom: "4px", textAlign: "center", textIndent: 0 }}>{formattedLetterDate}</p>
                    <p style={{ fontSize: "11pt", fontWeight: "bold", textTransform: "uppercase", margin: 0, textAlign: "center", textIndent: 0, color: "#0f172a" }}>TM. HỘI ĐỒNG TUYỂN SINH</p>
                    <p style={{ fontSize: "9pt", fontWeight: "bold", textTransform: "uppercase", color: "#475569", margin: "2px 0 0 0", textAlign: "center", textIndent: 0 }}>GIÁM ĐỐC ĐIỀU HÀNH SKY-LINE {campusTitleSuffix}</p>
                    <div style={{ height: "60px", display: "flex", alignItems: "center", justifyContent: "center", margin: "8px 0" }}>
                      {studentCampusConfig?.signature ? (
                        <img src={studentCampusConfig.signature} alt="Signature" style={{ maxHeight: "60px", objectFit: "contain" }} />
                      ) : (
                        <svg style={{ height: "60px" }} viewBox="0 0 100 40" width="120"><path d="M10,25 Q30,5 50,20 T90,15 M30,12 Q45,28 60,8" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round"/></svg>
                      )}
                    </div>
                    <p style={{ fontSize: "12pt", fontWeight: "bold", margin: 0, textAlign: "center", textIndent: 0, color: "#1e293b" }}>{selectedReportStudent?.signatureName || studentCampusConfig?.directorName || "Trần Thị Thanh"}</p>
                  </div>
                </div>
              ) : (
                <div style={{ alignSelf: "flex-end", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minWidth: "70mm", marginTop: "auto", paddingTop: "20px", pageBreakInside: "avoid", breakInside: "avoid" }}>
                  <p style={{ fontSize: "12pt", fontStyle: "italic", color: "#555555", marginBottom: "4px", textAlign: "center", textIndent: 0 }}>{formattedLetterDate}</p>
                  <p style={{ fontSize: "12pt", fontWeight: "bold", textTransform: "uppercase", margin: 0, textAlign: "center", textIndent: 0, color: "#0f172a" }}>TM. HỘI ĐỒNG TUYỂN SINH</p>
                  <p style={{ fontSize: "10pt", fontWeight: "bold", textTransform: "uppercase", color: "#475569", margin: "2px 0 0 0", textAlign: "center", textIndent: 0 }}>GIÁM ĐỐC ĐIỀU HÀNH SKY-LINE {campusTitleSuffix}</p>
                  <div style={{ height: "60px", display: "flex", alignItems: "center", justifyContent: "center", margin: "8px 0" }}>
                    {studentCampusConfig?.signature ? (
                      <img src={studentCampusConfig.signature} alt="Signature" style={{ maxHeight: "60px", objectFit: "contain" }} />
                    ) : (
                      <svg style={{ height: "60px" }} viewBox="0 0 100 40" width="120"><path d="M10,25 Q30,5 50,20 T90,15 M30,12 Q45,28 60,8" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round"/></svg>
                    )}
                  </div>
                  <p style={{ fontSize: "13pt", fontWeight: "bold", margin: 0, textAlign: "center", textIndent: 0, color: "#1e293b" }}>{selectedReportStudent?.signatureName || studentCampusConfig?.directorName || "Trần Thị Thanh"}</p>
                </div>
              )}

              {/* Footer Banner */}
              <div className="footer-container" style={{ position: "absolute", bottom: "8mm", left: "20mm", right: "20mm", width: "auto", zIndex: 10 }}>
                {studentCampusConfig?.footer ? (
                  <img src={studentCampusConfig.footer} alt="Footer" style={{ width: "100%", maxHeight: "100px", objectFit: "contain" }} />
                ) : (
                  <div style={{ width: "100%", fontFamily: "Arial, sans-serif", boxSizing: "border-box", textAlign: "left" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", width: "100%" }}>
                      <span style={{ fontWeight: "bold", color: "#00A6A9", whiteSpace: "nowrap", textTransform: "uppercase", fontSize: "9.5pt", letterSpacing: "0.5px" }}>HỆ THỐNG GIÁO DỤC SKY-LINE</span>
                      <div style={{ flexGrow: 1, borderTop: "1px solid rgba(0, 166, 169, 0.7)", height: 0, marginTop: "2px" }}></div>
                      <span style={{ fontWeight: "600", color: "#00A6A9", whiteSpace: "nowrap", textTransform: "lowercase", fontSize: "9pt" }}>www.skylineschool.edu.vn</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </Modal>

      {/* EMAIL QUICK MODAL */}
      <Modal open={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} title="Gửi email Báo cáo Nhanh" footer={<><button onClick={() => setIsEmailModalOpen(false)} className="flex-1 text-xs font-black uppercase text-slate-400 hover:text-slate-600">Hủy</button><button onClick={handleSendEmailsSubmit} disabled={emailSending} className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer">{emailSending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />}{emailSending ? emailSendingStatus : "Gửi ngay"}</button></>}>
        <div className="space-y-4">
          <Field label="Địa chỉ Email người nhận (CC nhiều người dùng dấu phẩy)" required>
            <input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="Nhập email..." className={inp} />
          </Field>
          
          <Field label="Tiêu đề Email" required>
            <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Nhập tiêu đề email..." className={inp} />
          </Field>

          <div className="flex items-center gap-2 p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
            <input type="checkbox" id="attach_checkbox" checked={attachLetters} onChange={e => setAttachLetters(e.target.checked)} className="w-4 h-4 text-indigo-600 border-slate-300 rounded" />
            <label htmlFor="attach_checkbox" className="text-xs font-bold text-indigo-700 cursor-pointer">Tự động đính kèm tệp mẫu Thư PDF cho từng bé Đạt</label>
          </div>
        </div>
      </Modal>

      {/* Native Print Media Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area-reports, #print-area-reports * {
            visibility: visible;
          }
          #print-area-reports {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 20mm 20mm 35mm 20mm;
            box-sizing: border-box;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 0mm !important;
          }
        }
      `}</style>
    </div>
  );
}

// Dialog components helper
function ConfirmDialog({ open, onClose, onConfirm, message }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-rose-500" />
        </div>
        <p className="font-black text-slate-800 text-base mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all cursor-pointer">Hủy</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-3 bg-rose-500 text-white font-black rounded-2xl hover:bg-rose-600 transition-all cursor-pointer">Xác nhận</button>
        </div>
      </div>
    </div>
  );
}
