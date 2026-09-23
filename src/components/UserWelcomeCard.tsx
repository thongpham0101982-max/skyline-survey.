"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { CalendarDays, GraduationCap, KeyRound, ChevronRight, School, BookOpen, RefreshCw } from "lucide-react"
import { ChangePasswordModal } from "./ChangePasswordModal"
import { resolveCampusTheme, CampusTheme } from "@/hooks/useCampusTheme"

// Artwork minh họa trường học Sky-Line linh hoạt theo màu sắc nhận diện cơ sở
export function SchoolCampusArtwork({ theme }: { theme?: CampusTheme }) {
  const roofColor = theme?.primaryColor || "#00A19A"
  const accentColor = theme?.accentColor || "#AE882E"

  return (
    <svg
      viewBox="0 0 460 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full object-cover select-none pointer-events-none"
    >
      <defs>
        <linearGradient id="skyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#CCFBF1" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#F0FDFA" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="buildingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#F1F5F9" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="roofGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={roofColor} stopOpacity="0.85" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Mặt trời tỏa nắng ấm áp */}
      <circle cx="390" cy="40" r="32" fill="#FDE68A" fillOpacity="0.45" />
      <circle cx="390" cy="40" r="20" fill="#FBBF24" fillOpacity="0.3" />

      {/* Mây trời */}
      <path
        d="M120 45 C 130 35, 155 35, 165 45 C 175 45, 185 55, 180 65 C 160 65, 130 65, 115 65 C 110 55, 115 48, 120 45 Z"
        fill="white"
        fillOpacity="0.65"
      />
      <path
        d="M260 30 C 270 22, 290 22, 300 30 C 310 30, 318 38, 315 45 C 300 45, 270 45, 255 45 C 250 38, 255 32, 260 30 Z"
        fill="white"
        fillOpacity="0.5"
      />

      {/* Tòa nhà trường học */}
      <path d="M160 85 L 430 85" stroke={roofColor} strokeWidth="4" strokeLinecap="round" opacity="0.85" />
      <rect x="175" y="88" width="245" height="92" rx="3" fill="url(#buildingGrad)" stroke="#CBD5E1" strokeWidth="1" />
      <rect x="173" y="85" width="249" height="6" rx="2" fill="url(#roofGrad)" />

      {/* Hàng cửa sổ tầng trên */}
      <rect x="190" y="100" width="22" height="28" rx="2" fill="#99F6E4" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="225" y="100" width="22" height="28" rx="2" fill="#99F6E4" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="260" y="100" width="22" height="28" rx="2" fill="#99F6E4" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="340" y="100" width="22" height="28" rx="2" fill="#99F6E4" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="375" y="100" width="22" height="28" rx="2" fill="#99F6E4" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />

      {/* Cổng chính trung tâm */}
      <rect x="295" y="96" width="32" height="84" rx="2" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1" />
      <rect x="297" y="100" width="28" height="12" rx="1.5" fill={accentColor} fillOpacity="0.9" />
      <line x1="300" y1="106" x2="322" y2="106" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <rect x="300" y="148" width="10" height="32" rx="1" fill={roofColor} fillOpacity="0.7" />
      <rect x="312" y="148" width="10" height="32" rx="1" fill={roofColor} fillOpacity="0.7" />

      {/* Hàng cửa sổ tầng trệt */}
      <rect x="190" y="140" width="22" height="26" rx="2" fill="#99F6E4" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="225" y="140" width="22" height="26" rx="2" fill="#99F6E4" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="260" y="140" width="22" height="26" rx="2" fill="#99F6E4" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="340" y="140" width="22" height="26" rx="2" fill="#99F6E4" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />
      <rect x="375" y="140" width="22" height="26" rx="2" fill="#99F6E4" fillOpacity="0.35" stroke="#94A3B8" strokeWidth="0.8" />

      {/* Cây cỏ sinh thái Sky-Line */}
      <path d="M120 190 C 110 160, 140 140, 160 160 C 180 140, 200 160, 190 190 Z" fill="#10B981" fillOpacity="0.75" />
      <path d="M135 190 C 130 170, 150 155, 165 170 C 180 155, 195 170, 185 190 Z" fill="#34D399" fillOpacity="0.7" />
      <path d="M410 190 C 400 165, 425 145, 440 165 C 455 145, 475 165, 465 190 Z" fill="#10B981" fillOpacity="0.7" />

      {/* Sân trường */}
      <path d="M0 185 Q 230 180, 460 185 L 460 220 L 0 220 Z" fill="#E2E8F0" fillOpacity="0.5" />
      <path d="M0 195 Q 230 190, 460 195 L 460 220 L 0 220 Z" fill="#CBD5E1" fillOpacity="0.4" />

      {/* Thầy cô & học sinh minh họa với trang phục thương hiệu */}
      <g transform="translate(325, 138) scale(0.65)">
        <circle cx="15" cy="12" r="7" fill="#F87171" fillOpacity="0.9" />
        <circle cx="15" cy="12" r="5" fill="#FED7AA" />
        <path d="M10 20 L 20 20 L 23 48 L 7 48 Z" fill="#FFFFFF" />
        <path d="M8 20 L 5 36" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
        <path d="M7 40 L 23 40 L 26 58 L 4 58 Z" fill={roofColor} />
        <rect x="18" y="24" width="8" height="16" rx="2" fill={roofColor} />
        <line x1="11" y1="58" x2="11" y2="78" stroke="#FED7AA" strokeWidth="3" strokeLinecap="round" />
        <line x1="19" y1="58" x2="19" y2="78" stroke="#FED7AA" strokeWidth="3" strokeLinecap="round" />
      </g>

      <g transform="translate(355, 136) scale(0.68)">
        <circle cx="15" cy="11" r="6" fill="#1E293B" />
        <circle cx="15" cy="13" r="5" fill="#FED7AA" />
        <path d="M9 20 L 21 20 L 22 45 L 8 45 Z" fill="#FFFFFF" />
        <rect x="5" y="22" width="7" height="18" rx="2" fill={roofColor} />
        <path d="M8 45 L 22 45 L 22 75 L 16 75 L 15 56 L 14 75 L 8 75 Z" fill="#003B3A" />
      </g>

      <g transform="translate(385, 142) scale(0.62)">
        <circle cx="15" cy="11" r="6" fill="#334155" />
        <circle cx="15" cy="13" r="5" fill="#FED7AA" />
        <path d="M9 20 L 21 20 L 22 45 L 8 45 Z" fill="#FFFFFF" />
        <rect x="18" y="22" width="7" height="16" rx="2" fill={accentColor} />
        <path d="M8 45 L 22 45 L 22 72 L 16 72 L 15 54 L 14 72 L 8 72 Z" fill={roofColor} />
      </g>
    </svg>
  )
}

