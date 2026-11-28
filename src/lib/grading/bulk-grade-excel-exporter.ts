// @ts-nocheck
import * as XLSX from "xlsx"
import { getColumnMaxScore } from "./formula-calculator"

export interface BulkExportOptions {
  campusName: string
  academicYearName: string
  evaluationPeriodCode: string
  evaluationPeriodName: string
  selectedGrades?: string[]
  classes: any[]
  students: any[]
  subjects: any[]
  configs: any[]
  entries: any[]
  teachingAssignments?: any[]
  includeOverviewSheet?: boolean
  includeMasterSummarySheet?: boolean
  onlyPeriodScoreColumn?: boolean
  groupByGradeSheet?: boolean
  onProgress?: (percent: number, message: string) => void
}

export interface ParsedColDef {
  key: string
  label: string
  group?: string
  attempt?: number
  scaleCode?: string
  maxScore?: number
}

function isGkPeriod(periodCode: string): boolean {
  const p = (periodCode || "").toUpperCase().trim()
  return p === "GK1" || p === "GK2" || p === "GIUA_KY_1" || p === "GIUA_KY_2"
}

function isCkPeriod(periodCode: string): boolean {
  const p = (periodCode || "").toUpperCase().trim()
  return p === "CK1" || p === "CK2" || p === "CUOI_KY_1" || p === "CUOI_KY_2"
}

function isKsdnPeriod(periodCode: string): boolean {
  const p = (periodCode || "").toUpperCase().trim()
  return p === "KSĐN" || p === "KSDN"
}

export function getPeriodScoreColumnLabel(periodCode: string): string | null {
  if (isGkPeriod(periodCode)) return "ĐĐGgk"
  if (isCkPeriod(periodCode)) return "ĐĐGck"
  return null
}

function extractGradeNumber(raw?: string | null): number | null {
  const str = String(raw || "").trim()
  if (!str) return null
  const lead = str.match(/^(\d+)/)
  if (lead) return parseInt(lead[1], 10)
  const digits = str.replace(/\D/g, "")
  if (!digits) return null
  const n = parseInt(digits, 10)
  return isNaN(n) ? null : n
}

function isGradeMatch(configGrade?: string | null, targetGrade?: string | null): boolean {
  if (!configGrade || !targetGrade) return false
  const c = String(configGrade).trim()
  const t = String(targetGrade).trim()
  if (c === "ALL" || t === "ALL" || c === "" || t === "") return true
  if (c.toLowerCase() === t.toLowerCase()) return true
  const n1 = extractGradeNumber(c)
  const n2 = extractGradeNumber(t)
  if (n1 !== null && n2 !== null) return n1 === n2
  const clean1 = c.toLowerCase().replace(/khối|khoi|lớp|lop|\s/g, "")
  const clean2 = t.toLowerCase().replace(/khối|khoi|lớp|lop|\s/g, "")
  return clean1 === clean2
}

export function parseComponentScores(raw: any): Record<string, any> {
  if (!raw) return {}
  if (typeof raw === "object") return raw
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export function parseColumnDefs(config: any): ParsedColDef[] {
  if (!config) return []
  if (config.columnsJson) {
    try {
      const parsed = typeof config.columnsJson === "string" ? JSON.parse(config.columnsJson) : config.columnsJson
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((d: any, idx: number) => ({
          key: d.key || `col${idx}`,
          label: d.label || `Cột ${idx + 1}`,
          group: d.group,
          attempt: d.attempt,
          scaleCode: d.scaleCode || "SCORE_10",
          maxScore: d.maxScore
        }))
      }
    } catch {
      // fallback below
    }
  }

  let colNames: string[] = []
  let colTypes: string[] = []
  let colMaxScores: any = []
  try {
    colNames = typeof config.columnNames === "string" ? JSON.parse(config.columnNames) : config.columnNames || []
    colTypes = typeof config.columnTypes === "string" ? JSON.parse(config.columnTypes) : config.columnTypes || []
    colMaxScores = typeof config.columnMaxScores === "string" ? JSON.parse(config.columnMaxScores) : config.columnMaxScores || []
  } catch {
    colNames = []
  }

  return colNames.map((label: string, idx: number) => {
    const upper = String(label || "").toUpperCase().trim()
    let group: string | undefined
    let attempt: number | undefined
    const txM = upper.match(/^TX\s*(\d+)$/) || upper.match(/ĐĐGTX\s*(\d+)/)
    if (txM) {
      group = "TX"
      attempt = parseInt(txM[1], 10)
    } else if (upper.includes("ĐĐGGK") || upper.includes("DDGGK") || upper === "GK" || /^GK[12]$/.test(upper)) {
      group = "GK"
    } else if (upper.includes("ĐĐGCK") || upper.includes("DDGCK") || upper === "CK" || /^CK[12]$/.test(upper)) {
      group = "CK"
    }
    const scaleCode = colTypes[idx] || "SCORE_10"
    const maxScore = getColumnMaxScore(scaleCode, colMaxScores, idx)
    return {
      key: `col${idx}`,
      label,
      group,
      attempt,
      scaleCode,
      maxScore
    }
  })
}

