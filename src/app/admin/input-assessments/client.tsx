"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Plus, Search, Edit2, Trash2, Users, Settings, Clock, BarChart3,
  Upload, Layers, Database, UserCheck, Calendar, X, Check, AlertCircle,
  ChevronDown, ChevronUp, Loader2, BookOpen, GraduationCap, RefreshCw,
  Tag, FolderOpen, Hash, MoreVertical, PenLine, CheckCircle2
} from "lucide-react"
import * as XLSX from "xlsx"

// ========= TYPES =========
interface AcademicYear { id: string; name: string; status: string }
interface Campus { id: string; campusName: string; campusCode: string }
interface User { id: string; fullName: string }
interface AssessmentSubject { id: string; name: string; code: string; status: string; sortOrder: number }
interface EduSystem { id: string; name: string; code: string }
interface AssessmentConfig { id: string; name: string; categoryType: string; sortOrder: number; code: string; academicYearId?: string }
interface Teacher { userId: string; teacherName: string; departmentId?: string }
interface Department { id: string; name: string }
interface Batch { id: string; periodId: string; batchNumber: number; name: string; startDate: string; endDate: string; status: string }
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
}

interface Props {
  academicYears: AcademicYear[]; campuses: Campus[]; examBoardUsers: User[];
  subjects: AssessmentSubject[]; eduSystems: EduSystem[]; grades: string[];
  configs: AssessmentConfig[]; teachers: Teacher[]; departments: Department[];
}

