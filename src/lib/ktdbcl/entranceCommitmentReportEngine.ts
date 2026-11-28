import { prisma } from "@/lib/db"
import {
  extractGradeNumber,
  normalizeGradeColumnDefs,
} from "@/lib/grading/vnedu-config-types"
import {
  extractScoreFromGradeEntry,
  parseRawStudentTestStatus,
  resolveEducationLevel,
} from "@/lib/ktdbcl/thkqPeriodicReportEngine"
import { ThkqAccessScope } from "@/lib/ktdbcl/thkqPermissions"

export type CommitmentPeriodCode = "KSĐN" | "GK1" | "CK1" | "GK2" | "CK2"

export const COMMITMENT_PERIODS: Array<{
  code: CommitmentPeriodCode
  label: string
  shortLabel: string
}> = [
  { code: "KSĐN", label: "KSĐN", shortLabel: "KSĐN" },
  { code: "GK1", label: "Giữa kỳ 1", shortLabel: "GK1" },
  { code: "CK1", label: "Cuối kỳ 1", shortLabel: "CK1" },
  { code: "GK2", label: "Giữa kỳ 2", shortLabel: "GK2" },
  { code: "CK2", label: "Cuối kỳ 2", shortLabel: "CK2" },
]

export type SklComparisonStatus =
  | "ABOVE"
  | "BELOW"
  | "EQUAL"
  | "NO_BENCHMARK"
  | "NO_SCORE"

export interface CommitmentScoreCell {
  period: CommitmentPeriodCode
  score: number | null
  benchmark: number | null
  arrow: "↑" | "↓" | null
  comparison: SklComparisonStatus
  display: string
  ariaLabel: string
  sourceNote?: string | null
}

export interface EntranceCommitmentReportRow {
  rowKey: string
  stt: number
  studentId: string
  studentCode: string
  studentName: string
  classId: string
  className: string
  classCode: string
  grade: string
  level: "TIEU_HOC" | "THCS" | "THPT"
  campusId: string
  campusName: string
  campusCode: string
  committedSubject: string
  committedSubjectCode: string
  scores: Record<CommitmentPeriodCode, CommitmentScoreCell>
}

export interface EntranceCommitmentClassGroup {
  classId: string
  className: string
  classCode: string
  grade: string
  level: "TIEU_HOC" | "THCS" | "THPT"
  campusId: string
  campusName: string
  campusCode: string
  studentCount: number
  rowCount: number
  rows: EntranceCommitmentReportRow[]
}

export interface EntranceCommitmentFilterInput {
  academicYearId?: string
  campusId?: string
  classId?: string
  committedSubject?: string
}

export interface EntranceCommitmentReconciliationNote {
  type:
    | "DUPLICATE_COMMITMENT_MERGED"
    | "STUDENT_TRANSFERRED_CLASS"
    | "MAKEUP_OR_UPDATED_SCORE_USED"
    | "UNASSIGNED_CLASS_EXCLUDED"
    | "MISSING_BENCHMARK_CONFIG"
  studentCode?: string
  studentName?: string
  subject?: string
  period?: string
  detail: string
}

export interface EntranceCommitmentReportResult {
  filters: {
    academicYearId: string
    academicYearName: string
    campusId: string
    campusName: string
    classId: string
    className: string
    committedSubject: string
  }
  availableFilters: {
    academicYears: Array<{ id: string; name: string; status: string }>
    campuses: Array<{ id: string; campusCode: string; campusName: string }>
    classes: Array<{
      id: string
      classCode: string
      className: string
      grade: string
      campusId: string
      campusCode: string
      campusName: string
      displayLabel: string
      commitmentRowCount: number
    }>
    subjects: Array<{
      code: string
      name: string
      rowCount: number
    }>
  }
  summary: {
    totalClasses: number
    totalDistinctStudents: number
    totalCommitmentRows: number
    periodScoredCounts: Record<CommitmentPeriodCode, number>
  }
  classGroups: EntranceCommitmentClassGroup[]
  reconciliationNotes: EntranceCommitmentReconciliationNote[]
  missingBenchmarkSubjects: string[]
}

/**
 * Chuẩn hóa chuỗi tiếng Việt để so khớp tên học sinh / môn học
 */
export function cleanNormalizedString(str: string | null | undefined): string {
  if (!str) return ""
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, "")
    .trim()
}

/**
 * Kiểm tra môn không phải văn hóa (Tâm lý, Hướng nghiệp)
 */
export function isNonAcademicCommitmentSubject(subName: string | null | undefined): boolean {
  const lower = String(subName || "").toLowerCase().trim()
  if (!lower) return true
  return (
    lower.includes("tâm lý") ||
    lower.includes("tam ly") ||
    lower.includes("tâm lí") ||
    lower.includes("psychology") ||
    lower.includes("hướng nghiệp") ||
    lower.includes("huong nghiep") ||
    lower.includes("nề nếp") ||
    lower.includes("ne nep") ||
    lower.includes("kỷ luật") ||
    lower.includes("ky luat") ||
    lower.includes("hạnh kiểm") ||
    lower.includes("rèn luyện")
  )
}

/**
 * Chuẩn hóa tên môn cam kết đầu vào theo cấp học (Tiểu học vs Trung học)
 */
export function normalizeCommittedSubjectName(
  rawSubject: string,
  isPrimary: boolean
): string | null {
  const clean = String(rawSubject || "")
    .trim()
    .replace(/^môn\s+/i, "")
    .trim()
  if (!clean || isNonAcademicCommitmentSubject(clean)) return null

  const lower = clean.toLowerCase()
  if (
    lower.includes("anh") ||
    lower.includes("english") ||
    lower.includes("esl") ||
    lower.includes("ept")
  ) {
    return "Tiếng Anh"
  }
  if (lower.includes("toán") || lower.includes("toan") || lower.includes("math")) {
    return "Toán"
  }
  if (lower.includes("tiếng việt") || lower.includes("tieng viet") || lower === "tv") {
    return "Tiếng Việt"
  }
  if (
    lower.includes("ngữ văn") ||
    lower.includes("ngu van") ||
    lower.includes("literature") ||
    lower === "văn" ||
    lower.includes("văn")
  ) {
    return isPrimary ? "Tiếng Việt" : "Ngữ văn"
  }
  if (lower.includes("khoa học tự nhiên") || lower === "khtn") {
    return "Khoa học tự nhiên"
  }
  if (lower.includes("vật lý") || lower.includes("vật lí") || lower.includes("physics")) {
    return "Vật lý"
  }
  if (lower.includes("hóa học") || lower.includes("hoa hoc") || lower.includes("chemistry")) {
    return "Hóa học"
  }
  if (lower.includes("sinh học") || lower.includes("sinh hoc") || lower.includes("biology")) {
    return "Sinh học"
  }
  if (lower.includes("lịch sử") || lower.includes("lich su") || lower.includes("history")) {
    return "Lịch sử"
  }
  if (lower.includes("địa lý") || lower.includes("địa lí") || lower.includes("geography")) {
    return "Địa lý"
  }
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

/**
 * Kiểm tra ghi chú khảo sát đầu vào có phải là "Không cần cam kết" hay không
 */
export function isExplicitNonCommitmentRecord(
  admissionResult?: string | null,
  directorNote?: string | null
): boolean {
  const resText = String(admissionResult || "").trim()
  const noteText = String(directorNote || "").trim()
  const hasResultCommitment = /cam\s*kết|cam\s*ket/i.test(resText)
  if (hasResultCommitment) return false

  const hasExplicitBracketList =
    /(?:Môn cam kết|Mon cam ket|Cam kết|Môn kiểm tra lại):\s*\[?([^\]\r\n]+)\]?/i.test(
      noteText
    )
  if (hasExplicitBracketList) return false

  if (
    /không\s*cần\s*cam\s*kết|khong\s*can\s*cam\s*ket|không\s*cam\s*kết|khong\s*cam\s*ket/i.test(
      noteText
    )
  ) {
    return true
  }
  return false
}

