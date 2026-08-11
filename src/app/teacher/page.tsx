"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import {
  Users, Layers, BookOpen, CheckCircle2, Loader2, ArrowRight, Eye,
  TrendingUp, Calendar as CalendarIcon, GraduationCap, Compass, Sparkles, Heart, ShieldCheck,
  AlertCircle, Clock, BarChart3, Award, FileText, ChevronRight, ClipboardCheck, BookMarked
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

  const statCards = [
    {
      label: "Lớp phụ trách",
      value: finalMetrics.totalClasses,
      subtext: "Lớp chủ nhiệm & bộ môn",
      icon: Layers,
      iconBg: "bg-teal-50 text-[#00A99D] border-teal-200",
      borderColor: "border-slate-200 hover:border-teal-300",
      badge: "Đang dạy",
      badgeColor: "bg-teal-50 text-[#003B3A] border-teal-200"
    },
    {
      label: "Tổng học sinh",
      value: totalStudents,
      subtext: "Học sinh trong danh sách",
      icon: Users,
      iconBg: "bg-blue-50 text-blue-600 border-blue-200",
      borderColor: "border-slate-200 hover:border-blue-300",
      badge: "Hồ sơ",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200"
    },
    {
      label: "Phân công giảng dạy",
      value: finalMetrics.totalAssignments,
      subtext: "Môn & nhiệm vụ phân công",
      icon: BookOpen,
      iconBg: "bg-purple-50 text-purple-600 border-purple-200",
      borderColor: "border-slate-200 hover:border-purple-300",
      badge: "Môn học",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      href: "/teacher/phan-cong-giang-day"
    },
    {
      label: "Tiến độ đánh giá",
      value: scoredPercent + "%",
      subtext: `${scoredStudents}/${totalStudents} học sinh hoàn thành`,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 text-emerald-600 border-emerald-200",
      borderColor: "border-slate-200 hover:border-emerald-300",
      badge: scoredPercent === 100 ? "Hoàn thành" : "Thực tế",
      badgeColor: scoredPercent === 100 ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-slate-100 text-slate-700 border-slate-200",
      progress: scoredPercent
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
      {/* Welcome Alert Header */}
      <WelcomeAlert name={userName} />

      {/* Hero Header Banner */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#004D4A] to-[#00A99D] rounded-3xl p-6 sm:p-7 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-extrabold bg-white/15 border border-white/20 text-teal-100 uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              <span>Hệ thống Quản trị Giáo dục Sky-Line</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Tổng quan Công việc Giáo viên
            </h1>
            <p className="text-xs text-slate-100 font-medium">
              Theo dõi dữ liệu công tác giảng dạy, tiến độ đánh giá học sinh năm học <strong className="text-white font-bold">{finalMetrics.academicYearName || "2026 - 2027"}</strong>
            </p>
          </div>

          {currentDateStr && (
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 self-start md:self-auto backdrop-blur-md">
              <Clock className="w-4 h-4 text-teal-300" />
              <span>{currentDateStr}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4 Real Metric KPI Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#00A99D]" />
            <span>Chỉ số Thống kê Thực tế</span>
          </h2>
          <span className="text-[11px] font-semibold text-slate-400">Trực tiếp từ Cơ sở dữ liệu</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, idx) => {
            const Icon = card.icon
            const CardContent = (
              <div className={`bg-white border ${card.borderColor} rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full group`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{card.label}</p>
                    <p className="text-2xl font-black text-slate-900 tracking-tight mt-1">{card.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl border ${card.iconBg} group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-medium text-slate-500">{card.subtext}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${card.badgeColor}`}>
                    {card.badge}
                  </span>
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

      {/* Real Progress Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#00A99D]" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Tiến độ Thực hiện Đánh giá Khảo sát
            </h3>
          </div>
          <span className="text-xs font-extrabold text-[#00A99D]">
            {scoredPercent}% Hoàn thành
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Học sinh đã cập nhật kết quả đánh giá</span>
            <span>{scoredStudents} / {totalStudents} học sinh</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
            <div
              className="bg-gradient-to-r from-[#003B3A] to-[#00A99D] h-full rounded-full transition-all duration-500"
              style={{ width: `${scoredPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Dữ liệu được cập nhật tự động khi Giáo viên nhập kết quả đánh giá trên hệ thống.
          </p>
        </div>
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
