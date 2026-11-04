import * as XLSX from "xlsx"
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
    let rawRating = parsed.moet?.overallRating || parsed.overallRating || student?.kqgdTieuHoc || ""
    if (rawRating.includes("Trường cũ") || rawRating.includes("Đối tượng:")) {
      const cleanLines = rawRating
        .split(/[\r\n]+/)
        .map(l => l.trim())
        .filter(l => l && !l.includes("Trường cũ") && !l.includes("Đối tượng:"))
      rawRating = cleanLines[0] || ""
    }
    academicRating = rawRating
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
  const combinedSysRaw = `${student?.surveyFormType || ""} ${student?.surveySystem || ""}`.toUpperCase()
  const sysCode =
    combinedSysRaw.includes("HNG") || combinedSysRaw.includes("GLOBAL")
      ? "HNG"
      : combinedSysRaw.includes("SB") || combinedSysRaw.includes("SONG BẰNG") || combinedSysRaw.includes("SONG BANG")
      ? "SB"
      : combinedSysRaw.includes("HNS") || combinedSysRaw.includes("CHẤT LƯỢNG CAO") || combinedSysRaw.includes("CLC")
      ? "HNS"
      : String(student?.surveyFormType || student?.surveySystem || "HNS").toUpperCase()
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

/**
 * Kiểm tra học sinh có thuộc nhóm Đủ điều kiện Xét học bạ / Tuyển thẳng
 * (được miễn môn văn hóa Toán - Tiếng Việt/Ngữ Văn theo Quy chế Tuyển sinh) hay không.
 */
export function isStudentEligibleByRegulation(
  student: any,
  customConfig?: AdmissionRegulationConfig
): boolean {
  const insight = analyzeStudentAcademicAndRegulation(student, customConfig)
  return (
    insight.regulationStatus === "TUYEN_THANG_GOI_Y" ||
    insight.regulationStatus === "XET_TUYEN_HOC_BA" ||
    insight.exemptedSubjectNames.length > 0
  )
}

function formatDobForExcel(dob?: string | null): string {
  if (!dob) return ""
  const s = String(dob).trim()
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s
  const d = new Date(s)
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }
  return s
}

/**
 * Chuẩn hóa 1 dòng dữ liệu Học sinh đủ điều kiện khảo sát theo quy chế (Xét học bạ / Tuyển thẳng)
 */
