import {
  calculateTt22SemesterAverage,
  GradeColumnDef,
  normalizeGradeColumnDefs,
  validateColumnValue,
} from "./vnedu-config-types"
import {
  normalizeHeaderKey,
  normalizeVietnameseText,
  ParsedVnEduColumn,
  ParsedVnEduSheet,
} from "./vnedu-excel-parser"
import { calculateCompositeScore } from "./formula-calculator"

export type ImportMode = "FILL_EMPTY" | "UPDATE_EXISTING"

export interface SsmSubjectLite {
  id: string
  subjectCode: string
  subjectName: string
  level?: string | null
  category?: string | null
}

export interface SsmStudentLite {
  id: string
  studentCode: string
  vnEduCode?: string | null
  studentName: string
  dateOfBirth?: string | Date | null
  classId: string
  className?: string
}

export interface ExistingGradeEntryLite {
  id?: string
  studentId: string
  subjectId: string
  classId: string
  evaluationPeriod: string
  configType: string
  componentScores?: string | null
  compositeScore?: number | null
  ratingValue?: string | null
  remark?: string | null
  updatedAt?: string | Date | null
}

export interface PreviewFieldItem {
  rowKey: string // `${fileName}::${sheetName}::${rowIndex}::${fieldKey}`
  fileName: string
  sheetName: string
  rowIndex: number
  sourceSubject: string
  confirmedSubjectId: string
  confirmedSubjectName: string
  classId: string
  className: string
  vnEduCode: string
  studentId: string | null
  studentCode: string | null
  studentName: string | null
  fieldKey: string
  fieldLabel: string
  oldValue: string
  newValue: string
  status: "ADD" | "UPDATE" | "UNCHANGED" | "SKIPPED" | "ERROR" | "CONFLICT"
  reason: string
  selected: boolean
}

export interface SheetColumnMappingResult {
  mappedColumns: Array<{
    excelColIndex: number
    excelHeader: string
    targetCol: GradeColumnDef
  }>
  extraColumns: Array<{
    excelColIndex: number
    excelHeader: string
  }>
  compositeRefColumns: Array<{
    excelColIndex: number
    excelHeader: string
  }>
}

/**
 * Normalize Vietnamese text including common i/y and tone placement variations
 * (e.g. "Sĩ" == "Sỹ", "Lí" == "Lý", "Mĩ" == "Mỹ", "Kì" == "Kỳ", "Hoà" == "Hòa", "Thuý" == "Thúy").
 */
