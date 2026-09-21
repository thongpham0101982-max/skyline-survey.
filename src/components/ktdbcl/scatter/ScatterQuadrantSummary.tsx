// @ts-nocheck
"use client"

import React from "react"
import { Award, TrendingUp, AlertTriangle, AlertCircle } from "lucide-react"

interface Props {
  quadrants: any
  activeQuadrant: string
  onSelectQuadrant: (q: string) => void
}

export function ScatterQuadrantSummary({
  quadrants,
  activeQuadrant,
  onSelectQuadrant
}: Props) {
  if (!quadrants) return null

  const items = [
    {
      key: "Q1",
      data: quadrants.q1,
      icon: Award,
      badge: "GÓC I (CAO - CAO)",
      borderActive: "ring-2 ring-emerald-500 border-emerald-500",
      bgHover: "hover:bg-emerald-50/50"
    },
    {
      key: "Q2",
      data: quadrants.q2,
      icon: TrendingUp,
      badge: "GÓC II (THẤP X - CAO Y)",
      borderActive: "ring-2 ring-sky-500 border-sky-500",
      bgHover: "hover:bg-sky-50/50"
    },
    {
      key: "Q3",
      data: quadrants.q3,
      icon: AlertCircle,
      badge: "GÓC III (THẤP - THẤP)",
      borderActive: "ring-2 ring-rose-500 border-rose-500",
      bgHover: "hover:bg-rose-50/50"
    },
    {
      key: "Q4",
      data: quadrants.q4,
      icon: AlertTriangle,
      badge: "GÓC IV (CAO X - THẤP Y)",
      borderActive: "ring-2 ring-amber-500 border-amber-500",
      bgHover: "hover:bg-amber-50/50"
    }
  ]

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
        <span>Phân nhóm Sư phạm Sky-Line (4 Góc phần tư chiến lược):</span>
        {activeQuadrant !== "ALL" && (
          <button
            onClick={() => onSelectQuadrant("ALL")}
            className="text-[11px] text-[#005B58] hover:underline font-extrabold"
          >
            Hiển thị tất cả 4 nhóm
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map(it => {
          const def = it.data?.definition || {}
          const isSelected = activeQuadrant === it.key
          const Icon = it.icon

          return (
            <div
              key={it.key}
              onClick={() => onSelectQuadrant(isSelected ? "ALL" : it.key)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer bg-white shadow-sm ${it.bgHover} ${
                isSelected ? it.borderActive : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${def.bgColor} ${def.textColor} border ${def.borderColor}`}>
                  {it.badge}
                </span>
                <span className="text-xs font-black text-slate-400">
                  {it.data?.percent || 0}%
                </span>
              </div>

              <div className="mt-2.5 flex items-baseline justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                    <span style={{ color: def.color }}>●</span>
                    <span>{def.name || it.key}</span>
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                    {def.tagline}
                  </p>
                </div>
                <div className="text-2xl font-black text-slate-800">
                  {it.data?.count || 0}
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-600 line-clamp-2" title={def.pedagogicalAction}>
                <strong className="text-slate-700">Hành động:</strong> {def.pedagogicalAction}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
