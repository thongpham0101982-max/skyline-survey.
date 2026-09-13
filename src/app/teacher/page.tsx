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

// Artwork minh họa trường học Sky-Line và học sinh
function SchoolCampusArtwork() {
  return (
    <svg viewBox="0 0 460 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover select-none pointer-events-none">
      <defs>
        <linearGradient id="skyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#E0F2FE" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#F0F9FF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="buildingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="roofGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0284C7" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      <circle cx="390" cy="40" r="32" fill="#FDE68A" fillOpacity="0.45" />
      <circle cx="390" cy="40" r="20" fill="#FBBF24" fillOpacity="0.3" />

      <path d="M120 45 C 130 35, 155 35, 165 45 C 175 45, 185 55, 180 65 C 160 65, 130 65, 115 65 C 110 55, 115 48, 120 45 Z" fill="white" fillOpacity="0.6" />
      <path d="M260 30 C 270 22, 290 22, 300 30 C 310 30, 318 38, 315 45 C 300 45, 270 45, 255 45 C 250 38, 255 32, 260 30 Z" fill="white" fillOpacity="0.5" />

      <path d="M160 85 L 430 85" stroke="#0284C7" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
      <rect x="175" y="88" width="245" height="92" rx="3" fill="url(#buildingGrad)" stroke="#CBD5E1" strokeWidth="1" />
      
      <rect x="173" y="85" width="249" height="6" rx="2" fill="url(#roofGrad)" />
      
      <rect x="190" y="100" width="22" height="28" rx="2" fill="#38BDF8" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="225" y="100" width="22" height="28" rx="2" fill="#38BDF8" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="260" y="100" width="22" height="28" rx="2" fill="#38BDF8" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="340" y="100" width="22" height="28" rx="2" fill="#38BDF8" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="375" y="100" width="22" height="28" rx="2" fill="#38BDF8" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />

      <rect x="295" y="96" width="32" height="84" rx="2" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1" />
      <rect x="297" y="100" width="28" height="12" rx="1.5" fill="#F59E0B" fillOpacity="0.9" />
      <line x1="300" y1="106" x2="322" y2="106" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <rect x="300" y="148" width="10" height="32" rx="1" fill="#0284C7" fillOpacity="0.6" />
      <rect x="312" y="148" width="10" height="32" rx="1" fill="#0284C7" fillOpacity="0.6" />

      <rect x="190" y="140" width="22" height="26" rx="2" fill="#38BDF8" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="225" y="140" width="22" height="26" rx="2" fill="#38BDF8" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="260" y="140" width="22" height="26" rx="2" fill="#38BDF8" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="340" y="140" width="22" height="26" rx="2" fill="#38BDF8" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="375" y="140" width="22" height="26" rx="2" fill="#38BDF8" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />

      <path d="M120 190 C 110 160, 140 140, 160 160 C 180 140, 200 160, 190 190 Z" fill="#10B981" fillOpacity="0.75" />
      <path d="M135 190 C 130 170, 150 155, 165 170 C 180 155, 195 170, 185 190 Z" fill="#34D399" fillOpacity="0.7" />
      <path d="M410 190 C 400 165, 425 145, 440 165 C 455 145, 475 165, 465 190 Z" fill="#10B981" fillOpacity="0.7" />

      <path d="M0 185 Q 230 180, 460 185 L 460 220 L 0 220 Z" fill="#E2E8F0" fillOpacity="0.5" />
      <path d="M0 195 Q 230 190, 460 195 L 460 220 L 0 220 Z" fill="#CBD5E1" fillOpacity="0.4" />

      <g transform="translate(325, 138) scale(0.65)">
        <circle cx="15" cy="12" r="7" fill="#F87171" fillOpacity="0.9" />
        <circle cx="15" cy="12" r="5" fill="#FED7AA" />
        <path d="M10 20 L 20 20 L 23 48 L 7 48 Z" fill="#FFFFFF" />
        <path d="M8 20 L 5 36" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
        <path d="M7 40 L 23 40 L 26 58 L 4 58 Z" fill="#0284C7" />
        <rect x="18" y="24" width="8" height="16" rx="2" fill="#0284C7" />
        <line x1="11" y1="58" x2="11" y2="78" stroke="#FED7AA" strokeWidth="3" strokeLinecap="round" />
        <line x1="19" y1="58" x2="19" y2="78" stroke="#FED7AA" strokeWidth="3" strokeLinecap="round" />
      </g>

      <g transform="translate(355, 136) scale(0.68)">
        <circle cx="15" cy="11" r="6" fill="#1E293B" />
        <circle cx="15" cy="13" r="5" fill="#FED7AA" />
        <path d="M9 20 L 21 20 L 22 45 L 8 45 Z" fill="#FFFFFF" />
        <rect x="5" y="22" width="7" height="18" rx="2" fill="#0284C7" />
        <path d="M8 45 L 22 45 L 22 75 L 16 75 L 15 56 L 14 75 L 8 75 Z" fill="#003B3A" />
      </g>

      <g transform="translate(385, 142) scale(0.62)">
        <circle cx="15" cy="11" r="6" fill="#334155" />
        <circle cx="15" cy="13" r="5" fill="#FED7AA" />
        <path d="M9 20 L 21 20 L 22 45 L 8 45 Z" fill="#FFFFFF" />
        <rect x="18" y="22" width="7" height="16" rx="2" fill="#F59E0B" />
        <path d="M8 45 L 22 45 L 22 72 L 16 72 L 15 54 L 14 72 L 8 72 Z" fill="#0284C7" />
      </g>
    </svg>
  )
}


