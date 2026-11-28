/**
 * Pure RACI Position Catalog & Parser for Ban KT&ĐBCL Sky-Line.
 * Zero Prisma / Node-only dependencies so both Client & Server & Vitest can import cleanly.
 */

export type RaciRoleCode = "R" | "A" | "C" | "I"

export interface KtdbclPositionDef {
  positionCode: string
  positionName: string
  shortCode: string
  unitScope: string
  taskGroupName: string
  description: string
  displayOrder: number
  isManagedPosition: boolean
}

export interface ParsedRaciLink {
  positionCode: string
  raciRole: RaciRoleCode
}

export interface ParsedPositionTaskTemplate {
  unitScope: string
  itemCode: string
  stt: number
  functionGroup: string
  mainTask: string
  detailTask: string
  title: string
  frequency: string
  reportCadences: Array<"WEEKLY" | "MONTHLY" | "SEMESTER" | "YEARLY" | "EVENT">
  deliverables: string
  kpiTarget: string
  completionCriteria: string
  accountablePositionCode: string
  adminNote: string | null
  raciLinks: ParsedRaciLink[]
  rPositions: string[]
  cPositions: string[]
  iPositions: string[]
  recommendedScopeFields: Array<"CAMPUS" | "ACADEMIC_YEAR" | "EXAM_PERIOD" | "SURVEY_WAVE">
}

export const KTDBCL_UNIT_SCOPE = "BAN_KT_DBCL"

/**
 * 07 vị trí quản trị công việc chính thức thuộc Ban KT&ĐBCL (và VT123 giữ vai trò A)
 */
export const KTDBCL_MANAGED_POSITION_CODES = [
  "VT293",
  "VT295",
  "VT281",
  "VT282",
  "VT250",
  "VT303",
  "VT251",
] as const

export const KTDBCL_MANAGED_POSITION_SET = new Set<string>(KTDBCL_MANAGED_POSITION_CODES)

