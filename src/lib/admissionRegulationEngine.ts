import { parseEntranceRecord, ProgramType } from "./entranceAcademicRecord"

export interface StudentAcademicInsight {
  programType: ProgramType
  programLabel: string
  transcriptPeriodLabel: string
  academicRating: string
  conductRating: string
  scores: { name: string; score: string }[]
  mathScore: number | null
  litScore: number | null
  engScore: number | null
  combinationSummary: string
  achievements: string
  hasRecordData: boolean
  hasAttachments: boolean
  // Quy chế tuyển sinh & Gợi ý phân công khảo sát
  regulationStatus: "TUYEN_THANG_GOI_Y" | "XET_TUYEN_HOC_BA" | "KHAO_SAT_DAY_DU" | "KHAO_SAT_DAU_CAP_K1" | "CHUA_DU_THONG_TIN"
  regulationBadgeLabel: string
  regulationBadgeColor: string
  regulationReason: string
  recommendedSubjectNames: string[]
  exemptedSubjectNames: string[]
}

const PROGRAM_LABELS: Record<ProgramType, string> = {
  BO_GD_DT: "Bộ GD&ĐT",
  SONG_NGU: "Song ngữ",
  NUOC_NGOAI: "Nước ngoài",
  HOMESCHOOLING: "Homeschooling"
}

const PERIOD_LABELS: Record<string, string> = {
  HK1: "Học kỳ 1",
  HK2: "Học kỳ 2",
  CA_NAM: "Cả năm"
}

