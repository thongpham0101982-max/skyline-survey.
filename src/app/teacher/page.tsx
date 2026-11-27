"use client"

import { SSMTodayHome } from "@/components/pwa/SSMTodayHome"

import React, { useEffect, useState, useMemo, useCallback } from "react"
import { createPortal } from "react-dom"
import { useSession } from "next-auth/react"
import Link from "next/link"
import {
  Users,
  BookOpen,
  Eye,
  GraduationCap,
  Heart,
  FileText,
  ClipboardCheck,
  BookMarked,
  Target,
  Search,
  CalendarDays,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  CheckSquare,
  Hourglass,
  ArrowUpRight,
  School,
  Sparkles,
  Award,
  Layers,
  Compass,
  Briefcase,
  Globe,
  ShieldCheck
} from "lucide-react"
import { UserWelcomeCard } from "@/components/UserWelcomeCard"
import DeadlineCountdownBanner from "@/components/shared/DeadlineCountdownBanner"
import { TeacherClassKpiSpotlight } from "@/components/teacher/TeacherClassKpiSpotlight"
import AdvisorySmartRemindersPanel from "@/components/advisory/AdvisorySmartRemindersPanel"
import { useCampusTheme } from "@/hooks/useCampusTheme"
import type {
  SourceModule,
  UnifiedTeacherAssignmentProfile,
  SeparatedProgressAndKPI
} from "@/services/taskEngine/types"

interface WorkspaceHighlight {
  counts: {
    total: number
    overdue: number
    today: number
    thisWeek: number
    inProgress: number
    waitingApproval: number
    completed: number
    byModule?: Partial<Record<SourceModule, number>>
  }
  completionRate: number
  kpiAttainment?: SeparatedProgressAndKPI["kpiAttainment"] | null
  profile?: UnifiedTeacherAssignmentProfile | null
  priorityIssues: Array<{
    taskId: string
    title: string
    deadline: string
    status: string
    deepLink: string
    sourceModule: string
    metadata?: { moduleLabel?: string }
  }>
}

interface MetricData {
  totalClasses: number
  totalStudents: number
  totalAssignments: number
  scoredStudents: number
  academicYearName: string
  totalObservedLessons?: number
  remedialStudentsCount?: number
  isManagerRole?: boolean
  managedDepartmentName?: string | null
  managedDepartmentId?: string | null
  managedTeachersCount?: number
  managedDeptObservedCount?: number
  campus?: {
    id: string
    campusCode: string
    campusName: string
  } | null
  teacherInfo?: {
    id: string
    teacherCode: string
    teacherName: string
    homeroomClass: string | null
    position: string
    positions: string | null
    mainSubject: string | null
  } | null
  entranceAssignments?: {
    hasGeneral: boolean
    hasPreschool: boolean
    isPreschoolTeacher: boolean
    generalStudentCount: number
    preschoolStudentCount: number
    totalStudentCount: number
    batches: Array<{
      key: string
      periodId: string
      periodName: string
      batchId: string | null
      batchName: string
      isPreschool: boolean
      studentCount: number
      subjects: string[]
      grades: string[]
    }>
  }
}

type AccentTone = "pine" | "teal" | "emerald" | "amber" | "rose"

interface ActionCard {
  id: string
  groupId: "GVCN" | "GVBM" | "UTILITIES"
  groupName: string
  title: string
  desc: string
  href: string
  icon: React.ElementType
  badgeText: string
  badgeVariant?: "default" | "skyline" | "accent" | "success" | "secondary" | "destructive"
  metricValue?: number | string
  accent: AccentTone
  isAssigned?: boolean
  assignedLabel?: string
  pendingTasks?: number
  ctaLabel?: string
}

const ACCENT_STYLES: Record<
  AccentTone,
  {
    rail: string
    iconBg: string
    iconHover: string
    badge: string
    cardHover: string
    ctaText: string
    dot: string
    softBg: string
  }
> = {
  pine: {
    rail: "border-l-[#003B3A]",
    iconBg: "bg-[#003B3A] text-[#5EEAD4] shadow-xs",
    iconHover: "group-hover:bg-[#005854] group-hover:scale-105",
    badge: "bg-[#003B3A]/10 text-[#003B3A] border-[#003B3A]/20",
    cardHover: "hover:border-[#003B3A]/50 hover:shadow-md",
    ctaText: "text-[#003B3A] group-hover:text-[#00736E]",
    dot: "bg-[#003B3A]",
    softBg: "from-[#003B3A]/[0.04] via-white to-white"
  },
  teal: {
    rail: "border-l-[#00A19A]",
    iconBg: "bg-gradient-to-br from-[#00A19A] to-[#00736E] text-white shadow-xs",
    iconHover: "group-hover:from-[#008B85] group-hover:to-[#005854] group-hover:scale-105",
    badge: "bg-[#F0FDFA] text-[#00736E] border-[#99F6E4]",
    cardHover: "hover:border-[#00A19A]/60 hover:shadow-md",
    ctaText: "text-[#00736E] group-hover:text-[#003B3A]",
    dot: "bg-[#00A19A]",
    softBg: "from-[#F0FDFA] via-white to-white"
  },
  emerald: {
    rail: "border-l-[#059669]",
    iconBg: "bg-gradient-to-br from-[#059669] to-[#047857] text-white shadow-xs",
    iconHover: "group-hover:from-[#047857] group-hover:to-[#065F46] group-hover:scale-105",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    cardHover: "hover:border-emerald-400/70 hover:shadow-md",
    ctaText: "text-emerald-700 group-hover:text-emerald-900",
    dot: "bg-[#059669]",
    softBg: "from-emerald-50/60 via-white to-white"
  },
  amber: {
    rail: "border-l-[#D97706]",
    iconBg: "bg-gradient-to-br from-[#D97706] to-[#B45309] text-white shadow-xs",
    iconHover: "group-hover:from-[#B45309] group-hover:to-[#92400E] group-hover:scale-105",
    badge: "bg-amber-50 text-amber-900 border-amber-200",
    cardHover: "hover:border-amber-400/70 hover:shadow-md",
    ctaText: "text-amber-700 group-hover:text-amber-900",
    dot: "bg-[#D97706]",
    softBg: "from-amber-50/60 via-white to-white"
  },
  rose: {
    rail: "border-l-[#E11D48]",
    iconBg: "bg-gradient-to-br from-[#E11D48] to-[#BE123C] text-white shadow-xs",
    iconHover: "group-hover:from-[#BE123C] group-hover:to-[#9F1239] group-hover:scale-105",
    badge: "bg-rose-50 text-rose-800 border-rose-200",
    cardHover: "hover:border-rose-400/70 hover:shadow-md",
    ctaText: "text-rose-700 group-hover:text-rose-900",
    dot: "bg-[#E11D48]",
    softBg: "from-rose-50/60 via-white to-white"
  }
}

