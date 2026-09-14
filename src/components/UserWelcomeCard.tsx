"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { CalendarDays, GraduationCap, KeyRound, ChevronRight } from "lucide-react"
import { ChangePasswordModal } from "./ChangePasswordModal"

// Artwork minh họa trường học Sky-Line và học sinh
export function SchoolCampusArtwork() {
  return (
    <svg
      viewBox="0 0 460 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full object-cover select-none pointer-events-none"
    >
      <defs>
        <linearGradient id="skyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#E0F2FE" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#F0F9FF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="buildingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="roofGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0284C7" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      {/* Mặt trời tỏa nắng */}
      <circle cx="390" cy="40" r="32" fill="#FDE68A" fillOpacity="0.45" />
      <circle cx="390" cy="40" r="20" fill="#FBBF24" fillOpacity="0.3" />

      {/* Mây trời */}
      <path
        d="M120 45 C 130 35, 155 35, 165 45 C 175 45, 185 55, 180 65 C 160 65, 130 65, 115 65 C 110 55, 115 48, 120 45 Z"
        fill="white"
        fillOpacity="0.6"
      />
      <path
        d="M260 30 C 270 22, 290 22, 300 30 C 310 30, 318 38, 315 45 C 300 45, 270 45, 255 45 C 250 38, 255 32, 260 30 Z"
        fill="white"
        fillOpacity="0.5"
      />

      {/* Tòa nhà trường học */}
      <path d="M160 85 L 430 85" stroke="#0284C7" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
      <rect x="175" y="88" width="245" height="92" rx="3" fill="url(#buildingGrad)" stroke="#CBD5E1" strokeWidth="1" />
      <rect x="173" y="85" width="249" height="6" rx="2" fill="url(#roofGrad)" />

      {/* Hàng cửa sổ tầng trên */}
      <rect x="190" y="100" width="22" height="28" rx="2" fill="#38BDF8" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="225" y="100" width="22" height="28" rx="2" fill="#38BDF8" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="260" y="100" width="22" height="28" rx="2" fill="#38BDF8" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="340" y="100" width="22" height="28" rx="2" fill="#38BDF8" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="375" y="100" width="22" height="28" rx="2" fill="#38BDF8" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />

      {/* Cổng chính trung tâm */}
      <rect x="295" y="96" width="32" height="84" rx="2" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1" />
      <rect x="297" y="100" width="28" height="12" rx="1.5" fill="#F59E0B" fillOpacity="0.9" />
      <line x1="300" y1="106" x2="322" y2="106" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <rect x="300" y="148" width="10" height="32" rx="1" fill="#0284C7" fillOpacity="0.6" />
      <rect x="312" y="148" width="10" height="32" rx="1" fill="#0284C7" fillOpacity="0.6" />

      {/* Hàng cửa sổ tầng trệt */}
      <rect x="190" y="140" width="22" height="26" rx="2" fill="#38BDF8" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="225" y="140" width="22" height="26" rx="2" fill="#38BDF8" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="260" y="140" width="22" height="26" rx="2" fill="#38BDF8" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="340" y="140" width="22" height="26" rx="2" fill="#38BDF8" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="375" y="140" width="22" height="26" rx="2" fill="#38BDF8" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />

      {/* Cây cỏ */}
      <path d="M120 190 C 110 160, 140 140, 160 160 C 180 140, 200 160, 190 190 Z" fill="#10B981" fillOpacity="0.75" />
      <path d="M135 190 C 130 170, 150 155, 165 170 C 180 155, 195 170, 185 190 Z" fill="#34D399" fillOpacity="0.7" />
      <path d="M410 190 C 400 165, 425 145, 440 165 C 455 145, 475 165, 465 190 Z" fill="#10B981" fillOpacity="0.7" />

      {/* Sân trường */}
      <path d="M0 185 Q 230 180, 460 185 L 460 220 L 0 220 Z" fill="#E2E8F0" fillOpacity="0.5" />
      <path d="M0 195 Q 230 190, 460 195 L 460 220 L 0 220 Z" fill="#CBD5E1" fillOpacity="0.4" />

      {/* Thầy cô & học sinh minh họa */}
      <g transform="translate(325, 138) scale(0.65)">
        <circle cx="15" cy="12" r="7" fill="#F87171" fillOpacity="0.9" />
        <circle cx="15" cy="12" r="5" fill="#FED7AA" />
        <path d="M10 20 L 20 20 L 23 48 L 7 48 Z" fill="#FFFFFF" />
        <path d="M8 20 L 5 36" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
        <path d="M7 40 L 23 40 L 26 58 L 4 58 Z" fill="#0284C7" />
        <rect x="18" y="24" width="8" height="16" rx="2" fill="#0284C7" />
        <line x1="11" y1="58" x2="11" y2="78" stroke="#FED7AA" strokeWidth="3" strokeLinecap="round" />
        <line x1="19" y1="58" x2="19" y2="78" stroke="#FED7AA" strokeWidth="3" strokeLinecap="round" />
      </g>

      <g transform="translate(355, 136) scale(0.68)">
        <circle cx="15" cy="11" r="6" fill="#1E293B" />
        <circle cx="15" cy="13" r="5" fill="#FED7AA" />
        <path d="M9 20 L 21 20 L 22 45 L 8 45 Z" fill="#FFFFFF" />
        <rect x="5" y="22" width="7" height="18" rx="2" fill="#0284C7" />
        <path d="M8 45 L 22 45 L 22 75 L 16 75 L 15 56 L 14 75 L 8 75 Z" fill="#003B3A" />
      </g>

      <g transform="translate(385, 142) scale(0.62)">
        <circle cx="15" cy="11" r="6" fill="#334155" />
        <circle cx="15" cy="13" r="5" fill="#FED7AA" />
        <path d="M9 20 L 21 20 L 22 45 L 8 45 Z" fill="#FFFFFF" />
        <rect x="18" y="22" width="7" height="16" rx="2" fill="#F59E0B" />
        <path d="M8 45 L 22 45 L 22 72 L 16 72 L 15 54 L 14 72 L 8 72 Z" fill="#0284C7" />
      </g>
    </svg>
  )
}