export function buildEligibleStudentRegulationRow(
  student: any,
  index: number,
  customConfig?: AdmissionRegulationConfig,
  context?: {
    periodName?: string
    batchName?: string
    campusName?: string
  }
) {
  const insight = analyzeStudentAcademicAndRegulation(student, customConfig)
  const gradeStr = String(student?.grade || "").replace(/\D/g, "") || String(student?.grade || "")
  const combinedSys = `${student?.surveyFormType || ""} ${student?.surveySystem || ""}`.toUpperCase()
  const sysDisplay = combinedSys.includes("HNG")
    ? "HNG"
    : combinedSys.includes("SB")
    ? "SB"
    : combinedSys.includes("HNS")
    ? "HNS"
    : student?.surveyFormType || student?.surveySystem || "HNS"

  const formDisplay =
    student?.surveySystem &&
    (student.surveySystem.toLowerCase().includes("trực tiếp") ||
      student.surveySystem.toLowerCase().includes("online") ||
      student.surveySystem.toLowerCase().includes("offline"))
      ? student.surveySystem
      : student?.surveyFormType &&
        (student.surveyFormType.toLowerCase().includes("trực tiếp") ||
          student.surveyFormType.toLowerCase().includes("online") ||
          student.surveyFormType.toLowerCase().includes("offline"))
      ? student.surveyFormType
      : "Trực tiếp"

  const vnSubLabel = parseInt(gradeStr || "1", 10) <= 5 ? "Tiếng Việt" : "Ngữ Văn"
  const scoreSummaryParts = [
    insight.mathScore !== null ? `Toán: ${insight.mathScore}` : "",
    insight.litScore !== null ? `${vnSubLabel}: ${insight.litScore}` : "",
    insight.engScore !== null ? `Tiếng Anh: ${insight.engScore}` : ""
  ].filter(Boolean)

  const kqHocTapSummary = [
    insight.academicRating ? `Xếp loại: ${insight.academicRating}` : "",
    scoreSummaryParts.join(", ")
  ]
    .filter(Boolean)
    .join(" | ")

  return {
    "STT": index + 1,
    "Mã HS KS": student?.studentCode || "",
    "Họ và Tên *": student?.fullName || "",
    "Ngày sinh": formatDobForExcel(student?.dateOfBirth),
    "Giới tính": student?.gender || "",
    "Khối": gradeStr,
    "Hệ Khảo sát": sysDisplay,
    "Đăng ký CS": context?.campusName || student?.admissionCampus || student?.registeredCampus || "",
    "Kỳ / Đợt khảo sát": [context?.periodName || student?.period?.name, context?.batchName || student?.batch?.name]
      .filter(Boolean)
      .join(" - "),
    "Trường học cũ": student?.oldSchoolName || "",
    "Đối tượng Tuyển sinh": student?.targetType || "Nội tỉnh",
    "Hồ sơ / Bảng điểm": insight.programLabel,
    "Học kỳ / Năm TS": student?.hocKy || insight.transcriptPeriodLabel || "Cả năm",
    "KQ Xếp loại Học tập": insight.academicRating || "",
    "Kết quả Rèn luyện": insight.conductRating || student?.kqRenLuyen || "Tốt",
    "Điểm Toán": insight.mathScore !== null ? insight.mathScore : "",
    "Điểm Tiếng Việt / Ngữ Văn": insight.litScore !== null ? insight.litScore : "",
    "Điểm Tiếng Anh": insight.engScore !== null ? insight.engScore : "",
    "Thành tích / Chứng chỉ QT": insight.achievements || "",
    "Kết quả Học tập": kqHocTapSummary,
    "Diện khảo sát":
      insight.regulationStatus === "TUYEN_THANG_GOI_Y"
        ? "Tuyển thẳng"
        : insight.regulationStatus === "XET_TUYEN_HOC_BA"
        ? "Xét tuyển học bạ"
        : student?.admissionCriteria || "Xét học bạ",
    "Hình thức KS": formDisplay,
    "Diện Đủ ĐK theo Quy chế": insight.regulationBadgeLabel,
    "Môn Văn hóa được miễn KS": insight.exemptedSubjectNames.join(", "),
    "Môn cần phân công KS": insight.recommendedSubjectNames.join(", "),
    "Nhóm Quy chế áp dụng": insight.appliedRuleName || "",
    "Căn cứ Quy chế chi tiết": insight.regulationReason
  }
}

/**
 * Tạo bộ dữ liệu Mẫu chuẩn (Sample Rows) của Học sinh đủ điều kiện Xét học bạ / Tuyển thẳng
 * (được miễn môn văn hóa theo Quy chế Tuyển sinh Sky-Line) trải đều các cấp Tiểu học, THCS, THPT và các hệ HNS, HNG, SB.
 */
