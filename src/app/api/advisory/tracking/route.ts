import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  return res
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get("studentId")
  const academicYearId = searchParams.get("academicYearId")
  const checkPoint = searchParams.get("checkPoint")

  if (!studentId) {
    return jsonResponse({ error: "Missing studentId" }, 400)
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

    return jsonResponse(logs)
  } catch (error: any) {
    console.error("GET /api/advisory/tracking error:", error)
    return jsonResponse({ error: error.message || "Server error" }, 500)
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return jsonResponse({ error: "Unauthorized" }, 401)

  try {
    const body = await req.json()
    const { studentId, academicYearId, items, checkPoint } = body

    if (!studentId || !Array.isArray(items)) {
      return jsonResponse({ error: "Invalid payload" }, 400)
    }

    if (studentId && checkPoint) {
      await prisma.studentGoalTrackingLog.deleteMany({
        where: {
          studentId,
          checkPoint,
          ...(academicYearId ? { academicYearId } : {})
        }
      }).catch(() => {})
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

    return jsonResponse({ success: true, count: createdRecords.length })
  } catch (error: any) {
    console.error("POST /api/advisory/tracking error:", error)
    return jsonResponse({ error: error.message || "Server error" }, 500)
  }
}
