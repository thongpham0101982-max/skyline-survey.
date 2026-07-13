import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action")

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    })
    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 })
    }

    if (action === "getHomeroomStudents") {
      const academicYearId = searchParams.get("academicYearId")

      // Find classes where teacher is GVCN in the given academic year
      const classes = await prisma.class.findMany({
        where: {
          OR: [
            { homeroomTeacherId: teacher.id },
            { homeroomTeacherId: { contains: teacher.id } }
          ],
          ...(academicYearId ? { academicYearId } : {})
        },
        include: {
          students: {
            orderBy: { studentName: "asc" }
          }
        }
      })
      
      const students = classes.flatMap(c => c.students.map(s => ({
        ...s,
        className: c.className,
        classCode: c.classCode
      })))

      return NextResponse.json(students)
    }

    if (action === "getAssignedClasses") {
      const subject = searchParams.get("subject")
      const academicYearId = searchParams.get("academicYearId")

      // Find all matching subject IDs if we are targeting a specific subject
      let subjectIds: string[] | undefined = undefined;
      if (subject === "orientation") {
        const allSubjects = await prisma.subject.findMany()
        subjectIds = allSubjects
          .filter(s => {
            const name = (s.subjectName || s.name || "").toLowerCase()
            return name.includes("hướng nghiệp") || name.includes("huong nghiep")
          })
          .map(s => s.id)
      }

      // Query teaching assignments in this academic year
      const assignments = await prisma.teachingAssignment.findMany({
        where: {
          teacherId: teacher.id,
          ...(subjectIds ? { subjectId: { in: subjectIds } } : {}),
          ...(academicYearId ? { academicYearId } : {})
        },
        select: { classId: true }
      })

      const assignedClassIds = assignments.map(a => a.classId)

      // Query homeroom classes in this academic year
      const homeroomClasses = await prisma.class.findMany({
        where: {
          OR: [
            { homeroomTeacherId: teacher.id },
            { homeroomTeacherId: { contains: teacher.id } }
          ],
          ...(academicYearId ? { academicYearId } : {})
        },
        select: { id: true }
      })

      const homeroomClassIds = homeroomClasses.map(c => c.id)

      // Union class IDs
      const allClassIds = Array.from(new Set([...assignedClassIds, ...homeroomClassIds]))

      const classes = await prisma.class.findMany({
        where: { id: { in: allClassIds } },
        orderBy: { className: "asc" }
      })
      return NextResponse.json(classes)
    }

    if (action === "getClassStudents") {
      const classId = searchParams.get("classId")
      if (!classId) return NextResponse.json({ error: "Missing classId" }, { status: 400 })

      const students = await prisma.student.findMany({
        where: { classId },
        orderBy: { studentName: "asc" }
      })
      return NextResponse.json(students)
    }

    if (action === "getStudentRecord") {
      const studentId = searchParams.get("studentId")
      if (!studentId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 })

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          class: true,
          campus: true
        }
      })
      if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 })

      // Fetch achievements
      const achievements = await prisma.studentAchievement.findMany({
        where: { studentId },
        include: { achievement: true }
      })

      // Fetch career orientation
      const orientation = await prisma.studentCareerOrientation.findUnique({
        where: { studentId }
      })

      // Fetch projects
      const projects = await prisma.studentProjectExperience.findMany({
        where: { studentId },
        orderBy: { createdAt: "desc" }
      })

      // Fetch commitment
      const commitment = await prisma.studentLearningCommitment.findUnique({
        where: { studentId }
      })

      // Fetch highlight comments
      const highlightComments = await prisma.studentHighlightComment.findMany({
        where: { studentId },
        orderBy: { createdAt: "desc" }
      })

      // Fetch entrance survey (if any) matching studentCode
      let entranceSurvey: any = null
      
      const generalSurvey = await prisma.inputAssessmentStudent.findFirst({
        where: { studentCode: student.studentCode },
        include: {
          scores: {
            include: { subject: true }
          },
          period: true,
          batch: true
        }
      })

      if (generalSurvey) {
        entranceSurvey = {
          type: "K12",
          fullName: generalSurvey.fullName,
          studentCode: generalSurvey.studentCode,
          admissionCampus: generalSurvey.admissionCampus,
          admissionResult: generalSurvey.admissionResult,
          scores: generalSurvey.scores.map(s => ({
            subjectName: s.subject.name,
            scores: s.scores ? JSON.parse(s.scores) : {},
            comments: s.comments ? JSON.parse(s.comments) : {}
          })),
          psychologyScore: generalSurvey.psychologyScore,
          mathScore: generalSurvey.mathScore,
          literatureScore: generalSurvey.literatureScore,
          writtenEnglishScore: generalSurvey.writtenEnglishScore,
          oralEnglishScore: generalSurvey.oralEnglishScore,
          kqHocTap: generalSurvey.kqHocTap,
          kqRenLuyen: generalSurvey.kqRenLuyen
        }
      } else {
        const preschoolSurvey = await (prisma as any).preschoolInputAssessmentStudent.findFirst({
          where: { studentCode: student.studentCode },
          include: {
            period: true,
            batch: true
          }
        })
        
        if (preschoolSurvey) {
          // Fetch preschool scores
          const pScores = await (prisma as any).preschoolDevScore.findMany({
            where: { studentId: preschoolSurvey.id },
            include: { criteria: { include: { area: true } } }
          })

          entranceSurvey = {
            type: "PRESCHOOL",
            fullName: preschoolSurvey.fullName,
            studentCode: preschoolSurvey.studentCode,
            admissionCampus: preschoolSurvey.admissionCampus,
            admissionResult: preschoolSurvey.admissionResult,
            devAssessmentResult: preschoolSurvey.devAssessmentResult,
            devImportantNote: preschoolSurvey.devImportantNote,
            devProfessionalComment: preschoolSurvey.devProfessionalComment,
            devPsychologyComment: preschoolSurvey.devPsychologyComment,
            scores: pScores.map((s: any) => ({
              areaName: s.criteria.area.name,
              criterionName: s.criteria.name,
              result: s.result,
              note: s.note
            }))
          }
        }
      }

      // Fetch transfer info
      const transfers = await prisma.studentTransfer.findMany({
        where: { studentId },
        orderBy: { transferDate: "desc" }
      })

      return NextResponse.json({
        student,
        achievements,
        orientation,
        projects,
        commitment,
        highlightComments,
        entranceSurvey,
        transfers
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action")

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    })
    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 })
    }

    if (action === "uploadAvatar") {
      const studentId = searchParams.get("studentId")
      if (!studentId) return NextResponse.json({ error: "Missing studentId" }, { status: 400 })

      const formData = await req.formData()
      const file = formData.get("file") as File
      if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 })

      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 })
      }

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const path = require("path")
      const fs = require("fs")
      const uploadDir = path.join(process.cwd(), "public", "uploads", "students")
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }

      const filePath = path.join(uploadDir, `${studentId}.jpg`)
      fs.writeFileSync(filePath, buffer)

      return NextResponse.json({ success: true, url: `/uploads/students/${studentId}.jpg?t=${Date.now()}` })
    }

    const body = await req.json()

    if (action === "saveOrientation") {
      const { studentId, result, notes } = body
      if (!studentId || !result) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }

      const orientation = await prisma.studentCareerOrientation.upsert({
        where: { studentId },
        create: {
          studentId,
          result,
          notes,
          teacherId: teacher.id,
          teacherName: teacher.teacherName
        },
        update: {
          result,
          notes,
          teacherId: teacher.id,
          teacherName: teacher.teacherName
        }
      })
      return NextResponse.json(orientation)
    }

    if (action === "saveProjectExperience") {
      const { id, studentId, projectName, role, result, notes } = body
      if (!studentId || !projectName || !result) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }

      if (id) {
        // Edit existing project
        const project = await prisma.studentProjectExperience.update({
          where: { id },
          data: {
            projectName,
            role,
            result,
            notes,
            teacherId: teacher.id,
            teacherName: teacher.teacherName
          }
        })
        return NextResponse.json(project)
      } else {
        // Create new project
        const project = await prisma.studentProjectExperience.create({
          data: {
            studentId,
            projectName,
            role,
            result,
            notes,
            teacherId: teacher.id,
            teacherName: teacher.teacherName
          }
        })
        return NextResponse.json(project)
      }
    }

    if (action === "deleteProjectExperience") {
      const { id } = body
      if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

      await prisma.studentProjectExperience.delete({
        where: { id }
      })
      return NextResponse.json({ success: true })
    }

    if (action === "saveCommitment") {
      const { studentId, content, status } = body
      if (!studentId || !content) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }

      const commitment = await prisma.studentLearningCommitment.upsert({
        where: { studentId },
        create: {
          studentId,
          content,
          status: status || "ACTIVE",
          teacherId: teacher.id,
          teacherName: teacher.teacherName
        },
        update: {
          content,
          status: status || "ACTIVE",
          teacherId: teacher.id,
          teacherName: teacher.teacherName
        }
      })
      return NextResponse.json(commitment)
    }

    if (action === "saveHighlightComment") {
      const { id, studentId, comment, category } = body
      if (!studentId || !comment) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }

      // Verify that this teacher is the GVCN of this student
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { class: true }
      })
      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 })
      }

      const isHomeroom = student.class.homeroomTeacherId === teacher.id || 
                         (student.class.homeroomTeacherId && student.class.homeroomTeacherId.includes(teacher.id))
      
      if (!isHomeroom) {
        return NextResponse.json({ error: "Only homeroom teacher (GVCN) can add outstanding comments" }, { status: 403 })
      }

      if (id) {
        const record = await prisma.studentHighlightComment.update({
          where: { id },
          data: {
            comment,
            category,
            teacherId: teacher.id,
            teacherName: teacher.teacherName
          }
        })
        return NextResponse.json(record)
      } else {
        const record = await prisma.studentHighlightComment.create({
          data: {
            studentId,
            comment,
            category,
            teacherId: teacher.id,
            teacherName: teacher.teacherName
          }
        })
        return NextResponse.json(record)
      }
    }

    if (action === "deleteHighlightComment") {
      const { id } = body
      if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

      await prisma.studentHighlightComment.delete({
        where: { id }
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
