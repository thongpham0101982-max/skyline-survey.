import * as XLSX from "xlsx"
import type {
  ExcelImportPreviewResult,
  ExcelInfoMismatch,
  ExcelValidationError,
  ParsedExcelLesson,
  ParsedExcelPeriod,
  TeachingPlanLessonRecord,
} from "./types"

function normalizeText(val: unknown): string {
  if (val === null || val === undefined) return ""
  return String(val)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
}

function normalizeHeader(val: unknown): string {
  return normalizeText(val)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function normalizeCompare(val: unknown): string {
  return normalizeHeader(val).replace(/\s+/g, "")
}

function parsePositiveInt(val: unknown): number | null {
  if (val === null || val === undefined || String(val).trim() === "") return null
  const raw = String(val).trim().replace(/^tuần\s*/i, "").replace(/^hk\s*/i, "").replace(/^học kỳ\s*/i, "")
  if (raw.toUpperCase() === "I") return 1
  if (raw.toUpperCase() === "II") return 2
  const n = Number(raw)
  if (!Number.isInteger(n) || n <= 0) return null
  return n
}

export function buildDeterministicSkeletonPeriodCode(
  lessonCode: string,
  periodIndexInLesson: number
): string {
  const cleanLesson = lessonCode.trim().toUpperCase().replace(/\s+/g, "-")
  return `${cleanLesson}-T${String(periodIndexInLesson).padStart(2, "0")}`
}

export function isAssessmentLessonName(name: string): boolean {
  const norm = normalizeHeader(name)
  return (
    norm.includes("danh gia") ||
    norm.includes("kiem tra dinh ky") ||
    norm.includes("kiem tra giua ky") ||
    norm.includes("kiem tra cuoi ky")
  )
}

export function splitObjectiveLines(raw: string): string[] {
  if (!raw) return []
  return raw
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*+]\s*/, "").trim())
    .filter(Boolean)
}

/**
 * Generates Mau_Excel_Ke_hoach_day_hoc_SSM.xlsx with exact 3 sheets:
 * - Thong_tin
 * - Phan_phoi
 * - Chi_tiet_tiet
 * Contains illustrative Tiểu học -> Khối 1 -> Toán data (2 lessons, 9 periods).
 */
