"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ClipboardCheck, Compass, Feather, Heart, Sparkles, LogOut,
  User, Home, ShieldCheck, BookOpen, Menu, X, ChevronRight
} from "lucide-react"

export default function HocSinhLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ""
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
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
    { href: "/hocsinh/portal", label: "Trang chủ", icon: Home },
    { href: "/hocsinh/hs-khaosat/danh-sach", label: "1. Khảo sát Học sinh", icon: ClipboardCheck },
    { href: "/hocsinh/portal/muc-tieu", label: "2. Sổ Mục tiêu năm học", icon: Compass },
    { href: "/hocsinh/portal/nhat-ky-co-van", label: "3. Nhật ký Cố vấn GVCN", icon: BookOpen },
    { href: "/hocsinh/portal/reflection", label: "4. Tự đánh giá (Reflection)", icon: Feather },
    { href: "/hocsinh/portal/ho-tro", label: "5. Em Cần Hỗ Trợ (SOS)", icon: Heart }
  ]

  return (
    <div className="min-h-screen bg-[#F4F7F6] flex flex-col font-sans text-slate-800 antialiased selection:bg-teal-500 selection:text-white">
      
      {/* Top Header - Glassmorphic Deep Teal Sky-Line Theme */}
      <header className="bg-[#003B3A]/95 backdrop-blur-md text-white sticky top-0 z-50 shadow-md border-b border-teal-800/50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo & Portal Title */}
          <Link href="/hocsinh/portal" className="flex items-center gap-3 group">
            <div className="p-2 rounded-2xl bg-white/15 border border-white/20 group-hover:scale-105 transition-transform shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300 animate-spin" />
            </div>
            <div>
              <span className="text-[9px] font-black text-teal-300 uppercase tracking-widest block leading-none">SKY-LINE EDUCATION</span>
              <h2 className="text-sm font-black text-white leading-tight tracking-tight mt-0.5">CỔNG HỌC SINH 360°</h2>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1.5">
            {navItems.map((item) => {
              const isActive = item.href === "/hocsinh/portal" 
                ? pathname === "/hocsinh/portal" 
                : pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-2 transition-all duration-200 ${
                    isActive
                      ? "bg-white/20 text-white border border-white/30 shadow-xs backdrop-blur-md"
                      : "text-teal-100/90 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-amber-300" : "text-teal-300/80"}`} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Account Info & Actions */}
          <div className="flex items-center gap-3">
            {studentInfo && (
              <div className="hidden sm:flex items-center gap-2 bg-white/10 border border-white/15 px-3 py-1.5 rounded-2xl text-xs font-bold text-teal-50 backdrop-blur-md">
                <User className="w-3.5 h-3.5 text-amber-300" />
                <span className="truncate max-w-[120px] font-black text-white">{studentInfo.studentName}</span>
                {studentInfo.className && (
                  <span className="text-[10px] bg-teal-800/80 px-2 py-0.5 rounded-lg text-teal-200 border border-teal-700 font-extrabold">
                    {studentInfo.className}
                  </span>
                )}
              </div>
            )}

            <button
              onClick={handleLogout}
              className="p-2 sm:px-3 sm:py-1.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500 text-rose-200 hover:text-white border border-rose-400/30 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-2xs"
              title="Đăng xuất tài khoản"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-[#003B3A] border-t border-teal-800/60 px-4 py-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
            {studentInfo && (
              <div className="p-3 rounded-2xl bg-white/10 text-xs text-white font-bold flex items-center justify-between mb-3 border border-white/15">
                <span>Học sinh: <strong>{studentInfo.studentName}</strong></span>
                <span className="bg-teal-700 px-2 py-0.5 rounded-lg text-[10px]">{studentInfo.className}</span>
              </div>
            )}
            {navItems.map((item) => {
              const isActive = item.href === "/hocsinh/portal" 
                ? pathname === "/hocsinh/portal" 
                : pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full p-3 rounded-2xl text-xs font-black flex items-center justify-between transition-all ${
                    isActive
                      ? "bg-white/20 text-white border border-white/30"
                      : "text-teal-100 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-amber-300" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-teal-400" />
                </Link>
              )
            })}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs font-semibold text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Sky-Line Education. Cổng Học Sinh 360° Đồng Hành Phát Triển.</p>
          <div className="flex items-center gap-4 text-[11px] text-teal-700 font-bold">
            <span>Học tập</span>
            <span>•</span>
            <span>Rèn luyện</span>
            <span>•</span>
            <span>Tâm lý</span>
            <span>•</span>
            <span>Cố vấn</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
