"use client"

import React, { useEffect, useState } from "react"
import { BookOpen, Lock, RefreshCw, AlertTriangle, CheckCircle2, Save, Loader2 } from "lucide-react"
import type {
  ObjectiveEvidenceStatus,
  ObservationTeachingPlanView,
} from "@/lib/teaching-plan/types"

interface Props {
  observationSlotId: string
  evaluationId?: string | null
  editable?: boolean
}

const EVIDENCE_OPTIONS: Array<{ value: ObjectiveEvidenceStatus; label: string }> = [
  { value: "OBSERVED_MET", label: "Đạt yêu cầu" },
  { value: "OBSERVED_PARTIAL", label: "Đạt một phần" },
  { value: "NOT_OBSERVED", label: "Chưa quan sát được" },
]

export function ObservationObjectiveEvidencePanel({
  observationSlotId,
  evaluationId,
  editable = false,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<ObservationTeachingPlanView | null>(null)
  const [evidences, setEvidences] = useState<ObservationTeachingPlanView["evidences"]>([])
  const [saving, setSaving] = useState(false)
  const [savedNotice, setSavedNotice] = useState("")

  useEffect(() => {
    if (!observationSlotId) return
    setLoading(true)
    const qs = new URLSearchParams({ observationSlotId })
    if (evaluationId) qs.set("evaluationId", evaluationId)
    fetch(`/api/teaching-plans/observation-link?${qs.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.view) {
          setView(json.view)
          setEvidences(json.view.evidences || [])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [observationSlotId, evaluationId])

  if (loading) {
    return (
      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-xs text-slate-500 flex items-center gap-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00736E]" />
        <span>Đang tải thông tin Kế hoạch dạy học liên kết...</span>
      </div>
    )
  }

  // Legacy observation slots without teaching plan link: render nothing so old workflow is 100% untouched
  if (!view || !view.linked || !view.data) return null

  const d = view.data

  const handleSaveEvidences = async () => {
    if (!evaluationId) return
    setSaving(true)
    setSavedNotice("")
    try {
      const res = await fetch("/api/teaching-plans/observation-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_EVIDENCES",
          observationSlotId,
          evaluationId,
          evidences,
        }),
      })
      const json = await res.json()
      if (json.success && json.view) {
        setView(json.view)
        setEvidences(json.view.evidences || [])
        setSavedNotice("Đã lưu minh chứng quan sát theo Yêu cầu cần đạt.")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] overflow-hidden text-xs">
      {/* Header */}
      <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold text-[#003B3A]">
          <BookOpen className="w-4 h-4 text-[#00736E]" />
          <span>Kế hoạch dạy học liên kết</span>
        </div>
        <div className="flex items-center gap-2">
          {view.snapshotLocked ? (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>Bản chụp cố định (v{d.versionNumber})</span>
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              <span>Đồng bộ bản công bố (v{d.versionNumber})</span>
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3.5">
        {view.weekMismatchWarning && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{view.weekMismatchNote}</span>
          </div>
        )}

        {/* Metadata strip with separate Tiết trong bài vs Tiết trên TKB */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 tabular-nums">
          <div>
            <div className="text-[11px] text-slate-500">Bài dạy</div>
            <div className="font-semibold text-[#003B3A] mt-0.5">{d.lessonName}</div>
            <div className="text-[11px] text-slate-500">{d.topicName}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Tiết trong bài</div>
            <div className="font-semibold text-[#00736E] mt-0.5">
              Tiết {d.periodIndexInLesson}/{d.totalPeriodsInLesson} của bài
            </div>
            <div className="text-[11px] text-slate-500">Tuần dự kiến: Tuần {d.plannedWeek}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Tiết trên thời khóa biểu</div>
            <div className="font-semibold text-slate-800 mt-0.5">
              {d.timetablePeriodNumber
                ? `Tiết ${d.timetablePeriodNumber} (${d.timetableSession === "AFTERNOON" ? "Chiều" : "Sáng"})`
                : "Theo giờ đăng ký dự giờ"}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Trọng tâm tiết</div>
            <div className="text-slate-900 font-medium">{d.focus || "—"}</div>
          </div>
          {d.expectedEvidence && (
            <div>
              <div className="text-[11px] font-medium text-slate-500">Minh chứng học tập dự kiến</div>
              <div className="text-slate-700 whitespace-pre-line">{d.expectedEvidence}</div>
            </div>
          )}
          {(d.adjustments || d.lessonAdjustments) && (
            <div>
              <div className="text-[11px] font-medium text-slate-500">Điều chỉnh / Bổ sung</div>
              <div className="text-slate-700 whitespace-pre-line">
                {[d.adjustments, d.lessonAdjustments].filter(Boolean).join("\n")}
              </div>
            </div>
          )}
        </div>

        {/* Per-YCCĐ Observation Evidence Checklist */}
        {evidences.length > 0 && (
          <div className="border-t border-[#E2E8F0] pt-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-[#003B3A]">
                Minh chứng quan sát theo Yêu cầu cần đạt ({evidences.length})
              </div>
              {editable && evaluationId && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveEvidences}
                  className="px-3 py-1.5 text-[11px] font-medium text-white bg-[#003B3A] hover:bg-[#005250] rounded-lg inline-flex items-center gap-1"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  <span>Lưu minh chứng YCCĐ</span>
                </button>
              )}
            </div>

            {savedNotice && (
              <div className="text-[11px] text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{savedNotice}</span>
              </div>
            )}

            <div className="space-y-2">
              {evidences.map((ev, idx) => (
                <div
                  key={ev.objectiveIndex}
                  className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="text-slate-800 font-medium">
                      {idx + 1}. {ev.objectiveText}
                    </div>
                    {editable ? (
                      <select
                        value={ev.status}
                        onChange={(e) =>
                          setEvidences((prev) =>
                            prev.map((item) =>
                              item.objectiveIndex === ev.objectiveIndex
                                ? { ...item, status: e.target.value as ObjectiveEvidenceStatus }
                                : item
                            )
                          )
                        }
                        className="text-[11px] border border-[#E2E8F0] rounded-lg px-2.5 py-1 bg-white shrink-0"
                      >
                        {EVIDENCE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] border shrink-0 ${
                          ev.status === "OBSERVED_MET"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : ev.status === "OBSERVED_PARTIAL"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {EVIDENCE_OPTIONS.find((o) => o.value === ev.status)?.label ||
                          "Chưa quan sát được"}
                      </span>
                    )}
                  </div>

                  {editable ? (
                    <input
                      type="text"
                      value={ev.evidenceNote}
                      onChange={(e) =>
                        setEvidences((prev) =>
                          prev.map((item) =>
                            item.objectiveIndex === ev.objectiveIndex
                              ? { ...item, evidenceNote: e.target.value }
                              : item
                          )
                        )
                      }
                      placeholder="Ghi nhận minh chứng quan sát được trên lớp (nếu có)..."
                      className="w-full text-[11px] border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 bg-white"
                    />
                  ) : (
                    ev.evidenceNote && (
                      <div className="text-[11px] text-slate-600">
                        Minh chứng ghi nhận: {ev.evidenceNote}
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
