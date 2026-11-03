"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home, Sparkles } from "lucide-react"
import { resolveCampusTheme } from "@/hooks/useCampusTheme"
import { SchoolCampusArtwork } from "./UserWelcomeCard"

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  badge?: React.ReactNode
  icon?: React.ReactNode
  campusCodeOrName?: string
  motto?: string
  showMotto?: boolean
  children?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  badge,
  icon,
  campusCodeOrName,
  motto,
  showMotto = true,
  children,
  className = ""
}: PageHeaderProps) {
  const pathname = usePathname() || ""
  const campusTheme = resolveCampusTheme(campusCodeOrName)
  const effectiveMotto = motto || campusTheme.motto

  const homeHref = pathname.startsWith("/teacher")
    ? "/teacher"
    : pathname.startsWith("/parent")
    ? "/parent"
    : pathname.startsWith("/hocsinh")
    ? "/hocsinh/portal"
    : "/admin"

  return (
    <div
      className={`group/card bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-sm p-4 sm:px-6 sm:py-5 mb-6 relative overflow-hidden transition-all duration-300 ${className}`}
      style={{
        background: `linear-gradient(135deg, ${campusTheme.lightBg} 0%, #FFFFFF 52%, ${campusTheme.lightAccentBg} 100%)`
      }}
    >
      {/* Dải màu nhận diện thương hiệu Sky-Line trên đỉnh thẻ */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5 z-30"
        style={{
          background: campusTheme.heroBadgeGradient
        }}
      />

      {/* Hình ảnh khuôn viên trường học khớp tràn khung phải & mờ dần sang trái */}
      <div className="hidden sm:block absolute top-0 right-0 bottom-0 sm:w-[54%] md:w-[50%] lg:w-[46%] z-0 pointer-events-none">
        <SchoolCampusArtwork
          theme={campusTheme}
          opacityClass="opacity-80"
          alt={`${campusTheme.name} - ${title}`}
        />
      </div>

      {/* Dòng Slogan / Motto ở góc phải trên (khi không có cụm actions chiếm chỗ hoặc hiển thị tinh tế phía trên) */}
      {showMotto && effectiveMotto && !actions && (
        <div className="hidden md:flex absolute top-3.5 right-5 z-20 items-center">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/85 backdrop-blur-md border shadow-2xs"
            style={{ borderColor: campusTheme.borderSubtle }}
          >
            <Sparkles
              className="w-3 h-3 shrink-0"
              style={{ color: campusTheme.primaryColor }}
            />
            <span
              className="text-xs font-bold tracking-wide select-none"
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

      {/* Nội dung chính & Cụm nút thao tác */}
      <div className="relative z-10 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 max-w-2xl">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-xs text-slate-500 mb-2 flex-wrap"
            >
              <Link
                href={homeHref}
                className="flex items-center gap-1 text-slate-400 hover:text-[#00A19A] transition-colors bg-white/80 p-1 rounded-md border border-slate-200/60 shadow-2xs"
                title="Trang tổng quan"
              >
                <Home className="w-3.5 h-3.5" />
              </Link>
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1
                return (
                  <React.Fragment key={idx}>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    {crumb.href && !isLast ? (
                      <Link
                        href={crumb.href}
                        className="text-slate-500 hover:text-[#00A19A] font-semibold transition-colors truncate max-w-[150px] sm:max-w-none"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        className={`truncate max-w-[220px] sm:max-w-none ${
                          isLast
                            ? "font-bold text-slate-700 bg-white/85 px-2 py-0.5 rounded-md border border-slate-200/60"
                            : "font-medium text-slate-400"
                        }`}
                      >
                        {crumb.label}
                      </span>
                    )}
                  </React.Fragment>
                )
              })}
            </nav>
          )}

          {/* Title, Icon & Badges */}
          <div className="flex items-center gap-3 flex-wrap">
            {icon && (
              <div
                className="w-10 h-10 rounded-2xl text-white flex items-center justify-center shadow-sm border border-white shrink-0"
                style={{ background: campusTheme.heroBadgeGradient }}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-slate-800 tracking-tight leading-snug">
                  {title}
                </h1>
                {badge}
              </div>
              {description && (
                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Cụm Slogan + Action buttons bên phải */}
        {actions && (
          <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
            {showMotto && effectiveMotto && (
              <div
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/85 backdrop-blur-md border shadow-2xs"
                style={{ borderColor: campusTheme.borderSubtle }}
              >
                <Sparkles
                  className="w-3 h-3 shrink-0"
                  style={{ color: campusTheme.primaryColor }}
                />
                <span
                  className="text-xs font-bold tracking-wide select-none"
                  style={{
                    color: campusTheme.accentColor,
                    fontFamily: "'Dancing Script', 'Caveat', 'Segoe Script', cursive"
                  }}
                >
                  {effectiveMotto}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap sm:justify-end bg-white/85 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              {actions}
            </div>
          </div>
        )}
      </div>

      {/* Nội dung mở rộng bên dưới (Bộ lọc, Tabs, Thanh tìm kiếm...) */}
      {children && (
        <div className="relative z-10 mt-4 pt-3.5 border-t border-slate-200/70">
          {children}
        </div>
      )}
    </div>
  )
}
