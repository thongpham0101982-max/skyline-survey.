"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ClipboardList, CheckCircle2, Users, Menu } from "lucide-react"

export function AdminMobileBottomNav() {
  const pathname = usePathname() || ""

  const isDashboard = pathname === "/admin"
  const isSurveys = pathname.includes("/admin/surveys") || pathname.includes("/admin/cau-hinh-khao-sat")
  const isApprovals = pathname.includes("/admin/xet-duyet")
  const isStudents = pathname.includes("/admin/ho-so-hoc-sinh") || pathname.includes("/admin/student")

  const handleToggleMenu = () => {
    window.dispatchEvent(new CustomEvent("toggleSidebar"))
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-2 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)] select-none">
      <Link
        href="/admin"
        className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
          isDashboard ? "text-[#0284C7] font-bold" : "text-slate-500 hover:text-[#0284C7] font-medium"
        }`}
      >
        <div className={`p-1 rounded-lg ${isDashboard ? "bg-[#0284C7]/10" : ""}`}>
          <LayoutDashboard className="w-4 h-4" />
        </div>
        <span>Dashboard</span>
      </Link>

      <Link
        href="/admin/cau-hinh-khao-sat"
        className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
          isSurveys ? "text-[#0284C7] font-bold" : "text-slate-500 hover:text-[#0284C7] font-medium"
        }`}
      >
        <div className={`p-1 rounded-lg ${isSurveys ? "bg-[#0284C7]/10" : ""}`}>
          <ClipboardList className="w-4 h-4" />
        </div>
        <span>Khảo sát</span>
      </Link>

      <Link
        href="/admin/xet-duyet-ket-qua"
        className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
          isApprovals ? "text-[#0284C7] font-bold" : "text-slate-500 hover:text-[#0284C7] font-medium"
        }`}
      >
        <div className={`p-1 rounded-lg ${isApprovals ? "bg-[#0284C7]/10" : ""}`}>
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <span>Xét duyệt</span>
      </Link>

      <Link
        href="/admin/ho-so-hoc-sinh"
        className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
          isStudents ? "text-[#0284C7] font-bold" : "text-slate-500 hover:text-[#0284C7] font-medium"
        }`}
      >
        <div className={`p-1 rounded-lg ${isStudents ? "bg-[#0284C7]/10" : ""}`}>
          <Users className="w-4 h-4" />
        </div>
        <span>Học sinh</span>
      </Link>

      <button
        onClick={handleToggleMenu}
        className="flex flex-col items-center gap-1 text-slate-500 hover:text-[#0284C7] font-medium text-[10px] transition-colors cursor-pointer"
      >
        <div className="p-1 rounded-lg">
          <Menu className="w-4 h-4" />
        </div>
        <span>Menu</span>
      </button>
    </div>
  )
}
