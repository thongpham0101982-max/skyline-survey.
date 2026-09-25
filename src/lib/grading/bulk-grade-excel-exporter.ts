// @ts-nocheck
import * as XLSX from "xlsx"
import { getColumnMaxScore } from "./formula-calculator"

interface BulkExportOptions {
  campusName: string
  academicYearName: string
  evaluationPeriodCode: string
  evaluationPeriodName: string
  classes: any[]
  students: any[]
  subjects: any[]
  configs: any[]
  entries: any[]
  teachingAssignments?: any[]
  includeOverviewSheet?: boolean
  includeMasterSummarySheet?: boolean
  groupByGradeSheet?: boolean
  onProgress?: (percent: number, message: string) => void
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
  const rawGrade = (grade || "").trim()
  const numMatch = rawGrade.match(/(\d+)/)
  const gradeNum = numMatch ? numMatch[1] : ""
  const candidateGrades = [rawGrade, `Khối ${gradeNum}`, `Khoi ${gradeNum}`, gradeNum, "ALL"]

  // 1. Exact subject + matching grade
  const subjectConfigs = configs.filter(c => c.subjectId === subjectId)
  if (subjectConfigs.length > 0) {
    const match = subjectConfigs.find(c => candidateGrades.includes(c.grade) && (c.evaluationPeriod === evaluationPeriod || c.evaluationPeriod === "ALL"))
    if (match) return match
    return subjectConfigs[0]
  }

