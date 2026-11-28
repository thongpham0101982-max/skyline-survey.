"use client"

import React, { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import type { LevelFilterCode, ScopeGroup } from "@/lib/timetable/types"
import { VERSION_STATUS_BADGE } from "./TimetableShell"

const SCOPE_FILTER_MEMORY_KEY = "ssm_tkb_scope_filter_memory_v2"

interface RememberedScopeFilter {
  campusId?: string
  levelCode?: LevelFilterCode
  studyProgram?: string
  grade?: string
  classId?: string
  versionId?: string
}

function readScopeMemory(yearId: string, semester: number, scopeGroup: ScopeGroup): RememberedScopeFilter | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(SCOPE_FILTER_MEMORY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, RememberedScopeFilter>
    return parsed[`${yearId}::${semester}::${scopeGroup}`] || null
  } catch {
    return null
  }
}

function writeScopeMemory(
  yearId: string,
  semester: number,
  scopeGroup: ScopeGroup,
  value: RememberedScopeFilter
) {
  if (typeof window === "undefined" || !yearId || !scopeGroup) return
  try {
    const raw = window.localStorage.getItem(SCOPE_FILTER_MEMORY_KEY)
    const parsed: Record<string, RememberedScopeFilter> = raw ? JSON.parse(raw) : {}
    parsed[`${yearId}::${semester}::${scopeGroup}`] = value
    window.localStorage.setItem(SCOPE_FILTER_MEMORY_KEY, JSON.stringify(parsed))
  } catch {
    // ignore storage quota errors
  }
}

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
  selectedCampusIds?: string[]
  selectedCampusFilter?: string
  isAllCampusesSelected?: boolean
  levelOptions: Array<{ code: LevelFilterCode; label: string }>
  selectedLevelCode: LevelFilterCode
  availableStudyPrograms?: Array<{ code: "Hệ S" | "Hệ I"; count: number }>
  selectedStudyProgram?: "ALL" | "Hệ S" | "Hệ I"
  availableGrades: string[]
  selectedGrade: string
  classes: Array<{
    id: string
    className: string
    grade: string
    level: string
    educationSystem: string
    studyProgram?: "Hệ S" | "Hệ I"
    homeroomTeacherId: string
    campusId: string
    campusCode?: string
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
    studyProgram?: string
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
  const [campusDropdownOpen, setCampusDropdownOpen] = useState(false)
  const campusDropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!campusDropdownOpen) return
    const handleOutside = (e: MouseEvent) => {
      if (
        campusDropdownRef.current &&
        !campusDropdownRef.current.contains(e.target as Node)
      ) {
        setCampusDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [campusDropdownOpen])

  useEffect(() => {
    if (!context.selectedYearId || !context.selectedScopeGroup) return
    writeScopeMemory(context.selectedYearId, context.semester, context.selectedScopeGroup, {
      campusId: context.selectedCampusFilter || "ALL",
      levelCode: context.selectedLevelCode,
      studyProgram: context.selectedStudyProgram || "ALL",
      grade: context.selectedGrade,
      classId: context.selectedClassId,
      versionId: context.selectedVersionId,
    })
  }, [
    context.selectedYearId,
    context.semester,
    context.selectedScopeGroup,
    context.selectedCampusFilter,
    context.selectedLevelCode,
    context.selectedStudyProgram,
    context.selectedGrade,
    context.selectedClassId,
    context.selectedVersionId,
  ])

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
            onChange={(e) => {
              const nextYearId = e.target.value
              const mem = readScopeMemory(nextYearId, context.semester, context.selectedScopeGroup)
              guardAndEmit({
                academicYearId: nextYearId,
                campusId: mem?.campusId || "ALL",
                versionId: mem?.versionId || "",
              })
            }}
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
            onChange={(e) => {
              const nextSem = Number(e.target.value)
              const mem = readScopeMemory(context.selectedYearId, nextSem, context.selectedScopeGroup)
              guardAndEmit({
                semester: nextSem,
                campusId: mem?.campusId || context.selectedCampusFilter || "ALL",
                versionId: mem?.versionId || "",
              })
            }}
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
            onChange={(e) => {
              const nextScope = e.target.value as ScopeGroup
              const mem = readScopeMemory(context.selectedYearId, context.semester, nextScope)
              guardAndEmit({
                scopeGroup: nextScope,
                campusId: mem?.campusId || "ALL",
                levelCode: mem?.levelCode || "ALL",
                studyProgram: mem?.studyProgram || "ALL",
                grade: mem?.grade || "ALL",
                classId: mem?.classId || "ALL",
                versionId: mem?.versionId || "",
              })
            }}
            className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none"
          >
            {context.validScopes.map((sc) => (
              <option key={sc.code} value={sc.code}>
                {sc.label}
              </option>
            ))}
          </select>
        </div>

        {/* Cơ sở đào tạo (Chọn hết / Chọn gộp nhiều cơ sở / Chọn riêng lẻ) */}
        <div className="relative" ref={campusDropdownRef}>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Cơ sở đào tạo
          </label>
          {(() => {
            const allScopeCampuses = context.campusesForScope || []
            const activeIds =
              context.selectedCampusIds && context.selectedCampusIds.length > 0
                ? context.selectedCampusIds
                : context.selectedCampusId
                ? [context.selectedCampusId]
                : []
            const activeSet = new Set(activeIds)
            const isAll =
              Boolean(context.isAllCampusesSelected) ||
              (allScopeCampuses.length > 0 && activeSet.size >= allScopeCampuses.length)

            const selectedShortCodes = allScopeCampuses
              .filter((c) => activeSet.has(c.id))
              .map((c) => c.campusCode || c.displayName)

            const buttonLabel =
              allScopeCampuses.length === 0
                ? "Không có cơ sở hợp lệ"
                : isAll
                ? allScopeCampuses.length === 1
                  ? allScopeCampuses[0].displayName
                  : `Tất cả cơ sở (${allScopeCampuses.length}) — ${selectedShortCodes.join(", ")}`
                : activeSet.size === 1
                ? allScopeCampuses.find((c) => activeSet.has(c.id))?.displayName ||
                  selectedShortCodes[0]
                : `Đã chọn ${activeSet.size}/${allScopeCampuses.length} (${selectedShortCodes.join(", ")})`

            const applyCampusIds = (nextIds: string[]) => {
              const allIds = allScopeCampuses.map((c) => c.id)
              const ordered = allIds.filter((id) => nextIds.includes(id))
              const nextParam =
                ordered.length === 0 || ordered.length >= allIds.length
                  ? "ALL"
                  : ordered.join(",")
              guardAndEmit({
                campusId: nextParam,
                grade: "ALL",
                classId: "ALL",
              })
            }

            return (
              <>
                <button
                  type="button"
                  disabled={loading || allScopeCampuses.length === 0}
                  onClick={() => setCampusDropdownOpen((v) => !v)}
                  title={buttonLabel}
                  className="w-full flex items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-slate-800 hover:border-[#00A19A] focus:border-[#00A19A] focus:outline-none tabular-nums cursor-pointer"
                >
                  <span className="truncate text-left">{buttonLabel}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                </button>

                {campusDropdownOpen && allScopeCampuses.length > 0 && (
                  <div className="absolute left-0 right-0 z-40 mt-1.5 min-w-[270px] rounded-2xl border border-[#E2E8F0] bg-white shadow-lg overflow-hidden tabular-nums">
                    <div className="px-3 py-2 bg-[#F0FDFA] border-b border-[#E2E8F0] flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-[#003B3A] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isAll}
                          onChange={() => {
                            if (!isAll) {
                              applyCampusIds(allScopeCampuses.map((c) => c.id))
                            } else if (allScopeCampuses.length > 0) {
                              applyCampusIds([allScopeCampuses[0].id])
                            }
                          }}
                          className="w-3.5 h-3.5 accent-[#003B3A] rounded"
                        />
                        <span>Chọn tất cả cơ sở ({allScopeCampuses.length})</span>
                      </label>
                      {!isAll && (
                        <button
                          type="button"
                          onClick={() => {
                            applyCampusIds(allScopeCampuses.map((c) => c.id))
                            setCampusDropdownOpen(false)
                          }}
                          className="text-[11px] font-semibold text-[#008B85] hover:underline cursor-pointer"
                        >
                          Chọn hết
                        </button>
                      )}
                    </div>

                    <div className="max-h-60 overflow-y-auto divide-y divide-[#F1F5F9]">
                      {allScopeCampuses.map((c) => {
                        const checked = activeSet.has(c.id)
                        return (
                          <div
                            key={c.id}
                            className={`px-3 py-2 flex items-center justify-between gap-2 text-xs transition-colors ${
                              checked ? "bg-[#F8FAFC]" : "bg-white hover:bg-[#F8FAFC]"
                            }`}
                          >
                            <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  if (checked) {
                                    const remaining = activeIds.filter((id) => id !== c.id)
                                    if (remaining.length === 0) return
                                    applyCampusIds(remaining)
                                  } else {
                                    applyCampusIds([...activeIds, c.id])
                                  }
                                }}
                                className="w-3.5 h-3.5 accent-[#003B3A] rounded shrink-0"
                              />
                              <span
                                className={`truncate ${
                                  checked
                                    ? "font-semibold text-[#003B3A]"
                                    : "text-slate-600"
                                }`}
                              >
                                {c.displayName}
                              </span>
                            </label>

                            {allScopeCampuses.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  applyCampusIds([c.id])
                                  setCampusDropdownOpen(false)
                                }}
                                title={`Chỉ xem riêng ${c.displayName}`}
                                className="px-2 py-0.5 rounded-md bg-white border border-[#E2E8F0] text-[10.5px] font-semibold text-[#00736E] hover:bg-[#F0FDFA] hover:border-[#00A19A] shrink-0 cursor-pointer"
                              >
                                Chỉ cơ sở này
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )
          })()}
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
                <div className="min-w-[140px]">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Hệ chương trình
                  </label>
                  <select
                    value={context.selectedStudyProgram || "ALL"}
                    disabled={loading}
                    onChange={(e) =>
                      onChange({
                        studyProgram: e.target.value,
                        grade: "ALL",
                        classId: "ALL",
                      })
                    }
                    className="w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-[#00A19A] focus:outline-none tabular-nums"
                  >
                    <option value="ALL">
                      Tất cả hệ (
                      {(context.availableStudyPrograms || []).reduce(
                        (s, p) => s + p.count,
                        0
                      ) || context.classes.length}{" "}
                      lớp)
                    </option>
                    {(context.availableStudyPrograms || []).map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.code} ({p.count} lớp)
                      </option>
                    ))}
                  </select>
                </div>

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

                <div className="min-w-[175px]">
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
                    {(() => {
                      const inferSys = (c: (typeof context.classes)[0]) =>
                        c.studyProgram ||
                        (/INT|UK|COMPASS|HNG|SB/i.test(
                          `${c.educationSystem || ""} ${c.className}`
                        )
                          ? "Hệ I"
                          : "Hệ S")
                      const heSList = context.classes.filter((c) => inferSys(c) === "Hệ S")
                      const heIList = context.classes.filter((c) => inferSys(c) === "Hệ I")

                      if (heSList.length > 0 && heIList.length > 0) {
                        return (
                          <>
                            <optgroup label={`Hệ S (${heSList.length} lớp)`}>
                              {heSList.map((c) => (
                                <option key={c.id} value={c.id}>
                                  Lớp {c.className} (Hệ S)
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label={`Hệ I (${heIList.length} lớp)`}>
                              {heIList.map((c) => (
                                <option key={c.id} value={c.id}>
                                  Lớp {c.className} (Hệ I)
                                </option>
                              ))}
                            </optgroup>
                          </>
                        )
                      }

                      return context.classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          Lớp {c.className} ({inferSys(c)})
                        </option>
                      ))
                    })()}
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
