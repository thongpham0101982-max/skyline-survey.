// @ts-nocheck
import crypto from "crypto"
import { prisma } from "@/lib/db"
import {
  extractGradeNumber,
  getPrimaryPeriodMeta,
  getSubjectCurriculumGroup,
  isPrimaryGrade,
  isPrimarySubjectForGrade,
  isSecondarySubjectForGrade,
  isTt22CommentOnlySubject,
  normalizeGradeColumnDefs,
  shouldPrimarySubjectHaveKtColumn,
} from "@/lib/grading/vnedu-config-types"
import { roundScore, RoundingRule } from "@/lib/grading/formula-calculator"
import { ThkqAccessScope } from "./thkqPermissions"

export type ThkqRateMode = "VNEDU_RECONCILE" | "SSM_ANALYSIS"
export type ThkqGroupByMode = "GRADE_CLASS" | "CAMPUS_GRADE_CLASS"
export type ThkqScoreScaleMode = "AUTO" | "INTEGER" | "DECIMAL"

export interface ThkqPeriodicFilterInput {
  academicYearId: string
  level: string // "TIEU_HOC" | "THCS" | "THPT" | "ALL"
  evaluationPeriod: string // "GK1" | "CK1" | "GK2" | "CK2" | "KSĐN" | "HK1" | "HK2" | "CN"
  subjectId: string // required for running periodic report (or specific subjectId)
  testColumnKey?: string // "OFFICIAL" or specific column key e.g. "col0", "gk", "ck", "composite", "VNEDU::col0", "INTERNAL::composite"
  campusId?: string // "ALL" or campus.id
  educationSystem?: string // "ALL" | "HE_S" | "HE_I" | "HE_UK" | "HE_A"
  grade?: string // "ALL" or "1".."12" / "Khối 1".."Khối 12"
  classId?: string // "ALL" or class.id
  ethnicity?: string // "ALL" or specific ethnicity
  groupBy?: ThkqGroupByMode
  rateMode?: ThkqRateMode
  scoreScaleMode?: ThkqScoreScaleMode
  includeZeroScore?: boolean
  thresholdScore?: number // Default 5.0
}

export interface ScoreBucketDef {
  id: string
  label: string
  shortLabel: string
  group: "ABOVE_THRESHOLD" | "BELOW_THRESHOLD"
  minInclusive: number
  maxExclusive: number | null // null when exact max (e.g. 10)
  exactValue?: number | null
}

export interface BucketCellStats {
  bucketId: string
  sl: number
  female: number
  tl: number | null
  tlDisplay: string
  tlFemaleKt: number | null
  tlFemaleKtDisplay: string
}

export interface GroupSummaryCellStats {
  sl: number
  female: number
  tl: number | null
  tlDisplay: string
  tlFemaleKt: number | null
  tlFemaleKtDisplay: string
}

export interface PeriodicReportRow {
  rowKey: string
  rowType: "TOTAL" | "CAMPUS" | "GRADE" | "CLASS"
  stt?: number | null
  label: string
  classId?: string
  className?: string
  classDisplayCode?: string
  campusId?: string
  campusCode?: string
  campusName?: string
  level?: "TIEU_HOC" | "THCS" | "THPT"
  grade?: string
  gradeNumber?: number
  gradeLabel?: string
  educationSystemCode?: string
  educationSystemLabel?: string
  homeroomTeacherName?: string
  subjectTeacherName?: string

  // Roster & testing counts
  tshs: number
  totalFemale: number
  tshsKt: number
  femaleKt: number
  tshsKtRatioLabel: string

  // Progress breakdown
  eligibleCount: number
  testedCount: number
  absentOrMakeupCount: number
  missingScoreCount: number
  exemptCount: number
  missingGenderCount: number
  hasClassNoScoresWarning: boolean

  // Score distribution
  buckets: Record<string, BucketCellStats>
  aboveThreshold: GroupSummaryCellStats
  belowThreshold: GroupSummaryCellStats

  // Extended SSM & Sky-Line quality indicators
  avgScore: number | null
  stdDev: number | null
  skylineBenchmark: number
  aboveSkylineCount: number
  aboveSkylineRate: number | null
  aboveSkylineRateDisplay: string
  score8To10Count: number
  score8To10Rate: number | null
  score8To10RateDisplay: string
}

export interface StudentReconciledItem {
  studentId: string
  studentCode: string
  vnEduCode?: string | null
  studentName: string
  dateOfBirth?: string | null
  genderRaw?: string | null
  isFemale: boolean
  isMissingGender: boolean
  ethnicity: string
  classId: string
  className: string
  classDisplayCode: string
  campusId: string
  campusCode: string
  campusName: string
  level: "TIEU_HOC" | "THCS" | "THPT"
  gradeNumber: number
  gradeLabel: string
  educationSystemCode: string
  educationSystemLabel: string
  statusInTest: "VALID_SCORE" | "ABSENT_MAKEUP" | "EXEMPT" | "MISSING_SCORE" | "OUT_OF_RANGE"
  officialScore: number | null
  rawScoreText: string
  bucketId: string | null
  isAboveThreshold: boolean
  isAboveSkyline: boolean
  skylineBenchmark: number
  sourceType: string
  configType: string
  remark?: string
  updatedAt?: string | null
}

/**
 * Helper nhận diện giới tính Nữ từ hồ sơ học sinh
 */
export function isFemaleGender(genderRaw?: string | null): boolean {
  const g = String(genderRaw || "").trim().toLowerCase()
  return g === "nữ" || g === "nu" || g === "female" || g === "f" || g === "nư"
}

export function isMaleGender(genderRaw?: string | null): boolean {
  const g = String(genderRaw || "").trim().toLowerCase()
  return g === "nam" || g === "male" || g === "m"
}

export function isMissingGender(genderRaw?: string | null): boolean {
  const g = String(genderRaw || "").trim()
  if (!g) return true
  return !isFemaleGender(g) && !isMaleGender(g)
}

/**
 * Định dạng tỷ lệ % với 2 chữ số thập phân:
 * - Mẫu số = 0 -> "—" (rate = null)
 * - Mẫu số > 0 và tử số = 0 -> "0.00%" (rate = 0)
 */
export function calculateRateValue(
  numerator: number,
  denominator: number
): { rate: number | null; display: string } {
  if (!denominator || denominator <= 0) {
    return { rate: null, display: "—" }
  }
  if (!numerator || numerator <= 0) {
    return { rate: 0, display: "0.00%" }
  }
  const raw = (numerator / denominator) * 100
  const rounded = Math.round((raw + Number.EPSILON) * 100) / 100
  return {
    rate: rounded,
    display: `${rounded.toFixed(2)}%`,
  }
}

/**
 * Chuẩn hóa cấp học từ khối hoặc chuỗi level
 */
export function resolveEducationLevel(
  levelRaw?: string | null,
  gradeRaw?: string | null,
  classNameRaw?: string | null
): "TIEU_HOC" | "THCS" | "THPT" {
  const gNum = extractGradeNumber(gradeRaw || classNameRaw)
  if (gNum !== null) {
    if (gNum >= 1 && gNum <= 5) return "TIEU_HOC"
    if (gNum >= 6 && gNum <= 9) return "THCS"
    if (gNum >= 10 && gNum <= 12) return "THPT"
  }
  const s = String(levelRaw || "").toLowerCase()
  if (s.includes("tiểu") || s.includes("tieu") || s.includes("primary")) return "TIEU_HOC"
  if (s.includes("thpt") || s.includes("phổ thông") || s.includes("high")) return "THPT"
  return "THCS"
}

/**
 * Phân loại Hệ học Sky-Line từ Class.educationSystem và tên lớp
 */
export function classifyEducationSystem(
  educationSystemRaw?: string | null,
  classNameRaw?: string | null
): { code: "HE_S" | "HE_I" | "HE_UK" | "HE_A"; label: string; shortLabel: string } {
  const sys = String(educationSystemRaw || "").toUpperCase().trim()
  const cName = String(classNameRaw || "").toUpperCase().trim()
  const combined = `${sys} ${cName}`

  if (combined.includes("UK") || /\d+UK/i.test(cName)) {
    return {
      code: "HE_UK",
      label: "Hệ UK (Quốc tế Anh)",
      shortLabel: "Hệ UK",
    }
  }

  if (
    combined.includes("INT") ||
    combined.includes("CAMBRIDGE") ||
    combined.includes("QUỐC TẾ") ||
    combined.includes("QUOC TE") ||
    combined.includes("HE_I") ||
    combined.includes("HỆ I") ||
    /^\d+(\/\d+)?I(_|$)/i.test(cName)
  ) {
    return {
      code: "HE_I",
      label: "Hệ I (Song ngữ / Quốc tế)",
      shortLabel: "Hệ I",
    }
  }

  if (combined.includes("HE_A") || combined.includes("HỆ A") || /^\d+(\/\d+)?A(_|$)/i.test(cName)) {
    return {
      code: "HE_A",
      label: "Hệ A (Tăng cường)",
      shortLabel: "Hệ A",
    }
  }

  return {
    code: "HE_S",
    label: "Hệ S (Chất lượng cao / Hội nhập)",
    shortLabel: "Hệ S",
  }
}

/**
 * Hiển thị tên lớp kèm mã cơ sở chuẩn đối soát vnEdu (VD: 4/2_CS1, 4UK_CS3)
 */
export function formatClassDisplayWithCampus(
  className?: string | null,
  campusCode?: string | null
): string {
  const cleanName = String(className || "").trim()
  const cleanCampus = String(campusCode || "").trim().toUpperCase()
  if (!cleanName) return cleanCampus || "Lớp"
  if (!cleanCampus) return cleanName

  const upperName = cleanName.toUpperCase()
  if (
    upperName.endsWith(`_${cleanCampus}`) ||
    upperName.endsWith(`-${cleanCampus}`) ||
    upperName.includes(`_CS`)
  ) {
    return cleanName
  }
  return `${cleanName}_${cleanCampus}`
}

/**
 * Xây dựng danh sách các cột mức điểm (Điểm nguyên 10..1/0 hoặc Khoảng điểm thập phân [0,1)..[9,10), 10)
 */
