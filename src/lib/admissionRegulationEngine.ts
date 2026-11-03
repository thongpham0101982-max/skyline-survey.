import { parseEntranceRecord, ProgramType } from "./entranceAcademicRecord"

export interface AdmissionRegulationRule {
  id: string
  name: string
  grades: string[] // ["1"], ["2","3","4","5"], ["6","7","8","9"], ["10","11","12"]
  systems: string[] // ["HNS", "HNG", "SB"]
  minAcademicRatings: string[] // ["Hoàn thành xuất sắc", "Hoàn thành tốt", "Tốt", "Giỏi", "Khá"]
  minConductRatings: string[] // ["Tốt", "Đạt", "Hoàn thành tốt"]
  minCoreScoreHNS: number // Điểm tối thiểu Toán, Tiếng Việt/Ngữ Văn để xét học bạ Hệ HNS (VD: 7.0)
  minCoreScoreHNG_SB: number // Điểm tối thiểu Toán, Tiếng Việt/Ngữ Văn để xét học bạ Hệ HNG/SB (VD: 8.0)
  minEnglishScoreDirect: number // Điểm Tiếng Anh tối thiểu xét tuyển thẳng (VD: 8.0)
  intlCertKeywords: string // Từ khóa chứng chỉ quốc tế/thành tích được xét tuyển thẳng/miễn TA
  defaultSubjects: string[] // Môn bắt buộc khảo sát tiêu chuẩn
  transcriptExemptSubjects: string[] // Môn được miễn khi đạt ngưỡng Học bạ trường cũ
  directAdmissionSubjects: string[] // Môn cần khảo sát/phỏng vấn khi thuộc diện Tuyển thẳng
  regulationNote: string // Ghi chú quy chế chi tiết của nhóm khối
  isActive: boolean
}

export interface AdmissionRegulationConfig {
  documentTitle: string
  effectiveYear: string
  generalNotes: string
  updatedAt?: string
  rules: AdmissionRegulationRule[]
}

