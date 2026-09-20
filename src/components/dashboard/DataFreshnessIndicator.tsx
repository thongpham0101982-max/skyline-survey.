"use client"

import React from "react"
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react"
import { DataFreshnessInfo } from "@/lib/dashboard/dashboardDataContract"

interface DataFreshnessIndicatorProps {
  freshness: DataFreshnessInfo
}

export function DataFreshnessIndicator({ freshness }: DataFreshnessIndicatorProps) {
  return (
    <div className="inline-flex items-center gap-2 text-[11px] text-slate-500">
      <span className="flex items-center gap-1">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span>Cập nhật lúc: <strong>{freshness.lastUpdated}</strong></span>
      </span>
      {freshness.isStale ? (
        <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          <AlertTriangle className="w-3 h-3" />
          <span>{freshness.staleMessage || "Dữ liệu chưa được đồng bộ mới"}</span>
        </span>
      ) : (
        <span className="flex items-center gap-1 text-emerald-700 font-medium">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Đã đồng bộ</span>
        </span>
      )}
    </div>
  )
}
