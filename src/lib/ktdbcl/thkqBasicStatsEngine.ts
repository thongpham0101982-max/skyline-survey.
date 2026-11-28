import { prisma } from "@/lib/db"
import {
  extractGradeNumber,
  isPrimarySubjectForGrade,
  isSecondarySubjectForGrade,
} from "@/lib/grading/vnedu-config-types"
import { ThkqAccessScope } from "./thkqPermissions"
import {
  extractScoreFromGradeEntry,
  parseRawStudentTestStatus,
  resolveEducationLevel,
} from "./thkqPeriodicReportEngine"

export interface BasicStatsFilterInput {
  academicYearId: string
  evaluationPeriod?: string // GK1 | CK1 | GK2 | CK2 | HK1 | HK2 | KSĐN
  level?: string // TIEU_HOC | THCS | THPT
  subjectId?: string
  grade?: string // "ALL" | "1".."12" | "Khối 1".."Khối 12"
  campusId?: string // "ALL" (Toàn hệ thống) hoặc campus.id
}

export interface BasicColumnStats {
  /** 1) Số HS có điểm hợp lệ trên thang điểm 10 */
  validCount: number
  validCountDisplay: string

  /** 2) Điểm trung bình cộng */
  mean: number | null
  meanDisplay: string

  /** 3) Điểm trung vị */
  median: number | null
  medianDisplay: string

  /** 4) Độ lệch chuẩn (tổng thể - population standard deviation) */
  stdDev: number | null
  stdDevDisplay: string

  /** 5) Độ lệch tuyệt đối trung vị (MAD = 1/N * sum(|x_i - median|)) */
  mad: number | null
  madDisplay: string

  /** 6) Điểm có nhiều HS đạt nhất & Mốc khoảng 0.25 đạt nhiều nhất */
  modes: Array<{ score: number; count: number }>
  modeDisplay: string
  peak025MilestoneDisplay: string

  /** 7) Tỷ lệ đạt dưới 5 điểm (< 5) */
  below5Count: number
  below5Rate: number | null
  below5Display: string
  below5PctOnlyDisplay: string

  /** 8) Tỷ lệ đạt từ 7 điểm trở lên (>= 7) */
  aboveOrEqual7Count: number
  aboveOrEqual7Rate: number | null
  aboveOrEqual7Display: string
  aboveOrEqual7PctOnlyDisplay: string

  /** 9) Số HS đạt điểm 10 */
  score10Count: number
  score10Display: string

  /** 10) Số HS đạt điểm 0 */
  score0Count: number
  score0Display: string

  /** 11) Học sinh đạt điểm <= 1 */
  scoreLte1Count: number
  scoreLte1Rate: number | null
  scoreLte1Display: string
  scoreLte1PctOnlyDisplay: string
}

export interface FrequencyInterval025Item {
  index: number // 0..39
  lower: number
  upper: number
  label: string // "[0, 0.25]", "(0.25, 0.5]", ..., "(9.75, 10]"
  count: number
  rate: number
  rateDisplay: string
  tooltipText: string
}

export interface FrequencyTable025Summary {
  totalValidCount: number
  maxCount: number
  maxRate: number
  peakIntervalLabel: string
  peakUpperMilestoneDisplay: string
  intervals: FrequencyInterval025Item[]
}

export const FREQUENCY_025_INTERVAL_DEFS: Array<{
  index: number
  lower: number
  upper: number
  label: string
}> = Array.from({ length: 40 }, (_, i) => {
  const lower = Number((i * 0.25).toFixed(2))
  const upper = Number(((i + 1) * 0.25).toFixed(2))
  const label = i === 0 ? `[0, 0.25]` : `(${lower}, ${upper}]`
  return { index: i, lower, upper, label }
})

/**
 * Xác định chỉ số khoảng (0..39) trong bảng tần số bước 0.25 cho một điểm hợp lệ [0, 10]:
 * - Khoảng 0: [0, 0.25] (0 <= s <= 0.25)
 * - Khoảng k (1..39): (k*0.25, (k+1)*0.25]
 */
export function resolveFrequency025Index(score: number): number {
  if (score <= 0.25 + 1e-9) return 0
  const idx = Math.ceil((score - 1e-9) / 0.25) - 1
  return Math.min(39, Math.max(1, idx))
}

/**
 * Tính bảng tần số 40 khoảng điểm bước 0.25 từ [0, 0.25] đến (9.75, 10] theo mẫu chuẩn Bộ GD&ĐT.
 */
export function computeFrequencyTable025(
  rawScores: Array<number | null | undefined>
): FrequencyTable025Summary {
  const validScores = rawScores.filter(
    (s): s is number =>
      typeof s === "number" && !Number.isNaN(s) && Number.isFinite(s) && s >= 0 && s <= 10
  )
  const totalValidCount = validScores.length
  const counts = new Array<number>(40).fill(0)

  for (const s of validScores) {
    const idx = resolveFrequency025Index(s)
    counts[idx]++
  }

  let maxCount = 0
  let maxRate = 0
  let peakIdx = -1

  const intervals: FrequencyInterval025Item[] = FREQUENCY_025_INTERVAL_DEFS.map((def) => {
    const count = counts[def.index]
    const rawPct = totalValidCount > 0 ? (count / totalValidCount) * 100 : 0
    const rate = Math.round((rawPct + Number.EPSILON) * 100) / 100
    if (count > maxCount) {
      maxCount = count
      peakIdx = def.index
    }
    if (rate > maxRate) {
      maxRate = rate
    }
    const rateDisplay = `${rate.toFixed(2).replace(".", ",")}%`
    return {
      index: def.index,
      lower: def.lower,
      upper: def.upper,
      label: def.label,
      count,
      rate,
      rateDisplay,
      tooltipText: `${def.label} · ${count.toLocaleString("vi-VN")}/${totalValidCount.toLocaleString(
        "vi-VN"
      )} học sinh · ${rateDisplay}`,
    }
  })

  const peakDef = peakIdx >= 0 && maxCount > 0 ? FREQUENCY_025_INTERVAL_DEFS[peakIdx] : null

  return {
    totalValidCount,
    maxCount,
    maxRate,
    peakIntervalLabel: peakDef ? peakDef.label : "—",
    peakUpperMilestoneDisplay: peakDef ? String(peakDef.upper).replace(".", ",") : "—",
    intervals,
  }
}

export type ScoreDistribution8BucketId =
  | "SCORE_0"
  | "SCORE_0_2"
  | "SCORE_2_4"
  | "SCORE_4_5"
  | "SCORE_5_7"
  | "SCORE_7_8"
  | "SCORE_8_10"
  | "SCORE_10"