/**
 * Trích xuất danh sách môn văn hóa cam kết đầu vào từ ghi chú / kết quả khảo sát đầu vào
 */
export function parseAcademicCommittedSubjects(
  note: string | null | undefined,
  resultStr?: string | null | undefined,
  className?: string | null,
  gradeStr?: string | null
): string[] {
  if (isExplicitNonCommitmentRecord(resultStr, note)) {
    return []
  }

  const text = `${note || ""} ${resultStr || ""}`.trim()
  if (!text) return []

  const isPrimary = Boolean(
    (className && /^[1-5]([._\s/A-Za-z]|$)|lớp\s*[1-5]\b/i.test(className.trim())) ||
      (gradeStr && /^(khối\s*)?[1-5]$/i.test(gradeStr.trim()))
  )

  const match = text.match(
    /(?:Môn cam kết|Mon cam ket|Cam kết|Môn kiểm tra lại):\s*\[?([^\]\r\n]+)\]?/i
  )
  let rawSubs: string[] = []
  if (match && match[1]) {
    rawSubs = match[1]
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
  } else {
    if (/Anh|English|ESL|EPT/i.test(text)) rawSubs.push("Tiếng Anh")
    if (/Toán|Math/i.test(text)) rawSubs.push("Toán")
    if (/Tiếng Việt/i.test(text)) rawSubs.push("Tiếng Việt")
    else if (/Ngữ văn|Literature|\bVăn\b/i.test(text)) {
      rawSubs.push(isPrimary ? "Tiếng Việt" : "Ngữ văn")
    }
  }

  const finalSubs: string[] = []
  for (const s of rawSubs) {
    const normalized = normalizeCommittedSubjectName(s, isPrimary)
    if (normalized && !finalSubs.includes(normalized)) {
      finalSubs.push(normalized)
    }
  }
  return finalSubs
}

/**
 * Kiểm tra một môn học trong bảng Subject của SSM có khớp với môn cam kết đầu vào hay không
 */
export function doesSubjectMatchCommittedSubject(
  committedSubject: string,
  dbSubject: { id?: string; subjectCode?: string | null; subjectName?: string | null }
): boolean {
  const cNorm = cleanNormalizedString(committedSubject)
  const sName = String(dbSubject.subjectName || "").toLowerCase().trim()
  const sCode = String(dbSubject.subjectCode || "").toUpperCase().trim()
  const sNorm = cleanNormalizedString(sName)

  if (cNorm === "toan" || cNorm === "toanhoc") {
    return (
      sCode === "TOA" ||
      sCode === "MAT" ||
      sName.includes("toán") ||
      sNorm.includes("toan") ||
      sName.includes("math")
    )
  }

  if (cNorm === "tiengviet") {
    return (
      sCode === "TVI" ||
      sName.includes("tiếng việt") ||
      sNorm.includes("tiengviet")
    )
  }

  if (cNorm === "nguvan" || cNorm === "van") {
    return (
      sCode === "NVA" ||
      sName.includes("ngữ văn") ||
      sNorm.includes("nguvan") ||
      sName === "văn"
    )
  }

  if (cNorm === "tienganh" || cNorm === "anh") {
    return (
      sCode === "TA" ||
      sCode === "ESL" ||
      sCode === "INT-AE" ||
      sCode === "EPT" ||
      sCode === "TAV" ||
      sCode === "TAVD" ||
      sName.includes("tiếng anh") ||
      sNorm.includes("tienganh") ||
      sName.includes("english") ||
      sName === "esl"
    )
  }

  return sNorm === cNorm || sCode.toLowerCase() === cNorm
}

/**
 * Định dạng số điểm hiển thị theo chuẩn dấu phẩy thập phân tiếng Việt:
 * - Điểm 0 là kết quả hợp lệ và hiển thị là "0"
 * - Điểm 10 hiển thị là "10"
 * - Ở cấp Tiểu học (hoặc khi integerFormat = true): số nguyên hiển thị gọn (ví dụ 8 -> "8"), số lẻ giữ phần thập phân (ví dụ 7.5 -> "7,5")
 * - Ở cấp THCS/THPT (mặc định): hiển thị tối thiểu 1 chữ số thập phân cho điểm (0, 10) như 5,0; 4,5; 8,25
 */
export function formatCommitmentScoreNumber(
  score: number,
  options?: { level?: "TIEU_HOC" | "THCS" | "THPT"; integerFormat?: boolean }
): string {
  const rounded = Math.round((score + Number.EPSILON) * 100) / 100
  if (Math.abs(rounded) <= 1e-9) return "0"
  if (Math.abs(rounded - 10) <= 1e-9) return "10"

  const useIntegerForWhole =
    options?.integerFormat === true || options?.level === "TIEU_HOC"

  if (Number.isInteger(rounded)) {
    return useIntegerForWhole ? String(rounded) : `${rounded},0`
  }

  const oneDec = Math.round((rounded + Number.EPSILON) * 10) / 10
  if (Math.abs(rounded - oneDec) <= 1e-9) {
    return oneDec.toFixed(1).replace(".", ",")
  }

  return rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",")
}

/**
 * Định dạng ô điểm kèm mũi tên đối chiếu chuẩn Sky-Line (SKL)
 * - Điểm > chuẩn: "<điểm> ↑"
 * - Điểm < chuẩn: "<điểm> ↓"
 * - Điểm = chuẩn hoặc chưa có chuẩn: "<điểm>"
 * - Chưa có điểm: "—"
 */
export function formatCommitmentScoreWithSklArrow(
  score: number | null | undefined,
  benchmark: number | null | undefined,
  options?: {
    period?: CommitmentPeriodCode
    level?: "TIEU_HOC" | "THCS" | "THPT"
    integerFormat?: boolean
    sourceNote?: string | null
  }
): CommitmentScoreCell {
  const period = options?.period || "KSĐN"
  const cleanBenchmark =
    benchmark !== null && benchmark !== undefined && !Number.isNaN(Number(benchmark))
      ? Number(benchmark)
      : null

  if (score === null || score === undefined || Number.isNaN(Number(score))) {
    return {
      period,
      score: null,
      benchmark: cleanBenchmark,
      arrow: null,
      comparison: "NO_SCORE",
      display: "—",
      ariaLabel: "Chưa có điểm",
      sourceNote: options?.sourceNote || null,
    }
  }

  const numericScore = Number(score)
  const formattedScore = formatCommitmentScoreNumber(numericScore, {
    level: options?.level,
    integerFormat: options?.integerFormat,
  })

  if (cleanBenchmark === null) {
    return {
      period,
      score: numericScore,
      benchmark: null,
      arrow: null,
      comparison: "NO_BENCHMARK",
      display: formattedScore,
      ariaLabel: `Điểm ${formattedScore} (chưa có cấu hình chuẩn SKL)`,
      sourceNote: options?.sourceNote || null,
    }
  }

  const eps = 1e-9
  const formattedBenchmark = formatCommitmentScoreNumber(cleanBenchmark, {
    level: options?.level,
    integerFormat: options?.integerFormat,
  })

  if (numericScore > cleanBenchmark + eps) {
    return {
      period,
      score: numericScore,
      benchmark: cleanBenchmark,
      arrow: "↑",
      comparison: "ABOVE",
      display: `${formattedScore} ↑`,
      ariaLabel: `Điểm ${formattedScore}, cao hơn chuẩn SKL (${formattedBenchmark})`,
      sourceNote: options?.sourceNote || null,
    }
  }

  if (numericScore < cleanBenchmark - eps) {
    return {
      period,
      score: numericScore,
      benchmark: cleanBenchmark,
      arrow: "↓",
      comparison: "BELOW",
      display: `${formattedScore} ↓`,
      ariaLabel: `Điểm ${formattedScore}, thấp hơn chuẩn SKL (${formattedBenchmark})`,
      sourceNote: options?.sourceNote || null,
    }
  }

  return {
    period,
    score: numericScore,
    benchmark: cleanBenchmark,
    arrow: null,
    comparison: "EQUAL",
    display: formattedScore,
    ariaLabel: `Điểm ${formattedScore}, bằng chuẩn SKL (${formattedBenchmark})`,
    sourceNote: options?.sourceNote || null,
  }
}