export interface UserWelcomeCardProps {
  userName?: string
  userInitial?: string
  academicYear?: string
  showAcademicYear?: boolean
  greetingTitle?: string
  greetingSubtitle?: string
  motto?: string
  showPasswordChange?: boolean
  className?: string
  campusName?: string
  campusCode?: string
  teacherCode?: string
  homeroomClass?: string
  mainSubject?: string
  positions?: string
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function UserWelcomeCard({
  userName: customUserName,
  userInitial: customInitial,
  academicYear = "2026-2027",
  showAcademicYear = false,
  greetingTitle,
  greetingSubtitle = "Chúc Thầy/Cô một ngày làm việc tràn đầy cảm hứng và niềm vui sư phạm!",
  motto,
  showPasswordChange = true,
  className = "",
  campusName,
  campusCode,
  teacherCode,
  homeroomClass,
  mainSubject,
  positions,
  onRefresh,
  isRefreshing = false
}: UserWelcomeCardProps) {
  const { data: session } = useSession()
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [currentDateStr, setCurrentDateStr] = useState("")

  const campusTheme = resolveCampusTheme(campusCode || campusName)
  const effectiveUserName = customUserName || session?.user?.name || "Thầy/Cô"
  const effectiveInitial = (customInitial || effectiveUserName.charAt(0) || "S").toUpperCase()
  const effectiveTitle = greetingTitle || `Xin chào, ${effectiveUserName}!`
  const effectiveMotto = motto || campusTheme.motto

  const updateDateTime = useCallback(() => {
    const now = new Date()
    const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"]
    const dayName = days[now.getDay()]
    const date = now.getDate()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const hours = String(now.getHours()).padStart(2, "0")
    const minutes = String(now.getMinutes()).padStart(2, "0")
    setCurrentDateStr(`${dayName}, Ngày ${date}/${month}/${year} • ${hours}:${minutes}`)
  }, [])

  useEffect(() => {
    updateDateTime()
    const timer = setInterval(updateDateTime, 30000)
    return () => clearInterval(timer)
  }, [updateDateTime])

  return (
    <>
      <div
        className={`bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-7 relative overflow-hidden transition-all duration-300 ${className}`}
        style={{
          background: `linear-gradient(135deg, ${campusTheme.lightBg} 0%, #FFFFFF 60%, ${campusTheme.lightAccentBg} 100%)`
        }}
      >
        {/* Đường viền dải nhận diện cơ sở ở đỉnh thẻ */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{
            background: campusTheme.heroBadgeGradient
          }}
        />

        {/* Vector minh họa trường học Sky-Line & học sinh */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 sm:w-2/5 md:w-1/3 opacity-30 sm:opacity-55 pointer-events-none">
          <SchoolCampusArtwork theme={campusTheme} />
        </div>

        {/* Motto thương hiệu ở góc phải trên */}
        {effectiveMotto && (
          <div className="hidden sm:block absolute top-4 right-6 z-10">
            <span
              className="text-xs md:text-sm font-semibold tracking-wide select-none"
              style={{
                color: campusTheme.accentColor,
                fontFamily: "'Dancing Script', 'Caveat', 'Segoe Script', cursive"
              }}
            >
              {effectiveMotto}
            </span>
          </div>
        )}

        {/* Nội dung chính bên trái */}
        <div className="relative z-10 max-w-2xl">
          {/* Huy hiệu Cơ sở biên chế (Campus Identity Badge) */}
          <div className="flex items-center gap-2 mb-3">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs backdrop-blur-md ${campusTheme.campusBadge.bg} ${campusTheme.campusBadge.text} ${campusTheme.campusBadge.border}`}
            >
              <School className="w-3.5 h-3.5" />
              <span>{campusName || campusTheme.name}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${campusTheme.campusBadge.dotColor} animate-pulse`} />
            </div>

            {teacherCode && (
              <span className="hidden sm:inline-block text-[11px] font-mono font-bold text-slate-500 bg-white/80 border border-slate-200/70 px-2.5 py-0.5 rounded-full shadow-2xs">
                Mã GV: {teacherCode}
              </span>
            )}
          </div>

          {/* Avatar & Lời chào */}
          <div className="flex items-start sm:items-center gap-4 mb-3">
            <div className="relative shrink-0">
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl text-white flex items-center justify-center font-bold text-lg sm:text-xl shadow-md border-2 border-white"
                style={{
                  background: campusTheme.heroBadgeGradient
                }}
              >
                {effectiveInitial}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight leading-snug">
                  {effectiveTitle}
                </h1>
                {effectiveMotto && (
                  <span
                    className="sm:hidden text-xs italic font-medium"
                    style={{ color: campusTheme.accentColor }}
                  >
                    • {effectiveMotto}
                  </span>
                )}
              </div>
              {greetingSubtitle && (
                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5 leading-relaxed">
                  {greetingSubtitle}
                </p>
              )}
            </div>
          </div>

          {/* Các Chip chức danh sư phạm: Lớp chủ nhiệm, Môn giảng dạy */}
          {(homeroomClass || mainSubject || positions) && (
            <div className="flex items-center gap-2 flex-wrap mb-3.5">
              {homeroomClass && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700 shadow-2xs">
                  <GraduationCap className="w-3.5 h-3.5 text-[#00A19A]" />
                  <span>Chủ nhiệm: {homeroomClass}</span>
                </span>
              )}
              {mainSubject && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700 shadow-2xs">
                  <BookOpen className="w-3.5 h-3.5 text-[#AE882E]" />
                  <span>Bộ môn: {mainSubject}</span>
                </span>
              )}
              {positions && (
                <span className="inline-block text-[11px] font-semibold text-slate-500 bg-white/70 border border-slate-200 px-2 py-0.5 rounded-lg">
                  {positions}
                </span>
              )}
            </div>
          )}

