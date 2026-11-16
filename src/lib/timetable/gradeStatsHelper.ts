import { buildSubjectLookupMaps, type SubjectRef } from "./quotaReconciler"
import { extractGradeNumber, mapEducationSystemToStudyProgram } from "./scopeResolver"
import type { QuotaReconcileItem, SlotRecord } from "./types"

export const WEEKLY_STANDARD_PERIODS = 40

export interface ClassForGradeStats {
  id: string
  className: string
  grade: string
  level: string
  educationSystem?: string | null
}

export interface ClassSlotSummary {
  scheduledByClass: Map<string, number>
  scheduledByClassSubject: Map<string, number>
  unpairedHalfCellsByClass: Map<string, number>
}

function round2(val: number): number {
  return Math.round(val * 100) / 100
}

/**
 * Counts weekly equivalent periods per class and per `(classId, subjectId)`.
 * Correctly accounts for:
 * - Full-week slots (`ALL`) = 1.0 period/week
 * - Half-week slots (`ODD` / `EVEN`) primary subject = 0.5 period/week
 * - Paired alternating (`Luân phiên`) subject on `ODD` / `EVEN` = +0.5 period/week
 *   (so a paired cell contributes 0.5 + 0.5 = 1.0 period/week toward the 40-period week!)
 */
export function computeClassSlotSummary(
  slots: SlotRecord[],
  subjects: SubjectRef[]
): ClassSlotSummary {
  const { subjectById, subjectByCodeOrName } = buildSubjectLookupMaps(subjects)
  const scheduledByClass = new Map<string, number>()
  const scheduledByClassSubject = new Map<string, number>()
  const unpairedHalfCellsByClass = new Map<string, number>()

  for (const s of slots) {
    if (!s.classId) continue
    const hasMain = Boolean(s.subjectId || (s.subjectName && s.subjectName.trim()))
    if (!hasMain) continue

    const wt = String(s.weekType || "ALL").toUpperCase()
    const isHalf = wt === "EVEN" || wt === "ODD"
    const mainWeight = isHalf ? 0.5 : 1.0

    const mainSub =
      (s.subjectId ? subjectById.get(s.subjectId) : undefined) ||
      (s.subjectCode ? subjectByCodeOrName.get(s.subjectCode.trim().toUpperCase()) : undefined) ||
      (s.subjectName ? subjectByCodeOrName.get(s.subjectName.trim().toUpperCase()) : undefined)

    const mainKeyId = mainSub?.id || s.subjectId || `RAW:${String(s.subjectName || "").trim()}`
    const csKey = `${s.classId}::${mainKeyId}`
    scheduledByClassSubject.set(csKey, round2((scheduledByClassSubject.get(csKey) || 0) + mainWeight))
    scheduledByClass.set(s.classId, round2((scheduledByClass.get(s.classId) || 0) + mainWeight))

    if (isHalf) {
      const hasAlt = Boolean(s.altSubjectId || (s.altSubjectName && s.altSubjectName.trim()))
      if (hasAlt) {
        const altSub =
          (s.altSubjectId ? subjectById.get(s.altSubjectId) : undefined) ||
          (s.altSubjectName
            ? subjectByCodeOrName.get(s.altSubjectName.trim().toUpperCase())
            : undefined)
        const altKeyId =
          altSub?.id || s.altSubjectId || `RAW:${String(s.altSubjectName || "").trim()}`
        const altCsKey = `${s.classId}::${altKeyId}`
        scheduledByClassSubject.set(
          altCsKey,
          round2((scheduledByClassSubject.get(altCsKey) || 0) + 0.5)
        )
        scheduledByClass.set(s.classId, round2((scheduledByClass.get(s.classId) || 0) + 0.5))
      } else {
        unpairedHalfCellsByClass.set(
          s.classId,
          (unpairedHalfCellsByClass.get(s.classId) || 0) + 1
        )
      }
    }
  }

  return {
    scheduledByClass,
    scheduledByClassSubject,
    unpairedHalfCellsByClass,
  }
}

export interface GradeSubjectClassCell {
  classId: string
  className: string
  studyProgram: string
  quota: number
  scheduled: number
  diff: number // scheduled - quota
}

