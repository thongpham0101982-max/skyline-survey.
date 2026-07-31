"use client"
import { getDefaultAcademicYearClient } from "@/lib/academicYear"
const DEFAULT_WATERMARK_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%23007A87'><path d='M10,80 Q50,40 90,20 Q60,50 10,80 Z'/><path d='M30,80 Q60,55 90,35 Q65,60 30,80 Z'/></svg>";

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  Plus, Search, Edit2, Trash2, Users, Settings, Clock, BarChart3,
  Upload, Download, Layers, Database, UserCheck, Calendar, X, Check, AlertCircle,
  ChevronDown, ChevronUp, Loader2, BookOpen, GraduationCap, RefreshCw,
  Tag, FolderOpen, Hash, MoreVertical, PenLine, CheckCircle2,
  Filter, ClipboardCheck, ArrowRight, UserPlus, Info,
  FileSpreadsheet, Pencil, Mail, FileText,
  Phone, Printer, Lock
, RefreshCcw } from "lucide-react"
import * as XLSX from "xlsx"
import { MoveToBatchModal } from "@/app/admin/student-info/MoveToBatchModal";


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
  registeredCampus?: string;
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
  currentUser?: { id: string; role: string; campusIds: string[]; fullName?: string } | null;
  rolePermissions?: { module: string, canRead: boolean, canCreate: boolean, canUpdate: boolean, canDelete: boolean }[];
  mode?: "config" | "input";
  forcedTab?: string;
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
  ACTIVE:   { label:"Đang mở",   cls:"bg-emerald-50 text-emerald-700 rounded-full" },
  LOCKED:   { label:"Đã khóa",   cls:"bg-slate-100 text-slate-700 rounded-full" },
  DRAFT:    { label:"Bản nháp",  cls:"bg-amber-50 text-amber-700 rounded-full" },
  CLOSED:   { label:"Kết thúc", cls:"bg-red-50 text-red-750 rounded-full" },
  INACTIVE: { label:"Tắt",      cls:"bg-slate-100 text-slate-500 rounded-full" },
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
const inp = "h-11 w-full pl-3.5 pr-3.5 bg-slate-50/50 border border-slate-200 text-[#1E293B] placeholder-[#94A3B8] text-sm font-semibold rounded-xl outline-none transition-all focus:ring-4 focus:ring-[#00A99D]/10 focus:border-[#00A99D] focus:bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed shadow-xs"

