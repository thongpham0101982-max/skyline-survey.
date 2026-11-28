/**
 * Engine đánh giá & tính toán kết quả giáo dục học sinh Tiểu học theo Thông tư 27/2020/TT-BGDĐT
 */

export interface PrimarySubjectGrade {
  level: "T" | "H" | "C" | "Miễn" | "M" | "" // Mức đạt được: T - Hoàn thành tốt, H - Hoàn thành, C - Chưa hoàn thành, Miễn - Được miễn
  score?: number | string | null // Điểm KTĐK (1-10) đối với môn có kiểm tra định kỳ (hoặc null/"Miễn" nếu được miễn)
  subjectName?: string
  subjectCode?: string
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
  explanation?: string
  inferredLevels?: Record<string, "T" | "H" | "C">
  inferredCompetencies?: Record<string, "T" | "Đ" | "C">
  inferredQualities?: Record<string, "T" | "Đ" | "C">
}

/**
 * Tự động suy luận mức đạt môn học Tiểu học (T / H / C) từ Điểm KTĐK theo Thông tư 27/2020/TT-BGDĐT:
 * - Điểm KTĐK từ 7.0 đến 10.0 -> Gợi ý mức T (Hoàn thành tốt)
 * - Điểm KTĐK từ 5.0 đến dưới 7.0 -> Gợi ý mức H (Hoàn thành)
 * - Điểm KTĐK dưới 5.0 -> Mức C (Chưa hoàn thành)
 */
export function inferPrimarySubjectLevelFromScore(score?: number | string | null): "T" | "H" | "C" | "" {
  if (score === null || score === undefined || score === "") return ""
  const str = String(score).trim().toLowerCase()
  if (str === "miễn" || str === "m") return ""
  const num = parseFloat(str.replace(",", "."))
  if (isNaN(num)) return ""
  if (num >= 7.0) return "T"
  if (num >= 5.0) return "H"
  return "C"
}

/**
 * Tự động suy luận 10 Năng lực & 5 Phẩm chất từ kết quả đánh giá các môn học Tiểu học (nếu GVCN chưa nhập hoặc muốn đồng bộ nhanh)
 */
export function inferPrimaryCompetenciesAndQualitiesFromSubjects(
  subjects: Record<string, PrimarySubjectGrade>,
  existingComp?: Record<string, string>,
  existingQual?: Record<string, string>
): {
  competencies: Record<string, "T" | "Đ" | "C">
  qualities: Record<string, "T" | "Đ" | "C">
} {
  const toNlGrade = (lvl: string): "T" | "Đ" | "C" => {
    if (lvl === "T") return "T"
    if (lvl === "C") return "C"
    return "Đ"
  }

  const subEntries = Object.values(subjects || {})
  let overallDefault: "T" | "Đ" | "C" = "T"
  const resolvedLevels: Array<"T" | "H" | "C"> = []

  const compBySpecificKey: Partial<Record<string, "T" | "Đ" | "C">> = {}

  for (const s of subEntries) {
    const isMien = s.level === "Miễn" || s.level === "M" || String(s.score).toLowerCase() === "miễn"
    if (isMien) continue
    const effLevel = (s.level as "T" | "H" | "C") || inferPrimarySubjectLevelFromScore(s.score)
    if (!effLevel) continue
    resolvedLevels.push(effLevel)

    const nameNorm = `${s.subjectName || ""} ${s.subjectCode || ""}`.toLowerCase()
    const nlVal = toNlGrade(effLevel)
    if (nameNorm.includes("tiếng việt") || nameNorm.includes("tvi") || nameNorm.includes("tiếng anh") || nameNorm.includes("ngoại ngữ")) {
      if (!compBySpecificKey.language || effLevel === "C" || (effLevel === "H" && compBySpecificKey.language === "T")) {
        compBySpecificKey.language = nlVal
      }
    }
    if (nameNorm.includes("toán") || nameNorm.includes("toa")) {
      compBySpecificKey.math = nlVal
    }
    if (nameNorm.includes("khoa học") || nameNorm.includes("tự nhiên") || nameNorm.includes("sci") || nameNorm.includes("tn-xh")) {
      compBySpecificKey.science = nlVal
    }
    if (nameNorm.includes("công nghệ") || nameNorm.includes("ste")) {
      compBySpecificKey.technology = nlVal
    }
    if (nameNorm.includes("tin học") || nameNorm.includes("ict")) {
      compBySpecificKey.informatics = nlVal
    }
    if (nameNorm.includes("âm nhạc") || nameNorm.includes("mĩ thuật") || nameNorm.includes("mỹ thuật") || nameNorm.includes("ana") || nameNorm.includes("mtu")) {
      if (!compBySpecificKey.aesthetic || effLevel === "C") {
        compBySpecificKey.aesthetic = nlVal
      }
    }
    if (nameNorm.includes("thể chất") || nameNorm.includes("gtc") || nameNorm.includes("thể dục")) {
      compBySpecificKey.physical = nlVal
    }
  }

  if (resolvedLevels.some(l => l === "C")) {
    overallDefault = "Đ"
  } else if (resolvedLevels.length > 0 && resolvedLevels.every(l => l === "T")) {
    overallDefault = "T"
  } else if (resolvedLevels.length > 0) {
    overallDefault = "Đ"
  }

  const allCompKeys = [
    "selfReliance",
    "communication",
    "problemSolving",
    "language",
    "math",
    "science",
    "technology",
    "informatics",
    "aesthetic",
    "physical"
  ]
  const allQualKeys = ["patriotism", "compassion", "diligence", "honesty", "responsibility"]

  const competencies: Record<string, "T" | "Đ" | "C"> = {}
  for (const k of allCompKeys) {
    const existing = existingComp?.[k] as "T" | "Đ" | "C" | undefined
    competencies[k] = existing || compBySpecificKey[k] || overallDefault
  }

  const qualities: Record<string, "T" | "Đ" | "C"> = {}
  for (const k of allQualKeys) {
    const existing = existingQual?.[k] as "T" | "Đ" | "C" | undefined
    qualities[k] = existing || (overallDefault === "T" ? "T" : "T")
  }

  return { competencies, qualities }
}

