"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ClipboardCheck, Compass, Feather, Heart, Sparkles, LogOut,
  User, Home, ShieldCheck
} from "lucide-react"

export default function HocSinhLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ""
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    // Read session from /api/hocsinh/me
    fetch("/api/hocsinh/me")
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
  }, [pathname])

  const handleLogout = async () => {
    if (confirm("Em có chắc chắn muốn đăng xuất tài khoản học sinh?")) {
      try {
        setLoggingOut(true)
        localStorage.removeItem("currentStudent")
        document.cookie = "hs_token=; path=/; max-age=0;"
        await fetch("/api/hocsinh/logout", { method: "POST" })
        window.location.href = "/login"
      } catch (e) {
        window.location.href = "/login"
      }
    }
  }

  const navItems = [
    {
      href: "/hocsinh/portal",
      label: "Trang chủ",
      icon: Home
    },
    {
      href: "/hocsinh/hs-khaosat/danh-sach",
      label: "1. Khảo sát Học sinh",
      icon: ClipboardCheck
    },
    {
      href: "/hocsinh/portal/muc-tieu",
      label: "2. Sổ Mục tiêu năm học",
      icon: Compass
    },
    {
      href: "/hocsinh/portal/reflection",
      label: "3. Tự đánh giá (Reflection)",
      icon: Feather
    },
    {
      href: "/hocsinh/portal/ho-tro",
      label: "4. Em Cần Hỗ Trợ (SOS)",
      icon: Heart
    }
  ]

  return (
    <div className="min-h-screen bg-[#F5F8F8] flex flex-col font-sans">
      
      {/* Top Main Navigation Header */}
      <header className="bg-gradient-to-r from-[#003B3A] via-[#004D4A] to-[#003B3A] text-white sticky top-0 z-50 shadow-lg border-b border-teal-800/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo & Portal Title */}
          <Link href="/hocsinh/portal" className="flex items-center gap-3 group">
            <div className="p-2 rounded-xl bg-white/15 border border-white/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-teal-300 animate-spin" />
            </div>
            <div>
              <span className="text-[9px] font-black text-teal-300 uppercase tracking-widest block">SKY-LINE EDUCATION</span>
              <h2 className="text-xs sm:text-sm font-black text-white leading-none tracking-tight">CỔNG HỌC SINH 360°</h2>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = item.href === "/hocsinh/portal" 
                ? pathname === "/hocsinh/portal" 
                : pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all duration-150 ${
                    isActive
                      ? "bg-white text-[#003B3A] shadow-md transform -translate-y-0.5 font-black"
                      : "text-teal-100/90 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-teal-600" : "text-teal-300"}`} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Logged in Student Info & Logout Button */}
          <div className="flex items-center gap-3">
            {studentInfo ? (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-bold">
                <User className="w-3.5 h-3.5 text-teal-300" />
                <span className="text-white font-black">{studentInfo.studentName}</span>
                {studentInfo.className && (
                  <span className="px-2 py-0.5 rounded-full bg-teal-400/30 text-teal-200 text-[10px] font-black">
                    {studentInfo.className}
                  </span>
                )}
              </div>
            ) : null}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/80 hover:bg-rose-600 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all transform hover:scale-105 border border-rose-400/40"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{loggingOut ? "..." : "Đăng xuất"}</span>
            </button>
          </div>

        </div>

        {/* Mobile Navigation Header */}
        <div className="lg:hidden flex items-center justify-around border-t border-white/10 p-2 bg-[#002D2C] overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const isActive = item.href === "/hocsinh/portal"
              ? pathname === "/hocsinh/portal"
              : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2 py-1.5 rounded-xl text-[10px] font-black flex flex-col items-center gap-0.5 transition-all whitespace-nowrap ${
                  isActive ? "bg-white text-[#003B3A]" : "text-white/80"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[9px]">{item.label.includes(". ") ? item.label.split(". ")[1] : item.label}</span>
              </Link>
            )
          })}
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
