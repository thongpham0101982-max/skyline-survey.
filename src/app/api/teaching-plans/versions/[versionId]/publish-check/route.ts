import { NextRequest, NextResponse } from "next/server"
import { getTeachingPlanAuthContext } from "@/lib/teaching-plan/rbac"
import { checkVersionBeforePublish } from "@/lib/teaching-plan/service"
import { handleTeachingPlanError } from "../../../_helpers"

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ versionId: string }> }
) {
  try {
    await getTeachingPlanAuthContext()
    const { versionId } = await context.params
    const check = await checkVersionBeforePublish(versionId)
    return NextResponse.json({ success: true, check })
  } catch (err) {
    return handleTeachingPlanError(err)
  }
}
