// @ts-nocheck
"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Lock,
  Unlock,
  ExternalLink,
  Check,
  Calendar,
  Building2,
  RotateCcw,
  Layers,
} from "lucide-react"
import toast from "react-hot-toast"

const EVAL_PERIODS = [
  { code: "ALL", name: "Tất cả các kỳ" },
  { code: "KSĐN", name: "Khảo sát đầu năm (KSĐN)" },
  { code: "GK1", name: "Giữa kỳ 1 (GK1)" },
  { code: "CK1", name: "Cuối kỳ 1 (CK1)" },
  { code: "GK2", name: "Giữa kỳ 2 (GK2)" },
  { code: "CK2", name: "Cuối kỳ 2 (CK2)" },
]

interface Props {
  academicYears: any[]
  selectedYearId: string
  campuses: any[]
  classes: any[]
  subjects: any[]
  onNavigateToGradebook?: (params: {
    campusId: string
    grade: string
    classId: string
    subjectId: string
    period: string
  }) => void
  onRequestsUpdated?: () => void
}

function getTeacherInitials(name?: string) {
  if (!name) return "GV"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function GradeUnlockRequestsTab({
  selectedYearId,
  campuses = [],
  onNavigateToGradebook,
  onRequestsUpdated,
}: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState("ALL")
  const [selectedCampus, setSelectedCampus] = useState("ALL")
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL")
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [allRequests, setAllRequests] = useState<any[]>([])

  // Action modals
  const [activeModal, setActiveModal] = useState<"APPROVE" | "REJECT" | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [adminNote, setAdminNote] = useState("")
  const [submittingAction, setSubmittingAction] = useState(false)
  const [lockingState, setLockingState] = useState<Record<string, boolean>>({})

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const query = new URLSearchParams({
        academicYearId: selectedYearId,
        evaluationPeriod: selectedPeriod,
        status: "ALL",
      })
      const res = await fetch(`/api/admin/ktdbcl/gradebook-unlock-requests?${query.toString()}`)
      const data = await res.json()
      if (data.success) {
        setAllRequests(data.requests || [])
        if (onRequestsUpdated) onRequestsUpdated()
      } else {
        toast.error(data.error || "Không thể tải danh sách yêu cầu mở sổ")
      }
    } catch (err) {
      console.error("Lỗi tải danh sách yêu cầu mở sổ:", err)
      toast.error("Lỗi kết nối khi tải danh sách yêu cầu mở sổ")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [selectedYearId, selectedPeriod])

  // Available campus options
  const campusOptions = useMemo(() => {
    if (campuses && campuses.length > 0) {
      return campuses.map((c) => ({
        key: c.campusCode || c.id,
        label: c.campusCode ? `${c.campusCode} - ${c.campusName}` : c.campusName,
        id: c.id,
        code: c.campusCode,
        name: c.campusName,
      }))
    }
    const map = new Map<string, { key: string; label: string; code: string; name: string }>()
    allRequests.forEach((r) => {
      const key = r.campusCode || r.campusName
      if (key && !map.has(key)) {
        map.set(key, {
          key,
          label: r.campusName || r.campusCode,
          code: r.campusCode || "",
          name: r.campusName || "",
        })
      }
    })
    return Array.from(map.values())
  }, [campuses, allRequests])

  // Requests scoped by campus (for accurate KPI counts within the chosen campus & period)
  const campusScopedRequests = useMemo(() => {
    if (selectedCampus === "ALL") return allRequests
    const matchedOption = campusOptions.find((c) => c.key === selectedCampus)
    return allRequests.filter((r) => {
      if (r.campusCode && r.campusCode === selectedCampus) return true
      if (r.campusId && matchedOption?.id && r.campusId === matchedOption.id) return true
      if (r.campusName && matchedOption?.name && r.campusName === matchedOption.name) return true
      return false
    })
  }, [allRequests, selectedCampus, campusOptions])

  // Stats calculation (always consistent across status filter switches)
  const stats = useMemo(() => {
    const total = campusScopedRequests.length
    const pending = campusScopedRequests.filter((r) => r.status === "PENDING").length
    const approved = campusScopedRequests.filter((r) => r.status === "APPROVED").length
    const rejected = campusScopedRequests.filter((r) => r.status === "REJECTED").length
    const other = Math.max(0, total - pending - approved - rejected)
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)
    return {
      total,
      pending,
      approved,
      rejected,
      other,
      pendingPct: pct(pending),
      approvedPct: pct(approved),
      rejectedPct: pct(rejected),
      otherPct: pct(other),
    }
  }, [campusScopedRequests])

  // Final filtered list for the table
  const filteredRequests = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    return campusScopedRequests.filter((r) => {
      if (selectedStatus !== "ALL" && r.status !== selectedStatus) return false
      if (!keyword) return true
      return (
        (r.teacherName || "").toLowerCase().includes(keyword) ||
        (r.teacherEmail || "").toLowerCase().includes(keyword) ||
        (r.className || "").toLowerCase().includes(keyword) ||
        (r.subjectName || "").toLowerCase().includes(keyword) ||
        (r.subjectCode || "").toLowerCase().includes(keyword) ||
        (r.reason || "").toLowerCase().includes(keyword) ||
        (r.resolvedBy || "").toLowerCase().includes(keyword)
      )
    })
  }, [campusScopedRequests, selectedStatus, searchTerm])

  const hasActiveFilter =
    selectedPeriod !== "ALL" ||
    selectedCampus !== "ALL" ||
    selectedStatus !== "ALL" ||
    searchTerm.trim() !== ""

  const resetFilters = () => {
    setSelectedPeriod("ALL")
    setSelectedCampus("ALL")
    setSelectedStatus("ALL")
    setSearchTerm("")
  }

  // Handle Approve / Reject submission
  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRequest || !activeModal) return

    if (activeModal === "REJECT" && !adminNote.trim()) {
      toast.error("Vui lòng nhập lý do từ chối để thông báo cho giáo viên")
      return
    }

    try {
      setSubmittingAction(true)
      const res = await fetch("/api/admin/ktdbcl/gradebook-unlock-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          action: activeModal,
          note: adminNote.trim(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(
          data.message ||
            (activeModal === "APPROVE"
              ? "Đã duyệt mở khóa sổ điểm thành công"
              : "Đã từ chối yêu cầu mở sổ")
        )
        setActiveModal(null)
        setSelectedRequest(null)
        setAdminNote("")
        await fetchRequests()
      } else {
        toast.error(data.error || "Không thể xử lý yêu cầu")
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối: " + err.message)
    } finally {
      setSubmittingAction(false)
    }
  }

  // Quick re-lock button for approved requests
  const handleRelock = async (req: any) => {
    if (
      !confirm(
        `Xác nhận khóa lại sổ điểm môn "${req.subjectName}" của lớp "${req.className}" (Kỳ ${req.evaluationPeriod})?`
      )
    ) {
      return
    }

    try {
      setLockingState((prev) => ({ ...prev, [req.id]: true }))
      const res = await fetch("/api/admin/ktdbcl/gradebook-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: req.academicYearId,
          evaluationPeriod: req.evaluationPeriod,
          classId: req.classId,
          subjectId: req.subjectId,
          isLocked: true,
          lockReason: "Khóa lại sổ điểm sau khi GV hoàn tất cập nhật",
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Đã khóa lại sổ điểm thành công")
        await fetchRequests()
      } else {
        toast.error(data.error || "Không thể khóa lại sổ điểm")
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối: " + err.message)
    } finally {
      setLockingState((prev) => ({ ...prev, [req.id]: false }))
    }
  }

  const kpiSegments = [
    {
      key: "ALL" as const,
      label: "Tổng số yêu cầu",
      sub: "Trong phạm vi đang chọn",
      count: stats.total,
      pct: stats.total > 0 ? "100%" : "0%",
      icon: Layers,
      accentBar: "bg-[#003B3A]",
      activeBg: "bg-[#F0FDFA]/70",
      iconWrap: "bg-[#003B3A]/10 text-[#003B3A]",
      valueColor: "text-slate-900",
    },
    {
      key: "PENDING" as const,
      label: "Chờ xét duyệt",
      sub: stats.pending > 0 ? "Cần kiểm tra & phê duyệt" : "Không có yêu cầu tồn đọng",
      count: stats.pending,
      pct: `${stats.pendingPct}%`,
      icon: Clock,
      accentBar: "bg-[#D97706]",
      activeBg: "bg-amber-50/70",
      iconWrap: "bg-amber-50 text-[#D97706] border border-amber-200/70",
      valueColor: stats.pending > 0 ? "text-[#D97706]" : "text-slate-900",
    },
    {
      key: "APPROVED" as const,
      label: "Đã duyệt mở sổ",
      sub: "Đã cấp quyền chỉnh sửa cho GV",
      count: stats.approved,
      pct: `${stats.approvedPct}%`,
      icon: CheckCircle2,
      accentBar: "bg-[#059669]",
      activeBg: "bg-emerald-50/70",
      iconWrap: "bg-emerald-50 text-[#059669] border border-emerald-200/70",
      valueColor: "text-[#059669]",
    },
    {
      key: "REJECTED" as const,
      label: "Đã từ chối",
      sub: "Không phê duyệt mở sổ",
      count: stats.rejected,
      pct: `${stats.rejectedPct}%`,
      icon: AlertCircle,
      accentBar: "bg-[#E11D48]",
      activeBg: "bg-rose-50/70",
      iconWrap: "bg-rose-50 text-[#E11D48] border border-rose-200/70",
      valueColor: "text-[#E11D48]",
    },
  ]

  return (
    <div className="space-y-4">
      {/* Unified Academic Ledger Strip (Interactive KPI + Visual Distribution Bar) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-[#E2E8F0]">
          {kpiSegments.map((seg) => {
            const Icon = seg.icon
            const isActive = selectedStatus === seg.key
            return (
              <button
                key={seg.key}
                type="button"
                onClick={() => setSelectedStatus(seg.key)}
                className={`relative text-left px-5 py-4 transition-colors cursor-pointer group ${
                  isActive ? seg.activeBg : "hover:bg-[#F8FAFC]"
                }`}
              >
                {/* Top active indicator */}
                <span
                  className={`absolute inset-x-0 top-0 h-[3px] transition-opacity ${seg.accentBar} ${
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                  }`}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-600">{seg.label}</div>
                    <div className="mt-1.5 flex items-baseline gap-2 tabular-nums">
                      <span className={`text-2xl font-bold tracking-tight ${seg.valueColor}`}>
                        {seg.count}
                      </span>
                      {seg.key !== "ALL" && stats.total > 0 && (
                        <span className="text-[11px] font-medium text-slate-400">
                          {seg.pct}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500 truncate">{seg.sub}</div>
                  </div>
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${seg.iconWrap}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Visual Status Proportion Bar */}
        <div className="px-5 py-2.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 shrink-0">
            <span>Phân bổ trạng thái</span>
            <span className="text-slate-400 font-normal tabular-nums">
              ({stats.total} yêu cầu)
            </span>
          </div>

          <div className="flex-1 h-2 bg-slate-200/80 rounded-full overflow-hidden flex">
            {stats.total > 0 && (
              <>
                {stats.approved > 0 && (
                  <div
                    className="bg-[#059669] h-full transition-all duration-300"
                    style={{ width: `${(stats.approved / stats.total) * 100}%` }}
                    title={`Đã duyệt: ${stats.approved} (${stats.approvedPct}%)`}
                  />
                )}
                {stats.pending > 0 && (
                  <div
                    className="bg-[#D97706] h-full transition-all duration-300"
                    style={{ width: `${(stats.pending / stats.total) * 100}%` }}
                    title={`Chờ duyệt: ${stats.pending} (${stats.pendingPct}%)`}
                  />
                )}
                {stats.rejected > 0 && (
                  <div
                    className="bg-[#E11D48] h-full transition-all duration-300"
                    style={{ width: `${(stats.rejected / stats.total) * 100}%` }}
                    title={`Từ chối: ${stats.rejected} (${stats.rejectedPct}%)`}
                  />
                )}
                {stats.other > 0 && (
                  <div
                    className="bg-slate-400 h-full transition-all duration-300"
                    style={{ width: `${(stats.other / stats.total) * 100}%` }}
                    title={`Đã đóng / Khác: ${stats.other} (${stats.otherPct}%)`}
                  />
                )}
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 tabular-nums shrink-0">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#059669]" />
              Đã duyệt: <strong className="text-slate-800">{stats.approved}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D97706]" />
              Chờ duyệt: <strong className="text-slate-800">{stats.pending}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#E11D48]" />
              Từ chối: <strong className="text-slate-800">{stats.rejected}</strong>
            </span>
            {stats.other > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Khác: <strong className="text-slate-800">{stats.other}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Ledger Table Card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {/* Compact Filter Toolbar */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Period filter */}
            <div className="inline-flex items-center gap-1.5 bg-white border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs focus-within:border-[#008B85] transition-colors">
              <Calendar className="w-3.5 h-3.5 text-[#00736E] shrink-0" />
              <span className="text-slate-500 font-medium">Kỳ:</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
              >
                {EVAL_PERIODS.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Campus filter */}
            {campusOptions.length > 0 && (
              <div className="inline-flex items-center gap-1.5 bg-white border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs focus-within:border-[#008B85] transition-colors">
                <Building2 className="w-3.5 h-3.5 text-[#00736E] shrink-0" />
                <span className="text-slate-500 font-medium">Cơ sở:</span>
                <select
                  value={selectedCampus}
                  onChange={(e) => setSelectedCampus(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="ALL">Tất cả cơ sở</option>
                  {campusOptions.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="hidden md:inline-block text-[11px] text-slate-500 tabular-nums mr-1">
              Hiển thị <strong className="text-slate-800">{filteredRequests.length}</strong> /{" "}
              {stats.total}
            </span>
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm giáo viên, lớp, môn học, lý do..."
                className="w-full pl-8.5 pr-7 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-xl outline-none focus:border-[#008B85] text-slate-800 placeholder:text-slate-400 transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={fetchRequests}
              disabled={loading}
              title="Làm mới dữ liệu"
              className="p-1.5 bg-white border border-[#E2E8F0] rounded-xl hover:bg-slate-50 text-slate-600 hover:text-[#003B3A] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#008B85]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Sky-Line Academic Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#003B3A] border-b border-[#003B3A]">
              <tr className="text-[11px] font-semibold whitespace-nowrap">
                <th className="py-3 px-3 text-center w-11 text-white font-semibold">#</th>
                <th className="py-3 px-3 text-teal-100 font-semibold">Thời gian</th>
                <th className="py-3 px-3 text-white font-semibold">Giáo viên yêu cầu</th>
                <th className="py-3 px-3 text-teal-100 font-semibold">Lớp học</th>
                <th className="py-3 px-3 text-teal-100 font-semibold">Môn học</th>
                <th className="py-3 px-3 text-teal-100 font-semibold">Kỳ đánh giá</th>
                <th className="py-3 px-3 min-w-[210px] text-teal-100 font-semibold">
                  Lý do yêu cầu mở sổ
                </th>
                <th className="py-3 px-3 text-center text-[#5EEAD4] font-semibold">Trạng thái</th>
                <th className="py-3 px-3 text-teal-100 font-semibold">Người duyệt &amp; Ghi chú</th>
                <th className="py-3 px-3 text-right text-white font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-500 font-medium">
                    Đang tải danh sách yêu cầu mở sổ...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <div className="w-11 h-11 mx-auto rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-slate-400 flex items-center justify-center mb-2.5">
                      <Unlock className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">
                      Không có yêu cầu mở sổ phù hợp
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {hasActiveFilter
                        ? "Thử xóa bộ lọc hoặc chọn kỳ đánh giá khác để xem đầy đủ danh sách."
                        : "Hiện chưa có giáo viên nào gửi yêu cầu mở khóa sổ điểm trong năm học này."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req, idx) => {
                  const reqDate = new Date(req.requestedAt)
                  const formattedDate = reqDate.toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                  const formattedTime = reqDate.toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  const isPending = req.status === "PENDING"

                  return (
                    <tr
                      key={req.id}
                      className={`transition-colors align-middle hover:bg-[#F8FAFC] ${
                        isPending ? "bg-amber-50/25" : ""
                      }`}
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-medium text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{formattedDate}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{formattedTime}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#F0FDFA] border border-[#CCFBF1] text-[#00736E] text-[10px] font-bold flex items-center justify-center shrink-0">
                            {getTeacherInitials(req.teacherName)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {req.teacherName || "Chưa rõ"}
                            </div>
                            {req.teacherEmail && (
                              <div className="text-[11px] text-slate-400 truncate max-w-[190px]">
                                {req.teacherEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-[#003B3A]">{req.className}</div>
                        {(req.campusCode || req.campusName) && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {req.campusCode || req.campusName}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{req.subjectName}</div>
                        {req.subjectCode && (
                          <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.2 bg-[#F8FAFC] border border-[#E2E8F0] text-slate-600 rounded font-medium">
                            {req.subjectCode}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                          {req.evaluationPeriod}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-xs text-slate-700 leading-relaxed max-w-xs whitespace-pre-wrap">
                          {req.reason}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {req.status === "PENDING" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-[#D97706] border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Chờ duyệt
                          </span>
                        ) : req.status === "APPROVED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#059669] border border-emerald-200">
                            <Check className="w-3 h-3" />
                            Đã duyệt
                          </span>
                        ) : req.status === "REJECTED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-[#E11D48] border border-rose-200">
                            <X className="w-3 h-3" />
                            Từ chối
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <Lock className="w-3 h-3" />
                            Đã đóng
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs">
                        {req.resolvedBy ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-800">{req.resolvedBy}</div>
                            {req.resolvedNote && (
                              <div className="text-[11px] text-slate-500 italic max-w-[200px] truncate" title={req.resolvedNote}>
                                &ldquo;{req.resolvedNote}&rdquo;
                              </div>
                            )}
                            {req.resolvedAt && (
                              <div className="text-[10px] text-slate-400">
                                {new Date(req.resolvedAt).toLocaleDateString("vi-VN")}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Chưa xử lý</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {req.status === "PENDING" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRequest(req)
                                  setAdminNote("")
                                  setActiveModal("APPROVE")
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#003B3A] hover:bg-[#005250] transition-colors cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Duyệt mở sổ
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRequest(req)
                                  setAdminNote("")
                                  setActiveModal("REJECT")
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#E11D48] bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                Từ chối
                              </button>
                            </>
                          ) : req.status === "APPROVED" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleRelock(req)}
                                disabled={lockingState[req.id]}
                                title="Khóa lại sổ điểm sau khi giáo viên cập nhật xong"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-[#F8FAFC] hover:bg-slate-100 border border-[#E2E8F0] transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {lockingState[req.id] ? (
                                  <RefreshCw className="w-3 h-3 animate-spin text-[#008B85]" />
                                ) : (
                                  <Lock className="w-3 h-3 text-[#00736E]" />
                                )}
                                Khóa lại sổ
                              </button>

                              {onNavigateToGradebook && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onNavigateToGradebook({
                                      campusId: req.campusId || "",
                                      grade: req.grade || "",
                                      classId: req.classId,
                                      subjectId: req.subjectId,
                                      period: req.evaluationPeriod,
                                    })
                                  }
                                  title="Mở sổ điểm lớp này"
                                  className="p-1.5 text-[#00736E] hover:bg-[#F0FDFA] border border-transparent hover:border-[#CCFBF1] rounded-lg transition-colors cursor-pointer"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400 text-xs">Đã đóng</span>
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
      </div>

      {/* Modal Duyệt mở sổ / Từ chối */}
      {activeModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-lg w-full overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 bg-[#003B3A] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    activeModal === "APPROVE"
                      ? "bg-[#059669]/25 text-[#5EEAD4]"
                      : "bg-[#E11D48]/25 text-rose-200"
                  }`}
                >
                  {activeModal === "APPROVE" ? (
                    <Unlock className="w-4 h-4" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold">
                    {activeModal === "APPROVE"
                      ? "Duyệt mở khóa sổ điểm"
                      : "Từ chối yêu cầu mở sổ"}
                  </h3>
                  <p className="text-[11px] text-teal-100/80">
                    {activeModal === "APPROVE"
                      ? "Sổ điểm sẽ được mở để giáo viên điều chỉnh theo yêu cầu"
                      : "Giáo viên sẽ nhận được lý do từ chối này"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-lg hover:bg-white/15 text-teal-100 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Form */}
            <form onSubmit={handleConfirmAction} className="p-5 space-y-4">
              {/* Summary ledger info */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 text-xs text-slate-700 space-y-2 tabular-nums">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Giáo viên yêu cầu</span>
                  <span className="font-semibold text-slate-900">
                    {selectedRequest.teacherName}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Lớp &amp; Môn học</span>
                  <span className="font-semibold text-[#003B3A]">
                    {selectedRequest.className} — {selectedRequest.subjectName}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Kỳ đánh giá</span>
                  <span className="font-semibold text-slate-900">
                    {selectedRequest.evaluationPeriod}
                  </span>
                </div>
                <div className="border-t border-[#E2E8F0] pt-2 mt-2">
                  <span className="text-slate-500 block mb-1">Lý do của giáo viên</span>
                  <div className="text-slate-800 bg-white px-3 py-2 rounded-lg border border-[#E2E8F0]">
                    &ldquo;{selectedRequest.reason}&rdquo;
                  </div>
                </div>
              </div>

              {/* Admin Note / Reason */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800">
                  {activeModal === "APPROVE"
                    ? "Ghi chú cho giáo viên (tùy chọn)"
                    : "Lý do từ chối yêu cầu *"}
                </label>
                <textarea
                  required={activeModal === "REJECT"}
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder={
                    activeModal === "APPROVE"
                      ? "Ví dụ: Đã mở khóa. Thầy/Cô vui lòng cập nhật điểm trước 17h00 hôm nay."
                      : "Ví dụ: Đã quá thời hạn điều chỉnh điểm, cần xin ý kiến phê duyệt của BGH."
                  }
                  className="w-full border border-[#E2E8F0] rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#008B85] outline-none resize-none"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50 ${
                    activeModal === "APPROVE"
                      ? "bg-[#059669] hover:bg-emerald-700"
                      : "bg-[#E11D48] hover:bg-rose-700"
                  }`}
                >
                  {submittingAction ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : activeModal === "APPROVE" ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Xác nhận duyệt mở sổ
                    </>
                  ) : (
                    <>
                      <X className="w-3.5 h-3.5" />
                      Xác nhận từ chối
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