export interface ScoreDistribution8BucketItem {
  id: ScoreDistribution8BucketId
  order: number
  label: string
  shortLabel: string
  isAboveOrEqual5: boolean
  count: number
  rate: number
  rateDisplay: string
  rateFixed2Display: string
  tooltipText: string
}

export interface ScoreDistribution8Summary {
  totalValidCount: number
  totalValidCountDisplay: string
  below5Count: number
  below5Rate: number | null
  below5RateDisplay: string
  aboveOrEqual5Count: number
  aboveOrEqual5Rate: number | null
  aboveOrEqual5RateDisplay: string
  buckets: ScoreDistribution8BucketItem[]
}

export const SCORE_DISTRIBUTION_8_BUCKET_DEFS: Array<{
  id: ScoreDistribution8BucketId
  order: number
  label: string
  shortLabel: string
  isAboveOrEqual5: boolean
}> = [
  { id: "SCORE_0", order: 1, label: "Điểm 0", shortLabel: "Điểm 0", isAboveOrEqual5: false },
  { id: "SCORE_0_2", order: 2, label: "0 < điểm < 2", shortLabel: "0 < đ < 2", isAboveOrEqual5: false },
  { id: "SCORE_2_4", order: 3, label: "2 ≤ điểm < 4", shortLabel: "2 ≤ đ < 4", isAboveOrEqual5: false },
  { id: "SCORE_4_5", order: 4, label: "4 ≤ điểm < 5", shortLabel: "4 ≤ đ < 5", isAboveOrEqual5: false },
  { id: "SCORE_5_7", order: 5, label: "5 ≤ điểm < 7", shortLabel: "5 ≤ đ < 7", isAboveOrEqual5: true },
  { id: "SCORE_7_8", order: 6, label: "7 ≤ điểm < 8", shortLabel: "7 ≤ đ < 8", isAboveOrEqual5: true },
  { id: "SCORE_8_10", order: 7, label: "8 ≤ điểm < 10", shortLabel: "8 ≤ đ < 10", isAboveOrEqual5: true },
  { id: "SCORE_10", order: 8, label: "Điểm 10", shortLabel: "Điểm 10", isAboveOrEqual5: true },
]

export function formatIntVi(n: number): string {
  return Math.round(n).toLocaleString("vi-VN")
}

/**
 * Phân nhóm 1 điểm hợp lệ trong khoảng [0, 10] vào đúng 1 trong 8 nhóm phổ điểm:
 * - Điểm 0 và Điểm 10 có nhóm riêng.
 * - Điểm đúng 2, 4, 5, 7 và 8 vào nhóm bắt đầu tại mốc tương ứng.
 */
export function resolveScoreDistribution8BucketId(score: number): ScoreDistribution8BucketId {
  if (Math.abs(score) < 1e-9) return "SCORE_0"
  if (Math.abs(score - 10) < 1e-9) return "SCORE_10"
  if (score < 2 - 1e-9) return "SCORE_0_2"
  if (score < 4 - 1e-9) return "SCORE_2_4"
  if (score < 5 - 1e-9) return "SCORE_4_5"
  if (score < 7 - 1e-9) return "SCORE_5_7"
  if (score < 8 - 1e-9) return "SCORE_7_8"
  return "SCORE_8_10"
}

/**
 * Tổng hợp phổ điểm 8 nhóm từ danh sách điểm gốc.
 * Bảng số liệu và biểu đồ dùng chung kết quả tổng hợp này để khớp 100%.
 */
export function computeScoreDistribution8Buckets(
  rawScores: Array<number | null | undefined>
): ScoreDistribution8Summary {
  const validScores = rawScores.filter(
    (s): s is number =>
      typeof s === "number" && !Number.isNaN(s) && Number.isFinite(s) && s >= 0 && s <= 10
  )
  const totalValidCount = validScores.length

  const counts = new Map<ScoreDistribution8BucketId, number>()
  SCORE_DISTRIBUTION_8_BUCKET_DEFS.forEach((def) => counts.set(def.id, 0))

  for (const s of validScores) {
    const bId = resolveScoreDistribution8BucketId(s)
    counts.set(bId, (counts.get(bId) || 0) + 1)
  }

  const buckets: ScoreDistribution8BucketItem[] = SCORE_DISTRIBUTION_8_BUCKET_DEFS.map((def) => {
    const count = counts.get(def.id) || 0
    const rawPct = totalValidCount > 0 ? (count / totalValidCount) * 100 : 0
    const rate = Math.round((rawPct + Number.EPSILON) * 100) / 100
    const rateDisplay = `${String(rate).replace(".", ",")}%`
    const rateFixed2Display = `${rate.toFixed(2).replace(".", ",")}%`
    const tooltipText = `${def.label} · ${formatIntVi(count)}/${formatIntVi(
      totalValidCount
    )} học sinh · ${rateFixed2Display}`

    return {
      id: def.id,
      order: def.order,
      label: def.label,
      shortLabel: def.shortLabel,
      isAboveOrEqual5: def.isAboveOrEqual5,
      count,
      rate,
      rateDisplay,
      rateFixed2Display,
      tooltipText,
    }
  })

  // Chỉ số dưới 5 điểm tính từ 4 nhóm đầu, từ 5 điểm trở lên tính từ 4 nhóm cuối của biểu đồ
  const below5Count = buckets
    .filter((b) => !b.isAboveOrEqual5)
    .reduce((acc, b) => acc + b.count, 0)
  const aboveOrEqual5Count = buckets
    .filter((b) => b.isAboveOrEqual5)
    .reduce((acc, b) => acc + b.count, 0)

  if (totalValidCount === 0) {
    return {
      totalValidCount: 0,
      totalValidCountDisplay: "0",
      below5Count: 0,
      below5Rate: null,
      below5RateDisplay: "—",
      aboveOrEqual5Count: 0,
      aboveOrEqual5Rate: null,
      aboveOrEqual5RateDisplay: "—",
      buckets,
    }
  }

  const below5Obj = formatRateWithCount(below5Count, totalValidCount)
  const above5Obj = formatRateWithCount(aboveOrEqual5Count, totalValidCount)

  return {
    totalValidCount,
    totalValidCountDisplay: formatIntVi(totalValidCount),
    below5Count,
    below5Rate: below5Obj.rate,
    below5RateDisplay: below5Obj.display,
    aboveOrEqual5Count,
    aboveOrEqual5Rate: above5Obj.rate,
    aboveOrEqual5RateDisplay: above5Obj.display,
    buckets,
  }
}

export interface BasicStatsGradePair {
  gradeNumber: number
  gradeCode: string
  gradeLabel: string // "Khối 1", "Khối 2", ...
  campusColumnLabel: string // Tên cơ sở đang chọn (VD: "CS1")
  systemColumnLabel: string // "Hệ thống"
  campusStats: BasicColumnStats
  systemStats: BasicColumnStats
}

