import { NextRequest, NextResponse } from "next/server"
import { getTeachingPlanAuthContext, TeachingPlanAccessError } from "@/lib/teaching-plan/rbac"
import { transitionVersionWorkflow } from "@/lib/teaching-plan/service"
import { handleTeachingPlanError } from "../../../_helpers"

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ versionId: string }> }
) {
  try {
    const ctx = await getTeachingPlanAuthContext()
    const { versionId } = await context.params
    const body = await req.json()
    const action = String(body.action || "").toUpperCase()

    if (action !== "SUBMIT" && action !== "REQUEST_CHANGES" && action !== "PUBLISH") {
      throw new TeachingPlanAccessError("Thao tác duyệt không hợp lệ.", "VALIDATION_ERROR", 400)
    }

    const result = await transitionVersionWorkflow({
      versionId,
      action,
      comment: body.comment ? String(body.comment) : undefined,
      periodReplacements: body.periodReplacements || undefined,
      confirmedAssessmentLessonIds: Array.isArray(body.confirmedAssessmentLessonIds)
        ? body.confirmedAssessmentLessonIds
        : undefined,
      ctx,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return handleTeachingPlanError(err)
  }
}