export function normalizeVietnameseComparable(input: string): string {
  return normalizeVietnameseText(input)
    .toLowerCase()
    .replace(/oà/g, "òa")
    .replace(/oá/g, "óa")
    .replace(/oả/g, "ỏa")
    .replace(/oã/g, "õa")
    .replace(/oạ/g, "ọa")
    .replace(/oè/g, "òe")
    .replace(/oé/g, "óe")
    .replace(/oẻ/g, "ỏe")
    .replace(/oẽ/g, "õe")
    .replace(/oẹ/g, "ọe")
    .replace(/uỳ/g, "ùy")
    .replace(/uý/g, "úy")
    .replace(/uỷ/g, "ủy")
    .replace(/uỹ/g, "ũy")
    .replace(/uỵ/g, "ụy")
    .replace(/([bcklmnstvđh])y(?=\s|$)/g, "$1i")
    .replace(/([bcklmnstvđh])ỳ(?=\s|$)/g, "$1ì")
    .replace(/([bcklmnstvđh])ý(?=\s|$)/g, "$1í")
    .replace(/([bcklmnstvđh])ỷ(?=\s|$)/g, "$1ỉ")
    .replace(/([bcklmnstvđh])ỹ(?=\s|$)/g, "$1ĩ")
    .replace(/([bcklmnstvđh])ỵ(?=\s|$)/g, "$1ị")
    .replace(/[._\-:/\\()[\]]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const MOET_SUBJECT_SYNONYMS: Array<{ patterns: string[]; canonicalNames: string[]; canonicalCodes: string[] }> = [
  {
    patterns: ["toán", "toán học", "toan", "toan hoc"],
    canonicalNames: ["toán học", "toán"],
    canonicalCodes: ["toan", "toa"],
  },
  {
    patterns: ["ngữ văn", "ngu van", "văn"],
    canonicalNames: ["ngữ văn"],
    canonicalCodes: ["nva", "van", "nguvan"],
  },
  {
    patterns: ["khoa học tự nhiên", "khoa hoc tu nhien", "khtn"],
    canonicalNames: ["khoa học tự nhiên"],
    canonicalCodes: ["khtn"],
  },
  {
    patterns: ["tin học", "tin hoc"],
    canonicalNames: ["tin học"],
    canonicalCodes: ["tin", "th"],
  },
  {
    patterns: ["công nghệ", "cong nghe"],
    canonicalNames: ["công nghệ"],
    canonicalCodes: ["cng", "cn", "congnghe"],
  },
  {
    patterns: ["gdcd", "giáo dục công dân", "giao duc cong dan"],
    canonicalNames: ["giáo dục công dân", "gdcd"],
    canonicalCodes: ["gdcd", "cd"],
  },
  {
    patterns: ["giáo dục thể chất", "giao duc the chat", "gdtc", "thể dục", "the duc"],
    canonicalNames: ["giáo dục thể chất", "thể dục"],
    canonicalCodes: ["gdtc", "td"],
  },
  {
    patterns: [
      "lịch sử và địa lí",
      "lịch sử và địa lý",
      "lịch sử & địa lí",
      "lịch sử & địa lý",
      "lich su va dia li",
      "lich su va dia ly",
      "ls&đl",
      "ls đl",
      "lsdl",
    ],
    canonicalNames: ["lịch sử và địa lí", "lịch sử và địa lý", "lịch sử & địa lí"],
    canonicalCodes: ["lsdl", "ls&dl", "ls_dl"],
  },
  {
    patterns: [
      "hoạt động trải nghiệm",
      "hoạt động trải nghiệm hướng nghiệp",
      "hoạt động trải nghiệm, hướng nghiệp",
      "hoat dong trai nghiem",
      "hoat dong trai nghiem huong nghiep",
      "hđtn",
      "hdtn",
      "hđtn hn",
      "hdtn hn",
    ],
    canonicalNames: [
      "hoạt động trải nghiệm, hướng nghiệp",
      "hoạt động trải nghiệm - hướng nghiệp",
      "hoạt động trải nghiệm",
    ],
    canonicalCodes: ["hdtn", "hđtn", "hdtnhn"],
  },
  {
    patterns: [
      "nội dung giáo dục của địa phương",
      "giáo dục địa phương",
      "noi dung giao duc cua dia phuong",
      "giao duc dia phuong",
      "gd địa phương",
      "gdđp",
      "gddp",
    ],
    canonicalNames: ["nội dung giáo dục của địa phương", "giáo dục địa phương"],
    canonicalCodes: ["gddp", "gdđp"],
  },
  {
    patterns: ["nghệ thuật", "nghe thuat"],
    canonicalNames: ["nghệ thuật"],
    canonicalCodes: ["nt", "nghethuat"],
  },
  {
    patterns: ["âm nhạc", "am nhac"],
    canonicalNames: ["âm nhạc"],
    canonicalCodes: ["anhac", "an", "amnhac"],
  },
  {
    patterns: ["mĩ thuật", "mỹ thuật", "mi thuat", "my thuat"],
    canonicalNames: ["mĩ thuật", "mỹ thuật"],
    canonicalCodes: ["mth", "mt", "mithuat", "mythuat"],
  },
  {
    patterns: ["vật lí", "vật lý", "vat li", "vat ly"],
    canonicalNames: ["vật lí", "vật lý"],
    canonicalCodes: ["vli", "vl", "vatli", "vatly"],
  },
  {
    patterns: ["hóa học", "hoá học", "hoa hoc"],
    canonicalNames: ["hóa học", "hoá học"],
    canonicalCodes: ["hho", "hh", "hoahoc"],
  },
  {
    patterns: ["sinh học", "sinh hoc"],
    canonicalNames: ["sinh học"],
    canonicalCodes: ["sho", "sh", "sinhhoc"],
  },
]

/**
 * Suggest a target SSM subject for a source Excel subject name.
 * NEVER auto-confirms! Also enforces strict non-merging rules:
 * - "Ngoại ngữ" does NOT auto-suggest "Tiếng Anh"
 * - "Maths" does NOT merge with "Toán học"
 * - "Science" does NOT merge with "Khoa học tự nhiên"
 */
export function suggestTargetSubject(
  sourceSubjectRaw: string,
  subjects: SsmSubjectLite[],
  hints: Array<{ sourceSubjectNormalized: string; targetSubjectId: string }> = [],
  aliases: Array<{ subjectId: string; aliasPattern?: string | null; normalizedKey?: string | null }> = []
): { suggestedSubjectId: string | null; suggestionSource: "HINT" | "EXACT" | "ALIAS" | "NONE" } {
  const norm = normalizeHeaderKey(sourceSubjectRaw)
  if (!norm) return { suggestedSubjectId: null, suggestionSource: "NONE" }

  // Anti-auto-merge guardrails (Section 8)
  if (norm === "ngoại ngữ" || norm === "ngoai ngu" || norm === "ngoại ngữ 1" || norm === "ngoai ngu 1") {
    const exactForeign = subjects.find(
      s => normalizeHeaderKey(s.subjectName) === norm || normalizeHeaderKey(s.subjectName) === "ngoại ngữ"
    )
    return { suggestedSubjectId: exactForeign?.id || null, suggestionSource: exactForeign ? "EXACT" : "NONE" }
  }
  if (norm === "maths" || norm === "math") {
    const exactMaths = subjects.find(s => ["maths", "math"].includes(normalizeHeaderKey(s.subjectName)))
    return { suggestedSubjectId: exactMaths?.id || null, suggestionSource: exactMaths ? "EXACT" : "NONE" }
  }
  if (norm === "science") {
    const exactScience = subjects.find(s => normalizeHeaderKey(s.subjectName) === "science")
    return { suggestedSubjectId: exactScience?.id || null, suggestionSource: exactScience ? "EXACT" : "NONE" }
  }

  // 1. Exact subject name or code match (including i/y equivalence)
  const normComp = normalizeVietnameseComparable(sourceSubjectRaw)
  const exact =
    subjects.find(
      s => normalizeHeaderKey(s.subjectName) === norm || normalizeHeaderKey(s.subjectCode) === norm
    ) ||
    subjects.find(
      s =>
        normalizeVietnameseComparable(s.subjectName) === normComp ||
        normalizeVietnameseComparable(s.subjectCode) === normComp
    )
  if (exact) {
    return { suggestedSubjectId: exact.id, suggestionSource: "EXACT" }
  }

  // 2. Previous user hint (only a suggestion)
  const hint = hints.find(
    h => h.sourceSubjectNormalized === norm || normalizeVietnameseComparable(h.sourceSubjectNormalized) === normComp
  )
  if (hint && subjects.some(s => s.id === hint.targetSubjectId)) {
    return { suggestedSubjectId: hint.targetSubjectId, suggestionSource: "HINT" }
  }

  // 3. SubjectAlias table
  const aliasMatch = aliases.find(
    a =>
      (a.normalizedKey && normalizeHeaderKey(a.normalizedKey) === norm) ||
      (a.aliasPattern && normalizeHeaderKey(a.aliasPattern) === norm)
  )
  if (aliasMatch && subjects.some(s => s.id === aliasMatch.subjectId)) {
    return { suggestedSubjectId: aliasMatch.subjectId, suggestionSource: "ALIAS" }
  }

  // 4. Standard MOET subject synonym matching (e.g. "Toán" <-> "Toán học", "GDCD" <-> "Giáo dục công dân")
  const synGroup = MOET_SUBJECT_SYNONYMS.find(
    g => g.patterns.includes(norm) || g.patterns.some(p => normalizeVietnameseComparable(p) === normComp)
  )
  if (synGroup) {
    const matchedSubj = subjects.find(s => {
      const sNameNorm = normalizeHeaderKey(s.subjectName)
      const sNameComp = normalizeVietnameseComparable(s.subjectName)
      const sCodeNorm = normalizeHeaderKey(s.subjectCode)
      return (
        synGroup.canonicalNames.includes(sNameNorm) ||
        synGroup.canonicalNames.some(cn => normalizeVietnameseComparable(cn) === sNameComp) ||
        synGroup.canonicalCodes.includes(sCodeNorm)
      )
    })
    if (matchedSubj) {
      return { suggestedSubjectId: matchedSubj.id, suggestionSource: "ALIAS" }
    }
  }

  return { suggestedSubjectId: null, suggestionSource: "NONE" }
}

/**
 * Map Excel columns from a parsed sheet to a confirmed SubjectGradeConfig's columns.
 */
export function mapExcelColumnsToConfig(
  excelColumns: ParsedVnEduColumn[],
  config: any
): SheetColumnMappingResult {
  const colDefs = normalizeGradeColumnDefs(config)
  const mappedColumns: SheetColumnMappingResult["mappedColumns"] = []
  const extraColumns: SheetColumnMappingResult["extraColumns"] = []
  const compositeRefColumns: SheetColumnMappingResult["compositeRefColumns"] = []

  const usedTargetKeys = new Set<string>()

  for (const exCol of excelColumns) {
    if (
      exCol.role === "STT" ||
      exCol.role === "VNEDU_CODE" ||
      exCol.role === "FULL_NAME" ||
      exCol.role === "LAST_NAME" ||
      exCol.role === "FIRST_NAME" ||
      exCol.role === "DOB"
    ) {
      continue
    }

    if (exCol.role === "COMPOSITE_REF") {
      compositeRefColumns.push({ excelColIndex: exCol.colIndex, excelHeader: exCol.headerLabel })
      continue
    }

    const exNorm = normalizeHeaderKey(exCol.headerLabel)
    const exCompact = exNorm.replace(/\s+/g, "")
    let matched: GradeColumnDef | undefined = undefined

    // 1. Exact label / alias match (including space-stripped compact comparison for wrapped headers like "ĐĐGg k")
    for (const def of colDefs) {
      if (usedTargetKeys.has(def.key) || def.inputMode === "CALCULATED") continue
      const candidateLabels = [def.label, def.key, ...(def.aliases || [])].map(normalizeHeaderKey)
      const candidateCompacts = candidateLabels.map(l => l.replace(/\s+/g, ""))
      if (candidateLabels.includes(exNorm) || (exCompact && candidateCompacts.includes(exCompact))) {
        matched = def
        break
      }
    }

    // 2. Semantic fallback for REMARK / RATING / TXn / GKn / CKn
    if (!matched && exCol.role === "REMARK") {
      matched = colDefs.find(d => !usedTargetKeys.has(d.key) && d.group === "REMARK")
    }
    if (!matched && exCol.role === "RATING") {
      matched = colDefs.find(d => !usedTargetKeys.has(d.key) && d.group === "RATING")
    }
    if (!matched) {
      // Match TX1..TX4, ĐĐGgk / GK1, ĐĐGck / CK1 (for both NUMBER and RATING/TT22 comment-only subjects)
      const txMatch =
        exNorm.match(/^tx\s*(\d+)$/) ||
        exNorm.match(/^(?:đđg|đdg|ddg)tx\s*(\d+)$/) ||
        exNorm.match(/^lần\s*(\d+)$/) ||
        exCompact.match(/^(?:tx|đđgtx|đdgtx|ddgtx)(\d+)$/)
      if (txMatch) {
        const attempt = parseInt(txMatch[1], 10)
        matched = colDefs.find(
          d => !usedTargetKeys.has(d.key) && d.group === "TX" && (d.attempt === attempt || normalizeHeaderKey(d.label) === `tx${attempt}`)
        )
      } else if (/^(?:kt\s*|đđg\s*|đdg\s*|ddg\s*)?gk\s*[12]?$/.test(exNorm) || /^(?:kt|đđg|đdg|ddg)?gk[12]?$/.test(exCompact)) {
        matched = colDefs.find(d => !usedTargetKeys.has(d.key) && d.group === "GK")
      } else if (/^(?:kt\s*|đđg\s*|đdg\s*|ddg\s*)?ck\s*[12]?$/.test(exNorm) || /^(?:kt|đđg|đdg|ddg)?ck[12]?$/.test(exCompact)) {
        matched = colDefs.find(d => !usedTargetKeys.has(d.key) && d.group === "CK")
      }
    }

    if (matched) {
      usedTargetKeys.add(matched.key)
      mappedColumns.push({
        excelColIndex: exCol.colIndex,
        excelHeader: exCol.headerLabel,
        targetCol: matched,
      })
    } else {
      extraColumns.push({
        excelColIndex: exCol.colIndex,
        excelHeader: exCol.headerLabel,
      })
    }
  }

  return { mappedColumns, extraColumns, compositeRefColumns }
}

const VN_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

export function formatDateYmd(d?: string | Date | null): string {
  if (!d) return ""
  if (typeof d === "string") {
    const s = d.trim()
    const plainIso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (plainIso) {
      return `${plainIso[1]}-${plainIso[2].padStart(2, "0")}-${plainIso[3].padStart(2, "0")}`
    }
    const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
    if (dmy) {
      const dd = dmy[1].padStart(2, "0")
      const mm = dmy[2].padStart(2, "0")
      const yyyy = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]
      return `${yyyy}-${mm}-${dd}`
    }
  }
  const dt = typeof d === "string" ? new Date(d) : d
  if (isNaN(dt.getTime())) return ""
  // If stored at exact UTC midnight (00:00:00.000Z), keep the UTC date components as-is;
  // otherwise (e.g. 17:00:00.000Z from Vietnam local midnight +07:00), format in Asia/Ho_Chi_Minh timezone.
  if (
    dt.getUTCHours() === 0 &&
    dt.getUTCMinutes() === 0 &&
    dt.getUTCSeconds() === 0 &&
    dt.getUTCMilliseconds() === 0
  ) {
    return dt.toISOString().slice(0, 10)
  }
  return VN_DATE_FORMATTER.format(dt)
}

export function parseExcelDobToYmd(raw: string): string {
  const s = String(raw || "").trim()
  if (!s) return ""
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (m) {
    const dd = m[1].padStart(2, "0")
    const mm = m[2].padStart(2, "0")
    const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${yyyy}-${mm}-${dd}`
  }
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`
  }
  if (/^\d{4,5}(?:\.0+)?$/.test(s)) {
    const serial = Math.round(Number(s))
    if (serial > 10000 && serial < 90000) {
      const utcMs = Math.round((serial - 25569) * 86400 * 1000)
      const dt = new Date(utcMs)
      if (!isNaN(dt.getTime())) {
        return dt.toISOString().slice(0, 10)
      }
    }
  }
  return ""
}

function isSameOrTimezoneShiftedDob(ymdA: string, ymdB: string): boolean {
  if (!ymdA || !ymdB) return false
  if (ymdA === ymdB) return true
  const tA = Date.parse(`${ymdA}T00:00:00Z`)
  const tB = Date.parse(`${ymdB}T00:00:00Z`)
  if (isNaN(tA) || isNaN(tB)) return false
  // Allow +/- 1 day tolerance for records whose dateOfBirth was previously saved with a UTC+7 -> UTC-1day shift
  return Math.abs(tA - tB) <= 86400 * 1000
}

/**
 * Build preview items for a confirmed sheet + class + subject + config.
 */
export function buildSheetPreview(params: {
  sheet: ParsedVnEduSheet
  targetClass: { id: string; className: string }
  confirmedSubject: SsmSubjectLite
  config: any
  studentsInYear: SsmStudentLite[]
  existingEntries: ExistingGradeEntryLite[]
  mode: ImportMode
}): {
  colMapping: SheetColumnMappingResult
  previewItems: PreviewFieldItem[]
  studentIssues: Array<{ rowIndex: number; vnEduCode: string; fullName: string; issue: string }>
} {
  const { sheet, targetClass, confirmedSubject, config, studentsInYear, existingEntries, mode } = params
  const colMapping = mapExcelColumnsToConfig(sheet.columns, config)

  // Index students by vnEduCode and studentCode (could be duplicates if data wasn't clean)
  const studentsByVnEdu = new Map<string, SsmStudentLite[]>()
  for (const st of studentsInYear) {
    const vCode = (st.vnEduCode || "").trim()
    if (vCode) {
      const arr = studentsByVnEdu.get(vCode) || []
      if (!arr.some(x => x.id === st.id)) arr.push(st)
      studentsByVnEdu.set(vCode, arr)
    }
    const sCode = (st.studentCode || "").trim()
    if (sCode && sCode !== vCode) {
      const arr = studentsByVnEdu.get(sCode) || []
      if (!arr.some(x => x.id === st.id)) arr.push(st)
      studentsByVnEdu.set(sCode, arr)
    }
  }

  // Index students in targetClass by fullName for multi-sheet vnEdu exports without a Mã HS column
  const studentsInTargetClass = studentsInYear.filter(s => s.classId === targetClass.id)
  const classStudentsByExactName = new Map<string, SsmStudentLite[]>()
  const classStudentsByCompName = new Map<string, SsmStudentLite[]>()
  for (const st of studentsInTargetClass) {
    const exactKey = normalizeVietnameseText(st.studentName).toLowerCase()
    if (exactKey) {
      const arr = classStudentsByExactName.get(exactKey) || []
      arr.push(st)
      classStudentsByExactName.set(exactKey, arr)
    }
    const compKey = normalizeVietnameseComparable(st.studentName)
    if (compKey) {
      const arr = classStudentsByCompName.get(compKey) || []
      arr.push(st)
      classStudentsByCompName.set(compKey, arr)
    }
  }

  const entryByStudentId = new Map<string, ExistingGradeEntryLite>()
  for (const e of existingEntries) {
    if (e.subjectId === confirmedSubject.id) {
      entryByStudentId.set(e.studentId, e)
    }
  }

  const previewItems: PreviewFieldItem[] = []
  const studentIssues: Array<{ rowIndex: number; vnEduCode: string; fullName: string; issue: string }> = []

  // Track duplicate (studentId, subjectId, fieldKey) within the same sheet/batch
  const seenKeys = new Map<string, { value: string; rowIndex: number }>()

  for (const row of sheet.rows) {
    if (row.isEmptyResultRow) {
      previewItems.push({
        rowKey: `${sheet.fileName}::${sheet.sheetName}::${row.rowIndex}::__EMPTY__`,
        fileName: sheet.fileName,
        sheetName: sheet.sheetName,
        rowIndex: row.rowIndex,
        sourceSubject: sheet.detectedSubject || sheet.sheetName,
        confirmedSubjectId: confirmedSubject.id,
        confirmedSubjectName: confirmedSubject.subjectName,
        classId: targetClass.id,
        className: targetClass.className,
        vnEduCode: row.vnEduCode,
        studentId: null,
        studentCode: null,
        studentName: row.fullName,
        fieldKey: "__ROW__",
        fieldLabel: "Cả dòng",
        oldValue: "",
        newValue: "",
        status: "SKIPPED",
        reason: "Dòng chưa có kết quả",
        selected: false,
      })
      continue
    }

    // 1. Validate vnEduCode & map student (or fallback to exact/comparable full name within targetClass when file has no Mã HS)
    let matchedStudents: SsmStudentLite[] = []
    if (row.vnEduCode) {
      matchedStudents = studentsByVnEdu.get(row.vnEduCode) || []
    } else if (row.fullName) {
      const exactKey = normalizeVietnameseText(row.fullName).toLowerCase()
      const compKey = normalizeVietnameseComparable(row.fullName)
      let nameCandidates = classStudentsByExactName.get(exactKey) || classStudentsByCompName.get(compKey) || []
      if (nameCandidates.length > 1 && row.dob) {
        const fileYmd = parseExcelDobToYmd(row.dob)
        if (fileYmd) {
          const exactDobFiltered = nameCandidates.filter(c => formatDateYmd(c.dateOfBirth) === fileYmd)
          if (exactDobFiltered.length === 1) {
            nameCandidates = exactDobFiltered
          } else {
            const tzDobFiltered = nameCandidates.filter(c => isSameOrTimezoneShiftedDob(formatDateYmd(c.dateOfBirth), fileYmd))
            if (tzDobFiltered.length === 1) nameCandidates = tzDobFiltered
          }
        }
      }
      if (nameCandidates.length === 1) {
        matchedStudents = nameCandidates
      }
    }

    if (!row.vnEduCode && matchedStudents.length === 0) {
      studentIssues.push({
        rowIndex: row.rowIndex,
        vnEduCode: "",
        fullName: row.fullName,
        issue: "Thiếu Mã vnEdu và không tìm thấy học sinh khớp họ tên trong lớp",
      })
      previewItems.push({
        rowKey: `${sheet.fileName}::${sheet.sheetName}::${row.rowIndex}::__STUDENT__`,
        fileName: sheet.fileName,
        sheetName: sheet.sheetName,
        rowIndex: row.rowIndex,
        sourceSubject: sheet.detectedSubject || sheet.sheetName,
        confirmedSubjectId: confirmedSubject.id,
        confirmedSubjectName: confirmedSubject.subjectName,
        classId: targetClass.id,
        className: targetClass.className,
        vnEduCode: "",
        studentId: null,
        studentCode: null,
        studentName: row.fullName,
        fieldKey: "__STUDENT__",
        fieldLabel: "Học sinh",
        oldValue: "",
        newValue: "",
        status: "ERROR",
        reason: "Thiếu Mã vnEdu; không tự ghép theo STT hoặc tên",
        selected: false,
      })
      continue
    }

    if (matchedStudents.length === 0) {
      studentIssues.push({
        rowIndex: row.rowIndex,
        vnEduCode: row.vnEduCode,
        fullName: row.fullName,
        issue: `Mã vnEdu "${row.vnEduCode}" không tồn tại trong Quản lý học sinh`,
      })
      previewItems.push({
        rowKey: `${sheet.fileName}::${sheet.sheetName}::${row.rowIndex}::__STUDENT__`,
        fileName: sheet.fileName,
        sheetName: sheet.sheetName,
        rowIndex: row.rowIndex,
        sourceSubject: sheet.detectedSubject || sheet.sheetName,
        confirmedSubjectId: confirmedSubject.id,
        confirmedSubjectName: confirmedSubject.subjectName,
        classId: targetClass.id,
        className: targetClass.className,
        vnEduCode: row.vnEduCode,
        studentId: null,
        studentCode: null,
        studentName: row.fullName,
        fieldKey: "__STUDENT__",
        fieldLabel: "Học sinh",
        oldValue: "",
        newValue: "",
        status: "ERROR",
        reason: `Mã vnEdu "${row.vnEduCode}" không tồn tại trong SSM`,
        selected: false,
      })
      continue
    }

    if (matchedStudents.length > 1) {
      studentIssues.push({
        rowIndex: row.rowIndex,
        vnEduCode: row.vnEduCode,
        fullName: row.fullName,
        issue: `Mã vnEdu "${row.vnEduCode}" bị trùng trên ${matchedStudents.length} học sinh`,
      })
      previewItems.push({
        rowKey: `${sheet.fileName}::${sheet.sheetName}::${row.rowIndex}::__STUDENT__`,
        fileName: sheet.fileName,
        sheetName: sheet.sheetName,
        rowIndex: row.rowIndex,
        sourceSubject: sheet.detectedSubject || sheet.sheetName,
        confirmedSubjectId: confirmedSubject.id,
        confirmedSubjectName: confirmedSubject.subjectName,
        classId: targetClass.id,
        className: targetClass.className,
        vnEduCode: row.vnEduCode,
        studentId: null,
        studentCode: null,
        studentName: row.fullName,
        fieldKey: "__STUDENT__",
        fieldLabel: "Học sinh",
        oldValue: "",
        newValue: "",
        status: "ERROR",
        reason: `Trùng Mã vnEdu "${row.vnEduCode}" trong hệ thống`,
        selected: false,
      })
      continue
    }

    const student = matchedStudents[0]
    const resolvedVnEduCode = row.vnEduCode || student.vnEduCode || student.studentCode || ""
    if (student.classId !== targetClass.id) {
      studentIssues.push({
        rowIndex: row.rowIndex,
        vnEduCode: resolvedVnEduCode,
        fullName: row.fullName,
        issue: `Học sinh "${student.studentName}" thuộc lớp ${student.className || student.classId}, không thuộc lớp ${targetClass.className}`,
      })
      previewItems.push({
        rowKey: `${sheet.fileName}::${sheet.sheetName}::${row.rowIndex}::__STUDENT__`,
        fileName: sheet.fileName,
        sheetName: sheet.sheetName,
        rowIndex: row.rowIndex,
        sourceSubject: sheet.detectedSubject || sheet.sheetName,
        confirmedSubjectId: confirmedSubject.id,
        confirmedSubjectName: confirmedSubject.subjectName,
        classId: targetClass.id,
        className: targetClass.className,
        vnEduCode: resolvedVnEduCode,
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.studentName,
        fieldKey: "__STUDENT__",
        fieldLabel: "Học sinh",
        oldValue: "",
        newValue: "",
        status: "ERROR",
        reason: `Sai lớp: HS đang ở lớp ${student.className || student.classId}, file là lớp ${targetClass.className}`,
        selected: false,
      })
      continue
    }

    // Check name / DOB mismatch (allowing Vietnamese i/y and tone placement variations like Sĩ vs Sỹ)
    if (
      row.fullName &&
      normalizeVietnameseComparable(row.fullName) !== normalizeVietnameseComparable(student.studentName)
    ) {
      studentIssues.push({
        rowIndex: row.rowIndex,
        vnEduCode: resolvedVnEduCode,
        fullName: row.fullName,
        issue: `Khác họ tên: file "${row.fullName}" vs SSM "${student.studentName}"`,
      })
      previewItems.push({
        rowKey: `${sheet.fileName}::${sheet.sheetName}::${row.rowIndex}::__STUDENT__`,
        fileName: sheet.fileName,
        sheetName: sheet.sheetName,
        rowIndex: row.rowIndex,
        sourceSubject: sheet.detectedSubject || sheet.sheetName,
        confirmedSubjectId: confirmedSubject.id,
        confirmedSubjectName: confirmedSubject.subjectName,
        classId: targetClass.id,
        className: targetClass.className,
        vnEduCode: resolvedVnEduCode,
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.studentName,
        fieldKey: "__STUDENT__",
        fieldLabel: "Học sinh",
        oldValue: student.studentName,
        newValue: row.fullName,
        status: "ERROR",
        reason: `Khác họ tên với hồ sơ SSM (${student.studentName})`,
        selected: false,
      })
      continue
    }

    if (row.dob && student.dateOfBirth) {
      const fileYmd = parseExcelDobToYmd(row.dob)
      const dbYmd = formatDateYmd(student.dateOfBirth)
      if (fileYmd && dbYmd && !isSameOrTimezoneShiftedDob(fileYmd, dbYmd)) {
        studentIssues.push({
          rowIndex: row.rowIndex,
          vnEduCode: resolvedVnEduCode,
          fullName: row.fullName,
          issue: `Khác ngày sinh: file "${row.dob}" vs SSM "${dbYmd}"`,
        })
        previewItems.push({
          rowKey: `${sheet.fileName}::${sheet.sheetName}::${row.rowIndex}::__STUDENT__`,
          fileName: sheet.fileName,
          sheetName: sheet.sheetName,
          rowIndex: row.rowIndex,
          sourceSubject: sheet.detectedSubject || sheet.sheetName,
          confirmedSubjectId: confirmedSubject.id,
          confirmedSubjectName: confirmedSubject.subjectName,
          classId: targetClass.id,
          className: targetClass.className,
          vnEduCode: resolvedVnEduCode,
          studentId: student.id,
          studentCode: student.studentCode,
          studentName: student.studentName,
          fieldKey: "__STUDENT__",
          fieldLabel: "Ngày sinh",
          oldValue: dbYmd,
          newValue: fileYmd,
          status: "ERROR",
          reason: `Khác ngày sinh với hồ sơ SSM (${dbYmd})`,
          selected: false,
        })
        continue
      }
    }

    // 2. Check formula errors on this row
    if (row.formulaErrors.length > 0) {
      for (const fErr of row.formulaErrors) {
        previewItems.push({
          rowKey: `${sheet.fileName}::${sheet.sheetName}::${row.rowIndex}::formula_${fErr.colIndex}`,
          fileName: sheet.fileName,
          sheetName: sheet.sheetName,
          rowIndex: row.rowIndex,
          sourceSubject: sheet.detectedSubject || sheet.sheetName,
          confirmedSubjectId: confirmedSubject.id,
          confirmedSubjectName: confirmedSubject.subjectName,
          classId: targetClass.id,
          className: targetClass.className,
          vnEduCode: resolvedVnEduCode,
          studentId: student.id,
          studentCode: student.studentCode,
          studentName: student.studentName,
          fieldKey: `formula_${fErr.colIndex}`,
          fieldLabel: fErr.header,
          oldValue: "",
          newValue: "",
          status: "ERROR",
          reason: fErr.message,
          selected: false,
        })
      }
    }

    // 3. Map each configured column
    const existing = entryByStudentId.get(student.id)
    let existingComponents: Record<string, any> = {}
    if (existing?.componentScores) {
      try {
        existingComponents = JSON.parse(existing.componentScores) || {}
      } catch {
        existingComponents = {}
      }
    }

    for (const mc of colMapping.mappedColumns) {
      const rawVal = row.valuesByColIndex[mc.excelColIndex]
      const validation = validateColumnValue(rawVal, mc.targetCol)
      const rowKey = `${sheet.fileName}::${sheet.sheetName}::${row.rowIndex}::${mc.targetCol.key}`

      if (!validation.valid) {
        previewItems.push({
          rowKey,
          fileName: sheet.fileName,
          sheetName: sheet.sheetName,
          rowIndex: row.rowIndex,
          sourceSubject: sheet.detectedSubject || sheet.sheetName,
          confirmedSubjectId: confirmedSubject.id,
          confirmedSubjectName: confirmedSubject.subjectName,
          classId: targetClass.id,
          className: targetClass.className,
          vnEduCode: resolvedVnEduCode,
          studentId: student.id,
          studentCode: student.studentCode,
          studentName: student.studentName,
          fieldKey: mc.targetCol.key,
          fieldLabel: mc.targetCol.label,
          oldValue: "",
          newValue: String(rawVal || ""),
          status: "ERROR",
          reason: validation.error || "Giá trị không hợp lệ",
          selected: false,
        })
        continue
      }

      // Empty cell never deletes existing data
      if (validation.normalized === null) {
        continue
      }

      const newValStr = String(validation.normalized)
      let oldValStr = ""
      if (mc.targetCol.group === "REMARK" || mc.targetCol.key === "remark") {
        oldValStr = existing?.remark ? String(existing.remark).trim() : ""
      } else if (mc.targetCol.key === "ratingValue") {
        oldValStr = existing?.ratingValue ? String(existing.ratingValue).trim() : ""
      } else {
        let rawOld = existingComponents[mc.targetCol.key]
        if ((rawOld === undefined || rawOld === null || String(rawOld).trim() === "") && mc.targetCol.group === "GK") {
          rawOld = existingComponents.gk
        } else if ((rawOld === undefined || rawOld === null || String(rawOld).trim() === "") && mc.targetCol.group === "CK") {
          rawOld = existingComponents.ck
        } else if ((rawOld === undefined || rawOld === null || String(rawOld).trim() === "") && mc.targetCol.group === "TX" && mc.targetCol.attempt) {
          rawOld = existingComponents[`tx${mc.targetCol.attempt}`]
        }
        oldValStr = rawOld !== undefined && rawOld !== null ? String(rawOld).trim() : ""
      }

      // Check duplicate key in same file/sheet with conflicting value
      const dupKey = `${student.id}::${confirmedSubject.id}::${mc.targetCol.key}`
      const prevSeen = seenKeys.get(dupKey)
      if (prevSeen && prevSeen.value !== newValStr) {
        previewItems.push({
          rowKey,
          fileName: sheet.fileName,
          sheetName: sheet.sheetName,
          rowIndex: row.rowIndex,
          sourceSubject: sheet.detectedSubject || sheet.sheetName,
          confirmedSubjectId: confirmedSubject.id,
          confirmedSubjectName: confirmedSubject.subjectName,
          classId: targetClass.id,
          className: targetClass.className,
          vnEduCode: resolvedVnEduCode,
          studentId: student.id,
          studentCode: student.studentCode,
          studentName: student.studentName,
          fieldKey: mc.targetCol.key,
          fieldLabel: mc.targetCol.label,
          oldValue: prevSeen.value,
          newValue: newValStr,
          status: "CONFLICT",
          reason: `Trùng học sinh & cột điểm với dòng ${prevSeen.rowIndex} nhưng khác giá trị (${prevSeen.value} vs ${newValStr})`,
          selected: false,
        })
        continue
      }
      seenKeys.set(dupKey, { value: newValStr, rowIndex: row.rowIndex })

      if (oldValStr !== "") {
        if (oldValStr === newValStr) {
          previewItems.push({
            rowKey,
            fileName: sheet.fileName,
            sheetName: sheet.sheetName,
            rowIndex: row.rowIndex,
            sourceSubject: sheet.detectedSubject || sheet.sheetName,
            confirmedSubjectId: confirmedSubject.id,
            confirmedSubjectName: confirmedSubject.subjectName,
            classId: targetClass.id,
            className: targetClass.className,
            vnEduCode: resolvedVnEduCode,
            studentId: student.id,
            studentCode: student.studentCode,
            studentName: student.studentName,
            fieldKey: mc.targetCol.key,
            fieldLabel: mc.targetCol.label,
            oldValue: oldValStr,
            newValue: newValStr,
            status: "UNCHANGED",
            reason: "Không thay đổi",
            selected: false,
          })
        } else if (mode === "FILL_EMPTY") {
          previewItems.push({
            rowKey,
            fileName: sheet.fileName,
            sheetName: sheet.sheetName,
            rowIndex: row.rowIndex,
            sourceSubject: sheet.detectedSubject || sheet.sheetName,
            confirmedSubjectId: confirmedSubject.id,
            confirmedSubjectName: confirmedSubject.subjectName,
            classId: targetClass.id,
            className: targetClass.className,
            vnEduCode: resolvedVnEduCode,
            studentId: student.id,
            studentCode: student.studentCode,
            studentName: student.studentName,
            fieldKey: mc.targetCol.key,
            fieldLabel: mc.targetCol.label,
            oldValue: oldValStr,
            newValue: newValStr,
            status: "SKIPPED",
            reason: "Chế độ chỉ bổ sung ô trống (đã có dữ liệu)",
            selected: false,
          })
        } else {
          previewItems.push({
            rowKey,
            fileName: sheet.fileName,
            sheetName: sheet.sheetName,
            rowIndex: row.rowIndex,
            sourceSubject: sheet.detectedSubject || sheet.sheetName,
            confirmedSubjectId: confirmedSubject.id,
            confirmedSubjectName: confirmedSubject.subjectName,
            classId: targetClass.id,
            className: targetClass.className,
            vnEduCode: resolvedVnEduCode,
            studentId: student.id,
            studentCode: student.studentCode,
            studentName: student.studentName,
            fieldKey: mc.targetCol.key,
            fieldLabel: mc.targetCol.label,
            oldValue: oldValStr,
            newValue: newValStr,
            status: "UPDATE",
            reason: "Cập nhật kết quả đã có",
            selected: true,
          })
        }
      } else {
        previewItems.push({
          rowKey,
          fileName: sheet.fileName,
          sheetName: sheet.sheetName,
          rowIndex: row.rowIndex,
          sourceSubject: sheet.detectedSubject || sheet.sheetName,
          confirmedSubjectId: confirmedSubject.id,
          confirmedSubjectName: confirmedSubject.subjectName,
          classId: targetClass.id,
          className: targetClass.className,
          vnEduCode: resolvedVnEduCode,
          studentId: student.id,
          studentCode: student.studentCode,
          studentName: student.studentName,
          fieldKey: mc.targetCol.key,
          fieldLabel: mc.targetCol.label,
          oldValue: "",
          newValue: newValStr,
          status: "ADD",
          reason: "Bổ sung trường đang trống",
          selected: true,
        })
      }
    }
  }

  return { colMapping, previewItems, studentIssues }
}

/**
 * Recompute composite score only when config.hasCompositeColumn is true and numeric columns exist.
 */
export function recomputeCompositeForConfig(
  componentScores: Record<string, any>,
  config: any
): number | null {
  if (!config || config.hasCompositeColumn === false) return null
  const colDefs = normalizeGradeColumnDefs(config)
  const numericDefs = colDefs.filter(c => c.dataType === "NUMBER" && c.inputMode === "INPUT")
  if (numericDefs.length === 0) return null

  const txDefs = numericDefs.filter(c => c.group === "TX")
  const gkDef = numericDefs.find(c => c.group === "GK")
  const ckDef = numericDefs.find(c => c.group === "CK")

  if (gkDef && ckDef) {
    const txValues = txDefs.map((d, idx) => componentScores[d.key] ?? componentScores[`col${idx}`] ?? "")
    const gkIdx = numericDefs.indexOf(gkDef)
    const ckIdx = numericDefs.indexOf(ckDef)
    const gkValue = componentScores[gkDef.key] ?? componentScores.gk ?? componentScores[`col${gkIdx}`] ?? ""
    const ckValue = componentScores[ckDef.key] ?? componentScores.ck ?? componentScores[`col${ckIdx}`] ?? ""
    const tt22Res = calculateTt22SemesterAverage({ txValues, gkValue, ckValue }, false)
    if (tt22Res) {
      const n = parseFloat(tt22Res)
      if (!isNaN(n)) return n
    }
  }

  // Map by index for formula-calculator compatibility
  const indexedScores: Record<string, any> = {}
  numericDefs.forEach((def, idx) => {
    const val = componentScores[def.key] ?? componentScores[`col${idx}`]
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      indexedScores[`col${idx}`] = val
    }
  })

  const resStr = calculateCompositeScore(indexedScores, config, numericDefs.length)
  if (!resStr) return null
  const num = parseFloat(resStr)
  return isNaN(num) ? null : num
}
