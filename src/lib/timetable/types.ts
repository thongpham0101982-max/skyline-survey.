export type ManageableScopeGroup = "TIEU_HOC" | "TRUNG_HOC" | "HILL"
export type ScopeGroup = ManageableScopeGroup | "LIEN_CAP"

export type LevelFilterCode = "ALL" | "TH" | "THCS" | "THPT"

export type DayOfWeekCode =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"

export type SessionCode = "MORNING" | "AFTERNOON"

export type WeekTypeCode = "ALL" | "EVEN" | "ODD"

export type VersionStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "PUBLISHED"
  | "EXPIRED"

export type RuleStatus =
  | "PASSED"
  | "VIOLATED"
  | "INSUFFICIENT_DATA"
  | "NOT_APPLICABLE"

export type SubstitutionActionType =
  | "LEAVE"
  | "SUBSTITUTE"
  | "SWAP_PERIOD"
  | "CHANGE_ROOM"
  | "MAKEUP"

export interface PeriodTimeDef {
  session: SessionCode
  periodNumber: number
  label: string
  startTime: string // "HH:mm"
  endTime: string   // "HH:mm"
}

export interface FixedSlotRule {
  id: string
  label: string
  subjectCode?: string
  subjectId?: string
  subjectName: string
  dayOfWeek: DayOfWeekCode
  session: SessionCode
  periodNumber: number
  appliesToGrades?: string[] // empty/undefined = all grades in scope
  assignHomeroomTeacher?: boolean
  weekType?: WeekTypeCode
  effectiveFrom?: string
  effectiveTo?: string
}

export interface BlockRule {
  id: string
  subjectId?: string
  subjectCode?: string
  subjectName?: string
  minConsecutive: number // e.g. 2 for double period
  maxConsecutive: number // e.g. 2
  requireSameSession: boolean
  appliesToGrades?: string[]
}

export interface LimitsAndPriorities {
  maxPeriodsPerDayPerSubject?: number
  maxConsecutivePeriodsPerTeacher?: number
  maxPeriodsPerDayPerTeacher?: number
  avoidLastAfternoonForHeavySubjects?: boolean
  heavySubjectCodes?: string[]
  preferMorningForCoreSubjects?: boolean
  coreSubjectCodes?: string[]
}

export interface TimetableConfigParsed {
  id?: string
  academicYearId: string
  semester: number
  campusId: string
  scopeGroup: ManageableScopeGroup
  levelCode: string
  workingDays: DayOfWeekCode[]
  morningPeriods: number
  afternoonPeriods: number
  periodTimes: PeriodTimeDef[]
  cycleWeeks: number
  cycleAnchorDate: string | null
  fixedSlots: FixedSlotRule[]
  blockRules: BlockRule[]
  limitsAndPriorities: LimitsAndPriorities
  effectiveFrom: string | null
  effectiveTo: string | null
}

export interface TimetableFilterParams {
  academicYearId?: string
  semester?: number
  scopeGroup?: ScopeGroup
  campusId?: string
  levelCode?: LevelFilterCode
  grade?: string
  classId?: string
  versionId?: string
  effectiveDate?: string // "YYYY-MM-DD"
  viewedWeekDate?: string // "YYYY-MM-DD" within the viewed week
}

export interface SlotRecord {
  id?: string
  versionId?: string | null
  academicYearId?: string | null
  semester?: number | null
  campusId?: string | null
  level: string
  grade: string
  classId: string
  className: string
  dayOfWeek: DayOfWeekCode | string
  session: SessionCode | string
  periodNumber: number
  subjectId?: string | null
  subjectCode?: string | null
  subjectName?: string | null
  teacherId?: string | null
  teacherCode?: string | null
  teacherName?: string | null
  roomId?: string | null
  roomCode?: string | null
  roomName?: string | null
  coTeacherId?: string | null
  coTeacherCode?: string | null
  coTeacherName?: string | null
  assistantTeacherId?: string | null
  assistantTeacherCode?: string | null
  assistantTeacherName?: string | null
  weekType: WeekTypeCode | string
  altSubjectId?: string | null
  altSubjectName?: string | null
  altTeacherId?: string | null
  altTeacherCode?: string | null
  altTeacherName?: string | null
  altRoomId?: string | null
  altRoomName?: string | null
  isLocked?: boolean
  blockGroupId?: string | null
  slotRevision?: number
  notes?: string | null
  colorCode?: string | null
}

