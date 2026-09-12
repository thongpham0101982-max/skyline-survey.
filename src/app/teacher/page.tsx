"use client"

import React, { useEffect, useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import {
  Users,
  Layers,
  BookOpen,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Eye,
  TrendingUp,
  Calendar,
  GraduationCap,
  Compass,
  Heart,
  FileText,
  ClipboardCheck,
  BookMarked,
  Target,
  Search,
  KeyRound,
  CalendarDays,
  Sparkles,
  ChevronRight,
  Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
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

export default function TeacherDashboard() {
  const { data: session } = useSession()
  const [metrics, setMetrics] = useState<MetricData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"ALL" | "GVCN" | "GVBM" | "UTILITIES">("ALL")
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [currentDateStr, setCurrentDateStr] = useState("")

  const userName = session?.user?.name || "Thầy/Cô"

  useEffect(() => {
    const now = new Date()
    setCurrentDateStr(
      now.toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      })
    )

    async function fetchMetrics() {
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
      }
    }
    fetchMetrics()
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

  const scoredPercent = finalMetrics.totalStudents > 0
    ? Math.min(100, Math.round((finalMetrics.scoredStudents / finalMetrics.totalStudents) * 100))
    : 0

  // Danh mục công tác chuẩn hóa theo phân quyền nghiệp vụ
  const actionItems: ActionCard[] = [
    // Nhóm 1: Công tác GVCN
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

    // Nhóm 2: Công tác GVBM
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

    // Nhóm 3: Lịch & Tiện ích
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

  // Lọc tác vụ theo Search và Tab
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
    <div className="space-y-6 pb-16">
      
      {/* 1. TOP HEADER BANNER - CHUẨN QUẢN TRỊ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 md:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Bàn làm việc Giáo viên
            </h1>
            <Badge variant="default">Năm học {finalMetrics.academicYearName}</Badge>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-2">
            <span>Chào <strong>{userName}</strong></span>
            <span>•</span>
            <span className="capitalize">{currentDateStr}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPasswordModalOpen(true)}
            leftIcon={<KeyRound className="w-3.5 h-3.5 text-slate-500" />}
          >
            Đổi mật khẩu
          </Button>
          <Link href="/teacher/so-diem-nhan-xet">
            <Button
              variant="default"
              size="sm"
              leftIcon={<ClipboardCheck className="w-3.5 h-3.5" />}
            >
              Vào Sổ điểm
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. STATS OVERVIEW - 4 KPI QUẢN TRỊ CHUYÊN MÔN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Lớp phụ trách */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#007A72] shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lớp phụ trách</p>
            <h3 className="text-xl font-black text-slate-800 leading-tight mt-0.5">
              {finalMetrics.totalClasses} <span className="text-xs font-semibold text-slate-400">lớp</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Chủ nhiệm & Bộ môn</p>
          </div>
        </div>

        {/* KPI 2: Tổng học sinh */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#0284C7] shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng học sinh</p>
            <h3 className="text-xl font-black text-slate-800 leading-tight mt-0.5">
              {finalMetrics.totalStudents} <span className="text-xs font-semibold text-slate-400">em</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Danh sách trực tiếp</p>
          </div>
        </div>

        {/* KPI 3: Tiến độ nhập điểm */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tiến độ nhập điểm</p>
            <h3 className="text-xl font-black text-slate-800 leading-tight mt-0.5">
              {scoredPercent}% <span className="text-xs font-semibold text-slate-400">({finalMetrics.scoredStudents}/{finalMetrics.totalStudents})</span>
            </h3>
            <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${scoredPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 4: Tiết dự giờ */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tiết dự giờ</p>
            <h3 className="text-xl font-black text-slate-800 leading-tight mt-0.5">
              {finalMetrics.totalObservedLessons || 0} <span className="text-xs font-semibold text-slate-400">tiết</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Thao giảng & Đồng nghiệp</p>
          </div>
        </div>

      </div>

      {/* 3. TASK FILTER & SEARCH TOOLBAR */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
              activeTab === "ALL"
                ? "bg-white text-[#003B3A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tất cả ({actionItems.length})
          </button>
          <button
            onClick={() => setActiveTab("GVCN")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
              activeTab === "GVCN"
                ? "bg-white text-[#003B3A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Công tác GVCN
          </button>
          <button
            onClick={() => setActiveTab("GVBM")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
              activeTab === "GVBM"
                ? "bg-white text-[#003B3A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Chuyên môn GVBM
          </button>
          <button
            onClick={() => setActiveTab("UTILITIES")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
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

      {/* 4. ACTION MODULES GRID - ADMIN GRADE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredActions.map((item) => {
          const IconComponent = item.icon
          return (
            <Link
              key={item.id}
              href={item.href}
              className="group bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-[#48BFE3]/50 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-700 group-hover:bg-[#48BFE3]/10 group-hover:text-[#007A72] group-hover:border-[#48BFE3]/30 transition-colors">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <Badge variant={item.badgeVariant || "secondary"}>
                    {item.badgeText}
                  </Badge>
                </div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#007A72] transition-colors leading-tight">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-1.5 line-clamp-2 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100 text-xs font-bold text-slate-400 group-hover:text-[#48BFE3] transition-colors">
                <span>{item.groupName}</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* 5. MODAL ĐỔI MẬT KHẨU */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

    </div>
  )
}