export const DEFAULT_ADMISSION_REGULATIONS: AdmissionRegulationConfig = {
  documentTitle: "Quy chế Tuyển sinh & Điều kiện Tiếp nhận Học sinh Phổ thông Sky-Line",
  effectiveYear: "2026-2027",
  generalNotes:
    "1. Học sinh đầu cấp Lớp 1 tham gia đánh giá Tâm lý, Năng lực tư duy & Giao tiếp Tiếng Anh đầu vào.\n" +
    "2. Học sinh từ Lớp 2 đến Lớp 12 có học bạ trường cũ thuộc chương trình Bộ GD&ĐT đạt mức Khá/Tốt trở lên và điểm Toán, Tiếng Việt/Ngữ Văn đạt ngưỡng quy định theo Hệ đăng ký (HNS ≥ 7.0; HNG/SB ≥ 8.0) được xét học bạ miễn khảo sát Toán & Tiếng Việt/Ngữ Văn.\n" +
    "3. Học sinh thuộc diện Tuyển thẳng hoặc có Chứng chỉ Tiếng Anh quốc tế (Cambridge Flyers/KET/PET/IELTS...) đạt chuẩn theo quy chế chỉ tham gia Phỏng vấn Định hướng đầu vào & Tiếng Anh vấn đáp xếp lớp.",
  rules: [
    {
      id: "rule-k1",
      name: "Đầu cấp Tiểu học — Khối 1",
      grades: ["1"],
      systems: ["HNS", "HNG", "SB"],
      minAcademicRatings: ["Hoàn thành", "Đạt"],
      minConductRatings: ["Đạt", "Tốt"],
      minCoreScoreHNS: 0,
      minCoreScoreHNG_SB: 0,
      minEnglishScoreDirect: 0,
      intlCertKeywords: "Cambridge, Starters, Movers",
      defaultSubjects: ["Tâm lý", "Năng lực tư duy", "Tiếng Anh (vấn đáp)"],
      transcriptExemptSubjects: [],
      directAdmissionSubjects: ["Tâm lý", "Tiếng Anh (vấn đáp)"],
      regulationNote: "Học sinh vào Lớp 1: Đánh giá Tâm lý, Năng lực tư duy & Giao tiếp Tiếng Anh đầu vào (không yêu cầu điểm học bạ phổ thông).",
      isActive: true
    },
    {
      id: "rule-k2-k5",
      name: "Tiểu học Chuyển ngang — Khối 2 đến Khối 5",
      grades: ["2", "3", "4", "5"],
      systems: ["HNS", "HNG", "SB"],
      minAcademicRatings: ["Hoàn thành xuất sắc", "Hoàn thành tốt", "Tốt", "Giỏi", "Khá"],
      minConductRatings: ["Tốt", "Đạt", "Hoàn thành tốt"],
      minCoreScoreHNS: 7.0,
      minCoreScoreHNG_SB: 8.0,
      minEnglishScoreDirect: 8.0,
      intlCertKeywords: "Starters, Movers, Flyers, Cambridge, Toefl Primary",
      defaultSubjects: ["Toán học", "Tiếng Việt", "Tiếng Anh (viết)", "Tiếng Anh (vấn đáp)", "Tâm lý"],
      transcriptExemptSubjects: ["Toán học", "Tiếng Việt"],
      directAdmissionSubjects: ["Tiếng Anh (vấn đáp)", "Tâm lý"],
      regulationNote: "KQHT Hoàn thành tốt/Xuất sắc, điểm Toán & Tiếng Việt ≥ 7.0 (HNS) hoặc ≥ 8.0 (HNG/SB): Xét học bạ miễn Toán & Tiếng Việt, chỉ khảo sát Tiếng Anh & Tâm lý.",
      isActive: true
    },
    {
      id: "rule-k6-k9",
      name: "Đầu cấp Lớp 6 & THCS — Khối 6 đến Khối 9",
      grades: ["6", "7", "8", "9"],
      systems: ["HNS", "HNG", "SB"],
      minAcademicRatings: ["Xuất sắc", "Giỏi", "Tốt", "Khá", "Hoàn thành xuất sắc", "Hoàn thành tốt"],
      minConductRatings: ["Tốt", "Khá"],
      minCoreScoreHNS: 7.0,
      minCoreScoreHNG_SB: 8.0,
      minEnglishScoreDirect: 8.0,
      intlCertKeywords: "Flyers, KET, PET, FCE, IELTS, TOEFL, Cambridge, Học sinh giỏi",
      defaultSubjects: ["Toán học", "Ngữ Văn", "Tiếng Anh (viết)", "Tiếng Anh (vấn đáp)", "Phiếu định hướng đầu vào"],
      transcriptExemptSubjects: ["Toán học", "Ngữ Văn"],
      directAdmissionSubjects: ["Tiếng Anh (vấn đáp)", "Phiếu định hướng đầu vào"],
      regulationNote: "Học lực Khá/Tốt, Rèn luyện Tốt, điểm Toán & Ngữ Văn ≥ 7.0 (HNS) hoặc ≥ 8.0 (HNG/SB): Xét học bạ miễn Toán & Ngữ Văn, phân công khảo sát Tiếng Anh & Phỏng vấn Định hướng.",
      isActive: true
    },
    {
      id: "rule-k10-k12",
      name: "Đầu cấp Lớp 10 & THPT — Khối 10 đến Khối 12",
      grades: ["10", "11", "12"],
      systems: ["HNS", "HNG", "SB"],
      minAcademicRatings: ["Xuất sắc", "Giỏi", "Tốt", "Khá"],
      minConductRatings: ["Tốt"],
      minCoreScoreHNS: 7.0,
      minCoreScoreHNG_SB: 8.0,
      minEnglishScoreDirect: 8.0,
      intlCertKeywords: "IELTS, PET, FCE, CAE, TOEFL, SAT, Học sinh giỏi",
      defaultSubjects: ["Toán học", "Ngữ Văn", "Tiếng Anh (viết)", "Tiếng Anh (vấn đáp)", "Phiếu định hướng đầu vào"],
      transcriptExemptSubjects: ["Toán học", "Ngữ Văn"],
      directAdmissionSubjects: ["Tiếng Anh (vấn đáp)", "Phiếu định hướng đầu vào"],
      regulationNote: "Học lực Khá/Tốt, Rèn luyện Tốt, điểm TB Toán & Ngữ Văn đạt ngưỡng quy chế: Xét học bạ môn Việt Nam; có IELTS/Chứng chỉ QT đạt chuẩn được xét Tuyển thẳng.",
      isActive: true
    }
  ]
}

