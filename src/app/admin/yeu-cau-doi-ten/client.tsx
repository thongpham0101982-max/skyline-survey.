"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import toast from "react-hot-toast"
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  UserPen,
  X,
  XCircle,
} from "lucide-react"
import { PageHeader } from "@/components/PageHeader"
import { normalizePersonName } from "@/lib/nameNormalizer"

interface ClassOption {
  id: string
  classCode: string
  className: string
  grade: string
  level: string
  campusId: string
  campusCode: string
  campusName: string
}

interface StudentOption {
  id: string
  studentCode: string
  vnEduCode: string | null
  studentName: string
  gender: string | null
  dateOfBirth: string | null
  status: string
  classId: string
}

interface NameChangeItem {
  id: string
  academicYearId: string
  academicYearName: string
  campusId: string
  campusCode: string
  campusName: string
  grade: string
  classId: string
  className: string
  studentId: string
  studentCode: string
  vnEduCode: string | null
  oldName: string
  newName: string
  reason: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  requestedById: string | null
  requestedByName: string
  updatedById: string | null
  updatedByName: string
  approvedById: string | null
  approvedByName: string | null
  approvedAt: string | null
  rejectReason: string | null
  createdAt: string
  updatedAt: string
}

interface SummaryCounts {
  total: number
  pending: number
  approved: number
  rejected: number
}

