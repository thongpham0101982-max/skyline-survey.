import { LevelFilterCode, ScoreDistributionBucket } from "./types"

export const SCORE_BUCKET_DEFS = [
  { id: "LT_5", label: "< 5,0", min: 0, max: 5, inclusiveMax: false },
  { id: "5_65", label: "5,0 – < 6,5", min: 5, max: 6.5, inclusiveMax: false },
  { id: "65_8", label: "6,5 – < 8,0", min: 6.5, max: 8, inclusiveMax: false },
  { id: "8_9", label: "8,0 – < 9,0", min: 8, max: 9, inclusiveMax: false },
  { id: "9_10", label: "9,0 – 10", min: 9, max: 10, inclusiveMax: true },
] as const

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * Pure statistical computation for a list of valid numeric scores.
 * Score 0 is strictly treated as a valid score and included in all calculations.
 */
export function computeScoreStats(scores: number[]) {
  const valid = scores.filter((s) => typeof s === "number" && Number.isFinite(s) && s >= 0)
  const n = valid.length
  if (n === 0) {
    return {
      validCount: 0,
      average: null as number | null,
      median: null as number | null,
      mode: null as number | null,
      stdDev: null as number | null,
      countGte7: 0,
      rateGte7: null as number | null,
      count10: 0,
      below5Count: 0,
      below5Rate: null as number | null,
    }
  }

  const sorted = [...valid].sort((a, b) => a - b)
  const sum = sorted.reduce((acc, v) => acc + v, 0)
  const average = round2(sum / n)

  const mid = Math.floor(n / 2)
  const median =
    n % 2 === 1 ? round2(sorted[mid]) : round2((sorted[mid - 1] + sorted[mid]) / 2)

  // Mode (most frequent rounded to 1 decimal place; tie-break by highest score)
  const freq = new Map<number, number>()
  for (const s of sorted) {
    const key = Math.round(s * 10) / 10
    freq.set(key, (freq.get(key) || 0) + 1)
  }
  let mode: number | null = null
  let maxFreq = 0
  for (const [val, count] of freq.entries()) {
    if (count > maxFreq || (count === maxFreq && (mode === null || val > mode))) {
      maxFreq = count
      mode = val
    }
  }

  // Population standard deviation
  const variance = sorted.reduce((acc, v) => acc + Math.pow(v - sum / n, 2), 0) / n
  const stdDev = round2(Math.sqrt(variance))

  const countGte7 = sorted.filter((v) => v >= 7.0).length
  const rateGte7 = round1((countGte7 / n) * 100)
  const count10 = sorted.filter((v) => Math.abs(v - 10) < 1e-6).length
  const below5Count = sorted.filter((v) => v < 5.0).length
  const below5Rate = round1((below5Count / n) * 100)

  return {
    validCount: n,
    average,
    median,
    mode,
    stdDev,
    countGte7,
    rateGte7,
    count10,
    below5Count,
    below5Rate,
  }
}

export function buildScoreDistributionBuckets(
  classScores: number[],
  campusGradeScores: number[],
  systemGradeScores: number[]
): ScoreDistributionBucket[] {
  const countInBucket = (arr: number[], min: number, max: number, inclusiveMax: boolean) => {
    return arr.filter((v) => {
      if (!Number.isFinite(v) || v < 0) return false
      if (inclusiveMax) return v >= min && v <= max
      return v >= min && v < max
    }).length
  }

  const classTotal = classScores.length
  const campusTotal = campusGradeScores.length
  const systemTotal = systemGradeScores.length

  return SCORE_BUCKET_DEFS.map((b) => {
    const classCount = countInBucket(classScores, b.min, b.max, b.inclusiveMax)
    const campusGradeCount = countInBucket(campusGradeScores, b.min, b.max, b.inclusiveMax)
    const systemGradeCount = countInBucket(systemGradeScores, b.min, b.max, b.inclusiveMax)
    return {
      bucketId: b.id,
      label: b.label,
      min: b.min,
      max: b.max,
      classCount,
      classPct: classTotal > 0 ? round1((classCount / classTotal) * 100) : 0,
      campusGradeCount,
      campusGradePct: campusTotal > 0 ? round1((campusGradeCount / campusTotal) * 100) : 0,
      systemGradeCount,
      systemGradePct: systemTotal > 0 ? round1((systemGradeCount / systemTotal) * 100) : 0,
    }
  })
}

export function computeDiffPp(localRate: number | null, systemRate: number | null): number | null {
  if (localRate === null || systemRate === null) return null
  return round1(localRate - systemRate)
}

export function stripVietnamese(raw: string | null | undefined): string {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "D")
    .toUpperCase()
    .trim()
}

export function normalizeEducationLevel(rawLevel?: string | null, rawGrade?: string | null): Exclude<LevelFilterCode, "ALL"> {
  const lvl = stripVietnamese(rawLevel)

  if (lvl.includes("MAM") || lvl.includes("PRESCHOOL") || lvl === "MN") return "MAM_NON"
  if (lvl.includes("THPT") || lvl.includes("HIGH")) return "THPT"
  if (lvl.includes("THCS") || lvl.includes("SECONDARY") || lvl.includes("MIDDLE")) return "THCS"
  if (lvl.includes("TIEU") || lvl.includes("PRIMARY")) return "TIEU_HOC"

  const gradeNum = parseInt(String(rawGrade || "").replace(/\D/g, ""), 10)
  if (!Number.isNaN(gradeNum)) {
    if (gradeNum >= 10) return "THPT"
    if (gradeNum >= 6) return "THCS"
    if (gradeNum >= 1) return "TIEU_HOC"
  }
  return "TIEU_HOC"
}

