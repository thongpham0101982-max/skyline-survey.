import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  canActorViewTask,
  requireWorkHubActor,
  WorkHubForbiddenError,
  WorkHubValidationError,
} from "@/lib/workhub/permissions"
import {
  createRecurrenceTemplateAndGenerateInstance,
  createWorkHubTask,
  executeWorkHubTaskTransition,
  generateTaskForRecurrencePeriod,
  getWorkHubTaskHistory,
  listScopedRecurrenceTemplates,
  listScopedWorkHubTasks,
} from "@/lib/workhub/taskEngine"
import {
  createWorkHubPlan,
  getWorkHubPlanVersions,
  listScopedWorkHubPlans,
  updateOrApproveWorkHubPlan,
} from "@/lib/workhub/planEngine"
import {
  buildLiveReportSnapshot,
  getWorkHubReportVersions,
  listScopedWorkHubReports,
  reviewOrReviseWorkHubReport,
  saveOrSubmitWorkHubReport,
} from "@/lib/workhub/reportEngine"
import {
  evaluateTargetWorkHubKpis,
  listWorkHubKpiDefinitions,
  recordOrConfirmKpiEvaluation,
  saveWorkHubKpiDefinition,
} from "@/lib/workhub/kpiEngine"
import {
  buildWorkHubDashboardData,
  dispatchWorkHubDigestReminders,
  getWorkHubReminderSettings,
  saveWorkHubReminderSettings,
} from "@/lib/workhub/dashboardAndAiEngine"

export const dynamic = "force-dynamic"

function handleWorkHubApiError(err: any) {
  if (err instanceof WorkHubForbiddenError) {
    return NextResponse.json({ success: false, error: err.message }, { status: 403 })
  }
  if (err instanceof WorkHubValidationError) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 })
  }
  console.error("[WorkHub API Error]:", err)
  return NextResponse.json(
    { success: false, error: err?.message || "Lỗi máy chủ khi xử lý yêu cầu WorkHub." },
    { status: 500 }
  )
}

