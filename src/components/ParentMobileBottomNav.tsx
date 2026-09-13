"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ClipboardList, KeyRound } from "lucide-react"
import { ChangePasswordModal } from "@/components/ChangePasswordModal"

export function ParentMobileBottomNav() {
  const pathname = usePathname() || ""
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)

  const isHome = pathname === "/parent"
  const isSurveys = pathname.includes("/parent/surveys")

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-2 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)] select-none">
        <Link
          href="/parent"
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
          href="/parent/surveys"
          className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
            isSurveys ? "text-[#0284C7] font-bold" : "text-slate-500 hover:text-[#0284C7] font-medium"
          }`}
        >
          <div className={`p-1 rounded-lg ${isSurveys ? "bg-[#0284C7]/10" : ""}`}>
            <ClipboardList className="w-4 h-4" />
          </div>
          <span>Khảo sát</span>
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
