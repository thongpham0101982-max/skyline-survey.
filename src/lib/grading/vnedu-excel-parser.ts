import * as XLSX from "xlsx"

export interface ParsedVnEduColumn {
  colIndex: number
  headerLabel: string
  tier1Label: string
  tier2Label: string
  normalizedHeader: string
  isHidden: boolean
  role: "STT" | "VNEDU_CODE" | "FULL_NAME" | "LAST_NAME" | "FIRST_NAME" | "DOB" | "SCORE_OR_VALUE" | "COMPOSITE_REF" | "RATING" | "REMARK" | "UNKNOWN"
}

export interface ParsedVnEduRow {
  rowIndex: number // 1-based Excel row number
  stt: string
  vnEduCode: string
  fullName: string
  dob: string
  valuesByColIndex: Record<number, string>
  valuesByHeader: Record<string, string>
  formulaErrors: Array<{ colIndex: number; header: string; message: string }>
  isEmptyResultRow: boolean
}

export interface ParsedVnEduSheet {
  fileName: string
  sheetName: string
  detectedSubject: string
  detectedClass: string
  detectedAcademicYear: string
  detectedPeriod: string
  metadataConflicts: string[]
  warnings: string[]
  headerRowStart: number // 1-based
  headerRowEnd: number   // 1-based
  columns: ParsedVnEduColumn[]
  rows: ParsedVnEduRow[]
  skippedFooterStartRow: number | null
}

export interface ParsedVnEduWorkbookResult {
  fileName: string
  warnings: string[]
  usedFallbackParser: boolean
  sheets: ParsedVnEduSheet[]
}

const FOOTER_STOP_PATTERNS = [
  /^thống\s*kê/i,
  /^tổng\s*(số|cộng)/i,
  /^giáo\s*viên/i,
  /^gvbm/i,
  /^gvcn/i,
  /^hiệu\s*trưởng/i,
  /^ban\s*giám\s*hiệu/i,
  /^ký\s*tên/i,
  /^xác\s*nhận/i,
  /^ngày\s+\d*\s*tháng/i,
  /^tỉ\s*lệ|^tỷ\s*lệ/i,
  /^ghi\s*chú\s*:/i,
  /^trung\s*bình\s*chung/i,
  /^số\s*học\s*sinh/i,
  /^hoàn\s*thành\s*tốt/i,
]

