"use client"

import React, { useState, useEffect } from "react"
import {
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Zap,
  MessageSquareHeart,
  Send,
  FileCheck,
  Clock,
  ShieldCheck,
  History,
  RefreshCw,
  Edit3,
  Plus,
  Feather,
  LifeBuoy,
  Lock
} from "lucide-react"
import GvbmAdvisoryTasksPanel from "./GvbmAdvisoryTasksPanel"
import HollandAdvisoryOverviewCard from "./HollandAdvisoryOverviewCard"

interface TeacherTriPartyHubProps {
  studentId: string
  studentName?: string
  studentCode?: string
  classId?: string
  academicYearId: string
  stageMode?: "ALL" | "B3_B4" | "B5_B6"
  onRefreshParent?: () => void
}

export default function TeacherTriPartyHub({
  studentId,
  studentName = "Học sinh",
  studentCode = "",
  classId = "",
  academicYearId,
  stageMode = "ALL",
  onRefreshParent
}: TeacherTriPartyHubProps) {
  const [goalsData, setGoalsData] = useState<any>(null)
  const [actionItems, setActionItems] = useState<any[]>([])
  const [exchanges, setExchanges] = useState<any[]>([])
  const [reflections, setReflections] = useState<any[]>([])
  const [helpRequests, setHelpRequests] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Advisor Goal Review form
  const [teacherComment, setTeacherComment] = useState("")
  const [reviewSaving, setReviewSaving] = useState(false)
  const [toastMsg, setToastMsg] = useState("")

  // New 7-day Action Item form
  const [showAddAction, setShowAddAction] = useState(false)
  const [newActionDesc, setNewActionDesc] = useState("")
  const [newActionDeadline, setNewActionDeadline] = useState("")
  const [savingNewAction, setSavingNewAction] = useState(false)

  // Parent Exchange Response form
  const [replyingExchangeId, setReplyingExchangeId] = useState<string | null>(null)
  const [advisorResponseText, setAdvisorResponseText] = useState("")
  const [savingReply, setSavingReply] = useState(false)

  // Reflection Feedback form
  const [replyingReflectionId, setReplyingReflectionId] = useState<string | null>(null)
  const [reflectionFeedbackText, setReflectionFeedbackText] = useState("")
  const [savingReflectionFeedback, setSavingReflectionFeedback] = useState(false)

  // Help Request Response form
  const [replyingHelpId, setReplyingHelpId] = useState<string | null>(null)
  const [helpResponseText, setHelpResponseText] = useState("")
  const [helpShareWithParent, setHelpShareWithParent] = useState(false)
  const [savingHelpReply, setSavingHelpReply] = useState(false)

  const [showAuditModal, setShowAuditModal] = useState(false)

  async function loadHubData() {
    if (!studentId) return
    try {
      setLoading(true)
      const [resGoals, resActions, resExchanges, resReflections, resHelp] = await Promise.all([
        fetch(
          `/api/advisory/goals?studentId=${studentId}&studentCode=${studentCode}&academicYearId=${academicYearId || ""}&_t=${Date.now()}`,
          { cache: "no-store" }
        ).catch(() => null),
        fetch(
          `/api/advisory/action-items?studentId=${studentId}&academicYearId=${academicYearId || ""}&_t=${Date.now()}`,
          { cache: "no-store" }
        ).catch(() => null),
        fetch(
          `/api/advisory/parent-exchange?studentId=${studentId}&academicYearId=${academicYearId || ""}&includeAudit=true&_t=${Date.now()}`,
          { cache: "no-store" }
        ).catch(() => null),
        fetch(
          `/api/advisory/reflections?studentId=${studentId}&academicYearId=${academicYearId || ""}&_t=${Date.now()}`,
          { cache: "no-store" }
        ).catch(() => null),
        fetch(
          `/api/advisory/help-requests?studentId=${studentId}&academicYearId=${academicYearId || ""}&_t=${Date.now()}`,
          { cache: "no-store" }
        ).catch(() => null)
      ])

      if (resGoals && resGoals.ok) {
        const gData = await resGoals.json()
        setGoalsData(gData)
        setTeacherComment(
          gData?.existingSheet?.teacherComment ||
            gData?.goals?.find((g: any) => g.teacherComment)?.teacherComment ||
            ""
        )
      }
      if (resActions && resActions.ok) {
        const aData = await resActions.json()
        setActionItems(Array.isArray(aData.actionItems) ? aData.actionItems : [])
      }
      if (resExchanges && resExchanges.ok) {
        const exData = await resExchanges.json()
        setExchanges(Array.isArray(exData.exchanges) ? exData.exchanges : [])
        setAuditLogs(Array.isArray(exData.auditLogs) ? exData.auditLogs : [])
      }
      if (resReflections && resReflections.ok) {
        const refData = await resReflections.json()
        setReflections(Array.isArray(refData) ? refData : [])
      }
      if (resHelp && resHelp.ok) {
        const hData = await resHelp.json()
        setHelpRequests(Array.isArray(hData) ? hData : [])
      }
    } catch (e) {
      console.error("TeacherTriPartyHub load error:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (studentId) {
      loadHubData()
    }
  }, [studentId, academicYearId])

  async function handleAdvisorReviewGoal(status: "CONFIRMED" | "NEEDS_ADJUSTMENT") {
    if (!studentId) return
    if (status === "NEEDS_ADJUSTMENT" && !teacherComment.trim()) {
      alert("Vui lòng nhập nhận xét / gợi ý điều chỉnh để học sinh cập nhật lại mục tiêu.")
      return
    }
    try {
      setReviewSaving(true)
      const res = await fetch("/api/advisory/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          teacherComment:
            teacherComment.trim() ||
            (status === "CONFIRMED"
              ? "CVHT đã xác nhận kế hoạch mục tiêu SMART. Chúc em kiên trì thực hiện tốt!"
              : ""),
          signedByTeacher: status === "CONFIRMED",
          advisorReviewStatus: status
        })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setToastMsg(data.message || "Đã cập nhật trạng thái xác nhận mục tiêu SMART!")
        setTimeout(() => setToastMsg(""), 4000)
        await loadHubData()
        if (onRefreshParent) onRefreshParent()
      } else {
        alert(data.error || "Không thể lưu nhận xét mục tiêu")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setReviewSaving(false)
    }
  }

  async function handleCreateActionItem() {
    if (!newActionDesc.trim()) {
      alert("Vui lòng nhập mô tả hành động 7 ngày giao cho học sinh.")
      return
    }
    try {
      setSavingNewAction(true)
      const res = await fetch("/api/advisory/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          academicYearId,
          actionDescription: newActionDesc.trim(),
          deadline:
            newActionDeadline ||
            new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
        })
      })
      if (res.ok) {
        setNewActionDesc("")
        setNewActionDeadline("")
        setShowAddAction(false)
        setToastMsg("✓ Đã giao hành động 7 ngày mới cho học sinh!")
        setTimeout(() => setToastMsg(""), 4000)
        await loadHubData()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSavingNewAction(false)
    }
  }

  async function handleReplyParentExchange(exchangeId: string) {
    if (!advisorResponseText.trim()) {
      alert("Vui lòng nhập nội dung phản hồi gửi Phụ huynh.")
      return
    }
    try {
      setSavingReply(true)
      const res = await fetch("/api/advisory/parent-exchange", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: exchangeId,
          status: "RESPONDED",
          advisorResponse: advisorResponseText.trim()
        })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setReplyingExchangeId(null)
        setAdvisorResponseText("")
        setToastMsg("✓ Đã gửi phản hồi của CVHT tới Phụ huynh học sinh!")
        setTimeout(() => setToastMsg(""), 4000)
        await loadHubData()
      } else {
        alert(data.error || "Có lỗi khi gửi phản hồi")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSavingReply(false)
    }
  }

  async function handleSaveReflectionFeedback(reflectionId: string) {
    if (!reflectionFeedbackText.trim()) {
      alert("Vui lòng nhập nhận xét phản hồi cho phiếu tự phản tư.")
      return
    }
    try {
      setSavingReflectionFeedback(true)
      const res = await fetch("/api/advisory/reflections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reflectionId,
          advisorFeedback: reflectionFeedbackText.trim()
        })
      })
      if (res.ok) {
        setReplyingReflectionId(null)
        setReflectionFeedbackText("")
        setToastMsg("✓ Đã lưu nhận xét phản hồi cho phiếu tự phản tư của học sinh!")
        setTimeout(() => setToastMsg(""), 4000)
        await loadHubData()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSavingReflectionFeedback(false)
    }
  }

  async function handleSaveHelpReply(reqItem: any, nextStatus: "PROCESSING" | "RESOLVED") {
    if (!helpResponseText.trim()) {
      alert("Vui lòng nhập nội dung hướng dẫn / phản hồi cho học sinh.")
      return
    }
    try {
      setSavingHelpReply(true)
      const res = await fetch("/api/advisory/help-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reqItem.id,
          status: nextStatus,
          responseNotes: helpResponseText.trim(),
          shareWithParent: reqItem.privacyTier === "RESTRICTED_SAFEGUARDING" ? false : helpShareWithParent
        })
      })
      if (res.ok) {
        setReplyingHelpId(null)
        setHelpResponseText("")
        setToastMsg("✓ Đã cập nhật phản hồi hỗ trợ cho học sinh!")
        setTimeout(() => setToastMsg(""), 4000)
        await loadHubData()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSavingHelpReply(false)
    }
  }

  const goals = goalsData?.goals || []
  const currentReviewStatus =
    goalsData?.existingSheet?.advisorReviewStatus ||
    goals[0]?.advisorReviewStatus ||
    (goalsData?.existingSheet?.signedByTeacher ? "CONFIRMED" : "PENDING_REVIEW")

  const pendingExchangesCount = exchanges.filter(e => e.status === "PENDING").length
  const pendingHelpCount = helpRequests.filter(h => h.status === "PENDING").length

  const showGoalsAndActions = stageMode === "ALL" || stageMode === "B3_B4"
  const showCoordinationAndSupport = stageMode === "ALL" || stageMode === "B5_B6"

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-teal-200/90 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#003B3A] text-amber-300">
              {stageMode === "B3_B4"
                ? "Bước 3 & Bước 4 • Mục tiêu SMART & Hành động 7 ngày"
                : stageMode === "B5_B6"
                  ? "Bước 5 & Bước 6 • Phối hợp 3 bên (GVBM • PHHS • Phản tư & Hỗ trợ)"
                  : "Trung tâm điều phối cố vấn 3 bên"}
            </span>
            <span className="text-xs font-extrabold text-teal-800">
              Học sinh: {studentName} {studentCode ? `(${studentCode})` : ""}
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-black text-slate-900">
            {stageMode === "B3_B4"
              ? "Thẩm Định & Xác Nhận Mục Tiêu SMART • Giao Việc & Theo Dõi Hành Động 7 Ngày"
              : stageMode === "B5_B6"
                ? "Trao Đổi Phụ Huynh • Phiếu Tự Phản Tư • Hỗ Trợ Tâm Lý • Phối Hợp GV Bộ Môn"
                : "Xác Nhận Mục Tiêu SMART • Theo Dõi Hành Động 7 Ngày • Phản Tư & Hỗ Trợ • Phối Hợp Phụ Huynh"}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAuditModal(!showAuditModal)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-teal-700" />
            <span>Lịch sử thay đổi ({auditLogs.length})</span>
          </button>
          <button
            type="button"
            onClick={loadHubData}
            className="p-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 cursor-pointer"
            title="Làm mới dữ liệu đồng bộ 3 bên"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-black flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Khảo sát Holland (SKL_PSYCH v2.6.1) – chỉ hiển thị khi stageMode === "ALL" */}
      {stageMode === "ALL" && studentId && (
        <HollandAdvisoryOverviewCard
          studentId={studentId}
          studentName={studentName}
          academicYearId={academicYearId}
          mode="TEACHER"
        />
      )}

      {/* KHỐI B3-B4: DUYỆT MỤC TIÊU SMART & HÀNH ĐỘNG 7 NGÀY */}
      {showGoalsAndActions && (
      <div className={`grid grid-cols-1 ${stageMode === "B3_B4" ? "lg:grid-cols-2" : "lg:grid-cols-3"} gap-4`}>
        {/* CỘT 1: XÁC NHẬN HOẶC ĐỀ NGHỊ ĐIỀU CHỈNH MỤC TIÊU SMART */}
        <div className="p-4 rounded-2xl bg-teal-50/40 border border-teal-200/80 space-y-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-[#003B3A] uppercase flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-teal-700" />
                <span>1. Duyệt Mục Tiêu SMART</span>
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                  currentReviewStatus === "CONFIRMED"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : currentReviewStatus === "NEEDS_ADJUSTMENT"
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : "bg-slate-100 text-slate-700 border-slate-300"
                }`}
              >
                {currentReviewStatus === "CONFIRMED"
                  ? "✓ Đã xác nhận"
                  : currentReviewStatus === "NEEDS_ADJUSTMENT"
                  ? "⚡ Chờ HS điều chỉnh"
                  : goals.length > 0
                  ? "⏳ Chờ CVHT xác nhận"
                  : "Chưa nộp phiếu"}
              </span>
            </div>

            <p className="text-[11px] text-slate-600 font-medium">
              Đã đăng ký: <strong>{goals.length} mục tiêu</strong>.{" "}
              {goalsData?.existingSheet?.signedByParent
                ? "✓ Phụ huynh đã ký đồng hành."
                : "Phụ huynh chưa ký."}
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nhận xét / Góp ý của CVHT (Đồng bộ tới HS & PHHS):
              </label>
              <textarea
                rows={3}
                value={teacherComment}
                onChange={e => setTeacherComment(e.target.value)}
                placeholder="Nhập nhận xét xác nhận hoặc hướng dẫn học sinh điều chỉnh mục tiêu..."
                className="w-full p-2.5 rounded-xl bg-white border border-teal-200 text-xs font-medium focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              disabled={reviewSaving}
              onClick={() => handleAdvisorReviewGoal("CONFIRMED")}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Xác nhận Mục tiêu</span>
            </button>
            <button
              type="button"
              disabled={reviewSaving}
              onClick={() => handleAdvisorReviewGoal("NEEDS_ADJUSTMENT")}
              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Đề nghị điều chỉnh</span>
            </button>
          </div>
        </div>

        {/* CỘT 2: THEO DÕI HÀNH ĐỘNG 7 NGÀY & MINH CHỨNG CỦA HỌC SINH */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-[#003B3A] uppercase flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>2. Hành Động 7 Ngày & Minh Chứng</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white border border-slate-200 text-slate-700">
                  {actionItems.filter(a => a.status === "COMPLETED").length}/{actionItems.length} xong
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddAction(!showAddAction)}
                  className="px-2 py-0.5 rounded-lg bg-[#003B3A] text-white text-[10px] font-black flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-amber-300" />
                  <span>Giao việc</span>
                </button>
              </div>
            </div>

            {showAddAction && (
              <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 space-y-2">
                <input
                  type="text"
                  value={newActionDesc}
                  onChange={e => setNewActionDesc(e.target.value)}
                  placeholder="Nhập hành động 7 ngày giao cho học sinh..."
                  className="w-full p-2 rounded-lg bg-white border border-teal-200 text-xs font-medium"
                />
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="date"
                    value={newActionDeadline}
                    onChange={e => setNewActionDeadline(e.target.value)}
                    className="p-1.5 rounded-lg bg-white border border-teal-200 text-[11px] font-semibold"
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowAddAction(false)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-600"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={savingNewAction}
                      onClick={handleCreateActionItem}
                      className="px-3 py-1 rounded-lg bg-[#003B3A] text-white text-[11px] font-black"
                    >
                      {savingNewAction ? "Đang lưu..." : "Giao việc"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {actionItems.length === 0 ? (
              <div className="p-4 rounded-xl bg-white border border-dashed border-slate-200 text-center text-xs text-slate-400">
                Chưa có hành động 7 ngày nào được ghi nhận cho học sinh này.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {actionItems.slice(0, 6).map(act => (
                  <div
                    key={act.id}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded ${
                          act.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : act.status === "IN_PROGRESS"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {act.status === "COMPLETED"
                          ? "✓ Đã xong"
                          : act.status === "IN_PROGRESS"
                          ? "⚡ Đang làm"
                          : "⏳ Cần làm"}
                      </span>
                      {act.deadline && (
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Hạn: {new Date(act.deadline).toLocaleDateString("vi-VN")}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-800 leading-snug">{act.actionDescription}</p>
                    {act.evidenceNotes && (
                      <p className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 font-semibold">
                        📎 Minh chứng HS: “{act.evidenceNotes}”
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* KHỐI B5-B6: TRAO ĐỔI PHỤ HUYNH • TỰ PHẢN TƯ • ĐỀ NGHỊ HỖ TRỢ & GVBM */}
      {showCoordinationAndSupport && (
      <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CỘT 3: TIẾP NHẬN & PHẢN HỒI YÊU CẦU TRAO ĐỔI TỪ PHỤ HUYNH */}
        <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-amber-950 uppercase flex items-center gap-1.5">
                <MessageSquareHeart className="w-4 h-4 text-amber-600" />
                <span>3. Yêu Cầu Trao Đổi Từ PHHS</span>
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                  pendingExchangesCount > 0
                    ? "bg-rose-100 text-rose-800 border-rose-300 animate-pulse"
                    : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                {pendingExchangesCount > 0
                  ? `${pendingExchangesCount} chờ phản hồi`
                  : `${exchanges.length} lượt trao đổi`}
              </span>
            </div>

            {exchanges.length === 0 ? (
              <div className="p-4 rounded-xl bg-white border border-dashed border-amber-200 text-center text-xs text-slate-400">
                Phụ huynh chưa gửi yêu cầu trao đổi trực tiếp nào.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {exchanges.map(ex => (
                  <div
                    key={ex.id}
                    className="p-3 rounded-xl bg-white border border-amber-200/90 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-black uppercase text-amber-800">
                        {ex.topic === "DAT_LICH_TRAO_DOI"
                          ? "📅 Đặt lịch gặp CVHT"
                          : ex.topic === "HOI_TIEN_DO_MUC_TIEU"
                          ? "🎯 Hỏi tiến độ mục tiêu"
                          : "🏡 Phối hợp tại gia đình"}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          ex.status === "RESPONDED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {ex.status === "RESPONDED" ? "✓ Đã phản hồi" : "⏳ Chờ CVHT phản hồi"}
                      </span>
                    </div>

                    <p className="font-bold text-slate-900">“{ex.message}”</p>
                    {ex.homeSupportSummary && (
                      <p className="text-[11px] text-slate-600 italic">
                        🏡 Hỗ trợ tại nhà: {ex.homeSupportSummary}
                      </p>
                    )}

                    {ex.advisorResponse && (
                      <div className="p-2 rounded-lg bg-teal-50 border border-teal-200 text-[11px] text-teal-950 font-semibold">
                        <strong>CVHT phản hồi:</strong> “{ex.advisorResponse}”
                      </div>
                    )}

                    {replyingExchangeId === ex.id ? (
                      <div className="space-y-2 pt-1">
                        <textarea
                          rows={2}
                          value={advisorResponseText}
                          onChange={e => setAdvisorResponseText(e.target.value)}
                          placeholder="Nhập phản hồi của CVHT gửi Phụ huynh..."
                          className="w-full p-2 rounded-lg border border-teal-300 text-xs font-medium"
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setReplyingExchangeId(null)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            disabled={savingReply}
                            onClick={() => handleReplyParentExchange(ex.id)}
                            className="px-3 py-1 rounded-lg bg-[#003B3A] text-white text-[11px] font-black flex items-center gap-1"
                          >
                            <Send className="w-3 h-3 text-amber-300" />
                            <span>Gửi PHHS</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingExchangeId(ex.id)
                            setAdvisorResponseText(ex.advisorResponse || "")
                          }}
                          className="text-[11px] font-extrabold text-teal-800 hover:underline cursor-pointer"
                        >
                          {ex.advisorResponse ? "Sửa phản hồi" : "+ Phản hồi Phụ huynh"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CỘT 4: PHIẾU TỰ PHẢN TƯ CỦA HỌC SINH & PHẢN HỒI CVHT */}
        <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-200/80 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-indigo-950 uppercase flex items-center gap-1.5">
              <Feather className="w-4 h-4 text-indigo-600" />
              <span>4. Phiếu Tự Phản Tư Của Học Sinh ({reflections.length})</span>
            </span>
            <span className="text-[10px] font-bold text-indigo-800 bg-white px-2.5 py-0.5 rounded-full border border-indigo-200">
              {reflections.filter(r => r.shareWithParent).length} chia sẻ PHHS
            </span>
          </div>

          {reflections.length === 0 ? (
            <div className="p-4 rounded-xl bg-white border border-dashed border-indigo-200 text-center text-xs text-slate-400">
              Học sinh chưa gửi phiếu tự phản tư cá nhân nào.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {reflections.slice(0, 5).map(ref => (
                <div key={ref.id} className="p-3 rounded-xl bg-white border border-indigo-200/80 text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black text-slate-500">
                      {ref.createdAt ? new Date(ref.createdAt).toLocaleDateString("vi-VN") : "—"} • {ref.selfRating || 5}/5⭐
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        ref.shareWithParent
                          ? "bg-teal-100 text-teal-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {ref.shareWithParent ? "👨‍👩‍👧 HS cho phép chia sẻ PHHS" : "🔒 Chỉ gửi riêng CVHT"}
                    </span>
                  </div>
                  <p className="font-bold text-slate-900">“{ref.reflectionText}”</p>
                  {ref.difficulties && (
                    <p className="text-[11px] text-amber-800 font-semibold">
                      ⚠️ Khó khăn: “{ref.difficulties}”
                    </p>
                  )}
                  {ref.advisorFeedback && (
                    <div className="p-2 rounded-lg bg-teal-50 border border-teal-200 text-[11px] text-teal-950 font-semibold">
                      <strong>CVHT khích lệ:</strong> “{ref.advisorFeedback}”
                    </div>
                  )}

                  {replyingReflectionId === ref.id ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        rows={2}
                        value={reflectionFeedbackText}
                        onChange={e => setReflectionFeedbackText(e.target.value)}
                        placeholder="Nhập lời nhận xét, khích lệ của CVHT cho phiếu tự phản tư..."
                        className="w-full p-2 rounded-lg border border-indigo-300 text-xs font-medium"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setReplyingReflectionId(null)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          disabled={savingReflectionFeedback}
                          onClick={() => handleSaveReflectionFeedback(ref.id)}
                          className="px-3 py-1 rounded-lg bg-[#003B3A] text-white text-[11px] font-black"
                        >
                          Lưu phản hồi
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingReflectionId(ref.id)
                          setReflectionFeedbackText(ref.advisorFeedback || "")
                        }}
                        className="text-[11px] font-extrabold text-indigo-800 hover:underline cursor-pointer"
                      >
                        {ref.advisorFeedback ? "Sửa nhận xét" : "+ Nhận xét phiếu phản tư"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CỘT 5: ĐỀ NGHỊ HỖ TRỢ CỦA HỌC SINH & BẢO MẬT TÂM LÝ HỌC ĐƯỜNG */}
        <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-200/80 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-rose-950 uppercase flex items-center gap-1.5">
              <LifeBuoy className="w-4 h-4 text-rose-600" />
              <span>5. Đề Nghị Hỗ Trợ & Bảo Mật ({helpRequests.length})</span>
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                pendingHelpCount > 0
                  ? "bg-rose-100 text-rose-800 border-rose-300 animate-pulse"
                  : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              {pendingHelpCount > 0 ? `${pendingHelpCount} chờ xử lý` : "Đã xử lý"}
            </span>
          </div>

          {helpRequests.length === 0 ? (
            <div className="p-4 rounded-xl bg-white border border-dashed border-rose-200 text-center text-xs text-slate-400">
              Học sinh chưa gửi đề nghị hỗ trợ nào.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {helpRequests.slice(0, 5).map(reqItem => (
                <div key={reqItem.id} className="p-3 rounded-xl bg-white border border-rose-200/80 text-xs space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          reqItem.privacyTier === "RESTRICTED_SAFEGUARDING"
                            ? "bg-rose-700 text-white"
                            : reqItem.shareWithParent
                            ? "bg-teal-100 text-teal-800"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {reqItem.privacyTier === "RESTRICTED_SAFEGUARDING"
                          ? "🛡️ RESTRICTED_SAFEGUARDING (Mật)"
                          : reqItem.shareWithParent
                          ? "👨‍👩‍👧 Chia sẻ PHHS"
                          : "🔒 Riêng với CVHT"}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {reqItem.category}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        reqItem.status === "RESOLVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : reqItem.status === "PROCESSING"
                          ? "bg-sky-100 text-sky-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {reqItem.status === "RESOLVED"
                        ? "✓ Đã giải quyết"
                        : reqItem.status === "PROCESSING"
                        ? "⚡ Đang hỗ trợ"
                        : "⏳ Chờ tiếp nhận"}
                    </span>
                  </div>

                  <p className="font-bold text-slate-900">“{reqItem.content}”</p>

                  {reqItem.responseNotes && (
                    <div className="p-2 rounded-lg bg-teal-50 border border-teal-200 text-[11px] text-teal-950 font-semibold">
                      <strong>CVHT phản hồi:</strong> “{reqItem.responseNotes}”
                    </div>
                  )}

                  {replyingHelpId === reqItem.id ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        rows={2}
                        value={helpResponseText}
                        onChange={e => setHelpResponseText(e.target.value)}
                        placeholder="Nhập hướng dẫn / phản hồi hỗ trợ cho học sinh..."
                        className="w-full p-2 rounded-lg border border-rose-300 text-xs font-medium"
                      />
                      {reqItem.privacyTier !== "RESTRICTED_SAFEGUARDING" && (
                        <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={helpShareWithParent}
                            onChange={e => setHelpShareWithParent(e.target.checked)}
                            className="w-3.5 h-3.5 accent-[#003B3A]"
                          />
                          <span>Chia sẻ nội dung hỗ trợ này với Phụ huynh học sinh</span>
                        </label>
                      )}
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setReplyingHelpId(null)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          disabled={savingHelpReply}
                          onClick={() => handleSaveHelpReply(reqItem, "PROCESSING")}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-black"
                        >
                          Đang hỗ trợ
                        </button>
                        <button
                          type="button"
                          disabled={savingHelpReply}
                          onClick={() => handleSaveHelpReply(reqItem, "RESOLVED")}
                          className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-black"
                        >
                          Hoàn tất hỗ trợ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingHelpId(reqItem.id)
                          setHelpResponseText(reqItem.responseNotes || "")
                          setHelpShareWithParent(Boolean(reqItem.shareWithParent))
                        }}
                        className="text-[11px] font-extrabold text-rose-800 hover:underline cursor-pointer"
                      >
                        {reqItem.responseNotes ? "Cập nhật xử lý" : "+ Tiếp nhận & Phản hồi"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KHỐI PHỐI HỢP GVBM & PHÊ DUYỆT NỘI DUNG TƯ VẤN GỬI PHHS */}
      <GvbmAdvisoryTasksPanel
        mode="CVHT"
        studentId={studentId}
        classId={classId}
        academicYearId={academicYearId}
      />
      </>
      )}

      {/* BẢNG AUDIT LOGS & PHÂN TẦNG BẢO MẬT */}
      {showAuditModal && (
        <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 space-y-3 border border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-black uppercase tracking-wider text-teal-300">
                Nhật Ký Thay Đổi & Kiểm Soát Phân Tầng Bảo Mật Hồ Sơ (Audit Trail)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAuditModal(false)}
              className="text-xs text-slate-400 hover:text-white font-bold"
            >
              Đóng ✕
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-400">Chưa có bản ghi lịch sử thay đổi nào.</p>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {auditLogs.map(log => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-[11px] flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-teal-900 text-teal-200 font-black text-[10px]">
                        {log.actorRole}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-black text-[10px] ${
                          log.privacyTier === "RESTRICTED_SAFEGUARDING"
                            ? "bg-rose-900 text-rose-200"
                            : log.privacyTier === "PRIVATE_ADVISORY"
                            ? "bg-amber-900 text-amber-200"
                            : "bg-emerald-900 text-emerald-200"
                        }`}
                      >
                        {log.privacyTier}
                      </span>
                      <span className="font-bold text-white">{log.actorName || log.actorId}</span>
                    </div>
                    <p className="text-slate-300">{log.summary}</p>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString("vi-VN") : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
