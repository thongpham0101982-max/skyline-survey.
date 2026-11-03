import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  resolveAdvisoryCaller,
  verifyStudentRelationship
} from "@/lib/advisory/rbac-guard"
import {
  upsertRecordPolicy,
  getPoliciesByStudentIds,
  appendAdvisoryAuditLog
} from "@/lib/advisory/triparty-sync"

export const dynamic = "force-dynamic"

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  return res
}

export async function ensureActionItemsTable() {
  const ddlList = [
    `CREATE TABLE IF NOT EXISTS "AdvisoryActionItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "consultationLogId" TEXT,
      "studentId" TEXT NOT NULL,
      "academicYearId" TEXT NOT NULL,
      "actionDescription" TEXT NOT NULL,
      "assignedToRole" TEXT NOT NULL DEFAULT 'STUDENT',
      "assignedToName" TEXT,
      "deadline" DATETIME,
      "status" TEXT NOT NULL DEFAULT 'TODO',
      "completedAt" DATETIME,
      "evidenceNotes" TEXT,
      "createdById" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS "idx_adv_act_student" ON "AdvisoryActionItem" ("studentId", "academicYearId");`,
    `CREATE INDEX IF NOT EXISTS "idx_adv_act_status" ON "AdvisoryActionItem" ("status", "deadline");`
  ]
  for (const ddl of ddlList) {
    try {
      await prisma.$executeRawUnsafe(ddl)
    } catch (e) {
      console.error("DDL AdvisoryActionItem error:", e)
    }
  }
}