export function matchesLevelFilter(
  rawLevel: string | null | undefined,
  rawGrade: string | null | undefined,
  filterLevel?: string | null
): boolean {
  if (!filterLevel || filterLevel === "ALL") return true
  return normalizeEducationLevel(rawLevel, rawGrade) === filterLevel
}

/**
 * Detects whether a StudentTransfer record represents an internal Sky-Line inter-campus transfer.
 * Checks paired IN/OUT records for the same studentCode within 30 days OR destinationSchool mentioning Sky-Line / CS1..CS5.
 */
export function isInternalSkylineTransfer(
  destinationSchool: string | null | undefined,
  reason: string | null | undefined,
  hasPairedCampusTransfer: boolean
): boolean {
  if (hasPairedCampusTransfer) return true
  const hay = stripVietnamese(`${destinationSchool || ""} ${reason || ""}`)
  if (
    hay.includes("SKY-LINE") ||
    hay.includes("SKYLINE") ||
    hay.includes("NOI BO") ||
    hay.includes("CHUYEN CO SO") ||
    /\bCS[1-5]\b/.test(hay)
  ) {
    return true
  }
  return false
}

/**
 * Computes the next review date for a LearningSupportTarget based on latest evaluation or startDate.
 */
export function computeNextReviewDate(
  startDate: Date,
  latestEvalDate: Date | null,
  latestPeriodType?: string | null
): Date {
  const base = latestEvalDate ? new Date(latestEvalDate) : new Date(startDate)
  const days = String(latestPeriodType || "").toUpperCase() === "WEEK" ? 7 : 30
  const next = new Date(base.getTime())
  next.setDate(next.getDate() + days)
  return next
}

export function isDateInMonth(date: Date | null | undefined, monthKey: string): boolean {
  if (!date || Number.isNaN(date.getTime())) return false
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}` === monthKey
}

export function toMonthKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-")
  if (!y || !m) return monthKey
  return `Tháng ${m}/${y}`
}

export function formatShortMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-")
  if (!y || !m) return monthKey
  return `${m}/${y}`
}

export function normalizePsychologyOutcome(
  outcome?: string | null,
  trackingLevel?: string | null,
  terminationStatus?: string | null
): { code: string; label: string; isGoalAchieved: boolean } {
  if (terminationStatus === "TERMINATED") {
    return { code: "GOAL_ACHIEVED", label: "Đã đạt mục tiêu", isGoalAchieved: true }
  }
  const raw = stripVietnamese(`${outcome || ""} ${trackingLevel || ""}`)

  if (
    raw.includes("DAT MUC TIEU") ||
    raw.includes("HOAN THANH") ||
    raw.includes("KET THUC") ||
    raw.includes("ACHIEVED")
  ) {
    return { code: "GOAL_ACHIEVED", label: "Đã đạt mục tiêu", isGoalAchieved: true }
  }
  if (raw.includes("DIEU CHINH") || raw.includes("ADJUST") || raw.includes("CHUYEN TUYEN")) {
    return { code: "ADJUST_PLAN", label: "Cần điều chỉnh phương án", isGoalAchieved: false }
  }
  if (raw.includes("TIEN TRIEN") || raw.includes("TOT") || raw.includes("PROGRESS")) {
    return { code: "PROGRESSING", label: "Có tiến triển", isGoalAchieved: false }
  }
  return { code: "CONTINUE_SUPPORT", label: "Cần tiếp tục hỗ trợ", isGoalAchieved: false }
}

export function isApprovedAdmissionPass(admissionResult?: string | null): {
  isPassed: boolean
  isCommitted: boolean
  isPending: boolean
} {
  const res = String(admissionResult || "").trim()
  const norm = stripVietnamese(res)

  if (!res || norm === "PENDING" || norm.includes("CHO DUYET") || norm.includes("CHO XET")) {
    return { isPassed: false, isCommitted: false, isPending: true }
  }
  if (norm.includes("KHONG DAT") || norm.includes("CHUA DAT") || norm.includes("TU CHOI")) {
    return { isPassed: false, isCommitted: false, isPending: false }
  }
  if (norm.includes("MIEN HOC THU")) {
    return { isPassed: true, isCommitted: false, isPending: false }
  }
  if (norm.includes("CAM KET") || norm.includes("HOC THU")) {
    return { isPassed: true, isCommitted: true, isPending: false }
  }
  if (norm.includes("DAT") || norm.includes("TRUNG TUYEN") || norm.includes("PASSED")) {
    return { isPassed: true, isCommitted: false, isPending: false }
  }
  if (norm.includes("KHAO SAT LAI") || norm.includes("THI LAI")) {
    return { isPassed: false, isCommitted: false, isPending: true }
  }
  return { isPassed: false, isCommitted: false, isPending: true }
}

export function isConfirmedEnrollment(
  enrollmentStatus?: string | null,
  enrollmentClassId?: string | null,
  enrollmentDate?: Date | null
): boolean {
  if (enrollmentClassId) return true
  const st = stripVietnamese(enrollmentStatus)
  if (
    st === "ENROLLED" ||
    st === "CONFIRMED" ||
    st === "DA_NHAP_HOC" ||
    st.includes("DA NHAP HOC") ||
    st.includes("NHAP HOC")
  ) {
    return true
  }
  return Boolean(enrollmentDate && st !== "CANCELLED" && st !== "HUY")
}
