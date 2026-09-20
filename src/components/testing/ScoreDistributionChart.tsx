"use client"

import React from "react"
import { ScoreDistributionBand, DescriptiveStatistics } from "@/lib/testing/examAnalyticsService"

interface ScoreDistributionChartProps {
  title: string
  subjectName: string
  scopeLabel: string
  bands: ScoreDistributionBand[]
  stats: DescriptiveStatistics
}

export function ScoreDistributionChart({
  title,
  subjectName,
  scopeLabel,
  bands,
  stats
}: ScoreDistributionChartProps) {
  const maxCount = Math.max(...bands.map(b => b.count), 1)

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Môn: <strong>{subjectName}</strong> | Phạm vi: <strong>{scopeLabel}</strong>
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500">ĐTB: </span>
            <strong className="text-slate-900 text-sm">{stats.mean.toFixed(2)}</strong>
          </div>
          <div>
            <span className="text-slate-500">Độ lệch chuẩn: </span>
            <strong className="text-slate-900">{stats.stdDev.toFixed(2)}</strong>
          </div>
          <div>
            <span className="text-slate-500">Tỷ lệ đạt (≥5): </span>
            <strong className="text-emerald-700">{stats.passRate.toFixed(1)}%</strong>
          </div>
        </div>
      </div>

      {/* Histogram Bar Visualization */}
      <div className="space-y-3 pt-1">
        {bands.map((b) => {
          const barWidthPercent = Math.max(4, Math.round((b.count / maxCount) * 100))

          return (
            <div key={b.range} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 w-36 shrink-0">{b.label}</span>
                <span className="font-mono text-slate-500 text-[11px]">
                  <strong>{b.count}</strong> HS ({b.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="h-6 w-full bg-slate-100 rounded-md overflow-hidden flex items-center p-0.5">
                <div
                  style={{ width: `${barWidthPercent}%` }}
                  className={`h-full rounded transition-all duration-500 flex items-center justify-end pr-2 text-[10px] font-bold font-mono ${
                    b.range === "<5.0"
                      ? "bg-red-500 text-white"
                      : b.range === "5.0-6.9"
                      ? "bg-amber-500 text-white"
                      : b.range === "7.0-7.9"
                      ? "bg-blue-500 text-white"
                      : b.range === "8.0-8.9"
                      ? "bg-emerald-500 text-white"
                      : "bg-purple-600 text-white"
                  }`}
                  title={`${b.label}: ${b.count} học sinh (${b.percentage}%)`}
                >
                  {b.count > 0 && <span>{b.count}</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-xs text-center">
        <div className="p-2 bg-slate-50 rounded-lg">
          <span className="text-slate-500 block text-[11px]">Tổng số HS làm bài</span>
          <strong className="font-mono text-slate-800 text-sm">{stats.gradedCount}</strong>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg">
          <span className="text-slate-500 block text-[11px]">Trung vị (Median)</span>
          <strong className="font-mono text-slate-800 text-sm">{stats.median.toFixed(2)}</strong>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg">
          <span className="text-slate-500 block text-[11px]">Điểm Min - Max</span>
          <strong className="font-mono text-slate-800 text-sm">{stats.min} - {stats.max}</strong>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg">
          <span className="text-slate-500 block text-[11px]">Tỷ lệ Giỏi/Xuất sắc</span>
          <strong className="font-mono text-purple-700 text-sm">{stats.excellentRate.toFixed(1)}%</strong>
        </div>
      </div>
    </div>
  )
}