export function generateTeachingPlanTemplateBuffer(context?: {
  academicYearName?: string
  grade?: string
  subjectName?: string
  programName?: string
  scopeLabel?: string
}): Buffer {
  const wb = XLSX.utils.book_new()

  const yearVal = context?.academicYearName || "2026-2027"
  const gradeVal = context?.grade || "1"
  const subjectVal = context?.subjectName || "Toán học"
  const programVal = context?.programName || "Hệ S"
  const scopeVal = context?.scopeLabel || "Toàn hệ thống"

  const thongTinRows = [
    ["Thông tin", "Giá trị", "Cách điền và sử dụng"],
    ["Năm học", yearVal, "Điền đúng tên năm học trên SSM (VD: 2026-2027)."],
    ["Khối", gradeVal, "Điền số khối hoặc tên khối thuộc bậc đã chọn trên SSM (VD: 1)."],
    ["Môn học", subjectVal, "Điền đúng mã môn hoặc tên môn trên SSM (VD: TOA hoặc Toán học)."],
    ["Chương trình/Bộ sách", programVal, "Để trống nếu dùng chung, hoặc ghi rõ Hệ S / Hệ I / bộ sách."],
    ["Phạm vi áp dụng", scopeVal, "Ghi 'Toàn hệ thống' hoặc mã cơ sở (VD: CS1, CS2...)."],
    ["Ghi chú", "Dữ liệu minh họa Tiểu học - Khối 1 - Toán (2 bài, 9 tiết)", "Bậc học được chọn trực tiếp trên SSM khi nhập."],
  ]

  const phanPhoiRows = [
    [
      "Mã bài",
      "Học kỳ",
      "Tuần từ",
      "Tuần đến",
      "Chủ đề/Mạch nội dung",
      "Tên bài hoặc nội dung dạy học",
      "Số tiết",
      "Yêu cầu cần đạt của bài",
      "Điều chỉnh, bổ sung",
    ],
    [
      "TOAN1-B09",
      1,
      5,
      5,
      "Các số đến 10",
      "Bài 9: Luyện tập chung các số đến 10",
      3,
      "- Đếm, đọc, viết, so sánh được các số trong phạm vi 10.\n- Vận dụng tách - gộp số vào tình huống thực tế đơn giản.",
      "Tăng cường trò chơi đếm nhanh đầu giờ.",
    ],
    [
      "TOAN1-B10",
      1,
      6,
      7,
      "Phép cộng, phép trừ trong phạm vi 10",
      "Bài 10: Phép cộng trong phạm vi 10",
      6,
      "- Nhận biết được ý nghĩa phép cộng trong phạm vi 10.\n- Thực hiện được phép cộng các số trong phạm vi 10.\n- Nêu được phép tính phù hợp với tranh vẽ hoặc tình huống thực tế.",
      "Kết hợp bộ đồ dùng học Toán lớp 1 và thẻ chấm tròn.",
    ],
  ]

  const chiTietRows = [
    [
      "Mã tiết",
      "Mã bài",
      "Tiết trong bài",
      "Tuần dự kiến",
      "Trọng tâm tiết",
      "Yêu cầu cần đạt của tiết",
      "Minh chứng học tập dự kiến",
      "Điều chỉnh, bổ sung",
    ],
    [
      "TOAN1-B09-T01",
      "TOAN1-B09",
      1,
      5,
      "Ôn tập đếm, đọc, viết số đến 10",
      "- Đếm đúng số lượng đồ vật trong phạm vi 10.\n- Đọc và viết đúng chữ số từ 0 đến 10.",
      "Phiếu bài tập nối số với hình vẽ; bảng con viết số.",
      "",
    ],
    [
      "TOAN1-B09-T02",
      "TOAN1-B09",
      2,
      5,
      "So sánh và sắp xếp thứ tự các số đến 10",
      "- Sử dụng đúng dấu >, <, = để so sánh hai số trong phạm vi 10.\n- Sắp xếp nhóm 3-4 số theo thứ tự từ bé đến lớn và ngược lại.",
      "Kết quả hoạt động nhóm xếp thẻ số trên bảng nhóm.",
      "",
    ],
    [
      "TOAN1-B09-T03",
      "TOAN1-B09",
      3,
      5,
      "Vận dụng tách - gộp số trong phạm vi 10",
      "- Phân tích được cấu tạo số trong phạm vi 10 bằng sơ đồ tách - gộp.\n- Giải quyết bài toán hình ảnh thực tế trong lớp học.",
      "Sản phẩm sơ đồ tách - gộp bằng que tính và phiếu thực hành.",
      "Lồng ghép đánh giá thường xuyên.",
    ],
    [
      "TOAN1-B10-T01",
      "TOAN1-B10",
      1,
      6,
      "Làm quen phép cộng trong phạm vi 6",
      "- Nhận biết thao tác gộp tương ứng với phép cộng.\n- Đọc và viết đúng phép cộng trong phạm vi 6.",
      "Học sinh thao tác gộp chấm tròn và viết phép tính lên bảng con.",
      "",
    ],
    [
      "TOAN1-B10-T02",
      "TOAN1-B10",
      2,
      6,
      "Phép cộng trong phạm vi 6 (Luyện tập)",
      "- Tính nhẩm thành thạo các phép cộng trong phạm vi 6.\n- Quan sát tranh và nêu được bài toán cộng phù hợp.",
      "Phiếu luyện tập cá nhân hoàn thành tối thiểu 4/5 phép tính; câu trả lời miệng mô tả tranh.",
      "Ưu tiên học sinh diễn đạt bằng lời trước khi viết phép tính.",
    ],
    [
      "TOAN1-B10-T03",
      "TOAN1-B10",
      3,
      6,
      "Phép cộng trong phạm vi 10 (Hình thành bảng cộng)",
      "- Thực hiện được phép cộng hai số có kết quả không quá 10.\n- Nhận biết tính chất giao hoán bước đầu qua hình ảnh.",
      "Bảng cộng nhóm 4 học sinh và bài làm trong vở bài tập.",
      "",
    ],
    [
      "TOAN1-B10-T04",
      "TOAN1-B10",
      4,
      7,
      "Phép cộng với số 0",
      "- Nhận biết kết quả khi cộng một số với 0.\n- Áp dụng tính nhanh trong các biểu thức đơn giản.",
      "Câu trả lời trò chơi giơ thẻ Đúng/Sai và phiếu bài tập.",
      "",
    ],
    [
      "TOAN1-B10-T05",
      "TOAN1-B10",
      5,
      7,
      "Luyện tập phép cộng trong phạm vi 10",
      "- Tính đúng các phép cộng trong phạm vi 10.\n- Tìm số còn thiếu trong phép cộng đơn giản.",
      "Vở bài tập và phiếu tự kiểm tra theo cặp đôi.",
      "",
    ],
    [
      "TOAN1-B10-T06",
      "TOAN1-B10",
      6,
      7,
      "Vận dụng phép cộng giải quyết tình huống thực tế",
      "- Đặt được phép cộng phù hợp từ tình huống tranh vẽ.\n- Trình bày tự tin cách tìm kết quả trước lớp.",
      "Sản phẩm vẽ tranh tình huống phép cộng của nhóm và phần thuyết trình ngắn.",
      "Dành 5 phút tổng kết mạch kiến thức Bài 10.",
    ],
  ]

  const wsInfo = XLSX.utils.aoa_to_sheet(thongTinRows)
  wsInfo["!cols"] = [{ wch: 24 }, { wch: 36 }, { wch: 56 }]

  const wsPP = XLSX.utils.aoa_to_sheet(phanPhoiRows)
  wsPP["!cols"] = [
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 30 },
    { wch: 34 },
    { wch: 10 },
    { wch: 48 },
    { wch: 30 },
  ]

  const wsCT = XLSX.utils.aoa_to_sheet(chiTietRows)
  wsCT["!cols"] = [
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 32 },
    { wch: 48 },
    { wch: 40 },
    { wch: 30 },
  ]

  XLSX.utils.book_append_sheet(wb, wsInfo, "Thong_tin")
  XLSX.utils.book_append_sheet(wb, wsPP, "Phan_phoi")
  XLSX.utils.book_append_sheet(wb, wsCT, "Chi_tiet_tiet")

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }))
}

