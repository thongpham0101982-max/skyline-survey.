"use client"

import React from "react"
import { GraduationCap, Eye, CheckCircle2, AlertTriangle, Clock, Award, Target, TrendingUp } from "lucide-react"

interface TeacherTargetTrackerProps {
  taughtCount: number
  targetTaught: number
  observedCount: number
  targetObserved: number
  pendingEvaluationCount?: number
  isPreschool?: boolean
  academicYearName?: string
}

export function TeacherTargetTracker({
  taughtCount,
  targetTaught,
  observedCount,
  targetObserved,
  pendingEvaluationCount = 0,
  isPreschool = false,
  academicYearName = ""
}: TeacherTargetTrackerProps) {
  const safeTargetTaught = targetTaught > 0 ? targetTaught : 2
  const safeTargetObserved = targetObserved > 0 ? targetObserved : 5

  const taughtPercent = Math.min(100, Math.round((taughtCount / safeTargetTaught) * 100))
  const observedPercent = Math.min(100, Math.round((observedCount / safeTargetObserved) * 100))

  const taughtRemaining = Math.max(0, safeTargetTaught - taughtCount)
  const observedRemaining = Math.max(0, safeTargetObserved - observedCount)

  const isAllCompleted = taughtRemaining === 0 && observedRemaining === 0

  return (
    <div className="bg-gradient-to-br from-[#003B3A] via-[#004D4B] to-[#1E8B87] rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-white/10 relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-60 h-60 bg-amber-400/10 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Side: Summary & Overall Status */}
        <div className="space-y-2 max-w-md">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-black uppercase tracking-wider text-[#48BFE3] border border-white/20 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              <span>Chỉ tiêu Chuyên môn {academicYearName ? `• ${academicYearName}` : ""}</span>
            </span>
            {isAllCompleted ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[11px] font-black flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Đã đạt 100% chỉ tiêu</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[11px] font-black flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
                <span>Đang thực hiện</span>
              </span>
            )}
          </div>

          <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
            Tiến độ Hoàn thành Chỉ tiêu Dự giờ Cá nhân
          </h3>
          <p className="text-xs text-teal-100/90 leading-relaxed font-medium">
            {isPreschool
              ? "Theo dõi số hoạt động trực tiếp tổ chức và số hoạt động tham gia dự giờ trong năm học."
              : "Theo dõi số tiết trực tiếp giảng dạy và số tiết tham gia dự giờ theo quy chế chuyên môn."}
          </p>

          {/* Pending evaluation warning if any */}
          {pendingEvaluationCount > 0 && (
            <div className="mt-2 p-2.5 bg-rose-500/20 border border-rose-400/40 rounded-2xl flex items-center gap-2 text-rose-200 text-xs font-bold animate-pulse">
              <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
              <span>Thầy/Cô có {pendingEvaluationCount} tiết đã dự nhưng chưa hoàn thành nộp phiếu đánh giá!</span>
            </div>
          )}
        </div>

        {/* Right Side: 2 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:min-w-[460px]">
          {/* Card 1: Chỉ tiêu Tiết Dạy */}
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex flex-col justify-between gap-3 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    {isPreschool ? "Tổ chức hoạt động" : "Tiết giảng dạy"}
                  </h4>
                  <p className="text-[10px] text-teal-200">Trực tiếp lên lớp</p>
                </div>
              </div>
              <span className={`text-xs font-black px-2.5 py-1 rounded-xl border ${
                taughtRemaining === 0 
                  ? "bg-emerald-500/30 text-emerald-200 border-emerald-400/40" 
                  : "bg-white/15 text-amber-200 border-white/20"
              }`}>
                {taughtPercent}%
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-teal-200 font-bold">Đã dạy:</span>
                <span className="text-sm font-black text-white">
                  {taughtCount} <span className="text-[11px] text-teal-300 font-medium">/ {safeTargetTaught} tiết</span>
                </span>
              </div>
              <div className="w-full h-2.5 bg-black/30 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div 
                  className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-amber-400 to-emerald-400 shadow-sm"
                  style={{ width: `${taughtPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-teal-200 text-right font-medium">
                {taughtRemaining === 0 ? "🎉 Đã hoàn thành chỉ tiêu dạy" : `Còn thiếu ${taughtRemaining} tiết`}
              </p>
            </div>
          </div>

          {/* Card 2: Chỉ tiêu Tiết Dự */}
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex flex-col justify-between gap-3 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-400/20 text-[#48BFE3] flex items-center justify-center border border-sky-400/30">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    {isPreschool ? "Dự giờ hoạt động" : "Tiết đi dự giờ"}
                  </h4>
                  <p className="text-[10px] text-teal-200">Đăng ký tham gia dự</p>
                </div>
              </div>
              <span className={`text-xs font-black px-2.5 py-1 rounded-xl border ${
                observedRemaining === 0 
                  ? "bg-emerald-500/30 text-emerald-200 border-emerald-400/40" 
                  : "bg-white/15 text-[#48BFE3] border-white/20"
              }`}>
                {observedPercent}%
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-teal-200 font-bold">Đã dự:</span>
                <span className="text-sm font-black text-white">
                  {observedCount} <span className="text-[11px] text-teal-300 font-medium">/ {safeTargetObserved} tiết</span>
                </span>
              </div>
              <div className="w-full h-2.5 bg-black/30 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div 
                  className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 shadow-sm"
                  style={{ width: `${observedPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-teal-200 text-right font-medium">
                {observedRemaining === 0 ? "🎉 Đã hoàn thành chỉ tiêu dự" : `Còn thiếu ${observedRemaining} tiết`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
