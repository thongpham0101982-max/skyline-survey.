function normalizeSheetToClassCode(sheetName: string, availableClasses: any[] = []): string {
  if (!sheetName) return ""
  const sheetKey = sheetName.toLowerCase().replace(/[^a-z0-9]/g, "")

  if (Array.isArray(availableClasses) && availableClasses.length > 0) {
    const match = availableClasses.find(c => {
      const classKey = String(c.classCode || "").toLowerCase().replace(/[^a-z0-9]/g, "")
      return classKey === sheetKey
    })
    if (match) return match.classCode
  }

  let converted = sheetName.replace(/^(\d+)_(\d+)_(.*)$/i, (m, g1, g2, g3) => `${g1}.${g2}_${g3.toUpperCase()}`)
  converted = converted.replace(/^(\d+)_(\d+)([a-zA-Z]+)_(.*)$/i, (m, g1, g2, g3, g4) => `${g1}.${g2}${g3.toUpperCase()}_${g4.toUpperCase()}`)
  converted = converted.replace(/^(\d+)([a-zA-Z]+)_(.*)$/i, (m, g1, g2, g3) => `${g1}${g2.toUpperCase()}_${g3.toUpperCase()}`)

  return converted
}

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

const ALLOWED_ROLES = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "GDCS", "GIAO_VU_CS", "GIAO_VU"]

async function checkAuth() {
  const session = await auth()
  if (!session) return null
  const role = (session?.user as any)?.role || ""
  if (!ALLOWED_ROLES.includes(role)) return null
  return session
}

