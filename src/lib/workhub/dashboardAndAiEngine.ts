import { GoogleGenerativeAI } from "@google/generative-ai"
import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/mail"
import { renderSkylineEmail } from "@/lib/email-templates"
import { sanitizeUntrustedReferenceData } from "@/lib/qa-workspace/nlpDraftParser"
import {
  computeWeeksOfMonthSync,
  getWeeklyItemMetaMap,
  KTDBCL_DEFAULT_GROUPS,
  resolveCurrentWeekInMonth,
  resolveKtdbclRoster,
} from "@/lib/qa-workspace/weeklyReportSchema"
import { ensureWorkHubSchema, makeWorkHubId, safeJsonParse } from "./schemaInit"
import { recordWorkHubSystemAudit, WorkHubForbiddenError } from "./permissions"
import { listScopedWorkHubTasks, selectCanonicalStatisticalTasks } from "./taskEngine"
import { listScopedWorkHubPlans } from "./planEngine"
import { listScopedWorkHubReports, resolveReportPeriodWindow } from "./reportEngine"
import { evaluateTargetWorkHubKpis } from "./kpiEngine"
import type {
  WorkHubActorScope,
  WorkHubReminderConfig,
  WorkHubReportPeriodType,
  WorkHubReportSnapshotMetrics,
  WorkHubTaskRecord,
} from "./types"

export interface DashboardMetricCard {
  key: string
  label: string
  displayValue: string
  subtext: string
  tone: "default" | "teal" | "emerald" | "amber" | "rose"
  formulaDescription: string
  sourceType: "TASKS" | "REPORTS" | "PLANS" | "KPIS"
  sourceIds: string[]
}

/**
 * Xây dựng dữ liệu Dashboard theo vai trò (Cá nhân / Trưởng bộ phận / Ban điều hành)
 * Mỗi chỉ số đều kèm mô tả cách tính và danh sách ID dữ liệu nguồn để drill-down.
 * Tuyệt đối KHÔNG tạo bảng xếp hạng cá nhân mặc định.
 */
