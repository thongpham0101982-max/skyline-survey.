"use client"

import { useEffect, useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import {
  Users, Layers, BookOpen, CheckCircle2, Loader2, ArrowRight, Eye,
  TrendingUp, Calendar as CalendarIcon, GraduationCap, Compass, Sparkles, Heart,
  ShieldCheck, Clock, BarChart3, FileText, ClipboardCheck, BookMarked,
  CheckCircle, ChevronRight, Activity, Target, Search, X, KeyRound,
  LayoutGrid, AlertCircle, ArrowUpRight, Sparkle, CalendarDays
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
  iconBg: string
  iconColor: string
  badge?: string
  badgeStyle?: string
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

  // 6 Ergonomic KPI Metric Cards
  const statCards = [
    {
      id: "classes",
      label: "Lớp phụ trách",
      value: finalMetrics.totalClasses,
      unit: "lớp",
      subtext: "Lớp chủ nhiệm & bộ môn",
      icon: Layers,
      colorTheme: "from-teal-500/10 to-teal-500/5 text-teal-700 border-teal-200/80",
      iconContainer: "bg-teal-600 text-white shadow-teal-600/20",
      badge: "Đang giảng dạy",
      badgeClass: "bg-teal-50 text-teal-700 border-teal-200",
      href: "/teacher/classes"
    },
    {
      id: "students",
      label: "Tổng học sinh",
      value: totalStudents,
      unit: "học sinh",
      subtext: "Hồ sơ theo dõi 360°",
      icon: Users,
      colorTheme: "from-sky-500/10 to-sky-500/5 text-sky-700 border-sky-200/80",
      iconContainer: "bg-sky-600 text-white shadow-sky-600/20",
      badge: "Quản lý dữ liệu",
      badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
      href: "/teacher/ho-so-hoc-sinh"
    },
    {
      id: "assignments",
      label: "Phân công môn học",
      value: finalMetrics.totalAssignments,
      unit: "phân công",
      subtext: "Môn giảng dạy được giao",
      icon: BookOpen,
      colorTheme: "from-purple-500/10 to-purple-500/5 text-purple-700 border-purple-200/80",
      iconContainer: "bg-purple-600 text-white shadow-purple-600/20",
      badge: "Chuyên môn",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
      href: "/teacher/phan-cong-giang-day"
    },
    {
      id: "progress",
      label: "Tiến độ đánh giá",
      value: `${scoredPercent}%`,
      unit: "",
      subtext: `${scoredStudents}/${totalStudents} HS đã hoàn thành`,
      icon: CheckCircle2,
      colorTheme: "from-cyan-500/10 to-cyan-500/5 text-cyan-700 border-cyan-200/80",
      iconContainer: "bg-[#0A5C5A] text-white shadow-cyan-600/20",
      badge: scoredPercent === 100 ? "Hoàn thành" : "Đang tiến hành",
      badgeClass: scoredPercent === 100 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-cyan-50 text-cyan-700 border-cyan-200",
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
      colorTheme: "from-amber-500/10 to-amber-500/5 text-amber-700 border-amber-200/80",
      iconContainer: "bg-amber-600 text-white shadow-amber-600/20",
      badge: "Học kỳ này",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      href: "/teacher/du-gio"
    },
    {
      id: "remedial",
      label: "Cần bồi dưỡng",
      value: finalMetrics.remedialStudentsCount || 0,
      unit: "học sinh",
      subtext: "Học sinh cần chú ý & hỗ trợ",
      icon: Heart,
      colorTheme: "from-rose-500/10 to-rose-500/5 text-rose-700 border-rose-200/80",
      iconContainer: "bg-rose-500 text-white shadow-rose-500/20",
      badge: (finalMetrics.remedialStudentsCount || 0) > 0 ? "Cần chú ý" : "Ổn định",
      badgeClass: (finalMetrics.remedialStudentsCount || 0) > 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200",
      href: "/teacher/ho-tro-hoc-tap"
    }
  ]

  // All Action Workspace modules with rich metadata & keyword indexing
  const actionItems: ActionItem[] = [
    // --- Nhóm A: Công tác GVCN ---
    {
      id: "gvcn-classes",
      groupId: "GVCN",
      groupName: "Công tác GVCN",
      groupBadgeColor: "bg-teal-50 text-[#003B3A] border-teal-200",
      href: "/teacher/classes",
      title: "1. Lớp chủ nhiệm",
      desc: "Xem danh sách học sinh, sơ đồ chỗ ngồi lớp học và thông tin liên lạc học sinh - phụ huynh.",
      icon: Layers,
      iconBg: "bg-teal-500/10 border-teal-200 text-teal-700",
      iconColor: "text-teal-700",
      badge: "Chủ nhiệm",
      badgeStyle: "bg-teal-50 text-teal-700 border-teal-200",
      keywords: ["lớp", "chu nhiem", "lop chu nhiem", "so do", "danh sach", "hoc sinh"]
    },
    {
      id: "gvcn-nps",
      groupId: "GVCN",
      groupName: "Công tác GVCN",
      groupBadgeColor: "bg-teal-50 text-[#003B3A] border-teal-200",
      href: "/teacher/nps",
      title: "2. NPS & Khảo sát ý kiến",
      desc: "Theo dõi chỉ số đo lường độ hài lòng (NPS), đánh giá định kỳ và phản hồi từ phụ huynh.",
      icon: BarChart3,
      iconBg: "bg-emerald-500/10 border-emerald-200 text-emerald-700",
      iconColor: "text-emerald-700",
      badge: "Đo lường",
      badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200",
      keywords: ["nps", "khao sat", "y kien", "hai long", "phu huynh", "danh gia"]
    },
    {
      id: "gvcn-covan",
      groupId: "GVCN",
      groupName: "Công tác GVCN",
      groupBadgeColor: "bg-teal-50 text-[#003B3A] border-teal-200",
      href: "/teacher/co-van-hoc-tap",
      title: "3. Cố vấn Học tập & Check-in",
      desc: "Quản lý mục tiêu rèn luyện K1-K12, ghi nhật ký tham vấn học sinh và theo dõi cảnh báo SOS.",
      icon: Compass,
      iconBg: "bg-sky-500/10 border-sky-200 text-sky-700",
      iconColor: "text-sky-700",
      badge: "Mục tiêu K12",
      badgeStyle: "bg-sky-50 text-sky-700 border-sky-200",
      keywords: ["co van", "check-in", "nhat ky", "tham van", "canh bao", "muc tieu", "sos"]
    },
    {
      id: "gvcn-hoso",
      groupId: "GVCN",
      groupName: "Công tác GVCN",
      groupBadgeColor: "bg-teal-50 text-[#003B3A] border-teal-200",
      href: "/teacher/ho-so-hoc-sinh",
      title: "4. Hồ sơ Học sinh 360°",
      desc: "Tra cứu hồ sơ toàn diện 360°, điểm số các môn, phiếu mục tiêu, lịch sử tham vấn & xuất PDF.",
      icon: FileText,
      iconBg: "bg-blue-500/10 border-blue-200 text-blue-700",
      iconColor: "text-blue-700",
      badge: "Dữ liệu 360°",
      badgeStyle: "bg-blue-50 text-blue-700 border-blue-200",
      keywords: ["ho so", "360", "hoc sinh", "diem", "xuat pdf", "lich su", "tra cuu"]
    },
    {
      id: "gvcn-boiduong",
      groupId: "GVCN",
      groupName: "Công tác GVCN",
      groupBadgeColor: "bg-teal-50 text-[#003B3A] border-teal-200",
      href: "/teacher/ho-tro-hoc-tap",
      title: "5. Phụ đạo & Bồi dưỡng Học sinh",
      desc: "Đề xuất phụ đạo văn hóa, hỗ trợ tâm lý - học tập và theo dõi sát sao sự tiến bộ của từng em.",
      icon: Heart,
      iconBg: "bg-rose-500/10 border-rose-200 text-rose-700",
      iconColor: "text-rose-700",
      badge: "Hỗ trợ học tập",
      badgeStyle: "bg-rose-50 text-rose-700 border-rose-200",
      keywords: ["phu dao", "boi duong", "ho tro", "tam ly", "tien bo", "hoc tap", "can chu y"]
    },
    {
      id: "gvcn-huongnghiep",
      groupId: "GVCN",
      groupName: "Công tác GVCN",
      groupBadgeColor: "bg-teal-50 text-[#003B3A] border-teal-200",
      href: "/teacher/orientation",
      title: "6. Sổ theo dõi Hướng nghiệp",
      desc: "Cập nhật định hướng nghề nghiệp, kết quả trắc nghiệm năng khiếu và lộ trình phát triển bản thân.",
      icon: Target,
      iconBg: "bg-indigo-500/10 border-indigo-200 text-indigo-700",
      iconColor: "text-indigo-700",
      badge: "Định hướng",
      badgeStyle: "bg-indigo-50 text-indigo-700 border-indigo-200",
      keywords: ["huong nghiep", "dinh huong", "nghe nghiep", "nang khieu", "tu van"]
    },

    // --- Nhóm B: Công tác GVBM ---
    {
      id: "gvbm-khaosat",
      groupId: "GVBM",
      groupName: "Công tác GVBM",
      groupBadgeColor: "bg-indigo-50 text-indigo-900 border-indigo-200",
      href: "/teacher/input-assessments?type=general",
      title: "1. Khảo sát đầu vào",
      desc: "Nhập điểm và nhận xét đánh giá năng lực đầu vào học sinh mới (Tiểu học, THCS, THPT & Mầm non).",
      icon: TrendingUp,
      iconBg: "bg-cyan-500/10 border-cyan-200 text-cyan-700",
      iconColor: "text-cyan-700",
      badge: "Đầu vào",
      badgeStyle: "bg-cyan-50 text-cyan-700 border-cyan-200",
      keywords: ["khao sat", "dau vao", "danh gia", "mam non", "k12", "nhan xet"]
    },
    {
      id: "gvbm-dugio",
      groupId: "GVBM",
      groupName: "Công tác GVBM",
      groupBadgeColor: "bg-indigo-50 text-indigo-900 border-indigo-200",
      href: "/teacher/du-gio",
      title: "2. Dự giờ đánh giá Giáo viên",
      desc: "Đăng ký tiết dạy thao giảng, lập phiếu dự giờ chuyên môn đồng nghiệp và tổng hợp góp ý.",
      icon: Eye,
      iconBg: "bg-amber-500/10 border-amber-200 text-amber-700",
      iconColor: "text-amber-700",
      badge: "Dự giờ",
      badgeStyle: "bg-amber-50 text-amber-700 border-amber-200",
      keywords: ["du gio", "thao giang", "danh gia", "chuyen mon", "dong nghiep", "tiet day"]
    },
    {
      id: "gvbm-sodiem",
      groupId: "GVBM",
      groupName: "Công tác GVBM",
      groupBadgeColor: "bg-indigo-50 text-indigo-900 border-indigo-200",
      href: "/teacher/so-diem-nhan-xet",
      title: "3. Sổ điểm & Nhận xét môn học",
      desc: "Cập nhật bảng điểm kiểm tra thường xuyên, định kỳ và viết nhận xét quá trình học tập theo môn.",
      icon: ClipboardCheck,
      iconBg: "bg-emerald-500/10 border-emerald-200 text-emerald-700",
      iconColor: "text-emerald-700",
      badge: "Sổ điểm",
      badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200",
      keywords: ["so diem", "nhan xet", "mon hoc", "diem so", "kiem tra", "qua trinh"]
    },
    {
      id: "gvbm-trainghiem",
      groupId: "GVBM",
      groupName: "Công tác GVBM",
      groupBadgeColor: "bg-indigo-50 text-indigo-900 border-indigo-200",
      href: "/teacher/experiential-activities",
      title: "4. Hoạt động trải nghiệm",
      desc: "Quản lý bài thu hoạch hoạt động ngoại khóa, dự án trải nghiệm thực tế và đánh giá năng lực.",
      icon: GraduationCap,
      iconBg: "bg-purple-500/10 border-purple-200 text-purple-700",
      iconColor: "text-purple-700",
      badge: "Trải nghiệm",
      badgeStyle: "bg-purple-50 text-purple-700 border-purple-200",
      keywords: ["hoat dong", "trai nghiem", "ngoai khoa", "du an", "thu hoach"]
    },
    {
      id: "gvbm-phancong",
      groupId: "GVBM",
      groupName: "Công tác GVBM",
      groupBadgeColor: "bg-indigo-50 text-indigo-900 border-indigo-200",
      href: "/teacher/phan-cong-giang-day",
      title: "5. Phân công giảng dạy",
      desc: "Tra cứu danh sách môn giảng dạy được phân công, định mức số tiết và lớp học phụ trách.",
      icon: BookMarked,
      iconBg: "bg-violet-500/10 border-violet-200 text-violet-700",
      iconColor: "text-violet-700",
      badge: "Chuyên môn",
      badgeStyle: "bg-violet-50 text-violet-700 border-violet-200",
      keywords: ["phan cong", "giang day", "mon hoc", "tiet day", "dinh muc"]
    },

    // --- Nhóm C: Lịch & Tiện ích công tác ---
    {
      id: "util-tkb",
      groupId: "UTILITIES",
      groupName: "Lịch & Tiện ích",
      groupBadgeColor: "bg-slate-100 text-slate-800 border-slate-200",
      href: "/teacher/thoi-khoa-bieu",
      title: "1. Thời khóa biểu giảng dạy",
      desc: "Tra cứu lịch giảng dạy theo tuần, chi tiết từng tiết học, phòng học và thời gian biểu.",
      icon: CalendarDays,
      iconBg: "bg-teal-500/10 border-teal-200 text-teal-700",
      iconColor: "text-teal-700",
      badge: "Thời khóa biểu",
      badgeStyle: "bg-teal-50 text-teal-700 border-teal-200",
      keywords: ["thoi khoa bieu", "tkb", "lich giang day", "tiet hoc", "phong hoc", "tuan"]
    },
    {
      id: "util-bantin",
      groupId: "UTILITIES",
      groupName: "Lịch & Tiện ích",
      groupBadgeColor: "bg-slate-100 text-slate-800 border-slate-200",
      href: "/teacher/ban-tin-thong-bao",
      title: "2. Bản tin & Thông báo học vụ",
      desc: "Xem thông báo mới nhất từ Ban Giám hiệu, tổ chuyên môn và trao đổi học tập nội bộ.",
      icon: Activity,
      iconBg: "bg-sky-500/10 border-sky-200 text-sky-700",
      iconColor: "text-sky-700",
      badge: "Thông báo",
      badgeStyle: "bg-sky-50 text-sky-700 border-sky-200",
      keywords: ["ban tin", "thong bao", "hoc vu", "tin tuc", "bgh", "noi bo"]
    }
  ]

  // Filtered action items based on activeTab and searchQuery
  const filteredActions = useMemo(() => {
    return actionItems.filter((item) => {
      // Tab filter
      if (activeTab !== "ALL" && item.groupId !== activeTab) {
        return false
      }
      // Search filter
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
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-[#003B3A] via-[#48BFE3] to-emerald-400 shadow-xl text-white animate-pulse">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <div className="absolute -inset-2 rounded-3xl bg-[#48BFE3]/25 blur-lg -z-10 animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-slate-800 font-black text-sm tracking-wide uppercase">
            Đang tải dữ liệu tổng quan...
          </p>
          <p className="text-xs text-slate-400 font-medium">Hệ thống Sky-Line SQMS đang đồng bộ chỉ số thời gian thực</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-16 font-sans text-slate-800 max-w-7xl mx-auto">
      {/* 1. Modern Hero Greeting & Control Bar */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#003B3A] via-[#044c4b] to-[#0a5c5a] text-white shadow-lg p-5 sm:p-7 border border-teal-800/40">
        {/* Subtle Decorative Background Glows */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#48BFE3]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Avatar & Greeting */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#48BFE3] to-emerald-300 text-[#003B3A] font-black text-xl sm:text-2xl flex items-center justify-center shadow-md border-2 border-white/30">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-[#003B3A] flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-white" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white">
                  Xin chào, {userName}!
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#48BFE3]/20 text-[#72EFDD] border border-[#48BFE3]/40">
                  Giáo viên
                </span>
              </div>
              <p className="text-xs sm:text-sm text-teal-100/90 font-medium flex items-center gap-2">
                <span>Chúc Thầy/Cô một ngày làm việc hiệu quả và tràn đầy năng lượng!</span>
              </p>
            </div>
          </div>

          {/* Right: Date/Time + Academic Year Chip + Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto justify-start lg:justify-end">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white">
              <CalendarIcon className="w-4 h-4 text-[#72EFDD]" />
              <span className="font-semibold capitalize">{currentDateStr}</span>
              {currentTimeStr && (
                <span className="text-teal-200 border-l border-white/20 pl-2 font-mono text-[11px]">
                  {currentTimeStr}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white">
              <span className="text-teal-200 font-medium">Năm học:</span>
              <span className="font-bold text-[#80FFDB]">{activeAcademicYear}</span>
            </div>

            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all border border-white/20 flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              title="Đổi mật khẩu tài khoản"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-300" />
              <span>Đổi mật khẩu</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KPI Metrics Grid (6 Ergonomic Cards) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-5 rounded-full bg-[#003B3A]" />
            <h2 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
              Chỉ số Công tác & Đo lường Đánh giá
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Thời gian thực</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {statCards.map((card) => {
            const Icon = card.icon
            const CardWrapper = (
              <div className="group relative bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-[#48BFE3]/60 transition-all duration-300 flex flex-col justify-between h-full hover:-translate-y-0.5 overflow-hidden cursor-pointer">
                {/* Micro accent top glow on hover */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#48BFE3]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${card.badgeClass}`}>
                      {card.badge}
                    </span>
                    <div className={`w-8 h-8 rounded-xl ${card.iconContainer} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}>
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
                        <span className="text-[11px] font-semibold text-slate-400">
                          {card.unit}
                        </span>
                      )}
                    </div>
                  </div>

                  {card.progressBar !== undefined && (
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className="bg-gradient-to-r from-teal-500 to-[#48BFE3] h-full rounded-full transition-all duration-500"
                        style={{ width: `${card.progressBar}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate font-medium">{card.subtext}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#003B3A] group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
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

      {/* 3. Compact Attention & Quick Focus Strip */}
      {(finalMetrics.remedialStudentsCount || 0) > 0 && (
        <div className="bg-gradient-to-r from-rose-50/70 via-white to-amber-50/40 border border-rose-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/20 flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight">
                  Học sinh cần bồi dưỡng & theo dõi
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                  {finalMetrics.remedialStudentsCount} học sinh
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Giáo viên đang phụ trách {finalMetrics.remedialStudentsCount} học sinh trong danh sách bồi dưỡng & hỗ trợ học tập.
              </p>
            </div>
          </div>

          <Link
            href="/teacher/ho-tro-hoc-tap"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#003B3A] hover:bg-[#004D4A] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md shrink-0 active:scale-95 group"
          >
            <span>Mở danh sách hỗ trợ</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-[#80FFDB]" />
          </Link>
        </div>
      )}

      {/* 4. Interactive Action Hub ("DANH MỤC THAO TÁC CHUYÊN MÔN") */}
      <div className="space-y-4 pt-1">
        {/* Hub Header with Search and Tab Selector */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-5 rounded-full bg-[#48BFE3]" />
              <div>
                <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                  Danh mục Thao tác Chuyên môn
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Truy cập nhanh các nghiệp vụ chủ nhiệm, giảng dạy và tiện ích học vụ
                </p>
              </div>
            </div>

            {/* Fast Keyword Search Input */}
            <div className="relative w-full md:w-72 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm nhanh chức năng (điểm, dự giờ, hồ sơ...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#48BFE3]/40 focus:border-[#48BFE3] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tab Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "ALL"
                  ? "bg-[#003B3A] text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200/80 text-slate-600"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Tất cả ({actionItems.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("GVCN")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "GVCN"
                  ? "bg-[#003B3A] text-white shadow-sm"
                  : "bg-teal-50 hover:bg-teal-100/80 text-teal-800 border border-teal-200/60"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>A. Công tác GVCN (6)</span>
            </button>

            <button
              onClick={() => setActiveTab("GVBM")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "GVBM"
                  ? "bg-[#003B3A] text-white shadow-sm"
                  : "bg-indigo-50 hover:bg-indigo-100/80 text-indigo-800 border border-indigo-200/60"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>B. Công tác GVBM (5)</span>
            </button>

            <button
              onClick={() => setActiveTab("UTILITIES")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "UTILITIES"
                  ? "bg-[#003B3A] text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>C. Lịch & Tiện ích (2)</span>
            </button>
          </div>
        </div>

        {/* Action Cards Grid */}
        {filteredActions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredActions.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="group bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/85 hover:border-[#48BFE3]/60 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${item.groupBadgeColor}`}>
                          {item.groupName}
                        </span>
                        {item.badge && (
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${item.badgeStyle}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>

                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${item.iconBg} group-hover:scale-105 transition-transform duration-200`}>
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-[#003B3A] transition-colors flex items-center gap-1.5">
                        <span>{item.title}</span>
                      </h3>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3.5 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400 group-hover:text-[#003B3A] transition-colors">
                    <span>Mở chức năng</span>
                    <div className="w-6 h-6 rounded-lg bg-slate-50 group-hover:bg-[#003B3A] group-hover:text-white flex items-center justify-center transition-all">
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-700">
                Không tìm thấy chức năng phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-xs text-slate-400">
                Vui lòng thử tìm kiếm bằng từ khóa khác hoặc xóa bộ lọc.
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery("")
                setActiveTab("ALL")
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
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
