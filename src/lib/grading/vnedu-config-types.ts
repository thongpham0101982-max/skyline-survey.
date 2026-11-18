/**
 * Unified types and business rules for Sky-Line Gradebook Configuration
 * Supports both "VNEDU" (Sổ điểm theo vnEdu) and "INTERNAL" (Đánh giá nội bộ Sky-Line)
 */

export type GradeConfigType = "VNEDU" | "INTERNAL"
export type GradeColumnGroup = "TX" | "GK" | "CK" | "RATING" | "REMARK" | "COMPOSITE" | "OTHER"
export type GradeColumnDataType = "NUMBER" | "RATING" | "TEXT"
export type GradeColumnInputMode = "INPUT" | "CALCULATED"
export type ConfigConfirmationStatus = "CONFIRMED" | "UNCONFIRMED"

export interface GradeColumnDef {
  key: string
  label: string
  group: GradeColumnGroup
  attempt?: number | null
  dataType: GradeColumnDataType
  scaleCode: string // e.g. "SCORE_10", "SCORE_100", "RATING_TT27", "RATING_DAT", "TEXT"
  maxScore?: number | null
  allowedCodes?: string[] | null
  required: boolean
  inputMode: GradeColumnInputMode
  order: number
  aliases: string[]
}

export const DEFAULT_RATING_CODES_TT27 = ["T", "H", "C", "HTT", "HT", "CHT", "Đ", "CĐ"]
export const DEFAULT_RATING_CODES_DAT = ["Đ", "CĐ"]

const RATING_ALIAS_MAP: Record<string, string> = {
  "2": "T",
  "1": "H",
  "0": "C",
  "đ": "Đ",
  "đạt": "Đ",
  "dat": "Đ",
  "d": "Đ",
  "cđ": "CĐ",
  "chưa đạt": "CĐ",
  "chua dat": "CĐ",
  "cd": "CĐ",
  "t": "T",
  "tốt": "T",
  "tot": "T",
  "h": "H",
  "hoàn thành": "H",
  "hoan thanh": "H",
  "ht": "HT",
  "htt": "HTT",
  "hoàn thành tốt": "HTT",
  "hoan thanh tot": "HTT",
  "c": "C",
  "cht": "CHT",
  "chưa hoàn thành": "CHT",
  "chua hoan thanh": "CHT",
}

/**
 * Normalize a rating string (e.g. "Đạt" -> "Đ", "Chưa đạt" -> "CĐ", "2" -> "T", "1" -> "H", "0" -> "C")
 */
export function normalizeRatingCode(raw: string): string {
  const trimmed = String(raw || "").trim()
  if (!trimmed) return ""
  const lower = trimmed.toLowerCase()
  return RATING_ALIAS_MAP[lower] || trimmed.toUpperCase()
}

/**
 * Normalize Primary School (Tiểu học - TT27) XL input according to vnEdu shortcut rules:
 * - "2", "t", "T", "htt", "hoàn thành tốt" -> "T"
 * - "1", "h", "H", "ht", "hoàn thành" -> "H"
 * - "0", "c", "C", "cht", "chưa hoàn thành" -> "C"
 */
export function normalizePrimaryXlInput(raw: string): string {
  const trimmed = String(raw || "").trim()
  if (!trimmed) return ""
  const lower = trimmed.toLowerCase()
  if (lower === "2" || lower === "t" || lower === "htt" || lower === "hoàn thành tốt" || lower === "hoan thanh tot" || lower === "tốt" || lower === "tot") {
    return "T"
  }
  if (lower === "1" || lower === "h" || lower === "ht" || lower === "hoàn thành" || lower === "hoan thanh" || lower === "đ" || lower === "đạt" || lower === "dat") {
    return "H"
  }
  if (lower === "0" || lower === "c" || lower === "cht" || lower === "chưa hoàn thành" || lower === "chua hoan thanh" || lower === "cđ" || lower === "chưa đạt") {
    return "C"
  }
  return trimmed.toUpperCase()
}

/**
 * Extract numeric grade (1..12) from strings like "Khối 3", "3", "K3", "3/1", "1S_CS4"
 */