function isNonEmptyValue(val: any): boolean {
  return val !== undefined && val !== null && String(val).trim() !== ""
}

function toFiniteNumber(val: any): number | null {
  if (!isNonEmptyValue(val)) return null
  const normalized = typeof val === "string" ? val.trim().replace(",", ".") : val
  const n = Number(normalized)
  return !isNaN(n) && isFinite(n) ? n : null
}

export function resolveColumnCellValue(comp: Record<string, any>, colDef: ParsedColDef, cIdx: number): any {
  if (isNonEmptyValue(comp[colDef.key])) return comp[colDef.key]
  if (isNonEmptyValue(comp[`col${cIdx}`])) return comp[`col${cIdx}`]

  const upperLabel = String(colDef.label || "").toUpperCase().trim()
  if (colDef.group === "GK" || upperLabel.includes("ĐĐGGK") || upperLabel.includes("DDGGK") || upperLabel === "GK") {
    if (isNonEmptyValue(comp.gk)) return comp.gk
  }
  if (colDef.group === "CK" || upperLabel.includes("ĐĐGCK") || upperLabel.includes("DDGCK") || upperLabel === "CK") {
    if (isNonEmptyValue(comp.ck)) return comp.ck
  }
  if (colDef.group === "TX" && colDef.attempt) {
    const txKey = `tx${colDef.attempt}`
    if (isNonEmptyValue(comp[txKey])) return comp[txKey]
  }
  return ""
}

/**
 * Resolve the official score/rating for a student's entry in the target evaluation period.
 * - For GK1 / GK2: prioritizes ĐĐGgk (group="GK" / comp.gk), then single-col / compositeScore fallback.
 * - For CK1 / CK2: prioritizes ĐĐGck (group="CK" / comp.ck), then single-col / compositeScore fallback.
 * - For other periods (KSĐN, HK1, HK2, CN): prioritizes compositeScore, then col0 / ratingValue.
 */
