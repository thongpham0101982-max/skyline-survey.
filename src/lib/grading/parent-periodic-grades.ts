import {
  calculateTt22SemesterAverage,
  getSubjectCurriculumGroup,
  isKsdnEvaluationPeriod,
  isPrimaryGrade,
  isTt22CommentOnlySubject,
  normalizePrimaryXlInput,
  normalizeTt22DatInput,
  type SubjectCurriculumGroup,
} from "@/lib/grading/vnedu-config-types"

export type ParentGradeDisplayMode = "KSDN" | "MIDTERM" | "ENDTERM"
export type ParentSubjectGroup = "MOET" | "SPECIAL"

export interface ParentPeriodLookup {
  normalizedCode: "KSĐN" | "GK1" | "CK1" | "GK2" | "CK2"
  displayMode: ParentGradeDisplayMode
  semester: 1 | 2
  /** Evaluation periods to query from SubjectGradeConfig (includes ALL) */
  configPeriods: string[]
  /** Evaluation periods to query from SubjectGradeEntry (primary + fallback GK for endterm) */
  entryPeriods: string[]
  /** Preferred exact/semester periods for the primary entry */
  primaryPeriods: string[]
  /** Midterm periods used only to backfill ĐĐGgk when viewing CK1/CK2 */
  midtermFallbackPeriods: string[]
}

export interface RawSubjectGradeEntry {
  subjectId: string
  evaluationPeriod: string
  configType?: string | null
  componentScores?: string | Record<string, unknown> | null
  compositeScore?: number | null
  ratingValue?: string | null
  remark?: string | null
  updatedAt?: Date | string | null
}

export interface RawSubjectGradeConfig {
  subjectId?: string | null
  evaluationPeriod?: string | null
  configType?: string | null
  columnNames?: string | string[] | null
  columnsJson?: string | Array<{ key?: string; label?: string; group?: string }> | null
  compositeColumnName?: string | null
  hasRatingColumn?: boolean | null
}

export interface RawSubjectRecord {
  id: string
  subjectName?: string | null
  subjectCode?: string | null
  name?: string | null
  code?: string | null
  category?: string | null
  evaluationType?: string | null
  orderIndex?: number | null
}

export interface PeriodicGradeValue {
  /** Raw display text (e.g. "8.5", "Đ", "CĐ", "T", "H", "C", "Tốt") or null if empty */
  display: string | null
  /** Numeric value when applicable, else null */
  numeric: number | null
  /** Semantic badge tier: good | fair | avg | weak | pass | fail | empty */
  badge: "good" | "fair" | "avg" | "weak" | "pass" | "fail" | "empty"
}

export interface ParentPeriodicSubjectRow {
  id: string
  stt: number
  name: string
  code: string
  subjectGroup: ParentSubjectGroup
  curriculumGroup: SubjectCurriculumGroup
  isSpecialSubject: boolean
  isCommentOnly: boolean
  /** Backward-compatible primary score for KSĐN / GK1 / GK2 */
  score: number | null
  scoreDisplay: string | null
  scoreBadge: string
  /** Periodic assessment columns only (NO ĐĐGtx / TX1..TX4) */
  ddgGk: PeriodicGradeValue
  ddgCk: PeriodicGradeValue
  dtbMhk: PeriodicGradeValue
  /** Special subject periodic/summary column when applicable */
  specialScore: PeriodicGradeValue
  remark: string
  source: "VNEDU" | "INTERNAL" | "SPECIAL_MODULE" | "CTQT" | "EMPTY"
}

