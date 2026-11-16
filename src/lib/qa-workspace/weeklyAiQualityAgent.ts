import { GoogleGenerativeAI } from "@google/generative-ai"
import { prisma } from "@/lib/db"
import { sanitizeUntrustedReferenceData } from "./nlpDraftParser"
import {
  ensureKtdbclWeeklySchema,
  KTDBCL_DEFAULT_GROUPS,
  KtdbclMemberProfile,
  WeeklyReportItemMeta,
} from "./weeklyReportSchema"

export interface GroupQualityAnalysis {
  groupName: string
  memberCount: number
  totalItems: number
  completedItems: number
  doingItems: number
  notStartedItems: number
  confirmedItems: number
  overdueItems: number
  pendingExplanations: number
  completionRate: number // 0 - 100
  confirmationRate: number // 0 - 100 (of completed items or total)
  efficiencyScore: number // 0 - 100
  avgQualityScore: number // 0 - 10
  workloadStatus: "BALANCED" | "HIGH_LOAD" | "UNDER_REPORTED" | "BOTTLENECK"
  workloadLabel: string
  qualityStatus: "EXCELLENT" | "GOOD" | "WARNING" | "CRITICAL"
  aiAssessment: string
  keyBottleneck: string | null
  recommendedAction: string
}

export interface IndividualQualityAnalysis {
  userId: string
  fullName: string
  position: string
  specialistGroups: string[]
  submittedWeeksCount: number
  expectedWeeksCount: number
  submissionRate: number // 0 - 100
  totalItems: number
  completedItems: number
  doingItems: number
  notStartedItems: number
  confirmedByLeadershipCount: number
  overdueCount: number
  pendingExplanationCount: number
  explainedCount: number
  qaWorkspaceTasksTotal: number
  qaWorkspaceTasksCompleted: number
  completionRate: number // 0 - 100
  efficiencyScore: number // 0 - 100
  avgQualityScore: number // 0 - 10
  kpiGrade: "A" | "B" | "C" | "D"
  kpiGradeLabel: string
  aiStrengthSummary: string
  aiRiskOrGap: string | null
  aiCoachingRecommendation: string
}

export interface KtdbclAiQualityReport {
  scopeType: "WEEKLY" | "MONTHLY"
  weekNumber: number | null
  month: number
  year: number
  periodLabel: string
  aiEngineUsed: "GEMINI_SERVER" | "RULE_ENGINE_FALLBACK"
  generatedAt: string
  departmentSummary: {
    overallHealthScore: number // 0 - 100
    submissionRate: number
    completionRate: number
    confirmationRate: number
    efficiencyIndex: number
    avgQualityScore: number
    totalMembers: number
    submittedMembers: number
    totalItems: number
    completedItems: number
    confirmedItems: number
    overdueItems: number
    pendingExplanations: number
    executiveHeadline: string
    executiveNarrative: string
    topStrengths: string[]
    criticalBottlenecks: string[]
    directorActionItems: string[]
  }
  groupAnalyses: GroupQualityAnalysis[]
  individualAnalyses: IndividualQualityAnalysis[]
}

export interface RawReportInputForAi {
  id: string
  userId: string
  weekNumber: number
  month: number
  year: number
  status: string
  managerComment?: string | null
  directorComment?: string | null
  items: Array<{
    id: string
    mainTask: string
    workContent: string
    category?: string | null
    taskGroup?: string | null
    expectedCompletion?: string | null
    progress: string
    proposedSolution?: string | null
    managerNote?: string | null
    directorNote?: string | null
    directorRating?: string | null
    qualityScore?: number | null
  }>
}

export interface RawWorkTaskInputForAi {
  id: string
  assignedToUserId: string | null
  taskGroupName?: string | null
  progress: string
  endDate?: Date | string | null
}

