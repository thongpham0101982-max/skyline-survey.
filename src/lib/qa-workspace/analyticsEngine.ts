import { computeTaskDeadlineStatus } from "./workflowEngine"
import { QaWorkflowStatus } from "./types"

export interface QaRateMetricDefinition {
  code: string
  label: string
  numerator: number
  denominator: number
  denominatorLabel: string
  percentage: number | null // null khi mẫu số = 0
  formulaText: string
  scopeText: string
  scopeDescription: string
}

export interface QaGroupAnalyticsRow {
  key: string
  label: string
  groupId: string
  groupName: string
  leaderName: string | null
  memberCount: number
  total: number
  totalTasks: number
  openCount: number
  inProgressCount: number
  pendingReviewCount: number
  needsRevisionCount: number
  completedCount: number
  onTimeCount: number
  completedOnTimeCount: number
  lateSubmittedCount: number
  completedLateCount: number
  overdueUnsubmittedCount: number
  overdueExecutionCount: number
  overdueReviewCount: number
  unresolvedBlockerCount: number
  completionRate: QaRateMetricDefinition
  onTimeSubmissionRate: QaRateMetricDefinition
}

export interface QaMemberAnalyticsRow {
  userId: string
  fullName: string
  role: string
  groupNames: string[]
  totalAssigned: number
  inProgressCount: number
  dueSoonCount: number
  overdueExecutionCount: number
  overdueReviewCount: number
  pendingReviewCount: number
  completedCount: number
  completedOnTimeCount: number
  completedLateCount: number
  unresolvedBlockerCount: number
  evidenceCount: number
  completionRate: QaRateMetricDefinition
}

export interface QaAnalyticsSummary {
  generatedAt: string
  scopeDescription: string
  governanceDisclaimer: string
  counts: {
    totalActiveScope: number
    totalActivePool: number
    openAssigned: number
    openCount: number
    inProgress: number
    inProgressCount: number
    pendingReview: number
    pendingReviewCount: number
    needsRevision: number
    completedTotal: number
    completedCount: number
    completedOnTime: number
    completedLate: number
    overdueExecution: number
    overdueUnsubmittedCount: number
    overdueReview: number
    dueSoon: number
    pausedOrCancelled: number
    unresolvedBlockers: number
    qualityEvaluatedCount: number
  }
  rates: {
    overallCompletionRate: QaRateMetricDefinition
    completionRate: QaRateMetricDefinition
    onTimeCompletionRate: QaRateMetricDefinition
    onTimeSubmissionRate: QaRateMetricDefinition
    lateSubmissionRate: QaRateMetricDefinition
    overdueUnsubmittedRate: QaRateMetricDefinition
    reviewSlaComplianceRate: QaRateMetricDefinition
    capaActionCompletionRate: QaRateMetricDefinition
    capaVerifiedEffectivenessRate: QaRateMetricDefinition
  }
  improvementSummary: {
    totalActions: number
    actionCompletedCount: number
    effectivenessVerifiedCount: number
    verifiedEffectivenessRate: QaRateMetricDefinition
  }
  byGroup: QaGroupAnalyticsRow[]
  byMember: QaMemberAnalyticsRow[]
  byCategory: Array<{
    category: string
    total: number
    completed: number
    inProgress: number
    pendingReview: number
    overdue: number
  }>
}

function buildRateMetric(
  code: string,
  label: string,
  numerator: number,
  denominator: number,
  formulaText: string,
  scopeText: string,
  denominatorLabel?: string
): QaRateMetricDefinition {
  return {
    code,
    label,
    numerator,
    denominator,
    denominatorLabel: denominatorLabel || `Tổng số hồ sơ trong mẫu số (N=${denominator})`,
    percentage: denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(1)) : null,
    formulaText,
    scopeText,
    scopeDescription: scopeText,
  }
}

