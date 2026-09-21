"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Award,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  MessageSquare,
  ShieldCheck,
  Zap,
  Target,
  RefreshCw,
  Flame
} from "lucide-react"

interface ComparisonItem {
  subjectId: string
  subjectName: string
  subjectCode: string
  targetScore: number | null
  targetSource: string
  actualScore: number | null
  componentScores: unknown[]
  benchmarkScore: number
  delta: number | null
  status: "SURPASSED" | "ACHIEVED" | "NEED_EFFORT" | "ALERT" | "NO_DATA"
  statusLabel: string
  statusBadge: string
  teacherRemark: string | null
}

interface HistoryItem {
  periodCode: string
  periodLabel: string
  checkpoint: string
  hasData: boolean
  subjectsCount: number
  averageScore: number | null
  targetGpa: number | null
}

interface AcademicComparisonData {
  student: {
    id: string
    studentCode: string
    studentName: string
    className: string
    grade: string
  }
  period: {
    currentPeriod: string
    periodLabel: string
    checkpoint: string
    checkpointLabel: string
  }
  summary: {
    averageActual: number | null
    averageTarget: number | null
    overallDelta: number | null
    totalSubjects: number
    evaluatedSubjects: number
    achievedCount: number
    surpassedCount: number
    needEffortCount: number
    alertCount: number
    achievedRate: number
    suggestedAdvisoryStatus: "DAT" | "TIEN_TRIEN" | "CHUA_DAT"
    advisoryNotes: string
  }
  comparisons: ComparisonItem[]
  historyTimeline: HistoryItem[]
  studentAcademicGoal: {
    goalsCount: number
    primaryGoalText: string
    studentCommitment: string
    teacherSupportRequest: string
    parentSupportRequest: string
  }
}

interface Props {
  studentId: string
  studentCode?: string
  academicYearId?: string
  defaultPeriod?: string
  isTeacherView?: boolean
  onSelectForConsultation?: (subjectName: string, delta: number | null, actualScore: number | null, targetScore: number | null) => void
  onApplySuggestedStatus?: (status: "DAT" | "TIEN_TRIEN" | "CHUA_DAT", notes: string) => void
}

const PERIOD_TABS = [
  { code: "KSĐN", label: "Khảo sát đầu năm", short: "KSĐN", checkpoint: "DAU_NAM" },
  { code: "GK1", label: "Giữa học kỳ 1", short: "GK1", checkpoint: "GIUA_KY_1" },
  { code: "CK1", label: "Cuối học kỳ 1", short: "CK1", checkpoint: "CUOI_KY_1" },
  { code: "GK2", label: "Giữa học kỳ 2", short: "GK2", checkpoint: "GIUA_KY_2" },
  { code: "CK2", label: "Cuối năm học", short: "CK2", checkpoint: "CUOI_NAM" }
]

