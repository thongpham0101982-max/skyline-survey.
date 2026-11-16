import {
  buildSubjectLookupMaps,
  resolveGradeQuotaValue,
  type SubjectQuotaRow,
  type SubjectRef,
} from "./quotaReconciler"
import {
  extractGradeNumber,
  mapEducationSystemToStudyProgram,
  normalizeClassLevelCode,
  resolveClassStudyProgram,
  sortClassesByGradeAndSystem,
} from "./scopeResolver"
import { isDualGvvnGvnnSubject } from "./teacherGroupHelper"
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
  studyProgram: "Hệ S" | "Hệ I"
  quota: number
  scheduled: number
  diff: number // scheduled - quota
  notApplicable: boolean
}

export interface GradeSubjectStatRow {
  subjectId: string
  subjectCode: string
  subjectName: string
  representativeStudyProgram: string
  weeklyQuota: number
  quotaHeS: number
  quotaHeI: number
  cycleQuotaHeS: number
  cycleQuotaHeI: number
  isOverHeS: boolean
  maxScheduledHeS: number
  maxOverDiffHeS: number
  isOverHeI: boolean
  maxScheduledHeI: number
  maxOverDiffHeI: number
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
  studyProgram: "Hệ S" | "Hệ I"
  rawEducationSystem: string
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
  quotaDiffFromStandard: number
  totalQuotaHeS: number
  diffHeSFromStandard: number
  totalQuotaHeI: number
  diffHeIFromStandard: number
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

function inferLevelNormFromGrade(
  gradeNum: number | null,
  fallbackLevel?: string
): "TH" | "THCS" | "THPT" | "MN" | "OTHER" {
  if (fallbackLevel) {
    const norm = normalizeClassLevelCode(fallbackLevel)
    if (norm !== "OTHER") return norm
  }
  if (gradeNum !== null) {
    if (gradeNum >= 1 && gradeNum <= 5) return "TH"
    if (gradeNum >= 6 && gradeNum <= 9) return "THCS"
    if (gradeNum >= 10 && gradeNum <= 12) return "THPT"
  }
  return "OTHER"
}

export function buildSingleGradeStats(params: {
  grade: string
  classes: ClassForGradeStats[]
  quotaItems: QuotaReconcileItem[]
  slots: SlotRecord[]
  subjects: SubjectRef[]
  subjectQuotas?: SubjectQuotaRow[]
  studyProgramFilter?: string // "ALL" | "Hệ S" | "Hệ I"
  cycleWeeks?: number
  targetWeeklyPeriods?: number
}): SingleGradeStatsReport {
  const targetWeeklyPeriods = params.targetWeeklyPeriods ?? WEEKLY_STANDARD_PERIODS
  const cycleWeeks = params.cycleWeeks ?? 2

  const allGradeClasses = sortClassesByGradeAndSystem(
    params.classes.filter((c) => String(c.grade).trim() === String(params.grade).trim())
  )

  const hasHeSInGrade = allGradeClasses.some((c) => resolveClassStudyProgram(c) === "Hệ S")
  const hasHeIInGrade = allGradeClasses.some((c) => resolveClassStudyProgram(c) === "Hệ I")

  const availablePrograms: string[] = ["Hệ S", "Hệ I"]

  const requestedProgram = params.studyProgramFilter || "ALL"
  const effectiveProgram =
    requestedProgram === "Hệ S" || requestedProgram === "Hệ I" ? requestedProgram : "ALL"

  const filteredClasses =
    effectiveProgram === "ALL"
      ? allGradeClasses
      : allGradeClasses.filter((c) => resolveClassStudyProgram(c) === effectiveProgram)

  const slotSummary = computeClassSlotSummary(params.slots, params.subjects)
  const subjectById = new Map(params.subjects.map((s) => [s.id, s]))

  // Index SubjectQuotaRow by `${subjectId}::${studyProgram}`
  const rawQuotaRowMap = new Map<string, SubjectQuotaRow>()
  for (const sq of params.subjectQuotas || []) {
    const sp = mapEducationSystemToStudyProgram(sq.studyProgram)
    rawQuotaRowMap.set(`${sq.subjectId}::${sp}`, sq)
    if (sq.studyProgram === "DEFAULT") {
      rawQuotaRowMap.set(`${sq.subjectId}::DEFAULT`, sq)
    }
  }

  const gradeNum = extractGradeNumber(params.grade)
  const levelNorm = inferLevelNormFromGrade(gradeNum, allGradeClasses[0]?.level)

  // Index quotaItems across ALL classes of this grade (so fallback works for both Hệ S & Hệ I)
  const quotaByClassSub = new Map<string, QuotaReconcileItem>()
  const quotaFallbackBySubProgram = new Map<string, number>()
  const relevantSubjectIds = new Set<string>()

  const allGradeClassIds = new Set(allGradeClasses.map((c) => c.id))
  for (const q of params.quotaItems) {
    if (!allGradeClassIds.has(q.classId)) continue
    quotaByClassSub.set(`${q.classId}::${q.subjectId}`, q)
    const sp = mapEducationSystemToStudyProgram(q.studyProgram)
    if (!quotaFallbackBySubProgram.has(`${q.subjectId}::${sp}`)) {
      quotaFallbackBySubProgram.set(`${q.subjectId}::${sp}`, q.weeklyQuota)
    }
    if (q.weeklyQuota > 0 || q.scheduledWeeklyEquivalent > 0) {
      relevantSubjectIds.add(q.subjectId)
    }
  }

  // Also include subjects from SubjectQuota that apply to the active system(s) of this grade
  for (const sub of params.subjects) {
    const sqS = rawQuotaRowMap.get(`${sub.id}::Hệ S`) || rawQuotaRowMap.get(`${sub.id}::DEFAULT`)
    const sqI = rawQuotaRowMap.get(`${sub.id}::Hệ I`) || rawQuotaRowMap.get(`${sub.id}::DEFAULT`)
    const valS = sqS ? resolveGradeQuotaValue(sqS, gradeNum, levelNorm) : 0
    const valI = sqI ? resolveGradeQuotaValue(sqI, gradeNum, levelNorm) : 0
    const considerS =
      effectiveProgram === "Hệ S" ||
      (effectiveProgram === "ALL" && (hasHeSInGrade || !hasHeIInGrade))
    const considerI =
      effectiveProgram === "Hệ I" ||
      (effectiveProgram === "ALL" && (hasHeIInGrade || !hasHeSInGrade))
    if ((considerS && valS > 0) || (considerI && valI > 0)) {
      relevantSubjectIds.add(sub.id)
    }
  }

  // Also capture subjects scheduled directly in slots even if quota is 0
  for (const cls of allGradeClasses) {
    for (const sub of params.subjects) {
      const sch = slotSummary.scheduledByClassSubject.get(`${cls.id}::${sub.id}`) || 0
      if (sch > 0) {
        relevantSubjectIds.add(sub.id)
      }
    }
  }

  const resolveSystemQuota = (subId: string, program: "Hệ S" | "Hệ I"): number => {
    if (params.subjectQuotas && params.subjectQuotas.length > 0) {
      const exactRow =
        rawQuotaRowMap.get(`${subId}::${program}`) ||
        rawQuotaRowMap.get(`${subId}::DEFAULT`)
      return resolveGradeQuotaValue(exactRow, gradeNum, levelNorm)
    }
    if (quotaFallbackBySubProgram.has(`${subId}::${program}`)) {
      return quotaFallbackBySubProgram.get(`${subId}::${program}`) || 0
    }
    // Single-system fallback when subjectQuotas array wasn't passed (e.g. unit tests)
    const otherProg = program === "Hệ S" ? "Hệ I" : "Hệ S"
    if (program === "Hệ S" && !hasHeSInGrade) {
      return 0
    }
    if (program === "Hệ I" && !hasHeIInGrade) {
      return 0
    }
    return quotaFallbackBySubProgram.get(`${subId}::${otherProg}`) || 0
  }

  const subjectRows: GradeSubjectStatRow[] = []

  for (const subId of relevantSubjectIds) {
    const subRef = subjectById.get(subId)
    const sampleQuota = allGradeClasses
      .map((c) => quotaByClassSub.get(`${c.id}::${subId}`))
      .find(Boolean)

    const subjectName = subRef?.subjectName || sampleQuota?.subjectName || subId
    const subjectCode = subRef?.subjectCode || sampleQuota?.subjectCode || ""

    const quotaHeS = resolveSystemQuota(subId, "Hệ S")
    const quotaHeI = resolveSystemQuota(subId, "Hệ I")

    const perClass: GradeSubjectClassCell[] = filteredClasses.map((cls) => {
      const qItem = quotaByClassSub.get(`${cls.id}::${subId}`)
      const studyProgram = resolveClassStudyProgram(cls)
      const fallbackSysQuota = studyProgram === "Hệ I" ? quotaHeI : quotaHeS
      const quota = qItem ? qItem.weeklyQuota : fallbackSysQuota
      const scheduled = slotSummary.scheduledByClassSubject.get(`${cls.id}::${subId}`) || 0
      return {
        classId: cls.id,
        className: cls.className,
        studyProgram,
        quota,
        scheduled,
        diff: round2(scheduled - quota),
        notApplicable: quota <= 0 && scheduled <= 0,
      }
    })

    // Also evaluate allGradeClasses per system so Hệ S / Hệ I over-quota flags stay accurate
    let isOverHeS = false
    let maxScheduledHeS = 0
    let maxOverDiffHeS = 0
    let isOverHeI = false
    let maxScheduledHeI = 0
    let maxOverDiffHeI = 0

    for (const cls of allGradeClasses) {
      const sp = resolveClassStudyProgram(cls)
      const qItem = quotaByClassSub.get(`${cls.id}::${subId}`)
      const sysQuota = qItem ? qItem.weeklyQuota : sp === "Hệ I" ? quotaHeI : quotaHeS
      const sch = slotSummary.scheduledByClassSubject.get(`${cls.id}::${subId}`) || 0
      const d = round2(sch - sysQuota)
      if (sp === "Hệ I") {
        if (sch > maxScheduledHeI) maxScheduledHeI = sch
        if (d > 0.001) {
          isOverHeI = true
          if (d > maxOverDiffHeI) maxOverDiffHeI = d
        }
      } else {
        if (sch > maxScheduledHeS) maxScheduledHeS = sch
        if (d > 0.001) {
          isOverHeS = true
          if (d > maxOverDiffHeS) maxOverDiffHeS = d
        }
      }
    }

    // Skip subjects that have 0 quota and 0 scheduled across all displayed classes (when classes exist)
    if (
      filteredClasses.length > 0 &&
      perClass.every((c) => c.quota <= 0 && c.scheduled <= 0)
    ) {
      continue
    }
    if (
      effectiveProgram === "Hệ S" &&
      quotaHeS <= 0 &&
      perClass.every((c) => c.scheduled <= 0 && c.quota <= 0)
    ) {
      continue
    }
    if (
      effectiveProgram === "Hệ I" &&
      quotaHeI <= 0 &&
      perClass.every((c) => c.scheduled <= 0 && c.quota <= 0)
    ) {
      continue
    }

    const representativeStudyProgram =
      effectiveProgram === "Hệ I"
        ? "Hệ I"
        : effectiveProgram === "Hệ S"
        ? "Hệ S"
        : perClass[0]?.studyProgram || "Hệ S"

    const weeklyQuota =
      representativeStudyProgram === "Hệ I" ? quotaHeI : quotaHeS

    let completedClassCount = 0
    let applicableClassCount = 0
    let hasOver = false
    let hasUnder = false

    for (const cell of perClass) {
      if (cell.notApplicable) continue
      applicableClassCount++
      if (cell.quota > 0 && Math.abs(cell.scheduled - cell.quota) < 0.001) {
        completedClassCount++
      } else if (cell.scheduled > cell.quota + 0.001) {
        hasOver = true
      } else if (cell.scheduled + 0.001 < cell.quota) {
        hasUnder = true
      }
    }

    const activeClassesHaveAnyQuota = perClass.some((c) => c.quota > 0)
    const rowStatus: GradeSubjectStatRow["rowStatus"] = hasOver
      ? "OVER"
      : hasUnder
      ? "UNDER"
      : activeClassesHaveAnyQuota
      ? "OK"
      : quotaHeS > 0 || quotaHeI > 0
      ? "OK"
      : "NO_QUOTA"

    subjectRows.push({
      subjectId: subId,
      subjectCode,
      subjectName,
      representativeStudyProgram,
      weeklyQuota,
      quotaHeS,
      quotaHeI,
      cycleQuotaHeS: round2(quotaHeS * cycleWeeks),
      cycleQuotaHeI: round2(quotaHeI * cycleWeeks),
      isOverHeS,
      maxScheduledHeS,
      maxOverDiffHeS,
      isOverHeI,
      maxScheduledHeI,
      maxOverDiffHeI,
      hasMixedProgramQuotas: Math.abs(quotaHeS - quotaHeI) > 0.001,
      cycleQuota: round2(weeklyQuota * cycleWeeks),
      isHalfPeriodSubject:
        quotaHeS % 1 !== 0 ||
        quotaHeI % 1 !== 0 ||
        perClass.some((c) => c.scheduled % 1 !== 0),
      isDualGvvnGvnn:
        Boolean(sampleQuota?.isDualGvvnGvnn) ||
        isDualGvvnGvnnSubject({ subjectCode, subjectName }),
      perClass,
      completedClassCount,
      totalClassCount: applicableClassCount || filteredClasses.length,
      rowStatus,
    })
  }

  subjectRows.sort((a, b) => {
    const maxA = Math.max(a.quotaHeS, a.quotaHeI, a.weeklyQuota)
    const maxB = Math.max(b.quotaHeS, b.quotaHeI, b.weeklyQuota)
    if (maxB !== maxA) return maxB - maxA
    return a.subjectName.localeCompare(b.subjectName, "vi")
  })

  const allKnownSubIds = new Set<string>(relevantSubjectIds)
  if (params.subjectQuotas && params.subjectQuotas.length > 0) {
    for (const s of params.subjects) allKnownSubIds.add(s.id)
  }

  const totalQuotaHeS = round2(
    Array.from(allKnownSubIds).reduce((sum, subId) => sum + resolveSystemQuota(subId, "Hệ S"), 0)
  )
  const totalQuotaHeI = round2(
    Array.from(allKnownSubIds).reduce((sum, subId) => sum + resolveSystemQuota(subId, "Hệ I"), 0)
  )

  const totalGradeQuota =
    effectiveProgram === "Hệ I"
      ? totalQuotaHeI
      : effectiveProgram === "Hệ S"
      ? totalQuotaHeS
      : !hasHeSInGrade && hasHeIInGrade
      ? totalQuotaHeI
      : totalQuotaHeS

  const classSummaries: GradeClassColumnSummary[] = filteredClasses.map((cls) => {
    const studyProgram = resolveClassStudyProgram(cls)
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
      rawEducationSystem: String(cls.educationSystem || "").trim(),
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
    totalQuotaHeS,
    diffHeSFromStandard: round2(totalQuotaHeS - targetWeeklyPeriods),
    totalQuotaHeI,
    diffHeIFromStandard: round2(totalQuotaHeI - targetWeeklyPeriods),
    averageScheduledPeriods,
  }
}

export interface AllGradesMatrixGradeCol {
  grade: string
  gradeLabel: string
  classCount: number
  classCountHeS: number
  classCountHeI: number
  totalQuota: number
  diffFromStandard: number
  totalQuotaHeS: number
  diffHeSFromStandard: number
  totalQuotaHeI: number
  diffHeIFromStandard: number
  avgScheduled: number
  avgScheduledHeS: number
  avgScheduledHeI: number
  schedDiffFromStandard: number
}

export interface AllGradesMatrixRow {
  subjectId: string
  subjectCode: string
  subjectName: string
  byGrade: Record<
    string,
    {
      quota: number
      quotaHeS: number
      quotaHeI: number
      avgScheduled: number
      avgScheduledHeS: number
      avgScheduledHeI: number
      isOverHeS: boolean
      isOverHeI: boolean
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
  subjectQuotas?: SubjectQuotaRow[]
  studyProgramFilter?: string
  targetWeeklyPeriods?: number
}): AllGradesMatrixReport {
  const targetWeeklyPeriods = params.targetWeeklyPeriods ?? WEEKLY_STANDARD_PERIODS

  const availablePrograms = ["Hệ S", "Hệ I"]
  const requestedProgram = params.studyProgramFilter || "ALL"
  const selectedProgram =
    requestedProgram === "Hệ S" || requestedProgram === "Hệ I"
      ? requestedProgram
      : "ALL"

  const grades = sortGradeStrings(
    Array.from(new Set(params.classes.map((c) => String(c.grade).trim()).filter(Boolean)))
  )

  const perGradeReports = new Map<string, SingleGradeStatsReport>()
  for (const g of grades) {
    perGradeReports.set(
      g,
      buildSingleGradeStats({
        grade: g,
        classes: params.classes,
        quotaItems: params.quotaItems,
        slots: params.slots,
        subjects: params.subjects,
        subjectQuotas: params.subjectQuotas,
        studyProgramFilter: "ALL",
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
        const heSCells = found.perClass.filter((c) => c.studyProgram === "Hệ S")
        const heICells = found.perClass.filter((c) => c.studyProgram === "Hệ I")
        const avgSch =
          found.perClass.length > 0
            ? round2(
                found.perClass.reduce((s, c) => s + c.scheduled, 0) / found.perClass.length
              )
            : 0
        const avgHeS =
          heSCells.length > 0
            ? round2(heSCells.reduce((s, c) => s + c.scheduled, 0) / heSCells.length)
            : 0
        const avgHeI =
          heICells.length > 0
            ? round2(heICells.reduce((s, c) => s + c.scheduled, 0) / heICells.length)
            : 0

        byGrade[g] = {
          quota: selectedProgram === "Hệ I" ? found.quotaHeI : found.quotaHeS,
          quotaHeS: found.quotaHeS,
          quotaHeI: found.quotaHeI,
          avgScheduled: avgSch,
          avgScheduledHeS: avgHeS,
          avgScheduledHeI: avgHeI,
          isOverHeS: found.isOverHeS,
          isOverHeI: found.isOverHeI,
        }
      } else {
        byGrade[g] = {
          quota: 0,
          quotaHeS: 0,
          quotaHeI: 0,
          avgScheduled: 0,
          avgScheduledHeS: 0,
          avgScheduledHeI: 0,
          isOverHeS: false,
          isOverHeI: false,
        }
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
    const heSCls = rep.classes.filter((c) => c.studyProgram === "Hệ S")
    const heICls = rep.classes.filter((c) => c.studyProgram === "Hệ I")
    const avgHeS =
      heSCls.length > 0
        ? round2(heSCls.reduce((s, c) => s + c.scheduledTotal, 0) / heSCls.length)
        : 0
    const avgHeI =
      heICls.length > 0
        ? round2(heICls.reduce((s, c) => s + c.scheduledTotal, 0) / heICls.length)
        : 0

    return {
      grade: g,
      gradeLabel: rep.gradeLabel,
      classCount: rep.classes.length,
      classCountHeS: heSCls.length,
      classCountHeI: heICls.length,
      totalQuota: rep.totalGradeQuota,
      diffFromStandard: rep.quotaDiffFromStandard,
      totalQuotaHeS: rep.totalQuotaHeS,
      diffHeSFromStandard: rep.diffHeSFromStandard,
      totalQuotaHeI: rep.totalQuotaHeI,
      diffHeIFromStandard: rep.diffHeIFromStandard,
      avgScheduled: rep.averageScheduledPeriods,
      avgScheduledHeS: avgHeS,
      avgScheduledHeI: avgHeI,
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