export function resolveParentPeriodLookup(rawPeriod?: string | null): ParentPeriodLookup {
  const p = String(rawPeriod || "KSĐN").toUpperCase().trim()
  if (isKsdnEvaluationPeriod(p)) {
    return {
      normalizedCode: "KSĐN",
      displayMode: "KSDN",
      semester: 1,
      configPeriods: ["KSĐN", "KSDN", "ALL"],
      entryPeriods: ["KSĐN", "KSDN"],
      primaryPeriods: ["KSĐN", "KSDN"],
      midtermFallbackPeriods: [],
    }
  }
  if (p === "GK1" || p === "GIUA_KY_1") {
    return {
      normalizedCode: "GK1",
      displayMode: "MIDTERM",
      semester: 1,
      configPeriods: ["GK1", "GIUA_KY_1", "HK1", "ALL"],
      entryPeriods: ["GK1", "GIUA_KY_1", "HK1"],
      primaryPeriods: ["GK1", "GIUA_KY_1", "HK1"],
      midtermFallbackPeriods: [],
    }
  }
  if (p === "CK1" || p === "CUOI_KY_1" || p === "HK1" || p === "HOC_KY_1") {
    return {
      normalizedCode: "CK1",
      displayMode: "ENDTERM",
      semester: 1,
      configPeriods: ["CK1", "CUOI_KY_1", "HK1", "GK1", "ALL"],
      entryPeriods: ["CK1", "CUOI_KY_1", "HK1", "GK1", "GIUA_KY_1"],
      primaryPeriods: ["CK1", "CUOI_KY_1", "HK1"],
      midtermFallbackPeriods: ["GK1", "GIUA_KY_1"],
    }
  }
  if (p === "GK2" || p === "GIUA_KY_2") {
    return {
      normalizedCode: "GK2",
      displayMode: "MIDTERM",
      semester: 2,
      configPeriods: ["GK2", "GIUA_KY_2", "HK2", "ALL"],
      entryPeriods: ["GK2", "GIUA_KY_2", "HK2"],
      primaryPeriods: ["GK2", "GIUA_KY_2", "HK2"],
      midtermFallbackPeriods: [],
    }
  }
  // CK2 / CUOI_KY_2 / HK2
  return {
    normalizedCode: "CK2",
    displayMode: "ENDTERM",
    semester: 2,
    configPeriods: ["CK2", "CUOI_KY_2", "HK2", "GK2", "ALL"],
    entryPeriods: ["CK2", "CUOI_KY_2", "HK2", "GK2", "GIUA_KY_2"],
    primaryPeriods: ["CK2", "CUOI_KY_2", "HK2"],
    midtermFallbackPeriods: ["GK2", "GIUA_KY_2"],
  }
}

export function parseComponentScores(raw: string | Record<string, unknown> | null | undefined): Record<string, string> {
  if (!raw) return {}
  let obj: unknown = raw
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw)
    } catch {
      return {}
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v !== null && v !== undefined && String(v).trim() !== "") {
      out[k] = String(v).trim()
    }
  }
  return out
}

function parseColumnNames(cfg?: RawSubjectGradeConfig | null): string[] {
  if (!cfg?.columnNames) return []
  if (Array.isArray(cfg.columnNames)) return cfg.columnNames.map(c => String(c || ""))
  try {
    const parsed = JSON.parse(cfg.columnNames)
    return Array.isArray(parsed) ? parsed.map(c => String(c || "")) : []
  } catch {
    return []
  }
}

function parseNumericScore(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  const str = String(raw).trim().replace(",", ".")
  if (!str) return null
  const num = Number(str)
  return Number.isFinite(num) ? num : null
}

function formatNumberDisplay(num: number): string {
  // Keep 1 decimal place for standard 10-point scores, or integer if >= 10 and whole
  if (num > 10 && Number.isInteger(num)) return String(num)
  return num.toFixed(1)
}