export function computeQaWorkspaceAnalytics(params: {
  tasks: any[]
  taskGroups?: any[]
  staffUsers?: any[]
  improvementActions?: any[]
  scopeLabel?: string
  scopeDescription?: string
  now?: Date
}): QaAnalyticsSummary {
  const {
    tasks = [],
    taskGroups = [],
    staffUsers = [],
    improvementActions = [],
    now = new Date(),
  } = params
  const scopeLabel =
    params.scopeDescription || params.scopeLabel || "Toàn bộ nhiệm vụ trong bộ lọc hiện tại"

  // Loại trừ các nhiệm vụ Đã hủy khỏi mẫu số tính tiến độ thực hiện
  const activeTasks = tasks.filter((t) => {
    const wf: QaWorkflowStatus =
      t.workflowStatus || t.qaMeta?.workflowStatus || "ASSIGNED"
    return wf !== "CANCELLED"
  })

  let openAssigned = 0
  let inProgress = 0
  let pendingReview = 0
  let needsRevision = 0
  let completedTotal = 0
  let completedOnTime = 0
  let completedLate = 0
  let overdueExecution = 0
  let overdueReview = 0
  let dueSoon = 0
  let pausedOrCancelled = tasks.length - activeTasks.length
  let unresolvedBlockers = 0
  let qualityEvaluatedCount = 0

  for (const t of activeTasks) {
    const wf: QaWorkflowStatus =
      t.workflowStatus || t.qaMeta?.workflowStatus || "ASSIGNED"
    const dl = computeTaskDeadlineStatus(
      {
        endDate: t.endDate,
        completedAt: t.completedAt,
        workflowStatus: wf,
        reviewDueDate: t.reviewDueDate ?? t.qaMeta?.reviewDueDate,
        submittedForReviewAt:
          t.submittedForReviewAt ?? t.qaMeta?.submittedForReviewAt,
        checklist: t.checklist ?? t.qaMeta?.checklist,
      },
      now
    )

    if (wf === "PAUSED") {
      pausedOrCancelled++
      continue
    }

    if (wf === "DRAFT" || wf === "ASSIGNED") openAssigned++
    else if (wf === "IN_PROGRESS") inProgress++
    else if (wf === "PENDING_REVIEW") pendingReview++
    else if (wf === "NEEDS_REVISION") needsRevision++
    else if (wf === "COMPLETED") completedTotal++

    if (dl.code === "COMPLETED_ON_TIME") completedOnTime++
    else if (dl.code === "COMPLETED_LATE") completedLate++
    else if (dl.code === "OVERDUE_EXECUTION") overdueExecution++
    else if (dl.code === "OVERDUE_REVIEW") overdueReview++
    else if (dl.code === "DUE_SOON") dueSoon++

    const hasBlocker =
      Number(t.unresolvedBlockersCount || 0) > 0 ||
      (t.comments || []).some(
        (c: any) => c.commentType === "BLOCKER" && c.actionStatus !== "RESOLVED"
      )
    if (hasBlocker) unresolvedBlockers++

    const rating = t.reviewRating ?? t.qaMeta?.reviewRating
    if (rating && rating !== "CHUA_DANH_GIA") {
      qualityEvaluatedCount++
    }
  }

  const executableDenominator =
    openAssigned + inProgress + pendingReview + needsRevision + completedTotal
  const dueOrCompletedDenominator = completedTotal + overdueExecution

  // CAPA Metrics: tách rõ "Hoàn thành hành động" khỏi "Xác nhận hiệu quả"
  const totalCapa = improvementActions.filter((a) => a.status !== "CANCELLED").length
  const capaActionCompleted = improvementActions.filter((a) =>
    [
      "COMPLETED",
      "PENDING_VERIFICATION",
      "ACTION_COMPLETED_PENDING_VERIFY",
      "VERIFIED_EFFECTIVE",
      "CLOSED",
    ].includes(String(a.status || "").toUpperCase())
  ).length
  const capaVerifiedEffective = improvementActions.filter(
    (a) =>
      ["VERIFIED_EFFECTIVE", "CLOSED"].includes(String(a.status || "").toUpperCase()) &&
      Boolean(a.verifiedAt || a.postImprovementEffectiveness || a.verificationResult)
  ).length

  const reviewDenominator = pendingReview + completedTotal
  const reviewOnTimeNumerator = Math.max(0, reviewDenominator - overdueReview)

  // Group breakdown (either from configured taskGroups or derived from tasks)
  const effectiveGroups =
    taskGroups.length > 0
      ? taskGroups
      : Array.from(
          new Map(
            activeTasks.map((t) => [
              t.taskGroupId || "ALL",
              {
                id: t.taskGroupId || "ALL",
                name: t.taskGroupName || t.taskGroup?.name || "Toàn Ban",
              },
            ])
          ).values()
        )

  const byGroup: QaGroupAnalyticsRow[] = effectiveGroups.map((g: any) => {
    let members: string[] = []
    try {
      members =
        typeof g.memberUserIds === "string"
          ? JSON.parse(g.memberUserIds)
          : Array.isArray(g.memberUserIdsList)
          ? g.memberUserIdsList
          : []
    } catch {}

    const leader = staffUsers.find((u) => u.id === g.leaderUserId)
    const gTasks = activeTasks.filter(
      (t) =>
        t.taskGroupId === g.id ||
        t.taskGroup?.id === g.id ||
        t.taskGroup?.name === g.name ||
        t.taskGroupName === g.name
    )

    let gOpen = 0
    let gInProg = 0
    let gReview = 0
    let gRevise = 0
    let gComp = 0
    let gOnTime = 0
    let gLate = 0
    let gOverExec = 0
    let gOverRev = 0
    let gBlockers = 0

    for (const t of gTasks) {
      const wf: QaWorkflowStatus =
        t.workflowStatus || t.qaMeta?.workflowStatus || "ASSIGNED"
      if (wf === "PAUSED") continue
      const dl = computeTaskDeadlineStatus(
        {
          endDate: t.endDate,
          completedAt: t.completedAt,
          workflowStatus: wf,
          reviewDueDate: t.reviewDueDate ?? t.qaMeta?.reviewDueDate,
          submittedForReviewAt:
            t.submittedForReviewAt ?? t.qaMeta?.submittedForReviewAt,
          checklist: t.checklist ?? t.qaMeta?.checklist,
        },
        now
      )
      if (wf === "DRAFT" || wf === "ASSIGNED") gOpen++
      else if (wf === "IN_PROGRESS") gInProg++
      else if (wf === "PENDING_REVIEW") gReview++
      else if (wf === "NEEDS_REVISION") gRevise++
      else if (wf === "COMPLETED") gComp++

      if (dl.code === "COMPLETED_ON_TIME") gOnTime++
      else if (dl.code === "COMPLETED_LATE") gLate++
      else if (dl.code === "OVERDUE_EXECUTION") gOverExec++
      else if (dl.code === "OVERDUE_REVIEW") gOverRev++

      if (
        Number(t.unresolvedBlockersCount || 0) > 0 ||
        (t.comments || []).some(
          (c: any) => c.commentType === "BLOCKER" && c.actionStatus !== "RESOLVED"
        )
      ) {
        gBlockers++
      }
    }

    const gTotal = gOpen + gInProg + gReview + gRevise + gComp
    return {
      key: g.id,
      label: g.name,
      groupId: g.id,
      groupName: g.name,
      leaderName: leader?.fullName || null,
      memberCount: members.length,
      total: gTotal,
      totalTasks: gTotal,
      openCount: gOpen,
      inProgressCount: gInProg,
      pendingReviewCount: gReview,
      needsRevisionCount: gRevise,
      completedCount: gComp,
      onTimeCount: gOnTime,
      completedOnTimeCount: gOnTime,
      lateSubmittedCount: gLate,
      completedLateCount: gLate,
      overdueUnsubmittedCount: gOverExec,
      overdueExecutionCount: gOverExec,
      overdueReviewCount: gOverRev,
      unresolvedBlockerCount: gBlockers,
      completionRate: buildRateMetric(
        `GRP_COMP_${g.id}`,
        `Tỷ lệ hoàn thành (${g.name})`,
        gComp,
        gTotal,
        "Số nhiệm vụ đã duyệt Hoàn thành / Tổng nhiệm vụ hiệu lực của nhóm",
        `Nhóm ${g.name} (N = ${gTotal})`
      ),
      onTimeSubmissionRate: buildRateMetric(
        `GRP_ONTIME_${g.id}`,
        `Tỷ lệ đúng hạn (${g.name})`,
        gOnTime,
        gComp + gOverExec,
        "Số nhiệm vụ hoàn thành đúng hạn / (Số nhiệm vụ đã hoàn thành + Số nhiệm vụ đang chậm thực hiện)",
        `Nhóm ${g.name} (N = ${gComp + gOverExec})`
      ),
    }
  })

  const byMember: QaMemberAnalyticsRow[] = staffUsers
    .map((u) => {
      const userGroups = taskGroups
        .filter((g) => {
          if (g.leaderUserId === u.id) return true
          try {
            const mIds =
              typeof g.memberUserIds === "string"
                ? JSON.parse(g.memberUserIds)
                : Array.isArray(g.memberUserIdsList)
                ? g.memberUserIdsList
                : []
            return mIds.includes(u.id)
          } catch {
            return false
          }
        })
        .map((g) => g.name)

      const uTasks = activeTasks.filter((t) => t.assignedToUserId === u.id)
      let uInProg = 0
      let uDueSoon = 0
      let uOverExec = 0
      let uOverRev = 0
      let uReview = 0
      let uComp = 0
      let uOnTime = 0
      let uLate = 0
      let uBlockers = 0
      let uEvidence = 0

      for (const t of uTasks) {
        const wf: QaWorkflowStatus =
          t.workflowStatus || t.qaMeta?.workflowStatus || "ASSIGNED"
        if (wf === "PAUSED") continue
        const dl = computeTaskDeadlineStatus(
          {
            endDate: t.endDate,
            completedAt: t.completedAt,
            workflowStatus: wf,
            reviewDueDate: t.reviewDueDate ?? t.qaMeta?.reviewDueDate,
            submittedForReviewAt:
              t.submittedForReviewAt ?? t.qaMeta?.submittedForReviewAt,
            checklist: t.checklist ?? t.qaMeta?.checklist,
          },
          now
        )
        if (wf === "IN_PROGRESS" || wf === "NEEDS_REVISION") uInProg++
        else if (wf === "PENDING_REVIEW") uReview++
        else if (wf === "COMPLETED") uComp++

        if (dl.isDueSoon) uDueSoon++
        if (dl.isOverdueExecution) uOverExec++
        if (dl.isOverdueReview) uOverRev++
        if (dl.code === "COMPLETED_ON_TIME") uOnTime++
        if (dl.code === "COMPLETED_LATE") uLate++

        if (
          (t.comments || []).some(
            (c: any) => c.commentType === "BLOCKER" && c.actionStatus !== "RESOLVED"
          )
        ) {
          uBlockers++
        }

        uEvidence += (t.attachments?.length || 0) + (t.qaMeta?.evidenceLinks?.length || 0)
      }

      return {
        userId: u.id,
        fullName: u.fullName,
        role: u.role || "STAFF",
        groupNames: userGroups,
        totalAssigned: uTasks.length,
        inProgressCount: uInProg,
        dueSoonCount: uDueSoon,
        overdueExecutionCount: uOverExec,
        overdueReviewCount: uOverRev,
        pendingReviewCount: uReview,
        completedCount: uComp,
        completedOnTimeCount: uOnTime,
        completedLateCount: uLate,
        unresolvedBlockerCount: uBlockers,
        evidenceCount: uEvidence,
        completionRate: buildRateMetric(
          `MEM_COMP_${u.id}`,
          `Tỷ lệ hoàn thành (${u.fullName})`,
          uComp,
          uTasks.length,
          "Số việc đã duyệt Hoàn thành / Tổng việc giao chính cho cá nhân",
          `Cá nhân ${u.fullName} (N = ${uTasks.length})`
        ),
      }
    })
    .filter((m) => m.totalAssigned > 0 || m.groupNames.length > 0)

  const catMap = new Map<
    string,
    {
      category: string
      total: number
      completed: number
      inProgress: number
      pendingReview: number
      overdue: number
    }
  >()
  for (const t of activeTasks) {
    const cat = t.category || "Khác"
    if (!catMap.has(cat)) {
      catMap.set(cat, {
        category: cat,
        total: 0,
        completed: 0,
        inProgress: 0,
        pendingReview: 0,
        overdue: 0,
      })
    }
    const row = catMap.get(cat)!
    const wf: QaWorkflowStatus =
      t.workflowStatus || t.qaMeta?.workflowStatus || "ASSIGNED"
    const dl = computeTaskDeadlineStatus(
      {
        endDate: t.endDate,
        completedAt: t.completedAt,
        workflowStatus: wf,
        reviewDueDate: t.reviewDueDate ?? t.qaMeta?.reviewDueDate,
        submittedForReviewAt:
          t.submittedForReviewAt ?? t.qaMeta?.submittedForReviewAt,
        checklist: t.checklist ?? t.qaMeta?.checklist,
      },
      now
    )
    row.total++
    if (wf === "COMPLETED") row.completed++
    else if (wf === "PENDING_REVIEW") row.pendingReview++
    else if (wf === "IN_PROGRESS" || wf === "NEEDS_REVISION") row.inProgress++
    if (dl.isOverdueExecution || dl.isOverdueReview) row.overdue++
  }

  const overallCompletionRate = buildRateMetric(
    "OVERALL_COMPLETION",
    "Tỷ lệ hoàn thành nghiệm thu",
    completedTotal,
    executableDenominator,
    "Số nhiệm vụ đã duyệt Hoàn thành / Tổng số nhiệm vụ hiệu lực N (không cộng gộp việc đang Chờ duyệt)",
    scopeLabel,
    `Tổng số nhiệm vụ hiệu lực không hủy (N=${executableDenominator})`
  )

  const onTimeSubmissionRate = buildRateMetric(
    "ON_TIME_SUBMISSION",
    "Tỷ lệ hoàn thành đúng hạn",
    completedOnTime,
    executableDenominator,
    "Số nhiệm vụ hoàn thành đúng hạn / Tổng số nhiệm vụ hiệu lực N",
    scopeLabel,
    `Tổng số nhiệm vụ hiệu lực (N=${executableDenominator})`
  )

  const lateSubmissionRate = buildRateMetric(
    "LATE_SUBMISSION",
    "Tỷ lệ nộp / hoàn thành trễ hạn",
    completedLate,
    executableDenominator,
    "Số nhiệm vụ hoàn thành trễ hạn / Tổng số nhiệm vụ hiệu lực N",
    scopeLabel,
    `Tổng số nhiệm vụ hiệu lực (N=${executableDenominator})`
  )

  const overdueUnsubmittedRate = buildRateMetric(
    "OVERDUE_UNSUBMITTED",
    "Tỷ lệ quá hạn chưa nộp",
    overdueExecution,
    executableDenominator,
    "Số nhiệm vụ quá hạn thực hiện chưa nộp / Tổng số nhiệm vụ hiệu lực N",
    scopeLabel,
    `Tổng số nhiệm vụ hiệu lực (N=${executableDenominator})`
  )

  const capaVerifiedEffectivenessRate = buildRateMetric(
    "CAPA_VERIFIED_EFFECTIVE",
    "Tỷ lệ xác nhận hiệu quả sau cải tiến",
    capaVerifiedEffective,
    totalCapa,
    "Số hồ sơ CAPA đã được kiểm tra và xác nhận đạt hiệu quả thực tế / Tổng số hồ sơ cải tiến chất lượng N",
    `Hành động cải tiến chất lượng (N=${totalCapa})`,
    `Tổng số hồ sơ CAPA (N=${totalCapa})`
  )

  return {
    generatedAt: now.toISOString(),
    scopeDescription: scopeLabel,
    governanceDisclaimer:
      "Lưu ý quản trị: Các tỷ lệ tiến độ và tuân thủ hạn chỉ phản ánh nhịp độ vận hành công việc; đánh giá chất lượng chuyên môn căn cứ vào kết quả nghiệm thu sản phẩm và minh chứng độc lập.",
    counts: {
      totalActiveScope: executableDenominator,
      totalActivePool: executableDenominator,
      openAssigned,
      openCount: openAssigned,
      inProgress,
      inProgressCount: inProgress,
      pendingReview,
      pendingReviewCount: pendingReview,
      needsRevision,
      completedTotal,
      completedCount: completedTotal,
      completedOnTime,
      completedLate,
      overdueExecution,
      overdueUnsubmittedCount: overdueExecution,
      overdueReview,
      dueSoon,
      pausedOrCancelled,
      unresolvedBlockers,
      qualityEvaluatedCount,
    },
    rates: {
      overallCompletionRate,
      completionRate: overallCompletionRate,
      onTimeCompletionRate: buildRateMetric(
        "ON_TIME_COMPLETION",
        "Tỷ lệ nộp & hoàn thành đúng hạn",
        completedOnTime,
        dueOrCompletedDenominator,
        "Số nhiệm vụ hoàn thành đúng hạn / (Tổng số nhiệm vụ đã hoàn thành + Số nhiệm vụ đang chậm thực hiện)",
        `${scopeLabel} (Mẫu số N = ${dueOrCompletedDenominator} nhiệm vụ)`
      ),
      onTimeSubmissionRate,
      lateSubmissionRate,
      overdueUnsubmittedRate,
      reviewSlaComplianceRate: buildRateMetric(
        "REVIEW_SLA",
        "Tỷ lệ duyệt nghiệm thu đúng hạn",
        reviewOnTimeNumerator,
        reviewDenominator,
        "Số nhiệm vụ gửi duyệt được xử lý trong hạn duyệt / Tổng số nhiệm vụ đã gửi duyệt hoặc đã hoàn thành",
        `${scopeLabel} (Mẫu số N = ${reviewDenominator} nhiệm vụ)`
      ),
      capaActionCompletionRate: buildRateMetric(
        "CAPA_ACTION_DONE",
        "Tỷ lệ hoàn thành hành động cải tiến",
        capaActionCompleted,
        totalCapa,
        "Số hồ sơ CAPA đã thực hiện xong hành động khắc phục / Tổng số hồ sơ cải tiến chất lượng đang theo dõi",
        `Hành động cải tiến chất lượng (Mẫu số N = ${totalCapa} hồ sơ)`
      ),
      capaVerifiedEffectivenessRate,
    },
    improvementSummary: {
      totalActions: totalCapa,
      actionCompletedCount: capaActionCompleted,
      effectivenessVerifiedCount: capaVerifiedEffective,
      verifiedEffectivenessRate: capaVerifiedEffectivenessRate,
    },
    byGroup,
    byMember,
    byCategory: Array.from(catMap.values()),
  }
}
