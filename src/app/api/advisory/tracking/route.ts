import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get("studentId")
  const academicYearId = searchParams.get("academicYearId")
  const checkPoint = searchParams.get("checkPoint")

  if (!studentId) {
    return NextResponse.json({ error: "Missing studentId" }, { status: 400 })
  }

  try {
    const logs = await prisma.studentGoalTrackingLog.findMany({
      where: {
        studentId,
        ...(academicYearId ? { academicYearId } : {}),
        ...(checkPoint ? { checkPoint } : {})
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(logs)
  } catch (error: any) {
    console.error("GET /api/advisory/tracking error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { studentId, academicYearId, items, checkPoint } = body

    if (!studentId || !Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const createdRecords = []
    for (const item of items) {
      if (!item.targetText) continue
      const record = await prisma.studentGoalTrackingLog.create({
        data: {
          studentId,
          academicYearId: academicYearId || "",
          goalId: item.goalId || null,
          category: item.category || "HOC_TAP",
          targetText: item.targetText,
          checkPoint: checkPoint || item.checkPoint || "GIUA_KY_1",
          progressStatus: item.progressStatus || "TIEN_TRIEN",
          teacherNotes: item.teacherNotes || null,
          evaluatedById: (session.user as any)?.id || null
        }
      })
      createdRecords.push(record)
    }

    return NextResponse.json({ success: true, count: createdRecords.length })
  } catch (error: any) {
    console.error("POST /api/advisory/tracking error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}