export function normalizeVietnameseText(input: string): string {
  return String(input || "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
}

export function normalizeHeaderKey(input: string): string {
  return normalizeVietnameseText(input)
    .toLowerCase()
    .replace(/[._\-:/\\()[\]]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Format an Excel cell value as string without losing leading zeros or introducing .0 / scientific notation.
 */
export function readCodeCellAsText(cell: XLSX.CellObject | undefined): string {
  if (!cell) return ""
  // Prefer formatted text if it looks like an integer/code without scientific notation
  if (typeof cell.w === "string") {
    const w = cell.w.trim()
    if (w && !/[eE][+-]?\d+/.test(w) && !/^\d+\.0+$/.test(w)) {
      return w
    }
  }
  if (cell.v === undefined || cell.v === null) return ""
  if (typeof cell.v === "number") {
    if (!isFinite(cell.v)) return ""
    // Convert integer or scientific-notation number to full plain digits
    if (Number.isInteger(cell.v)) {
      return cell.v.toLocaleString("fullwide", { useGrouping: false })
    }
    const fixed = String(cell.v)
    if (fixed.includes("e") || fixed.includes("E")) {
      return Math.round(cell.v).toLocaleString("fullwide", { useGrouping: false })
    }
    return fixed.replace(/\.0+$/, "")
  }
  return String(cell.v).trim().replace(/\.0+$/, "")
}

/**
 * Safely read a cell's cached value without executing formulas or converting missing formula cache to 0.
 */
export function readSafeCellValue(
  cell: XLSX.CellObject | undefined,
  headerLabel: string,
  colIndex: number
): { value: string; formulaError?: { colIndex: number; header: string; message: string } } {
  if (!cell) return { value: "" }

  if (cell.t === "e") {
    return {
      value: "",
      formulaError: {
        colIndex,
        header: headerLabel,
        message: `Ô "${headerLabel}" chứa lỗi công thức (${cell.w || cell.v || "#ERROR"})`,
      },
    }
  }

  if (cell.f && (cell.v === undefined || cell.v === null || String(cell.v).trim() === "")) {
    return {
      value: "",
      formulaError: {
        colIndex,
        header: headerLabel,
        message: `Ô "${headerLabel}" chứa công thức chưa có giá trị lưu sẵn hợp lệ`,
      },
    }
  }

  if (cell.v === undefined || cell.v === null) {
    return { value: "" }
  }

  if (cell.t === "d" && cell.v instanceof Date) {
    const d = cell.v
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const yyyy = d.getFullYear()
    return { value: `${dd}/${mm}/${yyyy}` }
  }

  if (typeof cell.v === "number") {
    if (!isFinite(cell.v)) return { value: "" }
    // Keep 0 as "0"!
    if (cell.w && typeof cell.w === "string" && cell.w.trim() !== "") {
      // Check if formatted date
      if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(cell.w.trim())) {
        return { value: cell.w.trim() }
      }
    }
    return { value: String(cell.v) }
  }

  return { value: String(cell.v).trim() }
}

function getMergeMasterValue(sheet: XLSX.WorkSheet, r: number, c: number): XLSX.CellObject | undefined {
  const directAddr = XLSX.utils.encode_cell({ r, c })
  const direct = sheet[directAddr]
  if (direct && direct.v !== undefined && direct.v !== null && String(direct.v).trim() !== "") {
    return direct
  }
  const merges: XLSX.Range[] = sheet["!merges"] || []
  for (const m of merges) {
    if (r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c) {
      const masterAddr = XLSX.utils.encode_cell({ r: m.s.r, c: m.s.c })
      return sheet[masterAddr]
    }
  }
  return direct
}

function normalizeHeaderCellText(input: string): string {
  // Join mid-word line breaks common in narrow vnEdu Excel columns (e.g. "ĐĐGg\nk" -> "ĐĐGgk", "ĐTB\nmhk" -> "ĐTBmhk")
  const joinedMidWord = String(input || "")
    .normalize("NFC")
    .replace(/([a-zA-ZÀ-ỹĐđ])\s*[\r\n]+\s*([a-zA-ZÀ-ỹĐđ])/g, "$1$2")
  return normalizeVietnameseText(joinedMidWord)
}

const SHEET_SLUG_SUBJECT_MAP: Record<string, string> = {
  khoa_hoc_tu_nhien: "Khoa học tự nhiên",
  khtn: "Khoa học tự nhiên",
  tin_hoc: "Tin học",
  tin_hoc_va_cong_nghe: "Tin học và Công nghệ",
  ngu_van: "Ngữ văn",
  ngoai_ngu: "Ngoại ngữ",
  ngoai_ngu_1: "Ngoại ngữ",
  tieng_anh: "Tiếng Anh",
  gdcd: "Giáo dục công dân",
  giao_duc_cong_dan: "Giáo dục công dân",
  cong_nghe: "Công nghệ",
  giao_duc_the_chat: "Giáo dục thể chất",
  gdtc: "Giáo dục thể chất",
  the_duc: "Giáo dục thể chất",
  toan: "Toán học",
  toan_hoc: "Toán học",
  tieng_viet: "Tiếng Việt",
  lich_su_va_dia_li: "Lịch sử và Địa lí",
  lich_su_va_dia_ly: "Lịch sử và Địa lí",
  lich_su_dia_li: "Lịch sử và Địa lí",
  lich_su_dia_ly: "Lịch sử và Địa lí",
  ls_dl: "Lịch sử và Địa lí",
  lich_su: "Lịch sử",
  dia_li: "Địa lí",
  dia_ly: "Địa lí",
  vat_li: "Vật lí",
  vat_ly: "Vật lí",
  hoa_hoc: "Hóa học",
  sinh_hoc: "Sinh học",
  nghe_thuat: "Nghệ thuật",
  am_nhac: "Âm nhạc",
  mi_thuat: "Mĩ thuật",
  my_thuat: "Mỹ thuật",
  hoat_dong_trai_nghiem: "Hoạt động trải nghiệm, hướng nghiệp",
  hoat_dong_trai_nghiem_huong_nghiep: "Hoạt động trải nghiệm, hướng nghiệp",
  hdtn: "Hoạt động trải nghiệm, hướng nghiệp",
  hdtn_hn: "Hoạt động trải nghiệm, hướng nghiệp",
  noi_dung_giao_duc_cua_dia_phuong: "Nội dung giáo dục của địa phương",
  giao_duc_dia_phuong: "Nội dung giáo dục của địa phương",
  gd_dia_phuong: "Nội dung giáo dục của địa phương",
  gddp: "Nội dung giáo dục của địa phương",
  giao_duc_kinh_te_va_phap_luat: "Giáo dục kinh tế và pháp luật",
  kinh_te_phap_luat: "Giáo dục kinh tế và pháp luật",
  gdkt_pl: "Giáo dục kinh tế và pháp luật",
  gdktpl: "Giáo dục kinh tế và pháp luật",
  giao_duc_quoc_phong_va_an_ninh: "Giáo dục quốc phòng và an ninh",
  quoc_phong_an_ninh: "Giáo dục quốc phòng và an ninh",
  gdqp_an: "Giáo dục quốc phòng và an ninh",
  gdqp: "Giáo dục quốc phòng và an ninh",
  dao_duc: "Đạo đức",
  tu_nhien_va_xa_hoi: "Tự nhiên và Xã hội",
  tn_xh: "Tự nhiên và Xã hội",
  tnxh: "Tự nhiên và Xã hội",
  khoa_hoc: "Khoa học",
}

function parseSheetSlugSubjectAndClass(sheetName: string, fileName?: string): { subjectFromSlug: string; classFromSlug: string } {
  const cleanSheet = normalizeVietnameseText(sheetName).trim()
  let subjectFromSlug = ""
  let classFromSlug = ""

  // Pattern e.g. "cong_nghe_6_1_cs1", "khoa_hoc_tu_nhien_6_1_cs1", "giao_duc_the_chat_6_1_cs1"
  const m = cleanSheet.match(/^([a-zA-Z0-9_]+?)_(\d+[./_]\d+(?:[_.-]?cs\d+)?)$/i)
  if (m) {
    const rawSubjSlug = m[1].toLowerCase().replace(/^mon_/, "").trim()
    classFromSlug = m[2]
    subjectFromSlug = SHEET_SLUG_SUBJECT_MAP[rawSubjSlug] || rawSubjSlug.replace(/_/g, " ")
  } else {
    const lowerSlug = cleanSheet.toLowerCase().replace(/[\s-]+/g, "_")
    if (SHEET_SLUG_SUBJECT_MAP[lowerSlug]) {
      subjectFromSlug = SHEET_SLUG_SUBJECT_MAP[lowerSlug]
    }
  }

  if (!classFromSlug && fileName) {
    const baseFile = fileName.replace(/\.(xlsx|xls)$/i, "")
    const fm = baseFile.match(/(?:lop|class)?[_-]?(\d+[./_]\d+(?:[_.-]?cs\d+)?)$/i)
    if (fm) {
      classFromSlug = fm[1]
    }
  }

  return { subjectFromSlug, classFromSlug }
}

function classifyColumnRole(headerNorm: string): ParsedVnEduColumn["role"] {
  if (!headerNorm) return "UNKNOWN"
  const compact = headerNorm.replace(/\s+/g, "")
  if (headerNorm === "stt" || headerNorm === "tt" || headerNorm === "số tt") return "STT"
  if (
    headerNorm.includes("mã hs") ||
    headerNorm.includes("ma hs") ||
    headerNorm.includes("mã học sinh") ||
    headerNorm.includes("ma hoc sinh") ||
    headerNorm.includes("mã vnedu") ||
    headerNorm.includes("ma vnedu") ||
    headerNorm === "mã" ||
    headerNorm === "ma" ||
    headerNorm === "mã định danh"
  ) {
    return "VNEDU_CODE"
  }
  if (headerNorm === "họ" || headerNorm === "ho" || headerNorm === "họ đệm" || headerNorm === "ho dem" || headerNorm === "họ và tên đệm") {
    return "LAST_NAME"
  }
  if (headerNorm === "tên" || headerNorm === "ten") {
    return "FIRST_NAME"
  }
  if (headerNorm.includes("họ và tên") || headerNorm.includes("ho va ten") || headerNorm.includes("họ tên") || headerNorm.includes("ho ten")) {
    return "FULL_NAME"
  }
  if (headerNorm.includes("ngày sinh") || headerNorm.includes("ngay sinh") || headerNorm === "dob") {
    return "DOB"
  }
  if (
    headerNorm.includes("đtbmhk") ||
    headerNorm.includes("dtbmhk") ||
    compact.includes("đtbmhk") ||
    compact.includes("dtbmhk") ||
    headerNorm.includes("đtb môn") ||
    headerNorm.includes("dtb mon") ||
    headerNorm === "đtb" ||
    headerNorm === "dtb" ||
    headerNorm.includes("điểm tb") ||
    headerNorm.includes("tb cả năm") ||
    headerNorm.includes("tổng hợp")
  ) {
    return "COMPOSITE_REF"
  }
  if (headerNorm.includes("nhận xét") || headerNorm.includes("nhan xet") || headerNorm === "nx") {
    return "REMARK"
  }
  if (headerNorm.includes("xếp loại") || headerNorm.includes("xep loai") || headerNorm.startsWith("xl ")) {
    return "RATING"
  }
  return "SCORE_OR_VALUE"
}

function extractMetadataFromTopRows(
  sheet: XLSX.WorkSheet,
  maxRow: number,
  maxCol: number,
  sheetName: string,
  fileName?: string
) {
  let detectedSubject = ""
  let detectedClass = ""
  let detectedAcademicYear = ""
  let detectedPeriod = ""
  const metadataConflicts: string[] = []

  const topTexts: string[] = []
  for (let r = 0; r < maxRow; r++) {
    const rowParts: string[] = []
    for (let c = 0; c <= maxCol; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      const cell = sheet[addr]
      if (cell && cell.v !== undefined && cell.v !== null) {
        const txt = normalizeVietnameseText(String(cell.v))
        if (txt) rowParts.push(txt)
      }
    }
    if (rowParts.length > 0) topTexts.push(rowParts.join(" | "))
  }

  for (const line of topTexts) {
    // Subject (supports both "Môn: Toán học" and "BẢNG ĐIỂM CHI TIẾT - MÔN CÔNG NGHỆ - HỌC KỲ 1 - NĂM HỌC 2026-2027")
    if (!detectedSubject) {
      const subColonMatch = line.match(
        /(?:môn(?:\s*học)?)\s*:\s*([^|;\n]+?)(?=\s+(?:kỳ\s*:|năm\s+học\s*:|lớp\s*:|học\s+kỳ\s*[12iI]+\s*:)|\s*[-–—]\s*(?:học\s*kỳ|kỳ|năm\s*học|lớp)|\s*$|\s*\|)/i
      )
      if (subColonMatch) {
        detectedSubject = subColonMatch[1].trim()
      } else {
        const subDashMatch = line.match(
          /(?:bảng\s*điểm[^-–—|]*[-–—]\s*)?\bmôn(?:\s*học)?\s+([^-–—|;\n:]+?)(?=\s*[-–—|]\s*(?:học\s*kỳ|kỳ|năm\s*học|lớp|khối)|\s+(?:kỳ\s*:|năm\s+học|lớp|học\s+kỳ)|\s*$)/i
        )
        if (subDashMatch) {
          detectedSubject = subDashMatch[1].trim()
        }
      }
    }

    // Class (supports both "Lớp: 6/1_CS1" and "Khối 6 - Lớp 6/1_CS1")
    if (!detectedClass) {
      const clsColonMatch = line.match(
        /(?:lớp(?:\s*học)?)\s*:\s*([^|;\n]+?)(?=\s+(?:kỳ\s*:|năm\s+học\s*:|môn(?:\s*học)?\s*:|gv\s*:|học\s+kỳ\s*[12iI]+\s*:)|\s*$|\s*\|)/i
      )
      if (clsColonMatch) {
        detectedClass = clsColonMatch[1].trim()
      } else {
        const clsSpaceMatch = line.match(
          /\blớp(?:\s*học)?\s+([0-9A-Za-z/_.-]+?)(?=\s*[-–—|;]|\s+(?:kỳ|năm\s+học|môn|gv|học\s+kỳ)|\s*$)/i
        )
        if (clsSpaceMatch) {
          detectedClass = clsSpaceMatch[1].trim()
        }
      }
    }

    // Academic year (supports "2026-2027", "2026 - 2027", "2026 2027")
    const yearMatch =
      line.match(/(?:năm\s*học)\s*:?\s*(\d{4}\s*[-–\s]\s*\d{4})/i) ||
      line.match(/(\d{4}\s*[-–]\s*\d{4})/)
    if (yearMatch && !detectedAcademicYear) {
      const yDigits = yearMatch[1].match(/(\d{4})\D+(\d{4})/)
      detectedAcademicYear = yDigits ? `${yDigits[1]}-${yDigits[2]}` : yearMatch[1].replace(/\s+/g, "").replace("–", "-")
    }

    // Period
    if (!detectedPeriod) {
      if (/\bGK\s*1\b|giữa\s*(?:học\s*)?kỳ\s*(?:1|I)\b/i.test(line)) detectedPeriod = "GK1"
      else if (/\bCK\s*1\b|cuối\s*(?:học\s*)?kỳ\s*(?:1|I)\b/i.test(line)) detectedPeriod = "CK1"
      else if (/\bGK\s*2\b|giữa\s*(?:học\s*)?kỳ\s*(?:2|II)\b/i.test(line)) detectedPeriod = "GK2"
      else if (/\bCK\s*2\b|cuối\s*(?:học\s*)?kỳ\s*(?:2|II)\b/i.test(line)) detectedPeriod = "CK2"
      else if (/học\s*kỳ\s*(?:1|I)\b|\bHK\s*1\b/i.test(line)) detectedPeriod = "HK1"
      else if (/học\s*kỳ\s*(?:2|II)\b|\bHK\s*2\b/i.test(line)) detectedPeriod = "HK2"
      else if (/cả\s*năm/i.test(line)) detectedPeriod = "CN"
    }
  }

  // Fallback / conflict check with sheetName & slug pattern (e.g. "cong_nghe_6_1_cs1")
  const sheetTrim = normalizeVietnameseText(sheetName)
  const { subjectFromSlug, classFromSlug } = parseSheetSlugSubjectAndClass(sheetTrim, fileName)
  const sheetClassLike = /^(\d+[./_]\d+(?:[_a-zA-Z0-9]*)?)$/.test(sheetTrim)
  if (sheetClassLike) {
    const normSheetCls = sheetTrim.replace(/_/g, ".").replace(/\//g, ".")
    if (!detectedClass) {
      detectedClass = sheetTrim
    } else {
      const normDetCls = detectedClass.replace(/^lớp\s*/i, "").replace(/_/g, ".").replace(/\//g, ".").trim()
      if (normDetCls && !normDetCls.toLowerCase().includes(normSheetCls.toLowerCase()) && !normSheetCls.toLowerCase().includes(normDetCls.toLowerCase())) {
        metadataConflicts.push(`Tên sheet "${sheetTrim}" khác với lớp trong tiêu đề "${detectedClass}"`)
      }
    }
  } else {
    if (!detectedClass && classFromSlug) {
      detectedClass = classFromSlug
    }
    if (!detectedSubject) {
      if (subjectFromSlug) {
        detectedSubject = subjectFromSlug
      } else if (sheetTrim && !/^sheet\d+$/i.test(sheetTrim)) {
        detectedSubject = sheetTrim
      }
    }
  }

  return {
    detectedSubject,
    detectedClass,
    detectedAcademicYear,
    detectedPeriod,
    metadataConflicts,
  }
}

function findHeaderRows(sheet: XLSX.WorkSheet, maxRow: number, maxCol: number): { start: number; end: number } | null {
  for (let r = 0; r < Math.min(maxRow, 20); r++) {
    let hasStt = false
    let hasName = false
    let hasCode = false
    for (let c = 0; c <= maxCol; c++) {
      const cell = getMergeMasterValue(sheet, r, c)
      const val = normalizeHeaderKey(cell?.v !== undefined ? String(cell.v) : "")
      if (val === "stt" || val === "tt") hasStt = true
      if (val.includes("họ và tên") || val.includes("họ tên") || val === "họ" || val === "tên") hasName = true
      if (val.includes("mã hs") || val.includes("mã học sinh") || val.includes("mã vnedu") || val === "mã") hasCode = true
    }
    if ((hasStt && hasName) || (hasCode && hasName)) {
      // Check if next row is a tier-2 subheader (e.g. TX1, TX2, TX3, TX4 under ĐDGtx)
      let hasTier2 = false
      if (r + 1 < maxRow) {
        let tier2Hits = 0
        for (let c = 0; c <= maxCol; c++) {
          const directNext = sheet[XLSX.utils.encode_cell({ r: r + 1, c })]
          const txt = normalizeHeaderKey(directNext?.v !== undefined ? String(directNext.v) : "")
          if (txt && (/^(tx\s*\d+|l\d+|đdg|kt|gk|ck|xl)/.test(txt) || txt.length <= 12) && !/^\d+$/.test(txt)) {
            // Check it's not a student row (student row usually has STT = 1 in col A)
            const firstCol = sheet[XLSX.utils.encode_cell({ r: r + 1, c: 0 })]
            if (firstCol?.v !== 1 && String(firstCol?.v || "").trim() !== "1") {
              tier2Hits++
            }
          }
        }
        if (tier2Hits >= 2) hasTier2 = true
      }
      return { start: r, end: hasTier2 ? r + 1 : r }
    }
  }
  return null
}

/**
 * Parse a .xls or .xlsx buffer exported from vnEdu safely.
 */
export function parseVnEduWorkbook(buffer: Buffer, fileName: string): ParsedVnEduWorkbookResult {
  const warnings: string[] = []
  let usedFallbackParser = false
  let workbook: XLSX.WorkBook | null = null

  try {
    workbook = XLSX.read(buffer, {
      type: "buffer",
      cellFormula: true, // read formula string ONLY to detect un-cached formula cells (never executed!)
      cellHTML: false,
      cellNF: true,
      cellDates: false,
      WTF: true,
    })
  } catch (err: any) {
    usedFallbackParser = true
    warnings.push(`File "${fileName}" gặp cảnh báo cấu trúc container khi đọc nghiêm ngặt (${err?.message || "XLS container warning"}), đã chuyển sang chế độ đọc tương thích có xác thực.`)
    try {
      workbook = XLSX.read(buffer, {
        type: "buffer",
        cellFormula: true,
        cellHTML: false,
        cellNF: true,
        cellDates: false,
        WTF: false,
      })
    } catch (fallbackErr: any) {
      throw new Error(`Không thể đọc file Excel "${fileName}": ${fallbackErr?.message || "Định dạng không hợp lệ"}`)
    }
  }

  if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error(`File "${fileName}" không chứa sheet dữ liệu nào`)
  }

  const sheets: ParsedVnEduSheet[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet || !sheet["!ref"]) continue

    const range = XLSX.utils.decode_range(sheet["!ref"])
    const maxRow = range.e.r + 1
    const maxCol = range.e.c
    const colMeta = sheet["!cols"] || []
    const merges: XLSX.Range[] = sheet["!merges"] || []

    const headerBounds = findHeaderRows(sheet, maxRow, maxCol)
    if (!headerBounds) {
      warnings.push(`Sheet "${sheetName}" trong "${fileName}" không tìm thấy dòng tiêu đề bảng điểm (STT / Họ và tên / Mã).`)
      continue
    }

    const meta = extractMetadataFromTopRows(sheet, headerBounds.start, maxCol, sheetName, fileName)

    // Build column definitions across headerRowStart..headerRowEnd
    const columns: ParsedVnEduColumn[] = []
    for (let c = 0; c <= maxCol; c++) {
      const t1Cell = getMergeMasterValue(sheet, headerBounds.start, c)
      const t1 = normalizeHeaderCellText(t1Cell?.v !== undefined ? String(t1Cell.v) : "")
      const t2Cell = headerBounds.end > headerBounds.start ? getMergeMasterValue(sheet, headerBounds.end, c) : undefined
      const t2 = normalizeHeaderCellText(t2Cell?.v !== undefined ? String(t2Cell.v) : "")

      const headerLabel = t2 && t2 !== t1 ? t2 : t1
      if (!headerLabel) continue

      const normalizedHeader = normalizeHeaderKey(headerLabel)
      let role = classifyColumnRole(normalizedHeader)

      // Handle merged "Họ và tên" spanning 2+ columns (e.g. C + D or B..E)
      if (role === "FULL_NAME") {
        const mergeSpan = merges.find(
          m => headerBounds.start >= m.s.r && headerBounds.start <= m.e.r && c >= m.s.c && c <= m.e.c && m.e.c > m.s.c
        )
        if (mergeSpan) {
          role = c === mergeSpan.s.c ? "LAST_NAME" : "FIRST_NAME"
        }
      }

      const isHidden = Boolean(colMeta[c]?.hidden)
      columns.push({
        colIndex: c,
        headerLabel,
        tier1Label: t1,
        tier2Label: t2,
        normalizedHeader,
        isHidden,
        role,
      })
    }

    const rows: ParsedVnEduRow[] = []
    let skippedFooterStartRow: number | null = null

    for (let r = headerBounds.end + 1; r < maxRow; r++) {
      // Check footer / summary stop patterns across first 4 columns
      const probeTexts: string[] = []
      for (let c = 0; c <= Math.min(4, maxCol); c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c })]
        if (cell?.v !== undefined && cell?.v !== null) {
          probeTexts.push(normalizeVietnameseText(String(cell.v)))
        }
      }
      const joinedProbe = probeTexts.join(" ").trim()
      if (joinedProbe && FOOTER_STOP_PATTERNS.some(rx => rx.test(joinedProbe))) {
        skippedFooterStartRow = r + 1
        break
      }

      let stt = ""
      let vnEduCode = ""
      let fullName = ""
      let lastName = ""
      let firstName = ""
      let dob = ""
      const valuesByColIndex: Record<number, string> = {}
      const valuesByHeader: Record<string, string> = {}
      const formulaErrors: ParsedVnEduRow["formulaErrors"] = []

      for (const col of columns) {
        const addr = XLSX.utils.encode_cell({ r, c: col.colIndex })
        const cell = sheet[addr]

        if (col.role === "VNEDU_CODE") {
          const codeTxt = readCodeCellAsText(cell)
          if (codeTxt) vnEduCode = codeTxt
          valuesByColIndex[col.colIndex] = codeTxt
          valuesByHeader[col.headerLabel] = codeTxt
          continue
        }

        const { value, formulaError } = readSafeCellValue(cell, col.headerLabel, col.colIndex)
        if (formulaError) formulaErrors.push(formulaError)

        valuesByColIndex[col.colIndex] = value
        valuesByHeader[col.headerLabel] = value

        const cleanTxt = normalizeVietnameseText(value)
        if (col.role === "STT" && cleanTxt) stt = cleanTxt
        else if (col.role === "FULL_NAME" && cleanTxt) fullName = fullName ? `${fullName} ${cleanTxt}` : cleanTxt
        else if (col.role === "LAST_NAME" && cleanTxt) lastName = lastName ? `${lastName} ${cleanTxt}` : cleanTxt
        else if (col.role === "FIRST_NAME" && cleanTxt) firstName = firstName ? `${firstName} ${cleanTxt}` : cleanTxt
        else if (col.role === "DOB" && cleanTxt) dob = cleanTxt
      }

      if (!fullName && (lastName || firstName)) {
        fullName = normalizeVietnameseText(`${lastName} ${firstName}`)
      }

      // Skip completely blank trailing rows
      if (!vnEduCode && !fullName && !stt) {
        continue
      }

      // Check if any result column (score/rating/remark) has a non-empty value
      const resultCols = columns.filter(c => c.role === "SCORE_OR_VALUE" || c.role === "RATING" || c.role === "REMARK")
      const hasAnyResult = resultCols.some(c => {
        const v = valuesByColIndex[c.colIndex]
        return v !== undefined && v !== null && String(v).trim() !== ""
      })

      rows.push({
        rowIndex: r + 1,
        stt,
        vnEduCode,
        fullName,
        dob,
        valuesByColIndex,
        valuesByHeader,
        formulaErrors,
        isEmptyResultRow: !hasAnyResult && formulaErrors.length === 0,
      })
    }

    if (usedFallbackParser && rows.length === 0) {
      throw new Error(`Chế độ đọc tương thích không trích xuất được dòng học sinh nào từ sheet "${sheetName}" trong "${fileName}".`)
    }

    sheets.push({
      fileName,
      sheetName,
      detectedSubject: meta.detectedSubject,
      detectedClass: meta.detectedClass,
      detectedAcademicYear: meta.detectedAcademicYear,
      detectedPeriod: meta.detectedPeriod,
      metadataConflicts: meta.metadataConflicts,
      warnings: [...warnings],
      headerRowStart: headerBounds.start + 1,
      headerRowEnd: headerBounds.end + 1,
      columns,
      rows,
      skippedFooterStartRow,
    })
  }

  return {
    fileName,
    warnings,
    usedFallbackParser,
    sheets,
  }
}
