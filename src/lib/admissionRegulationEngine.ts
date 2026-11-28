import * as XLSX from "xlsx"
import { parseEntranceRecord, ProgramType, EntranceAcademicRecord } from "./entranceAcademicRecord"

export type IntakeTimingCode = "DAU_NAM" | "HK1" | "HK2" | "THEO_DOT" | "CA_NAM"

export type ExemptionMode = "NO_TRANSCRIPT" | "BY_SCORE" | "NO_SCORE_EXEMPTION"

export type ScoreBasisType = "DIEM_KTDK" | "DIEM_TBM" | "KHONG_XET_DIEM"

export const INTAKE_TIMING_OPTIONS: {
  code: IntakeTimingCode
  label: string
  shortLabel: string
  description: string
}[] = [
  {
    code: "DAU_NAM",
    label: "Đầu năm học",
    shortLabel: "Đầu năm",
    description: "Tuyển sinh đầu cấp / đầu năm học (VD: Lớp 1 đầu năm, Lớp 6 đầu năm)"
  },
  {
    code: "HK1",
    label: "Học kỳ 1",
    shortLabel: "Học kỳ 1",
    description: "Tuyển sinh giai đoạn Học kỳ 1 (VD: Lớp 3 HK1, Lớp 11 HK1)"
  },
  {
    code: "HK2",
    label: "Học kỳ 2",
    shortLabel: "Học kỳ 2",
    description: "Tuyển sinh bổ sung Học kỳ 2 (VD: Lớp 1 HK2, Lớp 3 HK2, Lớp 6 HK2, Lớp 11 HK2)"
  },
  {
    code: "THEO_DOT",
    label: "Theo đợt tuyển sinh",
    shortLabel: "Theo đợt TS",
    description: "Áp dụng chung cho các đợt tuyển sinh trong năm học (VD: Lớp 2, Lớp 4–5, Lớp 7–10)"
  },
  {
    code: "CA_NAM",
    label: "Cả năm học",
    shortLabel: "Cả năm",
    description: "Áp dụng xuyên suốt cả năm học (VD: Lớp 12 cả năm học)"
  }
]

export const K12_EDUCATION_SYSTEMS: {
  code: string
  name: string
  group: "HNS" | "INTL"
}[] = [
  { code: "HNS", name: "Hệ Hội nhập S", group: "HNS" },
  { code: "HNG", name: "Hệ Hội nhập Global", group: "INTL" },
  { code: "HNC", name: "Hệ Hội nhập Compass", group: "INTL" },
  { code: "SB", name: "Hệ Song bằng", group: "INTL" },
  { code: "CHUYEN_HE_S_I", name: "Chuyển hệ từ Hệ S sang Hệ I", group: "INTL" }
]

/**
 * Kiểm tra một hệ đào tạo có phải hệ Mầm non (MNS, MNG...) để loại khỏi cấu hình Phổ thông K-12
 */
export function isPreschoolSystem(code?: string | null, name?: string | null): boolean {
  const c = String(code || "").trim().toUpperCase()
  const n = String(name || "").trim().toLowerCase()
  if (!c && !n) return false
  if (c.startsWith("MN") || c === "PRESCHOOL" || c === "MAM_NON") return true
  if (n.includes("mầm non") || n.includes("mam non") || n.includes("nhà trẻ") || n.includes("mẫu giáo")) return true
  return false
}

export interface RegulationStudentInput {
  id?: string
  studentCode?: string | null
  fullName?: string | null
  dateOfBirth?: string | null
  gender?: string | null
  grade?: string | number | null
  hocKy?: string | null
  intakeTiming?: string | null
  surveyFormType?: string | null
  surveySystem?: string | null
  registeredCampus?: string | null
  admissionCampus?: string | null
  periodId?: string | null
  batchId?: string | null
  period?: { id?: string; name?: string | null } | null
  batch?: { id?: string; name?: string | null } | null
  oldSchoolName?: string | null
  targetType?: string | null
  kqHocTap?: string | null
  kqgdTieuHoc?: string | null
  kqRenLuyen?: string | null
  hoSoCtQuocTe?: string | null
  admissionCriteria?: string | null
}

export interface RegulationSubjectItem {
  id: string
  name?: string | null
  code?: string | null
}

export interface RegulationCampusItem {
  id?: string
  campusCode?: string | null
  campusName?: string | null
}

export interface RegulationPeriodItem {
  id?: string
  name?: string | null
  batches?: { id?: string; name?: string | null }[]
}

/**
 * Chuẩn hóa mã Hệ đào tạo K-12 từ dữ liệu học sinh
 */
export function resolveStudentK12SystemCode(student?: RegulationStudentInput | null): string {
  const sysField1 = String(student?.surveyFormType || "").trim()
  const sysField2 = String(student?.surveySystem || "").trim()
  const combinedUpper = `${sysField1} ${sysField2}`.toUpperCase()

  if (
    combinedUpper.includes("CHUYEN_HE_S_I") ||
    combinedUpper.includes("CHUYỂN HỆ") ||
    combinedUpper.includes("CHUYEN HE")
  ) {
    return "CHUYEN_HE_S_I"
  }

  const transferSignals = `${student?.admissionCriteria || ""} ${student?.targetType || ""} ${student?.period?.name || ""} ${student?.batch?.name || ""}`.toLowerCase()
  if (
    transferSignals.includes("chuyển hệ") ||
    transferSignals.includes("chuyen he") ||
    transferSignals.includes("chuyen_he")
  ) {
    return "CHUYEN_HE_S_I"
  }

  if (combinedUpper.includes("HNC") || combinedUpper.includes("COMPASS")) return "HNC"
  if (combinedUpper.includes("HNG") || combinedUpper.includes("GLOBAL")) return "HNG"
  if (combinedUpper.includes("SB") || combinedUpper.includes("SONG BẰNG") || combinedUpper.includes("SONG BANG")) return "SB"
  if (
    combinedUpper.includes("HNS") ||
    combinedUpper.includes("HỘI NHẬP S") ||
    combinedUpper.includes("HOI NHAP S") ||
    combinedUpper.includes("CHẤT LƯỢNG CAO") ||
    combinedUpper.includes("CLC")
  ) {
    return "HNS"
  }

  // Kiểm tra trường nào không phải Hình thức KS ("Trực tiếp", "Online", "Offline")
  const isFormMode = (v: string) => {
    const l = v.toLowerCase()
    return !l || l.includes("trực tiếp") || l.includes("online") || l.includes("offline") || l.includes("trực tuyến")
  }
  if (sysField1 && !isFormMode(sysField1)) return sysField1.toUpperCase()
  if (sysField2 && !isFormMode(sysField2)) return sysField2.toUpperCase()
  return "HNS"
}

export type K12TrackType = "HE_S" | "HE_I"

/**
 * 1. Mốc thời gian / Kỳ khảo sát chuẩn — đồng bộ 1-1 với trang "8. Cấu hình file điểm khảo sát đầu vào"
 */
export const STANDARD_INTAKE_MILESTONE_OPTIONS: {
  code: "DAU_NAM" | "HK1" | "HK2"
  value: string
  label: string
  shortLabel: string
}[] = [
  {
    code: "DAU_NAM",
    value: "Đầu năm",
    label: "Đầu năm (Tuyển sinh năm học mới)",
    shortLabel: "Đầu năm"
  },
  {
    code: "HK1",
    value: "Học kỳ 1",
    label: "Học kỳ 1 (HK1 - Bổ sung môn)",
    shortLabel: "Học kỳ 1"
  },
  {
    code: "HK2",
    value: "Học kỳ 2",
    label: "Học kỳ 2 (HK2 - Bổ sung môn)",
    shortLabel: "Học kỳ 2"
  }
]

export const STUDENT_INTAKE_TIME_SELECT_OPTIONS = [
  "Đầu năm",
  "Học kỳ 1",
  "Học kỳ 2"
] as const

/**
 * Kiểm tra mã hệ có thuộc Nhóm Hệ Quốc tế / Global / Compass / Song bằng (Hệ I) hay không
 */
export function isIntlSystemCode(code?: string | null): boolean {
  const c = String(code || "").trim().toUpperCase()
  if (!c) return false
  return (
    c === "HNG" ||
    c === "SB" ||
    c === "HNC" ||
    c === "HE_I" ||
    c === "INTL" ||
    c === "CHUYEN_HE_S_I" ||
    c.includes("CHUYEN_HE") ||
    c.includes("CHUYỂN HỆ") ||
    c.includes("GLOBAL") ||
    c.includes("COMPASS") ||
    c.includes("SONG BẰNG") ||
    c.includes("SONG BANG")
  )
}

/**
 * Phân luồng học sinh K-12 vào 2 danh sách độc lập:
 * - HE_S: Hệ Hội nhập S (HNS)
 * - HE_I: Hệ Hội nhập Global (HNG), Song bằng (SB), Compass (HNC)
 */
export function getStudentK12Track(student?: RegulationStudentInput | null): K12TrackType {
  const sysCode = resolveStudentK12SystemCode(student)
  return isIntlSystemCode(sysCode) ? "HE_I" : "HE_S"
}

/**
 * Giá trị "1. Mốc thời gian / Kỳ khảo sát" mặc định khi chọn Khối đăng ký hoặc Kỳ khảo sát
 */
export function getDefaultHocKyByGrade(
  _grade?: string | number | null,
  periodName?: string | null
): string {
  const pLow = String(periodName || "").trim().toLowerCase()
  if (
    pLow.includes("hk2") ||
    pLow.includes("học kỳ 2") ||
    pLow.includes("học kì 2") ||
    pLow.includes("hoc ky 2") ||
    pLow.includes("kỳ 2")
  ) {
    return "Học kỳ 2"
  }
  if (
    pLow.includes("hk1") ||
    pLow.includes("học kỳ 1") ||
    pLow.includes("học kì 1") ||
    pLow.includes("hoc ky 1") ||
    pLow.includes("kỳ 1")
  ) {
    return "Học kỳ 1"
  }
  return "Đầu năm"
}

/**
 * Xác định khóa Mốc thời gian (DAU_NAM | HK1 | HK2) và Kỳ khảo sát cụ thể (nếu có)
 * khớp 1-1 với mục "1. Mốc thời gian / Kỳ khảo sát" của Cấu hình file điểm khảo sát đầu vào
 */
export function resolveStudentGradeConfigPeriodKey(
  student?: RegulationStudentInput | null,
  periods?: RegulationPeriodItem[] | null,
  periodName?: string | null
): {
  milestoneCode: "DAU_NAM" | "HK1" | "HK2"
  specificPeriodId: string | null
  specificPeriodName: string | null
  displayValue: string
} {
  const rawHocKy = String(student?.hocKy || "").trim()
  const rawHocKyLow = rawHocKy.toLowerCase()
  const periodList = Array.isArray(periods) ? periods : []

  // Kiểm tra xem hocKy hoặc student.periodId có khớp với một Kỳ khảo sát cụ thể không
  const hocKyMatchedPeriod = rawHocKy
    ? periodList.find(
        p =>
          p?.id === rawHocKy ||
          String(p?.name || "").trim().toLowerCase() === rawHocKyLow
      )
    : undefined

  const linkedPeriod =
    hocKyMatchedPeriod ||
    (student?.periodId ? periodList.find(p => p?.id === student.periodId) : undefined) ||
    (periodName
      ? periodList.find(
          p => String(p?.name || "").trim().toLowerCase() === String(periodName).trim().toLowerCase()
        )
      : undefined)

  const specificPeriodId = linkedPeriod?.id || student?.periodId || null
  const specificPeriodName = linkedPeriod?.name || student?.period?.name || periodName || null

  const timing = resolveStudentIntakeTiming(
    student
      ? {
          ...student,
          hocKy: rawHocKy || specificPeriodName || ""
        }
      : { grade: "1", hocKy: specificPeriodName || "" }
  )

  let milestoneCode: "DAU_NAM" | "HK1" | "HK2" = "DAU_NAM"
  if (timing.code === "HK2") milestoneCode = "HK2"
  else if (timing.code === "HK1") milestoneCode = "HK1"
  else milestoneCode = "DAU_NAM"

  let displayValue =
    milestoneCode === "HK2" ? "Học kỳ 2" : milestoneCode === "HK1" ? "Học kỳ 1" : "Đầu năm"
  if (hocKyMatchedPeriod?.name) {
    displayValue = hocKyMatchedPeriod.name
  }

  return {
    milestoneCode,
    specificPeriodId,
    specificPeriodName,
    displayValue
  }
}

/**
 * Chuẩn hóa nhãn "1. Mốc thời gian / Kỳ khảo sát" hiển thị trên bảng Danh sách Khảo sát
 */
export function normalizeStudentHocKyDisplay(
  student?: RegulationStudentInput | null,
  periodName?: string | null,
  periods?: RegulationPeriodItem[] | null
): string {
  return resolveStudentGradeConfigPeriodKey(student, periods, periodName).displayValue
}

export function getIntakeTimingLabel(code: IntakeTimingCode): string {
  if (code === "DAU_NAM") return "Đầu năm"
  if (code === "HK1") return "Học kỳ 1"
  if (code === "HK2") return "Học kỳ 2"
  return INTAKE_TIMING_OPTIONS.find(o => o.code === code)?.label || code
}

export function formatRuleTimingsLabel(timings?: IntakeTimingCode[]): string {
  if (!timings || timings.length === 0) return "Đầu năm / Học kỳ 1"
  if (timings.length === 2 && timings.includes("DAU_NAM") && timings.includes("HK1")) {
    return "Đầu năm • Học kỳ 1"
  }
  if (timings.length === 2 && timings.includes("HK2") && timings.includes("CA_NAM")) {
    return "Học kỳ 2 (K11) • Cả năm (K12)"
  }
  return timings.map(getIntakeTimingLabel).join(", ")
}

/**
 * Xác định Mốc thời gian tuyển sinh của học sinh từ trường hocKy, Kỳ/Đợt khảo sát và Hồ sơ học bạ
 */
export function resolveStudentIntakeTiming(
  student?: RegulationStudentInput | null,
  parsedRecord?: EntranceAcademicRecord
): { code: IntakeTimingCode; label: string } {
  const gradeStr = String(student?.grade || "1").replace(/\D/g, "") || "1"
  const gradeNum = parseInt(gradeStr, 10) || 1

  const explicitTiming = String(student?.intakeTiming || "").trim().toUpperCase()
  if (["DAU_NAM", "HK1", "HK2", "THEO_DOT", "CA_NAM"].includes(explicitTiming)) {
    const code = explicitTiming as IntakeTimingCode
    return { code, label: getIntakeTimingLabel(code) }
  }

  const rawHocKy = String(student?.hocKy || "").trim().toLowerCase()
  const periodContext = `${student?.period?.name || ""} ${student?.batch?.name || ""}`.trim().toLowerCase()

  const isHk2Text = (txt: string) =>
    txt.includes("hk2") ||
    txt.includes("học kỳ 2") ||
    txt.includes("học kì 2") ||
    txt.includes("hoc ky 2") ||
    txt.includes("kỳ 2") ||
    txt.includes("ki 2") ||
    txt === "2"

  const isDauNamText = (txt: string) =>
    txt.includes("đầu năm") ||
    txt.includes("dau nam") ||
    txt.includes("đầu cấp") ||
    txt.includes("dau cap") ||
    txt.includes("open day")

  const isHk1Text = (txt: string) =>
    txt.includes("hk1") ||
    txt.includes("học kỳ 1") ||
    txt.includes("học kì 1") ||
    txt.includes("hoc ky 1") ||
    txt.includes("kỳ 1") ||
    txt.includes("ki 1") ||
    txt === "1"

  const isCaNamText = (txt: string) => txt.includes("cả năm") || txt.includes("ca nam")
  const isTheoDotText = (txt: string) => txt.includes("theo đợt") || txt.includes("theo dot")

  // Kiểm tra trực tiếp từ lựa chọn Mốc thời gian / Kỳ khảo sát (hocKy) của người dùng trước tiên
  if (rawHocKy) {
    if (isHk2Text(rawHocKy)) return { code: "HK2", label: "Học kỳ 2" }
    if (isHk1Text(rawHocKy)) return { code: "HK1", label: "Học kỳ 1" }
    if (isDauNamText(rawHocKy)) return { code: "DAU_NAM", label: "Đầu năm" }
  }

  // Khối 12 luôn áp dụng quy chế không miễn theo điểm xuyên suốt năm học
  if (gradeNum === 12) {
    if (isHk2Text(rawHocKy) || isHk2Text(periodContext)) return { code: "HK2", label: "Học kỳ 2" }
    if (isHk1Text(rawHocKy) || isHk1Text(periodContext)) return { code: "HK1", label: "Học kỳ 1" }
    return { code: "DAU_NAM", label: "Đầu năm" }
  }

  // Khối 1: Phân biệt Đầu năm vs Học kỳ 2
  if (gradeNum === 1) {
    if (parsedRecord?.grade1IntakeMode === "HK2" || isHk2Text(rawHocKy) || (!rawHocKy && isHk2Text(periodContext))) {
      return { code: "HK2", label: "Học kỳ 2" }
    }
    return { code: "DAU_NAM", label: "Đầu năm" }
  }

  if (rawHocKy) {
    if (isTheoDotText(rawHocKy) || isCaNamText(rawHocKy)) {
      return { code: "DAU_NAM", label: "Đầu năm" }
    }
  }

  // Suy luận từ tên Kỳ / Đợt khảo sát nếu hocKy trống
  if (isHk2Text(periodContext)) {
    return { code: "HK2", label: "Học kỳ 2" }
  }
  if (isHk1Text(periodContext)) {
    return { code: "HK1", label: "Học kỳ 1" }
  }
  if (isDauNamText(periodContext)) {
    return { code: "DAU_NAM", label: "Đầu năm" }
  }

  // Suy luận thông minh cho Lớp 6 nếu đã nhập môn học bạ: có "Ngữ văn" + bảng điểm HK1 => HK2; ngược lại => Đầu năm
  if (gradeNum === 6 && parsedRecord?.moet?.subjects?.length) {
    const hasNguVan = parsedRecord.moet.subjects.some(
      s => s.name.toLowerCase().includes("ngữ văn") && s.score && String(s.score).trim() !== ""
    )
    const hasTiengViet = parsedRecord.moet.subjects.some(
      s => s.name.toLowerCase().includes("tiếng việt") && s.score && String(s.score).trim() !== ""
    )
    if (hasNguVan && !hasTiengViet && parsedRecord.transcriptPeriod === "HK1") {
      return { code: "HK2", label: "Học kỳ 2" }
    }
    return { code: "DAU_NAM", label: "Đầu năm" }
  }

  return { code: "DAU_NAM", label: "Đầu năm" }
}

