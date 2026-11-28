"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Layers,
  ClipboardList,
  UserCheck,
  Award,
  GitCommit,
  Trophy,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
} from "lucide-react"
import { getAchievementRequestStatsAction } from "@/app/admin/ktdbcl/results/actions"

export type ExamTabId =
  | "categories"
  | "rounds"
  | "achievements"
  | "exams"
  | "students"
  | "results"
  | "reports"
  | "profiles"
  | "requests"

interface ExamTabsProps {
  activeTab?: ExamTabId
  pendingRequestsCount?: number
  academicYears?: any[]
  initialYearId?: string
}

export function ExamTabs({
  activeTab = "results",
  pendingRequestsCount = 0,
  academicYears = [],
  initialYearId = "",
}: ExamTabsProps) {
  const isConfigTab =
    activeTab === "categories" || activeTab === "rounds" || activeTab === "achievements"

  const [selectedYearId, setSelectedYearId] = useState<string>(() => {
    if (initialYearId) return initialYearId
    const active = academicYears.find((y: any) => y.status === "ACTIVE")
    return active ? active.id : academicYears[0]?.id || ""
  })

  const [livePendingCount, setLivePendingCount] = useState<number>(pendingRequestsCount)
  const [allYearsPendingCount, setAllYearsPendingCount] = useState<number>(pendingRequestsCount)

  useEffect(() => {
    setLivePendingCount(pendingRequestsCount)
  }, [pendingRequestsCount])

  useEffect(() => {
    if (academicYears.length === 0) return
    const syncYear = () => {
      try {
        const stored = localStorage.getItem("selectedAcademicYear")
        if (stored && academicYears.some((y: any) => y.id === stored)) {
          setSelectedYearId(stored)
        }
      } catch {}
    }
    syncYear()
    window.addEventListener("academicYearChanged", syncYear)
    return () => window.removeEventListener("academicYearChanged", syncYear)
  }, [academicYears])

  const refreshPendingBadge = useCallback(
    async (targetYearId?: string) => {
      try {
        const yId = targetYearId ?? selectedYearId
        const stats = await getAchievementRequestStatsAction(yId || undefined)
        if (stats) {
          setLivePendingCount(stats.pending ?? 0)
          setAllYearsPendingCount(stats.pendingAllYears ?? stats.pending ?? 0)
        }
      } catch {}
    },
    [selectedYearId]
  )

  useEffect(() => {
    refreshPendingBadge(selectedYearId)
  }, [selectedYearId, refreshPendingBadge])

  useEffect(() => {
    const handleRequestsUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail
      if (detail && typeof detail.pending === "number") {
        setLivePendingCount(detail.pending)
        if (typeof detail.pendingAllYears === "number") {
          setAllYearsPendingCount(detail.pendingAllYears)
        }
      } else {
        refreshPendingBadge()
      }
    }
    const handleFocus = () => refreshPendingBadge()
    window.addEventListener("achievementRequestsUpdated", handleRequestsUpdated)
    window.addEventListener("focus", handleFocus)
    return () => {
      window.removeEventListener("achievementRequestsUpdated", handleRequestsUpdated)
      window.removeEventListener("focus", handleFocus)
    }
  }, [refreshPendingBadge])

  const handleYearSwitch = (newId: string) => {
    setSelectedYearId(newId)
    try {
      localStorage.setItem("selectedAcademicYear", newId)
      document.cookie = `selectedAcademicYear=${newId}; path=/; max-age=31536000; SameSite=Lax`
      window.dispatchEvent(new Event("academicYearChanged"))
    } catch {}
  }

  const otherYearsPending = Math.max(0, allYearsPendingCount - livePendingCount)

  // Thứ tự chuẩn quy trình trên thanh thẻ desktop:
  // 1. Danh mục -> 2. Kỳ thi -> 3. Đăng ký dự thi -> 4. Nhập kết quả
  // -> 5. Xét duyệt bổ sung -> 6. Báo cáo thành tích -> 7. Tra cứu thành tích
  const mainTabs: {
    id: ExamTabId
    label: string
    href: string
    icon: any
    isActive: boolean
    badge?: number
    alwaysShowBadge?: boolean
    otherYearsBadge?: number
  }[] = [
    {
      id: "categories",
      label: "Danh mục",
      href: "/admin/ktdbcl/categories",
      icon: Layers,
      isActive: isConfigTab,
    },
    {
      id: "exams",
      label: "Kỳ thi",
      href: "/admin/ktdbcl/exams",
      icon: ClipboardList,
      isActive: activeTab === "exams",
    },
    {
      id: "students",
      label: "Đăng ký dự thi",
      href: "/admin/ktdbcl/students",
      icon: UserCheck,
      isActive: activeTab === "students",
    },
    {
      id: "results",
      label: "Nhập kết quả",
      href: "/admin/ktdbcl/results",
      icon: Award,
      isActive: activeTab === "results",
    },
    {
      id: "requests",
      label: "Xét duyệt bổ sung",
      href: "/admin/ktdbcl/results?tab=requests",
      icon: CheckCircle2,
      isActive: activeTab === "requests",
      badge: livePendingCount,
      alwaysShowBadge: true,
      otherYearsBadge: otherYearsPending,
    },
    {
      id: "reports",
      label: "Báo cáo thành tích",
      href: "/admin/ktdbcl/results?tab=reports",
      icon: FileSpreadsheet,
      isActive: activeTab === "reports",
    },
    {
      id: "profiles",
      label: "Tra cứu thành tích",
      href: "/admin/ktdbcl/results?tab=profiles",
      icon: Search,
      isActive: activeTab === "profiles",
    },
  ]

  const configSubTabs: { id: ExamTabId; label: string; href: string; icon: any }[] = [
    { id: "categories", label: "Danh mục kỳ thi", href: "/admin/ktdbcl/categories", icon: Layers },
    { id: "rounds", label: "Vòng thi", href: "/admin/ktdbcl/rounds", icon: GitCommit },
    { id: "achievements", label: "Loại & Mức giải", href: "/admin/ktdbcl/achievements", icon: Trophy },
  ]

  return (
    <header className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] shadow-xs mb-4 overflow-hidden no-print">
      {/* Tier 1: Compact Masthead + Academic Year Context */}
      <div className="px-5 py-3 flex items-center justify-between gap-4 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#003B3A] text-[#5EEAD4] flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] font-bold text-[#003B3A] leading-tight truncate">
              Quản lý kỳ thi &amp; Thành tích học sinh
            </h1>
          </div>
        </div>

        {academicYears.length > 0 && (
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs tabular-nums shrink-0"
            title="Dữ liệu kỳ thi, đăng ký và thành tích được lọc theo năm học đang chọn"
          >
            <Calendar className="w-3.5 h-3.5 text-[#008B85] shrink-0" />
            <span className="text-slate-500 font-medium">Năm học</span>
            <select
              value={selectedYearId}
              onChange={(e) => handleYearSwitch(e.target.value)}
              className="bg-transparent font-bold text-[#003B3A] outline-none cursor-pointer pr-1"
            >
              {academicYears.map((y: any) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tier 2: Single-Row Desktop Tab Bar (7 Workflow Tabs in Exact Order) */}
      <nav
        aria-label="Điều hướng Quản lý kỳ thi và Thành tích"
        className="px-3 bg-white flex items-center gap-1 overflow-x-auto"
      >
        {mainTabs.map((tab) => {
          const Icon = tab.icon
          const hasPending = typeof tab.badge === "number" && tab.badge > 0
          const hasOtherYearsPending =
            !hasPending && typeof tab.otherYearsBadge === "number" && tab.otherYearsBadge > 0
          const showBadge = hasPending || hasOtherYearsPending || Boolean(tab.alwaysShowBadge)

          return (
            <Link
              key={tab.id}
              href={tab.href}
              title={
                hasPending
                  ? `Có ${tab.badge} đề xuất thành tích của GVCN đang chờ xét duyệt`
                  : hasOtherYearsPending
                  ? `Năm học đang chọn: 0 chờ duyệt (có ${tab.otherYearsBadge} đề xuất chờ duyệt ở năm học khác)`
                  : tab.alwaysShowBadge
                  ? "Không có đề xuất thành tích nào đang chờ xét duyệt"
                  : undefined
              }
              className={`relative inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border-b-2 -mb-px ${
                tab.isActive
                  ? "border-[#003B3A] text-[#003B3A] bg-[#F0FDFA]/60"
                  : hasPending
                  ? "border-transparent text-[#003B3A] hover:bg-amber-50/70"
                  : "border-transparent text-slate-600 hover:text-[#003B3A] hover:bg-[#F8FAFC]"
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 shrink-0 ${
                  tab.isActive
                    ? "text-[#008B85]"
                    : hasPending
                    ? "text-[#D97706]"
                    : "text-slate-400"
                }`}
              />
              <span>{tab.label}</span>
              {showBadge && (
                <span
                  className={`inline-flex items-center justify-center gap-0.5 min-w-[18px] h-[18px] px-1.5 rounded-full text-[11px] font-bold tabular-nums leading-none ${
                    hasPending
                      ? "bg-[#E11D48] text-white"
                      : hasOtherYearsPending
                      ? "bg-amber-100 text-[#D97706] border border-amber-300"
                      : tab.isActive
                      ? "bg-[#003B3A]/10 text-[#003B3A]"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {(hasPending || hasOtherYearsPending) && (
                    <Clock className="w-2.5 h-2.5 shrink-0" />
                  )}
                  <span>
                    {hasPending ? tab.badge : hasOtherYearsPending ? tab.otherYearsBadge : 0}
                  </span>
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Tier 3: Sub-navigation Strip ONLY when inside Danh mục */}
      {isConfigTab && (
        <div className="px-5 py-2 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-500 mr-1.5">Nhóm danh mục:</span>
          {configSubTabs.map((sub) => {
            const isSubActive = activeTab === sub.id
            const Icon = sub.icon
            return (
              <Link
                key={sub.id}
                href={sub.href}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  isSubActive
                    ? "bg-[#003B3A] text-white border-[#003B3A]"
                    : "bg-white text-slate-600 border-[#E2E8F0] hover:border-[#008B85]/50 hover:text-[#003B3A]"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${isSubActive ? "text-[#5EEAD4]" : "text-slate-400"}`}
                />
                <span>{sub.label}</span>
              </Link>
            )
          })}
        </div>
      )}
    </header>
  )
}
