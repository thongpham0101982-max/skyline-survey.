"use client"
import { useState, useRef } from "react"
import {
  Plus, Trash2, Edit2, Check, X, Upload, Download,
  Key, GraduationCap, Search, Users, UserCheck, Building2, Mail,
  Filter, RefreshCw, ShieldCheck, AlertCircle
} from "lucide-react"
import {
  createTeacherAction, updateTeacherAction, deleteTeacherAction,
  importTeachersAction, resetTeacherPasswordAction
} from "./actions"

const EMPTY_NEW = {
  teacherCode: "", teacherName: "",
  email: "", phone: "",
  dateOfBirth: "", department: "", mainSubject: "", campus: "",
  additionalCampusIds: []
}
const EMPTY_EDIT = { teacherName: "", dateOfBirth: "", department: "", mainSubject: "", campusId: "", status: "ACTIVE", email: "", additionalCampusIds: [] }

const DEPT_COLORS = {
  "KT&DBCL": "bg-[#00A19A]/5 text-[#00A19A] border-[#00A19A]/30",
  "KT-DBCL": "bg-[#00A19A]/5 text-[#00A19A] border-[#00A19A]/30",
  "default": "bg-slate-50 text-slate-700 border-slate-300"
}
function getDeptColor(dept) { return DEPT_COLORS[dept] || DEPT_COLORS["default"] }

function StatusBadge({ status }) {
  if (status === "ACTIVE") return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300 uppercase tracking-wide">
      <span className="w-1.5 h-1.5 rounded-none bg-emerald-500 animate-pulse" />Đang dạy
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-[11px] font-black bg-rose-50 text-rose-800 border border-rose-300 uppercase tracking-wide">
      <span className="w-1.5 h-1.5 rounded-none bg-rose-500" />Nghỉ dạy
    </span>
  )
}