export async function buildWorkHubDashboardData(
  actor: WorkHubActorScope,
  filters?: {
    academicYearId?: string
    periodType?: WorkHubReportPeriodType
    year?: number
    month?: number
    weekNumber?: number | null
    campusId?: string
    departmentId?: string
    groupId?: string
    userId?: string
    status?: string
  }
) {
  await ensureWorkHubSchema()
  const now = new Date()
  const currentVnPeriod = resolveCurrentWeekInMonth(now)
  const year = Number(filters?.year) || currentVnPeriod.year
  const month = Number(filters?.month) || currentVnPeriod.month
  const periodType: WorkHubReportPeriodType = filters?.periodType || "MONTHLY"
  const allWeeksInMonth = computeWeeksOfMonthSync(month, year)
  const defaultWeekNum =
    year === currentVnPeriod.year && month === currentVnPeriod.month
      ? currentVnPeriod.weekNumber
      : allWeeksInMonth[0]?.weekNum || 1
  const weekNumber =
    periodType === "WEEKLY"
      ? Number(filters?.weekNumber || defaultWeekNum)
      : defaultWeekNum
  const periodWin = resolveReportPeriodWindow({
    periodType,
    year,
    month,
    weekNumber: periodType === "WEEKLY" ? weekNumber : null,
  })

  const reminderConfig = await getWorkHubReminderSettings()

  const [
    scopedTasks,
    scopedPlans,
    scopedReports,
    departments,
    campuses,
    scopedUsers,
    ktdbclRoster,
    rawTaskGroups,
  ] = await Promise.all([
    listScopedWorkHubTasks(actor, {
      academicYearId: filters?.academicYearId,
      campusId: filters?.campusId,
      departmentId: filters?.departmentId,
      groupId: filters?.groupId,
      userId: filters?.userId,
      status: filters?.status === "MISSING_REPORT" ? undefined : filters?.status,
      dueSoonHours: reminderConfig.dueSoonHours,
      referenceNow: now,
    }),
    listScopedWorkHubPlans(actor, {
      academicYearId: filters?.academicYearId,
      campusId: filters?.campusId,
      departmentId: filters?.departmentId,
    }),
    listScopedWorkHubReports(actor, {
      year,
      month,
      campusId: filters?.campusId,
      departmentId: filters?.departmentId,
    }),
    prisma.department.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, code: true, name: true, divisionCode: true },
      orderBy: { name: "asc" },
    }),
    prisma.campus.findMany({
      select: { id: true, campusCode: true, campusName: true },
      orderBy: { campusName: "asc" },
    }),
    prisma.user.findMany({
      where: {
        status: "ACTIVE",
        role: { not: "PARENT" },
        ...(actor.scopedUserIds !== null ? { id: { in: actor.scopedUserIds } } : {}),
      },
      select: {
        id: true,
        fullName: true,
        role: true,
        teacher: { select: { departmentId: true, campusId: true, position: true } },
      },
      orderBy: { fullName: "asc" },
    }),
    resolveKtdbclRoster().catch(() => null),
    prisma.taskGroup
      ?.findMany?.({
        orderBy: { name: "asc" },
      })
      ?.catch?.(() => []) ?? Promise.resolve([]),
  ])

  // Danh sách nhân sự thực tế thuộc Ban KT&ĐBCL (fallback sang scopedUsers nếu chạy môi trường test cô lập)
  const ktdbclMembers =
    ktdbclRoster && ktdbclRoster.members.length > 0
      ? ktdbclRoster.members
      : scopedUsers.map((u) => ({
          id: u.id,
          fullName: u.fullName,
          email: null,
          role: u.role,
          position: u.teacher?.position || u.role,
          isDirector: actor.isExecutive && u.id === actor.userId,
          isManager: false,
          departmentId: u.teacher?.departmentId || null,
          departmentName: "KT&ĐBCL",
          campusName: "",
          specialistGroups: [] as string[],
          teacherId: null,
        }))

  const ktdbclMemberIds = ktdbclMembers.map((m) => m.id)

  // Liên thông trực tiếp dữ liệu Báo cáo Tuần KT&ĐBCL (WeeklyReport + WeeklyReportItem + qa_weekly_report_item_meta)
  const monthWeeklyReports: any[] =
    typeof (prisma as any).weeklyReport?.findMany === "function" && ktdbclMemberIds.length > 0
      ? await prisma.weeklyReport
          .findMany({
            where: {
              month,
              year,
              userId: { in: ktdbclMemberIds },
            },
            include: {
              items: true,
            },
            orderBy: [{ weekNumber: "asc" }, { updatedAt: "desc" }],
          })
          .catch(() => [])
      : []

  const allReportItemIds = monthWeeklyReports.flatMap((r: any) =>
    (r.items || []).map((it: any) => String(it.id))
  )
  const weeklyItemMetaMap =
    allReportItemIds.length > 0
      ? await getWeeklyItemMetaMap(allReportItemIds).catch(() => new Map())
      : new Map()

  const activePeriodReports =
    periodType === "WEEKLY"
      ? monthWeeklyReports.filter((r: any) => Number(r.weekNumber) === weekNumber)
      : monthWeeklyReports

  // Canonical statistical tasks (deduplicated & parent-child safe)
  const canonicalTasks = selectCanonicalStatisticalTasks(scopedTasks)

  // Personal subset for Individual cards
  const myCanonicalTasks = canonicalTasks.filter(
    (t) => t.assignedToUserId === actor.userId || t.collaboratorIds.includes(actor.userId)
  )
  const myTodo = myCanonicalTasks.filter(
    (t) => t.workStatus === "ASSIGNED" || t.workStatus === "IN_PROGRESS"
  )
  const myDueSoon = myCanonicalTasks.filter((t) => t.dueSoon)
  const myOverdue = myCanonicalTasks.filter((t) => t.isOverdue && t.workStatus !== "COMPLETED")
  const myPendingReview = canonicalTasks.filter(
    (t) =>
      t.workStatus === "PENDING_REVIEW" &&
      (t.assignedToUserId === actor.userId || t.reviewerUserId === actor.userId)
  )

  const myPersonalReports = scopedReports.filter(
    (r) => r.ownerUserId === actor.userId && r.reportScope === "INDIVIDUAL"
  )
  const myCurrentPeriodReport = myPersonalReports.find((r) => r.periodKey === periodWin.periodKey)

  const myKpiEval = await evaluateTargetWorkHubKpis(actor, {
    targetScope: "INDIVIDUAL",
    targetEntityId: actor.userId,
    periodKey: periodWin.periodKey,
    periodLabel: periodWin.periodLabel,
    periodStart: periodWin.periodStart.toISOString(),
    periodEnd: periodWin.periodEnd.toISOString(),
    academicYearId: filters?.academicYearId,
  }).catch(() => ({ evaluations: [], scorecard: null }))

  const individualCards: DashboardMetricCard[] = [
    {
      key: "MY_TODO",
      label: "Việc cần thực hiện của tôi",
      displayValue: `${myTodo.length}`,
      subtext: "Đầu việc lá đang giao hoặc đang làm",
      tone: "teal",
      formulaDescription:
        "Đếm các công việc lá (không tính trùng cha-con, không tính việc hủy) mà bạn là người chịu trách nhiệm chính hoặc phối hợp ở trạng thái Đã giao / Đang thực hiện.",
      sourceType: "TASKS",
      sourceIds: myTodo.map((t) => t.id),
    },
    {
      key: "MY_DUE_SOON",
      label: `Sắp đến hạn (${reminderConfig.dueSoonHours}h)`,
      displayValue: `${myDueSoon.length}`,
      subtext: "Cần ưu tiên hoàn tất trước hạn",
      tone: myDueSoon.length > 0 ? "amber" : "default",
      formulaDescription: `Đếm công việc chưa hoàn thành của bạn có hạn chót nằm trong vòng ${reminderConfig.dueSoonHours} giờ tới kể từ thời điểm hiện tại.`,
      sourceType: "TASKS",
      sourceIds: myDueSoon.map((t) => t.id),
    },
    {
      key: "MY_OVERDUE",
      label: "Công việc quá hạn của tôi",
      displayValue: `${myOverdue.length}`,
      subtext: myOverdue.length === 0 ? "Không có việc trễ hạn" : "Vượt quá hạn hoàn thành đã giao",
      tone: myOverdue.length > 0 ? "rose" : "emerald",
      formulaDescription:
        "Xác định tự động từ hệ thống: Công việc chưa hoàn thành có thời điểm hiện tại vượt quá hạn hoàn thành (endDate).",
      sourceType: "TASKS",
      sourceIds: myOverdue.map((t) => t.id),
    },
    {
      key: "MY_PENDING_REVIEW",
      label: "Chờ nghiệm thu",
      displayValue: `${myPendingReview.length}`,
      subtext: "Việc đã gửi chờ duyệt hoặc cần bạn duyệt",
      tone: myPendingReview.length > 0 ? "amber" : "default",
      formulaDescription:
        "Đếm công việc ở trạng thái Chờ nghiệm thu (tiến độ 100% nhưng chưa được người nghiệm thu xác nhận Hoàn thành).",
      sourceType: "TASKS",
      sourceIds: myPendingReview.map((t) => t.id),
    },
    {
      key: "MY_REPORT_STATUS",
      label: `Báo cáo ${periodWin.periodLabel}`,
      displayValue: (() => {
        const myWkReports = activePeriodReports.filter((r: any) => r.userId === actor.userId)
        if (myWkReports.length > 0) {
          const itemCount = myWkReports.reduce((s: number, r: any) => s + (r.items?.length || 0), 0)
          return `Đã nộp (${itemCount} mục)`
        }
        if (myCurrentPeriodReport) {
          return myCurrentPeriodReport.status === "APPROVED"
            ? "Đã duyệt"
            : myCurrentPeriodReport.status === "SUBMITTED"
            ? "Đã gửi"
            : myCurrentPeriodReport.status === "NEEDS_REVISION"
            ? "Cần bổ sung"
            : "Bản nháp"
        }
        return "Chưa nộp"
      })(),
      subtext:
        activePeriodReports.some((r: any) => r.userId === actor.userId)
          ? "Đồng bộ trực tiếp từ Báo cáo Tuần KT&ĐBCL"
          : myCurrentPeriodReport
          ? myCurrentPeriodReport.reportCode
          : "Mở Báo cáo tuần & tháng để cập nhật",
      tone:
        activePeriodReports.some((r: any) => r.userId === actor.userId) ||
        myCurrentPeriodReport?.status === "APPROVED"
          ? "emerald"
          : myCurrentPeriodReport?.status === "SUBMITTED"
          ? "teal"
          : "amber",
      formulaDescription:
        "Trạng thái nộp báo cáo công việc cá nhân của bạn trong kỳ đang chọn (đồng bộ trực tiếp từ dữ liệu Báo cáo Tuần & Tháng Ban KT&ĐBCL).",
      sourceType: "REPORTS",
      sourceIds: myCurrentPeriodReport ? [myCurrentPeriodReport.id] : [],
    },
  ]

  // Department Head & Executive Metrics (gói gọn trong Ban KT&ĐBCL: 5 Nhóm chuyên môn & Cá nhân)
  const completedTasks = canonicalTasks.filter((t) => t.workStatus === "COMPLETED")
  const onTimeCompleted = completedTasks.filter((t) => t.completedOnTime === true)
  const openOverdueTasks = canonicalTasks.filter(
    (t) => t.isOverdue && t.workStatus !== "COMPLETED"
  )
  const pendingReviewAll = canonicalTasks.filter((t) => t.workStatus === "PENDING_REVIEW")
  const tasksWithBlockers = canonicalTasks.filter((t) => t.unresolvedBlockerCount > 0)

  const onTimeRateDisplay =
    canonicalTasks.length === 0
      ? "Chưa đủ dữ liệu"
      : `${Number(((onTimeCompleted.length / canonicalTasks.length) * 100).toFixed(1))}%`

  const reportsPendingApproval = scopedReports.filter((r) => r.status === "SUBMITTED")
  const submittedOwnerIdsForPeriod = new Set<string>([
    ...scopedReports
      .filter(
        (r) =>
          r.reportScope === "INDIVIDUAL" &&
          r.periodKey === periodWin.periodKey &&
          r.status !== "DRAFT"
      )
      .map((r) => r.ownerUserId),
    ...activePeriodReports
      .filter((r: any) => (r.items?.length || 0) > 0)
      .map((r: any) => String(r.userId)),
  ])
  const unsubmittedStaff = ktdbclMembers.filter((u) => !submittedOwnerIdsForPeriod.has(u.id))

  // Đếm tổng số mục việc trong Báo cáo tuần chờ xác nhận hoặc chờ giải trình
  const activeReportItems = activePeriodReports.flatMap((r: any) =>
    (r.items || []).map((it: any) => ({
      ...it,
      userId: String(r.userId),
      weekNumber: Number(r.weekNumber),
      meta: weeklyItemMetaMap.get(String(it.id)) || null,
    }))
  )
  const pendingConfirmItemsCount = activeReportItems.filter(
    (it: any) => !it.meta || it.meta.confirmStatus === "PENDING"
  ).length
  const explanationRequiredItems = activeReportItems.filter(
    (it: any) => it.meta?.confirmStatus === "OVERDUE_EXPLANATION_REQUIRED"
  )

  const managerCards: DashboardMetricCard[] = [
    {
      key: "SCOPE_PROGRESS",
      label: "Hoàn thành đầu việc giao",
      displayValue:
        canonicalTasks.length === 0
          ? "Chưa đủ dữ liệu"
          : `${completedTasks.length}/${canonicalTasks.length}`,
      subtext:
        canonicalTasks.length === 0
          ? "Chưa phát sinh đầu việc lá trong phạm vi lọc"
          : `Đạt ${Math.round((completedTasks.length / canonicalTasks.length) * 100)}% tổng đầu việc`,
      tone: "teal",
      formulaDescription:
        "Tử số: Số công việc lá đã được nghiệm thu Hoàn thành. Mẫu số: Tổng số công việc lá hợp lệ trong phạm vi lọc (không cộng trùng cha-con và không cộng trùng người phối hợp).",
      sourceType: "TASKS",
      sourceIds: canonicalTasks.map((t) => t.id),
    },
    {
      key: "SCOPE_ONTIME_RATE",
      label: "Tỷ lệ hoàn thành đúng hạn",
      displayValue: onTimeRateDisplay,
      subtext: `${onTimeCompleted.length} việc đúng hạn / ${canonicalTasks.length} việc`,
      tone:
        canonicalTasks.length === 0
          ? "default"
          : onTimeCompleted.length / canonicalTasks.length >= 0.85
          ? "emerald"
          : "amber",
      formulaDescription:
        "Tử số: Số công việc lá hoàn thành có completedAt <= endDate. Mẫu số: Tổng công việc lá trong phạm vi. Khi mẫu số = 0 hiển thị 'Chưa đủ dữ liệu'.",
      sourceType: "TASKS",
      sourceIds: onTimeCompleted.map((t) => t.id),
    },
    {
      key: "SCOPE_OVERDUE_BLOCKERS",
      label: "Quá hạn & Giải trình tồn đọng",
      displayValue: `${openOverdueTasks.length + explanationRequiredItems.length}`,
      subtext: `${openOverdueTasks.length} việc giao quá hạn • ${explanationRequiredItems.length} mục chờ giải trình`,
      tone:
        openOverdueTasks.length > 0 ||
        tasksWithBlockers.length > 0 ||
        explanationRequiredItems.length > 0
          ? "rose"
          : "emerald",
      formulaDescription:
        "Tổng hợp công việc giao quá hạn chưa hoàn thành, công việc có vướng mắc và các đầu việc trong Báo cáo Tuần đang bị yêu cầu giải trình trễ hạn.",
      sourceType: "TASKS",
      sourceIds: Array.from(
        new Set([...openOverdueTasks.map((t) => t.id), ...tasksWithBlockers.map((t) => t.id)])
      ),
    },
    {
      key: "SCOPE_REPORTS_QUEUE",
      label: "Tiến độ nộp Báo cáo kỳ",
      displayValue: `${ktdbclMembers.length - unsubmittedStaff.length}/${ktdbclMembers.length} đã nộp`,
      subtext: `${unsubmittedStaff.length} chưa nộp • ${pendingConfirmItemsCount} mục chờ xác nhận QL/GĐB`,
      tone: unsubmittedStaff.length > 0 ? "amber" : "emerald",
      formulaDescription:
        "Số thành viên Ban KT&ĐBCL đã nộp Báo cáo công việc trong kỳ đang chọn trên tổng nhân sự của Ban (không quy người chưa nộp về kết quả 0%), kèm số đầu việc báo cáo chờ Quản lý/Giám đốc Ban xác nhận.",
      sourceType: "REPORTS",
      sourceIds: reportsPendingApproval.map((r) => r.id),
    },
    {
      key: "SCOPE_PLANS_ACTIVE",
      label: "Tiến độ kế hoạch công tác",
      displayValue:
        scopedPlans.length === 0
          ? "Chưa có KH"
          : `${Math.round(
              scopedPlans.reduce((s, p) => s + (p.metrics?.progressPercent || 0), 0) /
                scopedPlans.length
            )}%`,
      subtext: `${scopedPlans.length} kế hoạch (${
        scopedPlans.filter((p) => p.status === "APPROVED" || p.status === "ADJUSTED").length
      } đã duyệt)`,
      tone: "teal",
      formulaDescription:
        "Trung bình tiến độ thực thi của các Kế hoạch công tác Ban KT&ĐBCL trong phạm vi, tính từ tiến độ các công việc thực hiện liên kết.",
      sourceType: "PLANS",
      sourceIds: scopedPlans.map((p) => p.id),
    },
  ]

  // =========================================================================
  // MA TRẬN 1: THEO DÕI TIẾN ĐỘ CÔNG VIỆC & BÁO CÁO THEO NHÓM CHUYÊN MÔN BAN KT&ĐBCL
  // =========================================================================
  const memberNameLookup = new Map(ktdbclMembers.map((m) => [m.id, m.fullName]))
  const normalizedGroupsMap = new Map<
    string,
    {
      groupId: string
      groupName: string
      leaderUserId: string | null
      leaderName: string
      memberIds: Set<string>
    }
  >()

  for (const tg of rawTaskGroups as any[]) {
    const parsedMems = tg.memberUserIds ? safeJsonParse<string[]>(tg.memberUserIds, []) : []
    const memSet = new Set<string>(parsedMems.filter((uid) => memberNameLookup.has(uid)))
    if (tg.leaderUserId && memberNameLookup.has(tg.leaderUserId)) {
      memSet.add(tg.leaderUserId)
    }
    for (const m of ktdbclMembers) {
      if (m.specialistGroups?.includes(tg.name)) {
        memSet.add(m.id)
      }
    }
    normalizedGroupsMap.set(tg.name, {
      groupId: tg.id,
      groupName: tg.name,
      leaderUserId: tg.leaderUserId || null,
      leaderName: tg.leaderUserId ? memberNameLookup.get(tg.leaderUserId) || "Trưởng nhóm" : "Điều phối Ban",
      memberIds: memSet,
    })
  }

  for (const defGroupName of KTDBCL_DEFAULT_GROUPS) {
    if (!normalizedGroupsMap.has(defGroupName)) {
      const memSet = new Set<string>(
        ktdbclMembers
          .filter((m) => m.specialistGroups?.includes(defGroupName))
          .map((m) => m.id)
      )
      normalizedGroupsMap.set(defGroupName, {
        groupId: defGroupName,
        groupName: defGroupName,
        leaderUserId: null,
        leaderName: "Điều phối Ban",
        memberIds: memSet,
      })
    }
  }

  const groupProgressMatrix = Array.from(normalizedGroupsMap.values())
    .filter((g) => {
      if (!filters?.groupId || filters.groupId === "ALL") return true
      return g.groupId === filters.groupId || g.groupName === filters.groupId
    })
    .map((g) => {
      const gMemberIds = Array.from(g.memberIds)
      // Tasks explicitly assigned to this TaskGroup OR assigned to members when matching group name
      const gTasks = canonicalTasks.filter((t) => {
        if (t.taskGroupId && (t.taskGroupId === g.groupId || t.taskGroupName === g.groupName)) {
          return true
        }
        if (!t.taskGroupId && t.assignedToUserId && g.memberIds.has(t.assignedToUserId)) {
          return true
        }
        return false
      })
      const gDone = gTasks.filter((t) => t.workStatus === "COMPLETED")
      const gInProgress = gTasks.filter(
        (t) => t.workStatus === "ASSIGNED" || t.workStatus === "IN_PROGRESS"
      )
      const gPendingReview = gTasks.filter((t) => t.workStatus === "PENDING_REVIEW")
      const gOnTime = gDone.filter((t) => t.completedOnTime === true)
      const gOverdue = gTasks.filter((t) => t.isOverdue && t.workStatus !== "COMPLETED")

      // Report items tagged with this group OR submitted by members of this group
      const gReportItems = activeReportItems.filter((it: any) => {
        if (it.taskGroup && it.taskGroup === g.groupName) return true
        if (!it.taskGroup && g.memberIds.has(it.userId)) return true
        return false
      })
      const gCompletedItems = gReportItems.filter((it: any) => {
        const p = String(it.progress || "").toLowerCase()
        return p.includes("hoàn thành") || p === "completed" || p.includes("100%")
      })
      const gConfirmedItems = gReportItems.filter(
        (it: any) =>
          it.meta?.confirmStatus === "MANAGER_CONFIRMED" ||
          it.meta?.confirmStatus === "DIRECTOR_CONFIRMED"
      )
      const gExplainItems = gReportItems.filter(
        (it: any) => it.meta?.confirmStatus === "OVERDUE_EXPLANATION_REQUIRED"
      )

      const gSubmittedMembers = gMemberIds.filter((uid) => submittedOwnerIdsForPeriod.has(uid))

      return {
        groupId: g.groupId,
        groupName: g.groupName,
        leaderName: g.leaderName,
        memberCount: gMemberIds.length,
        totalTasks: gTasks.length,
        inProgressTasks: gInProgress.length,
        pendingReviewTasks: gPendingReview.length,
        completedTasks: gDone.length,
        taskCompletionPercent:
          gTasks.length === 0 ? 0 : Math.round((gDone.length / gTasks.length) * 100),
        onTimeRateDisplay:
          gTasks.length === 0
            ? "Chưa đủ dữ liệu"
            : `${Math.round((gOnTime.length / gTasks.length) * 100)}%`,
        overdueTasks: gOverdue.length,
        submittedMembersCount: gSubmittedMembers.length,
        missingMembersCount: Math.max(0, gMemberIds.length - gSubmittedMembers.length),
        reportItemsCount: gReportItems.length,
        completedReportItemsCount: gCompletedItems.length,
        confirmedItemsCount: gConfirmedItems.length,
        explanationRequiredCount: gExplainItems.length,
        taskIds: gTasks.map((t) => t.id),
      }
    })

  // =========================================================================
  // MA TRẬN 2: THEO DÕI TIẾN ĐỘ CÔNG VIỆC & BÁO CÁO CỦA TỪNG CÁ NHÂN BAN KT&ĐBCL
  // (Sắp xếp chữ cái A-Z khách quan — không xếp hạng nhân sự mặc định)
  // =========================================================================
  const elapsedWeeksCount = Math.max(
    1,
    allWeeksInMonth.filter(
      (w) => new Date(`${w.startYmd}T00:00:00+07:00`).getTime() <= now.getTime()
    ).length
  )

  const memberProgressMatrix = ktdbclMembers
    .filter((m) => {
      if (filters?.userId && filters.userId !== "ALL" && m.id !== filters.userId) return false
      if (filters?.groupId && filters.groupId !== "ALL") {
        const matchedGroup = Array.from(normalizedGroupsMap.values()).find(
          (g) => g.groupId === filters.groupId || g.groupName === filters.groupId
        )
        if (matchedGroup && !matchedGroup.memberIds.has(m.id)) return false
      }
      if (filters?.status === "MISSING_REPORT" && submittedOwnerIdsForPeriod.has(m.id)) {
        return false
      }
      return true
    })
    .map((m) => {
      const mTasks = canonicalTasks.filter(
        (t) => t.assignedToUserId === m.id || t.collaboratorIds.includes(m.id)
      )
      const mPrimaryTasks = canonicalTasks.filter((t) => t.assignedToUserId === m.id)
      const mDone = mTasks.filter((t) => t.workStatus === "COMPLETED")
      const mInProgress = mTasks.filter(
        (t) => t.workStatus === "ASSIGNED" || t.workStatus === "IN_PROGRESS"
      )
      const mPendingReview = mTasks.filter((t) => t.workStatus === "PENDING_REVIEW")
      const mOnTime = mDone.filter((t) => t.completedOnTime === true)
      const mOverdue = mTasks.filter((t) => t.isOverdue && t.workStatus !== "COMPLETED")

      const mPeriodReports = activePeriodReports.filter((r: any) => String(r.userId) === m.id)
      const mAllMonthReports = monthWeeklyReports.filter((r: any) => String(r.userId) === m.id)
      const mSubmittedWeekSet = new Set(
        mAllMonthReports
          .filter((r: any) => (r.items?.length || 0) > 0)
          .map((r: any) => Number(r.weekNumber))
      )
      const mReportItems = activeReportItems.filter((it: any) => it.userId === m.id)
      const mCompletedReportItems = mReportItems.filter((it: any) => {
        const p = String(it.progress || "").toLowerCase()
        return p.includes("hoàn thành") || p === "completed" || p.includes("100%")
      })
      const mConfirmedItems = mReportItems.filter(
        (it: any) =>
          it.meta?.confirmStatus === "MANAGER_CONFIRMED" ||
          it.meta?.confirmStatus === "DIRECTOR_CONFIRMED"
      )
      const mExplainRequired = mReportItems.filter(
        (it: any) => it.meta?.confirmStatus === "OVERDUE_EXPLANATION_REQUIRED"
      )

      const hasSubmittedReport =
        submittedOwnerIdsForPeriod.has(m.id) || mPeriodReports.some((r: any) => (r.items?.length || 0) > 0)
      const latestReport = mPeriodReports[mPeriodReports.length - 1] || null

      // Resolve groups for display
      const memberGroupNames = Array.from(normalizedGroupsMap.values())
        .filter((g) => g.memberIds.has(m.id))
        .map((g) => g.groupName)

      return {
        userId: m.id,
        fullName: m.fullName,
        position: m.position,
        role: m.role,
        isDirector: m.isDirector,
        isManager: m.isManager,
        specialistGroups:
          memberGroupNames.length > 0 ? memberGroupNames : m.specialistGroups || [],
        totalTasks: mTasks.length,
        primaryTasksCount: mPrimaryTasks.length,
        inProgressTasks: mInProgress.length,
        pendingReviewTasks: mPendingReview.length,
        completedTasks: mDone.length,
        onTimeTasks: mOnTime.length,
        overdueTasks: mOverdue.length,
        onTimeRateDisplay:
          mTasks.length === 0
            ? "Chưa đủ dữ liệu"
            : `${Math.round((mOnTime.length / mTasks.length) * 100)}%`,
        hasSubmittedReport,
        submittedWeeksCount: mSubmittedWeekSet.size,
        expectedWeeksCount: elapsedWeeksCount,
        reportItemsCount: mReportItems.length,
        completedReportItemsCount: mCompletedReportItems.length,
        confirmedItemsCount: mConfirmedItems.length,
        explanationRequiredCount: mExplainRequired.length,
        latestReportUpdatedAt: latestReport?.updatedAt
          ? new Date(latestReport.updatedAt).toISOString()
          : null,
        taskIds: mTasks.map((t) => t.id),
      }
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"))

  // Backward-compatible departmentBreakdown & campusBreakdown
  const visibleDepartments = departments.filter(
    (d) =>
      d.code === "KT-ĐBCL" ||
      d.name === "KT&ĐBCL" ||
      d.divisionCode === "BAN_KT_DBCL" ||
      d.id === actor.primaryDepartmentId
  )
  const visibleCampuses = campuses.filter(
    (c) =>
      actor.isExecutive ||
      c.id === actor.primaryCampusId ||
      actor.managedCampusIds?.includes(c.id)
  )

  const departmentBreakdown = visibleDepartments.map((dept) => {
    const dTasks = canonicalTasks.filter((t) => t.departmentId === dept.id)
    const dDone = dTasks.filter((t) => t.workStatus === "COMPLETED")
    const dOnTime = dDone.filter((t) => t.completedOnTime === true)
    const dOverdue = dTasks.filter((t) => t.isOverdue && t.workStatus !== "COMPLETED")
    const dAdhoc = dTasks.filter((t) => t.isAdhoc)
    return {
      departmentId: dept.id,
      departmentCode: dept.code,
      departmentName: dept.name,
      totalTasks: dTasks.length,
      completedTasks: dDone.length,
      onTimeRateDisplay:
        dTasks.length === 0 ? "Chưa đủ dữ liệu" : `${Math.round((dOnTime.length / dTasks.length) * 100)}%`,
      overdueTasks: dOverdue.length,
      adhocTasks: dAdhoc.length,
      staffCount: ktdbclMembers.length,
      submittedReportsCount: ktdbclMembers.length - unsubmittedStaff.length,
      missingReportsCount: unsubmittedStaff.length,
      taskIds: dTasks.map((t) => t.id),
    }
  })

  const campusBreakdown = visibleCampuses.map((camp) => {
    const cTasks = canonicalTasks.filter((t) => t.campusId === camp.id)
    const cDone = cTasks.filter((t) => t.workStatus === "COMPLETED")
    const cOnTime = cDone.filter((t) => t.completedOnTime === true)
    const cOverdue = cTasks.filter((t) => t.isOverdue && t.workStatus !== "COMPLETED")
    return {
      campusId: camp.id,
      campusCode: camp.campusCode,
      campusName: camp.campusName,
      totalTasks: cTasks.length,
      completedTasks: cDone.length,
      onTimeRateDisplay:
        cTasks.length === 0 ? "Chưa đủ dữ liệu" : `${Math.round((cOnTime.length / cTasks.length) * 100)}%`,
      overdueTasks: cOverdue.length,
      staffCount: 0,
      submittedReportsCount: 0,
      missingReportsCount: 0,
      taskIds: cTasks.map((t) => t.id),
    }
  })

  // Issues requiring leadership decision (tasks pending review, overdue explanations, report support requests)
  const decisionItems = [
    ...explanationRequiredItems.slice(0, 6).map((it: any) => ({
      type: "EXPLANATION_REQUIRED" as const,
      code: `Tuần ${it.weekNumber}`,
      title: `Chờ giải trình trễ hạn: ${it.mainTask || it.workContent?.slice(0, 60) || "Đầu việc"}`,
      detail: `Nhân sự: ${memberNameLookup.get(it.userId) || "Thành viên"} • ${
        it.meta?.explanationRequestNote || "Yêu cầu cập nhật nguyên nhân & mốc khắc phục"
      }`,
      linkHref: `/admin/weekly-reports?tab=review&week=${it.weekNumber}&month=${month}&year=${year}`,
    })),
    ...pendingReviewAll.slice(0, 8).map((t) => ({
      type: "PENDING_REVIEW" as const,
      code: t.taskCode,
      title: `Chờ nghiệm thu công việc: ${t.title}`,
      detail: `Người thực hiện: ${t.assignedToName || "—"} • Hạn: ${new Date(t.endDate).toLocaleDateString("vi-VN")}`,
      linkHref: "/admin/tasks",
    })),
    ...scopedReports
      .filter((r) => r.supportRequests && r.supportRequests.trim().length > 0)
      .slice(0, 5)
      .map((r) => ({
        type: "SUPPORT_REQUEST" as const,
        code: r.reportCode,
        title: `Kiến nghị hỗ trợ từ ${r.ownerName} (${r.periodLabel})`,
        detail: r.supportRequests,
        linkHref: "/admin/weekly-reports",
      })),
  ]

  return {
    actor,
    period: {
      periodType,
      year,
      month,
      weekNumber,
      allWeeks: allWeeksInMonth,
      periodKey: periodWin.periodKey,
      periodLabel: periodWin.periodLabel,
    },
    individualCards,
    managerCards,
    myKpis: myKpiEval.evaluations,
    myPriorityTasks: [...myTodo]
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
      .slice(0, 10),
    groupProgressMatrix,
    memberProgressMatrix,
    departmentBreakdown,
    campusBreakdown,
    unsubmittedStaff: unsubmittedStaff.slice(0, 50).map((u) => ({
      userId: u.id,
      fullName: u.fullName,
      position: u.position || u.role,
    })),
    decisionItems,
    filterOptions: {
      groups: Array.from(normalizedGroupsMap.values()).map((g) => ({
        id: g.groupId,
        name: g.groupName,
      })),
      departments: visibleDepartments,
      campuses: visibleCampuses,
      users: ktdbclMembers.map((u) => ({ id: u.id, fullName: u.fullName })),
    },
    drilldownCatalog: {
      tasks: canonicalTasks,
      reports: scopedReports,
      plans: scopedPlans,
    },
  }
}

/**
 * AI Hỗ trợ Báo cáo (Section 9):
 * - Chỉ đọc dữ liệu trong phạm vi quyền của người dùng.
 * - Tách bạch 3 lớp: Dữ kiện nguồn (systemFacts), Nhận xét người dùng (userNarrative), và Gợi ý AI (aiSuggestions).
 * - Phát hiện thiếu minh chứng hoặc mâu thuẫn số liệu.
 * - Không tự bịa minh chứng/điểm KPI, không tự gửi/duyệt.
 * - Thông báo rõ trạng thái nếu máy chủ chưa cấu hình GEMINI_API_KEY.
 */
export async function generateWorkHubAiReportAssist(params: {
  actor: WorkHubActorScope
  snapshot: WorkHubReportSnapshotMetrics
  scopedTasks: WorkHubTaskRecord[]
  currentDraft: {
    executiveCommentary: string
    blockersAndCauses: string
    supportRequests: string
    nextPeriodPlan: string
  }
}): Promise<{
  aiConfigured: boolean
  aiStatusMessage: string
  systemFacts: Array<{ refCode: string; factText: string }>
  userNarrativeEcho: {
    executiveCommentary: string
    blockersAndCauses: string
    supportRequests: string
    nextPeriodPlan: string
  }
  auditAlerts: Array<{
    severity: "WARNING" | "ERROR"
    refCode: string
    message: string
  }>
  priorityQueue: Array<{
    taskId: string
    taskCode: string
    title: string
    priority: string
    endDate: string
    reason: string
  }>
  aiSuggestions: {
    suggestedSummary: string
    suggestedBlockersSummary: string
    suggestedNextPeriodPlan: string
  }
}> {
  const { snapshot, scopedTasks, currentDraft } = params

  // 1. Dữ kiện nguồn xác thực (System Facts) gắn mã tham chiếu cụ thể
  const systemFacts: Array<{ refCode: string; factText: string }> = [
    {
      refCode: "SNAPSHOT_TOTAL",
      factText: `Tổng số đầu việc lá trong phạm vi kỳ báo cáo: ${snapshot.totalCanonicalTasks} công việc (Hoàn thành: ${snapshot.completedInPeriodCount}, Đang thực hiện: ${snapshot.inProgressAtCutoffCount}, Quá hạn: ${snapshot.overdueCount}, Phát sinh: ${snapshot.adhocCount}).`,
    },
  ]

  for (const d of snapshot.deliverablesSummary.slice(0, 8)) {
    systemFacts.push({
      refCode: d.taskCode,
      factText: `[${d.taskCode}] "${d.title}" — Trạng thái: ${d.workStatus}${
        d.resultSummary ? ` • Kết quả gốc: ${sanitizeUntrustedReferenceData(d.resultSummary, 120)}` : ""
      } • Minh chứng: ${d.hasEvidence ? "Đã đính kèm" : "Chưa có tệp/liên kết"}.`,
    })
  }

  for (const k of snapshot.kpiSummary) {
    systemFacts.push({
      refCode: k.kpiCode,
      factText: `[${k.kpiCode}] ${k.kpiName}: Thực tế = ${k.actualDisplay} (Mục tiêu: ${k.targetDisplay}).`,
    })
  }

  // 2. Kiểm toán thiếu minh chứng & không khớp số liệu (Deterministic Audit)
  const auditAlerts: Array<{ severity: "WARNING" | "ERROR"; refCode: string; message: string }> = []

  for (const d of snapshot.deliverablesSummary) {
    if ((d.workStatus === "COMPLETED" || d.workStatus === "PENDING_REVIEW") && !d.hasEvidence) {
      auditAlerts.push({
        severity: "WARNING",
        refCode: d.taskCode,
        message: `Công việc [${d.taskCode}] "${d.title}" đang ở trạng thái ${
          d.workStatus === "COMPLETED" ? "Hoàn thành" : "Chờ nghiệm thu"
        } nhưng chưa đính kèm tệp hoặc liên kết minh chứng sản phẩm đầu ra.`,
      })
    }
  }

  // Kiểm tra nếu người dùng viết "0 quá hạn" hoặc "không có việc quá hạn" trong khi snapshot.overdueCount > 0
  const lowerCommentary = (currentDraft.executiveCommentary || "").toLowerCase()
  if (
    snapshot.overdueCount > 0 &&
    (lowerCommentary.includes("không có việc quá hạn") ||
      lowerCommentary.includes("0 việc quá hạn") ||
      lowerCommentary.includes("100% đúng hạn"))
  ) {
    auditAlerts.push({
      severity: "ERROR",
      refCode: "MISMATCH_OVERDUE",
      message: `Phần diễn giải nêu không có việc quá hạn, nhưng dữ liệu nguồn đang ghi nhận ${snapshot.overdueCount} công việc quá hạn (${snapshot.overdueTaskIds.length} mã việc). Vui lòng kiểm tra lại.`,
    })
  }

  // Kiểm tra nếu người dùng ghi số lượng hoàn thành lệch hẳn với snapshot
  const claimedDoneMatch = lowerCommentary.match(/hoàn thành\s+(\d+)\s+(?:công việc|đầu việc|nhiệm vụ)/i)
  if (claimedDoneMatch) {
    const claimedNum = Number(claimedDoneMatch[1])
    if (claimedNum !== snapshot.completedInPeriodCount) {
      auditAlerts.push({
        severity: "WARNING",
        refCode: "MISMATCH_COMPLETED",
        message: `Diễn giải ghi "hoàn thành ${claimedNum} công việc", không khớp với số liệu nguồn đã nghiệm thu là ${snapshot.completedInPeriodCount} công việc.`,
      })
    }
  }

  // 3. Gợi ý thứ tự việc cần ưu tiên dựa trên mức ưu tiên (priority) và hạn chót (endDate) đã lưu
  const priorityRank: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
  const openTasks = scopedTasks.filter(
    (t) => t.workStatus !== "COMPLETED" && t.workStatus !== "CANCELLED" && t.workStatus !== "DRAFT"
  )
  const sortedPriority = [...openTasks]
    .sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
      const pDiff = (priorityRank[b.priority] || 1) - (priorityRank[a.priority] || 1)
      if (pDiff !== 0) return pDiff
      return new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
    })
    .slice(0, 6)

  const priorityQueue = sortedPriority.map((t) => ({
    taskId: t.id,
    taskCode: t.taskCode,
    title: t.title,
    priority: t.priority,
    endDate: t.endDate,
    reason: t.isOverdue
      ? `Đã quá hạn (${new Date(t.endDate).toLocaleDateString("vi-VN")}) • Ưu tiên ${t.priority}`
      : `Mức ưu tiên ${t.priority} • Hạn hoàn thành ${new Date(t.endDate).toLocaleDateString("vi-VN")}`,
  }))

  // 4. Dự thảo mặc định dựa trên dữ liệu gốc (không bịa đặt)
  const completedListText = snapshot.deliverablesSummary
    .filter((d) => d.workStatus === "COMPLETED")
    .slice(0, 5)
    .map((d) => `[${d.taskCode}] ${d.title}`)
    .join("; ")

  let suggestedSummary = `Trong kỳ báo cáo, tổng số công việc triển khai là ${snapshot.totalCanonicalTasks} đầu việc; đã được nghiệm thu hoàn thành ${snapshot.completedInPeriodCount} đầu việc${
    completedListText ? ` (${completedListText})` : ""
  }, đang thực hiện ${snapshot.inProgressAtCutoffCount} đầu việc và có ${snapshot.adhocCount} đầu việc phát sinh.`

  let suggestedBlockersSummary =
    snapshot.overdueCount > 0
      ? `Ghi nhận ${snapshot.overdueCount} công việc quá hạn cần rà soát tiến độ và bổ sung nguyên nhân thực tế từ người phụ trách.`
      : "Chưa ghi nhận công việc quá hạn trên dữ liệu nguồn trong kỳ."

  let suggestedNextPeriodPlan =
    priorityQueue.length > 0
      ? `Tập trung xử lý theo thứ tự ưu tiên & thời hạn: ${priorityQueue
          .map((p) => `[${p.taskCode}] ${p.title} (hạn ${new Date(p.endDate).toLocaleDateString("vi-VN")})`)
          .join("; ")}.`
      : "Tiếp tục triển khai các hạng mục theo kế hoạch công tác kỳ tiếp theo."

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return {
      aiConfigured: false,
      aiStatusMessage:
        "Hệ thống hiện chưa cấu hình khóa GEMINI_API_KEY trên máy chủ. Đang sử dụng chế độ tổng hợp tự động từ dữ liệu nguồn & bộ quy tắc kiểm tra minh chứng chuẩn.",
      systemFacts,
      userNarrativeEcho: currentDraft,
      auditAlerts,
      priorityQueue,
      aiSuggestions: {
        suggestedSummary,
        suggestedBlockersSummary,
        suggestedNextPeriodPlan,
      },
    }
  }

  // Khi có GEMINI_API_KEY: làm giàu diễn đạt nhưng bắt buộc bám sát mã nguồn và cấm bịa số liệu
  try {
    const ai = new GoogleGenerativeAI(apiKey)
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" })
    const safeFactsPayload = JSON.stringify({
      facts: systemFacts,
      priorityQueue: priorityQueue.map((p) => ({
        code: p.taskCode,
        title: p.title,
        reason: p.reason,
      })),
      auditCount: auditAlerts.length,
    })

    const prompt = `Bạn là Trợ lý Soạn thảo Báo cáo WorkHub của hệ thống giáo dục SSM Sky-Line.
QUY TẮC BẮT BUỘC:
1. CHỈ sử dụng các dữ kiện có trong <verified_facts>. Tuyệt đối KHÔNG tự bịa kết quả, nguyên nhân, minh chứng hay điểm KPI.
2. Mỗi nhận định phải đính kèm mã công việc hoặc mã chỉ số tương ứng trong ngoặc vuông (ví dụ [WH-2026-0001]).
<verified_facts>${safeFactsPayload}</verified_facts>
Trả về JSON thuần (không bọc markdown):
{
  "suggestedSummary": "Đoạn tóm tắt kết quả thực hiện ngắn gọn gắn mã công việc nguồn",
  "suggestedBlockersSummary": "Tóm tắt tồn đọng/quá hạn dựa đúng trên dữ kiện nguồn",
  "suggestedNextPeriodPlan": "Gợi ý kế hoạch kỳ tiếp theo gắn mã các việc ưu tiên"
}`

    const res = await model.generateContent(prompt)
    const cleanTxt = res.response
      .text()
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim()
    const parsed = JSON.parse(cleanTxt)
    if (parsed.suggestedSummary) suggestedSummary = String(parsed.suggestedSummary).trim()
    if (parsed.suggestedBlockersSummary)
      suggestedBlockersSummary = String(parsed.suggestedBlockersSummary).trim()
    if (parsed.suggestedNextPeriodPlan)
      suggestedNextPeriodPlan = String(parsed.suggestedNextPeriodPlan).trim()

    return {
      aiConfigured: true,
      aiStatusMessage:
        "Đã kích hoạt AI hỗ trợ báo cáo (Gemini). Vui lòng kiểm tra gợi ý của AI trước khi chèn vào báo cáo; AI không tự động gửi hay phê duyệt.",
      systemFacts,
      userNarrativeEcho: currentDraft,
      auditAlerts,
      priorityQueue,
      aiSuggestions: {
        suggestedSummary,
        suggestedBlockersSummary,
        suggestedNextPeriodPlan,
      },
    }
  } catch {
    return {
      aiConfigured: false,
      aiStatusMessage:
        "Dịch vụ AI tạm thời không phản hồi; hệ thống đã chuyển sang bản dự thảo chuẩn trực tiếp từ dữ liệu nguồn.",
      systemFacts,
      userNarrativeEcho: currentDraft,
      auditAlerts,
      priorityQueue,
      aiSuggestions: {
        suggestedSummary,
        suggestedBlockersSummary,
        suggestedNextPeriodPlan,
      },
    }
  }
}

