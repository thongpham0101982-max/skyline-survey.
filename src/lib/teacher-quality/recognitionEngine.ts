import type {
  CoachingStatus,
  GroupReportSummaryRow,
  MonthlyTeacherObservationRow,
  RecognitionRecordItem,
  TeacherDevelopmentPlanItem,
  TeacherNpsPeriodRow,
} from "./types"

/**
 * Normalizes coaching status to the 3 official states:
 * NOT_STARTED ("Chưa thực hiện") | IN_PROGRESS ("Đang thực hiện") | COMPLETED ("Hoàn thành")
 */
export function normalizeCoachingStatus(raw?: string | null): CoachingStatus {
  const s = String(raw || "").toUpperCase().trim()
  if (s === "COMPLETED" || s === "DONE") return "COMPLETED"
  if (s === "IN_PROGRESS") return "IN_PROGRESS"
  return "NOT_STARTED"
}

export function coachingStatusLabelVi(status: CoachingStatus): string {
  if (status === "COMPLETED") return "Hoàn thành"
  if (status === "IN_PROGRESS") return "Đang thực hiện"
  return "Chưa thực hiện"
}

/**
 * Computes due-soon (within 7 days) and overdue flags for a coaching task.
 * Completed tasks are never overdue or due soon.
 */
export function computeDueFlags(
  dueDate: Date | string | null | undefined,
  status: CoachingStatus,
  now: Date = new Date()
): { isDueSoon: boolean; isOverdue: boolean } {
  if (!dueDate || status === "COMPLETED") {
    return { isDueSoon: false, isOverdue: false }
  }
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate)
  if (Number.isNaN(due.getTime())) {
    return { isDueSoon: false, isOverdue: false }
  }

  // Compare by calendar day in VN timezone (UTC+7)
  const vnOffset = 7 * 60 * 60 * 1000
  const dueDay = Math.floor((due.getTime() + vnOffset) / (24 * 60 * 60 * 1000))
  const todayDay = Math.floor((now.getTime() + vnOffset) / (24 * 60 * 60 * 1000))
  const diffDays = dueDay - todayDay

  if (diffDays < 0) return { isDueSoon: false, isOverdue: true }
  if (diffDays <= 7) return { isDueSoon: true, isOverdue: false }
  return { isDueSoon: false, isOverdue: false }
}

/**
 * Resolves the reference date used to compute Sky-Line seniority:
 * - Ended academic year -> academicYear.endDate
 * - Ongoing/active academic year -> current date
 */
export function resolveSeniorityReferenceDate(
  academicYear: { status?: string | null; endDate?: Date | string | null },
  now: Date = new Date()
): { referenceDate: Date; isEnded: boolean } {
  const end = academicYear.endDate
    ? academicYear.endDate instanceof Date
      ? academicYear.endDate
      : new Date(academicYear.endDate)
    : null
  const validEnd = end && !Number.isNaN(end.getTime()) ? end : null
  const statusEnded =
    String(academicYear.status || "").toUpperCase() !== "ACTIVE" &&
    String(academicYear.status || "").toUpperCase() !== "UPCOMING"
  const dateEnded = Boolean(validEnd && validEnd.getTime() < now.getTime())
  const isEnded = Boolean(validEnd && (statusEnded || dateEnded))

  return {
    referenceDate: isEnded && validEnd ? validEnd : now,
    isEnded,
  }
}

/**
 * Deduplicates student competition results across multiple teachers.
 * If 2+ teachers co-coach the same student competition result (same dedupKey),
 * each teacher's profile shows their role, while summary reports count it ONLY ONCE.
 */
export function deduplicateCompetitionCount(
  items: Array<Pick<RecognitionRecordItem, "id" | "groupType" | "dedupKey">>
): number {
  const seenKeys = new Set<string>()
  for (const item of items) {
    if (item.groupType !== "STUDENT_COMPETITION") continue
    const key = (item.dedupKey || "").trim() || item.id
    seenKeys.add(key)
  }
  return seenKeys.size
}

/**
 * Standard NPS score: round((promoters - detractors) / total * 100)
 */
