// @ts-nocheck
"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Search, RefreshCw, CheckCircle2, Clock, AlertCircle,
  X, Lock, Unlock, ExternalLink, Filter, Check, MessageSquare,
  ChevronRight, Calendar, User, BookOpen, AlertTriangle
} from "lucide-react"

const EVAL_PERIODS = [
  { code: "ALL", name: "Tất cả các kỳ" },
  { code: "KSĐN", name: "Khảo sát đầu năm (KSĐN)" },
  { code: "GK1", name: "Giữa kỳ 1 (GK1)" },
  { code: "CK1", name: "Cuối kỳ 1 (CK1)" },
  { code: "GK2", name: "Giữa kỳ 2 (GK2)" },
  { code: "CK2", name: "Cuối kỳ 2 (CK2)" }
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

export function GradeUnlockRequestsTab({
  academicYears,
  selectedYearId,
  campuses = [],
  classes = [],
  subjects = [],
  onNavigateToGradebook,
  onRequestsUpdated
}: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState("ALL")
  const [selectedStatus, setSelectedStatus] = useState("ALL")
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState<any[]>([])
  const [pendingCount, setPendingCount] = useState(0)

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
        status: selectedStatus,
        search: searchTerm
      })
      const res = await fetch(`/api/admin/ktdbcl/gradebook-unlock-requests?${query.toString()}`)
      const data = await res.json()
      if (data.success) {
        setRequests(data.requests || [])
        setPendingCount(data.pendingCount || 0)
        if (onRequestsUpdated) onRequestsUpdated()
      }
    } catch (err) {
      console.error("Lỗi tải danh sách yêu cầu mở sổ:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [selectedYearId, selectedPeriod, selectedStatus])

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => {
      fetchRequests()
    }, 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  // Stats calculation
  const stats = useMemo(() => {
    const total = requests.length
    const pending = requests.filter(r => r.status === "PENDING").length
    const approved = requests.filter(r => r.status === "APPROVED").length
    const rejected = requests.filter(r => r.status === "REJECTED").length
    return { total, pending, approved, rejected }
  }, [requests])

  // Handle Approve / Reject submission
  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRequest || !activeModal) return

    if (activeModal === "REJECT" && !adminNote.trim()) {
      alert("Vui lòng nhập lý do từ chối để thông báo cho giáo viên!")
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
          note: adminNote.trim()
        })
      })
      const data = await res.json()
      if (data.success) {
        alert(data.message || (activeModal === "APPROVE" ? "Đã duyệt mở sổ thành công!" : "Đã từ chối yêu cầu."))
        setActiveModal(null)
        setSelectedRequest(null)
        setAdminNote("")
        await fetchRequests()
      } else {
        alert("Lỗi: " + (data.error || "Không thể xử lý yêu cầu"))
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message)
    } finally {
      setSubmittingAction(false)
    }
  }

  // Quick re-lock button for approved requests
  const handleRelock = async (req: any) => {
    if (!confirm(`Bạn có chắc chắn muốn KHÓA LẠI sổ điểm môn "${req.subjectName}" của lớp "${req.className}" (Kỳ ${req.evaluationPeriod})?`)) return

    try {
      setLockingState(prev => ({ ...prev, [req.id]: true }))
      const res = await fetch("/api/admin/ktdbcl/gradebook-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: req.academicYearId,
          evaluationPeriod: req.evaluationPeriod,
          classId: req.classId,
          subjectId: req.subjectId,
          isLocked: true,
          lockReason: "Khóa lại sổ điểm sau khi GV hoàn tất cập nhật"
        })
      })
      const data = await res.json()
      if (data.success) {
        alert("Đã khóa lại sổ điểm thành công!")
        await fetchRequests()
      } else {
        alert("Lỗi: " + (data.error || "Không rõ"))
      }
    } catch (err: any) {
      alert("Lỗi kết nối: " + err.message)
    } finally {
      setLockingState(prev => ({ ...prev, [req.id]: false }))
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top summary statistic cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Card */}
        <div className="bg-amber-50/80 border-2 border-amber-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Chờ xét duyệt</p>
              <h3 className="text-3xl font-black text-amber-950 mt-1">{pendingCount}</h3>
              <p className="text-[11px] text-amber-700 mt-1 font-medium">Yêu cầu mở sổ cần xử lý</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
          </div>
          {pendingCount > 0 && (
            <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 w-4 h-4 bg-amber-500 rounded-full animate-ping opacity-75" />
          )}
        </div>

        {/* Approved Card */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Đã duyệt mở sổ</p>
              <h3 className="text-3xl font-black text-emerald-950 mt-1">{stats.approved}</h3>
              <p className="text-[11px] text-emerald-700 mt-1 font-medium">Đã mở khóa sổ cho GV</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Rejected Card */}
        <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Đã từ chối</p>
              <h3 className="text-3xl font-black text-rose-950 mt-1">{stats.rejected}</h3>
              <p className="text-[11px] text-rose-700 mt-1 font-medium">Không phê duyệt mở sổ</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Total Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng số yêu cầu</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1">{stats.total}</h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">Trong năm học đã chọn</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Unlock className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Period filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 font-medium">Kỳ:</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                {EVAL_PERIODS.map(p => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Status filter tabs */}
            <div className="flex items-center p-1 bg-slate-200/70 rounded-xl text-xs font-bold">
              <button
                onClick={() => setSelectedStatus("ALL")}
                className={`px-3 py-1 rounded-lg transition-all ${selectedStatus === "ALL" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Tất cả ({stats.total})
              </button>
              <button
                onClick={() => setSelectedStatus("PENDING")}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${selectedStatus === "PENDING" ? "bg-amber-500 text-white shadow-2xs" : "text-amber-800 hover:text-amber-900"}`}
              >
                <span>Chờ duyệt</span>
                {pendingCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${selectedStatus === "PENDING" ? "bg-white text-amber-700" : "bg-amber-400 text-slate-900"}`}>
                    {pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setSelectedStatus("APPROVED")}
                className={`px-3 py-1 rounded-lg transition-all ${selectedStatus === "APPROVED" ? "bg-emerald-600 text-white shadow-2xs" : "text-emerald-800 hover:text-emerald-900"}`}
              >
                Đã duyệt
              </button>
              <button
                onClick={() => setSelectedStatus("REJECTED")}
                className={`px-3 py-1 rounded-lg transition-all ${selectedStatus === "REJECTED" ? "bg-rose-600 text-white shadow-2xs" : "text-rose-800 hover:text-rose-900"}`}
              >
                Từ chối
              </button>
            </div>
          </div>

          {/* Search bar & refresh */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm GV, lớp, môn học, lý do..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#003B3A]/20 focus:border-[#003B3A]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={fetchRequests}
              disabled={loading}
              title="Làm mới"
              className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 active:scale-95 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#003B3A]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 text-center w-12">#</th>
                <th className="py-3 px-3">Thời gian</th>
                <th className="py-3 px-3">Giáo viên yêu cầu</th>
                <th className="py-3 px-3">Lớp học</th>
                <th className="py-3 px-3">Môn học</th>
                <th className="py-3 px-3">Kỳ đánh giá</th>
                <th className="py-3 px-4 min-w-[200px]">Lý do yêu cầu mở sổ</th>
                <th className="py-3 px-3 text-center">Trạng thái</th>
                <th className="py-3 px-3">Người duyệt & Ghi chú</th>
                <th className="py-3 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400 font-semibold animate-pulse">
                    Đang tải danh sách yêu cầu mở sổ...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                      <Unlock className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">Không có yêu cầu mở sổ nào</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Không tìm thấy yêu cầu phù hợp với bộ lọc hiện tại</p>
                  </td>
                </tr>
              ) : (
                requests.map((req, idx) => {
                  const reqDate = new Date(req.requestedAt)
                  const formattedDate = reqDate.toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                  })
                  const formattedTime = reqDate.toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })

                  return (
                    <tr
                      key={req.id}
                      className={`hover:bg-slate-50/80 transition-colors ${req.status === "PENDING" ? "bg-amber-50/30" : ""}`}
                    >
                      <td className="py-3.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{formattedDate}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formattedTime}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-purple-600" />
                          <span>{req.teacherName || "Chưa rõ"}</span>
                        </div>
                        {req.teacherEmail && (
                          <div className="text-[11px] text-slate-400">{req.teacherEmail}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="font-bold text-[#003B3A]">{req.className}</div>
                        {req.campusName && (
                          <div className="text-[10px] text-slate-400">{req.campusName}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{req.subjectName}</div>
                        {req.subjectCode && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-mono">
                            {req.subjectCode}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#003B3A]/10 text-[#003B3A]">
                          {req.evaluationPeriod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-xs text-slate-800 font-medium leading-relaxed max-w-sm whitespace-pre-wrap">
                          {req.reason}
                        </p>
                      </td>
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {req.status === "PENDING" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                            <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                            Chờ duyệt
                          </span>
                        )}
                        {req.status === "APPROVED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Đã duyệt
                          </span>
                        )}
                        {req.status === "REJECTED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <X className="w-3 h-3 text-rose-600" />
                            Từ chối
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-xs">
                        {req.resolvedBy ? (
                          <div>
                            <div className="font-bold text-slate-700">{req.resolvedBy}</div>
                            {req.resolvedNote && (
                              <div className="text-[11px] text-slate-500 italic mt-0.5 max-w-xs">
                                "{req.resolvedNote}"
                              </div>
                            )}
                            {req.resolvedAt && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(req.resolvedAt).toLocaleDateString("vi-VN")}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Chưa xử lý</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {req.status === "PENDING" ? (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedRequest(req)
                                  setAdminNote("")
                                  setActiveModal("APPROVE")
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs active:scale-95 transition-all"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Duyệt mở sổ
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRequest(req)
                                  setAdminNote("")
                                  setActiveModal("REJECT")
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 active:scale-95 transition-all"
                              >
                                <X className="w-3.5 h-3.5" />
                                Từ chối
                              </button>
                            </>
                          ) : req.status === "APPROVED" ? (
                            <>
                              <button
                                onClick={() => handleRelock(req)}
                                disabled={lockingState[req.id]}
                                title="Khóa lại sổ điểm sau khi giáo viên cập nhật xong"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                              >
                                {lockingState[req.id] ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Lock className="w-3 h-3 text-purple-700" />
                                )}
                                Khóa lại sổ
                              </button>

                              {onNavigateToGradebook && (
                                <button
                                  onClick={() => onNavigateToGradebook({
                                    campusId: req.campusId || "",
                                    grade: req.grade || "",
                                    classId: req.classId,
                                    subjectId: req.subjectId,
                                    period: req.evaluationPeriod
                                  })}
                                  title="Đến màn hình nhập điểm"
                                  className="p-1.5 text-[#003B3A] hover:bg-[#003B3A]/10 rounded-lg transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Đã đóng</span>
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

      {/* MODAL DUYỆT MỞ SỔ / TỪ CHỐI */}
      {activeModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className={`px-6 py-4 text-white flex items-center justify-between ${activeModal === "APPROVE" ? "bg-emerald-600" : "bg-rose-600"}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  {activeModal === "APPROVE" ? <Unlock className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">
                    {activeModal === "APPROVE" ? "Duyệt mở khóa sổ điểm" : "Từ chối yêu cầu mở sổ"}
                  </h3>
                  <p className="text-[11px] text-white/80">
                    {activeModal === "APPROVE" ? "Sổ điểm sẽ được mở khóa để giáo viên nhập điểm" : "Giáo viên sẽ nhận được lý do từ chối"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-lg hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Form */}
            <form onSubmit={handleConfirmAction} className="p-6 space-y-4">
              {/* Summary info */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Giáo viên:</span>
                  <span className="font-bold text-slate-900">{selectedRequest.teacherName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lớp & Môn:</span>
                  <span className="font-bold text-[#003B3A]">{selectedRequest.className} - {selectedRequest.subjectName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kỳ đánh giá:</span>
                  <span className="font-bold text-slate-900">{selectedRequest.evaluationPeriod}</span>
                </div>
                <div className="border-t border-slate-200 pt-1.5 mt-1.5">
                  <span className="text-slate-500 block mb-0.5">Lý do của giáo viên:</span>
                  <span className="font-medium text-slate-900 italic bg-white p-2 rounded border border-slate-200 block">
                    "{selectedRequest.reason}"
                  </span>
                </div>
              </div>

              {/* Admin Note / Reason */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  {activeModal === "APPROVE" ? "Ghi chú cho giáo viên (tùy chọn):" : "Lý do từ chối yêu cầu *:"}
                </label>
                <textarea
                  required={activeModal === "REJECT"}
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder={
                    activeModal === "APPROVE"
                      ? "Ví dụ: Đã mở khóa. Thầy/Cô vui lòng cập nhật điểm trước 17h00 hôm nay."
                      : "Ví dụ: Đã quá thời hạn phúc khảo, cần xin ý kiến phê duyệt của BGH..."
                  }
                  className="w-full border border-slate-300 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#003B3A]/20 focus:border-[#003B3A] outline-none resize-none"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md active:scale-95 transition-all disabled:opacity-50 ${
                    activeModal === "APPROVE"
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                      : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
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
                      Xác nhận Duyệt Mở Sổ
                    </>
                  ) : (
                    <>
                      <X className="w-3.5 h-3.5" />
                      Xác nhận Từ Chối
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
