"use client"

import React from "react"
import { Calendar, Award, Clock, CheckCircle2 } from "lucide-react"

interface AdminObservationKpiCardsProps {
  slots: any[]
  isPreschool?: boolean
  selectedMonth?: string
  academicYearName?: string
}

export function AdminObservationKpiCards({
  slots = [],
  isPreschool = false,
}: AdminObservationKpiCardsProps) {
  const safeSlots = Array.isArray(slots) ? slots : []
  const totalSlots = safeSlots.length

  let totalRegistrations = 0
  let evaluatedCount = 0
  let pendingEvaluationCount = 0
  let totalScoreSum = 0
  let scoredCount = 0
  let goodCount = 0

  safeSlots.forEach((s: any) => {
    const regs = s?.registrations || []
    totalRegistrations += regs.length

    regs.forEach((r: any) => {
      const ev = r?.evaluation
      if (ev && (ev.totalScore != null || (ev.criteriaScores && ev.criteriaScores.length > 0))) {
        evaluatedCount++
        const score = Number(ev.totalScore || 0)
        if (score > 0) {
          totalScoreSum += score
          scoredCount++
        }

        const rating = (ev.overallRating || "").toLowerCase()
        if (
          rating.includes("giỏi") ||
          rating.includes("tốt") ||
          rating.includes("strong practice") ||
          rating.includes("proficient") ||
          rating.includes("effective")
        ) {
          goodCount++
        }
      } else {
        pendingEvaluationCount++
      }
    })
  })

  const avgScore = scoredCount > 0 ? (totalScoreSum / scoredCount).toFixed(2) : "—"
  const maxScale = isPreschool ? "10.00" : "20.00"
  const completionRate = totalRegistrations > 0 ? Math.round((evaluatedCount / totalRegistrations) * 100) : 0

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8F0] tabular-nums">
        {/* KPI 1 */}
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-slate-500">
              {isPreschool ? "Tổng hoạt động mở" : "Tổng số tiết dạy mở"}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-[#003B3A]">{totalSlots.toLocaleString("vi-VN")}</span>
              <span className="text-xs text-slate-400">tiết</span>
            </div>
            <p className="text-[11px] text-[#00736E] font-medium">
              {totalRegistrations.toLocaleString("vi-VN")} lượt giáo viên đăng ký dự
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#00736E] flex items-center justify-center border border-teal-100 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-slate-500">Đã hoàn thành đánh giá</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-[#059669]">{evaluatedCount.toLocaleString("vi-VN")}</span>
              <span className="text-xs font-medium text-slate-400">/ {totalRegistrations.toLocaleString("vi-VN")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#059669] rounded-full" style={{ width: `${completionRate}%` }} />
              </div>
              <span className="text-[11px] font-semibold text-[#059669]">{completionRate}% tỷ lệ nộp</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#059669] flex items-center justify-center border border-emerald-100 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-slate-500">Điểm đánh giá trung bình</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-[#003B3A]">{avgScore}</span>
              <span className="text-xs text-slate-400">/ {maxScale}đ</span>
            </div>
            <p className="text-[11px] text-[#D97706] font-medium">
              {goodCount.toLocaleString("vi-VN")} phiếu xếp loại Tốt / Giỏi
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#D97706] flex items-center justify-center border border-amber-100 shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-slate-500">Phiếu chưa nộp điểm</p>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-bold ${pendingEvaluationCount > 0 ? "text-[#E11D48]" : "text-[#059669]"}`}>
                {pendingEvaluationCount.toLocaleString("vi-VN")}
              </span>
              <span className="text-xs text-slate-400">phiếu</span>
            </div>
            <p className={`text-[11px] font-medium ${pendingEvaluationCount > 0 ? "text-[#E11D48]" : "text-[#059669]"}`}>
              {pendingEvaluationCount > 0 ? "Cần nhắc nhở GV nộp phiếu" : "Tất cả đã hoàn tất"}
            </p>
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
              pendingEvaluationCount > 0
                ? "bg-rose-50 text-[#E11D48] border-rose-100"
                : "bg-emerald-50 text-[#059669] border-emerald-100"
            }`}
          >
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  )
}