export function buildPeriodicGradeValue(
  raw: string | number | null | undefined,
  opts?: { isCommentOnly?: boolean; isPrimary?: boolean }
): PeriodicGradeValue {
  if (raw === null || raw === undefined || String(raw).trim() === "") {
    return { display: null, numeric: null, badge: "empty" }
  }
  const str = String(raw).trim()

  if (opts?.isCommentOnly) {
    if (opts.isPrimary) {
      const xl = normalizePrimaryXlInput(str)
      if (xl === "T" || xl === "HTT") return { display: "T", numeric: null, badge: "good" }
      if (xl === "H" || xl === "HT") return { display: "H", numeric: null, badge: "pass" }
      if (xl === "C" || xl === "CHT") return { display: "C", numeric: null, badge: "fail" }
    }
    const dat = normalizeTt22DatInput(str)
    if (dat === "Đ") return { display: "Đ", numeric: null, badge: "pass" }
    if (dat === "CĐ") return { display: "CĐ", numeric: null, badge: "fail" }
  }

  const num = parseNumericScore(str)
  if (num !== null) {
    // Normalize 100-scale badge check vs 10-scale
    const scale10 = num > 10 ? num / 10 : num
    let badge: PeriodicGradeValue["badge"] = "weak"
    if (scale10 >= 8.0) badge = "good"
    else if (scale10 >= 6.5) badge = "fair"
    else if (scale10 >= 5.0) badge = "avg"
    return {
      display: formatNumberDisplay(num),
      numeric: num,
      badge,
    }
  }

  // Qualitative / Special subject rating labels (TOT, DAT, CHUA_DAT, T, H, C, Đ, CĐ)
  const upper = str.toUpperCase()
  if (["TOT", "TỐT", "T", "HTT", "E"].includes(upper)) {
    return { display: upper === "TOT" ? "Tốt" : str, numeric: null, badge: "good" }
  }
  if (["DAT", "ĐẠT", "Đ", "H", "HT", "KHA", "KHÁ", "S"].includes(upper)) {
    return { display: upper === "DAT" ? "Đạt" : upper === "KHA" ? "Khá" : str, numeric: null, badge: "pass" }
  }
  if (["CHUA_DAT", "CHƯA ĐẠT", "CĐ", "C", "CHT", "U", "N"].includes(upper)) {
    return { display: upper === "CHUA_DAT" ? "Chưa đạt" : str, numeric: null, badge: "fail" }
  }

  return { display: str, numeric: null, badge: "pass" }
}

function findColumnValueByLabel(
  comp: Record<string, string>,
  colNames: string[],
  matcher: (labelLower: string) => boolean
): string | null {
  for (let i = 0; i < colNames.length; i++) {
    const lbl = colNames[i].toLowerCase().trim()
    if (matcher(lbl)) {
      const val = comp[`col${i}`]
      if (val !== undefined && val !== "") return val
    }
  }
  return null
}

function hasRegularAssessmentKeys(comp: Record<string, string>): boolean {
  return Boolean(
    comp.tx1 !== undefined ||
      comp.tx2 !== undefined ||
      comp.tx3 !== undefined ||
      comp.tx4 !== undefined ||
      comp.gk !== undefined ||
      comp.ck !== undefined
  )
}

/**
 * Extract ONLY ĐĐGgk from a SubjectGradeEntry (never TX1..TX4).
 */
export function extractDdgGkRaw(
  entry: RawSubjectGradeEntry | null | undefined,
  cfg: RawSubjectGradeConfig | null | undefined,
  isPrimary: boolean
): string | null {
  if (!entry) return null
  const comp = parseComponentScores(entry.componentScores)
  const colNames = parseColumnNames(cfg)

  // 1. Explicit vnEdu GK key
  if (comp.gk) return comp.gk

  // 2. Column name matching GK / Mid Term / Giữa kỳ
  const byLabel = findColumnValueByLabel(
    comp,
    colNames,
    lbl =>
      lbl.includes("đđggk") ||
      lbl.includes("ddggk") ||
      lbl.includes("giữa kỳ") ||
      lbl.includes("giua ky") ||
      lbl.includes("mid term") ||
      lbl.includes("midterm") ||
      /\bgk\b/.test(lbl) ||
      /\bgk1\b|\bgk2\b/.test(lbl)
  )
  if (byLabel) return byLabel

  // 3. Legacy vnEdu secondary col4 (after 4 TX columns: col0..col3)
  const isVnEdu = String(entry.configType || "").toUpperCase() === "VNEDU"
  if (!isPrimary && isVnEdu && comp.col4) {
    return comp.col4
  }

  // 4. Primary school midterm KT GK column (col0) or compositeScore
  if (isPrimary) {
    if (comp.col0) return comp.col0
    if (entry.compositeScore !== null && entry.compositeScore !== undefined) {
      return String(entry.compositeScore)
    }
    if (entry.ratingValue) return entry.ratingValue
  }

  // 5. Fallback ONLY when there are no TX/GK/CK keys at all (pure single-score entry)
  if (!hasRegularAssessmentKeys(comp) && entry.compositeScore !== null && entry.compositeScore !== undefined) {
    return String(entry.compositeScore)
  }

  return null
}

/**
 * Extract ONLY ĐĐGck from a SubjectGradeEntry (never TX1..TX4).
 */
