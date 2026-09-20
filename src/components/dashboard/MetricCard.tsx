"use client"

import React from "react"
import { MetricCardData } from "@/lib/dashboard/dashboardDataContract"
import { ArrowUpRight, ArrowDownRight, ChevronRight, HelpCircle } from "lucide-react"

interface MetricCardProps {
  data: MetricCardData
  onDrilldown?: (metricId: string) => void
}

export function MetricCard({ data, onDrilldown }: MetricCardProps) {
  const statusBorderMap = {
    SUCCESS: "border-emerald-200 bg-white hover:border-emerald-300",
    NORMAL: "border-slate-200 bg-white hover:border-slate-300",
    WARNING: "border-amber-200 bg-amber-50/20 hover:border-amber-300",
    CRITICAL: "border-red-200 bg-red-50/20 hover:border-red-300"
  }

  const valueColorMap = {
    SUCCESS: "text-emerald-700",
    NORMAL: "text-slate-900",
    WARNING: "text-amber-700",
    CRITICAL: "text-red-700"
  }

  return (
    <div
      onClick={() => onDrilldown && onDrilldown(data.metricId)}
      className={`p-4 rounded-xl border shadow-2xs transition-all duration-200 flex flex-col justify-between ${
        statusBorderMap[data.status]
      } ${onDrilldown ? "cursor-pointer hover:shadow-xs group" : ""}`}
    >
      <div>
        {/* Header: Label & Source */}
        <div className="flex items-center justify-between gap-1 text-slate-500 text-xs">
          <span className="font-semibold text-slate-700 truncate" title={data.label}>
            {data.label}
          </span>
          {onDrilldown && (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0" />
          )}
        </div>

        {/* Value Display */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className={`text-2xl font-bold font-mono tracking-tight ${valueColorMap[data.status]}`}>
            {data.displayValue}
          </span>
          {data.target !== undefined && data.target !== null && (
            <span className="text-xs text-slate-400 font-mono">
              / Mục tiêu: {data.target}{data.unit}
            </span>
          )}
        </div>
      </div>

      {/* Footer: Variance & Context */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="truncate pr-1" title={data.contextText}>
          {data.contextText}
        </span>
        {data.variance !== undefined && data.variance !== null && (
          <span
            className={`font-mono font-semibold flex items-center shrink-0 ${
              data.variance >= 0 ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {data.variance >= 0 ? (
              <ArrowUpRight className="w-3 h-3 inline" />
            ) : (
              <ArrowDownRight className="w-3 h-3 inline" />
            )}
            {data.variance >= 0 ? `+${data.variance}` : data.variance}
            {data.unit}
          </span>
        )}
      </div>
    </div>
  )
}
