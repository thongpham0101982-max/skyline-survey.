import * as XLSX from "xlsx"
import { DAY_LABELS, SHORT_DAY_LABELS } from "./scopeResolver"
import type { DayOfWeekCode, SessionCode, SlotRecord, TimetableConfigParsed } from "./types"

export interface ExcelReferenceMaps {
  classesByName: Map<
    string,
    { id: string; className: string; grade: string; level: string; campusId: string }
  >
  subjectsByCodeOrName: Map<string, { id: string; subjectCode?: string | null; subjectName: string }>
  teachersByCode: Map<string, { id: string; teacherCode: string; teacherName: string }>
  roomsByCode: Map<string, { id: string; roomCode: string; roomName: string }>
}

export interface ExcelRowDiagnostic {
  rowNumber: number
  className: string
  dayLabel: string
  periodLabel: string
  status: "MATCHED" | "ERROR"
  errorMessage?: string
}

export interface ExcelParseResult {
  matchedSlots: SlotRecord[]
  diagnostics: ExcelRowDiagnostic[]
  errorCount: number
  matchedCount: number
}

const DAY_PARSE_MAP: Record<string, DayOfWeekCode> = {
  MONDAY: "MONDAY",
  "THỨ HAI": "MONDAY",
  "THU HAI": "MONDAY",
  "THỨ 2": "MONDAY",
  "THU 2": "MONDAY",
  T2: "MONDAY",
  "2": "MONDAY",

  TUESDAY: "TUESDAY",
  "THỨ BA": "TUESDAY",
  "THU BA": "TUESDAY",
  "THỨ 3": "TUESDAY",
  "THU 3": "TUESDAY",
  T3: "TUESDAY",
  "3": "TUESDAY",

  WEDNESDAY: "WEDNESDAY",
  "THỨ TƯ": "WEDNESDAY",
  "THU TU": "WEDNESDAY",
  "THỨ 4": "WEDNESDAY",
  "THU 4": "WEDNESDAY",
  T4: "WEDNESDAY",
  "4": "WEDNESDAY",

  THURSDAY: "THURSDAY",
  "THỨ NĂM": "THURSDAY",
  "THU NAM": "THURSDAY",
  "THỨ 5": "THURSDAY",
  "THU 5": "THURSDAY",
  T5: "THURSDAY",
  "5": "THURSDAY",

  FRIDAY: "FRIDAY",
  "THỨ SÁU": "FRIDAY",
  "THU SAU": "FRIDAY",
  "THỨ 6": "FRIDAY",
  "THU 6": "FRIDAY",
  T6: "FRIDAY",
  "6": "FRIDAY",

  SATURDAY: "SATURDAY",
  "THỨ BẢY": "SATURDAY",
  "THU BAY": "SATURDAY",
  "THỨ 7": "SATURDAY",
  "THU 7": "SATURDAY",
  T7: "SATURDAY",
  "7": "SATURDAY",
}

function normalizeSession(raw: string): SessionCode | null {
  const u = String(raw || "").trim().toUpperCase()
  if (u === "MORNING" || u === "SÁNG" || u === "SANG" || u === "S" || u === "BUỔI SÁNG") {
    return "MORNING"
  }
  if (u === "AFTERNOON" || u === "CHIỀU" || u === "CHIEU" || u === "C" || u === "BUỔI CHIỀU") {
    return "AFTERNOON"
  }
  return null
}

function normalizeWeekType(raw: string): "ALL" | "EVEN" | "ODD" {
  const u = String(raw || "").trim().toUpperCase()
  if (u === "EVEN" || u === "CHẴN" || u === "CHAN" || u === "TUẦN CHẴN") return "EVEN"
  if (u === "ODD" || u === "LẺ" || u === "LE" || u === "TUẦN LẺ") return "ODD"
  return "ALL"
}