export const KTDBCL_POSITION_CATALOG: KtdbclPositionDef[] = [
  {
    positionCode: "VT293",
    positionName: "Trưởng nhóm Khảo thí",
    shortCode: "TNKT",
    unitScope: KTDBCL_UNIT_SCOPE,
    taskGroupName: "Khảo thí Phổ thông",
    description:
      "Lập kế hoạch kiểm tra định kỳ, phân tích đối sánh chất lượng môn học, xây dựng quy trình phát triển thư viện câu hỏi và kiểm tra trực tuyến, lập kế hoạch khảo sát chuẩn đầu ra Tiếng Anh và ICT, lập kế hoạch và phối hợp tổ chức các kỳ thi học sinh, cập nhật quy trình khảo sát đầu vào.",
    displayOrder: 1,
    isManagedPosition: true,
  },
  {
    positionCode: "VT295",
    positionName: "Trưởng nhóm Đảm bảo Chất lượng Dạy và Học",
    shortCode: "TNĐBCLDVH",
    unitScope: KTDBCL_UNIT_SCOPE,
    taskGroupName: "ĐBCL",
    description:
      "Xây dựng kế hoạch khảo sát mức độ hài lòng thuộc mảng học sinh và phụ huynh. Tham vấn nghiệp vụ đánh giá năng lực, dự giờ, hồ sơ điện tử, dashboard và cải tiến chất lượng theo các dòng được giao C trong RACI.",
    displayOrder: 2,
    isManagedPosition: true,
  },
  {
    positionCode: "VT281",
    positionName: "Nhân viên Đảm bảo Chất lượng Giáo viên",
    shortCode: "NVĐBCLGV",
    unitScope: KTDBCL_UNIT_SCOPE,
    taskGroupName: "ĐBCL",
    description:
      "Vận hành đánh giá năng lực Phổ thông, phân tích tiến bộ học sinh để phản hồi chuyên môn, vận hành công cụ và theo dõi kết quả dự giờ, cập nhật hồ sơ giáo viên trên SSM, phân tích dữ liệu chất lượng dạy học, cung cấp dữ liệu KPI và thi đua, triển khai và báo cáo khảo sát phụ huynh.",
    displayOrder: 3,
    isManagedPosition: true,
  },
  {
    positionCode: "VT282",
    positionName: "Nhân viên Đảm bảo Chất lượng Học sinh",
    shortCode: "NVĐBCLHS",
    unitScope: KTDBCL_UNIT_SCOPE,
    taskGroupName: "ĐBCL Học sinh",
    description:
      "Vận hành đánh giá năng lực Mầm non, tổng hợp tiến bộ và phản hồi phụ huynh, tích hợp dữ liệu kết quả học tập và trải nghiệm, cập nhật hồ sơ học tập điện tử trên SSM, theo dõi việc cung cấp báo cáo học tập cho phụ huynh, triển khai và báo cáo khảo sát thuộc mảng học sinh.",
    displayOrder: 4,
    isManagedPosition: true,
  },
  {
    positionCode: "VT250",
    positionName: "Nhân viên Khảo thí Phổ thông",
    shortCode: "NVKTPT",
    unitScope: KTDBCL_UNIT_SCOPE,
    taskGroupName: "Khảo thí Phổ thông",
    description:
      "Chuẩn hóa thư viện câu hỏi, phối hợp xây dựng và kiểm duyệt ma trận, đề, đáp án, hướng dẫn chấm, theo dõi chất lượng đề. Phối hợp in sao, bàn giao đề bảo mật, làm phách, chấm và nhập điểm. Báo cáo kết quả với quản lý chuyên môn, lưu hồ sơ kiểm tra, phối hợp khảo sát chuẩn đầu ra, khảo sát đầu vào và cung cấp dữ liệu thành tích.",
    displayOrder: 5,
    isManagedPosition: true,
  },
  {
    positionCode: "VT303",
    positionName: "Nhân viên Khảo thí Tổng hợp",
    shortCode: "NVKTTH",
    unitScope: KTDBCL_UNIT_SCOPE,
    taskGroupName: "Khảo thí Tổng hợp",
    description:
      "Thiết lập đề trên LMS, hỗ trợ kỹ thuật và xử lý sự cố, phối hợp tổ chức kiểm tra định kỳ và khảo sát đầu vào, tổng hợp kết quả chuẩn đầu ra Tiếng Anh và ICT, quản lý dữ liệu dự thi và thành tích, phối hợp khảo thí và cập nhật kết quả hệ Song ngữ.",
    displayOrder: 6,
    isManagedPosition: true,
  },
  {
    positionCode: "VT251",
    positionName: "Nhân viên Khảo thí Tiếng Anh & CTQT",
    shortCode: "NVKTTACTQT",
    unitScope: KTDBCL_UNIT_SCOPE,
    taskGroupName: "Khảo thí TA&CTQT",
    description:
      "Chuẩn bị và điều phối kỳ thi quốc tế, quản lý đề và tài liệu thi bảo mật, tổng hợp kết quả và chứng chỉ, phối hợp đối tác và điều phối viên, cập nhật hướng dẫn và đào tạo, quản lý hồ sơ kiểm định, tài khoản đối tác, biểu phí và hợp đồng.",
    displayOrder: 7,
    isManagedPosition: true,
  },
]

export const KTDBCL_ACCOUNTABLE_POSITION: KtdbclPositionDef = {
  positionCode: "VT123",
  positionName: "Trưởng Phòng Khảo thí & ĐBCL Dạy và Học",
  shortCode: "TPKTĐBCLDVH",
  unitScope: KTDBCL_UNIT_SCOPE,
  taskGroupName: "Ban KT&ĐBCL",
  description: "Chịu trách nhiệm cuối cùng (Accountable - A) đối với các mảng Khảo thí & ĐBCL Dạy và Học.",
  displayOrder: 0,
  isManagedPosition: false,
}

export const POSITION_NAME_BY_CODE: Record<string, string> = {
  ...Object.fromEntries(KTDBCL_POSITION_CATALOG.map((p) => [p.positionCode, p.positionName])),
  VT123: KTDBCL_ACCOUNTABLE_POSITION.positionName,
  VT004: "Giám đốc Ban Khảo thí & Đảm bảo Chất lượng",
  VT112: "Phó Giám đốc Ban Khảo thí & Đảm bảo Chất lượng",
}

/**
 * RFC 4180 compliant CSV parser supporting multiline quoted fields
 */
