"use client"

import React from "react"
import { StatusBadge } from "@/components/ui/badge"
import { SubjectGapAnalysis } from "@/lib/advisory/advisoryGapService"

interface SubjectGapTableProps {
  studentName: string
  studentCode: string
  className: string
  gaps: SubjectGapAnalysis[]
}

export function SubjectGapTable({ studentName, studentCode, className, gaps }: SubjectGapTableProps) {
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">
          Phân tích khoảng cách mục tiêu (GAP): <strong>{studentName}</strong> ({studentCode} - {className})
        </span>
      </div>
      <table className="w-full text-xs text-left">
        <thead className="bg-[#003B3A] font-semibold border-b text-white border-[#003B3A]">
          <tr className="text-[11px] font-semibold whitespace-nowrap">
            <th className="py-2.5 px-3 font-semibold">Môn học</th>
            <th className="py-2.5 px-3 text-center font-semibold">Mục tiêu HS</th>
            <th className="py-2.5 px-3 text-center font-semibold">Điểm thực tế</th>
            <th className="py-2.5 px-3 text-center font-semibold">Khoảng cách (GAP)</th>
            <th className="py-2.5 px-3 font-semibold">Xu hướng điểm số</th>
            <th className="py-2.5 px-3 text-center font-semibold">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0]">
          {gaps.map((g) => {
            const gapVal = g.gap
            const isAhead = gapVal !== null && gapVal <= 0
            const isBehind = gapVal !== null && gapVal > 0

            return (
              <tr key={g.subjectCode} className="hover:bg-slate-50/60">
                <td className="py-2.5 px-3 font-semibold text-slate-900">{g.subjectName}</td>
                <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                  {g.targetScore.toFixed(1)}
                </td>
                <td className="py-2.5 px-3 text-center font-mono font-bold">
                  {g.currentScore !== null ? g.currentScore.toFixed(1) : <span className="text-slate-400">—</span>}
                </td>
                <td className="py-2.5 px-3 text-center font-mono font-bold">
                  {gapVal !== null ? (
                    <span className={isAhead ? "text-emerald-600" : "text-red-600"}>
                      {gapVal > 0 ? `+${gapVal.toFixed(1)}` : gapVal.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                  {g.trendText || "Chưa đủ dữ liệu chuỗi"}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                      g.status === "DAT_VUOT_MUC_TIEU"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : g.status === "TIEM_CAN"
                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                        : g.status === "CAN_NO_LUC"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {g.statusLabel}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