export function getSampleRegulationEligibleRows(customConfig?: AdmissionRegulationConfig) {
  const regConfig = customConfig || DEFAULT_ADMISSION_REGULATIONS
  const rK25 = regConfig.rules.find(r => r.grades.includes("2")) || DEFAULT_ADMISSION_REGULATIONS.rules[1]
  const rK69 = regConfig.rules.find(r => r.grades.includes("6")) || DEFAULT_ADMISSION_REGULATIONS.rules[2]
  const rK1012 = regConfig.rules.find(r => r.grades.includes("10")) || DEFAULT_ADMISSION_REGULATIONS.rules[3]

  const sampleStudents = [
    {
      studentCode: "HS_QC_001",
      fullName: "Nguyễn Minh Khôi (Mẫu K3 - HNS Xét học bạ)",
      dateOfBirth: "2018-04-15",
      gender: "Nam",
      grade: "3",
      surveyFormType: "HNS",
      surveySystem: "Trực tiếp",
      admissionCriteria: "Xét tuyển",
      registeredCampus: "CS1 - Sky-Line Riverside",
      oldSchoolName: "Trường Tiểu học Phù Đổng",
      targetType: "Nội tỉnh",
      hocKy: "Cả năm",
      kqRenLuyen: "Tốt",
      kqHocTap: JSON.stringify({
        programType: "BO_GD_DT",
        transcriptPeriod: "CA_NAM",
        overallRating: "Hoàn thành tốt",
        moet: {
          gradeLevel: "3",
          overallRating: "Hoàn thành tốt",
          conductRating: "Tốt",
          subjects: [
            { id: "toan", name: "Toán", score: String(Math.max(7.5, rK25.minCoreScoreHNS || 7.0)) },
            { id: "tv", name: "Tiếng Việt", score: String(Math.max(8.0, rK25.minCoreScoreHNS || 7.0)) },
            { id: "ta", name: "Tiếng Anh", score: "8.0" }
          ]
        }
      }),
      _periodName: "Khảo sát Tuyển sinh Đầu vào",
      _batchName: "Đợt mẫu Quy chế"
    },
    {
      studentCode: "HS_QC_002",
      fullName: "Trần Bảo Ngọc (Mẫu K5 - HNG Tuyển thẳng Flyers)",
      dateOfBirth: "2016-09-20",
      gender: "Nữ",
      grade: "5",
      surveyFormType: "HNG",
      surveySystem: "Trực tiếp",
      admissionCriteria: "Tuyển thẳng",
      registeredCampus: "CS3 - Sky-Line Global",
      oldSchoolName: "Trường Tiểu học Hoàng Văn Thụ",
      targetType: "Nội tỉnh",
      hocKy: "Cả năm",
      kqRenLuyen: "Tốt",
      kqHocTap: JSON.stringify({
        programType: "BO_GD_DT",
        transcriptPeriod: "CA_NAM",
        overallRating: "Hoàn thành xuất sắc",
        achievements: "Chứng chỉ Cambridge Flyers 15 khiên",
        moet: {
          gradeLevel: "5",
          overallRating: "Hoàn thành xuất sắc",
          conductRating: "Tốt",
          achievements: "Chứng chỉ Cambridge Flyers 15 khiên",
          subjects: [
            { id: "toan", name: "Toán", score: String(Math.max(9.0, rK25.minCoreScoreHNG_SB || 8.0)) },
            { id: "tv", name: "Tiếng Việt", score: String(Math.max(8.5, rK25.minCoreScoreHNG_SB || 8.0)) },
            { id: "ta", name: "Tiếng Anh", score: "9.5" }
          ]
        }
      }),
      _periodName: "Khảo sát Tuyển sinh Đầu vào",
      _batchName: "Đợt mẫu Quy chế"
    },
    {
      studentCode: "HS_QC_003",
      fullName: "Lê Hoàng Nam (Mẫu K6 - HNS Xét học bạ Toán-Văn)",
      dateOfBirth: "2015-02-10",
      gender: "Nam",
      grade: "6",
      surveyFormType: "HNS",
      surveySystem: "Trực tiếp",
      admissionCriteria: "Xét tuyển",
      registeredCampus: "CS1 - Sky-Line Riverside",
      oldSchoolName: "Trường THCS Tây Sơn",
      targetType: "Nội tỉnh",
      hocKy: "Cả năm",
      kqRenLuyen: "Tốt",
      kqHocTap: JSON.stringify({
        programType: "BO_GD_DT",
        transcriptPeriod: "CA_NAM",
        overallRating: "Khá",
        moet: {
          gradeLevel: "6",
          overallRating: "Khá",
          conductRating: "Tốt",
          subjects: [
            { id: "toan", name: "Toán", score: String(Math.max(7.5, rK69.minCoreScoreHNS || 7.0)) },
            { id: "van", name: "Ngữ Văn", score: String(Math.max(7.5, rK69.minCoreScoreHNS || 7.0)) },
            { id: "ta", name: "Tiếng Anh", score: "7.8" }
          ]
        }
      }),
      _periodName: "Khảo sát Tuyển sinh Đầu vào",
      _batchName: "Đợt mẫu Quy chế"
    },
    {
      studentCode: "HS_QC_004",
      fullName: "Phạm Hà My (Mẫu K8 - HNG Xét học bạ Toán-Văn)",
      dateOfBirth: "2013-11-05",
      gender: "Nữ",
      grade: "8",
      surveyFormType: "HNG",
      surveySystem: "Trực tiếp",
      admissionCriteria: "Xét tuyển",
      registeredCampus: "CS4 - Sky-Line Hill",
      oldSchoolName: "Trường THCS Trưng Vương",
      targetType: "Nội tỉnh",
      hocKy: "Cả năm",
      kqRenLuyen: "Tốt",
      kqHocTap: JSON.stringify({
        programType: "BO_GD_DT",
        transcriptPeriod: "CA_NAM",
        overallRating: "Tốt",
        moet: {
          gradeLevel: "8",
          overallRating: "Tốt",
          conductRating: "Tốt",
          subjects: [
            { id: "toan", name: "Toán", score: String(Math.max(8.5, rK69.minCoreScoreHNG_SB || 8.0)) },
            { id: "van", name: "Ngữ Văn", score: String(Math.max(8.2, rK69.minCoreScoreHNG_SB || 8.0)) },
            { id: "ta", name: "Tiếng Anh", score: "8.6" }
          ]
        }
      }),
      _periodName: "Khảo sát Tuyển sinh Đầu vào",
      _batchName: "Đợt mẫu Quy chế"
    },
    {
      studentCode: "HS_QC_005",
      fullName: "Võ Quốc Anh (Mẫu K10 - SB Tuyển thẳng IELTS)",
      dateOfBirth: "2011-06-28",
      gender: "Nam",
      grade: "10",
      surveyFormType: "SB",
      surveySystem: "Trực tiếp",
      admissionCriteria: "Tuyển thẳng",
      registeredCampus: "CS3 - Sky-Line Global",
      oldSchoolName: "Trường THCS Nguyễn Khuyến",
      targetType: "Nội tỉnh",
      hocKy: "Cả năm",
      kqRenLuyen: "Tốt",
      kqHocTap: JSON.stringify({
        programType: "BO_GD_DT",
        transcriptPeriod: "CA_NAM",
        overallRating: "Giỏi",
        achievements: "Chứng chỉ IELTS 6.5, Giải Nhì HSG Tiếng Anh cấp Thành phố",
        moet: {
          gradeLevel: "10",
          overallRating: "Giỏi",
          conductRating: "Tốt",
          achievements: "Chứng chỉ IELTS 6.5, Giải Nhì HSG Tiếng Anh cấp Thành phố",
          subjects: [
            { id: "toan", name: "Toán", score: String(Math.max(8.8, rK1012.minCoreScoreHNG_SB || 8.0)) },
            { id: "van", name: "Ngữ Văn", score: String(Math.max(8.3, rK1012.minCoreScoreHNG_SB || 8.0)) },
            { id: "ta", name: "Tiếng Anh", score: "9.2" }
          ]
        }
      }),
      _periodName: "Khảo sát Tuyển sinh Đầu vào",
      _batchName: "Đợt mẫu Quy chế"
    }
  ]

  return sampleStudents.map((st, idx) =>
    buildEligibleStudentRegulationRow(st, idx, regConfig, {
      periodName: st._periodName,
      batchName: st._batchName,
      campusName: st.registeredCampus
    })
  )
}