/**
 * Tra cứu cấu hình điểm chuẩn Sky-Line (SKL) hiện hành từ bảng SubjectBenchmarkConfig.
 * Tuyệt đối không tự đặt ngưỡng mặc định nếu hệ thống thiếu cấu hình cho môn/cấp/khối.
 */
export function resolveConfiguredSklBenchmark(params: {
  benchmarkConfigs: Array<{
    academicYearId?: string
    evaluationPeriod?: string | null
    level?: string | null
    grade?: string | null
    subjectId?: string | null
    benchmarkScore: number
  }>
  level: "TIEU_HOC" | "THCS" | "THPT"
  grade: string
  matchedSubjectIds: string[]
  committedSubject: string
  period: CommitmentPeriodCode
}): number | null {
  const { benchmarkConfigs, level, grade, matchedSubjectIds, committedSubject, period } = params
  if (!benchmarkConfigs || benchmarkConfigs.length === 0) return null

  const cleanGradeNum = extractGradeNumber(grade)
  const gradeCandidates = new Set<string>([
    String(grade || "").trim(),
    cleanGradeNum !== null ? String(cleanGradeNum) : "",
    cleanGradeNum !== null ? `Khối ${cleanGradeNum}` : "",
  ])
  gradeCandidates.delete("")

  const subjectCandidates = new Set<string>([
    ...matchedSubjectIds,
    committedSubject,
    cleanNormalizedString(committedSubject),
  ])

  const matchesSubject = (cfgSubId?: string | null) => {
    if (!cfgSubId || cfgSubId === "ALL") return false
    if (subjectCandidates.has(cfgSubId)) return true
    return cleanNormalizedString(cfgSubId) === cleanNormalizedString(committedSubject)
  }

  const matchesGrade = (cfgGrade?: string | null) => {
    if (!cfgGrade || cfgGrade === "ALL") return false
    if (gradeCandidates.has(cfgGrade.trim())) return true
    const cfgGradeNum = extractGradeNumber(cfgGrade)
    return cleanGradeNum !== null && cfgGradeNum !== null && cleanGradeNum === cfgGradeNum
  }

  const matchesLevel = (cfgLevel?: string | null) => {
    if (!cfgLevel || cfgLevel === "ALL") return false
    const u = cfgLevel.toUpperCase().trim()
    if (u === level) return true
    if (level === "TIEU_HOC" && (u.includes("TIỂU") || u.includes("TIEU"))) return true
    if (level === "THCS" && u.includes("THCS")) return true
    if (level === "THPT" && u.includes("THPT")) return true
    return false
  }

  // 1. Môn cụ thể + Khối cụ thể + Kỳ cụ thể
  const m1 = benchmarkConfigs.find(
    (b) =>
      matchesSubject(b.subjectId) &&
      matchesGrade(b.grade) &&
      b.evaluationPeriod === period
  )
  if (m1) return Number(m1.benchmarkScore)

  // 2. Môn cụ thể + Khối cụ thể + Tất cả kỳ (ALL)
  const m2 = benchmarkConfigs.find(
    (b) =>
      matchesSubject(b.subjectId) &&
      matchesGrade(b.grade) &&
      (!b.evaluationPeriod || b.evaluationPeriod === "ALL")
  )
  if (m2) return Number(m2.benchmarkScore)

  // 3. Môn cụ thể + Bậc học + Kỳ cụ thể
  const m3 = benchmarkConfigs.find(
    (b) =>
      matchesSubject(b.subjectId) &&
      (!b.grade || b.grade === "ALL") &&
      matchesLevel(b.level) &&
      b.evaluationPeriod === period
  )
  if (m3) return Number(m3.benchmarkScore)

  // 4. Môn cụ thể + Bậc học + Tất cả kỳ (ALL)
  const m4 = benchmarkConfigs.find(
    (b) =>
      matchesSubject(b.subjectId) &&
      (!b.grade || b.grade === "ALL") &&
      matchesLevel(b.level) &&
      (!b.evaluationPeriod || b.evaluationPeriod === "ALL")
  )
  if (m4) return Number(m4.benchmarkScore)

  // 5. Nếu có cấu hình riêng cho môn này ở khối/cấp khác nhưng KHÔNG có cho khối/cấp đang xét,
  // hoặc nếu hệ thống dùng cấu hình chuẩn theo Khối / Bậc học cho tất cả các môn (subjectId === "ALL"):
  const m5 = benchmarkConfigs.find(
    (b) =>
      (!b.subjectId || b.subjectId === "ALL") &&
      matchesGrade(b.grade) &&
      (b.evaluationPeriod === period || !b.evaluationPeriod || b.evaluationPeriod === "ALL")
  )
  if (m5) return Number(m5.benchmarkScore)

  const m6 = benchmarkConfigs.find(
    (b) =>
      (!b.subjectId || b.subjectId === "ALL") &&
      (!b.grade || b.grade === "ALL") &&
      matchesLevel(b.level) &&
      (b.evaluationPeriod === period || !b.evaluationPeriod || b.evaluationPeriod === "ALL")
  )
  if (m6) return Number(m6.benchmarkScore)

  return null
}

/**
 * Trích xuất điểm chính thức của học sinh cho 1 kỳ (KSĐN, GK1, CK1, GK2, CK2) từ danh sách bản ghi SubjectGradeEntry
 * Ưu tiên:
 * 1) Điểm thi lại / kiểm tra bù hợp lệ (kt_bu, makeup, diem_bu)
 * 2) Bản ghi đúng kỳ (KSĐN, GK1, CK1, GK2, CK2) có nguồn chính thức (VNEDU_IMPORT > MANUAL/INTERNAL) và cập nhật mới nhất
 * 3) Bản ghi HK1/HK2 có cột điểm thành phần tương ứng (gk cho GK1/GK2, ck cho CK1/CK2)
 */
