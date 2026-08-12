"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import {
  Users, Layers, BookOpen, CheckCircle2, Loader2, ArrowRight, Eye,
  TrendingUp, Calendar as CalendarIcon, GraduationCap, Compass, Sparkles, Heart, ShieldCheck,
  AlertCircle, Clock, BarChart3, Award, FileText, ChevronRight, ClipboardCheck, BookMarked,
  Target, Activity, CheckCircle, ArrowUpRight
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
      <div className="flex flex-col items-center justify-center py-28 space-y-4 font-sans">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-[#003B3A] to-[#00A99D] shadow-lg text-white">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>
        <p className="text-slate-500 font-bold tracking-wider uppercase text-xs animate-pulse">
          Đang tải dữ liệu tổng quan...
        </p>
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

  // 6 KPI Metric Cards matching system & user screenshot design
  const statCards = [
    {
      label: "LỚP PHỤ TRÁCH",
      value: finalMetrics.totalClasses,
      subtext: "Lớp chủ nhiệm & bộ môn",
      icon: Layers,
      iconBg: "bg-emerald-50 text-[#00A99D] border-emerald-100",
      borderColor: "hover:border-[#00A99D]/40",
      badge: "Đang dạy",
      badgeStyle: "bg-emerald-50 text-[#003B3A] border-emerald-200"
    },
    {
      label: "TỔNG HỌC SINH",
      value: totalStudents,
      subtext: "Học sinh được quản lý",
      icon: Users,
      iconBg: "bg-sky-50 text-sky-600 border-sky-100",
      borderColor: "hover:border-sky-300",
      badge: "Hồ sơ",
      badgeStyle: "bg-sky-50 text-sky-700 border-sky-200"
    },
    {
      label: "PHÂN CÔNG MÔN HỌC",
      value: finalMetrics.totalAssignments,
      subtext: "Môn giảng dạy được giao",
      icon: BookOpen,
      iconBg: "bg-purple-50 text-purple-600 border-purple-100",
      borderColor: "hover:border-purple-300",
      badge: "Môn học",
      badgeStyle: "bg-purple-50 text-purple-700 border-purple-200",
      href: "/teacher/phan-cong-giang-day"
    },
    {
      label: "TIẾN ĐỘ ĐÁNH GIÁ",
      value: scoredPercent + "%",
      subtext: `${scoredStudents}/${totalStudents} học sinh`,
      icon: CheckCircle2,
      iconBg: "bg-teal-50 text-teal-600 border-teal-100",
      borderColor: "hover:border-teal-300",
      badge: scoredPercent === 100 ? "Hoàn thành" : "Đang tiến hành",
      badgeStyle: scoredPercent === 100 ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-teal-50 text-teal-700 border-teal-200",
      progress: scoredPercent
    },
    {
      label: "TIẾT DỰ GIỜ",
      value: finalMetrics.totalObservedLessons || 0,
      subtext: "Phiếu dự giờ chuyên môn",
      icon: Eye,
      iconBg: "bg-amber-50 text-amber-600 border-amber-100",
      borderColor: "hover:border-amber-300",
      badge: "Chuyên môn",
      badgeStyle: "bg-amber-50 text-amber-700 border-amber-200",
      href: "/teacher/du-gio"
    },
    {
      label: "HỌC SINH CẦN BỒI DƯỠNG",
      value: finalMetrics.remedialStudentsCount || 0,
      subtext: "Đề xuất hỗ trợ & bồi dưỡng",
      icon: Heart,
      iconBg: "bg-rose-50 text-rose-600 border-rose-100",
      borderColor: "hover:border-rose-300",
      badge: "Ổn định",
      badgeStyle: "bg-rose-50 text-rose-700 border-rose-200",
      href: "/teacher/ho-tro-hoc-tap"
    }
  ]

  const categorySections = [
    {
      categoryName: "A. CÔNG TÁC GVCN",
      categoryDesc: "Quản lý học sinh lớp chủ nhiệm, theo dõi rèn luyện và hỗ trợ học tập",
      badgeStyle: "bg-teal-50 text-[#003B3A] border-teal-200",
      items: [
        {
          href: "/teacher/classes",
          title: "1. Lớp chủ nhiệm",
          desc: "Xem danh sách học sinh, sơ đồ lớp và thông tin lớp chủ nhiệm",
          icon: Layers,
          iconBg: "bg-teal-500/10 text-[#00A99D]"
        },
        {
          href: "/teacher/nps",
          title: "2. NPS Khảo sát",
          desc: "Theo dõi chỉ số hài lòng và phản hồi khảo sát của phụ huynh",
          icon: BarChart3,
          iconBg: "bg-emerald-500/10 text-emerald-600"
        },
        {
          href: "/teacher/ho-so-hoc-sinh",
          title: "3. Hồ sơ Học sinh",
          desc: "Tra cứu lý lịch, kết quả học tập và tổng hợp rèn luyện học sinh",
          icon: FileText,
          iconBg: "bg-blue-500/10 text-blue-600"
        },
        {
          href: "/teacher/ho-tro-hoc-tap",
          title: "4. Phụ đạo, bồi dưỡng Học sinh",
          desc: "Đề xuất phụ đạo văn hóa, hỗ trợ tâm lý & theo dõi sự tiến bộ",
          icon: Heart,
          iconBg: "bg-rose-500/10 text-rose-600"
        },
        {
          href: "/teacher/orientation",
          title: "5. Sổ theo dõi Hướng nghiệp",
          desc: "Cập nhật định hướng nghề nghiệp và tư vấn học tập cho học sinh",
          icon: Compass,
          iconBg: "bg-sky-500/10 text-sky-600"
        }
      ]
    },
    {
      categoryName: "B. CÔNG TÁC GVBM",
      categoryDesc: "Đánh giá chuyên môn, dự giờ đồng nghiệp, sổ điểm và hoạt động trải nghiệm",
      badgeStyle: "bg-indigo-50 text-indigo-700 border-indigo-200",
      items: [
        {
          href: "/teacher/input-assessments?type=general",
          title: "1. Khảo sát đầu vào",
          desc: "Cập nhật điểm số và nhận xét năng lực đầu vào học sinh",
          icon: TrendingUp,
          iconBg: "bg-teal-500/10 text-[#00A99D]"
        },
        {
          href: "/teacher/du-gio",
          title: "2. Dự giờ đánh giá Giáo viên",
          desc: "Đăng ký tiết dạy, lập phiếu dự giờ chuyên môn đồng nghiệp",
          icon: Eye,
          iconBg: "bg-indigo-500/10 text-indigo-600"
        },
        {
          href: "/teacher/experiential-activities",
          title: "3. Hoạt động trải nghiệm",
          desc: "Quản lý bài thu hoạch trải nghiệm thực tế và báo cáo",
          icon: GraduationCap,
          iconBg: "bg-amber-500/10 text-amber-600"
        },
        {
          href: "/teacher/so-diem-nhan-xet",
          title: "4. Sổ điểm / Nhận xét",
          desc: "Cập nhật sổ điểm môn học và nhận xét quá trình học tập",
          icon: ClipboardCheck,
          iconBg: "bg-teal-500/10 text-[#00A99D]"
        },
        {
          href: "/teacher/phan-cong-giang-day",
          title: "5. Phân công giảng dạy",
          desc: "Tra cứu danh sách môn giảng dạy và phân công chuyên môn",
          icon: BookMarked,
          iconBg: "bg-purple-500/10 text-purple-600"
        }
      ]
    }
  ]

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800 max-w-7xl mx-auto">
      {/* Welcome Greeting Alert Header */}
      <WelcomeAlert name={userName} />

      {/* Modern Sky-Line SQMS Hero Banner */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#004D4A] to-[#00A99D] rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 translate-y-12 w-64 h-64 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black bg-white/15 border border-white/20 text-teal-100 uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-teal-300 animate-pulse" />
              <span>HỆ THỐNG QUẢN TRỊ CHẤT LƯỢNG GIÁO DỤC SKY-LINE (SQMS)</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Tổng quan Công việc & Chuẩn hóa Đo lường
            </h1>

            <p className="text-xs sm:text-sm text-teal-100/90 font-medium leading-relaxed">
              Theo dõi toàn bộ KPI lớp học, tiến độ đánh giá khảo sát năng lực và danh mục bồi dưỡng học sinh theo tiêu chuẩn giáo dục quốc tế.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-2.5 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-white/15 border border-white/20 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white backdrop-blur-md">
                <CalendarIcon className="w-4 h-4 text-teal-300" />
                <span>Năm học công tác <strong className="text-amber-300 font-extrabold">{activeAcademicYear}</strong></span>
              </div>

              <div className="flex items-center gap-2 bg-white/15 border border-white/20 px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-200 backdrop-blur-md">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>Chuẩn hóa dữ liệu</span>
              </div>
            </div>

            {currentDateStr && (
              <div className="flex items-center gap-2 bg-black/20 border border-white/15 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-teal-200 backdrop-blur-md">
                <Clock className="w-3.5 h-3.5 text-teal-300" />
                <span>Hôm nay: <strong className="text-white font-bold">{currentDateStr}</strong></span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-teal-200/80 font-bold uppercase tracking-widest">
          <span>Sky-Line International Education Standard</span>
          <span className="hidden sm:inline">SQMS Real-time Analytics</span>
        </div>
      </div>

      {/* 6 Real Metric KPI Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#00A99D]" />
            <span>CHỈ SỐ CÔNG TÁC & ĐO LƯỜNG ĐÁNH GIÁ</span>
          </h2>
          <span className="text-[11px] font-semibold text-slate-400">Cập nhật theo thời gian thực</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {statCards.map((card, idx) => {
            const Icon = card.icon
            const CardContent = (
              <div className={`bg-white border border-slate-200 ${card.borderColor} rounded-2xl p-4 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full group`}>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${card.badgeStyle}`}>
                      {card.badge}
                    </span>
                    <div className={`p-2 rounded-xl border ${card.iconBg} group-hover:scale-110 transition-transform`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider line-clamp-1">{card.label}</p>
                    <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">{card.value}</p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100">
                  <p className="text-[11px] font-medium text-slate-500 line-clamp-1">{card.subtext}</p>
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
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 shrink-0">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                HỌC SINH CẦN BỒI DƯỠNG & CHÚ Ý
              </h3>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                {finalMetrics.remedialStudentsCount || 0} Trường hợp
              </span>
            </div>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tình hình rèn luyện ổn định. Chưa ghi nhận học sinh trong diện cảnh báo bồi dưỡng đặc biệt.</span>
            </p>
          </div>
        </div>

        <Link
          href="/teacher/ho-tro-hoc-tap"
          className="py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 text-slate-700 hover:text-[#003B3A] text-xs font-extrabold flex items-center gap-2 transition-all group shrink-0"
        >
          <span>Quản lý danh sách hỗ trợ</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-[#00A99D]" />
        </Link>
      </div>

      {/* Category Action Center (2 Column Responsive Layout) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <div className="w-2 h-4 rounded-full bg-[#00A99D]" />
            <span>Danh mục Thao tác Chuyên môn</span>
          </h2>
          <span className="text-xs font-extrabold text-[#00A99D] hidden sm:inline-block">
            Chọn chức năng để xử lý công việc
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {categorySections.map((sec, secIdx) => (
            <div key={secIdx} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-[#003B3A] uppercase tracking-wider">
                    {sec.categoryName}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">{sec.categoryDesc}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black border ${sec.badgeStyle}`}>
                  {sec.items.length} Chức năng
                </span>
              </div>

              <div className="space-y-2.5">
                {sec.items.map((item, itemIdx) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={itemIdx}
                      href={item.href}
                      className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 hover:bg-teal-50/40 border border-slate-100 hover:border-teal-200 transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border border-slate-200/60 ${item.iconBg} group-hover:scale-110 transition-transform`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-[#003B3A] transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium line-clamp-1">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#00A99D] group-hover:translate-x-1 transition-all shrink-0 ml-2" />
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
