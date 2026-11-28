export type ObservationRecordState =
  | "OFFICIAL_APPROVED"
  | "PENDING_APPROVAL"
  | "NEEDS_REVISION"
  | "REGISTERED_NO_EVAL"
  | "DRAFT"
  | "CANCELLED_OR_REJECTED"

export type ComplianceTone = "emerald" | "amber" | "rose" | "slate"

export type TeacherQualityScreenTab =
  | "overview"
  | "recognitions"
  | "monthly-observation"
  | "coaching"
  | "reports"

export type TeacherQualityRoleTier =
  | "BAN_DHCM_KTDBCL"
  | "GDCS"
  | "TTCM"
  | "GV"

export type CoachingStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"

export type RecognitionGroupType =
  | "DEPT_AWARD"
  | "SYSTEM_AWARD"
  | "STUDENT_COMPETITION"
  | "PARENT_NPS"
  | "AI_TECH"

export interface ComplianceStatusItem {
  code: string
  label: string
  tone: ComplianceTone
  detail?: string
}

export interface LinkedCoachingSummary {
  id: string
  status: CoachingStatus
  activityType: string | null
  developmentActivity: string
  mentorName: string | null
  dueDate: string | null
  applicationNotes: string | null
  nextSupportNeeds: string | null
  postCoachingNotes: string | null
  outcomeRating: string | null
  completedAt: string | null
  improvementNeeds: string
  createdAt: string
}

export interface ObservationDetailItem {
  slotId: string
  registrationId: string | null
  evaluationId: string | null
  role: "HOST" | "OBSERVER"
  actualDate: string
  actualDateVi: string
  monthKey: string
  timeRange: string
  isDoublePeriod: boolean
  periodWeight: number
  campusName: string
  level: string
  grade: string
  className: string
  subjectName: string
  topic: string
  hostTeacherId: string
  hostTeacherName: string
  observerTeacherId: string | null
  observerTeacherName: string | null
  slotStatus: string
  requestOrigin: string | null
  recordState: ObservationRecordState
  recordStateLabel: string
  isCountedOfficial: boolean
  isPendingReview: boolean
  approvedAt: string | null
  submittedAt: string | null
  overallRating: string | null
  totalScore: number | null
  teachingCompliancePass: boolean | null
  strengths: string | null
  improvements: string | null
  generalComment: string | null
  sourceRoute: string
  canCreateCoaching: boolean
  linkedCoaching: LinkedCoachingSummary | null
}

export type TeachingPeriodSource = "TEACHING_LOG" | "TIMETABLE" | "NONE"

export interface MonthlyTeacherObservationRow {
  teacherId: string
  teacherCode: string
  teacherName: string
  position: string
  positions: string[]
  campusId: string
  campusName: string
  departmentId: string | null
  departmentName: string
  levels: string[]
  joinDate: string | null
  joinYear: number | null
  seniorityLabel: string
  isNewTeacher: boolean

  // Số tiết dạy trong tháng
  monthlyTeachingPeriods: number
  teachingPeriodSource: TeachingPeriodSource
  teachingPeriodSourceLabel: string
  weeklyTimetablePeriods: number

  // Số tiết GV dạy được dự (1 tiết nhiều người dự vẫn tính 1)
  taughtObservedOfficial: number
  taughtObservedQuota: number
  taughtObservedUnit: string
  taughtObservedTotalSlots: number

  // Số tiết GV đi dự
  observedOfficial: number
  observedQuota: number
  observedUnit: string
  hasConfiguredObservedQuota: boolean
  observedQuotaDisplay: string

  // Phiếu chờ duyệt
  pendingFormsCount: number
  pendingAsHostCount: number
  pendingAsObserverCount: number

  // Tách riêng 2 cột quy định
  observingCompliance: ComplianceStatusItem
  teachingCompliance: ComplianceStatusItem

  coachingPlansCount: number

  taughtDetails: ObservationDetailItem[]
  observedDetails: ObservationDetailItem[]
  pendingDetails: ObservationDetailItem[]
}

export interface MonthlyObservationSummary {
  totalTeachers: number
  observedCompliantCount: number
  unobservedCount: number
  shortfallCount: number
  noQuotaCount: number
  teachingCompliantCount: number
  teachingNeedsCoachingCount: number
  totalTaughtObservedPeriods: number
  totalObservedPeriods: number
  totalPendingForms: number
  linkedCoachingCount: number
}

// ===== VINH DANH & GHI NHẬN (5 NHÓM) =====

