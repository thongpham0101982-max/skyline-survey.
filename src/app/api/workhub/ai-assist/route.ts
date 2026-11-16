import { NextRequest, NextResponse } from "next/server"
import {
  requireWorkHubActor,
  WorkHubForbiddenError,
  WorkHubValidationError,
} from "@/lib/workhub/permissions"
import { listScopedWorkHubTasks } from "@/lib/workhub/taskEngine"
import { buildLiveReportSnapshot } from "@/lib/workhub/reportEngine"
import { generateWorkHubAiReportAssist } from "@/lib/workhub/dashboardAndAiEngine"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const actor = await requireWorkHubActor()
    const body = await req.json().catch(() => ({}))

    const reportScope = body.reportScope || "INDIVIDUAL"
    const periodType = body.periodType || "WEEKLY"
    const year = Number(body.year) || new Date().getFullYear()
    const month = Number(body.month) || new Date().getMonth() + 1
    const weekNumber = body.weekNumber ? Number(body.weekNumber) : 1

    const [snapshot, scopedTasks] = await Promise.all([
      buildLiveReportSnapshot(actor, {
        reportScope,
        periodType,
        year,
        month,
        weekNumber,
        departmentId: body.departmentId || actor.primaryDepartmentId,
        campusId: body.campusId || actor.primaryCampusId,
        academicYearId: body.academicYearId || undefined,
      }),
      listScopedWorkHubTasks(actor, {
        departmentId: reportScope === "DEPARTMENT" ? body.departmentId || actor.primaryDepartmentId || undefined : undefined,
        campusId: reportScope === "CAMPUS" ? body.campusId || actor.primaryCampusId || undefined : undefined,
        userId: reportScope === "INDIVIDUAL" ? actor.userId : undefined,
      }),
    ])

    const assist = await generateWorkHubAiReportAssist({
      actor,
      snapshot,
      scopedTasks,
      currentDraft: {
        executiveCommentary: String(body.executiveCommentary || ""),
        blockersAndCauses: String(body.blockersAndCauses || ""),
        supportRequests: String(body.supportRequests || ""),
        nextPeriodPlan: String(body.nextPeriodPlan || ""),
      },
    })

    return NextResponse.json({
      success: true,
      ...assist,
    })
  } catch (err: any) {
    if (err instanceof WorkHubForbiddenError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 403 })
    }
    if (err instanceof WorkHubValidationError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 400 })
    }
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi xử lý AI hỗ trợ báo cáo." },
      { status: 500 }
    )
  }
}