function findSheetByName(wb: XLSX.WorkBook, target: string): string | null {
  const normTarget = normalizeCompare(target)
  for (const name of wb.SheetNames) {
    if (normalizeCompare(name) === normTarget) return name
  }
  return null
}

function findColIndex(headers: string[], candidates: string[]): number {
  const normHeaders = headers.map((h) => normalizeHeader(h))
  for (const c of candidates) {
    const nc = normalizeHeader(c)
    const exact = normHeaders.findIndex((h) => h === nc)
    if (exact >= 0) return exact
  }
  for (const c of candidates) {
    const nc = normalizeHeader(c)
    const partial = normHeaders.findIndex((h) => h.includes(nc))
    if (partial >= 0) return partial
  }
  return -1
}

export interface ExcelValidationContext {
  academicYearName: string
  grade: string
  subjectCode?: string | null
  subjectName: string
  programCode?: string
  programName?: string
  scopeType: "SYSTEM" | "CAMPUS"
  campusCode?: string | null
  campusName?: string | null
  existingLessons?: TeachingPlanLessonRecord[]
}

/**
 * Parses and validates an uploaded Teaching Plan Excel workbook against the selected SSM context
 * and existing draft lessons/periods.
 */
export function parseAndValidateTeachingPlanExcel(
  buffer: Buffer,
  ctx: ExcelValidationContext
): ExcelImportPreviewResult {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false })
  const errors: ExcelValidationError[] = []
  const mismatches: ExcelInfoMismatch[] = []
  const infoMap: Record<string, string> = {}

  const infoSheetName = findSheetByName(wb, "Thong_tin")
  const ppSheetName = findSheetByName(wb, "Phan_phoi")
  const ctSheetName = findSheetByName(wb, "Chi_tiet_tiet")

  if (!infoSheetName) {
    errors.push({
      sheet: "Thong_tin",
      row: 1,
      column: "Sheet",
      reason: "Thiếu sheet bắt buộc 'Thong_tin'.",
    })
  }
  if (!ppSheetName) {
    errors.push({
      sheet: "Phan_phoi",
      row: 1,
      column: "Sheet",
      reason: "Thiếu sheet bắt buộc 'Phan_phoi'.",
    })
  }
  if (!ctSheetName) {
    errors.push({
      sheet: "Chi_tiet_tiet",
      row: 1,
      column: "Sheet",
      reason: "Thiếu sheet bắt buộc 'Chi_tiet_tiet'.",
    })
  }

  // 1. Parse Thong_tin
  if (infoSheetName) {
    const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[infoSheetName], {
      header: 1,
      defval: "",
      blankrows: false,
    })
    const headers = (rows[0] || []).map((h) => normalizeText(h))
    const keyCol = findColIndex(headers, ["Thông tin", "Thong tin"])
    const valCol = findColIndex(headers, ["Giá trị", "Gia tri"])
    if (keyCol < 0 || valCol < 0) {
      errors.push({
        sheet: infoSheetName,
        row: 1,
        column: "Tiêu đề",
        reason: "Sheet Thong_tin phải có các cột 'Thông tin' và 'Giá trị'.",
      })
    } else {
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] || []
        const k = normalizeText(row[keyCol])
        const v = normalizeText(row[valCol])
        if (k) {
          infoMap[k] = v
        }
      }
    }

    // Cross-check infoMap against SSM context when value is present
    const getInfoValue = (keys: string[]) => {
      for (const [k, v] of Object.entries(infoMap)) {
        const nk = normalizeHeader(k)
        if (keys.some((candidate) => nk.includes(normalizeHeader(candidate)))) {
          return v
        }
      }
      return ""
    }

    const fileYear = getInfoValue(["nam hoc", "năm học"])
    if (fileYear && normalizeCompare(fileYear) !== normalizeCompare(ctx.academicYearName)) {
      mismatches.push({
        field: "academicYear",
        label: "Năm học",
        fileValue: fileYear,
        expectedValue: ctx.academicYearName,
        severity: "ERROR",
      })
      errors.push({
        sheet: infoSheetName,
        row: 2,
        column: "Giá trị (Năm học)",
        reason: `Năm học trong file ('${fileYear}') không khớp năm học đang chọn trên SSM ('${ctx.academicYearName}').`,
      })
    }

    const fileGrade = getInfoValue(["khoi", "khối"])
    const cleanFileGrade = fileGrade.replace(/^khối\s*/i, "").replace(/^k\s*/i, "").trim()
    const cleanCtxGrade = ctx.grade.replace(/^khối\s*/i, "").replace(/^k\s*/i, "").trim()
    if (fileGrade && normalizeCompare(cleanFileGrade) !== normalizeCompare(cleanCtxGrade)) {
      mismatches.push({
        field: "grade",
        label: "Khối",
        fileValue: fileGrade,
        expectedValue: ctx.grade,
        severity: "ERROR",
      })
      errors.push({
        sheet: infoSheetName,
        row: 3,
        column: "Giá trị (Khối)",
        reason: `Khối trong file ('${fileGrade}') không khớp khối đang chọn trên SSM ('${ctx.grade}').`,
      })
    }

    const fileSubject = getInfoValue(["mon hoc", "môn học", "môn"])
    if (fileSubject) {
      const fNorm = normalizeCompare(fileSubject)
      const sNameNorm = normalizeCompare(ctx.subjectName)
      const sCodeNorm = normalizeCompare(ctx.subjectCode || "")
      const subjectMatched =
        fNorm === sNameNorm ||
        (sCodeNorm && fNorm === sCodeNorm) ||
        (fNorm === "toan" && sNameNorm === "toanhoc") ||
        (fNorm === "toanhoc" && sNameNorm === "toan")
      if (!subjectMatched) {
        mismatches.push({
          field: "subject",
          label: "Môn học",
          fileValue: fileSubject,
          expectedValue: ctx.subjectCode
            ? `${ctx.subjectName} (${ctx.subjectCode})`
            : ctx.subjectName,
          severity: "ERROR",
        })
        errors.push({
          sheet: infoSheetName,
          row: 4,
          column: "Giá trị (Môn học)",
          reason: `Môn học trong file ('${fileSubject}') không khớp môn đang chọn trên SSM ('${ctx.subjectName}').`,
        })
      }
    }

    const fileProgram = getInfoValue(["chuong trinh", "chương trình", "bo sach", "bộ sách"])
    const expectedProgram = ctx.programName || ctx.programCode || ""
    if (
      fileProgram &&
      expectedProgram &&
      normalizeCompare(fileProgram) !== normalizeCompare(expectedProgram) &&
      normalizeCompare(fileProgram) !== normalizeCompare(ctx.programCode || "")
    ) {
      mismatches.push({
        field: "program",
        label: "Chương trình/Bộ sách",
        fileValue: fileProgram,
        expectedValue: expectedProgram,
        severity: "WARNING",
      })
    }

    const fileScope = getInfoValue(["pham vi", "phạm vi"])
    if (fileScope) {
      const fScopeNorm = normalizeHeader(fileScope)
      const isFileSystem =
        fScopeNorm.includes("toan he thong") || fScopeNorm === "system" || fScopeNorm === "he thong"
      if (ctx.scopeType === "SYSTEM" && !isFileSystem) {
        mismatches.push({
          field: "scope",
          label: "Phạm vi áp dụng",
          fileValue: fileScope,
          expectedValue: "Toàn hệ thống",
          severity: "WARNING",
        })
      } else if (
        ctx.scopeType === "CAMPUS" &&
        (isFileSystem ||
          (ctx.campusCode &&
            !normalizeCompare(fileScope).includes(normalizeCompare(ctx.campusCode)) &&
            (!ctx.campusName ||
              !normalizeCompare(fileScope).includes(normalizeCompare(ctx.campusName)))))
      ) {
        mismatches.push({
          field: "scope",
          label: "Phạm vi áp dụng",
          fileValue: fileScope,
          expectedValue: ctx.campusCode || ctx.campusName || "Cơ sở",
          severity: "WARNING",
        })
      }
    }
  }

  // 2. Parse Phan_phoi
  const lessons: ParsedExcelLesson[] = []
  const lessonByCode = new Map<string, ParsedExcelLesson>()

  if (ppSheetName) {
    const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[ppSheetName], {
      header: 1,
      defval: "",
      blankrows: true,
    })
    const headers = (rows[0] || []).map((h) => normalizeText(h))
    const colCode = findColIndex(headers, ["Mã bài", "Ma bai"])
    const colSem = findColIndex(headers, ["Học kỳ", "Hoc ky"])
    const colWeekFrom = findColIndex(headers, ["Tuần từ", "Tuan tu"])
    const colWeekTo = findColIndex(headers, ["Tuần đến", "Tuan den"])
    const colTopic = findColIndex(headers, ["Chủ đề/Mạch nội dung", "Chủ đề", "Mạch nội dung"])
    const colName = findColIndex(headers, [
      "Tên bài hoặc nội dung dạy học",
      "Tên bài",
      "Nội dung dạy học",
    ])
    const colPeriods = findColIndex(headers, ["Số tiết", "So tiet"])
    const colObj = findColIndex(headers, ["Yêu cầu cần đạt của bài", "Yêu cầu cần đạt"])
    const colAdj = findColIndex(headers, ["Điều chỉnh, bổ sung", "Điều chỉnh"])
    const colProj = findColIndex(headers, ["Ghi chú dự án", "Dự án"])

    const requiredCols: Array<[number, string]> = [
      [colCode, "Mã bài"],
      [colSem, "Học kỳ"],
      [colWeekFrom, "Tuần từ"],
      [colWeekTo, "Tuần đến"],
      [colTopic, "Chủ đề/Mạch nội dung"],
      [colName, "Tên bài hoặc nội dung dạy học"],
      [colPeriods, "Số tiết"],
    ]
    for (const [idx, colLabel] of requiredCols) {
      if (idx < 0) {
        errors.push({
          sheet: ppSheetName,
          row: 1,
          column: colLabel,
          reason: `Thiếu cột bắt buộc '${colLabel}' trong sheet Phan_phoi.`,
        })
      }
    }

    if (requiredCols.every(([idx]) => idx >= 0)) {
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i] || []
        const isEmptyRow = r.every((cell) => normalizeText(cell) === "")
        if (isEmptyRow) continue

        const excelRowNum = i + 1
        const lessonCode = normalizeText(r[colCode])
        const sem = parsePositiveInt(r[colSem])
        const weekFrom = parsePositiveInt(r[colWeekFrom])
        const weekTo = parsePositiveInt(r[colWeekTo])
        const topicName = normalizeText(r[colTopic])
        const lessonName = normalizeText(r[colName])
        const periodCount = parsePositiveInt(r[colPeriods])
        const objectives = colObj >= 0 ? normalizeText(r[colObj]) : ""
        const adjustments = colAdj >= 0 ? normalizeText(r[colAdj]) : ""
        const projectNotes = colProj >= 0 ? normalizeText(r[colProj]) : ""

        let rowHasError = false
        if (!lessonCode) {
          errors.push({
            sheet: ppSheetName,
            row: excelRowNum,
            column: "Mã bài",
            reason: "Thiếu Mã bài.",
          })
          rowHasError = true
        } else if (lessonByCode.has(lessonCode)) {
          errors.push({
            sheet: ppSheetName,
            row: excelRowNum,
            column: "Mã bài",
            reason: `Trùng Mã bài '${lessonCode}' (đã xuất hiện ở dòng ${lessonByCode.get(lessonCode)!.rowNumber}).`,
          })
          rowHasError = true
        }

        if (sem !== 1 && sem !== 2) {
          errors.push({
            sheet: ppSheetName,
            row: excelRowNum,
            column: "Học kỳ",
            reason: "Học kỳ không hợp lệ (chỉ chấp nhận 1 hoặc 2).",
          })
          rowHasError = true
        }

        if (!weekFrom || weekFrom > 40) {
          errors.push({
            sheet: ppSheetName,
            row: excelRowNum,
            column: "Tuần từ",
            reason: "Tuần từ phải là số nguyên dương (1–40).",
          })
          rowHasError = true
        }

        if (!weekTo || weekTo > 40) {
          errors.push({
            sheet: ppSheetName,
            row: excelRowNum,
            column: "Tuần đến",
            reason: "Tuần đến phải là số nguyên dương (1–40).",
          })
          rowHasError = true
        }

        if (weekFrom && weekTo && weekFrom > weekTo) {
          errors.push({
            sheet: ppSheetName,
            row: excelRowNum,
            column: "Tuần đến",
            reason: `Tuần đến (${weekTo}) không được nhỏ hơn Tuần từ (${weekFrom}).`,
          })
          rowHasError = true
        }

        if (!topicName) {
          errors.push({
            sheet: ppSheetName,
            row: excelRowNum,
            column: "Chủ đề/Mạch nội dung",
            reason: "Thiếu Chủ đề/Mạch nội dung.",
          })
          rowHasError = true
        }

        if (!lessonName) {
          errors.push({
            sheet: ppSheetName,
            row: excelRowNum,
            column: "Tên bài hoặc nội dung dạy học",
            reason: "Thiếu Tên bài hoặc nội dung dạy học.",
          })
          rowHasError = true
        }

        if (!periodCount || periodCount <= 0) {
          errors.push({
            sheet: ppSheetName,
            row: excelRowNum,
            column: "Số tiết",
            reason: "Số tiết phải là số nguyên dương.",
          })
          rowHasError = true
        }

        if (!rowHasError && lessonCode && sem && weekFrom && weekTo && periodCount) {
          const parsedLesson: ParsedExcelLesson = {
            lessonCode,
            semester: sem,
            weekFrom,
            weekTo,
            topicName,
            lessonName,
            periodCount,
            objectives,
            adjustments,
            projectNotes,
            isAssessmentRow: isAssessmentLessonName(lessonName) || isAssessmentLessonName(topicName),
            rowNumber: excelRowNum,
          }
          lessons.push(parsedLesson)
          lessonByCode.set(lessonCode, parsedLesson)
        }
      }
    }
  }

  // 3. Parse Chi_tiet_tiet
  const periods: ParsedExcelPeriod[] = []
  const periodByCode = new Map<string, ParsedExcelPeriod>()
  const periodIndicesByLesson = new Map<string, Set<number>>()
  const periodCountByLesson = new Map<string, number>()

  if (ctSheetName) {
    const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[ctSheetName], {
      header: 1,
      defval: "",
      blankrows: true,
    })
    const headers = (rows[0] || []).map((h) => normalizeText(h))
    const colPeriodCode = findColIndex(headers, ["Mã tiết", "Ma tiet"])
    const colLessonCode = findColIndex(headers, ["Mã bài", "Ma bai"])
    const colIndex = findColIndex(headers, ["Tiết trong bài", "Tiet trong bai"])
    const colWeek = findColIndex(headers, ["Tuần dự kiến", "Tuan du kien"])
    const colFocus = findColIndex(headers, ["Trọng tâm tiết", "Trong tam tiet", "Trọng tâm"])
    const colObj = findColIndex(headers, ["Yêu cầu cần đạt của tiết", "Yêu cầu cần đạt"])
    const colEvid = findColIndex(headers, ["Minh chứng học tập dự kiến", "Minh chứng"])
    const colAdj = findColIndex(headers, ["Điều chỉnh, bổ sung", "Điều chỉnh"])

    const requiredCols: Array<[number, string]> = [
      [colPeriodCode, "Mã tiết"],
      [colLessonCode, "Mã bài"],
      [colIndex, "Tiết trong bài"],
      [colWeek, "Tuần dự kiến"],
    ]
    for (const [idx, colLabel] of requiredCols) {
      if (idx < 0) {
        errors.push({
          sheet: ctSheetName,
          row: 1,
          column: colLabel,
          reason: `Thiếu cột bắt buộc '${colLabel}' trong sheet Chi_tiet_tiet.`,
        })
      }
    }

    if (requiredCols.every(([idx]) => idx >= 0)) {
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i] || []
        const isEmptyRow = r.every((cell) => normalizeText(cell) === "")
        if (isEmptyRow) continue

        const excelRowNum = i + 1
        const periodCode = normalizeText(r[colPeriodCode])
        const lessonCode = normalizeText(r[colLessonCode])
        const periodIndexInLesson = parsePositiveInt(r[colIndex])
        const plannedWeek = parsePositiveInt(r[colWeek])
        const focus = colFocus >= 0 ? normalizeText(r[colFocus]) : ""
        const objectives = colObj >= 0 ? normalizeText(r[colObj]) : ""
        const expectedEvidence = colEvid >= 0 ? normalizeText(r[colEvid]) : ""
        const adjustments = colAdj >= 0 ? normalizeText(r[colAdj]) : ""

        let rowHasError = false
        if (!periodCode) {
          errors.push({
            sheet: ctSheetName,
            row: excelRowNum,
            column: "Mã tiết",
            reason: "Thiếu Mã tiết.",
          })
          rowHasError = true
        } else if (periodByCode.has(periodCode)) {
          errors.push({
            sheet: ctSheetName,
            row: excelRowNum,
            column: "Mã tiết",
            reason: `Trùng Mã tiết '${periodCode}' (đã xuất hiện ở dòng ${periodByCode.get(periodCode)!.rowNumber}).`,
          })
          rowHasError = true
        }

        const parentLesson = lessonCode ? lessonByCode.get(lessonCode) : undefined
        if (!lessonCode) {
          errors.push({
            sheet: ctSheetName,
            row: excelRowNum,
            column: "Mã bài",
            reason: "Thiếu Mã bài liên kết.",
          })
          rowHasError = true
        } else if (!parentLesson) {
          errors.push({
            sheet: ctSheetName,
            row: excelRowNum,
            column: "Mã bài",
            reason: `Mã bài '${lessonCode}' không tồn tại trong sheet Phan_phoi.`,
          })
          rowHasError = true
        }

        if (!periodIndexInLesson) {
          errors.push({
            sheet: ctSheetName,
            row: excelRowNum,
            column: "Tiết trong bài",
            reason: "Tiết trong bài phải là số nguyên dương.",
          })
          rowHasError = true
        } else if (parentLesson) {
          if (periodIndexInLesson > parentLesson.periodCount) {
            errors.push({
              sheet: ctSheetName,
              row: excelRowNum,
              column: "Tiết trong bài",
              reason: `Tiết trong bài (${periodIndexInLesson}) vượt quá Số tiết của bài '${lessonCode}' (${parentLesson.periodCount}).`,
            })
            rowHasError = true
          }
          const idxSet = periodIndicesByLesson.get(lessonCode) || new Set<number>()
          if (idxSet.has(periodIndexInLesson)) {
            errors.push({
              sheet: ctSheetName,
              row: excelRowNum,
              column: "Tiết trong bài",
              reason: `Trùng thứ tự Tiết trong bài (${periodIndexInLesson}) cho bài '${lessonCode}'.`,
            })
            rowHasError = true
          } else {
            idxSet.add(periodIndexInLesson)
            periodIndicesByLesson.set(lessonCode, idxSet)
          }
        }

        if (!plannedWeek || plannedWeek > 40) {
          errors.push({
            sheet: ctSheetName,
            row: excelRowNum,
            column: "Tuần dự kiến",
            reason: "Tuần dự kiến phải là số nguyên dương (1–40).",
          })
          rowHasError = true
        } else if (
          parentLesson &&
          (plannedWeek < parentLesson.weekFrom || plannedWeek > parentLesson.weekTo)
        ) {
          errors.push({
            sheet: ctSheetName,
            row: excelRowNum,
            column: "Tuần dự kiến",
            reason: `Tuần dự kiến (${plannedWeek}) nằm ngoài khoảng tuần của bài '${lessonCode}' (Tuần ${parentLesson.weekFrom}–${parentLesson.weekTo}).`,
          })
          rowHasError = true
        }

        if (parentLesson) {
          const nextCount = (periodCountByLesson.get(lessonCode) || 0) + 1
          periodCountByLesson.set(lessonCode, nextCount)
          if (nextCount > parentLesson.periodCount) {
            errors.push({
              sheet: ctSheetName,
              row: excelRowNum,
              column: "Mã bài",
              reason: `Số tiết chi tiết của bài '${lessonCode}' (${nextCount}) vượt quá Số tiết đã khai báo (${parentLesson.periodCount}).`,
            })
            rowHasError = true
          }
        }

        if (!rowHasError && periodCode && lessonCode && periodIndexInLesson && plannedWeek) {
          const parsedPeriod: ParsedExcelPeriod = {
            periodCode,
            lessonCode,
            periodIndexInLesson,
            plannedWeek,
            focus,
            objectives,
            expectedEvidence,
            adjustments,
            isSkeleton: !focus || !objectives,
            rowNumber: excelRowNum,
          }
          periods.push(parsedPeriod)
          periodByCode.set(periodCode, parsedPeriod)
        }
      }
    }
  }

  // 4. Generate deterministic skeleton periods for missing slots in lessons
  let periodsSkeletonCreated = 0
  const assessmentRowsNeedingConfirm: Array<{
    lessonCode: string
    lessonName: string
    reason: string
  }> = []

  for (const lesson of lessons) {
    const existingIndices = periodIndicesByLesson.get(lesson.lessonCode) || new Set<number>()
    let missingCount = 0
    for (let idx = 1; idx <= lesson.periodCount; idx++) {
      if (!existingIndices.has(idx)) {
        const skCode = buildDeterministicSkeletonPeriodCode(lesson.lessonCode, idx)
        if (!periodByCode.has(skCode)) {
          const skPeriod: ParsedExcelPeriod = {
            periodCode: skCode,
            lessonCode: lesson.lessonCode,
            periodIndexInLesson: idx,
            plannedWeek: lesson.weekFrom,
            focus: "",
            objectives: "",
            expectedEvidence: "",
            adjustments: "",
            isSkeleton: true,
            rowNumber: null,
          }
          periods.push(skPeriod)
          periodByCode.set(skCode, skPeriod)
          periodsSkeletonCreated++
          missingCount++
        }
      }
    }

    if (lesson.isAssessmentRow && (missingCount > 0 || !lesson.objectives)) {
      assessmentRowsNeedingConfirm.push({
        lessonCode: lesson.lessonCode,
        lessonName: lesson.lessonName,
        reason:
          missingCount > 0
            ? `Dòng ĐÁNH GIÁ thiếu ${missingCount}/${lesson.periodCount} chi tiết tiết — cần xác nhận cách tổ chức trước khi công bố.`
            : "Dòng ĐÁNH GIÁ thiếu yêu cầu cần đạt — cần xác nhận cách tổ chức trước khi công bố.",
      })
    }
  }

  // 5. Diff against existing draft lessons/periods
  const existingLessonMap = new Map<string, TeachingPlanLessonRecord>()
  const existingPeriodMap = new Map<string, TeachingPlanLessonRecord["periods"][number]>()
  for (const l of ctx.existingLessons || []) {
    existingLessonMap.set(l.lessonCode, l)
    for (const p of l.periods || []) {
      existingPeriodMap.set(p.periodCode, p)
    }
  }

  let lessonsAdded = 0
  let lessonsUpdated = 0
  let lessonsUnchanged = 0
  for (const l of lessons) {
    const prev = existingLessonMap.get(l.lessonCode)
    if (!prev) {
      lessonsAdded++
    } else {
      const same =
        prev.semester === l.semester &&
        prev.weekFrom === l.weekFrom &&
        prev.weekTo === l.weekTo &&
        prev.topicName === l.topicName &&
        prev.lessonName === l.lessonName &&
        prev.periodCount === l.periodCount &&
        prev.objectives === l.objectives &&
        prev.adjustments === l.adjustments &&
        prev.projectNotes === l.projectNotes
      if (same) lessonsUnchanged++
      else lessonsUpdated++
    }
  }

  let periodsAdded = 0
  let periodsUpdated = 0
  let periodsUnchanged = 0
  for (const p of periods) {
    const prev = existingPeriodMap.get(p.periodCode)
    if (!prev) {
      periodsAdded++
    } else {
      const same =
        prev.periodIndexInLesson === p.periodIndexInLesson &&
        prev.plannedWeek === p.plannedWeek &&
        prev.focus === p.focus &&
        prev.objectives === p.objectives &&
        prev.expectedEvidence === p.expectedEvidence &&
        prev.adjustments === p.adjustments &&
        prev.isSkeleton === p.isSkeleton
      if (same) periodsUnchanged++
      else periodsUpdated++
    }
  }

  return {
    valid: errors.length === 0,
    infoMap,
    mismatches,
    errors,
    summary: {
      lessonsAdded,
      lessonsUpdated,
      lessonsUnchanged,
      lessonsNeedsConfirmation: assessmentRowsNeedingConfirm.length,
      periodsAdded,
      periodsUpdated,
      periodsUnchanged,
      periodsSkeletonCreated,
      errorCount: errors.length,
    },
    lessons,
    periods,
    assessmentRowsNeedingConfirm,
  }
}