export interface RecognitionRecordItem {
  id: string
  teacherId: string
  teacherCode: string
  teacherName: string
  campusId: string | null
  campusName: string
  departmentId: string | null
  departmentName: string
  academicYearId: string
  groupType: RecognitionGroupType
  sourceType: "MANUAL" | "LINKED"
  sourceLabel: string // "Nhập trực tiếp" | "Thành tích HS" | "Khảo sát NPS" | "AI Growth"
  title: string
  issuingAuthority: string | null
  awardScope: string | null
  eventBatch: string | null
  teacherRole: string | null
  participantCount: number | null
  resultSummary: string | null
  recordedDate: string | null
  dedupKey: string | null
  notes: string | null
  canEdit: boolean
  createdAt: string
}

export interface TeacherNpsPeriodRow {
  id: string
  teacherId: string
  teacherCode: string
  teacherName: string
  campusName: string
  departmentName: string
  periodId: string
  periodTitle: string
  semester: string
  roleType: "GVCN" | "GVBM" | "ALL"
  roleLabel: string
  validResponses: number
  promoters: number
  passives: number
  detractors: number
  npsScore: number
}

// ===== BỒI DƯỠNG & PHÁT TRIỂN CHUYÊN MÔN =====

export interface FollowUpObservationOption {
  evaluationId: string
  slotId: string
  teacherId: string
  actualDateVi: string
  subjectName: string
  className: string
  topic: string
  observerName: string
  overallRating: string | null
  totalScore: number | null
}

export interface TeacherDevelopmentPlanItem {
  id: string
  teacherId: string
  teacherCode: string
  teacherName: string
  campusId: string | null
  campusName: string
  departmentId: string | null
  departmentName: string
  academicYearId: string | null
  observationSlotId: string | null
  observationEvaluationId: string | null
  sourceMonth: string | null
  requestSource: "OBSERVATION" | "TEACHER_PROPOSAL" | "DIRECT"
  batchGroupId: string | null
  activityType: string | null
  improvementNeeds: string
  developmentActivity: string
  mentorTeacherId: string | null
  mentorName: string | null
  dueDate: string | null
  isDueSoon: boolean
  isOverdue: boolean
  status: CoachingStatus
  postCoachingNotes: string | null
  applicationNotes: string | null
  nextSupportNeeds: string | null
  followUpSlotId: string | null
  followUpEvaluationId: string | null
  outcomeRating: string | null
  completedAt: string | null
  createdByName: string | null
  createdAt: string
  updatedAt: string
  sourceObservation: {
    actualDateVi: string
    campusName: string
    className: string
    subjectName: string
    topic: string
    observerName: string
    overallRating: string | null
    totalScore: number | null
    sourceRoute: string
  } | null
  followUpObservation: {
    actualDateVi: string
    campusName: string
    className: string
    subjectName: string
    topic: string
    observerName: string
    overallRating: string | null
    totalScore: number | null
    sourceRoute: string
  } | null
}

// ===== TỔNG QUAN GV & BÁO CÁO =====

export interface TeacherMonthlyHistoryPoint {
  monthKey: string
  monthLabel: string
  taughtObserved: number
  observed: number
  observedQuota: number
  pendingCount: number
  observingStatusLabel: string
  teachingStatusLabel: string
}

export interface TeacherOverviewRow {
  teacherId: string
  teacherCode: string
  teacherName: string
  position: string
  positions: string[]
  campusId: string
  campusName: string
  departmentId: string | null
  departmentName: string
  levels: string[]
  joinDate: string | null
  joinYear: number | null
  seniorityLabel: string

  // Tóm tắt 5 nhóm Vinh danh & Ghi nhận
  deptAwardCount: number
  systemAwardCount: number
  studentCompetitionCount: number
  aiTechCount: number
  npsGvcnScore: number | null
  npsGvcnResponses: number
  npsGvbmScore: number | null
  npsGvbmResponses: number
  totalRecognitionCount: number

  // Dự giờ tháng hiện tại đang chọn
  monthTaughtObserved: number
  monthObservedDisplay: string
  monthPendingForms: number
  observingCompliance: ComplianceStatusItem
  teachingCompliance: ComplianceStatusItem

  // Bồi dưỡng đang thực hiện
  coachingTotalCount: number
  coachingActiveCount: number // NOT_STARTED + IN_PROGRESS
  coachingCompletedCount: number
  coachingOverdueCount: number
  coachingDueSoonCount: number
  latestApplicationSummary: string | null

