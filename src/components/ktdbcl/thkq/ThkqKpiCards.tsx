// @ts-nocheck
"use client"

import React from "react"

interface Props {
  kpi: {
    totalEvaluations: number
    below5Count: number
    below5Rate: number
    belowSkylineCount: number
    belowSkylineRate: number
    aboveSkylineCount: number
    aboveSkylineRate: number
    score8To10Count: number
    score8To10Rate: number
    perfect10Count: number
    perfect10Rate: number
  } | null
  onSelectKpiFilter?: (filterType: string) => void
  activeFilter?: string
}

export function ThkqKpiCards({ kpi, onSelectKpiFilter, activeFilter = "ALL" }: Props) {
  if (!kpi) return null

  const items = [
    {
      id: "ALL",
      label: "Tổng lượt bài khảo sát",
      value: kpi.totalEvaluations ?? 0,
      sub: "100% phạm vi đang lọc",
      valueClass: "text-slate-900",
    },
    {
      id: "BELOW_MOET",
      label: "Dưới trung bình (< 5.0)",
      value: kpi.below5Count ?? 0,
      sub: `${kpi.below5Rate ?? 0}% tổng số bài`,
      valueClass: "text-[#E11D48]",
    },
    {
      id: "BELOW_SKYLINE",
      label: "Dưới chuẩn Sky-Line",
      value: kpi.belowSkylineCount ?? 0,
      sub: `${kpi.belowSkylineRate ?? 0}% tổng số bài`,
      valueClass: "text-[#D97706]",
    },
    {
      id: "ABOVE_SKYLINE",
      label: "Đạt & vượt chuẩn Sky-Line",
      value: kpi.aboveSkylineCount ?? 0,
      sub: `${kpi.aboveSkylineRate ?? 0}% tổng số bài`,
      valueClass: "text-[#00736E]",
    },
    {
      id: "8_TO_10",
      label: "Khá – Giỏi (8.0 – 10.0)",
      value: kpi.score8To10Count ?? 0,
      sub: `${kpi.score8To10Rate ?? 0}% phổ điểm`,
      valueClass: "text-[#059669]",
    },
    {
      id: "PERFECT_10",
      label: "Điểm 10 tuyệt đối",
      value: kpi.perfect10Count ?? 0,
      sub: `${kpi.perfect10Rate ?? 0}% bài khảo sát`,
      valueClass: "text-[#003B3A]",
    },
  ]

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-3.5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 tabular-nums">
        {items.map((item) => {
          const isSelected = activeFilter === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectKpiFilter && onSelectKpiFilter(item.id)}
              className={`text-left px-3.5 py-2.5 rounded-xl border transition cursor-pointer ${
                isSelected
                  ? "bg-[#F0FDFA] border-[#008B85] ring-1 ring-[#008B85]/20"
                  : "bg-[#F8FAFC] border-[#E2E8F0] hover:bg-white hover:border-slate-300"
              }`}
            >
              <div className="text-xs font-medium text-slate-600 truncate">
                {item.label}
              </div>
              <div className={`text-lg font-black mt-0.5 ${item.valueClass}`}>
                {Number(item.value).toLocaleString("vi-VN")}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                {item.sub}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
