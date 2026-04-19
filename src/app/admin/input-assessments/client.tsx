"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  Plus, Search, Edit2, Trash2, Users, Settings, Clock, BarChart3,
  Upload, Layers, Database, UserCheck, Calendar, X, Check, AlertCircle,
  ChevronDown, ChevronUp, Loader2, BookOpen, GraduationCap, RefreshCw,
  Tag, FolderOpen, Hash, MoreVertical, PenLine, CheckCircle2,
  Filter, ClipboardCheck, ArrowRight, UserPlus, Info
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
interface Assignment {
  id: string; periodId: string; batchId?: string; userId: string; 
  subjectId: string; grade: string; educationSystem: string;
  user?: { fullName: string }; subject?: { name: string }; batch?: { name: string };
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
  { code: "HS_CT_QUOC_TE", label: "Hồ sơ/Bảng điểm",   color: "from-emerald-500 to-teal-500" },
  { code: "HOC_KY",        label: "Học kỳ / Năm TS",     color: "from-amber-500 to-orange-500" },
  { code: "KY_KS",          label: "Kỳ Khảo sát",         color: "from-orange-500 to-red-500" },
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

// ========= MAIN =========
export function InputAssessmentsClient({ academicYears, campuses, examBoardUsers, subjects: subjectsList, configs: initialConfigs, grades, teachers, departments }: Props) {
  const [tab, setTab] = useState("periods")
  const [yearId, setYearId] = useState(academicYears[0]?.id || "")
  const [toast, setToast] = useState<{msg:string;type:"ok"|"err"}|null>(null)
  const notify = (msg:string, type:"ok"|"err"="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null),3200) }

  // ───────── COMMON STATES ─────────
  const [periods, setPeriods] = useState<Period[]>([])
  const [pLoading, setPLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string|null>(null)
  const [confirm, setConfirm] = useState<{msg:string; fn:()=>void}|null>(null)

  // ───────── PERIODS CRUD ─────────
  const [pModal, setPModal] = useState(false)
  const [editP, setEditP] = useState<Period|null>(null)
  const [pForm, setPForm] = useState({ code:"", name:"", campusId:"", assignedUserId:"", startDate:"", endDate:"", description:"", status:"ACTIVE" })

  // ───────── BATCH CRUD ─────────
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

  // ───────── FETCHERS ─────────
  const fetchPeriods = useCallback(async () => {
    if (!yearId) return
    setPLoading(true)
    try {
      const r = await fetch(`/api/input-assessments?academicYearId=${yearId}`)
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
  const openAddPeriod = () => { setEditP(null); setPForm({ code:"", name:"", campusId:"", assignedUserId:"", startDate:"", endDate:"", description:"", status:"ACTIVE" }); setPModal(true) }
  const openEditPeriod = (p:Period) => { setEditP(p); setPForm({ code:p.code, name:p.name, campusId:p.campusId||"", assignedUserId:p.assignedUserId||"", startDate:p.startDate?.slice(0,10)||"", endDate:p.endDate?.slice(0,10)||"", description:p.description||"", status:p.status }); setPModal(true) }
  const savePeriod = async () => {
    if (!pForm.code.trim()||!pForm.name.trim()) return notify("Cần nhập Mã và Tên","err")
    const r = await fetch("/api/input-assessments", { method: editP?"PUT":"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action: editP?"UPDATE_PERIOD":"CREATE_PERIOD", id:editP?.id, data:{...pForm, academicYearId:yearId} }) })
    if (r.ok) { setPModal(false); fetchPeriods(); notify(editP?"Đã cập nhật kỳ khảo sát":"Đã tạo kỳ khảo sát mới") }
    else notify("Lỗi","err")
  }
  const doDeletePeriod = async (id:string) => { const r = await fetch(`/api/input-assessments?type=period&id=${id}`,{method:"DELETE"}); if (r.ok) { fetchPeriods(); notify("Đã xóa kỳ khảo sát") } }

  const openAddBatch = (pid:string) => { setTargetPeriodId(pid); setEditB(null); setBForm({ batchNumber:"1", name:"", startDate:"", endDate:"", status:"ACTIVE" }); setBModal(true) }
  const openEditBatch = (b:Batch) => { setTargetPeriodId(b.periodId); setEditB(b); setBForm({ batchNumber:String(b.batchNumber), name:b.name, startDate:b.startDate?.slice(0,10)||"", endDate:b.endDate?.slice(0,10)||"", status:b.status }); setBModal(true) }
  const saveBatch = async () => {
    if (!bForm.name.trim()||!bForm.startDate||!bForm.endDate) return notify("Cần nhập đủ Tên, Ngày bắt/kết thúc","err")
    const r = await fetch("/api/input-assessments", { method: editB?"PUT":"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action: editB?"UPDATE_BATCH":"CREATE_BATCH", id:editB?.id, data:{...bForm, periodId:targetPeriodId, batchNumber:parseInt(bForm.batchNumber)||1} }) })
    if (r.ok) { setBModal(false); fetchPeriods(); notify(editB?"Đã cập nhật đợt":"Đã tạo đợt mới") }
    else notify("Lỗi","err")
  }
  const doDeleteBatch = async (id:string) => { const r = await fetch(`/api/input-assessments?type=batch&id=${id}`,{method:"DELETE"}); if (r.ok) { fetchPeriods(); notify("Đã xóa đợt") } }

  const openAddStudent = () => { setEditS(null); setSForm({ studentCode:"", fullName:"", dateOfBirth:"", grade:"", admissionCriteria:"", className:"", hocKy:"", kqgdTieuHoc:"", kqHocTap:"", kqRenLuyen:"", targetType:"", surveySystem:"" }); setSModal(true) }
  const openEditStudent = (s:Student) => { setEditS(s); setSForm({ studentCode:s.studentCode, fullName:s.fullName, dateOfBirth:s.dateOfBirth?.slice(0,10)||"", grade:s.grade||"", admissionCriteria:s.admissionCriteria||"", className:s.className||"", hocKy:s.hocKy||"", kqgdTieuHoc:s.kqgdTieuHoc||"", kqHocTap:s.kqHocTap||"", kqRenLuyen:s.kqRenLuyen||"", targetType:s.targetType||"", surveySystem:s.surveySystem||"" }); setSModal(true) }
  const saveStudent = async () => {
    if (!sForm.studentCode.trim()||!sForm.fullName.trim()) return notify("Cần nhập Mã HS và Họ tên","err")
    const r = editS
      ? await fetch("/api/input-assessment-students", { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id:editS.id, data:sForm }) })
      : await fetch("/api/input-assessment-students", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ action:"CREATE", data:{...sForm, periodId:sPeriodId, batchId:sBatchId||null} }) })
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
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval:"" })
      const mapped = rows.map((row:any) => ({
        studentCode: String(row["Ma_HS_KS"]||row["Mã HS KS"]||row["MaHS"]||row["studentCode"]||"").trim(),
        fullName:    String(row["Ho ten"]||row["Họ tên"]||"").trim(),
        periodId: sPeriodId, 
        batchId: sBatchId||null
      })).filter((r:any) => r.studentCode && r.fullName)
      const res = await fetch("/api/input-assessment-students", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({action:"BULK_CREATE", data:mapped}) })
      if (res.ok) { notify("Import thành công"); fetchStudents() }
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
        notify("Đã hoàn tất phân công giáo viên")
        fetchAssignments()
        // Reset parts but keep period/dept
        setAsSelSubjects([]); setAsSelGrades([]); setAsSelSystems([])
      } else {
        const j = await res.json()
        notify(j.error || "Lỗi phân công", "err")
      }
    } finally { setAsSubmitting(false) }
  }

