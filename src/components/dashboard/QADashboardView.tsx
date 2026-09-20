"use client"

import React from "react"
import { RoleDashboardData } from "@/lib/dashboard/dashboardAggregationService"
import { MetricCard } from "./MetricCard"
import { ActionCenter } from "./ActionCenter"
import { AlertCircle, Database } from "lucide-react"

interface QADashboardViewProps {
  data: RoleDashboardData
  onDrilldown: (metricId: string) => void
}

export function QADashboardView({ data, onDrilldown }: QADashboardViewProps) {
  return (
    <div className="space-y-6">
      {/* 1. Action Center: Đối soát hệ thống */}
      <ActionCenter title="Cảnh báo kiểm định & Đảm bảo chất lượng hệ thống" actions={data.actions} />

      {/* 2. Core KPIs Toàn hệ thống */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Chỉ số chất lượng học thuật & Dữ liệu toàn hệ thống
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.coreMetrics.map((m) => (
            <MetricCard key={m.metricId} data={m} onDrilldown={onDrilldown} />
          ))}
        </div>
      </div>

      {/* 3. Khối Data Quality Center */}
      {data.dataQualityIssues && data.dataQualityIssues.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[#003B3A]" />
              <span>Trung tâm Giám sát Chất lượng Dữ liệu (Data Quality Center)</span>
            </h3>
            <span className="text-[11px] text-slate-400">Phát hiện dữ liệu bất thường</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {data.dataQualityIssues.map((issue, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-800">{issue.category}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Cần đối soát</div>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold font-mono text-amber-700">{issue.count}</span>
                  <div className="text-[10px] text-slate-500">mục</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
