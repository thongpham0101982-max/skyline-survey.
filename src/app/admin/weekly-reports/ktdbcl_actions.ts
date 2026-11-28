"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOperationalScope } from "@/lib/session"
import {
  computeWeeksOfMonthSync,
  ensureKtdbclWeeklySchema,
  getKtdbclAutomationConfig,
  getRecentWeeklyAutomationLogs,
  getWeeklyItemMetaMap,
  isKtdbclRoleCode,
  KTDBCL_DEFAULT_GROUPS,
  KtdbclWeeklyAutomationConfig,
  normalizeStaffEmail,
  resolveCurrentWeekInMonth,
  resolveKtdbclRoster,
  saveKtdbclAutomationConfig,
  upsertWeeklyItemMeta,
  WeeklyReportItemMeta,
} from "@/lib/qa-workspace/weeklyReportSchema"
import {
  computeEfficiencyAndQualityMetrics,
  deriveItemQualityScore,
  isReportItemPastDue,
  KtdbclAiQualityReport,
} from "@/lib/qa-workspace/weeklyAiQualityAgent"
import {
  dispatchDirectorSummaryReport,
  dispatchKtdbclSaturdayPlanReminders,
  dispatchKtdbclWednesdayReminders,
  dispatchOverdueAndDoingProgressReminders,
  sendExplanationSubmittedToLeadershipEmail,
  sendOverdueExplanationRequestEmail,
  sendReportItemsCompletedEmail,
} from "@/lib/qa-workspace/weeklyReportEmailService"

export interface EnrichedWeeklyReportItem {
  id: string
  reportId: string
  weekNumber: number
  month: number
  year: number
  userId: string
  userFullName: string
  userPosition: string
  userEmail: string | null
  mainTask: string
  workContent: string
  category: string | null
  taskGroup: string
  expectedCompletion: string | null
  progress: string
  proposedSolution: string | null
  managerNote: string | null
  directorNote: string | null
  directorRating: string | null
  qualityScore: number | null
  computedQualityScore: number
  isOverdue: boolean
  meta: WeeklyReportItemMeta
}

async function resolveCallerAuthority() {
  const session = await auth()
  if (!session?.user?.id) {
    return {
      authenticated: false,
      isAuthorizedKtdbcl: false,
      userId: "",
      userName: "",
      role: "",
      isLeadership: false,
      isDirectorAuthority: false,
    }
  }
  const userId = String(session.user.id)
  const userName = String((session.user as any).name || (session.user as any).fullName || "Quản lý")
  const role = String((session.user as any).role || "STAFF").toUpperCase()
  const opScope = await getOperationalScope()
  const roster = await resolveKtdbclRoster()
  const memberInKt = roster.members.find((m) => m.id === userId)

  // Báo cáo Tuần Giáo viên & Nhân sự CHỈ áp dụng cho BP/Tổ chuyên môn Ban KT&ĐBCL (và Admin hệ thống), KHÔNG áp dụng cho các Tổ khác
  const isAuthorizedKtdbcl = isKtdbclRoleCode(role) || Boolean(memberInKt)

  const isDirectorAuthority =
    isAuthorizedKtdbcl &&
    (opScope.isSuperAdmin ||
      ["ADMIN", "SUPER_ADMIN", "SUPERADMIN"].includes(role) ||
      Boolean(memberInKt?.isDirector))

  const isLeadership =
    isAuthorizedKtdbcl &&
    (isDirectorAuthority ||
      ["KT_DBCL", "KTDBCL", "KHAO_THI", "DBCL"].includes(role) ||
      Boolean(memberInKt?.isManager))

  return {
    authenticated: true,
    isAuthorizedKtdbcl,
    userId,
    userName,
    role,
    isLeadership,
    isDirectorAuthority,
    roster,
  }
}

/**
 * Truy vấn toàn cảnh dữ liệu Báo cáo Tuần & Quản trị Chất lượng gói gọn trong Ban KT&ĐBCL
 */
