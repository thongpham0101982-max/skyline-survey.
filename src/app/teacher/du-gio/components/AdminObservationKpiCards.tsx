"use client"

import React from "react"
import { ClipboardCheck, Calendar, Users, Award, Clock, CheckCircle2, AlertCircle, TrendingUp, Sparkles } from "lucide-react"

interface AdminObservationKpiCardsProps {
  slots: any[]
  isPreschool?: boolean
  selectedMonth?: string
  academicYearName?: string
}

export function AdminObservationKpiCards({
  slots = [],
  isPreschool = false,
  selectedMonth = "all",
  academicYearName = ""
}: AdminObservationKpiCardsProps) {
  const safeSlots = Array.isArray(slots) ? slots : []
  const totalSlots = safeSlots.length

  // Calculate registrations & evaluations
  let totalRegistrations = 0
  let evaluatedCount = 0
  let pendingEvaluationCount = 0
  let totalScoreSum = 0
  let scoredCount = 0

  const ratingCounts: Record<string, number> = {
    Good: 0, // Giỏi / Tốt
    Fair: 0, // Khá
    Average: 0, // Trung bình / Đạt
    Poor: 0 // Chưa đạt / Không đạt / Không xếp loại
  }

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
        if (rating.includes("giỏi") || rating.includes("tốt")) {
          ratingCounts.Good++
        } else if (rating.includes("khá")) {
          ratingCounts.Fair++
        } else if (rating.includes("trung bình") || rating.includes("đạt")) {
          ratingCounts.Average++
        } else {
          ratingCounts.Poor++
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* KPI 1: Tổng số tiết / Hoạt động mở */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
        <div className="space-y-1">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            {isPreschool ? "Tổng hoạt động mở" : "Tổng số tiết dạy mở"}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-[#003B3A]">{totalSlots}</span>
            <span className="text-xs font-bold text-slate-400">tiết</span>
          </div>
          <p className="text-[10px] text-teal-700 font-bold">
            {totalRegistrations} lượt giáo viên đăng ký dự
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#1E8B87] flex items-center justify-center border border-teal-100 shadow-2xs shrink-0">
          <Calendar className="w-6 h-6" />
        </div>
      </div>

      {/* KPI 2: Đã hoàn thành đánh giá */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
        <div className="space-y-1">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Đã hoàn thành đánh giá
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700">{evaluatedCount}</span>
            <span className="text-xs font-bold text-emerald-600">/ {totalRegistrations}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${completionRate}%` }} />
            </div>
            <span className="text-[10px] font-black text-emerald-800">{completionRate}% tỷ lệ nộp</span>
          </div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shadow-2xs shrink-0">
          <CheckCircle2 className="w-6 h-6" />
        </div>
      </div>

      {/* KPI 3: Điểm đánh giá trung bình */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
        <div className="space-y-1">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Điểm đánh giá TB
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-amber-900">{avgScore}</span>
            <span className="text-xs font-bold text-slate-400">/ {maxScale}đ</span>
          </div>
          <p className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>{ratingCounts.Good} tiết Tốt / Giỏi</span>
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200 shadow-2xs shrink-0">
          <Award className="w-6 h-6" />
        </div>
      </div>

      {/* KPI 4: Chờ đánh giá / Quá hạn */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
        <div className="space-y-1">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Tiết chưa nộp phiếu
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-700">{pendingEvaluationCount}</span>
            <span className="text-xs font-bold text-slate-400">tiết</span>
          </div>
          <p className="text-[10px] text-rose-700 font-bold">
            {pendingEvaluationCount > 0 ? "⚠️ Cần nhắc nhở GV nộp điểm" : "✨ Tất cả đã hoàn tất"}
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100 shadow-2xs shrink-0">
          <Clock className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}
