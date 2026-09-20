/**
 * examMatrixService.ts
 * Quản lý mô hình cấu trúc ma trận đề thi (Exam Matrix Model) và kiểm tra tính hợp lệ.
 * Đảm bảo:
 * 1. Tổng điểm chuẩn xác bằng 10.0 điểm.
 * 2. Phân bố 4 mức độ tư duy: Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao.
 * 3. Kiểm tra tính khả dụng của kho câu hỏi (Available vs Required).
 */

export type ThinkingLevel = "NHAN_BIET" | "THONG_HIEU" | "VAN_DUNG" | "VAN_DUNG_CAO"

export interface MatrixItem {
  id: string
  topic: string
  level: ThinkingLevel
  questionCount: number
  pointsPerQuestion: number
  totalPoints: number
  percentage: number
  availableInBank: number // Số câu thực tế sẵn có trong thư viện
}

export interface ExamMatrixDefinition {
  id: string
  code: string
  name: string
  subjectCode: string
  subjectName: string
  grade: string
  durationMinutes: number
  items: MatrixItem[]
}

export interface MatrixValidationResult {
  isValid: boolean
  totalQuestions: number
  totalScore: number
  scoreDifference: number // 10.0 - totalScore
  levelDistribution: Record<ThinkingLevel, { count: number; points: number; percent: number }>
  errors: string[]
  warnings: string[]
}

export const THINKING_LEVEL_LABELS: Record<ThinkingLevel, { label: string; defaultWeight: number }> = {
  NHAN_BIET: { label: "Nhận biết", defaultWeight: 40 },
  THONG_HIEU: { label: "Thông hiểu", defaultWeight: 30 },
  VAN_DUNG: { label: "Vận dụng", defaultWeight: 20 },
  VAN_DUNG_CAO: { label: "Vận dụng cao", defaultWeight: 10 }
}

/**
 * Kiểm tra tính hợp lệ của Ma trận đề
 */
export function validateExamMatrix(matrix: ExamMatrixDefinition): MatrixValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  let totalQuestions = 0
  let totalScore = 0

  const levelDistribution: Record<ThinkingLevel, { count: number; points: number; percent: number }> = {
    NHAN_BIET: { count: 0, points: 0, percent: 0 },
    THONG_HIEU: { count: 0, points: 0, percent: 0 },
    VAN_DUNG: { count: 0, points: 0, percent: 0 },
    VAN_DUNG_CAO: { count: 0, points: 0, percent: 0 }
  }

  matrix.items.forEach(item => {
    const itemScore = Math.round(item.questionCount * item.pointsPerQuestion * 100) / 100
    totalQuestions += item.questionCount
    totalScore += itemScore

    if (levelDistribution[item.level]) {
      levelDistribution[item.level].count += item.questionCount
      levelDistribution[item.level].points += itemScore
    }

    // Cảnh báo thiếu câu hỏi trong thư viện
    if (item.availableInBank < item.questionCount) {
      errors.push(
        `Chủ đề "${item.topic}" mức độ ${THINKING_LEVEL_LABELS[item.level].label} cần ${item.questionCount} câu nhưng trong Thư viện chỉ có ${item.availableInBank} câu`
      )
    } else if (item.availableInBank < item.questionCount * 2) {
      warnings.push(
        `Chủ đề "${item.topic}" mức độ ${THINKING_LEVEL_LABELS[item.level].label} có ${item.availableInBank} câu (khuyên dùng ít nhất gấp đôi để sinh mã đề hoán vị an toàn)`
      )
    }
  })

  totalScore = Math.round(totalScore * 100) / 100
  const scoreDifference = Math.round((10.0 - totalScore) * 100) / 100

  if (Math.abs(scoreDifference) > 0.01) {
    errors.push(`Tổng điểm của ma trận là ${totalScore}, chưa khớp chuẩn 10.0 điểm (Lệch ${scoreDifference > 0 ? "+" : ""}${scoreDifference} điểm)`)
  }

  // Tính phần trăm phân bố mức độ
  Object.keys(levelDistribution).forEach(lvlKey => {
    const k = lvlKey as ThinkingLevel
    levelDistribution[k].percent = totalScore > 0
      ? Math.round((levelDistribution[k].points / totalScore) * 1000) / 10
      : 0
  })

  return {
    isValid: errors.length === 0,
    totalQuestions,
    totalScore,
    scoreDifference,
    levelDistribution,
    errors,
    warnings
  }
}