// GET: Lấy danh sách việc cần làm 7 ngày & minh chứng theo studentId hoặc classId
export async function GET(req: Request) {
  try {
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Unauthorized" }, 401)
    }

    await ensureActionItemsTable()
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId") || (caller.actorRole === "STUDENT" ? caller.studentId : null)
    const classId = searchParams.get("classId")
    const academicYearId = searchParams.get("academicYearId") || ""
    const statusFilter = searchParams.get("status") // ALL, TODO, IN_PROGRESS, COMPLETED, OVERDUE

    let studentIds: string[] = []
    if (studentId) {
      const rel = await verifyStudentRelationship(caller, studentId)
      if (!rel.allowed) {
        return jsonResponse({ error: rel.reason || "Forbidden" }, 403)
      }
      studentIds = rel.allStudentIds
    } else if (classId) {
      if (caller.actorRole !== "TEACHER" && caller.actorRole !== "ADMIN") {
        return jsonResponse({ error: "Forbidden" }, 403)
      }
      const clsStudents = await prisma.student
        .findMany({
          where: { classId, status: { not: "TRANSFERRED_OUT" } },
          select: { id: true }
        })
        .catch(() => [])
      studentIds = clsStudents.map(s => s.id)
    }

    if (studentIds.length === 0) {
      return jsonResponse({ actionItems: [], overdueCount: 0, completedCount: 0, pendingCount: 0 })
    }

    // 1. Lấy dữ liệu từ bảng độc lập AdvisoryActionItem
    const placeholders = studentIds.map(() => "?").join(",")
    const rawRows = (await prisma
      .$queryRawUnsafe(
        `SELECT * FROM "AdvisoryActionItem" WHERE "studentId" IN (${placeholders}) ${
          academicYearId ? 'AND ("academicYearId" = ? OR "academicYearId" = \'\')' : ""
        } ORDER BY "deadline" ASC, "createdAt" DESC`,
        ...(academicYearId ? [...studentIds, academicYearId] : studentIds)
      )
      .catch(() => [])) as any[]

    const standaloneItems = (rawRows || []).map((r: any) => {
      const deadlineDate = r.deadline ? new Date(r.deadline) : null
      const isOverdue =
        r.status !== "COMPLETED" && deadlineDate && deadlineDate.getTime() < Date.now()
      return {
        id: String(r.id),
        source: "DIRECT_TASK",
        consultationLogId: r.consultationLogId ? String(r.consultationLogId) : null,
        studentId: String(r.studentId),
        academicYearId: String(r.academicYearId),
        actionDescription: String(r.actionDescription || ""),
        assignedToRole: String(r.assignedToRole || "STUDENT"),
        assignedToName: r.assignedToName ? String(r.assignedToName) : null,
        deadline: r.deadline ? String(r.deadline) : null,
        status: isOverdue ? "OVERDUE" : String(r.status || "TODO"),
        completedAt: r.completedAt ? String(r.completedAt) : null,
        evidenceNotes: r.evidenceNotes ? String(r.evidenceNotes) : null,
        isOverdue: Boolean(isOverdue),
        createdAt: String(r.createdAt || "")
      }
    })

    // 2. Tổng hợp các hành động từ AcademicConsultationLog (nextActions)
    const consultationLogs = await prisma.academicConsultationLog
      .findMany({
        where: {
          studentId: { in: studentIds },
          ...(academicYearId ? { academicYearId } : {}),
          nextActions: { not: null }
        },
        select: {
          id: true,
          studentId: true,
          academicYearId: true,
          nextActions: true,
          deadline: true,
          status: true,
          notes: true,
          createdAt: true
        },
        orderBy: { meetingDate: "desc" }
      })
      .catch(() => [])

    const policyMap = await getPoliciesByStudentIds(studentIds)

    const consultationItems = consultationLogs
      .filter(c => {
        if (!c.nextActions || c.nextActions.trim().length === 0) return false
        if (caller.actorRole === "PARENT") {
          const pol = policyMap.get(`CONSULTATION:${c.id}`)
          if (pol && (!pol.shareWithParent || pol.privacyTier !== "SHARED_EDUCATIONAL")) {
            return false
          }
        }
        return true
      })
      .map(c => {
        const deadlineDate = c.deadline ? new Date(c.deadline) : null
        const isOverdue =
          c.status !== "COMPLETED" && deadlineDate && deadlineDate.getTime() < Date.now()
        const actPol = policyMap.get(`GOAL_ACTION:cons-${c.id}`)
        return {
          id: `cons-${c.id}`,
          source: "CONSULTATION_LOG",
          consultationLogId: c.id,
          studentId: c.studentId,
          academicYearId: c.academicYearId,
          actionDescription: c.nextActions || "",
          assignedToRole: "STUDENT",
          assignedToName: "Học sinh",
          deadline: c.deadline ? c.deadline.toISOString() : null,
          status: isOverdue ? "OVERDUE" : c.status === "COMPLETED" ? "COMPLETED" : "TODO",
          completedAt: null,
          evidenceNotes: actPol?.evidenceNotes || c.notes || null,
          isOverdue: Boolean(isOverdue),
          createdAt: c.createdAt.toISOString()
        }
      })

    // 3. Tổng hợp các hành động từ StudentGoalAction (Nhật ký hành động SMART)
    const goalsWithActions = await prisma.studentGoal
      .findMany({
        where: { studentId: { in: studentIds } },
        include: { actions: true }
      })
      .catch(() => [])

    const goalActionItems: any[] = []
    for (const g of goalsWithActions) {
      for (const act of g.actions || []) {
        if (!act.actionText?.trim()) continue
        const actPol = policyMap.get(`GOAL_ACTION:${act.id}`)
        const isCompleted = act.status === "DONE" || act.status === "COMPLETED"
        const deadlineDate = act.deadline ? new Date(act.deadline) : null
        const isOverdue = !isCompleted && deadlineDate && deadlineDate.getTime() < Date.now()

        goalActionItems.push({
          id: `goalact-${act.id}`,
          rawActionId: act.id,
          goalId: g.id,
          goalCategory: g.category,
          source: "SMART_GOAL_ACTION",
          consultationLogId: null,
          studentId: g.studentId,
          academicYearId: g.academicYearId,
          actionDescription: `[${g.category}] ${act.actionText}`,
          assignedToRole: "STUDENT",
          assignedToName: "Học sinh",
          deadline: act.deadline ? act.deadline.toISOString() : null,
          status: isCompleted ? "COMPLETED" : act.status === "DOING" ? "IN_PROGRESS" : isOverdue ? "OVERDUE" : "TODO",
          completedAt: isCompleted ? act.updatedAt.toISOString() : null,
          evidenceNotes: actPol?.evidenceNotes || null,
          isOverdue: Boolean(isOverdue),
          createdAt: act.createdAt.toISOString()
        })
      }
    }

    const allItems = [...standaloneItems, ...consultationItems, ...goalActionItems]

    const filteredItems = allItems.filter(item => {
      if (!statusFilter || statusFilter === "ALL") return true
      if (statusFilter === "OVERDUE") return item.isOverdue
      return item.status === statusFilter
    })

    const overdueCount = allItems.filter(i => i.isOverdue).length
    const completedCount = allItems.filter(i => i.status === "COMPLETED").length
    const pendingCount = allItems.filter(i => i.status !== "COMPLETED").length

    return jsonResponse({
      actionItems: filteredItems,
      totalCount: allItems.length,
      overdueCount,
      completedCount,
      pendingCount
    })
  } catch (error: any) {
    console.error("GET /api/advisory/action-items error:", error)
    return jsonResponse({ error: error.message || "Server error" }, 500)
  }
}

