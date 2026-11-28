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
import type { SubjectQuotaRow, SubjectRef } from "@/lib/timetable/quotaReconciler"
import type { QuotaReconcileItem, SlotRecord } from "@/lib/timetable/types"

interface GradeWeeklyStatsTableProps {
  classes: ClassForGradeStats[]
  quotaItems: QuotaReconcileItem[]
  slots: SlotRecord[]
  subjects: SubjectRef[]
  subjectQuotas?: SubjectQuotaRow[]
  defaultGrade?: string // e.g. "6" or "ALL"
  selectedStudyProgram?: "ALL" | "Hệ S" | "Hệ I"
  cycleWeeks?: number
  targetWeeklyPeriods?: number
  onClose?: () => void
  onSelectClass?: (classId: string) => void
  onSelectStudyProgram?: (program: "ALL" | "Hệ S" | "Hệ I") => void
  onUpdateQuota?: (params: {
    subjectId: string
    studyProgram: string
    grade: string
    weeklyQuota: number
  }) => Promise<void> | void
  onApplyQd82Standard?: () => Promise<void> | void
}

export function GradeWeeklyStatsTable({
  classes,
  quotaItems,
  slots,
  subjects,
  subjectQuotas,
  defaultGrade = "ALL",
  selectedStudyProgram,
  cycleWeeks = 2,
  targetWeeklyPeriods = WEEKLY_STANDARD_PERIODS,
  onClose,
  onSelectClass,
  onSelectStudyProgram,
  onUpdateQuota,
  onApplyQd82Standard,
}: GradeWeeklyStatsTableProps) {
  const availableGrades = useMemo(
    () =>
      sortGradeStrings(
        Array.from(new Set(classes.map((c) => String(c.grade).trim()).filter(Boolean)))
      ),
    [classes]
  )

  const [mode, setMode] = useState<"SINGLE_GRADE" | "ALL_GRADES">("SINGLE_GRADE")
  const [selectedGrade, setSelectedGrade] = useState<string>(() => {
    if (defaultGrade && defaultGrade !== "ALL" && availableGrades.includes(defaultGrade)) {
      return defaultGrade
    }
    return availableGrades[0] || ""
  })
  const [selectedProgram, setSelectedProgram] = useState<string>(
    selectedStudyProgram || "ALL"
  )
  const [onlyOverFilter, setOnlyOverFilter] = useState<boolean>(false)
  const [savingCellKey, setSavingCellKey] = useState<string | null>(null)
  const [applyingStandard, setApplyingStandard] = useState<boolean>(false)

  useEffect(() => {
    if (selectedStudyProgram) {
      setSelectedProgram(selectedStudyProgram)
    }
  }, [selectedStudyProgram])

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
      subjectQuotas,
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
    subjectQuotas,
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
      subjectQuotas,
      studyProgramFilter: selectedProgram,
      targetWeeklyPeriods,
    })
  }, [
    classes,
    quotaItems,
    slots,
    subjects,
    subjectQuotas,
    selectedProgram,
    targetWeeklyPeriods,
  ])

  // Quick badge summary per grade pill (both Hệ S & Hệ I)
  const gradeQuickTotals = useMemo(() => {
    const map = new Map<
      string,
      {
        quotaHeS: number
        quotaHeI: number
        avgSched: number
        overSubjectCount: number
      }
    >()
    for (const g of availableGrades) {
      const rep = buildSingleGradeStats({
        grade: g,
        classes,
        quotaItems,
        slots,
        subjects,
        subjectQuotas,
        studyProgramFilter: "ALL",
        cycleWeeks,
        targetWeeklyPeriods,
      })
      map.set(g, {
        quotaHeS: rep.totalQuotaHeS,
        quotaHeI: rep.totalQuotaHeI,
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
    subjectQuotas,
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
    studyProgram: "Hệ S" | "Hệ I",
    grade: string,
    currentQuota: number,
    rawNext: string
  ) => {
    if (!onUpdateQuota) return
    const cleanNext = String(rawNext || "").trim().replace(/,/g, ".")
    if (!cleanNext) return
    const parsed = Number(cleanNext)
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

  const getMiniPillColor = (val: number, isSelected: boolean) => {
    const exact = Math.abs(val - targetWeeklyPeriods) < 0.001
    const over = val > targetWeeklyPeriods + 0.001
    if (isSelected) {
      if (exact) return "bg-[#5EEAD4]/20 text-[#5EEAD4]"
      if (over) return "bg-rose-500/25 text-rose-200"
      return "bg-amber-400/25 text-amber-200"
    }
    if (exact) return "bg-emerald-50 text-[#059669]"
    if (over) return "bg-rose-50 text-[#E11D48]"
    return "bg-amber-50 text-[#D97706]"
  }

  if (availableGrades.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden tabular-nums">
      {/* Header & Controls Strip */}
      <div className="px-4 py-3.5 border-b border-[#E2E8F0] border-l-4 border-l-[#003B3A] bg-white flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-[#003B3A]">
              Bảng thống kê các môn theo khối (Hệ S & Hệ I) — Chuẩn tuần {targetWeeklyPeriods} tiết
            </h3>
            <span className="px-2 py-0.5 rounded-lg bg-[#F0FDFA] text-[#00736E] border border-teal-200 text-[11px] font-semibold">
              5 ngày × 8 tiết = {targetWeeklyPeriods} tiết/tuần
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Đối chiếu song song định mức tuần của <strong>Hệ S</strong> và <strong>Hệ I</strong> với số tiết thực xếp trên từng lớp (tính đủ 0.5 tiết cho mỗi môn luân phiên Chẵn/Lẻ)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onApplyQd82Standard && (
            <button
              type="button"
              disabled={applyingStandard}
              onClick={async () => {
                setApplyingStandard(true)
                try {
                  await onApplyQd82Standard()
                } finally {
                  setApplyingStandard(false)
                }
              }}
              title="Đồng bộ toàn bộ định mức Hệ S & Hệ I (K1–K12) chuẩn 40 tiết/tuần theo Quyết định số 82/2026/QĐ-SKL ngày 12/06/2026"
              className="px-3 py-1.5 rounded-xl bg-[#F0FDFA] hover:bg-teal-100/80 text-[#003B3A] border border-[#00A19A]/40 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
            >
              {applyingStandard ? "Đang áp chuẩn QĐ 82..." : "Áp chuẩn QĐ 82/2026 (40 tiết)"}
            </button>
          )}

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

          {/* Filter Classes by Program */}
          <div className="inline-flex items-center rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-0.5">
            {(
              [
                { code: "ALL", label: "Cả Hệ S & Hệ I" },
                { code: "Hệ S", label: "Lớp Hệ S" },
                { code: "Hệ I", label: "Lớp Hệ I" },
              ] as const
            ).map((p) => {
              const isSelected = selectedProgram === p.code
              return (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => {
                    setSelectedProgram(p.code)
                    onSelectStudyProgram?.(p.code)
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#00736E] text-white"
                      : "text-slate-600 hover:text-[#003B3A]"
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

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
              const qS = qt?.quotaHeS ?? 0
              const qI = qt?.quotaHeI ?? 0
              const overSubCnt = qt?.overSubjectCount ?? 0

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
                    title={`Tổng định mức Hệ S Khối ${g}: ${qS}/${targetWeeklyPeriods} tiết`}
                    className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${getMiniPillColor(
                      qS,
                      isSelected
                    )}`}
                  >
                    S:{qS}/{targetWeeklyPeriods}
                  </span>
                  {qI > 0 && (
                    <span
                      title={`Tổng định mức Hệ I Khối ${g}: ${qI}/${targetWeeklyPeriods} tiết`}
                      className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${getMiniPillColor(
                        qI,
                        isSelected
                      )}`}
                    >
                      I:{qI}/{targetWeeklyPeriods}
                    </span>
                  )}
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
              Số môn:{" "}
              <strong className="text-slate-900">{singleReport.subjectRows.length}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">
              Hệ S:{" "}
              <strong
                className={
                  Math.abs(singleReport.diffHeSFromStandard) < 0.001
                    ? "text-[#059669]"
                    : singleReport.diffHeSFromStandard > 0
                    ? "text-[#E11D48]"
                    : "text-[#D97706]"
                }
              >
                {singleReport.totalQuotaHeS}/{targetWeeklyPeriods} tiết
              </strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">
              Hệ I:{" "}
              <strong
                className={
                  Math.abs(singleReport.diffHeIFromStandard) < 0.001
                    ? "text-[#059669]"
                    : singleReport.diffHeIFromStandard > 0
                    ? "text-[#E11D48]"
                    : "text-[#D97706]"
                }
              >
                {singleReport.totalQuotaHeI}/{targetWeeklyPeriods} tiết
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* MODE 1: SINGLE GRADE SUBJECT BREAKDOWN TABLE WITH EXPLICIT HỆ S & HỆ I COLUMNS AND GROUPED CLASS HEADERS */}
      {mode === "SINGLE_GRADE" ? (
        <div className="overflow-x-auto max-h-[60vh]">
          {(() => {
            const heSCols = singleReport.classes.filter((c) => c.studyProgram === "Hệ S")
            const heICols = singleReport.classes.filter((c) => c.studyProgram === "Hệ I")
            const firstHeIClassId = heICols[0]?.classId

            return (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#003B3A] border-b border-white/15">
                    <th
                      rowSpan={2}
                      className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap w-12 text-center border-r border-white/10"
                    >
                      STT
                    </th>
                    <th
                      rowSpan={2}
                      className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap min-w-[200px]"
                    >
                      Môn học ({singleReport.gradeLabel})
                    </th>
                    <th
                      colSpan={2}
                      className="py-1.5 px-3 text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap text-center border-l border-r border-white/15"
                    >
                      Định mức / tuần
                    </th>
                    <th
                      rowSpan={2}
                      className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap text-right border-r border-white/15"
                    >
                      Chu kỳ ({singleReport.cycleWeeks} tuần)
                    </th>
                    {heSCols.length > 0 && (
                      <th
                        colSpan={heSCols.length}
                        className="py-1.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap text-center border-r border-white/20 bg-[#003B3A]"
                      >
                        Các lớp Hệ S ({heSCols.length} lớp)
                      </th>
                    )}
                    {heICols.length > 0 && (
                      <th
                        colSpan={heICols.length}
                        className="py-1.5 px-3 text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap text-center border-r border-white/20 bg-[#004A48]"
                      >
                        Các lớp Hệ I ({heICols.length} lớp)
                      </th>
                    )}
                    <th
                      rowSpan={2}
                      className="py-2.5 px-3 text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap text-right"
                    >
                      Trạng thái khối
                    </th>
                  </tr>

                  <tr className="bg-[#004543] border-b border-[#003B3A]">
                    <th className="py-2 px-3 text-[11px] font-semibold text-[#5EEAD4] whitespace-nowrap text-right border-l border-white/15">
                      Hệ S
                    </th>
                    <th className="py-2 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap text-right border-r border-white/15">
                      Hệ I
                    </th>
                    {singleReport.classes.map((cls) => {
                      const isHeI = cls.studyProgram === "Hệ I"
                      const isGroupBoundary =
                        heSCols.length > 0 && cls.classId === firstHeIClassId
                      return (
                        <th
                          key={cls.classId}
                          onClick={() => onSelectClass?.(cls.classId)}
                          className={`py-2 px-3 text-[11px] font-semibold text-white whitespace-nowrap text-right border-r border-white/10 ${
                            isHeI ? "bg-[#005250]" : "bg-[#003B3A]"
                          } ${isGroupBoundary ? "border-l-2 border-l-[#5EEAD4]/50" : ""} ${
                            onSelectClass ? "cursor-pointer hover:bg-[#006360]" : ""
                          }`}
                        >
                          <div>Lớp {cls.className}</div>
                          <div
                            className={`text-[10px] font-normal ${
                              isHeI ? "text-[#5EEAD4]" : "text-teal-100"
                            }`}
                          >
                            {cls.studyProgram} · {cls.scheduledTotal}/{targetWeeklyPeriods} tiết
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>

            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {displayedSingleRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6 + singleReport.classes.length}
                    className="py-8 px-4 text-center text-slate-500"
                  >
                    {onlyOverFilter
                      ? `Không có môn nào vượt Định mức / tuần ở ${singleReport.gradeLabel}.`
                      : `Chưa có định mức hoặc tiết xếp nào cho ${singleReport.gradeLabel}.`}
                  </td>
                </tr>
              ) : (
                displayedSingleRows.map((row, idx) => {
                  const savingHeS =
                    savingCellKey === `${singleReport.grade}_Hệ S_${row.subjectId}`
                  const savingHeI =
                    savingCellKey === `${singleReport.grade}_Hệ I_${row.subjectId}`
                  const savingThis = savingHeS || savingHeI
                  const isRowOver = row.rowStatus === "OVER"
                  const maxOverDiff = isRowOver
                    ? Math.max(
                        0,
                        ...row.perClass.map((c) => Math.round(c.diff * 100) / 100)
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
                          {row.isElectiveSubject && (
                            <span
                              title="Môn học lựa chọn cấp THPT (3 môn × 2 tiết = 6 tiết/tuần theo QĐ 82/2026)"
                              className="px-1.5 py-0.2 rounded bg-amber-50 text-[#D97706] border border-amber-200 text-[10px] font-semibold"
                            >
                              Môn lựa chọn (*)
                            </span>
                          )}
                          {row.isDualGvvnGvnn && (
                            <span className="px-1.5 py-0.2 rounded bg-[#F0FDFA] text-[#003B3A] border border-teal-200 text-[10px] font-semibold">
                              GVVN + GVNN
                            </span>
                          )}
                        </div>
                      </td>

                      {/* CỘT HỆ S */}
                      <td
                        className={`py-2.5 px-3 align-middle text-right border-l border-[#F1F5F9] ${
                          row.isOverHeS ? "bg-rose-100/55" : "bg-[#F8FAFC]/40"
                        }`}
                      >
                        <div className="inline-flex flex-col items-end gap-0.5">
                          {onUpdateQuota ? (
                            <input
                              key={`${singleReport.grade}_Hệ S_${row.subjectId}_${row.quotaHeS}`}
                              type="text"
                              inputMode="decimal"
                              defaultValue={row.quotaHeS}
                              onBlur={(e) =>
                                handleCommitQuota(
                                  row.subjectId,
                                  "Hệ S",
                                  singleReport.grade,
                                  row.quotaHeS,
                                  e.target.value
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  ;(e.currentTarget as HTMLInputElement).blur()
                                }
                              }}
                              title={`Sửa định mức Hệ S môn ${row.subjectName} cho ${singleReport.gradeLabel}`}
                              className={`w-16 text-right rounded-lg border px-2 py-1 text-xs font-bold focus:outline-none ${
                                row.isOverHeS
                                  ? "border-rose-400 bg-rose-50 text-[#E11D48] ring-2 ring-rose-200 focus:border-[#E11D48]"
                                  : row.quotaHeS > 0
                                  ? "border-[#E2E8F0] bg-white text-[#003B3A] focus:border-[#00A19A]"
                                  : "border-[#E2E8F0] bg-slate-50 text-slate-400 focus:border-[#00A19A]"
                              }`}
                            />
                          ) : (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-lg font-bold ${
                                row.isOverHeS
                                  ? "bg-rose-100 text-[#E11D48] border border-rose-300"
                                  : row.quotaHeS > 0
                                  ? "text-[#003B3A]"
                                  : "text-slate-300"
                              }`}
                            >
                              {row.quotaHeS > 0 || row.isOverHeS ? row.quotaHeS : "—"}
                            </span>
                          )}
                          {row.isOverHeS && (
                            <span className="text-[10px] font-semibold text-[#E11D48] whitespace-nowrap">
                              Thực xếp: {row.maxScheduledHeS} (+{row.maxOverDiffHeS})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* CỘT HỆ I */}
                      <td
                        className={`py-2.5 px-3 align-middle text-right border-r border-[#F1F5F9] ${
                          row.isOverHeI ? "bg-rose-100/55" : "bg-emerald-50/20"
                        }`}
                      >
                        <div className="inline-flex flex-col items-end gap-0.5">
                          {onUpdateQuota ? (
                            <input
                              key={`${singleReport.grade}_Hệ I_${row.subjectId}_${row.quotaHeI}`}
                              type="text"
                              inputMode="decimal"
                              defaultValue={row.quotaHeI}
                              onBlur={(e) =>
                                handleCommitQuota(
                                  row.subjectId,
                                  "Hệ I",
                                  singleReport.grade,
                                  row.quotaHeI,
                                  e.target.value
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  ;(e.currentTarget as HTMLInputElement).blur()
                                }
                              }}
                              title={`Sửa định mức Hệ I môn ${row.subjectName} cho ${singleReport.gradeLabel}`}
                              className={`w-16 text-right rounded-lg border px-2 py-1 text-xs font-bold focus:outline-none ${
                                row.isOverHeI
                                  ? "border-rose-400 bg-rose-50 text-[#E11D48] ring-2 ring-rose-200 focus:border-[#E11D48]"
                                  : row.quotaHeI > 0
                                  ? "border-emerald-200 bg-white text-[#059669] focus:border-[#00A19A]"
                                  : "border-[#E2E8F0] bg-slate-50 text-slate-400 focus:border-[#00A19A]"
                              }`}
                            />
                          ) : (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-lg font-bold ${
                                row.isOverHeI
                                  ? "bg-rose-100 text-[#E11D48] border border-rose-300"
                                  : row.quotaHeI > 0
                                  ? "text-[#059669]"
                                  : "text-slate-300"
                              }`}
                            >
                              {row.quotaHeI > 0 || row.isOverHeI ? row.quotaHeI : "—"}
                            </span>
                          )}
                          {row.isOverHeI && (
                            <span className="text-[10px] font-semibold text-[#E11D48] whitespace-nowrap">
                              Thực xếp: {row.maxScheduledHeI} (+{row.maxOverDiffHeI})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* CHU KỲ 2 TUẦN */}
                      <td
                        className={`py-2.5 px-3 align-middle text-right whitespace-nowrap ${
                          isRowOver ? "text-[#E11D48] font-semibold" : "text-slate-600"
                        }`}
                      >
                        {Math.abs(row.cycleQuotaHeS - row.cycleQuotaHeI) < 0.001 ? (
                          <span>{row.cycleQuotaHeS} tiết</span>
                        ) : (
                          <span className="text-[11px]">
                            <span className="font-semibold text-[#003B3A]">
                              S: {row.cycleQuotaHeS}
                            </span>
                            {" · "}
                            <span className="font-semibold text-[#059669]">
                              I: {row.cycleQuotaHeI}
                            </span>
                          </span>
                        )}
                      </td>

                      {row.perClass.map((cell) => {
                        const isMatch =
                          cell.quota > 0 && Math.abs(cell.diff) < 0.001
                        const isOver = cell.diff > 0.001
                        const isUnder = cell.diff < -0.001
                        const isHeI = cell.studyProgram === "Hệ I"
                        const isGroupBoundary =
                          heSCols.length > 0 && cell.classId === firstHeIClassId

                        return (
                          <td
                            key={cell.classId}
                            className={`py-2.5 px-3 align-middle text-right whitespace-nowrap ${
                              isHeI ? "bg-emerald-50/15" : ""
                            } ${
                              isGroupBoundary ? "border-l-2 border-l-teal-200" : ""
                            }`}
                          >
                            {cell.notApplicable ? (
                              <span
                                title={`Môn này không có định mức ở ${cell.studyProgram}`}
                                className="text-slate-300"
                              >
                                —
                              </span>
                            ) : isOver ? (
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

            {/* ACADEMIC LEDGER FOOTER: 40-PERIOD WEEKLY RECONCILIATION FOR BOTH HỆ S & HỆ I */}
            <tfoot className="sticky bottom-0 z-10 bg-[#F8FAFC] border-t-2 border-[#003B3A] text-xs tabular-nums">
              <tr className="bg-[#F0FDFA]/90">
                <td colSpan={2} className="py-3 px-3 font-bold text-[#003B3A]">
                  Tổng số tiết các môn / Tuần chuẩn {targetWeeklyPeriods} tiết
                </td>
                <td className="py-3 px-3 text-right font-bold text-[#003B3A] whitespace-nowrap border-l border-[#E2E8F0]">
                  <div>
                    Hệ S: {singleReport.totalQuotaHeS} / {targetWeeklyPeriods} tiết
                  </div>
                  <div className="mt-0.5">
                    {renderStandardDiffBadge(
                      singleReport.totalQuotaHeS,
                      targetWeeklyPeriods
                    )}
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-bold text-[#059669] whitespace-nowrap border-r border-[#E2E8F0]">
                  <div>
                    Hệ I: {singleReport.totalQuotaHeI} / {targetWeeklyPeriods} tiết
                  </div>
                  <div className="mt-0.5">
                    {renderStandardDiffBadge(
                      singleReport.totalQuotaHeI,
                      targetWeeklyPeriods
                    )}
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-semibold text-slate-700 whitespace-nowrap text-[11px]">
                  <div>
                    S:{" "}
                    {Math.round(singleReport.totalQuotaHeS * singleReport.cycleWeeks * 100) /
                      100}
                    /{targetWeeklyPeriods * singleReport.cycleWeeks}
                  </div>
                  <div className="text-[#059669]">
                    I:{" "}
                    {Math.round(singleReport.totalQuotaHeI * singleReport.cycleWeeks * 100) /
                      100}
                    /{targetWeeklyPeriods * singleReport.cycleWeeks}
                  </div>
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
            )
          })()}
        </div>
      ) : (
        /* MODE 2: MULTI-GRADE OVERVIEW MATRIX WITH SIDE-BY-SIDE HỆ S & HỆ I SUB-COLUMNS */
        <div className="overflow-x-auto max-h-[62vh]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#003B3A] border-b border-white/15">
                <th
                  rowSpan={2}
                  className="py-2.5 px-3 text-[11px] font-semibold text-teal-100 whitespace-nowrap w-12 text-center border-r border-white/10"
                >
                  STT
                </th>
                <th
                  rowSpan={2}
                  className="py-2.5 px-3 text-[11px] font-semibold text-white whitespace-nowrap min-w-[200px] border-r border-white/15"
                >
                  Môn học
                </th>
                {matrixReport.gradeColumns.map((gCol) => (
                  <th
                    key={gCol.grade}
                    colSpan={2}
                    onClick={() => {
                      setSelectedGrade(gCol.grade)
                      setMode("SINGLE_GRADE")
                    }}
                    title={`Nhấn để xem chi tiết từng lớp của ${gCol.gradeLabel}`}
                    className="py-2 px-3 text-[11px] font-semibold text-white whitespace-nowrap text-center border-r border-white/15 cursor-pointer hover:bg-[#005250]"
                  >
                    <div>{gCol.gradeLabel}</div>
                    <div className="text-[10px] font-normal text-teal-100">
                      {gCol.classCount} lớp · TB {gCol.avgScheduled}/{targetWeeklyPeriods}
                    </div>
                  </th>
                ))}
              </tr>
              <tr className="bg-[#004A48] border-b border-[#003B3A]">
                {matrixReport.gradeColumns.map((gCol) => (
                  <React.Fragment key={`sub_${gCol.grade}`}>
                    <th className="py-1.5 px-2.5 text-[10.5px] font-semibold text-[#5EEAD4] text-right whitespace-nowrap border-r border-white/10">
                      Hệ S
                    </th>
                    <th className="py-1.5 px-2.5 text-[10.5px] font-semibold text-teal-100 text-right whitespace-nowrap border-r border-white/15">
                      Hệ I
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E2E8F0] text-xs bg-white tabular-nums">
              {matrixReport.rows.map((row, idx) => {
                const rowHasOver = matrixReport.gradeColumns.some((gCol) => {
                  const c = row.byGrade[gCol.grade]
                  return c ? c.isOverHeS || c.isOverHeI : false
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
                      className={`py-2.5 px-3 align-middle text-center border-r border-[#F1F5F9] ${
                        rowHasOver ? "font-bold text-[#E11D48]" : "text-slate-500"
                      }`}
                    >
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 align-middle border-r border-[#E2E8F0]">
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
                        quotaHeS: 0,
                        quotaHeI: 0,
                        avgScheduled: 0,
                        avgScheduledHeS: 0,
                        avgScheduledHeI: 0,
                        isOverHeS: false,
                        isOverHeI: false,
                      }

                      return (
                        <React.Fragment key={`${row.subjectId}_${gCol.grade}`}>
                          <td
                            className={`py-2 px-2.5 align-middle text-right whitespace-nowrap border-r border-[#F1F5F9] ${
                              cell.isOverHeS ? "bg-rose-100/60" : ""
                            }`}
                          >
                            {cell.quotaHeS > 0 || cell.avgScheduledHeS > 0 ? (
                              <span
                                className={
                                  cell.isOverHeS
                                    ? "font-bold text-[#E11D48]"
                                    : "font-bold text-[#003B3A]"
                                }
                              >
                                {cell.quotaHeS}
                                {gCol.classCountHeS > 0 && (
                                  <span
                                    className={`ml-1 text-[10.5px] font-normal ${
                                      cell.isOverHeS
                                        ? "text-[#E11D48] font-semibold"
                                        : Math.abs(cell.avgScheduledHeS - cell.quotaHeS) <
                                          0.001
                                        ? "text-[#059669]"
                                        : "text-slate-400"
                                    }`}
                                  >
                                    ({cell.avgScheduledHeS})
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          <td
                            className={`py-2 px-2.5 align-middle text-right whitespace-nowrap border-r border-[#E2E8F0] ${
                              cell.isOverHeI ? "bg-rose-100/60" : "bg-emerald-50/15"
                            }`}
                          >
                            {cell.quotaHeI > 0 || cell.avgScheduledHeI > 0 ? (
                              <span
                                className={
                                  cell.isOverHeI
                                    ? "font-bold text-[#E11D48]"
                                    : "font-bold text-[#059669]"
                                }
                              >
                                {cell.quotaHeI}
                                {gCol.classCountHeI > 0 && (
                                  <span
                                    className={`ml-1 text-[10.5px] font-normal ${
                                      cell.isOverHeI
                                        ? "text-[#E11D48] font-semibold"
                                        : Math.abs(cell.avgScheduledHeI - cell.quotaHeI) <
                                          0.001
                                        ? "text-[#059669]"
                                        : "text-slate-400"
                                    }`}
                                  >
                                    ({cell.avgScheduledHeI})
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </React.Fragment>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>

            <tfoot className="sticky bottom-0 z-10 bg-[#F8FAFC] border-t-2 border-[#003B3A] text-xs tabular-nums">
              <tr className="bg-[#F0FDFA]/90">
                <td
                  colSpan={2}
                  className="py-3 px-3 font-bold text-[#003B3A] border-r border-[#E2E8F0]"
                >
                  Tổng định mức (Hệ S | Hệ I) / Tuần chuẩn {targetWeeklyPeriods} tiết
                </td>
                {matrixReport.gradeColumns.map((gCol) => (
                  <React.Fragment key={`qtot_${gCol.grade}`}>
                    <td className="py-2.5 px-2.5 text-right whitespace-nowrap border-r border-[#E2E8F0]">
                      <div className="font-bold text-[#003B3A]">
                        {gCol.totalQuotaHeS}/{targetWeeklyPeriods}
                      </div>
                      <div className="mt-0.5">
                        {renderStandardDiffBadge(gCol.totalQuotaHeS, targetWeeklyPeriods)}
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 text-right whitespace-nowrap border-r border-[#E2E8F0] bg-emerald-50/30">
                      <div className="font-bold text-[#059669]">
                        {gCol.totalQuotaHeI}/{targetWeeklyPeriods}
                      </div>
                      <div className="mt-0.5">
                        {renderStandardDiffBadge(gCol.totalQuotaHeI, targetWeeklyPeriods)}
                      </div>
                    </td>
                  </React.Fragment>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
