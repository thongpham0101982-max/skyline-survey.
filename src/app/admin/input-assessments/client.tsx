"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, ChevronDown, ChevronUp, Edit, Trash2, Users, BookOpen, Settings, FileText, CheckCircle, XCircle, Clock, BarChart3, Download, AlertTriangle } from "lucide-react"

// ======================== TYPES ========================
interface AcademicYear { id: string; name: string; status: string }
interface Campus { id: string; campusName: string; campusCode: string }
interface User { id: string; fullName: string }
interface AssessmentSubject { id: string; name: string; code: string; status: string; sortOrder: number }
interface EduSystem { id: string; name: string; code: string }
interface AssessmentConfig { id: string; name: string; categoryType: string; sortOrder: number }
interface Teacher { userId: string; teacherName: string; departmentId?: string }
interface Department { id: string; name: string }

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
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Đang mở", color: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  INACTIVE: { label: "Đóng", color: "bg-slate-100 text-slate-600 border border-slate-200" },
  DRAFT: { label: "Nháp", color: "bg-amber-100 text-amber-700 border border-amber-200" },
  APPROVED: { label: "Đã duyệt", color: "bg-blue-100 text-blue-700 border border-blue-200" },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] || { label: status, color: "bg-gray-100 text-gray-600" }
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.color}`}>{s.label}</span>
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <FileText className="w-10 h-10 mb-3 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ======================== MAIN COMPONENT ========================
export function InputAssessmentsClient({
  academicYears, campuses, examBoardUsers, subjects, eduSystems, grades, configs, teachers, departments
}: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"periods" | "categories" | "subjects" | "configs" | "assignments" | "reports">("periods")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [periods, setPeriods] = useState<InputAssessmentPeriod[]>([])
  const [search, setSearch] = useState("")

  // Period Form
  const [showPeriodForm, setShowPeriodForm] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<InputAssessmentPeriod | null>(null)
  const [periodForm, setPeriodForm] = useState({
    code: "", name: "", academicYearId: "", campusId: "", assignedUserId: "",
    startDate: "", endDate: "", description: "", status: "DRAFT"
  })
  const [periodsLoaded, setPeriodsLoaded] = useState(false)

  const showMessage = useCallback((msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(null) }
    else { setSuccess(msg); setError(null) }
    setTimeout(() => { setError(null); setSuccess(null) }, 4000)
  }, [])

  // ===================== PERIODS TAB =====================
  const loadPeriods = useCallback(async () => {
    if (periodsLoaded) return
    setLoading(true)
    try {
      const res = await fetch("/api/admin/input-assessment-periods")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setPeriods(data.periods || [])
      setPeriodsLoaded(true)
    } catch (e: any) {
      showMessage(`Không tải được danh sách kỳ: ${e.message}`, true)
    } finally {
      setLoading(false)
    }
  }, [periodsLoaded, showMessage])

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab)
    if (tab === "periods" && !periodsLoaded) loadPeriods()
  }

  const openPeriodForm = (period?: InputAssessmentPeriod) => {
    if (period) {
      setEditingPeriod(period)
      setPeriodForm({
        code: period.code, name: period.name, academicYearId: period.academicYearId,
        campusId: period.campusId || "", assignedUserId: period.assignedUserId || "",
        startDate: period.startDate?.slice(0, 10) || "", endDate: period.endDate?.slice(0, 10) || "",
        description: period.description || "", status: period.status
      })
    } else {
      setEditingPeriod(null)
      setPeriodForm({ code: "", name: "", academicYearId: academicYears[0]?.id || "", campusId: "", assignedUserId: "", startDate: "", endDate: "", description: "", status: "DRAFT" })
    }
    setShowPeriodForm(true)
  }

  const savePeriod = async () => {
    if (!periodForm.code || !periodForm.name || !periodForm.academicYearId) {
      showMessage("Vui lòng điền Mã, Tên và Năm học.", true); return
    }
    setLoading(true)
    try {
      const url = editingPeriod ? `/api/admin/input-assessment-periods/${editingPeriod.id}` : "/api/admin/input-assessment-periods"
      const method = editingPeriod ? "PUT" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(periodForm) })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `HTTP ${res.status}`) }
      const data = await res.json()
      if (editingPeriod) {
        setPeriods(p => p.map(x => x.id === editingPeriod.id ? data.period : x))
      } else {
        setPeriods(p => [data.period, ...p])
      }
      setShowPeriodForm(false)
      showMessage(editingPeriod ? "Đã cập nhật kỳ khảo sát." : "Đã tạo kỳ khảo sát mới.")
      router.refresh()
    } catch (e: any) {
      showMessage(`Lỗi: ${e.message}`, true)
    } finally {
      setLoading(false)
    }
  }

  const deletePeriod = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa kỳ khảo sát này?")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/input-assessment-periods/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setPeriods(p => p.filter(x => x.id !== id))
      showMessage("Đã xóa kỳ khảo sát.")
    } catch (e: any) {
      showMessage(`Lỗi xóa: ${e.message}`, true)
    } finally {
      setLoading(false)
    }
  }

  const changeStatus = async (id: string, status: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/input-assessment-periods/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status })
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setPeriods(p => p.map(x => x.id === id ? data.period : x))
      showMessage("Đã cập nhật trạng thái.")
    } catch (e: any) {
      showMessage(`Lỗi: ${e.message}`, true)
    } finally {
      setLoading(false)
    }
  }

  const filteredPeriods = periods.filter(p => {
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
  })

  const tabs = [
    { key: "periods", label: "Kỳ khảo sát", icon: Clock },
    { key: "categories", label: "Danh mục", icon: Settings },
    { key: "subjects", label: "Môn học", icon: BookOpen },
    { key: "assignments", label: "Phân công GV", icon: Users },
    { key: "reports", label: "Tổng hợp KQ", icon: BarChart3 },
  ] as const

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-0 -mb-px overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === key
                  ? "border-blue-600 text-blue-700 bg-blue-50"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ====== PERIODS TAB ====== */}
      {activeTab === "periods" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text" placeholder="Tìm kiếm kỳ khảo sát..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <button
              onClick={() => { openPeriodForm(); setPeriodsLoaded(prev => { if (!prev) loadPeriods(); return prev; }) }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Tạo kỳ mới
            </button>
          </div>

          {/* Period Form Modal */}
          {showPeriodForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800">
                    {editingPeriod ? "Chỉnh sửa kỳ khảo sát" : "Tạo kỳ khảo sát mới"}
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mã kỳ *</label>
                      <input
                        type="text" value={periodForm.code} onChange={e => setPeriodForm(f => ({ ...f, code: e.target.value }))}
                        placeholder="VD: KSNL-2024-HK1" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Năm học *</label>
                      <select value={periodForm.academicYearId} onChange={e => setPeriodForm(f => ({ ...f, academicYearId: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option value="">-- Chọn năm học --</option>
                        {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tên kỳ khảo sát *</label>
                    <input
                      type="text" value={periodForm.name} onChange={e => setPeriodForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="VD: KSNL Đầu vào HK1 2024-2025" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cơ sở</label>
                      <select value={periodForm.campusId} onChange={e => setPeriodForm(f => ({ ...f, campusId: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option value="">-- Tất cả cơ sở --</option>
                        {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Người phụ trách</label>
                      <select value={periodForm.assignedUserId} onChange={e => setPeriodForm(f => ({ ...f, assignedUserId: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option value="">-- Chọn người phụ trách --</option>
                        {examBoardUsers.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ngày bắt đầu</label>
                      <input type="date" value={periodForm.startDate} onChange={e => setPeriodForm(f => ({ ...f, startDate: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ngày kết thúc</label>
                      <input type="date" value={periodForm.endDate} onChange={e => setPeriodForm(f => ({ ...f, endDate: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Trạng thái</label>
                    <select value={periodForm.status} onChange={e => setPeriodForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="DRAFT">Nháp</option>
                      <option value="ACTIVE">Đang mở</option>
                      <option value="INACTIVE">Đóng</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ghi chú</label>
                    <textarea value={periodForm.description} onChange={e => setPeriodForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Mô tả thêm về kỳ khảo sát..." className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                </div>
                <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
                  <button onClick={() => setShowPeriodForm(false)} className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">Hủy</button>
                  <button onClick={savePeriod} disabled={loading} className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
                    {loading ? "Đang lưu..." : editingPeriod ? "Cập nhật" : "Tạo kỳ"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Periods List */}
          {loading && !periods.length ? (
            <LoadingSpinner />
          ) : !periodsLoaded ? (
            <div className="text-center py-16">
              <button onClick={loadPeriods} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors">
                Tải danh sách kỳ khảo sát
              </button>
            </div>
          ) : filteredPeriods.length === 0 ? (
            <EmptyState message="Không có kỳ khảo sát nào." />
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Mã / Tên kỳ</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Năm học</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Thời gian</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Trạng thái</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPeriods.map(period => {
                    const ay = academicYears.find(a => a.id === period.academicYearId)
                    return (
                      <tr key={period.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-800 text-sm">{period.name}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{period.code}</div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">{ay?.name || "-"}</td>
                        <td className="px-4 py-4 text-sm text-slate-500 hidden md:table-cell">
                          {period.startDate ? `${period.startDate.slice(0, 10)} → ${period.endDate?.slice(0, 10) || "..."}` : "Chưa đặt"}
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={period.status}
                            onChange={e => changeStatus(period.id, e.target.value)}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="DRAFT">Nháp</option>
                            <option value="ACTIVE">Đang mở</option>
                            <option value="INACTIVE">Đóng</option>
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 justify-end">
                            <button onClick={() => openPeriodForm(period)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => deletePeriod(period.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ====== CATEGORIES TAB ====== */}
      {activeTab === "categories" && (
        <CategoriesTab showMessage={showMessage} />
      )}

      {/* ====== SUBJECTS TAB ====== */}
      {activeTab === "subjects" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-700">Danh sách môn học đánh giá</h2>
          </div>
          {subjects.length === 0 ? (
            <EmptyState message="Chưa có môn học nào. Vui lòng kiểm tra cấu hình database." />
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Mã môn</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tên môn học</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subjects.map((sub, i) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-sm text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-600">{sub.code}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{sub.name}</td>
                      <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ====== ASSIGNMENTS TAB ====== */}
      {activeTab === "assignments" && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-700">Phân công Giáo viên thực hiện đánh giá</h2>
          {departments.length === 0 && teachers.length === 0 ? (
            <EmptyState message="Chưa có dữ liệu giáo viên hoặc bộ môn." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {departments.map(dept => {
                const deptTeachers = teachers.filter(t => t.departmentId === dept.id)
                return (
                  <div key={dept.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      {dept.name}
                      <span className="ml-auto text-xs text-slate-400">{deptTeachers.length} GV</span>
                    </h3>
                    {deptTeachers.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">Chưa phân công</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {deptTeachers.map(t => (
                          <li key={t.userId} className="flex items-center gap-2 text-sm text-slate-700 py-1 px-2 rounded-lg hover:bg-slate-50">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                              {t.teacherName?.[0] || "?"}
                            </div>
                            {t.teacherName}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ====== REPORTS TAB ====== */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-700">Tổng hợp kết quả đánh giá</h2>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
            <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Tổng hợp kết quả</h3>
            <p className="text-slate-500 text-sm mb-6">Chọn kỳ khảo sát và bộ lọc để xem báo cáo tổng hợp kết quả KSNL đầu vào.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <select className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Chọn kỳ khảo sát --</option>
                {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Chọn cơ sở --</option>
                {campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
              </select>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors">
                <Download className="w-4 h-4" /> Xuất báo cáo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ======================== CATEGORIES SUB-COMPONENT ========================
function CategoriesTab({ showMessage }: { showMessage: (msg: string, isError?: boolean) => void }) {
  const router = useRouter()
  const [categories, setCategories] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ name: "", code: "", type: "ACADEMIC", description: "", sortOrder: 0, status: "ACTIVE" })

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/input-assessments/categories")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setCategories(data.categories || [])
      setLoaded(true)
    } catch (e: any) {
      showMessage(`Không tải được danh mục: ${e.message}`, true)
    } finally {
      setLoading(false)
    }
  }

  const openForm = (cat?: any) => {
    if (cat) {
      setEditing(cat)
      setForm({ name: cat.name, code: cat.code, type: cat.type || "ACADEMIC", description: cat.description || "", sortOrder: cat.sortOrder || 0, status: cat.status || "ACTIVE" })
    } else {
      setEditing(null)
      setForm({ name: "", code: "", type: "ACADEMIC", description: "", sortOrder: 0, status: "ACTIVE" })
    }
    setShowForm(true)
  }

  const save = async () => {
    if (!form.name || !form.code) { showMessage("Vui lòng nhập Mã và Tên danh mục.", true); return }
    setLoading(true)
    try {
      const url = editing ? `/api/admin/input-assessments/categories/${editing.id}` : "/api/admin/input-assessments/categories"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `HTTP ${res.status}`) }
      const data = await res.json()
      if (editing) { setCategories(c => c.map(x => x.id === editing.id ? data.category : x)) }
      else { setCategories(c => [...c, data.category]) }
      setShowForm(false)
      showMessage(editing ? "Đã cập nhật danh mục." : "Đã tạo danh mục mới.")
      router.refresh()
    } catch (e: any) {
      showMessage(`Lỗi: ${e.message}`, true)
    } finally {
      setLoading(false)
    }
  }

  const del = async (id: string) => {
    if (!confirm("Xóa danh mục này?")) return
    const res = await fetch(`/api/admin/input-assessments/categories/${id}`, { method: "DELETE" })
    if (res.ok) { setCategories(c => c.filter(x => x.id !== id)); showMessage("Đã xóa danh mục.") }
    else showMessage("Lỗi xóa danh mục.", true)
  }

  if (!loaded) return (
    <div className="text-center py-16">
      <button onClick={load} disabled={loading} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors">
        {loading ? "Đang tải..." : "Tải danh sách danh mục"}
      </button>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-700">Danh mục đánh giá</h2>
        <button onClick={() => openForm()} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Thêm danh mục
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">{editing ? "Chỉnh sửa danh mục" : "Thêm danh mục"}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mã *</label>
                  <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Loại</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="ACADEMIC">Học lực</option>
                    <option value="CONDUCT">Hạnh kiểm</option>
                    <option value="PSYCHOLOGY">Tâm lý</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tên danh mục *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Thứ tự</label>
                  <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Trạng thái</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="INACTIVE">Tắt</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mô tả</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">Hủy</button>
              <button onClick={save} disabled={loading} className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
                {loading ? "Đang lưu..." : editing ? "Cập nhật" : "Thêm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {categories.length === 0 ? (
        <EmptyState message="Chưa có danh mục nào." />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Mã</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tên danh mục</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Loại</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">T.Tự</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Trạng thái</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map(cat => (
                <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-slate-600">{cat.code}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">{cat.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{cat.type}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{cat.sortOrder}</td>
                  <td className="px-4 py-3"><StatusBadge status={cat.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openForm(cat)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => del(cat.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
