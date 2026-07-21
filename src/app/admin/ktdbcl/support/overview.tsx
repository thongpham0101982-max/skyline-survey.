"use client"

import { useMemo, useState } from "react"
import {
  Users, BookOpen, Brain, AlertTriangle,
  Clock, AlertCircle, UserCheck, BookOpenCheck, Bell,
  LayoutDashboard, TrendingUp, Shield, GraduationCap,
  Building2, Sparkles, BarChart3, ListCollapse, ChevronRight
} from "lucide-react"

interface OverviewDashboardProps {
  targets: any[]
  assignments: any[]
  classes: any[]
  campuses: any[]
  teachers: any[]
  academicYears: any[]
  selectedYearId: string
}

export function OverviewDashboard({
  targets,
  assignments,
  classes,
  campuses,
}: OverviewDashboardProps) {

  // Active Campus Tab for Class Statistics
  const [selectedCampusTabId, setSelectedCampusTabId] = useState<string>(
    campuses[0]?.id || ""
  )

  // Chart Modes for Academic and Psychology (separate states)
  const [academicChartMode, setAcademicChartMode] = useState<"percentage" | "count">("percentage")
  const [psychologyChartMode, setPsychologyChartMode] = useState<"percentage" | "count">("percentage")

  // ===== KPI: Tổng số học sinh theo dõi (unique) =====
  const uniqueStudentIds = useMemo(() => new Set(targets.map(t => t.studentId)), [targets])
  const totalStudents = uniqueStudentIds.size

  // ===== KPI: Phân loại theo supportType =====
  const academicTargets = useMemo(() => targets.filter(t => t.supportType === "ACADEMIC"), [targets])
  const psychologyTargets = useMemo(() => targets.filter(t => t.supportType === "PSYCHOLOGICAL"), [targets])

  // ===== KPI: Học sinh có cả hai loại hỗ trợ =====
  const dualSupportCount = useMemo(() => {
    const acadIds = new Set(academicTargets.map(t => t.studentId))
    return psychologyTargets.filter(t => acadIds.has(t.studentId)).length
  }, [academicTargets, psychologyTargets])

  // ===== KPI: Tình trạng theo dõi =====
  const activeCount = useMemo(() => targets.filter(t => t.terminationStatus === "ACTIVE" && t.assignments && t.assignments.length > 0).length, [targets])
  const pendingApprovalCount = useMemo(() => targets.filter(t => t.terminationStatus === "ACTIVE" && (!t.assignments || t.assignments.length === 0)).length, [targets])
  const pendingTermCount = useMemo(() => targets.filter(t => t.terminationStatus === "PENDING_TERMINATION").length, [targets])
  const terminatedCount = useMemo(() => targets.filter(t => t.terminationStatus === "TERMINATED").length, [targets])

  // ===== GRADE BAR CHART: chỉ từ className =====
  const gradeBarData = useMemo(() => {
    const grades: Record<string, { academic: number; psychology: number }> = {}

    targets.forEach(t => {
      const className = t.student?.class?.className || ""
      const match = className.match(/^(\d+)/)
      const gradeNum = match ? match[1] : null
      if (!gradeNum) return

      const key = `Khối ${gradeNum}`
      if (!grades[key]) grades[key] = { academic: 0, psychology: 0 }

      if (t.supportType === "ACADEMIC") grades[key].academic++
      else if (t.supportType === "PSYCHOLOGICAL") grades[key].psychology++
    })

    return Object.entries(grades)
      .sort(([a], [b]) => {
        const nA = parseInt(a.replace(/\D/g, "")) || 99
        const nB = parseInt(b.replace(/\D/g, "")) || 99
        return nA - nB
      })
      .map(([name, vals]) => ({
        name,
        academic: vals.academic,
        psychology: vals.psychology,
        total: vals.academic + vals.psychology,
      }))
  }, [targets])

  const maxBar = Math.max(...gradeBarData.map(d => d.total), 1)

  // ===== PROGRESS DONUT: từ evaluations thực =====
  const progressData = useMemo(() => {
    const allEvals = targets.flatMap(t => t.evaluations || [])
    const total = allEvals.length
    if (total === 0) return null

    let good = 0, improving = 0, poor = 0, inactive = 0
    allEvals.forEach(ev => {
      const level = (ev.trackingLevel || "").toLowerCase()
      if (level.includes("tốt") || level.includes("đạt") || level.includes("giỏi") || level.includes("excellent") || level.includes("good")) good++
      else if (level.includes("khá") || level.includes("cải thiện") || level.includes("trung bình") || level.includes("tb") || level.includes("average")) improving++
      else if (level.includes("yếu") || level.includes("chưa") || level.includes("cố gắng") || level.includes("weak")) poor++
      else inactive++
    })

    return {
      good: Math.round((good / total) * 100),
      improving: Math.round((improving / total) * 100),
      poor: Math.round((poor / total) * 100),
      inactive: Math.round((inactive / total) * 100),
      goodCount: good,
      total,
    }
  }, [targets])

  // ===== CLASS STATS GROUPED BY CAMPUS =====
  const classCampusStats = useMemo(() => {
    const map: Record<string, Record<string, { className: string; total: number; academic: number; psychology: number }>> = {}

    campuses.forEach(c => {
      map[c.id] = {}
    })

    targets.forEach(t => {
      const campusId = t.student?.class?.campusId || t.student?.campusId
      const className = t.student?.class?.className || "Chưa xếp lớp"
      if (!campusId) return

      if (!map[campusId]) {
        map[campusId] = {}
      }
      if (!map[campusId][className]) {
        map[campusId][className] = { className, total: 0, academic: 0, psychology: 0 }
      }

      map[campusId][className].total++
      if (t.supportType === "ACADEMIC") {
        map[campusId][className].academic++
      } else {
        map[campusId][className].psychology++
      }
    })

    const result: Record<string, Array<{ className: string; total: number; academic: number; psychology: number }>> = {}
    Object.keys(map).forEach(campusId => {
      result[campusId] = Object.values(map[campusId]).sort((a, b) => a.className.localeCompare(b.className))
    })

    return result
  }, [targets, campuses])

  // ===== EXTRACT REAL MONTHLY EVALUATION DATA (ACADEMIC) =====
  const academicMonthlyStats = useMemo(() => {
    const map: Record<string, { month: string; total: number; good: number }> = {}

    targets.forEach(t => {
      if (t.supportType !== "ACADEMIC") return
      const evals = t.evaluations || []

      evals.forEach((ev: any) => {
        const d = new Date(ev.createdAt)
        const mY = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`

        if (!map[mY]) {
          map[mY] = { month: mY, total: 0, good: 0 }
        }

        const level = (ev.trackingLevel || "").toLowerCase()
        const isGood = level.includes("tốt") || level.includes("đạt") || level.includes("tiến bộ") || level.includes("giỏi") || level.includes("cải thiện") || level.includes("khá") || level.includes("good") || level.includes("excellent")

        map[mY].total++
        if (isGood) map[mY].good++
      })
    })

    return Object.values(map).sort((a, b) => {
      const [mA, yA] = a.month.split("/").map(Number)
      const [mB, yB] = b.month.split("/").map(Number)
      return yA !== yB ? yA - yB : mA - mB
    })
  }, [targets])

  // ===== EXTRACT REAL MONTHLY EVALUATION DATA (PSYCHOLOGICAL) =====
  const psychologyMonthlyStats = useMemo(() => {
    const map: Record<string, { month: string; total: number; good: number }> = {}

    targets.forEach(t => {
      if (t.supportType !== "PSYCHOLOGICAL") return
      const evals = t.evaluations || []

      evals.forEach((ev: any) => {
        const d = new Date(ev.createdAt)
        const mY = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`

        if (!map[mY]) {
          map[mY] = { month: mY, total: 0, good: 0 }
        }

        const level = (ev.trackingLevel || "").toLowerCase()
        const isGood = level.includes("tốt") || level.includes("đạt") || level.includes("tiến bộ") || level.includes("giỏi") || level.includes("cải thiện") || level.includes("khá") || level.includes("good") || level.includes("excellent")

        map[mY].total++
        if (isGood) map[mY].good++
      })
    })

    return Object.values(map).sort((a, b) => {
      const [mA, yA] = a.month.split("/").map(Number)
      const [mB, yB] = b.month.split("/").map(Number)
      return yA !== yB ? yA - yB : mA - mB
    })
  }, [targets])

  // Helper function to calculate SVG coordinates and paths
  const getChartPlot = (data: Array<{ month: string; total: number; good: number }>, mode: "percentage" | "count") => {
    if (data.length === 0) return null

    const width = 410
    const height = 110
    const paddingLeft = 40
    const paddingTop = 15

    const maxVal = mode === "percentage" ? 100 : Math.max(...data.map(d => d.total), 5)

    const points = data.map((d, i) => {
      const x = data.length === 1
        ? paddingLeft + width / 2
        : paddingLeft + i * (width / (data.length - 1))

      const val = mode === "percentage"
        ? (d.total > 0 ? (d.good / d.total) * 100 : 0)
        : d.total

      const y = paddingTop + height - (val / maxVal) * height
      return { x, y, val: Math.round(val), raw: d }
    })

    const path = "M " + points.map(p => `${p.x} ${p.y}`).join(" L ")
    const area = path + ` L ${points[points.length - 1].x} ${paddingTop + height} L ${points[0].x} ${paddingTop + height} Z`

    return { points, path, area, height, width, paddingLeft, paddingTop, maxVal }
  }

  // Generate plot parameters for both charts
  const academicPlot = useMemo(() => getChartPlot(academicMonthlyStats, academicChartMode), [academicMonthlyStats, academicChartMode])
  const psychologyPlot = useMemo(() => getChartPlot(psychologyMonthlyStats, psychologyChartMode), [psychologyMonthlyStats, psychologyChartMode])

  // ===== SUBJECT STATS: Môn học là Môn hỗ trợ =====
  const subjectStats = useMemo(() => {
    const academicCount = targets.filter(t => t.supportType === "ACADEMIC").length
    const psychologyCount = targets.filter(t => t.supportType === "PSYCHOLOGICAL").length
    const activeCount = targets.filter(t => t.terminationStatus === "ACTIVE" || t.terminationStatus === "PENDING_TERMINATION").length
    const terminatedCount = targets.filter(t => t.terminationStatus === "TERMINATED").length

    return [
      {
        name: "Môn hỗ trợ",
        total: targets.length,
        academic: academicCount,
        psychology: psychologyCount,
        active: activeCount,
        terminated: terminatedCount
      }
    ]
  }, [targets])

  // ===== TEACHER STATS =====
  const teacherStats = useMemo(() => {
    const map: Record<string, { name: string; students: Set<string>; academic: number; psychology: number; active: number; terminated: number; subjects: Set<string> }> = {}

    targets.forEach(t => {
      const teacherAssignments = (t.assignments || []).filter((a: any) => a.teacher)
      if (teacherAssignments.length === 0) return
      teacherAssignments.forEach((a: any) => {
        const tId = a.teacher.id
        const tName = a.teacher.teacherName
        if (!map[tId]) map[tId] = { name: tName, students: new Set(), academic: 0, psychology: 0, active: 0, terminated: 0, subjects: new Set() }
        map[tId].students.add(t.studentId)
        if (t.supportType === "ACADEMIC") map[tId].academic++
        else if (t.supportType === "PSYCHOLOGICAL") map[tId].psychology++
        if (t.terminationStatus === "ACTIVE" || t.terminationStatus === "PENDING_TERMINATION") map[tId].active++
        else if (t.terminationStatus === "TERMINATED") map[tId].terminated++
        if (a.subject?.subjectName) map[tId].subjects.add(a.subject.subjectName)
      })
    })

    return Object.values(map)
      .map(v => ({ ...v, total: v.students.size, subjectList: Array.from(v.subjects).join(", ") }))
      .sort((a, b) => b.total - a.total)
  }, [targets])

  const hasNoData = targets.length === 0

  return (
    <div className="space-y-4 text-slate-800">

      {/* ===== NO DATA BANNER ===== */}
      {hasNoData && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 text-xs text-amber-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-500" />
          <span>Chưa có dữ liệu bồi dưỡng cho năm học này. Chọn năm học khác hoặc thêm học sinh vào danh sách theo dõi.</span>
        </div>
      )}

      {/* ===== COMPACT HEADER: KPI CARDS & STATUS INTEGRATION ===== */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Main Info */}
          <div>
            <h1 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
              Báo cáo Tổng hợp Môn Hỗ trợ
            </h1>
            <p className="text-[11px] text-slate-400">Hệ thống giám sát chỉ số học thuật và tâm sinh lý học đường</p>
          </div>

          {/* Compact Status Badges */}
          <div className="flex flex-wrap items-center gap-2 text-[10px]">
            <span className="font-bold text-slate-400 mr-1">Trạng thái:</span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
              <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
              Đang hỗ trợ: {activeCount}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-orange-50 text-orange-700 font-bold border border-orange-100">
              Cần can thiệp: {pendingApprovalCount}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-100">
              Hoàn thành: {pendingTermCount}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">
              Đã kết thúc: {terminatedCount}
            </span>
          </div>
        </div>

        {/* Micro KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-100">
          {/* Total students */}
          <div className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-base font-black text-slate-800 leading-none">{totalStudents}</div>
              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">HS Đang theo dõi</div>
            </div>
          </div>

          {/* Academic */}
          <div className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <BookOpen className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-base font-black text-slate-800 leading-none">{academicTargets.length}</div>
              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Phụ đạo học tập</div>
            </div>
          </div>

          {/* Psychology */}
          <div className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Brain className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-base font-black text-slate-800 leading-none">{psychologyTargets.length}</div>
              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Hỗ trợ tâm lý</div>
            </div>
          </div>

          {/* Combined Progress */}
          <div className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="text-base font-black text-slate-800 leading-none">
                {progressData ? `${progressData.good}%` : "–"}
              </div>
              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Tỷ lệ tiến bộ chung</div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MAIN GRID: 2/3 LEFT - 1/3 RIGHT BỐ CỤC CÂN ĐỐI ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* LEFT COLUMN: Biểu đồ Tiến độ, Môn học, Giáo viên (Col-span 2) */}
        <div className="lg:col-span-2 space-y-4">

          {/* 1. CHART & TABLE: PHỤ ĐẠO HỌC TẬP THEO THÁNG */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-blue-500" />
                  Tiến độ Hỗ trợ Phụ đạo Học tập theo Tháng
                </h2>
                <p className="text-[10px] text-slate-400">Xu hướng tỉ lệ tiến bộ và số lượng đánh giá thực tế của Phụ đạo</p>
              </div>

              {/* Mode Toggle Switcher */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg w-fit self-end sm:self-auto">
                <button
                  onClick={() => setAcademicChartMode("percentage")}
                  className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all ${
                    academicChartMode === "percentage"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Tỷ lệ tiến bộ (%)
                </button>
                <button
                  onClick={() => setAcademicChartMode("count")}
                  className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all ${
                    academicChartMode === "count"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Số lượng đánh giá
                </button>
              </div>
            </div>

            {academicMonthlyStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl text-slate-400">
                <BookOpen className="h-6 w-6 mb-1 text-slate-300" />
                <span className="text-[10px]">Chưa ghi nhận dữ liệu đánh giá Phụ đạo Học tập theo Tháng</span>
              </div>
            ) : academicPlot && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                {/* SVG Line Chart */}
                <div className="md:col-span-3">
                  <div className="relative w-full overflow-hidden">
                    <svg viewBox="0 0 490 170" className="w-full h-auto">
                      <defs>
                        <linearGradient id="gradAcad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
                        const y = academicPlot.paddingTop + r * academicPlot.height
                        const isBase = idx === 4
                        return (
                          <g key={idx}>
                            <line
                              x1={academicPlot.paddingLeft}
                              y1={y}
                              x2={academicPlot.paddingLeft + academicPlot.width}
                              y2={y}
                              stroke={isBase ? "#cbd5e1" : "#f1f5f9"}
                              strokeWidth={isBase ? 1.5 : 1}
                            />
                            <text
                              x={academicPlot.paddingLeft - 8}
                              y={y + 3.5}
                              textAnchor="end"
                              className="text-[8px] fill-slate-400 font-bold"
                            >
                              {academicChartMode === "percentage"
                                ? `${100 - r * 100}%`
                                : `${Math.round(academicPlot.maxVal - r * academicPlot.maxVal)}`}
                            </text>
                          </g>
                        )
                      })}

                      <path d={academicPlot.area} fill="url(#gradAcad)" />
                      <path d={academicPlot.path} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />

                      {academicPlot.points.map((p, i) => (
                        <g key={`acad-${i}`}>
                          <circle cx={p.x} cy={p.y} r="4" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
                          <rect x={p.x - 12} y={p.y - 15} width="24" height="10" rx="2" fill="#1e293b" opacity="0.85" />
                          <text x={p.x} y={p.y - 7} textAnchor="middle" className="text-[7px] font-bold fill-white">
                            {academicChartMode === "percentage" ? `${p.val}%` : p.val}
                          </text>
                          <text x={p.x} y={academicPlot.paddingTop + academicPlot.height + 15} textAnchor="middle" className="text-[9px] fill-slate-400 font-bold">
                            Th{p.raw.month.split("/")[0]}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>

                {/* Table Data */}
                <div className="md:col-span-2 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Số liệu Phụ đạo</span>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-[10px] text-slate-600">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                          <th className="py-1 px-1 text-left">Tháng</th>
                          <th className="py-1 px-1 text-center">Tổng số đánh giá</th>
                          <th className="py-1 px-1 text-center">Đạt & tiến bộ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {academicMonthlyStats.map((d, i) => {
                          const rate = d.total > 0 ? Math.round((d.good / d.total) * 100) : 0
                          return (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-1 px-1 font-bold text-slate-700">{d.month}</td>
                              <td className="py-1 px-1 text-center">{d.total}</td>
                              <td className="py-1 px-1 text-center">
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">{d.good} ({rate}%)</span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. CHART & TABLE: HỖ TRỢ TÂM LÝ THEO THÁNG */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Brain className="h-4 w-4 text-purple-500" />
                  Tiến độ Hỗ trợ Tâm lý theo Tháng
                </h2>
                <p className="text-[10px] text-slate-400">Xu hướng tỉ lệ tiến bộ và số lượng đánh giá thực tế của Tâm lý</p>
              </div>

              {/* Mode Toggle Switcher */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg w-fit self-end sm:self-auto">
                <button
                  onClick={() => setPsychologyChartMode("percentage")}
                  className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all ${
                    psychologyChartMode === "percentage"
                      ? "bg-white text-purple-700 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Tỷ lệ tiến bộ (%)
                </button>
                <button
                  onClick={() => setPsychologyChartMode("count")}
                  className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all ${
                    psychologyChartMode === "count"
                      ? "bg-white text-purple-700 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Số lượng đánh giá
                </button>
              </div>
            </div>

            {psychologyMonthlyStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl text-slate-400">
                <Brain className="h-6 w-6 mb-1 text-slate-300" />
                <span className="text-[10px]">Chưa ghi nhận dữ liệu đánh giá Hỗ trợ Tâm lý theo Tháng</span>
              </div>
            ) : psychologyPlot && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                {/* SVG Line Chart */}
                <div className="md:col-span-3">
                  <div className="relative w-full overflow-hidden">
                    <svg viewBox="0 0 490 170" className="w-full h-auto">
                      <defs>
                        <linearGradient id="gradPsych" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
                        const y = psychologyPlot.paddingTop + r * psychologyPlot.height
                        const isBase = idx === 4
                        return (
                          <g key={idx}>
                            <line
                              x1={psychologyPlot.paddingLeft}
                              y1={y}
                              x2={psychologyPlot.paddingLeft + psychologyPlot.width}
                              y2={y}
                              stroke={isBase ? "#cbd5e1" : "#f1f5f9"}
                              strokeWidth={isBase ? 1.5 : 1}
                            />
                            <text
                              x={psychologyPlot.paddingLeft - 8}
                              y={y + 3.5}
                              textAnchor="end"
                              className="text-[8px] fill-slate-400 font-bold"
                            >
                              {psychologyChartMode === "percentage"
                                ? `${100 - r * 100}%`
                                : `${Math.round(psychologyPlot.maxVal - r * psychologyPlot.maxVal)}`}
                            </text>
                          </g>
                        )
                      })}

                      <path d={psychologyPlot.area} fill="url(#gradPsych)" />
                      <path d={psychologyPlot.path} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" />

                      {psychologyPlot.points.map((p, i) => (
                        <g key={`psych-${i}`}>
                          <circle cx={p.x} cy={p.y} r="4" fill="#8b5cf6" stroke="#ffffff" strokeWidth="1.5" />
                          <rect x={p.x - 12} y={p.y - 15} width="24" height="10" rx="2" fill="#1e293b" opacity="0.85" />
                          <text x={p.x} y={p.y - 7} textAnchor="middle" className="text-[7px] font-bold fill-white">
                            {psychologyChartMode === "percentage" ? `${p.val}%` : p.val}
                          </text>
                          <text x={p.x} y={psychologyPlot.paddingTop + psychologyPlot.height + 15} textAnchor="middle" className="text-[9px] fill-slate-400 font-bold">
                            Th{p.raw.month.split("/")[0]}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>

                {/* Table Data */}
                <div className="md:col-span-2 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Số liệu Tâm lý</span>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-[10px] text-slate-600">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                          <th className="py-1 px-1 text-left">Tháng</th>
                          <th className="py-1 px-1 text-center">Tổng số đánh giá</th>
                          <th className="py-1 px-1 text-center">Đạt & tiến bộ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {psychologyMonthlyStats.map((d, i) => {
                          const rate = d.total > 0 ? Math.round((d.good / d.total) * 100) : 0
                          return (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-1 px-1 font-bold text-slate-700">{d.month}</td>
                              <td className="py-1 px-1 text-center">{d.total}</td>
                              <td className="py-1 px-1 text-center">
                                <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold">{d.good} ({rate}%)</span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. LƯỚI BÁO CÁO: MÔN HỌC & GIÁO VIÊN ĐỒNG BỘ MÔN HỖ TRỢ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Bảng Môn học */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs flex flex-col">
              <div className="px-4 py-2.5 border-b bg-gradient-to-r from-blue-50/50 to-indigo-50/50 flex items-center gap-2">
                <div className="p-1 bg-blue-50 text-blue-600 rounded-md">
                  <BookOpen className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800">Thống kê theo Môn học</h3>
                  <p className="text-[9px] text-slate-400">Phân bổ học sinh hỗ trợ theo từng bộ môn</p>
                </div>
              </div>

              <div className="flex-1 overflow-x-auto">
                <table className="min-w-full text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                      <th className="px-3 py-1.5 text-left">Môn học</th>
                      <th className="px-2 py-1.5 text-center">Phụ đạo</th>
                      <th className="px-2 py-1.5 text-center">Tâm lý</th>
                      <th className="px-2 py-1.5 text-center">Đang TĐ</th>
                      <th className="px-2 py-1.5 text-center">Đã kết thúc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                    {subjectStats.map((s, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2">
                          <span className="font-bold text-slate-800">{s.name}</span>
                          <div className="mt-1 h-1 w-20 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: "100%" }} />
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-black">{s.academic}</span>
                        </td>
                        <td className="px-2 py-2 text-center">
                          {s.psychology > 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-black">{s.psychology}</span>
                          ) : (
                            <span className="text-slate-300">–</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center font-bold text-indigo-600">{s.active}</td>
                        <td className="px-2 py-2 text-center">
                          {s.terminated > 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">{s.terminated}</span>
                          ) : (
                            <span className="text-slate-300">–</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bảng Giáo viên */}
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs flex flex-col">
              <div className="px-4 py-2.5 border-b bg-gradient-to-r from-emerald-50/50 to-teal-50/50 flex items-center gap-2">
                <div className="p-1 bg-emerald-50 text-emerald-600 rounded-md">
                  <GraduationCap className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800">Thống kê theo Giáo viên</h3>
                  <p className="text-[9px] text-slate-400">Học sinh được phân công theo giáo viên</p>
                </div>
              </div>

              <div className="flex-1 overflow-x-auto">
                <table className="min-w-full text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                      <th className="px-3 py-1.5 text-left">Giáo viên</th>
                      <th className="px-2 py-1.5 text-left">Môn phụ trách</th>
                      <th className="px-2 py-1.5 text-center">Phụ đạo</th>
                      <th className="px-2 py-1.5 text-center">Tâm lý</th>
                      <th className="px-2 py-1.5 text-center">Đang TĐ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                    {teacherStats.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-3 text-center text-slate-400">Chưa có phân công giáo viên nào</td>
                      </tr>
                    ) : (
                      teacherStats.map((t, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 font-bold text-slate-800">{t.name}</td>
                          <td className="px-2 py-2">
                            {t.subjectList && t.subjectList.trim() !== "" ? (
                              <span className="text-slate-500">{t.subjectList}</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">Môn hỗ trợ</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-black">{t.academic}</span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            {t.psychology > 0 ? (
                              <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-black">{t.psychology}</span>
                            ) : (
                              <span className="text-slate-300">–</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center font-bold text-indigo-600">{t.active}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Thống kê Khối, Tiến độ Donut, Thống kê Lớp tại Cơ sở (Col-span 1) */}
        <div className="space-y-4">

          {/* 1. THỐNG KÊ LỚP TẠI CƠ SỞ (TABS) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
            <h2 className="text-xs font-black text-slate-800 flex items-center gap-1.5 mb-0.5">
              <Building2 className="h-4 w-4 text-indigo-500" />
              Thống kê theo Lớp tại Cơ sở
            </h2>
            <p className="text-[10px] text-slate-400 mb-2.5">Số học sinh cần hỗ trợ phân bổ theo từng lớp</p>

            {/* Campus Tabs Selectors */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg mb-2.5">
              {campuses.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCampusTabId(c.id)}
                  className={`flex-1 py-1 text-[9px] font-bold rounded-md transition-all ${
                    selectedCampusTabId === c.id
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {c.campusName}
                </button>
              ))}
            </div>

            {/* Classes List */}
            {(!classCampusStats[selectedCampusTabId] || classCampusStats[selectedCampusTabId].length === 0) ? (
              <div className="text-center py-4 text-slate-400 text-[10px]">
                Cơ sở này hiện chưa có học sinh theo dõi
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {classCampusStats[selectedCampusTabId].map((classItem, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/60 border border-slate-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-6.5 h-6.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center text-[10px] font-black">
                        {classItem.className}
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-700 block leading-tight">Lớp {classItem.className}</span>
                        <span className="text-[8px] text-slate-400 font-medium">Khối {classItem.className.match(/^\d+/)?.[0] || "–"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[8px] px-1 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">
                        {classItem.academic} Phụ đạo
                      </span>
                      {classItem.psychology > 0 && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-100">
                          {classItem.psychology} Tâm lý
                        </span>
                      )}
                      <span className="text-[10px] font-black text-slate-800 w-4 text-right">{classItem.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. THỐNG KÊ THEO KHỐI & TIẾN ĐỘ DONUT (GỘP BỐ CỤC CÂN ĐỐI) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">

            {/* Thống kê khối */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
              <h2 className="text-xs font-black text-slate-800 mb-0.5">Thống kê theo khối</h2>
              <p className="text-[9px] text-slate-400 mb-2">Phân bổ học sinh hỗ trợ theo khối lớp</p>

              {gradeBarData.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-[10px]">Chưa có dữ liệu theo khối</div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {gradeBarData.map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="font-bold text-slate-500">{item.name}</span>
                        <span className="font-black text-slate-800">{item.total} HS</span>
                      </div>
                      <div className="h-3 w-full rounded-md overflow-hidden bg-slate-100 flex">
                        {item.academic > 0 && (
                          <div
                            style={{ width: `${(item.academic / maxBar) * 100}%` }}
                            className="bg-blue-500 h-full flex items-center justify-end transition-all duration-700"
                          >
                            {item.academic > 0 && <span className="text-[7px] font-bold text-white pr-1 leading-none">{item.academic}</span>}
                          </div>
                        )}
                        {item.psychology > 0 && (
                          <div
                            style={{ width: `${(item.psychology / maxBar) * 100}%` }}
                            className="bg-purple-500 h-full flex items-center justify-end transition-all duration-700"
                          >
                            {item.psychology > 0 && <span className="text-[7px] font-bold text-white pr-1 leading-none">{item.psychology}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tiến độ Donut */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
              <h2 className="text-xs font-black text-slate-800 mb-0.5">Tỷ lệ tiến bộ chung</h2>
              <p className="text-[9px] text-slate-400 mb-2">Kết quả các đợt đánh giá định kỳ</p>

              {!progressData ? (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                  <TrendingUp className="h-5 w-7 mb-0.5 opacity-30 text-emerald-500" />
                  <span className="text-[9px] text-center">Chưa ghi nhận đánh giá định kỳ</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0 w-16 h-16">
                    <svg viewBox="0 0 120 120" className="w-16 h-16 -rotate-90">
                      <circle cx="60" cy="60" r="46" fill="none" stroke="#f1f5f9" strokeWidth="14" />
                      <circle cx="60" cy="60" r="46" fill="none" stroke="#10b981"
                        strokeWidth="14"
                        strokeDasharray={`${progressData.good * 2.89} ${(100 - progressData.good) * 2.89}`}
                        strokeDashoffset="0"
                      />
                      <circle cx="60" cy="60" r="46" fill="none" stroke="#8b5cf6"
                        strokeWidth="14"
                        strokeDasharray={`${progressData.improving * 2.89} ${(100 - progressData.improving) * 2.89}`}
                        strokeDashoffset={`${-progressData.good * 2.89}`}
                      />
                      <circle cx="60" cy="60" r="46" fill="none" stroke="#f59e0b"
                        strokeWidth="14"
                        strokeDasharray={`${progressData.poor * 2.89} ${(100 - progressData.poor) * 2.89}`}
                        strokeDashoffset={`${-(progressData.good + progressData.improving) * 2.89}`}
                      />
                      <circle cx="60" cy="60" r="46" fill="none" stroke="#f43f5e"
                        strokeWidth="14"
                        strokeDasharray={`${progressData.inactive * 2.89} ${(100 - progressData.inactive) * 2.89}`}
                        strokeDashoffset={`${-(progressData.good + progressData.improving + progressData.poor) * 2.89}`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-sm font-black text-slate-800 leading-none">{progressData.good}%</span>
                      <span className="text-[7px] text-slate-400 font-bold mt-0.5">Tiến bộ</span>
                    </div>
                  </div>

                  <div className="space-y-1 flex-1 text-[9px] text-slate-500 font-semibold">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Tốt: {progressData.good}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                      <span>Khá: {progressData.improving}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>TB: {progressData.poor}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span>Yếu: {progressData.inactive}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* ===== BẢNG THỐNG KÊ CHI TIẾT THEO CƠ SỞ & KHỐI ===== */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Building2 className="h-4.5 w-4.5 text-indigo-500" />
              Thống kê Chi tiết theo Cơ sở & Khối lớp
            </h2>
            <p className="text-[10px] text-slate-400">Số liệu chi tiết phân bổ học sinh theo dõi bồi dưỡng và phân công giảng dạy</p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3 text-left">Cơ sở</th>
                <th className="px-4 py-3 text-left">Khối</th>
                <th className="px-4 py-3 text-center">Tổng số HS</th>
                <th className="px-4 py-3 text-center">Phụ đạo học tập</th>
                <th className="px-4 py-3 text-center">Hỗ trợ tâm lý</th>
                <th className="px-4 py-3 text-center">Đã phân công GV</th>
                <th className="px-4 py-3 text-center">Chưa phân công GV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
              {(() => {
                const statsMap = {};

                targets.forEach((t) => {
                  const campusName = t.student?.class?.campus?.campusName || "Không xác định";
                  const className = t.student?.class?.className || "";
                  const gradeName = className ? `Khối ${className.match(/^\d+/)?.[0] || className}` : "Không xác định";
                  
                  const key = `${campusName}_${gradeName}`;
                  if (!statsMap[key]) {
                    statsMap[key] = {
                      campusName,
                      gradeName,
                      total: 0,
                      academic: 0,
                      psychology: 0,
                      assigned: 0,
                      unassigned: 0
                    };
                  }

                  const stats = statsMap[key];
                  stats.total++;
                  if (t.supportType === "ACADEMIC") {
                    stats.academic++;
                  } else if (t.supportType === "PSYCHOLOGICAL") {
                    stats.psychology++;
                  }

                  const isAssigned = t.assignments && t.assignments.length > 0;
                  if (isAssigned) {
                    stats.assigned++;
                  } else {
                    stats.unassigned++;
                  }
                });

                const statsList = Object.values(statsMap).sort((a, b) => {
                  if (a.campusName !== b.campusName) return a.campusName.localeCompare(b.campusName);
                  return a.gradeName.localeCompare(b.gradeName);
                });

                if (statsList.length === 0) {
                  return (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-slate-400">Không có dữ liệu thống kê</td>
                    </tr>
                  );
                }

                return statsList.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">{row.campusName}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{row.gradeName}</td>
                    <td className="px-4 py-3 text-center font-bold text-indigo-700">{row.total}</td>
                    <td className="px-4 py-3 text-center text-blue-700 font-semibold">{row.academic}</td>
                    <td className="px-4 py-3 text-center text-purple-700 font-semibold">{row.psychology}</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-semibold">{row.assigned}</td>
                    <td className="px-4 py-3 text-center text-orange-700 font-semibold">{row.unassigned}</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
