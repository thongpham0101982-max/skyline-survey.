/**
 * Engine tính toán xếp loại học sinh THCS & THPT theo Thông tư 22/2021/TT-BGDĐT
 */

export interface SubjectScoreItem {
  subjectId: string
  subjectCode: string
  subjectName: string
  isEvaluationOnly?: boolean // Môn đánh giá bằng nhận xét (Đ, CĐ, Miễn)
  score?: number | null // Điểm số từ 0.0 đến 10.0 (hoặc null nếu được Miễn)
  evaluationGrade?: string | null // "Đ", "CĐ", "Miễn"
}

export interface StudentEvaluationInput {
  scores: Record<string, SubjectScoreItem> // key: subjectId hoặc subjectCode
  conductRating?: string | null // "Tốt", "Khá", "Đạt", "Chưa đạt"
  semester: "HK1" | "HK2" | "CN"
}

export interface StudentEvaluationResult {
  academicRating: "Tốt" | "Khá" | "Đạt" | "Chưa đạt"
  conductRating: "Tốt" | "Khá" | "Đạt" | "Chưa đạt"
  reward?: "Học sinh Xuất sắc" | "Học sinh Giỏi" | ""
  notes?: string
  promoted?: boolean
}

/**
 * Chuẩn hóa giá trị nhận xét: Đ -> Đạt, CĐ -> Chưa đạt, M -> Miễn
 */
export function normalizeEvaluationGrade(val?: string | null): "Đ" | "CĐ" | "Miễn" | "" {
  if (!val) return ""
  const v = val.trim().toLowerCase()
  if (v === "đ" || v === "d" || v === "đạt" || v === "dat" || v === "pass") return "Đ"
  if (v === "cđ" || v === "cd" || v === "chưa đạt" || v === "chua dat") return "CĐ"
  if (v === "miễn" || v === "mien" || v === "m") return "Miễn"
  return ""
}

/**
 * Kiểm tra xem môn học có phải là môn đánh giá bằng nhận xét thuần túy theo TT22 không
 */
export function isAssessmentOnlySubject(codeOrName: string): boolean {
  const norm = (codeOrName || "").toLowerCase().trim()
  return (
    norm.includes("thể chất") ||
    norm.includes("the chat") ||
    norm.includes("gdtc") ||
    norm.includes("mĩ thuật") ||
    norm.includes("mỹ thuật") ||
    norm.includes("mi thuat") ||
    norm.includes("my thuat") ||
    norm.includes("mit") ||
    norm.includes("âm nhạc") ||
    norm.includes("am nhac") ||
    norm.includes("địa phương") ||
    norm.includes("dia phuong") ||
    norm.includes("gddp") ||
    norm.includes("trải nghiệm") ||
    norm.includes("trai nghiem") ||
    norm.includes("hdtn") ||
    norm.includes("hướng nghiệp")
  )
}

/**
 * Đánh giá kết quả học tập theo Điều 9 Thông tư 22/2021/TT-BGDĐT:
 * 
 * 1. Mức TỐT:
 *    - Tất cả các môn đánh giá bằng nhận xét đạt mức Đạt (Đ).
 *    - Tất cả các môn đánh giá bằng điểm số có ĐTBmhk hoặc ĐTBmcn >= 6.5,
 *      trong đó có ít nhất 06 môn đạt từ 8.0 trở lên.
 * 
 * 2. Mức KHÁ:
 *    - Tất cả các môn đánh giá bằng nhận xét đạt mức Đạt (Đ).
 *    - Tất cả các môn đánh giá bằng điểm số có ĐTBmhk hoặc ĐTBmcn >= 5.0,
 *      trong đó có ít nhất 06 môn đạt từ 6.5 trở lên.
 * 
 * 3. Mức ĐẠT:
 *    - Có nhiều nhất 01 môn đánh giá bằng nhận xét đạt mức Chưa đạt (CĐ).
 *    - Có ít nhất 06 môn đánh giá bằng điểm số đạt từ 5.0 trở lên; không có môn nào dưới 3.5.
 * 
 * 4. Mức CHƯA ĐẠT: Các trường hợp còn lại.
 */
