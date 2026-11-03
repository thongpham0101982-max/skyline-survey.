import { getPresetsForGradeGroup } from "@/lib/advisory/defaultPresets"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getStudentSession } from "@/lib/student-session"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { createClient } from "@libsql/client/web"
import {
  resolveAdvisoryCaller,
  verifyStudentRelationship,
  enrichGoalWithPolicies
} from "@/lib/advisory/rbac-guard"
import {
  getPoliciesByStudentIds,
  upsertRecordPolicy,
  appendAdvisoryAuditLog
} from "@/lib/advisory/triparty-sync"

export const dynamic = "force-dynamic"

let rawUrl = (process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || "").trim()
if (!rawUrl || (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://") && !rawUrl.startsWith("libsql://"))) {
  rawUrl = "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io"
}
const TURSO_URL = rawUrl.replace(/^libsql:\/\//, "https://")
const TURSO_TOKEN = (
  process.env.TURSO_AUTH_TOKEN ||
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw"
).trim()

const libsqlClient = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN
})

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
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
    );`,
    `CREATE TABLE IF NOT EXISTS "StudentGoalAdjustmentRequest" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentId" TEXT NOT NULL,
      "academicYearId" TEXT NOT NULL,
      "reason" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "teacherResponse" TEXT,
      "reviewedBy" TEXT,
      "reviewedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS "idx_goal_adj_student" ON "StudentGoalAdjustmentRequest" ("studentId", "academicYearId");`,
    `CREATE INDEX IF NOT EXISTS "idx_goal_adj_status" ON "StudentGoalAdjustmentRequest" ("status");`
  ]
  for (const ddl of ddlList) {
    try {
      await prisma.$executeRawUnsafe(ddl)
    } catch {}
    try {
      await libsqlClient.execute(ddl)
    } catch {}
  }
}