export function extractDdgCkRaw(
  entry: RawSubjectGradeEntry | null | undefined,
  cfg: RawSubjectGradeConfig | null | undefined,
  isPrimary: boolean
): string | null {
  if (!entry) return null
  const comp = parseComponentScores(entry.componentScores)
  const colNames = parseColumnNames(cfg)

  // 1. Explicit vnEdu CK key
  if (comp.ck) return comp.ck

  // 2. Column name matching CK / EOT / KTHK / Cuối kỳ
  const byLabel = findColumnValueByLabel(
    comp,
    colNames,
    lbl =>
      lbl.includes("đđgck") ||
      lbl.includes("ddgck") ||
      lbl.includes("cuối kỳ") ||
      lbl.includes("cuoi ky") ||
      lbl.includes("kthk") ||
      lbl.includes("eot") ||
      lbl.includes("end term") ||
      lbl.includes("final") ||
      /\bck\b/.test(lbl) ||
      /\bck1\b|\bck2\b/.test(lbl)
  )
  if (byLabel) return byLabel

  // 3. Legacy vnEdu secondary col5 (after TX1..TX4 + GK)
  const isVnEdu = String(entry.configType || "").toUpperCase() === "VNEDU"
  if (!isPrimary && isVnEdu && comp.col5) {
    return comp.col5
  }

  // 4. Primary school endterm KT CK column (col0) or compositeScore
  if (isPrimary) {
    if (comp.col0) return comp.col0
    if (entry.compositeScore !== null && entry.compositeScore !== undefined) {
      return String(entry.compositeScore)
    }
  }

  return null
}

/**
 * Extract ĐTBmhk following TT22 Article 9:
 * - For secondary VNEDU subjects, ĐTBmhk is ONLY valid once ĐĐGck is present.
 * - For comment-only subjects, returns Đ/CĐ (or Primary T/H/C).
 * - Never exposes intermediate TX-only averages as ĐTBmhk.
 */
export function extractDtbMhkRaw(
  entry: RawSubjectGradeEntry | null | undefined,
  ddgGkRaw: string | null,
  ddgCkRaw: string | null,
  opts: { isPrimary: boolean; isCommentOnly: boolean; isSpecialSubject: boolean }
): string | null {
  if (!entry) return null
  const comp = parseComponentScores(entry.componentScores)

  if (opts.isPrimary) {
    if (entry.ratingValue && String(entry.ratingValue).trim() !== "") {
      return String(entry.ratingValue).trim()
    }
    if (entry.compositeScore !== null && entry.compositeScore !== undefined) {
      return String(entry.compositeScore)
    }
    return ddgCkRaw
  }

  if (opts.isCommentOnly) {
    if (entry.ratingValue && String(entry.ratingValue).trim() !== "") {
      return String(entry.ratingValue).trim()
    }
    if (ddgCkRaw) {
      const txValues = [comp.tx1 ?? comp.col0, comp.tx2 ?? comp.col1, comp.tx3 ?? comp.col2, comp.tx4 ?? comp.col3]
      const computed = calculateTt22SemesterAverage(
        { txValues, gkValue: ddgGkRaw, ckValue: ddgCkRaw },
        true
      )
      return computed || null
    }
    return null
  }

  // Secondary scored subjects:
  // If VNEDU (or entry has TX/GK/CK structure), TT22 requires ĐĐGck before ĐTBmhk exists.
  const isVnEdu = String(entry.configType || "").toUpperCase() === "VNEDU"
  if (isVnEdu || (!opts.isSpecialSubject && hasRegularAssessmentKeys(comp))) {
    if (!ddgCkRaw) return null
    if (entry.compositeScore !== null && entry.compositeScore !== undefined) {
      return String(entry.compositeScore)
    }
    const txValues = [comp.tx1 ?? comp.col0, comp.tx2 ?? comp.col1, comp.tx3 ?? comp.col2, comp.tx4 ?? comp.col3]
    const computed = calculateTt22SemesterAverage(
      { txValues, gkValue: ddgGkRaw, ckValue: ddgCkRaw },
      false
    )
    return computed || null
  }

  // Special / INTERNAL subjects: compositeScore or ratingValue is the periodic summary score
  if (entry.compositeScore !== null && entry.compositeScore !== undefined) {
    return String(entry.compositeScore)
  }
  if (entry.ratingValue && String(entry.ratingValue).trim() !== "") {
    return String(entry.ratingValue).trim()
  }
  return ddgCkRaw
}

