import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { compareVietnameseNames } from "@/lib/vietnameseSort"

const ALLOWED_ROLES = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "GDCS", "GIAO_VU_CS", "GIAO_VU", "TEACHER"]

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

    // 1. Fetch class detail
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        campus: true,
        academicYear: true
      }
    })

    if (!classData) {
      return NextResponse.json({ error: "Lớp học không tồn tại" }, { status: 404 })
    }

    let homeroomTeacherName = ""
    if (classData.homeroomTeacherId) {
      const ht = await prisma.teacher.findUnique({ where: { id: classData.homeroomTeacherId } })
      if (ht) homeroomTeacherName = ht.teacherName
    }

    // 2. Fetch all students in the class
    const students = await prisma.student.findMany({
      where: {
        classId: classId,
        status: { not: "INACTIVE" }
      },
      include: {
        termScores: {
          where: {
            semester: semester
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
    })

    // Sort students by Vietnamese name
    students.sort((a, b) => compareVietnameseNames(a.studentName, b.studentName))

    // 3. Fetch active subjects in the system
    const allSubjects = await prisma.subject.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        subjectCode: true,
        subjectName: true
      },
      orderBy: { subjectCode: "asc" }
    })

    // Format students data
    const formattedStudents = students.map((st, index) => {
      const summary = st.termSummaries[0] || null

      const scoresMap: Record<string, { score: number | null; evaluationGrade: string | null; subjectCode: string; subjectName: string }> = {}
      st.termScores.forEach(ts => {
        scoresMap[ts.subjectId] = {
          score: ts.score,
          evaluationGrade: ts.evaluationGrade,
          subjectCode: ts.subject.subjectCode,
          subjectName: ts.subject.subjectName
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
        campusName: classData.campus?.campusName || "",
        campusCode: classData.campus?.campusCode || "",
        homeroomTeacherName: homeroomTeacherName || ""
      },
      students: formattedStudents,
      subjects: allSubjects
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
    const { classId, semester, students } = body

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