export async function getKtdbclWorkspaceSnapshot(params?: {
  weekNumber?: number
  month?: number
  year?: number
}) {
  try {
    await ensureKtdbclWeeklySchema()
    const currentPeriod = resolveCurrentWeekInMonth(new Date())
    const year = params?.year || currentPeriod.year
    const month = params?.month || currentPeriod.month
    const allWeeks = computeWeeksOfMonthSync(month, year)
    const weekNumber =
      params?.weekNumber && allWeeks.some((w) => w.weekNum === params.weekNumber)
        ? params.weekNumber
        : currentPeriod.year === year && currentPeriod.month === month
        ? currentPeriod.weekNumber
        : allWeeks[0]?.weekNum || 1

    const [authCtx, automationConfig, automationLogs, taskCategories] = await Promise.all([
      resolveCallerAuthority(),
      getKtdbclAutomationConfig(),
      getRecentWeeklyAutomationLogs(20),
      prisma.taskCategory.findMany({ orderBy: { name: "asc" } }),
    ])

    if (authCtx.authenticated && !authCtx.isAuthorizedKtdbcl) {
      return {
        success: false,
        error:
          "Chức năng Báo cáo Tuần Giáo viên & Nhân sự chỉ áp dụng riêng cho BP/Tổ chuyên môn Ban KT&ĐBCL, không áp dụng cho các Tổ khác.",
      }
    }

    const roster = authCtx.roster || (await resolveKtdbclRoster())
    const memberIds = roster.members.map((m) => m.id)
    const memberMap = new Map(roster.members.map((m) => [m.id, m]))

    // Fetch all reports in the selected month for Ban KT&ĐBCL members
    const [monthReports, workTasks] = await Promise.all([
      prisma.weeklyReport.findMany({
        where: {
          month,
          year,
          ...(memberIds.length > 0 ? { userId: { in: memberIds } } : {}),
        },
        include: {
          items: { orderBy: { createdAt: "asc" } },
          user: { select: { id: true, fullName: true, email: true, role: true } },
        },
        orderBy: [{ weekNumber: "asc" }, { updatedAt: "desc" }],
      }),
      prisma.workTask.findMany({
        where: memberIds.length > 0 ? { assignedToUserId: { in: memberIds }, progress: { not: "CANCELLED" } } : {},
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          progress: true,
          priority: true,
          startDate: true,
          endDate: true,
          assignedToUserId: true,
          taskGroup: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 250,
      }),
    ])

    const allItemIds = monthReports.flatMap((r) => r.items.map((i) => i.id))
    const itemMetaMap = await getWeeklyItemMetaMap(allItemIds)
    const now = new Date()

    // Enrich items for both Selected Week & Full Month
    const enrichReportItems = (reportsSubset: typeof monthReports): EnrichedWeeklyReportItem[] => {
      const list: EnrichedWeeklyReportItem[] = []
      for (const rpt of reportsSubset) {
        const mem = memberMap.get(rpt.userId)
        for (const it of rpt.items) {
          const existingMeta = itemMetaMap.get(it.id)
          const fallbackMeta: WeeklyReportItemMeta = existingMeta || {
            itemId: it.id,
            reportId: rpt.id,
            userId: rpt.userId,
            confirmStatus: "PENDING",
            managerConfirmedById: null,
            managerConfirmedByName: null,
            managerConfirmedAt: null,
            directorConfirmedById: null,
            directorConfirmedByName: null,
            directorConfirmedAt: null,
            isOverdue: false,
            overdueFlaggedById: null,
            overdueFlaggedByName: null,
            overdueFlaggedAt: null,
            explanationRequestNote: null,
            explanationDueDate: null,
            staffExplanation: null,
            staffRecoveryDate: null,
            staffExplainedAt: null,
            linkedWorkTaskId: null,
            lastEmailType: null,
            lastEmailSentAt: null,
            updatedAt: null,
          }
          const overdue = isReportItemPastDue(it, fallbackMeta, now, rpt.year, rpt.month)
          const computedQ = deriveItemQualityScore(it, fallbackMeta, overdue)
          const resolvedGroup =
            it.taskGroup ||
            mem?.specialistGroups?.[0] ||
            "ĐBCL"

          list.push({
            id: it.id,
            reportId: rpt.id,
            weekNumber: rpt.weekNumber,
            month: rpt.month,
            year: rpt.year,
            userId: rpt.userId,
            userFullName: mem?.fullName || rpt.user?.fullName || "Nhân sự KT&ĐBCL",
            userPosition: mem?.position || "Chuyên viên KT&ĐBCL",
            userEmail: mem?.email || normalizeStaffEmail(rpt.user),
            mainTask: it.mainTask,
            workContent: it.workContent,
            category: it.category || null,
            taskGroup: resolvedGroup,
            expectedCompletion: it.expectedCompletion || null,
            progress: it.progress,
            proposedSolution: it.proposedSolution || null,
            managerNote: it.managerNote || null,
            directorNote: it.directorNote || null,
            directorRating: it.directorRating || null,
            qualityScore: it.qualityScore ?? null,
            computedQualityScore: computedQ,
            isOverdue: overdue,
            meta: fallbackMeta,
          })
        }
      }
      return list
    }

    const weekReports = monthReports.filter((r) => r.weekNumber === weekNumber)
    const weekItems = enrichReportItems(weekReports)
    const monthItems = enrichReportItems(monthReports)

    // Precompute deterministic baseline analytics for both Week & Month so UI is instant
    const categoryWeights = new Map<string, number>()
    taskCategories.forEach((c) => categoryWeights.set(c.name.trim().toLowerCase(), c.weight || 1.0))

    const workTaskLite = workTasks.map((w) => ({
      id: w.id,
      assignedToUserId: w.assignedToUserId,
      taskGroupName: w.taskGroup?.name || null,
      progress: w.progress,
      endDate: w.endDate,
    }))

    const expectedWeeksCount =
      currentPeriod.year === year && currentPeriod.month === month
        ? Math.max(1, Math.min(allWeeks.length, currentPeriod.weekNumber))
        : Math.max(1, allWeeks.length)

    const weeklyBaseline: KtdbclAiQualityReport = {
      ...computeEfficiencyAndQualityMetrics({
        scopeType: "WEEKLY",
        weekNumber,
        month,
        year,
        expectedWeeksCount: 1,
        members: roster.members,
        taskGroupNames: roster.taskGroups.map((g) => g.name),
        reports: weekReports as any,
        itemMetaMap,
        workTasks: workTaskLite,
        categoryWeights,
        referenceNow: now,
      }),
      aiEngineUsed: "RULE_ENGINE_FALLBACK",
      generatedAt: now.toISOString(),
    }

    const monthlyBaseline: KtdbclAiQualityReport = {
      ...computeEfficiencyAndQualityMetrics({
        scopeType: "MONTHLY",
        weekNumber: null,
        month,
        year,
        expectedWeeksCount,
        members: roster.members,
        taskGroupNames: roster.taskGroups.map((g) => g.name),
        reports: monthReports as any,
        itemMetaMap,
        workTasks: workTaskLite,
        categoryWeights,
        referenceNow: now,
      }),
      aiEngineUsed: "RULE_ENGINE_FALLBACK",
      generatedAt: now.toISOString(),
    }

    // Check if cached Gemini AI report exists for this week/month
    const pAny = prisma as any
    let cachedWeeklyAi: KtdbclAiQualityReport | null = null
    let cachedMonthlyAi: KtdbclAiQualityReport | null = null
    if (typeof pAny.$queryRawUnsafe === "function") {
      try {
        const wkKey = `WEEKLY_${year}_${month}_W${weekNumber}`
        const moKey = `MONTHLY_${year}_${month}_W0`
        const rows: any[] = await pAny.$queryRawUnsafe(
          `SELECT "cacheKey", "analysisJson" FROM "qa_weekly_ai_analyses" WHERE "cacheKey" IN (?, ?)`,
          wkKey,
          moKey
        )
        for (const r of rows || []) {
          if (r.cacheKey === wkKey && r.analysisJson) {
            cachedWeeklyAi = JSON.parse(String(r.analysisJson))
          }
          if (r.cacheKey === moKey && r.analysisJson) {
            cachedMonthlyAi = JSON.parse(String(r.analysisJson))
          }
        }
      } catch {
        // Ignore cache lookup errors
      }
    }

    // Build per-member weekly matrix (Week 1 .. Week N submission status)
    const memberWeeklyTimeline = roster.members.map((m) => {
      const mReports = monthReports.filter((r) => r.userId === m.id)
      const weekStatuses = allWeeks.map((w) => {
        const found = mReports.find((r) => r.weekNumber === w.weekNum)
        return {
          weekNum: w.weekNum,
          label: w.label,
          status: found ? found.status : "NOT_SUBMITTED",
          reportId: found?.id || null,
          itemsCount: found?.items?.length || 0,
          completedCount: found?.items?.filter((i) => i.progress === "COMPLETED").length || 0,
        }
      })
      const currentWeekReport = mReports.find((r) => r.weekNumber === weekNumber) || null
      const myQaTasks = workTasks.filter((w) => w.assignedToUserId === m.id)
      return {
        member: m,
        currentWeekStatus: currentWeekReport ? currentWeekReport.status : "NOT_SUBMITTED",
        currentWeekReportId: currentWeekReport?.id || null,
        currentWeekManagerComment: currentWeekReport?.managerComment || null,
        currentWeekDirectorComment: currentWeekReport?.directorComment || null,
        weekStatuses,
        qaTasksSummary: {
          total: myQaTasks.length,
          completed: myQaTasks.filter((t) => t.progress === "COMPLETED").length,
          inProgress: myQaTasks.filter((t) => t.progress === "IN_PROGRESS").length,
        },
      }
    })

    const specialistGroupNames = Array.from(
      new Set([...KTDBCL_DEFAULT_GROUPS, ...roster.taskGroups.map((g) => g.name)])
    )

    return {
      success: true,
      period: {
        weekNumber,
        month,
        year,
        allWeeks,
      },
      authority: {
        userId: authCtx.userId,
        userName: authCtx.userName,
        isLeadership: authCtx.isLeadership,
        isDirectorAuthority: authCtx.isDirectorAuthority,
      },
      department: roster.department || {
        id: "KTDBCL",
        code: "KT-ĐBCL",
        name: "Ban KT&ĐBCL",
        divisionCode: "BAN_KT_DBCL",
      },
      members: roster.members,
      directorCandidates: roster.directorCandidates,
      taskGroups: roster.taskGroups,
      specialistGroupNames,
      taskCategories: JSON.parse(JSON.stringify(taskCategories)),
      weekItems: JSON.parse(JSON.stringify(weekItems)),
      monthItems: JSON.parse(JSON.stringify(monthItems)),
      memberWeeklyTimeline: JSON.parse(JSON.stringify(memberWeeklyTimeline)),
      weeklyAnalysis: cachedWeeklyAi || weeklyBaseline,
      monthlyAnalysis: cachedMonthlyAi || monthlyBaseline,
      automationConfig,
      automationLogs,
    }
  } catch (err: any) {
    console.error("[getKtdbclWorkspaceSnapshot] Error:", err)
    return {
      success: false,
      error: err?.message || "Không tải được dữ liệu Báo cáo Tuần Ban KT&ĐBCL",
    }
  }
}

