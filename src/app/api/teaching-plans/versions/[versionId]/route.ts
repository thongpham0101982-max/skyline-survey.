import { NextRequest, NextResponse } from "next/server"
import { getTeachingPlanAuthContext, TeachingPlanAccessError } from "@/lib/teaching-plan/rbac"
import { getVersionDetail, mutateDraftVersion } from "@/lib/teaching-plan/service"
import { handleTeachingPlanError } from "../../_helpers"

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ versionId: string }> }
) {
  try {
    const ctx = await getTeachingPlanAuthContext()
    const { versionId } = await context.params
    const detail = await getVersionDetail(versionId)

    if (ctx.isTeacherOnly && detail.version.status !== "PUBLISHED") {
      throw new TeachingPlanAccessError(
        "Giáo viên chỉ được xem phiên bản kế hoạch dạy học đã công bố.",
        "FORBIDDEN",
        403
      )
    }

    return NextResponse.json({ success: true, ...detail })
  } catch (err) {
    return handleTeachingPlanError(err)
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ versionId: string }> }
) {
  try {
    const ctx = await getTeachingPlanAuthContext()
    const { versionId } = await context.params
    const body = await req.json()

    if (body.expectedRevision === undefined) {
      throw new TeachingPlanAccessError(
        "Thiếu thông tin phiên bản chỉnh sửa (expectedRevision) để kiểm tra xung đột.",
        "VALIDATION_ERROR",
        400
      )
    }

    const updated = await mutateDraftVersion({
      versionId,
      expectedRevision: Number(body.expectedRevision),
      operation: body.operation,
      ctx,
    })

    return NextResponse.json({ success: true, ...updated })
  } catch (err) {
    return handleTeachingPlanError(err)
  }
}
