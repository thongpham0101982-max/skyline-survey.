"use client"
function PositionBadge({ position }: { position?: string | null }) {
  if (position === "TTCM") return (
    <span className="inline-flex items-center text-[10px] font-extrabold uppercase tracking-wide text-amber-700">
      TTCM
    </span>
  );
  if (position === "TPTCM") return (
    <span className="inline-flex items-center text-[10px] font-extrabold uppercase tracking-wide text-teal-700">
      TPTCM
    </span>
  );
  if (position === "QLCM") return (
    <span className="inline-flex items-center text-[10px] font-extrabold uppercase tracking-wide text-indigo-700">
      QLCM
    </span>
  );
  if (position === "Ban ĐHCM") return (
    <span className="inline-flex items-center text-[10px] font-extrabold uppercase tracking-wide text-violet-700">
      Ban ĐHCM
    </span>
  );
  if (position === "GĐCS") return (
    <span className="inline-flex items-center text-[10px] font-extrabold uppercase tracking-wide text-rose-700">
      GĐCS
    </span>
  );
  return (
    <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      {position || "GV"}
    </span>
  );
}
import { useState, useRef, useMemo } from "react"
import {
  Plus, Trash2, Edit2, Check, X, Upload, Download,
  Key, GraduationCap, Search, Users, UserCheck, Building2, Mail,
  Filter, RefreshCw, ShieldCheck, AlertCircle, Layers
} from "lucide-react"
import {
  createTeacherAction, updateTeacherAction, deleteTeacherAction,
  importTeachersAction, resetTeacherPasswordAction, assignTeachersToRoleAction
} from "./actions"

const EMPTY_NEW = {
  teacherCode: "", teacherName: "",
  email: "", phone: "",
  dateOfBirth: "", department: "", mainSubject: "", campus: "",
  additionalCampusIds: [], position: "GV"
}
const EMPTY_EDIT = { teacherName: "", dateOfBirth: "", department: "", mainSubject: "", campusId: "", status: "ACTIVE", email: "", additionalCampusIds: [], position: "GV" }

const DEPT_COLORS = {
  "KT&DBCL": "bg-[#48BFE3]/5 text-[#48BFE3]",
  "KT-DBCL": "bg-[#48BFE3]/5 text-[#48BFE3]",
  "default": "bg-slate-50 text-slate-600"
}
function getDeptColor(dept) { return DEPT_COLORS[dept] || DEPT_COLORS["default"] }

function StatusBadge({ status }) {
  if (status === "ACTIVE") return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider text-xs font-semibold">
      <span className="w-1.5 h-1.5 animate-pulse text-xs font-semibold" />On
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-rose-700 uppercase tracking-wider text-xs font-semibold">
      <span className="w-1.5 h-1.5 text-xs font-semibold" />Off
    </span>
  )
}

const cleanStr = (s: string | null | undefined) => 
  (s || "")
   .toLowerCase()
   .normalize("NFD")
   .replace(/[\u0300-\u036f]/g, "")
   .replace(/đ/g, "d")
   .replace(/Đ/g, "d");