export interface AdmissionRegulationRule {
  id: string
  name: string
  grades: string[] // ["1"] .. ["12"]
  systems: string[] // ["HNS"] hoặc ["HNG", "HNC", "SB"]
  intakeTimings: IntakeTimingCode[] // ["DAU_NAM"], ["HK1"], ["HK2"], ["THEO_DOT"], ["CA_NAM"]
  exemptionMode: ExemptionMode // "NO_TRANSCRIPT" | "BY_SCORE" | "NO_SCORE_EXEMPTION"
  scoreBasisType: ScoreBasisType // "DIEM_KTDK" | "DIEM_TBM" | "KHONG_XET_DIEM"
  scoreThreshold: number // VD: 8.0 hoặc 6.5 (0 nếu không xét miễn theo điểm)
  transcriptBasis: string // Căn cứ xét tuyển theo cột 4 của Quy chế
  minAcademicRatings: string[]
  requireAcademicRatingForEntry?: boolean // VD: K11 HK2 & K12 yêu cầu học lực Khá trở lên
  minConductRatings: string[]
  mandatorySubjects: string[] // Môn khảo sát năng lực bắt buộc (không miễn theo điểm)
  conditionalSubjects: string[] // Môn khảo sát nếu điểm < scoreThreshold; miễn nếu >= scoreThreshold
  orientationSubjects: string[] // Môn định hướng đầu vào (không dùng làm tiêu chí xét tuyển)
  onRequestSubjects: string[] // Môn phỏng vấn tâm lý khi có đề nghị của GV phỏng vấn định hướng
  directAdmissionSubjects: string[] // Môn cần thực hiện đối với diện Tuyển thẳng / Chứng chỉ QT
  intlCertKeywords: string
  regulationNote: string
  isActive: boolean
  // Các trường tương thích ngược với cấu trúc v1
  minCoreScoreHNS: number
  minCoreScoreHNG_SB: number
  minEnglishScoreDirect: number
  defaultSubjects: string[]
  transcriptExemptSubjects: string[]
}

export interface AdmissionRegulationConfig {
  schemaVersion?: number
  documentTitle: string
  effectiveYear: string
  generalNotes: string
  updatedAt?: string
  rules: AdmissionRegulationRule[]
}

/**
 * Đồng bộ các trường tương thích ngược trên mỗi quy tắc
 */
export function syncRuleLegacyFields(rule: Partial<AdmissionRegulationRule>): AdmissionRegulationRule {
  const grades = Array.isArray(rule.grades) ? rule.grades.map(String) : ["1"]
  const systems = Array.isArray(rule.systems)
    ? rule.systems.filter(s => !isPreschoolSystem(s))
    : ["HNS"]

  const hasV2Arrays =
    Array.isArray(rule.mandatorySubjects) ||
    Array.isArray(rule.conditionalSubjects) ||
    Array.isArray(rule.orientationSubjects)

  let exemptionMode: ExemptionMode = rule.exemptionMode || "BY_SCORE"
  let scoreThreshold =
    typeof rule.scoreThreshold === "number"
      ? rule.scoreThreshold
      : systems.includes("HNS") && !systems.includes("HNG")
      ? rule.minCoreScoreHNS ?? 8.0
      : rule.minCoreScoreHNG_SB ?? rule.minCoreScoreHNS ?? 8.0

  if (!rule.exemptionMode) {
    if (grades.includes("1") && scoreThreshold <= 0) {
      exemptionMode = "NO_TRANSCRIPT"
    } else if (scoreThreshold <= 0) {
      exemptionMode = "NO_SCORE_EXEMPTION"
    } else {
      exemptionMode = "BY_SCORE"
    }
  }

  const maxGrade = Math.max(...grades.map(g => parseInt(g, 10) || 1))
  const intakeTimings: IntakeTimingCode[] =
    Array.isArray(rule.intakeTimings) && rule.intakeTimings.length > 0
      ? rule.intakeTimings
      : grades.length === 1 && grades[0] === "1" && exemptionMode === "NO_TRANSCRIPT"
      ? ["DAU_NAM"]
      : ["THEO_DOT"]

  const scoreBasisType: ScoreBasisType =
    rule.scoreBasisType ||
    (exemptionMode !== "BY_SCORE"
      ? "KHONG_XET_DIEM"
      : maxGrade <= 5 || (grades.length === 1 && grades[0] === "6" && intakeTimings.includes("DAU_NAM"))
      ? "DIEM_KTDK"
      : "DIEM_TBM")

  if (exemptionMode !== "BY_SCORE") {
    scoreThreshold = 0
  }

  let mandatorySubjects: string[] = []
  let conditionalSubjects: string[] = []
  let orientationSubjects: string[] = []
  const onRequestSubjects: string[] = Array.isArray(rule.onRequestSubjects) ? rule.onRequestSubjects : []

  if (hasV2Arrays) {
    mandatorySubjects = Array.isArray(rule.mandatorySubjects) ? rule.mandatorySubjects : []
    conditionalSubjects =
      exemptionMode === "BY_SCORE" && Array.isArray(rule.conditionalSubjects) ? rule.conditionalSubjects : []
    orientationSubjects = Array.isArray(rule.orientationSubjects) ? rule.orientationSubjects : []
  } else {
    // Quy đổi an toàn từ cấu trúc v1 cũ (defaultSubjects + transcriptExemptSubjects)
    const oldDefaults = Array.isArray(rule.defaultSubjects) ? rule.defaultSubjects : []
    const oldExempts = Array.isArray(rule.transcriptExemptSubjects) ? rule.transcriptExemptSubjects : []
    if (exemptionMode === "BY_SCORE") {
      conditionalSubjects = oldExempts
      oldDefaults.forEach(s => {
        if (oldExempts.includes(s)) return
        if (s.toLowerCase().includes("định hướng") || s.toLowerCase().includes("tâm lý")) {
          orientationSubjects.push(s)
        } else {
          mandatorySubjects.push(s)
        }
      })
    } else {
      oldDefaults.forEach(s => {
        if (s.toLowerCase().includes("định hướng")) {
          orientationSubjects.push(s)
        } else {
          mandatorySubjects.push(s)
        }
      })
    }
  }

  const defaultSubjects = Array.from(
    new Set([...mandatorySubjects, ...conditionalSubjects, ...orientationSubjects])
  )
  const transcriptExemptSubjects = exemptionMode === "BY_SCORE" ? [...conditionalSubjects] : []
  const directAdmissionSubjects = Array.isArray(rule.directAdmissionSubjects)
    ? rule.directAdmissionSubjects
    : orientationSubjects.length > 0
    ? [...orientationSubjects]
    : ["Phiếu định hướng đầu vào"]

  return {
    id: rule.id || `rule-${Date.now()}`,
    name: rule.name || "Quy tắc tuyển sinh",
    grades,
    systems: systems.length > 0 ? systems : ["HNS"],
    intakeTimings,
    exemptionMode,
    scoreBasisType,
    scoreThreshold,
    transcriptBasis: rule.transcriptBasis || "",
    minAcademicRatings: Array.isArray(rule.minAcademicRatings) ? rule.minAcademicRatings : [],
    requireAcademicRatingForEntry: Boolean(rule.requireAcademicRatingForEntry),
    minConductRatings: Array.isArray(rule.minConductRatings) ? rule.minConductRatings : ["Tốt", "Đạt"],
    mandatorySubjects,
    conditionalSubjects,
    orientationSubjects,
    onRequestSubjects,
    directAdmissionSubjects,
    intlCertKeywords: rule.intlCertKeywords ?? "IELTS, Cambridge, Flyers, KET, PET, FCE, TOEFL",
    regulationNote: rule.regulationNote || "",
    isActive: rule.isActive !== false,
    minCoreScoreHNS: scoreThreshold,
    minCoreScoreHNG_SB: scoreThreshold,
    minEnglishScoreDirect: rule.minEnglishScoreDirect ?? (scoreThreshold > 0 ? scoreThreshold : 8.0),
    defaultSubjects,
    transcriptExemptSubjects
  }
}

function createStandardRule(input: Omit<
  AdmissionRegulationRule,
  "minCoreScoreHNS" | "minCoreScoreHNG_SB" | "minEnglishScoreDirect" | "defaultSubjects" | "transcriptExemptSubjects"
> & { minEnglishScoreDirect?: number }): AdmissionRegulationRule {
  return syncRuleLegacyFields(input)
}

