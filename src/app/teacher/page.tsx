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
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  School,
  Sparkles,
  Award,
  Layers,
  Compass
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { KPICard } from "@/components/KPICard"
import { UserWelcomeCard } from "@/components/UserWelcomeCard"
import DeadlineCountdownBanner from "@/components/shared/DeadlineCountdownBanner"
import { useCampusTheme, CampusThemeType } from "@/hooks/useCampusTheme"

interface MetricData {
  totalClasses: number
  totalStudents: number
  totalAssignments: number
  scoredStudents: number
  academicYearName: string
  totalObservedLessons?: number
  remedialStudentsCount?: number
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
  const [campusOverride, setCampusOverride] = useState<CampusThemeType | null>(null)
  const [currentDateInfo, setCurrentDateInfo] = useState({
    dayName: "Hôm nay",
    dateStr: "",
    timeStr: "",
    timeGreeting: "Chào Thầy/Cô!"
  })

  // Dynamic Campus Theme Resolution
  const rawCampusName = metrics?.campus?.campusName || ""
  const rawCampusCode = metrics?.campus?.campusCode || ""
  const campusTheme = useCampusTheme(campusOverride || rawCampusCode || rawCampusName)

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
      title: "Dự giờ & Phát triển chuyên môn",
      desc: "Đăng ký tiết dạy thao giảng, lập phiếu đánh giá tiết dạy và xem tổng hợp góp ý chuyên môn.",
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
      icon: Compass,
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

  // Determine KPI color themes based on active campus theme
  const kpiSubjectTheme = useMemo(() => {
    if (campusTheme.type === "HILL") return "gold"
    if (campusTheme.type === "GLOBAL") return "violet"
    return "pine"
  }, [campusTheme.type])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 sm:pb-8">
      
