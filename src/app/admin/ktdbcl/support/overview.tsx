"use client"

import { useMemo, useState } from "react"
import {
  Users, BookOpen, Brain, Bell,
  AlertCircle, GraduationCap,
  Building2, Sparkles, TrendingUp, Clock
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts"

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

  // Chart view and type states (separate for each row)
  const [academicViewMode, setAcademicViewMode] = useState<"chart" | "table">("chart")
  const [psychologyViewMode, setPsychologyViewMode] = useState<"chart" | "table">("chart")
  
  // Chart Modes for Academic and Psychology
  const [academicChartMode, setAcademicChartMode] = useState<"percentage" | "count">("percentage")
  const [psychologyChartMode, setPsychologyChartMode] = useState<"percentage" | "count">("percentage")

  // State for proposed termination filters
  const [selectedProposalMonth, setSelectedProposalMonth] = useState<string>("all")
  const [selectedProposalStatus, setSelectedProposalStatus] = useState<string>("all")

  // ===== KPI: Tổng số học sinh theo dõi (unique) =====
  const uniqueStudentIds = useMemo(() => new Set(targets.map(t => t.studentId)), [targets])
  const totalStudents = uniqueStudentIds.size

  // ===== KPI: Phân loại theo supportType =====
  const academicTargets = useMemo(() => targets.filter(t => t.supportType === "ACADEMIC"), [targets])
  const psychologyTargets = useMemo(() => targets.filter(t => t.supportType === "PSYCHOLOGICAL"), [targets])

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

  // Map data to Recharts format
  const formattedAcademicData = useMemo(() => {
    return academicMonthlyStats.map(d => {
      const rate = d.total > 0 ? Math.round((d.good / d.total) * 100) : 0
      return {
        name: `Th ${d.month.split("/")[0]}`,
        month: d.month,
        total: d.total,
        good: d.good,
        rate: rate,
      }
    })
  }, [academicMonthlyStats])

  const formattedPsychologyData = useMemo(() => {
    return psychologyMonthlyStats.map(d => {
      const rate = d.total > 0 ? Math.round((d.good / d.total) * 100) : 0
      return {
        name: `Th ${d.month.split("/")[0]}`,
        month: d.month,
        total: d.total,
        good: d.good,
        rate: rate,
      }
    })
  }, [psychologyMonthlyStats])

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

  // ===== GET TERMINATION PROPOSALS GROUPED BY MONTH =====
  const terminationProposals = useMemo(() => {
    const filtered = targets.filter(t => 
      t.terminationStatus === "PENDING_TERMINATION" || 
      t.terminationStatus === "TERMINATED"
    )

    return filtered.map(t => {
      const date = new Date(t.updatedAt)
      const monthStr = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
      return {
        ...t,
        proposalMonth: monthStr,
        proposalDate: date,
      }
    }).sort((a, b) => b.proposalDate.getTime() - a.proposalDate.getTime())
  }, [targets])

  // Extract unique months for dropdown filter
  const uniqueProposalMonths = useMemo(() => {
    const months = new Set<string>()
    terminationProposals.forEach(p => {
      months.add(p.proposalMonth)
    })
    return Array.from(months).sort((a, b) => {
      const [mA, yA] = a.split("/").map(Number)
      const [mB, yB] = b.split("/").map(Number)
      return yA !== yB ? yB - yA : mB - mA // Descending order
    })
  }, [terminationProposals])

  // Filtered proposals based on state
  const filteredProposals = useMemo(() => {
    return terminationProposals.filter(p => {
      const matchMonth = selectedProposalMonth === "all" || p.proposalMonth === selectedProposalMonth
      const matchStatus = selectedProposalStatus === "all" || p.terminationStatus === selectedProposalStatus
      return matchMonth && matchStatus
    })
  }, [terminationProposals, selectedProposalMonth, selectedProposalStatus])

  const hasNoData = targets.length === 0

  // Custom chart tooltip
  const CustomTooltip = ({ active, payload, colorTheme }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl border border-slate-800 text-[11px] backdrop-blur-xs">
          <p className="font-extrabold text-slate-200 mb-1.5">{data.month}</p>
          <div className="space-y-1">
            <p className="flex justify-between gap-4">
              <span className="text-slate-400">Tổng số đánh giá:</span>
              <span className="font-bold">{data.total}</span>
            </p>
            <p className="flex justify-between gap-4">
              <span className="text-slate-400">Đạt & Tiến bộ:</span>
              <span className="font-bold text-emerald-400">{data.good}</span>
            </p>
            <p className="flex justify-between gap-4 border-t border-slate-800 pt-1 mt-1">
              <span className="text-slate-400">Tỷ lệ tiến bộ:</span>
              <span className="font-bold" style={{ color: colorTheme }}>{data.rate}%</span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in">

      {/* ===== NO DATA BANNER ===== */}
      {hasNoData && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-800 shadow-xs">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-500" />
          <span>Chưa có dữ liệu bồi dưỡng cho năm học này. Chọn năm học khác hoặc thêm học sinh vào danh sách theo dõi.</span>
        </div>
      )}

      {/* ===== COMPACT HEADER: KPI CARDS & STATUS INTEGRATION ===== */}
      <div className="bg-gradient-to-r from-[#003B3A] to-[#005650] rounded-2xl p-5 md:p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Decorative background vectors */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-2xl pointer-events-none" />
        
        {/* Main Info */}
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#00A99D] animate-pulse" />
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
              Báo cáo Tổng hợp Môn Hỗ trợ
            </h1>
          </div>
          <p className="text-xs text-slate-300 font-medium">Hệ thống giám sát chỉ số học thuật và tâm sinh lý học đường</p>
        </div>

        {/* Compact Status Badges */}
        <div className="flex flex-wrap items-center gap-2 z-10">
          <span className="text-xs font-bold text-slate-300 mr-1">Trạng thái:</span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-200 font-bold border border-indigo-500/20 text-[11px] backdrop-blur-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
            Đang hỗ trợ: {activeCount}
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-orange-200 font-bold border border-orange-500/30 text-[11px] backdrop-blur-xs shadow-xs animate-pulse">
            <Bell className="h-3 w-3 text-orange-300 fill-orange-300 animate-bounce" />
            Cần can thiệp: {pendingApprovalCount}
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-200 font-bold border border-amber-500/20 text-[11px] backdrop-blur-xs">
            Hoàn thành: {pendingTermCount}
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-200 font-bold border border-emerald-500/20 text-[11px] backdrop-blur-xs">
            Đã kết thúc: {terminatedCount}
          </span>
        </div>
      </div>

      {/* Micro KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total students */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_10px_20px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 w-16 h-16 bg-[#E6F6F5]/40 rounded-tl-full opacity-60 group-hover:scale-110 transition-transform duration-300" />
          <div className="p-3 bg-[#E6F6F5] text-[#00A99D] rounded-xl z-10">
            <Users className="h-5 w-5" />
          </div>
          <div className="z-10">
            <div className="text-2xl font-black text-slate-800 leading-none tracking-tight">{totalStudents}</div>
            <div className="text-[11px] text-slate-400 font-semibold mt-1 tracking-wider uppercase">HS Đang theo dõi</div>
          </div>
        </div>

        {/* Academic */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_10px_20px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 w-16 h-16 bg-blue-50/40 rounded-tl-full opacity-60 group-hover:scale-110 transition-transform duration-300" />
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl z-10">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="z-10">
            <div className="text-2xl font-black text-slate-800 leading-none tracking-tight">{academicTargets.length}</div>
            <div className="text-[11px] text-slate-400 font-semibold mt-1 tracking-wider uppercase">Phụ đạo học tập</div>
          </div>
        </div>

        {/* Psychology */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_10px_20px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 w-16 h-16 bg-violet-50/40 rounded-tl-full opacity-60 group-hover:scale-110 transition-transform duration-300" />
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl z-10">
            <Brain className="h-5 w-5" />
          </div>
          <div className="z-10">
            <div className="text-2xl font-black text-slate-800 leading-none tracking-tight">{psychologyTargets.length}</div>
            <div className="text-[11px] text-slate-400 font-semibold mt-1 tracking-wider uppercase">Hỗ trợ tâm lý</div>
          </div>
        </div>

        {/* Combined Progress */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_10px_20px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4 relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 w-16 h-16 bg-emerald-50/40 rounded-tl-full opacity-60 group-hover:scale-110 transition-transform duration-300" />
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl z-10">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="z-10">
            <div className="text-2xl font-black text-slate-800 leading-none tracking-tight">
              {progressData ? `${progressData.good}%` : "–"}
            </div>
            <div className="text-[11px] text-slate-400 font-semibold mt-1 tracking-wider uppercase">Tỷ lệ tiến bộ chung</div>
          </div>
        </div>
      </div>

      {/* ===== HÀNG 1: BIỂU ĐỒ PHỤ ĐẠO HỌC TẬP (HÀNG RIÊNG BIỆT) ===== */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-xs font-black text-slate-800 flex items-center gap-2">
              <BookOpen className="h-4.5 w-4.5 text-blue-500" />
              Tiến độ Hỗ trợ Phụ đạo Học tập theo Tháng
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Xu hướng tỉ lệ tiến bộ và số lượng đánh giá thực tế của Phụ đạo</p>
          </div>

          {/* View & Unit Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
              <button
                onClick={() => setAcademicViewMode("chart")}
                className={`px-2.5 py-1 text-[9px] font-extrabold rounded-md transition-all ${
                  academicViewMode === "chart"
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Biểu đồ
              </button>
              <button
                onClick={() => setAcademicViewMode("table")}
                className={`px-2.5 py-1 text-[9px] font-extrabold rounded-md transition-all ${
                  academicViewMode === "table"
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Bảng số liệu
              </button>
            </div>

            {academicViewMode === "chart" && academicMonthlyStats.length > 0 && (
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
                <button
                  onClick={() => setAcademicChartMode("percentage")}
                  className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all ${
                    academicChartMode === "percentage"
                      ? "bg-white text-slate-800 shadow-xs font-extrabold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Tỷ lệ (%)
                </button>
                <button
                  onClick={() => setAcademicChartMode("count")}
                  className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all ${
                    academicChartMode === "count"
                      ? "bg-white text-slate-800 shadow-xs font-extrabold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Số lượng
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content area */}
        {academicMonthlyStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl text-slate-400">
            <BookOpen className="h-6 w-6 mb-2 text-slate-300" />
            <span className="text-[10px] font-bold">Chưa ghi nhận dữ liệu đánh giá Phụ đạo Học tập</span>
          </div>
        ) : academicViewMode === "chart" ? (
          <div className="w-full pl-0">
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={formattedAcademicData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradAcad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity="0.25" />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 700 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 700 }}
                  domain={[0, academicChartMode === "percentage" ? 100 : "auto"]}
                />
                <Tooltip content={<CustomTooltip colorTheme="#3b82f6" />} />
                <Area
                  type="monotone"
                  dataKey={academicChartMode === "percentage" ? "rate" : "total"}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gradAcad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="min-w-full text-xs text-slate-600">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 text-[9px]">
                  <th className="py-2 px-3 text-left">Tháng</th>
                  <th className="py-2 px-3 text-center">Tổng số đánh giá</th>
                  <th className="py-2 px-3 text-center">Đạt & tiến bộ</th>
                  <th className="py-2 px-3 text-center">Tỷ lệ tiến bộ (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-[10px]">
                {academicMonthlyStats.map((d, i) => {
                  const rate = d.total > 0 ? Math.round((d.good / d.total) * 100) : 0
                  return (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2 px-3 font-bold text-slate-700">{d.month}</td>
                      <td className="py-2 px-3 text-center">{d.total}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">{d.good}</span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-bold">{rate}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== HÀNG 2: BIỂU ĐỒ HỖ TRỢ TÂM LÝ (HÀNG RIÊNG BIỆT) ===== */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-xs font-black text-slate-800 flex items-center gap-2">
              <Brain className="h-4.5 w-4.5 text-violet-500" />
              Tiến độ Hỗ trợ Tâm lý theo Tháng
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Xu hướng tỉ lệ tiến bộ và số lượng đánh giá thực tế của Tâm lý</p>
          </div>

          {/* View & Unit Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
              <button
                onClick={() => setPsychologyViewMode("chart")}
                className={`px-2.5 py-1 text-[9px] font-extrabold rounded-md transition-all ${
                  psychologyViewMode === "chart"
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Biểu đồ
              </button>
              <button
                onClick={() => setPsychologyViewMode("table")}
                className={`px-2.5 py-1 text-[9px] font-extrabold rounded-md transition-all ${
                  psychologyViewMode === "table"
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Bảng số liệu
              </button>
            </div>

            {psychologyViewMode === "chart" && psychologyMonthlyStats.length > 0 && (
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
                <button
                  onClick={() => setPsychologyChartMode("percentage")}
                  className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all ${
                    psychologyChartMode === "percentage"
                      ? "bg-white text-slate-800 shadow-xs font-extrabold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Tỷ lệ (%)
                </button>
                <button
                  onClick={() => setPsychologyChartMode("count")}
                  className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all ${
                    psychologyChartMode === "count"
                      ? "bg-white text-slate-800 shadow-xs font-extrabold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Số lượng
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content area */}
        {psychologyMonthlyStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl text-slate-400">
            <Brain className="h-6 w-6 mb-2 text-slate-300" />
            <span className="text-[10px] font-bold">Chưa ghi nhận dữ liệu đánh giá Hỗ trợ Tâm lý</span>
          </div>
        ) : psychologyViewMode === "chart" ? (
          <div className="w-full pl-0">
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={formattedPsychologyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradPsych" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity="0.25" />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 700 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 700 }}
                  domain={[0, psychologyChartMode === "percentage" ? 100 : "auto"]}
                />
                <Tooltip content={<CustomTooltip colorTheme="#8b5cf6" />} />
                <Area
                  type="monotone"
                  dataKey={psychologyChartMode === "percentage" ? "rate" : "total"}
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gradPsych)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="min-w-full text-xs text-slate-600">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 text-[9px]">
                  <th className="py-2 px-3 text-left">Tháng</th>
                  <th className="py-2 px-3 text-center">Tổng số đánh giá</th>
                  <th className="py-2 px-3 text-center">Đạt & tiến bộ</th>
                  <th className="py-2 px-3 text-center">Tỷ lệ tiến bộ (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-[10px]">
                {psychologyMonthlyStats.map((d, i) => {
                  const rate = d.total > 0 ? Math.round((d.good / d.total) * 100) : 0
                  return (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2 px-3 font-bold text-slate-700">{d.month}</td>
                      <td className="py-2 px-3 text-center">{d.total}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 font-bold border border-violet-100">{d.good}</span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-100 font-bold">{rate}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== HÀNG 3: THỐNG KÊ LỚP TẠI CƠ SỞ (HÀNG RIÊNG BIỆT) ===== */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-5 md:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#00A99D]" />
              Thống kê theo Lớp tại Cơ sở
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Số lượng học sinh cần hỗ trợ và phân bổ chi tiết theo từng lớp học</p>
          </div>

          {/* Campus Tabs Selectors */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/50 overflow-x-auto self-start sm:self-auto">
            {campuses.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCampusTabId(c.id)}
                className={`py-1 px-3.5 text-[10px] font-bold rounded-lg transition-all whitespace-nowrap ${
                  selectedCampusTabId === c.id
                    ? "bg-white text-[#00A99D] shadow-xs font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {c.campusName}
              </button>
            ))}
          </div>
        </div>

        {/* Classes List in a beautiful Grid layout */}
        {(!classCampusStats[selectedCampusTabId] || classCampusStats[selectedCampusTabId].length === 0) ? (
          <div className="text-center py-10 text-slate-400 text-[11px] font-bold bg-slate-50/50 border border-dashed rounded-2xl">
            Cơ sở này hiện chưa có học sinh theo dõi bồi dưỡng
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {classCampusStats[selectedCampusTabId].map((classItem, idx) => {
              const cleanClassName = classItem.className.split(/[_-]/)[0];
              return (
                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/50 border border-slate-100/60 transition-all duration-200 group">
                  <div className="flex items-center gap-2.5">
                    <div className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100/60 flex items-center justify-center text-[10px] font-black w-auto min-w-[38px] h-7 shadow-2xs">
                      {cleanClassName}
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block leading-tight">Lớp {cleanClassName}</span>
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Khối {classItem.className.match(/^\d+/)?.[0] || "–"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-100/40 flex items-center gap-1">
                      <BookOpen className="w-2.5 h-2.5" />
                      {classItem.academic}
                    </span>
                    {classItem.psychology > 0 && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-bold border border-violet-100/40 flex items-center gap-1">
                        <Brain className="w-2.5 h-2.5" />
                        {classItem.psychology}
                      </span>
                    )}
                    <span className="text-[10px] font-extrabold text-slate-800 w-5.5 h-5.5 bg-slate-200/50 px-1 py-0.5 rounded-lg border border-slate-300/30 flex items-center justify-center">
                      {classItem.total}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ===== HÀNG 4: THỐNG KÊ PHỤ TRỢ (MÔN HỌC, GIÁO VIÊN, KHỐI, TIẾN ĐỘ CHUNG) - CHUNG 1 HÀNG ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

        {/* 1. Thống kê Môn học */}
        <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-300 flex flex-col min-h-[220px]">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-blue-50/50 to-indigo-50/50 flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800">Thống kê theo Môn học</h3>
              <p className="text-[9px] text-slate-400">Học sinh hỗ trợ theo từng bộ môn</p>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="min-w-full text-[10px]">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                  <th className="px-4 py-2 text-left">Môn học</th>
                  <th className="px-2 py-2 text-center">Phụ đạo</th>
                  <th className="px-2 py-2 text-center">Tâm lý</th>
                  <th className="px-2 py-2 text-center">Đang TĐ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                {subjectStats.map((s, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-800">{s.name}</span>
                      <div className="mt-1.5 h-1 w-16 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: "100%" }} />
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-black">{s.academic}</span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      {s.psychology > 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 font-black">{s.psychology}</span>
                      ) : (
                        <span className="text-slate-300">–</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-center font-bold text-indigo-600">{s.active}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Thống kê Giáo viên */}
        <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-300 flex flex-col min-h-[220px]">
          <div className="px-4 py-3 border-b bg-gradient-to-r from-emerald-50/50 to-teal-50/50 flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800">Thống kê theo Giáo viên</h3>
              <p className="text-[9px] text-slate-400">Học sinh được phân công theo giáo viên</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[170px]">
            <table className="min-w-full text-[10px]">
              <thead className="sticky top-0 bg-white z-10 border-b border-slate-100 shadow-xxs">
                <tr className="bg-slate-50 text-slate-400 font-bold">
                  <th className="px-3 py-2 text-left">Giáo viên</th>
                  <th className="px-2 py-2 text-center">P.Đạo</th>
                  <th className="px-2 py-2 text-center">T.Lý</th>
                  <th className="px-2 py-2 text-center">Đang TĐ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                {teacherStats.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400">Chưa có phân công</td>
                  </tr>
                ) : (
                  teacherStats.map((t, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5">
                        <span className="font-bold text-slate-800 block max-w-[80px] truncate" title={t.name}>{t.name}</span>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span className="px-1 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">{t.academic}</span>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        {t.psychology > 0 ? (
                          <span className="px-1 py-0.5 rounded bg-violet-50 text-violet-700 font-bold">{t.psychology}</span>
                        ) : (
                          <span className="text-slate-300">–</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-center font-bold text-indigo-600">{t.active}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Thống kê theo Khối */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-300 flex flex-col min-h-[220px]">
          <div className="border-b pb-2 mb-3">
            <h3 className="text-xs font-black text-slate-800">Thống kê theo khối</h3>
            <p className="text-[9px] text-slate-400">Phân bổ học sinh hỗ trợ theo khối lớp</p>
          </div>

          {gradeBarData.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-[10px] font-bold bg-slate-50/50 border border-dashed rounded-xl">Chưa có dữ liệu</div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-[145px] pr-1">
              {gradeBarData.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-500">
                    <span>{item.name}</span>
                    <span className="text-slate-800 font-extrabold flex items-center gap-1">
                      <span>{item.total} HS</span>
                      <span className="text-blue-600">({item.academic} PĐ</span>
                      {item.psychology > 0 && <span className="text-violet-600">, {item.psychology} TL</span>}
                      <span>)</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 flex overflow-hidden">
                    {item.academic > 0 && (
                      <div
                        style={{ width: `${(item.academic / item.total) * (item.total / maxBar) * 100}%` }}
                        className="bg-gradient-to-r from-blue-400 to-blue-500 h-full rounded-l-full"
                      />
                    )}
                    {item.psychology > 0 && (
                      <div
                        style={{ width: `${(item.psychology / item.total) * (item.total / maxBar) * 100}%` }}
                        className="bg-gradient-to-r from-violet-400 to-violet-500 h-full rounded-r-full"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Tỷ lệ tiến bộ chung */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-300 flex flex-col min-h-[220px]">
          <div className="border-b pb-2 mb-3">
            <h3 className="text-xs font-black text-slate-800">Tỷ lệ tiến bộ chung</h3>
            <p className="text-[9px] text-slate-400">Kết quả các đợt đánh giá định kỳ</p>
          </div>

          {!progressData ? (
            <div className="flex flex-col items-center justify-center py-6 text-slate-400 bg-slate-50/50 border border-dashed rounded-xl flex-1">
              <TrendingUp className="h-5 w-7 mb-1 opacity-30 text-emerald-500" />
              <span className="text-[9px] font-bold">Chưa có đánh giá</span>
            </div>
          ) : (
            <div className="flex flex-col justify-between flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-shrink-0 w-14 h-14">
                  <svg viewBox="0 0 120 120" className="w-14 h-14 -rotate-90">
                    <circle cx="60" cy="60" r="46" fill="none" stroke="#f1f5f9" strokeWidth="13" />
                    <circle cx="60" cy="60" r="46" fill="none" stroke="#10b981"
                      strokeWidth="13"
                      strokeDasharray={`${progressData.good * 2.89} ${(100 - progressData.good) * 2.89}`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                    <circle cx="60" cy="60" r="46" fill="none" stroke="#8b5cf6"
                      strokeWidth="13"
                      strokeDasharray={`${progressData.improving * 2.89} ${(100 - progressData.improving) * 2.89}`}
                      strokeDashoffset={`${-progressData.good * 2.89}`}
                      strokeLinecap="round"
                    />
                    <circle cx="60" cy="60" r="46" fill="none" stroke="#f59e0b"
                      strokeWidth="13"
                      strokeDasharray={`${progressData.poor * 2.89} ${(100 - progressData.poor) * 2.89}`}
                      strokeDashoffset={`${-(progressData.good + progressData.improving) * 2.89}`}
                      strokeLinecap="round"
                    />
                    <circle cx="60" cy="60" r="46" fill="none" stroke="#f43f5e"
                      strokeWidth="13"
                      strokeDasharray={`${progressData.inactive * 2.89} ${(100 - progressData.inactive) * 2.89}`}
                      strokeDashoffset={`${-(progressData.good + progressData.improving + progressData.poor) * 2.89}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[11px] font-black text-slate-800 leading-none">{progressData.good}%</span>
                    <span className="text-[7px] text-slate-400 font-bold mt-0.5">Tiến bộ</span>
                  </div>
                </div>

                <div className="space-y-0.5 flex-1 text-[9px] text-slate-500 font-bold ml-1">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-0.5">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Tốt:</span>
                    <span className="text-slate-800 font-extrabold">{progressData.good}%</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-50 pb-0.5">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" /> Khá:</span>
                    <span className="text-slate-800 font-extrabold">{progressData.improving}%</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-50 pb-0.5">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> TB:</span>
                    <span className="text-slate-800 font-extrabold">{progressData.poor}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Yếu:</span>
                    <span className="text-slate-800 font-extrabold">{progressData.inactive}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ===== HÀNG 5: DANH SÁCH ĐỀ XUẤT CHẤM DỨT THEO THÁNG ===== */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-5 md:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-500" />
              Danh sách Học sinh Đề xuất Chấm dứt Hỗ trợ
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Danh sách học sinh chờ duyệt hoặc đã duyệt kết thúc bồi dưỡng theo từng tháng</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Tháng đề xuất:</label>
              <select
                value={selectedProposalMonth}
                onChange={(e) => setSelectedProposalMonth(e.target.value)}
                className="rounded-lg border-slate-200 border py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold text-slate-700 bg-slate-50/50"
              >
                <option value="all">Tất cả các tháng</option>
                {uniqueProposalMonths.map(m => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Trạng thái:</label>
              <select
                value={selectedProposalStatus}
                onChange={(e) => setSelectedProposalStatus(e.target.value)}
                className="rounded-lg border-slate-200 border py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold text-slate-700 bg-slate-50/50"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="PENDING_TERMINATION">Chờ duyệt chấm dứt</option>
                <option value="TERMINATED">Đã duyệt chấm dứt</option>
              </select>
            </div>
          </div>
        </div>

        {filteredProposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl text-slate-400">
            <Users className="h-7 w-7 mb-2 text-slate-300" />
            <span className="text-xs font-bold">Không tìm thấy đề xuất chấm dứt hỗ trợ nào phù hợp</span>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 rounded-xl shadow-xxs">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50/75 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3 text-left">Học sinh</th>
                  <th className="px-4 py-3 text-left">Lớp / Cơ sở</th>
                  <th className="px-4 py-3 text-center">Loại hỗ trợ</th>
                  <th className="px-4 py-3 text-left">Người đề xuất</th>
                  <th className="px-4 py-3 text-center">Ngày đề xuất</th>
                  <th className="px-4 py-3 text-left">Đánh giá kết quả</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-600 bg-white">
                {filteredProposals.map((row, idx) => {
                  const sName = row.student?.studentName || "Không rõ";
                  const sCode = row.student?.studentCode || "Không rõ";
                  const className = row.student?.class?.className.split(/[_-]/)[0] || "Chưa xếp lớp";
                  const campusName = row.student?.class?.campus?.campusName || "Không rõ";
                  const proposerName = row.createdBy?.teacherName || "Giáo viên phụ trách";
                  
                  const propDate = row.proposalDate.toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                  });

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{sName}</div>
                        <div className="text-[9px] text-slate-400 font-semibold mt-0.5">{sCode}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-700">Lớp {className}</div>
                        <div className="text-[9px] text-slate-400 font-semibold mt-0.5">{campusName}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.supportType === "ACADEMIC" ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100/40 font-bold text-[10px] inline-flex items-center gap-1">
                            <BookOpen className="w-3 h-3" /> Học tập
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100/40 font-bold text-[10px] inline-flex items-center gap-1">
                            <Brain className="w-3 h-3" /> Tâm lý
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{proposerName}</td>
                      <td className="px-4 py-3 text-center text-slate-500 font-medium">{propDate}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={row.outcome || row.notes || "Hoàn thành bồi dưỡng"}>
                        {row.outcome || row.notes || "Hoàn thành bồi dưỡng"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.terminationStatus === "PENDING_TERMINATION" ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-bold text-[10px] inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Chờ duyệt
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-[10px] inline-flex items-center gap-1">
                            Đã duyệt kết thúc
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== BẢNG THỐNG KÊ CHI TIẾT THEO CƠ SỞ & KHỐI ===== */}
      <div className="bg-white border border-slate-200/60 rounded-2xl p-5 md:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Building2 className="h-4.5 w-4.5 text-[#00A99D]" />
              Thống kê Chi tiết theo Cơ sở & Khối lớp
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Số liệu chi tiết phân bổ học sinh theo dõi bồi dưỡng và phân công giảng dạy</p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl shadow-xxs">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50/75 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3 text-left">Cơ sở</th>
                <th className="px-5 py-3 text-left">Khối</th>
                <th className="px-5 py-3 text-center">Tổng số HS</th>
                <th className="px-5 py-3 text-center">Phụ đạo học tập</th>
                <th className="px-5 py-3 text-center">Hỗ trợ tâm lý</th>
                <th className="px-5 py-3 text-center">Đã phân công GV</th>
                <th className="px-5 py-3 text-center">Chưa phân công GV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-600 bg-white">
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

                const statsList = Object.values(statsMap).sort((a: any, b: any) => {
                  if (a.campusName !== b.campusName) return a.campusName.localeCompare(b.campusName);
                  return a.gradeName.localeCompare(b.gradeName);
                });

                if (statsList.length === 0) {
                  return (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400 font-bold">Không có dữ liệu thống kê</td>
                    </tr>
                  );
                }

                return statsList.map((row: any, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-800">{row.campusName}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-800">{row.gradeName}</td>
                    <td className="px-5 py-3.5 text-center font-extrabold text-indigo-700 text-sm">{row.total}</td>
                    <td className="px-5 py-3.5 text-center text-blue-600 font-bold">{row.academic}</td>
                    <td className="px-5 py-3.5 text-center text-violet-600 font-bold">{row.psychology}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-[10px]">
                        {row.assigned}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {row.unassigned > 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100 font-bold text-[10px]">
                          {row.unassigned}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
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
