export type StudentStatisticsTab = "academic" | "psychology" | "homeschooling" | "exchange"

export type EducationLevelCode = "TIEU_HOC" | "THCS" | "THPT" | "MAM_NON" | "KHAC"

export type Gk1OutcomeCode =
  | "DAT_TIEN_BO"
  | "TANG_CHUA_DAT_CHUAN"
  | "DAT_CHUAN_GIU_NGUYEN"
  | "DAT_CHUAN_GIAM"
  | "CHUA_DAT_CHUAN_GIU_NGUYEN"
  | "CHUA_DAT_CHUAN_GIAM"
  | "CHUA_DU_DU_LIEU"
  | "CHUA_CO_CAU_HINH_CHUAN"

export const GK1_OUTCOME_LABELS: Record<Gk1OutcomeCode, string> = {
  DAT_TIEN_BO: "Đạt tiến bộ",
  TANG_CHUA_DAT_CHUAN: "Tăng điểm, chưa đạt chuẩn",
  DAT_CHUAN_GIU_NGUYEN: "Đạt chuẩn, giữ nguyên điểm",
  DAT_CHUAN_GIAM: "Đạt chuẩn, điểm giảm",
  CHUA_DAT_CHUAN_GIU_NGUYEN: "Chưa đạt chuẩn, giữ nguyên điểm",
  CHUA_DAT_CHUAN_GIAM: "Chưa đạt chuẩn, điểm giảm",
  CHUA_DU_DU_LIEU: "Chưa đủ dữ liệu",
  CHUA_CO_CAU_HINH_CHUAN: "Chưa có cấu hình chuẩn",
}

export interface StudentStatisticsAccessScope {
  userId: string
  roleCode: string
  roleDisplayLabel: string
  canViewReport: boolean
  canViewAcademicTab: boolean
  canViewPsychologyTab: boolean
  canViewDetail: boolean
  canViewPsychologyComments: boolean
  canExportPdf: boolean
  canExportDetailPdf: boolean
  isSummaryOnly: boolean
  isCampusRestricted: boolean
  allowedCampusIds: string[]
  defaultCampusId: string
  isClassRestricted: boolean
  allowedClassIds: string[]
  isSubjectRestricted: boolean
  allowedSubjectIds: string[]
  teacherId: string | null
}

export interface ReconciliationItem {
  id: string
  type:
    | "DUPLICATE_COMMITMENT_MERGED"
    | "STUDENT_TRANSFERRED_CLASS"
    | "MAKEUP_OR_UPDATED_SCORE_USED"
    | "AMBIGUOUS_SCORE_CONFLICT"
    | "UNASSIGNED_CLASS_EXCLUDED"
    | "MISSING_BENCHMARK_CONFIG"
    | "MISSING_SCORE_DATA"
    | "UNASSIGNED_PSYCH_TEACHER"
  studentCode?: string
  studentName?: string
  campusName?: string
  className?: string
  subject?: string
  period?: string
  detail: string
}

export interface AcademicCommitmentFilterInput {
  academicYearId?: string
  campusId?: string
  level?: string
  grade?: string
  classId?: string
  committedSubject?: string
  asOfDate?: string
}

export interface AcademicCommitmentDetailRow {
  rowKey: string
  stt: number
  studentId: string
  studentCode: string
  studentName: string
  classId: string
  className: string
  classCode: string
  grade: string
  level: EducationLevelCode
  levelLabel: string
  campusId: string
  campusCode: string
  campusName: string
  committedSubject: string
  committedSubjectCode: string
  ksdnScore: number | null
  gk1Score: number | null
  ck1Score: number | null
  gk2Score: number | null
  ck2Score: number | null
  gk1Threshold: number | null
  gk1ThresholdSource: "STANDARD_PRIMARY" | "STANDARD_MIDDLE" | "CONFIGURED" | "MISSING"
  deltaGk1Ksdn: number | null
  gk1Outcome: Gk1OutcomeCode
  gk1OutcomeLabel: string
  isGk1Pass: boolean | null
  isComparableForProgress: boolean
  isProgressAchieved: boolean
  hasAmbiguousScore: boolean
  scoreNotes: string[]
}

export interface AcademicCommitmentAggregateRow {
  key: string
  campusId: string
  campusCode: string
  campusName: string
  level?: EducationLevelCode
  levelLabel?: string
  subject?: string
  distinctStudentCount: number
  commitmentRowCount: number
  comparableRowCount: number
  gk1PassCount: number
  progressCount: number
  progressRate: number | null // 0..100 or null when denominator === 0
}