/**
 * Lấy danh sách đầu việc từ QA Workspace của nhân sự để đồng bộ 1 chạm sang Báo cáo Tuần
 */
export async function syncQaWorkspaceTasksToReportDraft(params: {
  targetUserId?: string
  weekNumber: number
  month: number
  year: number
}) {
  try {
    const authCtx = await resolveCallerAuthority()
    if (!authCtx.authenticated || !authCtx.isAuthorizedKtdbcl) {
      return {
        success: false,
        error: "Chức năng Báo cáo Tuần chỉ áp dụng riêng cho Ban KT&ĐBCL.",
        draftItems: [],
      }
    }

    const userId =
      params.targetUserId && authCtx.isLeadership ? params.targetUserId : authCtx.userId

    const tasks = await prisma.workTask.findMany({
      where: {
        OR: [{ assignedToUserId: userId }, { collaborators: { contains: userId } }],
        progress: { not: "CANCELLED" },
      },
      include: {
        taskGroup: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    })

    const draftItems = tasks.map((t) => {
      const endDateStr = t.endDate
        ? new Date(t.endDate).toLocaleDateString("vi-VN")
        : ""
      const mappedProgress =
        t.progress === "COMPLETED"
          ? "COMPLETED"
          : t.progress === "IN_PROGRESS"
          ? "DOING"
          : "NOT_STARTED"

      return {
        linkedWorkTaskId: t.id,
        taskGroup: t.taskGroup?.name || "ĐBCL",
        category: t.category || "Khảo Sát",
        mainTask: t.title,
        workContent: t.description ? `${t.title} — ${t.description.slice(0, 240)}` : t.title,
        expectedCompletion: endDateStr,
        progress: mappedProgress,
        proposedSolution: "",
      }
    })

    return {
      success: true,
      draftItems: JSON.parse(JSON.stringify(draftItems)),
    }
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi đồng bộ QA Workspace", draftItems: [] }
  }
}

/**
 * Lưu / Nộp Báo cáo Tuần Ban KT&ĐBCL (bảo toàn ID đầu việc và trạng thái xác nhận/giải trình)
 */
export async function saveKtdbclWeeklyReport(data: {
  weekNumber: number
  month: number
  year: number
  academicYearId?: string
  targetUserId?: string
  items: Array<{
    id?: string
    mainTask?: string
    category?: string
    taskGroup?: string
    workContent: string
    expectedCompletion?: string
    progress: string
    proposedSolution?: string
    linkedWorkTaskId?: string | null
  }>
}) {
  try {
    await ensureKtdbclWeeklySchema()
    const authCtx = await resolveCallerAuthority()
    if (!authCtx.authenticated) return { success: false, error: "Chưa đăng nhập" }
    if (!authCtx.isAuthorizedKtdbcl) {
      return {
        success: false,
        error:
          "Báo cáo Tuần Giáo viên & Nhân sự chỉ áp dụng riêng cho BP/Tổ chuyên môn Ban KT&ĐBCL, không áp dụng cho các Tổ khác.",
      }
    }

    let userId = authCtx.userId
    if (data.targetUserId && data.targetUserId !== authCtx.userId) {
      if (!authCtx.isLeadership) {
        return { success: false, error: "Chỉ Quản lý / Giám đốc Ban mới được hiệu chỉnh báo cáo hộ thành viên" }
      }
      userId = data.targetUserId
    }

    const cleanItems = (data.items || []).filter(
      (i) => (i.workContent && i.workContent.trim()) || (i.mainTask && i.mainTask.trim())
    )
    if (cleanItems.length === 0) {
      return { success: false, error: "Vui lòng nhập ít nhất 1 đầu việc trong báo cáo tuần." }
    }

    let report = await prisma.weeklyReport.findFirst({
      where: {
        userId,
        weekNumber: data.weekNumber,
        month: data.month,
        year: data.year,
      },
      include: { items: true },
    })

    if (!report) {
      report = await prisma.weeklyReport.create({
        data: {
          userId,
          weekNumber: data.weekNumber,
          month: data.month,
          year: data.year,
          status: "SUBMITTED",
          academicYearId: data.academicYearId || null,
        },
        include: { items: true },
      })
    } else {
      await prisma.weeklyReport.update({
        where: { id: report.id },
        data: {
          status: report.status === "REVIEWED" ? "REVIEWED" : "SUBMITTED",
          academicYearId: data.academicYearId || report.academicYearId || null,
        },
      })
    }

    const existingIds = new Set(report.items.map((i) => i.id))
    const incomingExistingIds = new Set(
      cleanItems.map((i) => i.id).filter((id): id is string => Boolean(id && existingIds.has(id)))
    )

    // Delete removed items only
    const removedIds = report.items
      .map((i) => i.id)
      .filter((id) => !incomingExistingIds.has(id))

    if (removedIds.length > 0) {
      await prisma.weeklyReportItem.deleteMany({
        where: { id: { in: removedIds }, reportId: report.id },
      })
    }

    // Update existing items & create new ones
    for (const item of cleanItems) {
      const mainTaskVal = (item.mainTask || item.category || item.taskGroup || "Công việc chuyên môn").trim()
      const workContentVal = (item.workContent || mainTaskVal).trim()

      if (item.id && existingIds.has(item.id)) {
        await prisma.weeklyReportItem.update({
          where: { id: item.id },
          data: {
            mainTask: mainTaskVal,
            workContent: workContentVal,
            category: item.category || null,
            taskGroup: item.taskGroup || "ĐBCL",
            expectedCompletion: item.expectedCompletion || null,
            progress: item.progress || "DOING",
            proposedSolution: item.proposedSolution ?? "",
          },
        })
        if (item.linkedWorkTaskId) {
          await upsertWeeklyItemMeta({
            itemId: item.id,
            reportId: report.id,
            userId,
            linkedWorkTaskId: item.linkedWorkTaskId,
          })
        }
      } else {
        const created = await prisma.weeklyReportItem.create({
          data: {
            reportId: report.id,
            mainTask: mainTaskVal,
            workContent: workContentVal,
            category: item.category || null,
            taskGroup: item.taskGroup || "ĐBCL",
            expectedCompletion: item.expectedCompletion || null,
            progress: item.progress || "DOING",
            proposedSolution: item.proposedSolution ?? "",
          },
        })
        await upsertWeeklyItemMeta({
          itemId: created.id,
          reportId: report.id,
          userId,
          confirmStatus: "PENDING",
          linkedWorkTaskId: item.linkedWorkTaskId || null,
        })
      }
    }

    // Clear AI cache for this week & month so fresh metrics reflect immediately
    const pAny = prisma as any
    if (typeof pAny.$executeRawUnsafe === "function") {
      await pAny
        .$executeRawUnsafe(
          `DELETE FROM "qa_weekly_ai_analyses" WHERE "year" = ? AND "month" = ?`,
          data.year,
          data.month
        )
        .catch(() => {})
    }

    revalidatePath("/admin/weekly-reports")
    return { success: true, reportId: report.id }
  } catch (err: any) {
    console.error("[saveKtdbclWeeklyReport] Error:", err)
    return { success: false, error: err?.message || "Lỗi lưu báo cáo tuần" }
  }
}

/**
 * Quản lý / Giám đốc Ban xác nhận hoàn thành đầu việc & Gửi Email thông báo hoàn thành cho nhân viên
 */
export async function confirmKtdbclReportItems(params: {
  itemIds: string[]
  roleMode?: "MANAGER" | "DIRECTOR"
  reviewNote?: string
  directorRating?: "EXCELLENT" | "GOOD" | "SATISFACTORY" | "NEEDS_IMPROVEMENT"
  qualityScore?: number | null
  sendMail?: boolean
}) {
  try {
    await ensureKtdbclWeeklySchema()
    const authCtx = await resolveCallerAuthority()
    if (!authCtx.authenticated || !authCtx.isLeadership) {
      return {
        success: false,
        error: "Chỉ Quản lý chuyên môn hoặc Giám đốc Ban KT&ĐBCL mới có quyền xác nhận hoàn thành.",
      }
    }

    const uniqueIds = Array.from(new Set((params.itemIds || []).filter(Boolean)))
    if (uniqueIds.length === 0) {
      return { success: false, error: "Chưa chọn đầu việc để xác nhận." }
    }

    const items = await prisma.weeklyReportItem.findMany({
      where: { id: { in: uniqueIds } },
      include: {
        report: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                teacher: { select: { email: true } },
              },
            },
          },
        },
      },
    })

    if (items.length === 0) {
      return { success: false, error: "Không tìm thấy đầu việc cần xác nhận." }
    }

    const effectiveRole =
      params.roleMode === "DIRECTOR" || (params.roleMode === undefined && authCtx.isDirectorAuthority)
        ? "DIRECTOR"
        : "MANAGER"

    const nowIso = new Date().toISOString()
    const reportIdsToMarkReviewed = new Set<string>()
    const groupedForEmail = new Map<
      string,
      {
        staffUser: { id: string; fullName: string; email: string | null }
        weekNumber: number
        month: number
        year: number
        items: Array<{
          mainTask: string
          workContent: string
          taskGroup?: string | null
          qualityScore?: number | null
          directorRating?: string | null
          reviewNote?: string | null
        }>
      }
    >()

    for (const item of items) {
      reportIdsToMarkReviewed.add(item.reportId)
      const noteText = params.reviewNote?.trim() || null
      const scoreVal =
        typeof params.qualityScore === "number"
          ? params.qualityScore
          : item.qualityScore ?? (params.directorRating === "EXCELLENT" ? 9.5 : 9.0)
      const ratingVal = params.directorRating || item.directorRating || "GOOD"

      await prisma.weeklyReportItem.update({
        where: { id: item.id },
        data: {
          progress: "COMPLETED",
          ...(effectiveRole === "DIRECTOR"
            ? {
                directorNote: noteText || item.directorNote || "Đã xác nhận hoàn thành",
                directorRating: ratingVal,
                qualityScore: scoreVal,
              }
            : {
                managerNote: noteText || item.managerNote || "Quản lý đã xác nhận hoàn thành",
              }),
        },
      })

      await upsertWeeklyItemMeta({
        itemId: item.id,
        reportId: item.reportId,
        userId: item.report.userId,
        confirmStatus: effectiveRole === "DIRECTOR" ? "DIRECTOR_CONFIRMED" : "MANAGER_CONFIRMED",
        ...(effectiveRole === "DIRECTOR"
          ? {
              directorConfirmedById: authCtx.userId,
              directorConfirmedByName: authCtx.userName,
              directorConfirmedAt: nowIso,
            }
          : {
              managerConfirmedById: authCtx.userId,
              managerConfirmedByName: authCtx.userName,
              managerConfirmedAt: nowIso,
            }),
        isOverdue: false,
        lastEmailType: params.sendMail !== false ? "COMPLETED_CONFIRMATION" : undefined,
        lastEmailSentAt: params.sendMail !== false ? nowIso : undefined,
      })

      const groupKey = `${item.report.userId}_${item.report.weekNumber}_${item.report.month}_${item.report.year}`
      if (!groupedForEmail.has(groupKey)) {
        groupedForEmail.set(groupKey, {
          staffUser: {
            id: item.report.user.id,
            fullName: item.report.user.fullName || "Thầy/Cô",
            email: normalizeStaffEmail(item.report.user),
          },
          weekNumber: item.report.weekNumber,
          month: item.report.month,
          year: item.report.year,
          items: [],
        })
      }
      groupedForEmail.get(groupKey)!.items.push({
        mainTask: item.mainTask,
        workContent: item.workContent,
        taskGroup: item.taskGroup,
        qualityScore: effectiveRole === "DIRECTOR" ? scoreVal : item.qualityScore,
        directorRating: effectiveRole === "DIRECTOR" ? ratingVal : item.directorRating,
        reviewNote: noteText,
      })
    }

    if (reportIdsToMarkReviewed.size > 0) {
      await prisma.weeklyReport.updateMany({
        where: { id: { in: Array.from(reportIdsToMarkReviewed) } },
        data: { status: "REVIEWED" },
      })
    }

    let emailSentCount = 0
    if (params.sendMail !== false) {
      for (const payload of groupedForEmail.values()) {
        const res = await sendReportItemsCompletedEmail({
          staffUser: payload.staffUser,
          reviewerName: authCtx.userName,
          reviewerRoleLabel:
            effectiveRole === "DIRECTOR" ? "Giám đốc Ban KT&ĐBCL" : "Quản lý chuyên môn",
          weekNumber: payload.weekNumber,
          month: payload.month,
          year: payload.year,
          items: payload.items,
        })
        if (res.emailSent) emailSentCount++
      }
    }

    revalidatePath("/admin/weekly-reports")
    return {
      success: true,
      confirmedCount: items.length,
      emailSentCount,
    }
  } catch (err: any) {
    console.error("[confirmKtdbclReportItems] Error:", err)
    return { success: false, error: err?.message || "Lỗi xác nhận hoàn thành đầu việc" }
  }
}