export function TeacherManagerClient({ 
  initialTeachers, years, defaultYearId, classes, departments, subjects, campuses, isCampusLocked = false, defaultCampusId = null, roles = [] 
}: any) {
  const [teachers, setTeachers] = useState(initialTeachers)
  const [search, setSearch] = useState("")
  const [filterDepartment, setFilterDepartment] = useState("")
  const [filterSubject, setFilterSubject] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [activeBlockTab, setActiveBlockTab] = useState("")
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
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [assigning, setAssigning] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const fileInputRef = useRef(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Reset page to 1 when filters change:
  const [prevFilters, setPrevFilters] = useState('')
  const currentFiltersKey = search + filterDepartment + filterSubject + filterStatus + activeBlockTab
  if (currentFiltersKey !== prevFilters) {
    setPrevFilters(currentFiltersKey)
    setCurrentPage(1)
  }


  const displayed = teachers.filter((t) => {
    let match = true
    if (search) {
      const q = cleanStr(search)
      const nameClean = cleanStr(t.teacherName)
      const codeClean = cleanStr(t.teacherCode)
      const campusClean = cleanStr(t.campus)
      match = match && (nameClean.includes(q) || codeClean.includes(q) || campusClean.includes(q))
    }
    if (filterDepartment) {
      match = match && (
        t.department === filterDepartment ||
        (t.departmentAssignments && t.departmentAssignments.some((da: any) => da.departmentName === filterDepartment || da.departmentId === filterDepartment))
      )
    }
    if (filterSubject) match = match && t.mainSubject === filterSubject
    if (filterStatus) match = match && t.status === filterStatus
    if (activeBlockTab) {
      const deptObj = (departments || []).find((d) => d.name === t.department)
      match = match && deptObj?.blockCM === activeBlockTab
    }
    return match
  })
  const selectedDisplayedIds = selectedIds.filter(id => displayed.some(t => t.id === id));

  const activeCount = teachers.filter((t) => t.status === "ACTIVE").length
  const inactiveCount = teachers.filter((t) => t.status !== "ACTIVE").length

  const handleCreate = async () => {
    if (!newForm.teacherCode.trim() || !newForm.teacherName.trim()) { setErrorMsg("Vui lòng nhập Mã GV và Họ và tên!"); return }
    setSaving(true); setErrorMsg("")
    try {
      const selectedCampus = (campuses || []).find((c) => c.campusName === newForm.campus)
      const res = await createTeacherAction({ ...newForm, campusId: selectedCampus?.id, position: newForm.position })
      if (res && !res.success) {
        setErrorMsg(res.error || "Mã GV đã tồn tại hoặc có lỗi xảy ra!");
        setSaving(false);
        return;
      }
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
      department: t.department || "",
      departmentAssignments: t.departmentAssignments && t.departmentAssignments.length > 0
        ? t.departmentAssignments.map((da: any) => ({ departmentId: da.departmentId, position: da.position || "GV", isPrimary: da.isPrimary }))
        : (t.departmentId ? [{ departmentId: t.departmentId, position: t.position || "GV", isPrimary: true }] : []),
      mainSubject: t.mainSubject || "",
      campusId: t.campusId || "", status: t.status || "ACTIVE",
      email: t.email || "", additionalCampusIds: t.additionalCampusIds || [], position: t.position || "GV"
    })
  }

  const handleSaveEdit = async (id) => {
    setSaving(true); setErrorMsg("")
    try {
      let deptAssignments = editForm.departmentAssignments || [];
      if (editForm.position === "TTCM" && deptAssignments.length > 0) {
        if (!deptAssignments.some((da: any) => da.position === "TTCM")) {
          deptAssignments = deptAssignments.map((da: any, idx: number) => idx === 0 ? { ...da, position: "TTCM" } : da);
        }
      } else if (editForm.position !== "TTCM" && deptAssignments.length > 0) {
        deptAssignments = deptAssignments.map((da: any) => da.position === "TTCM" ? { ...da, position: editForm.position || "GV" } : da);
      }

      const res = await updateTeacherAction({ 
        id, 
        ...editForm, 
        departmentAssignments: deptAssignments,
        position: editForm.position 
      })
      if (res && !res.success) {
        setErrorMsg(res.error || "Lỗi khi lưu thay đổi!");
        setSaving(false);
        return;
      }

      setTeachers(teachers.map((t) => t.id === id ? {
        ...t, 
        teacherName: editForm.teacherName, 
        dateOfBirth: editForm.dateOfBirth || null,
        department: editForm.department || null,
        departmentAssignments: deptAssignments.map((da: any) => ({
          departmentId: da.departmentId,
          departmentName: (departments || []).find((d: any) => d.id === da.departmentId)?.name || "",
          position: da.position || "GV"
        })),
        mainSubject: editForm.mainSubject || null,
        campusId: editForm.campusId || null, 
        email: editForm.email || null,
        campus: (campuses || []).find((c) => c.id === editForm.campusId)?.campusName || null,
        additionalCampuses: (campuses || []).filter((c) => editForm.additionalCampusIds?.includes(c.id)).map((c) => ({ id: c.id, campusName: c.campusName })),
        additionalCampusIds: editForm.additionalCampusIds || [], 
        position: editForm.position || "GV", 
        status: editForm.status
      } : t))
      setEditingId(null)
      setSuccessMsg("Đã lưu thay đổi thành công!")
      setTimeout(() => setSuccessMsg(""), 3000)
    } catch(e: any) { setErrorMsg("Lỗi khi lưu: " + (e.message || "Vui lòng thử lại!")) }
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
      if (result.success) {
        const msg = `Import thành công: ${result.created} giáo viên. Bỏ qua: ${result.skipped}.`
        if (result.warnings && result.warnings.length > 0) {
          setErrorMsg(`Cảnh báo nhập trùng:\n` + result.warnings.join("\n"))
        }
        if (result.created > 0) {
          setSuccessMsg(msg)
          setTimeout(() => { setSuccessMsg(""); window.location.reload() }, 4000)
        } else {
          if (!result.warnings || result.warnings.length === 0) {
            setErrorMsg("Không tìm thấy giáo viên mới nào để import.")
          }
        }
      }
    } catch(e: any) { setErrorMsg("Lỗi khi import: " + e.message) }
    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const downloadTemplate = () => {
    const csv = "STT,Mã GV,Họ và tên,Email nhận thông báo,Cơ sở,Tổ chuyên môn\n1,GV001,Nguyễn Văn A,nguyenvana@skylineschool.edu.vn,CS1,Tổ Tự Nhiên"
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "danh_sach_giao_vien.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  const hasFilters = search || filterDepartment || filterSubject || filterStatus

  return (
    <div className="space-y-6 font-sans">

      {/* Toast */}
      {errorMsg && (
        <div className="flex items-center gap-2.5 text-rose-800 text-sm font-medium shadow-sm transition-all duration-200 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
          <span className="whitespace-pre-line">{errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="ml-auto text-rose-450 hover:text-rose-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2.5 text-emerald-800 text-sm font-medium shadow-sm transition-all duration-200 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-6 flex items-center gap-4 hover:border-[#48BFE3]/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 shadow-sm border-l-4 border-l-[#48BFE3]">
          <div className="w-12 h-12 rounded-xl bg-[#48BFE3]/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6 text-[#48BFE3]" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800 leading-none">{teachers.length}</p>
            <p className="text-[10px] text-slate-400 mt-1.5 uppercase tracking-wider font-bold">Tổng giáo viên</p>
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-6 flex items-center gap-4 hover:border-emerald-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 shadow-sm border-l-4 border-l-emerald-550">
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 text-xs font-semibold">
            <UserCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800 leading-none">{activeCount}</p>
            <p className="text-[10px] text-slate-400 mt-1.5 uppercase tracking-wider font-bold">On</p>
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-6 flex items-center gap-4 hover:border-violet-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 shadow-sm border-l-4 border-l-violet-600">
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 text-xs font-semibold">
            <Building2 className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800 leading-none">{(departments || []).length}</p>
            <p className="text-[10px] text-slate-400 mt-1.5 uppercase tracking-wider font-bold">Tổ chuyên môn</p>
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-6 flex items-center gap-4 hover:border-amber-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 shadow-sm border-l-4 border-l-amber-500">
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 text-xs font-semibold">
            <GraduationCap className="w-6 h-6 text-amber-650" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800 leading-none">{displayed.length}</p>
            <p className="text-[10px] text-slate-400 mt-1.5 uppercase tracking-wider font-bold">Đang hiển thị</p>
          </div>
        </div>
      </div>


      {/* Block CM Tabs */}
      {(() => {
        const blockSet = new Set();
        (departments || []).forEach((d) => { if (d.blockCM) blockSet.add(d.blockCM) });
        const blocks = Array.from(blockSet).sort();
        if (blocks.length === 0) return null;
        const blockColors = {
          "Mầm Non": { bg: "bg-amber-500", text: "text-amber-700", light: "bg-amber-50", border: "border-amber-200", ring: "ring-amber-200" },
          "Phổ thông": { bg: "bg-indigo-500", text: "text-indigo-700", light: "bg-indigo-50", border: "border-indigo-200", ring: "ring-indigo-200" },
          "Điều hành": { bg: "bg-teal-500", text: "text-teal-700", light: "bg-teal-50", border: "border-teal-200", ring: "ring-teal-200" },
          "Hỗ trợ người học": { bg: "bg-rose-500", text: "text-rose-700", light: "bg-rose-50", border: "border-rose-200", ring: "ring-rose-200" },
        };
        const defaultColor = { bg: "bg-slate-500", text: "text-slate-700", light: "bg-slate-50", border: "border-slate-200", ring: "ring-slate-200" };
        const getBlockCount = (block) => teachers.filter(t => {
          const d = (departments || []).find(dx => dx.name === t.department);
          return d?.blockCM === block;
        }).length;
        return (
          <div className="bg-white border border-slate-100 rounded-2xl p-2 shadow-sm flex flex-wrap gap-1.5">
            <button
              onClick={() => { setActiveBlockTab(""); setCurrentPage(1); setSelectedIds([]); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${!activeBlockTab ? "bg-[#48BFE3] text-white shadow-md" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tất cả</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black ${!activeBlockTab ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{teachers.length}</span>
            </button>
            {blocks.map(block => {
              const c = blockColors[block] || defaultColor;
              const count = getBlockCount(block);
              const isActive = activeBlockTab === block;
              return (
                <button key={block}
                  onClick={() => { setActiveBlockTab(isActive ? "" : block); setCurrentPage(1); setSelectedIds([]); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${isActive ? c.bg + " text-white shadow-md" : c.light + " " + c.text + " border " + c.border + " hover:shadow-sm"}`}
                >
                  <span>{block}</span>
                  <span className={`ml-0.5 px-2 py-0.5 rounded-full text-[10px] font-black ${isActive ? "bg-white/20 text-white" : c.light + " " + c.text}`}>{count}</span>
                </button>
              );
            })}
          </div>
        );
      })()}
      {/* Toolbar */}
      <div className="bg-white border border-slate-100 shadow-md shadow-slate-100/40 rounded-3xl p-6 space-y-4 border-t-4 border-t-[#48BFE3]">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Tìm tên, mã GV, cơ sở..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm hover:border-[#48BFE3]/50 focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/15 outline-none transition-all bg-white font-semibold" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>}
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-start lg:justify-end">
            <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-slate-700 hover:bg-slate-50 hover:border-slate-350 text-sm font-bold transition-all cursor-pointer text-xs font-semibold">
              <Download className="w-4 h-4" /><span>Tải mẫu</span>
            </button>
            <label className="flex items-center gap-1.5 px-4 py-2.5 border border-[#48BFE3]/20 bg-[#48BFE3]/5 rounded-xl text-[#48BFE3] hover:bg-[#48BFE3]/15 text-sm font-black cursor-pointer transition-all">
              <Upload className="w-4 h-4" />{importing ? "Đang xử lý..." : "Import Excel"}
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileImport} className="hidden" disabled={importing} />
            </label>
            <button onClick={() => { setShowAddForm(true); setErrorMsg("") }}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-[#003B3A] to-[#48BFE3] hover:brightness-110 text-white rounded-xl text-sm font-black transition-all active:scale-95 whitespace-nowrap cursor-pointer shadow-md shadow-[#48BFE3]/15">
              <Plus className="w-4 h-4" />Thêm GV Mới
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          <span className="text-xs font-black text-slate-450 uppercase tracking-widest flex items-center gap-1.5 mr-2"><Filter className="w-3.5 h-3.5" />Bộ lọc:</span>
          <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)}
            className={`border rounded-xl px-3.5 py-2 text-xs font-bold outline-none bg-white transition-all cursor-pointer ${filterDepartment ? "border-[#48BFE3] text-[#48BFE3] bg-[#48BFE3]/5" : "border-slate-200 text-slate-600 hover:border-[#48BFE3]/40 focus:border-[#48BFE3]"}`}>
            <option value="">Tất cả Tổ CM</option>
            {(departments || []).map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
            className={`border rounded-xl px-3.5 py-2 text-xs font-bold outline-none bg-white transition-all cursor-pointer ${filterSubject ? "border-[#48BFE3] text-[#48BFE3] bg-[#48BFE3]/5" : "border-slate-200 text-slate-600 hover:border-[#48BFE3]/40 focus:border-[#48BFE3]"}`}>
            <option value="">Tất cả Môn dạy</option>
            {(subjects || []).map((s) => <option key={s.id} value={s.subjectName}>{s.subjectName}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className={`border rounded-xl px-3.5 py-2 text-xs font-bold outline-none bg-white transition-all cursor-pointer ${filterStatus ? "border-[#48BFE3] text-[#48BFE3] bg-[#48BFE3]/5" : "border-slate-200 text-slate-600 hover:border-[#48BFE3]/40 focus:border-[#48BFE3]"}`}>
            <option value="">Tất cả Trạng thái</option>
            <option value="ACTIVE">On</option>
            <option value="INACTIVE">Off</option>
          </select>
          {hasFilters && (
            <button onClick={() => { setSearch(""); setFilterDepartment(""); setFilterSubject(""); setFilterStatus("") }}
              className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-400 transition-all cursor-pointer text-xs font-semibold">
              <RefreshCw className="w-3 h-3" />Xóa lọc
            </button>
          )}
          <span className="ml-auto text-xs text-slate-400 font-bold">{displayed.length}/{teachers.length} giáo viên</span>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-gradient-to-br from-white to-slate-50/20 border border-teal-500/20 rounded-2xl p-6 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
            <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#48BFE3]/15 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-[#48BFE3]" />
              </div>Thêm Giáo Viên Mới
            </h3>
            <button onClick={() => { setShowAddForm(false); setErrorMsg("") }} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase tracking-wider">Mã GV *</label>
              <input type="text" value={newForm.teacherCode}
                onChange={e => setNewForm({ ...newForm, teacherCode: e.target.value.trim().toUpperCase() })}
                placeholder="GV001"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/10 outline-none font-mono font-black transition-all bg-white" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase tracking-wider">Họ và tên *</label>
              <input type="text" value={newForm.teacherName}
                onChange={e => setNewForm({ ...newForm, teacherName: e.target.value })}
                placeholder="Nguyễn Văn A"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/10 outline-none font-bold transition-all bg-white" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase tracking-wider">Email nhận thông báo</label>
              <input type="email" value={newForm.email}
                onChange={e => setNewForm({ ...newForm, email: e.target.value.trim() })}
                placeholder="gv@skylineschool.edu.vn"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/10 outline-none transition-all bg-white font-semibold" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase tracking-wider">Cơ sở</label>
              <select value={newForm.campus} onChange={e => setNewForm({ ...newForm, campus: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/10 outline-none bg-white transition-all font-bold cursor-pointer">
                <option value="">-- Chọn Cơ sở --</option>
                {(campuses || []).map((c) => <option key={c.id} value={c.campusName}>{c.campusName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase tracking-wider">Tổ chuyên môn</label>
              <select value={newForm.department} onChange={e => setNewForm({ ...newForm, department: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/10 outline-none bg-white transition-all font-bold cursor-pointer">
                <option value="">-- Chọn Tổ --</option>
                {(departments || []).map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase tracking-wider">Chức vụ</label>
              <select value={newForm.position} onChange={e => setNewForm({ ...newForm, position: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/10 outline-none bg-white transition-all font-bold cursor-pointer">
                <option value="GV">GV (Giáo viên)</option>
                <option value="TTCM">TTCM (Tổ trưởng CM)</option>
                <option value="TPTCM">TPTCM (Tổ phó CM)</option>
                <option value="QLCM">QLCM (Quản lý CM)</option>
                <option value="Ban ĐHCM">Ban ĐHCM</option>
                <option value="GĐCS">GĐCS (Giám đốc CS)</option>
              </select>
            </div>
          </div>
          {(campuses || []).length > 1 && (
            <div className="mt-4">
              <label className="block text-xs font-black text-slate-550 mb-2 uppercase tracking-wider">Cơ sở làm việc thêm</label>
              <div className="flex flex-wrap gap-2 p-3.5 text-xs font-semibold">
                {(campuses || []).filter((c) => {
                  const sel = (campuses || []).find((cx) => cx.campusName === newForm.campus)
                  return c.id !== sel?.id
                }).map((c) => {
                  const isChecked = newForm.additionalCampusIds?.includes(c.id)
                  return (
                    <label key={c.id} className={`flex items-center gap-2 cursor-pointer px-3.5 py-2 rounded-xl border text-xs font-bold transition-all select-none ${isChecked ? "bg-[#48BFE3]/10 border-[#48BFE3] text-[#48BFE3]" : "bg-white border-slate-200 text-slate-700 hover:bg-[#48BFE3]/5 hover:border-slate-350"}`}>
                      <input type="checkbox" checked={isChecked} onChange={() => {
                        const cur = newForm.additionalCampusIds || []
                        setNewForm({ ...newForm, additionalCampusIds: cur.includes(c.id) ? cur.filter((x) => x !== c.id) : [...cur, c.id] })
                      }} className="w-4 h-4 rounded-md accent-[#48BFE3] cursor-pointer" />
                      {c.campusName}
                    </label>
                  )
                })}
              </div>
            </div>
          )}
          <div className="flex gap-3 mt-5 pt-4 border-t border-slate-100">
            <button onClick={handleCreate} disabled={saving}
              className="px-6 py-2.5 bg-[#48BFE3] hover:bg-[#135E5B] disabled:opacity-60 text-white rounded-xl font-black text-sm shadow-md shadow-teal-500/5 transition-all active:scale-95 flex items-center gap-2 cursor-pointer">
              {saving ? <><RefreshCw className="w-4 h-4 animate-spin" />Đang lưu...</> : <><Check className="w-4 h-4" />Lưu Giáo Viên</>}
            </button>
            <button onClick={() => { setShowAddForm(false); setErrorMsg("") }}
              className="hover:bg-slate-100 text-slate-800 font-bold text-sm transition-all cursor-pointer text-xs font-semibold">Hủy</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-150 rounded-3xl overflow-hidden shadow-md shadow-slate-100/40 border-t-4 border-t-[#003B3A]">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-semibold">
          <div className="flex items-center gap-4 flex-wrap">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Danh sách giáo viên{hasFilters && <span className="ml-1.5 text-[#48BFE3] font-black">| Đang lọc: {displayed.length} kết quả</span>}
            </p>
            {selectedDisplayedIds.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-600">Đã chọn: <span className="text-[#48BFE3] font-extrabold">{selectedDisplayedIds.length}</span></span>
                <select
                  onChange={async (e) => {
                    const roleCode = e.target.value;
                    if (!roleCode) return;
                    const roleName = (roles || []).find((r) => r.code === roleCode)?.name || roleCode;
                    if (confirm(`Bạn có chắc chắn muốn cấp tài khoản và gán Nhóm: ${roleName} cho ${selectedDisplayedIds.length} giáo viên đã chọn?`)) {
                      setAssigning(true);
                      const res = await assignTeachersToRoleAction(selectedDisplayedIds, roleCode);
                      if (res.success) {
                        alert("Đã cấp tài khoản/phân nhóm quyền thành công!");
                        setSelectedIds([]);
                        window.location.reload();
                      } else {
                        alert("Lỗi: " + res.error);
                      }
                      setAssigning(false);
                    }
                    e.target.value = "";
                  }}
                  disabled={assigning}
                  className="p-1.5 rounded-xl border text-xs bg-white border-slate-300 font-bold text-slate-700 cursor-pointer outline-none focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/15 transition-all"
                >
                  <option value="">-- Cấp Quyền Nhóm --</option>
                  {(roles || []).map((r) => (
                    <option key={r.code} value={r.code}>{r.name} ({r.code})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 border border-slate-200/60 px-3 py-1 bg-white font-bold text-xs rounded-lg">
            <span className="w-2 h-2 animate-pulse text-xs font-semibold" />
            <span className="text-slate-655 font-bold">{activeCount} On</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-[#003B3A] text-white">
                <th className="p-2 p-2 text-center text-[11px] font-black uppercase tracking-wider w-12 border border-slate-200">
                  <input type="checkbox" className="w-4 h-4 rounded text-[#48BFE3] cursor-pointer"
                    checked={displayed.length > 0 && selectedDisplayedIds.length === displayed.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(displayed.map(t => t.id));
                      else setSelectedIds([]);
                    }}
                  />
                </th>
                <th className="p-2 p-2 text-left text-[11px] font-black uppercase tracking-wider w-12 border border-slate-200">#</th>
                <th className="p-2 p-2 text-left text-[11px] font-black uppercase tracking-wider w-28 border border-slate-200">Mã GV</th>
                <th className="p-2 p-2 text-left text-[11px] font-black uppercase tracking-wider min-w-[200px] border border-slate-200">Họ và Tên</th>
                <th className="p-2 p-2 text-left text-[11px] font-black uppercase tracking-wider min-w-[180px] border border-slate-200">Email</th>
                <th className="p-2 p-2 text-left text-[11px] font-black uppercase tracking-wider w-40 border border-slate-200">Cơ sở</th>
                <th className="p-2 p-2 text-left text-[11px] font-black uppercase tracking-wider w-48 border border-slate-200">Tổ chuyên môn</th>
                <th className="p-2 p-2 text-left text-[11px] font-black uppercase tracking-wider w-36 border border-slate-200">Chức vụ</th>
                <th className="p-2 p-2 text-left text-[11px] font-black uppercase tracking-wider w-56 border border-slate-200">Tài khoản</th>
                <th className="p-2 p-2 text-center text-[11px] font-black uppercase tracking-wider w-32 border border-slate-200">Trạng thái</th>
                <th className="p-2 p-2 text-center text-[11px] font-black uppercase tracking-wider w-32 border border-slate-200">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-2 p-2 text-center border border-slate-200">
                    <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 text-xs font-semibold">
                      <GraduationCap className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="font-black text-slate-600">Không có giáo viên phù hợp</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Thử thay đổi bộ lọc tìm kiếm</p>
                  </td>
                </tr>
              ) : (
                (() => {
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const paginated = displayed.slice(startIndex, startIndex + itemsPerPage);
                  return paginated.map((t, index) => {
                    const idx = startIndex + index;
                    const isEditing = editingId === t.id;
                    return (
                      <tr key={t.id} className={`group transition-all ${isEditing ? "bg-[#48BFE3]/5 border-l-4 border-l-[#48BFE3]" : "hover:bg-slate-50/20"} ${selectedDisplayedIds.includes(t.id) ? "bg-[#48BFE3]/5" : ""}`}>

                      <td className="p-2 p-2 text-center border border-slate-200">
                        <input type="checkbox" className="w-4 h-4 rounded text-[#48BFE3] cursor-pointer"
                          checked={selectedDisplayedIds.includes(t.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds([...selectedIds, t.id]);
                            else setSelectedIds(selectedIds.filter(id => id !== t.id));
                          }}
                        />
                      </td>
                      <td className="p-2 p-2 text-slate-400 text-xs font-mono font-bold tabular-nums border border-slate-200">{idx + 1}</td>

                      <td className="p-2 p-2 border border-slate-200">
                        <span className="inline-block font-mono font-bold text-[#48BFE3] bg-[#48BFE3]/5 px-2.5 py-1 rounded-xl text-xs tracking-wide">
                          {t.teacherCode}
                        </span>
                      </td>

                      <td className="p-2 p-2 border border-slate-200">
                        {isEditing ? (
                          <input type="text" value={editForm.teacherName}
                            onChange={e => setEditForm({ ...editForm, teacherName: e.target.value })}
                            className="border border-[#48BFE3] rounded-xl px-2.5 py-1.5 text-sm w-full outline-none font-bold bg-white"
                            placeholder="Tên giáo viên" />
                        ) : (
                          <span className="font-bold text-slate-800 text-sm leading-tight">{t.teacherName}</span>
                        )}
                      </td>

                      <td className="p-2 p-2 border border-slate-200">
                        {isEditing ? (
                          <input type="email" value={editForm.email || ""}
                            onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                            className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs w-full outline-none text-slate-600 bg-white font-medium focus:border-[#48BFE3]"
                            placeholder="Email thông báo" />
                        ) : (
                          t.email ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-650">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />{t.email}
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-wide flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-450" />Chưa có Email
                            </span>
                          )
                        )}
                      </td>

                      <td className="p-2 p-2 border border-slate-200">
                        {isEditing ? (
                          <div className="flex flex-col gap-2 max-w-xs">
                            <select value={editForm.campusId} onChange={e => {
                              const nid = e.target.value
                              setEditForm({ ...editForm, campusId: nid, additionalCampusIds: (editForm.additionalCampusIds || []).filter((x) => x !== nid) })
                            }} className="border border-[#48BFE3] rounded-xl px-2.5 py-1.5 text-xs outline-none bg-white font-bold w-full cursor-pointer">
                              <option value="">-- Cơ sở chính --</option>
                              {(campuses || []).map((c) => <option key={c.id} value={c.id}>{c.campusName}</option>)}
                            </select>
                            <div className="flex flex-col gap-1 p-2 max-h-24 overflow-y-auto w-full text-xs font-semibold">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1 mb-1">Cơ sở làm việc thêm:</p>
                              {(campuses || []).filter((c) => c.id !== editForm.campusId).map((c) => {
                                const isChk = editForm.additionalCampusIds?.includes(c.id)
                                return (
                                  <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded-md text-[10px] font-bold text-slate-600 select-none">
                                    <input type="checkbox" checked={isChk} onChange={() => {
                                      const cur = editForm.additionalCampusIds || []
                                      setEditForm({ ...editForm, additionalCampusIds: cur.includes(c.id) ? cur.filter((x) => x !== c.id) : [...cur, c.id] })
                                    }} className="w-3.5 h-3.5 rounded-md accent-[#48BFE3] cursor-pointer" />
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
                              <span className="font-bold text-slate-700 text-xs uppercase">{t.campus || "—"}</span>
                            </div>
                            {t.additionalCampuses?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pl-5.5">
                                {t.additionalCampuses.map((ac) => (
                                  <span key={ac.id} className="text-[9px] text-slate-500 font-bold uppercase tracking-wide text-xs font-semibold">{ac.campusName}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="p-2 p-2 border border-slate-200">
                        {isEditing ? (
                          <div className="flex flex-col gap-1.5 min-w-[220px]">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tổ CM & Chức vụ:</p>
                            <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto p-1.5 border border-[#48BFE3] rounded-xl bg-white text-xs">
                              {(departments || []).map((d: any) => {
                                const assigned = (editForm.departmentAssignments || []).find((a: any) => a.departmentId === d.id);
                                const isChecked = !!assigned;
                                return (
                                  <div key={d.id} className="flex items-center justify-between p-1 rounded-lg hover:bg-slate-50 border border-slate-100">
                                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 text-[11px]">
                                      <input type="checkbox" checked={isChecked} onChange={(e) => {
                                        const cur = editForm.departmentAssignments || [];
                                        if (e.target.checked) {
                                          const next = [...cur, { departmentId: d.id, position: "GV" }];
                                          setEditForm({ ...editForm, departmentAssignments: next, department: d.name });
                                        } else {
                                          const next = cur.filter((x: any) => x.departmentId !== d.id);
                                          setEditForm({ ...editForm, departmentAssignments: next, department: next[0] ? ((departments || []).find((dx: any) => dx.id === next[0].departmentId)?.name || "") : "" });
                                        }
                                      }} className="w-3.5 h-3.5 rounded accent-[#48BFE3] cursor-pointer" />
                                      {d.name}
                                    </label>
                                    {isChecked && (
                                      <select value={assigned.position || "GV"} onChange={(e) => {
                                        const cur = editForm.departmentAssignments || [];
                                        const next = cur.map((x: any) => x.departmentId === d.id ? { ...x, position: e.target.value } : x);
                                        const hasTTCM = next.some((x: any) => x.position === "TTCM");
                                        setEditForm({ ...editForm, departmentAssignments: next, position: hasTTCM ? "TTCM" : (editForm.position || "GV") });
                                      }} className="text-[10px] font-extrabold px-1.5 py-0.5 border border-amber-300 rounded-md outline-none bg-amber-50 text-amber-800 cursor-pointer">
                                        <option value="GV">GV</option>
                                        <option value="TTCM">TTCM</option>
                                        <option value="TPTCM">TPTCM</option>
                                        <option value="QLCM">QLCM</option>
                                        <option value="Ban ĐHCM">Ban ĐHCM</option>
                                        <option value="GĐCS">GĐCS</option>
                                      </select>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1 items-center">
                            {t.departmentAssignments && t.departmentAssignments.length > 0 ? (
                              t.departmentAssignments.map((da: any) => (
                                <span key={da.departmentId || da.departmentName} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-extrabold bg-[#48BFE3]/10 text-[#48BFE3] border border-[#48BFE3]/20">
                                  {da.departmentName || da.departmentCode}
                                  {da.position && da.position !== "GV" && (
                                    <span className="bg-amber-100 text-amber-800 text-[10px] px-1 py-0.2 rounded-md font-black">{da.position}</span>
                                  )}
                                </span>
                              ))
                            ) : t.department ? (
                              <span className={"inline-block px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wide self-start " + getDeptColor(t.department)}>
                                {t.department}
                              </span>
                            ) : (
                              <span className="text-slate-350 text-xs italic">Ch�a ph�n t?</span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="p-2 p-2 border border-slate-200">
                        {isEditing ? (
                          <select value={editForm.position || "GV"} onChange={e => {
                            const newPos = e.target.value;
                            let nextDeptAssignments = editForm.departmentAssignments || [];
                            if (newPos === "TTCM") {
                              nextDeptAssignments = nextDeptAssignments.map((da: any, idx: number) => idx === 0 ? { ...da, position: "TTCM" } : da);
                            } else if (newPos === "GV") {
                              nextDeptAssignments = nextDeptAssignments.map((da: any) => da.position === "TTCM" ? { ...da, position: "GV" } : da);
                            }
                            setEditForm({ ...editForm, position: newPos, departmentAssignments: nextDeptAssignments });
                          }}
                            className="border border-[#48BFE3] rounded-xl px-2.5 py-1.5 text-xs outline-none bg-white font-bold focus:border-[#48BFE3] w-full cursor-pointer">
                            <option value="GV">GV</option>
                            <option value="TTCM">TTCM</option>
                            <option value="TPTCM">TPTCM</option>
                            <option value="QLCM">QLCM</option>
                            <option value="Ban ĐHCM">Ban ĐHCM</option>
                            <option value="GĐCS">GĐCS</option>
                          </select>
                        ) : (
                          <PositionBadge position={t.position} />
                        )}
                      </td>

                      <td className="p-2 p-2 border border-slate-200">
                        <div className="flex items-center gap-1.5 group/key">
                          <span className="font-mono text-xs font-semibold text-slate-500 tracking-wide text-xs font-semibold">
                            {t.user?.email || t.teacherCode}
                          </span>
                          <button onClick={() => handleResetPassword(t.id, t.teacherCode, t.teacherName)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer text-xs font-semibold" title="Reset mật khẩu">
                            <Key className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      <td className="p-2 p-2 text-center border border-slate-200">
                        {isEditing ? (
                          <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                            className="border border-[#48BFE3]/60 rounded-xl px-2 py-1.5 text-xs outline-none bg-white font-bold w-28 focus:border-[#48BFE3] cursor-pointer">
                            <option value="ACTIVE">On</option>
                            <option value="INACTIVE">Off</option>
                          </select>
                        ) : (
                          t.status === "ACTIVE" ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider text-xs font-semibold">
                              <span className="w-1.5 h-1.5 animate-pulse text-xs font-semibold" />On
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-rose-700 uppercase tracking-wider text-xs font-semibold">
                              <span className="w-1.5 h-1.5 text-xs font-semibold" />Off
                            </span>
                          )
                        )}
                      </td>

                      <td className="p-2 p-2 text-center border border-slate-200">
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <button onClick={() => handleSaveEdit(t.id)} disabled={saving}
                                className="p-2 text-white hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/10 disabled:opacity-60 cursor-pointer text-xs font-semibold" title="Lưu">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingId(null)}
                                className="p-2 text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-all cursor-pointer" title="Hủy">
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleEdit(t)}
                                className="p-2 text-[#48BFE3] hover:bg-[#48BFE3]/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 cursor-pointer" title="Chỉnh sửa">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(t.id, t.teacherName)}
                                className="p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-all opacity-0 group-hover:opacity-100 cursor-pointer text-xs font-semibold" title="Xóa">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                  });
                })()
              )}
            </tbody>
          </table>
        </div>
        {displayed.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-xs text-slate-450 font-bold">
              <p>
                Hiển thị <span className="font-black text-slate-700">{Math.min(displayed.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(displayed.length, currentPage * itemsPerPage)}</span> trong số <span className="font-black text-slate-700">{displayed.length}</span> giáo viên
              </p>
              <p className="hidden sm:block text-slate-300">|</p>
              <p>
                <span className="text-emerald-700 font-black">{activeCount}</span> On &middot; <span className="text-rose-600 font-black">{inactiveCount}</span> Off
              </p>
            </div>
            
            {displayed.length > itemsPerPage && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-all cursor-pointer text-xs font-semibold"
                >
                  Trước
                </button>
                {Array.from({ length: Math.ceil(displayed.length / itemsPerPage) }).map((_, i) => {
                  const pageNum = i + 1;
                  const isCurrent = currentPage === pageNum;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 flex items-center justify-center text-xs font-extrabold rounded-lg border transition-all cursor-pointer ${isCurrent ? 'bg-[#48BFE3] border-[#48BFE3] text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-[#48BFE3]/5'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(displayed.length / itemsPerPage)))}
                  disabled={currentPage === Math.ceil(displayed.length / itemsPerPage)}
                  className="text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-all cursor-pointer text-xs font-semibold"
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