function parseScoreNum(val?: string | null): number | null {
  if (!val) return null
  const cleaned = String(val).replace(",", ".").trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

export function analyzeStudentAcademicAndRegulation(student: any): StudentAcademicInsight {
  const gradeStr = String(student?.grade || "1").replace(/\D/g, "") || "1"
  const gradeNum = parseInt(gradeStr, 10) || 1
  const rawKq = student?.kqHocTap || ""
  const parsed = parseEntranceRecord(rawKq, gradeStr)

  const programType: ProgramType = parsed.programType || "BO_GD_DT"
  const programLabel = PROGRAM_LABELS[programType] || "Bộ GD&ĐT"
  const transcriptPeriodLabel = PERIOD_LABELS[parsed.transcriptPeriod || "CA_NAM"] || parsed.transcriptPeriod || "Cả năm"

  let academicRating = ""
  let conductRating = student?.kqRenLuyen || ""
  let scores: { name: string; score: string }[] = []
  let combinationSummary = ""

  if (programType === "BO_GD_DT") {
    academicRating = parsed.moet?.overallRating || parsed.overallRating || student?.kqgdTieuHoc || ""
    conductRating = parsed.moet?.conductRating || student?.kqRenLuyen || ""
    scores = (parsed.moet?.subjects || [])
      .filter(s => s.score && String(s.score).trim() !== "")
      .map(s => ({ name: s.name, score: String(s.score).trim() }))
    if (parsed.moet?.combination?.name && parsed.moet?.combination?.score) {
      combinationSummary = `${parsed.moet.combination.name}: ${parsed.moet.combination.score}`
    }
  } else if (programType === "SONG_NGU") {
    const vn = parsed.bilingual?.moetRating ? `VN: ${parsed.bilingual.moetRating}` : ""
    const qt = parsed.bilingual?.internationalRating ? `QT: ${parsed.bilingual.internationalRating}` : ""
    academicRating = [vn, qt].filter(Boolean).join(" | ") || parsed.overallRating || ""
    scores = [
      ...(parsed.bilingual?.moetSubjects || []),
      ...(parsed.bilingual?.internationalSubjects || [])
    ]
      .filter(s => s.score && String(s.score).trim() !== "")
      .map(s => ({ name: s.name, score: String(s.score).trim() }))
  } else if (programType === "NUOC_NGOAI") {
    academicRating = parsed.foreign?.gpaOrHonors
      ? `GPA/Honors: ${parsed.foreign.gpaOrHonors}`
      : parsed.overallRating || "Học bạ Quốc tế"
    scores = (parsed.foreign?.subjects || [])
      .filter(s => s.score && String(s.score).trim() !== "")
      .map(s => ({ name: s.name, score: String(s.score).trim() }))
  } else if (programType === "HOMESCHOOLING") {
    academicRating = parsed.homeschool?.overallEvaluation || parsed.overallRating || "Homeschooling"
    scores = (parsed.homeschool?.subjects || [])
      .filter(s => s.score && String(s.score).trim() !== "")
      .map(s => ({ name: s.name, score: String(s.score).trim() }))
  }

  const findScore = (keywords: string[]): number | null => {
    const found = scores.find(s => {
      const n = s.name.toLowerCase()
      return keywords.some(k => n.includes(k))
    })
    return found ? parseScoreNum(found.score) : null
  }

  const mathScore = findScore(["toán", "math"])
  const litScore = findScore(["tiếng việt", "ngữ văn", "văn", "vietnamese", "literature"])
  const engScore = findScore(["tiếng anh", "anh", "english", "esl"])

  const achievements = (parsed.achievements || parsed.moet?.achievements || student?.hoSoCtQuocTe || "").trim()
  const hasAttachments = Array.isArray(parsed.attachments) && parsed.attachments.length > 0
  const hasRecordData = Boolean(
    rawKq.trim() !== "" ||
    scores.length > 0 ||
    achievements !== "" ||
    student?.kqgdTieuHoc ||
    student?.kqRenLuyen
  )

  const vnSubjectName = gradeNum <= 5 ? "Tiếng Việt" : "Ngữ Văn"
  const psychSubjectName = gradeNum <= 5 ? "Tâm lý" : "Phiếu định hướng đầu vào"
  const sysCode = String(student?.surveySystem || student?.surveyFormType || "HNS").toUpperCase()
  const criteria = String(student?.admissionCriteria || "").toLowerCase()

  // Xác định gợi ý theo Quy chế Tuyển sinh Sky-Line
  if (gradeNum === 1) {
    const recSubs = ["Tâm lý", "Năng lực tư duy", "Tiếng Anh (vấn đáp)"]
    return {
      programType,
      programLabel,
      transcriptPeriodLabel,
      academicRating: academicRating || "Đầu cấp Lớp 1",
      conductRating,
      scores,
      mathScore,
      litScore,
      engScore,
      combinationSummary,
      achievements,
      hasRecordData,
      hasAttachments,
      regulationStatus: "KHAO_SAT_DAU_CAP_K1",
      regulationBadgeLabel: "Khảo sát đầu cấp K1",
      regulationBadgeColor: "bg-teal-50 text-[#005854] border-teal-200",
      regulationReason: "Học sinh vào Lớp 1: Đánh giá Tâm lý / Năng lực tư duy & Giao tiếp Tiếng Anh đầu vào.",
      recommendedSubjectNames: recSubs,
      exemptedSubjectNames: []
    }
  }

  if (!hasRecordData) {
    return {
      programType,
      programLabel,
      transcriptPeriodLabel,
      academicRating: "Chưa nhập KQHT",
      conductRating,
      scores,
      mathScore,
      litScore,
      engScore,
      combinationSummary,
      achievements,
      hasRecordData: false,
      hasAttachments,
      regulationStatus: "CHUA_DU_THONG_TIN",
      regulationBadgeLabel: "Chưa có KQHT • Khảo sát đủ môn",
      regulationBadgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      regulationReason: `Chưa có điểm học bạ trường cũ. Theo quy chế cần phân công khảo sát đầy đủ Toán, ${vnSubjectName}, Tiếng Anh & ${psychSubjectName}.`,
      recommendedSubjectNames: ["Toán học", vnSubjectName, "Tiếng Anh (viết)", "Tiếng Anh (vấn đáp)", psychSubjectName],
      exemptedSubjectNames: []
    }
  }

  // Kiểm tra điều kiện Xét tuyển / Miễn môn văn hóa theo Quy chế Tuyển sinh
  const ratingNorm = academicRating.toLowerCase()
  const isGoodRating =
    ratingNorm.includes("xuất sắc") ||
    ratingNorm.includes("tốt") ||
    ratingNorm.includes("giỏi") ||
    ratingNorm.includes("khá")
  const minCoreThreshold = sysCode.includes("HNG") || sysCode.includes("SB") ? 8.0 : 7.0
  const mathPass = mathScore !== null && mathScore >= minCoreThreshold
  const litPass = litScore !== null && litScore >= minCoreThreshold
  const engPass = engScore !== null && engScore >= (sysCode.includes("HNG") || sysCode.includes("SB") ? 8.0 : 7.0)
  const hasIntlEngCert = /ielts|cambridge|flyers|ket|pet|fce|toefl|movers/i.test(achievements)

  if (criteria.includes("tuyển thẳng") || (isGoodRating && mathPass && litPass && (engPass || hasIntlEngCert) && achievements.length > 0)) {
    return {
      programType,
      programLabel,
      transcriptPeriodLabel,
      academicRating,
      conductRating,
      scores,
      mathScore,
      litScore,
      engScore,
      combinationSummary,
      achievements,
      hasRecordData: true,
      hasAttachments,
      regulationStatus: "TUYEN_THANG_GOI_Y",
      regulationBadgeLabel: "Đủ ĐK Xét tuyển / Tuyển thẳng",
      regulationBadgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      regulationReason: `KQHT đạt "${academicRating}" (Toán ${mathScore ?? "—"}, ${vnSubjectName} ${litScore ?? "—"}, Anh ${engScore ?? "—"})${achievements ? ` kèm thành tích "${achievements}"` : ""}. Đề xuất miễn Toán & ${vnSubjectName}, chỉ phân công phỏng vấn Định hướng/Tâm lý & Tiếng Anh xếp lớp.`,
      recommendedSubjectNames: ["Tiếng Anh (vấn đáp)", psychSubjectName],
      exemptedSubjectNames: ["Toán học", vnSubjectName]
    }
  }

  if (criteria.includes("xét tuyển") || (isGoodRating && mathPass && litPass && programType === "BO_GD_DT")) {
    return {
      programType,
      programLabel,
      transcriptPeriodLabel,
      academicRating,
      conductRating,
      scores,
      mathScore,
      litScore,
      engScore,
      combinationSummary,
      achievements,
      hasRecordData: true,
      hasAttachments,
      regulationStatus: "XET_TUYEN_HOC_BA",
      regulationBadgeLabel: "Đủ ĐK Xét học bạ Toán - Văn",
      regulationBadgeColor: "bg-sky-50 text-sky-700 border-sky-200",
      regulationReason: `Điểm học bạ Toán (${mathScore}) & ${vnSubjectName} (${litScore}) ≥ ${minCoreThreshold} (${academicRating}). Có thể xét học bạ môn Việt Nam và chỉ phân công khảo sát Tiếng Anh + ${psychSubjectName}.`,
      recommendedSubjectNames: ["Tiếng Anh (viết)", "Tiếng Anh (vấn đáp)", psychSubjectName],
      exemptedSubjectNames: ["Toán học", vnSubjectName]
    }
  }

  // Trường hợp cần khảo sát đầy đủ (hoặc khảo sát lại các môn chưa đạt ngưỡng)
  const requiredSubs: string[] = []
  const exemptedSubs: string[] = []

  if (mathPass && programType === "BO_GD_DT" && isGoodRating) {
    exemptedSubs.push("Toán học")
  } else {
    requiredSubs.push("Toán học")
  }

  if (litPass && programType === "BO_GD_DT" && isGoodRating) {
    exemptedSubs.push(vnSubjectName)
  } else {
    requiredSubs.push(vnSubjectName)
  }

  requiredSubs.push("Tiếng Anh (viết)", "Tiếng Anh (vấn đáp)", psychSubjectName)

  return {
    programType,
    programLabel,
    transcriptPeriodLabel,
    academicRating: academicRating || "Đã nhập KQHT",
    conductRating,
    scores,
    mathScore,
    litScore,
    engScore,
    combinationSummary,
    achievements,
    hasRecordData: true,
    hasAttachments,
    regulationStatus: "KHAO_SAT_DAY_DU",
    regulationBadgeLabel: "Khảo sát theo môn quy định",
    regulationBadgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    regulationReason: `Hệ ${sysCode} (${programLabel}): Phân công khảo sát ${requiredSubs.join(", ")}.`,
    recommendedSubjectNames: requiredSubs,
    exemptedSubjectNames: exemptedSubs
  }
}

/**
 * Ánh xạ danh sách tên môn gợi ý sang danh sách ID môn thực tế trong CSDL
 */
export function matchRecommendedSubjectIds(recommendedNames: string[], availableSubjects: any[]): string[] {
  const matchedIds = new Set<string>()
  recommendedNames.forEach(recName => {
    const normRec = recName.toLowerCase().trim()
    availableSubjects.forEach(sub => {
      const subName = String(sub.name || "").toLowerCase().trim()
      if (
        subName === normRec ||
        (normRec.includes("toán") && subName.includes("toán")) ||
        (normRec === "tiếng việt" && subName.includes("tiếng việt")) ||
        (normRec === "ngữ văn" && subName.includes("ngữ văn")) ||
        (normRec.includes("tiếng anh (viết)") && subName.includes("tiếng anh") && subName.includes("viết")) ||
        (normRec.includes("tiếng anh (vấn đáp)") && subName.includes("tiếng anh") && subName.includes("vấn đáp")) ||
        (normRec.includes("tâm lý") && subName.includes("tâm lý")) ||
        (normRec.includes("định hướng") && subName.includes("định hướng")) ||
        (normRec.includes("tư duy") && subName.includes("tư duy"))
      ) {
        matchedIds.add(sub.id)
      }
    })
  })
  return Array.from(matchedIds)
}
