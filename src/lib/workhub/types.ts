export type WorkHubTaskStatus =
  | "DRAFT"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "PENDING_REVIEW"
  | "COMPLETED"
  | "PAUSED"
  | "CANCELLED"

export type WorkHubPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"

export type WorkHubPlanPeriodType = "WEEKLY" | "MONTHLY" | "SEMESTER" | "ACADEMIC_YEAR"
export type WorkHubPlanStatus = "DRAFT" | "APPROVED" | "ADJUSTED"

export type WorkHubReportScope = "INDIVIDUAL" | "DEPARTMENT" | "CAMPUS"
export type WorkHubReportPeriodType = "WEEKLY" | "MONTHLY"
export type WorkHubReportStatus = "DRAFT" | "SUBMITTED" | "NEEDS_REVISION" | "APPROVED"

export type WorkHubKpiTargetScope = "INDIVIDUAL" | "DEPARTMENT" | "CAMPUS"
export type WorkHubKpiDirection = "HIGHER_IS_BETTER" | "LOWER_IS_BETTER" | "WITHIN_RANGE"
export type WorkHubKpiFormulaType =
  | "ON_TIME_TASK_RATE"
  | "ACCEPTED_TASK_RATE"
  | "ON_TIME_REPORT_RATE"
  | "DELIVERABLE_PASS_RATE"
  | "CONFIRMED_OUTPUT_COUNT"
  | "MANUAL_METRIC"

export type WorkHubKpiDataSourceType = "AUTO" | "MANUAL"
export type WorkHubKpiMissingRule = "EXCLUDE_REWEIGHT" | "MARK_INCOMPLETE"
export type WorkHubKpiOutcomeBand =
  | "PASS"
  | "WARNING"
  | "FAIL"
  | "INSUFFICIENT_DATA"

export type WorkHubRoleTier =
  | "INDIVIDUAL"
  | "DEPARTMENT_HEAD"
  | "CAMPUS_HEAD"
  | "EXECUTIVE"

export interface WorkHubActorScope {
  userId: string
  userName: string
  email: string | null
  roleCode: string
  roleTier: WorkHubRoleTier
  isSuperAdmin: boolean
  isExecutive: boolean
  isDepartmentHead: boolean
  isCampusHead: boolean
  canAssignTasks: boolean
  canViewOrgTracking: boolean
  canManageSettings: boolean
  canManageKpiDefinitions: boolean
  primaryDepartmentId: string | null
  primaryDepartmentName: string | null
  primaryCampusId: string | null
  primaryCampusName: string | null
  managedDepartmentIds: string[] | null // null = unrestricted (Executive/SuperAdmin)
  managedCampusIds: string[] | null // null = unrestricted
  scopedUserIds: string[] | null // null = unrestricted
}

export interface WorkHubTaskRecord {
  id: string
  taskCode: string
  title: string
  description: string
  category: string
  planId: string | null
  planTitle?: string | null
  isAdhoc: boolean
  departmentId: string | null
  departmentName: string | null
  campusId: string | null
  campusName: string | null
  academicYearId: string | null
  assignedById: string
  assignedByName: string
  assignedToUserId: string | null
  assignedToName: string | null
  collaboratorIds: string[]
  collaboratorNames: string[]
  reviewerUserId: string | null
  reviewerName: string | null
  parentTaskId: string | null
  parentTaskCode?: string | null
  childCount: number
  startDate: string
  endDate: string
  priority: WorkHubPriority
  workStatus: WorkHubTaskStatus
  statusReason: string | null
  acceptanceCriteria: string | null
  deliverables: string | null
  progressPercent: number
  resultSummary: string | null
  evidenceLinks: Array<{ label: string; url: string }>
  attachmentsCount: number
  commentsCount: number
  unresolvedBlockerCount: number
  linkedKpiId: string | null
  linkedKpiCode: string | null
  productMetCriteria: boolean | null
  submittedForReviewAt: string | null
  completedAt: string | null
  reviewComment: string | null
  recurrenceTemplateId: string | null
  recurrenceInstanceKey: string | null
  // Computed server-side deadline truths (never user-editable)
  isOverdue: boolean
  completedOnTime: boolean | null
  dueSoon: boolean
  createdAt: string
  updatedAt: string
}

