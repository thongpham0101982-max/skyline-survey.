"use client"
import { useState, useRef, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import {
  Plus, Trash2, Edit2, X, Upload, Download, Key, GraduationCap,
  Search, Building2, Mail, RotateCcw, AlertCircle, Users,
  ChevronLeft, ChevronRight, Shield, CheckCircle2, XCircle
} from "lucide-react"
import { PageHeader } from "@/components/PageHeader"
import { ACADEMIC_DIVISIONS } from "@/config/divisions"
import {
  createTeacherAction, updateTeacherAction, deleteTeacherAction,
  importTeachersAction, resetTeacherPasswordAction, assignTeachersToRoleAction
} from "./actions"
import { TeacherFormDrawer, TeacherFormState } from "./TeacherFormDrawer"

const EMPTY_FORM: TeacherFormState = {
  teacherCode: "",
  teacherName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  department: "",
  departmentAssignments: [],
  mainSubject: "",
  campusId: "",
  additionalCampusIds: [],
  position: "GV",
  positions: [],
  divisionCodes: [],
  status: "ACTIVE",
}

const cleanStr = (s: string | null | undefined) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")

function PositionBadges({ position, positions }: { position?: string | null; positions?: string[] }) {
  const allPos = new Set<string>()
  if (position) allPos.add(position.trim())
  if (Array.isArray(positions)) positions.forEach((p) => p && allPos.add(p.trim()))
  const list = Array.from(allPos)
  if (list.length === 0) list.push("GV")

  const styleFor = (pos: string) => {
    if (pos === "GĐCS" || pos === "GDCS") return "bg-rose-50 text-rose-700 border-rose-200"
    if (pos === "TTCM") return "bg-amber-50 text-amber-700 border-amber-200"
    if (pos === "TPTCM" || pos === "TBP" || pos === "TB_DHCM" || pos === "Ban ĐHCM" || pos === "QLCM") {
      return "bg-[#F0FDFA] text-[#00736E] border-[#99F6E4]"
    }
    if (pos === "NV") return "bg-sky-50 text-sky-700 border-sky-200"
    return "bg-slate-100 text-slate-600 border-slate-200"
  }

  const labelFor = (pos: string) => {
    if (pos === "TB_DHCM" || pos === "QLCM") return "Ban ĐHCM"
    return pos || "GV"
  }

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {list.map((pos) => (
        <span
          key={pos}
          className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${styleFor(pos)}`}
        >
          {labelFor(pos)}
        </span>
      ))}
    </div>
  )
}

function getVisiblePages(current: number, total: number): Array<number | "..."> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total]
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total]
  return [1, "...", current - 1, current, current + 1, "...", total]
}

export function TeacherManagerClient({
  initialTeachers,
  defaultYearId,
  departments,
  subjects,
  campuses,
  isCampusLocked = false,
  defaultCampusId = null,
  roles = [],
}: any) {
  const router = useRouter()
  const [teachers, setTeachers] = useState<any[]>(initialTeachers)

  useEffect(() => {
    setTeachers(initialTeachers)
  }, [initialTeachers])

  // Filters
  const [search, setSearch] = useState("")
  const [activeBlockTab, setActiveBlockTab] = useState("")
  const [filterCampus, setFilterCampus] = useState("")
  const [filterDepartment, setFilterDepartment] = useState("")
  const [filterSubject, setFilterSubject] = useState("")
  const [filterStatus, setFilterStatus] = useState("")

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [assigning, setAssigning] = useState(false)

  // Drawer (Create / Edit)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formState, setFormState] = useState<TeacherFormState>(EMPTY_FORM)
  const [drawerError, setDrawerError] = useState("")
  const [saving, setSaving] = useState(false)

  // Import & Warnings
  const [importing, setImporting] = useState(false)
  const [importWarningMsg, setImportWarningMsg] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const departmentByName = useMemo(() => {
    const map = new Map<string, any>()
    ;(departments || []).forEach((d: any) => map.set(d.name, d))
    return map
  }, [departments])

  const blocks = useMemo(() => {
    const set = new Set<string>()
    ;(departments || []).forEach((d: any) => {
      if (d.blockCM) set.add(d.blockCM)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"))
  }, [departments])

  const blockCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    teachers.forEach((t) => {
      const b = departmentByName.get(t.department)?.blockCM
      if (b) counts[b] = (counts[b] || 0) + 1
    })
    return counts
  }, [teachers, departmentByName])

  const displayed = useMemo(() => {
    const q = search ? cleanStr(search) : ""
    return teachers.filter((t) => {
      if (q) {
        const hit =
          cleanStr(t.teacherName).includes(q) ||
          cleanStr(t.teacherCode).includes(q) ||
          cleanStr(t.email).includes(q) ||
          cleanStr(t.campus).includes(q)
        if (!hit) return false
      }
      if (activeBlockTab) {
        const deptObj = departmentByName.get(t.department)
        if (deptObj?.blockCM !== activeBlockTab) return false
      }
      if (filterCampus) {
        const matchPrimary = t.campusId === filterCampus
        const matchAdditional =
          Array.isArray(t.additionalCampusIds) && t.additionalCampusIds.includes(filterCampus)
        if (!matchPrimary && !matchAdditional) return false
      }
      if (filterDepartment) {
        const matchDept =
          t.department === filterDepartment ||
          (Array.isArray(t.departmentAssignments) &&
            t.departmentAssignments.some(
              (da: any) =>
                da.departmentName === filterDepartment || da.departmentId === filterDepartment
            ))
        if (!matchDept) return false
      }
      if (filterSubject && t.mainSubject !== filterSubject) return false
      if (filterStatus && t.status !== filterStatus) return false
      return true
    })
  }, [
    teachers,
    search,
    activeBlockTab,
    filterCampus,
    filterDepartment,
    filterSubject,
    filterStatus,
    departmentByName,
  ])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, activeBlockTab, filterCampus, filterDepartment, filterSubject, filterStatus, itemsPerPage])

  const totalPages = Math.max(1, Math.ceil(displayed.length / itemsPerPage))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * itemsPerPage
  const paginated = displayed.slice(startIndex, startIndex + itemsPerPage)

  const selectedDisplayedIds = useMemo(
    () => selectedIds.filter((id) => displayed.some((t) => t.id === id)),
    [selectedIds, displayed]
  )

  const activeCount = useMemo(() => teachers.filter((t) => t.status === "ACTIVE").length, [teachers])
  const inactiveCount = teachers.length - activeCount

  const hasFilters = Boolean(
    search || activeBlockTab || filterCampus || filterDepartment || filterSubject || filterStatus
  )

  // Open Create Drawer
  const openCreateDrawer = () => {
    setDrawerMode("create")
    setEditingId(null)
    setDrawerError("")
    setFormState({
      ...EMPTY_FORM,
      campusId: isCampusLocked && defaultCampusId ? defaultCampusId : "",
    })
    setDrawerOpen(true)
  }

  // Open Edit Drawer
  const openEditDrawer = (t: any) => {
    setDrawerMode("edit")
    setEditingId(t.id)
    setDrawerError("")
    const deptAssignments =
      Array.isArray(t.departmentAssignments) && t.departmentAssignments.length > 0
        ? t.departmentAssignments.map((da: any) => ({
            departmentId: da.departmentId,
            position: da.position || "GV",
            isPrimary: da.isPrimary,
          }))
        : t.departmentId
          ? [{ departmentId: t.departmentId, position: t.position || "GV", isPrimary: true }]
          : []

    setFormState({
      teacherCode: t.teacherCode || "",
      teacherName: t.teacherName || "",
      email: t.email || "",
      phone: t.phone || "",
      dateOfBirth: t.dateOfBirth ? new Date(t.dateOfBirth).toISOString().split("T")[0] : "",
      department: t.department || "",
      departmentAssignments: deptAssignments,
      mainSubject: t.mainSubject || "",
      campusId: t.campusId || "",
      additionalCampusIds: Array.isArray(t.additionalCampusIds) ? t.additionalCampusIds : [],
      position: t.position || "GV",
      positions: Array.isArray(t.positions) ? t.positions : [],
      divisionCodes: Array.isArray(t.divisionCodes) ? t.divisionCodes : [],
      status: t.status || "ACTIVE",
    })
    setDrawerOpen(true)
  }

  const handleSubmitDrawer = async () => {
    if (drawerMode === "create") {
      if (!formState.teacherCode.trim() || !formState.teacherName.trim()) {
        setDrawerError("Vui lòng nhập đầy đủ Mã giáo viên và Họ và tên.")
        return
      }
      setSaving(true)
      setDrawerError("")
      try {
        const selectedCampus = (campuses || []).find((c: any) => c.id === formState.campusId)
        const res = await createTeacherAction({
          ...formState,
          campus: selectedCampus?.campusName || "",
          campusId: formState.campusId || undefined,
        })
        if (res && !res.success) {
          setDrawerError(res.error || "Mã giáo viên đã tồn tại hoặc có lỗi xảy ra.")
          setSaving(false)
          return
        }
        setDrawerOpen(false)
        toast.success(`Đã thêm giáo viên ${formState.teacherName} (${formState.teacherCode}).`)
        router.refresh()
      } catch (e: any) {
        setDrawerError(e?.message || "Không thể tạo giáo viên. Vui lòng thử lại.")
      }
      setSaving(false)
      return
    }

    if (!editingId) return
    if (!formState.teacherName.trim()) {
      setDrawerError("Họ và tên giáo viên không được để trống.")
      return
    }
    setSaving(true)
    setDrawerError("")
    try {
      let deptAssignments = formState.departmentAssignments || []
      if (formState.position === "TTCM" && deptAssignments.length > 0) {
        if (!deptAssignments.some((da) => da.position === "TTCM")) {
          deptAssignments = deptAssignments.map((da, idx) =>
            idx === 0 ? { ...da, position: "TTCM" } : da
          )
        }
      } else if (formState.position !== "TTCM" && deptAssignments.length > 0) {
        deptAssignments = deptAssignments.map((da) =>
          da.position === "TTCM" ? { ...da, position: formState.position || "GV" } : da
        )
      }

      const res = await updateTeacherAction({
        id: editingId,
        teacherName: formState.teacherName,
        dateOfBirth: formState.dateOfBirth,
        department: formState.department,
        departmentAssignments: deptAssignments,
        mainSubject: formState.mainSubject,
        campusId: formState.campusId,
        additionalCampusIds: formState.additionalCampusIds,
        email: formState.email,
        status: formState.status,
        position: formState.position,
        positions: formState.positions,
        divisionCodes: formState.divisionCodes,
      })

      if (res && !res.success) {
        setDrawerError(res.error || "Không thể lưu thay đổi.")
        setSaving(false)
        return
      }

      setTeachers((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? {
                ...t,
                teacherName: formState.teacherName,
                dateOfBirth: formState.dateOfBirth || null,
                department: formState.department || null,
                departmentAssignments: deptAssignments.map((da) => ({
                  departmentId: da.departmentId,
                  departmentName:
                    (departments || []).find((d: any) => d.id === da.departmentId)?.name || "",
                  position: da.position || "GV",
                })),
                divisionCodes: formState.divisionCodes || [],
                positions: formState.positions || [],
                mainSubject: formState.mainSubject || null,
                campusId: formState.campusId || null,
                email: formState.email || null,
                campus:
                  (campuses || []).find((c: any) => c.id === formState.campusId)?.campusName || null,
                additionalCampuses: (campuses || [])
                  .filter((c: any) => formState.additionalCampusIds?.includes(c.id))
                  .map((c: any) => ({ id: c.id, campusName: c.campusName })),
                additionalCampusIds: formState.additionalCampusIds || [],
                position: formState.position || "GV",
                status: formState.status,
              }
            : t
        )
      )
      setDrawerOpen(false)
      setEditingId(null)
      toast.success(`Đã cập nhật hồ sơ giáo viên ${formState.teacherName}.`)
    } catch (e: any) {
      setDrawerError("Lỗi khi lưu: " + (e?.message || "Vui lòng thử lại."))
    }
    setSaving(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa giáo viên "${name}"?\nTài khoản đăng nhập liên kết cũng sẽ bị xóa.`)) return
    try {
      await deleteTeacherAction(id)
      setTeachers((prev) => prev.filter((t) => t.id !== id))
      setSelectedIds((prev) => prev.filter((sid) => sid !== id))
      toast.success(`Đã xóa giáo viên ${name}.`)
    } catch (e: any) {
      toast.error("Lỗi khi xóa: " + (e?.message || "Vui lòng thử lại."))
    }
  }

  const handleResetPassword = async (id: string, code: string, name: string) => {
    if (!confirm(`Đặt lại mật khẩu của "${name}" về mặc định (${code})?`)) return
    try {
      await resetTeacherPasswordAction(id)
      toast.success(`Đã đặt lại mật khẩu của ${name} về: ${code}`)
    } catch (e: any) {
      toast.error("Không thể đặt lại mật khẩu: " + (e?.message || "Vui lòng thử lại."))
    }
  }

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!defaultYearId) {
      toast.error("Không tìm thấy năm học đang hoạt động để import.")
      return
    }
    setImporting(true)
    setImportWarningMsg("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/admin/teachers/import", { method: "POST", body: formData })
      const parsed = await res.json()
      if (!parsed.success) {
        toast.error(parsed.error || "Không thể đọc tệp dữ liệu.")
        setImporting(false)
        return
      }
      const result = await importTeachersAction(parsed.data, defaultYearId)
      if (result.success) {
        if (result.warnings && result.warnings.length > 0) {
          setImportWarningMsg("Cảnh báo nhập trùng:\n" + result.warnings.join("\n"))
        }
        const createdCount = result.created ?? 0
        const skippedCount = result.skipped ?? 0
        if (createdCount > 0) {
          toast.success(`Import thành công ${createdCount} giáo viên (bỏ qua ${skippedCount}).`)
          router.refresh()
        } else if (!result.warnings || result.warnings.length === 0) {
          toast.error("Không có giáo viên mới nào trong tệp để import.")
        }
      }
    } catch (err: any) {
      toast.error("Lỗi khi import: " + (err?.message || "Vui lòng thử lại."))
    }
    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const downloadTemplate = () => {
    const csv =
      "STT,Mã GV,Họ và tên,Email nhận thông báo,Cơ sở,Tổ chuyên môn\n1,GV001,Nguyễn Văn A,nguyenvana@skylineschool.edu.vn,CS1,Tổ Tự Nhiên"
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "danh_sach_giao_vien.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleBulkAssignRole = async (roleCode: string) => {
    if (!roleCode || selectedDisplayedIds.length === 0) return
    const roleName = (roles || []).find((r: any) => r.code === roleCode)?.name || roleCode
    if (
      !confirm(
        `Cấp tài khoản và gán nhóm quyền "${roleName}" cho ${selectedDisplayedIds.length} giáo viên đã chọn?`
      )
    ) {
      return
    }
    setAssigning(true)
    const res = await assignTeachersToRoleAction(selectedDisplayedIds, roleCode)
    if (res.success) {
      setSelectedIds([])
      toast.success(`Đã gán nhóm quyền "${roleName}" cho ${selectedDisplayedIds.length} giáo viên.`)
      router.refresh()
    } else {
      toast.error("Lỗi phân quyền: " + res.error)
    }
    setAssigning(false)
  }

  const resetAllFilters = () => {
    setSearch("")
    setActiveBlockTab("")
    setFilterCampus("")
    setFilterDepartment("")
    setFilterSubject("")
    setFilterStatus("")
  }

  const allDisplayedSelected =
    displayed.length > 0 && selectedDisplayedIds.length === displayed.length

  return (
    <div className="space-y-5 pb-10 font-sans">
      {/* Shared Sky-Line PageHeader */}
      <PageHeader
        title="Quản lý Giáo viên"
        description="Quản lý hồ sơ nhân sự giảng dạy, phân công Tổ chuyên môn và quyền truy cập hệ thống."
        breadcrumbs={[
          { label: "Quản lý Đào tạo" },
          { label: "Quản lý Giáo viên" },
        ]}
        icon={<Users className="w-5 h-5 text-[#003B3A]" />}
      />

      {/* Import duplicate warnings (if any) */}
      {importWarningMsg && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <span className="whitespace-pre-line flex-1">{importWarningMsg}</span>
          <button
            type="button"
            onClick={() => setImportWarningMsg("")}
            className="text-amber-500 hover:text-amber-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Unified Academic Ledger Summary Strip (Blocks + Status + Search) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs px-4 py-3 flex flex-wrap items-center justify-between gap-3 tabular-nums">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveBlockTab("")
              setFilterStatus("")
              setSelectedIds([])
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border cursor-pointer ${
              !activeBlockTab && !filterStatus
                ? "bg-[#003B3A] text-white border-[#003B3A]"
                : "bg-[#F8FAFC] text-slate-700 border-[#E2E8F0] hover:bg-slate-100"
            }`}
          >
            Tất cả: <span className="font-semibold ml-1">{teachers.length}</span>
          </button>

          {blocks.map((block) => {
            const isActive = activeBlockTab === block
            return (
              <button
                key={block}
                type="button"
                onClick={() => {
                  setActiveBlockTab(isActive ? "" : block)
                  setSelectedIds([])
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border cursor-pointer ${
                  isActive
                    ? "bg-[#003B3A] text-white border-[#003B3A]"
                    : "bg-[#F8FAFC] text-slate-700 border-[#E2E8F0] hover:bg-slate-100"
                }`}
              >
                {block}: <span className="font-semibold ml-1">{blockCounts[block] || 0}</span>
              </button>
            )
          })}

          <span className="hidden sm:inline-block h-5 w-px bg-[#E2E8F0] mx-0.5" />

          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === "ACTIVE" ? "" : "ACTIVE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border flex items-center gap-1.5 cursor-pointer ${
              filterStatus === "ACTIVE"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            On: <span className="font-semibold">{activeCount}</span>
          </button>

          {inactiveCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterStatus(filterStatus === "INACTIVE" ? "" : "INACTIVE")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border flex items-center gap-1.5 cursor-pointer ${
                filterStatus === "INACTIVE"
                  ? "bg-rose-600 text-white border-rose-600"
                  : "bg-rose-50/70 text-rose-800 border-rose-200 hover:bg-rose-100/70"
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              Off: <span className="font-semibold">{inactiveCount}</span>
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, mã GV, email, cơ sở..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl outline-none focus:bg-white focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Xóa từ khóa"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter & Action Toolbar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {!isCampusLocked && (campuses || []).length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">Cơ sở:</label>
              <select
                value={filterCampus}
                onChange={(e) => setFilterCampus(e.target.value)}
                className="h-9 px-3 text-xs font-medium bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-slate-800 outline-none focus:bg-white focus:border-[#00A19A] min-w-[120px] cursor-pointer"
              >
                <option value="">Tất cả</option>
                {(campuses || []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.campusName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">Tổ CM:</label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="h-9 px-3 text-xs font-medium bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-slate-800 outline-none focus:bg-white focus:border-[#00A19A] min-w-[160px] max-w-[210px] cursor-pointer"
            >
              <option value="">Tất cả ({(departments || []).length})</option>
              {(departments || []).map((d: any) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">Môn dạy:</label>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="h-9 px-3 text-xs font-medium bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-slate-800 outline-none focus:bg-white focus:border-[#00A19A] min-w-[140px] max-w-[190px] cursor-pointer"
            >
              <option value="">Tất cả</option>
              {(subjects || []).map((s: any) => (
                <option key={s.id} value={s.subjectName}>
                  {s.subjectName}
                </option>
              ))}
            </select>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Xóa lọc
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openCreateDrawer}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#003B3A] hover:bg-[#002B2A] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Thêm giáo viên
          </button>

          <label className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#F0FDFA] hover:bg-[#CCFBF1]/70 text-[#003B3A] border border-[#00A19A]/40 text-xs font-semibold transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-[#008B85]" />
            {importing ? "Đang xử lý..." : "Import Excel"}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileImport}
              className="hidden"
              disabled={importing}
            />
          </label>

          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-[#E2E8F0] text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Tải mẫu
          </button>
        </div>
      </div>

      {/* Contextual Bulk Action Bar */}
      {selectedDisplayedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#F0FDFA] border border-[#00A19A]/40 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-[#003B3A] tabular-nums">
              Đã chọn {selectedDisplayedIds.length} giáo viên
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-[#00736E] hover:underline font-medium cursor-pointer"
            >
              Bỏ chọn
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-600 font-medium">Phân quyền hàng loạt:</label>
            <select
              defaultValue=""
              disabled={assigning}
              onChange={(e) => {
                const val = e.target.value
                e.target.value = ""
                handleBulkAssignRole(val)
              }}
              className="h-8 px-3 rounded-xl border border-[#00A19A]/50 bg-white text-xs font-semibold text-[#003B3A] outline-none cursor-pointer"
            >
              <option value="">-- Cấp nhóm quyền --</option>
              {(roles || []).map((r: any) => (
                <option key={r.code} value={r.code}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Sky-Line Academic Ledger Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#003B3A] border-b border-[#003B3A]">
              <tr className="text-[11px] font-semibold whitespace-nowrap">
                <th className="py-3 px-3 text-center w-10 text-white">
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả giáo viên đang hiển thị"
                    checked={allDisplayedSelected}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(displayed.map((t) => t.id))
                      else setSelectedIds([])
                    }}
                    className="rounded border-white/40 accent-[#00A19A] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3 text-center text-teal-100 w-12">STT</th>
                <th className="py-3 px-3 text-white w-32">Mã GV</th>
                <th className="py-3 px-3 text-white min-w-[230px]">Giáo viên</th>
                <th className="py-3 px-3 text-teal-100 w-32">Cơ sở</th>
                <th className="py-3 px-3 text-teal-100 min-w-[200px]">Tổ chuyên môn & Phụ trách</th>
                <th className="py-3 px-3 text-teal-100 w-32">Chức vụ</th>
                <th className="py-3 px-3 text-center text-[#5EEAD4] w-24">Trạng thái</th>
                <th className="py-3 px-3 text-center text-white w-32">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 px-4 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <GraduationCap className="w-8 h-8 text-slate-300" />
                      <p className="font-medium text-slate-700">
                        Không tìm thấy giáo viên phù hợp
                      </p>
                      <p className="text-xs text-slate-400">
                        Thử thay đổi từ khóa tìm kiếm hoặc xóa bộ lọc đang áp dụng.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((t, index) => {
                  const stt = startIndex + index + 1
                  const isSelected = selectedDisplayedIds.includes(t.id)
                  const loginUsername = t.user?.email || t.teacherCode
                  const hasCustomLogin = loginUsername && loginUsername !== t.teacherCode

                  return (
                    <tr
                      key={t.id}
                      className={`transition-colors align-middle ${
                        isSelected
                          ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]"
                          : "hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <td className="py-3 px-3 text-center align-middle">
                        <input
                          type="checkbox"
                          aria-label={`Chọn ${t.teacherName}`}
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds((prev) => [...prev, t.id])
                            else setSelectedIds((prev) => prev.filter((id) => id !== t.id))
                          }}
                          className="rounded border-slate-300 accent-[#00A19A] cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-3 text-center text-slate-500 font-medium align-middle">
                        {stt}
                      </td>

                      <td className="py-3 px-3 align-middle whitespace-nowrap">
                        <span className="inline-block font-mono text-[11px] font-semibold text-[#00736E] bg-[#F0FDFA] border border-[#CCFBF1] px-2 py-0.5 rounded-md">
                          {t.teacherCode}
                        </span>
                        {hasCustomLogin && (
                          <div
                            className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[130px]"
                            title={`Tài khoản: ${loginUsername}`}
                          >
                            TK: {loginUsername}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 align-middle">
                        <button
                          type="button"
                          onClick={() => openEditDrawer(t)}
                          className="text-left group/name cursor-pointer"
                          title="Nhấn để chỉnh sửa thông tin giáo viên"
                        >
                          <div className="font-semibold text-slate-900 group-hover/name:text-[#00736E] group-hover/name:underline leading-snug">
                            {t.teacherName}
                          </div>
                        </button>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                          {t.email ? (
                            <span className="inline-flex items-center gap-1 text-slate-500">
                              <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              <span className="truncate max-w-[240px]">{t.email}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                              Chưa có email
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{t.campus || "—"}</span>
                        </div>
                        {t.additionalCampuses?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {t.additionalCampuses.map((ac: any) => (
                              <span
                                key={ac.id}
                                className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium"
                              >
                                +{ac.campusName}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 align-middle">
                        <div className="flex flex-wrap gap-1 items-center">
                          {t.departmentAssignments && t.departmentAssignments.length > 0 ? (
                            t.departmentAssignments.map((da: any) => (
                              <span
                                key={da.departmentId || da.departmentName}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 text-[11px] font-medium"
                              >
                                {da.departmentName || da.departmentCode}
                                {da.position && da.position !== "GV" && (
                                  <span className="px-1 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                                    {da.position}
                                  </span>
                                )}
                              </span>
                            ))
                          ) : t.department ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 text-[11px] font-medium">
                              {t.department}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Chưa phân tổ</span>
                          )}
                        </div>

                        {t.divisionCodes && t.divisionCodes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {t.divisionCodes.map((dCode: string) => {
                              const div = ACADEMIC_DIVISIONS.find((x: any) => x.code === dCode)
                              return (
                                <span
                                  key={dCode}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#F0FDFA] text-[#003B3A] border border-[#99F6E4] text-[10px] font-semibold"
                                >
                                  <Shield className="w-2.5 h-2.5 text-[#00736E]" />
                                  {div?.shortName || div?.name || dCode}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 align-middle">
                        <PositionBadges position={t.position} positions={t.positions} />
                        {t.mainSubject && (
                          <div className="text-[11px] text-slate-500 mt-1 truncate max-w-[140px]">
                            {t.mainSubject}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap align-middle">
                        {t.status === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            On
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Off
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap align-middle">
                        <div className="inline-flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditDrawer(t)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#003B3A] hover:bg-[#F0FDFA] border border-transparent hover:border-[#99F6E4] transition-colors cursor-pointer"
                            title="Chỉnh sửa hồ sơ"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResetPassword(t.id, t.teacherCode, t.teacherName)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors cursor-pointer"
                            title="Đặt lại mật khẩu về Mã GV"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(t.id, t.teacherName)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                            title="Xóa giáo viên"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Smart Pagination Footer */}
        {displayed.length > 0 && (
          <div className="px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs tabular-nums">
            <div className="flex flex-wrap items-center gap-3 text-slate-600">
              <span>
                Hiển thị{" "}
                <strong className="text-slate-900">
                  {startIndex + 1}–{Math.min(displayed.length, startIndex + itemsPerPage)}
                </strong>{" "}
                trong số <strong className="text-slate-900">{displayed.length}</strong> giáo viên
              </span>
              <span className="text-slate-300">|</span>
              <label className="inline-flex items-center gap-1.5 text-slate-500">
                <span>Số dòng:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-2 py-1 rounded-lg border border-[#E2E8F0] bg-white text-slate-800 font-semibold outline-none cursor-pointer"
                >
                  {[15, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Trước
                </button>

                {getVisiblePages(safePage, totalPages).map((item, i) =>
                  item === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-slate-400 select-none">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCurrentPage(item)}
                      className={`min-w-[32px] h-8 px-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                        safePage === item
                          ? "bg-[#003B3A] border-[#003B3A] text-white"
                          : "bg-white border-[#E2E8F0] text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
                >
                  Sau
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Slide-Over Drawer */}
      <TeacherFormDrawer
        open={drawerOpen}
        mode={drawerMode}
        form={formState}
        setForm={setFormState}
        departments={departments}
        subjects={subjects}
        campuses={campuses}
        isCampusLocked={isCampusLocked}
        saving={saving}
        errorMsg={drawerError}
        onClose={() => {
          setDrawerOpen(false)
          setDrawerError("")
        }}
        onSubmit={handleSubmitDrawer}
      />
    </div>
  )
}