export const SKYLINE_2026_HNS_RULES: AdmissionRegulationRule[] = [
  createStandardRule({
    id: "hns-k1-dau-nam",
    name: "Hệ HNS • Khối 1 — Đầu năm học",
    grades: ["1"],
    systems: ["HNS"],
    intakeTimings: ["DAU_NAM", "HK1", "THEO_DOT"],
    exemptionMode: "NO_TRANSCRIPT",
    scoreBasisType: "KHONG_XET_DIEM",
    scoreThreshold: 0,
    transcriptBasis: "Khối 1 đầu cấp chưa có bảng điểm.",
    minAcademicRatings: ["Hoàn thành", "Đạt"],
    minConductRatings: ["Đạt", "Tốt"],
    mandatorySubjects: ["Bộ chuẩn phát triển trẻ em 5–6 tuổi"],
    conditionalSubjects: [],
    orientationSubjects: ["Tiếng Anh (vấn đáp)"],
    onRequestSubjects: ["Tâm lý"],
    directAdmissionSubjects: ["Tiếng Anh (vấn đáp)"],
    intlCertKeywords: "Cambridge, Starters",
    regulationNote:
      "Khảo sát 16 tiêu chí (Bộ chuẩn phát triển trẻ em 5–6 tuổi); Tiếng Anh vấn đáp chỉ dùng để định hướng cho học sinh, không dùng làm tiêu chí xét tuyển.",
    isActive: true
  }),
  createStandardRule({
    id: "hns-k1-hk2",
    name: "Hệ HNS • Khối 1 — Học kỳ 2",
    grades: ["1"],
    systems: ["HNS"],
    intakeTimings: ["HK2"],
    exemptionMode: "BY_SCORE",
    scoreBasisType: "DIEM_KTDK",
    scoreThreshold: 8.0,
    transcriptBasis: "Bảng điểm học kỳ 1 lớp 1.",
    minAcademicRatings: ["Hoàn thành xuất sắc", "Hoàn thành tốt", "Hoàn thành"],
    minConductRatings: ["Tốt", "Đạt"],
    mandatorySubjects: [],
    conditionalSubjects: ["Tiếng Việt", "Toán học"],
    orientationSubjects: ["Tiếng Anh (vấn đáp)"],
    onRequestSubjects: ["Tâm lý"],
    directAdmissionSubjects: ["Tiếng Anh (vấn đáp)"],
    intlCertKeywords: "Cambridge, Starters",
    regulationNote:
      "Khảo sát Tiếng Việt, Toán (nếu điểm kiểm tra định kỳ HK1 lớp 1 dưới 8,0 điểm); Tiếng Anh vấn đáp chỉ dùng để định hướng cho học sinh, không dùng làm tiêu chí xét tuyển.",
    isActive: true
  }),
  createStandardRule({
    id: "hns-k2-theo-dot",
    name: "Hệ HNS • Khối 2 — Theo đợt tuyển sinh",
    grades: ["2"],
    systems: ["HNS"],
    intakeTimings: ["THEO_DOT", "DAU_NAM", "HK1", "HK2", "CA_NAM"],
    exemptionMode: "BY_SCORE",
    scoreBasisType: "DIEM_KTDK",
    scoreThreshold: 8.0,
    transcriptBasis:
      "Bảng điểm chính thức gần nhất. Tiếng Anh lớp 1–2 là môn tự chọn, không bắt buộc có điểm kiểm tra định kỳ.",
    minAcademicRatings: ["Hoàn thành xuất sắc", "Hoàn thành tốt", "Hoàn thành"],
    minConductRatings: ["Tốt", "Đạt"],
    mandatorySubjects: [],
    conditionalSubjects: ["Tiếng Việt", "Toán học"],
    orientationSubjects: ["Tiếng Anh (vấn đáp)"],
    onRequestSubjects: ["Tâm lý"],
    directAdmissionSubjects: ["Tiếng Anh (vấn đáp)"],
    intlCertKeywords: "Cambridge, Starters, Movers",
    regulationNote:
      "Khảo sát Tiếng Việt, Toán (nếu điểm kiểm tra định kỳ dưới 8,0 điểm); Tiếng Anh vấn đáp chỉ dùng để định hướng cho học sinh, không dùng làm tiêu chí xét tuyển.",
    isActive: true
  }),
  createStandardRule({
    id: "hns-k3-hk1",
    name: "Hệ HNS • Khối 3 — Học kỳ 1",
    grades: ["3"],
    systems: ["HNS"],
    intakeTimings: ["DAU_NAM", "HK1", "THEO_DOT"],
    exemptionMode: "BY_SCORE",
    scoreBasisType: "DIEM_KTDK",
    scoreThreshold: 8.0,
    transcriptBasis: "Kết quả cuối năm lớp 2.",
    minAcademicRatings: ["Hoàn thành xuất sắc", "Hoàn thành tốt", "Hoàn thành"],
    minConductRatings: ["Tốt", "Đạt"],
    mandatorySubjects: [],
    conditionalSubjects: ["Tiếng Việt", "Toán học"],
    orientationSubjects: ["Tiếng Anh (vấn đáp)"],
    onRequestSubjects: ["Tâm lý"],
    directAdmissionSubjects: ["Tiếng Anh (vấn đáp)"],
    intlCertKeywords: "Cambridge, Starters, Movers",
    regulationNote:
      "Căn cứ kết quả cuối năm lớp 2: Khảo sát Tiếng Việt, Toán (nếu điểm kiểm tra định kỳ dưới 8,0 điểm); Tiếng Anh vấn đáp chỉ dùng để định hướng, không dùng làm tiêu chí xét tuyển.",
    isActive: true
  }),
  createStandardRule({
    id: "hns-k3-hk2",
    name: "Hệ HNS • Khối 3 — Học kỳ 2",
    grades: ["3"],
    systems: ["HNS"],
    intakeTimings: ["HK2"],
    exemptionMode: "BY_SCORE",
    scoreBasisType: "DIEM_KTDK",
    scoreThreshold: 8.0,
    transcriptBasis: "Bảng điểm học kỳ 1 lớp 3.",
    minAcademicRatings: ["Hoàn thành xuất sắc", "Hoàn thành tốt", "Hoàn thành"],
    minConductRatings: ["Tốt", "Đạt"],
    mandatorySubjects: ["Tiếng Anh (vấn đáp)"],
    conditionalSubjects: ["Tiếng Việt", "Toán học", "Tiếng Anh (viết)"],
    orientationSubjects: [],
    onRequestSubjects: ["Tâm lý"],
    directAdmissionSubjects: ["Tiếng Anh (vấn đáp)"],
    intlCertKeywords: "Cambridge, Movers, Flyers, TOEFL Primary",
    regulationNote:
      "Căn cứ học kỳ 1 lớp 3: Khảo sát Tiếng Việt, Toán, Tiếng Anh viết (nếu điểm kiểm tra định kỳ môn tương ứng dưới 8,0 điểm); Tiếng Anh vấn đáp khảo sát bắt buộc.",
    isActive: true
  }),
  createStandardRule({
    id: "hns-k4-k5-theo-dot",
    name: "Hệ HNS • Khối 4, 5 — Theo đợt tuyển sinh",
    grades: ["4", "5"],
    systems: ["HNS"],
    intakeTimings: ["THEO_DOT", "DAU_NAM", "HK1", "HK2", "CA_NAM"],
    exemptionMode: "BY_SCORE",
    scoreBasisType: "DIEM_KTDK",
    scoreThreshold: 8.0,
    transcriptBasis: "Bảng điểm/học kỳ gần nhất.",
    minAcademicRatings: ["Hoàn thành xuất sắc", "Hoàn thành tốt", "Hoàn thành"],
    minConductRatings: ["Tốt", "Đạt"],
    mandatorySubjects: ["Tiếng Anh (vấn đáp)"],
    conditionalSubjects: ["Tiếng Việt", "Toán học", "Tiếng Anh (viết)"],
    orientationSubjects: [],
    onRequestSubjects: ["Tâm lý"],
    directAdmissionSubjects: ["Tiếng Anh (vấn đáp)"],
    intlCertKeywords: "Cambridge, Movers, Flyers, KET, TOEFL Primary",
    regulationNote:
      "Căn cứ bảng điểm/học kỳ gần nhất: Khảo sát Tiếng Việt, Toán, Tiếng Anh viết (nếu điểm kiểm tra định kỳ môn tương ứng dưới 8,0 điểm); Tiếng Anh vấn đáp khảo sát bắt buộc.",
    isActive: true
  }),
  createStandardRule({
    id: "hns-k6-dau-nam",
    name: "Hệ HNS • Khối 6 — Đầu năm học",
    grades: ["6"],
    systems: ["HNS"],
    intakeTimings: ["DAU_NAM", "HK1", "THEO_DOT"],
    exemptionMode: "BY_SCORE",
    scoreBasisType: "DIEM_KTDK",
    scoreThreshold: 8.0,
    transcriptBasis: "Căn cứ kết quả cuối năm lớp 5; Hoàn thành chương trình tiểu học.",
    minAcademicRatings: ["Hoàn thành xuất sắc", "Hoàn thành tốt", "Hoàn thành", "Xuất sắc", "Giỏi", "Tốt", "Khá"],
    minConductRatings: ["Tốt", "Đạt"],
    mandatorySubjects: ["Tiếng Anh (vấn đáp)"],
    conditionalSubjects: ["Tiếng Việt", "Toán học", "Tiếng Anh (viết)"],
    orientationSubjects: ["Phiếu định hướng đầu vào"],
    onRequestSubjects: ["Tâm lý"],
    directAdmissionSubjects: ["Tiếng Anh (vấn đáp)", "Phiếu định hướng đầu vào"],
    intlCertKeywords: "Flyers, KET, PET, IELTS, TOEFL, Cambridge",
    regulationNote:
      "Đầu năm lớp 6 (căn cứ cuối năm lớp 5, hoàn thành CT Tiểu học): Khảo sát Tiếng Việt, Toán, Tiếng Anh viết nếu điểm kiểm tra định kỳ dưới 8,0 điểm; Tiếng Anh vấn đáp khảo sát bắt buộc.",
    isActive: true
  }),
  createStandardRule({
    id: "hns-k6-hk2",
    name: "Hệ HNS • Khối 6 — Học kỳ 2",
    grades: ["6"],
    systems: ["HNS"],
    intakeTimings: ["HK2"],
    exemptionMode: "BY_SCORE",
    scoreBasisType: "DIEM_TBM",
    scoreThreshold: 6.5,
    transcriptBasis: "Căn cứ bảng điểm học kỳ 1 lớp 6.",
    minAcademicRatings: ["Xuất sắc", "Giỏi", "Tốt", "Khá", "Đạt"],
    minConductRatings: ["Tốt", "Khá"],
    mandatorySubjects: ["Tiếng Anh (vấn đáp)"],
    conditionalSubjects: ["Ngữ Văn", "Toán học", "Tiếng Anh (viết)"],
    orientationSubjects: ["Phiếu định hướng đầu vào"],
    onRequestSubjects: ["Tâm lý"],
    directAdmissionSubjects: ["Tiếng Anh (vấn đáp)", "Phiếu định hướng đầu vào"],
    intlCertKeywords: "Flyers, KET, PET, IELTS, TOEFL, Học sinh giỏi",
    regulationNote:
      "Học kỳ 2 lớp 6 (căn cứ bảng điểm HK1 lớp 6): Khảo sát Ngữ văn, Toán, Tiếng Anh viết nếu điểm trung bình môn dưới 6,5 điểm; Tiếng Anh vấn đáp khảo sát bắt buộc.",
    isActive: true
  }),
  createStandardRule({
    id: "hns-k7-k10-theo-dot",
    name: "Hệ HNS • Khối 7, 8, 9, 10 — Theo đợt tuyển sinh",
    grades: ["7", "8", "9", "10"],
    systems: ["HNS"],
    intakeTimings: ["THEO_DOT", "DAU_NAM", "HK1", "HK2", "CA_NAM"],
    exemptionMode: "BY_SCORE",
    scoreBasisType: "DIEM_TBM",
    scoreThreshold: 6.5,
    transcriptBasis: "Căn cứ bảng điểm/học kỳ gần nhất.",
    minAcademicRatings: ["Xuất sắc", "Giỏi", "Tốt", "Khá", "Đạt"],
    minConductRatings: ["Tốt", "Khá"],
    mandatorySubjects: ["Tiếng Anh (vấn đáp)"],
    conditionalSubjects: ["Ngữ Văn", "Toán học", "Tiếng Anh (viết)"],
    orientationSubjects: ["Phiếu định hướng đầu vào"],
    onRequestSubjects: ["Tâm lý"],
    directAdmissionSubjects: ["Tiếng Anh (vấn đáp)", "Phiếu định hướng đầu vào"],
    intlCertKeywords: "KET, PET, FCE, IELTS, TOEFL, Học sinh giỏi",
    regulationNote:
      "Căn cứ bảng điểm/học kỳ gần nhất: Khảo sát Ngữ văn, Toán, Tiếng Anh viết nếu điểm trung bình môn dưới 6,5 điểm; Tiếng Anh vấn đáp khảo sát bắt buộc.",
    isActive: true
  }),
  createStandardRule({
    id: "hns-k11-hk1",
    name: "Hệ HNS • Khối 11 — Học kỳ 1",
    grades: ["11"],
    systems: ["HNS"],
    intakeTimings: ["DAU_NAM", "HK1", "THEO_DOT"],
    exemptionMode: "BY_SCORE",
    scoreBasisType: "DIEM_TBM",
    scoreThreshold: 6.5,
    transcriptBasis: "Căn cứ bảng điểm/học kỳ gần nhất.",
    minAcademicRatings: ["Xuất sắc", "Giỏi", "Tốt", "Khá", "Đạt"],
    minConductRatings: ["Tốt", "Khá"],
    mandatorySubjects: ["Tiếng Anh (vấn đáp)"],
    conditionalSubjects: ["Ngữ Văn", "Toán học", "Tiếng Anh (viết)"],
    orientationSubjects: ["Phiếu định hướng đầu vào"],
    onRequestSubjects: ["Tâm lý"],
    directAdmissionSubjects: ["Tiếng Anh (vấn đáp)", "Phiếu định hướng đầu vào"],
    intlCertKeywords: "IELTS, PET, FCE, TOEFL, SAT, Học sinh giỏi",
    regulationNote:
      "Học kỳ 1 lớp 11 (căn cứ bảng điểm/học kỳ gần nhất): Khảo sát Ngữ văn, Toán, Tiếng Anh viết nếu điểm trung bình môn dưới 6,5 điểm; Tiếng Anh vấn đáp khảo sát bắt buộc.",
    isActive: true
  }),
  createStandardRule({
    id: "hns-k11-hk2",
    name: "Hệ HNS • Khối 11 — Học kỳ 2",
    grades: ["11"],
    systems: ["HNS"],
    intakeTimings: ["HK2"],
    exemptionMode: "NO_SCORE_EXEMPTION",
    scoreBasisType: "KHONG_XET_DIEM",
    scoreThreshold: 0,
    transcriptBasis: "Yêu cầu học lực Khá trở lên; kiểm tra đủ 03 môn, không miễn theo điểm.",
    minAcademicRatings: ["Xuất sắc", "Giỏi", "Tốt", "Khá"],
    requireAcademicRatingForEntry: true,
    minConductRatings: ["Tốt", "Khá"],
    mandatorySubjects: ["Ngữ Văn", "Toán học", "Tiếng Anh (viết)", "Tiếng Anh (vấn đáp)"],
    conditionalSubjects: [],
    orientationSubjects: ["Phiếu định hướng đầu vào"],
    onRequestSubjects: ["Tâm lý"],
    directAdmissionSubjects: ["Ngữ Văn", "Toán học", "Tiếng Anh (viết)", "Tiếng Anh (vấn đáp)", "Phiếu định hướng đầu vào"],
    intlCertKeywords: "IELTS, FCE, CAE, TOEFL, SAT",
    regulationNote:
      "Học kỳ 2 lớp 11: Yêu cầu học lực Khá trở lên; bắt buộc kiểm tra đủ 03 môn Ngữ văn, Toán, Tiếng Anh (không miễn theo điểm).",
    isActive: true
  }),
  createStandardRule({
    id: "hns-k12-ca-nam",
    name: "Hệ HNS • Khối 12 — Cả năm học",
    grades: ["12"],
    systems: ["HNS"],
    intakeTimings: ["CA_NAM", "DAU_NAM", "HK1", "HK2", "THEO_DOT"],
    exemptionMode: "NO_SCORE_EXEMPTION",
    scoreBasisType: "KHONG_XET_DIEM",
    scoreThreshold: 0,
    transcriptBasis: "Yêu cầu học lực Khá trở lên; kiểm tra đủ 03 môn, không miễn theo điểm.",
    minAcademicRatings: ["Xuất sắc", "Giỏi", "Tốt", "Khá"],
    requireAcademicRatingForEntry: true,
    minConductRatings: ["Tốt", "Khá"],
    mandatorySubjects: ["Ngữ Văn", "Toán học", "Tiếng Anh (viết)", "Tiếng Anh (vấn đáp)"],
    conditionalSubjects: [],
    orientationSubjects: ["Phiếu định hướng đầu vào"],
    onRequestSubjects: ["Tâm lý"],
    directAdmissionSubjects: ["Ngữ Văn", "Toán học", "Tiếng Anh (viết)", "Tiếng Anh (vấn đáp)", "Phiếu định hướng đầu vào"],
    intlCertKeywords: "IELTS, FCE, CAE, TOEFL, SAT",
    regulationNote:
      "Cả năm học lớp 12: Yêu cầu học lực Khá trở lên; bắt buộc kiểm tra đủ 03 môn Ngữ văn, Toán, Tiếng Anh (không miễn theo điểm).",
    isActive: true
  })
]