export interface AcademicCommitmentReportPayload {
  asOfDate: string
  filters: {
    academicYearId: string
    academicYearName: string
    campusId: string
    campusName: string
    level: string
    levelLabel: string
    grade: string
    classId: string
    className: string
    committedSubject: string
  }
  availableFilters: {
    academicYears: Array<{ id: string; name: string; status: string }>
    campuses: Array<{ id: string; campusCode: string; campusName: string }>
    levels: Array<{ code: EducationLevelCode; label: string; count: number }>
    grades: Array<{ code: string; label: string; count: number }>
    classes: Array<{
      id: string
      classCode: string
      className: string
      grade: string
      level: EducationLevelCode
      campusId: string
      campusCode: string
      campusName: string
      displayLabel: string
      rowCount: number
    }>
    subjects: Array<{ code: string; name: string; rowCount: number }>
  }
  summary: {
    distinctStudentCount: number
    commitmentRowCount: number
    comparableRowCount: number
    gk1PassCount: number
    progressCount: number
    progressRate: number | null
    missingDataCount: number
    missingThresholdCount: number
    outcomeCounts: Record<Gk1OutcomeCode, number>
  }
  campusSummary: AcademicCommitmentAggregateRow[]
  campusLevelSubjectSummary: AcademicCommitmentAggregateRow[]
  detailRows: AcademicCommitmentDetailRow[]
  reconciliationItems: ReconciliationItem[]
  isSummaryOnly: boolean
}

// ============================================================================
// TAB 2: TÂM LÝ CAM KẾT ĐẦU VÀO
// ============================================================================

export type PsychWeekStatusCode =
  | "KHONG_CO_LICH"
  | "CHUA_DEN_HAN"
  | "DEN_HAN"
  | "DA_DANH_GIA"
  | "QUA_HAN"

export const PSYCH_WEEK_STATUS_LABELS: Record<PsychWeekStatusCode, string> = {
  KHONG_CO_LICH: "Không có lịch",
  CHUA_DEN_HAN: "Chưa đến hạn",
  DEN_HAN: "Đến hạn",
  DA_DANH_GIA: "Đã đánh giá",
  QUA_HAN: "Quá hạn",
}

export type PsychTeacherEvalStatusCode =
  | "CHUA_PHAN_CONG"
  | "CO_DANH_GIA_QUA_HAN"
  | "CON_LUOT_DEN_HAN"
  | "DA_CAP_NHAT_DU"
  | "CHUA_DEN_HAN"
  | "KHONG_CO_LICH"

export const PSYCH_TEACHER_STATUS_LABELS: Record<PsychTeacherEvalStatusCode, string> = {
  CHUA_PHAN_CONG: "Chưa phân công",
  CO_DANH_GIA_QUA_HAN: "Có đánh giá quá hạn",
  CON_LUOT_DEN_HAN: "Còn lượt đến hạn",
  DA_CAP_NHAT_DU: "Đã cập nhật đủ các lượt đến hạn",
  CHUA_DEN_HAN: "Chưa đến hạn",
  KHONG_CO_LICH: "Không có lịch",
}

export interface PsychEvaluationSlotDetail {
  id: string
  periodType: string
  periodName: string
  trackingLevel: string
  comment: string
  nextSupportDirection: string
  evaluatorName: string
  createdAt: string
}

export interface PsychWeekCell {
  weekNumber: number
  weekLabel: string
  status: PsychWeekStatusCode
  statusLabel: string
  completedSessions: number
  totalScheduledSessions: number
  dueDate: string | null
  evaluations: PsychEvaluationSlotDetail[]
}

export interface PsychCommitmentDetailRow {
  rowKey: string
  stt: number
  targetId: string
  studentId: string
  studentCode: string
  studentName: string
  classId: string
  className: string
  classCode: string
  grade: string
  campusId: string
  campusCode: string
  campusName: string
  assignedTeacherId: string | null
  assignedTeacherName: string
  isUnassigned: boolean
  categoryLabel: "Tâm lý cam kết đầu vào"
  weeks: [PsychWeekCell, PsychWeekCell, PsychWeekCell, PsychWeekCell]
  monthSummaryResult: string
  hasMonthSummary: boolean
  teacherEvalStatus: PsychTeacherEvalStatusCode
  teacherEvalStatusLabel: string
  latestEvaluationDate: string | null
  latestCommentShort: string | null
  nextSupportDirection: string | null
  canViewComments: boolean
}