/**
 * Quản lý / Giám đốc Ban đánh dấu trễ tiến độ & Gửi Email yêu cầu nhân viên giải trình
 */
export async function flagOverdueAndRequestExplanationAction(params: {
  itemIds: string[]
  explanationRequestNote: string
  explanationDueDate?: string
  sendMail?: boolean
}) {
  try {
    await ensureKtdbclWeeklySchema()
    const authCtx = await resolveCallerAuthority()
    if (!authCtx.authenticated || !authCtx.isLeadership) {
      return {
        success: false,
        error: "Chỉ Quản lý hoặc Giám đốc Ban KT&ĐBCL mới có quyền yêu cầu giải trình tiến độ.",
      }
    }

    const uniqueIds = Array.from(new Set((params.itemIds || []).filter(Boolean)))
    if (uniqueIds.length === 0) {
      return { success: false, error: "Vui lòng chọn ít nhất 1 đầu việc chậm tiến độ." }
    }

    const requestNote =
      params.explanationRequestNote?.trim() ||
      "Đầu việc trễ tiến độ dự kiến. Đề nghị giải trình rõ nguyên nhân, giải pháp khắc phục và cam kết thời hạn hoàn thành bù."

    const items = await prisma.weeklyReportItem.findMany({
      where: { id: { in: uniqueIds } },
      include: {
        report: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                teacher: { select: { email: true } },
              },
            },
          },
        },
      },
    })

    if (items.length === 0) {
      return { success: false, error: "Không tìm thấy đầu việc." }
    }

    const nowIso = new Date().toISOString()
    const groupedForEmail = new Map<
      string,
      {
        staffUser: { id: string; fullName: string; email: string | null }
        weekNumber: number
        month: number
        year: number
        items: Array<{
          mainTask: string
          workContent: string
          taskGroup?: string | null
          expectedCompletion?: string | null
          progress: string
        }>
      }
    >()

    for (const item of items) {
      await prisma.weeklyReportItem.update({
        where: { id: item.id },
        data: {
          managerNote: `[Yêu cầu giải trình]: ${requestNote}`,
        },
      })

      await upsertWeeklyItemMeta({
        itemId: item.id,
        reportId: item.reportId,
        userId: item.report.userId,
        confirmStatus: "OVERDUE_EXPLANATION_REQUIRED",
        isOverdue: true,
        overdueFlaggedById: authCtx.userId,
        overdueFlaggedByName: authCtx.userName,
        overdueFlaggedAt: nowIso,
        explanationRequestNote: requestNote,
        explanationDueDate: params.explanationDueDate || null,
        lastEmailType: "OVERDUE_EXPLANATION_REQUEST",
        lastEmailSentAt: nowIso,
      })

      const groupKey = `${item.report.userId}_${item.report.weekNumber}_${item.report.month}_${item.report.year}`
      if (!groupedForEmail.has(groupKey)) {
        groupedForEmail.set(groupKey, {
          staffUser: {
            id: item.report.user.id,
            fullName: item.report.user.fullName || "Thầy/Cô",
            email: normalizeStaffEmail(item.report.user),
          },
          weekNumber: item.report.weekNumber,
          month: item.report.month,
          year: item.report.year,
          items: [],
        })
      }
      groupedForEmail.get(groupKey)!.items.push({
        mainTask: item.mainTask,
        workContent: item.workContent,
        taskGroup: item.taskGroup,
        expectedCompletion: item.expectedCompletion,
        progress: item.progress,
      })
    }

    let emailSentCount = 0
    if (params.sendMail !== false) {
      for (const payload of groupedForEmail.values()) {
        const res = await sendOverdueExplanationRequestEmail({
          staffUser: payload.staffUser,
          requestedByName: authCtx.userName,
          requestedByRoleLabel: authCtx.isDirectorAuthority
            ? "Giám đốc Ban KT&ĐBCL"
            : "Quản lý Ban KT&ĐBCL",
          weekNumber: payload.weekNumber,
          month: payload.month,
          year: payload.year,
          explanationRequestNote: requestNote,
          explanationDueDate: params.explanationDueDate || null,
          items: payload.items,
        })
        if (res.emailSent) emailSentCount++
      }
    }

    revalidatePath("/admin/weekly-reports")
    return {
      success: true,
      flaggedCount: items.length,
      emailSentCount,
    }
  } catch (err: any) {
    console.error("[flagOverdueAndRequestExplanationAction] Error:", err)
    return { success: false, error: err?.message || "Lỗi gửi yêu cầu giải trình" }
  }
}

