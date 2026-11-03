export type TaskPriority = "URGENT" | "HIGH" | "NORMAL" | "LOW"
export type TaskStatus = "NEW" | "IN_PROGRESS" | "WAITING" | "COMPLETED" | "OVERDUE" | "CANCELLED"

/**
 * 9 Phân hệ nghiệp vụ trọng tâm Sky-Line + các mã tương thích ngược cho PWA
 */
export type SourceModule =
  | "KHAO_SAT_DAU_VAO"      // 1. Khảo sát định hướng đầu vào
  | "LOP_CHU_NHIEM"         // 2. Lớp chủ nhiệm & ĐGNL
  | "MON_DAC_THU"           // 3. Đánh giá môn đặc thù
  | "CHAT_LUONG_GIANG_DAY"  // 4. Chất lượng môn giảng dạy (Sổ điểm, CTQT, Benchmark)
  | "NPS_PHHS"              // 5. NPS Phụ huynh
  | "Y_KIEN_PHHS"           // 6. Ý kiến PHHS & Kết nối KTĐBCL
  | "TRAI_NGHIEM"           // 7. Hoạt động trải nghiệm
  | "DU_GIO"                // 8. Dự giờ & KPI
  | "CO_VAN"                // 9. Cố vấn học tập & Hỗ trợ HS
  // Tương thích ngược với các màn hình cũ
  | "PHHS"
  | "HO_TRO"
  | "KHAO_THI"
  | "CONG_TAC"

export interface TaskCompletionCondition {
  code: string
  label: string
  currentValue: number | string
  targetValue: number | string
  isMet: boolean
}

export interface SSMTask {
  taskId: string
  taskType: string
  sourceModule: SourceModule
  sourceId: string
  title: string
  description?: string
  priority: TaskPriority
  status: TaskStatus
  deadline: string
  deadlineDate?: string
  assignedUserId: string
  deepLink: string
  createdAt: string
  updatedAt?: string
  completedAt?: string | null
  metadata?: {
    moduleLabel?: string
    badgeColor?: string
    campusId?: string
    campusName?: string
    classId?: string
    className?: string
    subjectId?: string
    subjectName?: string
    studentId?: string
    studentName?: string
    studentCode?: string
    educationSystem?: string
    approvalStatus?: "NOT_REQUIRED" | "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "CHANGES_REQUESTED"
    approverRole?: string
    completionConditions?: TaskCompletionCondition[]
    progressCurrent?: number
    progressTotal?: number
    progressPercent?: number
    evidenceCount?: number
    [key: string]: any
  }
}

export interface TaskSummaryCounts {
  total: number
  today: number
  thisWeek: number
  inProgress: number
  waitingApproval: number
  overdue: number
  completed: number
  byModule: Record<SourceModule, number>
}

/**
 * 6 nhóm chỉ số Tiến độ & KPI độc lập theo Mục VII (Không gộp chung thành một tỷ lệ tùy tiện)
 */
