"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Plus, Search, Edit, Trash2, Users, Settings, Clock, BarChart3,
  Upload, Layers, Database, UserCheck, Calendar, X, Check, AlertCircle,
  ChevronDown, ChevronUp, Loader2, BookOpen, ArrowRight, GraduationCap
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
  { code: "DIEN_KS", label: "Diện Khảo sát" },
  { code: "HINH_THUC_KS", label: "Hình thức KS" },
  { code: "HS_CT_QUOC_TE", label: "Hồ sơ CT Quốc tế" },
  { code: "HOC_KY", label: "Học kỳ" },
  { code: "KQGD_TIEU_HOC", label: "KQGD Tiểu học" },
  { code: "KQ_HOC_TAP", label: "Kết quả Học tập" },
  { code: "KQ_REN_LUYEN", label: "Kết quả Rèn luyện" },
  { code: "LOAI_TUYEN_SINH", label: "Loại Tuyển sinh" },
]
const STATUS_OPTIONS = ["ACTIVE", "DRAFT", "CLOSED"]
const STATUS_LABELS: Record<string,string> = { ACTIVE: "Đang mở", DRAFT: "Bản nháp", CLOSED: "Kết thúc", INACTIVE: "Không hoạt động" }
const STATUS_CLASSES: Record<string,string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  DRAFT: "bg-amber-100 text-amber-700 border-amber-200",
  CLOSED: "bg-red-100 text-red-700 border-red-200",
  INACTIVE: "bg-slate-100 text-slate-500 border-slate-200",
}

