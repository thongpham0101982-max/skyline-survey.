"use client"

import React from "react"
import { Clock, User, CheckCircle2 } from "lucide-react"
import { StatusBadge } from "@/components/ui/badge"

export interface WeeklyFollowUpCardProps {
  periodName: string
  date: string
  evaluatorName?: string
  trackingLevel?: string
  observations: string
  nextActions?: string
  className?: string
}

export function WeeklyFollowUpCard({
  periodName,
  date,
  evaluatorName,
  trackingLevel = "DANG_TIEN_TRIEN",
  observations,
  nextActions,
  className = ""
}: WeeklyFollowUpCardProps) {
  let badgeVariant: "status-neutral" | "status-info" | "status-warning" | "status-success" | "status-error" = "status-info"
  let badgeLabel = "Đang tiến triển"

  const lvl = String(trackingLevel).toUpperCase()
  if (lvl === "TOT" || lvl === "DAT") {
    badgeVariant = "status-success"
    badgeLabel = "Tiến triển tốt"
  } else if (lvl === "CAN_CHU_Y" || lvl === "KHO_KHAN") {
    badgeVariant = "status-warning"
    badgeLabel = "Cần hỗ trợ thêm"
  }

  return (
    <div className={`p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-xs text-slate-800">{periodName}</span>
          <span className="text-[11px] text-slate-400 font-mono">• {date}</span>
        </div>
        <StatusBadge status={badgeVariant} label={badgeLabel} />
      </div>

      <p className="text-xs text-slate-700 leading-relaxed font-normal">
        {observations}
      </p>

      {nextActions && (
        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
          <span className="font-bold text-[#003B3A]">Kế hoạch tuần tới: </span>
          {nextActions}
        </div>
      )}

      {evaluatorName && (
        <div className="text-[10px] text-slate-400 font-medium text-right">
          Ghi nhận bởi: {evaluatorName}
        </div>
      )}
    </div>
  )
}