export function extractGradeNumber(grade?: string | null): number | null {
  if (!grade) return null
  const m = String(grade).match(/(\d+)/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return isNaN(n) ? null : n
}

/**
 * Check if a grade or class string belongs to Primary School (Tiểu học: Khối 1..5)
 */
export function isPrimaryGrade(gradeOrClassName?: string | null): boolean {
  const n = extractGradeNumber(gradeOrClassName)
  return n !== null && n >= 1 && n <= 5
}

/**
 * Check if an evaluationPeriod code represents Beginning-of-Year Assessment (Khảo sát đầu năm - KSĐN),
 * which always takes its subject and column configurations from "2. Đánh giá nội bộ Sky-Line" (INTERNAL).
 */
export function isKsdnEvaluationPeriod(evaluationPeriod?: string | null): boolean {
  const p = String(evaluationPeriod || "").toUpperCase().trim()
  return p === "KSĐN" || p === "KSDN" || p === "KHAO_SAT_DAU_NAM"
}

/**
 * Check if a (grade, evaluationPeriod) scope is Grade 6 Beginning-of-Year Assessment (Khối 6 • KSĐN).
 * Rule: Với Khối 6 KSĐN thì các môn khảo sát lấy ở bậc Tiểu học của Khối 5.
 */
export function isGrade6KsdnScope(grade?: string | null, evaluationPeriod?: string | null): boolean {
  return extractGradeNumber(grade) === 6 && isKsdnEvaluationPeriod(evaluationPeriod)
}

/**
 * Get the effective curriculum grade used for selecting/resolving subjects.
 * For Khối 6 in KSĐN, subjects are taken from Primary School Grade 5 ("Khối 5").
 */
export function getEffectiveSubjectGradeForScope(grade: string, evaluationPeriod?: string | null): string {
  if (isGrade6KsdnScope(grade, evaluationPeriod)) {
    return "Khối 5"
  }
  return grade
}

/**
 * Get vnEdu Primary School column labels & semester metadata for a given evaluationPeriod
 */
export function getPrimaryPeriodMeta(evaluationPeriod?: string | null): {
  periodCode: string
  semesterNumber: 1 | 2
  semesterLabel: string
  periodShortLabel: string
  remarkColumnLabel: string
  ktColumnKey: string
  ktColumnLabel: string
  xlColumnLabel: string
  isMidterm: boolean
} {
  const p = String(evaluationPeriod || "CK1").toUpperCase().trim()
  if (p === "GK1" || p === "GIUA_KY_1") {
    return {
      periodCode: "GK1",
      semesterNumber: 1,
      semesterLabel: "Học kỳ 1",
      periodShortLabel: "Giữa kỳ 1",
      remarkColumnLabel: "Nhận xét giữa kỳ",
      ktColumnKey: "col0",
      ktColumnLabel: "KT GK1",
      xlColumnLabel: "XL GK1",
      isMidterm: true,
    }
  }
  if (p === "CK1" || p === "CUOI_KY_1" || p === "HK1") {
    return {
      periodCode: "CK1",
      semesterNumber: 1,
      semesterLabel: "Học kỳ 1",
      periodShortLabel: "Cuối kỳ 1",
      remarkColumnLabel: "Nhận xét cuối kỳ",
      ktColumnKey: "col0",
      ktColumnLabel: "KT CK1",
      xlColumnLabel: "XL CK1",
      isMidterm: false,
    }
  }
  if (p === "GK2" || p === "GIUA_KY_2") {
    return {
      periodCode: "GK2",
      semesterNumber: 2,
      semesterLabel: "Học kỳ 2",
      periodShortLabel: "Giữa kỳ 2",
      remarkColumnLabel: "Nhận xét giữa kỳ",
      ktColumnKey: "col0",
      ktColumnLabel: "KT GK2",
      xlColumnLabel: "XL GK2",
      isMidterm: true,
    }
  }
  if (p === "CK2" || p === "CUOI_KY_2" || p === "HK2" || p === "CN") {
    return {
      periodCode: "CK2",
      semesterNumber: 2,
      semesterLabel: "Học kỳ 2",
      periodShortLabel: "Cuối kỳ 2",
      remarkColumnLabel: "Nhận xét cuối kỳ",
      ktColumnKey: "col0",
      ktColumnLabel: "KT CK2",
      xlColumnLabel: "XL CK2",
      isMidterm: false,
    }
  }
  return {
    periodCode: p || "KSĐN",
    semesterNumber: 1,
    semesterLabel: "Học kỳ 1",
    periodShortLabel: p === "KSĐN" ? "Khảo sát đầu năm" : p,
    remarkColumnLabel: "Nhận xét",
    ktColumnKey: "col0",
    ktColumnLabel: `KT ${p}`,
    xlColumnLabel: `XL ${p}`,
    isMidterm: true,
  }
}

export type SubjectCurriculumGroup = "MOET" | "SKL" | "BILINGUAL" | "KSDV"

/**
 * Classify a Subject record into its primary curriculum category:
 * - "MOET": Chương trình chuẩn Bộ GD&ĐT
 * - "SKL": Chương trình Đặc thù Sky-Line (Tâm lý, Cảm xúc xã hội SEL, STEM, Hướng nghiệp, Trải nghiệm - Dự án, Tiếng Nhật...)
 * - "BILINGUAL": Chương trình Song ngữ & Quốc tế (INT-..., Cambridge, IELTS, SAT...)
 * - "KSDV": Môn thuần Khảo sát đầu vào (NLTD, EPT, TAv, TAvd)
 */
export function getSubjectCurriculumGroup(
  subject:
    | {
        subjectName?: string | null
        subjectCode?: string | null
        category?: string | null
      }
    | null
    | undefined
): SubjectCurriculumGroup {
  if (!subject) return "MOET"
  const rawCat = String(subject.category || "").toUpperCase().trim()
  const tokens = rawCat
    .split(",")
    .map(t => t.trim())
    .filter(Boolean)

  if (tokens.length > 0 && tokens.every(t => t === "KSDV")) {
    return "KSDV"
  }
  const nonKsdv = tokens.filter(t => t !== "KSDV")
  if (nonKsdv.includes("SKL")) return "SKL"
  if (nonKsdv.includes("BILINGUAL") || nonKsdv.includes("INTERNATIONAL")) return "BILINGUAL"

  const code = String(subject.subjectCode || "").toUpperCase().trim()
  const name = String(subject.subjectName || "").toLowerCase().trim()

  if (code === "NLTD" || code === "EPT" || code === "TAV" || code === "TAVD") {
    return "KSDV"
  }
  if (
    code.startsWith("INT-") ||
    code.startsWith("INT_") ||
    code === "MAT" ||
    name.includes("cambridge") ||
    name.includes("ielts") ||
    name === "sat" ||
    name.includes("global studies") ||
    name.includes("library reading")
  ) {
    return "BILINGUAL"
  }
  if (
    code === "TLY" ||
    code === "GCX" ||
    code === "CD_CXXH" ||
    code === "STE" ||
    code === "STEM" ||
    code === "HNG" ||
    code === "TND" ||
    code === "TNH" ||
    name.includes("tâm lý") ||
    name.includes("tam ly") ||
    name.includes("cảm xúc xã hội") ||
    name.includes("cam xuc xa hoi") ||
    name.includes("stem") ||
    name.includes("trải nghiệm - dự án") ||
    name.includes("kỹ năng sống") ||
    name.includes("hành trình sky-line") ||
    name.includes("đặc thù") ||
    name.includes("tiếng nhật")
  ) {
    return "SKL"
  }

  return "MOET"
}

/**
 * Check if a subject in SSM belongs to Primary School (Tiểu học) for the given Grade (Khối 1..5)
 * strictly following CT GDPT 2018 & Thông tư 27/2020/TT-BGDĐT.
 */
export function isPrimarySubjectForGrade(
  subject: { subjectName?: string | null; subjectCode?: string | null; level?: string | null; category?: string | null } | null | undefined,
  grade?: string | null
): boolean {
  if (!subject) return false
  const name = String(subject.subjectName || "").toLowerCase().trim()
  const code = String(subject.subjectCode || "").toLowerCase().trim()
  const level = String(subject.level || "").toLowerCase().trim()
  const gradeNum = extractGradeNumber(grade) || 1

  if (gradeNum < 1 || gradeNum > 5) return true

  // Exclude THCS / THPT subjects
  if (
    name.includes("ngữ văn") ||
    name.includes("ngu van") ||
    code === "nva" ||
    name.includes("vật lí") ||
    name.includes("vật lý") ||
    name.includes("vat li") ||
    name.includes("vat ly") ||
    name.includes("hóa học") ||
    name.includes("hoa hoc") ||
    name.includes("sinh học") ||
    name.includes("sinh hoc") ||
    name.includes("khoa học tự nhiên") ||
    name.includes("khtn") ||
    name.includes("khoa học xã hội") ||
    name.includes("khxh") ||
    name.includes("công dân") ||
    name.includes("gdcd") ||
    name.includes("kinh tế") ||
    name.includes("pháp luật") ||
    name.includes("quốc phòng") ||
    name.includes("hướng nghiệp")
  ) {
    return false
  }

  // Tự nhiên và Xã hội: chỉ có ở Khối 1, 2, 3
  if (
    name.includes("tự nhiên và xã hội") ||
    name.includes("tu nhien va xa hoi") ||
    name.includes("tự nhiên & xã hội") ||
    name.includes("tn&xh") ||
    name.includes("tnxh") ||
    code.includes("tnxh")
  ) {
    return gradeNum <= 3
  }

  // Khoa học, Lịch sử và Địa lí: chỉ có ở Khối 4, 5
  if (
    name.includes("khoa học") ||
    name.includes("khoa hoc") ||
    name.includes("lịch sử") ||
    name.includes("lich su") ||
    name.includes("địa lí") ||
    name.includes("địa lý") ||
    name.includes("dia li") ||
    name.includes("dia ly")
  ) {
    return gradeNum >= 4
  }

  // Tin học và Công nghệ: bắt buộc từ Khối 3, 4, 5
  if (
    name.includes("tin học") ||
    name.includes("tin hoc") ||
    name.includes("công nghệ") ||
    name.includes("cong nghe")
  ) {
    return gradeNum >= 3
  }

  // Các môn Tiểu học xuyên suốt Khối 1..5
  if (
    name.includes("tiếng việt") ||
    name.includes("tieng viet") ||
    code === "tvi" ||
    name.includes("toán") ||
    name.includes("toan") ||
    code === "toa" ||
    isEnglishSubjectName(name) ||
    name.includes("ngoại ngữ") ||
    name.includes("ngoai ngu") ||
    name.includes("đạo đức") ||
    name.includes("dao duc") ||
    name.includes("âm nhạc") ||
    name.includes("am nhac") ||
    name.includes("mỹ thuật") ||
    name.includes("mĩ thuật") ||
    name.includes("my thuat") ||
    name.includes("mi thuat") ||
    name.includes("nghệ thuật") ||
    name.includes("nghe thuat") ||
    name.includes("thể chất") ||
    name.includes("the chat") ||
    name.includes("thể dục") ||
    name.includes("the duc") ||
    name.includes("gdtc") ||
    name.includes("trải nghiệm") ||
    name.includes("trai nghiem") ||
    name.includes("hđtn") ||
    name.includes("hdtn")
  ) {
    return true
  }

  return false
}

/**
 * Determine whether a Primary School (Tiểu học) subject has a periodic test score column (KT GK1/CK1/GK2/CK2)
 * on vnEdu according to Thông tư 27/2020/TT-BGDĐT:
 * - Toán, Tiếng Việt:
 *   + Khối 4, 5: Có KT ở cả GK1, CK1, GK2, CK2.
 *   + Khối 1, 2, 3: Có KT ở CK1, CK2 (và KSĐN nếu khảo sát điểm). Ở GK1, GK2 mặc định chỉ Nhận xét + XL (trừ khi trường cấu hình thêm KT).
 * - Khoa học, Lịch sử và Địa lí, Tin học và Công nghệ (Tin học, Công nghệ), Ngoại ngữ 1 (Tiếng Anh Khối 3, 4, 5):
 *   + Có KT ở CK1, CK2 (Cuối kỳ).
 *   + Không có KT ở GK1, GK2 (Giữa kỳ chỉ có Nhận xét + XL).
 * - Các môn đánh giá bằng nhận xét (Đạo đức, TN&XH, Âm nhạc, Mỹ thuật, GDTC, HĐTN, Tiếng Anh Khối 1-2):
 *   + Không có cột KT ở mọi kỳ (chỉ có Nhận xét + XL).
 */
export function shouldPrimarySubjectHaveKtColumn(
  subjectNameOrCode?: string | null,
  grade?: string | null,
  evaluationPeriod?: string | null
): boolean {
  const norm = String(subjectNameOrCode || "").toLowerCase().trim()
  const gradeNum = extractGradeNumber(grade) || 1
  const meta = getPrimaryPeriodMeta(evaluationPeriod)

  if (!norm) return !meta.isMidterm

  // Comment-only subjects in Primary School (TT27)
  if (
    norm.includes("đạo đức") ||
    norm.includes("dao duc") ||
    norm.includes("tự nhiên và xã hội") ||
    norm.includes("tu nhien va xa hoi") ||
    norm.includes("tnxh") ||
    norm.includes("tn&xh") ||
    norm.includes("âm nhạc") ||
    norm.includes("am nhac") ||
    norm.includes("mỹ thuật") ||
    norm.includes("mĩ thuật") ||
    norm.includes("my thuat") ||
    norm.includes("mi thuat") ||
    norm.includes("thể chất") ||
    norm.includes("the chat") ||
    norm.includes("thể dục") ||
    norm.includes("the duc") ||
    norm.includes("gdtc") ||
    norm.includes("trải nghiệm") ||
    norm.includes("trai nghiem") ||
    norm.includes("hđtn") ||
    norm.includes("hdtn") ||
    norm.includes("kỹ năng") ||
    norm.includes("ky nang")
  ) {
    return false
  }

  // Toán & Tiếng Việt
  if (
    norm.includes("toán") ||
    norm.includes("toan") ||
    norm.includes("tiếng việt") ||
    norm.includes("tieng viet") ||
    norm === "tvi" ||
    norm === "toa"
  ) {
    if (!meta.isMidterm) return true // CK1, CK2 always have KT
    return gradeNum >= 4 // Grade 4 & 5 have midterm KT GK1/GK2 by TT27
  }

  // Tiếng Anh / Ngoại ngữ Tiểu học
  if (isEnglishSubjectName(norm) || norm.includes("ngoại ngữ") || norm.includes("ngoai ngu")) {
    if (gradeNum <= 2) return false // Khối 1, 2: mặc định không có cột KT tự động
    return !meta.isMidterm // Khối 3, 4, 5: Cuối kỳ có KT CK1/CK2, Giữa kỳ chỉ có XL GK1/GK2 + Nhận xét
  }

  // Khoa học, Lịch sử & Địa lí, Tin học & Công nghệ
  if (
    norm.includes("khoa học") ||
    norm.includes("khoa hoc") ||
    norm.includes("lịch sử") ||
    norm.includes("lich su") ||
    norm.includes("địa lí") ||
    norm.includes("địa lý") ||
    norm.includes("dia li") ||
    norm.includes("tin học") ||
    norm.includes("tin hoc") ||
    norm.includes("công nghệ") ||
    norm.includes("cong nghe")
  ) {
    return !meta.isMidterm && gradeNum >= 3
  }

  return false
}

/**
 * Build a complete vnEdu Primary School (Tiểu học - TT27) SubjectGradeConfig object
 */
export function buildPrimaryVnEduDefaultConfig(params: {
  academicYearId?: string
  program?: string
  grade: string
  subjectId?: string | null
  subjectName?: string | null
  evaluationPeriod: string
  forceHasKt?: boolean
}) {
  const meta = getPrimaryPeriodMeta(params.evaluationPeriod)
  const hasKt =
    typeof params.forceHasKt === "boolean"
      ? params.forceHasKt
      : shouldPrimarySubjectHaveKtColumn(params.subjectName, params.grade, params.evaluationPeriod)

  const columns: GradeColumnDef[] = hasKt
    ? [
        {
          key: "col0",
          label: meta.ktColumnLabel,
          group: meta.isMidterm ? "GK" : "CK",
          attempt: 1,
          dataType: "NUMBER",
          scaleCode: "SCORE_10",
          maxScore: 10,
          allowedCodes: null,
          required: false,
          inputMode: "INPUT",
          order: 1,
          aliases: [
            meta.ktColumnLabel,
            meta.ktColumnLabel.replace(/\s+/g, ""),
            "KT",
            "Điểm KT",
            "Điểm KTĐK",
            "KTĐK",
          ],
        },
      ]
    : []

  return {
    id: null,
    academicYearId: params.academicYearId || "",
    program: params.program || "ALL",
    grade: params.grade,
    subjectId: params.subjectId || null,
    evaluationPeriod: params.evaluationPeriod,
    configType: "VNEDU" as GradeConfigType,
    columnCount: columns.length,
    columnNames: JSON.stringify(columns.map(c => c.label)),
    columnTypes: JSON.stringify(columns.map(c => c.scaleCode)),
    columnMaxScores: JSON.stringify(columns.map(c => c.maxScore || 10)),
    columnsJson: JSON.stringify(columns),
    hasCompositeColumn: false,
    compositeColumnName: "",
    hasRatingColumn: true,
    ratingColumnName: meta.xlColumnLabel,
    ratingScaleJson: JSON.stringify(["T", "H", "C"]),
    hasRemarkColumn: true,
    confirmationStatus: "CONFIRMED" as ConfigConfirmationStatus,
    version: 1,
    isPrimaryVnEduDefault: true,
  }
}

/**
 * Check if a grade or class string belongs to THCS (Khối 6..9) or THPT (Khối 10..12)
 */
export function isSecondaryOrHighGrade(gradeOrClassName?: string | null): boolean {
  const n = extractGradeNumber(gradeOrClassName)
  return n !== null && n >= 6 && n <= 12
}

/**
 * Check if a subject is evaluated by Comment-Only (Đạt / Chưa đạt — Đ / CĐ) in THCS & THPT
 * according to Điều 5 Thông tư 22/2021/TT-BGDĐT:
 * - Giáo dục thể chất (GDTC / Thể dục)
 * - Nghệ thuật (Âm nhạc, Mĩ thuật / Mỹ thuật)
 * - Hoạt động trải nghiệm, hướng nghiệp (HĐTN / HĐTN-HN)
 * - Nội dung giáo dục của địa phương (GDĐP)
 * (Lưu ý: Giáo dục quốc phòng và an ninh ở THPT đánh giá bằng Điểm số kết hợp Nhận xét!)
 */
export function isTt22CommentOnlySubject(subjectNameOrCode?: string | null): boolean {
  const norm = String(subjectNameOrCode || "").toLowerCase().trim()
  if (!norm) return false
  if (norm.includes("quốc phòng") || norm.includes("quoc phong") || norm.includes("gdqp")) {
    return false
  }
  return (
    norm.includes("thể chất") ||
    norm.includes("the chat") ||
    norm.includes("thể dục") ||
    norm.includes("the duc") ||
    norm === "gdtc" ||
    norm.includes("âm nhạc") ||
    norm.includes("am nhac") ||
    norm.includes("mỹ thuật") ||
    norm.includes("mĩ thuật") ||
    norm.includes("my thuat") ||
    norm.includes("mi thuat") ||
    norm.includes("nghệ thuật") ||
    norm.includes("nghe thuat") ||
    norm.includes("trải nghiệm") ||
    norm.includes("trai nghiem") ||
    norm.includes("hướng nghiệp") ||
    norm.includes("huong nghiep") ||
    norm.includes("hđtn") ||
    norm.includes("hdtn") ||
    norm.includes("địa phương") ||
    norm.includes("dia phuong") ||
    norm.includes("gdđp") ||
    norm.includes("gddp")
  )
}

/**
 * Check if a subject in SSM belongs to THCS (Khối 6..9) or THPT (Khối 10..12)
 * strictly following CT GDPT 2018 & Thông tư 22/2021/TT-BGDĐT.
 */
export function isSecondarySubjectForGrade(
  subject: { subjectName?: string | null; subjectCode?: string | null; level?: string | null } | null | undefined,
  grade?: string | null
): boolean {
  if (!subject) return false
  const name = String(subject.subjectName || "").toLowerCase().trim()
  const code = String(subject.subjectCode || "").toLowerCase().trim()
  const gradeNum = extractGradeNumber(grade) || 6

  if (gradeNum < 6 || gradeNum > 12) return true

  // Exclude Primary-only subjects
  if (
    name.includes("tiếng việt") ||
    name.includes("tieng viet") ||
    code === "tvi" ||
    name.includes("tự nhiên và xã hội") ||
    name.includes("tu nhien va xa hoi") ||
    name.includes("tn&xh") ||
    name.includes("tnxh") ||
    name.includes("đạo đức") ||
    name.includes("dao duc") ||
    (name === "khoa học" || name === "khoa hoc") // Tiểu học K4-5 (khác với Khoa học tự nhiên K6-9)
  ) {
    return false
  }

  // THCS (Khối 6..9) vs THPT (Khối 10..12) distinctions
  if (gradeNum >= 6 && gradeNum <= 9) {
    // Exclude THPT-only subjects
    if (
      name.includes("kinh tế và pháp luật") ||
      name.includes("kinh te va phap luat") ||
      name.includes("gdkt") ||
      name.includes("quốc phòng") ||
      name.includes("quoc phong") ||
      name.includes("gdqp")
    ) {
      return false
    }
  } else if (gradeNum >= 10 && gradeNum <= 12) {
    // Exclude THCS integrated subjects when at THPT
    if (
      name.includes("khoa học tự nhiên") ||
      name.includes("khoa hoc tu nhien") ||
      code === "khtn" ||
      name.includes("lịch sử và địa lí") ||
      name.includes("lịch sử & địa lí") ||
      name.includes("lich su va dia li") ||
      name.includes("giáo dục công dân") ||
      name.includes("giao duc cong dan") ||
      code === "gdcd"
    ) {
      return false
    }
  }

  // Standard THCS & THPT subjects per TT22
  if (
    name.includes("toán") ||
    name.includes("toan") ||
    code === "toa" ||
    name.includes("ngữ văn") ||
    name.includes("ngu van") ||
    code === "nva" ||
    isEnglishSubjectName(name) ||
    name.includes("ngoại ngữ") ||
    name.includes("ngoai ngu") ||
    name.includes("khoa học tự nhiên") ||
    name.includes("khtn") ||
    name.includes("vật lí") ||
    name.includes("vật lý") ||
    name.includes("vat li") ||
    name.includes("vat ly") ||
    name.includes("hóa học") ||
    name.includes("hoa hoc") ||
    name.includes("sinh học") ||
    name.includes("sinh hoc") ||
    name.includes("lịch sử") ||
    name.includes("lich su") ||
    name.includes("địa lí") ||
    name.includes("địa lý") ||
    name.includes("dia li") ||
    name.includes("công dân") ||
    name.includes("gdcd") ||
    name.includes("kinh tế") ||
    name.includes("pháp luật") ||
    name.includes("tin học") ||
    name.includes("tin hoc") ||
    name.includes("công nghệ") ||
    name.includes("cong nghe") ||
    name.includes("quốc phòng") ||
    name.includes("gdqp") ||
    isTt22CommentOnlySubject(name)
  ) {
    return true
  }

  return false
}

/**
 * Recommended number of ĐĐGtx columns per semester under Điều 6 Thông tư 22/2021/TT-BGDĐT:
 * - Comment-only subjects (GDTC, Nghệ thuật, HĐTN-HN, GDĐP): 2 TX columns (or up to 4 on vnEdu grid)
 * - Subjects > 70 periods/year (Toán, Ngữ văn, Tiếng Anh, KHTN, LS&ĐL): 4 TX columns (TX1..TX4)
 * - Subjects 36..70 periods/year (Vật lí, Hóa học, Sinh học, Lịch sử, Địa lí, GDCD, GDKT&PL, Tin học, Công nghệ, GDQP-AN): 3 TX columns (or 4 on vnEdu grid)
 */
export function getRecommendedTt22TxCount(subjectNameOrCode?: string | null): 2 | 3 | 4 {
  const norm = String(subjectNameOrCode || "").toLowerCase().trim()
  if (isTt22CommentOnlySubject(norm)) return 2
  if (
    norm.includes("toán") ||
    norm.includes("toan") ||
    norm.includes("ngữ văn") ||
    norm.includes("ngu van") ||
    isEnglishSubjectName(norm) ||
    norm.includes("ngoại ngữ") ||
    norm.includes("khoa học tự nhiên") ||
    norm.includes("khtn") ||
    norm.includes("lịch sử và địa lí") ||
    norm.includes("lịch sử & địa lí")
  ) {
    return 4
  }
  return 3
}

/**
 * Normalize THCS/THPT Comment-Only rating input (Đ / CĐ) on vnEdu:
 * - "1", "d", "đ", "đạt", "dat" -> "Đ"
 * - "0", "c", "cd", "cđ", "chưa đạt", "chua dat" -> "CĐ"
 */
export function normalizeTt22DatInput(raw: string): string {
  const trimmed = String(raw || "").trim()
  if (!trimmed) return ""
  const lower = trimmed.toLowerCase()
  if (lower === "1" || lower === "d" || lower === "đ" || lower === "đạt" || lower === "dat") {
    return "Đ"
  }
  if (lower === "0" || lower === "c" || lower === "cd" || lower === "cđ" || lower === "chưa đạt" || lower === "chua dat") {
    return "CĐ"
  }
  return trimmed.toUpperCase()
}

/**
 * Calculate THCS/THPT Semester Average (ĐTBmhk) or Rating (Mức ĐG) according to Điều 9 Thông tư 22/2021/TT-BGDĐT.
 * IMPORTANT vnEdu Rule: Only calculates ĐTBmhk after ĐĐGck (Cuối kỳ) has been entered!
 */
export function calculateTt22SemesterAverage(
  params: {
    txValues: Array<string | number | undefined | null>
    gkValue: string | number | undefined | null
    ckValue: string | number | undefined | null
  },
  isCommentOnly: boolean
): string {
  const ckRaw = String(params.ckValue ?? "").trim()
  if (!ckRaw) {
    // Ghi chú vnEdu: Sau khi có điểm thi học kỳ hệ thống mới tính Điểm TBHK của môn học
    return ""
  }

  if (isCommentOnly) {
    const ckNorm = normalizeTt22DatInput(ckRaw)
    if (ckNorm !== "Đ" && ckNorm !== "CĐ") return ""
    const gkNorm = normalizeTt22DatInput(String(params.gkValue ?? ""))
    const txNorms = params.txValues
      .map(v => normalizeTt22DatInput(String(v ?? "")))
      .filter(v => v === "Đ" || v === "CĐ")

    if (ckNorm === "CĐ") return "CĐ"
    if (gkNorm === "CĐ" && txNorms.filter(v => v === "Đ").length === 0) return "CĐ"
    const totalDat = txNorms.filter(v => v === "Đ").length + (gkNorm === "Đ" ? 1 : 0) + 1
    const totalAll = txNorms.length + (gkNorm ? 1 : 0) + 1
    return totalDat >= Math.ceil(totalAll / 2) ? "Đ" : "CĐ"
  }

  const ckNum = Number(ckRaw.replace(",", "."))
  const gkStr = String(params.gkValue ?? "").trim()
  if (!gkStr || isNaN(ckNum) || ckNum < 0 || ckNum > 10) return ""
  const gkNum = Number(gkStr.replace(",", "."))
  if (isNaN(gkNum) || gkNum < 0 || gkNum > 10) return ""

  const validTxNums: number[] = []
  for (const tv of params.txValues) {
    const s = String(tv ?? "").trim()
    if (!s) continue
    const n = Number(s.replace(",", "."))
    if (!isNaN(n) && n >= 0 && n <= 10) {
      validTxNums.push(n)
    }
  }

  if (validTxNums.length === 0) return ""

  const sumTx = validTxNums.reduce((a, b) => a + b, 0)
  const avg = (sumTx + 2 * gkNum + 3 * ckNum) / (validTxNums.length + 5)
  const rounded = Math.round((avg + Number.EPSILON) * 10) / 10
  return rounded.toFixed(1)
}

/**
 * Build a complete vnEdu THCS & THPT (Khối 6..12 - Thông tư 22/2021/TT-BGDĐT) SubjectGradeConfig object
 */
export function buildSecondaryTt22VnEduDefaultConfig(params: {
  academicYearId?: string
  program?: string
  grade: string
  subjectId?: string | null
  subjectName?: string | null
  evaluationPeriod: string
  forceCommentOnly?: boolean
  txColumnCount?: number
}) {
  const isCommentOnly =
    typeof params.forceCommentOnly === "boolean"
      ? params.forceCommentOnly
      : isTt22CommentOnlySubject(params.subjectName)

  const txCount = Math.min(4, Math.max(1, params.txColumnCount || 4))
  const periodUpper = String(params.evaluationPeriod || "HK1").toUpperCase().trim()

  // Cả năm (CN) structure on vnEdu (Image 4: TBHK 1 | TBHK 2 | TB Cả năm | Điểm thi lại | Ghi chú | Nhận xét)
  if (periodUpper === "CN") {
    const cnCols: GradeColumnDef[] = [
      {
        key: "col0",
        label: "TBHK 1",
        group: "OTHER",
        attempt: 1,
        dataType: isCommentOnly ? "RATING" : "NUMBER",
        scaleCode: isCommentOnly ? "RATING_DAT" : "SCORE_10",
        maxScore: isCommentOnly ? null : 10,
        allowedCodes: isCommentOnly ? ["Đ", "CĐ"] : null,
        required: false,
        inputMode: "INPUT",
        order: 1,
        aliases: ["TBHK 1", "TBHK1", "ĐTBmhkI", "HK1"],
      },
      {
        key: "col1",
        label: "TBHK 2",
        group: "OTHER",
        attempt: 2,
        dataType: isCommentOnly ? "RATING" : "NUMBER",
        scaleCode: isCommentOnly ? "RATING_DAT" : "SCORE_10",
        maxScore: isCommentOnly ? null : 10,
        allowedCodes: isCommentOnly ? ["Đ", "CĐ"] : null,
        required: false,
        inputMode: "INPUT",
        order: 2,
        aliases: ["TBHK 2", "TBHK2", "ĐTBmhkII", "HK2"],
      },
      {
        key: "col2",
        label: "Điểm thi lại",
        group: "OTHER",
        attempt: 3,
        dataType: isCommentOnly ? "RATING" : "NUMBER",
        scaleCode: isCommentOnly ? "RATING_DAT" : "SCORE_10",
        maxScore: isCommentOnly ? null : 10,
        allowedCodes: isCommentOnly ? ["Đ", "CĐ"] : null,
        required: false,
        inputMode: "INPUT",
        order: 3,
        aliases: ["Điểm thi lại", "Thi lại"],
      },
      {
        key: "col3",
        label: "Ghi chú",
        group: "OTHER",
        attempt: 4,
        dataType: "TEXT",
        scaleCode: "TEXT",
        maxScore: null,
        allowedCodes: null,
        required: false,
        inputMode: "INPUT",
        order: 4,
        aliases: ["Ghi chú"],
      },
    ]

    return {
      id: null,
      academicYearId: params.academicYearId || "",
      program: params.program || "ALL",
      grade: params.grade,
      subjectId: params.subjectId || null,
      evaluationPeriod: params.evaluationPeriod,
      configType: "VNEDU" as GradeConfigType,
      columnCount: cnCols.length,
      columnNames: JSON.stringify(cnCols.map(c => c.label)),
      columnTypes: JSON.stringify(cnCols.map(c => c.scaleCode)),
      columnMaxScores: JSON.stringify(cnCols.map(c => c.maxScore || 10)),
      columnsJson: JSON.stringify(cnCols),
      hasCompositeColumn: true,
      compositeColumnName: "TB Cả năm",
      hasRatingColumn: false,
      ratingColumnName: "",
      ratingScaleJson: JSON.stringify(["Đ", "CĐ"]),
      hasRemarkColumn: true,
      confirmationStatus: "CONFIRMED" as ConfigConfirmationStatus,
      formula: "WEIGHTED",
      weights: JSON.stringify([1, 2, 0, 0]),
      roundingRule: "ROUND_1",
      version: 1,
      isSecondaryTt22Default: true,
      isTt22CommentOnly: isCommentOnly,
    }
  }

  // Standard Semester structure on vnEdu (Images 2 & 3: TX1..TX4 | ĐĐGgk | ĐĐGck | ĐTBmhk | Nhận xét)
  const columns: GradeColumnDef[] = []
  for (let i = 1; i <= txCount; i++) {
    columns.push({
      key: `col${i - 1}`,
      label: `TX${i}`,
      group: "TX",
      attempt: i,
      dataType: isCommentOnly ? "RATING" : "NUMBER",
      scaleCode: isCommentOnly ? "RATING_DAT" : "SCORE_10",
      maxScore: isCommentOnly ? null : 10,
      allowedCodes: isCommentOnly ? ["Đ", "CĐ"] : null,
      required: false,
      inputMode: "INPUT",
      order: i,
      aliases: [`TX${i}`, `ĐĐGtx${i}`, `DDGtx${i}`, `Lần ${i}`],
    })
  }

  columns.push({
    key: `col${txCount}`,
    label: "ĐĐGgk",
    group: "GK",
    attempt: 1,
    dataType: isCommentOnly ? "RATING" : "NUMBER",
    scaleCode: isCommentOnly ? "RATING_DAT" : "SCORE_10",
    maxScore: isCommentOnly ? null : 10,
    allowedCodes: isCommentOnly ? ["Đ", "CĐ"] : null,
    required: false,
    inputMode: "INPUT",
    order: txCount + 1,
    aliases: ["ĐĐGgk", "DDGgk", "GK", "GK1", "GK2", "KT GK1", "KT GK2", "Điểm GK"],
  })

  columns.push({
    key: `col${txCount + 1}`,
    label: "ĐĐGck",
    group: "CK",
    attempt: 1,
    dataType: isCommentOnly ? "RATING" : "NUMBER",
    scaleCode: isCommentOnly ? "RATING_DAT" : "SCORE_10",
    maxScore: isCommentOnly ? null : 10,
    allowedCodes: isCommentOnly ? ["Đ", "CĐ"] : null,
    required: false,
    inputMode: "INPUT",
    order: txCount + 2,
    aliases: ["ĐĐGck", "DDGck", "CK", "CK1", "CK2", "KT CK1", "KT CK2", "Điểm CK"],
  })

  const weights = [...Array(txCount).fill(1), 2, 3]

  return {
    id: null,
    academicYearId: params.academicYearId || "",
    program: params.program || "ALL",
    grade: params.grade,
    subjectId: params.subjectId || null,
    evaluationPeriod: params.evaluationPeriod,
    configType: "VNEDU" as GradeConfigType,
    columnCount: columns.length,
    columnNames: JSON.stringify(columns.map(c => c.label)),
    columnTypes: JSON.stringify(columns.map(c => c.scaleCode)),
    columnMaxScores: JSON.stringify(columns.map(c => c.maxScore || 10)),
    columnsJson: JSON.stringify(columns),
    hasCompositeColumn: true,
    compositeColumnName: "ĐTBmhk",
    hasRatingColumn: false,
    ratingColumnName: "",
    ratingScaleJson: isCommentOnly ? JSON.stringify(["Đ", "CĐ"]) : null,
    hasRemarkColumn: true,
    confirmationStatus: "CONFIRMED" as ConfigConfirmationStatus,
    formula: "WEIGHTED",
    weights: JSON.stringify(weights),
    roundingRule: "ROUND_1",
    version: 1,
    isSecondaryTt22Default: true,
    isTt22CommentOnly: isCommentOnly,
  }
}

/**
 * Check if a subject is English (Tiếng Anh)
 */
export function isEnglishSubjectName(nameOrCode?: string | null): boolean {
  if (!nameOrCode) return false
  const norm = String(nameOrCode).toLowerCase().trim()
  return norm.includes("tiếng anh") || norm.includes("tieng anh") || norm === "anh" || norm === "english" || norm === "ta"
}

/**
 * Primary English special rules (Section 3):
 * - Grade 3 GK1 (vnEdu): No KT GK1, No composite score, HAS XL GK1, HAS Nhận xét giữa kỳ.
 * - Grade 1 & 2 (vnEdu): Must be explicitly confirmed; default is UNCONFIRMED ("Chưa xác nhận cấu hình vnEdu") with 0 score columns.
 */
export function getPrimaryEnglishVnEduPreset(grade: string, evaluationPeriod: string): {
  isSpecialCase: boolean
  confirmationStatus: ConfigConfirmationStatus
  statusMessage?: string
  columns: GradeColumnDef[]
  hasCompositeColumn: boolean
  hasRatingColumn: boolean
  ratingColumnName: string
  ratingScaleJson: string
  hasRemarkColumn: boolean
  compositeColumnName: string
} | null {
  const gradeNum = extractGradeNumber(grade)
  const period = String(evaluationPeriod || "").toUpperCase().trim()

  if (gradeNum === 3 && (period === "GK1" || period === "GIUA_KY_1")) {
    const columns: GradeColumnDef[] = [
      {
        key: "xl_gk1",
        label: "XL GK1",
        group: "RATING",
        attempt: 1,
        dataType: "RATING",
        scaleCode: "RATING_TT27",
        maxScore: null,
        allowedCodes: ["T", "H", "C", "HTT", "HT", "CHT", "Đ", "CĐ"],
        required: false,
        inputMode: "INPUT",
        order: 1,
        aliases: ["XL GK1", "Xếp loại GK1", "Xếp loại", "XL", "Mức đạt được"],
      },
      {
        key: "nhan_xet",
        label: "Nhận xét giữa kỳ",
        group: "REMARK",
        attempt: 1,
        dataType: "TEXT",
        scaleCode: "TEXT",
        maxScore: null,
        allowedCodes: null,
        required: false,
        inputMode: "INPUT",
        order: 2,
        aliases: ["Nhận xét", "Nhận xét giữa kỳ", "Nhận xét GK1", "NX"],
      },
    ]
    return {
      isSpecialCase: true,
      confirmationStatus: "CONFIRMED",
      statusMessage: "Đặc thù Tiếng Anh Khối 3 - GK1: Không có điểm kiểm tra/tổng hợp GK1; chỉ có XL GK1 và Nhận xét giữa kỳ.",
      columns,
      hasCompositeColumn: false,
      hasRatingColumn: true,
      ratingColumnName: "XL GK1",
      ratingScaleJson: JSON.stringify(["T", "H", "C", "HTT", "HT", "CHT", "Đ", "CĐ"]),
      hasRemarkColumn: true,
      compositeColumnName: "",
    }
  }

  if (gradeNum === 1 || gradeNum === 2) {
    return {
      isSpecialCase: true,
      confirmationStatus: "UNCONFIRMED",
      statusMessage: "Chưa xác nhận cấu hình vnEdu",
      columns: [],
      hasCompositeColumn: false,
      hasRatingColumn: false,
      ratingColumnName: "Xếp loại",
      ratingScaleJson: JSON.stringify(["T", "H", "C", "Đ", "CĐ"]),
      hasRemarkColumn: true,
      compositeColumnName: "",
    }
  }

  return null
}

/**
 * Parse columnsJson or fallback to legacy columnNames/columnTypes/columnMaxScores
 */
export function normalizeGradeColumnDefs(config: {
  columnsJson?: string | null
  columnCount?: number
  columnNames?: string | string[] | null
  columnTypes?: string | string[] | null
  columnMaxScores?: string | number[] | null
  hasCompositeColumn?: boolean
  compositeColumnName?: string | null
  hasRatingColumn?: boolean
  ratingColumnName?: string | null
  ratingScaleJson?: string | null
  hasRemarkColumn?: boolean
} | null): GradeColumnDef[] {
  if (!config) return []

  if (config.columnsJson) {
    try {
      const parsed = typeof config.columnsJson === "string" ? JSON.parse(config.columnsJson) : config.columnsJson
      if (Array.isArray(parsed)) {
        const defs: GradeColumnDef[] = parsed.map((c: any, idx: number) => ({
          key: String(c.key || `col${idx}`),
          label: String(c.label || `Cột ${idx + 1}`),
          group: (c.group || "TX") as GradeColumnGroup,
          attempt: c.attempt ?? null,
          dataType: (c.dataType || "NUMBER") as GradeColumnDataType,
          scaleCode: String(c.scaleCode || (c.dataType === "RATING" ? "RATING_DAT" : c.dataType === "TEXT" ? "TEXT" : "SCORE_10")),
          maxScore: c.dataType === "NUMBER" ? (Number(c.maxScore) || 10) : null,
          allowedCodes: Array.isArray(c.allowedCodes) ? c.allowedCodes : null,
          required: Boolean(c.required),
          inputMode: (c.inputMode || "INPUT") as GradeColumnInputMode,
          order: typeof c.order === "number" ? c.order : idx + 1,
          aliases: Array.isArray(c.aliases) ? c.aliases : [String(c.label || "")].filter(Boolean),
        })).sort((a, b) => a.order - b.order)

        if (config.hasRatingColumn === true && !defs.some(d => d.group === "RATING" || d.key === "ratingValue")) {
          let ratingCodes = DEFAULT_RATING_CODES_TT27
          if (config.ratingScaleJson) {
            try {
              const pScale = typeof config.ratingScaleJson === "string" ? JSON.parse(config.ratingScaleJson) : config.ratingScaleJson
              if (Array.isArray(pScale) && pScale.length > 0) ratingCodes = pScale
            } catch {}
          }
          defs.push({
            key: "ratingValue",
            label: config.ratingColumnName || "Xếp loại",
            group: "RATING",
            attempt: null,
            dataType: "RATING",
            scaleCode: "RATING_TT27",
            maxScore: null,
            allowedCodes: ratingCodes,
            required: false,
            inputMode: "INPUT",
            order: defs.length + 1,
            aliases: [config.ratingColumnName || "Xếp loại", "XL", "XL GK1", "XL CK1", "XL GK2", "XL CK2", "Mức đạt được"],
          })
        }

        if (config.hasRemarkColumn === true && !defs.some(d => d.group === "REMARK" || d.key === "remark")) {
          defs.push({
            key: "remark",
            label: "Nhận xét",
            group: "REMARK",
            attempt: null,
            dataType: "TEXT",
            scaleCode: "TEXT",
            maxScore: null,
            allowedCodes: null,
            required: false,
            inputMode: "INPUT",
            order: defs.length + 1,
            aliases: ["Nhận xét", "Nhận xét giữa kỳ", "Nhận xét cuối kỳ", "NX"],
          })
        }

        return defs
      }
    } catch {
      // fallback to legacy fields below
    }
  }

  let names: string[] = []
  try {
    names = Array.isArray(config.columnNames)
      ? config.columnNames
      : JSON.parse(config.columnNames || "[]")
  } catch {
    names = []
  }

  let types: string[] = []
  try {
    types = Array.isArray(config.columnTypes)
      ? config.columnTypes
      : JSON.parse(config.columnTypes || "[]")
  } catch {
    types = []
  }

  let maxScores: number[] = []
  try {
    maxScores = Array.isArray(config.columnMaxScores)
      ? config.columnMaxScores.map(Number)
      : JSON.parse(config.columnMaxScores || "[]").map(Number)
  } catch {
    maxScores = []
  }

  const count = typeof config.columnCount === "number" ? config.columnCount : names.length
  const defs: GradeColumnDef[] = []

  for (let i = 0; i < count; i++) {
    const label = names[i] || `Cột ${i + 1}`
    const t = types[i] || "SCORE_10"
    const isRating = t.startsWith("RATING") || t === "DAT_CHUADAT" || t === "T_H_C"
    const maxScore = isRating ? null : (maxScores[i] > 0 ? maxScores[i] : t === "SCORE_100" ? 100 : 10)
    const upperLabel = label.toUpperCase()
    const group: GradeColumnGroup = upperLabel.includes("GK")
      ? "GK"
      : upperLabel.includes("CK")
      ? "CK"
      : upperLabel.includes("XL") || upperLabel.includes("XẾP LOẠI")
      ? "RATING"
      : "TX"

    defs.push({
      key: `col${i}`,
      label,
      group,
      attempt: i + 1,
      dataType: isRating ? "RATING" : "NUMBER",
      scaleCode: isRating ? t : `SCORE_${maxScore}`,
      maxScore,
      allowedCodes: isRating ? DEFAULT_RATING_CODES_TT27 : null,
      required: false,
      inputMode: "INPUT",
      order: i + 1,
      aliases: [label],
    })
  }

  if (config.hasRatingColumn) {
    let ratingCodes = DEFAULT_RATING_CODES_TT27
    if (config.ratingScaleJson) {
      try {
        const parsed = JSON.parse(config.ratingScaleJson)
        if (Array.isArray(parsed) && parsed.length > 0) ratingCodes = parsed
      } catch {}
    }
    defs.push({
      key: "ratingValue",
      label: config.ratingColumnName || "Xếp loại",
      group: "RATING",
      attempt: null,
      dataType: "RATING",
      scaleCode: "RATING_TT27",
      maxScore: null,
      allowedCodes: ratingCodes,
      required: false,
      inputMode: "INPUT",
      order: defs.length + 1,
      aliases: [config.ratingColumnName || "Xếp loại", "XL", "XL GK1", "XL CK1", "Mức đạt được"],
    })
  }

  if (config.hasRemarkColumn !== false) {
    defs.push({
      key: "remark",
      label: "Nhận xét",
      group: "REMARK",
      attempt: null,
      dataType: "TEXT",
      scaleCode: "TEXT",
      maxScore: null,
      allowedCodes: null,
      required: false,
      inputMode: "INPUT",
      order: defs.length + 1,
      aliases: ["Nhận xét", "Nhận xét giữa kỳ", "Nhận xét cuối kỳ", "NX"],
    })
  }

  return defs
}

/**
 * Validate a cell value against a GradeColumnDef.
 * Note: 0 is valid! "Đ" is never converted to a number!
 */
export function validateColumnValue(
  rawValue: unknown,
  colDef: GradeColumnDef
): { valid: boolean; normalized: string | number | null; error?: string } {
  if (rawValue === undefined || rawValue === null) {
    return { valid: true, normalized: null }
  }
  const str = String(rawValue).trim()
  if (str === "") {
    return { valid: true, normalized: null }
  }

  if (colDef.dataType === "NUMBER") {
    const cleaned = str.replace(",", ".")
    if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
      return {
        valid: false,
        normalized: null,
        error: `Cột "${colDef.label}" yêu cầu điểm số, không hợp lệ với giá trị "${str}"`,
      }
    }
    const num = Number(cleaned)
    const maxScore = colDef.maxScore ?? 10
    if (isNaN(num) || num < 0 || num > maxScore) {
      return {
        valid: false,
        normalized: null,
        error: `Cột "${colDef.label}" phải nằm trong thang 0–${maxScore} (nhận "${str}")`,
      }
    }
    return { valid: true, normalized: num }
  }

  if (colDef.dataType === "RATING") {
    const norm = normalizeRatingCode(str)
    const allowed = colDef.allowedCodes && colDef.allowedCodes.length > 0
      ? colDef.allowedCodes.map(c => c.toUpperCase())
      : DEFAULT_RATING_CODES_TT27
    if (!allowed.includes(norm.toUpperCase())) {
      return {
        valid: false,
        normalized: null,
        error: `Cột "${colDef.label}" chỉ nhận mã mức (${allowed.join(", ")}), không hợp lệ với "${str}"`,
      }
    }
    return { valid: true, normalized: norm }
  }

  return { valid: true, normalized: str.slice(0, 1000) }
}

