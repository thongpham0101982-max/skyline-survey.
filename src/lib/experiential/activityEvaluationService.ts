/**
 * activityEvaluationService.ts
 * Dịch vụ đánh giá hoạt động trải nghiệm, chuẩn hóa tiêu chí và tính toán kết quả tập trung cho SSM K12.
 */

export type AttendanceStatus = "PRESENT" | "ABSENT_EXCUSED" | "ABSENT_UNEXCUSED"
export type EvaluationLevel = "CHUA_DAT" | "DAT" | "TOT"
export type ActivityFinalResult = "CHUA_DAT" | "DAT" | "TOT" | "XUAT_SAC" | "CHUA_DANH_GIA"

export interface ActivityCriteriaDefinition {
  id: string
  code: string
  name: string
  description?: string
  weight?: number // Trọng số nếu có (%)
  isRequired: boolean
  sortOrder: number
}

export interface StudentActivityEvaluationItem {
  studentId: string
  studentCode: string
  studentName: string
  attendance: AttendanceStatus
  role: string // "THAM_GIA", "NHOM_TRUONG", "DIEU_PHOI", "THUYET_TRINH", "HO_TRO"
  criteriaScores: Record<string, EvaluationLevel> // criteriaId -> level
  finalResult: ActivityFinalResult
  notes?: string
  isCompleted: boolean
}

export const STANDARD_STUDENT_ROLES = [
  { code: "THAM_GIA", label: "Thành viên tham gia" },
  { code: "NHOM_TRUONG", label: "Nhóm trưởng / Phụ trách nhóm" },
  { code: "DIEU_PHOI", label: "Điều phối viên" },
  { code: "THUYET_TRINH", label: "Đại diện thuyết trình" },
  { code: "HO_TRO", label: "Hỗ trợ kỹ thuật / Tổ chức" }
]

export const STANDARD_ATTENDANCE_STATUSES = [
  { code: "PRESENT", label: "Có mặt", color: "status-success" },
  { code: "ABSENT_EXCUSED", label: "Vắng có phép", color: "status-warning" },
  { code: "ABSENT_UNEXCUSED", label: "Vắng không phép", color: "status-error" }
]

export const STANDARD_EVALUATION_LEVELS = [
  { code: "CHUA_DAT", label: "Chưa đạt", score: 1, color: "status-error" },
  { code: "DAT", label: "Đạt", score: 2, color: "status-info" },
  { code: "TOT", label: "Tốt", score: 3, color: "status-success" }
]

/**
 * Tính toán kết quả tổng hợp của học sinh từ các tiêu chí thành phần
 * Quy tắc chuẩn:
 * - Nếu Vắng mặt: Kết quả = CHUA_DAT (hoặc ghi nhận vắng)
 * - Nếu có bất kỳ tiêu chí bắt buộc nào là CHUA_DAT: Kết quả = CHUA_DAT
 * - Nếu 100% tiêu chí đạt mức TOT (kèm có vai trò tích cực): Kết quả = XUAT_SAC
 * - Nếu đa số tiêu chí đạt mức TOT và không có tiêu chí nào CHUA_DAT: Kết quả = TOT
 * - Các trường hợp còn lại: Kết quả = DAT
 */
export function calculateStudentActivityResult(
  attendance: AttendanceStatus,
  criteriaScores: Record<string, EvaluationLevel>,
  criteriaDefinitions: ActivityCriteriaDefinition[],
  role?: string
): { finalResult: ActivityFinalResult; resultLabel: string; resultColor: string } {
  if (attendance === "ABSENT_UNEXCUSED" || attendance === "ABSENT_EXCUSED") {
    return {
      finalResult: "CHUA_DAT",
      resultLabel: attendance === "ABSENT_EXCUSED" ? "Vắng có phép" : "Không tham gia",
      resultColor: "status-neutral"
    }
  }

  const criteriaCount = criteriaDefinitions.length
  if (criteriaCount === 0) {
    return { finalResult: "CHUA_DANH_GIA", resultLabel: "Chưa đánh giá", resultColor: "status-neutral" }
  }

  let evaluatedCount = 0
  let chuaDatCount = 0
  let datCount = 0
  let totCount = 0

  for (const c of criteriaDefinitions) {
    const score = criteriaScores[c.id]
    if (score) {
      evaluatedCount++
      if (score === "CHUA_DAT") chuaDatCount++
      else if (score === "DAT") datCount++
      else if (score === "TOT") totCount++
    } else if (c.isRequired) {
      // Tiêu chí bắt buộc chưa đánh giá
      return { finalResult: "CHUA_DANH_GIA", resultLabel: "Đang đánh giá", resultColor: "status-warning" }
    }
  }

  if (evaluatedCount === 0) {
    return { finalResult: "CHUA_DANH_GIA", resultLabel: "Chưa đánh giá", resultColor: "status-neutral" }
  }

  // 1. Nếu có tiêu chí chưa đạt
  if (chuaDatCount > 0) {
    return { finalResult: "CHUA_DAT", resultLabel: "Chưa đạt", resultColor: "status-error" }
  }

  // 2. Nếu 100% đạt Tốt và có đóng góp vai trò
  if (totCount === criteriaCount) {
    const isLeadershipRole = role === "NHOM_TRUONG" || role === "DIEU_PHOI" || role === "THUYET_TRINH"
    if (isLeadershipRole) {
      return { finalResult: "XUAT_SAC", resultLabel: "Xuất sắc", resultColor: "status-success" }
    }
    return { finalResult: "TOT", resultLabel: "Hoàn thành Tốt", resultColor: "status-success" }
  }

  // 3. Nếu đa số là Tốt
  if (totCount >= Math.ceil(criteriaCount / 2)) {
    return { finalResult: "TOT", resultLabel: "Hoàn thành Tốt", resultColor: "status-success" }
  }

  // 4. Mặc định là Đạt
  return { finalResult: "DAT", resultLabel: "Đạt yêu cầu", resultColor: "status-info" }
}

/**
 * Tổng hợp báo cáo kết quả hoạt động trải nghiệm toàn lớp hoặc toàn cơ sở
 */
export function summarizeActivityResults(students: StudentActivityEvaluationItem[]) {
  const total = students.length
  if (total === 0) {
    return {
      total: 0,
      presentCount: 0,
      attendanceRate: 0,
      xuatSacCount: 0,
      totCount: 0,
      datCount: 0,
      chuaDatCount: 0,
      chuaDanhGiaCount: 0,
      completedRate: 0
    }
  }

  let presentCount = 0
  let xuatSacCount = 0
  let totCount = 0
  let datCount = 0
  let chuaDatCount = 0
  let chuaDanhGiaCount = 0

  for (const s of students) {
    if (s.attendance === "PRESENT") presentCount++

    if (s.finalResult === "XUAT_SAC") xuatSacCount++
    else if (s.finalResult === "TOT") totCount++
    else if (s.finalResult === "DAT") datCount++
    else if (s.finalResult === "CHUA_DAT") chuaDatCount++
    else chuaDanhGiaCount++
  }

  const evaluatedTotal = total - chuaDanhGiaCount
  const attendanceRate = Math.round((presentCount / total) * 100)
  const completedRate = Math.round((evaluatedTotal / total) * 100)

  return {
    total,
    presentCount,
    attendanceRate,
    xuatSacCount,
    totCount,
    datCount,
    chuaDatCount,
    chuaDanhGiaCount,
    completedRate
  }
}