export async function GET(req: Request) {
  try {
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Chưa đăng nhập" }, 401)
    }

    const { searchParams } = new URL(req.url)
    const targetClassId = searchParams.get("classId")
    const queryYearId = searchParams.get("academicYearId")
    if (targetClassId) {
      if (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN") {
        return jsonResponse({ error: "Không có quyền xem thống kê lớp" }, 403)
      }
      const targetClass = await prisma.class
        .findUnique({
          where: { id: targetClassId },
          select: { id: true, academicYearId: true }
        })
        .catch(() => null)
      const effectiveYearId = queryYearId || targetClass?.academicYearId

      const classStudents = await prisma.student.findMany({
        where: {
          classId: targetClassId,
          status: { not: "TRANSFERRED_OUT" },
          ...(queryYearId ? { academicYearId: queryYearId } : {})
        },
        select: { id: true, studentCode: true, studentName: true }
      })
      const studentIdsInClass = classStudents.map(s => s.id)
      const studentCodesInClass = classStudents.map(s => s.studentCode).filter(Boolean) as string[]

      const sameCodeStudents =
        studentCodesInClass.length > 0
          ? await prisma.student
              .findMany({
                where: { studentCode: { in: studentCodesInClass } },
                select: { id: true, studentCode: true }
              })
              .catch(() => [])
          : []

      const allStudentIds = Array.from(new Set([...studentIdsInClass, ...sameCodeStudents.map(s => s.id)]))

      const goalsInClass = await prisma.studentGoal
        .findMany({
          where: { studentId: { in: allStudentIds } },
          select: {
            id: true,
            studentId: true,
            academicYearId: true,
            signedByTeacher: true,
            teacherComment: true,
            signedByParent: true
          }
        })
        .catch(() => [])

      const idToCodeMap = new Map<string, string>()
      classStudents.forEach(s => {
        if (s.studentCode) idToCodeMap.set(s.id, s.studentCode)
      })
      sameCodeStudents.forEach(s => {
        if (s.studentCode) idToCodeMap.set(s.id, s.studentCode)
      })

      const submittedStudentCodesSet = new Set<string>()
      const submittedStudentIdsSet = new Set<string>()
      const confirmedStudentCodesSet = new Set<string>()

      for (const g of goalsInClass) {
        if (!effectiveYearId || g.academicYearId === effectiveYearId || studentIdsInClass.includes(g.studentId)) {
          submittedStudentIdsSet.add(g.studentId)
          const code = idToCodeMap.get(g.studentId)
          if (code) {
            submittedStudentCodesSet.add(code)
            if (g.signedByTeacher) confirmedStudentCodesSet.add(code)
          }
        }
      }

      classStudents.forEach(s => {
        if (s.studentCode && submittedStudentCodesSet.has(s.studentCode)) {
          submittedStudentIdsSet.add(s.id)
        }
      })

      const submittedStudentCodes = Array.from(submittedStudentCodesSet)
      const submittedStudentIds = Array.from(submittedStudentIdsSet)
      const confirmedStudentCodes = Array.from(confirmedStudentCodesSet)

      return jsonResponse({
        classId: targetClassId,
        totalStudents: classStudents.length,
        submittedCount: submittedStudentCodes.length,
        confirmedCount: confirmedStudentCodes.length,
        pendingReviewCount: Math.max(0, submittedStudentCodes.length - confirmedStudentCodes.length),
        submittedStudentIds,
        submittedStudentCodes,
        confirmedStudentCodes
      })
    }

    const targetStudentId = searchParams.get("studentId") || caller.studentId
    const targetStudentCode = searchParams.get("studentCode") || caller.studentCode
    const academicYearId = searchParams.get("academicYearId") || ""
    const gradeLevel = searchParams.get("gradeLevel") || "K8"

    if (!targetStudentId && !targetStudentCode) {
      return jsonResponse({ error: "Thiếu studentId hoặc studentCode" }, 400)
    }

    const rel = await verifyStudentRelationship(caller, (targetStudentId || targetStudentCode) as string)
    if (!rel.allowed) {
      return jsonResponse({ error: rel.reason || "Bạn không có quyền truy cập mục tiêu của học sinh này" }, 403)
    }

    await ensureTablesExist()
    const targetStudentIds = rel.allStudentIds

    const rawGoals = await prisma.studentGoal
      .findMany({
        where: { studentId: { in: targetStudentIds } },
        include: { actions: true },
        orderBy: { createdAt: "asc" }
      })
      .catch(() => [])

    const policyMap = await getPoliciesByStudentIds(targetStudentIds)
    const goals = rawGoals.map(g => enrichGoalWithPolicies(g, policyMap))

    const trackingLogs = await prisma.studentGoalTrackingLog
      .findMany({
        where: { studentId: { in: targetStudentIds } },
        orderBy: { createdAt: "desc" }
      })
      .catch(() => [])

    function parseGradeGroup(gStr: string): string {
      const s = String(gStr || "")
        .toUpperCase()
        .replace(/^(KHỐI|KHOI|K)\s*/i, "")
        .trim()
      const n = parseInt(s, 10)
      if (s === "1" || s === "K1" || n === 1) return "K1"
      if (s === "2" || s === "K2" || n === 2) return "K2"
      if (s === "3" || s === "K3" || n === 3) return "K3"
      if (s === "4" || s === "5" || s === "K4" || s === "K5" || n === 4 || n === 5) return "K4_K5"
      if (s === "6" || s === "7" || s === "8" || s === "K6" || s === "K7" || s === "K8" || (n >= 6 && n <= 8)) return "K6_K8"
      if (s === "9" || s === "10" || s === "11" || s === "12" || s === "K9" || s === "K10" || s === "K11" || s === "K12" || (n >= 9 && n <= 12))
        return "K9_K12"
      return "K6_K8"
    }

    const gradeGroup = parseGradeGroup(gradeLevel)

    let presets = await prisma.goalPreset
      .findMany({
        where: { gradeGroup, status: "ACTIVE" },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }]
      })
      .catch(() => [])

    if (presets.length === 0) {
      presets = await prisma.goalPreset
        .findMany({
          where: { status: "ACTIVE" },
          orderBy: [{ category: "asc" }, { sortOrder: "asc" }]
        })
        .catch(() => [])
    }

    let latestAdjustmentRequest: any = null
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "StudentGoalAdjustmentRequest"
         WHERE "studentId" = ?
         AND ("academicYearId" = ? OR ? = '')
         ORDER BY "createdAt" DESC LIMIT 1`,
        rel.student.id,
        academicYearId || "",
        academicYearId || ""
      )
      if (rows && rows.length > 0) {
        latestAdjustmentRequest = rows[0]
      }
    } catch {}

    if (!latestAdjustmentRequest) {
      try {
        const adjRes = await libsqlClient.execute({
          sql: `SELECT * FROM "StudentGoalAdjustmentRequest" 
                WHERE "studentId" = ? 
                AND ("academicYearId" = ? OR ? = '')
                ORDER BY "createdAt" DESC LIMIT 1`,
          args: [rel.student.id || "", academicYearId || "", academicYearId || ""]
        })
        if (adjRes.rows && adjRes.rows.length > 0) {
          latestAdjustmentRequest = adjRes.rows[0]
        }
      } catch {}
    }

    const isUnlockedForEdit = Boolean(latestAdjustmentRequest && latestAdjustmentRequest.status === "APPROVED")

    const existingSheet =
      goals.length > 0
        ? {
            id: goals[0].id,
            studentCommitment: goals[0].studentCommitment || "",
            parentMessage: goals.find(g => g.parentMessage)?.parentMessage || "",
            teacherComment: goals.find(g => g.teacherComment)?.teacherComment || "",
            signedByStudent: goals.some(g => g.signedByStudent),
            signedByParent: goals.some(g => g.signedByParent),
            signedByTeacher: goals.some(g => g.signedByTeacher),
            advisorReviewStatus: goals[0].advisorReviewStatus || "PENDING_REVIEW",
            submittedAt: goals[0].createdAt,
            goals
          }
        : null

    return jsonResponse({
      goals,
      presets,
      existingSheet,
      trackingLogs,
      adjustmentRequest: latestAdjustmentRequest,
      isUnlockedForEdit
    })
  } catch (error: any) {
    console.error("GET /api/advisory/goals error:", error)
    return jsonResponse({ error: error.message || "Server error" }, 500)
  }
}

export async function POST(req: Request) {
  try {
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
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

    const targetStudentId = studentId || caller.studentId

    if (!targetStudentId) {
      return jsonResponse({ error: "Thiếu thông tin ID Học sinh" }, 400)
    }

    const rel = await verifyStudentRelationship(caller, targetStudentId)
    if (!rel.allowed) {
      return jsonResponse({ error: rel.reason || "Không có quyền cập nhật mục tiêu" }, 403)
    }

    let yearId = academicYearId
    const targetStudent = rel.student

    if (targetStudent?.academicYearId) {
      yearId = targetStudent.academicYearId
    } else if (targetStudent?.class?.academicYearId) {
      yearId = targetStudent.class.academicYearId
    } else if (!yearId || yearId === "AY-2026") {
      const defaultAY = await getDefaultAcademicYear(prisma)
      yearId = defaultAY?.id || yearId || ""
    }

    await ensureTablesExist()

    // BẢO TOÀN DỮ LIỆU CŨ: Lấy lại chữ ký và lời nhắn của Phụ huynh / GVCN trước khi cập nhật phiếu
    const previousGoals = await prisma.studentGoal
      .findMany({
        where: {
          studentId: targetStudentId,
          ...(yearId ? { academicYearId: yearId } : {})
        },
        include: { actions: true }
      })
      .catch(() => [])

    const preservedParentMessage =
      parentMessage !== undefined
        ? parentMessage
        : previousGoals.find(g => g.parentMessage)?.parentMessage || null
    const preservedSignedByParent =
      signedByParent !== undefined
        ? Boolean(signedByParent)
        : previousGoals.some(g => g.signedByParent)
    const preservedTeacherComment =
      teacherComment !== undefined
        ? teacherComment
        : previousGoals.find(g => g.teacherComment)?.teacherComment || null
    const preservedSignedByTeacher =
      signedByTeacher !== undefined
        ? Boolean(signedByTeacher)
        : previousGoals.some(g => g.signedByTeacher)

    // Lưu trạng thái action cũ theo actionText để không mất tiến độ làm việc của học sinh
    const prevActionStatusMap = new Map<string, string>()
    for (const pg of previousGoals) {
      for (const pa of pg.actions || []) {
        if (pa.actionText) prevActionStatusMap.set(pa.actionText.trim(), pa.status)
      }
    }

    await prisma.studentGoal
      .deleteMany({
        where: {
          studentId: targetStudentId,
          ...(yearId ? { academicYearId: yearId } : {})
        }
      })
      .catch(() => {})

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
          smartSpecific: item.smartSpecific || null,
          smartMeasurable: item.subjectTargets
            ? JSON.stringify(item.subjectTargets)
            : item.smartMeasurable || null,
          smartAchievable: item.smartAchievable || null,
          smartRelevant: item.smartRelevant || null,
          smartTimeBound: item.smartTimeBound || null,
          checkpointDate: new Date(),
          achievementLevel: "DANG_TIEN_TRIEN",
          status: "SUBMITTED",
          studentCommitment,
          parentMessage: preservedParentMessage,
          teacherComment: preservedTeacherComment,
          signedByStudent: signedByStudent !== undefined ? Boolean(signedByStudent) : true,
          signedByParent: preservedSignedByParent,
          signedByTeacher: preservedSignedByTeacher,
          actions: {
            create: (item.actions || []).map((act: any) => {
              const txt = typeof act === "string" ? act : act.actionText
              const prevSt = txt ? prevActionStatusMap.get(txt.trim()) : undefined
              return {
                actionText: txt || "",
                status: act.status || prevSt || "PENDING"
              }
            })
          }
        },
        include: { actions: true }
      })
      createdGoals.push(created)

      await upsertRecordPolicy({
        entityType: "GOAL",
        entityId: created.id,
        studentId: targetStudentId,
        academicYearId: yearId || "",
        privacyTier: "SHARED_EDUCATIONAL",
        shareWithParent: true,
        advisorReviewStatus: preservedSignedByTeacher ? "CONFIRMED" : "PENDING_REVIEW",
        advisorReviewNote: preservedTeacherComment,
        updatedById: caller.userId,
        updatedByRole: caller.actorRole
      })

      await prisma.studentGoalTrackingLog
        .create({
          data: {
            studentId: targetStudentId,
            academicYearId: yearId || "",
            goalId: created.id,
            category: item.category || "HOC_TAP",
            targetText: item.targetText || "",
            checkPoint: "DAU_NAM",
            progressStatus: "TIEN_TRIEN",
            teacherNotes: preservedTeacherComment || "Đã nộp phiếu đầu năm - Chờ GVCN đánh giá"
          }
        })
        .catch(() => {})
    }

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "StudentGoalAdjustmentRequest"
         SET "status" = 'COMPLETED', "updatedAt" = CURRENT_TIMESTAMP
         WHERE "studentId" = ? AND "status" = 'APPROVED'`,
        targetStudentId
      )
    } catch {}
    try {
      await libsqlClient.execute({
        sql: `UPDATE "StudentGoalAdjustmentRequest" 
              SET "status" = 'COMPLETED', "updatedAt" = CURRENT_TIMESTAMP 
              WHERE "studentId" = ? AND "status" = 'APPROVED'`,
        args: [targetStudentId]
      })
    } catch {}

    await appendAdvisoryAuditLog({
      studentId: targetStudentId,
      actorId: caller.userId,
      actorRole: caller.actorRole,
      actorName: caller.actorName,
      entityType: "GOAL",
      entityId: createdGoals[0]?.id || targetStudentId,
      action: previousGoals.length > 0 ? "UPDATE_GOALS" : "CREATE_GOALS",
      privacyTier: "SHARED_EDUCATIONAL",
      summary: `Cập nhật ${createdGoals.length} mục tiêu SMART cá nhân`,
      changes: { count: createdGoals.length, gradeLevel, semester }
    })

    return jsonResponse({ success: true, goals: createdGoals })
  } catch (error: any) {
    console.error("POST /api/advisory/goals error:", error)
    return jsonResponse({ error: error.message || "Server error" }, 500)
  }
}

