import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get("studentId")
  const academicYearId = searchParams.get("academicYearId")

  if (!studentId) {
    return NextResponse.json({ error: "Missing studentId" }, { status: 400 })
  }

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: {
          include: {
            campus: true,
            academicYear: true
          }
        },
        campus: true,
        academicYear: true,
        parents: { include: { parent: true } },
        goals: {
          where: academicYearId ? { academicYearId } : undefined,
          include: { actions: true }
        },
        consultationLogs: {
          where: academicYearId ? { academicYearId } : undefined,
          include: { teacher: { select: { teacherName: true } } },
          orderBy: { meetingDate: "desc" }
        },
        reflections: {
          where: academicYearId ? { academicYearId } : undefined,
          orderBy: { createdAt: "desc" }
        },
        helpRequests: {
          where: academicYearId ? { academicYearId } : undefined,
          orderBy: { createdAt: "desc" }
        },
        advisoryStatuses: {
          where: academicYearId ? { academicYearId } : undefined,
          orderBy: { createdAt: "desc" }
        },
        achievements: { include: { achievement: true } },
        careerOrientations: { where: academicYearId ? { academicYearId } : undefined },
        learningCommitments: { where: academicYearId ? { academicYearId } : undefined },
        highlightComments: { orderBy: { createdAt: "desc" } },
        projectExperiences: { orderBy: { createdAt: "desc" } },
        termScores: { include: { subject: true } },
        termSummaries: { orderBy: { semester: "asc" } },
        learningSupportTargets: { 
          include: { 
            evaluations: { orderBy: { createdAt: "desc" } },
            assignments: { include: { teacher: true, subject: true } }
          } 
        }
      }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    let goals = student.goals || []
    if (goals.length === 0 && academicYearId) {
      // Fallback: fetch all goals for this student if year filter returned empty
      goals = await prisma.studentGoal.findMany({
        where: { studentId: student.id },
        include: { actions: true },
        orderBy: { createdAt: 'desc' }
      }).catch(() => [])
    }

    // Query Input Assessment data by studentCode from database
    const inputAssessment = await prisma.inputAssessmentStudent.findFirst({
      where: { studentCode: student.studentCode },
      orderBy: { createdAt: "desc" }
    }).catch(() => null)

    const currentStatusColor = student.advisoryStatuses?.[0]?.statusColor || "GREEN"
    const currentStatusReason = student.advisoryStatuses?.[0]?.reasonDetail || "Ổn định"

    return NextResponse.json({
      student,
      currentStatusColor,
      currentStatusReason,
      goals,
      inputAssessment,
      consultationLogs: student.consultationLogs || [],
      reflections: student.reflections || [],
      helpRequests: student.helpRequests || [],
      achievements: student.achievements || [],
      careerOrientation: student.careerOrientations?.[0] || null,
      learningCommitment: student.learningCommitments?.[0] || null,
      highlightComments: student.highlightComments || [],
      projectExperiences: student.projectExperiences || [],
      termScores: student.termScores || [],
      termSummaries: student.termSummaries || [],
      learningSupportTargets: student.learningSupportTargets || []
    })
  } catch (error: any) {
    console.error("GET /api/advisory/profile-360 error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}
