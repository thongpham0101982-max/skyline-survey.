"use client"

import React from "react"
import { ActionItem } from "@/lib/dashboard/dashboardDataContract"
import { AlertCircle, AlertTriangle, Info, ArrowRight, CheckCircle2 } from "lucide-react"
import Link from "next/link"

interface ActionCenterProps {
  title?: string
  actions: ActionItem[]
}

export function ActionCenter({ title = "Việc cần làm & Cảnh báo", actions }: ActionCenterProps) {
  if (actions.length === 0) {
    return (
      <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-emerald-800">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        <div>
          <strong className="font-semibold block text-emerald-900">Không có công việc tồn đọng</strong>
          <span>Tất cả phiếu chuyên môn, mục tiêu học sinh và sổ điểm đều đã hoàn thành đúng hạn.</span>
        </div>
      </div>
    )
  }

  const severityIconMap = {
    CRITICAL: AlertCircle,
    WARNING: AlertTriangle,
    INFO: Info
  }

  const severityClassMap = {
    CRITICAL: "border-red-200 bg-red-50/40 text-red-950",
    WARNING: "border-amber-200 bg-amber-50/30 text-amber-950",
    INFO: "border-blue-200 bg-blue-50/30 text-blue-950"
  }

  const iconColorMap = {
    CRITICAL: "text-red-600",
    WARNING: "text-amber-600",
    INFO: "text-blue-600"
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <span>{title}</span>
          <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-[10px] font-mono">
            {actions.length}
          </span>
        </h3>
      </div>

      <div className="space-y-2">
        {actions.map((act) => {
          const Icon = severityIconMap[act.severity]

          return (
            <div
              key={act.id}
              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                severityClassMap[act.severity]
              }`}
            >
              <div className="flex items-start gap-2.5">
                <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColorMap[act.severity]}`} />
                <div className="space-y-0.5">
                  <div className="font-semibold">{act.title}</div>
                  <div className="text-[11px] opacity-80">{act.subtitle}</div>
                  <div className="text-[10px] text-slate-500 font-mono">Phạm vi: {act.scopeDetail}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {act.dueText && (
                  <span className="text-[11px] font-mono font-medium text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                    {act.dueText}
                  </span>
                )}
                <Link
                  href={act.linkUrl}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  <span>{act.actionLabel}</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