export function buildScoreBuckets(options: {
  scoreScaleMode: "INTEGER" | "DECIMAL"
  includeZeroScore: boolean
  thresholdScore?: number
}): ScoreBucketDef[] {
  const { scoreScaleMode, includeZeroScore } = options

  if (scoreScaleMode === "DECIMAL") {
    return [
      // Nhóm >= 5
      {
        id: "DEC_10",
        label: "Điểm 10",
        shortLabel: "10",
        group: "ABOVE_THRESHOLD",
        minInclusive: 10,
        maxExclusive: null,
        exactValue: 10,
      },
      {
        id: "DEC_9_10",
        label: "[9, 10)",
        shortLabel: "[9,10)",
        group: "ABOVE_THRESHOLD",
        minInclusive: 9,
        maxExclusive: 10,
      },
      {
        id: "DEC_8_9",
        label: "[8, 9)",
        shortLabel: "[8,9)",
        group: "ABOVE_THRESHOLD",
        minInclusive: 8,
        maxExclusive: 9,
      },
      {
        id: "DEC_7_8",
        label: "[7, 8)",
        shortLabel: "[7,8)",
        group: "ABOVE_THRESHOLD",
        minInclusive: 7,
        maxExclusive: 8,
      },
      {
        id: "DEC_6_7",
        label: "[6, 7)",
        shortLabel: "[6,7)",
        group: "ABOVE_THRESHOLD",
        minInclusive: 6,
        maxExclusive: 7,
      },
      {
        id: "DEC_5_6",
        label: "[5, 6)",
        shortLabel: "[5,6)",
        group: "ABOVE_THRESHOLD",
        minInclusive: 5,
        maxExclusive: 6,
      },
      // Nhóm < 5
      {
        id: "DEC_4_5",
        label: "[4, 5)",
        shortLabel: "[4,5)",
        group: "BELOW_THRESHOLD",
        minInclusive: 4,
        maxExclusive: 5,
      },
      {
        id: "DEC_3_4",
        label: "[3, 4)",
        shortLabel: "[3,4)",
        group: "BELOW_THRESHOLD",
        minInclusive: 3,
        maxExclusive: 4,
      },
      {
        id: "DEC_2_3",
        label: "[2, 3)",
        shortLabel: "[2,3)",
        group: "BELOW_THRESHOLD",
        minInclusive: 2,
        maxExclusive: 3,
      },
      {
        id: "DEC_1_2",
        label: "[1, 2)",
        shortLabel: "[1,2)",
        group: "BELOW_THRESHOLD",
        minInclusive: 1,
        maxExclusive: 2,
      },
      {
        id: "DEC_0_1",
        label: "[0, 1)",
        shortLabel: "[0,1)",
        group: "BELOW_THRESHOLD",
        minInclusive: 0,
        maxExclusive: 1,
      },
    ]
  }

  // Chế độ Điểm nguyên (INTEGER - chuẩn mẫu vnEdu Tiểu học: Điểm 10..Điểm 5 và Điểm 4..Điểm 1 [+ Điểm 0])
  const buckets: ScoreBucketDef[] = [
    {
      id: "INT_10",
      label: "Điểm 10",
      shortLabel: "10",
      group: "ABOVE_THRESHOLD",
      minInclusive: 10,
      maxExclusive: null,
      exactValue: 10,
    },
    {
      id: "INT_9",
      label: "Điểm 9",
      shortLabel: "9",
      group: "ABOVE_THRESHOLD",
      minInclusive: 9,
      maxExclusive: 10,
      exactValue: 9,
    },
    {
      id: "INT_8",
      label: "Điểm 8",
      shortLabel: "8",
      group: "ABOVE_THRESHOLD",
      minInclusive: 8,
      maxExclusive: 9,
      exactValue: 8,
    },
    {
      id: "INT_7",
      label: "Điểm 7",
      shortLabel: "7",
      group: "ABOVE_THRESHOLD",
      minInclusive: 7,
      maxExclusive: 8,
      exactValue: 7,
    },
    {
      id: "INT_6",
      label: "Điểm 6",
      shortLabel: "6",
      group: "ABOVE_THRESHOLD",
      minInclusive: 6,
      maxExclusive: 7,
      exactValue: 6,
    },
    {
      id: "INT_5",
      label: "Điểm 5",
      shortLabel: "5",
      group: "ABOVE_THRESHOLD",
      minInclusive: 5,
      maxExclusive: 6,
      exactValue: 5,
    },
    {
      id: "INT_4",
      label: "Điểm 4",
      shortLabel: "4",
      group: "BELOW_THRESHOLD",
      minInclusive: 4,
      maxExclusive: 5,
      exactValue: 4,
    },
    {
      id: "INT_3",
      label: "Điểm 3",
      shortLabel: "3",
      group: "BELOW_THRESHOLD",
      minInclusive: 3,
      maxExclusive: 4,
      exactValue: 3,
    },
    {
      id: "INT_2",
      label: "Điểm 2",
      shortLabel: "2",
      group: "BELOW_THRESHOLD",
      minInclusive: 2,
      maxExclusive: 3,
      exactValue: 2,
    },
    {
      id: "INT_1",
      label: "Điểm 1",
      shortLabel: "1",
      group: "BELOW_THRESHOLD",
      minInclusive: 1,
      maxExclusive: 2,
      exactValue: 1,
    },
  ]

  if (includeZeroScore) {
    buckets.push({
      id: "INT_0",
      label: "Điểm 0",
      shortLabel: "0",
      group: "BELOW_THRESHOLD",
      minInclusive: 0,
      maxExclusive: 1,
      exactValue: 0,
    })
  }

  return buckets
}

/**
 * Xác định bucket cho một điểm hợp lệ [0, 10]
 */
export function resolveScoreBucketId(
  score: number,
  buckets: ScoreBucketDef[]
): string | null {
  if (score === null || score === undefined || isNaN(score) || score < 0 || score > 10) {
    return null
  }
  const eps = 1e-9
  for (const b of buckets) {
    if (b.maxExclusive === null) {
      if (Math.abs(score - b.minInclusive) <= eps || score >= b.minInclusive - eps) {
        return b.id
      }
    } else {
      if (score + eps >= b.minInclusive && score < b.maxExclusive - eps) {
        return b.id
      }
    }
  }
  // Nếu điểm = 0 mà danh sách buckets chưa bật INT_0
  if (score >= 0 && score < 1) {
    const zeroBucket = buckets.find((b) => b.minInclusive === 0)
    if (zeroBucket) return zeroBucket.id
  }
  return null
}

/**
 * Tính toán thống kê cho 1 dòng (Lớp / Khối / Cơ sở / Tổng cộng) từ danh sách học sinh thuộc dòng đó
 */
export function computePeriodicRowStats(params: {
  rowKey: string
  rowType: "TOTAL" | "CAMPUS" | "GRADE" | "CLASS"
  stt?: number | null
  label: string
  meta?: Partial<PeriodicReportRow>
  students: StudentReconciledItem[]
  buckets: ScoreBucketDef[]
  rateMode: ThkqRateMode
  thresholdScore?: number
  defaultSkylineBenchmark?: number
  hasClassNoScoresWarning?: boolean
}): PeriodicReportRow {
  const {
    rowKey,
    rowType,
    stt = null,
    label,
    meta = {},
    students,
    buckets,
    rateMode,
    thresholdScore = 5.0,
    defaultSkylineBenchmark = 6.0,
  } = params

  const tshs = students.length
  let totalFemale = 0
  let tshsKt = 0
  let femaleKt = 0
  let eligibleCount = 0
  let absentOrMakeupCount = 0
  let missingScoreCount = 0
  let exemptCount = 0
  let missingGenderCount = 0

  let aboveSkylineCount = 0
  let score8To10Count = 0
  const validScores: number[] = []

  const bucketCounts = new Map<string, { sl: number; female: number }>()
  buckets.forEach((b) => bucketCounts.set(b.id, { sl: 0, female: 0 }))

  for (const st of students) {
    if (st.isFemale) totalFemale++
    if (st.isMissingGender) missingGenderCount++

    if (st.statusInTest === "EXEMPT") {
      exemptCount++
      continue
    }

    eligibleCount++

    if (st.statusInTest === "ABSENT_MAKEUP") {
      absentOrMakeupCount++
      continue
    }

    if (st.statusInTest === "VALID_SCORE" && st.officialScore !== null && !isNaN(st.officialScore)) {
      tshsKt++
      if (st.isFemale) femaleKt++
      validScores.push(st.officialScore)

      if (st.isAboveSkyline) aboveSkylineCount++
      if (st.officialScore >= 8.0 - 1e-9) score8To10Count++

      const bId = st.bucketId || resolveScoreBucketId(st.officialScore, buckets)
      if (bId && bucketCounts.has(bId)) {
        const cur = bucketCounts.get(bId)!
        cur.sl++
        if (st.isFemale) cur.female++
      }
    } else if (st.statusInTest === "MISSING_SCORE") {
      missingScoreCount++
    }
  }

  const bucketStatsRecord: Record<string, BucketCellStats> = {}
  let aboveSl = 0
  let aboveFemale = 0
  let belowSl = 0
  let belowFemale = 0

  for (const b of buckets) {
    const counts = bucketCounts.get(b.id) || { sl: 0, female: 0 }
    if (b.group === "ABOVE_THRESHOLD") {
      aboveSl += counts.sl
      aboveFemale += counts.female
    } else {
      belowSl += counts.sl
      belowFemale += counts.female
    }

    const primaryRate =
      rateMode === "VNEDU_RECONCILE"
        ? calculateRateValue(counts.female, tshs)
        : calculateRateValue(counts.sl, tshsKt)

    const femaleKtRate = calculateRateValue(counts.female, femaleKt)

    bucketStatsRecord[b.id] = {
      bucketId: b.id,
      sl: counts.sl,
      female: counts.female,
      tl: primaryRate.rate,
      tlDisplay: primaryRate.display,
      tlFemaleKt: femaleKtRate.rate,
      tlFemaleKtDisplay: femaleKtRate.display,
    }
  }

  const abovePrimaryRate =
    rateMode === "VNEDU_RECONCILE"
      ? calculateRateValue(aboveFemale, tshs)
      : calculateRateValue(aboveSl, tshsKt)
  const aboveFemaleKtRate = calculateRateValue(aboveFemale, femaleKt)

  const belowPrimaryRate =
    rateMode === "VNEDU_RECONCILE"
      ? calculateRateValue(belowFemale, tshs)
      : calculateRateValue(belowSl, tshsKt)
  const belowFemaleKtRate = calculateRateValue(belowFemale, femaleKt)

  let avgScore: number | null = null
  let stdDev: number | null = null
  if (validScores.length > 0) {
    const mean = validScores.reduce((a, b) => a + b, 0) / validScores.length
    avgScore = Math.round((mean + Number.EPSILON) * 100) / 100
    if (validScores.length > 1) {
      const variance =
        validScores.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (validScores.length - 1)
      stdDev = Math.round((Math.sqrt(variance) + Number.EPSILON) * 100) / 100
    } else {
      stdDev = 0
    }
  }

  const skylineRateObj = calculateRateValue(aboveSkylineCount, tshsKt)
  const rate8To10Obj = calculateRateValue(score8To10Count, tshsKt)

  return {
    rowKey,
    rowType,
    stt,
    label,
    ...meta,
    tshs,
    totalFemale,
    tshsKt,
    femaleKt,
    tshsKtRatioLabel: `${tshsKt}/${femaleKt}`,
    eligibleCount,
    testedCount: tshsKt,
    absentOrMakeupCount,
    missingScoreCount,
    exemptCount,
    missingGenderCount,
    hasClassNoScoresWarning:
      params.hasClassNoScoresWarning !== undefined
        ? params.hasClassNoScoresWarning
        : rowType === "CLASS" && tshs > 0 && tshsKt === 0,
    buckets: bucketStatsRecord,
    aboveThreshold: {
      sl: aboveSl,
      female: aboveFemale,
      tl: abovePrimaryRate.rate,
      tlDisplay: abovePrimaryRate.display,
      tlFemaleKt: aboveFemaleKtRate.rate,
      tlFemaleKtDisplay: aboveFemaleKtRate.display,
    },
    belowThreshold: {
      sl: belowSl,
      female: belowFemale,
      tl: belowPrimaryRate.rate,
      tlDisplay: belowPrimaryRate.display,
      tlFemaleKt: belowFemaleKtRate.rate,
      tlFemaleKtDisplay: belowFemaleKtRate.display,
    },
    avgScore,
    stdDev,
    skylineBenchmark: meta.skylineBenchmark ?? defaultSkylineBenchmark,
    aboveSkylineCount,
    aboveSkylineRate: skylineRateObj.rate,
    aboveSkylineRateDisplay: skylineRateObj.display,
    score8To10Count,
    score8To10Rate: rate8To10Obj.rate,
    score8To10RateDisplay: rate8To10Obj.display,
  }
}

/**
 * Nhận diện trạng thái miễn / vắng / điểm số từ giá trị ô điểm và ghi chú
 */