function parseFlexibleDueDate(raw?: string | null, refYear?: number, refMonth?: number): Date | null {
  if (!raw || !raw.trim()) return null
  const s = raw.trim()
  // YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoMatch) {
    return new Date(`${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}T23:59:59+07:00`)
  }
  // DD/MM/YYYY or DD/MM
  const dmyMatch = s.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/)
  if (dmyMatch) {
    const d = Number(dmyMatch[1])
    const m = Number(dmyMatch[2])
    let y = dmyMatch[3] ? Number(dmyMatch[3]) : refYear || new Date().getFullYear()
    if (y < 100) y += 2000
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      return new Date(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T23:59:59+07:00`)
    }
  }
  return null
}

export function isReportItemPastDue(
  item: { progress: string; expectedCompletion?: string | null },
  meta?: WeeklyReportItemMeta | null,
  referenceNow: Date = new Date(),
  reportYear?: number,
  reportMonth?: number
): boolean {
  if (meta?.isOverdue || meta?.confirmStatus === "OVERDUE_EXPLANATION_REQUIRED") {
    return item.progress !== "COMPLETED" || meta?.confirmStatus === "OVERDUE_EXPLANATION_REQUIRED"
  }
  if (item.progress === "COMPLETED") return false
  const due = parseFlexibleDueDate(item.expectedCompletion, reportYear, reportMonth)
  if (!due) return false
  return due.getTime() < referenceNow.getTime()
}

export function deriveItemQualityScore(
  item: {
    progress: string
    directorRating?: string | null
    qualityScore?: number | null
    proposedSolution?: string | null
  },
  meta?: WeeklyReportItemMeta | null,
  isOverdue?: boolean
): number {
  if (typeof item.qualityScore === "number" && !Number.isNaN(item.qualityScore)) {
    return Math.max(0, Math.min(10, Number(item.qualityScore.toFixed(1))))
  }
  if (item.directorRating === "EXCELLENT") return 9.6
  if (item.directorRating === "GOOD") return 8.6
  if (item.directorRating === "SATISFACTORY") return 7.4
  if (item.directorRating === "NEEDS_IMPROVEMENT") return 5.2

  let base = 5.0
  if (item.progress === "COMPLETED") {
    base = meta?.confirmStatus === "DIRECTOR_CONFIRMED"
      ? 9.2
      : meta?.confirmStatus === "MANAGER_CONFIRMED"
      ? 8.8
      : 8.2
  } else if (item.progress === "DOING") {
    base = isOverdue ? 5.2 : 6.8
  } else {
    base = isOverdue ? 3.8 : 4.8
  }

  if (item.proposedSolution && item.proposedSolution.trim().length > 12) {
    base = Math.min(10, base + 0.3)
  }
  return Number(base.toFixed(1))
}

/**
 * Tính toán định lượng Hiệu suất & Chất lượng công việc của từng Nhóm & Cá nhân Ban KT&ĐBCL
 */
export function computeEfficiencyAndQualityMetrics(params: {
  scopeType: "WEEKLY" | "MONTHLY"
  weekNumber: number | null
  month: number
  year: number
  expectedWeeksCount: number
  members: KtdbclMemberProfile[]
  taskGroupNames: string[]
  reports: RawReportInputForAi[]
  itemMetaMap: Map<string, WeeklyReportItemMeta>
  workTasks?: RawWorkTaskInputForAi[]
  categoryWeights?: Map<string, number>
  referenceNow?: Date
}): Omit<KtdbclAiQualityReport, "aiEngineUsed" | "generatedAt"> {
  const {
    scopeType,
    weekNumber,
    month,
    year,
    expectedWeeksCount,
    members,
    taskGroupNames,
    reports,
    itemMetaMap,
    workTasks = [],
    categoryWeights = new Map(),
    referenceNow = new Date(),
  } = params

  const periodLabel =
    scopeType === "WEEKLY" && weekNumber
      ? `Tuần ${weekNumber} • Tháng ${month}/${year}`
      : `Tổng hợp Tháng ${month}/${year}`

  // Ensure standard KT&ĐBCL groups appear in deterministic order
  const orderedGroupNames = Array.from(
    new Set([...KTDBCL_DEFAULT_GROUPS, ...taskGroupNames.filter(Boolean)])
  )

  const groupBuckets = new Map<
    string,
    {
      memberIds: Set<string>
      totalItems: number
      completedItems: number
      doingItems: number
      notStartedItems: number
      confirmedItems: number
      overdueItems: number
      pendingExplanations: number
      weightedCompleted: number
      totalWeight: number
      qualitySum: number
      sampleBottlenecks: string[]
    }
  >()

  for (const gName of orderedGroupNames) {
    const preAssignedMembers = new Set(
      members.filter((m) => m.specialistGroups.includes(gName)).map((m) => m.id)
    )
    groupBuckets.set(gName, {
      memberIds: preAssignedMembers,
      totalItems: 0,
      completedItems: 0,
      doingItems: 0,
      notStartedItems: 0,
      confirmedItems: 0,
      overdueItems: 0,
      pendingExplanations: 0,
      weightedCompleted: 0,
      totalWeight: 0,
      qualitySum: 0,
      sampleBottlenecks: [],
    })
  }

  // Individual buckets
  const memberBuckets = new Map<
    string,
    {
      member: KtdbclMemberProfile
      submittedWeeks: Set<number>
      totalItems: number
      completedItems: number
      doingItems: number
      notStartedItems: number
      confirmedCount: number
      overdueCount: number
      pendingExplanationCount: number
      explainedCount: number
      weightedCompleted: number
      totalWeight: number
      qualityWeightSum: number
      solutionsCount: number
      sampleOverdueTitles: string[]
      sampleCompletedTitles: string[]
    }
  >()

  for (const m of members) {
    memberBuckets.set(m.id, {
      member: m,
      submittedWeeks: new Set<number>(),
      totalItems: 0,
      completedItems: 0,
      doingItems: 0,
      notStartedItems: 0,
      confirmedCount: 0,
      overdueCount: 0,
      pendingExplanationCount: 0,
      explainedCount: 0,
      weightedCompleted: 0,
      totalWeight: 0,
      qualityWeightSum: 0,
      solutionsCount: 0,
      sampleOverdueTitles: [],
      sampleCompletedTitles: [],
    })
  }

  // Process reports
  for (const rpt of reports) {
    let mb = memberBuckets.get(rpt.userId)
    if (!mb) continue
    if (rpt.status === "SUBMITTED" || rpt.status === "REVIEWED") {
      mb.submittedWeeks.add(rpt.weekNumber)
    }

    for (const item of rpt.items || []) {
      const meta = itemMetaMap.get(item.id) || null
      const catKey = (item.category || item.mainTask || "").trim().toLowerCase()
      const weight = categoryWeights.get(catKey) || 1.0
      const overdue = isReportItemPastDue(item, meta, referenceNow, rpt.year, rpt.month)
      const qScore = deriveItemQualityScore(item, meta, overdue)
      const isConfirmed =
        meta?.confirmStatus === "MANAGER_CONFIRMED" ||
        meta?.confirmStatus === "DIRECTOR_CONFIRMED" ||
        Boolean(item.directorRating)
      const needsExplanation = meta?.confirmStatus === "OVERDUE_EXPLANATION_REQUIRED"
      const hasExplained = meta?.confirmStatus === "EXPLANATION_SUBMITTED"

      mb.totalItems++
      mb.totalWeight += weight
      mb.qualityWeightSum += qScore * weight

      if (item.progress === "COMPLETED") {
        mb.completedItems++
        mb.weightedCompleted += 1.0 * weight
        if (mb.sampleCompletedTitles.length < 2) {
          mb.sampleCompletedTitles.push(item.mainTask || item.workContent.slice(0, 60))
        }
      } else if (item.progress === "DOING") {
        mb.doingItems++
        mb.weightedCompleted += 0.5 * weight
      } else {
        mb.notStartedItems++
      }

      if (isConfirmed) mb.confirmedCount++
      if (overdue) {
        mb.overdueCount++
        if (mb.sampleOverdueTitles.length < 2) {
          mb.sampleOverdueTitles.push(item.mainTask || item.workContent.slice(0, 60))
        }
      }
      if (needsExplanation) mb.pendingExplanationCount++
      if (hasExplained) mb.explainedCount++
      if (item.proposedSolution && item.proposedSolution.trim().length > 5) {
        mb.solutionsCount++
      }

      // Group aggregation
      const rawGroup = (item.taskGroup || "").trim()
      const resolvedGroupName =
        orderedGroupNames.find((g) => g.toLowerCase() === rawGroup.toLowerCase()) ||
        (rawGroup ? rawGroup : mb.member.specialistGroups[0] || "ĐBCL")

      if (!groupBuckets.has(resolvedGroupName)) {
        groupBuckets.set(resolvedGroupName, {
          memberIds: new Set([rpt.userId]),
          totalItems: 0,
          completedItems: 0,
          doingItems: 0,
          notStartedItems: 0,
          confirmedItems: 0,
          overdueItems: 0,
          pendingExplanations: 0,
          weightedCompleted: 0,
          totalWeight: 0,
          qualitySum: 0,
          sampleBottlenecks: [],
        })
      }
      const gb = groupBuckets.get(resolvedGroupName)!
      gb.memberIds.add(rpt.userId)
      gb.totalItems++
      gb.totalWeight += weight
      gb.qualitySum += qScore * weight

      if (item.progress === "COMPLETED") {
        gb.completedItems++
        gb.weightedCompleted += 1.0 * weight
      } else if (item.progress === "DOING") {
        gb.doingItems++
        gb.weightedCompleted += 0.5 * weight
      } else {
        gb.notStartedItems++
      }

      if (isConfirmed) gb.confirmedItems++
      if (overdue) {
        gb.overdueItems++
        if (gb.sampleBottlenecks.length < 2) {
          gb.sampleBottlenecks.push(
            `${mb.member.fullName}: ${sanitizeUntrustedReferenceData(item.mainTask || item.workContent, 70)}`
          )
        }
      }
      if (needsExplanation) gb.pendingExplanations++
    }
  }

  // Build Group Analyses
  const groupAnalyses: GroupQualityAnalysis[] = []
  for (const [groupName, gb] of groupBuckets.entries()) {
    const completionRate = gb.totalItems > 0 ? Math.round((gb.completedItems / gb.totalItems) * 100) : 0
    const weightedProgress = gb.totalWeight > 0 ? (gb.weightedCompleted / gb.totalWeight) * 100 : 0
    const confirmationRate =
      gb.completedItems > 0 ? Math.round((gb.confirmedItems / gb.completedItems) * 100) : 0
    const onTimeRate =
      gb.totalItems > 0 ? Math.round(((gb.totalItems - gb.overdueItems) / gb.totalItems) * 100) : 100
    const avgQualityScore =
      gb.totalWeight > 0 ? Number((gb.qualitySum / gb.totalWeight).toFixed(1)) : 0

    // Efficiency Score: 50% weighted progress + 30% on-time rate + 20% quality/confirmation
    const efficiencyScore =
      gb.totalItems > 0
        ? Math.round(weightedProgress * 0.5 + onTimeRate * 0.3 + (avgQualityScore * 10) * 0.2)
        : 0

    let workloadStatus: GroupQualityAnalysis["workloadStatus"] = "BALANCED"
    let workloadLabel = "Khối lượng cân bằng"
    if (gb.totalItems === 0) {
      workloadStatus = "UNDER_REPORTED"
      workloadLabel = "Chưa ghi nhận báo cáo"
    } else if (gb.overdueItems >= 2 || (gb.totalItems >= 4 && completionRate < 50)) {
      workloadStatus = "BOTTLENECK"
      workloadLabel = "Có điểm nghẽn tiến độ"
    } else if (gb.memberIds.size > 0 && gb.totalItems / gb.memberIds.size >= 6) {
      workloadStatus = "HIGH_LOAD"
      workloadLabel = "Tải công việc cao"
    }

    let qualityStatus: GroupQualityAnalysis["qualityStatus"] = "GOOD"
    if (gb.totalItems === 0) qualityStatus = "WARNING"
    else if (efficiencyScore >= 85 && gb.overdueItems === 0) qualityStatus = "EXCELLENT"
    else if (efficiencyScore >= 70 && gb.overdueItems <= 1) qualityStatus = "GOOD"
    else if (efficiencyScore >= 55) qualityStatus = "WARNING"
    else qualityStatus = "CRITICAL"

    const aiAssessment =
      gb.totalItems === 0
        ? `Nhóm ${groupName} chưa có đầu việc được kê khai trong ${periodLabel.toLowerCase()}.`
        : `Đạt tỷ lệ hoàn thành ${completionRate}% (${gb.completedItems}/${gb.totalItems} việc), hiệu suất tổng hợp ${efficiencyScore}% và điểm chất lượng trung bình ${avgQualityScore}/10.`

    const keyBottleneck =
      gb.overdueItems > 0
        ? `Còn ${gb.overdueItems} đầu việc trễ hạn (${gb.sampleBottlenecks.join("; ")})`
        : gb.doingItems > gb.completedItems && gb.doingItems >= 2
        ? `${gb.doingItems} đầu việc đang thực hiện dở dang cần chốt sản phẩm đầu ra`
        : null

    const recommendedAction =
      gb.totalItems === 0
        ? `Yêu cầu điều phối viên nhóm ${groupName} cập nhật báo cáo hoặc đồng bộ đầu việc từ QA Workspace.`
        : gb.overdueItems > 0
        ? `Yêu cầu giải trình ${gb.overdueItems} việc trễ hạn và ưu tiên nghiệm thu dứt điểm trước thứ Sáu.`
        : gb.completedItems > gb.confirmedItems
        ? `Quản lý / Giám đốc Ban xác nhận nghiệm thu ${gb.completedItems - gb.confirmedItems} đầu việc đã hoàn thành.`
        : `Duy trì nhịp độ hiện tại và chuẩn hóa minh chứng lưu trữ của nhóm.`

    groupAnalyses.push({
      groupName,
      memberCount: gb.memberIds.size,
      totalItems: gb.totalItems,
      completedItems: gb.completedItems,
      doingItems: gb.doingItems,
      notStartedItems: gb.notStartedItems,
      confirmedItems: gb.confirmedItems,
      overdueItems: gb.overdueItems,
      pendingExplanations: gb.pendingExplanations,
      completionRate,
      confirmationRate,
      efficiencyScore,
      avgQualityScore,
      workloadStatus,
      workloadLabel,
      qualityStatus,
      aiAssessment,
      keyBottleneck,
      recommendedAction,
    })
  }

  // Build Individual Analyses
  const individualAnalyses: IndividualQualityAnalysis[] = []
  for (const [, mb] of memberBuckets.entries()) {
    const memberWorkTasks = workTasks.filter((t) => t.assignedToUserId === mb.member.id)
    const qaTotal = memberWorkTasks.length
    const qaCompleted = memberWorkTasks.filter((t) => t.progress === "COMPLETED").length

    const expWeeks = Math.max(1, expectedWeeksCount)
    const submittedWeeksCount = mb.submittedWeeks.size
    const submissionRate = Math.min(100, Math.round((submittedWeeksCount / expWeeks) * 100))

    const completionRate = mb.totalItems > 0 ? Math.round((mb.completedItems / mb.totalItems) * 100) : 0
    const weightedProgress = mb.totalWeight > 0 ? (mb.weightedCompleted / mb.totalWeight) * 100 : 0
    const onTimeRate =
      mb.totalItems > 0 ? Math.round(((mb.totalItems - mb.overdueCount) / mb.totalItems) * 100) : 0
    const avgQualityScore =
      mb.totalWeight > 0 ? Number((mb.qualityWeightSum / mb.totalWeight).toFixed(1)) : 0

    // Individual Efficiency Score: 35% weighted task progress + 25% submission discipline + 20% on-time + 20% quality
    const efficiencyScore =
      mb.totalItems > 0
        ? Math.round(
            weightedProgress * 0.35 +
              submissionRate * 0.25 +
              onTimeRate * 0.2 +
              avgQualityScore * 10 * 0.2
          )
        : Math.round(submissionRate * 0.25)

    let kpiGrade: IndividualQualityAnalysis["kpiGrade"] = "C"
    let kpiGradeLabel = "Đạt yêu cầu"
    if (mb.totalItems === 0 && submittedWeeksCount === 0) {
      kpiGrade = "D"
      kpiGradeLabel = "Chưa nộp báo cáo"
    } else if (avgQualityScore >= 8.8 && efficiencyScore >= 85 && mb.overdueCount === 0) {
      kpiGrade = "A"
      kpiGradeLabel = "Xuất sắc"
    } else if (avgQualityScore >= 7.5 && efficiencyScore >= 70) {
      kpiGrade = "B"
      kpiGradeLabel = "Hoàn thành tốt"
    } else if (avgQualityScore >= 6.0 && efficiencyScore >= 50) {
      kpiGrade = "C"
      kpiGradeLabel = "Hoàn thành"
    } else {
      kpiGrade = "D"
      kpiGradeLabel = "Cần chấn chỉnh"
    }

    const aiStrengthSummary =
      mb.totalItems === 0
        ? "Chưa có dữ liệu đầu việc báo cáo trong kỳ."
        : mb.completedItems > 0
        ? `Hoàn thành ${mb.completedItems}/${mb.totalItems} đầu việc (${completionRate}%), kỷ luật nộp báo cáo ${submissionRate}%${
            mb.confirmedCount > 0 ? `, đã được cấp quản lý xác nhận ${mb.confirmedCount} việc` : ""
          }.`
        : `Đã kê khai ${mb.totalItems} đầu việc đang triển khai, tỷ lệ nộp báo cáo ${submissionRate}%.`

    const aiRiskOrGap =
      mb.pendingExplanationCount > 0
        ? `Đang nợ giải trình ${mb.pendingExplanationCount} đầu việc trễ tiến độ.`
        : mb.overdueCount > 0
        ? `Có ${mb.overdueCount} đầu việc quá hạn dự kiến (${mb.sampleOverdueTitles.join(", ")}).`
        : submittedWeeksCount === 0
        ? `Chưa nộp báo cáo công việc định kỳ (hạn Thứ 4, 14:00).`
        : null

    const aiCoachingRecommendation =
      mb.pendingExplanationCount > 0 || mb.overdueCount > 0
        ? "Cần gửi giải trình nguyên nhân, cam kết mốc hoàn thành bù và cập nhật minh chứng lên hệ thống."
        : submittedWeeksCount === 0
        ? `Nhắc nộp báo cáo kỳ ${periodLabel} và đồng bộ các nhiệm vụ đang nhận trên QA Workspace.`
        : kpiGrade === "A"
        ? "Ghi nhận hiệu suất cao; có thể chia sẻ quy trình xử lý nhanh cho các thành viên cùng nhóm."
        : "Tập trung dứt điểm các việc đang làm dở và bổ sung đề xuất giải pháp cụ thể hơn."

    individualAnalyses.push({
      userId: mb.member.id,
      fullName: mb.member.fullName,
      position: mb.member.position,
      specialistGroups: mb.member.specialistGroups,
      submittedWeeksCount,
      expectedWeeksCount: expWeeks,
      submissionRate,
      totalItems: mb.totalItems,
      completedItems: mb.completedItems,
      doingItems: mb.doingItems,
      notStartedItems: mb.notStartedItems,
      confirmedByLeadershipCount: mb.confirmedCount,
      overdueCount: mb.overdueCount,
      pendingExplanationCount: mb.pendingExplanationCount,
      explainedCount: mb.explainedCount,
      qaWorkspaceTasksTotal: qaTotal,
      qaWorkspaceTasksCompleted: qaCompleted,
      completionRate,
      efficiencyScore,
      avgQualityScore,
      kpiGrade,
      kpiGradeLabel,
      aiStrengthSummary,
      aiRiskOrGap,
      aiCoachingRecommendation,
    })
  }

  // Sort individuals: highest efficiency first, unsubmitted clearly visible at bottom or sortable in UI
  individualAnalyses.sort((a, b) => b.efficiencyScore - a.efficiencyScore)

  // Department Executive Summary
  const totalMembers = members.length
  const submittedMembers = individualAnalyses.filter((i) => i.submittedWeeksCount > 0).length
  const deptSubmissionRate = totalMembers > 0 ? Math.round((submittedMembers / totalMembers) * 100) : 0
  const totalItems = individualAnalyses.reduce((s, i) => s + i.totalItems, 0)
  const completedItems = individualAnalyses.reduce((s, i) => s + i.completedItems, 0)
  const confirmedItems = individualAnalyses.reduce((s, i) => s + i.confirmedByLeadershipCount, 0)
  const overdueItems = individualAnalyses.reduce((s, i) => s + i.overdueCount, 0)
  const pendingExplanations = individualAnalyses.reduce((s, i) => s + i.pendingExplanationCount, 0)

  const deptCompletionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
  const deptConfirmationRate =
    completedItems > 0 ? Math.round((confirmedItems / completedItems) * 100) : 0
  const activeIndividuals = individualAnalyses.filter((i) => i.totalItems > 0)
  const efficiencyIndex =
    individualAnalyses.length > 0
      ? Math.round(
          individualAnalyses.reduce((s, i) => s + i.efficiencyScore, 0) / individualAnalyses.length
        )
      : 0
  const avgQualityScore =
    activeIndividuals.length > 0
      ? Number(
          (
            activeIndividuals.reduce((s, i) => s + i.avgQualityScore, 0) / activeIndividuals.length
          ).toFixed(1)
        )
      : 0

  const overallHealthScore = Math.round(
    deptSubmissionRate * 0.3 +
      deptCompletionRate * 0.35 +
      (totalItems > 0 ? ((totalItems - overdueItems) / totalItems) * 100 : deptSubmissionRate) * 0.2 +
      avgQualityScore * 10 * 0.15
  )

  const topGroups = [...groupAnalyses]
    .filter((g) => g.totalItems > 0)
    .sort((a, b) => b.efficiencyScore - a.efficiencyScore)

  const topStrengths: string[] = []
  if (deptSubmissionRate >= 80) {
    topStrengths.push(`Kỷ luật báo cáo của Ban KT&ĐBCL đạt mức tốt (${submittedMembers}/${totalMembers} nhân sự đã nộp, đạt ${deptSubmissionRate}%).`)
  }
  if (topGroups[0]) {
    topStrengths.push(
      `Nhóm "${topGroups[0].groupName}" dẫn đầu hiệu suất (${topGroups[0].efficiencyScore}%, hoàn thành ${topGroups[0].completedItems}/${topGroups[0].totalItems} đầu việc).`
    )
  }
  const gradeAMembers = individualAnalyses.filter((i) => i.kpiGrade === "A")
  if (gradeAMembers.length > 0) {
    topStrengths.push(
      `${gradeAMembers.length} nhân sự đạt chuẩn chất lượng Xuất sắc (Hạng A): ${gradeAMembers
        .slice(0, 3)
        .map((m) => m.fullName)
        .join(", ")}.`
    )
  }
  if (topStrengths.length === 0) {
    topStrengths.push("Hệ thống theo dõi công việc Ban KT&ĐBCL đã sẵn sàng ghi nhận dữ liệu điều hành trực tuyến.")
  }

  const criticalBottlenecks: string[] = []
  const unsubmittedCount = totalMembers - submittedMembers
  if (unsubmittedCount > 0) {
    criticalBottlenecks.push(
      `Còn ${unsubmittedCount}/${totalMembers} thành viên Ban KT&ĐBCL chưa nộp báo cáo đúng hạn Thứ 4 (14:00).`
    )
  }
  if (overdueItems > 0) {
    criticalBottlenecks.push(
      `Phát sinh ${overdueItems} đầu việc trễ tiến độ dự kiến${
        pendingExplanations > 0 ? ` (trong đó ${pendingExplanations} việc đang chờ nhân sự giải trình)` : ""
      }.`
    )
  }
  const unconfirmedCompleted = completedItems - confirmedItems
  if (unconfirmedCompleted > 0) {
    criticalBottlenecks.push(
      `Còn ${unconfirmedCompleted} đầu việc báo cáo "Hoàn thành" chưa được Quản lý hoặc Giám đốc Ban xác nhận nghiệm thu.`
    )
  }
  if (criticalBottlenecks.length === 0) {
    criticalBottlenecks.push("Không ghi nhận điểm nghẽn nghiêm trọng về tiến độ trong kỳ.")
  }

  const directorActionItems: string[] = []
  if (unconfirmedCompleted > 0) {
    directorActionItems.push(
      `Xác nhận nghiệm thu ${unconfirmedCompleted} đầu việc đã hoàn thành để hệ thống tự động gửi mail xác nhận kết quả cho nhân viên.`
    )
  }
  if (overdueItems > 0) {
    directorActionItems.push(
      `Kích hoạt gửi yêu cầu giải trình đối với ${overdueItems} đầu việc trễ hạn và ấn định mốc hoàn thành bù.`
    )
  }
  if (unsubmittedCount > 0) {
    directorActionItems.push(
      `Đôn đốc ${unsubmittedCount} thành viên chưa nộp báo cáo hoàn tất kê khai công việc trong ngày.`
    )
  }
  if (directorActionItems.length === 0) {
    directorActionItems.push(
      "Duyệt phát hành báo cáo tổng hợp định kỳ và ghi nhận khen thưởng các cá nhân/nhóm đạt KPI hạng A."
    )
  }

  const executiveHeadline =
    overallHealthScore >= 85
      ? `Chất lượng vận hành Ban KT&ĐBCL đạt mức Tốt (${overallHealthScore}/100 điểm)`
      : overallHealthScore >= 65
      ? `Tiến độ Ban KT&ĐBCL ở mức Khá (${overallHealthScore}/100 điểm) — cần xử lý dứt điểm các việc tồn đọng`
      : `Cần đôn đốc kỷ luật báo cáo và tháo gỡ tiến độ (${overallHealthScore}/100 điểm)`

  const executiveNarrative = `Trong kỳ ${periodLabel}, Ban KT&ĐBCL ghi nhận ${submittedMembers}/${totalMembers} thành viên nộp báo cáo (${deptSubmissionRate}%), tổng cộng ${totalItems} đầu việc chuyên môn với tỷ lệ hoàn thành ${deptCompletionRate}% (đã xác nhận nghiệm thu ${confirmedItems} việc) và điểm chất lượng trung bình ${avgQualityScore}/10.`

  return {
    scopeType,
    weekNumber,
    month,
    year,
    periodLabel,
    departmentSummary: {
      overallHealthScore,
      submissionRate: deptSubmissionRate,
      completionRate: deptCompletionRate,
      confirmationRate: deptConfirmationRate,
      efficiencyIndex,
      avgQualityScore,
      totalMembers,
      submittedMembers,
      totalItems,
      completedItems,
      confirmedItems,
      overdueItems,
      pendingExplanations,
      executiveHeadline,
      executiveNarrative,
      topStrengths,
      criticalBottlenecks,
      directorActionItems,
    },
    groupAnalyses,
    individualAnalyses,
  }
}

/**
 * Gọi Gemini Server-side để làm giàu nhận định chuyên sâu cho từng Nhóm & Cá nhân (kèm bộ bảo vệ fallback tất định)
 */
export async function generateKtdbclAiQualityReport(
  params: Parameters<typeof computeEfficiencyAndQualityMetrics>[0] & {
    useCache?: boolean
    actorName?: string
  }
): Promise<KtdbclAiQualityReport> {
  await ensureKtdbclWeeklySchema()
  const cacheKey = `${params.scopeType}_${params.year}_${params.month}_W${params.weekNumber || 0}`
  const pAny = prisma as any

  if (params.useCache && typeof pAny.$queryRawUnsafe === "function") {
    try {
      const cachedRows: any[] = await pAny.$queryRawUnsafe(
        `SELECT * FROM "qa_weekly_ai_analyses" WHERE "cacheKey" = ? LIMIT 1`,
        cacheKey
      )
      if (cachedRows && cachedRows.length > 0 && cachedRows[0].analysisJson) {
        const parsed = JSON.parse(String(cachedRows[0].analysisJson)) as KtdbclAiQualityReport
        if (parsed && parsed.departmentSummary) {
          return parsed
        }
      }
    } catch {
      // Proceed to fresh calculation
    }
  }

  const baseReport = computeEfficiencyAndQualityMetrics(params)
  let aiEngineUsed: KtdbclAiQualityReport["aiEngineUsed"] = "RULE_ENGINE_FALLBACK"

  const apiKey = process.env.GEMINI_API_KEY
  if (apiKey && baseReport.departmentSummary.totalItems > 0) {
    try {
      const ai = new GoogleGenerativeAI(apiKey)
      const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" })

      const compactPayload = {
        period: baseReport.periodLabel,
        summary: {
          submissionRate: baseReport.departmentSummary.submissionRate,
          completionRate: baseReport.departmentSummary.completionRate,
          efficiencyIndex: baseReport.departmentSummary.efficiencyIndex,
          overdueItems: baseReport.departmentSummary.overdueItems,
        },
        groups: baseReport.groupAnalyses.map((g) => ({
          groupName: g.groupName,
          total: g.totalItems,
          completed: g.completedItems,
          overdue: g.overdueItems,
          efficiencyScore: g.efficiencyScore,
          avgQualityScore: g.avgQualityScore,
        })),
        individuals: baseReport.individualAnalyses.map((ind) => ({
          userId: ind.userId,
          role: ind.position,
          groups: ind.specialistGroups,
          total: ind.totalItems,
          completed: ind.completedItems,
          overdue: ind.overdueCount,
          efficiencyScore: ind.efficiencyScore,
          kpiGrade: ind.kpiGrade,
        })),
      }

      const prompt = `Bạn là AI Agent Quản trị Chất lượng Công việc của Giám đốc Ban Khảo thí & Đảm bảo Chất lượng (Ban KT&ĐBCL - Hệ thống Giáo dục Sky-Line).
Chỉ phân tích dữ liệu số liệu bên trong thẻ <metrics_json>, tuyệt đối không bịa đặt số liệu ngoài thẻ này.
<metrics_json>${JSON.stringify(compactPayload)}</metrics_json>

Hãy trả về đúng định dạng JSON thuần (không bọc markdown) bằng tiếng Việt chuyên nghiệp, ngắn gọn, sắc bén cho Lãnh đạo Ban:
{
  "executiveHeadline": "1 câu tiêu đề tóm tắt sức khỏe vận hành Ban KT&ĐBCL",
  "executiveNarrative": "2 câu nhận định tổng quan về tiến độ, chất lượng và kỷ luật thực thi",
  "directorActionItems": ["Hành động điều hành cụ thể 1", "Hành động điều hành cụ thể 2", "Hành động điều hành cụ thể 3"],
  "groupInsights": {
    "Tên nhóm": {
      "aiAssessment": "Nhận xét ngắn gọn chất lượng & tải công việc của nhóm",
      "recommendedAction": "Khuyến nghị điều phối cụ thể"
    }
  },
  "individualInsights": {
    "userId": {
      "aiCoachingRecommendation": "1 câu đánh giá hoặc gợi ý huấn luyện sát thực tế cho nhân sự này"
    }
  }
}`

      const response = await model.generateContent(prompt)
      const rawText = response.response
        .text()
        .replace(/^```json/i, "")
        .replace(/^```/i, "")
        .replace(/```$/i, "")
        .trim()
      const enriched = JSON.parse(rawText)

      if (enriched.executiveHeadline) {
        baseReport.departmentSummary.executiveHeadline = String(enriched.executiveHeadline).trim()
      }
      if (enriched.executiveNarrative) {
        baseReport.departmentSummary.executiveNarrative = String(enriched.executiveNarrative).trim()
      }
      if (Array.isArray(enriched.directorActionItems) && enriched.directorActionItems.length > 0) {
        baseReport.departmentSummary.directorActionItems = enriched.directorActionItems
          .slice(0, 4)
          .map((s: any) => String(s).trim())
      }
      if (enriched.groupInsights && typeof enriched.groupInsights === "object") {
        for (const g of baseReport.groupAnalyses) {
          const gi = enriched.groupInsights[g.groupName]
          if (gi?.aiAssessment) g.aiAssessment = String(gi.aiAssessment).trim()
          if (gi?.recommendedAction) g.recommendedAction = String(gi.recommendedAction).trim()
        }
      }
      if (enriched.individualInsights && typeof enriched.individualInsights === "object") {
        for (const ind of baseReport.individualAnalyses) {
          const ii = enriched.individualInsights[ind.userId]
          if (ii?.aiCoachingRecommendation) {
            ind.aiCoachingRecommendation = String(ii.aiCoachingRecommendation).trim()
          }
        }
      }
      aiEngineUsed = "GEMINI_SERVER"
    } catch (err) {
      console.warn("[generateKtdbclAiQualityReport] Fallback to deterministic engine:", err)
      aiEngineUsed = "RULE_ENGINE_FALLBACK"
    }
  }

  const finalReport: KtdbclAiQualityReport = {
    ...baseReport,
    aiEngineUsed,
    generatedAt: new Date().toISOString(),
  }

  if (typeof pAny.$executeRawUnsafe === "function") {
    try {
      await pAny.$executeRawUnsafe(
        `INSERT INTO "qa_weekly_ai_analyses" (
          "cacheKey", "scopeType", "weekNumber", "month", "year",
          "aiEngineUsed", "analysisJson", "generatedByName", "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT("cacheKey") DO UPDATE SET
          "aiEngineUsed" = excluded."aiEngineUsed",
          "analysisJson" = excluded."analysisJson",
          "generatedByName" = excluded."generatedByName",
          "updatedAt" = excluded."updatedAt"`,
        cacheKey,
        params.scopeType,
        params.weekNumber,
        params.month,
        params.year,
        aiEngineUsed,
        JSON.stringify(finalReport),
        params.actorName || "SYSTEM",
        finalReport.generatedAt,
        finalReport.generatedAt
      )
    } catch (err) {
      console.warn("[generateKtdbclAiQualityReport] Cache save warning:", err)
    }
  }

  return finalReport
}
