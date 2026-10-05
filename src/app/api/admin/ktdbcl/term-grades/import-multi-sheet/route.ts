import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import * as XLSX from "xlsx"
import { normalizeKey } from "@/lib/competency-service"
import { normalizeEvaluationGrade, isAssessmentOnlySubject } from "@/lib/grading/tt22EvaluationEngine"

const ALLOWED_ROLES = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "GDCS", "GIAO_VU_CS", "GIAO_VU"]

async function checkAuth() {
  const session = await auth()
  if (!session) return null
  const role = (session?.user as any)?.role || ""
  if (!ALLOWED_ROLES.includes(role)) return null
  return session
}

function normalizeSheetToClassCode(sheetName: string, availableClasses: any[] = []): string {
  if (!sheetName) return ""
  const sheetClean = sheetName.trim()
  const sheetKey = sheetClean.toLowerCase().replace(/[^a-z0-9]/g, "")

  if (Array.isArray(availableClasses) && availableClasses.length > 0) {
    const match = availableClasses.find(c => {
      const classKey = String(c.classCode || "").toLowerCase().replace(/[^a-z0-9]/g, "")
      const classNameKey = String(c.className || "").toLowerCase().replace(/[^a-z0-9]/g, "")
      return classKey === sheetKey || classNameKey === sheetKey
    })
    if (match) return match.classCode
  }

  // Handle patterns like: 10/1_CS1 -> 10.1_CS1, 10_1_CS1 -> 10.1_CS1
  let converted = sheetClean.replace(/^(\d+)[/_](\d+)_(.*)$/i, (m, g1, g2, g3) => `${g1}.${g2}_${g3.toUpperCase()}`)
  converted = converted.replace(/^(\d+)[/_](\d+)$/i, (m, g1, g2) => `${g1}.${g2}`)
  return converted
}