export interface GradeSubjectStatRow {
  subjectId: string
  subjectCode: string
  subjectName: string
  representativeStudyProgram: string
  weeklyQuota: number
  hasMixedProgramQuotas: boolean
  cycleQuota: number
  isHalfPeriodSubject: boolean
  isDualGvvnGvnn: boolean
  perClass: GradeSubjectClassCell[]
  completedClassCount: number
  totalClassCount: number
  rowStatus: "OK" | "UNDER" | "OVER" | "NO_QUOTA"
}

export interface GradeClassColumnSummary {
  classId: string
  className: string
  studyProgram: string
  quotaTotal: number
  scheduledTotal: number
  diffFromStandard: number // scheduledTotal - targetWeeklyPeriods (e.g. 40)
  unpairedHalfCells: number
}

export interface SingleGradeStatsReport {
  grade: string
  gradeLabel: string
  targetWeeklyPeriods: number
  cycleWeeks: number
  availablePrograms: string[]
  selectedProgram: string
  classes: GradeClassColumnSummary[]
  subjectRows: GradeSubjectStatRow[]
  totalGradeQuota: number
  quotaDiffFromStandard: number // totalGradeQuota - 40
  averageScheduledPeriods: number
}

export function sortGradeStrings(grades: string[]): string[] {
  return [...grades].sort((a, b) => {
    const na = extractGradeNumber(a) ?? 999
    const nb = extractGradeNumber(b) ?? 999
    if (na !== nb) return na - nb
    return a.localeCompare(b, "vi")
  })
}