export const SKYLINE_2026_INTL_RULES: AdmissionRegulationRule[] = [
  createStandardRule({
    id: "intl-k1-dau-nam",
    name: "Hệ Global, Compass, Song bằng • Khối 1 — Đầu năm học",
    grades: ["1"],
    systems: ["HNG", "HNC", "SB"],
    intakeTimings: ["DAU_NAM", "HK1", "THEO_DOT"],
    exemptionMode: "NO_TRANSCRIPT",
    scoreBasisType: "KHONG_XET_DIEM",
    scoreThreshold: 0,
    transcriptBasis: "Khối 1 đầu cấp chưa có bảng điểm.",
    minAcademicRatings: ["Hoàn thành", "Đạt"],
    minConductRatings: ["Đạt", "Tốt"],
    mandatorySubjects: ["Bộ chuẩn phát triển trẻ em 5–6 tuổi"],
    conditionalSubjects: [],
    orientationSubjects: ["ESL (vấn đáp)"],
    onRequestSubjects: ["Tâm lý"],
    directAdmissionSubjects: ["ESL (vấn đáp)"],
    intlCertKeywords: "Cambridge, Starters",
    regulationNote:
      "Khảo sát 16 tiêu chí (Bộ chuẩn phát triển trẻ em 5–6 tuổi); Vấn đáp ESL chỉ dùng để định hướng cho học sinh, không dùng làm tiêu chí xét tuyển.",
    isActive: true
  }),
  createStandardRule({
    id: "intl-k1-hk2",
    name: "Hệ Global, Compass, Song bằng • Khối 1 — Học kỳ 2",
    grades: ["1"],
    systems: ["HNG", "HNC", "SB"],
    intakeTimings: ["HK2"],
    exemptionMode: "BY_SCORE",
    scoreBasisType: "DIEM_KTDK",
    scoreThreshold: 8.0,
    transcriptBasis: "Bảng điểm học kỳ 1 lớp 1.",
    minAcademicRatings: ["Hoàn thành xuất sắc", "Hoàn thành tốt", "Hoàn thành"],
    minConductRatings: ["Tốt", "Đạt"],
    mandatorySubjects: [],
    conditionalSubjects: ["Tiếng Việt"],
    orientationSubjects: ["ESL (vấn đáp)"],
    onRequestSubjects: ["Tâm lý"],
    directAdmissionSubjects: ["ESL (vấn đáp)"],
    intlCertKeywords: "Cambridge, Starters",
    regulationNote:
      "Khảo sát Tiếng Việt (nếu điểm kiểm tra định kỳ HK1 lớp 1 dưới 8,0 điểm); Vấn đáp ESL chỉ dùng để định hướng cho học sinh, không dùng làm tiêu chí xét tuyển.",
    isActive: true
  }),
  createStandardRule({
    id: "intl-k2-k5-theo-dot",
    name: "Hệ Global, Compass, Song bằng • Khối 2, 3, 4, 5 — Theo đợt tuyển sinh",
    grades: ["2", "3", "4", "5"],
    systems: ["HNG", "HNC", "SB"],
    intakeTimings: ["THEO_DOT", "DAU_NAM", "HK1", "HK2", "CA_NAM"],
    exemptionMode: "BY_SCORE",
    scoreBasisType: "DIEM_KTDK",
    scoreThreshold: 8.0,
    transcriptBasis:
      "Bảng điểm chính thức gần nhất. Tiếng Anh lớp 1–2 là môn tự chọn, không bắt buộc có điểm kiểm tra định kỳ.",
    minAcademicRatings: ["Hoàn thành xuất sắc", "Hoàn thành tốt", "Hoàn thành"],
    minConductRatings: ["Tốt", "Đạt"],
    mandatorySubjects: ["EPT", "ESL (vấn đáp)"],
    conditionalSubjects: ["Tiếng Việt"],
    orientationSubjects: [],
    onRequestSubjects: ["Tâm lý"],
    directAdmissionSubjects: ["ESL (vấn đáp)"],
    intlCertKeywords: "Cambridge, Movers, Flyers, KET, TOEFL Primary",
    regulationNote:
      "Khảo sát Tiếng Việt (nếu điểm kiểm tra định kỳ dưới 8,0 điểm), EPT trên hệ thống LMS và Vấn đáp ESL.",
    isActive: true
  }),
  createStandardRule({
    id: "intl-k6-dau-nam",
    name: "Hệ Global, Compass, Song bằng • Khối 6 — Đầu năm học",
    grades: ["6"],
    systems: ["HNG", "HNC", "SB"],
    intakeTimings: ["DAU_NAM", "HK1", "THEO_DOT"],
    exemptionMode: "BY_SCORE",
    scoreBasisType: "DIEM_KTDK",
    scoreThreshold: 8.0,
    transcriptBasis: "Căn cứ kết quả cuối năm lớp 5; Hoàn thành chương trình tiểu học.",
    minAcademicRatings: ["Hoàn thành xuất sắc", "Hoàn thành tốt", "Hoàn thành", "Xuất sắc", "Giỏi", "Tốt", "Khá"],
    minConductRatings: ["Tốt", "Đạt"],
    mandatorySubjects: ["EPT", "ESL (vấn đáp)"],
    conditionalSubjects: ["Tiếng Việt"],
    orientationSubjects: ["Phiếu định hướng đầu vào"],
    onRequestSubjects: ["Tâm lý"],
    directAdmissionSubjects: ["ESL (vấn đáp)", "Phiếu định hướng đầu vào"],
    intlCertKeywords: "Flyers, KET, PET, IELTS, TOEFL, Cambridge",
    regulationNote:
      "Đầu năm lớp 6 (căn cứ cuối năm lớp 5, hoàn thành CT Tiểu học): Khảo sát Tiếng Việt (nếu điểm KTĐK dưới 8,0 điểm), EPT trên hệ thống LMS và Vấn đáp ESL.",
    isActive: true
  }),
  createStandardRule({
    id: "intl-k6-hk2",
    name: "Hệ Global, Compass, Song bằng • Khối 6 — Học kỳ 2",
    grades: ["6"],
    systems: ["HNG", "HNC", "SB"],
    intakeTimings: ["HK2"],
    exemptionMode: "BY_SCORE",
    scoreBasisType: "DIEM_TBM",
    scoreThreshold: 6.5,
    transcriptBasis: "Căn cứ bảng điểm học kỳ 1 lớp 6.",
    minAcademicRatings: ["Xuất sắc", "Giỏi", "Tốt", "Khá", "Đạt"],
    minConductRatings: ["Tốt", "Khá"],
    mandatorySubjects: ["EPT", "ESL (vấn đáp)"],
    conditionalSubjects: ["Ngữ Văn"],
    orientationSubjects: ["Phiếu định hướng đầu vào"],
    onRequestSubjects: ["Tâm lý"],
    directAdmissionSubjects: ["ESL (vấn đáp)", "Phiếu định hướng đầu vào"],
    intlCertKeywords: "KET, PET, FCE, IELTS, TOEFL",
    regulationNote:
      "Học kỳ 2 lớp 6 (căn cứ bảng điểm HK1 lớp 6): Khảo sát Ngữ văn (nếu điểm trung bình môn dưới 6,5 điểm), EPT trên hệ thống LMS và Vấn đáp ESL.",
    isActive: true
  }),
  createStandardRule({
    id: "intl-k7-k10-theo-dot",
    name: "Hệ Global, Compass, Song bằng • Khối 7, 8, 9, 10 — Theo đợt tuyển sinh",
    grades: ["7", "8", "9", "10"],
    systems: ["HNG", "HNC", "SB"],
    intakeTimings: ["THEO_DOT", "DAU_NAM", "HK1", "HK2", "CA_NAM"],
    exemptionMode: "BY_SCORE",
    scoreBasisType: "DIEM_TBM",
    scoreThreshold: 6.5,
    transcriptBasis: "Căn cứ bảng điểm/học kỳ gần nhất.",
    minAcademicRatings: ["Xuất sắc", "Giỏi", "Tốt", "Khá", "Đạt"],
    minConductRatings: ["Tốt", "Khá"],
    mandatorySubjects: ["EPT", "ESL (vấn đáp)"],
    conditionalSubjects: ["Ngữ Văn"],
    orientationSubjects: ["Phiếu định hướng đầu vào"],
    onRequestSubjects: ["Tâm lý"],
    directAdmissionSubjects: ["ESL (vấn đáp)", "Phiếu định hướng đầu vào"],
    intlCertKeywords: "KET, PET, FCE, IELTS, TOEFL, SAT",
    regulationNote:
      "Căn cứ bảng điểm/học kỳ gần nhất: Khảo sát Ngữ văn (nếu điểm trung bình môn dưới 6,5 điểm), EPT trên hệ thống LMS và Vấn đáp ESL.",
    isActive: true
  }),
  createStandardRule({
    id: "intl-k11-hk1",
    name: "Hệ Global, Compass, Song bằng • Khối 11 — Học kỳ 1",
    grades: ["11"],
    systems: ["HNG", "HNC", "SB"],
    intakeTimings: ["DAU_NAM", "HK1", "THEO_DOT"],
    exemptionMode: "BY_SCORE",
    scoreBasisType: "DIEM_TBM",
    scoreThreshold: 6.5,
    transcriptBasis: "Căn cứ bảng điểm/học kỳ gần nhất.",
    minAcademicRatings: ["Xuất sắc", "Giỏi", "Tốt", "Khá", "Đạt"],
    minConductRatings: ["Tốt", "Khá"],
    mandatorySubjects: ["EPT", "ESL (vấn đáp)"],
    conditionalSubjects: ["Ngữ Văn"],
    orientationSubjects: ["Phiếu định hướng đầu vào"],
    onRequestSubjects: ["Tâm lý"],
    directAdmissionSubjects: ["ESL (vấn đáp)", "Phiếu định hướng đầu vào"],
    intlCertKeywords: "IELTS, PET, FCE, TOEFL, SAT",
    regulationNote:
      "Học kỳ 1 lớp 11 (căn cứ bảng điểm/học kỳ gần nhất): Khảo sát Ngữ văn (nếu điểm trung bình môn dưới 6,5 điểm), EPT trên hệ thống LMS và Vấn đáp ESL.",
    isActive: true
  }),
  createStandardRule({
    id: "intl-k11-hk2",
    name: "Hệ Global, Compass, Song bằng • Khối 11 — Học kỳ 2",
    grades: ["11"],
    systems: ["HNG", "HNC", "SB"],
    intakeTimings: ["HK2"],
    exemptionMode: "NO_SCORE_EXEMPTION",
    scoreBasisType: "KHONG_XET_DIEM",
    scoreThreshold: 0,
    transcriptBasis: "Yêu cầu học lực Khá trở lên; không miễn theo điểm.",
    minAcademicRatings: ["Xuất sắc", "Giỏi", "Tốt", "Khá"],
    requireAcademicRatingForEntry: true,
    minConductRatings: ["Tốt", "Khá"],
    mandatorySubjects: ["Ngữ Văn", "EPT", "ESL (vấn đáp)"],
    conditionalSubjects: [],
    orientationSubjects: ["Phiếu định hướng đầu vào"],
    onRequestSubjects: ["Tâm lý"],
    directAdmissionSubjects: ["Ngữ Văn", "EPT", "ESL (vấn đáp)", "Phiếu định hướng đầu vào"],
    intlCertKeywords: "IELTS, FCE, CAE, TOEFL, SAT",
    regulationNote:
      "Học kỳ 2 lớp 11: Yêu cầu học lực Khá trở lên; khảo sát bắt buộc Ngữ văn, EPT trên hệ thống LMS và Vấn đáp ESL (không miễn theo điểm).",
    isActive: true
  }),
  createStandardRule({
    id: "intl-k12-ca-nam",
    name: "Hệ Global, Compass, Song bằng • Khối 12 — Cả năm học",
    grades: ["12"],
    systems: ["HNG", "HNC", "SB"],
    intakeTimings: ["CA_NAM", "DAU_NAM", "HK1", "HK2", "THEO_DOT"],
    exemptionMode: "NO_SCORE_EXEMPTION",
    scoreBasisType: "KHONG_XET_DIEM",
    scoreThreshold: 0,
    transcriptBasis: "Yêu cầu học lực Khá trở lên; không miễn theo điểm.",
    minAcademicRatings: ["Xuất sắc", "Giỏi", "Tốt", "Khá"],
    requireAcademicRatingForEntry: true,
    minConductRatings: ["Tốt", "Khá"],
    mandatorySubjects: ["Ngữ Văn", "EPT", "ESL (vấn đáp)"],
    conditionalSubjects: [],
    orientationSubjects: ["Phiếu định hướng đầu vào"],
    onRequestSubjects: ["Tâm lý"],
    directAdmissionSubjects: ["Ngữ Văn", "EPT", "ESL (vấn đáp)", "Phiếu định hướng đầu vào"],
    intlCertKeywords: "IELTS, FCE, CAE, TOEFL, SAT",
    regulationNote:
      "Cả năm học lớp 12: Yêu cầu học lực Khá trở lên; khảo sát bắt buộc Ngữ văn, EPT trên hệ thống LMS và Vấn đáp ESL (không miễn theo điểm).",
    isActive: true
  })
]

export const SKYLINE_2026_TRANSFER_RULES: AdmissionRegulationRule[] = [
  createStandardRule({
    id: "transfer-s-to-i-k1-k12",
    name: "Học sinh nội bộ Chuyển hệ từ Hệ S sang Hệ I • Khối 1–12",
    grades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
    systems: ["CHUYEN_HE_S_I"],
    intakeTimings: ["DAU_NAM", "HK1", "HK2", "THEO_DOT", "CA_NAM"],
    exemptionMode: "ALWAYS_TEST",
    scoreBasisType: "KHONG_XET_DIEM",
    scoreThreshold: 0,
    transcriptBasis: "Học sinh nội bộ Sky-Line đang học Hệ S đăng ký chuyển sang Hệ I (HNG / SB / HNC).",
    minAcademicRatings: ["Hoàn thành xuất sắc", "Hoàn thành tốt", "Hoàn thành", "Xuất sắc", "Giỏi", "Tốt", "Khá", "Đạt"],
    minConductRatings: ["Tốt", "Khá", "Đạt"],
    mandatorySubjects: ["EPT", "ESL (vấn đáp)"],
    conditionalSubjects: [],
    orientationSubjects: [],
    onRequestSubjects: ["Tâm lý"],
    directAdmissionSubjects: ["EPT", "ESL (vấn đáp)"],
    intlCertKeywords: "Cambridge, Starters, Movers, Flyers, KET, PET, IELTS, TOEFL",
    regulationNote:
      "Học sinh nội bộ chuyển hệ từ Hệ S sang Hệ I: Khảo sát bắt buộc EPT trên hệ thống LMS và Vấn đáp ESL (miễn khảo sát lại Toán, Tiếng Việt/Ngữ văn).",
    isActive: true
  })
]

export const CURRENT_REGULATION_SCHEMA_VERSION = 5

export const DEFAULT_ADMISSION_REGULATIONS: AdmissionRegulationConfig = {
  schemaVersion: CURRENT_REGULATION_SCHEMA_VERSION,
  documentTitle: "Quy chế Tuyển sinh Phổ thông Sky-Line 2026 (Hệ Hội nhập S, Hệ Global/Compass/Song bằng & Chuyển hệ S → I)",
  effectiveYear: "2026-2027",
  generalNotes:
    "1. Quy chế Tuyển sinh Hệ Hội nhập S (HNS) — Khảo sát Tiếng Anh (vấn đáp) xuyên suốt Khối 1–12:\n" +
    "   - Lớp 1 (Đầu năm): Khảo sát 16 tiêu chí; Tiếng Anh vấn đáp (định hướng).\n" +
    "   - Lớp 1 (HK2), Lớp 2, Lớp 3 (Đầu năm / HK1): Khảo sát Tiếng Việt, Toán (nếu điểm kiểm tra định kỳ < 8,0); Tiếng Anh vấn đáp (định hướng).\n" +
    "   - Lớp 3 (HK2), Lớp 4–5, Lớp 6 (Đầu năm / HK1): Khảo sát Tiếng Việt, Toán, Tiếng Anh viết (nếu điểm kiểm tra định kỳ < 8,0); Tiếng Anh vấn đáp khảo sát bắt buộc.\n" +
    "   - Lớp 6 (HK2), Lớp 7–10, Lớp 11 (Đầu năm / HK1): Khảo sát Ngữ văn, Toán, Tiếng Anh viết (nếu điểm trung bình môn < 6,5); Tiếng Anh vấn đáp khảo sát bắt buộc.\n" +
    "   - Lớp 11 (HK2) & Lớp 12: Yêu cầu học lực Khá trở lên; kiểm tra đủ Ngữ văn, Toán, Tiếng Anh viết & Tiếng Anh vấn đáp (không miễn theo điểm).\n\n" +
    "2. Quy chế Tuyển sinh Hệ Hội nhập Global (HNG), Compass (HNC), Song bằng (SB):\n" +
    "   - Lớp 1 (Đầu năm): Khảo sát 16 tiêu chí; Vấn đáp ESL (chỉ định hướng, không dùng làm tiêu chí xét tuyển).\n" +
    "   - Lớp 1 (HK2): Khảo sát Tiếng Việt (nếu điểm KTĐK < 8,0); Vấn đáp ESL (chỉ định hướng).\n" +
    "   - Lớp 2–5 & Lớp 6 (Đầu năm / HK1): Khảo sát Tiếng Việt (nếu điểm KTĐK < 8,0), EPT trên LMS và Vấn đáp ESL.\n" +
    "   - Lớp 6 (HK2), Lớp 7–10, Lớp 11 (Đầu năm / HK1): Khảo sát Ngữ văn (nếu điểm TBM < 6,5), EPT trên LMS và Vấn đáp ESL.\n" +
    "   - Lớp 11 (HK2) & Lớp 12: Yêu cầu học lực Khá trở lên; khảo sát Ngữ văn, EPT trên LMS và Vấn đáp ESL (không miễn theo điểm).\n\n" +
    "3. Quy chế Học sinh nội bộ Chuyển hệ từ Hệ S sang Hệ I (CHUYEN_HE_S_I):\n" +
    "   - Áp dụng Khối 1–12: Khảo sát bắt buộc EPT trên hệ thống LMS và Vấn đáp ESL (miễn khảo sát lại Toán, Tiếng Việt/Ngữ văn).\n\n" +
    "4. Phỏng vấn định hướng & Tâm lý:\n" +
    "   - Phân công thực hiện phỏng vấn định hướng đầu vào cho học sinh theo lưu đồ.\n" +
    "   - Phỏng vấn tâm lý: Thực hiện khi có đề nghị của giáo viên phỏng vấn định hướng.",
  rules: [...SKYLINE_2026_HNS_RULES, ...SKYLINE_2026_INTL_RULES, ...SKYLINE_2026_TRANSFER_RULES]
}

const LEGACY_V1_RULE_IDS = new Set(["rule-k1", "rule-k2-k5", "rule-k6-k9", "rule-k10-k12"])

/**
 * Chuẩn hóa quy tắc để đảm bảo không bị dính môn Tâm lý (chỉ khảo sát khi có đề nghị) hoặc Phiếu định hướng vào môn bắt buộc,
 * không trộn lẫn môn giữa Hệ S (HNS) và Hệ I (HNG/SB/HNC), và đảm bảo Hệ S khảo sát Tiếng Anh (vấn đáp) xuyên suốt Khối 1–12.
 */
function sanitizeRegulationRule(rule: AdmissionRegulationRule): AdmissionRegulationRule {
  const synced = syncRuleLegacyFields(rule)
  const rSys = (synced.systems || []).map(s => s.toUpperCase())
  const isPureHns = rSys.includes("HNS") && !rSys.some(s => isIntlSystemCode(s))
  const isPureIntl = !rSys.includes("HNS") && rSys.some(s => isIntlSystemCode(s))

  const nextOnRequest = new Set<string>(synced.onRequestSubjects || [])
  const nextOrientation = new Set<string>(synced.orientationSubjects || [])

  const filterCrossSystem = (sub: string): boolean => {
    const low = sub.toLowerCase().trim()
    if (isPureHns && (low.includes("ept") || low.includes("esl"))) return false
    if (isPureIntl && (low.includes("toán") || low.includes("tiếng anh (viết)") || low.includes("tiếng anh (vấn đáp)"))) {
      return false
    }
    return true
  }

  const cleanMandatory: string[] = []
  for (const sub of synced.mandatorySubjects || []) {
    if (!filterCrossSystem(sub)) continue
    const low = sub.toLowerCase().trim()
    if (low === "tâm lý" || low.includes("tâm lý")) {
      nextOnRequest.add("Tâm lý")
      continue
    }
    if (low.includes("phiếu định hướng")) {
      nextOrientation.add("Phiếu định hướng đầu vào")
      continue
    }
    cleanMandatory.push(sub)
  }

  const cleanConditional = (synced.conditionalSubjects || []).filter(sub => {
    if (!filterCrossSystem(sub)) return false
    const low = sub.toLowerCase().trim()
    if (low === "tâm lý" || low.includes("tâm lý") || low.includes("phiếu định hướng")) return false
    if (isPureHns && low.includes("tiếng anh") && (low.includes("vấn đáp") || low.includes("speaking"))) {
      if (
        !cleanMandatory.some(m => m.toLowerCase().includes("vấn đáp")) &&
        !Array.from(nextOrientation).some(o => o.toLowerCase().includes("vấn đáp"))
      ) {
        cleanMandatory.push("Tiếng Anh (vấn đáp)")
      }
      return false
    }
    return true
  })

  const cleanOrientation = Array.from(nextOrientation).filter(sub => {
    if (!filterCrossSystem(sub)) return false
    const low = sub.toLowerCase().trim()
    if (low === "tâm lý" || low.includes("tâm lý")) {
      nextOnRequest.add("Tâm lý")
      return false
    }
    return true
  })

  // Hệ S (HNS): Môn Tiếng Anh (vấn đáp) luôn được khảo sát xuyên suốt từ Khối 1 đến Khối 12
  if (
    isPureHns &&
    !cleanMandatory.some(m => m.toLowerCase().includes("tiếng anh") && (m.toLowerCase().includes("vấn đáp") || m.toLowerCase().includes("speaking"))) &&
    !cleanOrientation.some(o => o.toLowerCase().includes("tiếng anh") && (o.toLowerCase().includes("vấn đáp") || o.toLowerCase().includes("speaking")))
  ) {
    const allEarlyGrades = (synced.grades || []).length > 0 && (synced.grades || []).every(g => (parseInt(g, 10) || 1) <= 2)
    if (allEarlyGrades) {
      cleanOrientation.push("Tiếng Anh (vấn đáp)")
    } else {
      cleanMandatory.unshift("Tiếng Anh (vấn đáp)")
    }
  }

  const nextDirectSubs = [...(synced.directAdmissionSubjects || [])]
  if (
    isPureHns &&
    !nextDirectSubs.some(d => d.toLowerCase().includes("tiếng anh") && (d.toLowerCase().includes("vấn đáp") || d.toLowerCase().includes("speaking")))
  ) {
    nextDirectSubs.unshift("Tiếng Anh (vấn đáp)")
  }

  return syncRuleLegacyFields({
    ...synced,
    mandatorySubjects: cleanMandatory,
    conditionalSubjects: cleanConditional,
    orientationSubjects: cleanOrientation,
    onRequestSubjects: Array.from(nextOnRequest),
    directAdmissionSubjects: nextDirectSubs
  })
}

