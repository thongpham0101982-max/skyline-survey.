"use client"

import React from "react"
import type { LevelFilterCode, ScopeGroup } from "@/lib/timetable/types"
import { VERSION_STATUS_BADGE } from "./TimetableShell"

export interface SerializedFilterContext {
  academicYears: Array<{ id: string; name: string; status: string }>
  selectedYearId: string
  semester: number
  validScopes: Array<{
    code: ScopeGroup
    label: string
    isLookupOnly: boolean
    campusIds: string[]
  }>
  selectedScopeGroup: ScopeGroup
  campusesForScope: Array<{ id: string; campusCode: string; displayName: string }>
  permittedCampuses: Array<{ id: string; campusCode: string; displayName: string }>
  selectedCampusId: string
  levelOptions: Array<{ code: LevelFilterCode; label: string }>
  selectedLevelCode: LevelFilterCode
  availableGrades: string[]
  selectedGrade: string
  classes: Array<{
    id: string
    className: string
    grade: string
    level: string
    educationSystem: string
    homeroomTeacherId: string
    campusId: string
  }>
  selectedClassId: string
  versions: Array<{
    id: string
    code: string
    name: string
    scopeGroup: string
    campusId: string
    levelCode: string
    versionNumber: number
    status: string
    effectiveFrom: string | null
    effectiveTo: string | null
    revision: number
    reviewComment: string | null
    publishedAt: string | null
    updatedAt: string
  }>
  selectedVersionId: string
}

interface TimetableFilterBarProps {
  context: SerializedFilterContext
  onChange: (next: {
    academicYearId?: string
    semester?: number
    scopeGroup?: ScopeGroup
    campusId?: string
    levelCode?: LevelFilterCode
    grade?: string
    classId?: string
    versionId?: string
    viewedWeekDate?: string
  }) => void
  hasUnsavedChanges?: boolean
  loading?: boolean
  showGradeAndClass?: boolean
  showVersion?: boolean
  showViewedWeek?: boolean
  viewedWeekDate?: string
  extraSlot?: React.ReactNode
}

