// @ts-nocheck
"use client"

import React from "react"
import {
  Users,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Award,
  Sparkles
} from "lucide-react"

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
  }
  onSelectKpiFilter?: (type: string) => void
}

export function ThkqKpiCards({ kpi, onSelectKpiFilter }: Props) {
  if (!kpi) return null

  const cards = [
    {
      id: "TOTAL",
      title: "Tổng lượt khảo sát",
      value: kpi.totalEvaluations.toLocaleString("vi-VN"),
      sub: "Dữ liệu kỳ khảo sát đã chọn",
      badge: "Toàn bộ",
      icon: Users,
      bgGradient: "from-slate-50 to-slate-100/80",
      borderColor: "border-slate-200",
      textColor: "text-slate-800",
      iconBg: "bg-slate-200 text-slate-700",
      filterType: "ALL"
    },
    {
      id: "BELOW_5",
      title: "Dưới TB (Điểm < 5.0)",
      value: kpi.below5Count.toLocaleString("vi-VN"),
      sub: `Chiếm ${kpi.below5Rate}% tổng số bài`,
      badge: "Cần can thiệp gấp",
      icon: AlertTriangle,
      bgGradient: "from-rose-50/90 to-red-100/60",
      borderColor: "border-red-200",
      textColor: "text-red-700",
      iconBg: "bg-red-500 text-white shadow-md shadow-red-500/20",
      filterType: "BELOW_MOET"
    },
    {
      id: "BELOW_SKYLINE",
      title: "Dưới Chuẩn Sky-Line",
      value: kpi.belowSkylineCount.toLocaleString("vi-VN"),
      sub: `Chiếm ${kpi.belowSkylineRate}% tổng số bài`,
      badge: "< Chuẩn Trường",
      icon: AlertCircle,
      bgGradient: "from-amber-50/90 to-orange-100/60",
      borderColor: "border-amber-200",
      textColor: "text-amber-800",
      iconBg: "bg-amber-500 text-white shadow-md shadow-amber-500/20",
      filterType: "BELOW_SKYLINE"
    },
    {
      id: "ABOVE_SKYLINE",
      title: "Đạt & Vượt Chuẩn",
      value: kpi.aboveSkylineCount.toLocaleString("vi-VN"),
      sub: `Chiếm ${kpi.aboveSkylineRate}% tổng số bài`,
      badge: "Đạt yêu cầu",
      icon: CheckCircle2,
      bgGradient: "from-sky-50/90 to-cyan-100/60",
      borderColor: "border-sky-200",
      textColor: "text-sky-800",
      iconBg: "bg-sky-600 text-white shadow-md shadow-sky-600/20",
      filterType: "ABOVE_SKYLINE"
    },
    {
      id: "SCORE_8_10",
      title: "Học sinh 8.0 - 10.0",
      value: kpi.score8To10Count.toLocaleString("vi-VN"),
      sub: `Chiếm ${kpi.score8To10Rate}% phổ điểm`,
      badge: "Khá - Giỏi",
      icon: Award,
      bgGradient: "from-emerald-50/90 to-teal-100/60",
      borderColor: "border-emerald-200",
      textColor: "text-emerald-800",
      iconBg: "bg-emerald-600 text-white shadow-md shadow-emerald-600/20",
      filterType: "8_TO_10"
    },
    {
      id: "PERFECT_10",
      title: "Điểm 10 Tuyệt Đối",
      value: kpi.perfect10Count.toLocaleString("vi-VN"),
      sub: `Chiếm ${kpi.perfect10Rate}% bài khảo sát`,
      badge: "Xuất sắc ★",
      icon: Sparkles,
      bgGradient: "from-purple-50/90 to-fuchsia-100/60",
      borderColor: "border-purple-200",
      textColor: "text-purple-800",
      iconBg: "bg-purple-600 text-white shadow-md shadow-purple-600/20",
      filterType: "PERFECT_10"
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 mb-6">
      {cards.map(c => {
        const Icon = c.icon
        return (
          <div
            key={c.id}
            onClick={() => onSelectKpiFilter && onSelectKpiFilter(c.filterType)}
            className={`cursor-pointer rounded-2xl bg-gradient-to-br ${c.bgGradient} border ${c.borderColor} p-4 shadow-sm hover:shadow-md transition transform hover:-translate-y-0.5 active:scale-95 group`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 border border-black/5 text-slate-600 uppercase tracking-wider">
                {c.badge}
              </span>
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${c.iconBg}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <p className="text-[11px] font-semibold text-slate-600 truncate">{c.title}</p>
            <h3 className={`text-2xl font-black mt-1 ${c.textColor} tracking-tight`}>{c.value}</h3>
            <p className="text-[10px] text-slate-500 mt-1 truncate font-medium">{c.sub}</p>
          </div>
        )
      })}
    </div>
  )
}
