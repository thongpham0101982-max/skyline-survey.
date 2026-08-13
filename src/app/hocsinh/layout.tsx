"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ClipboardCheck, Compass, Feather, Heart, Sparkles, BookOpen } from "lucide-react"

export default function HocSinhLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ""

  const navItems = [
    {
      href: "/hocsinh/hs-khaosat/danh-sach",
      label: "1. Khảo sát Học sinh",
      icon: ClipboardCheck,
      color: "bg-blue-500/20 text-blue-600 border-blue-200"
    },
    {
      href: "/hocsinh/portal/muc-tieu",
      label: "2. Sổ Mục tiêu năm học",
      icon: Compass,
      color: "bg-teal-500/20 text-teal-600 border-teal-200"
    },
    {
      href: "/hocsinh/portal/reflection",
      label: "3. Tự đánh giá (Reflection)",
      icon: Feather,
      color: "bg-amber-500/20 text-amber-600 border-amber-200"
    },
    {
      href: "/hocsinh/portal/ho-tro",
      label: "4. Em Cần Hỗ Trợ (SOS)",
      icon: Heart,
      color: "bg-rose-500/20 text-rose-600 border-rose-200"
    }
  ]

  return (
    <div className="min-h-screen bg-[#F5F8F8] flex flex-col font-sans">
      {/* Top Main Navigation Header */}
      <header className="bg-[#003B3A] text-white sticky top-0 z-50 shadow-md border-b border-teal-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Portal Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 border border-white/15">
              <Sparkles className="w-5 h-5 text-teal-300 animate-spin" />
            </div>
            <div>
              <span className="text-[10px] font-black text-teal-300 uppercase tracking-widest block">SKY-LINE EDUCATION</span>
              <h2 className="text-sm font-black text-white leading-none">CỔNG HỌC SINH 360°</h2>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all duration-200 ${
                    isActive
                      ? "bg-white text-[#003B3A] shadow-md transform -translate-y-0.5"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-teal-600" : "text-teal-200"}`} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Mobile Nav Header */}
        <div className="md:hidden flex items-center justify-around border-t border-white/10 p-2 bg-[#002D2C]">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`p-2 rounded-xl text-[11px] font-black flex flex-col items-center gap-1 transition-all ${
                  isActive ? "bg-white text-[#003B3A]" : "text-white/70"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[9px]">{item.label.split(". ")[1]}</span>
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
