import crypto from "crypto"
import { prisma } from "@/lib/db"
import { resolveEffectiveCampusIds } from "./scope"
import {
  formatMonthLabel,
  formatShortMonthLabel,
  matchesLevelFilter,
  normalizeEducationLevel,
  toMonthKey,
} from "./stats"
import {
  AvailableDashboardFilters,
  CampusQualityAccessScope,
  CampusQualityFilterInput,
  EvaluationPeriodCode,
  LevelFilterCode,
} from "./types"

export const PERIOD_LABELS: Record<EvaluationPeriodCode, string> = {
  GK1: "Giữa kỳ 1",
  CK1: "Cuối kỳ 1",
  GK2: "Giữa kỳ 2",
  CK2: "Cuối kỳ 2",
}

export const LEVEL_OPTIONS: Array<{ code: LevelFilterCode; label: string }> = [
  { code: "ALL", label: "Tất cả bậc học" },
  { code: "MAM_NON", label: "Mầm non" },
  { code: "TIEU_HOC", label: "Tiểu học" },
  { code: "THCS", label: "THCS" },
  { code: "THPT", label: "THPT" },
]

export interface ResolvedDashboardContext {
  academicYearId: string
  academicYearName: string
  academicYearStart: Date
  academicYearEnd: Date
  campusId: string // "ALL" or specific campusId
  allowedCampusFilter: string[] | null // null = all campuses allowed
  level: LevelFilterCode
  grade: string // "ALL" or grade string
  classId: string // "ALL" or classId
  evaluationPeriod: EvaluationPeriodCode
  evaluationPeriodLabel: string
  monthKey: string // YYYY-MM
  monthLabel: string // "Tháng MM/YYYY"
  currentSystemMonthKey: string // YYYY-MM from system clock
  currentSystemMonthLabel: string // "MM/YYYY"
  subjectId: string // "ALL" or subjectId
  publishedOnly: boolean
  matchedCohortOnly: boolean
  supportFilterMode: "BELOW_5" | "BELOW_SKL" | "MULTI_SUBJECT" | "CONSECUTIVE_PERIODS"
  psychologyGroupBy: "CLASS" | "OWNER"
  scopedClasses: Array<{
    id: string
    classCode: string
    className: string
    grade: string
    level: string
    normalizedLevel: Exclude<LevelFilterCode, "ALL">
    campusId: string
    campusCode: string
    campusName: string
    homeroomTeacherId: string | null
    educationSystem: string
  }>
  scopedClassIds: string[]
  allYearClasses: Array<{
    id: string
    classCode: string
    className: string
    grade: string
    level: string
    normalizedLevel: Exclude<LevelFilterCode, "ALL">
    campusId: string
    campusCode: string
    campusName: string
    homeroomTeacherId: string | null
    educationSystem: string
  }>
  availableFilters: AvailableDashboardFilters
  snapshotVersion: string
  computedAt: string
}

function buildAcademicYearMonths(startDate: Date, endDate: Date, fallbackMonthKey: string) {
  const months: Array<{ value: string; label: string }> = []
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
  let guard = 0
  while (cursor <= end && guard < 18) {
    const key = toMonthKey(cursor)
    months.push({ value: key, label: formatMonthLabel(key) })
    cursor.setMonth(cursor.getMonth() + 1)
    guard++
  }
  if (!months.some((m) => m.value === fallbackMonthKey)) {
    months.push({ value: fallbackMonthKey, label: formatMonthLabel(fallbackMonthKey) })
  }
  return months
}