export interface PsychWeekSummaryRow {
  weekNumber: number
  weekLabel: string
  dueStudentCount: number
  evaluatedStudentCount: number
  overdueStudentCount: number
  notDueStudentCount: number
  noScheduleStudentCount: number
  totalScheduledSessions: number
  completedSessions: number
}

export interface PsychMonthSummaryRow {
  monthValue: string // e.g. "Tháng 10"
  monthNumber: number
  calendarYear: number
  label: string // e.g. "Tháng 10/2026"
  totalStudents: number
  unassignedStudents: number
  overdueStudents: number
  duePendingStudents: number
  completedAllDueStudents: number
  monthSummarizedStudents: number
  monthSummaryRate: number | null
}

export interface PsychCampusSummaryRow {
  campusId: string
  campusCode: string
  campusName: string
  totalStudents: number
  unassignedStudents: number
  overdueStudents: number
  duePendingStudents: number
  completedAllDueStudents: number
  monthSummarizedStudents: number
  monthSummaryRate: number | null
}

export interface PsychologyCommitmentFilterInput {
  academicYearId?: string
  month?: string // "ALL_YEAR" | "Tháng 8" .. "Tháng 5"
  campusId?: string
  classId?: string
  teacherId?: string
  asOfDate?: string
}

export interface PsychologyCommitmentReportPayload {
  asOfDate: string
  viewMode: "MONTH" | "YEAR_SUMMARY"
  filters: {
    academicYearId: string
    academicYearName: string
    month: string
    monthLabel: string
    campusId: string
    campusName: string
    classId: string
    className: string
    teacherId: string
    teacherName: string
  }
  availableFilters: {
    academicYears: Array<{ id: string; name: string; status: string }>
    months: Array<{ value: string; label: string; monthNumber: number; calendarYear: number }>
    campuses: Array<{ id: string; campusCode: string; campusName: string }>
    classes: Array<{
      id: string
      classCode: string
      className: string
      campusId: string
      campusCode: string
      campusName: string
      displayLabel: string
      studentCount: number
    }>
    teachers: Array<{
      id: string
      name: string
      studentCount: number
    }>
  }
  summary: {
    totalStudents: number
    unassignedStudents: number
    overdueStudents: number
    duePendingStudents: number
    completedAllDueStudents: number
    monthSummarizedStudents: number
    monthSummaryRate: number | null
    totalScheduledSessions: number
    completedSessions: number
  }
  weekSummary: PsychWeekSummaryRow[]
  yearMonthlySummary: PsychMonthSummaryRow[]
  campusSummary: PsychCampusSummaryRow[]
  detailRows: PsychCommitmentDetailRow[]
  reconciliationItems: ReconciliationItem[]
  isSummaryOnly: boolean
  canViewPsychologyComments: boolean
}

// ============================================================================
// TAB 3: THEO DÕI HỌC SINH NHẬP HỌC CHƯƠNG TRÌNH HOMESCHOOLING
// ============================================================================

export interface HomeschoolingFilterInput {
  academicYearId?: string
  campusId?: string
  level?: string
  grade?: string
  classId?: string
  subject?: string
  commitmentFilter?: "ALL" | "COMMITTED" | "NON_COMMITTED"
  asOfDate?: string
}

export interface HomeschoolingDetailRow {
  rowKey: string
  stt: number
  studentId: string
  studentCode: string
  studentName: string
  classId: string
  className: string
  classCode: string
  grade: string
  level: EducationLevelCode
  levelLabel: string
  campusId: string
  campusCode: string
  campusName: string
  previousProgramLabel: string
  learningModeLabel: string | null
  hasCommitment: boolean
  isSubjectCommitted: boolean
  commitmentSummary: string
  subjectName: string
  subjectCode: string
  ksdnScore: number | null
  gk1Score: number | null
  ck1Score: number | null
  gk2Score: number | null
  ck2Score: number | null
  gk1Threshold: number | null
  deltaGk1Ksdn: number | null
  gk1Outcome: Gk1OutcomeCode
  gk1OutcomeLabel: string
  isGk1Pass: boolean | null
  isComparableForProgress: boolean
  isProgressAchieved: boolean
  hasAmbiguousScore: boolean
  scoreNotes: string[]
}

export interface HomeschoolingAggregateRow {
  key: string
  campusId: string
  campusCode: string
  campusName: string
  level?: EducationLevelCode
  levelLabel?: string
  subject?: string
  distinctStudentCount: number
  committedStudentCount: number
  trackedRowCount: number
  comparableRowCount: number
  gk1PassCount: number
  progressCount: number
  progressRate: number | null
}

