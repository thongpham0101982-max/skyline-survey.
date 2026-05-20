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
interface PreschoolChild { id: string; studentCode: string; fullName: string; dateOfBirth?: string; gender?: string; className?: string; grade?: string; admissionCriteria?: string; targetType?: string; surveyFormType?: string; admissionResult?: string; admissionCampus?: string; periodId: string; batchId?: string; }
interface Camp { id: string; campusName: string }
interface AcademicYear { id: string; name: string }
interface AssessmentConfig { id: string; categoryType: string; code: string; name: string; sortOrder: number }

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

export function PreschoolInputAssessmentsClient({ academicYears, campuses, giaoVuCSUsers, grades: gradesProp, teachers, departments, currentUser }: { academicYears: AcademicYear[]; campuses: Camp[]; giaoVuCSUsers: any[]; grades: string[]; teachers: any[]; departments: any[]; currentUser: any; }) {
  const grades = gradesProp && gradesProp.length > 0 ? gradesProp : ["18 đến 24 tháng", "24 đến 36 tháng", "Mẫu giáo bé", "Mẫu giáo nhỡ", "Mẫu giáo lớn"];

  const [tab, setTab] = useState("periods");
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
  const [cForm, setCForm] = useState({ studentCode: "", fullName: "", dateOfBirth: "", gender: "", grade: "", admissionCriteria: "", className: "", targetType: "", surveyFormType: "", batchId: "" });
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Configs
  const [configs, setConfigs] = useState<AssessmentConfig[]>([]);
  const [cfgLoading, setCfgLoading] = useState(false);
  const [cfgModal, setCfgModal] = useState(false);
  const [editCfg, setEditCfg] = useState<AssessmentConfig | null>(null);
  const [cfgForm, setCfgForm] = useState({ categoryType: "", code: "", name: "" });

  // Reports
  const [rptPeriodId, setRptPeriodId] = useState("");
  const [rptBatchId, setRptBatchId] = useState("all");

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
    try { const r = await fetch("/api/preschool-assessment-configs"); if (r.ok) setConfigs(await r.json()); } finally { setCfgLoading(false); }
  }, []);

  useEffect(() => { if (tab === "categories") fetchConfigs(); }, [tab, fetchConfigs]);

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
  const openAddBatch = (pid: string) => { setTargetPeriodId(pid); setEditB(null); const period = periods.find(p => p.id === pid); const nextNum = period && period.batches.length > 0 ? Math.max(...period.batches.map(b => b.batchNumber)) + 1 : 1; setBForm({ batchNumber: String(nextNum), name: "", startDate: "", endDate: "", status: "ACTIVE", campusId: "", assignedUserId: "" }); setBModal(true); };
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
    setCForm({ studentCode: genCode, fullName: "", dateOfBirth: "", gender: "", grade: "", admissionCriteria: "", className: "", targetType: "", surveyFormType: "", batchId: initBatch });
    setCModal(true);
  };
  const openEditChild = (child: PreschoolChild) => { setEditC(child); setCForm({ studentCode: child.studentCode, fullName: child.fullName, dateOfBirth: child.dateOfBirth?.slice(0,10) || "", gender: child.gender || "", grade: child.grade || "", admissionCriteria: child.admissionCriteria || "", className: child.className || "", targetType: child.targetType || "", surveyFormType: child.surveyFormType || "", batchId: child.batchId || "" }); setCModal(true); };
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
        const grade = String(findVal(row, ["lớp", "khối", "grade"]) || "").trim();
        const gender = String(findVal(row, ["giới tính", "gender"]) || "").trim();
        let parsedDate = null;
        const rawDate = findVal(row, ["ngày sinh", "ngay sinh"]);
        if (rawDate) {
          if (typeof rawDate === "number") { const date = new Date(Math.round((rawDate - 25569) * 86400 * 1000)); parsedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000).toISOString(); }
          else if (typeof rawDate === "string") { const parts = rawDate.split(/[\/\-]/); if (parts.length === 3 && parts[0].length <= 2) parsedDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}T00:00:00.000Z`; else { const date = new Date(rawDate); if (!isNaN(date.getTime())) parsedDate = date.toISOString(); } }
        }
        return { studentCode, fullName, dateOfBirth: parsedDate, gender: gender || null, grade, periodId: cPeriodId, batchId: cBatchId || null };
      }).filter((r: any) => r.studentCode && r.fullName);
      const res = await fetch("/api/preschool-input-assessment-students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "BULK_CREATE", data: mapped }) });
      if (res.ok) { const dr = await res.json(); notify(`Import ${dr.created || 0} bé thành công`); fetchChildren(); }
      else { const err = await res.json().catch(() => ({})); notify("Lỗi: " + (err.error || ""), "err"); }
    } finally { setImporting(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { "Mã bé": "MN001", "Họ và tên": "Nguyễn Bé An", "Ngày sinh": "15/08/2022", "Giới tính": "Nữ", "Lớp": "Mẫu giáo bé", "Đối tượng": "Nội tỉnh" },
      { "Mã bé": "MN002", "Họ và tên": "Trần Bé Minh", "Ngày sinh": "20/03/2021", "Giới tính": "Nam", "Lớp": "Mẫu giáo nhỡ", "Đối tượng": "Ngoại tỉnh" },
    ], { header: ["Mã bé", "Họ và tên", "Ngày sinh", "Giới tính", "Lớp", "Đối tượng"] });
    ws['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 15 }];
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

  const filtChildren = useMemo(() => children.filter(c => !cSearch || c.studentCode.toLowerCase().includes(cSearch.toLowerCase()) || c.fullName.toLowerCase().includes(cSearch.toLowerCase())), [children, cSearch]);
  const reportChildren = useMemo(() => { let all = children; if (rptBatchId !== "all") all = all.filter(c => c.batchId === rptBatchId); return all; }, [children, rptBatchId]);
  const rptStats = useMemo(() => {
    const total = reportChildren.length;
    const passed = reportChildren.filter(c => c.admissionResult && c.admissionResult.toUpperCase().includes("ĐẠT")).length;
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
          {[{ id: "periods", label: "Kỳ KS", icon: Clock }, { id: "categories", label: "Danh mục", icon: Settings }, { id: "children", label: "DS Trẻ", icon: Users }, { id: "reports", label: "Tổng hợp KQKS", icon: BarChart3 }].map(t => (
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
            <button onClick={() => openAddCfg("target")} className="flex items-center gap-2 px-5 py-2.5 bg-violet-500 text-white text-[13px] font-black rounded-xl hover:bg-violet-700 transition-all shadow-lg shadow-violet-100"><Plus className="w-4 h-4" /> Thêm mục</button>
          </div>
          {cfgLoading ? <Spin /> : (
            <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
              {configs.length === 0 ? <Empty text="Chưa có danh mục nào" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-violet-50 border-b border-violet-100">
                      <tr>{["STT", "Loại", "Mã", "Tên", "Thao tác"].map(h => <th key={h} className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-violet-50">
                      {configs.map((c, i) => (
                        <tr key={c.id} className="hover:bg-violet-50/30 transition-colors">
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
                      {["STT", "Mã bé", "Họ và tên", "Ngày sinh", "Giới tính", "Lớp", "Kết quả", "Thao tác"].map(h => <th key={h} className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>)}
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
                        <td className="p-4">{child.admissionResult ? <span className={`text-xs font-black px-2.5 py-1 rounded-full ${child.admissionResult.toUpperCase().includes("ĐẠT") && !child.admissionResult.toUpperCase().includes("KHÔNG") ? "bg-emerald-100 text-emerald-700" : child.admissionResult.toUpperCase().includes("KHÔNG") ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-700"}`}>{child.admissionResult}</span> : <span className="text-xs text-slate-300">Chưa</span>}</td>
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
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-5 flex items-center gap-2"><Heart className="w-4 h-4 text-violet-400" /> Phân bố theo Độ tuổi / Lớp</h3>
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
          <div className="grid grid-cols-2 gap-3"><Field label="Số đợt"><input type="number" min={1} value={bForm.batchNumber} onChange={e => setBForm({...bForm, batchNumber: e.target.value})} className={inp} /></Field><Field label="Tên nội dung" required><input value={bForm.name} onChange={e => setBForm({...bForm, name: e.target.value})} className={inp} placeholder="VD: KS Mầm non CS A" /></Field></div>
          <div className="grid grid-cols-2 gap-3"><Field label="Ngày bắt đầu" required><input type="date" value={bForm.startDate} onChange={e => setBForm({...bForm, startDate: e.target.value})} className={inp} /></Field><Field label="Ngày kết thúc" required><input type="date" value={bForm.endDate} onChange={e => setBForm({...bForm, endDate: e.target.value})} className={inp} /></Field></div>
          <Field label="Cơ sở"><select value={bForm.campusId} onChange={e => setBForm({...bForm, campusId: e.target.value})} className={inp}><option value="">-- Tất cả cơ sở --</option>{campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}</select></Field>
          <Field label="Người phụ trách"><select value={bForm.assignedUserId} onChange={e => setBForm({...bForm, assignedUserId: e.target.value})} className={inp}><option value="">-- Chưa gán --</option>{giaoVuCSUsers.map((u: any) => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select></Field>
          <Field label="Trạng thái"><select value={bForm.status} onChange={e => setBForm({...bForm, status: e.target.value})} className={inp}><option value="ACTIVE">Đang mở</option><option value="INACTIVE">Đóng</option><option value="LOCKED">Khóa</option></select></Field>
        </div>
      </Modal>

      {/* Modal: Child */}
      <Modal open={cModal} onClose={() => setCModal(false)} title={editC ? "Sửa thông tin Bé" : "Thêm Bé Mầm non"} size="lg" footer={<><button onClick={() => setCModal(false)} className="flex-1 text-xs font-black uppercase text-slate-400">Đóng</button><button onClick={saveChild} className="flex-1 py-3.5 bg-violet-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-violet-100">Lưu</button></>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Mã bé" required><input value={cForm.studentCode} onChange={e => setCForm({...cForm, studentCode: e.target.value})} disabled={!!editC} className={inp + (editC ? " bg-violet-50/50" : "")} placeholder="MN001" /></Field>
          <Field label="Họ và tên" required><input value={cForm.fullName} onChange={e => setCForm({...cForm, fullName: e.target.value})} className={inp} placeholder="Họ và tên đầy đủ" /></Field>
          <Field label="Ngày sinh"><input type="date" value={cForm.dateOfBirth} onChange={e => setCForm({...cForm, dateOfBirth: e.target.value})} className={inp} /></Field>
          <Field label="Giới tính"><select value={cForm.gender} onChange={e => setCForm({...cForm, gender: e.target.value})} className={inp}><option value="">-- Chọn --</option><option value="Nam">Nam</option><option value="Nữ">Nữ</option></select></Field>
          <Field label="Lớp / Nhóm tuổi"><select value={cForm.grade} onChange={e => setCForm({...cForm, grade: e.target.value})} className={inp}><option value="">-- Chọn nhóm tuổi --</option>{grades.map(g => <option key={g} value={g}>{g}</option>)}</select></Field>
          <Field label="Tên lớp"><input value={cForm.className} onChange={e => setCForm({...cForm, className: e.target.value})} className={inp} placeholder="Lớp Hoa Hồng" /></Field>
          <Field label="Diện khảo sát"><input value={cForm.admissionCriteria} onChange={e => setCForm({...cForm, admissionCriteria: e.target.value})} className={inp} placeholder="Nội tỉnh / Ngoại tỉnh" /></Field>
          <Field label="Đối tượng"><input value={cForm.targetType} onChange={e => setCForm({...cForm, targetType: e.target.value})} className={inp} placeholder="Tuyển mới / Chuyển lớp" /></Field>
          <Field label="Đợt KS"><select value={cForm.batchId} onChange={e => setCForm({...cForm, batchId: e.target.value})} className={inp}><option value="">-- Không gán --</option>{selPeriod?.batches?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
          <Field label="Hệ KS"><input value={cForm.surveyFormType} onChange={e => setCForm({...cForm, surveyFormType: e.target.value})} className={inp} placeholder="Mầm non Sky-Line" /></Field>
        </div>
      </Modal>

      {/* Modal: Config */}
      <Modal open={cfgModal} onClose={() => setCfgModal(false)} title={editCfg ? "Sửa danh mục" : "Thêm danh mục"} footer={<><button onClick={() => setCfgModal(false)} className="flex-1 text-xs font-black uppercase text-slate-400">Hủy</button><button onClick={saveCfg} className="flex-1 py-3.5 bg-violet-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest">Lưu</button></>}>
        <div className="space-y-4">
          <Field label="Loại" required><select value={cfgForm.categoryType} onChange={e => setCfgForm({...cfgForm, categoryType: e.target.value})} className={inp}><option value="">-- Chọn loại --</option><option value="target">Đối tượng</option><option value="criteria">Diện KS</option><option value="system">Hệ KS</option></select></Field>
          <Field label="Mã" required><input value={cfgForm.code} onChange={e => setCfgForm({...cfgForm, code: e.target.value})} disabled={!!editCfg} className={inp} placeholder="TUYEN_MOI" /></Field>
          <Field label="Tên" required><input value={cfgForm.name} onChange={e => setCfgForm({...cfgForm, name: e.target.value})} className={inp} placeholder="Tuyển mới" /></Field>
        </div>
      </Modal>
    </div>
  );
}
