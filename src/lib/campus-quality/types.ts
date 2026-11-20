import { ThkqAccessScope } from "@/lib/ktdbcl/thkqPermissions"

export type DashboardTabKey =
  | "overview"
  | "academic"
  | "admissions"
  | "achievements"
  | "observation"
  | "support"

export type LevelFilterCode = "ALL" | "MAM_NON" | "TIEU_HOC" | "THCS" | "THPT"

export type EvaluationPeriodCode = "GK1" | "CK1" | "GK2" | "CK2"

export interface CampusQualityFilterInput {
  academicYearId?: string
  campusId?: string
  level?: LevelFilterCode | string
  grade?: string
  classId?: string
  evaluationPeriod?: EvaluationPeriodCode | string
  month?: string // YYYY-MM, defaults to current system month
  subjectId?: string
  program?: string
  matchedCohortOnly?: boolean
  supportFilterMode?: "BELOW_5" | "BELOW_SKL" | "MULTI_SUBJECT" | "CONSECUTIVE_PERIODS"
  psychologyGroupBy?: "CLASS" | "OWNER"
  publishedOnly?: boolean
}

export interface CampusQualityAccessScope extends ThkqAccessScope {
  canViewPsychology: boolean
  canExportExcel: boolean
  defaultCampusId: string
  teacherId: string | null
  assignedDepartmentIds: string[]
}

export interface FilterOptionItem {
  id: string
  code?: string
  label: string
  campusId?: string
  level?: string
  grade?: string
}

export interface AvailableDashboardFilters {
  academicYears: Array<{ id: string; name: string; status: string }>
  campuses: Array<{ id: string; campusCode: string; campusName: string }>
  levels: Array<{ code: LevelFilterCode; label: string }>
  grades: string[]
  classes: Array<{
    id: string
    classCode: string
    className: string
    grade: string
    level: string
    campusId: string
    educationSystem: string
  }>
  evaluationPeriods: Array<{ code: EvaluationPeriodCode; label: string }>
  months: Array<{ value: string; label: string }>
  subjects: Array<{ id: string; code: string; name: string }>
}

export interface MonthlyMobilityPoint {
  monthKey: string // YYYY-MM
  monthLabel: string // Tháng MM/YYYY
  newEnrollments: number
  transferredInExternal: number
  transferredInInternal: number
  transferredOutExternal: number
  transferredOutInternal: number
  totalIn: number
  totalOut: number
  netChange: number
  closingHeadcount: number | null
  cumulativeNew: number
  cumulativeIn: number
  cumulativeOut: number
}

export interface OverviewPayload {
  timeContext: {
    academicYearLabel: string
    evaluationPeriodCode: EvaluationPeriodCode
    evaluationPeriodLabel: string
    monthKey: string
    monthLabel: string // e.g. "Tháng 11/2026"
    currentSystemMonthLabel: string // e.g. "11/2026"
  }
  scaleAndMobility: {
    activeStudents: number
    totalClasses: number
    newEnrollments: number
    transferredIn: number
    transferredInInternal: number
    transferredInExternal: number
    transferredOut: number
    transferredOutInternal: number
    transferredOutExternal: number
    systemInternalNetCheck: number // Must be 0 at system scope
    commitmentStudents: number
    monthlySeries: MonthlyMobilityPoint[]
  }
  academicQuality: {
    periodLabel: string
    publishedClassSubjectPairs: number
    totalExpectedClassSubjectPairs: number
    validScoreCount: number
    expectedScoreCount: number
    absentCount: number
    exemptCount: number
    missingCount: number
    skylinePassRate: number | null
    systemSkylinePassRate: number | null
    skylineDiffPp: number | null
    belowBenchmarkStudents: number // Unique students counted once
    belowAverageStudents: number // Unique students < 5.0 counted once
    unconfiguredBenchmarkSubjects: number
    internationalSubjectsCount: number
  }
  admissionsAndEntrance: {
    scopeLabel: string // "Trong năm học"
    surveyedCount: number
    passedCount: number
    enrolledCount: number
    passRate: number | null
    enrollmentRate: number | null
  }
  achievementsAndCerts: {
    scopeLabel: string
    examParticipants: number // Distinct students
    examSittings: number // Total exam sittings
    awardedStudents: number // Distinct students
    totalAwards: number
    certificatesIssued: number
  }
  observationAndGrowth: {
    monthLabel: string
    observedLessons: number
    plannedLessons: number
    observedTeachers: number
    plannedTeachers: number
    unobservedTeachers: number
    compliantTeachers: number
    evaluatedTeachers: number
    pendingReviewForms: number
  }
  psychologyTracking: {
    monthLabel: string
    canView: boolean
    activeTracking: number
    dueForReview: number
    achievedGoal: number
    ownerCount: number
  }
  actionQueue: {
    pendingEntranceCurrentMonth: {
      monthLabel: string // e.g. "11/2026"
      count: number
    }
    incompleteGradeClasses: {
      count: number
      missingEntries: number
    }
    unobservedTeachers: {
      monthLabel: string
      count: number
    }
  }
}