export type BasicIndicatorKey =
  | "VALID_COUNT"
  | "MEAN"
  | "MEDIAN"
  | "STD_DEV"
  | "MAD"
  | "MODE"
  | "RATE_BELOW_5"
  | "RATE_ABOVE_7"
  | "COUNT_10"
  | "COUNT_0"
  | "COUNT_LTE_1"

export interface BasicStatsIndicatorRow {
  key: BasicIndicatorKey
  order: number
  label: string
  description: string
  cellsByGrade: Record<
    number,
    {
      campusDisplay: string
      systemDisplay: string
      campusRaw?: number | null
      systemRaw?: number | null
    }
  >
}

export function formatScoreValue(val: number): string {
  const rounded = Math.round((val + Number.EPSILON) * 100) / 100
  return String(rounded).replace(".", ",")
}

export function formatRateWithCount(matchedCount: number, totalValidCount: number): {
  rate: number
  display: string
  pctOnlyDisplay: string
} {
  const rawPct = (matchedCount / totalValidCount) * 100
  const roundedPct = Math.round((rawPct + Number.EPSILON) * 100) / 100
  const pctStr = String(roundedPct).replace(".", ",")
  return {
    rate: roundedPct,
    display: `${pctStr}% (${matchedCount}/${totalValidCount})`,
    pctOnlyDisplay: `${roundedPct.toFixed(2).replace(".", ",")}%`,
  }
}

/**
 * Tính 11 chỉ số thống kê cơ bản trên một tập điểm đầu vào (bao gồm Điểm trung bình, Trung vị, Độ lệch chuẩn, MAD, <5, >=7, Mode, Điểm 10, Điểm 0, Điểm <=1).
 * Tự động lọc bỏ các giá trị null, undefined, NaN hoặc ngoài khoảng [0, 10].
 * Ngưỡng (< 5, >= 7, === 10, === 0, <= 1) được áp dụng trên điểm hợp lệ trước khi làm tròn hiển thị.
 */
export function computeColumnBasicStats(rawScores: Array<number | null | undefined>): BasicColumnStats {
  const validScores = rawScores
    .filter((s): s is number => typeof s === "number" && !Number.isNaN(s) && Number.isFinite(s) && s >= 0 && s <= 10)
    .sort((a, b) => a - b)

  const n = validScores.length

  if (n === 0) {
    return {
      validCount: 0,
      validCountDisplay: "0",
      mean: null,
      meanDisplay: "—",
      median: null,
      medianDisplay: "—",
      stdDev: null,
      stdDevDisplay: "—",
      mad: null,
      madDisplay: "—",
      modes: [],
      modeDisplay: "—",
      peak025MilestoneDisplay: "—",
      below5Count: 0,
      below5Rate: null,
      below5Display: "—",
      below5PctOnlyDisplay: "—",
      aboveOrEqual7Count: 0,
      aboveOrEqual7Rate: null,
      aboveOrEqual7Display: "—",
      aboveOrEqual7PctOnlyDisplay: "—",
      score10Count: 0,
      score10Display: "—",
      score0Count: 0,
      score0Display: "—",
      scoreLte1Count: 0,
      scoreLte1Rate: null,
      scoreLte1Display: "—",
      scoreLte1PctOnlyDisplay: "—",
    }
  }

  // 1) Số HS có điểm
  const validCountDisplay = String(n)

  // 2) Điểm trung bình cộng
  const rawMean = validScores.reduce((acc, s) => acc + s, 0) / n
  const mean = Math.round((rawMean + Number.EPSILON) * 100) / 100
  const meanDisplay = mean.toFixed(2).replace(".", ",")

  // 3) Điểm trung vị
  const mid = Math.floor(n / 2)
  const rawMedian = n % 2 === 1 ? validScores[mid] : (validScores[mid - 1] + validScores[mid]) / 2
  const median = Math.round((rawMedian + Number.EPSILON) * 100) / 100
  const medianDisplay = formatScoreValue(rawMedian)

  // 4) Độ lệch chuẩn tổng thể (Population Standard Deviation)
  const popVariance = validScores.reduce((acc, s) => acc + Math.pow(s - rawMean, 2), 0) / n
  const rawStdDev = Math.sqrt(popVariance)
  const stdDev = Math.round((rawStdDev + Number.EPSILON) * 100) / 100
  const stdDevDisplay = stdDev.toFixed(2).replace(".", ",")

  // 5) Độ lệch tuyệt đối trung vị (MAD = 1/N * sum(|x_i - rawMedian|))
  const rawMad = validScores.reduce((acc, s) => acc + Math.abs(s - rawMedian), 0) / n
  const mad = Math.round((rawMad + Number.EPSILON) * 100) / 100
  const madDisplay = mad.toFixed(2).replace(".", ",")

  // 6) Điểm có nhiều HS đạt nhất (Mode) & Mốc khoảng 0.25 đạt nhiều nhất
  const freqMap = new Map<number, number>()
  for (const s of validScores) {
    const normScore = Math.round((s + Number.EPSILON) * 10000) / 10000
    freqMap.set(normScore, (freqMap.get(normScore) || 0) + 1)
  }

  let maxFreq = 0
  freqMap.forEach((cnt) => {
    if (cnt > maxFreq) maxFreq = cnt
  })

  let modes: Array<{ score: number; count: number }> = []
  let modeDisplay = "—"

  if (maxFreq === 1 && freqMap.size > 1) {
    modeDisplay = "Không có mức điểm nổi trội"
  } else {
    modes = Array.from(freqMap.entries())
      .filter(([, cnt]) => cnt === maxFreq)
      .sort((a, b) => a[0] - b[0])
      .map(([score, count]) => ({ score, count }))

    modeDisplay = modes.map((m) => `${formatScoreValue(m.score)} (${m.count} HS)`).join(", ")
  }

  const freq025 = computeFrequencyTable025(validScores)
  const peak025MilestoneDisplay = freq025.peakUpperMilestoneDisplay

  // 7) Tỷ lệ đạt dưới 5 điểm (< 5 trên điểm hợp lệ trước khi làm tròn)
  const below5Count = validScores.filter((s) => s < 5).length
  const below5Obj = formatRateWithCount(below5Count, n)

  // 8) Tỷ lệ đạt từ 7 điểm trở lên (>= 7 trên điểm hợp lệ trước khi làm tròn)
  const aboveOrEqual7Count = validScores.filter((s) => s >= 7).length
  const above7Obj = formatRateWithCount(aboveOrEqual7Count, n)

  // 9) Số HS đạt điểm 10
  const score10Count = validScores.filter((s) => Math.abs(s - 10) < 1e-9).length
  const score10Display = String(score10Count)

  // 10) Số HS đạt điểm 0
  const score0Count = validScores.filter((s) => Math.abs(s) < 1e-9).length
  const score0Display = String(score0Count)

  // 11) Học sinh đạt điểm <= 1 (0 <= s <= 1 trên điểm hợp lệ trước khi làm tròn)
  const scoreLte1Count = validScores.filter((s) => s >= 0 && s <= 1 + 1e-9).length
  const scoreLte1Obj = formatRateWithCount(scoreLte1Count, n)
  const scoreLte1Display = String(scoreLte1Count)

  return {
    validCount: n,
    validCountDisplay,
    mean,
    meanDisplay,
    median,
    medianDisplay,
    stdDev,
    stdDevDisplay,
    mad,
    madDisplay,
    modes,
    modeDisplay,
    peak025MilestoneDisplay,
    below5Count,
    below5Rate: below5Obj.rate,
    below5Display: below5Obj.display,
    below5PctOnlyDisplay: below5Obj.pctOnlyDisplay,
    aboveOrEqual7Count,
    aboveOrEqual7Rate: above7Obj.rate,
    aboveOrEqual7Display: above7Obj.display,
    aboveOrEqual7PctOnlyDisplay: above7Obj.pctOnlyDisplay,
    score10Count,
    score10Display,
    score0Count,
    score0Display,
    scoreLte1Count,
    scoreLte1Rate: scoreLte1Obj.rate,
    scoreLte1Display,
    scoreLte1PctOnlyDisplay: scoreLte1Obj.pctOnlyDisplay,
  }
}