      {/* CAMPUS THEME SELECTOR & PREVIEW BADGE */}
      <div className="flex items-center justify-between gap-3 px-1 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Nhận diện cơ sở biên chế:
          </span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${campusTheme.campusBadge.bg} ${campusTheme.campusBadge.text} ${campusTheme.campusBadge.border}`}>
            <span className={`w-2 h-2 rounded-full ${campusTheme.campusBadge.dotColor}`} />
            <span>{campusTheme.name}</span>
            <span className="text-[10px] opacity-75">({campusTheme.locationName})</span>
          </span>
        </div>

        {/* Quick Preview Switcher for Testing Campus Themes */}
        <div className="flex items-center gap-1 bg-white border border-slate-200/80 p-1 rounded-xl shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 px-2">Xem thử cơ sở:</span>
          <button
            type="button"
            onClick={() => setCampusOverride("HILL")}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
              campusTheme.type === "HILL"
                ? "bg-[#AE882E] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Sky-Line Hill
          </button>
          <button
            type="button"
            onClick={() => setCampusOverride("GLOBAL")}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
              campusTheme.type === "GLOBAL"
                ? "bg-[#6E3D89] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Sky-Line Global
          </button>
          <button
            type="button"
            onClick={() => setCampusOverride("STANDARD")}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
              campusTheme.type === "STANDARD"
                ? "bg-[#00A19A] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Hệ thống chuẩn
          </button>
        </div>
      </div>

      {/* 1. HERO WELCOME CARD - THIẾT KẾ ĐỘNG THEO THƯƠNG HIỆU CƠ SỞ */}
      <UserWelcomeCard
        userName={userName}
        userInitial={userInitial}
        greetingSubtitle={currentDateInfo.timeGreeting}
        campusName={campusTheme.name}
        campusCode={campusTheme.code}
        teacherCode={metrics?.teacherInfo?.teacherCode}
        homeroomClass={metrics?.teacherInfo?.homeroomClass || undefined}
        mainSubject={metrics?.teacherInfo?.mainSubject || undefined}
        positions={metrics?.teacherInfo?.positions || undefined}
        onRefresh={() => fetchMetrics(true)}
        isRefreshing={refreshing}
        showAcademicYear={false}
      />

      {/* 2. BANNER ĐẾM NGƯỢC HẠN CHỐT CHUẨN HỆ THỐNG */}
      <DeadlineCountdownBanner
        deadlineDate="2026-11-02T17:00:00.000Z"
        batchName="Khảo sát Giữa Học Kỳ 1 (GK1) - Khóa sổ toàn hệ thống"
        pendingCount={finalMetrics.scoredStudents < finalMetrics.totalStudents ? (finalMetrics.totalStudents - finalMetrics.scoredStudents) : 0}
        totalCount={finalMetrics.totalStudents}
        isPendingFiltered={false}
      />

      {/* 3. CHỈ SỐ CÔNG TÁC & ĐO LƯỜNG ĐÁNH GIÁ (5 KPI CARDS CHUẨN THƯƠNG HIỆU) */}
      <div className="space-y-3">
        {/* Section Header Tinh Gọn */}
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center border shadow-2xs"
              style={{
                backgroundColor: campusTheme.lightAccentBg,
                color: campusTheme.accentColor,
                borderColor: campusTheme.borderSubtle
              }}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-bold text-slate-800 tracking-normal">
              Chỉ số công tác & đánh giá
            </h2>
          </div>

          <button
            onClick={() => fetchMetrics(true)}
            disabled={refreshing}
            title="Đồng bộ dữ liệu mới nhất"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-2xs select-none active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${refreshing ? "animate-spin text-[#00A19A]" : ""}`} />
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
            colorTheme="teal"
            href="/teacher/classes"
            hrefLabel="Lớp phụ trách"
            className="hover-lift"
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
            className="hover-lift"
          />

          <KPICard
            title="Phân Công Môn"
            value={finalMetrics.totalAssignments}
            unit="môn học"
            description="Định mức chuyên môn"
            icon={BookOpen}
            badge="Chuyên môn"
            colorTheme={kpiSubjectTheme}
            href="/teacher/phan-cong-giang-day"
            hrefLabel="Định mức tiết dạy"
            className="hover-lift"
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
            className="hover-lift"
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
            className="col-span-2 sm:col-span-1 hover-lift"
          />
        </div>
      </div>

      {/* 4. BỐ CỤC 2 CỘT THỰC HÀNH HÔM NAY (DAILY WORKFLOW BOARD) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* CỘT TRÁI (65%): LỊCH DẠY & CÔNG TÁC TRỌNG TÂM TRONG NGÀY */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            {/* Khung Title Bảng Chuẩn Hóa */}
            <div className="table-title-frame flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center border shadow-2xs"
                  style={{
                    backgroundColor: campusTheme.lightBg,
                    color: campusTheme.primaryColor,
                    borderColor: campusTheme.borderSubtle
                  }}
                >
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 tracking-normal">
                    Lịch dạy & Tiết học {currentDateInfo.dayName}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                    {currentDateInfo.dateStr} • Niên khóa {finalMetrics.academicYearName}
                  </p>
                </div>
              </div>

              <Link
                href="/teacher/thoi-khoa-bieu"
                className="text-xs font-semibold flex items-center gap-1 group transition-colors"
                style={{ color: campusTheme.primaryColor }}
              >
                <span>Toàn bộ TKB tuần</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>

            {/* Nội dung danh sách tiết học trong ngày */}
            <div className="p-4 sm:p-5 space-y-3.5">
              {/* Lời nhắn sư phạm định hướng */}
              <div
                className="border rounded-2xl p-4 flex items-start gap-3 transition-colors"
                style={{
                  backgroundColor: campusTheme.lightBg,
                  borderColor: campusTheme.borderSubtle
                }}
              >
                <Clock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: campusTheme.primaryColor }} />
                <div className="text-xs text-slate-600 leading-relaxed font-normal">
                  <span className="font-bold text-slate-800">Trọng tâm hôm nay: </span>
                  Theo dõi chuyên cần đầu giờ, hoàn thiện nhận xét đánh giá thường xuyên trên Sổ điểm và chủ động hỗ trợ học sinh có nhu cầu bồi dưỡng.
                </div>
              </div>

              {/* Bảng phân bổ nhanh các tiết dạy với các nút tác vụ 1 chạm (min 44px) */}
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-slate-50/90 border-b border-slate-200/70 px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span>Tiết học & Nhiệm vụ</span>
                  <span>Tác vụ trực tiếp</span>
                </div>
                <div className="divide-y divide-slate-100 text-xs font-normal text-slate-700">
                  {/* Row 1: Giảng dạy */}
                  <div className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 text-white shadow-2xs"
                        style={{ background: campusTheme.primaryColor }}
                      >
                        1
                      </span>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">Lớp Phụ Trách Giảng Dạy</div>
                        <div className="text-xs text-slate-400">Theo Thời khóa biểu chính khóa</div>
                      </div>
                    </div>
                    <Link
                      href="/teacher/so-diem-nhan-xet"
                      className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 min-h-[40px] sm:min-h-[36px] ${campusTheme.btnPrimaryStyle}`}
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      <span>Vào Sổ điểm & Nhận xét</span>
                    </Link>
                  </div>

                  {/* Row 2: Chủ nhiệm */}
                  <div className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 text-white shadow-2xs"
                        style={{ background: campusTheme.accentColor }}
                      >
                        2
                      </span>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">Công Tác Chủ Nhiệm & Chuyên Cần</div>
                        <div className="text-xs text-slate-400">Điểm danh và liên lạc phụ huynh học sinh</div>
                      </div>
                    </div>
                    <Link
                      href="/teacher/classes"
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 transition-all shadow-2xs active:scale-95 min-h-[40px] sm:min-h-[36px]"
                    >
                      <Users className="w-4 h-4 text-slate-500" />
                      <span>Xem Lớp Chủ nhiệm</span>
                    </Link>
                  </div>

                  {/* Row 3: Dự giờ chuyên môn */}
                  <div className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        3
                      </span>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">Dự Giờ & Phát Triển Chuyên Môn</div>
                        <div className="text-xs text-slate-400">Đăng ký tiết thao giảng hoặc đi dự giờ đồng nghiệp</div>
                      </div>
                    </div>
                    <Link
                      href="/teacher/du-gio"
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-all shadow-2xs active:scale-95 min-h-[40px] sm:min-h-[36px]"
                    >
                      <Eye className="w-4 h-4 text-amber-600" />
                      <span>Sổ Dự giờ</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (35%): THẺ HÀNH ĐỘNG NHANH & KHẢO SÁT */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Card 1: Học sinh cần bồi dưỡng */}
          <div className="bg-white rounded-3xl border border-rose-100 p-5 shadow-sm flex flex-col justify-between hover-lift">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-2xs">
                    <Heart className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Học sinh cần bồi dưỡng
                  </h3>
                </div>
                <Badge variant={finalMetrics.remedialStudentsCount ? "accent" : "secondary"}>
                  {finalMetrics.remedialStudentsCount || 0} học sinh
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-normal leading-relaxed">
                {finalMetrics.remedialStudentsCount
                  ? `Có ${finalMetrics.remedialStudentsCount} học sinh trong danh sách cần phụ đạo văn hóa hoặc hỗ trợ năng lực.`
                  : "Hiện không có học sinh nào nằm trong danh sách cần hỗ trợ đặc biệt. Chúc mừng Thầy/Cô!"}
              </p>
            </div>

            <Link
              href="/teacher/ho-tro-hoc-tap"
              className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center justify-between group"
            >
              <span>Mở Sổ hỗ trợ học tập</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Card 2: Khảo sát ý kiến định kỳ */}
          <div
            className="bg-white rounded-3xl border p-5 shadow-sm flex flex-col justify-between hover-lift"
            style={{ borderColor: campusTheme.borderSubtle }}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center border shadow-2xs"
                    style={{
                      backgroundColor: campusTheme.lightBg,
                      color: campusTheme.primaryColor,
                      borderColor: campusTheme.borderSubtle
                    }}
                  >
                    <FileText className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Khảo sát Nhà trường
                  </h3>
                </div>
                <span
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                  style={{
                    backgroundColor: campusTheme.lightAccentBg,
                    color: campusTheme.accentColor,
                    borderColor: campusTheme.borderSubtle
                  }}
                >
                  Định kỳ
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal leading-relaxed">
                Đóng góp ý kiến chuyên môn định kỳ để nâng cao chất lượng môi trường sư phạm trường Sky-Line.
              </p>
            </div>

            <Link
              href="/teacher/surveys"
              className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold flex items-center justify-between group transition-colors"
              style={{ color: campusTheme.primaryColor }}
            >
              <span>Xem danh sách phiếu khảo sát</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

        </div>
      </div>

      {/* 5. DẢI TÁC VỤ THƯỜNG NHẬT GỌN GÀNG (COMPACT ESSENTIALS STRIP) */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 shadow-sm">
          {/* Tabs Lọc Chuyên Môn */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "ALL"
                  ? "bg-white text-slate-800 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Tất cả ({actionItems.length})
            </button>
            <button
              onClick={() => setActiveTab("GVCN")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "GVCN"
                  ? "bg-white text-slate-800 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Công tác GVCN (4)
            </button>
            <button
              onClick={() => setActiveTab("GVBM")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "GVBM"
                  ? "bg-white text-slate-800 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Chuyên môn GVBM (5)
            </button>
            <button
              onClick={() => setActiveTab("UTILITIES")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "UTILITIES"
                  ? "bg-white text-slate-800 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Lịch & Tiện ích (2)
            </button>
          </div>

          {/* Ô tìm kiếm nhanh tác vụ */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nhanh chức năng giáo viên..."
              className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:bg-white focus:border-[#00A19A] transition-all"
            />
          </div>
        </div>

        {/* Lưới Action Cards Gọn Nhẹ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredActions.map((item) => {
            const IconComponent = item.icon
            return (
              <Link
                key={item.id}
                href={item.href}
                className="group bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border shadow-2xs"
                    style={{
                      backgroundColor: campusTheme.lightBg,
                      color: campusTheme.primaryColor,
                      borderColor: campusTheme.borderSubtle
                    }}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#00A19A] transition-colors truncate">
                        {item.title}
                      </h4>
                      {item.badgeText && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {item.badgeText}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#00A19A] group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
              </Link>
            )
          })}
        </div>
      </div>

      {/* 6. MOBILE FLOATING ACTION DOCK (THANH LỐI TẮT DÀNH CHO ĐIỆN THOẠI) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 py-2 flex items-center justify-around">
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
      </div>

    </div>
  )
}
