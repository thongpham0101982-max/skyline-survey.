"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  Filter,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  BellRing,
  X,
  Award,
  School,
  BookOpen,
  Users,
  Calendar as CalendarIcon,
  ArrowUpRight,
  Layers,
  Sparkles,
  Compass,
  GraduationCap,
  Eye,
  HeartHandshake,
  MessageSquare,
  BarChart3,
  List,
  Columns3,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  Hourglass,
  ArrowUpDown,
  SlidersHorizontal,
  Bot,
  Check,
  Info,
} from "lucide-react"
import {
  SSMTask,
  TaskSummaryCounts,
  SourceModule,
  SeparatedProgressAndKPI,
  UnifiedTeacherAssignmentProfile,
} from "@/services/taskEngine/types"
import { useCampusTheme } from "@/hooks/useCampusTheme"

// ============================================================================
// 1. CHUẨN HÓA 8 NHÓM NGHIỆP VỤ SKY-LINE (MỤC 3.D)
// ============================================================================
export type SkylineTaskCategoryCode =
  | "ALL"
  | "CHU_NHIEM_DGNL"
  | "GIANG_DAY_CHAT_LUONG"
  | "DU_GIO_PTCM"
  | "CO_VAN_HOC_TAP"
  | "MON_DAC_THU"
  | "HOAT_DONG_TRAI_NGHIEM"
  | "KHAO_THI_KHAO_SAT"
  | "NHIEM_VU_KHAC"

interface CategoryDefinition {
  code: SkylineTaskCategoryCode
  label: string
  shortLabel: string
  modules: SourceModule[]
  icon: React.ComponentType<{ className?: string }>
  badgeClass: string
  dotClass: string
}