  const deleteAssignment = async (id: string) => {
    const res = await fetch(`/api/input-assessment-assignments?id=${id}`, { method: "DELETE" })
    if (res.ok) {
      notify("Đã xóa phân công")
      fetchAssignments()
    }
  }

  // ====================== UI HELPERS ======================
  const selPeriod = periods.find(p => p.id === sPeriodId)
  const asSelPeriod = periods.find(p => p.id === asPeriodId)
  const filtStu = students.filter(s => !sSearch || s.studentCode.toLowerCase().includes(sSearch.toLowerCase()) || s.fullName.toLowerCase().includes(sSearch.toLowerCase()))

  // ====================== RENDER ======================
  return (
    <div className="space-y-4 font-sans max-w-[1600px] mx-auto pb-20">
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
      {confirm && <ConfirmDialog open={true} onClose={()=>setConfirm(null)} onConfirm={confirm.fn} message={confirm.msg}/>}

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
                        {periods.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
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
                <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-black">{assignments.length} bản ghi</span>
             </div>

             <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
                {asLoading ? <Spin/> : assignments.length === 0 ? (
                  <Empty icon={UserPlus} text="Chưa có phân công nào" sub="Sử dụng form bên trên để tiến hành phân công GV"/>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
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
                        {assignments.map(a => (
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
                              <span className="px-3 py-1 bg-white border border-indigo-100 rounded-lg text-xs font-black text-indigo-600 shadow-sm">{a.subject?.name}</span>
                            </td>
                            <td className="p-5">
                              <span className="text-xs font-black text-slate-600">Khối {a.grade}</span>
                            </td>
                            <td className="p-5">
                              <span className="px-2 py-0.5 border border-amber-100 bg-amber-50 text-amber-700 rounded-md text-[10px] font-black uppercase">{a.educationSystem}</span>
                            </td>
                            <td className="p-5 text-right">
                               <button 
                                 onClick={() => setConfirm({ msg: `Xóa phân công của GV ${a.user?.fullName}?`, fn: () => deleteAssignment(a.id) })}
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

          {pLoading ? <Spin/> : (
            <div className="space-y-3">
              {periods.map(p => (
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
                    <div className="flex items-center gap-1.5 opacity-0 group-hover/p:opacity-100 transition-opacity">
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
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {p.batches?.map(b => (
                            <div key={b.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-start justify-between group hover:border-indigo-400 transition-all shadow-sm">
                               <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white">#{b.batchNumber}</div>
                                  <div>
                                    <p className="text-xs font-black text-slate-700">{b.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{b.startDate?.slice(0,10)} - {b.endDate?.slice(0,10)}</p>
                                  </div>
                               </div>
                               <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={()=>openEditBatch(b)} className="p-1.5 text-slate-300 hover:text-indigo-600"><Edit2 className="w-3.5 h-3.5"/></button>
                                  <button onClick={()=>setConfirm({msg:`Xóa đợt "${b.name}"?`,fn:()=>doDeleteBatch(b.id)})} className="p-1.5 text-slate-300 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5"/></button>
                               </div>
                            </div>
                          ))}
                       </div>
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
                             {periods.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                       </Field>
                       <Field label="Đợt khảo sát">
                          <select value={sBatchId} onChange={e=>setSBatchId(e.target.value)} className={inp} disabled={!sPeriodId}>
                             <option value="">-- Tất cả đợt --</option>
                             {selPeriod?.batches?.map(b=><option key={b.id} value={b.id}>Đợt {b.batchNumber}: {b.name}</option>)}
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
                   <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                         <tr>
                            <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã HS KS</th>
                            <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ và Tên</th>
                            <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Khối</th>
                            <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filtStu.map(s => (
                          <tr key={s.id} className="group hover:bg-slate-50/50">
                             <td className="p-5"><span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{s.studentCode}</span></td>
                             <td className="p-5"><span className="text-sm font-black text-slate-700">{s.fullName}</span></td>
                             <td className="p-5 text-center text-xs font-black text-slate-400">{s.grade}</td>
                             <td className="p-5 text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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

      {/* ===== OTHER TABS PLACEHOLDERS ===== */}
      {["mapping", "subjects", "reports"].includes(tab) && (
        <Empty icon={GraduationCap} text="Đang xây dựng" sub="Phần này sẽ sớm được hoàn thiện"/>
      )}

      {/* ============= MODALS ============= */}
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

      <Modal open={bModal} onClose={()=>setBModal(false)} title="Thông tin Đợt khảo sát" size="sm" footer={<><button onClick={()=>setBModal(false)} className="flex-1 py-3 text-xs font-black uppercase text-slate-400">Hủy</button> <button onClick={saveBatch} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-50">Hoàn tất</button></>}>
        <div className="space-y-4">
           <div className="grid grid-cols-2 gap-3"><Field label="Số đợt"><input type="number" value={bForm.batchNumber} onChange={e=>setBForm(f=>({...f,batchNumber:e.target.value}))} className={inp}/></Field><Field label="Trạng thái"><select value={bForm.status} onChange={e=>setBForm(f=>({...f,status:e.target.value}))} className={inp}>{STATUS_OPTS.map(o=><option key={o} value={o}>{STATUS_MAP[o].label}</option>)}</select></Field></div>
           <Field label="Tên đợt" required><input value={bForm.name} onChange={e=>setBForm(f=>({...f,name:e.target.value}))} className={inp}/></Field>
           <div className="grid grid-cols-2 gap-3"><Field label="Từ ngày"><input type="date" value={bForm.startDate} onChange={e=>setBForm(f=>({...f,startDate:e.target.value}))} className={inp}/></Field><Field label="Đến ngày"><input type="date" value={bForm.endDate} onChange={e=>setBForm(f=>({...f,endDate:e.target.value}))} className={inp}/></Field></div>
        </div>
      </Modal>

      <Modal open={sModal} onClose={()=>setSModal(false)} title="Thông tin Học sinh" size="lg" footer={<><button onClick={()=>setSModal(false)} className="flex-1 text-xs font-black uppercase text-slate-400">Đóng</button> <button onClick={saveStudent} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-50">Lưu dữ liệu</button></>}>
        <div className="space-y-4 pt-1">
           <div className="grid grid-cols-2 gap-4"><Field label="Mã HS KS" required><input value={sForm.studentCode} onChange={e=>setSForm(f=>({...f,studentCode:e.target.value}))} className={inp} disabled={!!editS}/></Field><Field label="Ngày sinh"><input type="date" value={sForm.dateOfBirth} onChange={e=>setSForm(f=>({...f,dateOfBirth:e.target.value}))} className={inp}/></Field></div>
           <Field label="Họ và Tên" required><input value={sForm.fullName} onChange={e=>setSForm(f=>({...f,fullName:e.target.value}))} className={inp}/></Field>
           <div className="grid grid-cols-3 gap-4">
              <Field label="Khối"><select value={sForm.grade} onChange={e=>setSForm(f=>({...f,grade:e.target.value}))} className={inp}><option value="">--</option>{grades.map(g=><option key={g} value={g}>{g}</option>)}</select></Field>
              <Field label="Lớp"><input value={sForm.className} onChange={e=>setSForm(f=>({...f,className:e.target.value}))} className={inp}/></Field>
              <Field label="Học kỳ"><input value={sForm.hocKy} onChange={e=>setSForm(f=>({...f,hocKy:e.target.value}))} className={inp}/></Field>
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
    </div>
  )
}