export interface HomeschoolingReportPayload {
  asOfDate: string
  filters: {
    academicYearId: string
    academicYearName: string
    campusId: string
    campusName: string
    level: string
    levelLabel: string
    grade: string
    classId: string
    className: string
    subject: string
    commitmentFilter: "ALL" | "COMMITTED" | "NON_COMMITTED"
  }
  availableFilters: {
    academicYears: Array<{ id: string; name: string; status: string }>
    campuses: Array<{ id: string; campusCode: string; campusName: string }>
    levels: Array<{ code: EducationLevelCode; label: string; count: number }>
    grades: Array<{ code: string; label: string; count: number }>
    classes: Array<{
      id: string
      classCode: string
      className: string
      grade: string
      level: EducationLevelCode
      campusId: string
      campusCode: string
      campusName: string
      displayLabel: string
      rowCount: number
    }>
    subjects: Array<{ code: string; name: string; rowCount: number }>
  }
  summary: {
    distinctStudentCount: number
    committedStudentCount: number
    trackedRowCount: number
    comparableRowCount: number
    gk1PassCount: number
    progressCount: number
    progressRate: number | null
    missingDataCount: number
    missingThresholdCount: number
    outcomeCounts: Record<Gk1OutcomeCode, number>
  }
  campusSummary: HomeschoolingAggregateRow[]
  campusLevelSubjectSummary: HomeschoolingAggregateRow[]
  detailRows: HomeschoolingDetailRow[]
  reconciliationItems: ReconciliationItem[]
  isSummaryOnly: boolean
}

// ============================================================================
// TAB 4: THEO DÕI HỌC SINH DIỆN HỌC GIAO LƯU (GIAO_LUU)
// ============================================================================

export interface ExchangeStudentFilterInput {
  academicYearId?: string
  campusId?: string
  level?: string
  grade?: string
  classId?: string
  subject?: string
  asOfDate?: string
}

export interface ExchangeStudentDetailRow {
  rowKey: string
  stt: number
  studentId: string
  studentCode: string
  studentName: string
  classId: string
  className: string
  classCode: string
  grade: string
  level: EducationLevelCode
  levelLabel: string
  campusId: string
  campusCode: string
  campusName: string
  studentTypeLabel: "Học giao lưu"
  studentTypeNote: string | null
  subjectName: string
  subjectCode: string
  ksdnScore: number | null
  gk1Score: number | null
  ck1Score: number | null
  gk2Score: number | null
  ck2Score: number | null
  gk1Threshold: number | null
  deltaGk1Ksdn: number | null
  gk1Outcome: Gk1OutcomeCode
  gk1OutcomeLabel: string
  isGk1Pass: boolean | null
  isComparableForProgress: boolean
  isProgressAchieved: boolean
  hasAmbiguousScore: boolean
  scoreNotes: string[]
}

export interface ExchangeStudentAggregateRow {
  key: string
  campusId: string
  campusCode: string
  campusName: string
  level?: EducationLevelCode
  levelLabel?: string
  subject?: string
  distinctStudentCount: number
  trackedRowCount: number
  comparableRowCount: number
  gk1PassCount: number
  progressCount: number
  progressRate: number | null
}

export interface ExchangeStudentReportPayload {
  asOfDate: string
  filters: {
    academicYearId: string
    academicYearName: string
    campusId: string
    campusName: string
    level: string
    levelLabel: string
    grade: string
    classId: string
    className: string
    subject: string
  }
  availableFilters: {
    academicYears: Array<{ id: string; name: string; status: string }>
    campuses: Array<{ id: string; campusCode: string; campusName: string }>
    levels: Array<{ code: EducationLevelCode; label: string; count: number }>
    grades: Array<{ code: string; label: string; count: number }>
    classes: Array<{
      id: string
      classCode: string
      className: string
      grade: string
      level: EducationLevelCode
      campusId: string
      campusCode: string
      campusName: string
      displayLabel: string
      rowCount: number
    }>
    subjects: Array<{ code: string; name: string; rowCount: number }>
  }
  summary: {
    distinctStudentCount: number
    trackedRowCount: number
    comparableRowCount: number
    gk1PassCount: number
    progressCount: number
    progressRate: number | null
    missingDataCount: number
    missingThresholdCount: number
    outcomeCounts: Record<Gk1OutcomeCode, number>
  }
  campusSummary: ExchangeStudentAggregateRow[]
  campusLevelSubjectSummary: ExchangeStudentAggregateRow[]
  detailRows: ExchangeStudentDetailRow[]
  reconciliationItems: ReconciliationItem[]
  isSummaryOnly: boolean
}
