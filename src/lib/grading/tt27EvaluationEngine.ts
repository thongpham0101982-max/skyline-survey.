/**
 * Engine đánh giá & tính toán kết quả giáo dục học sinh Tiểu học theo Thông tư 27/2020/TT-BGDĐT
 */

export interface PrimarySubjectGrade {
  level: "T" | "H" | "C" | "Miễn" | "M" | "" // Mức đạt được: T - Hoàn thành tốt, H - Hoàn thành, C - Chưa hoàn thành, Miễn - Được miễn
  score?: number | string | null // Điểm KTĐK (1-10) đối với môn có kiểm tra định kỳ (hoặc null/"Miễn" nếu được miễn)
}

export interface PrimaryCompetencies {
  // Năng lực chung: T - Tốt, Đ - Đạt, C - Cần cố gắng
  selfReliance?: "T" | "Đ" | "C" | "" // Tự chủ và tự học
  communication?: "T" | "Đ" | "C" | "" // Giao tiếp và hợp tác
  problemSolving?: "T" | "Đ" | "C" | "" // GQVĐ và sáng tạo

  // Năng lực đặc thù:
  language?: "T" | "Đ" | "C" | "" // Ngôn ngữ
  math?: "T" | "Đ" | "C" | "" // Tính toán
  science?: "T" | "Đ" | "C" | "" // Khoa học
  technology?: "T" | "Đ" | "C" | "" // Công nghệ
  informatics?: "T" | "Đ" | "C" | "" // Tin học
  aesthetic?: "T" | "Đ" | "C" | "" // Thẩm mĩ
  physical?: "T" | "Đ" | "C" | "" // Thể chất
}

export interface PrimaryQualities {
  // Phẩm chất chủ yếu: T - Tốt, Đ - Đạt, C - Cần cố gắng
  patriotism?: "T" | "Đ" | "C" | "" // Yêu nước
  compassion?: "T" | "Đ" | "C" | "" // Nhân ái
  diligence?: "T" | "Đ" | "C" | "" // Chăm chỉ
  honesty?: "T" | "Đ" | "C" | "" // Trung thực
  responsibility?: "T" | "Đ" | "C" | "" // Trách nhiệm
}

export interface PrimaryEvaluationInput {
  subjects: Record<string, PrimarySubjectGrade>
  competencies?: PrimaryCompetencies
  qualities?: PrimaryQualities
  semester: "HK1" | "HK2" | "CN"
}

export interface PrimaryEvaluationResult {
  academicRating: "Hoàn thành xuất sắc" | "Hoàn thành tốt" | "Hoàn thành" | "Chưa hoàn thành"
  rewardEndOfYear: boolean // Khen thưởng cuối năm
  rewardUnexpected: boolean // Khen thưởng đột xuất
  rewardTitle?: string // Tên danh hiệu khen thưởng
  promoted: boolean // Được lên lớp
  notes?: string
}

/**
 * Đánh giá kết quả giáo dục Tiểu học theo Điều 9 & Điều 13 Thông tư 27/2020/TT-BGDĐT
 */
export function evaluateStudentTT27(input: PrimaryEvaluationInput): PrimaryEvaluationResult {
  const subjects = Object.values(input.subjects || {})
  const compValues = Object.values(input.competencies || {}).filter(Boolean) as string[]
  const qualValues = Object.values(input.qualities || {}).filter(Boolean) as string[]

  // Extract non-exempt subject levels and scores (bỏ qua môn học sinh được Miễn)
  const nonExemptSubjects = subjects.filter(
    s => s.level !== "Miễn" && String(s.score).toLowerCase() !== "miễn" && s.level !== "M" && String(s.score).toLowerCase() !== "m"
  )
  const levels = nonExemptSubjects.map(s => s.level).filter(Boolean)
  const scores = nonExemptSubjects
    .map(s => s.score)
    .filter(s => s !== null && s !== undefined && !isNaN(Number(s))) as number[]

  const allCompQual = [...compValues, ...qualValues]

  // Mức 1: HOÀN THÀNH XUẤT SẮC:
  // - Tất cả môn học và HĐGD đạt T (Hoàn thành tốt)
  // - Các môn có điểm KTĐK đều >= 9.0
  // - Tất cả năng lực & phẩm chất đạt T (Tốt)
  const allSubLevelsT = levels.length > 0 && levels.every(l => l === "T")
  const allScoresGte9 = scores.length > 0 && scores.every(s => s >= 9.0)
  const allCompQualT = allCompQual.length > 0 && allCompQual.every(v => v === "T")

  if (allSubLevelsT && allScoresGte9 && allCompQualT) {
    return {
      academicRating: "Hoàn thành xuất sắc",
      rewardEndOfYear: true,
      rewardUnexpected: false,
      rewardTitle: "Học sinh Xuất sắc",
      promoted: true,
      notes: "Hoàn thành xuất sắc các nội dung học tập và rèn luyện"
    }
  }

  // Mức 2: HOÀN THÀNH TỐT:
  // - Các môn học và HĐGD đạt Hoàn thành tốt hoặc Hoàn thành (không có C)
  // - Điểm KTĐK các môn đều >= 7.0
  // - Năng lực & phẩm chất đạt T hoặc Đ (không có C)
  const noSubLevelC = levels.every(l => l !== "C")
  const allScoresGte7 = scores.length === 0 || scores.every(s => s >= 7.0)
  const noCompQualC = allCompQual.every(v => v !== "C")

  if (noSubLevelC && allScoresGte7 && noCompQualC) {
    return {
      academicRating: "Hoàn thành tốt",
      rewardEndOfYear: true,
      rewardUnexpected: false,
      rewardTitle: "Học sinh Tiêu biểu",
      promoted: true,
      notes: "Hoàn thành tốt các nội dung học tập và rèn luyện"
    }
  }

  // Mức 3: HOÀN THÀNH:
  // - Các môn học và HĐGD đạt Hoàn thành trở lên (hoặc điểm KTĐK >= 5.0)
  // - Không có môn nào có điểm KTĐK dưới 5.0
  // - Năng lực & phẩm chất đạt Đạt trở lên (hoặc tối đa 1-2 chỉ số cần cố gắng)
  const allScoresGte5 = scores.length === 0 || scores.every(s => s >= 5.0)
  const countCompQualC = allCompQual.filter(v => v === "C").length

  if (allScoresGte5 && countCompQualC <= 2 && noSubLevelC) {
    return {
      academicRating: "Hoàn thành",
      rewardEndOfYear: false,
      rewardUnexpected: false,
      rewardTitle: "",
      promoted: true,
      notes: "Được lên lớp"
    }
  }

  // Mức 4: CHƯA HOÀN THÀNH: Các trường hợp còn lại
  return {
    academicRating: "Chưa hoàn thành",
    rewardEndOfYear: false,
    rewardUnexpected: false,
    rewardTitle: "",
    promoted: false,
    notes: "Cần rèn luyện và kiểm tra lại trong hè"
  }
}
