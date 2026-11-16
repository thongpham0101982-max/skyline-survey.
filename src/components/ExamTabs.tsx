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
  BookOpen,
  Settings2,
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

  const refreshPendingBadge = useCallback(async (targetYearId?: string) => {
    try {
      const yId = targetYearId ?? selectedYearId
      const stats = await getAchievementRequestStatsAction(yId || undefined)
      if (stats) {
        setLivePendingCount(stats.pending ?? 0)
        setAllYearsPendingCount(stats.pendingAllYears ?? stats.pending ?? 0)
      }
    } catch {}
  }, [selectedYearId])

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

  const workflowTabs: {
    id: ExamTabId
    label: string
    href: string
    icon: any
    badge?: number
    alwaysShowBadge?: boolean
    otherYearsBadge?: number
  }[] = [
    { id: "results", label: "Nhập kết quả", href: "/admin/ktdbcl/results", icon: Award },
    { id: "exams", label: "Kỳ thi", href: "/admin/ktdbcl/exams", icon: ClipboardList },
    { id: "students", label: "Đăng ký dự thi", href: "/admin/ktdbcl/students", icon: UserCheck },
    {
      id: "requests",
      label: "Xét duyệt bổ sung",
      href: "/admin/ktdbcl/results?tab=requests",
      icon: CheckCircle2,
      badge: livePendingCount,
      alwaysShowBadge: true,
      otherYearsBadge: otherYearsPending,
    },
    {
      id: "reports",
      label: "Báo cáo thành tích",
      href: "/admin/ktdbcl/results?tab=reports",
      icon: FileSpreadsheet,
    },
    {
      id: "profiles",
      label: "Hồ sơ học sinh",
      href: "/admin/ktdbcl/results?tab=profiles",
      icon: BookOpen,
    },
  ]

  const configTabs: { id: ExamTabId; label: string; href: string; icon: any }[] = [
    { id: "categories", label: "Danh mục kỳ thi", href: "/admin/ktdbcl/categories", icon: Layers },
    { id: "rounds", label: "Vòng thi", href: "/admin/ktdbcl/rounds", icon: GitCommit },
    { id: "achievements", label: "Loại & Mức giải", href: "/admin/ktdbcl/achievements", icon: Trophy },
  ]

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] border-l-4 border-l-[#003B3A] shadow-xs px-4 py-3 mb-4 no-print">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        {/* Left: Compact Masthead Identity + Active Academic Year Context */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] text-[#003B3A] flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-[#008B85]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-sm font-bold text-[#003B3A] leading-tight truncate">
                  Quản lý thành tích học sinh
                </h1>
                {academicYears.length > 0 && (
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#F0FDFA] border border-[#CCFBF1] text-[#003B3A] text-[11px] font-semibold tabular-nums"
                    title="Các kỳ thi, đăng ký và kết quả được phân tách theo Năm học đang chọn"
                  >
                    <Calendar className="w-3 h-3 text-[#008B85] shrink-0" />
                    <span className="text-slate-500 font-medium">Năm học:</span>
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
              <p className="text-[11px] text-slate-500 leading-tight truncate mt-0.5">
                Ghi nhận nhanh giải thưởng, quản lý kỳ thi theo năm học và đồng bộ hồ sơ thành tích
              </p>
            </div>
          </div>

          {/* Mobile/Compact Config Toggle */}
          <Link
            href={isConfigTab ? "/admin/ktdbcl/results" : "/admin/ktdbcl/categories"}
            className={`xl:hidden inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors shrink-0 ${
              isConfigTab
                ? "bg-[#003B3A] text-white border-[#003B3A]"
                : "bg-[#F8FAFC] text-slate-600 border-[#E2E8F0] hover:text-[#003B3A]"
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>{isConfigTab ? "Về nhập kết quả" : "Danh mục"}</span>
          </Link>
        </div>

        {/* Right: Primary Operational Tabs + Config Entry */}
        <div className="flex flex-wrap items-center gap-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0]/80">
          {workflowTabs.map((tab) => {
            const isActive = activeTab === tab.id
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
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-[#003B3A] text-white shadow-2xs"
                    : hasPending
                    ? "bg-amber-50/70 text-[#003B3A] border border-amber-200/80 hover:bg-amber-50"
                    : "text-slate-600 hover:text-[#003B3A] hover:bg-white"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive
                      ? "text-[#5EEAD4]"
                      : hasPending
                      ? "text-[#D97706]"
                      : "text-slate-400"
                  }`}
                />
                <span>{tab.label}</span>
                {showBadge && (
                  <span
                    className={`inline-flex items-center justify-center gap-1 min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold tabular-nums leading-none transition-colors ${
                      hasPending
                        ? isActive
                          ? "bg-[#E11D48] text-white ring-1 ring-white/30 shadow-2xs"
                          : "bg-[#E11D48] text-white shadow-2xs"
                        : hasOtherYearsPending
                        ? isActive
                          ? "bg-[#D97706] text-white"
                          : "bg-amber-100 text-[#D97706] border border-amber-300"
                        : isActive
                        ? "bg-white/15 text-teal-100"
                        : "bg-slate-200/80 text-slate-600"
                    }`}
                  >
                    {(hasPending || hasOtherYearsPending) && (
                      <Clock className="w-2.5 h-2.5 shrink-0" />
                    )}
                    <span>{hasPending ? tab.badge : hasOtherYearsPending ? tab.otherYearsBadge : 0}</span>
                  </span>
                )}
              </Link>
            )
          })}

          <div className="hidden xl:block w-px h-4 bg-[#E2E8F0] mx-0.5" />

          <Link
            href="/admin/ktdbcl/categories"
            className={`hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              isConfigTab
                ? "bg-[#008B85] text-white shadow-2xs"
                : "text-slate-500 hover:text-[#003B3A] hover:bg-white"
            }`}
            title="Cấu hình danh mục kỳ thi, vòng thi và mức giải"
          >
            <Settings2 className={`w-3.5 h-3.5 ${isConfigTab ? "text-white" : "text-slate-400"}`} />
            <span>Danh mục</span>
          </Link>
        </div>
      </div>

      {/* Compact Secondary Sub-strip ONLY when inside Configuration pages */}
      {isConfigTab && (
        <div className="mt-2.5 pt-2.5 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Thiết lập từ điển:</span>
            {configTabs.map((tab) => {
              const isActive = activeTab === tab.id
              const Icon = tab.icon
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    isActive
                      ? "bg-[#F0FDFA] text-[#003B3A] border-[#00A19A]/40"
                      : "bg-white text-slate-600 border-[#E2E8F0] hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#008B85]" : "text-slate-400"}`} />
                  <span>{tab.label}</span>
                </Link>
              )
            })}
          </div>

          <Link
            href="/admin/ktdbcl/results"
            className="text-xs font-semibold text-[#00736E] hover:text-[#003B3A] transition-colors"
          >
            Chuyển sang Nhập kết quả
          </Link>
        </div>
      )}
    </div>
  )
}