/**
 * Xây dựng 11 hàng chỉ số cho bảng Thống kê cơ bản từ danh sách cặp khối [Cơ sở | Hệ thống]
 */
export function buildBasicStatsIndicatorRows(
  gradePairs: BasicStatsGradePair[],
  levelTotalPair?: BasicStatsGradePair
): BasicStatsIndicatorRow[] {
  const allPairs = levelTotalPair ? [...gradePairs, levelTotalPair] : gradePairs
  const definitions: Array<{
    key: BasicIndicatorKey
    order: number
    label: string
    description: string
    pick: (stats: BasicColumnStats) => { display: string; raw?: number | null }
  }> = [
    {
      key: "VALID_COUNT",
      order: 1,
      label: "Số HS có điểm",
      description: "Tổng số học sinh có kết quả hợp lệ trên thang điểm 10 [0, 10]",
      pick: (s) => ({ display: s.validCountDisplay, raw: s.validCount }),
    },
    {
      key: "MEAN",
      order: 2,
      label: "Điểm trung bình",
      description: "Điểm trung bình cộng của tất cả học sinh có điểm hợp lệ trong cột",
      pick: (s) => ({ display: s.meanDisplay, raw: s.mean }),
    },
    {
      key: "MEDIAN",
      order: 3,
      label: "Điểm trung vị",
      description: "Giá trị ở giữa sau khi sắp xếp điểm tăng dần (hoặc trung bình cộng 2 giá trị giữa nếu chẵn)",
      pick: (s) => ({ display: s.medianDisplay, raw: s.median }),
    },
    {
      key: "STD_DEV",
      order: 4,
      label: "Độ lệch chuẩn",
      description: "Độ lệch chuẩn tổng thể (σ) phản ánh mức độ phân tán điểm quanh trung bình cột",
      pick: (s) => ({ display: s.stdDevDisplay, raw: s.stdDev }),
    },
    {
      key: "MAD",
      order: 5,
      label: "Độ lệch tuyệt đối trung vị (MAD)",
      description: "Trung bình độ lệch tuyệt đối của điểm từng học sinh so với điểm trung vị",
      pick: (s) => ({ display: s.madDisplay, raw: s.mad }),
    },
    {
      key: "MODE",
      order: 6,
      label: "Điểm có nhiều HS đạt nhất",
      description: "Mức điểm có tần suất xuất hiện cao nhất kèm số học sinh đạt mức điểm đó",
      pick: (s) => ({ display: s.modeDisplay, raw: s.modes[0]?.score ?? null }),
    },
    {
      key: "RATE_BELOW_5",
      order: 7,
      label: "Tỷ lệ đạt dưới 5 điểm",
      description: "Số học sinh có điểm < 5 chia cho tổng số học sinh có điểm hợp lệ trong cột",
      pick: (s) => ({ display: s.below5Display, raw: s.below5Rate }),
    },
    {
      key: "RATE_ABOVE_7",
      order: 8,
      label: "Tỷ lệ đạt từ 7 điểm trở lên",
      description: "Số học sinh có điểm ≥ 7 chia cho tổng số học sinh có điểm hợp lệ trong cột",
      pick: (s) => ({ display: s.aboveOrEqual7Display, raw: s.aboveOrEqual7Rate }),
    },
    {
      key: "COUNT_10",
      order: 9,
      label: "Số HS đạt điểm 10",
      description: "Số học sinh đạt điểm tuyệt đối 10 trên thang điểm 10",
      pick: (s) => ({ display: s.score10Display, raw: s.score10Count }),
    },
    {
      key: "COUNT_0",
      order: 10,
      label: "Số HS đạt điểm 0",
      description: "Số học sinh có điểm hợp lệ bằng 0",
      pick: (s) => ({ display: s.score0Display, raw: s.score0Count }),
    },
    {
      key: "COUNT_LTE_1",
      order: 11,
      label: "Học sinh đạt điểm ≤ 1",
      description: "Số học sinh có điểm hợp lệ từ 0 đến 1 (≤ 1 điểm) trên thang điểm 10",
      pick: (s) => ({ display: s.scoreLte1Display, raw: s.scoreLte1Count }),
    },
  ]

  return definitions.map((def) => {
    const cellsByGrade: Record<
      number,
      {
        campusDisplay: string
        systemDisplay: string
        campusRaw?: number | null
        systemRaw?: number | null
      }
    > = {}

    for (const gp of allPairs) {
      const cVal = def.pick(gp.campusStats)
      const sVal = def.pick(gp.systemStats)
      cellsByGrade[gp.gradeNumber] = {
        campusDisplay: cVal.display,
        systemDisplay: sVal.display,
        campusRaw: cVal.raw,
        systemRaw: sVal.raw,
      }
    }

    return {
      key: def.key,
      order: def.order,
      label: def.label,
      description: def.description,
      cellsByGrade,
    }
  })
}