/**
 * Generates an Excel (.xlsx) template defaulting to 4 Morning + 4 Afternoon periods
 * (or the exact configured counts on `config`) with Reference Catalog sheets for exact code matching.
 */
export function buildTimetableImportTemplateBase64(params: {
  config: TimetableConfigParsed
  classes: Array<{ className: string; grade: string; level: string }>
  subjects: Array<{ subjectCode?: string | null; subjectName: string }>
  teachers: Array<{ teacherCode?: string | null; teacherName: string }>
  rooms: Array<{ roomCode: string; roomName: string; roomType: string }>
}): string {
  const wb = XLSX.utils.book_new()
  const mCount = params.config.morningPeriods || 4
  const aCount = params.config.afternoonPeriods ?? 4
  const days =
    params.config.workingDays?.length > 0
      ? params.config.workingDays
      : (["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as DayOfWeekCode[])

  // Sheet 1: Nhap_TKB (Structured tabular rows pre-populated for 1st class as clear example structure, empty subject/teacher)
  const header = [
    "Lớp",
    "Thứ",
    "Buổi",
    "Tiết",
    "Mã môn hoặc Tên môn",
    "Mã GV chính",
    "Mã GV đồng giảng",
    "Mã Trợ giảng",
    "Mã Phòng",
    "Tuần (ALL/ODD/EVEN)",
    "Môn luân phiên",
    "Mã GV luân phiên",
  ]

  const rows: any[][] = [header]
  const sampleClasses = params.classes.slice(0, 2)
  for (const cls of sampleClasses) {
    for (const d of days) {
      for (let p = 1; p <= mCount; p++) {
        rows.push([cls.className, SHORT_DAY_LABELS[d] || d, "Sáng", p, "", "", "", "", "", "ALL", "", ""])
      }
      for (let p = 1; p <= aCount; p++) {
        rows.push([cls.className, SHORT_DAY_LABELS[d] || d, "Chiều", p, "", "", "", "", "", "ALL", "", ""])
      }
    }
  }

  const wsMain = XLSX.utils.aoa_to_sheet(rows)
  wsMain["!cols"] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 7 },
    { wch: 24 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 18 },
    { wch: 20 },
    { wch: 16 },
  ]
  XLSX.utils.book_append_sheet(wb, wsMain, "Nhap_TKB")

  // Sheet 2: Danh_Muc_Lop_Mon_GV_Phong for exact lookup
  const refRows: any[][] = [
    ["LỚP HỌC", "KHỐI", "CẤP", "", "MÃ MÔN", "TÊN MÔN HỌC", "", "MÃ GIÁO VIÊN", "HỌ TÊN GIÁO VIÊN", "", "MÃ PHÒNG", "TÊN PHÒNG"],
  ]
  const maxLen = Math.max(
    params.classes.length,
    params.subjects.length,
    params.teachers.length,
    params.rooms.length
  )
  for (let i = 0; i < maxLen; i++) {
    const c = params.classes[i]
    const s = params.subjects[i]
    const t = params.teachers[i]
    const r = params.rooms[i]
    refRows.push([
      c?.className || "",
      c?.grade || "",
      c?.level || "",
      "",
      s?.subjectCode || "",
      s?.subjectName || "",
      "",
      t?.teacherCode || "",
      t?.teacherName || "",
      "",
      r?.roomCode || "",
      r?.roomName || "",
    ])
  }
  const wsRef = XLSX.utils.aoa_to_sheet(refRows)
  XLSX.utils.book_append_sheet(wb, wsRef, "Danh_Muc_Ma_Chuan")

  return XLSX.write(wb, { type: "base64", bookType: "xlsx" })
}

/**
 * Parses an uploaded Excel (.xlsx) buffer/base64 and strictly reconciles codes
 * against in-scope classes, subjects, teachers (by teacherCode), and rooms (by roomCode).
 */