export function parseAdmissionRegulationConfig(configsOrJson?: unknown): AdmissionRegulationConfig {
  if (!configsOrJson) return DEFAULT_ADMISSION_REGULATIONS

  try {
    let rawObj: Partial<AdmissionRegulationConfig> | null = null
    if (typeof configsOrJson === "string") {
      rawObj = JSON.parse(configsOrJson) as Partial<AdmissionRegulationConfig>
    } else if (Array.isArray(configsOrJson)) {
      const found = configsOrJson.find(
        (c: { categoryType?: string; code?: string; name?: string }) =>
          c?.categoryType === "QUY_CHE_TS" && (c?.code === "SKYLINE_K12_REGULATION" || Boolean(c?.name))
      ) as { name?: string } | undefined
      if (found && found.name) {
        rawObj = JSON.parse(found.name) as Partial<AdmissionRegulationConfig>
      }
    } else if (
      typeof configsOrJson === "object" &&
      "rules" in configsOrJson &&
      Array.isArray((configsOrJson as Partial<AdmissionRegulationConfig>).rules)
    ) {
      rawObj = configsOrJson as Partial<AdmissionRegulationConfig>
    }

    if (rawObj && Array.isArray(rawObj.rules) && rawObj.rules.length > 0) {
      const ver = rawObj.schemaVersion || 1
      const hasLegacyV1Rules = rawObj.rules.some(r => r?.id && LEGACY_V1_RULE_IDS.has(String(r.id)))
      if (ver < 2 && hasLegacyV1Rules) {
        return DEFAULT_ADMISSION_REGULATIONS
      }

      const sanitizedRules = rawObj.rules
        .filter(r => !r?.id || !LEGACY_V1_RULE_IDS.has(String(r.id)))
        .map((r: AdmissionRegulationRule) => sanitizeRegulationRule(r))

      if (sanitizedRules.length === 0) {
        return DEFAULT_ADMISSION_REGULATIONS
      }

      const hasTransferRule = sanitizedRules.some(r =>
        (r.systems || []).some(s => String(s).toUpperCase() === "CHUYEN_HE_S_I")
      )
      const finalRules = hasTransferRule
        ? sanitizedRules
        : [...sanitizedRules, ...SKYLINE_2026_TRANSFER_RULES]

      return {
        ...DEFAULT_ADMISSION_REGULATIONS,
        ...rawObj,
        schemaVersion: Math.max(ver, CURRENT_REGULATION_SCHEMA_VERSION),
        rules: finalRules
      }
    }
  } catch {
    // Fallback an toàn về quy chế chuẩn 2026
  }

  return DEFAULT_ADMISSION_REGULATIONS
}

/**
 * Tìm quy tắc khớp chính xác nhất theo 3 chiều: Khối + Hệ + Mốc thời gian
 */
export function findMatchingRegulationRule(
  rules: AdmissionRegulationRule[],
  gradeStr: string,
  sysCode: string,
  timingCode: IntakeTimingCode
): AdmissionRegulationRule {
  const sysUpper = sysCode.toUpperCase()
  const isIntlSystem = isIntlSystemCode(sysUpper)
  const gradeNum = parseInt(gradeStr, 10) || 1

  // Loại bỏ các quy tắc v1 gộp chung cả Hệ S (HNS) và Hệ I (HNG/SB/HNC) hoặc quy tắc Hệ I cũ thiếu EPT / ESL (vấn đáp)
  const activeRules = rules
    .filter(r => {
      if (r.isActive === false) return false
      if (r.id && LEGACY_V1_RULE_IDS.has(String(r.id))) return false
      const rSys = (r.systems || []).map(s => s.toUpperCase())
      const hasHns = rSys.includes("HNS")
      const hasIntl = rSys.some(s => isIntlSystemCode(s))
      if (hasHns && hasIntl) return false

      if (isIntlSystem && hasIntl) {
        const synced = sanitizeRegulationRule(r)
        const allSubsNorm = [
          ...(synced.mandatorySubjects || []),
          ...(synced.conditionalSubjects || []),
          ...(synced.orientationSubjects || [])
        ]
          .join(" | ")
          .toLowerCase()
        const hasEsl = allSubsNorm.includes("esl")
        const hasEpt = allSubsNorm.includes("ept")
        if (!hasEsl) return false
        if (gradeNum >= 2 && !hasEpt) return false
      }
      return true
    })
    .map(r => sanitizeRegulationRule(r))

  const isTransferSystem = sysUpper === "CHUYEN_HE_S_I"
  const matchesSystem = (r: AdmissionRegulationRule) => {
    if (!r.systems || r.systems.length === 0) return false
    const rSys = r.systems.map(s => s.toUpperCase())
    if (isTransferSystem) return rSys.includes("CHUYEN_HE_S_I")
    if (rSys.includes("CHUYEN_HE_S_I") && rSys.length === 1) return false
    if (rSys.includes(sysUpper)) return true
    if (isIntlSystem && rSys.some(s => isIntlSystemCode(s) && s !== "CHUYEN_HE_S_I")) {
      return true
    }
    return false
  }

  const matchesExactTiming = (r: AdmissionRegulationRule) => {
    const t = r.intakeTimings || []
    if (t.includes(timingCode)) return true
    if (timingCode === "DAU_NAM" && t.includes("HK1") && !t.includes("HK2")) return true
    if (timingCode === "HK1" && t.includes("DAU_NAM") && !t.includes("HK2")) return true
    return false
  }

  const matchesWildcardTiming = (r: AdmissionRegulationRule) => {
    const t = r.intakeTimings || []
    return t.length === 0 || t.includes("THEO_DOT") || (gradeNum === 12 && t.includes("CA_NAM"))
  }

  // 1. Khớp chính xác cả Khối + Hệ + Mốc thời gian cụ thể (DAU_NAM / HK1 / HK2)
  const exactMatch = activeRules.find(
    r => r.grades.includes(gradeStr) && matchesSystem(r) && matchesExactTiming(r)
  )
  if (exactMatch) return exactMatch

  // 2. Khớp Khối + Hệ + Mốc thời gian linh hoạt
  const wildcardTimingMatch = activeRules.find(
    r => r.grades.includes(gradeStr) && matchesSystem(r) && matchesWildcardTiming(r)
  )
  if (wildcardTimingMatch) return wildcardTimingMatch

  // 3. Fallback về bộ quy chế chuẩn 2026 theo đúng nhóm Hệ (tách biệt tuyệt đối Chuyển hệ S → I, Hệ I và Hệ S)
  const fallbackPool = isTransferSystem
    ? SKYLINE_2026_TRANSFER_RULES
    : isIntlSystem
    ? SKYLINE_2026_INTL_RULES
    : SKYLINE_2026_HNS_RULES
  return (
    fallbackPool.find(r => r.grades.includes(gradeStr) && matchesExactTiming(r)) ||
    fallbackPool.find(r => r.grades.includes(gradeStr) && matchesWildcardTiming(r)) ||
    fallbackPool.find(r => r.grades.includes(gradeStr)) ||
    DEFAULT_ADMISSION_REGULATIONS.rules[0]
  )
}

