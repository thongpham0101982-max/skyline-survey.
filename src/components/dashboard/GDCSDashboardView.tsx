"use client"

import React from "react"
import { RoleDashboardData } from "@/lib/dashboard/dashboardAggregationService"
import { MetricCard } from "./MetricCard"
import { ActionCenter } from "./ActionCenter"

interface GDCSDashboardViewProps {
  data: RoleDashboardData
  onDrilldown: (metricId: string) => void
}

export function GDCSDashboardView({ data, onDrilldown }: GDCSDashboardViewProps) {
  return (
    <div className="space-y-6">
      {/* 1. Cảnh báo cấp cơ sở */}
      <ActionCenter title="Vấn đề trọng yếu cần chỉ đạo tại cơ sở" actions={data.actions} />

      {/* 2. Executive KPIs: Học sinh - Giáo viên - Vận hành */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Chỉ số điều hành tổng thể cơ sở
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