/**
 * Pick the best entry for a subject given a list of candidate entries.
 * - For KSĐN: prefer INTERNAL.
 * - For MOET periodic (GK/CK): prefer VNEDU over INTERNAL, and prefer primaryPeriods over midtermFallbackPeriods.
 * - For SPECIAL subjects (SKL / BILINGUAL): prefer INTERNAL if it has data, else VNEDU; prefer primaryPeriods over midtermFallbackPeriods.
 */
function pickBestEntry(
  entries: RawSubjectGradeEntry[],
  preferredPeriods: string[],
  preferConfigType: "VNEDU" | "INTERNAL"
): RawSubjectGradeEntry | null {
  if (!entries || entries.length === 0) return null
  const upperPreferred = preferredPeriods.map(p => p.toUpperCase())

  const scored = entries
    .filter(e => upperPreferred.includes(String(e.evaluationPeriod || "").toUpperCase()))
    .map(e => {
      const pIdx = upperPreferred.indexOf(String(e.evaluationPeriod || "").toUpperCase())
      const cfgType = String(e.configType || "").toUpperCase()
      const cfgBonus = cfgType === preferConfigType ? 0 : 10
      const comp = parseComponentScores(e.componentScores)
      const hasData =
        Object.keys(comp).length > 0 ||
        (e.compositeScore !== null && e.compositeScore !== undefined) ||
        Boolean(e.ratingValue && String(e.ratingValue).trim() !== "")
      const dataBonus = hasData ? 0 : 100
      return { entry: e, rank: dataBonus + cfgBonus + pIdx }
    })
    .sort((a, b) => a.rank - b.rank)

  return scored[0]?.entry || null
}

