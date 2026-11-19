"use client"

import React, { useEffect, useState } from "react"
import { BookOpen, AlertTriangle, CheckCircle2, Link2, Unlink, Loader2 } from "lucide-react"
import type { TeachingPlanLessonRecord } from "@/lib/teaching-plan/types"

export interface SelectedTeachingPlanLinkPayload {
  planId: string
  stablePeriodId: string
  timetableSlotId?: string | null
  timetablePeriodNumber?: number | null
  timetableSession?: string | null
  lessonName: string
  periodIndexInLesson: number
  totalPeriodsInLesson: number
  focus: string
  objectives: string
  expectedEvidence: string
  adjustments: string
}

interface Props {
  classId?: string
  subjectId?: string
  level?: string
  grade?: string
  campusId?: string
  academicYearId?: string
  sessionDate?: string
  className?: string
  onAutoFillTimetableSlot?: (slot: any) => void
  onChangeLink: (link: SelectedTeachingPlanLinkPayload | null) => void
}

export function ObservationTeachingPlanPicker({
  classId,
  subjectId,
  level,
  grade,
  campusId,
  academicYearId,
  sessionDate,
  className = "sm:col-span-2",
  onChangeLink,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [candidates, setCandidates] = useState<any[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState("")
  const [lessons, setLessons] = useState<TeachingPlanLessonRecord[]>([])
  const [selectedStablePeriodId, setSelectedStablePeriodId] = useState("")
  const [isLinkedToObservation, setIsLinkedToObservation] = useState(false)
  const [suggestedWeek, setSuggestedWeek] = useState<number | null>(null)

  // Reset whenever grade/level/subject/class changes
  useEffect(() => {
    setSelectedPlanId("")
    setSelectedStablePeriodId("")
    setIsLinkedToObservation(false)
    setCandidates([])
    setLessons([])
    onChangeLink(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, grade, subjectId, classId])

  const hasValidQuery = Boolean(
    subjectId &&
      subjectId !== "other" &&
      ((classId && classId !== "other") || (level && grade && grade !== "all"))
  )

  useEffect(() => {
    if (!hasValidQuery) {
      setCandidates([])
      setLessons([])
      setSelectedPlanId("")
      setSelectedStablePeriodId("")
      setIsLinkedToObservation(false)
      onChangeLink(null)
      return
    }
    setLoading(true)
    const qs = new URLSearchParams({ subjectId: subjectId! })
    if (classId && classId !== "other") qs.set("classId", classId)
    if (level) qs.set("level", level)
    if (grade) qs.set("grade", grade)
    if (campusId) qs.set("campusId", campusId)
    if (academicYearId) qs.set("academicYearId", academicYearId)
    if (sessionDate) qs.set("sessionDate", sessionDate)
    if (selectedPlanId) qs.set("planId", selectedPlanId)

    fetch(`/api/teaching-plans/timetable-link?${qs.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) return
        setCandidates(json.candidates || [])
        setLessons(json.lessons || [])
        setSuggestedWeek(json.suggestedWeek ?? null)
        if (json.activePlan?.id && json.activePlan.id !== selectedPlanId) {
          setSelectedPlanId(json.activePlan.id)
        }
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, subjectId, level, grade, campusId, academicYearId, sessionDate, selectedPlanId])

  const allPeriods = lessons.flatMap((l) =>
    l.periods.map((p) => ({ lesson: l, period: p }))
  )
  const selectedPair = allPeriods.find((x) => x.period.stablePeriodId === selectedStablePeriodId)

  // Chỉ đưa sang Tên bài dạy / Chủ đề * khi người dùng bấm nút "Liên kết với Dự giờ"
  const handleLinkToObservation = () => {
    if (!selectedPlanId || !selectedPair) return
    setIsLinkedToObservation(true)
    onChangeLink({
      planId: selectedPlanId,
      stablePeriodId: selectedPair.period.stablePeriodId,
      timetableSlotId: null,
      timetablePeriodNumber: null,
      timetableSession: null,
      lessonName: selectedPair.lesson.lessonName,
      periodIndexInLesson: selectedPair.period.periodIndexInLesson,
      totalPeriodsInLesson: selectedPair.lesson.periodCount,
      focus: selectedPair.period.focus,
      objectives: selectedPair.period.objectives,
      expectedEvidence: selectedPair.period.expectedEvidence,
      adjustments: selectedPair.period.adjustments,
    })
  }

  const handleUnlink = () => {
    setIsLinkedToObservation(false)
    onChangeLink(null)
  }

  // Trường hợp chưa có Kế hoạch dạy học đã công bố: ẩn hoàn toàn để giữ form nhập trống như trước
  if (!hasValidQuery || candidates.length === 0) {
    return null
  }

  return (
    <div className={`${className} bg-[#F8FAFC] border border-[#E2E8F0] border-l-4 border-l-[#003B3A] rounded-xl p-4 space-y-3 text-xs`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold text-[#003B3A]">
          <BookOpen className="w-4 h-4 text-[#00736E]" />
          <span>Kế hoạch dạy học đã công bố</span>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00736E]" />}
          {isLinkedToObservation && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Đã liên kết với Dự giờ</span>
            </span>
          )}
        </div>
      </div>

      {/* Chọn bản kế hoạch nếu có nhiều hơn 1 bản */}
      {candidates.length > 1 && (
        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Chọn bản Kế hoạch dạy học áp dụng
          </label>
          <select
            value={selectedPlanId}
            onChange={(e) => {
              setSelectedPlanId(e.target.value)
              setSelectedStablePeriodId("")
              if (isLinkedToObservation) handleUnlink()
            }}
            className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white"
          >
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.scopeType === "CAMPUS" ? `Cơ sở ${c.campusCode}` : "Toàn hệ thống"})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Chọn bài / tiết từ Kế hoạch dạy học + nút "Liên kết với Dự giờ" */}
      {allPeriods.length > 0 && (
        <div className="space-y-2">
          <label className="block font-medium text-slate-700">
            Chọn tiết trong Kế hoạch dạy học
            {suggestedWeek ? ` (Gợi ý Tuần ${suggestedWeek})` : ""}
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedStablePeriodId}
              onChange={(e) => {
                setSelectedStablePeriodId(e.target.value)
                if (isLinkedToObservation) {
                  setIsLinkedToObservation(false)
                  onChangeLink(null)
                }
              }}
              className="flex-1 border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white tabular-nums"
            >
              <option value="">-- Chọn tiết kế hoạch dạy học --</option>
              {allPeriods.map(({ lesson, period }) => {
                const isSuggested = suggestedWeek && period.plannedWeek === suggestedWeek
                return (
                  <option key={period.stablePeriodId} value={period.stablePeriodId}>
                    {isSuggested ? "★ " : ""}Tuần {period.plannedWeek} | {lesson.lessonName} — Tiết{" "}
                    {period.periodIndexInLesson}/{lesson.periodCount} ({period.focus || period.periodCode})
                  </option>
                )
              })}
            </select>

            {isLinkedToObservation ? (
              <button
                type="button"
                onClick={handleUnlink}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-[#E2E8F0] hover:bg-slate-50 rounded-lg inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors"
              >
                <Unlink className="w-3.5 h-3.5 text-slate-500" />
                <span>Bỏ liên kết</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={!selectedPair}
                onClick={handleLinkToObservation}
                className="px-3.5 py-2 text-xs font-medium text-white bg-[#003B3A] hover:bg-[#005250] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Liên kết với Dự giờ</span>
              </button>
            )}
          </div>
          {!isLinkedToObservation && selectedPair && (
            <p className="text-[11px] text-slate-500">
              Bấm <strong>Liên kết với Dự giờ</strong> để tự động điền vào ô <strong>Tên bài dạy / Chủ đề *</strong>, hoặc bỏ qua để tự nhập tay.
            </p>
          )}
        </div>
      )}

      {/* Preview thông tin tiết khi đã chọn */}
      {selectedPair && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2 border-b border-[#F1F5F9] tabular-nums">
            <div>
              <div className="text-[11px] text-slate-500">Bài dạy</div>
              <div className="font-semibold text-[#003B3A]">{selectedPair.lesson.lessonName}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Tiết trong bài</div>
              <div className="font-semibold text-[#00736E]">
                Tiết {selectedPair.period.periodIndexInLesson}/{selectedPair.lesson.periodCount} (Tuần {selectedPair.period.plannedWeek})
              </div>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Trọng tâm tiết</div>
            <div className="text-slate-900 font-medium">{selectedPair.period.focus || "—"}</div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-slate-500">Yêu cầu cần đạt của tiết</div>
            <div className="text-slate-700 whitespace-pre-line">{selectedPair.period.objectives || "—"}</div>
          </div>

          {selectedPair.period.expectedEvidence && (
            <div>
              <div className="text-[11px] font-medium text-slate-500">Minh chứng học tập dự kiến</div>
              <div className="text-slate-700 whitespace-pre-line">{selectedPair.period.expectedEvidence}</div>
            </div>
          )}

          {suggestedWeek && selectedPair.period.plannedWeek !== suggestedWeek && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[11px] text-amber-800 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                Tiết dự kiến ở Tuần {selectedPair.period.plannedWeek}, khác với tuần hiện tại của ngày dự (Tuần {suggestedWeek}).
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