export interface QuotaReconcileItem {
  classId: string
  className: string
  grade: string
  level: string
  educationSystem: string
  studyProgram: string
  subjectId: string
  subjectCode: string
  subjectName: string
  weeklyQuota: number
  cycleQuota: number
  cycleWeeks: number
  scheduledWeeklyEquivalent: number
  missingWeeklyPeriods: number
  overScheduledWeeklyPeriods: number
  primaryTeacherId: string | null
  primaryTeacherCode: string | null
  primaryTeacherName: string | null
  coTeacherId: string | null
  coTeacherCode: string | null
  coTeacherName: string | null
  assignmentSource: "TEACHING_ASSIGNMENT" | "CTQT_ASSIGNMENT" | "HOMEROOM" | "MISSING"
  status: "OK" | "MISSING_TEACHER" | "UNDER_SCHEDULED" | "OVER_SCHEDULED" | "NO_QUOTA_DEFINED"
}

export interface ValidationIssue {
  ruleCode: string
  severity: "ERROR" | "WARNING"
  message: string
  classId?: string
  className?: string
  teacherId?: string
  teacherCode?: string
  teacherName?: string
  roomId?: string
  roomCode?: string
  dayOfWeek?: string
  session?: string
  periodNumber?: number
  conflictingCampusId?: string
  conflictingClassName?: string
}

export interface ValidationRuleResult {
  ruleCode: string
  ruleName: string
  status: RuleStatus
  statusLabel: "Đạt" | "Vi phạm" | "Chưa đủ dữ liệu" | "Không áp dụng"
  violationCount: number
  summary: string
  issues: ValidationIssue[]
}

export interface ValidationReport {
  canPublish: boolean
  hasHardViolations: boolean
  hasInsufficientData: boolean
  checkedAt: string
  rules: ValidationRuleResult[]
  allIssues: ValidationIssue[]
}

export interface UnscheduledActivity {
  classId: string
  className: string
  subjectId: string
  subjectName: string
  teacherId: string | null
  teacherCode: string | null
  teacherName: string | null
  weekType: WeekTypeCode
  missingPeriods: number
  reasonCode:
    | "MISSING_TEACHER_ASSIGNMENT"
    | "TEACHER_BUSY_OR_CONFLICT"
    | "TRAVEL_TIME_CONFLICT"
    | "CLASS_FULL"
    | "NO_SUITABLE_ROOM"
    | "BLOCK_CONSTRAINT_UNSATISFIED"
    | "DAILY_LIMIT_REACHED"
    | "TIME_LIMIT_EXHAUSTED"
  reasonDetail: string
}

export type AutoScheduleOutcome =
  | "COMPLETED"
  | "PARTIAL"
  | "TIME_LIMIT_REACHED"
  | "UNFEASIBLE"

export interface AutoScheduleResult {
  outcome: AutoScheduleOutcome
  outcomeLabel: string
  elapsedMs: number
  generatedSlots: SlotRecord[]
  placedCount: number
  requiredCount: number
  lockedPreservedCount: number
  unscheduledActivities: UnscheduledActivity[]
  validationReport: ValidationReport
}

export interface SlotDiffItem {
  cellKey: string
  classId: string
  className: string
  dayOfWeek: string
  session: string
  periodNumber: number
  changeType: "ADDED" | "REMOVED" | "MODIFIED"
  beforeSummary: string
  afterSummary: string
}

export interface LegacyDataAnomaly {
  anomalyType:
    | "CAMPUS_MISMATCH"
    | "DUPLICATE_CELL"
    | "INVALID_LEVEL_LIEN_CAP"
    | "GRADE_MISMATCH"
    | "MISSING_ACADEMIC_YEAR"
    | "MISSING_TEACHER_OR_SUBJECT_ID"
  count: number
  description: string
  sampleItems: Array<{
    slotId: string
    className: string
    detail: string
  }>
}

export interface EffectivePeriodItem {
  slotId: string | null
  versionId: string | null
  campusId: string
  campusName: string
  classId: string
  className: string
  grade: string
  level: string
  date: string // "YYYY-MM-DD"
  dayOfWeek: DayOfWeekCode
  session: SessionCode
  periodNumber: number
  startTime: string
  endTime: string
  weekParity: "EVEN" | "ODD" | "ALL"
  subjectId: string | null
  subjectName: string | null
  teacherId: string | null
  teacherCode: string | null
  teacherName: string | null
  coTeacherId: string | null
  coTeacherCode: string | null
  coTeacherName: string | null
  assistantTeacherId: string | null
  assistantTeacherCode: string | null
  assistantTeacherName: string | null
  roomId: string | null
  roomCode: string | null
  roomName: string | null
  isSubstituted: boolean
  substitutionAction?: SubstitutionActionType
  substitutionReason?: string
  isCancelledByLeave: boolean
}