export async function POST(req: NextRequest) {
  const session = await checkAuth()
  if (!session) {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const semester = (formData.get("semester") as string) || "HK1" // "HK1" | "HK2" | "CN"
    const academicYearId = (formData.get("academicYearId") as string) || ""

    if (!file) {
      return NextResponse.json({ error: "Vui lòng chọn file Excel để tải lên" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: "buffer" })

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return NextResponse.json({ error: "File Excel không có sheet nào" }, { status: 400 })
    }

    // 1. Preload master data: Academic Year, Classes, Students, Subjects, Mappings
    const academicYear = academicYearId
      ? await prisma.academicYear.findUnique({ where: { id: academicYearId } })
      : await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } })

    if (!academicYear) {
      return NextResponse.json({ error: "Không tìm thấy năm học hợp lệ" }, { status: 404 })
    }

    const [allClasses, existingSubjects, subjectAliases, mappings] = await Promise.all([
      prisma.class.findMany({
        where: { academicYearId: academicYear.id },
        include: { campus: true }
      }),
      prisma.subject.findMany({ where: { status: "ACTIVE" } }),
      prisma.subjectAlias.findMany({ select: { subjectId: true, normalizedKey: true, aliasPattern: true } }),
      prisma.studentCodeMapping.findMany({ where: { academicYearId: academicYear.id } })
    ])

    const mappingMap = new Map<string, string>(
      mappings.map(m => [m.markFileCode.toUpperCase(), m.databaseCode.toUpperCase()])
    )

    // Subject Map: name/alias -> subjectId
    const subjectMap = new Map<string, { id: string; name: string; code: string }>()
    existingSubjects.forEach(s => {
      const info = { id: s.id, name: s.subjectName, code: s.subjectCode }
      subjectMap.set(s.subjectCode.toUpperCase(), info)
      subjectMap.set(s.subjectName.normalize("NFC").toLowerCase().trim(), info)
      subjectMap.set(normalizeKey(s.subjectCode), info)
      subjectMap.set(normalizeKey(s.subjectName), info)
    })
    subjectAliases.forEach(a => {
      const s = existingSubjects.find(sub => sub.id === a.subjectId)
      if (s) {
        const info = { id: s.id, name: s.subjectName, code: s.subjectCode }
        subjectMap.set(a.normalizedKey, info)
        subjectMap.set(a.aliasPattern.toUpperCase(), info)
        subjectMap.set(a.aliasPattern.normalize("NFC").toLowerCase().trim(), info)
      }
    })

    // Custom alias mappings for MOET subjects
    const manualAliases: Record<string, string[]> = {
      "TOA": ["toán", "toan", "toan hoc"],
      "VLI": ["vật lí", "vật lý", "vat li", "vat ly", "lí", "ly"],
      "HHO": ["hóa học", "hóa", "hoa hoc", "hoa"],
      "SHO": ["sinh học", "sinh", "sinh hoc"],
      "TIN_HOC": ["tin học", "tin hoc", "tin", "ict"],
      "NVA": ["ngữ văn", "ngu van", "văn", "van"],
      "LICH_SU": ["lịch sử", "lich su", "sử", "su"],
      "LSU": ["lịch sử & giáo dục địa phương", "lịch sử", "lich su", "sử"],
      "DLI": ["địa lí", "địa lý", "dia li", "dia ly", "địa", "dia"],
      "TA": ["tiếng anh", "tieng anh", "ngoại ngữ 1", "ngoai ngu 1", "nn1", "anh"],
      "TAV": ["tiếng anh", "ngoại ngữ 1", "nn1"],
      "TNH": ["ngoại ngữ 2", "ngoai ngu 2", "nn2", "tiếng nhật", "tiếng đức"],
      "GDKTPL": ["giáo dục kinh tế và pháp luật", "gdkt&pl", "gdktpl", "kinh tế và pháp luật", "kt&pl"],
      "GKP": ["giáo dục kinh tế và pháp luật", "gdkt&pl", "gdktpl"],
      "GDQPAN": ["giáo dục quốc phòng và an ninh", "gdqp&an", "gdqp", "quốc phòng"],
      "GTC": ["giáo dục thể chất", "gdtc", "thể chất", "thể dục"],
      "MI_THUAT": ["mĩ thuật", "mỹ thuật", "mi thuat", "my thuat"],
      "MTU": ["mĩ thuật", "mỹ thuật"],
      "AM_NHAC": ["âm nhạc", "am nhac"],
      "ANA": ["âm nhạc", "am nhac"],
      "HDTNHN": ["hoạt động trải nghiệm, hướng nghiệp", "hđtn-hn", "hdtn-hn", "hđtn&hn", "hđtn", "hdtn", "trải nghiệm, hướng nghiệp"],
      "NDGDCDP": ["giáo dục địa phương", "gd địa phương", "gddp", "gdđp"],
      "KHT": ["khoa học tự nhiên", "khtn"],
      "GCD": ["giáo dục công dân", "gdcd"]
    }

    Object.entries(manualAliases).forEach(([code, aliases]) => {
      const targetSub = existingSubjects.find(s => s.subjectCode.toUpperCase() === code)
      if (targetSub) {
        aliases.forEach(al => {
          subjectMap.set(al.normalize("NFC").toLowerCase().trim(), {
            id: targetSub.id,
            name: targetSub.subjectName,
            code: targetSub.subjectCode
          })
          subjectMap.set(normalizeKey(al), {
            id: targetSub.id,
            name: targetSub.subjectName,
            code: targetSub.subjectCode
          })
        })
      }
    })

    const sheetResults: any[] = []
    let totalImportedStudents = 0
    let totalScoresUpserted = 0

    // 2. Iterate each sheet
    for (const sheetName of workbook.SheetNames) {
      const cleanSheetName = sheetName.trim()
      // Skip guide / instruction sheets if any
      const lowerSheet = cleanSheetName.toLowerCase()
      if (lowerSheet.includes("huong dan") || lowerSheet.includes("hướng dẫn") || lowerSheet.includes("danh muc") || lowerSheet.includes("template")) {
        continue
      }

      // Resolve class
      const targetClassCode = normalizeSheetToClassCode(cleanSheetName, allClasses)
      const targetClass = allClasses.find(c => 
        c.classCode.toLowerCase() === targetClassCode.toLowerCase() ||
        c.className.toLowerCase() === targetClassCode.toLowerCase() ||
        c.classCode.toLowerCase() === cleanSheetName.toLowerCase()
      )

      if (!targetClass) {
        sheetResults.push({
          sheetName: cleanSheetName,
          status: "SKIPPED",
          message: `Không tìm thấy lớp học phù hợp với tên sheet "${cleanSheetName}"`
        })
        continue
      }

      // Fetch all students in this class
      const dbStudents = await prisma.student.findMany({
        where: {
          classId: targetClass.id,
          academicYearId: academicYear.id
        }
      })

      const studentByCodeMap = new Map<string, any>(
        dbStudents.map(s => [s.studentCode.toUpperCase(), s])
      )
      const studentByNameMap = new Map<string, any>(
        dbStudents.map(s => [s.studentName.normalize("NFC").toLowerCase().trim(), s])
      )

      // Convert sheet to 2D array
      const worksheet = workbook.Sheets[sheetName]
      const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" })

      if (rawRows.length < 2) {
        sheetResults.push({
          sheetName: cleanSheetName,
          classCode: targetClass.classCode,
          status: "EMPTY",
          message: "Sheet không có dữ liệu"
        })
        continue
      }

      // Find header row: look for row containing "STT", "Họ và tên" / "Họ tên", "Mã"
      let headerRowIndex = -1
      for (let r = 0; r < Math.min(15, rawRows.length); r++) {
        const rowStr = rawRows[r].map(c => String(c).toLowerCase().trim()).join(" ")
        if ((rowStr.includes("họ và tên") || rowStr.includes("họ tên") || rowStr.includes("hoc va ten")) && 
            (rowStr.includes("mã") || rowStr.includes("stt") || rowStr.includes("toán") || rowStr.includes("ngữ văn"))) {
          headerRowIndex = r
          break
        }
      }

      if (headerRowIndex === -1) {
        // Fallback: search for row with "STT"
        for (let r = 0; r < Math.min(15, rawRows.length); r++) {
          if (rawRows[r].some(c => String(c).trim().toUpperCase() === "STT")) {
            headerRowIndex = r
            break
          }
        }
      }

      if (headerRowIndex === -1) {
        sheetResults.push({
          sheetName: cleanSheetName,
          classCode: targetClass.classCode,
          status: "ERROR",
          message: "Không tìm thấy hàng tiêu đề (STT, Họ và tên...)"
        })
        continue
      }

      const headerRow = rawRows[headerRowIndex].map(c => String(c || "").trim())
      // Sometimes headers span 2 rows (row headerRowIndex and row headerRowIndex + 1)
      const subHeaderRow = rawRows.length > headerRowIndex + 1 
        ? rawRows[headerRowIndex + 1].map(c => String(c || "").trim())
        : []

      // Identify column indices
      let colStt = -1
      let colCode = -1
      let colName = -1
      let colDob = -1
      let colAcademicRating = -1
      let colConductRating = -1
      let colAbsenceP = -1
      let colAbsenceK = -1
      let colAbsenceTotal = -1
      let colReward = -1
      let colNotes = -1

      // Subject columns mapping: colIdx -> subjectInfo
      const subjectCols = new Map<number, { id: string; name: string; code: string; isAssessment: boolean }>()

      for (let c = 0; c < headerRow.length; c++) {
        const hText = headerRow[c]
        const subText = subHeaderRow[c] || ""
        const combined = `${hText} ${subText}`.toLowerCase().trim()
        const cleanH = hText.toLowerCase().trim()

        if (cleanH === "stt") {
          colStt = c
          continue
        }
        if (cleanH.includes("mã học sinh") || cleanH.includes("mã hs") || cleanH.includes("mã định danh") || cleanH === "mã") {
          colCode = c
          continue
        }
        if (cleanH.includes("họ và tên") || cleanH.includes("họ tên") || cleanH === "tên học sinh") {
          colName = c
          continue
        }
        if (cleanH.includes("ngày sinh") || cleanH === "ns" || cleanH === "dob") {
          colDob = c
          continue
        }

        // Summary ratings
        if (combined.includes("kết quả học tập") || combined.includes("học lực") || combined.includes("kqht")) {
          colAcademicRating = c
          continue
        }
        if (combined.includes("kết quả rèn luyện") || combined.includes("hạnh kiểm") || combined.includes("kqrl")) {
          colConductRating = c
          continue
        }
        if (combined.includes("nghỉ có phép") || cleanH === "p" || subText.toLowerCase() === "p") {
          colAbsenceP = c
          continue
        }
        if (combined.includes("nghỉ không phép") || cleanH === "k" || subText.toLowerCase() === "k") {
          colAbsenceK = c
          continue
        }
        if ((combined.includes("tổng số buổi nghỉ") || combined.includes("tổng buổi") || subText.toLowerCase() === "tổng" || subText.toLowerCase() === "tong") && combined.includes("nghỉ")) {
          colAbsenceTotal = c
          continue
        }
        if (combined.includes("danh hiệu") || combined.includes("khen thưởng") || cleanH.includes("khen thưởng")) {
          colReward = c
          continue
        }
        if (combined.includes("ghi chú") || combined.includes("lên lớp") || combined.includes("trạng thái")) {
          colNotes = c
          continue
        }

        // Match subject
        const normH = normalizeKey(hText)
        let matchedSub = subjectMap.get(hText.toUpperCase()) || 
                         subjectMap.get(cleanH) || 
                         (normH ? subjectMap.get(normH) : undefined)

        if (!matchedSub) {
          // Check combined text
          const normComb = normalizeKey(combined)
          matchedSub = subjectMap.get(combined) || (normComb ? subjectMap.get(normComb) : undefined)
        }

        if (matchedSub) {
          subjectCols.set(c, {
            id: matchedSub.id,
            name: matchedSub.name,
            code: matchedSub.code,
            isAssessment: isAssessmentOnlySubject(matchedSub.name || matchedSub.code)
          })
        }
      }

      // Determine where data rows start
      let startDataRow = headerRowIndex + 1
      if (subHeaderRow.length > 0) {
        // If subHeaderRow contains "P", "K", "Tổng" or is part of header, start from headerRowIndex + 2
        const subStr = subHeaderRow.join(" ").toLowerCase()
        if (subStr.includes("điểm") || subStr.includes("nx") || subStr.includes("đạt") || subStr.includes("p") || subStr.includes("k")) {
          startDataRow = headerRowIndex + 2
        }
      }

      let sheetSuccessCount = 0
      let sheetErrorCount = 0

      for (let r = startDataRow; r < rawRows.length; r++) {
        const row = rawRows[r]
        if (!row || row.length === 0) continue

        // Check if row has student data
        const rawCode = colCode !== -1 ? String(row[colCode] || "").trim() : ""
        const rawName = colName !== -1 ? String(row[colName] || "").trim() : ""

        if (!rawCode && !rawName) continue

        // Resolve student
        let resolvedCode = rawCode ? (mappingMap.get(rawCode.toUpperCase()) || rawCode) : ""
        let student = resolvedCode ? studentByCodeMap.get(resolvedCode.toUpperCase()) : null

        if (!student && rawName) {
          student = studentByNameMap.get(rawName.normalize("NFC").toLowerCase().trim())
        }

        if (!student) {
          sheetErrorCount++
          continue
        }

        // 1. Process Scores (merging level and score if on 2 separate columns like vnEdu)
        const studentSubjectMap = new Map<string, { score: number | null; evalGrade: string | null }>()

        for (const [colIdx, subInfo] of Array.from(subjectCols.entries())) {
          const cellVal = row[colIdx]
          if (cellVal === undefined || cellVal === null || String(cellVal).trim() === "") continue

          const strVal = String(cellVal).trim()
          if (!studentSubjectMap.has(subInfo.id)) {
            studentSubjectMap.set(subInfo.id, { score: null, evalGrade: null })
          }
          const item = studentSubjectMap.get(subInfo.id)!

          const num = parseFloat(strVal.replace(",", "."))
          if (!isNaN(num) && num >= 0 && num <= 10 && !["T", "H", "C", "Đ", "CĐ", "M"].includes(strVal.toUpperCase())) {
            item.score = Math.round(num * 10) / 10
          } else {
            item.evalGrade = normalizeEvaluationGrade(strVal) || strVal
          }
        }

        for (const [subId, val] of Array.from(studentSubjectMap.entries())) {
          if (val.score !== null || val.evalGrade !== null) {
            await prisma.studentTermScore.upsert({
              where: {
                studentId_subjectId_semester: {
                  studentId: student.id,
                  subjectId: subId,
                  semester: semester
                }
              },
              update: {
                score: val.score,
                evaluationGrade: val.evalGrade
              },
              create: {
                studentId: student.id,
                subjectId: subId,
                semester: semester,
                score: val.score,
                evaluationGrade: val.evalGrade
              }
            })
            totalScoresUpserted++
          }
        }

        // 2. Process Summary
        const academicRating = colAcademicRating !== -1 ? String(row[colAcademicRating] || "").trim() : ""
        const conductRating = colConductRating !== -1 ? String(row[colConductRating] || "").trim() : ""
        const absenceP = colAbsenceP !== -1 ? (parseInt(String(row[colAbsenceP] || 0), 10) || 0) : 0
        const absenceK = colAbsenceK !== -1 ? (parseInt(String(row[colAbsenceK] || 0), 10) || 0) : 0
        const absenceTot = colAbsenceTotal !== -1 
          ? (parseInt(String(row[colAbsenceTotal] || 0), 10) || (absenceP + absenceK))
          : (absenceP + absenceK)
        const reward = colReward !== -1 ? String(row[colReward] || "").trim() : ""
        const notes = colNotes !== -1 ? String(row[colNotes] || "").trim() : ""

        if (academicRating || conductRating || absenceTot > 0 || reward || notes) {
          await prisma.studentTermSummary.upsert({
            where: {
              studentId_semester: {
                studentId: student.id,
                semester: semester
              }
            },
            update: {
              academicRating: academicRating || undefined,
              conductRating: conductRating || undefined,
              absencesPermitted: absenceP,
              absencesUnpermitted: absenceK,
              absencesTotal: absenceTot,
              reward: reward || undefined,
              notes: notes || undefined
            },
            create: {
              studentId: student.id,
              semester: semester,
              academicRating: academicRating || null,
              conductRating: conductRating || "Tốt",
              absencesPermitted: absenceP,
              absencesUnpermitted: absenceK,
              absencesTotal: absenceTot,
              reward: reward || null,
              notes: notes || null
            }
          })
        }

        sheetSuccessCount++
        totalImportedStudents++
      }

      sheetResults.push({
        sheetName: cleanSheetName,
        classCode: targetClass.classCode,
        className: targetClass.className,
        status: "SUCCESS",
        successCount: sheetSuccessCount,
        errorCount: sheetErrorCount,
        matchedSubjects: subjectCols.size
      })
    }

    return NextResponse.json({
      success: true,
      message: `Đã nạp thành công ${totalImportedStudents} học sinh từ ${sheetResults.filter(s => s.status === "SUCCESS").length} lớp.`,
      totalImportedStudents,
      totalScoresUpserted,
      sheetResults
    })
  } catch (error: any) {
    console.error("Lỗi import multi-sheet điểm tổng kết:", error)
    return NextResponse.json({ error: error.message || "Lỗi xử lý file Excel" }, { status: 500 })
  }
}
