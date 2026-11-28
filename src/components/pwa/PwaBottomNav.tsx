"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Eye,
  Compass,
  HeartHandshake,
  User,
  KeyRound,
  LogOut,
  X,
  ShieldCheck,
  PenTool,
  LayoutGrid,
  Bell,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { ChangePasswordModal } from "@/components/ChangePasswordModal"
import { DeviceSessionManager } from "@/components/pwa/DeviceSessionManager"
import { AcademicYearSelector } from "@/components/AcademicYearSelector"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

interface PwaBottomNavProps {
  role?: string
}

export function PwaBottomNav({ role = "TEACHER" }: PwaBottomNavProps) {
  const pathname = usePathname() || ""
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false)
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false)
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)

  useEffect(() => {
    fetch("/api/pwa/notifications?unreadOnly=true")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.unreadCount === "number") {
          setUnreadNotifCount(data.unreadCount)
        }
      })
      .catch(() => {})

    const handleCountChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ count?: number }>
      if (typeof customEvent.detail?.count === "number") {
        setUnreadNotifCount(customEvent.detail.count)
      }
    }
    window.addEventListener("ssm-unread-count-changed", handleCountChange)
    return () => window.removeEventListener("ssm-unread-count-changed", handleCountChange)
  }, [])

  if (pathname.includes("/print")) {
    return null
  }

  const isTeacher = role !== "ADMIN"
  const isHome = pathname === "/teacher" || pathname === "/admin"
  const isDuGio = pathname.startsWith("/teacher/du-gio")
  const isEntrance =
    pathname.startsWith("/teacher/input-assessments") ||
    pathname.startsWith("/admin/xet-duyet-ket-qua")
  const isAdvisory = pathname.startsWith("/teacher/co-van-hoc-tap")

  const homeHref = isTeacher ? "/teacher" : "/admin"

  const openSidebarMenu = () => {
    setIsProfileSheetOpen(false)
    window.dispatchEvent(new CustomEvent("toggleSidebar"))
  }

  return (
    <>
      <nav
        aria-label="Thanh điều hướng di động giáo viên"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E2E8F0] px-1 pt-1.5 safe-area-pb flex items-center justify-around shadow-[0_-4px_16px_rgba(0,59,58,0.06)] select-none"
      >
        {/* Tab 1: Hôm nay */}
        <Link
          href={homeHref}
          className={`relative flex flex-col items-center justify-center flex-1 min-h-[48px] rounded-xl transition-colors cursor-pointer ${
            isHome
              ? "text-[#003B3A] font-semibold"
              : "text-slate-500 hover:text-[#00736E] font-medium"
          }`}
        >
          {isHome && (
            <span className="absolute top-0 w-7 h-0.5 rounded-full bg-[#00A19A]" />
          )}
          <div className={`p-1 rounded-lg transition-colors ${isHome ? "bg-[#F0FDFA] text-[#00A19A]" : ""}`}>
            <Home className="w-[18px] h-[18px]" />
          </div>
          <span className="text-[10px] mt-0.5 leading-none">Hôm nay</span>
        </Link>

        {/* Tab 2: Dự giờ */}
        {isTeacher && (
          <Link
            href="/teacher/du-gio"
            className={`relative flex flex-col items-center justify-center flex-1 min-h-[48px] rounded-xl transition-colors cursor-pointer ${
              isDuGio
                ? "text-[#003B3A] font-semibold"
                : "text-slate-500 hover:text-[#00736E] font-medium"
            }`}
          >
            {isDuGio && (
              <span className="absolute top-0 w-7 h-0.5 rounded-full bg-[#00A19A]" />
            )}
            <div className={`p-1 rounded-lg transition-colors ${isDuGio ? "bg-[#F0FDFA] text-[#00A19A]" : ""}`}>
              <Eye className="w-[18px] h-[18px]" />
            </div>
            <span className="text-[10px] mt-0.5 leading-none">Dự giờ</span>
          </Link>
        )}

        {/* Tab 3: Đầu vào */}
        {isTeacher && (
          <Link
            href="/teacher/input-assessments"
            className={`relative flex flex-col items-center justify-center flex-1 min-h-[48px] rounded-xl transition-colors cursor-pointer ${
              isEntrance
                ? "text-[#003B3A] font-semibold"
                : "text-slate-500 hover:text-[#00736E] font-medium"
            }`}
          >
            {isEntrance && (
              <span className="absolute top-0 w-7 h-0.5 rounded-full bg-[#00A19A]" />
            )}
            <div className={`p-1 rounded-lg transition-colors ${isEntrance ? "bg-[#F0FDFA] text-[#00A19A]" : ""}`}>
              <Compass className="w-[18px] h-[18px]" />
            </div>
            <span className="text-[10px] mt-0.5 leading-none">Đầu vào</span>
          </Link>
        )}

        {/* Tab 4: Cố vấn */}
        {isTeacher && (
          <Link
            href="/teacher/co-van-hoc-tap"
            className={`relative flex flex-col items-center justify-center flex-1 min-h-[48px] rounded-xl transition-colors cursor-pointer ${
              isAdvisory
                ? "text-[#003B3A] font-semibold"
                : "text-slate-500 hover:text-[#00736E] font-medium"
            }`}
          >
            {isAdvisory && (
              <span className="absolute top-0 w-7 h-0.5 rounded-full bg-[#00A19A]" />
            )}
            <div className={`p-1 rounded-lg transition-colors ${isAdvisory ? "bg-[#F0FDFA] text-[#00A19A]" : ""}`}>
              <HeartHandshake className="w-[18px] h-[18px]" />
            </div>
            <span className="text-[10px] mt-0.5 leading-none">Cố vấn</span>
          </Link>
        )}

        {/* Tab 5: Cá nhân & Tiện ích */}
        <button
          type="button"
          onClick={() => setIsProfileSheetOpen(true)}
          className={`relative flex flex-col items-center justify-center flex-1 min-h-[48px] rounded-xl transition-colors cursor-pointer ${
            isProfileSheetOpen
              ? "text-[#003B3A] font-semibold"
              : "text-slate-500 hover:text-[#00736E] font-medium"
          }`}
        >
          <div className={`p-1 rounded-lg relative transition-colors ${isProfileSheetOpen ? "bg-[#F0FDFA] text-[#00A19A]" : ""}`}>
            <User className="w-[18px] h-[18px]" />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-0.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#E11D48] text-white text-[9px] font-bold flex items-center justify-center tabular-nums shadow-xs">
                {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 leading-none">Tiện ích</span>
        </button>
      </nav>

      {/* BOTTOM SHEET: TIỆN ÍCH & TÀI KHOẢN */}
      {isProfileSheetOpen && (
        <div
          onClick={() => setIsProfileSheetOpen(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 backdrop-blur-xs animate-in fade-in duration-150 md:hidden"
        >
          <div
            className="w-full max-w-lg bg-white rounded-t-3xl px-4 pt-3 pb-6 safe-area-pb shadow-2xl border-t border-[#E2E8F0] animate-in slide-in-from-bottom duration-200 max-h-[85dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />

            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#003B3A]">Tiện ích & Tài khoản</h3>
              <button
                type="button"
                onClick={() => setIsProfileSheetOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lối tắt phụ nhanh (4 ô gọn) */}
            {isTeacher && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                <Link
                  href="/teacher/tasks"
                  onClick={() => setIsProfileSheetOpen(false)}
                  className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl py-2.5 px-1 flex flex-col items-center gap-1 text-center active:bg-[#F0FDFA]"
                >
                  <CheckSquare className="w-4 h-4 text-[#00736E]" />
                  <span className="text-[10px] font-semibold text-slate-700">Nhiệm vụ</span>
                </Link>
                <Link
                  href="/teacher/notifications"
                  onClick={() => setIsProfileSheetOpen(false)}
                  className="relative bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl py-2.5 px-1 flex flex-col items-center gap-1 text-center active:bg-[#F0FDFA]"
                >
                  <Bell className="w-4 h-4 text-[#00736E]" />
                  <span className="text-[10px] font-semibold text-slate-700">Thông báo</span>
                  {unreadNotifCount > 0 && (
                    <span className="absolute top-1.5 right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#E11D48] text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                      {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/teacher/thoi-khoa-bieu"
                  onClick={() => setIsProfileSheetOpen(false)}
                  className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl py-2.5 px-1 flex flex-col items-center gap-1 text-center active:bg-[#F0FDFA]"
                >
                  <CalendarDays className="w-4 h-4 text-[#00736E]" />
                  <span className="text-[10px] font-semibold text-slate-700">Lịch dạy</span>
                </Link>
                <Link
                  href="/admin/xet-duyet-ket-qua"
                  onClick={() => setIsProfileSheetOpen(false)}
                  className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl py-2.5 px-1 flex flex-col items-center gap-1 text-center active:bg-[#F0FDFA]"
                >
                  <ClipboardCheck className="w-4 h-4 text-[#00736E]" />
                  <span className="text-[10px] font-semibold text-slate-700">Xét duyệt</span>
                </Link>
              </div>
            )}

            {/* Cấu hình nhanh (Năm học & Ngôn ngữ) */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-3 mb-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600">Năm học</span>
                <AcademicYearSelector />
              </div>
              <div className="h-px bg-slate-200/70" />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600">Ngôn ngữ</span>
                <LanguageSwitcher />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={openSidebarMenu}
                className="w-full h-11 rounded-xl bg-[#F0FDFA] hover:bg-[#CCFBF1]/60 text-[#003B3A] border border-[#CCFBF1] font-semibold text-xs flex items-center gap-3 px-3.5 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-[#003B3A] text-white flex items-center justify-center shrink-0">
                  <LayoutGrid className="w-3.5 h-3.5" />
                </div>
                <span>Mở toàn bộ danh mục chức năng</span>
              </button>

              {isTeacher && (
                <Link
                  href="/teacher/profile/chu-ky-so"
                  onClick={() => setIsProfileSheetOpen(false)}
                  className="w-full h-11 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-[#E2E8F0] font-semibold text-xs flex items-center gap-3 px-3.5 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#F0FDFA] text-[#00736E] flex items-center justify-center shrink-0">
                    <PenTool className="w-3.5 h-3.5" />
                  </div>
                  <span>Chữ ký số của tôi</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsProfileSheetOpen(false)
                  setIsDeviceModalOpen(true)
                }}
                className="w-full h-11 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-[#E2E8F0] font-semibold text-xs flex items-center gap-3 px-3.5 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-[#F0FDFA] text-[#00736E] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span>Thiết bị đăng nhập</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsProfileSheetOpen(false)
                  setIsPasswordModalOpen(true)
                }}
                className="w-full h-11 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-[#E2E8F0] font-semibold text-xs flex items-center gap-3 px-3.5 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-[#F0FDFA] text-[#00736E] flex items-center justify-center shrink-0">
                  <KeyRound className="w-3.5 h-3.5" />
                </div>
                <span>Đổi mật khẩu</span>
              </button>

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full h-11 rounded-xl bg-rose-50/70 hover:bg-rose-100/80 text-[#E11D48] border border-rose-200/70 font-semibold text-xs flex items-center gap-3 px-3.5 mt-1 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-100 text-[#E11D48] flex items-center justify-center shrink-0">
                  <LogOut className="w-3.5 h-3.5" />
                </div>
                <span>Đăng xuất khỏi SSM</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
