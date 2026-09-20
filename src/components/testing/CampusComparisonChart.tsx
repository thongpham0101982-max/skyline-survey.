"use client"

import React from "react"
import { CampusQualityMetric } from "@/lib/testing/examAnalyticsService"

interface CampusComparisonChartProps {
  systemMean: number
  campuses: CampusQualityMetric[]
  subjectName: string
  periodName: string
}

export function CampusComparisonChart({
  systemMean,
  campuses,
  subjectName,
  periodName
}: CampusComparisonChartProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Đối chuẩn chất lượng giữa các cơ sở</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Môn: <strong>{subjectName}</strong> | Kỳ: <strong>{periodName}</strong>
          </p>
        </div>
        <div className="text-xs font-mono bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          <span className="text-slate-600">Điểm TB toàn hệ thống: </span>
          <strong className="text-[#003B3A] text-sm">{systemMean.toFixed(2)}</strong>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
            <tr>
              <th className="py-2.5 px-3">Cơ sở</th>
              <th className="py-2.5 px-3 text-center">Số HS làm bài</th>
              <th className="py-2.5 px-3 text-center">Điểm TB</th>
              <th className="py-2.5 px-3 text-center">Chênh lệch vs Hệ thống</th>
              <th className="py-2.5 px-3 text-center">Tỷ lệ Đạt (≥5)</th>
              <th className="py-2.5 px-3 text-center">Tỷ lệ Giỏi (≥8)</th>
              <th className="py-2.5 px-3 text-center">Độ lệch chuẩn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {campuses.map((c) => {
              const isAboveSystem = c.systemMeanDelta >= 0

              return (
                <tr key={c.campusId} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{c.campusName}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-700">{c.gradedStudents}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 text-sm">
                    {c.meanScore.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold">
                    <span className={isAboveSystem ? "text-emerald-700" : "text-amber-700"}>
                      {isAboveSystem ? `+${c.systemMeanDelta.toFixed(2)}` : c.systemMeanDelta.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-800">{c.passRate.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-center font-mono text-purple-700 font-semibold">
                    {c.excellentRate.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-500">{c.stdDev.toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
