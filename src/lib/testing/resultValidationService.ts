/**
 * resultValidationService.ts
 * Kiểm soát luồng nạp kết quả thi (Result Intake), đối soát định dạng, kiểm tra trùng lặp và áp dụng chính sách ghi đè.
 * Tuân thủ:
 * 1. Khớp học sinh bằng Student ID / Student Code duy nhất (KHÔNG match chỉ bằng họ tên).
 * 2. Khớp môn học bằng Canonical Subject ID từ Wave 2.
 * 3. Kiểm tra range điểm số 0 - 10, phát hiện chuỗi lỗi text.
 * 4. Phân biệt rõ: Hàng hợp lệ, Cảnh báo, Lỗi, Trùng lặp, Không tìm thấy học sinh.
 */

import { parseSubjectGoal } from "../advisory/subjectNormalization"

export interface RawImportRow {
  studentCode: string
  studentName?: string
  subjectCodeOrName: string
  score: string | number
  assessmentPeriod: string
  academicYearId?: string
}

export type ImportRowStatus = "VALID" | "WARNING" | "ERROR" | "DUPLICATE" | "UNMATCHED_STUDENT"

export interface ValidatedImportRow {
  rowNumber: number
  raw: RawImportRow
  status: ImportRowStatus
  canonicalSubjectCode: string | null
  canonicalSubjectName: string | null
  parsedScore: number | null
  issueDescription: string | null
  suggestedAction: string | null
  existingScore?: number | null
}

export interface ImportBatchSummary {
  totalRows: number
  validCount: number
  warningCount: number
  errorCount: number
  duplicateCount: number
  unmatchedStudentCount: number
  canProceed: boolean
}

/**
 * Thẩm định mảng dữ liệu nạp điểm thô
 */
export function validateResultImportBatch(
  rows: RawImportRow[],
  knownStudentsMap: Map<string, { id: string; name: string }>,
  existingScoresMap: Map<string, number> // key: `${studentCode}_${canonicalSubjectCode}_${period}`
): {
  summary: ImportBatchSummary
  validatedRows: ValidatedImportRow[]
} {
  const validatedRows: ValidatedImportRow[] = []
  let validCount = 0
  let warningCount = 0
  let errorCount = 0
  let duplicateCount = 0
  let unmatchedStudentCount = 0

  rows.forEach((row, idx) => {
    const rowNumber = idx + 1
    const cleanCode = (row.studentCode || "").trim().toUpperCase()
    let status: ImportRowStatus = "VALID"
    let issueDescription: string | null = null
    let suggestedAction: string | null = null
    let parsedScore: number | null = null
    let canonicalSubjectCode: string | null = null
    let canonicalSubjectName: string | null = null
    let existingScore: number | null = null

    // 1. Kiểm tra Mã học sinh
    if (!cleanCode) {
      status = "ERROR"
      issueDescription = "Thiếu mã định danh học sinh (Student ID)"
      suggestedAction = "Nhập bổ sung mã học sinh theo hồ sơ nhà trường"
    } else if (!knownStudentsMap.has(cleanCode)) {
      status = "UNMATCHED_STUDENT"
      issueDescription = `Mã học sinh "${cleanCode}" không tồn tại trong hệ thống SSM`
      suggestedAction = "Kiểm tra lại danh sách lớp hoặc cập nhật hồ sơ học sinh trước"
    }

    // 2. Chuẩn hóa Môn học
    if (status === "VALID") {
      const subjectParse = parseSubjectGoal(row.subjectCodeOrName)
      if (subjectParse.isSubjectGoal && subjectParse.subjectCode) {
        canonicalSubjectCode = subjectParse.subjectCode
        canonicalSubjectName = subjectParse.canonicalSubject
      } else {
        status = "ERROR"
        issueDescription = `Không nhận diện được môn học từ chuỗi "${row.subjectCodeOrName}"`
        suggestedAction = "Sử dụng tên môn chuẩn (Toán, Ngữ văn, Tiếng Anh, Vật lí...)"
      }
    }

    // 3. Kiểm tra Điểm số
    if (status === "VALID") {
      const rawScoreStr = String(row.score).trim().replace(",", ".")
      if (rawScoreStr === "" || rawScoreStr.toLowerCase() === "vắng" || rawScoreStr.toLowerCase() === "absent") {
        status = "WARNING"
        parsedScore = null
        issueDescription = "Học sinh vắng thi hoặc chưa có điểm số (Được ghi nhận là VẮNG, không tự tính thành 0)"
        suggestedAction = "Xác nhận lý do vắng hoặc bảo lưu thi lại"
      } else {
        const num = parseFloat(rawScoreStr)
        if (isNaN(num)) {
          status = "ERROR"
          issueDescription = `Điểm số không hợp lệ ("${row.score}")`
          suggestedAction = "Nhập số thập phân từ 0.0 đến 10.0"
        } else if (num < 0 || num > 10) {
          status = "ERROR"
          issueDescription = `Điểm số ${num} nằm ngoài thang điểm 0 - 10`
          suggestedAction = "Điều chỉnh điểm về khoảng cho phép (0.0 - 10.0)"
        } else {
          parsedScore = Math.round(num * 100) / 100
        }
      }
    }

    // 4. Kiểm tra Trùng lặp với dữ liệu đã có trong hệ thống
    if (status === "VALID" && canonicalSubjectCode) {
      const duplicateKey = `${cleanCode}_${canonicalSubjectCode}_${row.assessmentPeriod}`
      if (existingScoresMap.has(duplicateKey)) {
        status = "DUPLICATE"
        existingScore = existingScoresMap.get(duplicateKey)!
        issueDescription = `Học sinh đã có điểm kỳ ${row.assessmentPeriod} (Điểm cũ: ${existingScore}, Điểm mới: ${parsedScore})`
        suggestedAction = "Chọn chính sách: Giữ nguyên điểm cũ / Ghi đè bằng điểm mới"
      }
    }

    // Tổng hợp đếm
    if (status === "VALID") validCount++
    else if (status === "WARNING") warningCount++
    else if (status === "DUPLICATE") duplicateCount++
    else if (status === "UNMATCHED_STUDENT") unmatchedStudentCount++
    else errorCount++

    validatedRows.push({
      rowNumber,
      raw: row,
      status,
      canonicalSubjectCode,
      canonicalSubjectName,
      parsedScore,
      issueDescription,
      suggestedAction,
      existingScore
    })
  })

  return {
    summary: {
      totalRows: rows.length,
      validCount,
      warningCount,
      errorCount,
      duplicateCount,
      unmatchedStudentCount,
      canProceed: errorCount === 0 && unmatchedStudentCount === 0
    },
    validatedRows
  }
}
