"use client"

import React from "react"
import { GlobalFilterContext, UserRoleScope } from "@/lib/dashboard/dashboardDataContract"
import { DataFreshnessIndicator } from "./DataFreshnessIndicator"
import { Filter, Building2, Calendar, Sparkles } from "lucide-react"
import { resolveCampusTheme } from "@/hooks/useCampusTheme"
import { SchoolCampusArtwork } from "@/components/UserWelcomeCard"

interface DashboardShellProps {
  roleTitle: string
  scopeDescription: string
  context: GlobalFilterContext
  onContextChange: (newCtx: Partial<GlobalFilterContext>) => void
  campuses: { id: string; name: string }[]
  academicYears: { id: string; name: string }[]
  activeRole: UserRoleScope
  onRoleChange: (r: UserRoleScope) => void
  availableRoles: { role: UserRoleScope; label: string }[]
  children: React.ReactNode
}

export function DashboardShell({
  roleTitle,
  scopeDescription,
  context,
  onContextChange,
  campuses,
  academicYears,
  activeRole,
  onRoleChange,
  availableRoles,
  children
}: DashboardShellProps) {
  const activeCampusObj = campuses.find((c) => c.id === context.campusId)
  const campusTheme = resolveCampusTheme(activeCampusObj?.name)

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Global Filters đồng bộ nhận diện Sky-Line */}
      <div
        className="group/card bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden space-y-4"
        style={{
          background: `linear-gradient(135deg, ${campusTheme.lightBg} 0%, #FFFFFF 52%, ${campusTheme.lightAccentBg} 100%)`
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-1.5 z-30"
          style={{ background: campusTheme.heroBadgeGradient }}
        />

        <div className="hidden sm:block absolute top-0 right-0 bottom-0 sm:w-[52%] md:w-[46%] z-0 pointer-events-none">
          <SchoolCampusArtwork theme={campusTheme} opacityClass="opacity-80" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 bg-[#003B3A]/10 text-[#003B3A] rounded-full text-[11px] font-bold uppercase tracking-wider">
                SSM Unified Dashboard
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-600 font-semibold">{roleTitle}</span>
            </div>
            <h1 className="text-lg md:text-2xl font-extrabold text-slate-800 mt-1.5 tracking-tight">
              Trung tâm Điều hành & Báo cáo Giáo dục
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{scopeDescription}</p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2">
            <div
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/85 backdrop-blur-md border shadow-2xs"
              style={{ borderColor: campusTheme.borderSubtle }}
            >
              <Sparkles className="w-3 h-3 shrink-0" style={{ color: campusTheme.primaryColor }} />
              <span
                className="text-xs font-bold tracking-wide select-none"
                style={{
                  color: campusTheme.accentColor,
                  fontFamily: "'Dancing Script', 'Caveat', 'Segoe Script', cursive"
                }}
              >
                {campusTheme.motto}
              </span>
            </div>

            {/* Role Switcher */}
            {availableRoles.length > 1 && (
              <div className="flex items-center gap-1.5 p-1 bg-white/90 backdrop-blur-md rounded-xl border border-slate-200/80 text-xs shadow-2xs">
                <span className="px-2 text-slate-500 text-[11px] font-semibold">Góc nhìn:</span>
                {availableRoles.map((r) => (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => onRoleChange(r.role)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      activeRole === r.role
                        ? "bg-[#003B3A] text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Global Context Bar */}
        <div className="relative z-10 pt-3.5 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Academic Year */}
            <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-slate-200/80 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-[#00A19A]" />
              <select
                value={context.academicYearId}
                onChange={(e) => onContextChange({ academicYearId: e.target.value })}
                className="py-0.5 text-slate-800 font-semibold bg-transparent focus:outline-none cursor-pointer"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    Năm học: {y.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Campus Selector (for QA / Multi-campus users) */}
            {activeRole !== "GV" && (
              <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-slate-200/80 shadow-2xs">
                <Building2 className="w-3.5 h-3.5 text-[#AE882E]" />
                <select
                  value={context.campusId || "ALL"}
                  onChange={(e) =>
                    onContextChange({
                      campusId: e.target.value === "ALL" ? undefined : e.target.value
                    })
                  }
                  className="py-0.5 text-slate-800 font-semibold bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Tất cả cơ sở</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      Cơ sở: {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Evaluation Round */}
            <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-slate-200/80 shadow-2xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={context.roundCode || "GK1"}
                onChange={(e) => onContextChange({ roundCode: e.target.value })}
                className="py-0.5 text-slate-800 font-semibold bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="KSDV">Đợt: Khảo sát đầu vào (KSĐV)</option>
                <option value="GK1">Đợt: Giữa học kỳ 1 (GK1)</option>
                <option value="CK1">Đợt: Cuối học kỳ 1 (CK1)</option>
                <option value="GK2">Đợt: Giữa học kỳ 2 (GK2)</option>
                <option value="CK2">Đợt: Cuối học kỳ 2 (CK2)</option>
              </select>
            </div>
          </div>

          <DataFreshnessIndicator />
        </div>
      </div>

      {/* Main Content Area */}
      <div>{children}</div>
    </div>
  )
}