/**
 * Đánh giá kết quả giáo dục Tiểu học theo Điều 9 & Điều 13 Thông tư 27/2020/TT-BGDĐT
 */
export function evaluateStudentTT27(input: PrimaryEvaluationInput): PrimaryEvaluationResult {
  const inferredLevels: Record<string, "T" | "H" | "C"> = {}
  const normalizedSubjects: PrimarySubjectGrade[] = []

  for (const [subId, s] of Object.entries(input.subjects || {})) {
    const isExempt =
      s.level === "Miễn" ||
      s.level === "M" ||
      String(s.score).toLowerCase() === "miễn" ||
      String(s.score).toLowerCase() === "m"
    if (isExempt) continue

    let effLevel = s.level || ""
    if (!effLevel && s.score !== null && s.score !== undefined && s.score !== "") {
      const inferred = inferPrimarySubjectLevelFromScore(s.score)
      if (inferred) {
        effLevel = inferred
        inferredLevels[subId] = inferred
      }
    }
    // Nếu điểm KTĐK < 5.0 thì theo TT27 môn học đó không thể đạt T hoặc H
    const parsedScore =
      s.score !== null && s.score !== undefined && s.score !== "" && !isNaN(Number(s.score))
        ? Number(s.score)
        : null
    if (parsedScore !== null && parsedScore < 5.0) {
      effLevel = "C"
      inferredLevels[subId] = "C"
    }

    normalizedSubjects.push({
      ...s,
      level: effLevel as any,
      score: parsedScore
    })
  }

  const { competencies: autoComp, qualities: autoQual } = inferPrimaryCompetenciesAndQualitiesFromSubjects(
    input.subjects,
    input.competencies as any,
    input.qualities as any
  )

  const rawCompValues = Object.values(input.competencies || {}).filter(Boolean) as string[]
  const rawQualValues = Object.values(input.qualities || {}).filter(Boolean) as string[]
  const compValues = rawCompValues.length > 0 ? rawCompValues : Object.values(autoComp)
  const qualValues = rawQualValues.length > 0 ? rawQualValues : Object.values(autoQual)

  const levels = normalizedSubjects.map(s => s.level).filter(Boolean)
  const scores = normalizedSubjects
    .map(s => s.score)
    .filter((s): s is number => s !== null && s !== undefined && !isNaN(Number(s)))

  const allCompQual = [...compValues, ...qualValues]

  // Mức 1: HOÀN THÀNH XUẤT SẮC (Khoản 2a Điều 9 & Khoản 1a Điều 13 TT27):
  // - Đánh giá định kỳ các môn học và HĐGD đạt mức Hoàn thành tốt (T)
  // - Các phẩm chất, năng lực đạt mức Tốt (T)
  // - Bài kiểm tra định kỳ cuối năm học của các môn học đạt 9 điểm trở lên (>= 9.0)
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
      notes: "Hoàn thành xuất sắc các nội dung học tập và rèn luyện",
      explanation: "100% môn học đạt mức T, điểm KTĐK các môn >= 9.0, tất cả Năng lực & Phẩm chất đạt mức T (Khoản 2a Điều 9 TT27).",
      inferredLevels,
      inferredCompetencies: autoComp,
      inferredQualities: autoQual
    }
  }

  // Mức 2: HOÀN THÀNH TỐT (Khoản 2b Điều 9 & Khoản 1b Điều 13 TT27):
  // - Chưa đạt mức Hoàn thành xuất sắc, nhưng có kết quả đánh giá các môn học, HĐGD đạt mức Hoàn thành tốt (T) hoặc H (không có C)
  // - Các phẩm chất, năng lực đạt mức Tốt (T) hoặc Đạt (Đ) (không có C)
  // - Bài kiểm tra định kỳ cuối năm học của các môn học đạt 7 điểm trở lên (>= 7.0)
  const noSubLevelC = levels.length > 0 && levels.every(l => l !== "C")
  const hasAtLeastOneT = levels.some(l => l === "T")
  const allScoresGte7 = scores.length === 0 || scores.every(s => s >= 7.0)
  const noCompQualC = allCompQual.every(v => v !== "C")

  if (noSubLevelC && hasAtLeastOneT && allScoresGte7 && noCompQualC) {
    return {
      academicRating: "Hoàn thành tốt",
      rewardEndOfYear: true,
      rewardUnexpected: false,
      rewardTitle: "Học sinh Tiêu biểu",
      promoted: true,
      notes: "Hoàn thành tốt các nội dung học tập và rèn luyện",
      explanation: "Các môn học đạt mức T/H, điểm KTĐK các môn >= 7.0, Năng lực & Phẩm chất đạt T/Đ (Khoản 2b Điều 9 TT27).",
      inferredLevels,
      inferredCompetencies: autoComp,
      inferredQualities: autoQual
    }
  }

  // Mức 3: HOÀN THÀNH (Khoản 2c Điều 9 TT27):
  // - Chưa đạt mức Hoàn thành xuất sắc và Hoàn thành tốt, nhưng có kết quả đánh giá các môn học, HĐGD đạt mức Hoàn thành tốt (T) hoặc Hoàn thành (H)
  // - Các phẩm chất, năng lực đạt mức Tốt (T) hoặc Đạt (Đ)
  // - Bài kiểm tra định kỳ cuối năm học của các môn học đạt 5 điểm trở lên (>= 5.0)
  const allScoresGte5 = scores.length === 0 || scores.every(s => s >= 5.0)

  if (noSubLevelC && allScoresGte5 && noCompQualC) {
    return {
      academicRating: "Hoàn thành",
      rewardEndOfYear: false,
      rewardUnexpected: false,
      rewardTitle: "",
      promoted: true,
      notes: "Được lên lớp",
      explanation: "Các môn học đạt mức H trở lên, điểm KTĐK các môn >= 5.0, Năng lực & Phẩm chất đạt Đ trở lên (Khoản 2c Điều 9 TT27).",
      inferredLevels,
      inferredCompetencies: autoComp,
      inferredQualities: autoQual
    }
  }

  // Mức 4: CHƯA HOÀN THÀNH (Khoản 2d Điều 9 TT27): Các trường hợp còn lại
  const failedSubNames = normalizedSubjects
    .filter(s => s.level === "C" || (typeof s.score === "number" && s.score < 5.0))
    .map(s => s.subjectName || s.subjectCode || "Môn học")
  const failReason =
    failedSubNames.length > 0
      ? `Chưa hoàn thành môn: ${failedSubNames.join(", ")}`
      : !noCompQualC
      ? "Có chỉ số Năng lực / Phẩm chất ở mức Cần cố gắng (C)"
      : "Chưa đủ dữ liệu đánh giá môn học"

  return {
    academicRating: "Chưa hoàn thành",
    rewardEndOfYear: false,
    rewardUnexpected: false,
    rewardTitle: "",
    promoted: false,
    notes: "Rèn luyện trong hè",
    explanation: `${failReason} (Khoản 2d Điều 9 TT27).`,
    inferredLevels,
    inferredCompetencies: autoComp,
    inferredQualities: autoQual
  }
}
