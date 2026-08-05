"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { 
  Users, Layers, BookOpen, CheckCircle2, Loader2, ArrowRight, Eye, 
  TrendingUp, Calendar, GraduationCap, Compass, Sparkles, Heart, ShieldCheck
} from "lucide-react"
import { WelcomeAlert } from "@/components/WelcomeAlert"
import Link from "next/link"

export default function TeacherDashboard() {
  const { data: session, status } = useSession()
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const userName = session?.user?.name || "Thầy/Cô"

  useEffect(() => {
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
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 shadow-lg shadow-indigo-500/25">
            <Loader2 className="w-7 h-7 text-white animate-spin" />
          </div>
        </div>
        <p className="text-slate-400 font-bold tracking-wider uppercase text-xs">Đang khởi tạo tổng quan công việc...</p>
      </div>
    )
  }

  const finalMetrics = metrics || {
    totalClasses: 0,
    totalStudents: 0,
    totalAssignments: 0,
    scoredStudents: 0
  }

  const statCards = [
    {
      label: "Lớp Phụ trách",
      value: finalMetrics.totalClasses,
      subtext: "Lớp được phân công chủ nhiệm",
      icon: Layers,
      bgGradient: "from-blue-500/10 via-blue-500/5 to-transparent",
      borderColor: "border-blue-200/60",
      iconBg: "bg-blue-600/10 border-blue-200 text-blue-600",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200"
    },
    {
      label: "Tổng Học sinh",
      value: finalMetrics.totalStudents,
      subtext: "Học sinh trong các danh mục lớp",
      icon: Users,
      bgGradient: "from-amber-500/10 via-amber-500/5 to-transparent",
      borderColor: "border-amber-200/60",
      iconBg: "bg-amber-600/10 border-amber-200 text-amber-600",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200"
    },
    {
      label: "Phân công Môn học",
      value: finalMetrics.totalAssignments,
      subtext: "Môn giảng dạy được giao",
      icon: BookOpen,
      bgGradient: "from-violet-500/10 via-violet-500/5 to-transparent",
      borderColor: "border-violet-200/60",
      iconBg: "bg-violet-600/10 border-violet-200 text-violet-600",
      badgeColor: "bg-violet-50 text-violet-700 border-violet-200",
      href: "/teacher/phan-cong-giang-day"
    },
    {
      label: "Đã hoàn thành Đánh giá",
      value: finalMetrics.scoredStudents,
      subtext: "Học sinh được cập nhật nhận xét",
      icon: CheckCircle2,
      bgGradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
      borderColor: "border-emerald-200/60",
      iconBg: "bg-emerald-600/10 border-emerald-200 text-emerald-600",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200"
    }
  ]

  const actionSections = [
    {
      category: "I. KHẢO SÁT & DỰ GIỜ CHUYÊN MÔN",
      items: [
        {
          href: "/teacher/input-assessments?type=general",
          title: "1. Khảo sát đầu vào",
          desc: "Cập nhật điểm số, đánh giá và nhận xét đầu vào học sinh",
          icon: TrendingUp,
          iconGradient: "from-indigo-600 to-blue-500",
          badge: "Khảo sát",
          badgeStyle: "bg-indigo-50 text-indigo-700 border-indigo-200"
        },
        {
          href: "/teacher/du-gio",
          title: "2. Dự giờ Giáo viên",
          desc: "Quản lý tiết dạy, theo dõi và lập phiếu dự giờ chuyên môn",
          icon: Eye,
          iconGradient: "from-teal-600 to-emerald-500",
          badge: "Chuyên môn",
          badgeStyle: "bg-teal-50 text-teal-700 border-teal-200"
        }
      ]
    },
    {
      category: "II. HOẠT ĐỘNG & PHÂN CÔNG GIẢNG DẠY",
      items: [
        {
          href: "/teacher/orientation",
          title: "3. Hướng nghiệp",
          desc: "Theo dõi định hướng nghề nghiệp và tư vấn cho học sinh",
          icon: Compass,
          iconGradient: "from-sky-600 to-indigo-500",
          badge: "Định hướng",
          badgeStyle: "bg-sky-50 text-sky-700 border-sky-200"
        },
        {
          href: "/teacher/experiential-activities",
          title: "4. Hoạt động trải nghiệm",
          desc: "Quản lý bài thu hoạch, danh mục và kết quả trải nghiệm",
          icon: GraduationCap,
          iconGradient: "from-amber-600 to-orange-500",
          badge: "Trải nghiệm",
          badgeStyle: "bg-amber-50 text-amber-700 border-amber-200"
        },
        {
          href: "/teacher/phan-cong-giang-day",
          title: "5. Phân công giảng dạy",
          desc: "Tra cứu danh sách môn học và phân công giảng dạy các lớp",
          icon: BookOpen,
          iconGradient: "from-purple-600 to-pink-500",
          badge: "Lịch dạy",
          badgeStyle: "bg-purple-50 text-purple-700 border-purple-200"
        }
      ]
    },
    {
      category: "III. HỖ TRỢ HỌC TẬP & THEO DÕI HỌC SINH",
      items: [
        {
          href: "/teacher/ho-tro-hoc-tap",
          title: "6. Phụ đạo, bồi dưỡng Học sinh",
          desc: "Đề xuất phụ đạo văn hóa, hỗ trợ tâm lý & xem biểu đồ cải thiện",
          icon: Heart,
          iconGradient: "from-rose-600 to-red-500",
          badge: "Bồi dưỡng",
          badgeStyle: "bg-rose-50 text-rose-700 border-rose-200"
        },
        {
          href: "/teacher/classes",
          title: "7. Lớp học của tôi",
          desc: "Quản lý thông tin chi tiết, danh sách và hồ sơ lớp chủ nhiệm",
          icon: Layers,
          iconGradient: "from-emerald-600 to-teal-500",
          badge: "Lớp học",
          badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200"
        }
      ]
    }
  ]

  return (
    <div className="space-y-8 pb-12 transition-all">
      {/* Welcome Banner */}
      <WelcomeAlert name={userName} />

      {/* Main Dashboard Hero Card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-white">
        {/* Glow Accents */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-extrabold bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Cổng Thông tin Giáo viên
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Tổng quan Công việc & Nhiệm vụ
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Theo dõi thống kê lớp học, môn giảng dạy và quản lý các công tác khảo sát, bồi dưỡng học sinh dễ dàng.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2 rounded-2xl">
              <Calendar className="w-4 h-4 text-indigo-300" />
              <div className="text-xs">
                <span className="text-slate-400 font-semibold mr-1">Năm học:</span>
                <span className="font-extrabold text-white">{finalMetrics.academicYearName || "2026 - 2027"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 px-3.5 py-2 rounded-2xl text-emerald-300 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Hệ thống sẵn sàng</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon
          const CardInner = (
            <div className={`relative overflow-hidden bg-white border ${card.borderColor} rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.02] flex flex-col justify-between h-full`}>
              <div className={`absolute top-0 right-0 w-28 h-28 bg-gradient-to-br ${card.bgGradient} rounded-full blur-2xl pointer-events-none`} />

              <div className="flex items-start justify-between gap-3 relative z-10">
                <div>
                  <p className="text-xs font-bold text-slate-500 tracking-wide uppercase">{card.label}</p>
                  <p className="text-3xl font-black text-slate-900 mt-1 tracking-tight">{card.value}</p>
                </div>
                <div className={`p-3 rounded-2xl border ${card.iconBg}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between relative z-10">
                <span className="text-[11px] text-slate-400 font-medium">{card.subtext}</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${card.badgeColor}`}>
                  Hoạt động
                </span>
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

      {/* Portal Quick Access Action Center */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 rounded-full bg-indigo-600" />
            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
              Trung tâm Thao tác & Quản lý Danh mục
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-400 hidden sm:inline-block">
            Nhấp chọn danh mục để thực hiện công việc
          </span>
        </div>

        <div className="space-y-8">
          {actionSections.map((section, secIdx) => (
            <div key={secIdx} className="space-y-3">
              <h3 className="text-xs font-extrabold text-indigo-900/80 uppercase tracking-wider pl-1">
                {section.category}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.items.map((item, itemIdx) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={itemIdx}
                      href={item.href}
                      className="group relative bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className={`p-3 rounded-xl bg-gradient-to-tr ${item.iconGradient} text-white shadow-md shadow-indigo-500/10 group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${item.badgeStyle}`}>
                          {item.badge}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center justify-between">
                          <span>{item.title}</span>
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
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

