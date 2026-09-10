"use client"

import React from "react"
import { GraduationCap, Eye, Star, CheckCircle2, AlertTriangle, Target, TrendingUp } from "lucide-react"

interface TeacherTargetTrackerProps {
  taughtCount: number
  targetTaught: number
  observedCount: number
  targetObserved: number
  totalTaughtSlots?: number
  totalObservedSlots?: number
  pendingEvaluationCount?: number
  avgScore?: string | number | null
  receivedEvaluationCount?: number
  isPreschool?: boolean
  academicYearName?: string
}

export function TeacherTargetTracker({
  taughtCount,
  targetTaught,
  observedCount,
  targetObserved,
  totalTaughtSlots = 0,
  totalObservedSlots = 0,
  pendingEvaluationCount = 0,
  avgScore = null,
  receivedEvaluationCount = 0,
  isPreschool = false,
  academicYearName = ""
}: TeacherTargetTrackerProps) {
  const safeTargetTaught = targetTaught > 0 ? targetTaught : (isPreschool ? 4 : 2)
  const safeTargetObserved = targetObserved > 0 ? targetObserved : (isPreschool ? 8 : 10)
  const maxScore = isPreschool ? 10 : 20

  const taughtPercent = Math.min(100, Math.round((taughtCount / safeTargetTaught) * 100))
  const observedPercent = Math.min(100, Math.round((observedCount / safeTargetObserved) * 100))

  const taughtRemaining = Math.max(0, safeTargetTaught - taughtCount)
  const observedRemaining = Math.max(0, safeTargetObserved - observedCount)

  const numAvgScore = avgScore ? Number(avgScore) : null
  const scorePercent = numAvgScore ? Math.min(100, Math.round((numAvgScore / maxScore) * 100)) : 0

  const scoreRating = numAvgScore
    ? numAvgScore >= (isPreschool ? 9 : 17)
      ? "🌟 Xuất sắc"
      : numAvgScore >= (isPreschool ? 8 : 14)
      ? "✨ Tốt"
      : numAvgScore >= (isPreschool ? 7 : 10)
      ? "Đạt"
      : "Chưa đạt"
    : "Chưa có"

  const isAllCompleted = taughtRemaining === 0 && observedRemaining === 0

  return (
    <div className="bg-gradient-to-br from-[#003B3A] via-[#004D4B] to-[#1E8B87] rounded-3xl p-4 sm:p-5 text-white shadow-xl border border-white/10 relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-60 h-60 bg-amber-400/10 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20" />

      <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        {/* Left Side: Summary & Overall Status */}
        <div className="space-y-1.5 xl:max-w-xs 2xl:max-w-sm">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-[10px] font-black uppercase tracking-wider text-[#48BFE3] border border-white/20 flex items-center gap-1">
              <Target className="w-3 h-3" />
              <span>Chỉ tiêu CM {academicYearName ? `• ${academicYearName}` : ""}</span>
            </span>
            {isAllCompleted ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 text-[10px] font-black flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Đạt 100% chỉ tiêu</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-400/40 text-[10px] font-black flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-amber-300" />
                <span>Đang thực hiện</span>
              </span>
            )}
          </div>

          <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
            Tiến độ Hoàn thành Chỉ tiêu Dự giờ Cá nhân
          </h3>
          <p className="text-[11px] text-teal-100/80 leading-relaxed font-medium">
            {isPreschool
              ? "Theo dõi tiết trực tiếp giảng dạy (≥1 phiếu nhận xét), tiết đi dự giờ và điểm trung bình nhận được."
              : "Theo dõi tiết trực tiếp giảng dạy (≥1 phiếu nhận xét), tiết đi dự giờ và điểm trung bình nhận được."}
          </p>

          {/* Pending evaluation warning if any */}
          {pendingEvaluationCount > 0 && (
            <div className="mt-1.5 p-2 bg-rose-500/25 border border-rose-400/40 rounded-xl flex items-center gap-1.5 text-rose-200 text-[11px] font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-300 shrink-0" />
              <span>Thầy/Cô có {pendingEvaluationCount} tiết đã dự chưa nộp phiếu!</span>
            </div>
          )}
        </div>

        {/* Right Side: 3 Compact Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 flex-1 xl:max-w-2xl 2xl:max-w-3xl">
          {/* Card 1: Tiết Giảng Dạy */}
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex flex-col justify-between gap-2 shadow-xs hover:bg-white/[0.14] transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30 font-black">
                  <GraduationCap className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-black text-white uppercase tracking-wider truncate">
                  {isPreschool ? "Tổ chức HĐ" : "Tiết giảng dạy"}
                </span>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${
                taughtRemaining === 0 
                  ? "bg-emerald-500/30 text-emerald-200 border-emerald-400/40" 
                  : "bg-white/15 text-amber-200 border-white/20"
              }`}>
                {taughtPercent}%
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-black text-white">{taughtCount}</span>
                <span className="text-[11px] font-bold text-teal-200">/ {safeTargetTaught} tiết</span>
              </div>
              <span className="text-[10px] font-extrabold text-amber-300">
                {taughtRemaining === 0 ? "✅ Đã đạt" : `Thiếu ${taughtRemaining} tiết`}
              </span>
            </div>

            <div>
              <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden mb-1 border border-white/10">
                <div 
                  className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-400 to-emerald-400"
                  style={{ width: `${taughtPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-teal-200/90 font-medium">
                <span>Đã mở: <strong className="text-white font-bold">{totalTaughtSlots} tiết</strong></span>
                <span>{taughtCount}/{totalTaughtSlots} có phiếu</span>
              </div>
            </div>
          </div>

          {/* Card 2: Tiết Đi Dự Giờ */}
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex flex-col justify-between gap-2 shadow-xs hover:bg-white/[0.14] transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-sky-400/20 text-[#48BFE3] flex items-center justify-center border border-sky-400/30 font-black">
                  <Eye className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-black text-white uppercase tracking-wider truncate">
                  {isPreschool ? "Dự giờ HĐ" : "Tiết đi dự giờ"}
                </span>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${
                observedRemaining === 0 
                  ? "bg-emerald-500/30 text-emerald-200 border-emerald-400/40" 
                  : "bg-white/15 text-[#48BFE3] border-white/20"
              }`}>
                {observedPercent}%
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-black text-white">{observedCount}</span>
                <span className="text-[11px] font-bold text-teal-200">/ {safeTargetObserved} tiết</span>
              </div>
              <span className="text-[10px] font-extrabold text-cyan-300">
                {observedRemaining === 0 ? "✅ Đã đạt" : `Thiếu ${observedRemaining} tiết`}
              </span>
            </div>

            <div>
              <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden mb-1 border border-white/10">
                <div 
                  className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400"
                  style={{ width: `${observedPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-teal-200/90 font-medium">
                <span>Đã dự: <strong className="text-white font-bold">{totalObservedSlots} tiết</strong></span>
                <span>{observedCount}/{totalObservedSlots} nộp phiếu</span>
              </div>
            </div>
          </div>

          {/* Card 3: Điểm TB Nhận Được */}
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex flex-col justify-between gap-2 shadow-xs hover:bg-white/[0.14] transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30 font-black">
                  <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                </div>
                <span className="text-[11px] font-black text-white uppercase tracking-wider truncate">
                  Điểm TB nhận được
                </span>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-white/15 text-amber-200 border border-white/20">
                {receivedEvaluationCount} phiếu
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-black text-white">
                  {avgScore ? avgScore : "—"}
                </span>
                <span className="text-[11px] font-bold text-teal-200">/ {maxScore}.0đ</span>
              </div>
              <span className="text-[10px] font-black text-amber-300">
                {scoreRating}
              </span>
            </div>

            <div>
              <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden mb-1 border border-white/10">
                <div 
                  className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400"
                  style={{ width: `${scorePercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-teal-200/90 font-medium">
                <span>Từ: <strong className="text-white font-bold">{taughtCount} tiết có phiếu</strong></span>
                <span>{scorePercent}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
