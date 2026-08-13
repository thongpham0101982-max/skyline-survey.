import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getStudentSession } from "@/lib/student-session"
import { getDefaultAcademicYear } from "@/lib/academicYear"

export const dynamic = "force-dynamic"

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  return res
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    const studentSess = await getStudentSession()
    if (!session && !studentSess) {
      return jsonResponse({ error: "Chưa đăng nhập" }, 401)
    }

    const { searchParams } = new URL(req.url)
    const targetStudentId = searchParams.get("studentId") || studentSess?.studentId
    let academicYearId = searchParams.get("academicYearId") || ""
    const gradeLevel = searchParams.get("gradeLevel") || "K8"

    if (!targetStudentId) {
      return jsonResponse({ error: "Thiếu studentId" }, 400)
    }

    if (!academicYearId) {
      const defaultAY = await getDefaultAcademicYear(prisma)
      academicYearId = defaultAY?.id || ""
    }

    const goals = await prisma.studentGoal.findMany({
      where: { 
        studentId: targetStudentId,
        ...(academicYearId ? { academicYearId } : {})
      },
      include: { actions: true },
      orderBy: { createdAt: "asc" }
    })

    const trackingLogs = await prisma.studentGoalTrackingLog.findMany({
      where: { 
        studentId: targetStudentId,
        ...(academicYearId ? { academicYearId } : {})
      },
      orderBy: { createdAt: "desc" }
    })

    let presets: any[] = []
    if (goals.length === 0) {
      let gradeGroup = "K4_K8"
      if (["K1", "K2", "K3"].includes(gradeLevel)) gradeGroup = "K1_K3"
      else if (["K9", "K10", "K11", "K12"].includes(gradeLevel)) gradeGroup = "K9_K12"
      
      presets = await prisma.goalPreset.findMany({
        where: { 
          OR: [{ gradeGroup }, { status: "ACTIVE" }]
        },
        orderBy: { sortOrder: "asc" }
      })
    }

    const existingSheet = goals.length > 0 ? {
      studentCommitment: goals[0].studentCommitment || "",
      signedByStudent: goals[0].signedByStudent,
      submittedAt: goals[0].createdAt,
      goals
    } : null

    return jsonResponse({ goals, presets, existingSheet, trackingLogs })
  } catch (error: any) {
    console.error("GET /api/advisory/goals error:", error)
    return jsonResponse({ error: error.message || "Server error" }, 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    const studentSess = await getStudentSession()
    if (!session && !studentSess) {
      return jsonResponse({ error: "Chưa đăng nhập" }, 401)
    }

    const body = await req.json()
    const {
      studentId,
      academicYearId,
      gradeLevel,
      semester = "CA_NAM",
      goals = [],
      studentCommitment,
      parentMessage,
      teacherComment,
      signedByStudent,
      signedByParent,
      signedByTeacher
    } = body

    const targetStudentId = studentId || studentSess?.studentId

    if (!targetStudentId) {
      return jsonResponse({ error: "Thiếu thông tin ID Học sinh" }, 400)
    }

    let yearId = academicYearId
    if (!yearId) {
      const defaultAY = await getDefaultAcademicYear(prisma)
      yearId = defaultAY?.id || ""
    }

    await prisma.studentGoal.deleteMany({
      where: { 
        studentId: targetStudentId,
        ...(yearId ? { academicYearId: yearId } : {})
      }
    })

    const createdGoals = []
    for (const item of goals) {
      const created = await prisma.studentGoal.create({
        data: {
          studentId: targetStudentId,
          academicYearId: yearId || "",
          gradeLevel: gradeLevel || "K8",
          semester,
          category: item.category || "HOC_TAP",
          targetText: item.targetText || "",
          presetId: item.presetId || null,
          teacherSupportRequest: item.teacherSupportRequest || null,
          parentSupportRequest: item.parentSupportRequest || null,
          checkpointDate: new Date(),
          achievementLevel: "DANG_TIEN_TRIEN",
          status: "SUBMITTED",
          studentCommitment,
          parentMessage,
          teacherComment,
          signedByStudent: Boolean(signedByStudent),
          signedByParent: Boolean(signedByParent),
          signedByTeacher: Boolean(signedByTeacher),
          actions: {
            create: (item.actions || []).map((act: any) => ({
              actionText: typeof act === "string" ? act : act.actionText,
              status: act.status || "PENDING"
            }))
          }
        },
        include: { actions: true }
      })
      createdGoals.push(created)

      await prisma.studentGoalTrackingLog.create({
        data: {
          studentId: targetStudentId,
          academicYearId: yearId || "",
          goalId: created.id,
          category: item.category || "HOC_TAP",
          targetText: item.targetText || "",
          checkPoint: "DAU_NAM",
          progressStatus: "TIEN_TRIEN",
          teacherNotes: "Đã nộp phiếu đầu năm - Chờ GVCN đánh giá"
        }
      }).catch(() => {})
    }

    return jsonResponse({ success: true, goals: createdGoals })
  } catch (error: any) {
    console.error("POST /api/advisory/goals error:", error)
    return jsonResponse({ error: error.message || "Server error" }, 500)
  }
}
