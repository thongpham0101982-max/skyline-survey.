"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Compass,
  Sparkles,
  CheckCircle2,
  UserCheck,
  Share2,
  Calendar,
  Send,
  ShieldCheck,
  Target,
  HeartHandshake,
  RefreshCw,
  BookOpen
} from "lucide-react"
import { RIASEC_PROFILES, type RiasecCode } from "@/lib/advisory/holland-skl-psych"

interface HollandAdvisoryOverviewCardProps {
  studentId: string
  studentName?: string
  academicYearId?: string
  mode: "TEACHER" | "PARENT"
}

export default function HollandAdvisoryOverviewCard({
  studentId,
  studentName,
  academicYearId = "",
  mode
}: HollandAdvisoryOverviewCardProps) {
  const [loading, setLoading] = useState(false)
  const [assessment, setAssessment] = useState<any>(null)
  const [draft, setDraft] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [toastMsg, setToastMsg] = useState("")

  // Teacher review state
  const [advisorNote, setAdvisorNote] = useState("")
  const [consultStatus, setConsultStatus] = useState("NONE")
  const [scheduledDate, setScheduledDate] = useState("")
  const [publishParent, setPublishParent] = useState(true)

  // Parent feedback state
  const [parentFeedbackText, setParentFeedbackText] = useState("")

  const loadData = useCallback(async () => {
    if (!studentId) return
    try {
      setLoading(true)
      const res = await fetch(
        `/api/advisory/holland?studentId=${encodeURIComponent(studentId)}&_t=${Date.now()}`,
        { cache: "no-store" }
      )
      if (res.ok) {
        const data = await res.json()
        setAssessment(data.latestCompleted || null)
        setDraft(data.activeDraft || null)
        if (data.latestCompleted) {
          setAdvisorNote(data.latestCompleted.advisorReviewNote || "")
          setConsultStatus(data.latestCompleted.consultationRequestStatus || "NONE")
          setScheduledDate(data.latestCompleted.consultationScheduledDate || "")
          setPublishParent(Boolean(data.latestCompleted.isPublishedToParent ?? true))
          setParentFeedbackText(data.latestCompleted.parentFeedback || "")
        }
      }
    } catch (e) {
      console.error("Load Holland card error:", e)
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleTeacherSaveReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assessment?.id) return
    try {
      setSaving(true)
      const res = await fetch("/api/advisory/holland", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: assessment.id,
          action: "ADVISOR_REVIEW_AND_PUBLISH",
          advisorReviewNote: advisorNote,
          consultationRequestStatus: consultStatus,
          consultationScheduledDate: scheduledDate,
          isPublishedToParent: publishParent
        })
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.success) {
        setAssessment(json.assessment)
        setToastMsg(
          publishParent
            ? "Đã lưu nhận xét hướng nghiệp, xử lý yêu cầu 1:1 và công bố báo cáo Holland tới PHHS!"
            : "Đã lưu nhận xét hướng nghiệp Holland!"
        )
        setTimeout(() => setToastMsg(""), 4000)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleParentSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assessment?.id) return
    try {
      setSaving(true)
      const res = await fetch("/api/advisory/holland", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: assessment.id,
          action: "PARENT_FEEDBACK",
          parentFeedback: parentFeedbackText
        })
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.success) {
        setAssessment(json.assessment)
        setToastMsg("Đã xác nhận xem báo cáo Holland và gửi phản hồi đồng hành tới GVCN/CVHT!")
        setTimeout(() => setToastMsg(""), 4000)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading && !assessment) {
    return (
      <div className="p-4 rounded-2xl bg-white border border-teal-200/80 text-xs text-slate-500 flex items-center gap-2">
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#003B3A]" />
        <span>Đang tải dữ liệu Khảo sát Holland (RIASEC)...</span>
      </div>
    )
  }

  if (!assessment) {
    if (mode === "PARENT") return null
    return (
      <div className="p-4 rounded-2xl bg-[#FAF8FC] border border-teal-200/70 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#003B3A]/10 text-[#003B3A] flex items-center justify-center font-bold">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-[#003B3A]">
              Khảo sát Holland – Khám phá sở thích nghề nghiệp (SKL_PSYCH v2.6.1)
            </p>
            <p className="text-[11px] text-slate-500">
              {draft
                ? `Học sinh đang làm dở bản nháp (${draft.answeredCount}/108 câu — Phần ${draft.currentStep}/6).`
                : "Học sinh chưa thực hiện bài Khảo sát Holland 108 câu trên Cổng Học sinh."}
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-[#003B3A] text-[11px] font-bold">
          {draft ? `Đang làm (${draft.answeredCount}/108)` : "Chưa khảo sát"}
        </span>
      </div>
    )
  }

  const report = assessment.reportSummary
  const ranked = report?.rankedDimensions || []
  const top3Codes: RiasecCode[] = report?.top3Codes || ["R", "I", "A"]

  return (
    <div className="bg-white rounded-2xl border border-teal-200/90 shadow-2xs overflow-hidden text-xs">
      {/* Header Banner in Sky-Line Global Purple */}
      <div
        className="px-4 sm:px-5 py-3.5 text-white flex flex-wrap items-center justify-between gap-2"
        style={{
          background: "linear-gradient(135deg, #003B3A 0%, #003B3A 55%, #01A49D 100%)"
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-amber-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xs sm:text-sm font-extrabold">
                Báo Cáo Khảo Sát Holland (RIASEC) • Mã {assessment.hollandCode}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-white/15 border border-white/25 text-[10px] font-bold text-teal-700">
                {assessment.version || "SKL_PSYCH v2.6.1"} • Minh chứng tham khảo
              </span>
            </div>
            <p className="text-[11px] text-teal-700/90">
              {studentName ? `Học sinh: ${studentName} • ` : ""}
              Hoàn thành 108/108 câu ngày{" "}
              {assessment.submittedAt
                ? new Date(assessment.submittedAt).toLocaleDateString("vi-VN")
                : "gần đây"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {assessment.consultationRequested && (
            <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold">
              🙋 Đề nghị Tư vấn 1:1 ({assessment.consultationRequestStatus})
            </span>
          )}
          <span className="px-3 py-1 rounded-xl bg-white text-[#003B3A] font-mono font-black text-xs shadow-2xs">
            {assessment.hollandCode}
          </span>
        </div>
      </div>

      {toastMsg && (
        <div className="mx-4 mt-3 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="p-4 sm:p-5 space-y-4">
        {/* Top 3 & 6 Dimensions Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left 7 cols: Top 3 Explanation & Recommended Clusters */}
          <div className="lg:col-span-7 space-y-2.5">
            <div className="p-3 rounded-xl bg-[#FAF8FC] border border-teal-200/70 space-y-1">
              <span className="font-extrabold text-[#003B3A] block">
                🧭 Giải thích tổ hợp sở thích nghề nghiệp Top 3 ({assessment.hollandCode}):
              </span>
              <p className="text-slate-700 leading-relaxed">
                {report?.combinedInterpretation}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {top3Codes.map((code, idx) => {
                const prof = RIASEC_PROFILES[code]
                if (!prof) return null
                return (
                  <div
                    key={code}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[#003B3A]">
                        Top {idx + 1}: {code}
                      </span>
                      <span className="font-bold text-slate-700">
                        {assessment.scores?.[code] ?? 0}/18
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 text-[11px]">{prof.nameVi}</p>
                    <p className="text-[10px] text-slate-500 line-clamp-2">
                      {prof.careerClusters[0]}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right 5 cols: 6-bar mini chart */}
          <div className="lg:col-span-5 p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
            <span className="font-bold text-slate-700 text-[11px] block">
              Điểm số 6 chiều kích RIASEC (Tối đa 18 điểm/nhóm):
            </span>
            {ranked.slice(0, 6).map((d: any, i: number) => (
              <div key={d.code} className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className="font-semibold text-slate-700">
                    #{i + 1} {d.code} ({d.nameVi})
                  </span>
                  <span className="font-bold text-[#003B3A]">
                    {d.rawScore}/18 ({d.percentage}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(5, d.percentage)}%`,
                      backgroundColor: i < 3 ? "#003B3A" : "#94A3B8"
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Student Reflection & 1:1 Request Banner */}
        {(assessment.studentReflection || assessment.consultationRequested) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {assessment.studentReflection && (
              <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200/70 space-y-1">
                <span className="font-bold text-[#003B3A] text-[11px] block">
                  💭 Tự nhận định của học sinh sau khảo sát:
                </span>
                <p className="text-slate-700 italic">“{assessment.studentReflection}”</p>
              </div>
            )}

            {assessment.consultationRequested && (
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1">
                <span className="font-bold text-amber-900 text-[11px] block">
                  🙋 Đề nghị Tư vấn 1:1 từ Học sinh:
                </span>
                <p className="font-semibold text-slate-800">
                  Chủ đề: {assessment.consultationRequestTopic}
                </p>
                {assessment.consultationRequestNote && (
                  <p className="text-slate-600 text-[11px]">
                    Ghi chú: {assessment.consultationRequestNote}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* MODE TEACHER: GVCN/CVHT REVIEW, SCHEDULE 1:1 & PUBLISH TO PARENT */}
        {mode === "TEACHER" ? (
          <form
            onSubmit={handleTeacherSaveReview}
            className="p-3.5 rounded-xl bg-teal-50/50 border border-teal-200/80 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-extrabold text-[#003B3A] flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-teal-600" />
                <span>GVCN / CVHT Xử Lý Đề Nghị Tư Vấn 1:1 & Nhận Xét Hướng Nghiệp</span>
              </span>

              <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-[#003B3A]">
                <input
                  type="checkbox"
                  checked={publishParent}
                  onChange={e => setPublishParent(e.target.checked)}
                  className="rounded border-teal-400"
                />
                <span>Công bố báo cáo Holland trên Cổng Phụ huynh</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Trạng thái xử lý Tư vấn 1:1:
                </label>
                <select
                  value={consultStatus}
                  onChange={e => setConsultStatus(e.target.value)}
                  className="raw-select w-full h-9 px-2.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800"
                >
                  <option value="NONE">Chưa có yêu cầu 1:1</option>
                  <option value="PENDING">⏳ Đang chờ xếp lịch 1:1</option>
                  <option value="SCHEDULED">📅 Đã xếp lịch gặp 1:1</option>
                  <option value="COMPLETED">✓ Đã hoàn thành tư vấn 1:1</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Ngày hẹn gặp 1:1 (nếu có):
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                  className="raw-input w-full h-9 px-2.5 rounded-lg bg-white border border-slate-300 text-xs"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full h-9 rounded-lg bg-[#003B3A] hover:bg-[#004D4A] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-amber-300" />
                  <span>{saving ? "Đang lưu..." : "Lưu nhận xét & Công bố"}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Nhận xét & Khuyến nghị định hướng từ GVCN/CVHT (Chia sẻ với Học sinh & Phụ huynh):
              </label>
              <textarea
                rows={2}
                value={advisorNote}
                onChange={e => setAdvisorNote(e.target.value)}
                placeholder="Nhận xét về sự phù hợp giữa mã Holland với năng lực học tập thực tế, gợi ý tổ hợp môn và hoạt động trải nghiệm..."
                className="raw-textarea w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs"
              />
            </div>

            {assessment.parentFeedback && (
              <div className="p-2.5 rounded-lg bg-white border border-emerald-200 text-[11px] text-emerald-900">
                <strong>🏡 Phản hồi đồng hành từ Phụ huynh:</strong> “{assessment.parentFeedback}”
              </div>
            )}
          </form>
        ) : (
          /* MODE PARENT: VIEW ADVISOR GUIDANCE, HOME ACCOMPANIMENT TIPS & SUBMIT FEEDBACK */
          <div className="space-y-3">
            {assessment.advisorReviewNote && (
              <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 space-y-1">
                <span className="font-bold text-[#003B3A] text-[11px] block">
                  👩‍🏫 Nhận xét & Khuyến nghị từ Thầy/Cô Cố vấn học tập ({assessment.advisorName || "GVCN"}):
                </span>
                <p className="text-slate-800 font-medium leading-relaxed">
                  {assessment.advisorReviewNote}
                </p>
              </div>
            )}

            {report?.parentAccompanimentGuide?.length > 0 && (
              <div className="p-3 rounded-xl bg-[#FAF8FC] border border-teal-200/80 space-y-1">
                <span className="font-bold text-[#003B3A] text-[11px] block">
                  🏡 Gợi ý Gia đình đồng hành cùng con theo mã Holland {assessment.hollandCode}:
                </span>
                <ul className="list-disc pl-4 space-y-1 text-slate-700 text-[11px]">
                  {report.parentAccompanimentGuide.map((tip: string, idx: number) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            <form
              onSubmit={handleParentSubmitFeedback}
              className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[11px]">
                  Phản hồi & Đồng hành hướng nghiệp từ Phụ huynh:
                </span>
                {assessment.parentAcknowledged && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    ✓ Phụ huynh đã xác nhận xem
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={parentFeedbackText}
                  onChange={e => setParentFeedbackText(e.target.value)}
                  placeholder="Chia sẻ định hướng của Gia đình hoặc đề nghị trao đổi thêm với GVCN về kết quả Holland của con..."
                  className="raw-input flex-1 h-9 px-3 rounded-lg bg-white border border-slate-300 text-xs"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 h-9 rounded-lg bg-[#003B3A] hover:bg-[#003B3A] text-white text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {saving
                    ? "Đang gửi..."
                    : assessment.parentAcknowledged
                    ? "Cập nhật phản hồi"
                    : "Xác nhận đã xem & Gửi phản hồi"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
