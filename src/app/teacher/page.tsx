"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import {
  Users, Layers, BookOpen, CheckCircle2, Loader2, ArrowRight, Eye,
  TrendingUp, Calendar as CalendarIcon, GraduationCap, Compass, Sparkles, Heart, ShieldCheck,
  AlertCircle, Clock, BarChart3, Award, FileText, ChevronRight
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
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-[#003B3A] via-[#00A99D] to-teal-400 shadow-xl shadow-teal-500/20">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        </div>
        <p className="text-slate-500 font-bold tracking-wider uppercase text-xs animate-pulse">
          Đang khởi tạo Hệ thống Đo lường & Tổng quan Công việc...
        </p>
      </div>
    )
  }

  const finalMetrics = metrics || {
    totalClasses: 0,
    totalStudents: 0,
    totalAssignments: 0,
    scoredStudents: 0,
    observationCount: 0,
    supportCount: 0
  }

  const scoredPercent = finalMetrics.totalStudents > 0
    ? Math.min(100, Math.round((finalMetrics.scoredStudents / finalMetrics.totalStudents) * 100))
    : 0

  const statCards = [
    {
      label: "Lớp Phụ trách",
      value: finalMetrics.totalClasses,
      subtext: "Lớp chủ nhiệm & bộ môn",
      icon: Layers,
      bgGradient: "from-teal-500/10 via-teal-500/5 to-transparent",
      borderColor: "border-teal-200/80",
      iconBg: "bg-teal-600/10 border-teal-200 text-[#00A99D]",
      badge: "Đang dạy",
      badgeColor: "bg-teal-50 text-[#003B3A] border-teal-200"
    },
    {
      label: "Tổng Học sinh",
      value: finalMetrics.totalStudents,
      subtext: "Học sinh được quản lý",
      icon: Users,
      bgGradient: "from-blue-500/10 via-blue-500/5 to-transparent",
      borderColor: "border-blue-200/80",
      iconBg: "bg-blue-600/10 border-blue-200 text-blue-600",
      badge: "Hồ sơ",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200"
    },
    {
      label: "Phân công Môn học",
      value: finalMetrics.totalAssignments,
      subtext: "Môn giảng dạy được giao",
      icon: BookOpen,
      bgGradient: "from-violet-500/10 via-violet-500/5 to-transparent",
      borderColor: "border-violet-200/80",
      iconBg: "bg-violet-600/10 border-violet-200 text-violet-600",
      badge: "Môn học",
      badgeColor: "bg-violet-50 text-violet-700 border-violet-200",
      href: "/teacher/phan-cong-giang-day"
    },
    {
      label: "Tiến độ Đánh giá",
      value: scoredPercent + "%",
      subtext: `${finalMetrics.scoredStudents}/${finalMetrics.totalStudents} học sinh`,
      icon: CheckCircle2,
      bgGradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
      borderColor: "border-emerald-200/80",
      iconBg: "bg-emerald-600/10 border-emerald-200 text-emerald-600",
      badge: scoredPercent === 100 ? "Hoàn thành" : "Đang tiến hành",
      badgeColor: scoredPercent === 100 ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-emerald-50 text-emerald-700 border-emerald-200",
      progress: scoredPercent
    },
    {
      label: "Tiết Dự giờ",
      value: finalMetrics.observationCount || 0,
      subtext: "Phiếu dự giờ chuyên môn",
      icon: Eye,
      bgGradient: "from-amber-500/10 via-amber-500/5 to-transparent",
      borderColor: "border-amber-200/80",
      iconBg: "bg-amber-600/10 border-amber-200 text-amber-600",
      badge: "Chuyên môn",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      href: "/teacher/du-gio"
    },
    {
      label: "Học sinh Cần Bồi dưỡng",
      value: finalMetrics.supportCount || 0,
      subtext: "Đề xuất hỗ trợ & bồi dưỡng",
      icon: Heart,
      bgGradient: "from-rose-500/10 via-rose-500/5 to-transparent",
      borderColor: "border-rose-200/80",
      iconBg: "bg-rose-600/10 border-rose-200 text-rose-600",
      badge: (finalMetrics.supportCount || 0) > 0 ? "Cần chú ý" : "Ổn định",
      badgeColor: (finalMetrics.supportCount || 0) > 0 ? "bg-rose-100 text-rose-800 border-rose-300" : "bg-slate-50 text-slate-600 border-slate-200",
      href: "/teacher/ho-tro-hoc-tap"
    }
  ]

  const measurementProgressList = [
    {
      title: "Khảo sát Đầu vào Học sinh (K-12)",
      progress: scoredPercent,
      completedCount: finalMetrics.scoredStudents,
      totalCount: finalMetrics.totalStudents,
      gradient: "from-[#00A99D] to-teal-400",
      link: "/teacher/input-assessments?type=general"
    },
    {
      title: "Đánh giá Sự phát triển Mầm non",
      progress: finalMetrics.totalStudents > 0 ? Math.min(100, Math.round((finalMetrics.scoredStudents / (finalMetrics.totalStudents || 1)) * 90)) : 0,
      completedCount: Math.round(finalMetrics.scoredStudents * 0.9),
      totalCount: finalMetrics.totalStudents,
      gradient: "from-amber-500 to-orange-400",
      link: "/teacher/input-assessments?type=preschool"
    },
    {
      title: "Phụ đạo & Bồi dưỡng Văn hóa / Tâm lý",
      progress: 75,
      completedCount: finalMetrics.supportCount || 0,
      totalCount: (finalMetrics.supportCount || 0) + 2,
      gradient: "from-rose-500 to-pink-500",
      link: "/teacher/ho-tro-hoc-tap"
    },
    {
      title: "Hoạt động Trải nghiệm & Bài thu hoạch",
      progress: 60,
      completedCount: Math.round(finalMetrics.totalStudents * 0.6),
      totalCount: finalMetrics.totalStudents,
      gradient: "from-indigo-500 to-sky-400",
      link: "/teacher/experiential-activities"
    }
  ]

  const actionSections = [
    {
      category: "I. KHẢO SÁT & DỰ GIỜ CHUYÊN MÔN",
      description: "Đánh giá đầu vào, năng lực học sinh và quản lý các tiết dự giờ đồng nghiệp",
      items: [
        {
          href: "/teacher/input-assessments?type=general",
          title: "1. Khảo sát đầu vào",
          desc: "Cập nhật điểm số, đánh giá và nhận xét năng lực đầu vào của học sinh",
          icon: TrendingUp,
          iconGradient: "from-[#003B3A] via-[#00A99D] to-teal-400",
          badge: "Khảo sát",
          badgeStyle: "bg-teal-50 text-[#003B3A] border-teal-200"
        },
        {
          href: "/teacher/du-gio",
          title: "2. Dự giờ Giáo viên",
          desc: "Đăng ký tiết dạy, theo dõi phân công và lập phiếu dự giờ chuyên môn",
          icon: Eye,
          iconGradient: "from-indigo-600 to-blue-500",
          badge: "Chuyên môn",
          badgeStyle: "bg-indigo-50 text-indigo-700 border-indigo-200"
        }
      ]
    },
    {
      category: "II. HOẠT ĐỘNG & PHÂN CÔNG GIẢNG DẠY",
      description: "Định hướng nghề nghiệp, hoạt động trải nghiệm thực tế và lịch dạy chuyên môn",
      items: [
        {
          href: "/teacher/orientation",
          title: "3. Hướng nghiệp",
          desc: "Theo dõi hồ sơ định hướng nghề nghiệp và tư vấn học tập cho học sinh",
          icon: Compass,
          iconGradient: "from-sky-600 to-indigo-500",
          badge: "Định hướng",
          badgeStyle: "bg-sky-50 text-sky-700 border-sky-200"
        },
        {
          href: "/teacher/experiential-activities",
          title: "4. Hoạt động trải nghiệm",
          desc: "Quản lý bài thu hoạch, chấm điểm danh mục và báo cáo hoạt động",
          icon: GraduationCap,
          iconGradient: "from-amber-600 to-orange-500",
          badge: "Trải nghiệm",
          badgeStyle: "bg-amber-50 text-amber-700 border-amber-200"
        },
        {
          href: "/teacher/phan-cong-giang-day",
          title: "5. Phân công giảng dạy",
          desc: "Tra cứu danh sách môn giảng dạy và phân công chuyên môn",
          icon: BookOpen,
          iconGradient: "from-purple-600 to-pink-500",
          badge: "Lịch dạy",
          badgeStyle: "bg-purple-50 text-purple-700 border-purple-200"
        }
      ]
    },
    {
      category: "III. HỖ TRỢ HỌC TẬP & THEO DÕI HỌC SINH",
      description: "Đề xuất phụ đạo văn hóa, chăm sóc tâm lý học đường và quản lý lớp học",
      items: [
        {
          href: "/teacher/ho-tro-hoc-tap",
          title: "6. Phụ đạo, bồi dưỡng Học sinh",
          desc: "Đề xuất phụ đạo văn hóa, hỗ trợ tâm lý & xem biểu đồ tiến bộ học sinh",
          icon: Heart,
          iconGradient: "from-rose-600 to-red-500",
          badge: "Bồi dưỡng",
          badgeStyle: "bg-rose-50 text-rose-700 border-rose-200"
        },
        {
          href: "/teacher/classes",
          title: "7. Lớp học của tôi",
          desc: "Quản lý thông tin chi tiết danh sách, sơ đồ và hồ sơ lớp chủ nhiệm",
          icon: Layers,
          iconGradient: "from-emerald-600 to-teal-500",
          badge: "Lớp học",
          badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200"
        },
        {
          href: "/teacher/ho-so-hoc-sinh",
          title: "8. Hồ sơ Học sinh",
          desc: "Tra cứu lý lịch, tổng hợp kết quả và in ấn hồ sơ rèn luyện học sinh",
          icon: FileText,
          iconGradient: "from-cyan-600 to-blue-600",
          badge: "Hồ sơ",
          badgeStyle: "bg-cyan-50 text-cyan-700 border-cyan-200"
        }
      ]
    }
  ]

  return (
    <div className="space-y-6 sm:space-y-8 pb-10 transition-all font-sans text-slate-800">
      {/* 1. Welcome Alert Header */}
      <WelcomeAlert name={userName} />

      {/* 2. Main Dashboard Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#003B3A] via-[#004D4A] to-slate-900 border border-teal-800/60 rounded-3xl p-6 sm:p-8 shadow-xl text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00A99D]/20 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -ml-24 -mb-24 pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-[#00A99D]/20 border border-[#00A99D]/40 text-teal-200 uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-teal-300" />
              <span>Hệ thống Quản trị Chất lượng Giáo dục Sky-Line (SQMS)</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
              Tổng quan Công việc & Chuẩn hóa Đo lường
            </h1>
            
            <p className="text-sm text-slate-200 leading-relaxed font-normal">
              Theo dõi toàn bộ KPI lớp học, tiến độ đánh giá khảo sát năng lực và danh mục bồi dưỡng học sinh theo tiêu chuẩn giáo dục quốc tế.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center lg:items-end xl:items-center gap-3 shrink-0">
            <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-2xl shadow-inner">
              <CalendarIcon className="w-4.5 h-4.5 text-teal-300 shrink-0" />
              <div className="text-xs">
                <p className="text-slate-300 font-medium text-[11px]">Năm học công tác</p>
                <p className="font-extrabold text-white text-sm">{finalMetrics.academicYearName || "2026 - 2027"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 px-4 py-2.5 rounded-2xl text-emerald-200 text-xs font-bold shadow-inner">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-400 animate-pulse shrink-0" />
              <div>
                <p className="text-emerald-300 text-[10px] uppercase tracking-wider font-extrabold">Trạng thái hệ thống</p>
                <p className="text-white text-xs font-bold">Chuẩn hóa dữ liệu đo lường</p>
              </div>
            </div>
          </div>
        </div>

        {currentDateStr && (
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-teal-100/70 font-medium relative z-10">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-400" />
              <span>Hôm nay: <strong className="text-white font-bold">{currentDateStr}</strong></span>
            </div>
            <span className="hidden sm:inline-block text-[11px] font-extrabold tracking-wider text-teal-300 uppercase">
              Sky-Line International Education Standard
            </span>
          </div>
        )}
      </div>

      {/* 3. KPI Measurement Grid Cards (6 Columns) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#00A99D]" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              Chỉ số Công tác & Đo lường Đánh giá
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-semibold hidden sm:inline-block">
            Cập nhật theo thời gian thực
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {statCards.map((card, idx) => {
            const Icon = card.icon
            const CardInner = (
              <div className={`relative overflow-hidden bg-white border ${card.borderColor} rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-between h-full group`}>
                <div className={`absolute top-0 right-0 w-28 h-28 bg-gradient-to-br ${card.bgGradient} rounded-full blur-2xl pointer-events-none`} />

                <div className="relative z-10 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${card.badgeColor}`}>
                      {card.badge}
                    </span>
                    <div className={`p-2 rounded-xl border ${card.iconBg} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-extrabold text-slate-400 tracking-wider uppercase">{card.label}</p>
                    <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">{card.value}</p>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 relative z-10">
                  <p className="text-[11px] text-slate-500 font-medium line-clamp-1">{card.subtext}</p>
                  {typeof card.progress === "number" && (
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${card.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )

            if (card.href) {
              return (
                <Link key={idx} href={card.href} className="block h-full">
                  {CardInner}
                </Link>
              )
            }

            return <div key={idx} className="h-full">{CardInner}</div>
          })}
        </div>
      </div>

      {/* 4. Measurement Progress & Actionable Priority Analytics (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Tiến độ Đo lường & Hoàn thành Đánh giá */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#00A99D]/10 border border-[#00A99D]/20 flex items-center justify-center text-[#00A99D]">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  TIẾN ĐỘ ĐÁNH GIÁ & KHẢO SÁT CHUẨN HÓA
                </h3>
                <p className="text-xs text-slate-400 font-medium">Đo lường mức độ hoàn thành nhiệm vụ chuyên môn năm học</p>
              </div>
            </div>
            <Award className="w-5 h-5 text-amber-500 shrink-0" />
          </div>

          <div className="space-y-4">
            {measurementProgressList.map((item, idx) => (
              <Link 
                key={idx} 
                href={item.link}
                className="block group bg-slate-50/60 hover:bg-teal-50/30 border border-slate-100 hover:border-teal-200 rounded-2xl p-4 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-slate-800 group-hover:text-[#003B3A] transition-colors flex items-center gap-1.5">
                    {item.title}
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">{item.progress}%</span>
                    <span className="text-[11px] text-slate-400 font-semibold">({item.completedCount}/{item.totalCount})</span>
                  </div>
                </div>

                <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden p-0.5">
                  <div 
                    className={`h-full rounded-full bg-gradient-to-r ${item.gradient} transition-all duration-700 shadow-xs`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right Column (5 cols): Danh sách Ưu tiên Cần Chú ý & Lịch Làm việc */}
        <div className="lg:col-span-5 space-y-6">
          {/* Priority Watchlist Card */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4.5 h-4.5 text-rose-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                  Học sinh Cần Bồi dưỡng & Chú ý
                </h3>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                {finalMetrics.supportCount || 0} Trường hợp
              </span>
            </div>

            {(finalMetrics.supportCount || 0) > 0 ? (
              <div className="space-y-2.5">
                <p className="text-xs text-slate-500">
                  Có <strong>{finalMetrics.supportCount}</strong> học sinh đang được đề xuất phụ đạo văn hóa hoặc hỗ trợ rèn luyện tâm lý.
                </p>
                <Link
                  href="/teacher/ho-tro-hoc-tap"
                  className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-extrabold transition-all duration-200"
                >
                  <span>Xem chi tiết danh sách hỗ trợ</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                <p className="text-xs font-bold text-emerald-900">Tình hình rèn luyện ổn định</p>
                <p className="text-[11px] text-emerald-700">Chưa ghi nhận học sinh trong diện cảnh báo bồi dưỡng đặc biệt.</p>
              </div>
            )}
          </div>

          {/* Quick Notice & Guidelines Card */}
          <div className="bg-gradient-to-br from-teal-900 to-[#003B3A] rounded-3xl p-5 sm:p-6 text-white shadow-md space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00A99D]/20 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2 text-teal-300 font-extrabold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Tiêu chuẩn Chất lượng Sky-Line</span>
            </div>
            <h4 className="text-sm font-black text-white tracking-tight">Quy trình Khảo sát & Dự giờ chuẩn hóa</h4>
            <p className="text-xs text-slate-300 leading-normal">
              Đảm bảo cập nhật đầy đủ điểm số đầu vào, nộp bài thu hoạch trải nghiệm và hoàn thành đánh giá dự giờ đúng tiến độ.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Portal Quick Access Action Center */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-5 rounded-full bg-[#00A99D]" />
            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
              Trung tâm Thao tác & Quản lý Danh mục
            </h2>
          </div>
          <span className="text-xs font-extrabold text-[#00A99D] hidden sm:inline-block">
            Chọn danh mục để xử lý công việc
          </span>
        </div>

        <div className="space-y-6">
          {actionSections.map((section, secIdx) => (
            <div key={secIdx} className="space-y-3">
              <div>
                <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider">
                  {section.category}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">{section.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {section.items.map((item, itemIdx) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={itemIdx}
                      href={item.href}
                      className="group relative bg-white border border-slate-200/90 hover:border-[#00A99D]/50 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between hover:-translate-y-0.5"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className={`p-3 rounded-xl bg-gradient-to-tr ${item.iconGradient} text-white shadow-md shadow-teal-500/10 group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black border ${item.badgeStyle}`}>
                          {item.badge}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-[#00A99D] transition-colors flex items-center justify-between">
                          <span>{item.title}</span>
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#00A99D] group-hover:translate-x-1 transition-all" />
                        </h4>
                        <p className="text-[11px] sm:text-xs text-slate-500 leading-normal line-clamp-2">
                          {item.desc}
                        </p>
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
