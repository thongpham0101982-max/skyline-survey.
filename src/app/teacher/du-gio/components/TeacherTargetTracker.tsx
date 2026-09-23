"use client"

import React, { useMemo } from "react"
import { GraduationCap, Eye, Star, CheckCircle2, AlertTriangle, Target, TrendingUp, Calendar, ArrowRight, Sparkles, Clock } from "lucide-react"
import { useCampusTheme, CampusTheme, resolveCampusTheme } from "@/hooks/useCampusTheme"

export interface MonthlyTeacherStatItem {
  monthKey: string
  monthStr: string
  year: number
  month: number
  taughtCount: number
  totalTaughtSlots: number
  observedCount: number
  totalObservedSlots: number
  pendingObservedCount: number
  avgScore: string | null
  receivedEvalCount: number
  surpriseTaughtCount?: number
  surpriseObservedCount?: number
}

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
  surpriseTaughtCount?: number
  totalSurpriseTaughtSlots?: number
  surpriseObservedCount?: number
  totalSurpriseObservedSlots?: number
  isPreschool?: boolean
  academicYearName?: string
  selectedMonth?: string
  onSelectMonth?: (m: string) => void
  availableMonths?: string[]
  monthlyStatsList?: MonthlyTeacherStatItem[]
  onViewReport?: () => void
  onGoToPendingEvals?: () => void
  campusCodeOrName?: string | null
  campusTheme?: CampusTheme
}