export function resolveStudentPeriodScoreFromEntries(params: {
  entries: any[]
  period: CommitmentPeriodCode
  configsByKey: Map<string, any>
  gradeNum: number | null
}): {
  score: number | null
  hasMakeupOrUpdate: boolean
  detailNote?: string | null
} {
  const { entries, period, configsByKey, gradeNum } = params
  if (!entries || entries.length === 0) {
    return { score: null, hasMakeupOrUpdate: false }
  }

  // Lọc các bản ghi thuộc kỳ cần lấy (hoặc bản ghi HK1/HK2 chứa điểm thành phần GK/CK)
  const candidateEntries = entries.filter((e) => {
    const ep = String(e.evaluationPeriod || "").toUpperCase().trim()
    if (period === "KSĐN") {
      return ep === "KSĐN" || ep === "KSDN" || ep === "ĐẦU NĂM"
    }
    if (period === "GK1") {
      return ep === "GK1" || ep === "HK1"
    }
    if (period === "CK1") {
      return ep === "CK1" || ep === "HK1"
    }
    if (period === "GK2") {
      return ep === "GK2" || ep === "HK2"
    }
    if (period === "CK2") {
      return ep === "CK2" || ep === "HK2"
    }
    return false
  })

  if (candidateEntries.length === 0) {
    return { score: null, hasMakeupOrUpdate: false }
  }

  // Sắp xếp ưu tiên:
  // - Bản ghi có kỳ khớp trực tiếp (VD: GK1 > HK1)
  // - Bản ghi có điểm kiểm tra bù
  // - Nguồn VNEDU_IMPORT ưu tiên cho kỳ định kỳ (GK1, CK1, GK2, CK2)
  // - Bản ghi cập nhật mới nhất (updatedAt DESC)
  const scoredCandidates: Array<{
    score: number
    isDirectPeriod: boolean
    isMakeup: boolean
    isVnedu: boolean
    updatedAtMs: number
    subjectCode: string
  }> = []

  for (const entry of candidateEntries) {
    const ep = String(entry.evaluationPeriod || "").toUpperCase().trim()
    const isDirectPeriod =
      ep === period || (period === "KSĐN" && (ep === "KSĐN" || ep === "KSDN"))

    const cfgKey = `${entry.subjectId}_${gradeNum ?? "ALL"}_${ep}_${entry.configType || "VNEDU"}`
    const fallbackCfgKey = `${entry.subjectId}_${gradeNum ?? "ALL"}_${period}_${entry.configType || "VNEDU"}`
    const config = configsByKey.get(cfgKey) || configsByKey.get(fallbackCfgKey) || null

    // Nếu bản ghi là HK1/HK2 mà đang tìm CK1/CK2, bắt buộc bản ghi phải thực sự có cột điểm cuối kỳ (ck)
    if (!isDirectPeriod && (period === "CK1" || period === "CK2")) {
      let comp: Record<string, any> = {}
      try {
        comp =
          typeof entry.componentScores === "string"
            ? JSON.parse(entry.componentScores)
            : entry.componentScores || {}
      } catch {
        comp = {}
      }
      const colDefs = config ? normalizeGradeColumnDefs(config) : []
      const ckDef = colDefs.find(
        (d) =>
          d.group === "CK" ||
          d.key === "ck" ||
          d.label.toUpperCase().includes("CK") ||
          d.label.toUpperCase().includes("ĐĐGCK")
      )
      const hasExplicitCk =
        (comp.ck !== undefined && String(comp.ck).trim() !== "") ||
        (ckDef && comp[ckDef.key] !== undefined && String(comp[ckDef.key]).trim() !== "") ||
        (comp.kt_bu !== undefined && String(comp.kt_bu).trim() !== "") ||
        (comp.makeup !== undefined && String(comp.makeup).trim() !== "")

      if (!hasExplicitCk) {
        continue
      }
    }

    const extracted = extractScoreFromGradeEntry(entry, period, "OFFICIAL", config)
    const parsed = parseRawStudentTestStatus({
      rawScoreVal: extracted.rawScoreVal,
      remarkText: entry.remark,
      ratingText: entry.ratingValue,
      roundingRule: extracted.roundingRule,
      maxScore: extracted.maxScore,
    })

    if (parsed.statusInTest === "VALID_SCORE" && parsed.officialScore !== null) {
      const isMakeup = extracted.columnLabel === "Điểm KT bù"
      const isVnedu = String(entry.sourceType || "").toUpperCase().includes("VNEDU") || entry.configType === "VNEDU"
      const updatedAtMs = entry.updatedAt ? new Date(entry.updatedAt).getTime() : 0

      scoredCandidates.push({
        score: parsed.officialScore,
        isDirectPeriod,
        isMakeup,
        isVnedu,
        updatedAtMs,
        subjectCode: entry.subject?.subjectCode || "",
      })
    }
  }

  if (scoredCandidates.length === 0) {
    return { score: null, hasMakeupOrUpdate: false }
  }

  scoredCandidates.sort((a, b) => {
    if (a.isMakeup !== b.isMakeup) return a.isMakeup ? -1 : 1
    if (a.isDirectPeriod !== b.isDirectPeriod) return a.isDirectPeriod ? -1 : 1
    if (period !== "KSĐN" && a.isVnedu !== b.isVnedu) return a.isVnedu ? -1 : 1
    return b.updatedAtMs - a.updatedAtMs
  })

  const best = scoredCandidates[0]
  const hasMultipleDistinctScores =
    scoredCandidates.length > 1 &&
    scoredCandidates.some((c) => Math.abs(c.score - best.score) > 1e-9)

  return {
    score: best.score,
    hasMakeupOrUpdate: best.isMakeup || hasMultipleDistinctScores,
    detailNote: best.isMakeup
      ? `Sử dụng điểm kiểm tra bù (${best.score}) cho kỳ ${period}`
      : hasMultipleDistinctScores
        ? `Có ${scoredCandidates.length} bản ghi điểm kỳ ${period}, sử dụng điểm chính thức mới nhất (${best.score})`
        : null,
  }
}

/**
 * Hàm tổng hợp chính cho Báo cáo Học sinh cam kết đầu vào
 */