export interface UserWelcomeCardProps {
  userName?: string
  userInitial?: string
  academicYear?: string
  greetingTitle?: string
  greetingSubtitle?: string
  motto?: string
  showPasswordChange?: boolean
  className?: string
}

export function UserWelcomeCard({
  userName: customUserName,
  userInitial: customInitial,
  academicYear = "2026-2027",
  greetingTitle,
  greetingSubtitle = "Chúc Thầy/Cô một ngày làm việc tràn đầy cảm hứng và hiệu quả cao!",
  motto = "Học để sống hạnh phúc ♡",
  showPasswordChange = true,
  className = ""
}: UserWelcomeCardProps) {
  const { data: session } = useSession()
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [currentDateStr, setCurrentDateStr] = useState("")

  const effectiveUserName = customUserName || session?.user?.name || "KT&ĐBCL"
  const effectiveInitial = (customInitial || effectiveUserName.charAt(0) || "K").toUpperCase()
  const effectiveTitle = greetingTitle || `Xin chào, ${effectiveUserName}!`

  const updateDateTime = useCallback(() => {
    const now = new Date()
    const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"]
    const dayName = days[now.getDay()]
    const date = now.getDate()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const hours = String(now.getHours()).padStart(2, "0")
    const minutes = String(now.getMinutes()).padStart(2, "0")
    setCurrentDateStr(`${dayName}, Ngày ${date} Tháng ${month}, ${year} ${hours}:${minutes}`)
  }, [])

  useEffect(() => {
    updateDateTime()
    const timer = setInterval(updateDateTime, 30000)
    return () => clearInterval(timer)
  }, [updateDateTime])

  return (
    <>
      <div
        className={`bg-gradient-to-r from-sky-100/90 via-sky-50 to-blue-100/70 border border-sky-200/80 rounded-3xl p-4 sm:p-6 md:p-7 shadow-xs relative overflow-hidden ${className}`}
      >
        {/* Vector minh họa trường học Sky-Line & học sinh */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 sm:w-2/5 md:w-1/3 opacity-35 sm:opacity-75 pointer-events-none">
          <SchoolCampusArtwork />
        </div>

        {/* Motto viết tay ở góc phải trên */}
        {motto && (
          <div className="hidden sm:block absolute top-4 right-6 z-10">
            <span
              className="text-base md:text-lg font-bold text-[#0284C7] italic tracking-wide"
              style={{ fontFamily: "'Dancing Script', 'Caveat', 'Segoe Script', cursive" }}
            >
              {motto}
            </span>
          </div>
        )}

        {/* Nội dung chính bên trái */}
        <div className="relative z-10 max-w-2xl">
          {/* Avatar & Lời chào */}
          <div className="flex items-start sm:items-center gap-3.5 mb-3">
            <div className="relative shrink-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#0284C7] to-[#38BDF8] text-white flex items-center justify-center font-black text-xl shadow-md border-2 border-white">
                {effectiveInitial}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                  {effectiveTitle}
                </h1>
                {motto && (
                  <span className="sm:hidden text-xs font-bold text-[#0284C7] italic">
                    • {motto}
                  </span>
                )}
              </div>
              {greetingSubtitle && (
                <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1">
                  {greetingSubtitle}
                </p>
              )}
            </div>
          </div>

          {/* Badges & Nút thao tác nhanh */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap mt-4 pt-3 border-t border-sky-200/50">
            {/* Pill Ngày Giờ */}
            <div className="bg-white/90 backdrop-blur-xs border border-sky-200/80 rounded-full px-3 py-1.5 flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-700 shadow-2xs">
              <CalendarDays className="w-3.5 h-3.5 text-[#0284C7]" />
              <span className="capitalize">{currentDateStr || "Đang tải thời gian..."}</span>
            </div>

            {/* Pill Năm Học */}
            {academicYear && (
              <div className="bg-white/90 backdrop-blur-xs border border-sky-200/80 rounded-full px-3 py-1.5 flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-700 shadow-2xs">
                <GraduationCap className="w-3.5 h-3.5 text-[#007A72]" />
                <span>Năm học: {academicYear}</span>
              </div>
            )}

            {/* Nút Đổi Mật Khẩu */}
            {showPasswordChange && (
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                className="bg-white/90 hover:bg-white border border-sky-200/80 hover:border-[#0284C7] rounded-full px-3 py-1.5 flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-[#0284C7] shadow-2xs transition-all cursor-pointer group"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#0284C7] group-hover:rotate-12 transition-transform" />
                <span>Đổi mật khẩu</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>
      </div>

      {showPasswordChange && (
        <ChangePasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
        />
      )}
    </>
  )
}
