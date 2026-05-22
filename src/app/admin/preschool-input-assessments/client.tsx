"use client"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import * as XLSX from "xlsx"
import {
  Baby, Clock, Settings, Users, BarChart3, Calendar,
  Plus, Trash2, Edit2, Search, RefreshCw, ChevronDown, ChevronUp,
  X, CheckCircle, AlertCircle, Download, Upload, Star, Heart, Sparkles
} from "lucide-react"

interface Period { id: string; code: string; name: string; status: string; startDate?: string; endDate?: string; description?: string; assignedUserId?: string; surveyType?: string; batches: Batch[] }
interface Batch { id: string; periodId: string; batchNumber: number; name: string; startDate: string; endDate: string; status: string; campusId?: string; assignedUserId?: string }
interface PreschoolChild { id: string; studentCode: string; fullName: string; dateOfBirth?: string; gender?: string; grade?: string; admissionCriteria?: string; surveyFormType?: string; admissionResult?: string; admissionCampus?: string; periodId: string; batchId?: string; devProfessionalComment?: string; devPsychologyComment?: string; devImportantNote?: string; devAssessmentResult?: string; bghApprovalStatus?: string; bghApprovalComment?: string; gdcsApprovalStatus?: string; gdcsApprovalComment?: string; }
interface Camp { id: string; campusName: string }
interface AcademicYear { id: string; name: string }
interface AssessmentConfig { id: string; categoryType: string; code: string; name: string; sortOrder: number }

interface DevArea { id: string; code: string; name: string; description?: string; color?: string; sortOrder: number; criteria: DevCriteria[] }
interface DevCriteria { id: string; areaId: string; code: string; name: string; ageGroup: string; sortOrder: number; status: string }
interface DevScore { id: string; studentId: string; criteriaId: string; result: string; note?: string; assessorId?: string }

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
  { id: "actions", label: "Thao tác", width: "w-24 min-w-[96px]" }
];