export interface WorkHubTaskHistoryEntry {
  id: string
  taskId: string
  actorId: string
  actorName: string
  eventType:
    | "CREATED"
    | "ASSIGNED"
    | "REASSIGNED"
    | "DEADLINE_CHANGED"
    | "STATUS_CHANGED"
    | "PROGRESS_UPDATED"
    | "SUBMITTED_FOR_REVIEW"
    | "REVISION_REQUESTED"
    | "APPROVED_COMPLETED"
    | "PAUSED"
    | "CANCELLED"
  fromValue: string | null
  toValue: string | null
  reason: string | null
  metaJson: string | null
  createdAt: string
}

export interface WorkHubPlanObjective {
  id: string
  title: string
  targetMetric: string
  weightPercent?: number
}

export interface WorkHubPlanRecord {
  id: string
  planCode: string
  title: string
  description: string | null
  periodType: WorkHubPlanPeriodType
  periodLabel: string
  academicYearId: string | null
  departmentId: string | null
  departmentName: string | null
  campusId: string | null
  campusName: string | null
  ownerUserId: string
  ownerName: string
  approverUserId: string | null
  approverName: string | null
  startDate: string
  endDate: string
  status: WorkHubPlanStatus
  versionNumber: number
  lastAdjustmentReason: string | null
  objectives: WorkHubPlanObjective[]
  approvedAt: string | null
  createdAt: string
  updatedAt: string
  // Computed task rollups (excluding cancelled & parent-child duplicates)
  metrics?: {
    totalCanonicalTasks: number
    plannedTasksCount: number
    adhocTasksCount: number
    completedTasksCount: number
    inProgressTasksCount: number
    overdueTasksCount: number
    progressPercent: number
  }
}

export interface WorkHubPlanVersionRecord {
  id: string
  planId: string
  versionNumber: number
  statusAtSnapshot: WorkHubPlanStatus
  adjustmentReason: string
  snapshotJson: string
  changedByUserId: string
  changedByName: string
  createdAt: string
}

export interface WorkHubReportSnapshotMetrics {
  generatedAt: string
  periodStart: string
  periodEnd: string
  totalCanonicalTasks: number
  completedInPeriodCount: number
  inProgressAtCutoffCount: number
  overdueCount: number
  adhocCount: number
  pendingReviewCount: number
  completedTaskIds: string[]
  inProgressTaskIds: string[]
  overdueTaskIds: string[]
  adhocTaskIds: string[]
  deliverablesSummary: Array<{
    taskId: string
    taskCode: string
    title: string
    deliverables: string | null
    resultSummary: string | null
    hasEvidence: boolean
    workStatus: WorkHubTaskStatus
  }>
  kpiSummary: Array<{
    kpiId: string
    kpiCode: string
    kpiName: string
    unit: string
    actualDisplay: string
    targetDisplay: string
    outcomeBand: WorkHubKpiOutcomeBand
  }>
  // For DEPARTMENT / CAMPUS reports: explicit submission accountability
  submissionRollup?: {
    expectedUsersCount: number
    submittedUsersCount: number
    approvedUsersCount: number
    submittedUsers: Array<{ userId: string; fullName: string; status: WorkHubReportStatus }>
    missingUsers: Array<{ userId: string; fullName: string; departmentName: string | null }>
  }
}

