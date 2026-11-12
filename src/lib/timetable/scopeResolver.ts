import type {
  DayOfWeekCode,
  LevelFilterCode,
  ManageableScopeGroup,
  PeriodTimeDef,
  ScopeGroup,
} from "./types"

export interface CampusLike {
  id: string
  campusCode?: string | null
  campusName?: string | null
  address?: string | null
}

export interface ClassLike {
  id: string
  className: string
  campusId: string
  level: string
  grade: string
  educationSystem?: string | null
  homeroomTeacherId?: string | null
  academicYearId?: string | null
  status?: string | null
}

export const WORKING_DAYS_DEFAULT: DayOfWeekCode[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
]

export const ALL_DAYS: DayOfWeekCode[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
]

export const DAY_LABELS: Record<string, string> = {
  MONDAY: "Thứ Hai",
  TUESDAY: "Thứ Ba",
  WEDNESDAY: "Thứ Tư",
  THURSDAY: "Thứ Năm",
  FRIDAY: "Thứ Sáu",
  SATURDAY: "Thứ Bảy",
  SUNDAY: "Chủ Nhật",
}

export const SHORT_DAY_LABELS: Record<string, string> = {
  MONDAY: "Thứ 2",
  TUESDAY: "Thứ 3",
  WEDNESDAY: "Thứ 4",
  THURSDAY: "Thứ 5",
  FRIDAY: "Thứ 6",
  SATURDAY: "Thứ 7",
  SUNDAY: "CN",
}

export const SCOPE_GROUP_LABELS: Record<ScopeGroup, string> = {
  TIEU_HOC: "Tiểu học",
  TRUNG_HOC: "Trung học (THCS & THPT)",
  HILL: "Sky-Line Hill (TH, THCS & THPT)",
  LIEN_CAP: "Liên cấp (Chế độ tra cứu tổng hợp)",
}

/**
 * Dynamically detects whether a Campus record corresponds to Sky-Line Hill
 * by inspecting code, name, and address from the database.
 * Never hardcodes Hill === "CS4".
 */
export function isHillCampus(campus?: CampusLike | null): boolean {
  if (!campus) return false
  return [campus.campusCode, campus.campusName, campus.address].some((v) =>
    String(v || "").toUpperCase().includes("HILL")
  )
}

export function formatCampusDisplayName(campus?: CampusLike | null): string {
  if (!campus) return "Chưa xác định"
  const code = (campus.campusCode || campus.campusName || "").trim()
  const name = (campus.campusName || "").trim()
  const addr = (campus.address || "").trim()
  if (addr && addr.toLowerCase() !== name.toLowerCase() && addr.toLowerCase() !== code.toLowerCase()) {
    return `${code || name} — ${addr}`
  }
  if (code && name && code.toLowerCase() !== name.toLowerCase()) {
    return `${code} — ${name}`
  }
  return name || code || campus.id
}

export function normalizeClassLevelCode(rawLevel?: string | null): "TH" | "THCS" | "THPT" | "MN" | "OTHER" {
  const v = String(rawLevel || "").trim().toUpperCase()
  if (v === "TIỂU HỌC" || v === "TIEU HOC" || v === "TIEU_HOC" || v === "TH" || v === "PRIMARY") {
    return "TH"
  }
  if (v === "THCS" || v === "TRUNG HỌC CƠ SỞ") return "THCS"
  if (v === "THPT" || v === "TRUNG HỌC PHỔ THÔNG") return "THPT"
  if (v.includes("MẦM NON") || v.includes("MAM NON") || v === "MN") return "MN"
  return "OTHER"
}

/**
 * Maps scopeGroup + optional levelCode filter to exact DB Class.level strings.
 * Never includes Preschool ("Mầm non") in K-12 timetable scopes, and never falls back outside scope.
 */