          {/* Badges & Nút thao tác nhanh */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap pt-3 border-t border-slate-200/60">
            {/* Pill Ngày Giờ */}
            <div className="bg-white border border-slate-200/80 rounded-full px-3 py-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600 shadow-2xs">
              <CalendarDays className="w-3.5 h-3.5 text-[#00A19A]" />
              <span className="capitalize">{currentDateStr || "Đang cập nhật..."}</span>
            </div>

            {/* Pill Năm Học */}
            {showAcademicYear && academicYear && (
              <div className="bg-white border border-slate-200/80 rounded-full px-3 py-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600 shadow-2xs">
                <GraduationCap className="w-3.5 h-3.5 text-[#AE882E]" />
                <span>Năm học: {academicYear}</span>
              </div>
            )}

            {/* Nút Làm mới dữ liệu */}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Đồng bộ dữ liệu mới nhất"
                className="bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 rounded-full px-3 py-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600 shadow-2xs transition-all cursor-pointer group active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 ${isRefreshing ? "animate-spin text-[#00A19A]" : ""}`} />
                <span className="hidden sm:inline">{isRefreshing ? "Đang đồng bộ..." : "Làm mới"}</span>
              </button>
            )}

            {/* Nút Đổi Mật Khẩu */}
            {showPasswordChange && (
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-full px-3 py-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer group active:scale-95"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#00A19A] group-hover:rotate-12 transition-transform" />
                <span>Đổi mật khẩu</span>
                <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
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
