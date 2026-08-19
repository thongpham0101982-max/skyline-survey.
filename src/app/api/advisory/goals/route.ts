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

async function ensureTablesExist() {
  const ddlList = [
    `CREATE TABLE IF NOT EXISTS "StudentGoal" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentId" TEXT NOT NULL,
      "academicYearId" TEXT NOT NULL,
      "gradeLevel" TEXT NOT NULL DEFAULT 'K8',
      "semester" TEXT NOT NULL DEFAULT 'CA_NAM',
      "category" TEXT NOT NULL DEFAULT 'HOC_TAP',
      "targetText" TEXT NOT NULL,
      "presetId" TEXT,
      "teacherSupportRequest" TEXT,
      "parentSupportRequest" TEXT,
      "smartSpecific" TEXT,
      "smartMeasurable" TEXT,
      "smartAchievable" TEXT,
      "smartRelevant" TEXT,
      "smartTimeBound" TEXT,
      "checkpointDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "achievementLevel" TEXT NOT NULL DEFAULT 'DANG_TIEN_TRIEN',
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "studentCommitment" TEXT,
      "parentMessage" TEXT,
      "teacherComment" TEXT,
      "signedByStudent" BOOLEAN NOT NULL DEFAULT false,
      "signedByParent" BOOLEAN NOT NULL DEFAULT false,
      "signedByTeacher" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS "StudentGoalAction" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "goalId" TEXT NOT NULL,
      "actionText" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "targetDate" DATETIME,
      "completedAt" DATETIME,
      "deadline" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS "StudentGoalTrackingLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentId" TEXT NOT NULL,
      "academicYearId" TEXT NOT NULL,
      "goalId" TEXT,
      "category" TEXT NOT NULL DEFAULT 'HOC_TAP',
      "targetText" TEXT NOT NULL,
      "checkPoint" TEXT NOT NULL DEFAULT 'DAU_NAM',
      "progressStatus" TEXT NOT NULL DEFAULT 'TIEN_TRIEN',
      "teacherNotes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS "GoalPreset" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "gradeGroup" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "goalText" TEXT NOT NULL,
      "actionPreset" TEXT,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`
  ]
  for (const ddl of ddlList) {
    try {
      await libsqlClient.execute(ddl)
    } catch (e) {
      console.error("DDL init error:", e)
    }
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
    const targetClassId = searchParams.get("classId")
    if (targetClassId) {
      const classStudents = await prisma.student.findMany({
        where: { classId: targetClassId },
        select: { id: true, studentCode: true, studentName: true }
      })
      const studentIdsInClass = classStudents.map(s => s.id)
      
      const goalsInClass = await prisma.studentGoal.findMany({
        where: { studentId: { in: studentIdsInClass } },
        select: { studentId: true }
      }).catch(() => [])
      
      const submittedStudentIds = Array.from(new Set(goalsInClass.map(g => g.studentId)))
      const submittedStudentCodes = Array.from(new Set(
        classStudents
          .filter(s => submittedStudentIds.includes(s.id))
          .map(s => s.studentCode)
          .filter(Boolean)
      ))

      return jsonResponse({
        classId: targetClassId,
        totalStudents: classStudents.length,
        submittedCount: submittedStudentCodes.length,
        submittedStudentIds,
        submittedStudentCodes
      })
    }
    const targetStudentId = searchParams.get("studentId") || studentSess?.studentId
    const targetStudentCode = searchParams.get("studentCode")
    let academicYearId = searchParams.get("academicYearId") || ""
    const gradeLevel = searchParams.get("gradeLevel") || "K8"

    if (!targetStudentId && !targetStudentCode) {
      return jsonResponse({ error: "Thiếu studentId hoặc studentCode" }, 400)
    }

    await ensureTablesExist()

    let targetStudentIds: string[] = []
    if (targetStudentId) targetStudentIds.push(targetStudentId)

    try {
      let codeToLookup: string | null = targetStudentCode || null
      if (!codeToLookup && targetStudentId) {
        const stObj = await prisma.student.findUnique({
          where: { id: targetStudentId },
          select: { studentCode: true }
        })
        codeToLookup = stObj?.studentCode ?? null
      }

      if (codeToLookup) {
        const sameCodeStudents = await prisma.student.findMany({
          where: { studentCode: codeToLookup },
          select: { id: true }
        })
        if (sameCodeStudents.length > 0) {
          targetStudentIds = sameCodeStudents.map(s => s.id)
        }
      }
    } catch (e) {
      console.error("Lookup student ids error:", e)
    }

    const goals = await prisma.studentGoal.findMany({
      where: { 
        studentId: { in: targetStudentIds }
      },
      include: { actions: true },
      orderBy: { createdAt: "asc" }
    }).catch(() => [])

    const trackingLogs = await prisma.studentGoalTrackingLog.findMany({
      where: { 
        studentId: { in: targetStudentIds }
      },
      orderBy: { createdAt: "desc" }
    }).catch(() => [])

        let gradeGroup = "K6_K8"
    if (gradeLevel === "K1") gradeGroup = "K1"
    else if (gradeLevel === "K2") gradeGroup = "K2"
    else if (gradeLevel === "K3") gradeGroup = "K3"
    else if (["K4", "K5"].includes(gradeLevel)) gradeGroup = "K4_K5"
    else if (["K6", "K7", "K8"].includes(gradeLevel)) gradeGroup = "K6_K8"
    else if (["K9", "K10", "K11", "K12"].includes(gradeLevel)) gradeGroup = "K9_K12"
    
    const presets = await prisma.goalPreset.findMany({
      where: { 
        gradeGroup,
        status: "ACTIVE"
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }]
    }).catch(() => [])

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

    await ensureTablesExist()

    await prisma.studentGoal.deleteMany({
      where: { 
        studentId: targetStudentId,
        ...(yearId ? { academicYearId: yearId } : {})
      }
    }).catch(() => {})

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


export async function PATCH(req: Request) {
  try {
    const session = await auth()
    const parentSess = null
    const studentSess = await getStudentSession()

    if (!session && !parentSess && !studentSess) {
      return jsonResponse({ error: "Chưa đăng nhập" }, 401)
    }

    const body = await req.json()
    const { studentId, parentMessage, signedByParent } = body

    if (!studentId) {
      return jsonResponse({ error: "Thiếu studentId" }, 400)
    }

    const stObj = await prisma.student.findUnique({
      where: { id: studentId },
      select: { studentCode: true }
    })

    let targetStudentIds = [studentId]
    if (stObj?.studentCode) {
      const sameCodeStudents = await prisma.student.findMany({
        where: { studentCode: stObj.studentCode },
        select: { id: true }
      })
      if (sameCodeStudents.length > 0) {
        targetStudentIds = sameCodeStudents.map(s => s.id)
      }
    }

    const count = await prisma.studentGoal.count({
      where: { studentId: { in: targetStudentIds } }
    })

    if (count === 0) {
      await prisma.studentGoal.create({
        data: {
          studentId: studentId,
          academicYearId: "",
          gradeLevel: "K8",
          semester: "HK1",
          category: "HOC_TAP",
          targetText: "",
          parentMessage: parentMessage || "",
          signedByParent: Boolean(signedByParent)
        }
      })
    } else {
      await prisma.studentGoal.updateMany({
        where: {
          studentId: { in: targetStudentIds }
        },
        data: {
          parentMessage: parentMessage || "",
          signedByParent: Boolean(signedByParent)
        }
      })
    }

    return jsonResponse({ success: true, message: "Cập nhật lời dặn và ký cam kết đồng hành Phụ huynh thành công!" })
  } catch (error: any) {
    console.error("PATCH /api/advisory/goals error:", error)
    return jsonResponse({ error: error.message || "Server error" }, 500)
  }
}