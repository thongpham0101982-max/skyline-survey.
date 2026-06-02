"use client"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import * as XLSX from "xlsx"
import {
  Baby, Clock, Settings, Users, BarChart3, Calendar,
  Plus, Trash2, Edit2, Search, RefreshCw, ChevronDown, ChevronUp,
  X, CheckCircle, CheckCircle2, AlertCircle, Download, Upload, Star, Heart, Sparkles, UserCheck, Eye, Send, ClipboardList, Mail, GraduationCap, Phone, Loader2
} from "lucide-react"

interface Period { id: string; code: string; name: string; status: string; startDate?: string; endDate?: string; description?: string; assignedUserId?: string; surveyType?: string; batches: Batch[] }
interface Batch { id: string; periodId: string; batchNumber: number; name: string; startDate: string; endDate: string; status: string; campusId?: string; assignedUserId?: string }
interface PreschoolChild { id: string; studentCode: string; fullName: string; dateOfBirth?: string; gender?: string; grade?: string; admissionCriteria?: string; surveyFormType?: string; admissionResult?: string; admissionCampus?: string; periodId: string; batchId?: string; devProfessionalComment?: string; devPsychologyComment?: string; devImportantNote?: string; devAssessmentResult?: string; bghApprovalStatus?: string; bghApprovalComment?: string; gdcsApprovalStatus?: string; gdcsApprovalComment?: string; }
interface Camp { id: string; campusName: string; campusCode?: string; manager?: { fullName?: string } }
interface AcademicYear { id: string; name: string }
interface AssessmentConfig { id: string; categoryType: string; code: string; name: string; sortOrder: number }

interface DevArea { id: string; code: string; name: string; description?: string; color?: string; sortOrder: number; criteria: DevCriteria[] }
interface DevCriteria { id: string; areaId: string; code: string; name: string; ageGroup: string; sortOrder: number; status: string }
interface DevScore { id: string; studentId: string; criteriaId: string; result: string; note?: string; assessorId?: string }

const DEFAULT_WATERMARK_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%23007A87'><path d='M10,80 Q50,40 90,20 Q60,50 10,80 Z'/><path d='M30,80 Q60,55 90,35 Q65,60 30,80 Z'/></svg>";

const isPreschoolCampusMatch = (effCampus: string | null | undefined, cCode: string | null | undefined, cName: string | null | undefined): boolean => {
  if (!effCampus) return false;
  const normEff = effCampus.toUpperCase();
  const normCode = (cCode || "").toUpperCase();
  const normName = (cName || "").toUpperCase();
  if (normEff === normCode || normEff === normName) return true;
  if (normEff.includes("CS1") || normEff.includes("RIVERSIDE")) {
    return normCode.includes("CS1") || normCode.includes("RIVERSIDE") || normName.includes("CS1") || normName.includes("RIVERSIDE");
  }
  if (normEff.includes("CS2") || normEff.includes("CENTRAL")) {
    return normCode.includes("CS2") || normCode.includes("CENTRAL") || normName.includes("CS2") || normName.includes("CENTRAL");
  }
  if (normEff.includes("CS3") || normEff.includes("GLOBAL")) {
    return normCode.includes("CS3") || normCode.includes("GLOBAL") || normName.includes("CS3") || normName.includes("GLOBAL");
  }
  if (normEff.includes("CS4") || normEff.includes("HILL")) {
    return normCode.includes("CS4") || normCode.includes("HILL") || normName.includes("CS4") || normName.includes("HILL");
  }
  if (normEff.includes("CS5") || normEff.includes("BEACH")) {
    return normCode.includes("CS5") || normCode.includes("BEACH") || normName.includes("CS5") || normName.includes("BEACH");
  }
  return normEff.includes(normCode) || normEff.includes(normName) || normCode.includes(normEff) || normName.includes(normEff);
};

const inp = "w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 text-sm font-medium text-slate-700 transition-all shadow-sm";

