/**
 * THƯ VIỆN TOÁN THỐNG KÊ GIÁO DỤC CHUẨN MỰC (EDUCATIONAL PSYCHOMETRICS & STATISTICAL ENGINE)
 * Phục vụ phân tích phân tán năng lực học sinh (Scatter Plot) cho Hệ thống Giáo dục Sky-Line & GDPT 2018.
 */

export interface Point2D {
  id: string
  x: number
  y: number
  [key: string]: any
}

export interface StatisticalSummary {
  n: number
  meanX: number
  meanY: number
  medianX: number
  medianY: number
  stdDevX: number
  stdDevY: number
  cvX: number // %
  cvY: number // %
  pearsonR: number
  rSquared: number
  regression: {
    slope: number
    intercept: number
    equation: string
  }
}

export type QuadrantType = "Q1" | "Q2" | "Q3" | "Q4"

export interface QuadrantDefinition {
  code: QuadrantType
  name: string
  label: string
  tagline: string
  color: string
  bgColor: string
  borderColor: string
  textColor: string
  description: string
  pedagogicalAction: string
}

/**
 * Danh mục định nghĩa 4 góc phần tư theo chuẩn chất lượng cao Sky-Line & GDPT 2018
 */
export const SKYLINE_QUADRANTS: Record<QuadrantType, QuadrantDefinition> = {
  Q1: {
    code: "Q1",
    name: "Sky-Line Honor",
    label: "Góc I: Vượt trội & Bền vững",
    tagline: "Duy trì phong độ cao trên cả 2 chiều đánh giá",
    color: "#059669",
    bgColor: "bg-emerald-50/80",
    borderColor: "border-emerald-200",
    textColor: "text-emerald-800",
    description: "Học sinh đạt chuẩn vững chắc ở cả 2 thước đo (hoặc cả ĐGTX và ĐGĐK). Nắm vững Yêu cầu cần đạt, năng lực tự chủ cao.",
    pedagogicalAction: "Bồi dưỡng học sinh giỏi, tạo nguồn dự thi học thuật quốc gia/quốc tế, câu lạc bộ tài năng, xét học bổng danh dự Sky-Line."
  },
  Q2: {
    code: "Q2",
    name: "Sky-Line Rising",
    label: "Góc II: Bứt phá Năng lực",
    tagline: "Tiến bộ vượt bậc hoặc thi tốt hơn quá trình",
    color: "#0284C7",
    bgColor: "bg-sky-50/80",
    borderColor: "border-sky-200",
    textColor: "text-sky-800",
    description: "Học sinh có sự bứt phá ngoạn mục từ dưới chuẩn lên trên chuẩn (hoặc có năng lực thi cử tốt hơn điểm đánh giá quá trình).",
    pedagogicalAction: "Khen thưởng kịp thời, phân tích phương pháp học tập hiệu quả để nhân rộng mô hình, củng cố tính chuyên cần thường xuyên."
  },
  Q3: {
    code: "Q3",
    name: "Sky-Line Priority Support",
    label: "Góc III: Can thiệp Trọng điểm",
    tagline: "Dưới chuẩn liên tục hoặc dưới sàn 5.0đ",
    color: "#DC2626",
    bgColor: "bg-rose-50/80",
    borderColor: "border-rose-200",
    textColor: "text-rose-800",
    description: "Học sinh hổng kiến thức cốt lõi, điểm số ở cả 2 chiều khảo sát đều dưới chuẩn Sky-Line hoặc dưới mức Đạt (<5.0đ). Ưu tiên can thiệp số 1.",
    pedagogicalAction: "Kích hoạt kế hoạch phụ đạo bổ trợ 1-1, lập Phiếu cam kết học tập cá nhân hóa, GVCN & GVBM hội chẩn nguyên nhân cùng gia đình."
  },
  Q4: {
    code: "Q4",
    name: "Sky-Line Attention",
    label: "Góc IV: Sa sút Bất thường",
    tagline: "Quá trình tốt nhưng thi kém, hoặc tụt dốc so với kỳ trước",
    color: "#D97706",
    bgColor: "bg-amber-50/80",
    borderColor: "border-amber-200",
    textColor: "text-amber-800",
    description: "Học sinh điểm quá trình tốt nhưng bài thi định kỳ sụt giảm nghiêm trọng, hoặc kỳ trước đạt tốt nhưng kỳ này bị rơi chuẩn.",
    pedagogicalAction: "Giải tỏa rào cản tâm lý phòng thi, rèn kỹ năng làm bài thi độc lập theo ma trận đề, tìm hiểu biến cố sức khỏe/gia đình."
  }
}

/**
 * Tính điểm trung bình cộng (Mean)
 */
export function calculateMean(values: number[]): number {
  if (!values || values.length === 0) return 0
  const sum = values.reduce((acc, val) => acc + val, 0)
  return Math.round((sum / values.length) * 100) / 100
}

/**
 * Tính Trung vị (Median)
 */
export function calculateMedian(values: number[]): number {
  if (!values || values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100
  }
  return Math.round(sorted[mid] * 100) / 100
}

/**
 * Tính Phương sai (Variance) và Độ lệch chuẩn (Standard Deviation)
 * Sử dụng công thức mẫu hiệu chỉnh (Sample StdDev với n - 1)
 */