/**
 * Danh mục khối chuẩn theo Bậc học.
 * - Tiểu học (TIEU_HOC): mặc định Khối 1, 2, 3, 4 (và bổ sung Khối 5 nếu hệ thống có lớp Khối 5).
 * - THCS: Khối 6, 7, 8, 9.
 * - THPT: Khối 10, 11, 12.
 */
export function resolveTargetGradesForLevel(
  level: string,
  availableGradesInLevel?: number[]
): number[] {
  const norm = String(level || "TIEU_HOC").toUpperCase().trim()
  if (norm === "TIEU_HOC") {
    if (availableGradesInLevel && availableGradesInLevel.includes(5)) {
      return [1, 2, 3, 4, 5]
    }
    return [1, 2, 3, 4]
  }
  if (norm === "THCS") return [6, 7, 8, 9]
  if (norm === "THPT") return [10, 11, 12]
  return [1, 2, 3, 4]
}

const LEVEL_NAMES: Record<string, string> = {
  TIEU_HOC: "Tiểu học",
  THCS: "Trung học cơ sở (THCS)",
  THPT: "Trung học phổ thông (THPT)",
}

/**
 * Truy vấn và tính toán Báo cáo "Thống kê cơ bản" (Đối chiếu Cơ sở đang chọn với Hệ thống theo từng Khối)
 */
