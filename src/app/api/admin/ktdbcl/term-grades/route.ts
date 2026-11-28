import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { compareVietnameseNames } from "@/lib/vietnameseSort"

const ALLOWED_ROLES = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "KHAO_THI", "ĐBCL", "DBCL", "GDCS", "GIAO_VU_CS", "GIAO_VU", "TEACHER"]

async function checkAuth() {
  const session = await auth()
  if (!session) return null
  const role = (session?.user as any)?.role || ""
  if (!ALLOWED_ROLES.includes(role)) return null
  return session
}

export async function GET(req: NextRequest) {
  const session = await checkAuth()
  if (!session) {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 })
  }

  try {
    const url = new URL(req.url)
    const classId = url.searchParams.get("classId")
    const semester = url.searchParams.get("semester") || "HK1" // "HK1" | "HK2" | "CN"
    const academicYearId = url.searchParams.get("academicYearId")

    if (!classId) {
      return NextResponse.json({ error: "Vui lòng chọn lớp học" }, { status: 400 })
    }

    // 1. Fetch class detail with teachingAssignments
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        campus: true,
        academicYear: true,
        teachingAssignments: {
          include: {
            teacher: {
              select: { id: true, teacherCode: true, teacherName: true }
            },
            subject: {
              select: { id: true, subjectCode: true, subjectName: true }
            }
          }
        }
      }
    })

    if (!classData) {
      return NextResponse.json({ error: "Lớp học không tồn tại" }, { status: 404 })
    }

    const targetYearId = academicYearId || classData.academicYearId

    let homeroomTeacherName = ""
    if (classData.homeroomTeacherId) {
      const ht = await prisma.teacher.findUnique({ where: { id: classData.homeroomTeacherId } })
      if (ht) homeroomTeacherName = ht.teacherName
    }

    // 2. Fetch all students in the class, active subjects, active teachers, and subjectGradeEntries concurrently
    const [students, allSubjects, allTeachers, subjectGradeEntries] = await Promise.all([
      prisma.student.findMany({
        where: {
          classId: classId,
          status: { not: "INACTIVE" }
        },
        include: {
          termScores: {
            where: {
              semester: { in: ["HK1", "HK2", "CN"] }
            },
            include: {
              subject: {
                select: {
                  id: true,
                  subjectCode: true,
                  subjectName: true
                }
              }
            }
          },
          termSummaries: {
            where: {
              semester: semester
            }
          }
        }
      }),
      prisma.subject.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          subjectCode: true,
          subjectName: true,
          category: true,
          level: true
        },
        orderBy: { subjectCode: "asc" }
      }),
      prisma.teacher.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          teacherCode: true,
          teacherName: true
        },
        orderBy: { teacherName: "asc" }
      }),
      prisma.subjectGradeEntry.findMany({
        where: {
          classId: classId,
          ...(targetYearId ? { academicYearId: targetYearId } : {}),
          evaluationPeriod: { in: ["CK1", "HK1", "GK1", "CK2", "HK2", "GK2", "CN"] }
        }
      })
    ])

    // Sort students by Vietnamese name
    students.sort((a, b) => compareVietnameseNames(a.studentName, b.studentName))

    const subjectMetaById = new Map(allSubjects.map(s => [s.id, s]))

    // Helper to extract score & rating from a SubjectGradeEntry record
    const extractEntryScoreAndGrade = (entry: any) => {
      if (!entry) return { score: null as number | null, evaluationGrade: null as string | null }
      let comp: Record<string, any> = {}
      if (entry.componentScores) {
        try {
          comp = typeof entry.componentScores === "string" ? JSON.parse(entry.componentScores) : entry.componentScores
        } catch {}
      }
      let score: number | null =
        entry.compositeScore !== null && entry.compositeScore !== undefined && !isNaN(Number(entry.compositeScore))
          ? Number(entry.compositeScore)
          : null
      if (score === null) {
        const rawKt = comp.kt_ck1 ?? comp.kt_ck2 ?? comp.kt_gk1 ?? comp.kt_gk2 ?? comp.col0 ?? ""
        const parsedKt = parseFloat(String(rawKt).replace(",", "."))
        if (String(rawKt).trim() !== "" && !isNaN(parsedKt)) {
          score = Math.round(parsedKt * 10) / 10
        }
      }
      const rawRating = String(
        entry.ratingValue || comp.xl_ck1 || comp.xl_ck2 || comp.xl_gk1 || comp.xl_gk2 || ""
      ).trim()
      return {
        score,
        evaluationGrade: rawRating || null
      }
    }

    // Index SubjectGradeEntry by studentId -> subjectId -> period
    const entriesByStudentSubj = new Map<string, Map<string, Record<string, any>>>()
    for (const e of subjectGradeEntries) {
      if (!entriesByStudentSubj.has(e.studentId)) {
        entriesByStudentSubj.set(e.studentId, new Map())
      }
      const subMap = entriesByStudentSubj.get(e.studentId)!
      if (!subMap.has(e.subjectId)) {
        subMap.set(e.subjectId, {})
      }
      const periodBag = subMap.get(e.subjectId)!
      const existingForPeriod = periodBag[e.evaluationPeriod]
      // Prioritize VNEDU configType over INTERNAL if both exist for the same period
      if (!existingForPeriod || (e.configType === "VNEDU" && existingForPeriod.configType !== "VNEDU")) {
        periodBag[e.evaluationPeriod] = e
      }
    }

    // Format students data (merging StudentTermScore + live fallback from SubjectGradeEntry)
    const formattedStudents = students.map((st, index) => {
      const summary = st.termSummaries[0] || null

      const scoresMap: Record<string, { score: number | null; evaluationGrade: string | null; subjectCode: string; subjectName: string }> = {}

      // 1. Load saved StudentTermScore for current semester
      const termScoresBySemAndSubj = new Map<string, any>()
      st.termScores.forEach(ts => {
        termScoresBySemAndSubj.set(`${ts.semester}::${ts.subjectId}`, ts)
        if (ts.semester === semester) {
          scoresMap[ts.subjectId] = {
            score: ts.score,
            evaluationGrade: ts.evaluationGrade,
            subjectCode: ts.subject.subjectCode,
            subjectName: ts.subject.subjectName
          }
        }
      })

      // 2. Auto-enrich from SubjectGradeEntry (or HK1+HK2 termScores for CN) whenever missing
      const stSubjEntries = entriesByStudentSubj.get(st.id)
      const candidateSubjectIds = new Set<string>([
        ...Array.from(stSubjEntries?.keys() || []),
        ...st.termScores.map(ts => ts.subjectId)
      ])

      candidateSubjectIds.forEach(subId => {
        const subMeta = subjectMetaById.get(subId)
        if (!subMeta) return
        const current = scoresMap[subId]
        const hasScoreAlready = current && (current.score !== null || Boolean(current.evaluationGrade))
        if (hasScoreAlready) return

        const periodBag = stSubjEntries?.get(subId) || {}
        if (semester === "HK1") {
          const chosen = periodBag["CK1"] || periodBag["HK1"] || periodBag["GK1"]
          const extracted = extractEntryScoreAndGrade(chosen)
          if (extracted.score !== null || extracted.evaluationGrade) {
            scoresMap[subId] = {
              score: extracted.score,
              evaluationGrade: extracted.evaluationGrade,
              subjectCode: subMeta.subjectCode,
              subjectName: subMeta.subjectName
            }
          }
        } else if (semester === "HK2") {
          const chosen = periodBag["CK2"] || periodBag["HK2"] || periodBag["GK2"]
          const extracted = extractEntryScoreAndGrade(chosen)
          if (extracted.score !== null || extracted.evaluationGrade) {
            scoresMap[subId] = {
              score: extracted.score,
              evaluationGrade: extracted.evaluationGrade,
              subjectCode: subMeta.subjectCode,
              subjectName: subMeta.subjectName
            }
          }
        } else if (semester === "CN") {
          const cnEntry = periodBag["CN"]
          const extractedCn = extractEntryScoreAndGrade(cnEntry)
          if (extractedCn.score !== null || extractedCn.evaluationGrade) {
            scoresMap[subId] = {
              score: extractedCn.score,
              evaluationGrade: extractedCn.evaluationGrade,
              subjectCode: subMeta.subjectCode,
              subjectName: subMeta.subjectName
            }
            return
          }

          // Compute CN from HK1 and HK2
          const tsHk1 = termScoresBySemAndSubj.get(`HK1::${subId}`)
          const tsHk2 = termScoresBySemAndSubj.get(`HK2::${subId}`)
          const extHk1 = extractEntryScoreAndGrade(periodBag["CK1"] || periodBag["HK1"] || periodBag["GK1"])
          const extHk2 = extractEntryScoreAndGrade(periodBag["CK2"] || periodBag["HK2"] || periodBag["GK2"])

          const s1 = tsHk1?.score ?? extHk1.score
          const s2 = tsHk2?.score ?? extHk2.score
          const g1 = tsHk1?.evaluationGrade ?? extHk1.evaluationGrade
          const g2 = tsHk2?.evaluationGrade ?? extHk2.evaluationGrade

          const cLevel = String(classData.level || "").toLowerCase()
          const cName = String(classData.className || "").trim()
          const gNum = parseInt((cName.match(/^(\d+)/) || [])[1] || "0", 10)
          const isPrimaryClass = (gNum >= 1 && gNum <= 5) || cLevel.includes("tiểu học") || cLevel.includes("tieu hoc")

          if (isPrimaryClass) {
            // Tiểu học (TT27): kết quả cả năm lấy theo đánh giá cuối năm (CK2 / HK2)
            if (s2 !== null || g2) {
              scoresMap[subId] = {
                score: s2 ?? null,
                evaluationGrade: g2 ?? null,
                subjectCode: subMeta.subjectCode,
                subjectName: subMeta.subjectName
              }
            }
          } else {
            // THCS & THPT (TT22): ĐTBmcn = (ĐTBmhk1 + 2 * ĐTBmhk2) / 3
            if (s1 !== null && s1 !== undefined && s2 !== null && s2 !== undefined) {
              const avgCn = Math.round(((Number(s1) + 2 * Number(s2)) / 3 + Number.EPSILON) * 10) / 10
              scoresMap[subId] = {
                score: avgCn,
                evaluationGrade: g2 || g1 || null,
                subjectCode: subMeta.subjectCode,
                subjectName: subMeta.subjectName
              }
            } else if (g2 || g1) {
              scoresMap[subId] = {
                score: s2 ?? null,
                evaluationGrade: g2 || g1 || null,
                subjectCode: subMeta.subjectCode,
                subjectName: subMeta.subjectName
              }
            }
          }
        }
      })

      let parsedCompetencies: any = {}
      let parsedQualities: any = {}
      let otherReward = ""
      let displayNotes = summary?.notes || ""

      if (summary?.notes && summary.notes.startsWith("{") && summary.notes.endsWith("}")) {
        try {
          const parsed = JSON.parse(summary.notes)
          parsedCompetencies = parsed.competencies || {}
          parsedQualities = parsed.qualities || {}
          otherReward = parsed.otherReward || ""
          displayNotes = parsed.rawNote || parsed.generalNotes || ""
        } catch (e) {
          // ignore error
        }
      }

      return {
        id: st.id,
        stt: index + 1,
        studentCode: st.studentCode,
        studentName: st.studentName,
        dob: st.dateOfBirth ? (typeof st.dateOfBirth === 'string' ? st.dateOfBirth : (st.dateOfBirth as Date).toISOString().split('T')[0]) : "",
        gender: st.gender || "",
        scores: scoresMap,
        summary: summary ? {
          academicRating: summary.academicRating || "",
          conductRating: summary.conductRating || "",
          absencesPermitted: summary.absencesPermitted ?? 0,
          absencesUnpermitted: summary.absencesUnpermitted ?? 0,
          absencesTotal: summary.absencesTotal ?? 0,
          reward: summary.reward || "",
          rewardUnexpected: summary.rewardUnexpected || "",
          notes: displayNotes,
          otherReward: otherReward,
          competencies: parsedCompetencies,
          qualities: parsedQualities,
          promoted: summary.promoted ?? true
        } : {
          academicRating: "",
          conductRating: "Tốt",
          absencesPermitted: 0,
          absencesUnpermitted: 0,
          absencesTotal: 0,
          reward: "",
          rewardUnexpected: "",
          notes: semester === "CN" ? "Được lên lớp" : "",
          otherReward: "",
          competencies: {},
          qualities: {},
          promoted: true
        }
      }
    })

    return NextResponse.json({
      success: true,
      classInfo: {
        id: classData.id,
        classCode: classData.classCode,
        className: classData.className,
        level: classData.level,
        grade: classData.grade,
        academicYearId: classData.academicYearId,
        campusName: classData.campus?.campusName || "",
        campusCode: classData.campus?.campusCode || "",
        homeroomTeacherId: classData.homeroomTeacherId || "",
        homeroomTeacherName: homeroomTeacherName || "",
        teachingAssignments: (classData.teachingAssignments || []).map(ta => ({
          id: ta.id,
          subjectId: ta.subjectId,
          subjectCode: ta.subject?.subjectCode || "",
          subjectName: ta.subject?.subjectName || "",
          teacherId: ta.teacherId,
          teacherName: ta.teacher?.teacherName || "",
          teacherCode: ta.teacher?.teacherCode || "",
          semester: ta.semester
        }))
      },
      students: formattedStudents,
      subjects: allSubjects,
      teachers: allTeachers
    })
  } catch (error: any) {
    console.error("Lỗi lấy điểm tổng kết:", error)
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await checkAuth()
  if (!session) {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { action, classId, semester, students, academicYearId, homeroomTeacherId, subjectId, teacherId, assignments } = body

    // ACTION 1: Phân công Giáo viên Chủ nhiệm (GVCN) & Giáo viên Bộ môn (GVBM) ngay trong Sổ điểm
    if (action === "assignTeacher") {
      if (!classId) {
        return NextResponse.json({ error: "Thiếu thông tin lớp học" }, { status: 400 })
      }
      const cls = await prisma.class.findUnique({ where: { id: classId } })
      if (!cls) {
        return NextResponse.json({ error: "Không tìm thấy lớp học" }, { status: 404 })
      }
      const targetYearId = academicYearId || cls.academicYearId

      // Cập nhật GVCN nếu có truyền homeroomTeacherId
      if (homeroomTeacherId !== undefined) {
        await prisma.class.update({
          where: { id: classId },
          data: { homeroomTeacherId: homeroomTeacherId || null }
        })
      }

      // Cập nhật 1 môn cụ thể nếu có subjectId
      if (subjectId) {
        await prisma.teachingAssignment.deleteMany({
          where: {
            classId,
            subjectId,
            academicYearId: targetYearId
          }
        })
        if (teacherId) {
          await prisma.teachingAssignment.createMany({
            data: [
              { teacherId, classId, subjectId, academicYearId: targetYearId, semester: 1 },
              { teacherId, classId, subjectId, academicYearId: targetYearId, semester: 2 }
            ]
          })
        }
      }

      // Cập nhật hàng loạt nhiều môn nếu truyền mảng assignments: [{ subjectId, teacherId }]
      if (Array.isArray(assignments) && assignments.length > 0) {
        for (const item of assignments) {
          if (!item.subjectId) continue
          await prisma.teachingAssignment.deleteMany({
            where: {
              classId,
              subjectId: item.subjectId,
              academicYearId: targetYearId
            }
          })
          if (item.teacherId) {
            await prisma.teachingAssignment.createMany({
              data: [
                { teacherId: item.teacherId, classId, subjectId: item.subjectId, academicYearId: targetYearId, semester: 1 },
                { teacherId: item.teacherId, classId, subjectId: item.subjectId, academicYearId: targetYearId, semester: 2 }
              ]
            })
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: "Đã cập nhật phân công giảng dạy cho lớp thành công!"
      })
    }

    if (!classId || !semester || !Array.isArray(students)) {
      return NextResponse.json({ error: "Dữ liệu yêu cầu không hợp lệ" }, { status: 400 })
    }

    let updatedScoresCount = 0
    let updatedSummaryCount = 0

    for (const st of students) {
      if (!st.studentId) continue

      // 1. Upsert term summary if provided
      if (st.summary) {
        const {
          academicRating,
          conductRating,
          absencesPermitted,
          absencesUnpermitted,
          absencesTotal,
          reward,
          rewardUnexpected,
          notes,
          otherReward,
          competencies,
          qualities,
          promoted
        } = st.summary

        const p = parseInt(String(absencesPermitted || 0), 10) || 0
        const k = parseInt(String(absencesUnpermitted || 0), 10) || 0
        const tot = absencesTotal !== undefined ? (parseInt(String(absencesTotal), 10) || 0) : (p + k)

        let notesToStore = notes || null
        if (competencies || qualities || otherReward) {
          notesToStore = JSON.stringify({
            competencies: competencies || {},
            qualities: qualities || {},
            otherReward: otherReward || "",
            rawNote: notes || ""
          })
        }

        await prisma.studentTermSummary.upsert({
          where: {
            studentId_semester: {
              studentId: st.studentId,
              semester: semester
            }
          },
          update: {
            academicRating: academicRating || null,
            conductRating: conductRating || null,
            absencesPermitted: p,
            absencesUnpermitted: k,
            absencesTotal: tot,
            reward: reward || null,
            rewardUnexpected: rewardUnexpected || null,
            notes: notesToStore,
            promoted: promoted !== undefined ? Boolean(promoted) : true
          },
          create: {
            studentId: st.studentId,
            semester: semester,
            academicRating: academicRating || null,
            conductRating: conductRating || null,
            absencesPermitted: p,
            absencesUnpermitted: k,
            absencesTotal: tot,
            reward: reward || null,
            rewardUnexpected: rewardUnexpected || null,
            notes: notesToStore,
            promoted: promoted !== undefined ? Boolean(promoted) : true
          }
        })
        updatedSummaryCount++
      }

      // 2. Upsert term scores
      if (st.scores && typeof st.scores === "object") {
        for (const [subjectId, scoreObj] of Object.entries(st.scores as Record<string, any>)) {
          if (!subjectId || !scoreObj) continue

          let scoreVal: number | null = null
          let evalGrade: string | null = null

          if (scoreObj.score !== null && scoreObj.score !== undefined && scoreObj.score !== "") {
            const parsed = parseFloat(String(scoreObj.score))
            if (!isNaN(parsed)) {
              scoreVal = Math.round(parsed * 10) / 10
            } else if (String(scoreObj.score).trim().toLowerCase() === "miễn") {
              evalGrade = "Miễn"
            }
          }

          if (scoreObj.evaluationGrade) {
            evalGrade = String(scoreObj.evaluationGrade).trim()
          }

          if (scoreVal === null && !evalGrade) {
            // If completely empty, we can skip or delete
            continue
          }

          await prisma.studentTermScore.upsert({
            where: {
              studentId_subjectId_semester: {
                studentId: st.studentId,
                subjectId: subjectId,
                semester: semester
              }
            },
            update: {
              score: scoreVal,
              evaluationGrade: evalGrade
            },
            create: {
              studentId: st.studentId,
              subjectId: subjectId,
              semester: semester,
              score: scoreVal,
              evaluationGrade: evalGrade
            }
          })
          updatedScoresCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã lưu thành công ${updatedSummaryCount} kết quả tổng kết và ${updatedScoresCount} điểm thành phần.`
    })
  } catch (error: any) {
    console.error("Lỗi cập nhật điểm tổng kết:", error)
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 })
  }
}
