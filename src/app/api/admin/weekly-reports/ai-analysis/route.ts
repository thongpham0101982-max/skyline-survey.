import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  computeWeeksOfMonthSync,
  getWeeklyItemMetaMap,
  isUserAuthorizedForKtdbclWeeklyReports,
  resolveCurrentWeekInMonth,
  resolveKtdbclRoster,
} from "@/lib/qa-workspace/weeklyReportSchema"
import { generateKtdbclAiQualityReport } from "@/lib/qa-workspace/weeklyAiQualityAgent"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 })
    }
    const isAllowed = await isUserAuthorizedForKtdbclWeeklyReports(
      String(session.user.id),
      String((session.user as any).role || "")
    )
    if (!isAllowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Chức năng Báo cáo Tuần chỉ áp dụng riêng cho Bộ phận / Tổ chuyên môn Ban KT&ĐBCL, không áp dụng cho các Tổ khác.",
        },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const scopeType: "WEEKLY" | "MONTHLY" =
      String(body.scopeType || "WEEKLY").toUpperCase() === "MONTHLY" ? "MONTHLY" : "WEEKLY"

    const currentPeriod = resolveCurrentWeekInMonth(new Date())
    const month = Number(body.month) || currentPeriod.month
    const year = Number(body.year) || currentPeriod.year
    const weekNumber =
      scopeType === "WEEKLY" ? Number(body.weekNumber) || currentPeriod.weekNumber : null
    const useCache = Boolean(body.useCache)

    const roster = await resolveKtdbclRoster()
    const memberIds = roster.members.map((m) => m.id)
    const allWeeks = computeWeeksOfMonthSync(month, year)
    const expectedWeeksCount =
      scopeType === "WEEKLY"
        ? 1
        : Math.max(
            1,
            currentPeriod.year === year && currentPeriod.month === month
              ? Math.min(allWeeks.length, currentPeriod.weekNumber)
              : allWeeks.length
          )

    const [reports, taskCategories, workTasks] = await Promise.all([
      prisma.weeklyReport.findMany({
        where: {
          month,
          year,
          ...(scopeType === "WEEKLY" && weekNumber ? { weekNumber } : {}),
          ...(memberIds.length > 0 ? { userId: { in: memberIds } } : {}),
        },
        include: { items: { orderBy: { createdAt: "asc" } } },
        orderBy: [{ weekNumber: "asc" }, { createdAt: "asc" }],
      }),
      prisma.taskCategory.findMany({ orderBy: { name: "asc" } }),
      prisma.workTask.findMany({
        where: memberIds.length > 0 ? { assignedToUserId: { in: memberIds } } : {},
        select: {
          id: true,
          assignedToUserId: true,
          progress: true,
          endDate: true,
          taskGroup: { select: { name: true } },
        },
      }),
    ])

    const allItemIds = reports.flatMap((r) => r.items.map((i) => i.id))
    const itemMetaMap = await getWeeklyItemMetaMap(allItemIds)
    const categoryWeights = new Map<string, number>()
    taskCategories.forEach((c) => categoryWeights.set(c.name.trim().toLowerCase(), c.weight || 1.0))

    const actorName = (session.user as any).name || (session.user as any).fullName || "Người dùng"
    const aiReport = await generateKtdbclAiQualityReport({
      scopeType,
      weekNumber,
      month,
      year,
      expectedWeeksCount,
      members: roster.members,
      taskGroupNames: roster.taskGroups.map((g) => g.name),
      reports: reports as any,
      itemMetaMap,
      workTasks: workTasks.map((w) => ({
        id: w.id,
        assignedToUserId: w.assignedToUserId,
        taskGroupName: w.taskGroup?.name || null,
        progress: w.progress,
        endDate: w.endDate,
      })),
      categoryWeights,
      useCache,
      actorName,
    })

    return NextResponse.json({
      success: true,
      aiReport,
    })
  } catch (err: any) {
    console.error("[AI Quality Analysis API Error]:", err)
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi phân tích AI Agent" },
      { status: 500 }
    )
  }
}
