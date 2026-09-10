"use client"

import React from "react"
import { GraduationCap, Eye, Star, CheckCircle2, AlertTriangle, Target, TrendingUp, Calendar, ChevronDown } from "lucide-react"

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
  isPreschool?: boolean
  academicYearName?: string
  selectedMonth?: string
  onSelectMonth?: (m: string) => void
  availableMonths?: string[]
  monthlyStatsList?: MonthlyTeacherStatItem[]
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
  academicYearName = "",
  selectedMonth = "all",
  onSelectMonth,
  availableMonths = [],
  monthlyStatsList = []
}: TeacherTargetTrackerProps) {
  const isSpecificMonth = selectedMonth && selectedMonth !== "all"
  
  // Safe targets
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

  const selectedMonthDisplay = React.useMemo(() => {
    if (!isSpecificMonth) return null
    const [y, m] = selectedMonth.split("-")
    return `Tháng ${m}/${y}`
  }, [isSpecificMonth, selectedMonth])

  return (
    <div className="bg-gradient-to-br from-[#003B3A] via-[#004D4B] to-[#1E8B87] rounded-3xl p-4 sm:p-5 text-white shadow-xl border border-white/10 relative overflow-hidden flex flex-col gap-4">
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

            {/* Selected Month Tag */}
            {isSpecificMonth && (
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 text-[10px] font-black flex items-center gap-1">
                <Calendar className="w-3 h-3 text-cyan-300" />
                <span>{selectedMonthDisplay}</span>
              </span>
            )}

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

          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
              Tiến độ Hoàn thành Chỉ tiêu Dự giờ Cá nhân
            </h3>
          </div>

          <p className="text-[11px] text-teal-100/80 leading-relaxed font-medium">
            {isSpecificMonth
              ? `Theo dõi số tiết trực tiếp giảng dạy và đi dự giờ đã hoàn thành đánh giá trong ${selectedMonthDisplay}.`
              : "Theo dõi tiết trực tiếp giảng dạy (≥1 phiếu nhận xét), tiết đi dự giờ và điểm trung bình nhận được."}
          </p>

          {/* Month Selector Dropdown directly on Banner */}
          {onSelectMonth && availableMonths.length > 0 && (
            <div className="pt-1 flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/20 backdrop-blur-md rounded-xl border border-white/20 transition-all shadow-inner">
                <Calendar className="w-3.5 h-3.5 text-[#48BFE3]" />
                <span className="text-[10px] font-bold text-teal-200">Xem tháng:</span>
                <select
                  value={selectedMonth || "all"}
                  onChange={e => onSelectMonth(e.target.value)}
                  className="bg-transparent text-white text-xs font-black outline-none cursor-pointer pr-1"
                >
                  <option value="all" className="text-slate-900 bg-white font-bold">
                    🌟 Cả năm học ({academicYearName || "Toàn khóa"})
                  </option>
                  {availableMonths.map(m => {
                    const [y, mon] = m.split("-")
                    return (
                      <option key={m} value={m} className="text-slate-900 bg-white font-bold">
                        📅 Tháng {mon}/{y}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>
          )}

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
                <span>{isSpecificMonth ? `Mở trong tháng: ` : `Đã mở: `}<strong className="text-white font-bold">{totalTaughtSlots} tiết</strong></span>
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
                <span>{isSpecificMonth ? `Dự trong tháng: ` : `Đã dự: `}<strong className="text-white font-bold">{totalObservedSlots} tiết</strong></span>
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
                <span>{isSpecificMonth ? `Trong tháng: ` : `Từ: `}<strong className="text-white font-bold">{taughtCount} tiết có phiếu</strong></span>
                <span>{scorePercent}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Timeline Breakdown Strip */}
      {monthlyStatsList && monthlyStatsList.length > 0 && (
        <div className="relative z-10 pt-3 border-t border-white/10 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-black text-teal-200 uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#48BFE3]" />
              <span>Tiến độ từng tháng trong năm học:</span>
            </div>
            {isSpecificMonth && onSelectMonth && (
              <button
                type="button"
                onClick={() => onSelectMonth("all")}
                className="text-[10px] text-white hover:text-amber-200 underline cursor-pointer font-bold transition-colors"
              >
                🔄 Xem tổng hợp cả năm
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {monthlyStatsList.map(st => {
              const isSelected = selectedMonth === st.monthKey
              return (
                <button
                  key={st.monthKey}
                  type="button"
                  onClick={() => onSelectMonth && onSelectMonth(isSelected ? "all" : st.monthKey)}
                  className={`shrink-0 px-3 py-2 rounded-xl text-left transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-white text-slate-900 shadow-md font-black border-amber-300 scale-102 ring-2 ring-white/50"
                      : "bg-white/10 hover:bg-white/20 text-white border-white/15"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className={`text-[11px] font-black ${isSelected ? "text-[#003B3A]" : "text-white"}`}>
                      {st.monthStr}
                    </span>
                    {st.avgScore && (
                      <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                        isSelected ? "bg-amber-100 text-amber-900" : "bg-white/20 text-amber-300"
                      }`}>
                        ⭐ {st.avgScore}đ
                      </span>
                    )}
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] ${isSelected ? "text-slate-600 font-bold" : "text-teal-200/90 font-medium"}`}>
                    <span>Dạy: <strong className={isSelected ? "text-teal-800" : "text-white"}>{st.taughtCount} tiết</strong></span>
                    <span>•</span>
                    <span>Dự: <strong className={isSelected ? "text-teal-800" : "text-white"}>{st.observedCount} tiết</strong></span>
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
