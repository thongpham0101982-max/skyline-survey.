"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import {
  Users, Layers, BookOpen, CheckCircle2, Loader2, ArrowRight, Eye,
  TrendingUp, Calendar as CalendarIcon, GraduationCap, Compass, Sparkles, Heart, ShieldCheck,
  Clock, BarChart3, FileText, ClipboardCheck, BookMarked, CheckCircle, ChevronRight, Activity, Target
} from "lucide-react"
import { WelcomeAlert } from "@/components/WelcomeAlert"
import Link from "next/link"

export default function TeacherDashboard() {
  const { data: session, status } = useSession()
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentDateStr, setCurrentDateStr] = useState("")

  const userName = session?.user?.name || "Thầy/Cô"

  useEffect(() => {
    const now = new Date()
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }
    setCurrentDateStr(now.toLocaleDateString("vi-VN", options))

    async function fetchMetrics() {
      try {
        setLoading(true)
        const yearId = typeof window !== "undefined" ? localStorage.getItem("selectedAcademicYear") || "" : ""
        const r = await fetch("/api/teacher-assessments?action=getDashboardMetrics&academicYearId=" + yearId)
        if (r.ok) {
          setMetrics(await r.json())
        }
      } catch (e) {
        console.error("Failed to load dashboard metrics:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()

    window.addEventListener("academicYearChanged", fetchMetrics)
    return () => window.removeEventListener("academicYearChanged", fetchMetrics)
  }, [])

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-5 font-sans">
        <div className="relative">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center bg-gradient-to-tr from-[#003B3A] via-[#00A99D] to-emerald-400 shadow-xl text-white animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <div className="absolute -inset-2 rounded-3xl bg-[#00A99D]/20 blur-lg -z-10 animate-pulse" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-slate-700 font-extrabold text-sm sm:text-base tracking-wide uppercase">
            Đang tải dữ liệu tổng quan...
          </p>
          <p className="text-xs text-slate-400 font-medium">Hệ thống SQMS đang đồng bộ dữ liệu thời gian thực</p>
        </div>
      </div>
    )
  }

  const finalMetrics = metrics || {
    totalClasses: 0,
    totalStudents: 0,
    totalAssignments: 0,
    scoredStudents: 0,
    academicYearName: ""
  }

  const totalStudents = finalMetrics.totalStudents || 0
  const scoredStudents = finalMetrics.scoredStudents || 0
  const scoredPercent = totalStudents > 0
    ? Math.min(100, Math.round((scoredStudents / totalStudents) * 100))
    : 0

  const activeAcademicYear = finalMetrics.academicYearName || "2026-2027"

  // 6 KPI Metric Cards with rich gradient top accents & vivid styling
  const statCards = [
    {
      label: "LỚP PHỤ TRÁCH",
      value: finalMetrics.totalClasses,
      subtext: "Lớp chủ nhiệm & bộ môn",
      icon: Layers,
      accentGradient: "from-teal-500 via-[#00A99D] to-emerald-400",
      iconBg: "bg-emerald-500 text-white shadow-emerald-200",
      badge: "Đang dạy",
      badgeStyle: "bg-emerald-100 text-[#003B3A] border-emerald-200",
      hoverBorder: "hover:border-emerald-400"
    },
    {
      label: "TỔNG HỌC SINH",
      value: totalStudents,
      subtext: "Học sinh được quản lý",
      icon: Users,
      accentGradient: "from-sky-500 to-blue-600",
      iconBg: "bg-sky-500 text-white shadow-sky-200",
      badge: "Hồ sơ 360°",
      badgeStyle: "bg-sky-100 text-sky-800 border-sky-200",
      hoverBorder: "hover:border-sky-400"
    },
    {
      label: "PHÂN CÔNG MÔN HỌC",
      value: finalMetrics.totalAssignments,
      subtext: "Môn giảng dạy được giao",
      icon: BookOpen,
      accentGradient: "from-purple-500 to-indigo-600",
      iconBg: "bg-purple-500 text-white shadow-purple-200",
      badge: "Môn học",
      badgeStyle: "bg-purple-100 text-purple-800 border-purple-200",
      hoverBorder: "hover:border-purple-400",
      href: "/teacher/phan-cong-giang-day"
    },
    {
      label: "TIẾN ĐỘ ĐÁNH GIÁ",
      value: scoredPercent + "%",
      subtext: `${scoredStudents}/${totalStudents} học sinh hoàn thành`,
      icon: CheckCircle2,
      accentGradient: "from-teal-400 to-cyan-600",
      iconBg: "bg-teal-600 text-white shadow-teal-200",
      badge: scoredPercent === 100 ? "Hoàn thành" : "Đang tiến hành",
      badgeStyle: scoredPercent === 100 ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-cyan-100 text-cyan-800 border-cyan-200",
      hoverBorder: "hover:border-teal-400"
    },
    {
      label: "TIẾT DỰ GIỜ",
      value: finalMetrics.totalObservedLessons || 0,
      subtext: "Phiếu dự giờ chuyên môn",
      icon: Eye,
      accentGradient: "from-amber-500 to-orange-500",
      iconBg: "bg-amber-500 text-white shadow-amber-200",
      badge: "Chuyên môn",
      badgeStyle: "bg-amber-100 text-amber-900 border-amber-200",
      hoverBorder: "hover:border-amber-400",
      href: "/teacher/du-gio"
    },
    {
      label: "HỌC SINH CẦN BỒI DƯỠNG",
      value: finalMetrics.remedialStudentsCount || 0,
      subtext: "Đề xuất hỗ trợ & bồi dưỡng",
      icon: Heart,
      accentGradient: "from-rose-500 to-pink-600",
      iconBg: "bg-rose-500 text-white shadow-rose-200",
      badge: finalMetrics.remedialStudentsCount > 0 ? "Cần chú ý" : "Ổn định",
      badgeStyle: finalMetrics.remedialStudentsCount > 0 ? "bg-rose-100 text-rose-800 border-rose-300" : "bg-emerald-100 text-emerald-800 border-emerald-300",
      hoverBorder: "hover:border-rose-400",
      href: "/teacher/ho-tro-hoc-tap"
    }
  ]

  const categorySections = [
    {
      categoryName: "A. CÔNG TÁC GVCN",
      categoryDesc: "Quản lý học sinh lớp chủ nhiệm, theo dõi rèn luyện và hỗ trợ học tập",
      badgeText: "6 Chức năng chính",
      badgeStyle: "bg-teal-100 text-[#003B3A] border-teal-300 font-extrabold",
      accentBar: "bg-[#003B3A]",
      items: [
        {
          href: "/teacher/classes",
          title: "1. Lớp chủ nhiệm",
          desc: "Xem danh sách học sinh, sơ đồ lớp và thông tin lớp chủ nhiệm",
          icon: Layers,
          iconBg: "bg-teal-50 text-[#003B3A] border-teal-200"
        },
        {
          href: "/teacher/nps",
          title: "2. NPS Khảo sát",
          desc: "Theo dõi chỉ số hài lòng và phản hồi khảo sát của phụ huynh",
          icon: BarChart3,
          iconBg: "bg-emerald-50 text-emerald-700 border-emerald-200"
        },
        {
          href: "/teacher/co-van-hoc-tap",
          title: "3. Cố vấn Học tập & Nhật ký Check-in",
          desc: "Quản lý mục tiêu K1-K12, ghi nhật ký tham vấn, theo dõi cảnh báo 🟢🟡🔴 & SOS",
          icon: Compass,
          iconBg: "bg-teal-50 text-[#00A99D] border-teal-200"
        },
        {
          href: "/teacher/ho-so-hoc-sinh",
          title: "4. Hồ sơ Học sinh 360°",
          desc: "Tra cứu thông tin 360°, điểm số, phiếu mục tiêu, lịch sử tham vấn & xuất PDF",
          icon: FileText,
          iconBg: "bg-blue-50 text-blue-700 border-blue-200"
        },
        {
          href: "/teacher/ho-tro-hoc-tap",
          title: "5. Phụ đạo, bồi dưỡng Học sinh",
          desc: "Đề xuất phụ đạo văn hóa, hỗ trợ tâm lý & theo dõi sự tiến bộ",
          icon: Heart,
          iconBg: "bg-rose-50 text-rose-700 border-rose-200"
        },
        {
          href: "/teacher/orientation",
          title: "6. Sổ theo dõi Hướng nghiệp",
          desc: "Cập nhật định hướng nghề nghiệp và tư vấn học tập cho học sinh",
          icon: Target,
          iconBg: "bg-sky-50 text-sky-700 border-sky-200"
        }
      ]
    },
    {
      categoryName: "B. CÔNG TÁC GVBM",
      categoryDesc: "Đánh giá chuyên môn, dự giờ đồng nghiệp, sổ điểm và hoạt động trải nghiệm",
      badgeText: "5 Chức năng chính",
      badgeStyle: "bg-indigo-100 text-indigo-900 border-indigo-300 font-extrabold",
      accentBar: "bg-indigo-700",
      items: [
        {
          href: "/teacher/input-assessments?type=general",
          title: "1. Khảo sát đầu vào",
          desc: "Cập nhật điểm số và nhận xét năng lực đầu vào học sinh",
          icon: TrendingUp,
          iconBg: "bg-cyan-50 text-cyan-700 border-cyan-200"
        },
        {
          href: "/teacher/du-gio",
          title: "2. Dự giờ đánh giá Giáo viên",
          desc: "Đăng ký tiết dạy, lập phiếu dự giờ chuyên môn đồng nghiệp",
          icon: Eye,
          iconBg: "bg-indigo-50 text-indigo-700 border-indigo-200"
        },
        {
          href: "/teacher/experiential-activities",
          title: "3. Hoạt động trải nghiệm",
          desc: "Quản lý bài thu hoạch trải nghiệm thực tế và báo cáo",
          icon: GraduationCap,
          iconBg: "bg-amber-50 text-amber-700 border-amber-200"
        },
        {
          href: "/teacher/so-diem-nhan-xet",
          title: "4. Sổ điểm / Nhận xét",
          desc: "Cập nhật sổ điểm môn học và nhận xét quá trình học tập",
          icon: ClipboardCheck,
          iconBg: "bg-emerald-50 text-emerald-800 border-emerald-200"
        },
        {
          href: "/teacher/phan-cong-giang-day",
          title: "5. Phân công giảng dạy",
          desc: "Tra cứu danh sách môn giảng dạy và phân công chuyên môn",
          icon: BookMarked,
          iconBg: "bg-purple-50 text-purple-700 border-purple-200"
        }
      ]
    }
  ]

  return (
    <div className="space-y-8 pb-16 font-sans text-slate-800 max-w-7xl mx-auto">
      {/* Welcome Greeting Alert Header */}
      <WelcomeAlert name={userName} />

      {/* Modern Sky-Line SQMS Hero Banner */}
      <div className="bg-gradient-to-br from-[#003B3A] via-[#004D4A] to-[#00A99D] rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden border border-teal-700/30">
        {/* Glow Effects */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-teal-400/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 translate-y-16 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black bg-white/15 border border-white/25 text-teal-100 uppercase tracking-wider backdrop-blur-md shadow-sm">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>HỆ THỐNG QUẢN TRỊ CHẤT LƯỢNG GIÁO DỤC SKY-LINE (SQMS)</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
              Tổng Quan Công Việc & Chuẩn Hóa Đo Lường
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 bg-white/20 border border-white/30 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold text-white backdrop-blur-md shadow-sm">
                <CalendarIcon className="w-4 h-4 text-amber-300" />
                <span>Năm học: <strong className="text-amber-300 font-black">{activeAcademicYear}</strong></span>
              </div>

              <div className="flex items-center gap-2 bg-white/20 border border-white/30 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold text-emerald-100 backdrop-blur-md shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>Chuẩn hóa dữ liệu</span>
              </div>
            </div>

            {currentDateStr && (
              <div className="flex items-center gap-2 bg-black/25 border border-white/20 px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold text-teal-100 backdrop-blur-md shadow-inner">
                <Clock className="w-4 h-4 text-teal-300" />
                <span>Hôm nay: <strong className="text-white font-bold">{currentDateStr}</strong></span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-teal-200/90 font-bold uppercase tracking-widest">
          <span className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-300" />
            Sky-Line International Education Standard
          </span>
          <span className="hidden sm:inline-block">SQMS Real-time Analytics</span>
        </div>
      </div>

      {/* 6 Real Metric KPI Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wider flex items-center gap-2.5">
            <div className="w-2.5 h-6 rounded-full bg-[#00A99D]" />
            <span>CHỈ SỐ CÔNG TÁC & ĐO LƯỜNG ĐÁNH GIÁ</span>
          </h2>
          <span className="text-xs sm:text-sm font-bold text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Cập nhật thời gian thực
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((card, idx) => {
            const Icon = card.icon
            const CardContent = (
              <div className={`bg-white border border-slate-200/90 ${card.hoverBorder} rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between h-full group relative overflow-hidden`}>
                {/* Top Colored Accent Bar */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${card.accentGradient}`} />

                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${card.badgeStyle}`}>
                      {card.badge}
                    </span>
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl ${card.iconBg} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase tracking-wider line-clamp-1">{card.label}</p>
                    <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{card.value}</p>
                  </div>
                </div>

                <div className="px-4 sm:px-5 pb-4 pt-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <p className="text-xs sm:text-sm font-semibold text-slate-600 line-clamp-1">{card.subtext}</p>
                  {card.href && (
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#00A99D] group-hover:translate-x-1 transition-all shrink-0 ml-1" />
                  )}
                </div>
              </div>
            )

            if (card.href) {
              return (
                <Link key={idx} href={card.href} className="block h-full">
                  {CardContent}
                </Link>
              )
            }
            return <div key={idx} className="h-full">{CardContent}</div>
          })}
        </div>
      </div>

      {/* Học sinh cần bồi dưỡng & Chú ý Card Banner */}
      <div className="bg-white border border-rose-200/80 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 bg-gradient-to-r from-rose-50/40 via-white to-amber-50/30">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-rose-500 text-white shadow-md shadow-rose-200 flex items-center justify-center shrink-0">
            <Heart className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider">
                HỌC SINH CẦN BỒI DƯỠNG & CHÚ Ý
              </h3>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-xs">
                {finalMetrics.remedialStudentsCount || 0} Trường hợp
              </span>
            </div>
            <p className="text-xs sm:text-sm text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Tình hình rèn luyện ổn định. Chưa ghi nhận học sinh trong diện cảnh báo bồi dưỡng đặc biệt.</span>
            </p>
          </div>
        </div>

        <Link
          href="/teacher/ho-tro-hoc-tap"
          className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-[#003B3A] hover:bg-[#004D4A] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg group shrink-0"
        >
          <span>Quản lý danh sách hỗ trợ</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-teal-300" />
        </Link>
      </div>

      {/* Category Action Center (2 Column Responsive Layout) */}
      <div className="space-y-5 pt-2">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
          <h2 className="text-base sm:text-xl font-black text-slate-900 uppercase tracking-wider flex items-center gap-3">
            <div className="w-3 h-7 rounded-full bg-[#00A99D]" />
            <span>DANH MỤC THAO TÁC CHUYÊN MÔN</span>
          </h2>
          <span className="text-xs sm:text-sm font-extrabold text-[#00A99D] hidden sm:inline-block bg-teal-50 border border-teal-200 px-3.5 py-1.5 rounded-full">
            Chọn chức năng để xử lý công việc
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {categorySections.map((sec, secIdx) => (
            <div key={secIdx} className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
              {/* Category Header */}
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-5 rounded-full ${sec.accentBar}`} />
                    <h3 className="text-base sm:text-lg font-black text-[#003B3A] tracking-tight">
                      {sec.categoryName}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium pl-5">{sec.categoryDesc}</p>
                </div>
                <span className={`px-3 py-1 rounded-xl text-xs border shrink-0 ${sec.badgeStyle}`}>
                  {sec.badgeText}
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {sec.items.map((item, itemIdx) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={itemIdx}
                      href={item.href}
                      className="group flex items-center justify-between p-4 sm:p-4.5 rounded-2xl bg-slate-50/80 hover:bg-gradient-to-r hover:from-teal-50/70 hover:to-emerald-50/40 border border-slate-200/80 hover:border-[#00A99D]/40 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border ${item.iconBg} group-hover:scale-105 transition-transform duration-200 shadow-xs`}>
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#003B3A] transition-colors truncate">
                            {item.title}
                          </h4>
                          <p className="text-xs sm:text-sm text-slate-600 font-medium line-clamp-1">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-slate-200 group-hover:bg-[#003B3A] group-hover:border-[#003B3A] group-hover:text-white flex items-center justify-center transition-all duration-200 shrink-0 ml-3 shadow-xs">
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-teal-300 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