export function AcademicComparisonWidget({
  studentId,
  studentCode,
  academicYearId,
  defaultPeriod = "GK1",
  isTeacherView = false,
  onSelectForConsultation,
  onApplySuggestedStatus
}: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>(defaultPeriod)
  const [loading, setLoading] = useState<boolean>(true)
  const [data, setData] = useState<AcademicComparisonData | null>(null)
  const [error, setError] = useState<string>("")
  const [filterMode, setFilterMode] = useState<"ALL" | "NOT_ACHIEVED" | "ACHIEVED">("ALL")

  useEffect(() => {
    if (defaultPeriod) {
      // Chuẩn hóa tên period
      let norm = defaultPeriod.toUpperCase()
      if (norm === "GIUA_KY_1" || norm === "GK1") norm = "GK1"
      else if (norm === "CUOI_KY_1" || norm === "CK1") norm = "CK1"
      else if (norm === "GIUA_KY_2" || norm === "GK2") norm = "GK2"
      else if (norm === "CUOI_NAM" || norm === "CUOI_KY_2" || norm === "CK2") norm = "CK2"
      else if (norm === "DAU_NAM" || norm === "KSDN" || norm === "KSĐN") norm = "KSĐN"
      setSelectedPeriod(norm)
    }
  }, [defaultPeriod])

  const fetchComparison = useCallback(async (period: string) => {
    if (!studentId && !studentCode) return
    try {
      setLoading(true)
      setError("")
      const params = new URLSearchParams()
      if (studentId) params.set("studentId", studentId)
      if (studentCode) params.set("studentCode", studentCode)
      if (academicYearId) params.set("academicYearId", academicYearId)
      params.set("evaluationPeriod", period)
      params.set("_t", Date.now().toString())

      const res = await fetch(`/api/advisory/academic-comparison?${params.toString()}`, { cache: "no-store" })
      const json = await res.json()
      if (res.ok && !json.error) {
        setData(json)
      } else {
        setError(json.error || "Không thể tải dữ liệu đối sánh")
      }
    } catch (e: unknown) {
      console.error(e)
      setError("Lỗi kết nối khi tải dữ liệu đối sánh")
    } finally {
      setLoading(false)
    }
  }, [studentId, studentCode, academicYearId])

  useEffect(() => {
    fetchComparison(selectedPeriod)
  }, [fetchComparison, selectedPeriod])

  const filteredComparisons = (data?.comparisons || []).filter(item => {
    if (filterMode === "NOT_ACHIEVED") {
      return item.status === "ALERT" || item.status === "NEED_EFFORT"
    }
    if (filterMode === "ACHIEVED") {
      return item.status === "ACHIEVED" || item.status === "SURPASSED"
    }
    return true
  })

  return (
    <div className="bg-white rounded-3xl border-2 border-teal-100/80 shadow-md overflow-hidden space-y-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#005B58] to-[#0A7B76] p-5 sm:p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-400/20 flex items-center justify-center border border-teal-300/30">
                <Target className="w-4.5 h-4.5 text-teal-200" />
              </div>
              <h3 className="font-black text-base sm:text-lg tracking-tight uppercase">
                Đối Sánh Điểm Kiểm Tra Định Kỳ & Mục Tiêu Học Tập
              </h3>
            </div>
            <p className="text-xs text-teal-100/90 font-medium">
              So khớp trực tiếp kết quả thi từ Sổ điểm GVBM với Kế hoạch phát triển cá nhân của học sinh
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchComparison(selectedPeriod)}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-teal-100 text-xs font-bold border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Cập nhật</span>
          </button>
        </div>

        {/* Period Selector Pills */}
        <div className="flex items-center gap-2 mt-5 overflow-x-auto pb-1 scrollbar-none">
          {PERIOD_TABS.map(tab => {
            const isSelected = selectedPeriod === tab.code
            const histItem = data?.historyTimeline?.find(h => h.periodCode === tab.code)
            const hasData = histItem?.hasData

            return (
              <button
                key={tab.code}
                type="button"
                onClick={() => setSelectedPeriod(tab.code)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-amber-400 text-slate-950 shadow-lg scale-105"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
                }`}
              >
                <span>{tab.label}</span>
                {hasData ? (
                  <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-slate-950" : "bg-emerald-400"}`} title="Đã có điểm" />
                ) : (
                  <span className="text-[10px] opacity-60 font-normal">(chờ điểm)</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-teal-600" />
          <p className="text-xs font-bold">Đang đối sánh dữ liệu từ Sổ điểm bộ môn và Phiếu mục tiêu...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-rose-500 bg-rose-50/50 rounded-2xl m-5 border border-rose-200 space-y-2">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
          <p className="text-xs font-black uppercase tracking-wider">{error}</p>
        </div>
      ) : (
        <div className="p-5 sm:p-6 space-y-6 pt-0">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Tỷ lệ đạt */}
            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-2">
              <span className="text-[11px] font-black uppercase text-teal-800 tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Tỷ lệ đạt mục tiêu</span>
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-teal-950">
                  {data?.summary.achievedRate}%
                </span>
                <span className="text-xs font-bold text-teal-700">
                  ({data?.summary.achievedCount}/{data?.summary.evaluatedSubjects} môn)
                </span>
              </div>
              <div className="w-full h-2 bg-teal-200/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, data?.summary.achievedRate || 0)}%` }}
                />
              </div>
            </div>

            {/* Card 2: ĐTB Thực tế vs Mục tiêu */}
            <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-2">
              <span className="text-[11px] font-black uppercase text-sky-800 tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-sky-600" />
                <span>ĐTB Thực tế vs Mục tiêu</span>
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-sky-950">
                  {data?.summary.averageActual != null ? data.summary.averageActual : "--"}
                </span>
                <span className="text-xs font-bold text-sky-700">
                  / Mục tiêu: {data?.summary.averageTarget || 8.0}
                </span>
              </div>
              <div className="text-xs font-bold flex items-center gap-1">
                {data?.summary.overallDelta != null ? (
                  data.summary.overallDelta >= 0 ? (
                    <span className="text-emerald-700 flex items-center gap-0.5 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                      <TrendingUp className="w-3.5 h-3.5" /> +{data.summary.overallDelta} so với kỳ vọng
                    </span>
                  ) : (
                    <span className="text-rose-700 flex items-center gap-0.5 bg-rose-100/70 px-2 py-0.5 rounded-md">
                      <TrendingDown className="w-3.5 h-3.5" /> {data.summary.overallDelta} so với kỳ vọng
                    </span>
                  )
                ) : (
                  <span className="text-slate-400">Chờ dữ liệu đầy đủ</span>
                )}
              </div>
            </div>

            {/* Card 3: Môn Vượt & Đạt */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
              <span className="text-[11px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Môn Bứt Phá & Đạt</span>
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-950">
                {data?.summary.surpassedCount} <span className="text-xs font-bold text-emerald-700">vượt</span> / {data?.summary.achievedCount} <span className="text-xs font-bold text-emerald-700">đạt</span>
              </div>
              <p className="text-[11px] text-emerald-800 font-medium">
                Vượt kỳ vọng &ge; +0.5 điểm
              </p>
            </div>

            {/* Card 4: Môn Cần nỗ lực & Báo động */}
            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-1.5">
              <span className="text-[11px] font-black uppercase text-rose-800 tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Môn Cần Lưu Tâm</span>
              </span>
              <div className="text-2xl sm:text-3xl font-black text-rose-950">
                {data?.summary.alertCount} <span className="text-xs font-bold text-rose-700">báo động</span> / {data?.summary.needEffortCount} <span className="text-xs font-bold text-rose-700">cần cố gắng</span>
              </div>
              <p className="text-[11px] text-rose-800 font-medium">
                Thấp hơn mục tiêu hoặc chuẩn
              </p>
            </div>
          </div>

          {/* Lời khuyên Cố vấn & Tự động Đánh giá */}
          {data?.summary.advisoryNotes && (
            <div className="p-4 rounded-2xl bg-amber-50/80 border-2 border-amber-200/90 flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-[280px]">
                <div className="w-8 h-8 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 font-bold mt-0.5">
                  <Flame className="w-4.5 h-4.5 text-amber-700" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-amber-950">
                      Nhận Định & Lời Khuyên Cố Vấn Tự Động ({data.period.periodLabel}):
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                      data.summary.suggestedAdvisoryStatus === "DAT"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : data.summary.suggestedAdvisoryStatus === "TIEN_TRIEN"
                        ? "bg-amber-100 text-amber-900 border-amber-300"
                        : "bg-rose-100 text-rose-800 border-rose-300"
                    }`}>
                      Gợi ý: {data.summary.suggestedAdvisoryStatus === "DAT" ? "ĐẠT" : data.summary.suggestedAdvisoryStatus === "TIEN_TRIEN" ? "TIẾN TRIỂN" : "CHƯA ĐẠT"}
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 font-medium leading-relaxed">
                    {data.summary.advisoryNotes}
                  </p>
                </div>
              </div>

              {/* Nút hành động cho GVCN */}
              {isTeacherView && onApplySuggestedStatus && (
                <button
                  type="button"
                  onClick={() => onApplySuggestedStatus(data.summary.suggestedAdvisoryStatus, data.summary.advisoryNotes)}
                  className="px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                  <span>Áp dụng nhanh đánh giá cho mốc này</span>
                </button>
              )}
            </div>
          )}

          {/* Sub-header Filter & Matrix Table */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  Chi Tiết Từng Môn Học ({filteredComparisons.length} môn):
                </span>
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                  (Dữ liệu điểm tổng kết từ sổ điểm GVBM)
                </span>
              </div>

              {/* Bộ lọc trạng thái */}
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFilterMode("ALL")}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    filterMode === "ALL" ? "bg-white text-slate-900 shadow-2xs font-black" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tất cả ({data?.comparisons.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("NOT_ACHIEVED")}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    filterMode === "NOT_ACHIEVED" ? "bg-white text-rose-700 shadow-2xs font-black" : "text-slate-600 hover:text-rose-600"
                  }`}
                >
                  Chưa đạt ({((data?.summary.alertCount || 0) + (data?.summary.needEffortCount || 0))})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("ACHIEVED")}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    filterMode === "ACHIEVED" ? "bg-white text-emerald-700 shadow-2xs font-black" : "text-slate-600 hover:text-emerald-600"
                  }`}
                >
                  Đạt/Vượt ({data?.summary.achievedCount || 0})
                </button>
              </div>
            </div>

            {/* Bảng ma trận đối sánh */}
            {filteredComparisons.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">
                Không có môn học nào thuộc nhóm lọc này.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/90 text-slate-700 uppercase font-black tracking-wider text-[11px]">
                    <tr>
                      <th className="p-3.5 pl-4">Môn Học</th>
                      <th className="p-3.5 text-center">Điểm Mục Tiêu</th>
                      <th className="p-3.5 text-center">Điểm Kiểm Tra</th>
                      <th className="p-3.5 text-center">Độ Lệch (Δ)</th>
                      <th className="p-3.5 text-center">Trạng Thái</th>
                      <th className="p-3.5">Nhận Xét Của Thầy/Cô Bộ Môn</th>
                      {isTeacherView && <th className="p-3.5 pr-4 text-center">Hành Động Cố Vấn</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredComparisons.map((row) => {
                      const isAlert = row.status === "ALERT"
                      const isNeedEffort = row.status === "NEED_EFFORT"

                      return (
                        <tr
                          key={row.subjectId}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isAlert ? "bg-rose-50/30" : isNeedEffort ? "bg-amber-50/20" : ""
                          }`}
                        >
                          {/* Tên môn */}
                          <td className="p-3.5 pl-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-teal-600 shrink-0" />
                              <div>
                                <span className="text-slate-900 text-xs font-black">{row.subjectName}</span>
                                {row.benchmarkScore && (
                                  <span className="text-[10px] text-slate-400 font-medium block">
                                    Chuẩn trường: {row.benchmarkScore}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Điểm mục tiêu */}
                          <td className="p-3.5 text-center font-bold text-slate-700">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs">
                              {row.targetScore != null ? row.targetScore : "--"}
                            </span>
                            <span className="block text-[9px] text-slate-400 font-normal mt-0.5">
                              {row.targetSource}
                            </span>
                          </td>

                          {/* Điểm kiểm tra thực tế */}
                          <td className="p-3.5 text-center font-black">
                            {row.actualScore != null ? (
                              <span className={`text-sm px-2.5 py-1 rounded-lg font-black border ${
                                row.actualScore >= 8.0
                                  ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                                  : row.actualScore >= 6.5
                                  ? "bg-sky-50 text-sky-900 border-sky-200"
                                  : row.actualScore >= 5.0
                                  ? "bg-amber-50 text-amber-900 border-amber-200"
                                  : "bg-rose-50 text-rose-900 border-rose-200"
                              }`}>
                                {row.actualScore}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-normal italic">Chờ điểm</span>
                            )}
                          </td>

                          {/* Độ lệch Delta */}
                          <td className="p-3.5 text-center font-black">
                            {row.delta != null ? (
                              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs ${
                                row.delta >= 0.5
                                  ? "text-emerald-700 bg-emerald-100"
                                  : row.delta >= 0
                                  ? "text-teal-700 bg-teal-100"
                                  : row.delta >= -0.9
                                  ? "text-amber-800 bg-amber-100"
                                  : "text-rose-700 bg-rose-100 font-black"
                              }`}>
                                {row.delta > 0 ? `+${row.delta}` : row.delta}
                              </span>
                            ) : (
                              <span className="text-slate-300">--</span>
                            )}
                          </td>

                          {/* Huy hiệu trạng thái */}
                          <td className="p-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${row.statusBadge}`}>
                              {row.statusLabel}
                            </span>
                          </td>

                          {/* Nhận xét của GVBM */}
                          <td className="p-3.5 text-slate-700 font-medium">
                            {row.teacherRemark ? (
                              <div className="flex items-start gap-1.5 max-w-xs">
                                <MessageSquare className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                                <span className="text-[11px] italic leading-tight text-slate-800">
                                  &ldquo;{row.teacherRemark}&rdquo;
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Chưa có nhận xét môn</span>
                            )}
                          </td>

                          {/* Hành động Cố vấn dành cho GVCN */}
                          {isTeacherView && (
                            <td className="p-3.5 pr-4 text-center">
                              {(isAlert || isNeedEffort) && onSelectForConsultation ? (
                                <button
                                  type="button"
                                  onClick={() => onSelectForConsultation(row.subjectName, row.delta, row.actualScore, row.targetScore)}
                                  className="px-2.5 py-1 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-bold border border-rose-300 transition-all flex items-center gap-1 mx-auto cursor-pointer"
                                  title="Mở phiên tư vấn 1-1 cho môn này"
                                >
                                  <Zap className="w-3 h-3 text-rose-600" />
                                  <span>Tư vấn môn</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400">Ổn định</span>
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* History Timeline Trend (Xu hướng qua các kỳ) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              <span>Diễn Biến Tiến Trình Qua Các Đợt Kiểm Tra Năm Học:</span>
            </span>

            <div className="grid grid-cols-5 gap-2 text-center">
              {data?.historyTimeline.map((item) => {
                const isCur = item.periodCode === selectedPeriod

                return (
                  <div
                    key={item.periodCode}
                    onClick={() => setSelectedPeriod(item.periodCode)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isCur
                        ? "bg-teal-900 text-white border-teal-950 shadow-sm"
                        : "bg-white text-slate-700 border-slate-200 hover:border-teal-400"
                    }`}
                  >
                    <span className="block text-[11px] font-black uppercase truncate">
                      {item.periodCode}
                    </span>
                    <span className="block text-sm font-black my-0.5">
                      {item.averageScore != null ? item.averageScore : "--"}
                    </span>
                    <span className={`block text-[9px] font-medium ${isCur ? "text-teal-200" : "text-slate-400"}`}>
                      {item.hasData ? `${item.subjectsCount} môn` : "Chờ điểm"}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