// POST: Tạo hành động mới (GV giao việc 7 ngày hoặc Học sinh tự thêm nhật ký hành động)
export async function POST(req: Request) {
  try {
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Unauthorized" }, 401)
    }

    await ensureActionItemsTable()
    const body = await req.json()
    const {
      studentId,
      academicYearId,
      consultationLogId,
      actionDescription,
      assignedToRole,
      assignedToName,
      deadline,
      evidenceNotes
    } = body

    const targetStudentId = studentId || caller.studentId
    if (!targetStudentId || !actionDescription) {
      return jsonResponse({ error: "Thiếu studentId hoặc actionDescription" }, 400)
    }

    const rel = await verifyStudentRelationship(caller, targetStudentId)
    if (!rel.allowed) {
      return jsonResponse({ error: rel.reason || "Forbidden" }, 403)
    }

    const id = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const defaultDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await prisma.$executeRawUnsafe(
      `INSERT INTO "AdvisoryActionItem" (
        "id", "consultationLogId", "studentId", "academicYearId",
        "actionDescription", "assignedToRole", "assignedToName",
        "deadline", "status", "evidenceNotes", "createdById", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'TODO', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      id,
      consultationLogId || null,
      rel.student.id,
      academicYearId || rel.student.academicYearId || "",
      actionDescription,
      assignedToRole || "STUDENT",
      assignedToName || caller.actorName || null,
      deadline ? new Date(deadline).toISOString() : defaultDeadline,
      evidenceNotes || null,
      caller.userId
    )

    await appendAdvisoryAuditLog({
      studentId: rel.student.id,
      actorId: caller.userId,
      actorRole: caller.actorRole,
      actorName: caller.actorName,
      entityType: "ACTION_ITEM",
      entityId: id,
      action: "CREATE_ACTION_ITEM",
      privacyTier: "SHARED_EDUCATIONAL",
      summary: `Thêm hành động 7 ngày: ${actionDescription}`,
      changes: { actionDescription, assignedToRole: assignedToRole || "STUDENT", deadline }
    })

    return jsonResponse({
      success: true,
      id,
      message: "Đã thêm kế hoạch hành động 7 ngày thành công!"
    })
  } catch (error: any) {
    console.error("POST /api/advisory/action-items error:", error)
    return jsonResponse({ error: error.message || "Server error" }, 500)
  }
}

// PATCH: Cập nhật trạng thái hoàn thành hoặc đính kèm minh chứng (HS / GV / PHHS)
export async function PATCH(req: Request) {
  try {
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Unauthorized" }, 401)
    }

    await ensureActionItemsTable()
    const body = await req.json()
    const { id, status, evidenceNotes, deadline } = body

    if (!id) return jsonResponse({ error: "Thiếu id" }, 400)

    if (id.startsWith("goalact-")) {
      const rawActId = id.replace("goalact-", "")
      const act = await prisma.studentGoalAction
        .findUnique({
          where: { id: rawActId },
          include: { goal: true }
        })
        .catch(() => null)

      if (!act) {
        return jsonResponse({ error: "Không tìm thấy hành động mục tiêu" }, 404)
      }

      const rel = await verifyStudentRelationship(caller, act.goal.studentId)
      if (!rel.allowed) {
        return jsonResponse({ error: rel.reason || "Forbidden" }, 403)
      }

      const mappedStatus =
        status === "COMPLETED" || status === "DONE"
          ? "DONE"
          : status === "IN_PROGRESS" || status === "DOING"
          ? "DOING"
          : "PENDING"

      await prisma.studentGoalAction.update({
        where: { id: rawActId },
        data: { status: mappedStatus }
      })

      await upsertRecordPolicy({
        entityType: "GOAL_ACTION",
        entityId: rawActId,
        studentId: act.goal.studentId,
        academicYearId: act.goal.academicYearId,
        privacyTier: "SHARED_EDUCATIONAL",
        shareWithParent: true,
        evidenceNotes: evidenceNotes ?? undefined,
        updatedById: caller.userId,
        updatedByRole: caller.actorRole
      })

      await appendAdvisoryAuditLog({
        studentId: act.goal.studentId,
        actorId: caller.userId,
        actorRole: caller.actorRole,
        actorName: caller.actorName,
        entityType: "GOAL_ACTION",
        entityId: rawActId,
        action: "UPDATE_GOAL_ACTION",
        privacyTier: "SHARED_EDUCATIONAL",
        summary: `Cập nhật nhật ký hành động & minh chứng (${mappedStatus})`,
        changes: { status: mappedStatus, evidenceNotes }
      })

      return jsonResponse({
        success: true,
        message: "Đã cập nhật tiến độ hành động và lưu minh chứng!"
      })
    }

    if (id.startsWith("cons-")) {
      const consId = id.replace("cons-", "")
      const cons = await prisma.academicConsultationLog
        .findUnique({ where: { id: consId } })
        .catch(() => null)
      if (!cons) {
        return jsonResponse({ error: "Không tìm thấy biên bản tư vấn" }, 404)
      }

      const rel = await verifyStudentRelationship(caller, cons.studentId)
      if (!rel.allowed) {
        return jsonResponse({ error: rel.reason || "Forbidden" }, 403)
      }

      await prisma.academicConsultationLog.update({
        where: { id: consId },
        data: {
          status: status === "COMPLETED" ? "COMPLETED" : "PENDING",
          deadline: deadline ? new Date(deadline) : undefined
        }
      })

      if (evidenceNotes !== undefined) {
        await upsertRecordPolicy({
          entityType: "GOAL_ACTION",
          entityId: `cons-${consId}`,
          studentId: cons.studentId,
          academicYearId: cons.academicYearId,
          privacyTier: "SHARED_EDUCATIONAL",
          shareWithParent: true,
          evidenceNotes,
          updatedById: caller.userId,
          updatedByRole: caller.actorRole
        })
      }

      return jsonResponse({
        success: true,
        message: "Đã cập nhật trạng thái hành động sau buổi tư vấn!"
      })
    }

    const isCompleted = status === "COMPLETED"
    await prisma.$executeRawUnsafe(
      `UPDATE "AdvisoryActionItem" SET
        "status" = COALESCE(?, "status"),
        "evidenceNotes" = COALESCE(?, "evidenceNotes"),
        "deadline" = COALESCE(?, "deadline"),
        "completedAt" = CASE WHEN ? = 'COMPLETED' THEN CURRENT_TIMESTAMP ELSE "completedAt" END,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ?`,
      status || null,
      evidenceNotes || null,
      deadline ? new Date(deadline).toISOString() : null,
      isCompleted ? "COMPLETED" : "TODO",
      id
    )

    return jsonResponse({
      success: true,
      message: "Đã cập nhật thành công hành động và minh chứng!"
    })
  } catch (error: any) {
    console.error("PATCH /api/advisory/action-items error:", error)
    return jsonResponse({ error: error.message || "Server error" }, 500)
  }
}
