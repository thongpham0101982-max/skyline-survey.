"use client"
import { parseCommittedSubjects } from "@/lib/subject-mapping"
import { getDefaultAcademicYearClient } from "@/lib/academicYear"
const DEFAULT_WATERMARK_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%23007A87'><path d='M10,80 Q50,40 90,20 Q60,50 10,80 Z'/><path d='M30,80 Q60,55 90,35 Q65,60 30,80 Z'/></svg>";

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  Plus, Search, Edit2, Trash2, Users, Settings, Clock, BarChart3,
  Upload, Download, Layers, Database, UserCheck, Calendar, X, Check, AlertCircle,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Loader2, BookOpen, GraduationCap, RefreshCw, Building,
  Tag, FolderOpen, Hash, MoreVertical, PenLine, CheckCircle2,
  Filter, ClipboardCheck, ClipboardList, ArrowRight, UserPlus, Info,
  FileSpreadsheet, Pencil, Mail, FileText,
  Phone, Printer, Lock, Zap, CheckSquare, Square, Eye,
  HeartHandshake, Brain, Compass, ExternalLink, ShieldCheck, Send, Monitor, Smartphone
} from "lucide-react"
import * as XLSX from "xlsx"
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import { StudentOrientationModal } from "@/components/orientation/StudentOrientationModal"
import { StudentOrientationReportModal } from "@/components/orientation/StudentOrientationReportModal"
import { PvdhOrientationModal } from "@/components/orientation/PvdhOrientationModal"
import { getOrientationGradeGroupConfig } from "@/lib/orientation/criteria-config"
import {
  BM_SHEET_STATUS_OPTIONS,
  PVDH_SEED_TEMPLATES,
  getDefaultPvdhCodeForGrade,
  isBmKtdbclTemplate,
  PVDH_WORKFLOW_STATUS_LABELS,
  FURTHER_INQUIRY_OPTIONS,
  formatFollowUpActionsToText,
  normalizeK12GradeNumber,
  type PvdhSectionCode,
  type PvdhFieldConfig,
} from "@/lib/pvdh/constants"
import { parseTeacherSummary } from "@/lib/pvdh/validation"
import TciResultReviewPanel from "@/components/tci/TciResultReviewPanel"
import {
  EmailRoutingConfigModal,
  parseSavedEmailRoutingConfig,
  type EmailRoutingConfigData
} from "./EmailRoutingConfigModal"
import { CompletenessCheckModal } from "./CompletenessCheckModal"
import {
  checkStudentAssessmentCompleteness,
  type StudentCompletenessResult
} from "@/lib/entranceCompleteness"
import {
  isSuperAdminRole,
  isKtdbclEntranceRole,
  isGdcsOrBghEntranceRole,
  isGiaoVuEntranceRole,
  isTuVanEntranceRole,
  isCampusScopedEntranceRole,
} from "@/lib/entrance-progress/constants"

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
  cityName?: string; districtName?: string; wardName?: string; countryName?: string;
  oldSchoolName?: string; oldSchoolType?: string;
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
  destinationSchools?: any[];
  currentUser?: { id: string; role: string; campusIds: string[]; fullName?: string } | null;
  rolePermissions?: { module: string, canRead: boolean, canCreate: boolean, canUpdate: boolean, canDelete: boolean }[];
}

// ========= CONSTANTS =========
const CATEGORY_TYPES = [
  { code: "DOI_TUONG_TS",  label: "Đối tượng Tuyển sinh", color: "from-pink-500 to-rose-500" },
  { code: "DIEN_KS",       label: "Diện Khảo sát",      color: "from-teal-600 to-emerald-600" },
  { code: "HINH_THUC_KS",  label: "Hình thức KS",        color: "from-blue-500 to-cyan-500" },
  { code: "HS_HT_HOC_SINH", label: "Hồ sơ/Bảng điểm",   color: "from-emerald-500 to-teal-500" },
  { code: "HOC_KY",        label: "Học kỳ / Năm TS",     color: "from-amber-500 to-amber-600" },
  { code: "KY_KS",          label: "Kỳ Khảo sát",         color: "from-amber-500 to-red-500" },
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
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${m.cls}`}>{m.label}</span>
}

function Field({ label, required, children }: { label:string; required?:boolean; children:React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 ml-0.5">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
const inp = "h-10 w-full pl-3.5 pr-3.5 bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-xs font-medium rounded-xl outline-none transition-all focus:ring-3 focus:ring-[#00A19A]/15 focus:border-[#008B85] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"

function Modal({ open, onClose, title, size="md", children, footer }: {
  open:boolean; onClose:()=>void; title:string; size?:"sm"|"md"|"lg"|"xl"|"2xl";
  children:React.ReactNode; footer:React.ReactNode
}) {
  if (!open) return null
  const w = size==="2xl" ? "max-w-6xl" : size==="xl" ? "max-w-5xl" : size==="lg" ? "max-w-3xl" : size==="sm" ? "max-w-sm" : "max-w-lg"
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"/>
      <div className={`relative bg-white w-full ${w} rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200`} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-1.5 h-5 rounded-full bg-[#003B3A] shrink-0" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">{title}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200/70 transition-colors text-slate-500 hover:text-slate-800 cursor-pointer" title="Đóng cửa sổ"><X className="w-4 h-4"/></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
        <div className="flex gap-3 flex-shrink-0 text-xs font-semibold">{footer}</div>
      </div>
    </div>
  )
}

function ConfirmDialog({ open, onClose, onConfirm, message }: { open:boolean; onClose:()=>void; onConfirm:()=>void; message:string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose}/>
      <div className="relative bg-white rounded-[28px] border border-slate-100 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.15)] p-7 max-w-[360px] w-full text-center animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"><X className="w-4 h-4" /></button>
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border-4 border-rose-100/40 text-rose-500 flex items-center justify-center mx-auto mb-5 shadow-sm"><Trash2 className="w-6 h-6" /></div>
        <h3 className="text-base font-black text-slate-800 tracking-tight mb-2">Xác nhận xóa</h3>
        <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6 px-1">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer active:scale-[0.97]">Hủy</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md shadow-rose-500/10 hover:brightness-105 active:scale-[0.97] transition-all cursor-pointer" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>Xóa</button>
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

function Spin() { return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-teal-700 animate-spin opacity-50"/></div> }
function Empty({ icon:Icon, text, sub }: { icon:any; text:string; sub?:string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 flex items-center justify-center mb-5 text-xs font-semibold"><Icon className="w-10 h-10 text-slate-200"/></div>
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


const getCampusAndSchoolName = (rawCampusCode: string) => {
  const clean = (rawCampusCode || "").toUpperCase();
  let actualCampusName = rawCampusCode || "";

  if (clean.includes("CS1") || clean.includes("RIVERSIDE")) {
    actualCampusName = "Sky-Line Riverside";
  } else if (clean.includes("CS2") || clean.includes("CENTRAL")) {
    actualCampusName = "Sky-Line Central";
  } else if (clean.includes("CS3") || clean.includes("GLOBAL")) {
    actualCampusName = "Sky-Line Global";
  } else if (clean.includes("CS4") || clean.includes("HILL")) {
    actualCampusName = "Sky-Line Hill";
  } else if (clean.includes("CS5") || clean.includes("BEACH")) {
    actualCampusName = "Sky-Line Beach";
  } else if (clean.includes("CS6") || clean.includes("QUỐC TẾ") || clean.includes("INTERNATIONAL")) {
    actualCampusName = "Sky-Line International";
  } else if (clean.includes("CS7") || clean.includes("SÁNG TẠO")) {
    actualCampusName = "Trung tâm Sáng tạo";
  }

  let schoolNameFull = "Trường TH, THCS và THPT Sky-Line";
  let truongName = "TH, THCS và THPT Sky-Line";
  if (actualCampusName === "Sky-Line Hill") {
    schoolNameFull = "Trường TH, THCS và THPT Sky-Line Hill";
    truongName = "TH, THCS và THPT Sky-Line Hill";
  } else {
    schoolNameFull = "Trường TH, THCS và THPT Sky-Line";
    truongName = "TH, THCS và THPT Sky-Line";
  }

  return { actualCampusName, schoolNameFull, truongName };
};

const renderTemplate = (template, student) => {
  if (!template) return "";
  
  const rawGrade = student?.grade || "1";
  const gradeMatch = rawGrade.toString().match(/\d+/);
  const numericGrade = gradeMatch ? gradeMatch[0] : rawGrade;
  
  const comSubs = Array.isArray(student?.committedSubjects) 
    ? student.committedSubjects.join(", ") 
    : (student?.committedSubjects || "");
  
  const { actualCampusName, schoolNameFull, truongName } = getCampusAndSchoolName(student?.admissionCampus);
  return template
    .replace(/\{\{schoolName\}\}/g, schoolNameFull)
    .replace(/\{\{truong\}\}/g, truongName)
    .replace(/\{\{fullName\}\}/g, student?.fullName || "Lê Trà My")
    .replace(/\{\{grade\}\}/g, numericGrade)
    .replace(/\{\{hocKy\}\}/g, student?.hocKy || "1")
    .replace(/\{\{surveyFormType\}\}/g, student?.surveyFormType || "Hội nhập S")
    .replace(/\{\{admissionCampus\}\}/g, actualCampusName || "")
    .replace(/\{\{directorNote\}\}/g, student?.directorNote || "")
    .replace(/\{\{committedSubjects\}\}/g, comSubs)
    .replace(/\{\{signatureName\}\}/g, student?.signatureName || "");
};



const danangWards = [
  "Hải Châu", "Hòa Cường", "Thanh Khê", "An Khê", "An Hải", "Sơn Trà", "Ngũ Hành Sơn", "Hòa Khánh", "Hải Vân", "Liên Chiểu", 
  "Cẩm Lệ", "Hòa Xuân", "Hòa Vang", "Hòa Tiến", "Bà Nà", "Hoàng Sa (Đặc khu)", "Núi Thành", "Tam Mỹ", "Tam Anh", "Đức Phú", 
  "Tam Xuân", "Tam Hải", "Tam Kỳ", "Quảng Phú", "Hương Trà", "Bàn Thạch", "Tây Hồ", "Chiên Đàn", "Phú Ninh", "Lãnh Ngọc", 
  "Tiên Phước", "Thạnh Bình", "Sơn Cẩm Hà", "Trà Liên", "Trà Giáp", "Trà Tân", "Trà Đốc", "Trà My", "Nam Trà My", "Trà Tập", 
  "Trà Vân", "Trà Linh", "Trà Leng", "Thăng Bình", "Thăng An", "Thăng Trường", "Thăng Điền", "Thăng Phú", "Đồng Dương", "Quế Sơn Trung", 
  "Quế Sơn", "Xuân Phú", "Nông Sơn", "Quế Phước", "Duy Nghĩa", "Nam Phước", "Duy Xuyên", "Thu Bồn", "Điện Bàn", "Điện Bàn Đông", 
  "An Thắng", "Điện Bàn Bắc", "Điện Bàn Tây", "Gò Nổi", "Hội An", "Hội An Đông", "Hội An Tây", "Tân Hiệp", "Đại Lộc", "Hà Nha", 
  "Thượng Đức", "Vu Gia", "Phú Thuận", "Thạnh Mỹ", "Bến Giằng", "Nam Giang", "Đắc Pring", "La Dêê", "La Êê", "Sông Vàng", 
  "Sông Kôn", "Đông Giang", "Bến Hiên", "Avương", "Tây Giang", "Hùng Sơn", "Hiệp Đức", "Việt An", "Phước Trà", "Khâm Đức", 
  "Phước Năng", "Phước Chánh", "Phước Thành", "Phước Hiệp"
].sort();

const vietnamProvinces = [
  "Thành phố Đà Nẵng",
  "Thành phố Hà Nội",
  "Thành phố Hồ Chí Minh",
  "Thành phố Hải Phòng",
  "Thành phố Cần Thơ",
  "An Giang",
  "Bà Rịa - Vũng Tàu",
  "Bắc Giang",
  "Bắc Kạn",
  "Bạc Liêu",
  "Bắc Ninh",
  "Bến Tre",
  "Bình Định",
  "Bình Dương",
  "Bình Phước",
  "Bình Thuận",
  "Cà Mau",
  "Cao Bằng",
  "Đắc Lắk",
  "Đắk Nông",
  "Điện Biên",
  "Đồng Nai",
  "Đồng Tháp",
  "Gia Lai",
  "Hà Giang",
  "Hà Nam",
  "Hà Tĩnh",
  "Hải Dương",
  "Hậu Giang",
  "Hòa Bình",
  "Hưng Yên",
  "Khánh Hòa",
  "Kiên Giang",
  "Kon Tum",
  "Lai Châu",
  "Lâm Đồng",
  "Lạng Sơn",
  "Lào Cai",
  "Long An",
  "Nam Định",
  "Nghệ An",
  "Ninh Bình",
  "Ninh Thuận",
  "Phú Thọ",
  "Phú Yên",
  "Quảng Bình",
  "Quảng Nam",
  "Quảng Ngãi",
  "Quảng Ninh",
  "Quảng Trị",
  "Sóc Trăng",
  "Sơn La",
  "Tây Ninh",
  "Thái Bình",
  "Thái Nguyên",
  "Thanh Hóa",
  "Thừa Thiên Huế",
  "Tiền Giang",
  "Trà Vinh",
  "Tuyên Quang",
  "Vĩnh Long",
  "Vĩnh Phúc",
  "Yên Bái"
];

const worldCountries = [
  "Hoa Kỳ (Mỹ)", "Úc (Australia)", "Singapore", "Anh (UK)", "Nhật Bản", "Hàn Quốc", "Canada", "Lào",
  "Pháp", "Đức", "Trung Quốc", "Đài Loan", "Hồng Kông", "Thái Lan", "Malaysia", "Campuchia", "New Zealand",
  "Hà Lan", "Thụy Sĩ", "Ý (Italy)", "Nga", "Đan Mạch", "Thụy Điển", "Phần Lan", "Na Uy", "Tây Ban Nha",
  "Bỉ", "Áo", "Ireland", "Ấn Độ", "Philippines", "Indonesia", "Các Tiểu vương quốc Ả Rập Thống nhất (UAE)",
  "Saudi Arabia", "Qatar", "Ba Lan", "Cộng hòa Séc", "Hungary", "Hy Lạp", "Bồ Đào Nha", "Brazil", "Argentina",
  "Chile", "South Africa (Nam Phi)", "Ai Cập", "Thổ Nhĩ Kỳ", "Khác"
];

const defaultDanangSchools = [
  { name: "THCS và THPT Nguyễn Khuyến", schoolType: "PUBLIC" },
  { name: "THPT Phan Châu Trinh", schoolType: "PUBLIC" },
  { name: "THPT Trần Phú", schoolType: "PUBLIC" },
  { name: "THPT Thái Phiên", schoolType: "PUBLIC" },
  { name: "THPT Hoàng Hoa Thám", schoolType: "PUBLIC" },
  { name: "THPT Hòa Vang", schoolType: "PUBLIC" },
  { name: "THPT Nguyễn Trãi", schoolType: "PUBLIC" },
  { name: "THPT Ông Ích Khiêm", schoolType: "PUBLIC" },
  { name: "THPT Ngũ Hành Sơn", schoolType: "PUBLIC" },
  { name: "THPT Ngô Quyền", schoolType: "PUBLIC" },
  { name: "THPT Chuyên Lê Quý Đôn", schoolType: "PUBLIC" },
  { name: "TH, THCS & THPT Sky-Line", schoolType: "PRIVATE" },
  { name: "TH, THCS, THPT Hoàng Sa", schoolType: "PRIVATE" },
  { name: "TH, THCS, THPT FPT Đà Nẵng", schoolType: "PRIVATE" },
  { name: "Trường Tiểu học Phù Đổng", schoolType: "PUBLIC" },
  { name: "Trường Tiểu học Lý Công Uẩn", schoolType: "PUBLIC" },
  { name: "Trường Tiểu học Núi Thành", schoolType: "PUBLIC" },
  { name: "Trường Tiểu học Hoàng Dư Khưng", schoolType: "PUBLIC" },
  { name: "Trường Tiểu học Lê Đình Chinh", schoolType: "PUBLIC" },
  { name: "Trường Tiểu học Trần Đại Nghĩa", schoolType: "PUBLIC" },
  { name: "Trường THCS Kim Đồng", schoolType: "PUBLIC" },
  { name: "Trường THCS Tây Sơn", schoolType: "PUBLIC" },
  { name: "Trường THCS Lê Độ", schoolType: "PUBLIC" },
  { name: "Trường THCS Nguyễn Huệ", schoolType: "PUBLIC" },
  { name: "Trường THCS Lý Thường Kiệt", schoolType: "PUBLIC" },
  { name: "Trường THCS Nguyễn Bỉnh Khiêm", schoolType: "PUBLIC" }
];

// ========= MAIN =========

// Helper to parse approval history entries from directorNote
export interface ApprovalHistoryItem {
  timestamp: string;
  approver: string;
  oldResult: string;
  newResult: string;
  note: string;
}

export function parseApprovalHistory(note: string | undefined | null): { cleanNote: string; history: ApprovalHistoryItem[] } {
  if (!note) return { cleanNote: "", history: [] };

  const historyMatch = note.match(/--- LỊCH SỬ XÉT DUYỆT & HIỆU CHỈNH ---\r?\n([\s\S]*)$/);
  let history: ApprovalHistoryItem[] = [];
  let cleanNote = note;

  if (historyMatch) {
    cleanNote = note.replace(/--- LỊCH SỬ XÉT DUYỆT & HIỆU CHỈNH ---\r?\n[\s\S]*$/, "").trim();
    const historyBlock = historyMatch[1];
    const lines = historyBlock.split("\n").map(l => l.trim()).filter(Boolean);
    
    lines.forEach(line => {
      const parts = line.replace(/^•\s*/, "").split(" | ");
      if (parts.length >= 3) {
        const timestamp = parts[0] || "";
        const approver = parts[1] || "";
        const results = parts[2] || "";
        const [oldRes, newRes] = results.split(" ➔ ");
        const notePart = parts.slice(3).join(" | ").replace(/^Lý do:\s*/, "");
        history.push({
          timestamp,
          approver,
          oldResult: oldRes || "—",
          newResult: newRes || "—",
          note: notePart || ""
        });
      }
    });
  }

  return { cleanNote, history };
}

export function XetDuyetK12Client({ academicYears = [], campuses = [], examBoardUsers = [], subjects: initialSubjects = [], eduSystems = [], configs: initialConfigs = [], grades = [], teachers = [], departments = [], giaoVuCSUsers = [], gdcsUsers = [], currentUser = null, rolePermissions = [] }: Props) {
  const TAB_PERMISSION_MAP: Record<string, string> = {
    periods: "INPUT_ASSESSMENTS_PERIODS",
    categories: "INPUT_ASSESSMENTS_CATEGORIES",
    subjects: "INPUT_ASSESSMENTS_SUBJECTS",
    mapping: "INPUT_ASSESSMENTS_MAPPING",
    students: "INPUT_ASSESSMENTS_STUDENTS",
    assignments: "INPUT_ASSESSMENTS_ASSIGNMENTS",
    reports: "INPUT_ASSESSMENTS_REPORTS",
  };

  const getTabPermissions = (tabId: string) => {
    const userRole = (currentUser?.role || "").toUpperCase().trim();
    if (isSuperAdminRole(userRole) || isKtdbclEntranceRole(userRole)) {
      return { canRead: true, canCreate: true, canUpdate: true, canDelete: true };
    }

    // Nguyên tắc phân tách nhiệm vụ: Giáo vụ và Tư vấn chỉ được XEM tiến độ xét duyệt (Read-only),
    // tuyệt đối không được phê duyệt / ký kết luận của Giám đốc Cơ sở
    if (isGiaoVuEntranceRole(userRole) || isTuVanEntranceRole(userRole)) {
      const allowed = ["students", "reports"].includes(tabId);
      return {
        canRead: allowed,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
      };
    }

    const requiredModule = TAB_PERMISSION_MAP[tabId];
    const perm = rolePermissions?.find(p =>
      p.module === requiredModule ||
      (tabId === "reports" && (p.module === "XDKQ_K12" || p.module === "XET_DUYET_K12" || p.module === "XET_DUYET_KET_QUA"))
    );
    if (perm) {
      return {
        canRead: !!perm.canRead,
        canCreate: !!perm.canCreate,
        canUpdate: !!perm.canUpdate,
        canDelete: !!perm.canDelete,
      };
    }

    // Fallback cho Giám đốc Cơ sở / BGH
    if (isGdcsOrBghEntranceRole(userRole)) {
      const allowed = ["students", "reports"].includes(tabId);
      return {
        canRead: allowed,
        canCreate: allowed,
        canUpdate: allowed,
        canDelete: false,
      };
    }

    return { canRead: true, canCreate: false, canUpdate: false, canDelete: false };
  };

  const [tab, setTab] = useState("reports");

  const tabPerms = getTabPermissions(tab);
  const cannotCreate = !tabPerms.canCreate;
  const cannotUpdate = !tabPerms.canUpdate;
  const cannotDelete = !tabPerms.canDelete;
  const isReadOnly = tabPerms.canRead && !tabPerms.canCreate && !tabPerms.canUpdate && !tabPerms.canDelete;

  const EMAIL_MAP = useMemo(() => {
    const sanitizeAddr = (raw?: string | null) =>
      String(raw || "")
        .trim()
        .replace(/@dkylineschool\.edu\.vn$/i, "@skylineschool.edu.vn");

    const map = {
      tuvan: {
        CS1: "thuongttn@skylineschool.edu.vn",
        CS2: "hoaipt@skylineschool.edu.vn, dinhnth@skylineschool.edu.vn, doanhtt@skylineschool.edu.vn, huyennt@skylineschool.edu.vn",
        CS3: "thungatt@skylineschool.edu.vn, hapvy@skylineschool.edu.vn",
        CS4: "senttt@skylineschool.edu.vn, anhntm@skylineschool.edu.vn",
        CS5: "linhnmh@skylineschool.edu.vn, quyenttx@skylineschool.edu.vn",
      },
      giaovu: {
        CS1: "phuongvt@skylineschool.edu.vn, thuda@skylineschool.edu.vn",
        CS2: "thuda@skylineschool.edu.vn, dunglp@skylineschool.edu.vn",
        CS3: "thuda@skylineschool.edu.vn",
        CS4: "bichtramtt@skylineschool.edu.vn",
        CS5: "dunglp@skylineschool.edu.vn",
      },
      gdcs: {
        CS1: "longtt@skylineschool.edu.vn",
        CS2: "khanhpt@skylineschool.edu.vn",
        CS3: "thanhtt@skylineschool.edu.vn",
        CS4: "trungct@skylineschool.edu.vn",
        CS5: "trungdq1@skylineschool.edu.vn",
      },
      cc: "ktdbcl@skylineschool.edu.vn"
    };

    const appendUniqueEmail = (currentStr: string, newEmail: string) => {
      const clean = sanitizeAddr(newEmail).toLowerCase();
      if (!clean || !clean.includes("@") || /^(giaovu|tuyensinh|tuvan|gdcs)\.cs\d+@skylineschool\.edu\.vn$/i.test(clean)) {
        return currentStr;
      }
      const list = String(currentStr || "")
        .split(/[,;]/)
        .map((e) => e.trim())
        .filter(Boolean);
      if (!list.some((e) => e.toLowerCase() === clean)) {
        list.push(clean);
      }
      return list.join(", ");
    };

    // 1. Dynamic GĐCS Lookup from campuses
    (campuses || []).forEach((c) => {
      const csCode = c.campusCode;
      if (csCode && csCode in map.gdcs) {
        const managerEmail = sanitizeAddr(c.manager?.teacher?.email);
        if (managerEmail && managerEmail.includes('@')) {
          map.gdcs[csCode] = managerEmail;
        } else {
          const matchedTeacher = (teachers || []).find((t) => t.teacherCode === c.manager?.email);
          const tEmail = sanitizeAddr(matchedTeacher?.email);
          if (tEmail && tEmail.includes('@')) {
            map.gdcs[csCode] = tEmail;
          }
        }
      }
    });

    // 2. Dynamic Tổ Giáo vụ and Tổ Tư vấn cơ sở Lookup from teachers
    (teachers || []).forEach((t) => {
      const csCode = t.campus?.campusCode;
      if (csCode && csCode in map.giaovu) {
        const deptName = t.departmentRel?.name?.toLowerCase() || '';
        const deptCode = t.departmentRel?.code?.toLowerCase() || '';
        const cleanMail = sanitizeAddr(t.email);
        const hasEmail = cleanMail && cleanMail.includes('@');
        
        if (hasEmail) {
          if (deptName.includes('giáo vụ') || deptCode.includes('gvu') || deptCode.includes('giaovu')) {
            map.giaovu[csCode] = appendUniqueEmail(map.giaovu[csCode], cleanMail);
          }
          if (deptName.includes('tư vấn') || deptName.includes('tuyển sinh') || deptCode.includes('tuvan') || deptCode.includes('tuyensinh')) {
            map.tuvan[csCode] = appendUniqueEmail(map.tuvan[csCode], cleanMail);
          }
        }
      }
    });

    return map;
  }, [campuses, teachers]);

  const allMapEmails = useMemo(() => [
    ...Object.values(EMAIL_MAP.tuvan),
    ...Object.values(EMAIL_MAP.giaovu),
    ...Object.values(EMAIL_MAP.gdcs),
    EMAIL_MAP.cc
  ], [EMAIL_MAP]);

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
    { id: "khoi_10_noi_tinh", label: "Khối 10 - Nội tỉnh" },
    { id: "khoi_10_ngoai_tinh", label: "Khối 10 - Ngoại tỉnh" },
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
      let parsed = {};
      if (savedTargets) {
        try {
          parsed = JSON.parse(savedTargets);
        } catch (e) {}
      }
      let updated = false;
      if (!parsed["khoi_1"]) {
        parsed["khoi_1"] = ["Nội tỉnh", "Ngoại tỉnh"];
        updated = true;
      }
      if (!parsed["khoi_2_5"]) {
        parsed["khoi_2_5"] = ["Nội tỉnh", "Ngoại tỉnh"];
        updated = true;
      }
      if (!parsed["khoi_6"]) {
        parsed["khoi_6"] = ["Nội tỉnh", "Ngoại tỉnh"];
        updated = true;
      }
      if (!parsed["khoi_10_noi_tinh"]) {
        parsed["khoi_10_noi_tinh"] = ["Nội tỉnh"];
        updated = true;
      }
      if (!parsed["khoi_10_ngoai_tinh"]) {
        parsed["khoi_10_ngoai_tinh"] = ["Ngoại tỉnh"];
        updated = true;
      }
      if (!parsed["khoi_10"]) {
        parsed["khoi_10"] = ["Nội tỉnh", "Ngoại tỉnh"];
        updated = true;
      }
      if (updated) {
        localStorage.setItem('admission_doc_targets', JSON.stringify(parsed));
      }
      setDocGroupTargets(parsed);
    }
  }, []);



  const [docGroupGrades, setDocGroupGrades] = useState<Record<string, string[]>>({
    "khoi_1": ["Khối 1"],
    "khoi_2_5": ["Khối 2", "Khối 3", "Khối 4", "Khối 5"],
    "khoi_6": ["Khối 6"],
    "khoi_7_9": ["Khối 7", "Khối 8", "Khối 9"],
    "khoi_10_noi_tinh": ["Khối 10"],
    "khoi_10_ngoai_tinh": ["Khối 10"],
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
      const matchTarget = activeTargets.length === 0 || !d.targets || d.targets.length === 0 || d.targets.some(t => activeTargets.includes(t));
      const matchGrade = activeGrades.length === 0 || !d.grades || d.grades.length === 0 || d.grades.some(g => activeGrades.includes(g));
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
    { id: 1, name: "Giấy khai sinh (có dấu đỏ)", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 1"] },
    { id: 2, name: "Đơn xin nhập học lớp 1", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 1"] },
    { id: 3, name: "Bản cam kết (nếu có)", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 1"] },
  ], []);

  const defaultDocumentsGrade2_5 = useMemo(() => [
    { id: 1, name: "Giấy khai sinh (có dấu đỏ)", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 2", "Khối 3", "Khối 4", "Khối 5"] },
    { id: 2, name: "Học bạ Tiểu học (bản gốc)", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 2", "Khối 3", "Khối 4", "Khối 5"] },
    { id: 3, name: "Giấy giới thiệu chuyển của trường nơi đi", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 2", "Khối 3", "Khối 4", "Khối 5"] },
    { id: 4, name: "Đơn xin xác nhận về việc đồng ý tiếp nhận học sinh", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 2", "Khối 3", "Khối 4", "Khối 5"] },
    { id: 5, name: "Đơn xin chuyển trường", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 2", "Khối 3", "Khối 4", "Khối 5"] },
    { id: 6, name: "Bản cam kết (nếu có)", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 2", "Khối 3", "Khối 4", "Khối 5"] },
  ], []);

  const defaultDocumentsGrade6 = useMemo(() => [
    { id: 1, name: "Giấy khai sinh (có dấu đỏ)", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 6"] },
    { id: 2, name: "Học bạ Tiểu học (bản gốc)", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 6"] },
    { id: 3, name: "Giấy chứng nhận HTCT Tiểu học", qty: "1", note: "Nếu có", targets: ["Nội tỉnh"], grades: ["Khối 6"] },
    { id: 4, name: "Giấy giới thiệu chuyển của trường nơi đi (nhập học sau 15/8)", qty: "1", note: "", targets: ["Nội tỉnh"], grades: ["Khối 6"] },
    { id: 5, name: "Giấy giới thiệu chuyển của trường nơi đi (nếu nhập học sau 15/8)", qty: "1", note: "", targets: ["Ngoại tỉnh"], grades: ["Khối 6"] },
    { id: 6, name: "Giấy giới thiệu chuyển trường do UBND/ Sở GD&ĐT nơi đi (Trường trực thuộc sở)", qty: "1", note: "", targets: ["Ngoại tỉnh"], grades: ["Khối 6"] },
    { id: 7, name: "Bản cam kết (nếu có)", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 6"] },
    { id: 8, name: "Ảnh thẻ 3x4", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 6"] },
    { id: 9, name: "Đơn xin xác nhận về việc đồng ý tiếp nhận học sinh", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 6"] },
    { id: 10, name: "Đơn xin chuyển trường", qty: "1", note: "", targets: ["Nội tỉnh", "Ngoại tỉnh"], grades: ["Khối 6"] },
  ], []);

  const defaultDocumentsGrade10NoiTinh = useMemo(() => [
    { id: 1, name: "Giấy khai sinh (có dấu đỏ)", qty: "1", note: "", targets: ["Nội tỉnh"], grades: ["Khối 10"] },
    { id: 2, name: "Học bạ THCS (bản gốc)", qty: "1", note: "", targets: ["Nội tỉnh"], grades: ["Khối 10"] },
    { id: 3, name: "Giấy chứng nhận tốt nghiệp THCS tạm thời hoặc Bằng tốt nghiệp THCS", qty: "1", note: "", targets: ["Nội tỉnh"], grades: ["Khối 10"] },
    { id: 4, name: "Giấy giới thiệu chuyển của trường nơi đi (nếu nhập học sau 15/8)", qty: "1", note: "", targets: ["Nội tỉnh"], grades: ["Khối 10"] },
    { id: 5, name: "Bản cam kết (nếu có)", qty: "1", note: "", targets: ["Nội tỉnh"], grades: ["Khối 10"] },
    { id: 6, name: "Ảnh thẻ 3x4", qty: "1", note: "", targets: ["Nội tỉnh"], grades: ["Khối 10"] },
    { id: 7, name: "Đơn xin xác nhận về việc đồng ý tiếp nhận học sinh", qty: "1", note: "", targets: ["Nội tỉnh"], grades: ["Khối 10"] },
    { id: 8, name: "Đơn xin chuyển trường", qty: "1", note: "", targets: ["Nội tỉnh"], grades: ["Khối 10"] },
  ], []);

  const defaultDocumentsGrade10NgoaiTinh = useMemo(() => [
    { id: 1, name: "Giấy khai sinh (có dấu đỏ)", qty: "1", note: "", targets: ["Ngoại tỉnh"], grades: ["Khối 10"] },
    { id: 2, name: "Học bạ THCS (bản gốc)", qty: "1", note: "", targets: ["Ngoại tỉnh"], grades: ["Khối 10"] },
    { id: 3, name: "Giấy giới thiệu chuyển của trường nơi đi (nếu nhập học sau 15/8)", qty: "1", note: "", targets: ["Ngoại tỉnh"], grades: ["Khối 10"] },
    { id: 4, name: "Giấy giới thiệu chuyển trường do Sở GD&ĐT nơi đi (Trường trực phục sở hoặc ngoại tỉnh)", qty: "1", note: "", targets: ["Ngoại tỉnh"], grades: ["Khối 10"] },
    { id: 5, name: "Bản cam kết (nếu có)", qty: "1", note: "", targets: ["Ngoại tỉnh"], grades: ["Khối 10"] },
    { id: 6, name: "Ảnh thẻ 3x4", qty: "1", note: "", targets: ["Ngoại tỉnh"], grades: ["Khối 10"] },
    { id: 7, name: "Đơn xin xác nhận về việc đồng ý tiếp nhận học sinh", qty: "1", note: "", targets: ["Ngoại tỉnh"], grades: ["Khối 10"] },
    { id: 8, name: "Đơn xin chuyển trường", qty: "1", note: "", targets: ["Ngoại tỉnh"], grades: ["Khối 10"] },
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
      } else if (selectedDocGroup === "khoi_2_5") {
        setDocList(defaultDocumentsGrade2_5);
        localStorage.setItem(storageKey, JSON.stringify(defaultDocumentsGrade2_5));
      } else if (selectedDocGroup === "khoi_6") {
        setDocList(defaultDocumentsGrade6);
        localStorage.setItem(storageKey, JSON.stringify(defaultDocumentsGrade6));
      } else if (selectedDocGroup === "khoi_10_noi_tinh") {
        setDocList(defaultDocumentsGrade10NoiTinh);
        localStorage.setItem(storageKey, JSON.stringify(defaultDocumentsGrade10NoiTinh));
      } else if (selectedDocGroup === "khoi_10_ngoai_tinh") {
        setDocList(defaultDocumentsGrade10NgoaiTinh);
        localStorage.setItem(storageKey, JSON.stringify(defaultDocumentsGrade10NgoaiTinh));
      } else {
        setDocList([]);
      }
    }
  }, [selectedDocGroup, defaultDocumentsGrade1, defaultDocumentsGrade2_5, defaultDocumentsGrade6, defaultDocumentsGrade10NoiTinh, defaultDocumentsGrade10NgoaiTinh, getDocStorageKey]);

  // One-time automatic migration for new default checklists
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMigrated = localStorage.getItem('admission_docs_migrated_v4');
      if (!isMigrated) {
        localStorage.removeItem('admission_doc_groups');
        localStorage.removeItem('admission_docs_khoi_1');
        localStorage.removeItem('admission_docs_khoi_2_5');
        localStorage.removeItem('admission_docs_khoi_6');
        localStorage.removeItem('admission_docs_khoi_10');
        localStorage.removeItem('admission_docs_khoi_10_noi_tinh');
        localStorage.removeItem('admission_docs_khoi_10_ngoai_tinh');
        
        // Setup default target assignments
        const defaultTargets = {
          "khoi_1": ["Nội tỉnh", "Ngoại tỉnh"],
          "khoi_2_5": ["Nội tỉnh", "Ngoại tỉnh"],
          "khoi_6": ["Nội tỉnh", "Ngoại tỉnh"],
          "khoi_10_noi_tinh": ["Nội tỉnh"],
          "khoi_10_ngoai_tinh": ["Ngoại tỉnh"]
        };
        localStorage.setItem('admission_doc_targets', JSON.stringify(defaultTargets));
        setDocGroupTargets(defaultTargets);

        // Setup default grade mapping
        const defaultGradesMapping = {
          "khoi_1": ["Khối 1"],
          "khoi_2_5": ["Khối 2", "Khối 3", "Khối 4", "Khối 5"],
          "khoi_6": ["Khối 6"],
          "khoi_7_9": ["Khối 7", "Khối 8", "Khối 9"],
          "khoi_10_noi_tinh": ["Khối 10"],
          "khoi_10_ngoai_tinh": ["Khối 10"],
          "khoi_11_12": ["Khối 11", "Khối 12"]
        };
        localStorage.setItem('admission_doc_grades_mapping', JSON.stringify(defaultGradesMapping));
        setDocGroupGrades(defaultGradesMapping);

        localStorage.setItem('admission_docs_migrated_v4', 'true');
        // Force reload the list for the currently selected group
        const storageKey = getDocStorageKey(selectedDocGroup);
        if (selectedDocGroup === "khoi_1") {
          setDocList(defaultDocumentsGrade1);
        } else if (selectedDocGroup === "khoi_2_5") {
          setDocList(defaultDocumentsGrade2_5);
        } else if (selectedDocGroup === "khoi_6") {
          setDocList(defaultDocumentsGrade6);
        } else if (selectedDocGroup === "khoi_10_noi_tinh") {
          setDocList(defaultDocumentsGrade10NoiTinh);
        } else if (selectedDocGroup === "khoi_10_ngoai_tinh") {
          setDocList(defaultDocumentsGrade10NgoaiTinh);
        }
      }
    }
  }, [selectedDocGroup, defaultDocumentsGrade1, defaultDocumentsGrade2_5, defaultDocumentsGrade6, defaultDocumentsGrade10NoiTinh, defaultDocumentsGrade10NgoaiTinh, getDocStorageKey]);

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
    if (activeGroup === "khoi_2_5") return defaultDocumentsGrade2_5;
    if (activeGroup === "khoi_6") return defaultDocumentsGrade6;
    if (activeGroup === "khoi_10_noi_tinh") return defaultDocumentsGrade10NoiTinh;
    if (activeGroup === "khoi_10_ngoai_tinh") return defaultDocumentsGrade10NgoaiTinh;
    return defaultDocumentsGrade1;
  }, [rcTargetGroup, defaultDocumentsGrade1, defaultDocumentsGrade2_5, defaultDocumentsGrade6, defaultDocumentsGrade10NoiTinh, defaultDocumentsGrade10NgoaiTinh]);


  // One-time migration and load for Master Branding Assets (Logo, BG, Footer)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mLogo = localStorage.getItem('report_config_master_logo');
      const mBg = localStorage.getItem('report_config_master_background');
      const mFooter = localStorage.getItem('report_config_master_footer');
      
      let finalLogo = mLogo;
      let finalBg = mBg;
      let finalFooter = mFooter;
      
      // One-time migration from any existing configurations
      if (finalLogo === null || finalBg === null || finalFooter === null) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('report_config_global_') || key.startsWith('report_config_'))) {
            try {
              const data = JSON.parse(localStorage.getItem(key) || "{}");
              if (finalLogo === null && data.logo) {
                finalLogo = data.logo;
                localStorage.setItem('report_config_master_logo', data.logo);
              }
              if (finalBg === null && data.background) {
                finalBg = data.background;
                localStorage.setItem('report_config_master_background', data.background);
              }
              if (finalFooter === null && data.footer) {
                finalFooter = data.footer;
                localStorage.setItem('report_config_master_footer', data.footer);
              }
            } catch(e) {}
          }
          if (finalLogo !== null && finalBg !== null && finalFooter !== null) break;
        }
      }
      
      // Secure master keys exist
      if (finalLogo === null) { finalLogo = ""; localStorage.setItem('report_config_master_logo', ""); }
      if (finalBg === null) { finalBg = ""; localStorage.setItem('report_config_master_background', ""); }
      if (finalFooter === null) { finalFooter = ""; localStorage.setItem('report_config_master_footer', ""); }

      if (finalLogo) setRcLogo(finalLogo);
      if (finalBg) setRcBackground(finalBg);
      if (finalFooter) setRcFooter(finalFooter);
    }
  }, []);

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
      // Decoupled: Master branding assets (Logo, Background, Footer) persist across selections.
      setRcContent(globalData.content || getDefaultContent(rcReportType));
      
      const savedSignature = localStorage.getItem('report_config_signature_' + rcCampusId) || campusData.signature || "";
      const savedDirector = localStorage.getItem('report_config_director_' + rcCampusId) || campusData.directorName || defaultManagerName;
      setRcSignature(savedSignature);
      setRcDirectorName(savedDirector);
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
    
    // Save Master Branding parts (Truly Global, one upload for all campuses and reports)
    localStorage.setItem('report_config_master_logo', rcLogo || "")
    localStorage.setItem('report_config_master_background', rcBackground || "")
    localStorage.setItem('report_config_master_footer', rcFooter || "")
    localStorage.setItem('report_config_signature_' + rcCampusId, rcSignature || "")
    localStorage.setItem('report_config_director_' + rcCampusId, rcDirectorName || "")
    
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

  const exportConfigPdf = () => {
    if (!rcCampusId) return notify("Vui lòng chọn Cơ sở", "err")
    if (!rcReportType) return notify("Vui lòng chọn Loại báo cáo", "err")
    if (!rcTargetGroup) return notify("Vui lòng chọn Đối tượng áp dụng", "err")
    
    // PREVIEW ONLY: Do not update the database/localStorage when clicking In thử
    
    const campusObj = campuses.find(c => c.id === rcCampusId);
    const campusName = campusObj ? campusObj.campusName : "Skyline Global";
    
    let mockGrade = "1";
    if (rcTargetGroup === "khoi_1") mockGrade = "1";
    else if (rcTargetGroup === "khoi_2_5") mockGrade = "3";
    else if (rcTargetGroup === "khoi_6") mockGrade = "6";
    else if (rcTargetGroup === "khoi_7_9") mockGrade = "8";
    else if (rcTargetGroup === "khoi_10") mockGrade = "10";
    else if (rcTargetGroup === "khoi_11_12") mockGrade = "11";
    
    // Set high-fidelity structural preview data using a simulated mock student directly tied to the live config settings
    setMockPreviewStudent({
      id: "MOCK_PREVIEW_STUDENT",
      fullName: "Nguyễn Minh Phong",
      grade: mockGrade,
      academicYear: "2026-2027",
      admissionCampus: campusName.includes("Hill") ? campusName : "Skyline Hill",
      surveyFormType: "Hội nhập Global",
      admissionCriteria: "Diện Xét tuyển",
      admissionResult: rcReportType === "cam_ket_hoc_tap" ? "Đạt cam kết" : "Đạt",
      targetType: rcTargetGroup !== "all" ? rcTargetGroup : undefined
    });
    
    // Automatically adjust functional UI state toggles
    setIsInvitation(rcReportType === 'thu_moi');
    setIsCommitment(rcReportType === 'cam_ket_hoc_tap');
    setIsPrintModalOpen(true);
  };

  const [yearId, setYearId] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedAcademicYear");
      if (stored) return stored;
    }
    return getDefaultAcademicYearClient(academicYears)?.id || "";
  });

  useEffect(() => {
    const handleYearChange = () => {
      const stored = localStorage.getItem("selectedAcademicYear");
      if (stored && stored !== yearId) {
        setYearId(stored);
        setSPeriodId("");
        setAsPeriodId("");
        setStudents([]);
        setAssignments([]);
      }
    };
    window.addEventListener("academicYearChanged", handleYearChange);
    return () => window.removeEventListener("academicYearChanged", handleYearChange);
  }, [yearId]);
  
  const [activeGrades, setActiveGrades] = useState<string[]>(grades)
  
  useEffect(() => {
    setActiveGrades(grades)
  }, [grades])
  
  const currentEduSystems = useMemo(() => {
    return eduSystems.filter((es: any) => es.academicYearId === yearId)
  }, [eduSystems, yearId])
  const [toast, setToast] = useState<{msg:string;type:"ok"|"err"}|null>(null)
  const notify = (msg:string, type:"ok"|"err"="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null),3200) }
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
        { 
          "Mã HS KS": "", 
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
    const basePeriods = tab === "periods" ? periods : periods.map(p => ({
      ...p,
      batches: (p.batches || []).filter(b => b.status === "ACTIVE")
    }));

    if (!currentUser || !currentUser.role) return basePeriods; // Safe Fallback: Show all periods if session is not loaded yet or null
    const userRole = (currentUser.role || "").toUpperCase().trim();
    if (isSuperAdminRole(userRole) || isKtdbclEntranceRole(userRole)) return basePeriods;

    const allowedIds = currentUser.campusIds || [];
    if (isCampusScopedEntranceRole(userRole) && allowedIds.length > 0) {
      return basePeriods.map(p => {
        // Bypass batch filtering if period name is Open Day
        const isOpenDay = p.name?.toLowerCase().includes("open day");
        if (isOpenDay) {
          return p;
        }

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
    
    return basePeriods;
  }, [periods, currentUser, campuses, tab]);


  const [pLoading, setPLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string|null>(null)
  const [confirm, setConfirm] = useState<{msg:string; fn:()=>void}|null>(null)
  const [sendingEmailBatchId, setSendingEmailBatchId] = useState<string | null>(null);

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
  const [latestBatchInfo, setLatestBatchInfo] = useState<any>(null);

  useEffect(() => {
    if (Array.isArray(periods) && periods.length > 0 && !sPeriodId) {
      const allBatches = periods.flatMap(p => 
        (p.batches || []).map(b => ({
          ...b,
          periodId: p.id,
          periodName: p.name,
          periodCode: p.code
        }))
      );
      
      if (allBatches.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let activeBatch = allBatches.find(b => {
          if (!b.startDate || !b.endDate) return false;
          const start = new Date(b.startDate);
          const end = new Date(b.endDate);
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          return today >= start && today <= end;
        });
        
        if (!activeBatch) {
          const todayTime = today.getTime();
                    const sorted = [...allBatches].sort((a, b) => {
                        const dateA = new Date(a.endDate || a.startDate || 0).getTime();
                        const dateB = new Date(b.endDate || b.startDate || 0).getTime();
                        return Math.abs(dateA - todayTime) - Math.abs(dateB - todayTime);
                    });
          activeBatch = sorted[0];
        }
        
        if (activeBatch) {
          setSPeriodId(activeBatch.periodId);
          setSBatchId(activeBatch.id);
          setLatestBatchInfo(activeBatch);
          if (!hasInitializedReportPeriodRef.current) {
            hasInitializedReportPeriodRef.current = true;
            setReportPeriodId(activeBatch.periodId);
          }
        }
      }
    }
  }, [periods, sPeriodId]);
  const [sSearch, setSSearch] = useState("")
  const [importing, setImporting] = useState(false)
  const [sModal, setSModal] = useState(false)
  const [editS, setEditS] = useState<Student|null>(null)
  const [sSelected, setSSelected] = useState<string[]>([])

  // ───────── REPORTS STATE ─────────
  const [reportPeriodId, setReportPeriodId] = useState("");
  const [reportBatchId, setReportBatchId] = useState("all");
  const [reportStudentId, setReportStudentId] = useState("");
  const [reportsSubTab, setReportsSubTab] = useState("results"); // Mặc định mở tab Xét duyệt KQ (Workflow-first)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [inlineApprovalLoadingId, setInlineApprovalLoadingId] = useState<string | null>(null);
  const [reportCampusFilter, setReportCampusFilter] = useState("all");
  const [reportGradeFilter, setReportGradeFilter] = useState("all");
  const currentMonthYearKey = useMemo(() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  }, []);
  const getBatchMonthYearKey = useCallback((b: any): string => {
    const raw = String(b?.endDate || b?.startDate || "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return `${raw.slice(5, 7)}/${raw.slice(0, 4)}`;
    }
    return "";
  }, []);
  const getStudentMonthYearKey = useCallback((s: any, batchMap?: Map<string, any>): string => {
    const bObj = s?.batch || (s?.batchId && batchMap ? batchMap.get(s.batchId) : null);
    const fromBatch = getBatchMonthYearKey(bObj);
    if (fromBatch) return fromBatch;
    const rawCreated = String(s?.createdAt || "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawCreated)) {
      return `${rawCreated.slice(5, 7)}/${rawCreated.slice(0, 4)}`;
    }
    return "";
  }, [getBatchMonthYearKey]);

  const [reportApprovalStatusFilter, setReportApprovalStatusFilter] = useState("all");
  const [isCompletenessModalOpen, setIsCompletenessModalOpen] = useState(false);
  const [isBatchResultPreviewOpen, setIsBatchResultPreviewOpen] = useState(false);
  const [previewBatchId, setPreviewBatchId] = useState<string>("");
  const [previewSingleStudent, setPreviewSingleStudent] = useState<any | null>(null);
  const [emailPreviewViewport, setEmailPreviewViewport] = useState<"desktop" | "mobile">("desktop");
  const [batchResultPreviewLoading, setBatchResultPreviewLoading] = useState(false);
  const [batchResultPreviewData, setBatchResultPreviewData] = useState<{
    subject: string;
    html: string;
    toRecipients: string[];
    ccRecipients: string[];
    batchName: string;
    campusName: string;
    studentCount: number;
    pendingCount: number;
  } | null>(null);
  const [gdcsReminderPreviewOpen, setGdcsReminderPreviewOpen] = useState(false);
  const [gdcsReminderPreviewLoading, setGdcsReminderPreviewLoading] = useState(false);
  const [gdcsReminderSending, setGdcsReminderSending] = useState(false);
  const [gdcsReminderPreviewData, setGdcsReminderPreviewData] = useState<{
    studentId: string;
    studentName: string;
    gdcsEmail: string;
    subject: string;
    to: string;
    cc: string[];
    html: string;
    campusName: string;
  } | null>(null);
  const [reportSortMode, setReportSortMode] = useState<"priority_latest" | "latest_batch" | "name_asc">("priority_latest");
  const [showAllRecentBatches, setShowAllRecentBatches] = useState(false);
  const [reportMonthFilter, setReportMonthFilter] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  });
  const [reportStudentSearchQuery, setReportStudentSearchQuery] = useState("");
  const [reportCurrentPage, setReportCurrentPage] = useState(1);
  const [reportPageSize, setReportPageSize] = useState(15);
  const pendingQuickResultRef = useRef<{ studentId: string; result: string } | null>(null);

  useEffect(() => {
    setReportCurrentPage(1);
  }, [reportPeriodId, reportBatchId, reportCampusFilter, reportGradeFilter, reportApprovalStatusFilter, reportStudentSearchQuery, reportPageSize]);
  const [chartCampusId, setChartCampusId] = useState("all");
  const [reportStudents, setReportStudents] = useState<any[]>([]);
  const [retestHistory, setRetestHistory] = useState<any[]>([]);
  const [retestHistoryLoading, setRetestHistoryLoading] = useState(false);

  const [retestPeriodId, setRetestPeriodId] = useState("");
  const [retestBatchId, setRetestBatchId] = useState("");
  const [retestRegisterLoading, setRetestRegisterLoading] = useState(false);
  const [isRetestModalOpen, setIsRetestModalOpen] = useState(false);

  const [mockPreviewStudent, setMockPreviewStudent] = useState<any>(null);
  const [reportForm, setReportForm] = useState({
    admissionResult: "",
    admissionCampus: "",
    signatureName: "",
    directorNote: "",
    committedSubjects: [] as string[]
  });

  // State và dữ liệu Phiếu phỏng vấn định hướng HS và trao đổi với PHHS (BM.KTĐBCL.31..42)
  const [isOrientationModalOpen, setIsOrientationModalOpen] = useState(false);
  const [isPvdhModalOpen, setIsPvdhModalOpen] = useState(false);
  const [pvdhModalInitialSection, setPvdhModalInitialSection] = useState<"FULL_FORM" | PvdhSectionCode | "PREVIEW">("FULL_FORM");
  const [isOrientationReportModalOpen, setIsOrientationReportModalOpen] = useState(false);
  const [orientationData, setOrientationData] = useState<any>(null);
  const [pvdhWorkspace, setPvdhWorkspace] = useState<any>(null);
  const [orientationAssignedTeacher, setOrientationAssignedTeacher] = useState<string>("");
  const [showFullOrientationDetails, setShowFullOrientationDetails] = useState(false);
  const [loadingOrientation, setLoadingOrientation] = useState(false);
  const [dossierActiveTab, setDossierActiveTab] = useState<"scores" | "orientation" | "all">("scores");
  const [orientationSubTab, setOrientationSubTab] = useState<PvdhSectionCode | "FULL_FORM">("FULL_FORM");

  // Trạng thái GĐCS xác nhận phương án làm việc hồ sơ Tâm lý (1. GĐCS Gặp trực tiếp PHHS, 2. Ủy quyền cho NTCM/GV phụ trách, 3. Đặt lịch hẹn với PHHS)
  const [psychDirectiveType, setPsychDirectiveType] = useState<"DIRECT_PARENT_MEETING" | "SCHEDULE_MEETING" | "DELEGATE_TEACHER">("DIRECT_PARENT_MEETING");
  const [psychMeetingTime, setPsychMeetingTime] = useState("");
  const [psychMeetingLocation, setPsychMeetingLocation] = useState("Phòng Giám đốc Cơ sở");
  const [psychParentContent, setPsychParentContent] = useState("");
  const [psychParticipants, setPsychParticipants] = useState("GĐCS, Tổ Tư vấn cơ sở, Tổ Giáo vụ cơ sở, GV phỏng vấn định hướng, GV Tâm lý");
  const [psychAgenda, setPsychAgenda] = useState("");
  const [psychDelegatedTeacherId, setPsychDelegatedTeacherId] = useState("");
  const [psychDelegatedTeacherName, setPsychDelegatedTeacherName] = useState("");
  const [psychDelegatedTeacherEmail, setPsychDelegatedTeacherEmail] = useState("");
  const [psychDelegationDuration, setPsychDelegationDuration] = useState("4 tuần đầu năm học");
  const [psychDelegationNote, setPsychDelegationNote] = useState("");
  const [psychGeneralNote, setPsychGeneralNote] = useState("");
  const [savingPsychDirective, setSavingPsychDirective] = useState(false);
  const [psychOneTouchMode, setPsychOneTouchMode] = useState(false);
  const [showPsychCustomDetails, setShowPsychCustomDetails] = useState(true);
  const [assignedSurveyTeachers, setAssignedSurveyTeachers] = useState<any[]>([]);
  const [mobileDossierPane, setMobileDossierPane] = useState<"evidence" | "decision">("evidence");
  const [showAuditHistoryDrawer, setShowAuditHistoryDrawer] = useState(false);

  const selectVerdictWithSmartNote = useCallback((nextResult: string) => {
    const defaultNoteByResult: Record<string, string> = {
      "Đạt": "Đạt tiêu chuẩn tiếp nhận của nhà trường",
      "Đạt cam kết": "Đạt cam kết - Yêu cầu bồi dưỡng thêm",
      "Học thử": "Tiếp nhận học thử và theo dõi khả năng thích nghi",
      "Không đạt": "Chưa đáp ứng tiêu chuẩn tiếp nhận đầu vào",
      "Đạt - Giao lưu": "Đạt diện giao lưu theo quy chế tuyển sinh",
      "Không đạt - Kiểm tra lại": "Không đạt - Yêu cầu kiểm tra lại",
      "Không đạt - Không kiểm tra lại": "Không đạt - Không kiểm tra lại"
    };
    const autoNotesSet = new Set([
      "",
      "Đạt",
      "Đạt chuẩn",
      "Đạt cam kết",
      "Học thử",
      "Không đạt",
      "Đạt và xuất PDF chi tiết để GV ký",
      ...Object.values(defaultNoteByResult)
    ]);
    setReportForm((prev) => {
      const curNote = String(prev.directorNote || "").trim();
      const nextNote = autoNotesSet.has(curNote)
        ? (defaultNoteByResult[nextResult] || curNote)
        : prev.directorNote;
      return {
        ...prev,
        admissionResult: nextResult,
        directorNote: nextNote
      };
    });
  }, []);

  useEffect(() => {
    try {
      const rawPsych = orientationData?.psychologyData;
      const pObj = rawPsych ? (typeof rawPsych === "string" ? JSON.parse(rawPsych) : rawPsych) : null;
      const resp = pObj?.gdcsResponse;
      const req = pObj?.gdcsDirectiveRequest || pObj?.reportedToGdcs;
      if (resp?.responseType) {
        setPsychDirectiveType(resp.responseType);
      } else if (req?.proposedAction) {
        setPsychDirectiveType(req.proposedAction);
      } else {
        setPsychDirectiveType("DIRECT_PARENT_MEETING");
      }
      setPsychMeetingTime(resp?.details?.meetingTimeRaw || resp?.details?.meetingTime || "");
      setPsychMeetingLocation(resp?.details?.meetingLocation || "Phòng Giám đốc Cơ sở");
      setPsychParentContent(resp?.details?.parentMeetingContent || "");
      setPsychParticipants(resp?.details?.meetingParticipants || "GĐCS, Tổ Tư vấn cơ sở, Tổ Giáo vụ cơ sở, GV phỏng vấn định hướng, GV Tâm lý");
      setPsychAgenda(resp?.details?.meetingAgenda || "");
      setPsychDelegatedTeacherId(resp?.details?.delegatedTeacherId || "");
      setPsychDelegatedTeacherName(resp?.details?.delegatedTeacherName || "");
      setPsychDelegatedTeacherEmail(resp?.details?.delegatedTeacherEmail || "");
      setPsychDelegationDuration(resp?.details?.delegationDuration || "4 tuần đầu năm học");
      setPsychDelegationNote(resp?.details?.delegationNote || "");
      setPsychGeneralNote(resp?.generalDirectiveNote || "");
    } catch {}
  }, [orientationData, reportStudentId]);

  const handleConfirmPsychWorkPlan = async (
    studentObj: any,
    overrideType?: "DIRECT_PARENT_MEETING" | "SCHEDULE_MEETING" | "DELEGATE_TEACHER"
  ) => {
    if (!studentObj?.id) return;
    const chosenType = overrideType || psychDirectiveType;
    const csShort = resolvedStudentCampusObj?.campusCode || "CS1";
    const defaultSurveyTeacher = (assignedSurveyTeachers || [])[0] || (teachers || [])[0] as any;

    const resolvedLocation =
      chosenType === "SCHEDULE_MEETING"
        ? psychMeetingLocation || "Phòng Tiếp phụ huynh / Phòng Giám đốc Cơ sở"
        : psychMeetingLocation || "Phòng Giám đốc Cơ sở";

    const resolvedParentContent =
      psychParentContent ||
      "GĐCS gặp trực tiếp PHHS trao đổi về kết quả sàng lọc tâm lý, thống nhất lộ trình đồng hành và cam kết phối hợp giữa Gia đình & Nhà trường.";

    const resolvedParticipants =
      psychParticipants || `GĐCS, Tổ Tư vấn ${csShort}, Tổ Giáo vụ ${csShort}, GV phỏng vấn định hướng, GV Tâm lý`;

    const resolvedAgenda =
      psychAgenda ||
      `Đặt lịch hẹn làm việc với PHHS học sinh ${studentObj.fullName || ""} để trao đổi kết quả sàng lọc tâm lý và thống nhất phương án hỗ trợ.`;

    const resolvedTeacherId = psychDelegatedTeacherId || defaultSurveyTeacher?.teacherId || defaultSurveyTeacher?.id || defaultSurveyTeacher?.userId || "";
    const resolvedTeacherName = psychDelegatedTeacherName || defaultSurveyTeacher?.teacherName || "NTCM / Giáo viên phụ trách";
    const resolvedTeacherEmail = psychDelegatedTeacherEmail || defaultSurveyTeacher?.email || "";
    const resolvedDuration = psychDelegationDuration || "4 tuần đầu năm học";
    const resolvedDelegationNote =
      psychDelegationNote ||
      `Trao đổi với PHHS, theo dõi sát biểu hiện tâm lý - hành vi, hỗ trợ học sinh thích nghi và báo cáo định kỳ cho GĐCS & Tổ Giáo vụ (${csShort}).`;

    const resolvedGeneralNote =
      psychGeneralNote ||
      (chosenType === "DIRECT_PARENT_MEETING"
        ? `GĐCS gặp trực tiếp PHHS. Đề nghị Tổ Tư vấn cơ sở (${csShort}) liên hệ mời PHHS; Tổ Giáo vụ cơ sở chuẩn bị hồ sơ làm việc.`
        : chosenType === "SCHEDULE_MEETING"
        ? `Đặt lịch hẹn với PHHS. Đề nghị Tổ Tư vấn cơ sở (${csShort}) xác nhận lịch hẹn với gia đình; Tổ Giáo vụ cơ sở chuẩn bị phòng và hồ sơ.`
        : `Ủy quyền ${resolvedTeacherName} phụ trách trao đổi PHHS & đồng hành cùng học sinh; Tổ Giáo vụ và Tổ Tư vấn cơ sở (${csShort}) phối hợp hỗ trợ.`);

    setPsychDirectiveType(chosenType);
    setPsychMeetingLocation(resolvedLocation);
    if (!psychParentContent) setPsychParentContent(resolvedParentContent);
    if (!psychParticipants) setPsychParticipants(resolvedParticipants);
    if (!psychAgenda) setPsychAgenda(resolvedAgenda);
    if (!psychDelegatedTeacherId && resolvedTeacherId) setPsychDelegatedTeacherId(resolvedTeacherId);
    if (!psychDelegatedTeacherName && resolvedTeacherName) setPsychDelegatedTeacherName(resolvedTeacherName);
    if (!psychDelegatedTeacherEmail && resolvedTeacherEmail) setPsychDelegatedTeacherEmail(resolvedTeacherEmail);
    if (!psychDelegationNote) setPsychDelegationNote(resolvedDelegationNote);
    if (!psychGeneralNote) setPsychGeneralNote(resolvedGeneralNote);

    setSavingPsychDirective(true);
    try {
      const res = await fetch("/api/admin/orientation/psychology-referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "respondGdcsDirective",
          studentId: studentObj.id,
          responseType: chosenType,
          meetingTime: psychMeetingTime || "Theo lịch điều phối của Tư vấn & Giáo vụ cơ sở",
          meetingLocation: resolvedLocation,
          parentMeetingContent: resolvedParentContent,
          meetingParticipants: resolvedParticipants,
          meetingAgenda: resolvedAgenda,
          delegatedTeacherId: resolvedTeacherId,
          delegatedTeacherName: resolvedTeacherName,
          delegatedTeacherEmail: resolvedTeacherEmail,
          delegationDuration: resolvedDuration,
          delegationNote: resolvedDelegationNote,
          generalDirectiveNote: resolvedGeneralNote,
          directorName: autoCampusDirectorName || currentUser?.fullName || "Giám đốc Cơ sở",
          directorEmail: (currentUser as any)?.email || ""
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        reloadStudentOrientationWorkspace(studentObj.id);
        setToast({
          msg: data.message || "GĐCS đã xác nhận phương án làm việc và gửi thông báo đến Tổ Giáo vụ & Tư vấn cơ sở!",
          type: "ok"
        });
      } else {
        setToast({
          msg: data.error || "Không thể lưu xác nhận phương án làm việc của GĐCS.",
          type: "err"
        });
      }
    } catch (e: any) {
      setToast({
        msg: "Lỗi kết nối khi lưu xác nhận phương án làm việc của GĐCS.",
        type: "err"
      });
    } finally {
      setSavingPsychDirective(false);
    }
  };

  const reloadStudentOrientationWorkspace = useCallback((studentId: string) => {
    if (!studentId) return;
    setLoadingOrientation(true);
    Promise.all([
      fetch(`/api/pvdh/records?studentId=${encodeURIComponent(studentId)}`, { cache: "no-store" })
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`/api/admin/orientation/records?studentId=${encodeURIComponent(studentId)}`, { cache: "no-store" })
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([pvdhRes, legRes]) => {
        if (pvdhRes?.success) {
          setPvdhWorkspace(pvdhRes);
        } else {
          setPvdhWorkspace(null);
        }
        if (legRes?.success) {
          setOrientationData(legRes.data || null);
          setAssignedSurveyTeachers(Array.isArray(legRes.assignedSurveyTeachers) ? legRes.assignedSurveyTeachers : []);
          setOrientationAssignedTeacher(
            pvdhRes?.record?.studentInterviewerName ||
            legRes.assignedOrientation?.assignedTeacherName ||
            legRes.data?.interviewerName ||
            ""
          );
        } else {
          setAssignedSurveyTeachers([]);
          if (pvdhRes?.record?.studentInterviewerName) {
            setOrientationAssignedTeacher(pvdhRes.record.studentInterviewerName);
          }
        }
      })
      .finally(() => {
        setLoadingOrientation(false);
      });
  }, []);

  // Tự động tải bản ghi định hướng khi mở modal chi tiết học sinh
  useEffect(() => {
    if (!reportStudentId) {
      setOrientationData(null);
      setPvdhWorkspace(null);
      setOrientationAssignedTeacher("");
      setShowFullOrientationDetails(false);
      setDossierActiveTab("scores");
      setOrientationSubTab("FULL_FORM");
      return;
    }
    setShowFullOrientationDetails(false);
    reloadStudentOrientationWorkspace(reportStudentId);
  }, [reportStudentId, reloadStudentOrientationWorkspace]);

  // Helper kiểm tra đợt khảo sát có thuộc Cơ sở được chọn hay không (Cascading Filter)
  const isBatchMatchingCampus = useCallback((batch: any, campusId: string) => {
    if (!campusId || campusId === "all") return true;
    if (batch.campusId && batch.campusId === campusId) return true;
    const targetCampus = campuses.find(c => c.id === campusId);
    if (!targetCampus) return true;
    const cName = (targetCampus.campusName || "").toUpperCase();
    const cCode = (targetCampus.campusCode || "").toUpperCase();
    const bName = (batch.name || "").toUpperCase();
    
    if (cCode && bName.includes(cCode)) return true;
    if (bName.includes(cName)) return true;
    
    if (cCode.includes("CS1") || cName.includes("RIVERSIDE")) {
      if (bName.includes("CS1") || bName.includes("RIVERSIDE")) return true;
    }
    if (cCode.includes("CS2") || cName.includes("CENTRAL")) {
      if (bName.includes("CS2") || bName.includes("CENTRAL")) return true;
    }
    if (cCode.includes("CS3") || cName.includes("GLOBAL")) {
      if (bName.includes("CS3") || bName.includes("GLOBAL")) return true;
    }
    if (cCode.includes("CS4") || cName.includes("HILL")) {
      if (bName.includes("CS4") || bName.includes("HILL")) return true;
    }
    if (cCode.includes("CS5") || cName.includes("BEACH")) {
      if (bName.includes("CS5") || bName.includes("BEACH")) return true;
    }

    // Nếu tên đợt chứa mã cơ sở khác mà không phải cơ sở đang chọn -> loại trừ
    const campusCodes = ["CS1", "CS2", "CS3", "CS4", "CS5"].filter(code => !cCode.includes(code));
    if (campusCodes.some(code => bName.includes(code))) return false;

    return true;
  }, [campuses]);

  // Tự động nhận diện và chọn cơ sở phân quyền của GĐCS khi truy cập trang
  useEffect(() => {
    const userRole = (currentUser?.role || "").toUpperCase();
    const isGdcs = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(userRole);
    if (isGdcs && currentUser?.campusIds && currentUser.campusIds.length > 0) {
      if (reportCampusFilter === "all") {
        const match = campuses.find(c => currentUser.campusIds.includes(c.id));
        if (match) {
          setReportCampusFilter(match.id);
        }
      }
    }
  }, [currentUser, campuses, reportCampusFilter]);

  const reportSelPeriod = useMemo(() => visiblePeriods.find(p => p.id === reportPeriodId), [periods, reportPeriodId]);
  
  // Toàn bộ các đợt của kỳ (dùng để tra cứu thông tin học sinh không phụ thuộc filter)
  const rawReportBatches = useMemo(() => {
    if (reportPeriodId === "all") {
      return periods.flatMap(p => p.batches || []);
    }
    return reportSelPeriod?.batches || [];
  }, [reportSelPeriod, periods, reportPeriodId]);

  const reportBatchLookup = useMemo(() => {
    const map = new Map<string, any>();
    (rawReportBatches || []).forEach((b: any) => {
      if (b?.id) map.set(b.id, b);
    });
    return map;
  }, [rawReportBatches]);

  // Danh sách Đợt hiển thị trong bộ lọc (Lọc chặt chẽ theo Tháng & Cơ sở đã chọn)
  const reportBatches = useMemo(() => {
    return rawReportBatches.filter(b => {
      if (reportCampusFilter !== "all" && !isBatchMatchingCampus(b, reportCampusFilter)) return false;
      if (reportMonthFilter && reportMonthFilter !== "all") {
        if (getBatchMonthYearKey(b) !== reportMonthFilter) return false;
      }
      return true;
    });
  }, [rawReportBatches, reportCampusFilter, reportMonthFilter, isBatchMatchingCampus, getBatchMonthYearKey]);

  // Tự động chuyển Đợt về 'all' nếu đợt hiện tại không thuộc Cơ sở mới chọn (tránh lỗi 0 học sinh)
  useEffect(() => {
    if (reportBatchId !== "all" && reportBatchId !== "none") {
      const isBatchValid = reportBatches.some(b => b.id === reportBatchId);
      if (!isBatchValid) {
        setReportBatchId("all");
      }
    }
  }, [reportCampusFilter, reportBatches, reportBatchId]);

  const resolveStudentCampusId = useCallback((s: Student) => {
    // 1. If Open Day student, check registeredCampus
    const studentPeriod = periods.find(p => p.id === s.periodId);
    const isOpenDay = studentPeriod?.name?.toLowerCase().includes("open day");
    if (isOpenDay && s.registeredCampus) {
      const matchingCampus = campuses.find(c => c.id === s.registeredCampus);
      if (matchingCampus) return matchingCampus.id;
    }
    
    // 2. Check admissionCampus matching campusName
    if (s.admissionCampus) {
      const tc = campuses.find(c => c.campusName === s.admissionCampus);
      if (tc) return tc.id;
    }
    
    // 3. Fallback to batch campusId
    if (s.batchId) {
      const b = reportBatches.find(bx => bx.id === s.batchId);
      if (b?.campusId) {
        const tc = campuses.find(c => c.id === b.campusId);
        if (tc) return tc.id;
      }
    }
    
    // 4. Try string match on admissionCampus
    const campusName = s.admissionCampus || "";
    let code = null;
    if (campusName.includes("CS1") || campusName.includes("Cơ sở 1")) code = "CS1";
    else if (campusName.includes("CS2") || campusName.includes("Cơ sở 2")) code = "CS2";
    else if (campusName.includes("CS3") || campusName.includes("Cơ sở 3")) code = "CS3";
    else if (campusName.includes("CS4") || campusName.includes("Cơ sở 4")) code = "CS4";
    else if (campusName.includes("CS5") || campusName.includes("Cơ sở 5")) code = "CS5";
    
    if (code) {
      const tc = campuses.find(c => c.campusCode === code);
      if (tc) return tc.id;
    }
    
    return "unassigned";
  }, [campuses, periods, reportBatches]);

  const selectedReportStudent = useMemo(() => {
    if (mockPreviewStudent) return mockPreviewStudent;
    if (!Array.isArray(reportStudents)) return undefined;
    return reportStudents.find(s => s.id === reportStudentId);
  }, [reportStudents, reportStudentId, mockPreviewStudent]);

  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedReportStudent && selectedReportStudent.scores && selectedReportStudent.scores.length > 0) {
      setActiveSubjectId(selectedReportStudent.scores[0].id);
    } else {
      setActiveSubjectId(null);
    }
  }, [selectedReportStudent?.id, selectedReportStudent?.scores]);

  // Helper xác định chính xác Cơ sở (Campus) của 1 học sinh từ mọi nguồn dữ liệu (ID, campusCode "CS4", campusName, Batch, Period)
  const resolveCampusObjForStudent = useCallback((student: any, overrideCampus?: string) => {
    if (!student || !Array.isArray(campuses) || campuses.length === 0) return null;

    const matchDirect = (val?: string | null) => {
      const raw = String(val || "").trim();
      if (!raw) return null;
      const upper = raw.toUpperCase();
      return (
        campuses.find(c =>
          c.id === raw ||
          (c.campusCode && c.campusCode.toUpperCase() === upper) ||
          (c.campusName && c.campusName.toUpperCase() === upper)
        ) || null
      );
    };

    const studentPeriod = periods.find(p => p.id === student.periodId);
    const isOpenDay = studentPeriod?.name?.toLowerCase().includes("open day");
    if (isOpenDay && student.registeredCampus) {
      const m = matchDirect(student.registeredCampus);
      if (m) return m;
    }

    const fromOverride = matchDirect(overrideCampus);
    if (fromOverride) return fromOverride;

    const fromAdm = matchDirect(student.admissionCampus);
    if (fromAdm) return fromAdm;

    const fromReg = matchDirect(student.registeredCampus);
    if (fromReg) return fromReg;

    if (student.batch?.campusId) {
      const tc = campuses.find(c => c.id === student.batch.campusId);
      if (tc) return tc;
    }

    if (student.batchId) {
      const b = rawReportBatches.find(bx => bx.id === student.batchId) || reportBatches.find(bx => bx.id === student.batchId);
      if (b?.campusId) {
        const tc = campuses.find(c => c.id === b.campusId);
        if (tc) return tc;
      }
    }

    if (studentPeriod?.campusId) {
      const tc = campuses.find(c => c.id === studentPeriod.campusId);
      if (tc) return tc;
    }

    // Nhận diện mã CS1..CS5 từ chuỗi tên cơ sở / tên đợt / tên kỳ
    const combinedText = `${overrideCampus || ""} ${student.admissionCampus || ""} ${student.registeredCampus || ""} ${student.batch?.name || ""} ${studentPeriod?.name || ""}`.toUpperCase();
    let detectedCode = "";
    if (/\bCS1\b/.test(combinedText) || combinedText.includes("CƠ SỞ 1") || combinedText.includes("RIVERSIDE")) detectedCode = "CS1";
    else if (/\bCS2\b/.test(combinedText) || combinedText.includes("CƠ SỞ 2") || combinedText.includes("CENTRAL")) detectedCode = "CS2";
    else if (/\bCS3\b/.test(combinedText) || combinedText.includes("CƠ SỞ 3") || combinedText.includes("GLOBAL")) detectedCode = "CS3";
    else if (/\bCS4\b/.test(combinedText) || combinedText.includes("CƠ SỞ 4") || combinedText.includes("HILL")) detectedCode = "CS4";
    else if (/\bCS5\b/.test(combinedText) || combinedText.includes("CƠ SỞ 5") || combinedText.includes("BEACH")) detectedCode = "CS5";

    if (detectedCode) {
      const tc = campuses.find(c => (c.campusCode || "").toUpperCase() === detectedCode);
      if (tc) return tc;
    }

    if (reportCampusFilter && reportCampusFilter !== "all") {
      const tc = campuses.find(c => c.id === reportCampusFilter);
      if (tc) return tc;
    }

    return null;
  }, [campuses, periods, rawReportBatches, reportBatches, reportCampusFilter]);

  // Helper xác định chính xác Họ tên Giám đốc Cơ sở (GĐCS) phụ trách của 1 Cơ sở
  const resolveGdcsNameForCampus = useCallback((campusObj: any): string => {
    if (!campusObj) return "";

    // 1. Ưu tiên cao nhất: GĐCS cấu hình trực tiếp trên Campus (manager)
    const managerName = String(campusObj.manager?.fullName || (campusObj.manager as any)?.teacher?.teacherName || "").trim();
    if (managerName) return managerName;

    // 2. Tra cứu tài khoản vai trò GĐCS được phân công phụ trách cơ sở này (UserCampusAssignment / teacher.campusId)
    const assignedGdcs = (gdcsUsers || []).find((u: any) =>
      (Array.isArray(u.campusIds) && u.campusIds.includes(campusObj.id)) ||
      u.teacher?.campusId === campusObj.id
    );
    if (assignedGdcs) {
      const n = String(assignedGdcs.fullName || assignedGdcs.teacher?.teacherName || assignedGdcs.email || "").trim();
      if (n) return n;
    }

    // 3. Đối chiếu danh bạ email GĐCS chuẩn của từng cơ sở Sky-Line
    const officialEmailByCode: Record<string, string> = {
      CS1: "longtt@skylineschool.edu.vn",
      CS2: "khanhpt@skylineschool.edu.vn",
      CS3: "thanhtt@skylineschool.edu.vn",
      CS4: "trungct@skylineschool.edu.vn",
      CS5: "trungdq1@skylineschool.edu.vn"
    };
    const csCode = String(campusObj.campusCode || "").toUpperCase();
    const targetEmail = officialEmailByCode[csCode];
    if (targetEmail) {
      const matchedUser = (gdcsUsers || []).find((u: any) =>
        String(u.email || "").toLowerCase() === targetEmail ||
        String(u.teacher?.email || "").toLowerCase() === targetEmail
      );
      if (matchedUser?.fullName) return String(matchedUser.fullName).trim();

      const matchedTeacher = (teachers || []).find((t: any) =>
        String(t.email || "").toLowerCase() === targetEmail ||
        String(t.user?.email || "").toLowerCase() === targetEmail
      );
      if (matchedTeacher) {
        const tn = String((matchedTeacher as any).user?.fullName || matchedTeacher.teacherName || "").trim();
        if (tn) return tn;
      }
    }

    // 4. Tra cứu trong danh sách teachers thuộc cơ sở có tài khoản role GĐCS
    const campusGdcsTeacher = (teachers || []).find((t: any) => {
      const sameCampus = (t as any).campusId === campusObj.id || (t as any).campus?.id === campusObj.id || (t as any).campus?.campusCode === campusObj.campusCode;
      const role = String((t as any).user?.role || "").toUpperCase();
      return sameCampus && ["GDCS", "GĐCS", "GD_CS", "GĐ_CS"].includes(role);
    });
    if (campusGdcsTeacher) {
      const tn = String((campusGdcsTeacher as any).user?.fullName || campusGdcsTeacher.teacherName || "").trim();
      if (tn) return tn;
    }

    return "";
  }, [gdcsUsers, teachers]);

  const resolveGdcsSignatureForCampus = useCallback((campusObj: any, preferredApproverName?: string): string => {
    const extractSig = (sigProfile: any) => {
      if (!sigProfile || sigProfile.isActive === false) return "";
      return String(sigProfile.visualAppearanceUrl || "").trim();
    };
    const normApprover = String(preferredApproverName || "").trim().toLowerCase();
    if (normApprover) {
      const matchedUser = (gdcsUsers || []).find((u: any) =>
        String(u.fullName || "").trim().toLowerCase() === normApprover ||
        String(u.teacher?.teacherName || "").trim().toLowerCase() === normApprover
      );
      const uSig = extractSig(matchedUser?.teacher?.signatureProfile);
      if (uSig) return uSig;

      const matchedTeacher = (teachers || []).find((t: any) =>
        String(t.teacherName || "").trim().toLowerCase() === normApprover ||
        String((t as any).user?.fullName || "").trim().toLowerCase() === normApprover
      );
      const tSig = extractSig(matchedTeacher?.signatureProfile);
      if (tSig) return tSig;
    }

    if (!campusObj) return "";
    const mSig = extractSig(campusObj.manager?.teacher?.signatureProfile);
    if (mSig) return mSig;

    const assignedGdcs = (gdcsUsers || []).find((u: any) =>
      (Array.isArray(u.campusIds) && u.campusIds.includes(campusObj.id)) ||
      u.teacher?.campusId === campusObj.id
    );
    const aSig = extractSig(assignedGdcs?.teacher?.signatureProfile);
    if (aSig) return aSig;

    const officialEmailByCode: Record<string, string> = {
      CS1: "longtt@skylineschool.edu.vn",
      CS2: "khanhpt@skylineschool.edu.vn",
      CS3: "thanhtt@skylineschool.edu.vn",
      CS4: "trungct@skylineschool.edu.vn",
      CS5: "trungdq1@skylineschool.edu.vn"
    };
    const csCode = String(campusObj.campusCode || "").toUpperCase();
    const targetEmail = officialEmailByCode[csCode];
    if (targetEmail) {
      const matchedUser = (gdcsUsers || []).find((u: any) =>
        String(u.email || "").toLowerCase() === targetEmail ||
        String(u.teacher?.email || "").toLowerCase() === targetEmail
      );
      const eSig = extractSig(matchedUser?.teacher?.signatureProfile);
      if (eSig) return eSig;

      const matchedTeacher = (teachers || []).find((t: any) =>
        String(t.email || "").toLowerCase() === targetEmail ||
        String((t as any).user?.email || "").toLowerCase() === targetEmail
      );
      const etSig = extractSig(matchedTeacher?.signatureProfile);
      if (etSig) return etSig;
    }

    return "";
  }, [gdcsUsers, teachers]);

  const isStudentApprovedByGdcs = useCallback((student: any, activeAdmissionResult?: string): boolean => {
    if (!student) return false;
    if (student.id === "MOCK_PREVIEW_STUDENT") return true;
    const res = String(activeAdmissionResult || student.admissionResult || "").trim().toLowerCase();
    if (!res) return false;
    if (res.includes("chưa") || res.includes("chờ") || res.includes("không đạt") || res.includes("vắng")) {
      return false;
    }
    return true;
  }, []);

  const resolvedStudentCampusObj = useMemo(
    () => resolveCampusObjForStudent(selectedReportStudent, reportForm.admissionCampus),
    [selectedReportStudent, reportForm.admissionCampus, resolveCampusObjForStudent]
  );

  const autoCampusDirectorName = useMemo(
    () => resolveGdcsNameForCampus(resolvedStudentCampusObj),
    [resolvedStudentCampusObj, resolveGdcsNameForCampus]
  );

  // Email States & Approval Notification
  const [emailRoutingConfig, setEmailRoutingConfig] = useState<EmailRoutingConfigData>(() =>
    parseSavedEmailRoutingConfig(initialConfigs)
  );
  const [isEmailRoutingModalOpen, setIsEmailRoutingModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [sendingBatchEmail, setSendingBatchEmail] = useState(false);
  const [sendingBatchResultEmail, setSendingBatchResultEmail] = useState(false);
  const [autoSendApprovalEmail, setAutoSendApprovalEmail] = useState(() =>
    parseSavedEmailRoutingConfig(initialConfigs).autoSendOnApprove
  );

  // Thống kê chi tiết đợt khảo sát phục vụ Executive Card của GĐCS
  const batchSummaryStats = useMemo(() => {
    const baseList = (reportStudents || []).filter(s => {
      if (reportPeriodId && reportPeriodId !== "all") {
        if (s.periodId !== reportPeriodId && s.period?.id !== reportPeriodId) return false;
      }
      if (reportMonthFilter && reportMonthFilter !== "all") {
        const stMonth = getStudentMonthYearKey(s, reportBatchLookup);
        if (stMonth !== reportMonthFilter) return false;
      }
      if (reportBatchId && reportBatchId !== "all") {
        if (reportBatchId === "none") {
          if (s.batchId) return false;
        } else if (s.batchId !== reportBatchId) {
          return false;
        }
      }
      if (reportCampusFilter && reportCampusFilter !== "all") {
        const resolvedCampusId = resolveStudentCampusId(s);
        const matchesCampus = resolvedCampusId === reportCampusFilter || 
                              s.admissionCampus === reportCampusFilter || 
                              s.registeredCampus === reportCampusFilter;
        if (!matchesCampus) return false;
      }
      return true;
    });

    const total = baseList.length;
    const pending = baseList.filter(s => !s.admissionResult && !s.isAbsent).length;
    const passed = baseList.filter(s => s.admissionResult && (s.admissionResult.includes("Đạt") || s.admissionResult.includes("đạt")) && !s.admissionResult.includes("không") && !s.admissionResult.includes("Không") && !s.admissionResult.includes("cam kết")).length;
    const committed = baseList.filter(s => s.admissionResult && s.admissionResult.includes("cam kết")).length;
    const failed = baseList.filter(s => s.admissionResult && s.admissionResult.includes("Không đạt")).length;
    const absent = baseList.filter(s => s.isAbsent).length;

    return { total, pending, passed, committed, failed, absent };
  }, [reportStudents, reportPeriodId, reportMonthFilter, reportBatchId, reportCampusFilter, resolveStudentCampusId, getStudentMonthYearKey, reportBatchLookup]);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailStudents, setEmailStudents] = useState<any[]>([]);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSendingStatus, setEmailSendingStatus] = useState("");

  // ============= ADMIN SCORE ENTRY & EDIT STATE =============
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [editingScoreRecord, setEditingScoreRecord] = useState<any>(null);
  const [editingSubjectObj, setEditingSubjectObj] = useState<any>(null);
  const [isNewSubjectMode, setIsNewSubjectMode] = useState(false);
  const [scoreInputs, setScoreInputs] = useState<string[]>([]);
  const [commentInputs, setCommentInputs] = useState<string[]>([]);
  const [teacherNameInput, setTeacherNameInput] = useState("");
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [isDeleteScoreConfirmOpen, setIsDeleteScoreConfirmOpen] = useState(false);

  // Chỉ tài khoản Admin mới được phép mở chế độ chỉnh sửa / bổ sung / xóa điểm trên màn hình Xét duyệt
  const canAdminEditScores = useMemo(() => {
    const role = String(currentUser?.role || "").toUpperCase();
    return role === "ADMIN" || role === "SUPER_ADMIN" || role === "SUPERADMIN" || Boolean(currentUser?.isSuperAdmin);
  }, [currentUser]);

  const handleOpenEditScore = (sc: any) => {
    if (!canAdminEditScores) {
      notify("Chế độ chỉnh sửa điểm đã khóa (chỉ tài khoản Admin mới có quyền chỉnh sửa).", "err");
      return;
    }
    if (!sc || sc.id === "tong_diem_tieng_anh") return;
    const subj = sc.subject || (Array.isArray(subjectsList) ? subjectsList.find((s: any) => s.id === sc.subjectId) : null) || {};
    setEditingScoreRecord(sc);
    setEditingSubjectObj(subj);
    setIsNewSubjectMode(false);

    let parsedScores: any[] = [];
    try {
      if (sc.scores) {
        const p = JSON.parse(sc.scores);
        parsedScores = Array.isArray(p) ? p : [p];
      }
    } catch {
      parsedScores = [sc.scores];
    }

    const sCode = (subj.code || "").toLowerCase();
    const sName = (subj.name || "").toLowerCase();
    const isPsych = sCode.includes("tly") || sName.includes("tâm lý");

    if (isPsych) {
      let scNum = parseFloat(parsedScores[6] !== undefined ? parsedScores[6] : (parsedScores[20] !== undefined ? parsedScores[20] : "0"));
      if (isNaN(scNum) || scNum < 0) {
        scNum = parsedScores.slice(0, 20).reduce((acc: number, x: any) => {
          const n = parseFloat(x);
          return acc + (!isNaN(n) && n > 0 ? n : 0);
        }, 0);
      }
      setScoreInputs([String(scNum)]);
    } else {
      const colCount = Math.max(subj.scoreColumns || 1, 1);
      const arr = Array(colCount).fill("");
      for (let i = 0; i < colCount; i++) {
        if (parsedScores[i] !== undefined && parsedScores[i] !== null && parsedScores[i] !== "") {
          arr[i] = String(parsedScores[i]);
        }
      }
      setScoreInputs(arr);
    }

    let parsedComments: any[] = [];
    try {
      if (sc.comments) {
        const p = JSON.parse(sc.comments);
        parsedComments = Array.isArray(p) ? p : [p];
      }
    } catch {
      parsedComments = [sc.comments];
    }
    const commCount = isPsych ? 2 : Math.max(subj.commentColumns || 1, 1);
    const commArr = Array(commCount).fill("");
    for (let i = 0; i < commCount; i++) {
      if (parsedComments[i] !== undefined && parsedComments[i] !== null) {
        commArr[i] = String(parsedComments[i]);
      }
    }
    setCommentInputs(commArr);

    setTeacherNameInput(sc.teacherName || currentUser?.fullName || "");
    setIsScoreModalOpen(true);
  };

  const handleOpenAddScore = () => {
    if (!canAdminEditScores) {
      notify("Chế độ bổ sung điểm đã khóa (chỉ tài khoản Admin mới có quyền chỉnh sửa).", "err");
      return;
    }
    if (!selectedReportStudent) return;
    const existingSubjIds = (selectedReportStudent.scores || []).map((sc: any) => sc.subjectId || sc.subject?.id);
    const available = (subjectsList || []).filter((s: any) => s.status !== "INACTIVE" && !existingSubjIds.includes(s.id));
    const initialSubj = available[0] || (subjectsList || [])[0];
    if (!initialSubj) {
      notify("Không tìm thấy môn khảo sát nào để nhập điểm!", "err");
      return;
    }

    setEditingScoreRecord(null);
    setEditingSubjectObj(initialSubj);
    setIsNewSubjectMode(true);

    const sCode = (initialSubj.code || "").toLowerCase();
    const sName = (initialSubj.name || "").toLowerCase();
    const isPsych = sCode.includes("tly") || sName.includes("tâm lý");

    const colCount = isPsych ? 1 : Math.max(initialSubj.scoreColumns || 1, 1);
    const commCount = isPsych ? 2 : Math.max(initialSubj.commentColumns || 1, 1);

    setScoreInputs(Array(colCount).fill(""));
    setCommentInputs(Array(commCount).fill(""));
    setTeacherNameInput(currentUser?.fullName || "Admin");
    setIsScoreModalOpen(true);
  };

  const handleSelectNewSubject = (subjId: string) => {
    const found = (subjectsList || []).find((s: any) => s.id === subjId);
    if (!found) return;
    setEditingSubjectObj(found);
    const sCode = (found.code || "").toLowerCase();
    const sName = (found.name || "").toLowerCase();
    const isPsych = sCode.includes("tly") || sName.includes("tâm lý");

    const colCount = isPsych ? 1 : Math.max(found.scoreColumns || 1, 1);
    const commCount = isPsych ? 2 : Math.max(found.commentColumns || 1, 1);

    setScoreInputs(Array(colCount).fill(""));
    setCommentInputs(Array(commCount).fill(""));
  };

  const handleSaveScoreSubmit = async () => {
    if (!selectedReportStudent || !editingSubjectObj) return;
    setIsSavingScore(true);

    try {
      const sCode = (editingSubjectObj.code || "").toLowerCase();
      const sName = (editingSubjectObj.name || "").toLowerCase();
      const isPsych = sCode.includes("tly") || sName.includes("tâm lý");

      let finalScoresPayload: any[] = [];
      if (isPsych) {
        let baseArr: any[] = [];
        if (editingScoreRecord?.scores) {
          try {
            const p = JSON.parse(editingScoreRecord.scores);
            if (Array.isArray(p)) baseArr = [...p];
          } catch {}
        }
        while (baseArr.length <= 6) baseArr.push("0");
        const numVal = scoreInputs[0] ? parseFloat(scoreInputs[0]) || 0 : 0;
        baseArr[6] = String(numVal);
        if (baseArr.length > 20) baseArr[20] = String(numVal);
        finalScoresPayload = baseArr;
      } else {
        finalScoresPayload = scoreInputs.map(v => v !== undefined && v !== null ? String(v).trim() : "");
      }

      const finalCommentsPayload = commentInputs.map(c => c !== undefined && c !== null ? String(c).trim() : "");
      const finalTeacher = teacherNameInput.trim() || currentUser?.fullName || "Admin";

      const res = await fetch("/api/teacher-assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedReportStudent.id,
          subjectId: editingSubjectObj.id,
          scores: finalScoresPayload,
          comments: finalCommentsPayload,
          teacherName: finalTeacher,
          adminDossierEdit: true
        })
      });

      const resData = await res.json().catch(() => ({}));

      if (res.ok) {
        notify("Đã lưu điểm môn " + editingSubjectObj.name + " thành công!", "ok");

        setReportStudents(prev => prev.map(s => {
          if (s.id !== selectedReportStudent.id) return s;
          const currentScores = s.scores || [];
          const existIdx = currentScores.findIndex((item: any) => item.subjectId === editingSubjectObj.id || item.subject?.id === editingSubjectObj.id);

          let updatedScoresList;
          if (existIdx >= 0) {
            updatedScoresList = [...currentScores];
            updatedScoresList[existIdx] = {
              ...updatedScoresList[existIdx],
              scores: JSON.stringify(finalScoresPayload),
              comments: JSON.stringify(finalCommentsPayload),
              teacherName: finalTeacher,
              updatedAt: new Date().toISOString(),
              subject: editingSubjectObj
            };
          } else {
            updatedScoresList = [
              ...currentScores,
              {
                id: resData.id || ("sc_" + Date.now()),
                studentId: s.id,
                subjectId: editingSubjectObj.id,
                scores: JSON.stringify(finalScoresPayload),
                comments: JSON.stringify(finalCommentsPayload),
                teacherName: finalTeacher,
                updatedAt: new Date().toISOString(),
                subject: editingSubjectObj
              }
            ];
          }
          return { ...s, scores: updatedScoresList };
        }));

        setActiveSubjectId(editingSubjectObj.id);
        setIsScoreModalOpen(false);
      } else {
        notify(resData.error || "Có lỗi khi lưu điểm!", "err");
      }
    } catch (err: any) {
      notify("Lỗi kết nối khi lưu điểm: " + (err.message || err), "err");
    }
    setIsSavingScore(false);
  };

  const handleDeleteScoreSubmit = async () => {
    if (!selectedReportStudent || !editingSubjectObj) return;
    setIsSavingScore(true);

    try {
      const res = await fetch("/api/teacher-assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteScore",
          studentId: selectedReportStudent.id,
          subjectId: editingSubjectObj.id
        })
      });

      if (res.ok) {
        notify("Đã xóa điểm môn " + editingSubjectObj.name + "!", "ok");
        setReportStudents(prev => prev.map(s => {
          if (s.id !== selectedReportStudent.id) return s;
          return {
            ...s,
            scores: (s.scores || []).filter((sc: any) => sc.subjectId !== editingSubjectObj.id && sc.subject?.id !== editingSubjectObj.id)
          };
        }));
        setIsDeleteScoreConfirmOpen(false);
        setIsScoreModalOpen(false);
      } else {
        const resData = await res.json().catch(() => ({}));
        notify(resData.error || "Có lỗi khi xóa điểm!", "err");
      }
    } catch (err: any) {
      notify("Lỗi kết nối: " + (err.message || err), "err");
    }
    setIsSavingScore(false);
  };
  const [emailResult, setEmailResult] = useState<any>(null);
  const [attachLetters, setAttachLetters] = useState(true);
  const [checkedEmails, setCheckedEmails] = useState({
    tuvan: [] as string[],
    giaovu: [] as string[],
    gdcs: [] as string[],
    cc: false
  });

  const getStudentGroup = (student: any) => {
    if (!student) return "khoi_1";
    
    let studentGroup = "khoi_1";
    const getNumericGrade = (g: any) => {
      if (!g) return null;
      const match = g.toString().match(/\d+/);
      return match ? parseInt(match[0], 10) : null;
    };
    const sGradeNum = getNumericGrade(student.grade);
    
    const gradeMatchedGroups = (docGroups || []).filter(g => {
      const mappedGrades = docGroupGrades[g.id] || [];
      const hasGradeMatch = mappedGrades.some(gradeStr => {
        if (!student.grade) return false;
        const sGrade = student.grade.toString().toLowerCase();
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

    if (student.targetType) {
      const studentTargets = student.targetType.split(',').map((x: any) => x.trim().toLowerCase()).filter(Boolean);
      
      const targetMatch = gradeMatchedGroups.find(g => {
        const mappedTs = docGroupTargets[g.id] || [];
        return mappedTs.some(ts => studentTargets.includes(ts.toLowerCase()));
      });
      
      if (targetMatch) {
        studentGroup = targetMatch.id;
      } else {
        const anyTargetMatch = (docGroups || []).find(g => {
          const mappedTs = docGroupTargets[g.id] || [];
          return mappedTs.some(ts => studentTargets.includes(ts.toLowerCase()));
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
    
    return studentGroup;
  };

  const getStudentCampusConfig = (student: any, isInvitationFlag: boolean, isCommitmentFlag: boolean) => {
    if (!student) return null;

    // Find campus matching active selection in UI form or saved student record
    const effCampus = (typeof reportForm !== "undefined" && reportForm?.admissionCampus && reportForm?.admissionCampus !== "all") ? reportForm.admissionCampus : student.admissionCampus;
    let targetCampus = campuses.find((c: any) => 
      c.id === effCampus ||
      c.campusName === effCampus ||
      c.campusCode === effCampus ||
      effCampus?.includes(c.campusCode) ||
      effCampus?.includes(c.campusName)
    );
    
    // Fallback: Find campus by student's batch/period
    if (!targetCampus && student.batchId) {
      const batchObj = reportBatches.find((b: any) => b.id === student.batchId);
      if (batchObj?.campusId) {
        targetCampus = campuses.find((c: any) => c.id === batchObj.campusId);
      }
    }

    // Fallback: Find campus by UI active selected reportBatchId
    if (!targetCampus && typeof reportBatchId !== "undefined" && reportBatchId !== "all") {
      const batchObj = reportBatches.find((b: any) => b.id === reportBatchId);
      if (batchObj?.campusId) {
        targetCampus = campuses.find((c: any) => c.id === batchObj.campusId);
      }
    }

    // Fallback: Find campus by UI active selected reportSelPeriod first batch
    if (!targetCampus && typeof reportSelPeriod !== "undefined" && reportSelPeriod?.batches) {
      const firstBatch = reportSelPeriod.batches[0];
      if (firstBatch?.campusId) {
        targetCampus = campuses.find((c: any) => c.id === firstBatch.campusId);
      }
    }
    
    if (!targetCampus && campuses.length > 0) {
      targetCampus = campuses[0];
    }
    
    if (targetCampus) {
      const baseKey = isInvitationFlag ? 'thu_moi' : isCommitmentFlag ? 'cam_ket_hoc_tap' : 'thu_chuc_mung';
      const studentGroup = getStudentGroup(student);
      const candidateKeys = [baseKey + '_' + studentGroup, baseKey];
      let typeKey = baseKey;
      
      const matchingKey = candidateKeys.find(k => {
        return localStorage.getItem('report_config_' + targetCampus.id + '_' + k) || localStorage.getItem('report_config_global_' + k);
      });
      if (matchingKey) {
        typeKey = matchingKey;
      }
      const savedCampus = localStorage.getItem('report_config_' + targetCampus.id + '_' + typeKey);
      const savedGlobal = localStorage.getItem('report_config_global_' + typeKey);
      
      let campusData: any = {};
      let globalData: any = {};
      
      if (savedCampus) {
        try { campusData = JSON.parse(savedCampus); } catch (e) {}
      }
      if (savedGlobal) {
        try { globalData = JSON.parse(savedGlobal); } catch (e) {}
      }
      
      // Fallback for old saved campus config
      if (!isCommitmentFlag && Object.keys(campusData).length === 0) {
        const oldSaved = localStorage.getItem('report_config_' + targetCampus.id);
        if (oldSaved) {
          try { campusData = JSON.parse(oldSaved); } catch (e) {}
        }
      }
      
      const mergedTitle = globalData.title || campusData.title || (typeKey === "thu_chuc_mung" ? "BÁO CÁO KẾT QUẢ KHẢO SÁT NĂNG LỰC ĐẦU VÀO" : typeKey === "thu_moi" ? "THƯ MỜI" : "BẢN CAM KẾT HỌC TẬP");
      
      const mLogo = localStorage.getItem('report_config_master_logo');
      const mBg = localStorage.getItem('report_config_master_background');
      const mFooter = localStorage.getItem('report_config_master_footer');

      const mergedLogo = mLogo ? mLogo : (globalData.logo || campusData.logo || "/logo.png");
      const mergedBackground = mBg ? mBg : (globalData.background || campusData.background || "/images/skyline-doc-watermark.png");
      const mergedContent = globalData.content || campusData.content || "";
      const mergedFooter = mFooter ? mFooter : (globalData.footer || campusData.footer || "/images/skyline-doc-footer.png");
      
      const gdcsSig = resolveGdcsSignatureForCampus(targetCampus, student?.signatureName);
      const rawSig = gdcsSig || localStorage.getItem('report_config_signature_' + targetCampus.id) || campusData.signature || "";
      const isApproved = isStudentApprovedByGdcs(student, reportForm?.admissionResult);
      const campusSig = isApproved ? rawSig : "";
      const campusDir = resolveGdcsNameForCampus(targetCampus) || localStorage.getItem('report_config_director_' + targetCampus.id) || campusData.directorName || targetCampus.manager?.fullName || "";
      return {
        title: mergedTitle,
        logo: mergedLogo,
        background: mergedBackground,
        content: mergedContent,
        footer: mergedFooter,
        signature: campusSig,
        isApproved,
        directorName: campusDir
      };
    }
    return null;
  };

  const getStudentDocList = (student: any) => {
    if (typeof window === "undefined" || !student) return [];
    
    let studentGroup = "khoi_1";
    const getNumericGrade = (g: any) => {
      if (!g) return null;
      const match = g.toString().match(/\d+/);
      return match ? parseInt(match[0], 10) : null;
    };
    const sGradeNum = getNumericGrade(student.grade);
    
    const gradeMatchedGroups = docGroups.filter((g: any) => {
      const mappedGrades = docGroupGrades[g.id] || [];
      const hasGradeMatch = mappedGrades.some((gradeStr: string) => {
        if (!student.grade) return false;
        const sGrade = student.grade.toString().toLowerCase();
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

    if (student.targetType) {
      const studentTargets = student.targetType.split(',').map((x: string) => x.trim().toLowerCase()).filter(Boolean);
      
      const targetMatch = gradeMatchedGroups.find((g: any) => {
        const mappedTs = docGroupTargets[g.id] || [];
        return mappedTs.some((ts: string) => studentTargets.includes(ts.toLowerCase()));
      });
      
      if (targetMatch) {
        studentGroup = targetMatch.id;
      } else {
        const anyTargetMatch = docGroups.find((g: any) => {
          const mappedTs = docGroupTargets[g.id] || [];
          return mappedTs.some((ts: string) => studentTargets.includes(ts.toLowerCase()));
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
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    
    if (studentGroup === "khoi_2_5") return defaultDocumentsGrade2_5;
    if (studentGroup === "khoi_6") return defaultDocumentsGrade6;
    if (studentGroup === "khoi_10_noi_tinh") return defaultDocumentsGrade10NoiTinh;
    if (studentGroup === "khoi_10_ngoai_tinh") return defaultDocumentsGrade10NgoaiTinh;
    return defaultDocumentsGrade1;
  };

  const buildLetterHtml = (student: any, config: any, isCommitmentFlag: boolean, isInvitationFlag: boolean = false) => {
    const rawGrade = student?.grade || "1";
    const gradeMatch = rawGrade.toString().match(/\d+/);
    const numericGrade = gradeMatch ? gradeMatch[0] : rawGrade;
    const comSubs = Array.isArray(student?.committedSubjects) 
      ? student.committedSubjects.join(", ") 
      : (student?.committedSubjects || "");
      
    const { actualCampusName, schoolNameFull, truongName } = getCampusAndSchoolName(student?.admissionCampus);
    const renderedContent = (config.content || "")
      .replace(/\{\{schoolName\}\}/g, schoolNameFull)
      .replace(/\{\{truong\}\}/g, truongName)
      .replace(/\{\{fullName\}\}/g, student?.fullName || "")
      .replace(/\{\{grade\}\}/g, numericGrade)
      .replace(/\{\{hocKy\}\}/g, student?.hocKy || "1")
      .replace(/\{\{surveyFormType\}\}/g, student?.surveyFormType || "")
      .replace(/\{\{admissionCampus\}\}/g, actualCampusName || "")
      .replace(/\{\{directorNote\}\}/g, student?.directorNote || "")
      .replace(/\{\{committedSubjects\}\}/g, comSubs)
      .replace(/\{\{signatureName\}\}/g, student?.signatureName || "");

    const paragraphs = renderedContent.split("\n").filter(Boolean);
    const bodyHtml = paragraphs.map((p: string) => '<p style="text-indent: 1cm; margin: 0 0 10px 0;">' + p + '</p>').join("");
    
    const greetingHtml = 'Thân gửi em <strong style="font-weight: 900; font-style: normal; color: #0f172a;">' + student.fullName + '</strong>,';
    const directorName = config.directorName || "Đỗ Quang Trung";
    const getImgTag = (src: string, className: string, style: string = "", alt: string = "") => {
      if (!src) return "";
      const cors = src.startsWith("data:") ? "" : ' crossorigin="anonymous"';
      const styleAttr = style ? ' style="' + style + '"' : "";
      const altAttr = alt ? ' alt="' + alt + '"' : "";
      return '<img class="' + className + '"' + cors + ' src="' + src + '"' + styleAttr + altAttr + ' />';
    };

    const logoHtml = config.logo ? getImgTag(config.logo, "logo-img", "", "Logo") : "";
    const signatureHtml = config.signature ? getImgTag(config.signature, "signature-img", "", "Signature") : "";
    const footerHtml = config.footer ? getImgTag(config.footer, "footer-img", "", "Footer") : "";
    
    const effCampus = (typeof reportForm !== "undefined" && reportForm?.admissionCampus && reportForm?.admissionCampus !== "all") ? reportForm.admissionCampus : student.admissionCampus;
    const campusObj = campuses.find((c: any) => c.id === effCampus || c.campusName === effCampus || c.campusCode === effCampus);
    const campusCodeStr = (campusObj ? campusObj.campusCode || campusObj.campusName : effCampus || "").toUpperCase();
    let schoolName = "TRƯỜNG TH, THCS, THPT SKY-LINE";
    if (campusCodeStr.includes("CS4") || campusCodeStr.includes("HILL") || campusCodeStr.includes("HILLTOP")) {
      schoolName = "TRƯỜNG TH, THCS, THPT SKY-LINE HILL";
    }

    // Format current letter date y nguyên mẫu
    const d = new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const formattedLetterDate = `Đà Nẵng, ngày ${day} tháng ${month} năm ${year}`;

    const campusTitleSuffix = (campusCodeStr.includes("CS1") || campusCodeStr.includes("RIVERSIDE")) ? "RIVERSIDE"
      : (campusCodeStr.includes("CS2") || campusCodeStr.includes("CENTRAL")) ? "CENTRAL"
      : (campusCodeStr.includes("CS3") || campusCodeStr.includes("GLOBAL")) ? "GLOBAL"
      : (campusCodeStr.includes("CS4") || campusCodeStr.includes("HILL")) ? "HILL"
      : (campusCodeStr.includes("CS5") || campusCodeStr.includes("BEACH")) ? "BEACH"
      : campusCodeStr || "GLOBAL";

    const titleText = isInvitationFlag ? "TM. HỘI ĐỒNG TUYỂN SINH" : "TM. HỘI ĐỒNG TUYỂN SINH";
    const subTitleText = isInvitationFlag && !config.signature ? "TRƯỞNG BAN TUYỂN SINH SKY-LINE"
      : `GIÁM ĐỐC ĐIỀU HÀNH SKY-LINE ${campusTitleSuffix}`;
    const signName = isInvitationFlag && !config.signature ? "Ban Tuyển sinh" : directorName;

    const customFooterHtml = config.footer ? getImgTag(config.footer, "footer-img", "width: 100%; max-height: 100px; object-fit: contain;", "Footer") :
      '<div style="width: 100%; font-family: Arial, sans-serif; box-sizing: border-box; text-align: left;">' +
        '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; width: 100%;">' +
          '<span style="font-weight: bold; color: #48BFE3; white-space: nowrap; text-transform: uppercase; font-size: 11.5px; letter-spacing: 0.5px;">HỆ THỐNG GIÁO DỤC SKY-LINE</span>' +
          '<div style="flex-grow: 1; border-top: 1px solid rgba(0, 166, 169, 0.7); height: 0; margin-top: 2px;"></div>' +
          '<span style="font-weight: 600; color: #48BFE3; white-space: nowrap; text-transform: lowercase; font-size: 11px;">www.skylineschool.edu.vn</span>' +
        '</div>' +
        '<div style="display: flex; justify-content: space-between; font-size: 9px; position: relative; width: 100%;">' +
          '<div style="width: 32%; display: flex; flex-direction: column; gap: 4px;">' +
            '<div>' +
              '<p style="font-weight: bold; color: #48BFE3; margin: 0; font-size: 9.5px; line-height: 1.2;">SKY-LINE Riverside</p>' +
              '<p style="color: #555555; margin: 2px 0 0 0; font-size: 8px; line-height: 1.2;">Lô A2.4 Trần Đăng Ninh, P. Hòa Cường, TP. Đà Nẵng</p>' +
            '</div>' +
            '<div>' +
              '<p style="font-weight: bold; color: #48BFE3; margin: 0; font-size: 9.5px; line-height: 1.2;">SKY-LINE Central</p>' +
              '<p style="color: #555555; margin: 2px 0 0 0; font-size: 8px; line-height: 1.2;">Số 48 Nguyễn Du, P. Hải Châu, TP. Đà Nẵng</p>' +
            '</div>' +
            '<div>' +
              '<p style="font-weight: bold; color: #48BFE3; margin: 0; font-size: 9.5px; line-height: 1.2;">SKY-LINE Global</p>' +
              '<p style="color: #555555; margin: 2px 0 0 0; font-size: 8px; line-height: 1.2;">Lô A2 Trần Đăng Ninh, P. Hòa Cường, TP. Đà Nẵng</p>' +
            '</div>' +
          '</div>' +
          '<div style="width: 32%; display: flex; flex-direction: column; gap: 4px;">' +
            '<div>' +
              '<p style="font-weight: bold; color: #48BFE3; margin: 0; font-size: 9.5px; line-height: 1.2;">SKY-LINE Beach</p>' +
              '<p style="color: #555555; margin: 2px 0 0 0; font-size: 8px; line-height: 1.2;">Số 199 Trần Anh Tông, P. Thanh Khê, TP. Đà Nẵng</p>' +
            '</div>' +
            '<div>' +
              '<p style="font-weight: bold; color: #48BFE3; margin: 0; font-size: 9.5px; line-height: 1.2;">SKY-LINE Hill</p>' +
              '<p style="color: #555555; margin: 2px 0 0 0; font-size: 8px; line-height: 1.2;">Khối Hà My Đông A, P. Điện Bàn Đông, TP. Đà Nẵng</p>' +
            '</div>' +
            '<div>' +
              '<p style="font-weight: bold; color: #48BFE3; margin: 0; font-size: 9.5px; line-height: 1.2;">Trung tâm sống thành công - SLS</p>' +
              '<p style="color: #555555; margin: 2px 0 0 0; font-size: 8px; line-height: 1.2;">Số 48 Nguyễn Du, P. Hải Châu, TP. Đà Nẵng</p>' +
            '</div>' +
          '</div>' +
          '<div style="width: 32%; display: flex; align-items: center; justify-content: flex-end; text-align: right; gap: 6px; font-size: 8.5px; font-weight: 600; color: #1e293b;">' +
            '<div style="display: flex; flex-direction: column; line-height: 1.3;">' +
              '<p style="margin: 0;">(+84.236) 378 7777</p>' +
              '<p style="margin: 0;">(+84.236) 356 8777</p>' +
              '<p style="margin: 0;">(+84.236) 378 7779</p>' +
              '<p style="margin: 0;">(+84.235) 375 1777</p>' +
            '</div>' +
          '</div>' +
          '<div style="position: absolute; right: -5px; top: 2px; width: 64px; height: 48px; pointer-events: none; display: flex; align-items: center; justify-content: center; color: #48BFE3;">' +
            '<svg viewBox="0 0 120 60" style="width: 100%; height: 100%; fill: currentColor;">' +
              '<path d="M 8 26 C 24 32, 50 52, 62 60 C 78 36, 102 16, 118 3 C 95 16, 76 44, 62 62 C 48 46, 25 32, 8 26 Z" />' +
            '</svg>' +
          '</div>' +
        '</div>' +
      '</div>';

    // Page 2: Admission Documents Checklist (Danh mục Hồ sơ nhập học) - Active for congratulations, invitations and commitments!
    let page2Html = "";
    if (student.admissionResult === "Đạt" || student.admissionResult === "Đạt cam kết" || student.admissionResult === "Đạt - Giao lưu" || isCommitmentFlag || isInvitationFlag) {
      const docList = getStudentDocList(student);
      if (docList && docList.length > 0) {
        const rowsHtml = docList.map((item: any, idx: number) => {
          return '<tr style="border-bottom: 1px solid #000000;">' +
            '<td style="padding: 10px; border-right: 1px solid #000000; text-align: center; color: #000000;">' + (idx + 1) + '</td>' +
            '<td style="padding: 10px 15px; border-right: 1px solid #000000; font-weight: bold; color: #000000;">' + item.name + '</td>' +
            '<td style="padding: 10px; text-align: center; font-weight: bold; color: #000000;" className="p-2 border border-slate-200">' + item.qty + '</td>' +
          '</tr>';
        }).join("");

        page2Html = '<div class="print-page">' +
            getImgTag(config.background || DEFAULT_WATERMARK_SVG, "print-watermark", "display: block; position: absolute; top: 22%; left: 10%; transform: none; width: 80%; height: auto; opacity: 0.08; z-index: 0; pointer-events: none;", "Watermark") +
            '<div class="header-container" style="display: flex; flex-direction: column; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 12px; position: relative; z-index: 10;">' +
              '<div style="display: flex; align-items: center; justify-content: space-between;">' +
                logoHtml +
              '</div>' +
              '<div style="text-align: left; margin-top: 4px;">' +
                '<h4 style="font-family: Arial, sans-serif; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #1e293b; margin: 0;">' + schoolName + '</h4>' +
              '</div>' +
            '</div>' +
            '<div class="letter-title">' +
              '<h2>DANH MỤC HỒ SƠ NHẬP HỌC</h2>' +
            '</div>' +
            '<div style="margin-top: 30px; border: 1px solid #000000; overflow: hidden; position: relative; z-index: 10;">' +
              '<table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; color: #000000; font-family: \'Times New Roman\', Times, serif;" className="border border-slate-200 border-collapse">' +
                '<thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">' +
                  '<tr style="background-color: #ffffff; border-bottom: 1px solid #000000;">' +
                    '<th style="padding: 10px; border-right: 1px solid #000000; text-align: center; font-weight: bold; width: 60px; text-transform: uppercase; color: #000000;">STT</th>' +
                    '<th style="padding: 10px 15px; border-right: 1px solid #000000; text-align: center; font-weight: bold; text-transform: uppercase; color: #000000;">Tên hồ sơ</th>' +
                    '<th style="padding: 10px; text-align: center; font-weight: bold; width: 120px; text-transform: uppercase; color: #000000;" className="p-2 border border-white/15 font-semibold">Số lượng</th>' +
                  '</tr>' +
                '</thead>' +
                '<tbody className="divide-y divide-[#E2E8F0] text-xs bg-white">' +
                  rowsHtml +
                '</tbody>' +
              '</table>' +
            '</div>' +
            '<p style="margin-top: 35px; font-size: 14px; font-weight: bold; color: #000000; line-height: 1.6; text-align: left; position: relative; z-index: 10;">' +
              'Quý phụ huynh vui lòng bổ sung hồ sơ thiếu (nếu có) trong vòng 10 ngày kể từ ngày nộp Hồ sơ.' +
            '</p>' +
            '<div class="footer-container">' +
              customFooterHtml +
            '</div>' +
          '</div>';
      }
    }

    return '<!DOCTYPE html>' +
      '<html>' +
      '<head>' +
        '<meta charset="utf-8">' +
        '<title>' + (config.title || "Tài liệu") + '</title>' +
        '<style>' +
          '@page {' +
            'size: A4;' +
            'margin: 0;' +
          '}' +
          'body {' +
            'margin: 0;' +
            'padding: 0;' +
            'background-color: #ffffff;' +
            '-webkit-print-color-adjust: exact !important;' +
            'print-color-adjust: exact !important;' +
          '}' +
          '.print-page {' +
            'font-family: "Times New Roman", Times, serif;' +
            'width: 210mm;' +
            'height: 296.8mm;' +
            'padding: 12.7mm 15mm 48mm 15mm;' +
            'box-sizing: border-box;' +
            'position: relative;' +
            'overflow: hidden;' +
            'background-color: #ffffff;' +
          '}' +
          '.print-page + .print-page {' +
            'page-break-before: always !important;' +
            'break-before: page !important;' +
          '}' +
          '.print-watermark {' +
            'display: block;' +
            'position: absolute;' +
            'top: 22%;' +
            'left: 10%;' +
            'transform: none;' +
            'width: 80%;' +
            'height: auto;' +
            'opacity: 0.08;' +
            'z-index: 0;' +
            'pointer-events: none;' +
          '}' +
          '.logo-img {' +
            'max-height: 48px;' +
            'object-fit: contain;' +
          '}' +
          '.letter-title {' +
            'text-align: center;' +
            'margin: 20px 0;' +
            'position: relative;' +
            'z-index: 10;' +
          '}' +
          '.letter-title h2 {' +
            'font-size: 22px;' +
            'font-weight: 900;' +
            'letter-spacing: 0.5px;' +
            'color: #1e1b4b;' +
            'text-transform: uppercase;' +
            'margin: 0;' +
          '}' +
          '.greeting {' +
            'font-size: 16px;' +
            'font-style: italic;' +
            'color: #1e293b;' +
            'margin-bottom: 12px;' +
            'position: relative;' +
            'z-index: 10;' +
          '}' +
          '.content-body {' +
            'font-size: 14pt;' +
            'line-height: 1.5;' +
            'text-align: justify;' +
            'color: #1e293b;' +
            'position: relative;' +
            'z-index: 10;' +
          '}' +
          '.signature-section {' +
            'margin-top: 30px;' +
            'display: flex;' +
            'justify-content: flex-end;' +
            'position: relative;' +
            'z-index: 10;' +
          '}' +
          '.signature-block {' +
            'text-align: center;' +
            'width: 200px;' +
          '}' +
          '.signature-title {' +
            'font-size: 14px;' +
            'font-weight: bold;' +
            'color: #1e293b;' +
            'margin-bottom: 4px;' +
          '}' +
          '.signature-desc {' +
            'font-size: 12px;' +
            'color: #475569;' +
            'font-style: italic;' +
            'margin-bottom: 10px;' +
          '}' +
          '.signature-img-container {' +
            'height: 64px;' +
            'display: flex;' +
            'justify-content: center;' +
            'align-items: center;' +
            'margin-bottom: 8px;' +
          '}' +
          '.signature-img {' +
            'max-height: 64px;' +
            'object-fit: contain;' +
          '}' +
          '.signature-name {' +
            'font-size: 15px;' +
            'font-weight: bold;' +
            'color: #1e293b;' +
          '}' +
          '.footer-container {' +
            'position: absolute;' +
            'bottom: 8mm;' +
            'left: 0;' +
            'right: 0;' +
            'width: 100%;' +
            'padding-left: 15mm;' +
            'padding-right: 15mm;' +
            'box-sizing: border-box;' +
            'z-index: 10;' +
          '}' +
          '.footer-img {' +
            'width: 100%;' +
            'max-height: 100px;' +
            'object-fit: contain;' +
          '}' +
        '</style>' +
      '</head>' +
      '<body>' +
        '<div class="print-page">' +
          getImgTag(config.background || DEFAULT_WATERMARK_SVG, "print-watermark", "display: block; position: absolute; top: 22%; left: 10%; transform: none; width: 80%; height: auto; opacity: 0.08; z-index: 0; pointer-events: none;", "Watermark") +
          '<div class="header-container" style="display: flex; flex-direction: column; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 12px; position: relative; z-index: 10;">' +
            '<div style="display: flex; align-items: center; justify-content: space-between;">' +
              logoHtml +
            '</div>' +
            '<div style="text-align: left; margin-top: 4px;">' +
              '<h4 style="font-family: Arial, sans-serif; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #1e293b; margin: 0;">' + schoolName + '</h4>' +
            '</div>' +
          '</div>' +
          '<div class="letter-title">' +
            '<h2>' + config.title + '</h2>' +
          '</div>' +
          '<div class="greeting">' +
            greetingHtml +
          '</div>' +
          '<div class="content-body">' +
            bodyHtml +
          '</div>' +
          '<div class="signature-section" style="margin-top: 30px; display: flex; justify-content: flex-end; position: relative; z-index: 10;">' +
            '<div class="signature-block" style="text-align: center; width: 240px;">' +
              '<div style="font-size: 13px; font-style: italic; color: #4b5563; margin-bottom: 4px;">' + formattedLetterDate + '</div>' +
              '<div class="signature-title" style="font-size: 12px; font-weight: bold; color: #1e1b4b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">' + titleText + '</div>' +
              '<div style="font-size: 10px; font-weight: bold; color: #312e81; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">' + subTitleText + '</div>' +
              '<div class="signature-img-container" style="height: 64px; display: flex; justify-content: center; align-items: center; margin-bottom: 8px;">' +
                (config.signature ? signatureHtml : '') +
              '</div>' +
              '<div class="signature-name" style="font-size: 14px; font-weight: bold; color: #1e293b;">' + signName + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="footer-container">' +
            customFooterHtml +
          '</div>' +
        '</div>' +
        page2Html +
      '</body>' +
      '</html>';
  };;

  const handleCheckboxChange = (group: 'tuvan' | 'giaovu' | 'gdcs' | 'cc', cs?: string) => {
    setCheckedEmails(prev => {
      const nextChecked = { ...prev };
      if (group === 'cc') {
        nextChecked.cc = !prev.cc;
      } else if (cs) {
        if (prev[group].includes(cs)) {
          nextChecked[group] = prev[group].filter(item => item !== cs);
        } else {
          nextChecked[group] = [...prev[group], cs];
        }
      }
      
      // Calculate new checked emails
      const selectedEmails: string[] = [];
      nextChecked.tuvan.forEach(c => selectedEmails.push(EMAIL_MAP.tuvan[c as keyof typeof EMAIL_MAP.tuvan]));
      nextChecked.giaovu.forEach(c => selectedEmails.push(EMAIL_MAP.giaovu[c as keyof typeof EMAIL_MAP.giaovu]));
      nextChecked.gdcs.forEach(c => selectedEmails.push(EMAIL_MAP.gdcs[c as keyof typeof EMAIL_MAP.gdcs]));
      if (nextChecked.cc) {
        selectedEmails.push(EMAIL_MAP.cc);
      }
      
      // Parse current manual emails
      const currentEmails = recipientEmail.split(',').map(e => e.trim()).filter(Boolean);
      const manualEmails = currentEmails.filter(e => !allMapEmails.includes(e));
      
      // Combine
      const finalEmails = [...manualEmails, ...selectedEmails];
      
      setRecipientEmail(finalEmails.join(', '));
      return nextChecked;
    });
  };

  const handleRecipientEmailChange = (val: string) => {
    setRecipientEmail(val);
    const emailsList = val.split(',').map(e => e.trim()).filter(Boolean);
    const parsedChecked = {
      tuvan: [] as string[],
      giaovu: [] as string[],
      gdcs: [] as string[],
      cc: false
    };
    
    emailsList.forEach(email => {
      Object.entries(EMAIL_MAP.tuvan).forEach(([cs, addr]) => {
        if (addr === email) parsedChecked.tuvan.push(cs);
      });
      Object.entries(EMAIL_MAP.giaovu).forEach(([cs, addr]) => {
        if (addr === email) parsedChecked.giaovu.push(cs);
      });
      Object.entries(EMAIL_MAP.gdcs).forEach(([cs, addr]) => {
        if (addr === email) parsedChecked.gdcs.push(cs);
      });
      if (email === EMAIL_MAP.cc) parsedChecked.cc = true;
    });
    
    setCheckedEmails(parsedChecked);
  };

  const handleOpenEmailModal = () => {
    const targetStudents = reportStudents.filter(s => 
      (reportBatchId === "all" || s.batchId === reportBatchId)
    );
    const activeBatchName = reportBatchId === "all" ? "Tất cả các đợt" : reportBatchId === "none" ? "Khảo sát lẻ (không thuộc đợt)" : reportBatches.find(b => b.id === reportBatchId)?.name || "Đợt khảo sát";
    const activePeriodName = reportSelPeriod?.name || "Kỳ khảo sát";
    
    // Default checked recipient configurations (Giáo vụ, Tư vấn, GĐCS CS1, CS2, CS3, CS4 and CC)
    const targetCampuses = ['CS1', 'CS2', 'CS3', 'CS4'];
    const defaultChecked = {
      tuvan: [...targetCampuses],
      giaovu: [...targetCampuses],
      gdcs: [...targetCampuses],
      cc: true
    };
    
    // Accumulate distinct emails
    const initialEmailsSet = new Set();
    const userEmail = currentUser?.email || "ktdbcl@skylineschool.edu.vn";
    userEmail.split(',').map(e => e.trim()).filter(Boolean).forEach(e => initialEmailsSet.add(e));
    
    targetCampuses.forEach(cs => {
      if (EMAIL_MAP.tuvan[cs]) initialEmailsSet.add(EMAIL_MAP.tuvan[cs]);
      if (EMAIL_MAP.giaovu[cs]) initialEmailsSet.add(EMAIL_MAP.giaovu[cs]);
      if (EMAIL_MAP.gdcs[cs]) initialEmailsSet.add(EMAIL_MAP.gdcs[cs]);
    });
    initialEmailsSet.add(EMAIL_MAP.cc);
    
    const finalInitialEmails = Array.from(initialEmailsSet).join(', ');
    
    setRecipientEmail(finalInitialEmails);
    setEmailSubject(`[Báo cáo nhanh] Kết quả Khảo sát đầu vào - Kỳ: ${activePeriodName} - Đợt: ${activeBatchName}`);
    setEmailStudents(targetStudents);
    setEmailResult(null);
    setAttachLetters(true); // Default attachments is active
    
    setCheckedEmails(defaultChecked);
    setIsEmailModalOpen(true);
  };;

  const getHtml2Pdf = async () => {
    if (typeof window !== "undefined" && (window as any).html2pdf) {
      return (window as any).html2pdf;
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload = () => {
        if ((window as any).html2pdf) resolve((window as any).html2pdf);
        else reject(new Error("html2pdf failed to load"));
      };
      script.onerror = () => reject(new Error("Failed to load html2pdf script"));
      document.head.appendChild(script);
    });
  };

  const generatePdfBase64 = async (html2pdf: any, docHtml: string, opt: any) => {
    // Query all style and stylesheet link elements in the document
    const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
    const detachedElements: any[] = [];

    // Detach all style elements to completely hide Tailwind's modern oklch/lab colors from html2canvas
    styleElements.forEach((el: any) => {
      const parent = el.parentNode;
      if (parent) {
        try {
          parent.removeChild(el);
          detachedElements.push({ element: el, parent });
        } catch (err) {
          console.error("Failed to detach style element:", err);
        }
      }
    });

    try {
      const pdfBase64 = await html2pdf().from(docHtml).set(opt).outputPdf('datauristring');
      return pdfBase64;
    } finally {
      // Re-attach all style elements safely using appendChild to prevent insertBefore sibling errors
      detachedElements.forEach(({ element, parent }) => {
        if (parent) {
          try {
            parent.appendChild(element);
          } catch (e) {
            console.error("Failed to re-attach style element:", e);
          }
        }
      });
    }
  };;;

  const handleSendBatchApprovalEmail = async () => {
    try {
      const activeBatch = reportBatches.find(b => b.id === reportBatchId);
      if (!activeBatch) {
        alert(`Không tìm thấy đợt khảo sát đã chọn (ID: ${reportBatchId})!`);
        return;
      }

      // Resolve GDCS email using the same campus lookup logic
      const periodCampusId = reportSelPeriod?.campusId;
      const batchCampusId = activeBatch?.campusId;
      let targetCampusId = batchCampusId || periodCampusId;
      
      if (!targetCampusId) {
        const fullNameStr = `${activeBatch?.name || ""} ${reportSelPeriod?.name || ""}`;
        const matchedCampus = campuses.find(c => 
          (c.campusCode && fullNameStr.includes(c.campusCode)) || 
          (c.campusName && fullNameStr.includes(c.campusName)) ||
          (c.campusCode === "CS3" && fullNameStr.includes("CS3")) ||
          (c.campusCode === "CS1" && fullNameStr.includes("CS1")) ||
          (c.campusCode === "CS2" && fullNameStr.includes("CS2"))
        );
        if (matchedCampus) {
          targetCampusId = matchedCampus.id;
        }
      }

      const campusObj = campuses.find(c => c.id === targetCampusId);
      const campusName = campusObj?.campusName || activeBatch?.name?.split("|")[1]?.trim() || "Cơ sở";
      const routedGdcs = campusObj?.campusCode ? emailRoutingConfig?.campusEmails?.[campusObj.campusCode]?.gdcs : "";
      const gdcsEmail = (routedGdcs && routedGdcs.split(/[,;]/)[0].trim())
        || (campusObj?.campusCode && EMAIL_MAP.gdcs[campusObj.campusCode as keyof typeof EMAIL_MAP.gdcs])
        || EMAIL_MAP.gdcs.CS1;

      const isOpenDay = reportSelPeriod?.name?.toLowerCase().includes("open day");
      let confirmMsg = "";
      if (isOpenDay) {
        confirmMsg = `Kỳ khảo sát Open Day sẽ tự động gửi email thông báo xét duyệt đến Giám đốc của từng Cơ sở đăng ký của học sinh trong Đợt khảo sát "${activeBatch.name}". Bạn có chắc chắn muốn gửi?`;
      } else {
        confirmMsg = `Gửi email thông báo cho GĐCS cơ sở ${campusName} để xét duyệt Đợt khảo sát "${activeBatch.name}"?\nEmail nhận: ${gdcsEmail}`;
      }
      
      const confirmSend = window.confirm(confirmMsg);
      if (!confirmSend) return;

      setSendingBatchEmail(true);
      const res = await fetch("/api/admin/send-batch-approval-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodId: reportPeriodId,
          batchId: reportBatchId,
          gdcsEmail: gdcsEmail,
          isPreschool: false
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.groupedSent) {
          const sentDetails = Object.entries(data.groupedSent).map(([email, count]) => `${email} (${count} học sinh)`).join("\n");
          alert(`Đã gửi email thông báo xét duyệt Đợt khảo sát thành công đến các GĐCS:\n${sentDetails}`);
        } else {
          alert(`Đã gửi email thông báo xét duyệt Đợt khảo sát thành công đến GĐCS: ${gdcsEmail}!`);
        }
      } else {
        alert("Có lỗi xảy ra: " + (data.error || "Không rõ nguyên nhân"));
      }
    } catch (err) {
      alert("Lỗi xử lý: " + err.message);
      console.error(err);
    } finally {
      setSendingBatchEmail(false);
    }
  };

  const handleSendQuickEmailSubmit = async () => {
    if (!recipientEmail.trim()) {
      alert("Vui lòng nhập email người nhận!");
      return;
    }
    setEmailSending(true);
    setEmailSendingStatus("Đang khởi tạo...");
    setEmailResult(null);
    try {
      const activeBatchName = reportBatchId === "all" ? "Tất cả các đợt" : reportBatchId === "none" ? "Khảo sát lẻ (không thuộc đợt)" : reportBatches.find(b => b.id === reportBatchId)?.name || "Đợt khảo sát";
      const activePeriodName = reportSelPeriod?.name || "Kỳ khảo sát";

      const pdfAttachments: { filename: string; content: string }[] = [];
      if (attachLetters) {
        const eligibleForPdf = emailStudents.filter(
          (s: any) => s.admissionResult === "Đạt" || s.admissionResult === "Đạt cam kết"
        );
        if (eligibleForPdf.length > 0) {
          try {
            const html2pdf = await getHtml2Pdf();
            for (let i = 0; i < eligibleForPdf.length; i++) {
              const s = eligibleForPdf[i];
              const config = getStudentCampusConfig(s, false, false);
              if (!config) continue;
              setEmailSendingStatus(`Đang tạo PDF Thư chúc mừng (${i + 1}/${eligibleForPdf.length}): ${s.fullName}`);
              const docHtml = buildLetterHtml(s, config, false);
              const filename = `Thu_Chuc_Mung_${String(s.fullName || "HocSinh").replace(/\s+/g, "_")}.pdf`;
              const opt = {
                margin: 0,
                filename,
                image: { type: "jpeg", quality: 0.96 },
                html2canvas: { scale: 1.6, useCORS: true, logging: false, letterRendering: true },
                jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
                pagebreak: { mode: ["avoid-all", "css"] }
              };
              const dataUri = await generatePdfBase64(html2pdf, docHtml, opt);
              const base64Content = String(dataUri || "").includes(",") ? String(dataUri).split(",")[1] : String(dataUri || "");
              if (base64Content) {
                pdfAttachments.push({ filename, content: base64Content });
              }
            }
          } catch (pdfErr) {
            console.warn("Quick email PDF attachment generation warning:", pdfErr);
          }
        }
      }

      setEmailSendingStatus("Đang truyền tải & gửi Email...");

      const enrichedStudents = emailStudents.map((s: any) => ({
        ...s,
        periodName: s?.period?.name || reportSelPeriod?.name || "",
        batchName: s?.batch?.name || reportBatches.find((b: any) => b.id === s?.batchId)?.name || "",
        committedSubjectsList: s.committedSubjects || ""
      }));

      const res = await fetch("/api/admin/send-quick-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipientEmail,
          subject: emailSubject,
          periodName: activePeriodName,
          batchName: activeBatchName,
          students: enrichedStudents,
          baseUrl: typeof window !== "undefined" ? window.location.origin : "",
          attachLetters: Boolean(attachLetters && pdfAttachments.length > 0),
          pdfAttachments
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailResult({ sent: data.sent, error: data.error, html: data.html });
        if (data.sent) {
          alert("Đã gửi email báo cáo nhanh thành công!");
        }
      } else {
        alert("Có lỗi xảy ra: " + (data.error || "Không rõ nguyên nhân"));
      }
    } catch (err) {
      alert("Lỗi kết nối: " + err.message);
    } finally {
      setEmailSending(false);
      setEmailSendingStatus("");
    }
  };

  const handleExportDirectPDFs = async () => {
    const eligibleStudents = emailStudents.filter(s => s.admissionResult === "Đạt" || s.admissionResult === "Đạt cam kết");
    if (eligibleStudents.length === 0) {
      alert("Không có học sinh nào đạt hoặc đạt cam kết để xuất PDF!");
      return;
    }
    
    setEmailSending(true);
    setEmailSendingStatus("Đang khởi tạo...");
    
    try {
      const html2pdf = await getHtml2Pdf();
      
      let count = 0;
      const totalPdfs = eligibleStudents.length;

      for (const s of emailStudents) {
        if (s.admissionResult === "Đạt" || s.admissionResult === "Đạt cam kết") {
          const config = getStudentCampusConfig(s, false, false);
          if (config) {
            count++;
            setEmailSendingStatus(`Đang tải (${count}/${totalPdfs}): Thư chúc mừng - ${s.fullName.split(' ').pop()}`);
            const docHtml = buildLetterHtml(s, config, false);
            const filename = `Thu_Chuc_Mung_${s.fullName.replace(/\s+/g, '_')}.pdf`;
            const opt = {
              margin: 0,
              filename: filename,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 1.8, useCORS: true, logging: false, letterRendering: true },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
              pagebreak: { mode: ['avoid-all', 'css'] }
            };

            const pdfBase64 = await generatePdfBase64(html2pdf, docHtml, opt);
            
            // Ultra-robust Blob-based download to bypass browser size and security limitations on data URIs
            const base64Data = pdfBase64.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
            
            await new Promise(r => setTimeout(r, 600));
          }
        }
      }
      alert("Đã tải xuống toàn bộ tệp PDF thành công!");
    } catch (err) {
      alert("Lỗi xuất PDF: " + err.message);
    } finally {
      setEmailSending(false);
      setEmailSendingStatus("");
    }
  };

  const [reportLoading, setReportLoading] = useState(false);

  const [saveReportLoading, setSaveReportLoading] = useState(false);
  const [sendingApproval, setSendingApproval] = useState(false);
  const [sendingApprovalId, setSendingApprovalId] = useState("");
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isInvitation, setIsInvitation] = useState(false);
  const [isCommitment, setIsCommitment] = useState(false);
  const [includeChecklistSheet, setIncludeChecklistSheet] = useState(false);
  // Handler duyệt nhanh 1 học sinh ngay trên dòng
  const handleQuickApproveStudent = async (student: any, resultType: "Đạt" | "Đạt cam kết" | "Không đạt") => {
    if (!student) return;
    if (resultType === "Đạt cam kết") {
      pendingQuickResultRef.current = { studentId: student.id, result: "Đạt cam kết" };
      setReportStudentId(student.id);
      setReportForm(f => ({ ...f, admissionResult: "Đạt cam kết" }));
      return;
    }

    setInlineApprovalLoadingId(student.id);
    try {
      const stuCampusObj = resolveCampusObjForStudent(student);
      const stuGdcsName = resolveGdcsNameForCampus(stuCampusObj);
      const isGdcsCurrentUser = ["GDCS", "GĐ_CS", "GD_CS", "GĐCS", "BGH", "BGH_CS", "HIEU_TRUONG"].includes((currentUser?.role || "").toUpperCase());
      const approverName = stuGdcsName || (isGdcsCurrentUser ? currentUser?.fullName : "") || "Giám đốc Cơ sở";
      const finalCampus = stuCampusObj?.campusName || (campuses.find(c => c.id === reportCampusFilter)?.campusName) || student.admissionCampus || "";

      const now = new Date();
      const formattedTime = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const oldRes = student.admissionResult || "Chưa duyệt";
      const existingParsed = parseApprovalHistory(student.directorNote);
      const newHistoryItem = {
        timestamp: formattedTime,
        approver: approverName,
        oldResult: oldRes,
        newResult: resultType,
        note: "Xét duyệt nhanh trên bảng tổng hợp"
      };
      const updatedHistory = [newHistoryItem, ...existingParsed.history];
      const historyBlock = updatedHistory.map(h =>
        `• ${h.timestamp} | ${h.approver} | ${h.oldResult} ➔ ${h.newResult} | Lý do: ${h.note || "Không có ghi chú"}`
      ).join("\n");
      const baseNote = existingParsed.cleanNote || `Xét duyệt: ${resultType}`;
      const finalNote = `${baseNote.trim()}\n\n--- LỊCH SỬ XÉT DUYỆT & HIỆU CHỈNH ---\n${historyBlock}`;

      const res = await fetch("/api/input-assessment-students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: student.id,
          data: {
            admissionResult: resultType,
            admissionCampus: finalCampus,
            signatureName: approverName,
            directorNote: finalNote
          }
        })
      });
      const resData = await res.json();
      if (res.ok) {
        notify(`Đã phê duyệt "${resultType}" cho học sinh ${student.fullName}!`, "ok");
        setReportStudents(prev => prev.map(s => s.id === student.id ? {
          ...s,
          admissionResult: resultType,
          admissionCampus: finalCampus,
          signatureName: approverName,
          directorNote: finalNote
        } : s));

        if (autoSendApprovalEmail) {
          try {
            fetch("/api/admin/send-approval-result-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                periodId: reportPeriodId,
                periodName: reportSelPeriod?.name,
                batchId: student.batchId || reportBatchId,
                batchName: rawReportBatches.find(b => b.id === (student.batchId || reportBatchId))?.name,
                campusId: stuCampusObj?.id || (reportCampusFilter !== "all" ? reportCampusFilter : resolveStudentCampusId(student)),
                campusName: finalCampus,
                approverName,
                approverRole: isGdcsCurrentUser ? "Giám đốc Cơ sở" : "Hội đồng Tuyển sinh",
                emailConfig: emailRoutingConfig,
                students: [{
                  ...student,
                  admissionResult: resultType,
                  admissionCampus: finalCampus,
                  directorNote: finalNote
                }]
              })
            }).then(r => r.json()).then(mailData => {
              if (mailData.success) {
                notify("Đã gửi email thông báo kết quả đến GĐCS, Tư vấn Cơ sở, Giáo vụ Cơ sở và Ban KT&ĐBCL!", "ok");
              }
            }).catch(() => {});
          } catch {}
        }
      } else {
        notify(resData.error || "Không thể phê duyệt học sinh", "err");
      }
    } catch (e: any) {
      notify("Lỗi khi xét duyệt: " + (e?.message || e), "err");
    } finally {
      setInlineApprovalLoadingId(null);
    }
  };

  // Handler duyệt hàng loạt (Batch Approval)
  const handleBatchApprove = async (resultType: "Đạt" | "Không đạt") => {
    if (selectedStudentIds.length === 0) return;
    if (!window.confirm(`Xác nhận phê duyệt kết quả "${resultType}" cho ${selectedStudentIds.length} học sinh đã chọn?`)) {
      return;
    }

    setBatchActionLoading(true);
    try {
      const selectedStuObjects = reportStudents.filter(s => selectedStudentIds.includes(s.id));
      const firstSelectedStu = selectedStuObjects[0];
      const batchCampusObj = (firstSelectedStu ? resolveCampusObjForStudent(firstSelectedStu) : null) || campuses.find(c => c.id === reportCampusFilter) || null;
      const batchGdcsName = resolveGdcsNameForCampus(batchCampusObj);
      const isGdcsCurrentUser = ["GDCS", "GĐ_CS", "GD_CS", "GĐCS", "BGH", "BGH_CS", "HIEU_TRUONG"].includes((currentUser?.role || "").toUpperCase());
      const approverName = batchGdcsName || (isGdcsCurrentUser ? currentUser?.fullName : "") || "Giám đốc Cơ sở";
      const finalCampus = batchCampusObj?.campusName || "";
      const batchNote = `Phê duyệt hàng loạt: ${resultType} bởi ${approverName} vào lúc ${new Date().toLocaleString("vi-VN")}`;

      const res = await fetch("/api/input-assessment-students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedStudentIds,
          data: {
            admissionResult: resultType,
            admissionCampus: finalCampus,
            signatureName: approverName,
            directorNote: batchNote
          }
        })
      });
      const resData = await res.json();
      if (res.ok) {
        notify(`Đã phê duyệt "${resultType}" thành công cho ${selectedStudentIds.length} học sinh!`, "ok");
        setReportStudents(prev => prev.map(s => selectedStudentIds.includes(s.id) ? {
          ...s,
          admissionResult: resultType,
          admissionCampus: finalCampus,
          signatureName: approverName,
          directorNote: batchNote
        } : s));
        setSelectedStudentIds([]);

        if (autoSendApprovalEmail && selectedStuObjects.length > 0) {
          try {
            fetch("/api/admin/send-approval-result-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                periodId: reportPeriodId,
                periodName: reportSelPeriod?.name,
                batchId: firstSelectedStu?.batchId || reportBatchId,
                batchName: rawReportBatches.find(b => b.id === (firstSelectedStu?.batchId || reportBatchId))?.name,
                campusId: batchCampusObj?.id || (reportCampusFilter !== "all" ? reportCampusFilter : undefined),
                campusName: finalCampus,
                approverName,
                approverRole: isGdcsCurrentUser ? "Giám đốc Cơ sở" : "Hội đồng Tuyển sinh",
                emailConfig: emailRoutingConfig,
                students: selectedStuObjects.map(s => ({
                  ...s,
                  admissionResult: resultType,
                  admissionCampus: finalCampus || s.admissionCampus,
                  directorNote: batchNote
                }))
              })
            }).then(r => r.json()).then(mailData => {
              if (mailData.success) {
                notify("Đã gửi email thông báo kết quả đến GĐCS, Tư vấn Cơ sở, Giáo vụ Cơ sở và Ban KT&ĐBCL!", "ok");
              }
            }).catch(() => {});
          } catch {}
        }
      } else {
        notify(resData.error || "Lỗi khi phê duyệt hàng loạt", "err");
      }
    } catch (e: any) {
      notify("Lỗi hệ thống: " + (e?.message || e), "err");
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allPageIds = paginatedReportStudents.map(s => s.id);
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...allPageIds])));
    } else {
      const pageIdSet = new Set(paginatedReportStudents.map(s => s.id));
      setSelectedStudentIds(prev => prev.filter(id => !pageIdSet.has(id)));
    }
  };

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Helper hiển thị tóm tắt điểm thi các môn trên hàng danh sách
  const renderStudentScoresCell = (student: any) => {
    if (student.isAbsent) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          Vắng thi
        </span>
      );
    }
    const scores = student.scores || [];
    if (!scores || scores.length === 0) {
      return <span className="text-slate-400 text-[11px] italic">Chưa có điểm</span>;
    }

    const items: { label: string; shortLabel: string; val: string; num: number; badgeClass: string }[] = [];

    for (const sc of scores) {
      const sub = sc.subject || {};
      const code = (sub.code || sc.subjectCode || "").toLowerCase();
      const name = (sub.name || sc.subjectName || "").toLowerCase();

      let val: string | null = null;
      let shortLabel = "";
      let num = NaN;

      try {
        let rawArr: any[] = [];
        if (sc.scores) {
          const parsed = typeof sc.scores === "string" ? JSON.parse(sc.scores) : sc.scores;
          rawArr = Array.isArray(parsed) ? parsed : [parsed];
        }

        if (code.includes("tly") || name.includes("tâm lý")) {
          shortLabel = "TL";
          const total = rawArr[6] !== undefined && rawArr[6] !== "" && rawArr[6] !== null ? rawArr[6] : rawArr[20];
          if (total !== undefined && total !== "" && total !== null) {
            val = `${total}đ`;
            num = parseFloat(total);
          } else {
            const nonZero = rawArr.find((x: any) => x !== "0" && x !== 0 && x !== "" && x !== null);
            if (nonZero !== undefined) {
              val = `${nonZero}đ`;
              num = parseFloat(nonZero);
            }
          }
        } else if (code.includes("tci") || code.includes("cpt") || name.includes("chuẩn") || name.includes("phát triển")) {
          shortLabel = "TCI";
          const passedCount = rawArr.filter((x: any) => {
            const sx = String(x ?? "").trim();
            return sx === "3" || sx === "Đạt" || sx === "DAT";
          }).length;
          const totalLen = rawArr.length > 0 ? rawArr.length : 16;
          if (rawArr.length > 0) {
            val = `${passedCount}/${totalLen} Đạt`;
            num = (passedCount / totalLen) * 10;
          }
        } else if (code.includes("nltd") || name.includes("năng lực tư duy")) {
          shortLabel = "NLTD";
          const pctVal = rawArr.length >= 5 ? rawArr[4] : rawArr[0];
          if (pctVal !== undefined && pctVal !== "" && pctVal !== null) {
            val = `${pctVal}%`;
            num = parseFloat(pctVal) / 10;
          }
        } else if (code.includes("tavd") || (name.includes("tiếng anh") && name.includes("vấn đáp"))) {
          shortLabel = "A(vđ)";
          const v = rawArr.find((x: any) => x !== undefined && x !== "" && x !== null);
          if (v !== undefined) {
            val = `${v}đ`;
            num = parseFloat(v);
          }
        } else if (code.includes("math") || name.includes("toán")) {
          shortLabel = "T";
          const v = rawArr.find((x: any) => x !== undefined && x !== "" && x !== null);
          if (v !== undefined) {
            val = String(v);
            num = parseFloat(v);
          }
        } else if (code.includes("lit") || name.includes("văn") || name.includes("tiếng việt")) {
          shortLabel = "V";
          const v = rawArr.find((x: any) => x !== undefined && x !== "" && x !== null);
          if (v !== undefined) {
            val = String(v);
            num = parseFloat(v);
          }
        } else if (code.includes("eng") || code.includes("esl") || name.includes("tiếng anh") || name.includes("anh")) {
          shortLabel = "A";
          const v = rawArr.find((x: any) => x !== undefined && x !== "" && x !== null);
          if (v !== undefined) {
            val = String(v);
            num = parseFloat(v);
          }
        } else if (code.includes("santd") || (name.includes("tiếng anh") && name.includes("nhận thức"))) {
          shortLabel = "A(NTD)";
          const v = rawArr.find((x: any) => x !== undefined && x !== "" && x !== null);
          if (v !== undefined) {
            val = `${v}đ`;
            num = parseFloat(v);
          }
        } else {
          shortLabel = (sub.code || name.slice(0, 3)).toUpperCase();
          const v = rawArr.find((x: any) => x !== undefined && x !== "" && x !== null);
          if (v !== undefined) {
            val = String(v);
            num = parseFloat(v);
          }
        }
      } catch (e) {
        if (sc.score !== undefined && sc.score !== null) {
          val = String(sc.score);
          num = parseFloat(sc.score);
        }
      }

      if (val && val !== "—") {
        let badgeClass = "bg-slate-50 text-slate-700 border-slate-200";
        if (!isNaN(num)) {
          if (num >= 7 || num >= 70) badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
          else if (num >= 5 || num >= 50) badgeClass = "bg-amber-50 text-amber-700 border-amber-200/80";
          else badgeClass = "bg-rose-50 text-rose-700 border-rose-200/80";
        } else if (val.includes("Đạt")) {
          badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
        }
        items.push({
          label: sub.name || sc.subjectName || "Môn",
          shortLabel: shortLabel || (sub.code || name.slice(0, 2)).toUpperCase(),
          val,
          num,
          badgeClass
        });
      }
    }

    if (items.length === 0) {
      return <span className="text-slate-400 text-[11px] italic">Chưa có điểm</span>;
    }

    return (
      <div className="flex items-center gap-1.5 flex-wrap max-w-[280px]">
        {items.map((it, idx) => (
          <span
            key={idx}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-all ${it.badgeClass}`}
            title={`${it.label}: ${it.val}`}
          >
            <span className="text-slate-500 font-semibold">{it.shortLabel}:</span>
            <span>{it.val}</span>
          </span>
        ))}
      </div>
    );
  };

  const handleSaveReportResult = async (advanceToNext = false) => {
    if (!selectedReportStudent) return;
    if (!reportForm.admissionResult) {
      return notify("Vui lòng chọn Kết quả xét tuyển", "err");
    }
    if (
      (reportForm.admissionResult === "Đạt cam kết" || reportForm.admissionResult === "Không đạt - Kiểm tra lại") &&
      (!reportForm.committedSubjects || reportForm.committedSubjects.length === 0)
    ) {
      return notify(
        reportForm.admissionResult === "Đạt cam kết"
          ? "Vui lòng chọn ít nhất 1 môn cam kết cho quyết định Đạt cam kết"
          : "Vui lòng chọn ít nhất 1 môn kiểm tra lại",
        "err"
      );
    }

    // Xác định học sinh kế tiếp trước khi cập nhật state (tránh lệch vị trí khi đang lọc "Chưa duyệt")
    let nextTargetStudent: any = null;
    if (advanceToNext) {
      const curList = filteredReportStudents;
      const curIdx = curList.findIndex(s => s.id === selectedReportStudent.id);
      if (curIdx >= 0) {
        nextTargetStudent =
          curList.slice(curIdx + 1).find(s => !s.admissionResult && !s.isAbsent) ||
          curList.slice(0, curIdx).find(s => !s.admissionResult && !s.isAbsent) ||
          curList[curIdx + 1] ||
          null;
      } else {
        nextTargetStudent = curList.find(s => s.id !== selectedReportStudent.id && !s.admissionResult && !s.isAbsent) || curList[0] || null;
      }
    }

    setSaveReportLoading(true);
    try {
      const userRole = (currentUser?.role || "").toUpperCase();
      const isGDCSUser = ["GDCS", "GĐ_CS", "GD_CS", "GĐCS", "BGH", "BGH_CS", "HIEU_TRUONG"].includes(userRole);
      
      let finalCampus = reportForm.admissionCampus;
      let finalSignature = reportForm.signatureName;
      
      if (isGDCSUser && currentUser) {
        finalSignature = currentUser.fullName || reportForm.signatureName || "";
        const userCampus = campuses.find(c => currentUser.campusIds.includes(c.id));
        if (userCampus) {
          finalCampus = userCampus.campusName;
        }
      }

      // Auto-fill from derived campus object & responsible GĐCS if empty
      if (!finalCampus && resolvedStudentCampusObj?.campusName) {
        finalCampus = resolvedStudentCampusObj.campusName;
      }
      if (!finalSignature && autoCampusDirectorName) {
        finalSignature = autoCampusDirectorName;
      }

      const now = new Date();
      const formattedTime = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const approverName = finalSignature || autoCampusDirectorName || reportForm.signatureName || "Giám đốc Cơ sở";
      const oldRes = selectedReportStudent.admissionResult || "Chưa duyệt";
      const newRes = reportForm.admissionResult;

      // Extract existing history & clean note
      const existingParsed = parseApprovalHistory(selectedReportStudent.directorNote);
      
      let baseUserNote = (reportForm.directorNote || "").replace(/--- LỊCH SỬ XÉT DUYỆT & HIỆU CHỈNH ---\r?\n[\s\S]*$/, "").trim();
      baseUserNote = baseUserNote.replace(/^Môn (?:kiểm tra lại|cam kết): \[(.*?)\](?:\r?\n\r?\n)?/, "").trim();

      const newHistoryItem = {
        timestamp: formattedTime,
        approver: approverName,
        oldResult: oldRes,
        newResult: newRes,
        note: baseUserNote || (oldRes !== "Chưa duyệt" ? "Hiệu chỉnh kết quả xét duyệt" : "Xét duyệt kết quả")
      };

      const updatedHistory = [newHistoryItem, ...existingParsed.history];
      const historyBlock = updatedHistory.map(h => 
        `• ${h.timestamp} | ${h.approver} | ${h.oldResult} ➔ ${h.newResult} | Lý do: ${h.note || "Không có ghi chú"}`
      ).join("\n");

      let finalNote = baseUserNote;
      if (reportForm.admissionResult === "Đạt cam kết" && (reportForm.committedSubjects || []).length > 0) {
        finalNote = `Môn cam kết: [${reportForm.committedSubjects.join(", ")}]\n\n${baseUserNote}`;
      } else if (reportForm.admissionResult === "Không đạt - Kiểm tra lại" && (reportForm.committedSubjects || []).length > 0) {
        finalNote = `Môn kiểm tra lại: [${reportForm.committedSubjects.join(", ")}]\n\n${baseUserNote}`;
      }

      finalNote = `${finalNote.trim()}\n\n--- LỊCH SỬ XÉT DUYỆT & HIỆU CHỈNH ---\n${historyBlock}`;

      const r = await fetch("/api/input-assessment-students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedReportStudent.id,
          data: {
            admissionResult: reportForm.admissionResult,
            admissionCampus: finalCampus,
            signatureName: finalSignature,
            directorNote: finalNote
          }
        })
      });
      const resData = await r.json().catch(() => ({}));
      if (r.ok) {
        if (advanceToNext) {
          if (nextTargetStudent && nextTargetStudent.id !== selectedReportStudent.id) {
            setReportStudentId(nextTargetStudent.id);
            notify(`Đã lưu "${reportForm.admissionResult}" — chuyển sang hồ sơ ${nextTargetStudent.fullName}`, "ok");
          } else {
            setReportStudentId("");
            notify("Đã lưu quyết định và hoàn tất toàn bộ hồ sơ trong danh sách hiện tại!", "ok");
          }
        } else {
          notify("Đã lưu quyết định xét duyệt thành công!", "ok");
        }
        setReportStudents(prev => prev.map(s => s.id === selectedReportStudent.id ? { 
          ...s, 
          admissionResult: reportForm.admissionResult,
          admissionCampus: finalCampus,
          signatureName: finalSignature,
          directorNote: finalNote
        } : s));

        // Tự động gửi email thông báo kết quả xét duyệt tới Ban KT&ĐBCL và GĐCS nếu bật tuỳ chọn
        if (autoSendApprovalEmail) {
          try {
            fetch("/api/admin/send-approval-result-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                periodId: reportPeriodId,
                periodName: reportSelPeriod?.name,
                batchId: selectedReportStudent.batchId || reportBatchId,
                batchName: rawReportBatches.find(b => b.id === (selectedReportStudent.batchId || reportBatchId))?.name,
                campusId: reportCampusFilter !== "all" ? reportCampusFilter : (resolvedStudentCampusObj?.id || resolveStudentCampusId(selectedReportStudent)),
                campusName: finalCampus,
                approverName,
                approverRole: isGDCSUser ? "Giám đốc Cơ sở" : "Hội đồng Tuyển sinh",
                emailConfig: emailRoutingConfig,
                students: [{
                  ...selectedReportStudent,
                  admissionResult: reportForm.admissionResult,
                  admissionCampus: finalCampus,
                  directorNote: finalNote
                }]
              })
            }).then(res => res.json()).then(mailData => {
              if (mailData.success) {
                notify("Đã gửi email thông báo kết quả đến GĐCS, Tư vấn Cơ sở, Giáo vụ Cơ sở và Ban KT&ĐBCL!", "ok");
              }
            }).catch(() => {});
          } catch(mailErr) {}
        }
      } else {
        notify(resData.error || "Lỗi khi lưu kết quả tổng hợp", "err");
      }
    } catch(e) {
      notify("Lỗi hệ thống: " + (e.message || e), "err");
    }
    setSaveReportLoading(false);
  };

  const loadBatchResultEmailPreview = async (targetBatchId: string, singleStudent?: any | null) => {
    setPreviewBatchId(targetBatchId);
    setPreviewSingleStudent(singleStudent || null);

    const activeBatchObj = rawReportBatches.find(b => b.id === targetBatchId);
    const targetStudents = singleStudent
      ? [singleStudent]
      : (targetBatchId && targetBatchId !== "all" && targetBatchId !== "none"
          ? (reportStudents || []).filter(s => s.batchId === targetBatchId)
          : []);

    if (targetStudents.length === 0) {
      setBatchResultPreviewData(null);
      return;
    }
    const batchDisplayName = activeBatchObj?.name || singleStudent?.batch?.name || "Đợt khảo sát";
    const pendingCount = targetStudents.filter(s => !s.admissionResult && !s.isAbsent).length;

    setBatchResultPreviewLoading(true);
    try {
      const curCampusObj = campuses.find(c => c.id === reportCampusFilter);
      const userRole = (currentUser?.role || "").toUpperCase();
      const isGdcs = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "BGH", "BGH_CS", "HIEU_TRUONG"].includes(userRole);

      const res = await fetch("/api/admin/send-approval-result-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodId: singleStudent?.periodId || reportPeriodId,
          periodName: reportSelPeriod?.name,
          batchId: targetBatchId || singleStudent?.batchId || undefined,
          batchName: batchDisplayName,
          campusId: singleStudent?.campusId || (reportCampusFilter !== "all" ? reportCampusFilter : undefined),
          campusName: singleStudent?.admissionCampus || curCampusObj?.campusName || (reportCampusFilter !== "all" ? reportCampusFilter : "Toàn hệ thống Sky-Line"),
          approverName: singleStudent?.signatureName || currentUser?.fullName || "Giám đốc Cơ sở",
          approverRole: isGdcs ? "Giám đốc Cơ sở" : "Hội đồng Tuyển sinh",
          emailConfig: emailRoutingConfig,
          students: targetStudents,
          previewOnly: true
        })
      });
      const data = await res.json();
      if (res.ok && data.success && data.preview) {
        setBatchResultPreviewData({
          ...data.preview,
          pendingCount
        });
      } else {
        setBatchResultPreviewData(null);
        notify(data.error || "Không thể tạo bản xem trước email", "err");
      }
    } catch (err: any) {
      setBatchResultPreviewData(null);
      notify("Lỗi khi tải xem trước email: " + (err.message || err), "err");
    } finally {
      setBatchResultPreviewLoading(false);
    }
  };

  const handlePreviewApprovalResultForStudent = async (student: any) => {
    if (!student) return;
    setEmailPreviewViewport("desktop");
    setIsBatchResultPreviewOpen(true);
    await loadBatchResultEmailPreview(student.batchId || "", student);
  };

  const handleSendBatchApprovalResultEmail = async () => {
    // Mở hộp thoại xem trước email kết quả theo đợt (nếu chưa chọn đợt ở ngoài thì tự chọn đợt đầu tiên có HS hoặc cho chọn ngay trong hộp thoại)
    setEmailPreviewViewport("desktop");
    setPreviewSingleStudent(null);
    let targetId = reportBatchId && reportBatchId !== "all" && reportBatchId !== "none" ? reportBatchId : "";
    if (!targetId) {
      const firstBatchWithStudents = reportBatches.find(b => (reportStudents || []).some(s => s.batchId === b.id));
      targetId = firstBatchWithStudents?.id || "";
    }
    setIsBatchResultPreviewOpen(true);
    if (targetId) {
      await loadBatchResultEmailPreview(targetId, null);
    } else {
      setPreviewBatchId("");
      setBatchResultPreviewData(null);
    }
  };

  const handleConfirmSendBatchResultEmail = async () => {
    const activeBatchObj = rawReportBatches.find(b => b.id === previewBatchId);
    const targetStudents = previewSingleStudent
      ? [previewSingleStudent]
      : (previewBatchId && previewBatchId !== "all" && previewBatchId !== "none"
          ? (reportStudents || []).filter(s => s.batchId === previewBatchId)
          : []);

    if (targetStudents.length === 0) {
      return notify("Vui lòng chọn một Đợt khảo sát cụ thể có học sinh để gửi thông báo kết quả!", "err");
    }
    const batchDisplayName = activeBatchObj?.name || previewSingleStudent?.batch?.name || "Đợt khảo sát";
    setSendingBatchResultEmail(true);
    try {
      const curCampusObj = campuses.find(c => c.id === reportCampusFilter);
      const userRole = (currentUser?.role || "").toUpperCase();
      const isGdcs = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "BGH", "BGH_CS", "HIEU_TRUONG"].includes(userRole);

      const res = await fetch("/api/admin/send-approval-result-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodId: previewSingleStudent?.periodId || reportPeriodId,
          periodName: reportSelPeriod?.name,
          batchId: previewBatchId || previewSingleStudent?.batchId || undefined,
          batchName: batchDisplayName,
          campusId: previewSingleStudent?.campusId || (reportCampusFilter !== "all" ? reportCampusFilter : undefined),
          campusName: previewSingleStudent?.admissionCampus || curCampusObj?.campusName || (reportCampusFilter !== "all" ? reportCampusFilter : "Toàn hệ thống Sky-Line"),
          approverName: previewSingleStudent?.signatureName || currentUser?.fullName || "Giám đốc Cơ sở",
          approverRole: isGdcs ? "Giám đốc Cơ sở" : "Hội đồng Tuyển sinh",
          emailConfig: emailRoutingConfig,
          students: targetStudents
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const scopeLabel = previewSingleStudent
          ? `học sinh "${previewSingleStudent.fullName}"`
          : `đợt "${batchDisplayName}" (${targetStudents.length} học sinh)`;
        notify(`Đã gửi email thông báo kết quả ${scopeLabel} đến GĐCS, Tư vấn Cơ sở, Giáo vụ Cơ sở & Ban KT&ĐBCL thành công!`, "ok");
        setIsBatchResultPreviewOpen(false);
        setPreviewSingleStudent(null);
      } else {
        notify(data.error || "Không thể gửi email thông báo", "err");
      }
    } catch (err: any) {
      notify("Lỗi kết nối khi gửi email: " + (err.message || err), "err");
    } finally {
      setSendingBatchResultEmail(false);
    }
  };

  const handleSendGdcsApprovalRequestForStudent = async (student: any) => {
    if (!student) return;
    setSendingApprovalId(student.id);
    try {
      const studentSelPeriod = periods.find(p => p.id === student.periodId);
      const isOpenDay = studentSelPeriod?.name?.toLowerCase().includes("open day");
      
      let csCode = null;
      if (isOpenDay && student.registeredCampus) {
        const matchingCampus = campuses.find(c => c.id === student.registeredCampus);
        if (matchingCampus) {
          csCode = matchingCampus.campusCode;
        }
      }
      
      if (!csCode) {
        let tc = campuses.find(c => 
          c.campusName && (c.campusName === student.admissionCampus)
        );
        if (!tc && student.batchId) {
          const b = reportBatches.find(bx => bx.id === student.batchId);
          if (b?.campusId) {
            tc = campuses.find(c => c.id === b.campusId);
          }
        }
        if (tc) {
          csCode = tc.campusCode;
        }
      }
      
      if (!csCode) {
        const campusName = student.admissionCampus || "";
        if (campusName.includes("CS1") || campusName.includes("Cơ sở 1")) csCode = "CS1";
        else if (campusName.includes("CS2") || campusName.includes("Cơ sở 2")) csCode = "CS2";
        else if (campusName.includes("CS3") || campusName.includes("Cơ sở 3")) csCode = "CS3";
        else if (campusName.includes("CS4") || campusName.includes("Cơ sở 4")) csCode = "CS4";
        else if (campusName.includes("CS5") || campusName.includes("Cơ sở 5")) csCode = "CS5";
      }

      const routedGdcsEmail = csCode ? emailRoutingConfig?.campusEmails?.[csCode]?.gdcs : "";
      const gdcsEmail = (routedGdcsEmail && routedGdcsEmail.split(/[,;]/)[0].trim())
        || (csCode && EMAIL_MAP.gdcs[csCode as keyof typeof EMAIL_MAP.gdcs])
        || EMAIL_MAP.gdcs.CS1;

      setGdcsReminderPreviewOpen(true);
      setGdcsReminderPreviewLoading(true);
      setGdcsReminderPreviewData(null);

      const res = await fetch("/api/input-assessment-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEND_APPROVAL_REQUEST",
          data: {
            studentId: student.id,
            gdcsEmail: gdcsEmail,
            previewOnly: true
          }
        })
      });

      const result = await res.json();
      if (res.ok && result.success && result.preview) {
        setGdcsReminderPreviewData({
          studentId: student.id,
          studentName: result.preview.studentName || student.fullName,
          gdcsEmail,
          subject: result.preview.subject,
          to: result.preview.to || gdcsEmail,
          cc: Array.isArray(result.preview.cc) ? result.preview.cc : [],
          html: result.preview.html,
          campusName: result.preview.campusName || ""
        });
      } else {
        setGdcsReminderPreviewOpen(false);
        notify(result.error || "Không thể dựng bản xem trước email nhắc GĐCS", "err");
      }
    } catch (err) {
      setGdcsReminderPreviewOpen(false);
      notify("Có lỗi xảy ra khi tải xem trước email nhắc GĐCS", "err");
    } finally {
      setGdcsReminderPreviewLoading(false);
      setSendingApprovalId("");
    }
  };

  const handleConfirmSendGdcsReminderEmail = async () => {
    if (!gdcsReminderPreviewData) return;
    setGdcsReminderSending(true);
    try {
      const { studentId, gdcsEmail } = gdcsReminderPreviewData;
      const res = await fetch("/api/input-assessment-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEND_APPROVAL_REQUEST",
          data: {
            studentId,
            gdcsEmail
          }
        })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        const sentAtIso = result.gdcsEmailSentAt || new Date().toISOString();
        setReportStudents((prev: any[]) =>
          prev.map((st: any) =>
            st.id === studentId
              ? { ...st, gdcsEmailSentAt: sentAtIso, gdcsEmailRecipient: gdcsEmail }
              : st
          )
        );
        notify(`Đã gửi email nhắc xét duyệt thành công đến GĐCS: ${gdcsEmail}!`, "ok");
        setGdcsReminderPreviewOpen(false);
      } else {
        notify(result.error || "Gửi email nhắc GĐCS thất bại", "err");
      }
    } catch (err) {
      notify("Có lỗi xảy ra khi gửi email nhắc GĐCS", "err");
    } finally {
      setGdcsReminderSending(false);
    }
  };

  const handleSendGdcsApprovalRequest = async () => {
    if (!selectedReportStudent) return;
    setSendingApproval(true);
    try {
      // Resolve GDCS email
      let csCode = resolvedStudentCampusObj?.campusCode;
      
      const isOpenDay = reportSelPeriod?.name?.toLowerCase().includes("open day");
      if (isOpenDay && selectedReportStudent.registeredCampus) {
        const matchingCampus = campuses.find(c => c.id === selectedReportStudent.registeredCampus);
        if (matchingCampus) {
          csCode = matchingCampus.campusCode;
        }
      }
      
      // If we don't have campusCode, try to match from campusName or admissionCampus
      if (!csCode) {
        const campusName = selectedReportStudent.admissionCampus || reportForm.admissionCampus || "";
        if (campusName.includes("CS1") || campusName.includes("Cơ sở 1")) csCode = "CS1";
        else if (campusName.includes("CS2") || campusName.includes("Cơ sở 2")) csCode = "CS2";
        else if (campusName.includes("CS3") || campusName.includes("Cơ sở 3")) csCode = "CS3";
        else if (campusName.includes("CS4") || campusName.includes("Cơ sở 4")) csCode = "CS4";
        else if (campusName.includes("CS5") || campusName.includes("Cơ sở 5")) csCode = "CS5";
      }

      // Default to configured GDCS email for campus, fallback to EMAIL_MAP.gdcs
      const routedGdcsEmail = csCode ? emailRoutingConfig?.campusEmails?.[csCode]?.gdcs : "";
      const gdcsEmail = (routedGdcsEmail && routedGdcsEmail.split(/[,;]/)[0].trim())
        || (csCode && EMAIL_MAP.gdcs[csCode as keyof typeof EMAIL_MAP.gdcs])
        || EMAIL_MAP.gdcs.CS1;

      const res = await fetch("/api/input-assessment-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEND_APPROVAL_REQUEST",
          data: {
            studentId: selectedReportStudent.id,
            gdcsEmail: gdcsEmail
          }
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        const sentAtIso = result.gdcsEmailSentAt || new Date().toISOString();
        setReportStudents((prev: any[]) =>
          prev.map((st: any) =>
            st.id === selectedReportStudent.id
              ? { ...st, gdcsEmailSentAt: sentAtIso, gdcsEmailRecipient: gdcsEmail }
              : st
          )
        );
        notify(`Đã gửi yêu cầu phê duyệt thành công đến email GĐCS: ${gdcsEmail}!`);
      } else {
        notify(result.error || "Gửi yêu cầu phê duyệt thất bại", "err");
      }
    } catch (err) {
      notify("Có lỗi xảy ra khi gửi yêu cầu phê duyệt", "err");
    } finally {
      setSendingApproval(false);
    }
  };

  const handleRegisterRetest = async () => {
    if (!selectedReportStudent) return;
    if (!retestPeriodId) {
      alert("Vui lòng chọn Kỳ khảo sát mới!");
      return;
    }
    if (retestPeriodId === selectedReportStudent.periodId && retestBatchId === selectedReportStudent.batchId) {
      alert("Đợt khảo sát mới phải khác với Đợt khảo sát hiện tại!");
      return;
    }

    setRetestRegisterLoading(true);
    try {
      const res = await fetch("/api/input-assessment-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RETEST_REGISTER",
          data: {
            studentId: selectedReportStudent.id,
            targetPeriodId: retestPeriodId,
            targetBatchId: retestBatchId || null
          }
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert("Đã đăng ký khảo sát lại thành công cho học sinh " + selectedReportStudent.fullName + "!");
        // Refresh history
        const r = await fetch(`/api/teacher-assessments?action=getRetestHistory&studentCode=${selectedReportStudent.studentCode}`);
        if (r.ok) {
          setRetestHistory(await r.json());
        }
        setRetestPeriodId("");
        setRetestBatchId("");
      } else {
        alert(data.error || "Đăng ký khảo sát lại thất bại!");
      }
    } catch (err) {
      alert("Lỗi kết nối: " + err.message);
    } finally {
      setRetestRegisterLoading(false);
    }
  };

  const fetchReportData = useCallback(async (pId: string) => {
    if (!pId) return;
    setReportLoading(true);
    try {
      const url = pId === "all"
        ? `/api/teacher-assessments?action=getReport&periodId=all&academicYearId=${yearId}`
        : `/api/teacher-assessments?action=getReport&periodId=${pId}`;
      const r = await fetch(url);
      if (r.ok) {
        const data = await r.json();
        setReportStudents(data);
        setReportStudentId("");
      }
    } catch(e) {}
    setReportLoading(false);
  }, [yearId]);

  useEffect(() => {
    if (tab === "reports" && reportPeriodId) {
      fetchReportData(reportPeriodId);
    }
  }, [tab, reportPeriodId, fetchReportData]);

  useEffect(() => {
    if (selectedReportStudent?.studentCode) {
      const fetchHistory = async () => {
        setRetestHistoryLoading(true);
        try {
          const r = await fetch(`/api/teacher-assessments?action=getRetestHistory&studentCode=${selectedReportStudent.studentCode}`);
          if (r.ok) {
            setRetestHistory(await r.json());
          }
        } catch (e) {
          console.error("Failed to fetch retest history", e);
        } finally {
          setRetestHistoryLoading(false);
        }
      };
      fetchHistory();
    } else {
      setRetestHistory([]);
    }
  }, [selectedReportStudent?.studentCode]);

  // Set default reportPeriodId when periods are loaded: Ưu tiên periodId từ URL (nếu mở từ link email GĐCS), sau đó chọn Kỳ "Khảo sát lẻ" hoặc kỳ đợt mới nhất
  const hasInitializedReportPeriodRef = useRef(false);
  useEffect(() => {
    if (visiblePeriods.length > 0 && !hasInitializedReportPeriodRef.current) {
      hasInitializedReportPeriodRef.current = true;
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const urlPId = params.get("periodId");
        const urlStuId = params.get("studentId");
        if (urlPId && visiblePeriods.some(p => p.id === urlPId)) {
          setReportPeriodId(urlPId);
          return;
        }
        if (urlStuId && !urlPId) {
          setReportPeriodId("all");
          return;
        }
      }
      const kslPeriod = visiblePeriods.find(p => p.name?.toLowerCase().includes("khảo sát lẻ"))
        || (latestBatchInfo?.periodId ? visiblePeriods.find(p => p.id === latestBatchInfo.periodId) : null)
        || visiblePeriods[0];
      if (kslPeriod) {
        setReportPeriodId(kslPeriod.id);
      } else {
        setReportPeriodId("all");
      }
    }
  }, [visiblePeriods, latestBatchInfo]);

  // Handle URL query parameters for printing Congratulatory or Commitment letters directly
  useEffect(() => {
    if (typeof window !== "undefined" && Array.isArray(reportStudents) && reportStudents.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const urlStudentId = params.get("studentId");
      const urlPrint = params.get("print");
      if (urlStudentId) {
        const found = reportStudents.find(s => s.id === urlStudentId || s.studentCode === urlStudentId);
        if (found) {
          setTab("reports");
          setReportsSubTab("results");
          setReportStudentId(found.id);
          if (urlPrint) {
            setIsInvitation(false);
            setIsCommitment(urlPrint === "cam_ket");
            setIsPrintModalOpen(true);
            
            // Clean URL query parameters to avoid infinite popup on reload
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
          }
        }
      }
    }
  }, [reportStudents, tab]);



  // Tính toán trạng thái đủ/thiếu môn khảo sát theo Quy chế tuyển sinh cho từng HS
  const completenessMap = useMemo(() => {
    const map = new Map<string, StudentCompletenessResult>();
    if (!Array.isArray(reportStudents)) return map;
    for (const st of reportStudents) {
      map.set(st.id, checkStudentAssessmentCompleteness(st));
    }
    return map;
  }, [reportStudents]);

  const filteredReportStudents = useMemo(() => {
    if (!Array.isArray(reportStudents)) return [];
    
    // Check if period is Open Day
    const isOpenDay = reportSelPeriod?.name?.toLowerCase().includes("open day");
    const userRole = (currentUser?.role || "").toUpperCase();
    const isGDCS = ["GDCS", "GĐ_CS", "GIAO_VU_CS", "GĐCS"].includes(userRole);
    
    const query = (reportStudentSearchQuery || "").trim().toLowerCase();

    return reportStudents.filter(s => {
      // 1. Matches Period (Kỳ khảo sát độc lập)
      if (reportPeriodId && reportPeriodId !== "all") {
        if (s.periodId !== reportPeriodId && s.period?.id !== reportPeriodId) {
          return false;
        }
      }

      // 2. Matches Batch (Đợt khảo sát độc lập)
      if (reportBatchId && reportBatchId !== "all") {
        if (reportBatchId === "none") {
          if (s.batchId) return false;
        } else if (s.batchId !== reportBatchId) {
          return false;
        }
      } else if (reportMonthFilter && reportMonthFilter !== "all") {
        // Khi không chọn đợt cụ thể, lọc theo Tháng khảo sát (mặc định Tháng hiện tại)
        const bObj = s.batch || (reportBatches || []).find((b: any) => b.id === s.batchId);
        const stMonth = getBatchMonthYearKey(bObj) || getStudentMonthYearKey(s);
        if (stMonth !== reportMonthFilter) return false;
      }

      // 3. OpenDay GDCS campus check
      if (isOpenDay && isGDCS) {
        const allowedIds = currentUser?.campusIds || [];
        if (!(s.registeredCampus && allowedIds.includes(s.registeredCampus))) return false;
      }

      // 4. Matches Campus (Cơ sở độc lập)
      if (reportCampusFilter && reportCampusFilter !== "all") {
        const resolvedCampusId = resolveStudentCampusId(s);
        const matchesCampus = resolvedCampusId === reportCampusFilter || 
                              s.admissionCampus === reportCampusFilter || 
                              s.registeredCampus === reportCampusFilter;
        if (!matchesCampus) return false;
      }

      // 4.5. Matches Grade (Khối lớp độc lập)
      if (reportGradeFilter && reportGradeFilter !== "all") {
        const cleanStudentGrade = String(s.grade || "").replace(/\D/g, "");
        if (cleanStudentGrade !== String(reportGradeFilter)) return false;
      }

      // 5. Matches Approval Status (Trạng thái duyệt độc lập)
      if (reportApprovalStatusFilter && reportApprovalStatusFilter !== "all") {
        if (reportApprovalStatusFilter === "Vắng khảo sát") {
          if (!s.isAbsent) return false;
        } else if (reportApprovalStatusFilter === "Chưa duyệt") {
          if (s.admissionResult || s.isAbsent) return false;
        } else if (reportApprovalStatusFilter === "Đủ điểm chờ duyệt") {
          if (s.admissionResult || s.isAbsent) return false;
          const comp = completenessMap.get(s.id);
          if (comp?.status !== "READY") return false;
        } else if (reportApprovalStatusFilter === "Thiếu điểm") {
          if (s.admissionResult || s.isAbsent) return false;
          const comp = completenessMap.get(s.id);
          if (!comp || comp.status === "READY") return false;
        } else if (reportApprovalStatusFilter === "Đạt - Giao lưu") {
          if (s.isAbsent) return false;
          const res = String(s.admissionResult || "").toLowerCase();
          if (!res.includes("giao lưu")) return false;
        } else if (reportApprovalStatusFilter === "Đạt cam kết") {
          if (s.isAbsent) return false;
          const res = String(s.admissionResult || "").toLowerCase();
          if (!res.includes("cam kết")) return false;
        } else if (reportApprovalStatusFilter === "Đạt") {
          if (s.isAbsent) return false;
          const res = String(s.admissionResult || "").toLowerCase();
          if (!res.includes("đạt") || res.includes("không đạt")) return false;
        } else if (reportApprovalStatusFilter === "Không đạt") {
          if (s.isAbsent) return false;
          const res = String(s.admissionResult || "").toLowerCase();
          if (!res.includes("không đạt")) return false;
        } else {
          if (s.isAbsent) return false;
          const res = String(s.admissionResult || "").toLowerCase();
          const filterStr = String(reportApprovalStatusFilter).toLowerCase();
          if (!res.includes(filterStr)) return false;
        }
      }

      // 6. Search Student Name, Code, or Old School (Tìm kiếm Học sinh độc lập)
      if (query) {
        const name = String(s.fullName || "").toLowerCase();
        const code = String(s.studentCode || "").toLowerCase();
        const oldSchool = String(s.oldSchoolName || "").toLowerCase();
        if (!name.includes(query) && !code.includes(query) && !oldSchool.includes(query)) return false;
      }

      return true;
    });
  }, [
    reportStudents, 
    reportPeriodId, 
    reportBatchId, 
    reportSelPeriod, 
    currentUser, 
    reportCampusFilter, 
    reportGradeFilter,
    resolveStudentCampusId,
    reportApprovalStatusFilter,
    reportStudentSearchQuery,
    completenessMap,
    reportMonthFilter,
    reportBatches,
    getBatchMonthYearKey,
    getStudentMonthYearKey
  ]);

  // Danh sách các Tháng khảo sát có trong kỳ hiện tại (tự động trích từ Ngày KS)
  const availableReportMonths = useMemo(() => {
    const set = new Set<string>([currentMonthYearKey]);
    (rawReportBatches || []).forEach((b: any) => {
      const mk = getBatchMonthYearKey(b);
      if (mk) set.add(mk);
    });
    (reportStudents || []).forEach((s: any) => {
      const mk = getStudentMonthYearKey(s, reportBatchLookup);
      if (mk) set.add(mk);
    });
    return Array.from(set).sort((a, b) => {
      const [ma, ya] = a.split("/").map(Number);
      const [mb, yb] = b.split("/").map(Number);
      return yb * 12 + mb - (ya * 12 + ma);
    });
  }, [rawReportBatches, reportStudents, currentMonthYearKey, getBatchMonthYearKey, getStudentMonthYearKey, reportBatchLookup]);

  // Thống kê đủ / thiếu nội dung khảo sát cho các HS chờ duyệt trong phạm vi hiện tại
  const completenessSummaryStats = useMemo(() => {
    let readyPending = 0;
    let missingPending = 0;
    for (const s of reportStudents || []) {
      if (s.isAbsent || s.admissionResult) continue;
      if (reportPeriodId && reportPeriodId !== "all" && s.periodId && s.periodId !== reportPeriodId) continue;
      if (reportMonthFilter && reportMonthFilter !== "all") {
        const stMonth = getStudentMonthYearKey(s, reportBatchLookup);
        if (stMonth !== reportMonthFilter) continue;
      }
      if (reportBatchId && reportBatchId !== "all") {
        if (reportBatchId === "none") {
          if (s.batchId) continue;
        } else if (s.batchId !== reportBatchId) {
          continue;
        }
      }
      if (reportCampusFilter && reportCampusFilter !== "all") {
        const stuCampusId = resolveStudentCampusId(s);
        if (stuCampusId && stuCampusId !== reportCampusFilter) continue;
      }
      if (reportGradeFilter && reportGradeFilter !== "all") {
        const g = String(s.grade || "").replace(/\D/g, "");
        if (g !== String(reportGradeFilter)) continue;
      }
      const comp = completenessMap.get(s.id);
      if (comp?.status === "READY") readyPending++;
      else missingPending++;
    }
    return { readyPending, missingPending };
  }, [
    reportStudents,
    reportPeriodId,
    reportMonthFilter,
    reportBatchId,
    reportCampusFilter,
    reportGradeFilter,
    resolveStudentCampusId,
    completenessMap,
    getStudentMonthYearKey,
    reportBatchLookup
  ]);

  // Danh sách Khối có trong phạm vi hiện tại (phục vụ bộ lọc Khối có đếm số lượng)
  const reportAvailableGradeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (reportStudents || []).forEach(s => {
      if (reportPeriodId && reportPeriodId !== "all" && s.periodId !== reportPeriodId && s.period?.id !== reportPeriodId) return;
      if (reportBatchId && reportBatchId !== "all") {
        if (reportBatchId === "none" ? !!s.batchId : s.batchId !== reportBatchId) return;
      }
      if (reportCampusFilter && reportCampusFilter !== "all") {
        const resolvedCampusId = resolveStudentCampusId(s);
        const matchesCampus = resolvedCampusId === reportCampusFilter || s.admissionCampus === reportCampusFilter || s.registeredCampus === reportCampusFilter;
        if (!matchesCampus) return;
      }
      const g = String(s.grade || "").replace(/\D/g, "");
      if (g) counts[g] = (counts[g] || 0) + 1;
    });
    return counts;
  }, [reportStudents, reportPeriodId, reportBatchId, reportCampusFilter, resolveStudentCampusId]);

  // Helper tóm tắt nhanh điểm các môn khảo sát của 1 học sinh ngay trên dòng bảng xét duyệt
  const getStudentSurveyPills = useCallback((student: any) => {
    const pills: { key: string; label: string; value: string; tone: "emerald" | "teal" | "amber" | "rose" | "slate"; nonScoring?: boolean }[] = [];
    const rawScores = Array.isArray(student?.scores) ? student.scores : [];
    const gradeNum = parseInt(String(student?.grade || "0").replace(/\D/g, ""), 10) || 1;

    rawScores.forEach((sc: any, idx: number) => {
      const sub = sc?.subject || {};
      const sName = String(sub.name || "Môn KS").trim();
      const sNameLower = sName.toLowerCase().normalize("NFC");
      const sCode = String(sub.code || "").toLowerCase();

      if (sCode.includes("pdh") || sCode.includes("orientation") || sNameLower.includes("định hướng")) {
        if (!student?.pvdhRecord?.id) {
          pills.push({ key: sc.id || `ori-${idx}`, label: "Định hướng", value: "Đã cập nhật", tone: "teal" });
        }
        return;
      }

      const isTci = sCode.includes("tci") || sCode.includes("cpt") || sNameLower.includes("chuẩn phát triển");
      let vArr: any[] = [];
      try {
        if (sc.scores) {
          const p = JSON.parse(sc.scores);
          vArr = Array.isArray(p) ? p : [p];
        }
      } catch {
        vArr = sc.scores ? [sc.scores] : [];
      }

      if (isTci) {
        let tciMeta: any = null;
        if (sc.comments) {
          try {
            const pc = JSON.parse(sc.comments);
            const cArr = Array.isArray(pc) ? pc : [pc];
            for (const item of cArr) {
              if (typeof item === "string" && item.includes('"_tciMeta"')) {
                const m = JSON.parse(item);
                if (m?._tciMeta) tciMeta = m._tciMeta;
              }
            }
          } catch {}
        }
        const passed = tciMeta?.countDat ?? vArr.filter(x => ["3", "Đạt", "DAT"].includes(String(x ?? "").trim())).length;
        const total = vArr.length > 0 ? vArr.length : 16;
        pills.push({
          key: sc.id || `tci-${idx}`,
          label: "TCI",
          value: `${passed}/${total} Đạt`,
          tone: passed >= total * 0.7 ? "emerald" : "amber"
        });
        return;
      }

      if (sCode.includes("tly") || sNameLower.includes("tâm lý")) {
        const scNum = parseFloat(vArr[6] || vArr[20] || vArr[0] || "0");
        const lvl = scNum <= 15 ? "Ổn định" : scNum <= 31 ? "Nhẹ" : scNum <= 47 ? "Vừa" : "Nguy cơ cao";
        pills.push({
          key: sc.id || `tly-${idx}`,
          label: "Tâm lý",
          value: lvl,
          tone: scNum <= 15 ? "emerald" : scNum <= 47 ? "amber" : "rose"
        });
        return;
      }

      if (sCode.includes("nltd") || sNameLower.includes("năng lực tư duy")) {
        const pctVal = vArr.length >= 5 ? vArr[4] : vArr[0];
        if (pctVal !== undefined && pctVal !== null && String(pctVal).trim() !== "") {
          const pct = parseFloat(String(pctVal));
          pills.push({
            key: sc.id || `nltd-${idx}`,
            label: "Tư duy",
            value: `${pctVal}%`,
            tone: !isNaN(pct) && pct >= 75 ? "emerald" : !isNaN(pct) && pct >= 50 ? "teal" : "amber"
          });
        }
        return;
      }

      const firstVal = vArr.find(x => x !== undefined && x !== null && String(x).trim() !== "");
      if (firstVal === undefined) return;

      let shortLabel = sName
        .replace(/^Tiếng Anh\s*\((.*?)\)$/i, "TA $1")
        .replace(/^Tiếng Anh\s*-\s*/i, "TA ")
        .replace(/^Tiếng Anh$/i, "Tiếng Anh")
        .replace(/^Tiếng Việt$/i, "Tiếng Việt")
        .replace(/^Ngữ văn$/i, "Ngữ văn");
      if (shortLabel.length > 16) shortLabel = shortLabel.slice(0, 15) + "…";

      let valDisplay = String(firstVal);
      let isOralEnglishNonScoring = false;
      if (sNameLower.includes("tiếng anh") || sCode.includes("eng") || sCode.includes("esl")) {
        const oralMax = gradeNum === 2 ? 10 : gradeNum >= 7 ? 20 : 30;
        const writMax = gradeNum >= 7 ? 80 : 70;
        if (sNameLower.includes("vấn đáp") || sNameLower.includes("nói") || sCode.includes("vd") || sCode.includes("speaking")) {
          shortLabel = "TA nói";
          const num = parseFloat(valDisplay);
          const denom = !isNaN(num) && num <= 10 && gradeNum <= 5 ? 10 : !isNaN(num) && num > oralMax ? 100 : oralMax;
          valDisplay = `${valDisplay}/${denom}`;
          if (!sCode.includes("esl") && !sNameLower.includes("esl")) {
            isOralEnglishNonScoring = true;
          }
        } else if (sNameLower.includes("viết") || sCode.includes("vt") || sCode.includes("writing")) {
          shortLabel = "TA viết";
          const num = parseFloat(valDisplay);
          const denom = !isNaN(num) && num > writMax ? 100 : writMax;
          valDisplay = `${valDisplay}/${denom}`;
        }
      }

      pills.push({
        key: sc.id || `sub-${idx}`,
        label: shortLabel,
        value: valDisplay,
        tone: isOralEnglishNonScoring ? "amber" : "teal",
        nonScoring: isOralEnglishNonScoring
      });
    });

    if (student?.pvdhRecord?.id) {
      const pRec = student.pvdhRecord;
      const bmCode = pRec.templateCode || getDefaultPvdhCodeForGrade(student?.grade) || "BM.KTĐBCL.31";
      const bmSum = parseTeacherSummary(pRec.teacherSummaryJson);
      let statusText = "Bản nháp";
      let pillTone: "teal" | "emerald" | "amber" | "rose" = "teal";
      if (pRec.isLocked || pRec.workflowStatus === "VERIFIED_LOCKED") {
        statusText = "Đã xác nhận";
        pillTone = "emerald";
      } else if (bmSum.sheetStatus === "CAN_TRAO_DOI_CHUYEN_MON") {
        statusText = "Cần trao đổi CM";
        pillTone = "rose";
      } else if (bmSum.sheetStatus === "CAN_BO_SUNG_THONG_TIN" || pRec.workflowStatus === "RETURNED") {
        statusText = "Cần bổ sung TT";
        pillTone = "amber";
      } else if (bmSum.sheetStatus === "HOAN_THANH" || pRec.workflowStatus === "COMPLETED" || pRec.workflowStatus === "SUBMITTED") {
        statusText = "Hoàn thành";
        pillTone = "emerald";
      }
      pills.push({
        key: `pvdh-${pRec.id}`,
        label: bmCode,
        value: statusText,
        tone: pillTone,
      });
    }

    return pills;
  }, []);

  // Điều hướng nhanh Trước / Tiếp giữa các hồ sơ trong Dossier Modal
  const dossierNav = useMemo(() => {
    if (!selectedReportStudent) return { index: -1, total: 0, prevId: "", nextId: "", nextPendingId: "" };
    const list = filteredReportStudents.some(s => s.id === selectedReportStudent.id)
      ? filteredReportStudents
      : [selectedReportStudent, ...filteredReportStudents];
    const idx = list.findIndex(s => s.id === selectedReportStudent.id);
    const prevId = idx > 0 ? list[idx - 1].id : "";
    const nextId = idx >= 0 && idx < list.length - 1 ? list[idx + 1].id : "";
    const nextPending =
      list.slice(idx + 1).find(s => !s.admissionResult && !s.isAbsent) ||
      list.slice(0, Math.max(0, idx)).find(s => !s.admissionResult && !s.isAbsent);
    return {
      index: idx + 1,
      total: list.length,
      prevId,
      nextId,
      nextPendingId: nextPending && nextPending.id !== selectedReportStudent.id ? nextPending.id : ""
    };
  }, [selectedReportStudent, filteredReportStudents]);

  // Tổng hợp các Đợt khảo sát mới nhất & đang cần xét duyệt trong phạm vi hiện tại
  const recentBatchesOverview = useMemo(() => {
    const batchLookup = new Map<string, any>();
    (reportBatches || []).forEach((b: any) => batchLookup.set(b.id, b));

    const groups = new Map<
      string,
      {
        id: string;
        name: string;
        batchNumber: number;
        sortTime: number;
        dateLabel: string;
        monthKey: string;
        total: number;
        pending: number;
        readyPending: number;
        approved: number;
      }
    >();

    // Khởi tạo từ danh sách đợt đang có trong kỳ/cơ sở
    (reportBatches || []).forEach((b: any) => {
      const dateRaw = b.endDate || b.startDate;
      const ts = dateRaw ? new Date(dateRaw).getTime() : 0;
      const dateLabel = dateRaw ? new Date(dateRaw).toLocaleDateString("vi-VN") : "";
      groups.set(b.id, {
        id: b.id,
        name: b.name || `Đợt #${b.batchNumber || ""}`,
        batchNumber: Number(b.batchNumber) || 0,
        sortTime: isNaN(ts) ? 0 : ts,
        dateLabel,
        monthKey: getBatchMonthYearKey(b),
        total: 0,
        pending: 0,
        readyPending: 0,
        approved: 0,
      });
    });

    (reportStudents || []).forEach((s: any) => {
      if (reportPeriodId && reportPeriodId !== "all" && s.periodId && s.periodId !== reportPeriodId) return;
      if (reportCampusFilter && reportCampusFilter !== "all") {
        const stuCampusId = resolveStudentCampusId(s);
        if (stuCampusId && stuCampusId !== reportCampusFilter) return;
      }
      const bId = s.batchId || "none";
      if (!groups.has(bId)) {
        const bObj = s.batch || batchLookup.get(bId);
        const dateRaw = bObj?.endDate || bObj?.startDate || s.createdAt;
        const ts = dateRaw ? new Date(dateRaw).getTime() : 0;
        groups.set(bId, {
          id: bId,
          name: bId === "none" ? "Khảo sát lẻ (chưa gắn đợt)" : (bObj?.name || "Đợt khảo sát"),
          batchNumber: Number(bObj?.batchNumber) || 0,
          sortTime: isNaN(ts) ? 0 : ts,
          dateLabel: dateRaw ? new Date(dateRaw).toLocaleDateString("vi-VN") : "",
          monthKey: getBatchMonthYearKey(bObj) || getStudentMonthYearKey(s, batchLookup),
          total: 0,
          pending: 0,
          readyPending: 0,
          approved: 0,
        });
      }
      const g = groups.get(bId)!;
      g.total++;
      if (s.isAbsent) return;
      if (s.admissionResult) {
        g.approved++;
      } else {
        g.pending++;
        const comp = completenessMap.get(s.id);
        if (comp?.status === "READY") g.readyPending++;
      }
    });

    const list = Array.from(groups.values()).filter((g) => {
      if (g.total <= 0) return false;
      if (reportMonthFilter && reportMonthFilter !== "all") {
        return g.monthKey === reportMonthFilter;
      }
      return true;
    });
    // Xác định đợt mới nhất theo thời gian & số đợt
    let newestId = "";
    let newestScore = -1;
    list.forEach((g) => {
      if (g.id === "none") return;
      const sc = g.sortTime * 1000 + g.batchNumber;
      if (sc > newestScore) {
        newestScore = sc;
        newestId = g.id;
      }
    });

    // Sắp xếp: Đợt có HS chờ duyệt lên trước -> trong mỗi nhóm xếp đợt mới nhất lên đầu
    list.sort((a, b) => {
      const aHasPending = a.pending > 0 ? 1 : 0;
      const bHasPending = b.pending > 0 ? 1 : 0;
      if (aHasPending !== bHasPending) return bHasPending - aHasPending;
      if (a.readyPending !== b.readyPending) return b.readyPending - a.readyPending;
      if (b.sortTime !== a.sortTime) return b.sortTime - a.sortTime;
      return b.batchNumber - a.batchNumber;
    });

    return list.map((g) => ({ ...g, isLatest: g.id === newestId }));
  }, [reportBatches, reportStudents, reportPeriodId, reportCampusFilter, resolveStudentCampusId, completenessMap, reportMonthFilter, getBatchMonthYearKey, getStudentMonthYearKey]);

  const sortedReportStudents = useMemo(() => {
    const batchTimeMap = new Map<string, number>();
    (reportBatches || []).forEach((b: any) => {
      const ts = b.startDate ? new Date(b.startDate).getTime() : 0;
      batchTimeMap.set(b.id, (isNaN(ts) ? 0 : ts) + (Number(b.batchNumber) || 0));
    });
    const getBatchRecency = (s: any) => {
      if (s.batchId && batchTimeMap.has(s.batchId)) return batchTimeMap.get(s.batchId)!;
      if (s.batch?.startDate) {
        const ts = new Date(s.batch.startDate).getTime();
        if (!isNaN(ts)) return ts + (Number(s.batch?.batchNumber) || 0);
      }
      return s.createdAt ? new Date(s.createdAt).getTime() : 0;
    };

    const arr = [...filteredReportStudents];
    if (reportSortMode === "name_asc") {
      arr.sort((a, b) => String(a.fullName || "").localeCompare(String(b.fullName || ""), "vi"));
      return arr;
    }
    if (reportSortMode === "latest_batch") {
      arr.sort((a, b) => {
        const diff = getBatchRecency(b) - getBatchRecency(a);
        if (diff !== 0) return diff;
        return String(a.fullName || "").localeCompare(String(b.fullName || ""), "vi");
      });
      return arr;
    }
    // Default: "priority_latest" — Chờ duyệt (Đủ điểm trước) -> Đợt mới nhất -> Đã duyệt mới nhất
    arr.sort((a, b) => {
      const getPriorityRank = (s: any) => {
        if (s.isAbsent) return 4;
        if (!s.admissionResult) {
          const comp = completenessMap.get(s.id);
          return comp?.status === "READY" ? 0 : 1;
        }
        return 2;
      };
      const rankDiff = getPriorityRank(a) - getPriorityRank(b);
      if (rankDiff !== 0) return rankDiff;
      const recencyDiff = getBatchRecency(b) - getBatchRecency(a);
      if (recencyDiff !== 0) return recencyDiff;
      return String(a.fullName || "").localeCompare(String(b.fullName || ""), "vi");
    });
    return arr;
  }, [filteredReportStudents, reportBatches, reportSortMode, completenessMap]);

  const reportTotalPages = Math.ceil(sortedReportStudents.length / reportPageSize);
  const paginatedReportStudents = useMemo(() => {
    const startIndex = (reportCurrentPage - 1) * reportPageSize;
    return sortedReportStudents.slice(startIndex, startIndex + reportPageSize);
  }, [sortedReportStudents, reportCurrentPage, reportPageSize]);

  const renderReportPaginationControl = () => {
    if (filteredReportStudents.length === 0) return null;
    const startIdx = Math.min(filteredReportStudents.length, (reportCurrentPage - 1) * reportPageSize + 1);
    const endIdx = Math.min(filteredReportStudents.length, reportCurrentPage * reportPageSize);
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-slate-200/80 bg-slate-50/70 text-xs font-medium text-slate-600">
        <div className="flex items-center gap-3 flex-wrap tabular-nums">
          <span>
            Hiển thị <span className="text-slate-900 font-semibold">{startIdx}–{endIdx}</span> / <span className="text-[#00736E] font-bold">{filteredReportStudents.length}</span> hồ sơ
          </span>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Số dòng:</span>
            <select
              value={reportPageSize}
              onChange={e => setReportPageSize(Number(e.target.value))}
              aria-label="Số hồ sơ mỗi trang"
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-[#008B85] cursor-pointer"
            >
              <option value={15}>15 / trang</option>
              <option value={30}>30 / trang</option>
              <option value={50}>50 / trang</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            disabled={reportCurrentPage === 1}
            onClick={() => setReportCurrentPage(prev => Math.max(prev - 1, 1))}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-[#008B85] hover:text-[#003B3A] text-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer font-semibold shadow-2xs"
          >
            Trang trước
          </button>
          <div className="flex items-center gap-1 tabular-nums">
            {Array.from({ length: reportTotalPages }).map((_, i) => {
              const pageNum = i + 1;
              if (reportTotalPages > 6 && pageNum !== 1 && pageNum !== reportTotalPages && Math.abs(pageNum - reportCurrentPage) > 1) {
                if (pageNum === 2 || pageNum === reportTotalPages - 1) {
                  return <span key={pageNum} className="px-1.5 text-slate-400 font-semibold select-none">…</span>;
                }
                return null;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setReportCurrentPage(pageNum)}
                  className={"h-8 min-w-8 px-2 rounded-lg flex items-center justify-center transition-colors cursor-pointer font-semibold " + (
                    reportCurrentPage === pageNum
                      ? "bg-[#003B3A] text-white shadow-2xs"
                      : "text-slate-700 hover:bg-slate-200/70"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            disabled={reportCurrentPage === reportTotalPages || reportTotalPages === 0}
            onClick={() => setReportCurrentPage(prev => Math.min(prev + 1, reportTotalPages))}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-[#008B85] hover:text-[#003B3A] text-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer font-semibold shadow-2xs"
          >
            Trang sau
          </button>
        </div>
      </div>
    );
  };

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
      // Split the student's targetType into an array of lowercase trimmed values to support multiple selections
      const studentTargets = selectedReportStudent.targetType.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
      
      const targetMatch = gradeMatchedGroups.find(g => {
        const mappedTs = docGroupTargets[g.id] || [];
        return mappedTs.some(ts => studentTargets.includes(ts.toLowerCase()));
      });
      
      if (targetMatch) {
        studentGroup = targetMatch.id;
      } else {
        const anyTargetMatch = docGroups.find(g => {
          const mappedTs = docGroupTargets[g.id] || [];
          return mappedTs.some(ts => studentTargets.includes(ts.toLowerCase()));
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
    
    let documents = [];
    const saved = localStorage.getItem('admission_docs_' + studentGroup);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          documents = parsed;
        }
      } catch (e) {}
    }
    
    if (documents.length === 0) {
      if (studentGroup === "khoi_2_5") documents = defaultDocumentsGrade2_5;
      else if (studentGroup === "khoi_6") documents = defaultDocumentsGrade6;
      else if (studentGroup === "khoi_10_noi_tinh") documents = defaultDocumentsGrade10NoiTinh;
      else if (studentGroup === "khoi_10_ngoai_tinh") documents = defaultDocumentsGrade10NgoaiTinh;
      else documents = defaultDocumentsGrade1;
    }

    if (selectedReportStudent.targetType) {
      const studentTargets = selectedReportStudent.targetType.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
      return documents.filter((doc) => {
        if (!doc.targets || !Array.isArray(doc.targets) || doc.targets.length === 0) return true;
        return doc.targets.some((t) => studentTargets.includes(t.toLowerCase()));
      });
    }

    return documents;}, [selectedReportStudent, defaultDocumentsGrade1, defaultDocumentsGrade2_5, defaultDocumentsGrade6, defaultDocumentsGrade10NoiTinh, defaultDocumentsGrade10NgoaiTinh, docGroups, docGroupTargets, docGroupGrades]);

  const studentCampusConfig = useMemo(() => {
    if (typeof window === "undefined" || !selectedReportStudent) return null;

    // CRITICAL PREVIEW MODE: Bypass local storage entirely if loading mock student to ensure no database updates
    if (selectedReportStudent.id === "MOCK_PREVIEW_STUDENT") {
      return {
        title: rcTitle || (rcReportType === "thu_chuc_mung" ? "BÁO CÁO KẾT QUẢ KHẢO SÁT NĂNG LỰC ĐẦU VÀO" : rcReportType === "thu_moi" ? "THƯ MỜI" : "BẢN CAM KẾT HỌC TẬP"),
        logo: rcLogo,
        background: rcBackground,
        content: rcContent,
        footer: rcFooter,
        signature: rcSignature,
        directorName: rcDirectorName || (campuses.find(c => c.id === rcCampusId)?.manager?.fullName || "")
      };
    }
    
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

    // Fallback: Find campus by UI active selected reportBatchId
    if (!targetCampus && typeof reportBatchId !== "undefined" && reportBatchId !== "all") {
      const batchObj = reportBatches.find(b => b.id === reportBatchId);
      if (batchObj?.campusId) {
        targetCampus = campuses.find(c => c.id === batchObj.campusId);
      }
    }

    // Fallback: Find campus by UI active selected reportSelPeriod first batch
    if (!targetCampus && typeof reportSelPeriod !== "undefined" && reportSelPeriod?.batches) {
      const firstBatch = reportSelPeriod.batches[0];
      if (firstBatch?.campusId) {
        targetCampus = campuses.find(c => c.id === firstBatch.campusId);
      }
    }
    
    if (!targetCampus && campuses.length > 0) {
      targetCampus = campuses[0];
    }
    
    if (targetCampus) {
      const baseKey = isInvitation ? 'thu_moi' : isCommitment ? 'cam_ket_hoc_tap' : 'thu_chuc_mung';
      const studentGroup = getStudentGroup(selectedReportStudent);
      const candidateKeys = [baseKey + '_' + studentGroup, baseKey];
      let typeKey = baseKey;
      
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
      
      // Fetch Master Branding overrides
      const mLogo = localStorage.getItem('report_config_master_logo');
      const mBg = localStorage.getItem('report_config_master_background');
      const mFooter = localStorage.getItem('report_config_master_footer');

      const mergedLogo = mLogo ? mLogo : (globalData.logo || campusData.logo || "/logo.png");
      const mergedBackground = mBg ? mBg : (globalData.background || campusData.background || "/images/skyline-doc-watermark.png");
      const mergedContent = globalData.content || campusData.content || "";
      const mergedFooter = mFooter ? mFooter : (globalData.footer || campusData.footer || "/images/skyline-doc-footer.png");
      const gdcsSig = resolveGdcsSignatureForCampus(targetCampus, selectedReportStudent?.signatureName);
      const rawSig = gdcsSig || localStorage.getItem('report_config_signature_' + targetCampus.id) || campusData.signature || "";
      const isApproved = isStudentApprovedByGdcs(selectedReportStudent, reportForm?.admissionResult);

      return {
        title: mergedTitle,
        logo: mergedLogo,
        background: mergedBackground,
        content: mergedContent,
        footer: mergedFooter,
        signature: isApproved ? rawSig : "",
        isApproved,
        directorName: resolveGdcsNameForCampus(targetCampus) || campusData.directorName || targetCampus.manager?.fullName || ""
      };
    }
    return null;
  }, [selectedReportStudent, campuses, reportBatches, isCommitment, isInvitation, reportForm.admissionCampus, reportForm.admissionResult, rcTitle, rcLogo, rcBackground, rcContent, rcFooter, rcSignature, rcDirectorName, rcReportType, rcCampusId, docGroups, docGroupGrades, docGroupTargets, resolveGdcsSignatureForCampus, resolveGdcsNameForCampus, isStudentApprovedByGdcs]);

  const campusNameSuffix = useMemo(() => {
    if (!selectedReportStudent) return "GLOBAL";
    
    if (selectedReportStudent.id === "MOCK_PREVIEW_STUDENT") {
      const clean = (selectedReportStudent.admissionCampus || "").toUpperCase();
      if (clean.includes("HILL")) return "HILL";
      if (clean.includes("RIVERSIDE")) return "RIVERSIDE";
      if (clean.includes("CENTRAL")) return "CENTRAL";
      if (clean.includes("BEACH")) return "BEACH";
      return "GLOBAL";
    }
    
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
      surveyed: number;
    }>();
    
    campuses.forEach(c => {
      map.set(c.id, {
        campusName: c.campusName,
        total: 0,
        passed: 0,
        failed: 0,
        committed: 0,
        pending: 0,
        surveyed: 0
      });
    });
    
    const fallbackId = "unassigned";
    map.set(fallbackId, {
      campusName: "Khác / Chưa phân",
      total: 0,
      passed: 0,
      failed: 0,
      committed: 0,
      pending: 0,
      surveyed: 0
    });

    const targetStudents = filteredReportStudents;
    
    targetStudents.forEach(s => {
      const campusId = resolveStudentCampusId(s);
      
      let stat = map.get(campusId);
      if (!stat) {
        stat = {
          campusName: campuses.find(c => c.id === campusId)?.campusName || "Khác / Chưa phân",
          total: 0,
          passed: 0,
          failed: 0,
          committed: 0,
          pending: 0,
          surveyed: 0
        };
        map.set(campusId, stat);
      }
      
      stat.total++;
      const isTested = s.mathScore !== null || s.literatureScore !== null || s.writtenEnglishScore !== null || s.oralEnglishScore !== null || s.psychologyScore !== null || (s.scores && s.scores.length > 0);
      if (isTested) stat.surveyed++;
      
      if (s.admissionResult === "Đạt" || s.admissionResult === "Học thử") {
        stat.passed++;
      } else if (s.admissionResult === "Không đạt" || s.admissionResult === "Không đạt - Kiểm tra lại" || s.admissionResult === "Không đạt - Không kiểm tra lại") {
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
  }, [filteredReportStudents, resolveStudentCampusId, campuses]);


          const batchStats = useMemo(() => {
    const map = new Map<string, {
      batchName: string;
      total: number;
      passed: number;
      failed: number;
      committed: number;
      pending: number;
      surveyed: number;
    }>();
    
    periods.forEach(p => {
      map.set(p.id, {
        batchName: p.name,
        total: 0,
        passed: 0,
        failed: 0,
        committed: 0,
        pending: 0,
        surveyed: 0
      });
    });
    
    const fallbackId = "unassigned";
    map.set(fallbackId, {
      batchName: "Khác / Chưa phân kỳ",
      total: 0,
      passed: 0,
      failed: 0,
      committed: 0,
      pending: 0,
      surveyed: 0
    });

    const targetStudents = filteredReportStudents;
    
    targetStudents.forEach(s => {
      const periodId = s.periodId || fallbackId;
      let stat = map.get(periodId);
      if (!stat) {
        stat = {
          batchName: periods.find(p => p.id === periodId)?.name || "Khác / Chưa phân kỳ",
          total: 0,
          passed: 0,
          failed: 0,
          committed: 0,
          pending: 0,
          surveyed: 0
        };
        map.set(periodId, stat);
      }
      
      stat.total++;
      const isTested = s.mathScore !== null || s.literatureScore !== null || s.writtenEnglishScore !== null || s.oralEnglishScore !== null || s.psychologyScore !== null || (s.scores && s.scores.length > 0);
      if (isTested) stat.surveyed++;
      
      if (s.admissionResult === "Đạt" || s.admissionResult === "Học thử") {
        stat.passed++;
      } else if (s.admissionResult === "Không đạt" || s.admissionResult === "Không đạt - Kiểm tra lại" || s.admissionResult === "Không đạt - Không kiểm tra lại") {
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
  }, [filteredReportStudents, periods]);





            const campusOverallSurveyed = useMemo(() => {
    let CS1 = 0;
    let CS2 = 0;
    let CS3 = 0;
    let CS4 = 0;
    let CS5 = 0;
    let total = 0;

    filteredReportStudents.forEach(s => {
      const isTested = s.mathScore !== null || s.literatureScore !== null || s.writtenEnglishScore !== null || s.oralEnglishScore !== null || s.psychologyScore !== null || (s.scores && s.scores.length > 0);
      if (!isTested) return;
      
      total++;
      
      // Resolve campus code for this student
      let campusCode = null;
      const studentPeriod = periods.find(p => p.id === s.periodId);
      const isOpenDay = studentPeriod?.name?.toLowerCase().includes("open day");
      
      if (isOpenDay && s.registeredCampus) {
        const matchingCampus = campuses.find(c => c.id === s.registeredCampus);
        if (matchingCampus) {
          campusCode = matchingCampus.campusCode;
        }
      }
      
      if (!campusCode) {
        let tc = campuses.find(c => 
          c.campusName && (c.campusName === s.admissionCampus)
        );
        if (!tc && s.batchId) {
          const b = reportBatches.find(bx => bx.id === s.batchId);
          if (b?.campusId) {
            tc = campuses.find(c => c.id === b.campusId);
          }
        }
        if (tc) {
          campusCode = tc.campusCode;
        }
      }
      
      if (!campusCode) {
        const campusName = s.admissionCampus || "";
        if (campusName.includes("CS1") || campusName.includes("Cơ sở 1")) campusCode = "CS1";
        else if (campusName.includes("CS2") || campusName.includes("Cơ sở 2")) campusCode = "CS2";
        else if (campusName.includes("CS3") || campusName.includes("Cơ sở 3")) campusCode = "CS3";
        else if (campusName.includes("CS4") || campusName.includes("Cơ sở 4")) campusCode = "CS4";
        else if (campusName.includes("CS5") || campusName.includes("Cơ sở 5")) campusCode = "CS5";
      }

      const csKey = (campusCode || "").toUpperCase();
      if (csKey === "CS1") CS1++;
      else if (csKey === "CS2") CS2++;
      else if (csKey === "CS3") CS3++;
      else if (csKey === "CS4") CS4++;
      else if (csKey === "CS5") CS5++;
    });

    return { CS1, CS2, CS3, CS4, CS5, total };
  }, [filteredReportStudents, periods, campuses, reportBatches]);

        const campusOverallTotal = useMemo(() => {
    let CS1 = 0;
    let CS2 = 0;
    let CS3 = 0;
    let CS4 = 0;
    let CS5 = 0;
    const total = filteredReportStudents.length;

    filteredReportStudents.forEach(s => {
      const campusId = resolveStudentCampusId(s);
      const campusCode = campuses.find(c => c.id === campusId)?.campusCode;
      
      const csKey = (campusCode || "").toUpperCase();
      if (csKey === "CS1") CS1++;
      else if (csKey === "CS2") CS2++;
      else if (csKey === "CS3") CS3++;
      else if (csKey === "CS4") CS4++;
      else if (csKey === "CS5") CS5++;
    });

    return { CS1, CS2, CS3, CS4, CS5, total };
  }, [filteredReportStudents, resolveStudentCampusId, campuses]);

  const enrollmentStats = useMemo(() => {
    let g1_passed = 0; let g1_enrolled = 0;
    let g6_passed = 0; let g6_enrolled = 0;
    let g10_passed = 0; let g10_enrolled = 0;
    let other_passed = 0; let other_enrolled = 0;
    let total_passed = 0; let total_enrolled = 0;

    filteredReportStudents.forEach(s => {
      const isPassed = s.admissionResult === "Đạt" || s.admissionResult === "Đạt cam kết";
      if (!isPassed) return;

      total_passed++;
      const isEnrolled = s.enrollmentStatus === "COMPLETED";
      if (isEnrolled) total_enrolled++;

      let g = String(s.grade || "").trim();
      const match = g.match(/\d+/);
      if (match) {
        g = match[0];
      }

      if (g === "1") {
        g1_passed++;
        if (isEnrolled) g1_enrolled++;
      } else if (g === "6") {
        g6_passed++;
        if (isEnrolled) g6_enrolled++;
      } else if (g === "10") {
        g10_passed++;
        if (isEnrolled) g10_enrolled++;
      } else {
        other_passed++;
        if (isEnrolled) other_enrolled++;
      }
    });

    const overallRate = total_passed > 0 ? Math.round((total_enrolled / total_passed) * 100) : 0;
    const g1Rate = g1_passed > 0 ? Math.round((g1_enrolled / g1_passed) * 100) : 0;
    const g6Rate = g6_passed > 0 ? Math.round((g6_enrolled / g6_passed) * 100) : 0;
    const g10Rate = g10_passed > 0 ? Math.round((g10_enrolled / g10_passed) * 100) : 0;
    const otherRate = other_passed > 0 ? Math.round((other_enrolled / other_passed) * 100) : 0;

    return {
      total_passed, total_enrolled, overallRate,
      g1_passed, g1_enrolled, g1Rate,
      g6_passed, g6_enrolled, g6Rate,
      g10_passed, g10_enrolled, g10Rate,
      other_passed, other_enrolled, otherRate
    };
  }, [filteredReportStudents]);



    const gradeStats = useMemo(() => {
    const gradesList = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
    const map = new Map();
    gradesList.forEach(g => {
      map.set(g, {
        grade: `Khối ${g}`,
        total: 0,
        surveyed: 0,
        CS1: 0, CS2: 0, CS3: 0, CS4: 0, CS5: 0,
        CS1_total: 0, CS2_total: 0, CS3_total: 0, CS4_total: 0, CS5_total: 0
      });
    });
    
    const overallTotal = filteredReportStudents.length;
    
    filteredReportStudents.forEach(s => {
      let g = String(s.grade || "").trim();
      const match = g.match(/\d+/);
      if (match) {
        g = match[0];
      }
      if (!map.has(g)) return;
      const stat = map.get(g);
      stat.total++;
      const isTested = s.mathScore !== null || s.literatureScore !== null || s.writtenEnglishScore !== null || s.oralEnglishScore !== null || s.psychologyScore !== null || (s.scores && s.scores.length > 0);
      if (isTested) stat.surveyed++;

      // Resolve campus code for this student
      const campusId = resolveStudentCampusId(s);
      const campusCode = campuses.find(c => c.id === campusId)?.campusCode;
      
      const csKey = (campusCode || "").toUpperCase();
      if (csKey === "CS1") { stat.CS1_total++; if (isTested) stat.CS1++; }
      else if (csKey === "CS2") { stat.CS2_total++; if (isTested) stat.CS2++; }
      else if (csKey === "CS3") { stat.CS3_total++; if (isTested) stat.CS3++; }
      else if (csKey === "CS4") { stat.CS4_total++; if (isTested) stat.CS4++; }
      else if (csKey === "CS5") { stat.CS5_total++; if (isTested) stat.CS5++; }
    });

    return Array.from(map.values()).map(item => {
      const rate = item.total > 0 ? Math.round((item.surveyed / item.total) * 100) : 0;
      const cs1Rate = item.CS1_total > 0 ? Math.round((item.CS1 / item.CS1_total) * 100) : 0;
      const cs2Rate = item.CS2_total > 0 ? Math.round((item.CS2 / item.CS2_total) * 100) : 0;
      const cs3Rate = item.CS3_total > 0 ? Math.round((item.CS3 / item.CS3_total) * 100) : 0;
      const cs4Rate = item.CS4_total > 0 ? Math.round((item.CS4 / item.CS4_total) * 100) : 0;
      const cs5Rate = item.CS5_total > 0 ? Math.round((item.CS5 / item.CS5_total) * 100) : 0;
      
      const gradeShare = overallTotal > 0 ? parseFloat(((item.total / overallTotal) * 100).toFixed(1)) : 0;
      
      return {
        ...item,
        "Chung": rate,
        "CS1_rate": cs1Rate,
        "CS2_rate": cs2Rate,
        "CS3_rate": cs3Rate,
        "CS4_rate": cs4Rate,
        "CS5_rate": cs5Rate,
        "CS1": item.CS1,
        "CS2": item.CS2,
        "CS3": item.CS3,
        "CS4": item.CS4,
        "CS5": item.CS5,
        "gradeShare": gradeShare
      };
    });
  }, [filteredReportStudents, resolveStudentCampusId, campuses]);








  const overallKPIs = useMemo(() => {
    const total = filteredReportStudents.length;
    let passed = 0;
    let failed = 0;
    let committed = 0;
    let pending = 0;
    let surveyed = 0;
    
    filteredReportStudents.forEach(s => {
      const isTested = s.mathScore !== null || s.literatureScore !== null || s.writtenEnglishScore !== null || s.oralEnglishScore !== null || s.psychologyScore !== null || (s.scores && s.scores.length > 0);
      if (isTested) surveyed++;

      if (s.admissionResult === "Đạt" || s.admissionResult === "Học thử" || s.admissionResult === "Đạt - Giao lưu") passed++;
      else if (s.admissionResult === "Không đạt" || s.admissionResult === "Không đạt - Kiểm tra lại" || s.admissionResult === "Không đạt - Không kiểm tra lại") failed++;
      else if (s.admissionResult === "Đạt cam kết") committed++;
      else pending++;
    });
    
    const approvedRate = total > 0 ? Math.round(((total - pending) / total) * 100) : 0;
    const surveyRate = total > 0 ? Math.round((surveyed / total) * 100) : 0;
    
    return { total, passed, failed, committed, pending, surveyed, surveyRate, approvedRate };
  }, [filteredReportStudents]);

  const methodStats = useMemo(() => {
    const stats = {
      le: { total: 0, surveyed: 0, rate: 0, share: 0 },
      openday: { total: 0, surveyed: 0, rate: 0, share: 0 },
      chuyenhe: { total: 0, surveyed: 0, rate: 0, share: 0 }
    };

    filteredReportStudents.forEach(s => {
      const m = String(s.surveySystem || "").toLowerCase().trim();
      const isTested = s.mathScore !== null || s.literatureScore !== null || s.writtenEnglishScore !== null || s.oralEnglishScore !== null || s.psychologyScore !== null || (s.scores && s.scores.length > 0);
      
      let key = "le";
      if (m.includes("open") || m.includes("day")) {
        key = "openday";
      } else if (m.includes("chuyển") || m.includes("chuyen") || m.includes("hệ") || m.includes("he")) {
        key = "chuyenhe";
      }
      
      stats[key].total++;
      if (isTested) {
        stats[key].surveyed++;
      }
    });

    const totalSurveyed = stats.le.surveyed + stats.openday.surveyed + stats.chuyenhe.surveyed;
    
    ["le", "openday", "chuyenhe"].forEach(k => {
      const item = stats[k];
      item.rate = item.total > 0 ? Math.round((item.surveyed / item.total) * 100) : 0;
      item.share = totalSurveyed > 0 ? Math.round((item.surveyed / totalSurveyed) * 100) : 0;
    });

    return stats;
  }, [filteredReportStudents]);

  const canApprove = useMemo(() => {
    if (!currentUser) return false;
    const userRole = (currentUser.role || "").toUpperCase();
    
    // Lock check for GĐCS/BGH
    const isStudentBatchLocked = selectedReportStudent?.batch?.status === "LOCKED" || selectedReportStudent?.batch?.status === "CLOSED";
    if (isStudentBatchLocked && ["GDCS", "GĐ_CS", "GD_CS", "GĐCS", "BGH", "BGH_CS", "HIEU_TRUONG"].includes(userRole)) {
      return false;
    }

    if (userRole === "ADMIN" || userRole === "SUPER_ADMIN" || userRole === "KT_DBCL") return true;
    if (["GDCS", "GĐ_CS", "GD_CS", "GĐCS", "BGH", "BGH_CS", "HIEU_TRUONG"].includes(userRole)) {
      const isOpenDay = reportSelPeriod?.name?.toLowerCase().includes("open day");
      if (isOpenDay) {
        const studentCampusId = selectedReportStudent?.registeredCampus;
        if (!studentCampusId) return true; // Default to allow if no registeredCampus is selected
        return currentUser.campusIds.includes(studentCampusId);
      }

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
      let cleanNote = parseApprovalHistory(selectedReportStudent.directorNote).cleanNote || "";
      const match = cleanNote.match(/^Môn cam kết: \[(.*?)\](?:\r?\n\r?\n)?/);
      const matchRetest = cleanNote.match(/^Môn kiểm tra lại: \[(.*?)\](?:\r?\n\r?\n)?/);
      if (match) {
        commSubs = match[1] ? match[1].split(", ") : [];
        cleanNote = cleanNote.replace(/^Môn cam kết: \[(.*?)\](?:\r?\n\r?\n)?/, "");
      } else if (matchRetest) {
        commSubs = matchRetest[1] ? matchRetest[1].split(", ") : [];
        cleanNote = cleanNote.replace(/^Môn kiểm tra lại: \[(.*?)\](?:\r?\n\r?\n)?/, "");
      }

      let presetResult = selectedReportStudent.admissionResult || "";
      if (pendingQuickResultRef.current && pendingQuickResultRef.current.studentId === selectedReportStudent.id) {
        presetResult = pendingQuickResultRef.current.result;
        pendingQuickResultRef.current = null;
      }

      // Xác định Người phê duyệt mặc định là GĐCS phụ trách cơ sở của học sinh:
      // - Nếu hồ sơ chưa duyệt: luôn mặc định là GĐCS phụ trách cơ sở (loại bỏ tên GV bộ môn/Tâm lý từng bị lưu nhầm vào signatureName).
      // - Nếu hồ sơ đã duyệt: giữ tên người duyệt hợp lệ thuộc nhóm GĐCS, nếu không hợp lệ thì về GĐCS phụ trách cơ sở.
      const knownGdcsSet = new Set(
        [
          autoCampusDirectorName,
          ...campuses.map(c => resolveGdcsNameForCampus(c)),
          ...(gdcsUsers || []).map((u: any) => u.fullName || u.email)
        ]
          .map(x => String(x || "").trim())
          .filter(Boolean)
      );
      const savedSig = String(selectedReportStudent.signatureName || "").trim();
      const isValidGdcsSignature = Boolean(savedSig) && knownGdcsSet.has(savedSig);

      const defaultApproverSignature = selectedReportStudent.admissionResult
        ? (isValidGdcsSignature ? savedSig : (autoCampusDirectorName || savedSig))
        : autoCampusDirectorName;

      const sanitizedCleanNote = String(cleanNote || "").replace(/^(?:\s*<br\s*\/?>\s*)+/gi, "").trim();
      const defaultCleanNote =
        sanitizedCleanNote && sanitizedCleanNote !== "Đạt"
          ? sanitizedCleanNote
          : presetResult === "Đạt"
          ? "Đạt tiêu chuẩn tiếp nhận của nhà trường"
          : sanitizedCleanNote;

      // Loại bỏ Tiếng Anh (vấn đáp) (không xét kết quả) và Năng lực tư duy khỏi danh sách môn cam kết
      const filteredCommSubs = (commSubs || []).filter((subName: string) => {
        const lower = String(subName || "").toLowerCase().normalize("NFC");
        if (lower.includes("năng lực tư duy")) return false;
        if (lower.includes("định hướng")) return false;
        if (lower.includes("tiếng anh") && !lower.includes("esl") && (lower.includes("vấn đáp") || lower.includes("nói"))) {
          return false;
        }
        return true;
      });

      setReportForm({
        admissionResult: presetResult,
        admissionCampus: selectedReportStudent.admissionCampus || resolvedStudentCampusObj?.campusName || "",
        signatureName: defaultApproverSignature || "",
        directorNote: defaultCleanNote,
        committedSubjects: filteredCommSubs
      });
    }
  }, [selectedReportStudent, autoCampusDirectorName, resolvedStudentCampusObj, campuses, gdcsUsers, resolveGdcsNameForCampus]);

  // Phím tắt điều hướng hồ sơ (Alt + Mũi tên Trái/Phải & Esc đóng hồ sơ)
  useEffect(() => {
    if (!selectedReportStudent || isPvdhModalOpen || isOrientationModalOpen || isOrientationReportModalOpen || isScoreModalOpen || isRetestModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setReportStudentId("");
      } else if (e.altKey && e.key === "ArrowLeft" && dossierNav.prevId) {
        e.preventDefault();
        setReportStudentId(dossierNav.prevId);
      } else if (e.altKey && e.key === "ArrowRight" && dossierNav.nextId) {
        e.preventDefault();
        setReportStudentId(dossierNav.nextId);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedReportStudent, dossierNav.prevId, dossierNav.nextId, isPvdhModalOpen, isOrientationModalOpen, isOrientationReportModalOpen, isScoreModalOpen, isRetestModalOpen]);
  const [sForm, setSForm] = useState({
    studentCode:"", fullName:"", dateOfBirth:"", gender:"", grade:"", admissionCriteria:"", className:"", hocKy:"", kqgdTieuHoc:"", kqHocTap:"", kqRenLuyen:"", targetType:"", surveySystem:"", hoSoCtQuocTe:"", surveyFormType:"", batchId:"", registeredCampus:"", periodId:"",
    cityName: "", districtName: "", wardName: "", countryName: "", oldSchoolName: "", oldSchoolType: ""
  });

  const [selectedLocationType, setSelectedLocationType] = useState<"Nội tỉnh" | "Ngoại tỉnh" | "Nước ngoài" | "">("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedWard, setSelectedWard] = useState<string>("");
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [schoolNameInput, setSchoolNameInput] = useState<string>("");
  const [schoolTypeInput, setSchoolTypeInput] = useState<string>("");
  const [originalKqgd, setOriginalKqgd] = useState<string>("");

  // Sync selectedLocationType when targetType changes
  useEffect(() => {
    if (!sModal) return;
    const selectedTargets = sForm.targetType ? sForm.targetType.split(",").map((t) => t.trim()).filter(Boolean) : [];
    if (selectedTargets.includes("Nội tỉnh")) {
      setSelectedLocationType("Nội tỉnh"); setSelectedProvince("Thành phố Đà Nẵng"); setSelectedProvince("Thành phố Đà Nẵng");
    } else if (selectedTargets.includes("Ngoại tỉnh")) {
      setSelectedLocationType("Ngoại tỉnh");
    } else if (selectedTargets.includes("Nước ngoài")) {
      setSelectedLocationType("Nước ngoài");
    } else {
      setSelectedLocationType("");
    }
  }, [sForm.targetType, sModal]);

  // Parse kqgdTieuHoc when form opens
  useEffect(() => {
    if (sModal) {
      if (editS && sForm.kqgdTieuHoc) {
        const match = sForm.kqgdTieuHoc.match(/Trường cũ:\s*(.*?)\s*\((.*?)\)\s*\|\s*Đối tượng:\s*(Nội tỉnh|Ngoại tỉnh|Nước ngoài)\s*-\s*(.*)/);
        if (match) {
          const [, sName, sType, locType, locDetail] = match;
          setSchoolNameInput(sName);
          setSchoolTypeInput(sType);
          setSelectedLocationType(locType as any);
          
                    if (locType === "Nội tỉnh") {
            const parts = locDetail.split(" - ");
            setSelectedDistrict("");
            setSelectedWard(parts[parts.length - 1].trim());
            setSelectedProvince("");
            setSelectedCountry("");
          } else if (locType === "Ngoại tỉnh") {
            const parts = locDetail.split(" - ");
            if (parts.length > 1) {
              setSelectedWard(parts[0].trim());
              setSelectedProvince(parts[1].trim());
            } else {
              setSelectedWard("");
              setSelectedProvince(locDetail.trim());
            }
            setSelectedDistrict("");
            setSelectedCountry("");
          } else if (locType === "Nước ngoài") {
            setSelectedCountry(locDetail.trim());
            setSelectedDistrict("");
            setSelectedWard("");
            setSelectedProvince("");
          }
          
          const lines = sForm.kqgdTieuHoc.split("\n");
          if (lines.length > 1) {
            setOriginalKqgd(lines.slice(1).join("\n"));
          } else {
            setOriginalKqgd("");
          }
        } else if (editS.oldSchoolName || editS.cityName || editS.districtName || editS.wardName || editS.countryName) {
          setSchoolNameInput(editS.oldSchoolName || "");
          setSchoolTypeInput(editS.oldSchoolType || "");
          
          let locType = "";
          if (editS.targetType) {
            if (editS.targetType.includes("Nội tỉnh")) locType = "Nội tỉnh";
            else if (editS.targetType.includes("Ngoại tỉnh")) locType = "Ngoại tỉnh";
            else if (editS.targetType.includes("Nước ngoài")) locType = "Nước ngoài";
          }
          setSelectedLocationType(locType as any);
          
          setSelectedDistrict(editS.districtName || "");
          setSelectedWard(editS.wardName || "");
          setSelectedProvince(editS.cityName || "");
          setSelectedCountry(editS.countryName || "");
          setOriginalKqgd(sForm.kqgdTieuHoc || "");
        } else {
          setSchoolNameInput("");
          setSchoolTypeInput("");
          setSelectedLocationType("");
          setSelectedDistrict("");
          setSelectedWard("");
          setSelectedProvince("");
          setSelectedCountry("");
          setOriginalKqgd(sForm.kqgdTieuHoc || "");
        }
      } else {
        setSchoolNameInput("");
        setSchoolTypeInput("");
        setSelectedLocationType("");
        setSelectedDistrict("");
        setSelectedWard("");
        setSelectedProvince("");
        setSelectedCountry("");
        setOriginalKqgd("");
      }
    }
  }, [sModal, editS]);

    // Update sForm when location inputs change
  useEffect(() => {
    if (!sModal) return;
    
    if (selectedLocationType) {
      let locDetail = "";
      if (selectedLocationType === "Nội tỉnh") {
        locDetail = "Thành phố Đà Nẵng";
      } else if (selectedLocationType === "Ngoại tỉnh") {
        locDetail = selectedWard ? `${selectedWard} - ${selectedProvince}` : selectedProvince;
      } else if (selectedLocationType === "Nước ngoài") {
        locDetail = selectedCountry;
      }
      
      const locationStr = `Trường cũ: ${schoolNameInput} (${schoolTypeInput}) | Đối tượng: ${selectedLocationType} - ${locDetail}`;
      const finalKq = originalKqgd ? `${locationStr}\n${originalKqgd}` : locationStr;
      
      setSForm(prev => {
        const cityName = selectedLocationType === "Nội tỉnh" ? "Thành phố Đà Nẵng" : (selectedLocationType === "Ngoại tỉnh" ? selectedProvince : "");
        const countryName = selectedLocationType === "Nước ngoài" ? selectedCountry : "Việt Nam";
        const districtName = "";
        const wardName = (selectedLocationType === "Nội tỉnh" || selectedLocationType === "Ngoại tỉnh") ? selectedWard : "";
        
        return {
          ...prev,
          kqgdTieuHoc: finalKq,
          cityName,
          districtName,
          wardName,
          countryName,
          oldSchoolName: schoolNameInput,
          oldSchoolType: schoolTypeInput
        };
      });
    } else {
      setSForm(prev => {
        return {
          ...prev,
          kqgdTieuHoc: originalKqgd,
          cityName: "",
          districtName: "",
          wardName: "",
          countryName: "",
          oldSchoolName: "",
          oldSchoolType: ""
        };
      });
    }
  }, [selectedLocationType, selectedDistrict, selectedWard, selectedProvince, selectedCountry, schoolNameInput, schoolTypeInput, originalKqgd, sModal]);
  const fileRef = useRef<HTMLInputElement>(null)


  // ───────── SUBJECTS & MAPPING STATE ─────────
  const [subjectsList, setSubjectsList] = useState<any[]>(initialSubjects||[]);
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);
  const [columnConfigForm, setColumnConfigForm] = useState({ subjectId: "", name: "", scoreNames: [], commentNames: [], showScoreInReport: [], showCommentInReport: [], scoreColumns: 1, commentColumns: 1 });
  const [editingSubjectId, setEditingSubjectId] = useState<string|null>(null);
  const [subjectForm, setSubjectForm] = useState({ code:"", name:"", subjectType:"", scoreColumns: 1, commentColumns: 1, status: "ACTIVE", exemptCriteria: [] as string[] });
  const [selGrades, setSelGrades] = useState<string[]>((Array.isArray(grades) && grades[0]) ? [grades[0]] : []);
  const [selEdus, setSelEdus] = useState<string[]>([]);
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
  const [asFilterBatchId, setAsFilterBatchId] = useState("")
  const [asNotifyingId, setAsNotifyingId] = useState(null)
  const [asNotifyingAll, setAsNotifyingAll] = useState(false)
  const [asDeptId, setAsDeptId] = useState("")
  const [asTeacherId, setAsTeacherId] = useState("")
  const [asSelSubjects, setAsSelSubjects] = useState<string[]>([])
  const [asSelGrades, setAsSelGrades] = useState<string[]>([])
  const [asSelSystems, setAsSelSystems] = useState<string[]>([])
  const [asSubmitting, setAsSubmitting] = useState(false)

  useEffect(() => {
    const systemsForYear = eduSystems.filter((es: any) => es.academicYearId === yearId);
    if (systemsForYear.length > 0) {
      setSelEdus([systemsForYear[0].code]);
    } else {
      setSelEdus([]);
    }
  }, [yearId, eduSystems]);

  useEffect(() => {
    if (visiblePeriods.length > 0) {
      if (!sPeriodId || (!visiblePeriods.some(p => p.id === sPeriodId) && sPeriodId !== "all")) {
        // setSPeriodId(visiblePeriods[0].id);
      }
      if (!asPeriodId || (!visiblePeriods.some(p => p.id === asPeriodId) && asPeriodId !== "all")) {
        // setAsPeriodId(visiblePeriods[0].id);
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
      const [periodsRes, gradesRes] = await Promise.all([
        fetch(`/api/input-assessments?academicYearId=${yearId}&t=${Date.now()}`),
        fetch(`/api/input-assessments?getGrades=true&academicYearId=${yearId}&t=${Date.now()}`)
      ])
      if (periodsRes.ok) { 
        const d = await periodsRes.json()
        setPeriods(d)
        if (d.length) {
          // if (!sPeriodId) setSPeriodId(d[0].id);
          // if (!asPeriodId) setAsPeriodId(d[0].id);
        }
      }
      if (gradesRes.ok) {
        const fetchedGrades = await gradesRes.json()
        setActiveGrades(fetchedGrades)
      }
    } catch (err) {
      console.error(err)
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
    if (cannotUpdate) return;
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
  
  const handleSubjectSubmit=async(e:React.FormEvent)=>{e.preventDefault();if (editingSubjectId ? cannotUpdate : cannotCreate) return;const p=editingSubjectId?{type:"subject",id:editingSubjectId,data:{name:subjectForm.name,subjectType:subjectForm.subjectType||null, scoreColumns: subjectForm.scoreColumns, commentColumns: subjectForm.commentColumns, status: subjectForm.status, exemptCriteria: JSON.stringify(subjectForm.exemptCriteria)}}:{type:"subject",data:{code:subjectForm.code,name:subjectForm.name,subjectType:subjectForm.subjectType||null, scoreColumns: subjectForm.scoreColumns, commentColumns: subjectForm.commentColumns, status: subjectForm.status||"ACTIVE", exemptCriteria: JSON.stringify(subjectForm.exemptCriteria)}};const r=await fetch("/api/input-assessment-categories",{method:editingSubjectId?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)});if(r.ok){setIsSubjectOpen(false);fetchSubjects()}else notify((await r.json()).error, "err")};
  
  const deleteSubject=async(id:string)=>{if (cannotDelete) return;if(!window.confirm("Xóa?"))return;await fetch("/api/input-assessment-categories?type=subject&id="+id,{method:"DELETE"});fetchSubjects()};
  
  const addMapping=async(sid:string)=>{if (cannotCreate) return;const r=await fetch("/api/grade-subject-mappings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({grades:selGrades,eduSystems:selEdus,subjectId:sid})});if(r.ok)fetchMappings();else notify((await r.json()).error, "err")};
  
  const removeMapping=async(sid:string)=>{if (cannotDelete) return;await fetch("/api/grade-subject-mappings?subjectId="+sid+"&grades="+selGrades.join(",")+"&eduSystems="+selEdus.join(","),{method:"DELETE"});fetchMappings()};
  
  const assignedIds=[...new Set(mappings.map(m=>m.subjectId))];
  const uniqueAssigned=assignedIds.map(sid=>mappings.find(x=>x.subjectId===sid)).filter(Boolean);
  const availableSubjects=subjectsList.filter(s=>!assignedIds.includes(s.id));
  const toggleGrade=(g:string)=>setSelGrades(p=>p.includes(g)?p.filter(x=>x!==g):[...p,g]);
  const toggleEdu=(c:string)=>setSelEdus(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c]);

  const fetchStudents = useCallback(async () => {
    if (!sPeriodId) return
    setSLoading(true)
    try {
      let url = `/api/input-assessment-students?t=${Date.now()}`
      if (sPeriodId === "all") url += `&fetch_all=true`
      else url += `&periodId=${sPeriodId}`
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

  useEffect(() => {
    setAsFilterBatchId("");
  }, [asPeriodId]);

  useEffect(() => {
    if (asBatchId) {
      setAsFilterBatchId(asBatchId);
    }
  }, [asBatchId]);

  // ───────── ACTIONS ─────────
  const openAddPeriod = () => { setEditP(null); setPForm({ code:"", name:"", assignedUserId:"", startDate:"", endDate:"", description:"", status:"ACTIVE" }); setPModal(true) }
  const openEditPeriod = (p:Period) => { setEditP(p); setPForm({ code:p.code, name:p.name, assignedUserId:p.assignedUserId||"", startDate:p.startDate?.slice(0,10)||"", endDate:p.endDate?.slice(0,10)||"", description:p.description||"", status:p.status }); setPModal(true) }
  const savePeriod = async () => {
    if (editP ? cannotUpdate : cannotCreate) return;
    if (!pForm.code.trim()||!pForm.name.trim()) return notify("Cần nhập Mã và Tên","err")
    const r = await fetch("/api/input-assessments", { method: editP?"PUT":"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action: editP?"UPDATE_PERIOD":"CREATE_PERIOD", id:editP?.id, data:{...pForm, academicYearId:yearId} }) })
    if (r.ok) { setPModal(false); fetchPeriods(); notify(editP?"Đã cập nhật kỳ khảo sát":"Đã tạo kỳ khảo sát mới") }
    else notify("Lỗi","err")
  }
  const doDeletePeriod = async (id:string) => { if (cannotDelete) return; const r = await fetch(`/api/input-assessments?type=period&id=${id}`,{method:"DELETE"}); if (r.ok) { fetchPeriods(); notify("Đã xóa kỳ khảo sát") } }

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
    const parts = b.name.split(" _ ");
    if (parts.length >= 6 && parts[3] === "KSĐV") {
      baseName = parts[4];
    } else if (parts.length >= 6 && parts[4] === "") {
      baseName = parts[3];
    } else if (parts.length === 5) {
      baseName = parts[3];
    } else if (parts.length >= 5) {
      baseName = parts[4];
    } else {
      const match = b.name.match(/Đợt \d+ - (.*?) \|/);
      if (match) {
        baseName = match[1];
      } else {
        const match2 = b.name.match(/Đợt \d+ - (.*)/);
        if (match2) baseName = match2[1];
      }
    }
    setBForm({ batchNumber:String(b.batchNumber), name:baseName, startDate:b.startDate?.slice(0,10)||"", endDate:b.endDate?.slice(0,10)||"", status:b.status, campusId: b.campusId||"", assignedUserId: b.assignedUserId||"" }); 
    setBModal(true);
  }
  const saveBatch = async () => {
    if (editB ? cannotUpdate : cannotCreate) return;
    if (!bForm.name.trim() || !bForm.startDate || !bForm.endDate) return notify("Cần nhập Tên Đợt KS, Ngày bắt/kết thúc", "err")
    
    const selectedCampus = campuses.find(c => c.id === bForm.campusId);
    const campusName = selectedCampus ? (selectedCampus.campusCode || selectedCampus.campusName) : "Tất cả";
    const startStr = bForm.startDate ? bForm.startDate.split('-').reverse().join('/') : "";
    const endStr = bForm.endDate ? bForm.endDate.split('-').reverse().join('/') : "";
    
    const period = periods.find(p => p.id === targetPeriodId);
    const periodName = period ? period.name : "Tên đợt";
    let periodCode = period ? (period.code || period.name) : "";
    if (periodName.toLowerCase().normalize("NFC").includes("khảo sát lẻ") || periodName.toLowerCase().normalize("NFC").includes("khảo sát le")) {
      periodCode = "KSL";
    }
    const fullScientificName = `${campusName} _ ${periodCode} _ Đợt ${bForm.batchNumber || "1"} _ ${bForm.name || "Tên Đợt KS"} _ ${endStr}`;
    
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
  const doDeleteBatch = async (id:string) => { if (cannotDelete) return; const r = await fetch(`/api/input-assessments?type=batch&id=${id}`,{method:"DELETE"}); if (r.ok) { fetchPeriods(); notify("Đã xóa đợt") } }

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

    setEditS(null);
    setSForm({ studentCode: genCode, fullName: "", dateOfBirth: "", grade: "", admissionCriteria: "", className: "", hocKy: "", kqgdTieuHoc: "", kqHocTap: "", kqRenLuyen: "", targetType: "", surveySystem: "", hoSoCtQuocTe: "", surveyFormType: "", gender: "", batchId: initialBatchId, periodId: sPeriodId, cityName: "", districtName: "", wardName: "", countryName: "", oldSchoolName: "", oldSchoolType: "" });
    setSModal(true);
  }
  const openEditStudent = (s:Student) => { setEditS(s); setSForm({ studentCode:s.studentCode, fullName:s.fullName, dateOfBirth:s.dateOfBirth?.slice(0,10)||"", grade:s.grade||"", admissionCriteria:s.admissionCriteria||"", className:s.className||"", hocKy:s.hocKy||"", kqgdTieuHoc:s.kqgdTieuHoc||"", kqHocTap:s.kqHocTap||"", kqRenLuyen:s.kqRenLuyen||"", targetType:s.targetType||"", surveySystem:s.surveySystem||"", hoSoCtQuocTe:s.hoSoCtQuocTe||"", surveyFormType:s.surveyFormType||"" , gender:s.gender||"", batchId:s.batchId||"", periodId:s.periodId||"", cityName: s.cityName || "", districtName: s.districtName || "", wardName: s.wardName || "", countryName: s.countryName || "", oldSchoolName: s.oldSchoolName || "", oldSchoolType: s.oldSchoolType || "" }); setSModal(true) }
  const saveStudent = async () => {
    if (editS ? cannotUpdate : cannotCreate) return;
    if (!sForm.studentCode.trim()||!sForm.fullName.trim()) return notify("Cần nhập Mã HS và Họ tên","err")
    const r = editS
      ? await fetch("/api/input-assessment-students", { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id:editS.id, data:sForm }) })
      : await fetch("/api/input-assessment-students", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"CREATE", data:{...sForm, periodId:sPeriodId, batchId:sForm.batchId || sBatchId || null} }) })
    if (r.ok) { setSModal(false); fetchStudents(); notify(editS?"Đã cập nhật học sinh":"Đã thêm học sinh") }
    else notify("Lỗi","err")
  }
  const doDeleteStudent = async (id:string) => { if (cannotDelete) return; const r = await fetch(`/api/input-assessment-students?id=${id}`,{method:"DELETE"}); if (r.ok) { fetchStudents(); notify("Đã xóa") } }
  const doDeleteSelected = async () => {
    if (cannotDelete) return;
    const r = await fetch(`/api/input-assessment-students?ids=${sSelected.join(",")}`,{method:"DELETE"})
    if (r.ok) { setSSelected([]); fetchStudents(); notify(`Đã xóa ${sSelected.length} học sinh`) }
  }
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (cannotCreate) return;
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

      }).filter((r:any) => r.fullName)
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
    if (editC ? cannotUpdate : cannotCreate) return;
    if (!cForm.code.trim()||!cForm.name.trim()) return notify("Cần nhập Mã và Tên","err")
    const r = editC
      ? await fetch("/api/assessment-configs", { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id:editC.id, name:cForm.name, code:cForm.code }) })
      : await fetch("/api/assessment-configs", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(cForm) })
    if (r.ok) { setCModal(false); fetchConfigs(); notify("Xong") }
  }
  const doDeleteConfig = async (id:string) => { if (cannotDelete) return; const r = await fetch(`/api/assessment-configs?id=${id}`,{method:"DELETE"}); if (r.ok) { fetchConfigs(); notify("Xóa xong") } }

  // ───────── ASSIGNMENT ACTIONS ─────────
  const filteredTeachers = useMemo(() => {
    if (!asDeptId) return teachers
    return teachers.filter(t => t.departmentId === asDeptId)
  }, [teachers, asDeptId])

  const submitAssignment = async () => {
    if (cannotCreate || cannotUpdate) return;
    if (!asPeriodId || !asBatchId || !asTeacherId || !asSelSubjects.length || !asSelGrades.length || !asSelSystems.length) {
      return notify("Vui lòng chọn đầy đủ Kỳ, Đợt, GV, Môn, Khối và Hệ học", "err")
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

  
  const sendTeacherNotification = async (a) => {
    if (cannotUpdate) return;
    if (!a.userId || !asPeriodId) return;
    setAsNotifyingId(a.id);
    try {
      const res = await fetch("/api/input-assessment-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "NOTIFY_SINGLE",
          userId: a.userId,
          periodId: asPeriodId,
          batchId: a.batchId || null
        })
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.sentCount > 0) {
          notify(`Đã gửi email thông báo phân công cho GV ${a.user?.fullName || ""}!`);
        } else {
          notify(`Gửi email thất bại: ${result.errors?.[0] || "Không gửi được email"}`, "err");
        }
      } else {
        notify("Lỗi khi kết nối gửi thông báo", "err");
      }
    } catch (e) {
      console.error(e);
      notify("Có lỗi xảy ra", "err");
    } finally {
      setAsNotifyingId(null);
    }
  };

  const sendAllNotifications = async () => {
    if (cannotUpdate) return;
    if (groupedAssignments.length === 0) return notify("Không có phân công nào để gửi thông báo", "err");
    setAsNotifyingAll(true);
    try {
      const res = await fetch("/api/input-assessment-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "NOTIFY_ALL",
          periodId: asPeriodId,
          batchId: asFilterBatchId || null
        })
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          notify(`Đã gửi thông báo thành công cho ${result.sentCount} giáo viên!`);
          if (result.failedCount > 0) {
            notify(`Gửi thất bại cho ${result.failedCount} giáo viên`, "err");
          }
        } else {
          notify("Gửi thông báo hàng loạt thất bại", "err");
        }
      } else {
        notify("Lỗi kết nối", "err");
      }
    } catch (e) {
      console.error(e);
      notify("Có lỗi xảy ra", "err");
    } finally {
      setAsNotifyingAll(false);
    }
  };

  const groupedAssignments = useMemo(() => {
    const groups: Record<string, any> = {};
    const targetAssignments = asFilterBatchId ? assignments.filter(a => a.batchId === asFilterBatchId) : [];
    targetAssignments.forEach(a => {
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
  }, [assignments, asFilterBatchId]);

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
    if (cannotDelete) return;
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

const [customCommitmentSubjects, setCustomCommitmentSubjects] = useState<string[]>([]);
  const [newCustomSubjectInput, setNewCustomSubjectInput] = useState("");

  const availableCommitmentSubjects = useMemo(() => {
    const list: { name: string; isSurveySubject?: boolean }[] = [];
    const seen = new Set<string>();

    const canonicalizeSubjectName = (raw: string): string => {
      const clean = String(raw || "").trim();
      const lower = clean.toLowerCase().normalize("NFC");
      if (lower === "toán" || lower === "toán học") return "Toán học";
      if (lower === "ngữ văn" || lower === "văn") return "Ngữ Văn";
      if (lower === "tiếng việt") return "Tiếng Việt";
      if (lower === "tiếng anh (viết)" || lower === "tiếng anh viết" || lower === "ta viết") return "Tiếng Anh (viết)";
      return clean;
    };

    const isExcludedFromCommitment = (rawName: string, rawCode = ""): boolean => {
      const lower = String(rawName || "").toLowerCase().normalize("NFC");
      const code = String(rawCode || "").toLowerCase();
      // Bỏ Năng lực tư duy, Phiếu định hướng, và Tiếng Anh (vấn đáp) (không xét kết quả)
      if (lower.includes("năng lực tư duy") || code.includes("nltd")) return true;
      if (lower.includes("định hướng") || code.includes("pdh") || code.includes("orientation")) return true;
      if (
        (lower.includes("tiếng anh") || code === "tavd" || code.includes("english_speaking")) &&
        !lower.includes("esl") &&
        !code.includes("esl") &&
        (lower.includes("vấn đáp") || lower.includes("nói") || code.includes("vd") || code.includes("speaking") || code.includes("oral"))
      ) {
        return true;
      }
      return false;
    };

    const add = (name?: string | null, isSurveySubject = false, code = "", bypassExclusion = false) => {
      if (!name) return;
      const raw = String(name).trim();
      if (!raw) return;
      if (!bypassExclusion && isExcludedFromCommitment(raw, code)) return;
      const clean = canonicalizeSubjectName(raw);
      const lower = clean.toLowerCase().normalize("NFC");
      if (seen.has(lower)) return;
      seen.add(lower);
      list.push({ name: clean, isSurveySubject });
    };

    // 1. Các môn khảo sát thực tế đã chấm điểm của học sinh (đã loại trừ NLTD, Định hướng, TA vấn đáp)
    if (selectedReportStudent?.scores && Array.isArray(selectedReportStudent.scores)) {
      selectedReportStudent.scores.forEach((sc: any) => {
        const sName = sc.subject?.name || sc.subjectName || sc.name || sc.subject?.code;
        const sCode = sc.subject?.code || "";
        if (sName) add(sName, true, sCode);
      });
    }

    // 2. Đúng các môn Khảo sát chuẩn theo Hệ & Khối lớp của học sinh (Quy chế Sky-Line)
    const gradeNum = parseInt(String(selectedReportStudent?.grade || "0").replace(/\D/g, ""), 10) || 1;
    const sysRaw = `${selectedReportStudent?.surveyFormType || ""} ${selectedReportStudent?.surveySystem || ""}`.toUpperCase();
    const periodNameRaw = String(selectedReportStudent?.period?.name || "").toLowerCase();
    const batchNameRaw = String(selectedReportStudent?.batch?.name || "").toLowerCase();
    const isTransfer =
      !!selectedReportStudent?.isChuyenHe ||
      periodNameRaw.includes("chuyển hệ") ||
      batchNameRaw.includes("chuyen_he") ||
      batchNameRaw.includes("chuyển hệ");
    const isSystemI =
      sysRaw.includes("HNG") ||
      sysRaw.includes("SB") ||
      sysRaw.includes("SONG BẰNG") ||
      sysRaw.includes("HỆ I") ||
      sysRaw.includes("QUỐC TẾ");

    let systemDefaultSubjects: string[] = [];
    if (isTransfer) {
      systemDefaultSubjects = ["EPT", "ESL (vấn đáp)"];
    } else if (isSystemI) {
      if (gradeNum === 1) {
        systemDefaultSubjects = ["Bộ chuẩn phát triển trẻ em 5-6 tuổi", "ESL (vấn đáp)", "Tâm lý"];
      } else if (gradeNum <= 5) {
        systemDefaultSubjects = ["Toán học", "Tiếng Việt", "EPT", "ESL (vấn đáp)"];
      } else {
        systemDefaultSubjects = ["Toán học", "Ngữ Văn", "EPT", "ESL (vấn đáp)"];
      }
    } else {
      // Hệ S (HNS / CLC / Tiêu chuẩn)
      if (gradeNum === 1) {
        systemDefaultSubjects = ["Bộ chuẩn phát triển trẻ em 5-6 tuổi", "Tâm lý"];
      } else if (gradeNum <= 5) {
        systemDefaultSubjects = ["Toán học", "Tiếng Việt", "Tiếng Anh (viết)"];
      } else {
        systemDefaultSubjects = ["Toán học", "Ngữ Văn", "Tiếng Anh (viết)"];
      }
    }
    systemDefaultSubjects.forEach(c => add(c, false));

    // 3. Các môn đang được lưu/chọn trong form (vẫn loại trừ Tiếng Anh vấn đáp & NLTD)
    (reportForm.committedSubjects || []).forEach((s: string) => add(s, false, "", false));

    // 4. Môn do người dùng tự gõ thêm
    customCommitmentSubjects.forEach(s => add(s, false, "", true));

    return list;
  }, [selectedReportStudent, reportForm.committedSubjects, customCommitmentSubjects]);

  const handleAddCustomCommitmentSubject = () => {
    const val = newCustomSubjectInput.trim();
    if (!val) return;
    if (!customCommitmentSubjects.includes(val)) {
      setCustomCommitmentSubjects(prev => [...prev, val]);
    }
    if (!(reportForm.committedSubjects || []).includes(val)) {
      setReportForm(f => ({ ...f, committedSubjects: [...(f.committedSubjects || []), val] }));
    }
    setNewCustomSubjectInput("");
  };


  // ====================== RENDER ======================
  return (
    <div className="space-y-3 font-sans max-w-[1440px] mx-auto pb-16">
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      {confirm && <ConfirmDialog open={true} onClose={()=>setConfirm(null)} onConfirm={confirm.fn} message={confirm.msg}/>}

      <div className="no-print flex flex-col gap-3 w-full">
      {/* HEADER BAR REMOVED */}

      {/* ===== TAB: ASSIGNMENTS (PHÂN CÔNG) ===== */}
      {tab==="assignments" && (
        <div className={"space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 " + (isReadOnly ? "select-none" : "")}>
          {isReadOnly && (
            <div className="no-print text-amber-800 flex items-center gap-2.5 text-xs font-semibold shadow-sm mb-2 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 animate-pulse" />
              Chế độ xem (Đọc dữ liệu). Các chức năng Thêm mới, Chỉnh sửa và Xóa bị khóa đối với tài khoản này.
            </div>
          )}
          <div className="flex items-center gap-4 bg-white p-5 rounded-3xl border-2 border-teal-100 shadow-sm">
             <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 animate-pulse text-xs font-semibold">
                <UserCheck className="w-6 h-6 text-teal-700"/>
             </div>
             <div>
                <h2 className="text-lg font-black text-slate-800">Phân công Giáo viên Khảo sát</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Giao nhiệm vụ phụ trách môn thi cho giáo viên từ Tổ chuyên môn</p>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Configuration */}
            <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="h-1.5 w-full flex-shrink-0 text-xs font-semibold"/>
              <div className="p-8 space-y-8 flex-1">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-7 h-7 flex items-center justify-center text-[11px] font-black text-white shadow-lg shadow-indigo-100 text-xs font-semibold">1</div>
                    <span className="font-black text-slate-800 tracking-tight">Kỳ Khảo sát & Người phụ trách</span>
                  </div>

                  <div className="space-y-5">
                    <Field label="Kỳ khảo sát" required>
                      <select value={asPeriodId} onChange={e=>{setAsPeriodId(e.target.value); setAsBatchId("")}} className={inp} disabled={isReadOnly}>
                        <option value="">-- Chọn Kỳ --</option>
                        {visiblePeriods.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </Field>

                    <Field label="Đợt khảo sát" required>
                      <select value={asBatchId} onChange={e=>setAsBatchId(e.target.value)} className={inp} disabled={!asPeriodId || isReadOnly}>
                         <option value="">-- Chọn Đợt --</option>
                         {visiblePeriods.find(p=>p.id===asPeriodId)?.batches?.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </Field>

                    <Field label="Lọc theo Tổ chuyên môn (Không bắt buộc)">
                      <select value={asDeptId} onChange={e=>setAsDeptId(e.target.value)} className={inp} disabled={isReadOnly}>
                        <option value="">Tất cả Tổ chuyên môn</option>
                        {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </Field>

                    <Field label="Giáo viên phụ trách" required>
                      <select value={asTeacherId} onChange={e=>setAsTeacherId(e.target.value)} className={inp+" bg-slate-50/50 border-teal-200 hover:border-teal-200 focus:bg-white"} disabled={isReadOnly}>
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
              <div className="h-1.5 w-full flex-shrink-0 text-xs font-semibold"/>
              <div className="p-8 space-y-8 flex-1">
                 <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-7 h-7 flex items-center justify-center text-[11px] font-black text-white shadow-lg shadow-emerald-100 text-xs font-semibold">2</div>
                    <span className="font-black text-slate-800 tracking-tight">Phạm vi Phân công</span>
                  </div>

                  <div className="space-y-8">
                    {/* Subjects Tags */}
                    <div>
                      <div className="flex items-center justify-between mb-3 px-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><BookOpen className="w-3.5 h-3.5"/> Môn khảo sát *</label>
                        <button onClick={() => setAsSelSubjects(asSelSubjects.length === subjectsList.length ? [] : subjectsList.map(s=>s.id))} className={"text-[10px] font-black text-teal-700 hover:bg-teal-50 px-2 py-1 rounded-xl uppercase tracking-wider transition-colors " + (isReadOnly ? "pointer-events-none opacity-40 cursor-not-allowed" : "")} disabled={isReadOnly}>
                          {asSelSubjects.length === subjectsList.length ? "Bỏ chọn hết" : "Chọn tất cả"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {subjectsList.map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => setAsSelSubjects(p => p.includes(sub.id) ? p.filter(x=>x!==sub.id) : [...p, sub.id])}
                            className={`px-4 py-2.5 rounded-2xl text-xs font-bold border-2 transition-all ${asSelSubjects.includes(sub.id) ? "bg-[#003B3A] border-teal-200 text-white shadow-md shadow-indigo-100" : "bg-white border-slate-100 text-slate-500 hover:border-teal-200 hover:text-teal-700"} ${isReadOnly ? "pointer-events-none opacity-40 cursor-not-allowed" : ""}`} disabled={isReadOnly}
                          >
                            {sub.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      {/* Grades Tags */}
                      <div className="p-6 text-xs font-semibold">
                        <div className="flex items-center justify-between mb-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Layers className="w-3.5 h-3.5"/> Khối *</label>
                          <button onClick={() => setAsSelGrades(asSelGrades.length === activeGrades.length ? [] : activeGrades)} className={"text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-xl " + (isReadOnly ? "pointer-events-none opacity-40 cursor-not-allowed" : "")} disabled={isReadOnly}>Chọn hết</button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {activeGrades.map(g => (
                            <button
                              key={g}
                              onClick={() => setAsSelGrades(p => p.includes(g) ? p.filter(x=>x!==g) : [...p, g])}
                              className={`py-2 rounded-xl text-[11px] font-black border-2 transition-all ${asSelGrades.includes(g) ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" : "bg-white border-white text-slate-400 hover:border-emerald-200 hover:text-emerald-500"} ${isReadOnly ? "pointer-events-none opacity-40 cursor-not-allowed" : ""}`} disabled={isReadOnly}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* System Tags */}
                      <div className="p-6 text-xs font-semibold">
                        <div className="flex items-center justify-between mb-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5"/> Hệ học *</label>
                          <button onClick={() => setAsSelSystems(asSelSystems.length === currentEduSystems.length ? [] : currentEduSystems.map(es=>es.code))} className={"text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-xl " + (isReadOnly ? "pointer-events-none opacity-40 cursor-not-allowed" : "")} disabled={isReadOnly}>Chọn hết</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {currentEduSystems.map(es => (
                            <button
                              key={es.code}
                              onClick={() => setAsSelSystems(p => p.includes(es.code) ? p.filter(x=>x!==es.code) : [...p, es.code])}
                              className={`px-3 py-2 rounded-xl text-[11px] font-black border-2 transition-all ${asSelSystems.includes(es.code) ? "bg-amber-500 border-amber-500 text-white shadow-sm" : "bg-white border-white text-slate-400 hover:border-amber-200 hover:text-amber-500"} ${isReadOnly ? "pointer-events-none opacity-40 cursor-not-allowed" : ""}`} disabled={isReadOnly}
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
               disabled={asSubmitting || cannotCreate}
               className={"group flex items-center gap-3 px-12 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-base hover:bg-black hover:scale-105 transition-all shadow-2xl shadow-indigo-200 disabled:opacity-50 " + (cannotCreate ? "pointer-events-none opacity-40" : "")}
             >
               {asSubmitting ? <Loader2 className="w-6 h-6 animate-spin"/> : <UserPlus className="w-6 h-6 group-hover:rotate-12 transition-all"/>}
               Xác nhận Phân công cho Giáo viên
             </button>
          </div>

          {/* List of existing assignments */}
          <div className="space-y-4">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                <div className="flex items-center gap-3">
                   <h3 className="text-base font-black text-slate-800 flex items-center gap-2"><Search className="w-5 h-5 text-teal-700"/> Danh sách đã Phân công</h3>
                   {asFilterBatchId && (
                      <span className="text-teal-800 text-xs font-black text-xs font-semibold">{groupedAssignments.length} nhóm phân công</span>
                   )}
                </div>
                {asPeriodId && (
                   <div className="flex flex-wrap items-center gap-3 self-end sm:self-auto text-xs font-semibold">
                      <div className="flex items-center gap-2">
                         <Filter className="w-4 h-4 text-teal-700" />
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lọc đợt:</span>
                         <select 
                            value={asFilterBatchId} 
                            onChange={e=>setAsFilterBatchId(e.target.value)} 
                            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-teal-200 transition-all shadow-sm cursor-pointer min-w-[150px]"
                         >
                            <option value="">-- Chọn Đợt --</option>
                            {asSelPeriod?.batches?.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                         </select>
                      </div>
                      {asFilterBatchId && (
                         <button
                            onClick={sendAllNotifications}
                            disabled={asNotifyingAll || groupedAssignments.length === 0 || cannotUpdate}
                            className={"flex items-center gap-1.5 px-3 py-1.5 bg-[#003B3A] text-white rounded-xl text-xs font-black hover:bg-[#003B3A] transition-all shadow-sm disabled:opacity-50 " + (cannotUpdate ? "pointer-events-none opacity-40" : "")}
                            title="Gửi email thông báo phân công cho tất cả giáo viên trong danh sách"
                         >
                            {asNotifyingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                            Gửi email hàng loạt
                         </button>
                      )}
                   </div>
                )}
             </div>

             <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
                {!asFilterBatchId ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 flex items-center justify-center mb-4 text-xs font-semibold">
                      <Filter className="w-8 h-8 text-[#48BFE3]" />
                    </div>
                    <p className="font-black text-slate-500 text-sm">Vui lòng chọn Đợt lọc</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Chọn một Đợt ở bộ lọc phía trên để hiển thị danh sách giáo viên đã được phân công</p>
                  </div>
                ) : asLoading ? <Spin/> : assignments.length === 0 ? (
                  <Empty icon={UserPlus} text="Chưa có phân công nào" sub="Sử dụng form bên trên để tiến hành phân công GV"/>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap border-collapse">
                      <thead className="bg-[#003B3A] text-xs font-semibold text-white border-b border-[#003B3A]">
                        <tr className="text-[11px] font-semibold whitespace-nowrap">
                          <th className="p-2 text-[10px] border border-white/15 font-semibold">Giáo viên</th>
                          <th className="p-2 text-[10px] border border-white/15 font-semibold">Môn học</th>
                          <th className="p-2 text-[10px] border border-white/15 font-semibold">Khối</th>
                          <th className="p-2 text-[10px] border border-white/15 font-semibold">Hệ học</th>
                          <th className="p-2 text-[10px] text-right border border-white/15 font-semibold">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {groupedAssignments.map(a => (
                          <tr key={a.id} className="group hover:bg-slate-50/70 transition-colors text-xs font-semibold">
                            <td className="p-2 border border-slate-200">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 flex items-center justify-center text-teal-800 font-black text-xs text-xs font-semibold">
                                  {a.user?.fullName?.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-black text-slate-700">{a.user?.fullName}</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{a.batch?.name || "Tất cả đợt"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-2 p-2 border border-slate-200">
                                <div className="flex flex-wrap gap-1">
                                  {a.subjects.map((sub: string) => (
                                    <span key={sub} className="px-3 py-1 bg-white border border-teal-100 rounded-xl text-xs font-black text-teal-800 shadow-sm">{sub}</span>
                                  ))}
                                </div>
                              </td>
                            <td className="p-2 border border-slate-200">
                                <div className="flex flex-wrap gap-1">
                                  {a.grades.map((g: string) => (
                                    <span key={g} className="text-xs font-black text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{g}</span>
                                  ))}
                                </div>
                              </td>
                            <td className="p-2 border border-slate-200">
                                <div className="flex flex-wrap gap-1">
                                  {a.educationSystems.map((sys: string) => (
                                    <span key={sys} className="text-amber-700 text-[10px] font-black uppercase text-xs font-semibold">{sys}</span>
                                  ))}
                                </div>
                              </td>
                            <td className="p-2 text-right flex items-center justify-end border border-slate-200">
                               <button 
                                 onClick={() => sendTeacherNotification(a)}
                                 disabled={asNotifyingId === a.id}
                                 className={"p-2.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all mr-1 disabled:opacity-30 " + (cannotUpdate ? "pointer-events-none opacity-40" : "")} disabled={cannotUpdate}
                                 title="Gửi email thông báo phân công"
                               >
                                 {asNotifyingId === a.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Mail className="w-4 h-4"/>}
                               </button>
                               <button 
                                 onClick={() => openEditAssignment(a)}
                                 className={"p-2.5 text-slate-300 hover:text-teal-800 hover:bg-teal-50 rounded-xl transition-all mr-1 " + (cannotUpdate ? "pointer-events-none opacity-40" : "")} disabled={cannotUpdate}
                               >
                                 <Edit2 className="w-4 h-4"/>
                               </button>
                               <button 
                                 onClick={() => setConfirm({ msg: `Xóa phân công của GV ${a.user?.fullName}?`, fn: () => deleteAssignment(a.ids) })}
                                 className={"p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all " + (cannotDelete ? "pointer-events-none opacity-40" : "")} disabled={cannotDelete}
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
        <div className={"space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 " + (isReadOnly ? "select-none" : "")}>
          {isReadOnly && (
            <div className="no-print text-amber-800 flex items-center gap-2.5 text-xs font-semibold shadow-sm mb-2 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 animate-pulse" />
              Chế độ xem (Đọc dữ liệu). Các chức năng Thêm mới, Chỉnh sửa và Xóa bị khóa đối với tài khoản này.
            </div>
          )}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2"><Clock className="w-4 h-4"/> Kỳ & Đợt Khảo sát</h2>
            <div className="flex gap-2">
              <button onClick={fetchPeriods} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"><RefreshCw className="w-4 h-4"/></button>
              <button onClick={e => { if (cannotCreate) return; openAddPeriod(); }} disabled={cannotCreate} className={"flex items-center gap-2 px-5 py-2.5 bg-[#003B3A] text-white text-[13px] font-black rounded-xl hover:bg-[#003B3A] transition-all shadow-xl shadow-indigo-100 " + (cannotCreate ? "pointer-events-none opacity-40 cursor-not-allowed" : "")}>
                <Plus className="w-4 h-4"/> Tạo Kỳ mới
              </button>
            </div>
          </div>

          {pLoading ? <Spin/> : periods.length === 0 ? <Empty icon={Calendar} text="Chưa có Kỳ khảo sát nào" sub="Bấm Tạo Kỳ mới để bắt đầu" /> : (
            <div className="space-y-3">
              {visiblePeriods.map(p => (
                <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group/p hover:border-teal-200 transition-all">
                  <div className="px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer" onClick={()=>setExpandedId(expandedId===p.id?null:p.id)}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 group-hover/p:bg-[#003B3A] group-hover/p:text-white transition-all text-xs font-semibold">
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
                          <span className="text-teal-700">{p.batches?.length||0} đợt ghi nhận</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 ">
                      <button onClick={e=>{e.stopPropagation(); if (cannotCreate) return; openAddBatch(p.id)}} className={"flex items-center gap-1.5 px-4 py-2 text-[11px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-xl transition-all border border-emerald-100 " + (cannotCreate ? "pointer-events-none opacity-40" : "")}>
                        <Plus className="w-3.5 h-3.5"/> Thêm Đợt
                      </button>
                      <button onClick={e=>{e.stopPropagation(); if (cannotUpdate) return; openEditPeriod(p)}} className={"p-2 text-slate-400 hover:text-teal-800 hover:bg-teal-50 rounded-xl transition-all " + (cannotUpdate ? "pointer-events-none opacity-40" : "")}><Edit2 className="w-4 h-4"/></button>
                      <button onClick={e=>{e.stopPropagation(); setConfirm({msg:`Xóa kỳ "${p.name}"?`,fn:()=>doDeletePeriod(p.id)})}} className={"p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all " + (cannotDelete ? "pointer-events-none opacity-40" : "")}><Trash2 className="w-4 h-4"/></button>
                      <span className="text-slate-300 ml-2">{expandedId===p.id?<ChevronUp className="w-5 h-5"/>:<ChevronDown className="w-5 h-5"/>}</span>
                    </div>
                  </div>
                  {expandedId===p.id && (
                    <div className="p-6 text-xs font-semibold">
                       {(!p.batches || p.batches.length === 0) ? (
                         <div className="text-center py-8 text-slate-400 font-bold text-xs uppercase tracking-wider bg-white rounded-2xl border-2 border-dashed border-slate-200">Chưa có Đợt khảo sát nào ghi nhận</div>
                       ) : (
                         <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-sm">
                           <table className="w-full text-left border-collapse">
                             <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                               <tr className="text-xs font-semibold">
                                 <th className="p-2 text-[10px] pl-6 border border-white/15 font-semibold">Mã Đợt</th>
                                 <th className="p-2 text-[10px] border border-white/15 font-semibold">Nội dung khảo sát</th>
                                 <th className="p-2 text-[10px] border border-white/15 font-semibold">Cơ sở</th>
                                 <th className="p-2 text-[10px] border border-white/15 font-semibold">Thời gian</th>
                                 <th className="p-2 text-[10px] border border-white/15 font-semibold">Trạng thái</th>
                                 <th className="p-2 text-[10px] border border-white/15 font-semibold">Người phụ trách</th>
                                 <th className="p-2 text-[10px] text-right pr-6 border border-white/15 font-semibold">Thao tác</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-[#E2E8F0]">
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
                                   <tr key={b.id} className="group hover:bg-slate-50/50 transition-colors text-xs font-semibold">
                                     <td className="p-2 pl-6 border border-slate-200">
                                       <span className="inline-flex items-center justify-center w-8 h-8 font-black text-teal-800 text-xs text-xs font-semibold">
                                         #{b.batchNumber}
                                       </span>
                                     </td>
                                     <td className="p-2 border border-slate-200">
                                       <p className="text-sm font-black text-slate-700">{baseName}</p>
                                       <p className="text-[10px] font-bold text-slate-400 truncate max-w-xs">{b.name}</p>
                                     </td>
                                     <td className="p-2 border border-slate-200">
                                       <span className="text-[11px] font-black text-slate-600 text-xs font-semibold">
                                         {campusName}
                                       </span>
                                     </td>
                                     <td className="p-2 border border-slate-200">
                                       <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                         <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                         <span>{b.startDate?.slice(0, 10).split('-').reverse().join('/')}</span>
                                         <span className="text-slate-300">→</span>
                                         <span>{b.endDate?.slice(0, 10).split('-').reverse().join('/')}</span>
                                       </div>
                                     </td>
                                     <td className="p-2 border border-slate-200">
                                       <div className="flex items-center gap-2">
                                       <button
                                         onClick={async () => {
                                           const newStatus = b.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
                                           try {
                                             const res = await fetch(b.isPreschool || false ? "/api/preschool-input-assessments" : "/api/input-assessments", {
                                               method: "PUT",
                                               headers: { "Content-Type": "application/json" },
                                               body: JSON.stringify({ action: "UPDATE_BATCH", id: b.id, data: { status: newStatus } })
                                             });
                                             if (res.ok) { fetchPeriods(); }
                                             else { const d = await res.json(); alert(d.error || "Lỗi cập nhật"); }
                                           } catch(e) { alert("Lỗi mạng"); }
                                         }}
                                         className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                                           b.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-300"
                                         }`}
                                         title={b.status === "ACTIVE" ? "Đang mở (Click để Khóa)" : "Đã khóa (Click để Mở)"}
                                       >
                                         <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                           b.status === "ACTIVE" ? "translate-x-4" : "translate-x-0"
                                         }`} />
                                       </button>
                                       <span className={`text-[10px] font-black uppercase tracking-widest ${b.status === "ACTIVE" ? "text-emerald-600" : "text-slate-500"}`}>
                                         {b.status === "ACTIVE" ? "ON" : "OFF"}
                                       </span>
                                     </div>
                                     </td>
                                                                           <td className="p-2 border border-slate-200">
                                        <div className="flex items-center justify-between gap-2 group/assignee">
                                          <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 flex items-center justify-center text-[10px] font-black text-emerald-600 text-xs font-semibold">
                                              {assigneeName.charAt(0)}
                                            </div>
                                            <span className="text-xs font-bold text-slate-600">{assigneeName}</span>
                                          </div>
                                          {b.assignedUserId && (
                                            <button
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                setSendingEmailBatchId(b.id);
                                                try {
                                                  const res = await fetch("/api/input-assessments", {
                                                    method: "PUT",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ action: "SEND_ASSIGNMENT_EMAIL", id: b.id })
                                                  });
                                                  if (res.ok) {
                                                    notify("Đã gửi email thông báo thành công");
                                                  } else {
                                                    const d = await res.json();
                                                    notify(d.error || "Lỗi gửi email", "err");
                                                  }
                                                } catch(e) {
                                                  notify("Lỗi kết nối", "err");
                                                } finally {
                                                  setSendingEmailBatchId(null);
                                                }
                                              }}
                                              className="p-1 text-slate-400 hover:text-teal-800 hover:bg-teal-50 transition-all ml-2 text-xs font-semibold"
                                              disabled={sendingEmailBatchId === b.id}
                                              title="Gửi email thông báo cho người phụ trách"
                                            >
                                              {sendingEmailBatchId === b.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                              ) : (
                                                <Mail className="w-3.5 h-3.5" />
                                              )}
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                     <td className="p-2 text-right pr-6 border border-slate-200">
                                       <div className="flex items-center justify-end gap-1">
                                         <button onClick={() => openEditBatch(b)} className={"p-2 text-slate-400 hover:text-teal-800 hover:bg-teal-50 rounded-xl transition-all " + (cannotUpdate ? "pointer-events-none opacity-40" : "")} disabled={cannotUpdate} title="Chỉnh sửa">
                                           <Edit2 className="w-3.5 h-3.5" />
                                         </button>
                                         <button onClick={() => setConfirm({ msg: `Xóa đợt "` + b.name + `"?`, fn: () => doDeleteBatch(b.id) })} className={"p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all " + (cannotDelete ? "pointer-events-none opacity-40" : "")} disabled={cannotDelete} title="Xóa">
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

      {/* ===== TAB: STUDENTS (SAAS REDESIGNED) ===== */}
      {tab==="students" && (
        <div className={"space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 " + (isReadOnly ? "select-none" : "")}>
          {latestBatchInfo && (
            <div className="no-print relative overflow-hidden p-4 rounded-2xl shadow-md animate-in fade-in slide-in-from-top-4 duration-500 mb-6 bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-100/60 border border-amber-200/80 ring-1 ring-amber-900/5 group hover:shadow-lg transition-all">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none transition-transform duration-700 group-hover:scale-110"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-500/15 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
            
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-amber-200/70 flex items-center justify-center shrink-0 group-hover:rotate-6 transition-transform duration-300">
                  <AlertCircle className="w-6 h-6 text-amber-600 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-slate-700 leading-relaxed flex flex-wrap items-center gap-y-1.5 gap-x-1.5">
                    <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-700 to-amber-600 uppercase tracking-widest text-xs py-0.5 px-2.5 rounded-lg bg-white/90 border border-amber-200/60 shadow-sm flex items-center gap-1.5">
                      Thông báo
                    </span>
                    <span className="opacity-90">Đợt khảo sát mới nhất:</span> 
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-600 to-amber-600 text-white font-bold shadow-sm text-xs tracking-wide">
                      {latestBatchInfo.name}
                    </span> 
                    <span className="opacity-90">thuộc Kỳ</span> 
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white text-slate-700 font-bold border border-amber-200/80 shadow-2xs text-xs">
                      {latestBatchInfo.periodName}
                    </span>
                  </div>
                  <p className="text-xs text-amber-800/80 font-medium mt-1">
                    Vui lòng rà soát điểm số các môn và hoàn tất phê duyệt kết quả tuyển sinh.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={() => {
                    setReportPeriodId(latestBatchInfo.periodId);
                    setReportBatchId(latestBatchInfo.id);
                    setReportApprovalStatusFilter("Chưa duyệt");
                    setReportsSubTab("results");
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-600 hover:from-amber-700 hover:to-amber-600 text-white text-xs font-black rounded-xl shadow-md shadow-amber-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Xem & Xét duyệt đợt này</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            </div>
          )}
          {isReadOnly && (
            <div className="no-print text-amber-800 flex items-center gap-2.5 text-xs font-semibold shadow-sm mb-2 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 animate-pulse" />
              Chế độ xem (Đọc dữ liệu). Các chức năng Thêm mới, Chỉnh sửa và Xóa bị khóa đối với tài khoản này.
            </div>
          )}
          
          {/* Header & Stats */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Quản lý Hồ sơ Học sinh</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Tìm kiếm, lọc và cập nhật thông tin học sinh tham gia khảo sát năng lực.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                Tổng cộng: <span className="text-[#48BFE3] ml-1">{filtStu.length}</span> HS
              </span>
              <button onClick={handleDownloadTemplate} disabled={!sPeriodId || sPeriodId === "all"} className="h-10 text-slate-600 flex items-center justify-center hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all disabled:opacity-50 text-sm font-semibold group text-xs font-semibold" title={sPeriodId === "all" ? "Vui lòng chọn một kỳ cụ thể" : ""}>
                 <Download className="w-4 h-4 sm:mr-2 group-hover:-translate-y-0.5 transition-transform"/>
                 <span className="hidden sm:inline">Tải mẫu</span>
              </button>
              <button onClick={()=>fileRef.current?.click()} disabled={!sPeriodId || sPeriodId === "all" || importing || cannotCreate} className={"h-10 px-4 bg-white text-slate-600 border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-200 shadow-sm transition-all disabled:opacity-50 text-sm font-semibold group " + (cannotCreate ? "pointer-events-none opacity-40" : "")} title={sPeriodId === "all" ? "Vui lòng chọn một kỳ cụ thể" : ""}>
                 <Upload className="w-4 h-4 sm:mr-2 group-hover:-translate-y-0.5 transition-transform"/>
                 <span className="hidden sm:inline">Nhập Excel</span>
              </button>
                            <button 
                onClick={() => {
                  if (sPeriodId && sPeriodId !== "all") {
                    openAddBatch(sPeriodId);
                  }
                }} 
                disabled={!sPeriodId || sPeriodId === "all" || cannotCreate} 
                className={"h-10 px-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl flex items-center justify-center hover:bg-emerald-100 hover:text-emerald-800 shadow-sm transition-all disabled:opacity-50 text-sm font-semibold group " + (cannotCreate ? "pointer-events-none opacity-40" : "")} 
                title={sPeriodId === "all" ? "Vui lòng chọn một kỳ cụ thể" : ""}
              >
                <Plus className="w-4 h-4 mr-2"/> Tạo đợt
              </button>
<button onClick={openAddStudent} disabled={!sPeriodId || sPeriodId === "all" || cannotCreate} className={"h-10 px-5 bg-[#48BFE3] text-white text-sm font-bold rounded-xl hover:bg-[#009085] disabled:opacity-50 transition-all shadow-md shadow-[#48BFE3]/20 flex items-center justify-center " + (cannotCreate ? "pointer-events-none opacity-40" : "")} title={sPeriodId === "all" ? "Vui lòng chọn một kỳ cụ thể" : ""}>
                <Plus className="w-4 h-4 mr-2"/> Thêm mới
              </button>
              <input type="file" ref={fileRef} accept=".xlsx" className="hidden" onChange={handleImport}/>
            </div>
          </div>

          {/* Filter Card */}
          <div className="bg-white border border-slate-200/60 rounded-[1.5rem] p-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Kỳ khảo sát *</label>
                <select value={sPeriodId} onChange={e=>{setSPeriodId(e.target.value); setSBatchId("")}} className={inp + " bg-slate-50/50 hover:bg-white focus:bg-white transition-colors"}>
                   <option value="">-- Chọn Kỳ --</option>
                   <option value="all">-- Tất cả các kỳ --</option>
                   {visiblePeriods.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Đợt khảo sát</label>
                <select value={sBatchId} onChange={e=>setSBatchId(e.target.value)} className={inp + " bg-slate-50/50 hover:bg-white focus:bg-white transition-colors"} disabled={!sPeriodId}>
                   <option value="">-- Tất cả đợt --</option>
                   {((sPeriodId && sPeriodId !== "all" ? selPeriod?.batches : visiblePeriods.flatMap(p => p.batches || [])) || []).map((b: any)=><option key={b.id} value={b.id}>{b.name} ({visiblePeriods.find(p => p.id === b.periodId)?.name || ""})</option>)}
                </select>
              </div>
              <div className="md:col-span-4">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Tìm kiếm</label>
                <div className="relative">
                   <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                   <input value={sSearch} onChange={e=>setSSearch(e.target.value)} placeholder="Tên hoặc mã HS..." className={inp+" pl-10 bg-slate-50/50 hover:bg-white focus:bg-white transition-colors"}/>
                </div>
              </div>
              <div className="md:col-span-2 flex items-end">
                <button onClick={fetchStudents} disabled={!sPeriodId} className="w-full h-[42px] bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-black disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  <Search className="w-4 h-4"/> Lọc dữ liệu
                </button>
              </div>
            </div>
          </div>

          {/* Data Table Area */}
          <div className="bg-white border border-slate-200/80 rounded-[1.5rem] shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            {sLoading ? (
              <div className="flex-1 flex items-center justify-center py-20"><Spin/></div>
            ) : filtStu.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-500">
                <div className="w-16 h-16 flex items-center justify-center mb-4 text-xs font-semibold">
                  <Users className="w-8 h-8 text-slate-300"/>
                </div>
                <p className="font-bold text-slate-700">Không tìm thấy dữ liệu</p>
                <p className="text-sm mt-1">Hãy chọn Kỳ khảo sát và bấm 'Lọc dữ liệu'</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto custom-scrollbar flex-1">
                  <table className="w-full text-left whitespace-nowrap border-collapse">
                    <thead className="bg-[#003B3A] border-b sticky top-0 z-10 text-white border-[#003B3A]">
                       <tr className="text-[11px] font-semibold whitespace-nowrap">
                          <th className="p-2 text-[10px] border border-white/15 font-semibold">Mã HS KS</th>
                          <th className="p-2 text-[10px] border border-white/15 font-semibold">Họ và Tên</th>
                          <th className="p-2 text-[10px] text-center border border-white/15 font-semibold">Khối</th>
                          <th className="p-2 text-[10px] text-center border border-white/15 font-semibold">Giới tính</th>
                          <th className="p-2 text-[10px] text-center border border-white/15 font-semibold">Ngày sinh</th>
                          <th className="p-2 text-[10px] text-center border border-white/15 font-semibold">Hệ Khảo sát</th>
                           <th className="p-2 text-[10px] text-center border border-white/15 font-semibold">Kết quả Học tập</th>
                           <th className="p-2 text-[10px] text-center border border-white/15 font-semibold">Kết quả Rèn luyện</th>
                          <th className="p-2 text-[10px] text-center border border-white/15 font-semibold">Hồ sơ / Bảng điểm</th>
                          <th className="p-2 text-[10px] text-center border border-white/15 font-semibold">Học kỳ / Năm TS</th>
                          <th className="p-2 text-[10px] text-center border border-white/15 font-semibold">Đối tượng TS</th>
                           {selPeriod?.name?.toLowerCase().includes("open day") && (
                             <>
                               <th className="p-2 text-[10px] text-center border border-white/15 font-semibold">Đăng ký CS</th>
                               <th className="p-2 text-[10px] text-center border border-white/15 font-semibold">Ủy quyền xét duyệt</th>
                             </>
                           )}
                          <th className="p-2 text-[10px] text-center border border-white/15 font-semibold">Thao tác</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {filtStu.map((s, idx) => (
                        <tr key={s.id} className={`group hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                           <td className="p-2 border border-slate-300 font-mono text-xs text-slate-700">{s.studentCode}</td>
                           <td className="p-2 border border-slate-300">
                             <div className="flex flex-col">
                               <span className="text-sm font-bold text-slate-800">{s.fullName}</span>
                               <span className="text-[10px] font-semibold text-slate-400 mt-0.5">{s.surveySystem || "Chưa xếp hệ"}</span>
                             </div>
                           </td>
                           <td className="p-2 text-center text-xs font-bold text-slate-500 border border-slate-300">{s.grade}</td>
                           <td className="p-2 text-center text-xs font-bold text-slate-500 border border-slate-300">{s.gender || "-"}</td>
                           <td className="p-2 text-center border border-slate-300"><span className="text-xs font-semibold text-slate-600">{s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('vi-VN') : "-"}</span></td>
                           <td className="p-2 text-center border border-slate-300">
                             <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-teal-800 text-xs font-semibold">
                               {s.surveyFormType || "-"}
                             </span>
                           </td>
                           <td className="p-2 text-center text-xs text-slate-600 border border-slate-300">{s.kqHocTap || "-"}</td>
                           <td className="p-2 text-center text-xs text-slate-600 border border-slate-300">{s.kqRenLuyen || "-"}</td>
                           <td className="p-2 text-center text-xs text-slate-600 border border-slate-300">{s.hoSoCtQuocTe || "-"}</td>
                           <td className="p-2 text-center text-xs text-slate-600 border border-slate-300">{s.hocKy || "-"}</td>
                           <td className="p-2 text-center text-xs text-slate-600 border border-slate-300">{s.targetType || "-"}</td>
                           {selPeriod?.name?.toLowerCase().includes("open day") && (
                             <>
                               <td className="p-2 text-center text-xs text-slate-650 border border-slate-300">
                                 {campuses.find(c => c.id === s.registeredCampus)?.campusName || s.registeredCampus || "-"}
                               </td>
                               <td className="p-2 text-center text-xs text-slate-650 font-bold border border-slate-300">
                                 {campuses.find(c => c.id === s.registeredCampus)?.manager?.fullName || "-"}
                               </td>
                             </>
                           )}
                           
                           <td className="p-2 text-center border border-slate-300 sticky right-0 group-hover:bg-slate-50 transition-colors shadow-[-10px_0_15px_-10px_rgba(0,0,0,0.05)] text-xs font-semibold">
                              <div className="flex items-center justify-center gap-1.5">
                                 <button onClick={()=>openEditStudent(s)} className={"p-1.5 text-slate-400 hover:text-[#48BFE3] hover:bg-[#48BFE3]/10 rounded-xl transition-all " + (cannotUpdate ? "pointer-events-none opacity-40" : "")} disabled={cannotUpdate} title="Sửa hồ sơ"><Edit2 className="w-4 h-4"/></button>
                                 <button onClick={()=>setConfirm({msg:`Xóa hồ sơ học sinh ${s.fullName}?`,fn:()=>doDeleteStudent(s.id)})} className={"p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all " + (cannotDelete ? "pointer-events-none opacity-40" : "")} disabled={cannotDelete} title="Xóa hồ sơ"><Trash2 className="w-4 h-4"/></button>
                              </div>
                           </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List View */}
                <div className="md:hidden flex flex-col p-4 gap-4 text-xs font-semibold">
                  {filtStu.map(s => (
                    <div key={s.id} className="bg-white p-4 rounded-2xl border-2 border-blue-100 shadow-sm relative">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-black text-[#48BFE3] mb-1">{s.studentCode}</span>
                          <span className="text-sm font-bold text-slate-800">{s.fullName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                           <button onClick={()=>openEditStudent(s)} className={"p-2 text-slate-400 hover:text-[#48BFE3] bg-slate-50 rounded-xl " + (cannotUpdate ? "pointer-events-none opacity-40" : "")} disabled={cannotUpdate}><Edit2 className="w-4 h-4"/></button>
                           <button onClick={()=>setConfirm({msg:`Xóa hồ sơ học sinh ${s.fullName}?`,fn:()=>doDeleteStudent(s.id)})} className={"p-2 text-slate-400 hover:text-rose-600 bg-slate-50 rounded-xl " + (cannotDelete ? "pointer-events-none opacity-40" : "")} disabled={cannotDelete}><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs border-t border-slate-100 pt-3 mt-2">
                        <div>
                          <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-bold">Giới tính</span>
                          <span className="font-semibold text-slate-700">{s.gender || "-"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-bold">Khối</span>
                          <span className="font-semibold text-slate-700">{s.grade}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-bold">Ngày sinh</span>
                          <span className="font-semibold text-slate-700">{s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('vi-VN') : "-"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-bold">Hệ KS</span>
                          <span className="font-semibold text-[#48BFE3]">{s.surveyFormType || "-"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Pagination (Visual only for now) */}
                <div className="p-4 flex items-center justify-between text-xs font-medium text-slate-500 text-xs font-semibold">
                  <span>Hiển thị <span className="font-bold text-slate-700">{filtStu.length}</span> kết quả</span>
                  {/* Future real pagination can go here */}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== TAB: CATEGORIES (RESTORED) ===== */}
      {tab==="categories" && (
        <div className={"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 " + (isReadOnly ? "select-none" : "")}>
          {isReadOnly && (
            <div className="no-print text-amber-800 flex items-center gap-2.5 text-xs font-semibold shadow-sm mb-2 col-span-full text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 animate-pulse" />
              Chế độ xem (Đọc dữ liệu). Các chức năng Thêm mới, Chỉnh sửa và Xóa bị khóa đối với tài khoản này.
            </div>
          )}
           {CATEGORY_TYPES.map(type => (
             <div key={type.code} className="bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col overflow-hidden">
                <div className={`h-1.5 bg-gradient-to-r ${type.color}`}/>
                <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                   <div>
                      <h4 className="text-sm font-black text-slate-800 tracking-tight">{type.label}</h4>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{type.code}</span>
                   </div>
                   <button onClick={()=>openAddConfig(type.code)} className={"w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-[#003B3A] hover:text-white transition-all shadow-sm border border-slate-100 " + (cannotCreate ? "pointer-events-none opacity-40" : "")} disabled={cannotCreate}><Plus className="w-4 h-4"/></button>
                </div>
                <div className="p-4 flex-1 space-y-1.5">
                   {configs.filter(c => c.categoryType === type.code).map(c => (
                     <div key={c.id} className="group flex items-center justify-between p-3 hover:bg-slate-50 transition-all hover:border-slate-100 text-xs font-semibold">
                        <span className="text-xs font-black text-slate-600 truncate">{c.name}</span>
                        <div className="flex items-center gap-0.5 ">
                           <button onClick={()=>openEditConfig(c)} className={"p-1.5 text-slate-300 hover:text-teal-800 " + (cannotUpdate ? "pointer-events-none opacity-40" : "")} disabled={cannotUpdate}><Edit2 className="w-3 h-3"/></button>
                           <button onClick={()=>setConfirm({msg:`Xóa "${c.name}"?`,fn:()=>doDeleteConfig(c.id)})} className={"p-1.5 text-slate-300 hover:text-rose-600 " + (cannotDelete ? "pointer-events-none opacity-40" : "")} disabled={cannotDelete}><Trash2 className="w-3 h-3"/></button>
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
        <div className={"space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 " + (isReadOnly ? "select-none" : "")}>
          {isReadOnly && (
            <div className="no-print text-amber-800 flex items-center gap-2.5 text-xs font-semibold shadow-sm mb-2 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 animate-pulse" />
              Chế độ xem (Đọc dữ liệu). Các chức năng Thêm mới, Chỉnh sửa và Xóa bị khóa đối với tài khoản này.
            </div>
          )}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2"><BookOpen className="w-4 h-4"/> Danh sách Môn Khảo sát</h2>
            <button
              onClick={() => { setEditingSubjectId(null); setSubjectForm({ code:"", name:"", subjectType:"", scoreColumns:1, commentColumns:1, status:"ACTIVE", exemptCriteria:[] as string[] }); setIsSubjectOpen(true) }}
              className={"flex items-center gap-2 px-5 py-2.5 bg-[#48BFE3] text-white text-[13px] font-bold rounded-xl hover:bg-[#009085] transition-all shadow-md shadow-[#48BFE3]/20 " + (cannotCreate ? "pointer-events-none opacity-40" : "")} disabled={cannotCreate}
            >
              <Plus className="w-4 h-4"/> Thêm Môn mới
            </button>
          </div>

          {subjectsList.length === 0 ? (
            <Empty icon={BookOpen} text="Chưa có Môn khảo sát nào" sub="Bấm Thêm mới để bắt đầu"/>
          ) : (
            <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap border-collapse">
                  <thead className="bg-[#003B3A] text-xs font-semibold text-white border-b border-[#003B3A]">
                    <tr className="text-[11px] font-semibold whitespace-nowrap">
                      <th className="p-2 text-[10px] border border-white/15 font-semibold">Mã Môn</th>
                      <th className="p-2 text-[10px] border border-white/15 font-semibold">Tên Môn</th>
                      
                      <th className="p-2 text-[10px] text-center border border-white/15 font-semibold">Cột Điểm</th>
                      <th className="p-2 text-[10px] text-center border border-white/15 font-semibold">Cột NX</th>
                      <th className="p-2 text-[10px] text-center border border-white/15 font-semibold">Trạng thái</th>
                      <th className="p-2 text-[10px] text-center border border-white/15 font-semibold">Miễn giảm</th>
                      <th className="p-2 text-[10px] text-right border border-white/15 font-semibold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {subjectsList.map((sub) => {
                      let parsedCols = { scores: [], comments: [], showScoreInReport: [], showCommentInReport: [] };
                      try { if (sub.columnNames) parsedCols = JSON.parse(sub.columnNames); } catch {}
                      return (
                        <tr key={sub.id} className="group hover:bg-slate-50/70 transition-colors text-xs font-semibold">
                          <td className="p-2 border border-slate-200"><span className="font-mono text-xs font-black text-teal-800 text-xs font-semibold">{sub.code}</span></td>
                          <td className="p-2 border border-slate-200"><span className="text-sm font-black text-slate-700">{sub.name}</span></td>
                          
                          <td className="p-2 text-center border border-slate-200"><span className="w-7 h-7 text-teal-800 font-black text-xs inline-flex items-center justify-center text-xs font-semibold">{sub.scoreColumns ?? 0}</span></td>
                          <td className="p-2 text-center border border-slate-200"><span className="w-7 h-7 text-emerald-700 font-black text-xs inline-flex items-center justify-center text-xs font-semibold">{sub.commentColumns ?? 0}</span></td>
                          <td className="p-2 text-center border border-slate-200"><Badge s={sub.status || "ACTIVE"}/></td>
                          <td className="p-2 text-center border border-slate-200">
                            {(() => { try { const arr = JSON.parse(sub.exemptCriteria || "[]"); return (Array.isArray(arr) && arr.length > 0) ? <div className="flex flex-wrap gap-1 justify-center">{arr.map((c: string) => <span key={c} className="text-[10px] font-bold text-teal-800 text-xs font-semibold">{c}</span>)}</div> : <span className="text-slate-300 text-xs">—</span>; } catch { return <span className="text-slate-300 text-xs">—</span>; } })()}
                          </td>
                          <td className="p-2 text-right border border-slate-200">
                            <div className="flex items-center justify-end gap-1">
                              <button title="Cấu hình tên cột" onClick={() => { setColumnConfigForm({ subjectId: sub.id, name: sub.name, scoreColumns: sub.scoreColumns ?? 1, commentColumns: sub.commentColumns ?? 1, scoreNames: parsedCols.scores || [], commentNames: parsedCols.comments || [], showScoreInReport: parsedCols.showScoreInReport || [], showCommentInReport: parsedCols.showCommentInReport || [] }); setIsColumnConfigOpen(true); }} className={"p-2.5 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all " + (cannotUpdate ? "pointer-events-none opacity-40" : "")} disabled={cannotUpdate}><PenLine className="w-4 h-4"/></button>
                              <button onClick={() => { setEditingSubjectId(sub.id); setSubjectForm({ code: sub.code, name: sub.name, subjectType: sub.subjectType || "", scoreColumns: sub.scoreColumns ?? 1, commentColumns: sub.commentColumns ?? 1, status: sub.status || "ACTIVE", exemptCriteria: (() => { try { return JSON.parse(sub.exemptCriteria || "[]"); } catch { return []; } })() }); setIsSubjectOpen(true); }} className={"p-2.5 text-slate-300 hover:text-teal-800 hover:bg-teal-50 rounded-xl transition-all " + (cannotUpdate ? "pointer-events-none opacity-40" : "")} disabled={cannotUpdate}><Edit2 className="w-4 h-4"/></button>
                              <button onClick={() => setConfirm({ msg: `Xóa môn ${sub.name}?`, fn: () => deleteSubject(sub.id) })} className={"p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all " + (cannotDelete ? "pointer-events-none opacity-40" : "")} disabled={cannotDelete}><Trash2 className="w-4 h-4"/></button>
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
        <div className={"space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 " + (isReadOnly ? "select-none" : "")}>
          {isReadOnly && (
            <div className="no-print text-amber-800 flex items-center gap-2.5 text-xs font-semibold shadow-sm mb-2 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 animate-pulse" />
              Chế độ xem (Đọc dữ liệu). Các chức năng Thêm mới, Chỉnh sửa và Xóa bị khóa đối với tài khoản này.
            </div>
          )}
          {/* TOP PANEL: Form ThemMoi / Sua */}
          {!isReadOnly && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-5 border-b border-slate-200 pb-4">
              <div className="bg-[#48BFE3]/10 p-2 rounded-xl text-[#48BFE3]"><Settings className="w-5 h-5"/></div>
              <div>
                <h3 className="font-black text-slate-800 text-lg">{editingMappingSubjectId ? "Chỉnh sửa Cấu hình Môn" : "Gán Môn Khảo Sát"}</h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">{editingMappingSubjectId ? "Đang chỉnh sửa - thay đổi Khối/Hệ rồi bấm Cập Nhật" : "Chọn Khối, Hệ học và các Môn để cấu hình đồng loạt"}</p>
                {editingMappingSubjectId && <button onClick={() => { setEditingMappingSubjectId(null); setSelGrades([]); setSelEdus([]); setAssignSelSubjects([]); }} className="text-xs text-red-500 hover:underline font-bold mt-1">✕ Hủy chỉnh sửa</button>}
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left: Grade & Edu */}
              <div className="lg:col-span-5 space-y-6 p-5 text-xs font-semibold">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="block font-black text-slate-850 text-xs uppercase tracking-wider">Khối:</span>
                    <button onClick={() => setSelGrades(selGrades.length === activeGrades.length ? [] : [...activeGrades])} className={"text-[10px] font-black uppercase tracking-wider text-[#48BFE3] bg-[#48BFE3]/10 hover:bg-[#48BFE3]/20 px-2.5 py-1 rounded-md transition-colors border border-[#48BFE3]/20 " + (isReadOnly ? "pointer-events-none opacity-40" : "")} disabled={isReadOnly}>Chọn tất cả</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeGrades.map((g: string) => (
                      <button key={g} onClick={() => toggleGrade(g)} className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all border ${selGrades.includes(g) ? 'bg-[#48BFE3] text-white border-[#48BFE3] shadow-sm' : 'bg-white text-slate-800 border-slate-300 hover:border-[#48BFE3] hover:bg-slate-100/50'} ${isReadOnly ? "pointer-events-none opacity-40" : ""}`} disabled={isReadOnly}>
                        {selGrades.includes(g) && <Check className="w-3 h-3 inline mr-1"/>} {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="block font-black text-slate-850 text-xs uppercase tracking-wider">Hệ học:</span>
                    <button onClick={() => setSelEdus(selEdus.length === currentEduSystems.length ? [] : currentEduSystems.map((e: any) => e.code))} className={"text-[10px] font-black uppercase tracking-wider text-[#48BFE3] bg-[#48BFE3]/10 hover:bg-[#48BFE3]/20 px-2.5 py-1 rounded-md transition-colors border border-[#48BFE3]/20 " + (isReadOnly ? "pointer-events-none opacity-40" : "")} disabled={isReadOnly}>Chọn tất cả</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentEduSystems.map((es: any) => (
                      <button key={es.code} onClick={() => toggleEdu(es.code)} className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all border ${selEdus.includes(es.code) ? 'bg-[#48BFE3] text-white border-[#48BFE3] shadow-sm' : 'bg-white text-slate-800 border-slate-300 hover:border-[#48BFE3] hover:bg-slate-100/50'} ${isReadOnly ? "pointer-events-none opacity-40" : ""}`} disabled={isReadOnly}>
                        {selEdus.includes(es.code) && <Check className="w-3 h-3 inline mr-1"/>} {es.code}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Subjects to Assign */}
              <div className="lg:col-span-7 p-5 flex flex-col text-xs font-semibold">
                <div className="flex items-center justify-between mb-3">
                  <span className="block font-black text-slate-855 text-xs uppercase tracking-wider">Chọn Môn Khảo Sát:</span>
                  <button onClick={() => setAssignSelSubjects(assignSelSubjects.length === subjectsList.length ? [] : subjectsList.map((s:any)=>s.id))} className={"text-[10px] font-black uppercase tracking-wider text-[#48BFE3] bg-[#48BFE3]/10 hover:bg-[#48BFE3]/20 px-2.5 py-1 rounded-md transition-colors border border-[#48BFE3]/20 " + (isReadOnly ? "pointer-events-none opacity-40" : "")} disabled={isReadOnly}>Chọn tất cả</button>
                </div>
                <div className="flex flex-wrap gap-2 mb-4 max-h-[150px] overflow-y-auto pr-1">
                  {subjectsList.map((s:any) => (
                    <button key={s.id} onClick={() => setAssignSelSubjects(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])} className={`text-xs px-3 py-2 rounded-xl font-bold transition-all border ${assignSelSubjects.includes(s.id) ? 'bg-[#48BFE3] text-white border-[#48BFE3] shadow-sm' : 'bg-white text-slate-800 border-slate-300 hover:border-[#48BFE3] hover:bg-slate-100/50'} ${isReadOnly ? "pointer-events-none opacity-40" : ""}`} disabled={isReadOnly}>
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
                    disabled={mappingLoading || (!selGrades.length || !selEdus.length || !assignSelSubjects.length) || cannotCreate || cannotUpdate}
                    className={"w-full py-3.5 bg-[#48BFE3] text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-[#1E8B87] transition-colors disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2 " + ((cannotCreate || cannotUpdate) ? "pointer-events-none opacity-40" : "")}
                  >
                    {mappingLoading ? <FileSpreadsheet className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
                    {editingMappingSubjectId ? "Cập Nhật Cấu Hình" : "Lưu Cấu Hình"}
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* BOTTOM PANEL: Table of existing configurations */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex justify-between items-center text-xs font-semibold">
              <h4 className="font-black text-slate-800 flex items-center gap-2"><Layers className="w-4 h-4 text-[#48BFE3]"/> Danh sách Cấu hình đã lưu</h4>
              <button onClick={fetchAllMappings} className="text-xs text-[#48BFE3] hover:underline font-bold">Làm mới</button>
            </div>
            
            {allMappingsLoading ? (
              <div className="p-8 text-center text-slate-450 font-semibold">Đang tải danh sách...</div>
            ) : allMappings.length === 0 ? (
              <div className="p-12 text-center text-slate-455 font-semibold">Chưa có cấu hình môn khảo sát nào.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-[#003B3A] text-xs font-semibold text-white border-b border-[#003B3A]">
                    <tr className="text-[11px] font-semibold whitespace-nowrap">
                      <th className="p-2 text-xs w-16 border border-white/15 font-semibold">STT</th>
                      <th className="p-2 text-xs border border-white/15 font-semibold">Môn Khảo Sát</th>
                      <th className="p-2 text-xs border border-white/15 font-semibold">Khối Áp Dụng</th>
                      <th className="p-2 text-xs border border-white/15 font-semibold">Hệ Áp Dụng</th>
                      <th className="p-2 text-xs text-center w-24 border border-white/15 font-semibold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
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
                        const allGrades = activeGrades.length > 0 && g.grades.size === activeGrades.length;
                        const allEdus = currentEduSystems.length > 0 && g.edus.size === currentEduSystems.length;
                        
                        return (
                          <tr key={g.subject?.id} className="hover:bg-slate-50/50 transition-colors text-xs font-semibold">
                            <td className="p-2 p-2 font-medium text-slate-400 border border-slate-200">{i+1}</td>
                            <td className="p-2 p-2 border border-slate-200">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-base">{g.subject?.name}</span>
                                {g.subject?.code && <span className="text-xs font-mono text-slate-400">{g.subject.code}</span>}
                                {g.subject?.subjectType && g.subject.subjectType === "VIET_NAM" && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#48BFE3]/10 text-[#48BFE3] border border-[#48BFE3]/20 font-bold uppercase">
                                    GV VN
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2 p-2 border border-slate-200">
                              {allGrades ? (
                                <span className="font-bold text-[#48BFE3] bg-[#48BFE3]/5 border border-[#48BFE3]/20 px-2.5 py-1 rounded-md text-xs">Tất cả Khối</span>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {Array.from(g.grades).sort((a:any, b:any) => parseInt(a) - parseInt(b)).map((grade:any) => (
                                    <span key={grade} className="font-bold text-slate-800 bg-slate-100 border border-slate-350 px-2 py-1 rounded-md text-xs">K{grade}</span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="p-2 p-2 border border-slate-200">
                              {allEdus ? (
                                <span className="font-bold text-teal-850 text-xs text-xs font-semibold">Tất cả Hệ học</span>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {Array.from(g.edus).sort().map((edu:any) => (
                                    <span key={edu} className="font-bold text-teal-850 text-xs text-xs font-semibold">{edu}</span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="p-2 p-2 text-center border border-slate-200">
                              <div className="flex justify-center gap-1">
                                <button onClick={() => {
                                  setSelGrades(Array.from(g.grades) as string[]);
                                  setSelEdus(Array.from(g.edus) as string[]);
                                  setAssignSelSubjects([g.subject?.id]);
                                  setEditingMappingSubjectId(g.subject?.id);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }} className={"p-2 text-slate-400 hover:text-[#48BFE3] hover:bg-[#48BFE3]/5 rounded-xl transition-all " + (cannotUpdate ? "pointer-events-none opacity-40" : "")} disabled={cannotUpdate} title="Chỉnh sửa (Sẽ nạp lên form phía trên)">
                                  <Pencil className="w-4 h-4"/>
                                </button>
                                <button onClick={async () => {
                                  if(window.confirm(`Xóa toàn bộ cấu hình của môn ${g.subject?.name}?`)) {
                                    for (const id of g.ids) {
                                      await fetch("/api/grade-subject-mappings?id=" + id, { method: "DELETE" });
                                    }
                                    fetchAllMappings();
                                  }
                                }} className={"p-2 text-slate-400 hover:text-red-655 hover:bg-red-50 rounded-xl transition-all " + (cannotDelete ? "pointer-events-none opacity-40" : "")} disabled={cannotDelete} title="Xóa toàn bộ môn này">
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
      {/* ===== TAB: ADMISSION DOCUMENTS (HỒ SƠ NHẬP HỌC) ===== */}
      {tab === "admission_documents" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-teal-500/20 flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-48 h-48 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-teal-500/30 flex items-center justify-center">
                <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-teal-400">
                  <ClipboardList className="w-6 h-6" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-white tracking-tight">Danh mục Hồ sơ nhập học</h2>
                  <span className="px-2.5 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">Khổ A4 Chuẩn</span>
                </div>
                <p className="text-xs text-slate-300 font-medium mt-0.5">Cấu hình danh sách giấy tờ cần nộp theo từng đối tượng tuyển sinh & hiển thị trực quan bản in A4</p>
              </div>
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <button 
                onClick={() => {
                  setConfirm({
                    msg: "Bạn có chắc chắn muốn khôi phục danh sách hồ sơ mẫu cho đối tượng này không?",
                    fn: () => {
                      const defaultDocs = selectedDocGroup === "khoi_2_5" ? defaultDocumentsGrade2_5 : selectedDocGroup === "khoi_6" ? defaultDocumentsGrade6 : selectedDocGroup === "khoi_10_noi_tinh" ? defaultDocumentsGrade10NoiTinh : selectedDocGroup === "khoi_10_ngoai_tinh" ? defaultDocumentsGrade10NgoaiTinh : defaultDocumentsGrade1;
                      setDocList(defaultDocs);
                      localStorage.setItem(getDocStorageKey(selectedDocGroup), JSON.stringify(defaultDocs));
                    }
                  });
                }}
                className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
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
                className="px-4 py-2.5 bg-[#00a884] hover:bg-[#008f70] text-white font-black rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-[#00a884]/20 border border-[#00a884]/30 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Thêm hồ sơ mới
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left side configurations */}
            <div className="lg:col-span-5 space-y-5">
              {/* Card 1: Select & Manage Doc Group */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                    Chọn Đối tượng Hồ sơ
                  </label>
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                    {docGroups.length} đối tượng
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="relative">
                    <select 
                      value={selectedDocGroup} 
                      onChange={(e) => setSelectedDocGroup(e.target.value)} 
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 outline-none appearance-none cursor-pointer hover:bg-slate-100/80 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20 transition-all"
                    >
                      {docGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <div className="flex items-center gap-2">
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
                      className="flex-1 py-2 px-3 bg-emerald-50/90 hover:bg-emerald-100 text-[#00a884] border border-[#00a884]/30 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                      title="Thêm đối tượng mới"
                    >
                      <Plus className="w-3.5 h-3.5" />
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
                          className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 rounded-xl transition-all shadow-sm cursor-pointer"
                          title="Sửa tên đối tượng"
                        >
                          <Pencil className="w-3.5 h-3.5" />
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
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl transition-all shadow-sm cursor-pointer"
                          title="Xóa đối tượng"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2: Admission Target Association */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Áp dụng cho Đối tượng Tuyển sinh:
                  </span>
                  <button
                    onClick={() => {
                      localStorage.setItem('admission_doc_targets', JSON.stringify(docGroupTargets));
                      notify("Đã lưu cấu hình áp dụng đối tượng tuyển sinh thành công!");
                    }}
                    className="px-3 py-1.5 bg-[#00a884] hover:bg-[#008f70] text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-[#00a884]/20 border border-[#00a884]/30 cursor-pointer active:scale-95"
                  >
                    <Check className="w-3 h-3" />
                    Lưu
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                  {configs.filter(c => c.categoryType === "DOI_TUONG_TS").map(c => {
                    const isChecked = (docGroupTargets[selectedDocGroup] || []).includes(c.name);
                    return (
                      <label key={c.id} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all select-none ${
                        isChecked 
                          ? 'bg-teal-50 border-teal-300 text-teal-800 shadow-xs' 
                          : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                      }`}>
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
                          className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300 cursor-pointer"
                        />
                        <span>{c.name}</span>
                      </label>
                    );
                  })}
                  {configs.filter(c => c.categoryType === "DOI_TUONG_TS").length === 0 && (
                    <span className="text-xs text-slate-400 italic">Chưa có Đối tượng Tuyển sinh nào trong Danh mục</span>
                  )}
                </div>
              </div>

              {/* Card 3: Grade Level Association */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Áp dụng cho Khối lớp học:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        const updated = ["Khối 2", "Khối 3", "Khối 4", "Khối 5"];
                        const updatedMappings = { ...docGroupGrades, [selectedDocGroup]: updated };
                        setDocGroupGrades(updatedMappings);
                        localStorage.setItem('admission_doc_grades_mapping', JSON.stringify(updatedMappings));
                      }}
                      type="button"
                      className="px-2.5 py-1 bg-teal-50/90 hover:bg-teal-100 text-[#00a884] border border-[#00a884]/30 rounded-lg text-[10px] font-black transition-all cursor-pointer active:scale-95"
                    >
                      Chọn nhanh 2,3,4,5
                    </button>
                    <button
                      onClick={() => {
                        localStorage.setItem('admission_doc_grades_mapping', JSON.stringify(docGroupGrades));
                        notify("Đã lưu cấu hình áp dụng khối lớp thành công!");
                      }}
                      type="button"
                      className="px-3 py-1.5 bg-[#00a884] hover:bg-[#008f70] text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-[#00a884]/20 border border-[#00a884]/30 cursor-pointer active:scale-95"
                    >
                      <Check className="w-3 h-3" />
                      Lưu
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {["Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5", "Khối 6", "Khối 7", "Khối 8", "Khối 9", "Khối 10", "Khối 11", "Khối 12"].map(g => {
                    const isChecked = (docGroupGrades[selectedDocGroup] || []).includes(g);
                    return (
                      <label key={g} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all select-none ${
                        isChecked 
                          ? 'bg-teal-50 border-teal-300 text-teal-800 shadow-xs' 
                          : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                      }`}>
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
                          className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300 cursor-pointer"
                        />
                        <span>{g}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Card 4: Document Items Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-teal-600" />
                    Danh sách Hồ sơ ({filteredDocList.length})
                  </span>
                </div>

                {filteredDocList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <Tag className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="font-bold text-xs text-slate-400">Chưa cấu hình hồ sơ nào cho đối tượng này</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                        <tr className="text-[11px] border-b font-semibold">
                          <th className="py-2.5 px-3 text-center w-12 border-r border-white/15 font-semibold">TT</th>
                          <th className="py-2.5 px-3 border-r border-white/15 font-semibold">Tên Hồ sơ</th>
                          <th className="py-2.5 px-3 text-center w-16 border-r border-white/15 font-semibold">SL</th>
                          <th className="py-2.5 px-3 text-center w-20 font-semibold">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] bg-white">
                        {filteredDocList.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 text-center font-bold text-slate-400 border-r border-slate-100">{idx + 1}</td>
                            <td className="py-2.5 px-3 border-r border-slate-100 font-bold text-slate-800 text-xs">
                              <div className="truncate max-w-[180px] sm:max-w-none" title={item.name}>{item.name}</div>
                            </td>
                            <td className="py-2.5 px-3 text-center border-r border-slate-100">
                              <span className="px-2 py-0.5 bg-teal-50 text-teal-700 font-black text-[11px] rounded-md border border-teal-200/60 inline-block min-w-[24px]">
                                {item.qty || "1"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
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
                                  className="p-1.5 hover:bg-teal-50 text-teal-600 rounded-lg transition-colors cursor-pointer"
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
                                  className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
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

            {/* Right side live A4 design preview stack */}
            <div className="lg:col-span-7 bg-gradient-to-br from-slate-900/5 via-slate-100/50 to-slate-900/10 rounded-3xl border border-slate-200 p-6 flex flex-col justify-between shadow-inner min-h-[650px]">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Khung Xem trước thiết kế A4 thực tế
                  </span>
                </div>
                <span className="px-3 py-1 bg-white text-slate-600 rounded-full border border-slate-200 text-[10px] font-bold shadow-xs">
                  Khổ A4 (210 × 297 mm) • Tỷ lệ in 100%
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-slate-300 shadow-[0_20px_50px_rgba(15,23,42,0.12)] p-8 sm:p-10 flex flex-col justify-between w-full aspect-[210/297] relative overflow-hidden select-none font-sans text-slate-800 leading-normal">
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

                {/* Content Container */}
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    {/* School Brand Header */}
                    <div className="pb-3 border-b-2 border-teal-700 flex flex-col items-start gap-1">
                      {rcLogo ? (
                        <img src={rcLogo} alt="Logo" className="h-9 object-contain mb-1" />
                      ) : (
                        <span className="text-xs font-black tracking-tight text-teal-700 uppercase">SKY-LINE</span>
                      )}
                      <h4 className="font-extrabold text-[10px] sm:text-xs uppercase tracking-wider text-slate-900" style={{ fontFamily: '"Open Sans", sans-serif' }}>
                        TRƯỜNG TH, THCS, THPT SKY-LINE
                      </h4>
                    </div>

                    {/* Title */}
                    <div className="text-center my-5">
                      <h2 className="text-sm sm:text-base font-black tracking-widest text-slate-900 uppercase" style={{ fontFamily: '"Open Sans", sans-serif' }}>
                        DANH MỤC HỒ SƠ NHẬP HỌC
                      </h2>
                      <div className="w-12 h-0.5 bg-teal-600 mx-auto mt-1.5 rounded-full" />
                    </div>

                    {/* Modern Styled Table */}
                    <div className="mt-4 overflow-hidden rounded-lg border border-slate-300 shadow-xs">
                      <table className="w-full border-collapse text-left text-[10px] sm:text-xs text-slate-900" style={{ fontFamily: '"Open Sans", sans-serif' }}>
                        <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                          <tr className="bg-[#003B3A] text-white text-[11px] font-semibold">
                            <th className="px-3 py-2.5 border-r border-teal-800 text-center w-12 font-semibold">STT</th>
                            <th className="px-4 py-2.5 border-r border-teal-800 text-left font-semibold">Tên hồ sơ giấy tờ</th>
                            <th className="px-3 py-2.5 text-center w-20 font-semibold">Số lượng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0] bg-white">
                          {filteredDocList.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-slate-50/80 even:bg-slate-50/40 transition-colors">
                              <td className="px-3 py-2 border-r border-slate-200 text-center font-bold text-slate-600">{idx + 1}</td>
                              <td className="px-4 py-2 border-r border-slate-200 font-semibold text-slate-900">{item.name}</td>
                              <td className="px-3 py-2 text-center text-teal-800 font-black">{item.qty || "1"}</td>
                            </tr>
                          ))}
                          {filteredDocList.length === 0 && (
                            <tr>
                              <td colSpan={3} className="text-center py-6 text-slate-400 italic">Chưa cấu hình hồ sơ nào cho đối tượng này</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Modern Callout Note Box */}
                    <div className="mt-5 p-3 bg-teal-50/80 border-l-4 border-teal-600 rounded-r-xl font-medium text-[10px] sm:text-xs text-teal-900 leading-relaxed shadow-2xs">
                      * Quý phụ huynh vui lòng bổ sung hồ sơ thiếu (nếu có) trong vòng 10 ngày kể từ ngày nộp Hồ sơ.
                    </div>
                  </div>

                  {/* Footer / Signature Anchor */}
                  {rcFooter ? (
                    <div className="pt-2 border-t border-slate-200 mt-2">
                      <img src={rcFooter} alt="Footer" className="w-full h-auto" />
                    </div>
                  ) : (
                    <div className="border-t border-teal-600/30 pt-2 text-[8px] text-slate-400 text-center font-medium">
                      <p className="font-bold">www.skylineschool.edu.vn • Hotline: (+84.236) 378 7777</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== DOCUMENT MODAL (FORM THÊM/SỬA HỒ SƠ) ===== */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 text-teal-800 flex items-center justify-center text-xs font-semibold">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">{editingDoc ? "Cập nhật Hồ sơ" : "Thêm Hồ sơ Mới"}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Đối tượng: {selectedDocGroup === "khoi_1" ? "Khối 1" : selectedDocGroup === "khoi_2_5" ? "Khối 2 đến 5" : selectedDocGroup === "khoi_6" ? "Khối 6" : selectedDocGroup === "khoi_7_9" ? "Khối 7 đến 9" : selectedDocGroup === "khoi_10" ? "Khối 10" : selectedDocGroup === "khoi_11_12" ? "Khối 11 đến 12" : "Đối tượng Tuyển sinh"}</p>
                </div>
              </div>
              <button onClick={() => setIsDocModalOpen(false)} className="w-8 h-8 rounded-xl bg-slate-200/50 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
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
                  className="w-full text-sm font-bold text-slate-700 outline-none focus:border-teal-200 focus:bg-white transition-all animate-none text-xs font-semibold"
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
                    className="w-full text-sm font-bold text-slate-700 outline-none focus:border-teal-200 focus:bg-white transition-all animate-none text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Ghi chú</label>
                  <input 
                    type="text" 
                    value={docFormNote} 
                    onChange={(e) => setDocFormNote(e.target.value)} 
                    placeholder="Ví dụ: Bản sao y" 
                    className="w-full text-sm font-bold text-slate-700 outline-none focus:border-teal-200 focus:bg-white transition-all animate-none text-xs font-semibold"
                  />
                </div>
              </div>
              <div className="pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Áp dụng cho Khối lớp học</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {["Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5", "Khối 6", "Khối 7", "Khối 8", "Khối 9", "Khối 10", "Khối 11", "Khối 12"].map(g => {
                    const isChecked = docFormSelectedGrades.includes(g);
                    return (
                      <label key={g} className="flex items-center gap-1 hover:bg-emerald-50/50 cursor-pointer select-none transition-colors text-xs font-semibold">
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
                      <label key={c.id} className="flex items-center gap-1.5 hover:bg-teal-50/50 cursor-pointer select-none transition-colors text-xs font-semibold">
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
                          className="w-4 h-4 rounded text-teal-800 focus:ring-indigo-500 border-slate-300"
                        />
                        <span className="text-xs font-bold text-slate-600">{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 text-xs font-semibold">
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
                className="hover:bg-[#003B3A] text-white text-xs font-black transition-colors shadow-lg shadow-indigo-100 text-xs font-semibold"
              >
                Lưu hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== OTHER TABS PLACEHOLDERS ===== */}
      {tab === "reports" && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* UNIFIED APPROVAL CONTROL & FILTER BAR */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-3.5 space-y-2.5 text-left">
            {/* Row 1: Subtabs + Approval Progress Meter + Quick Queue & Batch-Bound Email Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Subtab Switcher */}
                <div className="bg-slate-100 p-0.5 rounded-xl flex gap-1 border border-slate-200/80">
                  <button
                    onClick={() => setReportsSubTab("results")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      reportsSubTab === "results"
                        ? "bg-[#003B3A] text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                    }`}
                  >
                    <ClipboardCheck className={`w-3.5 h-3.5 ${reportsSubTab === "results" ? "text-[#5EEAD4]" : "text-[#008B85]"}`} />
                    <span>Bàn làm việc xét duyệt</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold tabular-nums ${
                      reportsSubTab === "results"
                        ? "bg-white/15 text-white"
                        : "bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]"
                    }`}>
                      {filteredReportStudents.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setReportsSubTab("stats")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      reportsSubTab === "stats"
                        ? "bg-[#003B3A] text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                    }`}
                  >
                    <BarChart3 className={`w-3.5 h-3.5 ${reportsSubTab === "stats" ? "text-[#5EEAD4]" : "text-[#008B85]"}`} />
                    <span>Báo cáo &amp; Thống kê</span>
                  </button>
                </div>

                {/* Live Approval Progress Strip */}
                {batchSummaryStats.total > 0 && (() => {
                  const approvedCount = Math.max(0, batchSummaryStats.total - batchSummaryStats.pending - (batchSummaryStats.absent || 0));
                  const eligibleTotal = Math.max(1, batchSummaryStats.total - (batchSummaryStats.absent || 0));
                  const pct = Math.min(100, Math.round((approvedCount / eligibleTotal) * 100));
                  return (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs tabular-nums">
                      <span className="text-slate-500 font-medium">Tiến độ:</span>
                      <strong className="text-slate-900 font-bold">{approvedCount}/{eligibleTotal}</strong>
                      <div className="w-16 h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                        <div className="h-full bg-[#008B85] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[#00736E] font-bold">{pct}%</span>
                    </div>
                  );
                })()}
              </div>

              {/* Right: Quick Start Approval Queue + Batch-Bound Email Actions */}
              <div className="flex items-center gap-1.5 flex-wrap self-end lg:self-auto">
                {batchSummaryStats.pending > 0 && (
                  <button
                    onClick={() => {
                      setReportsSubTab("results");
                      const firstPending =
                        filteredReportStudents.find(s => !s.admissionResult && !s.isAbsent) ||
                        (reportStudents || []).find(s => !s.admissionResult && !s.isAbsent);
                      if (firstPending) {
                        setReportStudentId(firstPending.id);
                      } else {
                        setReportApprovalStatusFilter("Chưa duyệt");
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#003B3A] hover:bg-[#005854] text-white font-semibold text-xs transition-colors cursor-pointer tabular-nums shadow-2xs"
                    title="Mở ngay hồ sơ học sinh đang chờ duyệt đầu tiên để bắt đầu xét duyệt liên tiếp"
                  >
                    <ClipboardList className="w-3.5 h-3.5 text-[#5EEAD4]" />
                    <span>Duyệt ngay ({batchSummaryStats.pending})</span>
                  </button>
                )}

                {reportsSubTab === "stats" && reportBatchId !== "all" && (
                  <button
                    onClick={handleSendBatchApprovalEmail}
                    disabled={sendingBatchEmail}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#003B3A] bg-[#F0FDFA] border border-[#99F6E4] hover:bg-[#CCFBF1]/70 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {sendingBatchEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5 text-[#00736E]" />}
                    <span>Đề nghị GĐCS xét duyệt đợt</span>
                  </button>
                )}

                {reportsSubTab === "results" && (() => {
                  const hasSpecificBatch = !!reportBatchId && reportBatchId !== "all" && reportBatchId !== "none";
                  const selectedBatchObj = hasSpecificBatch ? rawReportBatches.find(b => b.id === reportBatchId) : null;
                  const batchStudentCount = hasSpecificBatch
                    ? filteredReportStudents.filter(s => s.batchId === reportBatchId).length
                    : 0;
                  return (
                    <div className="inline-flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setIsCompletenessModalOpen(true)}
                        disabled={reportStudents.length === 0}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#003B3A] bg-[#F0FDFA] border border-[#99F6E4] hover:bg-[#CCFBF1]/80 transition-colors disabled:opacity-50 cursor-pointer tabular-nums"
                        title="Kiểm tra đủ các môn khảo sát theo quy chế, gửi email nhắc GV hoàn thành điểm thiếu và gửi mail trình GĐCS cho học sinh đã đủ điểm"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5 text-[#00736E]" />
                        <span>Check đủ điểm</span>
                        {(completenessSummaryStats.readyPending > 0 || completenessSummaryStats.missingPending > 0) && (
                          <span className="px-1.5 py-0 rounded bg-white text-[#003B3A] border border-[#99F6E4] text-[10px] font-bold">
                            {completenessSummaryStats.readyPending} đủ / {completenessSummaryStats.missingPending} thiếu
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleSendBatchApprovalResultEmail}
                        disabled={sendingBatchResultEmail || (hasSpecificBatch && batchStudentCount === 0)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer tabular-nums ${
                          hasSpecificBatch
                            ? "text-[#003B3A] bg-[#F0FDFA] border-[#008B85] hover:bg-[#CCFBF1]/70"
                            : "text-slate-500 bg-white border-slate-200 hover:border-[#008B85] hover:text-[#003B3A]"
                        } disabled:opacity-50`}
                        title={
                          hasSpecificBatch
                            ? `Xem trước & gửi email thông báo kết quả đợt "${selectedBatchObj?.name || "Đợt đang chọn"}" (${batchStudentCount} HS) đến GĐCS, Tư vấn, Giáo vụ & Ban KT&ĐBCL`
                            : "Mở hộp thoại xem trước & gửi email thông báo kết quả theo đợt khảo sát"
                        }
                      >
                        {sendingBatchResultEmail ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Eye className={`w-3.5 h-3.5 ${hasSpecificBatch ? "text-[#00736E]" : "text-slate-500"}`} />
                        )}
                        <span>
                          {hasSpecificBatch
                            ? `Xem trước & gửi email KQ (${batchStudentCount} HS)`
                            : "Xem trước & gửi email KQ"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEmailRoutingModalOpen(true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 hover:border-[#008B85] hover:text-[#003B3A] hover:bg-[#F0FDFA]/80 transition-colors cursor-pointer"
                        title="Thiết lập cấu hình gửi email: Bật/tắt tự động gửi, chọn nhóm người nhận (To/CC) và danh sách email theo từng cơ sở"
                      >
                        <Settings className="w-3.5 h-3.5 text-[#008B85]" />
                        <span className="hidden sm:inline">Cấu hình email</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Row 2: Unified 6-Column Filter Bar (Kỳ khảo sát → Tháng → Đợt khảo sát → Cơ sở → Khối → Tìm kiếm) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {/* 1. Kỳ khảo sát */}
              <select
                value={reportPeriodId}
                onChange={e => {
                  setReportPeriodId(e.target.value);
                  setReportBatchId("all");
                  setReportStudentId("");
                }}
                aria-label="Kỳ khảo sát"
                className="px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] outline-none bg-white cursor-pointer text-slate-700 font-medium"
              >
                {periods.length > 0 && <option value="all">Tất cả Kỳ khảo sát</option>}
                {visiblePeriods.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
                {periods.length === 0 && <option value="">Chưa có kỳ khảo sát</option>}
              </select>

              {/* 2. Tháng (mặc định Tháng hiện tại) */}
              <select
                value={reportMonthFilter}
                onChange={e => {
                  setReportMonthFilter(e.target.value);
                  setReportBatchId("all");
                  setReportStudentId("");
                }}
                aria-label="Tháng khảo sát"
                className="px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] outline-none bg-white cursor-pointer text-slate-700 font-medium tabular-nums"
              >
                <option value="all">Tất cả Tháng</option>
                {availableReportMonths.map(mk => (
                  <option key={mk} value={mk}>
                    Tháng {mk}{mk === currentMonthYearKey ? " (Hiện tại)" : ""}
                  </option>
                ))}
              </select>

              {/* 3. Đợt khảo sát (đồng bộ theo Kỳ, Tháng & Cơ sở) */}
              <select
                value={reportBatchId}
                onChange={e => {
                  setReportBatchId(e.target.value);
                  setReportStudentId("");
                }}
                aria-label="Đợt khảo sát"
                className="px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] outline-none bg-white cursor-pointer text-slate-700 font-medium"
              >
                <option value="all">Tất cả Đợt khảo sát</option>
                {(() => {
                  const noBatchCount = (reportStudents || []).filter(s => {
                    if (s.batchId) return false;
                    if (reportMonthFilter && reportMonthFilter !== "all") {
                      if (getStudentMonthYearKey(s, reportBatchLookup) !== reportMonthFilter) return false;
                    }
                    return true;
                  }).length;
                  return (
                    <option value="none">
                      Khảo sát lẻ{noBatchCount > 0 ? ` (${noBatchCount} HS)` : ""}
                    </option>
                  );
                })()}
                {reportBatches.map(b => {
                  const countInBatch = (reportStudents || []).filter(s => s.batchId === b.id).length;
                  const pendingInBatch = (reportStudents || []).filter(s => s.batchId === b.id && !s.admissionResult && !s.isAbsent).length;
                  const suffix = countInBatch > 0 ? ` (${countInBatch} HS${pendingInBatch > 0 ? ` · ${pendingInBatch} chờ` : ""})` : "";
                  return (
                    <option key={b.id} value={b.id}>{b.name}{suffix}</option>
                  );
                })}
              </select>

              {/* 4. Cơ sở */}
              <select
                value={reportCampusFilter}
                onChange={e => {
                  setReportCampusFilter(e.target.value);
                  setReportStudentId("");
                }}
                aria-label="Cơ sở tuyển sinh"
                className="px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] outline-none bg-white cursor-pointer text-slate-700 font-medium"
              >
                <option value="all">Tất cả Cơ sở</option>
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>{c.campusName}</option>
                ))}
              </select>

              {/* 5. Khối lớp */}
              <select
                value={reportGradeFilter}
                onChange={e => {
                  setReportGradeFilter(e.target.value);
                  setReportStudentId("");
                }}
                aria-label="Khối lớp"
                className="px-2.5 py-1.5 rounded-lg text-xs border border-slate-200 focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] outline-none bg-white cursor-pointer text-slate-700 font-medium"
              >
                <option value="all">Tất cả Khối</option>
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].map(g => {
                  const cnt = reportAvailableGradeCounts[g] || 0;
                  return (
                    <option key={g} value={g}>
                      Khối {g}{cnt > 0 ? ` (${cnt})` : ""}
                    </option>
                  );
                })}
              </select>

              {/* 6. Tìm kiếm Học sinh */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={reportStudentSearchQuery}
                  onChange={e => {
                    setReportStudentSearchQuery(e.target.value);
                  }}
                  placeholder="Tên hoặc mã HS..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg text-xs border border-slate-200 bg-white focus:ring-2 focus:ring-[#00A19A]/20 focus:border-[#00A19A] outline-none transition-all text-slate-700"
                />
                {reportStudentSearchQuery && (
                  <button
                    onClick={() => setReportStudentSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Xóa từ khóa tìm kiếm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* VIEW RENDERED CONDITIONALLY */}
          {reportsSubTab === "stats" ? (
            <div className="space-y-6 animate-in fade-in duration-300 text-slate-800">
              {/* UNIFIED ADMISSIONS LEDGER SUMMARY STRIP */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200/80">
                  {/* Column 1: Tổng hồ sơ khảo sát */}
                  <div className="md:col-span-3 p-5 flex flex-col justify-between bg-slate-50/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">Tổng hồ sơ đăng ký khảo sát</span>
                      <span className="p-2 rounded-lg bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                        <Users className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2 tabular-nums">
                      <span className="text-3xl font-bold text-[#0F172A] tracking-tight">{overallKPIs.total}</span>
                      <span className="text-xs font-medium text-slate-500">học sinh K-12</span>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500 font-medium tabular-nums">
                      Đã có kết quả chấm: <strong className="text-slate-800 font-semibold">{overallKPIs.surveyed || 0}</strong> ({overallKPIs.total > 0 ? Math.round(((overallKPIs.surveyed || 0) / overallKPIs.total) * 100) : 0}%)
                    </div>
                  </div>

                  {/* Column 2: Phân bổ kết quả xét duyệt */}
                  <div className="md:col-span-5 p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">Kết quả phê duyệt của Hội đồng</span>
                      <span className="text-[11px] font-medium text-slate-500 tabular-nums">
                        Chờ duyệt: <strong className="text-amber-700 font-semibold">{batchSummaryStats.pending}</strong>
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3 tabular-nums">
                      <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
                        <span className="text-[11px] font-medium text-emerald-800 block">Đạt chuẩn</span>
                        <span className="text-2xl font-bold text-emerald-700">{overallKPIs.passed}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/70">
                        <span className="text-[11px] font-medium text-amber-900 block">Đạt cam kết</span>
                        <span className="text-2xl font-bold text-amber-700">{overallKPIs.committed}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-200/70">
                        <span className="text-[11px] font-medium text-rose-800 block">Không đạt</span>
                        <span className="text-2xl font-bold text-rose-700">{overallKPIs.failed}</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Tỷ lệ hoàn tất nhập học */}
                  <div className="md:col-span-4 p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">Chuyển đổi nhập học (Đạt &amp; Cam kết)</span>
                      <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <UserCheck className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between gap-2 tabular-nums">
                      <div>
                        <span className="text-3xl font-bold text-[#003B3A] tracking-tight">{enrollmentStats.total_enrolled}</span>
                        <span className="text-xs text-slate-500 font-medium"> / {enrollmentStats.total_passed} học sinh đủ điều kiện</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1] text-xs font-bold">
                        {enrollmentStats.overallRate}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2.5">
                      <div className="h-full bg-[#00A19A] rounded-full transition-all duration-500" style={{ width: `${Math.min(100, enrollmentStats.overallRate || 0)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 5 Cơ sở */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Tiến độ khảo sát &amp; xét duyệt theo Cơ sở
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      So sánh quy mô hồ sơ, tỷ lệ đã khảo sát và phân bổ kết quả giữa 5 cơ sở Sky-Line
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                  {campusStats.map(stat => {
                    const campusApprovedRate = stat.total > 0 ? Math.round(((stat.total - stat.pending) / stat.total) * 100) : 0;
                    const campusSurveyRate = stat.total > 0 ? Math.round((stat.surveyed / stat.total) * 100) : 0;
                    const shortCode = stat.campusName?.replace("Cơ sở ", "CS");
                    
                    let campusColor = {
                      border: "border-t-slate-400",
                      accent: "bg-slate-100 text-slate-700 border-slate-200",
                      bar: "bg-slate-500"
                    };
                    
                    if (shortCode === "CS1") {
                      campusColor = {
                        border: "border-t-[#00A19A]",
                        accent: "bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]",
                        bar: "bg-[#00A19A]"
                      };
                    } else if (shortCode === "CS2") {
                      campusColor = {
                        border: "border-t-rose-500",
                        accent: "bg-rose-50 text-rose-700 border border-rose-200",
                        bar: "bg-rose-500"
                      };
                    } else if (shortCode === "CS3") {
                      campusColor = {
                        border: "border-t-[#003B3A]",
                        accent: "bg-teal-50 text-teal-800 border border-teal-200",
                        bar: "bg-[#003B3A]"
                      };
                    } else if (shortCode === "CS4") {
                      campusColor = {
                        border: "border-t-amber-500",
                        accent: "bg-amber-50 text-amber-800 border border-amber-200",
                        bar: "bg-amber-500"
                      };
                    } else if (shortCode === "CS5") {
                      campusColor = {
                        border: "border-t-sky-600",
                        accent: "bg-sky-50 text-sky-700 border border-sky-200",
                        bar: "bg-sky-600"
                      };
                    }

                    return (
                      <div 
                        key={stat.id} 
                        className={`p-4 rounded-xl border border-slate-200/90 border-t-4 ${campusColor.border} flex flex-col justify-between bg-white hover:border-slate-300 transition-colors tabular-nums`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${campusColor.accent}`}>{shortCode}</span>
                          <span className="text-[11px] text-slate-500 font-medium">Đã duyệt: <strong className="text-slate-800">{campusApprovedRate}%</strong></span>
                        </div>
                        
                        <div className="mb-3">
                          <h5 className="text-xs font-bold text-slate-800 truncate" title={stat.campusName}>{stat.campusName}</h5>
                          <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-2xl font-bold text-slate-900">{stat.total}</span>
                            <span className="text-xs text-slate-500 font-medium">hồ sơ</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2 pt-2.5 border-t border-slate-100 text-[11px]">
                          <div className="flex justify-between items-center text-slate-500 font-medium">
                            <span>Đã khảo sát:</span>
                            <span className="font-semibold text-slate-800">{stat.surveyed}/{stat.total} ({campusSurveyRate}%)</span>
                          </div>
                          
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${campusColor.bar} rounded-full`} style={{ width: `${campusSurveyRate}%` }}></div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-1.5 pt-1 text-center">
                            <div className="bg-emerald-50/80 text-emerald-800 rounded-lg py-1 border border-emerald-100">
                              <span className="block text-[9px] font-medium text-emerald-700">Đạt</span>
                              <span className="text-xs font-bold">{stat.passed}</span>
                            </div>
                            <div className="bg-amber-50/80 text-amber-900 rounded-lg py-1 border border-amber-100">
                              <span className="block text-[9px] font-medium text-amber-800">Cam kết</span>
                              <span className="text-xs font-bold">{stat.committed}</span>
                            </div>
                            <div className="bg-rose-50/80 text-rose-800 rounded-lg py-1 border border-rose-100">
                              <span className="block text-[9px] font-medium text-rose-700">K.Đạt</span>
                              <span className="text-xs font-bold">{stat.failed}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart & Enrollment Breakdown Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart Card */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-5 sm:p-6 overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 border-b border-slate-100 pb-3.5 gap-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Phân bổ học sinh khảo sát theo Khối lớp (K1 – K12)
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Đối chiếu số lượng hồ sơ đăng ký và tiến độ khảo sát thực tế ở từng khối
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <label htmlFor="chartCampusSelect" className="text-xs font-medium text-slate-500 hidden sm:inline-block">Phạm vi:</label>
                      <select
                        id="chartCampusSelect"
                        value={chartCampusId}
                        onChange={e => setChartCampusId(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 py-1.5 px-3 outline-none cursor-pointer hover:border-[#008B85] transition-colors"
                      >
                        <option value="all">Toàn hệ thống</option>
                        <option value="CS1">Cơ sở 1</option>
                        <option value="CS2">Cơ sở 2</option>
                        <option value="CS3">Cơ sở 3</option>
                        <option value="CS4">Cơ sở 4</option>
                        <option value="CS5">Cơ sở 5</option>
                      </select>
                    </div>
                  </div>
                  <div className="h-80 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={gradeStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#003B3A" stopOpacity={0.18}/>
                            <stop offset="95%" stopColor="#003B3A" stopOpacity={0.03}/>
                          </linearGradient>
                          <linearGradient id="colorSurveyed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00A19A" stopOpacity={0.85}/>
                            <stop offset="95%" stopColor="#00A19A" stopOpacity={0.25}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="grade" 
                          stroke="#64748b" 
                          fontSize={11} 
                          tickLine={false} 
                          axisLine={false} 
                          dy={8} 
                          className="font-semibold" 
                          tickFormatter={(tick) => {
                            const stat = gradeStats.find(item => item.grade === tick);
                            if (!stat || stat.total === 0) return tick;
                            return `${tick} (${stat.total})`;
                          }}
                        />
                        
                        {/* Left Y-axis: counts */}
                        <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} className="font-semibold" />
                        
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const stat = gradeStats.find(g => g.grade === label);
                              if (!stat) return null;
                              
                              const overallTotal = campusOverallTotal.total;
                              const gradePct = overallTotal > 0 ? ((stat.total / overallTotal) * 100).toFixed(1) : "0";
                              
                              if (chartCampusId === "all") {
                                return (
                                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-lg text-xs font-medium text-slate-800 space-y-2 tabular-nums">
                                    <div className="font-bold text-sm border-b border-slate-100 pb-1.5 flex justify-between gap-4">
                                      <span>{stat.grade}</span>
                                      <span className="text-[#00736E]">{stat.total}/{overallTotal} HS ({gradePct}%)</span>
                                    </div>
                                    
                                    <div className="space-y-1.5 pt-1">
                                      <div className="flex justify-between gap-4 text-slate-400 text-[10px] font-semibold">
                                        <span>Cơ sở (Quy mô)</span>
                                        <span>Số HS khối / Cơ sở</span>
                                      </div>
                                      
                                      {[
                                        { code: "CS1", name: "Cơ sở 1", total: campusOverallTotal.CS1, count: stat.CS1_total },
                                        { code: "CS2", name: "Cơ sở 2", total: campusOverallTotal.CS2, count: stat.CS2_total },
                                        { code: "CS3", name: "Cơ sở 3", total: campusOverallTotal.CS3, count: stat.CS3_total },
                                        { code: "CS4", name: "Cơ sở 4", total: campusOverallTotal.CS4, count: stat.CS4_total },
                                        { code: "CS5", name: "Cơ sở 5", total: campusOverallTotal.CS5, count: stat.CS5_total }
                                      ].map(cs => {
                                        const csPctOfCampus = cs.total > 0 ? ((cs.count / cs.total) * 100).toFixed(1) : "0";
                                        const csPctOfTotal = overallTotal > 0 ? ((cs.total / overallTotal) * 100).toFixed(1) : "0";
                                        return (
                                          <div key={cs.code} className="flex justify-between items-center py-0.5 gap-4">
                                            <div className="flex items-center gap-1.5">
                                              <span className={`w-2 h-2 rounded-full ${
                                                cs.code === "CS1" ? "bg-[#00A19A]" :
                                                cs.code === "CS2" ? "bg-rose-500" :
                                                cs.code === "CS3" ? "bg-teal-500" :
                                                cs.code === "CS4" ? "bg-amber-500" : "bg-sky-600"
                                              }`}></span>
                                              <span className="font-semibold text-slate-700">{cs.name} ({cs.total} HS · {csPctOfTotal}%)</span>
                                            </div>
                                            <span className="font-bold text-slate-900">{cs.count}/{cs.total} ({csPctOfCampus}%)</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              } else {
                                const campusCode = chartCampusId;
                                const campusTotal = campusOverallTotal[campusCode] || 0;
                                const campusGradeTotal = stat[`${campusCode}_total`] || 0;
                                const campusGradePct = campusTotal > 0 ? ((campusGradeTotal / campusTotal) * 100).toFixed(1) : "0";
                                
                                let campusName = "Cơ sở";
                                if (campusCode === "CS1") campusName = "Cơ sở 1";
                                else if (campusCode === "CS2") campusName = "Cơ sở 2";
                                else if (campusCode === "CS3") campusName = "Cơ sở 3";
                                else if (campusCode === "CS4") campusName = "Cơ sở 4";
                                else if (campusCode === "CS5") campusName = "Cơ sở 5";
                                
                                return (
                                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-lg text-xs font-medium text-slate-800 space-y-2 tabular-nums">
                                    <div className="font-bold text-sm border-b border-slate-100 pb-1.5 flex justify-between gap-4">
                                      <span>{stat.grade} · {campusName}</span>
                                      <span className="text-[#00736E]">{campusGradeTotal}/{campusTotal} HS ({campusGradePct}%)</span>
                                    </div>
                                    <div className="space-y-1.5 pt-1">
                                      <div className="flex justify-between py-0.5 gap-4">
                                        <span className="text-slate-500">Hồ sơ trong khối:</span>
                                        <span className="font-bold text-slate-900">{campusGradeTotal} HS</span>
                                      </div>
                                      <div className="flex justify-between py-0.5 border-t border-slate-100 mt-1 pt-1 gap-4">
                                        <span className="text-slate-500">Tỷ trọng trong toàn khối:</span>
                                        <span className="font-bold text-slate-900">{stat.total > 0 ? ((campusGradeTotal / stat.total) * 100).toFixed(1) : 0}%</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            }
                            return null;
                          }}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", fontWeight: 600, paddingBottom: "10px" }} />
                        
                        {chartCampusId === "all" ? (
                          <>
                            <Bar yAxisId="left" dataKey="total" fill="url(#colorTotal)" radius={[4, 4, 0, 0]} barSize={26} name="Tổng hồ sơ" />
                            <Line yAxisId="left" type="monotone" dataKey="CS1_total" stroke="#00A19A" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 1.5, fill: "#ffffff" }} activeDot={{ r: 5 }} name="Cơ sở 1" />
                            <Line yAxisId="left" type="monotone" dataKey="CS2_total" stroke="#e11d48" strokeWidth={2} dot={{ r: 2.5, strokeWidth: 1.5, fill: "#ffffff" }} name="Cơ sở 2" />
                            <Line yAxisId="left" type="monotone" dataKey="CS3_total" stroke="#003B3A" strokeWidth={2} dot={{ r: 2.5, strokeWidth: 1.5, fill: "#ffffff" }} name="Cơ sở 3" />
                            <Line yAxisId="left" type="monotone" dataKey="CS4_total" stroke="#d97706" strokeWidth={2} dot={{ r: 2.5, strokeWidth: 1.5, fill: "#ffffff" }} name="Cơ sở 4" />
                            <Line yAxisId="left" type="monotone" dataKey="CS5_total" stroke="#0284c7" strokeWidth={2} dot={{ r: 2.5, strokeWidth: 1.5, fill: "#ffffff" }} name="Cơ sở 5" />
                          </>
                        ) : (
                          <>
                            <Bar yAxisId="left" dataKey={`${chartCampusId}_total`} fill="url(#colorTotal)" radius={[4, 4, 0, 0]} barSize={20} name="Tổng hồ sơ" />
                            <Bar yAxisId="left" dataKey={chartCampusId} fill="url(#colorSurveyed)" radius={[4, 4, 0, 0]} barSize={20} name="Đã khảo sát" />
                          </>
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Enrollment Card */}
                <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.03)] p-5 sm:p-6 flex flex-col justify-between">
                  <div className="mb-4 border-b border-slate-100 pb-3.5">
                    <h4 className="font-bold text-slate-900 text-sm">
                      Tỷ lệ nhập học theo Khối đầu cấp
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Theo dõi chuyển đổi nhập học ở Khối 1, Khối 6, Khối 10 và khối ngang
                    </p>
                  </div>

                  <div className="space-y-4 flex-1 flex flex-col justify-center tabular-nums">
                    {[
                      { label: "Khối 1 (Đầu cấp Tiểu học)", passed: enrollmentStats.g1_passed, enrolled: enrollmentStats.g1_enrolled, rate: enrollmentStats.g1Rate, bar: "bg-[#00A19A]", bg: "bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]" },
                      { label: "Khối 6 (Đầu cấp THCS)", passed: enrollmentStats.g6_passed, enrolled: enrollmentStats.g6_enrolled, rate: enrollmentStats.g6Rate, bar: "bg-[#003B3A]", bg: "bg-slate-100 text-slate-800 border border-slate-200" },
                      { label: "Khối 10 (Đầu cấp THPT)", passed: enrollmentStats.g10_passed, enrolled: enrollmentStats.g10_enrolled, rate: enrollmentStats.g10Rate, bar: "bg-amber-500", bg: "bg-amber-50 text-amber-800 border border-amber-200" },
                      { label: "Các khối chuyển ngang khác", passed: enrollmentStats.other_passed, enrolled: enrollmentStats.other_enrolled, rate: enrollmentStats.otherRate, bar: "bg-slate-400", bg: "bg-slate-50 text-slate-600 border border-slate-200" }
                    ].map((g, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-700">{g.label}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${g.bg}`}>
                            {g.enrolled}/{g.passed} HS ({g.rate}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${g.bar} rounded-full transition-all duration-500`} style={{ width: `${g.rate}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-slate-100 text-[11px] font-medium text-slate-500">
                    Số liệu tổng hợp từ hồ sơ tiếp nhận chuyển đến trên hệ thống SSM
                  </div>
                </div>
              </div>

              {/* Campus Breakdown Table Card */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Bảng tổng hợp kết quả theo Cơ sở tuyển sinh
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Chi tiết số lượng đạt chuẩn, đạt cam kết, không đạt và tỷ lệ hoàn tất xét duyệt tại từng cơ sở
                    </p>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap table-auto border-collapse tabular-nums">
                    <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                      <tr className="border-b text-[11px] font-semibold">
                        <th className="py-3 px-4 font-semibold">Cơ sở đào tạo</th>
                        <th className="py-3 px-4 text-center font-semibold">Tổng hồ sơ</th>
                        <th className="py-3 px-4 text-center font-semibold">Đã khảo sát</th>
                        <th className="py-3 px-4 text-center text-[#5EEAD4] font-semibold">Đạt chuẩn</th>
                        <th className="py-3 px-4 text-center text-amber-200 font-semibold">Đạt cam kết</th>
                        <th className="py-3 px-4 text-center text-rose-200 font-semibold">Không đạt</th>
                        <th className="py-3 px-4 text-center font-semibold">Chờ duyệt</th>
                        <th className="py-3 px-4 text-right font-semibold">Tiến độ KS</th>
                        <th className="py-3 px-4 text-right font-semibold">Tỷ lệ duyệt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs font-medium text-slate-700">
                      {campusStats.map(stat => {
                        const campusApprovedRate = stat.total > 0 ? Math.round(((stat.total - stat.pending) / stat.total) * 100) : 0;
                        const campusSurveyRate = stat.total > 0 ? Math.round((stat.surveyed / stat.total) * 100) : 0;
                        
                        let badgeColor = "bg-slate-100 text-slate-700";
                        let borderLeftColor = "border-l-slate-400";
                        const shortCode = stat.campusName?.replace("Cơ sở ", "CS");
                        if (shortCode === "CS1") {
                          badgeColor = "bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]";
                          borderLeftColor = "border-l-[#00A19A]";
                        } else if (shortCode === "CS2") {
                          badgeColor = "bg-rose-50 text-rose-700 border border-rose-200";
                          borderLeftColor = "border-l-rose-500";
                        } else if (shortCode === "CS3") {
                          badgeColor = "bg-teal-50 text-teal-800 border border-teal-200";
                          borderLeftColor = "border-l-[#003B3A]";
                        } else if (shortCode === "CS4") {
                          badgeColor = "bg-amber-50 text-amber-800 border border-amber-200";
                          borderLeftColor = "border-l-amber-500";
                        } else if (shortCode === "CS5") {
                          badgeColor = "bg-sky-50 text-sky-700 border border-sky-200";
                          borderLeftColor = "border-l-sky-600";
                        }

                        return (
                          <tr key={stat.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className={`py-3 px-4 border-l-4 ${borderLeftColor}`}>
                              <div className="flex items-center gap-2.5">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${badgeColor}`}>{shortCode}</span>
                                <span className="font-semibold text-slate-900">{stat.campusName}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-slate-900">{stat.total}</td>
                            <td className="py-3 px-4 text-center font-semibold text-slate-700">{stat.surveyed}</td>
                            <td className="py-3 px-4 text-center">
                              {stat.passed > 0 ? (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold">{stat.passed}</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {stat.committed > 0 ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold">{stat.committed}</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {stat.failed > 0 ? (
                                <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold">{stat.failed}</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {stat.pending > 0 ? (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">{stat.pending}</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2.5">
                                <span className="font-bold text-slate-800 w-9">{campusSurveyRate}%</span>
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-[#00A19A] rounded-full" style={{ width: `${campusSurveyRate}%` }}></div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2.5">
                                <span className="font-bold text-slate-800 w-9">{campusApprovedRate}%</span>
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-[#003B3A] rounded-full" style={{ width: `${campusApprovedRate}%` }}></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {campusStats.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-xs text-slate-400">Chưa có dữ liệu thống kê theo cơ sở</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Batch Breakdown Table Card */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Bảng tổng hợp kết quả theo Đợt khảo sát
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Theo dõi tiến độ chấm điểm và phê duyệt của từng đợt khảo sát trong kỳ
                    </p>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap table-auto border-collapse tabular-nums">
                    <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                      <tr className="border-b text-[11px] font-semibold">
                        <th className="py-3 px-4 font-semibold">Đợt khảo sát</th>
                        <th className="py-3 px-4 text-center font-semibold">Tổng hồ sơ</th>
                        <th className="py-3 px-4 text-center font-semibold">Đã khảo sát</th>
                        <th className="py-3 px-4 text-center text-[#5EEAD4] font-semibold">Đạt chuẩn</th>
                        <th className="py-3 px-4 text-center text-amber-200 font-semibold">Đạt cam kết</th>
                        <th className="py-3 px-4 text-center text-rose-200 font-semibold">Không đạt</th>
                        <th className="py-3 px-4 text-center font-semibold">Chờ duyệt</th>
                        <th className="py-3 px-4 text-right font-semibold">Tiến độ KS</th>
                        <th className="py-3 px-4 text-right font-semibold">Tỷ lệ duyệt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs font-medium text-slate-700">
                      {batchStats.map(stat => {
                        const batchApprovedRate = stat.total > 0 ? Math.round(((stat.total - stat.pending) / stat.total) * 100) : 0;
                        const batchSurveyRate = stat.total > 0 ? Math.round((stat.surveyed / stat.total) * 100) : 0;
                        return (
                          <tr key={stat.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1] flex items-center justify-center shrink-0">
                                  <Layers className="w-3.5 h-3.5" />
                                </div>
                                <span className="font-semibold text-slate-900">{stat.batchName}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-slate-900">{stat.total}</td>
                            <td className="py-3 px-4 text-center font-semibold text-slate-700">{stat.surveyed}</td>
                            <td className="py-3 px-4 text-center">
                              {stat.passed > 0 ? (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold">{stat.passed}</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {stat.committed > 0 ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold">{stat.committed}</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {stat.failed > 0 ? (
                                <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold">{stat.failed}</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {stat.pending > 0 ? (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">{stat.pending}</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2.5">
                                <span className="font-bold text-slate-800 w-9">{batchSurveyRate}%</span>
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-[#00A19A] rounded-full" style={{ width: `${batchSurveyRate}%` }}></div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2.5">
                                <span className="font-bold text-slate-800 w-9">{batchApprovedRate}%</span>
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-[#003B3A] rounded-full" style={{ width: `${batchApprovedRate}%` }}></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {batchStats.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-xs text-slate-400">Chưa có dữ liệu đợt khảo sát</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>











          ) : (
            <div className="space-y-4 animate-in fade-in duration-300">
          {/* MAIN CONTAINER */}
          {reportLoading ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-slate-200/80">
              <Loader2 className="w-8 h-8 text-[#008B85] animate-spin mx-auto mb-3"/>
              <p className="text-xs font-semibold text-slate-500">Đang tải danh sách hồ sơ khảo sát...</p>
            </div>
          ) : (
            <>
              {/* FLOATING / INLINE BATCH ACTIONS BAR */}
              {selectedStudentIds.length > 0 && (
                <div className="bg-[#003B3A] text-white px-4 py-3 rounded-2xl shadow-lg mb-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 border border-[#005854]">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-lg bg-[#00A19A] text-white font-bold text-xs tabular-nums">
                      Đã chọn {selectedStudentIds.length} hồ sơ
                    </span>
                    <span className="text-xs text-teal-100 hidden sm:inline">Chọn quyết định phê duyệt hàng loạt:</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleBatchApprove("Đạt")}
                      disabled={batchActionLoading}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {batchActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Phê duyệt Đạt chuẩn ({selectedStudentIds.length})
                    </button>
                    <button
                      onClick={() => handleBatchApprove("Không đạt")}
                      disabled={batchActionLoading}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      Phê duyệt Không đạt
                    </button>
                    <button
                      onClick={() => setSelectedStudentIds([])}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>
              )}

              {/* DATA CARD WITH INTEGRATED STATUS TABS */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden text-left mb-6">
                {/* CARD HEADER: STATUS SEGMENTED TABS + SUMMARY */}
                <div className="px-3.5 py-2.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-col md:flex-row md:items-center justify-between gap-2">
                  {/* Status Segmented Control */}
                  <div className="flex items-center gap-1 flex-wrap tabular-nums">
                    <button
                      onClick={() => setReportApprovalStatusFilter("all")}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                        reportApprovalStatusFilter === "all"
                          ? "bg-[#003B3A] text-white border-[#003B3A] shadow-2xs"
                          : "bg-white text-slate-700 hover:text-[#003B3A] hover:border-[#008B85]/60 border-[#E2E8F0]"
                      }`}
                    >
                      <span>Tất cả</span>
                      <span className={`px-1 py-0 rounded text-[10px] font-bold ${reportApprovalStatusFilter === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"}`}>
                        {batchSummaryStats.total}
                      </span>
                    </button>

                    <button
                      onClick={() => setReportApprovalStatusFilter("Chưa duyệt")}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                        reportApprovalStatusFilter === "Chưa duyệt"
                          ? "bg-[#D97706] text-white border-[#D97706] shadow-2xs"
                          : "bg-white text-slate-700 hover:text-[#003B3A] hover:border-[#D97706]/60 border-[#E2E8F0]"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${reportApprovalStatusFilter === "Chưa duyệt" ? "bg-white" : "bg-[#D97706]"}`} />
                      <span>Chờ duyệt</span>
                      <span className={`px-1 py-0 rounded text-[10px] font-bold ${reportApprovalStatusFilter === "Chưa duyệt" ? "bg-white/20 text-white" : "bg-amber-50 text-[#D97706]"}`}>
                        {batchSummaryStats.pending}
                      </span>
                    </button>

                    <button
                      onClick={() => setReportApprovalStatusFilter("Đủ điểm chờ duyệt")}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                        reportApprovalStatusFilter === "Đủ điểm chờ duyệt"
                          ? "bg-[#00736E] text-white border-[#00736E] shadow-2xs"
                          : "bg-white text-slate-700 hover:text-[#003B3A] hover:border-[#008B85]/60 border-[#E2E8F0]"
                      }`}
                      title="Lọc các học sinh đã có đủ kết quả các môn khảo sát bắt buộc nhưng chưa phê duyệt"
                    >
                      <CheckCircle2 className={`w-3 h-3 ${reportApprovalStatusFilter === "Đủ điểm chờ duyệt" ? "text-[#5EEAD4]" : "text-[#059669]"}`} />
                      <span>Đủ điểm chờ duyệt</span>
                      <span className={`px-1 py-0 rounded text-[10px] font-bold ${reportApprovalStatusFilter === "Đủ điểm chờ duyệt" ? "bg-white/20 text-white" : "bg-[#F0FDFA] text-[#00736E]"}`}>
                        {completenessSummaryStats.readyPending}
                      </span>
                    </button>

                    <button
                      onClick={() => setReportApprovalStatusFilter("Thiếu điểm")}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                        reportApprovalStatusFilter === "Thiếu điểm"
                          ? "bg-[#E11D48] text-white border-[#E11D48] shadow-2xs"
                          : "bg-white text-slate-700 hover:text-[#003B3A] hover:border-rose-300 border-[#E2E8F0]"
                      }`}
                      title="Lọc các học sinh còn thiếu điểm các môn khảo sát bắt buộc để nhắc giáo viên"
                    >
                      <AlertCircle className={`w-3 h-3 ${reportApprovalStatusFilter === "Thiếu điểm" ? "text-white" : "text-[#E11D48]"}`} />
                      <span>Thiếu điểm</span>
                      <span className={`px-1 py-0 rounded text-[10px] font-bold ${reportApprovalStatusFilter === "Thiếu điểm" ? "bg-white/20 text-white" : "bg-rose-50 text-[#E11D48]"}`}>
                        {completenessSummaryStats.missingPending}
                      </span>
                    </button>

                    <button
                      onClick={() => setReportApprovalStatusFilter("Đạt")}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                        reportApprovalStatusFilter === "Đạt"
                          ? "bg-[#059669] text-white border-[#059669] shadow-2xs"
                          : "bg-white text-slate-700 hover:text-[#003B3A] hover:border-[#059669]/60 border-[#E2E8F0]"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${reportApprovalStatusFilter === "Đạt" ? "bg-white" : "bg-[#059669]"}`} />
                      <span>Đạt chuẩn</span>
                      <span className={`px-1 py-0 rounded text-[10px] font-bold ${reportApprovalStatusFilter === "Đạt" ? "bg-white/20 text-white" : "bg-emerald-50 text-[#059669]"}`}>
                        {batchSummaryStats.passed}
                      </span>
                    </button>

                    <button
                      onClick={() => setReportApprovalStatusFilter("Đạt cam kết")}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                        reportApprovalStatusFilter === "Đạt cam kết"
                          ? "bg-[#D97706] text-white border-[#D97706] shadow-2xs"
                          : "bg-white text-slate-700 hover:text-[#003B3A] hover:border-[#D97706]/60 border-[#E2E8F0]"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${reportApprovalStatusFilter === "Đạt cam kết" ? "bg-white" : "bg-[#D97706]"}`} />
                      <span>Đạt cam kết</span>
                      <span className={`px-1 py-0 rounded text-[10px] font-bold ${reportApprovalStatusFilter === "Đạt cam kết" ? "bg-white/20 text-white" : "bg-amber-50 text-[#D97706]"}`}>
                        {batchSummaryStats.committed}
                      </span>
                    </button>

                    <button
                      onClick={() => setReportApprovalStatusFilter("Không đạt")}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                        reportApprovalStatusFilter === "Không đạt"
                          ? "bg-[#E11D48] text-white border-[#E11D48] shadow-2xs"
                          : "bg-white text-slate-700 hover:text-[#003B3A] hover:border-[#E11D48]/60 border-[#E2E8F0]"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${reportApprovalStatusFilter === "Không đạt" ? "bg-white" : "bg-[#E11D48]"}`} />
                      <span>Không đạt</span>
                      <span className={`px-1 py-0 rounded text-[10px] font-bold ${reportApprovalStatusFilter === "Không đạt" ? "bg-white/20 text-white" : "bg-rose-50 text-[#E11D48]"}`}>
                        {batchSummaryStats.failed}
                      </span>
                    </button>

                    {batchSummaryStats.absent > 0 && (
                      <button
                        onClick={() => setReportApprovalStatusFilter("Vắng khảo sát")}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                          reportApprovalStatusFilter === "Vắng khảo sát"
                            ? "bg-slate-700 text-white border-slate-700 shadow-2xs"
                            : "bg-white text-slate-600 hover:bg-slate-100 border-[#E2E8F0]"
                        }`}
                      >
                        <span>Vắng</span>
                        <span className={`px-1 py-0 rounded text-[10px] font-bold ${reportApprovalStatusFilter === "Vắng khảo sát" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"}`}>
                          {batchSummaryStats.absent}
                        </span>
                      </button>
                    )}

                    {(reportGradeFilter !== "all" || reportApprovalStatusFilter !== "all" || reportStudentSearchQuery.trim() !== "") && (
                      <button
                        onClick={() => {
                          setReportGradeFilter("all");
                          setReportApprovalStatusFilter("all");
                          setReportStudentSearchQuery("");
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-500 hover:text-[#003B3A] hover:bg-slate-200/60 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                        <span>Xóa lọc</span>
                      </button>
                    )}
                  </div>

                  {/* Scope, Sort & Counter badge */}
                  <div className="flex items-center gap-2.5 text-xs font-medium text-slate-500 self-end md:self-auto shrink-0 tabular-nums flex-wrap">
                    <select
                      value={reportSortMode}
                      onChange={e => setReportSortMode(e.target.value as any)}
                      aria-label="Sắp xếp danh sách xét duyệt"
                      className="bg-white border border-[#E2E8F0] hover:border-[#008B85] rounded-xl px-2.5 py-1 text-[11px] font-semibold text-[#003B3A] outline-none cursor-pointer"
                    >
                      <option value="priority_latest">Ưu tiên: Chờ duyệt &amp; Đợt mới nhất</option>
                      <option value="latest_batch">Sắp xếp: Đợt mới nhất trước</option>
                      <option value="name_asc">Sắp xếp: Tên A → Z</option>
                    </select>
                    <span className="hidden xl:inline text-slate-400">
                      {reportCampusFilter === "all" ? "5 cơ sở" : (campuses.find(c => c.id === reportCampusFilter)?.campusCode || campuses.find(c => c.id === reportCampusFilter)?.campusName || "Cơ sở")}
                      {" · "}
                    </span>
                    <span>
                      Danh sách <strong className="text-[#003B3A] font-bold">{sortedReportStudents.length}</strong> học sinh
                    </span>
                  </div>
                </div>

                {/* MOBILE APPROVAL CARD LIST (< md) */}
                <div className="md:hidden divide-y divide-[#E2E8F0] bg-white tabular-nums">
                  {paginatedReportStudents.length === 0 ? (
                    <div className="py-10 px-4 text-center text-xs font-medium text-slate-400">
                      Không có học sinh nào phù hợp với bộ lọc hiện tại.
                    </div>
                  ) : (
                    paginatedReportStudents.map((s) => {
                      const isChecked = selectedStudentIds.includes(s.id);
                      const isPending = !s.admissionResult && !s.isAbsent;
                      const isPassedStandard = s.admissionResult === "Đạt" || (s.admissionResult?.includes("Đạt") && !s.admissionResult?.includes("Không") && !s.admissionResult?.includes("cam kết"));
                      const isCommitted = s.admissionResult?.includes("cam kết");
                      const isProbation = s.admissionResult === "Học thử";
                      const campusObj = resolveCampusObjForStudent(s);
                      const shortCampus =
                        campusObj?.campusCode ||
                        campusObj?.campusName?.replace("Cơ sở ", "CS") ||
                        (s.admissionCampus && !/^(cm|cl)[a-z0-9]{15,}$/i.test(String(s.admissionCampus)) ? s.admissionCampus : "—");
                      const mk = getStudentMonthYearKey(s, reportBatchLookup);
                      const surveyPills = getStudentSurveyPills(s);
                      const comp = completenessMap.get(s.id);
                      const approvedViaEmail = !s.gdcsEmailSentAt && /duyệt qua email|phê duyệt qua email/i.test(String(s.directorNote || ""));

                      return (
                        <div key={s.id} className={`p-3.5 space-y-2.5 ${isChecked ? "bg-[#F0FDFA]/70" : "bg-white"}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleSelectStudent(s.id)}
                                className="mt-1 w-4 h-4 rounded text-[#008B85] focus:ring-[#00A19A] cursor-pointer shrink-0"
                              />
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => setReportStudentId(s.id)}
                                  className="font-bold text-slate-900 text-sm text-left hover:text-[#00736E] leading-snug"
                                >
                                  {s.fullName}
                                </button>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                                  <span className="font-mono font-semibold text-[#003B3A] bg-[#F8FAFC] px-1.5 py-0.5 rounded border border-[#E2E8F0]">
                                    {s.studentCode || "—"}
                                  </span>
                                  {mk && (
                                    <span className="px-1.5 py-0.5 rounded font-semibold bg-[#F8FAFC] text-[#003B3A] border border-[#E2E8F0]">
                                      {mk}
                                    </span>
                                  )}
                                  <span className="px-1.5 py-0.5 rounded font-semibold bg-[#F8FAFC] text-slate-700 border border-[#E2E8F0]">
                                    Khối {s.grade || "—"}
                                  </span>
                                  <span className="font-semibold text-slate-600">{s.surveyFormType || s.surveySystem || "—"}</span>
                                  <span className="px-1.5 py-0.5 rounded font-bold bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                                    {shortCampus}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <span className={`shrink-0 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${
                              s.isAbsent
                                ? "bg-slate-100 text-slate-600 border-slate-200"
                                : isPending
                                ? "bg-amber-50 text-[#D97706] border-amber-200"
                                : isPassedStandard
                                ? "bg-emerald-50 text-[#059669] border-emerald-200"
                                : isCommitted || isProbation
                                ? "bg-amber-50 text-[#D97706] border-amber-200"
                                : "bg-rose-50 text-[#E11D48] border-rose-200"
                            }`}>
                              {s.isAbsent ? "Vắng KS" : isPending ? "Chờ duyệt" : s.admissionResult}
                            </span>
                          </div>

                          {/* Scores */}
                          <div className="flex flex-wrap items-center gap-1.5 pl-6">
                            {surveyPills.length > 0 ? (
                              surveyPills.slice(0, 4).map((p) => (
                                <span
                                  key={p.key}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border ${
                                    p.nonScoring
                                      ? "bg-amber-50 text-amber-900 border-amber-300"
                                      : "bg-[#F8FAFC] text-slate-700 border-[#E2E8F0]"
                                  }`}
                                >
                                  <span className={p.nonScoring ? "text-amber-700 font-medium" : "text-slate-500 font-medium"}>{p.label}:</span>
                                  <strong className={p.nonScoring ? "font-bold text-amber-950" : "font-bold text-[#003B3A]"}>{p.value}</strong>
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Chưa ghi nhận điểm</span>
                            )}
                          </div>

                          {/* Progress + GDCS Mail Status */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pl-6 pt-1 border-t border-slate-100 text-[11px]">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {comp && comp.requiredCount > 0 && (
                                comp.status === "READY" ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-[#059669] border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Đủ {comp.completedCount}/{comp.requiredCount} môn
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-amber-50 text-[#D97706] border border-amber-200">
                                    <AlertCircle className="w-3 h-3" />
                                    Thiếu {comp.completedCount}/{comp.requiredCount} môn
                                  </span>
                                )
                              )}
                              {(s.gdcsEmailSentAt || approvedViaEmail) ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-[#F0FDFA] text-[#00736E] border border-[#99F6E4]">
                                  <Mail className="w-3 h-3" />
                                  Đã gửi GĐCS
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md font-medium bg-slate-50 text-slate-400 border border-slate-200">
                                  Chưa gửi GĐCS
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pl-6 pt-1">
                            {!s.admissionResult && !s.isAbsent && (
                              <button
                                type="button"
                                onClick={() => handleSendGdcsApprovalRequestForStudent(s)}
                                disabled={sendingApprovalId === s.id}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:border-[#008B85] hover:text-[#003B3A] cursor-pointer"
                              >
                                {sendingApprovalId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5 text-[#008B85]" />}
                                <span>Nhắc GĐCS</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setReportStudentId(s.id)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#003B3A] hover:bg-[#005854] text-white cursor-pointer"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5 text-[#5EEAD4]" />
                              <span>Xét duyệt</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* EVIDENCE-FIRST APPROVAL LEDGER TABLE (md+) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left table-auto border-collapse tabular-nums">
                    <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                      <tr className="text-[11px] font-semibold whitespace-nowrap">
                        <th className="py-3 px-3 text-center w-10 font-semibold">
                          <input
                            type="checkbox"
                            checked={paginatedReportStudents.length > 0 && paginatedReportStudents.every(s => selectedStudentIds.includes(s.id))}
                            onChange={e => handleToggleSelectAll(e.target.checked)}
                            className="w-4 h-4 rounded text-[#00A19A] focus:ring-[#00A19A] cursor-pointer"
                            title="Chọn tất cả học sinh trên trang này"
                          />
                        </th>
                        <th className="py-3 px-3 text-teal-100 font-semibold">Mã HS</th>
                        <th className="py-3 px-3.5 min-w-[170px] font-semibold">Học sinh</th>
                        <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Tháng</th>
                        <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Ngày sinh</th>
                        <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Giới tính</th>
                        <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Khối</th>
                        <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Hệ</th>
                        <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Cơ sở</th>
                        <th className="py-3 px-3.5 min-w-[200px] font-semibold">Kết quả khảo sát</th>
                        <th className="py-3 px-3 min-w-[155px] text-teal-100 font-semibold">Tiến độ</th>
                        <th className="py-3 px-2.5 text-center text-teal-100 font-semibold">Gửi mail GĐCS</th>
                        <th className="py-3 px-3 text-center text-[#5EEAD4] font-semibold">KQ đã xét duyệt</th>
                        <th className="py-3 px-3.5 text-right font-semibold">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white">
                      {paginatedReportStudents.map(s => {
                        const isSelected = reportStudentId === s.id;
                        const isChecked = selectedStudentIds.includes(s.id);
                        const isPending = !s.admissionResult && !s.isAbsent;
                        const isPassedStandard = s.admissionResult === "Đạt" || (s.admissionResult?.includes("Đạt") && !s.admissionResult?.includes("Không") && !s.admissionResult?.includes("cam kết"));
                        const isCommitted = s.admissionResult?.includes("cam kết");
                        const isProbation = s.admissionResult === "Học thử";

                        const dobStr = s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "—";
                        const genderStr = s.gender === "M" || s.gender === "Nam" ? "Nam" : s.gender === "F" || s.gender === "Nữ" ? "Nữ" : s.gender || "—";
                        const campusObj = resolveCampusObjForStudent(s);
                        const shortCampus =
                          campusObj?.campusCode ||
                          campusObj?.campusName?.replace("Cơ sở ", "CS") ||
                          (s.admissionCampus && !/^(cm|cl)[a-z0-9]{15,}$/i.test(String(s.admissionCampus)) ? s.admissionCampus : "—");

                        const surveyPills = getStudentSurveyPills(s);
                        const noteClean = parseApprovalHistory(s.directorNote).cleanNote || "";
                        const commMatch = noteClean.match(/^Môn (?:cam kết|kiểm tra lại): \[(.*?)\]/);
                        const commSubjectsSummary = commMatch?.[1] || "";

                        return (
                          <tr
                            key={s.id}
                            className={`transition-colors align-middle ${
                              isChecked
                                ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]"
                                : isSelected
                                ? "bg-[#F0FDFA]/50 hover:bg-[#F0FDFA]/80"
                                : "hover:bg-[#F8FAFC]"
                            }`}
                          >
                            {/* 1. Checkbox */}
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleSelectStudent(s.id)}
                                className="w-4 h-4 rounded text-[#008B85] focus:ring-[#00A19A] cursor-pointer"
                              />
                            </td>

                            {/* 2. Mã HS */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="font-mono font-semibold text-xs text-[#003B3A] bg-[#F8FAFC] px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                                {s.studentCode || "—"}
                              </span>
                            </td>

                            {/* 3. Học sinh */}
                            <td className="py-3 px-3.5">
                              <button
                                type="button"
                                onClick={() => setReportStudentId(s.id)}
                                className="font-bold text-slate-900 hover:text-[#00736E] transition-colors cursor-pointer text-left flex items-center gap-1.5 group"
                                title="Mở bàn xét duyệt hồ sơ học sinh"
                              >
                                <span className="group-hover:underline text-[13px]">{s.fullName}</span>
                              </button>
                              {s.batchId ? (
                                <button
                                  type="button"
                                  onClick={() => setReportBatchId(s.batchId)}
                                  title={`Lọc theo đợt: ${s.batch?.name || rawReportBatches.find((b: any) => b.id === s.batchId)?.name || "Đợt khảo sát"}`}
                                  className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#F8FAFC] hover:bg-[#F0FDFA] text-slate-500 hover:text-[#00736E] border border-[#E2E8F0] hover:border-[#99F6E4] max-w-[210px] truncate cursor-pointer transition-colors"
                                >
                                  {s.batch?.name || rawReportBatches.find((b: any) => b.id === s.batchId)?.name || "Đợt khảo sát"}
                                </button>
                              ) : (
                                <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                                  Khảo sát lẻ
                                </span>
                              )}
                            </td>

                            {/* 3b. Tháng */}
                            <td className="py-3 px-2.5 text-center whitespace-nowrap tabular-nums">
                              {(() => {
                                const mk = getStudentMonthYearKey(s, reportBatchLookup);
                                return mk ? (
                                  <span className="px-2 py-0.5 rounded-md font-semibold text-xs bg-[#F8FAFC] text-[#003B3A] border border-[#E2E8F0]">
                                    {mk}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                );
                              })()}
                            </td>

                            {/* 4. Ngày sinh */}
                            <td className="py-3 px-2.5 text-center whitespace-nowrap text-slate-600">
                              {dobStr}
                            </td>

                            {/* 5. Giới tính */}
                            <td className="py-3 px-2.5 text-center whitespace-nowrap text-slate-600">
                              {genderStr}
                            </td>

                            {/* 6. Khối */}
                            <td className="py-3 px-2.5 text-center whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-md font-semibold text-xs bg-[#F8FAFC] text-[#003B3A] border border-[#E2E8F0]">
                                Khối {s.grade || "—"}
                              </span>
                            </td>

                            {/* 7. Hệ */}
                            <td className="py-3 px-2.5 text-center whitespace-nowrap font-semibold text-slate-700">
                              {s.surveyFormType || s.surveySystem || "—"}
                            </td>

                            {/* 8. Cơ sở */}
                            <td className="py-3 px-2.5 text-center whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-md font-bold text-xs bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                                {shortCampus}
                              </span>
                            </td>

                            {/* 9. Kết quả khảo sát (Unified Slate/Teal Academic Ledger Chips) */}
                            <td className="py-3 px-3.5">
                              {surveyPills.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => setReportStudentId(s.id)}
                                  className="flex flex-wrap items-center gap-1.5 text-left cursor-pointer group"
                                  title="Nhấn để mở xét duyệt và xem chi tiết điểm"
                                >
                                  {surveyPills.slice(0, 4).map(p => (
                                    <span
                                      key={p.key}
                                      title={p.nonScoring ? "Tiếng Anh (vấn đáp) — Môn không xét kết quả Đạt/Không đạt (chỉ tham khảo xếp lớp)" : undefined}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border transition-colors ${
                                        p.nonScoring
                                          ? "bg-amber-50 text-amber-900 border-amber-300 group-hover:border-amber-400"
                                          : "bg-[#F8FAFC] text-slate-700 border-[#E2E8F0] group-hover:border-[#008B85]/60"
                                      }`}
                                    >
                                      <span className={p.nonScoring ? "text-amber-700 font-medium" : "text-slate-500 font-medium"}>{p.label}:</span>
                                      <strong className={p.nonScoring ? "font-bold text-amber-950" : "font-bold text-[#003B3A]"}>{p.value}</strong>
                                    </span>
                                  ))}
                                  {surveyPills.length > 4 && (
                                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                                      +{surveyPills.length - 4} môn
                                    </span>
                                  )}
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Chưa ghi nhận điểm</span>
                              )}
                            </td>

                            {/* 9b. Tiến độ đủ/thiếu các môn khảo sát */}
                            <td className="py-3 px-3 tabular-nums">
                              {(() => {
                                if (s.isAbsent) {
                                  return <span className="text-[11px] text-slate-400">Vắng KS</span>;
                                }
                                const comp = completenessMap.get(s.id);
                                if (!comp || comp.requiredCount === 0) {
                                  return <span className="text-[11px] text-slate-400">—</span>;
                                }
                                if (comp.status === "READY") {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-[#059669] border border-emerald-200 whitespace-nowrap">
                                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                                      Đủ {comp.completedCount}/{comp.requiredCount} môn
                                    </span>
                                  );
                                }
                                const fullMissing = comp.missingSubjects.join(", ");
                                return (
                                  <div className="flex flex-col items-start gap-0.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-[#D97706] border border-amber-200 whitespace-nowrap">
                                      <AlertCircle className="w-3 h-3 shrink-0" />
                                      Thiếu {comp.completedCount}/{comp.requiredCount} môn
                                    </span>
                                    {comp.missingSubjects.length > 0 && (
                                      <span
                                        className="text-[10px] text-slate-500 leading-snug max-w-[200px] line-clamp-2"
                                        title={`Còn thiếu: ${fullMissing}`}
                                      >
                                        Thiếu: {fullMissing}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>

                            {/* 9c. Trạng thái Đã gửi mail cho GĐCS */}
                            <td className="py-3 px-2.5 text-center whitespace-nowrap tabular-nums">
                              {(() => {
                                const approvedViaEmail =
                                  !s.gdcsEmailSentAt &&
                                  /duyệt qua email|phê duyệt qua email/i.test(String(s.directorNote || ""));
                                if (s.gdcsEmailSentAt || approvedViaEmail) {
                                  return (
                                    <div
                                      className="inline-flex flex-col items-center gap-0.5"
                                      title={
                                        s.gdcsEmailSentAt
                                          ? `Đã gửi mail cho GĐCS${s.gdcsEmailRecipient ? ` (${s.gdcsEmailRecipient})` : ""} lúc ${new Date(s.gdcsEmailSentAt).toLocaleString("vi-VN")}`
                                          : "Đã gửi mail & GĐCS đã phê duyệt qua Email"
                                      }
                                    >
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-[#99F6E4]">
                                        <Mail className="w-3 h-3 shrink-0" />
                                        Đã gửi GĐCS
                                      </span>
                                      {s.gdcsEmailSentAt && (
                                        <span className="text-[10px] text-slate-400">
                                          {new Date(s.gdcsEmailSentAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}{" "}
                                          {new Date(s.gdcsEmailSentAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                                        </span>
                                      )}
                                    </div>
                                  );
                                }
                                return (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-400 border border-slate-200">
                                    Chưa gửi
                                  </span>
                                );
                              })()}
                            </td>

                            {/* 10. KQ đã xét duyệt (Semantic Outcome Colors: Emerald #059669 / Amber #D97706 / Rose #E11D48) */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <div className="inline-flex flex-col items-center justify-center gap-1">
                                {s.isAbsent ? (
                                  <span className="font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-[11px]">
                                    Vắng khảo sát
                                  </span>
                                ) : isPending ? (
                                  <span className="inline-flex items-center gap-1.5 text-[#D97706] bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                                    Chờ duyệt
                                  </span>
                                ) : (
                                  <>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                      isPassedStandard
                                        ? "bg-emerald-50 text-[#059669] border-emerald-200"
                                        : isCommitted
                                        ? "bg-amber-50 text-[#D97706] border-amber-200"
                                        : isProbation
                                        ? "bg-[#F0FDFA] text-[#00736E] border-[#99F6E4]"
                                        : "bg-rose-50 text-[#E11D48] border-rose-200"
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${
                                        isPassedStandard
                                          ? "bg-[#059669]"
                                          : isCommitted
                                          ? "bg-[#D97706]"
                                          : isProbation
                                          ? "bg-[#008B85]"
                                          : "bg-[#E11D48]"
                                      }`} />
                                      {s.admissionResult === "Đạt" ? "Đạt chuẩn" : s.admissionResult}
                                    </span>
                                    {commSubjectsSummary && (
                                      <span className="text-[10px] font-medium text-[#D97706] max-w-[180px] truncate" title={commSubjectsSummary}>
                                        Môn: {commSubjectsSummary}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>

                            {/* 11. Thao tác: Xét duyệt */}
                            <td className="py-3 px-3.5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                {!s.admissionResult ? (
                                  <button
                                    onClick={() => handleSendGdcsApprovalRequestForStudent(s)}
                                    disabled={sendingApprovalId === s.id}
                                    title="Xem trước & gửi email nhắc Giám đốc Cơ sở xét duyệt hồ sơ này"
                                    className="p-1.5 rounded-lg border border-transparent hover:border-[#E2E8F0] hover:bg-[#F8FAFC] text-slate-500 hover:text-[#00736E] disabled:opacity-50 inline-flex items-center justify-center cursor-pointer transition-colors"
                                  >
                                    {sendingApprovalId === s.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Mail className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handlePreviewApprovalResultForStudent(s)}
                                    title="Xem trước & gửi email Thông báo kết quả xét duyệt cho học sinh này"
                                    className="p-1.5 rounded-lg border border-transparent hover:border-[#99F6E4] hover:bg-[#F0FDFA] text-[#00736E] hover:text-[#003B3A] inline-flex items-center justify-center cursor-pointer transition-colors"
                                  >
                                    <Mail className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => setReportStudentId(s.id)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                                    isSelected || isPending
                                      ? "bg-[#003B3A] hover:bg-[#005854] text-white shadow-2xs"
                                      : "bg-white text-[#003B3A] border border-[#E2E8F0] hover:border-[#008B85] hover:bg-[#F0FDFA]"
                                  }`}
                                >
                                  <ClipboardCheck className={`w-3.5 h-3.5 ${isSelected || isPending ? "text-[#00A19A]" : "text-[#008B85]"}`} />
                                  <span>Xét duyệt</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredReportStudents.length === 0 && (
                        <tr>
                          <td colSpan={14} className="py-12 text-center text-xs font-medium text-slate-400">
                            Không tìm thấy hồ sơ học sinh nào khớp với bộ lọc hiện tại
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {renderReportPaginationControl()}
              </div>

              {selectedReportStudent && (() => {
                // --- 1. Giải mã Học bạ & Thông tin Học sinh ---
                let parsedKqHocTap: any = null;
                const rawKq = selectedReportStudent?.kqHocTap;
                if (typeof rawKq === "string" && rawKq.trim().startsWith("{")) {
                  try {
                    parsedKqHocTap = JSON.parse(rawKq);
                  } catch {}
                } else if (rawKq && typeof rawKq === "object") {
                  parsedKqHocTap = rawKq;
                }

                const matchTranscriptSubject = (rawName: string, keywords: string[]) => {
                  const norm = String(rawName || "")
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .trim();
                  if (!norm) return false;
                  return keywords.some(kw => {
                    if (kw === "van") {
                      return /(^|\s|\/|-)van($|\s|\/|-)/.test(norm) && !norm.includes("van dap");
                    }
                    return norm.includes(kw);
                  });
                };

                const findTranscriptSubjectScore = (keywords: string[]) => {
                  if (parsedKqHocTap?.scores && typeof parsedKqHocTap.scores === "object") {
                    for (const [k, v] of Object.entries(parsedKqHocTap.scores)) {
                      if (matchTranscriptSubject(k, keywords) && v !== null && v !== undefined && String(v).trim() !== "") {
                        return String(v).trim();
                      }
                    }
                  }
                  const subjectArrays = [
                    parsedKqHocTap?.moet?.subjects,
                    parsedKqHocTap?.bilingual?.moetSubjects,
                    parsedKqHocTap?.bilingual?.internationalSubjects,
                    parsedKqHocTap?.foreign?.subjects,
                    parsedKqHocTap?.homeschool?.subjects
                  ];
                  for (const arr of subjectArrays) {
                    if (Array.isArray(arr)) {
                      for (const sub of arr) {
                        const sName = String(sub?.name || sub?.id || "");
                        if (matchTranscriptSubject(sName, keywords) && sub?.score !== null && sub?.score !== undefined && String(sub.score).trim() !== "") {
                          return String(sub.score).trim();
                        }
                      }
                    }
                  }
                  return "";
                };

                const cleanTranscriptRating = (val?: string | null) => {
                  if (!val || typeof val !== "string") return "";
                  let text = val.trim();
                  if (!text || text.startsWith("{")) return "";
                  if (text.includes("Trường cũ") || text.includes("Đối tượng:")) {
                    const cleanLines = text
                      .split(/[\r\n]+/)
                      .map(l => l.trim())
                      .filter(l => l && !l.includes("Trường cũ") && !l.includes("Đối tượng:"));
                    text = cleanLines[0] || "";
                  }
                  return text.trim();
                };

                const hbHocTap =
                  cleanTranscriptRating(parsedKqHocTap?.overallRating) ||
                  cleanTranscriptRating(parsedKqHocTap?.moet?.overallRating) ||
                  cleanTranscriptRating(parsedKqHocTap?.bilingual?.moetRating) ||
                  cleanTranscriptRating(parsedKqHocTap?.bilingual?.internationalRating) ||
                  cleanTranscriptRating(parsedKqHocTap?.foreign?.gpaOrHonors) ||
                  cleanTranscriptRating(parsedKqHocTap?.homeschool?.overallEvaluation) ||
                  cleanTranscriptRating(parsedKqHocTap?.hocTap) ||
                  cleanTranscriptRating(parsedKqHocTap?.academicRating) ||
                  cleanTranscriptRating(parsedKqHocTap?.nangLuc) ||
                  cleanTranscriptRating(typeof rawKq === "string" ? rawKq : "") ||
                  cleanTranscriptRating(selectedReportStudent?.academicRating) ||
                  cleanTranscriptRating(selectedReportStudent?.kqgdTieuHoc) ||
                  "—";

                const hbRenLuyen =
                  cleanTranscriptRating(parsedKqHocTap?.moet?.conductRating) ||
                  cleanTranscriptRating(parsedKqHocTap?.renLuyen) ||
                  cleanTranscriptRating(parsedKqHocTap?.phamChat) ||
                  cleanTranscriptRating(typeof selectedReportStudent?.kqRenLuyen === "string" ? selectedReportStudent.kqRenLuyen : "") ||
                  cleanTranscriptRating(selectedReportStudent?.conductRating) ||
                  "—";

                const hbMath = findTranscriptSubjectScore(["toan", "math"]) || "—";
                const hbLiterature = findTranscriptSubjectScore(["ngu van", "tieng viet", "van", "vietnamese", "literature"]) || "—";
                const hbEnglish = findTranscriptSubjectScore(["tieng anh", "ngoai ngu", "english", "esl"]) || "—";
                const gradeNum = parseInt(String(selectedReportStudent?.grade || "1").replace(/\D/g, ""), 10) || 1;
                const vnSubjectLabel = gradeNum <= 5 ? "Tiếng Việt (HB)" : "Ngữ văn (HB)";
                const isCuidLike = (val?: string | null) =>
                  Boolean(val && /^(cm|cl)[a-z0-9]{15,}$/i.test(String(val).trim()));
                const resolveCampusDisplay = () => {
                  const foundCampus = campuses.find(c => c.id === selectedReportStudent?.registeredCampus || c.id === selectedReportStudent?.admissionCampus);
                  if (foundCampus?.campusCode) return foundCampus.campusCode;
                  if (foundCampus?.campusName) return foundCampus.campusName;
                  const cCode = selectedReportStudent?.batch?.campus?.campusCode;
                  const cName = selectedReportStudent?.batch?.campus?.campusName;
                  if (cCode && !isCuidLike(cCode)) return cCode;
                  if (cName && !isCuidLike(cName)) return cName;
                  const adm = selectedReportStudent?.admissionCampus;
                  if (adm && !isCuidLike(adm)) return adm;
                  const reg = selectedReportStudent?.registeredCampus;
                  if (reg && !isCuidLike(reg)) return reg;
                  const bName = String(selectedReportStudent?.batch?.name || "");
                  const m = bName.match(/\b(CS\d+)\b/i);
                  if (m) return m[1].toUpperCase();
                  return "Sky-Line";
                };
                const campusName = resolveCampusDisplay();
                const genderDisplay =
                  selectedReportStudent.gender === "M" || selectedReportStudent.gender === "Nam"
                    ? "Nam"
                    : selectedReportStudent.gender === "F" || selectedReportStudent.gender === "Nữ"
                    ? "Nữ"
                    : selectedReportStudent.gender || "—";
                const dobDisplay = selectedReportStudent.dateOfBirth
                  ? new Date(selectedReportStudent.dateOfBirth).toLocaleDateString("vi-VN")
                  : "—";
                const eduSystemDisplay =
                  orientationData?.proposedEduSystem ||
                  selectedReportStudent.surveyFormType ||
                  selectedReportStudent.surveySystem ||
                  "HNS";

                // --- 2. Giải mã Phiếu phỏng vấn định hướng HS và trao đổi với PHHS (BM.KTĐBCL.31..42) ---
                const gradeConfig = getOrientationGradeGroupConfig(selectedReportStudent.grade);
                const dossierGradeNum = normalizeK12GradeNumber(selectedReportStudent.grade) || "1";
                const defaultPvdhCode = getDefaultPvdhCodeForGrade(selectedReportStudent.grade) || "BM.KTĐBCL.31";
                const seedPvdhTemplate =
                  PVDH_SEED_TEMPLATES.find((t) => t.code === (pvdhWorkspace?.version?.templateCode || selectedReportStudent?.pvdhRecord?.templateCode || defaultPvdhCode)) ||
                  PVDH_SEED_TEMPLATES.find((t) => t.code === defaultPvdhCode) ||
                  PVDH_SEED_TEMPLATES[0];

                const pvdhCodeDisplay = pvdhWorkspace?.version?.templateCode || seedPvdhTemplate.code;
                const pvdhVersionDisplay = pvdhWorkspace?.version?.versionCode || "v1.0";
                const pvdhNameDisplay =
                  pvdhWorkspace?.template?.name ||
                  seedPvdhTemplate.name;
                const pvdhDescriptionDisplay =
                  pvdhWorkspace?.template?.description ||
                  seedPvdhTemplate.description;

                const activePvdhFields: PvdhFieldConfig[] =
                  Array.isArray(pvdhWorkspace?.version?.fields) && pvdhWorkspace.version.fields.length > 0
                    ? pvdhWorkspace.version.fields
                    : seedPvdhTemplate.fields;

                const pvdhRec = pvdhWorkspace?.record || null;

                let rawItems: any[] = [];
                let rawParentItems: any[] = [];
                let rawSummary9: any = null;
                let rawVerification: any = null;

                if (orientationData?.interviewData) {
                  try {
                    const parsed = typeof orientationData.interviewData === "string"
                      ? JSON.parse(orientationData.interviewData)
                      : orientationData.interviewData;
                    if (Array.isArray(parsed)) {
                      rawItems = parsed;
                    } else if (parsed && typeof parsed === "object") {
                      rawItems = Array.isArray(parsed.items)
                        ? parsed.items
                        : Array.isArray(parsed.criteriaResults)
                        ? parsed.criteriaResults
                        : [];
                      rawParentItems = Array.isArray(parsed.parentItems) ? parsed.parentItems : [];
                      rawSummary9 = parsed.summary9Items || null;
                      rawVerification = parsed.verification || null;
                    }
                  } catch {}
                }

                if (rawParentItems.length === 0 && orientationData?.parentInterviewData) {
                  try {
                    const pParsed = typeof orientationData.parentInterviewData === "string"
                      ? JSON.parse(orientationData.parentInterviewData)
                      : orientationData.parentInterviewData;
                    if (Array.isArray(pParsed)) rawParentItems = pParsed;
                  } catch {}
                }

                // II. Trao đổi với học sinh (6 nhóm theo cấu hình PVDH)
                const pvdhStudentFields = activePvdhFields
                  .filter((f) => f.sectionCode === "II_STUDENT")
                  .sort((a, b) => a.sortOrder - b.sortOrder);

                const configuredStudentCriteria = pvdhStudentFields.map((field, idx) => {
                  const recItem = pvdhRec?.studentResponses?.[field.fieldKey];
                  const legacyMatched = rawItems[idx] || {};
                  const fallbackAnswer =
                    legacyMatched.studentNotes ||
                    legacyMatched.answer ||
                    legacyMatched.a ||
                    legacyMatched.notes ||
                    "";
                  const responseText = recItem?.responseText?.trim() || fallbackAnswer || "";
                  const notRecorded = Boolean(recItem?.notRecorded);
                  const notRecordedReason = recItem?.notRecordedReason || "";

                  return {
                    idx: field.itemNumber || idx + 1,
                    fieldKey: field.fieldKey,
                    label: field.label,
                    promptQuestion: field.promptQuestion || "",
                    guideline: field.guideline || "",
                    responseText,
                    notRecorded,
                    notRecordedReason,
                    updatedByName: recItem?.updatedByName || "",
                  };
                });

                // III. Ghi nhận của giáo viên (4 trường theo cấu hình PVDH)
                const pvdhTeacherFields = activePvdhFields
                  .filter((f) => f.sectionCode === "III_TEACHER")
                  .sort((a, b) => a.sortOrder - b.sortOrder);

                const bmSummary =
                  pvdhRec?.teacherSummary ||
                  parseTeacherSummary(pvdhRec?.teacherSummaryJson || selectedReportStudent?.pvdhRecord?.teacherSummaryJson);

                const summary9 = {
                  strongPoints:
                    bmSummary.d01 ||
                    pvdhRec?.obsStrengthsInterests ||
                    pvdhRec?.planStrengthsPriority ||
                    rawSummary9?.strongPoints ||
                    orientationData?.studentStrengths ||
                    orientationData?.strengths ||
                    "",
                  interestsMotivation:
                    pvdhRec?.obsCommunicationStyle ||
                    rawSummary9?.interestsMotivation ||
                    orientationData?.talents ||
                    "",
                  adaptabilityAutonomy:
                    pvdhRec?.obsParticipationLevel ||
                    rawSummary9?.adaptabilityAutonomy ||
                    (orientationData?.adaptationLevel === "CONFIDENT" ? "Thích nghi nhanh, tự tin và chủ động" : ""),
                  difficultiesNeeds:
                    bmSummary.d02 ||
                    pvdhRec?.obsSupportNeeds ||
                    rawSummary9?.difficultiesNeeds ||
                    orientationData?.studentNeedsSupport ||
                    orientationData?.growthAreas ||
                    "",
                  studentExpectations: rawSummary9?.studentExpectations || "",
                  parentExpectations: rawSummary9?.parentExpectations || orientationData?.parentExpectations || "",
                  alignmentDifferences:
                    bmSummary.d03 ||
                    rawSummary9?.alignmentDifferences ||
                    "",
                  initialRecommendations:
                    bmSummary.d04 ||
                    pvdhRec?.planGoalsActionsText ||
                    pvdhRec?.planHandoverNotes ||
                    rawSummary9?.initialRecommendations ||
                    orientationData?.proposedPlacementRecommendation ||
                    orientationData?.interviewerGeneralRemark ||
                    "",
                  verificationItems: rawSummary9?.verificationItems || ""
                };

                const configuredTeacherObs = pvdhTeacherFields.map((field, idx) => {
                  let val = "";
                  if (field.fieldKey === "obs_strengths_interests") {
                    val = pvdhRec?.obsStrengthsInterests || summary9.strongPoints || "";
                  } else if (field.fieldKey === "obs_communication_style") {
                    val = pvdhRec?.obsCommunicationStyle || orientationData?.behaviorNotes || "";
                  } else if (field.fieldKey === "obs_participation_level") {
                    val = pvdhRec?.obsParticipationLevel || summary9.adaptabilityAutonomy || "";
                  } else if (field.fieldKey === "obs_support_needs") {
                    val = pvdhRec?.obsSupportNeeds || summary9.difficultiesNeeds || "";
                  } else {
                    val = (pvdhRec as any)?.[field.fieldKey] || "";
                  }
                  return {
                    idx: field.itemNumber || idx + 1,
                    fieldKey: field.fieldKey,
                    label: field.label,
                    guideline: field.guideline || "",
                    value: val,
                  };
                });

                // IV / B & C. Trao đổi với PHHS
                const isBmDossier = isBmKtdbclTemplate({
                  exportLayout: pvdhWorkspace?.version?.exportLayout || seedPvdhTemplate.exportLayout,
                  fields: activePvdhFields,
                  templateCode: pvdhCodeDisplay,
                });

                const pvdhParentFields = activePvdhFields
                  .filter((f) => f.sectionCode === "IV_PARENT")
                  .sort((a, b) => a.sortOrder - b.sortOrder);

                const pvdhParentGradeCFields = activePvdhFields
                  .filter((f) => f.sectionCode === "C_PARENT_GRADE")
                  .sort((a, b) => a.sortOrder - b.sortOrder);

                const configuredParentGroups = pvdhParentFields.map((field, idx) => {
                  const recItem = pvdhRec?.parentResponses?.[field.fieldKey];
                  const legacyMatched = rawParentItems[idx] || {};
                  const fallbackAnswer =
                    legacyMatched.answer ||
                    (idx === 0 ? (orientationData?.parentPersonalityNotes || orientationData?.homeHabits) :
                     idx === 1 ? orientationData?.parentHealthNotes :
                     idx === 2 ? orientationData?.parentSpecialRequests :
                     idx === 3 ? orientationData?.cooperationCommitment :
                     idx === 4 ? orientationData?.parentExpectations : "") ||
                    "";
                  const responseText = recItem?.responseText?.trim() || fallbackAnswer || "";
                  const notRecorded = Boolean(recItem?.notRecorded);
                  const notRecordedReason = recItem?.notRecordedReason || "";

                  return {
                    idx: field.itemNumber || idx + 1,
                    fieldKey: field.fieldKey,
                    label: field.label,
                    promptQuestion: field.promptQuestion || "",
                    guideline: field.guideline || "",
                    sensitive: field.sensitivityTier === "SENSITIVE_HEALTH_PSYCH",
                    responseText,
                    notRecorded,
                    notRecordedReason,
                    updatedByName: recItem?.updatedByName || "",
                  };
                });

                const configuredParentGradeCGroups = pvdhParentGradeCFields.map((field, idx) => {
                  const recItem = pvdhRec?.parentResponses?.[field.fieldKey];
                  return {
                    idx: idx + 1,
                    fieldKey: field.fieldKey,
                    label: field.label,
                    promptQuestion: field.promptQuestion || "",
                    responseText: recItem?.responseText?.trim() || "",
                    notRecorded: Boolean(recItem?.notRecorded),
                    notRecordedReason: recItem?.notRecordedReason || "",
                  };
                });

                // V. Thống nhất định hướng & hỗ trợ
                const pvdhOrientationPlan = {
                  strengthsPriority: pvdhRec?.planStrengthsPriority || summary9.strongPoints || "",
                  goalsActionsText:
                    pvdhRec?.planGoalsActionsText ||
                    (Array.isArray(pvdhRec?.followUpActions) && pvdhRec.followUpActions.length > 0
                      ? formatFollowUpActionsToText(pvdhRec.followUpActions)
                      : "") ||
                    summary9.initialRecommendations ||
                    "",
                  followUpActions: Array.isArray(pvdhRec?.followUpActions) ? pvdhRec.followUpActions : [],
                  coordinator: pvdhRec?.planCoordinator || "",
                  reviewDate: pvdhRec?.planReviewDate || "",
                  furtherTopics: Array.isArray(pvdhRec?.planFurtherTopics) ? pvdhRec.planFurtherTopics : [],
                  furtherOtherText: pvdhRec?.planFurtherOtherText || "",
                  referralReason: pvdhRec?.planReferralReason || "",
                  referralReceiver: pvdhRec?.planReferralReceiver || "",
                  handoverNotes: pvdhRec?.planHandoverNotes || orientationData?.admissionConsultantNote || "",
                };

                const hasPvdhContent =
                  Boolean(pvdhRec?.id || selectedReportStudent?.pvdhRecord?.id) ||
                  configuredStudentCriteria.some((x) => x.responseText.trim() !== "" || x.notRecorded) ||
                  configuredTeacherObs.some((x) => x.value.trim() !== "") ||
                  configuredParentGroups.some((x) => x.responseText.trim() !== "" || x.notRecorded) ||
                  configuredParentGradeCGroups.some((x) => x.responseText.trim() !== "" || x.notRecorded) ||
                  Boolean(
                    bmSummary.d01?.trim() ||
                    bmSummary.d02?.trim() ||
                    bmSummary.d03?.trim() ||
                    bmSummary.d04?.trim() ||
                    bmSummary.sheetStatus ||
                    bmSummary.psychInterviewRequested
                  ) ||
                  Boolean(pvdhOrientationPlan.strengthsPriority.trim() || pvdhOrientationPlan.goalsActionsText.trim() || pvdhOrientationPlan.handoverNotes.trim()) ||
                  Boolean(orientationData?.interviewerName || orientationData?.interviewData || orientationData?.parentInterviewData);

                const pvdhWorkflowStatusKey = (pvdhRec?.workflowStatus || "DRAFT") as keyof typeof PVDH_WORKFLOW_STATUS_LABELS;
                const pvdhWorkflowInfo = PVDH_WORKFLOW_STATUS_LABELS[pvdhWorkflowStatusKey] || PVDH_WORKFLOW_STATUS_LABELS.DRAFT;

                const verStatus =
                  pvdhRec?.isLocked || pvdhRec?.workflowStatus === "VERIFIED_LOCKED" || pvdhRec?.workflowStatus === "HANDED_OVER"
                    ? "VERIFIED"
                    : rawVerification?.status || orientationData?.verificationStatus || "PENDING";
                const realScoreCount = (selectedReportStudent.scores || []).length;
                const parsedHistory = parseApprovalHistory(selectedReportStudent?.directorNote);
                const quickSurveyPills = getStudentSurveyPills(selectedReportStudent);

                return (
                  <div
                    className="fixed inset-0 z-[180] flex items-center justify-center p-1.5 sm:p-3"
                    onClick={() => setReportStudentId("")}
                  >
                    <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-[2px]" />

                    {/* FULL-VIEWPORT ACADEMIC LEDGER SPLIT WORKBENCH */}
                    <div
                      className="relative bg-[#F8FAFC] w-full max-w-[1440px] h-[96vh] sm:h-[94vh] rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 text-left"
                      onClick={e => e.stopPropagation()}
                    >
                      {/* ================= TOP DOSSIER HEADER ================= */}
                      <div className="bg-white border-b border-slate-200 px-3.5 sm:px-5 py-2.5 shrink-0 relative">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#003B3A]" />
                        <div className="pl-2 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                          {/* Left: Student Identity & Live Status */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap tabular-nums">
                              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                                {selectedReportStudent.fullName}
                              </h3>
                              <span className="font-mono text-xs font-bold text-[#00736E] bg-[#F0FDFA] px-2 py-0.5 rounded-md border border-[#CCFBF1]">
                                {selectedReportStudent.studentCode}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-[#003B3A] text-white text-xs font-semibold">
                                Khối {selectedReportStudent.grade || "—"}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold">
                                Hệ {eduSystemDisplay}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1] text-xs font-bold">
                                {campusName}
                              </span>

                              {selectedReportStudent.admissionResult ? (
                                <span className={`font-bold px-2.5 py-0.5 rounded-lg text-xs inline-flex items-center gap-1.5 border ${
                                  selectedReportStudent.admissionResult.includes("Không")
                                    ? "text-rose-800 bg-rose-50 border-rose-200"
                                    : selectedReportStudent.admissionResult.includes("cam kết") || selectedReportStudent.admissionResult === "Học thử"
                                    ? "text-amber-900 bg-amber-50 border-amber-200"
                                    : "text-emerald-800 bg-emerald-50 border-emerald-200"
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    selectedReportStudent.admissionResult.includes("Không")
                                      ? "bg-rose-500"
                                      : selectedReportStudent.admissionResult.includes("cam kết") || selectedReportStudent.admissionResult === "Học thử"
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                  }`} />
                                  {selectedReportStudent.admissionResult === "Đạt" ? "Đạt chuẩn" : selectedReportStudent.admissionResult}
                                </span>
                              ) : (
                                <span className="font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg text-xs inline-flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  Chờ Hội đồng duyệt
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] sm:text-xs text-slate-500 mt-0.5 tabular-nums">
                              <span>Ngày sinh: <strong className="text-slate-700 font-medium">{dobDisplay} ({genderDisplay})</strong></span>
                              {selectedReportStudent.targetType && (
                                <span>&bull; Đối tượng: <strong className="text-slate-700 font-medium">{selectedReportStudent.targetType}</strong></span>
                              )}
                              {selectedReportStudent.admissionCriteria && (
                                <span>&bull; Diện KS: <strong className="text-slate-700 font-medium">{selectedReportStudent.admissionCriteria}</strong></span>
                              )}
                              {autoCampusDirectorName && (
                                <span>
                                  &bull; GĐCS phụ trách:{" "}
                                  <strong className="text-[#00736E] font-semibold">
                                    {autoCampusDirectorName}
                                  </strong>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: Quick Student Switcher + Next Pending + Export PDF + Close */}
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap self-end lg:self-center shrink-0">
                            {dossierNav.total > 1 && (
                              <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/90 tabular-nums">
                                <button
                                  type="button"
                                  disabled={!dossierNav.prevId}
                                  onClick={() => dossierNav.prevId && setReportStudentId(dossierNav.prevId)}
                                  className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white hover:text-[#003B3A] disabled:opacity-35 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Học sinh trước (Alt + Mũi tên trái)"
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Trước</span>
                                </button>
                                <span className="px-2 text-xs font-bold text-slate-700 select-none">
                                  {dossierNav.index} / {dossierNav.total}
                                </span>
                                <button
                                  type="button"
                                  disabled={!dossierNav.nextId}
                                  onClick={() => dossierNav.nextId && setReportStudentId(dossierNav.nextId)}
                                  className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white hover:text-[#003B3A] disabled:opacity-35 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Học sinh tiếp theo (Alt + Mũi tên phải)"
                                >
                                  <span className="hidden sm:inline">Tiếp</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {dossierNav.nextPendingId && dossierNav.nextPendingId !== selectedReportStudent.id && (
                              <button
                                type="button"
                                onClick={() => setReportStudentId(dossierNav.nextPendingId)}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Chuyển nhanh đến hồ sơ chưa duyệt kế tiếp"
                              >
                                <span>HS chờ duyệt tiếp</span>
                                <ArrowRight className="w-3.5 h-3.5 text-amber-700" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setIsOrientationReportModalOpen(true)}
                              className="px-3 py-1.5 bg-white hover:bg-[#F0FDFA] text-[#003B3A] border border-slate-200 hover:border-[#008B85] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              title="Xem và xuất file PDF khổ A4 toàn bộ hồ sơ để Giáo viên & Hội đồng ký"
                            >
                              <Printer className="w-3.5 h-3.5 text-[#008B85]" />
                              <span className="hidden sm:inline">Xuất PDF hồ sơ</span>
                              <span className="sm:hidden">PDF</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setReportStudentId("")}
                              className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                              title="Đóng cửa sổ (Esc)"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* RESPONSIVE MOBILE / TABLET PANE SWITCHER (< 1024px) */}
                        <div className="lg:hidden mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setMobileDossierPane("evidence")}
                            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                              mobileDossierPane === "evidence"
                                ? "bg-[#003B3A] text-white shadow-2xs"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>1. Hồ sơ &amp; Điểm ({realScoreCount} môn)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setMobileDossierPane("decision")}
                            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                              mobileDossierPane === "decision"
                                ? "bg-[#008B85] text-white shadow-2xs"
                                : "bg-[#F0FDFA] text-[#003B3A] border border-[#99F6E4]"
                            }`}
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            <span>2. Phê duyệt ({reportForm.admissionResult || "Chờ duyệt"})</span>
                          </button>
                        </div>
                      </div>

                      {/* ================= SPLIT 2-PANE WORKSPACE ================= */}
                      <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 overflow-hidden">
                        {/* -------- LEFT PANE (8 COLS): EVIDENCE & DOSSIER -------- */}
                        <div className={`${mobileDossierPane === "decision" ? "hidden lg:block" : "block"} lg:col-span-8 h-full overflow-y-auto px-3.5 sm:px-5 pb-5 pt-3 space-y-3`}>
                          {/* UNIFIED QUICK EVIDENCE STRIP: ĐIỂM KHẢO SÁT (LUÔN HIỂN THỊ) + HỌC BẠ THU GỌN */}
                          <div className="bg-white rounded-xl border border-slate-200/90 p-2.5 sm:p-3 shadow-[0_1px_2px_rgba(15,23,42,0.02)] space-y-2 tabular-nums">
                            {/* Dòng 1: Điểm khảo sát đầu vào 1 chạm (Giúp GĐCS luôn thấy điểm khi đang xem Phiếu định hướng) */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] font-bold text-[#003B3A] mr-0.5">Điểm khảo sát:</span>
                                {quickSurveyPills.length > 0 ? (
                                  quickSurveyPills.map((p) => (
                                    <button
                                      key={p.key}
                                      type="button"
                                      onClick={() => {
                                        setDossierActiveTab("scores");
                                        if (p.key && !String(p.key).startsWith("ori-")) {
                                          setActiveSubjectId(String(p.key));
                                        }
                                      }}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                        p.tone === "emerald"
                                          ? "bg-emerald-50/80 text-emerald-800 border-emerald-200 hover:border-emerald-400"
                                          : p.tone === "amber"
                                          ? "bg-amber-50 text-amber-900 border-amber-300 hover:border-amber-400"
                                          : p.tone === "rose"
                                          ? "bg-rose-50/80 text-rose-800 border-rose-200 hover:border-rose-400"
                                          : "bg-[#F0FDFA] text-[#003B3A] border-[#CCFBF1] hover:border-[#008B85]"
                                      }`}
                                      title={
                                        p.nonScoring
                                          ? "Môn Tiếng Anh (vấn đáp) không xét kết quả Đạt/Không đạt (chỉ tham khảo xếp lớp)"
                                          : "Chạm để xem chi tiết phiếu chấm môn này"
                                      }
                                    >
                                      <span className="opacity-80">{p.label}:</span>
                                      <strong className="font-bold">{p.value}</strong>
                                      {p.nonScoring && (
                                        <span className="ml-0.5 px-1 py-0 rounded text-[9px] font-bold bg-amber-200/70 text-amber-950">
                                          Không xét KQ
                                        </span>
                                      )}
                                    </button>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">Chưa ghi nhận điểm bộ môn</span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500">
                                Trường cũ: <strong className="text-slate-800">{selectedReportStudent.oldSchoolName || "—"}</strong>
                              </span>
                            </div>

                            {/* Dòng 2: Học bạ thu gọn 1 dòng */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
                              <span>Học tập (HB): <strong className="text-emerald-800 font-bold">{hbHocTap}</strong></span>
                              <span>Rèn luyện (HB): <strong className="text-[#00736E] font-bold">{hbRenLuyen}</strong></span>
                              <span>Toán (HB): <strong className="text-slate-900 font-bold">{hbMath}</strong></span>
                              <span>{vnSubjectLabel}: <strong className="text-slate-900 font-bold">{hbLiterature}</strong></span>
                              <span>Tiếng Anh (HB): <strong className="text-slate-900 font-bold">{hbEnglish}</strong></span>
                            </div>
                          </div>

                          {/* STICKY SEGMENTED TAB BAR FOR LEFT PANE */}
                          <div className="sticky -top-3 z-20 bg-[#F8FAFC] pt-1 pb-1 -mx-1 px-1">
                            <div className="bg-white p-1.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1 text-xs tabular-nums">
                                <button
                                  type="button"
                                  onClick={() => setDossierActiveTab("scores")}
                                  className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                    dossierActiveTab === "scores"
                                      ? "bg-[#003B3A] text-white shadow-2xs"
                                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                  }`}
                                >
                                  <BarChart3 className={`w-3.5 h-3.5 ${dossierActiveTab === "scores" ? "text-[#5EEAD4]" : "text-[#008B85]"}`} />
                                  <span>Kết quả khảo sát</span>
                                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    dossierActiveTab === "scores" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                                  }`}>
                                    {realScoreCount} môn
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setDossierActiveTab("orientation")}
                                  className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                    dossierActiveTab === "orientation"
                                      ? "bg-[#003B3A] text-white shadow-2xs"
                                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                  }`}
                                >
                                  <Compass className={`w-3.5 h-3.5 ${dossierActiveTab === "orientation" ? "text-[#5EEAD4]" : "text-[#008B85]"}`} />
                                  <span>Phiếu định hướng HS &amp; PH</span>
                                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    dossierActiveTab === "orientation"
                                      ? "bg-white/20 text-white"
                                      : hasPvdhContent
                                      ? "bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]"
                                      : "bg-amber-50 text-amber-800"
                                  }`}>
                                    {hasPvdhContent ? `Đã cập nhật (${pvdhCodeDisplay})` : `${gradeConfig.label} • ${pvdhCodeDisplay}`}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setDossierActiveTab("all")}
                                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                                    dossierActiveTab === "all"
                                      ? "bg-[#003B3A] text-white shadow-2xs"
                                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                  }`}
                                >
                                  Xem toàn bộ
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {canAdminEditScores && (dossierActiveTab === "scores" || dossierActiveTab === "all") && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenAddScore();
                                    }}
                                    className="px-2.5 py-1.5 bg-[#F0FDFA] hover:bg-[#CCFBF1]/70 text-[#003B3A] border border-[#99F6E4] rounded-lg font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Nhập bổ sung điểm môn khảo sát cho học sinh này (chỉ Admin)"
                                  >
                                    <Plus className="w-3.5 h-3.5 text-[#00736E]" />
                                    <span>Bổ sung điểm</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPvdhModalInitialSection("FULL_FORM");
                                    setIsPvdhModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                  title={`Nhập hoặc chỉnh sửa ${pvdhNameDisplay} (${pvdhCodeDisplay})`}
                                >
                                  <Pencil className="w-3.5 h-3.5 text-[#008B85]" />
                                  <span>Phiếu {pvdhCodeDisplay}</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* ================= SECTION: KẾT QUẢ KHẢO SÁT CÁC MÔN ================= */}
                          {(dossierActiveTab === "scores" || dossierActiveTab === "all") && (
                            <div className="space-y-4">
                              {(!selectedReportStudent.scores || selectedReportStudent.scores.length === 0) ? (
                                <div className="bg-white border border-slate-200/90 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-2.5">
                                  <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                    <BookOpen className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-800 text-xs">Chưa ghi nhận điểm bài khảo sát</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Học sinh chưa có điểm chấm bộ môn hoặc thuộc diện xét tuyển thẳng / phỏng vấn định hướng.</p>
                                  </div>
                                  {canAdminEditScores && (
                                    <button
                                      type="button"
                                      onClick={handleOpenAddScore}
                                      className="mt-1 px-3.5 py-1.5 bg-[#003B3A] hover:bg-[#005854] text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5 text-[#5EEAD4]" />
                                      <span>Nhập điểm môn khảo sát</span>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                (() => {
                                  const scoresList = [...(selectedReportStudent.scores || [])];
                                  const getNumericGrade = (g: any) => {
                                    if (!g) return null;
                                    const match = g.toString().match(/\d+/);
                                    return match ? parseInt(match[0], 10) : null;
                                  };
                                  const studentNumGrade = getNumericGrade(selectedReportStudent.grade);
                                  const isGrade1 = studentNumGrade === 1;
                                  const isGrade2 = studentNumGrade === 2;

                                  const parseMaxFromComment = (commentVal: any) => {
                                    if (!commentVal) return null;
                                    let text = "";
                                    if (Array.isArray(commentVal)) {
                                      text = commentVal.join(" ");
                                    } else if (typeof commentVal === "string") {
                                      try {
                                        const p = JSON.parse(commentVal);
                                        text = Array.isArray(p) ? p.join(" ") : String(p || "");
                                      } catch {
                                        text = commentVal;
                                      }
                                    }
                                    const m = text.match(/(?:Note:\s*)?(?:\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/i);
                                    if (m && m[1]) {
                                      const num = parseFloat(m[1]);
                                      if (!isNaN(num) && num > 0) return num;
                                    }
                                    return null;
                                  };

                                  const hasEnglish = scoresList.some((sc) => {
                                    const sName = (sc.subject?.name || "").toLowerCase().normalize("NFC");
                                    const sCode = (sc.subject?.code || "").toLowerCase();
                                    return sName.includes("tiếng anh") || sCode.includes("eng") || sCode.includes("esl");
                                  });

                                  let hasOralSubject = false;
                                  let hasWrittenSubject = false;
                                  let oralScoreVal: number | null = null;
                                  let writtenScoreVal: number | null = null;
                                  let oralScoreText = "—";
                                  let writtenScoreText = "—";
                                  // Chuẩn hóa Tiếng Anh (vấn đáp & viết) theo thang điểm 10, không tính điểm tổng môn Tiếng Anh
                                  let oralMaxScore = 10;
                                  let writtenMaxScore = 10;
                                  let totalMaxScore = 10;

                                  if (hasEnglish) {
                                    scoresList.forEach((sc) => {
                                      const sName = (sc.subject?.name || "").toLowerCase().normalize("NFC");
                                      const sCode = (sc.subject?.code || "").toLowerCase();
                                      if (sName.includes("tiếng anh") || sCode.includes("eng") || sCode.includes("esl")) {
                                        let scoreVal = undefined;
                                        try {
                                          if (sc.scores) {
                                            const parsed = JSON.parse(sc.scores);
                                            const vArr = Array.isArray(parsed) ? parsed : [parsed];
                                            scoreVal = vArr.find(x => x !== undefined && x !== "" && x !== null);
                                          }
                                        } catch {}

                                        const maxFromCmt = parseMaxFromComment(sc.comments);

                                        if (sName.includes("vấn đáp") || sName.includes("nói") || sCode.includes("speaking") || sCode.includes("oral") || sCode.includes("vd")) {
                                          hasOralSubject = true;
                                          if (maxFromCmt) {
                                            oralMaxScore = maxFromCmt;
                                          } else if (scoreVal !== undefined && scoreVal !== null && scoreVal !== "") {
                                            const num = parseFloat(scoreVal);
                                            if (!isNaN(num) && num > 10) {
                                              oralMaxScore = num <= 30 ? 30 : 100;
                                            } else {
                                              oralMaxScore = 10;
                                            }
                                          }
                                          if (scoreVal !== undefined && scoreVal !== null && scoreVal !== "") {
                                            oralScoreVal = parseFloat(scoreVal);
                                            oralScoreText = scoreVal.toString();
                                          }
                                        } else if (sName.includes("viết") || sCode.includes("writing") || sCode.includes("written") || sCode.includes("vt")) {
                                          hasWrittenSubject = true;
                                          if (maxFromCmt) {
                                            writtenMaxScore = maxFromCmt;
                                          } else if (scoreVal !== undefined && scoreVal !== null && scoreVal !== "") {
                                            const num = parseFloat(scoreVal);
                                            if (!isNaN(num) && num > 10) {
                                              writtenMaxScore = num <= 70 ? 70 : 100;
                                            } else {
                                              writtenMaxScore = 10;
                                            }
                                          }
                                          if (scoreVal !== undefined && scoreVal !== null && scoreVal !== "") {
                                            writtenScoreVal = parseFloat(scoreVal);
                                            writtenScoreText = scoreVal.toString();
                                          }
                                        }
                                      }
                                    });
                                  }

                                  return (
                                    <>
                                      {/* BẢNG TỔNG HỢP ĐIỂM & NHẬN XÉT CÁC MÔN */}
                                      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
                                        <div className="px-4 py-3 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between gap-2">
                                          <div>
                                            <h4 className="text-xs font-bold text-slate-900">Bảng tổng hợp kết quả &amp; nhận xét chuyên môn</h4>
                                            <p className="text-[11px] text-slate-500 mt-0.5">Nhấn vào từng dòng môn học để xem phiếu chấm chi tiết bên dưới</p>
                                          </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-left border-collapse text-xs tabular-nums">
                                            <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                                              <tr className="border-b text-[11px] font-semibold">
                                                <th className="py-2.5 px-3.5 w-[26%] font-semibold">Môn khảo sát</th>
                                                <th className="py-2.5 px-3 w-[20%] text-center font-semibold">Kết quả / Mức đạt</th>
                                                <th className="py-2.5 px-3.5 font-semibold">Nhận xét chuyên môn của giáo viên</th>
                                                <th className="py-2.5 px-3 w-28 text-right font-semibold">Thao tác</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#E2E8F0]">
                                              {scoresList.map((sc) => {
                                                const subject = sc.subject || {};
                                                const sName = subject.name || "Môn học";
                                                const sCode = (subject.code || "").toLowerCase();
                                                const sNameNormalized = sName.toLowerCase().normalize("NFC");
                                                const isOrientation = sCode.includes("pdh") || sCode.includes("orientation") || sNameNormalized.includes("định hướng");
                                                const isTciRow = sCode.includes("tci") || sCode.includes("cpt") || sNameNormalized.includes("chuẩn phát triển") || sNameNormalized.includes("bộ chuẩn phát triển");
                                                const isOralEnglishNonScoring =
                                                  (sNameNormalized.includes("tiếng anh") || sCode === "tavd" || sCode.includes("english_speaking")) &&
                                                  !sCode.includes("esl") &&
                                                  !sNameNormalized.includes("esl") &&
                                                  (sNameNormalized.includes("vấn đáp") || sNameNormalized.includes("nói") || sCode.includes("vd") || sCode.includes("speaking") || sCode.includes("oral"));
                                                let val = "—";
                                                let rawScore = "";
                                                let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";

                                                let tciMetaObj: any = null;
                                                if (isTciRow && sc.comments) {
                                                  try {
                                                    const parsedC = JSON.parse(sc.comments);
                                                    const cArr = Array.isArray(parsedC) ? parsedC : [parsedC];
                                                    for (const item of cArr) {
                                                      if (typeof item === "string" && item.includes('"_tciMeta"')) {
                                                        try {
                                                          const m = JSON.parse(item);
                                                          if (m?._tciMeta) tciMetaObj = m._tciMeta;
                                                        } catch {}
                                                      }
                                                    }
                                                  } catch {}
                                                }

                                                if (isOrientation) {
                                                  const activePvdh = pvdhRec || selectedReportStudent?.pvdhRecord;
                                                  if (activePvdh?.isLocked || activePvdh?.workflowStatus === "VERIFIED_LOCKED") {
                                                    val = "Đã xác nhận";
                                                    badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-200";
                                                  } else if (bmSummary.sheetStatus === "CAN_TRAO_DOI_CHUYEN_MON") {
                                                    val = "Cần trao đổi CM";
                                                    badgeColor = "bg-rose-50 text-rose-800 border-rose-200";
                                                  } else if (bmSummary.sheetStatus === "CAN_BO_SUNG_THONG_TIN" || activePvdh?.workflowStatus === "RETURNED") {
                                                    val = "Cần bổ sung TT";
                                                    badgeColor = "bg-amber-50 text-amber-900 border-amber-200";
                                                  } else if (bmSummary.sheetStatus === "HOAN_THANH" || activePvdh?.workflowStatus === "COMPLETED" || activePvdh?.workflowStatus === "SUBMITTED") {
                                                    val = "Hoàn thành";
                                                    badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-200";
                                                  } else if (activePvdh?.id) {
                                                    val = "Bản nháp";
                                                    badgeColor = "bg-[#F0FDFA] text-[#00736E] border-[#CCFBF1]";
                                                  } else if (orientationData?.admissionConsultantNote) {
                                                    val = "Đã định hướng";
                                                    badgeColor = "bg-teal-50 text-teal-900 border-teal-200";
                                                  } else if (orientationData?.interviewerName) {
                                                    val = "Đã phỏng vấn";
                                                    badgeColor = "bg-teal-50 text-teal-900 border-teal-200";
                                                  } else {
                                                    val = "Chờ phỏng vấn";
                                                    badgeColor = "bg-amber-50 text-amber-900 border-amber-200";
                                                  }
                                                }

                                                try {
                                                  if (sc.scores) {
                                                    const parsed = JSON.parse(sc.scores);
                                                    const vArr = Array.isArray(parsed) ? parsed : [parsed];
                                                    if (sCode.includes("tly")) {
                                                      const scNum = parseFloat(vArr[6] || vArr[20] || "0");
                                                      rawScore = scNum.toString();
                                                      let lvl = "Bình thường";
                                                      badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-200";
                                                      if (scNum > 15 && scNum <= 31) {
                                                        lvl = "Dấu hiệu nhẹ";
                                                        badgeColor = "bg-sky-50 text-sky-800 border-sky-200";
                                                      } else if (scNum > 31 && scNum <= 47) {
                                                        lvl = "Dấu hiệu vừa";
                                                        badgeColor = "bg-amber-50 text-amber-800 border-amber-200";
                                                      } else if (scNum > 47 && scNum <= 63) {
                                                        lvl = "Nguy cơ cao";
                                                        badgeColor = "bg-amber-50 text-amber-900 border-amber-300";
                                                      } else if (scNum > 63) {
                                                        lvl = "Nguy cơ rất cao";
                                                        badgeColor = "bg-rose-50 text-rose-800 border-rose-200";
                                                      }
                                                      val = lvl;
                                                    } else if (isTciRow) {
                                                      const passedFromArr = vArr.filter(x => ["3", "Đạt", "DAT"].includes(String(x ?? "").trim())).length;
                                                      const failedFromArr = vArr.filter(x => ["2", "Không đạt", "KHONG_DAT"].includes(String(x ?? "").trim())).length;
                                                      const skippedFromArr = vArr.filter(x => ["1", "Không làm", "KHONG_LAM"].includes(String(x ?? "").trim())).length;
                                                      const passedCount = tciMetaObj?.countDat !== undefined ? Number(tciMetaObj.countDat) : passedFromArr;
                                                      const failedCount = tciMetaObj?.countKhongDat !== undefined ? Number(tciMetaObj.countKhongDat) : failedFromArr;
                                                      const skippedCount = tciMetaObj?.countKhongLam !== undefined ? Number(tciMetaObj.countKhongLam) : skippedFromArr;
                                                      const totalLen = vArr.length > 0 ? vArr.length : 16;
                                                      val = `${passedCount}/${totalLen} Đạt`;
                                                      if (failedCount > 0 || skippedCount > 0) {
                                                        const extras: string[] = [];
                                                        if (failedCount > 0) extras.push(`${failedCount} KĐ`);
                                                        if (skippedCount > 0) extras.push(`${skippedCount} KL`);
                                                        val += ` (${extras.join(", ")})`;
                                                      }
                                                      badgeColor = passedCount >= totalLen * 0.7 ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200";
                                                    } else if (sCode.includes("nltd")) {
                                                      const pctVal = vArr.length >= 5 ? vArr[4] : vArr[0];
                                                      if (pctVal !== undefined && pctVal !== null && pctVal !== "") {
                                                        val = pctVal + "%";
                                                        const pct = parseFloat(pctVal || "0");
                                                        badgeColor = pct >= 80 ? "bg-emerald-50 text-emerald-800 border-emerald-200" : pct >= 50 ? "bg-teal-50 text-teal-900 border-teal-200" : "bg-rose-50 text-rose-900 border-rose-200";
                                                      }
                                                    } else {
                                                      const firstVal = vArr.find(x => x !== undefined && x !== "" && x !== null);
                                                      val = firstVal !== undefined ? firstVal.toString() : "—";
                                                      badgeColor = "bg-[#F0FDFA] text-[#003B3A] border-[#CCFBF1]";

                                                      const sNameLower = sName.toLowerCase().normalize("NFC");
                                                      if (sNameLower.includes("tiếng anh") || sCode.includes("eng") || sCode.includes("esl")) {
                                                        if (sNameLower.includes("vấn đáp") || sNameLower.includes("nói") || sCode.includes("speaking") || sCode.includes("oral") || sCode.includes("vd")) {
                                                          val = firstVal !== undefined ? `${firstVal}/${oralMaxScore}` : `—/${oralMaxScore}`;
                                                        } else if (sNameLower.includes("viết") || sCode.includes("writing") || sCode.includes("written") || sCode.includes("vt")) {
                                                          val = firstVal !== undefined ? `${firstVal}/${writtenMaxScore}` : `—/${writtenMaxScore}`;
                                                        } else if (sc.id === "tong_diem_tieng_anh") {
                                                          val = firstVal !== undefined && firstVal !== "—" ? `${firstVal}/${totalMaxScore}` : `—/${totalMaxScore}`;
                                                        }
                                                      }
                                                    }
                                                  }
                                                } catch {
                                                  val = sc.scores || "—";
                                                  badgeColor = "bg-[#F0FDFA] text-[#003B3A] border-[#CCFBF1]";
                                                }

                                                let commentPreview = "—";
                                                if (isOrientation) {
                                                  const dParts = [
                                                    bmSummary.d01?.trim() ? `D01: ${bmSummary.d01.trim()}` : "",
                                                    bmSummary.d04?.trim() ? `D04: ${bmSummary.d04.trim()}` : "",
                                                  ].filter(Boolean);
                                                  if (dParts.length > 0) {
                                                    commentPreview = dParts.join(" • ");
                                                  } else if (pvdhRec?.id || selectedReportStudent?.pvdhRecord?.id) {
                                                    commentPreview = `Phiếu ${pvdhCodeDisplay} (Dành cho khối ${dossierGradeNum})`;
                                                  } else if (orientationData?.strengths) {
                                                    commentPreview = "Thế mạnh: " + orientationData.strengths;
                                                  } else if (orientationData?.behaviorNotes) {
                                                    commentPreview = orientationData.behaviorNotes;
                                                  } else if (orientationData?.interviewerName) {
                                                    commentPreview = "GV tiếp nhận: " + orientationData.interviewerName;
                                                  } else {
                                                    commentPreview = `Phiếu phỏng vấn định hướng ${pvdhCodeDisplay} (Dành cho khối ${dossierGradeNum})`;
                                                  }
                                                } else {
                                                  try {
                                                    if (sc.comments) {
                                                      const parsed = JSON.parse(sc.comments);
                                                      const commentVals = Array.isArray(parsed) ? parsed : [parsed];
                                                      const humanComments = commentVals.filter(
                                                        (c: any) => c && typeof c === "string" && c.trim() !== "" && !c.includes('"_tciMeta"')
                                                      );
                                                      if (humanComments.length > 0) {
                                                        commentPreview = humanComments.join(" • ");
                                                      } else if (isTciRow) {
                                                        let vArrForCmt: any[] = [];
                                                        try {
                                                          if (sc.scores) {
                                                            const p = JSON.parse(sc.scores);
                                                            vArrForCmt = Array.isArray(p) ? p : [p];
                                                          }
                                                        } catch {}
                                                        const pCount = tciMetaObj?.countDat ?? vArrForCmt.filter((x: any) => ["3", "Đạt", "DAT"].includes(String(x ?? "").trim())).length;
                                                        const fCount = tciMetaObj?.countKhongDat ?? vArrForCmt.filter((x: any) => ["2", "Không đạt", "KHONG_DAT"].includes(String(x ?? "").trim())).length;
                                                        const sCount = tciMetaObj?.countKhongLam ?? vArrForCmt.filter((x: any) => ["1", "Không làm", "KHONG_LAM"].includes(String(x ?? "").trim())).length;
                                                        const sigText =
                                                          tciMetaObj?.signatureStatus === "SIGNED"
                                                            ? `Đã ký xác nhận (${tciMetaObj.signerName || sc.teacherName || "GVBM"})`
                                                            : tciMetaObj?.signatureStatus === "PENDING_RESIGN"
                                                            ? "Chờ ký lại"
                                                            : "Bản nháp (Chưa ký)";
                                                        commentPreview = `Đạt: ${pCount}/16 · Không đạt: ${fCount}/16 · Không làm: ${sCount}/16 — ${sigText}`;
                                                      }
                                                    }
                                                  } catch {}
                                                }

                                                const isActive = activeSubjectId === sc.id;

                                                return (
                                                  <tr
                                                    key={sc.id}
                                                    onClick={() => setActiveSubjectId(sc.id)}
                                                    className={`cursor-pointer transition-colors align-top ${
                                                      isOralEnglishNonScoring
                                                        ? isActive
                                                          ? "bg-amber-50 border-l-4 border-l-amber-500"
                                                          : "bg-amber-50/55 hover:bg-amber-50 border-l-4 border-l-amber-400"
                                                        : isActive
                                                        ? "bg-[#F0FDFA]/80 border-l-4 border-l-[#008B85]"
                                                        : "hover:bg-slate-50/80 border-l-4 border-l-transparent"
                                                    }`}
                                                  >
                                                    <td className="py-2.5 px-3.5">
                                                      <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className={`font-bold ${isOralEnglishNonScoring ? "text-amber-950" : "text-slate-900"}`}>{sName}</span>
                                                        {isOralEnglishNonScoring && (
                                                          <span
                                                            className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-[#B45309] border border-amber-300"
                                                            title="Môn Tiếng Anh (vấn đáp) không dùng để xét Đạt/Không đạt — chỉ tham khảo xếp lớp"
                                                          >
                                                            <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                                                            Không xét KQ
                                                          </span>
                                                        )}
                                                      </div>
                                                      {sc.teacherName && (
                                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                                          GV: {sc.teacherName}
                                                        </div>
                                                      )}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center">
                                                      <div className="inline-flex flex-col items-center gap-1">
                                                        <span className={`px-2.5 py-0.5 rounded-lg border text-xs font-bold inline-block ${
                                                          isOralEnglishNonScoring
                                                            ? "bg-amber-100/80 text-amber-950 border-amber-300"
                                                            : badgeColor
                                                        }`}>
                                                          {sCode.includes("tly") && rawScore ? `${val} (${rawScore}đ)` : val}
                                                        </span>
                                                        {isTciRow && tciMetaObj && (
                                                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                                                            tciMetaObj.signatureStatus === "SIGNED"
                                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                              : "bg-amber-50 text-amber-800 border-amber-200"
                                                          }`}>
                                                            {tciMetaObj.signatureStatus === "SIGNED" ? "✓ Đã ký phiếu" : "Chưa ký"}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </td>
                                                    <td className="py-2.5 px-3.5">
                                                      <p className={`text-xs leading-relaxed ${
                                                        commentPreview !== "—" ? "text-slate-700" : "text-slate-400 italic"
                                                      }`}>
                                                        {commentPreview !== "—" ? commentPreview : "Chưa có nhận xét"}
                                                      </p>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                      {sc.id === "tong_diem_tieng_anh" ? (
                                                        <span className="text-[11px] text-slate-400 font-medium">Tự động</span>
                                                      ) : isOrientation ? (
                                                        <button
                                                          type="button"
                                                          onClick={() => setDossierActiveTab("orientation")}
                                                          className="px-2.5 py-1 bg-white hover:bg-[#F0FDFA] text-[#003B3A] border border-slate-200 rounded-lg font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                                                        >
                                                          <Eye className="w-3 h-3 text-[#008B85]" />
                                                          <span>Xem phiếu</span>
                                                        </button>
                                                      ) : isTciRow ? (
                                                        <div className="inline-flex items-center justify-end gap-1">
                                                          <button
                                                            type="button"
                                                            onClick={() => setActiveSubjectId(sc.id)}
                                                            className="px-2 py-1 bg-[#003B3A] hover:bg-[#005250] text-white rounded-lg font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                                                          >
                                                            <Eye className="w-3 h-3" />
                                                            <span>Chi tiết</span>
                                                          </button>
                                                          <a
                                                            href={`/api/tci/pdf?studentId=${encodeURIComponent(selectedReportStudent.id)}&format=pdf`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="px-2 py-1 bg-white hover:bg-[#F0FDFA] text-[#003B3A] border border-slate-200 rounded-lg font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                                                            title="Tải PDF phiếu TCI đã ký"
                                                          >
                                                            <Download className="w-3 h-3 text-[#008B85]" />
                                                            <span>PDF</span>
                                                          </a>
                                                        </div>
                                                      ) : canAdminEditScores ? (
                                                        <button
                                                          type="button"
                                                          onClick={() => handleOpenEditScore(sc)}
                                                          className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer ${
                                                            val === "—" || (typeof val === "string" && val.startsWith("—/"))
                                                              ? "bg-[#003B3A] hover:bg-[#005854] text-white"
                                                              : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
                                                          }`}
                                                        >
                                                          <Pencil className="w-3 h-3 text-[#008B85]" />
                                                          <span>{val === "—" || (typeof val === "string" && val.startsWith("—/")) ? "Nhập điểm" : "Sửa điểm"}</span>
                                                        </button>
                                                      ) : (
                                                        <span
                                                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-50 text-slate-400 border border-slate-200"
                                                          title="Chế độ chỉnh sửa điểm đã khóa (chỉ tài khoản Admin)"
                                                        >
                                                          <Lock className="w-3 h-3" />
                                                          Đã khóa
                                                        </span>
                                                      )}
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>

                                      {/* CHI TIẾT MÔN ĐANG CHỌN */}
                                      {scoresList
                                        .filter((sc) => sc.id === activeSubjectId)
                                        .map((sc) => {
                                          if (sc.id === "tong_diem_tieng_anh") {
                                            const totalVal = oralScoreVal !== null || writtenScoreVal !== null
                                              ? ((oralScoreVal || 0) + (writtenScoreVal || 0)).toString()
                                              : "—";
                                            return (
                                              <div key={sc.id} className="bg-white rounded-2xl border border-slate-200/90 p-4 relative overflow-hidden tabular-nums">
                                                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#008B85]" />
                                                <div className="pl-2 pb-3 mb-3 border-b border-slate-100">
                                                  <h4 className="font-bold text-slate-900 text-sm">Tổng điểm Tiếng Anh</h4>
                                                  <p className="text-xs text-slate-500 mt-0.5">Tổng hợp điểm bài Vấn đáp và bài Viết</p>
                                                </div>
                                                <div className="pl-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                                                    <span className="text-xs text-slate-500 block">Tiếng Anh (Vấn đáp)</span>
                                                    <strong className="text-base font-bold text-slate-900 mt-1 block">
                                                      {hasOralSubject ? (oralScoreText !== "—" ? `${oralScoreText}/${oralMaxScore}` : `—/${oralMaxScore}`) : "Không khảo sát"}
                                                    </strong>
                                                  </div>
                                                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                                                    <span className="text-xs text-slate-500 block">Tiếng Anh (Viết)</span>
                                                    <strong className="text-base font-bold text-slate-900 mt-1 block">
                                                      {hasWrittenSubject ? (writtenScoreText !== "—" ? `${writtenScoreText}/${writtenMaxScore}` : `—/${writtenMaxScore}`) : "Không khảo sát"}
                                                    </strong>
                                                  </div>
                                                  <div className="p-3 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1]">
                                                    <span className="text-xs text-[#00736E] font-medium block">Tổng cộng</span>
                                                    <strong className="text-base font-bold text-[#003B3A] mt-1 block">
                                                      {totalVal !== "—" ? `${totalVal}/${totalMaxScore}` : `—/${totalMaxScore}`}
                                                    </strong>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          }

                                          const subject = sc.subject || {};
                                          const subName = (subject.name || "").toLowerCase();
                                          const subCode = (subject.code || "").toLowerCase();
                                          const subNameNormalized = subName.normalize("NFC");
                                          const isOrientation = subName.includes("định hướng") || subCode.includes("pdh") || subCode.includes("orientation");
                                          const isPsych = subName.includes("tâm lý") || subCode.includes("tly");
                                          const isChildDev = subNameNormalized.includes("chuẩn phát triển") || subNameNormalized.includes("bộ chuẩn phát triển") || subCode.includes("cpt") || subCode.includes("tci");
                                          const isOralEnglishNonScoring =
                                            (subNameNormalized.includes("tiếng anh") || subCode === "tavd" || subCode.includes("english_speaking")) &&
                                            !subCode.includes("esl") &&
                                            !subNameNormalized.includes("esl") &&
                                            (subNameNormalized.includes("vấn đáp") || subNameNormalized.includes("nói") || subCode.includes("vd") || subCode.includes("speaking") || subCode.includes("oral"));
                                          const _nltdScoreArr = (() => { try { if (sc.scores) { const _p = JSON.parse(sc.scores); return Array.isArray(_p) ? _p : [_p]; } } catch {} return []; })();
                                          const isThinkingSkills = (subNameNormalized.includes("năng lực tư duy") || subCode.includes("nltd")) && isGrade1 && _nltdScoreArr.length >= 5;

                                          let scoreVals: any[] = [];
                                          let commentVals: any[] = [];
                                          try { if (sc.scores) { const parsed = JSON.parse(sc.scores); scoreVals = Array.isArray(parsed) ? parsed : [parsed]; } } catch { scoreVals = [sc.scores]; }
                                          try { if (sc.comments) { const parsed = JSON.parse(sc.comments); commentVals = Array.isArray(parsed) ? parsed : [parsed]; } } catch { commentVals = [sc.comments]; }

                                          let parsedCols: { scores: string[]; comments: string[] } = { scores: [], comments: [] };
                                          try { if (subject.columnNames) { const parsed = JSON.parse(subject.columnNames); parsedCols = { scores: Array.isArray(parsed.scores) ? parsed.scores : [], comments: Array.isArray(parsed.comments) ? parsed.comments : [] }; } } catch {}

                                          if (isOrientation) return null;

                                          return (
                                            <div key={sc.id} className={`bg-white rounded-2xl border p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] relative overflow-hidden tabular-nums ${isOralEnglishNonScoring ? "border-amber-300" : "border-slate-200/90"}`}>
                                              <div className={`absolute top-0 left-0 w-1.5 h-full ${isOralEnglishNonScoring ? "bg-amber-500" : "bg-[#003B3A]"}`} />
                                              <div className="pl-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3.5">
                                                <div>
                                                  <div className="flex flex-wrap items-center gap-2">
                                                    <h4 className={`font-bold text-sm ${isOralEnglishNonScoring ? "text-amber-950" : "text-slate-900"}`}>{subject.name}</h4>
                                                    {subject.code && <span className="font-mono text-[11px] text-slate-400">{subject.code}</span>}
                                                    {isOralEnglishNonScoring && (
                                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-[#B45309] border border-amber-300">
                                                        <AlertCircle className="w-3 h-3 shrink-0" />
                                                        Môn không xét kết quả
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                    <span>Giáo viên chấm: <strong className="text-slate-700 font-semibold">{sc.teacherName || "Chưa xác định"}</strong></span>
                                                    {sc.updatedAt && (
                                                      <>
                                                        <span>&bull;</span>
                                                        <span>Cập nhật: {new Date(sc.updatedAt).toLocaleDateString("vi-VN")}</span>
                                                      </>
                                                    )}
                                                  </div>
                                                </div>

                                                {!isChildDev ? (
                                                  canAdminEditScores ? (
                                                    <button
                                                      type="button"
                                                      onClick={() => handleOpenEditScore(sc)}
                                                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                                                    >
                                                      <Pencil className="w-3.5 h-3.5 text-[#008B85]" />
                                                      <span>Chỉnh sửa điểm &amp; nhận xét</span>
                                                    </button>
                                                  ) : (
                                                    <span
                                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-400 border border-slate-200 font-medium text-[11px] rounded-lg shrink-0"
                                                      title="Chế độ chỉnh sửa điểm đã khóa (chỉ tài khoản Admin)"
                                                    >
                                                      <Lock className="w-3 h-3" />
                                                      <span>Đã khóa sửa điểm (chỉ Admin)</span>
                                                    </span>
                                                  )
                                                ) : (
                                                  <div className="flex items-center gap-2 shrink-0">
                                                    <a
                                                      href={`/api/tci/pdf?studentId=${encodeURIComponent(selectedReportStudent.id)}&format=html`}
                                                      target="_blank"
                                                      rel="noreferrer"
                                                      className="px-3 py-1.5 bg-white hover:bg-[#F0FDFA] text-[#003B3A] border border-slate-200 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                                                    >
                                                      <Eye className="w-3.5 h-3.5 text-[#008B85]" />
                                                      <span>Xem phiếu A4</span>
                                                    </a>
                                                    <a
                                                      href={`/api/tci/pdf?studentId=${encodeURIComponent(selectedReportStudent.id)}&format=pdf`}
                                                      target="_blank"
                                                      rel="noreferrer"
                                                      className="px-3 py-1.5 bg-[#003B3A] hover:bg-[#005250] text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                                                    >
                                                      <Download className="w-3.5 h-3.5 text-[#5EEAD4]" />
                                                      <span>Tải PDF đã ký</span>
                                                    </a>
                                                  </div>
                                                )}
                                              </div>

                                              <div className="pl-2">
                                                {isOralEnglishNonScoring && (
                                                  <div className="mb-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[#92400E] text-xs flex items-center gap-2">
                                                    <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0" />
                                                    <span>
                                                      <strong>Lưu ý GĐCS:</strong> Môn <strong>Tiếng Anh (vấn đáp)</strong> không tính vào điều kiện xét Đạt/Không đạt đầu vào — chỉ tham khảo năng lực giao tiếp &amp; xếp lớp.
                                                    </span>
                                                  </div>
                                                )}
                                                {isPsych ? (
                                                  <div className="space-y-3">
                                                    {(() => {
                                                      const score = parseFloat(scoreVals[6] || scoreVals[20] || "0");
                                                      const levels = [
                                                        { name: "Bình thường", min: 0, max: 15, bg: "bg-emerald-50 text-emerald-800 border-emerald-200", activeBg: "bg-emerald-600", scaleBg: "bg-emerald-100" },
                                                        { name: "Dấu hiệu nhẹ", min: 16, max: 31, bg: "bg-sky-50 text-sky-800 border-sky-200", activeBg: "bg-sky-500", scaleBg: "bg-sky-100" },
                                                        { name: "Dấu hiệu vừa", min: 32, max: 47, bg: "bg-amber-50 text-amber-800 border-amber-200", activeBg: "bg-amber-500", scaleBg: "bg-amber-100" },
                                                        { name: "Nguy cơ cao", min: 48, max: 63, bg: "bg-amber-50 text-amber-900 border-amber-300", activeBg: "bg-amber-600", scaleBg: "bg-amber-100" },
                                                        { name: "Nguy cơ rất cao", min: 64, max: 80, bg: "bg-rose-50 text-rose-800 border-rose-200", activeBg: "bg-rose-600", scaleBg: "bg-rose-100" }
                                                      ];
                                                      const activeLvl = levels.find(l => score >= l.min && score <= l.max) || levels[0];
                                                      return (
                                                        <div className="space-y-3">
                                                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                                                            <div>
                                                              <span className="text-xs text-slate-500 block">Tổng điểm sàng lọc tâm lý</span>
                                                              <strong className="text-lg font-bold text-slate-900">{score} / 80 điểm</strong>
                                                            </div>
                                                            <span className={`px-3 py-1 rounded-lg border font-bold text-xs ${activeLvl.bg}`}>
                                                              Mức đánh giá: {activeLvl.name}
                                                            </span>
                                                          </div>
                                                          <div className="grid grid-cols-5 gap-1.5">
                                                            {levels.map(l => {
                                                              const isActive = activeLvl.name === l.name;
                                                              return (
                                                                <div key={l.name} className="space-y-1">
                                                                  <div className={`h-1.5 rounded-full ${isActive ? l.activeBg : l.scaleBg}`} />
                                                                  <div className="text-center text-[10px]">
                                                                    <span className={`block truncate ${isActive ? "font-bold text-slate-900" : "text-slate-400"}`}>{l.name}</span>
                                                                    <span className="text-slate-400">{l.min}–{l.max}</span>
                                                                  </div>
                                                                </div>
                                                              );
                                                            })}
                                                          </div>
                                                        </div>
                                                      );
                                                    })()}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                                                        <span className="font-semibold text-slate-700 block">Kết luận sơ bộ từ chuyên viên</span>
                                                        <p className="text-slate-700 leading-relaxed">{commentVals[0] || "Chưa cập nhật nội dung nhận định."}</p>
                                                      </div>
                                                      <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/70 space-y-1">
                                                        <span className="font-semibold text-amber-900 block">Khuyến nghị phối hợp phụ huynh</span>
                                                        <p className="text-slate-700 leading-relaxed">{commentVals[1] || "Chưa có khuyến nghị cụ thể."}</p>
                                                      </div>
                                                    </div>

                                                    {/* Phối hợp gửi mail GĐCS (CC Tổ Giáo vụ CS, Tổ Tư vấn CS) & Xác nhận nội dung làm việc khi HS có dấu hiệu tâm lý */}
                                                    {(() => {
                                                      const scoreNum = parseFloat(scoreVals[6] || scoreVals[20] || "0");
                                                      const psychObj = (() => {
                                                        try {
                                                          if (!orientationData?.psychologyData) return null;
                                                          return typeof orientationData.psychologyData === "string"
                                                            ? JSON.parse(orientationData.psychologyData)
                                                            : orientationData.psychologyData;
                                                        } catch {
                                                          return null;
                                                        }
                                                      })();
                                                      const hasPsychSigns = scoreNum > 15 || Boolean(psychObj?.hasPsychologySigns || psychObj?.reportedToGdcs || psychObj?.gdcsResponse);
                                                      const reportedInfo = psychObj?.reportedToGdcs;
                                                      const gdcsResp = psychObj?.gdcsResponse;
                                                      const csCode = (resolvedStudentCampusObj?.campusCode || "CS1") as keyof typeof EMAIL_MAP.giaovu;
                                                      const campusGiaovuStr = EMAIL_MAP.giaovu[csCode] || EMAIL_MAP.giaovu.CS1;
                                                      const campusTuvanStr = EMAIL_MAP.tuvan[csCode] || EMAIL_MAP.tuvan.CS1;

                                                      const cleanDisplayEmails = (rawStr: string | undefined, fallbackStr: string) => {
                                                        const cleaned = String(rawStr || "")
                                                          .split(/[,;]/)
                                                          .map((e) => e.trim())
                                                          .filter((e) => e && e.includes("@") && !/^(giaovu|tuyensinh|tuvan)\.cs\d+@skylineschool\.edu\.vn$/i.test(e))
                                                          .join(", ");
                                                        return cleaned || fallbackStr;
                                                      };

                                                      const resolvedGiaovuDisplay =
                                                        Array.isArray(gdcsResp?.giaovuStaff) && gdcsResp.giaovuStaff.length > 0
                                                          ? gdcsResp.giaovuStaff.map((s: any) => `${s.fullName} (${s.email})`).join(", ")
                                                          : Array.isArray(reportedInfo?.giaovuStaff) && reportedInfo.giaovuStaff.length > 0
                                                          ? reportedInfo.giaovuStaff.map((s: any) => `${s.fullName} (${s.email})`).join(", ")
                                                          : cleanDisplayEmails(gdcsResp?.giaovuEmail || reportedInfo?.giaovuEmail, campusGiaovuStr);

                                                      const resolvedTuvanDisplay =
                                                        Array.isArray(gdcsResp?.tuvanStaff) && gdcsResp.tuvanStaff.length > 0
                                                          ? gdcsResp.tuvanStaff.map((s: any) => `${s.fullName} (${s.email})`).join(", ")
                                                          : Array.isArray(reportedInfo?.tuvanStaff) && reportedInfo.tuvanStaff.length > 0
                                                          ? reportedInfo.tuvanStaff.map((s: any) => `${s.fullName} (${s.email})`).join(", ")
                                                          : cleanDisplayEmails(gdcsResp?.tuyensinhEmail || reportedInfo?.tuyensinhEmail, campusTuvanStr);

                                                      if (!hasPsychSigns) {
                                                        return (
                                                          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-2">
                                                            <span>
                                                              <strong>Tổng hợp:</strong> Học sinh ở mức Bình thường ({scoreNum}/80 điểm, không có dấu hiệu tâm lý) — Chỉ lưu kết quả, không gửi mail báo cáo GĐCS.
                                                            </span>
                                                          </div>
                                                        );
                                                      }

                                                      const workPlanOptions = [
                                                        {
                                                          code: "DIRECT_PARENT_MEETING" as const,
                                                          label: "1. GĐCS Gặp trực tiếp PHHS",
                                                          desc: "GĐCS trực tiếp gặp gỡ & thống nhất cam kết đồng hành với PHHS"
                                                        },
                                                        {
                                                          code: "DELEGATE_TEACHER" as const,
                                                          label: "2. Ủy quyền cho NTCM / GV phụ trách",
                                                          desc: "Chọn từ danh sách GV khảo sát (GV phỏng vấn định hướng, GV Tâm lý theo phân công)"
                                                        },
                                                        {
                                                          code: "SCHEDULE_MEETING" as const,
                                                          label: "3. Đặt lịch hẹn với PHHS",
                                                          desc: "Chọn thời gian & địa điểm cụ thể để đặt lịch hẹn làm việc với PHHS"
                                                        }
                                                      ];

                                                      return (
                                                        <div className="p-4 rounded-xl bg-[#F0FDFA] border border-[#99F6E4] space-y-3 text-xs">
                                                          <div className="flex flex-wrap items-start justify-between gap-2 pb-2.5 border-b border-[#99F6E4]/70">
                                                            <div className="space-y-1">
                                                              <div className="font-bold text-[#003B3A] flex items-center gap-1.5 text-xs sm:text-sm">
                                                                <ShieldCheck className="w-4 h-4 text-[#008B85] shrink-0" />
                                                                <span>Báo cáo &amp; Xác nhận phương án làm việc Hồ sơ Tâm lý ({scoreNum}/80 điểm)</span>
                                                              </div>
                                                              <div className="text-[11px] text-slate-700 space-y-0.5">
                                                                <div>
                                                                  • <strong>Tổ Giáo vụ cơ sở ({csCode}) nắm thông tin:</strong> <span className="text-[#003B3A] font-semibold">{resolvedGiaovuDisplay}</span>
                                                                </div>
                                                                <div>
                                                                  • <strong>Tổ Tư vấn cơ sở ({csCode}) nắm thông tin:</strong> <span className="text-[#003B3A] font-semibold">{resolvedTuvanDisplay}</span>
                                                                </div>
                                                                {reportedInfo?.proposedActionLabel && (
                                                                  <div>
                                                                    • <strong>Đề xuất từ GV Tâm lý ({reportedInfo.reporterName || sc.teacherName || "GV Tâm lý"}):</strong>{" "}
                                                                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-200">
                                                                      {reportedInfo.proposedActionLabel}
                                                                    </span>
                                                                    {reportedInfo.messageToGdcs ? ` — "${reportedInfo.messageToGdcs}"` : ""}
                                                                  </div>
                                                                )}
                                                              </div>
                                                            </div>
                                                            <button
                                                              type="button"
                                                              onClick={() => setIsOrientationModalOpen(true)}
                                                              className="px-3 py-1.5 bg-white hover:bg-[#F8FAFC] text-[#003B3A] border border-[#008B85] rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                                                            >
                                                              <Eye className="w-3.5 h-3.5 text-[#008B85]" />
                                                              <span>Mở hồ sơ định hướng &amp; tâm lý</span>
                                                            </button>
                                                          </div>

                                                          {/* HIỂN THỊ NỘI DUNG GĐCS ĐÃ XÁC NHẬN ĐỂ GIÁO VỤ & TƯ VẤN CƠ SỞ NẮM BẮT */}
                                                          {gdcsResp ? (
                                                            <div className="p-3 bg-white rounded-xl border border-[#00A19A] space-y-1.5 shadow-2xs">
                                                              <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <span className="font-bold text-[#059669] flex items-center gap-1.5">
                                                                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                                                                  <span>Phương án làm việc đã được GĐCS ({gdcsResp.directorName || autoCampusDirectorName || "GĐCS"}) xác nhận:</span>
                                                                </span>
                                                                <span className="text-[11px] text-slate-500 font-medium tabular-nums">
                                                                  {gdcsResp.respondedAtFormatted || (gdcsResp.respondedAt ? new Date(gdcsResp.respondedAt).toLocaleString("vi-VN") : "")}
                                                                </span>
                                                              </div>
                                                              <div className="text-slate-800 space-y-1 pl-1">
                                                                <div>
                                                                  • <strong>Phương án xác nhận:</strong>{" "}
                                                                  <span className="px-2 py-0.5 rounded bg-[#003B3A] text-white font-bold text-[11px]">
                                                                    {gdcsResp.responseTypeName}
                                                                  </span>
                                                                </div>
                                                                {gdcsResp.details?.meetingTime && (
                                                                  <div>• <strong>Thời gian &amp; Địa điểm:</strong> {gdcsResp.details.meetingTime} — {gdcsResp.details.meetingLocation || "Tại cơ sở"}</div>
                                                                )}
                                                                {gdcsResp.details?.parentMeetingContent && (
                                                                  <div>• <strong>Nội dung trao đổi trực tiếp PHHS:</strong> {gdcsResp.details.parentMeetingContent}</div>
                                                                )}
                                                                {gdcsResp.details?.meetingAgenda && (
                                                                  <div>• <strong>Nội dung hội chẩn chuyên môn:</strong> {gdcsResp.details.meetingAgenda} (Thành phần: {gdcsResp.details.meetingParticipants})</div>
                                                                )}
                                                                {gdcsResp.details?.delegatedTeacherName && (
                                                                  <div>• <strong>Giáo viên đồng hành được ủy quyền:</strong> {gdcsResp.details.delegatedTeacherName} {gdcsResp.details.delegatedTeacherEmail ? `(${gdcsResp.details.delegatedTeacherEmail})` : ""} — Thời hạn: {gdcsResp.details.delegationDuration || "4 tuần đầu"} — {gdcsResp.details.delegationNote}</div>
                                                                )}
                                                                {gdcsResp.generalDirectiveNote && (
                                                                  <div>• <strong>Ý kiến chỉ đạo của GĐCS:</strong> <span className="italic">&ldquo;{gdcsResp.generalDirectiveNote}&rdquo;</span></div>
                                                                )}
                                                              </div>
                                                            </div>
                                                          ) : (
                                                            <div className="p-2.5 bg-amber-50/90 rounded-lg border border-amber-200 text-amber-900 font-medium flex items-center gap-2">
                                                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                                              <span>Hồ sơ đang chờ Giám đốc Cơ sở xác nhận phương án làm việc liên quan (1 trong 3 phương án bên dưới).</span>
                                                            </div>
                                                          )}

                                                          {/* BIỂU MẪU CHỈ ĐẠO DÀNH CHO GĐCS CHỌN 1 TRONG 3 PHƯƠNG ÁN & GỬI EMAIL TƯ VẤN, GIÁO VỤ, KHẢO THÍ & GV PHỤ TRÁCH */}
                                                          {canApprove && (
                                                            <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 space-y-3">
                                                              <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <div>
                                                                  <div className="font-bold text-[#003B3A] text-xs">
                                                                    GĐCS chọn phương án chỉ đạo (Cập nhật Hồ sơ định hướng &amp; Gửi Email Tư vấn, Giáo vụ, Khảo thí, GV phụ trách):
                                                                  </div>
                                                                  <p className="text-[11px] text-slate-500">
                                                                    Chọn phương án, điền thời gian hẹn PHHS hoặc chọn GV khảo sát được ủy quyền rồi bấm xác nhận
                                                                  </p>
                                                                </div>
                                                              </div>

                                                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                                {workPlanOptions.map((opt, idx) => {
                                                                  const isSelectedOpt = psychDirectiveType === opt.code;
                                                                  const isConfirmedOpt = gdcsResp?.responseType === opt.code;
                                                                  const isProposedOpt = reportedInfo?.proposedAction === opt.code;
                                                                  const CardIcon = idx === 0 ? Phone : idx === 1 ? UserCheck : Calendar;
                                                                  return (
                                                                    <div
                                                                      key={opt.code}
                                                                      onClick={() => {
                                                                        if (savingPsychDirective) return;
                                                                        setPsychDirectiveType(opt.code);
                                                                        setShowPsychCustomDetails(true);
                                                                        if (opt.code === "DELEGATE_TEACHER" && !psychDelegatedTeacherId && assignedSurveyTeachers.length > 0) {
                                                                          const firstT = assignedSurveyTeachers[0];
                                                                          setPsychDelegatedTeacherId(firstT.teacherId || "");
                                                                          setPsychDelegatedTeacherName(firstT.teacherName || "");
                                                                          setPsychDelegatedTeacherEmail(firstT.email || "");
                                                                        }
                                                                      }}
                                                                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                                                                        isSelectedOpt
                                                                          ? "bg-[#003B3A] border-[#003B3A] text-white shadow-sm ring-2 ring-[#00A19A]/30"
                                                                          : "bg-slate-50/80 border-slate-200 text-slate-800 hover:bg-white hover:border-[#008B85]"
                                                                      }`}
                                                                    >
                                                                      <div className="space-y-1.5">
                                                                        <div className="flex items-center justify-between gap-1">
                                                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                                                            isSelectedOpt ? "bg-white/15 text-[#5EEAD4]" : "bg-white text-[#003B3A] border border-slate-200"
                                                                          }`}>
                                                                            <CardIcon className="w-3 h-3" />
                                                                            <span>Phương án {idx + 1}</span>
                                                                          </span>
                                                                          {isConfirmedOpt ? (
                                                                            <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-0.5">
                                                                              <Check className="w-3 h-3" /> Đã xác nhận
                                                                            </span>
                                                                          ) : isProposedOpt ? (
                                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                                              isSelectedOpt ? "bg-amber-400/20 text-amber-200" : "bg-amber-100 text-amber-900"
                                                                            }`}>
                                                                              Đề xuất GV
                                                                            </span>
                                                                          ) : isSelectedOpt ? (
                                                                            <Check className="w-3.5 h-3.5 text-[#5EEAD4] shrink-0" />
                                                                          ) : null}
                                                                        </div>
                                                                        <div className="font-bold text-xs leading-snug">{opt.label}</div>
                                                                        <p className={`text-[10.5px] leading-snug ${isSelectedOpt ? "text-teal-100" : "text-slate-500"}`}>
                                                                          {opt.desc}
                                                                        </p>
                                                                      </div>

                                                                      <div className={`pt-2 border-t flex items-center justify-between gap-1.5 ${
                                                                        isSelectedOpt ? "border-white/15" : "border-slate-200/70"
                                                                      }`}>
                                                                        <span className={`text-[10px] truncate ${isSelectedOpt ? "text-teal-200" : "text-slate-400"}`}>
                                                                          {idx === 0 ? "Tư vấn mời PHHS" : idx === 1 ? "Hiện DS GV khảo sát" : "Chọn thời gian hẹn PHHS"}
                                                                        </span>
                                                                        <span className={`text-[10px] font-bold ${isSelectedOpt ? "text-[#5EEAD4]" : "text-[#00736E]"}`}>
                                                                          {isSelectedOpt ? "Đang chọn" : "Chọn"}
                                                                        </span>
                                                                      </div>
                                                                    </div>
                                                                  );
                                                                })}
                                                              </div>

                                                              {/* KHỐI CHI TIẾT THEO PHƯƠNG ÁN ĐANG CHỌN (LUÔN HIỂN THỊ ĐỂ GĐCS CHỌN GV KHẢO SÁT / CHỌN THỜI GIAN HẸN PHHS) */}
                                                              <div className="space-y-2.5 pt-2.5 border-t border-slate-100 animate-in fade-in duration-150">
                                                                {psychDirectiveType === "DIRECT_PARENT_MEETING" && (
                                                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                                    <div>
                                                                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Thời gian GĐCS gặp PHHS (tùy chọn):</label>
                                                                      <input
                                                                        type="datetime-local"
                                                                        value={psychMeetingTime}
                                                                        onChange={(e) => setPsychMeetingTime(e.target.value)}
                                                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs tabular-nums"
                                                                      />
                                                                    </div>
                                                                    <div>
                                                                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Địa điểm gặp PHHS:</label>
                                                                      <input
                                                                        type="text"
                                                                        value={psychMeetingLocation}
                                                                        onChange={(e) => setPsychMeetingLocation(e.target.value)}
                                                                        placeholder="Phòng Giám đốc Cơ sở..."
                                                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                                                                      />
                                                                    </div>
                                                                    <div className="sm:col-span-2">
                                                                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nội dung trao đổi trực tiếp với PHHS:</label>
                                                                      <input
                                                                        type="text"
                                                                        value={psychParentContent}
                                                                        onChange={(e) => setPsychParentContent(e.target.value)}
                                                                        placeholder="Thống nhất lộ trình đồng hành tâm lý & cam kết phối hợp giữa Gia đình và Nhà trường..."
                                                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                                                                      />
                                                                    </div>
                                                                  </div>
                                                                )}

                                                                {psychDirectiveType === "DELEGATE_TEACHER" && (
                                                                  <div className="space-y-2.5">
                                                                    {/* DANH SÁCH GV KHẢO SÁT HỌC SINH (GV PHỎNG VẤN ĐỊNH HƯỚNG, GV TÂM LÝ THEO PHÂN CÔNG) */}
                                                                    <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                                                                      <div className="flex items-center justify-between gap-2">
                                                                        <span className="text-[11px] font-bold text-[#003B3A]">
                                                                          Danh sách GV khảo sát học sinh (GV phỏng vấn định hướng, GV Tâm lý theo phân công):
                                                                        </span>
                                                                        <span className="text-[10.5px] font-semibold text-[#00736E] tabular-nums">
                                                                          {assignedSurveyTeachers.length} GV khảo sát
                                                                        </span>
                                                                      </div>
                                                                      {assignedSurveyTeachers.length > 0 ? (
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                                                                          {assignedSurveyTeachers.map((st: any, idx: number) => {
                                                                            const isPicked =
                                                                              (psychDelegatedTeacherId && psychDelegatedTeacherId === st.teacherId) ||
                                                                              (psychDelegatedTeacherName && psychDelegatedTeacherName === st.teacherName);
                                                                            const badgeCls =
                                                                              st.roleCategory === "ORIENTATION"
                                                                                ? "bg-[#F0FDFA] text-[#00736E] border-[#99F6E4]"
                                                                                : st.roleCategory === "PSYCHOLOGY"
                                                                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                                                                : "bg-slate-100 text-slate-700 border-slate-200";
                                                                            return (
                                                                              <button
                                                                                key={st.teacherId || idx}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                  setPsychDelegatedTeacherId(st.teacherId || "");
                                                                                  setPsychDelegatedTeacherName(st.teacherName || "");
                                                                                  setPsychDelegatedTeacherEmail(st.email || "");
                                                                                }}
                                                                                className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex items-start justify-between gap-2 ${
                                                                                  isPicked
                                                                                    ? "bg-[#F0FDFA] border-[#008B85] ring-2 ring-[#00A19A]/25"
                                                                                    : "bg-white border-slate-200 hover:border-[#008B85]"
                                                                                }`}
                                                                              >
                                                                                <div className="min-w-0 space-y-0.5">
                                                                                  <div className="font-bold text-xs text-[#003B3A] truncate">
                                                                                    {st.teacherName}
                                                                                  </div>
                                                                                  <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-semibold ${badgeCls}`}>
                                                                                    {st.roleBadge || st.subjectLabel || "GV khảo sát"}
                                                                                  </span>
                                                                                  <div className="text-[10px] text-slate-500 truncate">
                                                                                    {st.email || "Tự động tra cứu email khi gửi"}
                                                                                  </div>
                                                                                </div>
                                                                                {isPicked && <Check className="w-4 h-4 text-[#008B85] shrink-0 mt-0.5" />}
                                                                              </button>
                                                                            );
                                                                          })}
                                                                        </div>
                                                                      ) : (
                                                                        <div className="text-[11px] text-slate-500 italic">
                                                                          Chưa ghi nhận GV phỏng vấn định hướng / GV Tâm lý trong đợt khảo sát này. Vui lòng chọn NTCM / GV phụ trách ở danh sách bên dưới.
                                                                        </div>
                                                                      )}
                                                                    </div>

                                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                                      <div>
                                                                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Hoặc chọn NTCM / GV khác:</label>
                                                                        <select
                                                                          value={psychDelegatedTeacherId}
                                                                          onChange={(e) => {
                                                                            const tId = e.target.value;
                                                                            setPsychDelegatedTeacherId(tId);
                                                                            const foundSurvey = assignedSurveyTeachers.find((t: any) => t.teacherId === tId);
                                                                            const foundT = foundSurvey || (teachers || []).find((t: any) => t.id === tId || t.userId === tId);
                                                                            if (foundT) {
                                                                              setPsychDelegatedTeacherName(foundT.teacherName || "");
                                                                              setPsychDelegatedTeacherEmail((foundT as any).email || "");
                                                                            }
                                                                          }}
                                                                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                                                                        >
                                                                          <option value="">-- Chọn NTCM / GV phụ trách --</option>
                                                                          {assignedSurveyTeachers.length > 0 && (
                                                                            <optgroup label="GV khảo sát học sinh (PV định hướng / Tâm lý)">
                                                                              {assignedSurveyTeachers.map((st: any, idx: number) => (
                                                                                <option key={`sv-${st.teacherId || idx}`} value={st.teacherId || ""}>
                                                                                  {st.teacherName} — {st.roleBadge || st.subjectLabel}
                                                                                </option>
                                                                              ))}
                                                                            </optgroup>
                                                                          )}
                                                                          <optgroup label="Danh sách NTCM / GV cơ sở">
                                                                            {(teachers || []).map((t: any) => (
                                                                              <option key={t.id || t.userId} value={t.id || t.userId}>
                                                                                {t.teacherName} {(t as any).email ? `(${(t as any).email})` : ""}
                                                                              </option>
                                                                            ))}
                                                                          </optgroup>
                                                                        </select>
                                                                      </div>
                                                                      <div>
                                                                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email GV được ủy quyền:</label>
                                                                        <input
                                                                          type="email"
                                                                          value={psychDelegatedTeacherEmail}
                                                                          onChange={(e) => setPsychDelegatedTeacherEmail(e.target.value)}
                                                                          placeholder="gv@skylineschool.edu.vn"
                                                                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                                                                        />
                                                                      </div>
                                                                      <div>
                                                                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Thời hạn đồng hành:</label>
                                                                        <input
                                                                          type="text"
                                                                          value={psychDelegationDuration}
                                                                          onChange={(e) => setPsychDelegationDuration(e.target.value)}
                                                                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                                                                        />
                                                                      </div>
                                                                      <div className="sm:col-span-3">
                                                                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nhiệm vụ ủy quyền cụ thể:</label>
                                                                        <input
                                                                          type="text"
                                                                          value={psychDelegationNote}
                                                                          onChange={(e) => setPsychDelegationNote(e.target.value)}
                                                                          placeholder="Trao đổi với PHHS, theo dõi hành vi, hỗ trợ học sinh thích nghi và báo cáo định kỳ..."
                                                                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                                                                        />
                                                                      </div>
                                                                    </div>
                                                                  </div>
                                                                )}

                                                                {psychDirectiveType === "SCHEDULE_MEETING" && (
                                                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                                    <div>
                                                                      <label className="block text-[11px] font-semibold text-[#003B3A] mb-1">
                                                                        Chọn thời gian đặt lịch hẹn với PHHS <span className="text-rose-500">*</span>:
                                                                      </label>
                                                                      <input
                                                                        type="datetime-local"
                                                                        value={psychMeetingTime}
                                                                        onChange={(e) => setPsychMeetingTime(e.target.value)}
                                                                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#00A19A] bg-[#F0FDFA]/40 text-xs font-semibold tabular-nums"
                                                                      />
                                                                    </div>
                                                                    <div>
                                                                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Địa điểm hẹn PHHS:</label>
                                                                      <input
                                                                        type="text"
                                                                        value={psychMeetingLocation}
                                                                        onChange={(e) => setPsychMeetingLocation(e.target.value)}
                                                                        placeholder="Phòng Tiếp phụ huynh / Phòng Giám đốc Cơ sở..."
                                                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                                                                      />
                                                                    </div>
                                                                    <div>
                                                                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Thành phần tham dự:</label>
                                                                      <input
                                                                        type="text"
                                                                        value={psychParticipants}
                                                                        onChange={(e) => setPsychParticipants(e.target.value)}
                                                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                                                                      />
                                                                    </div>
                                                                    <div>
                                                                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nội dung hẹn làm việc với PHHS:</label>
                                                                      <input
                                                                        type="text"
                                                                        value={psychAgenda}
                                                                        onChange={(e) => setPsychAgenda(e.target.value)}
                                                                        placeholder="Trao đổi kết quả sàng lọc tâm lý và thống nhất phương án hỗ trợ học sinh..."
                                                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                                                                      />
                                                                    </div>
                                                                  </div>
                                                                )}

                                                                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 pt-1">
                                                                  <div className="flex-1">
                                                                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Ý kiến chỉ đạo chung của GĐCS:</label>
                                                                    <input
                                                                      type="text"
                                                                      value={psychGeneralNote}
                                                                      onChange={(e) => setPsychGeneralNote(e.target.value)}
                                                                      placeholder="Nhập ý kiến chỉ đạo của GĐCS để Tư vấn cơ sở, Giáo vụ cơ sở, Ban Khảo thí và GV phối hợp..."
                                                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                                                                    />
                                                                  </div>
                                                                  <button
                                                                    type="button"
                                                                    disabled={savingPsychDirective}
                                                                    onClick={() => handleConfirmPsychWorkPlan(selectedReportStudent)}
                                                                    className="px-4 py-2 bg-[#003B3A] hover:bg-[#005250] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                                                                  >
                                                                    {savingPsychDirective ? (
                                                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                    ) : (
                                                                      <Send className="w-3.5 h-3.5 text-[#5EEAD4]" />
                                                                    )}
                                                                    <span>
                                                                      {gdcsResp
                                                                        ? "Lưu cập nhật & Gửi Email điều phối"
                                                                        : "Xác nhận chỉ đạo & Gửi Email"}
                                                                    </span>
                                                                  </button>
                                                                </div>
                                                                <div className="text-[10.5px] text-slate-500">
                                                                  Email sẽ tự động gửi đến: <strong>Tư vấn cơ sở ({csCode})</strong>, <strong>Giáo vụ cơ sở ({csCode})</strong>, <strong>Ban Khảo thí</strong>, <strong>GV phỏng vấn định hướng</strong> và <strong>GV Tâm lý / NTCM được ủy quyền</strong>, đồng thời cập nhật trạng thái vào <strong>Hồ sơ định hướng (mục Tâm lý)</strong>.
                                                                </div>
                                                              </div>
                                                            </div>
                                                          )}
                                                        </div>
                                                      );
                                                    })()}
                                                  </div>
                                                ) : isChildDev ? (
                                                  <div className="space-y-4">
                                                    <TciResultReviewPanel
                                                      studentId={selectedReportStudent.id}
                                                      studentName={selectedReportStudent.fullName}
                                                      studentCode={selectedReportStudent.studentCode}
                                                      periodId={selectedReportStudent.periodId}
                                                    />
                                                  </div>
                                                ) : isThinkingSkills ? (
                                                  <div className="space-y-3">
                                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                                      {[
                                                        { label: "Tư duy logic", val: scoreVals[0] },
                                                        { label: "Sáng tạo", val: scoreVals[1] },
                                                        { label: "Phản biện", val: scoreVals[2] },
                                                        { label: "Giải quyết vấn đề", val: scoreVals[3] },
                                                        { label: "Mức hoàn thành", val: scoreVals[4] ? `${scoreVals[4]}%` : "—", highlight: true }
                                                      ].map(item => (
                                                        <div key={item.label} className={`p-2.5 rounded-xl border ${item.highlight ? "bg-[#F0FDFA] border-[#CCFBF1]" : "bg-slate-50 border-slate-200/70"}`}>
                                                          <span className="text-[11px] text-slate-500 block">{item.label}</span>
                                                          <strong className="text-sm font-bold text-slate-900 mt-0.5 block">{item.val || "—"}</strong>
                                                        </div>
                                                      ))}
                                                    </div>
                                                    {commentVals[0] && (
                                                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
                                                        <span className="font-semibold text-slate-700 block mb-0.5">Nhận xét tổng quan</span>
                                                        <p className="text-slate-700 leading-relaxed">{commentVals[0]}</p>
                                                      </div>
                                                    )}
                                                  </div>
                                                ) : (
                                                  <div className="space-y-3">
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                                      {Array.from({ length: (subject.scoreColumns ?? 1) }).map((_, colIdx) => {
                                                        let colName = "Điểm " + (colIdx + 1);
                                                        if (parsedCols.scores && parsedCols.scores[colIdx]) colName = parsedCols.scores[colIdx];
                                                        else if (subCode.includes("nltd")) colName = "Kết quả";

                                                        const isTotal = colName.toLowerCase().includes("tổng");
                                                        const val = scoreVals[colIdx];
                                                        let displayVal = val !== undefined && val !== "" && val !== null ? val : "—";
                                                        if (subCode.includes("nltd")) {
                                                          displayVal = val !== undefined && val !== "" && val !== null ? `${val}%` : "—";
                                                        } else {
                                                          const sNameLower = subName.toLowerCase().normalize("NFC");
                                                          if (sNameLower.includes("tiếng anh") || subCode.includes("eng") || subCode.includes("esl")) {
                                                            if (sNameLower.includes("vấn đáp") || sNameLower.includes("nói") || subCode.includes("speaking") || subCode.includes("oral") || subCode.includes("vd")) {
                                                              displayVal = val !== undefined && val !== "" && val !== null ? `${val}/${oralMaxScore}` : `—/${oralMaxScore}`;
                                                            } else if (sNameLower.includes("viết") || sNameLower.includes("writing") || subCode.includes("written") || subCode.includes("vt")) {
                                                              displayVal = val !== undefined && val !== "" && val !== null ? `${val}/${writtenMaxScore}` : `—/${writtenMaxScore}`;
                                                            }
                                                          }
                                                        }

                                                        return (
                                                          <div key={colIdx} className={`border rounded-xl px-3 py-2.5 ${isTotal ? "bg-[#F0FDFA] border-[#CCFBF1]" : "bg-slate-50 border-slate-200/70"}`}>
                                                            <span className="text-[11px] text-slate-500 block truncate">{colName}</span>
                                                            <div className="text-base font-bold text-slate-900 mt-0.5">{displayVal}</div>
                                                          </div>
                                                        );
                                                      })}
                                                    </div>

                                                    {commentVals.length > 0 && commentVals.some(v => v && !String(v).includes('"_tciMeta"')) && (
                                                      <div className="space-y-2">
                                                        {Array.from({ length: (subject.commentColumns ?? 1) }).map((_, colIdx) => {
                                                          let colName = "Nhận xét chuyên môn";
                                                          if (parsedCols.comments && parsedCols.comments[colIdx]) colName = parsedCols.comments[colIdx];
                                                          const val = commentVals[colIdx];
                                                          if (!val || String(val).includes('"_tciMeta"')) return null;
                                                          return (
                                                            <div key={colIdx} className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 text-xs">
                                                              <span className="font-semibold text-[#00736E] block mb-0.5">{colName}</span>
                                                              <p className="text-slate-700 leading-relaxed">{val}</p>
                                                            </div>
                                                          );
                                                        })}
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                    </>
                                  );
                                })()
                              )}

                              {/* TÓM TẮT NHANH PHIẾU ĐỊNH HƯỚNG KHI ĐANG Ở TAB ĐIỂM */}
                              {dossierActiveTab === "scores" && (
                                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Compass className="w-4 h-4 text-[#008B85]" />
                                      <h4 className="font-bold text-slate-900 text-xs">
                                        Tóm tắt Phiếu phỏng vấn định hướng ({pvdhCodeDisplay} • Dành cho khối {dossierGradeNum})
                                      </h4>
                                      <span className="text-[11px] text-slate-500">
                                        &bull; GV thực hiện: <strong className="text-slate-800">{pvdhRec?.studentInterviewerName || orientationData?.interviewerName || orientationAssignedTeacher || "Cán bộ tiếp nhận"}</strong>
                                      </span>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                        verStatus === "VERIFIED"
                                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                          : bmSummary.sheetStatus === "CAN_TRAO_DOI_CHUYEN_MON"
                                            ? "bg-rose-50 text-rose-800 border-rose-200"
                                            : bmSummary.sheetStatus === "HOAN_THANH"
                                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                              : "bg-amber-50 text-amber-800 border-amber-200"
                                      }`}>
                                        {verStatus === "VERIFIED"
                                          ? "Đã xác nhận phiếu"
                                          : BM_SHEET_STATUS_OPTIONS.find((o) => o.code === bmSummary.sheetStatus)?.label || pvdhWorkflowInfo.shortLabel}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOrientationSubTab("FULL_FORM");
                                        setDossierActiveTab("orientation");
                                      }}
                                      className="text-xs font-semibold text-[#00736E] hover:text-[#003B3A] inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <span>Xem toàn bộ phiếu ({pvdhCodeDisplay})</span>
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                                    <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
                                      <span className="font-semibold text-[#003B3A] text-[11px] block">
                                        D01. Điểm mạnh nổi bật của HS (nguồn HS / PHHS / quan sát)
                                      </span>
                                      <p className="text-slate-600 mt-0.5 leading-relaxed line-clamp-3">
                                        {summary9.strongPoints?.trim() || <span className="text-slate-400 italic">Chưa ghi nhận</span>}
                                      </p>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
                                      <span className="font-semibold text-[#003B3A] text-[11px] block">
                                        D02. Khó khăn, nhu cầu hỗ trợ và nội dung cần xác minh
                                      </span>
                                      <p className="text-slate-600 mt-0.5 leading-relaxed line-clamp-3">
                                        {summary9.difficultiesNeeds?.trim() || <span className="text-slate-400 italic">Chưa ghi nhận</span>}
                                      </p>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
                                      <span className="font-semibold text-[#003B3A] text-[11px] block">
                                        D03. Kỳ vọng của HS và gia đình (tương đồng / khác biệt)
                                      </span>
                                      <p className="text-slate-600 mt-0.5 leading-relaxed line-clamp-3">
                                        {summary9.alignmentDifferences?.trim() || <span className="text-slate-400 italic">Chưa ghi nhận</span>}
                                      </p>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-[#F0FDFA]/70 border border-[#CCFBF1]">
                                      <span className="font-semibold text-[#003B3A] text-[11px] block">
                                        D04. Định hướng giáo dục, phối hợp và bước tiếp theo
                                      </span>
                                      <p className="text-slate-700 mt-0.5 leading-relaxed line-clamp-3">
                                        {summary9.initialRecommendations?.trim() || <span className="text-slate-400 italic">Chưa ghi nhận</span>}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="px-3 py-2 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                    <div className="flex flex-wrap items-center gap-3">
                                      <span className="font-semibold text-slate-700">Trạng thái phiếu:</span>
                                      {BM_SHEET_STATUS_OPTIONS.map((opt) => (
                                        <span key={opt.code} className={bmSummary.sheetStatus === opt.code ? "font-bold text-[#003B3A]" : "text-slate-500"}>
                                          {bmSummary.sheetStatus === opt.code ? "☑" : "☐"} {opt.label}
                                        </span>
                                      ))}
                                    </div>
                                    <span className={bmSummary.psychInterviewRequested ? "font-bold text-[#D97706]" : "font-semibold text-slate-600"}>
                                      Đề nghị phỏng vấn (tâm lí): {bmSummary.psychInterviewRequested ? "☑" : "☐"}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* ================= SECTION: PHIẾU PHỎNG VẤN ĐỊNH HƯỚNG HS & TRAO ĐỔI VỚI PHỤ HUYNH (BM.KTĐBCL.31..42) ================= */}
                          {(dossierActiveTab === "orientation" || dossierActiveTab === "all") && (
                            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.03)] relative overflow-hidden">
                              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#003B3A]" />

                              {/* Thanh tiêu đề & tác vụ gọn gàng chuẩn Sổ cái Học thuật */}
                              <div className="px-4 py-3 border-b border-slate-200/80 bg-[#F8FAFC] pl-5 space-y-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="px-2.5 py-1 rounded-lg bg-[#003B3A] text-white font-bold text-xs tabular-nums">
                                      {pvdhCodeDisplay} • Khối {dossierGradeNum}
                                    </span>
                                    {hasPvdhContent ? (
                                      <span className="px-2.5 py-0.5 rounded-md bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1] text-[11px] font-semibold">
                                        {verStatus === "VERIFIED"
                                          ? "Đã xác nhận & khóa phiếu"
                                          : BM_SHEET_STATUS_OPTIONS.find((o) => o.code === bmSummary.sheetStatus)?.label || pvdhWorkflowInfo.label}
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                                        Chưa nhập dữ liệu phỏng vấn
                                      </span>
                                    )}
                                    <span className="text-[11px] text-slate-600">
                                      GV thực hiện: <strong className="text-slate-900">{pvdhRec?.studentInterviewerName || orientationData?.interviewerName || orientationAssignedTeacher || "Cán bộ tiếp nhận"}</strong>
                                    </span>
                                    <span className="text-[11px] text-slate-500 tabular-nums">
                                      &bull; Ngày PV: <strong className="text-slate-700">{pvdhRec?.interviewDate ? new Date(pvdhRec.interviewDate).toLocaleDateString("vi-VN") : "—"}</strong>
                                    </span>
                                    <span className="text-[11px] text-slate-500">
                                      &bull; PHHS: <strong className="text-slate-700">{pvdhRec?.parentFullName || selectedReportStudent.parentName || "Chưa ghi nhận"}</strong>
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPvdhModalInitialSection("FULL_FORM");
                                        setIsPvdhModalOpen(true);
                                      }}
                                      className="px-3 py-1.5 bg-[#003B3A] hover:bg-[#005854] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                      <HeartHandshake className="w-3.5 h-3.5 text-[#5EEAD4]" />
                                      <span>Nhập / Kiểm tra phiếu</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPvdhModalInitialSection("PREVIEW");
                                        setIsPvdhModalOpen(true);
                                      }}
                                      className="px-2.5 py-1.5 bg-white hover:bg-[#F0FDFA] text-[#00736E] border border-[#E2E8F0] rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                      <span>Bản in A4</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const pId = pvdhRec?.periodId || selectedReportStudent.periodId || "";
                                        window.open(
                                          `/api/pvdh/pdf?studentId=${encodeURIComponent(selectedReportStudent.id)}&periodId=${encodeURIComponent(pId)}&format=pdf&disposition=attachment`,
                                          "_blank"
                                        );
                                      }}
                                      className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-[#E2E8F0] rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Download className="w-3.5 h-3.5 text-[#008B85]" />
                                      <span>Tải PDF</span>
                                    </button>
                                    {orientationData?.interviewerName && (
                                      <button
                                        type="button"
                                        onClick={() => setIsOrientationModalOpen(true)}
                                        className="px-2.5 py-1.5 bg-white hover:bg-[#F8FAFC] text-slate-600 border border-[#E2E8F0] rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                      >
                                        <Pencil className="w-3.5 h-3.5 text-[#008B85]" />
                                        <span>Dữ liệu cũ</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Sub-tabs bám sát đúng cấu hình biểu mẫu BM.KTĐBCL.31–42 */}
                                <div className="flex flex-wrap items-center gap-1 p-1 bg-white rounded-xl border border-slate-200/80">
                                  {(isBmDossier
                                    ? [
                                        { code: "FULL_FORM" as const, label: `Toàn bộ phiếu (${pvdhCodeDisplay})` },
                                        { code: "D_TEACHER_SUMMARY" as const, label: "D. Tổng hợp & định hướng GV" },
                                        { code: "II_STUDENT" as const, label: "A. Phỏng vấn HS (A01–A06)" },
                                        { code: "IV_PARENT" as const, label: "B. Trao đổi PH (B01–B05)" },
                                        { code: "C_PARENT_GRADE" as const, label: `C. Phân hóa khối ${dossierGradeNum} (C01–C05)` },
                                        { code: "I_GENERAL" as const, label: "Thông tin chung" },
                                      ]
                                    : [
                                        { code: "I_GENERAL" as const, label: "I. Thông tin chung" },
                                        { code: "II_STUDENT" as const, label: `II. Trao đổi với học sinh (${configuredStudentCriteria.length} nhóm)` },
                                        { code: "III_TEACHER" as const, label: `III. Ghi nhận của giáo viên (${configuredTeacherObs.length} trường)` },
                                        { code: "IV_PARENT" as const, label: `IV. Trao đổi với PHHS (${configuredParentGroups.length} nhóm)` },
                                        { code: "V_ORIENTATION" as const, label: "V. Thống nhất định hướng & hỗ trợ" },
                                      ]
                                  ).map((tab) => {
                                    const isActiveTab = orientationSubTab === tab.code;
                                    return (
                                      <button
                                        key={tab.code}
                                        type="button"
                                        onClick={() => setOrientationSubTab(tab.code)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                          isActiveTab
                                            ? "bg-[#003B3A] text-white shadow-2xs"
                                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                        }`}
                                      >
                                        <span>{tab.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="p-4 pl-5 space-y-3.5">
                                {loadingOrientation ? (
                                  <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                                    <Loader2 className="w-5 h-5 animate-spin text-[#008B85]" />
                                    <span>Đang tải dữ liệu phiếu định hướng ({pvdhCodeDisplay})...</span>
                                  </div>
                                ) : (
                                  <>
                                    {/* TÓM TẮT ĐỊNH HƯỚNG CỦA GIÁO VIÊN (D01–D04) ĐƯA LÊN ĐẦU KHI XEM TOÀN BỘ PHIẾU ĐỂ GĐCS NẮM BẮT TỨC THÌ */}
                                    {isBmDossier && orientationSubTab === "FULL_FORM" && (
                                      <div className="p-3 bg-[#F0FDFA]/70 rounded-xl border border-[#CCFBF1] space-y-2 text-xs">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <span className="font-bold text-[#003B3A] text-xs flex items-center gap-1.5">
                                            <ClipboardCheck className="w-3.5 h-3.5 text-[#008B85]" />
                                            <span>Tổng hợp &amp; Định hướng trọng tâm của Giáo viên (Mục D01–D04)</span>
                                          </span>
                                          <span className={bmSummary.psychInterviewRequested ? "font-bold text-[#D97706] text-[11px]" : "text-slate-600 text-[11px]"}>
                                            Đề nghị phỏng vấn Tâm lý: {bmSummary.psychInterviewRequested ? "☑ Có" : "☐ Không"}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          {[
                                            { lbl: "D01. Điểm mạnh nổi bật của HS", val: bmSummary.d01 || summary9.strongPoints },
                                            { lbl: "D02. Khó khăn & nhu cầu hỗ trợ", val: bmSummary.d02 || summary9.difficultiesNeeds },
                                            { lbl: "D03. Kỳ vọng của HS & gia đình", val: bmSummary.d03 || summary9.alignmentDifferences },
                                            { lbl: "D04. Định hướng giáo dục & phối hợp", val: bmSummary.d04 || summary9.initialRecommendations },
                                          ].map((dItem) => (
                                            <div key={dItem.lbl} className="p-2.5 bg-white rounded-lg border border-teal-200/70">
                                              <span className="font-bold text-[#003B3A] block text-[11px]">{dItem.lbl}</span>
                                              <p className="text-slate-700 mt-0.5 leading-snug line-clamp-2">
                                                {String(dItem.val || "").trim() || <span className="text-slate-400 italic">Chưa ghi nhận</span>}
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* THÔNG TIN CHUNG (CHỈ HIỂN THỊ KHI CHỌN TAB RIÊNG ĐỂ TRÁNH LẶP LẠI THÔNG TIN HEADER) */}
                                    {orientationSubTab === "I_GENERAL" && (
                                      <div className="space-y-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs tabular-nums">
                                          {(isBmDossier
                                            ? [
                                                { key: "gen_student_name", label: "Họ và tên HS", val: selectedReportStudent.fullName || "—" },
                                                { key: "gen_program", label: "Hệ", val: eduSystemDisplay },
                                                { key: "gen_registered_campus", label: "Cơ sở", val: campusName },
                                                { key: "gen_academic_year", label: "Năm học", val: pvdhWorkspace?.student?.academicYearName || "—" },
                                                { key: "gen_interview_date", label: "Ngày phỏng vấn", val: pvdhRec?.interviewDate ? new Date(pvdhRec.interviewDate).toLocaleDateString("vi-VN") : "Chưa ghi nhận" },
                                                { key: "gen_parent_name", label: "Phụ huynh tham gia", val: pvdhRec?.parentFullName || selectedReportStudent.parentName || "Chưa ghi nhận" },
                                                { key: "gen_parent_relationship", label: "Quan hệ với HS", val: pvdhRec?.parentRelationship || "—" },
                                                { key: "gen_teacher", label: "Giáo viên thực hiện", val: pvdhRec?.studentInterviewerName || orientationData?.interviewerName || orientationAssignedTeacher || "Cán bộ tiếp nhận" },
                                              ]
                                            : [
                                                { key: "gen_student_name", label: "Họ tên học sinh", val: selectedReportStudent.fullName || "—" },
                                                { key: "gen_dob", label: "Ngày sinh", val: dobDisplay },
                                                { key: "gen_student_code", label: "Mã hồ sơ", val: selectedReportStudent.studentCode || "—" },
                                                { key: "gen_grade", label: "Khối dự kiến", val: `Khối ${selectedReportStudent.grade || "—"}` },
                                                { key: "gen_program", label: "Hệ / chương trình", val: eduSystemDisplay },
                                                { key: "gen_current_school", label: "Trường / lớp đang học", val: [selectedReportStudent.oldSchoolName, selectedReportStudent.className].filter(Boolean).join(" – ") || "—" },
                                                { key: "gen_registered_campus", label: "Cơ sở đăng ký", val: campusName },
                                                { key: "gen_interview_date", label: "Ngày phỏng vấn", val: pvdhRec?.interviewDate ? new Date(pvdhRec.interviewDate).toLocaleDateString("vi-VN") : "Chưa ghi nhận" },
                                                { key: "gen_interviewer_name", label: "Người phỏng vấn", val: pvdhRec?.studentInterviewerName || orientationData?.interviewerName || orientationAssignedTeacher || "Cán bộ tiếp nhận" },
                                                { key: "gen_interviewer_title", label: "Chức danh", val: pvdhRec?.studentInterviewerTitle || "Giáo viên phỏng vấn" },
                                                { key: "gen_parent_name", label: "Họ tên PHHS", val: pvdhRec?.parentFullName || selectedReportStudent.parentName || "Chưa ghi nhận" },
                                                { key: "gen_parent_relationship", label: "Quan hệ với HS", val: pvdhRec?.parentRelationship || "Phụ huynh" },
                                                { key: "gen_parent_contact", label: "Điện thoại / kênh liên hệ", val: pvdhRec?.parentContactChannel || selectedReportStudent.parentPhone || "—" },
                                              ]
                                          ).map((info) => (
                                            <div key={info.key} className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
                                              <span className="text-[11px] text-slate-500 block">{info.label}</span>
                                              <strong className="text-slate-900 font-semibold block mt-0.5">{info.val}</strong>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* MỤC A / II: PHỎNG VẤN ĐỊNH HƯỚNG HỌC SINH (A01–A06) */}
                                    {(orientationSubTab === "II_STUDENT" || (isBmDossier && orientationSubTab === "FULL_FORM")) && (
                                      <div className="space-y-1.5">
                                        {isBmDossier && (
                                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                                            <h5 className="text-xs font-bold text-[#003B3A]">A. Phỏng vấn định hướng học sinh</h5>
                                            <span className="text-[11px] italic text-slate-500">
                                              Ghi nhận lời chia sẻ, biểu hiện giao tiếp và cách HS trình bày. Với khối nhỏ, kết hợp trò chuyện và hoạt động đơn giản.
                                            </span>
                                          </div>
                                        )}
                                        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
                                          <table className="w-full text-left border-collapse text-xs tabular-nums">
                                            <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                                              <tr className="text-[11px] font-semibold whitespace-nowrap">
                                                <th className="py-2.5 px-3 w-16 text-center border-r border-white/15 font-semibold text-white">Mã mục</th>
                                                <th className="py-2.5 px-3 w-[44%] border-r border-white/15 font-semibold text-teal-100">Câu hỏi phỏng vấn định hướng ({pvdhCodeDisplay})</th>
                                                <th className="py-2.5 px-3 font-semibold text-[#5EEAD4]">Chia sẻ của học sinh &amp; ghi nhận</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#E2E8F0] bg-white">
                                              {configuredStudentCriteria.map((item) => (
                                                <tr key={item.fieldKey} className="hover:bg-[#F8FAFC] transition-colors align-middle">
                                                  <td className="py-3 px-3 text-center font-mono text-[11px] font-bold text-[#003B3A] border-r border-slate-100">
                                                    {String(item.fieldKey || "").toUpperCase()}
                                                  </td>
                                                  <td className="py-3 px-3 border-r border-slate-100">
                                                    <div className="font-semibold text-slate-900 leading-snug">{item.label}</div>
                                                    {item.promptQuestion && (
                                                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.promptQuestion}</div>
                                                    )}
                                                  </td>
                                                  <td className="py-3 px-3 leading-relaxed">
                                                    {item.responseText.trim() ? (
                                                      <span className="text-slate-800 whitespace-pre-wrap">{item.responseText}</span>
                                                    ) : item.notRecorded ? (
                                                      <span className="text-amber-800 font-medium">
                                                        Chưa ghi nhận{item.notRecordedReason ? `: ${item.notRecordedReason}` : ""}
                                                      </span>
                                                    ) : (
                                                      <span className="text-slate-400 italic">Chưa ghi nhận</span>
                                                    )}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}

                                    {/* MỤC III: GHI NHẬN CỦA GIÁO VIÊN (CHỈ VỚI BẢN GHI CŨ NẾU CÓ) */}
                                    {!isBmDossier && orientationSubTab === "III_TEACHER" && (
                                      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-xs tabular-nums">
                                          <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                                            <tr className="text-[11px] font-semibold whitespace-nowrap">
                                              <th className="py-2.5 px-3 w-12 text-center border-r border-white/15 font-semibold">STT</th>
                                              <th className="py-2.5 px-3 w-[42%] border-r border-white/15 font-semibold text-teal-100">Trường ghi nhận của người phỏng vấn</th>
                                              <th className="py-2.5 px-3 font-semibold text-[#5EEAD4]">Nội dung ghi nhận thực tế</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-[#E2E8F0] bg-white">
                                            {configuredTeacherObs.map((item) => (
                                              <tr key={item.fieldKey} className="hover:bg-[#F8FAFC] transition-colors align-middle">
                                                <td className="py-3 px-3 text-center font-bold text-[#003B3A] border-r border-slate-100">
                                                  {item.idx}
                                                </td>
                                                <td className="py-3 px-3 border-r border-slate-100">
                                                  <div className="font-semibold text-slate-900 leading-snug">{item.label}</div>
                                                  {item.guideline && (
                                                    <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.guideline}</div>
                                                  )}
                                                </td>
                                                <td className="py-3 px-3 leading-relaxed">
                                                  {item.value.trim() ? (
                                                    <span className="text-slate-800 whitespace-pre-wrap">{item.value}</span>
                                                  ) : (
                                                    <span className="text-slate-400 italic">Chưa ghi nhận</span>
                                                  )}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}

                                    {/* MỤC B / IV: TRAO ĐỔI ĐỊNH HƯỚNG VỚI PHỤ HUYNH (B01–B05) */}
                                    {(orientationSubTab === "IV_PARENT" || (isBmDossier && orientationSubTab === "FULL_FORM")) && (
                                      <div className="space-y-1.5">
                                        {isBmDossier && (
                                          <h5 className="text-xs font-bold text-[#003B3A]">B. Trao đổi định hướng với phụ huynh</h5>
                                        )}
                                        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
                                          <table className="w-full text-left border-collapse text-xs tabular-nums">
                                            <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                                              <tr className="text-[11px] font-semibold whitespace-nowrap">
                                                <th className="py-2.5 px-3 w-16 text-center border-r border-white/15 font-semibold text-white">Mã mục</th>
                                                <th className="py-2.5 px-3 w-[44%] border-r border-white/15 font-semibold text-teal-100">Nội dung trao đổi với phụ huynh ({pvdhCodeDisplay})</th>
                                                <th className="py-2.5 px-3 font-semibold text-[#5EEAD4]">Chia sẻ của phụ huynh</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#E2E8F0] bg-white">
                                              {configuredParentGroups.map((pItem) => (
                                                <tr key={pItem.fieldKey} className="hover:bg-[#F8FAFC] transition-colors align-middle">
                                                  <td className="py-3 px-3 text-center font-mono text-[11px] font-bold text-[#003B3A] border-r border-slate-100">
                                                    {String(pItem.fieldKey || "").toUpperCase()}
                                                  </td>
                                                  <td className="py-3 px-3 border-r border-slate-100">
                                                    <div className="font-semibold text-slate-900 leading-snug">{pItem.label}</div>
                                                    {pItem.promptQuestion && (
                                                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{pItem.promptQuestion}</div>
                                                    )}
                                                  </td>
                                                  <td className="py-3 px-3 leading-relaxed">
                                                    {pItem.responseText.trim() ? (
                                                      <span className="text-slate-800 whitespace-pre-wrap">{pItem.responseText}</span>
                                                    ) : pItem.notRecorded ? (
                                                      <span className="text-amber-800 font-medium">
                                                        Chưa ghi nhận{pItem.notRecordedReason ? `: ${pItem.notRecordedReason}` : ""}
                                                      </span>
                                                    ) : (
                                                      <span className="text-slate-400 italic">Chưa ghi nhận</span>
                                                    )}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}

                                    {/* MỤC C: CÂU HỎI PHÂN HÓA RIÊNG CHO KHỐI 1–12 (PHỤ HUYNH) */}
                                    {isBmDossier && (orientationSubTab === "C_PARENT_GRADE" || orientationSubTab === "FULL_FORM") && (
                                      <div className="space-y-1.5">
                                        <h5 className="text-xs font-bold text-[#003B3A]">
                                          C. Câu hỏi phân hóa riêng cho khối {dossierGradeNum} (Phụ huynh)
                                        </h5>
                                        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden overflow-x-auto">
                                          <table className="w-full text-left border-collapse text-xs tabular-nums">
                                            <thead className="bg-[#003B3A] text-white border-b border-[#003B3A]">
                                              <tr className="text-[11px] font-semibold whitespace-nowrap">
                                                <th className="py-2.5 px-3 w-16 text-center border-r border-white/15 font-semibold text-white">Mã mục</th>
                                                <th className="py-2.5 px-3 w-[44%] border-r border-white/15 font-semibold text-teal-100">Câu hỏi phân hóa riêng khối {dossierGradeNum} ({pvdhCodeDisplay})</th>
                                                <th className="py-2.5 px-3 font-semibold text-[#5EEAD4]">Chia sẻ của phụ huynh</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#E2E8F0] bg-white">
                                              {configuredParentGradeCGroups.map((cItem) => (
                                                <tr key={cItem.fieldKey} className="hover:bg-[#F8FAFC] transition-colors align-middle">
                                                  <td className="py-3 px-3 text-center font-mono text-[11px] font-bold text-[#003B3A] border-r border-slate-100">
                                                    {String(cItem.fieldKey || "").toUpperCase()}
                                                  </td>
                                                  <td className="py-3 px-3 border-r border-slate-100">
                                                    <div className="font-semibold text-slate-900 leading-snug">{cItem.label}</div>
                                                    {cItem.promptQuestion && (
                                                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{cItem.promptQuestion}</div>
                                                    )}
                                                  </td>
                                                  <td className="py-3 px-3 leading-relaxed">
                                                    {cItem.responseText.trim() ? (
                                                      <span className="text-slate-800 whitespace-pre-wrap">{cItem.responseText}</span>
                                                    ) : cItem.notRecorded ? (
                                                      <span className="text-amber-800 font-medium">
                                                        Chưa ghi nhận{cItem.notRecordedReason ? `: ${cItem.notRecordedReason}` : ""}
                                                      </span>
                                                    ) : (
                                                      <span className="text-slate-400 italic">Chưa ghi nhận</span>
                                                    )}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}

                                    {/* MỤC D: TỔNG HỢP VÀ ĐỊNH HƯỚNG CỦA GIÁO VIÊN (BM.KTĐBCL.31–42) */}
                                    {isBmDossier && (orientationSubTab === "D_TEACHER_SUMMARY" || orientationSubTab === "FULL_FORM") && (
                                      <div className="space-y-2.5 text-xs">
                                        <h5 className="text-xs font-bold text-[#003B3A]">
                                          D. Tổng hợp và định hướng của giáo viên
                                        </h5>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                          {[
                                            { lbl: "D01. Điểm mạnh nổi bật của HS (nguồn HS / PHHS / quan sát)", val: bmSummary.d01 },
                                            { lbl: "D02. Khó khăn, nhu cầu hỗ trợ và nội dung cần xác minh", val: bmSummary.d02 },
                                            { lbl: "D03. Kỳ vọng của HS và gia đình (tương đồng / khác biệt)", val: bmSummary.d03 },
                                            { lbl: "D04. Định hướng giáo dục, phối hợp và bước tiếp theo", val: bmSummary.d04 },
                                          ].map((dItem) => (
                                            <div key={dItem.lbl} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1">
                                              <span className="font-bold text-[#003B3A] block text-[11px]">{dItem.lbl}</span>
                                              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                                                {String(dItem.val || "").trim() || <span className="text-slate-400 italic">Chưa ghi nhận</span>}
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                        <div className="p-3 bg-[#F0FDFA] rounded-xl border border-[#CCFBF1] flex flex-wrap items-center justify-between gap-3">
                                          <div className="flex flex-wrap items-center gap-3">
                                            <span className="font-bold text-[#003B3A]">Trạng thái phiếu:</span>
                                            {BM_SHEET_STATUS_OPTIONS.map((opt) => (
                                              <span key={opt.code} className={bmSummary.sheetStatus === opt.code ? "font-bold text-[#003B3A]" : "text-slate-500"}>
                                                {bmSummary.sheetStatus === opt.code ? "☑" : "☐"} {opt.label}
                                              </span>
                                            ))}
                                          </div>
                                          <span className="font-bold text-[#003B3A]">
                                            Đề nghị phỏng vấn (tâm lí): {bmSummary.psychInterviewRequested ? "☑" : "☐"}
                                          </span>
                                        </div>
                                      </div>
                                    )}

                                    {/* MỤC V: THỐNG NHẤT ĐỊNH HƯỚNG & HỖ TRỢ (MẪU KHỐI 3–12) */}
                                    {!isBmDossier && orientationSubTab === "V_ORIENTATION" && (
                                      <div className="space-y-3 text-xs">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1">
                                            <span className="font-bold text-[#003B3A] block text-[11px]">
                                              1. Điểm mạnh và nhu cầu ưu tiên của học sinh (plan_strengths_priority)
                                            </span>
                                            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                                              {pvdhOrientationPlan.strengthsPriority.trim() || <span className="text-slate-400 italic">Chưa ghi nhận</span>}
                                            </p>
                                          </div>
                                          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1">
                                            <span className="font-bold text-[#003B3A] block text-[11px]">
                                              2. Mục tiêu ban đầu và hành động thống nhất với HS, PHHS (plan_goals_actions)
                                            </span>
                                            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                                              {pvdhOrientationPlan.goalsActionsText.trim() || <span className="text-slate-400 italic">Chưa ghi nhận</span>}
                                            </p>
                                          </div>
                                          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1">
                                            <span className="font-bold text-[#003B3A] block text-[11px]">
                                              3. Người/bộ phận phối hợp &amp; mốc trao đổi lại
                                            </span>
                                            <p className="text-slate-700 leading-relaxed">
                                              Phối hợp: <strong>{pvdhOrientationPlan.coordinator.trim() || "—"}</strong>
                                              {" • "}Mốc trao đổi lại: <strong>{pvdhOrientationPlan.reviewDate ? new Date(pvdhOrientationPlan.reviewDate).toLocaleDateString("vi-VN") : "—"}</strong>
                                            </p>
                                          </div>
                                          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1">
                                            <span className="font-bold text-[#003B3A] block text-[11px]">
                                              4. Nội dung cần tìm hiểu thêm (plan_further_topics)
                                            </span>
                                            <p className="text-slate-700 leading-relaxed">
                                              {pvdhOrientationPlan.furtherTopics.length > 0 ? (
                                                pvdhOrientationPlan.furtherTopics
                                                  .map((c: string) => FURTHER_INQUIRY_OPTIONS.find((o) => o.code === c)?.label || c)
                                                  .join(", ") +
                                                (pvdhOrientationPlan.furtherOtherText ? ` (${pvdhOrientationPlan.furtherOtherText})` : "")
                                              ) : (
                                                <span className="text-slate-400 italic">Chưa chọn</span>
                                              )}
                                            </p>
                                          </div>
                                          <div className="p-3 bg-[#F0FDFA]/80 rounded-xl border border-[#CCFBF1] space-y-1 sm:col-span-2">
                                            <span className="font-bold text-[#003B3A] block text-[11px]">
                                              5. Nội dung bàn giao cho GVCN / bộ phận liên quan khi nhập học (plan_handover_notes)
                                            </span>
                                            <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                                              {pvdhOrientationPlan.handoverNotes.trim() || <span className="text-slate-400 italic">Chưa ghi nhận</span>}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="p-3 bg-[#F0FDFA] rounded-xl border border-[#CCFBF1] flex flex-wrap items-center justify-between gap-2">
                                          <div>
                                            <span className="font-bold text-[#003B3A] block">Trạng thái xác nhận Phiếu định hướng ({pvdhCodeDisplay})</span>
                                            <p className="text-slate-700 mt-0.5">
                                              {pvdhRec?.confirmedByName
                                                ? `Đã xác nhận bởi ${pvdhRec.confirmedByName}${pvdhRec.confirmedAt ? ` (${new Date(pvdhRec.confirmedAt).toLocaleDateString("vi-VN")})` : ""}`
                                                : rawVerification?.notes || orientationData?.verificationNotes || "Phiếu phỏng vấn định hướng theo cấu hình mẫu đề xuất."}
                                            </p>
                                          </div>
                                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                                            verStatus === "VERIFIED"
                                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                              : "bg-amber-50 text-amber-800 border-amber-200"
                                          }`}>
                                            {verStatus === "VERIFIED" ? "Đã xác nhận & khóa phiếu" : pvdhWorkflowInfo.label}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* -------- RIGHT PANE (4 COLS): STICKY COUNCIL DECISION CONSOLE -------- */}
                        <div className={`${mobileDossierPane === "evidence" ? "hidden lg:flex" : "flex"} lg:col-span-4 h-full bg-[#F8FAFC] border-t lg:border-t-0 lg:border-l border-slate-200/90 flex-col justify-between overflow-hidden`}>
                          {/* Authoritative Deep Pine Console Header */}
                          <div className="shrink-0">
                            <div className="px-4 py-2.5 bg-[#003B3A] border-t-2 border-t-[#00A19A] text-white flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                                  <ClipboardCheck className="w-3.5 h-3.5 text-[#5EEAD4]" />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-white text-xs sm:text-sm tracking-tight leading-tight">Quyết định Hội đồng</h4>
                                  <p className="text-[10.5px] text-teal-100/80 truncate">Chọn 1 chạm kết quả &amp; phê duyệt nhanh</p>
                                </div>
                              </div>

                              {selectedReportStudent.admissionResult ? (
                                <span className={`px-2 py-0.5 text-[10.5px] font-bold rounded-md border shrink-0 flex items-center gap-1 ${
                                  selectedReportStudent.admissionResult.includes("Không")
                                    ? "bg-rose-500/20 text-rose-100 border-rose-400/40"
                                    : selectedReportStudent.admissionResult.includes("cam kết") || selectedReportStudent.admissionResult === "Học thử"
                                    ? "bg-amber-400/20 text-amber-100 border-amber-300/40"
                                    : "bg-emerald-400/20 text-emerald-100 border-emerald-300/40"
                                }`}>
                                  <Check className="w-3 h-3" />
                                  <span>Đã duyệt</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[10.5px] font-semibold bg-amber-400/20 text-amber-200 rounded-md border border-amber-300/35 shrink-0">
                                  Chờ phê duyệt
                                </span>
                              )}
                            </div>

                            {/* Live Verdict Summary Strip */}
                            {reportForm.admissionResult ? (
                              <div className={`px-4 py-1.5 border-b text-xs flex items-center justify-between gap-2 transition-colors ${
                                reportForm.admissionResult.includes("Không")
                                  ? "bg-rose-50/90 border-rose-200/80 text-rose-900"
                                  : reportForm.admissionResult.includes("cam kết")
                                  ? "bg-amber-50/90 border-amber-200/80 text-amber-950"
                                  : reportForm.admissionResult === "Học thử"
                                  ? "bg-[#F0FDFA] border-[#99F6E4] text-[#003B3A]"
                                  : "bg-emerald-50/90 border-emerald-200/80 text-emerald-950"
                              }`}>
                                <span className="text-[11px] font-medium opacity-80">Phán quyết đang chọn:</span>
                                <strong className="font-bold flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${
                                    reportForm.admissionResult.includes("Không")
                                      ? "bg-rose-600"
                                      : reportForm.admissionResult.includes("cam kết")
                                      ? "bg-amber-600"
                                      : reportForm.admissionResult === "Học thử"
                                      ? "bg-[#008B85]"
                                      : "bg-emerald-600"
                                  }`} />
                                  {reportForm.admissionResult === "Đạt" ? "Đạt chuẩn" : reportForm.admissionResult}
                                </strong>
                              </div>
                            ) : (
                              <div className="px-4 py-1.5 bg-amber-50/60 border-b border-amber-200/60 text-[11px] text-amber-900 font-medium flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>Chạm chọn 1 trong 4 mức kết quả bên dưới (Tự động điền nhận xét)</span>
                              </div>
                            )}
                          </div>

                          {/* Console Scrollable Cards Body (Compact & Zero-Scroll on 1366x768) */}
                          <div className="p-3 space-y-2.5 flex-1 overflow-y-auto">
                            {!canApprove && (
                              <div className="text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs font-medium flex items-center gap-2 shadow-2xs">
                                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                                <span>
                                  {selectedReportStudent?.batch?.status === "LOCKED" || selectedReportStudent?.batch?.status === "CLOSED"
                                    ? "Đợt khảo sát này đã khóa sổ xét duyệt."
                                    : "Tài khoản của bạn ở chế độ xem trên đợt này."}
                                </span>
                              </div>
                            )}

                            {/* CARD 1: VERDICT SELECTION & COMMITTED SUBJECTS */}
                            <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                  <span className="w-4.5 h-4.5 rounded-md bg-[#003B3A] text-white text-[10px] font-bold inline-flex items-center justify-center tabular-nums">1</span>
                                  <span>Kết quả xét tuyển đầu vào <span className="text-rose-500">*</span></span>
                                </label>
                                <span className="text-[10px] text-[#00736E] font-semibold">1 chạm tự động điền ghi chú</span>
                              </div>

                              {/* 2x2 Compact Horizontal Tactile Verdict Cards */}
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  {
                                    val: "Đạt",
                                    label: "Đạt chuẩn",
                                    sub: "Đủ điều kiện nhập học",
                                    icon: CheckCircle2,
                                    idleBorder: "border-slate-200/90 border-l-4 border-l-emerald-500 hover:border-emerald-400 hover:bg-emerald-50/35",
                                    idleIconCls: "bg-emerald-50 text-emerald-600 border border-emerald-200/70",
                                    activeCls: "bg-emerald-600 border-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/25",
                                    checkBadgeCls: "bg-white text-emerald-700"
                                  },
                                  {
                                    val: "Đạt cam kết",
                                    label: "Đạt cam kết",
                                    sub: "Kèm cam kết bộ môn",
                                    icon: ClipboardCheck,
                                    idleBorder: "border-slate-200/90 border-l-4 border-l-amber-500 hover:border-amber-400 hover:bg-amber-50/35",
                                    idleIconCls: "bg-amber-50 text-amber-600 border border-amber-200/70",
                                    activeCls: "bg-amber-600 border-amber-600 text-white shadow-sm ring-2 ring-amber-500/25",
                                    checkBadgeCls: "bg-white text-amber-700"
                                  },
                                  {
                                    val: "Học thử",
                                    label: "Học thử",
                                    sub: "Theo dõi thích nghi",
                                    icon: Clock,
                                    idleBorder: "border-slate-200/90 border-l-4 border-l-[#00A19A] hover:border-[#00A19A] hover:bg-[#F0FDFA]/60",
                                    idleIconCls: "bg-[#F0FDFA] text-[#008B85] border border-[#CCFBF1]",
                                    activeCls: "bg-[#008B85] border-[#008B85] text-white shadow-sm ring-2 ring-[#00A19A]/25",
                                    checkBadgeCls: "bg-white text-[#008B85]"
                                  },
                                  {
                                    val: "Không đạt",
                                    label: "Không đạt",
                                    sub: "Chưa đáp ứng chuẩn",
                                    icon: X,
                                    idleBorder: "border-slate-200/90 border-l-4 border-l-rose-500 hover:border-rose-400 hover:bg-rose-50/35",
                                    idleIconCls: "bg-rose-50 text-rose-600 border border-rose-200/70",
                                    activeCls: "bg-rose-600 border-rose-600 text-white shadow-sm ring-2 ring-rose-500/25",
                                    checkBadgeCls: "bg-white text-rose-700"
                                  }
                                ].map(opt => {
                                  const isPicked = reportForm.admissionResult === opt.val;
                                  const IconComp = opt.icon;
                                  return (
                                    <button
                                      key={opt.val}
                                      type="button"
                                      disabled={!canApprove}
                                      onClick={() => selectVerdictWithSmartNote(opt.val)}
                                      className={`relative p-2.5 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between gap-2 ${
                                        isPicked ? opt.activeCls : `bg-white text-slate-800 ${opt.idleBorder}`
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                          isPicked ? "bg-white/20 text-white" : opt.idleIconCls
                                        }`}>
                                          <IconComp className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="min-w-0">
                                          <span className={`text-xs font-bold block leading-tight truncate ${isPicked ? "text-white" : "text-slate-900"}`}>
                                            {opt.label}
                                          </span>
                                          <span className={`text-[10px] block mt-0.5 leading-tight truncate ${isPicked ? "text-white/85" : "text-slate-500"}`}>
                                            {opt.sub}
                                          </span>
                                        </div>
                                      </div>
                                      {isPicked ? (
                                        <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${opt.checkBadgeCls}`}>
                                          <Check className="w-3 h-3 stroke-[3]" />
                                        </span>
                                      ) : (
                                        <span className="w-3.5 h-3.5 rounded-full border border-slate-300 bg-slate-50/80 shrink-0" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Secondary Special Outcomes Tray */}
                              <div className="p-1.5 rounded-lg bg-slate-50/90 border border-slate-200/70 flex flex-wrap items-center justify-between gap-1">
                                <span className="text-[10.5px] font-semibold text-slate-500 px-1">Chi tiết:</span>
                                <div className="flex flex-wrap items-center gap-1">
                                  {[
                                    {
                                      val: "Đạt - Giao lưu",
                                      label: "Đạt - Giao lưu",
                                      dot: "bg-emerald-500",
                                      active: "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                    },
                                    {
                                      val: "Không đạt - Kiểm tra lại",
                                      label: "K.Đạt - KT lại",
                                      dot: "bg-amber-500",
                                      active: "bg-amber-600 text-white border-amber-600 shadow-xs"
                                    },
                                    {
                                      val: "Không đạt - Không kiểm tra lại",
                                      label: "K.Đạt - Không KT lại",
                                      dot: "bg-rose-500",
                                      active: "bg-rose-600 text-white border-rose-600 shadow-xs"
                                    }
                                  ].map(sp => {
                                    const isPicked = reportForm.admissionResult === sp.val;
                                    return (
                                      <button
                                        key={sp.val}
                                        type="button"
                                        disabled={!canApprove}
                                        onClick={() => selectVerdictWithSmartNote(sp.val)}
                                        className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold border transition-all cursor-pointer inline-flex items-center gap-1 disabled:opacity-50 ${
                                          isPicked
                                            ? sp.active
                                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70"
                                        }`}
                                      >
                                        <span className={`w-1.5 h-1.5 rounded-full ${isPicked ? "bg-white" : sp.dot}`} />
                                        <span>{sp.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Conditional Committed / Retest Subjects Highlight Panel */}
                              {(reportForm.admissionResult === "Đạt cam kết" ||
                                String(reportForm.admissionResult || "").toLowerCase().includes("cam kết") ||
                                reportForm.admissionResult === "Không đạt - Kiểm tra lại" ||
                                String(reportForm.admissionResult || "").toLowerCase().includes("kiểm tra lại")) && (() => {
                                const isRetestMode = String(reportForm.admissionResult || "").toLowerCase().includes("kiểm tra lại");
                                const selectedCount = (reportForm.committedSubjects || []).length;
                                return (
                                  <div className={`rounded-xl p-2.5 border space-y-2 ${
                                    isRetestMode
                                      ? "bg-rose-50/40 border-rose-200"
                                      : "bg-amber-50/50 border-amber-200"
                                  }`}>
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-bold text-slate-900">
                                        {isRetestMode ? "Chọn môn kiểm tra lại" : "Chọn môn cam kết"} <span className="text-rose-500">*</span>
                                      </span>
                                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${
                                        selectedCount > 0
                                          ? "bg-amber-600 text-white"
                                          : "bg-white text-amber-800 border border-amber-200"
                                      }`}>
                                        Đã chọn {selectedCount} môn
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-1">
                                      {availableCommitmentSubjects.map((sub, idx) => {
                                        const isChecked = (reportForm.committedSubjects || []).includes(sub.name);
                                        return (
                                          <label
                                            key={idx}
                                            className={`flex items-center justify-between gap-1.5 p-1.5 rounded-lg border transition-all cursor-pointer select-none text-[11px] font-semibold ${
                                              isChecked
                                                ? "bg-[#003B3A] border-[#003B3A] text-white shadow-2xs"
                                                : "bg-white border-slate-200 text-slate-700 hover:border-amber-400"
                                            }`}
                                          >
                                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
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
                                                className="rounded border-slate-300 text-[#00A19A] focus:ring-[#00A19A] w-3.5 h-3.5 shrink-0 cursor-pointer"
                                              />
                                              <span className="truncate" title={sub.name}>{sub.name}</span>
                                            </div>
                                            {sub.isSurveySubject && (
                                              <span className={`shrink-0 text-[9px] font-bold px-1 py-0.2 rounded ${
                                                isChecked ? "bg-white/20 text-[#5EEAD4]" : "bg-teal-50 text-[#00736E] border border-teal-200/70"
                                              }`}>
                                                KS
                                              </span>
                                            )}
                                          </label>
                                        );
                                      })}
                                    </div>

                                    {canApprove && (
                                      <div className="flex items-center gap-1.5 pt-1 border-t border-amber-200/60">
                                        <input
                                          type="text"
                                          placeholder="Nhập tên môn khác..."
                                          value={newCustomSubjectInput}
                                          onChange={e => setNewCustomSubjectInput(e.target.value)}
                                          onKeyDown={e => {
                                            if (e.key === "Enter") {
                                              e.preventDefault();
                                              handleAddCustomCommitmentSubject();
                                            }
                                          }}
                                          className="flex-1 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#008B85]"
                                        />
                                        <button
                                          type="button"
                                          onClick={handleAddCustomCommitmentSubject}
                                          className="px-2.5 py-1 text-xs bg-[#003B3A] hover:bg-[#005854] text-white font-semibold rounded-lg transition shrink-0 cursor-pointer"
                                        >
                                          Thêm
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>

                            {/* CARD 2: APPROVER, NOTES & COMPACT AUTO-EMAIL / AUDIT TRAIL */}
                            <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-4.5 h-4.5 rounded-md bg-[#003B3A] text-white text-[10px] font-bold inline-flex items-center justify-center tabular-nums">2</span>
                                  <span className="text-xs font-bold text-slate-900">Thẩm quyền &amp; Ý kiến chuyên môn</span>
                                </div>
                                {autoCampusDirectorName && reportForm.signatureName !== autoCampusDirectorName && canApprove && (
                                  <button
                                    type="button"
                                    onClick={() => setReportForm(f => ({ ...f, signatureName: autoCampusDirectorName }))}
                                    className="px-2 py-0.5 rounded-md bg-[#F0FDFA] hover:bg-[#CCFBF1] text-[#00736E] border border-[#CCFBF1] text-[10px] font-bold cursor-pointer"
                                    title="Đặt lại về Giám đốc Cơ sở phụ trách"
                                  >
                                    Đặt về GĐCS ({autoCampusDirectorName})
                                  </button>
                                )}
                              </div>

                              {/* Approver Identity / Selector (Default: Responsible Campus Director GĐCS) */}
                              {(() => {
                                const isGdcsCurrentUser = ["GDCS", "GĐ_CS", "GD_CS", "GĐCS", "BGH", "BGH_CS", "HIEU_TRUONG"].includes((currentUser?.role || "").toUpperCase());
                                const currentSignerValue = reportForm.signatureName || autoCampusDirectorName || "";
                                const campusShortLabel = resolvedStudentCampusObj?.campusCode || campusName;

                                if (isGdcsCurrentUser) {
                                  return (
                                    <div className="p-2 rounded-xl bg-[#F0FDFA]/80 border border-[#CCFBF1] flex items-center justify-between gap-2 text-xs">
                                      <span className="text-slate-600 font-medium flex items-center gap-1.5">
                                        <UserCheck className="w-3.5 h-3.5 text-[#008B85]" />
                                        GĐCS phê duyệt ({campusShortLabel}):
                                      </span>
                                      <strong className="text-[#003B3A] font-bold">
                                        {autoCampusDirectorName || currentUser?.fullName || "Giám đốc Cơ sở"}
                                      </strong>
                                    </div>
                                  );
                                }

                                const gdcsEntries: { name: string; label: string }[] = [];
                                const seenNames = new Set<string>();
                                const pushEntry = (rawName?: string, suffix?: string) => {
                                  const clean = String(rawName || "").trim();
                                  if (!clean || seenNames.has(clean)) return;
                                  seenNames.add(clean);
                                  gdcsEntries.push({
                                    name: clean,
                                    label: suffix ? `${clean} (${suffix})` : clean
                                  });
                                };

                                if (autoCampusDirectorName) {
                                  pushEntry(autoCampusDirectorName, `GĐCS phụ trách ${campusShortLabel}`);
                                }

                                (campuses || []).forEach(c => {
                                  const dirName = resolveGdcsNameForCampus(c);
                                  if (dirName) {
                                    pushEntry(dirName, `GĐCS ${c.campusCode || c.campusName}`);
                                  }
                                });

                                (gdcsUsers || []).forEach((u: any) => {
                                  pushEntry(u.fullName || u.email);
                                });

                                if (currentSignerValue && !seenNames.has(currentSignerValue)) {
                                  pushEntry(currentSignerValue);
                                }

                                return (
                                  <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                      <UserCheck className="w-3.5 h-3.5 text-[#008B85]" />
                                    </div>
                                    <select
                                      value={currentSignerValue}
                                      onChange={e => setReportForm(f => ({ ...f, signatureName: e.target.value }))}
                                      className={`${inp} h-8.5 pl-8 pr-8 py-1 text-xs font-semibold bg-[#F0FDFA]/40 border-[#99F6E4] text-[#003B3A] focus:bg-white appearance-none cursor-pointer`}
                                      disabled={!canApprove}
                                    >
                                      <option value="">— Chọn GĐCS phê duyệt —</option>
                                      {gdcsEntries.map(item => (
                                        <option key={item.name} value={item.name}>{item.label}</option>
                                      ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#00736E]">
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Council Notes & 1-Tap Quick Chips */}
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-slate-700 block">
                                  Ý kiến / Ghi chú của Hội đồng:
                                </label>
                                <textarea
                                  value={reportForm.directorNote}
                                  onChange={e => setReportForm(f => ({ ...f, directorNote: e.target.value }))}
                                  className={`${inp} h-14 py-1.5 text-xs resize-none bg-slate-50/60 focus:bg-white`}
                                  placeholder="Nhập nhận định hoặc yêu cầu bồi dưỡng sau tiếp nhận..."
                                  disabled={!canApprove}
                                />
                                {canApprove && (
                                  <div className="flex flex-wrap items-center gap-1">
                                    {[
                                      { short: "Đạt chuẩn tiếp nhận", full: "Đạt tiêu chuẩn tiếp nhận của nhà trường" },
                                      { short: "Cam kết bồi dưỡng", full: "Đạt cam kết - Yêu cầu bồi dưỡng thêm" },
                                      { short: "Đạt & Xuất PDF ký", full: "Đạt và xuất PDF chi tiết để GV ký" },
                                      { short: "Yêu cầu KT lại", full: "Không đạt - Yêu cầu kiểm tra lại" }
                                    ].map((sample) => {
                                      const isSelectedNote = reportForm.directorNote?.trim() === sample.full;
                                      return (
                                        <button
                                          key={sample.short}
                                          type="button"
                                          onClick={() => setReportForm(f => ({ ...f, directorNote: sample.full }))}
                                          className={`px-2 py-0.5 rounded-md text-[10.5px] font-medium transition-all cursor-pointer inline-flex items-center gap-1 border ${
                                            isSelectedNote
                                              ? "bg-[#F0FDFA] text-[#003B3A] border-[#008B85] font-semibold shadow-2xs"
                                              : "bg-slate-50 hover:bg-[#F0FDFA]/60 text-slate-600 hover:text-[#00736E] border-slate-200/90"
                                          }`}
                                        >
                                          {isSelectedNote ? <Check className="w-2.5 h-2.5 text-[#008B85]" /> : <Plus className="w-2.5 h-2.5 text-slate-400" />}
                                          <span>{sample.short}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Compact 1-Line Auto-Email & Audit Trail Toggle */}
                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                                <label
                                  htmlFor="autoSendApprovalEmailCheck"
                                  className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-700 font-medium"
                                  title="Tự động gửi email kết quả cho GĐCS, Tư vấn CS, Giáo vụ CS và Ban KT&ĐBCL"
                                >
                                  <input
                                    type="checkbox"
                                    id="autoSendApprovalEmailCheck"
                                    checked={autoSendApprovalEmail}
                                    onChange={e => setAutoSendApprovalEmail(e.target.checked)}
                                    className="w-3.5 h-3.5 text-[#008B85] rounded border-slate-300 focus:ring-[#00A19A] cursor-pointer"
                                  />
                                  <span>Gửi mail tự động</span>
                                </label>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setIsEmailRoutingModalOpen(true)}
                                    className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-slate-50 hover:bg-[#F0FDFA] text-[#003B3A] border border-slate-200 hover:border-[#008B85] inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Settings className="w-3 h-3 text-[#008B85]" />
                                    <span>Cấu hình mail</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setShowAuditHistoryDrawer(!showAuditHistoryDrawer)}
                                    className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1 cursor-pointer tabular-nums"
                                  >
                                    <Clock className="w-3 h-3 text-[#008B85]" />
                                    <span>Nhật ký ({parsedHistory.history?.length || 0})</span>
                                  </button>
                                </div>
                              </div>

                              {/* Collapsible Audit History Drawer */}
                              {showAuditHistoryDrawer && (
                                <div className="pt-2 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
                                  {(!parsedHistory.history || parsedHistory.history.length === 0) ? (
                                    <p className="text-[11px] text-slate-400 italic">
                                      Chưa có lịch sử phê duyệt trước đó.
                                    </p>
                                  ) : (
                                    <div className="relative pl-3 border-l-2 border-teal-200 space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                                      {parsedHistory.history.map((h, idx) => (
                                        <div key={idx} className="relative text-[10.5px]">
                                          <span className="absolute -left-[16px] top-2 w-2 h-2 rounded-full bg-[#008B85] ring-2 ring-white" />
                                          <div className="p-2 rounded-lg bg-slate-50/90 border border-slate-200/70 space-y-0.5">
                                            <div className="flex items-center justify-between gap-1">
                                              <strong className="text-slate-800">{h.approver}</strong>
                                              <span className="text-[10px] text-slate-400 tabular-nums">{h.timestamp}</span>
                                            </div>
                                            <div className="flex items-center gap-1 font-semibold flex-wrap">
                                              <span className="text-slate-400 line-through">{h.oldResult}</span>
                                              <ArrowRight className="w-3 h-3 text-[#008B85]" />
                                              <span className="text-[#003B3A] font-bold">{h.newResult}</span>
                                            </div>
                                            {h.note && <p className="text-slate-600 italic">&ldquo;{h.note}&rdquo;</p>}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Elevated Sticky Console Footer Actions (Single Primary CTA per Role/Status) */}
                          <div className="px-3.5 py-2.5 bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(15,23,42,0.05)] space-y-1.5 shrink-0">
                            {canApprove ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveReportResult(false)}
                                  disabled={saveReportLoading}
                                  className="flex-1 bg-[#003B3A] hover:bg-[#005250] text-white font-bold text-xs py-2.5 px-3.5 rounded-xl shadow-sm disabled:opacity-50 transition-all flex justify-center items-center gap-1.5 cursor-pointer active:scale-[0.99]"
                                >
                                  {saveReportLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Check className="w-4 h-4 text-[#5EEAD4] stroke-[2.5]" />
                                  )}
                                  <span className="truncate">
                                    {reportForm.admissionResult
                                      ? `Duyệt kết quả: ${reportForm.admissionResult === "Đạt" ? "Đạt chuẩn" : reportForm.admissionResult}`
                                      : "Duyệt kết quả khảo sát"}
                                  </span>
                                </button>

                                {(dossierNav.nextPendingId || dossierNav.nextId) && (
                                  <button
                                    type="button"
                                    onClick={() => handleSaveReportResult(true)}
                                    disabled={saveReportLoading}
                                    className="bg-white hover:bg-[#F0FDFA] text-[#003B3A] border border-[#CBD5E1] font-semibold text-xs py-2.5 px-3 rounded-xl disabled:opacity-50 transition-all flex justify-center items-center gap-1 cursor-pointer shrink-0 active:scale-[0.99]"
                                    title="Lưu quyết định hiện tại và tự động mở hồ sơ tiếp theo"
                                  >
                                    <span>Lưu &amp; tiếp</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-[#008B85]" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSendGdcsApprovalRequestForStudent(selectedReportStudent)}
                                disabled={sendingApproval}
                                className="w-full bg-[#003B3A] hover:bg-[#005250] text-white font-bold text-xs py-2.5 px-3.5 rounded-xl shadow-sm disabled:opacity-50 transition-all flex justify-center items-center gap-1.5 cursor-pointer"
                              >
                                {sendingApproval ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Send className="w-3.5 h-3.5 text-[#5EEAD4]" />
                                )}
                                <span>Gửi duyệt kết quả tới GĐCS</span>
                              </button>
                            )}

                            {(selectedReportStudent.admissionResult === "Không đạt - Kiểm tra lại" ||
                              reportForm.admissionResult === "Không đạt - Kiểm tra lại") && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsRetestModalOpen(true);
                                  setRetestPeriodId("");
                                  setRetestBatchId("");
                                }}
                                className="w-full px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold text-xs rounded-xl transition-colors flex justify-center items-center gap-1.5 cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Xếp lịch khảo sát lại</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* STICKY MOBILE / TABLET QUICK-APPROVE BAR (< 1024px when viewing Evidence) */}
                      {mobileDossierPane === "evidence" && (
                        <div className="lg:hidden bg-white border-t border-slate-200 px-3 py-2.5 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] shrink-0 space-y-2">
                          <div className="grid grid-cols-4 gap-1.5">
                            {[
                              { val: "Đạt", label: "Đạt chuẩn", activeCls: "bg-emerald-600 text-white border-emerald-600" },
                              { val: "Đạt cam kết", label: "Cam kết", activeCls: "bg-amber-600 text-white border-amber-600" },
                              { val: "Học thử", label: "Học thử", activeCls: "bg-[#008B85] text-white border-[#008B85]" },
                              { val: "Không đạt", label: "Không đạt", activeCls: "bg-rose-600 text-white border-rose-600" },
                            ].map((mOpt) => {
                              const picked = reportForm.admissionResult === mOpt.val;
                              return (
                                <button
                                  key={mOpt.val}
                                  type="button"
                                  disabled={!canApprove}
                                  onClick={() => {
                                    selectVerdictWithSmartNote(mOpt.val);
                                    if (mOpt.val === "Đạt cam kết") {
                                      setMobileDossierPane("decision");
                                    }
                                  }}
                                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                                    picked ? mOpt.activeCls : "bg-slate-50 text-slate-700 border-slate-200"
                                  }`}
                                >
                                  {mOpt.label}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveReportResult(false)}
                              disabled={saveReportLoading || !canApprove}
                              className="flex-1 bg-[#003B3A] text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5 text-[#5EEAD4]" />
                              <span className="truncate">
                                {reportForm.admissionResult ? `Lưu: ${reportForm.admissionResult === "Đạt" ? "Đạt chuẩn" : reportForm.admissionResult}` : "Chọn & Lưu quyết định"}
                              </span>
                            </button>
                            {canApprove && (dossierNav.nextPendingId || dossierNav.nextId) && (
                              <button
                                type="button"
                                onClick={() => handleSaveReportResult(true)}
                                disabled={saveReportLoading || !canApprove}
                                className="bg-[#008B85] text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1 shrink-0 disabled:opacity-50 cursor-pointer"
                              >
                                <span>Lưu &amp; Tiếp</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

        {/* MODAL NHẬP ĐIỂM & CHỈNH SỬA ĐIỂM DÀNH CHO ADMIN */}
        {isScoreModalOpen && editingSubjectObj && selectedReportStudent && (
          <Modal
            open={isScoreModalOpen}
            onClose={() => setIsScoreModalOpen(false)}
            title={isNewSubjectMode ? "Nhập điểm môn khảo sát mới" : `Chỉnh sửa điểm: ${editingSubjectObj.name}`}
            size="lg"
            footer={
              <div className="w-full flex items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-150">
                <div>
                  {!isNewSubjectMode && editingScoreRecord && (
                    <button
                      type="button"
                      onClick={() => setIsDeleteScoreConfirmOpen(true)}
                      className="px-3.5 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xóa điểm môn này
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsScoreModalOpen(false)}
                    className="px-5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveScoreSubmit}
                    disabled={isSavingScore}
                    className="px-6 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-600 hover:to-emerald-600 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingScore ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Lưu kết quả
                  </button>
                </div>
              </div>
            }
          >
            <div className="space-y-5 text-left text-xs">
              {/* STUDENT & SUBJECT HEADER BANNER */}
              <div className="bg-teal-50/60 border border-teal-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 block mb-0.5">Học sinh khảo sát</span>
                  <h4 className="text-sm font-black text-slate-800">{selectedReportStudent.fullName} ({selectedReportStudent.studentCode})</h4>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    Khối: <strong className="text-slate-700 font-bold">K{selectedReportStudent.grade || "—"}</strong> • Hệ: <strong className="text-amber-700 font-bold">{selectedReportStudent.surveyFormType || "—"}</strong>
                  </p>
                </div>
                <div className="text-right sm:border-l sm:border-teal-200 sm:pl-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Môn khảo sát</span>
                  <div className="font-black text-teal-800 text-sm">{editingSubjectObj.name}</div>
                  {editingSubjectObj.code && <span className="font-mono text-[10px] font-bold text-slate-400">{editingSubjectObj.code}</span>}
                </div>
              </div>

              {/* IF ADDING NEW SUBJECT: SUBJECT PICKER */}
              {isNewSubjectMode && (
                <Field label="Chọn môn khảo sát cần nhập điểm" required>
                  <select
                    value={editingSubjectObj.id}
                    onChange={(e) => handleSelectNewSubject(e.target.value)}
                    className={inp}
                  >
                    {(subjectsList || [])
                      .filter((s: any) => s.status !== "INACTIVE")
                      .map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code || "Môn học"})
                        </option>
                      ))}
                  </select>
                </Field>
              )}

              {/* DYNAMIC FORM FIELDS DEPENDING ON SUBJECT TYPE */}
              {(() => {
                const sCode = (editingSubjectObj.code || "").toLowerCase();
                const sName = (editingSubjectObj.name || "").toLowerCase().normalize("NFC");
                const isPsych = sCode.includes("tly") || sName.includes("tâm lý");
                const isEnglish = sName.includes("tiếng anh") || sCode.includes("eng") || sCode.includes("esl");
                const isWritten = isEnglish && (sName.includes("viết") || sCode.includes("writing") || sCode.includes("written") || sCode.includes("vt"));
                const isOral = isEnglish && (sName.includes("vấn đáp") || sName.includes("nói") || sCode.includes("speaking") || sCode.includes("oral") || sCode.includes("vd"));
                
                const oralMaxScore = 10;
                const writtenMaxScore = 10;

                let parsedCols = { scores: [], comments: [] };
                try {
                  if (editingSubjectObj.columnNames) {
                    const p = JSON.parse(editingSubjectObj.columnNames);
                    parsedCols = { scores: Array.isArray(p.scores) ? p.scores : [], comments: Array.isArray(p.comments) ? p.comments : [] };
                  }
                } catch {}

                if (isPsych) {
                  const scoreVal = parseFloat(scoreInputs[0] || "0");
                  let diagLevel = "Bình thường";
                  let diagColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                  if (scoreVal > 15 && scoreVal <= 31) {
                    diagLevel = "Dấu hiệu nhẹ";
                    diagColor = "bg-blue-50 text-blue-700 border-blue-200";
                  } else if (scoreVal > 31 && scoreVal <= 47) {
                    diagLevel = "Dấu hiệu vừa";
                    diagColor = "bg-amber-50 text-amber-700 border-amber-200";
                  } else if (scoreVal > 47 && scoreVal <= 63) {
                    diagLevel = "Nguy cơ cao";
                    diagColor = "bg-amber-50 text-amber-800 border-amber-200";
                  } else if (scoreVal > 63) {
                    diagLevel = "Nguy cơ rất cao";
                    diagColor = "bg-rose-50 text-rose-700 border-rose-200";
                  }

                  return (
                    <div className="space-y-4">
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <Field label="Tổng điểm đánh giá Tâm lý (Thang điểm 0 - 80)" required>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min="0"
                              max="80"
                              step="1"
                              value={scoreInputs[0] || ""}
                              onChange={e => setScoreInputs([e.target.value])}
                              placeholder="Nhập tổng điểm (0 - 80)"
                              className={inp + " max-w-[200px] text-lg font-black text-teal-800"}
                            />
                            <div className={`px-3 py-2 rounded-xl border text-xs font-black shadow-sm flex items-center gap-1.5 ${diagColor}`}>
                              <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                              Chẩn đoán: {diagLevel}
                            </div>
                          </div>
                        </Field>
                      </div>

                      <Field label="Kết luận sơ bộ từ chuyên viên">
                        <textarea
                          rows={3}
                          value={commentInputs[0] || ""}
                          onChange={e => {
                            const arr = [...commentInputs];
                            arr[0] = e.target.value;
                            setCommentInputs(arr);
                          }}
                          placeholder="Nhập nhận định tâm lý, hành vi, khả năng tương tác của học sinh..."
                          className="w-full p-3 bg-white border border-[#D9E2EC] text-[#1E293B] text-xs font-medium rounded-xl outline-none focus:ring-4 focus:ring-[#00B5E2]/10 focus:border-[#00B5E2]"
                        />
                      </Field>

                      <Field label="Khuyến nghị phụ huynh">
                        <textarea
                          rows={3}
                          value={commentInputs[1] || ""}
                          onChange={e => {
                            const arr = [...commentInputs];
                            arr[1] = e.target.value;
                            setCommentInputs(arr);
                          }}
                          placeholder="Nhập lời khuyên, kế hoạch hỗ trợ tâm lý dành cho phụ huynh..."
                          className="w-full p-3 bg-white border border-[#D9E2EC] text-[#1E293B] text-xs font-medium rounded-xl outline-none focus:ring-4 focus:ring-[#00B5E2]/10 focus:border-[#00B5E2]"
                        />
                      </Field>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {/* SCORE INPUTS */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Kết quả khảo sát / Điểm số
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {scoreInputs.map((val, idx) => {
                          let labelText = parsedCols.scores[idx] || (scoreInputs.length > 1 ? `Điểm ${idx + 1}` : "Điểm khảo sát");
                          let maxHint = "";

                          if (isWritten) {
                            labelText = `Điểm thi Viết (Thang điểm: ${writtenMaxScore})`;
                            maxHint = `Tối đa: ${writtenMaxScore} điểm`;
                          } else if (isOral) {
                            labelText = `Điểm thi Vấn đáp (Thang điểm: ${oralMaxScore})`;
                            maxHint = `Tối đa: ${oralMaxScore} điểm`;
                          }

                          return (
                            <Field key={idx} label={labelText} required>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={val || ""}
                                  onChange={e => {
                                    const next = [...scoreInputs];
                                    next[idx] = e.target.value;
                                    setScoreInputs(next);
                                  }}
                                  placeholder={maxHint || "Nhập điểm số (vd: 8.5)"}
                                  className={inp + " text-base font-black text-teal-800"}
                                />
                                {maxHint && (
                                  <span className="absolute right-3 top-3 text-[10px] font-bold text-slate-400">
                                    {maxHint}
                                  </span>
                                )}
                              </div>
                            </Field>
                          );
                        })}
                      </div>
                    </div>

                    {/* COMMENT INPUTS */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Ý kiến nhận xét & Đánh giá chuyên môn
                      </span>
                      {commentInputs.map((val, idx) => {
                        const labelText = parsedCols.comments[idx] || (commentInputs.length > 1 ? `Ý kiến nhận xét ${idx + 1}` : "Ý kiến nhận xét chính từ giáo viên");
                        return (
                          <Field key={idx} label={labelText}>
                            <textarea
                              rows={3}
                              value={val || ""}
                              onChange={e => {
                                const next = [...commentInputs];
                                next[idx] = e.target.value;
                                setCommentInputs(next);
                              }}
                              placeholder="Nhập nhận định năng lực, ưu điểm, hạn chế của học sinh..."
                              className="w-full p-3 bg-white border border-[#D9E2EC] text-[#1E293B] text-xs font-medium rounded-xl outline-none focus:ring-4 focus:ring-[#00B5E2]/10 focus:border-[#00B5E2]"
                            />
                          </Field>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* TEACHER NAME INPUT */}
              <Field label="Giáo viên chấm / Người cập nhật">
                <input
                  type="text"
                  value={teacherNameInput}
                  onChange={e => setTeacherNameInput(e.target.value)}
                  placeholder="Nhập họ và tên giáo viên chấm khảo sát"
                  className={inp}
                />
                <p className="text-[10px] text-slate-400 mt-0.5 ml-1">
                  Tên giáo viên được hiển thị trên bảng kết quả và phiếu nhận xét của học sinh.
                </p>
              </Field>
            </div>
          </Modal>
        )}

        {/* DELETE SCORE CONFIRM DIALOG */}
        <ConfirmDialog
          open={isDeleteScoreConfirmOpen}
          onClose={() => setIsDeleteScoreConfirmOpen(false)}
          onConfirm={handleDeleteScoreSubmit}
          message={`Bạn có chắc chắn muốn xóa toàn bộ điểm và nhận xét của môn "${editingSubjectObj?.name}" cho học sinh ${selectedReportStudent?.fullName}? Hành động này không thể hoàn tác.`}
        />
        </>
      )}



            </div>
          )}
        </div>
      )}

      </div>

      {/* ============= MODALS ============= */}

      <Modal open={isSubjectOpen} onClose={()=>setIsSubjectOpen(false)} title="Thông tin Môn Khảo sát" footer={<><button onClick={()=>setIsSubjectOpen(false)} className="flex-1 py-3 text-xs font-black uppercase text-slate-400">Hủy</button> <button onClick={handleSubjectSubmit} className="flex-1 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 text-xs font-semibold">Hoàn tất</button></>}>
        <div className="space-y-4">
           <Field label="Mã Môn" required><input value={subjectForm.code} onChange={e=>setSubjectForm(f=>({...f,code:e.target.value.toUpperCase()}))} className={inp}/></Field>
           <Field label="Tên Môn" required><input value={subjectForm.name} onChange={e=>setSubjectForm(f=>({...f,name:e.target.value}))} className={inp}/></Field>
           
           <div className="grid grid-cols-2 gap-3"><Field label="Số cột Điểm"><input type="number" min="0" max="5" value={subjectForm.scoreColumns} onChange={e=>setSubjectForm(f=>({...f,scoreColumns:parseInt(e.target.value)||0}))} className={inp}/></Field><Field label="Số cột Nhận xét"><input type="number" min="0" max="5" value={subjectForm.commentColumns} onChange={e=>setSubjectForm(f=>({...f,commentColumns:parseInt(e.target.value)||0}))} className={inp}/></Field></div>
           <Field label="Trạng thái"><select value={subjectForm.status} onChange={e=>setSubjectForm(f=>({...f,status:e.target.value}))} className={inp}><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Ngừng</option></select></Field>
           <Field label="Miễn giảm theo Diện KS">
             <div className="flex flex-wrap gap-2 p-3 text-xs font-semibold">
               {configs.filter(c => c.categoryType === "DIEN_KS").map(c => (
                 <button type="button" key={c.code} onClick={() => setSubjectForm(f => ({...f, exemptCriteria: f.exemptCriteria.includes(c.name) ? f.exemptCriteria.filter(x => x !== c.name) : [...f.exemptCriteria, c.name]}))}
                   className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition-all ${subjectForm.exemptCriteria.includes(c.name) ? 'bg-teal-500 text-white border-teal-200 shadow-md shadow-violet-200' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-200'}`}
                 >{subjectForm.exemptCriteria.includes(c.name) && <span className="mr-1">✓</span>}{c.name}</button>
               ))}
               {configs.filter(c => c.categoryType === "DIEN_KS").length === 0 && <span className="text-xs text-slate-400">Chưa có Diện KS nào trong Danh mục</span>}
             </div>
             <p className="text-[10px] text-slate-400 mt-1">Chọn các Diện KS được miễn giảm môn này</p>
           </Field>
        </div>
      </Modal>

      <Modal open={isColumnConfigOpen} onClose={()=>setIsColumnConfigOpen(false)} title={`Cấu hình cột: ${columnConfigForm.name}`} footer={<><button onClick={()=>setIsColumnConfigOpen(false)} className="flex-1 py-3 text-xs font-black uppercase text-slate-400">Hủy</button> <button onClick={handleColumnConfigSubmit} className="flex-1 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 text-xs font-semibold">Lưu cấu hình</button></>}>
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
           <div>
              <h4 className="text-sm font-black text-slate-700 mb-3 border-b pb-2">Tên cột Điểm (Tối đa {columnConfigForm.scoreColumns})</h4>
              <div className="space-y-3">
                 {Array.from({length: columnConfigForm.scoreColumns}).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 w-16">Cột {i+1}</span>
                       <input value={columnConfigForm.scoreNames[i]||""} onChange={e=>{const n=[...columnConfigForm.scoreNames];n[i]=e.target.value;setColumnConfigForm(f=>({...f,scoreNames:n}))}} placeholder="Vd: Điểm viết" className={inp}/>
                       <label className="flex items-center gap-1 text-[10px] font-black text-teal-800 whitespace-nowrap"><input type="checkbox" checked={columnConfigForm.showScoreInReport[i]||false} onChange={e=>{const r=[...columnConfigForm.showScoreInReport];r[i]=e.target.checked;setColumnConfigForm(f=>({...f,showScoreInReport:r}))}} className="rounded text-teal-800"/> Lên Phiếu</label>
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
                       <label className="flex items-center gap-1 text-[10px] font-black text-teal-800 whitespace-nowrap"><input type="checkbox" checked={columnConfigForm.showCommentInReport[i]||false} onChange={e=>{const r=[...columnConfigForm.showCommentInReport];r[i]=e.target.checked;setColumnConfigForm(f=>({...f,showCommentInReport:r}))}} className="rounded text-teal-800"/> Lên Phiếu</label>
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

      <Modal open={bModal} onClose={()=>setBModal(false)} title="Thông tin Đợt khảo sát" size="md" footer={<><button onClick={()=>setBModal(false)} className="flex-1 py-3 text-xs font-black uppercase text-slate-400">Hủy</button> <button onClick={saveBatch} className="flex-1 px-6 py-3 bg-[#48BFE3] hover:bg-[#0098C2] rounded-xl text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-50 text-xs font-semibold">{editB ? "Cập nhật đợt" : "Tạo đợt"}</button></>}>
        <div className="space-y-4">
           <div className="grid grid-cols-2 gap-3"><Field label="Số đợt"><input type="number" value={bForm.batchNumber} onChange={e=>setBForm(f=>({...f,batchNumber:e.target.value}))} className={inp}/></Field><Field label="Trạng thái"><select value={bForm.status} onChange={e=>setBForm(f=>({...f,status:e.target.value}))} className={inp}>{STATUS_OPTS.map(o=><option key={o} value={o}>{STATUS_MAP[o].label}</option>)}</select></Field></div>
                       <Field label="Tên Đợt KS" required>
              <input
                value={bForm.name}
                onChange={e => setBForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nhập tên đợt khảo sát (Vd: KSĐV, Học thử...)"
                className={inp}
              />
            </Field>
            <Field label="Tên đợt (Tự động theo cấu trúc)" required>
              <input
                 value={(() => {
                   const campus = campuses.find(c => c.id === bForm.campusId);
                   const campusName = campus ? (campus.campusCode || campus.campusName) : "Chưa chọn cơ sở";
                   const period = periods.find(p => p.id === targetPeriodId);
                   const periodName = period ? period.name : "Tên đợt";
                   let periodCode = period ? (period.code || period.name) : "Kỳ khảo sát";
                   if (periodName.toLowerCase().normalize("NFC").includes("khảo sát lẻ") || periodName.toLowerCase().normalize("NFC").includes("khảo sát le")) {
                     periodCode = "KSL";
                   }
                   const endStr = bForm.endDate ? bForm.endDate.split('-').reverse().join('/') : "__/__/____";
                   return `${campusName} _ ${periodCode} _ Đợt ${bForm.batchNumber || "1"} _ ${bForm.name || "Tên Đợt KS"} _ ${endStr}`;
                 })()}
                 disabled
                 className={`${inp} bg-slate-100 cursor-not-allowed`}
               />
              <div className="mt-1.5 p-3 text-xs font-semibold">
                <p className="text-[10px] font-black text-teal-700 uppercase tracking-widest mb-1">Hiển thị khoa học & Xét duyệt:</p>
                <p className="text-xs font-bold text-teal-800 truncate">
                   {(() => {
                     const campus = campuses.find(c => c.id === bForm.campusId);
                     const campusName = campus ? (campus.campusCode || campus.campusName) : "Chưa chọn cơ sở";
                     const period = periods.find(p => p.id === targetPeriodId);
                     const periodName = period ? period.name : "Tên đợt";
                     let periodCode = period ? (period.code || period.name) : "Kỳ khảo sát";
                     if (periodName.toLowerCase().normalize("NFC").includes("khảo sát lẻ") || periodName.toLowerCase().normalize("NFC").includes("khảo sát le")) {
                       periodCode = "KSL";
                     }
                     const endStr = bForm.endDate ? bForm.endDate.split('-').reverse().join('/') : "__/__/____";
                     return `${campusName} _ ${periodCode} _ Đợt ${bForm.batchNumber || "1"} _ ${bForm.name || "Tên Đợt KS"} _ ${endStr}`;
                   })()}
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

      <Modal open={sModal} onClose={()=>setSModal(false)} title="Thông tin Học sinh" size="lg" footer={<><button onClick={()=>setSModal(false)} className="flex-1 px-6 py-3 border border-[#D9E2EC] text-[#64748B] hover:text-[#1E293B] hover:bg-slate-100 rounded-xl transition-all cursor-pointer text-xs font-bold uppercase tracking-wider">Đóng</button> <button onClick={saveStudent} className="flex-1 px-6 py-3 bg-[#00B5E2] hover:bg-[#0098C2] text-white rounded-xl text-xs font-bold shadow-md shadow-[#00B5E2]/15 transition-all active:scale-95 cursor-pointer uppercase tracking-wider">Lưu dữ liệu</button></>}>
        <div className="space-y-4 pt-1">
           <div className="grid grid-cols-2 gap-4">
              <Field label="Mã HS KS" required><input value={sForm.studentCode} onChange={e=>setSForm(f=>({...f,studentCode:e.target.value}))} className={inp} disabled={!!editS}/></Field>
              <Field label="Ngày sinh"><input type="date" value={sForm.dateOfBirth} onChange={e=>setSForm(f=>({...f,dateOfBirth:e.target.value}))} className={inp}/></Field>
           </div>
           <Field label="Họ và Tên" required><input value={sForm.fullName} onChange={e=>setSForm(f=>({...f,fullName:e.target.value}))} className={inp}/></Field>
            
            <div className="grid grid-cols-3 gap-4">
               <Field label="Giới tính"><select value={sForm.gender} onChange={e=>setSForm(f=>({...f,gender:e.target.value}))} className={inp}><option value="">--</option><option value="Nam">Nam</option><option value="Nữ">Nữ</option></select></Field>
               <Field label="Khối"><select value={sForm.grade} onChange={e=>setSForm(f=>({...f,grade:e.target.value}))} className={inp}><option value="">--</option>{activeGrades.map(g=><option key={g} value={g}>{g}</option>)}</select></Field>
               <Field label="Học kỳ / Năm TS">
                 <select value={sForm.hocKy} onChange={e=>setSForm(f=>({...f,hocKy:e.target.value}))} className={inp}>
                   <option value="">--</option>
                   {configs.filter(c => c.categoryType === "HOC_KY").map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                 </select>
               </Field>
            </div>

                         <div className="grid grid-cols-3 gap-4">
                <Field label="Hồ sơ/Bảng điểm">
                  <select value={sForm.hoSoCtQuocTe} onChange={e=>setSForm(f=>({...f,hoSoCtQuocTe:e.target.value}))} className={inp}>
                    <option value="">--</option>
                    {configs.filter(c => c.categoryType === "HS_HT_HOC_SINH").map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Kỳ khảo sát" required>
                  <select
                    value={sForm.periodId || sPeriodId || ""}
                    onChange={(e) => {
                      const pId = e.target.value;
                      setSForm(f => ({ ...f, periodId: pId, batchId: "" }));
                    }}
                    className={inp}
                  >
                    <option value="">-- Chọn Kỳ --</option>
                    {periods.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Đợt khảo sát">
                   <select value={sForm.batchId} onChange={e=>setSForm(f=>({...f,batchId:e.target.value}))} className={inp}>
                     <option value="">-- Không có / Mặc định --</option>
                     {(periods.find(p => p.id === (sForm.periodId || sPeriodId))?.batches || []).map(b => (
                       <option key={b.id} value={b.id}>{b.name}</option>
                     ))}
                   </select>
                </Field>
             </div>

           <div className="space-y-4">
             <Field label="Đối tượng Tuyển sinh">
                <div className="p-4 bg-white border border-[#D9E2EC] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Chọn 1 đối tượng tuyển sinh:</span>
                    <button 
                      type="button"
                      onClick={() => openAddConfig("DOI_TUONG_TS")}
                      className="px-3 py-1.5 bg-[#E6F8FD] hover:bg-[#00B5E2]/25 text-[#004C97] border border-[#00B5E2]/30 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm đối tượng
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {configs.filter(c => c.categoryType === "DOI_TUONG_TS" && !c.name.toLowerCase().includes("home")).map(c => {
                      const selectedTargets = sForm.targetType ? sForm.targetType.split(",").map(t => t.trim()).filter(Boolean) : [];
                      const isChecked = selectedTargets.includes(c.name);
                      return (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => {
                             const updated = isChecked ? "" : c.name;
                             setSForm(f => ({ ...f, targetType: updated }));
                           }}
                          className={`px-4 py-2 border rounded-xl flex items-center gap-1.5 transition-all text-xs font-semibold select-none cursor-pointer ${isChecked ? 'bg-[#E6F8FD] border-[#00B5E2] text-[#004C97] font-bold shadow-sm' : 'bg-[#F8FAFC] border-[#D9E2EC] text-[#64748B] hover:bg-slate-100/50'}`}
                        >
                          {isChecked ? (
                            <span className="text-[#00B5E2] font-black text-sm">✓</span>
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                          )}
                          <span>{c.name}</span>
                        </button>
                      );
                    })}
                    {configs.filter(c => c.categoryType === "DOI_TUONG_TS" && !c.name.toLowerCase().includes("home")).length === 0 && (
                       <span className="text-xs text-slate-400 italic">Chưa có đối tượng tuyển sinh nào trong danh mục</span>
                     )}
                   </div>
                 </div>
               </Field>

               {/* CONDITIONAL LOCATION INPUTS */}
{selectedLocationType && (
                        <div className="mt-4 p-5 bg-[#F8FAFC] border border-[#D9E2EC] rounded-2xl space-y-4 animate-in slide-in-from-top-2 duration-200">
                          <div className="flex items-center gap-2 pb-2 border-b border-[#D9E2EC]/60">
                            <span className="w-1.5 h-4 bg-[#00B5E2] inline-block rounded"></span>
                            <h4 className="text-xs font-black text-[#004C97] uppercase tracking-wider">Thông tin trường học cũ ({selectedLocationType})</h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {selectedLocationType === "Nội tỉnh" && (
                              <div className="col-span-2 md:col-span-1">
                                <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Tỉnh / Thành phố *</label>
                                <input
                                  readOnly
                                  type="text"
                                  value="Thành phố Đà Nẵng"
                                  className="h-10 w-full px-3.5 py-2 bg-slate-100 border border-[#D9E2EC] text-[#1E293B] text-xs sm:text-sm font-bold rounded-xl outline-none cursor-not-allowed leading-normal"
                                />
                              </div>
                            )}

                            {selectedLocationType === "Ngoại tỉnh" && (
                              <div className="col-span-2 md:col-span-1">
                                <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Tỉnh / Thành phố *</label>
                                <select value={selectedProvince}
                                  onChange={(e) => setSelectedProvince(e.target.value)}
                                  className="h-10 w-full px-3 py-2 bg-white border border-[#D9E2EC] text-[#1E293B] text-xs sm:text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer leading-normal"
                                >
                                  <option value="">-- Chọn Tỉnh/Thành --</option>
                                  {vietnamProvinces.map((p) => (
                                    <option key={p} value={p}>{p}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {selectedLocationType === "Nước ngoài" && (
                              <div className="col-span-2 md:col-span-1">
                                <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Quốc gia *</label>
                                <select value={selectedCountry}
                                  onChange={(e) => setSelectedCountry(e.target.value)}
                                  className="h-10 w-full px-3 py-2 bg-white border border-[#D9E2EC] text-[#1E293B] text-xs sm:text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer leading-normal"
                                >
                                  <option value="">-- Chọn Quốc gia --</option>
                                  {worldCountries.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Tên trường học cũ *</label>
                              {(selectedLocationType === "Nội tỉnh" || selectedProvince === "Thành phố Đà Nẵng" || selectedProvince.includes("Đà Nẵng")) ? (
                                <div className="space-y-2">
                                  <select
                                    value={
                                      defaultDanangSchools.some((s: any) => s.name === schoolNameInput)
                                        ? schoolNameInput
                                        : (schoolNameInput ? "__OTHER__" : "")
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === "__OTHER__") {
                                        setSchoolNameInput("");
                                      } else {
                                        setSchoolNameInput(val);
                                        const matched = defaultDanangSchools.find((s: any) => s.name === val);
                                        if (matched) {
                                          const st = matched.schoolType === "PUBLIC" ? "Công lập" : matched.schoolType === "PRIVATE" ? "Tư thục" : (matched.schoolType || "");
                                          if (st) setSchoolTypeInput(st);
                                        }
                                      }
                                    }}
                                    className="h-10 w-full px-3 py-2 bg-white border border-[#D9E2EC] text-[#1E293B] text-xs sm:text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer leading-normal"
                                  >
                                    <option value="">-- Chọn Đơn vị Trường học cũ --</option>
                                    {defaultDanangSchools.map((s: any) => (
                                      <option key={s.id || s.name} value={s.name}>
                                        {s.name} ({s.schoolType === "PUBLIC" ? "Công lập" : s.schoolType === "PRIVATE" ? "Tư thục" : (s.schoolType || "Khác")})
                                      </option>
                                    ))}
                                    <option value="__OTHER__">-- Khác (Nhập thủ công bên dưới) --</option>
                                  </select>

                                  {(!schoolNameInput || !defaultDanangSchools.some((s: any) => s.name === schoolNameInput)) && (
                                    <input type="text" value={schoolNameInput}
                                      onChange={(e) => setSchoolNameInput(e.target.value)}
                                      placeholder="Nhập tên trường cũ (VD: TH Phù Đổng)"
                                      className="h-10 w-full px-3.5 py-2 bg-white border border-[#D9E2EC] text-[#1E293B] placeholder-[#94A3B8] text-xs sm:text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 leading-normal"
                                    />
                                  )}
                                </div>
                              ) : (
                                <input type="text" value={schoolNameInput}
                                  onChange={(e) => setSchoolNameInput(e.target.value)}
                                  placeholder="Nhập tên trường cũ (VD: TH Phù Đổng)"
                                  className="h-10 w-full px-3.5 py-2 bg-white border border-[#D9E2EC] text-[#1E293B] placeholder-[#94A3B8] text-xs sm:text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 leading-normal"
                                />
                              )}
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Loại hình trường *</label>
                              <select value={schoolTypeInput}
                                onChange={(e) => setSchoolTypeInput(e.target.value)}
                                className="h-10 w-full px-3 py-2 bg-white border border-[#D9E2EC] text-[#1E293B] text-xs sm:text-sm font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer leading-normal"
                              >
                                <option value="">-- Chọn loại hình --</option>
                                <option value="Công lập">Công lập</option>
                                <option value="Tư thục">Tư thục</option>
                                <option value="Song ngữ">Song ngữ</option>
                                <option value="Quốc tế">Quốc tế</option>
                                <option value="Homeschooling">Homeschooling</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}


             <div className="grid grid-cols-2 gap-4">
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
                    {currentEduSystems.map(es => <option key={es.code} value={es.code}>{es.code} - {es.name}</option>)}
                  </select>
                </Field>
             </div>
        </div>
      </Modal>

      <Modal open={cModal} onClose={()=>setCModal(false)} title="Giá trị Danh mục" size="sm" footer={<><button onClick={()=>setCModal(false)} className="flex-1 text-xs font-black uppercase text-slate-400">Hủy</button> <button onClick={saveConfig} className="flex-1 text-white text-xs font-black uppercase tracking-widest text-xs font-semibold">Lưu</button></>}>
        <div className="space-y-4">
           <Field label="Loại"><input value={cForm.categoryType} disabled className={inp}/></Field>
           <Field label="Mã (Code)"><input value={cForm.code} onChange={e=>setCForm(f=>({...f,code:e.target.value.toUpperCase()}))} className={inp}/></Field>
           <Field label="Tên hiển thị"><input value={cForm.name} onChange={e=>setCForm(f=>({...f,name:e.target.value}))} className={inp}/></Field>
        </div>
      </Modal>

      {/* PRINT MODAL */}
      {isPrintModalOpen && selectedReportStudent && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsPrintModalOpen(false);
              setMockPreviewStudent(null);
            }
          }}
          className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto no-print-backdrop cursor-pointer"
        >
<style>{`

              /* html2canvas grid/flex gap polyfill */
              .print-page .flex-col > div {
                margin-bottom: 6px !important;
              }
              .print-page .flex-col > div:last-child {
                margin-bottom: 0 !important;
              }
              .print-page .flex-row > div {
                padding-right: 16px !important;
              }
              .print-page .flex-row > div:last-child {
                padding-right: 0 !important;
              }


              .print-watermark {
                    display: block !important;
                    position: absolute !important;
                    top: 22% !important;
                    left: 10% !important;
                    transform: none !important;
                    width: 80% !important;
                    height: auto !important;
                    opacity: 0.08 !important;
                    z-index: 0 !important;
                    pointer-events: none !important;
              }

            /* FORCE EXPLICIT A4 PORTRAIT CONFIGURATION */
            @page { 
              size: A4 portrait; 
              margin: 0mm; 
            }
            
            .print-page::before {
              content: "";
              position: absolute;
              pointer-events: none;
              background-image: url('${studentCampusConfig?.background || "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\" fill=\"%23007A87\"><path d=\"M10,80 Q50,40 90,20 Q60,50 10,80 Z\"/><path d=\"M30,80 Q60,55 90,35 Q65,60 30,80 Z\"/></svg>"}');
              background-repeat: no-repeat;
              background-position: center;
              background-size: contain;
              opacity: ${studentCampusConfig?.background ? '0.45' : '0.2'};
              top: 50%;
              left: 50%;
              width: 80%;
              height: 80%;
              transform: translate(-50%, -50%) ${studentCampusConfig?.background ? '' : 'rotate(-15deg)'};
            }

            /* SCREEN SIMULATION ONLY */
            @media screen {
              /* Anchor scrolling at the top to prevent Chrome Flexbox negative overflow cutoff */
              #print-body-scroll-wrapper {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: flex-start !important;
              }
              
              /* Zoom out the simulated pages so they fit completely on screen without scrolling */
              #print-main-container {
                zoom: 0.65;
                -moz-transform: scale(0.65);
                -moz-transform-origin: top center;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                gap: 32px !important;
                width: 100% !important;
                margin: 0 auto !important;
              }
              
              #print-letter-area, .print-page {
                width: 210mm !important;
                height: 297mm !important; /* Locked exact physical A4 height on screen! */
                min-height: 297mm !important;
                max-height: 297mm !important;
                margin: 0 auto !important;
                padding: 20mm 20mm 42mm 20mm !important; /* Reserved 28mm bottom zone for pinned absolute footer! */
                flex-shrink: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-start !important; /* Flex content flows naturally to the reserved zone */
                overflow: hidden !important;
                box-sizing: border-box !important;
                background: white !important;
                font-family: "Times New Roman", Times, serif !important;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
                position: relative !important;
              }
              
              /* DEFINITIVE ABSOLUTE FOOTER ANCHOR FOR SCREEN AND PRINT */
              .print-footer {
                position: absolute !important;
                bottom: 12mm !important; left: 20mm !important; right: 20mm !important; padding: 0 !important; height: auto !important;
                margin-bottom: 0 !important;
                margin-top: 0 !important;
                box-sizing: border-box !important;
                background: transparent !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: center !important;
                z-index: 9999 !important;
              }
              
              /* Sync typographic rendering to match high-fidelity print view on screen */
              .print-page p, #print-letter-area p {
                font-size: 15px !important;
                line-height: 1.85 !important;
                text-align: justify !important;
                text-justify: inter-word !important;
              }
              .print-page h2, #print-letter-area h2 {
                font-size: 22px !important;
                text-align: center !important;
                margin-top: 16px !important;
                margin-bottom: 16px !important;
              }
              .print-page img[alt="Logo"] {
                max-height: 40px !important;
                object-fit: contain !important;
              }
              .print-page img[alt="Signature"] {
                max-height: 64px !important;
                object-fit: contain !important;
              }
              .print-page img[alt="Footer Print"] {
                width: 100% !important;
                max-height: 100px !important;
                object-fit: contain !important;
              }
              .print-page .grid-cols-12 p, .print-page .grid p {
                font-size: 10px !important;
              }
              .print-page .grid-cols-12 .font-bold {
                font-size: 10.5px !important;
              }
            }

            /* PRINT OUTPUT CONSTRAINTS */
            @media print {
              /* ----------------- NATIVE PRINT FIXES ----------------- */
              #print-main-container {
                zoom: 1 !important;
                -moz-transform: none !important;
                transform: none !important;
                display: block !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                position: relative !important;
              }
              
              .print-page {
                width: 210mm !important;
                height: auto !important;
                min-height: auto !important;
                max-height: none !important;
                margin: 0 !important; /* MUST BE 0 to avoid Chrome auto-centering */
                padding: 20mm 20mm 42mm 20mm !important;
                box-shadow: none !important;
                border: none !important;
                display: flex !important;
                flex-direction: column !important;
                position: relative !important;
                background: white !important;
                overflow: visible !important;
              }
              
              /* Force all footers to anchor to the very bottom of the page */
              .print-footer {
                position: relative !important;
                margin-top: 40px !important;
                bottom: auto !important;
                width: 100% !important;
                padding-left: 15mm !important;
                padding-right: 15mm !important;
                box-sizing: border-box !important;
                flex-shrink: 0 !important;
              }
              
              /* Watermark */
              
              
              
              .print-page:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }


              @page {
                size: A4 portrait;
                margin: 0mm;
              }
              /* USER MANDATED HTML/BODY RESET WITH ZERO FIXED HEIGHTS & FIT TO PRINT BOUNDS */
              html, body {
                width: 100% !important;
                height: auto !important;
                 overflow: visible !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                font-family: "Times New Roman", Times, serif !important;
                background: white !important;
                overflow: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              
              /* 1. DISABLE ALL ANIMATIONS AND UNIFY FONT TYPE */
              *, *::before, *::after {
                animation: none !important;
                transition: none !important;
                animation-duration: 0s !important;
                transition-duration: 0s !important;
                box-sizing: border-box !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
                font-family: "Times New Roman", Times, serif !important;
              }
              
              body * {
                visibility: hidden !important;
              }
              
              /* 2. NEUTRALIZE LAYOUT ANCESTORS TO UNBLOCK MULTI-PAGE FLOW & ENFORCE (0,0) ANCHORING */
              html, body, body *:has(.no-print-backdrop) {
                position: static !important;
                margin: 0 !important;
                padding: 0 !important;
                left: 0 !important;
                top: 0 !important;
                width: auto !important;
                transform: none !important;
                overflow: visible !important;
                height: auto !important;
                max-height: none !important;
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
                display: block !important;
                width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                z-index: 999999999 !important;
                background: transparent !important;
                transform: none !important;
              }
              
              /* USER MANDATED FLEX CONTAINER WITHOUT ANY HEIGHTS */
              .print-page, #print-letter-area {
                width: 210mm !important;
                height: 297mm !important;
                min-height: 297mm !important;
                max-height: 297mm !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
                padding: 20mm 20mm 42mm 20mm !important;
                overflow: hidden !important; 
                overflow: visible !important;
                box-sizing: border-box !important;
                
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-start !important;
                
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                page-break-after: avoid !important;
                break-after: avoid !important;
                position: relative !important;
                background: white !important;
              }
              
              /* DEFINITIVE ABSOLUTE PRINT FOOTER PIN FOR 297mm A4 SHEETS */
              .print-page .print-footer, #print-letter-area .print-footer {
                position: absolute !important;
                bottom: 12mm !important;
                left: 20mm !important;
                right: 20mm !important;
                width: auto !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
                background: transparent !important;
                display: block !important;
                z-index: 9999 !important;
                flex-shrink: 0 !important;
              }
              .print-page > div {
                flex: none !important;
              }
              
              /* USER MANDATED CONTENT TYPOGRAPHY RULES */
              .print-page p, #print-letter-area p, .print-page .space-y-2\.5 p, .print-page .space-y-3 p, .print-page .space-y-6 p {
                text-align: justify !important;
                text-justify: inter-word !important;
                line-height: 1.45 !important; /* Admin Standards: 1.45 */
                font-size: 13.5pt !important; /* Admin Standards: 13.5pt */
                font-family: "Times New Roman", Times, serif !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
              }
              
              .print-page h2, #print-letter-area h2 {
                text-align: center !important;
                text-transform: uppercase !important;
                color: #0f172a !important;
                font-family: "Times New Roman", Times, serif !important;
                font-size: 22px !important; /* Stand-out centered title size */
                font-weight: bold !important;
                margin-top: 16px !important;
                margin-bottom: 16px !important;
                letter-spacing: 0.5px !important;
              }
              
              .print-page:last-child {
                page-break-after: avoid !important;
                break-after: auto !important;
              }
              
              /* Guarantee Page 2 starts on a fresh physical sheet during print, WITHOUT blank first page */
              .print-page + .print-page {
                page-break-before: always !important;
                break-before: page !important;
              }
              
              /* Enforce scaling and aesthetics dynamically for elements */
              .print-page img[alt="Logo"] {
                max-height: 40px !important; /* Increased for high clarity */
                object-fit: contain !important;
              }
              
              .print-page img[alt="Signature"] {
                max-height: 64px !important; /* Large balanced signature */
                object-fit: contain !important;
              }
              
              .print-page img[alt="Footer Print"] {
                width: 100% !important;
                max-height: 100px !important; /* Highly legible footer image */
                object-fit: contain !important;
              }
              
              /* Custom styling for nested manual footer text content to make it highly readable */
              .print-page .grid-cols-12 p, .print-page .grid p {
                font-size: 10px !important;
                line-height: 1.4 !important;
              }
              .print-page .grid-cols-12 .font-bold {
                font-size: 10.5px !important;
              }
              
              .no-print {
                display: none !important;
              }
            }
          `}</style>
          
          <div 
            id="print-modal-inner-wrapper" 
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-3xl shadow-2xl flex flex-col w-[210mm] shrink-0 max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200 cursor-default"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200/90 no-print text-xs font-semibold z-10">
              <div className="flex items-center gap-2">
                {isInvitation ? <Mail className="w-5 h-5 text-teal-800"/> : <GraduationCap className="w-5 h-5 text-teal-800"/>}
                <h3 className="text-base font-black text-slate-800">{isInvitation ? "Mẫu Thư mời khảo sát" : isCommitment ? "Bản Cam kết học tập" : "Mẫu Thư Chúc mừng"}</h3>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  id="export-pdf-btn"
                  onClick={async () => {
                    const printArea = document.getElementById('print-main-container');
                    if (!printArea) return;
                    
                    const academicYearStr = selectedReportStudent?.academicYear?.substring(0, 4) || new Date().getFullYear().toString();
                    const currentDate = new Date();
                    const yearStr = currentDate.getFullYear().toString();
                    const monthStr = "T" + String(currentDate.getMonth() + 1).padStart(2, '0');
                    const dayStr = String(currentDate.getDate()).padStart(2, '0');
                    const studentName = selectedReportStudent?.fullName || "";
                    const prefix = isInvitation ? "TM" : isCommitment ? "BCK" : "TCM";
                    const pdfFileName = `${yearStr}-${monthStr}.${dayStr}-${prefix}-${studentName}.pdf`;
                    
                    const btn = document.getElementById('export-pdf-btn') as HTMLButtonElement | null;
                    if(btn) {
                      btn.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Đang tạo PDF...';
                      btn.disabled = true;
                    }

                                        try {
                      // THE ULTIMATE ROBUST SOLUTION: Native Chrome Print with our pixel-perfect A4 CSS Overrides!
                      // This completely avoids html2pdf.js memory leaks, crashes on modern colors (lab/oklch), CORS issues, and page deformation!
                      const originalTitle = document.title;
                      // Clean up filename for PDF naming
                      document.title = pdfFileName.replace(/\.pdf$/, '');
                      
                      const savedScrollY = window.scrollY;
                      window.scrollTo(0, 0);
                      
                      // Allow a microtask for rendering before print
                      setTimeout(() => {
                        window.print();
                        window.scrollTo(0, savedScrollY);
                        // Restore original title shortly after
                        setTimeout(() => {
                          document.title = originalTitle;
                        }, 1000);
                      }, 100);
                    } catch (err: any) {
                      alert('Lỗi khi gọi lệnh in: ' + (err.message || err));
                      console.error(err);
                    } finally {
                      if(btn) {
                        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg> Xuất File PDF / In';
                        btn.disabled = false;
                      }
                    }
                  }}
                  className="hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-100 flex items-center gap-2 transition-all text-xs font-semibold"
                >
                  <Download className="w-4 h-4" />
                  Xuất File PDF / In
                </button>
                
                <button type="button"
                  onClick={() => { setIsPrintModalOpen(false); setMockPreviewStudent(null); }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-slate-50 text-slate-500 shadow-sm transition-all cursor-pointer text-xs font-semibold"
                >
                  <X className="w-4 h-4 pointer-events-none"/>
                </button>
              </div>
            </div>
            
            {/* Modal Body / Paper Container */}
            <div id="print-body-scroll-wrapper" className="overflow-y-auto p-4 bg-slate-100 flex justify-center max-h-[80vh]">
              <div id="print-main-container" className="block relative bg-slate-200">
                <div 
                  id="print-letter-area" 
                  className="bg-white shadow-lg border border-slate-200 relative text-slate-800 text-sm leading-relaxed print-page"
                  style={{ fontFamily: "'Times New Roman', Times, serif", width: "210mm", height: "auto", padding: "20mm 20mm 42mm 20mm", margin: "0 auto 20px auto", boxSizing: "border-box", display: "block", overflow: "hidden" }}
              >
                {/* Print Watermark */}
                <img crossOrigin={(rcBackground || DEFAULT_WATERMARK_SVG).startsWith("data:") ? undefined : "anonymous"}  className="print-watermark" src={rcBackground || DEFAULT_WATERMARK_SVG} alt="Watermark" style={{ display: "block", position: "absolute", top: "22%", left: "10%", transform: "none", width: "80%", height: "auto", opacity: 0.08, zIndex: 0, pointerEvents: "none" }} />
                {/* Top Logo and Header */}
                <div className="flex flex-col relative z-10 w-full">
                  <div className="flex flex-col gap-1 border-b pb-2 mb-3">
                    <div className="flex items-center justify-between">
                      {studentCampusConfig?.logo ? (
                        <img crossOrigin={studentCampusConfig.logo?.startsWith("data:") ? undefined : "anonymous"}  src={studentCampusConfig.logo} alt="Logo" className="h-12 object-contain" />
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
                    <h2 className="text-2xl font-black tracking-widest text-teal-800 uppercase mb-2" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
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
                      <div className="space-y-3 text-justify text-slate-800 font-serif" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "13.5pt", lineHeight: "1.45", textAlign: "justify" }}>
                        {renderTemplate(studentCampusConfig.content, {
                          ...(mergedStudent || selectedReportStudent),
                          signatureName: studentCampusConfig?.directorName || (mergedStudent || selectedReportStudent)?.signatureName || ""
                        }).split('\n').filter(Boolean).map((para: string, idx: number) => (
                          <p key={idx} className="" style={{ textIndent: "1cm" }}>{para}</p>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-6 text-justify text-[15px] leading-relaxed">
                        <p className="" style={{ textIndent: "1cm" }}>
                          Hội đồng Tuyển sinh Hệ thống Giáo dục Sky-Line trân trọng gửi lời chào và lời chúc sức khỏe, an khang đến Quý phụ huynh cùng gia đình.
                        </p>
                        
                        <p className="" style={{ textIndent: "1cm" }}>
                          Nhằm tạo điều kiện tốt nhất để nhà trường hiểu rõ hơn về năng lực tư duy, ngôn ngữ cũng như thiên hướng phát triển tự nhiên của học sinh, qua đó xây dựng lộ trình rèn luyện tối ưu nhất, chúng tôi trân trọng kính mời Quý phụ huynh cùng học sinh tham gia buổi <strong className="font-bold">Khảo sát Năng lực Đầu vào</strong> hệ <strong className="font-bold">{selectedReportStudent.surveyFormType || "Hội nhập Global"}</strong> năm học <strong className="font-bold">2026-2027</strong>.
                        </p>
                        
                        <div className="p-5 space-y-2 text-sm text-slate-700 ml-4 font-sans leading-relaxed shadow-inner text-xs font-semibold">
                          <p><strong>• Thời gian khảo sát:</strong> Theo lịch hẹn cụ thể được sắp xếp từ Ban Tuyển sinh.</p>
                          
                          <p><strong>• Nội dung khảo sát:</strong> Đánh giá tư duy ngôn ngữ, tư duy logic tự nhiên và khả năng tương tác xã hội phù hợp theo độ tuổi.</p>
                        </div>
                        
                        <p className="" style={{ textIndent: "1cm" }}>
                          Sự hiện diện và đồng hành của Quý phụ huynh cùng học sinh là niềm hân hạnh lớn cho Sky-Line, giúp nhà trường có sự chuẩn bị chu đáo nhất đón chào các em gia nhập mái trường hạnh phúc của chúng ta.
                        </p>
                        
                        <p className="italic text-slate-600">
                          Trân trọng kính mời Quý phụ huynh và các em học sinh!
                        </p>
                      </div>
                    )
                  ) : isCommitment ? (
                    <div className="space-y-3 text-justify text-slate-800 font-serif" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "13.5pt", lineHeight: "1.45", textAlign: "justify" }}>
                      {renderTemplate(
                        studentCampusConfig?.content || getDefaultContent("cam_ket_hoc_tap"),
                        {
                          ...selectedReportStudent,
                          signatureName: studentCampusConfig?.directorName || selectedReportStudent?.signatureName || ""
                        }
                      ).split('\n').filter(Boolean).map((para: string, idx: number) => {
                        const isList = /^[\d•\-*]+/.test(para.trim());
                        return (
                          <p key={idx} className={isList ? "pl-4" : ""} style={isList ? {} : { textIndent: "1cm" }}>
                            {para}
                          </p>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3 text-justify text-slate-800 font-serif" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "13.5pt", lineHeight: "1.45", textAlign: "justify" }}>
                      {renderTemplate(
                        studentCampusConfig?.content || getDefaultContent("thu_chuc_mung"),
                        {
                          ...selectedReportStudent,
                          signatureName: studentCampusConfig?.directorName || selectedReportStudent?.signatureName || ""
                        }
                      ).split('\n').filter(Boolean).map((para: string, idx: number) => (
                        <p key={idx} className="" style={{ textIndent: "1cm" }}>
                          {para}
                        </p>
                      ))}
                    </div>
                  )}


                {/* Bottom Signature Area with dynamic spacer */}
                <div style={{ flex: "1 1 auto", minHeight: "16px", maxHeight: "60px" }} />
                {isCommitment ? (
                  <div className="grid grid-cols-2 gap-8 mt-4 text-center">
                    <div className="flex flex-col items-center">
                      <p className="font-bold uppercase text-slate-700 text-xs tracking-wider">ĐẠI DIỆN GIA ĐÌNH</p>
                      <p className="italic text-[10px] text-slate-400 mt-1">(Ký và ghi rõ họ tên)</p>
                      <div className="h-16 flex items-end justify-center">
                        <span className="text-slate-300 italic text-xs">Ký tên</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <p className="italic text-slate-500 mb-1 text-xs">{formattedLetterDate}</p>
                      <p className="font-bold uppercase text-teal-800 text-xs tracking-wider">TM. HỘI ĐỒNG TUYỂN SINH</p>
                      <p className="font-bold uppercase text-teal-800/80 text-[10px] tracking-wider mb-4">GIÁM ĐỐC ĐIỀU HÀNH SKY-LINE {campusTitleSuffix}</p>
                      
                      <div className="h-14 flex items-center justify-center">
                        {studentCampusConfig?.isApproved ? (
                          studentCampusConfig?.signature ? (
                            <img crossOrigin={studentCampusConfig.signature?.startsWith("data:") ? undefined : "anonymous"} src={studentCampusConfig.signature} alt="Signature" className="max-h-full object-contain" />
                          ) : (
                            <div className="inline-flex flex-col items-center justify-center border border-[#00A19A]/45 bg-[#F0FDFA]/85 rounded-md px-3 py-1 leading-tight">
                              <span className="text-[8pt] font-bold text-[#00736E] uppercase tracking-wide">✓ Đã ký số GĐCS</span>
                              <span className="text-[9pt] font-bold italic text-[#003B3A]">{studentCampusConfig?.directorName || "Đỗ Quang Trung"}</span>
                            </div>
                          )
                        ) : null}
                      </div>
                      
                      <p className="font-bold text-slate-700 mt-1 text-sm">
                        {studentCampusConfig?.directorName || "Đỗ Quang Trung"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-end mt-4 pr-4">
                    <div className="flex flex-col items-center text-center" style={{ minWidth: "240px" }}>
                      <p className="italic text-slate-500 mb-1">{formattedLetterDate}</p>
                      <p className="font-bold uppercase text-teal-800 text-xs tracking-wider">TM. HỘI ĐỒNG TUYỂN SINH</p>
                      <p className="font-bold uppercase text-teal-800/80 text-[10px] tracking-wider mb-3">GIÁM ĐỐC ĐIỀU HÀNH SKY-LINE {campusTitleSuffix}</p>
                      
                      <div className="h-14 flex items-center justify-center">
                        {studentCampusConfig?.isApproved ? (
                          studentCampusConfig?.signature ? (
                            <img crossOrigin={studentCampusConfig.signature?.startsWith("data:") ? undefined : "anonymous"} src={studentCampusConfig.signature} alt="Signature" className="max-h-full object-contain" />
                          ) : (
                            <div className="inline-flex flex-col items-center justify-center border border-[#00A19A]/45 bg-[#F0FDFA]/85 rounded-md px-3 py-1 leading-tight">
                              <span className="text-[8pt] font-bold text-[#00736E] uppercase tracking-wide">✓ Đã ký số GĐCS</span>
                              <span className="text-[9pt] font-bold italic text-[#003B3A]">{studentCampusConfig?.directorName || "Đỗ Quang Trung"}</span>
                            </div>
                          )
                        ) : null}
                      </div>
                      
                      <p className="font-bold text-slate-700 mt-1 text-sm">
                        {studentCampusConfig?.directorName || "Đỗ Quang Trung"}
                      </p>
                    </div>
                  </div>
                )}
                </div>

                
                
                {/* Footer Contact */}
                {studentCampusConfig?.footer ? (
                  <div className="pt-2 z-10 w-full print-footer" style={{ marginTop: "24px", width: "100%", paddingLeft: "0", paddingRight: "0", boxSizing: "border-box" }}>
                    <img crossOrigin={studentCampusConfig.footer?.startsWith("data:") ? undefined : "anonymous"} src={studentCampusConfig.footer} alt="Footer Print" className="w-full block" style={{ width: "100%", height: "auto", maxHeight: "28mm", objectFit: "contain", display: "block" }} />
                  </div>
                ) : (
                  <div className="w-full pt-1 mt-4 z-10 print-footer" style={{ marginTop: "40px", width: "100%", paddingLeft: "15mm", paddingRight: "15mm", boxSizing: "border-box", fontFamily: "Arial, sans-serif" }}>
                    {/* High-fidelity Header Title & Line */}
                    <div className="flex items-center gap-2 mb-2.5 w-full">
                      <span className="font-bold text-[#48BFE3] whitespace-nowrap uppercase text-[11.5px] tracking-wide">HỆ THỐNG GIÁO DỤC SKY-LINE</span>
                      <div className="flex-grow border-t border-[#48BFE3]/70 h-0 mt-0.5"></div>
                      <span className="font-semibold text-[#48BFE3] whitespace-nowrap lowercase text-[11px]">www.skylineschool.edu.vn</span>
                    </div>
                    
                    {/* Information Grid */}
                    <div className="flex flex-row justify-between w-full relative text-[9px]">
                      {/* Left Column (3 branches) */}
                      <div className="w-[30%] flex flex-col gap-1.5 text-left">
                        <div>
                          <p className="font-bold text-[#48BFE3] text-[9.5px] leading-tight">SKY-LINE Riverside</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Lô A2.4 Trần Đăng Ninh, P. Hòa Cường, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#48BFE3] text-[9.5px] leading-tight">SKY-LINE Central</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Số 48 Nguyễn Du, P. Hải Châu, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#48BFE3] text-[9.5px] leading-tight">SKY-LINE Global</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Lô A2 Trần Đăng Ninh, P. Hòa Cường, TP. Đà Nẵng</p>
                        </div>
                      </div>

                      {/* Middle Column (3 branches) */}
                      <div className="w-[30%] flex flex-col gap-1.5 text-left">
                        <div>
                          <p className="font-bold text-[#48BFE3] text-[9.5px] leading-tight">SKY-LINE Beach</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Số 199 Trần Anh Tông, P. Thanh Khê, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#48BFE3] text-[9.5px] leading-tight">SKY-LINE Hill</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Khối Hà My Đông A, P. Điện Bàn Đông, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#48BFE3] text-[9.5px] leading-tight">Trung tâm sống thành công - SLS</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Số 48 Nguyễn Du, P. Hải Châu, TP. Đà Nẵng</p>
                        </div>
                      </div>

                      {/* Right Column (Contacts) */}
                      <div className="w-[30%] flex items-center justify-end gap-2 text-right self-center">
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
                    <div className="absolute right-[-5px] top-[2px] w-16 h-12 opacity-100 pointer-events-none flex items-center justify-center text-[#48BFE3]">
                      <svg viewBox="0 0 120 60" className="w-full h-full fill-current" style={{ filter: "drop-shadow(0px 1px 1px rgba(0,166,169,0.1))" }}>
                        <path d="M 8 26 C 24 32, 50 52, 62 60 C 78 36, 102 16, 118 3 C 95 16, 76 44, 62 62 C 48 46, 25 32, 8 26 Z" />
                      </svg>
                    </div>
                  </div>
                )}
              

                </div>
                {modalDocList && modalDocList.length > 0 && (
                  <div 
                    className="bg-white shadow-lg border border-slate-200 relative text-slate-800 text-sm leading-relaxed print-page mt-8"
                    style={{ fontFamily: "'Times New Roman', Times, serif", width: "210mm", height: "auto", padding: "20mm 20mm 42mm 20mm", margin: "0 auto 20px auto", boxSizing: "border-box", display: "block", overflow: "hidden" }}
                  >
                    <div className="flex flex-col relative z-10 w-full">
                {/* Print Watermark */}
                <img crossOrigin="anonymous"  className="print-watermark" src={rcBackground || DEFAULT_WATERMARK_SVG} alt="Watermark" style={{ display: "block", position: "absolute", top: "22%", left: "10%", transform: "none", width: "80%", height: "auto", opacity: 0.08, zIndex: 0, pointerEvents: "none" }} />
                {/* Top Logo and Header (Synchronized perfectly with Page 1) */}
                      <div className="flex flex-col gap-1 border-b pb-2 mb-3">
                        <div className="flex items-center justify-between">
                          {studentCampusConfig?.logo ? (
                            <img crossOrigin={studentCampusConfig.logo?.startsWith("data:") ? undefined : "anonymous"}  src={studentCampusConfig.logo} alt="Logo" className="h-12 object-contain" />
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
                        <h2 className="text-xl font-bold tracking-widest text-teal-800 uppercase mb-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                          DANH MỤC HỒ SƠ NHẬP HỌC
                        </h2>
                      </div>

                      {/* Checklist Table (Redesigned 2-Column, Sharp Dark Borders) */}
                      <div className="mt-4 overflow-hidden border border-slate-950">
                        <table className="w-full border-collapse text-left text-[13px] text-slate-900" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                          <thead>
                            <tr className="bg-white border-b border-slate-950">
                              <th className="px-3 py-2.5 font-bold border-r border-slate-950 text-center uppercase text-slate-950 w-16" style={{ borderRightWidth: '1px', borderColor: '#000' }}>STT</th>
                              <th className="px-5 py-2.5 font-bold border-r border-slate-950 text-center uppercase text-slate-950" style={{ borderRightWidth: '1px', borderColor: '#000' }}>Tên hồ sơ</th>
                              <th className="p-2 p-2 font-bold text-center uppercase text-slate-950 w-32 border border-slate-200">Số lượng</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white">
                            {modalDocList.map((item, idx) => (
                              <tr key={item.id} className="border-b border-slate-950 last:border-b-0">
                                <td className="px-3 py-2.5 border-r border-slate-950 text-center text-slate-900" style={{ borderRightWidth: '1px', borderColor: '#000' }}>{idx + 1}</td>
                                <td className="px-5 py-2.5 border-r border-slate-950 font-medium text-slate-900" style={{ borderRightWidth: '1px', borderColor: '#000' }}>{item.name}</td>
                                <td className="p-2 p-2 text-center text-slate-950 font-bold border border-slate-200">{item.qty}</td>
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
                      <div className="border-t border-slate-200 pt-3 z-10 w-full print-footer" style={{ marginTop: "40px", width: "100%", paddingLeft: "15mm", paddingRight: "15mm", boxSizing: "border-box" }}>
                        <img crossOrigin={studentCampusConfig.footer?.startsWith("data:") ? undefined : "anonymous"}  src={studentCampusConfig.footer} alt="Footer Print" className="w-full" style={{ maxHeight: "100px", objectFit: "contain" }} />
                      </div>
                    ) : (
                      <div className="w-full pt-1 mt-4 z-10 print-footer" style={{ marginTop: "40px", width: "100%", paddingLeft: "15mm", paddingRight: "15mm", boxSizing: "border-box", fontFamily: "Arial, sans-serif" }}>
                    {/* High-fidelity Header Title & Line */}
                    <div className="flex items-center gap-2 mb-2.5 w-full">
                      <span className="font-bold text-[#48BFE3] whitespace-nowrap uppercase text-[11.5px] tracking-wide">HỆ THỐNG GIÁO DỤC SKY-LINE</span>
                      <div className="flex-grow border-t border-[#48BFE3]/70 h-0 mt-0.5"></div>
                      <span className="font-semibold text-[#48BFE3] whitespace-nowrap lowercase text-[11px]">www.skylineschool.edu.vn</span>
                    </div>
                    
                    {/* Information Grid */}
                    <div className="flex flex-row justify-between w-full relative text-[9px]">
                      {/* Left Column (3 branches) */}
                      <div className="w-[30%] flex flex-col gap-1.5 text-left">
                        <div>
                          <p className="font-bold text-[#48BFE3] text-[9.5px] leading-tight">SKY-LINE Riverside</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Lô A2.4 Trần Đăng Ninh, P. Hòa Cường, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#48BFE3] text-[9.5px] leading-tight">SKY-LINE Central</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Số 48 Nguyễn Du, P. Hải Châu, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#48BFE3] text-[9.5px] leading-tight">SKY-LINE Global</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Lô A2 Trần Đăng Ninh, P. Hòa Cường, TP. Đà Nẵng</p>
                        </div>
                      </div>

                      {/* Middle Column (3 branches) */}
                      <div className="w-[30%] flex flex-col gap-1.5 text-left">
                        <div>
                          <p className="font-bold text-[#48BFE3] text-[9.5px] leading-tight">SKY-LINE Beach</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Số 199 Trần Anh Tông, P. Thanh Khê, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#48BFE3] text-[9.5px] leading-tight">SKY-LINE Hill</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Khối Hà My Đông A, P. Điện Bàn Đông, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#48BFE3] text-[9.5px] leading-tight">Trung tâm sống thành công - SLS</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Số 48 Nguyễn Du, P. Hải Châu, TP. Đà Nẵng</p>
                        </div>
                      </div>

                      {/* Right Column (Contacts) */}
                      <div className="w-[30%] flex items-center justify-end gap-2 text-right self-center">
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
                    <div className="absolute right-[-5px] top-[2px] w-16 h-12 opacity-100 pointer-events-none flex items-center justify-center text-[#48BFE3]">
                      <svg viewBox="0 0 120 60" className="w-full h-full fill-current" style={{ filter: "drop-shadow(0px 1px 1px rgba(0,166,169,0.1))" }}>
                        <path d="M 8 26 C 24 32, 50 52, 62 60 C 78 36, 102 16, 118 3 C 95 16, 76 44, 62 62 C 48 46, 25 32, 8 26 Z" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* PAGE 3+: ASSESSMENT DETAILS (Specific for Child Development Standard) */}
                {selectedReportStudent.scores && selectedReportStudent.scores.map((sc: any) => {
                  const subject = sc.subject || {};
                  const subName = (subject.name || "").toLowerCase().normalize("NFC");
                  const subCode = (subject.code || "").toLowerCase();
                  const isChildDev = subName.includes("chuẩn phát triển") || subCode.includes("cpt") || subCode.includes("tci");
                  
                  if (!isChildDev) return null;

                  let scoreVals = [];
                  try { if (sc.scores) { const parsed = JSON.parse(sc.scores); scoreVals = Array.isArray(parsed) ? parsed : [parsed]; } } catch { scoreVals = [sc.scores]; }
                  
                  let parsedCols = { scores: [] };
                  try { if (subject.columnNames) { const parsed = JSON.parse(subject.columnNames); parsedCols = { scores: Array.isArray(parsed.scores) ? parsed.scores : [] }; } } catch {}

                  const failedCriteria = scoreVals.map((v, idx) => ["2", "Không đạt", "KHONG_DAT"].includes(String(v ?? "").trim()) ? (parsedCols.scores[idx] || (isChildDev ? [
    "Chỉ số 65. Có thói quen chào hỏi, cảm ơn, xin phép và xưng hô lễ phép với người lớn",
    "Chỉ số 74. Tập trung chú ý thực hiện nhiệm vụ và hoạt động.",
    "Chỉ số 16. Nhận biết về tên gọi, đặc điểm bên ngoài, giới tính, sở thích, điểm mạnh, điểm yếu của bản thân.",
    "Chỉ số 14. Nhận ra tình huống nguy hiểm và biết cách xử lý phù hợp.",
    "Chỉ số 33. Sử dụng lời nói, hành vi lịch sự trong giao tiếp.",
    "Chỉ số 31. Nghe và phản hồi thông tin đơn giản.",
    "Chỉ số 48. Gọi tên các ngày trong tuần theo thứ tự.",
    "Chỉ số 47. Xác định được vị trí (trong, ngoài, trên, dưới, sau, phải, trái) của một vật so với một vật khác.",
    "Chỉ số 51. Phân loại một số sự vật thành nhóm theo đặc điểm chung và gọi tên nhóm.",
    "Chỉ số 45. Xác định một số hình phẳng và hình khối đơn giản trong cuộc sống xung quanh.",
    "Chỉ số 42,43. Tách, gộp số lượng trong phạm vi 10; so sánh, thêm bớt số lượng trong phạm vi 10.",
    "Chỉ số 38. Nhận biết và gọi tên chữ cái trong bảng chữ cái Tiếng Việt.",
    "Chỉ số 41. Bắt chước hành vi “viết”",
    "Chỉ số 9. Thực hiện các việc tự phục vụ không cần sự giúp đỡ.",
    "Chỉ số 60. Thể hiện ý tưởng, cảm xúc của bản thân thông qua hát, vận động theo nhạc.",
    "Chỉ số 61. Tô màu kín, không chờm ra ngoài đường viền các hình có chi tiết nhỏ."
][idx] : ("Tiêu chí " + (idx + 1)))) : null).filter(Boolean);
                  const skippedCriteria = scoreVals.map((v, idx) => ["1", "Không làm", "KHONG_LAM"].includes(String(v ?? "").trim()) ? (parsedCols.scores[idx] || (isChildDev ? [
    "Chỉ số 65. Có thói quen chào hỏi, cảm ơn, xin phép và xưng hô lễ phép với người lớn",
    "Chỉ số 74. Tập trung chú ý thực hiện nhiệm vụ và hoạt động.",
    "Chỉ số 16. Nhận biết về tên gọi, đặc điểm bên ngoài, giới tính, sở thích, điểm mạnh, điểm yếu của bản thân.",
    "Chỉ số 14. Nhận ra tình huống nguy hiểm và biết cách xử lý phù hợp.",
    "Chỉ số 33. Sử dụng lời nói, hành vi lịch sự trong giao tiếp.",
    "Chỉ số 31. Nghe và phản hồi thông tin đơn giản.",
    "Chỉ số 48. Gọi tên các ngày trong tuần theo thứ tự.",
    "Chỉ số 47. Xác định được vị trí (trong, ngoài, trên, dưới, sau, phải, trái) của một vật so với một vật khác.",
    "Chỉ số 51. Phân loại một số sự vật thành nhóm theo đặc điểm chung và gọi tên nhóm.",
    "Chỉ số 45. Xác định một số hình phẳng và hình khối đơn giản trong cuộc sống xung quanh.",
    "Chỉ số 42,43. Tách, gộp số lượng trong phạm vi 10; so sánh, thêm bớt số lượng trong phạm vi 10.",
    "Chỉ số 38. Nhận biết và gọi tên chữ cái trong bảng chữ cái Tiếng Việt.",
    "Chỉ số 41. Bắt chước hành vi “viết”",
    "Chỉ số 9. Thực hiện các việc tự phục vụ không cần sự giúp đỡ.",
    "Chỉ số 60. Thể hiện ý tưởng, cảm xúc của bản thân thông qua hát, vận động theo nhạc.",
    "Chỉ số 61. Tô màu kín, không chờm ra ngoài đường viền các hình có chi tiết nhỏ."
][idx] : ("Tiêu chí " + (idx + 1)))) : null).filter(Boolean);

                  if (failedCriteria.length === 0 && skippedCriteria.length === 0) return null;

                  return (
                    <div 
                      key={"assessment_page_" + sc.id}
                      className="bg-white shadow-lg border border-slate-200 relative text-slate-800 text-sm leading-relaxed print-page mt-8"
                      style={{ fontFamily: "'Times New Roman', Times, serif", width: "210mm", height: "auto", padding: "20mm 20mm 42mm 20mm", margin: "0 auto 20px auto", boxSizing: "border-box", display: "block", overflow: "hidden" }}
                    >
                      <div className="flex flex-col relative z-10 w-full">
                        {/* Print Watermark */}
                        <img crossOrigin={(rcBackground || DEFAULT_WATERMARK_SVG).startsWith("data:") ? undefined : "anonymous"} className="print-watermark" src={rcBackground || DEFAULT_WATERMARK_SVG} alt="Watermark" style={{ display: "block", position: "absolute", top: "22%", left: "10%", transform: "none", width: "80%", height: "auto", opacity: 0.08, zIndex: 0, pointerEvents: "none" }} />
                        
                        {/* Top Logo and Header */}
                        <div className="flex flex-col gap-1 border-b pb-2 mb-3">
                          <div className="flex items-center justify-between">
                            {studentCampusConfig?.logo ? (
                              <img crossOrigin={studentCampusConfig.logo?.startsWith("data:") ? undefined : "anonymous"} src={studentCampusConfig.logo} alt="Logo" className="h-12 object-contain" />
                            ) : (
                              <span className="text-2xl font-black tracking-tight text-teal-600" style={{ fontFamily: "Arial, sans-serif" }}>SKY-LINE</span>
                            )}
                          </div>
                          <div className="text-left">
                            <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-800" style={{ fontFamily: "Arial, sans-serif" }}>{studentSchoolName}</h4>
                          </div>
                        </div>

                        <div className="text-center my-6">
                          <h2 className="text-xl font-bold tracking-widest text-teal-800 uppercase mb-2">CHI TIẾT ĐÁNH GIÁ</h2>
                          <h3 className="text-lg font-bold text-slate-700 uppercase">{subject.name}</h3>
                        </div>

                        <div className="space-y-8 mt-4">
                          {failedCriteria.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-base font-bold text-rose-700 border-b border-rose-200 pb-1 uppercase tracking-wide">Các tiêu chí chưa đạt</h4>
                              <ul className="space-y-2 list-none">
                                {failedCriteria.map((name, i) => (
                                  <li key={i} className="flex items-start gap-3 text-[14px]">
                                    <span className="mt-1.5 w-1.5 h-1.5 shrink-0 text-xs font-semibold"></span>
                                    {name}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {skippedCriteria.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-base font-bold text-slate-600 border-b border-slate-200 pb-1 uppercase tracking-wide">Các tiêu chí chưa thực hiện</h4>
                              <ul className="space-y-2 list-none">
                                {skippedCriteria.map((name, i) => (
                                  <li key={i} className="flex items-start gap-3 text-[14px]">
                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                                    {name}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Contact */}
                      {studentCampusConfig?.footer ? (
                        <div className="border-t border-slate-200 pt-3 z-10 w-full print-footer" style={{ marginTop: "40px", width: "100%", paddingLeft: "15mm", paddingRight: "15mm", boxSizing: "border-box" }}>
                          <img crossOrigin={studentCampusConfig.footer?.startsWith("data:") ? undefined : "anonymous"} src={studentCampusConfig.footer} alt="Footer Print" className="w-full" style={{ maxHeight: "100px", objectFit: "contain" }} />
                        </div>
                      ) : (
                        <div className="w-full pt-1 mt-4 z-10 print-footer" style={{ marginTop: "40px", width: "100%", paddingLeft: "15mm", paddingRight: "15mm", boxSizing: "border-box", fontFamily: "Arial, sans-serif" }}>
                          <div className="flex items-center gap-2 mb-2.5 w-full">
                            <span className="font-bold text-[#48BFE3] whitespace-nowrap uppercase text-[11.5px] tracking-wide">HỆ THỐNG GIÁO DỤC SKY-LINE</span>
                            <div className="flex-grow border-t border-[#48BFE3]/70 h-0 mt-0.5"></div>
                          </div>
                          <div className="flex flex-row justify-between w-full relative text-[9px]">
                            <div className="w-full text-center">
                              <p className="text-[#555555] text-[8.5px]">www.skylineschool.edu.vn | Hotline: (+84.236) 378 7777</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    )}
      {/* Email Modal Overlay */}
                  {isEmailModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-[150] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-2 border-teal-200 animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="bg-[#0c363f] p-6 text-white shrink-0 relative overflow-hidden border-b border-[#14b8a6]/10">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Mail className="w-32 h-32 text-white" />
              </div>
              <div className="relative z-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-400 shadow-inner">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-wide flex items-center gap-2 text-white">
                      Gửi Báo cáo nhanh qua Email
                    </h2>
                    <p className="text-slate-300 text-xs mt-0.5 font-medium">Gửi trực tiếp danh sách kết quả khảo sát qua hệ thống email</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEmailModalOpen(false)} 
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/80 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar bg-[#f8fafc]">
              
              {/* Recipient Checkbox Configuration Panel */}
              <div className="bg-white p-6 rounded-3xl border-2 border-rose-100/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">
                      THIẾT LẬP CHECK EMAIL NHẬN
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
                      Chọn nhanh nhóm nhận thư tự động dựa trên Cơ sở (CS)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const targetCS = ['CS1', 'CS2', 'CS3', 'CS4'];
                        const newChecked = {
                          tuvan: [...targetCS],
                          giaovu: [...targetCS],
                          gdcs: [...targetCS],
                          cc: true
                        };
                        setCheckedEmails(newChecked);
                        
                        const selectedEmails: string[] = [];
                        newChecked.tuvan.forEach((c: any) => selectedEmails.push((EMAIL_MAP.tuvan as any)[c]));
                        newChecked.giaovu.forEach((c: any) => selectedEmails.push((EMAIL_MAP.giaovu as any)[c]));
                        newChecked.gdcs.forEach((c: any) => selectedEmails.push((EMAIL_MAP.gdcs as any)[c]));
                        if (newChecked.cc) selectedEmails.push(EMAIL_MAP.cc);
                        
                        const currentEmails = recipientEmail.split(',').map(e => e.trim()).filter(Boolean);
                        const manualEmails = currentEmails.filter(e => !allMapEmails.includes(e));
                        setRecipientEmail([...manualEmails, ...selectedEmails].join(', '));
                      }}
                      className="px-3 py-1.5 bg-[#0c363f]/5 hover:bg-[#0c363f]/10 text-[#0c363f] font-bold text-[10px] rounded-xl transition-colors cursor-pointer select-none"
                    >
                      Chọn nhanh CS1-CS4
                    </button>
                    <button
                      onClick={() => {
                        const newChecked = { tuvan: [], giaovu: [], gdcs: [], cc: false };
                        setCheckedEmails(newChecked);
                        const currentEmails = recipientEmail.split(',').map(e => e.trim()).filter(Boolean);
                        const manualEmails = currentEmails.filter(e => !allMapEmails.includes(e));
                        setRecipientEmail(manualEmails.join(', ') || ((currentUser as any)?.email || "ktdbcl@skylineschool.edu.vn"));
                      }}
                      className="hover:bg-rose-100 text-rose-600 font-bold text-[10px] transition-colors cursor-pointer select-none text-xs font-semibold"
                    >
                      Xóa chọn
                    </button>
                  </div>
                </div>
                
                <div className="divide-y divide-slate-50 text-xs">
                  {/* Row 1: Tư vấn */}
                  <div className="grid grid-cols-1 md:grid-cols-6 items-center gap-2 py-3">
                    <span className="text-[11px] font-bold text-slate-500 md:col-span-1 tracking-wider uppercase">Tư vấn:</span>
                    <div className="md:col-span-5 flex flex-wrap gap-x-6 gap-y-3">
                      {['CS1', 'CS2', 'CS3', 'CS4', 'CS5'].map(cs => (
                        <label key={`tuvan-${cs}`} className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 hover:text-[#0c363f] transition-colors select-none">
                          <input
                            type="checkbox"
                            checked={checkedEmails.tuvan.includes(cs)}
                            onChange={() => handleCheckboxChange('tuvan', cs)}
                            className="rounded border-slate-300 text-[#0c363f] focus:ring-[#0c363f] w-4.5 h-4.5 cursor-pointer accent-[#0c363f] transition-colors"
                          />
                          <span>{cs}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Row 2: Giáo vụ */}
                  <div className="grid grid-cols-1 md:grid-cols-6 items-center gap-2 py-3">
                    <span className="text-[11px] font-bold text-slate-500 md:col-span-1 tracking-wider uppercase">Giáo vụ:</span>
                    <div className="md:col-span-5 flex flex-wrap gap-x-6 gap-y-3">
                      {['CS1', 'CS2', 'CS3', 'CS4', 'CS5'].map(cs => (
                        <label key={`giaovu-${cs}`} className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 hover:text-[#0c363f] transition-colors select-none">
                          <input
                            type="checkbox"
                            checked={checkedEmails.giaovu.includes(cs)}
                            onChange={() => handleCheckboxChange('giaovu', cs)}
                            className="rounded border-slate-300 text-[#0c363f] focus:ring-[#0c363f] w-4.5 h-4.5 cursor-pointer accent-[#0c363f] transition-colors"
                          />
                          <span>{cs}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Row 3: GĐCS */}
                  <div className="grid grid-cols-1 md:grid-cols-6 items-center gap-2 py-3">
                    <span className="text-[11px] font-bold text-slate-500 md:col-span-1 tracking-wider uppercase">GĐCS:</span>
                    <div className="md:col-span-5 flex flex-wrap gap-x-6 gap-y-3">
                      {['CS1', 'CS2', 'CS3', 'CS4', 'CS5'].map(cs => (
                        <label key={`gdcs-${cs}`} className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 hover:text-[#0c363f] transition-colors select-none">
                          <input
                            type="checkbox"
                            checked={checkedEmails.gdcs.includes(cs)}
                            onChange={() => handleCheckboxChange('gdcs', cs)}
                            className="rounded border-slate-300 text-[#0c363f] focus:ring-[#0c363f] w-4.5 h-4.5 cursor-pointer accent-[#0c363f] transition-colors"
                          />
                          <span>{cs}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Row 4: CC */}
                  <div className="grid grid-cols-1 md:grid-cols-6 items-center gap-2 py-3">
                    <span className="text-[11px] font-bold text-slate-500 md:col-span-1 tracking-wider uppercase">CC:</span>
                    <div className="md:col-span-5">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 hover:text-[#0c363f] transition-colors select-none">
                        <input
                          type="checkbox"
                          checked={checkedEmails.cc}
                          onChange={() => handleCheckboxChange('cc', 'cc')}
                          className="rounded border-slate-300 text-[#0c363f] focus:ring-[#0c363f] w-4.5 h-4.5 cursor-pointer accent-[#0c363f] transition-colors"
                        />
                        <span className="text-slate-500">cc@skylineschool.edu.vn</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Form Config Card */}
              <div className="bg-white p-6 rounded-3xl border-2 border-amber-200/70 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    NGƯỜI NHẬN (EMAIL)
                  </label>
                  <input
                    type="text"
                    value={recipientEmail}
                    onChange={e => handleRecipientEmailChange(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200/80 rounded-2xl px-4.5 py-3.5 text-sm font-semibold text-slate-700 outline-none focus:bg-white focus:border-[#0c363f] focus:ring-4 focus:ring-[#0c363f]/5 transition-all shadow-sm placeholder:text-slate-300"
                    placeholder="Nhập địa chỉ email người nhận..."
                  />
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5 ml-1">
                    Có thể nhập nhiều email, phân cách bằng dấu phẩy ( , )
                  </p>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    TIÊU ĐỀ THƯ
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200/80 rounded-2xl px-4.5 py-3.5 text-sm font-semibold text-slate-700 outline-none focus:bg-white focus:border-[#0c363f] focus:ring-4 focus:ring-[#0c363f]/5 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Attach Letters Option Switch */}
              <div className="bg-white p-5 rounded-3xl border-2 border-blue-100/80 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Có đính kèm File PDF (Thư chúc mừng & Bản cam kết)</span>
                  <span className="text-[11px] text-slate-400 font-semibold leading-relaxed">Tự động tạo và đính kèm liên kết tệp PDF Thư chúc mừng / Bản cam kết cho từng học sinh đạt yêu cầu</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={attachLetters}
                    onChange={e => setAttachLetters(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0c363f]"></div>
                </label>
              </div>

              {/* Table Card */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-widest">
                    DANH SÁCH HỌC SINH GỬI ĐI ({emailStudents.length} HỌC SINH)
                  </span>
                  <span className="text-[10px] font-black text-[#14b8a6] bg-[#14b8a6]/10 px-3 py-1 rounded-full">
                    Bản xem trước
                  </span>
                </div>
                
                {/* Table Preview */}
                <div className="overflow-x-auto max-h-[300px] custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#003B3A] sticky top-0 border-b z-10 text-white border-[#003B3A]">
                      <tr className="text-[11px] font-semibold whitespace-nowrap">
                        <th className="p-2 text-center text-[10px] bg-[#003B3A] border border-white/15 font-semibold">STT</th>
                        <th className="p-2 text-left text-[10px] bg-[#003B3A] border border-white/15 font-semibold">Họ và tên</th>
                        <th className="p-2 text-center text-[10px] bg-[#003B3A] border border-white/15 font-semibold">Khối</th>
                        <th className="p-2 text-center text-[10px] bg-[#003B3A] border border-white/15 font-semibold">Phái</th>
                        <th className="p-2 text-center text-[10px] bg-[#003B3A] border border-white/15 font-semibold">Ngày sinh</th>
                        <th className="p-2 text-left text-[10px] bg-[#003B3A] border border-white/15 font-semibold">Hệ khảo sát</th>
                        <th className="p-2 text-center text-[10px] bg-[#003B3A] border border-white/15 font-semibold">Kết quả học tập</th>
                        <th className="p-2 text-center text-[10px] bg-[#003B3A] border border-white/15 font-semibold">Kết quả rèn luyện</th>
                        <th className="p-2 text-center text-[10px] bg-[#003B3A] border border-white/15 font-semibold">Kết quả</th>
                        <th className="p-2 text-left text-[10px] bg-[#003B3A] border border-white/15 font-semibold">Cơ sở nhận</th>
                        {attachLetters && (
                          <th className="p-2 text-center text-[10px] bg-[#003B3A] border border-white/15 font-semibold">Hồ sơ đính kèm</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] bg-white">
                      {emailStudents.map((s, idx) => (
                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors text-xs font-semibold">
                          <td className="p-2 text-center text-slate-400 font-semibold border border-slate-200">{idx + 1}</td>
                          <td className="p-2 font-bold text-slate-700 border border-slate-200">{s.fullName}</td>
                          <td className="p-2 text-center font-bold text-slate-600 border border-slate-200">K{s.grade}</td>
                          <td className="p-2 text-center font-medium text-slate-500 border border-slate-200">{s.gender === "M" || s.gender === "Nam" ? "Nam" : s.gender === "F" || s.gender === "Nữ" ? "Nữ" : s.gender || "—"}</td>
                          <td className="p-2 text-center text-slate-500 border border-slate-200">{s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "—"}</td>
                          <td className="p-2 text-slate-600 font-medium border border-slate-200">{s.surveyFormType || s.surveySystem || "—"}</td>
                          <td className="p-2 text-center text-slate-600 font-medium border border-slate-200">{s.kqHocTap || "—"}</td>
                          <td className="p-2 text-center text-slate-600 font-medium border border-slate-200">{s.kqRenLuyen || "—"}</td>
                          <td className="p-2 text-center border border-slate-200">
                            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black ${
                              s.admissionResult === "Đạt" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                              s.admissionResult === "Đạt - Giao lưu" ? "bg-teal-50 text-teal-700 border border-teal-200" :
                              s.admissionResult === "Đạt cam kết" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                              (s.admissionResult === "Không đạt" || s.admissionResult === "Không đạt - Kiểm tra lại" || s.admissionResult === "Không đạt - Không kiểm tra lại") ? "bg-rose-50 text-rose-600 border border-rose-100" :
                              s.admissionResult === "Học thử" ? "bg-teal-50 text-teal-800 border border-teal-100" :
                              "bg-slate-50 text-slate-500"
                            }`}>
                              {s.admissionResult || "Chưa duyệt"}
                            </span>
                          </td>
                          <td className="p-2 font-bold text-slate-600 border border-slate-200">{s.admissionCampus || "—"}</td>
                          {attachLetters && (
                            <td className="p-2 text-center border border-slate-200">
                              <div className="flex flex-col gap-1 items-center justify-center">
                                {s.admissionResult === "Đạt" && (
                                  <span className="text-emerald-600 text-[10px] font-black text-xs font-semibold">
                                    Thư chúc mừng
                                  </span>
                                )}
                                {s.admissionResult === "Đạt cam kết" && (
                                  <>
                                    <span className="text-emerald-600 text-[10px] font-black mb-0.5 text-xs font-semibold">
                                      Thư chúc mừng
                                    </span>
                                    <span className="text-amber-600 text-[10px] font-black text-xs font-semibold">
                                      Bản cam kết
                                    </span>
                                  </>
                                )}
                                {s.admissionResult !== "Đạt" && s.admissionResult !== "Đạt cam kết" && (
                                  <span className="text-slate-400">—</span>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                      {emailStudents.length === 0 && (
                        <tr>
                          <td colSpan={attachLetters ? 9 : 8} className="p-2 text-center text-slate-400 font-bold text-xs font-semibold">Không có học sinh nào có kết quả xét duyệt dưới đợt/kỳ này.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fallback & Custom Display Preview Block */}
              {emailResult && (
                <div className={`p-5 rounded-2xl border animate-in fade-in slide-in-from-top-4 duration-300 ${
                  emailResult.sent 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                    : "bg-amber-50 border-amber-100 text-amber-900"
                }`}>
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5">
                      {emailResult.sent ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm mb-1">
                        {emailResult.sent ? "Gửi Email Thành công!" : "Hệ thống SMTP không phản hồi (Bản xem trước sẵn sàng)"}
                      </h4>
                      <p className="text-xs leading-relaxed opacity-90">
                        {emailResult.sent 
                          ? `Báo cáo nhanh đã được gửi trực tiếp tới hòm thư ${recipientEmail}. Báo cáo đính kèm bản cam kết học tập.`
                          : `Máy chủ SMTP không thể gửi thư trực tiếp (Lỗi: ${emailResult.error || "Timeout"}). Tuy nhiên, Skyline đã tạo sẵn mã HTML email chuyên nghiệp phía dưới cho thầy cô.`}
                      </p>
                      
                      {/* Live Iframe Preview if SMTP failed */}
                      {!emailResult.sent && emailResult.html && (
                        <div className="mt-4 space-y-3">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-white/60 px-2 py-1 rounded border">Xem trước Thư & Sao chép:</span>
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-inner">
                            <iframe 
                              srcDoc={emailResult.html}
                              className="w-full h-80 border-0"
                              title="Email Live Preview"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(emailResult.html || "");
                                alert("Đã sao chép nội dung HTML! Bạn có thể dán trực tiếp vào Outlook/Gmail để gửi.");
                              }}
                              className="hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all cursor-pointer text-xs font-semibold"
                            >
                              📋 Sao chép HTML Email
                            </button>
                            <a
                              href={`mailto:${recipientEmail}?subject=${encodeURIComponent(emailSubject)}&body=Xin mời xem bảng HTML báo cáo khảo sát đính kèm.`}
                              className="hover:bg-[#003B3A] text-white font-bold text-xs transition-all text-xs font-semibold"
                            >
                              📧 Mở Hòm thư Outlook/Gmail
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-slate-100 flex justify-end items-center gap-3 shrink-0">
              <button 
                onClick={() => setIsEmailModalOpen(false)} 
                className="px-5 py-2.5 rounded-xl hover:bg-slate-100 font-bold text-slate-700 text-xs transition-colors"
              >
                Đóng lại
              </button>
              <button
                onClick={handleExportDirectPDFs}
                disabled={emailSending || emailStudents.length === 0}
                className="hover:bg-emerald-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs font-semibold"
              >
                {emailSending && emailSendingStatus.includes("tải") ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{emailSendingStatus || "Đang tải..."}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Xuất & Tải trực tiếp PDF
                  </>
                )}
              </button>
              <button
                onClick={handleSendQuickEmailSubmit}
                disabled={emailSending || emailStudents.length === 0}
                className="bg-[#0c363f] hover:bg-[#08262c] text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {emailSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{emailSendingStatus || "Đang gửi..."}</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Xác nhận & Gửi Email
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Dialog Form: Đăng ký Khảo sát lại */}
      {isRetestModalOpen && selectedReportStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 flex justify-between items-center text-xs font-semibold">
              <div>
                <h3 className="text-lg font-black text-slate-800">Đăng ký Khảo sát lại</h3>
                <p className="text-xs text-slate-400 font-bold uppercase mt-0.5 tracking-wider">
                  Học sinh: {selectedReportStudent.fullName}
                </p>
              </div>
              <button
                onClick={() => setIsRetestModalOpen(false)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all text-xs font-semibold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Học sinh đã duyệt kết quả <span className="text-rose-600 font-bold">Không đạt - Kiểm tra lại</span>. 
                Thực hiện đăng ký học sinh vào một Kỳ/Đợt khảo sát mới để thi lại. 
                Mã học sinh <span className="font-bold text-teal-800">({selectedReportStudent.studentCode})</span> sẽ được giữ nguyên để đối chiếu lịch sử.
              </p>

              {/* Target Period selection */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Kỳ khảo sát mới *</label>
                <select
                  value={retestPeriodId}
                  onChange={(e) => {
                    setRetestPeriodId(e.target.value);
                    setRetestBatchId("");
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#48BFE3]/20 focus:border-[#48BFE3] outline-none bg-white cursor-pointer font-semibold"
                >
                  <option value="">-- Chọn Kỳ khảo sát mới --</option>
                  {visiblePeriods.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Target Batch selection */}
              {retestPeriodId && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Đợt khảo sát mới</label>
                  <select
                    value={retestBatchId}
                    onChange={(e) => setRetestBatchId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#48BFE3]/20 focus:border-[#48BFE3] outline-none bg-white cursor-pointer font-semibold"
                  >
                    <option value="">-- Chọn Đợt khảo sát mới (Tất cả / Lẻ) --</option>
                    {(visiblePeriods.find(p => p.id === retestPeriodId)?.batches || [])
                      .filter((b: any) => b.id !== selectedReportStudent.batchId && b.status === "ACTIVE")
                      .map((b: any) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <div className="p-4 flex justify-end gap-2 text-xs font-semibold">
              <button
                type="button"
                disabled={retestRegisterLoading}
                onClick={() => setIsRetestModalOpen(false)}
                className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={retestRegisterLoading || !retestPeriodId}
                onClick={async () => {
                  await handleRegisterRetest();
                  setIsRetestModalOpen(false);
                }}
                className="flex items-center gap-1.5 hover:bg-[#003B3A] text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50 text-xs font-semibold"
              >
                {retestRegisterLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4"/>}
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL PHIẾU PHỎNG VẤN ĐỊNH HƯỚNG HS & TRAO ĐỔI VỚI PHỤ HUYNH (BM.KTĐBCL.31..42) */}
      {isPvdhModalOpen && selectedReportStudent && (
        <PvdhOrientationModal
          isOpen={isPvdhModalOpen}
          onClose={() => setIsPvdhModalOpen(false)}
          student={selectedReportStudent}
          initialSection={pvdhModalInitialSection}
          onSuccess={() => {
            if (selectedReportStudent?.id) {
              reloadStudentOrientationWorkspace(selectedReportStudent.id);
            }
          }}
        />
      )}
      {/* MODAL PHIẾU ĐỊNH HƯỚNG ĐẦU VÀO (2 TAB) */}
      {isOrientationModalOpen && selectedReportStudent && (
        <StudentOrientationModal
          isOpen={isOrientationModalOpen}
          onClose={() => setIsOrientationModalOpen(false)}
          student={{
            ...selectedReportStudent,
            admissionResult: reportForm.admissionResult || selectedReportStudent.admissionResult,
            directorNote: reportForm.directorNote || selectedReportStudent.directorNote,
            signatureName: reportForm.signatureName || selectedReportStudent.signatureName
          }}
          onOpenReport={(stu, orData) => {
            setIsOrientationReportModalOpen(true);
          }}
          onSuccess={() => {
            if (selectedReportStudent?.id) {
              reloadStudentOrientationWorkspace(selectedReportStudent.id);
            }
          }}
        />
      )}

      {/* MODAL BÁO CÁO NHẬN DIỆN VÀ ĐỊNH HƯỚNG ĐẦU VÀO (A4) */}
      {isOrientationReportModalOpen && selectedReportStudent && (
        <StudentOrientationReportModal
          isOpen={isOrientationReportModalOpen}
          onClose={() => setIsOrientationReportModalOpen(false)}
          student={{
            ...selectedReportStudent,
            admissionResult: reportForm.admissionResult || selectedReportStudent.admissionResult,
            directorNote: reportForm.directorNote || selectedReportStudent.directorNote,
            signatureName: reportForm.signatureName || selectedReportStudent.signatureName
          }}
          orientationData={orientationData}
        />
      )}

      {/* MODAL CHECK ĐỦ NỘI DUNG KHẢO SÁT, NHẮC GV & TRÌNH GĐCS */}
      <CompletenessCheckModal
        open={isCompletenessModalOpen}
        onClose={() => setIsCompletenessModalOpen(false)}
        students={filteredReportStudents}
        completenessMap={completenessMap}
        periodId={reportPeriodId}
        periodName={reportSelPeriod?.name || "Kỳ khảo sát"}
        batchId={reportBatchId}
        batchName={
          reportBatchId === "all"
            ? "Tất cả các đợt"
            : reportBatchId === "none"
            ? "Khảo sát lẻ"
            : reportBatches.find((b) => b.id === reportBatchId)?.name || "Đợt khảo sát"
        }
        campuses={campuses}
        emailRoutingConfig={emailRoutingConfig}
        defaultGdcsEmailMap={EMAIL_MAP.gdcs}
        resolveStudentCampusCode={(stu) => {
          const cObj = resolveCampusObjForStudent(stu);
          return cObj?.campusCode || "CS1";
        }}
        onOpenStudent={(stuId) => setReportStudentId(stuId)}
        onNotify={(msg, type) => notify(msg, type || "ok")}
        onGdcsSubmitted={(studentIds, sentAtIso) => {
          const idSet = new Set(studentIds);
          setReportStudents((prev: any[]) =>
            prev.map((st: any) =>
              idSet.has(String(st.id)) ? { ...st, gdcsEmailSentAt: sentAtIso } : st
            )
          );
        }}
      />

      {/* MODAL THIẾT LẬP CẤU HÌNH ĐỊNH TUYẾN EMAIL XÉT DUYỆT */}
      <EmailRoutingConfigModal
        isOpen={isEmailRoutingModalOpen}
        onClose={() => setIsEmailRoutingModalOpen(false)}
        config={emailRoutingConfig}
        onSaved={(newCfg) => {
          setEmailRoutingConfig(newCfg);
          setAutoSendApprovalEmail(newCfg.autoSendOnApprove);
          notify("Đã lưu cấu hình gửi email thông báo xét duyệt thành công!", "ok");
        }}
        campuses={campuses}
        teachers={teachers}
        gdcsUsers={gdcsUsers}
        giaoVuCSUsers={giaoVuCSUsers}
      />

      {/* MODAL XEM TRƯỚC & GỬI EMAIL KẾT QUẢ THEO ĐỢT KHẢO SÁT */}
      {isBatchResultPreviewOpen && (
        <div
          className="fixed inset-0 z-[190] flex items-center justify-center bg-slate-900/55 backdrop-blur-[2px] p-3 sm:p-5"
          onClick={() => !sendingBatchResultEmail && setIsBatchResultPreviewOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#003B3A] text-white px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-[#5EEAD4]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold leading-tight truncate">
                    {previewSingleStudent
                      ? `Xem trước Email Thông báo Kết quả — ${previewSingleStudent.fullName}`
                      : "Xem trước & Gửi Email Thông báo Kết quả theo Đợt"}
                  </h3>
                  <p className="text-[11px] text-teal-100/80 mt-0.5 truncate">
                    Kiểm tra giao diện Desktop/Mobile, người nhận (To/CC) và danh sách học sinh trước khi gửi chính thức
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="inline-flex items-center bg-white/10 border border-white/15 rounded-lg p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setEmailPreviewViewport("desktop")}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      emailPreviewViewport === "desktop"
                        ? "bg-white text-[#003B3A]"
                        : "text-teal-100 hover:text-white"
                    }`}
                    title="Xem giao diện máy tính (Desktop / Outlook)"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Desktop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailPreviewViewport("mobile")}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      emailPreviewViewport === "mobile"
                        ? "bg-white text-[#003B3A]"
                        : "text-teal-100 hover:text-white"
                    }`}
                    title="Xem giao diện điện thoại (Mobile responsive)"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Mobile</span>
                  </button>
                </div>
                <button
                  type="button"
                  disabled={sendingBatchResultEmail}
                  onClick={() => {
                    setIsBatchResultPreviewOpen(false);
                    setPreviewSingleStudent(null);
                  }}
                  className="p-1.5 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Đóng"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Batch Selector + Recipients Strip */}
            <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] space-y-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-2.5">
                {previewSingleStudent ? (
                  <>
                    <span className="font-bold text-[#003B3A] whitespace-nowrap">Phạm vi xem trước:</span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#F0FDFA] text-[#003B3A] border border-[#99F6E4] font-semibold">
                      1 học sinh: {previewSingleStudent.fullName} ({previewSingleStudent.studentCode || "—"})
                    </span>
                    {previewBatchId && (
                      <button
                        type="button"
                        onClick={() => loadBatchResultEmailPreview(previewBatchId, null)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#00736E] bg-white border border-[#99F6E4] hover:bg-[#F0FDFA] transition-colors cursor-pointer"
                      >
                        Chuyển sang xem cả đợt
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <label className="font-bold text-[#003B3A] whitespace-nowrap">Đợt khảo sát:</label>
                    <select
                      value={previewBatchId}
                      onChange={(e) => loadBatchResultEmailPreview(e.target.value, null)}
                      className="flex-1 min-w-[260px] px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-800 focus:border-[#008B85] focus:ring-2 focus:ring-[#00A19A]/20 outline-none cursor-pointer"
                    >
                      <option value="">— Chọn 1 Đợt khảo sát cụ thể —</option>
                      {reportBatches.map((b) => {
                        const cnt = (reportStudents || []).filter((s) => s.batchId === b.id).length;
                        const pend = (reportStudents || []).filter((s) => s.batchId === b.id && !s.admissionResult && !s.isAbsent).length;
                        if (cnt === 0) return null;
                        return (
                          <option key={b.id} value={b.id}>
                            {b.name} ({cnt} HS{pend > 0 ? ` · ${pend} chờ duyệt` : " · Đã duyệt đủ"})
                          </option>
                        );
                      })}
                    </select>
                  </>
                )}
                {batchResultPreviewData && (
                  <span className="px-2.5 py-1 rounded-lg bg-[#F0FDFA] text-[#00736E] border border-[#99F6E4] font-bold tabular-nums whitespace-nowrap">
                    {batchResultPreviewData.studentCount} học sinh
                  </span>
                )}
              </div>

              {batchResultPreviewData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1.5 border-t border-slate-200/70">
                  <div className="space-y-1">
                    <div className="text-[11px] text-slate-500">
                      <strong className="text-slate-700">Tiêu đề:</strong> {batchResultPreviewData.subject}
                    </div>
                    <div className="flex flex-wrap items-center gap-1 text-[11px]">
                      <strong className="text-slate-700 mr-1">Gửi đến (To):</strong>
                      {batchResultPreviewData.toRecipients.length > 0 ? (
                        batchResultPreviewData.toRecipients.map((em) => (
                          <span key={em} className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-medium">
                            {em}
                          </span>
                        ))
                      ) : (
                        <span className="text-rose-600 italic">Chưa có người nhận</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-start gap-1 text-[11px]">
                    <strong className="text-slate-700 mr-1">Đồng gửi (CC):</strong>
                    {batchResultPreviewData.ccRecipients.length > 0 ? (
                      batchResultPreviewData.ccRecipients.map((em) => (
                        <span key={em} className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                          {em}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">Không có CC</span>
                    )}
                  </div>
                </div>
              )}

              {batchResultPreviewData && batchResultPreviewData.pendingCount > 0 && (
                <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[#92400E] text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                  <span>
                    Lưu ý: Đợt này hiện còn <strong>{batchResultPreviewData.pendingCount}/{batchResultPreviewData.studentCount}</strong> học sinh chưa xét duyệt kết quả. Bạn vẫn có thể kiểm tra bản xem trước bên dưới và quyết định gửi hoặc chờ duyệt đủ.
                  </span>
                </div>
              )}
            </div>

            {/* Live Email Preview Iframe */}
            <div className="flex-1 bg-slate-100/80 p-3 sm:p-4 overflow-hidden flex flex-col min-h-[380px]">
              {batchResultPreviewLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-[#008B85]" />
                  <span>Đang dựng bản xem trước giao diện email thật...</span>
                </div>
              ) : batchResultPreviewData?.html ? (
                <div className="flex-1 flex justify-center overflow-auto">
                  <iframe
                    title="Xem trước email thông báo kết quả xét duyệt"
                    srcDoc={batchResultPreviewData.html}
                    sandbox="allow-same-origin"
                    className={`h-full min-h-[420px] bg-white rounded-xl border border-slate-200 shadow-xs transition-all duration-200 ${
                      emailPreviewViewport === "mobile" ? "w-[390px] max-w-full border-2 border-slate-300 shadow-md" : "w-full"
                    }`}
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                  <Mail className="w-8 h-8 text-slate-300" />
                  <span>Vui lòng chọn 1 Đợt khảo sát có học sinh ở phía trên để xem trước nội dung email.</span>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-5 py-3 bg-white border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">
                Giao diện xem trước khớp 100% với email gửi qua SMTP đến hộp thư người nhận.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={sendingBatchResultEmail}
                  onClick={() => setIsBatchResultPreviewOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={sendingBatchResultEmail || batchResultPreviewLoading || !batchResultPreviewData}
                  onClick={handleConfirmSendBatchResultEmail}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#003B3A] hover:bg-[#005854] transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {sendingBatchResultEmail ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-[#5EEAD4]" />
                  )}
                  <span>
                    {sendingBatchResultEmail
                      ? "Đang gửi email..."
                      : `Xác nhận & Gửi Email (${batchResultPreviewData?.studentCount || 0} HS)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM TRƯỚC & GỬI EMAIL NHẮC GĐCS XÉT DUYỆT HỒ SƠ */}
      {gdcsReminderPreviewOpen && (
        <div
          className="fixed inset-0 z-[195] flex items-center justify-center bg-slate-900/55 backdrop-blur-[2px] p-3 sm:p-5"
          onClick={() => !gdcsReminderSending && setGdcsReminderPreviewOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#003B3A] text-white px-5 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-[#5EEAD4]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold leading-tight truncate">
                    Xem trước Email nhắc GĐCS xét duyệt{gdcsReminderPreviewData?.studentName ? ` — ${gdcsReminderPreviewData.studentName}` : ""}
                  </h3>
                  <p className="text-[11px] text-teal-100/80 mt-0.5 truncate">
                    Kiểm tra nội dung bảng điểm, nút duyệt nhanh và người nhận trước khi gửi đến Giám đốc Cơ sở
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="inline-flex items-center bg-white/10 border border-white/15 rounded-lg p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setEmailPreviewViewport("desktop")}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      emailPreviewViewport === "desktop"
                        ? "bg-white text-[#003B3A]"
                        : "text-teal-100 hover:text-white"
                    }`}
                    title="Xem giao diện máy tính (Desktop)"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Desktop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailPreviewViewport("mobile")}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                      emailPreviewViewport === "mobile"
                        ? "bg-white text-[#003B3A]"
                        : "text-teal-100 hover:text-white"
                    }`}
                    title="Xem giao diện điện thoại (Mobile)"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Mobile</span>
                  </button>
                </div>
                <button
                  type="button"
                  disabled={gdcsReminderSending}
                  onClick={() => setGdcsReminderPreviewOpen(false)}
                  className="p-1.5 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Đóng"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Metadata Strip */}
            {gdcsReminderPreviewData && (
              <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] space-y-1.5 text-xs">
                <div className="text-[11px] text-slate-600">
                  <strong className="text-[#003B3A]">Tiêu đề:</strong> {gdcsReminderPreviewData.subject}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <strong className="text-slate-700">Gửi đến GĐCS (To):</strong>
                    <span className="px-2 py-0.5 rounded bg-[#F0FDFA] border border-[#99F6E4] text-[#00736E] font-semibold">
                      {gdcsReminderPreviewData.to}
                    </span>
                  </div>
                  {gdcsReminderPreviewData.cc.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <strong className="text-slate-700">Đồng gửi (CC):</strong>
                      {gdcsReminderPreviewData.cc.map((em) => (
                        <span key={em} className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                          {em}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Live Email Preview Iframe */}
            <div className="flex-1 bg-slate-100/80 p-3 sm:p-4 overflow-hidden flex flex-col min-h-[420px]">
              {gdcsReminderPreviewLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-[#008B85]" />
                  <span>Đang dựng bản xem trước email nhắc GĐCS...</span>
                </div>
              ) : gdcsReminderPreviewData?.html ? (
                <div className="flex-1 flex justify-center overflow-auto">
                  <iframe
                    title="Xem trước email nhắc GĐCS xét duyệt"
                    srcDoc={gdcsReminderPreviewData.html}
                    sandbox="allow-same-origin"
                    className={`h-full min-h-[420px] bg-white rounded-xl border border-slate-200 shadow-xs transition-all duration-200 ${
                      emailPreviewViewport === "mobile" ? "w-[390px] max-w-full border-2 border-slate-300 shadow-md" : "w-full"
                    }`}
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                  <Mail className="w-8 h-8 text-slate-300" />
                  <span>Không có dữ liệu xem trước email.</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-white border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">
                Email gửi đi sẽ có đầy đủ nút duyệt trực tiếp 1 chạm (Đạt chuẩn / Đạt cam kết chọn môn / Không đạt) cho GĐCS.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={gdcsReminderSending}
                  onClick={() => setGdcsReminderPreviewOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={gdcsReminderSending || gdcsReminderPreviewLoading || !gdcsReminderPreviewData}
                  onClick={handleConfirmSendGdcsReminderEmail}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#003B3A] hover:bg-[#005854] transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {gdcsReminderSending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-[#5EEAD4]" />
                  )}
                  <span>{gdcsReminderSending ? "Đang gửi..." : "Xác nhận & Gửi Email cho GĐCS"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
  </div>
  )
}