/**
 * Nhân viên gửi nội dung giải trình đối với đầu việc trễ tiến độ
 */
export async function submitStaffOverdueExplanationAction(params: {
  itemId: string
  explanationText: string
  recoveryDate?: string
}) {
  try {
    await ensureKtdbclWeeklySchema()
    const authCtx = await resolveCallerAuthority()
    if (!authCtx.authenticated) {
      return { success: false, error: "Chưa đăng nhập" }
    }

    const explanation = (params.explanationText || "").trim()
    if (explanation.length < 10) {
      return {
        success: false,
        error: "Nội dung giải trình cần nêu rõ nguyên nhân và giải pháp tối thiểu 10 ký tự.",
      }
    }

    const item = await prisma.weeklyReportItem.findUnique({
      where: { id: params.itemId },
      include: {
        report: {
          include: {
            user: { select: { id: true, fullName: true } },
          },
        },
      },
    })

    if (!item) return { success: false, error: "Không tìm thấy đầu việc cần giải trình." }
    if (item.report.userId !== authCtx.userId && !authCtx.isLeadership) {
      return { success: false, error: "Bạn không có quyền gửi giải trình cho đầu việc của người khác." }
    }

    const metaMap = await getWeeklyItemMetaMap([item.id])
    const prevMeta = metaMap.get(item.id)
    const nowIso = new Date().toISOString()

    const combinedSolution = params.recoveryDate
      ? `[Giải trình - Cam kết bù ${params.recoveryDate}]: ${explanation}`
      : `[Giải trình]: ${explanation}`

    await prisma.weeklyReportItem.update({
      where: { id: item.id },
      data: {
        proposedSolution: combinedSolution,
      },
    })

    await upsertWeeklyItemMeta({
      itemId: item.id,
      reportId: item.reportId,
      userId: item.report.userId,
      confirmStatus: "EXPLANATION_SUBMITTED",
      staffExplanation: explanation,
      staffRecoveryDate: params.recoveryDate || null,
      staffExplainedAt: nowIso,
    })

    // Notify & Email Manager/Director who flagged it + configured Director(s)
    const config = await getKtdbclAutomationConfig()
    const recipientIds = new Set<string>()
    if (prevMeta?.overdueFlaggedById) recipientIds.add(prevMeta.overdueFlaggedById)
    config.directorUserIds.forEach((id) => recipientIds.add(id))
    if (recipientIds.size === 0 && authCtx.roster) {
      authCtx.roster.members.filter((m) => m.isDirector || m.isManager).forEach((m) => recipientIds.add(m.id))
    }
    recipientIds.delete(authCtx.userId)

    await sendExplanationSubmittedToLeadershipEmail({
      staffName: item.report.user.fullName || authCtx.userName,
      weekNumber: item.report.weekNumber,
      month: item.report.month,
      year: item.report.year,
      mainTask: item.mainTask,
      workContent: item.workContent,
      explanationText: explanation,
      recoveryDate: params.recoveryDate || null,
      recipientUserIds: Array.from(recipientIds),
    })

    revalidatePath("/admin/weekly-reports")
    return { success: true }
  } catch (err: any) {
    console.error("[submitStaffOverdueExplanationAction] Error:", err)
    return { success: false, error: err?.message || "Lỗi gửi giải trình" }
  }
}