﻿export default function TeacherDashboard() {
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
      title: "Hồ sơ Học sinh 360°",
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
      title: "Dự giờ đánh giá Giáo viên",
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


﻿  return (
    <div className="space-y-5 md:space-y-6 max-w-7xl mx-auto">
      
      {/* 1. HERO WELCOME CARD - CHUẨN NHẬN DIỆN THƯƠNG HIỆU SKY-LINE */}
      <div className="bg-gradient-to-r from-sky-100/90 via-sky-50 to-blue-100/70 border border-sky-200/80 rounded-3xl p-4 sm:p-6 md:p-7 shadow-xs relative overflow-hidden">
        
        {/* Vector minh họa trường học Sky-Line & học sinh */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 sm:w-2/5 md:w-1/3 opacity-35 sm:opacity-75 pointer-events-none">
          <SchoolCampusArtwork />
        </div>

        {/* Cursive Motto ở góc phải trên */}
        <div className="hidden sm:block absolute top-4 right-6 z-10">
          <span 
            className="text-base md:text-lg font-bold text-[#0284C7] italic tracking-wide"
            style={{ fontFamily: "'Dancing Script', 'Caveat', 'Segoe Script', cursive" }}
          >
            Học để sống hạnh phúc ♡
          </span>
        </div>

        {/* Nội dung chính bên trái */}
        <div className="relative z-10 max-w-2xl">
          {/* Avatar & Lời chào */}
          <div className="flex items-start sm:items-center gap-3.5 mb-3">
            <div className="relative shrink-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#0284C7] to-[#38BDF8] text-white flex items-center justify-center font-black text-xl shadow-md border-2 border-white">
                {userInitial}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                  Xin chào, {userName}!
                </h1>
                <span className="sm:hidden text-xs font-bold text-[#0284C7] italic">
                  • Học để sống hạnh phúc ♡
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1">
                Chúc Thầy/Cô một ngày làm việc tràn đầy cảm hứng và hiệu quả cao!
              </p>
            </div>
          </div>

          {/* Badges & Nút thao tác nhanh */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap mt-4 pt-3 border-t border-sky-200/50">
            {/* Pill Ngày Giờ */}
            <div className="bg-white/90 backdrop-blur-xs border border-sky-200/80 rounded-full px-3 py-1.5 flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-700 shadow-2xs">
              <CalendarDays className="w-3.5 h-3.5 text-[#0284C7]" />
              <span className="capitalize">{currentDateStr || "Đang tải thời gian..."}</span>
            </div>

            {/* Pill Năm Học */}
            <div className="bg-white/90 backdrop-blur-xs border border-sky-200/80 rounded-full px-3 py-1.5 flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-700 shadow-2xs">
              <GraduationCap className="w-3.5 h-3.5 text-[#007A72]" />
              <span>Năm học: {finalMetrics.academicYearName}</span>
            </div>

            {/* Nút Đổi Mật Khẩu */}
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="bg-white/90 hover:bg-white border border-sky-200/80 hover:border-[#0284C7] rounded-full px-3 py-1.5 flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-[#0284C7] shadow-2xs transition-all cursor-pointer group"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#0284C7] group-hover:rotate-12 transition-transform" />
              <span>Đổi mật khẩu</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

      </div>

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

      {/* 6. MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-3 py-2 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <Link
          href="/teacher"
          className="flex flex-col items-center gap-1 text-[#0284C7] font-bold text-[10px]"
        >
          <Home className="w-5 h-5" />
          <span>Trang chủ</span>
        </Link>
        <Link
          href="/teacher/surveys"
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-[#0284C7] font-medium text-[10px] transition-colors"
        >
          <ClipboardList className="w-5 h-5" />
          <span>Khảo sát</span>
        </Link>
        <Link
          href="/teacher/so-diem-nhan-xet"
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-[#0284C7] font-medium text-[10px] transition-colors"
        >
          <BarChart3 className="w-5 h-5" />
          <span>Sổ điểm</span>
        </Link>
        <Link
          href="/teacher/classes"
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-[#0284C7] font-medium text-[10px] transition-colors"
        >
          <Layers className="w-5 h-5" />
          <span>Lớp học</span>
        </Link>
        <button
          onClick={() => setIsPasswordModalOpen(true)}
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-[#0284C7] font-medium text-[10px] transition-colors cursor-pointer"
        >
          <Settings className="w-5 h-5" />
          <span>Cài đặt</span>
        </button>
      </div>

      {/* 7. MODAL ĐỔI MẬT KHẨU */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

    </div>
  )
}
