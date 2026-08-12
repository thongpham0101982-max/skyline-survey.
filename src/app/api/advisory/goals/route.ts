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
  const gradeLevel = searchParams.get("gradeLevel") || "K1"

  try {
    if (!studentId || !academicYearId) {
      return NextResponse.json({ error: "Missing studentId or academicYearId" }, { status: 400 })
    }

    const goals = await prisma.studentGoal.findMany({
      where: { studentId, academicYearId },
      include: { actions: true },
      orderBy: { createdAt: "asc" }
    })

    // Fetch presets if goals are empty
    let presets: any[] = []
    if (goals.length === 0) {
      let gradeGroup = "K1"
      if (["K2", "K3"].includes(gradeLevel)) gradeGroup = "K2_K3"
      else if (["K4", "K5"].includes(gradeLevel)) gradeGroup = "K4_5"
      
      presets = await prisma.goalPreset.findMany({
        where: { gradeGroup, status: "ACTIVE" },
        orderBy: { sortOrder: "asc" }
      })
    }

    return NextResponse.json({ goals, presets })
  } catch (error: any) {
    console.error("GET /api/advisory/goals error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const {
      studentId,
      academicYearId,
      gradeLevel,
      semester = "CA_NAM",
      goals = [], // Array of goal items
      studentCommitment,
      parentMessage,
      teacherComment,
      signedByStudent,
      signedByParent,
      signedByTeacher
    } = body

    if (!studentId || !academicYearId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Delete existing goals for this student & year to overwrite/update cleanly
    await prisma.studentGoal.deleteMany({
      where: { studentId, academicYearId }
    })

    const createdGoals = []
    for (const item of goals) {
      const created = await prisma.studentGoal.create({
        data: {
          studentId,
          academicYearId,
          gradeLevel: gradeLevel || "K1",
          semester,
          category: item.category || "HOC_TAP",
          targetText: item.targetText || "",
          presetId: item.presetId || null,
          teacherSupportRequest: item.teacherSupportRequest || null,
          parentSupportRequest: item.parentSupportRequest || null,
          smartSpecific: item.smartSpecific || null,
          smartMeasurable: item.smartMeasurable || null,
          smartAchievable: item.smartAchievable || null,
          smartRelevant: item.smartRelevant || null,
          smartTimeBound: item.smartTimeBound || null,
          checkpointDate: item.checkpointDate ? new Date(item.checkpointDate) : null,
          achievementLevel: item.achievementLevel || "DANG_TIEN_TRIEN",
          status: item.status || "IN_PROGRESS",
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
    }

    return NextResponse.json({ success: true, goals: createdGoals })
  } catch (error: any) {
    console.error("POST /api/advisory/goals error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}
