"use client"

import { useMemo, useState } from "react"
import { 
  TrendingUp, BarChart2, CheckCircle2, AlertCircle, Award, 
  ChevronDown, ChevronUp, Sparkles, Filter, Users, Calendar
} from "lucide-react"
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell 
} from "recharts"

interface TeacherImprovementAnalyticsProps {
  targets: any[]
  configs: any[]
  homeroomClasses?: any[]
}

const MONTH_ORDER = [
  "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5"
]

export function TeacherImprovementAnalytics({
  targets,
  configs,
  homeroomClasses = []
}: TeacherImprovementAnalyticsProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [selectedSupportType, setSelectedSupportType] = useState<"ALL" | "ACADEMIC" | "PSYCHOLOGICAL">("ALL")
  const [chartMetricMode, setChartMetricMode] = useState<"count" | "percentage">("count")
  const [activeTabChart, setActiveTabChart] = useState<"stackedBar" | "trendLine" | "matrix">("stackedBar")

  // Filter targets based on support type
  const filteredTargets = useMemo(() => {
    return targets.filter(t => {
      if (selectedSupportType === "ALL") return true
      return t.supportType === selectedSupportType
    })
  }, [targets, selectedSupportType])

  // Extract all unique months from evaluations or defaults
  const monthlyData = useMemo(() => {
    const monthStatsMap: Record<string, {
      month: string
      totalEvals: number
      excellent: number  // Tiến bộ vượt bậc / Hoàn thành
      good: number       // Có tiến bộ / Đạt
      developing: number // Đang theo dõi / Duy trì
      needsAttention: number // Cần can thiệp
      students: Set<string>
    }> = {}

    // Initialize months in order
    MONTH_ORDER.forEach(m => {
      monthStatsMap[m] = {
        month: m,
        totalEvals: 0,
        excellent: 0,
        good: 0,
        developing: 0,
        needsAttention: 0,
        students: new Set()
      }
    })

    filteredTargets.forEach(t => {
      const evals = t.evaluations || []
      evals.forEach((ev: any) => {
        let period = ev.periodName || ""
        if (!period.startsWith("Tháng ")) {
          const d = new Date(ev.createdAt)
          period = `Tháng ${d.getMonth() + 1}`
        }

        if (!monthStatsMap[period]) {
          monthStatsMap[period] = {
            month: period,
            totalEvals: 0,
            excellent: 0,
            good: 0,
            developing: 0,
            needsAttention: 0,
            students: new Set()
          }
        }

        const level = (ev.trackingLevel || "").toLowerCase()
        monthStatsMap[period].totalEvals++
        monthStatsMap[period].students.add(t.studentId)

        if (
          level.includes("vượt bậc") || 
          level.includes("hoàn thành") || 
          level.includes("xuất sắc") || 
          level.includes("giỏi") ||
          level.includes("kết thúc")
        ) {
          monthStatsMap[period].excellent++
        } else if (
          level.includes("tiến bộ") || 
          level.includes("đạt") || 
          level.includes("cải thiện") || 
          level.includes("khá") ||
          level.includes("tốt")
        ) {
          monthStatsMap[period].good++
        } else if (
          level.includes("can thiệp") || 
          level.includes("yếu") || 
          level.includes("cần hỗ trợ gấp")
        ) {
          monthStatsMap[period].needsAttention++
        } else {
          monthStatsMap[period].developing++
        }
      })
    })

    // Format for Recharts
    return MONTH_ORDER.map(m => {
      const stat = monthStatsMap[m] || {
        month: m, totalEvals: 0, excellent: 0, good: 0, developing: 0, needsAttention: 0, students: new Set()
      }

      const total = stat.totalEvals || 1
      const totalImproved = stat.excellent + stat.good
      const improvementRate = stat.totalEvals > 0 ? Math.round((totalImproved / stat.totalEvals) * 100) : 0

      if (chartMetricMode === "percentage") {
        return {
          month: m,
          "Tiến bộ vượt bậc / Hoàn thành": Math.round((stat.excellent / total) * 100),
          "Có tiến bộ / Đạt": Math.round((stat.good / total) * 100),
          "Đang theo dõi / Duy trì": Math.round((stat.developing / total) * 100),
          "Cần can thiệp": Math.round((stat.needsAttention / total) * 100),
          "Tỷ lệ cải thiện (%)": improvementRate,
          rawTotal: stat.totalEvals,
          studentCount: stat.students.size
        }
      }

      return {
        month: m,
        "Tiến bộ vượt bậc / Hoàn thành": stat.excellent,
        "Có tiến bộ / Đạt": stat.good,
        "Đang theo dõi / Duy trì": stat.developing,
        "Cần can thiệp": stat.needsAttention,
        "Tỷ lệ cải thiện (%)": improvementRate,
        rawTotal: stat.totalEvals,
        studentCount: stat.students.size
      }
    })
  }, [filteredTargets, chartMetricMode])

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let totalEvalsCount = 0
    let totalExcellent = 0
    let totalGood = 0
    let totalNeedsAttention = 0

    filteredTargets.forEach(t => {
      const evals = t.evaluations || []
      evals.forEach((ev: any) => {
        totalEvalsCount++
        const level = (ev.trackingLevel || "").toLowerCase()
        if (level.includes("vượt bậc") || level.includes("hoàn thành") || level.includes("xuất sắc") || level.includes("giỏi") || level.includes("kết thúc")) {
          totalExcellent++
        } else if (level.includes("tiến bộ") || level.includes("đạt") || level.includes("cải thiện") || level.includes("khá") || level.includes("tốt")) {
          totalGood++
        } else if (level.includes("can thiệp") || level.includes("yếu")) {
          totalNeedsAttention++
        }
      })
    })

    const overallImprovedRate = totalEvalsCount > 0 
      ? Math.round(((totalExcellent + totalGood) / totalEvalsCount) * 100) 
      : 0

    return {
      totalEvalsCount,
      totalExcellent,
      totalGood,
      totalNeedsAttention,
      overallImprovedRate
    }
  }, [filteredTargets])

  // Student progress matrix: list students with evaluation timeline
  const studentMatrixData = useMemo(() => {
    return filteredTargets.map(t => {
      const sortedEvals = t.evaluations ? [...t.evaluations].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : []
      const evalByMonth: Record<string, string> = {}
      
      sortedEvals.forEach((ev: any) => {
        let period = ev.periodName || ""
        if (!period.startsWith("Tháng ")) {
          const d = new Date(ev.createdAt)
          period = `Tháng ${d.getMonth() + 1}`
        }
        evalByMonth[period] = ev.trackingLevel
      })

      const latestEval = sortedEvals[sortedEvals.length - 1]
      const firstEval = sortedEvals[0]

      return {
        id: t.id,
        studentName: t.student?.studentName || "N/A",
        studentCode: t.student?.studentCode || "N/A",
        className: t.student?.class?.className || "N/A",
        supportType: t.supportType === "ACADEMIC" ? "Bồi dưỡng Văn hóa" : "Hỗ trợ Tâm lý",
        evalByMonth,
        firstLevel: firstEval?.trackingLevel || "Đang đề xuất",
        latestLevel: latestEval?.trackingLevel || (t.status === "ACTIVE" ? "Đang hỗ trợ" : "Chưa đánh giá"),
        evalCount: sortedEvals.length
      }
    })
  }, [filteredTargets])

  return (
    <div className="bg-white border border-indigo-100 rounded-2xl shadow-sm overflow-hidden transition-all duration-300">
      {/* Header Banner */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="px-6 py-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 backdrop-blur-md rounded-xl border border-indigo-400/30 text-indigo-300">
            <TrendingUp className="h-6 w-6 text-indigo-300" />
          </div>
          <div>
            <h2 className="text-base font-extrabold tracking-tight flex items-center gap-2">
              Phân tích Biểu đồ Cải thiện Học sinh qua các Tháng
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 uppercase tracking-wider">
                Trực quan hoá
              </span>
            </h2>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              Theo dõi diễn biến tiến bộ, đo lường tỷ lệ cải thiện mức độ bồi dưỡng & hỗ trợ tâm lý
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            type="button" 
            className="p-1.5 hover:bg-white/10 rounded-lg transition-all text-indigo-200"
          >
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-6 space-y-6 bg-slate-50/50">
          {/* Controls & Summary Cards Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border shadow-2xs">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mr-1">
                <Filter className="h-3.5 w-3.5 text-indigo-600" />
                Chương trình:
              </div>
              <div className="inline-flex p-1 bg-slate-100 rounded-lg border text-xs font-semibold">
                <button
                  onClick={() => setSelectedSupportType("ALL")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    selectedSupportType === "ALL" 
                      ? "bg-white text-indigo-700 shadow-xs font-bold" 
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tất cả ({targets.length})
                </button>
                <button
                  onClick={() => setSelectedSupportType("ACADEMIC")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    selectedSupportType === "ACADEMIC" 
                      ? "bg-white text-blue-700 shadow-xs font-bold" 
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Bồi dưỡng Văn hóa
                </button>
                <button
                  onClick={() => setSelectedSupportType("PSYCHOLOGICAL")}
                  className={`px-3 py-1 rounded-md transition-all ${
                    selectedSupportType === "PSYCHOLOGICAL" 
                      ? "bg-white text-purple-700 shadow-xs font-bold" 
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Hỗ trợ Tâm lý
                </button>
              </div>
            </div>

            {/* Metric Mode Switcher & Tab Chart Switcher */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex p-1 bg-slate-100 rounded-lg border text-xs font-semibold">
                <button
                  onClick={() => setActiveTabChart("stackedBar")}
                  className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                    activeTabChart === "stackedBar" 
                      ? "bg-indigo-600 text-white shadow-xs font-bold" 
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                  Mức độ theo Tháng
                </button>
                <button
                  onClick={() => setActiveTabChart("trendLine")}
                  className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                    activeTabChart === "trendLine" 
                      ? "bg-indigo-600 text-white shadow-xs font-bold" 
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  Xu hướng Cải thiện (%)
                </button>
                <button
                  onClick={() => setActiveTabChart("matrix")}
                  className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                    activeTabChart === "matrix" 
                      ? "bg-indigo-600 text-white shadow-xs font-bold" 
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  Diễn biến từng HS
                </button>
              </div>

              {activeTabChart === "stackedBar" && (
                <div className="inline-flex p-1 bg-indigo-50 border border-indigo-100 rounded-lg text-xs font-bold">
                  <button
                    onClick={() => setChartMetricMode("count")}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      chartMetricMode === "count" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Số lượng
                  </button>
                  <button
                    onClick={() => setChartMetricMode("percentage")}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      chartMetricMode === "percentage" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Tỷ lệ %
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-2xs flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">{summaryMetrics.overallImprovedRate}%</div>
                <div className="text-xs font-semibold text-slate-500">Tỷ lệ HS cải thiện tích cực</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-2xs flex items-center gap-3">
              <div className="p-3 bg-emerald-100/60 text-emerald-700 rounded-xl">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-emerald-700">{summaryMetrics.totalExcellent}</div>
                <div className="text-xs font-semibold text-slate-500">Tiến bộ vượt bậc / Hoàn thành</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-2xs flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-blue-700">{summaryMetrics.totalGood}</div>
                <div className="text-xs font-semibold text-slate-500">Đạt yêu cầu / Có cải thiện</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-2xs flex items-center gap-3">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-rose-700">{summaryMetrics.totalNeedsAttention}</div>
                <div className="text-xs font-semibold text-slate-500">Đánh giá cần can thiệp</div>
              </div>
            </div>
          </div>

          {/* MAIN VISUALIZATION AREA */}
          <div className="bg-white p-5 rounded-2xl border shadow-2xs">
            {activeTabChart === "stackedBar" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-indigo-600" />
                      Phân bổ Mức độ Tiến bộ của Học sinh qua từng Tháng {chartMetricMode === "percentage" ? "(Tỷ lệ %)" : "(Số lượng HS)"}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      So sánh số lượng học sinh đạt các nấc tiến bộ từ Tháng 8 đến Tháng 5
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block"></span> Tiến bộ vượt bậc / Hoàn thành</span>
                    <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-xs bg-blue-500 inline-block"></span> Có tiến bộ / Đạt</span>
                    <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-xs bg-amber-400 inline-block"></span> Đang theo dõi</span>
                    <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-xs bg-rose-500 inline-block"></span> Cần can thiệp</span>
                  </div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fontWeight: 600, fill: '#64748B' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#64748B' }} unit={chartMetricMode === "percentage" ? "%" : ""} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="Tiến bộ vượt bậc / Hoàn thành" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Có tiến bộ / Đạt" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Đang theo dõi / Duy trì" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Cần can thiệp" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTabChart === "trendLine" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      Biểu đồ Xu hướng Tỷ lệ Cải thiện (%) theo Thời gian
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Đường thể hiện % học sinh ghi nhận có tiến bộ / đạt qua các tháng phụ đạo
                    </p>
                  </div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="improvementGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00A99D" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#00A99D" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fontWeight: 600, fill: '#64748B' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#64748B' }} domain={[0, 100]} unit="%" />
                      <Tooltip 
                        formatter={(value: any) => [`${value}%`, 'Tỷ lệ cải thiện']}
                        contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Tỷ lệ cải thiện (%)" 
                        stroke="#00A99D" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#improvementGradient)" 
                        dot={{ r: 4, fill: '#00A99D', strokeWidth: 2, stroke: '#fff' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTabChart === "matrix" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Users className="h-4 w-4 text-indigo-600" />
                      Ma trận Diễn biến Đánh giá Tiến bộ Chi tiết theo Học sinh
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Theo dõi quá trình cải thiện mức độ bồi dưỡng của từng học sinh qua từng kỳ đánh giá
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 font-bold text-slate-600 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 text-left">Mã HS / Họ tên</th>
                        <th className="px-4 py-3 text-left">Lớp</th>
                        <th className="px-4 py-3 text-left">Môn / Chương trình</th>
                        {MONTH_ORDER.slice(0, 6).map(m => (
                          <th key={m} className="px-3 py-3 text-center">{m}</th>
                        ))}
                        <th className="px-4 py-3 text-center">Mức hiện tại</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {studentMatrixData.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center py-8 text-slate-400">
                            Chưa có dữ liệu đánh giá tiến bộ học sinh nào.
                          </td>
                        </tr>
                      ) : (
                        studentMatrixData.map((st) => (
                          <tr key={st.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-semibold whitespace-nowrap">
                              <div className="font-bold text-indigo-600">{st.studentName}</div>
                              <div className="text-[10px] text-slate-400">{st.studentCode}</div>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-700 whitespace-nowrap">{st.className}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                st.supportType.includes("Văn hóa") ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"
                              }`}>
                                {st.supportType}
                              </span>
                            </td>
                            {MONTH_ORDER.slice(0, 6).map(m => {
                              const level = st.evalByMonth[m]
                              if (!level) {
                                return <td key={m} className="px-3 py-3 text-center text-slate-300">-</td>
                              }

                              const lvlLower = level.toLowerCase()
                              let badgeColor = "bg-slate-100 text-slate-600"
                              if (lvlLower.includes("vượt bậc") || lvlLower.includes("hoàn thành") || lvlLower.includes("kết thúc")) {
                                badgeColor = "bg-emerald-100 text-emerald-800 font-bold"
                              } else if (lvlLower.includes("tiến bộ") || lvlLower.includes("đạt") || lvlLower.includes("khá")) {
                                badgeColor = "bg-blue-100 text-blue-800 font-bold"
                              } else if (lvlLower.includes("can thiệp")) {
                                badgeColor = "bg-rose-100 text-rose-800 font-bold"
                              }

                              return (
                                <td key={m} className="px-3 py-3 text-center whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${badgeColor}`}>
                                    {level}
                                  </span>
                                </td>
                              )
                            })}
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                                {st.latestLevel}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

