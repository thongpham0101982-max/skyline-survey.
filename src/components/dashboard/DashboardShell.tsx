"use client"

import React from "react"
import { GlobalFilterContext, UserRoleScope } from "@/lib/dashboard/dashboardDataContract"
import { DataFreshnessIndicator } from "./DataFreshnessIndicator"
import { Filter, Building2, Calendar } from "lucide-react"

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
  return (
    <div className="space-y-6 pb-12">
      {/* Header & Global Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#003B3A]/10 text-[#003B3A] rounded text-[11px] font-bold uppercase tracking-wider">
                SSM Unified Dashboard
              </span>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs text-slate-500 font-medium">{roleTitle}</span>
            </div>
            <h1 className="text-lg md:text-xl font-bold text-slate-900 mt-1">
              Trung tâm Điều hành & Báo cáo Giáo dục
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">{scopeDescription}</p>
          </div>

          {/* Role Switcher */}
          {availableRoles.length > 1 && (
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs self-start md:self-center">
              <span className="px-2 text-slate-400 text-[11px]">Góc nhìn:</span>
              {availableRoles.map((r) => (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => onRoleChange(r.role)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    activeRole === r.role
                      ? "bg-white text-[#003B3A] shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Global Context Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Academic Year */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={context.academicYearId}
                onChange={(e) => onContextChange({ academicYearId: e.target.value })}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#003B3A]"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    Năm học: {y.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Campus Scope (For GĐCS / QA / TTCM) */}
            {activeRole !== "TEACHER" && (
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={context.campusId}
                  onChange={(e) => onContextChange({ campusId: e.target.value })}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#003B3A]"
                >
                  <option value="ALL">Toàn hệ thống Sky-Line</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <DataFreshnessIndicator
            freshness={{
              lastUpdated: "08:30 - Hôm nay",
              isStale: false,
              sourceStatus: { OBSERVATION: "SYNCED", ASSESSMENT: "SYNCED" }
            }}
          />
        </div>
      </div>

      {/* Main Content View */}
      {children}
    </div>
  )
}
