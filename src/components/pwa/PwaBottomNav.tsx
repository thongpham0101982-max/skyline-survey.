"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  CheckSquare,
  Sparkles,
  Bell,
  User,
  KeyRound,
  LogOut,
  X,
  ShieldCheck
} from "lucide-react"
import { signOut } from "next-auth/react"
import { ChangePasswordModal } from "@/components/ChangePasswordModal"
import { DeviceSessionManager } from "@/components/pwa/DeviceSessionManager"

interface PwaBottomNavProps {
  role?: string
}

export function PwaBottomNav({ role = "TEACHER" }: PwaBottomNavProps) {
  const pathname = usePathname() || ""
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false)
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false)

  const isHome = pathname === "/teacher" || pathname === "/admin"
  const isTasks = pathname.includes("/tasks") || pathname.includes("tab=tasks")
  const isAi = pathname.includes("/teacher/ai") || pathname.includes("/admin/ai")
  const isNews = pathname.includes("notifications") || pathname.includes("ban-tin-thong-bao") || pathname.includes("feedback") || pathname.includes("thong-bao")

  const homeHref = role === "ADMIN" ? "/admin" : "/teacher"
  const tasksHref = role === "ADMIN" ? "/admin/tasks" : "/teacher/tasks"
  const aiHref = role === "ADMIN" ? "/admin/ai" : "/teacher/ai"
  const newsHref = role === "ADMIN" ? "/admin/logs" : "/teacher/notifications"

  return (
    <>
      <nav
        aria-label="Thanh điều hướng di động SSM PWA"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E6ECEA] px-1 py-1.5 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,59,58,0.06)] select-none safe-area-pb"
      >
        {/* Tab 1: Hôm nay */}
        <Link
          href={homeHref}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-xl transition-all cursor-pointer ${
            isHome && !isTasks && !isAi
              ? "text-[#00A19A] font-bold"
              : "text-slate-500 hover:text-[#00A19A] font-medium"
          }`}
        >
          <div className={`p-1 rounded-lg ${isHome && !isTasks && !isAi ? "bg-[#00A19A]/10" : ""}`}>
            <Home className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 leading-none">Hôm nay</span>
        </Link>

        {/* Tab 2: Việc */}
        <Link
          href={tasksHref}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-xl transition-all cursor-pointer ${
            isTasks
              ? "text-[#00A19A] font-bold"
              : "text-slate-500 hover:text-[#00A19A] font-medium"
          }`}
        >
          <div className={`p-1 rounded-lg ${isTasks ? "bg-[#00A19A]/10" : ""}`}>
            <CheckSquare className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 leading-none">Việc</span>
        </Link>

        {/* Tab 3: SSM AI (Highlighted Brand Action) */}
        <Link
          href={aiHref}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-xl transition-all cursor-pointer ${
            isAi
              ? "text-[#00A19A] font-bold"
              : "text-slate-500 hover:text-[#00A19A] font-medium"
          }`}
        >
          <div
            className={`p-1.5 rounded-xl ${
              isAi
                ? "bg-[#00A19A] text-white shadow-[0_2px_10px_rgba(0,161,154,0.4)]"
                : "bg-[#003B3A]/10 text-[#003B3A]"
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5 leading-none font-bold">SSM AI</span>
        </Link>

        {/* Tab 4: Tin */}
        <Link
          href={newsHref}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-xl transition-all cursor-pointer ${
            isNews
              ? "text-[#00A19A] font-bold"
              : "text-slate-500 hover:text-[#00A19A] font-medium"
          }`}
        >
          <div className={`p-1 rounded-lg ${isNews ? "bg-[#00A19A]/10" : ""}`}>
            <Bell className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 leading-none">Thông báo</span>
        </Link>

        {/* Tab 5: Tôi */}
        <button
          onClick={() => setIsProfileSheetOpen(true)}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] rounded-xl text-slate-500 hover:text-[#00A19A] font-medium transition-all cursor-pointer"
        >
          <div className="p-1 rounded-lg">
            <User className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 leading-none">Tôi</span>
        </button>
      </nav>

      {/* BOTTOM SHEET FOR "TÔI" */}
      {isProfileSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-white rounded-t-3xl p-5 shadow-2xl border-t border-[#E6ECEA] animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4"></div>

            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#003B3A]">Tài khoản cá nhân</h3>
              <button
                onClick={() => setIsProfileSheetOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setIsProfileSheetOpen(false)
                  setIsDeviceModalOpen(true)
                }}
                className="w-full h-12 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-3 px-4 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#00A19A] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span>Thiết bị đăng nhập</span>
              </button>
              <button
                onClick={() => {
                  setIsProfileSheetOpen(false)
                  setIsPasswordModalOpen(true)
                }}
                className="w-full h-12 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-3 px-4 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#00A19A] flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <span>Đổi mật khẩu</span>
              </button>

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full h-12 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs flex items-center gap-3 px-4 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                  <LogOut className="w-4 h-4" />
                </div>
                <span>Đăng xuất khỏi SSM</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
      <DeviceSessionManager
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
      />
    </>
  )
}