export async function generateEntranceCommitmentReport(
  filters: EntranceCommitmentFilterInput,
  accessScope: ThkqAccessScope
): Promise<EntranceCommitmentReportResult> {
  // 1. Lấy danh sách năm học
  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, status: true },
  })

  const activeYear =
    academicYears.find((y) => y.status === "ACTIVE") || academicYears[0]

  const selectedYearId =
    filters.academicYearId &&
    academicYears.some((y) => y.id === filters.academicYearId)
      ? filters.academicYearId
      : activeYear?.id || ""

  const selectedYearObj =
    academicYears.find((y) => y.id === selectedYearId) || activeYear

  // 2. Lấy danh sách cơ sở trong phạm vi phân quyền
  const isCampusRestricted = Boolean(accessScope.isCampusRestricted)
  const isClassRestricted = Boolean(
    accessScope.isClassRestricted && (accessScope.allowedClassIds || []).length > 0
  )

  const allCampuses = await prisma.campus.findMany({
    where: {
      status: "ACTIVE",
      ...(isCampusRestricted
        ? { id: { in: accessScope.allowedCampusIds } }
        : {}),
    },
    orderBy: { campusCode: "asc" },
    select: { id: true, campusCode: true, campusName: true },
  })

  // Kiểm tra phân quyền nếu người dùng truyền trực tiếp campusId qua URL
  if (
    filters.campusId &&
    filters.campusId !== "ALL" &&
    isCampusRestricted &&
    !accessScope.allowedCampusIds.includes(filters.campusId)
  ) {
    throw new Error("FORBIDDEN_SCOPE: Tài khoản không có quyền truy cập cơ sở này.")
  }

  // Với tài khoản bị giới hạn chỉ 1 cơ sở, chọn sẵn cơ sở đó
  let selectedCampusId = filters.campusId || "ALL"
  if (isCampusRestricted && allCampuses.length === 1) {
    selectedCampusId = allCampuses[0].id
  } else if (
    selectedCampusId !== "ALL" &&
    !allCampuses.some((c) => c.id === selectedCampusId)
  ) {
    selectedCampusId = isCampusRestricted && allCampuses.length > 0 ? allCampuses[0].id : "ALL"
  }

  // Kiểm tra phân quyền nếu người dùng truyền trực tiếp classId qua URL
  if (
    filters.classId &&
    filters.classId !== "ALL" &&
    isClassRestricted &&
    !accessScope.allowedClassIds.includes(filters.classId)
  ) {
    throw new Error("FORBIDDEN_SCOPE: Tài khoản không có quyền truy cập lớp học này.")
  }

  // 3. Truy vấn dữ liệu phân lớp, học sinh, hồ sơ cam kết đầu vào, điểm số và cấu hình chuẩn SKL
  const p = prisma as any
  const [
    allClasses,
    systemStudents,
    inputPeriods,
    preschoolPeriods,
    rawSupportTargets,
    rawLearningCommitments,
    studentTransfers,
    allSubjects,
    benchmarkConfigs,
    gradeConfigs,
  ] = await Promise.all([
    prisma.class.findMany({
      where: {
        academicYearId: selectedYearId,
        status: "ACTIVE",
      },
      include: {
        campus: { select: { id: true, campusCode: true, campusName: true } },
      },
      orderBy: [{ grade: "asc" }, { className: "asc" }],
    }),
    prisma.student.findMany({
      where: {
        academicYearId: selectedYearId,
        status: { not: "TRANSFERRED_OUT" },
      },
      include: {
        class: {
          include: {
            campus: { select: { id: true, campusCode: true, campusName: true } },
          },
        },
        campus: { select: { id: true, campusCode: true, campusName: true } },
      },
    }),
    prisma.inputAssessmentPeriod.findMany({
      where: { academicYearId: selectedYearId },
      select: { id: true },
    }),
    p.preschoolInputAssessmentPeriod?.findMany
      ? p.preschoolInputAssessmentPeriod
          .findMany({
            where: { academicYearId: selectedYearId },
            select: { id: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
    prisma.learningSupportTarget.findMany({
      where: { academicYearId: selectedYearId },
      include: {
        student: {
          include: {
            class: {
              include: {
                campus: { select: { id: true, campusCode: true, campusName: true } },
              },
            },
          },
        },
        assignments: {
          include: {
            subject: { select: { id: true, subjectCode: true, subjectName: true } },
          },
        },
      },
    }),
    p.studentLearningCommitment?.findMany
      ? p.studentLearningCommitment
          .findMany({
            where: { academicYearId: selectedYearId },
          })
          .catch(() => [])
      : Promise.resolve([]),
    p.studentTransfer?.findMany
      ? p.studentTransfer
          .findMany({
            where: { academicYearId: selectedYearId },
            orderBy: { createdAt: "desc" },
          })
          .catch(() => [])
      : Promise.resolve([]),
    prisma.subject.findMany({
      select: { id: true, subjectCode: true, subjectName: true },
    }),
    p.subjectBenchmarkConfig?.findMany
      ? p.subjectBenchmarkConfig
          .findMany({
            where: { academicYearId: selectedYearId },
          })
          .catch(() => [])
      : Promise.resolve([]),
    p.subjectGradeConfig?.findMany
      ? p.subjectGradeConfig
          .findMany({
            where: { academicYearId: selectedYearId, isActive: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
  ])

  const inputPeriodIds = inputPeriods.map((x: any) => x.id)
  const preschoolPeriodIds = preschoolPeriods.map((x: any) => x.id)

  const [inputStudents, preschoolStudents] = await Promise.all([
    inputPeriodIds.length > 0
      ? prisma.inputAssessmentStudent.findMany({
          where: {
            periodId: { in: inputPeriodIds },
            OR: [
              { admissionResult: { contains: "cam kết" } },
              { admissionResult: { contains: "Cam kết" } },
              { directorNote: { contains: "Môn cam kết" } },
              { directorNote: { contains: "Mon cam ket" } },
              { directorNote: { contains: "cam kết" } },
              { directorNote: { contains: "Cam kết" } },
            ],
          },
          include: {
            enrollmentClass: {
              include: {
                campus: { select: { id: true, campusCode: true, campusName: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    preschoolPeriodIds.length > 0 && p.preschoolInputAssessmentStudent?.findMany
      ? p.preschoolInputAssessmentStudent
          .findMany({
            where: {
              periodId: { in: preschoolPeriodIds },
              OR: [
                { admissionResult: { contains: "cam kết" } },
                { admissionResult: { contains: "Cam kết" } },
                { directorNote: { contains: "Môn cam kết" } },
                { directorNote: { contains: "Mon cam ket" } },
                { directorNote: { contains: "cam kết" } },
                { directorNote: { contains: "Cam kết" } },
              ],
            },
            include: {
              enrollmentClass: {
                include: {
                  campus: { select: { id: true, campusCode: true, campusName: true } },
                },
              },
            },
          })
          .catch(() => [])
      : Promise.resolve([]),
  ])

  const reconciliationNotes: EntranceCommitmentReconciliationNote[] = []
  const classById = new Map<string, any>(allClasses.map((c: any) => [c.id, c]))
  const studentById = new Map<string, any>(systemStudents.map((s: any) => [s.id, s]))

  // Map chuyển lớp trong năm học để ghi nhận đối soát và xác định phân lớp hiệu lực
  const latestTransferByStudentId = new Map<string, any>()
  for (const tr of studentTransfers) {
    if (
      tr.studentId &&
      (!tr.status || tr.status === "APPROVED" || tr.status === "COMPLETED") &&
      !latestTransferByStudentId.has(tr.studentId)
    ) {
      latestTransferByStudentId.set(tr.studentId, tr)
    }
  }

  // Tập hợp các môn đã bị chấm dứt cam kết (TERMINATED) theo studentId
  const terminatedSubjectsByStudentId = new Map<string, Set<string>>()
  for (const t of rawSupportTargets) {
    if (t.terminationStatus === "TERMINATED" && t.studentId) {
      const st = studentById.get(t.studentId) || t.student
      const cls = st?.classId ? classById.get(st.classId) || st.class : null
      const subs = parseAcademicCommittedSubjects(
        t.reason,
        t.notes,
        cls?.className,
        cls?.grade
      )
      if (!terminatedSubjectsByStudentId.has(t.studentId)) {
        terminatedSubjectsByStudentId.set(t.studentId, new Set())
      }
      const set = terminatedSubjectsByStudentId.get(t.studentId)!
      subs.forEach((s) => set.add(s))
    }
  }

  // Cấu trúc lưu trữ học sinh cam kết đầu vào đã hợp nhất (mỗi học sinh 1 bản ghi, chứa danh sách môn cam kết)
  interface ReconciledCommitmentStudent {
    studentId: string
    studentCode: string
    studentName: string
    classObj: any
    subjects: Set<string>
    inputAssessment?: any
  }

  const commitmentStudentsMap = new Map<string, ReconciledCommitmentStudent>()

  const resolveEffectiveStudentClass = (student: any, fallbackClass?: any) => {
    const transfer = latestTransferByStudentId.get(student.id)
    if (transfer && transfer.toClassId && classById.has(transfer.toClassId)) {
      const targetCls = classById.get(transfer.toClassId)
      const fromCls = transfer.fromClassId ? classById.get(transfer.fromClassId) : null
      reconciliationNotes.push({
        type: "STUDENT_TRANSFERRED_CLASS",
        studentCode: student.studentCode,
        studentName: student.studentName,
        detail: `Học sinh chuyển từ lớp ${fromCls?.className || transfer.fromClassId || "cũ"} sang lớp ${targetCls.className} (${targetCls.campus?.campusCode || ""}); hiển thị 1 lần tại lớp hiệu lực ${targetCls.className}.`,
      })
      return targetCls
    }
    if (student.classId && classById.has(student.classId)) {
      return classById.get(student.classId)
    }
    if (student.class && student.class.id) {
      return classById.get(student.class.id) || student.class
    }
    if (fallbackClass && fallbackClass.id) {
      return classById.get(fallbackClass.id) || fallbackClass
    }
    return null
  }

  const registerStudentCommitment = (
    student: any,
    rawSubjects: string[],
    sourceLabel: string,
    fallbackClass?: any,
    inputAssessment?: any
  ) => {
    if (!student || !student.id || rawSubjects.length === 0) return
    const effectiveClass = resolveEffectiveStudentClass(student, fallbackClass)
    if (!effectiveClass || !effectiveClass.id) {
      reconciliationNotes.push({
        type: "UNASSIGNED_CLASS_EXCLUDED",
        studentCode: student.studentCode || "-",
        studentName: student.studentName || "-",
        detail: `Học sinh có cam kết (${rawSubjects.join(", ")}) nhưng chưa có bản ghi phân lớp hợp lệ trong năm học.`,
      })
      return
    }

    const terminatedSet = terminatedSubjectsByStudentId.get(student.id)
    const activeSubjects = rawSubjects.filter((s) => !terminatedSet?.has(s))
    if (activeSubjects.length === 0) return

    if (!commitmentStudentsMap.has(student.id)) {
      commitmentStudentsMap.set(student.id, {
        studentId: student.id,
        studentCode: student.studentCode || "-",
        studentName: student.studentName || "-",
        classObj: effectiveClass,
        subjects: new Set(activeSubjects),
        inputAssessment,
      })
    } else {
      const existing = commitmentStudentsMap.get(student.id)!
      if (inputAssessment && !existing.inputAssessment) {
        existing.inputAssessment = inputAssessment
      }
      for (const sub of activeSubjects) {
        if (existing.subjects.has(sub)) {
          reconciliationNotes.push({
            type: "DUPLICATE_COMMITMENT_MERGED",
            studentCode: existing.studentCode,
            studentName: existing.studentName,
            subject: sub,
            detail: `Hợp nhất bản ghi cam kết trùng môn ${sub} từ nguồn ${sourceLabel}.`,
          })
        } else {
          existing.subjects.add(sub)
        }
      }
    }
  }

  // Nguồn 1: InputAssessmentStudent & PreschoolInputAssessmentStudent (Khảo sát đầu vào có cam kết)
  const allEntranceRaw = [...inputStudents, ...preschoolStudents]
  for (const is of allEntranceRaw) {
    if (isExplicitNonCommitmentRecord(is.admissionResult, is.directorNote)) {
      continue
    }

    let matchingStudent = systemStudents.find(
      (ss: any) =>
        (ss.studentCode &&
          is.studentCode &&
          ss.studentCode.trim().toLowerCase() === is.studentCode.trim().toLowerCase()) ||
        (ss.studentCode &&
          is.enrollmentCode &&
          ss.studentCode.trim().toLowerCase() === is.enrollmentCode.trim().toLowerCase())
    )

    if (!matchingStudent) {
      matchingStudent = systemStudents.find((ss: any) => {
        if (cleanNormalizedString(ss.studentName) === cleanNormalizedString(is.fullName)) {
          if (!is.grade) return true
          const ssGrade =
            ss.class?.grade || ss.class?.className?.match(/^(\d+)/)?.[1]
          const isCleanGrade = String(is.grade).replace(/\D/g, "")
          if (!ssGrade || !isCleanGrade) return true
          return String(ssGrade) === String(isCleanGrade)
        }
        return false
      })
    }

    let fallbackClass = is.enrollmentClass || null
    if (!fallbackClass && is.enrollmentClassId) {
      fallbackClass =
        allClasses.find(
          (c: any) => c.id === is.enrollmentClassId || c.classCode === is.enrollmentClassId
        ) || null
    }
    if (
      !fallbackClass &&
      is.className &&
      !is.className.toLowerCase().includes("chưa xếp")
    ) {
      fallbackClass =
        allClasses.find(
          (c: any) =>
            c.className.toLowerCase() === is.className.toLowerCase() ||
            c.classCode.toLowerCase() === is.className.toLowerCase()
        ) || null
    }

    const clsForParse = matchingStudent?.class || fallbackClass
    const academicSubs = parseAcademicCommittedSubjects(
      is.directorNote,
      is.admissionResult,
      clsForParse?.className || is.className,
      clsForParse?.grade || is.grade
    )

    if (academicSubs.length === 0) continue

    if (!matchingStudent) {
      reconciliationNotes.push({
        type: "UNASSIGNED_CLASS_EXCLUDED",
        studentCode: is.enrollmentCode || is.studentCode || "-",
        studentName: is.fullName || "-",
        detail: `Hồ sơ khảo sát đầu vào có cam kết (${academicSubs.join(", ")}) nhưng học sinh chưa được xếp lớp chính thức trong năm học.`,
      })
      continue
    }

    registerStudentCommitment(
      matchingStudent,
      academicSubs,
      "Khảo sát đầu vào",
      fallbackClass,
      is
    )
  }

  // Nguồn 2: LearningSupportTarget (Theo dõi HS cam kết đầu vào / Hỗ trợ học tập có hiệu lực)
  for (const t of rawSupportTargets) {
    if (t.terminationStatus === "TERMINATED") continue
    const isAdmissionTarget =
      t.sourceType === "ADMISSION" ||
      /cam\s*kết\s*khảo\s*sát\s*đầu\s*vào|cam\s*kết\s*đầu\s*vào|đồng\s*bộ\s*từ\s*cam\s*kết/i.test(
        String(t.notes || "")
      )
    if (!isAdmissionTarget && t.supportType !== "ACADEMIC") continue
    if (!isAdmissionTarget) continue

    const st = studentById.get(t.studentId) || t.student
    if (!st || st.status === "TRANSFERRED_OUT") continue

    const cls = st.classId ? classById.get(st.classId) || st.class : st.class
    // Chỉ trích xuất môn từ t.reason trước; nếu t.reason là Tâm lý mà t.notes có ghi kèm môn văn hóa cam kết đầu vào thì trích từ t.notes
    let subs = parseAcademicCommittedSubjects(
      t.reason,
      "",
      cls?.className,
      cls?.grade
    )
    if (subs.length === 0 && t.notes && /cam\s*kết/i.test(t.notes)) {
      const noteMatch = String(t.notes).match(
        /cam\s*kết\s*môn\s*([^\r\n.]+?)(?:\s+tại\s+kỳ|\s*\.\s*Điểm|$)/i
      )
      if (noteMatch && noteMatch[1]) {
        subs = parseAcademicCommittedSubjects(
          `Môn cam kết: [${noteMatch[1]}]`,
          "",
          cls?.className,
          cls?.grade
        )
      }
    }

    if (subs.length > 0) {
      registerStudentCommitment(st, subs, "Theo dõi cam kết đầu vào")
    }
  }

  // Nguồn 3: StudentLearningCommitment (nếu có bản ghi cam kết học tập đang ACTIVE)
  for (const lc of rawLearningCommitments) {
    if (lc.status === "TERMINATED" || lc.status === "INACTIVE") continue
    const st = studentById.get(lc.studentId)
    if (!st || st.status === "TRANSFERRED_OUT") continue
    const cls = st.classId ? classById.get(st.classId) || st.class : st.class
    const rawText = lc.committedSubjects || lc.subjects || lc.reason || lc.notes || ""
    const subs = parseAcademicCommittedSubjects(
      rawText,
      "Đạt cam kết",
      cls?.className,
      cls?.grade
    )
    if (subs.length > 0) {
      registerStudentCommitment(st, subs, "Hồ sơ cam kết học tập")
    }
  }

  // 4. Áp dụng phân quyền cơ sở / lớp / môn lên tập học sinh cam kết đầu vào
  const allowedSubjectIdSet = new Set(accessScope.allowedSubjectIds || [])
  const hasSubjectRestriction =
    Boolean(accessScope.isSubjectRestricted) && allowedSubjectIdSet.size > 0

  // Map mỗi tên môn cam kết chuẩn ("Toán", "Tiếng Việt", "Ngữ văn", "Tiếng Anh"...) sang danh sách Subject IDs trong DB
  const matchedSubjectIdsByCommittedName = new Map<string, string[]>()
  const getMatchedSubjectIds = (committedSub: string): string[] => {
    if (matchedSubjectIdsByCommittedName.has(committedSub)) {
      return matchedSubjectIdsByCommittedName.get(committedSub)!
    }
    const ids = allSubjects
      .filter((s: any) => doesSubjectMatchCommittedSubject(committedSub, s))
      .map((s: any) => s.id)
    matchedSubjectIdsByCommittedName.set(committedSub, ids)
    return ids
  }

  // Kiểm tra quyền xem môn cam kết nếu user truyền trực tiếp committedSubject
  if (
    filters.committedSubject &&
    filters.committedSubject !== "ALL" &&
    hasSubjectRestriction
  ) {
    const matchedIds = getMatchedSubjectIds(filters.committedSubject)
    const canViewSub = matchedIds.some((id) => allowedSubjectIdSet.has(id))
    if (!canViewSub) {
      throw new Error("FORBIDDEN_SCOPE: Tài khoản không có quyền truy cập môn học này.")
    }
  }

  // Lọc danh sách học sinh cam kết theo phạm vi quyền của tài khoản
  const scopedCommitmentStudents: ReconciledCommitmentStudent[] = []
  for (const item of commitmentStudentsMap.values()) {
    const cls = item.classObj
    const campusId = cls.campusId || cls.campus?.id || ""

    if (
      isCampusRestricted &&
      !accessScope.allowedCampusIds.includes(campusId)
    ) {
      continue
    }

    if (
      isClassRestricted &&
      !accessScope.allowedClassIds.includes(cls.id)
    ) {
      continue
    }

    if (hasSubjectRestriction) {
      const allowedSubs = Array.from(item.subjects).filter((sub) => {
        const subIds = getMatchedSubjectIds(sub)
        return subIds.some((id) => allowedSubjectIdSet.has(id))
      })
      if (allowedSubs.length === 0) continue
      item.subjects = new Set(allowedSubs)
    }

    scopedCommitmentStudents.push(item)
  }

  // 5. Xây dựng danh sách Lớp và Môn phụ thuộc theo tầng bộ lọc:
  // Năm học -> Cơ sở -> Lớp -> Môn cam kết đầu vào
  const studentsAfterCampusFilter = scopedCommitmentStudents.filter((item) => {
    if (selectedCampusId === "ALL") return true
    const cId = item.classObj.campusId || item.classObj.campus?.id || ""
    return cId === selectedCampusId
  })

  // Danh sách lớp có học sinh cam kết đầu vào trong cơ sở đang chọn
  const classOptionMap = new Map<
    string,
    {
      id: string
      classCode: string
      className: string
      grade: string
      campusId: string
      campusCode: string
      campusName: string
      displayLabel: string
      commitmentRowCount: number
    }
  >()

  for (const item of studentsAfterCampusFilter) {
    const cls = item.classObj
    const campusId = cls.campusId || cls.campus?.id || ""
    const campusCode = cls.campus?.campusCode || ""
    const campusName = cls.campus?.campusName || campusCode
    if (!classOptionMap.has(cls.id)) {
      classOptionMap.set(cls.id, {
        id: cls.id,
        classCode: cls.classCode || cls.className,
        className: cls.className,
        grade: cls.grade || "",
        campusId,
        campusCode,
        campusName,
        displayLabel:
          selectedCampusId === "ALL" && campusCode
            ? `${cls.className} (${campusCode})`
            : cls.className,
        commitmentRowCount: 0,
      })
    }
    classOptionMap.get(cls.id)!.commitmentRowCount += item.subjects.size
  }

  const availableClasses = Array.from(classOptionMap.values()).sort((a, b) => {
    if (a.campusCode !== b.campusCode) {
      return a.campusCode.localeCompare(b.campusCode, "vi")
    }
    const gA = extractGradeNumber(a.grade || a.className) ?? 99
    const gB = extractGradeNumber(b.grade || b.className) ?? 99
    if (gA !== gB) return gA - gB
    return a.className.localeCompare(b.className, "vi", { numeric: true })
  })

  // Nếu lớp đang chọn không còn hợp lệ khi đổi Cơ sở, đặt lại về "ALL"
  const selectedClassId =
    filters.classId &&
    filters.classId !== "ALL" &&
    availableClasses.some((c) => c.id === filters.classId)
      ? filters.classId
      : "ALL"

  const studentsAfterClassFilter = studentsAfterCampusFilter.filter((item) => {
    if (selectedClassId === "ALL") return true
    return item.classObj.id === selectedClassId
  })

  // Danh sách môn cam kết có trong phạm vi Năm học + Cơ sở + Lớp đang chọn
  const subjectCountMap = new Map<string, number>()
  for (const item of studentsAfterClassFilter) {
    for (const sub of item.subjects) {
      subjectCountMap.set(sub, (subjectCountMap.get(sub) || 0) + 1)
    }
  }

  const preferredSubjectOrder = ["Toán", "Tiếng Việt", "Ngữ văn", "Tiếng Anh"]
  const availableSubjects = Array.from(subjectCountMap.entries())
    .map(([name, rowCount]) => ({
      code: name,
      name,
      rowCount,
    }))
    .sort((a, b) => {
      const idxA = preferredSubjectOrder.indexOf(a.name)
      const idxB = preferredSubjectOrder.indexOf(b.name)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return a.name.localeCompare(b.name, "vi")
    })

  // Khớp môn đang chọn (hỗ trợ cả "Ngữ văn" và "Ngữ Văn")
  let selectedSubject = "ALL"
  if (filters.committedSubject && filters.committedSubject !== "ALL") {
    const matchedOption = availableSubjects.find(
      (s) =>
        cleanNormalizedString(s.name) ===
        cleanNormalizedString(filters.committedSubject)
    )
    if (matchedOption) {
      selectedSubject = matchedOption.name
    }
  }

  // 6. Truy vấn toàn bộ điểm SubjectGradeEntry của các học sinh trong phạm vi hiển thị
  const targetStudentIds = studentsAfterClassFilter.map((s) => s.studentId)
  const gradeEntries =
    targetStudentIds.length > 0
      ? await prisma.subjectGradeEntry.findMany({
          where: {
            academicYearId: selectedYearId,
            studentId: { in: targetStudentIds },
          },
          include: {
            subject: {
              select: { id: true, subjectCode: true, subjectName: true },
            },
          },
        })
      : []

  // Lập chỉ mục cấu hình cột điểm SubjectGradeConfig
  const configsByKey = new Map<string, any>()
  for (const cfg of gradeConfigs) {
    const gNum = extractGradeNumber(cfg.grade)
    const ep = String(cfg.evaluationPeriod || "ALL").toUpperCase().trim()
    const cType = cfg.configType || "VNEDU"
    configsByKey.set(`${cfg.subjectId}_${gNum ?? "ALL"}_${ep}_${cType}`, cfg)
  }

  // Nhóm SubjectGradeEntry theo studentId
  const entriesByStudentId = new Map<string, any[]>()
  for (const entry of gradeEntries) {
    if (!entriesByStudentId.has(entry.studentId)) {
      entriesByStudentId.set(entry.studentId, [])
    }
    entriesByStudentId.get(entry.studentId)!.push(entry)
  }

  // 7. Tạo các nhóm lớp và dòng kết quả (mỗi dòng = 1 học sinh + 1 môn cam kết)
  const classGroupsMap = new Map<string, EntranceCommitmentClassGroup>()
  const missingBenchmarkSet = new Set<string>()
  const periodScoredCounts: Record<CommitmentPeriodCode, number> = {
    KSĐN: 0,
    GK1: 0,
    CK1: 0,
    GK2: 0,
    CK2: 0,
  }
  const distinctDisplayedStudents = new Set<string>()
  let totalCommitmentRows = 0

  // Sắp xếp học sinh theo lớp -> tên học sinh
  const sortedStudents = [...studentsAfterClassFilter].sort((a, b) => {
    const cA = a.classObj
    const cB = b.classObj
    const campA = cA.campus?.campusCode || ""
    const campB = cB.campus?.campusCode || ""
    if (campA !== campB) return campA.localeCompare(campB, "vi")
    const gA = extractGradeNumber(cA.grade || cA.className) ?? 99
    const gB = extractGradeNumber(cB.grade || cB.className) ?? 99
    if (gA !== gB) return gA - gB
    if (cA.className !== cB.className) {
      return cA.className.localeCompare(cB.className, "vi", { numeric: true })
    }
    return a.studentName.localeCompare(b.studentName, "vi")
  })

  for (const item of sortedStudents) {
    const cls = item.classObj
    const campusId = cls.campusId || cls.campus?.id || ""
    const campusCode = cls.campus?.campusCode || ""
    const campusName = cls.campus?.campusName || campusCode
    const level = resolveEducationLevel(cls.level, cls.grade, cls.className)
    const gradeNum = extractGradeNumber(cls.grade || cls.className)

    // Sắp xếp các môn cam kết của học sinh theo thứ tự chuẩn
    const studentSubjects = Array.from(item.subjects)
      .filter((sub) => {
        if (selectedSubject === "ALL") return true
        return cleanNormalizedString(sub) === cleanNormalizedString(selectedSubject)
      })
      .sort((a, b) => {
        const idxA = preferredSubjectOrder.indexOf(a)
        const idxB = preferredSubjectOrder.indexOf(b)
        if (idxA !== -1 && idxB !== -1) return idxA - idxB
        if (idxA !== -1) return -1
        if (idxB !== -1) return 1
        return a.localeCompare(b, "vi")
      })

    if (studentSubjects.length === 0) continue

    if (!classGroupsMap.has(cls.id)) {
      classGroupsMap.set(cls.id, {
        classId: cls.id,
        className: cls.className,
        classCode: cls.classCode || cls.className,
        grade: cls.grade || (gradeNum !== null ? String(gradeNum) : ""),
        level,
        campusId,
        campusName,
        campusCode,
        studentCount: 0,
        rowCount: 0,
        rows: [],
      })
    }

    const group = classGroupsMap.get(cls.id)!
    group.studentCount += 1
    distinctDisplayedStudents.add(item.studentId)

    const studentEntries = entriesByStudentId.get(item.studentId) || []

    for (const committedSub of studentSubjects) {
      const matchedSubIds = getMatchedSubjectIds(committedSub)
      const subjectEntries = studentEntries.filter(
        (e) =>
          matchedSubIds.includes(e.subjectId) ||
          (e.subject && doesSubjectMatchCommittedSubject(committedSub, e.subject))
      )

      const rowScores = {} as Record<CommitmentPeriodCode, CommitmentScoreCell>

      for (const pDef of COMMITMENT_PERIODS) {
        const pCode = pDef.code
        const resolved = resolveStudentPeriodScoreFromEntries({
          entries: subjectEntries,
          period: pCode,
          configsByKey,
          gradeNum,
        })

        let finalScore = resolved.score
        let sourceNote = resolved.detailNote || null

        if (resolved.hasMakeupOrUpdate && resolved.detailNote) {
          reconciliationNotes.push({
            type: "MAKEUP_OR_UPDATED_SCORE_USED",
            studentCode: item.studentCode,
            studentName: item.studentName,
            subject: committedSub,
            period: pCode,
            detail: resolved.detailNote,
          })
        }

        const sklBenchmark = resolveConfiguredSklBenchmark({
          benchmarkConfigs,
          level,
          grade: cls.grade || (gradeNum !== null ? String(gradeNum) : ""),
          matchedSubjectIds: matchedSubIds,
          committedSubject: committedSub,
          period: pCode,
        })

        if (sklBenchmark === null) {
          const missingLabel = `${committedSub} (${level === "TIEU_HOC" ? "Tiểu học" : level}${gradeNum ? ` - Khối ${gradeNum}` : ""})`
          if (!missingBenchmarkSet.has(missingLabel)) {
            missingBenchmarkSet.add(missingLabel)
            reconciliationNotes.push({
              type: "MISSING_BENCHMARK_CONFIG",
              subject: committedSub,
              detail: `Chưa có cấu hình chuẩn SKL cho môn ${missingLabel}; chỉ hiển thị điểm số không kèm mũi tên.`,
            })
          }
        }

        if (finalScore !== null) {
          periodScoredCounts[pCode] += 1
        }

        rowScores[pCode] = formatCommitmentScoreWithSklArrow(
          finalScore,
          sklBenchmark,
          {
            period: pCode,
            level,
            sourceNote,
          }
        )
      }

      group.rowCount += 1
      totalCommitmentRows += 1

      group.rows.push({
        rowKey: `${item.studentId}_${committedSub}`,
        stt: group.rows.length + 1, // Đánh STT từ 1 theo từng nhóm lớp
        studentId: item.studentId,
        studentCode: item.studentCode,
        studentName: item.studentName,
        classId: cls.id,
        className: cls.className,
        classCode: cls.classCode || cls.className,
        grade: cls.grade || (gradeNum !== null ? String(gradeNum) : ""),
        level,
        campusId,
        campusName,
        campusCode,
        committedSubject: committedSub,
        committedSubjectCode: cleanNormalizedString(committedSub).toUpperCase(),
        scores: rowScores,
      })
    }
  }

  const classGroups = Array.from(classGroupsMap.values())
  const selectedCampusObj = allCampuses.find((c) => c.id === selectedCampusId)
  const selectedClassObj = availableClasses.find((c) => c.id === selectedClassId)

  return {
    filters: {
      academicYearId: selectedYearId,
      academicYearName: selectedYearObj?.name || "",
      campusId: selectedCampusId,
      campusName:
        selectedCampusId === "ALL"
          ? "Tất cả cơ sở"
          : selectedCampusObj?.campusName || selectedCampusObj?.campusCode || "",
      classId: selectedClassId,
      className:
        selectedClassId === "ALL"
          ? "Tất cả lớp"
          : selectedClassObj?.className || "",
      committedSubject: selectedSubject,
    },
    availableFilters: {
      academicYears,
      campuses: allCampuses,
      classes: availableClasses,
      subjects: availableSubjects,
    },
    summary: {
      totalClasses: classGroups.length,
      totalDistinctStudents: distinctDisplayedStudents.size,
      totalCommitmentRows,
      periodScoredCounts,
    },
    classGroups,
    reconciliationNotes,
    missingBenchmarkSubjects: Array.from(missingBenchmarkSet),
  }
}