export function resolveDbLevelsForScope(
  scopeGroup: ScopeGroup,
  levelCode: LevelFilterCode = "ALL"
): string[] {
  const thVariants = ["Tiểu học", "TH", "TIEU_HOC"]
  const thcsVariants = ["THCS"]
  const thptVariants = ["THPT"]

  if (scopeGroup === "TIEU_HOC") {
    if (levelCode === "THCS" || levelCode === "THPT") return []
    return thVariants
  }

  if (scopeGroup === "TRUNG_HOC") {
    if (levelCode === "TH") return []
    if (levelCode === "THCS") return thcsVariants
    if (levelCode === "THPT") return thptVariants
    return [...thcsVariants, ...thptVariants]
  }

  // HILL or LIEN_CAP
  if (levelCode === "TH") return thVariants
  if (levelCode === "THCS") return thcsVariants
  if (levelCode === "THPT") return thptVariants
  return [...thVariants, ...thcsVariants, ...thptVariants]
}

export function getAllowedLevelOptionsForScope(
  scopeGroup: ScopeGroup,
  campusClasses: ClassLike[]
): Array<{ code: LevelFilterCode; label: string }> {
  const presentLevels = new Set(campusClasses.map((c) => normalizeClassLevelCode(c.level)))

  if (scopeGroup === "TIEU_HOC") {
    return presentLevels.has("TH") ? [{ code: "TH", label: "Tiểu học" }] : []
  }

  if (scopeGroup === "TRUNG_HOC") {
    const opts: Array<{ code: LevelFilterCode; label: string }> = []
    if (presentLevels.has("THCS") && presentLevels.has("THPT")) {
      opts.push({ code: "ALL", label: "Tất cả Trung học (THCS & THPT)" })
    }
    if (presentLevels.has("THCS")) opts.push({ code: "THCS", label: "THCS" })
    if (presentLevels.has("THPT")) opts.push({ code: "THPT", label: "THPT" })
    return opts
  }

  // HILL or LIEN_CAP
  const opts: Array<{ code: LevelFilterCode; label: string }> = [
    { code: "ALL", label: "Tất cả cấp học trong phạm vi" },
  ]
  if (presentLevels.has("TH")) opts.push({ code: "TH", label: "Tiểu học" })
  if (presentLevels.has("THCS")) opts.push({ code: "THCS", label: "THCS" })
  if (presentLevels.has("THPT")) opts.push({ code: "THPT", label: "THPT" })
  return opts
}

export interface ScopedCatalogResult {
  permittedCampuses: CampusLike[]
  validScopes: Array<{
    code: ScopeGroup
    label: string
    isLookupOnly: boolean
    campusIds: string[]
  }>
  campusesByScope: Record<ScopeGroup, CampusLike[]>
}

/**
 * Computes valid Sky-Line scopes and campuses strictly from DB truth + user permissions:
 * - TIEU_HOC: TH at non-Hill campuses that have active TH classes (CS1, CS2, CS3, CS5)
 * - TRUNG_HOC: THCS & THPT at non-Hill campuses that have active THCS/THPT classes (CS1, CS3, CS5)
 * - HILL: TH, THCS, THPT at Sky-Line Hill campus (dynamically matched via isHillCampus)
 * - LIEN_CAP: Lookup-only cross-level mode across permitted campuses
 */