/**
 * Kích hoạt nhắc lập Kế hoạch Tuần (Sáng Thứ Bảy định kỳ) ngay lập tức
 */
export async function triggerKtdbclSaturdayPlanReminderNowAction(params?: {
  targetUserId?: string
}) {
  try {
    const authCtx = await resolveCallerAuthority()
    if (!authCtx.authenticated || !authCtx.isLeadership) {
      return {
        success: false,
        error: "Chỉ Quản lý / Giám đốc Ban mới có quyền phát lệnh nhắc lập Kế hoạch Tuần.",
      }
    }

    const result = await dispatchKtdbclSaturdayPlanReminders({
      targetUserId: params?.targetUserId,
      force: true,
      triggeredBy: authCtx.userName,
    })

    revalidatePath("/admin/weekly-reports")
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi gửi email nhắc lập Kế hoạch Tuần" }
  }
}

/**
 * Kích hoạt nhắc nộp báo cáo tuần ngay lập tức (hoặc nhắc riêng 1 thành viên Ban KT&ĐBCL)
 */
export async function triggerKtdbclReminderNowAction(params: {
  weekNumber: number
  month: number
  year: number
  targetUserId?: string
}) {
  try {
    const authCtx = await resolveCallerAuthority()
    if (!authCtx.authenticated || !authCtx.isLeadership) {
      return { success: false, error: "Chỉ Quản lý / Giám đốc Ban mới có quyền phát lệnh nhắc báo cáo." }
    }

    const result = await dispatchKtdbclWednesdayReminders({
      weekNumber: params.weekNumber,
      month: params.month,
      year: params.year,
      targetUserId: params.targetUserId,
      force: true,
      triggeredBy: authCtx.userName,
    })

    revalidatePath("/admin/weekly-reports")
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi gửi email nhắc báo cáo" }
  }
}