function Badge({ status }: { status: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${STATUS_CLASSES[status]||STATUS_CLASSES.INACTIVE}`}>{STATUS_LABELS[status]||status}</span>
}

function Spinner() {
  return <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin"/></div>
}

function EmptyState({ icon: Icon, message, sub }: { icon: any; message: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-slate-50 p-5 rounded-full mb-4"><Icon className="w-10 h-10 text-slate-300"/></div>
      <p className="font-black text-slate-500">{message}</p>
      {sub && <p className="text-xs text-slate-400 mt-1 max-w-xs">{sub}</p>}
    </div>
  )
}

// ========= MODAL WRAPPER =========
function Modal({ open, onClose, title, children, footer }: { open:boolean; onClose:()=>void; title:string; children:React.ReactNode; footer:React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl flex-shrink-0">
          <h2 className="text-base font-black text-slate-800">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors"><X className="w-4 h-4"/></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl flex-shrink-0 flex gap-3">{footer}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all placeholder:text-slate-300"

// ========= MAIN COMPONENT =========
export function InputAssessmentsClient({ academicYears, campuses, examBoardUsers, subjects: subjectsList, configs: initialConfigs, grades, teachers }: Props) {
  const [activeTab, setActiveTab] = useState("periods")
  const [selectedYearId, setSelectedYearId] = useState(academicYears[0]?.id || "")

  // ---- PERIODS ----
  const [periods, setPeriods] = useState<Period[]>([])
  const [periodsLoading, setPeriodsLoading] = useState(false)
  const [isPeriodOpen, setIsPeriodOpen] = useState(false)
  const [editingPeriodId, setEditingPeriodId] = useState<string|null>(null)
  const [expandedPeriod, setExpandedPeriod] = useState<string|null>(null)
  const defaultPeriodForm = { code:"", name:"", campusId:"", assignedUserId:"", startDate:"", endDate:"", description:"", status:"ACTIVE" }
  const [periodForm, setPeriodForm] = useState(defaultPeriodForm)

  // ---- BATCHES ----
  const [isBatchOpen, setIsBatchOpen] = useState(false)
  const [batchPeriodId, setBatchPeriodId] = useState("")
  const [editingBatchId, setEditingBatchId] = useState<string|null>(null)
  const defaultBatchForm = { batchNumber:"", name:"", startDate:"", endDate:"", status:"ACTIVE" }
  const [batchForm, setBatchForm] = useState(defaultBatchForm)

  // ---- STUDENTS ----
  const [students, setStudents] = useState<Student[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [selectedPeriodId, setSelectedPeriodId] = useState("")
  const [selectedBatchId, setSelectedBatchId] = useState("")
  const [studentSearch, setStudentSearch] = useState("")
  const [importing, setImporting] = useState(false)
  const [isStudentOpen, setIsStudentOpen] = useState(false)
  const [editingStudentId, setEditingStudentId] = useState<string|null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const defaultStudentForm = { studentCode:"", fullName:"", dateOfBirth:"", grade:"", admissionCriteria:"", className:"", hocKy:"", kqgdTieuHoc:"", kqHocTap:"", kqRenLuyen:"", targetType:"", surveySystem:"" }
  const [studentForm, setStudentForm] = useState(defaultStudentForm)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])

  // ---- CONFIGS ----
  const [configs, setConfigs] = useState<AssessmentConfig[]>(initialConfigs)
  const [configsLoading, setConfigsLoading] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [editingConfigId, setEditingConfigId] = useState<string|null>(null)
  const defaultConfigForm = { categoryType:"DIEN_KS", code:"", name:"" }
  const [configForm, setConfigForm] = useState(defaultConfigForm)

  // ---- TOAST ----
  const [toast, setToast] = useState<{msg:string, type:"ok"|"err"}|null>(null)
  const showToast = (msg:string, type:"ok"|"err"="ok") => {
    setToast({msg, type})
    setTimeout(() => setToast(null), 3500)
  }

  const err = (res:any) => showToast(res.error || "Có lỗi xảy ra", "err")

  // ===================== FETCH =====================
  const fetchPeriods = useCallback(async () => {
    if (!selectedYearId) return
    setPeriodsLoading(true)
    try {
      const res = await fetch(`/api/input-assessments?academicYearId=${selectedYearId}`)
      if (res.ok) {
        const data = await res.json()
        setPeriods(data)
        if (data.length > 0 && !selectedPeriodId) setSelectedPeriodId(data[0].id)
      }
    } catch(e) { console.error(e) }
    finally { setPeriodsLoading(false) }
  }, [selectedYearId, selectedPeriodId])

  const fetchStudents = useCallback(async () => {
    if (!selectedPeriodId) return
    setStudentsLoading(true)
    try {
      let url = `/api/input-assessment-students?periodId=${selectedPeriodId}`
      if (selectedBatchId) url += `&batchId=${selectedBatchId}`
      const res = await fetch(url)
      if (res.ok) setStudents(await res.json())
    } catch(e) { console.error(e) }
    finally { setStudentsLoading(false) }
  }, [selectedPeriodId, selectedBatchId])

  const fetchConfigs = useCallback(async () => {
    setConfigsLoading(true)
    try {
      const res = await fetch("/api/assessment-configs")
      if (res.ok) setConfigs(await res.json())
    } catch(e) { console.error(e) }
    finally { setConfigsLoading(false) }
  }, [])

  useEffect(() => { fetchPeriods() }, [fetchPeriods])
  useEffect(() => { if (activeTab === "students" && selectedPeriodId) fetchStudents() }, [activeTab, fetchStudents])
  useEffect(() => { if (activeTab === "categories") fetchConfigs() }, [activeTab, fetchConfigs])

  // ===================== PERIOD CRUD =====================
  const openCreatePeriod = () => {
    setEditingPeriodId(null)
    setPeriodForm(defaultPeriodForm)
    setIsPeriodOpen(true)
  }
  const openEditPeriod = (p: Period) => {
    setEditingPeriodId(p.id)
    setPeriodForm({ code:p.code||"", name:p.name||"", campusId:p.campusId||"", assignedUserId:p.assignedUserId||"", startDate:p.startDate?.slice(0,10)||"", endDate:p.endDate?.slice(0,10)||"", description:p.description||"", status:p.status||"ACTIVE" })
    setIsPeriodOpen(true)
  }
  const savePeriod = async () => {
    if (!periodForm.code.trim() || !periodForm.name.trim()) return showToast("Cần nhập Mã và Tên kỳ", "err")
    const payload = {
      action: editingPeriodId ? "UPDATE_PERIOD" : "CREATE_PERIOD",
      id: editingPeriodId,
      data: { ...periodForm, academicYearId: selectedYearId }
    }
    const res = await fetch("/api/input-assessments", { method: editingPeriodId?"PUT":"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) })
    const json = await res.json()
    if (res.ok) { setIsPeriodOpen(false); fetchPeriods(); showToast(editingPeriodId ? "Đã cập nhật kỳ khảo sát" : "Đã tạo kỳ khảo sát mới") }
    else err(json)
  }
  const deletePeriod = async (id: string) => {
    if (!confirm("Xóa kỳ khảo sát này sẽ xóa toàn bộ dữ liệu liên quan. Tiếp tục?")) return
    const res = await fetch(`/api/input-assessments?type=period&id=${id}`, { method:"DELETE" })
    if (res.ok) { fetchPeriods(); showToast("Đã xóa kỳ khảo sát") }
  }

  // ===================== BATCH CRUD =====================
  const openCreateBatch = (periodId: string) => {
    setBatchPeriodId(periodId)
    setEditingBatchId(null)
    setBatchForm(defaultBatchForm)
    setIsBatchOpen(true)
  }
  const openEditBatch = (b: Batch) => {
    setBatchPeriodId(b.periodId)
    setEditingBatchId(b.id)
    setBatchForm({ batchNumber:String(b.batchNumber), name:b.name, startDate:b.startDate?.slice(0,10)||"", endDate:b.endDate?.slice(0,10)||"", status:b.status })
    setIsBatchOpen(true)
  }
  const saveBatch = async () => {
    if (!batchForm.name.trim() || !batchForm.startDate || !batchForm.endDate) return showToast("Cần nhập Tên, Ngày bắt đầu, Ngày kết thúc", "err")
    const payload = {
      action: editingBatchId ? "UPDATE_BATCH" : "CREATE_BATCH",
      id: editingBatchId,
      data: { ...batchForm, periodId: batchPeriodId, batchNumber: parseInt(batchForm.batchNumber)||1 }
    }
    const res = await fetch("/api/input-assessments", { method: editingBatchId?"PUT":"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) })
    const json = await res.json()
    if (res.ok) { setIsBatchOpen(false); fetchPeriods(); showToast(editingBatchId ? "Đã cập nhật đợt" : "Đã tạo đợt khảo sát") }
    else err(json)
  }
  const deleteBatch = async (id: string) => {
    if (!confirm("Xóa đợt khảo sát này?")) return
    const res = await fetch(`/api/input-assessments?type=batch&id=${id}`, { method:"DELETE" })
    if (res.ok) { fetchPeriods(); showToast("Đã xóa đợt") }
  }

  // ===================== STUDENT CRUD =====================
  const openCreateStudent = () => {
    setEditingStudentId(null)
    setStudentForm(defaultStudentForm)
    setIsStudentOpen(true)
  }
  const openEditStudent = (s: Student) => {
    setEditingStudentId(s.id)
    setStudentForm({ studentCode:s.studentCode, fullName:s.fullName, dateOfBirth:s.dateOfBirth?.slice(0,10)||"", grade:s.grade||"", admissionCriteria:s.admissionCriteria||"", className:s.className||"", hocKy:s.hocKy||"", kqgdTieuHoc:s.kqgdTieuHoc||"", kqHocTap:s.kqHocTap||"", kqRenLuyen:s.kqRenLuyen||"", targetType:s.targetType||"", surveySystem:s.surveySystem||"" })
    setIsStudentOpen(true)
  }
  const saveStudent = async () => {
    if (!studentForm.studentCode.trim() || !studentForm.fullName.trim()) return showToast("Cần nhập Mã HS và Họ tên", "err")
    if (editingStudentId) {
      const res = await fetch("/api/input-assessment-students", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id: editingStudentId, data: studentForm }) })
      const json = await res.json()
      if (res.ok) { setIsStudentOpen(false); fetchStudents(); showToast("Đã cập nhật thông tin học sinh") }
      else err(json)
    } else {
      const res = await fetch("/api/input-assessment-students", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"CREATE", data:{ ...studentForm, periodId: selectedPeriodId, batchId: selectedBatchId||null } }) })
      const json = await res.json()
      if (res.ok) { setIsStudentOpen(false); fetchStudents(); showToast("Đã thêm học sinh") }
      else err(json)
    }
  }
  const deleteStudent = async (id: string) => {
    if (!confirm("Xóa học sinh này?")) return
    const res = await fetch(`/api/input-assessment-students?id=${id}`, { method:"DELETE" })
    if (res.ok) { fetchStudents(); showToast("Đã xóa") }
  }
  const deleteSelectedStudents = async () => {
    if (selectedStudentIds.length === 0) return
    if (!confirm(`Xóa ${selectedStudentIds.length} học sinh đã chọn?`)) return
    const res = await fetch(`/api/input-assessment-students?ids=${selectedStudentIds.join(",")}`, { method:"DELETE" })
    if (res.ok) { setSelectedStudentIds([]); fetchStudents(); showToast(`Đã xóa ${selectedStudentIds.length} học sinh`) }
  }
  const toggleStudent = (id:string) => setSelectedStudentIds(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id])
  const filteredStudents = students.filter(s => {
    if (!studentSearch) return true
    const q = studentSearch.toLowerCase()
    return (s.studentCode||"").toLowerCase().includes(q) || (s.fullName||"").toLowerCase().includes(q)
  })

  // ===================== EXCEL IMPORT =====================
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedPeriodId) return
    setImporting(true)
    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval:"" })
      const mapped = rows.map((row) => ({
        studentCode: String(row["Ma_HS_KS"] || row["Mã HS KS"] || row["MaHS"] || row["studentCode"] || "").trim(),
        fullName: String(row["Ho ten"] || row["Họ tên"] || row["HoTen"] || row["fullName"] || "").trim(),
        dateOfBirth: (() => {
          const v = row["Ngay sinh"] || row["Ngày sinh"] || row["NgaySinh"] || row["dateOfBirth"]
          if (!v) return ""
          if (typeof v === "number") {
            const d = (XLSX as any).SSF?.parse_date_code?.(v)
            return d ? `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}` : ""
          }
          return String(v).trim()
        })(),
        grade: String(row["Khoi"] || row["Khối"] || row["Khối KS"] || row["grade"] || "").trim(),
        admissionCriteria: String(row["Dien KS"] || row["Diện KS"] || row["He hoc"] || row["Hệ học"] || row["admissionCriteria"] || "").trim(),
        className: String(row["Lop"] || row["Lớp"] || row["className"] || "").trim(),
        hocKy: String(row["Hoc ky"] || row["Học kỳ"] || row["hocKy"] || "").trim(),
        kqHocTap: String(row["KQ Hoc tap"] || row["KQ học tập"] || row["kqHocTap"] || "").trim(),
        kqRenLuyen: String(row["KQ Ren luyen"] || row["KQ rèn luyện"] || row["kqRenLuyen"] || "").trim(),
        periodId: selectedPeriodId,
        batchId: selectedBatchId || null
      })).filter(r => r.studentCode && r.fullName)

      if (mapped.length === 0) throw new Error("Không tìm thấy dữ liệu hợp lệ. Cần cột: Ma_HS_KS, Ho ten")

      const res = await fetch("/api/input-assessment-students", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ action:"BULK_CREATE", data: mapped })
      })
      const result = await res.json()
      if (result.success) {
        showToast(`Import thành công: ${result.created}/${mapped.length} học sinh`)
        fetchStudents()
      } else throw new Error(result.error || "Unknown error")
    } catch(err: any) { showToast("Lỗi import: " + err.message, "err") }
    finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // ===================== CATEGORY CRUD =====================
  const openCreateConfig = (categoryType: string) => {
    setEditingConfigId(null)
    setConfigForm({ ...defaultConfigForm, categoryType })
    setIsConfigOpen(true)
  }
  const openEditConfig = (c: AssessmentConfig) => {
    setEditingConfigId(c.id)
    setConfigForm({ categoryType: c.categoryType, code: c.code, name: c.name })
    setIsConfigOpen(true)
  }
  const saveConfig = async () => {
    if (!configForm.code.trim() || !configForm.name.trim()) return showToast("Cần nhập Mã và Tên", "err")
    if (editingConfigId) {
      const res = await fetch("/api/assessment-configs", { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id: editingConfigId, name: configForm.name, code: configForm.code }) })
      const json = await res.json()
      if (res.ok) { setIsConfigOpen(false); fetchConfigs(); showToast("Đã cập nhật danh mục") }
      else err(json)
    } else {
      const res = await fetch("/api/assessment-configs", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(configForm) })
      const json = await res.json()
      if (res.ok) { setIsConfigOpen(false); fetchConfigs(); showToast("Đã thêm danh mục") }
      else err(json)
    }
  }
  const deleteConfig = async (id: string) => {
    if (!confirm("Xóa danh mục này?")) return
    const res = await fetch(`/api/assessment-configs?id=${id}`, { method:"DELETE" })
    if (res.ok) { fetchConfigs(); showToast("Đã xóa danh mục") }
  }

  // ===================== RENDER =====================
  const selectedPeriod = periods.find(p => p.id === selectedPeriodId)

  return (
    <div className="space-y-5">
      {/* TOAST */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl font-bold text-sm animate-in slide-in-from-top-2 duration-300 ${toast.type==="ok" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.type==="ok" ? <Check className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-100">
            <Database className="w-5 h-5 text-white"/>
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800">Hệ thống Đánh giá KSNL Đầu vào</h1>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Quản lý toàn diện · CRUD đầy đủ</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
          <Calendar className="w-4 h-4 text-slate-400"/>
          <select value={selectedYearId} onChange={e=>{setSelectedYearId(e.target.value); setSelectedPeriodId(""); setStudents([])}} className="bg-transparent text-sm font-bold text-slate-700 outline-none">
            {academicYears.map(ay => <option key={ay.id} value={ay.id}>Năm học {ay.name}</option>)}
          </select>
        </div>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        {[
          { id:"periods", label:"Kỳ & Đợt KS", icon:Clock },
          { id:"students", label:"Danh sách HS", icon:Users },
          { id:"categories", label:"Danh mục", icon:Settings },
          { id:"subjects", label:"Gán Môn học", icon:BookOpen },
          { id:"assignments", label:"Phân công GV", icon:UserCheck },
          { id:"reports", label:"Kết quả tổng hợp", icon:BarChart3 },
        ].map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab===t.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-[1.02]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}>
            <t.icon className={`w-4 h-4 ${activeTab===t.id?"text-white":"text-slate-400"}`}/>
            {t.label}
          </button>
        ))}
      </div>

      {/* ============ TAB: PERIODS ============ */}
      {activeTab === "periods" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-700 flex items-center gap-2"><Clock className="w-5 h-5 text-indigo-500"/> Kỳ & Đợt Khảo sát</h2>
            <button onClick={openCreatePeriod} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
              <Plus className="w-4 h-4"/> Tạo Kỳ mới
            </button>
          </div>

          {periodsLoading ? <Spinner/> : periods.length === 0 ? (
            <EmptyState icon={Clock} message="Chưa có kỳ khảo sát nào" sub="Chọn năm học và nhấn 'Tạo Kỳ mới' để bắt đầu"/>
          ) : (
            <div className="space-y-4">
              {periods.map(period => (
                <div key={period.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Period Row */}
                  <div className="p-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-shrink">
                      <div className="flex-shrink-0 bg-indigo-50 p-3 rounded-xl">
                        <Clock className="w-5 h-5 text-indigo-600"/>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-800 text-base">{period.name}</span>
                          <Badge status={period.status}/>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">{period.code}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wide flex-wrap">
                          {period.startDate && <span>Từ: {period.startDate?.slice(0,10)}</span>}
                          {period.endDate && <span>→ {period.endDate?.slice(0,10)}</span>}
                          {period.batches && <span className="text-indigo-500">{period.batches.length} đợt</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={()=>openCreateBatch(period.id)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all">
                        <Plus className="w-3.5 h-3.5"/> Thêm Đợt
                      </button>
                      <button onClick={()=>openEditPeriod(period)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100">
                        <Edit className="w-4 h-4"/>
                      </button>
                      <button onClick={()=>deletePeriod(period.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                      <button onClick={()=>setExpandedPeriod(expandedPeriod===period.id?null:period.id)} className="p-2 text-slate-300 hover:text-slate-600 rounded-xl transition-all">
                        {expandedPeriod===period.id ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                      </button>
                    </div>
                  </div>

                  {/* Batches Expanded */}
                  {expandedPeriod === period.id && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Các Đợt trong Kỳ</p>
                      {period.batches && period.batches.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {period.batches.map(batch => (
                            <div key={batch.id} className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-indigo-200 transition-all group">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-[11px] font-black text-white">#{batch.batchNumber}</div>
                                <div>
                                  <div className="text-xs font-black text-slate-700">{batch.name}</div>
                                  <div className="text-[10px] text-slate-400 font-medium">{batch.startDate?.slice(0,10)} → {batch.endDate?.slice(0,10)}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={()=>openEditBatch(batch)} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit className="w-3.5 h-3.5"/></button>
                                <button onClick={()=>deleteBatch(batch.id)} className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5"/></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                          <Layers className="w-8 h-8 text-slate-200 mb-2"/>
                          <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Chưa có đợt nào</p>
                          <button onClick={()=>openCreateBatch(period.id)} className="mt-3 text-xs text-indigo-600 font-bold hover:underline">+ Tạo đợt đầu tiên</button>
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

      {/* ============ TAB: STUDENTS ============ */}
      {activeTab === "students" && (
        <div className="space-y-5">
          {/* Filters & Actions */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-end gap-4">
            <Field label="Kỳ khảo sát">
              <select value={selectedPeriodId} onChange={e=>{setSelectedPeriodId(e.target.value); setSelectedBatchId(""); setStudents([])}} className={inputCls}>
                <option value="">-- Chọn Kỳ --</option>
                {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Đợt (Batch)">
              <select value={selectedBatchId} onChange={e=>setSelectedBatchId(e.target.value)} className={inputCls} disabled={!selectedPeriodId}>
                <option value="">-- Tất cả đợt --</option>
                {selectedPeriod?.batches?.map(b => <option key={b.id} value={b.id}>Đợt {b.batchNumber}: {b.name}</option>)}
              </select>
            </Field>
            <div className="flex-1 min-w-[240px]">
              <Field label="Tìm kiếm học sinh">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                  <input type="text" value={studentSearch} onChange={e=>setStudentSearch(e.target.value)} placeholder="Mã HS hoặc họ tên..." className={inputCls + " pl-10"}/>
                </div>
              </Field>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchStudents} disabled={!selectedPeriodId} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-900 disabled:opacity-50">
                <Search className="w-4 h-4"/> Tải dữ liệu
              </button>
              <button onClick={openCreateStudent} disabled={!selectedPeriodId} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50">
                <Plus className="w-4 h-4"/> Thêm HS
              </button>
              <button onClick={()=>fileInputRef.current?.click()} disabled={!selectedPeriodId||importing} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-50">
                <Upload className="w-4 h-4"/> {importing?"Đang import...":"Import Excel"}
              </button>
              <input type="file" ref={fileInputRef} accept=".xlsx,.xls" className="hidden" onChange={handleExcelImport}/>
            </div>
          </div>

          {/* Bulk actions bar */}
          {selectedStudentIds.length > 0 && (
            <div className="bg-indigo-600 text-white px-5 py-3 rounded-2xl flex items-center justify-between">
              <span className="font-bold text-sm">Đã chọn {selectedStudentIds.length} học sinh</span>
              <div className="flex items-center gap-3">
                <button onClick={deleteSelectedStudents} className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold"><Trash2 className="w-4 h-4"/> Xóa đã chọn</button>
                <button onClick={()=>setSelectedStudentIds([])} className="text-sm font-bold text-white/70 hover:text-white">Bỏ chọn</button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {studentsLoading ? <Spinner/> : filteredStudents.length === 0 ? (
              <EmptyState icon={Users} message="Không có học sinh" sub={selectedPeriodId ? "Nhấn 'Tải dữ liệu' hoặc import từ Excel" : "Chọn kỳ khảo sát trước"}/>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="p-4 w-10">
                        <input type="checkbox" className="rounded" onChange={e => setSelectedStudentIds(e.target.checked ? filteredStudents.map(s=>s.id) : [])} checked={selectedStudentIds.length===filteredStudents.length && filteredStudents.length>0}/>
                      </th>
                      {["Mã HS", "Họ tên", "Ngày sinh", "Khối", "Hệ học (Diện KS)", "Học kỳ", "KQ Học tập", "KQ Rèn luyện", "Thao tác"].map(h => (
                        <th key={h} className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-4"><input type="checkbox" className="rounded" checked={selectedStudentIds.includes(s.id)} onChange={()=>toggleStudent(s.id)}/></td>
                        <td className="p-4"><span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{s.studentCode}</span></td>
                        <td className="p-4 font-bold text-slate-800 whitespace-nowrap">{s.fullName}</td>
                        <td className="p-4 text-[11px] text-slate-500 whitespace-nowrap">{s.dateOfBirth?.slice(0,10) || "—"}</td>
                        <td className="p-4 text-xs font-bold text-slate-500">{s.grade || "—"}</td>
                        <td className="p-4 text-xs text-slate-600">{s.admissionCriteria || "—"}</td>
                        <td className="p-4 text-xs text-slate-600">{s.hocKy || "—"}</td>
                        <td className="p-4 text-xs text-slate-600">{s.kqHocTap || "—"}</td>
                        <td className="p-4 text-xs text-slate-600">{s.kqRenLuyen || "—"}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={()=>openEditStudent(s)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit className="w-3.5 h-3.5"/></button>
                            <button onClick={()=>deleteStudent(s.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5"/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="text-xs font-bold text-slate-400 ml-1">Tổng số: {filteredStudents.length} học sinh</p>
        </div>
      )}

      {/* ============ TAB: CATEGORIES ============ */}
      {activeTab === "categories" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-700 flex items-center gap-2"><Settings className="w-5 h-5 text-amber-500"/> Danh mục Đánh giá</h2>
          </div>
          {configsLoading ? <Spinner/> : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {CATEGORY_TYPES.map(type => {
                const group = configs.filter(c => c.categoryType === type.code)
                return (
                  <div key={type.code} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{type.code}</p>
                        <p className="text-sm font-black text-slate-700">{type.label}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-black">{group.length}</span>
                        <button onClick={()=>openCreateConfig(type.code)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Plus className="w-4 h-4"/></button>
                      </div>
                    </div>
                    <div className="p-4 flex-1 space-y-2 min-h-[100px]">
                      {group.length === 0 && <p className="text-center text-xs text-slate-300 font-bold py-6 uppercase tracking-widest">Chưa có</p>}
                      {group.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-amber-100 hover:bg-amber-50 group transition-all">
                          <div>
                            <p className="text-xs font-bold text-slate-700">{c.name}</p>
                            <p className="text-[10px] font-mono text-slate-400 uppercase">{c.code}</p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={()=>openEditConfig(c)} className="p-1.5 text-slate-300 hover:text-indigo-600 rounded-lg transition-all"><Edit className="w-3.5 h-3.5"/></button>
                            <button onClick={()=>deleteConfig(c.id)} className="p-1.5 text-slate-300 hover:text-red-600 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5"/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ============ PLACEHOLDERS ============ */}
      {(activeTab === "subjects" || activeTab === "assignments" || activeTab === "reports") && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <EmptyState icon={GraduationCap} message="Đang phát triển" sub="Tính năng này sẽ sớm được hoàn thiện và cập nhật."/>
        </div>
      )}

      {/* ============ PERIOD MODAL ============ */}
      <Modal open={isPeriodOpen} onClose={()=>setIsPeriodOpen(false)} title={editingPeriodId ? "Sửa Kỳ khảo sát" : "Tạo Kỳ khảo sát mới"} footer={<>
        <button onClick={()=>setIsPeriodOpen(false)} className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50">Hủy</button>
        <button onClick={savePeriod} className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100">
          {editingPeriodId ? "Lưu thay đổi" : "Tạo Kỳ"}
        </button>
      </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mã Kỳ *">
              <input value={periodForm.code} onChange={e=>setPeriodForm(f=>({...f, code:e.target.value.toUpperCase()}))} placeholder="KSNL_2024_HK1" className={inputCls}/>
            </Field>
            <Field label="Trạng thái">
              <select value={periodForm.status} onChange={e=>setPeriodForm(f=>({...f, status:e.target.value}))} className={inputCls}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Tên Kỳ khảo sát *">
            <input value={periodForm.name} onChange={e=>setPeriodForm(f=>({...f, name:e.target.value}))} placeholder="Kỳ Đánh giá KSNL Đầu vào 2024 - HK1" className={inputCls}/>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ngày bắt đầu">
              <input type="date" value={periodForm.startDate} onChange={e=>setPeriodForm(f=>({...f, startDate:e.target.value}))} className={inputCls}/>
            </Field>
            <Field label="Ngày kết thúc">
              <input type="date" value={periodForm.endDate} onChange={e=>setPeriodForm(f=>({...f, endDate:e.target.value}))} className={inputCls}/>
            </Field>
          </div>
          <Field label="Cơ sở">
            <select value={periodForm.campusId} onChange={e=>setPeriodForm(f=>({...f, campusId:e.target.value}))} className={inputCls}>
              <option value="">-- Tất cả cơ sở --</option>
              {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
            </select>
          </Field>
          <Field label="Người phụ trách">
            <select value={periodForm.assignedUserId} onChange={e=>setPeriodForm(f=>({...f, assignedUserId:e.target.value}))} className={inputCls}>
              <option value="">-- Chưa gán --</option>
              {examBoardUsers.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </Field>
          <Field label="Ghi chú">
            <textarea rows={2} value={periodForm.description} onChange={e=>setPeriodForm(f=>({...f, description:e.target.value}))} placeholder="Mô tả kỳ khảo sát..." className={inputCls + " resize-none"}/>
          </Field>
        </div>
      </Modal>

      {/* ============ BATCH MODAL ============ */}
      <Modal open={isBatchOpen} onClose={()=>setIsBatchOpen(false)} title={editingBatchId ? "Sửa Đợt khảo sát" : "Tạo Đợt khảo sát"} footer={<>
        <button onClick={()=>setIsBatchOpen(false)} className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50">Hủy</button>
        <button onClick={saveBatch} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100">
          {editingBatchId ? "Lưu thay đổi" : "Tạo Đợt"}
        </button>
      </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Số đợt">
              <input type="number" min={1} value={batchForm.batchNumber} onChange={e=>setBatchForm(f=>({...f, batchNumber:e.target.value}))} placeholder="1" className={inputCls}/>
            </Field>
            <Field label="Trạng thái">
              <select value={batchForm.status} onChange={e=>setBatchForm(f=>({...f, status:e.target.value}))} className={inputCls}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Tên Đợt *">
            <input value={batchForm.name} onChange={e=>setBatchForm(f=>({...f, name:e.target.value}))} placeholder="Đợt 1 - Tháng 9/2024" className={inputCls}/>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ngày bắt đầu *">
              <input type="date" value={batchForm.startDate} onChange={e=>setBatchForm(f=>({...f, startDate:e.target.value}))} className={inputCls}/>
            </Field>
            <Field label="Ngày kết thúc *">
              <input type="date" value={batchForm.endDate} onChange={e=>setBatchForm(f=>({...f, endDate:e.target.value}))} className={inputCls}/>
            </Field>
          </div>
        </div>
      </Modal>

      {/* ============ STUDENT MODAL ============ */}
      <Modal open={isStudentOpen} onClose={()=>setIsStudentOpen(false)} title={editingStudentId ? "Sửa thông tin Học sinh" : "Thêm Học sinh mới"} footer={<>
        <button onClick={()=>setIsStudentOpen(false)} className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50">Hủy</button>
        <button onClick={saveStudent} className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100">
          {editingStudentId ? "Lưu thay đổi" : "Thêm"}
        </button>
      </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mã HS KS *">
              <input value={studentForm.studentCode} onChange={e=>setStudentForm(f=>({...f, studentCode:e.target.value}))} placeholder="HS_001" className={inputCls} disabled={!!editingStudentId}/>
            </Field>
            <Field label="Ngày sinh">
              <input type="date" value={studentForm.dateOfBirth} onChange={e=>setStudentForm(f=>({...f, dateOfBirth:e.target.value}))} className={inputCls}/>
            </Field>
          </div>
          <Field label="Họ và Tên *">
            <input value={studentForm.fullName} onChange={e=>setStudentForm(f=>({...f, fullName:e.target.value}))} placeholder="Nguyễn Văn A" className={inputCls}/>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Khối KS">
              <select value={studentForm.grade} onChange={e=>setStudentForm(f=>({...f, grade:e.target.value}))} className={inputCls}>
                <option value="">-- Chọn Khối --</option>
                {grades.map(g => <option key={g} value={g}>Khối {g}</option>)}
              </select>
            </Field>
            <Field label="Lớp">
              <input value={studentForm.className} onChange={e=>setStudentForm(f=>({...f, className:e.target.value}))} placeholder="1A" className={inputCls}/>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Diện KS (Hệ học)">
              <input value={studentForm.admissionCriteria} onChange={e=>setStudentForm(f=>({...f, admissionCriteria:e.target.value}))} placeholder="Diện KS" className={inputCls}/>
            </Field>
            <Field label="Học kỳ">
              <input value={studentForm.hocKy} onChange={e=>setStudentForm(f=>({...f, hocKy:e.target.value}))} placeholder="HK1 / HK2" className={inputCls}/>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="KQ Học tập">
              <input value={studentForm.kqHocTap} onChange={e=>setStudentForm(f=>({...f, kqHocTap:e.target.value}))} placeholder="Giỏi / Khá..." className={inputCls}/>
            </Field>
            <Field label="KQ Rèn luyện">
              <input value={studentForm.kqRenLuyen} onChange={e=>setStudentForm(f=>({...f, kqRenLuyen:e.target.value}))} placeholder="Tốt / Khá..." className={inputCls}/>
            </Field>
          </div>
        </div>
      </Modal>

      {/* ============ CATEGORY MODAL ============ */}
      <Modal open={isConfigOpen} onClose={()=>setIsConfigOpen(false)} title={editingConfigId ? "Sửa Danh mục" : "Thêm giá trị Danh mục"} footer={<>
        <button onClick={()=>setIsConfigOpen(false)} className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50">Hủy</button>
        <button onClick={saveConfig} className="flex-1 py-3 bg-amber-600 text-white rounded-2xl font-bold text-sm hover:bg-amber-700 shadow-lg shadow-amber-100">
          {editingConfigId ? "Lưu thay đổi" : "Thêm"}
        </button>
      </>}>
        <div className="space-y-4">
          <Field label="Loại Danh mục">
            <select value={configForm.categoryType} onChange={e=>setConfigForm(f=>({...f, categoryType:e.target.value}))} className={inputCls} disabled={!!editingConfigId}>
              {CATEGORY_TYPES.map(t => <option key={t.code} value={t.code}>{t.label} ({t.code})</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mã *">
              <input value={configForm.code} onChange={e=>setConfigForm(f=>({...f, code:e.target.value.toUpperCase()}))} placeholder="VD: CONG_LAP" className={inputCls}/>
            </Field>
            <Field label="Tên hiển thị *">
              <input value={configForm.name} onChange={e=>setConfigForm(f=>({...f, name:e.target.value}))} placeholder="VD: Trường Công lập" className={inputCls}/>
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  )
}