export function parseRawStudentTestStatus(params: {
  rawScoreVal: any
  remarkText?: string | null
  ratingText?: string | null
  roundingRule?: RoundingRule | string | null
  maxScore?: number
}): {
  statusInTest: "VALID_SCORE" | "ABSENT_MAKEUP" | "EXEMPT" | "MISSING_SCORE" | "OUT_OF_RANGE"
  officialScore: number | null
  rawScoreText: string
} {
  const { rawScoreVal, remarkText = "", ratingText = "", roundingRule, maxScore = 10 } = params
  const strVal = rawScoreVal === null || rawScoreVal === undefined ? "" : String(rawScoreVal).trim()
  const remLower = String(remarkText || "").toLowerCase().trim()
  const valLower = strVal.toLowerCase()

  // 1. Kiểm tra Miễn kiểm tra
  if (
    valLower === "m" ||
    valLower === "mt" ||
    valLower === "miễn" ||
    valLower === "mien" ||
    /\bmiễn\s*(kiểm\s*tra|kt|thi)\b/i.test(remLower) ||
    remLower === "miễn"
  ) {
    return {
      statusInTest: "EXEMPT",
      officialScore: null,
      rawScoreText: strVal || "Miễn",
    }
  }

  // 2. Kiểm tra Vắng / Chờ kiểm tra bù (khi chưa có điểm số)
  if (
    valLower === "v" ||
    valLower === "vắng" ||
    valLower === "vang" ||
    valLower === "kp" ||
    valLower === "p" ||
    (!strVal && /\b(vắng|chờ\s*bù|kiểm\s*tra\s*bù|chưa\s*thi|hoãn\s*thi)\b/i.test(remLower))
  ) {
    return {
      statusInTest: "ABSENT_MAKEUP",
      officialScore: null,
      rawScoreText: strVal || "Vắng",
    }
  }

  if (!strVal) {
    return {
      statusInTest: "MISSING_SCORE",
      officialScore: null,
      rawScoreText: "",
    }
  }

  // 3. Parse điểm số
  const cleaned = strVal.replace(",", ".")
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    // Nếu là chữ không phải số
    return {
      statusInTest: "OUT_OF_RANGE",
      officialScore: null,
      rawScoreText: strVal,
    }
  }

  let numeric = Number(cleaned)
  if (isNaN(numeric)) {
    return {
      statusInTest: "OUT_OF_RANGE",
      officialScore: null,
      rawScoreText: strVal,
    }
  }

  // Quy đổi nếu thang 100 được cấu hình trong cột nhưng báo cáo thang 10
  if (maxScore === 100 && numeric > 10 && numeric <= 100) {
    numeric = numeric / 10
  } else if (maxScore === 100 && numeric >= 0 && numeric <= 10) {
    // Nếu cột cấu hình maxScore=100 nhưng giá trị lưu đã ở thang 10 (<= 10) hoặc thang 100
    // Lưu ý: với bài thang 100 thuần túy (như 83, 85, 96) numeric > 10 đã chia 10 ở trên
  }

  if (numeric < 0 || numeric > 10) {
    return {
      statusInTest: "OUT_OF_RANGE",
      officialScore: numeric,
      rawScoreText: strVal,
    }
  }

  // Áp dụng quy tắc làm tròn của bài nếu tạo ra điểm chính thức (luôn ép kiểu Number vì roundScore trả về chuỗi)
  let official = numeric
  if (roundingRule === "ROUND_0" || roundingRule === "ROUND_INT") {
    official = Number(roundScore(numeric, "ROUND_0"))
  } else if (roundingRule === "ROUND_1") {
    official = Number(roundScore(numeric, "ROUND_1"))
  } else if (roundingRule === "ROUND_2") {
    official = Number(roundScore(numeric, "ROUND_2"))
  }

  return {
    statusInTest: "VALID_SCORE",
    officialScore: Number(official),
    rawScoreText: strVal,
  }
}

/**
 * Trích xuất điểm của bài kiểm tra định kỳ từ SubjectGradeEntry
 */
export function extractScoreFromGradeEntry(
  entry: any,
  evaluationPeriod: string,
  testColumnKey: string = "OFFICIAL",
  config?: any
): {
  rawScoreVal: any
  columnLabel: string
  roundingRule?: string | null
  maxScore?: number
} {
  if (!entry) {
    return { rawScoreVal: null, columnLabel: "Chưa có", roundingRule: null, maxScore: 10 }
  }

  let comp: Record<string, any> = {}
  if (entry.componentScores) {
    try {
      comp =
        typeof entry.componentScores === "string"
          ? JSON.parse(entry.componentScores)
          : entry.componentScores || {}
    } catch {
      comp = {}
    }
  }

  const periodUpper = String(evaluationPeriod || "GK1").toUpperCase().trim()
  const colDefs = config ? normalizeGradeColumnDefs(config) : []

  // Nếu người dùng chọn cụ thể 1 cột điểm (testColumnKey !== "OFFICIAL")
  if (testColumnKey && testColumnKey !== "OFFICIAL") {
    const cleanKey = testColumnKey.includes("::") ? testColumnKey.split("::")[1] : testColumnKey
    if (cleanKey === "composite" || cleanKey === "compositeScore") {
      return {
        rawScoreVal: entry.compositeScore,
        columnLabel: config?.compositeColumnName || "Điểm tổng hợp",
        roundingRule: config?.roundingRule || null,
        maxScore: 10,
      }
    }
    const matchedDef = colDefs.find((d) => d.key === cleanKey || d.label === cleanKey)
    const val = comp[cleanKey] ?? (matchedDef ? comp[matchedDef.key] : undefined)
    return {
      rawScoreVal: val ?? null,
      columnLabel: matchedDef?.label || cleanKey,
      roundingRule: null,
      maxScore: matchedDef?.maxScore || 10,
    }
  }

  // Mặc định "OFFICIAL": lấy điểm bài kiểm tra định kỳ chính thức của kỳ
  // 1. Kiểm tra nếu có cột kiểm tra bù ("kt_bu", "makeup", "thi_lai") có giá trị hợp lệ
  const makeupVal = comp.kt_bu ?? comp.makeup ?? comp.diem_bu
  if (makeupVal !== undefined && makeupVal !== null && String(makeupVal).trim() !== "") {
    return {
      rawScoreVal: makeupVal,
      columnLabel: "Điểm KT bù",
      roundingRule: null,
      maxScore: 10,
    }
  }

  const sumNumberMaxScores = colDefs
    .filter((d) => d.dataType === "NUMBER")
    .reduce((acc, d) => acc + (Number(d.maxScore) || 10), 0)
  const compositeMaxScore =
    sumNumberMaxScores >= 90 && Number(entry.compositeScore) > 10 ? 100 : 10

  // 2. Kỳ Giữa kỳ (GK1, GK2)
  if (periodUpper === "GK1" || periodUpper === "GK2") {
    const numberDefs = colDefs.filter((d) => d.dataType === "NUMBER")
    const gkDef = colDefs.find(
      (d) =>
        d.group === "GK" ||
        d.key === "gk" ||
        d.label.toUpperCase().includes("GK") ||
        d.label.toUpperCase().includes("ĐĐGGK")
    )
    if (gkDef && comp[gkDef.key] !== undefined && String(comp[gkDef.key]).trim() !== "") {
      return {
        rawScoreVal: comp[gkDef.key],
        columnLabel: gkDef.label,
        roundingRule: null,
        maxScore: gkDef.maxScore || 10,
      }
    }
    if (comp.gk !== undefined && String(comp.gk).trim() !== "") {
      return { rawScoreVal: comp.gk, columnLabel: `KT ${periodUpper}`, roundingRule: null, maxScore: 10 }
    }
    // Chỉ lấy thẳng col0 nếu bài kiểm tra chỉ có 1 cột điểm số duy nhất (hoặc chưa có compositeScore và col1 trống)
    const hasCol1Score = comp.col1 !== undefined && String(comp.col1).trim() !== ""
    if (
      comp.col0 !== undefined &&
      String(comp.col0).trim() !== "" &&
      (numberDefs.length <= 1 || (!hasCol1Score && (entry.compositeScore === null || entry.compositeScore === undefined)))
    ) {
      return {
        rawScoreVal: comp.col0,
        columnLabel: gkDef?.label || numberDefs[0]?.label || `KT ${periodUpper}`,
        roundingRule: null,
        maxScore: gkDef?.maxScore || numberDefs[0]?.maxScore || 10,
      }
    }
    // Kiểm tra xem bản ghi có phải chỉ chứa điểm thường xuyên (TX1..TX4) mà chưa có điểm GK hay không
    const txDefs = numberDefs.filter((d) => d.group === "TX" || /^tx\d*$/i.test(d.key))
    const hasTxScoreOnly =
      gkDef &&
      txDefs.length > 0 &&
      txDefs.some((d) => comp[d.key] !== undefined && String(comp[d.key]).trim() !== "") &&
      (comp[gkDef.key] === undefined || String(comp[gkDef.key]).trim() === "")

    if (hasTxScoreOnly) {
      return {
        rawScoreVal: null,
        columnLabel: gkDef.label,
        roundingRule: null,
        maxScore: gkDef.maxScore || 10,
      }
    }
    if (entry.compositeScore !== null && entry.compositeScore !== undefined) {
      return {
        rawScoreVal: entry.compositeScore,
        columnLabel: gkDef?.label || config?.compositeColumnName || `KT ${periodUpper}`,
        roundingRule: config?.roundingRule || null,
        maxScore: compositeMaxScore,
      }
    }
    return { rawScoreVal: null, columnLabel: gkDef?.label || `KT ${periodUpper}`, roundingRule: null, maxScore: 10 }
  }

  // 3. Kỳ Cuối kỳ (CK1, CK2)
  if (periodUpper === "CK1" || periodUpper === "CK2") {
    const numberDefs = colDefs.filter((d) => d.dataType === "NUMBER")
    const ckDef = colDefs.find(
      (d) =>
        d.group === "CK" ||
        d.key === "ck" ||
        d.label.toUpperCase().includes("CK") ||
        d.label.toUpperCase().includes("ĐĐGCK")
    )
    if (ckDef && comp[ckDef.key] !== undefined && String(comp[ckDef.key]).trim() !== "") {
      return {
        rawScoreVal: comp[ckDef.key],
        columnLabel: ckDef.label,
        roundingRule: null,
        maxScore: ckDef.maxScore || 10,
      }
    }
    if (comp.ck !== undefined && String(comp.ck).trim() !== "") {
      return { rawScoreVal: comp.ck, columnLabel: `KT ${periodUpper}`, roundingRule: null, maxScore: 10 }
    }
    const hasCol1Score = comp.col1 !== undefined && String(comp.col1).trim() !== ""
    if (
      comp.col0 !== undefined &&
      String(comp.col0).trim() !== "" &&
      (numberDefs.length <= 1 || (!hasCol1Score && (entry.compositeScore === null || entry.compositeScore === undefined)))
    ) {
      return {
        rawScoreVal: comp.col0,
        columnLabel: ckDef?.label || numberDefs[0]?.label || `KT ${periodUpper}`,
        roundingRule: null,
        maxScore: ckDef?.maxScore || numberDefs[0]?.maxScore || 10,
      }
    }
    const txDefs = numberDefs.filter((d) => d.group === "TX" || /^tx\d*$/i.test(d.key))
    const hasTxScoreOnly =
      ckDef &&
      txDefs.length > 0 &&
      txDefs.some((d) => comp[d.key] !== undefined && String(comp[d.key]).trim() !== "") &&
      (comp[ckDef.key] === undefined || String(comp[ckDef.key]).trim() === "")

    if (hasTxScoreOnly) {
      return {
        rawScoreVal: null,
        columnLabel: ckDef.label,
        roundingRule: null,
        maxScore: ckDef.maxScore || 10,
      }
    }
    if (entry.compositeScore !== null && entry.compositeScore !== undefined) {
      return {
        rawScoreVal: entry.compositeScore,
        columnLabel: ckDef?.label || config?.compositeColumnName || `KT ${periodUpper}`,
        roundingRule: config?.roundingRule || null,
        maxScore: compositeMaxScore,
      }
    }
    return { rawScoreVal: null, columnLabel: ckDef?.label || `KT ${periodUpper}`, roundingRule: null, maxScore: 10 }
  }

  // 4. Các kỳ khác (KSĐN, HK1, HK2, CN) hoặc fallback sang compositeScore / col0
  if (entry.compositeScore !== null && entry.compositeScore !== undefined) {
    return {
      rawScoreVal: entry.compositeScore,
      columnLabel: config?.compositeColumnName || "Điểm chính thức",
      roundingRule: config?.roundingRule || null,
      maxScore: compositeMaxScore,
    }
  }

  if (comp.col0 !== undefined && String(comp.col0).trim() !== "") {
    return {
      rawScoreVal: comp.col0,
      columnLabel: colDefs[0]?.label || "Điểm KT",
      roundingRule: null,
      maxScore: colDefs[0]?.maxScore || 10,
    }
  }

  return { rawScoreVal: null, columnLabel: "Điểm KT", roundingRule: null, maxScore: 10 }
}

/**
 * Truy vấn & Tổng hợp Báo cáo Thống kê Kết quả Kiểm tra Định kỳ (Server-side Authoritative Engine)
 */
