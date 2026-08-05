"use client"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Users, Layers, BookOpen, CheckCircle2, Loader2, ArrowRight, Eye, TrendingUp, Calendar } from "lucide-react"
import { WelcomeAlert } from "@/components/WelcomeAlert"
import Link from "next/link"

export default function TeacherDashboard() {
  const { data: session, status } = useSession()
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const userName = session?.user?.name || "Thay/Co"

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        const yearId = localStorage.getItem("selectedAcademicYear") || "";
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
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00A99D, #0EA5E9)' }}>
            <Loader2 className="w-7 h-7 text-white animate-spin" />
          </div>
        </div>
        <p className="text-slate-400 font-bold tracking-wide uppercase text-xs">Dang tai thong ke...</p>
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
      label: "Lop phu trach",
      value: finalMetrics.totalClasses,
      icon: Layers,
      iconBg: "#E0F2FE",
      iconColor: "#0284C7",
      borderColor: "#BAE6FD",
      accent: "#0EA5E9",
    },
    {
      label: "Hoc sinh",
      value: finalMetrics.totalStudents,
      icon: Users,
      iconBg: "#FEF3C7",
      iconColor: "#D97706",
      borderColor: "#FDE68A",
      accent: "#F59E0B",
    },
    {
      label: "Phan cong mon",
      value: finalMetrics.totalAssignments,
      icon: BookOpen,
      iconBg: "#E0E7FF",
      iconColor: "#4F46E5",
      borderColor: "#C7D2FE",
      accent: "#6366F1",
      href: "/teacher/phan-cong-giang-day",
    },
    {
      label: "Da cham diem",
      value: finalMetrics.scoredStudents,
      icon: CheckCircle2,
      iconBg: "#D1FAE5",
      iconColor: "#059669",
      borderColor: "#A7F3D0",
      accent: "#10B981",
    },
  ]

  const quickLinks = [
    {
      href: "/teacher/du-gio",
      title: "Du gio Giao vien",
      desc: "Quan ly tiet day va du gio chuyen mon",
      iconBg: "linear-gradient(135deg, #00A99D, #0EA5E9)",
      icon: Eye,
      badge: "Trang chu",
    },
    {
      href: "/teacher/input-assessments?type=general",
      title: "Nhap ket qua Khao sat",
      desc: "Cap nhat diem so va nhan xet hoc sinh",
      iconBg: "linear-gradient(135deg, #003B3A, #00A99D)",
      icon: TrendingUp,
      badge: "Nhap lieu",
    },
    {
      href: "/teacher/classes",
      title: "Lop hoc cua toi",
      desc: "Quan ly va xem danh sach hoc sinh",
      iconBg: "linear-gradient(135deg, #4F46E5, #0EA5E9)",
      icon: Layers,
      badge: "Lop chu nhiem",
    },
]

  return (
    <div className="space-y-6 teacher-fade-in pb-12">
      <WelcomeAlert name={userName} />

      {/* Page header */}
      <div className="teacher-page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-white/80" />
              Tong quan Cong viec
            </h1>
            <p className="text-white/70 text-xs font-medium mt-1">
              Nam hoc:
              <span className="ml-1 font-black text-white">{finalMetrics.academicYearName || "---"}</span>
              &nbsp;·&nbsp; Thong ke lop hoc va nhiem vu phan cong cua ban.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white text-xs font-bold">He thong hoat dong</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="teacher-grid-4">
        {statCards.map((card) => {
          const Icon = card.icon
          const CardContent = (
            <div
              className="teacher-stat-card group h-full relative"
              style={{ borderTop: `3px solid ${card.accent}` }}
            >
              <div
                className="teacher-stat-icon"
                style={{ background: card.iconBg, border: `1px solid ${card.borderColor}` }}
              >
                <Icon className="w-5 h-5" style={{ color: card.iconColor }} />
              </div>
              <div>
                <p className="teacher-stat-label">{card.label}</p>
                <p className="teacher-stat-value">{card.value}</p>
              </div>
              {/* Decorative blob */}
              <div
                className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-40 -mt-4 -mr-4 group-hover:scale-125 transition-transform duration-500"
                style={{ background: card.iconBg }}
              />
            </div>
          );

          if ((card as any).href) {
            return (
              <Link key={card.label} href={(card as any).href} className="block transition-all hover:scale-[1.02] h-full">
                {CardContent}
              </Link>
            )
          }

          return <div key={card.label}>{CardContent}</div>
        })}
      </div>

      {/* Quick links */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-[#00A99D] to-[#0EA5E9]" />
          <h2 className="text-sm font-black text-[#003B3A]">Loi tat cong viec</h2>
        </div>
        <div className="teacher-grid-2">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-4 bg-white border border-slate-100 rounded-2xl p-4 hover:shadow-md hover:border-[#00A99D]/30 transition-all duration-200"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
                  style={{ background: link.iconBg, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 text-xs group-hover:text-[#00A99D] transition-colors truncate">{link.title}</h3>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 flex-shrink-0">{link.badge}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">{link.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#00A99D] group-hover:translate-x-1 transition-all flex-shrink-0" />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
