"use client"

import React, { useEffect, useState } from "react"
import {
  Target,
  UserCheck,
  Zap,
  Feather,
  Calendar,
  Share2,
  MessageSquareHeart,
  Award,
  Check
} from "lucide-react"

export interface WorkflowStepUI {
  key: string
  stepNumber: number
  label: string
  actor: string
  completed: boolean
}

interface TriPartyWorkflowBannerProps {
  studentId?: string
  academicYearId?: string
  goals?: any[]
  consultations?: any[]
  reflections?: any[]
  actionItems?: any[]
  termEvaluations?: any[]
  parentExchanges?: any[]
  viewerRole: "TEACHER" | "STUDENT" | "PARENT"
  compact?: boolean
  onStepClick?: (stepNumber: number, stepKey: string) => void
}

export default function TriPartyWorkflowBanner({
  studentId,
  academicYearId = "",
  goals,
  consultations,
  reflections,
  actionItems,
  termEvaluations,
  parentExchanges,
  compact = false,
  onStepClick
}: TriPartyWorkflowBannerProps) {
  const [remoteProfile, setRemoteProfile] = useState<any>(null)

  useEffect(() => {
    const hasDirectProps =
      Array.isArray(goals) || Array.isArray(consultations) || Array.isArray(reflections)
    if (!hasDirectProps && studentId) {
      fetch(
        `/api/advisory/profile-360?studentId=${studentId}&academicYearId=${academicYearId || ""}&_t=${Date.now()}`,
        { cache: "no-store" }
      )
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (data) setRemoteProfile(data)
        })
        .catch(() => null)
    }
  }, [studentId, academicYearId, goals, consultations, reflections])

  const effectiveGoals = goals ?? remoteProfile?.goals ?? []
  const effectiveConsultations =
    consultations ?? remoteProfile?.consultationLogs ?? remoteProfile?.consultations ?? []
  const effectiveReflections = reflections ?? remoteProfile?.reflections ?? []
  const effectiveActionItems = actionItems ?? remoteProfile?.actionItems ?? []
  const effectiveTermEvals = termEvaluations ?? remoteProfile?.termEvaluations ?? []
  const effectiveExchanges = parentExchanges ?? remoteProfile?.parentExchanges ?? []

  const hasGoals = effectiveGoals.some((g: any) => Boolean(g?.targetText))
  const isAdvisorReviewed = effectiveGoals.some(
    (g: any) =>
      g?.signedByTeacher ||
      g?.teacherComment ||
      g?.advisorReviewStatus === "CONFIRMED" ||
      g?.advisorReviewStatus === "NEEDS_ADJUSTMENT"
  )
  const hasActions =
    effectiveActionItems.some(
      (a: any) => a?.status === "COMPLETED" || a?.status === "IN_PROGRESS" || a?.evidenceNotes
    ) ||
    effectiveGoals.some(
      (g: any) =>
        Array.isArray(g?.actions) &&
        g.actions.some(
          (a: any) =>
            a?.status === "DOING" ||
            a?.status === "DONE" ||
            a?.status === "COMPLETED" ||
            a?.evidenceNotes
        )
    )
  const hasReflections =
    effectiveReflections.length > 0 ||
    effectiveConsultations.some((c: any) => Boolean(c?.studentReflection))
  const hasSession = effectiveConsultations.length > 0
  const hasSharedFollowUp = effectiveConsultations.some(
    (c: any) => c?.shareWithParent !== false && (c?.nextActions || c?.parentSharedSummary || c?.notes)
  )
  const hasParentFeedback =
    effectiveGoals.some((g: any) => g?.signedByParent || g?.parentMessage) ||
    effectiveConsultations.some((c: any) => c?.parentAcknowledged || c?.parentFeedback) ||
    effectiveExchanges.length > 0
  const hasProgressReview = effectiveTermEvals.length > 0

  const steps = [
    {
      key: "STUDENT_GOAL",
      stepNumber: 1,
      shortLabel: "Mục tiêu SMART",
      actorBadge: "HS",
      completed: hasGoals,
      icon: Target
    },
    {
      key: "ADVISOR_REVIEW",
      stepNumber: 2,
      shortLabel: "CVHT xác nhận",
      actorBadge: "CVHT",
      completed: isAdvisorReviewed,
      icon: UserCheck
    },
    {
      key: "STUDENT_ACTION",
      stepNumber: 3,
      shortLabel: "Hành động 7 ngày",
      actorBadge: "HS",
      completed: hasActions,
      icon: Zap
    },
    {
      key: "REFLECTION",
      stepNumber: 4,
      shortLabel: "Tự phản tư",
      actorBadge: "HS",
      completed: hasReflections,
      icon: Feather
    },
    {
      key: "ADVISORY_SESSION",
      stepNumber: 5,
      shortLabel: "Phiên gặp 1:1",
      actorBadge: "1:1",
      completed: hasSession,
      icon: Calendar
    },
    {
      key: "SHARED_FOLLOW_UP",
      stepNumber: 6,
      shortLabel: "Chia sẻ PHHS",
      actorBadge: "CVHT",
      completed: hasSharedFollowUp,
      icon: Share2
    },
    {
      key: "PARENT_FEEDBACK",
      stepNumber: 7,
      shortLabel: "PHHS phản hồi",
      actorBadge: "PH",
      completed: hasParentFeedback,
      icon: MessageSquareHeart
    },
    {
      key: "PROGRESS_REVIEW",
      stepNumber: 8,
      shortLabel: "Đánh giá kỳ",
      actorBadge: "3 Bên",
      completed: hasProgressReview,
      icon: Award
    }
  ]

  const completedCount = steps.filter(s => s.completed).length
  const progressPercent = Math.round((completedCount / steps.length) * 100)

  return (
    <div
      className={`bg-white rounded-xl ${
        compact ? "px-3.5 py-2.5" : "px-4 py-3"
      } border border-slate-200/80 shadow-2xs space-y-2.5`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            Chu trình 3 bên
          </span>
          <span className="text-xs font-semibold text-slate-700">
            Tiến trình đồng hành khép kín
          </span>
          {onStepClick && (
            <span className="text-[11px] text-slate-400 hidden md:inline">
              • Nhấn vào từng bước để mở nhanh
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-slate-600 tabular-nums">
            {completedCount}/{steps.length} ({progressPercent}%)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
        {steps.map((step, idx) => {
          const Icon = step.icon
          const isCurrent = !step.completed && (idx === 0 || steps[idx - 1].completed)
          return (
            <button
              type="button"
              key={step.key}
              onClick={() => onStepClick && onStepClick(step.stepNumber, step.key)}
              title={onStepClick ? `Mở bước ${step.stepNumber}: ${step.shortLabel}` : step.shortLabel}
              className={`group px-2.5 py-1.5 rounded-lg border text-left transition-all flex items-center gap-2 ${
                onStepClick ? "cursor-pointer hover:border-teal-400/80 hover:bg-teal-50/30" : ""
              } ${
                step.completed
                  ? "bg-emerald-50/40 border-emerald-200/80 text-slate-800"
                  : isCurrent
                  ? "bg-amber-50/50 border-amber-300/90 text-slate-900"
                  : "bg-slate-50/40 border-slate-200/60 text-slate-400"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold transition-colors ${
                  step.completed
                    ? "bg-emerald-600 text-white"
                    : isCurrent
                    ? "bg-amber-500 text-white"
                    : "bg-slate-200/70 text-slate-500"
                }`}
              >
                {step.completed ? <Check className="w-3 h-3 stroke-[2.5]" /> : <Icon className="w-3 h-3" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9px] font-medium uppercase tracking-tight text-slate-400">
                    B{step.stepNumber} • {step.actorBadge}
                  </span>
                </div>
                <div className="text-[11px] font-semibold leading-tight truncate">
                  {step.shortLabel}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