/**
 * Resolve best matching SubjectGradeConfig strictly by scope (never substituting a similar subject or grade).
 */
export function resolveGradeConfigForScope<T extends {
  academicYearId: string
  program?: string | null
  grade: string
  subjectId?: string | null
  evaluationPeriod: string
  configType?: string | null
  isActive?: boolean | null
}>(
  configs: T[],
  scope: {
    academicYearId: string
    program?: string | null
    grade: string
    subjectId: string
    evaluationPeriod: string
    configType?: GradeConfigType
  }
): T | null {
  const isKsdn = isKsdnEvaluationPeriod(scope.evaluationPeriod)
  // Kỳ Khảo sát đầu năm (KSĐN) luôn lấy cấu hình các môn theo "2. Đánh giá nội bộ Sky-Line" (INTERNAL)
  const targetType: GradeConfigType = isKsdn ? "INTERNAL" : (scope.configType || "INTERNAL")
  const targetProgram = (scope.program || "ALL").trim()
  const gradeNum = extractGradeNumber(scope.grade)
  const isG6Ksdn = isGrade6KsdnScope(scope.grade, scope.evaluationPeriod)
  const gradeCandidates = new Set<string>([
    scope.grade.trim(),
    gradeNum !== null ? `Khối ${gradeNum}` : "",
    gradeNum !== null ? `Khoi ${gradeNum}` : "",
    gradeNum !== null ? String(gradeNum) : "",
  ].filter(Boolean))
  const grade5Candidates = new Set<string>(["Khối 5", "Khoi 5", "5"])

  const activePool = configs.filter(c =>
    c.academicYearId === scope.academicYearId &&
    c.isActive !== false &&
    (c.configType || "INTERNAL") === targetType
  )

  const matchGrade = (cGrade: string, allowAll: boolean) => {
    const g = (cGrade || "").trim()
    if (allowAll && g === "ALL") return true
    return gradeCandidates.has(g)
  }

  const matchGrade5Fallback = (cGrade: string) => {
    const g = (cGrade || "").trim()
    return grade5Candidates.has(g)
  }

  const matchProgram = (cProg?: string | null, allowAll = false) => {
    const p = (cProg || "ALL").trim()
    if (allowAll && p === "ALL") return true
    return p === targetProgram
  }

  const matchPeriod = (cPeriod: string) => {
    if (isKsdn) return isKsdnEvaluationPeriod(cPeriod)
    return cPeriod === scope.evaluationPeriod
  }

  // Strict priority order: exact subjectId first, then general (subjectId == null) only for INTERNAL
  const priorities: Array<(c: T) => boolean> = [
    c => c.subjectId === scope.subjectId && matchProgram(c.program, false) && matchGrade(c.grade, false) && matchPeriod(c.evaluationPeriod),
    c => c.subjectId === scope.subjectId && matchProgram(c.program, true) && matchGrade(c.grade, false) && matchPeriod(c.evaluationPeriod),
    c => c.subjectId === scope.subjectId && matchProgram(c.program, false) && matchGrade(c.grade, false) && c.evaluationPeriod === "ALL",
    c => c.subjectId === scope.subjectId && matchProgram(c.program, true) && matchGrade(c.grade, false) && c.evaluationPeriod === "ALL",
  ]

  // Với Khối 6 KSĐN: các môn khảo sát lấy ở Tiểu học của Khối 5
  if (isG6Ksdn) {
    priorities.push(
      c => c.subjectId === scope.subjectId && matchProgram(c.program, false) && matchGrade5Fallback(c.grade) && matchPeriod(c.evaluationPeriod),
      c => c.subjectId === scope.subjectId && matchProgram(c.program, true) && matchGrade5Fallback(c.grade) && matchPeriod(c.evaluationPeriod),
      c => c.subjectId === scope.subjectId && matchProgram(c.program, false) && matchGrade5Fallback(c.grade) && c.evaluationPeriod === "ALL",
      c => c.subjectId === scope.subjectId && matchProgram(c.program, true) && matchGrade5Fallback(c.grade) && c.evaluationPeriod === "ALL",
      c => c.subjectId === scope.subjectId && matchProgram(c.program, true) && matchGrade5Fallback(c.grade),
    )
  }

  if (isKsdn) {
    // Allow fallback to any INTERNAL config of the same subject in the grade (e.g., GK1 config of Tiếng Việt in Khối 5)
    priorities.push(
      c => c.subjectId === scope.subjectId && matchProgram(c.program, true) && matchGrade(c.grade, false),
    )
  }

  priorities.push(
    c => c.subjectId === scope.subjectId && matchProgram(c.program, true) && matchGrade(c.grade, true) && matchPeriod(c.evaluationPeriod),
    c => c.subjectId === scope.subjectId && matchProgram(c.program, true) && matchGrade(c.grade, true) && c.evaluationPeriod === "ALL",
  )

  // For INTERNAL configs, allow fallback to general template (subjectId === null)
  if (targetType === "INTERNAL") {
    priorities.push(
      c => !c.subjectId && matchProgram(c.program, true) && matchGrade(c.grade, false) && matchPeriod(c.evaluationPeriod),
      c => !c.subjectId && matchProgram(c.program, true) && matchGrade(c.grade, false) && c.evaluationPeriod === "ALL",
    )
    if (isG6Ksdn) {
      priorities.push(
        c => !c.subjectId && matchProgram(c.program, true) && matchGrade5Fallback(c.grade) && matchPeriod(c.evaluationPeriod),
        c => !c.subjectId && matchProgram(c.program, true) && matchGrade5Fallback(c.grade) && c.evaluationPeriod === "ALL",
      )
    }
    priorities.push(
      c => !c.subjectId && matchProgram(c.program, true) && matchGrade(c.grade, true) && matchPeriod(c.evaluationPeriod),
      c => !c.subjectId && matchProgram(c.program, true) && matchGrade(c.grade, true) && c.evaluationPeriod === "ALL",
    )
  }

  for (const pred of priorities) {
    const found = activePool.find(pred)
    if (found) return found
  }

  return null
}
