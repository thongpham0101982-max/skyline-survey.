import { describe, it, expect } from 'vitest'
import { validateExamMatrix, ExamMatrixDefinition } from '../src/lib/testing/examMatrixService'

/**
 * Monthly Improvement Batch #02 (2026-10)
 * Item: IMP-006 (Exam Matrix Pre-validation for GK1)
 * Standard: STABLE BY DEFAULT - CHANGE BY EVIDENCE
 */
describe('Batch #02: IMP-006 Exam Matrix Validation Suite', () => {
  const validMatrix: ExamMatrixDefinition = {
    id: "m_gk1_toan_10",
    code: "MT_TOAN_10_GK1",
    name: "Ma trận đề Giữa HK1 Toán 10",
    subjectCode: "MAT",
    subjectName: "Toán học",
    grade: "10",
    durationMinutes: 90,
    items: [
      {
        id: "i1",
        topic: "Mệnh đề và tập hợp",
        level: "NHAN_BIET",
        questionCount: 16,
        pointsPerQuestion: 0.25,
        totalPoints: 4.0,
        percentage: 40,
        availableInBank: 40
      },
      {
        id: "i2",
        topic: "Bất phương trình bậc nhất hai ẩn",
        level: "THONG_HIEU",
        questionCount: 12,
        pointsPerQuestion: 0.25,
        totalPoints: 3.0,
        percentage: 30,
        availableInBank: 30
      },
      {
        id: "i3",
        topic: "Hệ thức lượng trong tam giác",
        level: "VAN_DUNG",
        questionCount: 8,
        pointsPerQuestion: 0.25,
        totalPoints: 2.0,
        percentage: 20,
        availableInBank: 25
      },
      {
        id: "i4",
        topic: "Vận dụng thực tế vectơ",
        level: "VAN_DUNG_CAO",
        questionCount: 4,
        pointsPerQuestion: 0.25,
        totalPoints: 1.0,
        percentage: 10,
        availableInBank: 10
      }
    ]
  }

  it('validates a balanced 10.0 point exam matrix as valid', () => {
    const result = validateExamMatrix(validMatrix)
    expect(result.isValid).toBe(true)
    expect(result.totalScore).toBe(10.0)
    expect(result.scoreDifference).toBe(0)
    expect(result.totalQuestions).toBe(40)
    expect(result.errors.length).toBe(0)
  })

  it('detects point mismatch when total points does not equal 10.0', () => {
    const invalidMatrix = {
      ...validMatrix,
      items: [
        ...validMatrix.items.slice(0, 3) // Thiếu 1.0 điểm
      ]
    }
    const result = validateExamMatrix(invalidMatrix)
    expect(result.isValid).toBe(false)
    expect(result.totalScore).toBe(9.0)
    expect(result.scoreDifference).toBe(1.0)
    expect(result.errors.some(e => e.includes('chưa khớp chuẩn 10.0 điểm'))).toBe(true)
  })

  it('detects shortage of questions in bank (availableInBank < questionCount)', () => {
    const shortBankMatrix: ExamMatrixDefinition = {
      ...validMatrix,
      items: validMatrix.items.map(item =>
        item.level === 'VAN_DUNG_CAO' ? { ...item, availableInBank: 2, questionCount: 4 } : item
      )
    }
    const result = validateExamMatrix(shortBankMatrix)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('chỉ có 2 câu'))).toBe(true)
  })

  it('calculates thinking level distribution correctly', () => {
    const result = validateExamMatrix(validMatrix)
    expect(result.levelDistribution.NHAN_BIET.percent).toBe(40)
    expect(result.levelDistribution.THONG_HIEU.percent).toBe(30)
    expect(result.levelDistribution.VAN_DUNG.percent).toBe(20)
    expect(result.levelDistribution.VAN_DUNG_CAO.percent).toBe(10)
  })
})