export function TeacherTargetTracker({
  taughtCount = 0,
  targetTaught = 0,
  observedCount = 0,
  targetObserved = 0,
  totalTaughtSlots = 0,
  totalObservedSlots = 0,
  pendingEvaluationCount = 0,
  avgScore = null,
  receivedEvaluationCount = 0,
  surpriseTaughtCount = 0,
  totalSurpriseTaughtSlots = 0,
  surpriseObservedCount = 0,
  totalSurpriseObservedSlots = 0,
  isPreschool = false,
  academicYearName = "",
  selectedMonth = "all",
  onSelectMonth,
  availableMonths = [],
  monthlyStatsList = [],
  onViewReport,
  onGoToPendingEvals,
  campusCodeOrName,
  campusTheme: propCampusTheme
}: TeacherTargetTrackerProps) {
  // Resolve campus theme (Hill, Global, Standard)
  const defaultTheme = useCampusTheme(campusCodeOrName)
  const theme = propCampusTheme || defaultTheme

  const isSpecificMonth = selectedMonth && selectedMonth !== "all"
  
  const currentMonthStat = useMemo(() => {
    if (!isSpecificMonth || !selectedMonth || !monthlyStatsList) return null
    return monthlyStatsList.find(m => m.monthKey === selectedMonth) || null
  }, [isSpecificMonth, selectedMonth, monthlyStatsList])

  // Safe targets
  const safeTargetTaught = (targetTaught && targetTaught > 0) ? targetTaught : (isPreschool ? 4 : 2)
  const safeTargetObserved = (targetObserved && targetObserved > 0) ? targetObserved : (isPreschool ? 8 : 10)
  const maxScore = isPreschool ? 10 : 20

  const displayTaughtCount = isSpecificMonth && currentMonthStat ? currentMonthStat.taughtCount : (taughtCount || 0)
  const displayTotalTaught = isSpecificMonth && currentMonthStat ? currentMonthStat.totalTaughtSlots : totalTaughtSlots
  const displayObservedCount = isSpecificMonth && currentMonthStat ? currentMonthStat.observedCount : (observedCount || 0)
  const displayTotalObserved = isSpecificMonth && currentMonthStat ? currentMonthStat.totalObservedSlots : totalObservedSlots
  const displaySurpriseTaught = isSpecificMonth && currentMonthStat ? (currentMonthStat.surpriseTaughtCount || 0) : surpriseTaughtCount
  const displaySurpriseObserved = isSpecificMonth && currentMonthStat ? (currentMonthStat.surpriseObservedCount || 0) : surpriseObservedCount

  const taughtPercent = Math.min(100, Math.round((displayTaughtCount / safeTargetTaught) * 100))
  const observedPercent = Math.min(100, Math.round((displayObservedCount / safeTargetObserved) * 100))

  const taughtRemaining = Math.max(0, safeTargetTaught - displayTaughtCount)
  const observedRemaining = Math.max(0, safeTargetObserved - displayObservedCount)

  const numAvgScore = (isSpecificMonth && currentMonthStat?.avgScore)
    ? Number(currentMonthStat.avgScore)
    : (avgScore ? Number(avgScore) : null)
  const scorePercent = numAvgScore ? Math.min(100, Math.round((numAvgScore / maxScore) * 100)) : 0

  const scoreRating = numAvgScore
    ? numAvgScore >= (isPreschool ? 9 : 17)
      ? "Xuất sắc"
      : numAvgScore >= (isPreschool ? 8 : 14)
      ? "Tốt"
      : numAvgScore >= (isPreschool ? 7 : 10)
      ? "Đạt"
      : "Chưa đạt"
    : "Chưa có"

  const isAllCompleted = taughtRemaining === 0 && observedRemaining === 0

  const selectedMonthDisplay = useMemo(() => {
    if (!isSpecificMonth || !selectedMonth || selectedMonth === "all") return null
    const parts = (selectedMonth || "").split("-")
    if (parts.length < 2) return selectedMonth
    const [y, m] = parts
    return `Tháng ${m}/${y}`
  }, [isSpecificMonth, selectedMonth])

  // Custom visual styles per campus
  const containerGradient = useMemo(() => {
    if (theme.type === "HILL") {
      return "bg-gradient-to-br from-[#003B3A] via-[#016863] to-[#6E5318]"
    }
    if (theme.type === "GLOBAL") {
      return "bg-gradient-to-br from-[#003B3A] via-[#015C57] to-[#4A245C]"
    }
    return "bg-gradient-to-br from-[#003231] via-[#005450] to-[#007D77]"
  }, [theme.type])

  const accentBadge = useMemo(() => {
    if (theme.type === "HILL") {
      return {
        bg: "bg-[#AE882E]/25",
        text: "text-amber-200",
        border: "border-[#AE882E]/40"
      }
    }
    if (theme.type === "GLOBAL") {
      return {
        bg: "bg-[#6E3D89]/30",
        text: "text-purple-200",
        border: "border-[#6E3D89]/40"
      }
    }
    return {
      bg: "bg-[#00A19A]/25",
      text: "text-teal-200",
      border: "border-[#00A19A]/40"
    }
  }, [theme.type])

  const activeMonthRing = useMemo(() => {
    if (theme.type === "HILL") return "border-[#AE882E] text-[#6E5318]"
    if (theme.type === "GLOBAL") return "border-[#6E3D89] text-[#4A245C]"
    return "border-[#00A19A] text-[#003B3A]"
  }, [theme.type])

  return (
    <div className={`${containerGradient} rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-white/15 relative overflow-hidden flex flex-col gap-5 transition-all duration-300 font-sans`}>
      {/* Dynamic Campus Ambient Glows */}
      {theme.type === "HILL" && (
        <>
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#AE882E]/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />
        </>
      )}
      {theme.type === "GLOBAL" && (
        <>
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#6E3D89]/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />
        </>
      )}
      {theme.type === "STANDARD" && (
        <>
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#00A19A]/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />
        </>
      )}

      {/* TOP HEADER & CONTROLS */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Branding & Status Pills */}
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Campus Identity Badge */}
            <span className={`px-2.5 py-1 rounded-full ${accentBadge.bg} ${accentBadge.text} border ${accentBadge.border} text-[11px] font-bold flex items-center gap-1.5 backdrop-blur-md`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              <span>{theme.name}</span>
            </span>

            {/* Academic Year Tag */}
            <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/90 border border-white/15 text-[11px] font-semibold flex items-center gap-1 backdrop-blur-md">
              <Target className="w-3 h-3 text-teal-300" />
              <span>Chỉ tiêu CM {academicYearName ? `• ${academicYearName}` : ""}</span>
            </span>

            {/* Selected Month Tag */}
            {isSpecificMonth && (
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 text-[11px] font-bold flex items-center gap-1 backdrop-blur-md">
                <Calendar className="w-3 h-3 text-cyan-300" />
                <span>{selectedMonthDisplay}</span>
              </span>
            )}

            {/* Overall Status Badge */}
            {isAllCompleted ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 text-[11px] font-bold flex items-center gap-1 backdrop-blur-md">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Đạt 100% chỉ tiêu</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/30 text-[11px] font-bold flex items-center gap-1 backdrop-blur-md">
                <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
                <span>Đang thực hiện</span>
              </span>
            )}

            {/* Surprise Slots Pill */}
            {(displaySurpriseTaught > 0 || displaySurpriseObserved > 0) && (
              <span className="px-2.5 py-1 rounded-full bg-rose-500/25 text-rose-200 border border-rose-400/30 text-[11px] font-bold flex items-center gap-1 backdrop-blur-md">
                <span>⚡</span>
                <span>{displaySurpriseTaught + displaySurpriseObserved} tiết đột xuất</span>
              </span>
            )}
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>Tiến độ Hoàn thành Chỉ tiêu Dự giờ Cá nhân</span>
            </h2>
            <p className="text-xs text-white/80 font-medium mt-0.5">
              {isSpecificMonth
                ? `Theo dõi số tiết trực tiếp giảng dạy và đi dự giờ đã hoàn thành đánh giá trong ${selectedMonthDisplay}.`
                : "Theo dõi số tiết trực tiếp giảng dạy (≥1 phiếu nhận xét), tiết đi dự giờ và điểm đánh giá trung bình."}
            </p>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {onSelectMonth && availableMonths.length > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-white/12 hover:bg-white/18 backdrop-blur-md rounded-xl border border-white/20 transition-all shadow-inner">
              <Calendar className="w-3.5 h-3.5 text-teal-300 shrink-0" />
              <span className="text-[11px] font-bold text-white/80">Kỳ xem:</span>
              <select
                value={selectedMonth || "all"}
                onChange={e => onSelectMonth(e.target.value)}
                className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer pr-1"
              >
                <option value="all" className="text-slate-900 bg-white font-semibold">
                  🌟 Toàn năm học ({academicYearName || "Tất cả"})
                </option>
                {availableMonths.map(m => {
                  if (!m || typeof m !== "string") return null
                  const parts = m.split("-")
                  const [y, mon] = parts.length >= 2 ? parts : ["", m]
                  return (
                    <option key={m} value={m} className="text-slate-900 bg-white font-semibold">
                      📅 {mon && y ? `Tháng ${mon}/${y}` : m}
                    </option>
                  )
                })}
              </select>
            </div>
          )}

          {onViewReport && (
            <button
              type="button"
              onClick={onViewReport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-xl text-xs font-bold transition-all border border-white/20 cursor-pointer shadow-sm"
            >
              <span>📊</span>
              <span>Báo cáo & Xuất Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* PENDING EVALUATION WARNING CALLOUT */}
      {pendingEvaluationCount > 0 && (
        <div className="relative z-10 p-3 bg-rose-500/20 border border-rose-400/40 rounded-2xl flex items-center justify-between gap-3 text-rose-100 text-xs backdrop-blur-md animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/30 flex items-center justify-center shrink-0 border border-rose-400/50">
              <AlertTriangle className="w-4 h-4 text-rose-300" />
            </div>
            <div>
              <p className="font-bold text-white">
                Thầy/Cô có {pendingEvaluationCount} tiết dự giờ chưa hoàn thành nộp phiếu nhận xét!
              </p>
              <p className="text-[11px] text-rose-200/90 font-medium">
                Vui lòng nộp phiếu đánh giá kịp thời để đảm bảo quyền lợi và tiến độ chỉ tiêu chuyên môn.
              </p>
            </div>
          </div>
          {onGoToPendingEvals && (
            <button
              type="button"
              onClick={onGoToPendingEvals}
              className="shrink-0 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <span>Nộp phiếu ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 3 HERO KPI METRIC CARDS */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {/* CARD 1: TIẾT GIẢNG DẠY */}
        <div className="bg-white/10 hover:bg-white/[0.14] backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 flex flex-col justify-between gap-3.5 shadow-sm transition-all">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30 shadow-inner">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                  {isPreschool ? "Tổ chức hoạt động" : "Tiết giảng dạy"}
                </span>
                <span className="block text-[11px] text-white/70 font-medium">
                  Trực tiếp đứng lớp
                </span>
              </div>
            </div>
            <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg border ${
              taughtRemaining === 0
                ? "bg-emerald-500/30 text-emerald-200 border-emerald-400/40"
                : "bg-white/15 text-amber-200 border-white/20"
            }`}>
              {taughtPercent}%
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white">{displayTaughtCount}</span>
                <span className="text-xs font-semibold text-white/70">/ {safeTargetTaught} tiết chỉ tiêu</span>
              </div>
              <span className={`text-xs font-bold ${taughtRemaining === 0 ? "text-emerald-300" : "text-amber-300"}`}>
                {taughtRemaining === 0 ? "✅ Đã đạt chỉ tiêu" : `Còn thiếu ${taughtRemaining} tiết`}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden mb-2 border border-white/10">
              <div
                className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400 shadow-xs"
                style={{ width: `${taughtPercent}%` }}
              />
            </div>

            {/* Detailed Sub-metrics */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-white/80 font-medium">
              <span className="flex items-center gap-1">
                <span>📋 Kế hoạch:</span>
                <strong className="text-white font-bold">{Math.max(0, displayTaughtCount - displaySurpriseTaught)}</strong>
              </span>
              <span className="flex items-center gap-1">
                <span>⚡ Đột xuất:</span>
                <strong className={`font-bold ${displaySurpriseTaught > 0 ? "text-amber-300" : "text-white"}`}>
                  {displaySurpriseTaught} tiết
                </strong>
              </span>
              <span className="text-white/60">
                {displayTaughtCount}/{displayTotalTaught} có phiếu
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: TIẾT ĐI DỰ GIỜ */}
        <div className="bg-white/10 hover:bg-white/[0.14] backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 flex flex-col justify-between gap-3.5 shadow-sm transition-all">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-400/20 text-cyan-300 flex items-center justify-center border border-cyan-400/30 shadow-inner">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                  {isPreschool ? "Dự giờ hoạt động" : "Tiết đi dự giờ"}
                </span>
                <span className="block text-[11px] text-white/70 font-medium">
                  Học hỏi đồng nghiệp
                </span>
              </div>
            </div>
            <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg border ${
              observedRemaining === 0
                ? "bg-emerald-500/30 text-emerald-200 border-emerald-400/40"
                : "bg-white/15 text-cyan-200 border-white/20"
            }`}>
              {observedPercent}%
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white">{displayObservedCount}</span>
                <span className="text-xs font-semibold text-white/70">/ {safeTargetObserved} tiết chỉ tiêu</span>
              </div>
              <span className={`text-xs font-bold ${observedRemaining === 0 ? "text-emerald-300" : "text-cyan-300"}`}>
                {observedRemaining === 0 ? "✅ Đã đạt chỉ tiêu" : `Còn thiếu ${observedRemaining} tiết`}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden mb-2 border border-white/10">
              <div
                className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 shadow-xs"
                style={{ width: `${observedPercent}%` }}
              />
            </div>

            {/* Detailed Sub-metrics */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-white/80 font-medium">
              <span className="flex items-center gap-1">
                <span>📋 Kế hoạch:</span>
                <strong className="text-white font-bold">{Math.max(0, displayObservedCount - displaySurpriseObserved)}</strong>
              </span>
              <span className="flex items-center gap-1">
                <span>⚡ Đột xuất:</span>
                <strong className={`font-bold ${displaySurpriseObserved > 0 ? "text-cyan-300" : "text-white"}`}>
                  {displaySurpriseObserved} tiết
                </strong>
              </span>
              <span className="text-emerald-300 font-semibold">
                {displayObservedCount}/{displayTotalObserved} nộp phiếu
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: ĐIỂM TB NHẬN ĐƯỢC */}
        <div className="bg-white/10 hover:bg-white/[0.14] backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 flex flex-col justify-between gap-3.5 shadow-sm transition-all">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30 shadow-inner">
                <Star className="w-5 h-5 fill-amber-300 text-amber-300" />
              </div>
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                  Điểm TB nhận được
                </span>
                <span className="block text-[11px] text-white/70 font-medium">
                  Đánh giá từ đồng nghiệp
                </span>
              </div>
            </div>
            <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-white/15 text-amber-200 border border-white/20">
              {receivedEvaluationCount} phiếu đánh giá
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white">
                  {numAvgScore ? numAvgScore.toFixed(1) : "—"}
                </span>
                <span className="text-xs font-semibold text-white/70">/ {maxScore}.0đ thang điểm</span>
              </div>
              <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1">
                {numAvgScore && <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                <span>{scoreRating}</span>
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden mb-2 border border-white/10">
              <div
                className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400 shadow-xs"
                style={{ width: `${scorePercent}%` }}
              />
            </div>

            {/* Detailed Sub-metrics */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-white/80 font-medium">
              <span>
                {isSpecificMonth ? `Trong tháng: ` : `Toàn năm: `}
                <strong className="text-white font-bold">{displayTaughtCount} tiết có phiếu</strong>
              </span>
              <span className="text-teal-200">
                Hiệu suất: <strong className="text-white font-bold">{scorePercent}%</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MONTHLY TIMELINE BREAKDOWN STRIP */}
      {monthlyStatsList && monthlyStatsList.length > 0 && (
        <div className="relative z-10 pt-3 border-t border-white/15 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-white/90">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-teal-300" />
              <span>Tiến độ từng tháng trong năm học:</span>
            </div>
            {isSpecificMonth && onSelectMonth && (
              <button
                type="button"
                onClick={() => onSelectMonth("all")}
                className="text-[11px] text-teal-200 hover:text-white underline cursor-pointer font-bold transition-colors flex items-center gap-1"
              >
                <span>🔄 Xem toàn bộ năm học</span>
              </button>
            )}
          </div>

          {/* Scrollable Month Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-white/20">
            {monthlyStatsList.map(st => {
              const isSelected = selectedMonth === st.monthKey
              return (
                <button
                  key={st.monthKey}
                  type="button"
                  onClick={() => onSelectMonth && onSelectMonth(isSelected ? "all" : st.monthKey)}
                  className={`shrink-0 px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer border ${
                    isSelected
                      ? `bg-white text-slate-900 shadow-lg font-black ${activeMonthRing} scale-102 ring-2 ring-white/60`
                      : "bg-white/10 hover:bg-white/18 text-white border-white/15"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className={`text-xs font-extrabold ${isSelected ? "text-slate-900" : "text-white"}`}>
                      {st.monthStr}
                    </span>
                    {st.avgScore && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        isSelected ? "bg-amber-100 text-amber-900" : "bg-white/20 text-amber-200"
                      }`}>
                        ⭐ {st.avgScore}đ
                      </span>
                    )}
                  </div>
                  <div className={`flex items-center gap-2 text-[11px] ${isSelected ? "text-slate-600 font-semibold" : "text-white/80 font-medium"}`}>
                    <span>
                      Dạy: <strong className={isSelected ? "text-teal-800" : "text-white font-bold"}>{st.taughtCount}</strong>
                      {((st.surpriseTaughtCount || 0) > 0) && (
                        <span className="text-[10px] text-rose-500 font-bold ml-0.5">
                          (⚡{st.surpriseTaughtCount})
                        </span>
                      )}
                    </span>
                    <span>•</span>
                    <span>
                      Dự: <strong className={isSelected ? "text-teal-800" : "text-white font-bold"}>{st.observedCount}</strong>
                      {((st.surpriseObservedCount || 0) > 0) && (
                        <span className="text-[10px] text-rose-500 font-bold ml-0.5">
                          (⚡{st.surpriseObservedCount})
                        </span>
                      )}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