export function parseAdmissionRegulationConfig(configsOrJson?: any): AdmissionRegulationConfig {
  if (!configsOrJson) return DEFAULT_ADMISSION_REGULATIONS

  try {
    if (typeof configsOrJson === "string") {
      const parsed = JSON.parse(configsOrJson)
      if (parsed && Array.isArray(parsed.rules) && parsed.rules.length > 0) {
        return { ...DEFAULT_ADMISSION_REGULATIONS, ...parsed }
      }
    } else if (Array.isArray(configsOrJson)) {
      const found = configsOrJson.find(
        (c: any) => c.categoryType === "QUY_CHE_TS" && (c.code === "SKYLINE_K12_REGULATION" || c.name)
      )
      if (found && found.name) {
        const parsed = JSON.parse(found.name)
        if (parsed && Array.isArray(parsed.rules) && parsed.rules.length > 0) {
          return { ...DEFAULT_ADMISSION_REGULATIONS, ...parsed }
        }
      }
    } else if (typeof configsOrJson === "object" && Array.isArray(configsOrJson.rules)) {
      return { ...DEFAULT_ADMISSION_REGULATIONS, ...configsOrJson }
    }
  } catch (e) {
    // Fallback to default
  }

  return DEFAULT_ADMISSION_REGULATIONS
}

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
  appliedRuleName?: string
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