export function TeacherManagerClient({ 
  initialTeachers, years, defaultYearId, classes, departments, subjects, campuses, isCampusLocked = false, defaultCampusId = null 
}) {
  const [teachers, setTeachers] = useState(initialTeachers)
  const [search, setSearch] = useState("")
  const [filterDepartment, setFilterDepartment] = useState("")
  const [filterSubject, setFilterSubject] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_EDIT)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newForm, setNewForm] = useState(() => {
    if (isCampusLocked && defaultCampusId) {
      const campusName = (campuses || []).find((c) => c.id === defaultCampusId)?.campusName || ""
      return { ...EMPTY_NEW, campus: campusName }
    }
    return EMPTY_NEW
  })
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const fileInputRef = useRef(null)

  const displayed = teachers.filter((t) => {
    let match = true
    if (search) {
      const q = search.toLowerCase()
      match = match && (t.teacherName.toLowerCase().includes(q) || t.teacherCode.toLowerCase().includes(q) || (t.campus || "").toLowerCase().includes(q))
    }
    if (filterDepartment) match = match && t.department === filterDepartment
    if (filterSubject) match = match && t.mainSubject === filterSubject
    if (filterStatus) match = match && t.status === filterStatus
    return match
  })

  const activeCount = teachers.filter((t) => t.status === "ACTIVE").length
  const inactiveCount = teachers.filter((t) => t.status !== "ACTIVE").length

  const handleCreate = async () => {
    if (!newForm.teacherCode.trim() || !newForm.teacherName.trim()) { setErrorMsg("Vui lòng nhập Mã GV và Họ và tên!"); return }
    setSaving(true); setErrorMsg("")
    try {
      const selectedCampus = (campuses || []).find((c) => c.campusName === newForm.campus)
      await createTeacherAction({ ...newForm, campusId: selectedCampus?.id })
      setTeachers([...teachers, {
        id: "temp_" + Date.now(), teacherCode: newForm.teacherCode, teacherName: newForm.teacherName,
        dateOfBirth: newForm.dateOfBirth || null,
        department: (departments || []).find((d) => d.name === newForm.department)?.name || newForm.department || null,
        mainSubject: (subjects || []).find((s) => s.subjectName === newForm.mainSubject)?.subjectName || newForm.mainSubject || null,
        campus: selectedCampus?.campusName || null, campusId: selectedCampus?.id || null,
        additionalCampuses: (campuses || []).filter((c) => newForm.additionalCampusIds?.includes(c.id)).map((c) => ({ id: c.id, campusName: c.campusName })),
        additionalCampusIds: newForm.additionalCampusIds || [], homeroomClass: null,
        email: newForm.email || null, phone: newForm.phone || null,
        status: "ACTIVE", user: { email: newForm.teacherCode, status: "ACTIVE" }
      }])
      setNewForm(EMPTY_NEW); setShowAddForm(false)
      setSuccessMsg("Đã tạo giáo viên và tài khoản đăng nhập thành công!")
      setTimeout(() => setSuccessMsg(""), 4000)
    } catch(e) { setErrorMsg(e.message || "Có lỗi xảy ra!") }
    setSaving(false)
  }

  const handleEdit = (t) => {
    setEditingId(t.id)
    setEditForm({
      teacherName: t.teacherName,
      dateOfBirth: t.dateOfBirth ? new Date(t.dateOfBirth).toISOString().split("T")[0] : "",
      department: t.department || "", mainSubject: t.mainSubject || "",
      campusId: t.campusId || "", status: t.status || "ACTIVE",
      email: t.email || "", additionalCampusIds: t.additionalCampusIds || []
    })
  }

  const handleSaveEdit = async (id) => {
    setSaving(true); setErrorMsg("")
    try {
      await updateTeacherAction({ id, ...editForm })
      setTeachers(teachers.map((t) => t.id === id ? {
        ...t, teacherName: editForm.teacherName, dateOfBirth: editForm.dateOfBirth || null,
        department: editForm.department || null, mainSubject: editForm.mainSubject || null,
        campusId: editForm.campusId || null, email: editForm.email || null,
        campus: (campuses || []).find((c) => c.id === editForm.campusId)?.campusName || null,
        additionalCampuses: (campuses || []).filter((c) => editForm.additionalCampusIds?.includes(c.id)).map((c) => ({ id: c.id, campusName: c.campusName })),
        additionalCampusIds: editForm.additionalCampusIds || [], status: editForm.status
      } : t))
      setEditingId(null)
      setSuccessMsg("Đã lưu thay đổi thành công!")
      setTimeout(() => setSuccessMsg(""), 3000)
    } catch(e) { setErrorMsg("Lỗi khi lưu: " + (e.message || "Vui lòng thử lại!")) }
    setSaving(false)
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Xóa giáo viên "${name}"?\nTài khoản đăng nhập cũng sẽ bị xóa.`)) return
    try {
      await deleteTeacherAction(id)
      setTeachers(teachers.filter((t) => t.id !== id))
      setSuccessMsg(`Đã xóa giáo viên ${name}.`)
      setTimeout(() => setSuccessMsg(""), 3000)
    } catch(e) { setErrorMsg("Lỗi khi xóa: " + e.message) }
  }

  const handleResetPassword = async (id, code, name) => {
    if (!confirm(`Reset mật khẩu của "${name}" về: ${code}?`)) return
    try {
      await resetTeacherPasswordAction(id)
      setSuccessMsg(`Đã reset mật khẩu của ${name} về: ${code}`)
      setTimeout(() => setSuccessMsg(""), 4000)
    } catch(e) {}
  }

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!defaultYearId) { setErrorMsg("Không tìm thấy năm học đang hoạt động!"); return }
    setImporting(true); setImportResult(null); setErrorMsg("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/admin/teachers/import", { method: "POST", body: formData })
      const parsed = await res.json()
      if (!parsed.success) { setErrorMsg(parsed.error || "Lỗi đọc file"); setImporting(false); return }
      const result = await importTeachersAction(parsed.data, defaultYearId)
      setImportResult(result)
      if (result.created > 0) {
        setSuccessMsg(`Import thành công: ${result.created} giáo viên, bỏ qua ${result.skipped}`)
        setTimeout(() => { setSuccessMsg(""); window.location.reload() }, 2000)
      }
    } catch(e) { setErrorMsg("Lỗi xử lý file") }
    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const downloadTemplate = () => {
    const csv = "STT,Ma GV,Ho va ten,Ngay sinh,To chuyen mon,Mon Day\n1,GV001,Nguyen Van A,15/05/1985,To Tu Nhien,Toan"
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "danh_sach_giao_vien.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  const hasFilters = search || filterDepartment || filterSubject || filterStatus

  return (
    <div className="space-y-6">

      {/* Toast */}
      {errorMsg && (
        <div className="flex items-center gap-2.5 bg-red-50 border-l-4 border-red-500 border-t border-r border-b border-red-200 text-red-850 rounded-none px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-650" />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="ml-auto text-red-400 hover:text-red-655 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2.5 bg-emerald-50 border-l-4 border-emerald-500 border-t border-r border-b border-emerald-200 text-emerald-800 rounded-none px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-slate-350 rounded-none p-4 flex items-center gap-4 hover:border-[#00A19A] transition-all duration-200 shadow-sm">
          <div className="w-12 h-12 rounded-none bg-[#00A19A] flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800 leading-none">{teachers.length}</p>
            <p className="text-xs text-slate-500 mt-1.5 uppercase tracking-wider font-bold">Tổng giáo viên</p>
          </div>
        </div>
        <div className="bg-white border-2 border-slate-355 rounded-none p-4 flex items-center gap-4 hover:border-emerald-500 transition-all duration-200 shadow-sm">
          <div className="w-12 h-12 rounded-none bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800 leading-none">{activeCount}</p>
            <p className="text-xs text-slate-500 mt-1.5 uppercase tracking-wider font-bold">Đang hoạt động</p>
          </div>
        </div>
        <div className="bg-white border-2 border-slate-355 rounded-none p-4 flex items-center gap-4 hover:border-violet-500 transition-all duration-200 shadow-sm">
          <div className="w-12 h-12 rounded-none bg-violet-500 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800 leading-none">{(departments || []).length}</p>
            <p className="text-xs text-slate-500 mt-1.5 uppercase tracking-wider font-bold">Tổ chuyên môn</p>
          </div>
        </div>
        <div className="bg-white border-2 border-slate-355 rounded-none p-4 flex items-center gap-4 hover:border-amber-500 transition-all duration-200 shadow-sm">
          <div className="w-12 h-12 rounded-none bg-amber-500 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800 leading-none">{displayed.length}</p>
            <p className="text-xs text-slate-500 mt-1.5 uppercase tracking-wider font-bold">Đang hiển thị</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-2 border-slate-355 rounded-none p-4 space-y-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Tìm tên, mã GV, cơ sở..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 border-2 border-slate-300 rounded-none text-sm focus:border-[#00A19A] outline-none transition-all bg-white font-medium focus:ring-0" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655"><X className="w-4 h-4" /></button>}
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-start lg:justify-end">
            <button onClick={downloadTemplate} className="flex items-center gap-1.5 px-4 py-2.5 border-2 border-slate-300 rounded-none text-slate-700 hover:bg-slate-50 hover:border-slate-400 text-sm font-bold transition-all cursor-pointer">
              <Download className="w-4 h-4" /><span>Tải mẫu</span>
            </button>
            <label className="flex items-center gap-1.5 px-4 py-2.5 border-2 border-[#00A19A] bg-[#00A19A]/5 rounded-none text-[#00A19A] hover:bg-[#00A19A]/15 text-sm font-black cursor-pointer transition-all">
              <Upload className="w-4 h-4" />{importing ? "Đang xử lý..." : "Import Excel"}
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileImport} className="hidden" disabled={importing} />
            </label>
            <button onClick={() => { setShowAddForm(true); setErrorMsg("") }}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[#00A19A] hover:bg-[#135E5B] text-white rounded-none text-sm font-black transition-all active:scale-95 whitespace-nowrap cursor-pointer shadow-none">
              <Plus className="w-4 h-4" />Thêm GV Mới
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t-2 border-slate-200">
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mr-2"><Filter className="w-3.5 h-3.5" />Bộ lọc:</span>
          <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)}
            className={`border-2 rounded-none px-3 py-1.5 text-xs font-bold outline-none bg-white transition-all cursor-pointer ${filterDepartment ? "border-[#00A19A] text-[#00A19A] bg-[#00A19A]/5" : "border-slate-300 text-slate-700 focus:border-[#00A19A]"}`}>
            <option value="">Tất cả Tổ CM</option>
            {(departments || []).map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
            className={`border-2 rounded-none px-3 py-1.5 text-xs font-bold outline-none bg-white transition-all cursor-pointer ${filterSubject ? "border-[#00A19A] text-[#00A19A] bg-[#00A19A]/5" : "border-slate-300 text-slate-700 focus:border-[#00A19A]"}`}>
            <option value="">Tất cả Môn dạy</option>
            {(subjects || []).map((s) => <option key={s.id} value={s.subjectName}>{s.subjectName}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className={`border-2 rounded-none px-3 py-1.5 text-xs font-bold outline-none bg-white transition-all cursor-pointer ${filterStatus ? "border-[#00A19A] text-[#00A19A] bg-[#00A19A]/5" : "border-slate-300 text-slate-700 focus:border-[#00A19A]"}`}>
            <option value="">Tất cả Trạng thái</option>
            <option value="ACTIVE">Đang dạy</option>
            <option value="INACTIVE">Nghỉ dạy</option>
          </select>
          {hasFilters && (
            <button onClick={() => { setSearch(""); setFilterDepartment(""); setFilterSubject(""); setFilterStatus("") }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 border-2 border-red-200 rounded-none bg-red-50/50 hover:bg-red-50 hover:border-red-400 transition-all cursor-pointer">
              <RefreshCw className="w-3 h-3" />Xóa lọc
            </button>
          )}
          <span className="ml-auto text-xs text-slate-500 font-bold">{displayed.length}/{teachers.length} giáo viên</span>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white border-2 border-[#00A19A] rounded-none p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5 pb-3 border-b-2 border-slate-200">
            <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-none bg-[#00A19A] flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>Thêm Giáo Viên Mới
            </h3>
            <button onClick={() => { setShowAddForm(false); setErrorMsg("") }} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-none transition-all cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-655 mb-1.5 uppercase tracking-wider">Mã GV *</label>
              <input type="text" value={newForm.teacherCode}
                onChange={e => setNewForm({ ...newForm, teacherCode: e.target.value.trim().toUpperCase() })}
                placeholder="GV001"
                className="w-full border-2 border-slate-300 rounded-none px-3 py-2.5 text-sm focus:border-[#00A19A] outline-none font-mono font-black transition-all bg-white" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-655 mb-1.5 uppercase tracking-wider">Họ và tên *</label>
              <input type="text" value={newForm.teacherName}
                onChange={e => setNewForm({ ...newForm, teacherName: e.target.value })}
                placeholder="Nguyễn Văn A"
                className="w-full border-2 border-slate-300 rounded-none px-3 py-2.5 text-sm focus:border-[#00A19A] outline-none font-bold transition-all bg-white" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-655 mb-1.5 uppercase tracking-wider">Email nhận thông báo</label>
              <input type="email" value={newForm.email}
                onChange={e => setNewForm({ ...newForm, email: e.target.value.trim() })}
                placeholder="gv@skylineschool.edu.vn"
                className="w-full border-2 border-slate-300 rounded-none px-3 py-2.5 text-sm focus:border-[#00A19A] outline-none transition-all bg-white font-semibold" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-655 mb-1.5 uppercase tracking-wider">Cơ sở</label>
              <select value={newForm.campus} onChange={e => setNewForm({ ...newForm, campus: e.target.value })}
                className="w-full border-2 border-slate-300 rounded-none px-3 py-2.5 text-sm focus:border-[#00A19A] outline-none bg-white transition-all font-bold">
                <option value="">-- Chọn Cơ sở --</option>
                {(campuses || []).map((c) => <option key={c.id} value={c.campusName}>{c.campusName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-655 mb-1.5 uppercase tracking-wider">Tổ chuyên môn</label>
              <select value={newForm.department} onChange={e => setNewForm({ ...newForm, department: e.target.value })}
                className="w-full border-2 border-slate-300 rounded-none px-3 py-2.5 text-sm focus:border-[#00A19A] outline-none bg-white transition-all font-bold">
                <option value="">-- Chọn Tổ --</option>
                {(departments || []).map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
          </div>
          {(campuses || []).length > 1 && (
            <div className="mt-4">
              <label className="block text-xs font-black text-slate-655 mb-2 uppercase tracking-wider">Cơ sở làm việc thêm</label>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-none border-2 border-slate-300">
                {(campuses || []).filter((c) => {
                  const sel = (campuses || []).find((cx) => cx.campusName === newForm.campus)
                  return c.id !== sel?.id
                }).map((c) => {
                  const isChecked = newForm.additionalCampusIds?.includes(c.id)
                  return (
                    <label key={c.id} className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-none border-2 text-xs font-bold transition-all select-none ${isChecked ? "bg-[#00A19A]/10 border-[#00A19A] text-[#00A19A]" : "bg-white border-slate-300 text-slate-700 hover:bg-[#00A19A]/5 hover:border-slate-400"}`}>
                      <input type="checkbox" checked={isChecked} onChange={() => {
                        const cur = newForm.additionalCampusIds || []
                        setNewForm({ ...newForm, additionalCampusIds: cur.includes(c.id) ? cur.filter((x) => x !== c.id) : [...cur, c.id] })
                      }} className="w-4 h-4 rounded-none accent-teal-600 cursor-pointer" />
                      {c.campusName}
                    </label>
                  )
                })}
              </div>
            </div>
          )}
          <div className="flex gap-3 mt-5 pt-4 border-t-2 border-slate-200">
            <button onClick={handleCreate} disabled={saving}
              className="px-6 py-2.5 bg-[#00A19A] hover:bg-[#135E5B] disabled:opacity-60 text-white rounded-none font-black text-sm shadow-none transition-all active:scale-95 flex items-center gap-2 cursor-pointer">
              {saving ? <><RefreshCw className="w-4 h-4 animate-spin" />Đang lưu...</> : <><Check className="w-4 h-4" />Lưu Giáo Viên</>}
            </button>
            <button onClick={() => { setShowAddForm(false); setErrorMsg("") }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-none font-bold text-sm transition-all border-2 border-slate-300 cursor-pointer">Hủy</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border-2 border-slate-355 rounded-none overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-3 border-b-2 border-slate-300 bg-slate-50">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
            Danh sách giáo viên{hasFilters && <span className="ml-1.5 text-[#00A19A] font-black">| Đang lọc: {displayed.length} kết quả</span>}
          </p>
          <div className="flex items-center gap-2 border border-slate-300 px-2 py-1 bg-white font-bold text-xs">
            <span className="w-2.5 h-2.5 rounded-none bg-emerald-500 animate-pulse" />
            <span className="text-slate-600">{activeCount} đang dạy</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300 bg-slate-50 text-slate-700">
                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider w-12 border-r border-slate-200">#</th>
                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider w-28 border-r border-slate-200">Mã GV</th>
                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider min-w-[200px] border-r border-slate-200">Họ và Tên</th>
                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider w-40 border-r border-slate-200">Cơ sở</th>
                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider w-48 border-r border-slate-200">Tổ / Môn dạy</th>
                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider w-56 border-r border-slate-200">Tài khoản</th>
                <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-wider w-32 border-r border-slate-200">Trạng thái</th>
                <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-wider w-32">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-200">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="w-16 h-16 rounded-none border-2 border-dashed border-slate-300 flex items-center justify-center mx-auto mb-4 bg-slate-50">
                      <GraduationCap className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="font-black text-slate-655">Không có giáo viên phù hợp</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Thử thay đổi bộ lọc tìm kiếm</p>
                  </td>
                </tr>
              ) : (
                displayed.map((t, idx) => {
                  const isEditing = editingId === t.id
                  return (
                    <tr key={t.id} className={`group transition-all ${isEditing ? "bg-[#00A19A]/5 border-l-4 border-[#00A19A]" : "hover:bg-slate-50/50"}`}>

                      <td className="px-4 py-3.5 text-slate-500 text-xs font-mono font-bold border-r border-slate-200 tabular-nums">{idx + 1}</td>

                      <td className="px-4 py-3.5 border-r border-slate-200">
                        <span className="inline-block font-mono font-black text-[#00A19A] bg-[#00A19A]/5 px-2.5 py-1 rounded-none text-xs border border-[#00A19A]/20 tracking-wide">
                          {t.teacherCode}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 border-r border-slate-200">
                        {isEditing ? (
                          <div className="flex flex-col gap-1.5 max-w-xs">
                            <input type="text" value={editForm.teacherName}
                              onChange={e => setEditForm({ ...editForm, teacherName: e.target.value })}
                              className="border-2 border-[#00A19A] rounded-none px-2.5 py-1.5 text-sm w-full outline-none font-bold bg-white"
                              placeholder="Tên giáo viên" />
                            <input type="email" value={editForm.email || ""}
                              onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                              className="border-2 border-slate-300 rounded-none px-2.5 py-1.5 text-xs w-full outline-none text-slate-700 bg-white font-medium focus:border-[#00A19A]"
                              placeholder="Email thông báo" />
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <span className="font-bold text-slate-800 text-sm leading-tight">{t.teacherName}</span>
                            {t.email ? (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-655 bg-slate-100 border border-slate-250 px-2 py-0.5 rounded-none self-start">
                                <Mail className="w-3 h-3 text-slate-450" />{t.email}
                              </span>
                            ) : (
                              <span className="text-[10px] font-black text-amber-600 uppercase tracking-wide flex items-center gap-1 self-start">
                                <AlertCircle className="w-3 h-3 text-amber-500" />Chưa có Email
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 border-r border-slate-200">
                        {isEditing ? (
                          <div className="flex flex-col gap-2 max-w-xs">
                            <select value={editForm.campusId} onChange={e => {
                              const nid = e.target.value
                              setEditForm({ ...editForm, campusId: nid, additionalCampusIds: (editForm.additionalCampusIds || []).filter((x) => x !== nid) })
                            }} className="border-2 border-[#00A19A] rounded-none px-2 py-1.5 text-xs outline-none bg-white font-bold w-full">
                              <option value="">-- Cơ sở chính --</option>
                              {(campuses || []).map((c) => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                            </select>
                            <div className="flex flex-col gap-1 p-2 bg-slate-50 border-2 border-slate-300 rounded-none max-h-24 overflow-y-auto w-full">
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-0.5 mb-1">Cơ sở làm việc thêm:</p>
                              {(campuses || []).filter((c) => c.id !== editForm.campusId).map((c) => {
                                const isChk = editForm.additionalCampusIds?.includes(c.id)
                                return (
                                  <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded-none text-[10px] font-bold text-slate-700 select-none">
                                    <input type="checkbox" checked={isChk} onChange={() => {
                                      const cur = editForm.additionalCampusIds || []
                                      setEditForm({ ...editForm, additionalCampusIds: cur.includes(c.id) ? cur.filter((x) => x !== c.id) : [...cur, c.id] })
                                    }} className="w-3.5 h-3.5 rounded-none accent-[#00A19A] cursor-pointer" />
                                    {c.campusName}
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <span className="font-bold text-slate-800 text-xs uppercase">{t.campus || "—"}</span>
                            </div>
                            {t.additionalCampuses?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pl-5">
                                {t.additionalCampuses.map((ac) => (
                                  <span key={ac.id} className="text-[9px] bg-slate-100 text-slate-650 border border-slate-250 px-2 py-0.5 rounded-none font-bold uppercase tracking-wide">{ac.campusName}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 border-r border-slate-200">
                        {isEditing ? (
                          <div className="flex flex-col gap-1.5 max-w-xs">
                            <select value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                              className="border-2 border-[#00A19A] rounded-none px-2 py-1.5 text-xs outline-none bg-white font-bold focus:border-[#00A19A] w-full">
                              <option value="">-- Tổ --</option>
                              {(departments || []).map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                            </select>
                            <select value={editForm.mainSubject} onChange={e => setEditForm({ ...editForm, mainSubject: e.target.value })}
                              className="border-2 border-slate-300 rounded-none px-2 py-1.5 text-xs outline-none bg-white font-bold w-full focus:border-[#00A19A]">
                              <option value="">-- Môn dạy --</option>
                              {(subjects || []).map((s) => <option key={s.id} value={s.subjectName}>{s.subjectName}</option>)}
                            </select>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {t.department && (
                              <span className={`inline-block px-2.5 py-0.5 rounded-none border text-[10px] font-black uppercase tracking-wider self-start ${getDeptColor(t.department)}`}>
                                {t.department}
                              </span>
                            )}
                            {t.mainSubject && <span className="text-xs font-bold text-indigo-650 italic">{t.mainSubject}</span>}
                            {!t.department && !t.mainSubject && <span className="text-slate-300 text-sm">—</span>}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 border-r border-slate-200">
                        <div className="flex items-center gap-1.5 group/key">
                          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-none border border-slate-250 tracking-wide">
                            {t.user?.email || t.teacherCode}
                          </span>
                          <button onClick={() => handleResetPassword(t.id, t.teacherCode, t.teacherName)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 rounded-none opacity-0 group-hover:opacity-100 transition-all cursor-pointer" title="Reset mật khẩu">
                            <Key className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center border-r border-slate-200">
                        {isEditing ? (
                          <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                            className="border-2 border-[#00A19A]/60 rounded-none px-2 py-1.5 text-xs outline-none bg-white font-bold w-28 focus:border-[#00A19A]">
                            <option value="ACTIVE">Đang dạy</option>
                            <option value="INACTIVE">Nghỉ dạy</option>
                          </select>
                        ) : <StatusBadge status={t.status} />}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isEditing ? (
                            <>
                              <button onClick={() => handleSaveEdit(t.id)} disabled={saving}
                                className="p-2 text-white bg-emerald-500 hover:bg-emerald-600 rounded-none transition-all shadow-none disabled:opacity-60 cursor-pointer" title="Lưu">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingId(null)}
                                className="p-2 text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-none transition-all cursor-pointer" title="Hủy">
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleEdit(t)}
                                className="p-2 text-[#00A19A] hover:bg-[#00A19A]/10 border border-transparent hover:border-[#00A19A]/20 rounded-none transition-all opacity-0 group-hover:opacity-100 cursor-pointer" title="Chỉnh sửa">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(t.id, t.teacherName)}
                                className="p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 border border-transparent hover:border-rose-200 rounded-none transition-all opacity-0 group-hover:opacity-100 cursor-pointer" title="Xóa">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {displayed.length > 0 && (
          <div className="px-5 py-3 border-t-2 border-slate-300 bg-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-bold">
              Hiển thị <span className="font-black text-slate-700">{displayed.length}</span> / <span className="font-black text-slate-700">{teachers.length}</span> giáo viên
            </p>
            <p className="text-xs text-slate-500 font-bold">
              <span className="text-emerald-700 font-black">{activeCount}</span> đang dạy &middot; <span className="text-rose-600 font-black">{inactiveCount}</span> nghỉ dạy
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