export async function resolveDashboardContext(
  input: CampusQualityFilterInput,
  scope: CampusQualityAccessScope
): Promise<{ context: ResolvedDashboardContext; forbiddenCampus: boolean }> {
  const now = new Date()
  const currentSystemMonthKey = toMonthKey(now)
  const currentSystemMonthLabel = formatShortMonthLabel(currentSystemMonthKey)

  const [allAcademicYears, allCampuses, allSubjects] = await Promise.all([
    prisma.academicYear.findMany({
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
      select: { id: true, name: true, status: true, startDate: true, endDate: true },
    }),
    prisma.campus.findMany({
      where: { status: "ACTIVE" },
      orderBy: { campusCode: "asc" },
      select: { id: true, campusCode: true, campusName: true },
    }),
    prisma.subject.findMany({
      where: { status: "ACTIVE" },
      orderBy: { subjectName: "asc" },
      select: { id: true, subjectCode: true, subjectName: true },
    }),
  ])

  const activeYear =
    allAcademicYears.find((y) => y.id === input.academicYearId) ||
    allAcademicYears.find((y) => y.status === "ACTIVE") ||
    allAcademicYears[0]

  const academicYearId = activeYear?.id || ""
  const academicYearName = activeYear?.name || "Chưa thiết lập năm học"
  const academicYearStart = activeYear?.startDate || new Date(now.getFullYear(), 7, 1)
  const academicYearEnd = activeYear?.endDate || new Date(now.getFullYear() + 1, 5, 30)

  const effectiveCampus = resolveEffectiveCampusIds(
    input.campusId || scope.defaultCampusId,
    scope
  )

  const visibleCampuses =
    scope.isCampusRestricted && scope.allowedCampusIds.length > 0
      ? allCampuses.filter((c) => scope.allowedCampusIds.includes(c.id))
      : allCampuses

  const rawClasses = academicYearId
    ? await prisma.class.findMany({
        where: { academicYearId, status: "ACTIVE" },
        include: { campus: { select: { id: true, campusCode: true, campusName: true } } },
        orderBy: [{ grade: "asc" }, { className: "asc" }],
      })
    : []

  const allYearClasses = rawClasses.map((c) => ({
    id: c.id,
    classCode: c.classCode,
    className: c.className,
    grade: String(c.grade || "").trim(),
    level: c.level,
    normalizedLevel: normalizeEducationLevel(c.level, c.grade),
    campusId: c.campusId,
    campusCode: c.campus?.campusCode || "",
    campusName: c.campus?.campusName || "",
    homeroomTeacherId: c.homeroomTeacherId || null,
    educationSystem: c.educationSystem || "",
  }))

  const level = (
    ["ALL", "MAM_NON", "TIEU_HOC", "THCS", "THPT"].includes(String(input.level || "ALL"))
      ? String(input.level || "ALL")
      : "ALL"
  ) as LevelFilterCode

  const grade = String(input.grade || "ALL").trim() || "ALL"
  const classId = String(input.classId || "ALL").trim() || "ALL"
  const subjectId = String(input.subjectId || "ALL").trim() || "ALL"

  const rawPeriod = String(input.evaluationPeriod || "GK1").toUpperCase()
  const evaluationPeriod = (
    ["GK1", "CK1", "GK2", "CK2"].includes(rawPeriod) ? rawPeriod : "GK1"
  ) as EvaluationPeriodCode

  const monthKey = /^\d{4}-\d{2}$/.test(String(input.month || ""))
    ? String(input.month)
    : currentSystemMonthKey

  // Filter classes according to scope + user filter
  let scopedClasses = allYearClasses.filter((c) => {
    if (effectiveCampus.allowedCampusFilter && !effectiveCampus.allowedCampusFilter.includes(c.campusId)) {
      return false
    }
    if (scope.isClassRestricted && scope.allowedClassIds.length > 0 && !scope.allowedClassIds.includes(c.id)) {
      return false
    }
    if (!matchesLevelFilter(c.level, c.grade, level)) return false
    if (grade !== "ALL" && c.grade !== grade) return false
    if (classId !== "ALL" && c.id !== classId) return false
    return true
  })

  // Available grades & classes dropdown options (scoped by campus + level, not locked by classId)
  const dropdownClasses = allYearClasses.filter((c) => {
    if (effectiveCampus.allowedCampusFilter && !effectiveCampus.allowedCampusFilter.includes(c.campusId)) {
      return false
    }
    if (scope.isClassRestricted && scope.allowedClassIds.length > 0 && !scope.allowedClassIds.includes(c.id)) {
      return false
    }
    if (!matchesLevelFilter(c.level, c.grade, level)) return false
    return true
  })

  const grades = Array.from(new Set(dropdownClasses.map((c) => c.grade).filter(Boolean))).sort(
    (a, b) => {
      const na = parseInt(a.replace(/\D/g, ""), 10)
      const nb = parseInt(b.replace(/\D/g, ""), 10)
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
      return a.localeCompare(b, "vi")
    }
  )

  const months = buildAcademicYearMonths(academicYearStart, academicYearEnd, currentSystemMonthKey)
  const computedAt = now.toISOString()
  const snapshotVersion = crypto
    .createHash("sha1")
    .update(
      JSON.stringify({
        academicYearId,
        campusId: effectiveCampus.campusIdParam,
        level,
        grade,
        classId,
        evaluationPeriod,
        monthKey,
        subjectId,
        role: scope.roleCode,
        minute: computedAt.slice(0, 16),
      })
    )
    .digest("hex")
    .slice(0, 12)

  return {
    forbiddenCampus: effectiveCampus.forbidden,
    context: {
      academicYearId,
      academicYearName,
      academicYearStart,
      academicYearEnd,
      campusId: effectiveCampus.campusIdParam,
      allowedCampusFilter: effectiveCampus.allowedCampusFilter,
      level,
      grade,
      classId,
      evaluationPeriod,
      evaluationPeriodLabel: PERIOD_LABELS[evaluationPeriod],
      monthKey,
      monthLabel: formatMonthLabel(monthKey),
      currentSystemMonthKey,
      currentSystemMonthLabel,
      subjectId,
      publishedOnly: input.publishedOnly ?? false,
      matchedCohortOnly: Boolean(input.matchedCohortOnly),
      supportFilterMode: input.supportFilterMode || "BELOW_SKL",
      psychologyGroupBy: input.psychologyGroupBy || "CLASS",
      scopedClasses,
      scopedClassIds: scopedClasses.map((c) => c.id),
      allYearClasses,
      availableFilters: {
        academicYears: allAcademicYears.map((y) => ({ id: y.id, name: y.name, status: y.status })),
        campuses: visibleCampuses,
        levels: LEVEL_OPTIONS,
        grades,
        classes: dropdownClasses.map((c) => ({
          id: c.id,
          classCode: c.classCode,
          className: c.className,
          grade: c.grade,
          level: c.normalizedLevel,
          campusId: c.campusId,
          educationSystem: c.educationSystem,
        })),
        evaluationPeriods: [
          { code: "GK1", label: "Giữa kỳ 1" },
          { code: "CK1", label: "Cuối kỳ 1" },
          { code: "GK2", label: "Giữa kỳ 2" },
          { code: "CK2", label: "Cuối kỳ 2" },
        ],
        months,
        subjects: allSubjects.map((s) => ({
          id: s.id,
          code: s.subjectCode,
          name: s.subjectName,
        })),
      },
      snapshotVersion,
      computedAt,
    },
  }
}