export function getValidScopesAndCampuses(
  allCampuses: CampusLike[],
  allActiveClasses: ClassLike[],
  allowedCampusIds: string[],
  isFullAccess: boolean,
  includeLienCapLookup: boolean = false
): ScopedCatalogResult {
  const permittedCampuses = isFullAccess
    ? allCampuses
    : allCampuses.filter((c) => allowedCampusIds.includes(c.id))

  const permittedSet = new Set(permittedCampuses.map((c) => c.id))
  const classesByCampus = new Map<string, ClassLike[]>()
  for (const cls of allActiveClasses) {
    if (!permittedSet.has(cls.campusId)) continue
    const list = classesByCampus.get(cls.campusId) || []
    list.push(cls)
    classesByCampus.set(cls.campusId, list)
  }

  const tieuHocCampuses = permittedCampuses.filter((c) => {
    if (isHillCampus(c)) return false
    const cls = classesByCampus.get(c.id) || []
    return cls.some((item) => normalizeClassLevelCode(item.level) === "TH")
  })

  const trungHocCampuses = permittedCampuses.filter((c) => {
    if (isHillCampus(c)) return false
    const cls = classesByCampus.get(c.id) || []
    return cls.some((item) => {
      const lv = normalizeClassLevelCode(item.level)
      return lv === "THCS" || lv === "THPT"
    })
  })

  const hillCampuses = permittedCampuses.filter((c) => {
    if (!isHillCampus(c)) return false
    const cls = classesByCampus.get(c.id) || []
    if (cls.length === 0) return true
    return cls.some((item) => {
      const lv = normalizeClassLevelCode(item.level)
      return lv === "TH" || lv === "THCS" || lv === "THPT"
    })
  })

  const lienCapCampuses = permittedCampuses.filter((c) => {
    const cls = classesByCampus.get(c.id) || []
    return cls.some((item) => {
      const lv = normalizeClassLevelCode(item.level)
      return lv === "TH" || lv === "THCS" || lv === "THPT"
    })
  })

  const validScopes: ScopedCatalogResult["validScopes"] = []
  if (tieuHocCampuses.length > 0) {
    validScopes.push({
      code: "TIEU_HOC",
      label: SCOPE_GROUP_LABELS.TIEU_HOC,
      isLookupOnly: false,
      campusIds: tieuHocCampuses.map((c) => c.id),
    })
  }
  if (trungHocCampuses.length > 0) {
    validScopes.push({
      code: "TRUNG_HOC",
      label: SCOPE_GROUP_LABELS.TRUNG_HOC,
      isLookupOnly: false,
      campusIds: trungHocCampuses.map((c) => c.id),
    })
  }
  if (hillCampuses.length > 0) {
    validScopes.push({
      code: "HILL",
      label: SCOPE_GROUP_LABELS.HILL,
      isLookupOnly: false,
      campusIds: hillCampuses.map((c) => c.id),
    })
  }
  if (includeLienCapLookup && lienCapCampuses.length > 0) {
    validScopes.push({
      code: "LIEN_CAP",
      label: SCOPE_GROUP_LABELS.LIEN_CAP,
      isLookupOnly: true,
      campusIds: lienCapCampuses.map((c) => c.id),
    })
  }

  return {
    permittedCampuses,
    validScopes,
    campusesByScope: {
      TIEU_HOC: tieuHocCampuses,
      TRUNG_HOC: trungHocCampuses,
      HILL: hillCampuses,
      LIEN_CAP: lienCapCampuses,
    },
  }
}

export function doesClassBelongToScope(
  cls: ClassLike,
  campus: CampusLike | undefined,
  scopeGroup: ScopeGroup,
  levelCode: LevelFilterCode = "ALL"
): boolean {
  const normLevel = normalizeClassLevelCode(cls.level)
  if (normLevel !== "TH" && normLevel !== "THCS" && normLevel !== "THPT") {
    return false
  }
  if (levelCode !== "ALL" && normLevel !== levelCode) {
    return false
  }

  const hill = isHillCampus(campus)
  if (scopeGroup === "HILL") {
    return hill
  }
  if (scopeGroup === "TIEU_HOC") {
    return !hill && normLevel === "TH"
  }
  if (scopeGroup === "TRUNG_HOC") {
    return !hill && (normLevel === "THCS" || normLevel === "THPT")
  }
  if (scopeGroup === "LIEN_CAP") {
    return true
  }
  return false
}

export function inferScopeGroupForClass(
  cls: { level?: string | null },
  campus?: CampusLike | null
): ManageableScopeGroup | null {
  const normLevel = normalizeClassLevelCode(cls.level)
  if (normLevel !== "TH" && normLevel !== "THCS" && normLevel !== "THPT") {
    return null
  }
  if (isHillCampus(campus)) return "HILL"
  return normLevel === "TH" ? "TIEU_HOC" : "TRUNG_HOC"
}

