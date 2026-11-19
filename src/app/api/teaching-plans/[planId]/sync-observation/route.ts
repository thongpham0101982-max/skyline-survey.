import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/db"
import { ensureTeachingPlanSchema } from "@/lib/teaching-plan/schemaInit"
import {
  assertCanManagePlan,
  getTeachingPlanAuthContext,
  TeachingPlanAccessError,
} from "@/lib/teaching-plan/rbac"
import { handleTeachingPlanError } from "../../_helpers"

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ planId: string }> }
) {
  try {
    const ctx = await getTeachingPlanAuthContext()
    await ensureTeachingPlanSchema()
    const { planId } = await context.params
    const body = await req.json()
    const enabled = Boolean(body.enabled)

    const rows = (await prisma.$queryRawUnsafe(
      `SELECT * FROM "teaching_plans" WHERE "id" = ? LIMIT 1`,
      planId
    )) as any[]
    if (!rows[0]) {
      throw new TeachingPlanAccessError("Không tìm thấy Kế hoạch dạy học.", "NOT_FOUND", 404)
    }

    const plan = rows[0]
    assertCanManagePlan(
      ctx,
      plan.scopeType === "CAMPUS" ? "CAMPUS" : "SYSTEM",
      plan.campusId ? String(plan.campusId) : null
    )

    if (enabled && !plan.activePublishedVersionId) {
      throw new TeachingPlanAccessError(
        "Chỉ có thể đồng bộ qua chủ đề Dự giờ sau khi Kế hoạch dạy học đã được công bố.",
        "VALIDATION_ERROR",
        400
      )
    }

    await prisma.$transaction(async (tx) => {
      if (enabled) {
        await tx.$executeRawUnsafe(
          `UPDATE "teaching_plans"
           SET "syncToObservation" = 1,
               "syncedToObservationAt" = CURRENT_TIMESTAMP,
               "syncedToObservationByName" = ?,
               "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = ?`,
          ctx.actorName,
          planId
        )
      } else {
        await tx.$executeRawUnsafe(
          `UPDATE "teaching_plans"
           SET "syncToObservation" = 0,
               "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = ?`,
          planId
        )
      }

      await tx.$executeRawUnsafe(
        `INSERT INTO "teaching_plan_audit_logs" ("id", "planId", "versionId", "action", "actorId", "actorName", "detailsJson")
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        `tpal_${crypto.randomBytes(9).toString("hex")}`,
        planId,
        plan.activePublishedVersionId ? String(plan.activePublishedVersionId) : null,
        enabled ? "SYNC_TO_OBSERVATION" : "UNSYNC_FROM_OBSERVATION",
        ctx.userId,
        ctx.actorName,
        JSON.stringify({ enabled })
      )
    })

    return NextResponse.json({
      success: true,
      planId,
      syncToObservation: enabled,
    })
  } catch (err) {
    return handleTeachingPlanError(err)
  }
}