export function resolvePeriodColumnValue(
  entry: any,
  config: any,
  evaluationPeriodCode: string
): { value: any; numericValue: number | null; columnLabel: string } {
  const defaultLabel = getPeriodScoreColumnLabel(evaluationPeriodCode) || config?.compositeColumnName || "Điểm tổng kết"
  if (!entry) {
    return { value: "", numericValue: null, columnLabel: defaultLabel }
  }

  const comp = parseComponentScores(entry.componentScores)
  const colDefs = parseColumnDefs(config)

  if (isGkPeriod(evaluationPeriodCode)) {
    const gkIdx = colDefs.findIndex(d => {
      const u = d.label.toUpperCase()
      return d.group === "GK" || d.key === "gk" || u.includes("ĐĐGGK") || u.includes("DDGGK") || u === "GK" || u.includes("KT GK")
    })
    const gkDef = gkIdx >= 0 ? colDefs[gkIdx] : null
    if (gkDef) {
      const gkVal = resolveColumnCellValue(comp, gkDef, gkIdx)
      if (isNonEmptyValue(gkVal)) {
        return { value: gkVal, numericValue: toFiniteNumber(gkVal), columnLabel: gkDef.label || "ĐĐGgk" }
      }
    }
    if (isNonEmptyValue(comp.gk)) {
      return { value: comp.gk, numericValue: toFiniteNumber(comp.gk), columnLabel: "ĐĐGgk" }
    }
    // Single-column Primary/Internal GK entry
    const hasTxOnly =
      gkDef !== null &&
      colDefs.some((d, i) => d.group === "TX" && isNonEmptyValue(resolveColumnCellValue(comp, d, i)))
    if (!hasTxOnly) {
      if (isNonEmptyValue(entry.compositeScore)) {
        return { value: entry.compositeScore, numericValue: toFiniteNumber(entry.compositeScore), columnLabel: gkDef?.label || "ĐĐGgk" }
      }
      if (colDefs.length <= 1 && isNonEmptyValue(comp.col0)) {
        return { value: comp.col0, numericValue: toFiniteNumber(comp.col0), columnLabel: colDefs[0]?.label || "ĐĐGgk" }
      }
      if (isNonEmptyValue(entry.ratingValue)) {
        return { value: entry.ratingValue, numericValue: null, columnLabel: gkDef?.label || "ĐĐGgk" }
      }
    }
    return { value: "", numericValue: null, columnLabel: gkDef?.label || "ĐĐGgk" }
  }

  if (isCkPeriod(evaluationPeriodCode)) {
    const ckIdx = colDefs.findIndex(d => {
      const u = d.label.toUpperCase()
      return d.group === "CK" || d.key === "ck" || u.includes("ĐĐGCK") || u.includes("DDGCK") || u === "CK" || u.includes("KT CK")
    })
    const ckDef = ckIdx >= 0 ? colDefs[ckIdx] : null
    if (ckDef) {
      const ckVal = resolveColumnCellValue(comp, ckDef, ckIdx)
      if (isNonEmptyValue(ckVal)) {
        return { value: ckVal, numericValue: toFiniteNumber(ckVal), columnLabel: ckDef.label || "ĐĐGck" }
      }
    }
    if (isNonEmptyValue(comp.ck)) {
      return { value: comp.ck, numericValue: toFiniteNumber(comp.ck), columnLabel: "ĐĐGck" }
    }
    const hasNonCkOnly =
      ckDef !== null &&
      colDefs.some((d, i) => (d.group === "TX" || d.group === "GK") && isNonEmptyValue(resolveColumnCellValue(comp, d, i)))
    if (!hasNonCkOnly) {
      if (isNonEmptyValue(entry.compositeScore)) {
        return { value: entry.compositeScore, numericValue: toFiniteNumber(entry.compositeScore), columnLabel: ckDef?.label || "ĐĐGck" }
      }
      if (colDefs.length <= 1 && isNonEmptyValue(comp.col0)) {
        return { value: comp.col0, numericValue: toFiniteNumber(comp.col0), columnLabel: colDefs[0]?.label || "ĐĐGck" }
      }
      if (isNonEmptyValue(entry.ratingValue)) {
        return { value: entry.ratingValue, numericValue: null, columnLabel: ckDef?.label || "ĐĐGck" }
      }
    }
    return { value: "", numericValue: null, columnLabel: ckDef?.label || "ĐĐGck" }
  }

  if (isNonEmptyValue(entry.compositeScore)) {
    return { value: entry.compositeScore, numericValue: toFiniteNumber(entry.compositeScore), columnLabel: defaultLabel }
  }
  if (colDefs.length <= 1 && isNonEmptyValue(comp.col0)) {
    return { value: comp.col0, numericValue: toFiniteNumber(comp.col0), columnLabel: colDefs[0]?.label || defaultLabel }
  }
  if (isNonEmptyValue(entry.ratingValue)) {
    return { value: entry.ratingValue, numericValue: null, columnLabel: defaultLabel }
  }
  return { value: "", numericValue: null, columnLabel: defaultLabel }
}

/**
 * Pick the best entry when a student has multiple entries for the same subject (e.g. GK1 + HK1, or VNEDU + INTERNAL)
 */
export function selectBestEntryForPeriod(
  entriesList: any[],
  config: any,
  evaluationPeriodCode: string
): any | null {
  if (!entriesList || entriesList.length === 0) return null
  if (entriesList.length === 1) return entriesList[0]

  const targetUpper = (evaluationPeriodCode || "").toUpperCase().trim()
  const ranked = [...entriesList].sort((a, b) => {
    const scoreOf = (e: any) => {
      let pts = 0
      const resolved = resolvePeriodColumnValue(e, config, evaluationPeriodCode)
      if (isNonEmptyValue(resolved.value)) pts += 100
      const ep = String(e.evaluationPeriod || "").toUpperCase().trim()
      if (ep === targetUpper) pts += 30
      const ct = String(e.configType || "INTERNAL").toUpperCase()
      if (isKsdnPeriod(evaluationPeriodCode)) {
        if (ct === "INTERNAL") pts += 20
      } else {
        if (ct === "VNEDU") pts += 15
      }
      if (isNonEmptyValue(e.remark)) pts += 5
      return pts
    }
    return scoreOf(b) - scoreOf(a)
  })
  return ranked[0]
}