const SKYLINE_CATEGORIES: CategoryDefinition[] = [
  {
    code: "ALL",
    label: "Tất cả nhóm",
    shortLabel: "Tất cả",
    modules: [],
    icon: Layers,
    badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
    dotClass: "bg-slate-500",
  },
  {
    code: "CHU_NHIEM_DGNL",
    label: "Chủ nhiệm & ĐGNL",
    shortLabel: "Chủ nhiệm & ĐGNL",
    modules: ["LOP_CHU_NHIEM"],
    icon: Users,
    badgeClass: "bg-teal-50 text-[#00736E] border-teal-200",
    dotClass: "bg-[#00A19A]",
  },
  {
    code: "GIANG_DAY_CHAT_LUONG",
    label: "Giảng dạy & Chất lượng",
    shortLabel: "Giảng dạy",
    modules: ["CHAT_LUONG_GIANG_DAY"],
    icon: BookOpen,
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  {
    code: "DU_GIO_PTCM",
    label: "Dự giờ & PTCM",
    shortLabel: "Dự giờ & PTCM",
    modules: ["DU_GIO"],
    icon: Eye,
    badgeClass: "bg-indigo-50 text-[#5B3E96] border-indigo-200",
    dotClass: "bg-[#6E3D89]",
  },
  {
    code: "CO_VAN_HOC_TAP",
    label: "Cố vấn học tập",
    shortLabel: "Cố vấn học tập",
    modules: ["CO_VAN"],
    icon: HeartHandshake,
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    dotClass: "bg-amber-500",
  },
  {
    code: "MON_DAC_THU",
    label: "Môn học đặc thù",
    shortLabel: "Môn đặc thù",
    modules: ["MON_DAC_THU"],
    icon: Sparkles,
    badgeClass: "bg-purple-50 text-[#6E3D89] border-purple-200",
    dotClass: "bg-purple-600",
  },
  {
    code: "HOAT_DONG_TRAI_NGHIEM",
    label: "Hoạt động trải nghiệm",
    shortLabel: "HĐ Trải nghiệm",
    modules: ["TRAI_NGHIEM"],
    icon: GraduationCap,
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
    dotClass: "bg-violet-500",
  },
  {
    code: "KHAO_THI_KHAO_SAT",
    label: "Khảo thí & Khảo sát",
    shortLabel: "Khảo thí & KS",
    modules: ["KHAO_SAT_DAU_VAO", "NPS_PHHS", "KHAO_THI"],
    icon: Compass,
    badgeClass: "bg-cyan-50 text-cyan-800 border-cyan-200",
    dotClass: "bg-cyan-600",
  },
  {
    code: "NHIEM_VU_KHAC",
    label: "Nhiệm vụ khác",
    shortLabel: "Khác",
    modules: ["Y_KIEN_PHHS", "CONG_TAC", "HO_TRO", "PHHS"],
    icon: MessageSquare,
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-500",
  },
]

function mapModuleToCategory(mod: SourceModule): CategoryDefinition {
  return (
    SKYLINE_CATEGORIES.find((c) => c.modules.includes(mod)) ||
    SKYLINE_CATEGORIES[SKYLINE_CATEGORIES.length - 1]
  )
}

// ============================================================================
// 2. HÀM PHÂN TÁCH TRẠNG THÁI NGHIỆP VỤ & TRẠNG THÁI THỜI HẠN (MỤC 7)
// ============================================================================
export type BusinessStatusType = "NOT_STARTED" | "IN_PROGRESS" | "WAITING_APPROVAL" | "COMPLETED"
export type DeadlineStatusType = "ON_TIME" | "DUE_SOON" | "OVERDUE" | "NO_FIXED_DEADLINE"

/**
 * Kiểm tra xem nhiệm vụ có ngày hạn cố định cụ thể (dd/mm/yyyy hoặc Hôm nay) hay là hạn theo đợt/học kỳ
 */
function hasConcreteDeadlineDate(task: SSMTask): boolean {
  const dl = (task.deadline || "").trim().toLowerCase()
  if (!dl) return false
  const nonFixedPhrases = [
    "trong học kỳ",
    "trong đợt",
    "cuối đợt",
    "theo đợt",
    "trong tuần",
    "đang chờ",
    "chờ ttcm",
    "chờ tổ trưởng",
    "không thời hạn",
  ]
  if (nonFixedPhrases.some((p) => dl.includes(p))) {
    return false
  }
  return Boolean(task.deadlineDate)
}

function getBusinessStatusInfo(task: SSMTask): {
  code: BusinessStatusType
  label: string
  badgeClass: string
} {
  if (task.status === "COMPLETED") {
    return {
      code: "COMPLETED",
      label: "Hoàn thành",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    }
  }
  if (task.status === "WAITING") {
    return {
      code: "WAITING_APPROVAL",
      label: "Chờ phê duyệt",
      badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    }
  }
  const hasProgress =
    task.status === "IN_PROGRESS" ||
    (typeof task.metadata?.progressCurrent === "number" && task.metadata.progressCurrent > 0)
  if (hasProgress) {
    return {
      code: "IN_PROGRESS",
      label: "Đang thực hiện",
      badgeClass: "bg-teal-50 text-[#00736E] border-teal-200",
    }
  }
  return {
    code: "NOT_STARTED",
    label: "Chưa thực hiện",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  }
}

function getDeadlineStatusInfo(task: SSMTask): {
  code: DeadlineStatusType
  label: string
  badgeClass: string
} {
  // Quy tắc Mục 7: Đối với nhiệm vụ đã hoàn thành, không tiếp tục báo quá hạn
  if (task.status === "COMPLETED") {
    return {
      code: "ON_TIME",
      label: "Đã hoàn tất",
      badgeClass: "bg-emerald-50/70 text-emerald-700 border-emerald-200",
    }
  }

  if (task.status === "OVERDUE") {
    return {
      code: "OVERDUE",
      label: "Quá hạn",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    }
  }

  if (!hasConcreteDeadlineDate(task)) {
    return {
      code: "NO_FIXED_DEADLINE",
      label: task.deadline || "Theo đợt đánh giá",
      badgeClass: "bg-slate-50 text-slate-600 border-slate-200",
    }
  }

  const now = new Date()
  const dlDate = task.deadlineDate ? new Date(task.deadlineDate) : null
  if (dlDate) {
    const diffHours = (dlDate.getTime() - now.getTime()) / (1000 * 3600)
    if (diffHours < 0) {
      return {
        code: "OVERDUE",
        label: "Quá hạn",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      }
    }
    if (diffHours <= 72 || task.deadline.includes("Hôm nay") || task.priority === "URGENT") {
      return {
        code: "DUE_SOON",
        label: "Sắp đến hạn",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      }
    }
  }

  return {
    code: "ON_TIME",
    label: "Trong hạn",
    badgeClass: "bg-teal-50/60 text-teal-800 border-teal-200",
  }
}

/**
 * Nút thao tác chính riêng biệt cho từng loại nhiệm vụ (Mục 3.E)
 */
function getTaskPrimaryActionLabel(task: SSMTask): string {
  if (task.status === "COMPLETED") return "Xem lại kết quả"
  if (task.status === "WAITING") return "Xem hồ sơ chờ duyệt"

  switch (task.taskType) {
    case "SPECIAL_SUBJECT_EVALUATION":
      return "Vào đánh giá"
    case "EXPERIENTIAL_EVALUATION":
      return "Vào đánh giá"
    case "OBSERVATION_EVAL":
      return "Hoàn thiện phiếu"
    case "TTCM_APPROVE_OBSERVATION":
      return "Phê duyệt đăng ký"
    case "OBSERVATION_TARGET_CONFIRM":
      return "Xác nhận chỉ tiêu"
    case "OBSERVATION_MONTHLY_KPI_DEFICIT":
      return "Đăng ký dự giờ"
    case "OBSERVATION_TEACH":
      return "Xem lịch thao giảng"
    case "HOMEROOM_COMPETENCY_ASSESSMENT":
      return "Đánh giá năng lực"
    case "HOMEROOM_STUDENT_PROFILE":
      return "Cập nhật hồ sơ"
    case "CAREER_PROFILE_UPDATE":
      return "Mở sổ hướng nghiệp"
    case "KTDBCL_CONNECT_REPLY":
      return "Mở KT&ĐBCL Connect"
    case "GRADEBOOK_COMPLETION":
    case "SUBJECT_GRADEBOOK_ENTRY":
    case "CTQT_GRADEBOOK_ACTION":
      return "Mở sổ điểm"
    case "SUBJECT_UNDER_BENCHMARK_SUPPORT":
    case "SUBJECT_BENCHMARK_REMEDIAL":
      return "Lập kế hoạch hỗ trợ"
    case "GOAL_SIGN":
    case "GOAL_UNLOCK":
    case "ADVISORY_RED_YELLOW_FOLLOWUP":
    case "ADVISORY_AT_RISK_FOLLOWUP":
      return "Mở sổ cố vấn"
    case "STUDENT_HELP_REQUEST":
    case "HELP_REQUEST":
      return "Hỗ trợ học sinh"
    case "PARENT_FEEDBACK_RESPONSE":
    case "PARENT_OPINION_REPLY":
    case "PARENT_SUBJECT_FEEDBACK":
      return "Phản hồi PHHS"
    case "NPS_PARTICIPATION_FOLLOWUP":
    case "NPS_LOW_SCORE_ACTION":
      return "Xem khảo sát NPS"
    case "INPUT_ASSESSMENT_GRADING":
    case "PRESCHOOL_INPUT_ASSESSMENT":
    case "INPUT_SESSION_EXAMINER":
      return "Vào chấm khảo sát"
    default:
      return "Thực hiện"
  }
}

function getDateKey(dateStr?: string | null): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export default function TeacherTasksPage() {
  // ============================================================================
  // STATE QUẢN LÝ BỘ LỌC, CHẾ ĐỘ XEM & DỮ LIỆU
  // ============================================================================
  const [kpiFilter, setKpiFilter] = useState<
    "IN_PROGRESS_ALL" | "DUE_SOON" | "OVERDUE" | "WAITING" | "COMPLETED"
  >("IN_PROGRESS_ALL")
  const [categoryFilter, setCategoryFilter] = useState<SkylineTaskCategoryCode>("ALL")
  const [campusId, setCampusId] = useState<string>("ALL")
  const [classId, setClassId] = useState<string>("ALL")
  const [subjectId, setSubjectId] = useState<string>("ALL")
  const [timeRange, setTimeRange] = useState<"ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH">("ALL")
  const [bizStatusFilter, setBizStatusFilter] = useState<"ALL" | BusinessStatusType>("ALL")
  const [sortBy, setSortBy] = useState<"DEADLINE_ASC" | "PRIORITY_DESC" | "UPDATED_DESC">(
    "PRIORITY_DESC"
  )
  const [viewMode, setViewMode] = useState<"LIST" | "KANBAN" | "CALENDAR">("LIST")
  const [calendarSubView, setCalendarSubView] = useState<"MONTH" | "WEEK" | "DAY">("MONTH")
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)

  // Tìm kiếm có debounce 250ms (Mục 8)
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  const [showEmptyCategories, setShowEmptyCategories] = useState(false)
  const [showMobileFilterDrawer, setShowMobileFilterDrawer] = useState(false)
  const [visibleCount, setVisibleCount] = useState(20)

  // Dữ liệu từ API
  const [profile, setProfile] = useState<UnifiedTeacherAssignmentProfile | null>(null)
  const [allTasks, setAllTasks] = useState<SSMTask[]>([])
  const [progressAndKPI, setProgressAndKPI] = useState<SeparatedProgressAndKPI | null>(null)
  const [reminderHistory, setReminderHistory] = useState<
    Array<{
      id: string
      title: string
      message: string
      type: string
      link: string
      isRead: boolean
      createdAt: string
    }>
  >([])
  const [filterOptions, setFilterOptions] = useState<{
    campuses: Array<{ id: string; campusCode: string; campusName: string }>
    classes: Array<{ id: string; name: string }>
    subjects: Array<{ id: string; name: string }>
  }>({ campuses: [], classes: [], subjects: [] })

  const [selectedTask, setSelectedTask] = useState<SSMTask | null>(null)
  const [showReminderDrawer, setShowReminderDrawer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [runningReminder, setRunningReminder] = useState(false)
  const [updatedAtStr, setUpdatedAtStr] = useState<string>("")
  const [kanbanToast, setKanbanToast] = useState<string | null>(null)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)

  // Trợ lý Công việc tương tác (Sky-Line Task Assistant bám sát phân quyền & gán SSM)
  const [assistantQuery, setAssistantQuery] = useState("")
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [showAssistantModal, setShowAssistantModal] = useState(false)
  const [assistantAnswer, setAssistantAnswer] = useState<{
    query: string
    markdown: string
    updatedAt: string
    deepLinks: Array<{ label: string; href: string }>
  } | null>(null)

  // Lịch tháng ở Panel phải & Chế độ Lịch
  const [calendarCursor, setCalendarCursor] = useState<Date>(() => new Date())

  // Nhận diện màu sắc cơ sở của giáo viên (hoặc theo cơ sở đang lọc)
  const campusSeed = useMemo(() => {
    if (campusId !== "ALL") {
      const selectedCampus = filterOptions.campuses.find((c) => c.id === campusId)
      if (selectedCampus) {
        return selectedCampus.campusCode || selectedCampus.campusName
      }
    }
    return (
      profile?.campuses?.[0]?.campusCode ||
      profile?.campuses?.[0]?.campusName ||
      profile?.homeroomClasses?.[0]?.className ||
      filterOptions.campuses?.[0]?.campusCode ||
      filterOptions.campuses?.[0]?.campusName ||
      "CS1"
    )
  }, [campusId, filterOptions.campuses, profile])

  const campusTheme = useCampusTheme(campusSeed)

  // Khôi phục trạng thái lọc từ URL khi mở trang (Mục 3.C)
  useEffect(() => {
    if (typeof window === "undefined") return
    const sp = new URLSearchParams(window.location.search)
    const kpi = sp.get("kpi")
    if (
      kpi &&
      ["IN_PROGRESS_ALL", "DUE_SOON", "OVERDUE", "WAITING", "COMPLETED"].includes(kpi)
    ) {
      setKpiFilter(kpi as any)
    }
    const cat = sp.get("cat")
    if (cat && SKYLINE_CATEGORIES.some((c) => c.code === cat)) {
      setCategoryFilter(cat as SkylineTaskCategoryCode)
    }
    const view = sp.get("view")
    if (view && ["LIST", "KANBAN", "CALENDAR"].includes(view)) {
      setViewMode(view as any)
    }
    const sort = sp.get("sort")
    if (sort && ["DEADLINE_ASC", "PRIORITY_DESC", "UPDATED_DESC"].includes(sort)) {
      setSortBy(sort as any)
    }
    if (sp.get("campusId")) setCampusId(sp.get("campusId")!)
    if (sp.get("classId")) setClassId(sp.get("classId")!)
    if (sp.get("subjectId")) setSubjectId(sp.get("subjectId")!)
    if (sp.get("q")) {
      setSearchInput(sp.get("q")!)
      setDebouncedSearch(sp.get("q")!)
    }
    if (sp.get("date")) setSelectedDateKey(sp.get("date")!)
  }, [])

  // Debounce tìm kiếm 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
    }, 250)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Lưu trạng thái lọc vào URL để quay lại trang không mất ngữ cảnh (Mục 3.C)
  useEffect(() => {
    if (typeof window === "undefined") return
    const sp = new URLSearchParams()
    if (kpiFilter !== "IN_PROGRESS_ALL") sp.set("kpi", kpiFilter)
    if (categoryFilter !== "ALL") sp.set("cat", categoryFilter)
    if (viewMode !== "LIST") sp.set("view", viewMode)
    if (sortBy !== "PRIORITY_DESC") sp.set("sort", sortBy)
    if (campusId !== "ALL") sp.set("campusId", campusId)
    if (classId !== "ALL") sp.set("classId", classId)
    if (subjectId !== "ALL") sp.set("subjectId", subjectId)
    if (debouncedSearch) sp.set("q", debouncedSearch)
    if (selectedDateKey) sp.set("date", selectedDateKey)

    const qs = sp.toString()
    const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ""}`
    window.history.replaceState(null, "", newUrl)
  }, [
    kpiFilter,
    categoryFilter,
    viewMode,
    sortBy,
    campusId,
    classId,
    subjectId,
    debouncedSearch,
    selectedDateKey,
  ])

  const fetchWorkspaceData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    setErrorMsg(null)
    try {
      const params = new URLSearchParams()
      const savedYearId =
        typeof window !== "undefined"
          ? localStorage.getItem("selectedAcademicYear") ||
            localStorage.getItem("academicYearId") ||
            ""
          : ""
      if (savedYearId) params.set("academicYearId", savedYearId)
      if (isManual) params.set("refresh", "true")

      const res = await fetch(`/api/teacher/workspace?${params.toString()}`)
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || `Lỗi tải dữ liệu (${res.status})`)
      }
      const json = await res.json()
      setProfile(json.profile || null)
      setAllTasks(json.allTasks || json.tasks || [])
      if (json.progressAndKPI) setProgressAndKPI(json.progressAndKPI)
      if (json.reminderHistory) setReminderHistory(json.reminderHistory)
      if (json.filterOptions) setFilterOptions(json.filterOptions)
      setUpdatedAtStr(
        json.updatedAt
          ? new Date(json.updatedAt).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : new Date().toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })
      )
    } catch (err: any) {
      console.error("[TeacherTasksPage] Error loading workspace:", err)
      setErrorMsg(err?.message || "Không thể kết nối máy chủ. Vui lòng thử lại.")
    } finally {
      setLoading(false)
      if (isManual) {
        setTimeout(() => setRefreshing(false), 250)
      }
    }
  }, [])

  useEffect(() => {
    fetchWorkspaceData(false)
    const onYearChanged = () => fetchWorkspaceData(true)
    window.addEventListener("academicYearChanged", onYearChanged)
    return () => window.removeEventListener("academicYearChanged", onYearChanged)
  }, [fetchWorkspaceData])

  // ============================================================================
  // TÍNH TOÁN 5 CHỈ SỐ KPI OVERVIEW TỪ DỮ LIỆU THỰC (MỤC 3.B)
  // ============================================================================
  const kpiStats = useMemo(() => {
    let activeTotal = 0 // Đang thực hiện: Tổng nhiệm vụ chưa hoàn thành
    let dueSoonOrPriority = 0 // Cần xử lý sớm: Nhiệm vụ gần đến hạn hoặc cần ưu tiên (chưa hoàn thành, không quá hạn, không chờ duyệt)
    let overdue = 0 // Quá hạn: Nhiệm vụ đã quá hạn và chưa hoàn thành
    let waiting = 0 // Chờ phê duyệt: Nhiệm vụ đang chờ cấp có thẩm quyền xử lý
    let completed = 0 // Đã hoàn thành: Số nhiệm vụ hoàn thành trong kỳ

    for (const t of allTasks) {
      if (t.status === "COMPLETED") {
        completed++
        continue
      }
      activeTotal++

      if (t.status === "WAITING") {
        waiting++
        continue
      }

      const dlStatus = getDeadlineStatusInfo(t)
      if (t.status === "OVERDUE" || dlStatus.code === "OVERDUE") {
        overdue++
        continue
      }

      if (
        dlStatus.code === "DUE_SOON" ||
        t.priority === "URGENT" ||
        t.priority === "HIGH"
      ) {
        dueSoonOrPriority++
      }
    }

    // Nếu progressAndKPI có thêm số lượng hoàn thành từ các phân hệ khác, lấy max để đồng bộ
    const finalCompleted = Math.max(
      completed,
      progressAndKPI?.volumeProgress.completedTasks ?? 0
    )

    return {
      activeTotal,
      dueSoonOrPriority,
      overdue,
      waiting,
      completed: finalCompleted,
    }
  }, [allTasks, progressAndKPI])

  // ============================================================================
  // ĐẾM SỐ LƯỢNG THEO 8 NHÓM NGHIỆP VỤ (KHÔNG ĐẾM TRÙNG - MỤC 3.D)
  // ============================================================================
  const categoryCounts = useMemo(() => {
    const map: Record<SkylineTaskCategoryCode, number> = {
      ALL: 0,
      CHU_NHIEM_DGNL: 0,
      GIANG_DAY_CHAT_LUONG: 0,
      DU_GIO_PTCM: 0,
      CO_VAN_HOC_TAP: 0,
      MON_DAC_THU: 0,
      HOAT_DONG_TRAI_NGHIEM: 0,
      KHAO_THI_KHAO_SAT: 0,
      NHIEM_VU_KHAC: 0,
    }

    const basePool =
      kpiFilter === "COMPLETED"
        ? allTasks.filter((t) => t.status === "COMPLETED")
        : allTasks.filter((t) => t.status !== "COMPLETED")

    for (const t of basePool) {
      map.ALL++
      const cat = mapModuleToCategory(t.sourceModule)
      map[cat.code] = (map[cat.code] || 0) + 1
    }
    return map
  }, [allTasks, kpiFilter])

  // ============================================================================
  // LỌC & SẮP XẾP DANH SÁCH NHIỆM VỤ ĐỒNG BỘ (MỤC 3.C)
  // ============================================================================
  const filteredAndSortedTasks = useMemo(() => {
    let list = [...allTasks]

    // 1. Lọc theo thẻ KPI đang chọn (trừ khi ở chế độ KANBAN cần hiện cả 4 cột)
    if (viewMode !== "KANBAN") {
      if (kpiFilter === "COMPLETED") {
        list = list.filter((t) => t.status === "COMPLETED")
      } else if (kpiFilter === "WAITING") {
        list = list.filter((t) => t.status === "WAITING")
      } else if (kpiFilter === "OVERDUE") {
        list = list.filter(
          (t) => t.status !== "COMPLETED" && (t.status === "OVERDUE" || getDeadlineStatusInfo(t).code === "OVERDUE")
        )
      } else if (kpiFilter === "DUE_SOON") {
        list = list.filter((t) => {
          if (t.status === "COMPLETED" || t.status === "WAITING") return false
          const dl = getDeadlineStatusInfo(t)
          if (t.status === "OVERDUE" || dl.code === "OVERDUE") return false
          return dl.code === "DUE_SOON" || t.priority === "URGENT" || t.priority === "HIGH"
        })
      } else {
        // IN_PROGRESS_ALL: Tất cả nhiệm vụ chưa hoàn thành
        list = list.filter((t) => t.status !== "COMPLETED")
      }
    }

    // 2. Lọc theo nhóm nghiệp vụ (8 nhóm chuẩn hóa)
    if (categoryFilter !== "ALL") {
      const catDef = SKYLINE_CATEGORIES.find((c) => c.code === categoryFilter)
      if (catDef) {
        list = list.filter((t) => catDef.modules.includes(t.sourceModule))
      }
    }

    // 3. Lọc theo Cơ sở
    if (campusId !== "ALL") {
      list = list.filter((t) => !t.metadata?.campusId || t.metadata.campusId === campusId)
    }

    // 4. Lọc theo Lớp
    if (classId !== "ALL") {
      list = list.filter(
        (t) => t.metadata?.classId === classId || t.metadata?.className === classId
      )
    }

    // 5. Lọc theo Môn
    if (subjectId !== "ALL") {
      list = list.filter(
        (t) => t.metadata?.subjectId === subjectId || t.metadata?.subjectName === subjectId
      )
    }

    // 6. Lọc theo Trạng thái nghiệp vụ (bizStatusFilter)
    if (bizStatusFilter !== "ALL") {
      list = list.filter((t) => getBusinessStatusInfo(t).code === bizStatusFilter)
    }

    // 7. Lọc theo Thời gian hoặc Ngày chọn trên Lịch
    if (selectedDateKey) {
      list = list.filter((t) => {
        if (!hasConcreteDeadlineDate(t)) return false
        return getDateKey(t.deadlineDate) === selectedDateKey
      })
    } else if (timeRange !== "ALL") {
      const now = new Date()
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      const weekEnd = new Date(todayEnd.getTime() + 7 * 86400000)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      list = list.filter((t) => {
        if (timeRange === "TODAY") {
          return (
            t.status === "OVERDUE" ||
            t.deadline.includes("Hôm nay") ||
            (hasConcreteDeadlineDate(t) &&
              t.deadlineDate &&
              new Date(t.deadlineDate) <= todayEnd)
          )
        }
        if (timeRange === "THIS_WEEK") {
          return (
            t.status === "OVERDUE" ||
            t.deadline.includes("Hôm nay") ||
            t.deadline.includes("Trong tuần") ||
            (hasConcreteDeadlineDate(t) &&
              t.deadlineDate &&
              new Date(t.deadlineDate) <= weekEnd)
          )
        }
        if (timeRange === "THIS_MONTH") {
          return (
            !t.deadlineDate || new Date(t.deadlineDate) <= monthEnd
          )
        }
        return true
      })
    }

    // 8. Tìm kiếm từ khóa (Tên nhiệm vụ, lớp, môn học)
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q) ||
          (t.metadata?.className || "").toLowerCase().includes(q) ||
          (t.metadata?.subjectName || "").toLowerCase().includes(q) ||
          (t.metadata?.moduleLabel || "").toLowerCase().includes(q)
      )
    }

    // 9. Sắp xếp (Hạn gần nhất | Mức ưu tiên | Ngày cập nhật)
    const prioWeight: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 }
    list.sort((a, b) => {
      if (sortBy === "DEADLINE_ASC") {
        const aExact = hasConcreteDeadlineDate(a)
        const bExact = hasConcreteDeadlineDate(b)
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        const aTime = a.deadlineDate ? new Date(a.deadlineDate).getTime() : Number.MAX_SAFE_INTEGER
        const bTime = b.deadlineDate ? new Date(b.deadlineDate).getTime() : Number.MAX_SAFE_INTEGER
        if (aTime !== bTime) return aTime - bTime
      }
      if (sortBy === "UPDATED_DESC") {
        const aUpd = new Date(a.updatedAt || a.createdAt).getTime()
        const bUpd = new Date(b.updatedAt || b.createdAt).getTime()
        if (bUpd !== aUpd) return bUpd - aUpd
      }
      // Mặc định: Mức ưu tiên & quá hạn lên trước
      if (a.status === "OVERDUE" && b.status !== "OVERDUE") return -1
      if (a.status !== "OVERDUE" && b.status === "OVERDUE") return 1
      const pDiff = (prioWeight[a.priority] ?? 9) - (prioWeight[b.priority] ?? 9)
      if (pDiff !== 0) return pDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return list
  }, [
    allTasks,
    viewMode,
    kpiFilter,
    categoryFilter,
    campusId,
    classId,
    subjectId,
    bizStatusFilter,
    selectedDateKey,
    timeRange,
    debouncedSearch,
    sortBy,
  ])

  const resetAllFilters = () => {
    setKpiFilter("IN_PROGRESS_ALL")
    setCategoryFilter("ALL")
    setCampusId("ALL")
    setClassId("ALL")
    setSubjectId("ALL")
    setTimeRange("ALL")
    setBizStatusFilter("ALL")
    setSortBy("PRIORITY_DESC")
    setSelectedDateKey(null)
    setSearchInput("")
    setDebouncedSearch("")
  }

  const hasActiveFilters =
    kpiFilter !== "IN_PROGRESS_ALL" ||
    categoryFilter !== "ALL" ||
    campusId !== "ALL" ||
    classId !== "ALL" ||
    subjectId !== "ALL" ||
    timeRange !== "ALL" ||
    bizStatusFilter !== "ALL" ||
    selectedDateKey !== null ||
    debouncedSearch.length > 0

  // ============================================================================
  // DỮ LIỆU LỊCH THÁNG & TRỢ LÝ CÔNG VIỆC (MỤC 4.A & 4.B)
  // ============================================================================
  const calendarMonthData = useMemo(() => {
    const year = calendarCursor.getFullYear()
    const month = calendarCursor.getMonth()
    const firstDayOfMonth = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    // Chuyển Chủ nhật (0) -> 6, Thứ Hai (1) -> 0
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7

    const dateTaskMap = new Map<
      string,
      { total: number; overdue: number; tasks: SSMTask[] }
    >()
    const unscheduledTasks: SSMTask[] = []

    for (const t of allTasks) {
      if (t.status === "COMPLETED") continue
      if (!hasConcreteDeadlineDate(t)) {
        unscheduledTasks.push(t)
        continue
      }
      const key = getDateKey(t.deadlineDate)
      if (!key) {
        unscheduledTasks.push(t)
        continue
      }
      const entry = dateTaskMap.get(key) || { total: 0, overdue: 0, tasks: [] }
      entry.total++
      if (t.status === "OVERDUE" || getDeadlineStatusInfo(t).code === "OVERDUE") {
        entry.overdue++
      }
      entry.tasks.push(t)
      dateTaskMap.set(key, entry)
    }

    const cells: Array<{
      day: number | null
      dateKey: string | null
      isToday: boolean
      total: number
      overdue: number
      tasks: SSMTask[]
    }> = []

    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: null, dateKey: null, isToday: false, total: 0, overdue: 0, tasks: [] })
    }

    const todayKey = getDateKey(new Date().toISOString())
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      const info = dateTaskMap.get(key)
      cells.push({
        day: d,
        dateKey: key,
        isToday: key === todayKey,
        total: info?.total || 0,
        overdue: info?.overdue || 0,
        tasks: info?.tasks || [],
      })
    }

    return {
      year,
      month,
      monthLabel: `Tháng ${month + 1}/${year}`,
      cells,
      dateTaskMap,
      unscheduledTasks,
    }
  }, [calendarCursor, allTasks])

  // Trợ lý Công việc (Rule Engine dựa trên dữ liệu thực SSM - Mục 4.B)
  const advisorInsights = useMemo(() => {
    const active = allTasks.filter((t) => t.status !== "COMPLETED")
    const overdueList = active.filter(
      (t) => t.status === "OVERDUE" || getDeadlineStatusInfo(t).code === "OVERDUE"
    )
    const obsTasks = active.filter(
      (t) => t.sourceModule === "DU_GIO" && t.status !== "WAITING"
    )
    const expTasks = active.filter(
      (t) => t.sourceModule === "TRAI_NGHIEM" && t.status !== "WAITING"
    )
    const covanTasks = active.filter((t) => t.sourceModule === "CO_VAN")
    const gradeTasks = active.filter(
      (t) =>
        (t.sourceModule === "CHAT_LUONG_GIANG_DAY" ||
          t.sourceModule === "MON_DAC_THU" ||
          t.sourceModule === "LOP_CHU_NHIEM") &&
        t.status !== "WAITING"
    )

    // Gợi ý thứ tự ưu tiên thực hiện (Top 3 việc cần làm trước)
    const recommendedOrder = [...active]
      .filter((t) => t.status !== "WAITING")
      .sort((a, b) => {
        const aOver = a.status === "OVERDUE" ? 0 : 1
        const bOver = b.status === "OVERDUE" ? 0 : 1
        if (aOver !== bOver) return aOver - bOver
        const pMap: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 }
        return (pMap[a.priority] ?? 9) - (pMap[b.priority] ?? 9)
      })
      .slice(0, 3)

    return {
      overdueList,
      obsTasks,
      expTasks,
      covanTasks,
      gradeTasks,
      recommendedOrder,
    }
  }, [allTasks])

  // Gợi ý câu hỏi thông minh cá nhân hóa theo đúng vai trò & phân quyền SSM của Giáo viên
  const assistantQuickPrompts = useMemo(() => {
    const prompts: Array<{ label: string; query: string }> = [
      { label: "📋 Hôm nay tôi cần làm gì?", query: "Hôm nay tôi cần làm gì?" },
      { label: "🛡️ Phân quyền & phân công SSM", query: "Phân công của tôi trên SSM" },
      { label: "⏰ Nhiệm vụ sắp quá hạn?", query: "Những nhiệm vụ nào sắp quá hạn?" },
      { label: "🏫 Định mức KPI dự giờ?", query: "Tôi còn thiếu bao nhiêu tiết dự giờ để đủ KPI?" },
    ]
    if (!profile || profile.rolesDetected.isGVCN) {
      prompts.push(
        { label: "🎯 Thiếu bao nhiêu ĐGNL?", query: "Tôi còn thiếu bao nhiêu đánh giá năng lực?" },
        { label: "🤝 Hồ sơ cố vấn cần cập nhật?", query: "Hồ sơ cố vấn học tập nào cần cập nhật?" },
        { label: "💬 Ý kiến PHHS chưa xử lý?", query: "Ý kiến PHHS nào chưa được giải quyết?" }
      )
    }
    if (!profile || profile.rolesDetected.isGVBM) {
      prompts.push({
        label: "📉 HS dưới chuẩn Benchmark?",
        query: "Các môn tôi phụ trách có bao nhiêu học sinh dưới chuẩn?",
      })
    }
    if (!profile || profile.rolesDetected.isGVMonDacThu || profile.rolesDetected.isGVCN) {
      prompts.push(
        {
          label: "🧭 Sổ hướng nghiệp & Môn ĐT?",
          query: "Sổ theo dõi hướng nghiệp & môn đặc thù",
        },
        {
          label: "🌱 HĐ trải nghiệm chưa xong?",
          query: "Hoạt động trải nghiệm nào chưa hoàn thành?",
        }
      )
    }
    return prompts
  }, [profile])

  const handleAskAssistant = useCallback(
    async (customQuery?: string, openModal = false) => {
      const q = (customQuery ?? assistantQuery).trim()
      if (!q) return
      setAssistantLoading(true)
      if (openModal) setShowAssistantModal(true)
      try {
        const res = await fetch("/api/teacher/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "ASK_ASSISTANT", query: q }),
        })
        const data = await res.json()
        if (res.ok && data?.answer) {
          setAssistantAnswer({
            query: q,
            markdown: data.answer.markdown || "Đã đối chiếu dữ liệu thực trên SSM.",
            updatedAt: data.answer.updatedAt || new Date().toISOString(),
            deepLinks: Array.isArray(data.answer.deepLinks) ? data.answer.deepLinks : [],
          })
        }
      } catch (err) {
        console.error("Error asking Task Assistant:", err)
      } finally {
        setAssistantLoading(false)
      }
    },
    [assistantQuery]
  )

  // ============================================================================
  // XỬ LÝ THAO TÁC TRÊN NHIỆM VỤ & KÉO THẢ KANBAN (MỤC 3.F.2 & NGUYÊN TẮC 9)
  // ============================================================================
  const handleMarkWorkTaskComplete = async (taskId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    try {
      const res = await fetch("/api/pwa/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, action: "COMPLETE" }),
      })
      if (res.ok) {
        await fetchWorkspaceData(true)
      }
    } catch (err) {
      console.error("Error completing task:", err)
    }
  }

  const handleKanbanDrop = async (targetCol: BusinessStatusType) => {
    if (!draggedTaskId) return
    const task = allTasks.find((t) => t.taskId === draggedTaskId)
    setDraggedTaskId(null)
    if (!task) return

    // Nguyên tắc 9: Không thay đổi trạng thái nhiệm vụ nếu giáo viên chưa thực hiện hành động hợp lệ tại phân hệ gốc
    if (task.sourceModule !== "CONG_TAC") {
      setKanbanToast(
        `Nhiệm vụ "${task.title}" được đồng bộ tự động từ dữ liệu thực. Vui lòng nhấn "${getTaskPrimaryActionLabel(task)}" để thực hiện tại màn hình chức năng.`
      )
      setTimeout(() => setKanbanToast(null), 5000)
      return
    }

    if (targetCol === "COMPLETED" && task.status !== "COMPLETED") {
      await handleMarkWorkTaskComplete(task.taskId)
      setKanbanToast(`Đã cập nhật hoàn thành nhiệm vụ "${task.title}".`)
      setTimeout(() => setKanbanToast(null), 3500)
    }
  }

  const handleTriggerReminder = async () => {
    setRunningReminder(true)
    try {
      await fetch("/api/teacher/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RUN_REMINDER_CHECK", forceDispatch: true }),
      })
      await fetchWorkspaceData(true)
    } catch (err) {
      console.error("Error running reminder check:", err)
    } finally {
      setRunningReminder(false)
    }
  }

  // Phân tách các nhóm có nhiệm vụ và nhóm 0 nhiệm vụ để thanh lọc gọn gàng (Mục 3.D)
  const visibleCategories = useMemo(() => {
    const nonEmpty = SKYLINE_CATEGORIES.filter(
      (c) => c.code === "ALL" || (categoryCounts[c.code] || 0) > 0 || categoryFilter === c.code
    )
    const empty = SKYLINE_CATEGORIES.filter(
      (c) => c.code !== "ALL" && (categoryCounts[c.code] || 0) === 0 && categoryFilter !== c.code
    )
    return { nonEmpty, empty }
  }, [categoryCounts, categoryFilter])

  // ============================================================================
  // RENDER HÀNG NHIỆM VỤ TRONG DANH SÁCH (MỤC 3.E - LIST VIEW DEFAULT)
  // ============================================================================
  const renderTaskRow = (task: SSMTask) => {
    const cat = mapModuleToCategory(task.sourceModule)
    const CatIcon = cat.icon
    const bizStatus = getBusinessStatusInfo(task)
    const dlStatus = getDeadlineStatusInfo(task)
    const ctaLabel = getTaskPrimaryActionLabel(task)
    const isSelected = selectedTask?.taskId === task.taskId
    const hasQuantProgress = typeof task.metadata?.progressTotal === "number" && task.metadata.progressTotal > 0

    return (
      <div
        key={task.taskId}
        onClick={() => setSelectedTask(task)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setSelectedTask(task)
          }
        }}
        className={`group bg-white rounded-xl p-4 border transition-colors cursor-pointer focus:outline-none ${
          isSelected
            ? "shadow-xs"
            : dlStatus.code === "OVERDUE"
            ? "border-rose-200/90 hover:border-rose-300"
            : "border-slate-200/80"
        }`}
        style={
          isSelected
            ? {
                borderColor: campusTheme.primaryColor,
                backgroundColor: campusTheme.lightAccentBg,
              }
            : undefined
        }
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Khối 1: Tên nhiệm vụ, Nhóm nghiệp vụ, Cơ sở/Lớp/Môn & Mô tả tối đa 2 dòng */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border ${cat.badgeClass}`}
              >
                <CatIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{cat.label}</span>
              </span>

              {task.metadata?.className && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/70">
                  Lớp {task.metadata.className}
                </span>
              )}

              {task.metadata?.subjectName && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-md border"
                  style={{
                    backgroundColor: campusTheme.lightAccentBg,
                    color: campusTheme.primaryColor,
                    borderColor: campusTheme.borderSubtle,
                  }}
                >
                  {task.metadata.subjectName}
                </span>
              )}

              {task.metadata?.campusName && (
                <span className="text-xs text-slate-500 hidden sm:inline">
                  • {task.metadata.campusName}
                </span>
              )}
            </div>

            <h3 className="text-[15px] font-bold text-slate-900 transition-colors leading-snug">
              {task.title}
            </h3>

            {task.description && (
              <p className="text-[13px] text-slate-600 line-clamp-2 leading-relaxed">
                {task.description}
              </p>
            )}
          </div>

          {/* Khối 2: Tiến độ, Trạng thái nghiệp vụ, Trạng thái thời hạn & Nút thao tác chính */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-3 sm:gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            {/* Tiến độ hợp lệ */}
            <div className="w-32 sm:w-36 shrink-0">
              {hasQuantProgress ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 tabular-nums">
                    <span className="text-slate-500">Tiến độ:</span>
                    <span>
                      {task.metadata?.progressCurrent}/{task.metadata?.progressTotal}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(4, Math.min(100, task.metadata?.progressPercent || 0))}%`,
                        backgroundColor: campusTheme.primaryColor,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  <span className="block font-medium text-slate-700">Đầu việc đơn</span>
                  <span>1 bước xử lý</span>
                </div>
              )}
            </div>

            {/* Trạng thái nghiệp vụ & Trạng thái thời hạn tách biệt (Mục 7) */}
            <div className="flex flex-col items-start sm:items-end gap-1 min-w-[135px]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${bizStatus.badgeClass}`}
                  title="Trạng thái nghiệp vụ"
                >
                  {bizStatus.label}
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${dlStatus.badgeClass}`}
                  title="Trạng thái thời hạn"
                >
                  {dlStatus.label}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 tabular-nums">
                <Clock className="w-3 h-3 shrink-0" />
                <span>Hạn: {task.deadline}</span>
              </div>
            </div>

            {/* Nút thao tác chính riêng biệt theo màu sắc Cơ sở GV */}
            <div className="flex items-center gap-2 shrink-0">
              {task.sourceModule === "CONG_TAC" && task.status !== "COMPLETED" && (
                <button
                  type="button"
                  onClick={(e) => handleMarkWorkTaskComplete(task.taskId, e)}
                  className="px-2.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 cursor-pointer"
                  title="Đánh dấu hoàn thành công việc được giao"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}

              <Link
                href={task.deepLink}
                onClick={(e) => e.stopPropagation()}
                className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold shadow-2xs transition-colors min-w-[130px] focus:outline-none ${campusTheme.btnPrimaryStyle}`}
              >
                <span>{ctaLabel}</span>
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1440px] mx-auto space-y-4 pb-20 sm:pb-10 text-slate-900">
      {/* ==========================================================================
          3.A. HEADER – THÔNG TIN CÁ NHÂN (MÀU SẮC NHẬN DIỆN THEO CƠ SỞ GIÁO VIÊN)
         ========================================================================== */}
      <div
        className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${campusTheme.lightBg} 0%, #FFFFFF 55%, ${campusTheme.lightAccentBg} 100%)`,
          borderColor: campusTheme.borderSubtle,
        }}
      >
        {/* Dải màu nhận diện cơ sở trên đỉnh Header */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ background: campusTheme.heroBadgeGradient }}
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
          {/* Cột Trái: Tiêu đề "Nhiệm vụ của tôi", Cơ sở biên chế, Mô tả, Năm học & Vai trò phân công */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Nhiệm vụ của tôi
              </h1>

              {/* Huy hiệu Cơ sở Giáo viên */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-2xs ${campusTheme.campusBadge.bg} ${campusTheme.campusBadge.text} ${campusTheme.campusBadge.border}`}
              >
                <span className={`w-2 h-2 rounded-full ${campusTheme.campusBadge.dotColor}`} />
                <span>{campusTheme.name}</span>
                <span className="text-[11px] font-medium opacity-80">
                  ({campusTheme.locationName})
                </span>
              </span>

              {profile?.academicYearName && (
                <span
                  className="px-2.5 py-0.5 rounded-md text-xs font-bold border"
                  style={{
                    backgroundColor: campusTheme.lightAccentBg,
                    color: campusTheme.primaryColor,
                    borderColor: campusTheme.borderSubtle,
                  }}
                >
                  Năm học {profile.academicYearName} • Học kỳ hiện hành
                </span>
              )}
              {updatedAtStr && (
                <span className="text-xs text-slate-500">
                  Cập nhật lúc {updatedAtStr}
                </span>
              )}
            </div>

            <p className="text-sm text-slate-600">
              Theo dõi công việc, tiến độ và chất lượng thực hiện.
            </p>

            {/* Thông tin giáo viên & Các vai trò được phân công */}
            {profile && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-xs font-bold text-slate-800 mr-1">
                  GV: {profile.teacherName}
                  {profile.teacherCode ? ` (${profile.teacherCode})` : ""}
                </span>

                {profile.rolesDetected.isGVCN && (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-md border"
                    style={{
                      backgroundColor: campusTheme.lightAccentBg,
                      color: campusTheme.primaryColor,
                      borderColor: campusTheme.borderSubtle,
                    }}
                  >
                    <Users className="w-3 h-3" />
                    <span>
                      GVCN: {profile.homeroomClasses.map((c) => c.className).join(", ")}
                    </span>
                  </span>
                )}

                {profile.rolesDetected.isGVBM && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <BookOpen className="w-3 h-3" />
                    <span>
                      GVBM:{" "}
                      {Array.from(
                        new Set(profile.teachingAssignments.map((a) => a.subjectName))
                      ).join(", ")}{" "}
                      ({profile.teachingAssignments.length} lớp)
                    </span>
                  </span>
                )}

                {profile.rolesDetected.isGVCTQT && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-200">
                    <Compass className="w-3 h-3" />
                    <span>GV CTQT ({profile.ctqtAssignments.length} lớp)</span>
                  </span>
                )}

                {profile.rolesDetected.isGVMonDacThu && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-md bg-purple-50 text-[#5B3E96] border border-purple-200">
                    <Sparkles className="w-3 h-3" />
                    <span>
                      Môn đặc thù:{" "}
                      {Array.from(
                        new Set(profile.specialAssignments.map((s) => s.subjectName))
                      ).join(", ")}
                    </span>
                  </span>
                )}

                {profile.rolesDetected.isTTCM && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    <Award className="w-3 h-3" />
                    <span>
                      TTCM ({profile.managedDepartmentNames.join(", ") || "Tổ chuyên môn"})
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Cột Phải: Tìm kiếm nhanh, Thông báo công việc & Làm mới */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm nhanh nhiệm vụ, lớp, môn..."
                aria-label="Tìm kiếm nhanh nhiệm vụ"
                className="w-full h-9 pl-9 pr-7 rounded-lg bg-white/90 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white"
                style={{ borderColor: searchInput ? campusTheme.primaryColor : undefined }}
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("")
                    setDebouncedSearch("")
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAssistantModal(true)
                if (!assistantAnswer) {
                  handleAskAssistant("Hôm nay tôi cần làm gì?", false)
                }
              }}
              className="h-9 px-3 rounded-lg bg-white hover:bg-slate-50 border text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer focus:outline-none"
              style={{
                borderColor: campusTheme.borderSubtle,
                color: campusTheme.primaryColor,
                backgroundColor: campusTheme.lightAccentBg,
              }}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Trợ lý Công việc</span>
            </button>

            <button
              type="button"
              onClick={() => setShowReminderDrawer(true)}
              className="h-9 px-3 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer focus:outline-none"
            >
              <BellRing className="w-3.5 h-3.5" style={{ color: campusTheme.primaryColor }} />
              <span>Thông báo</span>
              <span
                className="px-1.5 py-0.2 rounded-full text-[11px] font-bold tabular-nums"
                style={{
                  backgroundColor: campusTheme.lightAccentBg,
                  color: campusTheme.primaryColor,
                }}
              >
                {reminderHistory.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => fetchWorkspaceData(true)}
              className="h-9 px-3 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer focus:outline-none"
              title="Đồng bộ dữ liệu mới nhất"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
                style={refreshing ? { color: campusTheme.primaryColor } : undefined}
              />
              <span className="hidden sm:inline">Đồng bộ</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==========================================================================
          3.B. KPI OVERVIEW – TỔNG QUAN NHIỆM VỤ (5 THẺ TRÊN 1 HÀNG DESKTOP)
         ========================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 tabular-nums">
        {/* KPI 1: Đang thực hiện (Màu theo Cơ sở GV khi đang chọn) */}
        <button
          type="button"
          onClick={() => setKpiFilter("IN_PROGRESS_ALL")}
          className={`rounded-xl p-3.5 text-left border transition-colors cursor-pointer focus:outline-none ${
            kpiFilter === "IN_PROGRESS_ALL"
              ? "text-white shadow-xs"
              : "bg-white hover:bg-slate-50 text-slate-900 border-slate-200/90"
          }`}
          style={
            kpiFilter === "IN_PROGRESS_ALL"
              ? {
                  background: campusTheme.heroBadgeGradient,
                  borderColor: campusTheme.primaryColor,
                }
              : undefined
          }
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-xs font-bold ${
                kpiFilter === "IN_PROGRESS_ALL" ? "text-white/95" : "text-slate-600"
              }`}
            >
              Đang thực hiện
            </span>
            <Layers
              className={`w-4 h-4 shrink-0 ${
                kpiFilter === "IN_PROGRESS_ALL" ? "text-white/90" : ""
              }`}
              style={
                kpiFilter !== "IN_PROGRESS_ALL"
                  ? { color: campusTheme.primaryColor }
                  : undefined
              }
            />
          </div>
          <div className="text-2xl font-black mt-1">{kpiStats.activeTotal}</div>
          <p
            className={`text-xs mt-0.5 ${
              kpiFilter === "IN_PROGRESS_ALL" ? "text-white/85" : "text-slate-500"
            }`}
          >
            Tổng nhiệm vụ chưa hoàn thành
          </p>
        </button>

        {/* KPI 2: Cần xử lý sớm */}
        <button
          type="button"
          onClick={() =>
            setKpiFilter(kpiFilter === "DUE_SOON" ? "IN_PROGRESS_ALL" : "DUE_SOON")
          }
          className={`rounded-xl p-3.5 text-left border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 ${
            kpiFilter === "DUE_SOON"
              ? "bg-amber-500 text-white border-amber-500 shadow-xs"
              : "bg-white hover:bg-amber-50/40 text-slate-900 border-slate-200/90"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-xs font-bold ${
                kpiFilter === "DUE_SOON" ? "text-white" : "text-amber-800"
              }`}
            >
              Cần xử lý sớm
            </span>
            <AlertTriangle
              className={`w-4 h-4 shrink-0 ${
                kpiFilter === "DUE_SOON" ? "text-white" : "text-amber-500"
              }`}
            />
          </div>
          <div
            className={`text-2xl font-black mt-1 ${
              kpiFilter === "DUE_SOON" ? "text-white" : "text-amber-700"
            }`}
          >
            {kpiStats.dueSoonOrPriority}
          </div>
          <p
            className={`text-xs mt-0.5 ${
              kpiFilter === "DUE_SOON" ? "text-amber-50" : "text-slate-500"
            }`}
          >
            Gần đến hạn hoặc cần ưu tiên
          </p>
        </button>

        {/* KPI 3: Quá hạn */}
        <button
          type="button"
          onClick={() =>
            setKpiFilter(kpiFilter === "OVERDUE" ? "IN_PROGRESS_ALL" : "OVERDUE")
          }
          className={`rounded-xl p-3.5 text-left border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500 ${
            kpiFilter === "OVERDUE"
              ? "bg-rose-600 text-white border-rose-600 shadow-xs"
              : "bg-white hover:bg-rose-50/40 text-slate-900 border-slate-200/90"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-xs font-bold ${
                kpiFilter === "OVERDUE" ? "text-white" : "text-rose-700"
              }`}
            >
              Quá hạn
            </span>
            <AlertCircle
              className={`w-4 h-4 shrink-0 ${
                kpiFilter === "OVERDUE" ? "text-white" : "text-rose-600"
              }`}
            />
          </div>
          <div
            className={`text-2xl font-black mt-1 ${
              kpiFilter === "OVERDUE" ? "text-white" : "text-rose-600"
            }`}
          >
            {kpiStats.overdue}
          </div>
          <p
            className={`text-xs mt-0.5 ${
              kpiFilter === "OVERDUE" ? "text-rose-100" : "text-slate-500"
            }`}
          >
            Đã quá hạn & chưa hoàn thành
          </p>
        </button>

        {/* KPI 4: Chờ phê duyệt */}
        <button
          type="button"
          onClick={() =>
            setKpiFilter(kpiFilter === "WAITING" ? "IN_PROGRESS_ALL" : "WAITING")
          }
          className={`rounded-xl p-3.5 text-left border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00A19A] ${
            kpiFilter === "WAITING"
              ? "bg-[#00A19A] text-white border-[#00A19A] shadow-xs"
              : "bg-white hover:bg-teal-50/40 text-slate-900 border-slate-200/90"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-xs font-bold ${
                kpiFilter === "WAITING" ? "text-white" : "text-[#00736E]"
              }`}
            >
              Chờ phê duyệt
            </span>
            <Hourglass
              className={`w-4 h-4 shrink-0 ${
                kpiFilter === "WAITING" ? "text-white" : "text-[#00A19A]"
              }`}
            />
          </div>
          <div
            className={`text-2xl font-black mt-1 ${
              kpiFilter === "WAITING" ? "text-white" : "text-[#00736E]"
            }`}
          >
            {kpiStats.waiting}
          </div>
          <p
            className={`text-xs mt-0.5 ${
              kpiFilter === "WAITING" ? "text-teal-50" : "text-slate-500"
            }`}
          >
            Chờ cấp có thẩm quyền xử lý
          </p>
        </button>

        {/* KPI 5: Đã hoàn thành */}
        <button
          type="button"
          onClick={() =>
            setKpiFilter(kpiFilter === "COMPLETED" ? "IN_PROGRESS_ALL" : "COMPLETED")
          }
          className={`rounded-xl p-3.5 text-left border transition-colors cursor-pointer col-span-2 sm:col-span-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
            kpiFilter === "COMPLETED"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
              : "bg-white hover:bg-emerald-50/40 text-slate-900 border-slate-200/90"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-xs font-bold ${
                kpiFilter === "COMPLETED" ? "text-white" : "text-emerald-700"
              }`}
            >
              Đã hoàn thành
            </span>
            <CheckCircle2
              className={`w-4 h-4 shrink-0 ${
                kpiFilter === "COMPLETED" ? "text-white" : "text-emerald-600"
              }`}
            />
          </div>
          <div
            className={`text-2xl font-black mt-1 ${
              kpiFilter === "COMPLETED" ? "text-white" : "text-emerald-700"
            }`}
          >
            {kpiStats.completed}
          </div>
          <p
            className={`text-xs mt-0.5 ${
              kpiFilter === "COMPLETED" ? "text-emerald-100" : "text-slate-500"
            }`}
          >
            Hoàn thành hợp lệ trong kỳ
          </p>
        </button>
      </div>

      {/* ==========================================================================
          LAYOUT CHÍNH 2 CỘT TRÊN DESKTOP:
          - CỘT TRÁI (Main Content): Smart Filter + 8 Nhóm Nghiệp Vụ + Danh sách / Kanban / Lịch
          - CỘT PHẢI (Right Panel ~310px): Lịch Công Việc Tháng + Trợ Lý Công Việc
         ========================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* CỘT TRÁI (9/12 trên màn hình lớn) */}
        <div className="xl:col-span-9 space-y-4 min-w-0">
          {/* 3.C & 3.D. SMART FILTER & THANH NHÓM NHIỆM VỤ CHUẨN HÓA */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
            {/* Hàng 1: Bộ lọc trên Desktop + Chuyển đổi 3 chế độ hiển thị (Danh sách | Kanban | Lịch) */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Nút mở Drawer lọc trên Mobile */}
              <button
                type="button"
                onClick={() => setShowMobileFilterDrawer(true)}
                className="md:hidden px-3 py-2 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#5B3E96]" />
                <span>Bộ lọc & Sắp xếp</span>
              </button>

              {/* Bộ lọc Desktop */}
              <div className="hidden md:flex items-center gap-2 flex-wrap flex-1">
                {/* Cơ sở */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 h-9">
                  <School className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={campusId}
                    onChange={(e) => setCampusId(e.target.value)}
                    aria-label="Lọc theo cơ sở"
                    className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="ALL">Cơ sở ({filterOptions.campuses.length})</option>
                    {filterOptions.campuses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.campusName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lớp phụ trách */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 h-9">
                  <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    aria-label="Lọc theo lớp phụ trách"
                    className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none max-w-[160px]"
                  >
                    <option value="ALL">Lớp phụ trách ({filterOptions.classes.length})</option>
                    {filterOptions.classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Môn học */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 h-9">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    aria-label="Lọc theo môn học"
                    className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none max-w-[160px]"
                  >
                    <option value="ALL">Môn học ({filterOptions.subjects.length})</option>
                    {filterOptions.subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Trạng thái nghiệp vụ */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 h-9">
                  <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={bizStatusFilter}
                    onChange={(e) => setBizStatusFilter(e.target.value as any)}
                    aria-label="Lọc theo trạng thái nghiệp vụ"
                    className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="ALL">Mọi trạng thái</option>
                    <option value="NOT_STARTED">Chưa thực hiện</option>
                    <option value="IN_PROGRESS">Đang thực hiện</option>
                    <option value="WAITING_APPROVAL">Chờ phê duyệt</option>
                    <option value="COMPLETED">Hoàn thành</option>
                  </select>
                </div>

                {/* Thời gian */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 h-9">
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={timeRange}
                    onChange={(e) => {
                      setSelectedDateKey(null)
                      setTimeRange(e.target.value as any)
                    }}
                    aria-label="Lọc theo mốc thời gian"
                    className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="ALL">Mọi thời gian</option>
                    <option value="TODAY">Hôm nay</option>
                    <option value="THIS_WEEK">Tuần này</option>
                    <option value="THIS_MONTH">Tháng này</option>
                  </select>
                </div>

                {/* Sắp xếp */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 h-9">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    aria-label="Sắp xếp nhiệm vụ"
                    className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="PRIORITY_DESC">Sắp xếp: Mức ưu tiên</option>
                    <option value="DEADLINE_ASC">Sắp xếp: Hạn gần nhất</option>
                    <option value="UPDATED_DESC">Sắp xếp: Mới cập nhật</option>
                  </select>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="h-9 px-2.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>

              {/* Bộ chuyển đổi 3 Chế độ hiển thị (Mục 3.F: Danh sách | Kanban | Lịch công việc) */}
              <div
                className="bg-slate-100 p-1 rounded-lg flex items-center gap-1 border border-slate-200/80 shrink-0"
                role="tablist"
                aria-label="Chế độ hiển thị nhiệm vụ"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "LIST"}
                  onClick={() => setViewMode("LIST")}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    viewMode === "LIST"
                      ? "bg-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  style={viewMode === "LIST" ? { color: campusTheme.primaryColor } : undefined}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Danh sách</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "KANBAN"}
                  onClick={() => setViewMode("KANBAN")}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    viewMode === "KANBAN"
                      ? "bg-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  style={viewMode === "KANBAN" ? { color: campusTheme.primaryColor } : undefined}
                >
                  <Columns3 className="w-3.5 h-3.5" />
                  <span>Kanban</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "CALENDAR"}
                  onClick={() => setViewMode("CALENDAR")}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    viewMode === "CALENDAR"
                      ? "bg-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  style={viewMode === "CALENDAR" ? { color: campusTheme.primaryColor } : undefined}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Lịch công việc</span>
                </button>
              </div>
            </div>

            {/* Tag hiển thị khi đang lọc theo ngày trên Lịch */}
            {selectedDateKey && (
              <div
                className="flex items-center justify-between border rounded-lg px-3 py-1.5 text-xs"
                style={{
                  backgroundColor: campusTheme.lightAccentBg,
                  borderColor: campusTheme.borderSubtle,
                  color: campusTheme.primaryColor,
                }}
              >
                <span>
                  Đang lọc nhiệm vụ có hạn ngày:{" "}
                  <strong>{selectedDateKey.split("-").reverse().join("/")}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDateKey(null)}
                  className="font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Bỏ lọc ngày</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Hàng 2: 8 Nhóm nhiệm vụ chuẩn hóa Sky-Line (Mục 3.D) */}
            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100">
              {visibleCategories.nonEmpty.map((cat) => {
                const isActive = categoryFilter === cat.code
                const count = categoryCounts[cat.code] || 0
                const CatIcon = cat.icon

                return (
                  <button
                    key={cat.code}
                    type="button"
                    onClick={() => setCategoryFilter(cat.code)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border ${
                      isActive
                        ? "text-white shadow-2xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/90"
                    }`}
                    style={
                      isActive
                        ? {
                            backgroundColor: campusTheme.primaryColor,
                            borderColor: campusTheme.primaryColor,
                          }
                        : undefined
                    }
                  >
                    <CatIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{cat.label}</span>
                    <span
                      className={`text-[11px] px-1.5 py-0.2 rounded-full font-extrabold tabular-nums ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-white text-slate-700 border border-slate-200"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}

              {visibleCategories.empty.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowEmptyCategories((prev) => !prev)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-dashed border-slate-200 cursor-pointer"
                >
                  {showEmptyCategories
                    ? "Thu gọn nhóm trống"
                    : `+${visibleCategories.empty.length} nhóm khác (0)`}
                </button>
              )}

              {showEmptyCategories &&
                visibleCategories.empty.map((cat) => {
                  const CatIcon = cat.icon
                  return (
                    <button
                      key={cat.code}
                      type="button"
                      onClick={() => setCategoryFilter(cat.code)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50/60 hover:bg-slate-100 text-slate-400 border border-slate-200/60 flex items-center gap-1.5 cursor-pointer"
                    >
                      <CatIcon className="w-3 h-3 shrink-0" />
                      <span>{cat.shortLabel}</span>
                      <span className="text-[10px] px-1.5 rounded-full bg-slate-100 text-slate-400">
                        0
                      </span>
                    </button>
                  )
                })}
            </div>
          </div>

          {/* Thông báo hướng dẫn khi kéo thả trên Kanban */}
          {kanbanToast && (
            <div
              className="border px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2"
              style={{
                backgroundColor: campusTheme.lightAccentBg,
                borderColor: campusTheme.borderSubtle,
                color: campusTheme.primaryColor,
              }}
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>{kanbanToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setKanbanToast(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ========================================================================
              3.E & 3.F. HIỂN THỊ DANH SÁCH NHIỆM VỤ / KANBAN / LỊCH CÔNG VIỆC
             ======================================================================== */}
          {loading && !refreshing ? (
            /* Skeleton Loading (Mục 8) */
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-xl p-4 border border-slate-200/80 animate-pulse flex items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-48 bg-slate-200 rounded" />
                    <div className="h-4 w-3/4 bg-slate-200 rounded" />
                    <div className="h-3 w-1/2 bg-slate-100 rounded" />
                  </div>
                  <div className="h-9 w-32 bg-slate-200 rounded-lg shrink-0" />
                </div>
              ))}
            </div>
          ) : errorMsg ? (
            /* Error State có nút Thử lại (Mục 8) */
            <div className="bg-white rounded-xl p-8 border border-rose-200 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">
                Không thể tải danh sách nhiệm vụ
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">{errorMsg}</p>
              <button
                type="button"
                onClick={() => fetchWorkspaceData(true)}
                className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${campusTheme.btnPrimaryStyle}`}
              >
                Thử lại ngay
              </button>
            </div>
          ) : viewMode === "LIST" ? (
            /* CHẾ ĐỘ 1: DANH SÁCH (MẶC ĐỊNH - MỤC 3.E & 3.F.1) */
            filteredAndSortedTasks.length === 0 ? (
              <div className="bg-white rounded-xl p-10 border border-slate-200/90 text-center space-y-2">
                <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Không có nhiệm vụ nào trong mục đang chọn
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Thầy/Cô đã hoàn thành các đầu việc thuộc bộ lọc này hoặc có thể xóa bộ lọc để xem toàn bộ nhiệm vụ.
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="mt-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1 text-xs text-slate-500">
                  <span>
                    Hiển thị{" "}
                    <strong className="text-slate-800">
                      {Math.min(visibleCount, filteredAndSortedTasks.length)}
                    </strong>{" "}
                    / <strong className="text-slate-800">{filteredAndSortedTasks.length}</strong>{" "}
                    nhiệm vụ
                  </span>
                  <span>Nhấp vào dòng nhiệm vụ để xem chi tiết điều kiện hoàn thành</span>
                </div>

                {filteredAndSortedTasks.slice(0, visibleCount).map(renderTaskRow)}

                {filteredAndSortedTasks.length > visibleCount && (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + 20)}
                      className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      Xem thêm ({filteredAndSortedTasks.length - visibleCount} nhiệm vụ)
                    </button>
                  </div>
                )}
              </div>
            )
          ) : viewMode === "KANBAN" ? (
            /* CHẾ ĐỘ 2: KANBAN 4 CỘT (MỤC 3.F.2) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {(
                [
                  {
                    col: "NOT_STARTED" as BusinessStatusType,
                    title: "Cần thực hiện",
                    headerClass: "border-t-4 border-t-slate-400",
                    badgeBg: "bg-slate-100 text-slate-700",
                  },
                  {
                    col: "IN_PROGRESS" as BusinessStatusType,
                    title: "Đang thực hiện",
                    headerClass: "border-t-4",
                    badgeBg: "bg-teal-50 text-[#00736E]",
                  },
                  {
                    col: "WAITING_APPROVAL" as BusinessStatusType,
                    title: "Chờ phê duyệt",
                    headerClass: "border-t-4 border-t-sky-500",
                    badgeBg: "bg-sky-50 text-sky-700",
                  },
                  {
                    col: "COMPLETED" as BusinessStatusType,
                    title: "Hoàn thành",
                    headerClass: "border-t-4 border-t-emerald-500",
                    badgeBg: "bg-emerald-50 text-emerald-700",
                  },
                ] as const
              ).map((column) => {
                const colTasks = filteredAndSortedTasks.filter(
                  (t) => getBusinessStatusInfo(t).code === column.col
                )

                return (
                  <div
                    key={column.col}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleKanbanDrop(column.col)}
                    className={`bg-slate-50/90 rounded-xl border border-slate-200/80 ${column.headerClass} p-3 space-y-2.5 min-h-[380px] flex flex-col`}
                    style={
                      column.col === "IN_PROGRESS"
                        ? { borderTopColor: campusTheme.primaryColor }
                        : undefined
                    }
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                      <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                        {column.title}
                      </h3>
                      <span
                        className={`text-xs font-extrabold px-2 py-0.5 rounded-full tabular-nums ${column.badgeBg}`}
                      >
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="space-y-2.5 flex-1">
                      {colTasks.length === 0 ? (
                        <div className="h-32 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
                          Trống
                        </div>
                      ) : (
                        colTasks.map((t) => {
                          const cat = mapModuleToCategory(t.sourceModule)
                          const dl = getDeadlineStatusInfo(t)
                          const canDragDirectly = t.sourceModule === "CONG_TAC"

                          return (
                            <div
                              key={t.taskId}
                              draggable
                              onDragStart={() => setDraggedTaskId(t.taskId)}
                              onClick={() => setSelectedTask(t)}
                              className="bg-white rounded-lg p-3 border border-slate-200/90 shadow-2xs space-y-2 cursor-pointer"
                            >
                              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                <span
                                  className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border ${cat.badgeClass}`}
                                >
                                  {cat.shortLabel}
                                </span>
                                <span
                                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${dl.badgeClass}`}
                                >
                                  {dl.label}
                                </span>
                              </div>

                              <h4 className="text-xs font-bold text-slate-900 leading-snug">
                                {t.title}
                              </h4>

                              {typeof t.metadata?.progressTotal === "number" &&
                                t.metadata.progressTotal > 0 && (
                                  <div className="text-[11px] text-slate-600 flex items-center justify-between tabular-nums">
                                    <span>Tiến độ:</span>
                                    <strong style={{ color: campusTheme.primaryColor }}>
                                      {t.metadata.progressCurrent}/{t.metadata.progressTotal}
                                    </strong>
                                  </div>
                                )}

                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                <span className="text-[11px] text-slate-500 truncate">
                                  {t.metadata?.className
                                    ? `Lớp ${t.metadata.className}`
                                    : t.deadline}
                                </span>
                                <Link
                                  href={t.deepLink}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[11px] font-bold hover:underline flex items-center gap-0.5 shrink-0"
                                  style={{ color: campusTheme.primaryColor }}
                                >
                                  <span>{getTaskPrimaryActionLabel(t)}</span>
                                  <ArrowUpRight className="w-3 h-3" />
                                </Link>
                              </div>

                              {canDragDirectly && (
                                <p className="text-[10px] text-slate-400 italic">
                                  Kéo sang cột Hoàn thành để đóng việc
                                </p>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* CHẾ ĐỘ 3: LỊCH CÔNG VIỆC THEO NGÀY / TUẦN / THÁNG + NHÓM KHÔNG CÓ HẠN CỐ ĐỊNH (MỤC 3.F.3) */
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 space-y-4">
                {/* Thanh điều khiển Lịch */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarCursor(
                          new Date(
                            calendarCursor.getFullYear(),
                            calendarCursor.getMonth() - 1,
                            1
                          )
                        )
                      }
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                      aria-label="Tháng trước"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <h3 className="text-sm font-extrabold text-slate-900 min-w-[120px] text-center">
                      {calendarMonthData.monthLabel}
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarCursor(
                          new Date(
                            calendarCursor.getFullYear(),
                            calendarCursor.getMonth() + 1,
                            1
                          )
                        )
                      }
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                      aria-label="Tháng sau"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCalendarCursor(new Date())
                        setSelectedDateKey(null)
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      Hôm nay
                    </button>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    {(
                      [
                        { id: "MONTH", label: "Tháng" },
                        { id: "WEEK", label: "Tuần này" },
                        { id: "DAY", label: "Hôm nay" },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setCalendarSubView(m.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer ${
                          calendarSubView === m.id
                            ? "bg-white shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                        style={
                          calendarSubView === m.id
                            ? { color: campusTheme.primaryColor }
                            : undefined
                        }
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {calendarSubView === "MONTH" ? (
                  /* Lưới Lịch Tháng lớn */
                  <div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500 pb-2">
                      <div>T2</div>
                      <div>T3</div>
                      <div>T4</div>
                      <div>T5</div>
                      <div>T6</div>
                      <div>T7</div>
                      <div>CN</div>
                    </div>
                    <div className="grid grid-cols-7 gap-1.5">
                      {calendarMonthData.cells.map((cell, idx) => {
                        if (!cell.day || !cell.dateKey) {
                          return (
                            <div
                              key={`empty-${idx}`}
                              className="h-24 rounded-lg bg-slate-50/50 border border-slate-100"
                            />
                          )
                        }
                        const isSelectedDate = selectedDateKey === cell.dateKey
                        return (
                          <div
                            key={cell.dateKey}
                            onClick={() =>
                              setSelectedDateKey(
                                isSelectedDate ? null : cell.dateKey
                              )
                            }
                            className={`h-24 rounded-lg p-2 border text-left flex flex-col justify-between transition-colors cursor-pointer overflow-hidden ${
                              isSelectedDate
                                ? "ring-1"
                                : cell.isToday
                                ? "border-[#00A19A] bg-teal-50/20"
                                : "border-slate-200/80 hover:border-slate-300 bg-white"
                            }`}
                            style={
                              isSelectedDate
                                ? {
                                    borderColor: campusTheme.primaryColor,
                                    backgroundColor: campusTheme.lightAccentBg,
                                  }
                                : undefined
                            }
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-xs font-bold ${
                                  cell.isToday
                                    ? "text-[#00736E] underline"
                                    : "text-slate-700"
                                }`}
                              >
                                {cell.day}
                              </span>
                              {cell.total > 0 && (
                                <span
                                  className={`text-[10px] font-extrabold px-1.5 rounded-full ${
                                    cell.overdue > 0
                                      ? "bg-rose-100 text-rose-700"
                                      : ""
                                  }`}
                                  style={
                                    cell.overdue === 0
                                      ? {
                                          backgroundColor: campusTheme.lightAccentBg,
                                          color: campusTheme.primaryColor,
                                        }
                                      : undefined
                                  }
                                >
                                  {cell.total} việc
                                </span>
                              )}
                            </div>

                            <div className="space-y-1 overflow-hidden">
                              {cell.tasks.slice(0, 2).map((t) => (
                                <div
                                  key={t.taskId}
                                  className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium ${
                                    t.status === "OVERDUE"
                                      ? "bg-rose-50 text-rose-700"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {t.title}
                                </div>
                              ))}
                              {cell.tasks.length > 2 && (
                                <div className="text-[10px] text-slate-400 font-semibold pl-1">
                                  +{cell.tasks.length - 2} việc khác
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  /* Danh sách nhiệm vụ có ngày hạn cố định trong Tuần / Ngày */
                  <div className="space-y-2.5">
                    {filteredAndSortedTasks
                      .filter((t) => hasConcreteDeadlineDate(t))
                      .map(renderTaskRow)}
                  </div>
                )}
              </div>

              {/* Nhóm riêng cho các nhiệm vụ không có ngày hạn xác định (Mục 3.F.3: Không tự tạo hạn giả!) */}
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Nhiệm vụ thực hiện theo đợt / học kỳ (Không có ngày hạn cố định)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Các công việc tính theo đợt đánh giá hoặc toàn học kỳ, được tách riêng để không tạo ngày hạn giả trên lịch.
                    </p>
                  </div>
                  <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    {calendarMonthData.unscheduledTasks.length} nhiệm vụ
                  </span>
                </div>

                <div className="space-y-2.5">
                  {calendarMonthData.unscheduledTasks.map(renderTaskRow)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================
            4. KHU VỰC NHẮC VIỆC THÔNG MINH (RIGHT PANEL DESKTOP ~310px)
            - 4.A. Lịch công việc tháng
            - 4.B. Trợ lý Công việc (Rule Engine trên dữ liệu thực SSM)
           ======================================================================== */}
        <aside className="xl:col-span-3 space-y-4 w-full">
          {/* 4.A. LỊCH CÔNG VIỆC THÁNG HIỆN TẠI */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon
                  className="w-4 h-4"
                  style={{ color: campusTheme.primaryColor }}
                />
                <h2 className="text-sm font-bold text-slate-900">
                  Lịch công việc ({calendarMonthData.monthLabel})
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setCalendarCursor(
                      new Date(
                        calendarCursor.getFullYear(),
                        calendarCursor.getMonth() - 1,
                        1
                      )
                    )
                  }
                  className="p-1 rounded hover:bg-slate-100 text-slate-600 cursor-pointer"
                  aria-label="Tháng trước"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCalendarCursor(
                      new Date(
                        calendarCursor.getFullYear(),
                        calendarCursor.getMonth() + 1,
                        1
                      )
                    )
                  }
                  className="p-1 rounded hover:bg-slate-100 text-slate-600 cursor-pointer"
                  aria-label="Tháng sau"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Lưới Mini Calendar */}
            <div>
              <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-slate-400 pb-1.5">
                <div>T2</div>
                <div>T3</div>
                <div>T4</div>
                <div>T5</div>
                <div>T6</div>
                <div>T7</div>
                <div>CN</div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {calendarMonthData.cells.map((cell, idx) => {
                  if (!cell.day || !cell.dateKey) {
                    return <div key={`mini-empty-${idx}`} className="h-8" />
                  }
                  const isSelected = selectedDateKey === cell.dateKey
                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      onClick={() =>
                        setSelectedDateKey(isSelected ? null : cell.dateKey)
                      }
                      title={
                        cell.total > 0
                          ? `Ngày ${cell.day}: ${cell.total} nhiệm vụ (${cell.overdue} quá hạn)`
                          : `Ngày ${cell.day}`
                      }
                      className={`h-8 rounded-lg text-xs font-semibold flex flex-col items-center justify-center relative transition-colors cursor-pointer ${
                        isSelected
                          ? "text-white font-bold"
                          : cell.isToday
                          ? "bg-teal-50 text-[#00736E] border border-teal-300 font-bold"
                          : cell.total > 0
                          ? "bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                      style={
                        isSelected
                          ? { backgroundColor: campusTheme.primaryColor }
                          : undefined
                      }
                    >
                      <span>{cell.day}</span>
                      {cell.total > 0 && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                            isSelected
                              ? "bg-white"
                              : cell.overdue > 0
                              ? "bg-rose-500"
                              : ""
                          }`}
                          style={
                            !isSelected && cell.overdue === 0
                              ? { backgroundColor: campusTheme.primaryColor }
                              : undefined
                          }
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Chú thích Lịch */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: campusTheme.primaryColor }}
                  />
                  <span>Có việc</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Quá hạn</span>
                </span>
              </div>
              <span>Nhấn ngày để lọc</span>
            </div>
          </div>

          {/* 4.B. TRỢ LÝ CÔNG VIỆC (RULE ENGINE DỰA TRÊN DỮ LIỆU THỰC SSM) */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs space-y-3.5">
            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: campusTheme.lightAccentBg,
                    color: campusTheme.primaryColor,
                    borderColor: campusTheme.borderSubtle,
                  }}
                >
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Trợ lý Công việc
                  </h2>
                  <p className="text-xs text-slate-500">
                    Bám sát phân quyền & gán SSM
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {progressAndKPI && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-md border"
                    style={{
                      backgroundColor: campusTheme.lightAccentBg,
                      color: campusTheme.primaryColor,
                      borderColor: campusTheme.borderSubtle,
                    }}
                  >
                    KPI: {progressAndKPI.kpiAttainment.metCriteriaCount}/
                    {progressAndKPI.kpiAttainment.totalCriteriaCount}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowAssistantModal(true)
                    if (!assistantAnswer) {
                      handleAskAssistant("Hôm nay tôi cần làm gì?", false)
                    }
                  }}
                  className="text-xs font-bold px-2 py-0.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
                  title="Mở cửa sổ Trợ lý Công việc"
                >
                  Mở rộng
                </button>
              </div>
            </div>

            {/* Hỏi nhanh Trợ lý theo Phân quyền & Gán của Giáo viên */}
            <div className="space-y-2 pt-0.5">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleAskAssistant()
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="text"
                  value={assistantQuery}
                  onChange={(e) => setAssistantQuery(e.target.value)}
                  placeholder="Hỏi Trợ lý về việc, KPI, lớp gán..."
                  aria-label="Hỏi trực tiếp Trợ lý Công việc"
                  className="flex-1 h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50/80 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={assistantLoading}
                  className={`h-8 px-2.5 rounded-lg text-xs font-bold shrink-0 cursor-pointer ${campusTheme.btnPrimaryStyle}`}
                >
                  {assistantLoading ? "..." : "Tra cứu"}
                </button>
              </form>

              <div className="flex flex-wrap gap-1">
                {assistantQuickPrompts.slice(0, 6).map((item) => (
                  <button
                    key={item.query}
                    type="button"
                    onClick={() => {
                      setAssistantQuery(item.query)
                      handleAskAssistant(item.query, false)
                    }}
                    className="text-[11px] font-semibold px-2 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-left transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {assistantAnswer && (
                <div
                  className="p-2.5 rounded-xl border text-xs space-y-2"
                  style={{
                    backgroundColor: campusTheme.lightAccentBg,
                    borderColor: campusTheme.borderSubtle,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="font-bold truncate"
                      style={{ color: campusTheme.primaryColor }}
                    >
                      {assistantAnswer.query}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAssistantModal(true)}
                      className="text-[11px] font-bold underline shrink-0 cursor-pointer"
                      style={{ color: campusTheme.primaryColor }}
                    >
                      Chi tiết
                    </button>
                  </div>
                  <div className="text-xs text-slate-700 whitespace-pre-line line-clamp-5 leading-relaxed bg-white/90 p-2 rounded-lg border border-slate-200/70">
                    {assistantAnswer.markdown
                      .replace(/###\s+/g, "")
                      .replace(/####\s+/g, "")
                      .replace(/\*\*/g, "")}
                  </div>
                  {assistantAnswer.deepLinks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {assistantAnswer.deepLinks.slice(0, 2).map((dl) => (
                        <Link
                          key={dl.href + dl.label}
                          href={dl.href}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-bold hover:bg-slate-50"
                          style={{ color: campusTheme.primaryColor }}
                        >
                          <span className="truncate max-w-[160px]">{dl.label}</span>
                          <ArrowUpRight className="w-3 h-3 shrink-0" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Các phát hiện & nhắc việc dựa trên quy tắc nghiệp vụ */}
            <div className="space-y-2 text-xs">
              {advisorInsights.overdueList.length > 0 && (
                <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200 text-rose-900 space-y-1">
                  <div className="font-bold flex items-center justify-between">
                    <span>• {advisorInsights.overdueList.length} nhiệm vụ quá hạn</span>
                    <button
                      type="button"
                      onClick={() => setKpiFilter("OVERDUE")}
                      className="text-rose-700 underline font-semibold cursor-pointer"
                    >
                      Lọc xem
                    </button>
                  </div>
                  <p className="text-rose-700 leading-relaxed">
                    Cần ưu tiên hoàn thiện phiếu dự giờ hoặc công việc đã qua mốc thời gian quy định.
                  </p>
                </div>
              )}

              {advisorInsights.obsTasks.length > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>• Dự giờ & KPI chuyên môn</span>
                    <button
                      type="button"
                      onClick={() => setCategoryFilter("DU_GIO_PTCM")}
                      className="hover:underline font-semibold cursor-pointer"
                      style={{ color: campusTheme.primaryColor }}
                    >
                      {advisorInsights.obsTasks.length} việc
                    </button>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Định mức tháng:{" "}
                    <strong>
                      {progressAndKPI?.kpiAttainment.observationQuota.observedValidCount ?? 0}/
                      {progressAndKPI?.kpiAttainment.observationQuota.requiredObservedQuota ?? 2} tiết
                    </strong>{" "}
                    hợp lệ.
                  </p>
                </div>
              )}

              {advisorInsights.gradeTasks.length > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>• Tiến độ đánh giá học sinh</span>
                    <span
                      className="font-bold"
                      style={{ color: campusTheme.primaryColor }}
                    >
                      {advisorInsights.gradeTasks.length} hạng mục
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Sổ điểm:{" "}
                    <strong>
                      {progressAndKPI?.volumeProgress.gradebookEnteredCount ?? 0}/
                      {progressAndKPI?.volumeProgress.gradebookTotalExpected ?? 0} HS
                    </strong>{" "}
                    • ĐGNL:{" "}
                    <strong>
                      {progressAndKPI?.volumeProgress.competencyEvaluatedCount ?? 0}/
                      {progressAndKPI?.volumeProgress.competencyTotalExpected ?? 0} HS
                    </strong>
                    .
                  </p>
                </div>
              )}

              {(advisorInsights.expTasks.length > 0 ||
                advisorInsights.covanTasks.length > 0) && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="font-bold text-slate-800">
                    • Trải nghiệm & Cố vấn học tập
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {advisorInsights.expTasks.length} hoạt động trải nghiệm cần đánh giá •{" "}
                    {advisorInsights.covanTasks.length} đầu việc cố vấn học tập.
                  </p>
                </div>
              )}
            </div>

            {/* Gợi ý thứ tự ưu tiên thực hiện */}
            {advisorInsights.recommendedOrder.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Gợi ý thứ tự thực hiện ưu tiên
                </h3>
                <div className="space-y-2">
                  {advisorInsights.recommendedOrder.map((item, index) => (
                    <div
                      key={item.taskId}
                      className="p-2.5 rounded-lg border border-slate-200/90 bg-white space-y-1.5"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="w-5 h-5 rounded-full text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            backgroundColor: campusTheme.lightAccentBg,
                            color: campusTheme.primaryColor,
                          }}
                        >
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                            {item.title}
                          </p>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            Hạn: {item.deadline}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Link
                          href={item.deepLink}
                          className="inline-flex items-center gap-1 text-xs font-bold hover:underline"
                          style={{ color: campusTheme.primaryColor }}
                        >
                          <span>{getTaskPrimaryActionLabel(item)}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ==========================================================================
          MODAL CHI TIẾT NHIỆM VỤ & ĐIỀU KIỆN HOÀN THÀNH (KHI NHẤP VÀO DÒNG NHIỆM VỤ)
         ========================================================================== */}
      {selectedTask && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="space-y-1">
                <span
                  className="text-xs font-bold px-2.5 py-0.5 rounded-md border"
                  style={{
                    backgroundColor: campusTheme.lightAccentBg,
                    color: campusTheme.primaryColor,
                    borderColor: campusTheme.borderSubtle,
                  }}
                >
                  {mapModuleToCategory(selectedTask.sourceModule).label}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 pt-1">
                  {selectedTask.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Đóng chi tiết nhiệm vụ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedTask.description && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 leading-relaxed">
                {selectedTask.description}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block">Trạng thái nghiệp vụ</span>
                <span className="font-bold text-slate-900">
                  {getBusinessStatusInfo(selectedTask).label}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block">Trạng thái thời hạn</span>
                <span className="font-bold text-slate-900">
                  {getDeadlineStatusInfo(selectedTask).label} ({selectedTask.deadline})
                </span>
              </div>
              {selectedTask.metadata?.className && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block">Lớp / Khối liên quan</span>
                  <span className="font-bold text-slate-900">
                    {selectedTask.metadata.className}
                  </span>
                </div>
              )}
              {selectedTask.metadata?.approverRole && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block">Cấp phê duyệt / Phối hợp</span>
                  <span className="font-bold text-slate-900">
                    {selectedTask.metadata.approverRole}
                  </span>
                </div>
              )}
            </div>

            {/* Điều kiện hoàn thành */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ShieldCheck
                  className="w-4 h-4"
                  style={{ color: campusTheme.primaryColor }}
                />
                <span>Điều kiện công nhận hoàn thành</span>
              </h4>
              {selectedTask.metadata?.completionConditions &&
              selectedTask.metadata.completionConditions.length > 0 ? (
                <div className="space-y-2">
                  {selectedTask.metadata.completionConditions.map((cond) => (
                    <div
                      key={cond.code}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 ${
                            cond.isMet ? "text-emerald-600" : "text-slate-300"
                          }`}
                        />
                        <span className="font-medium text-slate-800">{cond.label}</span>
                      </div>
                      <span className="font-bold text-slate-900 tabular-nums shrink-0">
                        {cond.currentValue} / {cond.targetValue}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 text-xs text-slate-600">
                  Hoàn thành thao tác tại màn hình nghiệp vụ gốc và được hệ thống ghi nhận hợp lệ.
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>
              <Link
                href={selectedTask.deepLink}
                className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs ${campusTheme.btnPrimaryStyle}`}
              >
                <span>{getTaskPrimaryActionLabel(selectedTask)}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          DRAWER BỘ LỌC TRÊN MOBILE (< 768px - MỤC 6 RESPONSIVE)
         ========================================================================== */}
      {showMobileFilterDrawer && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-end justify-center md:hidden"
          onClick={() => setShowMobileFilterDrawer(false)}
        >
          <div
            className="bg-white rounded-t-2xl w-full p-5 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Bộ lọc & Sắp xếp</h3>
              <button
                type="button"
                onClick={() => setShowMobileFilterDrawer(false)}
                className="p-1 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Cơ sở</label>
                <select
                  value={campusId}
                  onChange={(e) => setCampusId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50"
                >
                  <option value="ALL">Tất cả Cơ sở</option>
                  {filterOptions.campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.campusName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Lớp phụ trách</label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50"
                >
                  <option value="ALL">Tất cả Lớp phụ trách</option>
                  {filterOptions.classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Môn học</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50"
                >
                  <option value="ALL">Tất cả Môn học</option>
                  {filterOptions.subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Trạng thái nghiệp vụ
                </label>
                <select
                  value={bizStatusFilter}
                  onChange={(e) => setBizStatusFilter(e.target.value as any)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50"
                >
                  <option value="ALL">Mọi trạng thái</option>
                  <option value="NOT_STARTED">Chưa thực hiện</option>
                  <option value="IN_PROGRESS">Đang thực hiện</option>
                  <option value="WAITING_APPROVAL">Chờ phê duyệt</option>
                  <option value="COMPLETED">Hoàn thành</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Sắp xếp theo</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50"
                >
                  <option value="PRIORITY_DESC">Mức ưu tiên</option>
                  <option value="DEADLINE_ASC">Hạn gần nhất</option>
                  <option value="UPDATED_DESC">Ngày cập nhật</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700"
              >
                Xóa bộ lọc
              </button>
              <button
                type="button"
                onClick={() => setShowMobileFilterDrawer(false)}
                className={`px-5 py-2 rounded-lg text-xs font-bold ${campusTheme.btnPrimaryStyle}`}
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          DRAWER LỊCH SỬ THÔNG BÁO CÔNG VIỆC
         ========================================================================== */}
      {showReminderDrawer && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowReminderDrawer(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-5 py-4 text-white flex items-center justify-between"
              style={{ background: campusTheme.headerGradient }}
            >
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-white/90" />
                <h3 className="text-sm font-extrabold">Thông báo công việc</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTriggerReminder}
                  disabled={runningReminder}
                  className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${runningReminder ? "animate-spin" : ""}`} />
                  <span>Kiểm tra hạn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowReminderDrawer(false)}
                  className="p-1 rounded-lg hover:bg-white/15 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              {reminderHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Chưa có thông báo nhắc việc nào được ghi nhận.
                </div>
              ) : (
                reminderHistory.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                      item.isRead
                        ? "bg-slate-50 border-slate-200 text-slate-600"
                        : "text-slate-800"
                    }`}
                    style={
                      !item.isRead
                        ? {
                            backgroundColor: campusTheme.lightAccentBg,
                            borderColor: campusTheme.borderSubtle,
                          }
                        : undefined
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">{item.title}</span>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {new Date(item.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    <p className="whitespace-pre-line text-xs leading-relaxed text-slate-600">
                      {item.message}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Tự động tạm ngừng nhắc các hồ sơ đang chờ phê duyệt</span>
              <button
                type="button"
                onClick={() => setShowReminderDrawer(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================================
          MODAL TRỢ LÝ CÔNG VIỆC & ĐỐI CHIẾU PHÂN QUYỀN / GÁN SSM
         ========================================================================== */}
      {showAssistantModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowAssistantModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-5 py-4 text-white flex items-center justify-between"
              style={{ background: campusTheme.headerGradient }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold">
                    Trợ lý Công việc — Đối chiếu Dữ liệu & Phân quyền SSM
                  </h3>
                  <p className="text-[11px] text-white/85">
                    Zero-PII • Cá nhân hóa theo đúng vai trò, lớp và môn học được gán của{" "}
                    {profile?.teacherName || "Giáo viên"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssistantModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/15 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 bg-slate-50/70 space-y-2.5">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleAskAssistant()
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={assistantQuery}
                  onChange={(e) => setAssistantQuery(e.target.value)}
                  placeholder="Nhập câu hỏi tra cứu dữ liệu SSM (VD: Phân công của tôi, thiếu bao nhiêu tiết dự giờ...)"
                  className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={assistantLoading}
                  className={`h-9 px-4 rounded-lg text-xs font-bold cursor-pointer ${campusTheme.btnPrimaryStyle}`}
                >
                  {assistantLoading ? "Đang phân tích..." : "Tra cứu ngay"}
                </button>
              </form>

              <div className="flex flex-wrap gap-1.5">
                {assistantQuickPrompts.map((item) => (
                  <button
                    key={item.query}
                    type="button"
                    onClick={() => {
                      setAssistantQuery(item.query)
                      handleAskAssistant(item.query, false)
                    }}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {assistantLoading ? (
                <div className="p-8 text-center text-slate-500 space-y-2">
                  <RefreshCw
                    className="w-6 h-6 animate-spin mx-auto"
                    style={{ color: campusTheme.primaryColor }}
                  />
                  <p>Đang đối chiếu dữ liệu thực tế từ các phân hệ SSM...</p>
                </div>
              ) : assistantAnswer ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 whitespace-pre-line text-slate-800 leading-relaxed font-medium">
                    {assistantAnswer.markdown}
                  </div>

                  {assistantAnswer.deepLinks.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block">
                        Điều hướng trực tiếp đến màn hình chức năng SSM:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {assistantAnswer.deepLinks.map((dl) => (
                          <Link
                            key={dl.href + dl.label}
                            href={dl.href}
                            onClick={() => setShowAssistantModal(false)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${campusTheme.btnPrimaryStyle}`}
                          >
                            <span>{dl.label}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500">
                  Chọn một câu hỏi gợi ý phía trên hoặc nhập nội dung để Trợ lý đối chiếu dữ liệu thực tế.
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Phân quyền hiện tại:{" "}
                <strong className="text-slate-700">
                  {profile?.systemRole || "TEACHER"} • {profile?.campusNames?.join(", ") || "Sky-Line"}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setShowAssistantModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