export function mapEducationSystemToStudyProgram(educationSystem?: string | null): string {
  const code = String(educationSystem || "").trim().toUpperCase()
  if (code === "HNS" || code === "HE_S" || code === "HỆ S") return "Hệ S"
  if (
    code === "HNG" ||
    code === "HNC" ||
    code === "COMPASS" ||
    code === "HE_S_QUOC_TE" ||
    code === "HỆ S QUỐC TẾ"
  ) {
    return "Hệ S Quốc tế"
  }
  if (code === "SB" || code === "SONG_BANG" || code === "HỆ SONG BẰNG") {
    return "Hệ Song Bằng"
  }
  return "DEFAULT"
}

export function extractGradeNumber(gradeStr?: string | null, className?: string | null): number | null {
  const raw = String(gradeStr || "").trim()
  const directMatch = raw.match(/(\d{1,2})/)
  if (directMatch) {
    const n = Number(directMatch[1])
    if (n >= 1 && n <= 12) return n
  }
  const clsMatch = String(className || "").trim().match(/^(\d{1,2})/)
  if (clsMatch) {
    const n = Number(clsMatch[1])
    if (n >= 1 && n <= 12) return n
  }
  return null
}

export function normalizeGradeCode(gradeStr?: string | null, className?: string | null): string {
  const num = extractGradeNumber(gradeStr, className)
  return num ? `K${num}` : String(gradeStr || "K1").trim()
}

/**
 * Default bell schedule: 4 morning periods + 4 afternoon periods for both Tiểu học and Trung học.
 * Never auto-changes Trung học to 5 morning periods unless explicitly configured by user.
 */
export function buildDefaultPeriodTimes(
  scopeGroup: ScopeGroup = "TRUNG_HOC",
  morningCount: number = 4,
  afternoonCount: number = 4
): PeriodTimeDef[] {
  const isPrimary = scopeGroup === "TIEU_HOC"
  const mCount = Math.max(1, Math.min(6, morningCount || 4))
  const aCount = Math.max(0, Math.min(6, afternoonCount ?? 4))

  const primaryMorningBase = [
    ["07:45", "08:20"],
    ["08:25", "09:00"],
    ["09:20", "09:55"],
    ["10:00", "10:35"],
    ["10:40", "11:15"],
    ["11:20", "11:55"],
  ]
  const secondaryMorningBase = [
    ["07:30", "08:15"],
    ["08:20", "09:05"],
    ["09:25", "10:10"],
    ["10:15", "11:00"],
    ["11:05", "11:50"],
    ["11:55", "12:40"],
  ]
  const primaryAfternoonBase = [
    ["13:45", "14:20"],
    ["14:25", "15:00"],
    ["15:15", "15:50"],
    ["15:55", "16:30"],
    ["16:35", "17:10"],
    ["17:15", "17:50"],
  ]
  const secondaryAfternoonBase = [
    ["13:30", "14:15"],
    ["14:20", "15:05"],
    ["15:20", "16:05"],
    ["16:10", "16:55"],
    ["17:00", "17:45"],
    ["17:50", "18:35"],
  ]

  const mTemplate = isPrimary ? primaryMorningBase : secondaryMorningBase
  const aTemplate = isPrimary ? primaryAfternoonBase : secondaryAfternoonBase

  const result: PeriodTimeDef[] = []
  for (let i = 0; i < mCount; i++) {
    const [startTime, endTime] = mTemplate[i] || ["07:30", "08:15"]
    result.push({
      session: "MORNING",
      periodNumber: i + 1,
      label: `Sáng - Tiết ${i + 1}`,
      startTime,
      endTime,
    })
  }
  for (let i = 0; i < aCount; i++) {
    const [startTime, endTime] = aTemplate[i] || ["13:30", "14:15"]
    result.push({
      session: "AFTERNOON",
      periodNumber: i + 1,
      label: `Chiều - Tiết ${i + 1}`,
      startTime,
      endTime,
    })
  }
  return result
}