export async function generatePeriodicTestReport(
  filters: ThkqPeriodicFilterInput,
  accessScope: ThkqAccessScope
) {
  let {
    academicYearId,
    level = "TIEU_HOC",
    evaluationPeriod = "GK1",
    subjectId = "",
    testColumnKey = "OFFICIAL",
    campusId = "ALL",
    educationSystem = "ALL",
    grade = "ALL",
    classId = "ALL",
    ethnicity = "ALL",
    groupBy = "GRADE_CLASS",
    rateMode = "SSM_ANALYSIS",
    scoreScaleMode = "AUTO",
    includeZeroScore = false,
    thresholdScore = 5.0,
  } = filters

  if (!accessScope.canViewReport) {
    throw new Error("FORBIDDEN: Tài khoản không có quyền xem báo cáo thống kê kết quả kiểm tra định kỳ.")
  }

  // 1. Tải thông tin Năm học, Cơ sở, Môn học, Cấu hình Sổ điểm, Điểm chuẩn, Khóa sổ
  const [academicYear, allCampuses, allSubjects, allGradeConfigs, benchmarkConfigs, periodLocks] =
    await Promise.all([
      prisma.academicYear.findUnique({
        where: { id: academicYearId },
        select: { id: true, name: true, status: true, startDate: true, endDate: true },
      }),
      prisma.campus.findMany({
        where: {
          status: "ACTIVE",
          ...(accessScope.isCampusRestricted && accessScope.allowedCampusIds.length > 0
            ? { id: { in: accessScope.allowedCampusIds } }
            : {}),
        },
        orderBy: { campusCode: "asc" },
        select: { id: true, campusCode: true, campusName: true },
      }),
      prisma.subject.findMany({
        where: {
          status: "ACTIVE",
          ...(accessScope.isSubjectRestricted && accessScope.allowedSubjectIds.length > 0
            ? { id: { in: accessScope.allowedSubjectIds } }
            : {}),
        },
        orderBy: { subjectName: "asc" },
        select: { id: true, subjectCode: true, subjectName: true, level: true, category: true, evaluationType: true },
      }),
      prisma.subjectGradeConfig.findMany({
        where: { academicYearId, isActive: true },
        include: { subject: { select: { id: true, subjectCode: true, subjectName: true, category: true } } },
      }),
      prisma.subjectBenchmarkConfig.findMany({
        where: { academicYearId },
      }),
      prisma.gradebookLock.findMany({
        where: { academicYearId, evaluationPeriod },
      }),
    ])

  if (!academicYear) {
    throw new Error("Không tìm thấy năm học đã chọn.")
  }

  // 2. Xác định danh mục Kỳ kiểm tra thực tế đã cấu hình / có dữ liệu trong năm học
  const entryPeriodRows = await prisma.subjectGradeEntry
    .groupBy({
      by: ["evaluationPeriod"],
      where: { academicYearId },
      _count: { _all: true },
    })
    .catch(() => [])

  const configuredPeriodSet = new Set<string>(["GK1", "CK1", "GK2", "CK2"])
  allGradeConfigs.forEach((c: any) => {
    if (c.evaluationPeriod && c.evaluationPeriod !== "ALL") {
      configuredPeriodSet.add(c.evaluationPeriod)
    }
  })
  entryPeriodRows.forEach((r: any) => {
    if (r.evaluationPeriod) configuredPeriodSet.add(r.evaluationPeriod)
  })

  const PERIOD_CATALOG = [
    { code: "GK1", label: "Giữa kỳ 1", fullLabel: "Giữa kỳ 1 (GK1)", examTitlePrefix: "GIỮA KỲ" },
    { code: "CK1", label: "Cuối kỳ 1", fullLabel: "Cuối kỳ 1 (CK1)", examTitlePrefix: "CUỐI KỲ" },
    { code: "GK2", label: "Giữa kỳ 2", fullLabel: "Giữa kỳ 2 (GK2)", examTitlePrefix: "GIỮA KỲ" },
    { code: "CK2", label: "Cuối kỳ 2", fullLabel: "Cuối kỳ 2 (CK2)", examTitlePrefix: "CUỐI KỲ" },
    { code: "KSĐN", label: "Khảo sát đầu năm", fullLabel: "Khảo sát đầu năm (KSĐN)", examTitlePrefix: "ĐẦU NĂM" },
  ]

  const availablePeriods = PERIOD_CATALOG.map((p) => {
    const entryCount =
      (entryPeriodRows.find((r: any) => r.evaluationPeriod === p.code)?._count?._all as number) || 0
    const hasConfig = allGradeConfigs.some((c: any) => c.evaluationPeriod === p.code)
    return {
      ...p,
      isConfigured: configuredPeriodSet.has(p.code),
      hasData: entryCount > 0,
      hasConfig,
      entryCount,
    }
  })

  // 3. Tải danh sách Lớp thuộc phạm vi quyền & năm học
  const allowedCampusIdSet = new Set(allCampuses.map((c) => c.id))
  const rawClasses = await prisma.class.findMany({
    where: {
      academicYearId,
      status: "ACTIVE",
      ...(accessScope.isCampusRestricted && accessScope.allowedCampusIds.length > 0
        ? { campusId: { in: accessScope.allowedCampusIds } }
        : {}),
      ...(accessScope.isClassRestricted && accessScope.allowedClassIds.length > 0
        ? { id: { in: accessScope.allowedClassIds } }
        : {}),
    },
    include: {
      campus: { select: { id: true, campusCode: true, campusName: true } },
      teachers: {
        where: { status: "ACTIVE" },
        include: { teacher: { select: { id: true, teacherName: true } } },
      },
      teachingAssignments: {
        where: { academicYearId },
        include: { teacher: { select: { id: true, teacherName: true } } },
      },
    },
    orderBy: { className: "asc" },
  })

  // Chuẩn hóa thông tin lớp (chỉ lấy các lớp Phổ thông K1..K12)
  const allScopedClasses = rawClasses
    .map((cls: any) => {
      const gNum = extractGradeNumber(cls.grade || cls.className)
      if (!gNum || gNum < 1 || gNum > 12) return null
      if (!allowedCampusIdSet.has(cls.campusId)) return null
      const lvl = resolveEducationLevel(cls.level, cls.grade, cls.className)
      const eduSys = classifyEducationSystem(cls.educationSystem, cls.className)
      const campusCode = cls.campus?.campusCode || ""
      const displayCode = formatClassDisplayWithCampus(cls.className, campusCode)
      const gvcn =
        cls.teachers?.find((t: any) => !t.roleInClass || t.roleInClass === "GVCN")?.teacher
          ?.teacherName || ""
      return {
        ...cls,
        gradeNumber: gNum,
        gradeLabel: `Khối ${gNum}`,
        resolvedLevel: lvl,
        educationSystemCode: eduSys.code,
        educationSystemLabel: eduSys.label,
        educationSystemShortLabel: eduSys.shortLabel,
        campusCode,
        campusName: cls.campus?.campusName || campusCode,
        displayCode,
        homeroomTeacherName: gvcn,
      }
    })
    .filter(Boolean)

  // Lọc lớp theo Cấp học, Cơ sở, Hệ học, Khối, Lớp
  const filteredClassesByScope = allScopedClasses.filter((cls: any) => {
    if (level && level !== "ALL" && cls.resolvedLevel !== level) return false
    if (campusId && campusId !== "ALL" && cls.campusId !== campusId) return false
    if (educationSystem && educationSystem !== "ALL" && cls.educationSystemCode !== educationSystem) {
      return false
    }
    if (grade && grade !== "ALL") {
      const targetGNum = extractGradeNumber(grade)
      if (targetGNum !== null && cls.gradeNumber !== targetGNum) return false
    }
    if (classId && classId !== "ALL" && cls.id !== classId) return false
    return true
  })

  // 4. Lọc danh sách Môn học phù hợp với Cấp học, Khối và Kỳ kiểm tra
  const activeGradesInScope = Array.from(new Set(filteredClassesByScope.map((c: any) => c.gradeNumber))).sort(
    (a, b) => a - b
  )

  const subjectsWithDataRows = await prisma.subjectGradeEntry
    .groupBy({
      by: ["subjectId"],
      where: {
        academicYearId,
        evaluationPeriod: {
          in:
            evaluationPeriod === "GK1" || evaluationPeriod === "CK1"
              ? [evaluationPeriod, "HK1"]
              : evaluationPeriod === "GK2" || evaluationPeriod === "CK2"
              ? [evaluationPeriod, "HK2"]
              : [evaluationPeriod],
        },
        ...(filteredClassesByScope.length > 0
          ? { classId: { in: filteredClassesByScope.map((c: any) => c.id) } }
          : {}),
      },
      _count: { _all: true },
    })
    .catch(() => [])

  const subjectEntryCountMap = new Map<string, number>()
  subjectsWithDataRows.forEach((r: any) => {
    subjectEntryCountMap.set(r.subjectId, r._count?._all || 0)
  })

  const availableSubjects = allSubjects
    .filter((sub: any) => {
      // Nếu môn đã có dữ liệu điểm trong phạm vi đang chọn -> luôn hiển thị
      if ((subjectEntryCountMap.get(sub.id) || 0) > 0) return true
      // Nếu môn đã được cấu hình trong SubjectGradeConfig của kỳ này
      const hasCfg = allGradeConfigs.some(
        (cfg: any) =>
          cfg.subjectId === sub.id &&
          (cfg.evaluationPeriod === evaluationPeriod || cfg.evaluationPeriod === "ALL")
      )
      if (hasCfg) return true

      // Kiểm tra theo cấp học / khối đang lọc
      if (level === "TIEU_HOC") {
        if (activeGradesInScope.length > 0) {
          return activeGradesInScope.some((g) => isPrimarySubjectForGrade(sub, `Khối ${g}`))
        }
        return isPrimarySubjectForGrade(sub, "Khối 4") || isPrimarySubjectForGrade(sub, "Khối 1")
      }
      if (level === "THCS") {
        return isSecondarySubjectForGrade(sub, "Khối 6")
      }
      if (level === "THPT") {
        return isSecondarySubjectForGrade(sub, "Khối 10")
      }
      return true
    })
    .map((sub: any) => ({
      id: sub.id,
      subjectCode: sub.subjectCode,
      subjectName: sub.subjectName,
      category: sub.category || "MOET",
      curriculumGroup: getSubjectCurriculumGroup(sub),
      entryCount: subjectEntryCountMap.get(sub.id) || 0,
      isCommentOnly: isTt22CommentOnlySubject(sub.subjectName),
    }))
    .sort((a, b) => {
      // Ưu tiên môn có dữ liệu điểm lên đầu, sau đó sắp xếp theo tên môn
      if ((b.entryCount > 0 ? 1 : 0) !== (a.entryCount > 0 ? 1 : 0)) {
        return (b.entryCount > 0 ? 1 : 0) - (a.entryCount > 0 ? 1 : 0)
      }
      return a.subjectName.localeCompare(b.subjectName, "vi")
    })

  // Chọn môn mục tiêu: nếu chưa truyền subjectId hoặc subjectId === "ALL", chọn môn đầu tiên có dữ liệu hoặc Tiếng Việt / Toán
  let resolvedSubject = availableSubjects.find((s) => s.id === subjectId)
  if (!resolvedSubject && availableSubjects.length > 0) {
    resolvedSubject =
      availableSubjects.find((s) => s.entryCount > 0) ||
      availableSubjects.find((s) => s.subjectName.toLowerCase().includes("tiếng việt")) ||
      availableSubjects.find((s) => s.subjectName.toLowerCase().includes("toán")) ||
      availableSubjects[0]
  }

  const targetSubjectId = resolvedSubject?.id || ""

  // 5. Xác định các Đợt / Bài kiểm tra (Cột điểm) của môn đang chọn trong kỳ
  const subjectConfigsForPeriod = allGradeConfigs.filter(
    (c: any) =>
      c.subjectId === targetSubjectId &&
      (c.evaluationPeriod === evaluationPeriod || c.evaluationPeriod === "ALL") &&
      c.confirmationStatus !== "UNCONFIRMED"
  )

  const availableTests: Array<{
    key: string
    label: string
    configType: string
    isDefault: boolean
  }> = [
    {
      key: "OFFICIAL",
      label: `Điểm kiểm tra định kỳ chính thức (${evaluationPeriod})`,
      configType: "AUTO",
      isDefault: true,
    },
  ]

  const seenTestKeys = new Set<string>(["OFFICIAL"])
  const periodUpperForTest = String(evaluationPeriod || "GK1").toUpperCase().trim()

  const isPeriodicTestColumnDef = (d: NormalizedColumnDef): boolean => {
    if (d.dataType !== "NUMBER") return false
    const lblUpper = String(d.label || "").toUpperCase().trim()
    const keyUpper = String(d.key || "").toUpperCase().trim()

    // Loại bỏ hoàn toàn các cột kiểm tra thường xuyên (TX1..TX4) hoặc điểm trung bình/tổng hợp
    if (
      d.group === "TX" ||
      /^TX\d*$/i.test(keyUpper) ||
      /^TX\d*$/i.test(lblUpper) ||
      lblUpper.includes("THƯỜNG XUYÊN") ||
      lblUpper.includes("ĐIỂM TB") ||
      lblUpper.includes("ĐTB") ||
      lblUpper.includes("TRUNG BÌNH") ||
      lblUpper.includes("TỔNG HỢP") ||
      lblUpper.includes("THÀNH PHẦN")
    ) {
      return false
    }

    if (periodUpperForTest === "GK1" || periodUpperForTest === "GK2") {
      return (
        d.group === "GK" ||
        keyUpper === "GK" ||
        lblUpper.includes("GK") ||
        lblUpper.includes("GIỮA KỲ") ||
        lblUpper.includes("GIỮA HK") ||
        lblUpper.includes("ĐĐGGK") ||
        lblUpper.includes("KT ĐK") ||
        lblUpper.includes("KIỂM TRA ĐỊNH KỲ")
      )
    }

    if (
      periodUpperForTest === "CK1" ||
      periodUpperForTest === "CK2" ||
      periodUpperForTest === "HK1" ||
      periodUpperForTest === "HK2"
    ) {
      return (
        d.group === "CK" ||
        keyUpper === "CK" ||
        lblUpper.includes("CK") ||
        lblUpper.includes("CUỐI KỲ") ||
        lblUpper.includes("CUỐI HK") ||
        lblUpper.includes("ĐĐGCK") ||
        lblUpper.includes("KT ĐK") ||
        lblUpper.includes("KIỂM TRA ĐỊNH KỲ")
      )
    }

    // Với KSĐN hoặc kỳ khảo sát chuyên đề: chấp nhận cột điểm kiểm tra định kỳ / khảo sát
    return true
  }

  subjectConfigsForPeriod.forEach((cfg: any) => {
    const cType = cfg.configType || "INTERNAL"
    const defs = normalizeGradeColumnDefs(cfg).filter(isPeriodicTestColumnDef)
    defs.forEach((d) => {
      const k = `${cType}::${d.key}`
      if (!seenTestKeys.has(k)) {
        seenTestKeys.add(k)
        availableTests.push({
          key: k,
          label: `${d.label} (${cType === "VNEDU" ? "Sổ điểm vnEdu" : "Đánh giá nội bộ"})`,
          configType: cType,
          isDefault: false,
        })
      }
    })
  })

  // Chỉ giữ lại testColumnKey hợp lệ trong danh sách bài kiểm tra định kỳ
  if (testColumnKey !== "OFFICIAL" && !seenTestKeys.has(testColumnKey)) {
    testColumnKey = "OFFICIAL"
  }

  // 6. Xác định phạm vi Lớp áp dụng môn học (tránh báo thiếu điểm cho lớp không học hoặc không có KTĐK môn đó)
  // Tải toàn bộ SubjectGradeEntry của môn này trong kỳ (bao gồm cả fallback HK1/HK2 nếu là THCS/THPT)
  const periodCandidates =
    evaluationPeriod === "GK1" || evaluationPeriod === "CK1"
      ? [evaluationPeriod, "HK1"]
      : evaluationPeriod === "GK2" || evaluationPeriod === "CK2"
      ? [evaluationPeriod, "HK2"]
      : [evaluationPeriod]

  const rawEntries = targetSubjectId
    ? await prisma.subjectGradeEntry.findMany({
        where: {
          academicYearId,
          subjectId: targetSubjectId,
          evaluationPeriod: { in: periodCandidates },
          ...(filteredClassesByScope.length > 0
            ? { classId: { in: filteredClassesByScope.map((c: any) => c.id) } }
            : {}),
        },
        orderBy: { updatedAt: "desc" },
      })
    : []

  // Fallback bổ sung từ StudentTermScore nếu rawEntries trống và kỳ là CK1/CK2/HK1/HK2
  const fallbackTermScores =
    targetSubjectId && rawEntries.length === 0
      ? await prisma.studentTermScore
          .findMany({
            where: {
              subjectId: targetSubjectId,
              semester: evaluationPeriod.includes("2") ? "HK2" : "HK1",
              student: {
                academicYearId,
                ...(filteredClassesByScope.length > 0
                  ? { classId: { in: filteredClassesByScope.map((c: any) => c.id) } }
                  : {}),
              },
            },
          })
          .catch(() => [])
      : []

  const classesWithEntriesSet = new Set<string>(rawEntries.map((e: any) => e.classId))

  // Xác định lớp nào thực sự áp dụng bài kiểm tra định kỳ của môn này
  const applicableClasses = filteredClassesByScope.filter((cls: any) => {
    if (!resolvedSubject) return false
    // Nếu lớp đã có bản ghi điểm của môn này -> chắc chắn áp dụng
    if (classesWithEntriesSet.has(cls.id)) return true

    // Nếu lớp có phân công giảng dạy môn này
    const hasTeachingAssignment = (cls.teachingAssignments || []).some(
      (ta: any) => ta.subjectId === targetSubjectId
    )

    // Nếu lớp có cấu hình SubjectGradeConfig cho khối của lớp
    const hasGradeConfig = subjectConfigsForPeriod.some((cfg: any) => {
      const cfgGNum = extractGradeNumber(cfg.grade)
      return cfg.grade === "ALL" || cfgGNum === cls.gradeNumber
    })

    if (cls.resolvedLevel === "TIEU_HOC") {
      // Kiểm tra môn có thuộc chương trình Tiểu học khối đó không
      if (!isPrimarySubjectForGrade(resolvedSubject, `Khối ${cls.gradeNumber}`)) {
        return false
      }
      // Với các môn chuẩn Bộ GD&ĐT (MOET) ở Tiểu học: kiểm tra quy tắc TT27 (VD: Tiếng Việt / Toán ở GK1 chỉ kiểm tra định kỳ ở Khối 4, 5 trừ khi có cấu hình riêng hoặc đã nhập điểm)
      if (resolvedSubject.curriculumGroup === "MOET" && !hasGradeConfig) {
        return shouldPrimarySubjectHaveKtColumn(
          resolvedSubject.subjectName,
          `Khối ${cls.gradeNumber}`,
          evaluationPeriod
        )
      }
      return hasGradeConfig || hasTeachingAssignment
    }

    if (cls.resolvedLevel === "THCS" || cls.resolvedLevel === "THPT") {
      if (!isSecondarySubjectForGrade(resolvedSubject, `Khối ${cls.gradeNumber}`)) {
        return false
      }
      return true
    }

    return true
  })

  // 7. Xác định Mốc chốt dữ liệu (Cutoff Timestamp) & Sĩ số lớp tại mốc chốt
  const globalPeriodLock = periodLocks.find((l: any) => l.classId === "ALL" && l.subjectId === "ALL" && l.isLocked)
  const latestLockDate = periodLocks
    .filter((l: any) => l.isLocked && l.lockedAt)
    .map((l: any) => new Date(l.lockedAt).getTime())
    .sort((a, b) => b - a)[0]

  const cutoffTimestamp = globalPeriodLock?.lockedAt
    ? new Date(globalPeriodLock.lockedAt)
    : latestLockDate
    ? new Date(latestLockDate)
    : null

  const applicableClassIds = applicableClasses.map((c: any) => c.id)

  // Tải danh sách học sinh và lịch sử chuyển lớp/chuyển trường của các lớp áp dụng
  const [studentsInClasses, transfersInYear, importSessions] = await Promise.all([
    applicableClassIds.length > 0
      ? prisma.student.findMany({
          where: {
            academicYearId,
            classId: { in: applicableClassIds },
          },
          select: {
            id: true,
            studentCode: true,
            vnEduCode: true,
            studentName: true,
            dateOfBirth: true,
            gender: true,
            classId: true,
            campusId: true,
            status: true,
            studentType: true,
            studentTypeNote: true,
          },
          orderBy: { studentName: "asc" },
        })
      : Promise.resolve([]),
    applicableClassIds.length > 0
      ? prisma.studentTransfer
          .findMany({
            where: {
              student: { academicYearId, classId: { in: applicableClassIds } },
            },
            orderBy: { transferDate: "desc" },
          })
          .catch(() => [])
      : Promise.resolve([]),
    prisma.vnEduImportSession
      .findMany({
        where: { academicYearId },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
      .catch(() => []),
  ])

  const transfersByStudent = new Map<string, any[]>()
  transfersInYear.forEach((tr: any) => {
    const list = transfersByStudent.get(tr.studentId) || []
    list.push(tr)
    transfersByStudent.set(tr.studentId, list)
  })

  // Xác định học sinh thuộc sĩ số tại mốc chốt
  const rosterStudents = studentsInClasses.filter((st: any) => {
    const stTransfers = transfersByStudent.get(st.id) || []
    if (cutoffTimestamp) {
      // Nếu học sinh đã chuyển đi (OUT) trước mốc chốt -> loại khỏi sĩ số mốc chốt
      const transferredOutBeforeCutoff = stTransfers.some(
        (t) => t.type === "OUT" && new Date(t.transferDate) <= cutoffTimestamp
      )
      if (transferredOutBeforeCutoff) return false
      // Nếu học sinh chuyển đi SAU mốc chốt, tại mốc chốt vẫn tính trong sĩ số
      const transferredOutAfterCutoff = stTransfers.some(
        (t) => t.type === "OUT" && new Date(t.transferDate) > cutoffTimestamp
      )
      if (transferredOutAfterCutoff) return true
    }
    return st.status === "ACTIVE"
  })

  // Danh mục Dân tộc (hỗ trợ trích xuất từ ghi chú hồ sơ hoặc mặc định Kinh / Tất cả)
  const extractEthnicity = (st: any): string => {
    const note = String(st.studentTypeNote || "")
    const m = note.match(/dân\s*tộc\s*:\s*([^,;|\r\n]+)/i)
    if (m && m[1]) return m[1].trim()
    return "Kinh"
  }

  const availableEthnicities = Array.from(new Set(rosterStudents.map(extractEthnicity))).sort((a, b) =>
    a.localeCompare(b, "vi")
  )

  const ethnicityFilteredStudents =
    ethnicity && ethnicity !== "ALL"
      ? rosterStudents.filter((st) => extractEthnicity(st).toLowerCase() === ethnicity.toLowerCase())
      : rosterStudents

  // 8. Đối soát 1 kết quả chính thức / học sinh / môn / bài kiểm tra
  const entriesByStudent = new Map<string, any[]>()
  rawEntries.forEach((e: any) => {
    // Nếu kỳ đang chọn là GK1/CK1 mà bản ghi thuộc HK1, chỉ lấy nếu bản ghi đúng kỳ hoặc HK1 có chứa điểm thành phần
    const list = entriesByStudent.get(e.studentId) || []
    list.push(e)
    entriesByStudent.set(e.studentId, list)
  })

  const fallbackScoreByStudent = new Map<string, any>()
  fallbackTermScores.forEach((ts: any) => {
    fallbackScoreByStudent.set(ts.studentId, ts)
  })

  // Helper lấy điểm chuẩn nội bộ Sky-Line
  const getSkylineBenchmarkForClass = (lvl: string, grdNum: number, subId: string): number => {
    const grdLabel = `Khối ${grdNum}`
    const specific = benchmarkConfigs.find(
      (c: any) =>
        c.subjectId === subId &&
        (c.grade === grdLabel || c.grade === String(grdNum) || c.grade === "ALL") &&
        (c.level === lvl || c.level === "ALL") &&
        (c.evaluationPeriod === evaluationPeriod || c.evaluationPeriod === "ALL")
    )
    if (specific && typeof specific.benchmarkScore === "number") return specific.benchmarkScore
    return lvl === "TIEU_HOC" ? 7.0 : 6.0
  }

  const classMap = new Map(applicableClasses.map((c: any) => [c.id, c]))

  // Danh sách cảnh báo đối soát dữ liệu
  const conflictingRecords: Array<{
    studentId: string
    studentCode: string
    studentName: string
    className: string
    vneduScore: number | string | null
    internalScore: number | string | null
    resolvedSource: string
  }> = []

  const outOfScaleRecords: Array<{
    studentId: string
    studentCode: string
    studentName: string
    className: string
    rawValue: string
    reason: string
  }> = []

  const missingGenderRecords: Array<{
    studentId: string
    studentCode: string
    studentName: string
    className: string
  }> = []

  let hasAnyDecimalScore = false
  let hasAnyZeroScore = false
  let latestEntryUpdatedAt: Date | null = null

  const reconciledStudents: StudentReconciledItem[] = []

  for (const st of ethnicityFilteredStudents) {
    const cls = classMap.get(st.classId)
    if (!cls) continue

    const studentEntries = entriesByStudent.get(st.id) || []
    // Ưu tiên bản ghi khớp đúng evaluationPeriod trước, sau đó mới đến bản ghi HK1/HK2
    const exactPeriodEntries = studentEntries.filter((e) => e.evaluationPeriod === evaluationPeriod)
    const candidateEntries = exactPeriodEntries.length > 0 ? exactPeriodEntries : studentEntries

    // Nếu người dùng chọn testColumnKey có prefix VNEDU:: hoặc INTERNAL::
    const forcedConfigType = testColumnKey.startsWith("VNEDU::")
      ? "VNEDU"
      : testColumnKey.startsWith("INTERNAL::")
      ? "INTERNAL"
      : null

    const vneduEntry = candidateEntries.find((e) => (e.configType || "").toUpperCase() === "VNEDU")
    const internalEntry = candidateEntries.find((e) => (e.configType || "").toUpperCase() !== "VNEDU")

    const resolveCfg = (cType: string) =>
      subjectConfigsForPeriod.find(
        (c: any) =>
          (c.configType || "INTERNAL") === cType &&
          (c.grade === "ALL" || extractGradeNumber(c.grade) === cls.gradeNumber)
      )

    const vneduExtracted = vneduEntry
      ? extractScoreFromGradeEntry(vneduEntry, evaluationPeriod, testColumnKey, resolveCfg("VNEDU"))
      : null
    const internalExtracted = internalEntry
      ? extractScoreFromGradeEntry(internalEntry, evaluationPeriod, testColumnKey, resolveCfg("INTERNAL"))
      : null

    // Kiểm tra xung đột giữa VNEDU và INTERNAL nếu cả 2 đều có điểm hợp lệ nhưng khác nhau
    if (
      !forcedConfigType &&
      vneduExtracted &&
      internalExtracted &&
      vneduExtracted.rawScoreVal !== null &&
      internalExtracted.rawScoreVal !== null &&
      String(vneduExtracted.rawScoreVal).trim() !== "" &&
      String(internalExtracted.rawScoreVal).trim() !== "" &&
      Number(String(vneduExtracted.rawScoreVal).replace(",", ".")) !==
        Number(String(internalExtracted.rawScoreVal).replace(",", "."))
    ) {
      conflictingRecords.push({
        studentId: st.id,
        studentCode: st.studentCode,
        studentName: st.studentName,
        className: cls.displayCode,
        vneduScore: vneduExtracted.rawScoreVal,
        internalScore: internalExtracted.rawScoreVal,
        resolvedSource:
          resolvedSubject?.curriculumGroup === "MOET" ? "Sổ điểm vnEdu" : "Sổ điểm nội bộ SSM",
      })
    }

    // Chọn bản ghi chính thức duy nhất
    let chosenEntry: any = null
    let chosenExtracted: any = null

    if (forcedConfigType === "VNEDU") {
      chosenEntry = vneduEntry
      chosenExtracted = vneduExtracted
    } else if (forcedConfigType === "INTERNAL") {
      chosenEntry = internalEntry
      chosenExtracted = internalExtracted
    } else if (resolvedSubject?.curriculumGroup === "MOET") {
      if (vneduExtracted && vneduExtracted.rawScoreVal !== null && String(vneduExtracted.rawScoreVal).trim() !== "") {
        chosenEntry = vneduEntry
        chosenExtracted = vneduExtracted
      } else if (internalExtracted && internalExtracted.rawScoreVal !== null && String(internalExtracted.rawScoreVal).trim() !== "") {
        chosenEntry = internalEntry
        chosenExtracted = internalExtracted
      } else {
        chosenEntry = vneduEntry || internalEntry
        chosenExtracted = vneduExtracted || internalExtracted
      }
    } else {
      if (internalExtracted && internalExtracted.rawScoreVal !== null && String(internalExtracted.rawScoreVal).trim() !== "") {
        chosenEntry = internalEntry
        chosenExtracted = internalExtracted
      } else {
        chosenEntry = vneduEntry || internalEntry
        chosenExtracted = vneduExtracted || internalExtracted
      }
    }

    // Fallback từ StudentTermScore nếu không có trong SubjectGradeEntry
    if (!chosenEntry && fallbackScoreByStudent.has(st.id)) {
      const fb = fallbackScoreByStudent.get(st.id)
      chosenEntry = {
        id: fb.id,
        configType: "TERM_SCORE",
        sourceType: "TERM_SCORE",
        remark: "",
        ratingValue: fb.evaluationGrade || "",
        updatedAt: fb.updatedAt,
      }
      chosenExtracted = {
        rawScoreVal: fb.score,
        columnLabel: `Điểm ${fb.semester}`,
        roundingRule: null,
        maxScore: 10,
      }
    }

    if (chosenEntry?.updatedAt) {
      const dt = new Date(chosenEntry.updatedAt)
      if (!latestEntryUpdatedAt || dt > latestEntryUpdatedAt) {
        latestEntryUpdatedAt = dt
      }
    }

    const parsedStatus = parseRawStudentTestStatus({
      rawScoreVal: chosenExtracted?.rawScoreVal ?? null,
      remarkText: chosenEntry?.remark || "",
      ratingText: chosenEntry?.ratingValue || "",
      roundingRule: chosenExtracted?.roundingRule,
      maxScore: chosenExtracted?.maxScore || 10,
    })

    if (parsedStatus.statusInTest === "OUT_OF_RANGE") {
      outOfScaleRecords.push({
        studentId: st.id,
        studentCode: st.studentCode,
        studentName: st.studentName,
        className: cls.displayCode,
        rawValue: parsedStatus.rawScoreText,
        reason: "Điểm ngoài thang 0–10 hoặc sai định dạng số",
      })
    }

    if (parsedStatus.statusInTest === "VALID_SCORE" && parsedStatus.officialScore !== null) {
      const sc = parsedStatus.officialScore
      if (Math.abs(sc - Math.round(sc)) > 1e-6) {
        hasAnyDecimalScore = true
      }
      if (Math.abs(sc) <= 1e-9) {
        hasAnyZeroScore = true
      }
    }

    const isFem = isFemaleGender(st.gender)
    const isMissGen = isMissingGender(st.gender)
    if (isMissGen) {
      missingGenderRecords.push({
        studentId: st.id,
        studentCode: st.studentCode,
        studentName: st.studentName,
        className: cls.displayCode,
      })
    }

    const skylineBenchmark = getSkylineBenchmarkForClass(
      cls.resolvedLevel,
      cls.gradeNumber,
      targetSubjectId
    )

    reconciledStudents.push({
      studentId: st.id,
      studentCode: st.studentCode,
      vnEduCode: st.vnEduCode || null,
      studentName: st.studentName,
      dateOfBirth: st.dateOfBirth ? new Date(st.dateOfBirth).toISOString() : null,
      genderRaw: st.gender || null,
      isFemale: isFem,
      isMissingGender: isMissGen,
      ethnicity: extractEthnicity(st),
      classId: cls.id,
      className: cls.className,
      classDisplayCode: cls.displayCode,
      campusId: cls.campusId,
      campusCode: cls.campusCode,
      campusName: cls.campusName,
      level: cls.resolvedLevel,
      gradeNumber: cls.gradeNumber,
      gradeLabel: cls.gradeLabel,
      educationSystemCode: cls.educationSystemCode,
      educationSystemLabel: cls.educationSystemLabel,
      statusInTest: parsedStatus.statusInTest,
      officialScore: parsedStatus.officialScore,
      rawScoreText: parsedStatus.rawScoreText,
      bucketId: null, // gán sau khi xác định chế độ thang điểm
      isAboveThreshold:
        parsedStatus.statusInTest === "VALID_SCORE" &&
        parsedStatus.officialScore !== null &&
        parsedStatus.officialScore >= thresholdScore - 1e-9,
      isAboveSkyline:
        parsedStatus.statusInTest === "VALID_SCORE" &&
        parsedStatus.officialScore !== null &&
        parsedStatus.officialScore >= skylineBenchmark - 1e-9,
      skylineBenchmark,
      sourceType: chosenEntry?.sourceType || (chosenEntry ? "MANUAL" : "NONE"),
      configType: chosenEntry?.configType || "VNEDU",
      remark: chosenEntry?.remark || "",
      updatedAt: chosenEntry?.updatedAt ? new Date(chosenEntry.updatedAt).toISOString() : null,
    })
  }

  // 9. Quyết định chế độ chia cột điểm (INTEGER vs DECIMAL) & cột Điểm 0
  const effectiveScaleMode: "INTEGER" | "DECIMAL" =
    scoreScaleMode === "INTEGER"
      ? "INTEGER"
      : scoreScaleMode === "DECIMAL"
      ? "DECIMAL"
      : level === "TIEU_HOC" && !hasAnyDecimalScore
      ? "INTEGER"
      : hasAnyDecimalScore
      ? "DECIMAL"
      : "INTEGER"

  const effectiveIncludeZero = Boolean(includeZeroScore || hasAnyZeroScore)

  const buckets = buildScoreBuckets({
    scoreScaleMode: effectiveScaleMode,
    includeZeroScore: effectiveIncludeZero,
    thresholdScore,
  })

  // Gán bucketId cho từng học sinh có điểm hợp lệ
  reconciledStudents.forEach((st) => {
    if (st.statusInTest === "VALID_SCORE" && st.officialScore !== null) {
      st.bucketId = resolveScoreBucketId(st.officialScore, buckets)
    }
  })

  // 10. Xây dựng các dòng bảng báo cáo theo tùy chọn cách nhóm (GRADE_CLASS hoặc CAMPUS_GRADE_CLASS)
  const studentsByClassId = new Map<string, StudentReconciledItem[]>()
  applicableClasses.forEach((c: any) => studentsByClassId.set(c.id, []))
  reconciledStudents.forEach((st) => {
    const list = studentsByClassId.get(st.classId) || []
    list.push(st)
    studentsByClassId.set(st.classId, list)
  })

  // Hàng Tổng cộng toàn phạm vi lọc (chỉ cộng dữ liệu trong phạm vi người dùng được xem!)
  const totalRow = computePeriodicRowStats({
    rowKey: "TOTAL",
    rowType: "TOTAL",
    label: "Tổng cộng",
    students: reconciledStudents,
    buckets,
    rateMode,
    thresholdScore,
  })

  const tableRows: PeriodicReportRow[] = [totalRow]
  const classRowsOnly: PeriodicReportRow[] = []

  // Sắp xếp lớp tự nhiên (VD: 4/1_CS1, 4/2_CS1, 4/3_CS2, 4UK_CS3...)
  const sortClassesNaturally = (a: any, b: any) => {
    if (a.gradeNumber !== b.gradeNumber) return a.gradeNumber - b.gradeNumber
    return a.displayCode.localeCompare(b.displayCode, "vi", { numeric: true })
  }

  let runningClassStt = 1

  if (groupBy === "CAMPUS_GRADE_CLASS") {
    // Nhóm theo Cơ sở -> Khối -> Lớp
    const campusOrder = allCampuses.filter((cp) =>
      applicableClasses.some((cls: any) => cls.campusId === cp.id)
    )

    for (const cp of campusOrder) {
      const classesInCampus = applicableClasses
        .filter((cls: any) => cls.campusId === cp.id)
        .sort(sortClassesNaturally)
      const studentsInCampus = reconciledStudents.filter((st) => st.campusId === cp.id)

      const cleanCpName = String(cp.campusName || "").trim()
      const cleanCpCode = String(cp.campusCode || "").trim()
      const campusDisplayLabel =
        !cleanCpCode || cleanCpName.toUpperCase() === cleanCpCode.toUpperCase()
          ? `Cơ sở ${cleanCpName || cleanCpCode}`
          : cleanCpName.toUpperCase().includes(cleanCpCode.toUpperCase())
          ? cleanCpName
          : `${cleanCpName} (${cleanCpCode})`

      const campusRow = computePeriodicRowStats({
        rowKey: `CAMPUS_${cp.id}`,
        rowType: "CAMPUS",
        label: campusDisplayLabel,
        meta: {
          campusId: cp.id,
          campusCode: cp.campusCode,
          campusName: cp.campusName,
        },
        students: studentsInCampus,
        buckets,
        rateMode,
        thresholdScore,
      })
      tableRows.push(campusRow)

      const gradesInCampus = Array.from(new Set(classesInCampus.map((c: any) => c.gradeNumber))).sort(
        (a, b) => a - b
      )
      for (const gNum of gradesInCampus) {
        const classesInGrade = classesInCampus.filter((c: any) => c.gradeNumber === gNum)
        const studentsInGrade = studentsInCampus.filter((st) => st.gradeNumber === gNum)

        const gradeRow = computePeriodicRowStats({
          rowKey: `CAMPUS_${cp.id}_GRADE_${gNum}`,
          rowType: "GRADE",
          label: `Khối ${gNum} • ${cp.campusCode}`,
          meta: {
            campusId: cp.id,
            campusCode: cp.campusCode,
            campusName: cp.campusName,
            gradeNumber: gNum,
            gradeLabel: `Khối ${gNum}`,
          },
          students: studentsInGrade,
          buckets,
          rateMode,
          thresholdScore,
        })
        tableRows.push(gradeRow)

        for (const cls of classesInGrade) {
          const stList = studentsByClassId.get(cls.id) || []
          const subTeacher =
            (cls.teachingAssignments || []).find((ta: any) => ta.subjectId === targetSubjectId)
              ?.teacher?.teacherName || cls.homeroomTeacherName
          const clsBenchmark = getSkylineBenchmarkForClass(
            cls.resolvedLevel,
            cls.gradeNumber,
            targetSubjectId
          )
          const clsRow = computePeriodicRowStats({
            rowKey: `CLASS_${cls.id}`,
            rowType: "CLASS",
            stt: runningClassStt++,
            label: cls.displayCode,
            meta: {
              classId: cls.id,
              className: cls.className,
              classDisplayCode: cls.displayCode,
              campusId: cls.campusId,
              campusCode: cls.campusCode,
              campusName: cls.campusName,
              level: cls.resolvedLevel,
              grade: cls.grade,
              gradeNumber: cls.gradeNumber,
              gradeLabel: cls.gradeLabel,
              educationSystemCode: cls.educationSystemCode,
              educationSystemLabel: cls.educationSystemLabel,
              homeroomTeacherName: cls.homeroomTeacherName,
              subjectTeacherName: subTeacher,
              skylineBenchmark: clsBenchmark,
            },
            students: stList,
            buckets,
            rateMode,
            thresholdScore,
            defaultSkylineBenchmark: clsBenchmark,
          })
          tableRows.push(clsRow)
          classRowsOnly.push(clsRow)
        }
      }
    }
  } else {
    // Mặc định: Nhóm theo Khối -> Lớp (Chuẩn đối soát vnEdu)
    const gradesOrder = Array.from(new Set(applicableClasses.map((c: any) => c.gradeNumber))).sort(
      (a, b) => a - b
    )

    for (const gNum of gradesOrder) {
      const classesInGrade = applicableClasses
        .filter((c: any) => c.gradeNumber === gNum)
        .sort(sortClassesNaturally)
      const studentsInGrade = reconciledStudents.filter((st) => st.gradeNumber === gNum)

      const gradeRow = computePeriodicRowStats({
        rowKey: `GRADE_${gNum}`,
        rowType: "GRADE",
        label: `Khối ${gNum}`,
        meta: {
          gradeNumber: gNum,
          gradeLabel: `Khối ${gNum}`,
        },
        students: studentsInGrade,
        buckets,
        rateMode,
        thresholdScore,
      })
      tableRows.push(gradeRow)

      for (const cls of classesInGrade) {
        const stList = studentsByClassId.get(cls.id) || []
        const subTeacher =
          (cls.teachingAssignments || []).find((ta: any) => ta.subjectId === targetSubjectId)
            ?.teacher?.teacherName || cls.homeroomTeacherName
        const clsBenchmark = getSkylineBenchmarkForClass(
          cls.resolvedLevel,
          cls.gradeNumber,
          targetSubjectId
        )
        const clsRow = computePeriodicRowStats({
          rowKey: `CLASS_${cls.id}`,
          rowType: "CLASS",
          stt: runningClassStt++,
          label: cls.displayCode,
          meta: {
            classId: cls.id,
            className: cls.className,
            classDisplayCode: cls.displayCode,
            campusId: cls.campusId,
            campusCode: cls.campusCode,
            campusName: cls.campusName,
            level: cls.resolvedLevel,
            grade: cls.grade,
            gradeNumber: cls.gradeNumber,
            gradeLabel: cls.gradeLabel,
            educationSystemCode: cls.educationSystemCode,
            educationSystemLabel: cls.educationSystemLabel,
            homeroomTeacherName: cls.homeroomTeacherName,
            subjectTeacherName: subTeacher,
            skylineBenchmark: clsBenchmark,
          },
          students: stList,
          buckets,
          rateMode,
          thresholdScore,
          defaultSkylineBenchmark: clsBenchmark,
        })
        tableRows.push(clsRow)
        classRowsOnly.push(clsRow)
      }
    }
  }

  // 11. Phân tích kết quả môn học theo Bậc học & Hệ học + Kế hoạch cải tiến chuyên môn
  const LEVEL_LABELS: Record<string, string> = {
    TIEU_HOC: "Tiểu học (Khối 1–5)",
    THCS: "THCS (Khối 6–9)",
    THPT: "THPT (Khối 10–12)",
  }

  const byLevelAnalysis = (["TIEU_HOC", "THCS", "THPT"] as const)
    .map((lvlKey) => {
      const sts = reconciledStudents.filter((s) => s.level === lvlKey)
      const clsCount = applicableClasses.filter((c: any) => c.resolvedLevel === lvlKey).length
      if (clsCount === 0 && sts.length === 0) return null
      const stats = computePeriodicRowStats({
        rowKey: `ANALYSIS_LEVEL_${lvlKey}`,
        rowType: "GRADE",
        label: LEVEL_LABELS[lvlKey] || lvlKey,
        students: sts,
        buckets,
        rateMode: "SSM_ANALYSIS",
        thresholdScore,
        defaultSkylineBenchmark: lvlKey === "TIEU_HOC" ? 7.0 : 6.0,
      })
      return {
        levelCode: lvlKey,
        levelName: LEVEL_LABELS[lvlKey],
        classCount: clsCount,
        tshs: stats.tshs,
        tshsKt: stats.tshsKt,
        avgScore: stats.avgScore,
        stdDev: stats.stdDev,
        passMoetCount: stats.aboveThreshold.sl,
        passMoetRate: stats.aboveThreshold.tl,
        passMoetRateDisplay: stats.aboveThreshold.tlDisplay,
        belowMoetCount: stats.belowThreshold.sl,
        belowMoetRate: stats.belowThreshold.tl,
        belowMoetRateDisplay: stats.belowThreshold.tlDisplay,
        skylineBenchmark: lvlKey === "TIEU_HOC" ? 7.0 : 6.0,
        passSkylineCount: stats.aboveSkylineCount,
        passSkylineRate: stats.aboveSkylineRate,
        passSkylineRateDisplay: stats.aboveSkylineRateDisplay,
        goodExcellentCount: stats.score8To10Count,
        goodExcellentRate: stats.score8To10Rate,
        goodExcellentRateDisplay: stats.score8To10RateDisplay,
      }
    })
    .filter(Boolean)

  const SYSTEM_DEFS = [
    { code: "HE_S", name: "Hệ S (Chất lượng cao & Hội nhập)" },
    { code: "HE_I", name: "Hệ I (Song ngữ Quốc tế)" },
    { code: "HE_UK", name: "Hệ UK (Quốc tế Anh)" },
    { code: "HE_A", name: "Hệ A (Tăng cường)" },
  ]

  const bySystemAnalysis = SYSTEM_DEFS.map((sysDef) => {
    const sts = reconciledStudents.filter((s) => s.educationSystemCode === sysDef.code)
    const clsCount = applicableClasses.filter((c: any) => c.educationSystemCode === sysDef.code).length
    if (clsCount === 0 && sts.length === 0) return null
    const stats = computePeriodicRowStats({
      rowKey: `ANALYSIS_SYS_${sysDef.code}`,
      rowType: "GRADE",
      label: sysDef.name,
      students: sts,
      buckets,
      rateMode: "SSM_ANALYSIS",
      thresholdScore,
    })

    // Khuyến nghị cải tiến theo Hệ học
    let recommendation = "Duy trì tiến độ dạy học và kiểm tra định kỳ theo chuẩn."
    let priority: "GOOD" | "WARNING" | "URGENT" = "GOOD"
    if (stats.belowThreshold.sl > 0 && (stats.belowThreshold.tl || 0) >= 10) {
      recommendation =
        "Tổ chức phụ đạo tăng cường ngay theo nhóm năng lực; rà soát ma trận đề và phân hóa bài tập về nhà."
      priority = "URGENT"
    } else if (stats.belowThreshold.sl > 0 || (stats.stdDev !== null && stats.stdDev >= 1.5)) {
      recommendation =
        "Kèm cặp cá nhân hóa nhóm học sinh dưới chuẩn Sky-Line; điều chỉnh nhịp độ giảng dạy giữa các lớp cùng hệ."
      priority = "WARNING"
    } else if (stats.avgScore !== null && stats.avgScore >= 8.0) {
      recommendation =
        "Chất lượng đồng đều cao; bổ sung câu hỏi vận dụng cao và dự án học tập mở rộng cho nhóm Khá–Giỏi."
      priority = "GOOD"
    }

    return {
      systemCode: sysDef.code,
      systemName: sysDef.name,
      classCount: clsCount,
      tshs: stats.tshs,
      tshsKt: stats.tshsKt,
      avgScore: stats.avgScore,
      stdDev: stats.stdDev,
      passMoetCount: stats.aboveThreshold.sl,
      passMoetRate: stats.aboveThreshold.tl,
      passMoetRateDisplay: stats.aboveThreshold.tlDisplay,
      belowMoetCount: stats.belowThreshold.sl,
      belowMoetRate: stats.belowThreshold.tl,
      belowMoetRateDisplay: stats.belowThreshold.tlDisplay,
      passSkylineCount: stats.aboveSkylineCount,
      passSkylineRate: stats.aboveSkylineRate,
      passSkylineRateDisplay: stats.aboveSkylineRateDisplay,
      goodExcellentCount: stats.score8To10Count,
      goodExcellentRate: stats.score8To10Rate,
      goodExcellentRateDisplay: stats.score8To10RateDisplay,
      recommendation,
      priority,
    }
  }).filter(Boolean)

  // 12. Tạo mã phiên bản dữ liệu (snapshotVersion) để đảm bảo màn hình, chi tiết và xuất Excel khớp 100%
  const snapshotPayload = JSON.stringify({
    y: academicYearId,
    p: evaluationPeriod,
    s: targetSubjectId,
    t: testColumnKey,
    lvl: level,
    cp: campusId,
    sys: educationSystem,
    g: grade,
    cls: classId,
    eth: ethnicity,
    gb: groupBy,
    rm: rateMode,
    sc: effectiveScaleMode,
    z: effectiveIncludeZero,
    tshs: totalRow.tshs,
    tshsKt: totalRow.tshsKt,
    ge5: totalRow.aboveThreshold.sl,
    lt5: totalRow.belowThreshold.sl,
    upd: latestEntryUpdatedAt ? latestEntryUpdatedAt.toISOString() : "NONE",
  })
  const snapshotVersion = crypto.createHash("sha256").update(snapshotPayload).digest("hex").slice(0, 16)

  // Phiên import vnEdu còn nháp hoặc lỗi
  const unmappedOrDraftBatches = importSessions
    .filter((s: any) => s.status === "PARSED" || s.status === "PARTIAL")
    .map((s: any) => ({
      sessionId: s.id,
      status: s.status,
      uploadedByName: s.uploadedByName || "Người dùng",
      createdAt: s.createdAt,
      fileNames: (() => {
        try {
          return JSON.parse(s.fileNamesJson || "[]")
        } catch {
          return []
        }
      })(),
    }))

  const periodMeta =
    PERIOD_CATALOG.find((p) => p.code === evaluationPeriod) || {
      code: evaluationPeriod,
      label: evaluationPeriod,
      fullLabel: evaluationPeriod,
      examTitlePrefix: evaluationPeriod.toUpperCase(),
    }

  const selectedCampusObj =
    campusId !== "ALL" ? allCampuses.find((c) => c.id === campusId) : null

  const unitHeaderName = selectedCampusObj
    ? `TRƯỜNG TH, THCS & THPT SKY-LINE (${selectedCampusObj.campusName.toUpperCase()})`
    : "TRƯỜNG TH, THCS & THPT SKY-LINE"

  const reportMainTitle = `THỐNG KÊ KẾT QUẢ KIỂM TRA ${periodMeta.examTitlePrefix} MÔN ${(
    resolvedSubject?.subjectName || "MÔN HỌC"
  ).toUpperCase()}`
  const reportSubTitle = `${periodMeta.label} năm học ${academicYear.name.replace("-", " - ")}`

  const classesWithoutScoresCount = classRowsOnly.filter((r) => r.tshs > 0 && r.tshsKt === 0).length

  return {
    snapshotVersion,
    generatedAt: new Date().toISOString(),
    dataUpdatedAt: latestEntryUpdatedAt ? latestEntryUpdatedAt.toISOString() : null,
    cutoffTimestamp: cutoffTimestamp ? cutoffTimestamp.toISOString() : null,
    isProvisionalRoster: !cutoffTimestamp,
    rosterStatusNote: cutoffTimestamp
      ? `Sĩ số chốt tại mốc khóa sổ kỳ ${periodMeta.label} (${new Date(cutoffTimestamp).toLocaleString("vi-VN")})`
      : `Số liệu tạm theo danh sách phân lớp hiện hành (Kỳ ${periodMeta.label} chưa khóa mốc chốt sổ điểm)`,

    // Tiêu đề báo cáo chuẩn
    header: {
      governingBody: "SỞ GIÁO DỤC VÀ ĐÀO TẠO TP. ĐÀ NẴNG",
      unitName: unitHeaderName,
      nationalMottoLine1: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
      nationalMottoLine2: "Độc lập - Tự do - Hạnh phúc",
      reportMainTitle,
      reportSubTitle,
      subjectName: resolvedSubject?.subjectName || "",
      subjectCode: resolvedSubject?.subjectCode || "",
      periodLabel: periodMeta.label,
      academicYearName: academicYear.name,
    },

    // Bộ lọc đã áp dụng & Danh mục lọc theo phân quyền
    appliedFilters: {
      academicYearId,
      academicYearName: academicYear.name,
      level,
      evaluationPeriod,
      periodLabel: periodMeta.label,
      subjectId: targetSubjectId,
      subjectName: resolvedSubject?.subjectName || "",
      testColumnKey,
      testColumnLabel:
        availableTests.find((t) => t.key === testColumnKey)?.label ||
        `Điểm kiểm tra định kỳ chính thức (${evaluationPeriod})`,
      campusId,
      campusName: selectedCampusObj ? selectedCampusObj.campusName : "Tất cả cơ sở (Trong phạm vi quyền)",
      educationSystem,
      grade,
      classId,
      ethnicity,
      groupBy,
      rateMode,
      scoreScaleMode: effectiveScaleMode,
      requestedScoreScaleMode: scoreScaleMode,
      includeZeroScore: effectiveIncludeZero,
      thresholdScore,
    },

    filterOptions: {
      campuses: allCampuses,
      periods: availablePeriods,
      subjects: availableSubjects,
      tests: availableTests,
      grades: Array.from(new Set(allScopedClasses.map((c: any) => c.gradeNumber)))
        .sort((a, b) => a - b)
        .map((n) => ({ value: String(n), label: `Khối ${n}` })),
      classes: filteredClassesByScope.map((c: any) => ({
        id: c.id,
        className: c.className,
        displayCode: c.displayCode,
        gradeNumber: c.gradeNumber,
        campusId: c.campusId,
        campusCode: c.campusCode,
        level: c.resolvedLevel,
        educationSystemCode: c.educationSystemCode,
      })),
      ethnicities: availableEthnicities,
    },

    // Quyền của tài khoản
    permissions: {
      roleTier: accessScope.roleTier,
      roleDisplayLabel: accessScope.roleDisplayLabel,
      canViewReport: accessScope.canViewReport,
      canViewDetail: accessScope.canViewDetail,
      canExportSummary: accessScope.canExportSummary,
      canExportDetail: accessScope.canExportDetail,
      isCampusRestricted: accessScope.isCampusRestricted,
      isSubjectRestricted: accessScope.isSubjectRestricted,
      isClassRestricted: accessScope.isClassRestricted,
    },

    // Cấu trúc cột & dữ liệu bảng chính
    buckets,
    aboveBuckets: buckets.filter((b) => b.group === "ABOVE_THRESHOLD"),
    belowBuckets: buckets.filter((b) => b.group === "BELOW_THRESHOLD"),
    rateFormulaMeta:
      rateMode === "VNEDU_RECONCILE"
        ? {
            mode: "VNEDU_RECONCILE",
            shortName: "Đối chiếu vnEdu",
            formulaText: "TL = Số nữ tại mức điểm / Tổng số học sinh (TSHS)",
            denominatorLabel: "TSHS của chính dòng",
            verificationNote:
              "Cách tính được suy ra từ mẫu báo cáo vnEdu tham chiếu (TL = Nữ tại mức / TSHS) và dùng để đối soát số liệu với vnEdu.",
          }
        : {
            mode: "SSM_ANALYSIS",
            shortName: "Phân tích SSM",
            formulaText: "TL = Số học sinh tại mức điểm (SL) / Tổng số học sinh có điểm hợp lệ (TSHS KT)",
            denominatorLabel: "TSHS KT (% học sinh có điểm)",
            secondaryFormulaText: "TL Nữ KT = Số nữ tại mức điểm / Số học sinh nữ đã kiểm tra (Nữ KT)",
            verificationNote:
              "Chế độ phân tích chất lượng chuyên môn nội bộ SSM: đánh giá chính xác tỷ lệ phân phối điểm trên tổng số học sinh dự kiểm tra.",
          },

    tableRows,
    totalRow,
    classCount: classRowsOnly.length,
    classesWithoutScoresCount,
    hasAnyDecimalScore,
    hasAnyZeroScore,

    // Rà soát chất lượng dữ liệu & đối soát
    reconciliationSummary: {
      totalStudentsInScope: reconciledStudents.length,
      validScoredCount: totalRow.tshsKt,
      eligibleCount: totalRow.eligibleCount,
      absentOrMakeupCount: totalRow.absentOrMakeupCount,
      missingScoreCount: totalRow.missingScoreCount,
      exemptCount: totalRow.exemptCount,
      missingGenderCount: missingGenderRecords.length,
      missingGenderStudents: missingGenderRecords.slice(0, 50),
      conflictingCount: conflictingRecords.length,
      conflictingRecords: conflictingRecords.slice(0, 50),
      outOfScaleCount: outOfScaleRecords.length,
      outOfScaleRecords: outOfScaleRecords.slice(0, 50),
      unmappedOrDraftBatches,
    },

    // Phân tích mở rộng theo Bậc học & Hệ học
    levelAndSystemAnalysis: {
      byLevel: byLevelAnalysis,
      bySystem: bySystemAnalysis,
    },

    // Giữ danh sách học sinh đã đối soát phía server để phục vụ drilldown hoặc xuất chi tiết khi có quyền
    _reconciledStudents: reconciledStudents,
  }
}

/**
 * Lọc danh sách học sinh chi tiết cấu thành một ô chỉ tiêu trên bảng khi người dùng click (Drill-down)
 */
export function filterStudentsForDrilldown(params: {
  students: StudentReconciledItem[]
  rowKey: string
  metricType:
    | "TSHS"
    | "TOTAL_FEMALE"
    | "TSHS_KT"
    | "FEMALE_KT"
    | "BUCKET_SL"
    | "BUCKET_FEMALE"
    | "ABOVE_SL"
    | "ABOVE_FEMALE"
    | "BELOW_SL"
    | "BELOW_FEMALE"
    | "ELIGIBLE"
    | "ABSENT_MAKEUP"
    | "MISSING_SCORE"
    | "EXEMPT"
    | "ABOVE_SKYLINE"
  bucketId?: string
}): StudentReconciledItem[] {
  const { students, rowKey, metricType, bucketId } = params

  // 1. Lọc theo phạm vi dòng (TOTAL, CAMPUS_x, GRADE_x, CAMPUS_x_GRADE_y, CLASS_z)
  let rowStudents = students
  if (rowKey.startsWith("CLASS_")) {
    const clsId = rowKey.replace("CLASS_", "")
    rowStudents = students.filter((s) => s.classId === clsId)
  } else if (rowKey.startsWith("CAMPUS_") && rowKey.includes("_GRADE_")) {
    const [cpPart, grdPart] = rowKey.split("_GRADE_")
    const cpId = cpPart.replace("CAMPUS_", "")
    const gNum = Number(grdPart)
    rowStudents = students.filter((s) => s.campusId === cpId && s.gradeNumber === gNum)
  } else if (rowKey.startsWith("CAMPUS_")) {
    const cpId = rowKey.replace("CAMPUS_", "")
    rowStudents = students.filter((s) => s.campusId === cpId)
  } else if (rowKey.startsWith("GRADE_")) {
    const gNum = Number(rowKey.replace("GRADE_", ""))
    rowStudents = students.filter((s) => s.gradeNumber === gNum)
  }

  // 2. Lọc theo loại chỉ tiêu
  switch (metricType) {
    case "TSHS":
      return rowStudents
    case "TOTAL_FEMALE":
      return rowStudents.filter((s) => s.isFemale)
    case "TSHS_KT":
      return rowStudents.filter((s) => s.statusInTest === "VALID_SCORE")
    case "FEMALE_KT":
      return rowStudents.filter((s) => s.statusInTest === "VALID_SCORE" && s.isFemale)
    case "BUCKET_SL":
      return rowStudents.filter((s) => s.statusInTest === "VALID_SCORE" && s.bucketId === bucketId)
    case "BUCKET_FEMALE":
      return rowStudents.filter(
        (s) => s.statusInTest === "VALID_SCORE" && s.bucketId === bucketId && s.isFemale
      )
    case "ABOVE_SL":
      return rowStudents.filter((s) => s.statusInTest === "VALID_SCORE" && s.isAboveThreshold)
    case "ABOVE_FEMALE":
      return rowStudents.filter(
        (s) => s.statusInTest === "VALID_SCORE" && s.isAboveThreshold && s.isFemale
      )
    case "BELOW_SL":
      return rowStudents.filter((s) => s.statusInTest === "VALID_SCORE" && !s.isAboveThreshold)
    case "BELOW_FEMALE":
      return rowStudents.filter(
        (s) => s.statusInTest === "VALID_SCORE" && !s.isAboveThreshold && s.isFemale
      )
    case "ELIGIBLE":
      return rowStudents.filter((s) => s.statusInTest !== "EXEMPT")
    case "ABSENT_MAKEUP":
      return rowStudents.filter((s) => s.statusInTest === "ABSENT_MAKEUP")
    case "MISSING_SCORE":
      return rowStudents.filter((s) => s.statusInTest === "MISSING_SCORE")
    case "EXEMPT":
      return rowStudents.filter((s) => s.statusInTest === "EXEMPT")
    case "ABOVE_SKYLINE":
      return rowStudents.filter((s) => s.statusInTest === "VALID_SCORE" && s.isAboveSkyline)
    default:
      return rowStudents
  }
}