// ========= CONSTANTS =========
const CATEGORY_TYPES = [
  { code: "DIEN_KS",       label: "Diện Khảo sát",      color: "from-violet-500 to-indigo-500" },
  { code: "HINH_THUC_KS",  label: "Hình thức KS",        color: "from-blue-500 to-cyan-500" },
  { code: "HS_CT_QUOC_TE", label: "Hồ sơ CT Quốc tế",   color: "from-emerald-500 to-teal-500" },
  { code: "HOC_KY",        label: "Học kỳ / Năm TS",     color: "from-amber-500 to-orange-500" },
  { code: "KQGD_TIEU_HOC", label: "KQGD Tiểu học",       color: "from-rose-500 to-pink-500" },
  { code: "KQ_HOC_TAP",    label: "Kết quả Học tập",     color: "from-sky-500 to-blue-500" },
  { code: "KQ_REN_LUYEN",  label: "Kết quả Rèn luyện",   color: "from-green-500 to-emerald-500" },
  { code: "LOAI_TUYEN_SINH",label: "Loại Tuyển sinh",    color: "from-purple-500 to-violet-500" },
]
const STATUS_OPTS = ["ACTIVE", "DRAFT", "CLOSED"]
const STATUS_MAP: Record<string,{label:string,cls:string}> = {
  ACTIVE:   { label:"Đang mở",   cls:"bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" },
  DRAFT:    { label:"Bản nháp",  cls:"bg-amber-100 text-amber-700 ring-1 ring-amber-200" },
  CLOSED:   { label:"Kết thúc", cls:"bg-red-100 text-red-700 ring-1 ring-red-200" },
  INACTIVE: { label:"Tắt",      cls:"bg-slate-100 text-slate-500 ring-1 ring-slate-200" },
}
function Badge({ s }: { s: string }) {
  const m = STATUS_MAP[s] || STATUS_MAP.INACTIVE
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${m.cls}`}>{m.label}</span>
}

// ========= FIELD =========
function Field({ label, required, children }: { label:string; required?:boolean; children:React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1 text-xs font-bold text-slate-500">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
const inp = "w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all placeholder:text-slate-300"

// ========= MODAL =========
function Modal({ open, onClose, title, size="md", children, footer }: {
  open:boolean; onClose:()=>void; title:string; size?:"sm"|"md"|"lg";
  children:React.ReactNode; footer:React.ReactNode
}) {
  if (!open) return null
  const w = size==="lg" ? "max-w-3xl" : size==="sm" ? "max-w-sm" : "max-w-lg"
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"/>
      <div className={`relative bg-white w-full ${w} rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden`} onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-base font-black text-slate-800">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500"><X className="w-4 h-4"/></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">{footer}</div>
      </div>
    </div>
  )
}

// ========= CONFIRM DIALOG =========
function ConfirmDialog({ open, onClose, onConfirm, message }: { open:boolean; onClose:()=>void; onConfirm:()=>void; message:string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
        <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-rose-600"/>
        </div>
        <h3 className="text-base font-black text-slate-800 mb-2">Xác nhận xóa</h3>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50">Hủy</button>
          <button onClick={()=>{onConfirm(); onClose()}} className="flex-1 py-2.5 bg-rose-600 text-white rounded-2xl text-sm font-bold hover:bg-rose-700 shadow-lg shadow-rose-100">Xóa</button>
        </div>
      </div>
    </div>
  )
}

// ========= TOAST =========
function Toast({ msg, type }: { msg:string; type:"ok"|"err" }) {
  return (
    <div className={`fixed top-5 right-5 z-[400] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold animate-in slide-in-from-top-3 duration-300 ${type==="ok"?"bg-emerald-600 text-white":"bg-rose-600 text-white"}`}>
      {type==="ok" ? <CheckCircle2 className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
      {msg}
    </div>
  )
}

// ========= SPINNER =========
function Spin() { return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin"/></div> }
function Empty({ icon:Icon, text, sub }: { icon:any; text:string; sub?:string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4"><Icon className="w-8 h-8 text-slate-300"/></div>
      <p className="font-black text-slate-400">{text}</p>
      {sub && <p className="text-xs text-slate-300 mt-1">{sub}</p>}
    </div>
  )
}

// ========= MAIN =========
export function InputAssessmentsClient({ academicYears, campuses, examBoardUsers, subjects: subjectsList, configs: initialConfigs, grades, teachers }: Props) {
  const [tab, setTab] = useState("periods")
  const [yearId, setYearId] = useState(academicYears[0]?.id || "")
  const [toast, setToast] = useState<{msg:string;type:"ok"|"err"}|null>(null)
  const notify = (msg:string, type:"ok"|"err"="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null),3200) }

  // ───────── PERIODS STATE ─────────
  const [periods, setPeriods] = useState<Period[]>([])
  const [pLoading, setPLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string|null>(null)
  const [pModal, setPModal] = useState(false)
  const [editP, setEditP] = useState<Period|null>(null)
  const [pForm, setPForm] = useState({ code:"", name:"", campusId:"", assignedUserId:"", startDate:"", endDate:"", description:"", status:"ACTIVE" })
  const [confirm, setConfirm] = useState<{msg:string; fn:()=>void}|null>(null)

  // ───────── BATCH STATE ─────────
  const [bModal, setBModal] = useState(false)
  const [editB, setEditB] = useState<Batch|null>(null)
  const [targetPeriodId, setTargetPeriodId] = useState("")
  const [bForm, setBForm] = useState({ batchNumber:"1", name:"", startDate:"", endDate:"", status:"ACTIVE" })

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
  const [sForm, setSForm] = useState({ studentCode:"", fullName:"", dateOfBirth:"", grade:"", admissionCriteria:"", className:"", hocKy:"", kqgdTieuHoc:"", kqHocTap:"", kqRenLuyen:"", targetType:"", surveySystem:"" })
  const fileRef = useRef<HTMLInputElement>(null)

  // ───────── CONFIGS STATE ─────────
  const [configs, setConfigs] = useState<AssessmentConfig[]>(initialConfigs)
  const [cLoading, setCLoading] = useState(false)
  const [cModal, setCModal] = useState(false)
  const [editC, setEditC] = useState<AssessmentConfig|null>(null)
  const [cForm, setCForm] = useState({ categoryType:"DIEN_KS", code:"", name:"" })

  // ───────── FETCHERS ─────────
  const fetchPeriods = useCallback(async () => {
    if (!yearId) return
    setPLoading(true)
    try {
      const r = await fetch(`/api/input-assessments?academicYearId=${yearId}`)
      if (r.ok) { const d = await r.json(); setPeriods(d); if (d.length && !sPeriodId) setSPeriodId(d[0].id) }
    } finally { setPLoading(false) }
  }, [yearId, sPeriodId])

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

  useEffect(() => { fetchPeriods() }, [fetchPeriods])
  useEffect(() => { if (tab === "students") fetchStudents() }, [tab, fetchStudents])
  useEffect(() => { if (tab === "categories") fetchConfigs() }, [tab, fetchConfigs])

  // ───────── PERIOD CRUD ─────────
  const openAddPeriod = () => { setEditP(null); setPForm({ code:"", name:"", campusId:"", assignedUserId:"", startDate:"", endDate:"", description:"", status:"ACTIVE" }); setPModal(true) }
  const openEditPeriod = (p:Period) => { setEditP(p); setPForm({ code:p.code, name:p.name, campusId:p.campusId||"", assignedUserId:p.assignedUserId||"", startDate:p.startDate?.slice(0,10)||"", endDate:p.endDate?.slice(0,10)||"", description:p.description||"", status:p.status }); setPModal(true) }
  const savePeriod = async () => {
    if (!pForm.code.trim()||!pForm.name.trim()) return notify("Cần nhập Mã và Tên","err")
    const r = await fetch("/api/input-assessments", { method: editP?"PUT":"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action: editP?"UPDATE_PERIOD":"CREATE_PERIOD", id:editP?.id, data:{...pForm, academicYearId:yearId} }) })
    const j = await r.json()
    if (r.ok) { setPModal(false); fetchPeriods(); notify(editP?"Đã cập nhật kỳ khảo sát":"Đã tạo kỳ khảo sát mới") }
    else notify(j.error||"Lỗi","err")
  }
  const doDeletePeriod = async (id:string) => { const r = await fetch(`/api/input-assessments?type=period&id=${id}`,{method:"DELETE"}); if (r.ok) { fetchPeriods(); notify("Đã xóa kỳ khảo sát") } }

  // ───────── BATCH CRUD ─────────
  const openAddBatch = (pid:string) => { setTargetPeriodId(pid); setEditB(null); setBForm({ batchNumber:"1", name:"", startDate:"", endDate:"", status:"ACTIVE" }); setBModal(true) }
  const openEditBatch = (b:Batch) => { setTargetPeriodId(b.periodId); setEditB(b); setBForm({ batchNumber:String(b.batchNumber), name:b.name, startDate:b.startDate?.slice(0,10)||"", endDate:b.endDate?.slice(0,10)||"", status:b.status }); setBModal(true) }
  const saveBatch = async () => {
    if (!bForm.name.trim()||!bForm.startDate||!bForm.endDate) return notify("Cần nhập đủ Tên, Ngày bắt/kết thúc","err")
    const r = await fetch("/api/input-assessments", { method: editB?"PUT":"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action: editB?"UPDATE_BATCH":"CREATE_BATCH", id:editB?.id, data:{...bForm, periodId:targetPeriodId, batchNumber:parseInt(bForm.batchNumber)||1} }) })
    const j = await r.json()
    if (r.ok) { setBModal(false); fetchPeriods(); notify(editB?"Đã cập nhật đợt":"Đã tạo đợt mới") }
    else notify(j.error||"Lỗi","err")
  }
  const doDeleteBatch = async (id:string) => { const r = await fetch(`/api/input-assessments?type=batch&id=${id}`,{method:"DELETE"}); if (r.ok) { fetchPeriods(); notify("Đã xóa đợt") } }

  // ───────── STUDENT CRUD ─────────
  const openAddStudent = () => { setEditS(null); setSForm({ studentCode:"", fullName:"", dateOfBirth:"", grade:"", admissionCriteria:"", className:"", hocKy:"", kqgdTieuHoc:"", kqHocTap:"", kqRenLuyen:"", targetType:"", surveySystem:"" }); setSModal(true) }
  const openEditStudent = (s:Student) => { setEditS(s); setSForm({ studentCode:s.studentCode, fullName:s.fullName, dateOfBirth:s.dateOfBirth?.slice(0,10)||"", grade:s.grade||"", admissionCriteria:s.admissionCriteria||"", className:s.className||"", hocKy:s.hocKy||"", kqgdTieuHoc:s.kqgdTieuHoc||"", kqHocTap:s.kqHocTap||"", kqRenLuyen:s.kqRenLuyen||"", targetType:s.targetType||"", surveySystem:s.surveySystem||"" }); setSModal(true) }
  const saveStudent = async () => {
    if (!sForm.studentCode.trim()||!sForm.fullName.trim()) return notify("Cần nhập Mã HS và Họ tên","err")
    const r = editS
      ? await fetch("/api/input-assessment-students", { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id:editS.id, data:sForm }) })
      : await fetch("/api/input-assessment-students", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"CREATE", data:{...sForm, periodId:sPeriodId, batchId:sBatchId||null} }) })
    const j = await r.json()
    if (r.ok) { setSModal(false); fetchStudents(); notify(editS?"Đã cập nhật học sinh":"Đã thêm học sinh") }
    else notify(j.error||"Lỗi","err")
  }
  const doDeleteStudent = async (id:string) => { const r = await fetch(`/api/input-assessment-students?id=${id}`,{method:"DELETE"}); if (r.ok) { fetchStudents(); notify("Đã xóa") } }
  const doDeleteSelected = async () => {
    const r = await fetch(`/api/input-assessment-students?ids=${sSelected.join(",")}`,{method:"DELETE"})
    if (r.ok) { setSSelected([]); fetchStudents(); notify(`Đã xóa ${sSelected.length} học sinh`) }
  }
  const filtStu = students.filter(s => {
    if (!sSearch) return true
    const q = sSearch.toLowerCase()
    return (s.studentCode||"").toLowerCase().includes(q)||(s.fullName||"").toLowerCase().includes(q)
  })

  // ───────── EXCEL IMPORT ─────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file||!sPeriodId) return
    setImporting(true)
    try {
      const d = await file.arrayBuffer()
      const wb = XLSX.read(d)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval:"" })
      const mapped = rows.map((row:any) => ({
        studentCode: String(row["Ma_HS_KS"]||row["Mã HS KS"]||row["MaHS"]||row["studentCode"]||"").trim(),
        fullName:    String(row["Ho ten"]||row["Họ tên"]||row["HoTen"]||row["fullName"]||"").trim(),
        dateOfBirth: (() => {
          const v = row["Ngay sinh"]||row["Ngày sinh"]||row["NgaySinh"]||row["dateOfBirth"]
          if (!v) return ""
          if (typeof v === "number") { const dd = (XLSX as any).SSF?.parse_date_code?.(v); return dd?`${dd.y}-${String(dd.m).padStart(2,"0")}-${String(dd.d).padStart(2,"0")}`:""  }
          return String(v).trim()
        })(),
        grade:             String(row["Khoi"]||row["Khối"]||row["grade"]||"").trim(),
        admissionCriteria: String(row["Dien KS"]||row["Diện KS"]||row["He hoc"]||row["admissionCriteria"]||"").trim(),
        className:         String(row["Lop"]||row["Lớp"]||row["className"]||"").trim(),
        hocKy:             String(row["Hoc ky"]||row["Học kỳ"]||row["hocKy"]||"").trim(),
        kqHocTap:          String(row["KQ Hoc tap"]||row["KQ học tập"]||"").trim(),
        kqRenLuyen:        String(row["KQ Ren luyen"]||row["KQ rèn luyện"]||"").trim(),
        periodId: sPeriodId, batchId: sBatchId||null
      })).filter((r:any) => r.studentCode && r.fullName)
      if (!mapped.length) throw new Error("Không tìm thấy dữ liệu. Cần cột: Ma_HS_KS, Ho ten")
      const res = await fetch("/api/input-assessment-students", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({action:"BULK_CREATE", data:mapped}) })
      const result = await res.json()
      if (result.success) { notify(`Import thành công: ${result.created}/${mapped.length} học sinh`); fetchStudents() }
      else throw new Error(result.error||"Lỗi")
    } catch(err:any) { notify("Lỗi import: "+err.message,"err") }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value="" }
  }

  // ───────── CONFIG CRUD ─────────
  const openAddConfig = (type:string) => { setEditC(null); setCForm({ categoryType:type, code:"", name:"" }); setCModal(true) }
  const openEditConfig = (c:AssessmentConfig) => { setEditC(c); setCForm({ categoryType:c.categoryType, code:c.code, name:c.name }); setCModal(true) }
  const saveConfig = async () => {
    if (!cForm.code.trim()||!cForm.name.trim()) return notify("Cần nhập Mã và Tên","err")
    const r = editC
      ? await fetch("/api/assessment-configs", { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id:editC.id, name:cForm.name, code:cForm.code }) })
      : await fetch("/api/assessment-configs", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(cForm) })
    const j = await r.json()
    if (r.ok) { setCModal(false); fetchConfigs(); notify(editC?"Đã cập nhật":"Đã thêm danh mục") }
    else notify(j.error||"Lỗi","err")
  }
  const doDeleteConfig = async (id:string) => { const r = await fetch(`/api/assessment-configs?id=${id}`,{method:"DELETE"}); if (r.ok) { fetchConfigs(); notify("Đã xóa danh mục") } }

  const selPeriod = periods.find(p => p.id === sPeriodId)

  // ====================== RENDER ======================
  return (
    <div className="space-y-4 font-sans">
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      {confirm && <ConfirmDialog open={true} onClose={()=>setConfirm(null)} onConfirm={confirm.fn} message={confirm.msg}/>}

      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 shadow-sm rounded-2xl p-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <Database className="w-5 h-5 text-white"/>
          </div>
          <div>
            <p className="text-base font-black text-slate-800">Quản lý KSNL Đầu vào</p>
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest">Hệ thống đánh giá khảo sát năng lực</p>
          </div>
        </div>
        <div className="flex items-center gap-2 pl-3 pr-1 py-1 bg-slate-50 rounded-xl border border-slate-200">
          <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0"/>
          <select value={yearId} onChange={e=>{setYearId(e.target.value); setSPeriodId(""); setStudents([])}} className="bg-transparent text-sm font-bold text-slate-700 outline-none pr-3 py-1 cursor-pointer">
            {academicYears.map(ay=><option key={ay.id} value={ay.id}>Năm học {ay.name}</option>)}
          </select>
        </div>
      </div>

      {/* TAB NAV */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-white border border-slate-200 shadow-sm rounded-2xl">
        {[
          { id:"periods",    label:"Kỳ & Đợt KS",       icon:Clock },
          { id:"students",   label:"Danh sách Học sinh", icon:Users },
          { id:"categories", label:"Danh mục Đánh giá",  icon:Settings },
          { id:"subjects",   label:"Gán Môn - Khối",     icon:BookOpen },
          { id:"assignments",label:"Phân công GV",        icon:UserCheck },
          { id:"reports",    label:"Kết quả Tổng hợp",   icon:BarChart3 },
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap ${tab===t.id?"bg-indigo-600 text-white shadow-md shadow-indigo-100":"text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}>
            <t.icon className={`w-4 h-4 ${tab===t.id?"text-white/90":"text-slate-400"}`}/>
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== TAB: PERIODS ===== */}
      {tab==="periods" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2"><Clock className="w-4 h-4"/> Kỳ & Đợt Khảo sát</h2>
            <div className="flex gap-2">
              <button onClick={fetchPeriods} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"><RefreshCw className="w-4 h-4"/></button>
              <button onClick={openAddPeriod} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                <Plus className="w-4 h-4"/> Tạo Kỳ mới
              </button>
            </div>
          </div>

          {pLoading ? <Spin/> : periods.length===0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm"><Empty icon={Clock} text="Chưa có kỳ khảo sát" sub="Nhấn 'Tạo Kỳ mới' để bắt đầu"/></div>
          ) : (
            <div className="space-y-3">
              {periods.map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Period header row */}
                  <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={()=>setExpandedId(expandedId===p.id?null:p.id)}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-indigo-500"/>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-800">{p.name}</span>
                          <Badge s={p.status}/>
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">{p.code}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400 font-semibold flex-wrap">
                          {p.startDate && <span>{p.startDate.slice(0,10)} → {p.endDate?.slice(0,10)||"?"}</span>}
                          <span className="text-indigo-400 font-bold">{p.batches?.length||0} đợt</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={e=>{e.stopPropagation(); openAddBatch(p.id)}} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all border border-emerald-100">
                        <Plus className="w-3.5 h-3.5"/> Thêm đợt
                      </button>
                      <button onClick={e=>{e.stopPropagation(); openEditPeriod(p)}} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-transparent hover:border-indigo-100 transition-all">
                        <Edit2 className="w-4 h-4"/>
                      </button>
                      <button onClick={e=>{e.stopPropagation(); setConfirm({msg:`Xóa kỳ "${p.name}" và toàn bộ dữ liệu liên quan?`,fn:()=>doDeletePeriod(p.id)})}} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100 transition-all">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                      <span className="text-slate-300">{expandedId===p.id?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</span>
                    </div>
                  </div>

                  {/* Batches */}
                  {expandedId===p.id && (
                    <div className="border-t border-slate-100 p-5 bg-slate-50/40">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Các đợt trong kỳ</p>
                      {p.batches&&p.batches.length>0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                          {p.batches.map(b=>(
                            <div key={b.id} className="group bg-white rounded-xl border border-slate-200 p-4 flex items-start justify-between hover:border-indigo-200 hover:shadow-md transition-all">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white flex-shrink-0">#{b.batchNumber}</div>
                                <div>
                                  <p className="text-sm font-bold text-slate-700">{b.name}</p>
                                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">{b.startDate?.slice(0,10)} → {b.endDate?.slice(0,10)}</p>
                                  <Badge s={b.status}/>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                                <button onClick={()=>openEditBatch(b)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 className="w-3.5 h-3.5"/></button>
                                <button onClick={()=>setConfirm({msg:`Xóa đợt "${b.name}"?`,fn:()=>doDeleteBatch(b.id)})} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5"/></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <button onClick={()=>openAddBatch(p.id)} className="w-full py-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-300 hover:border-indigo-200 hover:text-indigo-400 transition-all group">
                          <Layers className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform"/>
                          <span className="text-xs font-black uppercase tracking-wider">Thêm đợt đầu tiên</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== TAB: STUDENTS ===== */}
      {tab==="students" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex flex-wrap items-end gap-4">
              <Field label="Kỳ khảo sát" required>
                <select value={sPeriodId} onChange={e=>{setSPeriodId(e.target.value); setSBatchId(""); setStudents([])}} className={inp+" min-w-[220px]"}>
                  <option value="">-- Chọn Kỳ --</option>
                  {periods.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Đợt (Batch)">
                <select value={sBatchId} onChange={e=>setSBatchId(e.target.value)} className={inp+" min-w-[180px]"} disabled={!sPeriodId}>
                  <option value="">-- Tất cả đợt --</option>
                  {selPeriod?.batches?.map(b=><option key={b.id} value={b.id}>Đợt {b.batchNumber}: {b.name}</option>)}
                </select>
              </Field>
              <Field label="Tìm kiếm">
                <div className="relative min-w-[260px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300"/>
                  <input value={sSearch} onChange={e=>setSSearch(e.target.value)} placeholder="Mã HS hoặc họ tên..." className={inp+" pl-10"}/>
                </div>
              </Field>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={fetchStudents} disabled={!sPeriodId} className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-700 text-white text-sm font-bold rounded-xl hover:bg-slate-900 disabled:opacity-40 transition-all">
                  <Search className="w-4 h-4"/> Tải
                </button>
                <button onClick={openAddStudent} disabled={!sPeriodId} className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-all shadow-md shadow-indigo-100">
                  <Plus className="w-4 h-4"/> Thêm HS
                </button>
                <button onClick={()=>fileRef.current?.click()} disabled={!sPeriodId||importing} className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-40 transition-all shadow-md shadow-emerald-100">
                  <Upload className="w-4 h-4"/> {importing?"Đang import...":"Import Excel"}
                </button>
                <input type="file" ref={fileRef} accept=".xlsx,.xls" className="hidden" onChange={handleImport}/>
              </div>
            </div>
          </div>

          {/* Bulk bar */}
          {sSelected.length>0 && (
            <div className="bg-indigo-600 text-white px-5 py-3 rounded-xl flex items-center justify-between shadow-md">
              <span className="text-sm font-bold">Đã chọn {sSelected.length} học sinh</span>
              <div className="flex gap-3">
                <button onClick={()=>setConfirm({msg:`Xóa ${sSelected.length} học sinh đã chọn?`,fn:doDeleteSelected})} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold"><Trash2 className="w-3.5 h-3.5"/> Xóa đã chọn</button>
                <button onClick={()=>setSSelected([])} className="text-sm text-white/60 hover:text-white font-bold">Bỏ chọn</button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {sLoading ? <Spin/> : filtStu.length===0 ? (
              <Empty icon={Users} text="Không có học sinh" sub={sPeriodId?"Nhấn 'Tải' hoặc import Excel":"Chọn kỳ khảo sát trước"}/>
            ) : (
              <>
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-500">{filtStu.length} học sinh</span>
                  {filtStu.length>0 && <button onClick={()=>setSSelected(sSelected.length===filtStu.length?[]:filtStu.map(s=>s.id))} className="text-xs font-bold text-indigo-600 hover:underline">
                    {sSelected.length===filtStu.length?"Bỏ chọn tất cả":"Chọn tất cả"}
                  </button>}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-100 bg-slate-50">
                      <tr>
                        <th className="w-10 p-4"><input type="checkbox" className="rounded accent-indigo-600" checked={sSelected.length===filtStu.length&&filtStu.length>0} onChange={e=>setSSelected(e.target.checked?filtStu.map(s=>s.id):[])}/></th>
                        {["Mã HS","Họ tên","Ngày sinh","Khối","Hệ học / Diện KS","Học kỳ","KQ Học tập","KQ Rèn luyện",""].map((h,i)=>(
                          <th key={i} className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filtStu.map(s=>(
                        <tr key={s.id} className="group hover:bg-indigo-50/30 transition-colors">
                          <td className="p-4"><input type="checkbox" className="rounded accent-indigo-600" checked={sSelected.includes(s.id)} onChange={()=>setSSelected(p=>p.includes(s.id)?p.filter(x=>x!==s.id):[...p,s.id])}/></td>
                          <td className="p-4"><span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg whitespace-nowrap">{s.studentCode}</span></td>
                          <td className="p-4 font-bold text-slate-800 whitespace-nowrap">{s.fullName}</td>
                          <td className="p-4 text-[11px] text-slate-400 whitespace-nowrap">{s.dateOfBirth?.slice(0,10)||"—"}</td>
                          <td className="p-4 text-xs font-bold text-slate-600">{s.grade||"—"}</td>
                          <td className="p-4 text-xs text-slate-600">{s.admissionCriteria||"—"}</td>
                          <td className="p-4 text-xs text-slate-600">{s.hocKy||"—"}</td>
                          <td className="p-4 text-xs text-slate-600">{s.kqHocTap||"—"}</td>
                          <td className="p-4 text-xs text-slate-600">{s.kqRenLuyen||"—"}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={()=>openEditStudent(s)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-transparent hover:border-indigo-100 transition-all"><Edit2 className="w-3.5 h-3.5"/></button>
                              <button onClick={()=>setConfirm({msg:`Xóa học sinh "${s.fullName}"?`,fn:()=>doDeleteStudent(s.id)})} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100 transition-all"><Trash2 className="w-3.5 h-3.5"/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== TAB: CATEGORIES ===== */}
      {tab==="categories" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2"><Tag className="w-4 h-4"/> Danh mục Đánh giá</h2>
            <button onClick={fetchConfigs} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"><RefreshCw className="w-4 h-4"/></button>
          </div>
          {cLoading ? <Spin/> : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {CATEGORY_TYPES.map(type=>{
                const group = configs.filter(c=>c.categoryType===type.code)
                return (
                  <div key={type.code} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    {/* Category header */}
                    <div className="p-4 border-b border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r ${type.color} text-white text-[10px] font-black uppercase tracking-widest shadow-sm w-fit`}>
                          <Hash className="w-2.5 h-2.5"/> {type.code.replace(/_/g," ")}
                        </div>
                        <span className="text-xs font-black text-slate-400">{group.length}</span>
                      </div>
                      <p className="text-sm font-black text-slate-700 mt-1">{type.label}</p>
                    </div>
                    {/* Items */}
                    <div className="p-3 flex-1 space-y-1.5 min-h-[80px]">
                      {group.length===0&&<p className="text-center text-xs text-slate-200 font-bold py-5 uppercase tracking-widest">Chưa có dữ liệu</p>}
                      {group.map(c=>(
                        <div key={c.id} className="group flex items-center justify-between px-3 py-2.5 rounded-xl border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all cursor-default">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">{c.name}</p>
                            <p className="text-[10px] font-mono text-slate-400 uppercase">{c.code}</p>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                            <button onClick={()=>openEditConfig(c)} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 className="w-3 h-3"/></button>
                            <button onClick={()=>setConfirm({msg:`Xóa "${c.name}"?`,fn:()=>doDeleteConfig(c.id)})} className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="w-3 h-3"/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Add button */}
                    <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                      <button onClick={()=>openAddConfig(type.code)} className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-white hover:border-indigo-100 border border-dashed border-slate-200 rounded-xl transition-all">
                        <Plus className="w-3.5 h-3.5"/> Thêm giá trị
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== PLACEHOLDER TABS ===== */}
      {["subjects","assignments","reports"].includes(tab) && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Empty icon={GraduationCap} text="Đang phát triển" sub="Tính năng này đang được hoàn thiện và sẽ sớm ra mắt."/>
        </div>
      )}

      {/* ============= PERIOD MODAL ============= */}
      <Modal open={pModal} onClose={()=>setPModal(false)} title={editP?"Cập nhật Kỳ khảo sát":"Tạo Kỳ khảo sát mới"} footer={<>
        <button onClick={()=>setPModal(false)} className="flex-1 py-3 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Hủy</button>
        <button onClick={savePeriod} className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">{editP?"Lưu thay đổi":"Tạo Kỳ"}</button>
      </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mã Kỳ" required><input value={pForm.code} onChange={e=>setPForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="KSNL_2024_HK1" className={inp}/></Field>
            <Field label="Trạng thái"><select value={pForm.status} onChange={e=>setPForm(f=>({...f,status:e.target.value}))} className={inp}>{STATUS_OPTS.map(s=><option key={s} value={s}>{STATUS_MAP[s].label}</option>)}</select></Field>
          </div>
          <Field label="Tên Kỳ khảo sát" required><input value={pForm.name} onChange={e=>setPForm(f=>({...f,name:e.target.value}))} placeholder="Kỳ Đánh giá KSNL Đầu vào 2024 – HK1" className={inp}/></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ngày bắt đầu"><input type="date" value={pForm.startDate} onChange={e=>setPForm(f=>({...f,startDate:e.target.value}))} className={inp}/></Field>
            <Field label="Ngày kết thúc"><input type="date" value={pForm.endDate} onChange={e=>setPForm(f=>({...f,endDate:e.target.value}))} className={inp}/></Field>
          </div>
          <Field label="Cơ sở">
            <select value={pForm.campusId} onChange={e=>setPForm(f=>({...f,campusId:e.target.value}))} className={inp}>
              <option value="">-- Tất cả cơ sở --</option>
              {campuses.map(c=><option key={c.id} value={c.id}>{c.campusName}</option>)}
            </select>
          </Field>
          <Field label="Người phụ trách">
            <select value={pForm.assignedUserId} onChange={e=>setPForm(f=>({...f,assignedUserId:e.target.value}))} className={inp}>
              <option value="">-- Chưa gán --</option>
              {examBoardUsers.map(u=><option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </Field>
          <Field label="Ghi chú"><textarea rows={2} value={pForm.description} onChange={e=>setPForm(f=>({...f,description:e.target.value}))} placeholder="Mô tả thêm về kỳ này..." className={inp+" resize-none"}/></Field>
        </div>
      </Modal>

      {/* ============= BATCH MODAL ============= */}
      <Modal open={bModal} onClose={()=>setBModal(false)} title={editB?"Cập nhật Đợt":"Tạo Đợt Khảo sát"} size="sm" footer={<>
        <button onClick={()=>setBModal(false)} className="flex-1 py-3 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50">Hủy</button>
        <button onClick={saveBatch} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100">{editB?"Lưu thay đổi":"Tạo Đợt"}</button>
      </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số thứ tự đợt"><input type="number" min={1} value={bForm.batchNumber} onChange={e=>setBForm(f=>({...f,batchNumber:e.target.value}))} className={inp}/></Field>
            <Field label="Trạng thái"><select value={bForm.status} onChange={e=>setBForm(f=>({...f,status:e.target.value}))} className={inp}>{STATUS_OPTS.map(s=><option key={s} value={s}>{STATUS_MAP[s].label}</option>)}</select></Field>
          </div>
          <Field label="Tên Đợt" required><input value={bForm.name} onChange={e=>setBForm(f=>({...f,name:e.target.value}))} placeholder="Đợt 1 – Tháng 9/2024" className={inp}/></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Từ ngày" required><input type="date" value={bForm.startDate} onChange={e=>setBForm(f=>({...f,startDate:e.target.value}))} className={inp}/></Field>
            <Field label="Đến ngày" required><input type="date" value={bForm.endDate} onChange={e=>setBForm(f=>({...f,endDate:e.target.value}))} className={inp}/></Field>
          </div>
        </div>
      </Modal>

      {/* ============= STUDENT MODAL ============= */}
      <Modal open={sModal} onClose={()=>setSModal(false)} title={editS?"Chỉnh sửa Học sinh":"Thêm Học sinh mới"} size="lg" footer={<>
        <button onClick={()=>setSModal(false)} className="flex-1 py-3 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50">Hủy</button>
        <button onClick={saveStudent} className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100">{editS?"Lưu thay đổi":"Thêm học sinh"}</button>
      </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mã HS KS" required><input value={sForm.studentCode} onChange={e=>setSForm(f=>({...f,studentCode:e.target.value}))} placeholder="HS_001" className={inp} disabled={!!editS}/></Field>
            <Field label="Ngày sinh"><input type="date" value={sForm.dateOfBirth} onChange={e=>setSForm(f=>({...f,dateOfBirth:e.target.value}))} className={inp}/></Field>
          </div>
          <Field label="Họ và Tên đầy đủ" required><input value={sForm.fullName} onChange={e=>setSForm(f=>({...f,fullName:e.target.value}))} placeholder="Nguyễn Văn A" className={inp}/></Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Khối KS">
              <select value={sForm.grade} onChange={e=>setSForm(f=>({...f,grade:e.target.value}))} className={inp}>
                <option value="">-- Khối --</option>
                {grades.map(g=><option key={g} value={g}>Khối {g}</option>)}
              </select>
            </Field>
            <Field label="Lớp"><input value={sForm.className} onChange={e=>setSForm(f=>({...f,className:e.target.value}))} placeholder="1A" className={inp}/></Field>
            <Field label="Học kỳ"><input value={sForm.hocKy} onChange={e=>setSForm(f=>({...f,hocKy:e.target.value}))} placeholder="HK1" className={inp}/></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Diện KS (Hệ học)"><input value={sForm.admissionCriteria} onChange={e=>setSForm(f=>({...f,admissionCriteria:e.target.value}))} placeholder="Công lập / Tư thục..." className={inp}/></Field>
            <Field label="Loại Tuyển sinh"><input value={sForm.targetType} onChange={e=>setSForm(f=>({...f,targetType:e.target.value}))} placeholder="Khảo sát / Tuyển thẳng..." className={inp}/></Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="KQGD Tiểu học"><input value={sForm.kqgdTieuHoc} onChange={e=>setSForm(f=>({...f,kqgdTieuHoc:e.target.value}))} placeholder="Hoàn thành tốt" className={inp}/></Field>
            <Field label="KQ Học tập"><input value={sForm.kqHocTap} onChange={e=>setSForm(f=>({...f,kqHocTap:e.target.value}))} placeholder="Giỏi / Khá..." className={inp}/></Field>
            <Field label="KQ Rèn luyện"><input value={sForm.kqRenLuyen} onChange={e=>setSForm(f=>({...f,kqRenLuyen:e.target.value}))} placeholder="Tốt / Khá..." className={inp}/></Field>
          </div>
        </div>
      </Modal>

      {/* ============= CATEGORY MODAL ============= */}
      <Modal open={cModal} onClose={()=>setCModal(false)} title={editC?"Sửa giá trị Danh mục":"Thêm giá trị Danh mục"} size="sm" footer={<>
        <button onClick={()=>setCModal(false)} className="flex-1 py-3 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50">Hủy</button>
        <button onClick={saveConfig} className="flex-1 py-3 bg-amber-600 text-white rounded-2xl text-sm font-bold hover:bg-amber-700 shadow-lg shadow-amber-100">{editC?"Lưu thay đổi":"Thêm"}</button>
      </>}>
        <div className="space-y-4">
          <Field label="Loại Danh mục">
            <select value={cForm.categoryType} onChange={e=>setCForm(f=>({...f,categoryType:e.target.value}))} className={inp} disabled={!!editC}>
              {CATEGORY_TYPES.map(t=><option key={t.code} value={t.code}>{t.label}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mã (code)" required><input value={cForm.code} onChange={e=>setCForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="CONG_LAP" className={inp}/></Field>
            <Field label="Tên hiển thị" required><input value={cForm.name} onChange={e=>setCForm(f=>({...f,name:e.target.value}))} placeholder="Công lập" className={inp}/></Field>
          </div>
        </div>
      </Modal>
    </div>
  )
}