export interface StudentAcademicInsight {
  programType: ProgramType
  programLabel: string
  transcriptPeriodLabel: string
  intakeTimingCode: IntakeTimingCode
  intakeTimingLabel: string
  resolvedSystemCode: string
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
  isRatingEligibleForExemption: boolean
  scoreThreshold: number
  scoreBasisType: ScoreBasisType
  exemptionMode: ExemptionMode
  // Quy chế tuyển sinh & Gợi ý phân công khảo sát
  regulationStatus:
    | "TUYEN_THANG_GOI_Y"
    | "XET_TUYEN_HOC_BA"
    | "KHAO_SAT_DAY_DU"
    | "KHAO_SAT_DAU_CAP_K1"
    | "CHUA_DU_THONG_TIN"
  regulationBadgeLabel: string
  regulationBadgeColor: string
  regulationReason: string
  recommendedSubjectNames: string[]
  orientationSubjectNames: string[]
  onRequestSubjectNames: string[]
  exemptedSubjectNames: string[]
  appliedRuleName?: string
  transcriptBasis?: string
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
  if (val === null || val === undefined) return null
  const cleaned = String(val).replace(",", ".").trim()
  if (!cleaned || cleaned === "—" || cleaned === "-") return null
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function isValidTenScaleScore(score: number | null): score is number {
  return score !== null && !isNaN(score) && score >= 0 && score <= 10
}

function checkConditionalSubjectPass(
  subjectName: string,
  threshold: number,
  scores: { mathScore: number | null; litScore: number | null; engScore: number | null }
): boolean {
  if (threshold <= 0) return false
  const low = subjectName.toLowerCase()
  if (low.includes("toán")) {
    return isValidTenScaleScore(scores.mathScore) && scores.mathScore >= threshold
  }
  if (low.includes("tiếng việt") || low.includes("ngữ văn") || low === "văn") {
    return isValidTenScaleScore(scores.litScore) && scores.litScore >= threshold
  }
  // Chỉ miễn môn Tiếng Anh (viết) theo điểm Anh; tuyệt đối không miễn Tiếng Anh (vấn đáp) / ESL / EPT
  if (
    (low.includes("tiếng anh") || low.includes("english")) &&
    !low.includes("vấn đáp") &&
    !low.includes("speaking") &&
    !low.includes("esl") &&
    !low.includes("ept")
  ) {
    return isValidTenScaleScore(scores.engScore) && scores.engScore >= threshold
  }
  return false
}

function checkIsFailingAcademicOrConduct(academicRating: string, conductRating: string): boolean {
  const a = String(academicRating || "").trim().toLowerCase()
  const c = String(conductRating || "").trim().toLowerCase()
  const failRatingTokens = ["chưa hoàn thành", "chưa đạt", "yếu", "kém"]
  if (a && failRatingTokens.some(tok => a.includes(tok))) return true
  if (a === "cht" || a === "cđ") return true
  if (c && (c.includes("chưa đạt") || c.includes("cần cố gắng") || c === "yếu" || c === "kém")) return true
  return false
}

export function analyzeStudentAcademicAndRegulation(
  student?: RegulationStudentInput | null,
  customConfig?: AdmissionRegulationConfig
): StudentAcademicInsight {
  const regConfig = customConfig || DEFAULT_ADMISSION_REGULATIONS
  const gradeStr = String(student?.grade || "1").replace(/\D/g, "") || "1"
  const rawKq = student?.kqHocTap || ""
  const parsed = parseEntranceRecord(rawKq, gradeStr)

  // Hỗ trợ JSON rút gọn khi đang nhập liệu trực tiếp (inline Excel / dòng nhập nhanh)
  let rawJsonMeta: {
    hasTopLevelJson?: boolean
    hasExplicitMoet?: boolean
    overallRating?: string
    achievements?: string
    math?: string
    literature?: string
    english?: string
  } = {}
  if (rawKq.trim().startsWith("{")) {
    try {
      const parsedRaw = JSON.parse(rawKq)
      rawJsonMeta = {
        hasTopLevelJson: true,
        hasExplicitMoet: Boolean(parsedRaw?.moet),
        overallRating: typeof parsedRaw?.overallRating === "string" ? parsedRaw.overallRating : undefined,
        achievements: typeof parsedRaw?.achievements === "string" ? parsedRaw.achievements : undefined,
        math: parsedRaw?.math,
        literature: parsedRaw?.literature,
        english: parsedRaw?.english
      }
    } catch {
      // ignore
    }
  }

  const programType: ProgramType = parsed.programType || "BO_GD_DT"
  const programLabel = PROGRAM_LABELS[programType] || "Bộ GD&ĐT"
  const transcriptPeriodLabel = PERIOD_LABELS[parsed.transcriptPeriod || "CA_NAM"] || parsed.transcriptPeriod || "Cả năm"

  const timingInfo = resolveStudentIntakeTiming(student, parsed)
  const sysCode = resolveStudentK12SystemCode(student)

  let academicRating = ""
  let conductRating = student?.kqRenLuyen || ""
  let scores: { name: string; score: string }[] = []
  let combinationSummary = ""

  if (programType === "BO_GD_DT") {
    let rawRating =
      rawJsonMeta.hasTopLevelJson && !rawJsonMeta.hasExplicitMoet && rawJsonMeta.overallRating !== undefined
        ? rawJsonMeta.overallRating
        : parsed.moet?.overallRating || parsed.overallRating || student?.kqgdTieuHoc || ""
    if (rawRating.includes("Trường cũ") || rawRating.includes("Đối tượng:")) {
      const cleanLines = rawRating
        .split(/[\r\n]+/)
        .map((l: string) => l.trim())
        .filter((l: string) => l && !l.includes("Trường cũ") && !l.includes("Đối tượng:"))
      rawRating = cleanLines[0] || ""
    }
    academicRating = rawRating
    conductRating =
      (rawJsonMeta.hasTopLevelJson && !rawJsonMeta.hasExplicitMoet ? student?.kqRenLuyen : parsed.moet?.conductRating) ||
      student?.kqRenLuyen ||
      ""
    scores = (parsed.moet?.subjects || [])
      .filter(s => s.score && String(s.score).trim() !== "")
      .map(s => ({ name: s.name, score: String(s.score).trim() }))
    if (parsed.moet?.combination?.name && parsed.moet?.combination?.score) {
      combinationSummary = `${parsed.moet.combination.name}: ${parsed.moet.combination.score}`
    }
  } else if (programType === "SONG_NGU") {
    const vn = parsed.bilingual?.moetRating ? `VN: ${parsed.bilingual.moetRating}` : ""
    const qt = parsed.bilingual?.internationalRating ? `QT: ${parsed.bilingual.internationalRating}` : ""
    academicRating =
      (rawJsonMeta.hasTopLevelJson && !rawJsonMeta.hasExplicitMoet && rawJsonMeta.overallRating !== undefined
        ? rawJsonMeta.overallRating
        : [vn, qt].filter(Boolean).join(" | ") || parsed.overallRating) || ""
    scores = [
      ...(parsed.bilingual?.moetSubjects || []),
      ...(parsed.bilingual?.internationalSubjects || [])
    ]
      .filter(s => s.score && String(s.score).trim() !== "")
      .map(s => ({ name: s.name, score: String(s.score).trim() }))
  } else if (programType === "NUOC_NGOAI") {
    academicRating = parsed.foreign?.gpaOrHonors
      ? `GPA/Honors: ${parsed.foreign.gpaOrHonors}`
      : rawJsonMeta.overallRating ?? parsed.overallRating ?? ""
    scores = (parsed.foreign?.subjects || [])
      .filter(s => s.score && String(s.score).trim() !== "")
      .map(s => ({ name: s.name, score: String(s.score).trim() }))
  } else if (programType === "HOMESCHOOLING") {
    academicRating = parsed.homeschool?.overallEvaluation || rawJsonMeta.overallRating || parsed.overallRating || ""
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

  const mathScore = findScore(["toán", "math"]) ?? parseScoreNum(rawJsonMeta.math)
  const litScore =
    findScore(["tiếng việt", "ngữ văn", "văn", "vietnamese", "literature"]) ??
    parseScoreNum(rawJsonMeta.literature)
  const engScore = findScore(["tiếng anh", "anh", "english", "esl"]) ?? parseScoreNum(rawJsonMeta.english)

  const rawHoSo = String(student?.hoSoCtQuocTe || "").trim()
  const isGenericHoSoLabel = ["ct việt nam", "song ngữ / tích hợp", "ct quốc tế", "home schooling"].includes(
    rawHoSo.toLowerCase()
  )
  const achievements = (
    rawJsonMeta.achievements ||
    parsed.achievements ||
    parsed.moet?.achievements ||
    (isGenericHoSoLabel ? "" : rawHoSo) ||
    ""
  ).trim()

  const hasAttachments = Array.isArray(parsed.attachments) && parsed.attachments.length > 0
  const hasAnyScore = mathScore !== null || litScore !== null || engScore !== null || scores.length > 0
  const hasMeaningfulPlainTextKq = !rawJsonMeta.hasTopLevelJson && rawKq.trim() !== "" && !rawKq.trim().startsWith("{")
  const hasRecordData = Boolean(
    hasAnyScore ||
      achievements !== "" ||
      academicRating.trim() !== "" ||
      hasMeaningfulPlainTextKq ||
      (student?.kqgdTieuHoc && String(student.kqgdTieuHoc).trim() !== "")
  )

  const criteria = String(student?.admissionCriteria || "").toLowerCase()

  const hasLegacyV1Rules =
    Array.isArray(regConfig.rules) &&
    regConfig.rules.some(r => r?.id && LEGACY_V1_RULE_IDS.has(String(r.id)))
  const effectiveRules =
    !Array.isArray(regConfig.rules) ||
    regConfig.rules.length === 0 ||
    ((regConfig.schemaVersion || 1) < 2 && hasLegacyV1Rules)
      ? DEFAULT_ADMISSION_REGULATIONS.rules
      : regConfig.rules.filter(r => !r?.id || !LEGACY_V1_RULE_IDS.has(String(r.id)))

  const matchedRule = sanitizeRegulationRule(
    findMatchingRegulationRule(effectiveRules, gradeStr, sysCode, timingInfo.code)
  )

  const mandatorySubs = matchedRule.mandatorySubjects || []
  const conditionalSubs = matchedRule.conditionalSubjects || []
  const orientationSubs = matchedRule.orientationSubjects || []
  const onRequestSubs = matchedRule.onRequestSubjects || []
  const allStandardSubs = Array.from(new Set([...mandatorySubs, ...conditionalSubs, ...orientationSubs]))

  const threshold = matchedRule.scoreThreshold ?? 8.0
  const isRatingEligible =
    programType !== "HOMESCHOOLING" && !checkIsFailingAcademicOrConduct(academicRating, conductRating)

  // 1. Đầu cấp Lớp 1 chưa có bảng điểm (NO_TRANSCRIPT)
  if (matchedRule.exemptionMode === "NO_TRANSCRIPT") {
    const orientNote =
      orientationSubs.length > 0
        ? ` (${orientationSubs.join(", ")}: chỉ dùng để định hướng, không làm tiêu chí xét tuyển)`
        : ""
    return {
      programType,
      programLabel,
      transcriptPeriodLabel,
      intakeTimingCode: timingInfo.code,
      intakeTimingLabel: timingInfo.label,
      resolvedSystemCode: sysCode,
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
      isRatingEligibleForExemption: false,
      scoreThreshold: 0,
      scoreBasisType: matchedRule.scoreBasisType,
      exemptionMode: matchedRule.exemptionMode,
      regulationStatus: "KHAO_SAT_DAU_CAP_K1",
      regulationBadgeLabel: `Đầu cấp K1 • Hệ ${sysCode}`,
      regulationBadgeColor: "bg-teal-50 text-[#005854] border-teal-200",
      regulationReason:
        matchedRule.regulationNote ||
        `Khối 1 (${timingInfo.label} • Hệ ${sysCode}): Phân công ${allStandardSubs.join(", ")}${orientNote}.`,
      recommendedSubjectNames: allStandardSubs,
      orientationSubjectNames: orientationSubs,
      onRequestSubjectNames: onRequestSubs,
      exemptedSubjectNames: [],
      appliedRuleName: matchedRule.name,
      transcriptBasis: matchedRule.transcriptBasis
    }
  }

  // 2. Nhóm KHÔNG MIỄN THEO ĐIỂM (VD: Lớp 11 HK2 & Lớp 12)
  if (matchedRule.exemptionMode === "NO_SCORE_EXEMPTION") {
    const ratingNorm = academicRating.toLowerCase()
    const allowedRatings = (matchedRule.minAcademicRatings || ["xuất sắc", "giỏi", "tốt", "khá"])
      .map(r => r.toLowerCase().trim())
      .filter(Boolean)
    const ratingOk = !academicRating || allowedRatings.some(r => ratingNorm.includes(r))
    const ratingWarning =
      matchedRule.requireAcademicRatingForEntry && hasRecordData && academicRating && !ratingOk
        ? ` Lưu ý: Học lực hiện tại "${academicRating}" chưa đạt mức Khá trở lên theo quy chế.`
        : ""

    return {
      programType,
      programLabel,
      transcriptPeriodLabel,
      intakeTimingCode: timingInfo.code,
      intakeTimingLabel: timingInfo.label,
      resolvedSystemCode: sysCode,
      academicRating: academicRating || (hasRecordData ? "Đã nhập KQHT" : "Chưa nhập KQHT"),
      conductRating,
      scores,
      mathScore,
      litScore,
      engScore,
      combinationSummary,
      achievements,
      hasRecordData,
      hasAttachments,
      isRatingEligibleForExemption: false,
      scoreThreshold: 0,
      scoreBasisType: matchedRule.scoreBasisType,
      exemptionMode: matchedRule.exemptionMode,
      regulationStatus: "KHAO_SAT_DAY_DU",
      regulationBadgeLabel: !ratingOk && hasRecordData ? "Cần lưu ý học lực • KS đủ môn" : "Bắt buộc KS đủ môn (Không miễn)",
      regulationBadgeColor:
        !ratingOk && hasRecordData
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : "bg-amber-50 text-amber-800 border-amber-200",
      regulationReason: `${matchedRule.transcriptBasis || "Không miễn theo điểm"} Phân công bắt buộc: ${allStandardSubs.join(", ")}.${ratingWarning}`,
      recommendedSubjectNames: allStandardSubs,
      orientationSubjectNames: orientationSubs,
      onRequestSubjectNames: onRequestSubs,
      exemptedSubjectNames: [],
      appliedRuleName: matchedRule.name,
      transcriptBasis: matchedRule.transcriptBasis
    }
  }

  // 3. Kiểm tra diện Tuyển thẳng rõ ràng (ngay cả khi chưa nhập điểm chi tiết)
  if (criteria.includes("tuyển thẳng")) {
    const directSubs =
      matchedRule.directAdmissionSubjects && matchedRule.directAdmissionSubjects.length > 0
        ? matchedRule.directAdmissionSubjects
        : orientationSubs.length > 0
        ? orientationSubs
        : ["Phiếu định hướng đầu vào"]
    const exempted = allStandardSubs.filter(s => !directSubs.includes(s))
    return {
      programType,
      programLabel,
      transcriptPeriodLabel,
      intakeTimingCode: timingInfo.code,
      intakeTimingLabel: timingInfo.label,
      resolvedSystemCode: sysCode,
      academicRating: academicRating || "Tuyển thẳng",
      conductRating,
      scores,
      mathScore,
      litScore,
      engScore,
      combinationSummary,
      achievements,
      hasRecordData: true,
      hasAttachments,
      isRatingEligibleForExemption: true,
      scoreThreshold: threshold,
      scoreBasisType: matchedRule.scoreBasisType,
      exemptionMode: matchedRule.exemptionMode,
      regulationStatus: "TUYEN_THANG_GOI_Y",
      regulationBadgeLabel: "Diện Tuyển thẳng • Định hướng",
      regulationBadgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      regulationReason: `Học sinh thuộc diện Tuyển thẳng${achievements ? ` (${achievements})` : ""}. Đề xuất miễn ${exempted.join(", ") || "môn văn hóa"}, chỉ phân công ${directSubs.join(", ")}.`,
      recommendedSubjectNames: directSubs,
      orientationSubjectNames: orientationSubs,
      onRequestSubjectNames: onRequestSubs,
      exemptedSubjectNames: exempted,
      appliedRuleName: matchedRule.name,
      transcriptBasis: matchedRule.transcriptBasis
    }
  }

  // 4. Chưa có dữ liệu điểm trường cũ -> Cần khảo sát đầy đủ các môn quy định của Hệ & Mốc thời gian
  if (!hasRecordData) {
    const basisHint = matchedRule.transcriptBasis ? ` Căn cứ: ${matchedRule.transcriptBasis}` : ""
    return {
      programType,
      programLabel,
      transcriptPeriodLabel,
      intakeTimingCode: timingInfo.code,
      intakeTimingLabel: timingInfo.label,
      resolvedSystemCode: sysCode,
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
      isRatingEligibleForExemption: isRatingEligible,
      scoreThreshold: threshold,
      scoreBasisType: matchedRule.scoreBasisType,
      exemptionMode: matchedRule.exemptionMode,
      regulationStatus: "CHUA_DU_THONG_TIN",
      regulationBadgeLabel: "Chưa có bảng điểm • KS đủ môn",
      regulationBadgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      regulationReason: `Chưa nhập điểm bảng điểm (${timingInfo.label} • Hệ ${sysCode}). Phân công khảo sát: ${allStandardSubs.join(", ")}.${basisHint}`,
      recommendedSubjectNames: allStandardSubs,
      orientationSubjectNames: orientationSubs,
      onRequestSubjectNames: onRequestSubs,
      exemptedSubjectNames: [],
      appliedRuleName: matchedRule.name,
      transcriptBasis: matchedRule.transcriptBasis
    }
  }

  // 5. Đánh giá miễn giảm từng môn dựa trực tiếp trên Điểm Toán, Điểm Văn/TV, Điểm Anh theo ngưỡng Quy chế (8.0 hoặc 6.5)
  const basisLabel =
    matchedRule.scoreBasisType === "DIEM_KTDK" ? "điểm KTĐK" : "điểm TBM"

  const certKeywords = (matchedRule.intlCertKeywords || "ielts,cambridge,flyers,ket,pet,fce,toefl")
    .split(",")
    .map(k => k.trim().toLowerCase())
    .filter(Boolean)
  const achLower = achievements.toLowerCase()
  const hasIntlCert = achievements.length > 0 && certKeywords.some(k => achLower.includes(k))

  const canExemptByTranscript = isRatingEligible

  const exemptedSubs: string[] = []
  const requiredConditionalSubs: string[] = []

  conditionalSubs.forEach(sub => {
    const passByScore =
      canExemptByTranscript &&
      checkConditionalSubjectPass(sub, threshold, { mathScore, litScore, engScore })
    const passEngByCert =
      hasIntlCert &&
      sub.toLowerCase().includes("tiếng anh") &&
      !sub.toLowerCase().includes("vấn đáp") &&
      !sub.toLowerCase().includes("speaking") &&
      !sub.toLowerCase().includes("esl")
    if (passByScore || passEngByCert) {
      exemptedSubs.push(sub)
    } else {
      requiredConditionalSubs.push(sub)
    }
  })

  const recommendedSubs = Array.from(
    new Set([...mandatorySubs, ...requiredConditionalSubs, ...orientationSubs])
  )

  // Nếu miễn được TẤT CẢ các môn văn hóa có điều kiện
  if (conditionalSubs.length > 0 && exemptedSubs.length === conditionalSubs.length) {
    const remainLabel =
      recommendedSubs.length > 0
        ? `chỉ phân công ${recommendedSubs.join(", ")}`
        : "đủ điều kiện miễn toàn bộ môn khảo sát văn hóa (chỉ thực hiện phỏng vấn định hướng đầu vào)"
    return {
      programType,
      programLabel,
      transcriptPeriodLabel,
      intakeTimingCode: timingInfo.code,
      intakeTimingLabel: timingInfo.label,
      resolvedSystemCode: sysCode,
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
      isRatingEligibleForExemption: isRatingEligible,
      scoreThreshold: threshold,
      scoreBasisType: matchedRule.scoreBasisType,
      exemptionMode: matchedRule.exemptionMode,
      regulationStatus: "XET_TUYEN_HOC_BA",
      regulationBadgeLabel: `Đạt ngưỡng ≥ ${threshold} • Miễn ${exemptedSubs.length} môn`,
      regulationBadgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      regulationReason: `Đạt ${basisLabel} ≥ ${threshold} (${matchedRule.transcriptBasis || timingInfo.label}): Miễn ${exemptedSubs.join(", ")}; ${remainLabel}.`,
      recommendedSubjectNames:
        recommendedSubs.length > 0 ? recommendedSubs : ["Phiếu định hướng đầu vào"],
      orientationSubjectNames: orientationSubs,
      onRequestSubjectNames: onRequestSubs,
      exemptedSubjectNames: exemptedSubs,
      appliedRuleName: matchedRule.name,
      transcriptBasis: matchedRule.transcriptBasis
    }
  }

  // Nếu miễn được MỘT PHẦN các môn có điều kiện (VD: Toán >= 8.0 nhưng Tiếng Việt < 8.0)
  if (exemptedSubs.length > 0) {
    return {
      programType,
      programLabel,
      transcriptPeriodLabel,
      intakeTimingCode: timingInfo.code,
      intakeTimingLabel: timingInfo.label,
      resolvedSystemCode: sysCode,
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
      isRatingEligibleForExemption: isRatingEligible,
      scoreThreshold: threshold,
      scoreBasisType: matchedRule.scoreBasisType,
      exemptionMode: matchedRule.exemptionMode,
      regulationStatus: "XET_TUYEN_HOC_BA",
      regulationBadgeLabel: `Miễn ${exemptedSubs.length} môn • KS ${recommendedSubs.length} môn`,
      regulationBadgeColor: "bg-teal-50 text-[#00736E] border-teal-200",
      regulationReason: `Theo ngưỡng ${basisLabel} ≥ ${threshold} (${timingInfo.label} • Hệ ${sysCode}): Miễn ${exemptedSubs.join(", ")}; cần khảo sát ${recommendedSubs.join(", ")}.`,
      recommendedSubjectNames: recommendedSubs,
      orientationSubjectNames: orientationSubs,
      onRequestSubjectNames: onRequestSubs,
      exemptedSubjectNames: exemptedSubs,
      appliedRuleName: matchedRule.name,
      transcriptBasis: matchedRule.transcriptBasis
    }
  }

  return {
    programType,
    programLabel,
    transcriptPeriodLabel,
    intakeTimingCode: timingInfo.code,
    intakeTimingLabel: timingInfo.label,
    resolvedSystemCode: sysCode,
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
    isRatingEligibleForExemption: isRatingEligible,
    scoreThreshold: threshold,
    scoreBasisType: matchedRule.scoreBasisType,
    exemptionMode: matchedRule.exemptionMode,
    regulationStatus: "KHAO_SAT_DAY_DU",
    regulationBadgeLabel: `Khảo sát theo quy chế (${timingInfo.label})`,
    regulationBadgeColor: "bg-slate-100 text-[#003B3A] border-slate-300",
    regulationReason: `Hệ ${sysCode} • ${timingInfo.label} (ngưỡng miễn ${basisLabel} ≥ ${threshold}): Phân công khảo sát ${recommendedSubs.join(", ")}.`,
    recommendedSubjectNames: recommendedSubs,
    orientationSubjectNames: orientationSubs,
    onRequestSubjectNames: onRequestSubs,
    exemptedSubjectNames: [],
    appliedRuleName: matchedRule.name,
    transcriptBasis: matchedRule.transcriptBasis
  }
}

export interface InputAssessmentGradeConfigItem {
  id?: string
  academicYearId?: string
  periodId?: string | null
  educationSystemId?: string | null
  educationSystemCode?: string | null
  grade?: string | null
  subjectId?: string | null
  subject?: {
    id?: string
    code?: string | null
    name?: string | null
  } | null
}

export interface StudentExamSubjectItem {
  name: string
  subjectName?: string
  code?: string
  isOrientation?: boolean
  isMandatory?: boolean
  isOnRequest?: boolean
  isConfiguredInSystem?: boolean
  note?: string
  reason?: string
}

export interface StudentExamSubjectsResult {
  insight: StudentAcademicInsight
  examSubjects: StudentExamSubjectItem[]
  requiredSubjects: StudentExamSubjectItem[]
  exemptedSubjects: {
    name: string
    subjectName?: string
    reason?: string
    note?: string
  }[]
  exemptSubjects: {
    name: string
    subjectName?: string
    reason?: string
    note?: string
  }[]
  displaySummary: string
  examSummary: string
  badgeLabel: string
  badgeTone: "teal" | "emerald" | "amber" | "sky" | "slate"
  reason: string
  ruleApplied: string
  intakeTime: string
}

/**
 * Xác định chính xác danh sách Môn Kiểm Tra của học sinh
 * Bám sát đồng thời 3 nguồn chuẩn mực:
 *  1. Cấu hình file điểm khảo sát đầu vào (/api/admin/input-assessments/grade-configs) theo "1. Mốc thời gian / Kỳ khảo sát", Hệ học & Khối
 *  2. Cấu hình Môn học theo Khối & Hệ (GradeSubjectMapping)
 *  3. Quy chế Tuyển sinh Đầu vào K-12 năm 2026 dựa trực tiếp trên dữ kiện nhập Điểm Toán, Điểm Văn/TV, Điểm Anh
 */
export function resolveStudentExamSubjects(
  student?: RegulationStudentInput | null,
  options?: {
    customConfig?: AdmissionRegulationConfig | null
    regulationConfig?: AdmissionRegulationConfig | null
    gradeConfigs?: InputAssessmentGradeConfigItem[] | null
    gradeSubjectMappings?: {
      grade: string | number
      educationSystem: string
      subjectId?: string
      subject?: { id?: string; name?: string; code?: string }
    }[] | any[]
    mappings?: any[]
    periods?: RegulationPeriodItem[] | null
    periodName?: string
  }
): StudentExamSubjectsResult {
  const regConfig = options?.regulationConfig || options?.customConfig || undefined
  const rawMappings = options?.mappings || options?.gradeSubjectMappings
  const rawGradeConfigs = options?.gradeConfigs || []
  const periodKeyInfo = resolveStudentGradeConfigPeriodKey(student, options?.periods, options?.periodName)

  const studentData = student
    ? {
        ...student,
        hocKy: student.hocKy || periodKeyInfo.displayValue
      }
    : student

  const insight = analyzeStudentAcademicAndRegulation(studentData, regConfig)
  const gradeStr = String(student?.grade || "1").replace(/\D/g, "") || "1"
  const gradeNum = parseInt(gradeStr, 10) || 1
  const khoiLabel = `Khối ${gradeNum}`
  const sysCode = insight.resolvedSystemCode.toUpperCase().trim()
  const isIntl = isIntlSystemCode(sysCode)

  const norm = (s: string) => String(s || "").toLowerCase().replace(/[–—]/g, "-").trim()

  const isSubjectAllowedForTrack = (subName: string, subCode?: string | null): boolean => {
    const n = norm(subName)
    const c = String(subCode || "").trim().toUpperCase()
    if (isIntl) {
      if (
        c === "TOA" ||
        c === "TAV" ||
        c === "TAVD" ||
        n.includes("toán") ||
        n.includes("tiếng anh (viết)") ||
        n.includes("tiếng anh (vấn đáp)")
      ) {
        return false
      }
    } else if (sysCode === "HNS") {
      if (c === "EPT" || c.includes("ESL") || n.includes("ept") || n.includes("esl")) {
        return false
      }
    }
    return true
  }

  // 1. Phân tích cấu hình từ "8. Cấu hình file điểm khảo sát đầu vào" (gradeConfigs) & "7. Cấu hình khảo sát" (mappings)
  const configuredMap = new Map<string, { id?: string; name: string; code?: string; isExplicitScope?: boolean }>()
  const explicitScopeSubjects: { id?: string; name: string; code?: string }[] = []

  if (Array.isArray(rawMappings) && rawMappings.length > 0) {
    rawMappings.forEach(m => {
      const gClean = String(m.grade || "").replace(/\D/g, "")
      const eduClean = String(m.educationSystem || "").toUpperCase().trim()
      if (
        gClean === gradeStr &&
        (eduClean === sysCode || (isIntl && isIntlSystemCode(eduClean))) &&
        m.subject?.name &&
        isSubjectAllowedForTrack(m.subject.name, m.subject.code)
      ) {
        configuredMap.set(norm(m.subject.name), {
          id: m.subject.id,
          name: m.subject.name.trim(),
          code: m.subject.code?.trim(),
          isExplicitScope: false
        })
      }
    })
  }

  if (Array.isArray(rawGradeConfigs) && rawGradeConfigs.length > 0) {
    // Ưu tiên Kỳ khảo sát cụ thể nếu nhà trường cấu hình riêng cho kỳ đó; nếu không lấy theo Mốc thời gian chuẩn (DAU_NAM | HK1 | HK2)
    const hasSpecificPeriodExactConfigs = Boolean(
      periodKeyInfo.specificPeriodId &&
        rawGradeConfigs.some(c => {
          const cPer = String(c?.periodId || "ALL").trim()
          const cGrade = String(c?.grade || "ALL").trim()
          const cSys = String(c?.educationSystemCode || c?.educationSystemId || "ALL").toUpperCase().trim()
          if (isPreschoolSystem(cSys)) return false
          const gradeOk = cGrade === khoiLabel || cGrade === gradeStr || cGrade === "ALL"
          const sysOk = cSys === sysCode || (isIntl && isIntlSystemCode(cSys)) || cSys === "ALL"
          return cPer === periodKeyInfo.specificPeriodId && gradeOk && sysOk
        })
    )

    const targetPeriodKey =
      hasSpecificPeriodExactConfigs && periodKeyInfo.specificPeriodId
        ? periodKeyInfo.specificPeriodId
        : periodKeyInfo.milestoneCode

    rawGradeConfigs.forEach(c => {
      const subName = String(c?.subject?.name || "").trim()
      const subCode = String(c?.subject?.code || "").trim()
      if (!subName) return

      const cSys = String(c?.educationSystemCode || c?.educationSystemId || "ALL").toUpperCase().trim()
      if (isPreschoolSystem(cSys)) return
      if (!isSubjectAllowedForTrack(subName, subCode)) return

      const cGrade = String(c?.grade || "ALL").trim()
      const isExactGrade = cGrade === khoiLabel || cGrade === gradeStr
      if (!isExactGrade && cGrade !== "ALL") return

      const cPeriod = String(c?.periodId || "ALL").trim() || "ALL"
      const isExactPeriod =
        cPeriod === targetPeriodKey ||
        (cPeriod === periodKeyInfo.milestoneCode && !hasSpecificPeriodExactConfigs)
      if (!isExactPeriod && cPeriod !== "ALL") return

      const isExactSys = cSys === sysCode || (isIntl && isIntlSystemCode(cSys))
      if (!isExactSys && cSys !== "ALL") return

      const subNorm = norm(subName)
      const isExplicitSysAndPeriod = isExactGrade && isExactPeriod && isExactSys

      // Không để mẫu mặc định ALL | ALL tự ý đẩy Tâm lý / Phiếu định hướng / NLTD vào danh sách thi
      if (
        !isExplicitSysAndPeriod &&
        (subNorm.includes("tâm lý") || subNorm.includes("phiếu định hướng") || subNorm.includes("năng lực tư duy"))
      ) {
        return
      }

      // Bộ chuẩn 5-6 tuổi chỉ áp dụng cho Khối 1 Đầu năm / HK1
      if (
        (subNorm.includes("5-6 tuổi") || subNorm.includes("16 tiêu chí") || subCode.toUpperCase() === "TCI") &&
        (gradeNum !== 1 || periodKeyInfo.milestoneCode === "HK2")
      ) {
        return
      }

      const item = {
        id: c?.subject?.id || c?.subjectId || undefined,
        name: subName,
        code: subCode || undefined,
        isExplicitScope: isExplicitSysAndPeriod
      }
      const existing = configuredMap.get(subNorm)
      if (!existing || isExplicitSysAndPeriod) {
        configuredMap.set(subNorm, item)
      }
      if (isExplicitSysAndPeriod && !explicitScopeSubjects.some(x => norm(x.name) === subNorm)) {
        explicitScopeSubjects.push({ id: item.id, name: item.name, code: item.code })
      }
    })
  }

  // 2. Bám sát 100% Cấu hình quy chế tuyển sinh (QUY_CHE_TS):
  // Danh sách môn khảo sát & môn được miễn được quyết định trực tiếp từ Quy chế tuyển sinh theo (Khối, Hệ, Mốc thời gian)
  // kết hợp Điểm Toán, Điểm Văn/TV, Điểm Anh — không để gradeConfigs tự ý ghi đè hay chèn thêm môn ngoài quy chế.
  const recommendedNames = [...insight.recommendedSubjectNames]
  const exemptedNames = [...insight.exemptedSubjectNames]
  const orientationNames = [...insight.orientationSubjectNames]

  const findConfiguredSubject = (recName: string) => {
    const recNorm = norm(recName)
    for (const [cNorm, cItem] of configuredMap.entries()) {
      if (
        cNorm === recNorm ||
        ((recNorm.includes("5-6 tuổi") || recNorm.includes("16 tiêu chí")) &&
          (cNorm.includes("5-6 tuổi") || cNorm.includes("16 tiêu chí") || cNorm === "tci")) ||
        (recNorm.includes("toán") && cNorm.includes("toán")) ||
        (recNorm === "tiếng việt" && cNorm.includes("tiếng việt")) ||
        (recNorm === "ngữ văn" && cNorm.includes("ngữ văn")) ||
        (recNorm.includes("esl") && cNorm.includes("esl")) ||
        (recNorm.includes("ept") && cNorm.includes("ept")) ||
        (recNorm.includes("tiếng anh (viết)") && cNorm.includes("tiếng anh") && cNorm.includes("viết")) ||
        (recNorm.includes("tiếng anh (vấn đáp)") && cNorm.includes("tiếng anh") && cNorm.includes("vấn đáp"))
      ) {
        return cItem
      }
    }
    return undefined
  }

  // 3. Lập danh sách các Môn Cần Kiểm Tra (Exam Subjects)
  const examSubjects: StudentExamSubjectItem[] = []
  const seenSubjectNames = new Set<string>()

  recommendedNames.forEach(recName => {
    const recNorm = norm(recName)
    if (!isSubjectAllowedForTrack(recName)) return

    const matchedConfiguredItem = findConfiguredSubject(recName)
    const isConfigured = configuredMap.size > 0 ? Boolean(matchedConfiguredItem) : true

    // "Phiếu định hướng đầu vào" và "Tâm lý" chỉ hiển thị ở cột Môn kiểm tra nếu được cấu hình tường minh cho (Mốc thời gian, Hệ, Khối)
    if (
      (recNorm.includes("phiếu định hướng") || recNorm.includes("tâm lý")) &&
      !matchedConfiguredItem?.isExplicitScope
    ) {
      return
    }

    const displaySubjectName = matchedConfiguredItem?.name || recName
    const isOrientation = orientationNames.some(o => norm(o) === recNorm)
    const isOnRequest = insight.onRequestSubjectNames.some(o => norm(o) === recNorm)
    const isMandatory = !isOrientation && !isOnRequest

    if (!seenSubjectNames.has(displaySubjectName)) {
      seenSubjectNames.add(displaySubjectName)
      examSubjects.push({
        name: displaySubjectName,
        subjectName: displaySubjectName,
        code: matchedConfiguredItem?.code,
        isOrientation,
        isOnRequest,
        isMandatory,
        isConfiguredInSystem: isConfigured,
        note: isOrientation
          ? "Môn định hướng đầu vào, không dùng làm tiêu chí xét tuyển"
          : "Môn khảo sát bắt buộc theo Quy chế tuyển sinh"
      })
    }
  })

  // 4. Danh sách môn được miễn theo Quy chế dựa trên Điểm Toán, Điểm Văn/TV, Điểm Anh
  const thresholdLabel = insight.scoreThreshold > 0 ? ` ≥ ${insight.scoreThreshold}` : ""
  const exemptedSubjects = Array.from(new Set(exemptedNames)).map(exName => {
    let reason = "Miễn theo Quy chế Tuyển sinh"
    const exNorm = norm(exName)
    if (exNorm.includes("toán") && insight.mathScore !== null) {
      reason = `Điểm Toán ${insight.mathScore}${thresholdLabel} (đạt ngưỡng miễn)`
    } else if ((exNorm.includes("tiếng việt") || exNorm.includes("ngữ văn")) && insight.litScore !== null) {
      reason = `Điểm Văn/TV ${insight.litScore}${thresholdLabel} (đạt ngưỡng miễn)`
    } else if (exNorm.includes("tiếng anh") && insight.engScore !== null) {
      reason = `Điểm Anh ${insight.engScore}${thresholdLabel} (đạt ngưỡng miễn)`
    } else if (insight.regulationStatus === "TUYEN_THANG_GOI_Y") {
      reason = "Diện Tuyển thẳng / Thành tích vượt trội"
    } else if (insight.regulationStatus === "XET_TUYEN_HOC_BA") {
      reason = "Đủ ĐK Xét tuyển học bạ"
    }
    return { name: exName, subjectName: exName, reason, note: reason }
  })

  // 5. Chuỗi tóm tắt hiển thị gọn (displaySummary) & nhãn quy tắc áp dụng theo Cấu hình file điểm KSĐV
  const examNames = examSubjects.map(s => (s.isOrientation ? `${s.name} (ĐH)` : s.name))
  let displaySummary = examNames.join(", ")
  if (examSubjects.length === 0) {
    displaySummary = "Miễn toàn bộ môn văn hóa"
  }
  if (exemptedSubjects.length > 0) {
    displaySummary += ` • Miễn: ${exemptedSubjects.map(e => e.name).join(", ")}`
  }

  let badgeTone: "teal" | "emerald" | "amber" | "sky" | "slate" = "teal"
  if (insight.regulationStatus === "TUYEN_THANG_GOI_Y") badgeTone = "emerald"
  else if (insight.regulationStatus === "XET_TUYEN_HOC_BA") badgeTone = "emerald"
  else if (insight.regulationStatus === "KHAO_SAT_DAU_CAP_K1") badgeTone = "sky"
  else if (exemptedSubjects.length > 0) badgeTone = "emerald"
  else badgeTone = "teal"

  const milestoneShort =
    periodKeyInfo.milestoneCode === "HK2"
      ? "Học kỳ 2"
      : periodKeyInfo.milestoneCode === "HK1"
      ? "Học kỳ 1"
      : "Đầu năm"
  const formattedThreshold =
    Number.isInteger(insight.scoreThreshold)
      ? insight.scoreThreshold.toFixed(1)
      : String(insight.scoreThreshold)
  const ruleThresholdSuffix =
    insight.exemptionMode === "BY_SCORE" && insight.scoreThreshold > 0
      ? ` (${insight.scoreBasisType === "DIEM_KTDK" ? "KTĐK" : "TBM"} ≥ ${formattedThreshold})`
      : insight.exemptionMode === "NO_SCORE_EXEMPTION"
      ? " (Không miễn điểm)"
      : ""
  const conciseScopeLabel = `Hệ ${sysCode} • Khối ${gradeNum} • ${milestoneShort}${ruleThresholdSuffix}`

  return {
    insight,
    examSubjects,
    requiredSubjects: examSubjects,
    exemptedSubjects,
    exemptSubjects: exemptedSubjects,
    displaySummary,
    examSummary: displaySummary,
    badgeLabel: insight.regulationBadgeLabel,
    badgeTone,
    reason: insight.regulationReason,
    ruleApplied: conciseScopeLabel,
    intakeTime: periodKeyInfo.displayValue || milestoneShort
  }
}

export interface SystemSubjectSummaryItem {
  systemGroup: string
  systemCodes: string[]
  subjectsLabel: string
  subjectNames: string[]
}

/**
 * Tổng hợp danh sách Môn khảo sát theo từng Hệ đào tạo K-12 dựa trên bảng Cấu hình môn học (GradeSubjectMapping)
 * và chuẩn hóa ranh giới môn theo Quy chế Tuyển sinh 2026 (dùng cho Bảng Danh sách đợt khảo sát).
 */
export function summarizeSystemSubjectsFromMappings(
  mappings?: {
    grade?: string | number
    educationSystem?: string
    subject?: { id?: string; name?: string; code?: string }
  }[] | null
): SystemSubjectSummaryItem[] {
  const defaultSummaries: SystemSubjectSummaryItem[] = [
    {
      systemGroup: "HNS",
      systemCodes: ["HNS"],
      subjectsLabel: "16 tiêu chí (K1), Toán học, Tiếng Việt / Ngữ Văn, Tiếng Anh (viết + vấn đáp)",
      subjectNames: ["Bộ chuẩn phát triển trẻ em 5–6 tuổi", "Toán học", "Tiếng Việt", "Ngữ Văn", "Tiếng Anh (viết)", "Tiếng Anh (vấn đáp)"]
    },
    {
      systemGroup: "HNG / SB",
      systemCodes: ["HNG", "HNC", "SB"],
      subjectsLabel: "16 tiêu chí (K1), Tiếng Việt / Ngữ Văn, EPT, ESL (vấn đáp)",
      subjectNames: ["Bộ chuẩn phát triển trẻ em 5–6 tuổi", "Tiếng Việt", "Ngữ Văn", "EPT", "ESL (vấn đáp)"]
    }
  ]

  if (!Array.isArray(mappings) || mappings.length === 0) {
    return defaultSummaries
  }

  const hnsSet = new Set<string>()
  const intlSet = new Set<string>()
  const intlSystemsFound = new Set<string>()

  const shortenName = (rawName: string): string => {
    const trimmed = rawName.trim()
    const low = trimmed.toLowerCase().replace(/[–—]/g, "-")
    if (low.includes("5-6 tuổi") || low.includes("16 tiêu chí")) return "16 tiêu chí (K1)"
    return trimmed
  }

  mappings.forEach(m => {
    const sys = String(m?.educationSystem || "").toUpperCase().trim()
    const subName = String(m?.subject?.name || "").trim()
    if (!sys || !subName || isPreschoolSystem(sys)) return

    const low = subName.toLowerCase().replace(/[–—]/g, "-")
    // Bỏ qua Tâm lý (chỉ thực hiện khi có đề nghị GV định hướng) và Phiếu định hướng để danh sách môn kiểm tra cô đọng
    if (low === "tâm lý" || low.includes("phiếu định hướng")) return

    if (sys === "HNS") {
      if (low.includes("ept") || low.includes("esl")) return
      hnsSet.add(shortenName(subName))
    } else if (sys === "HNG" || sys === "HNC" || sys === "SB") {
      intlSystemsFound.add(sys)
      // Theo Quy chế 2026: Hệ HNG/HNC/SB không khảo sát Toán và Tiếng Anh phổ thông (dùng EPT & ESL)
      if (low.includes("toán") || low.includes("tiếng anh (viết)") || low.includes("tiếng anh (vấn đáp)")) return
      intlSet.add(shortenName(subName))
    }
  })

  if (hnsSet.size === 0 && intlSet.size === 0) {
    return defaultSummaries
  }

  const formatList = (items: string[]): string => {
    const hasTV = items.some(x => x.toLowerCase() === "tiếng việt")
    const hasNV = items.some(x => x.toLowerCase() === "ngữ văn")
    const hasTAViet = items.some(x => x.toLowerCase() === "tiếng anh (viết)")
    const hasTAVanDap = items.some(x => x.toLowerCase() === "tiếng anh (vấn đáp)")

    const out: string[] = []
    if (items.includes("16 tiêu chí (K1)")) out.push("16 tiêu chí (K1)")
    items.forEach(item => {
      const low = item.toLowerCase()
      if (item === "16 tiêu chí (K1)") return
      if (hasTV && hasNV && (low === "tiếng việt" || low === "ngữ văn")) {
        if (!out.includes("Tiếng Việt / Ngữ Văn")) out.push("Tiếng Việt / Ngữ Văn")
        return
      }
      if (hasTAViet && hasTAVanDap && (low === "tiếng anh (viết)" || low === "tiếng anh (vấn đáp)")) {
        if (!out.includes("Tiếng Anh (viết + vấn đáp)")) out.push("Tiếng Anh (viết + vấn đáp)")
        return
      }
      if (!out.includes(item)) out.push(item)
    })
    return out.join(", ")
  }

  const result: SystemSubjectSummaryItem[] = []
  if (hnsSet.size > 0) {
    const arr = Array.from(hnsSet)
    result.push({
      systemGroup: "HNS",
      systemCodes: ["HNS"],
      subjectsLabel: formatList(arr),
      subjectNames: arr
    })
  }
  if (intlSet.size > 0 || intlSystemsFound.size > 0) {
    // Bám sát Quy chế 2026 cho Hệ I (HNG, SB, HNC): đảm bảo đầy đủ 16 tiêu chí (K1), Tiếng Việt, Ngữ Văn, EPT, ESL (vấn đáp)
    intlSet.add("16 tiêu chí (K1)")
    intlSet.add("Tiếng Việt")
    intlSet.add("Ngữ Văn")
    intlSet.add("EPT")
    intlSet.add("ESL (vấn đáp)")
    const arr = Array.from(intlSet)
    const codes = ["HNG", "HNC", "SB"].filter(c => intlSystemsFound.has(c))
    result.push({
      systemGroup: codes.length > 0 ? codes.join(" / ") : "HNG / SB",
      systemCodes: codes.length > 0 ? codes : ["HNG", "SB"],
      subjectsLabel: formatList(arr),
      subjectNames: arr
    })
  }
  return result
}

/**
 * Ánh xạ danh sách tên môn gợi ý sang danh sách ID môn thực tế trong CSDL (chuẩn xác 100% cho EPT, ESL, TCI 16 tiêu chí, Tiếng Anh viết/vấn đáp)
 */
export function matchRecommendedSubjectIds(
  recommendedNames: string[],
  availableSubjects: RegulationSubjectItem[]
): string[] {
  const matchedIds = new Set<string>()
  const normalizeText = (s: string) =>
    String(s || "")
      .toLowerCase()
      .replace(/[–—]/g, "-")
      .replace(/\s+/g, " ")
      .trim()

  recommendedNames.forEach(recName => {
    const normRec = normalizeText(recName)
    availableSubjects.forEach(sub => {
      const subName = normalizeText(sub.name || "")
      const subCode = normalizeText(sub.code || "")

      const isTciRec =
        normRec.includes("5-6 tuổi") ||
        normRec.includes("16 tiêu chí") ||
        normRec === "tci"
      const isTciSub =
        subCode === "tci" ||
        subName.includes("5-6 tuổi") ||
        subName.includes("16 tiêu chí")

      const isEslRec = normRec.includes("esl")
      const isEslSub = subName.includes("esl") || subCode.includes("esl")

      const isEptRec = normRec === "ept" || normRec.includes("ept ")
      const isEptSub = subName === "ept" || subName.includes("ept") || subCode === "ept"

      if (
        subName === normRec ||
        (isTciRec && isTciSub) ||
        (isEslRec && isEslSub) ||
        (isEptRec && isEptSub) ||
        (normRec.includes("toán") && subName.includes("toán")) ||
        (normRec === "tiếng việt" && subName.includes("tiếng việt")) ||
        (normRec === "ngữ văn" && subName.includes("ngữ văn")) ||
        (normRec.includes("tiếng anh (viết)") &&
          subName.includes("tiếng anh") &&
          subName.includes("viết") &&
          !isEslSub) ||
        (normRec.includes("tiếng anh (vấn đáp)") &&
          subName.includes("tiếng anh") &&
          subName.includes("vấn đáp") &&
          !isEslSub) ||
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
 * Kiểm tra học sinh có thuộc nhóm Đủ điều kiện Xét học bạ / Tuyển thẳng (được miễn ít nhất 1 môn văn hóa theo Quy chế)
 */
export function isStudentEligibleByRegulation(
  student?: RegulationStudentInput | null,
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
  student: RegulationStudentInput,
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
  const gradeNum = parseInt(gradeStr || "1", 10) || 1

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

  const vnSubLabel =
    gradeNum <= 5 || (gradeNum === 6 && insight.intakeTimingCode === "DAU_NAM")
      ? "Tiếng Việt"
      : "Ngữ văn"

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
    "Hệ Khảo sát": insight.resolvedSystemCode,
    "Thời điểm TS": insight.intakeTimingLabel,
    "Đăng ký CS": context?.campusName || student?.admissionCampus || student?.registeredCampus || "",
    "Kỳ / Đợt khảo sát": [context?.periodName || student?.period?.name, context?.batchName || student?.batch?.name]
      .filter(Boolean)
      .join(" - "),
    "Trường học cũ": student?.oldSchoolName || "",
    "Đối tượng Tuyển sinh": student?.targetType || "Nội tỉnh",
    "Hồ sơ / Bảng điểm": insight.programLabel,
    "Học kỳ / Năm TS": student?.hocKy || insight.intakeTimingLabel,
    "KQ Xếp loại Học tập": insight.academicRating || "",
    "Kết quả Rèn luyện": insight.conductRating || student?.kqRenLuyen || "Tốt",
    "Điểm Toán": insight.mathScore !== null ? insight.mathScore : "",
    "Điểm Tiếng Việt / Ngữ văn": insight.litScore !== null ? insight.litScore : "",
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
 * Tạo bộ dữ liệu Mẫu chuẩn (Sample Rows) bám sát Quy chế Tuyển sinh Phổ thông 2026
 */
export function getSampleRegulationEligibleRows(customConfig?: AdmissionRegulationConfig) {
  const regConfig = customConfig || DEFAULT_ADMISSION_REGULATIONS

  const sampleStudents = [
    {
      studentCode: "HS_QC_001",
      fullName: "Nguyễn Minh Khôi (Mẫu K3 HK1 - HNS miễn Toán & Tiếng Việt ≥ 8.0)",
      dateOfBirth: "2018-04-15",
      gender: "Nam",
      grade: "3",
      hocKy: "Học kỳ 1",
      surveyFormType: "HNS",
      surveySystem: "Trực tiếp",
      admissionCriteria: "Xét tuyển",
      registeredCampus: "CS1 - Sky-Line Riverside",
      oldSchoolName: "Trường Tiểu học Phù Đổng",
      targetType: "Nội tỉnh",
      kqRenLuyen: "Tốt",
      kqHocTap: JSON.stringify({
        programType: "BO_GD_DT",
        transcriptPeriod: "CA_NAM",
        overallRating: "Hoàn thành tốt",
        moet: {
          gradeLevel: "2",
          overallRating: "Hoàn thành tốt",
          conductRating: "Tốt",
          subjects: [
            { id: "toan", name: "Toán", score: "8.5" },
            { id: "tv", name: "Tiếng Việt", score: "8.5" }
          ]
        }
      }),
      _periodName: "Khảo sát Tuyển sinh Đầu vào",
      _batchName: "Đợt mẫu Quy chế 2026"
    },
    {
      studentCode: "HS_QC_002",
      fullName: "Trần Bảo Ngọc (Mẫu K4 - HNG miễn Tiếng Việt ≥ 8.0, thi EPT & ESL)",
      dateOfBirth: "2017-09-20",
      gender: "Nữ",
      grade: "4",
      hocKy: "Theo đợt tuyển sinh",
      surveyFormType: "HNG",
      surveySystem: "Trực tiếp",
      admissionCriteria: "Xét tuyển",
      registeredCampus: "CS3 - Sky-Line Global",
      oldSchoolName: "Trường Tiểu học Hoàng Văn Thụ",
      targetType: "Nội tỉnh",
      kqRenLuyen: "Tốt",
      kqHocTap: JSON.stringify({
        programType: "BO_GD_DT",
        transcriptPeriod: "CA_NAM",
        overallRating: "Hoàn thành xuất sắc",
        moet: {
          gradeLevel: "4",
          overallRating: "Hoàn thành xuất sắc",
          conductRating: "Tốt",
          subjects: [
            { id: "toan", name: "Toán", score: "9.0" },
            { id: "tv", name: "Tiếng Việt", score: "8.5" },
            { id: "ta", name: "Tiếng Anh", score: "9.0" }
          ]
        }
      }),
      _periodName: "Khảo sát Tuyển sinh Đầu vào",
      _batchName: "Đợt mẫu Quy chế 2026"
    },
    {
      studentCode: "HS_QC_003",
      fullName: "Lê Hoàng Nam (Mẫu K6 Đầu năm - HNS căn cứ lớp 5 ≥ 8.0)",
      dateOfBirth: "2015-02-10",
      gender: "Nam",
      grade: "6",
      hocKy: "Đầu năm học",
      surveyFormType: "HNS",
      surveySystem: "Trực tiếp",
      admissionCriteria: "Xét tuyển",
      registeredCampus: "CS1 - Sky-Line Riverside",
      oldSchoolName: "Trường Tiểu học Tây Sơn",
      targetType: "Nội tỉnh",
      kqRenLuyen: "Tốt",
      kqHocTap: JSON.stringify({
        programType: "BO_GD_DT",
        transcriptPeriod: "CA_NAM",
        overallRating: "Hoàn thành xuất sắc",
        moet: {
          gradeLevel: "5",
          overallRating: "Hoàn thành xuất sắc",
          conductRating: "Tốt",
          subjects: [
            { id: "toan", name: "Toán", score: "8.5" },
            { id: "tv", name: "Tiếng Việt", score: "8.0" },
            { id: "ta", name: "Tiếng Anh", score: "8.5" }
          ]
        }
      }),
      _periodName: "Khảo sát Tuyển sinh Đầu vào",
      _batchName: "Đợt mẫu Quy chế 2026"
    },
    {
      studentCode: "HS_QC_004",
      fullName: "Phạm Hà My (Mẫu K6 HK2 - HNC Compass căn cứ HK1 lớp 6 Ngữ văn ≥ 6.5)",
      dateOfBirth: "2015-07-18",
      gender: "Nữ",
      grade: "6",
      hocKy: "Học kỳ 2",
      surveyFormType: "HNC",
      surveySystem: "Trực tiếp",
      admissionCriteria: "Xét tuyển",
      registeredCampus: "CS4 - Sky-Line Hill",
      oldSchoolName: "Trường THCS Trưng Vương",
      targetType: "Nội tỉnh",
      kqRenLuyen: "Tốt",
      kqHocTap: JSON.stringify({
        programType: "BO_GD_DT",
        transcriptPeriod: "HK1",
        overallRating: "Khá",
        moet: {
          gradeLevel: "6",
          overallRating: "Khá",
          conductRating: "Tốt",
          subjects: [
            { id: "toan", name: "Toán", score: "7.2" },
            { id: "van", name: "Ngữ Văn", score: "7.0" },
            { id: "ta", name: "Tiếng Anh", score: "7.5" }
          ]
        }
      }),
      _periodName: "Khảo sát Tuyển sinh Bổ sung HK2",
      _batchName: "Đợt mẫu Quy chế 2026"
    },
    {
      studentCode: "HS_QC_005",
      fullName: "Võ Quốc Anh (Mẫu K10 - SB miễn Ngữ văn ≥ 6.5, thi EPT & ESL)",
      dateOfBirth: "2011-06-28",
      gender: "Nam",
      grade: "10",
      hocKy: "Theo đợt tuyển sinh",
      surveyFormType: "SB",
      surveySystem: "Trực tiếp",
      admissionCriteria: "Xét tuyển",
      registeredCampus: "CS3 - Sky-Line Global",
      oldSchoolName: "Trường THCS Nguyễn Khuyến",
      targetType: "Nội tỉnh",
      kqRenLuyen: "Tốt",
      kqHocTap: JSON.stringify({
        programType: "BO_GD_DT",
        transcriptPeriod: "CA_NAM",
        overallRating: "Giỏi",
        moet: {
          gradeLevel: "9",
          overallRating: "Giỏi",
          conductRating: "Tốt",
          subjects: [
            { id: "toan", name: "Toán", score: "8.2" },
            { id: "van", name: "Ngữ Văn", score: "7.5" },
            { id: "ta", name: "Tiếng Anh", score: "8.8" }
          ]
        }
      }),
      _periodName: "Khảo sát Tuyển sinh Đầu vào",
      _batchName: "Đợt mẫu Quy chế 2026"
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
    .map((rawRule, idx) => {
      const r = syncRuleLegacyFields(rawRule)
      const thresholdText =
        r.exemptionMode === "NO_TRANSCRIPT"
          ? "Đầu cấp chưa có bảng điểm"
          : r.exemptionMode === "NO_SCORE_EXEMPTION"
          ? "Không miễn theo điểm (Kiểm tra đủ môn)"
          : `${r.scoreBasisType === "DIEM_KTDK" ? "Điểm KTĐK" : "Điểm TBM"} >= ${r.scoreThreshold}`

      return {
        "STT": idx + 1,
        "Tên quy tắc": r.name,
        "Khối áp dụng": r.grades.map(g => `Khối ${g}`).join(", "),
        "Hệ đào tạo": r.systems.join(", "),
        "Thời điểm tuyển sinh": formatRuleTimingsLabel(r.intakeTimings),
        "Ngưỡng xét miễn theo điểm": thresholdText,
        "Môn khảo sát bắt buộc": r.mandatorySubjects.join(", ") || "—",
        "Môn khảo sát nếu dưới ngưỡng (Miễn nếu đạt)": r.conditionalSubjects.join(", ") || "Không miễn theo điểm",
        "Môn định hướng (Không làm tiêu chí xét tuyển)": r.orientationSubjects.join(", ") || "—",
        "Môn theo đề nghị GV định hướng": r.onRequestSubjects.join(", ") || "—",
        "Căn cứ xét tuyển": r.transcriptBasis || "",
        "Ghi chú chi tiết": r.regulationNote || ""
      }
    })
}

/**
 * Xuất file Excel Danh sách Học sinh đủ điều kiện khảo sát theo quy chế (Xét học bạ / Tuyển thẳng - Miễn môn văn hóa)
 */
export function exportEligibleStudentsRegulationExcel(options: {
  students?: RegulationStudentInput[]
  customConfig?: AdmissionRegulationConfig
  campuses?: RegulationCampusItem[]
  periods?: RegulationPeriodItem[]
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
        const pObj = periods.find(p => p.id === s.periodId)
        const bObj =
          (pObj?.batches || periods.flatMap(p => p.batches || [])).find(
            b => b.id === s.batchId
          )
        const cObj = campuses.find(
          c =>
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
    { wch: 34 }, // Họ và Tên *
    { wch: 13 }, // Ngày sinh
    { wch: 10 }, // Giới tính
    { wch: 8 },  // Khối
    { wch: 13 }, // Hệ Khảo sát
    { wch: 20 }, // Thời điểm TS
    { wch: 24 }, // Đăng ký CS
    { wch: 26 }, // Kỳ / Đợt khảo sát
    { wch: 26 }, // Trường học cũ
    { wch: 18 }, // Đối tượng Tuyển sinh
    { wch: 18 }, // Hồ sơ / Bảng điểm
    { wch: 18 }, // Học kỳ / Năm TS
    { wch: 22 }, // KQ Xếp loại Học tập
    { wch: 16 }, // Kết quả Rèn luyện
    { wch: 12 }, // Điểm Toán
    { wch: 22 }, // Điểm Tiếng Việt / Ngữ văn
    { wch: 14 }, // Điểm Tiếng Anh
    { wch: 32 }, // Thành tích / Chứng chỉ QT
    { wch: 38 }, // Kết quả Học tập
    { wch: 18 }, // Diện khảo sát
    { wch: 14 }, // Hình thức KS
    { wch: 28 }, // Diện Đủ ĐK theo Quy chế
    { wch: 28 }, // Môn Văn hóa được miễn KS
    { wch: 36 }, // Môn cần phân công KS
    { wch: 38 }, // Nhóm Quy chế áp dụng
    { wch: 58 }  // Căn cứ Quy chế chi tiết
  ]

  XLSX.utils.book_append_sheet(
    wb,
    wsMain,
    isSample ? "Mau_HS_Du_DK_Quy_Che" : "DS_HS_Du_DK_Quy_Che"
  )

  if (!isSample) {
    const wsSample = XLSX.utils.json_to_sheet(getSampleRegulationEligibleRows(regConfig))
    wsSample["!cols"] = wsMain["!cols"]
    XLSX.utils.book_append_sheet(wb, wsSample, "Mau_Tham_Khao")
  }

  const ruleRows = buildRegulationRulesSheetRows(regConfig)
  const wsRules = XLSX.utils.json_to_sheet(ruleRows)
  wsRules["!cols"] = [
    { wch: 6 },
    { wch: 42 },
    { wch: 20 },
    { wch: 18 },
    { wch: 24 },
    { wch: 32 },
    { wch: 32 },
    { wch: 38 },
    { wch: 30 },
    { wch: 22 },
    { wch: 44 },
    { wch: 58 }
  ]
  XLSX.utils.book_append_sheet(wb, wsRules, "Quy_Che_Tuyen_Sinh_2026")

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