function Toast({ msg, type }: { msg: string; type: string }) {
  return <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl font-bold text-sm animate-in slide-in-from-right-4 fade-in duration-300 ${type === "err" ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"}`}>{type === "err" ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}{msg}</div>;
}

function Spin() {
  return <div className="flex items-center justify-center py-16"><div className="relative"><div className="w-12 h-12 rounded-full border-4 border-violet-100 border-t-violet-600 animate-spin"></div><Baby className="w-5 h-5 text-violet-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div></div>;
}

function Empty({ text, sub }: { text: string; sub?: string }) {
  return <div className="flex flex-col items-center justify-center py-16 text-center"><div className="w-20 h-20 bg-violet-50 rounded-full flex items-center justify-center mb-4"><Baby className="w-10 h-10 text-violet-400" /></div><p className="font-black text-slate-500 text-sm">{text}</p>{sub && <p className="text-xs text-slate-400 mt-1 font-medium">{sub}</p>}</div>;
}

function TypeBadge({ t }: { t: string }) {
  const map: Record<string, string> = {
    KHAO_SAT_LE: "bg-blue-50 text-blue-700 border border-blue-200",
    OPEN_DAY: "bg-purple-50 text-purple-700 border border-purple-200"
  };
  const label: Record<string, string> = {
    KHAO_SAT_LE: "Khảo sát lẻ cơ sở",
    OPEN_DAY: "Khảo sát Open Day"
  };
  return <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700">{label[t] || t}</span>;
}
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


function Badge({ s }: { s: string }) {
  const map: Record<string, string> = { ACTIVE: "bg-emerald-100 text-emerald-700 border border-emerald-200", INACTIVE: "bg-slate-100 text-slate-500", LOCKED: "bg-rose-100 text-rose-700", CLOSED: "bg-slate-100 text-slate-500" };
  const label: Record<string, string> = { ACTIVE: "ĐANG MỞ", INACTIVE: "ĐÓNG", LOCKED: "ĐÃ KHÓA", CLOSED: "ĐÃ ĐÓNG" };
  return <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider ${map[s] || "bg-slate-100 text-slate-600"}`}>{label[s] || s}</span>;
}

function ConfirmDialog({ open, onClose, onConfirm, message }: any) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm"><div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center animate-in zoom-in-95 duration-200"><div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-7 h-7 text-rose-500" /></div><p className="font-black text-slate-800 text-base mb-6">{message}</p><div className="flex gap-3"><button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all">Hủy</button><button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-3 bg-rose-500 text-white font-black rounded-2xl hover:bg-rose-600 transition-all">Xác nhận</button></div></div></div>;
}

function Modal({ open, onClose, title, children, footer, size = "md" }: any) {
  if (!open) return null;
  const sizeMap: Record<string, string> = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className={`bg-white rounded-3xl shadow-2xl w-full ${sizeMap[size]} overflow-hidden animate-in zoom-in-95 duration-200`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="font-black text-slate-800 text-base flex items-center gap-2"><Baby className="w-5 h-5 text-violet-400" />{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[70vh]">{children}</div>
        {footer && <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">{footer}</div>}
      </div>
    </div>
  );
}

function Field({ label, required, children }: any) {
  return <div className="space-y-1.5"><label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest">{label}{required && <span className="text-violet-600 ml-1">*</span>}</label>{children}</div>;
}

const xetDuyetCols = [
  { id: "stt", label: "STT", width: "w-12 min-w-[48px] max-w-[48px] sticky left-0 bg-violet-50 z-20" },
  { id: "name", label: "Thông tin bé", width: "w-[260px] min-w-[260px] max-w-[260px] sticky left-12 bg-violet-50 z-20 border-r border-violet-100/80 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] whitespace-normal" },
  { id: "physical", label: "Thể chất", width: "w-[220px] min-w-[220px] whitespace-normal border-r border-violet-50/50" },
  { id: "cognitive", label: "Nhận thức", width: "w-[280px] min-w-[280px] whitespace-normal border-r border-violet-50/50" },
  { id: "language", label: "Ngôn ngữ", width: "w-[280px] min-w-[280px] whitespace-normal border-r border-violet-50/50" },
  { id: "social", label: "Tình cảm - Kỹ năng XH - TM", width: "w-[280px] min-w-[280px] whitespace-normal border-r border-violet-50/50" },
  { id: "teacher", label: "Giáo viên đánh giá", width: "w-[280px] min-w-[280px] whitespace-normal border-r border-violet-50/50" },
  { id: "bghApproval", label: "Duyệt BGH MN", width: "w-[220px] min-w-[220px] whitespace-normal border-r border-violet-50/50" },
  { id: "gdcsApproval", label: "Duyệt GĐCS", width: "w-[220px] min-w-[220px] whitespace-normal border-r border-violet-50/50" },
  { id: "result", label: "Kết quả Duyệt", width: "w-32 min-w-[128px]" },
  { id: "actions", label: "Thao tác", width: "w-[350px] min-w-[350px]" }
];

export function PreschoolInputAssessmentsClient({ academicYears, campuses, giaoVuCSUsers, grades: gradesProp, teachers, departments, currentUser }: { academicYears: AcademicYear[]; campuses: Camp[]; giaoVuCSUsers: any[]; grades: string[]; teachers: any[]; departments: any[]; currentUser: any; }) {
  const grades = gradesProp && gradesProp.length > 0 ? gradesProp : ["18 đến 24 tháng", "24 đến 36 tháng", "Mẫu giáo bé", "Mẫu giáo nhỡ", "Mẫu giáo lớn"];

  const userRole = (currentUser?.role || "").toUpperCase();
  const isSystemAdmin = userRole === "ADMIN";
  const isBGHUser = userRole === "KT_DBCL" || userRole === "BGH MN" || userRole === "BGH_MN";
  const isGDCSUser = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(userRole);

  const showBghSection = true;
  const showGdcsSection = true;

  const getGdcsRoleCode = (campusName: string | undefined) => {
    if (!campusName) return "GĐCS";
    if (campusName.startsWith("CS")) {
      const num = campusName.substring(2);
      return `GĐCS${num}`;
    }
    return `GĐCS (${campusName})`;
  };

  const getGdcsLabel = (campusName: string | undefined) => {
    if (!campusName) return "GIÁM ĐỐC CƠ SỞ";
    if (campusName.startsWith("CS")) {
      const num = campusName.substring(2);
      return `GIÁM ĐỐC CƠ SỞ ${num} (GĐCS${num})`;
    }
    return `GIÁM ĐỐC CƠ SỞ (${campusName})`;
  };

  const [tab, setTab] = useState("periods");
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isInvitation, setIsInvitation] = useState(true);
  const [isCommitment, setIsCommitment] = useState(false);
  const [selectedReportStudent, setSelectedReportStudent] = useState<any>(null);

  // States for Email Congrats Checklist modal
  const [isEmailCongratsModalOpen, setIsEmailCongratsModalOpen] = useState(false);
  const [emailCongratsStudent, setEmailCongratsStudent] = useState<any>(null);
  const [emailCongratsRecipients, setEmailCongratsRecipients] = useState<any[]>([]);
  const [emailCongratsLoading, setEmailCongratsLoading] = useState(false);
  const [emailCongratsSending, setEmailCongratsSending] = useState(false);
  const [emailCongratsAdditionalNote, setEmailCongratsAdditionalNote] = useState("");

  // States for Batch Email Congrats modal
  const [isBatchEmailCongratsModalOpen, setIsBatchEmailCongratsModalOpen] = useState(false);
  const [batchEmailCongratsStudents, setBatchEmailCongratsStudents] = useState<any[]>([]);
  const [batchEmailCongratsRoles, setBatchEmailCongratsRoles] = useState<string[]>(["Tư vấn", "Giáo vụ", "Tổ/Môn", "GĐCS", "BGH"]);
  const [batchEmailCongratsAdditionalNote, setBatchEmailCongratsAdditionalNote] = useState("");
  const [batchEmailCongratsSending, setBatchEmailCongratsSending] = useState(false);

  const openEmailCongratsModal = async (student: any) => {
    setEmailCongratsStudent(student);
    setIsEmailCongratsModalOpen(true);
    setEmailCongratsLoading(true);
    setEmailCongratsAdditionalNote("");
    setEmailCongratsRecipients([]);
    try {
      const res = await fetch("/api/preschool-input-assessment-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "GET_CAMPUS_RECIPIENTS", studentId: student.id })
      });
      const data = await res.json();
      if (data.success) {
        setEmailCongratsRecipients(data.recipients || []);
      } else {
        alert("Không thể tải danh sách người nhận: " + (data.error || "Lỗi không xác định"));
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message);
    } finally {
      setEmailCongratsLoading(false);
    }
  };

  const handleSendCongratsEmail = async () => {
    const selectedEmails = emailCongratsRecipients
      .filter((r: any) => r.checked)
      .map((r: any) => r.email);

    if (selectedEmails.length === 0) {
      alert("Vui lòng chọn ít nhất một người nhận email.");
      return;
    }

    setEmailCongratsSending(true);
    try {
      const res = await fetch("/api/preschool-input-assessment-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEND_CONGRATS_EMAIL",
          studentId: emailCongratsStudent.id,
          recipients: selectedEmails,
          additionalNote: emailCongratsAdditionalNote
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Gửi email chúc mừng thành công tới ${data.sentCount} người nhận!`);
        setIsEmailCongratsModalOpen(false);
      } else {
        alert("Gửi email thất bại: " + (data.error || "Lỗi không xác định"));
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message);
    } finally {
      setEmailCongratsSending(false);
    }
  };

  const handleRecipientCheckChange = (index: number, checked: boolean) => {
    const updated = [...emailCongratsRecipients];
    updated[index].checked = checked;
    setEmailCongratsRecipients(updated);
  };

  const openBatchEmailCongratsModal = () => {
    const eligible = studentSummaries.filter((s: any) => {
      const result = (s.admissionResult || "").toUpperCase();
      return result.includes("MIỄN HỌC THỬ") || result.includes("MIEN_HOC_THU") || s.probationaryResult === "DAT";
    }).map((s: any) => {
      const isPassed = (s.probationaryResult === "DAT" || (s.admissionResult || "").toUpperCase().includes("MIỄN") || (s.admissionResult || "").toUpperCase().includes("MIEN"));
      return {
        ...s,
        admissionResult: s.probationaryResult === "DAT" ? "Đạt - Sau học thử" : isPassed ? "Đạt - Miễn học thử" : "Chưa duyệt"
      };
    });

    if (eligible.length === 0) {
      alert("Không có học sinh nào đạt yêu cầu nhập học để gửi thư chúc mừng trong danh sách hiện tại.");
      return;
    }

    const activeBatchName = cBatchId ? (periods.flatMap((p: any) => p.batches || []).find((b: any) => b.id === cBatchId)?.name || "Đợt khảo sát") : "Tất cả các đợt";
    const activePeriodName = periods.find((p: any) => p.id === cPeriodId)?.name || "Kỳ khảo sát";

    setRecipientEmail([campusEmails.giaovu, campusEmails.gdcs, campusEmails.bghmn, campusEmails.tuyensinh].filter(Boolean).join(", "));
    setCcEmail("bankhaothi@skylineschool.edu.vn");
    setEmailSubject("[Thư chúc mừng] Kết quả Khảo sát đầu vào Mầm non - Kỳ: " + activePeriodName + " - Đợt: " + activeBatchName);
    setEmailStudents(eligible);
    setEmailResult(null);
    setAttachLetters(true);
    setIsEmailModalOpen(true);
  };

  const handleSendBatchCongratsEmail = async () => {
    const selectedStudentIds = batchEmailCongratsStudents
      .filter((s: any) => s.checked)
      .map((s: any) => s.id);

    if (selectedStudentIds.length === 0) {
      alert("Vui lòng chọn ít nhất một học sinh để gửi email.");
      return;
    }

    if (batchEmailCongratsRoles.length === 0) {
      alert("Vui lòng chọn ít nhất một vai trò nhận thư chúc mừng.");
      return;
    }

    setBatchEmailCongratsSending(true);
    try {
      const res = await fetch("/api/preschool-input-assessment-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEND_BATCH_CONGRATS_EMAIL",
          studentIds: selectedStudentIds,
          roles: batchEmailCongratsRoles,
          additionalNote: batchEmailCongratsAdditionalNote
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Gửi email chúc mừng hàng loạt thành công! Đã gửi ${data.sentCount} email.`);
        setIsBatchEmailCongratsModalOpen(false);
      } else {
        alert("Gửi email hàng loạt thất bại: " + (data.error || "Lỗi không xác định"));
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message);
    } finally {
      setBatchEmailCongratsSending(false);
    }
  };

  const handleCheckboxChange = (group: 'tuvan' | 'giaovu' | 'gdcs' | 'bghmn' | 'cc', cs?: string) => {
    setCheckedEmails(prev => {
      let nextChecked = { ...prev };
      if (group === 'cc') {
        nextChecked.cc = !prev.cc;
      } else if (cs) {
        if (prev[group].includes(cs)) {
          nextChecked[group] = prev[group].filter(item => item !== cs);
        } else {
          nextChecked[group] = [...prev[group], cs];
        }
      }
      
      const selectedEmails: string[] = [];
      nextChecked.tuvan.forEach(c => selectedEmails.push(EMAIL_MAP.tuvan[c as keyof typeof EMAIL_MAP.tuvan]));
      nextChecked.giaovu.forEach(c => selectedEmails.push(EMAIL_MAP.giaovu[c as keyof typeof EMAIL_MAP.giaovu]));
      nextChecked.gdcs.forEach(c => selectedEmails.push(EMAIL_MAP.gdcs[c as keyof typeof EMAIL_MAP.gdcs]));
      nextChecked.bghmn.forEach(c => selectedEmails.push(EMAIL_MAP.bghmn[c as keyof typeof EMAIL_MAP.bghmn]));
      if (nextChecked.cc) {
        selectedEmails.push(EMAIL_MAP.cc);
      }
      
      const currentEmails = recipientEmail.split(',').map(e => e.trim()).filter(Boolean);
      const manualEmails = currentEmails.filter(e => !allMapEmails.includes(e));
      
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
      bghmn: [] as string[],
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
      Object.entries(EMAIL_MAP.bghmn).forEach(([cs, addr]) => {
        if (addr === email) parsedChecked.bghmn.push(cs);
      });
      if (email === EMAIL_MAP.cc) parsedChecked.cc = true;
    });
    
    setCheckedEmails(parsedChecked);
  };

  const handleOpenEmailModal = () => {
    const targetStudents = studentSummaries.filter(s => {
      const result = (s.admissionResult || "").toUpperCase();
      return result.includes("MIỄN HỌC THỬ") || result.includes("MIEN_HOC_THU") || s.probationaryResult === "DAT";
    }).map(s => {
      // normalize fields for route quick report list
      const isPassed = (s.probationaryResult === "DAT" || (s.admissionResult || "").toUpperCase().includes("MIỄN") || (s.admissionResult || "").toUpperCase().includes("MIEN"));
      return {
        ...s,
        admissionResult: s.probationaryResult === "DAT" ? "Đạt - Sau học thử" : isPassed ? "Đạt - Miễn học thử" : "Chưa duyệt"
      };
    });
    
    const activeBatchName = cBatchId ? (periods.flatMap(p => p.batches || []).find(b => b.id === cBatchId)?.name || "Đợt khảo sát") : "Tất cả các đợt";
    const activePeriodName = periods.find(p => p.id === cPeriodId)?.name || "Kỳ khảo sát";
    
    const targetCampuses = ['CS1', 'CS2', 'CS3', 'CS4'];
    const defaultChecked = {
      tuvan: [...targetCampuses],
      giaovu: [...targetCampuses],
      gdcs: [...targetCampuses],
      bghmn: [...targetCampuses],
      cc: true
    };
    
    const initialEmailsSet = new Set();
    const userEmail = currentUser?.email || "bankhaothi@skylineschool.edu.vn";
    userEmail.split(',').map(e => e.trim()).filter(Boolean).forEach(e => initialEmailsSet.add(e));
    
    targetCampuses.forEach(cs => {
      if (EMAIL_MAP.tuvan[cs]) initialEmailsSet.add(EMAIL_MAP.tuvan[cs]);
      if (EMAIL_MAP.giaovu[cs]) initialEmailsSet.add(EMAIL_MAP.giaovu[cs]);
      if (EMAIL_MAP.gdcs[cs]) initialEmailsSet.add(EMAIL_MAP.gdcs[cs]);
      if (EMAIL_MAP.bghmn[cs]) initialEmailsSet.add(EMAIL_MAP.bghmn[cs]);
    });
    initialEmailsSet.add(EMAIL_MAP.cc);
    
    const finalInitialEmails = Array.from(initialEmailsSet).join(', ');
    
    setRecipientEmail(finalInitialEmails);
    setEmailSubject(`[Báo cáo nhanh] Kết quả Khảo sát đầu vào Mầm non - Kỳ: ${activePeriodName} - Đợt: ${activeBatchName}`);
    setEmailStudents(targetStudents);
    setEmailResult(null);
    setAttachLetters(true);
    setCheckedEmails(defaultChecked);
    setIsEmailModalOpen(true);
  };

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
    const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
    const detachedElements: any[] = [];
    styleElements.forEach((el: any) => {
      const parent = el.parentNode;
      if (parent) {
        try {
          parent.removeChild(el);
          detachedElements.push({ element: el, parent });
        } catch (err) {
          console.error("Failed to detach style el:", err);
        }
      }
    });

    try {
      const pdfBase64 = await html2pdf().from(docHtml).set(opt).outputPdf('datauristring');
      return pdfBase64;
    } finally {
      detachedElements.forEach(({ element, parent }) => {
        if (parent) {
          try {
            parent.appendChild(element);
          } catch (e) {
            console.error("Failed to re-attach style el:", e);
          }
        }
      });
    }
  };

  const buildPreschoolLetterHtml = (student: any, config: any, isCommitmentFlag: boolean = false, isInvitationFlag: boolean = false) => {
    const rawGrade = student?.grade || "Nát";
    const renderedContent = (config.content || (isInvitationFlag ? defaultPreschoolInvitation : isCommitmentFlag ? defaultPreschoolCommitment : defaultPreschoolCongratulations))
      .replace(/\{\{fullName\}\}/g, student?.fullName || "")
      .replace(/\{\{grade\}\}/g, rawGrade)
      .replace(/\{\{admissionCampus\}\}/g, student?.admissionCampus || "")
      .replace(/\{\{signatureName\}\}/g, student?.signatureName || config.directorName || "Trần Thị Thanh");

    const paragraphs = renderedContent.split("\n").filter(Boolean);
    const bodyHtml = paragraphs.map((para) => {
      const isList = /^\s*[\d•\-*]+/.test(para);
      return isList 
        ? '<p style="padding-left: 24px; font-weight: bold; color: #374151; margin: 4px 0;">' + para + '</p>' 
        : '<p style="text-indent: 10mm; margin: 0 0 14px 0; text-align: justify; text-justify: inter-word; line-height: 1.6; font-size: 13.5pt;">' + para + '</p>';
    }).join("");

    const greetingHtml = isInvitationFlag 
      ? 'Kính gửi Quý Phụ huynh và em <strong style="font-weight: bold; color: #0f172a;">' + student.fullName + '</strong>,'
      : 'Thân gửi con <strong style="font-weight: bold; color: #0f172a;">' + student.fullName + '</strong>,';

    const getImgTag = (src: string, className: string, style: string = "", alt: string = "") => {
      if (!src) return "";
      const cors = src.startsWith("data:") ? "" : ' crossorigin="anonymous"';
      const styleAttr = style ? ' style="' + style + '"' : "";
      const altAttr = alt ? ' alt="' + alt + '"' : "";
      return '<img class="' + className + '"' + cors + ' src="' + src + '"' + styleAttr + altAttr + ' />';
    };

    const logoHtml = config.logo 
      ? getImgTag(config.logo, "logo-img", "max-height: 48px; object-fit: contain;", "Logo") 
      : '<svg class="logo-svg" style="height: 48px; fill: #00A6A9;" viewBox="0 0 260 50"><text x="0" y="38" font-family="Arial, sans-serif" font-weight="900" font-size="34" letter-spacing="-1">SKY-LINE</text><circle cx="178" cy="26" r="6" /></svg>';

    const signatureHtml = config.signature 
      ? getImgTag(config.signature, "signature-img", "max-height: 60px; object-fit: contain; margin: 8px 0;", "Signature") 
      : '<svg style="height: 60px; max-height: 60px;" viewBox="0 0 100 40" width="120"><path d="M10,25 Q30,5 50,20 T90,15 M30,12 Q45,28 60,8" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/></svg>';
    
    const effCampus = student.admissionCampus;
    const campusObj = campuses.find((c: any) => c.id === effCampus || c.campusName === effCampus || c.campusCode === effCampus);
    const campusCodeStr = (campusObj ? campusObj.campusCode || campusObj.campusName : effCampus || "").toUpperCase();
    const studentSchoolNameLocal = campusCodeStr.includes("HILL") ? "TRƯỜNG MẦM NON SKY-LINE HILL" : "TRƯỜNG MẦM NON SKY-LINE";
    
    const d = new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const formattedLetterDateStr = `Đà Nẵng, ngày ${day} tháng ${month} năm ${year}`;

    const campusTitleSuffixStr = (campusCodeStr.includes("CS1") || campusCodeStr.includes("RIVERSIDE")) ? "RIVERSIDE"
      : (campusCodeStr.includes("CS2") || campusCodeStr.includes("CENTRAL")) ? "CENTRAL"
      : (campusCodeStr.includes("CS3") || campusCodeStr.includes("GLOBAL")) ? "GLOBAL"
      : (campusCodeStr.includes("CS4") || campusCodeStr.includes("HILL")) ? "HILL"
      : (campusCodeStr.includes("CS5") || campusCodeStr.includes("BEACH")) ? "BEACH"
      : campusCodeStr || "GLOBAL";

    const directorName = config.directorName || "Trần Thị Thanh";
    const subTitleTextStr = `GIÁM ĐỐC ĐIỀU HÀNH SKY-LINE ${campusTitleSuffixStr}`;

    const customFooterHtml = config.footer ? getImgTag(config.footer, "footer-img", "width: 100%; max-height: 100px; object-fit: contain;", "Footer") :
      '<div style="width: 100%; font-family: Arial, sans-serif; box-sizing: border-box; text-align: left;">' +
        '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; width: 100%;">' +
          '<span style="font-weight: bold; color: #00A6A9; white-space: nowrap; text-transform: uppercase; font-size: 9.5pt; letter-spacing: 0.5px;">HỆ THỐNG GIÁO DỤC SKY-LINE</span>' +
          '<div style="flex-grow: 1; border-top: 1px solid rgba(0, 166, 169, 0.7); height: 0; margin-top: 2px;"></div>' +
          '<span style="font-weight: 600; color: #00A6A9; white-space: nowrap; text-transform: lowercase; font-size: 9pt;">www.skylineschool.edu.vn</span>' +
        '</div>' +
        '<div style="display: flex; justify-content: space-between; font-size: 7.5pt; color: #555555; position: relative; width: 100%;">' +
          '<div style="width: 32%; display: flex; flex-direction: column; gap: 4px;">' +
            '<div>' +
              '<p style="font-weight: bold; color: #00A6A9; margin: 0; font-size: 8pt; line-height: 1.25;">SKY-LINE Riverside</p>' +
              '<p style="color: #555555; margin: 2px 0 0 0; line-height: 1.25;">Lô A2.4 Trần Đăng Ninh, Q. Hải Châu, TP. Đà Nẵng</p>' +
            '</div>' +
            '<div>' +
              '<p style="font-weight: bold; color: #00A6A9; margin: 0; font-size: 8pt; line-height: 1.25;">SKY-LINE Central</p>' +
              '<p style="color: #555555; margin: 2px 0 0 0; line-height: 1.25;">Số 48 Nguyễn Du, Q. Hải Châu, TP. Đà Nẵng</p>' +
            '</div>' +
          '</div>' +
          '<div style="width: 32%; display: flex; flex-direction: column; gap: 4px;">' +
            '<div>' +
              '<p style="font-weight: bold; color: #00A6A9; margin: 0; font-size: 8pt; line-height: 1.25;">SKY-LINE Global</p>' +
              '<p style="color: #555555; margin: 2px 0 0 0; line-height: 1.25;">Lô A2 Trần Đăng Ninh, Q. Hải Châu, TP. Đà Nẵng</p>' +
            '</div>' +
            '<div>' +
              '<p style="font-weight: bold; color: #00A6A9; margin: 0; font-size: 8pt; line-height: 1.25;">SKY-LINE Beach</p>' +
              '<p style="color: #555555; margin: 2px 0 0 0; line-height: 1.25;">Số 199 Trần Anh Tông, Q. Thanh Khê, TP. Đà Nẵng</p>' +
            '</div>' +
          '</div>' +
          '<div style="width: 32%; display: flex; flex-direction: column; gap: 4px;">' +
            '<div>' +
              '<p style="font-weight: bold; color: #00A6A9; margin: 0; font-size: 8pt; line-height: 1.25;">SKY-LINE Hill</p>' +
              '<p style="color: #555555; margin: 2px 0 0 0; line-height: 1.25;">Khối Hà My Đông A, Điện Bàn, Quảng Nam</p>' +
            '</div>' +
            '<div style="display: flex; flex-direction: column; line-height: 1.35; font-weight: 600; color: #1e293b;">' +
              '<p style="margin: 0;">(+84.236) 378 7777</p>' +
              '<p style="margin: 0;">(+84.236) 356 8777</p>' +
            '</div>' +
          '</div>' +
          '<div style="position: absolute; right: -4px; top: -4px; width: 50px; height: 38px; pointer-events: none; display: flex; align-items: center; justify-content: center; color: #00A6A9;">' +
            '<svg viewBox="0 0 120 60" style="width: 100%; height: 100%; fill: currentColor;">' +
              '<path d="M 8 26 C 24 32, 50 52, 62 60 C 78 36, 102 16, 118 3 C 95 16, 76 44, 62 62 C 48 46, 25 32, 8 26 Z" />' +
            '</svg>' +
          '</div>' +
        '</div>' +
      '</div>';

    const bgHtml = config.background 
      ? getImgTag(config.background, "print-watermark", "", "Watermark") 
      : '<svg class="print-watermark" style="display: block; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 110mm; height: auto; opacity: 0.04; z-index: 1; pointer-events: none;" viewBox="0 0 100 100"><path fill="#00A6A9" d="M10,80 Q50,40 90,20 Q60,50 10,80 Z" /><path fill="#00A6A9" d="M30,80 Q60,55 90,35 Q65,60 30,80 Z" /></svg>';

    return '<!DOCTYPE html>' +
      '<html>' +
      '<head>' +
        '<meta charset="utf-8">' +
        '<title>' + (config.title || "Tài liệu") + '</title>' +
        '<style>' +
          '@page {' +
            'size: A4 portrait;' +
            'margin: 0mm !important;' +
          '}' +
          'body {' +
            'margin: 0;' +
            'padding: 0;' +
            'background-color: #ffffff;' +
            '-webkit-print-color-adjust: exact !important;' +
            'print-color-adjust: exact !important;' +
            'color-adjust: exact !important;' +
          '}' +
          '.a4-page {' +
            'font-family: "Times New Roman", Times, serif;' +
            'width: 210mm;' +
            'height: 297mm;' +
            'padding: 20mm 20mm 35mm 20mm;' +
            'box-sizing: border-box;' +
            'position: relative;' +
            'display: flex;' +
            'flex-direction: column;' +
            'justify-content: flex-start;' +
            'background-color: #ffffff;' +
            'overflow: hidden;' +
          '}' +
          '.a4-page + .a4-page {' +
            'page-break-before: always !important;' +
            'break-before: page !important;' +
          '}' +
          '.a4-page > div:first-of-type {' +
            'flex: 1 1 auto !important;' +
            'display: flex !important;' +
            'flex-direction: column !important;' +
            'height: auto !important;' +
          '}' +
          'p {' +
            'font-size: 13.5pt;' +
            'line-height: 1.45;' +
            'color: #333333;' +
            'margin: 0 0 14px 0;' +
            'text-align: justify;' +
          '}' +
          'h2 {' +
            'text-align: center;' +
            'font-size: 22pt;' +
            'font-weight: bold;' +
            'color: #0f172a;' +
            'text-transform: uppercase;' +
            'letter-spacing: 2px;' +
            'margin: 16px 0 24px 0;' +
          '}' +
          '.footer-container {' +
            'position: absolute !important;' +
            'bottom: 8mm !important;' +
            'left: 20mm !important;' +
            'right: 20mm !important;' +
            'width: auto !important;' +
            'margin: 0 !important;' +
            'padding: 0 !important;' +
            'z-index: 10;' +
          '}' +
        '</style>' +
      '</head>' +
      '<body>' +
        '<div class="a4-page">' +
          bgHtml +
          '<div style="position: relative; z-index: 10; display: flex; flex-direction: column; flex-grow: 1;">' +
            '<div class="header-container" style="display: flex; flex-direction: column; border-bottom: 1.5px solid #00A6A9; padding-bottom: 8px; margin-bottom: 24px;">' +
              '<div style="display: flex; align-items: center; justify-content: space-between;">' +
                logoHtml +
              '</div>' +
              '<div style="text-align: left; margin-top: 4px;">' +
                '<h4 style="font-family: Arial, sans-serif; font-size: 11pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #1e293b; margin: 0;">' + (studentSchoolNameLocal || "TRƯỜNG MẦM NON SKY-LINE") + '</h4>' +
              '</div>' +
            '</div>' +
            
            '<h2>' + (config.title || "THƯ CHÚC MỪNG") + '</h2>' +
            
            '<p style="font-size: 14pt; font-style: italic; margin-bottom: 12px; color: #1e293b; text-indent: 0;">' + greetingHtml + '</p>' +
            
            '<div style="flex-grow: 1; font-family: \'Times New Roman\', Times, serif;">' +
              bodyHtml +
            '</div>' +
            
            (isCommitmentFlag ? 
              '<div style="width: 100%; display: flex; justify-content: space-between; margin-top: auto; padding-top: 20px; page-break-inside: avoid; break-inside: avoid;">' +
                '<div style="display: flex; flex-direction: column; align-items: center; text-align: center; width: 45%;">' +
                  '<p style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 0; text-align: center; text-indent: 0; color: #475569;">ĐẠI DIỆN GIA ĐÌNH</p>' +
                  '<p style="font-size: 9pt; font-style: italic; color: #64748b; margin-top: 4px; text-indent: 0;">(Ký và ghi rõ họ tên)</p>' +
                  '<div style="height: 60px; display: flex; align-items: flex-end; justify-content: center; margin: 8px 0;">' +
                    '<span style="font-size: 10pt; color: #cbd5e1; font-style: italic;">Ký tên</span>' +
                  '</div>' +
                '</div>' +
                '<div style="display: flex; flex-direction: column; align-items: center; text-align: center; width: 45%;">' +
                  '<p style="font-size: 12pt; font-style: italic; color: #555555; margin-bottom: 4px; text-align: center; text-indent: 0;">' + formattedLetterDateStr + '</p>' +
                  '<p style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 0; text-align: center; text-indent: 0; color: #0f172a;">TM. HỘI ĐỒNG TUYỂN SINH</p>' +
                  '<p style="font-size: 9pt; font-weight: bold; text-transform: uppercase; color: #475569; margin: 2px 0 0 0; text-align: center; text-indent: 0;">' + subTitleTextStr + '</p>' +
                  '<div style="height: 60px; display: flex; align-items: center; justify-content: center; margin: 8px 0;">' +
                    signatureHtml +
                  '</div>' +
                  '<p style="font-size: 12pt; font-weight: bold; margin: 0; text-align: center; text-indent: 0; color: #1e293b;">' + directorName + '</p>' +
                '</div>' +
              '</div>'
            :
              '<div style="align-self: flex-end; display: flex; flex-direction: column; align-items: center; text-align: center; min-width: 70mm; margin-top: auto; padding-top: 20px; page-break-inside: avoid; break-inside: avoid;">' +
                '<p style="font-size: 12pt; font-style: italic; color: #555555; margin-bottom: 4px; text-align: center; text-indent: 0;">' + formattedLetterDateStr + '</p>' +
                '<p style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin: 0; text-align: center; text-indent: 0; color: #0f172a;">TM. HỘI ĐỒNG TUYỂN SINH</p>' +
                '<p style="font-size: 10pt; font-weight: bold; text-transform: uppercase; color: #475569; margin: 2px 0 0 0; text-align: center; text-indent: 0;">' + subTitleTextStr + '</p>' +
                '<div style="height: 60px; display: flex; align-items: center; justify-content: center; margin: 8px 0;">' +
                  signatureHtml +
                '</div>' +
                '<p style="font-size: 13pt; font-weight: bold; margin: 0; text-align: center; text-indent: 0; color: #1e293b;">' + directorName + '</p>' +
              '</div>'
            ) +
          '</div>' +
          
          '<div class="footer-container">' +
            customFooterHtml +
          '</div>' +
        '</div>' +
      '</body>' +
      '</html>';
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
      const activeBatchName = cBatchId ? (periods.flatMap(p => p.batches || []).find(b => b.id === cBatchId)?.name || "Đợt khảo sát") : "Tất cả các đợt";
      const activePeriodName = periods.find(p => p.id === cPeriodId)?.name || "Kỳ khảo sát";

      const pdfAttachmentsList = [];
      if (attachLetters) {
        const html2pdf = await getHtml2Pdf();
        const eligibleStudents = emailStudents.filter(s => s.admissionResult.includes("Đạt"));
        let currentPdfCount = 0;
        let totalPdfs = eligibleStudents.length;

        for (const s of emailStudents) {
          if (s.admissionResult.includes("Đạt")) {
            const config = getStudentCampusConfig(s, false, false);
            if (config) {
              currentPdfCount++;
              setEmailSendingStatus(`Đang tạo PDF (${currentPdfCount}/${totalPdfs}): Thư chúc mừng - ${s.fullName}`);
              const docHtml = buildPreschoolLetterHtml(s, config, false, false);
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

      const res = await fetch("/api/admin/preschool-send-quick-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipientEmail,
          cc: ccEmail,
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
    const eligibleStudents = emailStudents.filter(s => s.admissionResult.includes("Đạt"));
    if (eligibleStudents.length === 0) {
      alert("Không có bé nào đạt để xuất PDF!");
      return;
    }
    
    setEmailSending(true);
    setEmailSendingStatus("Đang khởi tạo...");
    
    try {
      const html2pdf = await getHtml2Pdf();
      let count = 0;
      let totalPdfs = eligibleStudents.length;

      for (const s of emailStudents) {
        if (s.admissionResult.includes("Đạt")) {
          const config = getStudentCampusConfig(s, false, false);
          if (config) {
            count++;
            setEmailSendingStatus(`Đang tải (${count}/${totalPdfs}): Thư chúc mừng - ${s.fullName.split(' ').pop()}`);
            const docHtml = buildPreschoolLetterHtml(s, config, false, false);
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

  const toggleBatchCongratsRole = (role: string) => {
    if (batchEmailCongratsRoles.includes(role)) {
      setBatchEmailCongratsRoles(batchEmailCongratsRoles.filter(r => r !== role));
    } else {
      setBatchEmailCongratsRoles([...batchEmailCongratsRoles, role]);
    }
  };

  const [mockPreviewStudent, setMockPreviewStudent] = useState<any>(null);
  const [emailStudents, setEmailStudents] = useState<any[]>([]);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSendingStatus, setEmailSendingStatus] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailResult, setEmailResult] = useState<any>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [checkedEmails, setCheckedEmails] = useState({ tuvan: [] as string[], giaovu: [] as string[], gdcs: [] as string[], bghmn: [] as string[], cc: false });
  const [attachLetters, setAttachLetters] = useState(true);
  const [ccEmail, setCcEmail] = useState("");

  // useMemos depending on cBatchId moved below
// Đánh giá phát triển
  const [devTab, setDevTab] = useState<"assess" | "xetDuyet" | "manage" | "dgkqHocThu" | "xuatThuChucMung">("assess");
  const [ageGroupFilter, setAgeGroupFilter] = useState("18 đến 24 tháng");
  
  // Đánh giá học sinh
  const [evalStudent, setEvalStudent] = useState<PreschoolChild | null>(null);

  const [evalModal, setEvalModal] = useState(false);
  const [devAreas, setDevAreas] = useState<DevArea[]>([]);
  const [devType, setDevType] = useState<"INPUT"|"PROBATION">("INPUT");
  const isApprovedStatus = (s?: string) => s === "DAT" || s === "DAT_MIEN_HOC_THU" || s === "DAT_HOC_THU";
  const isAssessmentLocked = !!(isApprovedStatus(evalStudent?.bghApprovalStatus) && isApprovedStatus(evalStudent?.gdcsApprovalStatus));
  const [devLoading, setDevLoading] = useState(false);
  const [studentScores, setStudentScores] = useState<Record<string, { result: string; note: string }>>({});
  const [savingEval, setSavingEval] = useState(false);
  const [devProfComment, setDevProfComment] = useState("");
  const [devPsyComment, setDevPsyComment] = useState("");
  const [devNote, setDevNote] = useState("");
  const [devResult, setDevResult] = useState("");
  const [bghApprovalStatus, setBghApprovalStatus] = useState("");
  const [bghApprovalComment, setBghApprovalComment] = useState("");
  const [gdcsApprovalStatus, setGdcsApprovalStatus] = useState("");
  const [gdcsApprovalComment, setGdcsApprovalComment] = useState("");

  const calculateBMI = () => {
    let height = 0;
    let weight = 0;
    for (const area of devAreas) {
      for (const crit of area.criteria) {
        if (crit.code.endsWith("_01") || crit.name.toLowerCase().includes("chiều cao")) {
          const score = studentScores[crit.id];
          if (score && score.note) {
            // Handle pipe separator: "110 cm|obs text" -> parse only the measurement part
            const rawPart = score.note.includes("|") ? score.note.split("|")[0] : score.note;
            const num = parseFloat(rawPart.replace(/[^\d.]/g, ""));
            if (!isNaN(num) && num > 0) height = num;
          }
        }
        if (crit.code.endsWith("_02") || crit.name.toLowerCase().includes("cân nặng")) {
          const score = studentScores[crit.id];
          if (score && score.note) {
            const rawPart = score.note.includes("|") ? score.note.split("|")[0] : score.note;
            const num = parseFloat(rawPart.replace(/[^\d.]/g, ""));
            if (!isNaN(num) && num > 0) weight = num;
          }
        }
      }
    }
    if (height > 0 && weight > 0) {
      const heightInMeters = height / 100;
      return weight / (heightInMeters * heightInMeters);
    }
    return null;
  };

  const getBMIClassification = (bmi: number) => {
    if (bmi < 13.5) return { label: "Gầy (Thiếu cân)", color: "text-amber-600 bg-amber-50 border-amber-100", dot: "bg-amber-400" };
    if (bmi <= 17.0) return { label: "Bình thường", color: "text-emerald-600 bg-emerald-50 border-emerald-100", dot: "bg-emerald-400" };
    if (bmi <= 18.5) return { label: "Thừa cân", color: "text-orange-600 bg-orange-50 border-orange-100", dot: "bg-orange-400" };
    return { label: "Béo phì", color: "text-rose-600 bg-rose-50 border-rose-100", dot: "bg-rose-400" };
  };

  // Summary scores for students list
  const [studentSummaries, setStudentSummaries] = useState<any[]>([]);
  const [sumLoading, setSumLoading] = useState(false);

  // Quản lý tiêu chí / lĩnh vực
  const [criteriaModal, setCriteriaModal] = useState(false);
  const [editCriteria, setEditCriteria] = useState<DevCriteria | null>(null);
  const [criteriaForm, setCriteriaForm] = useState({ areaId: "", code: "", name: "", ageGroup: "18 đến 24 tháng" });
  const [savingCriteria, setSavingCriteria] = useState(false);
  const [expAreaId, setExpAreaId] = useState<string | null>(null);
  const [yearId, setYearId] = useState(academicYears[0]?.id || "");
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [confirm, setConfirm] = useState<{ msg: string; fn: () => void } | null>(null);
  const notify = (msg: string, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); };

  // Periods
  const [periods, setPeriods] = useState<Period[]>([]);
  const [pLoading, setPLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pModal, setPModal] = useState(false);
  const [editP, setEditP] = useState<Period | null>(null);
  const [pForm, setPForm] = useState({ code: "", name: "", assignedUserId: "", startDate: "", endDate: "", description: "", status: "ACTIVE", surveyType: "KHAO_SAT_LE" });

  // Batches
  const [bModal, setBModal] = useState(false);
  const [editB, setEditB] = useState<Batch | null>(null);
  const [bForm, setBForm] = useState({ batchNumber: "1", name: "", startDate: "", endDate: "", status: "ACTIVE", campusId: "", assignedUserId: "" });
  const [targetPeriodId, setTargetPeriodId] = useState("");

  // Children/Students
  const [children, setChildren] = useState<PreschoolChild[]>([]);
  const [cLoading, setCLoading] = useState(false);
  const [cPeriodId, setCPeriodId] = useState("");
  const [cBatchId, setCBatchId] = useState("");

  // useMemos that depend on cBatchId - must be AFTER declaration to avoid TDZ crash in production

  const selectedCampusObj = useMemo(() => {
    if (!cBatchId) return null;
    const allBatches = periods.flatMap((p: any) => p.batches || []);
    const batch = allBatches.find((b: any) => b.id === cBatchId);
    if (!batch) return null;

    const name = (batch.name || "").toUpperCase();
    let code = "";
    if (name.includes("CS1") || name.includes("RIVERSIDE")) code = "CS1";
    else if (name.includes("CS2") || name.includes("CENTRAL")) code = "CS2";
    else if (name.includes("CS3") || name.includes("GLOBAL")) code = "CS3";
    else if (name.includes("CS4") || name.includes("HILL")) code = "CS4";
    else if (name.includes("CS5") || name.includes("BEACH")) code = "CS5";

    if (code) {
      return campuses.find((c: any) => (c.campusCode || "").toUpperCase().includes(code) || (c.campusName || "").toUpperCase().includes(code));
    }
    return null;
  }, [cBatchId, periods, campuses]);

  const campusLabel = useMemo(() => {
    if (!selectedCampusObj) return "Toàn bộ";
    const name = (selectedCampusObj.campusName || "").toUpperCase();
    if (name.includes("CS1") || name.includes("RIVERSIDE")) return "CS1 - Riverside";
    if (name.includes("CS2") || name.includes("CENTRAL")) return "CS2 - Central";
    if (name.includes("CS3") || name.includes("GLOBAL")) return "CS3 - Global";
    if (name.includes("CS4") || name.includes("HILL")) return "CS4 - Hill";
    if (name.includes("CS5") || name.includes("BEACH")) return "CS5 - Beach";
    return selectedCampusObj.campusName;
  }, [selectedCampusObj]);

  const campusEmails = useMemo(() => {
    if (!selectedCampusObj) {
      return {
        tuyensinh: "bankhaothi@skylineschool.edu.vn",
        giaovu: "giaovu.cs3@skylineschool.edu.vn",
        gdcs: "gdcs.cs3@skylineschool.edu.vn",
        bghmn: "bghmn.cs3@skylineschool.edu.vn"
      };
    }

    const name = (selectedCampusObj.campusName || "").toUpperCase();
    let suffix = "cs3";
    if (name.includes("CS1") || name.includes("RIVERSIDE")) suffix = "cs1";
    if (name.includes("CS2") || name.includes("CENTRAL")) suffix = "cs2";
    if (name.includes("CS3") || name.includes("GLOBAL")) suffix = "cs3";
    if (name.includes("CS4") || name.includes("HILL")) suffix = "cs4";
    if (name.includes("CS5") || name.includes("BEACH")) suffix = "cs5";

    let gdcsEmail = "";
    if (selectedCampusObj.manager?.email && selectedCampusObj.manager.email.includes("@")) {
      gdcsEmail = selectedCampusObj.manager.email;
    }
    if (!gdcsEmail && teachers && teachers.length > 0) {
      if (selectedCampusObj.manager?.fullName) {
        const mgrTeacher = teachers.find((t: any) => t.teacherName === selectedCampusObj.manager?.fullName || t.user?.fullName === selectedCampusObj.manager?.fullName);
        if (mgrTeacher?.email) {
          gdcsEmail = mgrTeacher.email;
        }
      }
      if (!gdcsEmail) {
        const gdcsTeacher = teachers.find((t: any) => 
          t.campusId === selectedCampusObj.id && 
          (t.user?.role === "GDCS" || t.user?.role === "GD_CS" || 
           t.departmentRel?.name?.toUpperCase()?.includes("GIÁM ĐỐC") ||
           t.departmentRel?.name?.toUpperCase()?.includes("GĐCS"))
        );
        if (gdcsTeacher?.email) {
          gdcsEmail = gdcsTeacher.email;
        }
      }
    }
    if (!gdcsEmail) {
      gdcsEmail = "gdcs." + suffix + "@skylineschool.edu.vn";
    }

    let giaovuEmail = "giaovu." + suffix + "@skylineschool.edu.vn";
    if (teachers && teachers.length > 0) {
      const foundGiaovu = teachers.find((t: any) => 
        t.campusId === selectedCampusObj.id && 
        (t.departmentRel?.name?.toUpperCase()?.includes("GIÁO VỤ") || 
         t.user?.role?.includes("GIAO_VU") || 
         t.user?.role?.includes("GD_CS"))
      );
      if (foundGiaovu?.email) {
        giaovuEmail = foundGiaovu.email;
      } else if (foundGiaovu?.user?.email) {
        giaovuEmail = foundGiaovu.user.email;
      }
    }

    let tuyensinhEmail = "tuyensinh." + suffix + "@skylineschool.edu.vn";
    if (teachers && teachers.length > 0) {
      const foundTuvan = teachers.find((t: any) => 
        t.campusId === selectedCampusObj.id && 
        (t.departmentRel?.name?.toUpperCase()?.includes("TƯ VẤN") || 
         t.departmentRel?.name?.toUpperCase()?.includes("TUYỂN SINH"))
      );
      if (foundTuvan?.email) {
        tuyensinhEmail = foundTuvan.email;
      } else if (foundTuvan?.user?.email) {
        tuyensinhEmail = foundTuvan.user.email;
      }
    }

    let bghmnEmail = "bghmn." + suffix + "@skylineschool.edu.vn";
    if (teachers && teachers.length > 0) {
      const foundBgh = teachers.find((t: any) => 
        t.campusId === selectedCampusObj.id && 
        (t.user?.role === "BGH MN" || t.user?.role === "BGH_MN" || t.user?.role === "BGH" ||
         t.departmentRel?.name?.toUpperCase()?.includes("BAN GIÁM HIỆU") || 
         t.departmentRel?.name?.toUpperCase()?.includes("BGH"))
      );
      if (foundBgh?.email) {
        bghmnEmail = foundBgh.email;
      } else if (foundBgh?.user?.email) {
        bghmnEmail = foundBgh.user.email;
      }
    }

    return {
      tuyensinh: tuyensinhEmail,
      giaovu: giaovuEmail,
      gdcs: gdcsEmail,
      bghmn: bghmnEmail
    };
  }, [selectedCampusObj, teachers]);

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
      bghmn: {
        CS1: "bghmn.cs1@skylineschool.edu.vn",
        CS2: "bghmn.cs2@skylineschool.edu.vn",
        CS3: "bghmn.cs3@skylineschool.edu.vn",
        CS4: "bghmn.cs4@skylineschool.edu.vn",
        CS5: "bghmn.cs5@skylineschool.edu.vn",
      },
      cc: "cc@skylineschool.edu.vn"
    };

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
          if (deptName.includes('ban giám hiệu') || deptName.includes('bgh') || t.user?.role === "BGH MN" || t.user?.role === "BGH_MN") {
            map.bghmn[csCode] = t.email;
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
    ...Object.values(EMAIL_MAP.bghmn),
    EMAIL_MAP.cc
  ], [EMAIL_MAP]);

  const [cSearch, setCSearch] = useState("");
  const [cSelected, setCSelected] = useState<string[]>([]);
  const [cModal, setCModal] = useState(false);
  const [editC, setEditC] = useState<PreschoolChild | null>(null);
  const [cForm, setCForm] = useState({ studentCode: "", fullName: "", dateOfBirth: "", gender: "", grade: "", admissionCampus: "", surveyFormType: "", batchId: "", admissionResult: "" });
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Configs
  const [configs, setConfigs] = useState<AssessmentConfig[]>([]);
  const [cfgLoading, setCfgLoading] = useState(false);
  const [cfgSelected, setCfgSelected] = useState<string[]>([]);
  const [cfgModal, setCfgModal] = useState(false);
  const [editCfg, setEditCfg] = useState<AssessmentConfig | null>(null);
  const [cfgForm, setCfgForm] = useState({ categoryType: "", code: "", name: "" });

  // Reports
  const [rptPeriodId, setRptPeriodId] = useState("");
  const [rptBatchId, setRptBatchId] = useState("all");

  // Report Config (Cấu hình báo cáo theo cơ sở)
  const [rcCampusId, setRcCampusId] = useState("");
  const [rcReportType, setRcReportType] = useState("thu_moi");
  const [rcTitle, setRcTitle] = useState("THƯ MỜI");
  const [rcLogo, setRcLogo] = useState("");
  const [rcSignature, setRcSignature] = useState("");
  const [rcBackground, setRcBackground] = useState("");
  const [rcDirectorName, setRcDirectorName] = useState("");
  const [rcContent, setRcContent] = useState("");
  const [rcFooter, setRcFooter] = useState("");

  // Assignments States
  const [aPeriodId, setAPeriodId] = useState(cPeriodId || "");
  const [aBatchId, setABatchId] = useState(cBatchId || "all");
  const [aGrades, setAGrades] = useState<string[]>(["18 đến 24 tháng"]);
  const [aDeptId, setADeptId] = useState("");
  const [aSelectedTeachers, setASelectedTeachers] = useState([]);
  const [aSearchTeacher, setASearchTeacher] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [aSaving, setASaving] = useState(false);
  const [aNotifyingId, setANotifyingId] = useState(null);
  const [aNotifyingAll, setANotifyingAll] = useState(false);
  const [evalAssignments, setEvalAssignments] = useState<any[]>([]);

  // Probationary Assessment States
  const [probModal, setProbModal] = useState(false);
  const [probStudent, setProbStudent] = useState<any | null>(null);
  const [probScores, setProbScores] = useState<Record<string, { result: string; note: string }>>({});
  const [probPeriod, setProbPeriod] = useState("");
  const [probClass, setProbClass] = useState("");
  const [probTeacher, setProbTeacher] = useState("");
  const [probResult, setProbResult] = useState("");
  const [probComment, setProbComment] = useState("");
  const [savingProb, setSavingProb] = useState(false);

    const defaultPreschoolCongratulations = `Chúc mừng con đã vượt qua kỳ khảo sát đầu vào lớp {{grade}} hệ {{surveyFormType}} năm học {{academicYear}}. Con đã chính thức đặt bước chân đầu tiên trên con đường trở thành học sinh của Trường Mầm non Sky-Line (Cơ sở {{admissionCampus}}) – một cột mốc quan trọng trong hành trình phát triển của con.

Thầy cô tại Sky-Line vui mừng chào đón con đến với ngôi trường hạnh phúc, nơi không chỉ cung cấp kiến thức mà còn giúp con phát triển toàn diện cả về năng lực và nhân cách. Chúng tôi tin rằng, con sẽ có những trải nghiệm thật tuyệt vời và đáng nhớ trong những năm học sắp tới.

Nhà trường hy vọng rằng, với sự nhanh nhẹn và đáng yêu của mình, con sẽ là một mảnh ghép sắc màu góp phần làm phong phú thêm bức tranh học đường tại Sky-Line. Nơi đây, con sẽ được học hỏi những điều mới lạ, được chơi đùa cùng các bạn và được các cô giáo yêu thương chăm sóc.

Chúc con có những năm tháng học tập đầy ý nghĩa và trải nghiệm thú vị tại Sky-Line. Hãy luôn giữ vững niềm đam mê học hỏi và khát khao khám phá thế giới xung quanh con nhé!`;

    const defaultPreschoolInvitation = `Hội đồng Tuyển sinh Hệ thống Giáo dục Sky-Line trân trọng gửi lời chào và lời chúc sức khỏe, an khang đến Quý phụ huynh cùng gia đình.

Nhằm tạo điều kiện tốt nhất để nhà trường hiểu rõ hơn về năng lực tư duy, ngôn ngữ cũng như thiên hướng phát triển tự nhiên của học sinh, qua đó xây dựng lộ trình rèn luyện tối ưu nhất, chúng tôi trân trọng kính mời Quý phụ huynh cùng học sinh tham gia buổi Khảo sát Năng lực Đầu vào hệ {{surveyFormType}} năm học {{academicYear}}.

• Thời gian khảo sát: Theo lịch hẹn cụ thể được sắp xếp từ Ban Tuyển sinh.
• Nội dung khảo sát: Đánh giá tư duy ngôn ngữ, tư duy logic tự nhiên và khả năng tương tác xã hội phù hợp theo độ tuổi.

Sự hiện diện và đồng hành của Quý phụ huynh cùng học sinh là niềm hân hạnh lớn cho Sky-Line, giúp nhà trường có sự chuẩn bị chu đáo nhất đón chào các em gia nhập mái trường hạnh phúc của chúng ta.

Trân trọng kính mời Quý phụ huynh và các em học sinh!`;

    const defaultPreschoolCommitment = `Hệ thống Giáo dục Sky-Line chúc mừng con đã vượt qua kỳ khảo sát đầu vào lớp {{grade}} hệ {{surveyFormType}} năm học {{academicYear}}. Để tạo điều kiện tốt nhất cho hành trình phát triển toàn diện của học sinh tại trường, Nhà trường và Gia đình cùng thống nhất ký kết Bản Cam kết rèn luyện này.\n\nGia đình cam kết thực hiện đầy đủ các nội dung sau:\n1. Đồng hành cùng con trong các hoạt động rèn luyện thói quen tự lập, nề nếp sinh hoạt và kỹ năng tự phục vụ cơ bản phù hợp với độ tuổi mầm non.\n2. Phối hợp chặt chẽ với giáo viên chủ nhiệm trong việc theo dõi sức khỏe, tâm lý của con và tích cực trao đổi thông tin thường xuyên.\n3. Tham gia đầy đủ các chương trình hội thảo, hoạt động trải nghiệm dành cho Phụ huynh và học sinh do nhà trường tổ chức.\n\nBản cam kết được thực hiện dưới sự đồng thuận của cả hai bên và có giá trị kể từ ngày ký.`;

  const currentAcademicYearName = useMemo(() => {
    const ay = academicYears.find(a => a.id === yearId);
    return ay ? ay.name : "2025-2026";
  }, [academicYears, yearId]);

      const renderPreschoolTemplate = (template: string, student: any) => {
    if (!template) return "";
    const rawGrade = student?.grade || "";
    const cleanCampus = (student?.admissionCampus || "").replace("Cơ sở ", "");
    return template
      .replace(/\{\{fullName\}\}/g, student?.fullName || "")
      .replace(/\{\{grade\}\}/g, rawGrade)
      .replace(/\{\{surveyFormType\}\}/g, student?.surveyFormType || "Chất lượng cao")
      .replace(/\{\{admissionCampus\}\}/g, cleanCampus)
      .replace(/\{\{academicYear\}\}/g, currentAcademicYearName)
      .replace(/\{\{hocKy\}\}/g, student?.hocKy || "1")
      .replace(/\{\{signatureName\}\}/g, student?.signatureName || "");
  };

  const studentCampusConfig = useMemo(() => {
    if (typeof window === "undefined" || !selectedReportStudent) return null;

    const effCampus = selectedReportStudent.admissionCampus;
    let targetCampus = campuses.find(c => isPreschoolCampusMatch(effCampus, c.campusCode, c.campusName));
    
    if (!targetCampus && campuses.length > 0) {
      targetCampus = campuses[0];
    }
    
    if (targetCampus) {
      const typeKey = (isInvitation ? 'thu_moi' : isCommitment ? 'cam_ket_hoc_tap' : 'thu_chuc_mung') + '_preschool';
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
      
      const mergedTitle = globalData.title || campusData.title || (isInvitation ? "THƯ MỜI" : isCommitment ? "BẢN CAM KẾT HỌC TẬP" : "THƯ CHÚC MỪNG");
      
      const mLogo = localStorage.getItem('report_config_master_logo');
      const mBg = localStorage.getItem('report_config_master_background');
      const mFooter = localStorage.getItem('report_config_master_footer');
      const mSig = localStorage.getItem('report_config_master_signature');

      const mergedLogo = mLogo ? mLogo : (globalData.logo || campusData.logo || "");
      const mergedBackground = mBg ? mBg : (globalData.background || campusData.background || "");
      const mergedContent = globalData.content || campusData.content || "";
      const mergedFooter = mFooter ? mFooter : (globalData.footer || campusData.footer || "");
      
      const campusSig = localStorage.getItem('report_config_signature_' + targetCampus.id) || campusData.signature || mSig || "";
      const campusDir = localStorage.getItem('report_config_director_' + targetCampus.id) || campusData.directorName || targetCampus.manager?.fullName || (targetCampus ? getCampusDefaultManager(targetCampus.campusName || targetCampus.campusCode || "") : "Trần Thị Thanh");
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
  }, [selectedReportStudent, campuses, isInvitation, isCommitment]);

    const campusTitleSuffix = useMemo(() => {
    if (!selectedReportStudent) return "GLOBAL";
    const effCampus = selectedReportStudent.admissionCampus || "";
    const clean = effCampus.toUpperCase();
    if (clean.includes("CS1") || clean.includes("RIVERSIDE")) return "RIVERSIDE";
    if (clean.includes("CS2") || clean.includes("CENTRAL")) return "CENTRAL";
    if (clean.includes("CS3") || clean.includes("GLOBAL")) return "GLOBAL";
    if (clean.includes("CS4") || clean.includes("HILL")) return "HILL";
    if (clean.includes("CS5") || clean.includes("BEACH")) return "BEACH";
    return "GLOBAL";
  }, [selectedReportStudent]);

  // Suffix tên cơ sở từ dropdown "Chọn cơ sở áp dụng" trong config panel
  const rcCampusTitleSuffix = useMemo(() => {
    if (!rcCampusId) return "";
    const campus = campuses?.find(c => c.id === rcCampusId);
    const name = (campus?.campusName || campus?.campusCode || "").toUpperCase();
    if (name.includes("CS1") || name.includes("RIVERSIDE")) return "RIVERSIDE";
    if (name.includes("CS2") || name.includes("CENTRAL")) return "CENTRAL";
    if (name.includes("CS3") || name.includes("GLOBAL")) return "GLOBAL";
    if (name.includes("CS4") || name.includes("HILL")) return "HILL";
    if (name.includes("CS5") || name.includes("BEACH")) return "BEACH";
    return name.replace("SKY-LINE", "").replace("SKYLINE", "").trim() || "";
  }, [rcCampusId, campuses]);

  const studentSchoolName = useMemo(() => {
    if (!selectedReportStudent) return "TRƯỜNG MẦM NON SKY-LINE";
    const effCampus = selectedReportStudent.admissionCampus || "";
    const clean = effCampus.toUpperCase();
    if (clean.includes("HILL")) {
      return "TRƯỜNG MẦM NON SKY-LINE HILL";
    }
    return "TRƯỜNG MẦM NON SKY-LINE";
  }, [selectedReportStudent]);

  const formattedLetterDate = useMemo(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `Đà Nẵng, ngày ${day} tháng ${month} năm ${year}`;
  }, []);

  // Age & Grade auto-verifier helper
  const getMonthsAndSuggestGrade = useCallback((dobStr: string, batchId: string) => {
    if (!dobStr) return { months: null, suggest: "", surveyDateStr: "" };
    
    // 1. Find the survey date
    let surveyDate = new Date();
    let source = "Ngày hôm nay";
    
    if (batchId) {
      const selectedBatch = periods.flatMap(p => p.batches || []).find(b => b.id === batchId);
      if (selectedBatch?.startDate) {
        surveyDate = new Date(selectedBatch.startDate);
        source = `Ngày bắt đầu đợt: ${surveyDate.toLocaleDateString("vi-VN")}`;
      }
    } else if (periods.find(p => p.id === cPeriodId)?.startDate) {
      const pStart = periods.find(p => p.id === cPeriodId)?.startDate;
      if (pStart) {
        surveyDate = new Date(pStart);
        source = `Ngày bắt đầu kỳ: ${surveyDate.toLocaleDateString("vi-VN")}`;
      }
    } else {
      source = `Ngày hôm nay: ${surveyDate.toLocaleDateString("vi-VN")}`;
    }

    const birth = new Date(dobStr);
    if (isNaN(birth.getTime())) return { months: null, suggest: "", surveyDateStr: "" };

    // 2. Calculate months difference precisely
    let months = (surveyDate.getFullYear() - birth.getFullYear()) * 12 + (surveyDate.getMonth() - birth.getMonth());
    if (surveyDate.getDate() < birth.getDate()) {
      months--;
    }

    // 3. Suggest grade
    let suggest = "";
    if (months >= 18 && months <= 24) suggest = "18 đến 24 tháng";
    else if (months > 24 && months <= 36) suggest = "24 đến 36 tháng";
    else if (months > 36 && months <= 48) suggest = "Mẫu giáo bé";
    else if (months > 48 && months <= 60) suggest = "Mẫu giáo nhỡ";
    else if (months > 60) suggest = "Mẫu giáo lớn";

    return { months, suggest, surveyDateStr: source };
  }, [periods, cPeriodId]);

  const ageInfo = useMemo(() => {
    return getMonthsAndSuggestGrade(cForm.dateOfBirth, cForm.batchId);
  }, [cForm.dateOfBirth, cForm.batchId, getMonthsAndSuggestGrade]);

  const fetchPeriods = useCallback(async () => {
    if (!yearId) return;
    setPLoading(true);
    try {
      const r = await fetch(`/api/preschool-input-assessments?academicYearId=${yearId}`);
      if (r.ok) { const d: Period[] = await r.json(); setPeriods(d); if (!cPeriodId && d.length > 0) { setCPeriodId(d[0].id); setRptPeriodId(d[0].id); } }
    } catch (e) {
      console.error("fetchPeriods error:", e);
    } finally { setPLoading(false); }
  }, [yearId, cPeriodId]);

  useEffect(() => { fetchPeriods(); }, [fetchPeriods]);

  const fetchChildren = useCallback(async () => {
    if (!cPeriodId) return;
    setCLoading(true);
    try {
      let url = `/api/preschool-input-assessment-students?periodId=${cPeriodId}`;
      if (cBatchId) url += `&batchId=${cBatchId}`;
      const r = await fetch(url);
      if (r.ok) setChildren(await r.json());
    } catch (e) {
      console.error("fetchChildren error:", e);
    } finally { setCLoading(false); }
  }, [cPeriodId, cBatchId]);

  useEffect(() => { if (tab === "children") fetchChildren(); }, [tab, fetchChildren]);

  const fetchConfigs = useCallback(async () => {
    setCfgLoading(true);
    setCfgSelected([]);
    try { const r = await fetch("/api/preschool-assessment-configs"); if (r.ok) setConfigs(await r.json()); } catch (e) { console.error("fetchConfigs error:", e); } finally { setCfgLoading(false); }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  // Dev Assess fetches & actions
  const fetchDevAreas = useCallback(async (ageGroup?: string, t?: string) => {
    setDevLoading(true);
    try {
      const currentType = t || devType || "INPUT";
      let url = `/api/preschool-dev-areas?type=${currentType}`;
      if (ageGroup) url += `&ageGroup=${encodeURIComponent(ageGroup)}`;
      const r = await fetch(url);
      if (r.ok) setDevAreas(await r.json());
    } catch (e) {
      console.error("fetchDevAreas error:", e);
    } finally { setDevLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === "devAssess" && devTab === "manage") {
      fetchDevAreas(ageGroupFilter, devType);
    }
  }, [tab, devTab, ageGroupFilter, fetchDevAreas, devType]);

  const fetchStudentSummaries = useCallback(async () => {
    if (!cPeriodId) return;
    setSumLoading(true);
    try {
      let url = `/api/preschool-dev-scores?periodId=${cPeriodId}`;
      if (cBatchId) url += `&batchId=${cBatchId}`;
      const r = await fetch(url);
      if (r.ok) setStudentSummaries(await r.json());
    } catch (e) {
      console.error("fetchStudentSummaries error:", e);
    } finally { setSumLoading(false); }
  }, [cPeriodId, cBatchId]);

  useEffect(() => {
    if (tab === "devAssess" && (devTab === "assess" || devTab === "xetDuyet" || devTab === "dgkqHocThu" || devTab === "xuatThuChucMung")) {
      fetchStudentSummaries();
    }
  }, [tab, devTab, fetchStudentSummaries]);

  const aGradesStr = aGrades.join(",");
  // Assignments Callbacks & Effects
  const fetchAssignments = useCallback(async () => {
    if (!aPeriodId) return;
    setAssignLoading(true);
    try {
      let url = `/api/preschool-input-assessment-assignments?periodId=${aPeriodId}`;
      if (aBatchId && aBatchId !== "all") {
        url += `&batchId=${aBatchId}`;
      } else if (aBatchId === "all") {
        url += `&batchId=all`;
      }
      if (aGradesStr) {
        url += `&grade=${encodeURIComponent(aGradesStr)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
        const assignedUserIds = data.map((a) => a.userId);
        setASelectedTeachers(assignedUserIds);
      }
    } catch (e) {
      console.error(e);
      notify("Lỗi khi tải danh sách phân công", "err");
    } finally {
      setAssignLoading(false);
    }
  }, [aPeriodId, aBatchId, aGradesStr]);

  useEffect(() => {
    if (tab === "assignments") {
      fetchAssignments();
    }
  }, [tab, fetchAssignments]);

  useEffect(() => {
    if (cPeriodId) {
      setAPeriodId(cPeriodId);
    }
  }, [cPeriodId]);

  useEffect(() => {
    if (cBatchId) {
      setABatchId(cBatchId);
    }
  }, [cBatchId]);

  const saveAssignments = async () => {
    if (!aPeriodId || aGrades.length === 0) return notify("Vui lòng chọn đầy đủ Kỳ khảo sát và ít nhất một Nhóm tuổi", "err");
    setASaving(true);
    try {
      const res = await fetch("/api/preschool-input-assessment-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ASSIGN",
          periodId: aPeriodId,
          batchId: aBatchId,
          grade: aGrades,
          userIds: aSelectedTeachers
        })
      });
      if (res.ok) {
        notify("Lưu phân công giáo viên thành công!");
        fetchAssignments();
      } else {
        notify("Lỗi khi lưu phân công", "err");
      }
    } catch (e) {
      console.error(e);
      notify("Có lỗi xảy ra", "err");
    } finally {
      setASaving(false);
    }
  };

  const sendTeacherNotification = async (assignmentId, teacherName) => {
    setANotifyingId(assignmentId);
    try {
      const res = await fetch("/api/preschool-input-assessment-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "NOTIFY_SINGLE",
          assignmentId
        })
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.sentCount > 0) {
          notify(`Đã gửi email thông báo cho GV ${teacherName}!`);
        } else {
          notify(`Lỗi gửi email: ${result.errors?.[0] || "Không gửi được email"}`, "err");
        }
      } else {
        notify("Lỗi kết nối gửi thông báo", "err");
      }
    } catch (e) {
      console.error(e);
      notify("Lỗi gửi thông báo", "err");
    } finally {
      setANotifyingId(null);
    }
  };

  const sendAllNotifications = async () => {
    if (assignments.length === 0) return notify("Không có giáo viên nào để gửi thông báo", "err");
    setANotifyingAll(true);
    try {
      const res = await fetch("/api/preschool-input-assessment-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "NOTIFY_ALL",
          periodId: aPeriodId,
          batchId: aBatchId,
          grade: aGrades
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
      notify("Lỗi gửi thông báo", "err");
    } finally {
      setANotifyingAll(false);
    }
  };

  const deleteAssignment = async (id, teacherName) => {
    try {
      const res = await fetch(`/api/preschool-input-assessment-assignments?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        notify(`Đã hủy phân công cho GV ${teacherName}`);
        fetchAssignments();
      } else {
        notify("Lỗi khi hủy phân công", "err");
      }
    } catch (e) {
      console.error(e);
      notify("Lỗi", "err");
    }
  };

  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [sendingNotifyId, setSendingNotifyId] = useState<string | null>(null);

  const sendApprovalNotification = async (studentId: string) => {
    setSendingNotifyId(studentId);
    try {
      const res = await fetch("/api/preschool-input-assessment-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEND_APPROVAL_NOTIFICATION",
          studentId
        })
      });
      if (res.ok) {
        const data = await res.json();
        notify(`Đã gửi yêu cầu duyệt tới BGH & GĐCS của cơ sở ${data.campus || "học sinh"} thành công!`);
      } else {
        const errorData = await res.json();
        notify(errorData.error || "Gửi yêu cầu thất bại", "err");
      }
    } catch (e) {
      console.error(e);
      notify("Có lỗi xảy ra khi gửi yêu cầu", "err");
    } finally {
      setSendingNotifyId(null);
    }
  };

  const sendTuVanEmail = async (studentId: string) => {
    setSendingEmailId(studentId);
    try {
      const res = await fetch("/api/preschool-input-assessment-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEND_REPORT_EMAIL",
          studentId
        })
      });
      if (res.ok) {
        const data = await res.json();
        notify(`Đã gửi báo cáo thành công tới ${data.email || "Tư vấn tuyển sinh cơ sở"}!`);
      } else {
        const errorData = await res.json();
        notify(errorData.error || "Gửi email thất bại", "err");
      }
    } catch (e) {
      console.error(e);
      notify("Có lỗi xảy ra khi gửi email", "err");
    } finally {
      setSendingEmailId(null);
    }
  };

  const openEvaluation = async (student: any) => {
    setEvalStudent(student);
    setStudentScores({});
    setEvalAssignments([]);
    setDevProfComment(student.devProfessionalComment || "");
    setDevPsyComment(student.devPsychologyComment || "");
    setDevNote(student.devImportantNote || "");
    setDevResult(student.devAssessmentResult || "");
    setBghApprovalStatus(student.bghApprovalStatus || "");
    setBghApprovalComment(student.bghApprovalComment || "");
    setGdcsApprovalStatus(student.gdcsApprovalStatus || "");
    setGdcsApprovalComment(student.gdcsApprovalComment || "");
    setEvalModal(true);
    setDevLoading(true);
    try {
      const ageGroup = student.grade || "18 đến 24 tháng";
      const areasRes = await fetch(`/api/preschool-dev-areas?type=INPUT&ageGroup=${encodeURIComponent(ageGroup)}`);
      if (areasRes.ok) {
        setDevAreas(await areasRes.json());
      }
      const scoresRes = await fetch(`/api/preschool-dev-scores?studentId=${student.id}`);
      if (scoresRes.ok) {
        const scoredList = await scoresRes.json();
        const scoreMap: Record<string, { result: string; note: string }> = {};
        for (const sc of scoredList) {
          scoreMap[sc.criteriaId] = { result: sc.result, note: sc.note || "" };
        }
        setStudentScores(scoreMap);
      }
      const targetPeriodId = student.periodId || cPeriodId;
      const assignRes = await fetch(`/api/preschool-input-assessment-assignments?periodId=${targetPeriodId}`);
      if (assignRes.ok) {
        setEvalAssignments(await assignRes.json());
      }
    } catch (e) {
      console.error(e);
      notify("Lỗi khi tải thông tin đánh giá", "err");
    } finally {
      setDevLoading(false);
    }
  };

  const printCongratulatoryLetter = (student: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      notify("Vui lòng cho phép mở cửa sổ bật lên (popup) để in thư chúc mừng", "err");
      return;
    }

    const dob = student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN") : "—";
    const isProbationPass = student.probationaryResult === "DAT";
    const resultLabel = isProbationPass ? "ĐẠT - SAU HỌC THỬ" : "ĐẠT - MIỄN HỌC THỬ";
    const descText = isProbationPass 
      ? `Bé đã hoàn thành xuất sắc thời gian học thử thực nghiệm và chính thức đủ điều kiện nhập học tại nhà trường. Đây là một kết quả tuyệt vời, ghi nhận sự phát triển và thích nghi xuất sắc toàn diện về thể chất, nhận thức, ngôn ngữ và kỹ năng xã hội của bé.`
      : `Bé đã chính thức đủ điều kiện nhập học trực tiếp và được <span class="highlight">Miễn thời gian Học thử thực nghiệm</span> tại nhà trường. Đây là một kết quả tuyệt vời, ghi nhận sự phát triển xuất sắc toàn diện về thể chất, nhận thức, ngôn ngữ và kỹ năng xã hội của bé.`;
    
    printWindow.document.write(`
      <html>
      <head>
        <title>Thư Chúc Mừng - ${student.fullName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            background-color: #ffffff;
            color: #1e293b;
            margin: 0;
            padding: 40px;
            display: flex;
            justify-content: center;
          }
          .container {
            width: 100%;
            max-width: 800px;
            border: 4px double #4f46e5;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
            background: radial-gradient(circle at top left, #faf5ff 0%, #ffffff 100%);
            position: relative;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: 900;
            color: #1e1b4b;
            letter-spacing: -1px;
            margin-bottom: 5px;
          }
          .subtitle {
            font-size: 10px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .title {
            text-align: center;
            font-size: 28px;
            font-weight: 900;
            color: #4f46e5;
            margin: 20px 0;
            letter-spacing: -0.5px;
            text-transform: uppercase;
          }
          .content {
            font-size: 15px;
            line-height: 1.8;
            color: #334155;
            margin-bottom: 40px;
          }
          .highlight {
            font-weight: 800;
            color: #1e293b;
          }
          .success-badge {
            display: inline-block;
            background-color: #f0fdf4;
            color: #16a34a;
            border: 1px solid #bbf7d0;
            padding: 2px 10px;
            border-radius: 9999px;
            font-weight: 800;
            font-size: 13px;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
          }
          .info-table td {
            padding: 10px 15px;
            border: 1px solid #e2e8f0;
            font-size: 14px;
          }
          .info-table td.label {
            font-weight: 600;
            color: #64748b;
            width: 30%;
            background-color: #f8fafc;
          }
          .info-table td.val {
            font-weight: 700;
            color: #0f172a;
          }
          .signatures {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
          }
          .signature-box {
            text-align: center;
            width: 40%;
          }
          .signature-title {
            font-size: 12px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 60px;
          }
          .signature-name {
            font-weight: 800;
            color: #1e293b;
            font-size: 14px;
          }
          @media print {
            body {
              padding: 0;
            }
            .container {
              box-shadow: none;
              border: 4px double #000000;
              background: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">SKY-LINE SYSTEM</div>
            <div class="subtitle">Hệ thống Giáo dục Sky-Line</div>
          </div>
          <div class="title">Thư Chúc Mừng Nhập Học</div>
          <div class="content">
            <p>Kính gửi Quý phụ huynh học sinh <span class="highlight">${student.fullName}</span>,</p>
            <p>Ban Giám Hiệu Hệ thống Giáo dục Mầm non Sky-Line trân trọng gửi lời chúc mừng nồng nhiệt nhất đến Gia đình và Bé. Dựa trên kết quả Khảo sát phát triển toàn diện của trẻ và kết quả phê duyệt chính thức từ Hội đồng Tuyển sinh, nhà trường trân trọng thông báo:</p>
            
            <table class="info-table">
              <tr>
                <td class="label">Họ và tên học sinh</td>
                <td class="val">${student.fullName}</td>
              </tr>
              <tr>
                <td class="label">Mã học sinh</td>
                <td class="val">${student.studentCode}</td>
              </tr>
              <tr>
                <td class="label">Ngày sinh</td>
                <td class="val">${dob}</td>
              </tr>
              <tr>
                <td class="label">Nhóm tuổi tuyển sinh</td>
                <td class="val">${student.grade || "—"}</td>
              </tr>
              <tr>
                <td class="label">Cơ sở đăng ký học</td>
                <td class="val">${student.admissionCampus || "—"}</td>
              </tr>
              <tr>
                <td class="label">Kết quả xét duyệt</td>
                <td class="val"><span class="success-badge">${resultLabel}</span></td>
              </tr>
            </table>

            <p>${descText}</p>
            <p>Nhà trường xin kính mời Quý phụ huynh liên hệ Bộ phận Tuyển sinh tại Cơ sở để hoàn tất thủ tục nhập học chính thức cho bé theo đúng thời gian quy định.</p>
            <p>Sky-Line rất vinh hạnh được đồng hành cùng Gia đình trên hành trình nâng bước và nuôi dưỡng những năm tháng đầu đời tươi đẹp nhất của bé!</p>
          </div>
          <div class="signatures">
            <div class="signature-box" style="visibility: hidden;">
              <div class="signature-title">Người lập phiếu</div>
            </div>
            <div class="signature-box">
              <div class="signature-title">HỘI ĐỒNG TUYỂN SINH</div>
              <div class="signature-name">Đại diện Hội đồng</div>
            </div>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };


  const printProbationaryAssessment = async (student: any) => {
    notify("Đang chuẩn bị phiếu in...", "info");
    try {
      const ageGroup = student.grade || "18 đến 24 tháng";
      const areasRes = await fetch(`/api/preschool-dev-areas?type=PROBATION&ageGroup=${encodeURIComponent(ageGroup)}`);
      let loadedAreas: any[] = [];
      if (areasRes.ok) {
        loadedAreas = await areasRes.json();
      }
      
      let scores: Record<string, any> = {};
      if (student.probationaryScoreText) {
        try {
          scores = JSON.parse(student.probationaryScoreText);
        } catch (e) {
          console.error(e);
        }
      } else if (probStudent && probStudent.id === student.id) {
        scores = probScores;
      }
      
      const probPeriodVal = student.probationaryPeriod || (probStudent && probStudent.id === student.id ? probPeriod : "") || "";
      const probClassVal = student.probationaryClass || (probStudent && probStudent.id === student.id ? probClass : "") || "";
      const probTeacherVal = student.probationaryTeacher || (probStudent && probStudent.id === student.id ? probTeacher : "") || "";
      const probResultVal = student.probationaryResult || (probStudent && probStudent.id === student.id ? probResult : "") || "";
      const probCommentVal = student.probationaryComment || (probStudent && probStudent.id === student.id ? probComment : "") || "";

      const dob = student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN") : "—";
      
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        notify("Vui lòng cho phép mở cửa sổ bật lên (popup) để in phiếu", "err");
        return;
      }
      
      let tableRowsHtml = "";
      loadedAreas.forEach(area => {
        if (!area.criteria || area.criteria.length === 0) return;
        
        area.criteria.forEach((crit, critIdx) => {
          const score = scores[crit.id] || { result: "", note: "" };
          const check1 = score.result === "CHUA_THE_HIEN" ? "✓" : "";
          const check2 = score.result === "BAT_DAU_THE_HIEN" ? "✓" : "";
          const check3 = score.result === "THE_HIEN_TOT" ? "✓" : "";
          const noteText = score.note || "";
          
          tableRowsHtml += "<tr>";
          if (critIdx === 0) {
            tableRowsHtml += `<td class="area-cell" rowspan="${area.criteria.length}">${area.name}</td>`;
          }
          tableRowsHtml += `<td class="crit-cell">${crit.name}</td>`;
          tableRowsHtml += `<td class="check-cell">${check1}</td>`;
          tableRowsHtml += `<td class="check-cell">${check2}</td>`;
          tableRowsHtml += `<td class="check-cell">${check3}</td>`;
          tableRowsHtml += `<td class="note-cell">${noteText}</td>`;
          tableRowsHtml += "</tr>";
        });
      });

      if (!tableRowsHtml) {
        tableRowsHtml = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">Chưa có dữ liệu tiêu chí đánh giá cho nhóm tuổi này.</td></tr>`;
      }

      const conclusionText = probResultVal === "DAT" ? "Đạt" : probResultVal === "CHUA_DAT" ? "Chưa đạt" : "";
      const dotLines = `................................................................................................................................................................................................<br/>................................................................................................................................................................................................<br/>................................................................................................................................................................................................`;

      printWindow.document.write(`
        <html>
        <head>
          <title>Phiếu Đánh Giá Học Thử - ${student.fullName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap');
            body {
              font-family: 'Times New Roman', Times, serif;
              color: #000;
              margin: 0;
              padding: 40px;
              font-size: 14px;
              line-height: 1.5;
            }
            .print-container {
              max-width: 800px;
              margin: 0 auto;
              background: #ffffff;
            }
            .doc-title {
              text-align: center;
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .doc-subtitle {
              text-align: center;
              font-size: 14px;
              margin-bottom: 25px;
            }
            .student-info {
              margin-bottom: 20px;
              line-height: 2.2;
            }
            .assessment-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .assessment-table th, .assessment-table td {
              border: 1px solid #000;
              padding: 8px;
              vertical-align: middle;
            }
            .assessment-table th {
              background-color: #0da176;
              color: white;
              font-weight: bold;
              text-align: center;
              font-size: 14px;
            }
            .assessment-table td.area-cell {
              font-weight: bold;
              text-align: center;
              text-transform: uppercase;
              width: 15%;
            }
            .assessment-table td.crit-cell {
              width: 35%;
            }
            .assessment-table td.check-cell {
              text-align: center;
              font-weight: bold;
              width: 12%;
            }
            .assessment-table td.note-cell {
              width: 14%;
            }
            @media print {
              body { padding: 0; }
              .print-container { max-width: 100%; }
              .assessment-table th {
                background-color: #0da176 !important;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
                color: white !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="doc-title">PHIẾU ĐÁNH GIÁ HỌC THỬ</div>
            <div class="doc-subtitle">(Dành cho ${student.grade || "nhà trẻ 18 đến 24 tháng"})</div>

            <div class="student-info">
              Họ và tên trẻ: <span style="display:inline-block; width: 220px; border-bottom: 1px dotted #000; padding-left: 5px;">${student.fullName}</span> 
              Thời gian học thử: <span style="display:inline-block; width: 230px; border-bottom: 1px dotted #000; padding-left: 5px;">${probPeriodVal || ''}</span>
              <br/>
              Lớp học thử : <span style="display:inline-block; width: 220px; border-bottom: 1px dotted #000; padding-left: 5px;">${probClassVal || ''}</span> 
              Giáo viên: <span style="display:inline-block; width: 230px; border-bottom: 1px dotted #000; padding-left: 5px;">${probTeacherVal || ''}</span>
            </div>

            <table class="assessment-table">
              <thead>
                <tr>
                  <th colspan="2">NỘI DUNG ĐÁNH GIÁ</th>
                  <th colspan="3">KẾT QUẢ</th>
                  <th rowspan="2">GHI CHÚ</th>
                </tr>
                <tr>
                  <th>LĨNH VỰC</th>
                  <th>TIÊU CHÍ</th>
                  <th>Chưa<br/>thể hiện</th>
                  <th>Bắt đầu<br/>thể hiện</th>
                  <th>Thể hiện<br/>tốt</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
            </table>

            <div style="font-weight: bold; margin-bottom: 5px;">
              KẾT LUẬN SAU THỜI GIAN HỌC THỬ: <span style="font-weight: normal;">(Đạt / Chưa đạt; Ghi chú thêm):</span>
              <span style="font-weight: normal; margin-left: 10px;">${conclusionText}</span>
            </div>
            <div style="line-height: 2; margin-bottom: 30px;">
              ${probCommentVal ? probCommentVal.replace(/\n/g, '<br/>') : dotLines}
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (e) {
      console.error(e);
      notify("Lỗi hệ thống khi tải phiếu in", "err");
    }
  };

  const openProbationary = async (student: any) => {
    setProbStudent(student);
    setProbScores({});
    setProbPeriod(student.probationaryPeriod || "");
    setProbClass(student.probationaryClass || "");
    setProbTeacher(student.probationaryTeacher || "");
    setProbResult(student.probationaryResult || "");
    setProbComment(student.probationaryComment || "");
    setProbModal(true);
    setDevLoading(true);
    try {
      const ageGroup = student.grade || "18 đến 24 tháng";
      const areasRes = await fetch(`/api/preschool-dev-areas?type=PROBATION&ageGroup=${encodeURIComponent(ageGroup)}`);
      if (areasRes.ok) {
        setDevAreas(await areasRes.json());
      }
      if (student.probationaryScoreText) {
        try {
          const parsed = JSON.parse(student.probationaryScoreText);
          setProbScores(parsed);
        } catch (e) {
          console.error("Error parsing probationaryScoreText:", e);
        }
      }
    } catch (e) {
      console.error(e);
      notify("Lỗi khi tải thông tin đánh giá học thử", "err");
    } finally {
      setDevLoading(false);
    }
  };

  const saveProbationary = async () => {
    if (!probStudent) return;
    setSavingProb(true);
    try {
      const r = await fetch("/api/preschool-probationary-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: probStudent.id,
          probationaryScoreText: JSON.stringify(probScores),
          probationaryResult: probResult,
          probationaryComment: probComment,
          probationaryPeriod: probPeriod,
          probationaryClass: probClass,
          probationaryTeacher: probTeacher
        })
      });
      if (r.ok) {
        setProbModal(false);
        fetchStudentSummaries();
        notify("Đã lưu kết quả đánh giá học thử");
      } else {
        notify("Lỗi khi lưu kết quả đánh giá học thử", "err");
      }
    } catch (e) {
      console.error(e);
      notify("Lỗi hệ thống", "err");
    } finally {
      setSavingProb(false);
    }
  };

  const saveEvaluation = async () => {
    if (!evalStudent) return;
    setSavingEval(true);
    try {
      const scoresPayload = Object.entries(studentScores).map(([criteriaId, val]) => ({
        criteriaId,
        result: val.result,
        note: val.note
      }));
      const r = await fetch("/api/preschool-dev-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          studentId: evalStudent.id, 
          scores: scoresPayload, 
          devProfessionalComment: devProfComment, 
          devPsychologyComment: devPsyComment, 
          devImportantNote: devNote, 
          devAssessmentResult: devResult,
          bghApprovalStatus,
          bghApprovalComment,
          gdcsApprovalStatus,
          gdcsApprovalComment
        })
      });
      if (r.ok) {
        setEvalModal(false);
        fetchStudentSummaries();
        notify("Đã lưu kết quả đánh giá");
      } else {
        notify("Lỗi khi lưu đánh giá", "err");
      }
    } catch (e) {
      console.error(e);
      notify("Lỗi", "err");
    } finally {
      setSavingEval(false);
    }
  };

  const exportDevExcel = () => {
    if (studentSummaries.length === 0) return;
    try {
      const exportData = studentSummaries
        .filter(s => !cSearch || s.studentCode.toLowerCase().includes(cSearch.toLowerCase()) || s.fullName.toLowerCase().includes(cSearch.toLowerCase()))
        .map((s, idx) => ({
          "STT": idx + 1,
          "Mã bé": s.studentCode,
          "Họ và tên": s.fullName,
          "Ngày sinh": s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "—",
          "Giới tính": s.gender || "—",
          "Nhóm tuổi": s.grade || "—",
          "Cơ sở": s.admissionCampus || "—",
          "Thể chất": s.theChatSummary || "Chưa đánh giá",
          "Nhận thức": s.nhanThucSummary || "Chưa đánh giá",
          "Ngôn ngữ": s.ngonNguSummary || "Chưa đánh giá",
          "Tình cảm - Kỹ năng XH - TM": s.tinhCamXhTmSummary || "Chưa đánh giá",
          "Giáo viên đánh giá": s.teacherComment || "Chưa có nhận xét",
          "Duyệt BGH MN": s.bghApprovalStatus 
            ? `${s.bghApprovalStatus === "DAT_MIEN_HOC_THU" ? "Đạt - Miễn Học Thử" : s.bghApprovalStatus === "DAT_HOC_THU" ? "Đạt - Học Thử" : s.bghApprovalStatus === "DAT" ? "Đạt" : s.bghApprovalStatus === "KHONG_DAT" ? "Không đạt" : "Ý kiến khác"}${s.bghApprovalComment ? ` - Ý kiến: ${s.bghApprovalComment}` : ""}` 
            : "Chưa duyệt",
          "Duyệt GĐCS": s.gdcsApprovalStatus 
            ? `${s.gdcsApprovalStatus === "DAT" ? "Đạt" : s.gdcsApprovalStatus === "KHONG_DAT" ? "Không đạt" : "Ý kiến khác"}${s.gdcsApprovalComment ? ` - Ý kiến: ${s.gdcsApprovalComment}` : ""}` 
            : "Chưa duyệt",
          "Kết quả Duyệt": s.generalResult || "Chưa duyệt"
        }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      const maxLens = Object.keys(exportData[0] || {}).map(key => {
        let maxLen = key.length;
        for (const row of exportData) {
          const val = String((row as any)[key] || "");
          if (val.length > maxLen) maxLen = val.length;
        }
        return { wch: Math.min(Math.max(maxLen + 3, 10), 50) };
      });
      ws['!cols'] = maxLens;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Xet_Duyet_Hoc_Thu");
      XLSX.writeFile(wb, `Xet_Duyet_Hoc_Thu_Mam_Non_${new Date().toISOString().slice(0, 10)}.xlsx`);
      notify("Xuất Excel thành công!");
    } catch (e) {
      console.error(e);
      notify("Lỗi khi xuất Excel", "err");
    }
  };

  const openAddCriteria = (areaId: string) => {
    setEditCriteria(null);
    setCriteriaForm({ areaId, code: "", name: "", ageGroup: ageGroupFilter });
    setCriteriaModal(true);
  };

  const openEditCriteria = (crit: DevCriteria) => {
    setEditCriteria(crit);
    setCriteriaForm({ areaId: crit.areaId, code: crit.code, name: crit.name, ageGroup: crit.ageGroup });
    setCriteriaModal(true);
  };

  const saveCriteria = async () => {
    if (!criteriaForm.code.trim() || !criteriaForm.name.trim()) return notify("Cần nhập đầy đủ thông tin", "err");
    setSavingCriteria(true);
    try {
      const payload = editCriteria
        ? { action: "UPDATE_CRITERIA", id: editCriteria.id, name: criteriaForm.name, ageGroup: criteriaForm.ageGroup }
        : { action: "CREATE_CRITERIA", ...criteriaForm };
      const r = await fetch("/api/preschool-dev-areas", {
        method: editCriteria ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (r.ok) {
        setCriteriaModal(false);
        fetchDevAreas(ageGroupFilter);
        notify(editCriteria ? "Đã cập nhật tiêu chí" : "Đã thêm tiêu chí mới");
      } else {
        const data = await r.json();
        notify(data.error || "Có lỗi xảy ra", "err");
      }
    } catch (e) {
      console.error(e);
      notify("Lỗi", "err");
    } finally {
      setSavingCriteria(false);
    }
  };

  const doDeleteCriteria = async (id: string) => {
    try {
      const r = await fetch(`/api/preschool-dev-areas?type=criteria&id=${id}`, { method: "DELETE" });
      if (r.ok) {
        fetchDevAreas(ageGroupFilter);
        notify("Đã xóa tiêu chí");
      } else {
        notify("Lỗi khi xóa", "err");
      }
    } catch (e) {
      console.error(e);
      notify("Lỗi", "err");
    }
  };

  // Report Config useEffects and helpers
  useEffect(() => {
    if (campuses && campuses.length > 0 && !rcCampusId) {
      setRcCampusId(campuses[0].id);
    }
  }, [campuses, rcCampusId]);

  useEffect(() => {
    if (typeof window !== "undefined" && rcCampusId && rcReportType) {
      const selectedCampus = campuses.find(c => c.id === rcCampusId);
      const defaultManagerName = selectedCampus?.manager?.fullName || (selectedCampus ? getCampusDefaultManager(selectedCampus.campusName || selectedCampus.campusCode || "") : "");
      const typeKey = rcReportType + "_preschool";
      const savedCampus = localStorage.getItem('report_config_' + rcCampusId + '_' + typeKey);
      const savedGlobal = localStorage.getItem('report_config_global_' + typeKey);
      let campusData: any = {};
      let globalData: any = {};
      if (savedCampus) { try { campusData = JSON.parse(savedCampus); } catch (e) {} }
      if (savedGlobal) { try { globalData = JSON.parse(savedGlobal); } catch (e) {} }
      
      const mLogo = localStorage.getItem('report_config_master_logo');
      const mBg = localStorage.getItem('report_config_master_background');
      const mFooter = localStorage.getItem('report_config_master_footer');
      
      if (mLogo !== null && mLogo !== undefined) setRcLogo(mLogo);
      else if (globalData.logo || campusData.logo) setRcLogo(globalData.logo || campusData.logo || "");
      
      if (mBg !== null && mBg !== undefined) setRcBackground(mBg);
      else if (globalData.background || campusData.background) setRcBackground(globalData.background || campusData.background || "");
      
      if (mFooter !== null && mFooter !== undefined) setRcFooter(mFooter);
      else if (globalData.footer || campusData.footer) setRcFooter(globalData.footer || campusData.footer || "");
      
      setRcTitle(globalData.title || campusData.title || (rcReportType === "thu_moi" ? "THƯ MỜI" : rcReportType === "cam_ket_hoc_tap" ? "BẢN CAM KẾT HỌC TẬP" : "THƯ CHÚC MỪNG"));
      const defaultText = rcReportType === "thu_moi" ? defaultPreschoolInvitation : rcReportType === "cam_ket_hoc_tap" ? defaultPreschoolCommitment : defaultPreschoolCongratulations;
      setRcContent(globalData.content || campusData.content || defaultText);
      const savedSignature = localStorage.getItem('report_config_signature_' + rcCampusId) || campusData.signature || localStorage.getItem('report_config_master_signature') || "";
      const savedDirector = localStorage.getItem('report_config_director_' + rcCampusId) || campusData.directorName || defaultManagerName;
      setRcSignature(savedSignature);
      setRcDirectorName(savedDirector);
    }
  }, [rcCampusId, rcReportType, campuses]);

  const handleRcLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => { setRcLogo(reader.result as string); }; reader.readAsDataURL(file); }
  };
  const handleRcSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => { setRcSignature(reader.result as string); }; reader.readAsDataURL(file); }
  };
  const handleRcBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => { setRcBackground(reader.result as string); }; reader.readAsDataURL(file); }
  };
  const handleRcFooterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => { setRcFooter(reader.result as string); }; reader.readAsDataURL(file); }
  };

  const savePreschoolReportConfig = () => {
    if (!rcCampusId) return notify("Vui lòng chọn Cơ sở", "err");
    if (!rcReportType) return notify("Vui lòng chọn Loại báo cáo", "err");
    const typeKey = rcReportType + "_preschool";
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
    notify("Đã lưu cấu hình báo cáo Mầm non thành công!");
  };

  // Period actions
  const openAddPeriod = async () => {
    setEditP(null);
    setPForm({ code: "", name: "", assignedUserId: "", startDate: "", endDate: "", description: "", status: "ACTIVE", surveyType: "KHAO_SAT_LE" });
    setPModal(true);
    try {
      const r = await fetch("/api/preschool-input-assessments?get_next_code=true&surveyType=KHAO_SAT_LE");
      if (r.ok) {
        const res = await r.json();
        if (res.nextCode) {
          setPForm(prev => {
            const nextState = { ...prev, code: res.nextCode };
            nextState.name = `Khảo sát lẻ cơ sở - ${res.nextCode}`;
            return nextState;
          });
        }
      }
    } catch (e) {
      console.error("Error fetching next period code:", e);
    }
  };
  const openEditPeriod = (p: Period) => { setEditP(p); setPForm({ code: p.code, name: p.name, assignedUserId: p.assignedUserId || "", startDate: p.startDate?.slice(0,10) || "", endDate: p.endDate?.slice(0,10) || "", description: p.description || "", status: p.status, surveyType: p.surveyType || "KHAO_SAT_LE" }); setPModal(true); };
  const savePeriod = async () => {
    if (!pForm.code.trim() || !pForm.name.trim()) return notify("Cần nhập Mã và Tên", "err");
    const r = await fetch("/api/preschool-input-assessments", { method: editP ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: editP ? "UPDATE_PERIOD" : "CREATE_PERIOD", id: editP?.id, data: { ...pForm, academicYearId: yearId } }) });
    if (r.ok) { setPModal(false); fetchPeriods(); notify(editP ? "Đã cập nhật kỳ" : "Đã tạo kỳ mới"); } else notify("Lỗi", "err");
  };
  const doDeletePeriod = async (id: string) => { const r = await fetch(`/api/preschool-input-assessments?type=period&id=${id}`, { method: "DELETE" }); if (r.ok) { fetchPeriods(); notify("Đã xóa kỳ"); } };

  // Batch actions
  const openAddBatch = (pid: string) => {
    setTargetPeriodId(pid);
    setEditB(null);
    const period = periods.find(p => p.id === pid);
    const nextNum = period && period.batches.length > 0 ? Math.max(...period.batches.map(b => b.batchNumber)) + 1 : 1;
    setBForm({
      batchNumber: String(nextNum),
      name: "KSĐV_Tất cả _ Đợt " + nextNum,
      startDate: "",
      endDate: "",
      status: "ACTIVE",
      campusId: "",
      assignedUserId: ""
    });
    setBModal(true);
  };
  const openEditBatch = (b: Batch) => { setTargetPeriodId(b.periodId); setEditB(b); let baseName = b.name; const m = b.name.match(/Đợt \d+ - (.*?) \|/); if (m) baseName = m[1]; else { const m2 = b.name.match(/Đợt \d+ - (.*)/); if (m2) baseName = m2[1]; } setBForm({ batchNumber: String(b.batchNumber), name: baseName, startDate: b.startDate?.slice(0,10) || "", endDate: b.endDate?.slice(0,10) || "", status: b.status, campusId: b.campusId || "", assignedUserId: b.assignedUserId || "" }); setBModal(true); };
  const saveBatch = async () => {
    if (!bForm.name.trim() || !bForm.startDate || !bForm.endDate) return notify("Cần nhập Tên, Ngày bắt đầu và kết thúc", "err");
    const campus = campuses.find(c => c.id === bForm.campusId);
    const campusName = campus ? campus.campusName : "Tất cả";
    const startStr = bForm.startDate.split('-').reverse().join('/');
    const endStr = bForm.endDate.split('-').reverse().join('/');
    const fullName = `Đợt ${bForm.batchNumber || "1"} - ${bForm.name} | ${campusName} (${startStr} ~ ${endStr})`;
    const r = await fetch("/api/preschool-input-assessments", { method: editB ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: editB ? "UPDATE_BATCH" : "CREATE_BATCH", id: editB?.id, data: { ...bForm, name: fullName, periodId: targetPeriodId, batchNumber: parseInt(bForm.batchNumber) || 1 } }) });
    if (r.ok) { setBModal(false); fetchPeriods(); notify(editB ? "Đã cập nhật đợt" : "Đã tạo đợt mới"); } else notify("Lỗi", "err");
  };
  const doDeleteBatch = async (id: string) => { const r = await fetch(`/api/preschool-input-assessments?type=batch&id=${id}`, { method: "DELETE" }); if (r.ok) { fetchPeriods(); notify("Đã xóa đợt"); } };

  // Child actions
  const openAddChild = async () => {
    setEditC(null);
    let genCode = "MN001";
    try { const r = await fetch("/api/preschool-input-assessment-students?get_max_code=true"); if (r.ok) { const res = await r.json(); if (res.nextCode) genCode = "MN" + res.nextCode.replace(/^\D+/, ""); } } catch {}
    const initBatch = cBatchId || (periods.find(p => p.id === cPeriodId)?.batches?.[0]?.id || "");
    const batch = periods.flatMap(p => p.batches || []).find(b => b.id === initBatch);
    const campus = campuses.find(c => c.id === batch?.campusId);
    const initCampus = campus ? campus.campusName : "";
    setCForm({ studentCode: genCode, fullName: "", dateOfBirth: "", gender: "", grade: "", admissionCampus: initCampus, surveyFormType: "", batchId: initBatch, admissionResult: "" });
    setCModal(true);
  };
  const openEditChild = (child: PreschoolChild) => { setEditC(child); setCForm({ studentCode: child.studentCode, fullName: child.fullName, dateOfBirth: child.dateOfBirth?.slice(0,10) || "", gender: child.gender || "", grade: child.grade || "", admissionCampus: child.admissionCampus || "", surveyFormType: child.surveyFormType || "", batchId: child.batchId || "", admissionResult: child.admissionResult || "" }); setCModal(true); };
  const saveChild = async () => {
    if (!cForm.studentCode.trim() || !cForm.fullName.trim()) return notify("Cần nhập Mã bé và Họ tên", "err");
    const r = editC
      ? await fetch("/api/preschool-input-assessment-students", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editC.id, data: cForm }) })
      : await fetch("/api/preschool-input-assessment-students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "CREATE", data: { ...cForm, periodId: cPeriodId, batchId: cForm.batchId || cBatchId || null } }) });
    if (r.ok) { setCModal(false); fetchChildren(); notify(editC ? "Đã cập nhật bé" : "Đã thêm bé mới"); } else notify("Lỗi", "err");
  };
  const doDeleteChild = async (id: string) => { await fetch(`/api/preschool-input-assessment-students?id=${id}`, { method: "DELETE" }); fetchChildren(); notify("Đã xóa"); };
  const doDeleteSelected = async () => { await fetch(`/api/preschool-input-assessment-students?ids=${cSelected.join(",")}`, { method: "DELETE" }); setCSelected([]); fetchChildren(); notify(`Đã xóa ${cSelected.length} bé`); };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !cPeriodId) return;
    setImporting(true);
    try {
      const d = await file.arrayBuffer();
      const wb = XLSX.read(d);
      let ws: any = null; let headerRowIndex = -1;
      for (const sheetName of wb.SheetNames) {
        const currentWs = wb.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(currentWs, { header: 1 }) as any[][];
        for (let i = 0; i < rawData.length; i++) {
          if (rawData[i].some((cell: any) => { const c = String(cell).toLowerCase(); return c.includes("mã") || c.includes("bé") || c.includes("tên") || c.includes("hs"); })) { headerRowIndex = i; ws = currentWs; break; }
        }
        if (ws) break;
      }
      if (!ws || headerRowIndex === -1) { notify("Không tìm thấy dữ liệu trong file", "err"); return; }
      const rows = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex, defval: "" }) as any[];
      const findVal = (row: any, kws: string[]) => { for (const key of Object.keys(row)) { if (kws.some(kw => key.toLowerCase().includes(kw.toLowerCase()))) return row[key]; } return null; };
      const mapped = rows.map((row: any) => {
        const studentCode = String(findVal(row, ["mã", "ma be", "studentcode"]) || "").trim();
        const fullName = String(findVal(row, ["họ và tên", "họ tên", "fullname"]) || "").trim();
        const grade = String(findVal(row, ["lớp / nhóm tuổi", "nhóm tuổi", "lớp", "khối", "grade"]) || "").trim();
        const gender = String(findVal(row, ["giới tính", "gender"]) || "").trim();
        const admissionCampus = String(findVal(row, ["cơ sở", "co so", "admissioncampus", "cơ sở ks"]) || "").trim();
        const surveyFormType = String(findVal(row, ["hệ ks", "he ks", "surveyformtype", "hệ khảo sát"]) || "").trim();
        let parsedDate = null;
        const rawDate = findVal(row, ["ngày sinh", "ngay sinh"]);
        if (rawDate) {
          if (typeof rawDate === "number") { const date = new Date(Math.round((rawDate - 25569) * 86400 * 1000)); parsedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000).toISOString(); }
          else if (typeof rawDate === "string") { const parts = rawDate.split(/[\/\-]/); if (parts.length === 3 && parts[0].length <= 2) parsedDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}T00:00:00.000Z`; else { const date = new Date(rawDate); if (!isNaN(date.getTime())) parsedDate = date.toISOString(); } }
        }
        return {
          studentCode,
          fullName,
          dateOfBirth: parsedDate,
          gender: gender || null,
          grade: grade || null,
          admissionCampus: admissionCampus || (cBatchId ? (periods.flatMap(p => p.batches || []).find(b => b.id === cBatchId) ? campuses.find(c => c.id === periods.flatMap(p => p.batches || []).find(b => b.id === cBatchId)?.campusId)?.campusName || null : null) : null),
          surveyFormType: surveyFormType || null,
          periodId: cPeriodId,
          batchId: cBatchId || null
        };
      }).filter((r: any) => r.studentCode && r.fullName);
      const res = await fetch("/api/preschool-input-assessment-students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "BULK_CREATE", data: mapped }) });
      if (res.ok) { const dr = await res.json(); notify(`Import ${dr.created || 0} bé thành công`); fetchChildren(); }
      else { const err = await res.json().catch(() => ({})); notify("Lỗi: " + (err.error || ""), "err"); }
    } finally { setImporting(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { "Mã bé": "MN001", "Họ và tên": "Nguyễn Bé An", "Ngày sinh": "15/08/2022", "Giới tính": "Nữ", "Nhóm tuổi": "18 đến 24 tháng", "Cơ sở": "Skyline Hill", "Hệ KS": "Chất lượng cao" },
      { "Mã bé": "MN002", "Họ và tên": "Trần Bé Minh", "Ngày sinh": "20/03/2021", "Giới tính": "Nam", "Nhóm tuổi": "24 đến 36 tháng", "Cơ sở": "Skyline Central", "Hệ KS": "Song ngữ" },
    ], { header: ["Mã bé", "Họ và tên", "Ngày sinh", "Giới tính", "Nhóm tuổi", "Cơ sở", "Hệ KS"] });
    ws['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 15 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_sach_be");
    XLSX.writeFile(wb, "Form_Mau_Them_Be_Mam_Non.xlsx");
  };

  // Config actions
  const openAddCfg = (type: string) => { setEditCfg(null); setCfgForm({ categoryType: type, code: "", name: "" }); setCfgModal(true); };
  const openEditCfg = (c: AssessmentConfig) => { setEditCfg(c); setCfgForm({ categoryType: c.categoryType, code: c.code, name: c.name }); setCfgModal(true); };
  const saveCfg = async () => {
    if (!cfgForm.code.trim() || !cfgForm.name.trim()) return notify("Cần nhập Mã và Tên", "err");
    const r = editCfg
      ? await fetch("/api/preschool-assessment-configs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editCfg.id, name: cfgForm.name, code: cfgForm.code }) })
      : await fetch("/api/preschool-assessment-configs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfgForm) });
    if (r.ok) { setCfgModal(false); fetchConfigs(); notify("Đã lưu"); }
  };
  const doDeleteCfg = async (id: string) => { await fetch(`/api/preschool-assessment-configs?id=${id}`, { method: "DELETE" }); fetchConfigs(); notify("Đã xóa"); };
  const doBulkDeleteCfg = async () => {
    if (cfgSelected.length === 0) return;
    await fetch(`/api/preschool-assessment-configs?ids=${cfgSelected.join(",")}`, { method: "DELETE" });
    setCfgSelected([]);
    fetchConfigs();
    notify("Đã xóa các mục đã chọn");
  };

  const filtChildren = useMemo(() => children.filter(c => !cSearch || c.studentCode.toLowerCase().includes(cSearch.toLowerCase()) || c.fullName.toLowerCase().includes(cSearch.toLowerCase())), [children, cSearch]);
  const reportChildren = useMemo(() => { let all = children; if (rptBatchId !== "all") all = all.filter(c => c.batchId === rptBatchId || c.batchId === null || c.batchId === ""); return all; }, [children, rptBatchId]);
  const rptStats = useMemo(() => {
    const total = reportChildren.length;
    const passed = reportChildren.filter(c => c.admissionResult && (c.admissionResult.toUpperCase().includes("ĐẠT") || c.admissionResult === "Học thử")).length;
    const pending = reportChildren.filter(c => !c.admissionResult).length;
    const failed = reportChildren.filter(c => c.admissionResult && c.admissionResult.toUpperCase().includes("KHÔNG")).length;
    const gradeStats = grades.map(g => ({ grade: g, count: reportChildren.filter(c => c.grade === g).length }));
    return { total, passed, pending, failed, gradeStats };
  }, [reportChildren, grades]);

  const assignedTeachers = useMemo(() => {
    if (!evalStudent) return "";
    if (devLoading && !evalAssignments.length) return "Đang tải...";
    if (!evalAssignments.length) return "Chưa phân công";
    const matches = evalAssignments.filter(a => {
      const studentPeriodId = evalStudent.periodId || cPeriodId;
      if (a.periodId !== studentPeriodId) return false;
      if (a.grade !== evalStudent.grade) return false;
      return !a.batchId || a.batchId === evalStudent.batchId;
    });
    if (matches.length === 0) return "Chưa phân công";
    const names = Array.from(new Set(matches.map(m => m.user?.fullName || "Chưa rõ"))).filter(Boolean);
    return names.length > 0 ? names.join(", ") : "Chưa phân công";
  }, [evalStudent, evalAssignments, devLoading]);

  const selPeriod = periods.find(p => p.id === cPeriodId);

  return (
    <div className="space-y-3 font-sans max-w-[1440px] mx-auto pb-16">
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {confirm && <ConfirmDialog open={true} onClose={() => setConfirm(null)} onConfirm={confirm.fn} message={confirm.msg} />}

      {/* Header */}
      <div className="bg-white border border-violet-100 shadow-sm rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-md shadow-violet-200">
            <Baby className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-800 tracking-tight">Quản lý KSNL Đầu vào Mầm non</h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest hidden sm:block">Hệ thống khảo sát năng lực đầu vào bậcc Mầm non</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 bg-violet-50 rounded-xl border border-violet-100">
          <Calendar className="w-3.5 h-3.5 text-violet-400" />
          <select value={yearId} onChange={e => { setYearId(e.target.value); setCPeriodId(""); setChildren([]); }} className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer">
            {academicYears.map(ay => <option key={ay.id} value={ay.id}>Năm học {ay.name}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-violet-100 shadow-sm rounded-2xl px-1 py-1">
        <div className="flex flex-wrap gap-0.5">
          {[
            { id: "periods", label: "Kỳ KS", icon: Clock },
            { id: "categories", label: "Danh mục", icon: Settings },
            { id: "children", label: "DS Trẻ", icon: Users },
            { id: "assignments", label: "Phân công", icon: UserCheck },
            { id: "devAssess", label: "Đánh giá PT", icon: Star },
            { id: "reports", label: "Tổng hợp KQKS", icon: BarChart3 },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-200 ${tab === t.id ? "bg-violet-500 text-white shadow-sm" : "text-slate-500 hover:bg-violet-50 hover:text-violet-600"}`}>
              <t.icon className={`w-4 h-4 ${tab === t.id ? "text-white" : "text-slate-400"}`} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Periods */}
      {tab === "periods" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2"><Clock className="w-4 h-4 text-violet-400" /> Kỳ &amp; Đợt Khảo sát Mầm non</h2>
            <div className="flex gap-2">
              <button onClick={fetchPeriods} className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"><RefreshCw className="w-4 h-4" /></button>
              <button onClick={openAddPeriod} className="flex items-center gap-2 px-5 py-2.5 bg-violet-500 text-white text-[13px] font-black rounded-xl hover:bg-violet-700 transition-all shadow-lg shadow-violet-100"><Plus className="w-4 h-4" /> Tạo Kỳ mới</button>
            </div>
          </div>
          {pLoading ? <Spin /> : periods.length === 0 ? <Empty text="Chưa có Kỳ khảo sát nào" sub="Bấm Tạo Kỳ mới để bắt đầu" /> : (
            <div className="space-y-3">
              {periods.map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden hover:border-violet-200 transition-all">
                  <div className="px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center flex-shrink-0"><Baby className="w-6 h-6 text-violet-400" /></div>
                      <div>
                        <div className="flex items-center gap-2"><span className="font-black text-slate-800 text-lg">{p.name}</span><Badge s={p.status} /><TypeBadge t={p.surveyType || "KHAO_SAT_LE"} /></div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-bold">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {p.startDate?.slice(0,10)} → {p.endDate?.slice(0,10) || "?"}</span>
                          <span className="text-violet-400">{p.batches?.length || 0} đợt</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={e => { e.stopPropagation(); openAddBatch(p.id); }} className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-500 hover:text-white rounded-xl transition-all border border-emerald-100"><Plus className="w-3.5 h-3.5" /> Thêm Đợt</button>
                      <button onClick={e => { e.stopPropagation(); openEditPeriod(p); }} className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={e => { e.stopPropagation(); setConfirm({ msg: `Xóa kỳ "${p.name}"?`, fn: () => doDeletePeriod(p.id) }); }} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                      <span className="text-slate-300 ml-2">{expandedId === p.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</span>
                    </div>
                  </div>
                  {expandedId === p.id && (
                    <div className="border-t border-violet-100 p-5 bg-violet-50/30">
                      {!p.batches || p.batches.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 font-bold text-xs uppercase tracking-wider bg-white rounded-2xl border-2 border-dashed border-violet-200">Chưa có Đợt nào</div>
                      ) : (
                        <div className="overflow-x-auto bg-white border border-violet-100 rounded-2xl shadow-sm">
                          <table className="w-full text-left">
                            <thead className="bg-violet-50/70 border-b border-violet-100">
                              <tr>
                                {["Mã Đợt", "Nội dung", "Cơ sở", "Thời gian", "Trạng thái", "Thao tác"].map(h => <th key={h} className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-violet-50">
                              {p.batches.map(b => {
                                const campus = campuses.find(c => c.id === b.campusId);
                                let baseName = b.name;
                                const m = b.name.match(/Đợt \d+ - (.*?) \|/); if (m) baseName = m[1]; else { const m2 = b.name.match(/Đợt \d+ - (.*)/); if (m2) baseName = m2[1]; }
                                return (
                                  <tr key={b.id} className="hover:bg-violet-50/30 transition-colors">
                                    <td className="p-4"><span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-violet-50 font-black text-violet-600 text-xs">#{b.batchNumber}</span></td>
                                    <td className="p-4"><span className="text-sm font-semibold text-slate-700">{baseName}</span></td>
                                    <td className="p-4"><span className="text-xs text-slate-500">{campus?.campusName || "Tất cả"}</span></td>
                                    <td className="p-4"><span className="text-xs text-slate-500">{b.startDate?.slice(0,10)} → {b.endDate?.slice(0,10)}</span></td>
                                    <td className="p-4"><div className="flex items-center gap-2">
                                       <button
                                         onClick={async () => {
                                           const newStatus = b.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
                                           try {
                                             const res = await fetch(b.isPreschool || true ? "/api/preschool-input-assessments" : "/api/input-assessments", {
                                               method: "PUT",
                                               headers: { "Content-Type": "application/json" },
                                               body: JSON.stringify({ action: "UPDATE_BATCH", id: b.id, data: { status: newStatus } })
                                             });
                                             if (res.ok) { fetchPeriods(); }
                                             else { const d = await res.json(); alert(d.error || "Lỗi cập nhật"); }
                                           } catch(e) { alert("Lỗi mạng"); }
                                         }}
                                         className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#00A19A] focus:ring-offset-2 ${
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
                                     </div></td>
                                    <td className="p-4 text-right"><div className="flex justify-end gap-1"><button onClick={() => openEditBatch(b)} className="p-2 text-slate-300 hover:text-violet-600 hover:bg-violet-50 rounded-lg"><Edit2 className="w-4 h-4" /></button><button onClick={() => setConfirm({ msg: `Xóa đợt #${b.batchNumber}?`, fn: () => doDeleteBatch(b.id) })} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td>
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

      {/* Tab: Assignments */}
      {tab === "assignments" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-violet-500" /> Phân công Giáo viên Khảo sát
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={fetchAssignments} 
                className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button 
                onClick={sendAllNotifications} 
                disabled={aNotifyingAll || assignments.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white text-[13px] font-black rounded-xl hover:from-fuchsia-600 hover:to-pink-600 transition-all shadow-lg shadow-pink-100 disabled:opacity-50"
              >
                {aNotifyingAll ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Gửi thông báo cho tất cả
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Filter & Assignment Selector Panel */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-3xl border border-violet-100 shadow-sm p-5 space-y-4">
                <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <Settings className="w-4 h-4 text-violet-400" /> Cấu hình Phân công
                </h3>

                {/* Scope Selection */}
                <div className="space-y-3">
                  <Field label="Kỳ Khảo sát" required>
                    <select 
                      value={aPeriodId} 
                      onChange={e => setAPeriodId(e.target.value)} 
                      className={inp}
                    >
                      <option value="">-- Chọn kỳ khảo sát --</option>
                      {periods.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Đợt Khảo sát">
                    <select 
                      value={aBatchId} 
                      onChange={e => setABatchId(e.target.value)} 
                      className={inp}
                    >
                      <option value="all">Tất cả các đợt</option>
                      {periods.find(p => p.id === aPeriodId)?.batches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Nhóm tuổi (Khối)" required>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {grades.map(g => {
                        const isChecked = aGrades.includes(g);
                        return (
                          <label 
                            key={g} 
                            className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
                              isChecked 
                                ? "bg-violet-50/70 border-violet-300 text-violet-700 font-bold shadow-sm" 
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                            }`}
                          >
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => {
                                setAGrades(prev => 
                                  isChecked 
                                    ? prev.filter(item => item !== g)
                                    : [...prev, g]
                                );
                              }}
                              className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 focus:ring-offset-0 cursor-pointer"
                            />
                            <span className="text-xs">{g}</span>
                          </label>
                        );
                      })}
                    </div>
                  </Field>
                </div>
              </div>

              {/* Teacher List Multi-selector */}
              <div className="bg-white rounded-3xl border border-violet-100 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-violet-400" /> Danh sách Giáo viên
                  </h3>
                  <span className="text-[10px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-lg font-black">
                    Đã chọn {aSelectedTeachers.length}
                  </span>
                </div>

                {/* Department Selection */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Lọc theo Tổ Chuyên môn</label>
                  <select
                    value={aDeptId}
                    onChange={e => setADeptId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 outline-none focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 text-xs font-semibold text-slate-700 transition-all shadow-sm cursor-pointer"
                  >
                    <option value="">Tất cả Tổ Chuyên môn</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-4.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Tìm theo tên hoặc mã GV..." 
                    value={aSearchTeacher}
                    onChange={e => setASearchTeacher(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl pl-11 pr-4 py-3 outline-none text-sm font-medium text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-violet-400/10 transition-all shadow-inner"
                  />
                  {aSearchTeacher && (
                    <button 
                      onClick={() => setASearchTeacher("")} 
                      className="absolute right-4.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Scrollable Teacher checkboxes list */}
                <div className="max-h-[300px] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
                  {teachers
                    .filter(t => t.user)
                    .filter(t => {
                      if (!aDeptId) return true;
                      return t.departmentId === aDeptId;
                    })
                    .filter(t => {
                      if (!aSearchTeacher) return true;
                      const query = aSearchTeacher.toLowerCase();
                      return (t.teacherName || "").toLowerCase().includes(query) || (t.teacherCode || "").toLowerCase().includes(query);
                    })
                    .map(t => {
                      const userId = t.user.id;
                      const isChecked = aSelectedTeachers.includes(userId);
                      return (
                        <label 
                          key={t.id} 
                          className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer border transition-all ${isChecked ? "bg-violet-50/50 border-violet-200" : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/30"}`}
                        >
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => {
                                setASelectedTeachers(prev => 
                                  isChecked ? prev.filter(id => id !== userId) : [...prev, userId]
                                );
                              }}
                              className="w-4.5 h-4.5 rounded-lg border-slate-300 text-violet-600 focus:ring-violet-500 focus:ring-offset-0 cursor-pointer"
                            />
                            <div>
                              <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <span>{t.teacherName}</span>
                                {t.departmentRel?.name && (
                                  <span className="text-[9px] font-black uppercase bg-violet-50 text-violet-600 border border-violet-100 px-1.5 py-0.5 rounded-lg tracking-wider">
                                    {t.departmentRel.name}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-semibold uppercase">{t.teacherCode} • {t.email || t.user.email}</div>
                            </div>
                          </div>
                          {isChecked && <CheckCircle className="w-4.5 h-4.5 text-violet-500 animate-in zoom-in-50 duration-200" />}
                        </label>
                      );
                    })}
                </div>

                <button 
                  onClick={saveAssignments} 
                  disabled={aSaving || !aPeriodId}
                  className="w-full py-3.5 bg-violet-600 text-white font-black rounded-2xl hover:bg-violet-700 disabled:opacity-50 transition-all shadow-lg shadow-violet-100/50 flex items-center justify-center gap-2 mt-4 hover:scale-[1.01] active:scale-[0.99] duration-150"
                >
                  {aSaving ? (
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <UserCheck className="w-5 h-5" />
                  )}
                  Lưu Phân công Giáo viên
                </button>
              </div>
            </div>

            {/* Currently Assigned Teachers List Panel */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-3xl border border-violet-100 shadow-sm p-5 space-y-4 h-full min-h-[500px]">
                <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <UserCheck className="w-4 h-4 text-violet-400" /> Giáo viên đang được phân công ({assignments.length})
                </h3>

                {assignLoading ? (
                  <Spin />
                ) : assignments.length === 0 ? (
                  <Empty text="Chưa có giáo viên nào được phân công" sub="Chọn giáo viên bên trái và bấm Lưu Phân công để bắt đầu" />
                ) : (
                  <div className="space-y-3">
                    {assignments.map((assign) => {
                      const t = teachers.find(teach => teach.user?.id === assign.userId);
                      const tName = t?.teacherName || assign.user?.fullName || "Chưa có tên";
                      const tCode = t?.teacherCode || "GV000";
                      const tEmail = t?.email || assign.user?.email || "—";
                      
                      const isNotifying = aNotifyingId === assign.id;

                      return (
                        <div 
                          key={assign.id} 
                          className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-violet-200 hover:bg-white hover:shadow-md hover:shadow-violet-50/20 transition-all duration-300 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center font-black text-sm">
                              {tName.split(" ").slice(-1)[0].charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-black text-slate-800 flex items-center gap-2">
                                <span>{tName}</span>
                                {t?.departmentRel?.name && (
                                  <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded-lg tracking-wider">
                                    {t.departmentRel.name}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-semibold">{tCode} • {tEmail}</div>
                              <div className="flex gap-1.5 mt-1 items-center">
                                <span className="text-[9px] font-black uppercase bg-violet-50 text-violet-600 border border-violet-100 px-2 py-0.5 rounded-lg tracking-wider">
                                  {assign.grade}
                                </span>
                                {assign.batch && (
                                  <span className="text-[9px] font-black uppercase bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100 px-2 py-0.5 rounded-lg tracking-wider max-w-[150px] truncate">
                                    {assign.batch.name.split(" | ")[0]}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            {/* Notification button */}
                            <button 
                              onClick={() => sendTeacherNotification(assign.id, tName)}
                              disabled={isNotifying}
                              title="Gửi email thông báo"
                              className="w-9 h-9 flex items-center justify-center bg-white text-slate-500 hover:text-fuchsia-600 hover:bg-fuchsia-50 rounded-xl border border-slate-100 hover:border-fuchsia-200 transition-all shadow-sm"
                            >
                              {isNotifying ? (
                                <div className="w-4 h-4 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Sparkles className="w-4 h-4" />
                              )}
                            </button>

                            {/* Delete assignment button */}
                            <button 
                              onClick={() => {
                                setConfirm({
                                  msg: `Hủy phân công khảo sát cho giáo viên ${tName}?`,
                                  fn: () => deleteAssignment(assign.id, tName)
                                });
                              }}
                              title="Hủy phân công"
                              className="w-9 h-9 flex items-center justify-center bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-100 hover:border-rose-200 transition-all shadow-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* Tab: Categories */}
      {tab === "categories" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2"><Settings className="w-4 h-4 text-violet-400" /> Danh mục cấu hình</h2>
            <div className="flex items-center gap-2">
              {cfgSelected.length > 0 && (
                <button onClick={() => setConfirm({ msg: `Xóa ${cfgSelected.length} mục đã chọn?`, fn: doBulkDeleteCfg })} className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 text-white text-[13px] font-black rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 animate-in fade-in duration-200"><Trash2 className="w-4 h-4" /> Xóa mục đã chọn (${cfgSelected.length})</button>
              )}
              <button onClick={() => openAddCfg("criteria")} className="flex items-center gap-2 px-5 py-2.5 bg-violet-500 text-white text-[13px] font-black rounded-xl hover:bg-violet-700 transition-all shadow-lg shadow-violet-100"><Plus className="w-4 h-4" /> Thêm mục</button>
            </div>
          </div>
          {cfgLoading ? <Spin /> : (
            <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
              {configs.length === 0 ? <Empty text="Chưa có danh mục nào" /> : (
                <div className="overflow-x-auto custom-scrollbar flex-1">
                  <table className="w-full text-left">
                    <thead className="bg-violet-50 border-b border-violet-100">
                      <tr>
                        <th className="p-4 w-12">
                          <input type="checkbox" className="w-4 h-4 rounded accent-violet-600" checked={configs.length > 0 && cfgSelected.length === configs.length} onChange={e => setCfgSelected(e.target.checked ? configs.map(c => c.id) : [])} />
                        </th>
                        {["STT", "Loại", "Mã", "Tên", "Thao tác"].map(h => <th key={h} className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-violet-50">
                      {configs.map((c, i) => (
                        <tr key={c.id} className="hover:bg-violet-50/30 transition-colors">
                          <td className="p-4 w-12">
                            <input type="checkbox" className="w-4 h-4 rounded accent-violet-600" checked={cfgSelected.includes(c.id)} onChange={e => setCfgSelected(e.target.checked ? [...cfgSelected, c.id] : cfgSelected.filter(id => id !== c.id))} />
                          </td>
                          <td className="p-4 text-slate-400 text-sm">{i+1}</td>
                          <td className="p-4"><span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full uppercase">{c.categoryType}</span></td>
                          <td className="p-4 font-mono text-xs font-bold text-violet-600">{c.code}</td>
                          <td className="p-4 font-semibold text-slate-700 text-sm">{c.name}</td>
                          <td className="p-4 text-right"><div className="flex justify-end gap-1"><button onClick={() => openEditCfg(c)} className="p-2 text-slate-300 hover:text-violet-600 hover:bg-violet-50 rounded-lg"><Edit2 className="w-4 h-4" /></button><button onClick={() => setConfirm({ msg: `Xóa "${c.name}"?`, fn: () => doDeleteCfg(c.id) })} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Children */}
      {tab === "children" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="bg-white rounded-2xl border border-violet-100 shadow-sm p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Kỳ KS:</label>
              <select value={cPeriodId} onChange={e => { setCPeriodId(e.target.value); setCBatchId(""); }} className="border border-violet-100 rounded-xl p-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-violet-300 min-w-[160px]">
                <option value="">-- Chọn Kỳ --</option>
                {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Đợt:</label>
              <select value={cBatchId} onChange={e => setCBatchId(e.target.value)} className="border border-violet-100 rounded-xl p-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-violet-300 min-w-[140px]" disabled={!cPeriodId}>
                <option value="">Tất cả đợt</option>
                {selPeriod?.batches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <button onClick={fetchChildren} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-xl border border-violet-100"><Search className="w-4 h-4" /> Tìm</button>
            <div className="ml-auto relative"><Search className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" /><input value={cSearch} onChange={e => setCSearch(e.target.value)} placeholder="Tìm bé..." className="pl-9 pr-4 py-2 border border-violet-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-300 min-w-[200px]" /></div>
          </div>

          <div className="bg-white rounded-2xl border border-violet-100 shadow-sm p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-slate-600">Danh sách Trẻ Mầm non</span>
              {cSelected.length > 0 && <button onClick={() => setConfirm({ msg: `Xóa ${cSelected.length} bé?`, fn: doDeleteSelected })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-100 transition-all"><Trash2 className="w-3.5 h-3.5" /> Xóa {cSelected.length}</button>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={downloadTemplate} className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-100 transition-all"><Download className="w-4 h-4" /> Tải mẫu</button>
              <input type="file" ref={fileRef} onChange={handleImport} accept=".xlsx,.xls,.csv" className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={importing || !cPeriodId} className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-100 transition-all disabled:opacity-50"><Upload className="w-4 h-4" /> {importing ? "Đang import..." : "Import Excel"}</button>
              <button onClick={openAddChild} disabled={!cPeriodId} className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-violet-500 hover:bg-violet-700 rounded-xl shadow-md shadow-violet-100 transition-all disabled:opacity-50"><Plus className="w-4 h-4" /> Thêm bé</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
            {cLoading ? <Spin /> : filtChildren.length === 0 ? (
              <Empty text={cPeriodId ? "Chưa có bé nào" : "Vui lòng chọn Kỳ và bấm Tìm"} sub={cPeriodId ? "Bấm Thêm bé hoặc Import Excel" : ""} />
            ) : (
              <div className="overflow-x-auto custom-scrollbar flex-1">
                <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                  <thead className="bg-violet-50 border-b border-violet-100">
                    <tr>
                      <th className="p-4 w-12"><input type="checkbox" className="w-4 h-4 rounded accent-violet-600" checked={filtChildren.length > 0 && cSelected.length === filtChildren.length} onChange={e => setCSelected(e.target.checked ? filtChildren.map(c => c.id) : [])} /></th>
                      {["STT", "Mã bé", "Họ và tên", "Ngày sinh", "Giới tính", "Nhóm tuổi", "Cơ sở", "Kết quả", "Thao tác"].map(h => <th key={h} className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-50">
                    {filtChildren.map((child, i) => (
                      <tr key={child.id} className={`hover:bg-violet-50/30 transition-colors ${cSelected.includes(child.id) ? "bg-violet-50/50" : ""}`}>
                        <td className="p-4"><input type="checkbox" className="w-4 h-4 rounded accent-violet-600" checked={cSelected.includes(child.id)} onChange={e => setCSelected(e.target.checked ? [...cSelected, child.id] : cSelected.filter(id => id !== child.id))} /></td>
                        <td className="p-4 text-slate-400 text-sm">{i+1}</td>
                        <td className="p-4"><span className="font-mono text-xs font-black text-violet-600 bg-violet-50 px-2 py-1 rounded-lg">{child.studentCode}</span></td>
                        <td className="p-4"><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-400 flex items-center justify-center text-white font-black text-xs shadow-sm">{child.fullName?.charAt(0)}</div><span className="font-bold text-slate-800 text-sm">{child.fullName}</span></div></td>
                        <td className="p-4 text-sm text-slate-500">{child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString("vi-VN") : "—"}</td>
                        <td className="p-4">{child.gender ? <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${child.gender === "Nữ" || child.gender === "F" ? "bg-violet-100 text-violet-600" : "bg-blue-100 text-blue-600"}`}>{child.gender === "M" ? "Nam" : child.gender === "F" ? "Nữ" : child.gender}</span> : <span className="text-slate-300">—</span>}</td>
                        <td className="p-4"><span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg border border-purple-100">{child.grade || "—"}</span></td>
                        <td className="p-4 text-xs font-semibold text-slate-600">{child.admissionCampus || "—"}</td>
                        <td className="p-4">{child.admissionResult ? <span className={`text-xs font-black px-2.5 py-1 rounded-full ${child.admissionResult === "Học thử" ? "bg-[#00A19A]/10 text-[#00A19A] border border-[#00A19A]/20" : child.admissionResult.toUpperCase().includes("ĐẠT") && !child.admissionResult.toUpperCase().includes("KHÔNG") ? "bg-emerald-100 text-emerald-700" : child.admissionResult.toUpperCase().includes("KHÔNG") ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-700"}`}>{child.admissionResult}</span> : <span className="text-xs text-slate-300">Chưa</span>}</td>
                        <td className="p-4 text-right"><div className="flex justify-end gap-1"><button onClick={() => openEditChild(child)} className="p-2 text-slate-300 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"><Edit2 className="w-4 h-4" /></button><button onClick={() => setConfirm({ msg: `Xóa bé "${child.fullName}"?`, fn: () => doDeleteChild(child.id) })} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Dev Assess */}
      {tab === "devAssess" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex gap-2 border-b border-violet-100 pb-2">
            <button
              onClick={() => setDevTab("assess")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${devTab === "assess" ? "bg-violet-500 text-white shadow-sm" : "text-slate-500 hover:bg-violet-50"}`}
            >
              Đánh giá Trẻ
            </button>
            <button
              onClick={() => setDevTab("xetDuyet")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${devTab === "xetDuyet" ? "bg-violet-500 text-white shadow-sm" : "text-slate-500 hover:bg-violet-50"}`}
            >
              Xét duyệt học thử
            </button>
            <button
              onClick={() => setDevTab("manage")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${devTab === "manage" ? "bg-violet-500 text-white shadow-sm" : "text-slate-500 hover:bg-violet-50"}`}
            >
              Quản lý Tiêu chí & Lĩnh vực
            </button>
            <button
              onClick={() => setDevTab("dgkqHocThu")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${devTab === "dgkqHocThu" ? "bg-violet-500 text-white shadow-sm" : "text-slate-500 hover:bg-violet-50"}`}
            >
              Đánh giá Học thử
            </button>
            
          </div>

          {/* Sub-tab: Đánh giá Trẻ */}
          {/* Sub-tab: Đánh giá Trẻ */}
          {devTab === "assess" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-violet-100 shadow-sm p-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Kỳ KS:</label>
                  <select value={cPeriodId} onChange={e => { setCPeriodId(e.target.value); setCBatchId(""); }} className="border border-violet-100 rounded-xl p-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-violet-300 min-w-[160px]">
                    <option value="">-- Chọn Kỳ --</option>
                    {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Đợt:</label>
                  <select value={cBatchId} onChange={e => setCBatchId(e.target.value)} className="border border-violet-100 rounded-xl p-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-violet-300 min-w-[140px]" disabled={!cPeriodId}>
                    <option value="">Tất cả đợt</option>
                    {selPeriod?.batches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <button onClick={fetchStudentSummaries} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-xl border border-violet-100"><Search className="w-4 h-4" /> Tìm</button>

                <div className="ml-auto relative"><Search className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" /><input value={cSearch} onChange={e => setCSearch(e.target.value)} placeholder="Tìm bé..." className="pl-9 pr-4 py-2 border border-violet-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-300 min-w-[200px]" /></div>
              </div>

              <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
                {sumLoading ? <Spin /> : studentSummaries.length === 0 ? (
                  <Empty text={cPeriodId ? "Chưa có bé nào" : "Vui lòng chọn Kỳ và bấm Tìm"} sub={cPeriodId ? "Hãy thêm học sinh trước" : ""} />
                ) : (
                  <div className="overflow-x-auto custom-scrollbar flex-1">
                    <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                      <thead className="bg-violet-50 border-b border-violet-100">
                        <tr>
                          {["STT", "Mã bé", "Họ và tên", "Ngày sinh", "Nhóm tuổi", "Tiến độ", "Trạng thái", "Thao tác"].map(h => (
                            <th key={h} className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-violet-50">
                        {studentSummaries
                          .filter(s => !cSearch || s.studentCode.toLowerCase().includes(cSearch.toLowerCase()) || s.fullName.toLowerCase().includes(cSearch.toLowerCase()))
                          .map((s, idx) => {
                            const pct = s.totalCriteria > 0 ? Math.round((s.scoredCount / s.totalCriteria) * 100) : 0;
                            const statusBadge = () => {
                              const res = s.admissionResult || s.devAssessmentResult;
                              if (res && res !== "Chưa duyệt" && res !== "CHUA_DUYET" && res !== "") {
                                if (res === "Đạt - Miễn Học Thử" || res === "DAT_MIEN_HOC_THU") {
                                  return <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-teal-50 text-teal-600 border border-teal-200">✓ ĐẠT - MIỄN HỌC THỬ</span>;
                                }
                                if (res === "Đạt - Học Thử" || res === "DAT_HOC_THU" || res === "Học thử" || res === "HOC_THU") {
                                  return <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#00A19A]/10 text-[#00A19A] border border-indigo-200">★ ĐẠT - HỌC THỬ</span>;
                                }
                                if (res === "Đạt" || res === "DAT") {
                                  return <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">✓ ĐẠT</span>;
                                }
                                if (res === "Không đạt" || res === "KHONG_DAT") {
                                  return <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200">✗ KHÔNG ĐẠT</span>;
                                }
                                if (res === "Ý kiến khác" || res === "Y_KIEN_KHAC") {
                                  return <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">★ Ý KIẾN KHÁC</span>;
                                }
                              }
                              if (s.totalCriteria === 0) return <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-100">Không có tiêu chí</span>;
                              if (s.scoredCount === s.totalCriteria) return <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">🟢 Hoàn tất</span>;
                              if (s.scoredCount > 0) return <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">🟡 Đang chấm</span>;
                              return <span className="text-[10px] font-black text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">⚪ Chưa đánh giá</span>;
                            };

                            return (
                              <tr key={s.id} className="hover:bg-violet-50/30 transition-colors">
                                <td className="p-4 text-slate-400 text-sm">{idx + 1}</td>
                                <td className="p-4"><span className="font-mono text-xs font-black text-violet-600 bg-violet-50 px-2 py-1 rounded-lg">{s.studentCode}</span></td>
                                <td className="p-4 font-bold text-slate-800 text-sm">{s.fullName}</td>
                                <td className="p-4 text-sm text-slate-500">{s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "—"}</td>
                                <td className="p-4"><span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg border border-purple-100">{s.grade || "—"}</span></td>
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                                      <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-[10px] font-black text-violet-600">{s.scoredCount}/{s.totalCriteria}</span>
                                  </div>
                                </td>
                                <td className="p-4">{statusBadge()}</td>
                                <td className="p-4">
                                  <button
                                    onClick={() => openEvaluation(s)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-violet-700 bg-violet-50 hover:bg-violet-500 hover:text-white rounded-xl border border-violet-100 transition-all shadow-sm"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> Xem kết quả
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub-tab: Xét duyệt học thử */}
          {devTab === "xetDuyet" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-violet-100 shadow-sm p-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Kỳ KS:</label>
                  <select value={cPeriodId} onChange={e => { setCPeriodId(e.target.value); setCBatchId(""); }} className="border border-violet-100 rounded-xl p-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-violet-300 min-w-[160px]">
                    <option value="">-- Chọn Kỳ --</option>
                    {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Đợt:</label>
                  <select value={cBatchId} onChange={e => setCBatchId(e.target.value)} className="border border-violet-100 rounded-xl p-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-violet-300 min-w-[140px]" disabled={!cPeriodId}>
                    <option value="">Tất cả đợt</option>
                    {selPeriod?.batches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <button onClick={fetchStudentSummaries} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-xl border border-violet-100"><Search className="w-4 h-4" /> Tìm</button>

                <button
                  onClick={exportDevExcel}
                  disabled={studentSummaries.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-100 disabled:opacity-50 transition-all shadow-sm"
                >
                  <Download className="w-4 h-4" /> Xuất Excel Đánh Giá
                </button>
                <div className="ml-auto relative"><Search className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" /><input value={cSearch} onChange={e => setCSearch(e.target.value)} placeholder="Tìm bé..." className="pl-9 pr-4 py-2 border border-violet-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-300 min-w-[200px]" /></div>
              </div>

              <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
                {sumLoading ? <Spin /> : studentSummaries.length === 0 ? (
                  <Empty text={cPeriodId ? "Chưa có bé nào" : "Vui lòng chọn Kỳ và bấm Tìm"} sub={cPeriodId ? "Hãy thêm học sinh trước" : ""} />
                ) : (
                  <div className="overflow-x-auto relative rounded-xl border border-violet-100/80">
                    <table className="w-full min-w-max text-left text-sm whitespace-nowrap border-collapse table-auto">
                      <thead className="bg-violet-50 border-b border-violet-100 sticky top-0 z-30">
                        <tr>
                          {xetDuyetCols.filter(col => {
                            if (col.id === "bghApproval") return showBghSection;
                            if (col.id === "gdcsApproval") return showGdcsSection;
                            return true;
                          }).map(col => (
                            <th key={col.id} className={`p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest ${col.width}`}>
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-violet-50">
                        {studentSummaries
                          .filter(s => !cSearch || s.studentCode.toLowerCase().includes(cSearch.toLowerCase()) || s.fullName.toLowerCase().includes(cSearch.toLowerCase()))
                          .map((s, idx) => {
                            const getResultBadge = (res: string) => {
                              if (res === "Đạt - Miễn Học Thử" || res === "DAT_MIEN_HOC_THU") {
                                return <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-teal-50 text-teal-600 border border-teal-200">✓ ĐẠT - MIỄN HỌC THỬ</span>;
                              }
                              if (res === "Đạt - Học Thử" || res === "DAT_HOC_THU" || res === "Học thử" || res === "HOC_THU") {
                                return <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#00A19A]/10 text-[#00A19A] border border-indigo-200">★ ĐẠT - HỌC THỬ</span>;
                              }
                              if (res === "Đạt" || res === "DAT") {
                                return <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">✓ ĐẠT</span>;
                              }
                              if (res === "Không đạt" || res === "KHONG_DAT") {
                                return <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200">✗ KHÔNG ĐẠT</span>;
                              }
                              if (res === "Ý kiến khác" || res === "Y_KIEN_KHAC") {
                                return <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">★ Ý KIẾN KHÁC</span>;
                              }
                              return <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-50 text-slate-400 border border-slate-200">Chưa duyệt</span>;
                            };

                            // Height, Weight, BMI extractors
                            const heightScore = s.scores?.find((sc: any) => sc.criteria?.code?.endsWith("_01") || sc.criteria?.name?.toLowerCase().includes("chiều cao"));
                            const weightScore = s.scores?.find((sc: any) => sc.criteria?.code?.endsWith("_02") || sc.criteria?.name?.toLowerCase().includes("cân nặng"));

                            const getHeightVal = (score: any) => {
                              if (!score || !score.note) return null;
                              const rawPart = score.note.includes("|") ? score.note.split("|")[0] : score.note;
                              const num = parseFloat(rawPart.replace(/[^\d.]/g, ""));
                              return isNaN(num) || num <= 0 ? null : num;
                            };

                            const getWeightVal = (score: any) => {
                              if (!score || !score.note) return null;
                              const rawPart = score.note.includes("|") ? score.note.split("|")[0] : score.note;
                              const num = parseFloat(rawPart.replace(/[^\d.]/g, ""));
                              return isNaN(num) || num <= 0 ? null : num;
                            };

                            const hVal = getHeightVal(heightScore);
                            const wVal = getWeightVal(weightScore);

                            let bmiVal = null;
                            if (hVal && wVal) {
                              const heightInMeters = hVal / 100;
                              bmiVal = wVal / (heightInMeters * heightInMeters);
                            }

                            const bmiClass = bmiVal ? getBMIClassification(bmiVal) : null;

                            const renderAreaCell = (areaCode: string, tdClass: string) => {
                              const areaScores = s.scores?.filter((sc: any) => sc.criteria?.area?.code === areaCode) || [];
                              if (areaScores.length === 0) {
                                return <td className={`p-4 text-xs font-medium text-slate-300 align-top ${tdClass}`}>—</td>;
                              }
                              
                              const datCount = areaScores.filter((sc: any) => sc.result === "DAT").length;
                              const khongDatCount = areaScores.filter((sc: any) => sc.result === "KHONG_DAT").length;
                              const chuaDanhGiaCount = areaScores.length - datCount - khongDatCount;

                              // Custom preschool theme styling per developmental area (warm, harmonious international preschool palettes)
                              let cardClass = "bg-slate-50 border-slate-100/70 text-slate-700";
                              let progressBg = "bg-violet-500";
                              let progressTrack = "bg-violet-100";
                              let pillClass = "text-violet-600 bg-violet-50 border-violet-100";
                              let headerIcon = "🧠";
                              let areaName = "Lĩnh vực";

                              if (areaCode === "NHAN_THUC") {
                                cardClass = "bg-gradient-to-br from-amber-50/70 to-orange-50/30 border-amber-100/70 text-amber-900 shadow-[0_4px_12px_rgba(245,158,11,0.03)]";
                                progressBg = "bg-gradient-to-r from-amber-400 to-orange-500";
                                progressTrack = "bg-amber-100/60";
                                pillClass = "text-amber-700 bg-amber-100/80 border-amber-200/50";
                                headerIcon = "🧩";
                                areaName = "Nhận thức";
                              } else if (areaCode === "NGON_NGU") {
                                cardClass = "bg-gradient-to-br from-sky-50/70 to-indigo-50/30 border-sky-100/70 text-sky-900 shadow-[0_4px_12px_rgba(14,165,233,0.03)]";
                                progressBg = "bg-gradient-to-r from-sky-400 to-indigo-500";
                                progressTrack = "bg-sky-100/60";
                                pillClass = "text-sky-700 bg-sky-100/80 border-sky-200/50";
                                headerIcon = "🗣️";
                                areaName = "Ngôn ngữ";
                              } else if (areaCode === "TINH_CAM_XH_TM") {
                                cardClass = "bg-gradient-to-br from-rose-50/70 to-fuchsia-50/30 border-rose-100/70 text-rose-900 shadow-[0_4px_12px_rgba(244,63,94,0.03)]";
                                progressBg = "bg-gradient-to-r from-rose-400 to-fuchsia-500";
                                progressTrack = "bg-rose-100/60";
                                pillClass = "text-rose-700 bg-rose-100/80 border-rose-200/50";
                                headerIcon = "🎨";
                                areaName = "Tình cảm - XH";
                              }

                              return (
                                <td className={`p-4 align-top ${tdClass}`}>
                                  <div className="flex flex-col gap-2 w-full">
                                    <div className="flex flex-col gap-1.5">
                                      <div className={`border rounded-2xl p-2.5 space-y-2.5 transition-all hover:scale-[1.01] hover:shadow-md ${cardClass}`}>
                                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider pb-1.5 border-b border-white/60">
                                          <span className="flex items-center gap-1">
                                            <span>{headerIcon}</span>
                                            <span>{areaName} (${areaScores.length})</span>
                                          </span>
                                          <span className={`px-1.5 py-0.5 rounded-md border leading-none font-bold ${pillClass}`}>
                                            {areaScores.length > 0 ? Math.round((datCount / areaScores.length) * 100) : 0}% Đạt
                                          </span>
                                        </div>
                                        
                                        {/* Premium HSL Progress Bar */}
                                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${progressTrack}`}>
                                          <div className={`h-full rounded-full ${progressBg}`} style={{ width: `${areaScores.length > 0 ? Math.round((datCount / areaScores.length) * 100) : 0}%` }} />
                                        </div>

                                        <div className="flex flex-col gap-1 mt-1">
                                          <div className="flex items-center justify-between bg-white/90 backdrop-blur-sm border border-slate-100/80 rounded-xl px-2.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] text-xs">
                                            <div className="flex items-center gap-1.5 font-bold text-emerald-600">
                                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                              Đạt
                                            </div>
                                            <span className="font-black text-slate-700">${datCount} tiêu chí</span>
                                          </div>
                                          <div className="flex items-center justify-between bg-white/90 backdrop-blur-sm border border-slate-100/80 rounded-xl px-2.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] text-xs">
                                            <div className="flex items-center gap-1.5 font-bold text-rose-500">
                                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                              Không đạt
                                            </div>
                                            <span className="font-black text-slate-700">${khongDatCount} tiêu chí</span>
                                          </div>
                                          {chuaDanhGiaCount > 0 && (
                                            <div className="flex items-center justify-between bg-white/90 backdrop-blur-sm border border-slate-100/80 rounded-xl px-2.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] text-xs">
                                              <div className="flex items-center gap-1.5 font-semibold text-slate-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                Chưa đánh giá
                                              </div>
                                              <span className="font-black text-slate-500">${chuaDanhGiaCount} tiêu chí</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              );
                            };

                            return (
                              <tr key={s.id} className="group hover:bg-violet-50/30 transition-colors border-b border-violet-50">
                                <td className="w-12 min-w-[48px] max-w-[48px] sticky left-0 bg-white group-hover:bg-[#faf9fe] transition-colors z-10 p-4 text-slate-400 text-sm align-top">{idx + 1}</td>
                                <td className="w-[260px] min-w-[260px] max-w-[260px] sticky left-12 bg-white group-hover:bg-[#faf9fe] transition-colors z-10 border-r border-violet-100/80 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] whitespace-normal p-4 align-top">
                                  <div className="flex flex-col gap-1.5 w-full">
                                    <div className="font-bold text-slate-800 text-[13px] leading-tight">{s.fullName}</div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-mono text-[9px] font-black text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100 leading-none">{s.studentCode}</span>
                                      {s.grade && <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 leading-none">{s.grade}</span>}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium leading-normal space-y-0.5">
                                      <div>NS: <span className="text-slate-600 font-semibold">{s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "—"}</span> • <span className="text-slate-600 font-medium">{s.gender || "—"}</span></div>
                                      <div className="truncate" title={s.admissionCampus}>CS: <span className="text-slate-600 font-medium">{s.admissionCampus || "—"}</span></div>
                                    </div>
                                  </div>
                                </td>
                                
                                {/* Thể chất */}
                                <td className="w-[220px] min-w-[220px] whitespace-normal border-r border-violet-50/50 p-4 align-top text-xs">
                                  <div className="flex flex-col gap-2 w-full">
                                    {hVal || wVal ? (
                                      <div className="flex flex-col gap-2">
                                        <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/30 border border-emerald-100/70 rounded-2xl p-2.5 shadow-[0_4px_12px_rgba(16,185,129,0.03)] transition-all hover:scale-[1.01] hover:shadow-md">
                                          <div className="flex items-center gap-1 text-[10px] font-black text-emerald-800 uppercase tracking-wider pb-1.5 border-b border-white/60 mb-2">
                                            <span>🏃‍♂️</span>
                                            <span>Thể chất</span>
                                          </div>
                                          <div className="grid grid-cols-3 gap-1 bg-white/80 backdrop-blur-sm border border-emerald-100/50 rounded-xl p-1 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                                            <div className="p-1 flex flex-col items-center justify-center text-center">
                                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">H.Cao</span>
                                              <span className="font-black text-[11px] text-slate-700 mt-0.5">{hVal ? `${hVal}cm` : "—"}</span>
                                            </div>
                                            <div className="p-1 border-l border-r border-slate-100 flex flex-col items-center justify-center text-center">
                                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">C.Nặng</span>
                                              <span className="font-black text-[11px] text-slate-700 mt-0.5">{wVal ? `${wVal}kg` : "—"}</span>
                                            </div>
                                            <div className="p-1 flex flex-col items-center justify-center text-center">
                                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">BMI</span>
                                              <span className="font-black text-[11px] text-violet-600 mt-0.5">{bmiVal ? bmiVal.toFixed(1) : "—"}</span>
                                            </div>
                                          </div>
                                        </div>
                                        {bmiVal && bmiClass && (
                                          <div className={`px-2.5 py-1.5 rounded-xl text-[9px] font-black border uppercase tracking-wider text-center flex items-center justify-center gap-1.5 shadow-[0_2px_4px_rgba(0,0,0,0.02)] ${bmiClass.color}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${bmiClass.dot}`} />
                                            {bmiClass.label}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-slate-300 italic block py-1">Chưa đo thể chất</span>
                                    )}
                                    {/* Physical details hidden for summary view */}
                                  </div>
                                </td>

                                {/* Nhận thức */}
                                {renderAreaCell("NHAN_THUC", "w-[280px] min-w-[280px] whitespace-normal border-r border-violet-50/50")}

                                {/* Ngôn ngữ */}
                                {renderAreaCell("NGON_NGU", "w-[280px] min-w-[280px] whitespace-normal border-r border-violet-50/50")}

                                {/* Tình cảm - Kỹ năng XH - TM */}
                                {renderAreaCell("TINH_CAM_XH_TM", "w-[280px] min-w-[280px] whitespace-normal border-r border-violet-50/50")}

                                {/* Giáo viên đánh giá */}
                                <td className="w-[280px] min-w-[280px] whitespace-normal border-r border-violet-50/50 p-4 align-top text-xs">
                                  <div className="flex flex-col gap-2.5 text-slate-700 w-full">
                                    {s.devProfessionalComment && (
                                      <div className="bg-violet-50/30 border-l-[3px] border-violet-500 rounded-r-xl p-2 flex flex-col gap-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                                        <span className="text-[9px] font-black text-violet-600 uppercase tracking-wider">Chuyên môn</span>
                                        <span className="text-[11px] leading-relaxed text-slate-700 font-medium">{s.devProfessionalComment}</span>
                                      </div>
                                    )}
                                    {s.devPsychologyComment && (
                                      <div className="bg-[#00A19A]/10/30 border-l-[3px] border-indigo-500 rounded-r-xl p-2 flex flex-col gap-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                                        <span className="text-[9px] font-black text-[#00A19A] uppercase tracking-wider">Tâm lý</span>
                                        <span className="text-[11px] leading-relaxed text-slate-700 font-medium">{s.devPsychologyComment}</span>
                                      </div>
                                    )}
                                    {s.devImportantNote && (
                                      <div className="bg-rose-50/50 border border-rose-100/80 border-l-[3px] border-l-rose-500 rounded-xl p-2.5 text-rose-700 font-semibold shadow-[0_1px_2px_rgba(244,63,94,0.03)] flex flex-col gap-0.5">
                                        <span className="text-[9px] font-black text-rose-600 uppercase tracking-wider">Lưu ý đặc biệt</span>
                                        <span className="text-[11px] leading-relaxed">{s.devImportantNote}</span>
                                      </div>
                                    )}
                                    {!s.devProfessionalComment && !s.devPsychologyComment && !s.devImportantNote && (
                                      <span className="text-slate-300 italic block py-1">—</span>
                                    )}
                                  </div>
                                </td>

                                {/* Duyệt BGH MN */}
                                 {showBghSection && (
                                   <td className="w-[220px] min-w-[220px] whitespace-normal border-r border-violet-50/50 p-4 align-top text-xs">
                                     <div className="flex flex-col gap-1.5 w-full">
                                       {s.bghApprovalStatus ? (
                                         <>
                                           <div>
                                             {s.bghApprovalStatus === "DAT_MIEN_HOC_THU" && (
                                               <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-100">ĐẠT - MIỄN HỌC THỬ</span>
                                             )}
                                             {s.bghApprovalStatus === "DAT_HOC_THU" && (
                                               <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#00A19A]/10 text-[#00A19A] border border-[#00A19A]/20">ĐẠT - HỌC THỬ</span>
                                             )}
                                             {s.bghApprovalStatus === "DAT" && (
                                               <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">ĐẠT</span>
                                             )}
                                             {s.bghApprovalStatus === "KHONG_DAT" && (
                                               <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100">KHÔNG ĐẠT</span>
                                             )}
                                             {s.bghApprovalStatus === "Y_KIEN_KHAC" && (
                                               <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">Ý KIẾN KHÁC</span>
                                             )}
                                           </div>
                                           {s.bghApprovalComment && (
                                             <div className="text-[11px] leading-relaxed text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-2 mt-1">
                                               {s.bghApprovalComment}
                                             </div>
                                           )}
                                         </>
                                       ) : (
                                         <div>
                                           <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-50/70 text-violet-600 border border-violet-100/50">
                                             Chờ BGH MN duyệt
                                           </span>
                                         </div>
                                       )}
                                     </div>
                                   </td>
                                 )}

                                {/* Duyệt GĐCS */}
                                 {showGdcsSection && (
                                   <td className="w-[220px] min-w-[220px] whitespace-normal border-r border-violet-50/50 p-4 align-top text-xs">
                                     <div className="flex flex-col gap-1.5 w-full">
                                       {s.gdcsApprovalStatus ? (
                                         <>
                                           <div>
                                             {s.gdcsApprovalStatus === "DAT_MIEN_HOC_THU" && (
                                               <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-100">ĐẠT - MIỄN HỌC THỬ</span>
                                             )}
                                             {s.gdcsApprovalStatus === "DAT_HOC_THU" && (
                                               <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#00A19A]/10 text-[#00A19A] border border-[#00A19A]/20">ĐẠT - HỌC THỬ</span>
                                             )}
                                             {s.gdcsApprovalStatus === "DAT" && (
                                               <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">ĐẠT</span>
                                             )}
                                             {s.gdcsApprovalStatus === "KHONG_DAT" && (
                                               <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100">KHÔNG ĐẠT</span>
                                             )}
                                             {s.gdcsApprovalStatus === "Y_KIEN_KHAC" && (
                                               <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">Ý KIẾN KHÁC</span>
                                             )}
                                           </div>
                                           {s.gdcsApprovalComment && (
                                             <div className="text-[11px] leading-relaxed text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-2 mt-1">
                                               {s.gdcsApprovalComment}
                                             </div>
                                           )}
                                         </>
                                       ) : (
                                         <div>
                                           <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-fuchsia-50/70 text-fuchsia-600 border border-fuchsia-100/50">
                                             Chờ {getGdcsRoleCode(s.admissionCampus)} duyệt
                                           </span>
                                         </div>
                                       )}
                                     </div>
                                   </td>
                                 )}

                                <td className="w-32 min-w-[128px] p-4 align-top">{getResultBadge(s.generalResult)}</td>
                                <td className="w-[350px] min-w-[350px] p-4 align-top">
                                   <div className="flex items-center gap-2">
                                     <button
                                       disabled={sendingNotifyId === s.id}
                                       onClick={() => sendApprovalNotification(s.id)}
                                       className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-black text-amber-700 bg-amber-50 hover:bg-amber-600 hover:text-white rounded-xl border border-amber-100 disabled:opacity-50 transition-all shadow-sm"
                                     >
                                       {sendingNotifyId === s.id ? (
                                         <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                       ) : (
                                         <Send className="w-3.5 h-3.5" />
                                       )}
                                       Yêu cầu Duyệt
                                     </button>
                                     <button
                                       onClick={() => openEvaluation(s)}
                                       className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-black text-violet-700 bg-violet-50 hover:bg-violet-600 hover:text-white rounded-xl border border-violet-100 transition-all shadow-sm"
                                       title="Xem kết quả"
                                     >
                                       <Eye className="w-3.5 h-3.5" /> Xem kết quả
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
            </div>
          )}

          {/* Sub-tab: Đánh giá Học thử */}
          {devTab === "dgkqHocThu" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-violet-100 shadow-sm p-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Kỳ KS:</label>
                  <select value={cPeriodId} onChange={e => { setCPeriodId(e.target.value); setCBatchId(""); }} className="border border-violet-100 rounded-xl p-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-violet-300 min-w-[160px]">
                    <option value="">-- Chọn Kỳ --</option>
                    {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Đợt:</label>
                  <select value={cBatchId} onChange={e => setCBatchId(e.target.value)} className="border border-violet-100 rounded-xl p-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-violet-300 min-w-[140px]" disabled={!cPeriodId}>
                    <option value="">Tất cả đợt</option>
                    {selPeriod?.batches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <button onClick={fetchStudentSummaries} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-xl border border-violet-100"><Search className="w-4 h-4" /> Tìm</button>

                <div className="ml-auto relative"><Search className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" /><input value={cSearch} onChange={e => setCSearch(e.target.value)} placeholder="Tìm bé..." className="pl-9 pr-4 py-2 border border-violet-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-300 min-w-[200px]" /></div>
              </div>

              <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
                {sumLoading ? (
                  <div className="flex justify-center p-12">
                    <span className="text-violet-600 font-bold animate-pulse text-sm">Đang tải danh sách...</span>
                  </div>
                ) : studentSummaries.filter(s => {
                  const result = (s.admissionResult || "").toUpperCase();
                  return result.includes("HỌC THỬ") || result.includes("HOC_THU") || s.probationaryResult || s.probationaryClass;
                }).length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-bold text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200 m-4">
                    {cPeriodId ? "Không có học sinh nào đang ở trạng thái học thử" : "Vui lòng chọn Kỳ và bấm Tìm"}
                  </div>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar flex-1">
                    <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                      <thead className="bg-violet-50 border-b border-violet-100">
                        <tr>
                          {["STT", "Mã bé", "Họ và tên", "Ngày sinh", "Nhóm tuổi", "Lớp học thử", "GV Học thử", "Kết quả học thử", "Thao tác"].map(h => (
                            <th key={h} className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-violet-50">
                        {studentSummaries
                          .filter(s => {
                            const result = (s.admissionResult || "").toUpperCase();
                            return result.includes("HỌC THỬ") || result.includes("HOC_THU") || s.probationaryResult || s.probationaryClass;
                          })
                          .filter(s => !cSearch || s.studentCode.toLowerCase().includes(cSearch.toLowerCase()) || s.fullName.toLowerCase().includes(cSearch.toLowerCase()))
                          .map((s, idx) => {
                            const resultBadge = () => {
                              if (s.probationaryResult === "DAT") return <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">✓ ĐẠT</span>;
                              if (s.probationaryResult === "CHUA_DAT") return <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">✗ CHƯA ĐẠT</span>;
                              return <span className="text-[10px] font-black text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">Chưa đánh giá</span>;
                            };

                            return (
                              <tr key={s.id} className="hover:bg-violet-50/30 transition-colors">
                                <td className="p-4 text-slate-400 text-sm">{idx + 1}</td>
                                <td className="p-4"><span className="font-mono text-xs font-black text-violet-600 bg-violet-50 px-2 py-1 rounded-lg">{s.studentCode}</span></td>
                                <td className="p-4 font-bold text-slate-800 text-sm">{s.fullName}</td>
                                <td className="p-4 text-sm text-slate-500">{s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "—"}</td>
                                <td className="p-4"><span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg border border-purple-100">{s.grade || "—"}</span></td>
                                <td className="p-4 text-slate-600 text-sm">{s.probationaryClass || "—"}</td>
                                <td className="p-4 text-slate-600 text-sm">{s.probationaryTeacher || "—"}</td>
                                <td className="p-4">{resultBadge()}</td>
                                <td className="p-4 flex gap-1.5">
                                  <button
                                    onClick={() => openProbationary(s)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-violet-700 bg-violet-50 hover:bg-violet-500 hover:text-white rounded-xl border border-violet-100 transition-all shadow-sm"
                                  >
                                    <ClipboardList className="w-3.5 h-3.5" /> Đánh giá học thử
                                  </button>
                                  <button
                                    onClick={() => printProbationaryAssessment(s)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-500 hover:text-white rounded-xl border border-emerald-100 transition-all shadow-sm"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                                    In phiếu
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub-tab: Xuất thư Chúc mừng */}
          {devTab === "xuatThuChucMung" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-violet-100 shadow-sm p-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Kỳ KS:</label>
                  <select value={cPeriodId} onChange={e => { setCPeriodId(e.target.value); setCBatchId(""); }} className="border border-violet-100 rounded-xl p-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-violet-300 min-w-[160px]">
                    <option value="">-- Chọn Kỳ --</option>
                    {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Đợt:</label>
                  <select value={cBatchId} onChange={e => setCBatchId(e.target.value)} className="border border-violet-100 rounded-xl p-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-violet-300 min-w-[140px]" disabled={!cPeriodId}>
                    <option value="">Tất cả đợt</option>
                    {selPeriod?.batches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <button onClick={fetchStudentSummaries} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-xl border border-violet-100"><Search className="w-4 h-4" /> Tìm</button>

                <div className="ml-auto relative"><Search className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" /><input value={cSearch} onChange={e => setCSearch(e.target.value)} placeholder="Tìm bé..." className="pl-9 pr-4 py-2 border border-violet-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-300 min-w-[200px]" /></div>
              </div>

              <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
                {sumLoading ? (
                  <div className="flex justify-center p-12">
                    <span className="text-violet-600 font-bold animate-pulse text-sm">Đang tải danh sách...</span>
                  </div>
                ) : studentSummaries.filter(s => {
                  const result = (s.admissionResult || "").toUpperCase();
                  return result.includes("MIỄN HỌC THỬ") || result.includes("MIEN_HOC_THU") || s.probationaryResult === "DAT";
                }).length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-bold text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200 m-4">
                    {cPeriodId ? "Không có học sinh nào được duyệt Miễn học thử" : "Vui lòng chọn Kỳ và bấm Tìm"}
                  </div>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar flex-1">
                    <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                      <thead className="bg-violet-50 border-b border-violet-100">
                        <tr>
                          {["STT", "Mã bé", "Họ và tên", "Ngày sinh", "Nhóm tuổi", "Cơ sở", "Kết quả duyệt", "Thao tác"].map(h => (
                            <th key={h} className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-violet-50">
                        {studentSummaries
                          .filter(s => {
                            const result = (s.admissionResult || "").toUpperCase();
                            return result.includes("MIỄN HỌC THỬ") || result.includes("MIEN_HOC_THU") || s.probationaryResult === "DAT";
                          })
                          .filter(s => !cSearch || s.studentCode.toLowerCase().includes(cSearch.toLowerCase()) || s.fullName.toLowerCase().includes(cSearch.toLowerCase()))
                          .map((s, idx) => {
                            const resultBadge = () => {
                              if (s.probationaryResult === "DAT") {
                                return <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">✓ ĐẠT - SAU HỌC THỬ</span>;
                              }
                              return <span className="text-[10px] font-black text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">✓ ĐẠT - MIỄN HỌC THỬ</span>;
                            };

                            return (
                              <tr key={s.id} className="hover:bg-violet-50/30 transition-colors">
                                <td className="p-4 text-slate-400 text-sm">{idx + 1}</td>
                                <td className="p-4"><span className="font-mono text-xs font-black text-violet-600 bg-violet-50 px-2 py-1 rounded-lg">{s.studentCode}</span></td>
                                <td className="p-4 font-bold text-slate-800 text-sm">{s.fullName}</td>
                                <td className="p-4 text-sm text-slate-500">{s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "—"}</td>
                                <td className="p-4"><span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg border border-purple-100">{s.grade || "—"}</span></td>
                                <td className="p-4 text-slate-600 text-sm">{s.admissionCampus || "—"}</td>
                                <td className="p-4">{resultBadge()}</td>
                                <td className="p-4">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => { setSelectedReportStudent(s); setIsInvitation(false); setIsCommitment(false); setIsPrintModalOpen(true); }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-500 hover:text-white rounded-xl border border-emerald-100 transition-all shadow-sm whitespace-nowrap"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                                      Xuất thư Chúc mừng
                                    </button>
                                    <button
                                      onClick={() => { setSelectedReportStudent(s); setIsInvitation(false); setIsCommitment(true); setIsPrintModalOpen(true); }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-amber-700 bg-amber-50 hover:bg-amber-500 hover:text-white rounded-xl border border-amber-100 transition-all shadow-sm whitespace-nowrap"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                      Bản Cam kết
                                    </button>
                                    <button
                                      onClick={() => openEmailCongratsModal(s)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-violet-700 bg-violet-50 hover:bg-violet-500 hover:text-white rounded-xl border border-violet-100 transition-all shadow-sm whitespace-nowrap cursor-pointer"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                                      Gửi Email
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
            </div>
          )}

          {/* Sub-tab: Quản lý Tiêu chí & Lĩnh vực */}
          {devTab === "manage" && (
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit mb-2">
                <button
                  onClick={() => setDevType("INPUT")}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${devType === "INPUT" ? "bg-white text-violet-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Tiêu chí Khảo sát (Đầu vào)
                </button>
                <button
                  onClick={() => setDevType("PROBATION")}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${devType === "PROBATION" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Tiêu chí Học thử (Probation)
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 bg-violet-50/50 p-1.5 rounded-2xl border border-violet-100 max-w-fit">
                {grades.map(g => (
                  <button
                    key={g}
                    onClick={() => setAgeGroupFilter(g)}
                    className={`px-4 py-2 text-[11px] font-bold rounded-xl transition-all ${ageGroupFilter === g ? "bg-white text-violet-700 shadow-sm border border-violet-100" : "text-slate-500 hover:text-violet-600"}`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {devLoading ? <Spin /> : (
                <div className="space-y-3">
                  {devAreas.map(area => (
                    <div key={area.id} className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
                      <div
                        className="px-4 py-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-violet-50/20 transition-all"
                        onClick={() => setExpAreaId(expAreaId === area.id ? null : area.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3.5 h-3.5 rounded-full"
                            style={{ backgroundColor: area.color || "#6366f1" }}
                          />
                          <div>
                            <h4 className="font-black text-slate-800 text-base">{area.name}</h4>
                            {area.description && <p className="text-xs text-slate-400 font-medium mt-0.5">{area.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={e => { e.stopPropagation(); openAddCriteria(area.id); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-500 hover:text-white rounded-lg border border-emerald-100 transition-all"
                          >
                            <Plus className="w-3 h-3" /> Thêm tiêu chí
                          </button>
                          <span className="text-slate-300 ml-1">
                            {expAreaId === area.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </span>
                        </div>
                      </div>
                      {expAreaId === area.id && (
                        <div className="border-t border-violet-100 p-4 bg-violet-50/10">
                          {(!area.criteria || area.criteria.length === 0) ? (
                            <div className="text-center py-6 text-slate-400 font-bold text-xs bg-white rounded-xl border border-dashed border-violet-200">
                              Chưa có tiêu chí nào cho nhóm tuổi này
                            </div>
                          ) : (
                            <div className="overflow-x-auto bg-white border border-violet-100 rounded-xl shadow-sm">
                              <table className="w-full text-left">
                                <thead className="bg-violet-50/50 border-b border-violet-100">
                                  <tr>
                                    {["STT", "Mã", "Tên Tiêu Chí", "Nhóm tuổi", "Thao tác"].map(h => (
                                      <th key={h} className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-violet-50">
                                  {area.criteria.map((crit, idx) => (
                                    <tr key={crit.id} className="hover:bg-violet-50/30 transition-colors">
                                      <td className="p-3 text-slate-400 text-xs">{idx + 1}</td>
                                      <td className="p-3 font-mono text-xs font-bold text-violet-600">{crit.code}</td>
                                      <td className="p-3 text-sm font-semibold text-slate-700 max-w-[400px] break-words whitespace-normal">{crit.name}</td>
                                      <td className="p-3"><span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{crit.ageGroup}</span></td>
                                      <td className="p-3 text-right">
                                        <div className="flex gap-1">
                                          <button
                                            onClick={() => openEditCriteria(crit)}
                                            className="p-1.5 text-slate-300 hover:text-violet-600 hover:bg-violet-50 rounded-lg"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => setConfirm({ msg: `Xóa tiêu chí "${crit.name}"?`, fn: () => doDeleteCriteria(crit.id) })}
                                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
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
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Reports */}
      {tab === "reports" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="bg-white rounded-2xl border border-violet-100 shadow-sm p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Kỳ KS:</label>
              <select value={rptPeriodId} onChange={e => { setRptPeriodId(e.target.value); setCPeriodId(e.target.value); setRptBatchId("all"); }} className="border border-violet-100 rounded-xl p-2 text-sm outline-none focus:ring-2 focus:ring-violet-300 min-w-[160px]">
                <option value="">-- Chọn Kỳ --</option>
                {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Đợt:</label>
              <select value={rptBatchId} onChange={e => setRptBatchId(e.target.value)} className="border border-violet-100 rounded-xl p-2 text-sm outline-none focus:ring-2 focus:ring-violet-300 min-w-[140px]" disabled={!rptPeriodId}>
                <option value="all">Tất cả đợt</option>
                {periods.find(p => p.id === rptPeriodId)?.batches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <button onClick={() => { setCPeriodId(rptPeriodId); fetchChildren(); }} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-xl border border-violet-100"><RefreshCw className="w-4 h-4" /> Cập nhật</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[{ label: "Tổng trẻ KS", value: rptStats.total, color: "from-violet-600 to-purple-500", icon: Baby }, { label: "Đạt yêu cầu", value: rptStats.passed, color: "from-emerald-500 to-teal-400", icon: CheckCircle }, { label: "Chưa duyệt", value: rptStats.pending, color: "from-amber-500 to-orange-500", icon: AlertCircle }, { label: "Không đạt", value: rptStats.failed, color: "from-rose-500 to-red-400", icon: X }].map((stat, i) => (
              <div key={i} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-5 text-white shadow-md relative overflow-hidden`}>
                <div className="absolute top-3 right-3 opacity-20"><stat.icon className="w-10 h-10" /></div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">{stat.label}</p>
                <p className="text-3xl font-black">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-violet-100 shadow-sm p-6">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-5 flex items-center gap-2"><Heart className="w-4 h-4 text-violet-400" /> Phân bố theo Nhóm tuổi</h3>
            {rptStats.total === 0 ? <p className="text-center text-slate-400 font-bold text-xs py-6 uppercase tracking-wider">Chưa có dữ liệu</p> : (
              <div className="space-y-4">
                {rptStats.gradeStats.map(g => {
                  const pct = rptStats.total > 0 ? Math.round((g.count / rptStats.total) * 100) : 0;
                  return (
                    <div key={g.grade} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm"><span className="font-bold text-slate-700">{g.grade}</span><span className="font-black text-violet-600">{g.count} trẻ ({pct}%)</span></div>
                      <div className="w-full bg-violet-50 h-3 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Report Config */}
      {tab === "report_config" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Left: Settings Panel */}
          <div className="lg:col-span-5 bg-white border border-slate-200 shadow-sm rounded-3xl p-8 space-y-6">
            <div className="flex items-center gap-3 border-b pb-4 mb-2">
              <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center">
                <Settings className="w-5 h-5"/>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">Cấu hình Báo cáo Mầm non</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Thiết lập Logo, Chữ ký, Nội dung theo Cơ sở</p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Chọn cơ sở áp dụng</label>
              <select value={rcCampusId} onChange={e => setRcCampusId(e.target.value)} className={inp}>
                <option value="">-- Chọn Cơ sở --</option>
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>{getCampusFullName(c.campusName || c.campusCode || "")}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Loại báo cáo</label>
              <select value={rcReportType} onChange={e => setRcReportType(e.target.value)} className={inp}>
                <option value="thu_moi">Thư mời</option>
                <option value="thu_chuc_mung">Thư chúc mừng</option>
                <option value="cam_ket_hoc_tap">Cam kết học tập</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tiêu đề văn bản</label>
              <input value={rcTitle} onChange={e => setRcTitle(e.target.value)} placeholder="Nhập tiêu đề..." className={inp} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 ml-1">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Nội dung (Mẫu)</label>
                <button
                  type="button"
                  onClick={() => {
                    const defaultText = rcReportType === "thu_moi" ? defaultPreschoolInvitation : rcReportType === "cam_ket_hoc_tap" ? defaultPreschoolCommitment : defaultPreschoolCongratulations;
                    setRcContent(defaultText);
                    notify("Đã tải mẫu nội dung mặc định!", "ok");
                  }}
                  className="text-[10px] font-extrabold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-2 py-0.5 rounded-lg transition-all"
                >
                  Khôi phục mẫu mặc định
                </button>
              </div>
              <textarea
                value={rcContent}
                onChange={e => setRcContent(e.target.value)}
                rows={7}
                placeholder="Nhập nội dung mẫu thư... Dùng {{fullName}}, {{grade}}, {{admissionCampus}}, {{academicYear}}"
                className={`${inp} py-3 font-normal resize-none text-xs leading-relaxed font-sans`}
              />
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                Từ khóa tự điền: <span className="text-violet-600 font-bold">{"{{fullName}}"}</span>, <span className="text-violet-600 font-bold">{"{{grade}}"}</span>, <span className="text-violet-600 font-bold">{"{{admissionCampus}}"}</span>, <span className="text-violet-600 font-bold">{"{{academicYear}}"}</span>, <span className="text-violet-600 font-bold">{"{{surveyFormType}}"}</span>
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Họ tên Giám đốc Điều hành</label>
              <input value={rcDirectorName} onChange={e => setRcDirectorName(e.target.value)} placeholder="Nhập họ tên Giám đốc Điều hành..." className={inp} />
            </div>

            <div className="space-y-4 pt-2">
              {/* Logo Upload */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Upload Logo Trường</label>
                <div className="flex items-center gap-4">
                  {rcLogo ? (
                    <div className="relative w-16 h-16 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center">
                      <img crossOrigin={rcLogo?.startsWith("data:") ? undefined : "anonymous"} src={rcLogo} alt="Logo" className="max-w-full max-h-full object-contain rounded-lg" />
                      <button onClick={() => setRcLogo("")} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md"><X className="w-3 h-3"/></button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:border-violet-400 hover:text-violet-600 transition-all">
                      <Upload className="w-5 h-5"/>
                      <input type="file" accept="image/*" className="hidden" onChange={handleRcLogoUpload} />
                    </label>
                  )}
                  <div className="text-xs">
                    <p className="font-bold text-slate-600">Logo chính của trường</p>
                    <p className="text-slate-400">Định dạng JPG, PNG. Tối đa 2MB.</p>
                  </div>
                </div>
              </div>

              {/* Signature Upload */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Upload Chữ ký Giám đốc Điều hành</label>
                <div className="flex items-center gap-4">
                  {rcSignature ? (
                    <div className="relative w-16 h-16 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center">
                      <img crossOrigin={rcSignature?.startsWith("data:") ? undefined : "anonymous"} src={rcSignature} alt="Chữ ký" className="max-w-full max-h-full object-contain rounded-lg" />
                      <button onClick={() => setRcSignature("")} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md"><X className="w-3 h-3"/></button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:border-violet-400 hover:text-violet-600 transition-all">
                      <Upload className="w-5 h-5"/>
                      <input type="file" accept="image/*" className="hidden" onChange={handleRcSignatureUpload} />
                    </label>
                  )}
                  <div className="text-xs">
                    <p className="font-bold text-slate-600">Chữ ký cá nhân (nền trong suốt)</p>
                    <p className="text-slate-400">Định dạng PNG khuyên dùng.</p>
                  </div>
                </div>
              </div>

              {/* Background Upload */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Upload Hình nền / Watermark</label>
                <div className="flex items-center gap-4">
                  {rcBackground ? (
                    <div className="relative w-16 h-16 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center">
                      <img crossOrigin={rcBackground?.startsWith("data:") ? undefined : "anonymous"} src={rcBackground} alt="Hình nền" className="max-w-full max-h-full object-contain rounded-lg" />
                      <button onClick={() => setRcBackground("")} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md"><X className="w-3 h-3"/></button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:border-violet-400 hover:text-violet-600 transition-all">
                      <Upload className="w-5 h-5"/>
                      <input type="file" accept="image/*" className="hidden" onChange={handleRcBackgroundUpload} />
                    </label>
                  )}
                  <div className="text-xs">
                    <p className="font-bold text-slate-600">Hình nền / Watermark cho văn bản</p>
                    <p className="text-slate-400">Tự động hiển thị mờ làm nền.</p>
                  </div>
                </div>
              </div>

              {/* Footer Upload */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Upload Hình Footer Văn bản</label>
                <div className="flex items-center gap-4">
                  {rcFooter ? (
                    <div className="relative w-16 h-16 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center">
                      <img crossOrigin={rcFooter?.startsWith("data:") ? undefined : "anonymous"} src={rcFooter} alt="Footer" className="max-w-full max-h-full object-contain rounded-lg" />
                      <button onClick={() => setRcFooter("")} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md"><X className="w-3 h-3"/></button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:border-violet-400 hover:text-violet-600 transition-all">
                      <Upload className="w-5 h-5"/>
                      <input type="file" accept="image/*" className="hidden" onChange={handleRcFooterUpload} />
                    </label>
                  )}
                  <div className="text-xs">
                    <p className="font-bold text-slate-600">Hình Footer (Banner địa chỉ)</p>
                    <p className="text-slate-400">Thay thế dải địa chỉ chữ mặc định.</p>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={savePreschoolReportConfig} className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-violet-100 transition-all flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Lưu cấu hình
            </button>
          </div>

          {/* Right: Live Preview */}
          <div className="lg:col-span-7 bg-slate-50 border border-slate-200 shadow-inner rounded-3xl p-8 flex flex-col min-h-[500px]">
            <span className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-5">Xem trước mẫu thiết kế thực tế</span>
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-lg flex flex-col w-full aspect-[210/297] relative overflow-hidden">
              {/* Background Watermark */}
              {rcBackground && (
                <img 
                  crossOrigin={(rcBackground || "").startsWith("data:") ? undefined : "anonymous"} 
                  src={rcBackground} 
                  alt="Watermark" 
                  className="absolute pointer-events-none select-none" 
                  style={{ 
                    display: "block", 
                    position: "absolute", 
                    top: "10%", 
                    left: "10%", 
                    width: "80%", 
                    height: "80%", 
                    objectFit: "contain", 
                    opacity: 0.45, 
                    zIndex: 0, 
                    pointerEvents: "none" 
                  }} 
                />
              )}

              {/* Content */}
              <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="border-b border-slate-200 pb-2 mb-3">
                  {rcLogo ? (
                    <img crossOrigin={rcLogo?.startsWith("data:") ? undefined : "anonymous"} src={rcLogo} alt="Logo" className="h-8 object-contain mb-1" />
                  ) : (
                    <span className="text-[10px] font-black tracking-tight text-teal-600 uppercase">SKY-LINE</span>
                  )}
                  <p className="font-extrabold text-[9px] uppercase tracking-wider text-slate-800">TRƯỜNG MẦM NON SKY-LINE</p>
                </div>

                {/* Title */}
                <div className="text-center mb-3">
                  <h2 className="text-[11px] font-black tracking-widest text-slate-800 uppercase">{rcTitle || (rcReportType === "thu_moi" ? "THƯ MỜI" : rcReportType === "cam_ket_hoc_tap" ? "BẢN CAM KẾT HỌC TẬP" : "THƯ CHÚC MỪNG")}</h2>
                </div>

                {/* Greeting */}
                <p className="text-[9px] italic mb-2 text-slate-700 font-bold">
                  {rcReportType === "thu_moi" ? <>Kính gửi Quý Phụ huynh và bé <strong>Nguyễn Minh An</strong>,</> : <>Thân gửi bé <strong>Nguyễn Minh An</strong>,</>}
                </p>

                {/* Content */}
                <div className="flex-1 space-y-1.5 text-[9px] leading-relaxed text-slate-600 text-justify overflow-hidden font-serif">
                  {renderPreschoolTemplate(
                    rcContent || (rcReportType === "thu_moi" ? defaultPreschoolInvitation : rcReportType === "cam_ket_hoc_tap" ? defaultPreschoolCommitment : defaultPreschoolCongratulations),
                    {
                      fullName: "Nguyễn Minh An",
                      grade: "18 đến 24 tháng",
                      surveyFormType: "Chất lượng cao",
                      admissionCampus: "Cơ sở Global",
                      academicYear: "2025-2026",
                      hocKy: "1",
                      signatureName: rcDirectorName || "Trần Thị Thanh"
                    }
                  ).split('\n').filter(Boolean).slice(0, 10).map((para, idx) => {
                    const isList = /^\s*[\d•\-*]+/.test(para);
                    return (
                      <p key={idx} className={isList ? "pl-4 font-semibold text-slate-700" : ""} style={isList ? {} : { textIndent: "1cm" }}>{para}</p>
                    );
                  })}
                </div>

                {/* Signature */}
                {rcReportType === "cam_ket_hoc_tap" ? (
                  <div className="grid grid-cols-2 gap-4 pt-3 text-center">
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
                          <img crossOrigin={rcSignature?.startsWith("data:") ? undefined : "anonymous"} src={rcSignature} alt="Chữ ký" className="max-h-full object-contain" />
                        ) : (
                          <div className="text-[7px] text-slate-300 italic">Chưa upload</div>
                        )}
                      </div>
                      <p className="text-[9px] font-black text-slate-700">{rcDirectorName || "-- Họ tên --"}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end pt-3">
                    <div className="text-center space-y-1 min-w-[140px]">
                      <p className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">TM. HỘI ĐỒNG TUYỂN SINH</p>
                      <p className="text-[6px] text-slate-400 uppercase tracking-wider">GIÁM ĐỐC ĐIỀU HÀNH{rcCampusTitleSuffix ? " SKY-LINE " + rcCampusTitleSuffix : ""}</p>
                      <div className="h-10 flex items-center justify-center">
                        {rcSignature ? (
                          <img crossOrigin={rcSignature?.startsWith("data:") ? undefined : "anonymous"} src={rcSignature} alt="Chữ ký" className="max-h-full object-contain" />
                        ) : (
                          <div className="text-[7px] text-slate-300 italic">Chưa upload chữ ký</div>
                        )}
                      </div>
                      <p className="text-[9px] font-black text-slate-700">{rcDirectorName || "-- Họ tên --"}</p>
                    </div>
                  </div>
                )}

                {/* Footer */}
                {rcFooter ? (
                  <div className="pt-2 mt-2 border-t border-slate-200">
                    <img crossOrigin={rcFooter?.startsWith("data:") ? undefined : "anonymous"} src={rcFooter} alt="Footer" className="w-full h-auto" />
                  </div>
                ) : (
                  <div className="border-t border-teal-500/30 pt-2 mt-2 text-[6px] text-slate-400">
                    <p className="text-center text-teal-600 font-bold">www.skylineschool.edu.vn • Hotline: (+84.236) 378 7777</p>
                  </div>
                )}
              </div>
            </div>

            {/* Info note */}
            <div className="mt-4 bg-violet-50 border border-violet-100 rounded-xl p-3">
              <p className="text-[11px] font-bold text-violet-700">💡 Lưu ý:</p>
              <p className="text-[10px] text-violet-600 mt-1">Cấu hình sẽ tự động được áp dụng khi xuất thư cho trẻ thuộc cơ sở <strong>{getCampusFullName(campuses.find(c => c.id === rcCampusId)?.campusName || "")}</strong>. Mỗi cơ sở có thể có cấu hình riêng.</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Period */}
      <Modal open={pModal} onClose={() => setPModal(false)} title={editP ? "Sửa Kỳ" : "Tạo Kỳ mới"} footer={<><button onClick={() => setPModal(false)} className="flex-1 text-xs font-black uppercase text-slate-400 hover:text-slate-600">Hủy</button><button onClick={savePeriod} className="flex-1 py-3.5 bg-violet-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-violet-100">Lưu</button></>}>
        <div className="space-y-4">
          <Field label="Mã Kỳ" required>
            <input
              value={pForm.code}
              onChange={(e) => {
                const codeVal = e.target.value;
                setPForm(prev => {
                  const nextState = { ...prev, code: codeVal };
                  if (!editP) {
                    const typeLabel = nextState.surveyType === "OPEN_DAY" ? "Khảo sát Open Day" : "Khảo sát lẻ cơ sở";
                    let formattedDate = "";
                    if (nextState.startDate) {
                      const parts = nextState.startDate.split('-');
                      if (parts.length === 3) formattedDate = ` - ${parts[2]}/${parts[1]}/${parts[0]}`;
                    }
                    nextState.name = `${typeLabel} - ${codeVal}${formattedDate}`;
                  }
                  return nextState;
                });
              }}
              disabled={!!editP}
              className={inp}
              placeholder="VD: MN-HK1-2026"
            />
          </Field>
          <Field label="Tên Kỳ" required><input value={pForm.name} onChange={e => setPForm({...pForm, name: e.target.value})} className={inp} placeholder="VD: KS đầu vào Mầm non 2026" /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Ngày bắt đầu">
              <input
                type="date"
                value={pForm.startDate}
                onChange={(e) => {
                  const dateVal = e.target.value;
                  setPForm(prev => {
                    const nextState = { ...prev, startDate: dateVal };
                    if (!editP) {
                      const typeLabel = nextState.surveyType === "OPEN_DAY" ? "Khảo sát Open Day" : "Khảo sát lẻ cơ sở";
                      let formattedDate = "";
                      if (dateVal) {
                        const parts = dateVal.split('-');
                        if (parts.length === 3) formattedDate = ` - ${parts[2]}/${parts[1]}/${parts[0]}`;
                      }
                      nextState.name = `${typeLabel} - ${nextState.code || ""}${formattedDate}`;
                    }
                    return nextState;
                  });
                }}
                className={inp}
              />
            </Field><Field label="Ngày kết thúc"><input type="date" value={pForm.endDate} onChange={e => setPForm({...pForm, endDate: e.target.value})} className={inp} /></Field></div>
          <Field label="Trạng thái"><select value={pForm.status} onChange={e => setPForm({...pForm, status: e.target.value})} className={inp}><option value="ACTIVE">Đang mở</option><option value="INACTIVE">Đã đóng</option><option value="LOCKED">Đã khóa</option></select></Field>
          <Field label="Dạng khảo sát">
            <select
              value={pForm.surveyType}
              onChange={async (e) => {
                const val = e.target.value;
                setPForm(prev => {
                  const nextState = { ...prev, surveyType: val };
                  if (!editP) {
                    const typeLabel = val === "OPEN_DAY" ? "Khảo sát Open Day" : "Khảo sát lẻ cơ sở";
                    let formattedDate = "";
                    if (nextState.startDate) {
                      const parts = nextState.startDate.split('-');
                      if (parts.length === 3) formattedDate = ` - ${parts[2]}/${parts[1]}/${parts[0]}`;
                    }
                    nextState.name = `${typeLabel} - ${nextState.code || ""}${formattedDate}`;
                  }
                  return nextState;
                });
                if (!editP) {
                  try {
                    const r = await fetch(`/api/preschool-input-assessments?get_next_code=true&surveyType=${val}`);
                    if (r.ok) {
                      const res = await r.json();
                      if (res.nextCode) {
                        setPForm(prev => {
                          const nextState = { ...prev, surveyType: val, code: res.nextCode };
                          const typeLabel = val === "OPEN_DAY" ? "Khảo sát Open Day" : "Khảo sát lẻ cơ sở";
                          let formattedDate = "";
                          if (nextState.startDate) {
                            const parts = nextState.startDate.split('-');
                            if (parts.length === 3) formattedDate = ` - ${parts[2]}/${parts[1]}/${parts[0]}`;
                          }
                          nextState.name = `${typeLabel} - ${res.nextCode}${formattedDate}`;
                          return nextState;
                        });
                      }
                    }
                  } catch (err) {
                    console.error("Error fetching next period code:", err);
                  }
                }
              }}
              className={inp}
            >
              <option value="KHAO_SAT_LE">Khảo sát lẻ cơ sở</option>
              <option value="OPEN_DAY">Khảo sát Open Day</option>
            </select>
          </Field>
          <Field label="Mô tả"><textarea value={pForm.description} onChange={e => setPForm({...pForm, description: e.target.value})} className={inp + " resize-none"} rows={2} /></Field>
        </div>
      </Modal>

      {/* Modal: Batch */}
      <Modal open={bModal} onClose={() => setBModal(false)} title={editB ? "Sửa Đợt" : "Thêm Đợt mới"} footer={<><button onClick={() => setBModal(false)} className="flex-1 text-xs font-black uppercase text-slate-400 hover:text-slate-600">Hủy</button><button onClick={saveBatch} className="flex-1 py-3.5 bg-violet-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-violet-100">Lưu</button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số đợt">
              <input
                type="number"
                min={1}
                value={bForm.batchNumber}
                onChange={(e) => {
                  const numVal = e.target.value;
                  setBForm(prev => {
                    const nextState = { ...prev, batchNumber: numVal };
                    if (!editB) {
                      const campus = campuses.find(c => c.id === nextState.campusId);
                      const campusName = campus ? campus.campusName : "Tất cả";
                      let formattedDate = "";
                      if (nextState.startDate) {
                        const parts = nextState.startDate.split('-');
                        if (parts.length === 3) formattedDate = `_${parts[2]}/${parts[1]}/${parts[0]}`;
                      }
                      nextState.name = `KSĐV_${campusName} _ Đợt ${numVal || "1"}${formattedDate}`;
                    }
                    return nextState;
                  });
                }}
                className={inp}
              />
            </Field>
            <Field label="Tên nội dung" required>
              <input
                value={bForm.name}
                onChange={e => setBForm({...bForm, name: e.target.value})}
                className={inp}
                placeholder="VD: KS Mầm non CS A"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ngày bắt đầu" required>
              <input
                type="date"
                value={bForm.startDate}
                onChange={(e) => {
                  const dateVal = e.target.value;
                  setBForm(prev => {
                    const nextState = { ...prev, startDate: dateVal };
                    if (!editB) {
                      const campus = campuses.find(c => c.id === nextState.campusId);
                      const campusName = campus ? campus.campusName : "Tất cả";
                      let formattedDate = "";
                      if (dateVal) {
                        const parts = dateVal.split('-');
                        if (parts.length === 3) formattedDate = `_${parts[2]}/${parts[1]}/${parts[0]}`;
                      }
                      nextState.name = `KSĐV_${campusName} _ Đợt ${nextState.batchNumber || "1"}${formattedDate}`;
                    }
                    return nextState;
                  });
                }}
                className={inp}
              />
            </Field>
            <Field label="Ngày kết thúc" required>
              <input
                type="date"
                value={bForm.endDate}
                onChange={e => setBForm({...bForm, endDate: e.target.value})}
                className={inp}
              />
            </Field>
          </div>
          <Field label="Cơ sở">
            <select
              value={bForm.campusId}
              onChange={(e) => {
                const campVal = e.target.value;
                setBForm(prev => {
                  const nextState = { ...prev, campusId: campVal };
                  if (!editB) {
                    const campus = campuses.find(c => c.id === campVal);
                    const campusName = campus ? campus.campusName : "Tất cả";
                    let formattedDate = "";
                    if (nextState.startDate) {
                      const parts = nextState.startDate.split('-');
                      if (parts.length === 3) formattedDate = `_${parts[2]}/${parts[1]}/${parts[0]}`;
                    }
                    nextState.name = `KSĐV_${campusName} _ Đợt ${nextState.batchNumber || "1"}${formattedDate}`;
                  }
                  return nextState;
                });
              }}
              className={inp}
            >
              <option value="">-- Tất cả cơ sở --</option>
              {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
            </select>
          </Field>
          <Field label="Người phụ trách"><select value={bForm.assignedUserId} onChange={e => setBForm({...bForm, assignedUserId: e.target.value})} className={inp}><option value="">-- Chưa gán --</option>{giaoVuCSUsers.map((u: any) => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select></Field>
          <Field label="Trạng thái"><select value={bForm.status} onChange={e => setBForm({...bForm, status: e.target.value})} className={inp}><option value="ACTIVE">Đang mở</option><option value="INACTIVE">Đóng</option><option value="LOCKED">Khóa</option></select></Field>
        </div>
      </Modal>

      {/* Modal: Child */}
      <Modal open={cModal} onClose={() => setCModal(false)} title={editC ? "Sửa thông tin Bé" : "Thêm Bé Mầm non"} size="lg" footer={<><button onClick={() => setCModal(false)} className="flex-1 text-xs font-black uppercase text-slate-400">Đóng</button><button onClick={saveChild} className="flex-1 py-3.5 bg-violet-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-violet-100">Lưu</button></>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Mã bé" required><input value={cForm.studentCode} onChange={e => setCForm({...cForm, studentCode: e.target.value})} disabled={!!editC} className={inp + (editC ? " bg-violet-50/50" : "")} placeholder="MN001" /></Field>
          <Field label="Họ và tên" required><input value={cForm.fullName} onChange={e => setCForm({...cForm, fullName: e.target.value})} className={inp} placeholder="Họ và tên đầy đủ" /></Field>
          <Field label="Ngày sinh">
            <input
              type="date"
              value={cForm.dateOfBirth}
              onChange={e => {
                const dobVal = e.target.value;
                setCForm(prev => {
                  const nextState = { ...prev, dateOfBirth: dobVal };
                  const info = getMonthsAndSuggestGrade(dobVal, nextState.batchId);
                  if (info.suggest) {
                    nextState.grade = info.suggest;
                  }
                  return nextState;
                });
              }}
              className={inp}
            />
            {ageInfo.months !== null && (
              <div className="text-[11px] font-black text-violet-600 mt-1.5 uppercase tracking-wider bg-violet-50/50 rounded-xl px-3 py-1.5 border border-violet-100 flex items-center gap-1.5 animate-in fade-in duration-200">
                <Sparkles className="w-3.5 h-3.5" />
                Xác minh: {ageInfo.months} tháng tuổi ({ageInfo.surveyDateStr})
              </div>
            )}
          </Field>
          <Field label="Giới tính"><select value={cForm.gender} onChange={e => setCForm({...cForm, gender: e.target.value})} className={inp}><option value="">-- Chọn --</option><option value="Nam">Nam</option><option value="Nữ">Nữ</option></select></Field>
          <Field label="Nhóm tuổi"><select value={cForm.grade} onChange={e => setCForm({...cForm, grade: e.target.value})} className={inp}><option value="">-- Chọn nhóm tuổi --</option>{grades.map(g => <option key={g} value={g}>{g}</option>)}</select></Field>
          <Field label="Cơ sở">
            <select
              value={cForm.admissionCampus}
              onChange={e => setCForm({...cForm, admissionCampus: e.target.value})}
              className={inp}
            >
              <option value="">-- Chọn cơ sở --</option>
              {campuses.map(c => <option key={c.campusName} value={c.campusName}>{c.campusName}</option>)}
            </select>
          </Field>
          <Field label="Đợt KS">
            <select
              value={cForm.batchId}
              onChange={e => {
                const bIdVal = e.target.value;
                setCForm(prev => {
                  const nextState = { ...prev, batchId: bIdVal };
                  const info = getMonthsAndSuggestGrade(nextState.dateOfBirth, bIdVal);
                  if (info.suggest) {
                    nextState.grade = info.suggest;
                  }
                  const batch = periods.flatMap(p => p.batches || []).find(b => b.id === bIdVal);
                  const campus = campuses.find(c => c.id === batch?.campusId);
                  if (campus) {
                    nextState.admissionCampus = campus.campusName;
                  } else {
                    nextState.admissionCampus = "";
                  }
                  return nextState;
                });
              }}
              className={inp}
            >
              <option value="">-- Không gán --</option>
              {selPeriod?.batches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Hệ KS">
            <select
              value={cForm.surveyFormType}
              onChange={e => setCForm({...cForm, surveyFormType: e.target.value})}
              className={inp}
            >
              <option value="">-- Chọn Hệ KS --</option>
              {configs.filter(c => c.categoryType === "system").map(c => (
                <option key={c.code} value={c.name}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Xét duyệt">
            <select
              value={cForm.admissionResult}
              onChange={e => setCForm({...cForm, admissionResult: e.target.value})}
              className={inp}
            >
              <option value="">Chưa duyệt</option>
              <option value="Đạt">Đạt</option>
              <option value="Không đạt">Không đạt</option>
              <option value="Học thử">Học thử</option>
            </select>
          </Field>
        </div>
      </Modal>

      {isEmailCongratsModalOpen && emailCongratsStudent && (
        <div className="fixed inset-0 z-550 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-violet-100 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-700 p-6 text-white relative">
              <button 
                onClick={() => setIsEmailCongratsModalOpen(false)}
                className="absolute right-6 top-6 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
              <h3 className="text-lg font-black tracking-wide uppercase">Gửi Thư chúc mừng nhập học</h3>
              <p className="text-xs text-white/80 mt-1 font-medium">Học sinh: <strong className="text-white text-sm font-black">{emailCongratsStudent.fullName}</strong> ({emailCongratsStudent.studentCode}) • Cơ sở: <span className="bg-white/20 px-2 py-0.5 rounded-md font-bold text-[11px]">{emailCongratsStudent.admissionCampus || "—"}</span></p>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {emailCongratsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-bold text-violet-600 animate-pulse">Đang tải danh sách người nhận theo Cơ sở...</span>
                </div>
              ) : (
                <>
                  {/* Additional Note */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">Lời nhắn/Ghi chú thêm gửi kèm email (Không bắt buộc):</label>
                    <textarea
                      value={emailCongratsAdditionalNote}
                      onChange={(e) => setEmailCongratsAdditionalNote(e.target.value)}
                      placeholder="Nhập lời chúc riêng hoặc lời nhắn đặc biệt từ Bộ phận Tuyển sinh..."
                      rows={3}
                      className="w-full border border-violet-100 rounded-2xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all text-slate-700 resize-none shadow-inner bg-slate-50/50"
                    />
                  </div>

                  {/* Recipients List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">Danh sách người nhận thư chúc mừng:</label>
                      <div className="flex gap-2 text-[10px] font-bold">
                        <button 
                          onClick={() => setEmailCongratsRecipients(prev => prev.map(r => ({ ...r, checked: true })))}
                          className="text-violet-600 hover:text-violet-800 bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-100 transition-colors cursor-pointer"
                        >
                          Chọn tất cả
                        </button>
                        <button 
                          onClick={() => setEmailCongratsRecipients(prev => prev.map(r => ({ ...r, checked: false })))}
                          className="text-slate-500 hover:text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        >
                          Bỏ chọn tất cả
                        </button>
                      </div>
                    </div>

                    <div className="border border-violet-100 rounded-2xl overflow-hidden divide-y divide-violet-50 bg-slate-50/30">
                      {["Tư vấn", "Giáo vụ", "Tổ/Môn", "GĐCS", "BGH", "Giáo viên"].map((role) => {
                        const roleRecipients = emailCongratsRecipients.filter(r => r.role === role);
                        if (roleRecipients.length === 0) return null;

                        return (
                          <div key={role} className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider ${
                                role === "GĐCS" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                                role === "BGH" ? "bg-[#00A19A]/10 text-indigo-700 border border-[#00A19A]/20" :
                                role === "Giáo vụ" ? "bg-violet-50 text-violet-700 border border-violet-100" :
                                role === "Tổ/Môn" ? "bg-cyan-50 text-cyan-700 border border-cyan-100" :
                                role === "Giáo viên" ? "bg-teal-50 text-teal-700 border border-teal-100" :
                                "bg-amber-50 text-amber-700 border border-amber-100"
                              }`}>
                                {role === "GĐCS" ? "GIÁM ĐỐC CƠ SỞ" : role === "Tổ/Môn" ? "TỔ / MÔN DẠY" : role === "Giáo viên" ? "GIÁO VIÊN TỔ / MÔN DẠY" : role}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold">{roleRecipients.length} người</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                              {emailCongratsRecipients.map((r, idx) => {
                                if (r.role !== role) return null;
                                return (
                                  <label 
                                    key={idx} 
                                    className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all cursor-pointer select-none text-xs font-semibold ${
                                      r.checked 
                                        ? "bg-violet-50/50 border-violet-200 text-violet-900 shadow-sm" 
                                        : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={r.checked}
                                      onChange={(e) => handleRecipientCheckChange(idx, e.target.checked)}
                                      className="mt-0.5 rounded text-violet-600 focus:ring-violet-400 border-slate-300 w-3.5 h-3.5"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-bold truncate">{r.name}</div>
                                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{r.email}</div>
                                      {r.info && <div className="text-[10px] text-teal-600 font-semibold truncate mt-0.5">🏫 {r.info}</div>}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      {emailCongratsRecipients.length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-xs font-bold">
                          Không tìm thấy người nhận nào phù hợp với Cơ sở này.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEmailCongratsModalOpen(false)}
                className="px-5 py-2 text-xs font-black text-slate-500 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-all cursor-pointer"
                disabled={emailCongratsSending}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSendCongratsEmail}
                className="flex items-center gap-1.5 px-6 py-2 text-xs font-black text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-all shadow-md shadow-violet-100 hover:shadow-violet-200 cursor-pointer"
                disabled={emailCongratsSending || emailCongratsLoading}
              >
                {emailCongratsSending ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                    Xác nhận gửi email
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}


      


      {/* Quick Email Modal Overlay */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-[150] p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 animate-in fade-in zoom-in-95 duration-300">
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
                      Gửi thư chúc mừng hàng loạt (Mầm non)
                    </h2>
                    <p className="text-slate-300 text-xs mt-0.5 font-medium">Gửi email mẫu chúc mừng kèm danh sách và PDF học sinh được duyệt</p>
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
              
              {/* Recipient Input Configuration Panel */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4 text-left">
                {/* TO field */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Địa chỉ Email người nhận (To) <span className="text-rose-500">*</span></label>
                  <input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="Nhập email người nhận (phân cách bằng dấu phẩy)..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 text-sm font-medium text-slate-700 transition-all shadow-sm" />
                  
                  {/* Presets for To */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase mr-1 mt-1">Gợi ý To:</span>
                    {[
                      { label: "Giáo vụ (" + campusLabel + ")", email: campusEmails.giaovu },
                      { label: "GĐCS (" + campusLabel + ")", email: campusEmails.gdcs },
                      { label: "BGH MN (" + campusLabel + ")", email: campusEmails.bghmn },
                      { label: "Tư vấn (" + campusLabel + ")", email: campusEmails.tuyensinh },
                      { label: "Khảo thí", email: "bankhaothi@skylineschool.edu.vn" },
                    ].map(p => {
                      const isActive = recipientEmail.includes(p.email);
                      return (
                        <button
                          key={p.email}
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              setRecipientEmail(recipientEmail.split(',').map(x => x.trim()).filter(x => x !== p.email).join(', '));
                            } else {
                              const current = recipientEmail.trim();
                              setRecipientEmail(current ? (current + ", " + p.email) : p.email);
                            }
                          }}
                          className={"px-2 py-1 rounded-lg text-[10px] font-bold border transition-all " + (isActive ? 'bg-[#00A19A]/10 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100')}
                        >
                          + {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CC field */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Đồng kính gửi (CC)</label>
                  <input value={ccEmail} onChange={e => setCcEmail(e.target.value)} placeholder="Nhập email CC (phân cách bằng dấu phẩy)..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 text-sm font-medium text-slate-700 transition-all shadow-sm" />
                  
                  {/* Presets for CC */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase mr-1 mt-1">Gợi ý CC:</span>
                    {[
                      { label: "Khảo thí", email: "bankhaothi@skylineschool.edu.vn" },
                      { label: "Giáo vụ (" + campusLabel + ")", email: campusEmails.giaovu },
                      { label: "GĐCS (" + campusLabel + ")", email: campusEmails.gdcs },
                      { label: "BGH MN (" + campusLabel + ")", email: campusEmails.bghmn },
                      { label: "Tư vấn (" + campusLabel + ")", email: campusEmails.tuyensinh },
                    ].map(p => {
                      const isActive = ccEmail.includes(p.email);
                      return (
                        <button
                          key={p.email}
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              setCcEmail(ccEmail.split(',').map(x => x.trim()).filter(x => x !== p.email).join(', '));
                            } else {
                              const current = ccEmail.trim();
                              setCcEmail(current ? (current + ", " + p.email) : p.email);
                            }
                          }}
                          className={"px-2 py-1 rounded-lg text-[10px] font-bold border transition-all " + (isActive ? 'bg-[#00A19A]/10 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100')}
                        >
                          + {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Email Subject Block */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Tiêu đề thư Email gửi đi <span className="text-rose-500">*</span></label>
                  <input 
                    value={emailSubject} 
                    onChange={e => setEmailSubject(e.target.value)} 
                    placeholder="Nhập tiêu đề email..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 text-sm font-medium text-slate-700 transition-all shadow-sm"
                  />
                </div>
                
                {/* Options toggle */}
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 select-none">
                    <input 
                      type="checkbox" 
                      checked={attachLetters}
                      onChange={e => setAttachLetters(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4.5 h-4.5 cursor-pointer accent-emerald-600"
                    />
                    <span>Tự động đính kèm tệp PDF Thư chúc mừng trúng tuyển cho mỗi bé đạt yêu cầu</span>
                  </label>
                </div>
              </div>

              {/* Target Students list with Checkboxes */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">Danh sách học sinh gửi thư ({emailStudents.filter(s => s.checked !== false).length}/{emailStudents.length} học sinh)</span>
                    <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">Hệ thống sẽ tạo PDF Thư chúc mừng cho các học sinh được chọn</span>
                  </div>
                  <div className="flex gap-2 text-[10px] font-bold">
                    <button 
                      onClick={() => setEmailStudents(prev => prev.map(s => ({ ...s, checked: true })))}
                      className="text-violet-600 hover:text-violet-800 bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-100 transition-colors cursor-pointer"
                    >
                      Chọn tất cả
                    </button>
                    <button 
                      onClick={() => setEmailStudents(prev => prev.map(s => ({ ...s, checked: false })))}
                      className="text-slate-500 hover:text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                    >
                      Bỏ chọn tất cả
                    </button>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[260px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
                        <th className="p-3 w-10 text-center">Gửi</th>
                        <th className="p-3">Mã học sinh</th>
                        <th className="p-3">Họ và tên</th>
                        <th className="p-3">Nhóm tuổi</th>
                        <th className="p-3">Hệ khảo sát</th>
                        <th className="p-3">Kết quả</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailStudents.map((s, idx) => (
                        <tr 
                          key={s.id} 
                          onClick={() => {
                            setEmailStudents(prev => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], checked: copy[idx].checked === false ? true : false };
                              return copy;
                            });
                          }}
                          className={"hover:bg-slate-50/50 transition-colors cursor-pointer " + (s.checked === false ? "text-slate-400 bg-slate-50/20" : "font-semibold")}
                        >
                          <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={s.checked !== false}
                              onChange={e => {
                                setEmailStudents(prev => {
                                  const copy = [...prev];
                                  copy[idx] = { ...copy[idx], checked: e.target.checked };
                                  return copy;
                                });
                              }}
                              className="rounded border-slate-300 text-[#00A19A] focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-mono">{s.studentCode}</td>
                          <td className="p-3 font-bold text-slate-800">{s.fullName}</td>
                          <td className="p-3">{s.grade}</td>
                          <td className="p-3">{s.surveyFormType || "—"}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {s.admissionResult || "Đạt"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-slate-100 flex justify-end items-center gap-3 shrink-0">
              <button 
                onClick={() => setIsEmailModalOpen(false)} 
                className="px-5 py-2.5 rounded-xl hover:bg-slate-100 font-bold text-slate-700 text-xs transition-colors cursor-pointer"
              >
                Đóng lại
              </button>
              <button
                onClick={handleSendQuickEmailSubmit}
                disabled={emailSending || emailStudents.filter(s => s.checked !== false).length === 0}
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
                    Xác nhận & Gửi Email chúc mừng
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}




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
                    z-index: 0 !important;
                    pointer-events: none !important;
              }

            /* FORCE EXPLICIT A4 PORTRAIT CONFIGURATION */
            @page { 
              size: A4 portrait; 
              margin: 0mm; 
            }
            
            .print-page::before {
              content: none !important;
              display: none !important;
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
                padding: 20mm 20mm 42mm 20mm !important; /* Reserved 35mm bottom zone for absolute footer */
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
              
              /* DEFINITIVE ABSOLUTE FOOTER PINNING FOR PREMIUM PRESENTATION */
              .print-footer, .footer-container {
                position: absolute !important;
                bottom: 12mm !important; left: 20mm !important; right: 20mm !important;
                width: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                background: transparent !important;
                display: block !important;
                z-index: 9999 !important;
              }

              
              /* Sync typographic rendering to match high-fidelity print view on screen */
              .print-page p, #print-letter-area p {
                font-size: 14.5px !important;
                line-height: 1.5 !important;
                text-align: justify !important;
                text-justify: inter-word !important;
              }
              .print-page h2, #print-letter-area h2 {
                font-size: 18pt !important;
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
              
              .print-page, #print-letter-area {
                width: 210mm !important;
                height: 297mm !important;
                min-height: 297mm !important;
                max-height: 297mm !important;
                margin: 0 !important; /* MUST BE 0 to avoid Chrome auto-centering */
                padding: 20mm 20mm 42mm 20mm !important; /* Premium margins reserving 35mm at bottom */
                box-shadow: none !important;
                border: none !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-start !important;
                position: relative !important;
                background: white !important;
                overflow: hidden !important;
              }
              
              /* Force all footers to anchor to the very bottom of the page */
              .print-footer, .footer-container, .print-page .print-footer, #print-letter-area .print-footer {
                position: absolute !important;
                bottom: 12mm !important; left: 20mm !important; right: 20mm !important;
                width: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
                background: transparent !important;
                display: block !important;
                z-index: 9999 !important;
                flex-shrink: 0 !important;
              }

              
              .print-page:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }


              @page {
                size: A4 portrait;
                margin: 0mm !important;
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
              
              .print-page > div {
                flex: none !important;
              }
              
              .print-page > div:first-of-type {
                flex: 1 1 auto !important;
                display: flex !important;
                flex-direction: column !important;
                height: auto !important;
              }


              /* USER MANDATED CONTENT TYPOGRAPHY RULES */
              .print-page p, #print-letter-area p, .print-page .space-y-2\.5 p, .print-page .space-y-3 p, .print-page .space-y-6 p {
                text-align: justify !important;
                text-justify: inter-word !important;
                line-height: 1.45 !important; /* Premium unified line height: 1.45 */
                font-size: 13.5pt !important; /* Standard font size: 13.5pt */
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 no-print">
              <div className="flex items-center gap-2">
                {isInvitation ? <Mail className="w-5 h-5 text-[#00A19A]"/> : <GraduationCap className="w-5 h-5 text-[#00A19A]"/>}
                <h3 className="text-base font-black text-slate-800">{isInvitation ? "Mẫu Thư mời khảo sát" : isCommitment ? "Bản Cam kết học tập" : "Mẫu Thư Chúc mừng"}</h3>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  id="export-pdf-btn"
                  onClick={async () => {
                    const printArea = document.getElementById('print-main-container');
                    if (!printArea) return;
                    
                    const academicYearStr = selectedReportStudent?.academicYear?.substring(0, 4) || new Date().getFullYear().toString();
                    const monthStr = "T" + String(new Date().getMonth() + 1).padStart(2, '0');
                    const studentName = (selectedReportStudent?.fullName || "").replace(/\s+/g, '_');
                    const prefix = isInvitation ? "Thu_Moi_Khao_Sat" : isCommitment ? "Ban_Cam_Ket" : "Thu_Chuc_Mung";
                    const pdfFileName = prefix + "_" + studentName + ".pdf";
                    
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
                      
                      // Fix Chrome print viewport scroll bug on overflow-y-auto elements
                      const scrollWrapper = document.getElementById('print-body-scroll-wrapper');
                      const savedWrapperScrollTop = scrollWrapper ? scrollWrapper.scrollTop : 0;
                      if (scrollWrapper) {
                        scrollWrapper.scrollTop = 0;
                      }
                      
                      // Allow a microtask for rendering before print
                      setTimeout(() => {
                        window.print();
                        window.scrollTo(0, savedScrollY);
                        if (scrollWrapper) {
                          scrollWrapper.scrollTop = savedWrapperScrollTop;
                        }
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-100 flex items-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Lưu File (PDF)
                </button>
                
                <button type="button"
                  onClick={() => { setIsPrintModalOpen(false); setMockPreviewStudent(null); }}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 shadow-sm transition-all cursor-pointer"
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
                  style={{ fontFamily: "'Times New Roman', Times, serif", width: "210mm", height: "297mm", padding: "20mm 20mm 42mm 20mm", margin: "0 auto 20px auto", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "flex-start", overflow: "hidden", position: "relative" }}
              >

                {/* Print Watermark */}
                {studentCampusConfig?.background ? (
                  <img crossOrigin={(studentCampusConfig.background || "").startsWith("data:") ? undefined : "anonymous"} className="print-watermark" src={studentCampusConfig.background} alt="Watermark" style={{ display: "block", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "110mm", height: "auto", opacity: 0.04, zIndex: 0, pointerEvents: "none" }} />
                ) : (
                  <svg className="print-watermark" style={{ display: "block", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "110mm", height: "auto", opacity: 0.04, zIndex: 0, pointerEvents: "none" }} viewBox="0 0 100 100">
                    <path fill="#00A6A9" d="M10,80 Q50,40 90,20 Q60,50 10,80 Z" />
                    <path fill="#00A6A9" d="M30,80 Q60,55 90,35 Q65,60 30,80 Z" />
                  </svg>
                )}

                {/* Top Logo and Header */}
                <div className="flex flex-col relative z-10 w-full" style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>

                  <div className="flex flex-col gap-1 border-b pb-2 mb-3">
                    <div className="flex items-center justify-between">
                      {studentCampusConfig?.logo ? (
                        <img crossOrigin={studentCampusConfig.logo?.startsWith("data:") ? undefined : "anonymous"} src={studentCampusConfig.logo} alt="Logo" className="h-12 object-contain" />
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
                      <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-800" style={{ fontFamily: "Arial, sans-serif" }}>{studentSchoolName || "TRƯỜNG MẦM NON SKY-LINE"}</h4>
                    </div>
                  </div>

                  {/* Letter Title */}
                  <div className="text-center my-4">
                    <h2 className="text-indigo-950 uppercase mb-2" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "18pt", fontWeight: "bold", letterSpacing: "1px" }}>
                      {isInvitation ? (studentCampusConfig?.title || "THƯ MỜI") : isCommitment ? (studentCampusConfig?.title || "BẢN CAM KẾT HỌC TẬP") : (studentCampusConfig?.title || "THƯ CHÚC MỪNG")}
                    </h2>
                  </div>

                  {/* Greeting */}
                  <p className="text-[16px] italic mb-3 text-slate-800">
                    {isInvitation ? (
                      <>Kính gửi Quý Phụ huynh và em <strong className="font-black not-italic text-slate-900">{selectedReportStudent.fullName}</strong>,</>
                    ) : (
                      <>Thân gửi con <strong className="font-black not-italic text-slate-900">{selectedReportStudent.fullName}</strong>,</>
                    )}
                  </p>

                  {/* Body Paragraphs */}
                  {isInvitation ? (
                    <div className="space-y-3 text-justify text-slate-800 font-serif" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "13.5pt", lineHeight: "1.45", textAlign: "justify" }}>
                      {renderPreschoolTemplate(
                        studentCampusConfig?.content || defaultPreschoolInvitation,
                        {
                          ...selectedReportStudent,
                          signatureName: studentCampusConfig?.directorName || selectedReportStudent?.signatureName || ""
                        }
                      ).split('\n').filter(Boolean).map((para, idx) => {
                        const isList = /^\s*[\d•\-*]+/.test(para);
                        return (
                          <p key={idx} className={isList ? "pl-6 font-semibold text-slate-700 my-1" : ""} style={isList ? {} : { textIndent: "1cm" }}>
                            {para}
                          </p>
                        );
                      })}
                    </div>
                  ) : isCommitment ? (
                    <div className="space-y-3 text-justify text-slate-800 font-serif" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "13.5pt", lineHeight: "1.45", textAlign: "justify" }}>
                      {renderPreschoolTemplate(
                        studentCampusConfig?.content || defaultPreschoolCommitment,
                        {
                          ...selectedReportStudent,
                          signatureName: studentCampusConfig?.directorName || selectedReportStudent?.signatureName || ""
                        }
                      ).split('\n').filter(Boolean).map((para, idx) => {
                        const isList = /^[\d•\-*]+/.test(para.trim());
                        return (
                          <p key={idx} className={isList ? "pl-6 font-semibold text-slate-700 my-1" : ""} style={isList ? {} : { textIndent: "1cm" }}>
                            {para}
                          </p>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3 text-justify text-slate-800 font-serif" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "13.5pt", lineHeight: "1.45", textAlign: "justify" }}>
                      {renderPreschoolTemplate(
                        studentCampusConfig?.content || defaultPreschoolCongratulations,
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
                    <div className="grid grid-cols-2 gap-8 mt-auto w-full text-center" style={{ pageBreakInside: "avoid", marginTop: "24px", paddingTop: "12px" }}>
                      <div className="flex flex-col items-center">
                        <p className="font-bold uppercase text-slate-700 text-[11pt] tracking-wider">ĐẠI DIỆN GIA ĐÌNH</p>
                        <p className="italic text-[9pt] text-slate-400 mt-1">(Ký và ghi rõ họ tên)</p>
                        <div className="h-[60px] flex items-end justify-center my-2">
                          <span className="text-slate-300 italic text-xs">Ký tên</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <p className="italic text-slate-500 mb-1 text-[11pt]">{formattedLetterDate}</p>
                        <p className="font-bold uppercase text-[#0f172a] text-[11pt]">TM. HỘI ĐỒNG TUYỂN SINH</p>
                        <p className="font-bold uppercase text-[#475569] text-[9pt] mt-0.5">
                          GIÁM ĐỐC ĐIỀU HÀNH SKY-LINE {campusTitleSuffix}
                        </p>
                        
                        <div className="h-[60px] flex items-center justify-center my-2" style={{ height: "60px" }}>
                          {studentCampusConfig?.signature ? (
                            <img crossOrigin={studentCampusConfig?.signature?.startsWith("data:") ? undefined : "anonymous"} src={studentCampusConfig?.signature} alt="Signature" className="max-h-full object-contain" />
                          ) : (
                            <svg style={{ height: "60px", maxHeight: "60px" }} viewBox="0 0 100 40" width="120">
                              <path d="M10,25 Q30,5 50,20 T90,15 M30,12 Q45,28 60,8" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                          )}
                        </div>
                        
                        <p className="font-bold text-[#1e293b] text-[12pt] mt-0">
                          {studentCampusConfig?.directorName || "Trần Thị Thanh"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end mt-auto pr-4" style={{ pageBreakInside: "avoid", marginTop: "24px", paddingTop: "12px" }}>
                      <div className="flex flex-col items-center text-center" style={{ minWidth: "70mm" }}>
                        <p className="italic text-slate-500 mb-1 text-[12pt]">{formattedLetterDate}</p>
                        <p className="font-bold uppercase text-[#0f172a] text-[12pt]">TM. HỘI ĐỒNG TUYỂN SINH</p>
                        <p className="font-bold uppercase text-[#475569] text-[10pt] mt-0.5">
                          GIÁM ĐỐC ĐIỀU HÀNH SKY-LINE {campusTitleSuffix}
                        </p>
                        
                        <div className="h-[60px] flex items-center justify-center my-2" style={{ height: "60px" }}>
                          {studentCampusConfig?.signature ? (
                            <img crossOrigin={studentCampusConfig?.signature?.startsWith("data:") ? undefined : "anonymous"} src={studentCampusConfig?.signature} alt="Signature" className="max-h-full object-contain" />
                          ) : (
                            <svg style={{ height: "60px", maxHeight: "60px" }} viewBox="0 0 100 40" width="120">
                              <path d="M10,25 Q30,5 50,20 T90,15 M30,12 Q45,28 60,8" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                          )}
                        </div>
                        
                        <p className="font-bold text-[#1e293b] text-[13pt] mt-0">
                          {studentCampusConfig?.directorName || "Trần Thị Thanh"}
                        </p>
                      </div>
                    </div>
                  )}

                                {/* Footer Contact */}
                {studentCampusConfig?.footer ? (
                  <div className="border-t border-slate-200 pt-3 z-10 w-full print-footer" style={{ marginTop: "auto", width: "100%", paddingLeft: "0", paddingRight: "0", boxSizing: "border-box" }}>
                    <img crossOrigin={studentCampusConfig?.footer?.startsWith("data:") ? undefined : "anonymous"} src={studentCampusConfig?.footer} alt="Footer Print" className="w-full" style={{ maxHeight: "100px", objectFit: "contain" }} />
                  </div>
                ) : (
                  <div className="w-full pt-2 z-10 print-footer" style={{ marginTop: "auto", width: "100%", boxSizing: "border-box", fontFamily: "Arial, sans-serif" }}>
                    {/* Dividing brand line */}
                    <div className="flex items-center gap-2 mb-2 w-full">
                      <span className="font-bold text-[#00A6A9] whitespace-nowrap uppercase text-[9.5pt] tracking-wide">HỆ THỐNG GIÁO DỤC SKY-LINE</span>
                      <div className="flex-grow border-t border-[#00A6A9]/70 h-0 mt-0.5"></div>
                      <span className="font-semibold text-[#00A6A9] whitespace-nowrap lowercase text-[9pt]">www.skylineschool.edu.vn</span>
                    </div>
                    
                    {/* Information Grid */}
                    <div className="flex flex-row justify-between w-full relative text-[7.5pt] text-slate-500 leading-tight">
                      {/* Column 1 */}
                      <div className="w-[32%] flex flex-col gap-1 text-left">
                        <div>
                          <p className="font-bold text-[#00A6A9] text-[8pt]">SKY-LINE Riverside</p>
                          <p className="mt-0.5">Lô A2.4 Trần Đăng Ninh, Q. Hải Châu, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#00A6A9] text-[8pt]">SKY-LINE Central</p>
                          <p className="mt-0.5">Số 48 Nguyễn Du, Q. Hải Châu, TP. Đà Nẵng</p>
                        </div>
                      </div>
                      
                      {/* Column 2 */}
                      <div className="w-[32%] flex flex-col gap-1 text-left">
                        <div>
                          <p className="font-bold text-[#00A6A9] text-[8pt]">SKY-LINE Global</p>
                          <p className="mt-0.5">Lô A2 Trần Đăng Ninh, Q. Hải Châu, TP. Đà Nẵng</p>
                        </div>
                        <div>
                          <p className="font-bold text-[#00A6A9] text-[8pt]">SKY-LINE Beach</p>
                          <p className="mt-0.5">Số 199 Trần Anh Tông, Q. Thanh Khê, TP. Đà Nẵng</p>
                        </div>
                      </div>
                      
                      {/* Column 3 */}
                      <div className="w-[32%] flex flex-col gap-1 text-left">
                        <div>
                          <p className="font-bold text-[#00A6A9] text-[8pt]">SKY-LINE Hill</p>
                          <p className="mt-0.5">Khối Hà My Đông A, Điện Bàn, Quảng Nam</p>
                        </div>
                        <div className="flex flex-col font-semibold text-slate-700 mt-1">
                          <p>(+84.236) 378 7777</p>
                          <p>(+84.236) 356 8777</p>
                        </div>
                      </div>

                      {/* Brand checkmark vector */}
                      <div className="absolute right-[-4px] top-[-4px] w-[50px] h-[38px] opacity-100 pointer-events-none flex items-center justify-center text-[#00A6A9]">
                        <svg viewBox="0 0 120 60" className="w-full h-full fill-current">
                          <path d="M 8 26 C 24 32, 50 52, 62 60 C 78 36, 102 16, 118 3 C 95 16, 76 44, 62 62 C 48 46, 25 32, 8 26 Z" fill="currentColor" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}


                </div>
                </div>
                {([]) && ([]).length > 0 && (
                  <div 
                    className="bg-white shadow-lg border border-slate-200 relative text-slate-800 text-sm leading-relaxed print-page mt-8"
                    style={{ fontFamily: "'Times New Roman', Times, serif", width: "210mm", height: "auto", padding: "12.7mm 15mm 15mm 15mm", margin: "0 auto 20px auto", boxSizing: "border-box", display: "block", overflow: "hidden" }}
                  >
                    <div className="flex flex-col relative z-10 w-full" style={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}>
                {/* Print Watermark */}
                {studentCampusConfig?.background && (
                  <img crossOrigin={(studentCampusConfig.background || "").startsWith("data:") ? undefined : "anonymous"}  className="print-watermark" src={studentCampusConfig.background} alt="Watermark" style={{ display: "block", position: "absolute", top: "22%", left: "10%", transform: "none", width: "80%", height: "auto", opacity: 0.45, zIndex: 0, pointerEvents: "none" }} />
                )}
                {/* Top Logo and Header (Synchronized perfectly with Page 1) */}
                      <div className="flex flex-col gap-1 border-b pb-2 mb-3">
                        <div className="flex items-center justify-between">
                          {studentCampusConfig?.logo ? (
                            <img crossOrigin={studentCampusConfig.logo?.startsWith("data:") ? undefined : "anonymous"} src={studentCampusConfig.logo} alt="Logo" className="h-12 object-contain" />
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
                          <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-800" style={{ fontFamily: "Arial, sans-serif" }}>{studentSchoolName || "TRƯỜNG MẦM NON SKY-LINE"}</h4>
                        </div>
                      </div>

                      {/* Page Title */}
                      <div className="text-center my-6">
                        <h2 className="text-indigo-950 uppercase mb-4" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "18pt", fontWeight: "bold", letterSpacing: "1px" }}>
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
                              <th className="px-5 py-2.5 font-bold text-center uppercase text-slate-950 w-32">Số lượng</th>
                            </tr>
                          </thead>
                          <tbody>
                            {([]).map((item, idx) => (
                              <tr key={item.id} className="border-b border-slate-950 last:border-b-0">
                                <td className="px-3 py-2.5 border-r border-slate-950 text-center text-slate-900" style={{ borderRightWidth: '1px', borderColor: '#000' }}>{idx + 1}</td>
                                <td className="px-5 py-2.5 border-r border-slate-950 font-medium text-slate-900" style={{ borderRightWidth: '1px', borderColor: '#000' }}>{item.name}</td>
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
                      <div className="border-t border-slate-200 pt-3 z-10 w-full print-footer" style={{ marginTop: "40px", width: "100%", paddingLeft: "15mm", paddingRight: "15mm", boxSizing: "border-box" }}>
                        <img crossOrigin={studentCampusConfig.footer.startsWith("data:") ? undefined : "anonymous"}  src={studentCampusConfig.footer} alt="Footer Print" className="w-full" style={{ maxHeight: "100px", objectFit: "contain" }} />
                      </div>
                    ) : (
                      <div className="w-full pt-1 z-10 print-footer" style={{ marginTop: "40px", width: "100%", paddingLeft: "15mm", paddingRight: "15mm", boxSizing: "border-box", fontFamily: "Arial, sans-serif" }}>
                    {/* High-fidelity Header Title & Line */}
                    <div className="flex items-center gap-2 mb-2.5 w-full">
                      <span className="font-bold text-[#00A6A9] whitespace-nowrap uppercase text-[11.5px] tracking-wide">HỆ THỐNG GIÁO DỤC SKY-LINE</span>
                      <div className="flex-grow border-t border-[#00A6A9]/70 h-0 mt-0.5"></div>
                      <span className="font-semibold text-[#00A6A9] whitespace-nowrap lowercase text-[11px]">www.skylineschool.edu.vn</span>
                    </div>
                    
                    {/* Information Grid */}
                    <div className="flex flex-row justify-between w-full relative text-[9px]">
                      {/* Left Column (3 branches) */}
                      <div className="w-[30%] flex flex-col gap-1.5 text-left">
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
                      <div className="w-[30%] flex flex-col gap-1.5 text-left">
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
                    <div className="absolute right-[-5px] top-[2px] w-16 h-12 opacity-100 pointer-events-none flex items-center justify-center text-[#00A6A9]">
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
                      style={{ fontFamily: "'Times New Roman', Times, serif", width: "210mm", height: "auto", padding: "12.7mm 15mm 15mm 15mm", margin: "0 auto 20px auto", boxSizing: "border-box", display: "block", overflow: "hidden" }}
                    >
                      <div className="flex flex-col relative z-10 w-full" style={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}>
                        {/* Print Watermark */}
                        {studentCampusConfig?.background && (
                          <img crossOrigin={(studentCampusConfig.background || "").startsWith("data:") ? undefined : "anonymous"} className="print-watermark" src={studentCampusConfig.background} alt="Watermark" style={{ display: "block", position: "absolute", top: "22%", left: "10%", transform: "none", width: "80%", height: "auto", opacity: 0.45, zIndex: 0, pointerEvents: "none" }} />
                        )}
                        
                        {/* Top Logo and Header */}
                        <div className="flex flex-col gap-1 border-b pb-2 mb-3">
                          <div className="flex items-center justify-between">
                            {studentCampusConfig?.logo ? (
                              <img crossOrigin={studentCampusConfig.logo?.startsWith("data:") ? undefined : "anonymous"} src={studentCampusConfig.logo} alt="Logo" className="h-12 object-contain" />
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
                            <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-800" style={{ fontFamily: "Arial, sans-serif" }}>{studentSchoolName || "TRƯỜNG MẦM NON SKY-LINE"}</h4>
                          </div>
                        </div>

                        <div className="text-center my-6">
                          <h2 className="text-indigo-950 uppercase mb-2" style={{ fontSize: "18pt", fontWeight: "bold", letterSpacing: "1px" }}>CHI TIẾT ĐÁNH GIÁ</h2>
                          <h3 className="text-lg font-bold text-slate-700 uppercase">{subject.name}</h3>
                        </div>

                        <div className="space-y-8 mt-4">
                          {failedCriteria.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-base font-bold text-rose-700 border-b border-rose-200 pb-1 uppercase tracking-wide">Các tiêu chí chưa đạt</h4>
                              <ul className="space-y-2 list-none">
                                {failedCriteria.map((name, i) => (
                                  <li key={i} className="flex items-start gap-3 text-[14px]">
                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
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
                      {null ? (
                        <div className="border-t border-slate-200 pt-3 z-10 w-full print-footer" style={{ marginTop: "40px", width: "100%", paddingLeft: "15mm", paddingRight: "15mm", boxSizing: "border-box" }}>
                          <img crossOrigin={({}).footer?.startsWith("data:") ? undefined : "anonymous"} src={({}).footer} alt="Footer Print" className="w-full" style={{ maxHeight: "100px", objectFit: "contain" }} />
                        </div>
                      ) : (
                        <div className="w-full pt-1 z-10 print-footer" style={{ marginTop: "40px", width: "100%", paddingLeft: "15mm", paddingRight: "15mm", boxSizing: "border-box", fontFamily: "Arial, sans-serif" }}>
                          <div className="flex items-center gap-2 mb-2.5 w-full">
                            <span className="font-bold text-[#00A6A9] whitespace-nowrap uppercase text-[11.5px] tracking-wide">HỆ THỐNG GIÁO DỤC SKY-LINE</span>
                            <div className="flex-grow border-t border-[#00A6A9]/70 h-0 mt-0.5"></div>
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
                  {/* Modal: Config */}
      <Modal open={cfgModal} onClose={() => setCfgModal(false)} title={editCfg ? "Sửa danh mục" : "Thêm danh mục"} footer={<><button onClick={() => setCfgModal(false)} className="flex-1 text-xs font-black uppercase text-slate-400">Hủy</button><button onClick={saveCfg} className="flex-1 py-3.5 bg-violet-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest">Lưu</button></>}>
        <div className="space-y-4">
          <Field label="Loại" required><select value={cfgForm.categoryType} onChange={e => setCfgForm({...cfgForm, categoryType: e.target.value})} className={inp}><option value="">-- Chọn loại --</option><option value="criteria">Diện KS</option><option value="system">Hệ KS</option></select></Field>
          <Field label="Mã" required><input value={cfgForm.code} onChange={e => setCfgForm({...cfgForm, code: e.target.value})} disabled={!!editCfg} className={inp} placeholder="TUYEN_MOI" /></Field>
          <Field label="Tên" required><input value={cfgForm.name} onChange={e => setCfgForm({...cfgForm, name: e.target.value})} className={inp} placeholder="Tuyển mới" /></Field>
        </div>
      </Modal>

      {/* Modal: Đánh giá Phát triển trẻ */}
      <Modal
        open={evalModal}
        onClose={() => setEvalModal(false)}
        title={`Phiếu đánh giá phát triển: ${evalStudent?.fullName || ""}`}
        size="xl"
        footer={isAssessmentLocked ? (
          <button onClick={() => setEvalModal(false)} className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
            Đóng
          </button>
        ) : (
          <>
            <button onClick={() => setEvalModal(false)} className="flex-1 text-xs font-black uppercase text-slate-400 hover:text-slate-600">
              Đóng
            </button>
            <button
              onClick={saveEvaluation}
              disabled={savingEval || devLoading}
              className="flex-1 py-3.5 bg-violet-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-violet-100 disabled:opacity-50"
            >
              {savingEval ? "Đang lưu..." : "Lưu Đánh Giá"}
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          {isAssessmentLocked && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 animate-bounce" />
              <div>
                <p className="text-xs font-black uppercase tracking-wider">Phiếu đánh giá đã hoàn thành</p>
                <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">Học sinh đã đạt cả hai bước phê duyệt (BGH &amp; GĐCS). Phiếu ở trạng thái chỉ đọc để lưu trữ.</p>
              </div>
            </div>
          )}

          <div className="bg-violet-50/50 p-4 rounded-2xl border border-violet-100 flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Học sinh</p>
              <p className="text-base font-black text-slate-800">{evalStudent?.fullName}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã bé</p>
              <p className="text-sm font-bold text-violet-600 font-mono">{evalStudent?.studentCode}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhóm tuổi</p>
              <p className="text-sm font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">{evalStudent?.grade}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GV Thực hiện khảo sát</p>
              <p className="text-sm font-bold text-indigo-700 bg-[#00A19A]/10 px-2 py-0.5 rounded-lg border border-[#00A19A]/20">{assignedTeachers}</p>
            </div>
          </div>

          {devLoading ? <Spin /> : devAreas.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-bold text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              Chưa cấu hình tiêu chí nào cho nhóm tuổi: {evalStudent?.grade}
            </div>
          ) : (
            <div className="space-y-4">
              {devAreas.map(area => (
                <div key={area.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: area.color || "#6366f1" }} />
                      <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide">{area.name}</h4>
                    </div>
                    {(area.code === "THE_CHAT" || area.name?.toLowerCase().includes("thể chất")) && (() => {
                      const bmiVal = calculateBMI();
                      const bmiClass = bmiVal ? getBMIClassification(bmiVal) : null;
                      if (!bmiVal || !bmiClass) return null;
                      return (
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[11px] font-black uppercase tracking-wider animate-in fade-in zoom-in duration-300 ${bmiClass.color}`}>
                          <div className={`w-2 h-2 rounded-full animate-pulse ${bmiClass.dot}`} />
                          <span>BMI: {bmiVal.toFixed(1)} ({bmiClass.label})</span>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="divide-y divide-slate-100 p-4 space-y-4">
                    {area.criteria.map((crit, idx) => {
                      const isTheChat = area.code === "THE_CHAT" || area.code?.includes("THE_CHAT") || area.name?.toLowerCase().includes("thể chất");
                      const isHeight = isTheChat && (crit.code?.endsWith("_01") || crit.name?.toLowerCase().includes("chiều cao"));
                      const isWeight = isTheChat && (crit.code?.endsWith("_02") || crit.name?.toLowerCase().includes("cân nặng"));
                      const isPhysical = isHeight || isWeight;
                      const unit = isHeight ? "cm" : "kg";

                      // Parse note with pipe separator: "110 cm|obs text"
                      const rawNote = studentScores[crit.id]?.note || "";
                      const pipeIdx = rawNote.indexOf("|");
                      const rawMeasure = pipeIdx >= 0 ? rawNote.substring(0, pipeIdx) : rawNote;
                      const rawObs = pipeIdx >= 0 ? rawNote.substring(pipeIdx + 1) : "";
                      const parsedNum = parseFloat(rawMeasure.replace(/[^\d.]/g, ""));
                      const numStr = (isPhysical && !isNaN(parsedNum) && parsedNum > 0) ? String(parsedNum) : "";

                      const updatePhysical = (newNum: string, newObs: string) => {
                        let combined = "";
                        if (newNum && newObs) combined = `${newNum} ${unit}|${newObs}`;
                        else if (newNum) combined = `${newNum} ${unit}`;
                        else if (newObs) combined = `|${newObs}`;
                        setStudentScores(prev => ({
                          ...prev,
                          [crit.id]: { result: prev[crit.id]?.result || "CHUA_THE_HIEN", note: combined }
                        }));
                      };

                      const radioOpts = [
                        { key: "CHUA_THE_HIEN", label: "Chưa thể hiện", color: "peer-checked:bg-slate-100 peer-checked:text-slate-700 border-slate-200" },
                        { key: "DAT", label: "Đạt", color: "peer-checked:bg-emerald-50 peer-checked:text-emerald-700 peer-checked:border-emerald-200 border-slate-200" },
                        { key: "KHONG_DAT", label: "Không đạt", color: "peer-checked:bg-rose-50 peer-checked:text-rose-700 peer-checked:border-rose-200 border-slate-200" }
                      ];

                      return (
                        <div key={crit.id} className="pt-3 first:pt-0">
                          <p className="text-sm font-bold text-slate-700 flex items-start gap-2">
                            <span className="font-mono text-xs text-slate-400 font-normal">#{idx+1}</span>
                            {crit.name}
                          </p>

                          {isPhysical ? (
                            <>
                              {/* Dedicated numeric measurement input */}
                              <div className="mt-2.5 flex flex-wrap items-center gap-3">
                                <div className="flex items-center bg-white border-2 border-violet-200 rounded-2xl overflow-hidden hover:border-violet-400 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100 transition-all shadow-sm">
                                  <input
                                    type="number"
                                    step={isHeight ? "1" : "0.1"}
                                    min="0"
                                    max={isHeight ? "250" : "150"}
                                    value={numStr}
                                    onChange={e => updatePhysical(e.target.value, rawObs)}
                                    placeholder={isHeight ? "0" : "0.0"}
                                    disabled={isAssessmentLocked}
                                    className="w-24 text-xl font-black text-slate-800 outline-none bg-transparent text-center px-3 py-2.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:text-slate-400 disabled:cursor-not-allowed"
                                  />
                                  <div className="px-3.5 py-2.5 bg-violet-50 border-l-2 border-violet-200 text-sm font-black text-violet-600 select-none min-w-[48px] text-center">
                                    {unit}
                                  </div>
                                </div>

                                {/* BMI live display — shown on weight row */}
                                {isWeight && (() => {
                                  const bmiVal = calculateBMI();
                                  const bmiClass = bmiVal ? getBMIClassification(bmiVal) : null;
                                  if (!bmiVal || !bmiClass) {
                                    return (
                                      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider">BMI:</span>
                                        <span className="text-sm font-black text-slate-300 font-mono">--</span>
                                        <span className="text-[10px] text-slate-300">(nhập chiều cao trước)</span>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border font-black animate-in fade-in zoom-in-95 duration-300 ${bmiClass.color}`}>
                                      <div className={`w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0 ${bmiClass.dot}`} />
                                      <span className="text-[11px] uppercase tracking-wider">BMI:</span>
                                      <span className="text-lg font-mono">{bmiVal.toFixed(1)}</span>
                                      <span className="text-[11px] opacity-80">— {bmiClass.label}</span>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Radio buttons */}
                              <div className="flex flex-wrap gap-3 mt-3">
                                {radioOpts.map(opt => (
                                  <label key={opt.key} className={`relative flex items-center ${isAssessmentLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                                    <input
                                      type="radio"
                                      name={`crit-${crit.id}`}
                                      checked={studentScores[crit.id]?.result === opt.key}
                                      onChange={() => setStudentScores(prev => ({
                                        ...prev,
                                        [crit.id]: { result: opt.key, note: prev[crit.id]?.note || "" }
                                      }))}
                                      disabled={isAssessmentLocked}
                                      className="sr-only peer"
                                    />
                                    <span className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all peer-checked:ring-2 peer-checked:ring-violet-500/20 ${opt.color}`}>
                                      {opt.label}
                                    </span>
                                  </label>
                                ))}
                              </div>

                              {/* Observation note */}
                              <input
                                type="text"
                                value={rawObs}
                                onChange={e => updatePhysical(numStr, e.target.value)}
                                placeholder={isAssessmentLocked ? "Không có ghi chú" : "Ghi chú quan sát..."}
                                disabled={isAssessmentLocked}
                                className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs font-medium outline-none focus:border-violet-400 focus:bg-white transition-all disabled:bg-slate-100/50 disabled:cursor-not-allowed disabled:text-slate-500"
                              />
                            </>
                          ) : (
                            <>
                              {/* Standard radio buttons */}
                              <div className="flex flex-wrap gap-4 mt-2">
                                {radioOpts.map(opt => (
                                  <label key={opt.key} className={`relative flex items-center ${isAssessmentLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                                    <input
                                      type="radio"
                                      name={`crit-${crit.id}`}
                                      checked={studentScores[crit.id]?.result === opt.key}
                                      onChange={() => setStudentScores(prev => ({
                                        ...prev,
                                        [crit.id]: { result: opt.key, note: prev[crit.id]?.note || "" }
                                      }))}
                                      disabled={isAssessmentLocked}
                                      className="sr-only peer"
                                    />
                                    <span className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all peer-checked:ring-2 peer-checked:ring-violet-500/20 ${opt.color}`}>
                                      {opt.label}
                                    </span>
                                  </label>
                                ))}
                              </div>

                              {/* Standard note input */}
                              <input
                                type="text"
                                value={rawNote}
                                onChange={e => setStudentScores(prev => ({
                                  ...prev,
                                  [crit.id]: { result: prev[crit.id]?.result || "CHUA_THE_HIEN", note: e.target.value }
                                }))}
                                placeholder={isAssessmentLocked ? "Không có ghi chú" : "Nhập ghi chú quan sát..."}
                                disabled={isAssessmentLocked}
                                className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs font-medium outline-none focus:border-violet-400 focus:bg-white transition-all disabled:bg-slate-100/50 disabled:cursor-not-allowed disabled:text-slate-500"
                              />
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* ĐÁNH GIÁ CHUNG */}
              <div className="mt-6 rounded-2xl border border-dashed border-rose-200 bg-gradient-to-br from-rose-50/60 to-pink-50/60 p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div>
                  <h4 className="text-xs font-black text-rose-600 uppercase tracking-widest">ĐÁNH GIÁ CHUNG</h4>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Đánh giá chuyên môn</label>
                  <textarea
                    value={devProfComment}
                    onChange={e => setDevProfComment(e.target.value)}
                    rows={3}
                    placeholder={isAssessmentLocked ? "Chưa có nhận xét" : "Nhận xét về sự phát triển chuyên môn của trẻ..."}
                    disabled={isAssessmentLocked}
                    className="w-full bg-white border border-rose-100 rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition-all resize-none placeholder:text-slate-300 disabled:bg-slate-100/50 disabled:cursor-not-allowed disabled:text-slate-500 disabled:border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Đánh giá tâm lý</label>
                  <textarea
                    value={devPsyComment}
                    onChange={e => setDevPsyComment(e.target.value)}
                    rows={3}
                    placeholder={isAssessmentLocked ? "Chưa có nhận xét" : "Nhận xét về trạng thái tâm lý, cảm xúc của trẻ..."}
                    disabled={isAssessmentLocked}
                    className="w-full bg-white border border-rose-100 rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition-all resize-none placeholder:text-slate-300 disabled:bg-slate-100/50 disabled:cursor-not-allowed disabled:text-slate-500 disabled:border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Lưu ý quan trọng</label>
                  <textarea
                    value={devNote}
                    onChange={e => setDevNote(e.target.value)}
                    rows={2}
                    placeholder={isAssessmentLocked ? "Không có lưu ý đặc biệt" : "Những điểm cần lưu ý đặc biệt..."}
                    disabled={isAssessmentLocked}
                    className="w-full bg-white border border-amber-100 rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100 transition-all resize-none placeholder:text-slate-300 disabled:bg-slate-100/50 disabled:cursor-not-allowed disabled:text-slate-500 disabled:border-slate-200"
                  />
                </div>


              </div>

              {/* PHÊ DUYỆT 2 BƯỚC XÉT DUYỆT */}
              {(() => {
                const userCampuses = campuses.filter(c => currentUser?.campusIds?.includes(c.id));
                const hasCampusMatch = currentUser?.campusIds?.length === 0 || userCampuses.some(c => 
                  isPreschoolCampusMatch(evalStudent?.admissionCampus, c.campusCode, c.campusName)
                );

                const canApproveBGH = (isSystemAdmin || isBGHUser) && hasCampusMatch;
                const canApproveGDCS = (isSystemAdmin || isGDCSUser) && hasCampusMatch;
                const userCampusNames = userCampuses.map(c => c.campusName).join(", ");

                const getCalculatedResult = () => {
                  const bgh = bghApprovalStatus || "";
                  const gdcs = gdcsApprovalStatus || "";
                  const isApproved = (s: string) => s === "DAT" || s === "DAT_MIEN_HOC_THU" || s === "DAT_HOC_THU";

                  if (bgh || gdcs) {
                    if (isApproved(bgh) && isApproved(gdcs)) {
                      if (bgh === "DAT_MIEN_HOC_THU" || gdcs === "DAT_MIEN_HOC_THU") {
                        return "Đạt - Miễn Học Thử";
                      } else if (bgh === "DAT_HOC_THU" || gdcs === "DAT_HOC_THU") {
                        return "Đạt - Học Thử";
                      } else {
                        return "Đạt";
                      }
                    }
                    if (bgh === "KHONG_DAT" || gdcs === "KHONG_DAT") {
                      return "Không đạt";
                    }
                    if (bgh === "Y_KIEN_KHAC" || gdcs === "Y_KIEN_KHAC") {
                      return "Ý kiến khác";
                    }
                    return "Chưa duyệt";
                  }
                  
                  // Fallback
                  if (devResult === "DAT") return "Đạt";
                  if (devResult === "KHONG_DAT") return "Không đạt";
                  if (devResult === "HOC_THU") return "Học thử";
                  return "Chưa duyệt";
                };

                const calcRes = getCalculatedResult();
                
                const getCalcBadge = (res: string) => {
                  if (res === "Đạt - Miễn Học Thử") {
                    return <span className="text-xs font-black px-3 py-1 rounded-full bg-teal-50 text-teal-600 border border-teal-100 flex items-center gap-1">✓ ĐẠT - MIỄN HỌC THỬ</span>;
                  }
                  if (res === "Đạt - Học Thử" || res === "Học thử") {
                    return <span className="text-xs font-black px-3 py-1 rounded-full bg-[#00A19A]/10 text-[#00A19A] border border-[#00A19A]/20 flex items-center gap-1">★ ĐẠT - HỌC THỬ</span>;
                  }
                  if (res === "Đạt") {
                    return <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1">✓ ĐẠT</span>;
                  }
                  if (res === "Không đạt") {
                    return <span className="text-xs font-black px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 flex items-center gap-1">✗ KHÔNG ĐẠT</span>;
                  }
                  if (res === "Ý kiến khác") {
                    return <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1">★ Ý KIẾN KHÁC</span>;
                  }
                  return <span className="text-xs font-black px-3 py-1 rounded-full bg-slate-50 text-slate-400 border border-slate-200">CHƯA DUYỆT</span>;
                };

                return (
                  <div className="mt-6 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/20 to-fuchsia-50/20 p-5 space-y-5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-violet-100/50 pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-violet-500 animate-pulse" />
                        <h4 className="text-xs font-black text-violet-700 uppercase tracking-widest">PHÊ DUYỆT 2 BƯỚC XÉT DUYỆT</h4>
                      </div>
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-violet-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {bghApprovalStatus && gdcsApprovalStatus ? "Kết quả Duyệt:" : "Kết quả Duyệt (Dự kiến):"}
                        </span>
                        {getCalcBadge(calcRes)}
                      </div>
                    </div>

                    <div className={`grid grid-cols-1 ${showBghSection && showGdcsSection ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-5`}>
                      {/* BGH MN Column */}
                      {showBghSection && (
                        <div className={`space-y-3 bg-white p-4 rounded-xl border transition-all ${canApproveBGH ? 'border-violet-100' : 'border-slate-100 bg-slate-50/50 opacity-80'}`}>
                          <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${canApproveBGH ? 'bg-violet-400' : 'bg-slate-300'}`} />
                              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">BAN GIÁM HIỆU MẦM NON</span>
                            </div>
                            {!canApproveBGH && (
                              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1" title={
                                !evalStudent?.admissionCampus 
                                  ? "Học sinh chưa có thông tin cơ sở" 
                                  : isBGHUser 
                                    ? `Bạn là BGH của cơ sở khác, học sinh thuộc ${evalStudent.admissionCampus}` 
                                    : "Quyền hạn yêu cầu Ban Giám Hiệu Mầm Non"
                              }>
                                🔒 Chỉ đọc (BGH)
                              </span>
                            )}
                            {canApproveBGH && (
                              <span className="text-[9px] font-bold text-violet-500 bg-violet-50 px-2 py-0.5 rounded-md">
                                ✍️ Quyền duyệt
                              </span>
                            )}
                          </div>

                          {/* Helpful Permission Hint for BGH */}
                          {isBGHUser && !hasCampusMatch && evalStudent?.admissionCampus && (
                            <div className="text-[9px] font-bold text-amber-600 bg-amber-50/70 border border-amber-100 rounded-lg p-2 leading-relaxed animate-in fade-in duration-200">
                              ⚠️ Cơ sở học sinh: <span className="underline">{evalStudent.admissionCampus}</span>. Cơ sở của bạn: <span className="underline">{userCampusNames || "Chưa gán"}</span>. Bạn không có quyền duyệt phiếu cơ sở này.
                            </div>
                          )}

                          {!evalStudent?.admissionCampus && !isSystemAdmin && (
                            <div className="text-[9px] font-bold text-rose-600 bg-rose-50/70 border border-rose-100 rounded-lg p-2 leading-relaxed animate-in fade-in duration-200">
                              ⚠️ Học sinh chưa được gán Cơ sở. Chỉ Quản trị viên hệ thống có quyền duyệt.
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {[
                              { status: "DAT_MIEN_HOC_THU", label: "ĐẠT - MIỄN HỌC THỬ", color: "bg-teal-50 text-teal-600 border-teal-100 hover:bg-teal-100/50", activeColor: "bg-teal-600 text-white border-teal-600 shadow-sm" },
                              { status: "DAT_HOC_THU", label: "ĐẠT - HỌC THỬ", color: "bg-[#00A19A]/10 text-[#00A19A] border-[#00A19A]/20 hover:bg-indigo-100/50", activeColor: "bg-[#00A19A] text-white border-[#00A19A] shadow-sm" },
                              { status: "KHONG_DAT", label: "KHÔNG ĐẠT", color: "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100/50", activeColor: "bg-rose-500 text-white border-rose-500 shadow-sm" },
                              { status: "Y_KIEN_KHAC", label: "Ý KIẾN KHÁC", color: "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100/50", activeColor: "bg-amber-500 text-white border-amber-500 shadow-sm" }
                            ].map(opt => (
                              <button
                                key={opt.status}
                                type="button"
                                disabled={!canApproveBGH || isAssessmentLocked}
                                onClick={() => setBghApprovalStatus(bghApprovalStatus === opt.status ? "" : opt.status)}
                                className={`px-3 py-1.5 rounded-xl border text-[10px] font-black transition-all ${
                                  bghApprovalStatus === opt.status 
                                    ? opt.activeColor 
                                    : `${opt.color} text-slate-600 bg-white border-slate-200`
                                } ${(!canApproveBGH || isAssessmentLocked) ? 'cursor-not-allowed opacity-60' : 'hover:scale-[1.02]'}`}
                              >
                                {opt.label}
                              </button>
                            ))}
                            {canApproveBGH && !isAssessmentLocked && bghApprovalStatus && (
                              <button
                                type="button"
                                onClick={() => setBghApprovalStatus("")}
                                className="px-2.5 py-1.5 rounded-xl text-[10px] font-black text-rose-600 hover:bg-rose-50 border border-transparent"
                              >
                                Bỏ chọn
                              </button>
                            )}
                          </div>
                          <textarea
                            value={bghApprovalComment}
                            onChange={e => setBghApprovalComment(e.target.value)}
                            disabled={!canApproveBGH || isAssessmentLocked}
                            rows={2}
                            placeholder={isAssessmentLocked ? "Chưa có ý kiến phê duyệt của BGH" : canApproveBGH ? "Ý kiến phê duyệt của BGH..." : "Chưa có ý kiến phê duyệt của BGH"}
                            className={`w-full border rounded-xl px-3 py-2 text-xs font-medium outline-none transition-all resize-none placeholder:text-slate-300 ${
                              canApproveBGH && !isAssessmentLocked
                                ? 'bg-slate-50 border-slate-100 focus:border-violet-300 focus:bg-white' 
                                : 'bg-slate-100/50 border-slate-200 text-slate-500 cursor-not-allowed'
                            }`}
                          />
                        </div>
                      )}

                      {/* GĐCS Column */}
                      {showGdcsSection && (
                        <div className={`space-y-3 bg-white p-4 rounded-xl border transition-all ${canApproveGDCS ? 'border-fuchsia-100' : 'border-slate-100 bg-slate-50/50 opacity-80'}`}>
                          <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${canApproveGDCS ? 'bg-fuchsia-400' : 'bg-slate-300'}`} />
                              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                                {getGdcsLabel(evalStudent?.admissionCampus)}
                              </span>
                            </div>
                            {!canApproveGDCS && (
                              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1" title={
                                !evalStudent?.admissionCampus 
                                  ? "Học sinh chưa có thông tin cơ sở" 
                                  : isGDCSUser 
                                    ? `Bạn là GĐCS của ${userCampusNames || "cơ sở khác"}, học sinh thuộc ${evalStudent.admissionCampus}` 
                                    : "Quyền hạn yêu cầu Giám đốc Cơ sở"
                              }>
                                🔒 Chỉ đọc (GĐCS)
                              </span>
                            )}
                            {canApproveGDCS && (
                              <span className="text-[9px] font-bold text-fuchsia-500 bg-fuchsia-50 px-2 py-0.5 rounded-md">
                                ✍️ Quyền duyệt
                              </span>
                            )}
                          </div>

                          {/* Helpful Permission Hint for GĐCS */}
                          {isGDCSUser && !hasCampusMatch && evalStudent?.admissionCampus && (
                            <div className="text-[9px] font-bold text-amber-600 bg-amber-50/70 border border-amber-100 rounded-lg p-2 leading-relaxed animate-in fade-in duration-200">
                              ⚠️ Cơ sở học sinh: <span className="underline">{evalStudent.admissionCampus}</span>. Cơ sở của bạn: <span className="underline">{userCampusNames || "Chưa gán"}</span>. Bạn không có quyền duyệt phiếu cơ sở này.
                            </div>
                          )}

                          {!evalStudent?.admissionCampus && !isSystemAdmin && (
                            <div className="text-[9px] font-bold text-rose-600 bg-rose-50/70 border border-rose-100 rounded-lg p-2 leading-relaxed animate-in fade-in duration-200">
                              ⚠️ Học sinh chưa được gán Cơ sở. Chỉ Quản trị viên hệ thống có quyền duyệt.
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {[
                              { status: "DAT_MIEN_HOC_THU", label: "ĐẠT - MIỄN HỌC THỬ", color: "bg-teal-50 text-teal-600 border-teal-100 hover:bg-teal-100/50", activeColor: "bg-teal-600 text-white border-teal-600 shadow-sm" },
                              { status: "DAT_HOC_THU", label: "ĐẠT - HỌC THỬ", color: "bg-[#00A19A]/10 text-[#00A19A] border-[#00A19A]/20 hover:bg-indigo-100/50", activeColor: "bg-[#00A19A] text-white border-[#00A19A] shadow-sm" },
                              { status: "KHONG_DAT", label: "KHÔNG ĐẠT", color: "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100/50", activeColor: "bg-rose-500 text-white border-rose-500 shadow-sm" },
                              { status: "Y_KIEN_KHAC", label: "Ý KIẾN KHÁC", color: "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100/50", activeColor: "bg-amber-500 text-white border-amber-500 shadow-sm" }
                            ].map(opt => (
                              <button
                                key={opt.status}
                                type="button"
                                disabled={!canApproveGDCS || isAssessmentLocked}
                                onClick={() => setGdcsApprovalStatus(gdcsApprovalStatus === opt.status ? "" : opt.status)}
                                className={`px-3 py-1.5 rounded-xl border text-[10px] font-black transition-all ${
                                  gdcsApprovalStatus === opt.status 
                                    ? opt.activeColor 
                                    : `${opt.color} text-slate-600 bg-white border-slate-200`
                                } ${(!canApproveGDCS || isAssessmentLocked) ? 'cursor-not-allowed opacity-60' : 'hover:scale-[1.02]'}`}
                              >
                                {opt.label}
                              </button>
                            ))}
                            {canApproveGDCS && !isAssessmentLocked && gdcsApprovalStatus && (
                              <button
                                type="button"
                                onClick={() => setGdcsApprovalStatus("")}
                                className="px-2.5 py-1.5 rounded-xl text-[10px] font-black text-rose-600 hover:bg-rose-50 border border-transparent"
                              >
                                Bỏ chọn
                              </button>
                            )}
                          </div>
                          <textarea
                            value={gdcsApprovalComment}
                            onChange={e => setGdcsApprovalComment(e.target.value)}
                            disabled={!canApproveGDCS || isAssessmentLocked}
                            rows={2}
                            placeholder={isAssessmentLocked ? "Chưa có ý kiến phê duyệt của GĐCS" : canApproveGDCS ? "Ý kiến phê duyệt của GĐCS..." : "Chưa có ý kiến phê duyệt của GĐCS"}
                            className={`w-full border rounded-xl px-3 py-2 text-xs font-medium outline-none transition-all resize-none placeholder:text-slate-300 ${
                              canApproveGDCS && !isAssessmentLocked
                                ? 'bg-slate-50 border-slate-100 focus:border-fuchsia-300 focus:bg-white' 
                                : 'bg-slate-100/50 border-slate-200 text-slate-500 cursor-not-allowed'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </Modal>

      {/* Modal: Đánh giá Học thử */}
      <Modal
        open={probModal}
        onClose={() => setProbModal(false)}
        title={`Đánh giá kết quả Học thử: ${probStudent?.fullName || ""}`}
        size="xl"
        footer={
          <>
            <button onClick={() => setProbModal(false)} className="px-4 text-xs font-black uppercase text-slate-400 hover:text-slate-600">
              Đóng
            </button>
            {probStudent && (
              <button
                onClick={() => printProbationaryAssessment(probStudent)}
                className="px-6 py-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                In Phiếu
              </button>
            )}
            <button
              onClick={saveProbationary}
              disabled={savingProb || devLoading}
              className="flex-1 py-3.5 bg-[#00A19A] hover:bg-[#008c85] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#00A19A]/20 disabled:opacity-50 transition-all"
            >
              {savingProb ? "Đang lưu..." : "Lưu Kết Quả Học Thử"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Child Details Card */}
          <div className="bg-violet-50/50 p-4 rounded-2xl border border-violet-100 flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Học sinh</p>
              <p className="text-base font-black text-slate-800">{probStudent?.fullName}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã bé</p>
              <p className="text-sm font-bold text-violet-600 font-mono">{probStudent?.studentCode}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhóm tuổi</p>
              <p className="text-sm font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">{probStudent?.grade}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cơ sở</p>
              <p className="text-sm font-bold text-indigo-700 bg-[#00A19A]/10 px-2 py-0.5 rounded-lg border border-[#00A19A]/20">{probStudent?.admissionCampus || "—"}</p>
            </div>
          </div>

          {/* Probationary Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Thời gian học thử</label>
              <input
                type="text"
                value={probPeriod}
                onChange={e => setProbPeriod(e.target.value)}
                placeholder="Ví dụ: 20/05/2026 ~ 03/06/2026"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-violet-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Lớp học thử</label>
              <input
                type="text"
                value={probClass}
                onChange={e => setProbClass(e.target.value)}
                placeholder="Ví dụ: Jerry 1"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-violet-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Giáo viên học thử</label>
              <input
                type="text"
                value={probTeacher}
                onChange={e => setProbTeacher(e.target.value)}
                placeholder="Ví dụ: Cô Mai, Cô Hằng"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-violet-300 bg-white"
              />
            </div>
          </div>

          {/* Criteria & Rating Table */}
          {devLoading ? (
            <div className="flex justify-center p-8">
              <span className="text-violet-600 font-bold animate-pulse text-sm">Đang tải tiêu chí...</span>
            </div>
          ) : devAreas.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-bold text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              Chưa cấu hình tiêu chí nào cho nhóm tuổi: {probStudent?.grade}
            </div>
          ) : (
            <div className="space-y-4">
              {devAreas.map(area => (
                <div key={area.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: area.color || "#6366f1" }} />
                    <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide">{area.name}</h4>
                  </div>
                  
                  <div className="overflow-x-auto custom-scrollbar flex-1">
                    <table className="w-full text-left whitespace-nowrap table-fixed">
                      <thead className="bg-[#F0FDFA] sticky top-0 z-10 shadow-[0_1px_0_#CCFBF1]">
                        <tr>
                          <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-wider w-[40%]">Tiêu chí</th>
                          <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-wider text-center w-[15%]">Chưa thể hiện</th>
                          <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-wider text-center w-[15%]">Bắt đầu thể hiện</th>
                          <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-wider text-center w-[15%]">Thể hiện tốt</th>
                          <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-wider w-[15%]">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {area.criteria?.map(crit => {
                          const currentScore = probScores[crit.id] || { result: "", note: "" };
                          
                          const setScoreResult = (res) => {
                            setProbScores({
                              ...probScores,
                              [crit.id]: { ...currentScore, result: res }
                            });
                          };

                          const setScoreNote = (noteText) => {
                            setProbScores({
                              ...probScores,
                              [crit.id]: { ...currentScore, note: noteText }
                            });
                          };

                          return (
                            <tr key={crit.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="p-3 text-slate-700 text-xs font-semibold whitespace-normal break-words leading-relaxed">{crit.name}</td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => setScoreResult(currentScore.result === "CHUA_THE_HIEN" ? "" : "CHUA_THE_HIEN")}
                                  className={`w-5 h-5 rounded-full border transition-all ${
                                    currentScore.result === "CHUA_THE_HIEN"
                                      ? "bg-amber-500 border-amber-500 shadow-sm text-white flex items-center justify-center text-[10px] font-bold mx-auto"
                                      : "border-slate-300 hover:border-slate-400 bg-white mx-auto block"
                                  }`}
                                >
                                  {currentScore.result === "CHUA_THE_HIEN" && "✓"}
                                </button>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => setScoreResult(currentScore.result === "BAT_DAU_THE_HIEN" ? "" : "BAT_DAU_THE_HIEN")}
                                  className={`w-5 h-5 rounded-full border transition-all ${
                                    currentScore.result === "BAT_DAU_THE_HIEN"
                                      ? "bg-[#00A19A]/100 border-indigo-500 shadow-sm text-white flex items-center justify-center text-[10px] font-bold mx-auto"
                                      : "border-slate-300 hover:border-slate-400 bg-white mx-auto block"
                                  }`}
                                >
                                  {currentScore.result === "BAT_DAU_THE_HIEN" && "✓"}
                                </button>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => setScoreResult(currentScore.result === "THE_HIEN_TOT" ? "" : "THE_HIEN_TOT")}
                                  className={`w-5 h-5 rounded-full border transition-all ${
                                    currentScore.result === "THE_HIEN_TOT"
                                      ? "bg-emerald-500 border-emerald-500 shadow-sm text-white flex items-center justify-center text-[10px] font-bold mx-auto"
                                      : "border-slate-300 hover:border-slate-400 bg-white mx-auto block"
                                  }`}
                                >
                                  {currentScore.result === "THE_HIEN_TOT" && "✓"}
                                </button>
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={currentScore.note || ""}
                                  onChange={e => setScoreNote(e.target.value)}
                                  placeholder="Ghi chú..."
                                  className="w-full px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:ring-1 focus:ring-violet-300 bg-white"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Probationary Final Results */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Kết luận sau thời gian học thử</h4>
                <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Quyết định kết quả thực nghiệm học tập thử của bé</p>
              </div>
              <div className="flex gap-2">
                {[
                  { status: "DAT", label: "ĐẠT", color: "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/50", activeColor: "bg-emerald-500 text-white border-emerald-500 shadow-sm" },
                  { status: "CHUA_DAT", label: "CHƯA ĐẠT", color: "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100/50", activeColor: "bg-rose-500 text-white border-rose-500 shadow-sm" }
                ].map(opt => (
                  <button
                    key={opt.status}
                    type="button"
                    onClick={() => setProbResult(probResult === opt.status ? "" : opt.status)}
                    className={`px-4 py-2 rounded-xl border text-xs font-black transition-all ${
                      probResult === opt.status 
                        ? opt.activeColor 
                        : `${opt.color} text-slate-600 bg-white border-slate-200 hover:scale-[1.02]`
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ý kiến / Ghi chú thêm</label>
              <textarea
                value={probComment}
                onChange={e => setProbComment(e.target.value)}
                placeholder="Nhập ý kiến đánh giá chung, lý do đạt/chưa đạt hoặc hướng phát triển..."
                rows={3}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-violet-300 bg-white"
              />
            </div>
          </div>
        </div>
      </Modal>


      {/* Modal: Criteria */}
      <Modal
        open={criteriaModal}
        onClose={() => setCriteriaModal(false)}
        title={editCriteria ? "Sửa Tiêu Chí" : "Thêm Tiêu Chí mới"}
        footer={(
          <>
            <button onClick={() => setCriteriaModal(false)} className="flex-1 text-xs font-black uppercase text-slate-400">
              Hủy
            </button>
            <button
              onClick={saveCriteria}
              disabled={savingCriteria}
              className="flex-1 py-3.5 bg-violet-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest"
            >
              {savingCriteria ? "Đang lưu..." : "Lưu"}
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          <Field label="Nhóm tuổi" required>
            <select
              value={criteriaForm.ageGroup}
              onChange={e => setCriteriaForm({ ...criteriaForm, ageGroup: e.target.value })}
              className={inp}
            >
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Mã Tiêu chí" required>
            <input
              value={criteriaForm.code}
              onChange={e => setCriteriaForm({ ...criteriaForm, code: e.target.value })}
              disabled={!!editCriteria}
              className={inp}
              placeholder="VD: TC_1824_01"
            />
          </Field>
          <Field label="Nội dung Tiêu chí" required>
            <textarea
              value={criteriaForm.name}
              onChange={e => setCriteriaForm({ ...criteriaForm, name: e.target.value })}
              className={inp + " resize-none"}
              rows={3}
              placeholder="Nhập mô tả chi tiết tiêu chí..."
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