export interface WorkHubReportRecord {
  id: string
  reportCode: string
  reportScope: WorkHubReportScope
  periodType: WorkHubReportPeriodType
  periodKey: string
  periodLabel: string
  academicYearId: string | null
  year: number
  month: number
  weekNumber: number | null
  periodStart: string
  periodEnd: string
  ownerUserId: string
  ownerName: string
  departmentId: string | null
  departmentName: string | null
  campusId: string | null
  campusName: string | null
  status: WorkHubReportStatus
  isLocked: boolean
  versionNumber: number
  // User-authored qualitative commentary (cannot overwrite source numbers)
  executiveCommentary: string
  blockersAndCauses: string
  supportRequests: string
  nextPeriodPlan: string
  // Reviewer feedback
  reviewerUserId: string | null
  reviewerName: string | null
  reviewFeedback: string | null
  submittedSnapshotAt: string | null
  approvedAt: string | null
  snapshot: WorkHubReportSnapshotMetrics
  createdAt: string
  updatedAt: string
}

export interface WorkHubKpiFormulaConfig {
  numeratorDescription: string
  denominatorDescription: string
  includedTaskFilter: "ALL_ASSIGNED_LEAF" | "REVIEW_REQUIRED_LEAF" | "SUBMITTED_REPORTS" | "MANUAL_INPUT"
  excludeCancelled: boolean
  excludePaused: boolean
  categoryFilter?: string | null
  rangeMin?: number | null
  rangeMax?: number | null
}

export interface WorkHubKpiDefinitionRecord {
  id: string
  kpiCode: string
  name: string
  purpose: string
  unit: string
  targetScope: WorkHubKpiTargetScope
  evaluationCycle: WorkHubPlanPeriodType
  effectiveFrom: string
  effectiveTo: string | null
  targetValue: number
  direction: WorkHubKpiDirection
  formulaType: WorkHubKpiFormulaType
  formulaConfig: WorkHubKpiFormulaConfig
  dataSourceType: WorkHubKpiDataSourceType
  passThreshold: number
  warningThreshold: number
  failThreshold: number
  weight: number | null
  capScorePercent: number
  confirmerRoleOrUserId: string | null
  missingDataRule: WorkHubKpiMissingRule
  exceptionNote: string | null
  currentVersion: number
  isActive: boolean
  departmentId: string | null
  campusId: string | null
  createdAt: string
  updatedAt: string
}

export interface WorkHubKpiEvaluationResult {
  id: string
  kpiId: string
  kpiCode: string
  kpiName: string
  purpose: string
  unit: string
  kpiVersion: number
  targetScope: WorkHubKpiTargetScope
  targetEntityId: string
  targetEntityName: string
  periodKey: string
  periodLabel: string
  direction: WorkHubKpiDirection
  formulaType: WorkHubKpiFormulaType
  formulaConfig: WorkHubKpiFormulaConfig
  dataSourceType: WorkHubKpiDataSourceType
  targetValue: number
  passThreshold: number
  warningThreshold: number
  weight: number | null
  capScorePercent: number
  numeratorValue: number | null
  denominatorValue: number | null
  actualValue: number | null
  actualDisplay: string // "Chưa đủ dữ liệu" when denominator = 0 or missing manual input
  achievementScorePercent: number | null
  outcomeBand: WorkHubKpiOutcomeBand
  sourceRecordIds: string[]
  manualEvidenceNote: string | null
  status: "PROVISIONAL" | "CONFIRMED"
  confirmedByUserId: string | null
  confirmedByName: string | null
  confirmedAt: string | null
  updatedAt: string
}

export interface WorkHubReminderConfig {
  id: string
  dueSoonHours: number
  enableDueSoon: boolean
  enableOverdue: boolean
  enablePendingReview: boolean
  enableReportDeadline: boolean
  digestFrequency: "DAILY_DIGEST" | "TWICE_WEEKLY" | "IMMEDIATE"
  sendEmailDigest: boolean
  reportDeadlineDayOfWeek: number // 4 = Thursday / 5 = Friday
  updatedByName: string | null
  updatedAt: string | null
}