function Modal({ open, onClose, title, size="md", children, footer }: {
  open:boolean; onClose:()=>void; title:string; size?:"sm"|"md"|"lg";
  children:React.ReactNode; footer:React.ReactNode
}) {
  if (!open) return null
  const w = size==="lg" ? "max-w-3xl" : size==="sm" ? "max-w-sm" : "max-w-lg"
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"/>
      <div className={`relative bg-white w-full ${w} rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-[#D9E2EC]` } onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#D9E2EC] bg-white">
          <h3 className="text-lg font-bold text-[#004C97] flex items-center gap-2"><span className="w-1.5 h-5 bg-[#00B5E2] inline-block rounded"></span>{title}</h3>
          <button onClick={onClose} className="p-2 text-[#64748B] hover:text-[#00B5E2] hover:bg-[#E6F8FD] transition-all rounded-xl cursor-pointer"><X className="w-5 h-5"/></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-6 bg-[#F8FAFC] custom-scrollbar">{children}</div>
        <div className="flex gap-3 flex-shrink-0 px-6 py-4 bg-white border-t border-[#D9E2EC]">{footer}</div>
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

function Spin() { return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-indigo-500 animate-spin opacity-50"/></div> }
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

const getStudentScoresForTemplate = (student) => {
  let mathVal = student?.mathScore;
  let literatureVal = student?.literatureScore;
  let writtenEnglishVal = student?.writtenEnglishScore;
  let oralEnglishVal = student?.oralEnglishScore;
  let psychologyVal = student?.psychologyScore;

  const studentScores = student?.scores || [];
  studentScores.forEach((sc) => {
    const subject = sc.subject || {};
    const sName = subject.name || "";
    const sCode = (subject.code || "").toLowerCase();
    const sNameLower = sName.toLowerCase().normalize("NFC");
    
    let scoreVal = null;
    try {
      if (sc.scores) {
        const parsed = JSON.parse(sc.scores);
        const vArr = Array.isArray(parsed) ? parsed : [parsed];
        scoreVal = vArr.find((x) => x !== undefined && x !== "" && x !== null);
      }
    } catch (e) {
      scoreVal = sc.scores;
    }

    if (scoreVal !== null && scoreVal !== undefined && scoreVal !== "") {
      if (sNameLower.includes("toán") || sCode.includes("math") || sCode.includes("mth")) {
        mathVal = scoreVal;
      } else if (sNameLower.includes("tiếng việt") || sNameLower.includes("ngữ văn") || sCode.includes("lit") || sCode.includes("vie") || sCode.includes("van")) {
        literatureVal = scoreVal;
      } else if (sNameLower.includes("tiếng anh") || sCode.includes("eng") || sCode.includes("esl")) {
        if (sNameLower.includes("viết") || sCode.includes("writing") || sCode.includes("written") || sCode.includes("vt")) {
          writtenEnglishVal = scoreVal;
        } else if (sNameLower.includes("vấn đáp") || sNameLower.includes("nói") || sCode.includes("speaking") || sCode.includes("oral") || sCode.includes("vd")) {
          oralEnglishVal = scoreVal;
        }
      } else if (sCode.includes("tly")) {
        try {
          if (sc.scores) {
            const parsed = JSON.parse(sc.scores);
            const vArr = Array.isArray(parsed) ? parsed : [parsed];
            psychologyVal = parseFloat(vArr[6] || vArr[20] || "0");
          }
        } catch (e) {
          psychologyVal = parseFloat(sc.scores || "0");
        }
      }
    }
  });

  return {
    mathScore: mathVal !== null && mathVal !== undefined ? mathVal : "-",
    literatureScore: literatureVal !== null && literatureVal !== undefined ? literatureVal : "-",
    writtenEnglishScore: writtenEnglishVal !== null && writtenEnglishVal !== undefined ? writtenEnglishVal : "-",
    oralEnglishScore: oralEnglishVal !== null && oralEnglishVal !== undefined ? oralEnglishVal : "-",
    psychologyScore: psychologyVal !== null && psychologyVal !== undefined ? psychologyVal : "-"
  };
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
  const scoresObj = getStudentScoresForTemplate(student);
  
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
    .replace(/\{\{signatureName\}\}/g, student?.signatureName || "")
    .replace(/\{\{mathScore\}\}/g, scoresObj.mathScore)
    .replace(/\{\{literatureScore\}\}/g, scoresObj.literatureScore)
    .replace(/\{\{writtenEnglishScore\}\}/g, scoresObj.writtenEnglishScore)
    .replace(/\{\{oralEnglishScore\}\}/g, scoresObj.oralEnglishScore)
    .replace(/\{\{psychologyScore\}\}/g, scoresObj.psychologyScore);
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
  "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh", "Bến Tre", "Bình Định", 
  "Bình Dương", "Bình Phước", "Bình Thuận", "Cà Mau", "Cần Thơ", "Cao Bằng", "Đà Nẵng", "Đắk Lắk", 
  "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", 
  "Hà Tĩnh", "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên", "Khánh Hòa", "Kiên Giang", 
  "Kon Tum", "Lai Châu", "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định", "Nghệ An", 
  "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", 
  "Quảng Trị", "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa", "Thừa Thiên Huế", 
  "Tiền Giang", "TP Hồ Chí Minh", "Trà Vinh", "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"
].sort();

const worldCountries = [
  "Afghanistan", "Ai Cập", "Albania", "Algeria", "Andorra", "Angola", "Anh", "Antigua và Barbuda", "Áo", 
  "Argentina", "Armenia", "Azerbaijan", "Ấn Độ", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Bắc Macedonia", 
  "Bạch Nga (Belarus)", "Bỉ", "Belize", "Benin", "Bhutan", "Bồ Đào Nha", "Bolivia", "Bosnia và Herzegovina", 
  "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Các Tiểu vương quốc Ả Rập Thống nhất (UAE)", 
  "Cameroon", "Campuchia", "Canada", "Chile", "Colombia", "Comoros", "Cộng hòa Congo", "Cộng hòa Dân chủ Congo", 
  "Cộng hòa Dominica", "Cộng hòa Séc", "Cộng hòa Trung Phi", "Costa Rica", "Croatia", "Cuba", "Djibouti", 
  "Dominica", "Đan Mạch", "Đông Timor", "Đức", "Ecuador", "El Salvador", "Eritrea", "Estonia", "Eswatini", 
  "Ethiopia", "Fiji", "Gabon", "Gambia", "Georgia", "Ghana", "Grenada", "Guatemala", "Guinea", 
  "Guinea-Bissau", "Equatorial Guinea", "Guyana", "Hà Lan", "Haiti", "Hàn Quốc", "Hoa Kỳ (Mỹ)", "Honduras", 
  "Hungary", "Hy Lạp", "Iceland", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Jamaica", 
  "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Lào", "Latvia", "Lebanon", 
  "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", 
  "Maldives", "Mali", "Malta", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", 
  "Mông Cổ", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nam Phi", "Nam Sudan", 
  "Nepal", "New Zealand", "Nga", "Nhật Bản", "Nicaragua", "Niger", "Nigeria", "Na Uy", "Oman", 
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Pháp", "Phần Lan", 
  "Philippines", "Poland (Ba Lan)", "Qatar", "Romania", "Rwanda", "Saint Kitts và Nevis", "Saint Lucia", 
  "Saint Vincent và Grenadines", "Samoa", "San Marino", "Sao Tome và Principe", "Saudi Arabia (Ả Rập Xê Út)", 
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", 
  "Somalia", "Sri Lanka", "Sudan", "Suriname", "Thụy Điển", "Thụy Sĩ", "Syria", "Tajikistan", 
  "Tanzania", "Tây Ban Nha", "Chad", "Thái Lan", "Togo", "Tonga", "Trinidad và Tobago", "Tunisia", 
  "Thổ Nhĩ Kỳ", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "Uruguay", "Uzbekistan", "Vanuatu", 
  "Vatican", "Venezuela", "Việt Nam", "Ý (Italy)", "Yemen", "Zambia", "Zimbabwe", "Đài Loan", "Hồng Kông"
].sort();

// ========= MAIN =========
export function InputAssessmentsClient({
 academicYears = [], campuses = [], examBoardUsers = [], subjects: initialSubjects = [], eduSystems = [], configs: initialConfigs = [], grades = [], teachers = [], departments = [], giaoVuCSUsers = [], gdcsUsers = [], currentUser = null, rolePermissions = [], mode = "config", forcedTab }: Props) {
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
    const userRole = (currentUser?.role || "").toUpperCase();
    if (userRole === "ADMIN" || userRole === "KT_DBCL" || tabId === "categories") {
      return { canRead: true, canCreate: true, canUpdate: true, canDelete: true };
    }
    
    let requiredModule = TAB_PERMISSION_MAP[tabId];
    if (mode === "input" && (tabId === "periods" || tabId === "students")) {
      requiredModule = "STUDENT_INFO_K12";
    }
    let perm = rolePermissions?.find(p => p.module === requiredModule);
    if ((!perm || !perm.canRead) && mode === "input") {
      const fallback = rolePermissions?.find(p => p.module === "STUDENT_INFO");
      if (fallback && fallback.canRead) {
        perm = fallback;
      }
    }

    const isTVTS = userRole === "TVAN" || userRole === "TVTS";
    if (isTVTS && mode === "input" && (tabId === "periods" || tabId === "students")) {
      return { canRead: true, canCreate: true, canUpdate: true, canDelete: false };
    }

    if (perm) {
      return {
        canRead: !!perm.canRead,
        canCreate: !!perm.canCreate,
        canUpdate: !!perm.canUpdate,
        canDelete: !!perm.canDelete,
      };
    }
    
    // Fallback: Default role rules if no explicit permissions found in the DB
    const isGDCS = ["GDCS", "GĐ_CS", "GIAO_VU_CS", "GĐCS"].includes(userRole);
    if (isGDCS) {
      const allowed = ["students", "reports"].includes(tabId);
      return {
        canRead: allowed,
        canCreate: allowed,
        canUpdate: allowed,
        canDelete: allowed,
      };
    }
    
    return { canRead: true, canCreate: true, canUpdate: true, canDelete: true };
  };

  useEffect(() => {
    if (forcedTab) {
      setTab(forcedTab);
    }
  }, [forcedTab]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMoveBatchModalOpen, setIsMoveBatchModalOpen] = useState(false);
  const [tab, setTab] = useState(() => {
    const userRole = (currentUser?.role || "").toUpperCase();
    const isGDCS = ["GDCS", "GĐ_CS", "GIAO_VU_CS", "GĐCS"].includes(userRole);
    
    const hasPeriods = userRole === "ADMIN" || userRole === "KT_DBCL" || (rolePermissions && rolePermissions.some(p => p.module === "INPUT_ASSESSMENTS_PERIODS" && p.canRead));
    if (hasPeriods) return "periods";
    
    const hasStudents = userRole === "ADMIN" || userRole === "KT_DBCL" || (rolePermissions && rolePermissions.some(p => p.module === "INPUT_ASSESSMENTS_STUDENTS" && p.canRead)) || isGDCS;
    if (hasStudents) return "students";
    
    const allTabs = ["periods", "categories", "subjects", "mapping", "students", "assignments", "reports"].filter(
      t => !(mode === "input" && ["categories", "subjects", "mapping"].includes(t))
    );
    for (const t of allTabs) {
      const p = getTabPermissions(t);
      if (p.canRead) return t;
    }
    return "students";
  });

  const tabPerms = getTabPermissions(tab);
  const cannotCreate = !tabPerms.canCreate;
  const cannotUpdate = !tabPerms.canUpdate;
  const cannotDelete = !tabPerms.canDelete;
  const isReadOnly = tabPerms.canRead && !tabPerms.canCreate && !tabPerms.canUpdate && !tabPerms.canDelete;

  const EMAIL_MAP = useMemo(() => {
    const map = {
      tuvan: {
        CS1: "tuyensinh.cs1@skylineschool.edu.vn",
        CS2: "tuyensinh.cs2@skylineschool.edu.vn",
        CS3: "tuyensinh.cs3@skylineschool.edu.vn",
        CS4: "tuyensinh.cs4@skylineschool.edu.vn",
        CS5: "tuyensinh.cs5@skylineschool.edu.vn",
      },
      giaovu: {
        CS1: "giaovu.cs1@skylineschool.edu.vn",
        CS2: "giaovu.cs2@skylineschool.edu.vn",
        CS3: "giaovu.cs3@skylineschool.edu.vn",
        CS4: "giaovu.cs4@skylineschool.edu.vn",
        CS5: "giaovu.cs5@skylineschool.edu.vn",
      },
      gdcs: {
        CS1: "gdcs.cs1@skylineschool.edu.vn",
        CS2: "gdcs.cs2@skylineschool.edu.vn",
        CS3: "gdcs.cs3@skylineschool.edu.vn",
        CS4: "gdcs.cs4@skylineschool.edu.vn",
        CS5: "gdcs.cs5@skylineschool.edu.vn",
      },
      cc: "cc@skylineschool.edu.vn"
    };

    // 1. Dynamic GĐCS Lookup from campuses
    (campuses || []).forEach((c) => {
      const csCode = c.campusCode;
      if (csCode && csCode in map.gdcs) {
        const managerEmail = c.manager?.teacher?.email;
        if (managerEmail && managerEmail.includes('@')) {
          map.gdcs[csCode] = managerEmail;
        } else {
          const matchedTeacher = (teachers || []).find((t) => t.teacherCode === c.manager?.email);
          if (matchedTeacher?.email && matchedTeacher.email.includes('@')) {
            map.gdcs[csCode] = matchedTeacher.email;
          }
        }
      }
    });

    // 2. Dynamic Giáo vụ and Tư vấn Lookup from teachers
    (teachers || []).forEach((t) => {
      const csCode = t.campus?.campusCode;
      if (csCode && csCode in map.giaovu) {
        const deptName = t.departmentRel?.name?.toLowerCase() || '';
        const deptCode = t.departmentRel?.code?.toLowerCase() || '';
        const hasEmail = t.email && t.email.includes('@');
        
        if (hasEmail) {
          if (deptName.includes('giáo vụ') || deptCode.includes('gvu') || deptCode.includes('giaovu')) {
            map.giaovu[csCode] = t.email;
          }
          if (deptName.includes('tư vấn') || deptName.includes('tuyển sinh') || deptCode.includes('tuvan') || deptCode.includes('tuyensinh')) {
            map.tuvan[csCode] = t.email;
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

  const [yearId, setYearId] = useState(() => getDefaultAcademicYearClient(academicYears)?.id || "")
  
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
    const isOpenDay = selPeriod?.name?.toLowerCase().includes("open day");
    const rowObj: any = { 
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
    };
    if (isOpenDay) {
      rowObj["Đăng ký CS"] = "";
    }
    const ws = XLSX.utils.json_to_sheet([rowObj])
    const cols = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
    if (isOpenDay) {
      cols.push({ wch: 15 });
    }
    ws["!cols"] = cols;
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
  const [latestBatchInfo, setLatestBatchInfo] = useState(null);
  const [sSearch, setSSearch] = useState("")
  const [studentsCurrentPage, setStudentsCurrentPage] = useState(1);
  const studentsPageSize = 10;

  useEffect(() => {
    setStudentsCurrentPage(1);
  }, [sPeriodId, sBatchId, sSearch]);
  const [importing, setImporting] = useState(false)
  const [sModal, setSModal] = useState(false)
  const [editS, setEditS] = useState<Student|null>(null)


  const [sSelected, setSSelected] = useState<string[]>([])

  // ───────── REPORTS STATE ─────────
  const [reportPeriodId, setReportPeriodId] = useState("");
  const [reportBatchId, setReportBatchId] = useState("all");
  const [reportStudentId, setReportStudentId] = useState("");
  const [reportsSubTab, setReportsSubTab] = useState("stats"); // stats or results
  const [reportStudents, setReportStudents] = useState<any[]>([]);
  const [retestHistory, setRetestHistory] = useState<any[]>([]);
  const [retestHistoryLoading, setRetestHistoryLoading] = useState(false);

  const [retestPeriodId, setRetestPeriodId] = useState("");
  const [retestBatchId, setRetestBatchId] = useState("");
  const [retestRegisterLoading, setRetestRegisterLoading] = useState(false);

  const [mockPreviewStudent, setMockPreviewStudent] = useState<any>(null);
  const [reportForm, setReportForm] = useState({
    admissionResult: "",
    admissionCampus: "",
    signatureName: "",
    directorNote: "",
    committedSubjects: [] as string[]
  });

  const reportSelPeriod = useMemo(() => visiblePeriods.find(p => p.id === reportPeriodId), [periods, reportPeriodId]);
  const reportBatches = useMemo(() => reportSelPeriod?.batches || [], [reportSelPeriod]);

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

  // Email States
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailStudents, setEmailStudents] = useState<any[]>([]);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSendingStatus, setEmailSendingStatus] = useState("");
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

      const mergedLogo = mLogo ? mLogo : (globalData.logo || campusData.logo || "");
      const mergedBackground = mBg ? mBg : (globalData.background || campusData.background || "");
      const mergedContent = globalData.content || campusData.content || "";
      const mergedFooter = mFooter ? mFooter : (globalData.footer || campusData.footer || "");
      
      const campusSig = localStorage.getItem('report_config_signature_' + targetCampus.id) || campusData.signature || "";
      const campusDir = localStorage.getItem('report_config_director_' + targetCampus.id) || campusData.directorName || targetCampus.manager?.fullName || "";
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
          '<span style="font-weight: bold; color: #00A99D; white-space: nowrap; text-transform: uppercase; font-size: 11.5px; letter-spacing: 0.5px;">HỆ THỐNG GIÁO DỤC SKY-LINE</span>' +
          '<div style="flex-grow: 1; border-top: 1px solid rgba(0, 166, 169, 0.7); height: 0; margin-top: 2px;"></div>' +
          '<span style="font-weight: 600; color: #00A99D; white-space: nowrap; text-transform: lowercase; font-size: 11px;">www.skylineschool.edu.vn</span>' +
        '</div>' +
        '<div style="display: flex; justify-content: space-between; font-size: 9px; position: relative; width: 100%;">' +
          '<div style="width: 32%; display: flex; flex-direction: column; gap: 4px;">' +
            '<div>' +
              '<p style="font-weight: bold; color: #00A99D; margin: 0; font-size: 9.5px; line-height: 1.2;">SKY-LINE Riverside</p>' +
              '<p style="color: #555555; margin: 2px 0 0 0; font-size: 8px; line-height: 1.2;">Lô A2.4 Trần Đăng Ninh, P. Hòa Cường, TP. Đà Nẵng</p>' +
            '</div>' +
            '<div>' +
              '<p style="font-weight: bold; color: #00A99D; margin: 0; font-size: 9.5px; line-height: 1.2;">SKY-LINE Central</p>' +
              '<p style="color: #555555; margin: 2px 0 0 0; font-size: 8px; line-height: 1.2;">Số 48 Nguyễn Du, P. Hải Châu, TP. Đà Nẵng</p>' +
            '</div>' +
            '<div>' +
              '<p style="font-weight: bold; color: #00A99D; margin: 0; font-size: 9.5px; line-height: 1.2;">SKY-LINE Global</p>' +
              '<p style="color: #555555; margin: 2px 0 0 0; font-size: 8px; line-height: 1.2;">Lô A2 Trần Đăng Ninh, P. Hòa Cường, TP. Đà Nẵng</p>' +
            '</div>' +
          '</div>' +
          '<div style="width: 32%; display: flex; flex-direction: column; gap: 4px;">' +
            '<div>' +
              '<p style="font-weight: bold; color: #00A99D; margin: 0; font-size: 9.5px; line-height: 1.2;">SKY-LINE Beach</p>' +
              '<p style="color: #555555; margin: 2px 0 0 0; font-size: 8px; line-height: 1.2;">Số 199 Trần Anh Tông, P. Thanh Khê, TP. Đà Nẵng</p>' +
            '</div>' +
            '<div>' +
              '<p style="font-weight: bold; color: #00A99D; margin: 0; font-size: 9.5px; line-height: 1.2;">SKY-LINE Hill</p>' +
              '<p style="color: #555555; margin: 2px 0 0 0; font-size: 8px; line-height: 1.2;">Khối Hà My Đông A, P. Điện Bàn Đông, TP. Đà Nẵng</p>' +
            '</div>' +
            '<div>' +
              '<p style="font-weight: bold; color: #00A99D; margin: 0; font-size: 9.5px; line-height: 1.2;">Trung tâm sống thành công - SLS</p>' +
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
          '<div style="position: absolute; right: -5px; top: 2px; width: 64px; height: 48px; pointer-events: none; display: flex; align-items: center; justify-content: center; color: #00A99D;">' +
            '<svg viewBox="0 0 120 60" style="width: 100%; height: 100%; fill: currentColor;">' +
              '<path d="M 8 26 C 24 32, 50 52, 62 60 C 78 36, 102 16, 118 3 C 95 16, 76 44, 62 62 C 48 46, 25 32, 8 26 Z" />' +
            '</svg>' +
          '</div>' +
        '</div>' +
      '</div>';

    // Page 2: Admission Documents Checklist (Danh mục Hồ sơ nhập học) - Active for congratulations, invitations and commitments!
    let page2Html = "";
    if (student.admissionResult === "Đạt" || student.admissionResult === "Đạt cam kết" || isCommitmentFlag || isInvitationFlag) {
      const docList = getStudentDocList(student);
      if (docList && docList.length > 0) {
        const rowsHtml = docList.map((item: any, idx: number) => {
          return '<tr style="border-bottom: 1px solid #000000;">' +
            '<td style="padding: 10px; border-right: 1px solid #000000; text-align: center; color: #000000;">' + (idx + 1) + '</td>' +
            '<td style="padding: 10px 15px; border-right: 1px solid #000000; font-weight: bold; color: #000000;">' + item.name + '</td>' +
            '<td style="padding: 10px; text-align: center; font-weight: bold; color: #000000;" className="px-4 py-3 border-b border-slate-100">' + item.qty + '</td>' +
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
                '<thead>' +
                  '<tr style="background-color: #ffffff; border-bottom: 1px solid #000000;">' +
                    '<th style="padding: 10px; border-right: 1px solid #000000; text-align: center; font-weight: bold; width: 60px; text-transform: uppercase; color: #000000;">STT</th>' +
                    '<th style="padding: 10px 15px; border-right: 1px solid #000000; text-align: center; font-weight: bold; text-transform: uppercase; color: #000000;">Tên hồ sơ</th>' +
                    '<th style="padding: 10px; text-align: center; font-weight: bold; width: 120px; text-transform: uppercase; color: #000000;" className="px-4 py-3 border-b border-slate-100">Số lượng</th>' +
                  '</tr>' +
                '</thead>' +
                '<tbody>' +
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
    const activeBatchName = reportBatchId === "all" ? "Tất cả các đợt" : reportBatches.find(b => b.id === reportBatchId)?.name || "Đợt khảo sát";
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
    const userEmail = currentUser?.email || "bankhaothi@skylineschool.edu.vn";
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

  const handleSendQuickEmailSubmit = async () => {
    if (!recipientEmail.trim()) {
      alert("Vui lòng nhập email người nhận!");
      return;
    }
    setEmailSending(true);
    setEmailSendingStatus("Đang khởi tạo...");
    setEmailResult(null);
    try {
      const activeBatchName = reportBatchId === "all" ? "Tất cả các đợt" : reportBatches.find(b => b.id === reportBatchId)?.name || "Đợt khảo sát";
      const activePeriodName = reportSelPeriod?.name || "Kỳ khảo sát";

      const pdfAttachmentsList: any[] = [];
      if (attachLetters) {
        const html2pdf = await getHtml2Pdf();
        
        const eligibleStudents = emailStudents.filter(s => s.admissionResult === "Đạt" || s.admissionResult === "Đạt cam kết");
        let currentPdfCount = 0;
        const totalPdfs = eligibleStudents.length;

        for (const s of emailStudents) {
          if (s.admissionResult === "Đạt" || s.admissionResult === "Đạt cam kết") {
            const config = getStudentCampusConfig(s, false, false);
            if (config) {
              currentPdfCount++;
              setEmailSendingStatus(`Đang tạo PDF (${currentPdfCount}/${totalPdfs}): Thư chúc mừng - ${s.fullName}`);
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

              try {
                const pdfBase64 = await generatePdfBase64(html2pdf, docHtml, opt);
                const base64Data = pdfBase64.split(',')[1];
                
                pdfAttachmentsList.push({
                  filename: filename,
                  base64: base64Data
                });
              } catch (pdfErr) {
                console.error("Client PDF generation failed, falling back to server:", pdfErr);
                pdfAttachmentsList.push({
                  filename: filename,
                  html: docHtml
                });
              }
            }
          }
        }
      }

      setEmailSendingStatus("Đang truyền tải & gửi Email...");

      const res = await fetch("/api/admin/send-quick-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipientEmail,
          subject: emailSubject,
          periodName: activePeriodName,
          batchName: activeBatchName,
          students: emailStudents,
          attachLetters: attachLetters,
          pdfAttachments: pdfAttachmentsList
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
      } else if (reportForm.admissionResult === "Không đạt - Kiểm tra lại" && reportForm.committedSubjects.length > 0) {
        finalNote = `Môn kiểm tra lại: [${reportForm.committedSubjects.join(", ")}]

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

  const handleSendGdcsApprovalRequest = async () => {
    if (!selectedReportStudent) return;
    setSendingApproval(true);
    try {
      // Resolve GDCS email
      let csCode = resolvedStudentCampusObj?.campusCode;
      
      // If we don't have campusCode, try to match from campusName or admissionCampus
      if (!csCode) {
        const campusName = selectedReportStudent.admissionCampus || reportForm.admissionCampus || "";
        if (campusName.includes("CS1") || campusName.includes("Cơ sở 1")) csCode = "CS1";
        else if (campusName.includes("CS2") || campusName.includes("Cơ sở 2")) csCode = "CS2";
        else if (campusName.includes("CS3") || campusName.includes("Cơ sở 3")) csCode = "CS3";
        else if (campusName.includes("CS4") || campusName.includes("Cơ sở 4")) csCode = "CS4";
        else if (campusName.includes("CS5") || campusName.includes("Cơ sở 5")) csCode = "CS5";
      }

      // Default to CS1 if not resolved, or look up in EMAIL_MAP.gdcs
      const gdcsEmail = (csCode && EMAIL_MAP.gdcs[csCode as keyof typeof EMAIL_MAP.gdcs]) 
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

  // handleRegisterRetest removed

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

  // Set default reportPeriodId when periods are loaded
  useEffect(() => {
    if (visiblePeriods.length > 0 && !reportPeriodId) {
      setReportPeriodId(visiblePeriods[0].id);
    }
  }, [visiblePeriods, reportPeriodId]);

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

  const filteredReportStudents = useMemo(() => {
    if (!Array.isArray(reportStudents)) return [];
    return reportStudents.filter(s => reportBatchId === "all" || s.batchId === reportBatchId || s.batchId === null || s.batchId === "");
  }, [reportStudents, reportBatchId]);

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

      const mergedLogo = mLogo ? mLogo : (globalData.logo || campusData.logo || "");
      const mergedBackground = mBg ? mBg : (globalData.background || campusData.background || "");
      const mergedContent = globalData.content || campusData.content || "";
      const mergedFooter = mFooter ? mFooter : (globalData.footer || campusData.footer || "");
      
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
  }, [selectedReportStudent, campuses, reportBatches, isCommitment, isInvitation, reportForm.admissionCampus, rcTitle, rcLogo, rcBackground, rcContent, rcFooter, rcSignature, rcDirectorName, rcReportType, rcCampusId, docGroups, docGroupGrades, docGroupTargets]);

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
  }, [filteredReportStudents, reportBatches, campuses]);

  const overallKPIs = useMemo(() => {
    const total = filteredReportStudents.length;
    let passed = 0;
    let failed = 0;
    let committed = 0;
    let pending = 0;
    
    filteredReportStudents.forEach(s => {
      if (s.admissionResult === "Đạt" || s.admissionResult === "Học thử") passed++;
      else if (s.admissionResult === "Không đạt" || s.admissionResult === "Không đạt - Kiểm tra lại" || s.admissionResult === "Không đạt - Không kiểm tra lại") failed++;
      else if (s.admissionResult === "Đạt cam kết") committed++;
      else pending++;
    });
    
    const approvedRate = total > 0 ? Math.round(((total - pending) / total) * 100) : 0;
    
    return { total, passed, failed, committed, pending, approvedRate };
  }, [filteredReportStudents]);

  const canApprove = useMemo(() => {
    if (!currentUser) return false;
    const userRole = (currentUser.role || "").toUpperCase();
    
    // Lock check for GĐCS/GVBM
    const isStudentBatchLocked = selectedReportStudent?.batch?.status === "LOCKED" || selectedReportStudent?.batch?.status === "CLOSED";
    if (isStudentBatchLocked && ["GDCS", "GĐ_CS", "GIAO_VU_CS", "GĐCS"].includes(userRole)) {
      return false;
    }

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
      const matchRetest = cleanNote.match(/^Môn kiểm tra lại: \[(.*?)\](?:\r?\n\r?\n)?/);
      if (match) {
        commSubs = match[1] ? match[1].split(", ") : [];
        cleanNote = cleanNote.replace(/^Môn cam kết: \[(.*?)\](?:\r?\n\r?\n)?/, "");
      } else if (matchRetest) {
        commSubs = matchRetest[1] ? matchRetest[1].split(", ") : [];
        cleanNote = cleanNote.replace(/^Môn kiểm tra lại: \[(.*?)\](?:\r?\n\r?\n)?/, "");
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

// ───────── TRANSFER SYSTEM STATES ─────────
  const [transferCampusId, setTransferCampusId] = useState("");
  const [transferClassId, setTransferClassId] = useState("");
  const [transferStudents, setTransferStudents] = useState<any[]>([]);
  const [transferStudentsLoading, setTransferStudentsLoading] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [allClassesLoading, setAllClassesLoading] = useState(false);
  const [targetSystem, setTargetSystem] = useState("");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  const selectedFormPeriod = useMemo(() => {
    const pId = sForm.periodId || sPeriodId || "";
    return periods.find(p => p.id === pId);
  }, [sForm.periodId, sPeriodId, periods]);

  const isChuyenHe = useMemo(() => {
    if (!selectedFormPeriod) return false;
    const name = selectedFormPeriod.name?.toLowerCase() || "";
    return name.includes("chuyển hệ") || name.includes("chuyenhe") || name.includes("chuyen he");
  }, [selectedFormPeriod]);

  const activeFormBatches = useMemo(() => {
    return (selectedFormPeriod?.batches || []).filter((b: any) => b.status === "ACTIVE");
  }, [selectedFormPeriod]);


  const filteredClasses = useMemo(() => {
    if (!transferCampusId) return [];
    return allClasses.filter(c => c.campusId === transferCampusId);
  }, [allClasses, transferCampusId]);

  const selectedClassObj = useMemo(() => {
    return allClasses.find(c => c.id === transferClassId);
  }, [allClasses, transferClassId]);

  const filteredTransferStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return transferStudents;
    const q = studentSearchQuery.toLowerCase();
    return transferStudents.filter(s => 
      s.studentName?.toLowerCase().includes(q) || 
      s.studentCode?.toLowerCase().includes(q)
    );
  }, [transferStudents, studentSearchQuery]);

  // Sync modal states
  useEffect(() => {
    if (sModal) {
      if (!editS) {
        setTransferCampusId("");
        setTransferClassId("");
        setTransferStudents([]);
        setSelectedStudentIds([]);
        setTargetSystem("");
      } else {
        setTargetSystem(sForm.surveyFormType || "");
      }
    }
  }, [sModal, editS]);

  // Fetch classes for active academic year when modal is open and isChuyenHe is true
  useEffect(() => {
    if (sModal && isChuyenHe && allClasses.length === 0 && !allClassesLoading) {
      setAllClassesLoading(true);
      fetch("/api/classes")
        .then(res => res.json())
        .then(data => {
          setAllClasses(data || []);
          setAllClassesLoading(false);
        })
        .catch(err => {
          console.error("Lỗi fetch lớp:", err);
          setAllClassesLoading(false);
        });
    }
  }, [sModal, isChuyenHe, allClasses.length, allClassesLoading]);

  // Fetch students when transferClassId is selected
  useEffect(() => {
    if (transferClassId) {
      setTransferStudentsLoading(true);
      setTransferStudents([]);
      setSelectedStudentIds([]);
      fetch(`/api/student-transfers/assessment-students?classId=${transferClassId}`)
        .then(res => res.json())
        .then(data => {
          setTransferStudents(data.students || []);
          setTransferStudentsLoading(false);
        })
        .catch(err => {
          console.error("Lỗi fetch học sinh của lớp:", err);
          setTransferStudentsLoading(false);
        });
    } else {
      setTransferStudents([]);
      setSelectedStudentIds([]);
    }
  }, [transferClassId]);

  // Sync selectedLocationType when targetType changes
  useEffect(() => {
    if (!sModal) return;
    const selectedTargets = sForm.targetType ? sForm.targetType.split(",").map((t) => t.trim()).filter(Boolean) : [];
    if (selectedTargets.includes("Nội tỉnh")) {
      setSelectedLocationType("Nội tỉnh");
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

  // Auto-select latest batch when the selected period changes
  useEffect(() => {
    const selP = visiblePeriods.find(p => p.id === sPeriodId);
    if (!selP || !selP.batches || selP.batches.length === 0) return;
    const allBatches = (selP.batches || []).map(b => ({
      ...b,
      periodId: selP.id,
      periodName: selP.name,
      periodCode: selP.code
    }));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let activeBatch = allBatches.find(b => {
      if (!b.startDate || !b.endDate) return false;
      const start = new Date(b.startDate); start.setHours(0, 0, 0, 0);
      const end = new Date(b.endDate); end.setHours(23, 59, 59, 999);
      return today >= start && today <= end;
    });
    if (!activeBatch) {
      const todayTime = today.getTime();
      const sorted = [...allBatches].sort((a, b) => {
        const dA = new Date(a.endDate || a.startDate || 0).getTime();
        const dB = new Date(b.endDate || b.startDate || 0).getTime();
        return Math.abs(dA - todayTime) - Math.abs(dB - todayTime);
      });
      activeBatch = sorted[0];
    }
    if (activeBatch) {
      setSBatchId(activeBatch.id);
      setLatestBatchInfo(activeBatch);
    }
  }, [sPeriodId, visiblePeriods]);

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
          if (!sPeriodId) setSPeriodId(d[0].id)
          if (!asPeriodId) setAsPeriodId(d[0].id)
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

  const handleUpdateAbsent = async (student: any, isAbsent: boolean) => {
    try {
      const res = await fetch("/api/input-assessment-students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: student.id,
          data: {
            ...student,
            isAbsent
          }
        })
      });
      
      if (res.ok) {
        fetchStudents();
      } else {
        const err = await res.json();
        alert("Lỗi: " + (err.error || "Không thể cập nhật"));
      }
    } catch (e) {
      alert("Lỗi kết nối máy chủ");
    }
  };

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

    setSForm({ studentCode: genCode, fullName: "", dateOfBirth: "", grade: "", admissionCriteria: "", className: "", hocKy: "", kqgdTieuHoc: "", kqHocTap: "", kqRenLuyen: "", targetType: "", surveySystem: "", hoSoCtQuocTe: "", surveyFormType: "", gender: "", batchId: initialBatchId, registeredCampus: "", periodId: sPeriodId, cityName: "", districtName: "", wardName: "", countryName: "", oldSchoolName: "", oldSchoolType: "" });
    setSModal(true);
  }
  const openEditStudent = (s:Student) => { setEditS(s); setSForm({ studentCode:s.studentCode, fullName:s.fullName, dateOfBirth:s.dateOfBirth?.slice(0,10)||"", grade:s.grade||"", admissionCriteria:s.admissionCriteria||"", className:s.className||"", hocKy:s.hocKy||"", kqgdTieuHoc:s.kqgdTieuHoc||"", kqHocTap:s.kqHocTap||"", kqRenLuyen:s.kqRenLuyen||"", targetType:s.targetType||"", surveySystem:s.surveySystem||"", hoSoCtQuocTe:s.hoSoCtQuocTe||"", surveyFormType:s.surveyFormType||"" , gender:s.gender||"", batchId:s.batchId||"", registeredCampus:s.registeredCampus||"", periodId:s.periodId||"", cityName: s.cityName || "", districtName: s.districtName || "", wardName: s.wardName || "", countryName: s.countryName || "", oldSchoolName: s.oldSchoolName || "", oldSchoolType: s.oldSchoolType || "" }); setSModal(true) }
  const saveStudent = async () => {
    if (editS ? cannotUpdate : cannotCreate) return;
    
    if (isChuyenHe && !editS) {
      if (selectedStudentIds.length === 0) {
        return notify("Vui lòng chọn ít nhất một học sinh để chuyển hệ", "err");
      }
      if (!targetSystem) {
        return notify("Vui lòng chọn hệ chuyển", "err");
      }
      
      const currentClass = allClasses.find(c => c.id === transferClassId);
      const selectedStudentsData = transferStudents.filter(s => selectedStudentIds.includes(s.id));
      
      const endpoint = "/api/input-assessment-students";
      const bodyData = {
        action: "BULK_CREATE",
        data: selectedStudentsData.map(s => ({
          studentCode: s.studentCode,
          fullName: s.studentName,
          dateOfBirth: s.dateOfBirth,
          gender: s.gender || "Nam",
          className: currentClass?.className || "",
          grade: currentClass?.grade || "",
          registeredCampus: campuses.find(c => c.id === transferCampusId)?.campusName || "",
          periodId: sForm.periodId || sPeriodId,
          batchId: sForm.batchId || sBatchId || null,
          surveySystem: currentClass?.educationSystem || "", // Hệ đang học
          surveyFormType: targetSystem, // Hệ chuyển
        }))
      };
      
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyData)
        });
        if (res.ok) {
          notify("Đã ghi nhận thông tin chuyển hệ cho " + selectedStudentIds.length + " học sinh!");
          setSModal(false);
          fetchStudents();
        } else {
          const err = await res.json();
          notify("Lỗi: " + (err.error || "Gửi yêu cầu thất bại"), "err");
        }
      } catch (e) {
        notify("Lỗi kết nối máy chủ", "err");
      }
      return;
    }

    if (!sForm.studentCode.trim()||!sForm.fullName.trim()) return notify("Cần nhập Mã HS và Họ tên","err")
    const r = editS
      ? await fetch("/api/input-assessment-students", { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id:editS.id, data:{ ...sForm, surveyFormType: isChuyenHe ? targetSystem : sForm.surveyFormType } }) })
      : await fetch("/api/input-assessment-students", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"CREATE", data:{...sForm, periodId:sPeriodId, batchId:sForm.batchId || sBatchId || null, registeredCampus:sForm.registeredCampus || null} }) })
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
          const registeredCampusRaw = String(row["Đăng ký CS"] || row["Cơ sở đăng ký"] || findVal(row, ["đăng ký cs", "co so dang ky", "cs dang ky"]) || "").trim();
          let registeredCampus = null;
          if (registeredCampusRaw) {
            const matchedCampus = campuses.find(c => 
              c.campusCode?.toUpperCase() === registeredCampusRaw.toUpperCase() || 
              c.campusName?.toUpperCase() === registeredCampusRaw.toUpperCase() || 
              registeredCampusRaw.toUpperCase().includes(c.campusCode?.toUpperCase()) || 
              registeredCampusRaw.toUpperCase().includes(c.campusName?.toUpperCase())
            );
            if (matchedCampus) {
              registeredCampus = matchedCampus.id;
            }
          }
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
          batchId: sBatchId || null,
          registeredCampus: registeredCampus || null
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

  const paginatedFiltStu = useMemo(() => {
    const startIndex = (studentsCurrentPage - 1) * studentsPageSize;
    return filtStu.slice(startIndex, startIndex + studentsPageSize);
  }, [filtStu, studentsCurrentPage, studentsPageSize]);

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
    <div className="space-y-3 font-sans max-w-[1440px] mx-auto pb-16">
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      {confirm && <ConfirmDialog open={true} onClose={()=>setConfirm(null)} onConfirm={confirm.fn} message={confirm.msg}/>}

      <div className="no-print flex flex-col gap-3 w-full">
      {/* HEADER BAR */}
      {mode !== "input" && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 flex items-center justify-between gap-3 min-h-[56px]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 text-xs font-semibold">
              <ClipboardCheck className="w-4 h-4 text-white"/>
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-black text-slate-800 tracking-tight leading-tight truncate">Phổ thông K-12</h1>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest hidden sm:block">Hệ thống khảo sát & phân công giáo viên</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5 text-slate-400"/>
            <select value={yearId} onChange={e=>{setYearId(e.target.value); setSPeriodId(""); setAsPeriodId(""); setStudents([]); setAssignments([])}} className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer max-w-[140px] sm:max-w-none">
              {academicYears.filter(ay=>!ay.isOff).map(ay=><option key={ay.id} value={ay.id}>Năm học {ay.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* TAB NAV - icon + label, wraps to fit, no overflow */}
      {mode !== "input" && (
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-1 py-1">
        <div className="flex flex-wrap gap-0.5">
          {[
            { id:"periods",              label:"T\u1ea1o \u0111\u1ee3t kh\u1ea3o s\u00e1t",      tip:"K\u1ef3 & \u0110\u1ee3t kh\u1ea3o s\u00e1t",        icon:Clock },
            { id:"categories",           label:"Danh m\u1ee5c",   tip:"Danh m\u1ee5c",            icon:Settings },
            { id:"subjects",             label:"M\u00f4n KS",     tip:"M\u00f4n kh\u1ea3o s\u00e1t",        icon:BookOpen },
            { id:"mapping",              label:"C\u1ea5u h\u00ecnh",   tip:"C\u1ea5u h\u00ecnh theo Kh\u1ed1i",  icon:Layers },
            { id:"students",             label:"Danh s\u00e1ch Kh\u1ea3o s\u00e1t",   tip:"DS HS kh\u1ea3o s\u00e1t",      icon:Users },

          ].filter(t => !(mode === "input" && ["categories", "subjects", "mapping"].includes(t.id))).map(t => {
            const p = getTabPermissions(t.id);
            const canRead = p.canRead;
            const isTabReadOnly = canRead && !p.canCreate && !p.canUpdate && !p.canDelete;
            return (
              <button
                key={t.id}
                onClick={() => { if (canRead) setTab(t.id); }}
                title={!canRead ? "Bạn không có quyền xem chức năng này" : isTabReadOnly ? `${t.tip} (Chỉ xem)` : t.tip}
                className={"flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-[9px] sm:text-[11px] font-bold transition-all duration-200 min-w-[44px] sm:min-w-0 " + 
                  (!canRead 
                    ? "opacity-35 cursor-not-allowed select-none" 
                    : (tab===t.id 
                        ? (isTabReadOnly ? "bg-amber-600 text-white shadow-sm" : "bg-indigo-600 text-white shadow-sm") 
                        : (isTabReadOnly 
                            ? "text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-dashed border-amber-300/40" 
                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                          )
                      )
                  )}
              >
                {!canRead && <Lock className="w-3 h-3 text-slate-400 mr-0.5" />}
                {isTabReadOnly && <Lock className="w-3.5 h-3.5 text-amber-500 mr-0.5 flex-shrink-0" />}
                <t.icon className={"w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 " + (tab===t.id ? "text-white" : (isTabReadOnly ? "text-amber-500/80" : "text-slate-400"))}/>
                <span className="leading-tight text-center whitespace-nowrap">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* ===== TAB: ASSIGNMENTS (PHÂN CÔNG) ===== */}
      {tab==="assignments" && (
        <div className={"space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 " + (isReadOnly ? "select-none" : "")}>
          {latestBatchInfo && (
            <div className="no-print relative overflow-hidden p-4 rounded-2xl shadow-md animate-in fade-in slide-in-from-top-4 duration-500 mb-6 bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-100/60 border border-amber-200/80 ring-1 ring-amber-900/5 group hover:shadow-lg transition-all">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none transition-transform duration-700 group-hover:scale-110"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-orange-500/15 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
            
            <div className="relative flex items-start sm:items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-white shadow-sm border border-amber-200/70 flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform duration-300">
            <AlertCircle className="w-6 h-6 text-amber-600 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="text-[13px] font-semibold text-slate-700 leading-relaxed flex flex-wrap items-center gap-y-1.5 gap-x-1">
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-700 to-orange-600 uppercase tracking-widest text-xs py-0.5 px-2.5 rounded-lg bg-white/80 border border-amber-200/50 shadow-sm mr-2 flex items-center gap-1.5">
            Thông báo
            </span>
            <span className="opacity-90">Đợt khảo sát mới nhất:</span> 
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold shadow-md shadow-amber-900/10 mx-0.5 text-xs tracking-wide">
            {latestBatchInfo.name}
            </span> 
            <span className="opacity-90 mx-1">thuộc Kỳ khảo sát</span> 
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800 font-black border border-orange-200/60 shadow-sm mx-0.5 text-xs">
            {latestBatchInfo.periodName}
            </span>
            <span className="opacity-90 ml-0.5">. Vui lòng xét duyệt.</span>
            </div>
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
          <div className="flex items-center gap-4 bg-white p-5 rounded-3xl border-2 border-teal-100 shadow-sm">
             <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 animate-pulse text-xs font-semibold">
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
                      <select value={asTeacherId} onChange={e=>setAsTeacherId(e.target.value)} className={inp+" bg-slate-50/50 border-indigo-100 hover:border-indigo-300 focus:bg-white"} disabled={isReadOnly}>
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
                        <button onClick={() => setAsSelSubjects(asSelSubjects.length === subjectsList.length ? [] : subjectsList.map(s=>s.id))} className={"text-[10px] font-black text-indigo-500 hover:bg-indigo-50 px-2 py-1 rounded-xl uppercase tracking-wider transition-colors " + (isReadOnly ? "pointer-events-none opacity-40 cursor-not-allowed" : "")} disabled={isReadOnly}>
                          {asSelSubjects.length === subjectsList.length ? "Bỏ chọn hết" : "Chọn tất cả"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {subjectsList.map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => setAsSelSubjects(p => p.includes(sub.id) ? p.filter(x=>x!==sub.id) : [...p, sub.id])}
                            className={`px-4 py-2.5 rounded-2xl text-xs font-bold border-2 transition-all ${asSelSubjects.includes(sub.id) ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-white border-slate-100 text-slate-500 hover:border-indigo-200 hover:text-indigo-500"} ${isReadOnly ? "pointer-events-none opacity-40 cursor-not-allowed" : ""}`} disabled={isReadOnly}
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
                   <h3 className="text-base font-black text-slate-800 flex items-center gap-2"><Search className="w-5 h-5 text-indigo-500"/> Danh sách đã Phân công</h3>
                   {asFilterBatchId && (
                      <span className="text-indigo-600 text-xs font-black text-xs font-semibold">{groupedAssignments.length} nhóm phân công</span>
                   )}
                </div>
                {asPeriodId && (
                   <div className="flex flex-wrap items-center gap-3 self-end sm:self-auto text-xs font-semibold">
                      <div className="flex items-center gap-2">
                         <Filter className="w-4 h-4 text-indigo-500" />
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lọc đợt:</span>
                         <select 
                            value={asFilterBatchId} 
                            onChange={e=>setAsFilterBatchId(e.target.value)} 
                            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm cursor-pointer min-w-[150px]"
                         >
                            <option value="">-- Chọn Đợt --</option>
                            {asSelPeriod?.batches?.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                         </select>
                      </div>
                      {asFilterBatchId && (
                         <button
                            onClick={sendAllNotifications}
                            disabled={asNotifyingAll || groupedAssignments.length === 0 || cannotUpdate}
                            className={"flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50 " + (cannotUpdate ? "pointer-events-none opacity-40" : "")}
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
                    <div className="w-16 h-16 flex items-center justify-center mb-4">
                      <Filter className="w-8 h-8 text-[#00A99D]" />
                    </div>
                    <p className="font-black text-slate-500 text-sm">Vui lòng chọn Đợt lọc</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Chọn một Đợt ở bộ lọc phía trên để hiển thị danh sách giáo viên đã được phân công</p>
                  </div>
                ) : asLoading ? <Spin/> : assignments.length === 0 ? (
                  <Empty icon={UserPlus} text="Chưa có phân công nào" sub="Sử dụng form bên trên để tiến hành phân công GV"/>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b-2 border-slate-200">
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-8">#</th>
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Giáo viên</th>
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Môn học</th>
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Khối</th>
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hệ học</th>
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedAssignments.map((a, idx) => (
                          <tr key={a.id} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
                            <td className="px-3 py-2 text-slate-400 font-bold">{idx + 1}</td>
                            <td className="px-3 py-2">
                              <p className="font-black text-slate-700">{a.user?.fullName}</p>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{a.batch?.name || "Tất cả đợt"}</p>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {a.subjects.map((sub: string) => (
                                  <span key={sub} className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md text-[10px] font-black text-indigo-600">{sub}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {a.grades.map((g: string) => (
                                  <span key={g} className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{g}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {a.educationSystems.map((sys: string) => (
                                  <span key={sys} className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">{sys}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-end gap-0.5">
                                <button
                                  onClick={() => sendTeacherNotification(a)}
                                  disabled={asNotifyingId === a.id || cannotUpdate}
                                  className={"p-1.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-30 " + (cannotUpdate ? "pointer-events-none opacity-40" : "")}
                                  title="Gửi email thông báo phân công"
                                >
                                  {asNotifyingId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Mail className="w-3.5 h-3.5"/>}
                                </button>
                                <button
                                  onClick={() => openEditAssignment(a)}
                                  disabled={cannotUpdate}
                                  className={"p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-30 " + (cannotUpdate ? "pointer-events-none opacity-40" : "")}
                                >
                                  <Edit2 className="w-3.5 h-3.5"/>
                                </button>
                                <button
                                  onClick={() => setConfirm({ msg: `Xóa phân công của GV ${a.user?.fullName}?`, fn: () => deleteAssignment(a.ids) })}
                                  disabled={cannotDelete}
                                  className={"p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-30 " + (cannotDelete ? "pointer-events-none opacity-40" : "")}
                                >
                                  <Trash2 className="w-3.5 h-3.5"/>
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



            </div>
          </div>

          {pLoading ? <Spin/> : periods.length === 0 ? <Empty icon={Calendar} text="Chưa có Kỳ khảo sát nào" sub="Liên hệ quản trị viên để tạo kỳ khảo sát mới" /> : (
            <div className="space-y-3">
              {visiblePeriods.map(p => (
                <div key={p.id} className="bg-white rounded-xl border border-slate-150 shadow-none overflow-hidden group/p hover:border-indigo-250 transition-all">
                  <div className="px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer" onClick={()=>setExpandedId(expandedId===p.id?null:p.id)}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 group-hover/p:bg-indigo-600 group-hover/p:text-white transition-all text-xs font-semibold">
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
                      <button onClick={e=>{e.stopPropagation(); if (cannotCreate) return; openAddBatch(p.id)}} className={"flex items-center gap-1.5 px-4 py-2 text-[11px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-xl transition-all border border-emerald-100 " + (cannotCreate ? "pointer-events-none opacity-40" : "")}>
                        <Plus className="w-3.5 h-3.5"/> Thêm Đợt
                      </button>
                      <button onClick={e=>{e.stopPropagation(); if (cannotUpdate) return; openEditPeriod(p)}} className={"p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all " + (cannotUpdate ? "pointer-events-none opacity-40" : "")}><Edit2 className="w-4 h-4"/></button>
                      <button onClick={e=>{e.stopPropagation(); setConfirm({msg:`Xóa kỳ "${p.name}"?`,fn:()=>doDeletePeriod(p.id)})}} className={"p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all " + (cannotDelete ? "pointer-events-none opacity-40" : "")}><Trash2 className="w-4 h-4"/></button>
                      <span className="text-slate-300 ml-2">{expandedId===p.id?<ChevronUp className="w-5 h-5"/>:<ChevronDown className="w-5 h-5"/>}</span>
                    </div>
                  </div>
                  {expandedId===p.id && (
                    <div className="p-6 text-xs font-semibold">
                       {(!p.batches || p.batches.length === 0) ? (
                         <div className="text-center py-8 text-slate-400 font-bold text-xs uppercase tracking-wider bg-white rounded-2xl border-2 border-dashed border-slate-200">Chưa có Đợt khảo sát nào ghi nhận</div>
                       ) : (
                         <div className="overflow-x-auto bg-white border border-slate-150 rounded-2xl shadow-none">
                           <table className="w-full text-left border-collapse">
                             <thead>
                               <tr className="text-xs font-semibold">
                                 <th className="px-4 py-3.5 border-b border-slate-200/80 text-[10px] font-black text-slate-500 uppercase tracking-widest pl-6">Mã Đợt</th>
                                 <th className="px-4 py-3.5 border-b border-slate-200/80 text-[10px] font-black text-slate-500 uppercase tracking-widest">Nội dung khảo sát</th>
                                 <th className="px-4 py-3.5 border-b border-slate-200/80 text-[10px] font-black text-slate-500 uppercase tracking-widest">Cơ sở</th>
                                 <th className="px-4 py-3.5 border-b border-slate-200/80 text-[10px] font-black text-slate-500 uppercase tracking-widest">Thời gian</th>
                                 <th className="px-4 py-3.5 border-b border-slate-200/80 text-[10px] font-black text-slate-500 uppercase tracking-widest">Trạng thái</th>
                                 <th className="px-4 py-3.5 border-b border-slate-200/80 text-[10px] font-black text-slate-500 uppercase tracking-widest">Người phụ trách</th>
                                 <th className="px-4 py-3.5 border-b border-slate-200/80 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right pr-6">Thao tác</th>
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
                                   <tr key={b.id} className="group hover:bg-slate-50/50 transition-colors text-xs font-semibold">
                                     <td className="px-4 py-3 border-b border-slate-100 pl-6">
                                       <span className="inline-flex items-center justify-center w-8 h-8 font-black text-indigo-600 text-xs text-xs font-semibold">
                                         #{b.batchNumber}
                                       </span>
                                     </td>
                                     <td className="px-4 py-3 border-b border-slate-100">
                                       <p className="text-sm font-black text-slate-700">{baseName}</p>
                                       <p className="text-[10px] font-bold text-slate-400 truncate max-w-xs">{b.name}</p>
                                     </td>
                                     <td className="px-4 py-3 border-b border-slate-100">
                                       <span className="text-[11px] font-black text-slate-600 text-xs font-semibold">
                                         {campusName}
                                       </span>
                                     </td>
                                     <td className="px-4 py-3 border-b border-slate-100">
                                       <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                         <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                         <span>{b.startDate?.slice(0, 10).split('-').reverse().join('/')}</span>
                                         <span className="text-slate-300">→</span>
                                         <span>{b.endDate?.slice(0, 10).split('-').reverse().join('/')}</span>
                                       </div>
                                     </td>
                                     <td className="px-4 py-3 border-b border-slate-100">
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
                                                                           <td className="px-4 py-3 border-b border-slate-100">
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
                                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all ml-2 text-xs font-semibold"
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
                                     <td className="px-4 py-3 border-b border-slate-100 text-right pr-6">
                                       <div className="flex items-center justify-end gap-1">
                                         <button onClick={() => openEditBatch(b)} className={"p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all " + (cannotUpdate ? "pointer-events-none opacity-40" : "")} disabled={cannotUpdate} title="Chỉnh sửa">
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
                Tổng cộng: <span className="text-[#00A99D] ml-1">{filtStu.length}</span> HS
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
<button onClick={openAddStudent} disabled={!sPeriodId || sPeriodId === "all" || cannotCreate} className={"h-10 px-5 bg-[#00A99D] text-white text-sm font-bold rounded-xl hover:bg-[#009085] disabled:opacity-50 transition-all shadow-md shadow-[#00A99D]/20 flex items-center justify-center " + (cannotCreate ? "pointer-events-none opacity-40" : "")} title={sPeriodId === "all" ? "Vui lòng chọn một kỳ cụ thể" : ""}>
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
                <select value={sBatchId} onChange={e=>setSBatchId(e.target.value)} className={inp + " bg-slate-50/50 hover:bg-white focus:bg-white transition-colors"} disabled={!sPeriodId || sPeriodId === "all"}>
                   <option value="">-- Tất cả đợt --</option>
                   {selPeriod?.batches?.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
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
                  <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b-2 border-slate-200">
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-8">#</th>
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã HS</th>
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ tên</th>
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Khối</th>
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Giới tính</th>
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày sinh</th>
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hệ KS</th>
                          {selPeriod?.name?.toLowerCase().includes("open day") && (
                            <>
                              <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Đăng ký CS</th>
                              <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ủy quyền xét duyệt</th>
                            </>
                          )}
                          <th className="px-3 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedFiltStu.map((s, idx) => (
                          <tr key={s.id} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
                            <td className="px-3 py-2 text-slate-400 font-bold">{(studentsCurrentPage - 1) * studentsPageSize + idx + 1}</td>
                            <td className="px-3 py-2 font-mono text-[10px] font-black text-[#00A99D]">{s.studentCode}</td>
                            <td className="px-3 py-2 font-bold text-slate-700">{s.fullName}</td>
                            <td className="px-3 py-2 font-semibold text-slate-650">{s.grade}</td>
                            <td className="px-3 py-2 font-semibold text-slate-650">{s.gender || "-"}</td>
                            <td className="px-3 py-2 text-slate-500">{s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('vi-VN') : "-"}</td>
                            <td className="px-3 py-2 font-semibold text-[#00A99D]">{s.surveyFormType || "-"}</td>
                            {selPeriod?.name?.toLowerCase().includes("open day") && (
                              <>
                                <td className="px-3 py-2 font-semibold text-slate-700">
                                  {campuses.find(c => c.id === s.registeredCampus)?.campusName || s.registeredCampus || "-"}
                                </td>
                                <td className="px-3 py-2 font-semibold text-slate-700">
                                  {campuses.find(c => c.id === s.registeredCampus)?.manager?.fullName || "-"}
                                </td>
                              </>
                            )}
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={()=>openEditStudent(s)} className={"p-1.5 text-slate-400 hover:text-[#00A99D] hover:bg-slate-50 rounded-lg transition-all " + (cannotUpdate ? "pointer-events-none opacity-40" : "")} disabled={cannotUpdate}><Edit2 className="w-4 h-4"/></button>
                                <button onClick={()=>setConfirm({msg:`Xóa hồ sơ học sinh ${s.fullName}?`,fn:()=>doDeleteStudent(s.id)})} className={"p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all " + (cannotDelete ? "pointer-events-none opacity-40" : "")} disabled={cannotDelete}><Trash2 className="w-4 h-4"/></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>

                {/* Mobile Card List View */}
                <div className="md:hidden flex flex-col p-4 gap-4 text-xs font-semibold">
                  {paginatedFiltStu.map(s => (
                    <div key={s.id} className="bg-white p-4 rounded-2xl border-2 border-blue-100 shadow-sm relative">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-black text-[#00A99D] mb-1">{s.studentCode}</span>
                          <span className="text-sm font-bold text-slate-800">{s.fullName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                           <button onClick={()=>openEditStudent(s)} className={"p-2 text-slate-400 hover:text-[#00A99D] bg-slate-50 rounded-xl " + (cannotUpdate ? "pointer-events-none opacity-40" : "")} disabled={cannotUpdate}><Edit2 className="w-4 h-4"/></button>
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
                           <span className="font-semibold text-[#00A99D]">{s.surveyFormType || "-"}</span>
                         </div>
                         {selPeriod?.name?.toLowerCase().includes("open day") && (
                           <>
                             <div>
                               <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-bold">Đăng ký CS</span>
                               <span className="font-semibold text-slate-700">
                                 {campuses.find(c => c.id === s.registeredCampus)?.campusName || s.registeredCampus || "-"}
                               </span>
                             </div>
                             <div>
                               <span className="text-slate-400 block mb-0.5 text-[10px] uppercase font-bold">Ủy quyền xét duyệt</span>
                               <span className="font-semibold text-slate-700">
                                 {campuses.find(c => c.id === s.registeredCampus)?.manager?.fullName || "-"}
                               </span>
                             </div>
                           </>
                         )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {filtStu.length > 0 && (
                  <div className="p-4 flex items-center justify-between text-xs font-semibold border-t border-slate-100 bg-slate-50/50">
                    <span className="text-xs text-slate-500 font-medium">
                      Hiển thị {Math.min(filtStu.length, (studentsCurrentPage - 1) * studentsPageSize + 1)}-
                      {Math.min(filtStu.length, studentsCurrentPage * studentsPageSize)} trong tổng số{" "}
                      {filtStu.length} học sinh
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setStudentsCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={studentsCurrentPage === 1}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-white text-slate-655 disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-transparent transition-all cursor-pointer font-black bg-transparent border-none"
                      >
                        Trước
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.ceil(filtStu.length / studentsPageSize) }).map((_, i) => {
                          const pageNum = i + 1;
                          const totalPages = Math.ceil(filtStu.length / studentsPageSize);
                          if (totalPages > 5 && Math.abs(pageNum - studentsCurrentPage) > 1 && pageNum !== 1 && pageNum !== totalPages) {
                            if (pageNum === 2 || pageNum === totalPages - 1) {
                              return <span key={pageNum} className="px-1 text-slate-400 font-bold select-none">...</span>;
                            }
                            return null;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setStudentsCurrentPage(pageNum)}
                              className={"h-8 w-8 rounded-xl flex items-center justify-center transition-all cursor-pointer border-none font-black " + (
                                studentsCurrentPage === pageNum
                                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                                  : "text-slate-655 hover:bg-slate-100"
                              )}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setStudentsCurrentPage((p) => Math.min(Math.ceil(filtStu.length / studentsPageSize), p + 1))}
                        disabled={studentsCurrentPage === Math.ceil(filtStu.length / studentsPageSize) || Math.ceil(filtStu.length / studentsPageSize) === 0}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-white text-slate-655 disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-transparent transition-all cursor-pointer font-black bg-transparent border-none"
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                )}
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
                   <button onClick={()=>openAddConfig(type.code)} className={"w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-slate-100 " + (cannotCreate ? "pointer-events-none opacity-40" : "")} disabled={cannotCreate}><Plus className="w-4 h-4"/></button>
                </div>
                <div className="p-4 flex-1 space-y-1.5">
                   {configs.filter(c => c.categoryType === type.code).map(c => (
                     <div key={c.id} className="group flex items-center justify-between p-3 hover:bg-slate-50 transition-all hover:border-slate-100 text-xs font-semibold">
                        <span className="text-xs font-black text-slate-600 truncate">{c.name}</span>
                        <div className="flex items-center gap-0.5 ">
                           <button onClick={()=>openEditConfig(c)} className={"p-1.5 text-slate-300 hover:text-indigo-600 " + (cannotUpdate ? "pointer-events-none opacity-40" : "")} disabled={cannotUpdate}><Edit2 className="w-3 h-3"/></button>
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
              className={"flex items-center gap-2 px-5 py-2.5 bg-[#00A99D] text-white text-[13px] font-bold rounded-xl hover:bg-[#009085] transition-all shadow-md shadow-[#00A99D]/20 " + (cannotCreate ? "pointer-events-none opacity-40" : "")} disabled={cannotCreate}
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
                  <thead className="text-xs font-semibold">
                    <tr>
                      <th className="px-4 py-3.5 border-b border-slate-200/80 text-[10px] font-black text-slate-500 uppercase tracking-widest">Mã Môn</th>
                      <th className="px-4 py-3.5 border-b border-slate-200/80 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tên Môn</th>
                      
                      <th className="p-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border border-slate-200">Cột Điểm</th>
                      <th className="p-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border border-slate-200">Cột NX</th>
                      <th className="p-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border border-slate-200">Trạng thái</th>
                      <th className="p-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border border-slate-200">Miễn giảm</th>
                      <th className="p-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right border border-slate-200">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {subjectsList.map((sub) => {
                      let parsedCols = { scores: [], comments: [], showScoreInReport: [], showCommentInReport: [] };
                      try { if (sub.columnNames) parsedCols = JSON.parse(sub.columnNames); } catch {}
                      return (
                        <tr key={sub.id} className="group hover:bg-slate-50/70 transition-colors text-xs font-semibold">
                          <td className="px-4 py-3 border-b border-slate-100"><span className="font-mono text-xs font-black text-indigo-600 text-xs font-semibold">{sub.code}</span></td>
                          <td className="px-4 py-3 border-b border-slate-100"><span className="text-sm font-black text-slate-700">{sub.name}</span></td>
                          
                          <td className="p-2 text-center border border-slate-200"><span className="w-7 h-7 text-indigo-700 font-black text-xs inline-flex items-center justify-center text-xs font-semibold">{sub.scoreColumns ?? 0}</span></td>
                          <td className="p-2 text-center border border-slate-200"><span className="w-7 h-7 text-emerald-700 font-black text-xs inline-flex items-center justify-center text-xs font-semibold">{sub.commentColumns ?? 0}</span></td>
                          <td className="p-2 text-center border border-slate-200"><Badge s={sub.status || "ACTIVE"}/></td>
                          <td className="p-2 text-center border border-slate-200">
                            {(() => { try { const arr = JSON.parse(sub.exemptCriteria || "[]"); return (Array.isArray(arr) && arr.length > 0) ? <div className="flex flex-wrap gap-1 justify-center">{arr.map((c: string) => <span key={c} className="text-[10px] font-bold text-violet-700 text-xs font-semibold">{c}</span>)}</div> : <span className="text-slate-300 text-xs">—</span>; } catch { return <span className="text-slate-300 text-xs">—</span>; } })()}
                          </td>
                          <td className="p-2 text-right border border-slate-200">
                            <div className="flex items-center justify-end gap-1">
                              <button title="Cấu hình tên cột" onClick={() => { setColumnConfigForm({ subjectId: sub.id, name: sub.name, scoreColumns: sub.scoreColumns ?? 1, commentColumns: sub.commentColumns ?? 1, scoreNames: parsedCols.scores || [], commentNames: parsedCols.comments || [], showScoreInReport: parsedCols.showScoreInReport || [], showCommentInReport: parsedCols.showCommentInReport || [] }); setIsColumnConfigOpen(true); }} className={"p-2.5 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all " + (cannotUpdate ? "pointer-events-none opacity-40" : "")} disabled={cannotUpdate}><PenLine className="w-4 h-4"/></button>
                              <button onClick={() => { setEditingSubjectId(sub.id); setSubjectForm({ code: sub.code, name: sub.name, subjectType: sub.subjectType || "", scoreColumns: sub.scoreColumns ?? 1, commentColumns: sub.commentColumns ?? 1, status: sub.status || "ACTIVE", exemptCriteria: (() => { try { return JSON.parse(sub.exemptCriteria || "[]"); } catch { return []; } })() }); setIsSubjectOpen(true); }} className={"p-2.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all " + (cannotUpdate ? "pointer-events-none opacity-40" : "")} disabled={cannotUpdate}><Edit2 className="w-4 h-4"/></button>
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
              <div className="bg-[#00A99D]/10 p-2 rounded-xl text-[#00A99D]"><Settings className="w-5 h-5"/></div>
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
                    <button onClick={() => setSelGrades(selGrades.length === activeGrades.length ? [] : [...activeGrades])} className={"text-[10px] font-black uppercase tracking-wider text-[#00A99D] bg-[#00A99D]/10 hover:bg-[#00A99D]/20 px-2.5 py-1 rounded-md transition-colors border border-[#00A99D]/20 " + (isReadOnly ? "pointer-events-none opacity-40" : "")} disabled={isReadOnly}>Chọn tất cả</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeGrades.map((g: string) => (
                      <button key={g} onClick={() => toggleGrade(g)} className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all border ${selGrades.includes(g) ? 'bg-[#00A99D] text-white border-[#00A99D] shadow-sm' : 'bg-white text-slate-800 border-slate-300 hover:border-[#00A99D] hover:bg-slate-100/50'} ${isReadOnly ? "pointer-events-none opacity-40" : ""}`} disabled={isReadOnly}>
                        {selGrades.includes(g) && <Check className="w-3 h-3 inline mr-1"/>} {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="block font-black text-slate-850 text-xs uppercase tracking-wider">Hệ học:</span>
                    <button onClick={() => setSelEdus(selEdus.length === currentEduSystems.length ? [] : currentEduSystems.map((e: any) => e.code))} className={"text-[10px] font-black uppercase tracking-wider text-[#00A99D] bg-[#00A99D]/10 hover:bg-[#00A99D]/20 px-2.5 py-1 rounded-md transition-colors border border-[#00A99D]/20 " + (isReadOnly ? "pointer-events-none opacity-40" : "")} disabled={isReadOnly}>Chọn tất cả</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentEduSystems.map((es: any) => (
                      <button key={es.code} onClick={() => toggleEdu(es.code)} className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all border ${selEdus.includes(es.code) ? 'bg-[#00A99D] text-white border-[#00A99D] shadow-sm' : 'bg-white text-slate-800 border-slate-300 hover:border-[#00A99D] hover:bg-slate-100/50'} ${isReadOnly ? "pointer-events-none opacity-40" : ""}`} disabled={isReadOnly}>
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
                  <button onClick={() => setAssignSelSubjects(assignSelSubjects.length === subjectsList.length ? [] : subjectsList.map((s:any)=>s.id))} className={"text-[10px] font-black uppercase tracking-wider text-[#00A99D] bg-[#00A99D]/10 hover:bg-[#00A99D]/20 px-2.5 py-1 rounded-md transition-colors border border-[#00A99D]/20 " + (isReadOnly ? "pointer-events-none opacity-40" : "")} disabled={isReadOnly}>Chọn tất cả</button>
                </div>
                <div className="flex flex-wrap gap-2 mb-4 max-h-[150px] overflow-y-auto pr-1">
                  {subjectsList.map((s:any) => (
                    <button key={s.id} onClick={() => setAssignSelSubjects(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])} className={`text-xs px-3 py-2 rounded-xl font-bold transition-all border ${assignSelSubjects.includes(s.id) ? 'bg-[#00A99D] text-white border-[#00A99D] shadow-sm' : 'bg-white text-slate-800 border-slate-300 hover:border-[#00A99D] hover:bg-slate-100/50'} ${isReadOnly ? "pointer-events-none opacity-40" : ""}`} disabled={isReadOnly}>
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
                    className={"w-full py-3.5 bg-[#00A99D] text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-[#1E8B87] transition-colors disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2 " + ((cannotCreate || cannotUpdate) ? "pointer-events-none opacity-40" : "")}
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
              <h4 className="font-black text-slate-800 flex items-center gap-2"><Layers className="w-4 h-4 text-[#00A99D]"/> Danh sách Cấu hình đã lưu</h4>
              <button onClick={fetchAllMappings} className="text-xs text-[#00A99D] hover:underline font-bold">Làm mới</button>
            </div>
            
            {allMappingsLoading ? (
              <div className="p-8 text-center text-slate-450 font-semibold">Đang tải danh sách...</div>
            ) : allMappings.length === 0 ? (
              <div className="p-12 text-center text-slate-455 font-semibold">Chưa có cấu hình môn khảo sát nào.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="text-xs font-semibold">
                    <tr>
                      <th className="p-2 p-2 text-xs font-black text-slate-400 uppercase tracking-widest w-16 border border-slate-200">STT</th>
                      <th className="p-2 p-2 text-xs font-black text-slate-400 uppercase tracking-widest border border-slate-200">Môn Khảo Sát</th>
                      <th className="p-2 p-2 text-xs font-black text-slate-400 uppercase tracking-widest border border-slate-200">Khối Áp Dụng</th>
                      <th className="p-2 p-2 text-xs font-black text-slate-400 uppercase tracking-widest border border-slate-200">Hệ Áp Dụng</th>
                      <th className="p-2 p-2 text-xs font-black text-slate-400 uppercase tracking-widest text-center w-24 border border-slate-200">Thao tác</th>
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
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00A99D]/10 text-[#00A99D] border border-[#00A99D]/20 font-bold uppercase">
                                    GV VN
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2 p-2 border border-slate-200">
                              {allGrades ? (
                                <span className="font-bold text-[#00A99D] bg-[#00A99D]/5 border border-[#00A99D]/20 px-2.5 py-1 rounded-md text-xs">Tất cả Khối</span>
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
                                }} className={"p-2 text-slate-400 hover:text-[#00A99D] hover:bg-[#00A99D]/5 rounded-xl transition-all " + (cannotUpdate ? "pointer-events-none opacity-40" : "")} disabled={cannotUpdate} title="Chỉnh sửa (Sẽ nạp lên form phía trên)">
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
                      <thead>
                        <tr className="bg-slate-100/90 text-slate-700 font-black text-[11px] uppercase tracking-wider border-b border-slate-200">
                          <th className="py-2.5 px-3 text-center w-12 border-r border-slate-200">TT</th>
                          <th className="py-2.5 px-3 border-r border-slate-200">Tên Hồ sơ</th>
                          <th className="py-2.5 px-3 text-center w-16 border-r border-slate-200">SL</th>
                          <th className="py-2.5 px-3 text-center w-20">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
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
                        <thead>
                          <tr className="bg-[#0f766e] text-white font-bold uppercase tracking-wider">
                            <th className="px-3 py-2.5 border-r border-teal-800 text-center w-12">STT</th>
                            <th className="px-4 py-2.5 border-r border-teal-800 text-left">Tên hồ sơ giấy tờ</th>
                            <th className="px-3 py-2.5 text-center w-20">Số lượng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
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
                <div className="w-10 h-10 text-indigo-600 flex items-center justify-center text-xs font-semibold">
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
                  className="w-full text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all animate-none text-xs font-semibold"
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
                    className="w-full text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all animate-none text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">Ghi chú</label>
                  <input 
                    type="text" 
                    value={docFormNote} 
                    onChange={(e) => setDocFormNote(e.target.value)} 
                    placeholder="Ví dụ: Bản sao y" 
                    className="w-full text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all animate-none text-xs font-semibold"
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
                      <label key={c.id} className="flex items-center gap-1.5 hover:bg-indigo-50/50 cursor-pointer select-none transition-colors text-xs font-semibold">
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
                className="hover:bg-indigo-700 text-white text-xs font-black transition-colors shadow-lg shadow-indigo-100 text-xs font-semibold"
              >
                Lưu hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== OTHER TABS PLACEHOLDERS ===== */}
      {tab === "reports" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          
          {/* Sub-tab Navigation & Actions Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4 p-3.5 shadow-sm text-xs font-semibold">
            <div className="hidden md:block flex-1"></div>
            <div className="bg-slate-100 p-1 rounded-2xl border border-slate-200/60 flex gap-1 shadow-inner">
              <button
                onClick={() => setReportsSubTab("stats")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-tight transition-all duration-300 ${reportsSubTab === "stats" ? "bg-white text-indigo-600 shadow-sm scale-[1.02]" : "text-slate-500 hover:text-slate-800"}`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-indigo-500"/>
                Thống kê tổng quan
              </button>
              <button
                onClick={() => setReportsSubTab("results")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-tight transition-all duration-300 ${reportsSubTab === "results" ? "bg-white text-indigo-600 shadow-sm scale-[1.02]" : "text-slate-500 hover:text-slate-800"}`}
              >
                <Users className="w-3.5 h-3.5 text-indigo-500"/>
                Kết quả chi tiết môn học
              </button>
            </div>
            <div className="flex-1 flex justify-end w-full md:w-auto"></div>
          </div>

          {/* TOP SELECTORS BAR */}
          <div className={`bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-slate-200/60 grid grid-cols-1 ${reportsSubTab === "stats" ? "md:grid-cols-2" : "md:grid-cols-3"} gap-6`}>
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

            {reportsSubTab === "results" && (
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
            )}
          </div>

          {/* VIEW RENDERED CONDITIONALLY */}
          {reportsSubTab === "stats" ? (
            <div className="space-y-4 animate-in fade-in duration-300">
          {/* STATS DASHBOARD BAR */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* KPI Cards Grid */}
            <div className="xl:col-span-4 grid grid-cols-2 gap-4">
              {/* Card 1: Tổng Học sinh */}
              <div className="relative overflow-hidden bg-gradient-to-br from-white to-slate-50/50 p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-50/30 transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 mix-blend-multiply filter blur-xl opacity-70 group-hover:scale-110 transition-transform duration-300 text-xs font-semibold"></div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-450">Tổng Học sinh</span>
                  <div className="p-2.5 text-indigo-600 group-hover:scale-115 transition-all duration-300 shadow-sm shadow-indigo-100 text-xs font-semibold">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mt-4 z-10">
                  <span className="text-3xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{overallKPIs.total}</span>
                  <span className="text-xs text-slate-450 font-bold">học sinh</span>
                </div>
              </div>

              {/* Card 2: Đã xét duyệt */}
              <div className="relative overflow-hidden bg-gradient-to-br from-white to-slate-50/50 p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-violet-300 hover:shadow-lg hover:shadow-violet-50/30 transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 mix-blend-multiply filter blur-xl opacity-70 group-hover:scale-110 transition-transform duration-300 text-xs font-semibold"></div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-455">Đã xét duyệt</span>
                  <div className="p-2.5 text-violet-600 group-hover:scale-115 transition-all duration-300 shadow-sm shadow-violet-100 text-xs font-semibold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mt-4 z-10 flex-wrap">
                  <span className="text-3xl font-black text-slate-800 group-hover:text-violet-600 transition-colors">{overallKPIs.total - overallKPIs.pending}</span>
                  <span className="text-[10px] font-black text-violet-600 text-xs font-semibold">({overallKPIs.approvedRate}%)</span>
                </div>
              </div>

              {/* Card 3: Tổng Đạt */}
              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50/35 to-emerald-50/10 p-6 rounded-[2rem] border border-emerald-100 shadow-sm flex flex-col justify-between group hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-50/30 transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 mix-blend-multiply filter blur-xl opacity-70 group-hover:scale-110 transition-transform duration-300 text-xs font-semibold"></div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Tổng Đạt</span>
                  <div className="p-2.5 text-emerald-700 group-hover:scale-115 transition-all duration-300 shadow-sm shadow-emerald-100 text-xs font-semibold">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mt-4 z-10">
                  <span className="text-3xl font-black text-emerald-700">{overallKPIs.passed}</span>
                  <span className="text-xs text-emerald-600 font-bold">đạt KS</span>
                </div>
              </div>

              {/* Card 4: Đạt Cam kết */}
              <div className="relative overflow-hidden bg-gradient-to-br from-amber-50/35 to-amber-50/10 p-6 rounded-[2rem] border border-amber-100 shadow-sm flex flex-col justify-between group hover:border-amber-300 hover:shadow-lg hover:shadow-amber-50/30 transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 mix-blend-multiply filter blur-xl opacity-70 group-hover:scale-110 transition-transform duration-300 text-xs font-semibold"></div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Đạt Cam kết</span>
                  <div className="p-2.5 text-amber-700 group-hover:scale-115 transition-all duration-300 shadow-sm shadow-amber-100 text-xs font-semibold">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1 mt-4 z-10">
                  <span className="text-3xl font-black text-amber-700">{overallKPIs.committed}</span>
                  <span className="text-xs text-amber-600 font-bold">cam kết</span>
                </div>
              </div>
            </div>

            {/* Campus Breakdown Table Card */}
            <div className="xl:col-span-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 overflow-hidden flex flex-col justify-between group hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-5 border-b border-slate-100/80 pb-4">
                <h4 className="font-black text-slate-800 text-sm tracking-tight uppercase flex items-center gap-2.5">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full opacity-75 text-xs font-semibold"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 text-xs font-semibold"></span>
                  </span>
                  Số liệu phân theo Cơ sở tuyển sinh
                </h4>
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider text-xs font-semibold">Chi tiết các cơ sở</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap table-auto border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100/50">
                      <th className="pb-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2 p-2 border border-slate-200">Cơ sở</th>
                      <th className="pb-3.5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest p-2 border border-slate-200">Tổng HS</th>
                      <th className="pb-3.5 text-center text-[9px] font-black text-emerald-500 uppercase tracking-widest p-2 border border-slate-200">Đạt</th>
                      <th className="pb-3.5 text-center text-[9px] font-black text-amber-500 uppercase tracking-widest p-2 border border-slate-200">Cam kết</th>
                      <th className="pb-3.5 text-center text-[9px] font-black text-rose-500 uppercase tracking-widest p-2 border border-slate-200">Không Đạt</th>
                      <th className="pb-3.5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest p-2 border border-slate-200">Chưa Duyệt</th>
                      <th className="pb-3.5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest pr-2 p-2 border border-slate-200">Tỷ lệ duyệt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {campusStats.map(stat => {
                      const campusApprovedRate = stat.total > 0 ? Math.round(((stat.total - stat.pending) / stat.total) * 100) : 0;
                      return (
                        <tr key={stat.id} className="hover:bg-indigo-50/15 transition-all duration-200 group/row text-xs font-semibold">
                          <td className="p-2 pl-2 border border-slate-200">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 flex items-center justify-center group-hover/row:bg-white group-hover/row:border-indigo-100 transition-all duration-200 text-xs font-semibold">
                                <span className="text-[10px] font-black text-slate-500 group-hover/row:text-indigo-600">{stat.campusName?.replace("Cơ sở ", "CS")}</span>
                              </div>
                              <span className="text-sm font-black text-slate-700 group-hover/row:text-indigo-600 transition-colors">{stat.campusName}</span>
                            </div>
                          </td>
                          <td className="p-2 text-center border border-slate-200">
                            <span className="font-bold text-slate-600 text-sm">{stat.total}</span>
                          </td>
                          <td className="p-2 text-center border border-slate-200">
                            {stat.passed > 0 ? (
                              <span className="font-black text-emerald-700 text-xs inline-block min-w-[32px] text-xs font-semibold">{stat.passed}</span>
                            ) : (
                              <span className="text-slate-300 font-bold text-xs">—</span>
                            )}
                          </td>
                          <td className="p-2 text-center border border-slate-200">
                            {stat.committed > 0 ? (
                              <span className="font-black text-amber-700 text-xs inline-block min-w-[32px] text-xs font-semibold">{stat.committed}</span>
                            ) : (
                              <span className="text-slate-300 font-bold text-xs">—</span>
                            )}
                          </td>
                          <td className="p-2 text-center border border-slate-200">
                            {stat.failed > 0 ? (
                              <span className="font-black text-rose-700 text-xs inline-block min-w-[32px] text-xs font-semibold">{stat.failed}</span>
                            ) : (
                              <span className="text-slate-300 font-bold text-xs">—</span>
                            )}
                          </td>
                          <td className="p-2 text-center border border-slate-200">
                            {stat.pending > 0 ? (
                              <span className="font-black text-slate-500 text-xs inline-block min-w-[32px] text-xs font-semibold">{stat.pending}</span>
                            ) : (
                              <span className="text-slate-300 font-bold text-xs">—</span>
                            )}
                          </td>
                          <td className="p-2 text-right pr-2 border border-slate-200">
                            <div className="flex items-center justify-end gap-2.5">
                              <span className="text-xs font-black text-slate-700">{campusApprovedRate}%</span>
                              <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                                <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full group-hover/row:from-indigo-600 group-hover/row:to-violet-600 transition-all duration-200" style={{ width: `${campusApprovedRate}%` }}></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {campusStats.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-2 text-center text-xs font-bold text-slate-400 uppercase border border-slate-200">Không có dữ liệu cơ sở</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-300">
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
                  <div className="absolute top-0 right-0 w-32 h-32 -mt-10 -mr-10 mix-blend-multiply filter blur-2xl opacity-70 text-xs font-semibold"></div>
                  
                  <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
                    <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-3xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-100 mb-4">
                      {selectedReportStudent.fullName?.charAt(0)}
                    </div>
                    <h3 className="font-black text-slate-800 text-lg leading-snug">{selectedReportStudent.fullName}</h3>
                    <span className="font-mono font-bold text-indigo-600 text-xs mt-2 text-xs font-semibold">{selectedReportStudent.studentCode}</span>
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
                        <span className="font-black text-amber-700 text-[11px] inline-block text-xs font-semibold">{selectedReportStudent.surveyFormType || "—"}</span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 font-black uppercase text-[9px] tracking-widest mb-0.5">Diện Khảo sát</span>
                      <span className="font-bold text-slate-700 text-[13px]">{selectedReportStudent.admissionCriteria || "—"}</span>
                    </div>

                    <div className="col-span-2 p-3 space-y-2 mt-1 text-xs font-semibold">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-black uppercase text-[9px] tracking-widest">Trạng thái duyệt</span>
                        {selectedReportStudent.admissionResult ? (
                          <span className="font-black text-emerald-700 text-[10px] flex items-center gap-1 shadow-sm shadow-emerald-100/50 animate-fade-in text-xs font-semibold">
                            <span className="w-1 h-1 animate-pulse text-xs font-semibold"></span>
                            {selectedReportStudent.admissionResult}
                          </span>
                        ) : (
                          <span className="font-black text-slate-500 bg-white px-2 py-0.5 rounded-xl border border-slate-200 text-[10px]">
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
                      {selectedReportStudent.admissionResult && selectedReportStudent.updatedAt && (
                        <div className="flex items-center justify-between border-t border-slate-200/50 pt-2 text-[12px]">
                          <span className="text-slate-400 font-bold">Ngày phê duyệt:</span>
                          <span className="font-bold text-slate-700">{new Date(selectedReportStudent.updatedAt).toLocaleDateString("vi-VN")}</span>
                        </div>
                      )}
                    </div>
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
                      <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1 shadow-sm text-xs font-semibold">
                        <span className="w-1.5 h-1.5 animate-pulse text-xs font-semibold"></span>
                        Đã duyệt ({selectedReportStudent.admissionResult})
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-[10px] font-black bg-slate-100 text-slate-500 rounded-full border border-slate-200 uppercase tracking-wider">
                        Chưa duyệt
                      </span>
                    )}
                  </h4>
                  
                  {!canApprove && (
                    <div className="text-rose-600 p-3.5 text-xs font-semibold flex items-center gap-2 animate-pulse mb-2 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 flex-shrink-0"/>
                      {selectedReportStudent?.batch?.status === "LOCKED" || selectedReportStudent?.batch?.status === "CLOSED" ? 
                        "Đợt khảo sát đã BỊ KHÓA. Giáo viên và GĐCS không thể điều chỉnh kết quả!" : 
                        "Bạn không có quyền xét duyệt kết quả cho cơ sở này."}
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
                      <option value="Không đạt - Kiểm tra lại">Không đạt - Kiểm tra lại</option>
                      <option value="Không đạt - Không kiểm tra lại">Không đạt - Không kiểm tra lại</option>
                      <option value="Đạt cam kết">Đạt cam kết</option>
                      <option value="Học thử">Học thử</option>
                    </select>
                  </Field>

                  {reportForm.admissionResult === "Đạt cam kết" && (
                    <Field label="Môn Cam Kết">
                      <div className="grid grid-cols-2 gap-2 p-4 max-h-48 overflow-y-auto text-xs font-semibold">
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

                  {reportForm.admissionResult === "Không đạt - Kiểm tra lại" && (
                    <Field label="Môn Kiểm tra lại">
                      <div className="grid grid-cols-2 gap-2 p-4 max-h-48 overflow-y-auto text-xs font-semibold">
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
                      

                      <Field label="Người duyệt / Phê duyệt">
                        {selectedReportStudent.admissionResult ? (
                          <div className="text-sm font-black text-slate-700 flex items-center gap-2.5 shadow-sm select-none transition-all text-xs font-semibold">
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
                    className="w-full hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-100 disabled:opacity-50 transition-all flex justify-center items-center gap-2 text-xs font-semibold"
                  >
                    {saveReportLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
                    Lưu kết quả tổng hợp
                  </button>

                  {!selectedReportStudent.admissionResult && (
                    <button
                      onClick={handleSendGdcsApprovalRequest}
                      disabled={sendingApproval || !canApprove}
                      className="w-full mt-3 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-100 hover:shadow-orange-200 active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all flex justify-center items-center gap-2"
                    >
                      {sendingApproval ? <Loader2 className="w-4 h-4 animate-spin"/> : <Mail className="w-4 h-4"/>}
                      Gửi yêu cầu Phê duyệt đến GĐCS
                    </button>
                  )}
                </div>

                {/* RETEST HISTORY TIMELINE CARD */}
                {Array.isArray(retestHistory) && retestHistory.length > 1 && (
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 animate-fade-in text-left">
                    <h4 className="font-black text-slate-800 text-sm flex items-center justify-between border-b pb-3 mb-2">
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin-slow shrink-0" />
                        Lịch sử Khảo sát & Thi lại
                      </span>
                      <span className="text-[10px] font-black text-indigo-700 shrink-0 shadow-sm text-xs font-semibold">
                        {retestHistory.length} Đợt thi
                      </span>
                    </h4>
                    
                    <div className="relative pl-4 border-l-2 border-slate-100 space-y-5 my-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                      {retestHistory.filter(Boolean).map((hist, idx) => {
                        const isCurrent = selectedReportStudent && hist?.id === selectedReportStudent.id;
                        let sNote = hist?.directorNote || "";
                        let retestMuns = [];
                        const matchRetest = sNote.match(/^Môn (?:kiểm tra lại|cam kết): \[(.*?)\](?:\r?\n\r?\n)?/);
                        if (matchRetest && matchRetest[1]) {
                          retestMuns = matchRetest[1].split(", ");
                          sNote = sNote.replace(/^Môn (?:kiểm tra lại|cam kết): \[(.*?)\](?:\r?\n\r?\n)?/, "");
                        }

                        const parsedScores = Array.isArray(hist?.scores) ? hist.scores : [];

                        return (
                          <div key={hist?.id || idx} className="relative group text-left">
                            {/* Timeline node dot */}
                            <span className={`absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2 ${
                              isCurrent ? "bg-indigo-600 border-indigo-200 scale-125 ring-4 ring-indigo-50 animate-pulse" : "bg-slate-300 border-white group-hover:bg-indigo-400 group-hover:scale-110 transition-all duration-300"
                            }`} />
                            
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className={`text-xs font-black truncate max-w-[150px] ${
                                  isCurrent ? "text-indigo-700" : "text-slate-600 font-bold"
                                }`} title={hist?.period?.name}>
                                  {hist?.period?.name || "Đợt khảo sát"}
                                </span>
                                <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                                  isCurrent ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-slate-50 text-slate-500 border-slate-200"
                                }`}>
                                  {isCurrent ? "Hiện tại" : `Đợt ${retestHistory.length - idx}`}
                                </span>
                              </div>
                              
                              <p className="text-[10px] text-slate-400 font-bold leading-none">
                                {hist?.batch?.name ? hist.batch.name.split("|")[0]?.trim() : "Khảo sát lẻ"} • {hist?.createdAt ? new Date(hist.createdAt).toLocaleDateString("vi-VN") : "—"}
                              </p>

                              {/* Attempt Result Badge */}
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[9px] font-bold text-slate-400">Kết quả:</span>
                                {hist?.admissionResult ? (
                                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                    String(hist.admissionResult).includes("Không đạt")
                                      ? "bg-rose-50 text-rose-700"
                                      : String(hist.admissionResult).includes("Đạt cam kết")
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-emerald-50 text-emerald-700"
                                  }`}>
                                    {hist.admissionResult}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-black text-slate-450 text-xs font-semibold">Chưa duyệt</span>
                                )}
                              </div>

                              {/* Retest subjects warning */}
                              {retestMuns.length > 0 && (
                                <div className="text-[10px] p-2.5 mt-1.5 space-y-1.5 text-xs font-semibold">
                                  <span className="font-black text-indigo-600 uppercase tracking-wider text-[8px] block">Môn cần thi lại/cam kết:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {retestMuns.map(m => (
                                      <span key={m} className="text-white text-[8px] font-black shadow-sm text-xs font-semibold">
                                        {m}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Brief scores list from past attempt */}
                              {!isCurrent && (parsedScores.length > 0 || hist.psychologyScore != null || hist.mathScore != null || hist.literatureScore != null || hist.writtenEnglishScore != null || hist.oralEnglishScore != null) && (
                                <div className="text-[10px] p-2.5 mt-1.5 space-y-1.5 text-xs font-semibold">
                                  <span className="font-black text-slate-400 uppercase tracking-wider text-[8px] block">Bảng điểm đợt thi cũ:</span>
                                  <div className="grid grid-cols-2 gap-x-2.5 gap-y-1 text-[9px] font-bold text-slate-600">
                                    {hist.psychologyScore != null && <div><span className="text-slate-400 font-normal">Tâm lý:</span> {hist.psychologyScore}đ</div>}
                                    {hist.mathScore != null && <div><span className="text-slate-400 font-normal">Toán:</span> {hist.mathScore}đ</div>}
                                    {hist.literatureScore != null && <div><span className="text-slate-400 font-normal">Ngữ Văn:</span> {hist.literatureScore}đ</div>}
                                    {hist.writtenEnglishScore != null && <div><span className="text-slate-400 font-normal">Anh (viết):</span> {hist.writtenEnglishScore}{hist?.grade?.match(/\d+/)?.[0] === '1' ? '' : '/70'}đ</div>}
                                    {hist.oralEnglishScore != null && <div><span className="text-slate-400 font-normal">Anh (nói):</span> {hist.oralEnglishScore}{hist?.grade?.match(/\d+/)?.[0] === '1' ? '' : '/30'}đ</div>}
                                    {parsedScores.filter(Boolean).map((sc, sIdx) => {
                                      const sub = sc?.subject || {};
                                      const subCode = (sub?.code || "").toLowerCase();
                                      let vStr = "—";
                                      try {
                                        if (sc?.scores) {
                                          const parsed = JSON.parse(sc.scores);
                                          const vArr = Array.isArray(parsed) ? parsed : [parsed];
                                          if (subCode.includes("tly")) {
                                              vStr = parseFloat(vArr[6] || vArr[20] || "0") + "đ";
                                            } else if (subCode.includes("nltd")) {
                                              const pctVal = vArr.length >= 5 ? vArr[4] : vArr[0];
                                              vStr = pctVal !== undefined && pctVal !== null && pctVal !== "" ? pctVal + "%" : "—";
                                          } else if (subCode.includes("tci") || subCode.includes("cpt")) {
                                            vStr = Array.isArray(vArr) ? vArr.filter(x => x === "3").length + " Đạt" : "—";
                                          } else {
                                            vStr = vArr.find(x => x !== undefined && x !== "" && x !== null) || "—";
                                          }
                                        }
                                      } catch {}
                                      return (
                                        <div key={sc?.id || sIdx} className="flex justify-between items-center border-b border-slate-200/20 pb-0.5">
                                          <span className="text-slate-400 font-semibold truncate max-w-[80px]" title={sub?.name}>{sub?.name || "Môn"}</span>
                                          <span className="font-black text-slate-700">{vStr}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              
                              {/* Past notes */}
                              {!isCurrent && sNote && (
                                <p className="text-[10px] text-slate-500 italic mt-1 font-semibold bg-slate-100/50 p-2.5 rounded-2xl border border-slate-200/50 leading-relaxed">
                                  "{sNote.trim()}"
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* REGISTER RETEST CARD REMOVED */}
              </div>
              {/* SUBJECTS RESULTS DISPLAY */}
              <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between bg-white px-6 py-4 rounded-3xl border border-slate-200/80 shadow-sm text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center text-indigo-600 shadow-inner shrink-0 select-none text-xs font-semibold">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-base leading-snug">Kết quả khảo sát các môn</h3>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">Chi tiết nhận định năng lực và đánh giá chuyên môn</p>
                    </div>
                  </div>
                  <span className="text-xs text-indigo-700 font-black shadow-sm shrink-0 text-xs font-semibold">
                    {(selectedReportStudent.scores || []).length} Môn đã chấm
                  </span>
                </div>

                {(!selectedReportStudent.scores || selectedReportStudent.scores.length === 0) ? (
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-16 text-center text-slate-450 shadow-sm flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 flex items-center justify-center text-slate-400 shadow-inner text-xs font-semibold">
                      <BookOpen className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="font-black text-slate-700 text-sm">Chưa có kết quả khảo sát</p>
                      <p className="text-xs text-slate-400 font-semibold mt-1">Học sinh này chưa có kết quả đánh giá môn học nào từ giáo viên.</p>
                    </div>
                  </div>
                ) : (
                                    <div className="space-y-6">
                    {(() => {
                      const scoresList = [...(selectedReportStudent.scores || [])];
                      
                      const getNumericGrade = (g) => {
                        if (!g) return null;
                        const match = g.toString().match(/\d+/);
                        return match ? parseInt(match[0], 10) : null;
                      };
                      const isGrade1 = getNumericGrade(selectedReportStudent.grade) === 1;
                      
                      const hasEnglish = scoresList.some((sc) => {
                        const sName = (sc.subject?.name || "").toLowerCase().normalize("NFC");
                        const sCode = (sc.subject?.code || "").toLowerCase();
                        return sName.includes("tiếng anh") || sCode.includes("eng") || sCode.includes("esl");
                      });
                      
                      let oralScoreVal = null;
                      let writtenScoreVal = null;
                      let oralScoreText = "—";
                      let writtenScoreText = "—";
                      
                      if (!isGrade1 && hasEnglish) {
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
                            
                            if (sName.includes("vấn đáp") || sName.includes("nói") || sCode.includes("speaking") || sCode.includes("oral") || sCode.includes("vd")) {
                              if (scoreVal !== undefined && scoreVal !== null && scoreVal !== "") {
                                oralScoreVal = parseFloat(scoreVal);
                                oralScoreText = scoreVal.toString();
                              }
                            } else if (sName.includes("viết") || sCode.includes("writing") || sCode.includes("written") || sCode.includes("vt")) {
                              if (scoreVal !== undefined && scoreVal !== null && scoreVal !== "") {
                                writtenScoreVal = parseFloat(scoreVal);
                                writtenScoreText = scoreVal.toString();
                              }
                            }
                          }
                        });
                        
                        let totalVal = "—";
                        if (oralScoreVal !== null || writtenScoreVal !== null) {
                          totalVal = ((oralScoreVal || 0) + (writtenScoreVal || 0)).toString();
                        }
                        
                        if (!scoresList.some(s => s.id === "tong_diem_tieng_anh")) {
                          scoresList.push({
                            id: "tong_diem_tieng_anh",
                            isVirtual: true,
                            scores: JSON.stringify([totalVal]),
                            subject: {
                              id: "tong_diem_tieng_anh",
                              code: "eng_total",
                              name: "Tổng điểm Tiếng Anh",
                              subjectType: "VIET_NAM",
                              scoreColumns: 1,
                              commentColumns: 0,
                              columnNames: JSON.stringify({ scores: ["Tổng điểm Tiếng Anh"], comments: [] })
                            }
                          });
                        }
                      }
                      
                      return (
                        <>
                          {/* PREMIUM QUICK SCORE DASHBOARD MATRIX */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {scoresList.map((sc) => {
                              const subject = sc.subject || {};
                              const sName = subject.name || "Môn học";
                              const sCode = (subject.code || "").toLowerCase();
                              let val = "—";
                              let rawScore = "";
                              let badgeStyle = "bg-slate-50 text-slate-600 border-slate-200";

                              try {
                                if (sc.scores) {
                                  const parsed = JSON.parse(sc.scores);
                                  const vArr = Array.isArray(parsed) ? parsed : [parsed];
                                  if (sCode.includes("tly")) {
                                    const scNum = parseFloat(vArr[6] || vArr[20] || "0");
                                    rawScore = scNum.toString();
                                    let lvl = "Bình thường";
                                    badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200/50";
                                    if (scNum > 15 && scNum <= 31) {
                                      lvl = "Dấu hiệu nhẹ";
                                      badgeStyle = "bg-blue-50 text-blue-700 border-blue-200/50";
                                    } else if (scNum > 31 && scNum <= 47) {
                                      lvl = "Dấu hiệu vừa";
                                      badgeStyle = "bg-amber-50 text-amber-700 border-amber-200/50";
                                    } else if (scNum > 47 && scNum <= 63) {
                                      lvl = "Nguy cơ cao";
                                      badgeStyle = "bg-orange-50 text-orange-700 border-orange-200/50";
                                    } else if (scNum > 63) {
                                      lvl = "Nguy cơ rất cao";
                                      badgeStyle = "bg-rose-50 text-rose-700 border-rose-200/50";
                                    }
                                    val = lvl;
                                  } else if (sCode.includes("tci") || sCode.includes("cpt")) {
                                    const passedCount = vArr.filter(x => x === "3").length;
                                    val = passedCount + "/" + vArr.length + " Đạt";
                                    badgeStyle = passedCount >= vArr.length * 0.7 ? "bg-emerald-50 text-emerald-700 border-emerald-200/50" : "bg-amber-50 text-amber-700 border-amber-200/50";
                                  } else if (sCode.includes("nltd")) {
                                    const pctVal = vArr.length >= 5 ? vArr[4] : vArr[0];
                                    if (pctVal !== undefined && pctVal !== null && pctVal !== "") {
                                      val = pctVal + "%";
                                      const pct = parseFloat(pctVal || "0");
                                      badgeStyle = pct >= 80 ? "bg-indigo-50 text-indigo-700 border-indigo-200/50" : pct >= 50 ? "bg-blue-50 text-blue-700 border-blue-200/50" : "bg-rose-50 text-rose-700 border-rose-200/50";
                                    } else {
                                      val = "—";
                                      badgeStyle = "bg-slate-100 text-slate-600 border-slate-200";
                                    }
                                  } else {
                                    const firstVal = vArr.find(x => x !== undefined && x !== "" && x !== null);
                                    val = firstVal !== undefined ? firstVal.toString() : "—";
                                    badgeStyle = "bg-indigo-50 text-indigo-700 border-indigo-200/50";
                                    
                                    if (!isGrade1) {
                                      const sNameLower = sName.toLowerCase().normalize("NFC");
                                      if (sNameLower.includes("tiếng anh") || sCode.includes("eng") || sCode.includes("esl")) {
                                        if (sNameLower.includes("vấn đáp") || sNameLower.includes("nói") || sCode.includes("speaking") || sCode.includes("oral") || sCode.includes("vd")) {
                                          val = firstVal !== undefined ? `${firstVal}/30` : "—/30";
                                        } else if (sNameLower.includes("viết") || sCode.includes("writing") || sCode.includes("written") || sCode.includes("vt")) {
                                          val = firstVal !== undefined ? `${firstVal}/70` : "—/70";
                                        } else if (sc.id === "tong_diem_tieng_anh") {
                                          val = firstVal !== undefined && firstVal !== "—" ? `${firstVal}/100` : "—/100";
                                        }
                                      }
                                    }
                                  }
                                }
                              } catch {
                                val = sc.scores || "—";
                                badgeStyle = "bg-indigo-50 text-indigo-700 border-indigo-200/50";
                              }

                              const sNameLower = sName.toLowerCase().normalize("NFC");
                              const isEnglish = sNameLower.includes("tiếng anh") || sCode.includes("eng") || sCode.includes("esl") || sc.id === "tong_diem_tieng_anh";
                              const isNLTD = sNameLower.includes("năng lực tư duy") || sCode.includes("nltd");
                              const isToan = sNameLower.includes("toán") || sCode.includes("math") || sCode.includes("mth");
                              const isTiengVietNguVan = sNameLower.includes("tiếng việt") || sNameLower.includes("ngữ văn") || sCode.includes("lit") || sCode.includes("vie") || sCode.includes("van");

                              const isActive = activeSubjectId === sc.id;
                              let activeClasses = "";
                              let textLabelClass = "";
                              let textValClass = "";
                              let badgeClass = "";

                              if (isEnglish || isNLTD) {
                                activeClasses = isActive 
                                  ? "border-violet-600 bg-violet-600 text-white shadow-[0_4px_12px_rgba(124,58,237,0.2)] -translate-y-0.5" 
                                  : "border-violet-200 bg-violet-50/50 text-violet-900 hover:bg-violet-100/60 hover:border-violet-300 hover:-translate-y-0.5";
                                textLabelClass = isActive ? "text-violet-100" : "text-violet-500 font-bold";
                                textValClass = isActive ? "text-white" : "text-violet-900";
                                badgeClass = isActive 
                                  ? "bg-white/20 text-white border-white/20" 
                                  : (badgeStyle.replace("bg-indigo-50", "bg-violet-100/50").replace("text-indigo-700", "text-violet-700").replace("border-indigo-200", "border-violet-200"));
                              } else if (isToan || isTiengVietNguVan) {
                                activeClasses = isActive 
                                  ? "border-[#00A99D] bg-[#00A99D] text-white shadow-[0_4px_12px_rgba(0,161,154,0.2)] -translate-y-0.5" 
                                  : "border-[#00A99D]/20 bg-[#00A99D]/5 text-[#009085] hover:bg-[#00A99D]/10 hover:border-[#00A99D]/40 hover:-translate-y-0.5";
                                textLabelClass = isActive ? "text-teal-100" : "text-[#00A99D] font-bold";
                                textValClass = isActive ? "text-white" : "text-[#009085]";
                                badgeClass = isActive 
                                  ? "bg-white/20 text-white border-white/20" 
                                  : "bg-[#00A99D]/10 text-[#009085] border-[#00A99D]/20";
                              } else {
                                activeClasses = isActive 
                                  ? "border-[#00A99D] bg-[#00A99D]/5 shadow-[0_2px_8px_rgba(0,161,154,0.08)] -translate-y-0.5" 
                                  : "border-slate-200 bg-white hover:border-[#00A99D]/40 hover:-translate-y-0.5";
                                textLabelClass = isActive ? "text-[#00A99D]" : "text-slate-400";
                                textValClass = isActive ? "text-[#00A99D]" : "text-slate-800";
                                badgeClass = isActive ? "bg-[#00A99D] text-white border-[#00A99D]" : badgeStyle;
                              }

                              return (
                                <div 
                                  key={sc.id} 
                                  onClick={() => setActiveSubjectId(sc.id)}
                                  className={`rounded-3xl border p-5 shadow-sm transition-all duration-300 flex flex-col justify-between relative overflow-hidden group text-left cursor-pointer ${activeClasses}`}
                                >
                                  <div className="absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 mix-blend-multiply filter blur-xl opacity-60 group-hover:scale-110 transition-transform duration-300 text-xs font-semibold"></div>
                                  
                                  <div className="flex justify-between items-start mb-4 z-10">
                                    <span className={`text-[10px] font-black uppercase tracking-wider block shrink-0 max-w-[120px] truncate ${textLabelClass}`} title={sName}>
                                      {sName}
                                    </span>
                                    {subject.subjectType === "VIET_NAM" && sc.id !== "tong_diem_tieng_anh" && (
                                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border shrink-0 ${isActive ? "bg-white/20 text-white border-white/20" : "bg-[#00A99D]/5 text-[#00A99D] border-[#00A99D]/20"}`}>
                                        GV Việt Nam
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-end justify-between z-10 mt-auto">
                                    <div className={`font-black tracking-tight leading-none ${sCode.includes("tly") ? "text-sm" : "text-xl"} ${textValClass}`}>
                                      {val}
                                    </div>
                                    <div className={`px-2 py-1 rounded-xl border font-black text-[9px] uppercase tracking-wider ${badgeClass} flex items-center gap-1.5 shadow-sm`}>
                                      {sCode.includes("tly") ? (
                                        <>
                                          <span className={`w-1.5 h-1.5 rounded-full bg-current animate-pulse`}></span>
                                          {rawScore}đ
                                        </>
                                      ) : (
                                        <>{sc.id === "tong_diem_tieng_anh" ? "Tổng điểm" : "Điểm số"}</>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* DETAILED CARDS SECTION */}
                          <div className="space-y-6">
                            {scoresList
                              .filter((sc) => sc.id === activeSubjectId)
                              .map((sc) => {
                                if (sc.id === "tong_diem_tieng_anh") {
                                  const totalVal = oralScoreVal !== null || writtenScoreVal !== null 
                                    ? ((oralScoreVal || 0) + (writtenScoreVal || 0)).toString() 
                                    : "—";
                                    
                                  return (
                                    <div key={sc.id} className="p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden text-left text-xs font-semibold">
                                      <div className="absolute top-0 left-0 w-1.5 h-full bg-violet-600"></div>
                                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
                                        <div>
                                          <h4 className="font-black text-violet-900 text-lg leading-none">Tổng điểm Tiếng Anh</h4>
                                          <p className="text-xs text-slate-400 font-semibold mt-2.5">
                                            Tổng hợp kết quả môn Tiếng Anh (Vấn đáp + Viết)
                                          </p>
                                        </div>
                                      </div>
                                      <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                                          <div className="text-center shadow-sm flex flex-col justify-between text-slate-600 text-xs font-semibold">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate block leading-tight">Tiếng Anh (Vấn đáp)</span>
                                            <div className="text-xl font-black mt-2 leading-none text-slate-800">
                                              {oralScoreText !== "—" ? `${oralScoreText}/30` : "—/30"}
                                            </div>
                                          </div>
                                          <div className="text-center shadow-sm flex flex-col justify-between text-slate-600 text-xs font-semibold">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate block leading-tight">Tiếng Anh (Viết)</span>
                                            <div className="text-xl font-black mt-2 leading-none text-slate-800">
                                              {writtenScoreText !== "—" ? `${writtenScoreText}/70` : "—/70"}
                                            </div>
                                          </div>
                                          <div className="text-center shadow-sm flex flex-col justify-between text-indigo-700 text-xs font-semibold">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate block leading-tight">Tổng điểm</span>
                                            <div className="text-xl font-black mt-2 leading-none text-indigo-700">
                                              {totalVal !== "—" ? `${totalVal}/100` : "—/100"}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                const subject = sc.subject || {};
                                const subName = (subject.name || "").toLowerCase();
                                const subCode = (subject.code || "").toLowerCase();
                                const subNameNormalized = subName.normalize("NFC");
                                const isPsych = subName.includes("tâm lý") || subCode.includes("tly");
                                const isChildDev = subNameNormalized.includes("chuẩn phát triển") || subNameNormalized.includes("bộ chuẩn phát triển") || subCode.includes("cpt") || subCode.includes("tci");
                                // Only use ThinkingSkillsForm UI when data has 5 criteria (Logic, Liên tưởng, Phản biện, Giải quyết VĐ, % hoàn thành)
                                const _nltdScoreArr = (() => { try { if (sc.scores) { const _p = JSON.parse(sc.scores); return Array.isArray(_p) ? _p : [_p]; } } catch {} return []; })();
                                const isThinkingSkills = (subNameNormalized.includes("năng lực tư duy") || subCode.includes("nltd")) && isGrade1 && _nltdScoreArr.length >= 5;

                                const isEnglish = subName.includes("tiếng anh") || subCode.includes("eng") || subCode.includes("esl");
                                const isToan = subName.includes("toán") || subCode.includes("math") || subCode.includes("mth");
                                const isTiengVietNguVan = subName.includes("tiếng việt") || subName.includes("ngữ văn") || subCode.includes("lit") || subCode.includes("vie") || subCode.includes("van");

                                let detailCardClass = "bg-white border border-slate-200";
                                let accentBarClass = "bg-[#00A99D]";
                                let headerTextClass = "text-slate-800";

                                if (isEnglish || isThinkingSkills) {
                                  detailCardClass = "bg-violet-50/20 border-violet-200";
                                  accentBarClass = "bg-violet-600";
                                  headerTextClass = "text-violet-900";
                                } else if (isToan || isTiengVietNguVan) {
                                  detailCardClass = "bg-[#00A99D]/5 border-[#00A99D]/20";
                                  accentBarClass = "bg-[#00A99D]";
                                  headerTextClass = "text-[#009085]";
                                }

                                let scoreVals = [];
                                let commentVals = [];
                                try { if (sc.scores) { const parsed = JSON.parse(sc.scores); scoreVals = Array.isArray(parsed) ? parsed : [parsed]; } } catch { scoreVals = [sc.scores]; }
                                try { if (sc.comments) { const parsed = JSON.parse(sc.comments); commentVals = Array.isArray(parsed) ? parsed : [parsed]; } } catch { commentVals = [sc.comments]; }

                                let parsedCols = { scores: [], comments: [] };
                                try { if (subject.columnNames) { const parsed = JSON.parse(subject.columnNames); parsedCols = { scores: Array.isArray(parsed.scores) ? parsed.scores : [], comments: Array.isArray(parsed.comments) ? parsed.comments : [] }; } } catch {}

                                return (
                                  <div key={sc.id} className={`${detailCardClass} rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden text-left`}>
                                    
                                    {/* Card Decorative Accent bar */}
                                    <div className={`absolute top-0 left-0 w-1.5 h-full ${accentBarClass}`}></div>

                                    {/* Card Header */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
                                      <div>
                                        <div className="flex items-center gap-2.5">
                                          <h4 className="font-black text-slate-800 text-lg leading-none">{subject.name}</h4>
                                          {subject.code && <span className="font-mono text-[10px] font-black text-slate-400 select-none text-xs font-semibold">{subject.code}</span>}
                                          {subject.subjectType === "VIET_NAM" && (
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border shadow-sm bg-[#00A99D]/5 text-[#00A99D] border-[#00A99D]/20`}>
                                              Giáo viên Việt Nam
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold mt-2.5">
                                          <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-[9px] border shadow-inner select-none shrink-0">
                                            {sc.teacherName?.charAt(0) || "—"}
                                          </div>
                                          <span>Giáo viên chấm: <strong className="text-slate-600 font-bold">{sc.teacherName || "Chưa xác định"}</strong></span>
                                          <span className="text-slate-200">•</span>
                                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> Cập nhật: {new Date(sc.updatedAt).toLocaleDateString("vi-VN")}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Card Content depending on Subject Type */}
                                    {isPsych ? (
                                      <div className="space-y-5">
                                        {/* Visual Diagnostic Psychology Score Scale */}
                                        {(() => {
                                          const score = parseFloat(scoreVals[6] || scoreVals[20] || "0");
                                          
                                          const levels = [
                                            { name: "Bình thường", min: 0, max: 15, bg: "bg-emerald-50 text-emerald-700 border-emerald-100", activeBg: "bg-emerald-500", scaleBg: "bg-emerald-100" },
                                            { name: "Dấu hiệu nhẹ", min: 16, max: 31, bg: "bg-blue-50 text-blue-700 border-blue-100", activeBg: "bg-blue-500", scaleBg: "bg-blue-100" },
                                            { name: "Dấu hiệu vừa", min: 32, max: 47, bg: "bg-amber-50 text-amber-700 border-amber-100", activeBg: "bg-amber-500", scaleBg: "bg-amber-100" },
                                            { name: "Nguy cơ cao", min: 48, max: 63, bg: "bg-orange-50 text-orange-700 border-orange-100", activeBg: "bg-orange-500", scaleBg: "bg-orange-100" },
                                            { name: "Nguy cơ rất cao", min: 64, max: 80, bg: "bg-rose-50 text-rose-700 border-rose-100", activeBg: "bg-rose-500", scaleBg: "bg-rose-100" }
                                          ];
                                          
                                          const activeLvl = levels.find(l => score >= l.min && score <= l.max) || levels[0];
                                          
                                          return (
                                            <div className="space-y-4">
                                              {/* Diagnosis Badge Box */}
                                              <div className="flex items-center justify-between p-4 shadow-inner text-xs font-semibold">
                                                <div>
                                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tổng điểm đánh giá</span>
                                                  <div className="text-2xl font-black text-indigo-700 mt-1">{score} Điểm</div>
                                                </div>
                                                <div className={`px-4 py-2.5 rounded-2xl border font-black text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 ${activeLvl.bg}`}>
                                                  <span className={`w-2 h-2 rounded-full ${activeLvl.activeBg} animate-pulse`}></span>
                                                  Chẩn đoán: {activeLvl.name}
                                                </div>
                                              </div>

                                              {/* Interactive Diagnostic Gauge Scale */}
                                              <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-455">Thang đo chẩn đoán lâm sàng</span>
                                                  <span className="text-[10px] font-bold text-slate-400">Điểm tối đa: 80</span>
                                                </div>
                                                <div className="grid grid-cols-5 gap-1.5">
                                                  {levels.map(l => {
                                                    const isActive = activeLvl.name === l.name;
                                                    return (
                                                      <div key={l.name} className="space-y-1">
                                                        <div className={`h-2.5 rounded-full ${isActive ? l.activeBg : l.scaleBg} transition-all duration-500 ${isActive ? "shadow-md shadow-indigo-100 scale-y-110" : ""}`}></div>
                                                        <div className="text-center">
                                                          <span className={`text-[8px] leading-tight font-black block truncate ${isActive ? "text-slate-800 font-bold scale-[1.02]" : "text-slate-400"}`}>
                                                            {l.name}
                                                          </span>
                                                          <span className="text-[7px] text-slate-355 font-semibold block mt-0.5">{l.min}-{l.max}</span>
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })()}

                                        {/* Comments / Recommendations */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                                          <div className="space-y-1.5 p-4 text-xs font-semibold">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-455 flex items-center gap-1.5">
                                              <span className="w-1.5 h-1.5 text-xs font-semibold"></span>
                                              Kết luận sơ bộ từ chuyên viên
                                            </span>
                                            <p className={`text-sm font-medium leading-relaxed whitespace-pre-wrap ${commentVals[0] ? "text-slate-700" : "text-slate-450 italic"}`}>
                                              {commentVals[0] ? `"${commentVals[0]}"` : "Chưa cập nhật nội dung nhận định chi tiết."}
                                            </p>
                                          </div>
                                          
                                          <div className="space-y-1.5 p-4 text-xs font-semibold">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-1.5">
                                              <Info className="w-3.5 h-3.5 text-amber-500" />
                                              Khuyến nghị dành cho phụ huynh
                                            </span>
                                            <p className={`text-sm font-medium leading-relaxed whitespace-pre-wrap ${commentVals[1] ? "text-amber-800" : "text-slate-400 italic"}`}>
                                              {commentVals[1] ? `"${commentVals[1]}"` : "Chưa có khuyến nghị cụ thể từ chuyên viên."}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    ) : isChildDev ? (
                                      <div className="space-y-5">
                                        {/* Segmented Metrics Row */}
                                        <div className="grid grid-cols-3 gap-3">
                                          <div className="p-3.5 text-center shadow-inner text-xs font-semibold">
                                            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600 flex items-center justify-center gap-1"><Check className="w-3.5 h-3.5"/> Đạt</div>
                                            <div className="text-2xl font-black text-emerald-700 mt-1">{(Array.isArray(scoreVals) ? scoreVals : []).filter(v => v === "3").length}</div>
                                          </div>
                                          <div className="p-3.5 text-center shadow-inner text-xs font-semibold">
                                            <div className="text-[10px] font-black uppercase tracking-wider text-rose-600 flex items-center justify-center gap-1"><AlertCircle className="w-3.5 h-3.5"/> Không đạt</div>
                                            <div className="text-2xl font-black text-rose-700 mt-1">{(Array.isArray(scoreVals) ? scoreVals : []).filter(v => v === "2").length}</div>
                                          </div>
                                          <div className="p-3.5 text-center shadow-inner text-xs font-semibold">
                                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-center gap-1"><Info className="w-3.5 h-3.5"/> Không làm</div>
                                            <div className="text-2xl font-black text-slate-600 mt-1">{(Array.isArray(scoreVals) ? scoreVals : []).filter(v => v === "1").length}</div>
                                          </div>
                                        </div>

                                        {/* Chi tiết tiêu chí không đạt hoặc không làm */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                                          {scoreVals.some(v => v === "2") ? (
                                            <div className="p-4 text-xs font-semibold">
                                              <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-3 block flex items-center gap-1.5"><AlertCircle className="w-4 h-4 text-rose-500"/> Chi tiết tiêu chí Không đạt</span>
                                              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                                                {scoreVals.map((v, idx) => v === "2" ? (
                                                  <div key={idx} className="flex items-start gap-2.5 text-xs font-bold text-rose-800 leading-normal bg-white border border-rose-100/50 p-2.5 rounded-xl shadow-sm">
                                                    <span className="mt-1.5 w-1.5 h-1.5 shrink-0 text-xs font-semibold"></span>
                                                    <span className="font-medium text-slate-700">
                                                      {parsedCols.scores[idx] || [
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
                                                      ][idx] || `Tiêu chí ${idx + 1}`}
                                                    </span>
                                                  </div>
                                                ) : null)}
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="p-5 text-center flex flex-col justify-center items-center gap-2 text-xs font-semibold">
                                              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                              <p className="text-xs font-black text-emerald-800 uppercase tracking-wider">Hoàn thành tốt!</p>
                                              <p className="text-xs text-slate-555 font-semibold">Học sinh hoàn thành xuất sắc, không có tiêu chí nào Không Đạt.</p>
                                            </div>
                                          )}

                                          {scoreVals.some(v => v === "1") && (
                                            <div className="bg-slate-55 border border-slate-200 rounded-2xl p-4">
                                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block flex items-center gap-1.5"><Info className="w-4 h-4 text-slate-400"/> Chi tiết tiêu chí Không làm</span>
                                              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                                                {scoreVals.map((v, idx) => v === "1" ? (
                                                  <div key={idx} className="flex items-start gap-2.5 text-xs font-bold text-slate-750 leading-normal bg-white border border-slate-200/65 p-2.5 rounded-xl shadow-sm">
                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                                                    <span className="font-medium text-slate-555">
                                                      {parsedCols.scores[idx] || [
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
                                                      ][idx] || `Tiêu chí ${idx + 1}`}
                                                    </span>
                                                  </div>
                                                ) : null)}
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {commentVals[0] && (
                                          <div className="p-4 relative text-left text-xs font-semibold">
                                            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-455 mb-1.5">Nhận xét tổng quan từ giáo viên</span>
                                            <p className="text-sm font-semibold text-slate-700 italic leading-relaxed">"{commentVals[0]}"</p>
                                          </div>
                                        )}
                                      </div>
                                    ) : isThinkingSkills ? (
                                      <div className="space-y-5">
                                        {/* Gorgeous Thinking Skills Progress Matrix */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                          {[
                                            { label: "Năng lực Logic", val: scoreVals[0], color: "text-indigo-600 bg-indigo-50 border-indigo-100", barColor: "bg-indigo-500" },
                                            { label: "Năng lực Lập tưởng", val: scoreVals[1], color: "text-violet-600 bg-violet-50 border-violet-100", barColor: "bg-violet-500" },
                                            { label: "Năng lực Phản biện", val: scoreVals[2], color: "text-cyan-600 bg-cyan-50 border-cyan-100", barColor: "bg-cyan-500" },
                                            { label: "Giải quyết Vấn đề", val: scoreVals[3], color: "text-teal-600 bg-teal-50 border-teal-100", barColor: "bg-teal-500" }
                                          ].map(item => {
                                            let pctVal = 0;
                                            if (item.val) {
                                              const textVal = item.val.toString();
                                              if (textVal.includes("/")) {
                                                const [n, d] = textVal.split("/").map(Number);
                                                if (d > 0) pctVal = (n / d) * 100;
                                              } else if (textVal.includes("%")) {
                                                pctVal = parseFloat(textVal);
                                              } else {
                                                const parsed = parseFloat(textVal);
                                                if (!isNaN(parsed)) pctVal = parsed <= 10 ? parsed * 10 : parsed;
                                              }
                                            }
                                            
                                            return (
                                              <div key={item.label} className={`border rounded-2xl p-3.5 text-center flex flex-col justify-between shadow-sm relative overflow-hidden group ${item.color}`}>
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-555 block leading-tight">{item.label}</span>
                                                <div className="text-lg font-black text-slate-800 mt-2 mb-2 leading-none">{item.val || "—"}</div>
                                                
                                                {/* Micro Progress Bar */}
                                                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-auto">
                                                  <div className={`h-1.5 rounded-full ${item.barColor}`} style={{ width: `${Math.min(pctVal || 0, 100)}%` }}></div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>

                                        {/* Premium overall challenge completion indicator */}
                                        <div className="bg-gradient-to-r from-indigo-50 to-violet-50/50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between shadow-sm text-left">
                                          <div className="flex items-center gap-2">
                                            <div className="p-2.5 text-white shadow-md shadow-indigo-100 shrink-0 text-xs font-semibold">
                                              <BarChart3 className="w-4 h-4"/>
                                            </div>
                                            <div>
                                              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-555">Tỷ lệ hoàn thành thử thách</span>
                                              <p className="text-xs text-slate-555 font-bold mt-0.5">Mức độ hoàn thành các nhiệm vụ tư duy</p>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <span className="text-2xl font-black text-indigo-750">{scoreVals[4] || "0"}%</span>
                                            <div className="w-28 bg-slate-100 rounded-full h-2 mt-1 border border-slate-200/50 overflow-hidden shadow-inner shrink-0">
                                              <div className="h-2 bg-indigo-600 text-xs font-semibold" style={{ width: `${scoreVals[4] || 0}%` }}></div>
                                            </div>
                                          </div>
                                        </div>

                                        {commentVals[0] && (
                                          <div className="p-4 relative text-left text-xs font-semibold">
                                            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-455 mb-1.5">Nhận xét tổng quan</span>
                                            <p className="text-sm font-semibold text-slate-700 italic leading-relaxed">"{commentVals[0]}"</p>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="space-y-4">
                                        {/* Display standard scores columns in premium structured layout */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-left">
                                          {Array.from({length: (subject.scoreColumns ?? 1)}).map((_, colIdx) => {
                                            let colName = "Điểm " + (colIdx + 1);
                                            if (parsedCols.scores && parsedCols.scores[colIdx]) colName = parsedCols.scores[colIdx];
                                            else if (subCode.includes("nltd")) colName = "Kết quả";
                                            const isTotal = colName.toLowerCase().includes("tổng");
                                            const val = scoreVals[colIdx];
                                            
                                            let displayVal = val !== undefined && val !== "" && val !== null ? val : "—";
                                            if (subCode.includes("nltd")) {
                                              displayVal = val !== undefined && val !== "" && val !== null ? `${val}%` : "—%";
                                            } else if (!isGrade1) {
                                              const sNameLower = subName.toLowerCase().normalize("NFC");
                                              if (sNameLower.includes("tiếng anh") || subCode.includes("eng") || subCode.includes("esl")) {
                                                if (sNameLower.includes("vấn đáp") || sNameLower.includes("nói") || subCode.includes("speaking") || subCode.includes("oral") || subCode.includes("vd")) {
                                                  displayVal = val !== undefined && val !== "" && val !== null ? `${val}/30` : "—/30";
                                                } else if (sNameLower.includes("viết") || subCode.includes("writing") || subCode.includes("written") || subCode.includes("vt")) {
                                                  displayVal = val !== undefined && val !== "" && val !== null ? `${val}/70` : "—/70";
                                                }
                                              }
                                            }
                                            
                                            return (
                                              <div key={colIdx} className={`border rounded-2xl px-4 py-3 text-center shadow-sm flex flex-col justify-between ${isTotal ? "bg-indigo-50/50 border-indigo-150 text-indigo-700" : "bg-slate-50 border-slate-200/60 text-slate-600"}`}>
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate block leading-tight">{colName}</span>
                                                <div className={`text-xl font-black mt-2 leading-none ${isTotal ? "text-indigo-700" : "text-slate-800"}`}>
                                                  {displayVal}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>

                                        {/* Display standard comments comments columns */}
                                        {commentVals.length > 0 && commentVals.some(v => v) && (
                                          <div className="space-y-3 p-5 text-left text-xs font-semibold">
                                            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-455 mb-2">Ý kiến nhận xét từ Giáo viên bộ môn</span>
                                            <div className="space-y-3">
                                              {Array.from({length: (subject.commentColumns ?? 1)}).map((_, colIdx) => {
                                                let colName = "Nhận xét";
                                                if (parsedCols.comments && parsedCols.comments[colIdx]) colName = parsedCols.comments[colIdx];
                                                const val = commentVals[colIdx];
                                                if (!val) return null;

                                                return (
                                                  <div key={colIdx} className="bg-white p-3.5 rounded-2xl border-2 border-emerald-100/60 shadow-sm flex items-start gap-3 text-left">
                                                    <div className="w-7 h-7 flex items-center justify-center text-indigo-600 text-xs font-black select-none shrink-0 text-xs font-semibold">
                                                      {colName.charAt(0)}
                                                    </div>
                                                    <div className="flex-1">
                                                      <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 block mb-0.5">{colName}</span>
                                                      <p className="text-sm font-semibold text-slate-700 italic leading-relaxed">"{val}"</p>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                  </div>
                                );
                              })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

            </div>
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
                   className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition-all ${subjectForm.exemptCriteria.includes(c.name) ? 'bg-violet-500 text-white border-violet-500 shadow-md shadow-violet-200' : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'}`}
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

      <Modal open={bModal} onClose={()=>setBModal(false)} title="Thông tin Đợt khảo sát" size="md" footer={<><button onClick={()=>setBModal(false)} className="flex-1 py-3 text-xs font-black uppercase text-slate-400">Hủy</button> <button onClick={saveBatch} className="flex-1 px-6 py-3 bg-[#00A99D] hover:bg-[#0098C2] rounded-xl text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-50 text-xs font-semibold">{editB ? "Cập nhật đợt" : "Tạo đợt"}</button></>}>
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
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Hiển thị khoa học & Xét duyệt:</p>
                <p className="text-xs font-bold text-indigo-600 truncate">
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
        {isChuyenHe && !editS ? (
          <div className="space-y-6 pt-1 text-left animate-in fade-in duration-200">
            <div className="bg-white border border-[#D9E2EC] p-5 rounded-2xl space-y-4 shadow-sm">
              <div className="flex items-center gap-2 pb-2 border-b border-[#D9E2EC]/60">
                <span className="w-1.5 h-4 bg-[#004C97] inline-block rounded"></span>
                <h4 className="text-xs font-black text-[#1E293B] uppercase tracking-wider">Thông tin học sinh chuyển hệ</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Cơ sở" required>
                  <select
                    required
                    value={transferCampusId}
                    onChange={(e) => {
                      setTransferCampusId(e.target.value);
                      setTransferClassId("");
                      setTransferStudents([]);
                      setSelectedStudentIds([]);
                      setTargetSystem("");
                    }}
                    className={inp}
                  >
                    <option value="">-- Chọn Cơ sở --</option>
                    {campuses.map((c) => (
                      <option key={c.id} value={c.id}>{c.campusName}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Lớp học" required>
                  <select
                    required
                    disabled={!transferCampusId}
                    value={transferClassId}
                    onChange={(e) => {
                      setTransferClassId(e.target.value);
                      setTransferStudents([]);
                      setSelectedStudentIds([]);
                    }}
                    className={inp + " disabled:opacity-50"}
                  >
                    <option value="">-- Chọn Lớp học --</option>
                    {filteredClasses.map((c) => (
                      <option key={c.id} value={c.id}>{c.className}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Hệ đang học</label>
                  <input
                    type="text"
                    readOnly
                    value={selectedClassObj?.educationSystem || "Không xác định"}
                    className="h-10.5 w-full px-3.5 bg-slate-100 border border-[#D9E2EC] text-slate-500 text-sm font-semibold rounded-xl outline-none"
                  />
                </div>
                <Field label="Hệ chuyển" required>
                  <select
                    required
                    value={targetSystem}
                    onChange={(e) => setTargetSystem(e.target.value)}
                    className={inp}
                  >
                    <option value="">-- Chọn Hệ chuyển --</option>
                    {currentEduSystems.map((es) => (
                      <option key={es.code} value={es.code}>{es.code} - {es.name}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Student Checklist Selection */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider">Danh sách Học sinh *</label>
                <div className="border border-[#D9E2EC] rounded-2xl bg-white overflow-hidden shadow-sm">
                  <div className="p-3 bg-slate-50 border-b border-[#D9E2EC] flex justify-between items-center gap-4">
                    <input
                      type="text"
                      placeholder="Tìm nhanh học sinh..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-[#D9E2EC] rounded-lg text-xs font-semibold outline-none focus:border-[#00B5E2] max-w-xs w-full"
                    />
                    {transferStudents.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedStudentIds.length === transferStudents.length) {
                            setSelectedStudentIds([]);
                          } else {
                            setSelectedStudentIds(transferStudents.map(s => s.id));
                          }
                        }}
                        className="px-3 py-1.5 bg-[#E6F8FD] hover:bg-[#00B5E2]/25 text-[#004C97] border border-[#00B5E2]/30 rounded-lg text-[11px] font-bold transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                      >
                        {selectedStudentIds.length === transferStudents.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-[220px] overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {transferStudentsLoading ? (
                      <div className="py-6 flex justify-center items-center text-slate-400 text-xs font-semibold gap-2">
                        <span className="w-4 h-4 border-2 border-[#00B5E2] border-t-transparent rounded-full animate-spin"></span>
                        Đang tải danh sách học sinh...
                      </div>
                    ) : transferStudents.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 text-xs font-semibold">
                        {transferClassId ? "Không có học sinh nào trong lớp này." : "Vui lòng chọn Lớp học trước."}
                      </div>
                    ) : filteredTransferStudents.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 text-xs font-semibold">
                        Không tìm thấy học sinh phù hợp.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {filteredTransferStudents.map((s) => {
                          const isChecked = selectedStudentIds.includes(s.id);
                          return (
                            <label
                              key={s.id}
                              className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all hover:bg-slate-50/50 ${isChecked ? 'bg-[#E6F8FD]/50 border-[#00B5E2]' : 'border-[#D9E2EC]'}`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedStudentIds(selectedStudentIds.filter(id => id !== s.id));
                                  } else {
                                    setSelectedStudentIds([...selectedStudentIds, s.id]);
                                  }
                                }}
                                className="rounded border-[#D9E2EC] text-[#00B5E2] focus:ring-[#00B5E2]/15 w-4 h-4 cursor-pointer"
                              />
                              <div className="text-left">
                                <div className={`text-xs font-bold ${isChecked ? 'text-[#004C97]' : 'text-slate-700'}`}>{s.studentName}</div>
                                <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{s.studentCode}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                {selectedStudentIds.length > 0 && (
                  <div className="text-[11px] font-bold text-[#004C97] mt-1">
                    Đã chọn <span className="text-[#00B5E2]">{selectedStudentIds.length}</span> học sinh.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
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

             {selPeriod?.name?.toLowerCase().includes("open day") && (
               <div className="grid grid-cols-2 gap-4">
                 <Field label="Đăng ký CS" required>
                   <select
                     required
                     value={sForm.registeredCampus}
                     onChange={(e) => setSForm(f => ({ ...f, registeredCampus: e.target.value }))}
                     className={inp}
                   >
                     <option value="">-- Chọn cơ sở đăng ký --</option>
                     {campuses.map(c => (
                       <option key={c.id} value={c.id}>{c.campusName}</option>
                     ))}
                   </select>
                 </Field>
                 <div />
               </div>
             )}

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
                    {configs.filter(c => c.categoryType === "DOI_TUONG_TS").map(c => {
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
                    {configs.filter(c => c.categoryType === "DOI_TUONG_TS").length === 0 && (
                       <span className="text-xs text-slate-400 italic">Chưa có đối tượng tuyển sinh nào trong danh mục</span>
                     )}
                   </div>
                 </div>
               </Field>

               {/* CONDITIONAL LOCATION INPUTS */}
               {selectedLocationType && (
                 <div className="p-5 bg-[#F8FAFC] border border-[#D9E2EC] rounded-2xl space-y-4 animate-in slide-in-from-top-2 duration-200">
                   <div className="flex items-center gap-2 pb-2 border-b border-[#D9E2EC]/60">
                     <span className="w-1.5 h-4 bg-[#00B5E2] inline-block rounded"></span>
                     <h4 className="text-xs font-black text-[#004C97] uppercase tracking-wider">Thông tin trường học cũ ({selectedLocationType})</h4>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {selectedLocationType === "Nội tỉnh" && (
                        <div className="col-span-2 md:col-span-1">
                          <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Tỉnh / Thành phố *</label>
                          <input
                            type="text"
                            disabled
                            value="Thành phố Đà Nẵng"
                            className="h-10 w-full px-3.5 bg-slate-100 border border-[#D9E2EC] text-[#1E293B] text-xs font-semibold rounded-xl outline-none"
                          />
                        </div>
                      )}

                      {selectedLocationType === "Ngoại tỉnh" && (
                        <div className="col-span-2 md:col-span-1">
                          <label className="block text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Tỉnh / Thành phố *</label>
                          <select
                            required
                            value={selectedProvince}
                            onChange={(e) => setSelectedProvince(e.target.value)}
                            className="h-10 w-full px-3 bg-white border border-[#D9E2EC] text-[#1E293B] text-xs font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
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
                         <select
                           required
                           value={selectedCountry}
                           onChange={(e) => setSelectedCountry(e.target.value)}
                           className="h-10 w-full px-3 bg-white border border-[#D9E2EC] text-[#1E293B] text-xs font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
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
                        <div className="space-y-2">
                          <select
                            value={
                              safeDestinationSchools.some((s: any) => s.name === schoolNameInput)
                                ? schoolNameInput
                                : (schoolNameInput ? "__custom__" : "")
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "__custom__") {
                                setSchoolNameInput("");
                              } else {
                                setSchoolNameInput(val);
                                const matched = safeDestinationSchools.find((s: any) => s.name === val);
                                if (matched) {
                                  let mappedType = "Công lập";
                                  if (matched.schoolType === "PRIVATE") mappedType = "Tư thục";
                                  else if (matched.schoolType === "PUBLIC") mappedType = "Công lập";
                                  else if (matched.schoolType) mappedType = matched.schoolType;
                                  setSchoolTypeInput(mappedType);
                                }
                              }
                            }}
                            className="h-10 w-full px-3 bg-white border border-[#D9E2EC] text-[#1E293B] text-xs font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 cursor-pointer"
                          >
                            <option value="">-- Chọn trường từ Danh mục trường --</option>
                            {safeDestinationSchools
                              .map((s: any) => (
                                <option key={s.id || s.code} value={s.name}>
                                  {s.name} ({s.schoolType === "PUBLIC" ? "Công lập" : s.schoolType === "PRIVATE" ? "Tư thục" : s.schoolType})
                                </option>
                              ))}
                            <option value="__custom__">-- Khác / Nhập tên trường ngoài danh mục --</option>
                          </select>

                          {(!schoolNameInput || !safeDestinationSchools.some((s: any) => s.name === schoolNameInput)) && (
                            <input
                              required
                              type="text"
                              value={schoolNameInput}
                              onChange={(e) => setSchoolNameInput(e.target.value)}
                              placeholder="Nhập tên trường học cũ..."
                              className="h-10 w-full px-3.5 bg-white border border-[#D9E2EC] text-[#1E293B] placeholder-[#94A3B8] text-xs font-semibold rounded-xl outline-none focus:border-[#00B5E2] focus:ring-4 focus:ring-[#00B5E2]/10 animate-in fade-in duration-150"
                            />
                          )}
                        </div>
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
        )}
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
            <div className="flex items-center justify-between no-print text-xs font-semibold">
              <div className="flex items-center gap-2">
                {isInvitation ? <Mail className="w-5 h-5 text-indigo-600"/> : <GraduationCap className="w-5 h-5 text-indigo-600"/>}
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
                        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg> Lưu File (PDF)';
                        btn.disabled = false;
                      }
                    }
                  }}
                  className="hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-100 flex items-center gap-2 transition-all text-xs font-semibold"
                >
                  <Download className="w-4 h-4" />
                  Lưu File (PDF)
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
                      <div className="space-y-3 text-justify text-slate-800 font-serif" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "13.5pt", lineHeight: "1.45", textAlign: "justify" }}>
                        {renderTemplate(studentCampusConfig.content, {
                          ...(mergedStudent || selectedReportStudent),
                          signatureName: studentCampusConfig?.directorName || (mergedStudent || selectedReportStudent)?.signatureName || ""
                        }).split('\n').filter(Boolean).map((para, idx) => (
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
                      ).split('\n').filter(Boolean).map((para, idx) => {
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
                      ).split('\n').filter(Boolean).map((para, idx) => (
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
                      <p className="font-bold uppercase text-indigo-950 text-xs tracking-wider">TM. HỘI ĐỒNG TUYỂN SINH</p>
                      <p className="font-bold uppercase text-indigo-900/80 text-[10px] tracking-wider mb-4">GIÁM ĐỐC ĐIỀU HÀNH SKY-LINE {campusTitleSuffix}</p>
                      
                      <div className="h-16 flex items-center justify-center">
                        {studentCampusConfig?.signature ? (
                          <img crossOrigin={studentCampusConfig.signature?.startsWith("data:") ? undefined : "anonymous"}  src={studentCampusConfig.signature} alt="Signature" className="max-h-full object-contain" />
                        ) : null}
                      </div>
                      
                      <p className="font-bold text-slate-700 mt-2 text-sm">
                        {studentCampusConfig?.directorName || "Đỗ Quang Trung"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-end mt-4 pr-4">
                    <div className="flex flex-col items-center text-center" style={{ minWidth: "240px" }}>
                      <p className="italic text-slate-500 mb-1">{formattedLetterDate}</p>
                      <p className="font-bold uppercase text-indigo-950 text-xs tracking-wider">TM. HỘI ĐỒNG TUYỂN SINH</p>
                      <p className="font-bold uppercase text-indigo-900/80 text-[10px] tracking-wider mb-6">GIÁM ĐỐC ĐIỀU HÀNH SKY-LINE {campusTitleSuffix}</p>
                      
                      <div className="h-16 flex items-center justify-center">
                        {studentCampusConfig?.signature ? (
                          <img crossOrigin="anonymous"  src={studentCampusConfig.signature} alt="Signature" className="max-h-full object-contain" />
                        ) : null}
                      </div>
                      
                      <p className="font-bold text-slate-700 mt-2 text-sm">
                        {studentCampusConfig?.directorName || "Đỗ Quang Trung"}
                      </p>
                    </div>
                  </div>
                )}
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
                      <span className="font-bold text-[#00A99D] whitespace-nowrap uppercase text-[11.5px] tracking-wide">HỆ THỐNG GIÁO DỤC SKY-LINE</span>
                      <div className="flex-grow border-t border-[#00A99D]/70 h-0 mt-0.5"></div>
                      <span className="font-semibold text-[#00A99D] whitespace-nowrap lowercase text-[11px]">www.skylineschool.edu.vn</span>
                    </div>
                    
                    {/* Information Grid */}
                    <div className="flex flex-row justify-between w-full relative text-[9px]">
                      {/* Left Column (3 branches) */}
                      <div className="w-[30%] flex flex-col gap-1.5 text-left">
                        <div>
                          <p className="font-bold text-[#00A99D] text-[9.5px] leading-tight">SKY-LINE Riverside</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Lô A2.4 Trần Đăng Ninh, P. Hòa Cường, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#00A99D] text-[9.5px] leading-tight">SKY-LINE Central</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Số 48 Nguyễn Du, P. Hải Châu, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#00A99D] text-[9.5px] leading-tight">SKY-LINE Global</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Lô A2 Trần Đăng Ninh, P. Hòa Cường, TP. Đà Nẵng</p>
                        </div>
                      </div>

                      {/* Middle Column (3 branches) */}
                      <div className="w-[30%] flex flex-col gap-1.5 text-left">
                        <div>
                          <p className="font-bold text-[#00A99D] text-[9.5px] leading-tight">SKY-LINE Beach</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Số 199 Trần Anh Tông, P. Thanh Khê, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#00A99D] text-[9.5px] leading-tight">SKY-LINE Hill</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Khối Hà My Đông A, P. Điện Bàn Đông, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#00A99D] text-[9.5px] leading-tight">Trung tâm sống thành công - SLS</p>
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
                    <div className="absolute right-[-5px] top-[2px] w-16 h-12 opacity-100 pointer-events-none flex items-center justify-center text-[#00A99D]">
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
                        <h2 className="text-xl font-bold tracking-widest text-indigo-950 uppercase mb-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
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
                          <tbody>
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
                      <span className="font-bold text-[#00A99D] whitespace-nowrap uppercase text-[11.5px] tracking-wide">HỆ THỐNG GIÁO DỤC SKY-LINE</span>
                      <div className="flex-grow border-t border-[#00A99D]/70 h-0 mt-0.5"></div>
                      <span className="font-semibold text-[#00A99D] whitespace-nowrap lowercase text-[11px]">www.skylineschool.edu.vn</span>
                    </div>
                    
                    {/* Information Grid */}
                    <div className="flex flex-row justify-between w-full relative text-[9px]">
                      {/* Left Column (3 branches) */}
                      <div className="w-[30%] flex flex-col gap-1.5 text-left">
                        <div>
                          <p className="font-bold text-[#00A99D] text-[9.5px] leading-tight">SKY-LINE Riverside</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Lô A2.4 Trần Đăng Ninh, P. Hòa Cường, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#00A99D] text-[9.5px] leading-tight">SKY-LINE Central</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Số 48 Nguyễn Du, P. Hải Châu, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#00A99D] text-[9.5px] leading-tight">SKY-LINE Global</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Lô A2 Trần Đăng Ninh, P. Hòa Cường, TP. Đà Nẵng</p>
                        </div>
                      </div>

                      {/* Middle Column (3 branches) */}
                      <div className="w-[30%] flex flex-col gap-1.5 text-left">
                        <div>
                          <p className="font-bold text-[#00A99D] text-[9.5px] leading-tight">SKY-LINE Beach</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Số 199 Trần Anh Tông, P. Thanh Khê, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#00A99D] text-[9.5px] leading-tight">SKY-LINE Hill</p>
                          <p className="text-[#555555] text-[8.5px] leading-tight mt-0.5">Khối Hà My Đông A, P. Điện Bàn Đông, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#00A99D] text-[9.5px] leading-tight">Trung tâm sống thành công - SLS</p>
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
                    <div className="absolute right-[-5px] top-[2px] w-16 h-12 opacity-100 pointer-events-none flex items-center justify-center text-[#00A99D]">
                      <svg viewBox="0 0 120 60" className="w-full h-full fill-current" style={{ filter: "drop-shadow(0px 1px 1px rgba(0,166,169,0.1))" }}>
                        <path d="M 8 26 C 24 32, 50 52, 62 60 C 78 36, 102 16, 118 3 C 95 16, 76 44, 62 62 C 48 46, 25 32, 8 26 Z" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* PAGE 3+: ASSESSMENT DETAILS (Specific for Child Development Standard) */}
                {selectedReportStudent.scores && selectedReportStudent.scores.map((sc) => {
                  const subject = sc.subject || {};
                  const subName = (subject.name || "").toLowerCase().normalize("NFC");
                  const subCode = (subject.code || "").toLowerCase();
                  const isChildDev = subName.includes("chuẩn phát triển") || subCode.includes("cpt") || subCode.includes("tci");
                  
                  if (!isChildDev) return null;

                  let scoreVals = [];
                  try { if (sc.scores) { const parsed = JSON.parse(sc.scores); scoreVals = Array.isArray(parsed) ? parsed : [parsed]; } } catch { scoreVals = [sc.scores]; }
                  
                  let parsedCols = { scores: [] };
                  try { if (subject.columnNames) { const parsed = JSON.parse(subject.columnNames); parsedCols = { scores: Array.isArray(parsed.scores) ? parsed.scores : [] }; } } catch {}

                  const failedCriteria = scoreVals.map((v, idx) => v === "2" ? (parsedCols.scores[idx] || (isChildDev ? [
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
                  const skippedCriteria = scoreVals.map((v, idx) => v === "1" ? (parsedCols.scores[idx] || (isChildDev ? [
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
                          <h2 className="text-xl font-bold tracking-widest text-indigo-950 uppercase mb-2">CHI TIẾT ĐÁNH GIÁ</h2>
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
                            <span className="font-bold text-[#00A99D] whitespace-nowrap uppercase text-[11.5px] tracking-wide">HỆ THỐNG GIÁO DỤC SKY-LINE</span>
                            <div className="flex-grow border-t border-[#00A99D]/70 h-0 mt-0.5"></div>
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
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-2 border-violet-100 animate-in fade-in zoom-in-95 duration-300">
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
                        
                        const selectedEmails = [];
                        newChecked.tuvan.forEach(c => selectedEmails.push(EMAIL_MAP.tuvan[c]));
                        newChecked.giaovu.forEach(c => selectedEmails.push(EMAIL_MAP.giaovu[c]));
                        newChecked.gdcs.forEach(c => selectedEmails.push(EMAIL_MAP.gdcs[c]));
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
                        setRecipientEmail(manualEmails.join(', ') || (currentUser?.email || "bankhaothi@skylineschool.edu.vn"));
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
                    <thead className="bg-[#f8fafc] sticky top-0 border-b border-slate-100 z-10">
                      <tr>
                        <th className="p-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-[#f8fafc] border border-slate-200">STT</th>
                        <th className="p-2 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest bg-[#f8fafc] border border-slate-200">HỌ VÀ TÊN</th>
                        <th className="p-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-[#f8fafc] border border-slate-200">KHỐI</th>
                        <th className="p-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-[#f8fafc] border border-slate-200">PHÁI</th>
                        <th className="p-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-[#f8fafc] border border-slate-200">NGÀY SINH</th>
                        <th className="p-2 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest bg-[#f8fafc] border border-slate-200">HỆ KHẢO SÁT</th>
                        <th className="p-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-[#f8fafc] border border-slate-200">KẾT QUẢ HỌC TẬP</th>
                        <th className="p-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-[#f8fafc] border border-slate-200">KẾT QUẢ RÈN LUYỆN</th>
                        <th className="p-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-[#f8fafc] border border-slate-200">KẾT QUẢ</th>
                        <th className="p-2 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest bg-[#f8fafc] border border-slate-200">CƠ SỞ NHẬN</th>
                        {attachLetters && (
                          <th className="p-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-[#f8fafc] border border-slate-200">HỒ SƠ ĐÍNH KÈM</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
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
                              s.admissionResult === "Đạt cam kết" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                              (s.admissionResult === "Không đạt" || s.admissionResult === "Không đạt - Kiểm tra lại" || s.admissionResult === "Không đạt - Không kiểm tra lại") ? "bg-rose-50 text-rose-600 border border-rose-100" :
                              s.admissionResult === "Học thử" ? "bg-indigo-50 text-indigo-600 border border-indigo-100" :
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
                              className="hover:bg-indigo-700 text-white font-bold text-xs transition-all text-xs font-semibold"
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
  
      {/* Floating Action Bar */}
      {selectedIds && selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/95 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 border border-white/10 w-[90%] md:w-auto overflow-x-auto whitespace-nowrap">
          <div className="flex items-center gap-3 pr-6 border-r border-slate-700/50">
            <div className="bg-[#00A99D]/20 text-[#00A99D] w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
              {selectedIds.length}
            </div>
            <span className="font-medium">học sinh đang chọn</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMoveBatchModalOpen(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Chuyển đợt KS
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition-all"
              title="Bỏ chọn"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Move to Batch Modal */}
      {isMoveBatchModalOpen && (
        <MoveToBatchModal
          selectedIds={selectedIds}
          onClose={() => setIsMoveBatchModalOpen(false)}
          onSuccess={() => {
            setSelectedIds([]);
            setIsMoveBatchModalOpen(false);
            window.location.reload();
          }}
          periods={periods}
        />
      )}
      </div>
  )
}
