"use client"

import Link from "next/link"
import { useEffect, useState, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import {
  Users,
  Layers,
  ArrowRightLeft,
  ClipboardCheck,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GraduationCap,
  Building2,
  UserCheck,
  Eye,
  EyeOff,
  ClipboardList,
  Search,
  Sparkles,
  BookOpen,
  ChevronRight,
  BarChart3,
  Compass,
  Target,
  HeartHandshake,
  ListTodo,
  Clock,
  AlertTriangle
} from "lucide-react"
import { UserWelcomeCard } from "@/components/UserWelcomeCard"
import { KPICard } from "@/components/KPICard"
import { PageError } from "@/components/ui/ErrorState"
import { EmptyState } from "@/components/ui/EmptyState"
import { DashboardChartCard } from "@/components/dashboard/DashboardChartCard"
import { SmartAlertCenter } from "@/components/dashboard/SmartAlertCenter"
import {
  AdminUnifiedFilterBar,
  AdminDashboardFilterState
} from "@/components/dashboard/AdminUnifiedFilterBar"
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts"

// CHUẨN MÀU CƠ SỞ THEO YÊU CẦU:
// CS1: Xanh Sky-Line (#48BFE3)
// CS2: Xanh Sky-Line pha màu tím (#6C5CE7)
// CS3: Màu tím than đậm (#2E1065)
// CS4: Màu vàng đất (#D97706)
// CS5: Màu xám xanh (#475569)
const CAMPUS_COLOR_MAP: Record<
  string,
  { code: string; name: string; shortName: string; color: string; bg: string; border: string; text: string }
> = {
  CS1: {
    code: "CS1",
    name: "Cơ sở 1 (Sky-Line Central)",
    shortName: "CS1 • Central",
    color: "#00A19A",
    bg: "bg-[#00A19A]/10",
    border: "border-[#00A19A]/30",
    text: "text-[#00736E]"
  },
  CS2: {
    code: "CS2",
    name: "Cơ sở 2 (Sky-Line Riverside)",
    shortName: "CS2 • Riverside",
    color: "#4F46E5",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-700"
  },
  CS3: {
    code: "CS3",
    name: "Cơ sở 3 (Sky-Line Hill)",
    shortName: "CS3 • Hill",
    color: "#7C3AED",
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700"
  },
  CS4: {
    code: "CS4",
    name: "Cơ sở 4 (Sky-Line International)",
    shortName: "CS4 • International",
    color: "#D49A3D",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-[#92400E]"
  },
  CS5: {
    code: "CS5",
    name: "Cơ sở 5 (Sky-Line Global)",
    shortName: "CS5 • Global",
    color: "#0284C7",
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-700"
  }
}

const getCampusInfo = (nameOrCode: string) => {
  const str = String(nameOrCode || "").toUpperCase()
  if (str.includes("CS1") || str.includes("CƠ SỞ 1") || str.includes("CENTRAL") || str === "1")
    return CAMPUS_COLOR_MAP["CS1"]
  if (str.includes("CS2") || str.includes("CƠ SỞ 2") || str.includes("RIVERSIDE") || str === "2")
    return CAMPUS_COLOR_MAP["CS2"]
  if (str.includes("CS3") || str.includes("CƠ SỞ 3") || str.includes("HILL") || str === "3")
    return CAMPUS_COLOR_MAP["CS3"]
  if (
    str.includes("CS4") ||
    str.includes("CƠ SỞ 4") ||
    str.includes("BEACH") ||
    str.includes("INTERNATIONAL") ||
    str === "4"
  )
    return CAMPUS_COLOR_MAP["CS4"]
  if (str.includes("CS5") || str.includes("CƠ SỞ 5") || str.includes("GLOBAL") || str === "5")
    return CAMPUS_COLOR_MAP["CS5"]
  return {
    code: nameOrCode || "OTHER",
    name: nameOrCode || "Khác",
    shortName: nameOrCode || "Khác",
    color: "#00A19A",
    bg: "bg-teal-50",
    border: "border-teal-200",
    text: "text-[#00A19A]"
  }
}

const LEVEL_COLORS: Record<string, string> = {
  "Mầm non": "#f43f5e",
  "Tiểu học": "#48BFE3",
  "THCS": "#6C5CE7",
  "THPT": "#2E1065",
  "Khác": "#94a3b8"
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>("")
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)

  // Unified Filter State (Năm học, Cơ sở, Cấp học, Khối, Khoảng thời gian)
  const [filters, setFilters] = useState<AdminDashboardFilterState>({
    academicYearId: "",
    campusId: "ALL",
    level: "ALL",
    grade: "ALL",
    timeRange: "FULL_YEAR"
  })

  // View Switchers inside combined analytical sections
  const [distributionTab, setDistributionTab] = useState<"CAMPUS" | "LEVEL" | "GRADE">("CAMPUS")
  const [gradeChartTab, setGradeChartTab] = useState<"ALL" | "K12" | "MAM_NON">("ALL")
  const [qualityChartTab, setQualityChartTab] = useState<"SUBJECTS" | "BANDS">("SUBJECTS")
  const [obsChartTab, setObsChartTab] = useState<"LEVEL" | "RATING">("LEVEL")

  // Entry Level Student Table Filters
  const [entryGradeFilter, setEntryGradeFilter] = useState<string>("ALL")
  const [entrySourceFilter, setEntrySourceFilter] = useState<string>("ALL")
  const [entryCampusFilter, setEntryCampusFilter] = useState<string>("ALL")
  const [entrySearchQuery, setEntrySearchQuery] = useState<string>("")
  const [showStudentList, setShowStudentList] = useState<boolean>(false)
  const [entryPage, setEntryPage] = useState<number>(1)
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    setEntryPage(1)
  }, [entryGradeFilter, entrySourceFilter, entryCampusFilter, entrySearchQuery])

  const userName = session?.user?.name || "Quản trị viên"
  const roleCode = (session?.user as any)?.role || ""
  const isSuperAdmin = roleCode === "ADMIN" || roleCode === "Admin" || roleCode === "SUPER_ADMIN"
  const [noPermission, setNoPermission] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Initial read of stored academic year
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("selectedAcademicYear") : ""
    if (stored) {
      setFilters((prev) => ({ ...prev, academicYearId: stored }))
    }
  }, [])

  // RBAC check & default route redirection
  useEffect(() => {
    if (status === "authenticated" && !isSuperAdmin) {
      setIsRedirecting(true)
      fetch("/api/user-permissions")
        .then((r) => r.json())
        .then((data) => {
          if (data?.defaultRoute && data.defaultRoute !== "/admin") {
            window.location.replace(data.defaultRoute)
          } else if (!data?.readableModules || data.readableModules.length === 0) {
            setIsRedirecting(false)
            setNoPermission(true)
          } else {
            setIsRedirecting(false)
          }
        })
        .catch((err) => {
          console.error("Failed to fetch user permissions:", err)
          setIsRedirecting(false)
          setNoPermission(true)
        })
    }
  }, [status, isSuperAdmin, roleCode])

  const fetchMetrics = useCallback(
    async (isSilent = false, customFilters?: Partial<AdminDashboardFilterState>) => {
      if (!isSilent) setRefreshing(true)
      setErrorMsg(null)
      try {
        const activeFilters = { ...filters, ...(customFilters || {}) }
        const yearToUse =
          activeFilters.academicYearId ||
          (typeof window !== "undefined" ? localStorage.getItem("selectedAcademicYear") : "") ||
          ""

        const params = new URLSearchParams()
        params.set("action", "getMetrics")
        params.set("_t", String(Date.now()))
        if (yearToUse) params.set("academicYearId", yearToUse)
        if (activeFilters.campusId && activeFilters.campusId !== "ALL") {
          params.set("campusId", activeFilters.campusId)
        }
        if (activeFilters.level && activeFilters.level !== "ALL") {
          params.set("level", activeFilters.level)
        }
        if (activeFilters.grade && activeFilters.grade !== "ALL") {
          params.set("grade", activeFilters.grade)
        }
        if (activeFilters.timeRange && activeFilters.timeRange !== "FULL_YEAR") {
          params.set("timeRange", activeFilters.timeRange)
        }

        const r = await fetch(`/api/check-he-thong?${params.toString()}`)
        if (r.ok) {
          const data = await r.json()
          setMetrics(data)
          if (data.academicYearId && !activeFilters.academicYearId) {
            setFilters((prev) => ({ ...prev, academicYearId: data.academicYearId }))
          }
          const now = new Date()
          setLastUpdated(
            now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
          )
        } else {
          setErrorMsg("Không thể tải dữ liệu thống kê từ máy chủ. Vui lòng thử lại.")
        }
      } catch (e) {
        console.error("Failed to load dashboard metrics:", e)
        setErrorMsg("Mất kết nối tới máy chủ dữ liệu. Vui lòng kiểm tra đường truyền.")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [filters]
  )

  useEffect(() => {
    fetchMetrics()

    const handleYearChange = () => {
      const stored = localStorage.getItem("selectedAcademicYear") || ""
      setFilters((prev) => ({ ...prev, academicYearId: stored }))
      fetchMetrics(false, { academicYearId: stored })
    }

    window.addEventListener("academicYearChanged", handleYearChange)
    return () => window.removeEventListener("academicYearChanged", handleYearChange)
  }, [fetchMetrics])

  // Realtime Auto-refresh Interval (30s)
  useEffect(() => {
    if (!isAutoRefresh) return
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchMetrics(true)
      }
    }, 30000)
    return () => clearInterval(timer)
  }, [isAutoRefresh, fetchMetrics])

  const handleFilterChange = (patch: Partial<AdminDashboardFilterState>) => {
    const next = { ...filters, ...patch }
    setFilters(next)
    if (patch.academicYearId && typeof window !== "undefined") {
      localStorage.setItem("selectedAcademicYear", patch.academicYearId)
      document.cookie =
        "selectedAcademicYear=" + patch.academicYearId + "; path=/; max-age=31536000; SameSite=Lax"
      window.dispatchEvent(new Event("academicYearChanged"))
    }
    fetchMetrics(false, next)
  }

  const handleResetFilters = () => {
    const defaultYear = metrics?.academicYearId || filters.academicYearId
    const resetState: AdminDashboardFilterState = {
      academicYearId: defaultYear,
      campusId: "ALL",
      level: "ALL",
      grade: "ALL",
      timeRange: "FULL_YEAR"
    }
    setFilters(resetState)
    fetchMetrics(false, resetState)
  }

  const availableGrades = useMemo(() => {
    const k12 = Array.from({ length: 12 }, (_, i) => {
      const g = String(i + 1)
      const level = i + 1 <= 5 ? "Tiểu học" : i + 1 <= 9 ? "THCS" : "THPT"
      return { value: g, label: `Khối ${g}`, level }
    })
    const preschool = [
      { value: "Nhà trẻ 12-18 tháng", label: "Nhà trẻ 12-18 tháng", level: "Mầm non" },
      { value: "Nhà trẻ 18-24 tháng", label: "Nhà trẻ 18-24 tháng", level: "Mầm non" },
      { value: "Nhà trẻ 24-36 tháng", label: "Nhà trẻ 24-36 tháng", level: "Mầm non" },
      { value: "Mẫu giáo bé", label: "Mẫu giáo bé (3-4 tuổi)", level: "Mầm non" },
      { value: "Mẫu giáo nhỡ", label: "Mẫu giáo nhỡ (4-5 tuổi)", level: "Mầm non" },
      { value: "Mẫu giáo lớn", label: "Mẫu giáo lớn (5-6 tuổi)", level: "Mầm non" }
    ]
    return [...k12, ...preschool]
  }, [])

  if (isRedirecting) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-10 h-10 text-[#00A19A] animate-spin opacity-80" />
        <p className="text-slate-500 font-semibold tracking-wider uppercase text-xs">
          Đang chuyển hướng đến không gian làm việc theo phân quyền...
        </p>
      </div>
    )
  }

  if (noPermission) {
    return (
      <EmptyState
        variant="no-permission"
        title="Tài khoản chưa được phân quyền"
        description={`Tài khoản của bạn (${roleCode}) hiện chưa được cấp quyền truy cập chức năng nào trong hệ thống. Vui lòng liên hệ Quản trị viên để được cấp quyền.`}
      />
    )
  }

  if (status === "loading" || (loading && !metrics)) {
    return (
      <div className="space-y-5 animate-pulse pb-12">
        <div className="h-16 bg-white rounded-2xl border border-slate-200/80 p-4" />
        <div className="h-14 bg-white rounded-2xl border border-slate-200/80 p-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-36 bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3">
              <div className="flex justify-between">
                <div className="w-9 h-9 bg-slate-100 rounded-xl" />
                <div className="w-16 h-5 bg-slate-100 rounded-full" />
              </div>
              <div className="w-28 h-4 bg-slate-100 rounded" />
              <div className="w-20 h-7 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 h-96 bg-white rounded-2xl border border-slate-200/80" />
          <div className="lg:col-span-5 h-96 bg-white rounded-2xl border border-slate-200/80" />
        </div>
      </div>
    )
  }

  if (errorMsg && !metrics) {
    return <PageError title="Không thể tải dữ liệu Dashboard" description={errorMsg} onRetry={() => fetchMetrics(false)} />
  }

  const finalMetrics = metrics || {
    totalStudents: 0,
    totalGeneralStudents: 0,
    totalPreschoolStudents: 0,
    totalClasses: 0,
    generalClasses: 0,
    preschoolClasses: 0,
    transferCount: 0,
    newEnrollmentsCount: 0,
    changeClassCount: 0,
    completionRate: 0,
    allAcademicYears: [],
    allCampuses: [],
    monthlyHeadcount: [],
    newEnrollmentStats: { total: 0, inProvince: 0, outProvince: 0, abroad: 0, inProvincePrivate: 0 },
    transferOutStats: { total: 0, inProvince: 0, outProvince: 0, abroad: 0, inProvincePrivate: 0 },
    gradeDistribution: [],
    k12GradeDistribution: [],
    preschoolGradeDistribution: [],
    campusDistribution: [],
    levelDistribution: [],
    entryLevelStats: {
      total: 0,
      grade1: { total: 0, surveyCount: 0, preschoolCount: 0, otherCount: 0 },
      grade6: { total: 0, surveyCount: 0, otherCount: 0 },
      grade10: { total: 0, surveyCount: 0, otherCount: 0 },
      students: []
    },
    testingAnalytics: null,
    academicQualityAnalytics: null,
    advisoryAnalytics: null,
    observationAnalytics: null,
    taskAnalytics: null,
    smartAlerts: []
  }

  const testingData = finalMetrics.testingAnalytics || {
    totalCandidates: 0,
    totalAdmitted: 0,
    inputPassRate: 0,
    assessmentScoresCount: 0,
    k12Input: { total: 0, passed: 0, committed: 0, exchange: 0, retest: 0, failed: 0, pending: 0 },
    preschoolInput: { total: 0, passed: 0, trial: 0, failed: 0, pending: 0 },
    inputDistribution: [],
    examsSummary: { totalExams: 0, totalParticipants: 0, totalAchievements: 0, totalStudentAwards: 0, byCategory: [] }
  }

  const qualityData = finalMetrics.academicQualityAnalytics || {
    totalGradeEntries: 0,
    averageScore: 0,
    passRate: 0,
    highAchieverRate: 0,
    scoreDistribution: [],
    subjectPerformance: [],
    competencySummary: { totalSummaries: 0, avgCompetencyPercent: 0 },
    supportSummary: { totalActive: 0, academicActive: 0, psychActive: 0, completed: 0, totalRecords: 0 }
  }

  const advisoryData = finalMetrics.advisoryAnalytics || {
    totalGoals: 0,
    studentsWithGoals: 0,
    goalCoverageRate: 0,
    parentSignedStudents: 0,
    teacherReviewedStudents: 0,
    pendingUnlockRequests: 0,
    totalConsultations: 0,
    consultedStudents: 0,
    consultationCoverageRate: 0,
    goalsByCategory: []
  }

  const obsData = finalMetrics.observationAnalytics || {
    totalSlots: 0,
    completedSlots: 0,
    activeSlots: 0,
    expiredSlots: 0,
    totalRegistrations: 0,
    totalEvaluations: 0,
    evalCompletionRate: 0,
    teacherTargetsCount: 0,
    byLevel: [],
    ratingDistribution: []
  }

  const taskData = finalMetrics.taskAnalytics || {
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
    statusDistribution: [],
    recentTasks: []
  }

  const netStudentChange = (finalMetrics.newEnrollmentsCount || 0) - (finalMetrics.transferCount || 0)
  const avgClassSize =
    finalMetrics.totalClasses > 0
      ? (finalMetrics.totalStudents / finalMetrics.totalClasses).toFixed(1)
      : "0"

  // Entry Level Students Filtering
  const rawEntryStudents = finalMetrics.entryLevelStats?.students || []
  const filteredEntryStudents = rawEntryStudents.filter((s: any) => {
    if (entryGradeFilter !== "ALL" && s.rawGrade !== entryGradeFilter) return false
    if (entrySourceFilter !== "ALL" && s.source !== entrySourceFilter) return false
    if (entryCampusFilter !== "ALL") {
      const info = getCampusInfo(s.campusName)
      if (!s.campusName?.includes(entryCampusFilter) && info.code !== entryCampusFilter) return false
    }
    if (entrySearchQuery.trim()) {
      const q = entrySearchQuery.trim().toLowerCase()
      const matchName = s.studentName?.toLowerCase().includes(q)
      const matchCode = s.studentCode?.toLowerCase().includes(q)
      const matchClass = s.className?.toLowerCase().includes(q)
      const matchCampus = s.campusName?.toLowerCase().includes(q)
      if (!matchName && !matchCode && !matchClass && !matchCampus) return false
    }
    return true
  })

  const totalEntryPages = Math.ceil(filteredEntryStudents.length / ITEMS_PER_PAGE) || 1
  const paginatedEntryStudents = filteredEntryStudents.slice(
    (entryPage - 1) * ITEMS_PER_PAGE,
    entryPage * ITEMS_PER_PAGE
  )

  const activeGradeData =
    gradeChartTab === "K12"
      ? finalMetrics.k12GradeDistribution || []
      : gradeChartTab === "MAM_NON"
      ? finalMetrics.preschoolGradeDistribution || []
      : finalMetrics.gradeDistribution || []

  const selectedCampusLabel =
    filters.campusId === "ALL"
      ? "Hệ thống Sky-Line"
      : finalMetrics.allCampuses?.find((c: any) => c.id === filters.campusId)?.campusName || "Hệ thống Sky-Line"

  return (
    <div className="space-y-5 pb-12">
      {/* 1. COMPACT WELCOME BANNER (THU GỌN, ƯU TIÊN KHÔNG GIAN DỮ LIỆU) */}
      <UserWelcomeCard
        compact={true}
        userName={userName}
        academicYear={finalMetrics.academicYearName || "2026-2027"}
        showAcademicYear={true}
        roleBadgeText="TRUNG TÂM ĐIỀU HÀNH QUẢN TRỊ"
        campusName={selectedCampusLabel}
        lastUpdated={lastUpdated}
        onRefresh={() => fetchMetrics(false)}
        isRefreshing={refreshing}
      />

      {/* 2. THANH BỘ LỌC THỐNG NHẤT ĐA CHIỀU (NĂM HỌC, CƠ SỞ, CẤP HỌC, KHỐI, THỜI GIAN) */}
      <AdminUnifiedFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        academicYears={finalMetrics.allAcademicYears || []}
        campuses={finalMetrics.allCampuses || []}
        availableGrades={availableGrades}
        isAutoRefresh={isAutoRefresh}
        onToggleAutoRefresh={() => setIsAutoRefresh(!isAutoRefresh)}
        onManualRefresh={() => fetchMetrics(false)}
        isRefreshing={refreshing}
        lastUpdated={lastUpdated}
      />

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </span>
          <button
            type="button"
            onClick={() => fetchMetrics(false)}
            className="px-3 py-1 bg-white rounded-lg border border-rose-200 font-semibold hover:bg-rose-100 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 3. HỆ THỐNG THẺ KPI TÁI SỬ DỤNG (8 CORE EXECUTIVE KPIS VỚI CHỈ SỐ SO SÁNH & DRILL-DOWN) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: TỔNG SĨ SỐ */}
        <KPICard
          title="Tổng Sĩ số Học sinh Đang học"
          value={finalMetrics.totalStudents.toLocaleString("vi-VN")}
          unit="Học sinh"
          icon={Users}
          colorTheme="teal"
          trend={netStudentChange >= 0 ? "up" : "down"}
          trendValue={`${netStudentChange >= 0 ? "+" : ""}${netStudentChange} HS ròng`}
          comparisonText={`Trung bình ${avgClassSize} HS/lớp • ${finalMetrics.entryLevelStats?.total || 0} HS đầu cấp`}
          subMetrics={[
            {
              label: "Phổ thông",
              value: (finalMetrics.totalGeneralStudents || 0).toLocaleString("vi-VN"),
              colorClass: "text-[#00A19A]"
            },
            {
              label: "Mầm non",
              value: (finalMetrics.totalPreschoolStudents || 0).toLocaleString("vi-VN"),
              colorClass: "text-rose-500"
            }
          ]}
          href="/admin/sy-so"
          hrefLabel="Quản lý & Chốt sĩ số"
        />

        {/* KPI 2: LỚP HỌC & BIẾN ĐỘNG LƯU CHUYỂN */}
        <KPICard
          title="Quy mô Lớp học & Lưu chuyển"
          value={finalMetrics.totalClasses}
          unit="Lớp hoạt động"
          icon={Layers}
          colorTheme="indigo"
          trend="up"
          trendValue={`+${finalMetrics.newEnrollmentsCount || 0} nhập mới`}
          comparisonText={`Phổ thông: ${finalMetrics.generalClasses || 0} lớp • Mầm non: ${finalMetrics.preschoolClasses || 0} lớp`}
          subMetrics={[
            { label: "Nhập mới", value: finalMetrics.newEnrollmentsCount || 0, colorClass: "text-emerald-600" },
            { label: "Chuyển đi", value: finalMetrics.transferCount || 0, colorClass: "text-rose-600" },
            { label: "Đổi lớp", value: finalMetrics.changeClassCount || 0, colorClass: "text-[#6C5CE7]" }
          ]}
          href="/admin/student-transfers"
          hrefLabel="Quản lý lưu chuyển HS"
        />

        {/* KPI 3: KHẢO THÍ & TUYỂN SINH ĐẦU VÀO */}
        <KPICard
          title="Khảo thí Đầu vào & Kỳ thi"
          value={testingData.totalCandidates.toLocaleString("vi-VN")}
          unit="Hồ sơ KSĐV"
          icon={Award}
          colorTheme="violet"
          trend={testingData.inputPassRate >= 70 ? "up" : "neutral"}
          trendValue={`${testingData.inputPassRate}% đạt/nhập học`}
          comparisonText={`${testingData.examsSummary.totalExams} kỳ thi • ${testingData.examsSummary.totalAchievements} giải thưởng`}
          subMetrics={[
            { label: "K-12", value: testingData.k12Input.total, colorClass: "text-[#48BFE3]" },
            { label: "Mầm non", value: testingData.preschoolInput.total, colorClass: "text-rose-500" },
            {
              label: "Chờ duyệt",
              value: testingData.k12Input.pending + testingData.preschoolInput.pending,
              colorClass: "text-amber-600"
            }
          ]}
          href="/admin/xet-duyet-ket-qua"
          hrefLabel="Xét duyệt kết quả KSĐV"
        />

        {/* KPI 4: CHẤT LƯỢNG HỌC TẬP & HỖ TRỢ */}
        <KPICard
          title="Chất lượng Học tập & Phổ điểm"
          value={qualityData.averageScore > 0 ? qualityData.averageScore.toFixed(2) : "—"}
          unit="Điểm TB (Thang 10)"
          icon={BarChart3}
          colorTheme="emerald"
          trend={qualityData.passRate >= 85 ? "up" : "down"}
          trendValue={`${qualityData.passRate}% đạt ≥ 5.0`}
          comparisonText={`${qualityData.totalGradeEntries.toLocaleString("vi-VN")} đầu điểm • ${qualityData.highAchieverRate}% Giỏi/XS`}
          progress={qualityData.passRate}
          subMetrics={[
            { label: "Đánh giá NL", value: qualityData.competencySummary.totalSummaries.toLocaleString("vi-VN") },
            {
              label: "HS Hỗ trợ",
              value: qualityData.supportSummary.totalActive,
              colorClass: "text-amber-600"
            }
          ]}
          href="/admin/ktdbcl/thong-ke-bao-cao"
          hrefLabel="Báo cáo chất lượng KT&ĐBCL"
        />

        {/* KPI 5: CỐ VẤN HỌC TẬP & MỤC TIÊU */}
        <KPICard
          title="Cố vấn Học tập & Mục tiêu HS"
          value={advisoryData.totalGoals.toLocaleString("vi-VN")}
          unit="Mục tiêu"
          icon={Compass}
          colorTheme="sky"
          trend="up"
          trendValue={`${advisoryData.totalConsultations} lượt tư vấn`}
          comparisonText={`${advisoryData.studentsWithGoals} HS lập mục tiêu • ${advisoryData.consultedStudents} HS đã tư vấn 1-1`}
          progress={Math.min(100, Math.max(advisoryData.consultationCoverageRate, advisoryData.goalCoverageRate))}
          subMetrics={[
            { label: "HS lập MT", value: advisoryData.studentsWithGoals, colorClass: "text-[#00A19A]" },
            { label: "HS đã TV", value: advisoryData.consultedStudents, colorClass: "text-[#6C5CE7]" }
          ]}
          href="/admin/co-van-hoc-tap?tab=consultations"
          hrefLabel="Điều hành Cố vấn học tập"
        />

        {/* KPI 6: DỰ GIỜ & PHÁT TRIỂN CHUYÊN MÔN */}
        <KPICard
          title="Dự giờ & Đánh giá Tiết dạy"
          value={obsData.totalEvaluations.toLocaleString("vi-VN")}
          unit={`/ ${obsData.totalRegistrations} lượt ĐK`}
          icon={ClipboardCheck}
          colorTheme="pine"
          trend={obsData.evalCompletionRate >= 75 ? "up" : "down"}
          trendValue={`${obsData.evalCompletionRate}% hoàn tất phiếu`}
          comparisonText={`Tổng ${obsData.totalSlots.toLocaleString("vi-VN")} tiết mở • ${obsData.teacherTargetsCount} GV có định mức`}
          progress={obsData.evalCompletionRate}
          subMetrics={[
            { label: "Số tiết", value: obsData.totalSlots, colorClass: "text-[#003B3A]" },
            { label: "Đang mở", value: obsData.activeSlots, colorClass: "text-emerald-600" }
          ]}
          href="/admin/tong-hop-du-gio"
          hrefLabel="Tổng hợp dự giờ toàn trường"
        />

        {/* KPI 7: THEO DÕI HỖ TRỢ & CAM KẾT */}
        <KPICard
          title="Hỗ trợ Học tập & Tâm lý"
          value={qualityData.supportSummary.totalActive}
          unit="Hồ sơ đang theo dõi"
          icon={HeartHandshake}
          colorTheme="amber"
          trend={qualityData.supportSummary.completed > 0 ? "up" : "neutral"}
          trendValue={`${qualityData.supportSummary.completed} ca hoàn tất`}
          comparisonText={`Kèm ${testingData.k12Input.committed} HS diện cam kết đầu vào cần đồng hành`}
          subMetrics={[
            { label: "Học tập", value: qualityData.supportSummary.academicActive, colorClass: "text-[#0284C7]" },
            { label: "Tâm lý", value: qualityData.supportSummary.psychActive, colorClass: "text-rose-600" },
            { label: "Cam kết ĐV", value: testingData.k12Input.committed, colorClass: "text-amber-600" }
          ]}
          href="/admin/ktdbcl/support"
          hrefLabel="Quản lý hồ sơ hỗ trợ"
        />

        {/* KPI 8: ĐIỀU HÀNH CÔNG VIỆC */}
        <KPICard
          title="Tiến độ Nhiệm vụ Điều hành"
          value={`${taskData.completedTasks}/${taskData.totalTasks}`}
          unit="Nhiệm vụ"
          icon={ListTodo}
          colorTheme={taskData.overdueTasks > 0 ? "rose" : "emerald"}
          trend={taskData.overdueTasks > 0 ? "down" : "up"}
          trendValue={
            taskData.overdueTasks > 0 ? `${taskData.overdueTasks} việc quá hạn` : `${taskData.completionRate}% hoàn thành`
          }
          comparisonText={`Tỷ lệ hoàn thành: ${taskData.completionRate}% tổng nhiệm vụ năm học`}
          progress={taskData.completionRate}
          subMetrics={[
            { label: "Hoàn thành", value: taskData.completedTasks, colorClass: "text-emerald-600" },
            { label: "Đang làm", value: taskData.inProgressTasks, colorClass: "text-sky-600" },
            { label: "Quá hạn", value: taskData.overdueTasks, colorClass: "text-rose-600" }
          ]}
          href="/admin/tasks"
          hrefLabel="Bảng điều hành công việc"
        />
      </div>

      {/* 4. TRUNG TÂM CẢNH BÁO THÔNG MINH (SMART ALERT CENTER) */}
      <SmartAlertCenter alerts={finalMetrics.smartAlerts || []} lastUpdated={lastUpdated} />

      {/* 5. KHU VỰC PHÂN TÍCH SĨ SỐ KẾT HỢP: XU HƯỚNG THEO THÁNG (7 CỘT) & PHÂN BỐ CƠ SỞ/CẤP/KHỐI (5 CỘT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT (7 COLS): XU HƯỚNG SĨ SỐ THEO THÁNG */}
        <DashboardChartCard
          className="lg:col-span-7"
          title="Xu hướng Biến động Sĩ số & Lưu chuyển theo Tháng"
          subtitle={`Diễn biến sĩ số Phổ thông, Mầm non và tổng quy mô toàn trường năm học ${finalMetrics.academicYearName || "2026-2027"}`}
          icon={TrendingUp}
          unit="Học sinh (HS)"
          lastUpdated={lastUpdated}
          detailHref="/admin/sy-so"
          detailLabel="Quản lý & Chốt sĩ số"
          isEmpty={!finalMetrics.monthlyHeadcount || finalMetrics.monthlyHeadcount.length === 0}
          legendItems={[
            { label: "Tổng sĩ số", color: "#003B3A", value: finalMetrics.totalStudents },
            { label: "Phổ thông K-12", color: "#48BFE3", value: finalMetrics.totalGeneralStudents },
            { label: "Mầm non", color: "#f43f5e", value: finalMetrics.totalPreschoolStudents }
          ]}
        >
          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={finalMetrics.monthlyHeadcount}
                margin={{ top: 10, right: 12, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
                    fontSize: "12px"
                  }}
                  formatter={(value: any, name: any) => [`${Number(value).toLocaleString("vi-VN")} HS`, name]}
                />
                <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                <Bar
                  dataKey="generalCount"
                  name="Sĩ số Phổ thông"
                  stackId="a"
                  fill="#48BFE3"
                  radius={[0, 0, 0, 0]}
                  barSize={22}
                />
                <Bar
                  dataKey="preschoolCount"
                  name="Sĩ số Mầm non"
                  stackId="a"
                  fill="#f43f5e"
                  radius={[6, 6, 0, 0]}
                  barSize={22}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Tổng sĩ số"
                  stroke="#003B3A"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: "#003B3A" }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </DashboardChartCard>

        {/* RIGHT (5 COLS): PHÂN BỐ SĨ SỐ THEO CƠ SỞ / CẤP HỌC / KHỐI */}
        <DashboardChartCard
          className="lg:col-span-5"
          title="Phân bố Sĩ số theo Cơ sở & Cấp học"
          subtitle="Tỷ trọng phân bổ học sinh thực tế giữa các cơ sở và bậc đào tạo"
          icon={Building2}
          iconBgClass="bg-[#6C5CE7]/10 text-[#6C5CE7] border-[#6C5CE7]/20"
          unit="Học sinh (HS / %)"
          lastUpdated={lastUpdated}
          detailHref="/admin/classes"
          detailLabel="Danh sách lớp"
          headerRight={
            <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200/90 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setDistributionTab("CAMPUS")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  distributionTab === "CAMPUS"
                    ? "bg-[#003B3A] text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Theo Cơ sở
              </button>
              <button
                type="button"
                onClick={() => setDistributionTab("LEVEL")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  distributionTab === "LEVEL"
                    ? "bg-[#003B3A] text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Theo Cấp học
              </button>
              <button
                type="button"
                onClick={() => setDistributionTab("GRADE")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  distributionTab === "GRADE"
                    ? "bg-[#003B3A] text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Theo Khối
              </button>
            </div>
          }
          legendItems={
            distributionTab === "CAMPUS"
              ? [
                  { label: "CS1", color: "#48BFE3" },
                  { label: "CS2", color: "#6C5CE7" },
                  { label: "CS3", color: "#2E1065" },
                  { label: "CS4", color: "#D97706" },
                  { label: "CS5", color: "#475569" }
                ]
              : [
                  { label: "Tiểu học", color: "#48BFE3" },
                  { label: "THCS", color: "#6C5CE7" },
                  { label: "THPT", color: "#2E1065" },
                  { label: "Mầm non", color: "#f43f5e" }
                ]
          }
        >
          {distributionTab === "CAMPUS" && (
            <div className="space-y-4">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={finalMetrics.campusDistribution}
                    margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="campusName"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#e2e8f0" }}
                    />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px"
                      }}
                      formatter={(val: any) => [`${Number(val).toLocaleString("vi-VN")} HS`, "Sĩ số"]}
                    />
                    <Bar dataKey="count" name="Sĩ số Cơ sở" radius={[6, 6, 0, 0]} barSize={32}>
                      {finalMetrics.campusDistribution?.map((entry: any, index: number) => {
                        const info = getCampusInfo(entry.campusName || entry.campusCode)
                        return <Cell key={`cell-campus-${index}`} fill={info.color} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Bảng tỷ trọng nhanh theo từng cơ sở */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {finalMetrics.campusDistribution?.map((c: any, idx: number) => {
                  const info = getCampusInfo(c.campusName || c.campusCode)
                  const pct =
                    finalMetrics.totalStudents > 0
                      ? ((c.count / finalMetrics.totalStudents) * 100).toFixed(1)
                      : "0.0"
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: info.color }}
                        />
                        <span className="font-semibold text-slate-700 truncate">{info.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono">
                        <span className="text-[11px] text-slate-400">
                          PT: {c.generalCount || 0} • MN: {c.preschoolCount || 0}
                        </span>
                        <strong className="text-slate-800 w-14 text-right">
                          {c.count.toLocaleString("vi-VN")} HS
                        </strong>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] w-12 text-center">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {distributionTab === "LEVEL" && (
            <div className="space-y-4">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={finalMetrics.levelDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={78}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="level"
                      label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      labelLine={false}
                    >
                      {finalMetrics.levelDistribution?.map((entry: any, index: number) => (
                        <Cell key={`cell-lvl-${index}`} fill={LEVEL_COLORS[entry.level] || "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [`${Number(value).toLocaleString("vi-VN")} HS`, "Sĩ số"]}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {finalMetrics.levelDistribution?.map((l: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: LEVEL_COLORS[l.level] || "#94a3b8" }}
                      />
                      <span className="font-semibold text-slate-700">{l.level}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <strong className="text-slate-800">{l.count.toLocaleString("vi-VN")} HS</strong>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] w-12 text-center">
                        {l.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {distributionTab === "GRADE" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setGradeChartTab("ALL")}
                  className={`flex-1 py-1 rounded-lg cursor-pointer ${
                    gradeChartTab === "ALL" ? "bg-white text-[#003B3A] shadow-2xs" : "text-slate-500"
                  }`}
                >
                  Tất cả ({finalMetrics.totalStudents})
                </button>
                <button
                  type="button"
                  onClick={() => setGradeChartTab("K12")}
                  className={`flex-1 py-1 rounded-lg cursor-pointer ${
                    gradeChartTab === "K12" ? "bg-[#48BFE3] text-white shadow-2xs" : "text-slate-500"
                  }`}
                >
                  K-12 ({finalMetrics.totalGeneralStudents || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setGradeChartTab("MAM_NON")}
                  className={`flex-1 py-1 rounded-lg cursor-pointer ${
                    gradeChartTab === "MAM_NON" ? "bg-[#f43f5e] text-white shadow-2xs" : "text-slate-500"
                  }`}
                >
                  Mầm non ({finalMetrics.totalPreschoolStudents || 0})
                </button>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeGradeData} margin={{ top: 10, right: 5, left: -22, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                    />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px"
                      }}
                      formatter={(value: any) => [`${Number(value).toLocaleString("vi-VN")} HS`, "Sĩ số"]}
                    />
                    <Bar dataKey="count" name="Sĩ số" radius={[4, 4, 0, 0]}>
                      {activeGradeData.map((entry: any, index: number) => {
                        const color =
                          entry.level === "Mầm non"
                            ? "#f43f5e"
                            : entry.level === "Tiểu học"
                            ? "#48BFE3"
                            : entry.level === "THCS"
                            ? "#6C5CE7"
                            : "#2E1065"
                        return <Cell key={`cell-grade-${index}`} fill={color} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </DashboardChartCard>
      </div>

      {/* 6. KHU VỰC PHÂN TÍCH KHẢO THÍ & CHẤT LƯỢNG HỌC TẬP (2 CỘT) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* CARD 6.1: KHẢO THÍ ĐẦU VÀO & KỲ THI HỌC THUẬT */}
        <DashboardChartCard
          title="Phân tích Khảo thí Đầu vào & Kỳ thi Học sinh"
          subtitle={`Tổng hợp ${testingData.totalCandidates} hồ sơ khảo sát đầu vào và ${testingData.examsSummary.totalExams} kỳ thi năng lực`}
          icon={Award}
          iconBgClass="bg-purple-50 text-[#2E1065] border-purple-200/70"
          unit="Học sinh (HS)"
          lastUpdated={lastUpdated}
          detailHref="/admin/xet-duyet-ket-qua"
          detailLabel="Xét duyệt KSĐV"
          isEmpty={testingData.totalCandidates === 0 && testingData.examsSummary.totalExams === 0}
          legendItems={[
            { label: "Phổ thông K-12", color: "#48BFE3", value: testingData.k12Input.total },
            { label: "Mầm non", color: "#f43f5e", value: testingData.preschoolInput.total },
            { label: "Giải thưởng kỳ thi", color: "#D97706", value: testingData.examsSummary.totalAchievements }
          ]}
        >
          <div className="space-y-4">
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={testingData.inputDistribution}
                  margin={{ top: 10, right: 10, left: -18, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px"
                    }}
                    formatter={(val: any, name: any) => [`${val} HS`, name]}
                  />
                  <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="k12" name="Phổ thông K-12" fill="#48BFE3" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="preschool" name="Mầm non" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Strip: Kỳ thi & Giải thưởng */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <Link
                href="/admin/ktdbcl/exams"
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50/50 border border-slate-200/70 transition-colors"
              >
                <span className="text-[10px] text-slate-400 uppercase block">Kỳ thi tổ chức</span>
                <strong className="text-base font-bold font-mono text-slate-800">
                  {testingData.examsSummary.totalExams} kỳ
                </strong>
              </Link>
              <Link
                href="/admin/ktdbcl/students"
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50/50 border border-slate-200/70 transition-colors"
              >
                <span className="text-[10px] text-slate-400 uppercase block">Lượt HS dự thi</span>
                <strong className="text-base font-bold font-mono text-[#00A19A]">
                  {testingData.examsSummary.totalParticipants} HS
                </strong>
              </Link>
              <Link
                href="/admin/ktdbcl/achievements"
                className="p-2.5 rounded-xl bg-amber-50/50 hover:bg-amber-50 border border-amber-200/60 transition-colors"
              >
                <span className="text-[10px] text-amber-700 uppercase block">Giải thưởng</span>
                <strong className="text-base font-bold font-mono text-amber-700">
                  {testingData.examsSummary.totalAchievements} giải
                </strong>
              </Link>
              <Link
                href="/admin/input-assessments"
                className="p-2.5 rounded-xl bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-200/60 transition-colors"
              >
                <span className="text-[10px] text-indigo-700 uppercase block">Bài chấm KSĐV</span>
                <strong className="text-base font-bold font-mono text-indigo-700">
                  {testingData.assessmentScoresCount.toLocaleString("vi-VN")}
                </strong>
              </Link>
            </div>
          </div>
        </DashboardChartCard>

        {/* CARD 6.2: CHẤT LƯỢNG HỌC TẬP, PHỔ ĐIỂM MÔN HỌC & HỖ TRỢ */}
        <DashboardChartCard
          title="Phân tích Chất lượng Học tập & Phổ điểm Môn học"
          subtitle={`ĐTB toàn hệ thống: ${qualityData.averageScore} • Tỷ lệ đạt ≥ 5.0: ${qualityData.passRate}% (${qualityData.totalGradeEntries.toLocaleString("vi-VN")} bản ghi điểm)`}
          icon={BarChart3}
          iconBgClass="bg-emerald-50 text-emerald-600 border-emerald-200/70"
          unit={qualityChartTab === "SUBJECTS" ? "Điểm (10) & Tỷ lệ (%)" : "Bản ghi điểm"}
          lastUpdated={lastUpdated}
          detailHref="/admin/ktdbcl/phan-tich-thkq"
          detailLabel="Phân tích THKQ"
          isEmpty={qualityData.totalGradeEntries === 0}
          headerRight={
            <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200/90 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setQualityChartTab("SUBJECTS")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  qualityChartTab === "SUBJECTS"
                    ? "bg-[#003B3A] text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Theo Môn học
              </button>
              <button
                type="button"
                onClick={() => setQualityChartTab("BANDS")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  qualityChartTab === "BANDS"
                    ? "bg-[#003B3A] text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Phổ điểm
              </button>
            </div>
          }
          legendItems={[
            { label: "Giỏi/XS (≥8.0)", color: "#00A19A", value: `${qualityData.highAchieverRate}%` },
            { label: "Đạt chuẩn (≥5.0)", color: "#48BFE3", value: `${qualityData.passRate}%` },
            { label: "Hồ sơ hỗ trợ ACTIVE", color: "#D97706", value: qualityData.supportSummary.totalActive }
          ]}
        >
          <div className="space-y-4">
            {qualityChartTab === "SUBJECTS" ? (
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={qualityData.subjectPerformance}
                    margin={{ top: 10, right: 10, left: -18, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="subjectName" stroke="#64748b" fontSize={10} tickLine={false} interval={0} />
                    <YAxis yAxisId="left" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} domain={[0, 12]} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px"
                      }}
                    />
                    <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                    <Bar
                      yAxisId="left"
                      dataKey="avgScore"
                      name="Điểm TB"
                      fill="#00A19A"
                      radius={[4, 4, 0, 0]}
                      barSize={22}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="passRate"
                      name="Tỷ lệ đạt ≥ 5.0 (%)"
                      stroke="#6C5CE7"
                      strokeWidth={2.5}
                      dot={{ r: 3.5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={qualityData.scoreDistribution}
                    margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="band" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px"
                      }}
                      formatter={(val: any) => [`${Number(val).toLocaleString("vi-VN")} đầu điểm`, "Số lượng"]}
                    />
                    <Bar dataKey="count" name="Số lượng bài" radius={[6, 6, 0, 0]} barSize={36}>
                      {qualityData.scoreDistribution.map((entry: any, i: number) => (
                        <Cell key={`score-band-${i}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Quick quality & support footer cards */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-teal-50/50 border border-teal-200/60">
                <span className="text-[10px] text-teal-700 uppercase block">Giỏi / Xuất sắc</span>
                <strong className="text-base font-bold font-mono text-[#00736E]">
                  {qualityData.highAchieverRate}%
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] text-slate-500 uppercase block">Đánh giá Năng lực</span>
                <strong className="text-base font-bold font-mono text-slate-800">
                  {qualityData.competencySummary.totalSummaries.toLocaleString("vi-VN")}
                </strong>
              </div>
              <Link
                href="/admin/ktdbcl/support"
                className="p-2.5 rounded-xl bg-amber-50/50 hover:bg-amber-50 border border-amber-200/60 transition-colors"
              >
                <span className="text-[10px] text-amber-700 uppercase block">Bồi dưỡng Học tập</span>
                <strong className="text-base font-bold font-mono text-amber-700">
                  {qualityData.supportSummary.academicActive} HS
                </strong>
              </Link>
              <Link
                href="/admin/ktdbcl/support"
                className="p-2.5 rounded-xl bg-rose-50/50 hover:bg-rose-50 border border-rose-200/60 transition-colors"
              >
                <span className="text-[10px] text-rose-700 uppercase block">Hỗ trợ Tâm lý</span>
                <strong className="text-base font-bold font-mono text-rose-700">
                  {qualityData.supportSummary.psychActive} HS
                </strong>
              </Link>
            </div>
          </div>
        </DashboardChartCard>
      </div>

      {/* 7. KHU VỰC PHÂN TÍCH CỐ VẤN HỌC TẬP (CVHT) & DỰ GIỜ CHUYÊN MÔN (2 CỘT) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* CARD 7.1: CỐ VẤN HỌC TẬP & MỤC TIÊU HỌC SINH */}
        <DashboardChartCard
          title="Phân tích Cố vấn Học tập & Mục tiêu Học sinh"
          subtitle={`${advisoryData.studentsWithGoals} học sinh đã thiết lập ${advisoryData.totalGoals.toLocaleString("vi-VN")} mục tiêu • ${advisoryData.totalConsultations} phiên tư vấn 1-1`}
          icon={Compass}
          iconBgClass="bg-sky-50 text-[#0284C7] border-sky-200/70"
          unit="Mục tiêu / Lượt"
          lastUpdated={lastUpdated}
          detailHref="/admin/co-van-hoc-tap?tab=dashboard"
          detailLabel="Quản lý CVHT"
          isEmpty={advisoryData.totalGoals === 0 && advisoryData.totalConsultations === 0}
          legendItems={advisoryData.goalsByCategory.map((c: any) => ({
            label: c.label,
            color: c.color,
            value: c.count
          }))}
        >
          <div className="space-y-4">
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={advisoryData.goalsByCategory}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 15, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    stroke="#475569"
                    fontSize={11}
                    tickLine={false}
                    width={130}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px"
                    }}
                    formatter={(val: any) => [`${Number(val).toLocaleString("vi-VN")} mục tiêu`, "Số lượng"]}
                  />
                  <Bar dataKey="count" name="Số mục tiêu" radius={[0, 6, 6, 0]} barSize={22}>
                    {advisoryData.goalsByCategory.map((entry: any, idx: number) => (
                      <Cell key={`goal-cat-${idx}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <Link
                href="/admin/co-van-hoc-tap?tab=dashboard"
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-sky-50/50 border border-slate-200/70 transition-colors"
              >
                <span className="text-[10px] text-slate-400 uppercase block">HS Đã nộp phiếu</span>
                <strong className="text-base font-bold font-mono text-slate-800">
                  {advisoryData.studentsWithGoals} HS
                </strong>
              </Link>
              <Link
                href="/admin/co-van-hoc-tap?tab=consultations"
                className="p-2.5 rounded-xl bg-teal-50/50 hover:bg-teal-50 border border-teal-200/60 transition-colors"
              >
                <span className="text-[10px] text-teal-700 uppercase block">HS Đã tư vấn 1-1</span>
                <strong className="text-base font-bold font-mono text-[#00736E]">
                  {advisoryData.consultedStudents} HS
                </strong>
              </Link>
              <Link
                href="/admin/co-van-hoc-tap?tab=consultations"
                className="p-2.5 rounded-xl bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-200/60 transition-colors"
              >
                <span className="text-[10px] text-indigo-700 uppercase block">Tổng buổi tư vấn</span>
                <strong className="text-base font-bold font-mono text-[#6C5CE7]">
                  {advisoryData.totalConsultations} buổi
                </strong>
              </Link>
              <Link
                href="/admin/co-van-hoc-tap?tab=requests"
                className="p-2.5 rounded-xl bg-amber-50/50 hover:bg-amber-50 border border-amber-200/60 transition-colors"
              >
                <span className="text-[10px] text-amber-700 uppercase block">PHHS Đã ký cam kết</span>
                <strong className="text-base font-bold font-mono text-amber-700">
                  {advisoryData.parentSignedStudents} HS
                </strong>
              </Link>
            </div>
          </div>
        </DashboardChartCard>

        {/* CARD 7.2: DỰ GIỜ & PHÁT TRIỂN CHUYÊN MÔN */}
        <DashboardChartCard
          title="Phân tích Dự giờ & Chất lượng Tiết dạy"
          subtitle={`Tổng ${obsData.totalSlots} tiết đăng ký • ${obsData.totalEvaluations}/${obsData.totalRegistrations} phiếu đánh giá đã hoàn thành (${obsData.evalCompletionRate}%)`}
          icon={ClipboardCheck}
          iconBgClass="bg-[#003B3A]/10 text-[#003B3A] border-[#003B3A]/20"
          unit={obsChartTab === "LEVEL" ? "Tiết / Phiếu" : "Phiếu đánh giá"}
          lastUpdated={lastUpdated}
          detailHref="/admin/tong-hop-du-gio"
          detailLabel="Tổng hợp dự giờ"
          isEmpty={obsData.totalSlots === 0}
          headerRight={
            <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200/90 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setObsChartTab("LEVEL")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  obsChartTab === "LEVEL"
                    ? "bg-[#003B3A] text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Theo Cấp học
              </button>
              <button
                type="button"
                onClick={() => setObsChartTab("RATING")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  obsChartTab === "RATING"
                    ? "bg-[#003B3A] text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Xếp loại tiết dạy
              </button>
            </div>
          }
          legendItems={[
            { label: "Tiết mở dự giờ", color: "#48BFE3", value: obsData.totalSlots },
            { label: "Phiếu đã chấm", color: "#00A19A", value: obsData.totalEvaluations },
            { label: "GV có định mức", color: "#6C5CE7", value: obsData.teacherTargetsCount }
          ]}
        >
          <div className="space-y-4">
            {obsChartTab === "LEVEL" ? (
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={obsData.byLevel} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="level" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px"
                      }}
                    />
                    <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="slots" name="Số tiết mở" fill="#48BFE3" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="registrations" name="Lượt đăng ký" fill="#6C5CE7" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="evaluations" name="Phiếu hoàn tất" fill="#00A19A" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={obsData.ratingDistribution} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px"
                      }}
                      formatter={(val: any) => [`${val} phiếu`, "Số lượng"]}
                    />
                    <Bar dataKey="count" name="Số phiếu đánh giá" radius={[6, 6, 0, 0]} barSize={36}>
                      {obsData.ratingDistribution.map((entry: any, i: number) => (
                        <Cell key={`obs-rate-${i}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <Link
                href="/admin/du-gio"
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50/50 border border-slate-200/70 transition-colors"
              >
                <span className="text-[10px] text-slate-400 uppercase block">Dự giờ K-12</span>
                <strong className="text-base font-bold font-mono text-slate-800">
                  {obsData.byLevel
                    .filter((l: any) => l.level !== "Mầm non")
                    .reduce((acc: number, cur: any) => acc + cur.slots, 0)}{" "}
                  tiết
                </strong>
              </Link>
              <Link
                href="/admin/du-gio-mam-non"
                className="p-2.5 rounded-xl bg-rose-50/50 hover:bg-rose-50 border border-rose-200/60 transition-colors"
              >
                <span className="text-[10px] text-rose-700 uppercase block">Dự giờ Mầm non</span>
                <strong className="text-base font-bold font-mono text-rose-600">
                  {obsData.byLevel.find((l: any) => l.level === "Mầm non")?.slots || 0} tiết
                </strong>
              </Link>
              <Link
                href="/admin/du-gio-gvnn"
                className="p-2.5 rounded-xl bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-200/60 transition-colors"
              >
                <span className="text-[10px] text-indigo-700 uppercase block">Phiếu hoàn thành</span>
                <strong className="text-base font-bold font-mono text-[#6C5CE7]">
                  {obsData.totalEvaluations} phiếu
                </strong>
              </Link>
              <Link
                href="/admin/ma-tran-du-gio-ttcm"
                className="p-2.5 rounded-xl bg-teal-50/50 hover:bg-teal-50 border border-teal-200/60 transition-colors"
              >
                <span className="text-[10px] text-teal-700 uppercase block">Ma trận TTCM</span>
                <strong className="text-base font-bold font-mono text-[#00736E]">
                  {obsData.teacherTargetsCount} GV
                </strong>
              </Link>
            </div>
          </div>
        </DashboardChartCard>
      </div>

      {/* 8. KHU VỰC ĐIỀU HÀNH CÔNG VIỆC (5 CỘT) & QUẢN LÝ HỌC SINH ĐẦU CẤP / LƯU CHUYỂN (7 CỘT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT (5 COLS): ĐIỀU HÀNH CÔNG VIỆC */}
        <DashboardChartCard
          className="lg:col-span-5"
          title="Tiến độ Điều hành Công việc & Nhiệm vụ"
          subtitle={`Hoàn thành ${taskData.completedTasks}/${taskData.totalTasks} nhiệm vụ (${taskData.completionRate}%) • Quá hạn: ${taskData.overdueTasks}`}
          icon={ListTodo}
          iconBgClass="bg-amber-50 text-amber-600 border-amber-200/70"
          unit="Nhiệm vụ"
          lastUpdated={lastUpdated}
          detailHref="/admin/tasks"
          detailLabel="Tất cả công việc"
          isEmpty={taskData.totalTasks === 0}
          legendItems={taskData.statusDistribution.map((s: any) => ({
            label: s.status,
            color: s.color,
            value: s.count
          }))}
        >
          <div className="space-y-4">
            {/* Progress Status Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Tiến độ hoàn thành nhiệm vụ</span>
                <strong className="font-mono text-slate-800">{taskData.completionRate}%</strong>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                {taskData.statusDistribution.map((st: any, idx: number) => {
                  const pct = taskData.totalTasks > 0 ? (st.count / taskData.totalTasks) * 100 : 0
                  if (pct <= 0) return null
                  return (
                    <div
                      key={idx}
                      style={{ width: `${pct}%`, backgroundColor: st.color }}
                      title={`${st.status}: ${st.count} nhiệm vụ`}
                      className="h-full transition-all"
                    />
                  )
                })}
              </div>
            </div>

            {/* Task List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {taskData.recentTasks.map((t: any) => {
                const isOverdue = t.progress === "OVERDUE"
                const isCompleted = t.progress === "COMPLETED"
                return (
                  <Link
                    key={t.id}
                    href="/admin/tasks"
                    className={`block p-3 rounded-xl border transition-all ${
                      isOverdue
                        ? "bg-rose-50/40 border-rose-200/80 hover:bg-rose-50"
                        : isCompleted
                        ? "bg-slate-50/70 border-slate-200/70 hover:bg-slate-100/70"
                        : "bg-white border-slate-200 hover:border-[#00A19A]/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug">
                        {t.title}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                          isOverdue
                            ? "bg-rose-100 text-rose-700"
                            : isCompleted
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        {isOverdue ? "Quá hạn" : isCompleted ? "Hoàn thành" : "Đang xử lý"}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate">
                        {t.groupName} • <strong className="text-slate-700">{t.assigneeName}</strong>
                      </span>
                      {t.endDate && (
                        <span className="font-mono shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(t.endDate).toLocaleDateString("vi-VN")}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </DashboardChartCard>

        {/* RIGHT (7 COLS): PHÂN TÍCH ĐẦU CẤP (KHỐI 1, 6, 10) & LUỒNG LƯU CHUYỂN HỌC SINH */}
        <DashboardChartCard
          className="lg:col-span-7"
          title="Phân tích Học sinh Đầu cấp (K1, K6, K10) & Luồng Lưu chuyển"
          subtitle={`Tổng HS đầu cấp: ${finalMetrics.entryLevelStats?.total || 0} HS • Nhập mới: ${finalMetrics.newEnrollmentStats?.total || 0} HS • Chuyển đi: ${finalMetrics.transferOutStats?.total || 0} HS`}
          icon={Sparkles}
          unit="Học sinh (HS)"
          lastUpdated={lastUpdated}
          headerRight={
            <button
              type="button"
              onClick={() => setShowStudentList(!showStudentList)}
              className="px-3 py-1.5 bg-[#00A19A] hover:bg-[#008B85] text-white rounded-xl text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              {showStudentList ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showStudentList ? "Thu gọn danh sách" : "Tra cứu HS đầu cấp"}</span>
            </button>
          }
          legendItems={[
            { label: "Khối 1", color: "#48BFE3", value: finalMetrics.entryLevelStats?.grade1?.total || 0 },
            { label: "Khối 6", color: "#6C5CE7", value: finalMetrics.entryLevelStats?.grade6?.total || 0 },
            { label: "Khối 10", color: "#2E1065", value: finalMetrics.entryLevelStats?.grade10?.total || 0 }
          ]}
        >
          <div className="space-y-4">
            {/* 3 Khối Đầu cấp Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* KHỐI 1 */}
              <div className="bg-teal-50/40 rounded-xl border border-teal-200/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-[#48BFE3] text-white rounded-md text-[11px] font-bold">
                    Khối 1
                  </span>
                  <strong className="text-sm font-bold font-mono text-[#00736E]">
                    {finalMetrics.entryLevelStats?.grade1?.total || 0} HS
                  </strong>
                </div>
                <div className="space-y-1 text-[11px] text-slate-600 pt-1 border-t border-teal-100">
                  <div className="flex justify-between">
                    <span>Qua Khảo sát:</span>
                    <strong className="font-mono text-slate-800">
                      {finalMetrics.entryLevelStats?.grade1?.surveyCount || 0}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Từ Mẫu giáo lớn:</span>
                    <strong className="font-mono text-amber-700">
                      {finalMetrics.entryLevelStats?.grade1?.preschoolCount || 0}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Trực tiếp / Khác:</span>
                    <strong className="font-mono text-slate-700">
                      {finalMetrics.entryLevelStats?.grade1?.otherCount || 0}
                    </strong>
                  </div>
                </div>
              </div>

              {/* KHỐI 6 */}
              <div className="bg-indigo-50/40 rounded-xl border border-indigo-200/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-[#6C5CE7] text-white rounded-md text-[11px] font-bold">
                    Khối 6
                  </span>
                  <strong className="text-sm font-bold font-mono text-[#6C5CE7]">
                    {finalMetrics.entryLevelStats?.grade6?.total || 0} HS
                  </strong>
                </div>
                <div className="space-y-1 text-[11px] text-slate-600 pt-1 border-t border-indigo-100">
                  <div className="flex justify-between">
                    <span>Qua Khảo sát:</span>
                    <strong className="font-mono text-slate-800">
                      {finalMetrics.entryLevelStats?.grade6?.surveyCount || 0}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Trực tiếp / Khác:</span>
                    <strong className="font-mono text-slate-700">
                      {finalMetrics.entryLevelStats?.grade6?.otherCount || 0}
                    </strong>
                  </div>
                </div>
              </div>

              {/* KHỐI 10 */}
              <div className="bg-purple-50/40 rounded-xl border border-purple-200/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-[#2E1065] text-white rounded-md text-[11px] font-bold">
                    Khối 10
                  </span>
                  <strong className="text-sm font-bold font-mono text-[#2E1065]">
                    {finalMetrics.entryLevelStats?.grade10?.total || 0} HS
                  </strong>
                </div>
                <div className="space-y-1 text-[11px] text-slate-600 pt-1 border-t border-purple-100">
                  <div className="flex justify-between">
                    <span>Qua Khảo sát:</span>
                    <strong className="font-mono text-slate-800">
                      {finalMetrics.entryLevelStats?.grade10?.surveyCount || 0}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Trực tiếp / Khác:</span>
                    <strong className="font-mono text-slate-700">
                      {finalMetrics.entryLevelStats?.grade10?.otherCount || 0}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Luồng Nhập học mới vs Chuyển đi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    Nguồn Nhập học mới
                  </span>
                  <strong className="text-sm font-bold font-mono text-emerald-700">
                    +{finalMetrics.newEnrollmentStats?.total || 0} HS
                  </strong>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-center pt-1">
                  <div className="bg-white p-1.5 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Nội tỉnh</span>
                    <strong className="font-mono text-slate-800">
                      {finalMetrics.newEnrollmentStats?.inProvince || 0}
                    </strong>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Ngoại tỉnh</span>
                    <strong className="font-mono text-slate-800">
                      {finalMetrics.newEnrollmentStats?.outProvince || 0}
                    </strong>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Quốc tế</span>
                    <strong className="font-mono text-slate-800">
                      {finalMetrics.newEnrollmentStats?.abroad || 0}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50/30 border border-rose-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-rose-600" />
                    Học sinh Chuyển trường
                  </span>
                  <strong className="text-sm font-bold font-mono text-rose-600">
                    {finalMetrics.transferOutStats?.total || 0} HS
                  </strong>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-center pt-1">
                  <div className="bg-white p-1.5 rounded-lg border border-rose-100/60">
                    <span className="text-slate-400 block text-[10px]">Nội tỉnh</span>
                    <strong className="font-mono text-slate-800">
                      {finalMetrics.transferOutStats?.inProvince || 0}
                    </strong>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-rose-100/60">
                    <span className="text-slate-400 block text-[10px]">Ngoại tỉnh</span>
                    <strong className="font-mono text-slate-800">
                      {finalMetrics.transferOutStats?.outProvince || 0}
                    </strong>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-rose-100/60">
                    <span className="text-slate-400 block text-[10px]">Du học/NN</span>
                    <strong className="font-mono text-slate-800">
                      {finalMetrics.transferOutStats?.abroad || 0}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DashboardChartCard>
      </div>

      {/* 9. BẢNG TRA CỨU CHI TIẾT HỌC SINH ĐẦU CẤP (MỞ RỘNG KHI CẦN) */}
      {showStudentList && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden animate-fade-in">
          <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Danh sách Chi tiết Học sinh Đầu cấp (Khối 1, Khối 6, Khối 10)
              </h3>
              <p className="text-[11px] text-slate-500">
                Tra cứu và lọc nhanh theo khối, cơ sở và nguồn tuyển sinh đầu vào
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm tên, mã HS, lớp..."
                  value={entrySearchQuery}
                  onChange={(e) => setEntrySearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#00A19A]"
                />
              </div>

              <select
                value={entryGradeFilter}
                onChange={(e) => setEntryGradeFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="ALL">Tất cả khối đầu cấp</option>
                <option value="1">Khối 1</option>
                <option value="6">Khối 6</option>
                <option value="10">Khối 10</option>
              </select>

              <select
                value={entryCampusFilter}
                onChange={(e) => setEntryCampusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="ALL">Tất cả cơ sở</option>
                <option value="CS1">CS1 (Central)</option>
                <option value="CS2">CS2 (Riverside)</option>
                <option value="CS3">CS3 (Hill)</option>
                <option value="CS4">CS4 (International)</option>
                <option value="CS5">CS5 (Global)</option>
              </select>

              <select
                value={entrySourceFilter}
                onChange={(e) => setEntrySourceFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="ALL">Tất cả nguồn</option>
                <option value="KHAO_SAT">Qua Khảo sát</option>
                <option value="MAU_GIAO_LON">Từ Mẫu giáo lớn</option>
                <option value="KHAC">Trực tiếp / Khác</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/90 text-slate-500 font-medium border-b border-slate-200/70">
                <tr>
                  <th className="py-3 px-4">STT</th>
                  <th className="py-3 px-4">Mã HS</th>
                  <th className="py-3 px-4">Họ và Tên</th>
                  <th className="py-3 px-4">Khối</th>
                  <th className="py-3 px-4">Lớp học</th>
                  <th className="py-3 px-4">Cơ sở</th>
                  <th className="py-3 px-4">Nguồn nhập học</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredEntryStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Không tìm thấy học sinh đầu cấp phù hợp với bộ lọc
                    </td>
                  </tr>
                ) : (
                  paginatedEntryStudents.map((st: any, idx: number) => {
                    const campusInfo = getCampusInfo(st.campusName)
                    return (
                      <tr key={st.id || idx} className="hover:bg-sky-50/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {(entryPage - 1) * ITEMS_PER_PAGE + idx + 1}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800">{st.studentCode}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">{st.studentName}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              st.rawGrade === "1"
                                ? "bg-teal-100 text-[#00736E]"
                                : st.rawGrade === "6"
                                ? "bg-indigo-100 text-[#6C5CE7]"
                                : "bg-purple-100 text-[#2E1065]"
                            }`}
                          >
                            {st.grade}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">{st.className}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium inline-flex items-center gap-1.5 ${campusInfo.bg} ${campusInfo.border} ${campusInfo.text}`}
                          >
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ backgroundColor: campusInfo.color }}
                            />
                            {st.campusName}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {st.source === "KHAO_SAT" && (
                            <span className="px-2.5 py-1 bg-teal-50 text-[#00736E] border border-teal-200 rounded-lg text-[11px] font-medium inline-flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-[#00A19A]" />
                              Qua Khảo sát
                            </span>
                          )}
                          {st.source === "MAU_GIAO_LON" && (
                            <span className="px-2.5 py-1 bg-amber-50 text-[#D97706] border border-amber-200 rounded-lg text-[11px] font-medium inline-flex items-center gap-1">
                              <BookOpen className="w-3 h-3 text-[#D97706]" />
                              Từ Mẫu giáo lớn
                            </span>
                          )}
                          {st.source === "KHAC" && (
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px]">
                              Trực tiếp / Khác
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-semibold">
                            Đang học
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 bg-slate-50 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Hiển thị{" "}
              <strong className="font-mono text-slate-800">
                {filteredEntryStudents.length === 0 ? 0 : (entryPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
                {Math.min(entryPage * ITEMS_PER_PAGE, filteredEntryStudents.length)}
              </strong>{" "}
              trên tổng số{" "}
              <strong className="font-mono text-[#00A19A]">{filteredEntryStudents.length}</strong> học sinh
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEntryPage((p) => Math.max(1, p - 1))}
                disabled={entryPage === 1}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 disabled:opacity-40 hover:bg-slate-100 text-xs font-medium cursor-pointer"
              >
                Trang trước
              </button>
              <span className="px-3 py-1.5 bg-teal-50 text-[#00736E] border border-teal-200 rounded-xl text-xs font-mono font-semibold">
                {entryPage} / {totalEntryPages}
              </span>
              <button
                type="button"
                onClick={() => setEntryPage((p) => Math.min(totalEntryPages, p + 1))}
                disabled={entryPage >= totalEntryPages}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 disabled:opacity-40 hover:bg-slate-100 text-xs font-medium cursor-pointer"
              >
                Trang sau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
