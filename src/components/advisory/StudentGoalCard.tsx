"use client"

import React from "react"
import { Target, CheckCircle2, Clock, Sparkles, AlertTriangle } from "lucide-react"
import { StatusBadge } from "@/components/ui/badge"

export interface StudentGoalCardProps {
  categoryLabel: string
  weight: number
  targetText: string
  actionPlan?: string
  progressStatus?: string
  gapText?: string
  className?: string
}

export function StudentGoalCard({
  categoryLabel,
  weight,
  targetText,
  actionPlan,
  progressStatus = "DANG_TIEN_TRIEN",
  gapText,
  className = ""
}: StudentGoalCardProps) {
  let badgeVariant: "status-neutral" | "status-info" | "status-warning" | "status-success" | "status-error" = "status-info"
  let badgeLabel = "Đang tiến triển"

  const s = String(progressStatus).toUpperCase()
  if (s === "DAT" || s === "HOAN_THANH") {
    badgeVariant = "status-success"
    badgeLabel = "Đã hoàn thành"
  } else if (s === "CAN_CO_GANG" || s === "CAN_DIEU_CHINH") {
    badgeVariant = "status-warning"
    badgeLabel = "Cần điều chỉnh"
  } else if (s === "CHUA_BAT_DAU" || s === "NOT_STARTED") {
    badgeVariant = "status-neutral"
    badgeLabel = "Chưa bắt đầu"
  }

  return (
    <div className={`p-4 rounded-xl border border-slate-200 bg-white shadow-xs hover:border-[#003B3A]/30 transition-all ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-extrabold text-[#003B3A] bg-[#E6F0EA] px-2.5 py-0.5 rounded-full">
          {categoryLabel} ({weight}%)
        </span>
        <StatusBadge status={badgeVariant} label={badgeLabel} />
      </div>

      <h4 className="font-bold text-sm text-slate-900 mb-1 leading-snug">
        {targetText}
      </h4>

      {actionPlan && (
        <p className="text-xs text-slate-500 mb-2">
          <span className="font-semibold text-slate-700">Kế hoạch:</span> {actionPlan}
        </p>
      )}

      {gapText && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-semibold">Khoảng cách (GAP):</span>
          <span className="font-extrabold text-[#003B3A]">{gapText}</span>
        </div>
      )}
    </div>
  )
}