export function buildParentPeriodicSubjectRow(params: {
  subject: RawSubjectRecord
  stt: number
  grade: string | null | undefined
  lookup: ParentPeriodLookup
  entriesForSubject: RawSubjectGradeEntry[]
  configForSubject?: RawSubjectGradeConfig | null
}): ParentPeriodicSubjectRow {
  const { subject, stt, grade, lookup, entriesForSubject, configForSubject } = params
  const isPrimary = isPrimaryGrade(grade)
  const rawCategoryTokens = String(subject.category || "")
    .toUpperCase()
    .split(",")
    .map(t => t.trim())
    .filter(Boolean)
  const isExplicitMoetCategory =
    rawCategoryTokens.includes("MOET") &&
    !rawCategoryTokens.includes("SKL") &&
    !rawCategoryTokens.includes("BILINGUAL") &&
    !rawCategoryTokens.includes("INTERNATIONAL")

  const curriculumGroup: SubjectCurriculumGroup = isExplicitMoetCategory
    ? "MOET"
    : getSubjectCurriculumGroup({
        subjectName: subject.subjectName || subject.name,
        subjectCode: subject.subjectCode || subject.code,
        category: subject.category,
      })
  const isSpecialSubject = curriculumGroup === "SKL" || curriculumGroup === "BILINGUAL"
  const subjectGroup: ParentSubjectGroup = isSpecialSubject ? "SPECIAL" : "MOET"
  const isCommentOnly =
    String(subject.evaluationType || "").toUpperCase() === "REMARK" ||
    String(subject.evaluationType || "").toUpperCase() === "GRADE" ||
    isTt22CommentOnlySubject(subject.subjectName || subject.name || subject.subjectCode || subject.code)

  const subName = subject.subjectName || subject.name || "Môn học"
  const subCode = subject.subjectCode || subject.code || ""

  // 1. KSĐN mode: keep internal survey score
  if (lookup.displayMode === "KSDN") {
    const primaryEntry = pickBestEntry(entriesForSubject, lookup.primaryPeriods, "INTERNAL")
    const val = buildPeriodicGradeValue(primaryEntry?.compositeScore ?? primaryEntry?.ratingValue ?? null, {
      isCommentOnly,
      isPrimary,
    })
    const emptyVal: PeriodicGradeValue = { display: null, numeric: null, badge: "empty" }
    return {
      id: subject.id,
      stt,
      name: subName,
      code: subCode,
      subjectGroup,
      curriculumGroup,
      isSpecialSubject,
      isCommentOnly,
      score: val.numeric,
      scoreDisplay: val.display,
      scoreBadge: val.badge,
      ddgGk: emptyVal,
      ddgCk: emptyVal,
      dtbMhk: emptyVal,
      specialScore: isSpecialSubject ? val : emptyVal,
      remark: primaryEntry?.remark || "",
      source: primaryEntry
        ? String(primaryEntry.configType || "INTERNAL").toUpperCase() === "VNEDU"
          ? "VNEDU"
          : "INTERNAL"
        : "EMPTY",
    }
  }

  // 2. MIDTERM (GK1 / GK2) & ENDTERM (CK1 / CK2)
  const preferConfigType: "VNEDU" | "INTERNAL" = isSpecialSubject ? "INTERNAL" : "VNEDU"
  const primaryEntry = pickBestEntry(entriesForSubject, lookup.primaryPeriods, preferConfigType)
  const fallbackGkEntry =
    lookup.midtermFallbackPeriods.length > 0
      ? pickBestEntry(entriesForSubject, lookup.midtermFallbackPeriods, preferConfigType)
      : null

  // Extract ĐĐGgk: prefer primary entry's gk, else fallback to GK1/GK2 entry
  let ddgGkRaw = extractDdgGkRaw(primaryEntry, configForSubject, isPrimary)
  if (!ddgGkRaw && fallbackGkEntry) {
    ddgGkRaw = extractDdgGkRaw(fallbackGkEntry, configForSubject, isPrimary)
  }

  // For special subjects in MIDTERM, if no explicit GK column exists, use their periodic compositeScore / ratingValue
  if (lookup.displayMode === "MIDTERM" && isSpecialSubject && !ddgGkRaw && primaryEntry) {
    if (primaryEntry.compositeScore !== null && primaryEntry.compositeScore !== undefined) {
      ddgGkRaw = String(primaryEntry.compositeScore)
    } else if (primaryEntry.ratingValue) {
      ddgGkRaw = String(primaryEntry.ratingValue)
    }
  }

  const ddgCkRaw =
    lookup.displayMode === "ENDTERM"
      ? extractDdgCkRaw(primaryEntry, configForSubject, isPrimary)
      : null

  const dtbMhkRaw =
    lookup.displayMode === "ENDTERM"
      ? extractDtbMhkRaw(primaryEntry, ddgGkRaw, ddgCkRaw, {
          isPrimary,
          isCommentOnly,
          isSpecialSubject,
        })
      : null

  const ddgGk = buildPeriodicGradeValue(ddgGkRaw, { isCommentOnly, isPrimary })
  const ddgCk = buildPeriodicGradeValue(ddgCkRaw, { isCommentOnly, isPrimary })
  const dtbMhk = buildPeriodicGradeValue(dtbMhkRaw, { isCommentOnly, isPrimary })

  // Special subject periodic summary column:
  // In ENDTERM, NEVER copy ĐĐGgk into the final/summary column when ĐĐGck / ĐTBmhk is empty.
  let specialScore: PeriodicGradeValue = { display: null, numeric: null, badge: "empty" }
  if (isSpecialSubject) {
    if (lookup.displayMode === "ENDTERM") {
      specialScore = dtbMhk.display !== null ? dtbMhk : ddgCk
    } else {
      specialScore = ddgGk
    }
  }

  const headline =
    lookup.displayMode === "MIDTERM"
      ? ddgGk
      : dtbMhk.display !== null
        ? dtbMhk
        : ddgCk.display !== null
          ? ddgCk
          : ddgGk

  const effectiveEntry = primaryEntry || fallbackGkEntry
  const source: ParentPeriodicSubjectRow["source"] = effectiveEntry
    ? String(effectiveEntry.configType || "VNEDU").toUpperCase() === "VNEDU"
      ? "VNEDU"
      : "INTERNAL"
    : "EMPTY"

  return {
    id: subject.id,
    stt,
    name: subName,
    code: subCode,
    subjectGroup,
    curriculumGroup,
    isSpecialSubject,
    isCommentOnly,
    score: headline.numeric,
    scoreDisplay: headline.display,
    scoreBadge: headline.badge,
    ddgGk,
    ddgCk,
    dtbMhk,
    specialScore,
    remark: primaryEntry?.remark || fallbackGkEntry?.remark || "",
    source,
  }
}