/**
 * Tạo bảng tóm tắt Quy chế Tuyển sinh & Điều kiện miễn môn văn hóa (Sheet 2 trong file Excel)
 */
export function buildRegulationRulesSheetRows(customConfig?: AdmissionRegulationConfig) {
  const regConfig = customConfig || DEFAULT_ADMISSION_REGULATIONS
  return regConfig.rules
    .filter(r => r.isActive !== false)
    .map((r, idx) => ({
      "STT": idx + 1,
      "Nhóm Cấp / Khối": r.name,
      "Các Khối áp dụng": r.grades.map(g => `Khối ${g}`).join(", "),
      "Hệ áp dụng": r.systems.join(", "),
      "Xếp loại Học tập tối thiểu": r.minAcademicRatings.join(", "),
      "Xếp loại Rèn luyện tối thiểu": r.minConductRatings.join(", "),
      "Ngưỡng điểm Toán - Văn (Hệ HNS)": r.minCoreScoreHNS > 0 ? `>= ${r.minCoreScoreHNS}` : "Không yêu cầu điểm học bạ",
      "Ngưỡng điểm Toán - Văn (Hệ HNG / SB)": r.minCoreScoreHNG_SB > 0 ? `>= ${r.minCoreScoreHNG_SB}` : "Không yêu cầu điểm học bạ",
      "Ngưỡng Tiếng Anh Tuyển thẳng": r.minEnglishScoreDirect > 0 ? `>= ${r.minEnglishScoreDirect}` : "—",
      "Từ khóa Chứng chỉ QT / Thành tích": r.intlCertKeywords || "—",
      "Môn Văn hóa được miễn (Khi đạt học bạ)": r.transcriptExemptSubjects.join(", ") || "Không miễn",
      "Môn KS diện Xét học bạ": r.defaultSubjects.filter(s => !r.transcriptExemptSubjects.includes(s)).join(", "),
      "Môn KS diện Tuyển thẳng": r.directAdmissionSubjects.join(", "),
      "Ghi chú Quy chế": r.regulationNote || ""
    }))
}