export function evaluateAcademicRating(scoresList: SubjectScoreItem[]): "Tốt" | "Khá" | "Đạt" | "Chưa đạt" {
  const numericScores: number[] = []
  let assessmentFailedCount = 0
  let hasAssessmentOnly = false

  scoresList.forEach(item => {
    const isAssess = item.isEvaluationOnly ?? isAssessmentOnlySubject(item.subjectName || item.subjectCode)
    const evalGrade = normalizeEvaluationGrade(item.evaluationGrade)

    if (isAssess) {
      hasAssessmentOnly = true
      if (evalGrade === "CĐ") {
        assessmentFailedCount++
      }
    } else {
      if (evalGrade === "Miễn" || String(item.score).toLowerCase() === "miễn") {
        return
      }
      if (item.score !== undefined && item.score !== null && !isNaN(Number(item.score))) {
        numericScores.push(Number(item.score))
      }
    }
  })

  // Nếu không có điểm nào
  if (numericScores.length === 0 && !hasAssessmentOnly) {
    return "Đạt"
  }

  // --- Kiểm tra điều kiện TỐT ---
  const allAssessPassed = assessmentFailedCount === 0
  const allNumericGte65 = numericScores.every(s => s >= 6.5)
  const countGte80 = numericScores.filter(s => s >= 8.0).length

  if (allAssessPassed && allNumericGte65 && countGte80 >= Math.min(6, numericScores.length)) {
    return "Tốt"
  }

  // --- Kiểm tra điều kiện KHÁ ---
  const allNumericGte50 = numericScores.every(s => s >= 5.0)
  const countGte65 = numericScores.filter(s => s >= 6.5).length

  if (allAssessPassed && allNumericGte50 && countGte65 >= Math.min(6, numericScores.length)) {
    return "Khá"
  }

  // --- Kiểm tra điều kiện ĐẠT ---
  const countGte50 = numericScores.filter(s => s >= 5.0).length
  const noScoreBelow35 = numericScores.every(s => s >= 3.5)

  if (assessmentFailedCount <= 1 && noScoreBelow35 && countGte50 >= Math.min(6, numericScores.length)) {
    return "Đạt"
  }

  // Còn lại: CHƯA ĐẠT
  return "Chưa đạt"
}

/**
 * Xét danh hiệu khen thưởng cả năm theo Điều 15 Thông tư 22/2021/TT-BGDĐT:
 * 
 * - Học sinh Xuất sắc:
 *   + Kết quả học tập Cả năm: Tốt
 *   + Kết quả rèn luyện Cả năm: Tốt
 *   + Có ít nhất 06 môn đánh giá bằng điểm số đạt ĐTBmcn >= 9.0
 * 
 * - Học sinh Giỏi:
 *   + Kết quả học tập Cả năm: Tốt
 *   + Kết quả rèn luyện Cả năm: Tốt
 */
export function evaluateAwardTitle(
  academicRating: "Tốt" | "Khá" | "Đạt" | "Chưa đạt",
  conductRating: string,
  scoresList: SubjectScoreItem[],
  semester: string
): "Học sinh Xuất sắc" | "Học sinh Giỏi" | "" {
  if (semester !== "CN") return ""

  const cleanConduct = (conductRating || "").trim().toLowerCase()
  const isConductGood = cleanConduct === "tốt" || cleanConduct === "tot"

  if (academicRating !== "Tốt" || !isConductGood) {
    return ""
  }

  const numericScores: number[] = []
  scoresList.forEach(item => {
    const isAssess = item.isEvaluationOnly ?? isAssessmentOnlySubject(item.subjectName || item.subjectCode)
    const evalGrade = normalizeEvaluationGrade(item.evaluationGrade)
    if (!isAssess && evalGrade !== "Miễn" && item.score !== null && item.score !== undefined && !isNaN(Number(item.score))) {
      numericScores.push(Number(item.score))
    }
  })

  const countGte90 = numericScores.filter(s => s >= 9.0).length
  if (countGte90 >= Math.min(6, numericScores.length)) {
    return "Học sinh Xuất sắc"
  }

  return "Học sinh Giỏi"
}

/**
 * Hàm đánh giá trọn gói cho 1 học sinh theo Thông tư 22
 */
export function evaluateStudentTT22(input: StudentEvaluationInput): StudentEvaluationResult {
  const scoresArray = Object.values(input.scores)
  const academicRating = evaluateAcademicRating(scoresArray)
  const conductRating = (input.conductRating as any) || "Tốt"
  const reward = evaluateAwardTitle(academicRating, conductRating, scoresArray, input.semester)

  let notes = ""
  let promoted = true

  if (input.semester === "CN") {
    if (academicRating === "Chưa đạt" || conductRating === "Chưa đạt") {
      notes = "Rèn luyện thêm trong hè"
      promoted = false
    } else {
      notes = "Được lên lớp"
      promoted = true
    }
  }

  return {
    academicRating,
    conductRating,
    reward,
    notes,
    promoted
  }
}