/**
 * Cấu hình & Gửi thông báo nhắc việc gộp (Digest Batching + Anti-Duplicate) — Section 10
 */
export async function getWorkHubReminderSettings(): Promise<WorkHubReminderConfig> {
  await ensureWorkHubSchema()
  const pAny = prisma as any
  const fallback: WorkHubReminderConfig = {
    id: "WORKHUB_DEFAULT",
    dueSoonHours: 48,
    enableDueSoon: true,
    enableOverdue: true,
    enablePendingReview: true,
    enableReportDeadline: true,
    digestFrequency: "DAILY_DIGEST",
    sendEmailDigest: false,
    reportDeadlineDayOfWeek: 5,
    updatedByName: null,
    updatedAt: null,
  }
  if (typeof pAny.$queryRawUnsafe !== "function") return fallback
  try {
    const rows: any[] = await pAny.$queryRawUnsafe(
      `SELECT * FROM "workhub_reminder_settings" WHERE "id" = 'WORKHUB_DEFAULT' LIMIT 1`
    )
    const r = rows?.[0]
    if (!r) return fallback
    return {
      id: "WORKHUB_DEFAULT",
      dueSoonHours: Number(r.dueSoonHours || 48),
      enableDueSoon: Boolean(Number(r.enableDueSoon ?? 1)),
      enableOverdue: Boolean(Number(r.enableOverdue ?? 1)),
      enablePendingReview: Boolean(Number(r.enablePendingReview ?? 1)),
      enableReportDeadline: Boolean(Number(r.enableReportDeadline ?? 1)),
      digestFrequency: r.digestFrequency || "DAILY_DIGEST",
      sendEmailDigest: Boolean(Number(r.sendEmailDigest ?? 0)),
      reportDeadlineDayOfWeek: Number(r.reportDeadlineDayOfWeek ?? 5),
      updatedByName: r.updatedByName || null,
      updatedAt: r.updatedAt ? String(r.updatedAt) : null,
    }
  } catch {
    return fallback
  }
}

