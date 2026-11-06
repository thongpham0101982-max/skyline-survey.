import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  ensureTriPartyTables,
  appendAdvisoryAuditLog
} from "@/lib/advisory/triparty-sync"
import {
  resolveAdvisoryCaller,
  verifyStudentRelationship
} from "@/lib/advisory/rbac-guard"

export const dynamic = "force-dynamic"

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  return res
}

export async function GET(req: Request) {
  try {
    await ensureTriPartyTables()
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Chưa đăng nhập" }, 401)
    }

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId") || caller.studentId || ""
    const academicYearId = searchParams.get("academicYearId") || ""

    if (!studentId) {
      return jsonResponse({ error: "Thiếu studentId" }, 400)
    }

    const rel = await verifyStudentRelationship(caller, studentId)
    if (!rel.allowed) {
      return jsonResponse({ error: rel.reason || "Không có quyền xem dữ liệu mục tiêu" }, 403)
    }

    const allIds = rel.allStudentIds.length > 0 ? rel.allStudentIds : [rel.student.id]
    const placeholders = allIds.map(() => "?").join(",")

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "StudentGoalMeta"
       WHERE "studentId" IN (${placeholders})
       ${academicYearId ? `AND ("academicYearId" = ? OR "academicYearId" = '')` : ""}`,
      ...(academicYearId ? [...allIds, academicYearId] : [...allIds])
    )

    const metaMap: Record<string, any> = {}
    for (const r of rows) {
      let history: any[] = []
      try {
        history = r.historyJson ? JSON.parse(r.historyJson) : []
      } catch {}
      metaMap[r.goalId] = {
        ...r,
        history
      }
    }

    return jsonResponse({ metaMap })
  } catch (error: any) {
    console.error("GET /api/advisory/goal-meta error:", error)
    return jsonResponse({ error: error.message || "Lỗi tải thông tin mở rộng mục tiêu" }, 500)
  }
}

export async function POST(req: Request) {
  try {
    await ensureTriPartyTables()
    const caller = await resolveAdvisoryCaller()
    if (!caller.authenticated) {
      return jsonResponse({ error: "Chưa đăng nhập" }, 401)
    }

    const body = await req.json()
    const {
      goalId,
      studentId,
      academicYearId = "",
      term = "HK1",
      targetText,
      basisText,
      baselineValue,
      targetValue,
      deadlineDate,
      actionPlanText,
      assigneeName,
      updateMilestone,
      currentResultText,
      evidenceText,
      companionTeacherId,
      companionTeacherName,
      advisorComment,
      nextStepNote,
      progressOutcome = "INSUFFICIENT_DATA",
      evaluatedTerm = "HK1"
    } = body

    if (!goalId || !studentId) {
      return jsonResponse({ error: "Thiếu goalId hoặc studentId" }, 400)
    }

    const rel = await verifyStudentRelationship(caller, studentId)
    if (!rel.allowed) {
      return jsonResponse({ error: rel.reason || "Không có quyền cập nhật mục tiêu" }, 403)
    }

    const existingRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "StudentGoalMeta" WHERE "goalId" = ? LIMIT 1`,
      goalId
    )
    const existing = existingRows[0]
    let history: any[] = []
    try {
      history = existing?.historyJson ? JSON.parse(existing.historyJson) : []
    } catch {}

    // Track history when goal targetText, deadlineDate, targetValue, or progressOutcome is adjusted
    const changedFields: string[] = []
    if (existing) {
      if (targetValue !== undefined && targetValue !== existing.targetValue) {
        changedFields.push(`Mức cần đạt: "${existing.targetValue || "—"}" → "${targetValue}"`)
      }
      if (deadlineDate !== undefined && deadlineDate !== existing.deadlineDate) {
        changedFields.push(`Thời hạn: "${existing.deadlineDate || "—"}" → "${deadlineDate}"`)
      }
      if (currentResultText !== undefined && currentResultText !== existing.currentResultText) {
        changedFields.push(`Kết quả hiện tại: "${existing.currentResultText || "—"}" → "${currentResultText}"`)
      }
      if (progressOutcome !== undefined && progressOutcome !== existing.progressOutcome) {
        changedFields.push(`Kết quả tiến bộ: "${existing.progressOutcome || "—"}" → "${progressOutcome}"`)
      }
    } else {
      changedFields.push("Khởi tạo chỉ số mức ban đầu, mức cần đạt và lộ trình theo dõi")
    }

    if (changedFields.length > 0) {
      history.unshift({
        id: `hist_${Date.now()}`,
        actorId: caller.userId,
        actorName: caller.actorName || "GVCN / CVHT",
        actorRole: caller.actorRole,
        term: evaluatedTerm || term,
        changes: changedFields,
        timestamp: new Date().toISOString()
      })
    }

    // Update targetText on StudentGoal if modified
    if (targetText && String(targetText).trim()) {
      await prisma.studentGoal
        .update({
          where: { id: goalId },
          data: {
            targetText: String(targetText).trim(),
            ...(advisorComment !== undefined ? { teacherComment: advisorComment } : {})
          }
        })
        .catch(() => {})
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO "StudentGoalMeta" (
        "goalId", "studentId", "academicYearId", "term",
        "basisText", "baselineValue", "targetValue", "deadlineDate",
        "actionPlanText", "assigneeName", "updateMilestone",
        "currentResultText", "evidenceText", "progressUpdatedAt",
        "companionTeacherId", "companionTeacherName",
        "advisorComment", "nextStepNote", "progressOutcome",
        "evaluatedById", "evaluatedByName", "evaluatedTerm",
        "historyJson", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT("goalId") DO UPDATE SET
        "term" = COALESCE(excluded."term", "StudentGoalMeta"."term"),
        "basisText" = COALESCE(excluded."basisText", "StudentGoalMeta"."basisText"),
        "baselineValue" = COALESCE(excluded."baselineValue", "StudentGoalMeta"."baselineValue"),
        "targetValue" = COALESCE(excluded."targetValue", "StudentGoalMeta"."targetValue"),
        "deadlineDate" = COALESCE(excluded."deadlineDate", "StudentGoalMeta"."deadlineDate"),
        "actionPlanText" = COALESCE(excluded."actionPlanText", "StudentGoalMeta"."actionPlanText"),
        "assigneeName" = COALESCE(excluded."assigneeName", "StudentGoalMeta"."assigneeName"),
        "updateMilestone" = COALESCE(excluded."updateMilestone", "StudentGoalMeta"."updateMilestone"),
        "currentResultText" = COALESCE(excluded."currentResultText", "StudentGoalMeta"."currentResultText"),
        "evidenceText" = COALESCE(excluded."evidenceText", "StudentGoalMeta"."evidenceText"),
        "progressUpdatedAt" = CURRENT_TIMESTAMP,
        "companionTeacherId" = COALESCE(excluded."companionTeacherId", "StudentGoalMeta"."companionTeacherId"),
        "companionTeacherName" = COALESCE(excluded."companionTeacherName", "StudentGoalMeta"."companionTeacherName"),
        "advisorComment" = COALESCE(excluded."advisorComment", "StudentGoalMeta"."advisorComment"),
        "nextStepNote" = COALESCE(excluded."nextStepNote", "StudentGoalMeta"."nextStepNote"),
        "progressOutcome" = COALESCE(excluded."progressOutcome", "StudentGoalMeta"."progressOutcome"),
        "evaluatedById" = excluded."evaluatedById",
        "evaluatedByName" = excluded."evaluatedByName",
        "evaluatedTerm" = excluded."evaluatedTerm",
        "historyJson" = excluded."historyJson",
        "updatedAt" = CURRENT_TIMESTAMP`,
      goalId,
      rel.student.id,
      academicYearId || rel.student.academicYearId || "",
      term,
      basisText ?? null,
      baselineValue ?? null,
      targetValue ?? null,
      deadlineDate ?? null,
      actionPlanText ?? null,
      assigneeName ?? null,
      updateMilestone ?? null,
      currentResultText ?? null,
      evidenceText ?? null,
      companionTeacherId ?? null,
      companionTeacherName ?? null,
      advisorComment ?? null,
      nextStepNote ?? null,
      progressOutcome || "INSUFFICIENT_DATA",
      caller.teacherId || caller.userId,
      caller.actorName || "GVCN / CVHT",
      evaluatedTerm || term,
      JSON.stringify(history.slice(0, 30))
    )

    await appendAdvisoryAuditLog({
      studentId: rel.student.id,
      actorId: caller.userId,
      actorRole: caller.actorRole,
      actorName: caller.actorName,
      entityType: "GOAL",
      entityId: goalId,
      action: "UPDATE_GOAL_PROGRESS_META",
      privacyTier: "SHARED_EDUCATIONAL",
      summary: `Cập nhật tiến bộ & kế hoạch mục tiêu (${changedFields.join("; ")})`
    })

    return jsonResponse({
      success: true,
      history
    })
  } catch (error: any) {
    console.error("POST /api/advisory/goal-meta error:", error)
    return jsonResponse({ error: error.message || "Không thể lưu cập nhật mục tiêu" }, 500)
  }
}
