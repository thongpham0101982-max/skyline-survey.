"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ClipboardCheck,
  Compass,
  Heart,
  Sparkles,
  LogOut,
  LayoutDashboard,
  BookOpen,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Activity,
  Bell,
  Globe,
  Camera,
  GraduationCap,
  Award
} from "lucide-react"
import { LanguageSwitcher, VietnamFlag, UKFlag } from "@/components/LanguageSwitcher"

export default function HocSinhLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ""
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [reflectionTask, setReflectionTask] = useState<any>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [lang, setLang] = useState<"vi" | "en">("vi")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ssm_lang")
      if (saved === "en" || saved === "vi") setLang(saved)
    }
    const handleLangEvent = (e: any) => {
      if (e.detail === "en" || e.detail === "vi") setLang(e.detail)
    }
    window.addEventListener("ssm_language_change", handleLangEvent)
    return () => window.removeEventListener("ssm_language_change", handleLangEvent)
  }, [])

  const handleLanguageChange = (newLang: "vi" | "en") => {
    setLang(newLang)
    if (typeof window !== "undefined") {
      localStorage.setItem("ssm_lang", newLang)
      window.dispatchEvent(new CustomEvent("ssm_language_change", { detail: newLang }))
    }
  }

  useEffect(() => {
    fetch("/api/hocsinh/me", { cache: "no-store" })
      .then(r => {
        if (!r.ok) return null
        return r.json()
      })
      .then(data => {
        if (data && data.studentCode) {
          setStudentInfo(data)
          localStorage.setItem("currentStudent", JSON.stringify(data))
        }
      })
      .catch(console.error)

    fetch("/api/reflection-pride/student", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data) setReflectionTask(data)
      })
      .catch(() => {})
  }, [pathname])

  const handleLogout = async () => {
    if (confirm("Em có chắc chắn muốn đăng xuất tài khoản học sinh?")) {
      try {
        localStorage.removeItem("currentStudent")
        document.cookie = "hs_token=; path=/; max-age=0;"
        await fetch("/api/hocsinh/logout", { method: "POST" })
        window.location.href = "/login"
      } catch (e) {
        window.location.href = "/login"
      }
    }
  }

  const parsedGrade = (() => {
    const cls = String(studentInfo?.className || studentInfo?.grade || "")
    const m = cls.match(/^(\d{1,2})/)
    if (m) return parseInt(m[1], 10)
    if (reflectionTask?.eligible !== undefined) return reflectionTask.eligible ? 10 : 2
    return 2
  })()
  const isGrade1To5 = parsedGrade >= 1 && parsedGrade <= 5
  const isGrade4To12 = parsedGrade >= 4 && parsedGrade <= 12

  const navItems: Array<{
    href: string
    labelVi: string
    labelEn: string
    icon: any
    iconColor: string
    activeClass: string
    badge?: string
  }> = [
    {
      href: "/hocsinh/portal",
      labelVi: "Tổng quan",
      labelEn: "Overview",
      icon: LayoutDashboard,
      iconColor: "text-teal-300",
      activeClass: "bg-white/20 text-white border border-[#135E5B]/30"
    },
    {
      href: "/hocsinh/portal/hanh-trinh-skyline",
      labelVi: "Hành trình Sky-Line",
      labelEn: "Sky-Line Adventure",
      icon: Compass,
      iconColor: "text-amber-300",
      activeClass: "bg-amber-500/35 text-white border border-amber-400/60",
      badge: isGrade1To5 ? "ĐẢO GAME" : undefined
    },
    ...(isGrade4To12
      ? [
          {
            href: "/hocsinh/portal/reflection",
            labelVi: "Hành trình trưởng thành",
            labelEn: "Growth & Pride NPS",
            icon: Award,
            iconColor: "text-amber-300",
            activeClass: "bg-purple-500/35 text-white border border-purple-400/60",
            badge:
              reflectionTask?.hasOpenTask && reflectionTask?.reflection?.status !== "SUBMITTED"
                ? "MỚI"
                : undefined
          }
        ]
      : []),
    {
      href: "/hocsinh/portal/thong-bao",
      labelVi: "Thông báo & Liên lạc",
      labelEn: "Notifications",
      icon: Bell,
      iconColor: "text-purple-300",
      activeClass: "bg-purple-500/35 text-white border border-purple-400/60"
    },
    {
      href: "/hocsinh/portal/muc-tieu",
      labelVi: "Sổ Mục tiêu SMART",
      labelEn: "SMART Goals",
      icon: Compass,
      iconColor: "text-emerald-300",
      activeClass: "bg-white/20 text-white border border-[#135E5B]/30"
    },
    {
      href: "/hocsinh/portal/khao-sat-holland",
      labelVi: "Khảo sát Hướng nghiệp",
      labelEn: "Career & Psych",
      icon: Sparkles,
      iconColor: "text-amber-300",
      activeClass: "bg-white/20 text-white border border-[#135E5B]/30"
    },
    {
      href: "/hocsinh/portal/nhat-ky-co-van",
      labelVi: "Cố vấn học tập & 1:1",
      labelEn: "Academic Advisory",
      icon: BookOpen,
      iconColor: "text-teal-300",
      activeClass: "bg-white/20 text-white border border-[#135E5B]/30"
    },
    {
      href: "/hocsinh/hs-khaosat/danh-sach",
      labelVi: "Khảo sát định kỳ",
      labelEn: "Periodic Surveys",
      icon: ClipboardCheck,
      iconColor: "text-amber-400",
      activeClass: "bg-white/20 text-white border border-[#135E5B]/30"
    },
    {
      href: "/hocsinh/portal/upload-anh",
      labelVi: "Hồ sơ & Ảnh thẻ",
      labelEn: "Student Profile",
      icon: GraduationCap,
      iconColor: "text-sky-300",
      activeClass: "bg-white/20 text-white border border-[#135E5B]/30"
    },
    {
      href: "/hocsinh/portal/ho-tro",
      labelVi: "Em Cần Hỗ Trợ (SOS)",
      labelEn: "Student Support",
      icon: Heart,
      iconColor: "text-rose-300",
      activeClass: "bg-rose-500/35 text-white border border-rose-400/60"
    }
  ]

  return (
    <div className="flex min-h-screen text-xs font-semibold font-sans text-slate-800 antialiased">
      {/* Mobile Dark Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity duration-300 animate-in fade-in"
        />
      )}

      {/* Left Sidebar — Identical Design to Parent Portal (PHHS) */}
      <aside
        className={`${
          isCollapsed ? "w-20" : "w-64"
        } bg-[#003B3A] text-white p-6 flex flex-col shadow-xl fixed md:sticky inset-y-0 left-0 z-40 h-screen transition-transform duration-300 shrink-0 print:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div
          className={`flex items-center ${
            isCollapsed ? "justify-center" : "justify-between px-2"
          } mb-8`}
        >
          <Link href="/hocsinh/portal" className="flex items-center">
            <img
              src="/logo.png"
              alt="Sky-Line"
              className={`h-8 w-auto object-contain brightness-0 invert opacity-95 transition-all ${
                isCollapsed ? "scale-75" : ""
              }`}
            />
          </Link>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex flex-col space-y-1 flex-grow overflow-y-auto pr-2 custom-scrollbar">
          {navItems.map(item => {
            const isActive =
              item.href === "/hocsinh/portal"
                ? pathname === "/hocsinh/portal"
                : pathname.startsWith(item.href)
            const Icon = item.icon
            const label = lang === "en" ? item.labelEn : item.labelVi

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                title={isCollapsed ? label : undefined}
                className={`group relative flex items-center ${
                  isCollapsed ? "justify-center px-2" : "px-3"
                } py-2.5 rounded-xl transition-all text-xs font-medium ${
                  isActive
                    ? item.activeClass
                    : "text-white/75 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${isCollapsed ? "" : "mr-2.5"} ${
                    item.iconColor
                  } shrink-0`}
                />
                {!isCollapsed && (
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis flex-grow">
                    {label}
                  </span>
                )}
                {!isCollapsed && item.badge && (
                  <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-black text-purple-950">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Sidebar Controls: Language Switcher, Collapse, Sign Out */}
        <div className="mt-auto pt-3 flex flex-col gap-2">
          <div
            className={`flex items-center ${
              isCollapsed ? "justify-center p-1.5" : "justify-between px-3 py-1.5"
            } bg-white/5 border border-white/10 rounded-xl transition-all`}
          >
            {!isCollapsed && (
              <span className="text-[11px] text-white/70 font-medium flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-teal-400" />
                <span>{lang === "en" ? "Language" : "Ngôn ngữ"}</span>
              </span>
            )}
            <div className={`flex items-center gap-1 ${isCollapsed ? "flex-col" : ""}`}>
              <button
                type="button"
                onClick={() => handleLanguageChange("vi")}
                className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  lang === "vi"
                    ? "bg-[#48BFE3] text-slate-900 shadow-xs"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
                title="Tiếng Việt"
              >
                <span className="inline-flex shrink-0 overflow-hidden rounded-[2px] border border-black/10">
                  <VietnamFlag className="w-[14px] h-[9px]" />
                </span>
                <span>VI</span>
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange("en")}
                className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  lang === "en"
                    ? "bg-[#48BFE3] text-slate-900 shadow-xs"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`}
                title="English"
              >
                <span className="inline-flex shrink-0 overflow-hidden rounded-[2px] border border-black/10">
                  <UKFlag className="w-[14px] h-[9px]" />
                </span>
                <span>EN</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`hidden md:flex items-center ${
              isCollapsed ? "justify-center" : "px-4"
            } py-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 text-sm font-medium group w-full cursor-pointer`}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-3 text-white/60 group-hover:text-white transition-colors" />
                <span className="whitespace-nowrap">
                  {lang === "en" ? "Collapse" : "Thu gọn"}
                </span>
              </>
            )}
          </button>

          <div className="border-t border-white/20 pt-2" />

          <button
            type="button"
            onClick={handleLogout}
            className={`flex items-center w-full ${
              isCollapsed ? "justify-center" : "px-4"
            } py-2.5 text-white/70 hover:text-white hover:bg-red-500/10 rounded-xl transition-all duration-200 text-sm font-medium group cursor-pointer`}
          >
            <LogOut
              className={`w-4 h-4 ${
                isCollapsed ? "" : "mr-3"
              } text-white/50 group-hover:text-red-400 transition-colors`}
            />
            {!isCollapsed && <span>{lang === "en" ? "Sign out" : "Đăng xuất"}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area — Identical Structure to ParentLayout */}
      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden bg-slate-50/50">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200/90 bg-white/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="md:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="Sky-Line"
                className="h-7 w-auto object-contain md:hidden"
              />
              <div className="flex flex-col">
                <span className="text-xs md:text-sm font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                  <span className="text-[#0284C7] font-semibold uppercase tracking-wide">
                    SQMS
                  </span>
                  <span className="hidden md:inline text-xs font-bold text-slate-400">
                    • Học sinh
                  </span>
                </span>
                <span className="md:hidden text-[9px] text-[#48BFE3] font-bold leading-none">
                  Cổng Học Sinh 360°
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />

            {studentInfo?.academicYearName && (
              <span className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-bold text-slate-700">
                Năm học: {studentInfo.academicYearName}
              </span>
            )}

            <Link
              href="/hocsinh/portal/thong-bao"
              className="p-2 rounded-xl bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-[#5B2D8B] border border-slate-200/80 transition-colors relative"
              title="Trung tâm Thông báo"
            >
              <Bell className="w-4 h-4" />
            </Link>

            {studentInfo && (
              <div className="flex items-center gap-2 bg-slate-100/90 border border-slate-200/80 px-2.5 py-1.5 rounded-xl text-xs">
                <div className="w-6 h-6 rounded-lg bg-[#003B3A] flex items-center justify-center font-bold text-white text-[11px] shrink-0">
                  {studentInfo.studentName ? studentInfo.studentName.charAt(0) : "H"}
                </div>
                <div className="hidden sm:block text-left leading-none">
                  <p className="truncate max-w-[140px] font-black text-slate-800 text-xs">
                    {studentInfo.studentName}
                  </p>
                  <p className="text-[10px] text-teal-700 font-semibold mt-0.5">
                    {studentInfo.className || "Học sinh"} • {studentInfo.studentCode}
                  </p>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="p-3.5 sm:p-6 md:p-8 pb-24 md:pb-12 flex-1 overflow-x-auto overflow-y-auto text-xs font-semibold">
          {children}
        </div>

        {/* Mobile Bottom Navigation — Identical Style to ParentMobileBottomNav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-2 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)] select-none print:hidden">
          <Link
            href="/hocsinh/portal"
            className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
              pathname === "/hocsinh/portal"
                ? "text-[#003B3A] font-bold"
                : "text-slate-500 hover:text-[#003B3A] font-medium"
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                pathname === "/hocsinh/portal" ? "bg-teal-50 text-[#003B3A] shadow-xs" : ""
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
            </div>
            <span>Tổng quan</span>
          </Link>

          <Link
            href="/hocsinh/portal/thong-bao"
            className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
              pathname.includes("/thong-bao")
                ? "text-[#5B2D8B] font-bold"
                : "text-slate-500 hover:text-[#5B2D8B] font-medium"
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                pathname.includes("/thong-bao") ? "bg-purple-100 text-[#5B2D8B] shadow-xs" : ""
              }`}
            >
              <Bell className="w-4 h-4" />
            </div>
            <span>Thông báo</span>
          </Link>

          {isGrade4To12 && (
            <Link
              href="/hocsinh/portal/reflection"
              className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
                pathname.includes("/reflection")
                  ? "text-[#5B2D8B] font-bold"
                  : "text-slate-500 hover:text-[#5B2D8B] font-medium"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  pathname.includes("/reflection") ? "bg-purple-100 text-[#5B2D8B] shadow-xs" : ""
                }`}
              >
                <Award className="w-4 h-4" />
              </div>
              <span>Trưởng thành</span>
            </Link>
          )}

          <Link
            href="/hocsinh/portal/muc-tieu"
            className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
              pathname.includes("/muc-tieu")
                ? "text-[#003B3A] font-bold"
                : "text-slate-500 hover:text-[#003B3A] font-medium"
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                pathname.includes("/muc-tieu") ? "bg-teal-50 text-[#003B3A] shadow-xs" : ""
              }`}
            >
              <Compass className="w-4 h-4" />
            </div>
            <span>Mục tiêu</span>
          </Link>

          <Link
            href="/hocsinh/portal/khao-sat-holland"
            className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
              pathname.includes("/khao-sat-holland")
                ? "text-[#5B2D8B] font-bold"
                : "text-slate-500 hover:text-[#5B2D8B] font-medium"
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                pathname.includes("/khao-sat-holland") ? "bg-purple-100 text-[#5B2D8B] shadow-xs" : ""
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <span>Holland</span>
          </Link>

          <Link
            href="/hocsinh/portal/nhat-ky-co-van"
            className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
              pathname.includes("/nhat-ky-co-van")
                ? "text-[#003B3A] font-bold"
                : "text-slate-500 hover:text-[#003B3A] font-medium"
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                pathname.includes("/nhat-ky-co-van") ? "bg-teal-50 text-[#003B3A] shadow-xs" : ""
              }`}
            >
              <BookOpen className="w-4 h-4" />
            </div>
            <span>Cố vấn</span>
          </Link>

          <Link
            href="/hocsinh/portal/ho-tro"
            className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
              pathname.includes("/ho-tro")
                ? "text-rose-600 font-bold"
                : "text-rose-500 hover:text-rose-700 font-medium"
            }`}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                pathname.includes("/ho-tro") ? "bg-rose-50 text-rose-600 shadow-xs" : ""
              }`}
            >
              <Heart className="w-4 h-4" />
            </div>
            <span>Hỗ trợ</span>
          </Link>
        </div>
      </main>
    </div>
  )
}