export function analyzeStudentAcademicAndRegulation(
  student: any,
  customConfig?: AdmissionRegulationConfig
): StudentAcademicInsight {
  const regConfig = customConfig || DEFAULT_ADMISSION_REGULATIONS
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

  // Tìm quy tắc Quy chế Tuyển sinh phù hợp với Khối & Hệ của học sinh
  const matchedRule =
    regConfig.rules.find(
      r =>
        r.isActive !== false &&
        r.grades.includes(gradeStr) &&
        (r.systems.length === 0 || r.systems.some(sys => sysCode.includes(sys.toUpperCase())))
    ) ||
    regConfig.rules.find(r => r.isActive !== false && r.grades.includes(gradeStr)) ||
    DEFAULT_ADMISSION_REGULATIONS.rules.find(r => r.grades.includes(gradeStr)) ||
    DEFAULT_ADMISSION_REGULATIONS.rules[1]

  const defaultSubs =
    matchedRule?.defaultSubjects && matchedRule.defaultSubjects.length > 0
      ? matchedRule.defaultSubjects
      : gradeNum === 1
      ? ["Tâm lý", "Năng lực tư duy", "Tiếng Anh (vấn đáp)"]
      : ["Toán học", vnSubjectName, "Tiếng Anh (viết)", "Tiếng Anh (vấn đáp)", psychSubjectName]

  // Xác định gợi ý theo Quy chế Tuyển sinh Sky-Line
  if (gradeNum === 1 && matchedRule.minCoreScoreHNS === 0 && matchedRule.minCoreScoreHNG_SB === 0) {
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
      regulationReason: matchedRule.regulationNote || "Học sinh vào Lớp 1: Đánh giá Tâm lý / Năng lực tư duy & Giao tiếp Tiếng Anh đầu vào.",
      recommendedSubjectNames: defaultSubs,
      exemptedSubjectNames: [],
      appliedRuleName: matchedRule.name
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
      regulationReason: `Chưa có điểm học bạ trường cũ. Theo quy chế (${matchedRule.name}) cần phân công khảo sát đầy đủ: ${defaultSubs.join(", ")}.`,
      recommendedSubjectNames: defaultSubs,
      exemptedSubjectNames: [],
      appliedRuleName: matchedRule.name
    }
  }

  // Kiểm tra điều kiện Xét tuyển / Miễn môn văn hóa theo Quy chế Tuyển sinh đã cấu hình
  const ratingNorm = academicRating.toLowerCase()
  const allowedRatings =
    matchedRule.minAcademicRatings && matchedRule.minAcademicRatings.length > 0
      ? matchedRule.minAcademicRatings.map(r => r.toLowerCase().trim()).filter(Boolean)
      : ["xuất sắc", "tốt", "giỏi", "khá"]
  const isGoodRating = allowedRatings.some(r => ratingNorm.includes(r))

  const minCoreThreshold =
    sysCode.includes("HNG") || sysCode.includes("SB")
      ? matchedRule.minCoreScoreHNG_SB ?? 8.0
      : matchedRule.minCoreScoreHNS ?? 7.0
  const minEngDirect = matchedRule.minEnglishScoreDirect ?? minCoreThreshold

  const mathPass = mathScore !== null && mathScore >= minCoreThreshold
  const litPass = litScore !== null && litScore >= minCoreThreshold
  const engPass = engScore !== null && engScore >= minEngDirect

  const certKeywords = (matchedRule.intlCertKeywords || "ielts,cambridge,flyers,ket,pet,fce,toefl,movers")
    .split(",")
    .map(k => k.trim().toLowerCase())
    .filter(Boolean)
  const achLower = achievements.toLowerCase()
  const hasIntlEngCert = certKeywords.some(k => achLower.includes(k))

  const exemptSubsCfg =
    matchedRule.transcriptExemptSubjects && matchedRule.transcriptExemptSubjects.length > 0
      ? matchedRule.transcriptExemptSubjects
      : ["Toán học", vnSubjectName]

  const directSubsCfg =
    matchedRule.directAdmissionSubjects && matchedRule.directAdmissionSubjects.length > 0
      ? matchedRule.directAdmissionSubjects
      : ["Tiếng Anh (vấn đáp)", psychSubjectName]

  if (
    criteria.includes("tuyển thẳng") ||
    (isGoodRating && mathPass && litPass && (engPass || hasIntlEngCert) && achievements.length > 0)
  ) {
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
      regulationReason: `KQHT đạt "${academicRating}" (Toán ${mathScore ?? "—"}, ${vnSubjectName} ${litScore ?? "—"}, Anh ${engScore ?? "—"} ≥ ${minCoreThreshold})${achievements ? ` kèm thành tích "${achievements}"` : ""}. Đề xuất miễn ${exemptSubsCfg.join(" & ")}, chỉ phân công ${directSubsCfg.join(" & ")}.`,
      recommendedSubjectNames: directSubsCfg,
      exemptedSubjectNames: exemptSubsCfg,
      appliedRuleName: matchedRule.name
    }
  }

  if (criteria.includes("xét tuyển") || (isGoodRating && mathPass && litPass && programType === "BO_GD_DT")) {
    const remainingSubs = defaultSubs.filter(s => !exemptSubsCfg.includes(s))
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
      regulationReason: `Điểm học bạ Toán (${mathScore}) & ${vnSubjectName} (${litScore}) ≥ ${minCoreThreshold} (${academicRating}). Đủ điều kiện miễn ${exemptSubsCfg.join(", ")}, chỉ phân công khảo sát ${remainingSubs.join(", ")}.`,
      recommendedSubjectNames: remainingSubs.length > 0 ? remainingSubs : ["Tiếng Anh (viết)", "Tiếng Anh (vấn đáp)", psychSubjectName],
      exemptedSubjectNames: exemptSubsCfg,
      appliedRuleName: matchedRule.name
    }
  }

  // Trường hợp cần khảo sát đầy đủ (hoặc miễn từng môn đơn lẻ nếu đạt ngưỡng)
  const requiredSubs: string[] = []
  const exemptedSubs: string[] = []

  defaultSubs.forEach(sub => {
    const subLower = sub.toLowerCase()
    if (subLower.includes("toán") && mathPass && programType === "BO_GD_DT" && isGoodRating && exemptSubsCfg.includes(sub)) {
      exemptedSubs.push(sub)
    } else if ((subLower.includes("tiếng việt") || subLower.includes("ngữ văn")) && litPass && programType === "BO_GD_DT" && isGoodRating && exemptSubsCfg.includes(sub)) {
      exemptedSubs.push(sub)
    } else {
      requiredSubs.push(sub)
    }
  })

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
    regulationReason: `Hệ ${sysCode} (${programLabel} • Ngưỡng miễn: ≥ ${minCoreThreshold}): Phân công khảo sát ${requiredSubs.join(", ")}.`,
    recommendedSubjectNames: requiredSubs,
    exemptedSubjectNames: exemptedSubs,
    appliedRuleName: matchedRule.name
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
