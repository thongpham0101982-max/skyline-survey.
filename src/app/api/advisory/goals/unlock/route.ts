import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import {
  resolveAdvisoryCaller,
  verifyStudentRelationship
} from "@/lib/advisory/rbac-guard"

export const dynamic = "force-dynamic"

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
    await prisma.$executeRawUnsafe(ddl)
  } catch (e) {
    // Table already exists or mock environment
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
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Chưa đăng nhập" }, 401)
    }

    const { searchParams } = new URL(req.url)
    const targetStudentId = searchParams.get("studentId") || caller.studentId
    let academicYearId = searchParams.get("academicYearId") || ""

    if (!targetStudentId) {
      return jsonResponse({ error: "Thiếu studentId" }, 400)
    }

    const rel = await verifyStudentRelationship(caller, targetStudentId)
    if (!rel.allowed) {
      return jsonResponse({ error: rel.reason || "Bạn không có quyền xem dữ liệu mở khóa mục tiêu của học sinh này" }, 403)
    }

    if (!academicYearId) {
      const activeYear = await getDefaultAcademicYear(prisma)
      if (activeYear) academicYearId = activeYear.id
    }

    await ensureUnlockTableExists()

    const unlocks = await prisma.studentGoalUnlock.findMany({
      where: {
        studentId: { in: rel.allStudentIds.length > 0 ? rel.allStudentIds : [targetStudentId] },
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
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Chưa đăng nhập" }, 401)
    }

    await ensureUnlockTableExists()

    const body = await req.json()
    const studentId = body.studentId || caller.studentId
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

    const rel = await verifyStudentRelationship(caller, studentId)
    if (!rel.allowed) {
      return jsonResponse({ error: rel.reason || "Bạn không có quyền khởi tạo đợt mở khóa mục tiêu cho học sinh này" }, 403)
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
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Chưa đăng nhập" }, 401)
    }

    const body = await req.json()
    const { id, action, teacherSupportNotes, supportStatus, status } = body

    if (!id) {
      return jsonResponse({ error: "Thiếu ID đợt mở khóa" }, 400)
    }

    const existingUnlock = await prisma.studentGoalUnlock.findUnique({
      where: { id },
      select: { id: true, studentId: true }
    })
    if (!existingUnlock) {
      return jsonResponse({ error: "Không tìm thấy đợt mở khóa mục tiêu" }, 404)
    }

    const rel = await verifyStudentRelationship(caller, existingUnlock.studentId)
    if (!rel.allowed) {
      return jsonResponse({ error: rel.reason || "Bạn không có quyền cập nhật đợt mở khóa mục tiêu của học sinh này" }, 403)
    }

    const updateData: any = {}

    if (action === "COMPLETE" || status === "COMPLETED") {
      updateData.status = "COMPLETED"
      updateData.completedAt = new Date()
    } else if (status) {
      updateData.status = status
    }

    if (teacherSupportNotes !== undefined) {
      if (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN") {
        return jsonResponse({ error: "Chỉ Giáo viên hoặc Quản trị viên mới được cập nhật ghi chú hỗ trợ" }, 403)
      }
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
