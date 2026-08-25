"use client"

import { useEffect, useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import {
  Users, Layers, BookOpen, CheckCircle2, Loader2, ArrowRight, Eye,
  TrendingUp, Calendar as CalendarIcon, GraduationCap, Compass, Sparkles, Heart,
  ShieldCheck, Clock, BarChart3, FileText, ClipboardCheck, BookMarked,
  CheckCircle, ChevronRight, Activity, Target, Search, X, KeyRound,
  LayoutGrid, AlertCircle, ArrowUpRight, Sparkle, CalendarDays, Zap,
  Flame, BookmarkCheck, Award, MessageSquareHeart
} from "lucide-react"
import { ChangePasswordModal } from "@/components/ChangePasswordModal"
import Link from "next/link"

interface MetricData {
  totalClasses: number
  totalStudents: number
  totalAssignments: number
  scoredStudents: number
  academicYearName: string
  totalObservedLessons?: number
  remedialStudentsCount?: number
}

interface ActionItem {
  id: string
  groupId: "GVCN" | "GVBM" | "UTILITIES"
  groupName: string
  groupBadgeColor: string
  href: string
  title: string
  desc: string
  icon: any
  gradientIcon: string
  iconShadow: string
  hoverBorder: string
  hoverGlow: string
  badge: string
  badgeStyle: string
  keywords: string[]
}

export default function TeacherDashboard() {
  const { data: session, status } = useSession()
  const [metrics, setMetrics] = useState<MetricData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentDateStr, setCurrentDateStr] = useState("")
  const [currentTimeStr, setCurrentTimeStr] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"ALL" | "GVCN" | "GVBM" | "UTILITIES">("ALL")
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)

  const userName = session?.user?.name || "Thầy/Cô"

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date()
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      }
      setCurrentDateStr(now.toLocaleDateString("vi-VN", dateOptions))
      setCurrentTimeStr(now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }))
    }

    updateDateTime()
    const timer = setInterval(updateDateTime, 30000)

    async function fetchMetrics() {
      try {
        setLoading(true)
        const yearId = typeof window !== "undefined"
          ? (localStorage.getItem("academicYearId") || localStorage.getItem("selectedAcademicYear") || "")
          : ""
        const r = await fetch(`/api/teacher-assessments?action=getDashboardMetrics&academicYearId=${yearId}`)
        if (r.ok) {
          const data = await r.json()
          setMetrics(data)
        }
      } catch (e) {
        console.error("Failed to load dashboard metrics:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()

    window.addEventListener("academicYearChanged", fetchMetrics)
    return () => {
      clearInterval(timer)
      window.removeEventListener("academicYearChanged", fetchMetrics)
    }
  }, [])

  const finalMetrics: MetricData = metrics || {
    totalClasses: 0,
    totalStudents: 0,
    totalAssignments: 0,
    scoredStudents: 0,
    academicYearName: "2026-2027",
    totalObservedLessons: 0,
    remedialStudentsCount: 0
  }

  const totalStudents = finalMetrics.totalStudents || 0
  const scoredStudents = finalMetrics.scoredStudents || 0
  const scoredPercent = totalStudents > 0
    ? Math.min(100, Math.round((scoredStudents / totalStudents) * 100))
    : 0

  const activeAcademicYear = finalMetrics.academicYearName || "2026-2027"

  // 6 High-Impact, Vibrant, Eye-Catching KPI Cards
  const statCards = [
    {
      id: "classes",
      label: "Lớp phụ trách",
      value: finalMetrics.totalClasses,
      unit: "lớp",
      subtext: "Lớp chủ nhiệm & bộ môn",
      icon: Layers,
      cardBg: "bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-white",
      topAccent: "from-teal-500 via-emerald-400 to-teal-600",
      iconGradient: "bg-gradient-to-tr from-teal-600 to-emerald-400 text-white shadow-teal-500/30",
      borderHover: "hover:border-teal-400 hover:shadow-teal-500/15",
      badge: "Đang giảng dạy",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold",
      href: "/teacher/classes"
    },
    {
      id: "students",
      label: "Tổng học sinh",
      value: totalStudents,
      unit: "học sinh",
      subtext: "Hồ sơ theo dõi 360°",
      icon: Users,
      cardBg: "bg-gradient-to-br from-sky-500/10 via-blue-500/5 to-white",
      topAccent: "from-sky-500 via-blue-500 to-cyan-400",
      iconGradient: "bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-sky-500/30",
      borderHover: "hover:border-sky-400 hover:shadow-sky-500/15",
      badge: "Quản lý dữ liệu",
      badgeClass: "bg-sky-100 text-sky-800 border-sky-300 font-bold",
      href: "/teacher/ho-so-hoc-sinh"
    },
    {
      id: "assignments",
      label: "Phân công môn",
      value: finalMetrics.totalAssignments,
      unit: "môn học",
      subtext: "Môn giảng dạy được giao",
      icon: BookOpen,
      cardBg: "bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-white",
      topAccent: "from-purple-500 via-fuchsia-500 to-indigo-500",
      iconGradient: "bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-purple-500/30",
      borderHover: "hover:border-purple-400 hover:shadow-purple-500/15",
      badge: "Chuyên môn",
      badgeClass: "bg-purple-100 text-purple-800 border-purple-300 font-bold",
      href: "/teacher/phan-cong-giang-day"
    },
    {
      id: "progress",
      label: "Tiến độ đánh giá",
      value: `${scoredPercent}%`,
      unit: "",
      subtext: `${scoredStudents}/${totalStudents} HS đã hoàn thành`,
      icon: CheckCircle2,
      cardBg: "bg-gradient-to-br from-cyan-500/10 via-teal-500/5 to-white",
      topAccent: "from-[#003B3A] via-[#48BFE3] to-emerald-400",
      iconGradient: "bg-gradient-to-tr from-[#003B3A] via-[#0A5C5A] to-cyan-500 text-white shadow-cyan-500/30",
      borderHover: "hover:border-cyan-400 hover:shadow-cyan-500/15",
      badge: scoredPercent === 100 ? "Hoàn thành" : "Đang tiến hành",
      badgeClass: scoredPercent === 100 ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold" : "bg-cyan-100 text-cyan-800 border-cyan-300 font-bold",
      progressBar: scoredPercent,
      href: "/teacher/input-assessments?type=general"
    },
    {
      id: "observations",
      label: "Tiết dự giờ",
      value: finalMetrics.totalObservedLessons || 0,
      unit: "tiết",
      subtext: "Phiếu dự giờ chuyên môn",
      icon: Eye,
      cardBg: "bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-white",
      topAccent: "from-amber-500 via-orange-400 to-yellow-500",
      iconGradient: "bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-amber-500/30",
      borderHover: "hover:border-amber-400 hover:shadow-amber-500/15",
      badge: "Học kỳ này",
      badgeClass: "bg-amber-100 text-amber-900 border-amber-300 font-bold",
      href: "/teacher/du-gio"
    },
    {
      id: "remedial",
      label: "Cần bồi dưỡng",
      value: finalMetrics.remedialStudentsCount || 0,
      unit: "học sinh",
      subtext: "Cần chú ý & hỗ trợ",
      icon: Heart,
      cardBg: "bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-white",
      topAccent: "from-rose-500 via-pink-500 to-red-500",
      iconGradient: "bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-rose-500/30",
      borderHover: "hover:border-rose-400 hover:shadow-rose-500/15",
      badge: (finalMetrics.remedialStudentsCount || 0) > 0 ? "Cần chú ý" : "Ổn định",
      badgeClass: (finalMetrics.remedialStudentsCount || 0) > 0 ? "bg-rose-100 text-rose-800 border-rose-300 font-bold" : "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold",
      href: "/teacher/ho-tro-hoc-tap"
    }
  ]

  // Fast Shortcuts for Everyday Teacher Tasks
  const quickShortcuts = [
    { title: "Nhập điểm môn", href: "/teacher/so-diem-nhan-xet", icon: ClipboardCheck, color: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200" },
    { title: "Đăng ký dự giờ", href: "/teacher/du-gio", icon: Eye, color: "text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200" },
    { title: "Hồ sơ HS 360°", href: "/teacher/ho-so-hoc-sinh", icon: FileText, color: "text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200" },
    { title: "Thời khóa biểu", href: "/teacher/thoi-khoa-bieu", icon: CalendarDays, color: "text-teal-700 bg-teal-50 hover:bg-teal-100 border-teal-200" },
    { title: "Hỗ trợ học tập", href: "/teacher/ho-tro-hoc-tap", icon: Heart, color: "text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200" },
  ]

  // All Action Workspace modules with rich metadata & keyword indexing
  const actionItems: ActionItem[] = [
    // --- Nhóm A: Công tác GVCN ---
    {
      id: "gvcn-classes",
      groupId: "GVCN",
      groupName: "A. Công tác GVCN",
      groupBadgeColor: "bg-teal-100 text-teal-900 border-teal-300",
      href: "/teacher/classes",
      title: "1. Lớp chủ nhiệm",
      desc: "Xem danh sách học sinh, sơ đồ chỗ ngồi lớp học và thông tin liên lạc học sinh - phụ huynh.",
      icon: Layers,
      gradientIcon: "bg-gradient-to-tr from-teal-600 to-emerald-400 text-white",
      iconShadow: "shadow-teal-500/25",
      hoverBorder: "hover:border-teal-400",
      hoverGlow: "hover:shadow-teal-500/10",
      badge: "Chủ nhiệm",
      badgeStyle: "bg-teal-50 text-teal-800 border-teal-200",
      keywords: ["lớp", "chu nhiem", "lop chu nhiem", "so do", "danh sach", "hoc sinh"]
    },
    {
      id: "gvcn-nps",
      groupId: "GVCN",
      groupName: "A. Công tác GVCN",
      groupBadgeColor: "bg-teal-100 text-teal-900 border-teal-300",
      href: "/teacher/nps",
      title: "2. NPS & Khảo sát ý kiến",
      desc: "Theo dõi chỉ số đo lường độ hài lòng (NPS), đánh giá định kỳ và phản hồi từ phụ huynh.",
      icon: BarChart3,
      gradientIcon: "bg-gradient-to-tr from-emerald-600 to-teal-400 text-white",
      iconShadow: "shadow-emerald-500/25",
      hoverBorder: "hover:border-emerald-400",
      hoverGlow: "hover:shadow-emerald-500/10",
      badge: "Đo lường",
      badgeStyle: "bg-emerald-50 text-emerald-800 border-emerald-200",
      keywords: ["nps", "khao sat", "y kien", "hai long", "phu huynh", "danh gia"]
    },
    {
      id: "gvcn-covan",
      groupId: "GVCN",
      groupName: "A. Công tác GVCN",
      groupBadgeColor: "bg-teal-100 text-teal-900 border-teal-300",
      href: "/teacher/co-van-hoc-tap",
      title: "3. Cố vấn Học tập & Check-in",
      desc: "Quản lý mục tiêu rèn luyện K1-K12, ghi nhật ký tham vấn học sinh và theo dõi cảnh báo SOS.",
      icon: Compass,
      gradientIcon: "bg-gradient-to-tr from-[#003B3A] via-[#48BFE3] to-sky-400 text-white",
      iconShadow: "shadow-cyan-500/25",
      hoverBorder: "hover:border-cyan-400",
      hoverGlow: "hover:shadow-cyan-500/10",
      badge: "Mục tiêu K12",
      badgeStyle: "bg-cyan-50 text-cyan-800 border-cyan-200",
      keywords: ["co van", "check-in", "nhat ky", "tham van", "canh bao", "muc tieu", "sos"]
    },
    {
      id: "gvcn-hoso",
      groupId: "GVCN",
      groupName: "A. Công tác GVCN",
      groupBadgeColor: "bg-teal-100 text-teal-900 border-teal-300",
      href: "/teacher/ho-so-hoc-sinh",
      title: "4. Hồ sơ Học sinh 360°",
      desc: "Tra cứu hồ sơ toàn diện 360°, điểm số các môn, phiếu mục tiêu, lịch sử tham vấn & xuất PDF.",
      icon: FileText,
      gradientIcon: "bg-gradient-to-tr from-blue-600 to-sky-400 text-white",
      iconShadow: "shadow-blue-500/25",
      hoverBorder: "hover:border-blue-400",
      hoverGlow: "hover:shadow-blue-500/10",
      badge: "Dữ liệu 360°",
      badgeStyle: "bg-blue-50 text-blue-800 border-blue-200",
      keywords: ["ho so", "360", "hoc sinh", "diem", "xuat pdf", "lich su", "tra cuu"]
    },
    {
      id: "gvcn-boiduong",
      groupId: "GVCN",
      groupName: "A. Công tác GVCN",
      groupBadgeColor: "bg-teal-100 text-teal-900 border-teal-300",
      href: "/teacher/ho-tro-hoc-tap",
      title: "5. Phụ đạo & Bồi dưỡng Học sinh",
      desc: "Đề xuất phụ đạo văn hóa, hỗ trợ tâm lý - học tập và theo dõi sát sao sự tiến bộ của từng em.",
      icon: Heart,
      gradientIcon: "bg-gradient-to-tr from-rose-500 to-pink-500 text-white",
      iconShadow: "shadow-rose-500/25",
      hoverBorder: "hover:border-rose-400",
      hoverGlow: "hover:shadow-rose-500/10",
      badge: "Hỗ trợ học tập",
      badgeStyle: "bg-rose-50 text-rose-800 border-rose-200",
      keywords: ["phu dao", "boi duong", "ho tro", "tam ly", "tien bo", "hoc tap", "can chu y"]
    },
    {
      id: "gvcn-huongnghiep",
      groupId: "GVCN",
      groupName: "A. Công tác GVCN",
      groupBadgeColor: "bg-teal-100 text-teal-900 border-teal-300",
      href: "/teacher/orientation",
      title: "6. Sổ theo dõi Hướng nghiệp",
      desc: "Cập nhật định hướng nghề nghiệp, kết quả trắc nghiệm năng khiếu và lộ trình phát triển bản thân.",
      icon: Target,
      gradientIcon: "bg-gradient-to-tr from-indigo-600 to-purple-400 text-white",
      iconShadow: "shadow-indigo-500/25",
      hoverBorder: "hover:border-indigo-400",
      hoverGlow: "hover:shadow-indigo-500/10",
      badge: "Định hướng",
      badgeStyle: "bg-indigo-50 text-indigo-800 border-indigo-200",
      keywords: ["huong nghiep", "dinh huong", "nghe nghiep", "nang khieu", "tu van"]
    },

    // --- Nhóm B: Công tác GVBM ---
    {
      id: "gvbm-khaosat",
      groupId: "GVBM",
      groupName: "B. Công tác GVBM",
      groupBadgeColor: "bg-indigo-100 text-indigo-900 border-indigo-300",
      href: "/teacher/input-assessments?type=general",
      title: "1. Khảo sát đầu vào",
      desc: "Nhập điểm và nhận xét đánh giá năng lực đầu vào học sinh mới (Tiểu học, THCS, THPT & Mầm non).",
      icon: TrendingUp,
      gradientIcon: "bg-gradient-to-tr from-cyan-600 to-teal-400 text-white",
      iconShadow: "shadow-cyan-500/25",
      hoverBorder: "hover:border-cyan-400",
      hoverGlow: "hover:shadow-cyan-500/10",
      badge: "Đầu vào",
      badgeStyle: "bg-cyan-50 text-cyan-800 border-cyan-200",
      keywords: ["khao sat", "dau vao", "danh gia", "mam non", "k12", "nhan xet"]
    },
    {
      id: "gvbm-dugio",
      groupId: "GVBM",
      groupName: "B. Công tác GVBM",
      groupBadgeColor: "bg-indigo-100 text-indigo-900 border-indigo-300",
      href: "/teacher/du-gio",
      title: "2. Dự giờ đánh giá Giáo viên",
      desc: "Đăng ký tiết dạy thao giảng, lập phiếu dự giờ chuyên môn đồng nghiệp và tổng hợp góp ý.",
      icon: Eye,
      gradientIcon: "bg-gradient-to-tr from-amber-500 to-orange-500 text-white",
      iconShadow: "shadow-amber-500/25",
      hoverBorder: "hover:border-amber-400",
      hoverGlow: "hover:shadow-amber-500/10",
      badge: "Dự giờ",
      badgeStyle: "bg-amber-50 text-amber-900 border-amber-200",
      keywords: ["du gio", "thao giang", "danh gia", "chuyen mon", "dong nghiep", "tiet day"]
    },
    {
      id: "gvbm-sodiem",
      groupId: "GVBM",
      groupName: "B. Công tác GVBM",
      groupBadgeColor: "bg-indigo-100 text-indigo-900 border-indigo-300",
      href: "/teacher/so-diem-nhan-xet",
      title: "3. Sổ điểm & Nhận xét môn học",
      desc: "Cập nhật bảng điểm kiểm tra thường xuyên, định kỳ và viết nhận xét quá trình học tập theo môn.",
      icon: ClipboardCheck,
      gradientIcon: "bg-gradient-to-tr from-emerald-600 to-green-400 text-white",
      iconShadow: "shadow-emerald-500/25",
      hoverBorder: "hover:border-emerald-400",
      hoverGlow: "hover:shadow-emerald-500/10",
      badge: "Sổ điểm",
      badgeStyle: "bg-emerald-50 text-emerald-800 border-emerald-200",
      keywords: ["so diem", "nhan xet", "mon hoc", "diem so", "kiem tra", "qua trinh"]
    },
    {
      id: "gvbm-trainghiem",
      groupId: "GVBM",
      groupName: "B. Công tác GVBM",
      groupBadgeColor: "bg-indigo-100 text-indigo-900 border-indigo-300",
      href: "/teacher/experiential-activities",
      title: "4. Hoạt động trải nghiệm",
      desc: "Quản lý bài thu hoạch hoạt động ngoại khóa, dự án trải nghiệm thực tế và đánh giá năng lực.",
      icon: GraduationCap,
      gradientIcon: "bg-gradient-to-tr from-purple-600 to-pink-500 text-white",
      iconShadow: "shadow-purple-500/25",
      hoverBorder: "hover:border-purple-400",
      hoverGlow: "hover:shadow-purple-500/10",
      badge: "Trải nghiệm",
      badgeStyle: "bg-purple-50 text-purple-800 border-purple-200",
      keywords: ["hoat dong", "trai nghiem", "ngoai khoa", "du an", "thu hoach"]
    },
    {
      id: "gvbm-phancong",
      groupId: "GVBM",
      groupName: "B. Công tác GVBM",
      groupBadgeColor: "bg-indigo-100 text-indigo-900 border-indigo-300",
      href: "/teacher/phan-cong-giang-day",
      title: "5. Phân công giảng dạy",
      desc: "Tra cứu danh sách môn giảng dạy được phân công, định mức số tiết và lớp học phụ trách.",
      icon: BookMarked,
      gradientIcon: "bg-gradient-to-tr from-violet-600 to-indigo-500 text-white",
      iconShadow: "shadow-violet-500/25",
      hoverBorder: "hover:border-violet-400",
      hoverGlow: "hover:shadow-violet-500/10",
      badge: "Chuyên môn",
      badgeStyle: "bg-violet-50 text-violet-800 border-violet-200",
      keywords: ["phan cong", "giang day", "mon hoc", "tiet day", "dinh muc"]
    },

    // --- Nhóm C: Lịch & Tiện ích công tác ---
    {
      id: "util-tkb",
      groupId: "UTILITIES",
      groupName: "C. Lịch & Tiện ích",
      groupBadgeColor: "bg-teal-100 text-teal-900 border-teal-300",
      href: "/teacher/thoi-khoa-bieu",
      title: "1. Thời khóa biểu giảng dạy",
      desc: "Tra cứu lịch giảng dạy theo tuần, chi tiết từng tiết học, phòng học và thời gian biểu.",
      icon: CalendarDays,
      gradientIcon: "bg-gradient-to-tr from-teal-600 to-cyan-500 text-white",
      iconShadow: "shadow-teal-500/25",
      hoverBorder: "hover:border-teal-400",
      hoverGlow: "hover:shadow-teal-500/10",
      badge: "Thời khóa biểu",
      badgeStyle: "bg-teal-50 text-teal-800 border-teal-200",
      keywords: ["thoi khoa bieu", "tkb", "lich giang day", "tiet hoc", "phong hoc", "tuan"]
    },
    {
      id: "util-bantin",
      groupId: "UTILITIES",
      groupName: "C. Lịch & Tiện ích",
      groupBadgeColor: "bg-sky-100 text-sky-900 border-sky-300",
      href: "/teacher/ban-tin-thong-bao",
      title: "2. Bản tin & Thông báo học vụ",
      desc: "Xem thông báo mới nhất từ Ban Giám hiệu, tổ chuyên môn và trao đổi học tập nội bộ.",
      icon: Activity,
      gradientIcon: "bg-gradient-to-tr from-sky-600 to-blue-500 text-white",
      iconShadow: "shadow-sky-500/25",
      hoverBorder: "hover:border-sky-400",
      hoverGlow: "hover:shadow-sky-500/10",
      badge: "Thông báo",
      badgeStyle: "bg-sky-50 text-sky-800 border-sky-200",
      keywords: ["ban tin", "thong bao", "hoc vu", "tin tuc", "bgh", "noi bo"]
    }
  ]

  // Filtered action items based on activeTab and searchQuery
  const filteredActions = useMemo(() => {
    return actionItems.filter((item) => {
      if (activeTab !== "ALL" && item.groupId !== activeTab) {
        return false
      }
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        item.title.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        item.groupName.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.includes(q))
      )
    })
  }, [actionItems, activeTab, searchQuery])

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] space-y-5 font-sans">
        <div className="relative">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center bg-gradient-to-tr from-[#003B3A] via-[#48BFE3] to-emerald-400 shadow-xl text-white animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <div className="absolute -inset-3 rounded-3xl bg-[#48BFE3]/30 blur-xl -z-10 animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-slate-800 font-black text-sm tracking-wide uppercase">
            Đang tải dữ liệu tổng quan...
          </p>
          <p className="text-xs text-slate-400 font-medium">Hệ thống Sky-Line SQMS đang đồng bộ dữ liệu thời gian thực</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-16 font-sans text-slate-800 max-w-7xl mx-auto">
      {/* 1. Ultra-Premium Vibrant Hero Greeting Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#003B3A] via-[#0D5C58] to-[#123E67] text-white shadow-xl p-5 sm:p-7 border border-teal-400/20">
        {/* Colorful Animated Ambient Glows */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-br from-[#48BFE3]/30 to-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-gradient-to-tr from-purple-500/20 to-teal-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Avatar & Greeting */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative shrink-0 group">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#80FFDB] via-[#48BFE3] to-emerald-400 text-[#003B3A] font-black text-xl sm:text-2xl flex items-center justify-center shadow-lg shadow-teal-900/30 border-2 border-white/40 group-hover:scale-105 transition-transform duration-300">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-[#003B3A] flex items-center justify-center shadow-sm">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white drop-shadow-xs">
                  Xin chào, {userName}!
                </h1>
                <span className="px-3 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-[#48BFE3]/25 to-emerald-400/25 text-[#80FFDB] border border-[#48BFE3]/40 shadow-xs">
                  ✨ Giáo viên
                </span>
              </div>
              <p className="text-xs sm:text-sm text-teal-100/90 font-medium flex items-center gap-2">
                <span>Chúc Thầy/Cô một ngày làm việc tràn đầy cảm hứng và hiệu quả cao!</span>
              </p>
            </div>
          </div>

          {/* Right: Date/Time + Academic Year Chip + Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto justify-start lg:justify-end">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/12 backdrop-blur-md border border-white/20 text-xs text-white shadow-xs">
              <CalendarIcon className="w-4 h-4 text-[#80FFDB]" />
              <span className="font-semibold capitalize">{currentDateStr}</span>
              {currentTimeStr && (
                <span className="text-[#80FFDB] border-l border-white/20 pl-2 font-mono text-[11px] font-bold">
                  {currentTimeStr}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 backdrop-blur-md border border-emerald-400/30 text-xs text-white shadow-xs">
              <span className="text-teal-200 font-medium">Năm học:</span>
              <span className="font-black text-[#80FFDB] tracking-wide">{activeAcademicYear}</span>
            </div>

            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400/20 to-orange-400/20 hover:from-amber-400/30 hover:to-orange-400/30 text-white text-xs font-bold transition-all border border-amber-300/40 flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer backdrop-blur-md"
              title="Đổi mật khẩu tài khoản"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-300" />
              <span>Đổi mật khẩu</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. 6 High-Impact Vibrant KPI Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-6 rounded-full bg-gradient-to-b from-[#003B3A] to-[#48BFE3]" />
            <h2 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
              Chỉ số Công tác & Đo lường Đánh giá
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Cập nhật thời gian thực</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {statCards.map((card) => {
            const Icon = card.icon
            const CardWrapper = (
              <div className={`group relative ${card.cardBg} rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:shadow-xl ${card.borderHover} transition-all duration-300 flex flex-col justify-between h-full hover:-translate-y-1 overflow-hidden cursor-pointer`}>
                {/* Top Glowing Color Accent Bar */}
                <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${card.topAccent}`} />

                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] border shadow-2xs ${card.badgeClass}`}>
                      {card.badge}
                    </span>
                    <div className={`w-9 h-9 rounded-xl ${card.iconGradient} flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tight line-clamp-1">
                      {card.label}
                    </p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        {card.value}
                      </span>
                      {card.unit && (
                        <span className="text-[11px] font-bold text-slate-400">
                          {card.unit}
                        </span>
                      )}
                    </div>
                  </div>

                  {card.progressBar !== undefined && (
                    <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden mt-1 p-0.5">
                      <div
                        className="bg-gradient-to-r from-[#003B3A] via-[#48BFE3] to-emerald-400 h-full rounded-full transition-all duration-700 shadow-xs"
                        style={{ width: `${card.progressBar}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600 font-medium">
                  <span className="truncate">{card.subtext}</span>
                  <div className="w-5 h-5 rounded-full bg-white/80 border border-slate-200 flex items-center justify-center group-hover:bg-[#003B3A] group-hover:border-[#003B3A] group-hover:text-white transition-all shrink-0 ml-1 shadow-2xs">
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            )

            if (card.href) {
              return (
                <Link key={card.id} href={card.href} className="block h-full">
                  {CardWrapper}
                </Link>
              )
            }
            return <div key={card.id} className="h-full">{CardWrapper}</div>
          })}
        </div>
      </div>

      {/* 3. Everyday Quick Actions Toolbar */}
      <div className="bg-gradient-to-r from-slate-50 via-teal-50/40 to-sky-50/40 rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#003B3A] to-[#48BFE3] text-white flex items-center justify-center shadow-xs">
            <Zap className="w-4 h-4 text-[#80FFDB]" />
          </div>
          <span>Lối tắt Tác vụ nhanh:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {quickShortcuts.map((sc, i) => {
            const ScIcon = sc.icon
            return (
              <Link
                key={i}
                href={sc.href}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-2xs hover:shadow-sm hover:-translate-y-0.5 active:scale-95 ${sc.color}`}
              >
                <ScIcon className="w-3.5 h-3.5" />
                <span>{sc.title}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* 4. Attention & Focus Card (Học sinh cần bồi dưỡng & theo dõi) */}
      {(finalMetrics.remedialStudentsCount || 0) > 0 && (
        <div className="relative overflow-hidden bg-gradient-to-r from-rose-500/10 via-pink-500/5 to-amber-500/10 border-2 border-rose-300/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-pink-400 text-white shadow-lg shadow-rose-500/30 flex items-center justify-center shrink-0">
              <Heart className="w-6 h-6 animate-pulse text-white" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">
                  Học sinh cần bồi dưỡng & theo dõi
                </span>
                <span className="px-3 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                  {finalMetrics.remedialStudentsCount} học sinh
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 font-medium">
                Thầy/Cô đang phụ trách <strong className="text-rose-700">{finalMetrics.remedialStudentsCount} học sinh</strong> trong danh sách bồi dưỡng văn hóa & hỗ trợ học tập cần theo dõi định kỳ.
              </p>
            </div>
          </div>

          <Link
            href="/teacher/ho-tro-hoc-tap"
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-[#003B3A] to-[#0A5C5A] hover:from-[#004D4A] hover:to-[#0C6E6B] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 shrink-0 active:scale-95 group relative z-10"
          >
            <span>Quản lý danh sách hỗ trợ</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-[#80FFDB]" />
          </Link>
        </div>
      )}

      {/* 5. Interactive Action Hub ("DANH MỤC THAO TÁC CHUYÊN MÔN") */}
      <div className="space-y-4 pt-1">
        {/* Hub Header with Search and Tab Selector */}
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-7 rounded-full bg-gradient-to-b from-[#003B3A] via-[#48BFE3] to-emerald-400" />
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider">
                  Danh mục Thao tác Chuyên môn
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Truy cập tức thì các phân hệ quản lý chủ nhiệm, chuyên môn giảng dạy và tiện ích học vụ
                </p>
              </div>
            </div>

            {/* Fast Keyword Search Input */}
            <div className="relative w-full md:w-80 shrink-0">
              <Search className="w-4 h-4 text-[#48BFE3] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm nhanh chức năng (điểm, dự giờ, hồ sơ...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#48BFE3]/50 focus:border-[#48BFE3] focus:bg-white transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Tab Filter Buttons with Vibrant Accents */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-3 border-t border-slate-100">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                activeTab === "ALL"
                  ? "bg-gradient-to-r from-[#003B3A] to-[#0A5C5A] text-white shadow-md shadow-teal-900/20"
                  : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/80"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Tất cả ({actionItems.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("GVCN")}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                activeTab === "GVCN"
                  ? "bg-gradient-to-r from-teal-700 to-emerald-600 text-white shadow-md shadow-teal-700/20"
                  : "bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>A. Công tác GVCN (6)</span>
            </button>

            <button
              onClick={() => setActiveTab("GVBM")}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                activeTab === "GVBM"
                  ? "bg-gradient-to-r from-indigo-700 to-purple-600 text-white shadow-md shadow-indigo-700/20"
                  : "bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>B. Công tác GVBM (5)</span>
            </button>

            <button
              onClick={() => setActiveTab("UTILITIES")}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                activeTab === "UTILITIES"
                  ? "bg-gradient-to-r from-sky-700 to-blue-600 text-white shadow-md shadow-sky-700/20"
                  : "bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>C. Lịch & Tiện ích (2)</span>
            </button>
          </div>
        </div>

        {/* Action Cards Grid — Vibrant, High-Contrast & Beautiful */}
        {filteredActions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredActions.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`group bg-white rounded-3xl p-5 border border-slate-200/90 ${item.hoverBorder} shadow-xs hover:shadow-xl ${item.hoverGlow} hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between cursor-pointer relative overflow-hidden`}
                >
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border shadow-2xs ${item.groupBadgeColor}`}>
                          {item.groupName}
                        </span>
                        {item.badge && (
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border shadow-2xs ${item.badgeStyle}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>

                      <div className={`w-11 h-11 rounded-2xl ${item.gradientIcon} ${item.iconShadow} flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-[#003B3A] transition-colors flex items-center gap-1.5">
                        <span>{item.title}</span>
                      </h3>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-2">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-slate-400 group-hover:text-[#003B3A] transition-colors">
                    <span>Mở chức năng</span>
                    <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-[#003B3A] group-hover:text-white flex items-center justify-center transition-all shadow-2xs">
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
              <Search className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold text-slate-800">
                Không tìm thấy chức năng phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-xs text-slate-400">
                Vui lòng thử tìm kiếm bằng từ khóa khác hoặc bấm nút bên dưới để xem tất cả.
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery("")
                setActiveTab("ALL")
              }}
              className="px-5 py-2.5 rounded-2xl bg-[#003B3A] hover:bg-[#004D4A] text-xs font-bold text-white transition-all inline-flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Xóa bộ lọc tìm kiếm</span>
            </button>
          </div>
        )}
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  )
}
