"use client"

import React, { useEffect, useState, useMemo, useCallback } from "react"
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
  RefreshCw,
  BarChart3,
  Sprout,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { KPICard } from "@/components/KPICard"
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
  badgeVariant?: "default" | "skyline" | "accent" | "success" | "secondary" | "destructive"
  metricValue?: number | string
}

export default function TeacherDashboard() {
  const { data: session } = useSession()
  const [metrics, setMetrics] = useState<MetricData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"ALL" | "GVCN" | "GVBM" | "UTILITIES">("ALL")
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [currentDateInfo, setCurrentDateInfo] = useState({
    dayName: "Hôm nay",
    dateStr: "",
    timeStr: "",
    timeGreeting: "Chào Thầy/Cô!"
  })

  const userName = session?.user?.name || "Thầy/Cô"
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
      dateStr: `Ngày ${date} Tháng ${month}, ${year}`,
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

  const actionItems: ActionCard[] = useMemo(() => [
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
      metricValue: finalMetrics.totalClasses
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
      metricValue: finalMetrics.totalStudents
    },
    {
      id: "gvcn-remedial",
      groupId: "GVCN",
      groupName: "Công tác GVCN",
      title: "Phụ đạo & Bồi dưỡng",
      desc: "Lập danh sách học sinh cần phụ đạo văn hóa, hỗ trợ tâm lý và theo dõi tiến độ.",
      href: "/teacher/ho-tro-hoc-tap",
      icon: Heart,
      badgeText: `${finalMetrics.remedialStudentsCount || 0} cần hỗ trợ`,
      badgeVariant: finalMetrics.remedialStudentsCount ? "accent" : "secondary",
      metricValue: finalMetrics.remedialStudentsCount
    },
    {
      id: "gvcn-orientation",
      groupId: "GVCN",
      groupName: "Công tác GVCN",
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
      groupName: "Chuyên môn GVBM",
      title: "Sổ điểm & Nhận xét",
      desc: "Nhập điểm kiểm tra thường xuyên, giữa kỳ, cuối kỳ và viết nhận xét quá trình.",
      href: "/teacher/so-diem-nhan-xet",
      icon: ClipboardCheck,
      badgeText: "Sổ điểm",
      badgeVariant: "success"
    },
    {
      id: "gvbm-observation",
      groupId: "GVBM",
      groupName: "Chuyên môn GVBM",
      title: "Dự giờ đồng nghiệp",
      desc: "Đăng ký tiết dạy thao giảng, lập phiếu đánh giá tiết dạy và xem tổng hợp góp ý.",
      href: "/teacher/du-gio",
      icon: Eye,
      badgeText: `${finalMetrics.totalObservedLessons || 0} tiết`,
      badgeVariant: "skyline",
      metricValue: finalMetrics.totalObservedLessons
    },
    {
      id: "gvbm-entrance",
      groupId: "GVBM",
      groupName: "Chuyên môn GVBM",
      title: "Khảo sát đầu vào K-12",
      desc: "Nhập điểm và nhận xét đánh giá năng lực học sinh mới đầu cấp phổ thông.",
      href: "/teacher/input-assessments?type=general",
      icon: TrendingUp,
      badgeText: "Đầu vào",
      badgeVariant: "default"
    },
    {
      id: "gvbm-experiential",
      groupId: "GVBM",
      groupName: "Chuyên môn GVBM",
      title: "Hoạt động trải nghiệm",
      desc: "Quản lý bài thu hoạch ngoại khóa, dự án thực tế và chấm điểm năng lực.",
      href: "/teacher/experiential-activities",
      icon: GraduationCap,
      badgeText: "Trải nghiệm",
      badgeVariant: "accent"
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
      metricValue: finalMetrics.totalAssignments
    },
    {
      id: "util-schedule",
      groupId: "UTILITIES",
      groupName: "Lịch & Tiện ích",
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
      groupName: "Lịch & Tiện ích",
      title: "Khảo sát Giáo viên",
      desc: "Tham gia các phiếu khảo sát ý kiến định kỳ của Nhà trường dành cho giáo viên.",
      href: "/teacher/surveys",
      icon: FileText,
      badgeText: "Khảo sát",
      badgeVariant: "skyline"
    }
  ], [finalMetrics])

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
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 1. HERO WELCOME CARD - CHUẨN THẨM MỸ TRƯỜNG HỌC QUỐC TẾ */}
      <UserWelcomeCard
        userName={userName}
        userInitial={userInitial}
        greetingSubtitle={currentDateInfo.timeGreeting}
        showAcademicYear={false}
      />

      {/* 2. CHỈ SỐ CÔNG TÁC & ĐO LƯỜNG ĐÁNH GIÁ (5 KPI CARDS CHUẨN MỚI) */}
      <div className="space-y-3">
        {/* Section Header Tinh Gọn */}
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-[#0284C7] flex items-center justify-center border border-sky-200/60 shadow-2xs">
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-medium text-slate-800 tracking-normal">
              Chỉ số công tác & đánh giá
            </h2>
          </div>

          <button
            onClick={() => fetchMetrics(true)}
            disabled={refreshing}
            title="Đồng bộ dữ liệu mới nhất"
            className="flex items-center gap-1.5 text-xs font-normal text-slate-500 hover:text-sky-600 bg-white hover:bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-2xs select-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${refreshing ? "animate-spin text-sky-500" : ""}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>

        {/* 5 KPI Cards Grid Đồng Nhất */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <KPICard
            title="Lớp Phụ Trách"
            value={finalMetrics.totalClasses}
            unit="lớp"
            description="Lớp chủ nhiệm & bộ môn"
            icon={GraduationCap}
            badge="Đang giảng dạy"
            colorTheme="sky"
            href="/teacher/classes"
            hrefLabel="Lớp phụ trách"
          />

          <KPICard
            title="Tổng Học Sinh"
            value={finalMetrics.totalStudents}
            unit="học sinh"
            description="Hồ sơ theo dõi 360°"
            icon={Users}
            badge="Quản lý dữ liệu"
            colorTheme="emerald"
            href="/teacher/ho-so-hoc-sinh"
            hrefLabel="Hồ sơ học sinh"
          />

          <KPICard
            title="Phân Công Môn"
            value={finalMetrics.totalAssignments}
            unit="môn học"
            description="Định mức chuyên môn"
            icon={BookOpen}
            badge="Chuyên môn"
            colorTheme="purple"
            href="/teacher/phan-cong-giang-day"
            hrefLabel="Định mức tiết dạy"
          />

          <KPICard
            title="Tiết Dự Giờ"
            value={finalMetrics.totalObservedLessons || 0}
            unit="tiết"
            description="Phiếu dự giờ chuyên môn"
            icon={Eye}
            badge="Dự giờ CM"
            colorTheme="amber"
            href="/teacher/du-gio"
            hrefLabel="Phiếu dự giờ"
          />

          <KPICard
            title="Cần Bồi Dưỡng"
            value={finalMetrics.remedialStudentsCount || 0}
            unit="học sinh"
            description="Cần chú ý & hỗ trợ"
            icon={Heart}
            badge={finalMetrics.remedialStudentsCount ? "Cần lưu ý" : "Bình thường"}
            colorTheme="rose"
            href="/teacher/ho-tro-hoc-tap"
            hrefLabel="Danh sách hỗ trợ"
            className="col-span-2 sm:col-span-1"
          />
        </div>
      </div>

      {/* 3. BỐ CỤC 2 CỘT THỰC HÀNH HÔM NAY (KHÔNG LẶP MENU TRÁI) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* CỘT TRÁI (65%): LỊCH DẠY & CÔNG TÁC TRỌNG TÂM TRONG NGÀY */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/60 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div>
            {/* Khung Title Bảng Chuẩn Hóa */}
            <div className="table-title-frame flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center border border-sky-100 shadow-2xs">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-800 tracking-normal">
                    Lịch dạy & Tiết học {currentDateInfo.dayName}
                  </h3>
                  <p className="text-[11px] font-normal text-slate-400 mt-0.5">
                    {currentDateInfo.dateStr} • Niên khóa {finalMetrics.academicYearName}
                  </p>
                </div>
              </div>

              <Link
                href="/teacher/thoi-khoa-bieu"
                className="text-xs font-normal text-sky-600 hover:text-sky-700 flex items-center gap-1 group"
              >
                <span>Toàn bộ TKB tuần</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>

            {/* Nội dung danh sách tiết học trong ngày */}
            <div className="p-4 sm:p-5 space-y-3">
              {/* Lời nhắn sư phạm nhẹ nhàng */}
              <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-3.5 flex items-start gap-3">
                <Clock className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
                <div className="text-xs text-slate-600 leading-relaxed font-normal">
                  <span className="font-medium text-slate-700">Trọng tâm hôm nay: </span>
                  Theo dõi chuyên cần đầu giờ, hoàn thiện nhận xét đánh giá thường xuyên trên Sổ điểm và hỗ trợ học sinh có nhu cầu bồi dưỡng.
                </div>
              </div>

              {/* Bảng phân bổ nhanh các tiết dạy */}
              <div className="border border-slate-200/60 rounded-xl overflow-hidden">
                <div className="bg-slate-50/90 border-b border-slate-200/70 px-4 py-2.5 flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Tiết học & Lớp</span>
                  <span>Tác vụ trực tiếp</span>
                </div>
                <div className="divide-y divide-slate-100 text-xs font-normal text-slate-700">
                  <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-sky-100/70 text-sky-700 flex items-center justify-center font-medium text-[11px]">
                        1
                      </span>
                      <div>
                        <div className="font-medium text-slate-800">Lớp Phụ Trách Giảng Dạy</div>
                        <div className="text-[11px] text-slate-400">Theo Thời khóa biểu chính khóa</div>
                      </div>
                    </div>
                    <Link
                      href="/teacher/so-diem-nhan-xet"
                      className="px-3 py-1 bg-sky-50 hover:bg-sky-100/80 text-sky-700 border border-sky-200/60 rounded-lg text-xs font-medium transition-all"
                    >
                      Vào Sổ điểm & Nhận xét
                    </Link>
                  </div>

                  <div className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center font-medium text-[11px]">
                        2
                      </span>
                      <div>
                        <div className="font-medium text-slate-800">Công Tác Chủ Nhiệm & Chuyên Cần</div>
                        <div className="text-[11px] text-slate-400">Điểm danh và liên lạc phụ huynh</div>
                      </div>
                    </div>
                    <Link
                      href="/teacher/classes"
                      className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border border-emerald-200/60 rounded-lg text-xs font-medium transition-all"
                    >
                      Xem Lớp Chủ nhiệm
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer thông điệp tinh tế */}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40 text-xs text-slate-400 font-normal flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sprout className="w-3.5 h-3.5 text-emerald-500" />
              “ Dữ liệu tạo khác biệt — Vì hành trình học tập hạnh phúc ”
            </span>
            <span className="italic text-sky-600">Sky-Line Education</span>
          </div>
        </div>

        {/* CỘT PHẢI (35%): LƯU Ý HỌC VỤ & NHẮC NHỞ NGHIỆP VỤ */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Card 1: Học sinh cần chú ý & bồi dưỡng */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                    <Heart className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-medium text-slate-800">
                    Học sinh cần bồi dưỡng
                  </h3>
                </div>
                <Badge variant={finalMetrics.remedialStudentsCount ? "accent" : "secondary"}>
                  {finalMetrics.remedialStudentsCount || 0} học sinh
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-normal leading-relaxed">
                {finalMetrics.remedialStudentsCount
                  ? `Có ${finalMetrics.remedialStudentsCount} học sinh trong danh sách cần phụ đạo văn hóa hoặc hỗ trợ tâm lý.`
                  : "Hiện không có học sinh nào nằm trong danh sách cần hỗ trợ đặc biệt. Chúc mừng Thầy/Cô!"}
              </p>
            </div>

            <Link
              href="/teacher/ho-tro-hoc-tap"
              className="mt-4 pt-3 border-t border-slate-100 text-xs font-normal text-rose-600 hover:text-rose-700 flex items-center justify-between group"
            >
              <span>Mở Sổ hỗ trợ học tập</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Card 2: Khảo sát ý kiến định kỳ */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-50 text-[#0284C7] flex items-center justify-center border border-sky-100">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-medium text-slate-800">
                    Khảo sát Nhà trường
                  </h3>
                </div>
                <Badge variant="skyline">Định kỳ</Badge>
              </div>
              <p className="text-xs text-slate-500 font-normal leading-relaxed">
                Đóng góp ý kiến chuyên môn định kỳ để nâng cao chất lượng môi trường sư phạm trường Sky-Line.
              </p>
            </div>

            <Link
              href="/teacher/surveys"
              className="mt-4 pt-3 border-t border-slate-100 text-xs font-normal text-sky-600 hover:text-sky-700 flex items-center justify-between group"
            >
              <span>Xem danh sách phiếu khảo sát</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

        </div>
      </div>

      {/* 4. DẢI TÁC VỤ THƯỜNG NHẬT GỌN GÀNG (COMPACT ESSENTIALS STRIP) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/60 shadow-2xs">
          {/* Tabs Lọc Chuyên Môn */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "ALL"
                  ? "bg-white text-slate-800 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Tất cả ({actionItems.length})
            </button>
            <button
              onClick={() => setActiveTab("GVCN")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "GVCN"
                  ? "bg-white text-slate-800 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Công tác GVCN (4)
            </button>
            <button
              onClick={() => setActiveTab("GVBM")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "GVBM"
                  ? "bg-white text-slate-800 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Chuyên môn GVBM (5)
            </button>
            <button
              onClick={() => setActiveTab("UTILITIES")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "UTILITIES"
                  ? "bg-white text-slate-800 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Lịch & Tiện ích (2)
            </button>
          </div>

          {/* Ô tìm kiếm nhanh tác vụ */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nhanh chức năng..."
              className="w-full bg-slate-50 border border-slate-200/70 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 font-normal focus:outline-none focus:bg-white focus:border-sky-400 transition-all"
            />
          </div>
        </div>

        {/* Lưới Compact Cards Gọn Nhẹ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredActions.map((item) => {
            const IconComponent = item.icon
            return (
              <Link
                key={item.id}
                href={item.href}
                className="group bg-white rounded-xl border border-slate-200/60 p-3.5 shadow-2xs hover:shadow-xs hover:border-sky-300 hover:-translate-y-0.5 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#0284C7] border border-sky-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-medium text-slate-800 group-hover:text-sky-600 transition-colors truncate">
                        {item.title}
                      </h4>
                      {item.badgeText && (
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md">
                          {item.badgeText}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
              </Link>
            )
          })}
        </div>
      </div>

      {/* 5. MODAL ĐỔI MẬT KHẨU */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

    </div>
  )
}
