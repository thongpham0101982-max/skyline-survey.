import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getStudentSession } from "@/lib/student-session"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { createClient } from "@libsql/client/web"

export const dynamic = "force-dynamic"

let rawUrl = (process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || "").trim()
if (!rawUrl || (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://") && !rawUrl.startsWith("libsql://"))) {
  rawUrl = "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io"
}
const TURSO_URL = rawUrl.replace(/^libsql:\/\//, 'https://')
const TURSO_TOKEN = (process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw").trim()

const libsqlClient = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
})

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  return res
}

async function ensureUnlockTableExists() {
  const ddl = `CREATE TABLE IF NOT EXISTS "StudentGoalUnlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "targetCategory" TEXT NOT NULL,
    "targetText" TEXT NOT NULL,
    "currentState" TEXT NOT NULL,
    "barriers" TEXT NOT NULL,
    "otherBarrier" TEXT,
    "selectedKey" TEXT NOT NULL,
    "sevenDayAction" TEXT NOT NULL,
    "actionTiming" TEXT,
    "companion" TEXT,
    "needSupport" BOOLEAN NOT NULL DEFAULT false,
    "supportStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "teacherSupportNotes" TEXT,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`
  try {
    await libsqlClient.execute(ddl)
  } catch (e) {
    console.error("DDL StudentGoalUnlock error:", e)
  }
}

function calculateSprintProgress(startDate: Date | string, endDate: Date | string) {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  const now = Date.now()
  
  const totalDays = 7
  const msPerDay = 24 * 60 * 60 * 1000
  const elapsedDays = Math.min(totalDays, Math.max(1, Math.floor((now - start) / msPerDay) + 1))
  const percent = Math.min(100, Math.round((elapsedDays / totalDays) * 100))
  const isExpired = now > end

  return {
    dayNumber: elapsedDays,
    totalDays,
    percent,
    isExpired
  }
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

    if (!targetStudentId) {
      return jsonResponse({ error: "Thiếu studentId" }, 400)
    }

    if (!academicYearId) {
      const activeYear = await getDefaultAcademicYear(prisma)
      if (activeYear) academicYearId = activeYear.id
    }

    await ensureUnlockTableExists()

    const unlocks = await prisma.studentGoalUnlock.findMany({
      where: {
        studentId: targetStudentId,
        ...(academicYearId ? { academicYearId } : {})
      },
      include: {
        goal: {
          include: { actions: true }
        }
      },
      orderBy: { createdAt: "desc" }
    }).catch(() => [])

    const activeUnlock = unlocks.find(u => u.status === "IN_PROGRESS") || null

    let progressInfo = null
    if (activeUnlock) {
      progressInfo = calculateSprintProgress(activeUnlock.startDate, activeUnlock.endDate)
    }

    return jsonResponse({
      activeUnlock,
      progressInfo,
      history: unlocks
    })
  } catch (e: any) {
    console.error("GET /api/advisory/goals/unlock error:", e)
    return jsonResponse({ error: e.message }, 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    const studentSess = await getStudentSession()
    if (!session && !studentSess) {
      return jsonResponse({ error: "Chưa đăng nhập" }, 401)
    }

    await ensureUnlockTableExists()

    const body = await req.json()
    const studentId = body.studentId || studentSess?.studentId
    let academicYearId = body.academicYearId || ""
    const {
      goalId,
      targetCategory,
      targetText,
      currentState,
      barriers,
      otherBarrier,
      selectedKey,
      sevenDayAction,
      actionTiming,
      companion
    } = body

    if (!studentId) {
      return jsonResponse({ error: "Thiếu studentId" }, 400)
    }

    if (!goalId || !currentState || !selectedKey || !sevenDayAction?.trim()) {
      return jsonResponse({
        error: "Vui lòng hoàn thành đầy đủ các bước: Chọn mục tiêu, Trạng thái, Chìa khóa và Hành động 7 ngày."
      }, 400)
    }

    if (!academicYearId) {
      const activeYear = await getDefaultAcademicYear(prisma)
      if (activeYear) academicYearId = activeYear.id
    }

    const compLower = (companion || "").toLowerCase()
    const needSupport = body.needSupport === true ||
      compLower.includes("cố vấn") ||
      compLower.includes("gvcn") ||
      compLower.includes("giáo viên") ||
      compLower.includes("thầy cô")

    const startDate = new Date()
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Complete any previous active sprint
    await prisma.studentGoalUnlock.updateMany({
      where: {
        studentId,
        status: "IN_PROGRESS"
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date()
      }
    }).catch(() => {})

    const barriersStr = Array.isArray(barriers) ? JSON.stringify(barriers) : (typeof barriers === "string" ? barriers : "[]")

    const newUnlock = await prisma.studentGoalUnlock.create({
      data: {
        goalId,
        studentId,
        academicYearId,
        targetCategory: targetCategory || "HOC_TAP",
        targetText: targetText || "",
        currentState,
        barriers: barriersStr,
        otherBarrier: otherBarrier || "",
        selectedKey,
        sevenDayAction: sevenDayAction.trim(),
        actionTiming: actionTiming || "",
        companion: companion || "Tôi tự thực hiện",
        needSupport,
        supportStatus: needSupport ? "PENDING" : "NOT_NEEDED",
        startDate,
        endDate,
        status: "IN_PROGRESS"
      },
      include: {
        goal: true
      }
    })

    const progressInfo = calculateSprintProgress(newUnlock.startDate, newUnlock.endDate)

    return jsonResponse({
      success: true,
      unlock: newUnlock,
      progressInfo
    })
  } catch (e: any) {
    console.error("POST /api/advisory/goals/unlock error:", e)
    return jsonResponse({ error: e.message }, 500)
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    const studentSess = await getStudentSession()
    if (!session && !studentSess) {
      return jsonResponse({ error: "Chưa đăng nhập" }, 401)
    }

    const body = await req.json()
    const { id, action, teacherSupportNotes, supportStatus, status } = body

    if (!id) {
      return jsonResponse({ error: "Thiếu ID đợt mở khóa" }, 400)
    }

    const updateData: any = {}

    if (action === "COMPLETE" || status === "COMPLETED") {
      updateData.status = "COMPLETED"
      updateData.completedAt = new Date()
    } else if (status) {
      updateData.status = status
    }

    if (teacherSupportNotes !== undefined) {
      updateData.teacherSupportNotes = teacherSupportNotes
    }

    if (supportStatus) {
      updateData.supportStatus = supportStatus
    }

    const updated = await prisma.studentGoalUnlock.update({
      where: { id },
      data: updateData
    })

    return jsonResponse({
      success: true,
      unlock: updated
    })
  } catch (e: any) {
    console.error("PUT /api/advisory/goals/unlock error:", e)
    return jsonResponse({ error: e.message }, 500)
  }
}