export async function saveWorkHubReminderSettings(
  actor: WorkHubActorScope,
  patch: Partial<WorkHubReminderConfig>
): Promise<WorkHubReminderConfig> {
  await ensureWorkHubSchema()
  if (!actor.canManageSettings) {
    throw new WorkHubForbiddenError("Chỉ Quản trị viên / Ban điều hành mới được thay đổi cấu hình nhắc việc hệ thống.")
  }
  const cur = await getWorkHubReminderSettings()
  const merged: WorkHubReminderConfig = {
    ...cur,
    ...patch,
    id: "WORKHUB_DEFAULT",
    updatedByName: actor.userName,
    updatedAt: new Date().toISOString(),
  }

  const pAny = prisma as any
  await pAny.$executeRawUnsafe(
    `INSERT INTO "workhub_reminder_settings" (
      "id", "dueSoonHours", "enableDueSoon", "enableOverdue",
      "enablePendingReview", "enableReportDeadline", "digestFrequency",
      "sendEmailDigest", "reportDeadlineDayOfWeek", "updatedByName", "updatedAt"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT("id") DO UPDATE SET
      "dueSoonHours" = excluded."dueSoonHours",
      "enableDueSoon" = excluded."enableDueSoon",
      "enableOverdue" = excluded."enableOverdue",
      "enablePendingReview" = excluded."enablePendingReview",
      "enableReportDeadline" = excluded."enableReportDeadline",
      "digestFrequency" = excluded."digestFrequency",
      "sendEmailDigest" = excluded."sendEmailDigest",
      "reportDeadlineDayOfWeek" = excluded."reportDeadlineDayOfWeek",
      "updatedByName" = excluded."updatedByName",
      "updatedAt" = excluded."updatedAt"`,
    merged.id,
    merged.dueSoonHours,
    merged.enableDueSoon ? 1 : 0,
    merged.enableOverdue ? 1 : 0,
    merged.enablePendingReview ? 1 : 0,
    merged.enableReportDeadline ? 1 : 0,
    merged.digestFrequency,
    merged.sendEmailDigest ? 1 : 0,
    merged.reportDeadlineDayOfWeek,
    merged.updatedByName,
    merged.updatedAt
  )

  await recordWorkHubSystemAudit({
    actor,
    action: "REMINDER_SETTINGS_UPDATED",
    targetTable: "workhub_reminder_settings",
    targetId: "WORKHUB_DEFAULT",
    newValues: merged,
  })

  return merged
}

