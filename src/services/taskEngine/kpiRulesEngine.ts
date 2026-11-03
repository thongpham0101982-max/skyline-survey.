import { prisma } from "@/lib/db"
import { SeparatedProgressAndKPI, SSMTask, UnifiedTeacherAssignmentProfile } from "./types"

export interface KPIConfigOverrides {
  defaultMonthlyObservationQuota?: number
  defaultPrimaryBenchmarkScore?: number
  defaultSecondaryBenchmarkScore?: number
  defaultTargetPassRate?: number
}

const PERIOD_SEQUENCE = ["KSDN", "KSĐN", "GK1", "CK1", "GK2", "CK2"]

/**
 * Progress Calculation Engine & KPI Rules Engine
 * Tính toán tách biệt 6 nhóm chỉ số theo đúng quy định Sky-Line (Mục VII):
 * 1. Tiến độ hoàn thành khối lượng
 * 2. Tiến độ được phê duyệt / công nhận
 * 3. Mức độ tuân thủ thời hạn
 * 4. Mức đạt KPI theo quy định
 * 5. Chỉ số chất lượng giảng dạy (Tỷ lệ đạt chuẩn, tỷ lệ tiến bộ, điểm TB)
 * 6. Hiệu quả hỗ trợ & cố vấn học sinh
 *
 * Tuyệt đối KHÔNG gộp chung các chỉ số có bản chất khác nhau thành một tỷ lệ tổng hợp tùy tiện.
 */
