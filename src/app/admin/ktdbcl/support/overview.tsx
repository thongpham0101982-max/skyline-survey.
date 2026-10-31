"use client"

import { useMemo, useState, useEffect } from "react"
import {
  Users, BookOpen, Brain, Bell,
  AlertCircle, GraduationCap,
  Building2, Sparkles, TrendingUp, Clock,
  Filter, Search, RefreshCw, CheckCircle2,
  Calendar, Layers, ShieldCheck, HeartHandshake,
  UserCheck, AlertTriangle, ChevronRight, ChevronLeft, UserPlus,
  Compass, ArrowUpRight, ArrowDownRight, Award,
  FileSpreadsheet, Download, Printer,
  SlidersHorizontal, RotateCcw, Activity, BarChart3
} from "lucide-react"
import toast from "react-hot-toast"
import { exportTeacherProgressReportExcel } from "@/lib/support/exportTrackingBookExcel"
import { TeacherProgressPdfModal } from "./TeacherProgressPdfModal"
import { KPICard } from "@/components/KPICard"
import { DashboardChartCard } from "@/components/dashboard/DashboardChartCard"
import { SmartAlertCenter, SmartAlertItem } from "@/components/dashboard/SmartAlertCenter"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LabelList
} from "recharts"

// Bảng màu định danh chuẩn 5 Cơ sở theo chuẩn Flexidata (skyline-dashboard-design)
const CAMPUS_COLOR_MAP: Record<string, { hex: string; bg: string; text: string; border: string }> = {
  CS1: { hex: "#48BFE3", bg: "bg-[#48BFE3]/10", text: "text-[#0284C7]", border: "border-[#48BFE3]/30" },
  CS2: { hex: "#6C5CE7", bg: "bg-[#6C5CE7]/10", text: "text-[#6C5CE7]", border: "border-[#6C5CE7]/30" },
  CS3: { hex: "#2E1065", bg: "bg-[#2E1065]/10", text: "text-[#2E1065]", border: "border-[#2E1065]/30" },
  CS4: { hex: "#D97706", bg: "bg-[#D97706]/10", text: "text-[#D97706]", border: "border-[#D97706]/30" },
  CS5: { hex: "#475569", bg: "bg-[#475569]/10", text: "text-[#475569]", border: "border-[#475569]/30" },
}

