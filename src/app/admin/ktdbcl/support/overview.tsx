"use client"

import { useMemo, useState, useEffect } from "react"
import {
  Users, BookOpen, Brain, Bell,
  AlertCircle, GraduationCap,
  Building2, Sparkles, TrendingUp, Clock,
  Filter, Search, RefreshCw, CheckCircle2,
  Calendar, Layers, ShieldCheck, HeartHandshake,
  UserCheck, AlertTriangle, ChevronRight, ChevronLeft, UserPlus,
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
  Cell,
  LabelList
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
  // 3.1 HELPER: NHẬN DIỆN HỌC SINH CAM KẾT VỀ TÂM LÝ
  // =========================================================================
  const isPsychCommitment = (t: any): boolean => {
    if (!t) return false
    if (t.hasPsychCommitment) return true
    if (Array.isArray(t.commitmentSubjects) && t.commitmentSubjects.some((s: string) => /tâm lý|tam ly|psychology|tâm lí/i.test(s))) return true
    const note = (t.notes || "").toLowerCase()
    const reason = (t.reason || "").toLowerCase()
    if (note.includes("cam kết") && (note.includes("tâm lý") || note.includes("tam ly") || note.includes("tâm lí"))) return true
    if (reason.includes("cam kết") && (reason.includes("tâm lý") || reason.includes("tam ly") || reason.includes("tâm lí"))) return true
    if (t.sourceType === "ADMISSION" && (note.includes("tâm lý") || reason.includes("tâm lý") || t.supportType === "PSYCHOLOGICAL")) return true
    if (t.assessmentDirectorNote && /tâm lý|tam ly|tâm lí|psychology/i.test(t.assessmentDirectorNote) && /cam kết|cam ket|theo dõi|lưu ý|yêu cầu/i.test(t.assessmentDirectorNote)) return true
    return false
  }

  // Thống kê tổng quan nhóm Cam kết Tâm lý
  const psychCommitmentTargets = useMemo(() => {
    return psychologyTargets.filter(isPsychCommitment)
  }, [psychologyTargets])

  const psychCommitmentActive = useMemo(() => {
    return psychCommitmentTargets.filter(t => t.terminationStatus === "ACTIVE").length
  }, [psychCommitmentTargets])

  const psychCommitmentTerminated = useMemo(() => {
    return psychCommitmentTargets.filter(t => t.terminationStatus === "TERMINATED").length
  }, [psychCommitmentTargets])

  // Thống kê ca đang theo dõi & đã chấm dứt
  const totalActivePsych = useMemo(() => {
    return psychologyTargets.filter(t => t.terminationStatus === "ACTIVE").length
  }, [psychologyTargets])

  const totalTerminatedPsych = useMemo(() => {
    return psychologyTargets.filter(t => t.terminationStatus === "TERMINATED").length
  }, [psychologyTargets])

  // =========================================================================
  // 4. BIỂU ĐỒ THEO DÕI TÂM LÝ TỪNG THÁNG CHUẨN XÁC & CHẤM DỨT THEO DÕI THEO THÁNG
  // =========================================================================
  const [psychChartMetric, setPsychChartMetric] = useState<"comparison" | "activeCaseload" | "newCases" | "terminated">("comparison")
  const [psychViewMode, setPsychViewMode] = useState<"chart" | "table">("chart")

  const psychologyMonthlyTimeline = useMemo(() => {
    return academicYearMonths.map(mObj => {
      const { month, label, year, monthNum } = mObj
      const startOfMonth = new Date(year, monthNum - 1, 1, 0, 0, 0)
      const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999)

      let newCases = 0
      let activeCaseload = 0
      let terminatedInMonth = 0
      let commitmentCases = 0
      let newCommitments = 0
      let terminatedCommitment = 0

      psychologyTargets.forEach(t => {
        const tStart = new Date(t.startDate || t.createdAt)
        const isTerminated = t.terminationStatus === "TERMINATED"
        const tEnd = isTerminated && t.endDate ? new Date(t.endDate) : (isTerminated ? new Date(t.updatedAt) : null)
        const isCommitment = isPsychCommitment(t)

        // 1. Ca mới phát sinh trong tháng
        if (tStart >= startOfMonth && tStart <= endOfMonth) {
          newCases++
          if (isCommitment) newCommitments++
        }

        // 2. Ca chấm dứt theo dõi trong tháng (Hoàn thành / kết thúc can thiệp)
        if (isTerminated && tEnd && tEnd >= startOfMonth && tEnd <= endOfMonth) {
          terminatedInMonth++
          if (isCommitment) terminatedCommitment++
        }

        // 3. Lũy kế ca đang duy trì theo dõi tại thời điểm cuối tháng
        if (tStart <= endOfMonth) {
          if (!tEnd || tEnd > endOfMonth) {
            activeCaseload++
            if (isCommitment) commitmentCases++
          }
        }
      })

      return {
        name: label,
        month,
        year,
        monthNum,
        activeCaseload,
        newCases,
        terminatedInMonth,
        commitmentCases,
        newCommitments,
        terminatedCommitment,
      }
    })
  }, [academicYearMonths, psychologyTargets])

  // CHỈ HIỂN THỊ CÁC THÁNG CÓ DỮ LIỆU THỰC TẾ (Đã phát sinh tiếp nhận mới hoặc chấm dứt theo dõi)
  const actualDataMonthlyTimeline = useMemo(() => {
    const list = psychologyMonthlyTimeline.filter(m => m.newCases > 0 || m.terminatedInMonth > 0)
    return list.length > 0 ? list : psychologyMonthlyTimeline.slice(0, 3)
  }, [psychologyMonthlyTimeline])

  // Tháng cao điểm & tháng có dữ liệu mới nhất
  const peakCaseload = useMemo(() => {
    return actualDataMonthlyTimeline.reduce(
      (max, cur) => cur.activeCaseload > max.activeCaseload ? cur : max,
      { activeCaseload: 0, name: "", month: "" }
    )
  }, [actualDataMonthlyTimeline])

  const latestMonthWithActivity = useMemo(() => {
    const monthsWithNew = [...actualDataMonthlyTimeline].reverse().find(m => m.newCases > 0)
    return monthsWithNew || actualDataMonthlyTimeline[0] || { month: "09/2026", name: "Th 9", newCases: 0 }
  }, [actualDataMonthlyTimeline])

  // Tháng trước đó để tính biến động tăng/giảm tiếp nhận mới
  const prevMonthNewCases = useMemo(() => {
    const idx = actualDataMonthlyTimeline.findIndex(m => m.month === latestMonthWithActivity.month)
    if (idx > 0) {
      return actualDataMonthlyTimeline[idx - 1].newCases
    }
    return 0
  }, [actualDataMonthlyTimeline, latestMonthWithActivity])

  // Danh sách các tháng có ca chấm dứt theo dõi
  const psychTerminatedMonths = useMemo(() => {
    const map = new Map<string, number>()
    psychologyTargets.forEach(t => {
      if (t.terminationStatus === "TERMINATED") {
        const d = t.endDate ? new Date(t.endDate) : (t.updatedAt ? new Date(t.updatedAt) : null)
        if (d) {
          const mStr = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
          map.set(mStr, (map.get(mStr) || 0) + 1)
        }
      }
    })
    return Array.from(map.entries()).map(([month, count]) => ({ month, count }))
  }, [psychologyTargets])

  // =========================================================================
  // 5. PHÂN BỔ TÂM LÝ THEO CƠ SỞ (TÍCH HỢP CAM KẾT & CHẤM DỨT THEO DÕI)
  // =========================================================================
  const psychCampusStats = useMemo(() => {
    const map: Record<string, { campusId: string; campusName: string; count: number; active: number; terminated: number; commitmentCount: number }> = {}

    campuses.forEach(c => {
      map[c.id] = { campusId: c.id, campusName: c.campusName, count: 0, active: 0, terminated: 0, commitmentCount: 0 }
    })

    psychologyTargets.forEach(t => {
      const campusId = t.student?.class?.campusId || t.student?.campusId
      if (!campusId) return
      if (!map[campusId]) {
        const cObj = campuses.find(c => c.id === campusId)
        map[campusId] = { campusId, campusName: cObj?.campusName || "Khác", count: 0, active: 0, terminated: 0, commitmentCount: 0 }
      }
      map[campusId].count++
      if (t.terminationStatus === "TERMINATED") {
        map[campusId].terminated++
      } else {
        map[campusId].active++
      }
      if (isPsychCommitment(t)) {
        map[campusId].commitmentCount++
      }
    })

    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [psychologyTargets, campuses])

  // =========================================================================
  // 6. PHÂN BỔ TÂM LÝ THEO KHỐI LỚP (TÍCH HỢP CAM KẾT & CHẤM DỨT)
  // =========================================================================
  const psychGradeStats = useMemo(() => {
    const map: Record<string, { gradeName: string; count: number; order: number; active: number; terminated: number; commitmentCount: number }> = {}

    psychologyTargets.forEach(t => {
      const className = t.student?.class?.className || ""
      const match = className.match(/^(\d+)/)
      const gradeNum = match ? parseInt(match[1]) : 99
      const gradeName = match ? `Khối ${match[1]}` : (className || "Chưa xếp lớp")

      if (!map[gradeName]) {
        map[gradeName] = { gradeName, count: 0, order: gradeNum, active: 0, terminated: 0, commitmentCount: 0 }
      }
      map[gradeName].count++
      if (t.terminationStatus === "TERMINATED") {
        map[gradeName].terminated++
      } else {
        map[gradeName].active++
      }
      if (isPsychCommitment(t)) {
        map[gradeName].commitmentCount++
      }
    })

    return Object.values(map).sort((a, b) => a.order - b.order)
  }, [psychologyTargets])

  // Max grade count for proportional progress bar
  const maxPsychGradeCount = useMemo(() => {
    return Math.max(...psychGradeStats.map(g => g.count), 1)
  }, [psychGradeStats])

  // =========================================================================
  // 7. PHÂN BỔ TÂM LÝ THEO GIÁO VIÊN / CHUYÊN VIÊN PHỤ TRÁCH
  // =========================================================================
  const psychTeacherStats = useMemo(() => {
    const map: Record<string, { teacherId: string; teacherName: string; count: number; active: number; terminated: number; campusNames: Set<string>; grades: Set<string> }> = {}

    psychologyTargets.forEach(t => {
      const tAssigns = (t.assignments || []).filter((a: any) => a.teacher)
      const campusName = t.student?.class?.campus?.campusName || ""
      const className = t.student?.class?.className || ""
      const match = className.match(/^(\d+)/)
      const gradeName = match ? `Khối ${match[1]}` : ""
      const isTerm = t.terminationStatus === "TERMINATED"

      if (tAssigns.length === 0) {
        const key = "UNASSIGNED"
        if (!map[key]) {
          map[key] = { teacherId: "UNASSIGNED", teacherName: "Chưa phân công GV", count: 0, active: 0, terminated: 0, campusNames: new Set(), grades: new Set() }
        }
        map[key].count++
        if (isTerm) map[key].terminated++
        else map[key].active++
        if (campusName) map[key].campusNames.add(campusName)
        if (gradeName) map[key].grades.add(gradeName)
      } else {
        tAssigns.forEach((a: any) => {
          const tId = a.teacher.id
          const tName = a.teacher.teacherName
          if (!map[tId]) {
            map[tId] = { teacherId: tId, teacherName: tName, count: 0, active: 0, terminated: 0, campusNames: new Set(), grades: new Set() }
          }
          map[tId].count++
          if (isTerm) map[tId].terminated++
          else map[tId].active++
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

  // Tỷ lệ phân công chuyên viên
  const psychAssignedRate = useMemo(() => {
    if (psychologyTargets.length === 0) return 100
    const assignedCount = psychologyTargets.filter(t => (t.assignments || []).some((a: any) => a.teacher)).length
    return Math.round((assignedCount / psychologyTargets.length) * 100)
  }, [psychologyTargets])

  // =========================================================================
  // 8. BỘ LỌC VÀ DANH SÁCH HỌC SINH TÂM LÝ CHI TIẾT (TÍCH HỢP CAM KẾT & CHẤM DỨT THEO THÁNG)
  // =========================================================================
  const [psychSearch, setPsychSearch] = useState("")
  const [psychCampusFilter, setPsychCampusFilter] = useState("ALL")
  const [psychGradeFilter, setPsychGradeFilter] = useState("ALL")
  const [psychTeacherFilter, setPsychTeacherFilter] = useState("ALL")
  const [psychStatusFilter, setPsychStatusFilter] = useState("ALL")
  const [psychCommitmentFilter, setPsychCommitmentFilter] = useState<"ALL" | "COMMITMENT_ONLY" | "REGULAR_ONLY">("ALL")
  const [psychTermMonthFilter, setPsychTermMonthFilter] = useState("ALL")

  // Phân trang danh sách học sinh để hiển thị gọn gàng, tải nhanh
  const [psychPage, setPsychPage] = useState(1)
  const [psychPageSize, setPsychPageSize] = useState<number>(20)

  // Reset về trang 1 khi người dùng thay đổi bất kỳ tiêu chí lọc nào
  useEffect(() => {
    setPsychPage(1)
  }, [psychSearch, psychCampusFilter, psychGradeFilter, psychTeacherFilter, psychStatusFilter, psychCommitmentFilter, psychTermMonthFilter])

  const filteredPsychStudents = useMemo(() => {
    return psychologyTargets.filter(t => {
      const sName = (t.student?.studentName || "").toLowerCase()
      const sCode = (t.student?.studentCode || "").toLowerCase()
      const cName = (t.student?.class?.className || "").toLowerCase()
      const q = psychSearch.trim().toLowerCase()

      if (q && !sName.includes(q) && !sCode.includes(q) && !cName.includes(q) && !(t.reason || "").toLowerCase().includes(q) && !(t.notes || "").toLowerCase().includes(q)) return false

      const campusId = t.student?.class?.campusId || t.student?.campusId
      if (psychCampusFilter !== "ALL" && campusId !== psychCampusFilter) return false

      const matchGrade = (t.student?.class?.className || "").match(/^(\d+)/)
      const gradeKey = matchGrade ? `Khối ${matchGrade[1]}` : (t.student?.class?.className || "")
      if (psychGradeFilter !== "ALL" && gradeKey !== psychGradeFilter) return false

      if (psychTeacherFilter !== "ALL") {
        if (psychTeacherFilter === "UNASSIGNED") {
          const hasAssigned = (t.assignments || []).some((a: any) => a.teacher)
          if (hasAssigned) return false
        } else {
          const hasTeacher = (t.assignments || []).some((a: any) =>
            a.teacher?.id === psychTeacherFilter || a.teacher?.teacherName === psychTeacherFilter
          )
          if (!hasTeacher) return false
        }
      }

      if (psychStatusFilter !== "ALL") {
        if (psychStatusFilter === "ACTIVE" && t.terminationStatus !== "ACTIVE") return false
        if (psychStatusFilter === "PENDING_TERMINATION" && t.terminationStatus !== "PENDING_TERMINATION") return false
        if (psychStatusFilter === "TERMINATED" && t.terminationStatus !== "TERMINATED") return false
      }

      // Bộ lọc Cam kết Tâm lý
      if (psychCommitmentFilter === "COMMITMENT_ONLY" && !isPsychCommitment(t)) return false
      if (psychCommitmentFilter === "REGULAR_ONLY" && isPsychCommitment(t)) return false

      // Bộ lọc Tháng chấm dứt theo dõi
      if (psychTermMonthFilter !== "ALL") {
        if (t.terminationStatus !== "TERMINATED") return false
        const d = t.endDate ? new Date(t.endDate) : (t.updatedAt ? new Date(t.updatedAt) : null)
        if (!d) return false
        const mStr = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
        if (mStr !== psychTermMonthFilter) return false
      }

      return true
    })
  }, [psychologyTargets, psychSearch, psychCampusFilter, psychGradeFilter, psychTeacherFilter, psychStatusFilter, psychCommitmentFilter, psychTermMonthFilter])

  // Danh sách học sinh phân trang
  const totalPsychPages = Math.max(1, Math.ceil(filteredPsychStudents.length / (psychPageSize === -1 ? filteredPsychStudents.length || 1 : psychPageSize)))

  const paginatedPsychStudents = useMemo(() => {
    if (psychPageSize === -1) return filteredPsychStudents
    const start = (psychPage - 1) * psychPageSize
    return filteredPsychStudents.slice(start, start + psychPageSize)
  }, [filteredPsychStudents, psychPage, psychPageSize])

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

          {/* 1.1 THẺ CHỈ SỐ KPI TÂM LÝ HỌC ĐƯỜNG CHUẨN BRAND SKY-LINE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Card 1: Tổng số HS Tâm lý theo dõi (Màu vàng đất nhẹ) */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-gradient-to-br from-amber-100/60 to-yellow-50/20 rounded-tl-full opacity-70 group-hover:scale-110 transition-transform pointer-events-none" />
              <div className="flex items-center gap-3.5 z-10 relative">
                <div className="p-3 bg-gradient-to-br from-[#D49A3D] to-[#B88029] text-white rounded-2xl shadow-sm shadow-amber-200">
                  <Brain className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-3xl font-black text-slate-800 leading-none tracking-tight">
                    {psychologyTargets.length}
                  </div>
                  <div className="text-[11px] text-[#92400E] font-extrabold uppercase mt-1 tracking-wider">
                    HS Tâm lý theo dõi
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                    <span className="font-bold text-[#B45309]">{totalActivePsych} đang theo dõi</span>
                    <span>•</span>
                    <span className="font-bold text-[#135E5B]">{totalTerminatedPsych} đã chấm dứt</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Nhận diện Học sinh Cam kết về Tâm lý (YÊU CẦU TRỌNG TÂM) */}
            <div 
              onClick={() => setPsychCommitmentFilter(psychCommitmentFilter === "COMMITMENT_ONLY" ? "ALL" : "COMMITMENT_ONLY")}
              className={`bg-white border rounded-3xl p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group cursor-pointer ${
                psychCommitmentFilter === "COMMITMENT_ONLY"
                  ? "border-amber-400 ring-2 ring-amber-400/30 bg-amber-50/30"
                  : "border-amber-200/70 hover:border-amber-300"
              }`}
              title="Nhấn để lọc danh sách học sinh cam kết tâm lý"
            >
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-gradient-to-br from-amber-100/60 to-orange-50/20 rounded-tl-full opacity-70 group-hover:scale-110 transition-transform pointer-events-none" />
              <div className="flex items-center gap-3.5 z-10 relative">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl shadow-sm shadow-amber-200">
                  <HeartHandshake className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-black text-amber-700 leading-none tracking-tight">
                      {psychCommitmentTargets.length}
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      {Math.round((psychCommitmentTargets.length / (psychologyTargets.length || 1)) * 100)}% ca
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-900 font-extrabold uppercase mt-1 tracking-wider flex items-center gap-1">
                    HS Cam kết Tâm lý
                    <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400 inline" />
                  </div>
                  <div className="text-[10px] text-amber-800 font-semibold mt-0.5">
                    {psychCommitmentActive} đang theo dõi • {psychCommitmentTerminated} đã hoàn thành
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Tiếp nhận mới từng tháng (TÍNH TOÁN ĐỘNG) */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-gradient-to-br from-amber-100/40 to-orange-50/20 rounded-tl-full opacity-70 group-hover:scale-110 transition-transform pointer-events-none" />
              <div className="flex items-center gap-3.5 z-10 relative">
                <div className="p-3 bg-gradient-to-br from-[#E0A84E] to-[#C88E35] text-white rounded-2xl shadow-sm shadow-amber-200">
                  <UserPlus className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-3xl font-black text-[#92400E] leading-none tracking-tight">
                    +{latestMonthWithActivity.newCases}
                  </div>
                  <div className="text-[11px] text-[#B45309] font-extrabold uppercase mt-1 tracking-wider">
                    Tiếp nhận mới {latestMonthWithActivity.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                    {prevMonthNewCases > 0 ? (
                      latestMonthWithActivity.newCases >= prevMonthNewCases ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                          <ArrowUpRight className="w-3 h-3" />
                          +{latestMonthWithActivity.newCases - prevMonthNewCases} so với {psychologyMonthlyTimeline[psychologyMonthlyTimeline.findIndex(m => m.month === latestMonthWithActivity.month) - 1]?.name}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-bold flex items-center gap-0.5">
                          <ArrowDownRight className="w-3 h-3 text-amber-500" />
                          {latestMonthWithActivity.newCases - prevMonthNewCases} so với {psychologyMonthlyTimeline[psychologyMonthlyTimeline.findIndex(m => m.month === latestMonthWithActivity.month) - 1]?.name}
                        </span>
                      )
                    ) : (
                      <span className="text-slate-400">Đầu kỳ năm học</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Số học sinh đã chấm dứt theo dõi theo Tháng (Xanh thương hiệu Sky-Line #135E5B) */}
            <div 
              onClick={() => setPsychStatusFilter(psychStatusFilter === "TERMINATED" ? "ALL" : "TERMINATED")}
              className={`bg-white border rounded-3xl p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group cursor-pointer ${
                psychStatusFilter === "TERMINATED"
                  ? "border-[#135E5B] ring-2 ring-[#135E5B]/30 bg-teal-50/40"
                  : "border-teal-200/70 hover:border-[#135E5B]"
              }`}
              title="Nhấn để lọc học sinh đã chấm dứt theo dõi"
            >
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-gradient-to-br from-teal-100/60 to-emerald-50/20 rounded-tl-full opacity-70 group-hover:scale-110 transition-transform pointer-events-none" />
              <div className="flex items-center gap-3.5 z-10 relative">
                <div className="p-3 bg-gradient-to-br from-[#135E5B] to-[#1E8B87] text-white rounded-2xl shadow-sm shadow-teal-200">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-black text-[#135E5B] leading-none tracking-tight">
                      {totalTerminatedPsych} <span className="text-base text-slate-400 font-medium">ca</span>
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-100 text-[#135E5B] border border-teal-200">
                      {Math.round((totalTerminatedPsych / (psychologyTargets.length || 1)) * 100)}% xong
                    </span>
                  </div>
                  <div className="text-[11px] text-[#135E5B] font-extrabold uppercase mt-1 tracking-wider flex items-center gap-1">
                    Đã chấm dứt theo dõi
                  </div>
                  <div className="text-[10px] text-[#0F4A47] font-bold mt-0.5 truncate" title={psychTerminatedMonths.map(m => `${m.month}: ${m.count} ca`).join(" • ")}>
                    {psychTerminatedMonths.length > 0 ? (
                      psychTerminatedMonths.map(m => `Th ${m.month.split('/')[0]}: ${m.count} ca`).join(" • ")
                    ) : (
                      "Chưa có ca chấm dứt"
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 5: Mạng lưới Cơ sở & Chuyên viên tham vấn */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-gradient-to-br from-teal-100/50 to-cyan-50/20 rounded-tl-full opacity-70 group-hover:scale-110 transition-transform pointer-events-none" />
              <div className="flex items-center gap-3.5 z-10 relative">
                <div className="p-3 bg-gradient-to-br from-[#135E5B] to-[#1E8B87] text-white rounded-2xl shadow-sm shadow-teal-200">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-3xl font-black text-slate-800 leading-none tracking-tight">
                    {psychCampusStats.filter(c => c.count > 0).length} <span className="text-base text-slate-400 font-medium">/ {campuses.length} CS</span>
                  </div>
                  <div className="text-[11px] text-teal-800 font-extrabold uppercase mt-1 tracking-wider">
                    {psychTeacherStats.filter(t => t.teacherId !== "UNASSIGNED").length} Chuyên viên / GV
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    {psychCampusStats[0] ? `Nhiều nhất ở ${psychCampusStats[0].campusName} (${psychCampusStats[0].count})` : "Phân bổ toàn trường"}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* 1.2 BIỂU ĐỒ & BẢNG THEO DÕI TÂM LÝ TỪNG THÁNG & CHẤM DỨT THEO THÁNG */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 md:p-6 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#135E5B]" />
                  Biểu đồ Phác họa Số học sinh theo dõi & Chấm dứt theo dõi Tâm lý từng Tháng
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dữ liệu trích xuất chính xác theo mốc tiếp nhận, lưu lượng duy trì và các mốc chấm dứt theo dõi hoàn thành mục tiêu qua 10 tháng năm học
                </p>
              </div>

              {/* Mode Toggles */}
              <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                <div className="flex bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70 shadow-inner">
                  <button
                    onClick={() => setPsychChartMetric("comparison")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      psychChartMetric === "comparison"
                        ? "bg-white text-[#135E5B] shadow-sm font-black scale-[1.02]"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Đối sánh biến động
                  </button>
                  <button
                    onClick={() => setPsychChartMetric("activeCaseload")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      psychChartMetric === "activeCaseload"
                        ? "bg-white text-[#92400E] shadow-sm font-black scale-[1.02]"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Đang theo dõi
                  </button>
                  <button
                    onClick={() => setPsychChartMetric("terminated")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      psychChartMetric === "terminated"
                        ? "bg-white text-[#135E5B] shadow-sm font-black scale-[1.02]"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Đã chấm dứt theo dõi
                  </button>
                  <button
                    onClick={() => setPsychChartMetric("newCases")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      psychChartMetric === "newCases"
                        ? "bg-white text-slate-800 shadow-sm font-black scale-[1.02]"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Tiếp nhận mới (+)
                  </button>
                </div>

                <div className="flex bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70 shadow-inner">
                  <button
                    onClick={() => setPsychViewMode("chart")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      psychViewMode === "chart"
                        ? "bg-white text-slate-900 shadow-sm font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Biểu đồ
                  </button>
                  <button
                    onClick={() => setPsychViewMode("table")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      psychViewMode === "table"
                        ? "bg-white text-slate-900 shadow-sm font-black"
                        : "text-slate-600 hover:text-slate-900"
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 mb-3 px-2 gap-2">
                  <div className="flex flex-wrap items-center gap-4">
                    {psychChartMetric === "comparison" && (
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 font-bold text-[#92400E]">
                          <span className="w-3 h-3 rounded-md bg-[#D49A3D] inline-block shadow-xs" />
                          Đang theo dõi
                        </span>
                        <span className="flex items-center gap-1.5 font-bold text-[#135E5B]">
                          <span className="w-3 h-3 rounded-md bg-[#135E5B] inline-block shadow-xs" />
                          Đã chấm dứt theo dõi
                        </span>
                      </div>
                    )}
                    {psychChartMetric === "activeCaseload" && (
                      <span className="flex items-center gap-1.5 font-bold text-[#92400E]">
                        <span className="w-3 h-3 rounded-full bg-[#D49A3D] inline-block" />
                        Học sinh đang theo dõi
                      </span>
                    )}
                    {psychChartMetric === "terminated" && (
                      <span className="flex items-center gap-1.5 font-bold text-[#135E5B]">
                        <span className="w-3 h-3 rounded-full bg-[#135E5B] inline-block" />
                        Học sinh đã chấm dứt theo dõi
                      </span>
                    )}
                    {psychChartMetric === "newCases" && (
                      <span className="flex items-center gap-1.5 font-bold text-[#92400E]">
                        <span className="w-3 h-3 rounded-full bg-[#D49A3D] inline-block" />
                        Học sinh tiếp nhận mới phát sinh trong tháng
                      </span>
                    )}
                    <span className="text-slate-400 text-[11px]">
                      • Tổng tiếp nhận: <strong className="text-slate-700">{psychologyTargets.length} ca</strong> | Đang theo dõi: <strong className="text-[#B45309]">{totalActivePsych} ca</strong> | Đã chấm dứt: <strong className="text-[#135E5B]">{totalTerminatedPsych} ca</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-[11px] bg-amber-50 text-[#92400E] font-bold px-2.5 py-1 rounded-full border border-amber-200/70">
                      Quy mô cao nhất: {peakCaseload.activeCaseload} HS ({peakCaseload.name})
                    </span>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={290}>
                  {psychChartMetric === "comparison" ? (
                    <BarChart
                      data={actualDataMonthlyTimeline}
                      margin={{ top: 25, right: 20, left: -20, bottom: 0 }}
                      barGap={8}
                    >
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
                        domain={[0, 'auto']}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload
                            return (
                              <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-800 text-xs backdrop-blur-md">
                                <p className="font-extrabold text-teal-300 mb-2 border-b border-slate-700 pb-1 flex items-center justify-between gap-4">
                                  <span>Tháng {d.month}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">{d.name}</span>
                                </p>
                                <div className="space-y-1.5 text-[11px]">
                                  <p className="flex justify-between gap-6">
                                    <span className="text-amber-200">Đang theo dõi:</span>
                                    <span className="font-black text-amber-300">{d.activeCaseload} HS</span>
                                  </p>
                                  <p className="flex justify-between gap-6">
                                    <span className="text-teal-200">Đã chấm dứt theo dõi:</span>
                                    <span className="font-black text-teal-300">-{d.terminatedInMonth} ca</span>
                                  </p>
                                  <p className="flex justify-between gap-6 border-t border-slate-800 pt-1">
                                    <span className="text-slate-400">Tiếp nhận mới trong tháng:</span>
                                    <span className="font-bold text-slate-200">+{d.newCases} ca</span>
                                  </p>
                                  {d.commitmentCases > 0 && (
                                    <p className="flex justify-between gap-6 text-amber-400">
                                      <span>Trong đó có HS cam kết:</span>
                                      <span className="font-bold">{d.commitmentCases} HS</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Legend 
                        formatter={(value) => (
                          <span className="text-xs font-bold text-slate-700">
                            {value === "activeCaseload" ? "Học sinh đang theo dõi" : "Đã chấm dứt theo dõi"}
                          </span>
                        )}
                      />
                      <Bar 
                        dataKey="activeCaseload" 
                        name="activeCaseload"
                        fill="#D49A3D" 
                        radius={[6, 6, 0, 0]} 
                        maxBarSize={48}
                      >
                        <LabelList 
                          dataKey="activeCaseload" 
                          position="top" 
                          fill="#92400E" 
                          fontSize={11} 
                          fontWeight={800} 
                          formatter={(v: any) => Number(v) > 0 ? `${v}` : ""} 
                        />
                      </Bar>
                      <Bar 
                        dataKey="terminatedInMonth" 
                        name="terminatedInMonth"
                        fill="#135E5B" 
                        radius={[6, 6, 0, 0]} 
                        maxBarSize={48}
                      >
                        <LabelList 
                          dataKey="terminatedInMonth" 
                          position="top" 
                          fill="#135E5B" 
                          fontSize={11} 
                          fontWeight={800} 
                          formatter={(v: any) => Number(v) > 0 ? `${v}` : ""} 
                        />
                      </Bar>
                    </BarChart>
                  ) : psychChartMetric === "terminated" ? (
                    <BarChart
                      data={actualDataMonthlyTimeline}
                      margin={{ top: 25, right: 20, left: -20, bottom: 0 }}
                    >
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
                        domain={[0, 'auto']}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload
                            return (
                              <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-800 text-xs backdrop-blur-md">
                                <p className="font-extrabold text-teal-300 mb-2 border-b border-slate-700 pb-1 flex items-center justify-between gap-4">
                                  <span>Tháng {d.month}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">{d.name}</span>
                                </p>
                                <div className="space-y-1.5 text-[11px]">
                                  <p className="flex justify-between gap-6">
                                    <span className="text-teal-200">Đã chấm dứt theo dõi:</span>
                                    <span className="font-black text-teal-300 text-sm">{d.terminatedInMonth} ca</span>
                                  </p>
                                  {d.terminatedCommitment > 0 && (
                                    <p className="flex justify-between gap-6 text-amber-300">
                                      <span>Trong đó có HS cam kết:</span>
                                      <span className="font-bold">{d.terminatedCommitment} ca</span>
                                    </p>
                                  )}
                                  <p className="flex justify-between gap-6 border-t border-slate-800 pt-1">
                                    <span className="text-slate-400">Tổng ca còn theo dõi:</span>
                                    <span className="font-bold text-amber-300">{d.activeCaseload} HS</span>
                                  </p>
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="terminatedInMonth" fill="#135E5B" radius={[8, 8, 0, 0]} maxBarSize={56}>
                        {actualDataMonthlyTimeline.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.terminatedInMonth > 0 ? "#135E5B" : "#e2e8f0"} 
                          />
                        ))}
                        <LabelList 
                          dataKey="terminatedInMonth" 
                          position="top" 
                          fill="#135E5B" 
                          fontSize={11} 
                          fontWeight={800} 
                          formatter={(v: any) => Number(v) > 0 ? `${v}` : ""} 
                        />
                      </Bar>
                    </BarChart>
                  ) : psychChartMetric === "activeCaseload" ? (
                    <BarChart
                      data={actualDataMonthlyTimeline}
                      margin={{ top: 25, right: 20, left: -20, bottom: 0 }}
                    >
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
                        domain={[0, 'auto']}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload
                            return (
                              <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-800 text-xs backdrop-blur-md">
                                <p className="font-extrabold text-amber-300 mb-2 border-b border-slate-700 pb-1 flex items-center justify-between gap-4">
                                  <span>Tháng {d.month}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">{d.name}</span>
                                </p>
                                <div className="space-y-1.5 text-[11px]">
                                  <p className="flex justify-between gap-6">
                                    <span className="text-slate-300">Lũy kế đang theo dõi:</span>
                                    <span className="font-black text-amber-300 text-sm">{d.activeCaseload} HS</span>
                                  </p>
                                  <p className="flex justify-between gap-6">
                                    <span className="text-slate-300">Tiếp nhận mới:</span>
                                    <span className="font-bold text-slate-200">+{d.newCases} ca</span>
                                  </p>
                                  <p className="flex justify-between gap-6">
                                    <span className="text-slate-300">Đã chấm dứt:</span>
                                    <span className="font-bold text-teal-300">-{d.terminatedInMonth} ca</span>
                                  </p>
                                  {d.commitmentCases > 0 && (
                                    <p className="flex justify-between gap-6 text-amber-400 pt-1 border-t border-slate-800">
                                      <span>Trong đó diện Cam kết:</span>
                                      <span className="font-bold">{d.commitmentCases} HS</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="activeCaseload" fill="#D49A3D" radius={[8, 8, 0, 0]} maxBarSize={56}>
                        <LabelList 
                          dataKey="activeCaseload" 
                          position="top" 
                          fill="#92400E" 
                          fontSize={11} 
                          fontWeight={800} 
                          formatter={(v: any) => Number(v) > 0 ? `${v}` : ""} 
                        />
                      </Bar>
                    </BarChart>
                  ) : (
                    <BarChart
                      data={actualDataMonthlyTimeline}
                      margin={{ top: 25, right: 20, left: -20, bottom: 0 }}
                    >
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
                        domain={[0, 'auto']}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload
                            return (
                              <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-800 text-xs backdrop-blur-md">
                                <p className="font-extrabold text-amber-300 mb-2 border-b border-slate-700 pb-1 flex items-center justify-between gap-4">
                                  <span>Tháng {d.month}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">{d.name}</span>
                                </p>
                                <div className="space-y-1.5 text-[11px]">
                                  <p className="flex justify-between gap-6">
                                    <span className="text-slate-300">Tiếp nhận mới:</span>
                                    <span className="font-black text-amber-300 text-sm">+{d.newCases} ca</span>
                                  </p>
                                  {d.newCommitments > 0 && (
                                    <p className="flex justify-between gap-6 text-amber-400">
                                      <span>Trong đó có HS cam kết:</span>
                                      <span className="font-bold">{d.newCommitments} ca</span>
                                    </p>
                                  )}
                                  <p className="flex justify-between gap-6 border-t border-slate-800 pt-1">
                                    <span className="text-slate-300">Lũy kế đang theo dõi:</span>
                                    <span className="font-bold text-amber-200">{d.activeCaseload} HS</span>
                                  </p>
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="newCases" fill="#D49A3D" radius={[8, 8, 0, 0]} maxBarSize={56}>
                        <LabelList 
                          dataKey="newCases" 
                          position="top" 
                          fill="#92400E" 
                          fontSize={11} 
                          fontWeight={800} 
                          formatter={(v: any) => Number(v) > 0 ? `${v}` : ""} 
                        />
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="min-w-full text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-100 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 text-left">Tháng trong năm học</th>
                      <th className="py-3 px-4 text-center">Tiếp nhận mới (+)</th>
                      <th className="py-3 px-4 text-center bg-teal-50/50 text-[#135E5B]">Đã chấm dứt theo dõi (-)</th>
                      <th className="py-3 px-4 text-center bg-amber-50/40 text-[#92400E]">Lũy kế đang theo dõi</th>
                      <th className="py-3 px-4 text-center bg-amber-50/60 text-amber-900">Trong đó: HS Cam kết</th>
                      <th className="py-3 px-4 text-left">Đánh giá & Ghi chú quản trị</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-xs">
                    {actualDataMonthlyTimeline.map((row, idx) => {
                      const isHighActivity = row.newCases > 0 || row.terminatedInMonth > 0
                      return (
                        <tr key={idx} className={`hover:bg-slate-50/80 transition-colors ${row.terminatedInMonth > 0 ? "bg-teal-50/20" : ""}`}>
                          <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isHighActivity ? "bg-[#135E5B]" : "bg-slate-300"}`} />
                            Tháng {row.month} ({row.name})
                          </td>
                          <td className="py-3 px-4 text-center">
                            {row.newCases > 0 ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-[#92400E] font-black border border-amber-200">
                                +{row.newCases}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-bold">0</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center bg-teal-50/30">
                            {row.terminatedInMonth > 0 ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-[#135E5B] font-black border border-teal-200">
                                -{row.terminatedInMonth} ca
                              </span>
                            ) : (
                              <span className="text-slate-300 font-bold">0</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center bg-amber-50/20">
                            <span className="px-3 py-1 rounded-xl bg-amber-50 text-[#92400E] font-black border border-amber-200/80 text-xs">
                              {row.activeCaseload} HS
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center bg-amber-50/30">
                            {row.commitmentCases > 0 ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black border border-amber-200 text-[11px] inline-flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                {row.commitmentCases} HS
                              </span>
                            ) : (
                              <span className="text-slate-300">0</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-left text-slate-600 font-medium">
                            {row.newCases > 0 && row.terminatedInMonth > 0 && (
                              <span className="text-[#135E5B] font-bold">
                                Tiếp nhận +{row.newCases} ca, hoàn thành & kết thúc {row.terminatedInMonth} ca can thiệp
                              </span>
                            )}
                            {row.newCases > 0 && row.terminatedInMonth === 0 && (
                              <span className="text-[#92400E] font-bold">
                                Tiếp nhận mới {row.newCases} ca học sinh cần hỗ trợ
                              </span>
                            )}
                            {row.newCases === 0 && row.terminatedInMonth > 0 && (
                              <span className="text-[#135E5B] font-bold">
                                Chấm dứt theo dõi {row.terminatedInMonth} ca đạt mục tiêu rèn luyện
                              </span>
                            )}
                            {row.newCases === 0 && row.terminatedInMonth === 0 && row.activeCaseload > 0 && (
                              <span className="text-slate-400">Duy trì đồng hành {row.activeCaseload} học sinh định kỳ</span>
                            )}
                            {row.activeCaseload === 0 && (
                              <span className="text-slate-300">—</span>
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

          {/* 1.3 KHỐI PHÂN TÍCH 3 CHIỀU: CƠ SỞ, KHỐI LỚP, GV PHỤ TRÁCH (BỐ CỤC CÂN ĐỐI, ĐỐI SÁNH THEO DÕI & CHẤM DỨT) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">

            {/* Chiều 1: Thống kê theo Cơ sở */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between h-[450px]">
              <div>
                <div className="pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-teal-50 text-[#135E5B] rounded-2xl border border-teal-100/60 shadow-xs">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-800">Thống kê theo Cơ sở</h3>
                        <p className="text-[10px] text-slate-400">Phân bổ {psychologyTargets.length} ca tại {psychCampusStats.filter(c => c.count > 0).length} cơ sở</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-black text-[#135E5B] bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-100">
                      {psychCampusStats.filter(c => c.count > 0).length} cơ sở
                    </span>
                  </div>

                  {/* Thanh tóm tắt nhanh 2 trạng thái */}
                  <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-100 text-[10px] font-bold">
                    <span className="flex items-center gap-1 text-[#92400E] bg-amber-50/80 px-2 py-0.5 rounded-lg border border-amber-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D49A3D]" />
                      Theo dõi: {totalActivePsych}
                    </span>
                    <span className="flex items-center gap-1 text-[#135E5B] bg-teal-50/80 px-2 py-0.5 rounded-lg border border-teal-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#135E5B]" />
                      Chấm dứt: {totalTerminatedPsych}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 overflow-y-auto max-h-[300px] pr-1">
                  {psychCampusStats.map((item, idx) => {
                    const percent = psychologyTargets.length > 0 ? Math.round((item.count / psychologyTargets.length) * 100) : 0
                    const activePercent = item.count > 0 ? Math.round((item.active / item.count) * 100) : 0
                    const termPercent = item.count > 0 ? Math.round((item.terminated / item.count) * 100) : 0

                    return (
                      <div
                        key={idx}
                        onClick={() => setPsychCampusFilter(psychCampusFilter === item.campusId ? "ALL" : item.campusId)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                          psychCampusFilter === item.campusId
                            ? "bg-teal-50/70 border-[#135E5B] ring-2 ring-[#135E5B]/20 shadow-xs"
                            : "bg-slate-50/60 border-slate-100 hover:bg-slate-100/70 hover:border-slate-200"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1.5 text-xs">
                          <span className="font-extrabold text-slate-800 flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-full bg-[#135E5B] shrink-0" />
                            <span className="truncate">{item.campusName}</span>
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.commitmentCount > 0 && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                                ⭐️ {item.commitmentCount}
                              </span>
                            )}
                            <span className="font-black text-slate-800 text-xs">
                              {item.count} HS <span className="text-[10px] font-normal text-slate-400">({percent}%)</span>
                            </span>
                          </div>
                        </div>

                        {/* Thanh tỉ lệ kép trực quan (Vàng đất - Theo dõi vs Xanh Sky-Line - Chấm dứt) */}
                        <div className="h-2 w-full bg-slate-200/60 rounded-full overflow-hidden flex mb-1.5">
                          <div
                            className="h-full bg-[#D49A3D] transition-all duration-500"
                            style={{ width: `${activePercent}%` }}
                            title={`Đang theo dõi: ${item.active} HS (${activePercent}%)`}
                          />
                          <div
                            className="h-full bg-[#135E5B] transition-all duration-500"
                            style={{ width: `${termPercent}%` }}
                            title={`Đã chấm dứt: ${item.terminated} HS (${termPercent}%)`}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-[#92400E] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D49A3D]" />
                            {item.active} đang theo dõi
                          </span>
                          <span className="text-[#135E5B] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#135E5B]" />
                            {item.terminated} đã chấm dứt
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {psychCampusFilter !== "ALL" ? (
                <button
                  onClick={() => setPsychCampusFilter("ALL")}
                  className="mt-2 text-[11px] font-bold text-[#135E5B] hover:underline flex items-center justify-center gap-1 py-1 bg-teal-50/50 rounded-xl border border-teal-100"
                >
                  Bỏ lọc theo cơ sở
                </button>
              ) : (
                <div className="text-[10px] text-center text-slate-400 font-medium py-1">
                  Nhấn vào cơ sở để lọc học sinh
                </div>
              )}
            </div>

            {/* Chiều 2: Thống kê theo Khối lớp */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between h-[450px]">
              <div>
                <div className="pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-amber-50 text-[#92400E] rounded-2xl border border-amber-100/60 shadow-xs">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-800">Thống kê theo Khối lớp</h3>
                        <p className="text-[10px] text-slate-400">Độ tuổi can thiệp tại {psychGradeStats.length} khối</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-black text-[#92400E] bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-100">
                      {psychGradeStats.length} khối
                    </span>
                  </div>

                  {/* Thanh tóm tắt nhanh 2 trạng thái */}
                  <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-100 text-[10px] font-bold">
                    <span className="flex items-center gap-1 text-[#92400E] bg-amber-50/80 px-2 py-0.5 rounded-lg border border-amber-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D49A3D]" />
                      Theo dõi: {totalActivePsych}
                    </span>
                    <span className="flex items-center gap-1 text-[#135E5B] bg-teal-50/80 px-2 py-0.5 rounded-lg border border-teal-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#135E5B]" />
                      Chấm dứt: {totalTerminatedPsych}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 overflow-y-auto max-h-[300px] pr-1">
                  {psychGradeStats.map((item, idx) => {
                    const percent = psychologyTargets.length > 0 ? Math.round((item.count / psychologyTargets.length) * 100) : 0
                    const activePercent = item.count > 0 ? Math.round((item.active / item.count) * 100) : 0
                    const termPercent = item.count > 0 ? Math.round((item.terminated / item.count) * 100) : 0
                    const isHighTransition = item.gradeName === "Khối 1" || item.gradeName === "Khối 6" || item.gradeName === "Khối 9" || item.gradeName === "Khối 10"

                    return (
                      <div
                        key={idx}
                        onClick={() => setPsychGradeFilter(psychGradeFilter === item.gradeName ? "ALL" : item.gradeName)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                          psychGradeFilter === item.gradeName
                            ? "bg-amber-50/70 border-amber-400 ring-2 ring-amber-400/20 shadow-xs"
                            : "bg-slate-50/60 border-slate-100 hover:bg-slate-100/70 hover:border-slate-200"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1.5 text-xs">
                          <span className="font-extrabold text-slate-800 flex items-center gap-1.5 truncate">
                            <span className={`w-2 h-2 rounded-full ${isHighTransition ? "bg-amber-500" : "bg-[#135E5B]"} shrink-0`} />
                            <span>{item.gradeName}</span>
                            {isHighTransition && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 font-bold border border-amber-200">
                                Đầu cấp
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.commitmentCount > 0 && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                                ⭐️ {item.commitmentCount}
                              </span>
                            )}
                            <span className="font-black text-slate-800 text-xs">
                              {item.count} HS <span className="text-[10px] font-normal text-slate-400">({percent}%)</span>
                            </span>
                          </div>
                        </div>

                        {/* Thanh tỉ lệ kép trực quan */}
                        <div className="h-2 w-full bg-slate-200/60 rounded-full overflow-hidden flex mb-1.5">
                          <div
                            className="h-full bg-[#D49A3D] transition-all duration-500"
                            style={{ width: `${activePercent}%` }}
                            title={`Đang theo dõi: ${item.active} HS (${activePercent}%)`}
                          />
                          <div
                            className="h-full bg-[#135E5B] transition-all duration-500"
                            style={{ width: `${termPercent}%` }}
                            title={`Đã chấm dứt: ${item.terminated} HS (${termPercent}%)`}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-[#92400E] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D49A3D]" />
                            {item.active} đang theo dõi
                          </span>
                          <span className="text-[#135E5B] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#135E5B]" />
                            {item.terminated} đã chấm dứt
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {psychGradeFilter !== "ALL" ? (
                <button
                  onClick={() => setPsychGradeFilter("ALL")}
                  className="mt-2 text-[11px] font-bold text-[#92400E] hover:underline flex items-center justify-center gap-1 py-1 bg-amber-50/50 rounded-xl border border-amber-100"
                >
                  Bỏ lọc theo khối lớp
                </button>
              ) : (
                <div className="text-[10px] text-center text-slate-400 font-medium py-1">
                  Nhấn vào khối lớp để lọc học sinh
                </div>
              )}
            </div>

            {/* Chiều 3: Thống kê theo GV / Chuyên viên phụ trách */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs flex flex-col justify-between h-[450px]">
              <div>
                <div className="pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-teal-50 text-[#135E5B] rounded-2xl border border-teal-100/60 shadow-xs">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-800">Giáo viên / Chuyên viên</h3>
                        <p className="text-[10px] text-slate-400">Phân công {psychAssignedRate}% ca tâm lý</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-black text-[#135E5B] bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-100">
                      {psychTeacherStats.length} nhân sự
                    </span>
                  </div>

                  {/* Thanh tóm tắt nhanh 2 trạng thái */}
                  <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-100 text-[10px] font-bold">
                    <span className="flex items-center gap-1 text-[#92400E] bg-amber-50/80 px-2 py-0.5 rounded-lg border border-amber-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D49A3D]" />
                      Theo dõi: {totalActivePsych}
                    </span>
                    <span className="flex items-center gap-1 text-[#135E5B] bg-teal-50/80 px-2 py-0.5 rounded-lg border border-teal-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#135E5B]" />
                      Chấm dứt: {totalTerminatedPsych}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 overflow-y-auto max-h-[300px] pr-1">
                  {psychTeacherStats.map((item, idx) => {
                    const percent = psychologyTargets.length > 0 ? Math.round((item.count / psychologyTargets.length) * 100) : 0
                    const activePercent = item.count > 0 ? Math.round((item.active / item.count) * 100) : 0
                    const termPercent = item.count > 0 ? Math.round((item.terminated / item.count) * 100) : 0

                    return (
                      <div
                        key={idx}
                        onClick={() => setPsychTeacherFilter(psychTeacherFilter === item.teacherId ? "ALL" : item.teacherId)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                          psychTeacherFilter === item.teacherId
                            ? "bg-teal-50/70 border-[#135E5B] ring-2 ring-[#135E5B]/20 shadow-xs"
                            : "bg-slate-50/60 border-slate-100 hover:bg-slate-100/70 hover:border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2.5 truncate">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#135E5B] to-teal-500 text-white flex items-center justify-center font-black text-[11px] shadow-xs shrink-0">
                              {item.teacherName.charAt(0)}
                            </div>
                            <div className="truncate">
                              <span className="font-extrabold text-slate-800 text-xs block leading-tight truncate">
                                {item.teacherName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5 truncate">
                                {item.campusList || "Chưa có CS"} • {item.gradeList || "Toàn trường"}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-black text-xs block">
                              {item.count} ca
                            </span>
                          </div>
                        </div>

                        {/* Thanh tỉ lệ kép trực quan */}
                        <div className="h-2 w-full bg-slate-200/60 rounded-full overflow-hidden flex mb-1.5">
                          <div
                            className="h-full bg-[#D49A3D] transition-all duration-500"
                            style={{ width: `${activePercent}%` }}
                            title={`Đang theo dõi: ${item.active} ca (${activePercent}%)`}
                          />
                          <div
                            className="h-full bg-[#135E5B] transition-all duration-500"
                            style={{ width: `${termPercent}%` }}
                            title={`Đã chấm dứt: ${item.terminated} ca (${termPercent}%)`}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-[#92400E] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D49A3D]" />
                            {item.active} theo dõi
                          </span>
                          <span className="text-[#135E5B] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#135E5B]" />
                            {item.terminated} đã xong
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {psychTeacherFilter !== "ALL" ? (
                <button
                  onClick={() => setPsychTeacherFilter("ALL")}
                  className="mt-2 text-[11px] font-bold text-[#135E5B] hover:underline flex items-center justify-center gap-1 py-1 bg-teal-50/50 rounded-xl border border-teal-100"
                >
                  Bỏ lọc theo giáo viên
                </button>
              ) : (
                <div className="text-[10px] text-center text-slate-400 font-medium py-1">
                  Nhấn vào giáo viên để lọc học sinh
                </div>
              )}
            </div>

          </div>

          {/* 1.4 DANH SÁCH HỌC SINH TÂM LÝ CHI TIẾT & BỘ LỌC ĐA NĂNG (TÍCH HỢP BỘ LỌC CƠ SỞ, GIÁO VIÊN & PHÂN TRANG GỌN GÀNG) */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 md:p-6 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <HeartHandshake className="h-5 w-5 text-violet-600" />
                  Danh sách Học sinh Hỗ trợ Tâm lý Học đường
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-black">
                    {filteredPsychStudents.length === psychologyTargets.length
                      ? `${psychologyTargets.length} HS`
                      : `${filteredPsychStudents.length} / ${psychologyTargets.length} HS`}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hồ sơ học sinh cần can thiệp tâm lý, nhận diện diện cam kết, chuyên viên phụ trách và mốc kết thúc theo dõi
                </p>
              </div>

              {/* Tùy chọn số lượng hiển thị trên trang */}
              <div className="flex items-center gap-1.5 self-start lg:self-center bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/80 text-[11px] font-bold text-slate-600">
                <span className="px-2 text-slate-400">Xem:</span>
                {[
                  { label: "15", value: 15 },
                  { label: "20", value: 20 },
                  { label: "50", value: 50 },
                  { label: "Tất cả", value: -1 }
                ].map(sz => (
                  <button
                    key={sz.value}
                    onClick={() => {
                      setPsychPageSize(sz.value)
                      setPsychPage(1)
                    }}
                    className={`px-2 py-1 rounded-lg transition-all ${
                      psychPageSize === sz.value
                        ? "bg-white text-[#135E5B] shadow-xs font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={psychSearch}
                  onChange={(e) => setPsychSearch(e.target.value)}
                  placeholder="Tìm tên, mã HS, lớp, ghi chú..."
                  className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#135E5B] w-44 md:w-56 bg-slate-50/50"
                />
              </div>

              {/* BỘ LỌC CƠ SỞ (YÊU CẦU TRỌNG TÂM) */}
              <select
                value={psychCampusFilter}
                onChange={(e) => setPsychCampusFilter(e.target.value)}
                className={`py-1.5 px-3 text-xs rounded-xl border font-bold focus:outline-none focus:ring-2 focus:ring-[#135E5B] transition-colors ${
                  psychCampusFilter !== "ALL"
                    ? "bg-teal-50 text-[#135E5B] border-[#135E5B] font-black"
                    : "bg-slate-50/50 text-slate-700 border-slate-200"
                }`}
              >
                <option value="ALL">🏫 Tất cả Cơ sở</option>
                {campuses.map(c => (
                  <option key={c.id} value={c.id}>{c.campusName}</option>
                ))}
              </select>

              {/* BỘ LỌC GIÁO VIÊN / CHUYÊN VIÊN (YÊU CẦU TRỌNG TÂM) */}
              <select
                value={psychTeacherFilter}
                onChange={(e) => setPsychTeacherFilter(e.target.value)}
                className={`py-1.5 px-3 text-xs rounded-xl border font-bold focus:outline-none focus:ring-2 focus:ring-[#135E5B] transition-colors ${
                  psychTeacherFilter !== "ALL"
                    ? "bg-teal-50 text-[#135E5B] border-[#135E5B] font-black"
                    : "bg-slate-50/50 text-slate-700 border-slate-200"
                }`}
              >
                <option value="ALL">👤 Tất cả GV / Chuyên viên</option>
                {psychTeacherStats.map((t) => (
                  <option key={t.teacherId} value={t.teacherId}>
                    {t.teacherName} ({t.count} ca)
                  </option>
                ))}
              </select>

              {/* Grade Filter */}
              <select
                value={psychGradeFilter}
                onChange={(e) => setPsychGradeFilter(e.target.value)}
                className={`py-1.5 px-3 text-xs rounded-xl border font-bold focus:outline-none focus:ring-2 focus:ring-[#135E5B] ${
                  psychGradeFilter !== "ALL"
                    ? "bg-teal-50 text-[#135E5B] border-[#135E5B] font-black"
                    : "bg-slate-50/50 text-slate-700 border-slate-200"
                }`}
              >
                <option value="ALL">Tất cả Khối</option>
                {psychGradeStats.map((g, i) => (
                  <option key={i} value={g.gradeName}>{g.gradeName}</option>
                ))}
              </select>

              {/* BỘ LỌC DIỆN CAM KẾT TÂM LÝ */}
              <select
                value={psychCommitmentFilter}
                onChange={(e: any) => setPsychCommitmentFilter(e.target.value)}
                className={`py-1.5 px-3 text-xs rounded-xl border font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  psychCommitmentFilter === "COMMITMENT_ONLY"
                    ? "bg-amber-100 text-amber-900 border-amber-300 font-black"
                    : "bg-slate-50/50 text-slate-700 border-slate-200"
                }`}
              >
                <option value="ALL">Tất cả diện can thiệp</option>
                <option value="COMMITMENT_ONLY">⭐️ Chỉ HS có Cam kết Tâm lý ({psychCommitmentTargets.length})</option>
                <option value="REGULAR_ONLY">HS Theo dõi thường kỳ ({psychologyTargets.length - psychCommitmentTargets.length})</option>
              </select>

              {/* Trạng thái Filter */}
              <select
                value={psychStatusFilter}
                onChange={(e) => setPsychStatusFilter(e.target.value)}
                className={`py-1.5 px-3 text-xs rounded-xl border font-bold focus:outline-none focus:ring-2 focus:ring-[#135E5B] ${
                  psychStatusFilter !== "ALL"
                    ? "bg-teal-50 text-[#135E5B] border-[#135E5B] font-black"
                    : "bg-slate-50/50 text-slate-700 border-slate-200"
                }`}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">🟡 Đang theo dõi ({totalActivePsych})</option>
                <option value="PENDING_TERMINATION">⏳ Chờ duyệt kết thúc ({psychologyTargets.filter(t => t.terminationStatus === "PENDING_TERMINATION").length})</option>
                <option value="TERMINATED">🏁 Đã chấm dứt theo dõi ({totalTerminatedPsych})</option>
              </select>

              {/* BỘ LỌC THÁNG CHẤM DỨT THEO DÕI */}
              {psychTerminatedMonths.length > 0 && (
                <select
                  value={psychTermMonthFilter}
                  onChange={(e) => setPsychTermMonthFilter(e.target.value)}
                  className={`py-1.5 px-3 text-xs rounded-xl border font-bold focus:outline-none focus:ring-2 focus:ring-[#135E5B] ${
                    psychTermMonthFilter !== "ALL"
                      ? "bg-teal-50 text-[#135E5B] border-[#135E5B] font-black"
                      : "bg-slate-50/50 text-slate-700 border-slate-200"
                  }`}
                >
                  <option value="ALL">Tất cả tháng kết thúc</option>
                  {psychTerminatedMonths.map(m => (
                    <option key={m.month} value={m.month}>
                      Chấm dứt trong Tháng {m.month} ({m.count} ca)
                    </option>
                  ))}
                </select>
              )}

              {/* Reset Filter Button */}
              {(psychSearch || psychCampusFilter !== "ALL" || psychGradeFilter !== "ALL" || psychTeacherFilter !== "ALL" || psychStatusFilter !== "ALL" || psychCommitmentFilter !== "ALL" || psychTermMonthFilter !== "ALL") && (
                <button
                  onClick={() => {
                    setPsychSearch("")
                    setPsychCampusFilter("ALL")
                    setPsychGradeFilter("ALL")
                    setPsychTeacherFilter("ALL")
                    setPsychStatusFilter("ALL")
                    setPsychCommitmentFilter("ALL")
                    setPsychTermMonthFilter("ALL")
                  }}
                  className="py-1.5 px-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold transition-colors flex items-center gap-1"
                  title="Đặt lại toàn bộ bộ lọc"
                >
                  <RefreshCw className="w-3 h-3" />
                  Xóa lọc
                </button>
              )}
            </div>

            {/* Table */}
            {filteredPsychStudents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Brain className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-xs">Không tìm thấy học sinh tâm lý nào phù hợp với bộ lọc</p>
                <button
                  onClick={() => {
                    setPsychSearch("")
                    setPsychCampusFilter("ALL")
                    setPsychGradeFilter("ALL")
                    setPsychTeacherFilter("ALL")
                    setPsychStatusFilter("ALL")
                    setPsychCommitmentFilter("ALL")
                    setPsychTermMonthFilter("ALL")
                  }}
                  className="mt-2 text-xs font-bold text-[#135E5B] hover:underline"
                >
                  Xóa toàn bộ điều kiện lọc
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-xxs">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead className="bg-slate-50/90 font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-3 py-2.5 text-center w-12">STT</th>
                      <th className="px-3 py-2.5 text-left">Học sinh</th>
                      <th className="px-3 py-2.5 text-left">Lớp & Cơ sở</th>
                      <th className="px-3 py-2.5 text-left">Diện can thiệp</th>
                      <th className="px-3 py-2.5 text-left">GV / Chuyên viên</th>
                      <th className="px-3 py-2.5 text-center">Mốc thời gian</th>
                      <th className="px-3 py-2.5 text-left">Vấn đề / Lý do</th>
                      <th className="px-3 py-2.5 text-center">Trạng thái & Kết quả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                    {paginatedPsychStudents.map((t, idx) => {
                      const globalIdx = (psychPage - 1) * (psychPageSize === -1 ? filteredPsychStudents.length : psychPageSize) + idx + 1
                      const sName = t.student?.studentName || "Không rõ"
                      const sCode = t.student?.studentCode || "—"
                      const className = (t.student?.class?.className || "").split(/[_-]/)[0]
                      const campusName = t.student?.class?.campus?.campusName || "Không rõ"
                      const teacherNames = (t.assignments || []).map((a: any) => a.teacher?.teacherName).filter(Boolean)
                      const teacherDisplay = teacherNames.length > 0 ? teacherNames.join(", ") : (t.createdBy?.teacherName || "Chưa phân công")
                      const startDate = t.startDate ? new Date(t.startDate).toLocaleDateString("vi-VN") : "—"
                      const isTerminated = t.terminationStatus === "TERMINATED"
                      const endDateObj = isTerminated && t.endDate ? new Date(t.endDate) : (isTerminated && t.updatedAt ? new Date(t.updatedAt) : null)
                      const endDate = endDateObj ? endDateObj.toLocaleDateString("vi-VN") : null
                      const endMonthStr = endDateObj ? `Th ${endDateObj.getMonth() + 1}/${endDateObj.getFullYear()}` : null
                      const isCommitment = isPsychCommitment(t)

                      return (
                        <tr 
                          key={idx} 
                          className={`hover:bg-teal-50/20 transition-colors ${
                            isTerminated ? "bg-emerald-50/10" : isCommitment ? "bg-amber-50/10" : ""
                          }`}
                        >
                          {/* STT */}
                          <td className="px-3 py-2.5 text-center text-slate-400 font-bold text-xs">{globalIdx}</td>

                          {/* Học sinh & Nhận diện Cam kết */}
                          <td className="px-3 py-2.5">
                            <div className="flex items-start gap-1.5">
                              <div>
                                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                  <span>{sName}</span>
                                  {isCommitment && (
                                    <span 
                                      className="px-1.5 py-0.5 rounded bg-amber-500 text-white font-black text-[9px] uppercase tracking-wider shadow-xxs inline-flex items-center gap-0.5"
                                      title="Học sinh thuộc diện Cam kết Tâm lý đầu vào / Hồ sơ cam kết"
                                    >
                                      <Sparkles className="w-2.5 h-2.5 fill-white" />
                                      Cam kết
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                  <span>{sCode}</span>
                                  {t.student?.gender && (
                                    <>
                                      <span>•</span>
                                      <span>{t.student.gender === "MALE" ? "Nam" : "Nữ"}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Lớp & Cơ sở */}
                          <td className="px-3 py-2.5">
                            <span className="font-bold text-slate-800 text-xs">Lớp {className}</span>
                            <div className="text-[10px] text-[#135E5B] font-semibold mt-0.5">{campusName}</div>
                          </td>

                          {/* Diện can thiệp */}
                          <td className="px-3 py-2.5">
                            {isCommitment ? (
                              <div className="space-y-0.5">
                                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 font-extrabold text-[10px] border border-amber-200 inline-flex items-center gap-1">
                                  <HeartHandshake className="w-2.5 h-2.5 text-amber-600" />
                                  Cam kết KS đầu vào
                                </span>
                                {(t.commitmentNote || t.assessmentDirectorNote) && (
                                  <p 
                                    className="text-[9px] text-amber-800 font-medium truncate max-w-[170px]" 
                                    title={t.assessmentDirectorNote || t.commitmentNote}
                                  >
                                    {t.assessmentDirectorNote || t.commitmentNote}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[10px]">
                                {t.sourceType === "TAM_LY" ? "Đề xuất Tổ Tâm lý" : t.sourceType === "GVCN" ? "Đề xuất GVCN" : "Thường kỳ"}
                              </span>
                            )}
                          </td>

                          {/* GV / Chuyên viên */}
                          <td className="px-3 py-2.5">
                            <span className="font-bold text-indigo-900 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100 inline-block text-[11px]">
                              {teacherDisplay}
                            </span>
                          </td>

                          {/* Mốc thời gian */}
                          <td className="px-3 py-2.5 text-center">
                            <div className="text-[11px] font-medium text-slate-700">
                              {startDate}
                            </div>
                            {isTerminated && endDate && (
                              <div className="mt-0.5">
                                <span className="px-1.5 py-0.5 rounded bg-teal-50 text-[#135E5B] font-bold text-[9px] border border-teal-200 inline-flex items-center gap-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-[#135E5B]" />
                                  KT: {endDate}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Vấn đề / Lý do */}
                          <td className="px-3 py-2.5 max-w-[200px]">
                            <p className="text-slate-600 truncate text-[11px]" title={t.reason || t.notes || "Theo dõi tâm lý định kỳ"}>
                              {t.reason || t.notes || "Theo dõi tâm lý định kỳ"}
                            </p>
                          </td>

                          {/* Trạng thái & Kết quả */}
                          <td className="px-3 py-2.5 text-center">
                            {isTerminated ? (
                              <div className="space-y-0.5">
                                <span className="px-2 py-0.5 rounded-full bg-teal-50 text-[#135E5B] font-black text-[10px] border border-teal-200 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-[#135E5B]" />
                                  ĐÃ CHẤM DỨT
                                </span>
                                {t.status && t.status !== "Tiếp tục theo dõi" && (
                                  <div className="text-[9px] text-slate-500 font-bold uppercase truncate max-w-[130px]" title={t.status}>
                                    {t.status}
                                  </div>
                                )}
                              </div>
                            ) : t.terminationStatus === "PENDING_TERMINATION" ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black text-[10px] border border-amber-200 inline-flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 text-amber-600" />
                                CHỜ DUYỆT
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-[#92400E] font-black text-[10px] border border-[#D49A3D]/40 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#D49A3D] animate-pulse" />
                                ĐANG THEO DÕI
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {/* Phân trang & Thanh điều hướng gọn gàng */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/70 border-t border-slate-100 text-xs">
                  <div className="text-slate-500 font-medium">
                    Hiển thị <span className="font-extrabold text-slate-800">{psychPageSize === -1 ? 1 : Math.min((psychPage - 1) * psychPageSize + 1, filteredPsychStudents.length)}</span> - <span className="font-extrabold text-slate-800">{psychPageSize === -1 ? filteredPsychStudents.length : Math.min(psychPage * psychPageSize, filteredPsychStudents.length)}</span> trên tổng số <span className="font-extrabold text-[#135E5B]">{filteredPsychStudents.length}</span> học sinh
                  </div>

                  {psychPageSize !== -1 && totalPsychPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPsychPage(p => Math.max(1, p - 1))}
                        disabled={psychPage === 1}
                        className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Trang trước"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPsychPages }, (_, i) => i + 1).map(page => {
                          if (
                            totalPsychPages > 7 &&
                            page !== 1 &&
                            page !== totalPsychPages &&
                            Math.abs(page - psychPage) > 1
                          ) {
                            if (page === 2 || page === totalPsychPages - 1) {
                              return <span key={page} className="px-1 text-slate-400 font-bold">...</span>
                            }
                            return null
                          }

                          return (
                            <button
                              key={page}
                              onClick={() => setPsychPage(page)}
                              className={`min-w-[28px] h-7 px-2 rounded-xl text-xs font-bold transition-all ${
                                psychPage === page
                                  ? "bg-[#135E5B] text-white shadow-xs font-black"
                                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {page}
                            </button>
                          )
                        })}
                      </div>

                      <button
                        onClick={() => setPsychPage(p => Math.min(totalPsychPages, p + 1))}
                        disabled={psychPage === totalPsychPages}
                        className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Trang sau"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
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