export function buildSingleGradeStats(params: {
  grade: string
  classes: ClassForGradeStats[]
  quotaItems: QuotaReconcileItem[]
  slots: SlotRecord[]
  subjects: SubjectRef[]
  studyProgramFilter?: string // "ALL" | "Hệ S" | "Hệ I"
  cycleWeeks?: number
  targetWeeklyPeriods?: number
}): SingleGradeStatsReport {
  const targetWeeklyPeriods = params.targetWeeklyPeriods ?? WEEKLY_STANDARD_PERIODS
  const cycleWeeks = params.cycleWeeks ?? 2

  const allGradeClasses = params.classes.filter(
    (c) => String(c.grade).trim() === String(params.grade).trim()
  )

  const programSet = new Set<string>()
  for (const c of allGradeClasses) {
    programSet.add(mapEducationSystemToStudyProgram(c.educationSystem))
  }
  const availablePrograms = Array.from(programSet).sort((a, b) => a.localeCompare(b, "vi"))

  const requestedProgram = params.studyProgramFilter || "ALL"
  const effectiveProgram =
    requestedProgram !== "ALL" && availablePrograms.includes(requestedProgram)
      ? requestedProgram
      : availablePrograms.length === 1
      ? availablePrograms[0]
      : "ALL"

  const filteredClasses =
    effectiveProgram === "ALL"
      ? allGradeClasses
      : allGradeClasses.filter(
          (c) => mapEducationSystemToStudyProgram(c.educationSystem) === effectiveProgram
        )

  const slotSummary = computeClassSlotSummary(params.slots, params.subjects)
  const subjectById = new Map(params.subjects.map((s) => [s.id, s]))

  // Index quotaItems by `${classId}::${subjectId}`
  const quotaByClassSub = new Map<string, QuotaReconcileItem>()
  const relevantSubjectIds = new Set<string>()

  const filteredClassIds = new Set(filteredClasses.map((c) => c.id))
  for (const q of params.quotaItems) {
    if (!filteredClassIds.has(q.classId)) continue
    quotaByClassSub.set(`${q.classId}::${q.subjectId}`, q)
    if (q.weeklyQuota > 0 || q.scheduledWeeklyEquivalent > 0) {
      relevantSubjectIds.add(q.subjectId)
    }
  }

  // Also capture subjects scheduled directly in slots even if quota is 0
  for (const cls of filteredClasses) {
    for (const sub of params.subjects) {
      const sch = slotSummary.scheduledByClassSubject.get(`${cls.id}::${sub.id}`) || 0
      if (sch > 0) {
        relevantSubjectIds.add(sub.id)
      }
    }
  }

  const subjectRows: GradeSubjectStatRow[] = []

  for (const subId of relevantSubjectIds) {
    const subRef = subjectById.get(subId)
    const sampleQuota = filteredClasses
      .map((c) => quotaByClassSub.get(`${c.id}::${subId}`))
      .find(Boolean)

    const subjectName = subRef?.subjectName || sampleQuota?.subjectName || subId
    const subjectCode = subRef?.subjectCode || sampleQuota?.subjectCode || ""

    const perClass: GradeSubjectClassCell[] = filteredClasses.map((cls) => {
      const qItem = quotaByClassSub.get(`${cls.id}::${subId}`)
      const studyProgram =
        qItem?.studyProgram || mapEducationSystemToStudyProgram(cls.educationSystem)
      const quota = qItem?.weeklyQuota ?? 0
      const scheduled = slotSummary.scheduledByClassSubject.get(`${cls.id}::${subId}`) || 0
      return {
        classId: cls.id,
        className: cls.className,
        studyProgram,
        quota,
        scheduled,
        diff: round2(scheduled - quota),
      }
    })

    const distinctQuotas = new Set(perClass.map((p) => p.quota))
    const representativeCell = perClass[0]
    const weeklyQuota = representativeCell ? representativeCell.quota : 0
    const representativeStudyProgram =
      effectiveProgram !== "ALL"
        ? effectiveProgram
        : representativeCell?.studyProgram || "Hệ S"

    let completedClassCount = 0
    let hasOver = false
    let hasUnder = false

    for (const cell of perClass) {
      if (cell.quota > 0 && Math.abs(cell.scheduled - cell.quota) < 0.001) {
        completedClassCount++
      } else if (cell.scheduled > cell.quota + 0.001) {
        hasOver = true
      } else if (cell.scheduled + 0.001 < cell.quota) {
        hasUnder = true
      }
    }

    const rowStatus: GradeSubjectStatRow["rowStatus"] =
      weeklyQuota <= 0 && distinctQuotas.size === 1
        ? hasOver
          ? "OVER"
          : "NO_QUOTA"
        : hasOver
        ? "OVER"
        : hasUnder
        ? "UNDER"
        : "OK"

    subjectRows.push({
      subjectId: subId,
      subjectCode,
      subjectName,
      representativeStudyProgram,
      weeklyQuota,
      hasMixedProgramQuotas: distinctQuotas.size > 1,
      cycleQuota: round2(weeklyQuota * cycleWeeks),
      isHalfPeriodSubject:
        weeklyQuota % 1 !== 0 || perClass.some((c) => c.scheduled % 1 !== 0),
      isDualGvvnGvnn: Boolean(sampleQuota?.isDualGvvnGvnn),
      perClass,
      completedClassCount,
      totalClassCount: filteredClasses.length,
      rowStatus,
    })
  }

  subjectRows.sort((a, b) => {
    if (b.weeklyQuota !== a.weeklyQuota) return b.weeklyQuota - a.weeklyQuota
    return a.subjectName.localeCompare(b.subjectName, "vi")
  })

  const totalGradeQuota = round2(
    subjectRows.reduce((sum, r) => sum + r.weeklyQuota, 0)
  )

  const classSummaries: GradeClassColumnSummary[] = filteredClasses.map((cls) => {
    const studyProgram = mapEducationSystemToStudyProgram(cls.educationSystem)
    const quotaTotal = round2(
      subjectRows.reduce((acc, r) => {
        const cell = r.perClass.find((p) => p.classId === cls.id)
        return acc + (cell?.quota || 0)
      }, 0)
    )
    const scheduledTotal = slotSummary.scheduledByClass.get(cls.id) || 0
    return {
      classId: cls.id,
      className: cls.className,
      studyProgram,
      quotaTotal,
      scheduledTotal,
      diffFromStandard: round2(scheduledTotal - targetWeeklyPeriods),
      unpairedHalfCells: slotSummary.unpairedHalfCellsByClass.get(cls.id) || 0,
    }
  })

  const averageScheduledPeriods =
    classSummaries.length > 0
      ? round2(
          classSummaries.reduce((acc, c) => acc + c.scheduledTotal, 0) /
            classSummaries.length
        )
      : 0

  const gradeNum = extractGradeNumber(params.grade)
  const gradeLabel = gradeNum ? `Khối ${gradeNum}` : `Khối ${params.grade}`

  return {
    grade: params.grade,
    gradeLabel,
    targetWeeklyPeriods,
    cycleWeeks,
    availablePrograms,
    selectedProgram: effectiveProgram,
    classes: classSummaries,
    subjectRows,
    totalGradeQuota,
    quotaDiffFromStandard: round2(totalGradeQuota - targetWeeklyPeriods),
    averageScheduledPeriods,
  }
}

export interface AllGradesMatrixGradeCol {
  grade: string
  gradeLabel: string
  classCount: number
  totalQuota: number
  diffFromStandard: number // totalQuota - 40
  avgScheduled: number
  schedDiffFromStandard: number // avgScheduled - 40
}