export function calculateStdDev(values: number[]): number {
  if (!values || values.length < 2) return 0
  const mean = calculateMean(values)
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
  const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / (values.length - 1)
  return Math.round(Math.sqrt(variance) * 100) / 100
}

/**
 * Tính Hệ số biến thiên (Coefficient of Variation - CV%)
 * CV% = (StdDev / Mean) * 100%
 */
export function calculateCV(mean: number, stdDev: number): number {
  if (!mean || mean <= 0) return 0
  return Math.round((stdDev / mean) * 1000) / 10
}

/**
 * Tính Hệ số tương quan tuyến tính Pearson (r)
 * Giá trị nằm trong khoảng [-1, 1]
 */
export function calculatePearsonCorrelation(pairs: Array<{ x: number; y: number }>): number {
  const n = pairs.length
  if (n < 2) return 0

  const xs = pairs.map(p => p.x)
  const ys = pairs.map(p => p.y)

  const meanX = calculateMean(xs)
  const meanY = calculateMean(ys)

  let numerator = 0
  let denomX = 0
  let denomY = 0

  for (let i = 0; i < n; i++) {
    const diffX = pairs[i].x - meanX
    const diffY = pairs[i].y - meanY
    numerator += diffX * diffY
    denomX += diffX * diffX
    denomY += diffY * diffY
  }

  const denominator = Math.sqrt(denomX * denomY)
  if (denominator === 0) return 0

  const r = numerator / denominator
  return Math.round(r * 1000) / 1000
}

/**
 * Tính Phương trình Hồi quy Tuyến tính OLS (Ordinary Least Squares)
 * Y = slope * X + intercept
 */
export function calculateLinearRegression(pairs: Array<{ x: number; y: number }>): {
  slope: number
  intercept: number
  rSquared: number
  equation: string
  predict: (x: number) => number
} {
  const n = pairs.length
  if (n < 2) {
    return {
      slope: 1,
      intercept: 0,
      rSquared: 0,
      equation: "Y = 1.00X + 0.00",
      predict: (x: number) => x
    }
  }

  const xs = pairs.map(p => p.x)
  const ys = pairs.map(p => p.y)

  const meanX = calculateMean(xs)
  const meanY = calculateMean(ys)

  let numerator = 0
  let denominator = 0

  for (let i = 0; i < n; i++) {
    const diffX = pairs[i].x - meanX
    const diffY = pairs[i].y - meanY
    numerator += diffX * diffY
    denominator += diffX * diffX
  }

  const slope = denominator === 0 ? 1 : numerator / denominator
  const intercept = meanY - slope * meanX
  const r = calculatePearsonCorrelation(pairs)
  const rSquared = Math.round(Math.pow(r, 2) * 1000) / 1000

  const roundedSlope = Math.round(slope * 100) / 100
  const roundedIntercept = Math.round(intercept * 100) / 100
  const sign = roundedIntercept >= 0 ? "+" : "-"
  const equation = `Y = ${roundedSlope}X ${sign} ${Math.abs(roundedIntercept)}`

  return {
    slope: roundedSlope,
    intercept: roundedIntercept,
    rSquared,
    equation,
    predict: (x: number) => Math.max(0, Math.min(10, Math.round((slope * x + intercept) * 100) / 100))
  }
}

/**
 * Nhận diện Điểm Ngoại lai (Pedagogical Outliers) bằng phương pháp Z-Score
 * Điểm có độ chênh lệch delta so với kỳ vọng lớn hơn 2.0 độ lệch chuẩn
 */
export function detectOutliers(points: Array<Point2D & { delta: number }>): Set<string> {
  const outlierIds = new Set<string>()
  if (points.length < 5) return outlierIds

  const deltas = points.map(p => p.delta)
  const meanDelta = calculateMean(deltas)
  const stdDelta = calculateStdDev(deltas)

  if (stdDelta === 0) return outlierIds

  points.forEach(p => {
    const zScore = Math.abs((p.delta - meanDelta) / stdDelta)
    if (zScore >= 2.0) {
      outlierIds.add(p.id)
    }
  })

  return outlierIds
}

/**
 * Phân loại góc phần tư (Quadrant) theo ngưỡng chuẩn kép
 */
export function classifyQuadrant(x: number, y: number, benchX: number, benchY: number): QuadrantType {
  if (x >= benchX && y >= benchY) return "Q1"
  if (x < benchX && y >= benchY) return "Q2"
  if (x < benchX && y < benchY) return "Q3"
  return "Q4"
}

/**
 * Xếp loại kết quả học tập môn học theo quy định GDPT 2018 (Thông tư 22/2021)
 */
export function getGDPT2018Classification(score: number | null): {
  level: "TOT" | "KHA" | "DAT" | "CHUA_DAT"
  label: string
  color: string
} {
  if (score === null || score === undefined || isNaN(score)) {
    return { level: "CHUA_DAT", label: "Chưa có điểm", color: "text-slate-400" }
  }
  if (score >= 8.0) {
    return { level: "TOT", label: "Tốt", color: "text-emerald-700 bg-emerald-50" }
  }
  if (score >= 6.5) {
    return { level: "KHA", label: "Khá", color: "text-sky-700 bg-sky-50" }
  }
  if (score >= 5.0) {
    return { level: "DAT", label: "Đạt", color: "text-amber-700 bg-amber-50" }
  }
  return { level: "CHUA_DAT", label: "Chưa đạt", color: "text-rose-700 bg-rose-50" }
}
