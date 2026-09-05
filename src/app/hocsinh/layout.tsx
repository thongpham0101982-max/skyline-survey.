"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ClipboardCheck, Compass, Heart, Sparkles, LogOut,
  User, Home, BookOpen, Menu, X, ChevronRight, Activity, Shield
} from "lucide-react"

export default function HocSinhLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ""
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
    { href: "/hocsinh/portal/danh-gia-nang-luc", label: "Radar Năng lực", icon: Activity },
    { href: "/hocsinh/portal/muc-tieu", label: "Sổ Mục tiêu", icon: Compass },
    { href: "/hocsinh/hs-khaosat/danh-sach", label: "Khảo sát", icon: ClipboardCheck },
    { href: "/hocsinh/portal/nhat-ky-co-van", label: "Nhật ký Cố vấn", icon: BookOpen },
    { href: "/hocsinh/portal/ho-tro", label: "Em Cần Hỗ Trợ", icon: Heart, highlight: true }
  ]

  return (
    <div className="min-h-screen bg-[#F6F9F9] flex flex-col font-sans text-slate-800 antialiased selection:bg-[#007A72] selection:text-white">
      
      {/* Top Header - Official Sky-Line Teal Theme */}
      <header className="bg-[#003B3A] text-white sticky top-0 z-50 shadow-md border-b border-teal-800/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo & Portal Title */}
          <Link href="/hocsinh/portal" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-all shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-black text-teal-300 uppercase tracking-widest block leading-none">
                SKY-LINE EDUCATION
              </span>
              <h2 className="text-sm font-black text-white leading-tight tracking-tight mt-0.5 flex items-center gap-1.5">
                <span>CỔNG HỌC SINH 360°</span>
              </h2>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
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
                  className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all duration-200 ${
                    isActive
                      ? "bg-white text-[#003B3A] shadow-sm"
                      : item.highlight
                      ? "bg-rose-500/25 text-rose-100 hover:bg-rose-500 hover:text-white border border-rose-400/30"
                      : "text-teal-100/90 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#003B3A]" : item.highlight ? "text-rose-300" : "text-teal-300"}`} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Account Info & Actions */}
          <div className="flex items-center gap-2.5">
            {studentInfo && (
              <div className="hidden sm:flex items-center gap-2 bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-50">
                <div className="w-6 h-6 rounded-lg bg-teal-600/80 flex items-center justify-center font-bold text-white text-[11px]">
                  {studentInfo.studentName ? studentInfo.studentName.charAt(0) : "H"}
                </div>
                <div className="text-left leading-none">
                  <p className="truncate max-w-[130px] font-black text-white text-xs">{studentInfo.studentName}</p>
                  <p className="text-[10px] text-teal-300 font-semibold mt-0.5">{studentInfo.className || "Học sinh"}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-rose-600 text-teal-100 hover:text-white border border-white/15 hover:border-rose-500 text-xs font-bold flex items-center gap-1.5 transition-all"
              title="Đăng xuất tài khoản"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#002D2C] border-t border-teal-800/80 px-4 py-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
            {studentInfo && (
              <div className="p-3 rounded-xl bg-white/10 text-xs text-white font-bold flex items-center justify-between mb-3 border border-white/15">
                <div>
                  <p className="text-white font-black">{studentInfo.studentName}</p>
                  <p className="text-[11px] text-teal-300 font-semibold">{studentInfo.studentCode} • {studentInfo.className}</p>
                </div>
                <span className="px-2 py-1 bg-teal-700/80 rounded-lg text-[10px] font-bold text-teal-100">
                  {studentInfo.campusName || "Sky-Line"}
                </span>
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
                  className={`w-full p-3 rounded-xl text-xs font-black flex items-center justify-between transition-all ${
                    isActive
                      ? "bg-white text-[#003B3A]"
                      : item.highlight
                      ? "bg-rose-500/20 text-rose-100 border border-rose-500/30"
                      : "text-teal-100 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-[#003B3A]" : item.highlight ? "text-rose-400" : "text-teal-300"}`} />
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
      <footer className="bg-white border-t border-slate-200/80 py-6 text-center text-xs font-medium text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-black text-[#003B3A]">SKY-LINE EDUCATION</span>
            <span className="text-slate-300">|</span>
            <span>Hệ Thống Giáo Dục Khai Phóng Chuẩn Quốc Tế</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-bold text-teal-800">
            <span>5 Trụ Cột Phát Triển</span>
            <span>•</span>
            <span>Trí tuệ</span>
            <span>•</span>
            <span>Thể chất</span>
            <span>•</span>
            <span>Tâm hồn</span>
            <span>•</span>
            <span>Kỹ năng</span>
            <span>•</span>
            <span>Hội nhập</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