export function timeStringToMinutes(hhmm?: string | null): number | null {
  if (!hhmm) return null
  const m = String(hhmm).trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + min
}

function toUtcMidnightMs(isoDate: string): number | null {
  const m = String(isoDate || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function startOfIsoWeekMs(utcMs: number): number {
  const d = new Date(utcMs)
  const day = d.getUTCDay() // 0=Sun, 1=Mon...
  const diffToMonday = day === 0 ? -6 : 1 - day
  return utcMs + diffToMonday * 86_400_000
}

/**
 * Resolves EVEN / ODD week parity from a configured anchor date (Week 1 = ODD).
 */
export function resolveWeekParity(
  targetDateIso?: string | null,
  cycleAnchorDateIso?: string | null,
  cycleWeeks: number = 2
): "EVEN" | "ODD" | "ALL" {
  if (!cycleWeeks || cycleWeeks <= 1) return "ALL"
  if (!targetDateIso || !cycleAnchorDateIso) return "ALL"
  const targetMs = toUtcMidnightMs(targetDateIso)
  const anchorMs = toUtcMidnightMs(cycleAnchorDateIso)
  if (targetMs === null || anchorMs === null) return "ALL"

  const targetMonday = startOfIsoWeekMs(targetMs)
  const anchorMonday = startOfIsoWeekMs(anchorMs)
  const weekDiff = Math.floor((targetMonday - anchorMonday) / (7 * 86_400_000))
  const weekIndex1Based = (((weekDiff % cycleWeeks) + cycleWeeks) % cycleWeeks) + 1
  return weekIndex1Based % 2 === 1 ? "ODD" : "EVEN"
}

export function dateIsoToDayOfWeek(dateIso: string): DayOfWeekCode | "SUNDAY" | null {
  const ms = toUtcMidnightMs(dateIso)
  if (ms === null) return null
  const day = new Date(ms).getUTCDay()
  const map: Array<DayOfWeekCode | "SUNDAY"> = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ]
  return map[day] || null
}

export function getDatesOfWeek(referenceDateIso: string): Record<DayOfWeekCode, string> {
  const ms = toUtcMidnightMs(referenceDateIso) ?? Date.now()
  const mondayMs = startOfIsoWeekMs(ms)
  const format = (t: number) => new Date(t).toISOString().slice(0, 10)
  return {
    MONDAY: format(mondayMs),
    TUESDAY: format(mondayMs + 1 * 86_400_000),
    WEDNESDAY: format(mondayMs + 2 * 86_400_000),
    THURSDAY: format(mondayMs + 3 * 86_400_000),
    FRIDAY: format(mondayMs + 4 * 86_400_000),
    SATURDAY: format(mondayMs + 5 * 86_400_000),
  }
}

export function isDateWithinRange(
  targetDateIso: string,
  effectiveFrom?: string | null,
  effectiveTo?: string | null
): boolean {
  const d = targetDateIso.slice(0, 10)
  if (effectiveFrom && d < effectiveFrom.slice(0, 10)) return false
  if (effectiveTo && d > effectiveTo.slice(0, 10)) return false
  return true
}

export function doDateRangesOverlap(
  aFrom?: string | null,
  aTo?: string | null,
  bFrom?: string | null,
  bTo?: string | null
): boolean {
  const startA = aFrom ? aFrom.slice(0, 10) : "0000-01-01"
  const endA = aTo ? aTo.slice(0, 10) : "9999-12-31"
  const startB = bFrom ? bFrom.slice(0, 10) : "0000-01-01"
  const endB = bTo ? bTo.slice(0, 10) : "9999-12-31"
  return startA <= endB && startB <= endA
}
