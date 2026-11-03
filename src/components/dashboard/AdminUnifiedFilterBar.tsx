"use client"

import React from "react"
import {
  Calendar,
  Building2,
  Layers,
  GraduationCap,
  Clock,
  RotateCcw,
  Radio,
  RefreshCw,
  SlidersHorizontal
} from "lucide-react"

export interface AdminDashboardFilterState {
  academicYearId: string
  campusId: string
  level: string
  grade: string
  timeRange: string
}

interface AdminUnifiedFilterBarProps {
  filters: AdminDashboardFilterState
  onFilterChange: (patch: Partial<AdminDashboardFilterState>) => void
  onReset: () => void
  academicYears: { id: string; name: string; status?: string }[]
  campuses: { id: string; campusCode?: string; campusName: string }[]
  availableGrades: { value: string; label: string; level: string }[]
  isAutoRefresh: boolean
  onToggleAutoRefresh: () => void
  onManualRefresh: () => void
  isRefreshing: boolean
  lastUpdated?: string
}

export function AdminUnifiedFilterBar({
  filters,
  onFilterChange,
  onReset,
  academicYears = [],
  campuses = [],
  availableGrades = [],
  isAutoRefresh,
  onToggleAutoRefresh,
  onManualRefresh,
  isRefreshing,
  lastUpdated
}: AdminUnifiedFilterBarProps) {
  // Filter available grades by selected level
  const filteredGradeOptions =
    filters.level === "ALL"
      ? availableGrades
      : availableGrades.filter((g) => g.level === filters.level)

  const activeFilterCount = [
    filters.campusId !== "ALL",
    filters.level !== "ALL",
    filters.grade !== "ALL",
    filters.timeRange !== "FULL_YEAR"
  ].filter(Boolean).length

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs sticky top-16 z-20 backdrop-blur-md bg-white/95">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Left: Label + 5 Unified Selectors */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 flex-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#003B3A] text-white text-xs font-semibold shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#2DD4BF]" />
            <span>Bộ lọc Điều hành</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#00A19A] text-white text-[10px] font-mono">
                {activeFilterCount}
              </span>
            )}
          </div>

          {/* 1. Năm học */}
          <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/80 px-2.5 py-1.5 rounded-xl border border-slate-200/90 transition-colors">
            <Calendar className="w-3.5 h-3.5 text-[#00A19A] shrink-0" />
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Năm học:</span>
            <select
              aria-label="Chọn năm học"
              value={filters.academicYearId}
              onChange={(e) => onFilterChange({ academicYearId: e.target.value })}
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-1"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.status === "ACTIVE" ? "(Hiện tại)" : ""}
                </option>
              ))}
              {academicYears.length === 0 && <option value="">2026-2027</option>}
            </select>
          </div>

          {/* 2. Cơ sở */}
          <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/80 px-2.5 py-1.5 rounded-xl border border-slate-200/90 transition-colors">
            <Building2 className="w-3.5 h-3.5 text-[#6C5CE7] shrink-0" />
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Cơ sở:</span>
            <select
              aria-label="Chọn cơ sở"
              value={filters.campusId}
              onChange={(e) => onFilterChange({ campusId: e.target.value })}
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-1"
            >
              <option value="ALL">Tất cả Cơ sở (Toàn hệ thống)</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.campusName}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Cấp học */}
          <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/80 px-2.5 py-1.5 rounded-xl border border-slate-200/90 transition-colors">
            <Layers className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Cấp học:</span>
            <select
              aria-label="Chọn cấp học"
              value={filters.level}
              onChange={(e) =>
                onFilterChange({
                  level: e.target.value,
                  grade: "ALL" // Reset khối khi đổi cấp học
                })
              }
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-1"
            >
              <option value="ALL">Tất cả Cấp học</option>
              <option value="Mầm non">Mầm non</option>
              <option value="Tiểu học">Tiểu học (Khối 1 - 5)</option>
              <option value="THCS">THCS (Khối 6 - 9)</option>
              <option value="THPT">THPT (Khối 10 - 12)</option>
            </select>
          </div>

          {/* 4. Khối lớp */}
          <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/80 px-2.5 py-1.5 rounded-xl border border-slate-200/90 transition-colors">
            <GraduationCap className="w-3.5 h-3.5 text-[#2E1065] shrink-0" />
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Khối:</span>
            <select
              aria-label="Chọn khối lớp"
              value={filters.grade}
              onChange={(e) => onFilterChange({ grade: e.target.value })}
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-1"
            >
              <option value="ALL">Tất cả Khối</option>
              {filteredGradeOptions.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Khoảng thời gian */}
          <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/80 px-2.5 py-1.5 rounded-xl border border-slate-200/90 transition-colors">
            <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Thời gian:</span>
            <select
              aria-label="Chọn khoảng thời gian"
              value={filters.timeRange}
              onChange={(e) => onFilterChange({ timeRange: e.target.value })}
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-1"
            >
              <option value="FULL_YEAR">Toàn năm học</option>
              <option value="HK1">Học kỳ I (Tháng 8 - Tháng 12)</option>
              <option value="HK2">Học kỳ II (Tháng 1 - Tháng 5)</option>
              <option value="LAST_6_MONTHS">6 tháng gần nhất</option>
              <option value="LAST_3_MONTHS">3 tháng gần nhất</option>
              <option value="CURRENT_MONTH">Tháng hiện tại</option>
            </select>
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 text-xs font-semibold transition-all cursor-pointer"
              title="Đặt lại toàn bộ bộ lọc về mặc định"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Đặt lại ({activeFilterCount})</span>
            </button>
          )}
        </div>

        {/* Right: Auto-refresh & Sync controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 border-slate-100">
          {lastUpdated && (
            <span className="text-[11px] text-slate-500 font-mono hidden 2xl:inline">
              Cập nhật: <strong className="text-slate-700">{lastUpdated}</strong>
            </span>
          )}

          <button
            type="button"
            onClick={onToggleAutoRefresh}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              isAutoRefresh
                ? "bg-teal-50/90 text-[#00736E] border-teal-200"
                : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
            }`}
            title="Tự động làm mới dữ liệu mỗi 30 giây"
          >
            <Radio className={`w-3.5 h-3.5 ${isAutoRefresh ? "animate-pulse text-[#00A19A]" : ""}`} />
            <span>30s: <strong>{isAutoRefresh ? "BẬT" : "TẮT"}</strong></span>
          </button>

          <button
            type="button"
            onClick={onManualRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 bg-[#003B3A] hover:bg-[#004D4B] text-white rounded-xl text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Đồng bộ</span>
          </button>
        </div>
      </div>
    </div>
  )
}
