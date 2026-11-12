"use client"

import React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronRight } from "lucide-react"

export interface TimetableNavTab {
  code: string
  label: string
  href: string
}

export const TIMETABLE_NAV_TABS: TimetableNavTab[] = [
  { code: "OVERVIEW", label: "Tổng quan", href: "/admin/thoi-khoa-bieu" },
  { code: "CONFIG", label: "Cấu hình", href: "/admin/thoi-khoa-bieu/cau-hinh" },
  { code: "QUOTA", label: "Định mức & Phân công", href: "/admin/thoi-khoa-bieu/phan-cong" },
  { code: "SCHEDULE", label: "Xếp thời khóa biểu", href: "/admin/thoi-khoa-bieu/xep-lich" },
  { code: "LOOKUP", label: "Tra cứu", href: "/admin/thoi-khoa-bieu/tra-cuu" },
  { code: "ADJUST", label: "Điều chỉnh & Dạy thay", href: "/admin/thoi-khoa-bieu/dieu-chinh" },
  { code: "PUBLISH", label: "Duyệt & Ban hành", href: "/admin/thoi-khoa-bieu/ban-hanh" },
]

export const VERSION_STATUS_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Bản nháp",
    className: "bg-slate-100 text-slate-700 border border-slate-200",
  },
  PENDING_APPROVAL: {
    label: "Chờ duyệt",
    className: "bg-amber-50 text-[#D97706] border border-amber-200",
  },
  APPROVED: {
    label: "Đã duyệt",
    className: "bg-teal-50 text-[#00736E] border border-teal-200",
  },
  PUBLISHED: {
    label: "Đã ban hành",
    className: "bg-emerald-50 text-[#059669] border border-emerald-200",
  },
  EXPIRED: {
    label: "Hết hiệu lực",
    className: "bg-rose-50 text-[#E11D48] border border-rose-200",
  },
}

interface TimetableShellProps {
  title: string
  subtitle: string
  activeTabCode: string
  hasUnsavedChanges?: boolean
  headerActions?: React.ReactNode
  children: React.ReactNode
}

export function TimetableShell({
  title,
  subtitle,
  activeTabCode,
  hasUnsavedChanges = false,
  headerActions,
  children,
}: TimetableShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const buildScopedHref = (baseHref: string) => {
    const nextParams = new URLSearchParams()
    const carryKeys = ["academicYearId", "semester", "scopeGroup", "campusId", "versionId"]
    for (const key of carryKeys) {
      const val = searchParams?.get(key)
      if (val && !(key === "scopeGroup" && val === "LIEN_CAP" && baseHref !== "/admin/thoi-khoa-bieu/tra-cuu")) {
        nextParams.set(key, val)
      }
    }
    const qs = nextParams.toString()
    return qs ? `${baseHref}?${qs}` : baseHref
  }

  const handleTabNavigate = (e: React.MouseEvent<HTMLAnchorElement>, targetHref: string) => {
    if (hasUnsavedChanges) {
      e.preventDefault()
      const ok = window.confirm(
        "Bạn có thay đổi chưa lưu trên trang hiện tại. Rời trang sẽ mất các chỉnh sửa chưa lưu — bạn có muốn tiếp tục chuyển trang?"
      )
      if (ok) {
        router.push(targetHref)
      }
    }
  }

  const activeTab = TIMETABLE_NAV_TABS.find((t) => t.code === activeTabCode)

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 space-y-4 pb-10">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
        <span>Quản lý đào tạo</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link
          href={buildScopedHref("/admin/thoi-khoa-bieu")}
          onClick={(e) => handleTabNavigate(e, buildScopedHref("/admin/thoi-khoa-bieu"))}
          className="text-slate-600 hover:text-[#003B3A] font-medium transition-colors"
        >
          Thời khóa biểu
        </Link>
        {activeTab && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[#003B3A] font-semibold">{activeTab.label}</span>
          </>
        )}
      </nav>

      {/* Compact Academic Ledger Masthead */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] px-5 py-4 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-[#003B3A] tracking-tight">
            {title}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>
        </div>
        {headerActions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">{headerActions}</div>
        )}
      </div>

      {/* Segmented Sub-navigation */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-1.5 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {TIMETABLE_NAV_TABS.map((tab) => {
            const isCurrent =
              tab.code === activeTabCode ||
              (tab.href === "/admin/thoi-khoa-bieu"
                ? pathname === "/admin/thoi-khoa-bieu"
                : pathname?.startsWith(tab.href))
            const dest = buildScopedHref(tab.href)

            return (
              <Link
                key={tab.code}
                href={dest}
                onClick={(e) => handleTabNavigate(e, dest)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                  isCurrent
                    ? "bg-[#003B3A] text-white shadow-xs"
                    : "text-slate-600 hover:text-[#003B3A] hover:bg-[#F8FAFC]"
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Page Body */}
      <div className="space-y-4">{children}</div>
    </div>
  )
}