function getCampusColorInfo(campusName: string = "", idx: number = 0) {
  const upper = campusName.toUpperCase()
  for (const key of ["CS1", "CS2", "CS3", "CS4", "CS5"]) {
    if (upper.includes(key)) return CAMPUS_COLOR_MAP[key]
  }
  const fallbackKeys = ["CS1", "CS2", "CS3", "CS4", "CS5"]
  return CAMPUS_COLOR_MAP[fallbackKeys[idx % fallbackKeys.length]]
}

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
  // HÀM XUẤT BÁO CÁO THEO DÕI TIẾN ĐỘ THEO CƠ SỞ & THEO TỪNG GIÁO VIÊN
  // =========================================================================
  const handleExportTeacherReport = (
    teacherId: string = "ALL",
    teacherName?: string,
    campusId: string = "ALL",
    campusName?: string
  ) => {
    try {
      const yearName = academicYears?.find((y: any) => y.id === selectedYearId)?.name || "2026-2027"
      const targetList = supportScope === "PSYCHOLOGICAL" ? psychologyTargets : academicTargets
      
      const fileName = exportTeacherProgressReportExcel(targetList, {
        teacherId,
        teacherName,
        campusId,
        campusName,
        academicYearName: yearName,
        selectedMonth: "Tháng 10",
        supportType: supportScope
      })

      if (campusId !== "ALL" && teacherId === "ALL") {
        toast.success(`Đã xuất Sổ theo dõi đánh giá của ${campusName || "Cơ sở"}: ${fileName}`, { duration: 4500 })
      } else if (teacherId === "ALL") {
        toast.success(`Đã xuất Sổ theo dõi đánh giá theo Cơ sở & Giáo viên: ${fileName}`, { duration: 4500 })
      } else {
        toast.success(`Đã xuất Báo cáo tiến độ của ${teacherName || "Giáo viên"}: ${fileName}`, { duration: 4500 })
      }
    } catch (err: any) {
      console.error("Export teacher report error:", err)
      toast.error(err?.message || "Lỗi khi xuất báo cáo")
    }
  }

  // Quản lý Modal Xem trước & Xuất PDF Báo Cáo Tiến Độ (Theo Cơ sở & GV)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [pdfTeacherId, setPdfTeacherId] = useState<string>("ALL")
  const [pdfCampusId, setPdfCampusId] = useState<string>("ALL")

  const handleOpenPdfModal = (teacherId: string = "ALL", campusId: string = "ALL") => {
    setPdfTeacherId(teacherId)
    setPdfCampusId(campusId)
    setIsPdfModalOpen(true)
  }

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
    const map: Record<string, { teacherId: string; teacherName: string; count: number; campusNames: Set<string>; subjects: Set<string> }> = {}

    academicTargets.forEach(t => {
      const tAssigns = (t.assignments || []).filter((a: any) => a.teacher)
      const campusName = t.student?.class?.campus?.campusName || ""

      if (tAssigns.length === 0) {
        const key = "UNASSIGNED"
        if (!map[key]) map[key] = { teacherId: "UNASSIGNED", teacherName: "Chưa phân công GV", count: 0, campusNames: new Set(), subjects: new Set() }
        map[key].count++
        if (campusName) map[key].campusNames.add(campusName)
      } else {
        tAssigns.forEach((a: any) => {
          const tId = a.teacher.id || a.teacher.teacherName
          const tName = a.teacher.teacherName
          if (!map[tId]) map[tId] = { teacherId: tId, teacherName: tName, count: 0, campusNames: new Set(), subjects: new Set() }
          map[tId].count++
          if (campusName) map[tId].campusNames.add(campusName)
          if (a.subject?.subjectName) map[tId].subjects.add(a.subject.subjectName)
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

  // =========================================================================
  // 12. FLEXIDATA EXECUTIVE METRICS & SMART ALERTS (SKYLINE-DASHBOARD-DESIGN)
  // =========================================================================
  const [distributionTab, setDistributionTab] = useState<"CAMPUS" | "GRADE" | "TEACHER">("CAMPUS")

  // Thống kê tiến độ đánh giá định kỳ (Tuần / Tháng) thực tế của HS Tâm lý đang theo dõi
  const psychPeriodicEvalStats = useMemo(() => {
    const activeTargets = psychologyTargets.filter(t => t.terminationStatus === "ACTIVE")
    let evaluatedActiveCount = 0
    activeTargets.forEach(t => {
      const hasEval = (Array.isArray(t.evaluations) && t.evaluations.length > 0) || Boolean(t.status && t.status.trim() !== "")
      if (hasEval) evaluatedActiveCount++
    })
    const evalRate = activeTargets.length > 0
      ? Math.round((evaluatedActiveCount / activeTargets.length) * 100)
      : 100
    return {
      activeTotal: activeTargets.length,
      evaluatedActiveCount,
      missingEvalCount: Math.max(0, activeTargets.length - evaluatedActiveCount),
      evalRate,
    }
  }, [psychologyTargets])

  // Cảnh báo Điều hành Thông minh (SmartAlertCenter) tự động phát hiện điểm nghẽn
  const supportSmartAlerts = useMemo<SmartAlertItem[]>(() => {
    const list: SmartAlertItem[] = []

    const unassignedPsych = psychologyTargets.filter(
      t => t.terminationStatus === "ACTIVE" && !(t.assignments || []).some((a: any) => a.teacher)
    ).length
    if (unassignedPsych > 0) {
      list.push({
        id: "unassigned-psych",
        severity: "CRITICAL",
        category: "STUDENT_SUPPORT",
        categoryLabel: "Phân công Chuyên viên",
        scopeText: "Hỗ trợ Tâm lý",
        title: `${unassignedPsych} học sinh Tâm lý đang theo dõi chưa được phân công Giáo viên / Chuyên viên`,
        description: "Cần phân công chuyên viên phụ trách để thiết lập lộ trình đồng hành và cập nhật sổ theo dõi định kỳ.",
        metricBadge: `${unassignedPsych} HS chưa phân công`,
        actionLabel: "Lọc HS chưa phân công",
        onClick: () => {
          setSupportScope("PSYCHOLOGICAL")
          setPsychTeacherFilter("UNASSIGNED")
        },
      })
    }

    if (psychPeriodicEvalStats.missingEvalCount > 0) {
      list.push({
        id: "missing-periodic-eval",
        severity: "WARNING",
        category: "PROGRESS_GAP",
        categoryLabel: "Đánh giá Định kỳ Tuần/Tháng",
        scopeText: "Toàn hệ thống CS1–CS5",
        title: `${psychPeriodicEvalStats.missingEvalCount}/${psychPeriodicEvalStats.activeTotal} học sinh đang theo dõi cần cập nhật nhận xét định kỳ`,
        description: `Tiến độ cập nhật đánh giá định kỳ hiện đạt ${psychPeriodicEvalStats.evalRate}%. Có thể xuất Sổ PDF theo Cơ sở & GV để rà soát chi tiết.`,
        metricBadge: `Đạt ${psychPeriodicEvalStats.evalRate}%`,
        actionLabel: "Mở Sổ PDF rà soát",
        onClick: () => handleOpenPdfModal(psychTeacherFilter, psychCampusFilter),
      })
    }

    if (psychCommitmentActive > 0) {
      list.push({
        id: "active-commitment-psych",
        severity: "INFO",
        category: "STUDENT_SUPPORT",
        categoryLabel: "Cam kết Đầu vào (CKĐV)",
        scopeText: "Diện Cam kết Tâm lý",
        title: `${psychCommitmentActive} học sinh diện Cam kết Tâm lý đang trong lộ trình theo dõi sát hàng tuần`,
        description: `Tổng cộng ${psychCommitmentTargets.length} hồ sơ cam kết (${psychCommitmentActive} đang theo dõi, ${psychCommitmentTerminated} đã hoàn thành mục tiêu).`,
        metricBadge: `${psychCommitmentActive} HS Cam kết`,
        actionLabel: "Lọc diện Cam kết",
        onClick: () => {
          setSupportScope("PSYCHOLOGICAL")
          setPsychCommitmentFilter(psychCommitmentFilter === "COMMITMENT_ONLY" ? "ALL" : "COMMITMENT_ONLY")
        },
      })
    }

    if (totalPendingTerm > 0) {
      list.push({
        id: "pending-termination",
        severity: "WARNING",
        category: "OVERDUE_TASK",
        categoryLabel: "Phê duyệt Kết thúc",
        scopeText: "BGH / KT&ĐBCL",
        title: `${totalPendingTerm} hồ sơ đề xuất chấm dứt hỗ trợ đang chờ Ban Giám hiệu / KT&ĐBCL phê duyệt`,
        description: "Kiểm tra kết quả đánh giá cuối kỳ trước khi xác nhận hoàn thành lộ trình hỗ trợ.",
        metricBadge: `${totalPendingTerm} chờ duyệt`,
        actionLabel: "Xem đề xuất",
        onClick: () => {
          setSupportScope("PSYCHOLOGICAL")
          setPsychStatusFilter("PENDING_TERMINATION")
        },
      })
    }

    return list
  }, [
    psychologyTargets,
    psychPeriodicEvalStats,
    psychCommitmentActive,
    psychCommitmentTargets.length,
    psychCommitmentTerminated,
    totalPendingTerm,
    psychTeacherFilter,
    psychCampusFilter,
    psychCommitmentFilter,
  ])

  const hasActivePsychFilters =
    Boolean(psychSearch) ||
    psychCampusFilter !== "ALL" ||
    psychGradeFilter !== "ALL" ||
    psychTeacherFilter !== "ALL" ||
    psychStatusFilter !== "ALL" ||
    psychCommitmentFilter !== "ALL" ||
    psychTermMonthFilter !== "ALL"

  const resetAllPsychFilters = () => {
    setPsychSearch("")
    setPsychCampusFilter("ALL")
    setPsychGradeFilter("ALL")
    setPsychTeacherFilter("ALL")
    setPsychStatusFilter("ALL")
    setPsychCommitmentFilter("ALL")
    setPsychTermMonthFilter("ALL")
  }

  return (
    <div className="space-y-5 text-slate-800 animate-in fade-in duration-300">

      {/* =====================================================================
          UNIFIED EXECUTIVE FILTER & CONTROL BAR (CHUẨN MẪU FLEXIDATA)
          ===================================================================== */}
      <div className="no-campus-banner bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden sticky top-2 z-20">
        {/* Tầng 1: Nhận diện Phân hệ + Chuyển đổi Góc nhìn + Xuất Sổ PDF / Excel Điều hành */}
        <div className="px-4 py-3 sm:px-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-xl text-white shadow-xs shrink-0 ${
              supportScope === "PSYCHOLOGICAL"
                ? "bg-gradient-to-tr from-[#003B3A] to-[#00A19A]"
                : supportScope === "ACADEMIC"
                ? "bg-gradient-to-tr from-blue-600 to-teal-500"
                : "bg-gradient-to-tr from-[#135E5B] to-[#1E8B87]"
            }`}>
              {supportScope === "PSYCHOLOGICAL" ? <Brain className="w-4 h-4" /> : supportScope === "ACADEMIC" ? <BookOpen className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  {supportScope === "PSYCHOLOGICAL" && "Trung tâm Điều hành Hỗ trợ Tâm lý Học đường"}
                  {supportScope === "ACADEMIC" && "Trung tâm Điều hành Phụ đạo Văn hóa & Học thuật"}
                  {supportScope === "ALL" && "Báo cáo Điều hành Hợp nhất Học thuật & Tâm lý"}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-teal-50 text-[#003B3A] border border-teal-200/70">
                  Flexidata Executive
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                {supportScope === "PSYCHOLOGICAL" && "Giám sát lưu lượng theo dõi, diện cam kết tâm lý, tiến độ đánh giá định kỳ Tuần/Tháng của Chuyên viên theo từng Cơ sở"}
                {supportScope === "ACADEMIC" && "Giám sát kế hoạch bồi dưỡng kiến thức, phân công giáo viên bộ môn và đánh giá sự tiến bộ học tập"}
                {supportScope === "ALL" && "Hệ thống chỉ số tích hợp toàn trường giữa hai mảng Phụ đạo Văn hóa và Tư vấn Tâm lý học đường"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {/* Segmented Scope Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-100/90 border border-slate-200/70 rounded-xl overflow-x-auto">
              <button
                onClick={() => setSupportScope("PSYCHOLOGICAL")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-lg transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  supportScope === "PSYCHOLOGICAL"
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Hỗ trợ Tâm lý</span>
                <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold tabular-nums ${
                  supportScope === "PSYCHOLOGICAL"
                    ? "bg-white/20 text-white"
                    : "bg-teal-100 text-[#003B3A]"
                }`}>
                  {psychologyTargets.length}
                </span>
              </button>

              <button
                onClick={() => setSupportScope("ACADEMIC")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-lg transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  supportScope === "ACADEMIC"
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Phụ đạo Văn hóa</span>
                <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold tabular-nums ${
                  supportScope === "ACADEMIC"
                    ? "bg-white/20 text-white"
                    : "bg-blue-100 text-blue-700"
                }`}>
                  {academicTargets.length}
                </span>
              </button>

              <button
                onClick={() => setSupportScope("ALL")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  supportScope === "ALL"
                    ? "bg-slate-800 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Toàn cảnh Hợp nhất</span>
                <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold tabular-nums ${
                  supportScope === "ALL"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}>
                  {targets.length}
                </span>
              </button>
            </div>

            {/* Nút Xuất Sổ PDF & Excel Trực tiếp trên Thanh Điều hành */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleOpenPdfModal(psychTeacherFilter, psychCampusFilter)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/90 text-xs font-black shadow-2xs transition-all cursor-pointer"
                title="Xem trước & Xuất Sổ PDF chuẩn A4 theo Cơ sở & Giáo viên định kỳ Tuần/Tháng"
              >
                <Printer className="w-3.5 h-3.5 text-rose-600" />
                <span>Sổ PDF (Cơ sở &amp; GV)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const curTeacher = psychTeacherStats.find(t => t.teacherId === psychTeacherFilter)
                  const curCampus = psychCampusStats.find(c => c.campusId === psychCampusFilter)
                  handleExportTeacherReport(
                    psychTeacherFilter,
                    curTeacher?.teacherName,
                    psychCampusFilter,
                    curCampus?.campusName
                  )
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#003B3A] hover:bg-[#002827] text-white text-xs font-black shadow-2xs transition-all cursor-pointer"
                title="Xuất Sổ theo dõi đánh giá Excel đa sheet theo Cơ sở & Giáo viên"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#2DD4BF]" />
                <span>Xuất Excel</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tầng 2: Thanh Bộ lọc Điều hành Hợp nhất (Unified Filter Bar chuẩn Flexidata) */}
        {supportScope === "PSYCHOLOGICAL" && (
          <div className="px-4 py-2.5 sm:px-5 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#003B3A] text-white text-[11px] font-bold tracking-wide uppercase shadow-2xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#2DD4BF]" />
                <span>Bộ lọc Điều hành</span>
              </div>

              {/* Filter Cơ sở */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-xl px-2.5 py-1 hover:border-teal-500/40 transition-colors">
                <Building2 className="w-3.5 h-3.5 text-[#00A19A] shrink-0" />
                <span className="text-[11px] font-semibold text-slate-400">Cơ sở:</span>
                <select
                  value={psychCampusFilter}
                  onChange={(e) => setPsychCampusFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="ALL">Tất cả Cơ sở ({campuses.length})</option>
                  {campuses.map(c => (
                    <option key={c.id} value={c.id}>{c.campusName}</option>
                  ))}
                </select>
              </div>

              {/* Filter Khối lớp */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-xl px-2.5 py-1 hover:border-teal-500/40 transition-colors">
                <Compass className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                <span className="text-[11px] font-semibold text-slate-400">Khối:</span>
                <select
                  value={psychGradeFilter}
                  onChange={(e) => setPsychGradeFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="ALL">Tất cả Khối ({psychGradeStats.length})</option>
                  {psychGradeStats.map((g, i) => (
                    <option key={i} value={g.gradeName}>{g.gradeName} ({g.count})</option>
                  ))}
                </select>
              </div>

              {/* Filter GV / Chuyên viên */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-xl px-2.5 py-1 hover:border-teal-500/40 transition-colors">
                <GraduationCap className="w-3.5 h-3.5 text-[#003B3A] shrink-0" />
                <span className="text-[11px] font-semibold text-slate-400">Chuyên viên:</span>
                <select
                  value={psychTeacherFilter}
                  onChange={(e) => setPsychTeacherFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1 max-w-[170px] truncate"
                >
                  <option value="ALL">Tất cả GV ({psychTeacherStats.length})</option>
                  {psychTeacherStats.map(t => (
                    <option key={t.teacherId} value={t.teacherId}>
                      {t.teacherName} ({t.count} ca)
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Diện can thiệp */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-xl px-2.5 py-1 hover:border-amber-500/40 transition-colors">
                <HeartHandshake className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-400">Diện:</span>
                <select
                  value={psychCommitmentFilter}
                  onChange={(e: any) => setPsychCommitmentFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="ALL">Tất cả diện ({psychologyTargets.length})</option>
                  <option value="COMMITMENT_ONLY">⭐️ Cam kết Tâm lý ({psychCommitmentTargets.length})</option>
                  <option value="REGULAR_ONLY">Theo dõi thường kỳ ({psychologyTargets.length - psychCommitmentTargets.length})</option>
                </select>
              </div>

              {/* Filter Trạng thái */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-xl px-2.5 py-1 hover:border-teal-500/40 transition-colors">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-400">Trạng thái:</span>
                <select
                  value={psychStatusFilter}
                  onChange={(e) => setPsychStatusFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="ALL">Tất cả ({psychologyTargets.length})</option>
                  <option value="ACTIVE">Đang theo dõi ({totalActivePsych})</option>
                  <option value="PENDING_TERMINATION">Chờ duyệt ({psychologyTargets.filter(t => t.terminationStatus === "PENDING_TERMINATION").length})</option>
                  <option value="TERMINATED">Đã chấm dứt ({totalTerminatedPsych})</option>
                </select>
              </div>

              {/* Ô tìm kiếm nhanh */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={psychSearch}
                  onChange={(e) => setPsychSearch(e.target.value)}
                  placeholder="Tìm tên, mã HS, lớp..."
                  className="pl-8 pr-3 py-1 text-xs rounded-xl border border-slate-200/90 bg-white focus:outline-none focus:ring-2 focus:ring-[#00A19A] w-40 sm:w-48 font-medium"
                />
              </div>
            </div>

            {/* Bên phải: Trạng thái hiển thị + Đặt lại bộ lọc */}
            <div className="flex items-center gap-2 ml-auto">
              {hasActivePsychFilters && (
                <button
                  type="button"
                  onClick={resetAllPsychFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Đặt lại</span>
                </button>
              )}
              <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-white px-2.5 py-1 rounded-xl border border-slate-200/80">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono tabular-nums text-[#003B3A] font-black">{filteredPsychStudents.length}</span>
                <span>/ {psychologyTargets.length} hồ sơ</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          PHÂN HỆ 1: DASHBOARD HỖ TRỢ TÂM LÝ HỌC ĐƯỜNG (CHUẨN FLEXIDATA)
          ===================================================================== */}
      {supportScope === "PSYCHOLOGICAL" && (
        <div className="space-y-5 animate-in fade-in duration-300">

          {/* 1.1 DẢI 5 THẺ CHỈ SỐ ĐIỀU HÀNH CHUẨN KPICARD FLEXIDATA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <KPICard
              title="Hồ sơ Tâm lý Theo dõi"
              value={psychologyTargets.length}
              unit="học sinh"
              icon={Brain}
              colorTheme="teal"
              trend="neutral"
              trendValue={`${Math.round((totalActivePsych / (psychologyTargets.length || 1)) * 100)}% đang TD`}
              comparisonText="lưu lượng hiện hành"
              progress={Math.round((totalActivePsych / (psychologyTargets.length || 1)) * 100)}
              subMetrics={[
                { label: "Đang theo dõi", value: `${totalActivePsych} HS`, colorClass: "text-[#00736E]" },
                { label: "Đã chấm dứt", value: `${totalTerminatedPsych} HS` },
              ]}
              onClick={() => setPsychStatusFilter(psychStatusFilter === "ACTIVE" ? "ALL" : "ACTIVE")}
              hrefLabel={psychStatusFilter === "ACTIVE" ? "Đang lọc: Đang theo dõi (Nhấn để bỏ)" : "Lọc học sinh đang theo dõi"}
            />

            <KPICard
              title="Diện Cam kết Tâm lý"
              value={psychCommitmentTargets.length}
              unit="hồ sơ"
              icon={HeartHandshake}
              colorTheme="amber"
              trend={psychCommitmentActive > 0 ? "up" : "neutral"}
              trendValue={`${Math.round((psychCommitmentTargets.length / (psychologyTargets.length || 1)) * 100)}% tổng ca`}
              comparisonText="diện KS đầu vào"
              progress={psychCommitmentTargets.length > 0 ? Math.round((psychCommitmentTerminated / psychCommitmentTargets.length) * 100) : 0}
              subMetrics={[
                { label: "Đang theo dõi", value: `${psychCommitmentActive} HS`, colorClass: "text-amber-700" },
                { label: "Đã hoàn thành", value: `${psychCommitmentTerminated} HS` },
              ]}
              onClick={() => setPsychCommitmentFilter(psychCommitmentFilter === "COMMITMENT_ONLY" ? "ALL" : "COMMITMENT_ONLY")}
              hrefLabel={psychCommitmentFilter === "COMMITMENT_ONLY" ? "Đang lọc: Diện Cam kết (Nhấn để bỏ)" : "Lọc riêng HS Cam kết Tâm lý"}
            />

            <KPICard
              title={`Tiếp nhận mới (${latestMonthWithActivity.name})`}
              value={`+${latestMonthWithActivity.newCases}`}
              unit="ca mới"
              icon={UserPlus}
              colorTheme="indigo"
              trend={
                prevMonthNewCases > 0
                  ? latestMonthWithActivity.newCases >= prevMonthNewCases
                    ? "up"
                    : "down"
                  : "neutral"
              }
              trendValue={
                prevMonthNewCases > 0
                  ? `${latestMonthWithActivity.newCases >= prevMonthNewCases ? "+" : ""}${latestMonthWithActivity.newCases - prevMonthNewCases} ca`
                  : "Đầu kỳ"
              }
              comparisonText="so với tháng liền kề"
              progress={peakCaseload.activeCaseload > 0 ? Math.round((totalActivePsych / peakCaseload.activeCaseload) * 100) : 100}
              subMetrics={[
                { label: "Quy mô cao nhất", value: `${peakCaseload.activeCaseload} HS (${peakCaseload.name})`, colorClass: "text-indigo-700" },
                { label: "Tháng phát sinh", value: `${actualDataMonthlyTimeline.length} tháng` },
              ]}
            />

            <KPICard
              title="Đã Chấm dứt Theo dõi"
              value={totalTerminatedPsych}
              unit="hồ sơ"
              icon={CheckCircle2}
              colorTheme="emerald"
              trend="up"
              trendValue={`${Math.round((totalTerminatedPsych / (psychologyTargets.length || 1)) * 100)}% hoàn tất`}
              comparisonText="đạt mục tiêu ổn định"
              progress={Math.round((totalTerminatedPsych / (psychologyTargets.length || 1)) * 100)}
              subMetrics={
                psychTerminatedMonths.length > 0
                  ? psychTerminatedMonths.slice(0, 2).map(m => ({
                      label: `Tháng ${m.month}`,
                      value: `${m.count} ca`,
                      colorClass: "text-emerald-700",
                    }))
                  : [{ label: "Trạng thái", value: "Chưa có ca chấm dứt" }]
              }
              onClick={() => setPsychStatusFilter(psychStatusFilter === "TERMINATED" ? "ALL" : "TERMINATED")}
              hrefLabel={psychStatusFilter === "TERMINATED" ? "Đang lọc: Đã chấm dứt (Nhấn để bỏ)" : "Lọc học sinh đã chấm dứt"}
            />

            <KPICard
              title="Mạng lưới & ĐG Định kỳ"
              value={`${psychCampusStats.filter(c => c.count > 0).length}/${campuses.length}`}
              unit="cơ sở"
              icon={Building2}
              colorTheme="purple"
              trend={psychPeriodicEvalStats.evalRate >= 80 ? "up" : "neutral"}
              trendValue={`${psychPeriodicEvalStats.evalRate}% đã ĐG`}
              comparisonText="tiến độ Tuần/Tháng"
              progress={psychPeriodicEvalStats.evalRate}
              subMetrics={[
                { label: "Chuyên viên / GV", value: `${psychTeacherStats.filter(t => t.teacherId !== "UNASSIGNED").length} GV`, colorClass: "text-purple-700" },
                { label: "Đã ĐG định kỳ", value: `${psychPeriodicEvalStats.evaluatedActiveCount}/${psychPeriodicEvalStats.activeTotal} HS` },
              ]}
              onClick={() => handleOpenPdfModal(psychTeacherFilter, psychCampusFilter)}
              hrefLabel="Mở Sổ PDF theo Cơ sở & GV"
            />
          </div>

          {/* 1.2 TRUNG TÂM CẢNH BÁO SỚM (SMART ALERT CENTER CHUẨN FLEXIDATA) */}
          <SmartAlertCenter alerts={supportSmartAlerts} lastUpdated="Tức thời" />

          {/* 1.3 BỐ CỤC SPLIT-VIEW 12 CỘT CHUẨN FLEXIDATA (7 CỘT XU HƯỚNG THÁNG + 5 CỘT PHÂN BỐ ĐA CHIỀU) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

            {/* CỘT TRÁI (7/12): BIỂU ĐỒ XU HƯỚNG BIẾN ĐỘNG THEO THÁNG */}
            <div className="lg:col-span-7 flex">
              <DashboardChartCard
                className="w-full"
                title="Biến động Học sinh Theo dõi & Chấm dứt theo Tháng"
                subtitle="Trích xuất theo mốc tiếp nhận, lưu lượng duy trì và hoàn thành mục tiêu qua 10 tháng năm học"
                icon={Calendar}
                unit="Học sinh (HS)"
                legendItems={
                  psychChartMetric === "comparison"
                    ? [
                        { label: "Đang theo dõi", color: "#D49A3D" },
                        { label: "Đã chấm dứt", color: "#135E5B" },
                        { label: "Tiếp nhận mới (+)", color: "#0284C7" },
                      ]
                    : psychChartMetric === "activeCaseload"
                    ? [{ label: "Lũy kế đang theo dõi", color: "#D49A3D" }]
                    : psychChartMetric === "terminated"
                    ? [{ label: "Đã chấm dứt theo dõi", color: "#135E5B" }]
                    : [{ label: "Tiếp nhận mới phát sinh (+)", color: "#0284C7" }]
                }
                headerRight={
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="flex bg-white p-0.5 rounded-xl border border-slate-200/80 shadow-2xs">
                      {[
                        { id: "comparison", label: "Đối sánh" },
                        { id: "activeCaseload", label: "Đang TD" },
                        { id: "terminated", label: "Chấm dứt" },
                        { id: "newCases", label: "Mới (+)" },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setPsychChartMetric(tab.id as any)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                            psychChartMetric === tab.id
                              ? "bg-[#003B3A] text-white font-black shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex bg-white p-0.5 rounded-xl border border-slate-200/80 shadow-2xs">
                      <button
                        onClick={() => setPsychViewMode("chart")}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          psychViewMode === "chart"
                            ? "bg-slate-800 text-white font-black"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Biểu đồ
                      </button>
                      <button
                        onClick={() => setPsychViewMode("table")}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          psychViewMode === "table"
                            ? "bg-slate-800 text-white font-black"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Bảng số liệu
                      </button>
                    </div>
                  </div>
                }
                footerSlot={
                  <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                    <span>
                      Tổng tiếp nhận: <strong className="text-slate-800 font-mono tabular-nums">{psychologyTargets.length} ca</strong> • Đang theo dõi: <strong className="text-[#B45309] font-mono tabular-nums">{totalActivePsych} ca</strong> • Đã chấm dứt: <strong className="text-[#135E5B] font-mono tabular-nums">{totalTerminatedPsych} ca</strong>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-[#92400E] border border-amber-200/70 font-bold text-[11px]">
                      Đỉnh lưu lượng: {peakCaseload.activeCaseload} HS ({peakCaseload.name})
                    </span>
                  </div>
                }
              >
                {psychViewMode === "chart" ? (
                  <div className="w-full">
                    <ResponsiveContainer width="100%" height={295}>
                      {psychChartMetric === "comparison" ? (
                        <ComposedChart
                          data={actualDataMonthlyTimeline}
                          margin={{ top: 22, right: 16, left: -18, bottom: 0 }}
                          barGap={6}
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
                            domain={[0, "auto"]}
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
                                    <div className="space-y-1.5 text-[11px] font-mono tabular-nums">
                                      <p className="flex justify-between gap-6">
                                        <span className="text-amber-200 font-sans">Đang theo dõi:</span>
                                        <span className="font-black text-amber-300">{d.activeCaseload} HS</span>
                                      </p>
                                      <p className="flex justify-between gap-6">
                                        <span className="text-teal-200 font-sans">Đã chấm dứt theo dõi:</span>
                                        <span className="font-black text-teal-300">-{d.terminatedInMonth} ca</span>
                                      </p>
                                      <p className="flex justify-between gap-6 border-t border-slate-800 pt-1">
                                        <span className="text-sky-200 font-sans">Tiếp nhận mới trong tháng:</span>
                                        <span className="font-bold text-sky-300">+{d.newCases} ca</span>
                                      </p>
                                      {d.commitmentCases > 0 && (
                                        <p className="flex justify-between gap-6 text-amber-400">
                                          <span className="font-sans">Trong đó HS Cam kết:</span>
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
                          <Bar
                            dataKey="activeCaseload"
                            name="activeCaseload"
                            fill="#D49A3D"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={42}
                          >
                            <LabelList
                              dataKey="activeCaseload"
                              position="top"
                              fill="#92400E"
                              fontSize={11}
                              fontWeight={800}
                              formatter={(v: any) => (Number(v) > 0 ? `${v}` : "")}
                            />
                          </Bar>
                          <Bar
                            dataKey="terminatedInMonth"
                            name="terminatedInMonth"
                            fill="#135E5B"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={42}
                          >
                            <LabelList
                              dataKey="terminatedInMonth"
                              position="top"
                              fill="#135E5B"
                              fontSize={11}
                              fontWeight={800}
                              formatter={(v: any) => (Number(v) > 0 ? `${v}` : "")}
                            />
                          </Bar>
                          <Line
                            type="monotone"
                            dataKey="newCases"
                            name="newCases"
                            stroke="#0284C7"
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: "#0284C7", strokeWidth: 2, stroke: "#fff" }}
                            activeDot={{ r: 6 }}
                          />
                        </ComposedChart>
                      ) : psychChartMetric === "terminated" ? (
                        <BarChart
                          data={actualDataMonthlyTimeline}
                          margin={{ top: 22, right: 16, left: -18, bottom: 0 }}
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
                            domain={[0, "auto"]}
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
                                    <div className="space-y-1.5 text-[11px] font-mono tabular-nums">
                                      <p className="flex justify-between gap-6">
                                        <span className="text-teal-200 font-sans">Đã chấm dứt theo dõi:</span>
                                        <span className="font-black text-teal-300 text-sm">{d.terminatedInMonth} ca</span>
                                      </p>
                                      <p className="flex justify-between gap-6 border-t border-slate-800 pt-1">
                                        <span className="text-slate-400 font-sans">Tổng ca còn theo dõi:</span>
                                        <span className="font-bold text-amber-300">{d.activeCaseload} HS</span>
                                      </p>
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar dataKey="terminatedInMonth" fill="#135E5B" radius={[8, 8, 0, 0]} maxBarSize={48}>
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
                              formatter={(v: any) => (Number(v) > 0 ? `${v}` : "")}
                            />
                          </Bar>
                        </BarChart>
                      ) : psychChartMetric === "activeCaseload" ? (
                        <BarChart
                          data={actualDataMonthlyTimeline}
                          margin={{ top: 22, right: 16, left: -18, bottom: 0 }}
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
                            domain={[0, "auto"]}
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
                                    <div className="space-y-1.5 text-[11px] font-mono tabular-nums">
                                      <p className="flex justify-between gap-6">
                                        <span className="text-slate-300 font-sans">Lũy kế đang theo dõi:</span>
                                        <span className="font-black text-amber-300 text-sm">{d.activeCaseload} HS</span>
                                      </p>
                                      <p className="flex justify-between gap-6">
                                        <span className="text-slate-300 font-sans">Tiếp nhận mới:</span>
                                        <span className="font-bold text-slate-200">+{d.newCases} ca</span>
                                      </p>
                                      <p className="flex justify-between gap-6">
                                        <span className="text-slate-300 font-sans">Đã chấm dứt:</span>
                                        <span className="font-bold text-teal-300">-{d.terminatedInMonth} ca</span>
                                      </p>
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar dataKey="activeCaseload" fill="#D49A3D" radius={[8, 8, 0, 0]} maxBarSize={48}>
                            <LabelList
                              dataKey="activeCaseload"
                              position="top"
                              fill="#92400E"
                              fontSize={11}
                              fontWeight={800}
                              formatter={(v: any) => (Number(v) > 0 ? `${v}` : "")}
                            />
                          </Bar>
                        </BarChart>
                      ) : (
                        <BarChart
                          data={actualDataMonthlyTimeline}
                          margin={{ top: 22, right: 16, left: -18, bottom: 0 }}
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
                            domain={[0, "auto"]}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const d = payload[0].payload
                                return (
                                  <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-800 text-xs backdrop-blur-md">
                                    <p className="font-extrabold text-sky-300 mb-2 border-b border-slate-700 pb-1 flex items-center justify-between gap-4">
                                      <span>Tháng {d.month}</span>
                                      <span className="text-[10px] text-slate-400 font-normal">{d.name}</span>
                                    </p>
                                    <div className="space-y-1.5 text-[11px] font-mono tabular-nums">
                                      <p className="flex justify-between gap-6">
                                        <span className="text-slate-300 font-sans">Tiếp nhận mới:</span>
                                        <span className="font-black text-sky-300 text-sm">+{d.newCases} ca</span>
                                      </p>
                                      <p className="flex justify-between gap-6 border-t border-slate-800 pt-1">
                                        <span className="text-slate-300 font-sans">Lũy kế đang theo dõi:</span>
                                        <span className="font-bold text-amber-200">{d.activeCaseload} HS</span>
                                      </p>
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar dataKey="newCases" fill="#0284C7" radius={[8, 8, 0, 0]} maxBarSize={48}>
                            <LabelList
                              dataKey="newCases"
                              position="top"
                              fill="#0369A1"
                              fontSize={11}
                              fontWeight={800}
                              formatter={(v: any) => (Number(v) > 0 ? `${v}` : "")}
                            />
                          </Bar>
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="min-w-full text-xs text-slate-600">
                      <thead className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-100 text-[10px] uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3 text-left">Tháng</th>
                          <th className="py-2.5 px-3 text-center">Mới (+)</th>
                          <th className="py-2.5 px-3 text-center bg-teal-50/50 text-[#135E5B]">Chấm dứt (-)</th>
                          <th className="py-2.5 px-3 text-center bg-amber-50/40 text-[#92400E]">Đang TD</th>
                          <th className="py-2.5 px-3 text-center bg-amber-50/60 text-amber-900">Cam kết</th>
                          <th className="py-2.5 px-3 text-left">Nhận định Điều hành</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-xs">
                        {actualDataMonthlyTimeline.map((row, idx) => {
                          const isHighActivity = row.newCases > 0 || row.terminatedInMonth > 0
                          return (
                            <tr key={idx} className={`hover:bg-slate-50/80 transition-colors ${row.terminatedInMonth > 0 ? "bg-teal-50/15" : ""}`}>
                              <td className="py-2.5 px-3 font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap">
                                <span className={`w-2 h-2 rounded-full ${isHighActivity ? "bg-[#135E5B]" : "bg-slate-300"}`} />
                                {row.month} ({row.name})
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                                {row.newCases > 0 ? (
                                  <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 font-black border border-sky-200">
                                    +{row.newCases}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-bold">0</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center bg-teal-50/20 font-mono tabular-nums">
                                {row.terminatedInMonth > 0 ? (
                                  <span className="px-2 py-0.5 rounded-full bg-teal-100 text-[#135E5B] font-black border border-teal-200">
                                    -{row.terminatedInMonth}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-bold">0</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center bg-amber-50/20 font-mono tabular-nums">
                                <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 text-[#92400E] font-black border border-amber-200/80">
                                  {row.activeCaseload} HS
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center bg-amber-50/30 font-mono tabular-nums">
                                {row.commitmentCases > 0 ? (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black border border-amber-200 text-[11px]">
                                    ⭐️ {row.commitmentCases}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">0</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-left text-slate-600 text-[11px]">
                                {row.newCases > 0 && row.terminatedInMonth > 0
                                  ? `Tiếp nhận +${row.newCases} ca, hoàn thành ${row.terminatedInMonth} ca`
                                  : row.newCases > 0
                                  ? `Tiếp nhận mới +${row.newCases} học sinh`
                                  : row.terminatedInMonth > 0
                                  ? `Hoàn thành & chấm dứt ${row.terminatedInMonth} ca`
                                  : `Duy trì đồng hành ${row.activeCaseload} học sinh`}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </DashboardChartCard>
            </div>

            {/* CỘT PHẢI (5/12): PHÂN BỐ CƠ CẤU & XUẤT SỔ THEO CƠ SỞ / KHỐI / CHUYÊN VIÊN (CHUẨN FLEXIDATA) */}
            <div className="lg:col-span-5 flex">
              <DashboardChartCard
                className="w-full"
                title="Cơ cấu Phân bổ & Xuất Sổ Đánh giá"
                subtitle="Đối sánh quy mô theo Cơ sở (CS1–CS5), Khối lớp & Chuyên viên kèm nút xuất Sổ PDF/Excel"
                icon={BarChart3}
                unit="Số lượng (HS)"
                headerRight={
                  <div className="flex bg-white p-0.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    {[
                      { id: "CAMPUS", label: "Theo Cơ sở" },
                      { id: "GRADE", label: "Theo Khối" },
                      { id: "TEACHER", label: "Theo GV" },
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setDistributionTab(t.id as any)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          distributionTab === t.id
                            ? "bg-[#003B3A] text-white font-black shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                }
                footerSlot={
                  <div className="flex items-center justify-between w-full">
                    <span>Nhấn vào từng dòng để lọc nhanh hoặc in Sổ PDF / Excel</span>
                    <button
                      type="button"
                      onClick={() => handleOpenPdfModal(psychTeacherFilter, psychCampusFilter)}
                      className="text-[#003B3A] hover:underline font-black inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3 h-3 text-rose-600" />
                      <span>Mở Sổ PDF Tổng hợp</span>
                    </button>
                  </div>
                }
              >
                {distributionTab === "CAMPUS" && (
                  <div className="space-y-3">
                    <ResponsiveContainer width="100%" height={135}>
                      <BarChart
                        data={psychCampusStats}
                        margin={{ top: 16, right: 12, left: -22, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="campusName"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#475569", fontSize: 10, fontWeight: 800 }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload
                              return (
                                <div className="bg-slate-900/95 text-white p-2.5 rounded-xl shadow-xl text-xs font-mono tabular-nums">
                                  <p className="font-bold text-teal-300 font-sans mb-1">{d.campusName}</p>
                                  <p>Tổng số: <strong>{d.count} HS</strong></p>
                                  <p className="text-amber-300">Đang theo dõi: {d.active} HS</p>
                                  <p className="text-emerald-300">Đã chấm dứt: {d.terminated} HS</p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={36}>
                          {psychCampusStats.map((entry, idx) => (
                            <Cell
                              key={`campus-cell-${idx}`}
                              fill={getCampusColorInfo(entry.campusName, idx).hex}
                            />
                          ))}
                          <LabelList
                            dataKey="count"
                            position="top"
                            fill="#1e293b"
                            fontSize={10}
                            fontWeight={800}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="space-y-1.5 max-h-[155px] overflow-y-auto pr-1">
                      {psychCampusStats.map((c, idx) => {
                        const cColor = getCampusColorInfo(c.campusName, idx)
                        const pct = psychologyTargets.length > 0 ? Math.round((c.count / psychologyTargets.length) * 100) : 0
                        const isSelected = psychCampusFilter === c.campusId
                        return (
                          <div
                            key={c.campusId}
                            onClick={() => setPsychCampusFilter(isSelected ? "ALL" : c.campusId)}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition-all cursor-pointer ${
                              isSelected
                                ? "bg-teal-50/80 border-[#003B3A] ring-1 ring-[#003B3A]/20"
                                : "bg-slate-50/70 border-slate-200/70 hover:bg-slate-100/80"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: cColor.hex }}
                              />
                              <span className="font-extrabold text-slate-800 truncate">{c.campusName}</span>
                              <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                                ({c.active} đang TD • {c.terminated} xong)
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-mono tabular-nums font-black text-slate-900">
                                {c.count} HS <span className="text-[10px] font-normal text-slate-400">({pct}%)</span>
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenPdfModal("ALL", c.campusId)
                                }}
                                className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80"
                                title={`Xuất Sổ PDF Cơ sở ${c.campusName}`}
                              >
                                <Printer className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleExportTeacherReport("ALL", undefined, c.campusId, c.campusName)
                                }}
                                className="p-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#003B3A] border border-teal-200/80"
                                title={`Xuất Excel Cơ sở ${c.campusName}`}
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {distributionTab === "GRADE" && (
                  <div className="space-y-3">
                    <ResponsiveContainer width="100%" height={135}>
                      <BarChart
                        data={psychGradeStats}
                        margin={{ top: 16, right: 12, left: -22, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                          dataKey="gradeName"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#475569", fontSize: 10, fontWeight: 700 }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }}
                        />
                        <Tooltip />
                        <Bar dataKey="count" fill="#D97706" radius={[5, 5, 0, 0]} maxBarSize={28}>
                          <LabelList dataKey="count" position="top" fill="#92400E" fontSize={10} fontWeight={800} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="space-y-1.5 max-h-[155px] overflow-y-auto pr-1">
                      {psychGradeStats.map((g, idx) => {
                        const pct = psychologyTargets.length > 0 ? Math.round((g.count / psychologyTargets.length) * 100) : 0
                        const isSelected = psychGradeFilter === g.gradeName
                        return (
                          <div
                            key={idx}
                            onClick={() => setPsychGradeFilter(isSelected ? "ALL" : g.gradeName)}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition-all cursor-pointer ${
                              isSelected
                                ? "bg-amber-50/80 border-amber-500 ring-1 ring-amber-500/20"
                                : "bg-slate-50/70 border-slate-200/70 hover:bg-slate-100/80"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              <span className="font-extrabold text-slate-800">{g.gradeName}</span>
                              {g.commitmentCount > 0 && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-black">
                                  ⭐️ {g.commitmentCount} CK
                                </span>
                              )}
                            </div>
                            <div className="font-mono tabular-nums font-black text-slate-800">
                              {g.count} HS <span className="text-[10px] font-normal text-slate-400">({pct}%)</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {distributionTab === "TEACHER" && (
                  <div className="space-y-2 max-h-[295px] overflow-y-auto pr-1">
                    {psychTeacherStats.map((t, idx) => {
                      const pct = psychologyTargets.length > 0 ? Math.round((t.count / psychologyTargets.length) * 100) : 0
                      const isSelected = psychTeacherFilter === t.teacherId
                      return (
                        <div
                          key={idx}
                          onClick={() => setPsychTeacherFilter(isSelected ? "ALL" : t.teacherId)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                            isSelected
                              ? "bg-teal-50/80 border-[#003B3A] ring-1 ring-[#003B3A]/20"
                              : "bg-slate-50/70 border-slate-200/70 hover:bg-slate-100/80"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-[#003B3A] text-white flex items-center justify-center font-black text-[11px] shrink-0">
                              {t.teacherName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-slate-800 truncate">{t.teacherName}</p>
                              <p className="text-[10px] text-slate-500 truncate">
                                {t.campusList || "Toàn trường"} • {t.active} đang TD / {t.terminated} xong
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono tabular-nums font-black text-slate-900">
                              {t.count} ca <span className="text-[10px] font-normal text-slate-400">({pct}%)</span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenPdfModal(t.teacherId)
                              }}
                              className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80"
                              title={`Xuất Sổ PDF định kỳ Tuần/Tháng của ${t.teacherName}`}
                            >
                              <Printer className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleExportTeacherReport(t.teacherId, t.teacherName)
                              }}
                              className="p-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#003B3A] border border-teal-200/80"
                              title={`Xuất Excel của ${t.teacherName}`}
                            >
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </DashboardChartCard>
            </div>

          </div>

          {/* 1.4 KHỐI PHÂN TÍCH 3 CHIỀU: CƠ SỞ, KHỐI LỚP, GV PHỤ TRÁCH (BỐ CỤC CÂN ĐỐI, ĐỐI SÁNH THEO DÕI & CHẤM DỨT) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">

            {/* Chiều 1: Thống kê theo Cơ sở */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between h-[450px]">
              <div>
                <div className="pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-teal-50 text-[#135E5B] rounded-2xl border border-teal-100/60 shadow-xs">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-800">Thống kê theo Cơ sở</h3>
                        <p className="text-[10px] text-slate-400">Phân bổ {psychologyTargets.length} ca tại {psychCampusStats.filter(c => c.count > 0).length} cơ sở</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenPdfModal("ALL", psychCampusFilter)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                        title="Xem & Xuất Sổ PDF theo dõi đánh giá tâm lý theo Cơ sở & Định kỳ Tuần - Tháng"
                      >
                        <Printer className="w-3.5 h-3.5 text-rose-600" />
                        <span>Sổ PDF Cơ sở</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const curCampus = psychCampusStats.find(c => c.campusId === psychCampusFilter)
                          handleExportTeacherReport("ALL", undefined, psychCampusFilter, curCampus?.campusName)
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#135E5B] to-teal-700 hover:from-[#0e4846] hover:to-teal-800 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                        title="Xuất file Excel Sổ theo dõi đánh giá tâm lý theo Cơ sở & Định kỳ Tuần - Tháng"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-teal-200" />
                        <span>Excel</span>
                      </button>
                      <span className="text-[11px] font-black text-[#135E5B] bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-100">
                        {psychCampusStats.filter(c => c.count > 0).length} CS
                      </span>
                    </div>
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
                          <div className="flex items-center gap-1 shrink-0">
                            {item.commitmentCount > 0 && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                                ⭐️ {item.commitmentCount}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenPdfModal("ALL", item.campusId)
                              }}
                              className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 transition-colors"
                              title={`Xem & Xuất Sổ PDF theo dõi đánh giá tâm lý của ${item.campusName} (Tuần & Tháng)`}
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleExportTeacherReport("ALL", undefined, item.campusId, item.campusName)
                              }}
                              className="p-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#135E5B] border border-teal-200/80 transition-colors"
                              title={`Xuất file Excel Sổ theo dõi đánh giá của ${item.campusName}`}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-black text-slate-800 text-xs ml-0.5">
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
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-teal-50 text-[#135E5B] rounded-2xl border border-teal-100/60 shadow-xs">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-800">Giáo viên / Chuyên viên</h3>
                        <p className="text-[10px] text-slate-400">Phân công {psychAssignedRate}% ca tâm lý</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenPdfModal("ALL")}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                        title="Xem & Xuất bản in PDF chuẩn A4 theo từng Giáo viên"
                      >
                        <Printer className="w-3.5 h-3.5 text-rose-600" />
                        <span>In / Xuất PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportTeacherReport("ALL")}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#135E5B] to-teal-700 hover:from-[#0e4846] hover:to-teal-800 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                        title="Xuất file Excel Báo cáo theo dõi tiến độ tổng hợp theo từng Giáo viên"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-teal-200" />
                        <span>Excel</span>
                      </button>
                      <span className="text-[11px] font-black text-[#135E5B] bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-100">
                        {psychTeacherStats.length} GV
                      </span>
                    </div>
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

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenPdfModal(item.teacherId)
                              }}
                              className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 transition-colors"
                              title={`Xem & In báo cáo PDF riêng của ${item.teacherName}`}
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleExportTeacherReport(item.teacherId, item.teacherName)
                              }}
                              className="p-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#135E5B] border border-teal-200/80 transition-colors"
                              title={`Xuất file Excel tiến độ riêng của ${item.teacherName}`}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
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

              {/* Xuất Báo Cáo Tiến Độ theo Cơ sở & Giáo viên định kỳ Tuần/Tháng (PDF & EXCEL) */}
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => handleOpenPdfModal(psychTeacherFilter, psychCampusFilter)}
                  className="py-1.5 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title={
                    psychTeacherFilter !== "ALL"
                      ? `Xem & Xuất Sổ PDF theo dõi định kỳ Tuần/Tháng của Giáo viên đang chọn`
                      : psychCampusFilter !== "ALL"
                        ? `Xem & Xuất Sổ PDF theo dõi định kỳ Tuần/Tháng của Cơ sở đang chọn`
                        : `Xem & Xuất Sổ PDF theo dõi đánh giá tâm lý theo Cơ sở & Tình trạng ĐG của GV theo Tuần/Tháng`
                  }
                >
                  <Printer className="w-3.5 h-3.5 text-rose-600" />
                  <span>
                    {psychTeacherFilter !== "ALL"
                      ? `Sổ PDF (${psychTeacherStats.find(t => t.teacherId === psychTeacherFilter)?.teacherName || "GV đã chọn"})`
                      : psychCampusFilter !== "ALL"
                        ? `Sổ PDF (${psychCampusStats.find(c => c.campusId === psychCampusFilter)?.campusName || "Cơ sở"})`
                        : "Xuất Sổ PDF (Cơ sở & GV Tuần/Tháng)"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const currentTeacher = psychTeacherStats.find(t => t.teacherId === psychTeacherFilter)
                    const currentCampus = psychCampusStats.find(c => c.campusId === psychCampusFilter)
                    handleExportTeacherReport(
                      psychTeacherFilter,
                      currentTeacher?.teacherName,
                      psychCampusFilter,
                      currentCampus?.campusName
                    )
                  }}
                  className="py-1.5 px-3 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-[#135E5B] text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title={
                    psychTeacherFilter !== "ALL"
                      ? `Xuất file Excel tiến độ của Giáo viên đang chọn`
                      : psychCampusFilter !== "ALL"
                        ? `Xuất file Excel tiến độ của Cơ sở đang chọn`
                        : `Xuất file Excel báo cáo theo dõi đánh giá theo Cơ sở & Giáo viên định kỳ Tuần/Tháng`
                  }
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#135E5B]" />
                  <span>
                    {psychTeacherFilter !== "ALL"
                      ? `Excel (${psychTeacherStats.find(t => t.teacherId === psychTeacherFilter)?.teacherName || "GV đã chọn"})`
                      : psychCampusFilter !== "ALL"
                        ? `Excel (${psychCampusStats.find(c => c.campusId === psychCampusFilter)?.campusName || "Cơ sở"})`
                        : "Excel Theo Cơ sở & GV"}
                  </span>
                </button>
              </div>
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
          PHÂN HỆ 2: DASHBOARD PHỤ ĐẠO VĂN HÓA & HỌC THUẬT (CHUẨN FLEXIDATA)
          ===================================================================== */}
      {supportScope === "ACADEMIC" && (
        <div className="space-y-5 animate-in fade-in duration-300">

          {/* 2.1 Thẻ Chỉ số KPI Văn hóa chuẩn KPICard Flexidata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <KPICard
              title="Hồ sơ Phụ đạo Văn hóa"
              value={academicTargets.length}
              unit="học sinh"
              icon={BookOpen}
              colorTheme="sky"
              trend="neutral"
              trendValue={`${academicTargets.filter(t => t.terminationStatus === "ACTIVE").length} đang học`}
              comparisonText="Toán, Văn, Anh & bộ môn"
              subMetrics={[
                { label: "Đang bồi dưỡng", value: `${academicTargets.filter(t => t.terminationStatus === "ACTIVE").length} HS`, colorClass: "text-sky-700" },
                { label: "Đã hoàn thành", value: `${academicTargets.filter(t => t.terminationStatus === "TERMINATED").length} HS` },
              ]}
            />

            <KPICard
              title="Cơ sở Triển khai"
              value={`${acadCampusStats.filter(c => c.count > 0).length}/${campuses.length}`}
              unit="cơ sở"
              icon={Building2}
              colorTheme="teal"
              trend="up"
              trendValue={`${Math.round((acadCampusStats.filter(c => c.count > 0).length / (campuses.length || 1)) * 100)}% độ phủ`}
              comparisonText="toàn hệ thống"
              subMetrics={acadCampusStats.filter(c => c.count > 0).slice(0, 2).map(c => ({
                label: c.campusName,
                value: `${c.count} HS`,
                colorClass: "text-[#00736E]",
              }))}
            />

            <KPICard
              title="Giáo viên Phụ đạo"
              value={acadTeacherStats.filter(t => t.teacherId !== "UNASSIGNED").length}
              unit="giáo viên"
              icon={GraduationCap}
              colorTheme="indigo"
              trend="neutral"
              trendValue={`${acadGradeStats.length} khối lớp`}
              comparisonText="phân công bộ môn"
              subMetrics={[
                { label: "Tổng GV tham gia", value: `${acadTeacherStats.length} GV`, colorClass: "text-indigo-700" },
                { label: "Số khối lớp", value: `${acadGradeStats.length} khối` },
              ]}
              onClick={() => handleOpenPdfModal("ALL")}
              hrefLabel="Xuất Sổ PDF Tiến độ Giáo viên"
            />

            <KPICard
              title="Lượt Đánh giá Định kỳ"
              value={academicMonthlyStats.length > 0 ? academicMonthlyStats[academicMonthlyStats.length - 1].total : 0}
              unit="lượt"
              icon={TrendingUp}
              colorTheme="emerald"
              trend="up"
              trendValue={
                academicMonthlyStats.length > 0 && academicMonthlyStats[academicMonthlyStats.length - 1].total > 0
                  ? `${Math.round((academicMonthlyStats[academicMonthlyStats.length - 1].good / academicMonthlyStats[academicMonthlyStats.length - 1].total) * 100)}% tiến bộ`
                  : "Theo dõi định kỳ"
              }
              comparisonText="ghi nhận mới nhất"
              subMetrics={[
                {
                  label: "Đạt & Tiến bộ",
                  value: `${academicMonthlyStats.length > 0 ? academicMonthlyStats[academicMonthlyStats.length - 1].good : 0} lượt`,
                  colorClass: "text-emerald-700",
                },
                { label: "Số kỳ ghi nhận", value: `${academicMonthlyStats.length} tháng` },
              ]}
            />
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
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  Giáo viên phụ đạo
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenPdfModal("ALL")}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                    title="Xem & Xuất bản in PDF chuẩn A4 theo từng Giáo viên phụ đạo"
                  >
                    <Printer className="w-3.5 h-3.5 text-rose-600" />
                    <span>In / PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportTeacherReport("ALL")}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                    title="Xuất file Excel báo cáo tiến độ học tập theo từng Giáo viên"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Excel</span>
                  </button>
                </div>
              </div>
              <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1">
                {acadTeacherStats.map((t, i) => (
                  <div key={i} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block">{t.teacherName}</span>
                      <span className="text-[10px] text-slate-400">{t.campusList}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenPdfModal(t.teacherId)}
                        className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                        title={`Xem & In báo cáo PDF học tập của ${t.teacherName}`}
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportTeacherReport(t.teacherId, t.teacherName)}
                        className="p-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                        title={`Xuất file Excel tiến độ học tập của ${t.teacherName}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-black">
                        {t.count} HS
                      </span>
                    </div>
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
          PHÂN HỆ 3: BÁO CÁO TOÀN CẢNH HỢP NHẤT (UNIFIED VIEW CHUẨN FLEXIDATA)
          ===================================================================== */}
      {supportScope === "ALL" && (
        <div className="space-y-5 animate-in fade-in duration-300">

          {/* 3.1 Bảng Ma trận So sánh Văn hóa vs Tâm lý chuẩn KPICard Flexidata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <KPICard
              title="Tổng Học sinh Toàn trường"
              value={totalUniqueStudents}
              unit="học sinh"
              icon={Users}
              colorTheme="teal"
              trend="neutral"
              trendValue={`${targets.length} lượt hồ sơ`}
              comparisonText="tích hợp 2 phân hệ"
              subMetrics={[
                { label: "Đang theo dõi", value: `${totalActive} ca`, colorClass: "text-[#00736E]" },
                { label: "Đã chấm dứt", value: `${totalTerminated} ca` },
              ]}
            />

            <KPICard
              title="Phụ đạo Văn hóa"
              value={academicTargets.length}
              unit="hồ sơ"
              icon={BookOpen}
              colorTheme="sky"
              trend="neutral"
              trendValue={`${targets.length > 0 ? Math.round((academicTargets.length / targets.length) * 100) : 0}% tỷ trọng`}
              comparisonText="bồi dưỡng bộ môn"
              subMetrics={[
                { label: "Đang bồi dưỡng", value: `${academicTargets.filter(t => t.terminationStatus === "ACTIVE").length} ca`, colorClass: "text-sky-700" },
                { label: "Đã hoàn thành", value: `${academicTargets.filter(t => t.terminationStatus === "TERMINATED").length} ca` },
              ]}
              onClick={() => setSupportScope("ACADEMIC")}
              hrefLabel="Chuyển sang Phụ đạo Văn hóa"
            />

            <KPICard
              title="Hỗ trợ Tâm lý Học đường"
              value={psychologyTargets.length}
              unit="hồ sơ"
              icon={Brain}
              colorTheme="purple"
              trend="up"
              trendValue={`${targets.length > 0 ? Math.round((psychologyTargets.length / targets.length) * 100) : 0}% tỷ trọng`}
              comparisonText="tham vấn & đồng hành"
              subMetrics={[
                { label: "Đang theo dõi", value: `${totalActivePsych} ca`, colorClass: "text-purple-700" },
                { label: "Đã chấm dứt", value: `${totalTerminatedPsych} ca` },
              ]}
              onClick={() => setSupportScope("PSYCHOLOGICAL")}
              hrefLabel="Chuyển sang Hỗ trợ Tâm lý"
            />

            <KPICard
              title="Hồ sơ Đang Hoạt động"
              value={totalActive}
              unit="ca"
              icon={CheckCircle2}
              colorTheme="emerald"
              trend="up"
              trendValue={`${targets.length > 0 ? Math.round((totalActive / targets.length) * 100) : 0}% hiệu lực`}
              comparisonText="toàn hệ thống"
              subMetrics={[
                { label: "Chờ duyệt kết thúc", value: `${totalPendingTerm} ca`, colorClass: totalPendingTerm > 0 ? "text-amber-600" : undefined },
                { label: "Đã hoàn tất", value: `${totalTerminated} ca` },
              ]}
            />
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

      {/* MODAL XEM TRƯỚC & XUẤT BẢN IN PDF CHUẨN A4 */}
      <TeacherProgressPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        targets={supportScope === "PSYCHOLOGICAL" ? psychologyTargets : academicTargets}
        teacherStats={supportScope === "PSYCHOLOGICAL" ? psychTeacherStats : acadTeacherStats}
        campuses={campuses}
        selectedTeacherId={pdfTeacherId}
        selectedCampusId={pdfCampusId}
        academicYearName={academicYears?.find((y: any) => y.id === selectedYearId)?.name || "2026-2027"}
        supportType={supportScope}
      />

    </div>
  )
}