export interface ScoreDistributionBucket {
  bucketId: string
  label: string
  min: number
  max: number
  classCount: number
  classPct: number
  campusGradeCount: number
  campusGradePct: number
  systemGradeCount: number
  systemGradePct: number
}

export interface ExtendedScoreStats {
  scopeLabel: string
  validCount: number
  average: number | null
  median: number | null
  mode: number | null
  rateGte7: number | null
  count10: number
  stdDev: number | null
  skylinePassRate: number | null
}

export interface SubjectGradeRow {
  rowKey: string
  subjectId: string
  subjectCode: string
  subjectName: string
  grade: string
  level: string
  expectedCount: number
  validCount: number
  absentCount: number
  exemptCount: number
  missingCount: number
  average: number | null
  median: number | null
  mode: number | null
  rateGte7: number | null
  count10: number
  stdDev: number | null
  below5Count: number
  below5Rate: number | null
  benchmarkScore: number | null
  benchmarkStatus: "CONFIGURED" | "UNCONFIGURED"
  belowBenchmarkCount: number
  belowBenchmarkRate: number | null
  meetBenchmarkCount: number
  meetBenchmarkRate: number | null
  systemMeetBenchmarkRate: number | null
  diffPp: number | null
}

export interface ClassSubjectHeatmapCell {
  classId: string
  className: string
  grade: string
  subjectId: string
  subjectName: string
  teacherName: string
  validCount: number
  expectedCount: number
  average: number | null
  meetBenchmarkRate: number | null
  benchmarkStatus: "CONFIGURED" | "UNCONFIGURED"
}

export interface PeriodTrendPoint {
  periodCode: EvaluationPeriodCode
  periodLabel: string
  validCount: number
  average: number | null
  meetBenchmarkRate: number | null
  below5Rate: number | null
  matchedCohortSize?: number
}

export interface TeacherSubjectClassRow {
  rowKey: string
  teacherId: string
  teacherName: string
  subjectId: string
  subjectName: string
  classId: string
  className: string
  grade: string
  validCount: number
  expectedCount: number
  average: number | null
  meetBenchmarkRate: number | null
  below5Count: number
  benchmarkScore: number | null
  benchmarkStatus: "CONFIGURED" | "UNCONFIGURED"
}

export interface InternationalSubjectRow {
  rowKey: string
  program: string
  subjectCode: string
  subjectName: string
  grade: string
  scaleLabel: string
  resultCount: number
  expectedCount: number
  targetRuleLabel: string
  meetTargetCount: number
  meetTargetRate: number | null
  belowTargetCount: number
  averageScore: number | null
  skillsBreakdown: Array<{ skill: string; label: string; averageOrPass: string }>
  sourceType: "INTERNAL_CTQT" | "INTL_EXAM_CERT"
  linkedExamFamily?: string
}

export interface AcademicQualityTabPayload {
  periodLabel: string
  publishedOnly: boolean
  subjectGradeRows: SubjectGradeRow[]
  heatmap: {
    classes: Array<{ id: string; className: string; grade: string }>
    subjects: Array<{ id: string; subjectName: string }>
    cells: ClassSubjectHeatmapCell[]
  }
  distributionComparison: {
    selectedClassLabel: string
    selectedSubjectLabel: string
    selectedGradeLabel: string
    buckets: ScoreDistributionBucket[]
    statsComparison: ExtendedScoreStats[]
  }
  periodTrend: {
    matchedCohortOnly: boolean
    matchedPairCount: number
    points: PeriodTrendPoint[]
  }
  teacherRows: TeacherSubjectClassRow[]
  internationalSubjects: InternationalSubjectRow[]
}

export interface AdmissionsBatchGradeRow {
  rowKey: string
  batchId: string
  batchName: string
  blockType: "K12" | "MAM_NON"
  targetGrade: string
  surveyedCount: number
  passedCount: number
  committedCount: number
  enrolledCount: number
  pendingCount: number
  passRate: number | null
  enrollmentRate: number | null
}

export interface MobilityDetailRow {
  id: string
  studentCode: string
  studentName: string
  className: string
  campusName: string
  movementType: "NEW_ENROLLMENT" | "EXTERNAL_IN" | "EXTERNAL_OUT" | "INTERNAL_IN" | "INTERNAL_OUT"
  movementLabel: string
  effectiveDate: string
  counterpartySchoolOrCampus: string
  reason: string
}

export interface AdmissionsMobilityTabPayload {
  summary: {
    surveyedCount: number
    passedCount: number
    enrolledCount: number
    pendingCurrentMonthCount: number
    currentMonthLabel: string
  }
  batchGradeRows: AdmissionsBatchGradeRow[]
  mobilitySummary: {
    newEnrollments: number
    externalIn: number
    externalOut: number
    internalIn: number
    internalOut: number
    systemInternalNet: number
  }
  mobilityRows: MobilityDetailRow[]
}

