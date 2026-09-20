"use client"

import React from "react"
import { RoleDashboardData } from "@/lib/dashboard/dashboardAggregationService"
import { MetricCard } from "./MetricCard"
import { ActionCenter } from "./ActionCenter"

interface TTCMDashboardViewProps {
  data: RoleDashboardData
  onDrilldown: (metricId: string) => void
}

export function TTCMDashboardView({ data, onDrilldown }: TTCMDashboardViewProps) {
  return (
    <div className="space-y-6">
      {/* 1. Cảnh báo & việc cần duyệt của Tổ trưởng */}
      <ActionCenter title="Hồ sơ cần duyệt & Cảnh báo tổ chuyên môn" actions={data.actions} />

      {/* 2. Core KPIs của Tổ */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Chỉ số hoạt động & Chất lượng tổ chuyên môn
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.coreMetrics.map((m) => (
            <MetricCard key={m.metricId} data={m} onDrilldown={onDrilldown} />
          ))}
        </div>
      </div>
    </div>
  )
}
