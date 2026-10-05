"use client"
// @ts-nocheck

import React, { useMemo } from "react"
import { 
  GraduationCap, Eye, Star, CheckCircle2, AlertTriangle, Target, 
  TrendingUp, Calendar, ArrowRight, Sparkles, ChevronRight, BarChart3, Clock, Check
} from "lucide-react"
import { useCampusTheme, CampusTheme } from "@/hooks/useCampusTheme"

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
  observerType?: string | null
  targetConfirmed?: boolean
  isRegularTeacher?: boolean
  onOpenConfirmModal?: () => void
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
  campusTheme: propCampusTheme,
  observerType,
  targetConfirmed = false,
  isRegularTeacher = false,
  onOpenConfirmModal
}: TeacherTargetTrackerProps) {
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

  // Overall completion score (average of taught % and observed %)
  const overallProgress = Math.round((taughtPercent + observedPercent) / 2)

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200/90 relative overflow-hidden flex flex-col gap-4 font-sans transition-all duration-200">
      
      {/* TOP HEADER: Clean Title, Tags, Period Selector & Action */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-4 border-b border-slate-100">
        
        {/* Left: Title + Brand Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200/80 flex items-center justify-center shrink-0 shadow-2xs">
            <Target className="w-5 h-5 text-teal-600" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-800">
                Tiến độ Hoàn thành Chỉ tiêu Cá nhân
              </h2>

              {/* Status Badge */}
              {isAllCompleted ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-black flex items-center gap-1 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Đạt 100% chỉ tiêu</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-amber-500" />
                  <span>Tiến độ: {overallProgress}%</span>
                </span>
              )}

              {/* Academic Year */}
              {academicYearName && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200">
                  NH {academicYearName}
                </span>
              )}

              {/* Teacher Experience Category Pill */}
              {observerType && (
                <button
                  type="button"
                  onClick={onOpenConfirmModal}
                  className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold border border-slate-200 flex items-center gap-1 cursor-pointer transition-all"
                  title="Bấm để xem lại hoặc điều chỉnh đối tượng GV"
                >
                  <span>{observerType === "Giáo viên mới" ? "🌱 GV mới (< 2 năm)" : "⭐ GV cũ (≥ 2 năm)"}</span>
                  {onOpenConfirmModal && <span className="text-[10px] text-teal-700 underline font-normal ml-0.5">Thay đổi</span>}
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500 font-medium">
              {isSpecificMonth
                ? `Số liệu thống kê chi tiết trong ${selectedMonthDisplay}.`
                : "Theo dõi số tiết trực tiếp giảng dạy, tiết đi dự giờ và điểm đánh giá trung bình cả năm."}
            </p>
          </div>
        </div>

        {/* Right: Quick Period Selector & Report Button */}
        <div className="flex items-center gap-2 flex-wrap">
          {onSelectMonth && availableMonths.length > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 transition-all">
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-[11px] text-slate-400 font-medium">Kỳ:</span>
              <select
                value={selectedMonth || "all"}
                onChange={e => onSelectMonth(e.target.value)}
                className="bg-transparent text-slate-800 text-xs font-bold outline-none cursor-pointer pr-1"
              >
                <option value="all" className="font-semibold text-slate-800">
                  🌟 Toàn năm học ({academicYearName || "Tất cả"})
                </option>
                {availableMonths.map(m => {
                  if (!m || typeof m !== "string") return null
                  const parts = m.split("-")
                  const [y, mon] = parts.length >= 2 ? parts : ["", m]
                  return (
                    <option key={m} value={m} className="font-semibold text-slate-800">
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-teal-700 rounded-xl text-xs font-bold transition-all border border-slate-200 shadow-2xs cursor-pointer active:scale-95"
            >
              <BarChart3 className="w-3.5 h-3.5 text-teal-600" />
              <span>Báo cáo & Xuất Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* TEACHER EXPERIENCE UNCONFIRMED WARNING CALLOUT */}
      {!targetConfirmed && isRegularTeacher && (
        <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="font-black text-xs text-amber-900">
                Thầy/Cô chưa xác nhận đối tượng Giáo viên (Mới / Cũ 2 năm)!
              </p>
              <p className="text-[11px] text-amber-700 font-medium">
                Vui lòng xác nhận thâm niên để hệ thống áp dụng đúng định mức chỉ tiêu dự giờ ({academicYearName || "năm học này"}).
              </p>
            </div>
          </div>
          {onOpenConfirmModal && (
            <button
              type="button"
              onClick={onOpenConfirmModal}
              className="shrink-0 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <span>Xác nhận ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* PENDING EVALUATION WARNING (Modern Gentle Banner) */}
      {pendingEvaluationCount > 0 && (
        <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="font-black text-xs text-amber-900">
                Thầy/Cô có <span className="underline decoration-amber-600 underline-offset-2">{pendingEvaluationCount} tiết dự giờ</span> chưa hoàn thành nộp phiếu nhận xét!
              </p>
              <p className="text-[11px] text-amber-700 font-medium">
                Vui lòng hoàn thành phiếu đánh giá kịp thời để đảm bảo tiến độ chỉ tiêu chuyên môn.
              </p>
            </div>
          </div>
          {onGoToPendingEvals && (
            <button
              type="button"
              onClick={onGoToPendingEvals}
              className="shrink-0 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <span>Nộp phiếu ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 3 HERO KPI METRIC CARDS (Bento Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        
        {/* CARD 1: TIẾT GIẢNG DẠY */}
        <div className="bg-gradient-to-b from-emerald-50/40 via-white to-white rounded-2xl p-4 sm:p-5 border border-emerald-100/90 flex flex-col justify-between gap-3 shadow-2xs hover:border-emerald-200 transition-all">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <GraduationCap className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    {isPreschool ? "Tổ chức hoạt động" : "Tiết Giảng Dạy"}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Trực tiếp đứng lớp
                  </span>
                </div>
              </div>

              <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg border ${
                taughtRemaining === 0
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              }`}>
                {taughtPercent}%
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{displayTaughtCount}</span>
                <span className="text-xs font-semibold text-slate-400">/ {safeTargetTaught} tiết chỉ tiêu</span>
              </div>
              <span className={`text-xs font-extrabold ${taughtRemaining === 0 ? "text-emerald-700" : "text-amber-600"}`}>
                {taughtRemaining === 0 ? "✓ Đạt chỉ tiêu" : `Còn thiếu ${taughtRemaining} tiết`}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2.5 border border-slate-200/60">
              <div
                className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-emerald-500 to-teal-500 shadow-2xs"
                style={{ width: `${taughtPercent}%` }}
              />
            </div>
          </div>

          {/* Sub-info bottom line */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <span>Kế hoạch:</span>
              <strong className="text-slate-800 font-bold">{Math.max(0, displayTaughtCount - displaySurpriseTaught)}</strong>
            </span>
            {displaySurpriseTaught > 0 && (
              <span className="text-amber-700 font-bold flex items-center gap-0.5">
                <span>⚡ {displaySurpriseTaught} đột xuất</span>
              </span>
            )}
            <span className="text-slate-400">
              {displayTaughtCount}/{displayTotalTaught} có phiếu
            </span>
          </div>
        </div>

        {/* CARD 2: TIẾT ĐI DỰ GIỜ */}
        <div className="bg-gradient-to-b from-sky-50/40 via-white to-white rounded-2xl p-4 sm:p-5 border border-sky-100/90 flex flex-col justify-between gap-3 shadow-2xs hover:border-sky-200 transition-all">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <Eye className="w-4 h-4 text-sky-700" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    {isPreschool ? "Dự giờ hoạt động" : "Tiết Đi Dự Giờ"}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Học hỏi đồng nghiệp
                  </span>
                </div>
              </div>

              <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg border ${
                observedRemaining === 0
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-sky-100 text-sky-800 border-sky-200"
              }`}>
                {observedPercent}%
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{displayObservedCount}</span>
                <span className="text-xs font-semibold text-slate-400">/ {safeTargetObserved} tiết chỉ tiêu</span>
              </div>
              <span className={`text-xs font-extrabold ${observedRemaining === 0 ? "text-emerald-700" : "text-sky-700"}`}>
                {observedRemaining === 0 ? "✓ Đạt chỉ tiêu" : `Còn thiếu ${observedRemaining} tiết`}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2.5 border border-slate-200/60">
              <div
                className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-sky-500 to-blue-500 shadow-2xs"
                style={{ width: `${observedPercent}%` }}
              />
            </div>
          </div>

          {/* Sub-info bottom line */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <span>Kế hoạch:</span>
              <strong className="text-slate-800 font-bold">{Math.max(0, displayObservedCount - displaySurpriseObserved)}</strong>
            </span>
            {displaySurpriseObserved > 0 && (
              <span className="text-sky-700 font-bold flex items-center gap-0.5">
                <span>⚡ {displaySurpriseObserved} đột xuất</span>
              </span>
            )}
            <span className="text-teal-700 font-bold">
              {displayObservedCount}/{displayTotalObserved} nộp phiếu
            </span>
          </div>
        </div>

        {/* CARD 3: ĐIỂM TB NHẬN ĐƯỢC */}
        <div className="bg-gradient-to-b from-amber-50/40 via-white to-white rounded-2xl p-4 sm:p-5 border border-amber-100/90 flex flex-col justify-between gap-3 shadow-2xs hover:border-amber-200 transition-all">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Điểm Đánh Giá TB
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Đánh giá từ đồng nghiệp
                  </span>
                </div>
              </div>

              <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-100/80 text-amber-800 border border-amber-200">
                {receivedEvaluationCount} phiếu đánh giá
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {numAvgScore ? numAvgScore.toFixed(1) : "—"}
                </span>
                <span className="text-xs font-semibold text-slate-400">/ {maxScore}.0đ thang điểm</span>
              </div>
              <span className={`text-xs font-extrabold flex items-center gap-1 ${
                numAvgScore ? "text-amber-700" : "text-slate-400"
              }`}>
                {numAvgScore && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                <span>{scoreRating}</span>
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2.5 border border-slate-200/60">
              <div
                className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-amber-400 to-orange-400 shadow-2xs"
                style={{ width: `${scorePercent}%` }}
              />
            </div>
          </div>

          {/* Sub-info bottom line */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>
              {isSpecificMonth ? `Trong tháng: ` : `Toàn năm: `}
              <strong className="text-slate-800 font-bold">{displayTaughtCount} tiết có phiếu</strong>
            </span>
            <span className="text-slate-500 font-medium">
              Hiệu suất: <strong className="text-slate-800 font-bold">{scorePercent}%</strong>
            </span>
          </div>
        </div>

      </div>

      {/* MONTHLY MINI-TIMELINE CHIPS (Compact & Scannable) */}
      {monthlyStatsList && monthlyStatsList.length > 0 && (
        <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>Tiến độ từng tháng trong năm học:</span>
            </div>
            {isSpecificMonth && onSelectMonth && (
              <button
                type="button"
                onClick={() => onSelectMonth("all")}
                className="text-[11px] text-teal-700 hover:text-teal-900 underline font-bold cursor-pointer"
              >
                🔄 Xem toàn bộ năm học
              </button>
            )}
          </div>

          {/* Scrollable Month Mini Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200">
            {monthlyStatsList.map(st => {
              const isSelected = selectedMonth === st.monthKey
              return (
                <button
                  key={st.monthKey}
                  type="button"
                  onClick={() => onSelectMonth && onSelectMonth(isSelected ? "all" : st.monthKey)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-left transition-all duration-150 cursor-pointer border ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs scale-102"
                      : "bg-slate-50 hover:bg-slate-100/90 text-slate-700 border-slate-200/80"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold">
                      {st.monthStr}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md ${
                      isSelected ? "bg-white/20 text-white" : "bg-white text-slate-600 border border-slate-200"
                    }`}>
                      Dạy: {st.taughtCount} • Dự: {st.observedCount}
                    </span>
                    {st.avgScore && (
                      <span className={`text-[10px] font-black ${isSelected ? "text-amber-300" : "text-amber-600"}`}>
                        ⭐{st.avgScore}đ
                      </span>
                    )}
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
