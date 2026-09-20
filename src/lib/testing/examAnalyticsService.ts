/**
 * examAnalyticsService.ts
 * Service lõi phân tích chất lượng khảo thí, phổ điểm, đối chuẩn cơ sở và phát hiện nguy cơ cho SSM.
 * Tuân thủ:
 * 1. ONE Quality Analytics Layer & ONE GAP Model.
 * 2. Phân biệt rõ "Điểm 0" vs "Chưa có điểm / Vắng".
 * 3. So sánh cơ sở dựa trên phân bố và phương sai (KHÔNG xếp hạng tùy tiện).
 * 4. Phát hiện sớm học sinh suy giảm học lực (At-risk) kèm phân tầng can thiệp.
 */

import { calculateSubjectGap, SubjectGapAnalysis } from "../advisory/advisoryGapService"
import { parseSubjectGoal } from "../advisory/subjectNormalization"

export interface ScoreDistributionBand {
  range: "<5.0" | "5.0-6.9" | "7.0-7.9" | "8.0-8.9" | "9.0-10.0"
  label: string
  min: number
  max: number
  count: number
  percentage: number
  colorClass: string
}

export interface DescriptiveStatistics {
  count: number
  gradedCount: number
  missingCount: number
  mean: number
  median: number
  stdDev: number
  min: number
  max: number
  passCount: number // >= 5.0
  passRate: number
  excellentCount: number // >= 8.0
  excellentRate: number
}

export interface TransitionMatrixCell {
  fromLevel: "GIOI" | "KHA" | "TRUNG_BINH" | "YEU"
  toLevel: "GIOI" | "KHA" | "TRUNG_BINH" | "YEU"
  studentCount: number
  percentage: number
  trend: "TIEN_BO" | "DUY_TRI" | "SUY_GIAM"
}

export interface AtRiskStudentAlert {
  studentId: string
  studentCode: string
  studentName: string
  className: string
  campusName: string
  subjectCode: string
  subjectName: string
  previousScore: number | null
  currentScore: number
  scoreDelta: number | null
  benchmarkScore: number
  riskLevel: "HIGH" | "MEDIUM" | "LOW"
  riskReason: string
  recommendedIntervention: {
    tier: 1 | 2 | 3
    tierLabel: string
    action: string
  }
}

export interface CampusQualityMetric {
  campusId: string
  campusCode: string
  campusName: string
  totalStudents: number
  gradedStudents: number
  meanScore: number
  passRate: number
  excellentRate: number
  stdDev: number
  systemMeanDelta: number // Campus Mean - System Mean
}

/**
 * Phân tích phổ điểm theo 5 dải điểm chuẩn của SSM K12
 */
export function calculateScoreDistribution(scores: (number | null | undefined)[]): {
  bands: ScoreDistributionBand[]
  stats: DescriptiveStatistics
} {
  const validScores: number[] = []
  let missingCount = 0

  scores.forEach(s => {
    if (typeof s === "number" && !isNaN(s)) {
      // Giới hạn trong thang 0 - 10
      const clamped = Math.max(0, Math.min(10, s))
      validScores.push(clamped)
    } else {
      missingCount++
    }
  })

  const total = validScores.length
  const bandsConfig = [
    { range: "<5.0" as const, label: "Chưa đạt (< 5.0)", min: 0, max: 4.99, colorClass: "text-red-700 bg-red-100 border-red-200" },
    { range: "5.0-6.9" as const, label: "Trung bình (5.0 - 6.9)", min: 5.0, max: 6.99, colorClass: "text-amber-800 bg-amber-100 border-amber-200" },
    { range: "7.0-7.9" as const, label: "Khá (7.0 - 7.9)", min: 7.0, max: 7.99, colorClass: "text-blue-800 bg-blue-100 border-blue-200" },
    { range: "8.0-8.9" as const, label: "Giỏi (8.0 - 8.9)", min: 8.0, max: 8.99, colorClass: "text-emerald-800 bg-emerald-100 border-emerald-200" },
    { range: "9.0-10.0" as const, label: "Xuất sắc (9.0 - 10.0)", min: 9.0, max: 10.0, colorClass: "text-purple-800 bg-purple-100 border-purple-200" }
  ]

  const bands: ScoreDistributionBand[] = bandsConfig.map(b => {
    const count = validScores.filter(s => s >= b.min && s <= b.max).length
    const percentage = total > 0 ? Math.round((count / total) * 1000) / 10 : 0
    return {
      range: b.range,
      label: b.label,
      min: b.min,
      max: b.max,
      count,
      percentage,
      colorClass: b.colorClass
    }
  })

  // Thống kê mô tả
  if (total === 0) {
    return {
      bands,
      stats: {
        count: scores.length,
        gradedCount: 0,
        missingCount,
        mean: 0,
        median: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        passCount: 0,
        passRate: 0,
        excellentCount: 0,
        excellentRate: 0
      }
    }
  }

  const sum = validScores.reduce((a, b) => a + b, 0)
  const mean = Math.round((sum / total) * 100) / 100

  const sorted = [...validScores].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 !== 0 ? sorted[mid] : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100

  const variance = validScores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / total
  const stdDev = Math.round(Math.sqrt(variance) * 100) / 100

  const passCount = validScores.filter(s => s >= 5.0).length
  const excellentCount = validScores.filter(s => s >= 8.0).length

  return {
    bands,
    stats: {
      count: scores.length,
      gradedCount: total,
      missingCount,
      mean,
      median,
      stdDev,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      passCount,
      passRate: Math.round((passCount / total) * 1000) / 10,
      excellentCount,
      excellentRate: Math.round((excellentCount / total) * 1000) / 10
    }
  }
}

