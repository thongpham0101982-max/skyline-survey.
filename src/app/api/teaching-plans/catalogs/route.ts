import { NextRequest, NextResponse } from "next/server"
import { getTeachingPlanAuthContext } from "@/lib/teaching-plan/rbac"
import { getTeachingPlanCatalogs } from "@/lib/teaching-plan/service"
import { handleTeachingPlanError } from "../_helpers"

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTeachingPlanAuthContext()
    const sp = req.nextUrl.searchParams
    const academicYearId = sp.get("academicYearId") || undefined
    const level = sp.get("level") || undefined
    const grade = sp.get("grade") || undefined

    const data = await getTeachingPlanCatalogs({ academicYearId, level, grade })
    return NextResponse.json({
      success: true,
      ...data,
      permissions: {
        canManage: ctx.canManage,
        canApprove: ctx.canApprove,
        isFullAccess: ctx.isFullAccess,
        allowedCampusIds: ctx.allowedCampusIds,
      },
    })
  } catch (err) {
    return handleTeachingPlanError(err)
  }
}