/**
 * Xuất file Excel Danh sách Học sinh đủ điều kiện khảo sát theo quy chế (Xét học bạ / Tuyển thẳng - Miễn môn văn hóa)
 * hoặc Xuất file Mẫu chuẩn (.xlsx) nếu chọn chế độ tải mẫu.
 */
export function exportEligibleStudentsRegulationExcel(options: {
  students?: any[]
  customConfig?: AdmissionRegulationConfig
  campuses?: any[]
  periods?: any[]
  templateOnly?: boolean
  fileName?: string
}): { exportedCount: number; fileName: string; isSample: boolean } {
  const regConfig = options.customConfig || DEFAULT_ADMISSION_REGULATIONS
  const campuses = options.campuses || []
  const periods = options.periods || []

  const eligibleStudents = options.templateOnly
    ? []
    : (options.students || []).filter(s => isStudentEligibleByRegulation(s, regConfig))

  const isSample = options.templateOnly || eligibleStudents.length === 0

  const mainRows = isSample
    ? getSampleRegulationEligibleRows(regConfig)
    : eligibleStudents.map((s, idx) => {
        const pObj = periods.find((p: any) => p.id === s.periodId)
        const bObj =
          (pObj?.batches || periods.flatMap((p: any) => p.batches || [])).find(
            (b: any) => b.id === s.batchId
          )
        const cObj = campuses.find(
          (c: any) =>
            c.id === s.registeredCampus ||
            c.campusCode === s.registeredCampus ||
            c.campusName === s.registeredCampus ||
            c.id === s.admissionCampus ||
            c.campusCode === s.admissionCampus ||
            c.campusName === s.admissionCampus
        )
        return buildEligibleStudentRegulationRow(s, idx, regConfig, {
          periodName: s.period?.name || pObj?.name || "",
          batchName: s.batch?.name || bObj?.name || "",
          campusName: cObj ? `${cObj.campusCode} - ${cObj.campusName}` : s.registeredCampus || s.admissionCampus || ""
        })
      })

  const wb = XLSX.utils.book_new()

  const wsMain = XLSX.utils.json_to_sheet(mainRows)
  wsMain["!cols"] = [
    { wch: 6 },  // STT
    { wch: 14 }, // Mã HS KS
    { wch: 30 }, // Họ và Tên *
    { wch: 13 }, // Ngày sinh
    { wch: 10 }, // Giới tính
    { wch: 8 },  // Khối
    { wch: 13 }, // Hệ Khảo sát
    { wch: 24 }, // Đăng ký CS
    { wch: 26 }, // Kỳ / Đợt khảo sát
    { wch: 26 }, // Trường học cũ
    { wch: 18 }, // Đối tượng Tuyển sinh
    { wch: 18 }, // Hồ sơ / Bảng điểm
    { wch: 15 }, // Học kỳ / Năm TS
    { wch: 22 }, // KQ Xếp loại Học tập
    { wch: 16 }, // Kết quả Rèn luyện
    { wch: 12 }, // Điểm Toán
    { wch: 22 }, // Điểm Tiếng Việt / Ngữ Văn
    { wch: 14 }, // Điểm Tiếng Anh
    { wch: 36 }, // Thành tích / Chứng chỉ QT
    { wch: 38 }, // Kết quả Học tập
    { wch: 18 }, // Diện khảo sát
    { wch: 14 }, // Hình thức KS
    { wch: 28 }, // Diện Đủ ĐK theo Quy chế
    { wch: 26 }, // Môn Văn hóa được miễn KS
    { wch: 36 }, // Môn cần phân công KS
    { wch: 32 }, // Nhóm Quy chế áp dụng
    { wch: 55 }  // Căn cứ Quy chế chi tiết
  ]

  XLSX.utils.book_append_sheet(
    wb,
    wsMain,
    isSample ? "Mau_HS_Du_DK_Quy_Che" : "DS_HS_Du_DK_Quy_Che"
  )

  // Nếu xuất danh sách thực tế thì đính kèm thêm Sheet mẫu tham khảo để đối chiếu
  if (!isSample) {
    const wsSample = XLSX.utils.json_to_sheet(getSampleRegulationEligibleRows(regConfig))
    wsSample["!cols"] = wsMain["!cols"]
    XLSX.utils.book_append_sheet(wb, wsSample, "Mau_Tham_Khao")
  }

  // Sheet Quy chế Tuyển sinh & Điều kiện miễn môn văn hóa
  const ruleRows = buildRegulationRulesSheetRows(regConfig)
  const wsRules = XLSX.utils.json_to_sheet(ruleRows)
  wsRules["!cols"] = [
    { wch: 6 },
    { wch: 34 },
    { wch: 24 },
    { wch: 16 },
    { wch: 36 },
    { wch: 24 },
    { wch: 26 },
    { wch: 30 },
    { wch: 24 },
    { wch: 36 },
    { wch: 28 },
    { wch: 36 },
    { wch: 32 },
    { wch: 60 }
  ]
  XLSX.utils.book_append_sheet(wb, wsRules, "Quy_Che_Mien_Mon_VH")

  const dateStr = new Date().toISOString().slice(0, 10)
  const finalFileName =
    options.fileName ||
    (isSample
      ? `Mau_DS_HS_Du_DK_Khao_Sat_Theo_Quy_Che.xlsx`
      : `Danh_Sach_HS_Du_DK_Khao_Sat_Theo_Quy_Che_${dateStr}.xlsx`)

  XLSX.writeFile(wb, finalFileName)

  return {
    exportedCount: isSample ? mainRows.length : eligibleStudents.length,
    fileName: finalFileName,
    isSample
  }
}