export default function TeacherDashboard() {
  const { data: session } = useSession()
  const [metrics, setMetrics] = useState<MetricData | null>(null)
  const [workspaceHighlight, setWorkspaceHighlight] = useState<WorkspaceHighlight | null>(null)
  const [workspaceLoading, setWorkspaceLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<"ALL" | "ASSIGNED" | "GVCN" | "GVBM" | "UTILITIES">("ALL")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedEntrancePeriod, setSelectedEntrancePeriod] = useState<string>("ALL")
  const [isEntranceExpanded, setIsEntranceExpanded] = useState<boolean>(false)
  const [viewMode, setViewMode] = useState<"TEACHER" | "ADMIN">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("teacher_view_mode")
      if (saved === "ADMIN" || saved === "TEACHER") return saved
    }
    return "TEACHER"
  })

  // Header Portal: Render các controls Cơ sở và Chế độ lên trên cùng dòng SQMS
  const [headerPortalEl, setHeaderPortalEl] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const el = document.getElementById("teacher-top-header-slot")
    if (el) setHeaderPortalEl(el)
  }, [])

  const [currentDateInfo, setCurrentDateInfo] = useState({
    dayName: "Hôm nay",
    dateStr: "",
    timeStr: "",
    timeGreeting: "Chào Thầy/Cô!"
  })

  // Dynamic Campus Theme Resolution - Căn cứ tự động theo biên chế tài khoản GV
  const rawCampusName = metrics?.campus?.campusName || ""
  const rawCampusCode = metrics?.campus?.campusCode || ""
  const detectedTheme = useCampusTheme(rawCampusCode || rawCampusName)
  const campusTheme = detectedTheme

  // Căn cứ phân quyền tài khoản GV để xác định Chế độ Quản lý
  const sessionRole = ((session?.user as any)?.role || "").toUpperCase().trim()
  const isManager = Boolean(
    metrics?.isManagerRole ||
    ["ADMIN", "SUPER_ADMIN", "ADMINISTRATOR", "TTCM", "TPCM", "TO_TRUONG", "TO_PHO", "TBP", "TRUONG_BO_PHAN", "PHO_BO_PHAN", "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAM_DOC_CO_SO", "BAN_DHCM", "TB_DHCM", "QLCM", "BGH", "BGH_MN", "KT_DBCL"].includes(sessionRole)
  )

  const handleViewModeChange = (mode: "TEACHER" | "ADMIN") => {
    setViewMode(mode)
    if (typeof window !== "undefined") {
      localStorage.setItem("teacher_view_mode", mode)
    }
  }

  // Tự động kiểm tra quyền khi metrics cập nhật
  useEffect(() => {
    if (metrics) {
      if (!isManager && viewMode === "ADMIN") {
        setViewMode("TEACHER")
      }
    }
  }, [metrics, isManager, viewMode])

  const userName = metrics?.teacherInfo?.teacherName || session?.user?.name || "Thầy/Cô"
  const userInitial = userName.charAt(0).toUpperCase()

  const updateDateTime = useCallback(() => {
    const now = new Date()
    const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"]
    const dayName = days[now.getDay()]
    const date = now.getDate()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const hours = now.getHours()
    const minutes = String(now.getMinutes()).padStart(2, "0")

    let greeting = "Chào buổi sáng, Thầy/Cô! Chúc một ngày lên lớp tràn đầy năng lượng tích cực."
    if (hours >= 12 && hours < 18) {
      greeting = "Chào buổi chiều, Thầy/Cô! Chúc các tiết dạy buổi chiều diễn ra thuận lợi và hứng khởi."
    } else if (hours >= 18 || hours < 5) {
      greeting = "Chào buổi tối, Thầy/Cô! Thầy/Cô hãy dành thời gian nghỉ ngơi, thư giãn sau ngày làm việc tận tụy."
    }

    setCurrentDateInfo({
      dayName,
      dateStr: `Ngày ${date}/${month}/${year}`,
      timeStr: `${String(hours).padStart(2, "0")}:${minutes}`,
      timeGreeting: greeting
    })
  }, [])

  const fetchMetrics = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const yearId = typeof window !== "undefined"
        ? (localStorage.getItem("academicYearId") || localStorage.getItem("selectedAcademicYear") || "")
        : ""
      const [metricsRes, workspaceRes] = await Promise.all([
        fetch(`/api/teacher-assessments?action=getDashboardMetrics&academicYearId=${encodeURIComponent(yearId)}`),
        fetch(`/api/teacher/workspace?academicYearId=${encodeURIComponent(yearId)}${isManual ? "&refresh=true" : ""}`).catch(() => null)
      ])
      if (metricsRes.ok) {
        const data = await metricsRes.json()
        setMetrics(data)
      }
      if (workspaceRes && workspaceRes.ok) {
        const ws = await workspaceRes.json()
        if (ws?.counts) {
          setWorkspaceHighlight({
            counts: {
              total: ws.counts.total || 0,
              overdue: ws.counts.overdue || 0,
              today: ws.counts.today || 0,
              thisWeek: ws.counts.thisWeek || 0,
              inProgress: ws.counts.inProgress || 0,
              waitingApproval: ws.counts.waitingApproval || 0,
              completed: ws.counts.completed || 0,
              byModule: ws.counts.byModule || {}
            },
            completionRate: ws.progressAndKPI?.volumeProgress?.completionRate ?? 0,
            kpiAttainment: ws.progressAndKPI?.kpiAttainment || null,
            profile: ws.profile || null,
            priorityIssues: Array.isArray(ws.priorityIssues) ? ws.priorityIssues : []
          })
        }
      }
    } catch (e) {
      console.error("Failed to load dashboard metrics:", e)
    } finally {
      setLoading(false)
      setWorkspaceLoading(false)
      if (isManual) {
        setTimeout(() => setRefreshing(false), 500)
      }
    }
  }, [])

  useEffect(() => {
    updateDateTime()
    const timer = setInterval(updateDateTime, 30000)
    fetchMetrics()
    return () => clearInterval(timer)
  }, [updateDateTime, fetchMetrics])

  const finalMetrics: MetricData = metrics || {
    totalClasses: 0,
    totalStudents: 0,
    totalAssignments: 0,
    scoredStudents: 0,
    academicYearName: "2026-2027",
    totalObservedLessons: 0,
    remedialStudentsCount: 0
  }

  const entranceBatches = useMemo(
    () => finalMetrics.entranceAssignments?.batches || [],
    [finalMetrics.entranceAssignments?.batches]
  )

  const entrancePeriodTabs = useMemo(() => {
    const map = new Map<string, { id: string; name: string; batchCount: number; studentCount: number }>()
    for (const b of entranceBatches) {
      const existing = map.get(b.periodId)
      if (!existing) {
        map.set(b.periodId, {
          id: b.periodId,
          name: b.periodName,
          batchCount: 1,
          studentCount: b.studentCount
        })
      } else {
        existing.batchCount += 1
        existing.studentCount += b.studentCount
      }
    }
    return Array.from(map.values())
  }, [entranceBatches])

  const filteredEntranceBatches = useMemo(() => {
    if (selectedEntrancePeriod === "ALL") return entranceBatches
    const matched = entranceBatches.filter(b => b.periodId === selectedEntrancePeriod)
    return matched.length > 0 ? matched : entranceBatches
  }, [entranceBatches, selectedEntrancePeriod])

  const INITIAL_VISIBLE_ENTRANCE_ROWS = 3
  const visibleEntranceBatches = isEntranceExpanded
    ? filteredEntranceBatches
    : filteredEntranceBatches.slice(0, INITIAL_VISIBLE_ENTRANCE_ROWS)

  const workspaceProfile = workspaceHighlight?.profile || null
  const moduleCounts = useMemo(
    () => workspaceHighlight?.counts?.byModule || {},
    [workspaceHighlight?.counts?.byModule]
  )

  const actionItems: ActionCard[] = useMemo(() => {
    const ent = finalMetrics.entranceAssignments
    const hasPre = Boolean(ent?.hasPreschool)
    const hasGen = Boolean(ent?.hasGeneral)
    const isPreRole = Boolean(ent?.isPreschoolTeacher)
    const preBatches = (ent?.batches || []).filter(b => b.isPreschool)
    const genBatches = (ent?.batches || []).filter(b => !b.isPreschool)
    const latestPre = preBatches[0]
    const latestGen = genBatches[0]

    const homeroomCount = workspaceProfile?.homeroomClasses?.length || (finalMetrics.teacherInfo?.homeroomClass ? 1 : 0)
    const isGVCN = Boolean(workspaceProfile?.rolesDetected?.isGVCN || homeroomCount > 0)
    const teachingCount = workspaceProfile?.teachingAssignments?.length || finalMetrics.totalAssignments || 0
    const specialList = workspaceProfile?.specialAssignments || []
    const specialSubjectNames = Array.from(new Set(specialList.map(s => s.subjectName).filter(Boolean)))
    const hasSpecialSubjects = Boolean(workspaceProfile?.rolesDetected?.isGVMonDacThu || specialList.length > 0 || (moduleCounts.MON_DAC_THU || 0) > 0)
    const ctqtList = workspaceProfile?.ctqtAssignments || []
    const hasCTQT = Boolean(workspaceProfile?.rolesDetected?.isGVCTQT || ctqtList.length > 0)

    const buildPreschoolCard = (): ActionCard => ({
      id: "gvbm-entrance-preschool",
      groupId: "GVBM",
      groupName: "Chuyên môn GVBM",
      title: "Phỏng vấn định hướng Mầm non",
      desc: latestPre
        ? `Kỳ: ${latestPre.periodName} • Đợt: ${latestPre.batchName} • ${ent?.preschoolStudentCount || latestPre.studentCount || 0} HS khảo sát.`
        : "Đánh giá trải nghiệm và phỏng vấn định hướng đầu vào bậc Mầm non theo phân công.",
      href: latestPre
        ? `/teacher/input-assessments?type=preschool&periodId=${latestPre.periodId}&batchId=${latestPre.batchId || "all"}`
        : "/teacher/input-assessments?type=preschool",
      icon: Compass,
      badgeText: (ent?.preschoolStudentCount || 0) > 0 ? `${ent?.preschoolStudentCount} HS khảo sát` : "Mầm non",
      badgeVariant: (ent?.preschoolStudentCount || 0) > 0 ? "accent" : "default",
      metricValue: ent?.preschoolStudentCount || 0,
      accent: "amber",
      isAssigned: (ent?.preschoolStudentCount || 0) > 0 || preBatches.length > 0,
      assignedLabel: preBatches.length > 0 ? `${preBatches.length} đợt đang mở` : undefined,
      pendingTasks: moduleCounts.KHAO_SAT_DAU_VAO || 0,
      ctaLabel: "Vào khảo sát"
    })

    const buildGeneralCard = (): ActionCard => ({
      id: "gvbm-entrance-general",
      groupId: "GVBM",
      groupName: "Chuyên môn GVBM",
      title: "Phỏng vấn định hướng Phổ thông",
      desc: latestGen
        ? `Kỳ: ${latestGen.periodName} • Đợt: ${latestGen.batchName} • ${ent?.generalStudentCount || latestGen.studentCount || 0} HS khảo sát.`
        : "Nhập điểm, nhận xét và phỏng vấn định hướng học sinh mới bậc Phổ thông theo phân công.",
      href: latestGen
        ? `/teacher/input-assessments?type=general&periodId=${latestGen.periodId}&batchId=${latestGen.batchId || "all"}`
        : "/teacher/input-assessments?type=general",
      icon: Compass,
      badgeText: (ent?.generalStudentCount || 0) > 0 ? `${ent?.generalStudentCount} HS khảo sát` : "Phổ thông",
      badgeVariant: (ent?.generalStudentCount || 0) > 0 ? "accent" : "default",
      metricValue: ent?.generalStudentCount || 0,
      accent: "amber",
      isAssigned: (ent?.generalStudentCount || 0) > 0 || genBatches.length > 0,
      assignedLabel: genBatches.length > 0 ? `${genBatches.length} đợt đang mở` : undefined,
      pendingTasks: moduleCounts.KHAO_SAT_DAU_VAO || 0,
      ctaLabel: "Vào khảo sát"
    })

    const entranceCards: ActionCard[] = []
    if (hasPre && hasGen) {
      entranceCards.push(buildPreschoolCard(), buildGeneralCard())
    } else if (hasPre || (isPreRole && !hasGen)) {
      entranceCards.push(buildPreschoolCard())
    } else {
      entranceCards.push(buildGeneralCard())
    }

    const dynamicAssignedCards: ActionCard[] = []
    if (hasSpecialSubjects) {
      dynamicAssignedCards.push({
        id: "gvbm-special-subjects",
        groupId: "GVBM",
        groupName: "Chuyên môn GVBM",
        title: "Đánh giá Môn đặc thù Sky-Line",
        desc:
          specialSubjectNames.length > 0
            ? `Phụ trách: ${specialSubjectNames.join(", ")} (${specialList.length} phân công lớp/khối).`
            : "Đánh giá năng lực các môn đặc thù Sky-Line theo phân công giảng dạy.",
        href: "/teacher/special-subjects/eval",
        icon: Sparkles,
        badgeText: specialSubjectNames.length > 0 ? `${specialSubjectNames.length} môn đặc thù` : "Môn đặc thù",
        badgeVariant: "success",
        metricValue: specialList.length,
        accent: "emerald",
        isAssigned: true,
        assignedLabel: specialList.length > 0 ? `${specialList.length} lớp đặc thù` : "Được phân công",
        pendingTasks: moduleCounts.MON_DAC_THU || 0,
        ctaLabel: "Vào đánh giá"
      })
    }

    if (hasCTQT) {
      dynamicAssignedCards.push({
        id: "gvbm-ctqt-gradebook",
        groupId: "GVBM",
        groupName: "Chuyên môn GVBM",
        title: "Sổ điểm – Chương trình Quốc tế",
        desc: `Nhập điểm, nhận xét học sinh theo chương trình Quốc tế (${ctqtList.length} lớp/môn phụ trách).`,
        href: "/teacher/so-diem-ctqt",
        icon: Globe,
        badgeText: `${ctqtList.length} lớp CTQT`,
        badgeVariant: "skyline",
        metricValue: ctqtList.length,
        accent: "teal",
        isAssigned: true,
        assignedLabel: `${ctqtList.length} lớp CTQT`,
        ctaLabel: "Mở sổ CTQT"
      })
    }

    const baseCards: ActionCard[] = [
      {
        id: "gvcn-classes",
        groupId: "GVCN",
        groupName: "Công tác GVCN",
        title: "Lớp Chủ nhiệm",
        desc: "Theo dõi sĩ số, danh sách học sinh, ban cán sự và báo cáo chuyên cần lớp phụ trách.",
        href: "/teacher/classes",
        icon: Users,
        badgeText: `${finalMetrics.totalClasses} lớp`,
        badgeVariant: "skyline",
        metricValue: finalMetrics.totalClasses,
        accent: "pine",
        isAssigned: isGVCN || finalMetrics.totalClasses > 0,
        assignedLabel: finalMetrics.teacherInfo?.homeroomClass
          ? `CN lớp ${finalMetrics.teacherInfo.homeroomClass}`
          : finalMetrics.totalClasses > 0
          ? `${finalMetrics.totalClasses} lớp phụ trách`
          : undefined,
        pendingTasks: moduleCounts.LOP_CHU_NHIEM || 0,
        ctaLabel: "Quản lý lớp"
      },
      {
        id: "gvbm-grading",
        groupId: "GVBM",
        groupName: "Chuyên môn GVBM",
        title: "Sổ điểm – CT Bộ",
        desc: "Quản lý điểm và nhận xét theo chương trình Bộ GD&ĐT (thường xuyên, giữa kỳ, cuối kỳ).",
        href: "/teacher/so-diem-nhan-xet",
        icon: ClipboardCheck,
        badgeText: teachingCount > 0 ? `${teachingCount} phân công` : "CT Bộ",
        badgeVariant: "success",
        metricValue: teachingCount,
        accent: "teal",
        isAssigned: teachingCount > 0 || (moduleCounts.CHAT_LUONG_GIANG_DAY || 0) > 0,
        assignedLabel: teachingCount > 0 ? `${teachingCount} lớp/môn` : undefined,
        pendingTasks: moduleCounts.CHAT_LUONG_GIANG_DAY || 0,
        ctaLabel: "Mở sổ điểm"
      },
      ...dynamicAssignedCards,
      {
        id: "gvbm-observation",
        groupId: "GVBM",
        groupName: "Chuyên môn GVBM",
        title: "Dự giờ & Phát triển chuyên môn",
        desc: "Đăng ký tiết dạy thao giảng, lập phiếu đánh giá tiết dạy và xem tổng hợp góp ý chuyên môn.",
        href: "/teacher/du-gio",
        icon: Eye,
        badgeText: `${finalMetrics.totalObservedLessons || 0} tiết`,
        badgeVariant: "skyline",
        metricValue: finalMetrics.totalObservedLessons,
        accent: "amber",
        isAssigned: (finalMetrics.totalObservedLessons || 0) > 0 || (moduleCounts.DU_GIO || 0) > 0,
        assignedLabel: workspaceHighlight?.kpiAttainment?.observationQuota
          ? `KPI ${workspaceHighlight.kpiAttainment.observationQuota.observedValidCount}/${workspaceHighlight.kpiAttainment.observationQuota.requiredObservedQuota} tiết`
          : undefined,
        pendingTasks: moduleCounts.DU_GIO || 0,
        ctaLabel: "Mở sổ dự giờ"
      },
      ...entranceCards,
      {
        id: "gvcn-remedial",
        groupId: "GVCN",
        groupName: "Công tác GVCN",
        title: "Hỗ trợ tâm lý, Hướng nghiệp",
        desc: "Lập danh sách học sinh cần phụ đạo văn hóa, hỗ trợ tâm lý, hướng nghiệp và theo dõi tiến độ.",
        href: "/teacher/ho-tro-hoc-tap",
        icon: Heart,
        badgeText: `${finalMetrics.remedialStudentsCount || 0} cần hỗ trợ`,
        badgeVariant: finalMetrics.remedialStudentsCount ? "accent" : "secondary",
        metricValue: finalMetrics.remedialStudentsCount,
        accent: "rose",
        isAssigned: (finalMetrics.remedialStudentsCount || 0) > 0 || (moduleCounts.CO_VAN || 0) > 0,
        assignedLabel: (finalMetrics.remedialStudentsCount || 0) > 0 ? `${finalMetrics.remedialStudentsCount} HS theo dõi` : undefined,
        pendingTasks: moduleCounts.CO_VAN || 0,
        ctaLabel: "Xem danh sách"
      },
      {
        id: "gvbm-experiential",
        groupId: "GVBM",
        groupName: "Chuyên môn GVBM",
        title: "Sổ Hoạt động trải nghiệm",
        desc: "Theo dõi, đánh giá hoạt động trải nghiệm và bài thu hoạch của học sinh.",
        href: "/teacher/experiential-activities",
        icon: GraduationCap,
        badgeText: "Trải nghiệm",
        badgeVariant: "accent",
        accent: "emerald",
        isAssigned: (moduleCounts.TRAI_NGHIEM || 0) > 0,
        pendingTasks: moduleCounts.TRAI_NGHIEM || 0,
        ctaLabel: "Mở sổ HĐTN"
      },
      {
        id: "gvbm-assignments",
        groupId: "GVBM",
        groupName: "Chuyên môn GVBM",
        title: "Phân công giảng dạy",
        desc: "Tra cứu phân công chuyên môn, định mức tiết dạy và danh sách lớp được giao.",
        href: "/teacher/phan-cong-giang-day",
        icon: BookMarked,
        badgeText: `${finalMetrics.totalAssignments} môn`,
        badgeVariant: "secondary",
        metricValue: finalMetrics.totalAssignments,
        accent: "pine",
        isAssigned: finalMetrics.totalAssignments > 0,
        assignedLabel: finalMetrics.totalAssignments > 0 ? `${finalMetrics.totalAssignments} phân công` : undefined,
        ctaLabel: "Xem phân công"
      },
      {
        id: "gvcn-records",
        groupId: "GVCN",
        groupName: "Công tác GVCN",
        title: "Hồ sơ học tập HS",
        desc: "Tra cứu toàn diện thông tin học sinh, lịch sử học tập, khen thưởng và xuất phiếu.",
        href: "/teacher/ho-so-hoc-sinh",
        icon: BookOpen,
        badgeText: `${finalMetrics.totalStudents} HS`,
        badgeVariant: "default",
        metricValue: finalMetrics.totalStudents,
        accent: "teal",
        isAssigned: finalMetrics.totalStudents > 0,
        ctaLabel: "Tra cứu HS"
      },
      {
        id: "util-schedule",
        groupId: "UTILITIES",
        groupName: "Lịch & Tiện ích",
        title: "Thời khóa biểu",
        desc: "Xem lịch dạy theo tuần, vị trí phòng học, thời gian biểu từng tiết học trong ngày.",
        href: "/teacher/thoi-khoa-bieu",
        icon: CalendarDays,
        badgeText: "TKB Tuần",
        badgeVariant: "default",
        accent: "teal",
        isAssigned: false,
        ctaLabel: "Xem lịch dạy"
      },
      {
        id: "util-surveys",
        groupId: "UTILITIES",
        groupName: "Lịch & Tiện ích",
        title: "Khảo sát Giáo viên",
        desc: "Tham gia các phiếu khảo sát ý kiến định kỳ của Nhà trường dành cho giáo viên.",
        href: "/teacher/surveys",
        icon: FileText,
        badgeText: "Khảo sát",
        badgeVariant: "skyline",
        accent: "pine",
        isAssigned: false,
        ctaLabel: "Tham gia"
      }
    ]

    return baseCards
  }, [finalMetrics, workspaceProfile, moduleCounts, workspaceHighlight?.kpiAttainment])

  const managerActionItems: ActionCard[] = useMemo(() => [
    {
      id: "admin-du-gio",
      groupId: "GVBM",
      groupName: "Điều hành Chuyên môn",
      title: "Điều hành Dự giờ Tổ CM",
      desc: "Theo dõi, rà soát và điều hành chỉ tiêu dự giờ của toàn bộ giáo viên trong tổ bộ môn.",
      href: "/teacher/du-gio?tab=overview_slots",
      icon: Eye,
      badgeText: `${finalMetrics.managedDeptObservedCount || 0} tiết tổ`,
      badgeVariant: "skyline",
      metricValue: finalMetrics.managedDeptObservedCount || 0,
      accent: "amber",
      isAssigned: true,
      assignedLabel: finalMetrics.managedDepartmentName || "Tổ chuyên môn",
      ctaLabel: "Điều hành ngay"
    },
    {
      id: "admin-quality-analysis",
      groupId: "GVBM",
      groupName: "Điều hành Chuyên môn",
      title: "Phân tích Chất lượng Đánh giá",
      desc: "Báo cáo thống kê chất lượng khảo sát đầu vào, giữa kỳ, phân loại học sinh toàn khối/tổ.",
      href: "/teacher/phan-tich-chat-luong",
      icon: BarChart3,
      badgeText: "Báo cáo CLGD",
      badgeVariant: "accent",
      accent: "teal",
      isAssigned: true,
      assignedLabel: "Phân tích toàn tổ",
      ctaLabel: "Xem báo cáo"
    },
    ...(
      (
        String((session?.user as any)?.role || "").toUpperCase().includes("KT") ||
        String(finalMetrics.managedDepartmentName || "").toUpperCase().includes("KT") ||
        String(finalMetrics.managedDepartmentName || "").toUpperCase().includes("ĐBCL") ||
        String(finalMetrics.managedDepartmentName || "").toUpperCase().includes("DBCL")
      )
        ? [
            {
              id: "admin-weekly-report",
              groupId: "GVBM" as const,
              groupName: "Điều hành Chuyên môn",
              title: "Báo cáo Tuần Ban KT&ĐBCL",
              desc: "Lập báo cáo công việc tuần, theo dõi hiệu suất và xác nhận tiến độ chuyên biệt của Ban KT&ĐBCL.",
              href: "/admin/weekly-reports",
              icon: ClipboardCheck,
              badgeText: "Ban KT&ĐBCL",
              badgeVariant: "default" as const,
              accent: "pine" as const,
              isAssigned: true,
              assignedLabel: "Nhiệm vụ Ban KT&ĐBCL",
              ctaLabel: "Mở báo cáo"
            },
          ]
        : []
    ),
    {
      id: "admin-assignments",
      groupId: "GVBM",
      groupName: "Điều hành Chuyên môn",
      title: "Phân công Giảng dạy Tổ CM",
      desc: "Rà soát định mức tiết dạy, phân công chuyên môn giáo viên và danh sách lớp thuộc tổ.",
      href: "/teacher/phan-cong-giang-day",
      icon: BookMarked,
      badgeText: `${finalMetrics.managedTeachersCount || 0} GV`,
      badgeVariant: "secondary",
      metricValue: finalMetrics.managedTeachersCount || 0,
      accent: "emerald",
      isAssigned: true,
      assignedLabel: `${finalMetrics.managedTeachersCount || 0} GV trong tổ`,
      ctaLabel: "Xem phân công"
    },
    {
      id: "admin-student-records",
      groupId: "GVCN",
      groupName: "Quản lý Học sinh",
      title: "Hồ sơ Học sinh Toàn trường",
      desc: "Tra cứu danh sách học sinh theo khối lớp, kết quả học tập và năng lực rèn luyện.",
      href: "/teacher/ho-so-hoc-sinh",
      icon: Users,
      badgeText: "Hồ sơ 360°",
      badgeVariant: "skyline",
      accent: "pine",
      isAssigned: true,
      ctaLabel: "Tra cứu 360°"
    },
    {
      id: "admin-grading",
      groupId: "GVBM",
      groupName: "Điều hành Chuyên môn",
      title: "Sổ điểm & Nhận xét",
      desc: "Nhập điểm kiểm tra thường xuyên, giữa kỳ, cuối kỳ và viết nhận xét quá trình.",
      href: "/teacher/so-diem-nhan-xet",
      icon: ClipboardCheck,
      badgeText: "Sổ điểm",
      badgeVariant: "success",
      accent: "teal",
      isAssigned: true,
      ctaLabel: "Mở sổ điểm"
    },
    {
      id: "admin-surveys",
      groupId: "UTILITIES",
      groupName: "Tiện ích & Khảo sát",
      title: "Khảo sát Nhà trường",
      desc: "Tham gia các phiếu khảo sát ý kiến định kỳ của Nhà trường dành cho cán bộ, giáo viên.",
      href: "/teacher/surveys",
      icon: FileText,
      badgeText: "Khảo sát",
      badgeVariant: "skyline",
      accent: "rose",
      isAssigned: false,
      ctaLabel: "Tham gia"
    }
  ], [finalMetrics, session])

  const currentActionsList = viewMode === "ADMIN" ? managerActionItems : actionItems

  const filteredActions = useMemo(() => {
    const filtered = currentActionsList.filter((item) => {
      if (activeTab === "ASSIGNED" && !item.isAssigned) return false
      if (activeTab !== "ALL" && activeTab !== "ASSIGNED" && item.groupId !== activeTab) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchTitle = item.title.toLowerCase().includes(q)
        const matchDesc = item.desc.toLowerCase().includes(q)
        const matchGroup = item.groupName.toLowerCase().includes(q)
        const matchAssigned = (item.assignedLabel || "").toLowerCase().includes(q)
        return matchTitle || matchDesc || matchGroup || matchAssigned
      }
      return true
    })
    return [...filtered].sort((a, b) => {
      const scoreA = (a.pendingTasks || 0) > 0 ? 3 : a.isAssigned ? 2 : 1
      const scoreB = (b.pendingTasks || 0) > 0 ? 3 : b.isAssigned ? 2 : 1
      if (scoreB !== scoreA) return scoreB - scoreA
      return (b.pendingTasks || 0) - (a.pendingTasks || 0)
    })
  }, [currentActionsList, activeTab, searchQuery])

  const assignedCount = useMemo(
    () => currentActionsList.filter((i) => i.isAssigned).length,
    [currentActionsList]
  )

  // Dynamic Tabs Configuration according to View Mode
  const tabConfig = useMemo(() => {
    if (viewMode === "ADMIN") {
      return [
        { id: "ALL" as const, label: `Tất cả (${managerActionItems.length})` },
        { id: "ASSIGNED" as const, label: `Được gán (${assignedCount})` },
        { id: "GVBM" as const, label: "Điều hành Tổ CM" },
        { id: "GVCN" as const, label: "Quản lý Học sinh" },
        { id: "UTILITIES" as const, label: "Tiện ích & Khảo sát" }
      ]
    }
    const gvcnCount = actionItems.filter(i => i.groupId === "GVCN").length
    const gvbmCount = actionItems.filter(i => i.groupId === "GVBM").length
    const utilCount = actionItems.filter(i => i.groupId === "UTILITIES").length
    return [
      { id: "ALL" as const, label: `Tất cả (${actionItems.length})` },
      { id: "ASSIGNED" as const, label: `Được phân công (${assignedCount})` },
      { id: "GVCN" as const, label: `Công tác GVCN (${gvcnCount})` },
      { id: "GVBM" as const, label: `Chuyên môn GVBM (${gvbmCount})` },
      { id: "UTILITIES" as const, label: `Lịch & Tiện ích (${utilCount})` }
    ]
  }, [viewMode, managerActionItems, actionItems, assignedCount])

  // Render cụm Controls: Cơ sở (Hill | Global | Hệ thống) và Chế độ (Quản lý | Cá nhân)
  const renderTopControls = (isHeaderSlot = false) => (
    <div className={`flex items-center gap-1.5 sm:gap-2 flex-wrap ${isHeaderSlot ? "animate-in fade-in duration-200" : ""}`}>
      {/* 1. Cơ sở: Hiển thị theo biên chế của tài khoản (Hill | Global | Hệ thống) */}
      <div className="flex items-center bg-[#F8FAFC] rounded-xl px-2.5 py-1 border border-slate-200/90 text-xs font-bold shadow-2xs gap-1.5">
        <span className="text-slate-500 hidden md:inline text-[11px] font-semibold">Cơ sở:</span>
        <span
          className={`px-2 py-0.5 rounded-lg text-xs font-bold shadow-2xs ${
            campusTheme.type === "HILL"
              ? "bg-[#AE882E] text-white"
              : campusTheme.type === "GLOBAL"
              ? "bg-[#003B3A] text-white"
              : "bg-[#00A19A] text-white"
          }`}
          title={`Biên chế: ${campusTheme.name}`}
        >
          {campusTheme.type === "HILL" ? "Hill" : campusTheme.type === "GLOBAL" ? "Global" : "Hệ thống"}
        </span>
      </div>

      {/* 2. Chế độ: Quản lý | Cá nhân - Căn cứ vào vai trò tài khoản giáo viên */}
      {isManager && (
        <div className="bg-slate-100 p-0.5 rounded-xl border border-slate-200/90 flex items-center gap-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => handleViewModeChange("ADMIN")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === "ADMIN"
                ? "bg-[#003B3A] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
            }`}
            title="Chuyển sang Chế độ Quản lý Tổ chuyên môn / Đơn vị"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Chế độ Quản lý</span>
          </button>

          <button
            type="button"
            onClick={() => handleViewModeChange("TEACHER")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === "TEACHER"
                ? "bg-[#00A19A] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
            }`}
            title="Chuyển sang Chế độ Cá nhân (Giảng dạy & Chủ nhiệm)"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Chế độ Cá nhân</span>
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* HEADER PORTAL: ĐƯA CỤM CƠ SỞ VÀ CHẾ ĐỘ LÊN DÒNG THANH TIÊU ĐỀ CHÍNH (SQMS) */}
      {headerPortalEl && createPortal(renderTopControls(true), headerPortalEl)}

      {/* MOBILE PWA VIEW (< 768px): SSM TODAY */}
      <div className="md:hidden -m-3.5 sm:-m-6">
        <SSMTodayHome />
      </div>

      {/* DESKTOP VIEW (>= 768px): FULL TEACHER DASHBOARD CHUẨN SKY-LINE ACADEMIC LEDGER */}
      <div className="hidden md:block space-y-6 max-w-7xl mx-auto pb-20 sm:pb-8">

      {/* 1. HERO WELCOME CARD - MASTHEAD ĐỘNG THEO THƯƠNG HIỆU CƠ SỞ & CHẾ ĐỘ */}
      <UserWelcomeCard
        userName={userName}
        userInitial={userInitial}
        greetingSubtitle={
          viewMode === "ADMIN"
            ? `${currentDateInfo.timeGreeting} • Đang xem không gian Điều hành & Quản lý ${metrics?.managedDepartmentName || "chuyên môn"}.`
            : currentDateInfo.timeGreeting
        }
        campusName={campusTheme.name}
        campusCode={campusTheme.code}
        teacherCode={metrics?.teacherInfo?.teacherCode}
        roleBadgeText={
          isManager
            ? metrics?.managedDepartmentName
              ? `Quản lý ${metrics.managedDepartmentName}`
              : "Cán bộ Quản lý / TTCM"
            : undefined
        }
        homeroomClass={metrics?.teacherInfo?.homeroomClass || undefined}
        mainSubject={metrics?.teacherInfo?.mainSubject || undefined}
        positions={metrics?.teacherInfo?.positions || undefined}
        customMetaChips={
          <>
            {workspaceProfile && workspaceProfile.campuses.length > 1 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-[#F0FDFA] border border-[#99F6E4] text-[#00736E] shadow-2xs tabular-nums">
                <School className="w-3.5 h-3.5 text-[#00A19A] shrink-0" />
                <span>Liên cơ sở: {workspaceProfile.campuses.length} cơ sở</span>
              </span>
            )}
            {workspaceProfile && workspaceProfile.specialAssignments.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                <span>
                  Môn đặc thù:{" "}
                  {Array.from(new Set(workspaceProfile.specialAssignments.map((s) => s.subjectName).filter(Boolean)))
                    .slice(0, 2)
                    .join(", ")}
                </span>
              </span>
            )}
            {workspaceHighlight?.kpiAttainment && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border shadow-2xs tabular-nums ${
                  workspaceHighlight.kpiAttainment.overallStatus === "MET"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : workspaceHighlight.kpiAttainment.overallStatus === "PARTIAL"
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                <Award className="w-3.5 h-3.5 shrink-0" />
                <span>
                  KPI chuyên môn: {workspaceHighlight.kpiAttainment.metCriteriaCount}/
                  {workspaceHighlight.kpiAttainment.totalCriteriaCount} chỉ tiêu
                </span>
              </span>
            )}
          </>
        }
        onRefresh={() => fetchMetrics(true)}
        isRefreshing={refreshing}
        showAcademicYear={false}
      />

      {/* 2. DẢI CHỈ SỐ ĐIỂM NHẤN — 5 THẺ KPI CÓ TRỌNG TÂM MÀU SẮC SKY-LINE */}
      <section aria-label="Chỉ số tổng quan công tác" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 tabular-nums">
        {(() => {
          const remedialCount = finalMetrics.remedialStudentsCount || 0
          const overdueCount = workspaceHighlight?.counts.overdue ?? 0
          const activeTasksCount = workspaceHighlight?.counts.thisWeek ?? 0
          const completionRate = workspaceHighlight?.completionRate ?? 0
          const specialCount = workspaceProfile?.specialAssignments?.length || 0

          if (viewMode === "ADMIN") {
            return (
              <>
                {/* Hero Focal Card — Deep Pine to Teal Gradient */}
                <Link
                  href="/teacher/du-gio?tab=overview_slots"
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#003B3A] via-[#005854] to-[#008B85] p-4 text-white shadow-md hover:shadow-lg transition-all flex flex-col justify-between min-h-[126px]"
                >
                  <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#CCFBF1]">Tổ chuyên môn</span>
                    <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4 text-[#5EEAD4]" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-xl font-extrabold tracking-tight truncate">
                      {finalMetrics.managedDepartmentName
                        ? finalMetrics.managedDepartmentName.replace(/^Tổ\s+/i, "")
                        : "Chuyên môn"}
                    </div>
                    <div className="text-[11px] text-teal-100/90 mt-1 flex items-center justify-between">
                      <span>NH {finalMetrics.academicYearName}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#5EEAD4] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>

                <Link
                  href="/teacher/phan-cong-giang-day"
                  className="group rounded-2xl bg-white border border-[#E2E8F0] border-t-[3px] border-t-[#00A19A] p-4 shadow-xs hover:shadow-md hover:border-[#00A19A]/50 transition-all flex flex-col justify-between min-h-[126px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-600">Đội ngũ giáo viên</span>
                    <div className="w-8 h-8 rounded-xl bg-[#F0FDFA] text-[#00736E] flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold text-[#003B3A]">{finalMetrics.managedTeachersCount || 0}</span>
                      <span className="text-xs font-medium text-slate-500">giáo viên</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>Thành viên tổ bộ môn</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#00A19A]" />
                    </div>
                  </div>
                </Link>

                <Link
                  href="/teacher/du-gio?tab=overview_slots"
                  className="group rounded-2xl bg-white border border-[#E2E8F0] border-t-[3px] border-t-[#059669] p-4 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between min-h-[126px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-600">Tiết dự giờ tổ</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#059669] flex items-center justify-center shrink-0">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold text-[#059669]">{finalMetrics.managedDeptObservedCount || 0}</span>
                      <span className="text-xs font-medium text-slate-500">tiết</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>Đã thực hiện trong tổ</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#059669]" />
                    </div>
                  </div>
                </Link>

                <Link
                  href="/teacher/du-gio"
                  className="group rounded-2xl bg-white border border-[#E2E8F0] border-t-[3px] border-t-[#D97706] p-4 shadow-xs hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between min-h-[126px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-600">Dự giờ cá nhân</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#D97706] flex items-center justify-center shrink-0">
                      <Target className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-extrabold text-[#D97706]">{finalMetrics.totalObservedLessons || 0}</span>
                      <span className="text-xs font-medium text-slate-500">tiết</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>Chỉ tiêu cá nhân CBQL</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#D97706]" />
                    </div>
                  </div>
                </Link>

                <Link
                  href="/teacher/ho-tro-hoc-tap"
                  className={`group rounded-2xl border border-t-[3px] p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between min-h-[126px] ${
                    remedialCount > 0
                      ? "bg-rose-50/50 border-rose-200 border-t-[#E11D48] hover:bg-rose-50"
                      : "bg-white border-[#E2E8F0] border-t-[#059669] hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold ${remedialCount > 0 ? "text-rose-800" : "text-slate-600"}`}>
                      Cần bồi dưỡng
                    </span>
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        remedialCount > 0 ? "bg-rose-100 text-[#E11D48]" : "bg-emerald-50 text-[#059669]"
                      }`}
                    >
                      <Heart className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-2xl font-extrabold ${remedialCount > 0 ? "text-[#E11D48]" : "text-[#059669]"}`}>
                        {remedialCount}
                      </span>
                      <span className="text-xs font-medium text-slate-500">học sinh</span>
                    </div>
                    <div className="text-[11px] mt-1 flex items-center justify-between">
                      <span className={remedialCount > 0 ? "text-[#E11D48] font-medium" : "text-slate-500"}>
                        {remedialCount > 0 ? "Cần theo dõi & hỗ trợ" : "Không có HS cảnh báo"}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#E11D48]" />
                    </div>
                  </div>
                </Link>
              </>
            )
          }

          return (
            <>
              {/* Card 1: Hero Focal Card — Nhiệm vụ đang thực hiện (Deep Pine -> Teal Gradient) */}
              <Link
                href="/teacher/tasks"
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#003B3A] via-[#005854] to-[#008B85] p-4 text-white shadow-md hover:shadow-lg transition-all flex flex-col justify-between min-h-[126px]"
              >
                <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#CCFBF1]">Nhiệm vụ đang mở</span>
                  <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <CheckSquare className="w-4 h-4 text-[#5EEAD4]" />
                  </div>
                </div>
                <div className="mt-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold tracking-tight">
                      {workspaceLoading ? "—" : activeTasksCount}
                    </span>
                    <span className="text-xs font-medium text-[#CCFBF1]">
                      việc • {completionRate}% xong
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-[#5EEAD4] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(6, completionRate))}%` }}
                    />
                  </div>
                </div>
              </Link>

              {/* Card 2: Lớp & Học sinh phụ trách (Teal Accent) */}
              <Link
                href="/teacher/classes"
                className="group rounded-2xl bg-white border border-[#E2E8F0] border-t-[3px] border-t-[#00A19A] p-4 shadow-xs hover:shadow-md hover:border-[#00A19A]/60 transition-all flex flex-col justify-between min-h-[126px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600">Lớp & Học sinh</span>
                  <div className="w-8 h-8 rounded-xl bg-[#F0FDFA] text-[#00736E] flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-[#003B3A]">{finalMetrics.totalClasses}</span>
                    <span className="text-xs font-medium text-slate-500">lớp</span>
                    <span className="text-slate-300 mx-0.5">/</span>
                    <span className="text-base font-bold text-[#00736E]">{finalMetrics.totalStudents}</span>
                    <span className="text-[11px] font-medium text-slate-500">HS</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span className="truncate">Chủ nhiệm & bộ môn</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#00A19A] shrink-0" />
                  </div>
                </div>
              </Link>

              {/* Card 3: Phân công môn & Môn đặc thù (Emerald Accent) */}
              <Link
                href="/teacher/phan-cong-giang-day"
                className="group rounded-2xl bg-white border border-[#E2E8F0] border-t-[3px] border-t-[#059669] p-4 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between min-h-[126px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600">Phân công giảng dạy</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#059669] flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-[#059669]">{finalMetrics.totalAssignments}</span>
                    <span className="text-xs font-medium text-slate-500">môn học</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span className="truncate">
                      {specialCount > 0 ? `+ ${specialCount} lớp môn đặc thù` : "Định mức chuyên môn"}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#059669] shrink-0" />
                  </div>
                </div>
              </Link>

              {/* Card 4: Tiết dự giờ & KPI (Amber Accent) */}
              <Link
                href="/teacher/du-gio"
                className="group rounded-2xl bg-white border border-[#E2E8F0] border-t-[3px] border-t-[#D97706] p-4 shadow-xs hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between min-h-[126px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600">Dự giờ & PTCM</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#D97706] flex items-center justify-center shrink-0">
                    <Eye className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-[#D97706]">{finalMetrics.totalObservedLessons || 0}</span>
                    <span className="text-xs font-medium text-slate-500">tiết</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span className="truncate">
                      {workspaceHighlight?.kpiAttainment?.observationQuota
                        ? `Tháng ${workspaceHighlight.kpiAttainment.observationQuota.currentMonth}: ${workspaceHighlight.kpiAttainment.observationQuota.observedValidCount}/${workspaceHighlight.kpiAttainment.observationQuota.requiredObservedQuota} tiết`
                        : "Phiếu dự giờ chuyên môn"}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#D97706] shrink-0" />
                  </div>
                </div>
              </Link>

              {/* Card 5: Quá hạn / Cần hỗ trợ ngay (Rose if alert, Emerald if clear) */}
              <Link
                href={overdueCount > 0 ? "/teacher/tasks?filter=OVERDUE" : "/teacher/ho-tro-hoc-tap"}
                className={`group rounded-2xl border border-t-[3px] p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between min-h-[126px] ${
                  overdueCount > 0 || remedialCount > 0
                    ? "bg-rose-50/60 border-rose-200 border-t-[#E11D48] hover:bg-rose-50"
                    : "bg-white border-[#E2E8F0] border-t-[#059669] hover:border-emerald-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      overdueCount > 0 || remedialCount > 0 ? "text-rose-800" : "text-slate-600"
                    }`}
                  >
                    {overdueCount > 0 ? "Nhiệm vụ quá hạn" : "Học sinh cần hỗ trợ"}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      overdueCount > 0 || remedialCount > 0
                        ? "bg-rose-100 text-[#E11D48]"
                        : "bg-emerald-50 text-[#059669]"
                    }`}
                  >
                    {overdueCount > 0 ? <AlertTriangle className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`text-2xl font-extrabold ${
                        overdueCount > 0 || remedialCount > 0 ? "text-[#E11D48]" : "text-[#059669]"
                      }`}
                    >
                      {overdueCount > 0 ? overdueCount : remedialCount}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      {overdueCount > 0 ? "việc quá hạn" : "học sinh"}
                    </span>
                  </div>
                  <div className="text-[11px] mt-1 flex items-center justify-between">
                    <span
                      className={
                        overdueCount > 0 || remedialCount > 0
                          ? "text-[#E11D48] font-semibold truncate"
                          : "text-[#059669] font-medium truncate"
                      }
                    >
                      {overdueCount > 0
                        ? "Ưu tiên xử lý ngay"
                        : remedialCount > 0
                        ? "Cần theo dõi & bồi dưỡng"
                        : "Tiến độ đang ổn định"}
                    </span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 shrink-0 ${
                        overdueCount > 0 || remedialCount > 0 ? "text-rose-400" : "text-emerald-400"
                      }`}
                    />
                  </div>
                </div>
              </Link>
            </>
          )
        })()}
      </section>

      {/* 3. ĐIỂM NHẤN CHỨC NĂNG ĐƯỢC GÁN — KHÔNG GIAN PHÂN HỆ CHUYÊN MÔN */}
      <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {/* Header Spotlight */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#003B3A] via-[#004D4B] to-[#006663] text-white flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 text-[#5EEAD4] flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold tracking-tight text-white">
                  {viewMode === "ADMIN" ? "Chức năng điều hành được giao" : "Chức năng được phân công cho bạn"}
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#5EEAD4] text-[#003B3A] tabular-nums">
                  {assignedCount} chức năng đang hoạt động
                </span>
              </div>
              <p className="text-xs text-teal-100/90 mt-0.5">
                {viewMode === "ADMIN"
                  ? "Các phân hệ quản trị tổ chuyên môn và theo dõi chất lượng theo quyền hạn được cấp."
                  : "Các phân hệ gắn trực tiếp với lớp chủ nhiệm, bộ môn, môn đặc thù và nhiệm vụ đang mở của Thầy/Cô."}
              </p>
            </div>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-200" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nhanh chức năng, môn, lớp..."
              className="w-full bg-white/12 border border-white/20 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-teal-100/70 focus:outline-none focus:bg-white/20 focus:border-[#5EEAD4] transition-all"
            />
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-5 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E2E8F0] overflow-x-auto no-scrollbar">
            {tabConfig.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                  activeTab === tab.id
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : "text-slate-600 hover:text-[#003B3A] hover:bg-[#F0FDFA]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#00A19A]" />
              <span>Chức năng được gán hiển thị ưu tiên</span>
            </span>
          </div>
        </div>

        {/* Assigned & General Modules Grid */}
        <div className="p-5 space-y-5">
          {(() => {
            const assignedItems = filteredActions.filter((i) => i.isAssigned)
            const otherItems = filteredActions.filter((i) => !i.isAssigned)

            if (filteredActions.length === 0) {
              return (
                <div className="py-8 text-center text-xs text-slate-500">
                  Không tìm thấy chức năng phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;.
                </div>
              )
            }

            return (
              <>
                {assignedItems.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignedItems.map((item) => {
                      const IconComponent = item.icon
                      const theme = ACCENT_STYLES[item.accent]
                      const hasPending = (item.pendingTasks || 0) > 0

                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          className={`group relative rounded-2xl border border-[#E2E8F0] border-l-4 ${theme.rail} bg-gradient-to-br ${theme.softBg} p-4 shadow-2xs ${theme.cardHover} transition-all flex flex-col justify-between gap-3.5`}
                        >
                          {/* Top Row: Vibrant Icon + Title + Live Workload Pill */}
                          <div className="space-y-2.5">
                            <div className="flex items-start justify-between gap-2.5">
                              <div
                                className={`w-11 h-11 rounded-xl ${theme.iconBg} ${theme.iconHover} flex items-center justify-center shrink-0 transition-transform`}
                              >
                                <IconComponent className="w-5 h-5" />
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap justify-end tabular-nums">
                                {hasPending && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E11D48] text-white shadow-2xs">
                                    {item.pendingTasks} việc chờ
                                  </span>
                                )}
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${theme.badge}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                                  <span>{item.assignedLabel || item.badgeText}</span>
                                </span>
                              </div>
                            </div>

                            <div>
                              <h3 className="text-sm font-bold text-[#003B3A] group-hover:text-[#00736E] transition-colors">
                                {item.title}
                              </h3>
                              <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mt-1">
                                {item.desc}
                              </p>
                            </div>
                          </div>

                          {/* Bottom Action Footer */}
                          <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-xs">
                            <span className="text-[11px] font-medium text-slate-500">
                              {item.groupName}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 font-bold ${theme.ctaText} transition-colors`}
                            >
                              <span>{item.ctaLabel || "Mở phân hệ"}</span>
                              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}

                {otherItems.length > 0 && (
                  <div className={assignedItems.length > 0 ? "pt-4 border-t border-[#E2E8F0]" : ""}>
                    {assignedItems.length > 0 && (
                      <div className="text-xs font-semibold text-slate-500 mb-3">
                        Tiện ích & phân hệ mở rộng khác ({otherItems.length})
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {otherItems.map((item) => {
                        const IconComponent = item.icon
                        const theme = ACCENT_STYLES[item.accent]
                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            className="group bg-[#F8FAFC] hover:bg-white rounded-xl border border-[#E2E8F0] hover:border-[#00A19A]/50 p-3.5 transition-all flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-9 h-9 rounded-lg ${theme.badge} border flex items-center justify-center shrink-0`}>
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#003B3A] truncate">
                                    {item.title}
                                  </h4>
                                </div>
                                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                  {item.desc}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#00A19A] shrink-0 transition-colors" />
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      </section>

      {/* 4. ĐIỂM NHẤN CÔNG VIỆC & TRỌNG TÂM HÔM NAY (8 CỘT CÔNG VIỆC ƯU TIÊN + 4 CỘT LỐI TẮT HÔM NAY) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* CỘT TRÁI (8 CỘT): ĐIỂM NHẤN CÔNG VIỆC & NHIỆM VỤ CẦN XỬ LÝ */}
        <section className="lg:col-span-8 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            {/* Deep Pine Header */}
            <div className="px-5 py-3.5 bg-[#003B3A] text-white flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/15 text-[#5EEAD4] flex items-center justify-center shrink-0">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Điểm nhấn công việc
                  </h2>
                  <p className="text-[11px] text-teal-100/85">
                    Nhiệm vụ ưu tiên, tiến độ thực hiện & hạn chốt chuyên môn
                  </p>
                </div>
              </div>

              <Link
                href="/teacher/tasks"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#00A19A] hover:bg-[#5EEAD4] hover:text-[#003B3A] text-white transition-colors"
              >
                <span>Trung tâm nhiệm vụ</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Thanh tóm tắt 4 trạng thái nhiệm vụ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E2E8F0] border-b border-[#E2E8F0] bg-[#F8FAFC]/60 tabular-nums">
              <Link
                href="/teacher/tasks?filter=OVERDUE"
                className={`px-4 py-3 transition-colors ${
                  (workspaceHighlight?.counts.overdue || 0) > 0
                    ? "bg-rose-50/70 hover:bg-rose-50"
                    : "hover:bg-white"
                }`}
              >
                <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                  <AlertTriangle
                    className={`w-3.5 h-3.5 ${
                      (workspaceHighlight?.counts.overdue || 0) > 0 ? "text-[#E11D48]" : "text-slate-400"
                    }`}
                  />
                  <span>Quá hạn</span>
                </div>
                <div
                  className={`text-xl font-extrabold mt-0.5 ${
                    (workspaceHighlight?.counts.overdue || 0) > 0 ? "text-[#E11D48]" : "text-slate-700"
                  }`}
                >
                  {workspaceLoading ? "—" : workspaceHighlight?.counts.overdue ?? 0}
                </div>
              </Link>

              <Link href="/teacher/tasks" className="px-4 py-3 hover:bg-white transition-colors">
                <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#00A19A]" />
                  <span>Cần làm tuần này</span>
                </div>
                <div className="text-xl font-extrabold text-[#00736E] mt-0.5">
                  {workspaceLoading ? "—" : workspaceHighlight?.counts.thisWeek ?? 0}
                </div>
              </Link>

              <Link href="/teacher/tasks?filter=WAITING" className="px-4 py-3 hover:bg-white transition-colors">
                <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                  <Hourglass
                    className={`w-3.5 h-3.5 ${
                      (workspaceHighlight?.counts.waitingApproval || 0) > 0 ? "text-[#D97706]" : "text-slate-400"
                    }`}
                  />
                  <span>Chờ phê duyệt</span>
                </div>
                <div
                  className={`text-xl font-extrabold mt-0.5 ${
                    (workspaceHighlight?.counts.waitingApproval || 0) > 0 ? "text-[#D97706]" : "text-slate-700"
                  }`}
                >
                  {workspaceLoading ? "—" : workspaceHighlight?.counts.waitingApproval ?? 0}
                </div>
              </Link>

              <Link href="/teacher/tasks?filter=COMPLETED" className="px-4 py-3 hover:bg-white transition-colors">
                <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Đã hoàn thành</span>
                </div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-extrabold text-[#059669]">
                    {workspaceLoading ? "—" : workspaceHighlight?.counts.completed ?? 0}
                  </span>
                  {workspaceHighlight && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                      {workspaceHighlight.completionRate}%
                    </span>
                  )}
                </div>
              </Link>
            </div>

            {/* Danh sách đầu việc ưu tiên cần xử lý ngay */}
            <div className="divide-y divide-[#F1F5F9]">
              {workspaceLoading ? (
                <div className="px-5 py-6 text-xs text-slate-400 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00A19A]" />
                  <span>Đang tải danh sách công việc ưu tiên...</span>
                </div>
              ) : workspaceHighlight && workspaceHighlight.priorityIssues.length > 0 ? (
                workspaceHighlight.priorityIssues.slice(0, 4).map((issue) => {
                  const isOverdue = issue.status === "OVERDUE"
                  return (
                    <Link
                      key={issue.taskId}
                      href={issue.deepLink}
                      className="px-5 py-3.5 hover:bg-[#F0FDFA]/50 transition-colors flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${
                            isOverdue
                              ? "bg-rose-50 text-[#E11D48] border-rose-200"
                              : "bg-amber-50 text-[#D97706] border-amber-200"
                          }`}
                        >
                          {isOverdue ? "Quá hạn" : "Ưu tiên"}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 group-hover:text-[#00736E] truncate">
                            {issue.title}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 tabular-nums mt-0.5">
                            <span className="font-medium text-[#00736E]">
                              {issue.metadata?.moduleLabel || issue.sourceModule}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className={isOverdue ? "text-[#E11D48] font-semibold" : ""}>
                              Hạn: {issue.deadline}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F8FAFC] text-[#003B3A] border border-[#E2E8F0] group-hover:bg-[#00A19A] group-hover:text-white group-hover:border-[#00A19A] shrink-0 transition-colors">
                        <span>Xử lý</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </Link>
                  )
                })
              ) : (
                <div className="px-5 py-6 flex items-center justify-between gap-3 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-[#059669] flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Không có nhiệm vụ quá hạn hay khẩn cấp tồn đọng
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Các đầu việc định kỳ đang trong tiến độ kiểm soát tốt.
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/teacher/tasks"
                    className="text-xs font-bold text-[#00736E] hover:text-[#003B3A] whitespace-nowrap"
                  >
                    Xem toàn bộ
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Thanh đếm ngược hạn chốt khóa sổ gắn liền vùng Công việc */}
          <div className="p-3 bg-[#F8FAFC] border-t border-[#E2E8F0]">
            <DeadlineCountdownBanner
              deadlineDate="2026-11-02T17:00:00.000Z"
              batchName="Khảo sát Giữa Học Kỳ 1 (GK1) - Khóa sổ toàn hệ thống"
              pendingCount={finalMetrics.scoredStudents < finalMetrics.totalStudents ? (finalMetrics.totalStudents - finalMetrics.scoredStudents) : 0}
              totalCount={finalMetrics.totalStudents}
              isPendingFiltered={false}
              className="!rounded-xl !shadow-none"
            />
          </div>
        </section>

        {/* CỘT PHẢI (4 CỘT): TRỌNG TÂM HÔM NAY & TIẾN ĐỘ KPI */}
        <aside className="lg:col-span-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            {/* Accent Banner Top */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#00736E] to-[#00A19A] text-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#CCFBF1]" />
                <h2 className="text-sm font-bold text-white">
                  {viewMode === "ADMIN" ? "Tiêu điểm điều hành" : "Trọng tâm hôm nay"}
                </h2>
              </div>
              <span className="text-[11px] font-semibold bg-white/15 px-2.5 py-0.5 rounded-full text-white tabular-nums">
                {currentDateInfo.dayName}, {currentDateInfo.dateStr.replace(/^Ngày\s+/i, "")}
              </span>
            </div>

            <div className="p-4 space-y-3">
              {/* Mini KPI Status Callout */}
              {workspaceHighlight?.kpiAttainment && viewMode !== "ADMIN" && (
                <div className="p-3 rounded-xl bg-[#F0FDFA] border border-[#99F6E4] flex items-center justify-between gap-3 tabular-nums">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#003B3A] text-[#5EEAD4] flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-[#00736E]">Định mức KPI kỳ hiện hành</div>
                      <div className="text-xs font-extrabold text-[#003B3A]">
                        Đạt {workspaceHighlight.kpiAttainment.metCriteriaCount}/
                        {workspaceHighlight.kpiAttainment.totalCriteriaCount} chỉ tiêu quy định
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/teacher/tasks"
                    className="text-[11px] font-bold text-[#00736E] hover:text-[#003B3A] shrink-0"
                  >
                    Chi tiết
                  </Link>
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed">
                {viewMode === "ADMIN"
                  ? `Theo dõi chỉ tiêu dự giờ tổ ${metrics?.managedDepartmentName || "chuyên môn"}, rà soát tiến độ Sổ điểm và chất lượng đánh giá.`
                  : "Truy cập nhanh các đầu việc thường nhật theo phân công giảng dạy và chủ nhiệm của Thầy/Cô."}
              </p>

              {viewMode === "ADMIN" ? (
                <div className="space-y-2">
                  <Link
                    href="/teacher/du-gio?tab=overview_slots"
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white text-xs font-semibold transition-colors shadow-2xs"
                  >
                    <span className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#5EEAD4]" />
                      <span>Điều hành dự giờ tổ CM</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#5EEAD4]" />
                  </Link>
                  <Link
                    href="/teacher/phan-tich-chat-luong"
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#F0FDFA] hover:bg-[#CCFBF1]/60 text-[#003B3A] border border-[#99F6E4] text-xs font-semibold transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#00A19A]" />
                      <span>Báo cáo chất lượng giáo dục</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#00736E]" />
                  </Link>
                  <Link
                    href="/teacher/phan-cong-giang-day"
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-amber-50/70 hover:bg-amber-50 text-amber-950 border border-amber-200 text-xs font-semibold transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <BookMarked className="w-4 h-4 text-[#D97706]" />
                      <span>Phân công giảng dạy tổ</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#D97706]" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    href="/teacher/so-diem-nhan-xet"
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#003B3A] hover:bg-[#005854] text-white text-xs font-semibold transition-colors shadow-2xs"
                  >
                    <span className="flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-[#5EEAD4]" />
                      <span>Sổ điểm & nhận xét</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#5EEAD4]" />
                  </Link>
                  {workspaceProfile && workspaceProfile.specialAssignments.length > 0 && (
                    <Link
                      href="/teacher/special-subjects/eval"
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/70 text-emerald-950 border border-emerald-200 text-xs font-semibold transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#059669]" />
                        <span>Đánh giá Môn đặc thù ({workspaceProfile.specialAssignments.length} lớp)</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#059669]" />
                    </Link>
                  )}
                  <Link
                    href="/teacher/thoi-khoa-bieu"
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#F0FDFA] hover:bg-[#CCFBF1]/60 text-[#003B3A] border border-[#99F6E4] text-xs font-semibold transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-[#00A19A]" />
                      <span>Thời khóa biểu tuần</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#00736E]" />
                  </Link>
                  <Link
                    href="/teacher/du-gio"
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-amber-50/70 hover:bg-amber-50 text-amber-950 border border-amber-200 text-xs font-semibold transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#D97706]" />
                      <span>Sổ dự giờ chuyên môn</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#D97706]" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="px-4 py-2.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-slate-500">
            <span>Đồng bộ 9 phân hệ nghiệp vụ</span>
            <span className="font-bold text-[#00736E] tabular-nums">{currentDateInfo.timeStr}</span>
          </div>
        </aside>
      </div>

      {/* 5. NHẮC VIỆC THÔNG MINH CỐ VẤN HỌC TẬP */}
      {viewMode !== "ADMIN" && <AdvisorySmartRemindersPanel />}

      {/* 4. THÔNG BÁO PHÂN CÔNG PHỎNG VẤN ĐỊNH HƯỚNG — BẢNG SỔ CÁI HỌC THUẬT (SKY-LINE ACADEMIC LEDGER TABLE) */}
      {entranceBatches.length > 0 && (
        <section className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] shadow-2xs overflow-hidden">
          {/* Header Strip Sổ cái */}
          <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-7 h-7 rounded-lg bg-[#003B3A] text-[#5EEAD4] flex items-center justify-center shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-[#003B3A]">
                  Phân công Phỏng vấn định hướng
                </h3>
                <div className="flex items-center gap-1.5 tabular-nums">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#003B3A] text-white">
                    {entranceBatches.length} đợt
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F0FDFA] text-[#00736E] border border-[#CCFBF1]">
                    {finalMetrics.entranceAssignments?.totalStudentCount || 0} HS khảo sát
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {entrancePeriodTabs.length > 1 && (
                <div className="inline-flex items-center bg-white p-0.5 rounded-xl border border-[#E2E8F0] max-w-full overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedEntrancePeriod("ALL")}
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer tabular-nums ${
                      selectedEntrancePeriod === "ALL"
                        ? "bg-[#003B3A] text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Tất cả ({entranceBatches.length})
                  </button>
                  {entrancePeriodTabs.map((pt) => (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => setSelectedEntrancePeriod(pt.id)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer tabular-nums ${
                        selectedEntrancePeriod === pt.id
                          ? "bg-[#003B3A] text-white"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {pt.name} ({pt.batchCount})
                    </button>
                  ))}
                </div>
              )}

              <Link
                href={`/teacher/input-assessments?type=${finalMetrics.entranceAssignments?.hasPreschool && !finalMetrics.entranceAssignments?.hasGeneral ? "preschool" : "general"}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-white bg-[#00A19A] hover:bg-[#00736E] transition-colors whitespace-nowrap"
              >
                <span>Mở cổng khảo sát</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Bảng Sổ cái Học thuật chuẩn "Kết quả khảo sát theo đợt" */}
          <div className={isEntranceExpanded ? "max-h-[260px] overflow-y-auto overflow-x-auto" : "overflow-x-auto"}>
            <table className="w-full text-left border-collapse tabular-nums">
              <thead className="bg-[#003B3A] sticky top-0 z-10 border-b border-[#003B3A]">
                <tr className="text-[11px] font-semibold whitespace-nowrap">
                  <th className="py-2.5 pl-4 pr-3 whitespace-nowrap font-semibold text-white">Phân hệ & Kỳ khảo sát</th>
                  <th className="py-2.5 px-3 font-semibold text-white">Đợt khảo sát</th>
                  <th className="py-2.5 px-3 hidden md:table-cell font-semibold text-teal-100">Nội dung & Khối</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap font-semibold text-[#5EEAD4]">Số lượng</th>
                  <th className="py-2.5 pl-3 pr-4 text-right whitespace-nowrap font-semibold text-white">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
                {visibleEntranceBatches.map((b) => {
                  const detailStr = [
                    b.subjects.length > 0 ? b.subjects.join(", ") : "",
                    b.grades.length > 0 ? `${b.isPreschool ? "Nhóm" : "Khối"} ${b.grades.join(", ")}` : ""
                  ].filter(Boolean).join(" • ")

                  return (
                    <tr key={b.key} className="hover:bg-[#F8FAFC] transition-colors align-middle">
                      <td className="py-3 pl-4 pr-3 whitespace-nowrap align-middle">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            b.isPreschool
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-[#F0FDFA] text-[#00736E] border-[#CCFBF1]"
                          }`}>
                            {b.isPreschool ? "Mầm non" : "Phổ thông"}
                          </span>
                          <span className="font-semibold text-[#003B3A]">{b.periodName}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 align-middle max-w-[220px] sm:max-w-[320px] lg:max-w-[400px]">
                        <div className="font-semibold text-slate-800 truncate" title={b.batchName}>
                          {b.batchName}
                        </div>
                        {detailStr && (
                          <div className="text-[11px] text-slate-500 truncate md:hidden" title={detailStr}>
                            {detailStr}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 align-middle hidden md:table-cell max-w-[240px]">
                        <div className="text-slate-600 truncate" title={detailStr}>
                          {detailStr || "—"}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap align-middle">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 tabular-nums">
                          {b.studentCount} HS
                        </span>
                      </td>

                      <td className="py-3 pl-3 pr-4 text-right whitespace-nowrap align-middle">
                        <Link
                          href={`/teacher/input-assessments?type=${b.isPreschool ? "preschool" : "general"}&periodId=${b.periodId}&batchId=${b.batchId || "all"}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-[#003B3A] hover:bg-[#00A19A] text-white transition-colors"
                        >
                          <span>Vào khảo sát</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredEntranceBatches.length > INITIAL_VISIBLE_ENTRANCE_ROWS && (
            <div className="px-5 py-2.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-600 tabular-nums">
                Hiển thị <strong className="font-semibold text-[#003B3A]">{visibleEntranceBatches.length}</strong> / <strong className="font-semibold text-[#003B3A]">{filteredEntranceBatches.length}</strong> đợt khảo sát
              </span>
              <button
                type="button"
                onClick={() => setIsEntranceExpanded(prev => !prev)}
                className="inline-flex items-center gap-1 font-semibold text-[#00736E] hover:text-[#003B3A] bg-white hover:bg-[#F0FDFA] px-2.5 py-1 rounded-lg border border-[#E2E8F0] transition-colors cursor-pointer tabular-nums"
              >
                {isEntranceExpanded ? (
                  <>
                    <span>Thu gọn</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Xem thêm {filteredEntranceBatches.length - INITIAL_VISIBLE_ENTRANCE_ROWS} đợt</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </section>
      )}

      {/* 7. CHỈ SỐ CHẤT LƯỢNG LỚP PHỤ TRÁCH (TÍN NHIỆM PHHS & KHẢO SÁT HỌC SINH) */}
      <TeacherClassKpiSpotlight />

      {/* 8. MOBILE FLOATING ACTION DOCK (THANH LỐI TẮT DÀNH CHO ĐIỆN THOẠI) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-2 flex items-center justify-around">
        {viewMode === "ADMIN" ? (
          <>
            <Link
              href="/teacher/du-gio?tab=overview_slots"
              className="flex flex-col items-center gap-1 p-1.5 text-slate-600 hover:text-[#00A19A] transition-colors"
            >
              <Eye className="w-5 h-5 text-amber-500" />
              <span className="text-[10px] font-bold">Dự giờ tổ</span>
            </Link>
            <Link
              href="/teacher/phan-tich-chat-luong"
              className="flex flex-col items-center gap-1 p-1.5 text-slate-600 hover:text-[#00A19A] transition-colors"
            >
              <BarChart3 className="w-5 h-5 text-[#00A19A]" />
              <span className="text-[10px] font-bold">Báo cáo CL</span>
            </Link>
            {(String((session?.user as any)?.role || "").toUpperCase().includes("KT") ||
              String(finalMetrics.managedDepartmentName || "").toUpperCase().includes("KT") ||
              String(finalMetrics.managedDepartmentName || "").toUpperCase().includes("ĐBCL") ||
              String(finalMetrics.managedDepartmentName || "").toUpperCase().includes("DBCL")) && (
              <Link
                href="/admin/weekly-reports"
                className="flex flex-col items-center gap-1 p-1.5 text-slate-600 hover:text-[#00A19A] transition-colors"
              >
                <ClipboardCheck className="w-5 h-5 text-emerald-500" />
                <span className="text-[10px] font-bold">BC Tuần KT</span>
              </Link>
            )}
            <Link
              href="/teacher/phan-cong-giang-day"
              className="flex flex-col items-center gap-1 p-1.5 text-slate-600 hover:text-[#00A19A] transition-colors"
            >
              <BookMarked className="w-5 h-5 text-sky-500" />
              <span className="text-[10px] font-bold">Phân công</span>
            </Link>
            <Link
              href="/teacher/ho-so-hoc-sinh"
              className="flex flex-col items-center gap-1 p-1.5 text-slate-600 hover:text-rose-600 transition-colors"
            >
              <Users className="w-5 h-5 text-teal-700" />
              <span className="text-[10px] font-bold">Hồ sơ HS</span>
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/teacher/so-diem-nhan-xet"
              className="flex flex-col items-center gap-1 p-1.5 text-slate-600 hover:text-[#00A19A] transition-colors"
            >
              <ClipboardCheck className="w-5 h-5 text-[#00A19A]" />
              <span className="text-[10px] font-bold">Sổ điểm</span>
            </Link>
            <Link
              href="/teacher/classes"
              className="flex flex-col items-center gap-1 p-1.5 text-slate-600 hover:text-[#00A19A] transition-colors"
            >
              <Users className="w-5 h-5 text-slate-500" />
              <span className="text-[10px] font-bold">Lớp CN</span>
            </Link>
            <Link
              href="/teacher/thoi-khoa-bieu"
              className="flex flex-col items-center gap-1 p-1.5 text-slate-600 hover:text-[#00A19A] transition-colors"
            >
              <CalendarDays className="w-5 h-5 text-slate-500" />
              <span className="text-[10px] font-bold">Lịch dạy</span>
            </Link>
            <Link
              href="/teacher/du-gio"
              className="flex flex-col items-center gap-1 p-1.5 text-slate-600 hover:text-[#00A19A] transition-colors"
            >
              <Eye className="w-5 h-5 text-amber-500" />
              <span className="text-[10px] font-bold">Dự giờ</span>
            </Link>
            <Link
              href="/teacher/ho-tro-hoc-tap"
              className="flex flex-col items-center gap-1 p-1.5 text-slate-600 hover:text-rose-600 transition-colors"
            >
              <Heart className="w-5 h-5 text-rose-500" />
              <span className="text-[10px] font-bold">Hỗ trợ HS</span>
            </Link>
          </>
        )}
      </div>

      </div>
    </>
  )
}