export function parseCsvMatrix(csvText: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ""
  let inQuotes = false

  const text = csvText.replace(/^\uFEFF/, "")
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        currentField += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ",") {
        currentRow.push(currentField)
        currentField = ""
      } else if (ch === "\r" && next === "\n") {
        currentRow.push(currentField)
        rows.push(currentRow)
        currentRow = []
        currentField = ""
        i++
      } else if (ch === "\n") {
        currentRow.push(currentField)
        rows.push(currentRow)
        currentRow = []
        currentField = ""
      } else {
        currentField += ch
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField)
    rows.push(currentRow)
  }

  return rows
}

export function extractHierarchicalItemCode(detailTask: string): string | null {
  const m = String(detailTask || "")
    .trim()
    .match(/^(\d+(?:\.\d+){1,3})\.?\s*/)
  return m ? m[1] : null
}

export function deriveReportCadences(
  frequencyText: string
): Array<"WEEKLY" | "MONTHLY" | "SEMESTER" | "YEARLY" | "EVENT"> {
  const norm = String(frequencyText || "").toLowerCase()
  const out: Array<"WEEKLY" | "MONTHLY" | "SEMESTER" | "YEARLY" | "EVENT"> = []
  if (norm.includes("tuần")) out.push("WEEKLY")
  if (norm.includes("tháng")) out.push("MONTHLY")
  if (norm.includes("kỳ học") || norm.includes("học kỳ")) out.push("SEMESTER")
  if (norm.includes("năm")) out.push("YEARLY")
  if (norm.includes("kỳ thi") || norm.includes("kỳ kiểm tra") || norm.includes("đợt")) {
    out.push("EVENT")
  }
  return out.length > 0 ? out : ["MONTHLY"]
}

export function deriveRecommendedScopeFields(
  itemCode: string,
  mainTask: string,
  detailTask: string
): Array<"CAMPUS" | "ACADEMIC_YEAR" | "EXAM_PERIOD" | "SURVEY_WAVE"> {
  const fields: Array<"CAMPUS" | "ACADEMIC_YEAR" | "EXAM_PERIOD" | "SURVEY_WAVE"> = [
    "ACADEMIC_YEAR",
  ]
  const combined = `${itemCode} ${mainTask} ${detailTask}`.toLowerCase()

  if (
    combined.includes("cơ sở") ||
    combined.includes("dự giờ") ||
    combined.includes("hồ sơ") ||
    combined.includes("khảo sát") ||
    combined.includes("kiểm tra") ||
    combined.includes("kỳ thi")
  ) {
    fields.push("CAMPUS")
  }

  if (
    itemCode.startsWith("4.") ||
    itemCode.startsWith("5.") ||
    itemCode.startsWith("6.1") ||
    combined.includes("kiểm tra") ||
    combined.includes("kỳ thi") ||
    combined.includes("lms") ||
    combined.includes("đề")
  ) {
    fields.push("EXAM_PERIOD")
  }

  if (
    itemCode.startsWith("2.4") ||
    itemCode.startsWith("3.5") ||
    itemCode.startsWith("4.4") ||
    itemCode.startsWith("4.6") ||
    combined.includes("khảo sát") ||
    combined.includes("hài lòng")
  ) {
    fields.push("SURVEY_WAVE")
  }

  return Array.from(new Set(fields))
}

/**
 * Parse the official KT&ĐBCL RACI matrix rows (CSV or XLSX 2D array).
 * - Row index 3 (line 4) contains position codes (VT004, VT112, VT123, VT295, VT282, VT281, VT293, VT250, VT303, VT251, ...)
 * - Keeps every business row that has at least 1 R role among the 07 managed positions.
 */
