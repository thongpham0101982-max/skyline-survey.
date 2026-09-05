import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getDefaultAcademicYear } from "@/lib/academicYear"

export const dynamic = "force-dynamic"

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  return res
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
    if (!session) return jsonResponse({ error: "Chưa đăng nhập" }, 401)

    const { searchParams } = new URL(req.url)
    const classId = searchParams.get("classId")
    let academicYearId = searchParams.get("academicYearId") || ""
    const filter = searchParams.get("filter") || "ALL" // ALL, UNLOCKED, NOT_UNLOCKED, IN_PROGRESS, NEED_SUPPORT

    if (!classId) {
      return jsonResponse({ error: "Thiếu classId" }, 400)
    }

    if (!academicYearId) {
      const activeYear = await getDefaultAcademicYear(prisma)
      if (activeYear) academicYearId = activeYear.id
    }

    // 1. Fetch all students in class
    const students = await prisma.student.findMany({
      where: {
        classId,
        status: "ACTIVE",
        ...(academicYearId ? { academicYearId } : {})
      },
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        class: {
          select: {
            id: true,
            className: true,
            grade: true,
            campus: { select: { id: true, campusName: true } }
          }
        }
      },
      orderBy: { studentName: "asc" }
    })

    const studentIds = students.map(s => s.id)

    // 2. Fetch goals for these students
    const goals = await prisma.studentGoal.findMany({
      where: {
        studentId: { in: studentIds },
        ...(academicYearId ? { academicYearId } : {})
      },
      include: { actions: true }
    }).catch(() => [])

    const studentGoalMap: Record<string, any[]> = {}
    goals.forEach(g => {
      if (!studentGoalMap[g.studentId]) studentGoalMap[g.studentId] = []
      studentGoalMap[g.studentId].push(g)
    })

    // 3. Fetch unlocks for these students
    const unlocks = await prisma.studentGoalUnlock.findMany({
      where: {
        studentId: { in: studentIds },
        ...(academicYearId ? { academicYearId } : {})
      },
      orderBy: { createdAt: "desc" }
    }).catch(() => [])

    const studentUnlockMap: Record<string, any> = {}
    unlocks.forEach(u => {
      if (!studentUnlockMap[u.studentId]) {
        studentUnlockMap[u.studentId] = u
      }
    })

    // 4. Map comprehensive rows
    const rows = students.map(st => {
      const stGoals = studentGoalMap[st.id] || []
      const hasGoalSheet = stGoals.length > 0
      const activeUnlock = studentUnlockMap[st.id] || null

      let progressInfo = null
      if (activeUnlock) {
        progressInfo = calculateSprintProgress(activeUnlock.startDate, activeUnlock.endDate)
      }

      return {
        id: st.id,
        studentCode: st.studentCode,
        studentName: st.studentName,
        className: st.class?.className || "",
        campusName: st.class?.campus?.campusName || "",
        hasGoalSheet,
        goalCount: stGoals.length,
        hasUnlocked: !!activeUnlock,
        unlockId: activeUnlock?.id || null,
        targetCategory: activeUnlock?.targetCategory || null,
        targetText: activeUnlock?.targetText || null,
        currentState: activeUnlock?.currentState || null,
        selectedKey: activeUnlock?.selectedKey || null,
        sevenDayAction: activeUnlock?.sevenDayAction || null,
        companion: activeUnlock?.companion || null,
        actionTiming: activeUnlock?.actionTiming || null,
        needSupport: activeUnlock?.needSupport || false,
        supportStatus: activeUnlock?.supportStatus || "NOT_NEEDED",
        teacherSupportNotes: activeUnlock?.teacherSupportNotes || null,
        status: activeUnlock?.status || (hasGoalSheet ? "NOT_UNLOCKED" : "NO_SHEET"),
        progressInfo,
        startDate: activeUnlock?.startDate || null,
        endDate: activeUnlock?.endDate || null,
        completedAt: activeUnlock?.completedAt || null,
        goals: stGoals
      }
    })

    // 5. Apply Quick Filter
    let filteredRows = rows
    if (filter === "UNLOCKED") {
      filteredRows = rows.filter(r => r.hasUnlocked)
    } else if (filter === "NOT_UNLOCKED") {
      filteredRows = rows.filter(r => !r.hasUnlocked && r.hasGoalSheet)
    } else if (filter === "IN_PROGRESS") {
      filteredRows = rows.filter(r => r.status === "IN_PROGRESS")
    } else if (filter === "NEED_SUPPORT") {
      filteredRows = rows.filter(r => r.needSupport)
    }

    // Summary counts
    const metrics = {
      totalStudents: rows.length,
      hasGoalSheetCount: rows.filter(r => r.hasGoalSheet).length,
      unlockedCount: rows.filter(r => r.hasUnlocked).length,
      inProgressCount: rows.filter(r => r.status === "IN_PROGRESS").length,
      needSupportCount: rows.filter(r => r.needSupport).length
    }

    return jsonResponse({
      metrics,
      students: filteredRows
    })
  } catch (e: any) {
    console.error("GET /api/teacher/advisory/unlocks error:", e)
    return jsonResponse({ error: e.message }, 500)
  }
}
