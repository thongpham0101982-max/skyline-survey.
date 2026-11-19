"use client"

import React, { useEffect, useState } from "react"
import { X, CheckCircle2, AlertTriangle, AlertCircle, Loader2 } from "lucide-react"
import type { PrePublishCheckResult, TeachingPlanLessonRecord } from "@/lib/teaching-plan/types"

interface Props {
  open: boolean
  versionId: string
  versionNumber: number
  lessons: TeachingPlanLessonRecord[]
  onClose: () => void
  onPublished: (result: any) => void
}

export function TeachingPlanPublishModal({
  open,
  versionId,
  versionNumber,
  lessons,
  onClose,
  onPublished,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [check, setCheck] = useState<PrePublishCheckResult | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [confirmedAssessments, setConfirmedAssessments] = useState<Record<string, boolean>>({})
  const [replacements, setReplacements] = useState<Record<string, string>>({})
  const [comment, setComment] = useState("")

  useEffect(() => {
    if (!open || !versionId) return
    setLoading(true)
    setErrorMsg("")
    fetch(`/api/teaching-plans/versions/${versionId}/publish-check`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) {
          setErrorMsg(json.error || "Không thể kiểm tra điều kiện công bố.")
        } else {
          setCheck(json.check)
          setConfirmedAssessments({})
          setReplacements({})
        }
      })
      .catch((e) => setErrorMsg(e?.message || "Lỗi kết nối."))
      .finally(() => setLoading(false))
  }, [open, versionId])

  if (!open) return null

  const allPeriods = lessons.flatMap((l) =>
    l.periods.map((p) => ({
      stablePeriodId: p.stablePeriodId,
      label: `${l.lessonName} — Tiết ${p.periodIndexInLesson}/${l.periodCount} (${p.periodCode}, Tuần ${p.plannedWeek})`,
    }))
  )

  const uniqueImpactedOldPeriods = Array.from(
    new Map(
      (check?.impactedLinks || []).map((item) => [item.oldStablePeriodId, item])
    ).values()
  )

  const hasMissingFields = (check?.missingPeriodFields.length || 0) > 0
  const allAssessmentsConfirmed = (check?.unconfirmedAssessments || []).every(
    (a) => confirmedAssessments[a.lessonId]
  )
  const allReplacementsChosen = uniqueImpactedOldPeriods.every(
    (item) => Boolean(replacements[item.oldStablePeriodId])
  )
  const canConfirmPublish =
    Boolean(check) && !hasMissingFields && allAssessmentsConfirmed && allReplacementsChosen

  const handlePublish = async () => {
    setPublishing(true)
    setErrorMsg("")
    try {
      const res = await fetch(`/api/teaching-plans/versions/${versionId}/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PUBLISH",
          comment: comment.trim() || undefined,
          confirmedAssessmentLessonIds: Object.entries(confirmedAssessments)
            .filter(([, v]) => v)
            .map(([k]) => k),
          periodReplacements: replacements,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setErrorMsg(json.error || "Không thể công bố phiên bản.")
        return
      }
      onPublished(json)
      onClose()
    } catch (e: any) {
      setErrorMsg(e?.message || "Lỗi kết nối khi công bố.")
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl border border-[#E2E8F0] shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 bg-[#003B3A] text-white flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Kiểm tra & Công bố phiên bản v{versionNumber}</h3>
            <p className="text-xs text-teal-100">
              Rà soát đủ điều kiện tiết dạy, dòng đánh giá và ảnh hưởng tới lịch dự giờ tương lai trước khi công bố.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-[#F8FAFC]">
          {loading && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 flex items-center justify-center gap-2 text-sm text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin text-[#00736E]" />
              <span>Đang rà soát dữ liệu trước khi công bố...</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {check && !loading && (
            <>
              {/* 1. Missing period fields */}
              {check.missingPeriodFields.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-semibold text-rose-900 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>
                      Còn {check.missingPeriodFields.length} tiết chưa đủ thông tin bắt buộc (cần bổ sung trước khi công bố)
                    </span>
                  </div>
                  <ul className="text-xs text-rose-800 space-y-1 list-disc pl-5 max-h-40 overflow-y-auto">
                    {check.missingPeriodFields.map((m, idx) => (
                      <li key={idx}>
                        <strong>{m.periodCode}</strong> ({m.lessonName} – Tiết {m.periodIndexInLesson}): thiếu{" "}
                        {m.missingFields.join(", ")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 2. Assessment rows confirmation */}
              {check.unconfirmedAssessments.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2.5">
                  <div className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Xác nhận cách tổ chức các dòng ĐÁNH GIÁ</span>
                  </div>
                  <div className="space-y-2">
                    {check.unconfirmedAssessments.map((item) => (
                      <label
                        key={item.lessonId}
                        className="flex items-start gap-2.5 bg-white p-3 rounded-lg border border-amber-200 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-[#003B3A]"
                          checked={Boolean(confirmedAssessments[item.lessonId])}
                          onChange={(e) =>
                            setConfirmedAssessments((prev) => ({
                              ...prev,
                              [item.lessonId]: e.target.checked,
                            }))
                          }
                        />
                        <div>
                          <div className="font-medium text-slate-900">
                            {item.lessonCode} – {item.lessonName}
                          </div>
                          <div className="text-slate-600">{item.reason}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Impacted links needing replacement */}
              {uniqueImpactedOldPeriods.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>
                      Có {check.impactedLinks.length} buổi dạy / phiếu dự giờ tương lai gắn với tiết bị bỏ hoặc gộp
                    </span>
                  </div>
                  <p className="text-xs text-amber-800">
                    Vui lòng chọn tiết thay thế trong phiên bản mới để cập nhật liên kết trước khi công bố:
                  </p>
                  <div className="space-y-2.5">
                    {uniqueImpactedOldPeriods.map((item) => {
                      const affectedForThis = check.impactedLinks.filter(
                        (x) => x.oldStablePeriodId === item.oldStablePeriodId
                      )
                      return (
                        <div
                          key={item.oldStablePeriodId}
                          className="bg-white p-3 rounded-lg border border-amber-200 space-y-2"
                        >
                          <div className="text-xs font-medium text-slate-900">
                            Tiết bị bỏ/gộp: <span className="text-rose-700">{item.oldPeriodCode}</span> ({item.oldLessonName} – Tiết {item.oldPeriodIndexInLesson})
                          </div>
                          <div className="text-[11px] text-slate-600">
                            Ảnh hưởng {affectedForThis.length} mục:{" "}
                            {affectedForThis
                              .map(
                                (a) =>
                                  `${a.linkType === "OBSERVATION" ? "Dự giờ" : "TKB"} lớp ${a.className}${
                                    a.sessionDate ? ` (${a.sessionDate})` : ""
                                  }`
                              )
                              .join("; ")}
                          </div>
                          <select
                            value={replacements[item.oldStablePeriodId] || ""}
                            onChange={(e) =>
                              setReplacements((prev) => ({
                                ...prev,
                                [item.oldStablePeriodId]: e.target.value,
                              }))
                            }
                            className="w-full text-xs border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#00736E]"
                          >
                            <option value="">-- Chọn tiết thay thế --</option>
                            {allPeriods.map((opt) => (
                              <option key={opt.stablePeriodId} value={opt.stablePeriodId}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 4. Week shift warnings */}
              {check.weekShiftWarnings.length > 0 && (
                <div className="bg-white border border-amber-200 rounded-xl p-4 space-y-1.5">
                  <div className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Cảnh báo lệch tuần dự kiến ({check.weekShiftWarnings.length} lịch dự giờ chưa bắt đầu)</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Công bố sẽ cập nhật tuần dự kiến và gửi cảnh báo lệch lịch (không tự ý đổi ngày/giờ dự giờ).
                  </p>
                  <ul className="text-xs text-slate-700 list-disc pl-5 space-y-0.5">
                    {check.weekShiftWarnings.map((w, i) => (
                      <li key={i}>
                        Lớp {w.className} ({w.sessionDate || "chưa rõ ngày"}) – Tiết {w.periodCode}: Tuần {w.oldWeek} → Tuần {w.newWeek}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* All clear */}
              {canConfirmPublish && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Phiên bản v{versionNumber} đã đủ điều kiện công bố. Sau khi công bố, các lịch dự giờ chưa bắt đầu sẽ tự cập nhật theo nội dung mới; các phiếu đã bắt đầu/đã nộp tiếp tục giữ nguyên bản chụp cũ.
                  </span>
                </div>
              )}

              <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Ghi chú công bố (tùy chọn)
                </label>
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ví dụ: Công bố kế hoạch dạy học HK I năm học 2026-2027"
                  className="w-full text-xs border border-[#E2E8F0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#00736E]"
                />
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-3.5 bg-white border-t border-[#E2E8F0] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-[#E2E8F0] hover:bg-slate-50 rounded-lg"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={!canConfirmPublish || publishing}
            onClick={handlePublish}
            className="px-4 py-2 text-xs font-medium text-white bg-[#003B3A] hover:bg-[#005250] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg inline-flex items-center gap-2"
          >
            {publishing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Công bố kế hoạch</span>
          </button>
        </div>
      </div>
    </div>
  )
}