/**
 * Sanitize Sheet Name to comply with Excel limits (<= 31 chars, no illegal chars: \ / ? * : [ ])
 */
function sanitizeSheetName(rawName: string, existingNames: Set<string>): string {
  let cleaned = (rawName || "Sheet")
    .replace(/[\\/?*:[\]]/g, "_")
    .replace(/\s+/g, " ")
    .trim()

  if (cleaned.length > 28) {
    cleaned = cleaned.substring(0, 28).trim()
  }

  let finalName = cleaned
  let counter = 1
  while (existingNames.has(finalName.toLowerCase())) {
    const suffix = `_${counter}`
    const maxBaseLen = 31 - suffix.length
    finalName = `${cleaned.substring(0, maxBaseLen)}${suffix}`
    counter++
  }

  existingNames.add(finalName.toLowerCase())
  return finalName
}

/**
 * Format Date to dd/MM/yyyy
 */
function formatDate(dateInput: any): string {
  if (!dateInput) return ""
  try {
    const d = new Date(dateInput)
    if (isNaN(d.getTime())) return ""
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return ""
  }
}

/**
 * Find best matching SubjectGradeConfig for a subject & grade
 */
function findConfig(configs: any[], subjectId: string, grade: string, evaluationPeriod: string) {
  const periodUpper = (evaluationPeriod || "").toUpperCase().trim()
  const fallbackSem = periodUpper === "GK1" || periodUpper === "CK1" ? "HK1" : periodUpper === "GK2" || periodUpper === "CK2" ? "HK2" : ""

  const matchPeriod = (c: any) => {
    const p = String(c.evaluationPeriod || "").toUpperCase().trim()
    return p === periodUpper || (fallbackSem && p === fallbackSem) || p === "ALL"
  }

  const subjectConfigs = configs.filter(c => c.subjectId === subjectId)
  if (subjectConfigs.length > 0) {
    const exact = subjectConfigs.find(c => isGradeMatch(c.grade, grade) && String(c.evaluationPeriod || "").toUpperCase() === periodUpper)
    if (exact) return exact
    const match = subjectConfigs.find(c => isGradeMatch(c.grade, grade) && matchPeriod(c))
    if (match) return match
    return subjectConfigs[0]
  }

  const generalConfigs = configs.filter(c => !c.subjectId)
  const genMatch = generalConfigs.find(c => isGradeMatch(c.grade, grade) && matchPeriod(c))
  if (genMatch) return genMatch
  if (generalConfigs.length > 0) return generalConfigs[0]

  return null
}

/**
 * Auto compute column widths for clean Excel layout
 */
function autoFitColumns(rows: any[][]): { wch: number }[] {
  const colWidths: number[] = []
  rows.forEach(row => {
    row.forEach((cell, colIndex) => {
      const cellStr = cell !== null && cell !== undefined ? String(cell) : ""
      const len = cellStr.length
      if (!colWidths[colIndex] || len > colWidths[colIndex]) {
        colWidths[colIndex] = len
      }
    })
  })
  return colWidths.map(w => ({ wch: Math.min(Math.max(w + 3, 10), 50) }))
}

function buildGradeScopeLabel(selectedGrades?: string[]): string {
  if (!selectedGrades || selectedGrades.length === 0) return "Tất cả các Khối"
  return selectedGrades.join(", ")
}

function buildGradeFileTag(selectedGrades?: string[]): string {
  if (!selectedGrades || selectedGrades.length === 0) return ""
  const nums = selectedGrades
    .map(g => extractGradeNumber(g))
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b)
  if (nums.length === 0) return ""
  if (nums.length === 1) return `_K${nums[0]}`
  // Compact range if contiguous (e.g., 6,7,8,9 -> K6-K9)
  const isContiguous = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1)
  if (isContiguous) return `_K${nums[0]}-K${nums[nums.length - 1]}`
  if (nums.length <= 4) return `_K${nums.join("-")}`
  return `_${nums.length}Khoi`
}