export async function PATCH(req: Request) {
  try {
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Chưa đăng nhập" }, 401)
    }

    const body = await req.json()
    const {
      studentId,
      goalId,
      actionId,
      actionStatus,
      evidenceNotes,
      parentMessage,
      signedByParent,
      teacherComment,
      signedByTeacher,
      advisorReviewStatus
    } = body

    const targetStudentId = studentId || caller.studentId
    if (!targetStudentId) {
      return jsonResponse({ error: "Thiếu studentId" }, 400)
    }

    const rel = await verifyStudentRelationship(caller, targetStudentId)
    if (!rel.allowed) {
      return jsonResponse({ error: rel.reason || "Không có quyền thao tác trên học sinh này" }, 403)
    }

    const targetStudentIds = rel.allStudentIds

    // MODE 1: Học sinh / GV cập nhật trạng thái thực hiện hành động & minh chứng (Student Action & Evidence)
    if (actionId) {
      const normalizedStatus =
        actionStatus === "DONE" || actionStatus === "COMPLETED"
          ? "DONE"
          : actionStatus === "DOING" || actionStatus === "IN_PROGRESS"
          ? "DOING"
          : "PENDING"

      await prisma.studentGoalAction
        .update({
          where: { id: actionId },
          data: { status: normalizedStatus }
        })
        .catch(() => null)

      await upsertRecordPolicy({
        entityType: "GOAL_ACTION",
        entityId: actionId,
        studentId: rel.student.id,
        academicYearId: rel.student.academicYearId || "",
        privacyTier: "SHARED_EDUCATIONAL",
        shareWithParent: true,
        evidenceNotes: evidenceNotes ?? null,
        updatedById: caller.userId,
        updatedByRole: caller.actorRole
      })

      await appendAdvisoryAuditLog({
        studentId: rel.student.id,
        actorId: caller.userId,
        actorRole: caller.actorRole,
        actorName: caller.actorName,
        entityType: "GOAL_ACTION",
        entityId: actionId,
        action: "UPDATE_GOAL_ACTION",
        privacyTier: "SHARED_EDUCATIONAL",
        summary: `Cập nhật tiến độ hành động mục tiêu (${normalizedStatus})`,
        changes: { actionId, status: normalizedStatus, evidenceNotes }
      })

      return jsonResponse({
        success: true,
        message: "Đã cập nhật tiến độ hành động và minh chứng thành công!"
      })
    }

    // MODE 2: Giáo viên / CVHT xác nhận hoặc đề nghị điều chỉnh mục tiêu (Advisor Review)
    if (
      (caller.actorRole === "TEACHER" || caller.actorRole === "ADMIN") &&
      (teacherComment !== undefined || signedByTeacher !== undefined || advisorReviewStatus !== undefined)
    ) {
      const isConfirmed =
        advisorReviewStatus === "CONFIRMED" || Boolean(signedByTeacher && advisorReviewStatus !== "NEEDS_ADJUSTMENT")
      const resolvedStatus =
        advisorReviewStatus || (isConfirmed ? "CONFIRMED" : "NEEDS_ADJUSTMENT")

      const goalWhere = goalId
        ? { id: goalId }
        : { studentId: { in: targetStudentIds } }

      const targetGoals = await prisma.studentGoal.findMany({ where: goalWhere })

      if (targetGoals.length > 0) {
        await prisma.studentGoal.updateMany({
          where: goalWhere,
          data: {
            ...(teacherComment !== undefined ? { teacherComment } : {}),
            signedByTeacher: isConfirmed,
            status: isConfirmed ? "IN_PROGRESS" : "ADJUSTED"
          }
        })

        for (const g of targetGoals) {
          await upsertRecordPolicy({
            entityType: "GOAL",
            entityId: g.id,
            studentId: g.studentId,
            academicYearId: g.academicYearId,
            privacyTier: "SHARED_EDUCATIONAL",
            shareWithParent: true,
            advisorReviewStatus: resolvedStatus,
            advisorReviewNote: teacherComment ?? g.teacherComment ?? null,
            updatedById: caller.userId,
            updatedByRole: caller.actorRole
          })
        }
      }

      // Nếu CVHT đề nghị điều chỉnh (NEEDS_ADJUSTMENT), tự động mở khóa phiếu để học sinh sửa
      if (resolvedStatus === "NEEDS_ADJUSTMENT") {
        const reqId = `adj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        try {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "StudentGoalAdjustmentRequest" (
              "id", "studentId", "academicYearId", "reason", "status", "teacherResponse", "reviewedBy", "reviewedAt", "createdAt", "updatedAt"
            ) VALUES (?, ?, ?, ?, 'APPROVED', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            reqId,
            rel.student.id,
            rel.student.academicYearId || "",
            "CVHT đề nghị điều chỉnh mục tiêu SMART",
            teacherComment || "Vui lòng điều chỉnh lại mục tiêu theo góp ý của CVHT",
            caller.actorName
          )
        } catch {}
      }

      await appendAdvisoryAuditLog({
        studentId: rel.student.id,
        actorId: caller.userId,
        actorRole: caller.actorRole,
        actorName: caller.actorName,
        entityType: "GOAL",
        entityId: goalId || rel.student.id,
        action: isConfirmed ? "ADVISOR_CONFIRM_GOALS" : "ADVISOR_REQUEST_ADJUSTMENT",
        privacyTier: "SHARED_EDUCATIONAL",
        summary: isConfirmed
          ? "CVHT đã xác nhận mục tiêu SMART của học sinh"
          : "CVHT đề nghị học sinh điều chỉnh mục tiêu SMART",
        changes: { advisorReviewStatus: resolvedStatus, teacherComment }
      })

      return jsonResponse({
        success: true,
        advisorReviewStatus: resolvedStatus,
        message: isConfirmed
          ? "Đã xác nhận mục tiêu học tập cho học sinh thành công!"
          : "Đã gửi đề nghị điều chỉnh và mở khóa phiếu cho học sinh!"
      })
    }

    // MODE 3: Phụ huynh gửi lời nhắn động viên & ký đồng hành (Parent Feedback on Goals)
    const count = await prisma.studentGoal.count({
      where: { studentId: { in: targetStudentIds } }
    })

    if (count === 0) {
      await prisma.studentGoal.create({
        data: {
          studentId: rel.student.id,
          academicYearId: rel.student.academicYearId || "",
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
        where: { studentId: { in: targetStudentIds } },
        data: {
          parentMessage: parentMessage || "",
          signedByParent: Boolean(signedByParent)
        }
      })
    }

    await appendAdvisoryAuditLog({
      studentId: rel.student.id,
      actorId: caller.userId,
      actorRole: caller.actorRole,
      actorName: caller.actorName,
      entityType: "GOAL",
      entityId: rel.student.id,
      action: "PARENT_SIGN_GOALS",
      privacyTier: "SHARED_EDUCATIONAL",
      summary: "Phụ huynh gửi lời nhắn đồng hành và ký xác nhận mục tiêu",
      changes: { parentMessage, signedByParent: Boolean(signedByParent) }
    })

    return jsonResponse({
      success: true,
      message: "Cập nhật lời dặn và ký cam kết đồng hành Phụ huynh thành công!"
    })
  } catch (error: any) {
    console.error("PATCH /api/advisory/goals error:", error)
    return jsonResponse({ error: error.message || "Server error" }, 500)
  }
}