export function PreschoolInputAssessmentsClient({ academicYears, campuses, giaoVuCSUsers, grades: gradesProp, teachers, departments, currentUser }: { academicYears: AcademicYear[]; campuses: Camp[]; giaoVuCSUsers: any[]; grades: string[]; teachers: any[]; departments: any[]; currentUser: any; }) {
  const grades = gradesProp && gradesProp.length > 0 ? gradesProp : ["18 đến 24 tháng", "24 đến 36 tháng", "Mẫu giáo bé", "Mẫu giáo nhỡ", "Mẫu giáo lớn"];

  const userRole = (currentUser?.role || "").toUpperCase();
  const isSystemAdmin = userRole === "ADMIN";
  const isBGHUser = userRole === "KT_DBCL";
  const isGDCSUser = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(userRole);

  const showBghSection = isSystemAdmin || isBGHUser;
  const showGdcsSection = isSystemAdmin || isGDCSUser;

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

  // Đánh giá phát triển
  const [devTab, setDevTab] = useState<"assess" | "xetDuyet" | "manage">("assess");
  const [ageGroupFilter, setAgeGroupFilter] = useState("18 đến 24 tháng");
  
  // Đánh giá học sinh
  const [evalStudent, setEvalStudent] = useState<PreschoolChild | null>(null);
  const [evalModal, setEvalModal] = useState(false);
  const [devAreas, setDevAreas] = useState<DevArea[]>([]);
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
    } finally { setCLoading(false); }
  }, [cPeriodId, cBatchId]);

  useEffect(() => { if (tab === "children") fetchChildren(); }, [tab, fetchChildren]);

  const fetchConfigs = useCallback(async () => {
    setCfgLoading(true);
    setCfgSelected([]);
    try { const r = await fetch("/api/preschool-assessment-configs"); if (r.ok) setConfigs(await r.json()); } finally { setCfgLoading(false); }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  // Dev Assess fetches & actions
  const fetchDevAreas = useCallback(async (ageGroup?: string) => {
    setDevLoading(true);
    try {
      let url = "/api/preschool-dev-areas";
      if (ageGroup) url += `?ageGroup=${encodeURIComponent(ageGroup)}`;
      const r = await fetch(url);
      if (r.ok) setDevAreas(await r.json());
    } finally { setDevLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === "devAssess" && devTab === "manage") {
      fetchDevAreas(ageGroupFilter);
    }
  }, [tab, devTab, ageGroupFilter, fetchDevAreas]);

  const fetchStudentSummaries = useCallback(async () => {
    if (!cPeriodId) return;
    setSumLoading(true);
    try {
      let url = `/api/preschool-dev-scores?periodId=${cPeriodId}`;
      if (cBatchId) url += `&batchId=${cBatchId}`;
      const r = await fetch(url);
      if (r.ok) setStudentSummaries(await r.json());
    } finally { setSumLoading(false); }
  }, [cPeriodId, cBatchId]);

  useEffect(() => {
    if (tab === "devAssess" && (devTab === "assess" || devTab === "xetDuyet")) {
      fetchStudentSummaries();
    }
  }, [tab, devTab, fetchStudentSummaries]);

  const openEvaluation = async (student: any) => {
    setEvalStudent(student);
    setStudentScores({});
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
      const areasRes = await fetch(`/api/preschool-dev-areas?ageGroup=${encodeURIComponent(ageGroup)}`);
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
    } catch (e) {
      console.error(e);
      notify("Lỗi khi tải thông tin đánh giá", "err");
    } finally {
      setDevLoading(false);
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
            ? `${s.bghApprovalStatus === "DAT" ? "Đạt" : s.bghApprovalStatus === "KHONG_DAT" ? "Không đạt" : "Ý kiến khác"}${s.bghApprovalComment ? ` - Ý kiến: ${s.bghApprovalComment}` : ""}` 
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
  const reportChildren = useMemo(() => { let all = children; if (rptBatchId !== "all") all = all.filter(c => c.batchId === rptBatchId); return all; }, [children, rptBatchId]);
  const rptStats = useMemo(() => {
    const total = reportChildren.length;
    const passed = reportChildren.filter(c => c.admissionResult && (c.admissionResult.toUpperCase().includes("ĐẠT") || c.admissionResult === "Học thử")).length;
    const pending = reportChildren.filter(c => !c.admissionResult).length;
    const failed = reportChildren.filter(c => c.admissionResult && c.admissionResult.toUpperCase().includes("KHÔNG")).length;
    const gradeStats = grades.map(g => ({ grade: g, count: reportChildren.filter(c => c.grade === g).length }));
    return { total, passed, pending, failed, gradeStats };
  }, [reportChildren, grades]);

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
            { id: "devAssess", label: "Đánh giá PT", icon: Star },
            { id: "reports", label: "Tổng hợp KQKS", icon: BarChart3 }
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
                                    <td className="p-4"><Badge s={b.status} /></td>
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
                <div className="overflow-x-auto">
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
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
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
                        <td className="p-4">{child.admissionResult ? <span className={`text-xs font-black px-2.5 py-1 rounded-full ${child.admissionResult === "Học thử" ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : child.admissionResult.toUpperCase().includes("ĐẠT") && !child.admissionResult.toUpperCase().includes("KHÔNG") ? "bg-emerald-100 text-emerald-700" : child.admissionResult.toUpperCase().includes("KHÔNG") ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-700"}`}>{child.admissionResult}</span> : <span className="text-xs text-slate-300">Chưa</span>}</td>
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
                  <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
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
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-black text-violet-700 bg-violet-50 hover:bg-violet-500 hover:text-white rounded-lg border border-violet-100 transition-all shadow-sm"
                                  >
                                    <Star className="w-3.5 h-3.5" /> Đánh giá
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
                    <table className="w-full min-w-max text-left whitespace-nowrap table-auto">
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
                              if (res === "Đạt" || res === "DAT") {
                                return <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">✓ ĐẠT</span>;
                              }
                              if (res === "Không đạt" || res === "KHONG_DAT") {
                                return <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100">✗ KHÔNG ĐẠT</span>;
                              }
                              if (res === "Học thử" || res === "HOC_THU") {
                                return <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">★ HỌC THỬ</span>;
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
                              return (
                                <td className={`p-4 align-top ${tdClass}`}>
                                  <div className="flex flex-col gap-2 w-full">
                                    {areaScores.map((sc: any) => {
                                      const name = sc.criteria?.name || "";
                                      const isDat = sc.result === "DAT";
                                      const isKhongDat = sc.result === "KHONG_DAT";
                                      const cleanObs = sc.note ? (sc.note.includes("|") ? sc.note.split("|")[1] : sc.note) : "";
                                      
                                      return (
                                        <div key={sc.id} className="text-[11px] leading-relaxed flex items-start gap-2 py-1 border-b border-dashed border-slate-50 last:border-b-0">
                                          <span className={`font-black text-xs flex-shrink-0 select-none mt-0.5 ${isDat ? 'text-emerald-500' : isKhongDat ? 'text-rose-500' : 'text-slate-300'}`}>
                                            {isDat ? "✓" : isKhongDat ? "✗" : "○"}
                                          </span>
                                          <div className="flex flex-col">
                                            <span 
                                              className={`text-[11px] leading-relaxed ${isDat ? 'font-bold text-slate-700' : isKhongDat ? 'font-semibold text-slate-500' : 'font-normal text-slate-400'}`} 
                                              title={`${name}${cleanObs ? ` (${cleanObs})` : ""}`}
                                            >
                                              {name}
                                            </span>
                                            {cleanObs && (
                                              <span className="text-[9px] font-bold text-violet-500 bg-violet-50/80 px-1.5 py-0.5 rounded-md border border-violet-100/50 mt-1 max-w-fit">
                                                Ghi chú: {cleanObs}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
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
                                      <div className="flex flex-col gap-1.5">
                                        <div className="grid grid-cols-3 gap-1.5 bg-slate-50 border border-slate-100 rounded-2xl p-2">
                                          <div className="bg-white border border-slate-100 rounded-xl p-1.5 flex flex-col items-center justify-center text-center shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">H.Cao</span>
                                            <span className="font-black text-xs text-slate-700 mt-0.5">{hVal ? `${hVal} cm` : "—"}</span>
                                          </div>
                                          <div className="bg-white border border-slate-100 rounded-xl p-1.5 flex flex-col items-center justify-center text-center shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">C.Nặng</span>
                                            <span className="font-black text-xs text-slate-700 mt-0.5">{wVal ? `${wVal} kg` : "—"}</span>
                                          </div>
                                          <div className="bg-white border border-slate-100 rounded-xl p-1.5 flex flex-col items-center justify-center text-center shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">BMI</span>
                                            <span className="font-black text-xs text-violet-600 mt-0.5">{bmiVal ? bmiVal.toFixed(1) : "—"}</span>
                                          </div>
                                        </div>
                                        {bmiVal && bmiClass && (
                                          <div className={`px-2.5 py-1 rounded-xl text-[9px] font-black border uppercase tracking-wider text-center flex items-center justify-center gap-1.5 ${bmiClass.color}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${bmiClass.dot}`} />
                                            {bmiClass.label}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-slate-300 italic block py-1">Chưa đo thể chất</span>
                                    )}
                                    {s.scores && s.scores.filter((sc: any) => sc.criteria?.area?.code === "THE_CHAT" && !sc.criteria?.code?.endsWith("_01") && !sc.criteria?.code?.endsWith("_02")).length > 0 && (
                                      <div className="mt-1 pt-2 border-t border-violet-100/50 flex flex-col gap-1.5">
                                        {s.scores
                                          .filter((sc: any) => sc.criteria?.area?.code === "THE_CHAT" && !sc.criteria?.code?.endsWith("_01") && !sc.criteria?.code?.endsWith("_02"))
                                          .map((sc: any) => {
                                            const name = sc.criteria?.name || "";
                                            const isDat = sc.result === "DAT";
                                            const isKhongDat = sc.result === "KHONG_DAT";
                                            const cleanObs = sc.note ? (sc.note.includes("|") ? sc.note.split("|")[1] : sc.note) : "";
                                            return (
                                              <div key={sc.id} className="text-[10px] leading-normal flex items-start gap-1.5 py-0.5">
                                                <span className={`font-black text-[10px] flex-shrink-0 select-none ${isDat ? 'text-emerald-500' : isKhongDat ? 'text-rose-500' : 'text-slate-300'}`}>
                                                  {isDat ? "✓" : isKhongDat ? "✗" : "○"}
                                                </span>
                                                <div className="flex flex-col">
                                                  <span className={`text-[10px] leading-normal ${isDat ? 'font-bold text-slate-700' : isKhongDat ? 'font-semibold text-slate-500' : 'font-normal text-slate-400'}`} title={`${name}${cleanObs ? ` (${cleanObs})` : ""}`}>
                                                    {name}
                                                  </span>
                                                  {cleanObs && <span className="text-[9px] font-bold text-violet-500 bg-violet-50/50 px-1 py-0.5 rounded mt-0.5 max-w-fit">Ghi chú: {cleanObs}</span>}
                                                </div>
                                              </div>
                                            );
                                          })}
                                      </div>
                                    )}
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
                                      <div className="bg-indigo-50/30 border-l-[3px] border-indigo-500 rounded-r-xl p-2 flex flex-col gap-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider">Tâm lý</span>
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
                                <td className="w-24 min-w-[96px] p-4 align-top">
                                  <button
                                    onClick={() => openEvaluation(s)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-black text-violet-700 bg-violet-50 hover:bg-violet-500 hover:text-white rounded-lg border border-violet-100 transition-all shadow-sm"
                                  >
                                    <Star className="w-3.5 h-3.5" /> Đánh giá
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

          {/* Sub-tab: Quản lý Tiêu chí & Lĩnh vực */}
          {devTab === "manage" && (
            <div className="space-y-4">
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
        footer={(
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
                                    className="w-24 text-xl font-black text-slate-800 outline-none bg-transparent text-center px-3 py-2.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                                  <label key={opt.key} className="relative flex items-center cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`crit-${crit.id}`}
                                      checked={studentScores[crit.id]?.result === opt.key}
                                      onChange={() => setStudentScores(prev => ({
                                        ...prev,
                                        [crit.id]: { result: opt.key, note: prev[crit.id]?.note || "" }
                                      }))}
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
                                placeholder="Ghi chú quan sát..."
                                className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs font-medium outline-none focus:border-violet-400 focus:bg-white transition-all"
                              />
                            </>
                          ) : (
                            <>
                              {/* Standard radio buttons */}
                              <div className="flex flex-wrap gap-4 mt-2">
                                {radioOpts.map(opt => (
                                  <label key={opt.key} className="relative flex items-center cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`crit-${crit.id}`}
                                      checked={studentScores[crit.id]?.result === opt.key}
                                      onChange={() => setStudentScores(prev => ({
                                        ...prev,
                                        [crit.id]: { result: opt.key, note: prev[crit.id]?.note || "" }
                                      }))}
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
                                placeholder="Nhập ghi chú quan sát..."
                                className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs font-medium outline-none focus:border-violet-400 focus:bg-white transition-all"
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
                    placeholder="Nhận xét về sự phát triển chuyên môn của trẻ..."
                    className="w-full bg-white border border-rose-100 rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition-all resize-none placeholder:text-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Đánh giá tâm lý</label>
                  <textarea
                    value={devPsyComment}
                    onChange={e => setDevPsyComment(e.target.value)}
                    rows={3}
                    placeholder="Nhận xét về trạng thái tâm lý, cảm xúc của trẻ..."
                    className="w-full bg-white border border-rose-100 rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition-all resize-none placeholder:text-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Lưu ý quan trọng</label>
                  <textarea
                    value={devNote}
                    onChange={e => setDevNote(e.target.value)}
                    rows={2}
                    placeholder="Những điểm cần lưu ý đặc biệt..."
                    className="w-full bg-white border border-amber-100 rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100 transition-all resize-none placeholder:text-slate-300"
                  />
                </div>


              </div>

              {/* PHÊ DUYỆT 2 BƯỚC XÉT DUYỆT */}
              {(() => {
                const userCampuses = campuses.filter(c => currentUser?.campusIds?.includes(c.id));
                const hasCampusMatch = currentUser?.campusIds?.length === 0 || userCampuses.some(c => 
                  c.campusName === evalStudent?.admissionCampus || 
                  c.campusCode === evalStudent?.admissionCampus
                );

                const canApproveBGH = (isSystemAdmin || isBGHUser) && hasCampusMatch;
                const canApproveGDCS = (isSystemAdmin || isGDCSUser) && hasCampusMatch;
                const userCampusNames = userCampuses.map(c => c.campusName).join(", ");

                const getCalculatedResult = () => {
                  if (bghApprovalStatus || gdcsApprovalStatus) {
                    if (bghApprovalStatus === "DAT" && gdcsApprovalStatus === "DAT") {
                      return "Đạt";
                    }
                    if (bghApprovalStatus === "KHONG_DAT" || gdcsApprovalStatus === "KHONG_DAT") {
                      return "Không đạt";
                    }
                    if (bghApprovalStatus === "Y_KIEN_KHAC" || gdcsApprovalStatus === "Y_KIEN_KHAC") {
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
                  if (res === "Đạt") {
                    return <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1">✓ ĐẠT</span>;
                  }
                  if (res === "Không đạt") {
                    return <span className="text-xs font-black px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 flex items-center gap-1">✗ KHÔNG ĐẠT</span>;
                  }
                  if (res === "Ý kiến khác") {
                    return <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1">★ Ý KIẾN KHÁC</span>;
                  }
                  if (res === "Học thử") {
                    return <span className="text-xs font-black px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-1">★ HỌC THỬ</span>;
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
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kết quả Duyệt (Dự kiến):</span>
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
                              ⚠️ Cơ sở học sinh: <span className="underline">${evalStudent.admissionCampus}</span>. Cơ sở của bạn: <span className="underline">${userCampusNames || "Chưa gán"}</span>. Bạn không có quyền duyệt phiếu cơ sở này.
                            </div>
                          )}

                          {!evalStudent?.admissionCampus && !isSystemAdmin && (
                            <div className="text-[9px] font-bold text-rose-600 bg-rose-50/70 border border-rose-100 rounded-lg p-2 leading-relaxed animate-in fade-in duration-200">
                              ⚠️ Học sinh chưa được gán Cơ sở. Chỉ Quản trị viên hệ thống có quyền duyệt.
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {[
                              { status: "DAT", label: "ĐẠT", color: "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/50", activeColor: "bg-emerald-500 text-white border-emerald-500 shadow-sm" },
                              { status: "KHONG_DAT", label: "KHÔNG ĐẠT", color: "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100/50", activeColor: "bg-rose-500 text-white border-rose-500 shadow-sm" },
                              { status: "Y_KIEN_KHAC", label: "Ý KIẾN KHÁC", color: "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100/50", activeColor: "bg-amber-500 text-white border-amber-500 shadow-sm" }
                            ].map(opt => (
                              <button
                                key={opt.status}
                                type="button"
                                disabled={!canApproveBGH}
                                onClick={() => setBghApprovalStatus(bghApprovalStatus === opt.status ? "" : opt.status)}
                                className={`px-3 py-1.5 rounded-xl border text-[10px] font-black transition-all ${
                                  bghApprovalStatus === opt.status 
                                    ? opt.activeColor 
                                    : `${opt.color} text-slate-600 bg-white border-slate-200`
                                } ${!canApproveBGH ? 'cursor-not-allowed opacity-60' : 'hover:scale-[1.02]'}`}
                              >
                                {opt.label}
                              </button>
                            ))}
                            {canApproveBGH && bghApprovalStatus && (
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
                            disabled={!canApproveBGH}
                            rows={2}
                            placeholder={canApproveBGH ? "Ý kiến phê duyệt của BGH..." : "Chưa có ý kiến phê duyệt của BGH"}
                            className={`w-full border rounded-xl px-3 py-2 text-xs font-medium outline-none transition-all resize-none placeholder:text-slate-300 ${
                              canApproveBGH 
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
                              ⚠️ Cơ sở học sinh: <span className="underline">${evalStudent.admissionCampus}</span>. Cơ sở của bạn: <span className="underline">${userCampusNames || "Chưa gán"}</span>. Bạn không có quyền duyệt phiếu cơ sở này.
                            </div>
                          )}

                          {!evalStudent?.admissionCampus && !isSystemAdmin && (
                            <div className="text-[9px] font-bold text-rose-600 bg-rose-50/70 border border-rose-100 rounded-lg p-2 leading-relaxed animate-in fade-in duration-200">
                              ⚠️ Học sinh chưa được gán Cơ sở. Chỉ Quản trị viên hệ thống có quyền duyệt.
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {[
                              { status: "DAT", label: "ĐẠT", color: "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/50", activeColor: "bg-emerald-500 text-white border-emerald-500 shadow-sm" },
                              { status: "KHONG_DAT", label: "KHÔNG ĐẠT", color: "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100/50", activeColor: "bg-rose-500 text-white border-rose-500 shadow-sm" },
                              { status: "Y_KIEN_KHAC", label: "Ý KIẾN KHÁC", color: "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100/50", activeColor: "bg-amber-500 text-white border-amber-500 shadow-sm" }
                            ].map(opt => (
                              <button
                                key={opt.status}
                                type="button"
                                disabled={!canApproveGDCS}
                                onClick={() => setGdcsApprovalStatus(gdcsApprovalStatus === opt.status ? "" : opt.status)}
                                className={`px-3 py-1.5 rounded-xl border text-[10px] font-black transition-all ${
                                  gdcsApprovalStatus === opt.status 
                                    ? opt.activeColor 
                                    : `${opt.color} text-slate-600 bg-white border-slate-200`
                                } ${!canApproveGDCS ? 'cursor-not-allowed opacity-60' : 'hover:scale-[1.02]'}`}
                              >
                                {opt.label}
                              </button>
                            ))}
                            {canApproveGDCS && gdcsApprovalStatus && (
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
                            disabled={!canApproveGDCS}
                            rows={2}
                            placeholder={canApproveGDCS ? "Ý kiến phê duyệt của GĐCS..." : "Chưa có ý kiến phê duyệt của GĐCS"}
                            className={`w-full border rounded-xl px-3 py-2 text-xs font-medium outline-none transition-all resize-none placeholder:text-slate-300 ${
                              canApproveGDCS 
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
