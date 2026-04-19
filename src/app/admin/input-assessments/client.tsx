"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { 
  Plus, Search, Edit, Trash2, Users, BookOpen, Settings, FileText, 
  CheckCircle, XCircle, Clock, BarChart3, Download, AlertTriangle, 
  ChevronRight, Filter, Upload, FileDown, Layers, LayoutGrid, Database,
  GraduationCap, UserCheck, Calendar, Lock, Unlock, Mail, Phone, Info
} from "lucide-react"
import * as XLSX from "xlsx"

// ======================== TYPES ========================
interface AcademicYear { id: string; name: string; status: string }
interface Campus { id: string; campusName: string; campusCode: string }
interface User { id: string; fullName: string }
interface AssessmentSubject { id: string; name: string; code: string; status: string; sortOrder: number }
interface EduSystem { id: string; name: string; code: string }
interface AssessmentConfig { id: string; name: string; categoryType: string; sortOrder: number; code: string; academicYearId?: string }
interface Teacher { userId: string; teacherName: string; departmentId?: string }
interface Department { id: string; name: string }

interface InputAssessmentBatch {
  id: string
  periodId: string
  batchNumber: number
  name: string
  startDate: string
  endDate: string
  status: string
}

interface InputAssessmentPeriod {
  id: string
  code: string
  name: string
  academicYearId: string
  campusId?: string
  assignedUserId?: string
  startDate?: string
  endDate?: string
  description?: string
  status: string
  batches?: InputAssessmentBatch[]
}

interface InputAssessmentStudent {
  id: string
  studentCode: string
  fullName: string
  dateOfBirth?: string
  grade?: string
  admissionCriteria?: string
  className?: string
  surveySystem?: string
  targetType?: string
  surveyFormType?: string
  hocKy?: string
  kqgdTieuHoc?: string
  kqHocTap?: string
  kqRenLuyen?: string
  mathScore?: number
  literatureScore?: number
  englishScore?: number
  psychologyScore?: number
  admissionResult?: string
  batchId?: string
  periodId: string
}

interface Props {
  academicYears: AcademicYear[]
  campuses: Campus[]
  examBoardUsers: User[]
  subjects: AssessmentSubject[]
  eduSystems: EduSystem[]
  grades: string[]
  configs: AssessmentConfig[]
  teachers: Teacher[]
  departments: Department[]
}

// ======================== HELPERS ========================
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  INACTIVE: "bg-slate-100 text-slate-600 border-slate-200",
  DRAFT: "bg-amber-100 text-amber-700 border-amber-200",
  CLOSED: "bg-red-100 text-red-700 border-red-200",
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Đang mở",
  INACTIVE: "Đóng",
  DRAFT: "Bản nháp",
  CLOSED: "Kết thúc",
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${STATUS_COLORS[status] || STATUS_COLORS.INACTIVE}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

