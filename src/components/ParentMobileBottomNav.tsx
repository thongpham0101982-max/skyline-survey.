"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ClipboardList, Compass, GraduationCap, KeyRound, Award } from "lucide-react"
import { ChangePasswordModal } from "@/components/ChangePasswordModal"

export function ParentMobileBottomNav() {
  const pathname = usePathname() || ""
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)

  const isHome = pathname === "/parent"
  const isSurveys = pathname.includes("/parent/surveys")
  const isAdvisory = pathname.includes("/parent/children/advisory")
  const isProfile = pathname.includes("/parent/children/profile")
  const isGrades = pathname.includes("/parent/grades")

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-2 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)] select-none">
        <Link
          href="/parent"
          className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
            isHome ? "text-[#003B3A] font-extrabold" : "text-slate-500 hover:text-[#003B3A] font-medium"
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${isHome ? "bg-teal-50 text-[#003B3A] shadow-xs" : ""}`}>
            <Home className="w-4 h-4" />
          </div>
          <span>Tổng quan</span>
        </Link>

        <Link
          href="/parent/surveys"
          className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
            isSurveys ? "text-[#003B3A] font-extrabold" : "text-slate-500 hover:text-[#003B3A] font-medium"
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${isSurveys ? "bg-teal-50 text-[#003B3A] shadow-xs" : ""}`}>
            <ClipboardList className="w-4 h-4" />
          </div>
          <span>Khảo sát</span>
        </Link>

        <Link
          href="/parent/children/advisory"
          className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
            isAdvisory ? "text-[#003B3A] font-extrabold" : "text-slate-500 hover:text-[#003B3A] font-medium"
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${isAdvisory ? "bg-teal-50 text-[#003B3A] shadow-xs" : ""}`}>
            <Compass className="w-4 h-4" />
          </div>
          <span>Cố vấn</span>
        </Link>


        <Link
          href="/parent/grades"
          className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
            isGrades ? "text-[#003B3A] font-extrabold" : "text-slate-500 hover:text-[#003B3A] font-medium"
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${isGrades ? "bg-teal-50 text-[#003B3A] shadow-xs" : ""}`}>
            <Award className="w-4 h-4" />
          </div>
          <span>Xem điểm</span>
        </Link>
        <Link
          href="/parent/children/profile"
          className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
            isProfile ? "text-[#003B3A] font-extrabold" : "text-slate-500 hover:text-[#003B3A] font-medium"
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${isProfile ? "bg-teal-50 text-[#003B3A] shadow-xs" : ""}`}>
            <GraduationCap className="w-4 h-4" />
          </div>
          <span>Hồ sơ</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsPasswordModalOpen(true)}
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-[#003B3A] font-medium text-[10px] transition-colors cursor-pointer"
        >
          <div className="p-1.5 rounded-xl">
            <KeyRound className="w-4 h-4" />
          </div>
          <span>Đổi MK</span>
        </button>
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  )
}