function formatDateTimeVN(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, "0")
  // Format dd/MM/yyyy HH:mm:ss in Asia/Ho_Chi_Minh
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(d)
    const get = (t: string) => parts.find((p) => p.type === t)?.value || "00"
    return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}:${get("second")}`
  } catch {
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }
}

export function StudentNameRequestsClient() {
  const searchParams = useSearchParams()
  const deepLinkAppliedRef = useRef(false)

  // Global & options state
  const [academicYear, setAcademicYear] = useState<{ id: string; name: string } | null>(null)
  const [grades, setGrades] = useState<string[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [canApprove, setCanApprove] = useState(false)

  // Filter & pagination state
  const [filterGrade, setFilterGrade] = useState<string>("ALL")
  const [filterClassId, setFilterClassId] = useState<string>("ALL")
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL")
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageInput, setPageInput] = useState("1")
  const [pageSize, setPageSize] = useState(25)

  // List state
  const [items, setItems] = useState<NameChangeItem[]>([])
  const [summary, setSummary] = useState<SummaryCounts>({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Create / Edit Modal state
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingItem, setEditingItem] = useState<NameChangeItem | null>(null)
  const [formGrade, setFormGrade] = useState("")
  const [formClassId, setFormClassId] = useState("")
  const [formStudents, setFormStudents] = useState<StudentOption[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [formStudentId, setFormStudentId] = useState("")
  const [formNewName, setFormNewName] = useState("")
  const [formReason, setFormReason] = useState("")

  // Reject Modal state
  const [rejectTargetIds, setRejectTargetIds] = useState<string[] | null>(null)
  const [rejectReasonInput, setRejectReasonInput] = useState("")

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
    }, 280)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Fetch cascading options (grades, classes, permissions)
  const fetchOptions = useCallback(async () => {
    try {
      const res = await fetch("/api/student-name-requests/options", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      setAcademicYear(data.academicYear || null)
      setGrades(Array.isArray(data.grades) ? data.grades : [])
      setClasses(Array.isArray(data.classes) ? data.classes : [])
      setCanApprove(Boolean(data.permissions?.canApprove))
    } catch (err) {
      console.error("Failed to fetch options:", err)
    }
  }, [])

  // Fetch students when formClassId changes
  const fetchStudentsForClass = useCallback(async (classId: string) => {
    if (!classId) {
      setFormStudents([])
      return
    }
    setLoadingStudents(true)
    try {
      const res = await fetch(
        `/api/student-name-requests/options?classId=${encodeURIComponent(classId)}`,
        { cache: "no-store" }
      )
      if (res.ok) {
        const data = await res.json()
        setFormStudents(Array.isArray(data.students) ? data.students : [])
      }
    } catch (err) {
      console.error("Failed to load class students:", err)
    } finally {
      setLoadingStudents(false)
    }
  }, [])

  // Fetch requests list
  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (filterGrade && filterGrade !== "ALL") qs.set("grade", filterGrade)
      if (filterClassId && filterClassId !== "ALL") qs.set("classId", filterClassId)
      if (filterStatus && filterStatus !== "ALL") qs.set("status", filterStatus)
      if (debouncedSearch) qs.set("search", debouncedSearch)
      qs.set("page", String(page))
      qs.set("pageSize", String(pageSize))

      const res = await fetch(`/api/student-name-requests?${qs.toString()}`, { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Không thể tải danh sách yêu cầu đổi tên.")
        return
      }
      if (data.academicYear) setAcademicYear(data.academicYear)
      setItems(Array.isArray(data.items) ? data.items : [])
      setSummary(data.summary || { total: 0, pending: 0, approved: 0, rejected: 0 })
      setTotal(Number(data.pagination?.total || 0))
      setTotalPages(Number(data.pagination?.totalPages || 1))
      setPage(Number(data.pagination?.page || 1))
      setPageInput(String(data.pagination?.page || 1))
      setSelectedIds([])
    } catch (err) {
      console.error("Fetch name change list error:", err)
      toast.error("Lỗi kết nối khi tải danh sách.")
    } finally {
      setLoading(false)
    }
  }, [filterGrade, filterClassId, filterStatus, debouncedSearch, page, pageSize])

  useEffect(() => {
    fetchOptions()
  }, [fetchOptions])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  // Deep link support (?classId=...&studentId=...&action=new)
  useEffect(() => {
    if (deepLinkAppliedRef.current || classes.length === 0) return
    const qClassId = searchParams.get("classId")
    const qStudentId = searchParams.get("studentId")
    const qAction = searchParams.get("action")
    if (qClassId) {
      const matchedClass = classes.find((c) => c.id === qClassId)
      if (matchedClass) {
        deepLinkAppliedRef.current = true
        setFilterGrade(matchedClass.grade || "ALL")
        setFilterClassId(matchedClass.id)
        if (qAction === "new") {
          setEditingItem(null)
          setFormGrade(matchedClass.grade || "")
          setFormClassId(matchedClass.id)
          setFormStudentId(qStudentId || "")
          setFormNewName("")
          setFormReason("")
          fetchStudentsForClass(matchedClass.id)
          setShowFormModal(true)
        }
      }
    }
  }, [classes, searchParams, fetchStudentsForClass])

  // Filtered class lists for toolbar & modal
  const filterClasses = useMemo(() => {
    if (!filterGrade || filterGrade === "ALL") return classes
    return classes.filter((c) => c.grade === filterGrade)
  }, [classes, filterGrade])

  const modalClasses = useMemo(() => {
    if (!formGrade) return classes
    return classes.filter((c) => c.grade === formGrade)
  }, [classes, formGrade])

  const selectedStudent = useMemo(
    () => formStudents.find((s) => s.id === formStudentId) || null,
    [formStudents, formStudentId]
  )

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds]
  )

  const canEditSelected = selectedItems.length === 1 && selectedItems[0].status !== "APPROVED"
  const deletableSelected = selectedItems.filter((i) => i.status !== "APPROVED")
  const approvableSelected = selectedItems.filter((i) => i.status === "PENDING")

  // Handlers
  const openCreateModal = () => {
    setEditingItem(null)
    const initGrade = filterGrade !== "ALL" ? filterGrade : ""
    const initClassId = filterClassId !== "ALL" ? filterClassId : ""
    setFormGrade(initGrade)
    setFormClassId(initClassId)
    setFormStudentId("")
    setFormNewName("")
    setFormReason("")
    if (initClassId) {
      fetchStudentsForClass(initClassId)
    } else {
      setFormStudents([])
    }
    setShowFormModal(true)
  }

  const openEditModal = (item: NameChangeItem) => {
    if (item.status === "APPROVED") {
      toast.error("Yêu cầu đã duyệt không thể chỉnh sửa.")
      return
    }
    setEditingItem(item)
    setFormGrade(item.grade)
    setFormClassId(item.classId)
    setFormStudentId(item.studentId)
    setFormNewName(item.newName)
    setFormReason(item.reason)
    fetchStudentsForClass(item.classId)
    setShowFormModal(true)
  }

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem && !formStudentId) {
      toast.error("Vui lòng chọn học sinh cần đổi tên.")
      return
    }
    if (!formNewName.trim()) {
      toast.error("Vui lòng nhập tên mới của học sinh.")
      return
    }
    if (!formReason.trim()) {
      toast.error("Vui lòng nhập lý do đổi tên.")
      return
    }

    setSubmitting(true)
    try {
      const url = editingItem
        ? `/api/student-name-requests/${editingItem.id}`
        : "/api/student-name-requests"
      const method = editingItem ? "PATCH" : "POST"
      const payload = editingItem
        ? { newName: formNewName.trim(), reason: formReason.trim() }
        : { studentId: formStudentId, newName: formNewName.trim(), reason: formReason.trim() }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Không thể lưu yêu cầu.")
        return
      }
      toast.success(data.message || "Đã lưu yêu cầu đổi tên thành công.")
      setShowFormModal(false)
      setEditingItem(null)
      await fetchList()
    } catch (err) {
      console.error("Save name change request error:", err)
      toast.error("Lỗi kết nối máy chủ.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteItems = async (targets: NameChangeItem[]) => {
    const deletable = targets.filter((t) => t.status !== "APPROVED")
    if (deletable.length === 0) {
      toast.error("Không thể xóa yêu cầu đã được duyệt.")
      return
    }
    const label =
      deletable.length === 1
        ? `yêu cầu đổi tên của học sinh "${deletable[0].oldName}"`
        : `${deletable.length} yêu cầu đổi tên đã chọn`
    if (!confirm(`Xác nhận xóa bỏ ${label}?`)) return

    setSubmitting(true)
    try {
      let deletedCount = 0
      for (const item of deletable) {
        const res = await fetch(`/api/student-name-requests/${item.id}`, { method: "DELETE" })
        if (res.ok) deletedCount++
      }
      if (deletedCount > 0) {
        toast.success(`Đã xóa ${deletedCount} yêu cầu đổi tên.`)
        await fetchList()
      } else {
        toast.error("Không thể xóa yêu cầu đã chọn.")
      }
    } catch {
      toast.error("Lỗi kết nối khi xóa yêu cầu.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (ids: string[]) => {
    if (ids.length === 0) return
    const msg =
      ids.length === 1
        ? "Xác nhận DUYỆT yêu cầu đổi tên này? Họ tên học sinh sẽ được cập nhật tự động trên hệ thống."
        : `Xác nhận DUYỆT ${ids.length} yêu cầu đổi tên đã chọn? Họ tên học sinh sẽ được cập nhật tự động trên hệ thống.`
    if (!confirm(msg)) return

    setSubmitting(true)
    try {
      const res = await fetch("/api/student-name-requests/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: "APPROVE" }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Không thể duyệt yêu cầu.")
        return
      }
      toast.success(data.message || "Đã duyệt yêu cầu đổi tên.")
      await fetchList()
    } catch {
      toast.error("Lỗi kết nối khi duyệt yêu cầu.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectTargetIds || rejectTargetIds.length === 0) return

    setSubmitting(true)
    try {
      const res = await fetch("/api/student-name-requests/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: rejectTargetIds,
          action: "REJECT",
          rejectReason: rejectReasonInput.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Không thể từ chối yêu cầu.")
        return
      }
      toast.success(data.message || "Đã từ chối yêu cầu đổi tên.")
      setRejectTargetIds(null)
      setRejectReasonInput("")
      await fetchList()
    } catch {
      toast.error("Lỗi kết nối khi từ chối yêu cầu.")
    } finally {
      setSubmitting(false)
    }
  }

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(items.map((i) => i.id))
    else setSelectedIds([])
  }

  const toggleSelectOne = (id: string, checked: boolean) => {
    if (checked) setSelectedIds((prev) => Array.from(new Set([...prev, id])))
    else setSelectedIds((prev) => prev.filter((x) => x !== id))
  }

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseInt(pageInput, 10)
    if (!Number.isNaN(num)) {
      const clamped = Math.min(totalPages, Math.max(1, num))
      setPage(clamped)
      setPageInput(String(clamped))
    }
  }

  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endIdx = Math.min(total, page * pageSize)

  const headerTitle = academicYear?.name
    ? `[${academicYear.name}] Yêu cầu đổi tên Học sinh`
    : "Yêu cầu đổi tên Học sinh"

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title={headerTitle}
        description="Tiếp nhận, phê duyệt và lưu vết lịch sử điều chỉnh họ tên học sinh theo hồ sơ chính thức."
        breadcrumbs={[
          { label: "Quản lý Đào tạo" },
          { label: "Quản lý Lớp học", href: "/admin/classes" },
          { label: "Yêu cầu đổi tên Học sinh" },
        ]}
        icon={<UserPen className="w-5 h-5 text-[#003B3A]" />}
      />

      {/* Unified Academic Ledger Summary Strip */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs px-4 py-3 flex flex-wrap items-center justify-between gap-3 tabular-nums">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setFilterStatus("ALL")
              setPage(1)
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
              filterStatus === "ALL"
                ? "bg-[#003B3A] text-white border-[#003B3A]"
                : "bg-[#F8FAFC] text-slate-700 border-[#E2E8F0] hover:bg-slate-100"
            }`}
          >
            Tất cả yêu cầu: <span className="font-semibold ml-1">{summary.total}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterStatus("PENDING")
              setPage(1)
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border flex items-center gap-1.5 ${
              filterStatus === "PENDING"
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-amber-50/70 text-amber-800 border-amber-200 hover:bg-amber-100/70"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Chờ duyệt: <span className="font-semibold">{summary.pending}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterStatus("APPROVED")
              setPage(1)
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border flex items-center gap-1.5 ${
              filterStatus === "APPROVED"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã duyệt: <span className="font-semibold">{summary.approved}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterStatus("REJECTED")
              setPage(1)
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border flex items-center gap-1.5 ${
              filterStatus === "REJECTED"
                ? "bg-rose-600 text-white border-rose-600"
                : "bg-rose-50/70 text-rose-800 border-rose-200 hover:bg-rose-100/70"
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            Từ chối: <span className="font-semibold">{summary.rejected}</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo Mã HS, họ tên, lớp, người cập nhật..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl outline-none focus:bg-white focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 transition-all"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="Xóa từ khóa"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter & Action Toolbar (matching VNedu mẫu + Sky-Line Academic Ledger) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">Khối học:</label>
            <select
              value={filterGrade}
              onChange={(e) => {
                setFilterGrade(e.target.value)
                setFilterClassId("ALL")
                setPage(1)
              }}
              className="h-9 px-3 text-xs font-medium bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-slate-800 outline-none focus:bg-white focus:border-[#00A19A] min-w-[130px]"
            >
              <option value="ALL">[Tất cả]</option>
              {grades.map((g) => (
                <option key={g} value={g}>
                  { /^\d+$/.test(g) ? `Khối ${g}` : g }
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">Lớp học:</label>
            <select
              value={filterClassId}
              onChange={(e) => {
                setFilterClassId(e.target.value)
                setPage(1)
              }}
              className="h-9 px-3 text-xs font-medium bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-slate-800 outline-none focus:bg-white focus:border-[#00A19A] min-w-[160px]"
            >
              <option value="ALL">[Tất cả]</option>
              {filterClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#003B3A] hover:bg-[#002B2A] text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Thêm mới
          </button>

          <button
            type="button"
            disabled={!canEditSelected || submitting}
            onClick={() => canEditSelected && openEditModal(selectedItems[0])}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-[#E2E8F0] text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Chọn 1 yêu cầu chưa duyệt để chỉnh sửa"
          >
            <Pencil className="w-3.5 h-3.5 text-[#008B85]" />
            Sửa
          </button>

          <button
            type="button"
            disabled={deletableSelected.length === 0 || submitting}
            onClick={() => handleDeleteItems(deletableSelected)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-[#E2E8F0] hover:border-rose-200 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Chọn các yêu cầu chưa duyệt để xóa bỏ"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Xóa bỏ
          </button>

          {canApprove && approvableSelected.length > 0 && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleApprove(approvableSelected.map((i) => i.id))}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              Duyệt ({approvableSelected.length})
            </button>
          )}

          <button
            type="button"
            onClick={() => fetchList()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#F8FAFC] hover:bg-slate-100 text-slate-700 border border-[#E2E8F0] text-xs font-semibold transition-colors"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#008B85] ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Sky-Line Academic Ledger Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#003B3A] border-b border-[#003B3A]">
              <tr className="text-[11px] font-semibold whitespace-nowrap">
                <th className="py-3 px-3 text-center w-10 text-white">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedIds.length === items.length}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="rounded border-white/40 accent-[#00A19A] cursor-pointer"
                    aria-label="Chọn tất cả"
                  />
                </th>
                <th className="py-3 px-3 text-center text-teal-100 w-12">STT</th>
                <th className="py-3 px-3 text-white">Lớp học</th>
                <th className="py-3 px-3 text-teal-100">Mã HS</th>
                <th className="py-3 px-3 text-white">Họ tên cũ</th>
                <th className="py-3 px-3 text-[#5EEAD4]">Họ tên mới</th>
                <th className="py-3 px-3 text-teal-100">Lý do đổi tên</th>
                <th className="py-3 px-3 text-teal-100">Người cập nhật</th>
                <th className="py-3 px-3 text-teal-100">Ngày cập nhật</th>
                <th className="py-3 px-3 text-center text-[#5EEAD4]">Trạng thái duyệt</th>
                <th className="py-3 px-3 text-teal-100">Người duyệt</th>
                <th className="py-3 px-3 text-center text-white">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500">
                    Đang tải dữ liệu yêu cầu đổi tên...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <UserPen className="w-8 h-8 text-slate-300" />
                      <p className="font-medium text-slate-700">Chưa có yêu cầu đổi tên học sinh nào</p>
                      <p className="text-xs text-slate-400">
                        Nhấn nút &ldquo;Thêm mới&rdquo; để lập yêu cầu điều chỉnh họ tên học sinh theo hồ sơ.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const isSelected = selectedIds.includes(item.id)
                  const stt = (page - 1) * pageSize + idx + 1
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors align-middle ${
                        isSelected
                          ? "bg-[#F0FDFA]/70 hover:bg-[#F0FDFA]"
                          : "hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <td className="py-3 px-3 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectOne(item.id, e.target.checked)}
                          className="rounded border-slate-300 accent-[#00A19A] cursor-pointer"
                          aria-label={`Chọn yêu cầu ${item.studentCode}`}
                        />
                      </td>
                      <td className="py-3 px-3 text-center text-slate-500 font-medium align-middle">
                        {stt}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap align-middle">
                        {item.className || "—"}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap align-middle">
                        <div>{item.studentCode}</div>
                        {item.vnEduCode && (
                          <div className="text-[10px] text-slate-400">VNEdu: {item.vnEduCode}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 align-middle">
                        <span className={item.status === "APPROVED" ? "line-through text-slate-400" : "font-medium text-slate-700"}>
                          {item.oldName}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#003B3A] align-middle">
                        {item.newName}
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-[240px] align-middle">
                        <div className="line-clamp-2" title={item.reason}>
                          {item.reason}
                        </div>
                        {item.status === "REJECTED" && item.rejectReason && (
                          <div className="mt-1 text-[11px] text-rose-600">
                            Lý do từ chối: {item.rejectReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap align-middle">
                        {item.updatedByName}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap align-middle">
                        {formatDateTimeVN(item.updatedAt)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap align-middle">
                        {item.status === "APPROVED" ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold"
                            title={
                              item.approvedByName
                                ? `Đã duyệt bởi ${item.approvedByName} lúc ${formatDateTimeVN(item.approvedAt)}`
                                : "Đã duyệt"
                            }
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Đã duyệt
                          </span>
                        ) : item.status === "REJECTED" ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold"
                            title={item.rejectReason || "Đã từ chối"}
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Từ chối
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Chờ duyệt
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap align-middle">
                        {item.approvedByName ? (
                          <div>
                            <div className="font-medium text-slate-800">{item.approvedByName}</div>
                            {item.approvedAt && (
                              <div className="text-[10px] text-slate-400">
                                {formatDateTimeVN(item.approvedAt)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap align-middle">
                        <div className="inline-flex items-center justify-center gap-1">
                          {canApprove && item.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => handleApprove([item.id])}
                                className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors"
                                title="Duyệt yêu cầu đổi tên"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => {
                                  setRejectTargetIds([item.id])
                                  setRejectReasonInput("")
                                }}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Từ chối yêu cầu"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {item.status !== "APPROVED" && (
                            <>
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => openEditModal(item)}
                                className="p-1.5 rounded-lg text-[#008B85] hover:bg-teal-50 transition-colors"
                                title="Chỉnh sửa yêu cầu"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => handleDeleteItems([item])}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Xóa yêu cầu"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {item.status === "APPROVED" && (
                            <span className="text-[11px] text-slate-400">Đã khóa</span>
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

        {/* Pagination Footer (matching Image 3) */}
        <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 tabular-nums">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage(1)}
                className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 disabled:opacity-40"
                title="Trang đầu"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 disabled:opacity-40"
                title="Trang trước"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handlePageSubmit} className="inline-flex items-center gap-1.5">
              <span>Trang</span>
              <input
                type="text"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={handlePageSubmit}
                className="w-11 h-7 text-center bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium outline-none focus:border-[#00A19A]"
              />
              <span>của {totalPages}</span>
            </form>

            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 disabled:opacity-40"
                title="Trang sau"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage(totalPages)}
                className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 disabled:opacity-40"
                title="Trang cuối"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

            <div className="inline-flex items-center gap-1.5">
              <span>Số dòng:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
                className="h-7 px-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium outline-none focus:border-[#00A19A]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="font-medium text-slate-700">
            {startIdx} - {endIdx} / {total}
          </div>
        </div>
      </div>

      {/* Modal Thêm / Sửa yêu cầu đổi tên học sinh (matching Image 2) */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px] z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-xl overflow-hidden">
            <div className="bg-[#003B3A] px-5 py-3.5 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <UserPen className="w-4 h-4 text-[#5EEAD4]" />
                <h3 className="text-sm font-semibold">
                  {editingItem ? "Sửa yêu cầu đổi tên học sinh" : "Thêm tên học sinh"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4">
              {/* Row 1: Khối học + Lớp học */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Khối học:
                  </label>
                  <select
                    value={formGrade}
                    disabled={Boolean(editingItem)}
                    onChange={(e) => {
                      setFormGrade(e.target.value)
                      setFormClassId("")
                      setFormStudentId("")
                      setFormStudents([])
                    }}
                    className="w-full h-9 px-3 text-xs bg-white border border-[#E2E8F0] rounded-xl outline-none focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="">Chọn khối học</option>
                    {grades.map((g) => (
                      <option key={g} value={g}>
                        {/^\d+$/.test(g) ? `Khối ${g}` : g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Lớp học:
                  </label>
                  <select
                    value={formClassId}
                    disabled={Boolean(editingItem)}
                    onChange={(e) => {
                      const nextClassId = e.target.value
                      setFormClassId(nextClassId)
                      setFormStudentId("")
                      fetchStudentsForClass(nextClassId)
                    }}
                    className="w-full h-9 px-3 text-xs bg-white border border-[#E2E8F0] rounded-xl outline-none focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="">Chọn lớp học</option>
                    {modalClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.className}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Học sinh */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Học sinh: <span className="text-rose-600">*</span>
                </label>
                {editingItem ? (
                  <div className="w-full px-3 py-2 text-xs bg-slate-50 border border-[#E2E8F0] rounded-xl text-slate-700 font-medium tabular-nums">
                    {editingItem.oldName} — Mã HS: {editingItem.studentCode}
                  </div>
                ) : (
                  <select
                    value={formStudentId}
                    disabled={!formClassId || loadingStudents}
                    onChange={(e) => setFormStudentId(e.target.value)}
                    required
                    className="w-full h-9 px-3 text-xs bg-white border border-[#E2E8F0] rounded-xl outline-none focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="">
                      {!formClassId
                        ? "Chọn lớp học trước để hiển thị danh sách học sinh"
                        : loadingStudents
                        ? "Đang tải danh sách học sinh..."
                        : "Chọn học sinh đổi tên"}
                    </option>
                    {formStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.studentName} ({s.studentCode})
                      </option>
                    ))}
                  </select>
                )}

                {!editingItem && selectedStudent && (
                  <div className="mt-2 px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2 tabular-nums">
                    <span>
                      Họ tên hiện tại: <strong className="text-slate-900">{selectedStudent.studentName}</strong>
                    </span>
                    <span className="font-mono text-slate-500">
                      Mã HS: {selectedStudent.studentCode}
                      {selectedStudent.vnEduCode ? ` • VNEdu: ${selectedStudent.vnEduCode}` : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Row 3: Tên mới */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Tên mới: <span className="text-rose-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormNewName((prev) => normalizePersonName(prev))}
                    disabled={!formNewName.trim()}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#008B85] hover:text-[#003B3A] disabled:opacity-40"
                    title="Chuẩn hóa viết hoa chữ cái đầu mỗi từ"
                  >
                    <Sparkles className="w-3 h-3" />
                    Chuẩn hóa tên
                  </button>
                </div>
                <input
                  type="text"
                  value={formNewName}
                  onChange={(e) => setFormNewName(e.target.value)}
                  placeholder="Nhập tên mới của học sinh"
                  required
                  maxLength={150}
                  className="w-full h-9 px-3 text-xs bg-white border border-[#E2E8F0] rounded-xl outline-none focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15"
                />
              </div>

              {/* Row 4: Lý do đổi tên */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Lý do đổi tên: <span className="text-rose-600">*</span>
                </label>
                <textarea
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="Nhập lý do điều chỉnh họ tên học sinh (ví dụ: Cập nhật theo giấy khai sinh / hộ chiếu / đính chính lỗi chính tả...)"
                  required
                  rows={4}
                  maxLength={1000}
                  className="w-full p-3 text-xs bg-white border border-[#E2E8F0] rounded-xl outline-none focus:border-[#00A19A] focus:ring-2 focus:ring-[#00A19A]/15 resize-y"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-end gap-2.5">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 h-9 rounded-xl bg-[#003B3A] hover:bg-[#002B2A] text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {submitting ? "Đang lưu..." : "Lưu"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  disabled={submitting}
                  className="px-4 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Từ chối yêu cầu */}
      {rejectTargetIds && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px] z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-rose-700 px-5 py-3.5 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                <h3 className="text-sm font-semibold">Từ chối yêu cầu đổi tên</h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectTargetIds(null)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Lý do từ chối (tùy chọn):
                </label>
                <textarea
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  placeholder="Nhập lý do từ chối để người lập yêu cầu biết và điều chỉnh..."
                  rows={3}
                  className="w-full p-3 text-xs bg-white border border-[#E2E8F0] rounded-xl outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#F1F5F9]">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {submitting ? "Đang xử lý..." : "Xác nhận từ chối"}
                </button>
                <button
                  type="button"
                  onClick={() => setRejectTargetIds(null)}
                  disabled={submitting}
                  className="px-4 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