export interface SeparatedProgressAndKPI {
  /** 1. Tiến độ hoàn thành khối lượng công việc được giao */
  volumeProgress: {
    completedTasks: number
    totalAssignedTasks: number
    inProgressTasks: number
    completionRate: number // %
    gradebookEnteredCount: number
    gradebookTotalExpected: number
    competencyEvaluatedCount: number
    competencyTotalExpected: number
  }
  /** 2. Tiến độ được phê duyệt / công nhận hợp lệ */
  approvalProgress: {
    approvedItems: number
    waitingApprovalItems: number
    changesRequestedItems: number
    totalSubmittedItems: number
    approvalRate: number // %
    breakdown: {
      observationsApproved: number
      observationsPending: number
      activitiesApproved: number
      activitiesPending: number
      ctqtGradesApproved: number
      ctqtGradesPending: number
      specialGradesApproved: number
      specialGradesPending: number
    }
  }
  /** 3. Mức độ tuân thủ thời hạn */
  deadlineCompliance: {
    onTimeCount: number
    overdueCount: number
    dueSoonCount: number // Trong vòng 48h
    totalWithDeadline: number
    complianceRate: number // %
  }
  /** 4. Mức đạt KPI theo quy định hiện hành */
  kpiAttainment: {
    overallStatus: "MET" | "PARTIAL" | "UNMET"
    metCriteriaCount: number
    totalCriteriaCount: number
    observationQuota: {
      currentMonth: number
      currentYear: number
      observedValidCount: number
      requiredObservedQuota: number
      taughtValidCount: number
      requiredTaughtQuota: number
      isTargetConfirmed: boolean
      isObservationMet: boolean
      deficitPeriods: number
    }
    gradebookQuota: {
      completedClassesCount: number
      totalAssignedClassesCount: number
      isMet: boolean
    }
    experientialQuota: {
      evaluatedActivitiesCount: number
      totalAssignedActivitiesCount: number
      isMet: boolean
    }
  }
  /** 5. Chỉ số chất lượng giảng dạy các môn phụ trách */
  teachingQuality: {
    totalStudentsEvaluated: number
    passBenchmarkCount: number
    underBenchmarkCount: number
    passRate: number // %
    improvedStudentsCount: number
    trackedProgressStudentsCount: number
    progressRate: number // % học sinh duy trì hoặc tiến bộ qua các kỳ
    averageScore: number | null
    bySubjectClass: Array<{
      classId: string
      className: string
      campusId?: string
      campusName?: string
      subjectId: string
      subjectName: string
      programType: "MOET" | "CTQT" | "MON_DAC_THU"
      totalStudents: number
      gradedStudents: number
      benchmarkScore: number
      targetPassRateQuota: number
      passCount: number
      underBenchmarkCount: number
      passRate: number
      averageScore: number | null
      improvedCount: number
      isQuotaMet: boolean
    }>
  }
  /** 6. Hiệu quả hỗ trợ & cố vấn học sinh */
  studentSupportEffectiveness: {
    atRiskTotal: number
    redAlertCount: number
    yellowAlertCount: number
    remedialTargetsTotal: number
    remedialEvaluatedCount: number
    smartGoalsTotal: number
    smartGoalsSignedCount: number
    smartGoalsAchievedCount: number
    unlockBarriersTotal: number
    unlockBarriersResolvedCount: number
    helpRequestsTotal: number
    helpRequestsResolvedCount: number
    parentFeedbacksTotal: number
    parentFeedbacksResolvedCount: number
    supportCoverageRate: number // %
  }
}

export interface UnifiedTeacherAssignmentProfile {
  userId: string
  teacherId: string | null
  teacherCode: string | null
  teacherName: string
  email: string | null
  systemRole: string
  positions: string[]
  academicYearId: string
  academicYearName: string
  campuses: Array<{
    id: string
    campusCode: string
    campusName: string
    isPrimary: boolean
  }>
  rolesDetected: {
    isGVCN: boolean
    isGVBM: boolean
    isGVMonDacThu: boolean
    isGVCTQT: boolean
    isGVKhachMoiKhaoSat: boolean
    isGVPhuDao: boolean
    isTTCM: boolean
    isTBP: boolean
    isGDCS: boolean
    isPreschoolTeacher?: boolean
    isForeignTeacher?: boolean
    hasLeadershipPosition?: boolean
  }
  readableModules?: string[]
  homeroomClasses: Array<{
    id: string
    classCode: string
    className: string
    grade: string
    level: string
    campusId: string
    campusName: string
    educationSystem: string
    studentCount: number
  }>
  teachingAssignments: Array<{
    assignmentId: string
    classId: string
    className: string
    classCode: string
    grade: string
    campusId: string
    campusName: string
    subjectId: string
    subjectCode: string
    subjectName: string
    periodsPerWeek: number
  }>
  ctqtAssignments: Array<{
    assignmentId: string
    classId: string
    className: string
    grade: string
    campusId: string
    campusName: string
    subjectId: string
    subjectCode: string
    subjectName: string
    isDelegated: boolean
  }>
  specialAssignments: Array<{
    assignmentId: string
    subjectCode: string
    subjectName: string
    grade: string
    classId: string | null
    className: string | null
    campusId: string | null
    campusName: string | null
    educationSystem: string
  }>
  inputAssessmentAssignments: {
    generalCount: number
    preschoolCount: number
    examinerSessionsCount: number
    orientationRecordsCount: number
  }
  managedDepartmentIds: string[]
  managedDepartmentNames: string[]
}
