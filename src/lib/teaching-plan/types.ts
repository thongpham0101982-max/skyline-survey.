export type TeachingPlanScopeType = "SYSTEM" | "CAMPUS"
export type TeachingPlanVersionStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "PUBLISHED"
  | "ARCHIVED"

export type ObjectiveEvidenceStatus =
  | "OBSERVED_MET"
  | "OBSERVED_PARTIAL"
  | "NOT_OBSERVED"

export interface TeachingPlanAttachment {
  name: string
  url: string
}

export interface TeachingPlanRecord {
  id: string
  academicYearId: string
  level: string
  grade: string
  subjectId: string
  subjectCode: string | null
  subjectName: string
  programCode: string
  programName: string
  scopeType: TeachingPlanScopeType
  campusId: string | null
  campusCode: string | null
  title: string
  activePublishedVersionId: string | null
  syncToObservation?: boolean
  syncedToObservationAt?: string | null
  syncedToObservationByName?: string | null
  status: string
  createdById: string | null
  createdByName: string | null
  createdAt: string
  updatedAt: string
}

export interface TeachingPlanVersionRecord {
  id: string
  planId: string
  versionNumber: number
  status: TeachingPlanVersionStatus
  revision: number
  baseVersionId: string | null
  changeSummary: string | null
  reviewComment: string | null
  createdById: string | null
  createdByName: string | null
  updatedById: string | null
  updatedByName: string | null
  submittedById: string | null
  submittedByName: string | null
  submittedAt: string | null
  reviewedById: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  publishedById: string | null
  publishedByName: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TeachingPlanPeriodRecord {
  id: string
  versionId: string
  lessonId: string
  stableLessonId: string
  stablePeriodId: string
  periodCode: string
  periodIndexInLesson: number
  plannedWeek: number
  focus: string
  objectives: string
  expectedEvidence: string
  adjustments: string
  attachments: TeachingPlanAttachment[]
  isSkeleton: boolean
  sortOrder: number
}

export interface TeachingPlanLessonRecord {
  id: string
  versionId: string
  stableLessonId: string
  lessonCode: string
  semester: number
  weekFrom: number
  weekTo: number
  topicName: string
  lessonName: string
  periodCount: number
  objectives: string
  adjustments: string
  projectNotes: string
  attachments: TeachingPlanAttachment[]
  isAssessmentRow: boolean
  assessmentConfirmed: boolean
  assessmentOrgNote: string
  sortOrder: number
  periods: TeachingPlanPeriodRecord[]
}

export interface ExcelValidationError {
  sheet: string
  row: number
  column: string
  reason: string
}

export interface ExcelInfoMismatch {
  field: string
  label: string
  fileValue: string
  expectedValue: string
  severity: "ERROR" | "WARNING"
}

export interface ParsedExcelLesson {
  lessonCode: string
  semester: number
  weekFrom: number
  weekTo: number
  topicName: string
  lessonName: string
  periodCount: number
  objectives: string
  adjustments: string
  projectNotes: string
  isAssessmentRow: boolean
  rowNumber: number
}

export interface ParsedExcelPeriod {
  periodCode: string
  lessonCode: string
  periodIndexInLesson: number
  plannedWeek: number
  focus: string
  objectives: string
  expectedEvidence: string
  adjustments: string
  isSkeleton: boolean
  rowNumber: number | null
}

export interface ExcelImportPreviewSummary {
  lessonsAdded: number
  lessonsUpdated: number
  lessonsUnchanged: number
  lessonsNeedsConfirmation: number
  periodsAdded: number
  periodsUpdated: number
  periodsUnchanged: number
  periodsSkeletonCreated: number
  errorCount: number
}

export interface ExcelImportPreviewResult {
  valid: boolean
  infoMap: Record<string, string>
  mismatches: ExcelInfoMismatch[]
  errors: ExcelValidationError[]
  summary: ExcelImportPreviewSummary
  lessons: ParsedExcelLesson[]
  periods: ParsedExcelPeriod[]
  assessmentRowsNeedingConfirm: Array<{
    lessonCode: string
    lessonName: string
    reason: string
  }>
}

export interface ImpactedPeriodLink {
  linkType: "TIMETABLE" | "OBSERVATION"
  linkId: string
  targetId: string
  className: string
  teacherName: string
  sessionDate: string | null
  timetablePeriodNumber: number | null
  oldStablePeriodId: string
  oldPeriodCode: string
  oldLessonName: string
  oldPeriodIndexInLesson: number
}

export interface PrePublishCheckResult {
  canPublish: boolean
  missingPeriodFields: Array<{
    lessonCode: string
    lessonName: string
    periodCode: string
    periodIndexInLesson: number
    missingFields: string[]
  }>
  incompletePeriodWarnings: Array<{
    lessonCode: string
    lessonName: string
    periodCode: string
    periodIndexInLesson: number
    missingFields: string[]
  }>
  unconfirmedAssessments: Array<{
    lessonId: string
    lessonCode: string
    lessonName: string
    reason: string
  }>
  impactedLinks: ImpactedPeriodLink[]
  weekShiftWarnings: Array<{
    linkType: "TIMETABLE" | "OBSERVATION"
    targetId: string
    className: string
    sessionDate: string | null
    periodCode: string
    oldWeek: number
    newWeek: number
  }>
}

export interface ObservationTeachingPlanSnapshot {
  planId: string
  planTitle: string
  versionId: string
  versionNumber: number
  stableLessonId: string
  lessonCode: string
  lessonName: string
  topicName: string
  semester: number
  stablePeriodId: string
  periodCode: string
  periodIndexInLesson: number
  totalPeriodsInLesson: number
  plannedWeek: number
  focus: string
  objectives: string
  objectiveLines: string[]
  expectedEvidence: string
  adjustments: string
  lessonAdjustments: string
  projectNotes: string
  timetableSlotId: string | null
  timetablePeriodNumber: number | null
  timetableSession: string | null
}

export interface ObservationTeachingPlanView {
  linked: boolean
  snapshotLocked: boolean
  snapshotLockedAt: string | null
  sourceMode: "LIVE_PUBLISHED" | "FROZEN_SNAPSHOT" | "UNLINKED"
  weekMismatchWarning: boolean
  weekMismatchNote: string
  data: ObservationTeachingPlanSnapshot | null
  evidences: Array<{
    objectiveIndex: number
    objectiveText: string
    status: ObjectiveEvidenceStatus
    evidenceNote: string
  }>
}