  // 2. Fallback to general config (subjectId == null)
  const generalConfigs = configs.filter(c => !c.subjectId)
  const genMatch = generalConfigs.find(c => candidateGrades.includes(c.grade) && (c.evaluationPeriod === evaluationPeriod || c.evaluationPeriod === "ALL"))
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

/**
 * Main Bulk Export Function
 */
export async function generateBulkGradeExcel(options: BulkExportOptions) {
  const {
    campusName = "CoSo",
    academicYearName = "2026-2027",
    evaluationPeriodCode = "KSDN",
    evaluationPeriodName = "Khảo sát đầu năm (KSĐN)",
    classes = [],
    students = [],
    subjects = [],
    configs = [],
    entries = [],
    includeOverviewSheet = true,
    includeMasterSummarySheet = true,
    groupByGradeSheet = false,
    onProgress
  } = options

  onProgress?.(5, "Đang khởi tạo cấu trúc Sổ điểm...")

  const workbook = XLSX.utils.book_new()
  const sheetNamesUsed = new Set<string>()

  // Map quick lookup
  const classMap = new Map<string, any>()
  classes.forEach(c => classMap.set(c.id, c))

  // Group students by class
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

  // Quick lookup for entries: key = `${studentId}_${subjectId}`
  const entryMap = new Map<string, any>()
  entries.forEach(e => {
    entryMap.set(`${e.studentId}_${e.subjectId}`, e)
  })

  // -------------------------------------------------------------
  // 1. SHEET TỔNG QUAN BÁO CÁO & THỐNG KÊ (OVERVIEW DASHBOARD)
  // -------------------------------------------------------------
  if (includeOverviewSheet) {
    onProgress?.(15, "Đang tạo Sheet Báo cáo Tổng quan & Thống kê...")
    const overviewRows: any[][] = [
      ["HỆ THỐNG GIÁO DỤC SKY-LINE - BÁO CÁO TỔNG QUAN TIẾN ĐỘ & PHỔ ĐIỂM"],
      [`Cơ sở: ${campusName} | Học kỳ / Kỳ khảo sát: ${evaluationPeriodName} | Năm học: ${academicYearName}`],
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
      let totalScore = 0
      let gioCount = 0
      let khaCount = 0
      let datCount = 0
      let yeuCount = 0

      studentsSorted.forEach(st => {
        const ent = entryMap.get(`${st.id}_${subj.id}`)
        if (ent && ent.compositeScore !== null && ent.compositeScore !== undefined && !isNaN(Number(ent.compositeScore))) {
          const score = Number(ent.compositeScore)
          gradedCount++
          totalScore += score
          if (score >= 8.0) gioCount++
          else if (score >= 6.5) khaCount++
          else if (score >= 5.0) datCount++
          else yeuCount++
        }
      })

      const rate = totalStudentsCount > 0 ? ((gradedCount / totalStudentsCount) * 100).toFixed(1) : "0.0"
      const avg = gradedCount > 0 ? (totalScore / gradedCount).toFixed(2) : "-"
      const rateGio = gradedCount > 0 ? ((gioCount / gradedCount) * 100).toFixed(1) : "0.0"
      const rateKha = gradedCount > 0 ? ((khaCount / gradedCount) * 100).toFixed(1) : "0.0"
      const rateDat = gradedCount > 0 ? ((datCount / gradedCount) * 100).toFixed(1) : "0.0"
      const rateYeu = gradedCount > 0 ? ((yeuCount / gradedCount) * 100).toFixed(1) : "0.0"

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
      "Họ và tên",
      "Ngày sinh",
      "Giới tính"
    ]
    subjects.forEach(s => {
      masterHeaders.push(s.subjectName)
    })
    masterHeaders.push("ĐTB Toàn môn", "Số môn đã có điểm")

    const masterRows: any[][] = [
      ["HỆ THỐNG GIÁO DỤC SKY-LINE - BẢNG ĐIỂM TỔNG HỢP CÁC MÔN HỌC SINH"],
      [`Cơ sở: ${campusName} | Học kỳ / Kỳ khảo sát: ${evaluationPeriodName} | Năm học: ${academicYearName}`],
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
        st.studentCode,
        st.studentName,
        formatDate(st.dateOfBirth),
        st.gender || ""
      ]

      let stGradedCount = 0
      let stScoreSum = 0

      subjects.forEach(subj => {
        const ent = entryMap.get(`${st.id}_${subj.id}`)
        if (ent && ent.compositeScore !== null && ent.compositeScore !== undefined && !isNaN(Number(ent.compositeScore))) {
          const sc = Number(ent.compositeScore)
          row.push(sc)
          stGradedCount++
          stScoreSum += sc
        } else {
          row.push("")
        }
      })

      const stAvg = stGradedCount > 0 ? (stScoreSum / stGradedCount).toFixed(2) : ""
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
  for (let sIdx = 0; sIdx < totalSubj; sIdx++) {
    const subj = subjects[sIdx]
    const currentProgress = 35 + Math.round(((sIdx + 1) / totalSubj) * 60)
    onProgress?.(currentProgress, `Đang xử lý Sheet môn: ${subj.subjectName} (${sIdx + 1}/${totalSubj})...`)

    // Tìm cấu hình cột điểm đại diện cho môn học
    // Để đảm bảo bảng điểm chứa đầy đủ các cột của các khối, ta duyệt qua các cấu hình của môn này
    const subjConfigs = configs.filter(c => c.subjectId === subj.id)
    let colNames: string[] = []
    let colTypes: string[] = []
    let colMaxScores: any = null
    let compositeTitle = "Điểm thành phần / Tổng kết"
    let hasComposite = true
    let hasRemark = true

    if (subjConfigs.length > 0) {
      // Ưu tiên config có số cột nhiều nhất hoặc config cụ thể
      const bestConf = subjConfigs.reduce((max, c) => ((c.columnCount || 1) > (max?.columnCount || 0) ? c : max), subjConfigs[0])
      try {
        colNames = typeof bestConf.columnNames === "string" ? JSON.parse(bestConf.columnNames) : bestConf.columnNames || []
        colTypes = typeof bestConf.columnTypes === "string" ? JSON.parse(bestConf.columnTypes) : bestConf.columnTypes || []
        colMaxScores = typeof bestConf.columnMaxScores === "string" ? JSON.parse(bestConf.columnMaxScores) : bestConf.columnMaxScores || []
      } catch {
        colNames = ["Điểm 1"]
      }
      compositeTitle = bestConf.compositeColumnName || "Điểm thành phần"
      hasComposite = bestConf.hasCompositeColumn !== false
      hasRemark = bestConf.hasRemarkColumn !== false
    }

    if (colNames.length === 0) {
      colNames = ["Điểm ĐĐGTX"]
    }

    const headers = [
      "STT",
      "Khối",
      "Lớp",
      "Mã HS",
      "Họ và tên",
      "Ngày sinh",
      "Giới tính"
    ]

    colNames.forEach((colName, cIdx) => {
      const cType = colTypes[cIdx] || "SCORE_10"
      const colMax = getColumnMaxScore(cType, colMaxScores, cIdx)
      headers.push(colMax !== 10 ? `${colName} (Tối đa ${colMax}đ)` : colName)
    })

    if (hasComposite) headers.push(compositeTitle)
    if (hasRemark) headers.push("Nhận xét")

    const subjectRows: any[][] = [
      [`HỆ THỐNG GIÁO DỤC SKY-LINE - BẢNG ĐIỂM CHI TIẾT MÔN ${subj.subjectName.toUpperCase()}`],
      [`Cơ sở: ${campusName} | Môn: ${subj.subjectName} (${subj.subjectCode}) | Kỳ đánh giá: ${evaluationPeriodName} | Năm học: ${academicYearName}`],
      [`Thời gian xuất file: ${new Date().toLocaleString("vi-VN")}`],
      [],
      headers
    ]

    studentsSorted.forEach((st, idx) => {
      const cls = classMap.get(st.classId)
      const ent = entryMap.get(`${st.id}_${subj.id}`)

      let componentMap: any = {}
      if (ent?.componentScores) {
        if (typeof ent.componentScores === "object") {
          componentMap = ent.componentScores
        } else {
          try {
            componentMap = JSON.parse(ent.componentScores)
          } catch {
            componentMap = {}
          }
        }
      }

      const row: any[] = [
        idx + 1,
        cls?.grade || "",
        cls?.className || "",
        st.studentCode,
        st.studentName,
        formatDate(st.dateOfBirth),
        st.gender || ""
      ]

      colNames.forEach((_, cIdx) => {
        const val = componentMap[`col${cIdx}`]
        row.push(val !== undefined && val !== null ? val : "")
      })

      if (hasComposite) {
        row.push(ent?.compositeScore !== undefined && ent?.compositeScore !== null ? ent.compositeScore : "")
      }
      if (hasRemark) {
        row.push(ent?.remark || "")
      }

      subjectRows.push(row)
    })

    const wsSubj = XLSX.utils.aoa_to_sheet(subjectRows)
    wsSubj["!cols"] = autoFitColumns(subjectRows)
    const subjSheetName = sanitizeSheetName(subj.subjectName || subj.subjectCode, sheetNamesUsed)
    XLSX.utils.book_append_sheet(workbook, wsSubj, subjSheetName)
  }

  // -------------------------------------------------------------
  // 4. LƯU & TẢI FILE EXCEL
  // -------------------------------------------------------------
  onProgress?.(98, "Đang đóng gói và hoàn tất tải file Excel...")
  const cleanCampus = campusName.replace(/\s+/g, "_")
  const fileName = `BangDiem_${cleanCampus}_${evaluationPeriodCode}_${academicYearName.replace(/\s+/g, "")}.xlsx`

  XLSX.writeFile(workbook, fileName)
  onProgress?.(100, "Xuất file Excel thành công!")
}