export async function calculateTeacherProgressAndKPI(
  profile: UnifiedTeacherAssignmentProfile,
  allTasks: SSMTask[],
  configOverrides?: KPIConfigOverrides
): Promise<SeparatedProgressAndKPI> {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const monthStart = new Date(currentYear, currentMonth - 1, 1)
  const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59)
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  const teacherId = profile.teacherId
  const homeroomClassIds = profile.homeroomClasses.map((c) => c.id)

  // ============================================================================
  // 1. TẢI CẤU HÌNH ĐỊNH MỨC & QUY CHẾ TỪ DB (Không hardcode)
  // ============================================================================
  const [benchmarkConfigs, subjectQuotas, yearTarget] = await Promise.all([
    prisma.subjectBenchmarkConfig.findMany({
      where: {
        OR: [{ academicYearId: profile.academicYearId }, { grade: "ALL" }],
      },
    }).catch(() => []),

    prisma.subjectQuota.findMany({
      where: { academicYearId: profile.academicYearId },
    }).catch(() => []),

    teacherId
      ? prisma.teacherAcademicYearTarget.findFirst({
          where: { teacherId },
        }).catch(() => null)
      : Promise.resolve(null),
  ])

  const resolveBenchmark = (grade: string, subjectId?: string): number => {
    const exactMatch = benchmarkConfigs.find(
      (b) => b.grade === grade && (!b.subjectId || b.subjectId === subjectId)
    )
    if (exactMatch) return exactMatch.benchmarkScore
    const allMatch = benchmarkConfigs.find(
      (b) => b.grade === "ALL" && (!b.subjectId || b.subjectId === subjectId)
    )
    if (allMatch) return allMatch.benchmarkScore
    const gNum = parseInt(grade, 10)
    if (!isNaN(gNum) && gNum <= 5) {
      return configOverrides?.defaultPrimaryBenchmarkScore ?? 7.0
    }
    return configOverrides?.defaultSecondaryBenchmarkScore ?? 6.0
  }

  const resolveTargetPassRate = (grade: string, subjectId?: string): number => {
    const quota = subjectQuotas.find(
      (q: any) => (q.grade === grade || !q.grade) && q.subjectId === subjectId
    ) as any
    if (quota && typeof quota.passRateTarget === "number") {
      return quota.passRateTarget
    }
    if (quota && typeof quota.quota === "number" && quota.quota > 0) {
      return quota.quota
    }
    return configOverrides?.defaultTargetPassRate ?? 85.0
  }

  // ============================================================================
  // 2. CHỈ SỐ CHẤT LƯỢNG GIẢNG DẠY & KHỐI LƯỢNG SỔ ĐIỂM / ĐGNL
  // ============================================================================
  const bySubjectClass: SeparatedProgressAndKPI["teachingQuality"]["bySubjectClass"] = []
  let gradebookEnteredCount = 0
  let gradebookTotalExpected = 0
  let totalStudentsEvaluated = 0
  let passBenchmarkCount = 0
  let underBenchmarkCount = 0
  let improvedStudentsCount = 0
  let trackedProgressStudentsCount = 0
  let scoreSum = 0
  let scoreCount = 0

  for (const assign of profile.teachingAssignments) {
    const [totalStudents, entries] = await Promise.all([
      prisma.student.count({
        where: { classId: assign.classId, status: "ACTIVE" },
      }).catch(() => 0),

      prisma.subjectGradeEntry.findMany({
        where: { classId: assign.classId, subjectId: assign.subjectId },
        orderBy: { updatedAt: "asc" },
      }).catch(() => []),
    ])

    const benchmarkScore = resolveBenchmark(assign.grade, assign.subjectId)
    const targetPassRateQuota = resolveTargetPassRate(assign.grade, assign.subjectId)

    // Nhóm điểm theo từng học sinh qua các kỳ để tính cả điểm mới nhất và tỷ lệ tiến bộ
    const studentScoresByPeriod = new Map<string, Array<{ period: string; score: number }>>()
    const enteredStudentIds = new Set<string>()

    for (const e of entries) {
      const entryAny = e as any
      if (e.compositeScore !== null || e.remark || entryAny.teacherRemark) {
        enteredStudentIds.add(e.studentId)
      }
      if (typeof e.compositeScore === "number" && !isNaN(e.compositeScore)) {
        const list = studentScoresByPeriod.get(e.studentId) || []
        const periodKey = entryAny.period || e.evaluationPeriod || "CURRENT"
        list.push({ period: String(periodKey).toUpperCase(), score: e.compositeScore })
        studentScoresByPeriod.set(e.studentId, list)
      }
    }

    let classPass = 0
    let classUnder = 0
    let classScoreSum = 0
    let classScoredCount = 0
    let classImproved = 0
    let classTrackedProgress = 0

    studentScoresByPeriod.forEach((periodList) => {
      // Sắp xếp theo thứ tự kỳ chuẩn nếu có
      periodList.sort((a, b) => {
        const idxA = PERIOD_SEQUENCE.indexOf(a.period)
        const idxB = PERIOD_SEQUENCE.indexOf(b.period)
        if (idxA !== -1 && idxB !== -1) return idxA - idxB
        return 0
      })

      const latest = periodList[periodList.length - 1]
      if (latest) {
        classScoredCount++
        classScoreSum += latest.score
        scoreCount++
        scoreSum += latest.score

        if (latest.score >= benchmarkScore) {
          classPass++
          passBenchmarkCount++
        } else {
          classUnder++
          underBenchmarkCount++
        }
      }

      if (periodList.length >= 2) {
        const prev = periodList[periodList.length - 2]
        classTrackedProgress++
        trackedProgressStudentsCount++
        if (latest.score >= prev.score) {
          classImproved++
          improvedStudentsCount++
        }
      }
    })

    const enteredForClass = Math.min(totalStudents, enteredStudentIds.size)
    gradebookEnteredCount += enteredForClass
    gradebookTotalExpected += totalStudents
    totalStudentsEvaluated += classScoredCount

    const classPassRate = classScoredCount > 0 ? Number(((classPass / classScoredCount) * 100).toFixed(1)) : 0
    const classAvg = classScoredCount > 0 ? Number((classScoreSum / classScoredCount).toFixed(2)) : null

    bySubjectClass.push({
      classId: assign.classId,
      className: assign.className,
      campusId: assign.campusId,
      campusName: assign.campusName,
      subjectId: assign.subjectId,
      subjectName: assign.subjectName,
      programType: "MOET",
      totalStudents,
      gradedStudents: enteredForClass,
      benchmarkScore,
      targetPassRateQuota,
      passCount: classPass,
      underBenchmarkCount: classUnder,
      passRate: classPassRate,
      averageScore: classAvg,
      improvedCount: classImproved,
      isQuotaMet: classScoredCount > 0 ? classPassRate >= targetPassRateQuota : false,
    })
  }

  // Kiểm tra độ phủ ĐGNL (Đánh giá năng lực)
  let competencyEvaluatedCount = 0
  let competencyTotalExpected = 0
  if (homeroomClassIds.length > 0) {
    competencyTotalExpected = profile.homeroomClasses.reduce((acc, c) => acc + c.studentCount, 0)
    const distinctCompStudents =
      (await prisma.studentSubjectCompetencySummary
        ?.findMany({
          where: {
            student: { classId: { in: homeroomClassIds }, status: "ACTIVE" },
          },
          select: { studentId: true },
          distinct: ["studentId"],
        })
        ?.catch(() => [])) ?? []
    const mockCompCount =
      distinctCompStudents.length === 0 && (prisma as any).studentCompetencySummary
        ? ((await (prisma as any).studentCompetencySummary
            ?.count({
              where: {
                student: { classId: { in: homeroomClassIds }, status: "ACTIVE" },
              },
            })
            ?.catch(() => 0)) ?? 0)
        : 0
    competencyEvaluatedCount = Math.min(
      competencyTotalExpected,
      distinctCompStudents.length || mockCompCount
    )
  }

  // ============================================================================
  // 3. TIẾN ĐỘ ĐƯỢC PHÊ DUYỆT / CÔNG NHẬN (approvalProgress) & DỰ GIỜ KPI
  // ============================================================================
  let observationsApproved = 0
  let observationsPending = 0
  let monthValidObservedPeriods = 0
  let monthValidTaughtPeriods = 0

  let activitiesApproved = 0
  let activitiesPending = 0
  let ctqtGradesApproved = 0
  let ctqtGradesPending = 0
  let ctqtChangesRequested = 0
  let specialGradesApproved = 0
  let specialGradesPending = 0

  if (teacherId) {
    const [obsRegs, taughtSlotsThisMonth, actRecords, ctqtEntries, specialEntries] = await Promise.all([
      prisma.observationRegistration.findMany({
        where: { teacherId },
        include: { slot: true, evaluation: true },
      }).catch(() => []),

      prisma.observationSlot.findMany({
        where: {
          teacherId,
          date: { gte: monthStart, lte: monthEnd },
        },
        include: {
          registrations: {
            where: { isApproved: true, evaluation: { isNot: null } },
          },
        },
      }).catch(() => []),

      prisma.activityRecord.findMany({
        where: {
          OR: [{ teacherId }, { teacherId: profile.userId }],
        },
        select: { status: true },
      }).catch(() => []),

      profile.ctqtAssignments.length > 0
        ? prisma.ctqtGradeEntry.findMany({
            where: {
              OR: profile.ctqtAssignments.map((c) => ({
                classId: c.classId,
                subjectCode: c.subjectCode,
              })),
            },
          }).catch(() => [])
        : Promise.resolve([]),

      profile.specialAssignments.length > 0
        ? prisma.specialGradeEntry
            .findMany({
              where: {
                assignmentId: { in: profile.specialAssignments.map((s) => s.assignmentId) },
              },
              select: { status: true },
            })
            .catch(() => [])
        : Promise.resolve([]),
    ])

    for (const r of obsRegs) {
      if (r.isApproved && r.evaluation) {
        observationsApproved++
        const d = r.slot?.date ? new Date(r.slot.date) : null
        if (d && d >= monthStart && d <= monthEnd) {
          monthValidObservedPeriods += r.slot?.isDoublePeriod ? 2 : 1
        }
      } else if (!r.isApproved || !r.evaluation) {
        observationsPending++
      }
    }

    for (const ts of taughtSlotsThisMonth) {
      if (ts.registrations && ts.registrations.length > 0) {
        monthValidTaughtPeriods += ts.isDoublePeriod ? 2 : 1
      }
    }

    for (const ar of actRecords) {
      if (ar.status === "APPROVED") activitiesApproved++
      else if (ar.status === "SUBMITTED") activitiesPending++
    }

    for (const ce of ctqtEntries) {
      const ceAny = ce as any
      const st = ceAny.status || ceAny.endTermApprovalStatus || ceAny.midTermApprovalStatus
      if (st === "APPROVED") ctqtGradesApproved++
      else if (st === "PENDING_REVIEW" || st === "SUBMITTED") ctqtGradesPending++
      else if (st === "CHANGES_REQUESTED" || st === "REJECTED") ctqtChangesRequested++
    }

    for (const se of specialEntries) {
      if (se.status === "APPROVED") specialGradesApproved++
      else if (se.status === "SUBMITTED") specialGradesPending++
    }
  }

  const approvedItems =
    observationsApproved + activitiesApproved + ctqtGradesApproved + specialGradesApproved
  const waitingApprovalItems =
    observationsPending + activitiesPending + ctqtGradesPending + specialGradesPending
  const totalSubmittedItems = approvedItems + waitingApprovalItems + ctqtChangesRequested
  const approvalRate =
    totalSubmittedItems > 0 ? Number(((approvedItems / totalSubmittedItems) * 100).toFixed(1)) : 100

  // ============================================================================
  // 4. HIỆU QUẢ HỖ TRỢ & CỐ VẤN HỌC SINH (studentSupportEffectiveness)
  // ============================================================================
  let redAlertCount = 0
  let yellowAlertCount = 0
  let remedialTargetsTotal = 0
  let remedialEvaluatedCount = 0
  let smartGoalsTotal = 0
  let smartGoalsSignedCount = 0
  let smartGoalsAchievedCount = 0
  let unlockBarriersTotal = 0
  let unlockBarriersResolvedCount = 0
  let helpRequestsTotal = 0
  let helpRequestsResolvedCount = 0
  let parentFeedbacksTotal = 0
  let parentFeedbacksResolvedCount = 0

  const [advisories, remedialTargets, goals, unlocks, helpReqs, parentLogs] = await Promise.all([
    homeroomClassIds.length > 0
      ? prisma.studentAdvisoryStatus.findMany({
          where: {
            student: { classId: { in: homeroomClassIds }, status: "ACTIVE" },
            statusColor: { in: ["RED", "YELLOW"] },
          },
          select: { statusColor: true },
        }).catch(() => [])
      : Promise.resolve([]),

    teacherId
      ? prisma.learningSupportTarget.findMany({
          where: {
            OR: [
              { assignments: { some: { teacherId } } },
              ...(homeroomClassIds.length > 0
                ? [{ student: { classId: { in: homeroomClassIds } } }]
                : []),
            ],
            status: "ACTIVE",
          },
          include: {
            assignments: {
              include: {
                evaluations: { select: { id: true } },
              },
            },
          },
        }).catch(() => [])
      : Promise.resolve([]),

    homeroomClassIds.length > 0
      ? prisma.studentGoal.findMany({
          where: { student: { classId: { in: homeroomClassIds }, status: "ACTIVE" } },
          select: { signedByTeacher: true, status: true, achievementLevel: true },
        }).catch(() => [])
      : Promise.resolve([]),

    homeroomClassIds.length > 0
      ? prisma.studentGoalUnlock.findMany({
          where: { goal: { student: { classId: { in: homeroomClassIds } } } },
          select: { status: true, supportStatus: true },
        }).catch(() => [])
      : Promise.resolve([]),

    homeroomClassIds.length > 0
      ? prisma.studentHelpRequest.findMany({
          where: { student: { classId: { in: homeroomClassIds } } },
          select: { status: true },
        }).catch(() => [])
      : Promise.resolve([]),

    prisma.academicConsultationLog.findMany({
      where: {
        difficulties: { contains: "Ý KIẾN PHHS:" },
        OR: [
          ...(homeroomClassIds.length > 0 ? [{ student: { classId: { in: homeroomClassIds } } }] : []),
          ...(teacherId ? [{ teacherId }] : []),
        ],
      },
      select: { content: true, nextActions: true },
    }).catch(() => []),
  ])

  for (const adv of advisories) {
    if (adv.statusColor === "RED") redAlertCount++
    else if (adv.statusColor === "YELLOW") yellowAlertCount++
  }

  remedialTargetsTotal = remedialTargets.length
  remedialEvaluatedCount = remedialTargets.filter((t: any) => {
    if (Array.isArray(t.evaluations) && t.evaluations.length > 0) return true
    if (Array.isArray(t.assignments)) {
      return t.assignments.some((a: any) => Array.isArray(a.evaluations) && a.evaluations.length > 0)
    }
    return false
  }).length

  smartGoalsTotal = goals.length
  smartGoalsSignedCount = goals.filter((g) => g.signedByTeacher).length
  smartGoalsAchievedCount = goals.filter(
    (g) => g.status === "COMPLETED" || g.achievementLevel === "DAT"
  ).length

  unlockBarriersTotal = unlocks.length
  unlockBarriersResolvedCount = unlocks.filter(
    (u) => u.status === "COMPLETED" || u.supportStatus === "RESOLVED" || u.supportStatus === "SUPPORTED"
  ).length

  helpRequestsTotal = helpReqs.length
  helpRequestsResolvedCount = helpReqs.filter((h) => h.status === "RESOLVED").length

  parentFeedbacksTotal = parentLogs.length
  parentFeedbacksResolvedCount = parentLogs.filter(
    (l) =>
      (l.content || "").includes("Ý KIẾN GVCN:") ||
      (l.nextActions || "").includes("[ACKNOWLEDGED]") ||
      (l.nextActions || "").includes("[GVBM_RESPONSE:")
  ).length

  const totalSupportActionsExpected =
    remedialTargetsTotal + smartGoalsTotal + unlockBarriersTotal + helpRequestsTotal + parentFeedbacksTotal
  const totalSupportActionsHandled =
    remedialEvaluatedCount +
    smartGoalsSignedCount +
    unlockBarriersResolvedCount +
    helpRequestsResolvedCount +
    parentFeedbacksResolvedCount
  const supportCoverageRate =
    totalSupportActionsExpected > 0
      ? Number(((totalSupportActionsHandled / totalSupportActionsExpected) * 100).toFixed(1))
      : 100

  // ============================================================================
  // 5. TIẾN ĐỘ KHỐI LƯỢNG CÔNG VIỆC & TUÂN THỦ THỜI HẠN TỪ TASK LIST
  // ============================================================================
  const completedTasksCount = allTasks.filter((t) => t.status === "COMPLETED").length
  const inProgressTasksCount = allTasks.filter(
    (t) => t.status === "IN_PROGRESS" || t.status === "WAITING"
  ).length

  // Tổng khối lượng bao gồm cả các hạng mục đã hoàn thành trong sổ điểm / dự giờ / cố vấn
  const completedUnits =
    completedTasksCount +
    bySubjectClass.filter((c) => c.totalStudents > 0 && c.gradedStudents >= c.totalStudents).length +
    observationsApproved +
    parentFeedbacksResolvedCount
  const totalUnits = Math.max(1, allTasks.filter((t) => t.status !== "COMPLETED").length + completedUnits)
  const volumeCompletionRate = Number(((completedUnits / totalUnits) * 100).toFixed(1))

  // Mức độ tuân thủ thời hạn
  const tasksWithDeadline = allTasks.filter((t) => Boolean(t.deadlineDate))
  const overdueCount = allTasks.filter((t) => t.status === "OVERDUE").length
  const dueSoonCount = tasksWithDeadline.filter((t) => {
    if (t.status === "COMPLETED" || t.status === "OVERDUE") return false
    const d = new Date(t.deadlineDate!)
    return d >= now && d <= in48Hours
  }).length
  const totalDeadlinePool = Math.max(1, tasksWithDeadline.length + completedUnits)
  const onTimeCount = Math.max(0, totalDeadlinePool - overdueCount)
  const complianceRate = Number(((onTimeCount / totalDeadlinePool) * 100).toFixed(1))

  // ============================================================================
  // 6. MỨC ĐẠT KPI THEO QUY ĐỊNH (kpiAttainment)
  // ============================================================================
  const requiredMonthlyObs = configOverrides?.defaultMonthlyObservationQuota ?? 2
  const requiredYearlyTaught = yearTarget?.requiredTaught ?? 1
  const isObservationMet = monthValidObservedPeriods >= requiredMonthlyObs
  const deficitPeriods = Math.max(0, requiredMonthlyObs - monthValidObservedPeriods)

  const completedClassesCount = bySubjectClass.filter(
    (c) => c.totalStudents > 0 && c.gradedStudents >= c.totalStudents
  ).length
  const totalAssignedClassesCount = bySubjectClass.length
  const isGradebookMet =
    totalAssignedClassesCount === 0 || completedClassesCount >= totalAssignedClassesCount

  const totalExpTasks = activitiesApproved + activitiesPending
  const isExperientialMet = activitiesPending === 0

  let metCriteriaCount = 0
  const totalCriteriaCount = 3
  if (isObservationMet) metCriteriaCount++
  if (isGradebookMet) metCriteriaCount++
  if (isExperientialMet) metCriteriaCount++

  const overallStatus: "MET" | "PARTIAL" | "UNMET" =
    metCriteriaCount === totalCriteriaCount
      ? "MET"
      : metCriteriaCount > 0
      ? "PARTIAL"
      : "UNMET"

  return {
    volumeProgress: {
      completedTasks: completedUnits,
      totalAssignedTasks: totalUnits,
      inProgressTasks: inProgressTasksCount,
      completionRate: volumeCompletionRate,
      gradebookEnteredCount,
      gradebookTotalExpected,
      competencyEvaluatedCount,
      competencyTotalExpected,
    },
    approvalProgress: {
      approvedItems,
      waitingApprovalItems,
      changesRequestedItems: ctqtChangesRequested,
      totalSubmittedItems,
      approvalRate,
      breakdown: {
        observationsApproved,
        observationsPending,
        activitiesApproved,
        activitiesPending,
        ctqtGradesApproved,
        ctqtGradesPending,
        specialGradesApproved,
        specialGradesPending,
      },
    },
    deadlineCompliance: {
      onTimeCount,
      overdueCount,
      dueSoonCount,
      totalWithDeadline: totalDeadlinePool,
      complianceRate,
    },
    kpiAttainment: {
      overallStatus,
      metCriteriaCount,
      totalCriteriaCount,
      observationQuota: {
        currentMonth,
        currentYear,
        observedValidCount: monthValidObservedPeriods,
        requiredObservedQuota: requiredMonthlyObs,
        taughtValidCount: monthValidTaughtPeriods,
        requiredTaughtQuota: requiredYearlyTaught,
        isTargetConfirmed: yearTarget
          ? Boolean(yearTarget.confirmed || (yearTarget as any).status === "CONFIRMED")
          : true,
        isObservationMet,
        deficitPeriods,
      },
      gradebookQuota: {
        completedClassesCount,
        totalAssignedClassesCount,
        isMet: isGradebookMet,
      },
      experientialQuota: {
        evaluatedActivitiesCount: activitiesApproved,
        totalAssignedActivitiesCount: totalExpTasks,
        isMet: isExperientialMet,
      },
    },
    teachingQuality: {
      totalStudentsEvaluated,
      passBenchmarkCount,
      underBenchmarkCount,
      passRate:
        totalStudentsEvaluated > 0
          ? Number(((passBenchmarkCount / totalStudentsEvaluated) * 100).toFixed(1))
          : 100,
      improvedStudentsCount,
      trackedProgressStudentsCount,
      progressRate:
        trackedProgressStudentsCount > 0
          ? Number(((improvedStudentsCount / trackedProgressStudentsCount) * 100).toFixed(1))
          : 100,
      averageScore: scoreCount > 0 ? Number((scoreSum / scoreCount).toFixed(2)) : null,
      bySubjectClass,
    },
    studentSupportEffectiveness: {
      atRiskTotal: redAlertCount + yellowAlertCount,
      redAlertCount,
      yellowAlertCount,
      remedialTargetsTotal,
      remedialEvaluatedCount,
      smartGoalsTotal,
      smartGoalsSignedCount,
      smartGoalsAchievedCount,
      unlockBarriersTotal,
      unlockBarriersResolvedCount,
      helpRequestsTotal,
      helpRequestsResolvedCount,
      parentFeedbacksTotal,
      parentFeedbacksResolvedCount,
      supportCoverageRate,
    },
  }
}
