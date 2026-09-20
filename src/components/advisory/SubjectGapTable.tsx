"use client"

import React from "react"
import { TrendingUp, Target, Award, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { StatusBadge } from "@/components/ui/badge"
import { SubjectGapAnalysis } from "@/lib/advisory/advisoryGapService"

export interface SubjectGapTableProps {
  items: SubjectGapAnalysis[]
  showTrend?: boolean
  className?: string
}

export function SubjectGapTable({ items, showTrend = true, className = "" }: SubjectGapTableProps) {
  if (!items || items.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        Chưa có dữ liệu mục tiêu môn học
      </div>
    )
  }

  return (
    <div className={`overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs ${className}`}>
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
            <th className="py-2.5 px-3">Môn học</th>
            <th className="py-2.5 px-3 text-right">Điểm hiện tại</th>
            <th className="py-2.5 px-3 text-right">Mục tiêu</th>
            <th className="py-2.5 px-3 text-right">GAP</th>
            <th className="py-2.5 px-3 text-center">Trạng thái</th>
            {showTrend && <th className="py-2.5 px-3">Diễn biến (Trend)</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
          {items.map((row, idx) => {
            let statusVariant: "status-neutral" | "status-info" | "status-warning" | "status-success" | "status-error" = "status-info"
            if (row.status === "DAT_VUOT_MUC_TIEU") statusVariant = "status-success"
            else if (row.status === "TIEM_CAN") statusVariant = "status-warning"
            else if (row.status === "CHUA_CO_DIEM") statusVariant = "status-neutral"

            return (
              <tr key={row.subjectCode || idx} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-2.5 px-3 font-bold text-slate-900">
                  {row.subjectName}
                  <span className="ml-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    ({row.subjectCode})
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  {row.currentScore !== null ? (
                    <span className="font-extrabold text-slate-800">
                      {row.currentScore.toFixed(1)}
                      {row.currentPeriod && (
                        <span className="block text-[9px] text-slate-400 font-normal">{row.currentPeriod}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">--</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right font-extrabold text-[#003B3A]">
                  {row.targetScore.toFixed(1)}
                </td>
                <td className="py-2.5 px-3 text-right">
                  {row.gap !== null ? (
                    <span className={`font-bold ${row.gap <= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                      {row.gap > 0 ? `+${row.gap.toFixed(1)}` : row.gap.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-slate-400">--</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <StatusBadge status={statusVariant} label={row.statusLabel} />
                </td>
                {showTrend && (
                  <td className="py-2.5 px-3 text-slate-500 text-[11px] font-mono">
                    {row.trendText}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
