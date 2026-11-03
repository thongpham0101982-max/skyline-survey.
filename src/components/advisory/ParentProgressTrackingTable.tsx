"use client"

import React, { useState, useEffect } from "react"
import {
  Table,
  LayoutGrid,
  Calendar,
  CheckCircle2,
  Target,
  Heart,
  Feather,
  Zap,
  Send,
  ShieldCheck,
  TrendingUp,
  Check
} from "lucide-react"

interface ParentProgressTrackingTableProps {
  studentId: string
  studentName: string
  studentCode?: string
  academicYearId: string
  homeroomTeacherName?: string
  goals?: any[]
  consultations?: any[]
  trackingLogs?: any[]
  signedByParent?: boolean
  onSaveConsultationFeedback?: (logId: string, feedbackText: string) => Promise<void>
  acknowledgedLogs?: Record<string, boolean>
  primaryColor?: string
  darkColor?: string
  hideKpiStrip?: boolean
}

export default function ParentProgressTrackingTable({
  studentId,
  studentName,
  studentCode = "",
  academicYearId,
  homeroomTeacherName = "GVCN",
  goals = [],
  consultations = [],
  signedByParent = false,
  onSaveConsultationFeedback,
  acknowledgedLogs = {},
  hideKpiStrip = false
}: ParentProgressTrackingTableProps) {
  const [viewMode, setViewMode] = useState<"table" | "cards">("table")
  const [actionItems, setActionItems] = useState<any[]>([])
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [localAck, setLocalAck] = useState<Record<string, boolean>>({})
  const [localFeedbackText, setLocalFeedbackText] = useState<Record<string, string>>({})
  const [toastMsg, setToastMsg] = useState("")

  useEffect(() => {
    if (!studentId) return
    fetch(
      `/api/advisory/action-items?studentId=${studentId}&academicYearId=${academicYearId || ""}&_t=${Date.now()}`,
      { cache: "no-store" }
    )
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data && Array.isArray(data.actionItems)) {
          setActionItems(data.actionItems)
        }
      })
      .catch(() => null)
  }, [studentId, academicYearId])

  async function handleQuickSaveFeedback(logId: string) {
    if (!logId) return
    const text = (feedbackInputs[logId] || "").trim()
    try {
      setSavingId(logId)
      if (onSaveConsultationFeedback) {
        await onSaveConsultationFeedback(logId, text)
      } else {
        await fetch("/api/advisory/consultations", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: logId,
            parentAcknowledged: true,
            parentFeedback: text || undefined
          })
        })
      }
      setLocalAck(prev => ({ ...prev, [logId]: true }))
      if (text) {
        setLocalFeedbackText(prev => ({ ...prev, [logId]: text }))
      }
      setFeedbackInputs(prev => ({ ...prev, [logId]: "" }))
      setToastMsg("Đã lưu phản hồi & xác nhận phối hợp cùng GVCN")
      setTimeout(() => setToastMsg(""), 3500)
    } catch (e) {
      console.error(e)
    } finally {
      setSavingId(null)
    }
  }

  const validGoalsCount = goals.filter(g => Boolean(g?.targetText)).length
  const isGoalConfirmed = goals.some(
    g => g?.signedByTeacher || g?.advisorReviewStatus === "CONFIRMED"
  )
  const isGoalNeedsAdj = goals.some(g => g?.advisorReviewStatus === "NEEDS_ADJUSTMENT")
  const teacherGoalComment =
    goals.find(g => g?.teacherComment)?.teacherComment || ""

  const completedActionsCount = actionItems.filter(a => a.status === "COMPLETED").length
  const totalActionsCount = actionItems.length

  const acknowledgedSessionsCount = consultations.filter(
    (c, idx) =>
      Boolean(
        c.parentAcknowledged ||
          c.parentFeedback ||
          acknowledgedLogs[c.id || idx] ||
          localAck[c.id || idx]
      )
  ).length

  const latestSessionDate =
    consultations.length > 0 && consultations[0]?.meetingDate
      ? new Date(consultations[0].meetingDate).toLocaleDateString("vi-VN")
      : "Chưa có"

  return (
    <div className="space-y-4">
      {/* 1. THANH CHỈ SỐ TIẾN ĐỘ TỔNG HỢP (SLIM 4-METRIC STRIP) */}
      {!hideKpiStrip && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* Metric 1 */}
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                1. Mục tiêu SMART
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-sm font-bold text-slate-900">
                  {validGoalsCount > 0 ? `${validGoalsCount} mục tiêu` : "Chưa tạo"}
                </span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                    isGoalConfirmed
                      ? "bg-emerald-50 text-emerald-700"
                      : isGoalNeedsAdj
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {isGoalConfirmed
                    ? "Đã xác nhận"
                    : isGoalNeedsAdj
                    ? "Cần điều chỉnh"
                    : "Chờ xác nhận"}
                </span>
              </div>
            </div>
          </div>

          {/* Metric 2 */}
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                2. Phiên tư vấn 1:1
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-sm font-bold text-slate-900">
                  {consultations.length} buổi
                </span>
                <span className="text-[11px] text-slate-500 truncate">
                  Gần nhất: {latestSessionDate}
                </span>
              </div>
            </div>
          </div>

          {/* Metric 3 */}
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                3. Hành động 7 ngày
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-sm font-bold text-slate-900">
                  {completedActionsCount}/{totalActionsCount} việc
                </span>
                <span className="text-[11px] text-slate-500">
                  {totalActionsCount > 0
                    ? `(${Math.round((completedActionsCount / totalActionsCount) * 100)}%)`
                    : "Theo dõi 1:1"}
                </span>
              </div>
            </div>
          </div>

          {/* Metric 4 */}
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <Heart className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                4. Phối hợp Gia đình
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-sm font-bold text-slate-900">
                  {acknowledgedSessionsCount}/{consultations.length} phiên
                </span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                    signedByParent
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {signedByParent ? "Đã ký cam kết" : "Chờ ký"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NHẬN XÉT DUYỆT MỤC TIÊU TỪ CVHT (NẾU CÓ) */}
      {teacherGoalComment && (
        <div className="px-4 py-2.5 rounded-xl bg-teal-50/60 border border-teal-200/70 flex items-center gap-2.5 text-xs">
          <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
          <div className="text-slate-700">
            <span className="font-semibold text-teal-900">
              Nhận xét mục tiêu từ CVHT ({homeroomTeacherName}):{" "}
            </span>
            <span className="italic">“{teacherGoalComment}”</span>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="px-3.5 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 2. BẢNG THEO DÕI TIẾN ĐỘ NHẬT KÝ TƯ VẤN & PHIÊN GẶP 1:1 (9 CỘT THANH MẢNH) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Slim Card Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Bảng Theo Dõi Tiến Độ: Nhật Ký Tư Vấn & Phiên Gặp 1:1
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                  {consultations.length} buổi
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Đồng bộ Sổ quan sát của GVCN, tự đánh giá của {studentName}{" "}
                {studentCode ? `(${studentCode})` : ""} và phản hồi Gia đình
              </p>
            </div>
          </div>

          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/70">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Table className="w-3.5 h-3.5 text-teal-600" />
              <span>Bảng 9 Cột</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "cards"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Thẻ Gọn</span>
            </button>
          </div>
        </div>

        {consultations.length === 0 ? (
          <div className="p-8 text-center space-y-1">
            <p className="text-xs font-semibold text-slate-600">
              Chưa có phiên tư vấn 1:1 nào được ghi nhận cho {studentName}
            </p>
            <p className="text-[11px] text-slate-400">
              Nội dung trao đổi 1:1, cam kết hành động và thời hạn theo dõi sẽ tự động hiển thị tại đây.
            </p>
          </div>
        ) : viewMode === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 text-[11px] font-semibold border-b border-slate-200/80">
                  <th className="py-2.5 px-2.5 w-9 text-center font-semibold">#</th>
                  <th className="py-2.5 px-3 w-[110px]">1. Ngày & CVHT</th>
                  <th className="py-2.5 px-3 min-w-[160px]">2. Nội dung tư vấn 1:1</th>
                  <th className="py-2.5 px-3 min-w-[140px]">3. Khó khăn ghi nhận</th>
                  <th className="py-2.5 px-3 min-w-[155px]">4. Hành động tiếp theo</th>
                  <th className="py-2.5 px-2.5 w-[90px] text-center">5. Thời hạn</th>
                  <th className="py-2.5 px-3 min-w-[135px]">6. Lời dặn Phụ huynh</th>
                  <th className="py-2.5 px-3 min-w-[135px]">7. Tự đánh giá của Con</th>
                  <th className="py-2.5 px-3 w-[200px]">8. Phản hồi Gia đình</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {consultations.map((c: any, idx: number) => {
                  const logId = c.id || String(idx)
                  const savedFb = localFeedbackText[logId] || c.parentFeedback || ""
                  const isAck = Boolean(
                    c.parentAcknowledged ||
                      savedFb ||
                      acknowledgedLogs[logId] ||
                      localAck[logId]
                  )
                  const deadlineDate = c.deadline ? new Date(c.deadline) : null
                  const isOverdue =
                    deadlineDate && deadlineDate.getTime() < Date.now() && !c.studentReflection

                  return (
                    <tr
                      key={logId}
                      className="hover:bg-slate-50/60 transition-colors align-top group"
                    >
                      {/* STT */}
                      <td className="py-3 px-2.5 text-center text-[11px] font-semibold text-slate-400 tabular-nums">
                        {consultations.length - idx}
                      </td>

                      {/* 1. Ngày gặp & CVHT */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 whitespace-nowrap">
                          {c.meetingDate
                            ? new Date(c.meetingDate).toLocaleDateString("vi-VN")
                            : "—"}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {c.teacher?.teacherName || c.evaluatorName || homeroomTeacherName}
                        </div>
                        {c.category && (
                          <span className="inline-block mt-1 px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 text-[10px] font-medium">
                            {c.category}
                          </span>
                        )}
                      </td>

                      {/* 2. Nội dung tư vấn 1:1 */}
                      <td className="py-3 px-3 text-slate-800 leading-relaxed">
                        {c.content || <span className="text-slate-400">—</span>}
                      </td>

                      {/* 3. Khó khăn ghi nhận */}
                      <td className="py-3 px-3 text-slate-600 leading-relaxed">
                        {c.difficulties || <span className="text-slate-400">Không có</span>}
                      </td>

                      {/* 4. Hành động tiếp theo */}
                      <td className="py-3 px-3 text-slate-800 font-medium leading-relaxed">
                        {c.nextActions || <span className="text-slate-400">Duy trì kế hoạch</span>}
                      </td>

                      {/* 5. Thời hạn */}
                      <td className="py-3 px-2.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap ${
                            isOverdue
                              ? "bg-rose-50 text-rose-700 border border-rose-200/70"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {c.deadline
                            ? new Date(c.deadline).toLocaleDateString("vi-VN")
                            : "Theo kỳ"}
                        </span>
                      </td>

                      {/* 6. Lời dặn gửi Phụ huynh */}
                      <td className="py-3 px-3 text-slate-600 italic leading-relaxed">
                        {c.notes ? (
                          `“${c.notes}”`
                        ) : (
                          <span className="text-slate-400 not-italic">
                            Đồng hành nhắc nhở con
                          </span>
                        )}
                      </td>

                      {/* 7. Tự đánh giá của Con sau buổi 1:1 */}
                      <td className="py-3 px-3 leading-relaxed">
                        {c.studentReflection ? (
                          <span className="text-emerald-800 font-medium">
                            “{c.studentReflection}”
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            Chưa cập nhật
                          </span>
                        )}
                      </td>

                      {/* 8. Phản hồi & Xác nhận của Gia đình */}
                      <td className="py-3 px-3 space-y-1.5">
                        {savedFb && (
                          <div className="text-[11px] text-teal-800 bg-teal-50/70 px-2 py-1 rounded-md border border-teal-100 leading-snug">
                            <span className="font-semibold">Gia đình:</span> “{savedFb}”
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={feedbackInputs[logId] ?? ""}
                            onChange={e =>
                              setFeedbackInputs(prev => ({ ...prev, [logId]: e.target.value }))
                            }
                            onKeyDown={e => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                handleQuickSaveFeedback(logId)
                              }
                            }}
                            placeholder={savedFb ? "Cập nhật..." : "Phản hồi của PH..."}
                            className="w-full min-w-0 h-7 px-2 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-500"
                          />
                          <button
                            type="button"
                            disabled={savingId === logId}
                            onClick={() => handleQuickSaveFeedback(logId)}
                            title={
                              isAck && !feedbackInputs[logId]?.trim()
                                ? "Đã xác nhận phối hợp"
                                : "Gửi phản hồi & Xác nhận"
                            }
                            className={`h-7 px-2 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1 shrink-0 transition-colors cursor-pointer ${
                              isAck && !feedbackInputs[logId]?.trim()
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                : "bg-teal-700 hover:bg-teal-800 text-white"
                            }`}
                          >
                            {savingId === logId ? (
                              <span className="text-[10px]">...</span>
                            ) : isAck && !feedbackInputs[logId]?.trim() ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Đã duyệt</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3 h-3" />
                                <span>Gửi</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* CHẾ ĐỘ THẺ GỌN (SLIM CARDS VIEW) */
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {consultations.map((c: any, idx: number) => {
              const logId = c.id || String(idx)
              const savedFb = localFeedbackText[logId] || c.parentFeedback || ""
              const isAck = Boolean(
                c.parentAcknowledged ||
                  savedFb ||
                  acknowledgedLogs[logId] ||
                  localAck[logId]
              )
              return (
                <div
                  key={logId}
                  className="p-3.5 rounded-xl bg-slate-50/50 border border-slate-200/80 space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center">
                        #{consultations.length - idx}
                      </span>
                      <span className="font-bold text-slate-900">
                        {c.meetingDate
                          ? new Date(c.meetingDate).toLocaleDateString("vi-VN")
                          : "—"}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-[11px] text-slate-500">
                        {c.teacher?.teacherName || c.evaluatorName || homeroomTeacherName}
                      </span>
                    </div>
                    {c.deadline && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                        Hạn: {new Date(c.deadline).toLocaleDateString("vi-VN")}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-[12px]">
                    <div>
                      <span className="font-semibold text-slate-500">Nội dung 1:1: </span>
                      <span className="text-slate-800">{c.content || "—"}</span>
                    </div>
                    {c.difficulties && (
                      <div>
                        <span className="font-semibold text-slate-500">Khó khăn: </span>
                        <span className="text-slate-700">{c.difficulties}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-semibold text-teal-700">Hành động tiếp theo: </span>
                      <span className="text-slate-800 font-medium">{c.nextActions || "—"}</span>
                    </div>
                    {c.studentReflection && (
                      <div className="text-emerald-700">
                        <span className="font-semibold">Tự đánh giá của con: </span>
                        “{c.studentReflection}”
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                    <input
                      type="text"
                      value={feedbackInputs[logId] ?? ""}
                      onChange={e =>
                        setFeedbackInputs(prev => ({ ...prev, [logId]: e.target.value }))
                      }
                      placeholder={
                        savedFb
                          ? `Đã phản hồi: "${savedFb}"`
                          : "Nhập phản hồi của Gia đình..."
                      }
                      className="flex-1 h-7 px-2.5 rounded-md bg-white border border-slate-200 text-[11px]"
                    />
                    <button
                      type="button"
                      disabled={savingId === logId}
                      onClick={() => handleQuickSaveFeedback(logId)}
                      className={`h-7 px-2.5 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                        isAck && !feedbackInputs[logId]?.trim()
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-teal-700 text-white"
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      <span>{isAck && !feedbackInputs[logId]?.trim() ? "Đã xác nhận" : "Gửi"}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 3. BẢNG THEO DÕI KẾ HOẠCH HÀNH ĐỘNG 7 NGÀY & MINH CHỨNG CỦA CON */}
      {actionItems.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Kế Hoạch Hành Động 7 Ngày & Minh Chứng ({completedActionsCount}/{totalActionsCount} hoàn thành)
              </h4>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-[11px] font-semibold border-b border-slate-200/70">
                  <th className="py-2 px-3 w-10 text-center">#</th>
                  <th className="py-2 px-3">Nội dung hành động 7 ngày</th>
                  <th className="py-2 px-3 w-28 text-center">Hạn</th>
                  <th className="py-2 px-3 w-36 text-center">Trạng thái</th>
                  <th className="py-2 px-3">Minh chứng kết quả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {actionItems.map((act: any, idx: number) => (
                  <tr key={act.id || idx} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-semibold">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {act.actionDescription}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-500 whitespace-nowrap">
                      {act.deadline
                        ? new Date(act.deadline).toLocaleDateString("vi-VN")
                        : "7 ngày"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          act.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700"
                            : act.status === "IN_PROGRESS"
                            ? "bg-sky-50 text-sky-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            act.status === "COMPLETED"
                              ? "bg-emerald-500"
                              : act.status === "IN_PROGRESS"
                              ? "bg-sky-500"
                              : "bg-amber-500"
                          }`}
                        />
                        {act.status === "COMPLETED"
                          ? "Đã hoàn thành"
                          : act.status === "IN_PROGRESS"
                          ? "Đang thực hiện"
                          : "Chờ thực hiện"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {act.evidenceNotes ? (
                        <span className="text-emerald-700 font-medium">
                          “{act.evidenceNotes}”
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
