"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ClipboardList, BarChart3, Layers, KeyRound } from "lucide-react"
import { ChangePasswordModal } from "@/components/ChangePasswordModal"

export function TeacherMobileBottomNav() {
  const pathname = usePathname() || ""
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)

  const isHome = pathname === "/teacher"
  const isSurveys = pathname.includes("/teacher/surveys") || pathname.includes("/teacher/nps") || pathname.includes("/teacher/feedback")
  const isGrading = pathname.includes("/teacher/so-diem") || pathname.includes("/teacher/input-assessments")
  const isClasses = pathname.includes("/teacher/classes") || pathname.includes("/teacher/ho-so-hoc-sinh")

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-2 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)] select-none">
        <Link
          href="/teacher"
          className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
            isHome ? "text-[#0284C7] font-bold" : "text-slate-500 hover:text-[#0284C7] font-medium"
          }`}
        >
          <div className={`p-1 rounded-lg ${isHome ? "bg-[#0284C7]/10" : ""}`}>
            <Home className="w-4 h-4" />
          </div>
          <span>Trang chủ</span>
        </Link>

        <Link
          href="/teacher/surveys"
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
          href="/teacher/so-diem-nhan-xet"
          className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
            isGrading ? "text-[#0284C7] font-bold" : "text-slate-500 hover:text-[#0284C7] font-medium"
          }`}
        >
          <div className={`p-1 rounded-lg ${isGrading ? "bg-[#0284C7]/10" : ""}`}>
            <BarChart3 className="w-4 h-4" />
          </div>
          <span>Sổ điểm</span>
        </Link>

        <Link
          href="/teacher/classes"
          className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
            isClasses ? "text-[#0284C7] font-bold" : "text-slate-500 hover:text-[#0284C7] font-medium"
          }`}
        >
          <div className={`p-1 rounded-lg ${isClasses ? "bg-[#0284C7]/10" : ""}`}>
            <Layers className="w-4 h-4" />
          </div>
          <span>Lớp học</span>
        </Link>

        <button
          onClick={() => setIsPasswordModalOpen(true)}
          className="flex flex-col items-center gap-1 text-slate-500 hover:text-[#0284C7] font-medium text-[10px] transition-colors cursor-pointer"
        >
          <div className="p-1 rounded-lg">
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