/**
 * Pure workbook builder (testable without browser download side-effects)
 */
export function buildBulkGradeWorkbook(options: BulkExportOptions): { workbook: XLSX.WorkBook; fileName: string } {
  const {
    campusName = "CoSo",
    academicYearName = "2026-2027",
    evaluationPeriodCode = "KSDN",
    evaluationPeriodName = "Khảo sát đầu năm (KSĐN)",
    selectedGrades = [],
    classes = [],
    students = [],
    subjects = [],
    configs = [],
    entries = [],
    includeOverviewSheet = true,
    includeMasterSummarySheet = true,
    onlyPeriodScoreColumn = false,
    onProgress
  } = options

  onProgress?.(5, "Đang khởi tạo cấu trúc Sổ điểm...")

  const workbook = XLSX.utils.book_new()
  const sheetNamesUsed = new Set<string>()
  const gradeScopeLabel = buildGradeScopeLabel(selectedGrades)
  const periodScoreLabel = getPeriodScoreColumnLabel(evaluationPeriodCode)

  // Map quick lookup
  const classMap = new Map<string, any>()
  const presentGrades = new Set<string>()
  let hasSecondaryOrHighClasses = false
  classes.forEach(c => {
    classMap.set(c.id, c)
    if (c.grade) presentGrades.add(c.grade)
    const gn = extractGradeNumber(c.className) ?? extractGradeNumber(c.grade)
    if (gn !== null && gn >= 6) hasSecondaryOrHighClasses = true
  })

  // Group students by grade -> class -> name
  const studentsSorted = [...students].sort((a, b) => {
    const clsA = classMap.get(a.classId)
    const clsB = classMap.get(b.classId)
    const gradeA = clsA?.grade || ""
    const gradeB = clsB?.grade || ""
    if (gradeA !== gradeB) return gradeA.localeCompare(gradeB, "vi", { numeric: true })
    const nameA = clsA?.className || ""
    const nameB = clsB?.className || ""
    if (nameA !== nameB) return nameA.localeCompare(nameB, "vi", { numeric: true })
    return a.studentName.localeCompare(b.studentName, "vi")
  })

  // Group entries by `${studentId}_${subjectId}` (preserving multiple period/configType candidates)
  const entriesByKey = new Map<string, any[]>()
  entries.forEach(e => {
    const k = `${e.studentId}_${e.subjectId}`
    const list = entriesByKey.get(k) || []
    list.push(e)
    entriesByKey.set(k, list)
  })

  const getStudentSubjectEntryAndConfig = (st: any, subjId: string) => {
    const cls = classMap.get(st.classId)
    const stGrade = cls?.grade || ""
    const conf = findConfig(configs, subjId, stGrade, evaluationPeriodCode)
    const candidates = entriesByKey.get(`${st.id}_${subjId}`) || []
    const entry = selectBestEntryForPeriod(candidates, conf, evaluationPeriodCode)
    return { entry, config: conf, cls }
  }

  // -------------------------------------------------------------
  // 1. SHEET TỔNG QUAN BÁO CÁO & THỐNG KÊ (OVERVIEW DASHBOARD)
  // -------------------------------------------------------------
  if (includeOverviewSheet) {
    onProgress?.(15, "Đang tạo Sheet Báo cáo Tổng quan & Thống kê...")
    const overviewRows: any[][] = [
      ["HỆ THỐNG GIÁO DỤC SKY-LINE - BÁO CÁO TỔNG QUAN TIẾN ĐỘ & PHỔ ĐIỂM"],
      [
        `Cơ sở: ${campusName} | Khối áp dụng: ${gradeScopeLabel} | Kỳ khảo sát: ${evaluationPeriodName}${
          periodScoreLabel ? ` (Cột điểm: ${periodScoreLabel})` : ""
        } | Năm học: ${academicYearName}`
      ],
      [`Thời gian xuất file: ${new Date().toLocaleString("vi-VN")}`],
      [],
      [
        "STT",
        "Mã môn",
        "Tên môn học",
        "Tổng số HS",
        "Đã có điểm",
        "Chưa có điểm",
        "Tỷ lệ nhập (%)",
        "Điểm TB môn",
        "Giỏi (>= 8.0)",
        "Tỷ lệ Giỏi (%)",
        "Khá (6.5 - 7.9)",
        "Tỷ lệ Khá (%)",
        "Đạt (5.0 - 6.4)",
        "Tỷ lệ Đạt (%)",
        "Chưa đạt (< 5.0)",
        "Tỷ lệ Chưa đạt (%)"
      ]
    ]

    const totalStudentsCount = studentsSorted.length

    subjects.forEach((subj, idx) => {
      let gradedCount = 0
      let numericCount = 0
      let totalScore = 0
      let gioCount = 0
      let khaCount = 0
      let datCount = 0
      let yeuCount = 0

      studentsSorted.forEach(st => {
        const { entry, config } = getStudentSubjectEntryAndConfig(st, subj.id)
        const resolved = resolvePeriodColumnValue(entry, config, evaluationPeriodCode)
        if (isNonEmptyValue(resolved.value)) {
          gradedCount++
          if (resolved.numericValue !== null) {
            const score = resolved.numericValue
            numericCount++
            totalScore += score
            if (score >= 8.0) gioCount++
            else if (score >= 6.5) khaCount++
            else if (score >= 5.0) datCount++
            else yeuCount++
          }
        }
      })

      const rate = totalStudentsCount > 0 ? ((gradedCount / totalStudentsCount) * 100).toFixed(1) : "0.0"
      const avg = numericCount > 0 ? (totalScore / numericCount).toFixed(2) : "-"
      const rateGio = numericCount > 0 ? ((gioCount / numericCount) * 100).toFixed(1) : "0.0"
      const rateKha = numericCount > 0 ? ((khaCount / numericCount) * 100).toFixed(1) : "0.0"
      const rateDat = numericCount > 0 ? ((datCount / numericCount) * 100).toFixed(1) : "0.0"
      const rateYeu = numericCount > 0 ? ((yeuCount / numericCount) * 100).toFixed(1) : "0.0"

      overviewRows.push([
        idx + 1,
        subj.subjectCode,
        subj.subjectName,
        totalStudentsCount,
        gradedCount,
        totalStudentsCount - gradedCount,
        `${rate}%`,
        avg,
        gioCount,
        `${rateGio}%`,
        khaCount,
        `${rateKha}%`,
        datCount,
        `${rateDat}%`,
        yeuCount,
        `${rateYeu}%`
      ])
    })

    const wsOverview = XLSX.utils.aoa_to_sheet(overviewRows)
    wsOverview["!cols"] = autoFitColumns(overviewRows)
    const overviewSheetName = sanitizeSheetName("00_TongQuan_BaoCao", sheetNamesUsed)
    XLSX.utils.book_append_sheet(workbook, wsOverview, overviewSheetName)
  }

  // -------------------------------------------------------------
  // 2. SHEET BẢNG ĐIỂM TỔNG HỢP TOÀN MÔN (STUDENT MASTER SHEET)
  // -------------------------------------------------------------
  if (includeMasterSummarySheet) {
    onProgress?.(30, "Đang tạo Sheet Bảng điểm Tổng hợp Toàn Môn...")
    const masterHeaders = [
      "STT",
      "Khối",
      "Lớp",
      "Mã HS",
      "Mã vnEdu",
      "Họ và tên",
      "Ngày sinh",
      "Giới tính"
    ]
    subjects.forEach(s => {
      masterHeaders.push(periodScoreLabel ? `${s.subjectName} (${periodScoreLabel})` : s.subjectName)
    })
    masterHeaders.push("ĐTB Toàn môn", "Số môn đã có điểm")

    const masterRows: any[][] = [
      ["HỆ THỐNG GIÁO DỤC SKY-LINE - BẢNG ĐIỂM TỔNG HỢP CÁC MÔN HỌC SINH"],
      [
        `Cơ sở: ${campusName} | Khối áp dụng: ${gradeScopeLabel} | Kỳ khảo sát: ${evaluationPeriodName}${
          periodScoreLabel ? ` (Cột điểm: ${periodScoreLabel})` : ""
        } | Năm học: ${academicYearName}`
      ],
      [`Thời gian xuất file: ${new Date().toLocaleString("vi-VN")}`],
      [],
      masterHeaders
    ]

    studentsSorted.forEach((st, idx) => {
      const cls = classMap.get(st.classId)
      const row: any[] = [
        idx + 1,
        cls?.grade || "",
        cls?.className || "",
        String(st.studentCode || ""),
        String(st.vnEduCode || ""),
        st.studentName,
        formatDate(st.dateOfBirth),
        st.gender || ""
      ]

      let stGradedCount = 0
      let stNumericCount = 0
      let stScoreSum = 0

      subjects.forEach(subj => {
        const { entry, config } = getStudentSubjectEntryAndConfig(st, subj.id)
        const resolved = resolvePeriodColumnValue(entry, config, evaluationPeriodCode)
        if (isNonEmptyValue(resolved.value)) {
          row.push(resolved.numericValue !== null ? resolved.numericValue : resolved.value)
          stGradedCount++
          if (resolved.numericValue !== null) {
            stNumericCount++
            stScoreSum += resolved.numericValue
          }
        } else {
          row.push("")
        }
      })

      const stAvg = stNumericCount > 0 ? (stScoreSum / stNumericCount).toFixed(2) : ""
      row.push(stAvg, stGradedCount)
      masterRows.push(row)
    })

    const wsMaster = XLSX.utils.aoa_to_sheet(masterRows)
    wsMaster["!cols"] = autoFitColumns(masterRows)
    const masterSheetName = sanitizeSheetName("TongHop_DiemHS", sheetNamesUsed)
    XLSX.utils.book_append_sheet(workbook, wsMaster, masterSheetName)
  }

  // -------------------------------------------------------------
  // 3. TẠO CÁC SHEET TỪNG MÔN HỌC (SUBJECT SHEETS)
  // -------------------------------------------------------------
  const totalSubj = subjects.length
  const useFocusedPeriodColumn = Boolean(onlyPeriodScoreColumn && periodScoreLabel)

  for (let sIdx = 0; sIdx < totalSubj; sIdx++) {
    const subj = subjects[sIdx]
    const currentProgress = 35 + Math.round(((sIdx + 1) / totalSubj) * 60)
    onProgress?.(currentProgress, `Đang xử lý Sheet môn: ${subj.subjectName} (${sIdx + 1}/${totalSubj})...`)

    const headers = [
      "STT",
      "Khối",
      "Lớp",
      "Mã HS",
      "Mã vnEdu",
      "Họ và tên",
      "Ngày sinh",
      "Giới tính"
    ]

    let colDefs: ParsedColDef[] = []
    let compositeTitle = "Điểm thành phần / Tổng kết"
    let hasComposite = true
    let hasRating = false
    let ratingTitle = "Xếp loại"
    let hasRemark = true

    if (useFocusedPeriodColumn && periodScoreLabel) {
      headers.push(periodScoreLabel)
      headers.push("Nhận xét")
    } else {
      // Lọc cấu hình khớp với các khối đang xuất trước, nếu không có mới lấy tất cả cấu hình của môn
      const allSubjConfigs = configs.filter(c => c.subjectId === subj.id)
      const gradeMatchedConfigs =
        presentGrades.size > 0
          ? allSubjConfigs.filter(c =>
              Array.from(presentGrades).some(g => isGradeMatch(c.grade, g))
            )
          : allSubjConfigs
      const subjConfigs = gradeMatchedConfigs.length > 0 ? gradeMatchedConfigs : allSubjConfigs

      if (subjConfigs.length > 0) {
        const bestConf = subjConfigs.reduce(
          (max, c) => ((c.columnCount || 0) > (max?.columnCount || 0) ? c : max),
          subjConfigs[0]
        )
        colDefs = parseColumnDefs(bestConf)
        compositeTitle = bestConf.compositeColumnName || "Điểm thành phần"
        hasComposite = bestConf.hasCompositeColumn !== false
        hasRating = Boolean(bestConf.hasRatingColumn)
        ratingTitle = bestConf.ratingColumnName || "Xếp loại"
        hasRemark = bestConf.hasRemarkColumn !== false
      } else if (hasSecondaryOrHighClasses && (isGkPeriod(evaluationPeriodCode) || isCkPeriod(evaluationPeriodCode) || evaluationPeriodCode === "HK1" || evaluationPeriodCode === "HK2")) {
        // Mặc định chuẩn Thông tư 22 / vnEdu cho THCS & THPT
        colDefs = [
          { key: "col0", label: "TX1", group: "TX", attempt: 1, scaleCode: "SCORE_10", maxScore: 10 },
          { key: "col1", label: "TX2", group: "TX", attempt: 2, scaleCode: "SCORE_10", maxScore: 10 },
          { key: "col2", label: "TX3", group: "TX", attempt: 3, scaleCode: "SCORE_10", maxScore: 10 },
          { key: "col3", label: "TX4", group: "TX", attempt: 4, scaleCode: "SCORE_10", maxScore: 10 },
          { key: "col4", label: "ĐĐGgk", group: "GK", attempt: 1, scaleCode: "SCORE_10", maxScore: 10 },
          { key: "col5", label: "ĐĐGck", group: "CK", attempt: 1, scaleCode: "SCORE_10", maxScore: 10 }
        ]
        compositeTitle = "ĐTBmhk"
        hasComposite = true
        hasRating = false
        hasRemark = true
      } else {
        colDefs = [{ key: "col0", label: periodScoreLabel || "Điểm ĐĐGTX", scaleCode: "SCORE_10", maxScore: 10 }]
      }

      colDefs.forEach(def => {
        const colMax = def.maxScore || 10
        headers.push(colMax !== 10 ? `${def.label} (Tối đa ${colMax}đ)` : def.label)
      })

      if (hasComposite) headers.push(compositeTitle)
      if (hasRating) headers.push(ratingTitle)
      if (hasRemark) headers.push("Nhận xét")
    }

    const subjectRows: any[][] = [
      [`HỆ THỐNG GIÁO DỤC SKY-LINE - BẢNG ĐIỂM CHI TIẾT MÔN ${subj.subjectName.toUpperCase()}`],
      [
        `Cơ sở: ${campusName} | Khối áp dụng: ${gradeScopeLabel} | Môn: ${subj.subjectName} (${subj.subjectCode}) | Kỳ đánh giá: ${evaluationPeriodName} | Năm học: ${academicYearName}`
      ],
      [`Thời gian xuất file: ${new Date().toLocaleString("vi-VN")}`],
      [],
      headers
    ]

    studentsSorted.forEach((st, idx) => {
      const { entry: ent, config: stConfig, cls } = getStudentSubjectEntryAndConfig(st, subj.id)
      const componentMap = parseComponentScores(ent?.componentScores)

      const row: any[] = [
        idx + 1,
        cls?.grade || "",
        cls?.className || "",
        String(st.studentCode || ""),
        String(st.vnEduCode || ""),
        st.studentName,
        formatDate(st.dateOfBirth),
        st.gender || ""
      ]

      if (useFocusedPeriodColumn) {
        const resolved = resolvePeriodColumnValue(ent, stConfig, evaluationPeriodCode)
        row.push(resolved.numericValue !== null ? resolved.numericValue : resolved.value)
        row.push(ent?.remark || "")
      } else {
        colDefs.forEach((def, cIdx) => {
          const val = resolveColumnCellValue(componentMap, def, cIdx)
          row.push(val !== undefined && val !== null ? val : "")
        })

        if (hasComposite) {
          row.push(ent?.compositeScore !== undefined && ent?.compositeScore !== null ? ent.compositeScore : "")
        }
        if (hasRating) {
          row.push(ent?.ratingValue || "")
        }
        if (hasRemark) {
          row.push(ent?.remark || "")
        }
      }

      subjectRows.push(row)
    })

    const wsSubj = XLSX.utils.aoa_to_sheet(subjectRows)
    wsSubj["!cols"] = autoFitColumns(subjectRows)
    const subjSheetName = sanitizeSheetName(subj.subjectName || subj.subjectCode, sheetNamesUsed)
    XLSX.utils.book_append_sheet(workbook, wsSubj, subjSheetName)
  }

  const cleanCampus = campusName.replace(/\s+/g, "_")
  const gradeFileTag = buildGradeFileTag(selectedGrades)
  const fileName = `BangDiem_${cleanCampus}${gradeFileTag}_${evaluationPeriodCode}_${academicYearName.replace(/\s+/g, "")}.xlsx`

  return { workbook, fileName }
}

/**
 * Main Bulk Export Function
 */
export async function generateBulkGradeExcel(options: BulkExportOptions) {
  const { workbook, fileName } = buildBulkGradeWorkbook(options)
  options.onProgress?.(98, "Đang đóng gói và hoàn tất tải file Excel...")
  XLSX.writeFile(workbook, fileName)
  options.onProgress?.(100, "Xuất file Excel thành công!")
}
