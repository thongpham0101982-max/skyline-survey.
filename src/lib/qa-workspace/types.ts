export type QaWorkspaceViewMode =
  | "workspace"
  | "command_room"
  | "list"
  | "kanban"
  | "calendar"

export type QaWorkflowStatus =
  | "DRAFT"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "PENDING_REVIEW"
  | "NEEDS_REVISION"
  | "COMPLETED"
  | "PAUSED"
  | "CANCELLED"

export type QaTaskWorkflowStatus = QaWorkflowStatus

export const WORKFLOW_STATUS_LABELS: Record<QaWorkflowStatus, string> = {
  DRAFT: "Nháp",
  ASSIGNED: "Đã giao",
  IN_PROGRESS: "Đang thực hiện",
  PENDING_REVIEW: "Chờ duyệt",
  NEEDS_REVISION: "Cần bổ sung",
  COMPLETED: "Hoàn thành",
  PAUSED: "Tạm dừng",
  CANCELLED: "Đã hủy",
}

export type QaAssignmentMode =
  | "GROUP"
  | "INDIVIDUAL"
  | "MULTI_INDIVIDUAL"
  | "RECURRING"

export type AssignmentMode = QaAssignmentMode

export type QaPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"

export type QaSourceModuleCode =
  | "MANUAL"
  | "KHAO_THI"
  | "KHAO_SAT_DAU_VAO"
  | "DGNL"
  | "DU_GIO"
  | "KHAO_SAT_PHAN_HOI"
  | "CAI_TIEN_CHAT_LUONG"

export type QaDeadlineStatusCode =
  | "ON_TIME"
  | "DUE_SOON"
  | "OVERDUE_EXECUTION"
  | "OVERDUE_REVIEW"
  | "COMPLETED_ON_TIME"
  | "COMPLETED_LATE"
  | "INACTIVE"

export type QaReviewRating =
  | "XUAT_SAC"
  | "DAT_CHUAN"
  | "DAT_YEU_CAU"
  | "CAN_BO_SUNG"
  | "CHUA_DANH_GIA"

export interface QaChecklistStep {
  id: string
  title: string
  assigneeUserId?: string | null
  assigneeName?: string | null
  dueDate?: string | null
  completed: boolean
  completedAt?: string | null
  dependsOnStepId?: string | null
  order?: number
}

export type ChecklistStepItem = QaChecklistStep

export interface QaTaskScopeMeta {
  campusId?: string | null
  campusName?: string | null
  academicYearId?: string | null
  academicYearName?: string | null
  grade?: string | null
  classId?: string | null
  className?: string | null
  subjectId?: string | null
  subjectName?: string | null
  periodCode?: string | null
}

export interface QaRecurrenceRule {
  frequency: "WEEKLY" | "MONTHLY"
  interval?: number
  dayOfWeek?: number // 1 (Mon) - 7 (Sun)
  dayOfMonth?: number // 1 - 31
  timeOfDay?: string // HH:mm in Asia/Ho_Chi_Minh
  autoPublish?: boolean
  approvedForAutoRelease?: boolean
  isActive?: boolean
  approvedByUserId?: string | null
  approvedAt?: string | null
}

export interface QaEvidenceLink {
  id: string
  label: string
  url: string
  uploadedAt: string
  uploadedByUserId?: string
}

export interface QaTaskMetadataRecord {
  taskId: string
  workflowStatus: QaWorkflowStatus
  assignmentMode: QaAssignmentMode
  workspaceCardKey?: string | null
  coordinatorUserId?: string | null
  reviewerUserId?: string | null
  collaboratorUserIds?: string[]
  requiresApproval: boolean
  reviewDueDate?: string | null
  submittedForReviewAt?: string | null
  reviewedAt?: string | null
  reviewComment?: string | null
  reviewRating?: QaReviewRating | null
  deliverables?: string | null
  completionCriteria?: string | null
  requiredEvidences?: string | null
  resultSummary?: string | null
  evidenceLinks: any[]
  checklist: QaChecklistStep[]
  checklistJson?: QaChecklistStep[]
  currentStepLabel?: string | null
  nextStepLabel?: string | null
  scopeMeta: QaTaskScopeMeta
  scopeCampusId?: string | null
  scopeGradeLevel?: string | null
  scopeClassId?: string | null
  scopeSubject?: string | null
  scopeSurveyPeriod?: string | null
  sourceModule: QaSourceModuleCode
  sourceRecordId?: string | null
  sourceUrl?: string | null
  externalSyncKey?: string | null
  batchCode?: string | null
  recurrenceRule?: QaRecurrenceRule | null
  recurrenceTemplateId?: string | null
  recurrenceInstanceKey?: string | null
  statusReason?: string | null
  version: number
  updatedAt?: string
}