/**
 * Phát hiện học sinh có nguy cơ suy giảm học lực (At-Risk Detection)
 */
export function detectAtRiskStudents(
  students: {
    studentId: string
    studentCode: string
    studentName: string
    className: string
    campusName: string
    subjectCode: string
    subjectName: string
    previousScore: number | null
    currentScore: number
  }[],
  benchmarkScore: number
): AtRiskStudentAlert[] {
  const alerts: AtRiskStudentAlert[] = []

  students.forEach(st => {
    const prev = st.previousScore
    const curr = st.currentScore
    const delta = prev !== null ? Math.round((curr - prev) * 100) / 100 : null

    let riskLevel: "HIGH" | "MEDIUM" | "LOW" | null = null
    let riskReason = ""
    let tier: 1 | 2 | 3 = 1
    let tierLabel = ""
    let action = ""

    // Tiêu chí 1: Điểm dưới 5.0 và dưới Benchmark (Nguy cơ cao)
    if (curr < 5.0) {
      riskLevel = "HIGH"
      riskReason = delta !== null && delta < 0
        ? `Điểm dưới trung bình (${curr}) và giảm ${Math.abs(delta)} điểm so với kỳ trước`
        : `Điểm dưới trung bình (${curr}) không đạt ngưỡng chuẩn ${benchmarkScore}`
      tier = 3
      tierLabel = "Tầng 3: Can thiệp chuyên sâu"
      action = "Đề xuất chuyển vào Hồ sơ Hỗ trợ học tập (Wave 3) & Họp phụ huynh"
    } else if (delta !== null && delta <= -1.5) {
      // Tiêu chí 2: Tụt đột biến >= 1.5 điểm
      riskLevel = "HIGH"
      riskReason = `Suy giảm đột biến ${Math.abs(delta)} điểm (từ ${prev} xuống ${curr})`
      tier = 2
      tierLabel = "Tầng 2: Hỗ trợ bộ môn"
      action = "Giáo viên bộ môn kiểm tra lỗ hổng kiến thức & Giao bài tập bù đắp"
    } else if (curr < benchmarkScore && (delta === null || delta < 0)) {
      // Tiêu chí 3: Dưới Benchmark môn học
      riskLevel = "MEDIUM"
      riskReason = `Điểm hiện tại (${curr}) chưa đạt chuẩn chất lượng môn (${benchmarkScore})`
      tier = 2
      tierLabel = "Tầng 2: Hỗ trợ bộ môn"
      action = "Phụ đạo tăng cường chuyên đề và theo dõi trong 2 tuần"
    } else if (delta !== null && delta <= -0.8) {
      // Tiêu chí 4: Giảm từ 0.8 đến 1.4 điểm
      riskLevel = "LOW"
      riskReason = `Điểm số có xu hướng giảm nhẹ (${Math.abs(delta)} điểm)`
      tier = 1
      tierLabel = "Tầng 1: Nhắc nhở GVCN"
      action = "GVCN trao đổi nắm bắt động lực và nề nếp học tập"
    }

    if (riskLevel) {
      alerts.push({
        studentId: st.studentId,
        studentCode: st.studentCode,
        studentName: st.studentName,
        className: st.className,
        campusName: st.campusName,
        subjectCode: st.subjectCode,
        subjectName: st.subjectName,
        previousScore: prev,
        currentScore: curr,
        scoreDelta: delta,
        benchmarkScore,
        riskLevel,
        riskReason,
        recommendedIntervention: { tier, tierLabel, action }
      })
    }
  })

  // Sắp xếp thứ tự ưu tiên: HIGH -> MEDIUM -> LOW
  const priority = { HIGH: 0, MEDIUM: 1, LOW: 2 }
  return alerts.sort((a, b) => priority[a.riskLevel] - priority[b.riskLevel])
}

/**
 * Đối chuẩn chất lượng cơ sở so với toàn hệ thống (Không xếp hạng tùy tiện)
 */
export function compareCampusesQuality(
  campusesData: {
    campusId: string
    campusCode: string
    campusName: string
    scores: number[]
  }[]
): {
  systemMean: number
  campuses: CampusQualityMetric[]
} {
  let allScores: number[] = []
  campusesData.forEach(c => {
    allScores = allScores.concat(c.scores)
  })

  const systemMean = allScores.length > 0
    ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 100) / 100
    : 0

  const campuses: CampusQualityMetric[] = campusesData.map(c => {
    const valid = c.scores
    const total = valid.length
    if (total === 0) {
      return {
        campusId: c.campusId,
        campusCode: c.campusCode,
        campusName: c.campusName,
        totalStudents: 0,
        gradedStudents: 0,
        meanScore: 0,
        passRate: 0,
        excellentRate: 0,
        stdDev: 0,
        systemMeanDelta: 0
      }
    }

    const mean = Math.round((valid.reduce((a, b) => a + b, 0) / total) * 100) / 100
    const pass = valid.filter(s => s >= 5.0).length
    const exc = valid.filter(s => s >= 8.0).length
    const variance = valid.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / total
    const stdDev = Math.round(Math.sqrt(variance) * 100) / 100

    return {
      campusId: c.campusId,
      campusCode: c.campusCode,
      campusName: c.campusName,
      totalStudents: total,
      gradedStudents: total,
      meanScore: mean,
      passRate: Math.round((pass / total) * 1000) / 10,
      excellentRate: Math.round((exc / total) * 1000) / 10,
      stdDev,
      systemMeanDelta: Math.round((mean - systemMean) * 100) / 100
    }
  })

  return { systemMean, campuses }
}