// ======================== MAIN COMPONENT ========================
export function InputAssessmentsClient({
  academicYears, campuses, examBoardUsers, subjects: subjectsList, eduSystems, grades, configs: initialConfigs, teachers, departments
}: Props) {
  // Tabs: periods | categories | mappings | students | results
  const [activeTab, setActiveTab] = useState<string>("periods")
  const [loading, setLoading] = useState(false)
  const [periods, setPeriods] = useState<InputAssessmentPeriod[]>([])
  const [selectedYearId, setSelectedYearId] = useState<string>(academicYears[0]?.id || "")
  
  // Selection States for Sub-tabs
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("")
  const [selectedBatchId, setSelectedBatchId] = useState<string>("")
  
  // Form States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState<"period" | "batch" | "category" | "student" | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Data for lists
  const [students, setStudents] = useState<InputAssessmentStudent[]>([])
  const [configs, setConfigs] = useState<AssessmentConfig[]>(initialConfigs)
  const [mappings, setMappings] = useState<any[]>([])

  // UI States
  const [search, setSearch] = useState("")
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ===================== FETCH LOGIC =====================
  const fetchPeriods = useCallback(async () => {
    if (!selectedYearId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/input-assessments?academicYearId=${selectedYearId}`)
      if (res.ok) {
        const data = await res.json()
        setPeriods(data)
        if (data.length > 0 && !selectedPeriodId) setSelectedPeriodId(data[0].id)
      }
    } catch (e) {
      console.error("Fetch Periods Error:", e)
    } finally {
      setLoading(false)
    }
  }, [selectedYearId, selectedPeriodId])

  const fetchStudents = useCallback(async () => {
    if (!selectedPeriodId) return
    try {
      let url = `/api/input-assessment-students?periodId=${selectedPeriodId}`
      if (selectedBatchId) url += `&batchId=${selectedBatchId}`
      const res = await fetch(url)
      if (res.ok) setStudents(await res.json())
    } catch (e) { console.error(e) }
  }, [selectedPeriodId, selectedBatchId])

  const fetchMappings = useCallback(async () => {
    try {
      const res = await fetch("/api/grade-subject-mappings")
      if (res.ok) setMappings(await res.json())
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { fetchPeriods() }, [fetchPeriods])
  useEffect(() => { if (activeTab === "students") fetchStudents() }, [activeTab, fetchStudents])
  useEffect(() => { if (activeTab === "mappings") fetchMappings() }, [activeTab, fetchMappings])

  // ===================== FORM HANDLERS =====================
  const [periodForm, setPeriodForm] = useState({
    code: "", name: "", academicYearId: "", campusId: "", assignedUserId: "",
    startDate: "", endDate: "", description: "", status: "ACTIVE"
  })

  const [batchForm, setBatchForm] = useState({
    periodId: "", batchNumber: 1, name: "", startDate: "", endDate: "", status: "ACTIVE"
  })

  const savePeriod = async () => {
    if (!periodForm.code || !periodForm.name) return alert("Vui lòng nhập Mã và Tên")
    const payload = {
      action: editingId ? "UPDATE_PERIOD" : "CREATE_PERIOD",
      id: editingId,
      data: { ...periodForm, academicYearId: selectedYearId }
    }
    const res = await fetch("/api/input-assessments", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    if (res.ok) {
      setIsModalOpen(false)
      fetchPeriods()
    } else {
      const err = await res.json()
      alert(err.error || "Có lỗi xảy ra")
    }
  }

  const deleteItem = async (type: "period" | "batch", id: string) => {
    if (!confirm(`Bạn có chắc muốn xóa ${type === "period" ? "kỳ" : "đợt"} này?`)) return
    const res = await fetch(`/api/input-assessments?type=${type}&id=${id}`, { method: "DELETE" })
    if (res.ok) fetchPeriods()
  }

  // ===================== IMPORT LOGIC =====================
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedPeriodId) return
    setImporting(true)
    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" })
      
      const mapped = rows.map((row: any) => ({
        studentCode: String(row["Ma_HS_KS"] || row["Mã HS"] || "").trim(),
        fullName: String(row["Ho ten"] || row["Họ tên"] || "").trim(),
        dateOfBirth: row["Ngay sinh"] || row["Ngày sinh"],
        grade: String(row["Khoi"] || row["Khối"] || "").trim(),
        admissionCriteria: String(row["He hoc"] || row["Hệ học"] || "").trim(),
        periodId: selectedPeriodId,
        batchId: selectedBatchId || null
      })).filter(r => r.studentCode && r.fullName)

      if (mapped.length === 0) throw new Error("Không tìm thấy dữ liệu hợp lệ (Cần cột: Ma_HS_KS, Ho ten)")

      const res = await fetch("/api/input-assessment-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "BULK_CREATE", data: mapped })
      })
      const result = await res.json()
      alert(`Đã import thành công ${result.created} học sinh.`)
      fetchStudents()
    } catch (err: any) {
      alert("Lỗi import: " + err.message)
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // ===================== RENDERERS =====================
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header & Year Filter */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-100">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Cổng Quản trị Tuyển sinh</h1>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Hệ thống Đánh giá KSNL Đầu vào</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
          <Calendar className="w-4 h-4 text-slate-400 ml-2" />
          <select 
            value={selectedYearId} 
            onChange={e => setSelectedYearId(e.target.value)}
            className="bg-transparent text-sm font-bold text-slate-700 outline-none pr-4 py-1"
          >
            {academicYears.map(ay => <option key={ay.id} value={ay.id}>Năm học {ay.name}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto whitespace-nowrap">
        {[
          { id: "periods", label: "Kỳ & Đợt khảo sát", icon: Clock },
          { id: "mappings", label: "Gán Môn - Khối", icon: Layers },
          { id: "categories", label: "Danh mục Đánh giá", icon: Settings },
          { id: "students", label: "Danh sách Học sinh", icon: Users },
          { id: "assignments", label: "Phân công GV", icon: UserCheck },
          { id: "reports", label: "Kết quả Tổng hợp", icon: BarChart3 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 scale-105" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "text-white" : "text-slate-400"}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="min-h-[600px] animate-in fade-in slide-in-from-bottom-2 duration-500">
        {activeTab === "periods" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" /> Quản lý Kỳ & Đợt khảo sát
              </h2>
              <button 
                onClick={() => { setEditingId(null); setModalType("period"); setIsModalOpen(true) }}
                className="btn-primary flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                <Plus className="w-4 h-4" /> Tạo Kỳ khảo sát
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {periods.map(period => (
                <div key={period.id} className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all overflow-hidden flex flex-col">
                  {/* Period Header */}
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 group-hover:bg-indigo-50/30 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{period.code}</span>
                        <h3 className="text-base font-black text-slate-800 leading-tight">{period.name}</h3>
                      </div>
                      <StatusBadge status={period.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
                      <div className="flex items-center gap-2"><Calendar className="w-3 h-3"/> {period.startDate || "Chưa đặt"}</div>
                      <div className="flex items-center gap-2"><UserCheck className="w-3 h-3"/> {period.assignedUserId ? "Có người phụ trách" : "Chưa gán"}</div>
                    </div>
                  </div>

                  {/* Batches Sub-list */}
                  <div className="p-5 flex-1 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Các Đợt khảo sát</span>
                      <button 
                        onClick={() => { setEditingId(null); setBatchForm(f => ({...f, periodId: period.id})); setModalType("batch"); setIsModalOpen(true)}}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 px-2 py-1 rounded-lg"
                      >
                        + Thêm đợt
                      </button>
                    </div>
                    {period.batches && period.batches.length > 0 ? (
                      <div className="space-y-2">
                        {period.batches.map(batch => (
                          <div key={batch.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 group/batch hover:border-indigo-100 hover:bg-white transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-white shadow-sm border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 uppercase">
                                #{batch.batchNumber}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-700">{batch.name}</div>
                                <div className="text-[10px] text-slate-400 font-medium">{batch.startDate} → {batch.endDate}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-batch-hover:opacity-100 transition-opacity">
                              <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg"><Edit className="w-3.5 h-3.5"/></button>
                              <button onClick={() => deleteItem("batch", batch.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5"/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center">
                        <Layers className="w-8 h-8 text-slate-200 mb-2" />
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Chưa có đợt</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <button className="text-[11px] font-black text-slate-400 uppercase hover:text-indigo-600 transition-colors decoration-dotted underline underline-offset-4">Chi tiết cấu hình</button>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => deleteItem("period", period.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "categories" && (
          <div className="space-y-6">
             <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-500" /> Danh mục Cấu hình
              </h2>
              <button 
                onClick={() => { setModalType("category"); setIsModalOpen(true) }}
                className="btn-primary flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-all shadow-lg"
              >
                <Plus className="w-4 h-4" /> Thêm Danh mục
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {["DIEN_KS", "HINH_THUC_KS", "HS_CT_QUOC_TE", "KQGD_TIEU_HOC", "KQ_HOC_TAP", "KQ_REN_LUYEN", "LOAI_TUYEN_SINH"].map(type => {
                const groupConfigs = configs.filter(c => c.categoryType === type)
                return (
                  <div key={type} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{type.replace(/_/g, " ")}</span>
                      <span className="text-[10px] bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-bold">{groupConfigs.length}</span>
                    </div>
                    <div className="p-4 flex-1 space-y-2">
                       {groupConfigs.length > 0 ? groupConfigs.map(c => (
                         <div key={c.code} className="flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-amber-100 hover:bg-amber-50 group transition-all">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-700">{c.name}</span>
                              <span className="text-[10px] font-mono text-slate-400 uppercase">{c.code}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="p-1 px-1.5 text-slate-300 hover:text-amber-600"><Edit className="w-3 h-3"/></button>
                              <button className="p-1 px-1.5 text-slate-300 hover:text-red-600"><Trash2 className="w-3 h-3"/></button>
                            </div>
                         </div>
                       )) : <div className="text-center py-6 text-slate-300 text-[10px] uppercase font-bold tracking-widest">Chưa có dữ liệu</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === "students" && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-6">
              <div className="flex flex-wrap items-center gap-4 flex-1">
                <div className="flex flex-col gap-1 min-w-[200px]">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kỳ khảo sát</label>
                  <select 
                    value={selectedPeriodId} 
                    onChange={e => setSelectedPeriodId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="">-- Chọn Kỳ --</option>
                    {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1 min-w-[160px]">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Đợt (Batch)</label>
                  <select 
                    value={selectedBatchId} 
                    onChange={e => setSelectedBatchId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="">-- Tất cả đợt --</option>
                    {periods.find(p => p.id === selectedPeriodId)?.batches?.map(b => (
                      <option key={b.id} value={b.id}>Đợt {b.batchNumber}: {b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1 flex-1 min-w-[300px]">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tìm kiếm nhanh</label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" placeholder="Tên học sinh hoặc Mã định danh..."
                      value={search} onChange={e => setSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!selectedPeriodId || importing}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" /> {importing ? "Đang import..." : "Import Excel"}
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleExcelImport} />
                
                <button 
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-900 transition-all shadow-lg shadow-slate-200"
                >
                  <Plus className="w-4 h-4" /> Thêm HS
                </button>
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ma HS KS</th>
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ và Tên</th>
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày sinh</th>
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Khối</th>
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hệ học (Diện KS)</th>
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kết quả Tuyển sinh</th>
                      <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.length > 0 ? students.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-4"><span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{s.studentCode}</span></td>
                        <td className="p-4"><span className="text-sm font-black text-slate-700">{s.fullName}</span></td>
                        <td className="p-4 text-[11px] font-bold text-slate-500">{s.dateOfBirth?.slice(0, 10)}</td>
                        <td className="p-4 text-xs font-black text-slate-400">{s.grade}</td>
                        <td className="p-4 text-xs font-bold text-slate-600">{s.admissionCriteria}</td>
                        <td className="p-4">
                           {s.admissionResult ? (
                             <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${s.admissionResult === "DA_DAT" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                               {s.admissionResult === "DA_DAT" ? "Trúng tuyển" : "Không đạt"}
                             </span>
                           ) : <span className="text-[10px] font-bold text-slate-300 italic">Chưa có KQ</span>}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl border border-transparent hover:border-indigo-100 shadow-sm transition-all"><Edit className="w-4 h-4" /></button>
                            <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl border border-transparent hover:border-red-100 shadow-sm transition-all"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={7} className="p-20 text-center">
                          <div className="flex flex-col items-center opacity-20">
                            <Users className="w-16 h-16 mb-4" />
                            <p className="font-black text-xl uppercase tracking-widest">Danh sách trống</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Missing Tabs Content Placeholder */}
        {(activeTab === "mappings" || activeTab === "assignments" || activeTab === "reports") && (
           <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-20 text-center flex flex-col items-center justify-center">
              <div className="bg-slate-50 p-6 rounded-full mb-6">
                <LayoutGrid className="w-12 h-12 text-slate-300" />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Chức năng đang được tích hợp</h3>
              <p className="text-slate-500 max-w-md mx-auto">Chúng tôi đang hoàn thiện giao diện cho phần này để đảm bảo trải nghiệm quản trị tốt nhất cho quý đối tác.</p>
           </div>
        )}
      </div>

      {/* Basic Period Modal */}
      {isModalOpen && modalType === "period" && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-800">{editingId ? "Cập nhật Kỳ khảo sát" : "Tạo Kỳ khảo sát mới"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">✕</button>
            </div>
            
            <div className="p-8 space-y-5">
               <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã Kỳ *</label>
                    <input 
                      type="text" value={periodForm.code} onChange={e => setPeriodForm(f => ({...f, code: e.target.value.toUpperCase()}))}
                      placeholder="VD: KSNL_2024_HK1" className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Điểm bắt đầu</label>
                    <select 
                      value={periodForm.campusId} onChange={e => setPeriodForm(f => ({...f, campusId: e.target.value}))}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="">-- Chọn Cơ sở --</option>
                      {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                    </select>
                  </div>
               </div>

               <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên Kỳ khảo sát *</label>
                  <input 
                    type="text" value={periodForm.name} onChange={e => setPeriodForm(f => ({...f, name: e.target.value}))}
                    placeholder="VD: Kỳ đánh giá KSNL Đầu vào 2024 - Đợt 1" className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-200"
                  />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngày bắt đầu</label>
                    <input type="date" value={periodForm.startDate} onChange={e => setPeriodForm(f => ({...f, startDate: e.target.value}))} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngày kết thúc</label>
                    <input type="date" value={periodForm.endDate} onChange={e => setPeriodForm(f => ({...f, endDate: e.target.value}))} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                  </div>
               </div>

               <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ghi chú / Mô tả</label>
                  <textarea 
                    rows={3} value={periodForm.description} onChange={e => setPeriodForm(f => ({...f, description: e.target.value}))}
                    placeholder="Thông tin bổ sung về kỳ khảo sát..." className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none resize-none"
                  />
               </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
               <button onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-white transition-all">Hủy</button>
               <button onClick={savePeriod} className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                 {editingId ? "Cập nhật Kỳ" : "Hoàn tất tạo Kỳ"}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Other Modals (Batch, Category, Student) would go here following the same design language */}
    </div>
  )
}