/**
 * Chạy tác vụ gộp thông báo nhắc việc (Digest) chống gửi trùng theo chu kỳ tần suất đã cấu hình
 */
export async function dispatchWorkHubDigestReminders(options?: {
  referenceNow?: Date
  force?: boolean
}): Promise<{
  processedUsers: number
  notificationsSent: number
  emailsSent: number
  duplicatesSkipped: number
}> {
  await ensureWorkHubSchema()
  const config = await getWorkHubReminderSettings()
  const now = options?.referenceNow || new Date()
  const ymd = now.toISOString().slice(0, 10)
  const halfWeekBucket = now.getUTCDay() <= 3 ? "H1" : "H2"
  const bucketKey =
    config.digestFrequency === "TWICE_WEEKLY"
      ? `${ymd.slice(0, 7)}_${halfWeekBucket}`
      : ymd

  const systemActor: WorkHubActorScope = {
    userId: "SYSTEM",
    userName: "Hệ thống WorkHub",
    email: null,
    roleCode: "ADMIN",
    roleTier: "EXECUTIVE",
    isSuperAdmin: true,
    isExecutive: true,
    isDepartmentHead: false,
    isCampusHead: false,
    canAssignTasks: true,
    canViewOrgTracking: true,
    canManageSettings: true,
    canManageKpiDefinitions: true,
    primaryDepartmentId: null,
    primaryDepartmentName: null,
    primaryCampusId: null,
    primaryCampusName: null,
    managedDepartmentIds: null,
    managedCampusIds: null,
    scopedUserIds: null,
  }

  const allTasks = await listScopedWorkHubTasks(systemActor, {
    dueSoonHours: config.dueSoonHours,
    referenceNow: now,
  })

  // Group items per recipient user so each user receives AT MOST 1 consolidated notification per cycle!
  const perUserBuckets = new Map<
    string,
    {
      dueSoon: WorkHubTaskRecord[]
      overdue: WorkHubTaskRecord[]
      pendingReviewForReviewer: WorkHubTaskRecord[]
    }
  >()

  const ensureBucket = (uid: string) => {
    if (!perUserBuckets.has(uid)) {
      perUserBuckets.set(uid, { dueSoon: [], overdue: [], pendingReviewForReviewer: [] })
    }
    return perUserBuckets.get(uid)!
  }

  for (const t of allTasks) {
    if (t.workStatus === "COMPLETED" || t.workStatus === "CANCELLED" || t.workStatus === "DRAFT") {
      continue
    }
    if (config.enableOverdue && t.isOverdue && t.assignedToUserId) {
      ensureBucket(t.assignedToUserId).overdue.push(t)
    } else if (config.enableDueSoon && t.dueSoon && t.assignedToUserId) {
      ensureBucket(t.assignedToUserId).dueSoon.push(t)
    }
    if (config.enablePendingReview && t.workStatus === "PENDING_REVIEW" && t.reviewerUserId) {
      ensureBucket(t.reviewerUserId).pendingReviewForReviewer.push(t)
    }
  }

  const pAny = prisma as any
  let notificationsSent = 0
  let emailsSent = 0
  let duplicatesSkipped = 0

  for (const [userId, bucket] of perUserBuckets.entries()) {
    const totalItems =
      bucket.overdue.length + bucket.dueSoon.length + bucket.pendingReviewForReviewer.length
    if (totalItems === 0) continue

    const dedupKey = `WH_DIGEST_${userId}_${bucketKey}`
    if (!options?.force) {
      const existing: any[] = await pAny.$queryRawUnsafe(
        `SELECT "id" FROM "workhub_reminder_logs" WHERE "dedupKey" = ? LIMIT 1`,
        dedupKey
      )
      if (existing && existing.length > 0) {
        duplicatesSkipped++
        continue
      }
    }

    const parts: string[] = []
    if (bucket.overdue.length > 0) parts.push(`${bucket.overdue.length} việc quá hạn`)
    if (bucket.dueSoon.length > 0) parts.push(`${bucket.dueSoon.length} việc sắp đến hạn`)
    if (bucket.pendingReviewForReviewer.length > 0)
      parts.push(`${bucket.pendingReviewForReviewer.length} việc chờ bạn nghiệm thu`)

    const summaryText = `Tổng hợp nhắc việc WorkHub: ${parts.join(", ")}.`

    await prisma.notification.create({
      data: {
        userId,
        title: `[WorkHub] Nhắc việc tổng hợp (${totalItems} mục)`,
        message: summaryText,
        link: "/admin/workhub/my-tasks",
        category: "WORKHUB_DIGEST",
        sourceModule: "WORKHUB",
      },
    })
    notificationsSent++

    await pAny.$executeRawUnsafe(
      `INSERT INTO "workhub_reminder_logs" (
        "id", "dedupKey", "recipientUserId", "digestType", "itemsCount", "summaryText", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT("dedupKey") DO UPDATE SET
        "itemsCount" = excluded."itemsCount",
        "summaryText" = excluded."summaryText",
        "createdAt" = excluded."createdAt"`,
      makeWorkHubId("whrlog"),
      options?.force ? `${dedupKey}_FORCE_${Date.now()}` : dedupKey,
      userId,
      config.digestFrequency,
      totalItems,
      summaryText,
      now.toISOString()
    )

    if (config.sendEmailDigest) {
      const userRec = await prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true, email: true, teacher: { select: { email: true } } },
      })
      const email = userRec?.teacher?.email || userRec?.email
      if (email && email.includes("@")) {
        const html = renderSkylineEmail({
          headerBadge: "WORKHUB • TỔNG HỢP NHẮC VIỆC",
          headerTitle: `Nhắc việc tổng hợp trong ngày (${totalItems} hạng mục)`,
          headerTheme: bucket.overdue.length > 0 ? "rose" : "teal",
          recipientName: userRec?.fullName || "Thầy/Cô",
          introMessage: summaryText,
          details: [
            { label: "Công việc quá hạn", value: `${bucket.overdue.length} việc` },
            { label: "Công việc sắp đến hạn", value: `${bucket.dueSoon.length} việc` },
            { label: "Chờ bạn nghiệm thu", value: `${bucket.pendingReviewForReviewer.length} việc` },
          ],
          button: {
            text: "Mở WorkHub xử lý ngay",
            url: `${process.env.NEXTAUTH_URL || "https://ssm.skylineschool.edu.vn"}/admin/workhub/my-tasks`,
            color: "#003B3A",
          },
        })
        const mailRes = await sendEmail({
          to: email,
          subject: `[WorkHub Sky-Line] Nhắc việc tổng hợp (${parts.join(", ")})`,
          html,
        })
        if (mailRes.success) emailsSent++
      }
    }
  }

  return {
    processedUsers: perUserBuckets.size,
    notificationsSent,
    emailsSent,
    duplicatesSkipped,
  }
}