export function computeNpsScore(promoters: number, detractors: number, total: number): number {
  if (total <= 0) return 0
  return Math.round(((promoters - detractors) / total) * 100)
}

/**
 * Builds summary report rows grouped by Campus or Department.
 * Uses deduplicateCompetitionCount so shared student competition results are counted once per group.
 */
export function buildGroupReportSummary(params: {
  groupBy: "campus" | "department"
  monthlyRows: MonthlyTeacherObservationRow[]
  recognitions: RecognitionRecordItem[]
  npsRows: TeacherNpsPeriodRow[]
  coachingPlans: TeacherDevelopmentPlanItem[]
}): GroupReportSummaryRow[] {
  const { groupBy, monthlyRows, recognitions, npsRows, coachingPlans } = params

  const groups = new Map<
    string,
    {
      groupId: string
      groupName: string
      teacherIds: Set<string>
      obsRows: MonthlyTeacherObservationRow[]
    }
  >()

  const teacherGroupMap = new Map<string, string>()

  for (const row of monthlyRows) {
    const gid =
      groupBy === "campus"
        ? row.campusId || "UNKNOWN_CAMPUS"
        : row.departmentId || "NO_DEPT"
    const gname =
      groupBy === "campus"
        ? row.campusName || "Chưa rõ cơ sở"
        : row.departmentName || "Chưa gán tổ chuyên môn"

    teacherGroupMap.set(row.teacherId, gid)
    const entry = groups.get(gid) || {
      groupId: gid,
      groupName: gname,
      teacherIds: new Set<string>(),
      obsRows: [],
    }
    entry.teacherIds.add(row.teacherId)
    entry.obsRows.push(row)
    groups.set(gid, entry)
  }

  const result: GroupReportSummaryRow[] = []

  for (const [gid, entry] of groups.entries()) {
    const groupRecs = recognitions.filter((r) => teacherGroupMap.get(r.teacherId) === gid)
    const groupNps = npsRows.filter((n) => teacherGroupMap.get(n.teacherId) === gid)
    const groupCoaching = coachingPlans.filter((c) => teacherGroupMap.get(c.teacherId) === gid)

    const totalNpsResponses = groupNps.reduce((s, n) => s + n.validResponses, 0)
    const totalPromoters = groupNps.reduce((s, n) => s + n.promoters, 0)
    const totalDetractors = groupNps.reduce((s, n) => s + n.detractors, 0)

    result.push({
      groupId: gid,
      groupName: entry.groupName,
      teacherCount: entry.teacherIds.size,
      deptAwardCount: groupRecs.filter((r) => r.groupType === "DEPT_AWARD").length,
      systemAwardCount: groupRecs.filter((r) => r.groupType === "SYSTEM_AWARD").length,
      dedupStudentCompetitionCount: deduplicateCompetitionCount(groupRecs),
      aiTechCount: groupRecs.filter((r) => r.groupType === "AI_TECH").length,
      avgNpsScore:
        totalNpsResponses > 0
          ? computeNpsScore(totalPromoters, totalDetractors, totalNpsResponses)
          : null,
      observedCompliantCount: entry.obsRows.filter(
        (r) => r.observingCompliance.code === "COMPLIANT"
      ).length,
      observedUnobservedCount: entry.obsRows.filter(
        (r) => r.observingCompliance.code === "UNOBSERVED"
      ).length,
      observedShortfallCount: entry.obsRows.filter(
        (r) => r.observingCompliance.code === "SHORTFALL"
      ).length,
      observedNoQuotaCount: entry.obsRows.filter(
        (r) => r.observingCompliance.code === "NO_QUOTA"
      ).length,
      teachingNeedsCoachingCount: entry.obsRows.filter(
        (r) => r.teachingCompliance.code === "NEEDS_IMPROVEMENT"
      ).length,
      coachingTotal: groupCoaching.length,
      coachingCompleted: groupCoaching.filter((c) => c.status === "COMPLETED").length,
      coachingOverdue: groupCoaching.filter((c) => c.isOverdue).length,
    })
  }

  return result.sort((a, b) => a.groupName.localeCompare(b.groupName, "vi"))
}