export function TimetableFilterBar({
  context,
  onChange,
  hasUnsavedChanges = false,
  loading = false,
  showGradeAndClass = true,
  showVersion = true,
  showViewedWeek = false,
  viewedWeekDate,
  extraSlot,
}: TimetableFilterBarProps) {
  const guardAndEmit = (patch: Parameters<TimetableFilterBarProps["onChange"]>[0]) => {
    if (hasUnsavedChanges) {
      const ok = window.confirm(
        "Bạn có chỉnh sửa chưa lưu trên phạm vi hiện tại. Chuyển bộ lọc sẽ hủy các thay đổi chưa lưu — tiếp tục?"
      )
      if (!ok) return
    }
    onChange(patch)
  }

  const activeVersion = context.versions.find((v) => v.id === context.selectedVersionId)

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {/* Năm học */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Năm học
          </label>
          <select
            value={context.selectedYearId}
            disabled={loading}
            onChange={(e) => guardAndEmit({ academicYearId: e.target.value, versionId: "" })}
            className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none tabular-nums"
          >
            {context.academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name} {y.status === "ACTIVE" ? "(Đang áp dụng)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Học kỳ */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Học kỳ
          </label>
          <select
            value={context.semester}
            disabled={loading}
            onChange={(e) =>
              guardAndEmit({ semester: Number(e.target.value), versionId: "" })
            }
            className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none tabular-nums"
          >
            <option value={1}>Học kỳ 1</option>
            <option value={2}>Học kỳ 2</option>
          </select>
        </div>

        {/* Bộ Thời khóa biểu */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Bộ thời khóa biểu
          </label>
          <select
            value={context.selectedScopeGroup}
            disabled={loading}
            onChange={(e) =>
              guardAndEmit({
                scopeGroup: e.target.value as ScopeGroup,
                campusId: "",
                levelCode: "ALL",
                grade: "ALL",
                classId: "ALL",
                versionId: "",
              })
            }
            className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none"
          >
            {context.validScopes.map((sc) => (
              <option key={sc.code} value={sc.code}>
                {sc.label}
              </option>
            ))}
          </select>
        </div>

        {/* Cơ sở */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Cơ sở đào tạo
          </label>
          <select
            value={context.selectedCampusId}
            disabled={loading || context.campusesForScope.length === 0}
            onChange={(e) =>
              guardAndEmit({
                campusId: e.target.value,
                grade: "ALL",
                classId: "ALL",
                versionId: "",
              })
            }
            className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none"
          >
            {context.campusesForScope.length === 0 ? (
              <option value="">Không có cơ sở hợp lệ</option>
            ) : (
              context.campusesForScope.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Cấp học */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Cấp học
          </label>
          <select
            value={context.selectedLevelCode}
            disabled={loading || context.levelOptions.length <= 1}
            onChange={(e) =>
              guardAndEmit({
                levelCode: e.target.value as LevelFilterCode,
                grade: "ALL",
                classId: "ALL",
              })
            }
            className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none"
          >
            {context.levelOptions.length === 0 ? (
              <option value="ALL">Không có lớp thuộc cấp này</option>
            ) : (
              context.levelOptions.map((lv) => (
                <option key={lv.code} value={lv.code}>
                  {lv.label}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Phiên bản */}
        {showVersion && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Phiên bản lịch
            </label>
            <select
              value={context.selectedVersionId}
              disabled={loading || context.versions.length === 0}
              onChange={(e) => guardAndEmit({ versionId: e.target.value })}
              className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none tabular-nums"
            >
              {context.versions.length === 0 ? (
                <option value="">Chưa có phiên bản</option>
              ) : (
                context.versions.map((v) => {
                  const st = VERSION_STATUS_BADGE[v.status]?.label || v.status
                  return (
                    <option key={v.id} value={v.id}>
                      {v.name} ({st})
                    </option>
                  )
                })
              )}
            </select>
          </div>
        )}
      </div>

      {(showGradeAndClass || showViewedWeek || activeVersion || extraSlot) && (
        <div className="pt-2 border-t border-[#F1F5F9] flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            {showGradeAndClass && (
              <>
                <div className="min-w-[130px]">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Khối lớp
                  </label>
                  <select
                    value={context.selectedGrade}
                    disabled={loading}
                    onChange={(e) => onChange({ grade: e.target.value, classId: "ALL" })}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none tabular-nums"
                  >
                    <option value="ALL">Tất cả khối ({context.availableGrades.length})</option>
                    {context.availableGrades.map((g) => (
                      <option key={g} value={g}>
                        Khối {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="min-w-[150px]">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Lớp học
                  </label>
                  <select
                    value={context.selectedClassId}
                    disabled={loading}
                    onChange={(e) => onChange({ classId: e.target.value })}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none tabular-nums"
                  >
                    <option value="ALL">Tất cả lớp ({context.classes.length})</option>
                    {context.classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        Lớp {c.className}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {showViewedWeek && (
              <div className="min-w-[165px]">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tuần đang xem
                </label>
                <input
                  type="date"
                  value={viewedWeekDate || ""}
                  onChange={(e) => onChange({ viewedWeekDate: e.target.value })}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none tabular-nums"
                />
              </div>
            )}

            {extraSlot}
          </div>

          {activeVersion && (
            <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
              <span
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                  VERSION_STATUS_BADGE[activeVersion.status]?.className ||
                  "bg-slate-100 text-slate-700"
                }`}
              >
                {VERSION_STATUS_BADGE[activeVersion.status]?.label || activeVersion.status}
              </span>
              <span className="text-slate-500">
                Mã: <strong className="text-slate-700">{activeVersion.code}</strong>
              </span>
              {(activeVersion.effectiveFrom || activeVersion.effectiveTo) && (
                <span className="text-slate-500">
                  Hiệu lực:{" "}
                  <strong className="text-slate-700">
                    {activeVersion.effectiveFrom || "Đầu kỳ"} →{" "}
                    {activeVersion.effectiveTo || "Cuối kỳ"}
                  </strong>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
