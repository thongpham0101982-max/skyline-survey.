import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { ensureTeachingPlanSchema } from "@/lib/teaching-plan/schemaInit"
import { getTeachingPlanAuthContext } from "@/lib/teaching-plan/rbac"
import { createDraftFromPublished } from "@/lib/teaching-plan/service"
import { handleTeachingPlanError } from "../../_helpers"

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ planId: string }> }
) {
  try {
    const ctx = await getTeachingPlanAuthContext()
    await ensureTeachingPlanSchema()
    const { planId } = await context.params

    const versions = (await prisma.$queryRawUnsafe(
      `SELECT * FROM "teaching_plan_versions" WHERE "planId" = ? ORDER BY "versionNumber" DESC`,
      planId
    )) as any[]

    const logs = (await prisma.$queryRawUnsafe(
      `SELECT * FROM "teaching_plan_audit_logs" WHERE "planId" = ? ORDER BY "createdAt" DESC LIMIT 50`,
      planId
    )) as any[]

    return NextResponse.json({
      success: true,
      versions: ctx.isTeacherOnly
        ? versions.filter((v) => v.status === "PUBLISHED")
        : versions,
      logs: ctx.isTeacherOnly ? [] : logs,
    })
  } catch (err) {
    return handleTeachingPlanError(err)
  }
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ planId: string }> }
) {
  try {
    const ctx = await getTeachingPlanAuthContext()
    const { planId } = await context.params
    const detail = await createDraftFromPublished(planId, ctx)
    return NextResponse.json({ success: true, ...detail }, { status: 201 })
  } catch (err) {
    return handleTeachingPlanError(err)
  }
}