export async function generateBasicStatsReport(
  input: BasicStatsFilterInput,
  accessScope: ThkqAccessScope
) {
  if (!accessScope.canViewReport) {
    const err = new Error("FORBIDDEN: Tài khoản không có quyền xem báo cáo thống kê khảo sát.")
    ;(err as any).statusCode = 403
    throw err
  }

  const { academicYearId } = input
  if (!academicYearId) {
    throw new Error("Thiếu thông tin năm học (academicYearId).")
  }

  // 1. Kiểm tra phân quyền Cơ sở nghiêm ngặt ở phía máy chủ
  if (
    input.campusId &&
    input.campusId !== "ALL" &&
    accessScope.isCampusRestricted &&
    !accessScope.allowedCampusIds.includes(input.campusId)
  ) {
    const err = new Error("FORBIDDEN_CAMPUS: Tài khoản không được cấp quyền xem dữ liệu của cơ sở này.")
    ;(err as any).statusCode = 403
    throw err
  }

  // 2. Tải dữ liệu danh mục từ SSM
  const [academicYear, allCampusesInSystem, allSubjects, allGradeConfigs, allActiveClasses] =
    await Promise.all([
      prisma.academicYear.findUnique({
        where: { id: academicYearId },
        select: { id: true, name: true, status: true },
      }),
      prisma.campus.findMany({
        where: { status: "ACTIVE" },
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
        select: {
          id: true,
          subjectCode: true,
          subjectName: true,
          level: true,
          category: true,
          evaluationType: true,
        },
      }),
      prisma.subjectGradeConfig.findMany({
        where: { academicYearId, isActive: true },
      }),
      prisma.class.findMany({
        where: { academicYearId, status: "ACTIVE" },
        select: {
          id: true,
          className: true,
          classCode: true,
          grade: true,
          level: true,
          campusId: true,
          campus: { select: { id: true, campusCode: true, campusName: true } },
          teachingAssignments: { select: { subjectId: true } },
        },
      }),
    ])

  if (!academicYear) {
    throw new Error("Không tìm thấy năm học đã chọn.")
  }

  // Danh sách Cơ sở người dùng được phép chọn
  const allowedCampuses = accessScope.isCampusRestricted
    ? allCampusesInSystem.filter((c) => accessScope.allowedCampusIds.includes(c.id))
    : allCampusesInSystem

  if (allowedCampuses.length === 0) {
    const err = new Error("FORBIDDEN_CAMPUS: Tài khoản chưa được phân quyền cơ sở nào.")
    ;(err as any).statusCode = 403
    throw err
  }

  // 3. Danh mục Kỳ khảo sát
  const entryPeriodRows = await prisma.subjectGradeEntry
    .groupBy({
      by: ["evaluationPeriod"],
      where: { academicYearId },
      _count: { _all: true },
    })
    .catch(() => [])

  const PERIOD_CATALOG = [
    { code: "GK1", label: "Giữa kỳ 1 (GK1)" },
    { code: "CK1", label: "Cuối kỳ 1 (CK1)" },
    { code: "GK2", label: "Giữa kỳ 2 (GK2)" },
    { code: "CK2", label: "Cuối kỳ 2 (CK2)" },
    { code: "KSĐN", label: "Khảo sát đầu năm (KSĐN)" },
  ]

  const availablePeriods = PERIOD_CATALOG.map((p) => {
    const entryCount =
      (entryPeriodRows.find((r: any) => r.evaluationPeriod === p.code)?._count?._all as number) || 0
    const hasConfig = allGradeConfigs.some((c: any) => c.evaluationPeriod === p.code)
    return {
      ...p,
      hasData: entryCount > 0,
      hasConfig,
      entryCount,
    }
  })

  // Chọn Kỳ khảo sát hợp lệ
  let resolvedPeriod = input.evaluationPeriod || "GK1"
  if (!availablePeriods.some((p) => p.code === resolvedPeriod)) {
    resolvedPeriod =
      availablePeriods.find((p) => p.hasData)?.code || availablePeriods[0]?.code || "GK1"
  }

  // 4. Chuẩn hóa thông tin Khối & Bậc học của tất cả lớp trong hệ thống
  const enrichedSystemClasses = allActiveClasses.map((cls: any) => {
    const gNum = extractGradeNumber(cls.grade) || extractGradeNumber(cls.className) || 1
    const lvl = resolveEducationLevel(cls.level, cls.grade, cls.className)
    return {
      ...cls,
      resolvedLevel: lvl,
      gradeNumber: gNum,
    }
  })

  // Danh mục Bậc học hợp lệ theo phạm vi người dùng
  const allowedCampusIdSet = new Set(allowedCampuses.map((c) => c.id))
  const userScopedClasses = enrichedSystemClasses.filter(
    (c: any) =>
      allowedCampusIdSet.has(c.campusId) &&
      (!accessScope.isClassRestricted || accessScope.allowedClassIds.includes(c.id))
  )

  const availableLevels = (["TIEU_HOC", "THCS", "THPT"] as const)
    .map((lvlCode) => {
      const classesInLvl = userScopedClasses.filter((c: any) => c.resolvedLevel === lvlCode)
      return {
        code: lvlCode,
        label: LEVEL_NAMES[lvlCode] || lvlCode,
        classCount: classesInLvl.length,
      }
    })
    .filter((l) => l.classCount > 0 || l.code === "TIEU_HOC")

  let resolvedLevel = input.level || "TIEU_HOC"
  if (!availableLevels.some((l) => l.code === resolvedLevel)) {
    resolvedLevel = availableLevels[0]?.code || "TIEU_HOC"
  }

  // 5. Chọn Cơ sở hợp lệ trong danh sách cơ sở được cấp quyền
  const isAllSystemSelected = input.campusId === "ALL"
  let resolvedCampus =
    (!isAllSystemSelected && allowedCampuses.find((c) => c.id === input.campusId)) ||
    allowedCampuses.find(
      (c) =>
        userScopedClasses.some(
          (cls: any) => cls.campusId === c.id && cls.resolvedLevel === resolvedLevel
        )
    ) ||
    allowedCampuses[0]

  const resolvedCampusId = resolvedCampus.id

  // Lọc danh sách Cơ sở có đào tạo bậc học đang chọn (hoặc hiển thị toàn bộ cơ sở được phép xem)
  const availableCampuses = allowedCampuses.map((c) => {
    const classCountInLevel = userScopedClasses.filter(
      (cls: any) => cls.campusId === c.id && cls.resolvedLevel === resolvedLevel
    ).length
    return {
      id: c.id,
      campusCode: c.campusCode,
      campusName: c.campusName,
      classCountInLevel,
    }
  })

  // 6. Xác định Danh sách Môn hợp lệ theo Kỳ khảo sát -> Bậc học -> Cơ sở
  const periodCandidates =
    resolvedPeriod === "GK1" || resolvedPeriod === "CK1"
      ? [resolvedPeriod, "HK1"]
      : resolvedPeriod === "GK2" || resolvedPeriod === "CK2"
      ? [resolvedPeriod, "HK2"]
      : [resolvedPeriod]

  // Thống kê số lượng bản ghi điểm của từng môn ở bậc học đang chọn trong kỳ
  const systemClassesInLevel = enrichedSystemClasses.filter(
    (c: any) => c.resolvedLevel === resolvedLevel
  )
  const systemClassIdsInLevel = systemClassesInLevel.map((c: any) => c.id)
  const availableGradesInLevel = Array.from(
    new Set(systemClassesInLevel.map((c: any) => c.gradeNumber))
  )

  const targetGrades = resolveTargetGradesForLevel(resolvedLevel, availableGradesInLevel)
  const targetGradeLabels = new Set(
    targetGrades.flatMap((g) => [`Khối ${g}`, `K${g}`, String(g), "ALL"])
  )

  const subjectEntryCounts =
    systemClassIdsInLevel.length > 0
      ? await prisma.subjectGradeEntry
          .groupBy({
            by: ["subjectId"],
            where: {
              academicYearId,
              evaluationPeriod: resolvedPeriod,
              classId: { in: systemClassIdsInLevel },
            },
            _count: { _all: true },
          })
          .catch(() => [])
      : []

  const entryCountBySubject = new Map<string, number>()
  subjectEntryCounts.forEach((r: any) => {
    entryCountBySubject.set(
      r.subjectId,
      (entryCountBySubject.get(r.subjectId) || 0) + (r._count?._all || 0)
    )
  })

  const classesOfSelectedCampusInLevel = systemClassesInLevel.filter(
    (c: any) => c.campusId === resolvedCampusId
  )
  const assignedSubjectIdsAtCampus = new Set<string>()
  classesOfSelectedCampusInLevel.forEach((c: any) => {
    ;(c.teachingAssignments || []).forEach((ta: any) => {
      if (ta.subjectId) assignedSubjectIdsAtCampus.add(ta.subjectId)
    })
  })

  const configuredSubjectIdsForPeriodAndLevel = new Set<string>()
  allGradeConfigs.forEach((cfg: any) => {
    const matchPeriod =
      cfg.evaluationPeriod === resolvedPeriod ||
      periodCandidates.includes(cfg.evaluationPeriod) ||
      cfg.evaluationPeriod === "ALL"
    const cfgGradeNum = extractGradeNumber(cfg.grade)
    const matchGrade =
      !cfg.grade ||
      cfg.grade === "ALL" ||
      targetGradeLabels.has(String(cfg.grade).trim()) ||
      (cfgGradeNum !== null && targetGrades.includes(cfgGradeNum)) ||
      (resolvedLevel === "TIEU_HOC" && cfgGradeNum === 5)
    if (matchPeriod && matchGrade && cfg.confirmationStatus !== "UNCONFIRMED") {
      configuredSubjectIdsForPeriodAndLevel.add(cfg.subjectId)
    }
  })

  const availableSubjects = allSubjects
    .filter((sub: any) => {
      const hasEntries = (entryCountBySubject.get(sub.id) || 0) > 0
      const hasConfig = configuredSubjectIdsForPeriodAndLevel.has(sub.id)
      const hasCampusAssignment = assignedSubjectIdsAtCampus.has(sub.id)

      // 1. Nếu môn đã có dữ liệu điểm thực tế trong bậc học & kỳ đang chọn -> luôn hiển thị
      if (hasEntries) return true

      // 2. Nếu môn đã được cấu hình trong SubjectGradeConfig hoặc phân công giảng dạy của bậc học -> hiển thị
      if (hasConfig || hasCampusAssignment) return true

      // 3. Kiểm tra theo cấp học / danh mục môn của SSM
      const subLvl = String(sub.level || "ALL").toUpperCase().trim()
      const matchesSubLevelField =
        subLvl === "ALL" ||
        subLvl === resolvedLevel ||
        (resolvedLevel === "TIEU_HOC" &&
          (subLvl.includes("TIỂU") || subLvl.includes("TIEU") || subLvl.includes("PRIMARY"))) ||
        (resolvedLevel === "THCS" && (subLvl.includes("THCS") || subLvl.includes("CƠ SỞ"))) ||
        (resolvedLevel === "THPT" && (subLvl.includes("THPT") || subLvl.includes("PHỔ THÔNG")))

      if (resolvedLevel === "TIEU_HOC") {
        return (
          targetGrades.some((g) => isPrimarySubjectForGrade(sub, `Khối ${g}`)) ||
          matchesSubLevelField
        )
      }
      if (resolvedLevel === "THCS") {
        return isSecondarySubjectForGrade(sub, "Khối 6") && matchesSubLevelField
      }
      if (resolvedLevel === "THPT") {
        return isSecondarySubjectForGrade(sub, "Khối 10") && matchesSubLevelField
      }
      return matchesSubLevelField
    })
    .map((sub: any) => ({
      id: sub.id,
      subjectCode: sub.subjectCode,
      subjectName: sub.subjectName,
      entryCount: entryCountBySubject.get(sub.id) || 0,
    }))
    .sort((a, b) => {
      if (b.entryCount !== a.entryCount) {
        return b.entryCount - a.entryCount
      }
      return a.subjectName.localeCompare(b.subjectName, "vi")
    })

  // Chỉ giữ môn học còn hợp lệ khi bộ lọc thay đổi
  let resolvedSubject = availableSubjects.find((s) => s.id === input.subjectId)
  if (!resolvedSubject && availableSubjects.length > 0) {
    resolvedSubject =
      availableSubjects.find(
        (s) => s.entryCount > 0 && s.subjectName.toLowerCase().includes("tiếng việt")
      ) ||
      availableSubjects.find(
        (s) => s.entryCount > 0 && s.subjectName.toLowerCase().includes("toán")
      ) ||
      availableSubjects.find((s) => s.entryCount > 0) ||
      availableSubjects.find((s) => s.subjectName.toLowerCase().includes("tiếng việt")) ||
      availableSubjects.find((s) => s.subjectName.toLowerCase().includes("toán")) ||
      availableSubjects[0]
  }

  const resolvedSubjectId = resolvedSubject?.id || ""

  // 7. Truy vấn kết quả khảo sát thực tế từ nguồn chính thức của SSM cho môn + kỳ + các khối mục tiêu
  const targetSystemClasses = systemClassesInLevel.filter((c: any) =>
    targetGrades.includes(c.gradeNumber)
  )
  const targetSystemClassIds = targetSystemClasses.map((c: any) => c.id)
  const classById = new Map<string, any>(targetSystemClasses.map((c: any) => [c.id, c]))

  const [rawEntries, fallbackTermScores] =
    resolvedSubjectId && targetSystemClassIds.length > 0
      ? await Promise.all([
          prisma.subjectGradeEntry.findMany({
            where: {
              academicYearId,
              subjectId: resolvedSubjectId,
              evaluationPeriod: { in: periodCandidates },
              classId: { in: targetSystemClassIds },
            },
            include: {
              student: {
                select: {
                  id: true,
                  status: true,
                  classId: true,
                  campusId: true,
                },
              },
            },
            orderBy: { updatedAt: "desc" },
          }),
          resolvedSubject
            ? prisma.studentTermScore
                .findMany({
                  where: {
                    subjectId: resolvedSubjectId,
                    semester: { in: periodCandidates },
                    student: {
                      academicYearId,
                      classId: { in: targetSystemClassIds },
                    },
                  },
                  include: {
                    student: {
                      select: {
                        id: true,
                        status: true,
                        classId: true,
                        campusId: true,
                      },
                    },
                  },
                })
                .catch(() => [])
            : Promise.resolve([]),
        ])
      : [[], []]

  const subjectConfigs = allGradeConfigs.filter(
    (c: any) =>
      c.subjectId === resolvedSubjectId &&
      (c.evaluationPeriod === resolvedPeriod ||
        periodCandidates.includes(c.evaluationPeriod) ||
        c.evaluationPeriod === "ALL") &&
      c.confirmationStatus !== "UNCONFIRMED"
  )

  // Gom nhóm các bản ghi theo studentId để đảm bảo mỗi học sinh chỉ đóng góp tối đa 1 điểm chính thức
  const entriesByStudentId = new Map<string, any[]>()
  for (const entry of rawEntries) {
    if (!entry.studentId) continue
    // Bỏ qua học sinh đã nghỉ học / chuyển trường (nếu trạng thái khác ACTIVE)
    if (entry.student && entry.student.status && entry.student.status !== "ACTIVE") {
      continue
    }
    const list = entriesByStudentId.get(entry.studentId) || []
    list.push(entry)
    entriesByStudentId.set(entry.studentId, list)
  }

  // Lưu 1 kết quả hợp lệ duy nhất cho mỗi học sinh: { studentId, gradeNumber, campusId, score }
  const reconciledStudentScores = new Map<
    string,
    { studentId: string; gradeNumber: number; campusId: string; score: number }
  >()

  entriesByStudentId.forEach((studentEntries, studentId) => {
    // Ưu tiên bản ghi khớp chính xác resolvedPeriod trước
    const exactEntries = studentEntries.filter((e) => e.evaluationPeriod === resolvedPeriod)
    const candidates = exactEntries.length > 0 ? exactEntries : studentEntries

    const firstEntry = candidates[0]
    const cls = classById.get(firstEntry.classId) || classById.get(firstEntry.student?.classId)
    if (!cls) return

    const gradeNumber = cls.gradeNumber
    const campusId = cls.campusId

    const vneduEntry = candidates.find((e) => e.configType === "VNEDU")
    const internalEntry = candidates.find((e) => e.configType !== "VNEDU")

    const matchConfigGrade = (cGrade: any) => {
      const gStr = String(cGrade || "").trim()
      if (!gStr || gStr === "ALL") return true
      if (gStr === `Khối ${gradeNumber}` || gStr === `K${gradeNumber}` || gStr === String(gradeNumber)) {
        return true
      }
      return extractGradeNumber(gStr) === gradeNumber
    }

    const vneduCfg = subjectConfigs.find(
      (c: any) => c.configType === "VNEDU" && matchConfigGrade(c.grade)
    )
    const internalCfg = subjectConfigs.find(
      (c: any) => c.configType !== "VNEDU" && matchConfigGrade(c.grade)
    )

    // Ưu tiên nguồn điểm chính thức VNEDU nếu có điểm hợp lệ, sau đó đến INTERNAL
    const tryExtractValidScore = (entryObj: any, cfgObj: any): number | null => {
      if (!entryObj) return null
      const extracted = extractScoreFromGradeEntry(entryObj, resolvedPeriod, "OFFICIAL", cfgObj)
      const parsed = parseRawStudentTestStatus({
        rawScoreVal: extracted.rawScoreVal,
        remarkText: entryObj.remark,
        ratingText: entryObj.rating,
        roundingRule: extracted.roundingRule,
        maxScore: extracted.maxScore,
      })
      if (
        parsed.statusInTest === "VALID_SCORE" &&
        parsed.officialScore !== null &&
        !Number.isNaN(parsed.officialScore) &&
        parsed.officialScore >= 0 &&
        parsed.officialScore <= 10
      ) {
        return parsed.officialScore
      }
      return null
    }

    let officialScore = tryExtractValidScore(vneduEntry, vneduCfg)
    if (officialScore === null) {
      officialScore = tryExtractValidScore(internalEntry, internalCfg)
    }

    if (officialScore !== null) {
      reconciledStudentScores.set(studentId, {
        studentId,
        gradeNumber,
        campusId,
        score: officialScore,
      })
    }
  })

  // Bổ sung từ fallbackTermScores nếu học sinh chưa có trong SubjectGradeEntry
  for (const ts of fallbackTermScores as any[]) {
    if (!ts.studentId || reconciledStudentScores.has(ts.studentId)) continue
    if (ts.student?.status && ts.student.status !== "ACTIVE") continue
    const cls = classById.get(ts.student?.classId)
    if (!cls) continue

    const parsed = parseRawStudentTestStatus({
      rawScoreVal: ts.score,
      remarkText: ts.comment,
      roundingRule: null,
      maxScore: 10,
    })
    if (
      parsed.statusInTest === "VALID_SCORE" &&
      parsed.officialScore !== null &&
      parsed.officialScore >= 0 &&
      parsed.officialScore <= 10
    ) {
      reconciledStudentScores.set(ts.studentId, {
        studentId: ts.studentId,
        gradeNumber: cls.gradeNumber,
        campusId: cls.campusId,
        score: parsed.officialScore,
      })
    }
  }

  if (resolvedSubject) {
    resolvedSubject.entryCount = reconciledStudentScores.size
  }

  // 8. Tính toán 7 chỉ số cho từng Khối: [Cơ sở đang chọn] và [Hệ thống]
  const campusShortLabel = resolvedCampus.campusCode || resolvedCampus.campusName
  const allCampusScoresInLevel: number[] = []
  const allSystemScoresInLevel: number[] = []

  const gradePairs: BasicStatsGradePair[] = targetGrades.map((gNum) => {
    const campusScores: number[] = []
    const systemScores: number[] = []

    reconciledStudentScores.forEach((rec) => {
      if (rec.gradeNumber === gNum) {
        systemScores.push(rec.score)
        allSystemScoresInLevel.push(rec.score)
        if (rec.campusId === resolvedCampusId) {
          campusScores.push(rec.score)
          allCampusScoresInLevel.push(rec.score)
        }
      }
    })

    return {
      gradeNumber: gNum,
      gradeCode: `K${gNum}`,
      gradeLabel: `Khối ${gNum}`,
      campusColumnLabel: campusShortLabel,
      systemColumnLabel: "Hệ thống",
      campusStats: computeColumnBasicStats(campusScores),
      systemStats: computeColumnBasicStats(systemScores),
    }
  })

  // Khối hệ thống (cộng gộp tất cả các Khối của các cơ sở trong bậc học đang chọn)
  const levelTotalPair: BasicStatsGradePair = {
    gradeNumber: 0,
    gradeCode: "ALL_GRADES",
    gradeLabel: "Khối hệ thống (Tất cả khối)",
    campusColumnLabel: campusShortLabel,
    systemColumnLabel: "Hệ thống",
    campusStats: computeColumnBasicStats(allCampusScoresInLevel),
    systemStats: computeColumnBasicStats(allSystemScoresInLevel),
  }

  const indicatorRows = buildBasicStatsIndicatorRows(gradePairs, levelTotalPair)

  // 9. Tổng hợp Phổ điểm 8 nhóm theo bộ lọc Kỳ khảo sát · Bậc học · Môn · Khối · Cơ sở
  const availableGrades = targetGrades.map((g) => ({
    code: String(g),
    gradeNumber: g,
    label: `Khối ${g}`,
  }))

  let resolvedGrade = "ALL"
  if (input.grade && input.grade !== "ALL") {
    const gNum = extractGradeNumber(input.grade)
    if (gNum !== null && targetGrades.includes(gNum)) {
      resolvedGrade = String(gNum)
    }
  }

  const targetGradeNumForDist = resolvedGrade === "ALL" ? null : Number(resolvedGrade)
  const distCampusScores: number[] = []
  const distSystemScores: number[] = []

  reconciledStudentScores.forEach((rec) => {
    if (targetGradeNumForDist !== null && rec.gradeNumber !== targetGradeNumForDist) {
      return
    }
    distSystemScores.push(rec.score)
    if (isAllSystemSelected || rec.campusId === resolvedCampusId) {
      distCampusScores.push(rec.score)
    }
  })

  const campusDistribution = computeScoreDistribution8Buckets(distCampusScores)
  const systemDistribution = computeScoreDistribution8Buckets(distSystemScores)
  const campusFrequency025 = computeFrequencyTable025(distCampusScores)
  const systemFrequency025 = computeFrequencyTable025(distSystemScores)
  const campusBasicStats = computeColumnBasicStats(distCampusScores)
  const systemBasicStats = computeColumnBasicStats(distSystemScores)

  const appliedCampusId = isAllSystemSelected ? "ALL" : resolvedCampus.id

  return {
    meta: {
      academicYearId: academicYear.id,
      academicYearName: academicYear.name,
      evaluationPeriod: resolvedPeriod,
      evaluationPeriodLabel:
        availablePeriods.find((p) => p.code === resolvedPeriod)?.label || resolvedPeriod,
      level: resolvedLevel,
      levelLabel: LEVEL_NAMES[resolvedLevel] || resolvedLevel,
      subjectId: resolvedSubjectId,
      subjectCode: resolvedSubject?.subjectCode || "",
      subjectName: resolvedSubject?.subjectName || "Chưa chọn môn",
      grade: resolvedGrade,
      gradeLabel: resolvedGrade === "ALL" ? "Tất cả khối" : `Khối ${resolvedGrade}`,
      campusId: appliedCampusId,
      campusCode: isAllSystemSelected ? "ALL" : resolvedCampus.campusCode,
      campusName: isAllSystemSelected ? "Toàn hệ thống" : resolvedCampus.campusName,
      comparisonCampusCode: resolvedCampus.campusCode,
      comparisonCampusName: resolvedCampus.campusName,
      isAllSystemSelected,
      generatedAt: new Date().toISOString(),
    },
    filterOptions: {
      periods: availablePeriods,
      levels: availableLevels,
      subjects: availableSubjects,
      grades: availableGrades,
      campuses: availableCampuses,
    },
    appliedFilters: {
      academicYearId: academicYear.id,
      evaluationPeriod: resolvedPeriod,
      level: resolvedLevel,
      subjectId: resolvedSubjectId,
      grade: resolvedGrade,
      campusId: appliedCampusId,
    },
    gradePairs,
    levelTotalPair,
    indicatorRows,
    scoreDistribution: {
      isAllSystemSelected,
      selectedGrade: resolvedGrade,
      selectedGradeLabel: resolvedGrade === "ALL" ? "Tất cả khối" : `Khối ${resolvedGrade}`,
      campusLabel: isAllSystemSelected ? "Toàn hệ thống" : campusShortLabel,
      systemLabel: "Toàn hệ thống",
      campusDistribution,
      systemDistribution,
      campusFrequency025,
      systemFrequency025,
      campusBasicStats,
      systemBasicStats,
    },
  }
}