export function parseKtdbclRaciMatrixRows(rows: string[][]): ParsedPositionTaskTemplate[] {
  // Find header row containing "STT" and "VT293"
  let headerRowIdx = -1
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const r = rows[i].map((c) => String(c || "").trim())
    if (r.includes("STT") && r.includes("VT293") && r.includes("VT295")) {
      headerRowIdx = i
      break
    }
  }
  if (headerRowIdx < 0) {
    throw new Error("Không tìm thấy dòng tiêu đề mã vị trí (STT, VT293, VT295...) trong Ma trận RACI.")
  }

  const header = rows[headerRowIdx].map((c) => String(c || "").trim())
  const idxStt = header.indexOf("STT")
  const idxFunc = header.indexOf("Chức năng")
  const idxMain = header.indexOf("Nhiệm vụ chính")
  const idxDetail = header.indexOf("Nhiệm vụ chi tiết")
  const idxFreq = header.indexOf("Tần suất")
  const idxDeliv = header.findIndex((h) => h.startsWith("Kết quả Đầu ra"))
  const idxKpi = header.findIndex((h) => h.toLowerCase().includes("kpi"))
  const idxCriteria = header.findIndex((h) => h.toLowerCase().includes("tiêu chí"))

  // Map all position columns (VTxxx)
  const posColMap: Array<{ colIdx: number; positionCode: string }> = []
  header.forEach((h, idx) => {
    if (/^VT\d+$/i.test(h)) {
      posColMap.push({ colIdx: idx, positionCode: h.toUpperCase() })
    }
  })

  const templates: ParsedPositionTaskTemplate[] = []
  const seenCodes = new Set<string>()

  for (let rIdx = headerRowIdx + 1; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx]
    const sttRaw = String(row[idxStt] || "").trim()
    const stt = parseInt(sttRaw, 10)
    if (!Number.isFinite(stt) || stt <= 0) continue // Skip section headers & legend rows

    const detailTask = String(row[idxDetail] || "").trim()
    const itemCode = extractHierarchicalItemCode(detailTask)
    if (!itemCode || seenCodes.has(itemCode)) continue

    // Extract RACI roles across positions
    const raciLinks: ParsedRaciLink[] = []
    const rPositions: string[] = []
    const cPositions: string[] = []
    const iPositions: string[] = []
    let accountablePositionCode = "VT123"

    for (const pc of posColMap) {
      const val = String(row[pc.colIdx] || "").trim().toUpperCase()
      if (!["R", "A", "C", "I"].includes(val)) continue
      const role = val as RaciRoleCode
      if (role === "A") {
        accountablePositionCode = pc.positionCode
      }
      if (KTDBCL_MANAGED_POSITION_SET.has(pc.positionCode) || pc.positionCode === "VT123") {
        raciLinks.push({ positionCode: pc.positionCode, raciRole: role })
      }
      if (KTDBCL_MANAGED_POSITION_SET.has(pc.positionCode)) {
        if (role === "R") rPositions.push(pc.positionCode)
        else if (role === "C") cPositions.push(pc.positionCode)
        else if (role === "I") iPositions.push(pc.positionCode)
      }
    }

    // Scope rule: Only rows having at least one R among the 07 managed positions
    if (rPositions.length === 0) continue

    seenCodes.add(itemCode)
    const functionGroup = String(row[idxFunc] || "").trim()
    const mainTask = String(row[idxMain] || "").trim()
    const frequency = String(row[idxFreq] || "").trim()
    const deliverables = idxDeliv >= 0 ? String(row[idxDeliv] || "").trim() : ""
    const kpiTarget = idxKpi >= 0 ? String(row[idxKpi] || "").trim() : ""
    const completionCriteria = idxCriteria >= 0 ? String(row[idxCriteria] || "").trim() : ""

    // Special governance rule for 2.4.1: keep verbatim source & flag adminNote
    const adminNote =
      itemCode === "2.4.1" ? "Cần xác nhận đối tượng khảo sát" : null

    const cleanTitle = detailTask.replace(/^\d+(?:\.\d+){1,3}\.?\s*/, "").trim()

    templates.push({
      unitScope: KTDBCL_UNIT_SCOPE,
      itemCode,
      stt,
      functionGroup,
      mainTask,
      detailTask,
      title: `[${itemCode}] ${cleanTitle}`,
      frequency,
      reportCadences: deriveReportCadences(frequency),
      deliverables,
      kpiTarget,
      completionCriteria,
      accountablePositionCode,
      adminNote,
      raciLinks,
      rPositions,
      cPositions,
      iPositions,
      recommendedScopeFields: deriveRecommendedScopeFields(itemCode, mainTask, detailTask),
    })
  }

  return templates
}