/**
 * Kích hoạt gửi Báo cáo Tuần hoặc Báo cáo Tháng (kèm AI Agent phân tích) cho Giám đốc Ban KT&ĐBCL
 */
export async function sendKtdbclDirectorReportNowAction(params: {
  scopeType: "WEEKLY" | "MONTHLY"
  weekNumber?: number
  month: number
  year: number
  overrideEmails?: string[]
}) {
  try {
    const authCtx = await resolveCallerAuthority()
    if (!authCtx.authenticated || !authCtx.isLeadership) {
      return { success: false, error: "Chỉ Quản lý / Giám đốc Ban mới có quyền phát hành báo cáo tổng hợp." }
    }

    const res = await dispatchDirectorSummaryReport({
      scopeType: params.scopeType,
      weekNumber: params.weekNumber,
      month: params.month,
      year: params.year,
      force: true,
      triggeredBy: authCtx.userName,
      overrideEmails: params.overrideEmails,
    })

    revalidatePath("/admin/weekly-reports")
    return res
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi gửi báo cáo Giám đốc Ban" }
  }
}

/**
 * Quét toàn bộ đầu việc quá hạn dự kiến trong kỳ và gửi Email yêu cầu giải trình hàng loạt
 */
export async function scanAndRequestOverdueExplanationsAction(params: {
  weekNumber: number
  month: number
  year: number
  scopeType: "WEEKLY" | "MONTHLY"
}) {
  try {
    const authCtx = await resolveCallerAuthority()
    if (!authCtx.authenticated || !authCtx.isLeadership) {
      return { success: false, error: "Chỉ Quản lý / Giám đốc Ban mới có quyền quét trễ hạn." }
    }

    const roster = authCtx.roster || (await resolveKtdbclRoster())
    const memberIds = roster.members.map((m) => m.id)

    const reports = await prisma.weeklyReport.findMany({
      where: {
        month: params.month,
        year: params.year,
        ...(params.scopeType === "WEEKLY" ? { weekNumber: params.weekNumber } : {}),
        ...(memberIds.length > 0 ? { userId: { in: memberIds } } : {}),
      },
      include: { items: true },
    })

    const allItems = reports.flatMap((r) =>
      r.items.map((it) => ({ ...it, rptYear: r.year, rptMonth: r.month }))
    )
    const metaMap = await getWeeklyItemMetaMap(allItems.map((i) => i.id))
    const now = new Date()

    const overdueItemIds = allItems
      .filter((it) => {
        if (it.progress === "COMPLETED") return false
        const m = metaMap.get(it.id)
        if (m?.confirmStatus === "OVERDUE_EXPLANATION_REQUIRED" || m?.confirmStatus === "EXPLANATION_SUBMITTED") {
          return false
        }
        return isReportItemPastDue(it, m, now, it.rptYear, it.rptMonth)
      })
      .map((i) => i.id)

    if (overdueItemIds.length === 0) {
      return {
        success: true,
        flaggedCount: 0,
        emailSentCount: 0,
        message: "Không có đầu việc quá hạn mới nào cần yêu cầu giải trình.",
      }
    }

    return await flagOverdueAndRequestExplanationAction({
      itemIds: overdueItemIds,
      explanationRequestNote:
        "Hệ thống Quản trị Chất lượng Ban KT&ĐBCL ghi nhận đầu việc đã quá ngày dự kiến hoàn thành. Vui lòng gửi giải trình nguyên nhân và thời hạn hoàn thành bù.",
      sendMail: true,
    })
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi quét đầu việc quá hạn" }
  }
}