export async function POST(req: NextRequest) {
  const session = await checkAuth()
  if (!session) {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 })
  }

  try {
    const url = new URL(req.url)
    const isValidate = url.searchParams.get("validate") === "true"
    const body = await req.json()
    
    // Write debug payload to Database AuditLog
    if (!isValidate) {
      try {
        await prisma.auditLog.create({
          data: {
            userId: "debug",
            userEmail: "debug@skyline.edu.vn",
            action: "IMPORT_KQHT_DEBUG",
            targetTable: "StudentTermScore",
            targetId: "debug",
            newValues: JSON.stringify(body)
          }
        });
      } catch (debugErr) {
        console.error("Failed to log debug payload to database:", debugErr);
      }
    }

    if (isValidate) {
      const { academicYearId, classesData } = body
      if (!academicYearId || !classesData || !Array.isArray(classesData)) {
        return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 })
      }

      // Fetch code mappings first
      const mappings = await prisma.studentCodeMapping.findMany({
        where: { academicYearId }
      })
      const mappingMap = new Map<string, string>(mappings.map(m => [m.markFileCode.toUpperCase(), m.databaseCode.toUpperCase()]))

      // Fetch all students of the academic year
      const dbStudents = await prisma.student.findMany({
        where: { academicYearId },
        include: { class: true }
      })
      const studentMap = new Map<string, any>(dbStudents.map(s => [s.studentCode.toUpperCase(), s]))

      // Map by normalized student name to catch missing mapping entries
      const normName = (n: string) => n ? n.trim().toLowerCase().replace(/\s+/g, " ") : ""
      const studentByNameMap = new Map<string, any[]>()
      dbStudents.forEach(s => {
        const norm = normName(s.studentName)
        if (norm) {
          if (!studentByNameMap.has(norm)) {
            studentByNameMap.set(norm, [])
          }
          studentByNameMap.get(norm)!.push(s)
        }
      })

      const mismatches: any = {}

      classesData.forEach(cData => {
        const { classCode, studentCodes, students } = cData
        const targetClassCodeUpper = String(classCode).trim().toUpperCase()

        const rows = students || (studentCodes || []).map((code: any) => ({ studentCode: code }))

        rows.forEach((s: any) => {
          const sCodeUpper = String(s.studentCode || "").trim().toUpperCase()
          const sName = String(s.studentName || "").trim()

          const resolvedCode = mappingMap.get(sCodeUpper) || sCodeUpper
          const dbStudent = studentMap.get(resolvedCode)

          if (dbStudent) {
            // Validate class mismatch
            const dbClassCodeUpper = dbStudent.class.classCode.toUpperCase()
            if (dbClassCodeUpper !== targetClassCodeUpper) {
              mismatches[sCodeUpper] = {
                type: "CLASS_MISMATCH",
                dbClassCode: dbStudent.class.classCode,
                dbStudentName: dbStudent.studentName
              }
            }
          } else {
            // Student not found by resolved code. Let's find by name to see if mapping is missing!
            const norm = normName(sName)
            if (norm) {
              const matchedByName = studentByNameMap.get(norm) || []
              // Prefer real profile with length 10 or starting with 05/06
              const realProfile = matchedByName.find(dbS => dbS.studentCode.startsWith("05") || dbS.studentCode.startsWith("06") || dbS.studentCode.length === 10)
              
              if (realProfile) {
                mismatches[sCodeUpper] = {
                  type: "MISSING_MAPPING",
                  dbClassCode: realProfile.class?.classCode || "Chưa xếp lớp",
                  dbStudentName: realProfile.studentName,
                  dbStudentCode: realProfile.studentCode
                }
              } else if (matchedByName.length > 0) {
                mismatches[sCodeUpper] = {
                  type: "MISSING_MAPPING",
                  dbClassCode: matchedByName[0].class?.classCode || "Chưa xếp lớp",
                  dbStudentName: matchedByName[0].studentName,
                  dbStudentCode: matchedByName[0].studentCode
                }
              }
            }
          }
        })
      })

      return NextResponse.json({ success: true, mismatches })
    }
    const { academicYearId, level, semester, importOptions, classesData } = body

    if (!academicYearId || !level || !semester || !importOptions || !classesData || !Array.isArray(classesData)) {
      return NextResponse.json({ error: "Dữ liệu yêu cầu không hợp lệ" }, { status: 400 })
    }

    if (level === "PRIMARY") {
      if (semester !== "HK1" && semester !== "CN") {
        return NextResponse.json({ error: "Đối với cấp Tiểu học, học kỳ chỉ có thể là Học kỳ 1 (HK1) hoặc Cả năm (CN)." }, { status: 400 })
      }
    }

    const { 
      updateProfile, 
      importSummaryRatings, 
      importAcademicRating,
      importConductRating,
      importAbsences, 
      importRewardAndPromotion, 
      importReward,
      importPromotion,
      selectedSubjects = [] 
    } = importOptions

    const shouldImportAcademic = importAcademicRating !== undefined ? importAcademicRating : !!importSummaryRatings
    const shouldImportConduct = importConductRating !== undefined ? importConductRating : !!importSummaryRatings
    const shouldImportReward = importReward !== undefined ? importReward : !!importRewardAndPromotion
    const shouldImportPromotion = importPromotion !== undefined ? importPromotion : !!importRewardAndPromotion

    let countStudents = 0
    let countScores = 0
    let countSummaries = 0
    const errors: string[] = []

    // Fetch academic year
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: academicYearId }
    })
    if (!academicYear) {
      return NextResponse.json({ error: "Năm học không tồn tại" }, { status: 404 })
    }

    // Fetch student code mappings for this academic year
    const mappings = await prisma.studentCodeMapping.findMany({
      where: { academicYearId }
    })
    const mappingMap = new Map<string, string>(mappings.map(m => [m.markFileCode.toUpperCase(), m.databaseCode.toUpperCase()]))

    // Resolve mark file student codes to database student codes
    classesData.forEach(c => {
      if (c.students && Array.isArray(c.students)) {
        c.students.forEach(st => {
          const rawCode = String(st.studentCode || "").trim().toUpperCase()
          const mappedCode = mappingMap.get(rawCode)
          if (mappedCode) {
            st.studentCode = mappedCode
          }
        })
      }
    })

    // 1. Auto-create new subjects if requested
    const subjectMap = new Map() // key: subjectCode/subjectName, value: subjectId
    
    // Load existing subjects
    const existingSubjects = await prisma.subject.findMany({
      where: { status: "ACTIVE" }
    })
    existingSubjects.forEach((sub) => {
      subjectMap.set(sub.subjectCode.toUpperCase(), sub.id)
      subjectMap.set(sub.subjectName.normalize("NFC").toLowerCase().trim(), sub.id)
    })

    // Pre-fetch and cache all campuses, classes and students
    const existingCampuses = await prisma.campus.findMany()
    const campusMap = new Map<string, any>(existingCampuses.map(c => [c.campusCode.toUpperCase(), c]))

    const existingClasses = await prisma.class.findMany()
    const classMap = new Map<string, any>(existingClasses.map(c => [c.classCode.toUpperCase(), c]))

    const allStudentCodes = classesData.flatMap(c => (c.students || []).map(s => String(s.studentCode).trim().toUpperCase())).filter(Boolean)
    const existingStudents = await prisma.student.findMany({
      where: {
        studentCode: { in: allStudentCodes },
        academicYearId: academicYear.id
      }
    })
    const studentMap = new Map<string, any>(existingStudents.map(s => [s.studentCode.toUpperCase(), s]))

    // No new subjects are auto-created to protect DB catalog integrity

    // 2. Loop through classes
    for (const cData of classesData) {
      const { classCode, students } = cData
      if (!classCode || !students || !Array.isArray(students)) continue

      const normalizedCode = normalizeSheetToClassCode(String(classCode).trim(), existingClasses)
      const rawClassName = normalizedCode || String(classCode).trim()
      
      let campusCode = "CS1"
      if (rawClassName.includes("_")) {
        const parts = rawClassName.split("_")
        campusCode = parts[parts.length - 1].trim().toUpperCase()
      }
      
      let campus = campusMap.get(campusCode)
      if (!campus) {
        try {
          campus = await prisma.campus.create({
            data: {
              campusCode,
              campusName: `Cơ sở ${campusCode}`,
              status: "ACTIVE"
            }
          })
        } catch (campusErr) {
          campus = await prisma.campus.findUnique({ where: { campusCode } })
          if (!campus) throw campusErr
        }
        if (campus) {
          campusMap.set(campusCode, campus)
        }
      }

      let targetClass = classMap.get(rawClassName.toUpperCase())
      if (!targetClass) {
        targetClass = await prisma.class.findFirst({ where: { classCode: rawClassName } })
      }
      if (!targetClass) {
        try {
          targetClass = await prisma.class.create({
            data: {
              classCode: rawClassName,
              className: rawClassName,
              campusId: campus.id,
              academicYearId: academicYear.id,
              level: level === "PRIMARY" ? "Tieu hoc" : "Trung hoc",
              status: "ACTIVE"
            }
          })
        } catch (classErr) {
          targetClass = await prisma.class.findFirst({ where: { classCode: rawClassName } })
          if (!targetClass) throw classErr
        }
      }
      if (targetClass) {
        classMap.set(rawClassName.toUpperCase(), targetClass)
      }

      // 3. Process each student row-by-row
      for (const s of students) {
        try {
          if (!s.studentCode || !s.studentName) continue

          const sCode = String(s.studentCode).trim().toUpperCase()
          const sName = String(s.studentName).trim()

          let dob = null
          if (s.dateOfBirth) {
            const d = new Date(s.dateOfBirth)
            if (!isNaN(d.getTime())) dob = d
          }

          let finalStudentCode = sCode
          const mappedCode = mappingMap.get(sCode)
          if (mappedCode) {
            finalStudentCode = mappedCode
          } else {
            // Robust auto-match by normalized name and class
            const excelNorm = sName.normalize("NFC").toLowerCase().trim().replace(/\s+/g, " ")
            const matchedStudent = existingStudents.find((st: any) => {
              if (st.classId !== targetClass.id && st.class?.classCode !== targetClass.classCode) return false
              const dbNorm = String(st.studentName || "").normalize("NFC").toLowerCase().trim().replace(/\s+/g, " ")
              return dbNorm === excelNorm
            })
            if (matchedStudent) {
              finalStudentCode = matchedStudent.studentCode
              console.log(`Auto-matched student by name and class: ${sName} (${sCode}) -> ${finalStudentCode}`)
            }
          }

          // Upsert student
          const student = await prisma.student.upsert({
            where: {
              studentCode_academicYearId: {
                studentCode: finalStudentCode,
                academicYearId: academicYear.id
              }
            },
            update: updateProfile ? {
              studentName: sName,
              dateOfBirth: dob,
              gender: s.gender || null,
              classId: targetClass.id,
              campusId: campus.id,
              status: "ACTIVE"
            } : {
              status: "ACTIVE"
            },
            create: {
              studentCode: finalStudentCode,
              studentName: sName,
              dateOfBirth: dob,
              gender: s.gender || null,
              classId: targetClass.id,
              campusId: campus.id,
              academicYearId: academicYear.id,
              status: "ACTIVE"
            }
          })
          countStudents++

          // 4. Save Term Scores
          if (s.subjects && typeof s.subjects === "object") {
            const subKeys = Object.keys(s.subjects)
            // For PRIMARY level, client sends keys like "Tiếng Việt (Điểm)" and "Tiếng Việt (Mức)"
            // We strip the suffix to find the base subject in DB, then merge score+grade per subject
            const subjectMergeMap = new Map<string, { score: any; grade: any; subjectId: string }>()
            for (const subKey of subKeys) {
              // Strip PRIMARY suffixes to get base subject name for DB lookup
              const baseName = subKey
                .replace(/[\s\-_]+(mức\s*đạt\s*được|điểm\s*ktđk|mức|điểm|diem|muc)/gi, "")
                .replace(/\s*\([^)]*\)\s*$/gi, "")
                .normalize("NFC").trim()

              const cleanSubKey = subKey.normalize("NFC").toLowerCase().trim()
              const cleanBaseName = baseName.normalize("NFC").toLowerCase().trim()

              let subId = subjectMap.get(subKey.toUpperCase()) || 
                          subjectMap.get(cleanSubKey) ||
                          subjectMap.get(baseName.toUpperCase()) ||
                          subjectMap.get(cleanBaseName)

              if (!subId) {
                // Fallback search in existingSubjects
                const found = existingSubjects.find(sub => {
                  const sName = sub.subjectName.normalize("NFC").toLowerCase().trim()
                  const sCode = sub.subjectCode.normalize("NFC").toLowerCase().trim()
                  return sName === cleanBaseName || sCode === cleanBaseName || cleanBaseName.includes(sName) || sName.includes(cleanBaseName)
                })
                if (found) subId = found.id
              }

              if (!subId && baseName && baseName.length > 1) {
                // Failsafe auto-create missing Primary subject in DB so no scores are ever dropped
                const subCode = baseName
                  .toUpperCase()
                  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                  .replace(/[^A-Z0-9]/g, "_")
                  .replace(/_+/g, "_")
                  .slice(0, 18) || "SUB_" + Date.now()

                try {
                  const uniqueCode = subCode + "_" + Math.floor(Math.random() * 9000 + 1000)
                  const newSub = await prisma.subject.create({
                    data: {
                      subjectCode: uniqueCode,
                      subjectName: baseName,
                      status: "ACTIVE"
                    }
                  })
                  subId = newSub.id
                  existingSubjects.push(newSub)
                  subjectMap.set(cleanBaseName, subId)
                  console.log(`Auto-created missing Primary subject in DB: ${baseName} (${subId})`)
                } catch (createErr) {
                  const existing = await prisma.subject.findFirst({
                    where: { subjectName: baseName }
                  })
                  if (existing) subId = existing.id
                }
              }

              if (!subId) continue

              const dbSub = existingSubjects.find(sub => sub.id === subId) || 
                            await prisma.subject.findUnique({ where: { id: subId } })
              if (!dbSub) continue

              // Process all subjects that have data - selectedSubjects is unreliable due to client timing issues
              // The client already only sends subject keys that were parsed from the file

              const val = s.subjects[subKey]
              if (val === undefined || val === null || val === "") continue

              // Use dbSub.id as merge key so score+grade from two columns go to same upsert
              if (!subjectMergeMap.has(dbSub.id)) {
                subjectMergeMap.set(dbSub.id, { score: null, grade: null, subjectId: dbSub.id })
              }
              const merged = subjectMergeMap.get(dbSub.id)!

              let rawScoreVal = null
              let rawGradeVal = null

              if (typeof val === "object" && val !== null) {
                if (val.score !== undefined && val.score !== null && val.score !== "") rawScoreVal = val.score
                if (val.grade !== undefined && val.grade !== null && val.grade !== "") rawGradeVal = val.grade
              } else {
                rawScoreVal = val
              }

              if (rawScoreVal !== null && rawScoreVal !== "") {
                const num = parseFloat(String(rawScoreVal))
                if (!isNaN(num)) {
                  merged.score = num
                } else {
                  merged.grade = String(rawScoreVal).trim()
                }
              }

              if (rawGradeVal !== null && rawGradeVal !== "") {
                merged.grade = String(rawGradeVal).trim()
              }
            }

            // Now upsert once per merged subject
            for (const [, merged] of subjectMergeMap.entries()) {
              const subId = merged.subjectId

              let parsedScore = null
              if (merged.score !== null && merged.score !== "") {
                parsedScore = parseFloat(merged.score)
                if (isNaN(parsedScore)) parsedScore = null
              }
              const evaluationGrade = merged.grade !== null ? String(merged.grade).trim() : null

              await prisma.studentTermScore.upsert({
                where: {
                  studentId_subjectId_semester: {
                    studentId: student.id,
                    subjectId: subId,
                    semester: semester
                  }
                },
                update: {
                  score: parsedScore,
                  evaluationGrade: evaluationGrade
                },
                create: {
                  studentId: student.id,
                  subjectId: subId,
                  semester: semester,
                  score: parsedScore,
                  evaluationGrade: evaluationGrade
                }
              })
              countScores++
            }
          }

          // 5. Save Term Summary
          if (shouldImportAcademic || shouldImportConduct || importAbsences || shouldImportReward || shouldImportPromotion) {
            const updateData: any = {}
            const createData: any = {
              studentId: student.id,
              semester: semester
            }

            if (shouldImportAcademic) {
              updateData.academicRating = s.academicRating || null
              createData.academicRating = s.academicRating || null
              if (s.notes) {
                updateData.notes = s.notes
                createData.notes = s.notes
              }
            }

            if (shouldImportConduct) {
              updateData.conductRating = s.conductRating || null
              createData.conductRating = s.conductRating || null
            }

            if (importAbsences) {
              const p = parseInt(s.absencesPermitted) || 0
              const k = parseInt(s.absencesUnpermitted) || 0
              const total = p + k

              updateData.absencesPermitted = p
              updateData.absencesUnpermitted = k
              updateData.absencesTotal = total

              createData.absencesPermitted = p
              createData.absencesUnpermitted = k
              createData.absencesTotal = total
            }

            if (shouldImportReward) {
              let finalReward = s.reward || null
              if (level === "PRIMARY" && s.notes) {
                if (!finalReward || finalReward === "✓" || finalReward === "" || finalReward === "x") {
                  finalReward = s.notes
                }
              }
              updateData.reward = finalReward
              createData.reward = finalReward
              updateData.rewardUnexpected = s.rewardUnexpected || null
              createData.rewardUnexpected = s.rewardUnexpected || null
              if (s.notes) {
                updateData.notes = s.notes
                createData.notes = s.notes
              }
            }

            if (shouldImportPromotion) {
              if (level === "SECONDARY" || level === "PRIMARY") {
                const isPromoted = s.promoted === true || String(s.promoted).toLowerCase() === "true" || s.promoted === 1 || String(s.promoted).toLowerCase() === "lên lớp"
                updateData.promoted = isPromoted
                createData.promoted = isPromoted
              }
            }

            await prisma.studentTermSummary.upsert({
              where: {
                studentId_semester: {
                  studentId: student.id,
                  semester: semester
                }
              },
              update: updateData,
              create: createData
            })
            countSummaries++
          }

        } catch (err) {
          errors.push(`Lỗi xử lý HS ${s.studentCode || s.studentName}: ${err.message}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      studentsCount: countStudents,
      scoresCount: countScores,
      summariesCount: countSummaries,
      errors: errors
    })

  } catch (error: any) {
    console.error("Error in import-kqht API:", error)
    return NextResponse.json({ error: "Lỗi hệ thống: " + error.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await checkAuth()
  if (!session) {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const academicYearId = searchParams.get("academicYearId")
    if (!academicYearId) {
      return NextResponse.json({ error: "Thiếu academicYearId" }, { status: 400 })
    }

    const [classes, scoresGroup, summariesGroup] = await Promise.all([
      prisma.class.findMany({
        where: { academicYearId },
        include: { campus: true },
        orderBy: [
          { campus: { campusCode: "asc" } },
          { classCode: "asc" }
        ]
      }),
      prisma.studentTermScore.findMany({
        where: { student: { academicYearId } },
        select: { semester: true, student: { select: { classId: true } } }
      }),
      prisma.studentTermSummary.findMany({
        where: { student: { academicYearId } },
        select: { semester: true, student: { select: { classId: true } } }
      })
    ])

    const classStats = new Map<string, { hk1: boolean; hk2: boolean; cn: boolean }>()
    classes.forEach(c => {
      classStats.set(c.id, { hk1: false, hk2: false, cn: false })
    })

    scoresGroup.forEach(s => {
      const stats = classStats.get(s.student?.classId)
      if (stats) {
        if (s.semester === "HK1") stats.hk1 = true
        if (s.semester === "HK2") stats.hk2 = true
        if (s.semester === "CN") stats.cn = true
      }
    })

    summariesGroup.forEach(s => {
      const stats = classStats.get(s.student?.classId)
      if (stats) {
        if (s.semester === "HK1") stats.hk1 = true
        if (s.semester === "HK2") stats.hk2 = true
        if (s.semester === "CN") stats.cn = true
      }
    })

    const data = classes.map(c => {
      const stats = classStats.get(c.id) || { hk1: false, hk2: false, cn: false }
      return {
        id: c.id,
        classCode: c.classCode,
        className: c.className,
        campusName: c.campus?.campusName || "—",
        level: c.level || "—",
        hk1: stats.hk1,
        hk2: stats.hk2,
        cn: stats.cn
      }
    })

    return NextResponse.json({ success: true, classes: data })
  } catch (error: any) {
    console.error("Error in import-kqht GET stats API:", error)
    return NextResponse.json({ error: "Lỗi hệ thống: " + error.message }, { status: 500 })
  }
}