export interface BenchmarkLookupItem {
  evaluationPeriod: string
  level: string
  grade: string
  subjectId: string
  benchmarkScore: number
}

/**
 * Resolves effective Sky-Line benchmark score for a given (period, level, grade, subjectId).
 * Returns null when NO configuration exists so UI can explicitly display "Chưa cấu hình ngưỡng".
 */
export function resolveBenchmarkScore(
  configs: BenchmarkLookupItem[],
  evaluationPeriod: string,
  level: string,
  grade: string,
  subjectId: string
): number | null {
  if (!configs || configs.length === 0) return null

  const normLevel = (v: string) =>
    String(v || "ALL")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .trim()

  const targetLevel = normLevel(level)
  let bestScore: number | null = null
  let bestSpecificity = -1

  for (const cfg of configs) {
    const pMatch = cfg.evaluationPeriod === evaluationPeriod || cfg.evaluationPeriod === "ALL"
    const lNorm = normLevel(cfg.level)
    const lMatch = lNorm === targetLevel || lNorm === "ALL" || lNorm === ""
    const gMatch = cfg.grade === grade || cfg.grade === "ALL" || cfg.grade === ""
    const sMatch = cfg.subjectId === subjectId || cfg.subjectId === "ALL" || cfg.subjectId === ""

    if (!pMatch || !lMatch || !gMatch || !sMatch) continue

    const specificity =
      (cfg.subjectId === subjectId ? 8 : 0) +
      (cfg.grade === grade ? 4 : 0) +
      (lNorm === targetLevel ? 2 : 0) +
      (cfg.evaluationPeriod === evaluationPeriod ? 1 : 0)

    if (specificity > bestSpecificity) {
      bestSpecificity = specificity
      bestScore = cfg.benchmarkScore
    }
  }

  return bestScore
}
