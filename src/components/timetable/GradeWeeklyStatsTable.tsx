"use client"

import React, { useEffect, useMemo, useState } from "react"
import { X } from "lucide-react"
import {
  buildAllGradesMatrixStats,
  buildSingleGradeStats,
  sortGradeStrings,
  WEEKLY_STANDARD_PERIODS,
  type ClassForGradeStats,
} from "@/lib/timetable/gradeStatsHelper"
import type { SubjectRef } from "@/lib/timetable/quotaReconciler"
import type { QuotaReconcileItem, SlotRecord } from "@/lib/timetable/types"

interface GradeWeeklyStatsTableProps {
  classes: ClassForGradeStats[]
  quotaItems: QuotaReconcileItem[]
  slots: SlotRecord[]
  subjects: SubjectRef[]
  defaultGrade?: string // e.g. "6" or "ALL"
  cycleWeeks?: number
  targetWeeklyPeriods?: number
  onClose?: () => void
  onSelectClass?: (classId: string) => void
  onUpdateQuota?: (params: {
    subjectId: string
    studyProgram: string
    grade: string
    weeklyQuota: number
  }) => Promise<void> | void
}

export function GradeWeeklyStatsTable({
  classes,
  quotaItems,
  slots,
  subjects,
  defaultGrade = "ALL",
  cycleWeeks = 2,
  targetWeeklyPeriods = WEEKLY_STANDARD_PERIODS,
  onClose,
  onSelectClass,
  onUpdateQuota,
}: GradeWeeklyStatsTableProps) {
  const availableGrades = useMemo(
    () =>
      sortGradeStrings(
        Array.from(new Set(classes.map((c) => String(c.grade).trim()).filter(Boolean)))
      ),
    [classes]
  )

  const [mode, setMode] = useState<"SINGLE_GRADE" | "ALL_GRADES">(() =>
    defaultGrade && defaultGrade !== "ALL" ? "SINGLE_GRADE" : "SINGLE_GRADE"
  )
  const [selectedGrade, setSelectedGrade] = useState<string>(() => {
    if (defaultGrade && defaultGrade !== "ALL" && availableGrades.includes(defaultGrade)) {
      return defaultGrade
    }
    return availableGrades[0] || ""
  })
  const [selectedProgram, setSelectedProgram] = useState<string>("ALL")
  const [onlyOverFilter, setOnlyOverFilter] = useState<boolean>(false)
  const [savingCellKey, setSavingCellKey] = useState<string | null>(null)

  useEffect(() => {
    if (defaultGrade && defaultGrade !== "ALL" && availableGrades.includes(defaultGrade)) {
      setSelectedGrade(defaultGrade)
    } else if (!availableGrades.includes(selectedGrade) && availableGrades.length > 0) {
      setSelectedGrade(availableGrades[0])
    }
  }, [defaultGrade, availableGrades, selectedGrade])

  const singleReport = useMemo(() => {
    const g = selectedGrade || availableGrades[0] || ""
    return buildSingleGradeStats({
      grade: g,
      classes,
      quotaItems,
      slots,
      subjects,
      studyProgramFilter: selectedProgram,
      cycleWeeks,
      targetWeeklyPeriods,
    })
  }, [
    selectedGrade,
    availableGrades,
    classes,
    quotaItems,
    slots,
    subjects,
    selectedProgram,
    cycleWeeks,
    targetWeeklyPeriods,
  ])

  const matrixReport = useMemo(() => {
    return buildAllGradesMatrixStats({
      classes,
      quotaItems,
      slots,
      subjects,
      studyProgramFilter:
        selectedProgram === "ALL" ? undefined : selectedProgram,
      targetWeeklyPeriods,
    })
  }, [classes, quotaItems, slots, subjects, selectedProgram, targetWeeklyPeriods])

  // Quick badge summary per grade pill
  const gradeQuickTotals = useMemo(() => {
    const map = new Map<string, { quota: number; avgSched: number; overSubjectCount: number }>()
    for (const g of availableGrades) {
      const rep = buildSingleGradeStats({
        grade: g,
        classes,
        quotaItems,
        slots,
        subjects,
        studyProgramFilter: selectedProgram,
        cycleWeeks,
        targetWeeklyPeriods,
      })
      map.set(g, {
        quota: rep.totalGradeQuota,
        avgSched: rep.averageScheduledPeriods,
        overSubjectCount: rep.subjectRows.filter((r) => r.rowStatus === "OVER").length,
      })
    }
    return map
  }, [
    availableGrades,
    classes,
    quotaItems,
    slots,
    subjects,
    selectedProgram,
    cycleWeeks,
    targetWeeklyPeriods,
  ])

  const overQuotaSubjectCount = useMemo(
    () => singleReport.subjectRows.filter((r) => r.rowStatus === "OVER").length,
    [singleReport.subjectRows]
  )

  const displayedSingleRows = useMemo(
    () =>
      onlyOverFilter
        ? singleReport.subjectRows.filter((r) => r.rowStatus === "OVER")
        : singleReport.subjectRows,
    [singleReport.subjectRows, onlyOverFilter]
  )

  const handleCommitQuota = async (
    subjectId: string,
    studyProgram: string,
    grade: string,
    currentQuota: number,
    rawNext: string
  ) => {
    if (!onUpdateQuota) return
    const parsed = Number(rawNext)
    if (Number.isNaN(parsed) || parsed < 0 || Math.abs(parsed - currentQuota) < 0.001) {
      return
    }
    const key = `${grade}_${studyProgram}_${subjectId}`
    setSavingCellKey(key)
    try {
      await onUpdateQuota({
        subjectId,
        studyProgram,
        grade,
        weeklyQuota: parsed,
      })
    } finally {
      setSavingCellKey(null)
    }
  }

  const renderStandardDiffBadge = (totalVal: number, target: number) => {
    const diff = Math.round((totalVal - target) * 100) / 100
    if (Math.abs(diff) < 0.001) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-[#059669] border border-emerald-200 text-[11px] font-semibold">
          Đủ {target} tiết/tuần
        </span>
      )
    }
    if (diff < 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-[#D97706] border border-amber-200 text-[11px] font-semibold">
          Còn trống {Math.abs(diff)} tiết
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50 text-[#E11D48] border border-rose-200 text-[11px] font-semibold">
        Vượt +{diff} tiết
      </span>
    )
  }

  if (availableGrades.length === 0) {
    return null
  }

  const activePrograms =
    mode === "SINGLE_GRADE"
      ? singleReport.availablePrograms
      : matrixReport.availablePrograms

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden tabular-nums">
      {/* Header & Controls Strip */}
      <div className="px-4 py-3.5 border-b border-[#E2E8F0] border-l-4 border-l-[#003B3A] bg-white flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-[#003B3A]">
              Bảng thống kê các môn theo khối — Chuẩn tuần {targetWeeklyPeriods} tiết
            </h3>
            <span className="px-2 py-0.5 rounded-lg bg-[#F0FDFA] text-[#00736E] border border-teal-200 text-[11px] font-semibold">
              5 ngày × 8 tiết = {targetWeeklyPeriods} tiết/tuần
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng hợp định mức môn học theo khối và số tiết thực xếp trên từng lớp (tính đủ 0.5 tiết cho mỗi môn luân phiên Chẵn/Lẻ)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Mode Control */}
          <div className="inline-flex items-center rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-0.5">
            <button
              type="button"
              onClick={() => setMode("SINGLE_GRADE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                mode === "SINGLE_GRADE"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "text-slate-600 hover:text-[#003B3A]"
              }`}
            >
              Chi tiết theo khối
            </button>
            <button
              type="button"
              onClick={() => setMode("ALL_GRADES")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                mode === "ALL_GRADES"
                  ? "bg-[#003B3A] text-white shadow-xs"
                  : "text-slate-600 hover:text-[#003B3A]"
              }`}
            >
              Tổng hợp tất cả khối ({availableGrades.length})
            </button>
          </div>

          {activePrograms.length > 1 && (
            <div className="inline-flex items-center rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-0.5">
              {mode === "SINGLE_GRADE" && (
                <button
                  type="button"
                  onClick={() => setSelectedProgram("ALL")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    singleReport.selectedProgram === "ALL"
                      ? "bg-[#00736E] text-white"
                      : "text-slate-600 hover:text-[#003B3A]"
                  }`}
                >
                  Tất cả hệ
                </button>
              )}
              {activePrograms.map((prog) => {
                const isSelected =
                  mode === "SINGLE_GRADE"
                    ? singleReport.selectedProgram === prog
                    : matrixReport.selectedProgram === prog
                return (
                  <button
                    key={prog}
                    type="button"
                    onClick={() => setSelectedProgram(prog)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#00736E] text-white"
                        : "text-slate-600 hover:text-[#003B3A]"
                    }`}
                  >
                    {prog}
                  </button>
                )
              })}
            </div>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Thu gọn bảng thống kê"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-slate-600 hover:text-[#003B3A] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Thu gọn</span>
            </button>
          )}
        </div>
      </div>

      {/* Grade Selector Strip (for Single Grade view) */}
      {mode === "SINGLE_GRADE" && (
        <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {availableGrades.map((g) => {
              const isSelected = singleReport.grade === g
              const qt = gradeQuickTotals.get(g)
              const qTotal = qt?.quota ?? 0
              const overSubCnt = qt?.overSubjectCount ?? 0
              const isExact40 = Math.abs(qTotal - targetWeeklyPeriods) < 0.001
              const isOver40 = qTotal > targetWeeklyPeriods + 0.001

              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setSelectedGrade(g)
                    setOnlyOverFilter(false)
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#003B3A] text-white border-[#003B3A]"
                      : overSubCnt > 0
                      ? "bg-rose-50/50 text-[#003B3A] border-rose-300 hover:border-[#E11D48]"
                      : "bg-white text-slate-700 border-[#E2E8F0] hover:border-[#00A19A]"
                  }`}
                >
                  <span>Khối {g}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10.5px] font-semibold ${
                      isSelected
                        ? isExact40
                          ? "bg-[#5EEAD4]/20 text-[#5EEAD4]"
                          : isOver40
                          ? "bg-rose-500/25 text-rose-200"
                          : "bg-amber-400/25 text-amber-200"
                        : isExact40
                        ? "bg-emerald-50 text-[#059669]"
                        : isOver40
                        ? "bg-rose-50 text-[#E11D48]"
                        : "bg-amber-50 text-[#D97706]"
                    }`}
                  >
                    {qTotal}/{targetWeeklyPeriods}
                  </span>
                  {overSubCnt > 0 && (
                    <span
                      title={`${overSubCnt} môn đang xếp vượt Định mức / tuần`}
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        isSelected
                          ? "bg-[#E11D48] text-white"
                          : "bg-rose-100 text-[#E11D48]"
                      }`}
                    >
                      +{overSubCnt} vượt
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {overQuotaSubjectCount > 0 && (
              <button
                type="button"
                onClick={() => setOnlyOverFilter((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                  onlyOverFilter
                    ? "bg-[#E11D48] text-white border-[#E11D48]"
                    : "bg-rose-50 text-[#E11D48] border-rose-200 hover:bg-rose-100"
                }`}
              >
                <span>
                  {onlyOverFilter
                    ? `Đang lọc môn vượt định mức (${overQuotaSubjectCount})`
                    : `Cảnh báo: ${overQuotaSubjectCount} môn vượt Định mức / tuần`}
                </span>
              </button>
            )}
            <span className="text-slate-600">
              Số môn học:{" "}
              <strong className="text-slate-900">{singleReport.subjectRows.length} môn</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">
              Tổng định mức {singleReport.gradeLabel}:{" "}
              <strong
                className={
                  Math.abs(singleReport.quotaDiffFromStandard) < 0.001
                    ? "text-[#059669]"
                    : singleReport.quotaDiffFromStandard > 0
                    ? "text-[#E11D48]"
                    : "text-[#D97706]"
                }
              >
                {singleReport.totalGradeQuota}/{targetWeeklyPeriods} tiết
              </strong>
            </span>
            {renderStandardDiffBadge(singleReport.totalGradeQuota, targetWeeklyPeriods)}
          </div>
        </div>
      )}

      {/* MODE 1: SINGLE GRADE SUBJECT BREAKDOWN TABLE */}
      {mode === "SINGLE_GRADE" ? (
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap w-12 text-center">
                  STT
                </th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap min-w-[200px]">
                  Môn học ({singleReport.gradeLabel})
                </th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap text-right">
                  Định mức / tuần
                </th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap text-right">
                  Chu kỳ ({singleReport.cycleWeeks} tuần)
                </th>
                {singleReport.classes.map((cls) => (
                  <th
                    key={cls.classId}
                    onClick={() => onSelectClass?.(cls.classId)}
                    className={`py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap text-right ${
                      onSelectClass ? "cursor-pointer hover:bg-[#005250]" : ""
                    }`}
                  >
                    <div>Lớp {cls.className}</div>
                    <div className="text-[10px] font-normal text-teal-100">
                      {cls.studyProgram} · Đã xếp {cls.scheduledTotal}/{targetWeeklyPeriods}
                    </div>
                  </th>
                ))}
                <th className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap text-right">
                  Trạng thái khối
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {displayedSingleRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5 + singleReport.classes.length}
                    className="py-8 px-4 text-center text-slate-500"
                  >
                    {onlyOverFilter
                      ? `Không có môn nào vượt Định mức / tuần ở ${singleReport.gradeLabel}.`
                      : `Chưa có định mức hoặc tiết xếp nào cho ${singleReport.gradeLabel}.`}
                  </td>
                </tr>
              ) : (
                displayedSingleRows.map((row, idx) => {
                  const savingThis =
                    savingCellKey ===
                    `${singleReport.grade}_${row.representativeStudyProgram}_${row.subjectId}`
                  const isRowOver = row.rowStatus === "OVER"
                  const maxOverDiff = isRowOver
                    ? Math.max(
                        0,
                        ...row.perClass.map((c) => Math.round(c.diff * 100) / 100)
                      )
                    : 0
                  const maxScheduled = isRowOver
                    ? Math.max(
                        0,
                        ...row.perClass.map((c) => Math.round(c.scheduled * 100) / 100)
                      )
                    : 0
                  const overClassCount = row.perClass.filter((c) => c.diff > 0.001).length

                  return (
                    <tr
                      key={row.subjectId}
                      className={`transition-colors align-middle ${
                        isRowOver
                          ? "bg-rose-50/70 hover:bg-rose-100/60 border-l-4 border-l-[#E11D48]"
                          : "hover:bg-[#F8FAFC]"
                      } ${savingThis ? "opacity-60" : ""}`}
                    >
                      <td
                        className={`py-2.5 px-3 align-middle text-center ${
                          isRowOver ? "font-bold text-[#E11D48]" : "text-slate-500"
                        }`}
                      >
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 align-middle">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={
                              isRowOver
                                ? "font-bold text-[#E11D48]"
                                : "font-semibold text-slate-900"
                            }
                          >
                            {row.subjectName}
                          </span>
                          {row.subjectCode && (
                            <span
                              className={`text-[11px] ${
                                isRowOver ? "text-rose-500 font-medium" : "text-slate-400"
                              }`}
                            >
                              ({row.subjectCode})
                            </span>
                          )}
                          {isRowOver && maxOverDiff > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-100 text-[#E11D48] border border-rose-300 text-[10px] font-bold">
                              Vượt +{maxOverDiff} tiết
                            </span>
                          )}
                          {row.isHalfPeriodSubject && (
                            <span className="px-1.5 py-0.2 rounded bg-teal-50 text-[#00736E] border border-teal-200 text-[10px] font-semibold">
                              Luân phiên
                            </span>
                          )}
                          {row.isDualGvvnGvnn && (
                            <span className="px-1.5 py-0.2 rounded bg-[#F0FDFA] text-[#003B3A] border border-teal-200 text-[10px] font-semibold">
                              GVVN + GVNN
                            </span>
                          )}
                        </div>
                      </td>

                      <td
                        className={`py-2.5 px-3 align-middle text-right ${
                          isRowOver ? "bg-rose-100/50" : ""
                        }`}
                      >
                        <div className="inline-flex flex-col items-end gap-0.5">
                          {onUpdateQuota && !row.hasMixedProgramQuotas ? (
                            <input
                              key={`${singleReport.grade}_${row.representativeStudyProgram}_${row.subjectId}_${row.weeklyQuota}`}
                              type="number"
                              step="0.5"
                              min={0}
                              max={20}
                              defaultValue={row.weeklyQuota}
                              onBlur={(e) =>
                                handleCommitQuota(
                                  row.subjectId,
                                  row.representativeStudyProgram,
                                  singleReport.grade,
                                  row.weeklyQuota,
                                  e.target.value
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  ;(e.currentTarget as HTMLInputElement).blur()
                                }
                              }}
                              title={`Sửa nhanh định mức môn ${row.subjectName} cho ${singleReport.gradeLabel} (${row.representativeStudyProgram})`}
                              className={`w-16 text-right rounded-lg border px-2 py-1 text-xs font-bold focus:outline-none ${
                                isRowOver
                                  ? "border-rose-400 bg-rose-50 text-[#E11D48] ring-2 ring-rose-200 focus:border-[#E11D48]"
                                  : "border-[#E2E8F0] bg-white text-[#003B3A] focus:border-[#00A19A]"
                              }`}
                            />
                          ) : (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-lg font-bold ${
                                isRowOver
                                  ? "bg-rose-100 text-[#E11D48] border border-rose-300"
                                  : "text-[#003B3A]"
                              }`}
                            >
                              {row.weeklyQuota}
                              {row.hasMixedProgramQuotas ? "*" : ""}
                            </span>
                          )}
                          {isRowOver && (
                            <span className="text-[10px] font-semibold text-[#E11D48] whitespace-nowrap">
                              Thực xếp: {maxScheduled} (+{maxOverDiff})
                            </span>
                          )}
                        </div>
                      </td>

                      <td
                        className={`py-2.5 px-3 align-middle text-right ${
                          isRowOver ? "text-[#E11D48] font-semibold" : "text-slate-600"
                        }`}
                      >
                        {row.cycleQuota} tiết
                      </td>

                      {row.perClass.map((cell) => {
                        const isMatch =
                          cell.quota > 0 && Math.abs(cell.diff) < 0.001
                        const isOver = cell.diff > 0.001
                        const isUnder = cell.diff < -0.001

                        return (
                          <td
                            key={cell.classId}
                            className="py-2.5 px-3 align-middle text-right whitespace-nowrap"
                          >
                            {isOver ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-100/90 border border-rose-200 text-[#E11D48] font-bold">
                                {cell.scheduled}/{cell.quota} (+{cell.diff})
                              </span>
                            ) : (
                              <>
                                <span
                                  className={`font-semibold ${
                                    isMatch
                                      ? "text-[#059669]"
                                      : isUnder
                                      ? "text-[#D97706]"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {cell.scheduled}/{cell.quota}
                                </span>
                                {isUnder && (
                                  <span className="ml-1 text-[11px] text-[#D97706]">
                                    ({cell.diff})
                                  </span>
                                )}
                              </>
                            )}
                          </td>
                        )
                      })}

                      <td className="py-2.5 px-3 align-middle text-right whitespace-nowrap">
                        {row.rowStatus === "OK" && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-[#059669] border border-emerald-200 text-[11px] font-semibold">
                            Đủ tiết ({row.completedClassCount}/{row.totalClassCount})
                          </span>
                        )}
                        {row.rowStatus === "UNDER" && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-[#D97706] border border-amber-200 text-[11px] font-semibold">
                            Thiếu tiết ({row.completedClassCount}/{row.totalClassCount})
                          </span>
                        )}
                        {row.rowStatus === "OVER" && (
                          <span className="px-2 py-0.5 rounded-lg bg-[#E11D48] text-white border border-[#E11D48] text-[11px] font-semibold shadow-2xs">
                            Vượt định mức ({overClassCount}/{row.totalClassCount})
                          </span>
                        )}
                        {row.rowStatus === "NO_QUOTA" && (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-semibold">
                            Chưa khai định mức
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>

            {/* ACADEMIC LEDGER FOOTER: 40-PERIOD WEEKLY RECONCILIATION */}
            <tfoot className="sticky bottom-0 z-10 bg-[#F8FAFC] border-t-2 border-[#003B3A] text-xs tabular-nums">
              <tr className="bg-[#F0FDFA]/90">
                <td colSpan={2} className="py-3 px-3 font-bold text-[#003B3A]">
                  Tổng số tiết các môn / Tuần chuẩn {targetWeeklyPeriods} tiết
                </td>
                <td className="py-3 px-3 text-right font-bold text-[#003B3A] whitespace-nowrap">
                  <div>
                    {singleReport.totalGradeQuota} / {targetWeeklyPeriods} tiết
                  </div>
                  <div className="mt-0.5">
                    {renderStandardDiffBadge(
                      singleReport.totalGradeQuota,
                      targetWeeklyPeriods
                    )}
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-semibold text-slate-700 whitespace-nowrap">
                  {Math.round(singleReport.totalGradeQuota * singleReport.cycleWeeks * 100) / 100}{" "}
                  / {targetWeeklyPeriods * singleReport.cycleWeeks} tiết
                </td>
                {singleReport.classes.map((cls) => (
                  <td
                    key={`tot_${cls.classId}`}
                    className="py-3 px-3 text-right whitespace-nowrap"
                  >
                    <div className="font-bold text-slate-900">
                      {cls.scheduledTotal} / {targetWeeklyPeriods} tiết
                    </div>
                    <div className="mt-0.5">
                      {renderStandardDiffBadge(cls.scheduledTotal, targetWeeklyPeriods)}
                    </div>
                  </td>
                ))}
                <td className="py-3 px-3 text-right font-semibold text-slate-700 whitespace-nowrap">
                  TB xếp: {singleReport.averageScheduledPeriods}/{targetWeeklyPeriods} tiết
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        /* MODE 2: MULTI-GRADE OVERVIEW MATRIX (ALL GRADES IN SCOPE vs 40 PERIODS) */
        <div className="overflow-x-auto max-h-[62vh]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#003B3A] border-b border-[#003B3A]">
                <th className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap w-12 text-center">
                  STT
                </th>
                <th className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap min-w-[210px]">
                  Môn học ({matrixReport.selectedProgram})
                </th>
                {matrixReport.gradeColumns.map((gCol) => (
                  <th
                    key={gCol.grade}
                    onClick={() => {
                      setSelectedGrade(gCol.grade)
                      setMode("SINGLE_GRADE")
                    }}
                    title={`Nhấn để xem chi tiết từng lớp của ${gCol.gradeLabel}`}
                    className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap text-right cursor-pointer hover:bg-[#005250]"
                  >
                    <div>{gCol.gradeLabel}</div>
                    <div className="text-[10px] font-normal text-teal-100">
                      {gCol.classCount} lớp · TB {gCol.avgScheduled}/{targetWeeklyPeriods}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {matrixReport.rows.map((row, idx) => {
                const rowHasOver = matrixReport.gradeColumns.some((gCol) => {
                  const c = row.byGrade[gCol.grade]
                  return c ? c.avgScheduled > c.quota + 0.001 : false
                })

                return (
                  <tr
                    key={row.subjectId}
                    className={`transition-colors align-middle ${
                      rowHasOver
                        ? "bg-rose-50/50 hover:bg-rose-100/50 border-l-4 border-l-[#E11D48]"
                        : "hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <td
                      className={`py-2.5 px-3 align-middle text-center ${
                        rowHasOver ? "font-bold text-[#E11D48]" : "text-slate-500"
                      }`}
                    >
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <span
                        className={
                          rowHasOver
                            ? "font-bold text-[#E11D48]"
                            : "font-semibold text-slate-900"
                        }
                      >
                        {row.subjectName}
                      </span>
                      {row.subjectCode && (
                        <span
                          className={`ml-1.5 text-[11px] font-normal ${
                            rowHasOver ? "text-rose-500" : "text-slate-400"
                          }`}
                        >
                          ({row.subjectCode})
                        </span>
                      )}
                      {rowHasOver && (
                        <span className="ml-2 px-1.5 py-0.2 rounded bg-rose-100 text-[#E11D48] border border-rose-300 text-[10px] font-bold">
                          Vượt định mức
                        </span>
                      )}
                    </td>
                    {matrixReport.gradeColumns.map((gCol) => {
                      const cell = row.byGrade[gCol.grade] || {
                        quota: 0,
                        avgScheduled: 0,
                      }
                      const hasQuota = cell.quota > 0
                      const isOver = cell.avgScheduled > cell.quota + 0.001
                      const overDiff =
                        Math.round((cell.avgScheduled - cell.quota) * 100) / 100
                      const isMatched =
                        hasQuota && Math.abs(cell.avgScheduled - cell.quota) < 0.001

                      return (
                        <td
                          key={`${row.subjectId}_${gCol.grade}`}
                          className={`py-2.5 px-3 align-middle text-right whitespace-nowrap ${
                            isOver ? "bg-rose-100/55" : ""
                          }`}
                        >
                          {hasQuota || cell.avgScheduled > 0 ? (
                            isOver ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-100 border border-rose-300 text-[#E11D48] font-bold">
                                {cell.quota} (xếp {cell.avgScheduled} · +{overDiff})
                              </span>
                            ) : (
                              <div>
                                <span className="font-bold text-slate-900">
                                  {cell.quota}
                                </span>
                                <span
                                  className={`ml-1.5 text-[11px] ${
                                    isMatched
                                      ? "text-[#059669]"
                                      : cell.avgScheduled > 0
                                      ? "text-[#D97706]"
                                      : "text-slate-400"
                                  }`}
                                >
                                  (xếp {cell.avgScheduled})
                                </span>
                              </div>
                            )
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>

            <tfoot className="sticky bottom-0 z-10 bg-[#F8FAFC] border-t-2 border-[#003B3A] text-xs tabular-nums">
              <tr className="bg-[#F0FDFA]/90 border-b border-[#E2E8F0]">
                <td colSpan={2} className="py-3 px-3 font-bold text-[#003B3A]">
                  Tổng định mức các môn / Tuần chuẩn {targetWeeklyPeriods} tiết
                </td>
                {matrixReport.gradeColumns.map((gCol) => (
                  <td
                    key={`qtot_${gCol.grade}`}
                    className="py-3 px-3 text-right whitespace-nowrap"
                  >
                    <div className="font-bold text-[#003B3A]">
                      {gCol.totalQuota} / {targetWeeklyPeriods} tiết
                    </div>
                    <div className="mt-0.5">
                      {renderStandardDiffBadge(gCol.totalQuota, targetWeeklyPeriods)}
                    </div>
                  </td>
                ))}
              </tr>
              <tr className="bg-white">
                <td colSpan={2} className="py-2.5 px-3 font-semibold text-slate-700">
                  Trung bình số tiết đã xếp trên TKB / {targetWeeklyPeriods} tiết
                </td>
                {matrixReport.gradeColumns.map((gCol) => (
                  <td
                    key={`stot_${gCol.grade}`}
                    className="py-2.5 px-3 text-right font-semibold text-slate-800 whitespace-nowrap"
                  >
                    {gCol.avgScheduled} / {targetWeeklyPeriods} tiết
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