export async function GET(req: NextRequest) {
  try {
    const actor = await requireWorkHubActor()
    const sp = req.nextUrl.searchParams
    const resource = (sp.get("resource") || "dashboard").toLowerCase()

    if (resource === "actor") {
      return NextResponse.json({ success: true, actor })
    }

    if (resource === "dashboard" || resource === "org-tracking") {
      if (resource === "org-tracking" && !actor.canViewOrgTracking) {
        throw new WorkHubForbiddenError(
          "Chức năng Theo dõi phòng ban/cơ sở chỉ dành cho Trưởng bộ phận, Giám đốc Cơ sở và Ban điều hành."
        )
      }
      const data = await buildWorkHubDashboardData(actor, {
        academicYearId: sp.get("academicYearId") || undefined,
        periodType: (sp.get("periodType") as any) || "MONTHLY",
        year: sp.get("year") ? Number(sp.get("year")) : undefined,
        month: sp.get("month") ? Number(sp.get("month")) : undefined,
        weekNumber: sp.get("weekNumber") ? Number(sp.get("weekNumber")) : undefined,
        campusId: sp.get("campusId") || undefined,
        departmentId: sp.get("departmentId") || undefined,
        userId: sp.get("userId") || undefined,
        status: sp.get("status") || undefined,
      })
      return NextResponse.json({ success: true, data })
    }

    if (resource === "tasks") {
      const [tasks, plans, kpis, users, departments, campuses, academicYears, recurrenceTemplates] =
        await Promise.all([
          listScopedWorkHubTasks(actor, {
            viewMode: (sp.get("viewMode") as any) || "ALL_SCOPED",
            academicYearId: sp.get("academicYearId") || undefined,
            campusId: sp.get("campusId") || undefined,
            departmentId: sp.get("departmentId") || undefined,
            userId: sp.get("userId") || undefined,
            planId: sp.get("planId") || undefined,
            status: sp.get("status") || undefined,
            search: sp.get("search") || undefined,
          }),
          listScopedWorkHubPlans(actor),
          listWorkHubKpiDefinitions(actor, { activeOnly: true }),
          prisma.user.findMany({
            where: {
              status: "ACTIVE",
              role: { not: "PARENT" },
              ...(actor.scopedUserIds !== null ? { id: { in: actor.scopedUserIds } } : {}),
            },
            select: { id: true, fullName: true, role: true },
            orderBy: { fullName: "asc" },
          }),
          prisma.department.findMany({
            where: { status: "ACTIVE" },
            select: { id: true, code: true, name: true },
            orderBy: { name: "asc" },
          }),
          prisma.campus.findMany({
            select: { id: true, campusCode: true, campusName: true },
            orderBy: { campusName: "asc" },
          }),
          prisma.academicYear.findMany({
            orderBy: { startDate: "desc" },
            select: { id: true, name: true, isOff: true },
          }),
          listScopedRecurrenceTemplates(actor),
        ])

      return NextResponse.json({
        success: true,
        actor,
        tasks,
        plans,
        kpis,
        users,
        departments,
        campuses,
        academicYears,
        recurrenceTemplates,
      })
    }

    if (resource === "task-detail") {
      const taskId = sp.get("taskId") || ""
      const scoped = await listScopedWorkHubTasks(actor)
      const found = scoped.find((t) => t.id === taskId)
      if (!found) throw new WorkHubForbiddenError("Không tìm thấy hoặc không có quyền xem công việc này.")

      const [history, comments, attachments] = await Promise.all([
        getWorkHubTaskHistory(taskId),
        prisma.taskComment.findMany({
          where: { taskId },
          include: { user: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: "desc" },
        }),
        prisma.taskAttachment.findMany({
          where: { taskId },
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            contentType: true,
            createdAt: true,
            user: { select: { fullName: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
      ])

      return NextResponse.json({
        success: true,
        task: found,
        history,
        comments,
        attachments,
      })
    }

    if (resource === "plans") {
      const [plans, users, departments, campuses, academicYears] = await Promise.all([
        listScopedWorkHubPlans(actor, {
          academicYearId: sp.get("academicYearId") || undefined,
          periodType: sp.get("periodType") || undefined,
          departmentId: sp.get("departmentId") || undefined,
          campusId: sp.get("campusId") || undefined,
          status: sp.get("status") || undefined,
        }),
        prisma.user.findMany({
          where: {
            status: "ACTIVE",
            role: { not: "PARENT" },
            ...(actor.scopedUserIds !== null ? { id: { in: actor.scopedUserIds } } : {}),
          },
          select: { id: true, fullName: true },
          orderBy: { fullName: "asc" },
        }),
        prisma.department.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        prisma.campus.findMany({
          select: { id: true, campusName: true },
          orderBy: { campusName: "asc" },
        }),
        prisma.academicYear.findMany({
          orderBy: { startDate: "desc" },
          select: { id: true, name: true, isOff: true },
        }),
      ])
      return NextResponse.json({
        success: true,
        actor,
        plans,
        users,
        departments,
        campuses,
        academicYears,
      })
    }

    if (resource === "plan-versions") {
      const planId = sp.get("planId") || ""
      const versions = await getWorkHubPlanVersions(actor, planId)
      return NextResponse.json({ success: true, versions })
    }

    if (resource === "reports") {
      const [reports, departments, campuses, academicYears] = await Promise.all([
        listScopedWorkHubReports(actor, {
          reportScope: sp.get("reportScope") || undefined,
          periodType: sp.get("periodType") || undefined,
          year: sp.get("year") ? Number(sp.get("year")) : undefined,
          month: sp.get("month") ? Number(sp.get("month")) : undefined,
          departmentId: sp.get("departmentId") || undefined,
          campusId: sp.get("campusId") || undefined,
          status: sp.get("status") || undefined,
        }),
        prisma.department.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        prisma.campus.findMany({
          select: { id: true, campusName: true },
          orderBy: { campusName: "asc" },
        }),
        prisma.academicYear.findMany({
          orderBy: { startDate: "desc" },
          select: { id: true, name: true, isOff: true },
        }),
      ])
      return NextResponse.json({
        success: true,
        actor,
        reports,
        departments,
        campuses,
        academicYears,
      })
    }

    if (resource === "report-preview") {
      const reportScope = (sp.get("reportScope") as any) || "INDIVIDUAL"
      const periodType = (sp.get("periodType") as any) || "WEEKLY"
      const year = Number(sp.get("year")) || new Date().getFullYear()
      const month = Number(sp.get("month")) || new Date().getMonth() + 1
      const weekNumber = sp.get("weekNumber") ? Number(sp.get("weekNumber")) : 1

      const snapshot = await buildLiveReportSnapshot(actor, {
        reportScope,
        periodType,
        year,
        month,
        weekNumber,
        departmentId: sp.get("departmentId") || actor.primaryDepartmentId,
        campusId: sp.get("campusId") || actor.primaryCampusId,
        academicYearId: sp.get("academicYearId") || undefined,
      })
      return NextResponse.json({ success: true, snapshot })
    }

    if (resource === "report-versions") {
      const reportId = sp.get("reportId") || ""
      const versions = await getWorkHubReportVersions(actor, reportId)
      return NextResponse.json({ success: true, versions })
    }

    if (resource === "kpis") {
      const targetScope = (sp.get("targetScope") as any) || "INDIVIDUAL"
      const targetEntityId =
        sp.get("targetEntityId") ||
        (targetScope === "INDIVIDUAL"
          ? actor.userId
          : targetScope === "DEPARTMENT"
          ? actor.primaryDepartmentId || ""
          : actor.primaryCampusId || "")

      const year = Number(sp.get("year")) || new Date().getFullYear()
      const month = Number(sp.get("month")) || new Date().getMonth() + 1
      const periodKey = `${year}-M${String(month).padStart(2, "0")}`
      const periodLabel = `Tháng ${month}/${year}`
      const periodStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)).toISOString()
      const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59)).toISOString()

      const [definitions, users, departments, campuses] = await Promise.all([
        listWorkHubKpiDefinitions(actor),
        prisma.user.findMany({
          where: {
            status: "ACTIVE",
            role: { not: "PARENT" },
            ...(actor.scopedUserIds !== null ? { id: { in: actor.scopedUserIds } } : {}),
          },
          select: { id: true, fullName: true },
          orderBy: { fullName: "asc" },
        }),
        prisma.department.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        prisma.campus.findMany({
          select: { id: true, campusName: true },
          orderBy: { campusName: "asc" },
        }),
      ])

      const evalData = targetEntityId
        ? await evaluateTargetWorkHubKpis(actor, {
            targetScope,
            targetEntityId,
            periodKey,
            periodLabel,
            periodStart,
            periodEnd,
          })
        : { evaluations: [], scorecard: null }

      return NextResponse.json({
        success: true,
        actor,
        definitions,
        evaluations: evalData.evaluations,
        scorecard: evalData.scorecard,
        users,
        departments,
        campuses,
      })
    }

    if (resource === "settings") {
      if (!actor.canManageSettings && !actor.canManageKpiDefinitions) {
        throw new WorkHubForbiddenError("Bạn không có quyền truy cập trang Cấu hình WorkHub.")
      }
      const [definitions, reminderSettings, categories] = await Promise.all([
        listWorkHubKpiDefinitions(actor),
        getWorkHubReminderSettings(),
        prisma.taskCategory.findMany({ orderBy: { name: "asc" } }),
      ])
      return NextResponse.json({
        success: true,
        actor,
        definitions,
        reminderSettings,
        categories,
      })
    }

    return NextResponse.json({ success: false, error: "Resource không hợp lệ" }, { status: 400 })
  } catch (err) {
    return handleWorkHubApiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireWorkHubActor()
    const body = await req.json().catch(() => ({}))
    const action = String(body.action || "").toUpperCase()

    if (action === "CREATE_TASK") {
      const created = await createWorkHubTask(actor, body.payload)
      return NextResponse.json({ success: true, ...created })
    }

    if (action === "TRANSITION_TASK") {
      const res = await executeWorkHubTaskTransition(actor, body.payload)
      return NextResponse.json({ success: true, ...res })
    }

    if (action === "ADD_TASK_COMMENT") {
      const { taskId, content, commentType } = body.payload || {}
      if (!taskId || !content?.trim()) {
        throw new WorkHubValidationError("Nội dung bình luận không được để trống.")
      }
      const scoped = await listScopedWorkHubTasks(actor)
      const task = scoped.find((t) => t.id === taskId)
      if (!task || !canActorViewTask(actor, task)) {
        throw new WorkHubForbiddenError()
      }
      const created = await prisma.taskComment.create({
        data: {
          taskId,
          userId: actor.userId,
          content: String(content).trim(),
          commentType: commentType || "GENERAL",
        },
      })
      return NextResponse.json({ success: true, commentId: created.id })
    }

    if (action === "ADD_TASK_ATTACHMENT") {
      const { taskId, fileName, fileData, fileSize, contentType } = body.payload || {}
      if (!taskId || !fileName || !fileData) {
        throw new WorkHubValidationError("Thiếu thông tin tệp minh chứng đính kèm.")
      }
      const scoped = await listScopedWorkHubTasks(actor)
      const task = scoped.find((t) => t.id === taskId)
      if (!task) throw new WorkHubForbiddenError()

      const created = await prisma.taskAttachment.create({
        data: {
          taskId,
          userId: actor.userId,
          fileName: String(fileName),
          fileData: String(fileData),
          fileSize: Number(fileSize || 0),
          contentType: String(contentType || "application/octet-stream"),
        },
      })
      return NextResponse.json({ success: true, attachmentId: created.id })
    }

    if (action === "CREATE_RECURRENCE_TEMPLATE") {
      const res = await createRecurrenceTemplateAndGenerateInstance(actor, body.payload)
      return NextResponse.json({ success: true, ...res })
    }

    if (action === "GENERATE_RECURRENCE_PERIOD") {
      const res = await generateTaskForRecurrencePeriod(actor, body.payload)
      return NextResponse.json({ success: true, ...res })
    }

    if (action === "CREATE_PLAN") {
      const res = await createWorkHubPlan(actor, body.payload)
      return NextResponse.json({ success: true, ...res })
    }

    if (action === "UPDATE_OR_APPROVE_PLAN") {
      const res = await updateOrApproveWorkHubPlan(actor, body.payload)
      return NextResponse.json({ success: true, ...res })
    }

    if (action === "SAVE_OR_SUBMIT_REPORT") {
      const res = await saveOrSubmitWorkHubReport(actor, body.payload)
      return NextResponse.json({ success: true, ...res })
    }

    if (action === "REVIEW_OR_REVISE_REPORT") {
      const res = await reviewOrReviseWorkHubReport(actor, body.payload)
      return NextResponse.json({ success: true, ...res })
    }

    if (action === "SAVE_KPI_DEFINITION") {
      const res = await saveWorkHubKpiDefinition(actor, body.payload)
      return NextResponse.json({ success: true, ...res })
    }

    if (action === "RECORD_OR_CONFIRM_KPI") {
      await recordOrConfirmKpiEvaluation(actor, body.payload)
      return NextResponse.json({ success: true })
    }

    if (action === "SAVE_REMINDER_SETTINGS") {
      const res = await saveWorkHubReminderSettings(actor, body.payload)
      return NextResponse.json({ success: true, settings: res })
    }

    if (action === "TRIGGER_DIGEST_REMINDERS") {
      if (!actor.canManageSettings && !actor.isExecutive) {
        throw new WorkHubForbiddenError()
      }
      const res = await dispatchWorkHubDigestReminders({ force: false })
      return NextResponse.json({ success: true, ...res })
    }

    return NextResponse.json({ success: false, error: "Hành động không hợp lệ" }, { status: 400 })
  } catch (err) {
    return handleWorkHubApiError(err)
  }
}
