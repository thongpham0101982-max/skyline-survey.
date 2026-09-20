"use client"

import React from "react"
import { ClipboardCheck, TrendingUp, AlertTriangle, Users } from "lucide-react"

interface AssessmentSummaryProps {
  totalStudents: number
  gradedCount: number
  averageScore: number
  passRate: number
  atRiskCount: number
}

export function AssessmentSummary({
  totalStudents,
  gradedCount,
  averageScore,
  passRate,
  atRiskCount
}: AssessmentSummaryProps) {
  const completionRate = totalStudents > 0 ? Math.round((gradedCount / totalStudents) * 1000) / 10 : 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
      <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
        <div className="flex items-center justify-between text-slate-500">
          <span>Tiến độ nhập điểm</span>
          <ClipboardCheck className="w-4 h-4 text-[#003B3A]" />
        </div>
        <div className="text-xl font-bold text-slate-900 font-mono">
          {gradedCount} <span className="text-xs text-slate-400 font-normal">/ {totalStudents}</span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">Hoàn tất {completionRate}%</div>
      </div>

      <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
        <div className="flex items-center justify-between text-slate-500">
          <span>Điểm trung bình</span>
          <TrendingUp className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="text-xl font-bold text-slate-900 font-mono">{averageScore.toFixed(2)}</div>
        <div className="text-[11px] text-emerald-700 font-medium">Tỷ lệ đạt {passRate.toFixed(1)}%</div>
      </div>

      <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
        <div className="flex items-center justify-between text-slate-500">
          <span>Cảnh báo nguy cơ</span>
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
        <div className="text-xl font-bold text-amber-700 font-mono">{atRiskCount} HS</div>
        <div className="text-[11px] text-amber-700 font-medium">Cần hỗ trợ & can thiệp</div>
      </div>

      <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
        <div className="flex items-center justify-between text-slate-500">
          <span>Chưa có điểm / Vắng</span>
          <Users className="w-4 h-4 text-slate-400" />
        </div>
        <div className="text-xl font-bold text-slate-700 font-mono">{totalStudents - gradedCount} HS</div>
        <div className="text-[11px] text-slate-400">Không tính là điểm 0</div>
      </div>
    </div>
  )
}