export function parseAndReconcileTimetableExcel(params: {
  base64Content: string
  campusId: string
  academicYearId: string
  semester: number
  versionId?: string | null
  refs: ExcelReferenceMaps
}): ExcelParseResult {
  const wb = XLSX.read(params.base64Content, { type: "base64" })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) {
    return { matchedSlots: [], diagnostics: [], errorCount: 1, matchedCount: 0 }
  }

  const ws = wb.Sheets[sheetName]
  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })
  if (rawRows.length < 2) {
    return { matchedSlots: [], diagnostics: [], errorCount: 0, matchedCount: 0 }
  }

  const matchedSlots: SlotRecord[] = []
  const diagnostics: ExcelRowDiagnostic[] = []

  for (let rIdx = 1; rIdx < rawRows.length; rIdx++) {
    const row = rawRows[rIdx]
    const rawClass = String(row[0] || "").trim()
    const rawDay = String(row[1] || "").trim()
    const rawSession = String(row[2] || "").trim()
    const rawPeriod = Number(row[3] || 0)
    const rawSubject = String(row[4] || "").trim()
    const rawTeacherCode = String(row[5] || "").trim()
    const rawCoTeacherCode = String(row[6] || "").trim()
    const rawAssistantCode = String(row[7] || "").trim()
    const rawRoomCode = String(row[8] || "").trim()
    const rawWeekType = String(row[9] || "ALL").trim()
    const rawAltSubject = String(row[10] || "").trim()
    const rawAltTeacherCode = String(row[11] || "").trim()

    // Skip blank template rows where no subject and no teacher were entered
    if (!rawSubject && !rawTeacherCode) continue

    const rowErrors: string[] = []

    const cls = params.refs.classesByName.get(rawClass.toUpperCase())
    if (!cls) {
      rowErrors.push(`Lớp "${rawClass}" không thuộc phạm vi bộ TKB/cơ sở đang chọn`)
    }

    const dayCode = DAY_PARSE_MAP[rawDay.toUpperCase()]
    if (!dayCode) {
      rowErrors.push(`Thứ "${rawDay}" không hợp lệ`)
    }

    const sessionCode = normalizeSession(rawSession)
    if (!sessionCode) {
      rowErrors.push(`Buổi "${rawSession}" không hợp lệ (chỉ nhận Sáng / Chiều)`)
    }

    if (!Number.isInteger(rawPeriod) || rawPeriod < 1 || rawPeriod > 6) {
      rowErrors.push(`Tiết "${row[3]}" không hợp lệ`)
    }

    const subject = rawSubject
      ? params.refs.subjectsByCodeOrName.get(rawSubject.toUpperCase())
      : undefined
    if (!subject) {
      rowErrors.push(`Không khớp mã/tên môn "${rawSubject}"`)
    }

    let primaryTeacher: { id: string; teacherCode: string; teacherName: string } | undefined
    if (rawTeacherCode) {
      primaryTeacher = params.refs.teachersByCode.get(rawTeacherCode.toUpperCase())
      if (!primaryTeacher) {
        rowErrors.push(`Không tìm thấy Mã GV chính "${rawTeacherCode}"`)
      }
    }

    let coTeacher: { id: string; teacherCode: string; teacherName: string } | undefined
    if (rawCoTeacherCode) {
      coTeacher = params.refs.teachersByCode.get(rawCoTeacherCode.toUpperCase())
      if (!coTeacher) {
        rowErrors.push(`Không tìm thấy Mã GV đồng giảng "${rawCoTeacherCode}"`)
      }
    }

    let assistantTeacher: { id: string; teacherCode: string; teacherName: string } | undefined
    if (rawAssistantCode) {
      assistantTeacher = params.refs.teachersByCode.get(rawAssistantCode.toUpperCase())
      if (!assistantTeacher) {
        rowErrors.push(`Không tìm thấy Mã Trợ giảng "${rawAssistantCode}"`)
      }
    }

    let room: { id: string; roomCode: string; roomName: string } | undefined
    if (rawRoomCode) {
      room = params.refs.roomsByCode.get(rawRoomCode.toUpperCase())
      if (!room) {
        rowErrors.push(`Không tìm thấy Mã Phòng "${rawRoomCode}" tại cơ sở này`)
      }
    }

    let altSubject: { id: string; subjectCode?: string | null; subjectName: string } | undefined
    if (rawAltSubject) {
      altSubject = params.refs.subjectsByCodeOrName.get(rawAltSubject.toUpperCase())
      if (!altSubject) {
        rowErrors.push(`Không khớp môn luân phiên "${rawAltSubject}"`)
      }
    }

    let altTeacher: { id: string; teacherCode: string; teacherName: string } | undefined
    if (rawAltTeacherCode) {
      altTeacher = params.refs.teachersByCode.get(rawAltTeacherCode.toUpperCase())
      if (!altTeacher) {
        rowErrors.push(`Không tìm thấy Mã GV luân phiên "${rawAltTeacherCode}"`)
      }
    }

    if (rowErrors.length > 0 || !cls || !dayCode || !sessionCode || !subject) {
      diagnostics.push({
        rowNumber: rIdx + 1,
        className: rawClass || "—",
        dayLabel: rawDay || "—",
        periodLabel: `${rawSession} T${rawPeriod || "?"}`,
        status: "ERROR",
        errorMessage: rowErrors.join("; "),
      })
      continue
    }

    diagnostics.push({
      rowNumber: rIdx + 1,
      className: cls.className,
      dayLabel: DAY_LABELS[dayCode] || dayCode,
      periodLabel: `${sessionCode === "MORNING" ? "Sáng" : "Chiều"} T${rawPeriod}`,
      status: "MATCHED",
    })

    matchedSlots.push({
      versionId: params.versionId || null,
      academicYearId: params.academicYearId,
      semester: params.semester,
      campusId: params.campusId,
      level: cls.level,
      grade: cls.grade,
      classId: cls.id,
      className: cls.className,
      dayOfWeek: dayCode,
      session: sessionCode,
      periodNumber: rawPeriod,
      subjectId: subject.id,
      subjectCode: subject.subjectCode || null,
      subjectName: subject.subjectName,
      teacherId: primaryTeacher?.id || null,
      teacherCode: primaryTeacher?.teacherCode || null,
      teacherName: primaryTeacher?.teacherName || null,
      coTeacherId: coTeacher?.id || null,
      coTeacherCode: coTeacher?.teacherCode || null,
      coTeacherName: coTeacher?.teacherName || null,
      assistantTeacherId: assistantTeacher?.id || null,
      assistantTeacherCode: assistantTeacher?.teacherCode || null,
      assistantTeacherName: assistantTeacher?.teacherName || null,
      roomId: room?.id || null,
      roomCode: room?.roomCode || null,
      roomName: room?.roomName || null,
      weekType: normalizeWeekType(rawWeekType),
      altSubjectId: altSubject?.id || null,
      altSubjectName: altSubject?.subjectName || null,
      altTeacherId: altTeacher?.id || null,
      altTeacherCode: altTeacher?.teacherCode || null,
      altTeacherName: altTeacher?.teacherName || null,
      isLocked: false,
      colorCode: "#F0FDFA",
    })
  }

  const errorCount = diagnostics.filter((d) => d.status === "ERROR").length
  return {
    matchedSlots,
    diagnostics,
    errorCount,
    matchedCount: matchedSlots.length,
  }
}

export function exportLookupScheduleToExcelBase64(params: {
  title: string
  rows: Array<Record<string, string | number>>
}): string {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(params.rows)
  XLSX.utils.book_append_sheet(wb, ws, params.title.slice(0, 31) || "ThoiKhoaBieu")
  return XLSX.write(wb, { type: "base64", bookType: "xlsx" })
}