export interface AllGradesMatrixRow {
  subjectId: string
  subjectCode: string
  subjectName: string
  byGrade: Record<
    string,
    {
      quota: number
      avgScheduled: number
    }
  >
}

export interface AllGradesMatrixReport {
  targetWeeklyPeriods: number
  availablePrograms: string[]
  selectedProgram: string
  gradeColumns: AllGradesMatrixGradeCol[]
  rows: AllGradesMatrixRow[]
}

export function buildAllGradesMatrixStats(params: {
  classes: ClassForGradeStats[]
  quotaItems: QuotaReconcileItem[]
  slots: SlotRecord[]
  subjects: SubjectRef[]
  studyProgramFilter?: string
  targetWeeklyPeriods?: number
}): AllGradesMatrixReport {
  const targetWeeklyPeriods = params.targetWeeklyPeriods ?? WEEKLY_STANDARD_PERIODS

  const allProgramsSet = new Set<string>()
  for (const c of params.classes) {
    allProgramsSet.add(mapEducationSystemToStudyProgram(c.educationSystem))
  }
  const availablePrograms = Array.from(allProgramsSet).sort((a, b) => a.localeCompare(b, "vi"))
  const requestedProgram = params.studyProgramFilter || availablePrograms[0] || "Hệ S"
  const selectedProgram = availablePrograms.includes(requestedProgram)
    ? requestedProgram
    : availablePrograms[0] || "ALL"

  const programClasses =
    selectedProgram === "ALL"
      ? params.classes
      : params.classes.filter(
          (c) => mapEducationSystemToStudyProgram(c.educationSystem) === selectedProgram
        )

  const grades = sortGradeStrings(
    Array.from(new Set(programClasses.map((c) => String(c.grade).trim()).filter(Boolean)))
  )

  const perGradeReports = new Map<string, SingleGradeStatsReport>()
  for (const g of grades) {
    perGradeReports.set(
      g,
      buildSingleGradeStats({
        grade: g,
        classes: programClasses,
        quotaItems: params.quotaItems,
        slots: params.slots,
        subjects: params.subjects,
        studyProgramFilter: selectedProgram,
        targetWeeklyPeriods,
      })
    )
  }

  const allSubIds = new Set<string>()
  for (const rep of perGradeReports.values()) {
    for (const r of rep.subjectRows) {
      allSubIds.add(r.subjectId)
    }
  }

  const subjectById = new Map(params.subjects.map((s) => [s.id, s]))
  const rows: AllGradesMatrixRow[] = []

  for (const subId of allSubIds) {
    const subRef = subjectById.get(subId)
    let fallbackName = subId
    let fallbackCode = ""
    const byGrade: AllGradesMatrixRow["byGrade"] = {}

    for (const g of grades) {
      const rep = perGradeReports.get(g)!
      const found = rep.subjectRows.find((r) => r.subjectId === subId)
      if (found) {
        fallbackName = found.subjectName
        fallbackCode = found.subjectCode
        const avgSch =
          found.perClass.length > 0
            ? round2(
                found.perClass.reduce((s, c) => s + c.scheduled, 0) / found.perClass.length
              )
            : 0
        byGrade[g] = {
          quota: found.weeklyQuota,
          avgScheduled: avgSch,
        }
      } else {
        byGrade[g] = { quota: 0, avgScheduled: 0 }
      }
    }

    rows.push({
      subjectId: subId,
      subjectCode: subRef?.subjectCode || fallbackCode,
      subjectName: subRef?.subjectName || fallbackName,
      byGrade,
    })
  }

  rows.sort((a, b) => a.subjectName.localeCompare(b.subjectName, "vi"))

  const gradeColumns: AllGradesMatrixGradeCol[] = grades.map((g) => {
    const rep = perGradeReports.get(g)!
    return {
      grade: g,
      gradeLabel: rep.gradeLabel,
      classCount: rep.classes.length,
      totalQuota: rep.totalGradeQuota,
      diffFromStandard: rep.quotaDiffFromStandard,
      avgScheduled: rep.averageScheduledPeriods,
      schedDiffFromStandard: round2(rep.averageScheduledPeriods - targetWeeklyPeriods),
    }
  })

  return {
    targetWeeklyPeriods,
    availablePrograms,
    selectedProgram,
    gradeColumns,
    rows,
  }
}