export interface AchievementExamRow {
  examId: string
  examName: string
  source: "DOMESTIC_EXAM" | "INTL_EXAM"
  categoryLabel: string
  registeredCount: number
  satCount: number
  hasResultCount: number
  awardedCount: number
  metTargetCount: number
  certificatesIssuedCount: number
  gradeClassBreakdown: Array<{
    grade: string
    className: string
    registeredCount: number
    satCount: number
    awardedCount: number
    certificatesIssuedCount: number
    students: Array<{
      studentId: string
      studentCode: string
      studentName: string
      className: string
      awardOrLevel: string
      scoreOrBand: string
      certificateStatus: string
      ownerTeacher: string
    }>
  }>
}

export interface AchievementsCertsTabPayload {
  summary: {
    uniqueParticipants: number
    totalSittings: number
    uniqueAwarded: number
    totalAwards: number
    certificatesIssued: number
  }
  exams: AchievementExamRow[]
}

export interface ObservationDeptTeacherRow {
  departmentId: string
  departmentName: string
  teacherCount: number
  observedTeacherCount: number
  unobservedTeacherCount: number
  observedLessons: number
  plannedLessons: number
  compliantTeachers: number
  evaluatedTeachers: number
  pendingForms: number
  teachers: Array<{
    teacherId: string
    teacherCode: string
    teacherName: string
    observedLessons: number
    plannedLessons: number
    status: "OBSERVED" | "UNOBSERVED"
    compliantStatus: "COMPLIANT" | "NON_COMPLIANT" | "NO_EVAL"
    latestRating: string
    latestScore: number | null
    pendingForms: number
  }>
}

export interface ObservationTabPayload {
  monthKey: string
  monthLabel: string
  summary: {
    observedLessons: number
    plannedLessons: number
    observedTeachers: number
    plannedTeachers: number
    unobservedTeachers: number
    compliantTeachers: number
    evaluatedTeachers: number
    pendingReviewForms: number
  }
  departments: ObservationDeptTeacherRow[]
  unobservedTeachersList: Array<{
    teacherId: string
    teacherCode: string
    teacherName: string
    departmentName: string
    campusName: string
    plannedLessons: number
    ownerLabel: string
  }>
}

export interface AcademicSupportItem {
  rowKey: string
  studentId: string
  studentCode: string
  studentName: string
  className: string
  grade: string
  subjectName: string
  score: number | null
  benchmarkScore: number | null
  benchmarkLabel: string
  triggerReason: string
  teacherName: string
  nextReviewDate: string
  latestResult: string
  hasTutoringLink: boolean
  tutoringHref: string
  hasAdvisoryLink: boolean
  advisoryHref: string
}

export interface PsychologyTrackingItem {
  id: string
  studentId: string
  studentCode: string
  studentName: string
  className: string
  grade: string
  campusName: string
  primaryOwnerName: string
  homeroomTeacherName: string
  status: string
  statusLabel: string
  reviewDate: string
  isDueInMonth: boolean
  latestOutcomeCode: string
  latestOutcomeLabel: string
  latestComment: string
  ssmHref: string
}

export interface StudentSupportTabPayload {
  academicSupport: {
    filterMode: "BELOW_5" | "BELOW_SKL" | "MULTI_SUBJECT" | "CONSECUTIVE_PERIODS"
    uniqueStudentCount: number
    totalRows: number
    items: AcademicSupportItem[]
  }
  entranceCommitment: {
    studentCount: number
    rowCount: number
    rows: Array<{
      stt: number
      studentCode: string
      studentName: string
      className: string
      committedSubject: string
      ksdn: { display: string; arrow: "↑" | "↓" | null; score: number | null }
      gk1: { display: string; arrow: "↑" | "↓" | null; score: number | null }
      ck1: { display: string; arrow: "↑" | "↓" | null; score: number | null }
      gk2: { display: string; arrow: "↑" | "↓" | null; score: number | null }
      ck2: { display: string; arrow: "↑" | "↓" | null; score: number | null }
    }>
  }
  psychologyTracking: {
    canView: boolean
    groupBy: "CLASS" | "OWNER"
    activeCount: number
    dueForReviewCount: number
    achievedGoalCount: number
    items: PsychologyTrackingItem[]
  }
}

export interface DrilldownRecord {
  id: string
  code: string
  name: string
  subLabel: string // Class / Grade / Subject / Dept
  statusLabel: string
  statusTone: "emerald" | "amber" | "rose" | "slate"
  metricValue: string
  ownerName: string
  nextMilestone: string
  ssmHref: string
}

export interface DrilldownPayload {
  drilldownKey: string
  title: string
  subtitle: string
  totalCount: number
  columns: {
    nameLabel: string
    subLabel: string
    metricLabel: string
    statusLabel: string
    ownerLabel: string
    milestoneLabel: string
  }
  records: DrilldownRecord[]
}