export interface QaTaskAuditLogItem {
  id: string
  taskId: string
  actorUserId: string
  actorName: string
  actorRole?: string | null
  action: string
  fromStatus?: string | null
  toStatus?: string | null
  reason?: string | null
  changesJson?: string | null
  createdAt: string
}

export interface QaReminderLogItem {
  id: string
  taskId: string
  recipientUserId: string
  recipientName?: string | null
  recipientRoleType: "ASSIGNEE" | "COORDINATOR" | "REVIEWER"
  recipientRole?: string
  reminderType:
    | "NOT_STARTED"
    | "DUE_SOON"
    | "OVERDUE_EXECUTION"
    | "OVERDUE_REVIEW"
    | "PENDING_REVIEW"
    | "NEEDS_REVISION"
    | "UNRESOLVED_BLOCKER"
  dedupKey: string
  channel: string
  title: string
  message: string
  createdAt: string
  sentAt?: string
}

export type WorkspaceCardKey =
  | "KHAO_THI"
  | "DBCL"
  | "LMS_KSDV"
  | "BAO_CAO_DU_LIEU"
  | "CONG_VIEC_THANH_VIEN"
  | "TRO_LY_DIEU_HANH"
  | string

export interface QaWorkspaceCardConfig {
  key: WorkspaceCardKey
  title: string
  subtitle: string
  description: string
  shortDescription: string
  badgeText: string
  gradientClass: string
  gradientFrom: string
  gradientTo: string
  accentColor: string
  illustrationType:
    | "exam_desk"
    | "quality_shield"
    | "lms_assessment"
    | "analytics_hub"
    | "team_workspace"
    | "ai_assistant"
    | "ANALYTICS_SCREEN"
    | "AI_ASSISTANT"
    | "TEAM_HUB"
  linkedGroupNames: string[]
  quickLinks: Array<{
    label: string
    href: string
    badge?: string
  }>
  defaultCategory: string
}

export type WorkspaceCardConfig = QaWorkspaceCardConfig

export interface QaComputedDeadlineInfo {
  code: QaDeadlineStatusCode
  label: string
  isOverdue: boolean
  isOverdueExecution: boolean
  isOverdueReview: boolean
  isDueSoon: boolean
  activeStep: "EXECUTION" | "REVIEW" | "DONE" | "INACTIVE"
  activeStepDeadline: string | null
  hoursRemaining: number | null
  badgeClass: string
}

export interface QaNlpTaskDraft {
  rawPrompt: string
  title: string
  description: string
  assignmentMode: QaAssignmentMode
  taskGroupId: string | null
  taskGroupName: string | null
  workspaceCardKey?: WorkspaceCardKey | null
  category: string
  assignedToUserId: string | null
  assignedToUserName: string | null
  collaboratorUserIds: string[]
  reviewerUserId: string | null
  reviewerUserName: string | null
  requiresApproval: boolean
  priority: QaPriority
  startDate: string
  startDateIso: string
  endDate: string
  endDateIso: string
  endDateDisplayVi: string
  resolvedTimeDisplayVi: string
  relativeTimeExpression?: string | null
  reviewDueDate: string | null
  deliverables: string
  completionCriteria: string
  requiredEvidences: string
  checklist: QaChecklistStep[]
  checklistSteps: QaChecklistStep[]
  scopeMeta: QaTaskScopeMeta
  scopeGradeLevel?: string | null
  scopeSubject?: string | null
  missingFields: Array<{
    field: string
    label: string
    reason: string
  }>
  aiEngineUsed: "GEMINI_SERVER" | "RULE_ENGINE_FALLBACK"
  timezone: "Asia/Ho_Chi_Minh"
}

export type NlpTaskDraft = QaNlpTaskDraft
