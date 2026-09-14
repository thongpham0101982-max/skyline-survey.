"use client"

import React, { useEffect, useState, useMemo, useCallback } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import {
  Users,
  Layers,
  BookOpen,
  CheckCircle2,
  Loader2,
  Eye,
  TrendingUp,
  GraduationCap,
  Heart,
  FileText,
  ClipboardCheck,
  BookMarked,
  Target,
  Search,
  KeyRound,
  CalendarDays,
  ChevronRight,
  RefreshCw,
  BarChart3,
  Home,
  ClipboardList,
  Settings,
  Sprout
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ChangePasswordModal } from "@/components/ChangePasswordModal"
import { UserWelcomeCard } from "@/components/UserWelcomeCard"

interface MetricData {
  totalClasses: number
  totalStudents: number
  totalAssignments: number
  scoredStudents: number
  academicYearName: string
  totalObservedLessons?: number
  remedialStudentsCount?: number
}

interface ActionCard {
  id: string
  groupId: "GVCN" | "GVBM" | "UTILITIES"
  groupName: string
  title: string
  desc: string
  href: string
  icon: React.ElementType
  badgeText: string
  badgeVariant?: "default" | "skyline" | "accent" | "success" | "secondary"
}

export default function TeacherDashboard() {
  const { data: session } = useSession()
  const [metrics, setMetrics] = useState<MetricData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"ALL" | "GVCN" | "GVBM" | "UTILITIES">("ALL")
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [currentDateStr, setCurrentDateStr] = useState("")

  const userName = session?.user?.name || "Thầy/Cô"
  const userInitial = userName.charAt(0).toUpperCase()

  const updateDateTime = useCallback(() => {
    const now = new Date()
    const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"]
    const dayName = days[now.getDay()]
    const date = now.getDate()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const hours = String(now.getHours()).padStart(2, "0")
    const minutes = String(now.getMinutes()).padStart(2, "0")
    setCurrentDateStr(`${dayName}, ngày ${date} Tháng ${month}, ${year} ${hours}:${minutes}`)
  }, [])

  const fetchMetrics = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
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

  const actionItems: ActionCard[] = [
    {
      id: "gvcn-classes",
      groupId: "GVCN",
      groupName: "Công tác Chủ nhiệm",
      title: "Lớp Chủ nhiệm",
      desc: "Theo dõi sĩ số, danh sách học sinh, ban cán sự và báo cáo chuyên cần lớp phụ trách.",
      href: "/teacher/classes",
      icon: Users,
      badgeText: "GVCN",
      badgeVariant: "skyline"
    },
    {
      id: "gvcn-records",
      groupId: "GVCN",
      groupName: "Công tác Chủ nhiệm",
      title: "Hồ sơ học tập HS",
      desc: "Tra cứu toàn diện thông tin học sinh, lịch sử học tập, khen thưởng, kỷ luật và xuất phiếu PDF.",
      href: "/teacher/ho-so-hoc-sinh",
      icon: BookOpen,
      badgeText: "Dữ liệu 360°",
      badgeVariant: "default"
    },
    {
      id: "gvcn-remedial",
      groupId: "GVCN",
      groupName: "Công tác Chủ nhiệm",
      title: "Phụ đạo & Bồi dưỡng",
      desc: "Lập danh sách học sinh cần phụ đạo văn hóa, hỗ trợ tâm lý và theo dõi tiến độ cải thiện.",
      href: "/teacher/ho-tro-hoc-tap",
      icon: Heart,
      badgeText: "Hỗ trợ học tập",
      badgeVariant: "accent"
    },
    {
      id: "gvcn-orientation",
      groupId: "GVCN",
      groupName: "Công tác Chủ nhiệm",
      title: "Sổ theo dõi Hướng nghiệp",
      desc: "Cập nhật định hướng nghề nghiệp, kết quả trắc nghiệm tính cách và tư vấn phân ban.",
      href: "/teacher/orientation",
      icon: Target,
      badgeText: "Hướng nghiệp",
      badgeVariant: "secondary"
    },
    {
      id: "gvbm-grading",
      groupId: "GVBM",
      groupName: "Chuyên môn Bộ môn",
      title: "Sổ điểm & Nhận xét môn học",
      desc: "Nhập điểm kiểm tra thường xuyên, giữa kỳ, cuối kỳ và viết nhận xét quá trình học tập.",
      href: "/teacher/so-diem-nhan-xet",
      icon: ClipboardCheck,
      badgeText: "Sổ điểm",
      badgeVariant: "success"
    },
    {
      id: "gvbm-observation",
      groupId: "GVBM",
      groupName: "Chuyên môn Bộ môn",
      title: "Dự giờ Giáo viên Phổ thông",
      desc: "Đăng ký tiết dạy thao giảng, lập phiếu đánh giá tiết dạy đồng nghiệp và xem tổng hợp góp ý.",
      href: "/teacher/du-gio",
      icon: Eye,
      badgeText: "Dự giờ",
      badgeVariant: "skyline"
    },
    {
      id: "gvbm-entrance",
      groupId: "GVBM",
      groupName: "Chuyên môn Bộ môn",
      title: "Khảo sát đầu vào K-12",
      desc: "Nhập điểm và nhận xét đánh giá năng lực học sinh mới đầu cấp (Tiểu học, THCS, THPT).",
      href: "/teacher/input-assessments?type=general",
      icon: TrendingUp,
      badgeText: "Đầu vào",
      badgeVariant: "default"
    },
    {
      id: "gvbm-experiential",
      groupId: "GVBM",
      groupName: "Chuyên môn Bộ môn",
      title: "Hoạt động trải nghiệm",
      desc: "Quản lý bài thu hoạch ngoại khóa, dự án thực tế và chấm điểm năng lực học sinh.",
      href: "/teacher/experiential-activities",
      icon: GraduationCap,
      badgeText: "Trải nghiệm",
      badgeVariant: "accent"
    },
    {
      id: "gvbm-assignments",
      groupId: "GVBM",
      groupName: "Chuyên môn Bộ môn",
      title: "Phân công giảng dạy",
      desc: "Tra cứu phân công chuyên môn, định mức tiết dạy và danh sách lớp giảng dạy được giao.",
      href: "/teacher/phan-cong-giang-day",
      icon: BookMarked,
      badgeText: "Định mức",
      badgeVariant: "secondary"
    },
    {
      id: "util-schedule",
      groupId: "UTILITIES",
      groupName: "Tiện ích & Lịch",
      title: "Thời khóa biểu giảng dạy",
      desc: "Xem lịch dạy theo tuần, vị trí phòng học, thời gian biểu từng tiết học trong ngày.",
      href: "/teacher/thoi-khoa-bieu",
      icon: CalendarDays,
      badgeText: "TKB Tuần",
      badgeVariant: "default"
    },
    {
      id: "util-surveys",
      groupId: "UTILITIES",
      groupName: "Tiện ích & Lịch",
      title: "Khảo sát Giáo viên",
      desc: "Tham gia các phiếu khảo sát ý kiến định kỳ của Nhà trường dành cho cán bộ giáo viên.",
      href: "/teacher/surveys",
      icon: FileText,
      badgeText: "Khảo sát",
      badgeVariant: "skyline"
    }
  ]

  const filteredActions = useMemo(() => {
    return actionItems.filter((item) => {
      if (activeTab !== "ALL" && item.groupId !== activeTab) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchTitle = item.title.toLowerCase().includes(q)
        const matchDesc = item.desc.toLowerCase().includes(q)
        const matchGroup = item.groupName.toLowerCase().includes(q)
        return matchTitle || matchDesc || matchGroup
      }
      return true
    })
  }, [actionItems, activeTab, searchQuery])


  return (
    <div className="space-y-5 md:space-y-6 max-w-7xl mx-auto">
      
      {/* 1. HERO WELCOME CARD - CHUẨN NHẬN DIỆN THƯƠNG HIỆU SKY-LINE */}
      <UserWelcomeCard
        userName={userName}
        userInitial={userInitial}
        academicYear={finalMetrics.academicYearName}
      />

      {/* 2. CHỈ SỐ CÔNG TÁC & ĐO LƯỜNG ĐÁNH GIÁ (5 KPI CARDS CHUẨN BRAND SKY-LINE) */}
      <div className="space-y-3">
        {/* Section Header */}
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0284C7]/15 border border-[#0284C7]/30 flex items-center justify-center text-[#0284C7] shadow-2xs">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight">
              CHỈ SỐ CÔNG TÁC & ĐO LƯỜNG ĐÁNH GIÁ
            </h2>
          </div>

          <button
            onClick={() => fetchMetrics(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-[#0284C7] hover:text-[#0055A5] bg-sky-50 hover:bg-sky-100/80 border border-sky-200/80 px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-2xs select-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#0284C7]" : ""}`} />
            <span className="hidden sm:inline">Cập nhật thời gian thực</span>
            <span className="sm:hidden">Làm mới</span>
          </button>
        </div>

        {/* 5 KPI Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          
          {/* Card 1: Lớp phụ trách */}
          <Link
            href="/teacher/classes"
            className="group bg-gradient-to-b from-sky-50/90 to-white rounded-2xl border border-sky-200/80 p-3.5 sm:p-4 shadow-xs hover:shadow-md hover:border-[#0284C7]/60 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="bg-[#0284C7] text-white text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-2xs">
                  Đang giảng dạy
                </span>
                <div className="w-7 h-7 rounded-full bg-[#38BDF8] text-white flex items-center justify-center shadow-2xs">
                  <GraduationCap className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-wide mt-2.5">
                LỚP PHỤ TRÁCH
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mt-0.5">
                {finalMetrics.totalClasses} <span className="text-xs sm:text-sm font-semibold text-slate-400">lớp</span>
              </h3>
            </div>
            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-sky-100 text-[10px] sm:text-[11px] font-bold text-[#0284C7] group-hover:underline">
              <span className="truncate">Lớp chủ nhiệm & bộ môn</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Tổng học sinh */}
          <Link
            href="/teacher/ho-so-hoc-sinh"
            className="group bg-gradient-to-b from-emerald-50/90 to-white rounded-2xl border border-emerald-200/80 p-3.5 sm:p-4 shadow-xs hover:shadow-md hover:border-emerald-500/60 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="bg-[#10B981] text-white text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-2xs">
                  Quản lý dữ liệu
                </span>
                <div className="w-7 h-7 rounded-full bg-[#34D399] text-white flex items-center justify-center shadow-2xs">
                  <Users className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-wide mt-2.5">
                TỔNG HỌC SINH
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mt-0.5">
                {finalMetrics.totalStudents} <span className="text-xs sm:text-sm font-semibold text-slate-400">học sinh</span>
              </h3>
            </div>
            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-emerald-100 text-[10px] sm:text-[11px] font-bold text-emerald-700 group-hover:underline">
              <span className="truncate">Hồ sơ theo dõi 360°</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Phân công môn */}
          <Link
            href="/teacher/phan-cong-giang-day"
            className="group bg-gradient-to-b from-purple-50/90 to-white rounded-2xl border border-purple-200/80 p-3.5 sm:p-4 shadow-xs hover:shadow-md hover:border-purple-500/60 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="bg-[#8B5CF6] text-white text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-2xs">
                  Chuyên môn
                </span>
                <div className="w-7 h-7 rounded-full bg-[#A78BFA] text-white flex items-center justify-center shadow-2xs">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-wide mt-2.5">
                PHÂN CÔNG MÔN
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mt-0.5">
                {finalMetrics.totalAssignments} <span className="text-xs sm:text-sm font-semibold text-slate-400">môn học</span>
              </h3>
            </div>
            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-purple-100 text-[10px] sm:text-[11px] font-bold text-purple-700 group-hover:underline">
              <span className="truncate">Môn giảng dạy được giao</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Card 4: Tiết dự giờ */}
          <Link
            href="/teacher/du-gio"
            className="group bg-gradient-to-b from-amber-50/90 to-white rounded-2xl border border-amber-200/80 p-3.5 sm:p-4 shadow-xs hover:shadow-md hover:border-amber-500/60 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="bg-[#F59E0B] text-white text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-2xs">
                  Dự giờ CM
                </span>
                <div className="w-7 h-7 rounded-full bg-[#FBBF24] text-white flex items-center justify-center shadow-2xs">
                  <Eye className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-wide mt-2.5">
                TIẾT DỰ GIỜ
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mt-0.5">
                {finalMetrics.totalObservedLessons || 0} <span className="text-xs sm:text-sm font-semibold text-slate-400">tiết</span>
              </h3>
            </div>
            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-amber-100 text-[10px] sm:text-[11px] font-bold text-amber-700 group-hover:underline">
              <span className="truncate">Phiếu dự giờ chuyên môn</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Card 5: Cần bồi dưỡng */}
          <Link
            href="/teacher/ho-tro-hoc-tap"
            className="group bg-gradient-to-b from-rose-50/90 to-white rounded-2xl border border-rose-200/80 p-3.5 sm:p-4 shadow-xs hover:shadow-md hover:border-rose-500/60 transition-all flex flex-col justify-between col-span-2 sm:col-span-1"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="bg-[#F43F5E] text-white text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-2xs">
                  Cần chú ý
                </span>
                <div className="w-7 h-7 rounded-full bg-[#FB7185] text-white flex items-center justify-center shadow-2xs">
                  <Heart className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-wide mt-2.5">
                CẦN BỒI DƯỠNG
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mt-0.5">
                {finalMetrics.remedialStudentsCount || 0} <span className="text-xs sm:text-sm font-semibold text-slate-400">học sinh</span>
              </h3>
            </div>
            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-rose-100 text-[10px] sm:text-[11px] font-bold text-rose-700 group-hover:underline">
              <span className="truncate">Cần chú ý & hỗ trợ</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

        </div>
      </div>

      {/* 3. BANNER KHẨU HIỆU SKY-LINE (DỮ LIỆU TẠO KHÁC BIỆT) */}
      <div className="bg-gradient-to-r from-sky-50 via-blue-50/50 to-sky-100/60 border border-sky-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 relative overflow-hidden">
        <div className="flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-[#007A72] shrink-0">
            <Sprout className="w-5 h-5 text-[#00A99D]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 tracking-tight">
              “ Dữ liệu tạo khác biệt ”
            </h4>
            <p className="text-xs font-semibold text-[#0284C7] mt-0.5">
              — Sky-Line —
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-right z-10">
          <span 
            className="text-sm sm:text-base text-[#0284C7] font-medium italic"
            style={{ fontFamily: "'Dancing Script', 'Caveat', 'Segoe Script', cursive" }}
          >
            Vì những hành trình học tập tốt đẹp hơn ♡
          </span>
        </div>

        {/* Họa tiết núi nhẹ nhàng phía sau */}
        <svg className="absolute right-0 bottom-0 h-full w-48 sm:w-72 pointer-events-none opacity-20 text-[#0284C7]" viewBox="0 0 300 100" fill="none">
          <path d="M0 100 L 90 35 L 140 70 L 220 15 L 300 100 Z" fill="currentColor" />
          <path d="M120 100 L 190 40 L 260 80 L 300 60 L 300 100 Z" fill="currentColor" opacity="0.5" />
        </svg>
      </div>

      {/* 4. TASK FILTER & SEARCH TOOLBAR */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Tab Buttons (Hỗ trợ cuộn ngang mượt mà trên điện thoại) */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar w-full md:w-fit">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "ALL"
                ? "bg-white text-[#003B3A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tất cả ({actionItems.length})
          </button>
          <button
            onClick={() => setActiveTab("GVCN")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "GVCN"
                ? "bg-white text-[#003B3A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Công tác GVCN
          </button>
          <button
            onClick={() => setActiveTab("GVBM")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "GVBM"
                ? "bg-white text-[#003B3A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Chuyên môn GVBM
          </button>
          <button
            onClick={() => setActiveTab("UTILITIES")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "UTILITIES"
                ? "bg-white text-[#003B3A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Lịch & Tiện ích
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm chức năng, công tác..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:bg-white focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/15 transition-all"
          />
        </div>
      </div>

      {/* 5. ACTION MODULES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {filteredActions.map((item) => {
          const IconComponent = item.icon
          return (
            <Link
              key={item.id}
              href={item.href}
              className="group bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-[#48BFE3]/60 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-700 group-hover:bg-[#48BFE3]/10 group-hover:text-[#0284C7] group-hover:border-[#48BFE3]/30 transition-colors">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <Badge variant={item.badgeVariant || "secondary"}>
                    {item.badgeText}
                  </Badge>
                </div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#0284C7] transition-colors leading-tight">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-1.5 line-clamp-2 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3.5 mt-3 border-t border-slate-100 text-xs font-bold text-slate-400 group-hover:text-[#0284C7] transition-colors">
                <span>{item.groupName}</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* 7. MODAL ĐỔI MẬT KHẨU */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

    </div>
  )
}
