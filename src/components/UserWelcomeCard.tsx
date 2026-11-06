"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import {
  CalendarDays,
  GraduationCap,
  KeyRound,
  ChevronRight,
  School,
  BookOpen,
  RefreshCw,
  Sparkles
} from "lucide-react"
import { ChangePasswordModal } from "./ChangePasswordModal"
import { resolveCampusTheme, CampusTheme } from "@/hooks/useCampusTheme"

// Làm sạch dữ liệu chuỗi chức danh / bộ môn (loại bỏ chuỗi rỗng kiểu "||", "[]", "-", "|")
export function sanitizeMetaText(value?: string | null): string {
  if (!value) return ""
  const cleaned = value
    .replace(/\[\s*\]|\{\s*\}/g, "")
    .replace(/^(null|undefined|none|n\/a)$/i, "")
    .replace(/^[|\-\s•,;/[\]()]+|[|\-\s•,;/[\]()]+$/g, "")
    .replace(/\s*\|\|\s*/g, " • ")
    .replace(/\s+\|\s+/g, " • ")
    .trim()
  if (!cleaned || /^[|\-\s•,;/[\]()]+$/.test(cleaned)) return ""
  return cleaned
}

// Artwork minh họa trường học Sky-Line khớp full-frame bên phải và mờ dần sang trái
export function SchoolCampusArtwork({
  theme,
  imageSrc = "/images/skyline-campus-banner.png",
  alt = "Không gian trường học hạnh phúc Sky-Line",
  opacityClass = "opacity-90"
}: {
  theme?: CampusTheme
  imageSrc?: string
  alt?: string
  opacityClass?: string
}) {
  const lightBg = theme?.lightBg || "#FDFBF7"

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none pointer-events-none"
      style={{
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.08) 10%, rgba(0,0,0,0.45) 26%, rgba(0,0,0,0.82) 45%, rgba(0,0,0,0.96) 65%, rgba(0,0,0,1) 85%)",
        maskImage:
          "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.08) 10%, rgba(0,0,0,0.45) 26%, rgba(0,0,0,0.82) 45%, rgba(0,0,0,0.96) 65%, rgba(0,0,0,1) 85%)"
      }}
    >
      <img
        src={imageSrc}
        alt={alt}
        loading="eager"
        className={`w-full h-full object-cover object-[center_65%] ${opacityClass} transition-transform duration-700 ease-out group-hover/card:scale-[1.02]`}
      />

      {/* Lớp phủ mờ dần từ đỉnh xuống để tôn nổi bật dòng Slogan "Nơi khởi nguồn hạnh phúc..." */}
      <div
        className="absolute inset-x-0 top-0 h-14 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, ${lightBg}E6 0%, rgba(255,255,255,0.45) 55%, transparent 100%)`
        }}
      />

      {/* Lớp phủ hòa sắc nhẹ ở cạnh dưới và cạnh phải để tiệp hoàn toàn vào khung thẻ */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to right, rgba(255,255,255,0.35) 0%, transparent 35%, transparent 85%, rgba(255,255,255,0.12) 100%)"
        }}
      />
    </div>
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
  codeLabel?: string
  roleBadgeText?: string
  homeroomClass?: string
  mainSubject?: string
  positions?: string
  customMetaChips?: React.ReactNode
  customActions?: React.ReactNode
  children?: React.ReactNode
  bannerImageSrc?: string
  onRefresh?: () => void
  isRefreshing?: boolean
  compact?: boolean
  lastUpdated?: string
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
  codeLabel = "Mã GV",
  roleBadgeText,
  homeroomClass,
  mainSubject,
  positions,
  customMetaChips,
  customActions,
  children,
  bannerImageSrc = "/images/skyline-campus-banner.png",
  onRefresh,
  isRefreshing = false,
  compact = false,
  lastUpdated
}: UserWelcomeCardProps) {
  const { data: session } = useSession()
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [currentDateStr, setCurrentDateStr] = useState("")
  const [isExpanded, setIsExpanded] = useState(!compact)

  const campusTheme = resolveCampusTheme(campusCode || campusName)
  const effectiveUserName = customUserName || session?.user?.name || "Thầy/Cô"
  const effectiveInitial = (customInitial || effectiveUserName.charAt(0) || "S").toUpperCase()
  const effectiveTitle = greetingTitle || `Xin chào, ${effectiveUserName}!`
  const effectiveMotto = motto || campusTheme.motto

  const cleanHomeroom = sanitizeMetaText(homeroomClass)
  const cleanSubject = sanitizeMetaText(mainSubject)
  const cleanPositions = sanitizeMetaText(positions)
  const cleanTeacherCode = sanitizeMetaText(teacherCode)

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
      {!isExpanded ? (
        <div
          className={`group/card bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs px-4 py-3 sm:px-5 sm:py-3.5 relative overflow-hidden transition-all duration-200 ${className}`}
          style={{
            background: `linear-gradient(135deg, ${campusTheme.lightBg} 0%, #FFFFFF 55%, ${campusTheme.lightAccentBg} 100%)`
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-1 z-30"
            style={{ background: campusTheme.heroBadgeGradient }}
          />
          <div className="hidden lg:block absolute top-0 right-0 bottom-0 w-[32%] z-0 pointer-events-none opacity-45">
            <SchoolCampusArtwork
              theme={campusTheme}
              imageSrc={bannerImageSrc}
              alt={`${campusName || campusTheme.name}`}
              opacityClass="opacity-60"
            />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Left: Avatar + Greeting + Badges */}
            <div className="flex items-center gap-3 min-w-0 flex-wrap sm:flex-nowrap">
              <div className="relative shrink-0">
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-white flex items-center justify-center font-bold text-sm sm:text-base shadow-xs border border-white"
                  style={{ background: campusTheme.heroBadgeGradient }}
                >
                  {effectiveInitial}
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"
                  title="Đang trực tuyến"
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight truncate">
                    {effectiveTitle}
                  </h1>
                  <div
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${campusTheme.campusBadge.bg} ${campusTheme.campusBadge.text} ${campusTheme.campusBadge.border}`}
                  >
                    <School className="w-3 h-3 shrink-0" />
                    <span>{campusName || campusTheme.name}</span>
                  </div>
                  {roleBadgeText && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#003B3A] bg-[#003B3A]/8 border border-[#003B3A]/20 px-2.5 py-0.5 rounded-md tracking-tight">
                      <Sparkles className="w-2.5 h-2.5 text-[#00A19A] shrink-0" />
                      <span>{roleBadgeText}</span>
                    </span>
                  )}
                  {showAcademicYear && academicYear && (
                    <span className="hidden xl:inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-white/90 border border-slate-200/80 px-2.5 py-0.5 rounded-full tabular-nums">
                      <GraduationCap className="w-3 h-3 text-[#AE882E] shrink-0" />
                      <span>NH {academicYear}</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap tabular-nums">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3 text-[#00A19A] shrink-0" />
                    <span className="capitalize">{currentDateStr || "Đang cập nhật..."}</span>
                  </span>
                  {lastUpdated && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Đồng bộ: <strong>{lastUpdated}</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Quick Actions & Expand Button */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {customActions}

              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  title="Đồng bộ dữ liệu mới nhất"
                  className="bg-white/95 hover:bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer active:scale-95"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-[#00A19A] ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  <span>{isRefreshing ? "Đang tải..." : "Làm mới"}</span>
                </button>
              )}

              {showPasswordChange && (
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="bg-white/95 hover:bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer active:scale-95"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#00A19A]" />
                  <span className="hidden sm:inline">Đổi mật khẩu</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                title="Mở rộng banner chào mừng"
                className="bg-slate-100/90 hover:bg-slate-200/80 text-slate-600 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
              >
                <span>Mở rộng</span>
                <ChevronRight className="w-3 h-3 rotate-90" />
              </button>
            </div>
          </div>
        </div>
      ) : (
      <div
        className={`group/card bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md p-5 sm:p-6 lg:px-7 lg:py-6 relative overflow-hidden transition-all duration-300 ${className}`}
        style={{
          background: `linear-gradient(135deg, ${campusTheme.lightBg} 0%, #FFFFFF 50%, ${campusTheme.lightAccentBg} 100%)`
        }}
      >
        {/* Đường viền dải nhận diện cơ sở ở đỉnh thẻ */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5 z-30"
          style={{
            background: campusTheme.heroBadgeGradient
          }}
        />

        {/* Ảnh minh họa trường học khớp sát khung phải (full-bleed) và mờ dần sang trái */}
        <div className="hidden sm:block absolute top-0 right-0 bottom-0 sm:w-[58%] md:w-[56%] lg:w-[54%] xl:w-[52%] z-0 pointer-events-none">
          <SchoolCampusArtwork
            theme={campusTheme}
            imageSrc={bannerImageSrc}
            alt={`${campusName || campusTheme.name} - ${effectiveMotto}`}
          />
        </div>

        {/* Slogan / Motto thương hiệu nổi bật ở góc phải trên */}
        {effectiveMotto && (
          <div className="hidden sm:flex absolute top-3.5 right-5 z-20 items-center">
            <div
              className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/85 backdrop-blur-md border shadow-2xs"
              style={{ borderColor: campusTheme.borderSubtle }}
            >
              <Sparkles
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: campusTheme.primaryColor }}
              />
              <span
                className="text-xs md:text-sm font-bold tracking-wide select-none"
                style={{
                  color: campusTheme.accentColor,
                  fontFamily: "'Dancing Script', 'Caveat', 'Segoe Script', cursive"
                }}
              >
                {effectiveMotto}
              </span>
            </div>
          </div>
        )}

        {/* Nội dung chính bên trái */}
        <div className="relative z-10 max-w-xl lg:max-w-[56%]">
          {/* Hàng 1: Huy hiệu Cơ sở biên chế, Phân hệ & Mã định danh */}
          <div className="flex items-center gap-2 flex-wrap mb-3.5">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs backdrop-blur-md ${campusTheme.campusBadge.bg} ${campusTheme.campusBadge.text} ${campusTheme.campusBadge.border}`}
            >
              <School className="w-3.5 h-3.5 shrink-0" />
              <span>{campusName || campusTheme.name}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${campusTheme.campusBadge.dotColor} animate-pulse`} />
            </div>

            {roleBadgeText && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-white/90 border border-slate-200/80 px-2.5 py-1 rounded-full shadow-2xs">
                <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                <span>{roleBadgeText}</span>
              </span>
            )}

            {cleanTeacherCode && (
              <span className="inline-flex items-center text-[11px] font-mono font-bold text-slate-600 bg-white/90 border border-slate-200/80 px-2.5 py-1 rounded-full shadow-2xs">
                {codeLabel}: {cleanTeacherCode}
              </span>
            )}
          </div>

          {/* Hàng 2: Avatar & Lời chào */}
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 mb-3">
            <div className="relative shrink-0">
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl text-white flex items-center justify-center font-extrabold text-lg sm:text-xl shadow-md border-2 border-white ring-1 ring-slate-900/5"
                style={{
                  background: campusTheme.heroBadgeGradient
                }}
              >
                {effectiveInitial}
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-2xs"
                title="Đang trực tuyến"
              />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight leading-snug">
                {effectiveTitle}
              </h1>
              {greetingSubtitle && (
                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 leading-relaxed">
                  {greetingSubtitle}
                </p>
              )}
            </div>
          </div>

          {/* Hàng 3: Các Chip chức danh sư phạm / thông tin bổ sung */}
          {(cleanHomeroom || cleanSubject || cleanPositions || customMetaChips) && (
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {cleanHomeroom && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-white/90 border border-slate-200/80 text-slate-700 shadow-2xs">
                  <GraduationCap className="w-3.5 h-3.5 text-[#00A19A] shrink-0" />
                  <span>Chủ nhiệm: {cleanHomeroom}</span>
                </span>
              )}
              {cleanSubject && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-white/90 border border-slate-200/80 text-slate-700 shadow-2xs">
                  <BookOpen className="w-3.5 h-3.5 text-[#AE882E] shrink-0" />
                  <span>Bộ môn: {cleanSubject}</span>
                </span>
              )}
              {cleanPositions && (
                <span className="inline-flex items-center text-[11px] font-semibold text-slate-600 bg-white/85 border border-slate-200/80 px-2.5 py-1 rounded-xl shadow-2xs">
                  {cleanPositions}
                </span>
              )}
              {customMetaChips}
            </div>
          )}

          {children}

          {/* Hiển thị ảnh & slogan trên màn hình Mobile nhỏ (< 640px) */}
          <div className="sm:hidden mt-3 mb-3 rounded-2xl overflow-hidden border border-slate-200/70 relative">
            <img
              src={bannerImageSrc}
              alt={`${campusName || campusTheme.name}`}
              className="w-full aspect-[1024/385] object-cover object-center"
            />
            {effectiveMotto && (
              <div
                className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-white/85 backdrop-blur-md text-[11px] font-bold shadow-2xs"
                style={{ color: campusTheme.accentColor }}
              >
                {effectiveMotto}
              </div>
            )}
          </div>

          {/* Hàng 4: Badges Thời gian & Nút thao tác nhanh */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap pt-3.5 mt-3.5 border-t border-slate-200/70">
            {/* Pill Ngày Giờ */}
            <div className="bg-white/95 backdrop-blur-xs border border-slate-200/80 rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600 shadow-2xs">
              <CalendarDays className="w-3.5 h-3.5 text-[#00A19A] shrink-0" />
              <span className="capitalize">{currentDateStr || "Đang cập nhật..."}</span>
            </div>

            {/* Pill Năm Học */}
            {showAcademicYear && academicYear && (
              <div className="bg-white/95 backdrop-blur-xs border border-slate-200/80 rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600 shadow-2xs">
                <GraduationCap className="w-3.5 h-3.5 text-[#AE882E] shrink-0" />
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
                className="bg-white/95 hover:bg-white border border-slate-200/80 hover:border-slate-300 rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600 shadow-2xs transition-all cursor-pointer group active:scale-95"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 ${
                    isRefreshing ? "animate-spin text-[#00A19A]" : ""
                  }`}
                />
                <span>{isRefreshing ? "Đang đồng bộ..." : "Làm mới"}</span>
              </button>
            )}

            {/* Nút Đổi Mật Khẩu */}
            {showPasswordChange && (
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                className="bg-white/95 hover:bg-white border border-slate-200/80 hover:border-slate-300 rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer group active:scale-95"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#00A19A] group-hover:rotate-12 transition-transform" />
                <span>Đổi mật khẩu</span>
                <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            {customActions}

            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              title="Thu gọn banner chào mừng"
              className="bg-slate-100/90 hover:bg-slate-200/80 text-slate-600 rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
            >
              <span>Thu gọn</span>
              <ChevronRight className="w-3 h-3 -rotate-90" />
            </button>
          </div>
        </div>
      </div>
      )}

      {showPasswordChange && (
        <ChangePasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
        />
      )}
    </>
  )
}