/**
 * Quét & gửi email nhắc báo cáo tiến độ, yêu cầu xác nhận & đánh giá mức độ hoàn thành
 * đối với các đầu việc có trạng thái Quá hạn dự kiến hoặc Đang thực hiện.
 */
export async function triggerOverdueAndDoingProgressRemindersAction(params: {
  weekNumber: number
  month: number
  year: number
  scopeType: "WEEKLY" | "MONTHLY"
  itemIds?: string[]
}) {
  try {
    const authCtx = await resolveCallerAuthority()
    if (!authCtx.authenticated || !authCtx.isLeadership) {
      return {
        success: false,
        error: "Chỉ Quản lý / Giám đốc Ban mới có quyền phát lệnh nhắc tiến độ & xác nhận hoàn thành.",
      }
    }

    const res = await dispatchOverdueAndDoingProgressReminders({
      weekNumber: params.weekNumber,
      month: params.month,
      year: params.year,
      scopeType: params.scopeType,
      itemIds: params.itemIds,
      force: true,
      triggeredBy: authCtx.userName,
    })

    revalidatePath("/admin/weekly-reports")
    return res
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Lỗi gửi email nhắc tiến độ & xác nhận hoàn thành",
    }
  }
}

/**
 * Lưu cấu hình Tự động hóa (Nhắc Thứ 4 14:00 & Gửi Báo cáo GĐB Tuần/Tháng)
 */
export async function updateKtdbclAutomationSettingsAction(
  patch: Partial<KtdbclWeeklyAutomationConfig>
) {
  try {
    const authCtx = await resolveCallerAuthority()
    if (!authCtx.authenticated || !authCtx.isLeadership) {
      return { success: false, error: "Bạn không có quyền thay đổi cấu hình tự động hóa Ban KT&ĐBCL." }
    }

    const updated = await saveKtdbclAutomationConfig(patch, authCtx.userName)
    revalidatePath("/admin/weekly-reports")
    return { success: true, config: updated }
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi lưu cấu hình tự động hóa" }
  }
}

/**
 * Cập nhật thành viên và Trưởng nhóm của Nhóm chuyên môn thuộc Ban KT&ĐBCL
 */
export async function updateKtdbclSpecialistGroupMembersAction(params: {
  groupId?: string
  groupName: string
  leaderUserId?: string | null
  memberUserIds: string[]
}) {
  try {
    const authCtx = await resolveCallerAuthority()
    if (!authCtx.authenticated || !authCtx.isLeadership) {
      return { success: false, error: "Chỉ Quản lý / Giám đốc Ban mới được phân công nhóm chuyên môn." }
    }

    const cleanMemberIds = Array.from(new Set((params.memberUserIds || []).filter(Boolean)))
    if (params.leaderUserId && !cleanMemberIds.includes(params.leaderUserId)) {
      cleanMemberIds.unshift(params.leaderUserId)
    }

    if (params.groupId) {
      await prisma.taskGroup.update({
        where: { id: params.groupId },
        data: {
          leaderUserId: params.leaderUserId || null,
          memberUserIds: JSON.stringify(cleanMemberIds),
          department: "KT&ĐBCL",
        },
      })
    } else {
      await prisma.taskGroup.upsert({
        where: { name: params.groupName },
        create: {
          name: params.groupName,
          department: "KT&ĐBCL",
          leaderUserId: params.leaderUserId || null,
          memberUserIds: JSON.stringify(cleanMemberIds),
        },
        update: {
          leaderUserId: params.leaderUserId || null,
          memberUserIds: JSON.stringify(cleanMemberIds),
          department: "KT&ĐBCL",
        },
      })
    }

    revalidatePath("/admin/weekly-reports")
    revalidatePath("/admin/tasks")
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi cập nhật nhóm chuyên môn" }
  }
}
