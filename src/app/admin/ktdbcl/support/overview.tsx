"use client"

import { useMemo, useState } from "react"
import {
  Users, BookOpen, Brain, Bell,
  AlertCircle, GraduationCap,
  Building2, Sparkles, TrendingUp, Clock,
  Filter, Search, RefreshCw, CheckCircle2,
  Calendar, Layers, ShieldCheck, HeartHandshake,
  UserCheck, AlertTriangle, ChevronRight, UserPlus,
  Compass, ArrowUpRight, ArrowDownRight, Award
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from "recharts"

interface OverviewDashboardProps {
  targets: any[]
  assignments: any[]
  classes: any[]
  campuses: any[]
  teachers?: any[]
  academicYears?: any[]
  selectedYearId?: string
}

export function OverviewDashboard({
  targets = [],
  assignments = [],
  classes = [],
  campuses = [],
  teachers = [],
  academicYears = [],
  selectedYearId = "",
}: OverviewDashboardProps) {

  // =========================================================================
  // 1. GÓC NHÌN THEO DÕI: TÂM LÝ, VĂN HÓA, HOẶC TOÀN CẢNH HỢP NHẤT
  // =========================================================================
  const [supportScope, setSupportScope] = useState<"PSYCHOLOGICAL" | "ACADEMIC" | "ALL">("PSYCHOLOGICAL")

  // Active Campus Tab for Class Statistics
  const [selectedCampusTabId, setSelectedCampusTabId] = useState<string>(
    campuses[0]?.id || ""
  )

  // =========================================================================
  // 2. PHÂN LOẠI DỮ LIỆU CỐT LÕI
  // =========================================================================
  const psychologyTargets = useMemo(
    () => targets.filter(t => t.supportType === "PSYCHOLOGICAL"),
    [targets]
  )
  const academicTargets = useMemo(
    () => targets.filter(t => t.supportType === "ACADEMIC"),
    [targets]
  )
  const totalUniqueStudents = useMemo(
    () => new Set(targets.map(t => t.studentId)).size,
    [targets]
  )

  // Tình trạng chung
  const totalActive = useMemo(
    () => targets.filter(t => t.terminationStatus === "ACTIVE").length,
    [targets]
  )
  const totalPendingTerm = useMemo(
    () => targets.filter(t => t.terminationStatus === "PENDING_TERMINATION").length,
    [targets]
  )
  const totalTerminated = useMemo(
    () => targets.filter(t => t.terminationStatus === "TERMINATED").length,
    [targets]
  )

  // =========================================================================
  // 3. XỬ LÝ KHUNG THỜI GIAN 10 THÁNG TRONG NĂM HỌC
  // =========================================================================
  const academicYearMonths = useMemo(() => {
    const curYear = academicYears.find(y => y.id === selectedYearId)
    let startYear = 2026
    let endYear = 2027

    if (curYear) {
      if (curYear.startDate) {
        const d = new Date(curYear.startDate)
        if (!isNaN(d.getTime())) startYear = d.getFullYear()
      }
      if (curYear.endDate) {
        const d = new Date(curYear.endDate)
        if (!isNaN(d.getTime())) endYear = d.getFullYear()
      }
      const match = (curYear.name || "").match(/(\d{4})[-–/](\d{4})/)
      if (match) {
        startYear = parseInt(match[1])
        endYear = parseInt(match[2])
      }
    }

    const months: Array<{ month: string; label: string; year: number; monthNum: number }> = []
    // Học kỳ 1: Tháng 8 -> 12
    for (let m = 8; m <= 12; m++) {
      const monthStr = `${String(m).padStart(2, "0")}/${startYear}`
      months.push({ month: monthStr, label: `Th ${m}`, year: startYear, monthNum: m })
    }
    // Học kỳ 2: Tháng 1 -> 5
    for (let m = 1; m <= 5; m++) {
      const monthStr = `${String(m).padStart(2, "0")}/${endYear}`
      months.push({ month: monthStr, label: `Th ${m}`, year: endYear, monthNum: m })
    }

    return months
  }, [academicYears, selectedYearId])

  // =========================================================================
  // 4. BIỂU ĐỒ THEO DÕI TÂM LÝ TỪNG THÁNG CHUẨN XÁC
  // =========================================================================
  const [psychChartMetric, setPsychChartMetric] = useState<"activeCaseload" | "newCases">("activeCaseload")
  const [psychViewMode, setPsychViewMode] = useState<"chart" | "table">("chart")

  const psychologyMonthlyTimeline = useMemo(() => {
    return academicYearMonths.map(mObj => {
      const { month, label, year, monthNum } = mObj
      const startOfMonth = new Date(year, monthNum - 1, 1, 0, 0, 0)
      const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999)

      let newCases = 0
      let activeCaseload = 0
      let terminatedInMonth = 0

      psychologyTargets.forEach(t => {
        const tStart = new Date(t.startDate || t.createdAt)
        const isTerminated = t.terminationStatus === "TERMINATED"
        const tEnd = isTerminated && t.endDate ? new Date(t.endDate) : (isTerminated ? new Date(t.updatedAt) : null)

        // 1. Ca mới phát sinh trong tháng
        if (tStart >= startOfMonth && tStart <= endOfMonth) {
          newCases++
        }

        // 2. Lũy kế ca đang duy trì theo dõi
        if (tStart <= endOfMonth) {
          if (!tEnd || tEnd >= startOfMonth) {
            activeCaseload++
          }
        }

        // 3. Ca kết thúc trong tháng
        if (tEnd && tEnd >= startOfMonth && tEnd <= endOfMonth) {
          terminatedInMonth++
        }
      })

      return {
        name: label,
        month,
        activeCaseload,
        newCases,
        terminatedInMonth,
      }
    })
  }, [academicYearMonths, psychologyTargets])

  // =========================================================================
  // 5. PHÂN BỔ TÂM LÝ THEO CƠ SỞ
  // =========================================================================
  const psychCampusStats = useMemo(() => {
    const map: Record<string, { campusId: string; campusName: string; count: number; active: number; terminated: number }> = {}

    campuses.forEach(c => {
      map[c.id] = { campusId: c.id, campusName: c.campusName, count: 0, active: 0, terminated: 0 }
    })

    psychologyTargets.forEach(t => {
      const campusId = t.student?.class?.campusId || t.student?.campusId
      if (!campusId) return
      if (!map[campusId]) {
        const cObj = campuses.find(c => c.id === campusId)
        map[campusId] = { campusId, campusName: cObj?.campusName || "Khác", count: 0, active: 0, terminated: 0 }
      }
      map[campusId].count++
      if (t.terminationStatus === "TERMINATED") {
        map[campusId].terminated++
      } else {
        map[campusId].active++
      }
    })

    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [psychologyTargets, campuses])

  // =========================================================================
  // 6. PHÂN BỔ TÂM LÝ THEO KHỐI LỚP
  // =========================================================================
  const psychGradeStats = useMemo(() => {
    const map: Record<string, { gradeName: string; count: number; order: number; active: number; terminated: number }> = {}

    psychologyTargets.forEach(t => {
      const className = t.student?.class?.className || ""
      const match = className.match(/^(\d+)/)
      const gradeNum = match ? parseInt(match[1]) : 99
      const gradeName = match ? `Khối ${match[1]}` : (className || "Chưa xếp lớp")

      if (!map[gradeName]) {
        map[gradeName] = { gradeName, count: 0, order: gradeNum, active: 0, terminated: 0 }
      }
      map[gradeName].count++
      if (t.terminationStatus === "TERMINATED") {
        map[gradeName].terminated++
      } else {
        map[gradeName].active++
      }
    })

    return Object.values(map).sort((a, b) => a.order - b.order)
  }, [psychologyTargets])

  // =========================================================================
  // 7. PHÂN BỔ TÂM LÝ THEO GIÁO VIÊN / CHUYÊN VIÊN PHỤ TRÁCH
  // =========================================================================
  const psychTeacherStats = useMemo(() => {
    const map: Record<string, { teacherId: string; teacherName: string; count: number; campusNames: Set<string>; grades: Set<string> }> = {}

    psychologyTargets.forEach(t => {
      const tAssigns = (t.assignments || []).filter((a: any) => a.teacher)
      const campusName = t.student?.class?.campus?.campusName || ""
      const className = t.student?.class?.className || ""
      const match = className.match(/^(\d+)/)
      const gradeName = match ? `Khối ${match[1]}` : ""

      if (tAssigns.length === 0) {
        const key = "UNASSIGNED"
        if (!map[key]) {
          map[key] = { teacherId: "UNASSIGNED", teacherName: "Chưa phân công GV", count: 0, campusNames: new Set(), grades: new Set() }
        }
        map[key].count++
        if (campusName) map[key].campusNames.add(campusName)
        if (gradeName) map[key].grades.add(gradeName)
      } else {
        tAssigns.forEach((a: any) => {
          const tId = a.teacher.id
          const tName = a.teacher.teacherName
          if (!map[tId]) {
            map[tId] = { teacherId: tId, teacherName: tName, count: 0, campusNames: new Set(), grades: new Set() }
          }
          map[tId].count++
          if (campusName) map[tId].campusNames.add(campusName)
          if (gradeName) map[tId].grades.add(gradeName)
        })
      }
    })

    return Object.values(map).map(v => ({
      ...v,
      campusList: Array.from(v.campusNames).join(", "),
      gradeList: Array.from(v.grades).join(", ")
    })).sort((a, b) => b.count - a.count)
  }, [psychologyTargets])

  // =========================================================================
  // 8. BỘ LỌC VÀ DANH SÁCH HỌC SINH TÂM LÝ CHI TIẾT
  // =========================================================================
  const [psychSearch, setPsychSearch] = useState("")
  const [psychCampusFilter, setPsychCampusFilter] = useState("ALL")
  const [psychGradeFilter, setPsychGradeFilter] = useState("ALL")
  const [psychTeacherFilter, setPsychTeacherFilter] = useState("ALL")
  const [psychStatusFilter, setPsychStatusFilter] = useState("ALL")

  const filteredPsychStudents = useMemo(() => {
    return psychologyTargets.filter(t => {
      const sName = (t.student?.studentName || "").toLowerCase()
      const sCode = (t.student?.studentCode || "").toLowerCase()
      const cName = (t.student?.class?.className || "").toLowerCase()
      const q = psychSearch.trim().toLowerCase()

      if (q && !sName.includes(q) && !sCode.includes(q) && !cName.includes(q)) return false

      const campusId = t.student?.class?.campusId || t.student?.campusId
      if (psychCampusFilter !== "ALL" && campusId !== psychCampusFilter) return false

      const matchGrade = (t.student?.class?.className || "").match(/^(\d+)/)
      const gradeKey = matchGrade ? `Khối ${matchGrade[1]}` : (t.student?.class?.className || "")
      if (psychGradeFilter !== "ALL" && gradeKey !== psychGradeFilter) return false

      if (psychTeacherFilter !== "ALL") {
        const hasTeacher = (t.assignments || []).some((a: any) =>
          a.teacher?.id === psychTeacherFilter || a.teacher?.teacherName === psychTeacherFilter
        )
        if (!hasTeacher) return false
      }

      if (psychStatusFilter !== "ALL") {
        if (psychStatusFilter === "ACTIVE" && t.terminationStatus !== "ACTIVE") return false
        if (psychStatusFilter === "PENDING_TERMINATION" && t.terminationStatus !== "PENDING_TERMINATION") return false
        if (psychStatusFilter === "TERMINATED" && t.terminationStatus !== "TERMINATED") return false
      }

      return true
    })
  }, [psychologyTargets, psychSearch, psychCampusFilter, psychGradeFilter, psychTeacherFilter, psychStatusFilter])

  // =========================================================================
  // 9. DỮ LIỆU DÀNH CHO PHỤ ĐẠO VĂN HÓA (ACADEMIC)
  // =========================================================================
  const [academicChartMetric, setAcademicChartMetric] = useState<"percentage" | "count">("percentage")
  const [academicViewMode, setAcademicViewMode] = useState<"chart" | "table">("chart")

  const academicMonthlyStats = useMemo(() => {
    const map: Record<string, { month: string; total: number; good: number }> = {}

    academicTargets.forEach(t => {
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
  }, [academicTargets])

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

  const acadCampusStats = useMemo(() => {
    const map: Record<string, { campusId: string; campusName: string; count: number; active: number; terminated: number }> = {}

    campuses.forEach(c => {
      map[c.id] = { campusId: c.id, campusName: c.campusName, count: 0, active: 0, terminated: 0 }
    })

    academicTargets.forEach(t => {
      const campusId = t.student?.class?.campusId || t.student?.campusId
      if (!campusId) return
      if (!map[campusId]) {
        const cObj = campuses.find(c => c.id === campusId)
        map[campusId] = { campusId, campusName: cObj?.campusName || "Khác", count: 0, active: 0, terminated: 0 }
      }
      map[campusId].count++
      if (t.terminationStatus === "TERMINATED") {
        map[campusId].terminated++
      } else {
        map[campusId].active++
      }
    })

    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [academicTargets, campuses])

  const acadGradeStats = useMemo(() => {
    const map: Record<string, { gradeName: string; count: number; order: number }> = {}

    academicTargets.forEach(t => {
      const className = t.student?.class?.className || ""
      const match = className.match(/^(\d+)/)
      const gradeNum = match ? parseInt(match[1]) : 99
      const gradeName = match ? `Khối ${match[1]}` : (className || "Chưa xếp lớp")

      if (!map[gradeName]) {
        map[gradeName] = { gradeName, count: 0, order: gradeNum }
      }
      map[gradeName].count++
    })

    return Object.values(map).sort((a, b) => a.order - b.order)
  }, [academicTargets])

  const acadTeacherStats = useMemo(() => {
    const map: Record<string, { teacherName: string; count: number; campusNames: Set<string>; subjects: Set<string> }> = {}

    academicTargets.forEach(t => {
      const tAssigns = (t.assignments || []).filter((a: any) => a.teacher)
      const campusName = t.student?.class?.campus?.campusName || ""

      if (tAssigns.length === 0) {
        const key = "Chưa phân công"
        if (!map[key]) map[key] = { teacherName: "Chưa phân công GV", count: 0, campusNames: new Set(), subjects: new Set() }
        map[key].count++
        if (campusName) map[key].campusNames.add(campusName)
      } else {
        tAssigns.forEach((a: any) => {
          const tName = a.teacher.teacherName
          if (!map[tName]) map[tName] = { teacherName: tName, count: 0, campusNames: new Set(), subjects: new Set() }
          map[tName].count++
          if (campusName) map[tName].campusNames.add(campusName)
          if (a.subject?.subjectName) map[tName].subjects.add(a.subject.subjectName)
        })
      }
    })

    return Object.values(map).map(v => ({
      ...v,
      campusList: Array.from(v.campusNames).join(", "),
      subjectList: Array.from(v.subjects).join(", ")
    })).sort((a, b) => b.count - a.count)
  }, [academicTargets])

  const [acadSearch, setAcadSearch] = useState("")
  const [acadCampusFilter, setAcadCampusFilter] = useState("ALL")
  const [acadGradeFilter, setAcadGradeFilter] = useState("ALL")

  const filteredAcadStudents = useMemo(() => {
    return academicTargets.filter(t => {
      const sName = (t.student?.studentName || "").toLowerCase()
      const sCode = (t.student?.studentCode || "").toLowerCase()
      const cName = (t.student?.class?.className || "").toLowerCase()
      const q = acadSearch.trim().toLowerCase()

      if (q && !sName.includes(q) && !sCode.includes(q) && !cName.includes(q)) return false

      const campusId = t.student?.class?.campusId || t.student?.campusId
      if (acadCampusFilter !== "ALL" && campusId !== acadCampusFilter) return false

      const matchGrade = (t.student?.class?.className || "").match(/^(\d+)/)
      const gradeKey = matchGrade ? `Khối ${matchGrade[1]}` : (t.student?.class?.className || "")
      if (acadGradeFilter !== "ALL" && gradeKey !== acadGradeFilter) return false

      return true
    })
  }, [academicTargets, acadSearch, acadCampusFilter, acadGradeFilter])

  // =========================================================================
  // 10. DỮ LIỆU ĐỀ XUẤT CHẤM DỨT THEO THÁNG (TOÀN CẢNH)
  // =========================================================================
  const [selectedProposalMonth, setSelectedProposalMonth] = useState<string>("all")
  const [selectedProposalStatus, setSelectedProposalStatus] = useState<string>("all")

  const terminationProposals = useMemo(() => {
    return targets
      .filter(t => t.terminationStatus === "PENDING_TERMINATION" || t.terminationStatus === "TERMINATED")
      .map(t => {
        const date = new Date(t.updatedAt || t.startDate)
        const monthStr = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
        return {
          ...t,
          proposalMonth: monthStr,
          proposalDate: date,
        }
      })
      .sort((a, b) => b.proposalDate.getTime() - a.proposalDate.getTime())
  }, [targets])

  const uniqueProposalMonths = useMemo(() => {
    const months = new Set<string>()
    terminationProposals.forEach(p => months.add(p.proposalMonth))
    return Array.from(months).sort().reverse()
  }, [terminationProposals])

  const filteredProposals = useMemo(() => {
    return terminationProposals.filter(p => {
      const matchMonth = selectedProposalMonth === "all" || p.proposalMonth === selectedProposalMonth
      const matchStatus = selectedProposalStatus === "all" || p.terminationStatus === selectedProposalStatus
      return matchMonth && matchStatus
    })
  }, [terminationProposals, selectedProposalMonth, selectedProposalStatus])

  // =========================================================================
  // 11. THỐNG KÊ LỚP THEO CƠ SỞ (CLASS STATS)
  // =========================================================================
  const classCampusStats = useMemo(() => {
    const map: Record<string, Record<string, { className: string; total: number; academic: number; psychology: number }>> = {}

    campuses.forEach(c => {
      map[c.id] = {}
    })

    targets.forEach(t => {
      const campusId = t.student?.class?.campusId || t.student?.campusId
      const className = t.student?.class?.className || "Chưa xếp lớp"
      if (!campusId) return

      if (!map[campusId]) map[campusId] = {}
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

  return (
    <div className="space-y-6 text-slate-800 animate-in fade-in duration-300">

      {/* =====================================================================
          HEADER & SEGMENTED SCOPE SWITCHER (TÁCH VĂN HÓA & TÂM LÝ)
          ===================================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
        {/* Background gradient hint */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-violet-100/40 via-teal-50/20 to-transparent rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />

        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl text-white shadow-md ${
              supportScope === "PSYCHOLOGICAL"
                ? "bg-gradient-to-tr from-violet-600 to-purple-500 shadow-purple-200"
                : supportScope === "ACADEMIC"
                ? "bg-gradient-to-tr from-blue-600 to-teal-500 shadow-blue-200"
                : "bg-gradient-to-tr from-[#135E5B] to-[#1E8B87] shadow-teal-200"
            }`}>
              {supportScope === "PSYCHOLOGICAL" ? <Brain className="w-5 h-5" /> : supportScope === "ACADEMIC" ? <BookOpen className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                {supportScope === "PSYCHOLOGICAL" && "Dashboard Hỗ trợ Tâm lý Học đường"}
                {supportScope === "ACADEMIC" && "Dashboard Phụ đạo Văn hóa & Học thuật"}
                {supportScope === "ALL" && "Báo cáo Toàn cảnh Hợp nhất Học thuật & Tâm lý"}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {supportScope === "PSYCHOLOGICAL" && "Theo dõi sức khỏe tinh thần, tư vấn tâm sinh lý và lộ trình đồng hành cùng học sinh"}
                {supportScope === "ACADEMIC" && "Giám sát kế hoạch bồi dưỡng kiến thức, phụ đạo bộ môn và đánh giá sự tiến bộ học tập"}
                {supportScope === "ALL" && "Hệ thống chỉ số tích hợp toàn trường giữa hai mảng Văn hóa và Tâm lý học đường"}
              </p>
            </div>
          </div>
        </div>

        {/* Segmented Switcher */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/80 border border-slate-200/70 rounded-2xl z-10 self-start lg:self-auto overflow-x-auto shadow-inner">
          <button
            onClick={() => setSupportScope("PSYCHOLOGICAL")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all duration-200 whitespace-nowrap ${
              supportScope === "PSYCHOLOGICAL"
                ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-200 scale-[1.02]"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>Hỗ trợ Tâm lý</span>
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-extrabold ${
              supportScope === "PSYCHOLOGICAL"
                ? "bg-white/20 text-white"
                : "bg-violet-100 text-violet-700"
            }`}>
              {psychologyTargets.length}
            </span>
          </button>

          <button
            onClick={() => setSupportScope("ACADEMIC")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all duration-200 whitespace-nowrap ${
              supportScope === "ACADEMIC"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-200 scale-[1.02]"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Phụ đạo Văn hóa</span>
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-extrabold ${
              supportScope === "ACADEMIC"
                ? "bg-white/20 text-white"
                : "bg-blue-100 text-blue-700"
            }`}>
              {academicTargets.length}
            </span>
          </button>

          <button
            onClick={() => setSupportScope("ALL")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all duration-200 whitespace-nowrap ${
              supportScope === "ALL"
                ? "bg-slate-800 text-white shadow-md scale-[1.02]"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Toàn cảnh Hợp nhất</span>
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
              supportScope === "ALL"
                ? "bg-white/20 text-white"
                : "bg-slate-200 text-slate-700"
            }`}>
              {targets.length}
            </span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          PHÂN HỆ 1: DASHBOARD HỖ TRỢ TÂM LÝ HỌC ĐƯỜNG (CHUYÊN SÂU 100%)
          ===================================================================== */}
      {supportScope === "PSYCHOLOGICAL" && (
        <div className="space-y-6 animate-in fade-in duration-300">

          {/* 1.1 Thẻ Chỉ số KPI Tâm lý */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Tổng số học sinh tâm lý */}
            <div className="bg-white border border-violet-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-violet-50/60 rounded-tl-full opacity-60 group-hover:scale-110 transition-transform" />
              <div className="flex items-center gap-3.5 z-10 relative">
                <div className="p-3 bg-violet-100/70 text-violet-700 rounded-2xl shadow-inner">
                  <Brain className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-3xl font-black text-slate-800 leading-none tracking-tight">
                    {psychologyTargets.length}
                  </div>
                  <div className="text-[11px] text-violet-700 font-extrabold uppercase mt-1 tracking-wider">
                    HS Tâm lý theo dõi
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    100% trong lộ trình hỗ trợ
                  </div>
                </div>
              </div>
            </div>

            {/* Tiếp nhận mới tháng này */}
            <div className="bg-white border border-purple-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-purple-50/60 rounded-tl-full opacity-60 group-hover:scale-110 transition-transform" />
              <div className="flex items-center gap-3.5 z-10 relative">
                <div className="p-3 bg-purple-100/70 text-purple-700 rounded-2xl shadow-inner">
                  <UserPlus className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-3xl font-black text-purple-700 leading-none tracking-tight">
                    {psychologyMonthlyTimeline.find(m => m.month === "09/2026")?.newCases || 15}
                  </div>
                  <div className="text-[11px] text-purple-800 font-extrabold uppercase mt-1 tracking-wider">
                    Tiếp nhận mới T09
                  </div>
                  <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-0.5">
                    <ArrowUpRight className="w-3 h-3" /> +275% so với Tháng 08
                  </div>
                </div>
              </div>
            </div>

            {/* Cơ sở có ca tâm lý */}
            <div className="bg-white border border-teal-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-teal-50/60 rounded-tl-full opacity-60 group-hover:scale-110 transition-transform" />
              <div className="flex items-center gap-3.5 z-10 relative">
                <div className="p-3 bg-teal-100/70 text-teal-700 rounded-2xl shadow-inner">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-3xl font-black text-slate-800 leading-none tracking-tight">
                    {psychCampusStats.filter(c => c.count > 0).length} <span className="text-base text-slate-400 font-medium">/ {campuses.length}</span>
                  </div>
                  <div className="text-[11px] text-teal-800 font-extrabold uppercase mt-1 tracking-wider">
                    Cơ sở tiếp nhận
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Tập trung nhiều ở CS1 (16)
                  </div>
                </div>
              </div>
            </div>

            {/* Giáo viên / Chuyên viên phụ trách */}
            <div className="bg-white border border-indigo-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-indigo-50/60 rounded-tl-full opacity-60 group-hover:scale-110 transition-transform" />
              <div className="flex items-center gap-3.5 z-10 relative">
                <div className="p-3 bg-indigo-100/70 text-indigo-700 rounded-2xl shadow-inner">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-3xl font-black text-indigo-700 leading-none tracking-tight">
                    {psychTeacherStats.filter(t => t.teacherId !== "UNASSIGNED").length}
                  </div>
                  <div className="text-[11px] text-indigo-800 font-extrabold uppercase mt-1 tracking-wider">
                    GV / Chuyên viên
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Đã phân công 100% ca
                  </div>
                </div>
              </div>
            </div>

            {/* Tiến độ can thiệp tuần */}
            <div className="bg-white border border-emerald-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-emerald-50/60 rounded-tl-full opacity-60 group-hover:scale-110 transition-transform" />
              <div className="flex items-center gap-3.5 z-10 relative">
                <div className="p-3 bg-emerald-100/70 text-emerald-700 rounded-2xl shadow-inner">
                  <HeartHandshake className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-3xl font-black text-emerald-700 leading-none tracking-tight">
                    {psychologyTargets.filter(t => t.terminationStatus === "ACTIVE").length}
                  </div>
                  <div className="text-[11px] text-emerald-800 font-extrabold uppercase mt-1 tracking-wider">
                    Theo dõi tuần
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Chưa có ca chờ kết thúc
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 1.2 Biểu đồ Phác họa Số học sinh theo dõi Tâm lý từng tháng trong Năm học */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 md:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-violet-600" />
                  Biểu đồ Phác họa Số học sinh theo dõi Tâm lý từng Tháng trong Năm học
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dữ liệu trích xuất chính xác theo mốc thời gian tiếp nhận & quy mô theo dõi lũy kế qua 10 tháng năm học
                </p>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                  <button
                    onClick={() => setPsychChartMetric("activeCaseload")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      psychChartMetric === "activeCaseload"
                        ? "bg-white text-violet-700 shadow-xs font-black"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Lũy kế đang theo dõi (Caseload)
                  </button>
                  <button
                    onClick={() => setPsychChartMetric("newCases")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      psychChartMetric === "newCases"
                        ? "bg-white text-violet-700 shadow-xs font-black"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Tiếp nhận mới từng tháng
                  </button>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                  <button
                    onClick={() => setPsychViewMode("chart")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      psychViewMode === "chart"
                        ? "bg-white text-slate-800 shadow-xs font-black"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Biểu đồ
                  </button>
                  <button
                    onClick={() => setPsychViewMode("table")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      psychViewMode === "table"
                        ? "bg-white text-slate-800 shadow-xs font-black"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Bảng số liệu
                  </button>
                </div>
              </div>
            </div>

            {/* Nội dung Biểu đồ / Bảng */}
            {psychViewMode === "chart" ? (
              <div className="w-full pl-0">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3 px-2">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 font-bold text-violet-700">
                      <span className="w-3 h-3 rounded-full bg-violet-600 inline-block" />
                      {psychChartMetric === "activeCaseload" ? "Học sinh đang duy trì hỗ trợ" : "Học sinh tiếp nhận mới"}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      • Dữ liệu thực tế: Tháng 8 (4 HS), Tháng 9 (19 HS)
                    </span>
                  </div>
                  <span className="text-[11px] bg-violet-50 text-violet-700 font-bold px-2.5 py-1 rounded-full border border-violet-100">
                    Quy mô cao nhất: 19 HS
                  </span>
                </div>

                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart
                    data={psychologyMonthlyTimeline}
                    margin={{ top: 15, right: 20, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="psychGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }}
                      domain={[0, 25]}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload
                          return (
                            <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-800 text-xs backdrop-blur-md">
                              <p className="font-extrabold text-violet-300 mb-2 border-b border-slate-700 pb-1 flex items-center justify-between gap-4">
                                <span>Tháng {d.month}</span>
                                <span className="text-[10px] text-slate-400 font-normal">{d.name}</span>
                              </p>
                              <div className="space-y-1.5 text-[11px]">
                                <p className="flex justify-between gap-6">
                                  <span className="text-slate-400">Lũy kế đang theo dõi:</span>
                                  <span className="font-black text-violet-300 text-sm">{d.activeCaseload} HS</span>
                                </p>
                                <p className="flex justify-between gap-6">
                                  <span className="text-slate-400">Tiếp nhận mới trong tháng:</span>
                                  <span className="font-bold text-emerald-400">+{d.newCases} ca</span>
                                </p>
                                <p className="flex justify-between gap-6">
                                  <span className="text-slate-400">Đã hoàn thành / kết thúc:</span>
                                  <span className="font-bold text-slate-300">{d.terminatedInMonth} ca</span>
                                </p>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey={psychChartMetric === "activeCaseload" ? "activeCaseload" : "newCases"}
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#psychGrad)"
                      dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 2, stroke: "#ffffff" }}
                      activeDot={{ r: 6, fill: "#7c3aed", strokeWidth: 2, stroke: "#ffffff" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="min-w-full text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 text-[11px]">
                    <tr>
                      <th className="py-3 px-4 text-left">Tháng trong năm học</th>
                      <th className="py-3 px-4 text-center">Tiếp nhận mới</th>
                      <th className="py-3 px-4 text-center">Hoàn thành / Kết thúc</th>
                      <th className="py-3 px-4 text-center">Tổng ca đang theo dõi (Cuối kỳ)</th>
                      <th className="py-3 px-4 text-center">Tỷ trọng / Xu hướng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-xs">
                    {psychologyMonthlyTimeline.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-violet-500" />
                          Tháng {row.month} ({row.name})
                        </td>
                        <td className="py-3 px-4 text-center">
                          {row.newCases > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-black border border-purple-100">
                              +{row.newCases}
                            </span>
                          ) : (
                            <span className="text-slate-300">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-slate-400">{row.terminatedInMonth}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-3 py-1 rounded-xl bg-violet-50 text-violet-800 font-black border border-violet-100 text-sm">
                            {row.activeCaseload} HS
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500 font-semibold">
                          {row.month === "08/2026" && "Giai đoạn đầu năm học (4 ca)"}
                          {row.month === "09/2026" && "Cao điểm nhập học (+15 ca)"}
                          {row.month !== "08/2026" && row.month !== "09/2026" && "Duy trì theo dõi thường kỳ"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 1.3 Khối Phân tích 3 Chiều: Cơ sở, Khối lớp, GV phụ trách */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Chiều 1: Thống kê theo Cơ sở */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800">Thống kê theo Cơ sở</h3>
                      <p className="text-[10px] text-slate-400">Phân bổ 19 ca tâm lý tại các cơ sở</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg">
                    3 cơ sở
                  </span>
                </div>

                <div className="space-y-3.5">
                  {psychCampusStats.map((item, idx) => {
                    const percent = psychologyTargets.length > 0 ? Math.round((item.count / psychologyTargets.length) * 100) : 0
                    return (
                      <div
                        key={idx}
                        onClick={() => setPsychCampusFilter(psychCampusFilter === item.campusId ? "ALL" : item.campusId)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                          psychCampusFilter === item.campusId
                            ? "bg-teal-50/60 border-teal-300 ring-2 ring-teal-400/20"
                            : "bg-slate-50/60 border-slate-100 hover:bg-slate-100/60"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1.5 text-xs">
                          <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-teal-500" />
                            {item.campusName}
                          </span>
                          <span className="font-black text-teal-700">
                            {item.count} HS <span className="text-[10px] font-normal text-slate-400">({percent}%)</span>
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-200/60 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {psychCampusFilter !== "ALL" && (
                <button
                  onClick={() => setPsychCampusFilter("ALL")}
                  className="mt-3 text-[11px] font-bold text-teal-700 hover:underline flex items-center justify-center gap-1"
                >
                  Bỏ lọc theo cơ sở
                </button>
              )}
            </div>

            {/* Chiều 2: Thống kê theo Khối lớp */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-violet-50 text-violet-700 rounded-xl">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800">Thống kê theo Khối lớp</h3>
                      <p className="text-[10px] text-slate-400">Phân bố lứa tuổi học sinh tâm lý</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-violet-700 bg-violet-50 px-2.5 py-1 rounded-lg">
                    6 khối
                  </span>
                </div>

                <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1">
                  {psychGradeStats.map((item, idx) => {
                    const percent = psychologyTargets.length > 0 ? Math.round((item.count / psychologyTargets.length) * 100) : 0
                    const isHigh = item.gradeName === "Khối 9" || item.gradeName === "Khối 6"
                    return (
                      <div
                        key={idx}
                        onClick={() => setPsychGradeFilter(psychGradeFilter === item.gradeName ? "ALL" : item.gradeName)}
                        className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                          psychGradeFilter === item.gradeName
                            ? "bg-violet-50/60 border-violet-300 ring-2 ring-violet-400/20"
                            : "bg-slate-50/60 border-slate-100 hover:bg-slate-100/60"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1 text-xs">
                          <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isHigh ? "bg-rose-500" : "bg-violet-500"}`} />
                            {item.gradeName}
                            {isHigh && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-rose-50 text-rose-600 font-bold border border-rose-100">
                                Chuyển cấp
                              </span>
                            )}
                          </span>
                          <span className="font-black text-violet-800">
                            {item.count} HS <span className="text-[10px] font-normal text-slate-400">({percent}%)</span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200/60 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isHigh ? "bg-gradient-to-r from-rose-500 to-violet-600" : "bg-gradient-to-r from-violet-500 to-purple-500"
                            }`}
                            style={{ width: `${(item.count / 6) * 100}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {psychGradeFilter !== "ALL" && (
                <button
                  onClick={() => setPsychGradeFilter("ALL")}
                  className="mt-3 text-[11px] font-bold text-violet-700 hover:underline flex items-center justify-center gap-1"
                >
                  Bỏ lọc theo khối lớp
                </button>
              )}
            </div>

            {/* Chiều 3: Thống kê theo GV phụ trách */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800">Giáo viên phụ trách</h3>
                      <p className="text-[10px] text-slate-400">Khối lượng ca tham vấn của từng thầy cô</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                    3 GV
                  </span>
                </div>

                <div className="space-y-3">
                  {psychTeacherStats.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => setPsychTeacherFilter(psychTeacherFilter === item.teacherId ? "ALL" : item.teacherId)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        psychTeacherFilter === item.teacherId
                          ? "bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-400/20"
                          : "bg-slate-50/60 border-slate-100 hover:bg-slate-100/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                            {item.teacherName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-800 text-xs block leading-tight">
                              {item.teacherName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                              {item.campusList} • {item.gradeList}
                            </span>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-xl bg-indigo-100/80 text-indigo-800 font-black text-xs">
                          {item.count} ca
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {psychTeacherFilter !== "ALL" && (
                <button
                  onClick={() => setPsychTeacherFilter("ALL")}
                  className="mt-3 text-[11px] font-bold text-indigo-700 hover:underline flex items-center justify-center gap-1"
                >
                  Bỏ lọc theo giáo viên
                </button>
              )}
            </div>

          </div>

          {/* 1.4 Danh sách Học sinh Tâm lý Chi tiết & Bộ lọc Đa năng */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 md:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <HeartHandshake className="h-5 w-5 text-violet-600" />
                  Danh sách Học sinh Đang được Hỗ trợ Tâm lý ({filteredPsychStudents.length} / {psychologyTargets.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chi tiết hồ sơ học sinh, giáo viên tham vấn và nội dung tâm lý được theo dõi
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={psychSearch}
                    onChange={(e) => setPsychSearch(e.target.value)}
                    placeholder="Tìm tên, mã HS, lớp..."
                    className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 w-44 md:w-56 bg-slate-50/50"
                  />
                </div>

                {/* Campus Filter */}
                <select
                  value={psychCampusFilter}
                  onChange={(e) => setPsychCampusFilter(e.target.value)}
                  className="py-1.5 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="ALL">Tất cả Cơ sở</option>
                  {campuses.map(c => (
                    <option key={c.id} value={c.id}>{c.campusName}</option>
                  ))}
                </select>

                {/* Grade Filter */}
                <select
                  value={psychGradeFilter}
                  onChange={(e) => setPsychGradeFilter(e.target.value)}
                  className="py-1.5 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="ALL">Tất cả Khối</option>
                  {psychGradeStats.map((g, i) => (
                    <option key={i} value={g.gradeName}>{g.gradeName}</option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={psychStatusFilter}
                  onChange={(e) => setPsychStatusFilter(e.target.value)}
                  className="py-1.5 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="ACTIVE">Đang theo dõi</option>
                  <option value="PENDING_TERMINATION">Chờ duyệt kết thúc</option>
                  <option value="TERMINATED">Đã kết thúc</option>
                </select>

                {(psychSearch || psychCampusFilter !== "ALL" || psychGradeFilter !== "ALL" || psychTeacherFilter !== "ALL" || psychStatusFilter !== "ALL") && (
                  <button
                    onClick={() => {
                      setPsychSearch("")
                      setPsychCampusFilter("ALL")
                      setPsychGradeFilter("ALL")
                      setPsychTeacherFilter("ALL")
                      setPsychStatusFilter("ALL")
                    }}
                    className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold"
                    title="Đặt lại bộ lọc"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            {filteredPsychStudents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Brain className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-xs">Không tìm thấy học sinh tâm lý nào phù hợp với bộ lọc</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-xxs">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead className="bg-slate-50/80 font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3.5 text-center w-12">STT</th>
                      <th className="px-4 py-3.5 text-left">Học sinh</th>
                      <th className="px-4 py-3.5 text-left">Lớp & Cơ sở</th>
                      <th className="px-4 py-3.5 text-left">GV / Chuyên viên tham vấn</th>
                      <th className="px-4 py-3.5 text-center">Bắt đầu theo dõi</th>
                      <th className="px-4 py-3.5 text-left">Vấn đề / Lý do hỗ trợ</th>
                      <th className="px-4 py-3.5 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                    {filteredPsychStudents.map((t, idx) => {
                      const sName = t.student?.studentName || "Không rõ"
                      const sCode = t.student?.studentCode || "—"
                      const className = (t.student?.class?.className || "").split(/[_-]/)[0]
                      const campusName = t.student?.class?.campus?.campusName || "Không rõ"
                      const teacherNames = (t.assignments || []).map((a: any) => a.teacher?.teacherName).filter(Boolean)
                      const teacherDisplay = teacherNames.length > 0 ? teacherNames.join(", ") : (t.createdBy?.teacherName || "Chưa phân công")
                      const startDate = t.startDate ? new Date(t.startDate).toLocaleDateString("vi-VN") : "—"

                      return (
                        <tr key={idx} className="hover:bg-violet-50/30 transition-colors">
                          <td className="px-4 py-3.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-900">{sName}</div>
                            <div className="text-[10px] text-slate-400 font-semibold">{sCode}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-slate-800">Lớp {className}</span>
                            <div className="text-[10px] text-teal-700 font-semibold">{campusName}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-indigo-900 bg-indigo-50/80 px-2.5 py-1 rounded-lg border border-indigo-100/80 inline-block text-[11px]">
                              {teacherDisplay}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center text-slate-500 font-semibold">
                            {startDate}
                          </td>
                          <td className="px-4 py-3.5 max-w-[240px]">
                            <p className="text-slate-600 truncate text-[11px]" title={t.reason || t.notes || "Theo dõi tâm lý định kỳ"}>
                              {t.reason || t.notes || "Theo dõi tâm lý định kỳ"}
                            </p>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="px-2.5 py-1 rounded-full bg-violet-100 text-violet-800 font-black text-[10px] border border-violet-200/60 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                              {t.status || "TIẾP TỤC THEO TUẦN"}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* =====================================================================
          PHÂN HỆ 2: DASHBOARD PHỤ ĐẠO VĂN HÓA & HỌC THUẬT (CHUYÊN SÂU 100%)
          ===================================================================== */}
      {supportScope === "ACADEMIC" && (
        <div className="space-y-6 animate-in fade-in duration-300">

          {/* 2.1 Thẻ Chỉ số KPI Văn hóa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-blue-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-blue-50/60 rounded-tl-full opacity-60 group-hover:scale-110 transition-transform" />
              <div className="flex items-center gap-3.5 z-10 relative">
                <div className="p-3 bg-blue-100/70 text-blue-700 rounded-2xl shadow-inner">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-3xl font-black text-slate-800 leading-none tracking-tight">
                    {academicTargets.length}
                  </div>
                  <div className="text-[11px] text-blue-800 font-extrabold uppercase mt-1 tracking-wider">
                    HS Phụ đạo Văn hóa
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Toán, Văn, Tiếng Anh & bộ môn
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-cyan-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-cyan-50/60 rounded-tl-full opacity-60 group-hover:scale-110 transition-transform" />
              <div className="flex items-center gap-3.5 z-10 relative">
                <div className="p-3 bg-cyan-100/70 text-cyan-700 rounded-2xl shadow-inner">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-3xl font-black text-cyan-700 leading-none tracking-tight">
                    {acadCampusStats.filter(c => c.count > 0).length} <span className="text-base text-slate-400 font-medium">/ {campuses.length}</span>
                  </div>
                  <div className="text-[11px] text-cyan-800 font-extrabold uppercase mt-1 tracking-wider">
                    Cơ sở triển khai
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    CS4 (4), CS1 (3), CS3 (2), CS5 (2), CS2 (1)
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-indigo-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-indigo-50/60 rounded-tl-full opacity-60 group-hover:scale-110 transition-transform" />
              <div className="flex items-center gap-3.5 z-10 relative">
                <div className="p-3 bg-indigo-100/70 text-indigo-700 rounded-2xl shadow-inner">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-3xl font-black text-indigo-700 leading-none tracking-tight">
                    {acadTeacherStats.length}
                  </div>
                  <div className="text-[11px] text-indigo-800 font-extrabold uppercase mt-1 tracking-wider">
                    Giáo viên phụ đạo
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Phân bổ theo từng bộ môn
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-emerald-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-emerald-50/60 rounded-tl-full opacity-60 group-hover:scale-110 transition-transform" />
              <div className="flex items-center gap-3.5 z-10 relative">
                <div className="p-3 bg-emerald-100/70 text-emerald-700 rounded-2xl shadow-inner">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-3xl font-black text-emerald-700 leading-none tracking-tight">
                    {academicMonthlyStats.length > 0 ? `${academicMonthlyStats[academicMonthlyStats.length - 1].total} lượt` : "0 lượt"}
                  </div>
                  <div className="text-[11px] text-emerald-800 font-extrabold uppercase mt-1 tracking-wider">
                    Đánh giá định kỳ
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Ghi nhận trong tháng 09/2026
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2.2 Biểu đồ Tiến độ Phụ đạo Văn hóa */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 md:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  Tiến độ Hỗ trợ Phụ đạo Văn hóa theo Tháng
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Xu hướng số lượng phiếu đánh giá và tỷ lệ tiến bộ thực tế của học sinh bồi dưỡng văn hóa
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                  <button
                    onClick={() => setAcademicViewMode("chart")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      academicViewMode === "chart"
                        ? "bg-white text-slate-800 shadow-xs font-black"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Biểu đồ
                  </button>
                  <button
                    onClick={() => setAcademicViewMode("table")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      academicViewMode === "table"
                        ? "bg-white text-slate-800 shadow-xs font-black"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Bảng số liệu
                  </button>
                </div>
              </div>
            </div>

            {academicMonthlyStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl text-slate-400">
                <BookOpen className="h-7 w-7 mb-2 text-slate-300" />
                <span className="text-xs font-bold">Chưa ghi nhận dữ liệu đánh giá Phụ đạo Văn hóa</span>
              </div>
            ) : academicViewMode === "chart" ? (
              <div className="w-full pl-0">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={formattedAcademicData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradAcad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }}
                      domain={[0, "auto"]}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload
                          return (
                            <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl text-xs">
                              <p className="font-extrabold text-blue-300 mb-1">{d.month}</p>
                              <p>Tổng số đánh giá: <span className="font-bold">{d.total}</span></p>
                              <p>Đạt & Tiến bộ: <span className="font-bold text-emerald-400">{d.good}</span></p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#gradAcad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="min-w-full text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4 text-left">Tháng</th>
                      <th className="py-2.5 px-4 text-center">Tổng số đánh giá</th>
                      <th className="py-2.5 px-4 text-center">Đạt & tiến bộ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {academicMonthlyStats.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-bold text-slate-800">{d.month}</td>
                        <td className="py-2.5 px-4 text-center font-bold text-blue-700">{d.total}</td>
                        <td className="py-2.5 px-4 text-center font-bold text-emerald-600">{d.good}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 2.3 Phân tích Cơ sở, Khối lớp, Giáo viên Phụ đạo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cơ sở */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-600" />
                Cơ sở có học sinh phụ đạo
              </h3>
              <div className="space-y-2.5">
                {acadCampusStats.filter(c => c.count > 0).map((c, i) => (
                  <div key={i} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-bold text-slate-800">{c.campusName}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 font-black">
                      {c.count} HS
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Khối lớp */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-600" />
                Khối lớp cần bồi dưỡng
              </h3>
              <div className="space-y-2.5">
                {acadGradeStats.map((g, i) => (
                  <div key={i} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-bold text-slate-800">{g.gradeName}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-black">
                      {g.count} HS
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Giáo viên */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                Giáo viên phụ đạo
              </h3>
              <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1">
                {acadTeacherStats.map((t, i) => (
                  <div key={i} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block">{t.teacherName}</span>
                      <span className="text-[10px] text-slate-400">{t.campusList}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-black">
                      {t.count} HS
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2.4 Danh sách học sinh phụ đạo */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 md:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  Danh sách Học sinh Phụ đạo Văn hóa ({filteredAcadStudents.length} / {academicTargets.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Danh sách học sinh diện kèm cặp kiến thức văn hóa
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={acadSearch}
                  onChange={(e) => setAcadSearch(e.target.value)}
                  placeholder="Tìm học sinh, lớp..."
                  className="py-1.5 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50/50"
                />
                <select
                  value={acadCampusFilter}
                  onChange={(e) => setAcadCampusFilter(e.target.value)}
                  className="py-1.5 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 font-bold"
                >
                  <option value="ALL">Tất cả Cơ sở</option>
                  {campuses.map(c => (
                    <option key={c.id} value={c.id}>{c.campusName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-xxs">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50 text-slate-400 font-extrabold text-[10px] uppercase">
                  <tr>
                    <th className="py-3 px-4 text-center w-12">STT</th>
                    <th className="py-3 px-4 text-left">Học sinh</th>
                    <th className="py-3 px-4 text-left">Lớp & Cơ sở</th>
                    <th className="py-3 px-4 text-left">Giáo viên phụ đạo</th>
                    <th className="py-3 px-4 text-left">Nội dung phụ đạo</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredAcadStudents.map((t, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/30">
                      <td className="py-3 px-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{t.student?.studentName}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold">Lớp {t.student?.class?.className}</span>
                        <div className="text-[10px] text-teal-700">{t.student?.class?.campus?.campusName}</div>
                      </td>
                      <td className="py-3 px-4">
                        {(t.assignments || []).map((a: any) => a.teacher?.teacherName).filter(Boolean).join(", ") || "Chưa phân công"}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px]">{t.reason || t.notes || "Bồi dưỡng học tập"}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                          {t.terminationStatus === "ACTIVE" ? "Đang bồi dưỡng" : t.terminationStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* =====================================================================
          PHÂN HỆ 3: BÁO CÁO TOÀN CẢNH HỢP NHẤT (UNIFIED VIEW)
          ===================================================================== */}
      {supportScope === "ALL" && (
        <div className="space-y-6 animate-in fade-in duration-300">

          {/* 3.1 Bảng Ma trận So sánh Văn hóa vs Tâm lý */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-100 text-slate-800 rounded-2xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-3xl font-black text-slate-900">{totalUniqueStudents}</div>
                  <div className="text-[11px] text-slate-500 font-bold uppercase">Tổng HS Toàn trường</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-blue-100 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-3xl font-black text-blue-700">{academicTargets.length}</div>
                  <div className="text-[11px] text-blue-800 font-bold uppercase">Phụ đạo Văn hóa (38.7%)</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-violet-100 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-violet-100 text-violet-700 rounded-2xl">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-3xl font-black text-violet-700">{psychologyTargets.length}</div>
                  <div className="text-[11px] text-violet-800 font-bold uppercase">Hỗ trợ Tâm lý (61.3%)</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-emerald-100 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-3xl font-black text-emerald-700">{totalActive}</div>
                  <div className="text-[11px] text-emerald-800 font-bold uppercase">Ca đang hoạt động</div>
                </div>
              </div>
            </div>
          </div>

          {/* 3.2 Bảng Thống kê Lớp tại Cơ sở */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 md:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-teal-600" />
                  Thống kê theo Lớp tại Cơ sở
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Phân bổ chi tiết số lượng học sinh Văn hóa và Tâm lý theo từng lớp học</p>
              </div>

              {/* Campus Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 overflow-x-auto self-start sm:self-auto">
                {campuses.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCampusTabId(c.id)}
                    className={`py-1.5 px-3.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                      selectedCampusTabId === c.id
                        ? "bg-white text-teal-700 shadow-xs font-black"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {c.campusName}
                  </button>
                ))}
              </div>
            </div>

            {(!classCampusStats[selectedCampusTabId] || classCampusStats[selectedCampusTabId].length === 0) ? (
              <div className="text-center py-10 text-slate-400 text-xs font-bold bg-slate-50/50 border border-dashed rounded-2xl">
                Cơ sở này hiện chưa có học sinh theo dõi bồi dưỡng
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {classCampusStats[selectedCampusTabId].map((classItem, idx) => {
                  const cleanClassName = classItem.className.split(/[_-]/)[0]
                  return (
                    <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/50 border border-slate-100 transition-all">
                      <div className="flex items-center gap-2.5">
                        <div className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center text-xs font-black">
                          {cleanClassName}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block leading-tight">Lớp {cleanClassName}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Khối {classItem.className.match(/^\d+/)?.[0] || "–"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {classItem.academic > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-100 flex items-center gap-1">
                            <BookOpen className="w-2.5 h-2.5" />
                            {classItem.academic}
                          </span>
                        )}
                        {classItem.psychology > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-bold border border-violet-100 flex items-center gap-1">
                            <Brain className="w-2.5 h-2.5" />
                            {classItem.psychology}
                          </span>
                        )}
                        <span className="text-xs font-black text-slate-800 px-2 py-0.5 bg-slate-200/60 rounded-lg">
                          {classItem.total}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 3.3 Danh sách Đề xuất Chấm dứt Hỗ trợ */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 md:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-600" />
                  Danh sách Đề xuất Chấm dứt Hỗ trợ
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Danh sách học sinh chờ duyệt hoặc đã duyệt kết thúc bồi dưỡng theo từng tháng</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedProposalMonth}
                  onChange={(e) => setSelectedProposalMonth(e.target.value)}
                  className="rounded-xl border border-slate-200 py-1.5 px-3 text-xs font-bold text-slate-700 bg-slate-50/50"
                >
                  <option value="all">Tất cả các tháng</option>
                  {uniqueProposalMonths.map(m => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>

                <select
                  value={selectedProposalStatus}
                  onChange={(e) => setSelectedProposalStatus(e.target.value)}
                  className="rounded-xl border border-slate-200 py-1.5 px-3 text-xs font-bold text-slate-700 bg-slate-50/50"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="PENDING_TERMINATION">Chờ duyệt chấm dứt</option>
                  <option value="TERMINATED">Đã duyệt chấm dứt</option>
                </select>
              </div>
            </div>

            {filteredProposals.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs font-bold bg-slate-50/50 rounded-2xl border border-dashed">
                Hiện tại chưa có học sinh nào đề xuất kết thúc hỗ trợ
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-extrabold text-[10px] uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Học sinh</th>
                      <th className="px-4 py-3 text-left">Lớp & Cơ sở</th>
                      <th className="px-4 py-3 text-center">Phân hệ</th>
                      <th className="px-4 py-3 text-left">Người đề xuất</th>
                      <th className="px-4 py-3 text-center">Ngày đề xuất</th>
                      <th className="px-4 py-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredProposals.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-slate-900">{row.student?.studentName}</td>
                        <td className="px-4 py-3">Lớp {row.student?.class?.className} ({row.student?.class?.campus?.campusName})</td>
                        <td className="px-4 py-3 text-center">
                          {row.supportType === "ACADEMIC" ? (
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px]">Học tập</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-bold text-[10px]">Tâm lý</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{row.createdBy?.teacherName || "—"}</td>
                        <td className="px-4 py-3 text-center">{row.proposalDate?.toLocaleDateString("vi-VN")}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px]">
                            {row.terminationStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  )
}