  // Lịch sử dự giờ theo từng tháng trong năm học (cho Hồ sơ GV & Báo cáo cuối năm)
  monthlyHistory: TeacherMonthlyHistoryPoint[]
}

export interface GroupReportSummaryRow {
  groupId: string
  groupName: string
  teacherCount: number
  deptAwardCount: number
  systemAwardCount: number
  dedupStudentCompetitionCount: number
  aiTechCount: number
  avgNpsScore: number | null
  observedCompliantCount: number
  observedUnobservedCount: number
  observedShortfallCount: number
  observedNoQuotaCount: number
  teachingNeedsCoachingCount: number
  coachingTotal: number
  coachingCompleted: number
  coachingOverdue: number
}

export interface TeacherQualityWorkspaceResponse {
  success: boolean
  academicYear: {
    id: string
    name: string
    status: string
    startDate: string | null
    endDate: string | null
    isEnded: boolean
  }
  month: string
  monthLabel: string
  periodSourceSummary: {
    source: "TEACHING_LOG" | "TIMETABLE" | "MIXED" | "NONE"
    columnHeaderNote: string
  }
  filters: {
    academicYearId: string
    month: string
    campusId: string
    level: string
    departmentId: string
    teacherId: string
    search: string
    observingStatusFilter: string
    teachingStatusFilter: string
  }
  availableFilters: {
    academicYears: Array<{ id: string; name: string; status: string }>
    campuses: Array<{ id: string; campusCode: string; campusName: string }>
    levels: Array<{ value: string; label: string }>
    departments: Array<{ id: string; name: string; blockCM: string | null }>
    teachers: Array<{
      id: string
      teacherCode: string
      teacherName: string
      campusId: string
      departmentId: string | null
    }>
    months: Array<{ value: string; label: string }>
  }
  scope: {
    roleTier: TeacherQualityRoleTier
    roleDisplayLabel: string
    currentTeacherId: string | null
    isCampusRestricted: boolean
    canEditRecognitions: boolean
    canSelfAddAiTech: boolean
    canProposeCoaching: boolean
    canAssignCoaching: boolean
    canUpdateOwnCoaching: boolean
    canExportReport: boolean
  }
  overviewSummary: {
    totalTeachers: number
    totalRecognitions: number
    dedupStudentCompetitions: number
    observedCompliantCount: number
    unobservedCount: number
    shortfallCount: number
    noQuotaCount: number
    coachingActiveCount: number
    coachingCompletedCount: number
    coachingOverdueCount: number
    coachingDueSoonCount: number
  }
  overviewRows: TeacherOverviewRow[]
  recognitions: RecognitionRecordItem[]
  npsRows: TeacherNpsPeriodRow[]
  monthlySummary: MonthlyObservationSummary
  monthlyRows: MonthlyTeacherObservationRow[]
  coachingPlans: TeacherDevelopmentPlanItem[]
  followUpOptionsByTeacher: Record<string, FollowUpObservationOption[]>
  reports: {
    byCampus: GroupReportSummaryRow[]
    byDepartment: GroupReportSummaryRow[]
  }
  mentors: Array<{
    id: string
    teacherCode: string
    teacherName: string
    position: string
    departmentName: string
    campusName: string
  }>
  computedAt: string
}

export type MonthlyObservationResponse = {
  success: boolean
  month: string
  monthLabel: string
  periodSourceSummary: {
    source: "TEACHING_LOG" | "TIMETABLE" | "MIXED" | "NONE"
    columnHeaderNote: string
  }
  filters: {
    academicYearId: string
    month: string
    campusId: string
    level: string
    departmentId: string
    search: string
    statusFilter: string
  }
  availableFilters: {
    academicYears: Array<{ id: string; name: string; status: string }>
    campuses: Array<{ id: string; campusCode: string; campusName: string }>
    levels: Array<{ value: string; label: string }>
    departments: Array<{ id: string; name: string; blockCM: string | null }>
    months: Array<{ value: string; label: string }>
  }
  scope: {
    roleDisplayLabel: string
    isCampusRestricted: boolean
    canCreateCoaching: boolean
    canManageCoaching: boolean
  }
  summary: MonthlyObservationSummary
  rows: MonthlyTeacherObservationRow[]
  mentors: Array<{
    id: string
    teacherCode: string
    teacherName: string
    position: string
    departmentName: string
    campusName: string
  }>
  computedAt: string
}
