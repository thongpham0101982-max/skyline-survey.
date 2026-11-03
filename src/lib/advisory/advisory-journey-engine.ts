/**
 * SKY-LINE ADVISORY JOURNEY & NEXT BEST ACTION ENGINE
 * Lộ trình Cố vấn & Đồng hành Học sinh (8 Giai đoạn động + Next Best Action Engine)
 */

export type JourneyStageCode =
  | "STAGE_1_PROFILE_INIT"
  | "STAGE_2_DISCOVERY_CONSULT"
  | "STAGE_3_SMART_GOALS"
  | "STAGE_4_ACTION_PLAN"
  | "STAGE_5_MONITOR_SUPPORT"
  | "STAGE_6_REVIEW_ADJUST"
  | "STAGE_7_RUBRIC_EVAL"
  | "STAGE_8_APPROVE_PUBLISH"

export type JourneyStageStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "WAITING_GVBM"
  | "WAITING_APPROVAL"
  | "OVERDUE"
  | "COMPLETED"

export type JourneyPriority = "URGENT" | "HIGH" | "NORMAL" | "LOW"

export type TeacherAdvisoryTab =
  | "dashboard"
  | "journey"
  | "tracking"
  | "unlocks"
  | "rubric_eval"
  | "consultations"
  | "sos"
  | "requests"
  | "skl_psych"

export interface JourneyStageBlueprint {
  stepNumber: number
  code: JourneyStageCode
  name: string
  shortName: string
  businessObjective: string
  mandatoryTasks: string[]
  inputDataDesc: string[]
  completionConditionDesc: string
  defaultResponsible: string
  defaultDeadlineLabel: string
  targetTab: TeacherAdvisoryTab
  supportsDynamicLoop?: boolean
}

export const ADVISORY_JOURNEY_STAGES: JourneyStageBlueprint[] = [
  {
    stepNumber: 1,
    code: "STAGE_1_PROFILE_INIT",
    name: "1. Khởi tạo hồ sơ và rà soát dữ liệu",
    shortName: "Khởi tạo & Rà soát",
    businessObjective:
      "Thiết lập hồ sơ cố vấn năm học, rà soát kết quả học tập nền tảng và phân loại tín hiệu theo dõi ban đầu (Xanh / Vàng / Đỏ).",
    mandatoryTasks: [
      "Rà soát thông tin lớp, hồ sơ học tập và điểm số đầu kỳ của học sinh",
      "Xác nhận tín hiệu theo dõi ban đầu (Ổn định / Cần lưu ý / Cần hỗ trợ đặc biệt)"
    ],
    inputDataDesc: [
      "Hồ sơ học sinh 360° & Kết quả học tập các môn",
      "Tín hiệu cảnh báo sớm (StudentAdvisoryStatus)"
    ],
    completionConditionDesc:
      "Học sinh đã có hồ sơ theo dõi năm học và dữ liệu nền tảng (mục tiêu, khảo sát hoặc tín hiệu phân loại được xác nhận).",
    defaultResponsible: "GVCN / CVHT",
    defaultDeadlineLabel: "2 tuần đầu học kỳ",
    targetTab: "journey"
  },
  {
    stepNumber: 2,
    code: "STAGE_2_DISCOVERY_CONSULT",
    name: "2. Tìm hiểu học sinh và tư vấn ban đầu",
    shortName: "Tìm hiểu & Định hướng",
    businessObjective:
      "Khám phá đặc điểm tính cách, khí chất, sở thích nghề nghiệp (SKL_PSYCH) và lắng nghe nguyện vọng đầu năm của học sinh.",
    mandatoryTasks: [
      "Học sinh thực hiện ít nhất 01 bài khảo sát Tâm lý – Hướng nghiệp (DISC, EPI, HOLLAND, EQ, MBTI)",
      "GVCN trao đổi định hướng ban đầu hoặc ghi nhận thế mạnh / rào cản của học sinh"
    ],
    inputDataDesc: [
      "Hồ sơ Khảo sát Tâm lý & Hướng nghiệp 5 bộ công cụ (SKL_PSYCH)",
      "Ghi nhận tư vấn định hướng đầu kỳ hoặc lời cam kết học sinh"
    ],
    completionConditionDesc:
      "Học sinh đã hoàn thành ít nhất 01 bài khảo sát SKL_PSYCH hoặc đã có phiên tư vấn định hướng đầu kỳ được ghi nhận.",
    defaultResponsible: "Học sinh & GVCN",
    defaultDeadlineLabel: "Tháng đầu học kỳ",
    targetTab: "skl_psych"
  },
  {
    stepNumber: 3,
    code: "STAGE_3_SMART_GOALS",
    name: "3. Thiết lập mục tiêu SMART",
    shortName: "Mục tiêu SMART",
    businessObjective:
      "Học sinh xác lập đầy đủ các nhóm mục tiêu năm học theo chuẩn SMART và được GVCN/CVHT thẩm định, ký xác nhận.",
    mandatoryTasks: [
      "Học sinh thiết lập đầy đủ mục tiêu các nhóm (Học tập, Thói quen, Kỹ năng, Định hướng) và ký cam kết",
      "GVCN/CVHT rà soát tính khả thi, nhập nhận xét định hướng và ký xác nhận phiếu mục tiêu"
    ],
    inputDataDesc: [
      "Phiếu Mục tiêu SMART năm học của học sinh (StudentGoal)",
      "Nhận xét & xác nhận của Cố vấn học tập"
    ],
    completionConditionDesc:
      "Học sinh đã nộp mục tiêu hợp lệ VÀ GVCN đã nhận xét, ký xác nhận (không tính nếu chỉ lưu nháp hoặc chưa được CVHT duyệt).",
    defaultResponsible: "Học sinh → GVCN xác nhận",
    defaultDeadlineLabel: "Tháng 1 của học kỳ",
    targetTab: "tracking"
  },
  {
    stepNumber: 4,
    code: "STAGE_4_ACTION_PLAN",
    name: "4. Xây dựng kế hoạch hành động",
    shortName: "Kế hoạch hành động",
    businessObjective:
      "Chuyển hóa mục tiêu SMART thành các hành động cụ thể hàng tuần và kế hoạch Sprint 7 ngày tháo gỡ rào cản.",
    mandatoryTasks: [
      "Xác định giải pháp thực hiện cụ thể (Em sẽ làm gì) cho từng mục tiêu",
      "Thiết lập kế hoạch hành động 7 ngày (Sprint mở khóa mục tiêu) hoặc nhiệm vụ sau tư vấn kèm thời hạn"
    ],
    inputDataDesc: [
      "Kế hoạch hành động trong Phiếu mục tiêu (howText)",
      "Kế hoạch 7 ngày mở khóa mục tiêu (StudentGoalUnlock) & Nhiệm vụ hành động (StudentGoalAction)"
    ],
    completionConditionDesc:
      "Các mục tiêu đã có giải pháp hành động cụ thể hoặc đã kích hoạt kế hoạch hành động 7 ngày / nhiệm vụ theo dõi.",
    defaultResponsible: "Học sinh & GVCN",
    defaultDeadlineLabel: "Sau khi chốt SMART 7 ngày",
    targetTab: "unlocks"
  },
  {
    stepNumber: 5,
    code: "STAGE_5_MONITOR_SUPPORT",
    name: "5. Theo dõi tiến độ và tổ chức hỗ trợ",
    shortName: "Theo dõi & Hỗ trợ (Vòng lặp)",
    businessObjective:
      "Theo dõi tiến độ qua 4 mốc kiểm tra, tổ chức phiên tư vấn 1:1 và điều phối GVBM hỗ trợ các môn cần cải thiện (hỗ trợ lặp lại nhiều vòng trong kỳ).",
    mandatoryTasks: [
      "Check-in tiến độ mục tiêu tại các mốc Giữa kỳ / Cuối kỳ",
      "Tổ chức phiên tư vấn 1:1 và ghi nhận nhật ký tư vấn",
      "Phân công GVBM hỗ trợ chuyên môn đối với các môn dưới chuẩn Benchmark (nếu có)"
    ],
    inputDataDesc: [
      "Bảng Check-in tiến độ 4 mốc (StudentGoalTracking)",
      "Nhật ký tư vấn 1:1 (AcademicConsultationLog)",
      "Nhiệm vụ phối hợp GVBM (SubjectTeacherAdvisoryTask) & Yêu cầu SOS"
    ],
    completionConditionDesc:
      "Đã thực hiện ít nhất 01 phiên tư vấn 1:1 hoàn tất, cập nhật tiến độ mốc kiểm tra và không còn nhiệm vụ hỗ trợ/SOS quá hạn.",
    defaultResponsible: "GVCN & GVBM phối hợp",
    defaultDeadlineLabel: "Xuyên suốt học kỳ (Lặp lại)",
    targetTab: "consultations",
    supportsDynamicLoop: true
  },
  {
    stepNumber: 6,
    code: "STAGE_6_REVIEW_ADJUST",
    name: "6. Rà soát, phản hồi và điều chỉnh",
    shortName: "Rà soát & Điều chỉnh (Vòng lặp)",
    businessObjective:
      "Đánh giá hiệu quả sau hỗ trợ, học sinh tự phản tư, CVHT duyệt tư vấn GVBM gửi Phụ huynh và điều chỉnh mục tiêu khi cần.",
    mandatoryTasks: [
      "Học sinh thực hiện tự phản tư sau phiên tư vấn 1:1 hoặc mốc kiểm tra",
      "GVCN rà soát phản hồi chuyên môn từ GVBM và phê duyệt công bố cho PHHS",
      "Giải quyết yêu cầu mở phiếu điều chỉnh mục tiêu và phản hồi ý kiến đồng hành từ PHHS"
    ],
    inputDataDesc: [
      "Nhật ký tự phản tư của học sinh (StudentReflection)",
      "Phản hồi từ GVBM & Trao đổi từ Phụ huynh (ParentAdvisorExchange)",
      "Yêu cầu mở phiếu điều chỉnh mục tiêu (GoalAdjustmentRequest)"
    ],
    completionConditionDesc:
      "Đã xử lý hết các phản hồi GVBM / yêu cầu điều chỉnh mục tiêu / tin nhắn PHHS đang chờ và chia sẻ thông tin đồng hành cùng Gia đình.",
    defaultResponsible: "GVCN, Học sinh & PHHS",
    defaultDeadlineLabel: "Sau mỗi vòng tư vấn / Giữa kỳ",
    targetTab: "tracking",
    supportsDynamicLoop: true
  },
  {
    stepNumber: 7,
    code: "STAGE_7_RUBRIC_EVAL",
    name: "7. Đánh giá Rubric và tổng kết kỳ",
    shortName: "Đánh giá Rubric kỳ",
    businessObjective:
      "Đánh giá tổng kết học kỳ theo 3 tiêu chí Rubric chuẩn hóa và đưa ra nhận xét, khuyến nghị phát triển cho học sinh.",
    mandatoryTasks: [
      "Chấm điểm 3 tiêu chí Rubric: Mức độ hoàn thành mục tiêu, Tính chủ động, Thái độ tham gia",
      "Nhập nhận xét tổng kết và khuyến nghị định hướng học kỳ cho học sinh"
    ],
    inputDataDesc: [
      "Điểm 4 mốc tiến độ & Nhật ký tư vấn trong kỳ",
      "Phiếu đánh giá kỳ theo Rubric (StudentTermEvaluation)"
    ],
    completionConditionDesc:
      "Đã chấm đầy đủ cả 3 tiêu chí Rubric (> 0) và lưu nhận xét khuyến nghị chính thức cho học kỳ (không tính nếu dữ liệu trống).",
    defaultResponsible: "GVCN / CVHT",
    defaultDeadlineLabel: "Cuối học kỳ",
    targetTab: "rubric_eval"
  },
  {
    stepNumber: 8,
    code: "STAGE_8_APPROVE_PUBLISH",
    name: "8. Duyệt, công bố kết quả và chuyển kỳ tiếp theo",
    shortName: "Duyệt, Công bố & Chuyển kỳ",
    businessObjective:
      "Xác nhận phê duyệt kết quả đánh giá Cố vấn học tập cuối kỳ, công bố báo cáo chính thức tới PHHS và chuẩn bị lộ trình kỳ mới.",
    mandatoryTasks: [
      "Xác nhận duyệt kết quả đánh giá tổng kết kỳ",
      "Công bố báo cáo Cố vấn học tập kỳ lên Cổng Phụ huynh & Học sinh",
      "Khởi tạo định hướng chuyển tiếp sang học kỳ tiếp theo"
    ],
    inputDataDesc: [
      "Phiếu đánh giá Rubric kỳ đã hoàn thiện",
      "Trạng thái phê duyệt & công bố (AdvisoryJourneyState)"
    ],
    completionConditionDesc:
      "Kết quả đánh giá kỳ đã được duyệt chính thức VÀ đã công bố cho Phụ huynh học sinh.",
    defaultResponsible: "GVCN & Ban Giám hiệu",
    defaultDeadlineLabel: "Khi kết thúc học kỳ",
    targetTab: "journey"
  }
]

export interface JourneyStageComputed extends JourneyStageBlueprint {
  status: JourneyStageStatus
  completedAt: string | null
  responsiblePerson: string
  deadline: string
  deadlineDate: string | null
  progressText: string
  blockers: string[]
  historyItems: Array<{
    date: string
    actor: string
    summary: string
  }>
  deepLink: string
}

export interface DynamicFollowUpLoopItem {
  loopNumber: number
  type: "CONSULTATION_1ON1" | "GVBM_SUPPORT" | "ACTION_7DAY" | "REFLECTION_REVIEW" | "PARENT_EXCHANGE"
  title: string
  subtitle: string
  actor: string
  date: string
  deadline?: string | null
  status: "COMPLETED" | "IN_PROGRESS" | "OVERDUE" | "WAITING"
  badgeText: string
  targetTab: TeacherAdvisoryTab
}

export interface NextBestAction {
  ruleCode: string
  stageNumber: number
  stageCode: JourneyStageCode
  stageName: string
  title: string
  reason: string
  dataSource: string
  responsibleRole: "GVCN" | "GVBM" | "STUDENT" | "PARENT" | "ADMIN"
  responsibleName: string
  deadlineLabel: string
  deadlineDate: string | null
  priority: JourneyPriority
  status: JourneyStageStatus
  targetTab: TeacherAdvisoryTab
  actionMode?:
    | "OPEN_TAB"
    | "OPEN_CONSULTATION_MODAL"
    | "OPEN_AI_ADVISOR"
    | "APPROVE_RUBRIC"
    | "PUBLISH_RUBRIC"
    | "PREPARE_NEXT_TERM"
  deepLink: string
}

export interface AdvisoryWorkQueueItem {
  id: string
  studentId: string
  studentCode: string
  studentName: string
  classId: string
  className: string
  gradeLevel: string
  term: string
  stageNumber: number
  stageCode: JourneyStageCode
  stageShortName: string
  taskTitle: string
  reason: string
  dataSource: string
  priority: JourneyPriority
  responsibleRole: string
  responsibleName: string
  deadlineLabel: string
  deadlineDate: string | null
  status: JourneyStageStatus
  targetTab: TeacherAdvisoryTab
  actionMode?: string
  deepLink: string
}

export interface SmartAdvisoryReminder {
  id: string
  category:
    | "DUE_SOON"
    | "OVERDUE"
    | "UNUPDATED_PROGRESS"
    | "GVBM_RESPONDED"
    | "STUDENT_FEEDBACK"
    | "RUBRIC_NEEDED"
    | "WAITING_APPROVAL"
  categoryLabel: string
  severity: "URGENT" | "HIGH" | "NORMAL"
  studentId: string
  studentName: string
  className: string
  title: string
  message: string
  targetTab: TeacherAdvisoryTab
  deepLink: string
  createdAt: string
}

export interface StudentJourneyEvaluationResult {
  studentId: string
  studentCode: string
  studentName: string
  classId: string
  className: string
  gradeLevel: string
  statusColor: "GREEN" | "YELLOW" | "RED"
  term: string
  currentStageNumber: number
  currentStageCode: JourneyStageCode
  currentStageName: string
  completedStagesCount: number
  overallProgressPercent: number
  loopCount: number
  stages: JourneyStageComputed[]
  dynamicLoops: DynamicFollowUpLoopItem[]
  nextBestAction: NextBestAction
  workItems: AdvisoryWorkQueueItem[]
  smartReminders: SmartAdvisoryReminder[]
  journeyState: {
    rubricApprovalStatus: "DRAFT" | "PENDING_APPROVAL" | "APPROVED"
    approvedByName?: string | null
    approvedAt?: string | null
    isPublishedToParent: boolean
    publishedAt?: string | null
    nextTermPrepared: boolean
    currentLoopIndex: number
  }
}

export function computeStudentAdvisoryJourney(params: {
  student: {
    id: string
    studentCode: string
    studentName: string
    classId: string
    className: string
    gradeLevel: string
  }
  homeroomTeacherName: string
  academicYearId: string
  term: "HK1" | "HK2"
  statusRecord?: any | null
  psychAssessments?: any[]
  goals?: any[]
  unlocks?: any[]
  actionItems?: any[]
  trackingLogs?: any[]
  consultationLogs?: any[]
  gvbmTasks?: any[]
  helpRequests?: any[]
  adjustmentRequests?: any[]
  parentExchanges?: any[]
  reflections?: any[]
  termEvaluations?: any[]
  journeyState?: any | null
  auditLogs?: any[]
  reminderConfig?: {
    dueSoonHours: number
    overdueEscalateHours: number
    unupdatedProgressDays: number
  }
}): StudentJourneyEvaluationResult {
  const {
    student,
    homeroomTeacherName,
    term,
    statusRecord,
    psychAssessments = [],
    goals = [],
    unlocks = [],
    actionItems = [],
    trackingLogs = [],
    consultationLogs = [],
    gvbmTasks = [],
    helpRequests = [],
    adjustmentRequests = [],
    parentExchanges = [],
    reflections = [],
    termEvaluations = [],
    journeyState,
    reminderConfig = {
      dueSoonHours: 48,
      overdueEscalateHours: 24,
      unupdatedProgressDays: 14
    }
  } = params

  const now = new Date()
  const statusColor: "GREEN" | "YELLOW" | "RED" =
    statusRecord?.statusColor === "RED"
      ? "RED"
      : statusRecord?.statusColor === "YELLOW"
      ? "YELLOW"
      : "GREEN"

  const validGoals = goals.filter((g: any) => Boolean(g?.targetText && String(g.targetText).trim()))
  const signedGoals = validGoals.filter(
    (g: any) =>
      Boolean(g?.signedByTeacher) ||
      Boolean(g?.teacherComment && String(g.teacherComment).trim()) ||
      g?.advisorReviewStatus === "CONFIRMED"
  )
  const goalsNeedingAdjustment = validGoals.filter(
    (g: any) => g?.advisorReviewStatus === "NEEDS_ADJUSTMENT"
  )

  const goalsWithActionText = validGoals.filter((g: any) =>
    Boolean(g?.howText && String(g.howText).trim().length >= 5)
  )
  const completedPsych = psychAssessments.filter((p: any) => p?.status === "COMPLETED")

  const pendingHelpRequests = helpRequests.filter(
    (h: any) => h?.status === "PENDING" || h?.status === "PROCESSING"
  )
  const pendingAdjustmentRequests = adjustmentRequests.filter(
    (r: any) => r?.status === "PENDING"
  )
  const pendingParentExchanges = parentExchanges.filter(
    (ex: any) => ex?.status === "PENDING" || !ex?.advisorResponse
  )

  const assignedGvbmTasks = gvbmTasks.filter((t: any) => t?.status === "ASSIGNED")
  const respondedGvbmTasks = gvbmTasks.filter((t: any) => t?.status === "RESPONDED")
  const approvedGvbmTasks = gvbmTasks.filter(
    (t: any) => t?.status === "APPROVED_FOR_PARENT" || t?.status === "PARENT_ACKNOWLEDGED"
  )

  const overdueGvbmTasks = assignedGvbmTasks.filter((t: any) => {
    if (!t?.dueDate) return false
    const d = new Date(t.dueDate)
    return !isNaN(d.getTime()) && d.getTime() < now.getTime()
  })

  // Action items & consultation deadlines
  const overdueActions = actionItems.filter((a: any) => {
    if (a?.status === "COMPLETED" || a?.status === "DONE") return false
    if (!a?.deadline) return false
    const d = new Date(a.deadline)
    return !isNaN(d.getTime()) && d.getTime() < now.getTime()
  })

  const dueSoonActions = actionItems.filter((a: any) => {
    if (a?.status === "COMPLETED" || a?.status === "DONE") return false
    if (!a?.deadline) return false
    const d = new Date(a.deadline)
    if (isNaN(d.getTime())) return false
    const diffHours = (d.getTime() - now.getTime()) / (1000 * 3600)
    return diffHours >= 0 && diffHours <= reminderConfig.dueSoonHours
  })

  const overdueConsultations = consultationLogs.filter((c: any) => {
    if (c?.status === "COMPLETED" && !c?.deadline) return false
    if (!c?.deadline) return false
    const d = new Date(c.deadline)
    if (isNaN(d.getTime())) return false
    const isDone = c?.sessionStatus === "COMPLETED" && Boolean(c?.studentReflection || c?.parentAcknowledged)
    return !isDone && d.getTime() < now.getTime()
  })

  // Term evaluation for current term
  const currentTermEval =
    termEvaluations.find((e: any) => e?.term === term) || termEvaluations[0] || null
  const isRubricComplete = Boolean(
    currentTermEval &&
      Number(currentTermEval.goalCompletionLevel) > 0 &&
      Number(currentTermEval.initiativeLevel) > 0 &&
      Number(currentTermEval.participationAttitude) > 0 &&
      Boolean(currentTermEval.recommendations && String(currentTermEval.recommendations).trim())
  )

  const rubricApprovalStatus: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" =
    journeyState?.rubricApprovalStatus === "APPROVED"
      ? "APPROVED"
      : journeyState?.rubricApprovalStatus === "PENDING_APPROVAL"
      ? "PENDING_APPROVAL"
      : "DRAFT"

  const isPublishedToParent = Boolean(Number(journeyState?.isPublishedToParent || 0))
  const nextTermPrepared = Boolean(Number(journeyState?.nextTermPrepared || 0))

  // ===========================================================================
  // COMPUTE 8 STAGES STATUS & METADATA
  // ===========================================================================
  const baseDeepLink = `/teacher/co-van-hoc-tap?classId=${student.classId}&studentId=${student.id}`

  // STAGE 1: Khởi tạo hồ sơ & rà soát dữ liệu
  const stage1Done = Boolean(
    Number(journeyState?.profileInitialized || 0) ||
      statusRecord ||
      validGoals.length > 0 ||
      completedPsych.length > 0 ||
      consultationLogs.length > 0
  )
  const stage1CompletedAt =
    journeyState?.profileInitializedAt ||
    statusRecord?.updatedAt ||
    validGoals[0]?.createdAt ||
    completedPsych[0]?.submittedAt ||
    null

  // STAGE 2: Tìm hiểu học sinh & tư vấn ban đầu
  const stage2Done = Boolean(
    Number(journeyState?.initialConsultDone || 0) ||
      completedPsych.length > 0 ||
      consultationLogs.length > 0
  )
  const stage2CompletedAt =
    journeyState?.initialConsultAt ||
    completedPsych[0]?.submittedAt ||
    consultationLogs[consultationLogs.length - 1]?.meetingDate ||
    null

  // STAGE 3: Thiết lập mục tiêu SMART (chỉ hoàn thành khi có mục tiêu VÀ đã được GVCN xác nhận)
  const stage3Done = validGoals.length > 0 && signedGoals.length > 0 && goalsNeedingAdjustment.length === 0
  const stage3Status: JourneyStageStatus = stage3Done
    ? "COMPLETED"
    : validGoals.length > 0
    ? "WAITING_APPROVAL"
    : "NOT_STARTED"
  const stage3CompletedAt = stage3Done ? signedGoals[0]?.updatedAt || signedGoals[0]?.createdAt : null

  // STAGE 4: Xây dựng kế hoạch hành động
  const hasActionPlan =
    goalsWithActionText.length > 0 || unlocks.length > 0 || actionItems.length > 0
  const stage4Done = stage3Done && hasActionPlan
  const stage4Status: JourneyStageStatus = stage4Done
    ? "COMPLETED"
    : hasActionPlan
    ? "IN_PROGRESS"
    : "NOT_STARTED"
  const stage4CompletedAt = stage4Done
    ? unlocks[0]?.createdAt || actionItems[0]?.createdAt || validGoals[0]?.updatedAt || null
    : null

  // STAGE 5: Theo dõi tiến độ & tổ chức hỗ trợ (Dynamic Loop)
  const hasTrackingOrConsult = trackingLogs.length > 0 || consultationLogs.length > 0
  const hasOverdueStage5 =
    overdueGvbmTasks.length > 0 ||
    overdueActions.length > 0 ||
    overdueConsultations.length > 0 ||
    pendingHelpRequests.length > 0
  const stage5Done =
    consultationLogs.length > 0 &&
    !hasOverdueStage5 &&
    assignedGvbmTasks.length === 0 &&
    (statusColor !== "RED" || consultationLogs.length >= 1)

  const stage5Status: JourneyStageStatus = hasOverdueStage5
    ? "OVERDUE"
    : assignedGvbmTasks.length > 0
    ? "WAITING_GVBM"
    : stage5Done
    ? "COMPLETED"
    : hasTrackingOrConsult || gvbmTasks.length > 0
    ? "IN_PROGRESS"
    : "NOT_STARTED"

  // STAGE 6: Rà soát, phản hồi và điều chỉnh (Dynamic Loop)
  const hasStage6PendingReview =
    respondedGvbmTasks.length > 0 ||
    pendingAdjustmentRequests.length > 0 ||
    pendingParentExchanges.length > 0
  const hasSharedWithParent =
    consultationLogs.some((c: any) => c?.shareWithParent !== false) ||
    approvedGvbmTasks.length > 0 ||
    validGoals.some((g: any) => g?.signedByParent || g?.parentMessage)
  const stage6Done =
    stage5Done && !hasStage6PendingReview && (hasSharedWithParent || reflections.length > 0)

  const stage6Status: JourneyStageStatus = hasStage6PendingReview
    ? "WAITING_APPROVAL"
    : stage6Done
    ? "COMPLETED"
    : reflections.length > 0 || approvedGvbmTasks.length > 0 || parentExchanges.length > 0
    ? "IN_PROGRESS"
    : "NOT_STARTED"

  // STAGE 7: Đánh giá Rubric và tổng kết kỳ
  const stage7Status: JourneyStageStatus = isRubricComplete
    ? "COMPLETED"
    : currentTermEval
    ? "IN_PROGRESS"
    : "NOT_STARTED"

  // STAGE 8: Duyệt, công bố kết quả và chuyển kỳ tiếp theo
  const stage8Done = isRubricComplete && rubricApprovalStatus === "APPROVED" && isPublishedToParent
  const stage8Status: JourneyStageStatus = stage8Done
    ? "COMPLETED"
    : isRubricComplete && rubricApprovalStatus !== "APPROVED"
    ? "WAITING_APPROVAL"
    : isRubricComplete && !isPublishedToParent
    ? "IN_PROGRESS"
    : "NOT_STARTED"

  const stages: JourneyStageComputed[] = [
    {
      ...ADVISORY_JOURNEY_STAGES[0],
      status: stage1Done ? "COMPLETED" : "IN_PROGRESS",
      completedAt: stage1CompletedAt ? new Date(stage1CompletedAt).toISOString() : null,
      responsiblePerson: homeroomTeacherName,
      deadline: ADVISORY_JOURNEY_STAGES[0].defaultDeadlineLabel,
      deadlineDate: null,
      progressText: stage1Done
        ? `Đã khởi tạo • Tín hiệu: ${statusColor === "RED" ? "Đỏ (Cần hỗ trợ)" : statusColor === "YELLOW" ? "Vàng (Cần lưu ý)" : "Xanh (Ổn định)"}`
        : "Chưa rà soát hồ sơ đầu kỳ",
      blockers: [],
      historyItems: statusRecord
        ? [
            {
              date: new Date(statusRecord.updatedAt || statusRecord.createdAt || now).toLocaleDateString("vi-VN"),
              actor: homeroomTeacherName,
              summary: `Phân loại tín hiệu theo dõi: ${statusColor}`
            }
          ]
        : [],
      deepLink: `${baseDeepLink}&tab=journey`
    },
    {
      ...ADVISORY_JOURNEY_STAGES[1],
      status: stage2Done ? "COMPLETED" : "NOT_STARTED",
      completedAt: stage2CompletedAt ? new Date(stage2CompletedAt).toISOString() : null,
      responsiblePerson: `${student.studentName} & ${homeroomTeacherName}`,
      deadline: ADVISORY_JOURNEY_STAGES[1].defaultDeadlineLabel,
      deadlineDate: null,
      progressText: `Khảo sát SKL_PSYCH: ${completedPsych.length}/5 bộ công cụ • Tư vấn: ${consultationLogs.length} buổi`,
      blockers:
        completedPsych.length === 0 && consultationLogs.length === 0
          ? ["Học sinh chưa thực hiện khảo sát hướng nghiệp SKL_PSYCH hoặc tư vấn đầu kỳ"]
          : [],
      historyItems: completedPsych.slice(0, 3).map((p: any) => ({
        date: new Date(p.submittedAt || p.updatedAt || now).toLocaleDateString("vi-VN"),
        actor: student.studentName,
        summary: `Hoàn thành khảo sát ${p.testCode}: ${p.primaryResultCode || "Đã chấm điểm"}`
      })),
      deepLink: `${baseDeepLink}&tab=skl_psych`
    },
    {
      ...ADVISORY_JOURNEY_STAGES[2],
      status: stage3Status,
      completedAt: stage3CompletedAt ? new Date(stage3CompletedAt).toISOString() : null,
      responsiblePerson: validGoals.length === 0 ? student.studentName : homeroomTeacherName,
      deadline: ADVISORY_JOURNEY_STAGES[2].defaultDeadlineLabel,
      deadlineDate: null,
      progressText:
        validGoals.length === 0
          ? "Chưa nộp phiếu mục tiêu SMART"
          : `Đã lập ${validGoals.length} mục tiêu • GVCN xác nhận: ${signedGoals.length}/${validGoals.length}`,
      blockers:
        validGoals.length === 0
          ? ["Học sinh chưa điền phiếu mục tiêu SMART năm học"]
          : signedGoals.length === 0
          ? ["GVCN chưa rà soát & ký xác nhận phiếu mục tiêu SMART của học sinh"]
          : goalsNeedingAdjustment.length > 0
          ? [`Có ${goalsNeedingAdjustment.length} mục tiêu CVHT yêu cầu học sinh điều chỉnh lại`]
          : [],
      historyItems: validGoals.slice(0, 2).map((g: any) => ({
        date: new Date(g.updatedAt || g.createdAt || now).toLocaleDateString("vi-VN"),
        actor: g.signedByTeacher ? homeroomTeacherName : student.studentName,
        summary: g.signedByTeacher
          ? `GVCN đã xác nhận mục tiêu [${g.category}]`
          : `Học sinh đăng ký mục tiêu [${g.category}]: ${String(g.targetText).slice(0, 60)}`
      })),
      deepLink: `${baseDeepLink}&tab=tracking`
    },
    {
      ...ADVISORY_JOURNEY_STAGES[3],
      status: stage4Status,
      completedAt: stage4CompletedAt ? new Date(stage4CompletedAt).toISOString() : null,
      responsiblePerson: `${student.studentName} & ${homeroomTeacherName}`,
      deadline: ADVISORY_JOURNEY_STAGES[3].defaultDeadlineLabel,
      deadlineDate: null,
      progressText: `Giải pháp mục tiêu: ${goalsWithActionText.length}/${validGoals.length} • Sprint 7 ngày: ${unlocks.length} • Nhiệm vụ: ${actionItems.length}`,
      blockers: !hasActionPlan
        ? ["Chưa xây dựng kế hoạch hành động cụ thể hoặc Sprint 7 ngày cho mục tiêu"]
        : [],
      historyItems: [
        ...unlocks.slice(0, 2).map((u: any) => ({
          date: new Date(u.updatedAt || u.createdAt || now).toLocaleDateString("vi-VN"),
          actor: student.studentName,
          summary: `Kế hoạch 7 ngày: ${String(u.sevenDayAction || u.barriers || "Mở khóa rào cản").slice(0, 65)}`
        })),
        ...actionItems.slice(0, 2).map((a: any) => ({
          date: new Date(a.updatedAt || a.createdAt || now).toLocaleDateString("vi-VN"),
          actor: homeroomTeacherName,
          summary: `Giao hành động: ${String(a.description || "").slice(0, 65)}`
        }))
      ],
      deepLink: `${baseDeepLink}&tab=unlocks`
    },
    {
      ...ADVISORY_JOURNEY_STAGES[4],
      status: stage5Status,
      completedAt:
        stage5Done && consultationLogs[0]?.meetingDate
          ? new Date(consultationLogs[0].meetingDate).toISOString()
          : null,
      responsiblePerson:
        assignedGvbmTasks.length > 0
          ? `GVBM (${assignedGvbmTasks.map((t: any) => t.subjectName).join(", ")})`
          : homeroomTeacherName,
      deadline:
        overdueGvbmTasks[0]?.dueDate ||
        overdueActions[0]?.deadline ||
        ADVISORY_JOURNEY_STAGES[4].defaultDeadlineLabel,
      deadlineDate: overdueGvbmTasks[0]?.dueDate || overdueActions[0]?.deadline || null,
      progressText: `${consultationLogs.length} phiên 1:1 • ${trackingLogs.length} lượt check-in • ${gvbmTasks.length} phân công GVBM`,
      blockers: [
        ...(pendingHelpRequests.length > 0
          ? [`Có ${pendingHelpRequests.length} yêu cầu SOS từ học sinh cần phản hồi ngay`]
          : []),
        ...(overdueGvbmTasks.length > 0
          ? [`Có ${overdueGvbmTasks.length} nhiệm vụ phân công GVBM đã quá hạn phản hồi`]
          : assignedGvbmTasks.length > 0
          ? [`Đang chờ ${assignedGvbmTasks.length} GVBM phản hồi tư vấn bộ môn`]
          : []),
        ...(overdueActions.length > 0
          ? [`Có ${overdueActions.length} hành động hỗ trợ đã đến hạn cần cập nhật kết quả`]
          : []),
        ...(consultationLogs.length === 0
          ? ["Chưa thực hiện phiên tư vấn 1:1 nào trong học kỳ"]
          : [])
      ],
      historyItems: [
        ...consultationLogs.slice(0, 3).map((c: any) => ({
          date: new Date(c.meetingDate || c.createdAt || now).toLocaleDateString("vi-VN"),
          actor: c.teacher?.teacherName || homeroomTeacherName,
          summary: `Phiên tư vấn 1:1: ${String(c.content || "").slice(0, 70)}`
        })),
        ...gvbmTasks.slice(0, 2).map((t: any) => ({
          date: new Date(t.updatedAt || t.createdAt || now).toLocaleDateString("vi-VN"),
          actor: t.assignedToTeacherName || `GVBM ${t.subjectName}`,
          summary: `Hỗ trợ môn ${t.subjectName}: Trạng thái ${t.status}`
        }))
      ],
      deepLink: `${baseDeepLink}&tab=consultations`
    },
    {
      ...ADVISORY_JOURNEY_STAGES[5],
      status: stage6Status,
      completedAt: stage6Done ? new Date().toISOString() : null,
      responsiblePerson: homeroomTeacherName,
      deadline: ADVISORY_JOURNEY_STAGES[5].defaultDeadlineLabel,
      deadlineDate: null,
      progressText: `${reflections.length} tự phản tư • ${respondedGvbmTasks.length} GVBM chờ duyệt • ${pendingParentExchanges.length} tin nhắn PHHS`,
      blockers: [
        ...(respondedGvbmTasks.length > 0
          ? [`Có ${respondedGvbmTasks.length} phản hồi tư vấn từ GVBM chờ CVHT rà soát & công bố cho PHHS`]
          : []),
        ...(pendingAdjustmentRequests.length > 0
          ? [`Có ${pendingAdjustmentRequests.length} yêu cầu xin mở khóa điều chỉnh mục tiêu từ học sinh`]
          : []),
        ...(pendingParentExchanges.length > 0
          ? [`Có ${pendingParentExchanges.length} ý kiến trao đổi từ Phụ huynh đang chờ phản hồi`]
          : [])
      ],
      historyItems: [
        ...reflections.slice(0, 2).map((r: any) => ({
          date: new Date(r.createdAt || now).toLocaleDateString("vi-VN"),
          actor: student.studentName,
          summary: `Tự phản tư: ${String(r.progressMade || r.obstacles || "Cập nhật nhật ký").slice(0, 65)}`
        })),
        ...parentExchanges.slice(0, 2).map((ex: any) => ({
          date: new Date(ex.createdAt || now).toLocaleDateString("vi-VN"),
          actor: ex.parentName || "Phụ huynh",
          summary: `Trao đổi gia đình: ${String(ex.message || "").slice(0, 65)}`
        }))
      ],
      deepLink:
        pendingAdjustmentRequests.length > 0
          ? `${baseDeepLink}&tab=requests`
          : `${baseDeepLink}&tab=tracking`
    },
    {
      ...ADVISORY_JOURNEY_STAGES[6],
      status: stage7Status,
      completedAt:
        isRubricComplete && currentTermEval?.updatedAt
          ? new Date(currentTermEval.updatedAt).toISOString()
          : null,
      responsiblePerson: homeroomTeacherName,
      deadline: `Cuối ${term}`,
      deadlineDate: null,
      progressText: isRubricComplete
        ? `Đã hoàn thành Rubric ${term} (${currentTermEval.goalCompletionLevel}-${currentTermEval.initiativeLevel}-${currentTermEval.participationAttitude}/5)`
        : `Chưa hoàn thiện đánh giá Rubric ${term}`,
      blockers: !isRubricComplete
        ? [`Cần chấm đủ 3 tiêu chí Rubric và nhập nhận xét tổng kết ${term}`]
        : [],
      historyItems: currentTermEval
        ? [
            {
              date: new Date(currentTermEval.updatedAt || currentTermEval.createdAt || now).toLocaleDateString("vi-VN"),
              actor: currentTermEval.evaluatorName || homeroomTeacherName,
              summary: `Đánh giá Rubric ${term}: Mức đạt ${currentTermEval.goalCompletionLevel}/5 • Chủ động ${currentTermEval.initiativeLevel}/5 • Tham gia ${currentTermEval.participationAttitude}/5`
            }
          ]
        : [],
      deepLink: `${baseDeepLink}&tab=rubric_eval`
    },
    {
      ...ADVISORY_JOURNEY_STAGES[7],
      status: stage8Status,
      completedAt:
        stage8Done && journeyState?.publishedAt
          ? new Date(journeyState.publishedAt).toISOString()
          : null,
      responsiblePerson:
        rubricApprovalStatus === "PENDING_APPROVAL"
          ? "BGH / Tổ trưởng / CVHT duyệt"
          : homeroomTeacherName,
      deadline: `Tổng kết ${term}`,
      deadlineDate: null,
      progressText: stage8Done
        ? `Đã duyệt & công bố cho PHHS${nextTermPrepared ? " • Đã sẵn sàng kỳ mới" : ""}`
        : isRubricComplete
        ? rubricApprovalStatus === "APPROVED"
          ? "Đã duyệt • Chờ công bố cho PHHS"
          : "Chờ xác nhận duyệt kết quả đánh giá kỳ"
        : "Chờ hoàn thành Bước 7 (Đánh giá Rubric)",
      blockers: !isRubricComplete
        ? ["Cần hoàn thành Bước 7 (Đánh giá Rubric) trước khi duyệt & công bố"]
        : rubricApprovalStatus !== "APPROVED"
        ? ["Kết quả đánh giá kỳ chưa được xác nhận duyệt"]
        : !isPublishedToParent
        ? ["Đã duyệt nhưng chưa công bố báo cáo tổng kết kỳ cho PHHS"]
        : [],
      historyItems: [
        ...(journeyState?.approvedAt
          ? [
              {
                date: new Date(journeyState.approvedAt).toLocaleDateString("vi-VN"),
                actor: journeyState.approvedByName || homeroomTeacherName,
                summary: `Đã duyệt kết quả đánh giá tổng kết ${term}`
              }
            ]
          : []),
        ...(journeyState?.publishedAt
          ? [
              {
                date: new Date(journeyState.publishedAt).toLocaleDateString("vi-VN"),
                actor: journeyState.updatedByName || homeroomTeacherName,
                summary: `Đã công bố kết quả đánh giá ${term} tới Cổng Phụ huynh`
              }
            ]
          : [])
      ],
      deepLink: `${baseDeepLink}&tab=journey`
    }
  ]

  // ===========================================================================
  // DYNAMIC FOLLOW-UP LOOPS (MỤC 3: THEO DÕI → TƯ VẤN → HỖ TRỢ → RÀ SOÁT → ĐIỀU CHỈNH)
  // ===========================================================================
  const dynamicLoops: DynamicFollowUpLoopItem[] = []
  let loopSeq = 1

  for (const c of consultationLogs) {
    dynamicLoops.push({
      loopNumber: loopSeq++,
      type: "CONSULTATION_1ON1",
      title: `Phiên tư vấn 1:1 (${new Date(c.meetingDate || c.createdAt || now).toLocaleDateString("vi-VN")})`,
      subtitle:
        c.content || c.nextActions || "Trao đổi tiến độ mục tiêu và tháo gỡ khó khăn học tập",
      actor: c.teacher?.teacherName || homeroomTeacherName,
      date: c.meetingDate || c.createdAt || now.toISOString(),
      deadline: c.deadline || null,
      status:
        c.sessionStatus === "FOLLOW_UP_NEEDED"
          ? "IN_PROGRESS"
          : "COMPLETED",
      badgeText: c.shareWithParent !== false ? "Đã chia sẻ PHHS" : "Nội bộ CVHT",
      targetTab: "consultations"
    })
  }

  for (const t of gvbmTasks) {
    const isOverdue =
      t.status === "ASSIGNED" && t.dueDate && new Date(t.dueDate).getTime() < now.getTime()
    dynamicLoops.push({
      loopNumber: loopSeq++,
      type: "GVBM_SUPPORT",
      title: `Phối hợp GVBM môn ${t.subjectName}: ${t.assignedToTeacherName || "GVBM"}`,
      subtitle:
        t.gvbmProfessionalAssessment ||
        t.supportGoal ||
        t.consultationPrompt ||
        "Hỗ trợ cải thiện kết quả môn học",
      actor: t.assignedToTeacherName || "GVBM",
      date: t.updatedAt || t.createdAt || now.toISOString(),
      deadline: t.dueDate || null,
      status: isOverdue
        ? "OVERDUE"
        : t.status === "ASSIGNED"
        ? "WAITING"
        : t.status === "RESPONDED"
        ? "IN_PROGRESS"
        : "COMPLETED",
      badgeText:
        t.status === "ASSIGNED"
          ? "Chờ GVBM phản hồi"
          : t.status === "RESPONDED"
          ? "Chờ CVHT duyệt"
          : "Đã công bố PHHS",
      targetTab: "tracking"
    })
  }

  for (const a of actionItems) {
    const isDone = a.status === "COMPLETED" || a.status === "DONE"
    const isOverdue =
      !isDone && a.deadline && new Date(a.deadline).getTime() < now.getTime()
    dynamicLoops.push({
      loopNumber: loopSeq++,
      type: "ACTION_7DAY",
      title: `Hành động hỗ trợ: ${String(a.description || "Kế hoạch hành động").slice(0, 68)}`,
      subtitle: a.evidenceNotes || "Theo dõi thực hiện hành động cam kết sau tư vấn",
      actor: student.studentName,
      date: a.updatedAt || a.createdAt || now.toISOString(),
      deadline: a.deadline || null,
      status: isDone ? "COMPLETED" : isOverdue ? "OVERDUE" : "IN_PROGRESS",
      badgeText: isDone ? "Đã hoàn thành" : isOverdue ? "Quá hạn" : "Đang thực hiện",
      targetTab: "dashboard"
    })
  }

  const loopCount = Math.max(
    Number(journeyState?.currentLoopIndex || 1),
    consultationLogs.length + (gvbmTasks.length > 0 ? 1 : 0)
  )

  // ===========================================================================
  // RULE-BASED NEXT BEST ACTION ENGINE (MỤC 4) & WORK QUEUE ITEMS (MỤC 5)
  // ===========================================================================
  const workItems: AdvisoryWorkQueueItem[] = []
  const smartReminders: SmartAdvisoryReminder[] = []

  const pushWorkItem = (item: Omit<AdvisoryWorkQueueItem, "id" | "studentId" | "studentCode" | "studentName" | "classId" | "className" | "gradeLevel" | "term">) => {
    workItems.push({
      id: `wq_${student.id}_${item.stageCode}_${workItems.length + 1}`,
      studentId: student.id,
      studentCode: student.studentCode,
      studentName: student.studentName,
      classId: student.classId,
      className: student.className,
      gradeLevel: student.gradeLevel,
      term,
      ...item
    })
  }

  // Rule 0: Urgent SOS Help Request from Student
  if (pendingHelpRequests.length > 0) {
    const req = pendingHelpRequests[0]
    pushWorkItem({
      stageNumber: 5,
      stageCode: "STAGE_5_MONITOR_SUPPORT",
      stageShortName: "Theo dõi & Hỗ trợ",
      taskTitle: `Phản hồi yêu cầu hỗ trợ SOS từ học sinh`,
      reason: `Học sinh gửi yêu cầu trợ giúp: "${String(req.content || req.topic || "Cần hỗ trợ").slice(0, 80)}"`,
      dataSource: "Yêu cầu SOS của Học sinh (StudentHelpRequest)",
      priority: "URGENT",
      responsibleRole: "GVCN",
      responsibleName: homeroomTeacherName,
      deadlineLabel: "Hôm nay (Khẩn cấp)",
      deadlineDate: now.toISOString(),
      status: "OVERDUE",
      targetTab: "sos",
      actionMode: "OPEN_TAB",
      deepLink: `${baseDeepLink}&tab=sos`
    })

    smartReminders.push({
      id: `rem_sos_${req.id}`,
      category: "STUDENT_FEEDBACK",
      categoryLabel: "Có tín hiệu SOS từ học sinh",
      severity: "URGENT",
      studentId: student.id,
      studentName: student.studentName,
      className: student.className,
      title: `Học sinh ${student.studentName} gửi yêu cầu hỗ trợ SOS`,
      message: String(req.content || "Cần GVCN liên hệ trao đổi và hỗ trợ kịp thời."),
      targetTab: "sos",
      deepLink: `${baseDeepLink}&tab=sos`,
      createdAt: req.createdAt || now.toISOString()
    })
  }

  // Rule 1: Chưa có hồ sơ mục tiêu SMART
  if (validGoals.length === 0) {
    pushWorkItem({
      stageNumber: 3,
      stageCode: "STAGE_3_SMART_GOALS",
      stageShortName: "Mục tiêu SMART",
      taskTitle: "Yêu cầu & hướng dẫn học sinh khởi tạo Phiếu Mục tiêu SMART",
      reason: "Học sinh chưa có mục tiêu SMART nào được lưu trên hệ thống trong năm học này.",
      dataSource: "Sổ Mục tiêu Năm học (StudentGoal = 0)",
      priority: "HIGH",
      responsibleRole: "GVCN",
      responsibleName: `${homeroomTeacherName} → ${student.studentName}`,
      deadlineLabel: "Trong tuần này",
      deadlineDate: null,
      status: "NOT_STARTED",
      targetTab: "tracking",
      actionMode: "OPEN_TAB",
      deepLink: `${baseDeepLink}&tab=tracking`
    })
  } else if (signedGoals.length === 0) {
    // Rule 1B: Học sinh đã nộp mục tiêu nhưng CVHT chưa xác nhận
    pushWorkItem({
      stageNumber: 3,
      stageCode: "STAGE_3_SMART_GOALS",
      stageShortName: "Mục tiêu SMART",
      taskTitle: `Rà soát, nhận xét & ký xác nhận ${validGoals.length} mục tiêu SMART`,
      reason: `Học sinh đã nộp ${validGoals.length} mục tiêu SMART và đang chờ GVCN/CVHT thẩm định, ký xác nhận.`,
      dataSource: `Phiếu Mục tiêu Năm học (${validGoals.length} mục tiêu chờ duyệt)`,
      priority: "HIGH",
      responsibleRole: "GVCN",
      responsibleName: homeroomTeacherName,
      deadlineLabel: "Trong 3 ngày",
      deadlineDate: null,
      status: "WAITING_APPROVAL",
      targetTab: "tracking",
      actionMode: "OPEN_TAB",
      deepLink: `${baseDeepLink}&tab=tracking`
    })

    smartReminders.push({
      id: `rem_goalsign_${student.id}`,
      category: "WAITING_APPROVAL",
      categoryLabel: "Có mục tiêu chờ duyệt",
      severity: "HIGH",
      studentId: student.id,
      studentName: student.studentName,
      className: student.className,
      title: `Duyệt phiếu mục tiêu SMART của ${student.studentName}`,
      message: `${student.studentName} đã gửi ${validGoals.length} mục tiêu năm học chờ GVCN nhận xét và ký xác nhận.`,
      targetTab: "tracking",
      deepLink: `${baseDeepLink}&tab=tracking`,
      createdAt: validGoals[0]?.createdAt || now.toISOString()
    })
  }

  // Rule 2: Có mục tiêu nhưng chưa có kế hoạch hành động
  if (validGoals.length > 0 && !hasActionPlan) {
    pushWorkItem({
      stageNumber: 4,
      stageCode: "STAGE_4_ACTION_PLAN",
      stageShortName: "Kế hoạch hành động",
      taskTitle: "Đề nghị lập kế hoạch hành động cụ thể & Sprint 7 ngày",
      reason: "Học sinh đã có mục tiêu SMART nhưng chưa có kế hoạch hành động chi tiết hoặc Sprint 7 ngày.",
      dataSource: "Kế hoạch hành động (StudentGoalAction / StudentGoalUnlock = 0)",
      priority: "NORMAL",
      responsibleRole: "GVCN",
      responsibleName: `${homeroomTeacherName} & ${student.studentName}`,
      deadlineLabel: "Trong tuần",
      deadlineDate: null,
      status: "NOT_STARTED",
      targetTab: "unlocks",
      actionMode: "OPEN_TAB",
      deepLink: `${baseDeepLink}&tab=unlocks`
    })
  }

  // Rule 3: Có yêu cầu mở phiếu điều chỉnh mục tiêu chờ duyệt
  if (pendingAdjustmentRequests.length > 0) {
    const req = pendingAdjustmentRequests[0]
    pushWorkItem({
      stageNumber: 6,
      stageCode: "STAGE_6_REVIEW_ADJUST",
      stageShortName: "Rà soát & Điều chỉnh",
      taskTitle: "Phê duyệt yêu cầu mở khóa điều chỉnh Phiếu Mục tiêu",
      reason: `Học sinh gửi đề nghị điều chỉnh mục tiêu: "${String(req.reason || "").slice(0, 75)}"`,
      dataSource: "Yêu cầu mở phiếu (GoalAdjustmentRequest)",
      priority: "HIGH",
      responsibleRole: "GVCN",
      responsibleName: homeroomTeacherName,
      deadlineLabel: "Trong 48 giờ",
      deadlineDate: null,
      status: "WAITING_APPROVAL",
      targetTab: "requests",
      actionMode: "OPEN_TAB",
      deepLink: `${baseDeepLink}&tab=requests`
    })

    smartReminders.push({
      id: `rem_adj_${req.id}`,
      category: "WAITING_APPROVAL",
      categoryLabel: "Có yêu cầu mở phiếu",
      severity: "HIGH",
      studentId: student.id,
      studentName: student.studentName,
      className: student.className,
      title: `${student.studentName} xin mở khóa điều chỉnh mục tiêu`,
      message: `Lý do: "${String(req.reason || "").slice(0, 90)}"`,
      targetTab: "requests",
      deepLink: `${baseDeepLink}&tab=requests`,
      createdAt: req.createdAt || now.toISOString()
    })
  }

  // Rule 4A: Có phản hồi từ GVBM chờ CVHT rà soát & công bố cho PHHS
  if (respondedGvbmTasks.length > 0) {
    const t = respondedGvbmTasks[0]
    pushWorkItem({
      stageNumber: 6,
      stageCode: "STAGE_6_REVIEW_ADJUST",
      stageShortName: "Rà soát & Điều chỉnh",
      taskTitle: `Rà soát phản hồi GVBM môn ${t.subjectName} & công bố cho PHHS`,
      reason: `GVBM ${t.assignedToTeacherName || t.subjectName} đã gửi nhận định chuyên môn và hướng dẫn phối hợp gia đình.`,
      dataSource: `Phân công GVBM hỗ trợ (${respondedGvbmTasks.length} môn đã phản hồi)`,
      priority: "HIGH",
      responsibleRole: "GVCN",
      responsibleName: homeroomTeacherName,
      deadlineLabel: "Hôm nay",
      deadlineDate: now.toISOString(),
      status: "WAITING_APPROVAL",
      targetTab: "tracking",
      actionMode: "OPEN_TAB",
      deepLink: `${baseDeepLink}&tab=tracking`
    })

    smartReminders.push({
      id: `rem_gvbm_resp_${t.id}`,
      category: "GVBM_RESPONDED",
      categoryLabel: "Có phản hồi GVBM",
      severity: "HIGH",
      studentId: student.id,
      studentName: student.studentName,
      className: student.className,
      title: `GVBM môn ${t.subjectName} đã phản hồi tư vấn cho ${student.studentName}`,
      message: `GV ${t.assignedToTeacherName || ""} đã hoàn thành nhận định chuyên môn. Mời GVCN rà soát và công bố cho PHHS.`,
      targetTab: "tracking",
      deepLink: `${baseDeepLink}&tab=tracking`,
      createdAt: t.gvbmRespondedAt || t.updatedAt || now.toISOString()
    })
  }

  // Rule 4B: Có yêu cầu GVBM chưa phản hồi -> Nhắc giáo viên được giao
  if (assignedGvbmTasks.length > 0) {
    const t = assignedGvbmTasks[0]
    const isTaskOverdue =
      t.dueDate && !isNaN(new Date(t.dueDate).getTime()) && new Date(t.dueDate).getTime() < now.getTime()
    pushWorkItem({
      stageNumber: 5,
      stageCode: "STAGE_5_MONITOR_SUPPORT",
      stageShortName: "Theo dõi & Hỗ trợ",
      taskTitle: `Theo dõi & nhắc GVBM môn ${t.subjectName} phản hồi hỗ trợ học sinh`,
      reason: `Đã phân công GVBM ${t.assignedToTeacherName || t.subjectName} hỗ trợ mục tiêu "${String(t.supportGoal || "").slice(0, 65)}".`,
      dataSource: `Nhiệm vụ GVBM (${assignedGvbmTasks.length} môn đang chờ GVBM)`,
      priority: isTaskOverdue ? "URGENT" : "HIGH",
      responsibleRole: "GVBM",
      responsibleName: t.assignedToTeacherName || `GVBM ${t.subjectName}`,
      deadlineLabel: t.dueDate
        ? new Date(t.dueDate).toLocaleDateString("vi-VN")
        : "Theo hạn phân công",
      deadlineDate: t.dueDate || null,
      status: isTaskOverdue ? "OVERDUE" : "WAITING_GVBM",
      targetTab: "tracking",
      actionMode: "OPEN_TAB",
      deepLink: `${baseDeepLink}&tab=tracking`
    })

    if (isTaskOverdue) {
      smartReminders.push({
        id: `rem_gvbm_overdue_${t.id}`,
        category: "OVERDUE",
        categoryLabel: "Quá hạn phản hồi GVBM",
        severity: "URGENT",
        studentId: student.id,
        studentName: student.studentName,
        className: student.className,
        title: `Quá hạn phản hồi tư vấn môn ${t.subjectName} (${student.studentName})`,
        message: `Nhiệm vụ hỗ trợ môn ${t.subjectName} giao cho GV ${t.assignedToTeacherName || ""} đã quá hạn.`,
        targetTab: "tracking",
        deepLink: `${baseDeepLink}&tab=tracking`,
        createdAt: t.dueDate || now.toISOString()
      })
    }
  }

  // Rule 5: Có hành động hỗ trợ đã đến hạn / quá hạn -> Yêu cầu cập nhật kết quả
  if (overdueActions.length > 0 || dueSoonActions.length > 0) {
    const act = overdueActions[0] || dueSoonActions[0]
    const isActOverdue = overdueActions.length > 0
    pushWorkItem({
      stageNumber: 5,
      stageCode: "STAGE_5_MONITOR_SUPPORT",
      stageShortName: "Theo dõi & Hỗ trợ",
      taskTitle: `Cập nhật kết quả hành động hỗ trợ (${isActOverdue ? "Đã quá hạn" : "Sắp đến hạn"})`,
      reason: `Hành động "${String(act.description || "").slice(0, 75)}" đến hạn cần kiểm tra minh chứng và cập nhật trạng thái.`,
      dataSource: "Nhật ký Hành động sau tư vấn (StudentGoalAction)",
      priority: isActOverdue ? "URGENT" : "HIGH",
      responsibleRole: "GVCN",
      responsibleName: `${homeroomTeacherName} & ${student.studentName}`,
      deadlineLabel: act.deadline
        ? new Date(act.deadline).toLocaleDateString("vi-VN")
        : "Đã đến hạn",
      deadlineDate: act.deadline || null,
      status: isActOverdue ? "OVERDUE" : "IN_PROGRESS",
      targetTab: "dashboard",
      actionMode: "OPEN_TAB",
      deepLink: `${baseDeepLink}&tab=dashboard`
    })

    smartReminders.push({
      id: `rem_act_${act.id}`,
      category: isActOverdue ? "OVERDUE" : "DUE_SOON",
      categoryLabel: isActOverdue ? "Đã quá hạn" : "Sắp đến hạn",
      severity: isActOverdue ? "URGENT" : "HIGH",
      studentId: student.id,
      studentName: student.studentName,
      className: student.className,
      title: `${isActOverdue ? "[Quá hạn]" : "[Sắp đến hạn]"} Hành động hỗ trợ của ${student.studentName}`,
      message: `Hành động: "${String(act.description || "").slice(0, 80)}"`,
      targetTab: "dashboard",
      deepLink: `${baseDeepLink}&tab=dashboard`,
      createdAt: act.deadline || now.toISOString()
    })
  }

  // Rule 6: Mục tiêu chậm tiến độ (Đỏ / Vàng) hoặc chưa có phiên tư vấn 1:1 -> Đề nghị rà soát và tư vấn
  if (statusColor === "RED" || statusColor === "YELLOW" || consultationLogs.length === 0) {
    const needUrgentConsult = statusColor === "RED" && consultationLogs.length === 0
    pushWorkItem({
      stageNumber: 5,
      stageCode: "STAGE_5_MONITOR_SUPPORT",
      stageShortName: "Theo dõi & Hỗ trợ",
      taskTitle:
        statusColor === "RED"
          ? "Tổ chức phiên tư vấn 1:1 khẩn & lập kế hoạch tháo gỡ khó khăn"
          : statusColor === "YELLOW"
          ? "Rà soát mục tiêu chậm tiến độ & thực hiện tư vấn 1:1"
          : "Thực hiện phiên tư vấn 1:1 định kỳ cùng học sinh",
      reason:
        statusColor === "RED"
          ? `Học sinh đang ở mức cảnh báo ĐỎ (${statusRecord?.reasonDetail || "Mục tiêu chậm tiến độ / dưới chuẩn"}).`
          : statusColor === "YELLOW"
          ? `Học sinh đang ở mức lưu ý VÀNG (${statusRecord?.reasonDetail || "Cần rà soát tiến độ học tập"}).`
          : "Học sinh chưa có biên bản tư vấn 1:1 trong học kỳ hiện tại.",
      dataSource:
        statusColor !== "GREEN"
          ? `Tín hiệu theo dõi (${statusColor}) & Nhật ký tư vấn (${consultationLogs.length} buổi)`
          : `Nhật ký tư vấn 1:1 (${consultationLogs.length} buổi)`,
      priority: needUrgentConsult || statusColor === "RED" ? "URGENT" : statusColor === "YELLOW" ? "HIGH" : "NORMAL",
      responsibleRole: "GVCN",
      responsibleName: homeroomTeacherName,
      deadlineLabel: statusColor === "RED" ? "Trong 48 giờ" : "Trong tuần",
      deadlineDate: null,
      status: consultationLogs.length > 0 ? "IN_PROGRESS" : "NOT_STARTED",
      targetTab: "consultations",
      actionMode: "OPEN_CONSULTATION_MODAL",
      deepLink: `${baseDeepLink}&tab=consultations`
    })

    if (trackingLogs.length === 0 && validGoals.length > 0) {
      smartReminders.push({
        id: `rem_unupdated_${student.id}`,
        category: "UNUPDATED_PROGRESS",
        categoryLabel: "Chưa cập nhật tiến độ",
        severity: statusColor === "RED" ? "URGENT" : "NORMAL",
        studentId: student.id,
        studentName: student.studentName,
        className: student.className,
        title: `Chưa cập nhật tiến độ mốc kiểm tra cho ${student.studentName}`,
        message: `Học sinh đã có ${validGoals.length} mục tiêu nhưng chưa được ghi nhận đánh giá tiến độ mốc kiểm tra.`,
        targetTab: "tracking",
        deepLink: `${baseDeepLink}&tab=tracking`,
        createdAt: now.toISOString()
      })
    }
  }

  // Rule 6B: Có phản hồi từ Phụ huynh hoặc Học sinh tự phản tư chưa được GVCN phản hồi
  if (pendingParentExchanges.length > 0) {
    const ex = pendingParentExchanges[0]
    pushWorkItem({
      stageNumber: 6,
      stageCode: "STAGE_6_REVIEW_ADJUST",
      stageShortName: "Rà soát & Điều chỉnh",
      taskTitle: "Phản hồi ý kiến trao đổi & đồng hành của Phụ huynh",
      reason: `Phụ huynh gửi lời nhắn: "${String(ex.message || "").slice(0, 75)}"`,
      dataSource: "Kênh Phối hợp Gia đình ⇄ CVHT (ParentAdvisorExchange)",
      priority: "HIGH",
      responsibleRole: "GVCN",
      responsibleName: homeroomTeacherName,
      deadlineLabel: "Trong 24 giờ",
      deadlineDate: null,
      status: "IN_PROGRESS",
      targetTab: "tracking",
      actionMode: "OPEN_TAB",
      deepLink: `${baseDeepLink}&tab=tracking`
    })
  }

  const unreviewedReflections = reflections.filter((r: any) => !r?.teacherFeedback)
  if (unreviewedReflections.length > 0) {
    const r = unreviewedReflections[0]
    smartReminders.push({
      id: `rem_refl_${r.id}`,
      category: "STUDENT_FEEDBACK",
      categoryLabel: "Có phản hồi học sinh",
      severity: "NORMAL",
      studentId: student.id,
      studentName: student.studentName,
      className: student.className,
      title: `Học sinh ${student.studentName} đã gửi nhật ký tự phản tư mới`,
      message: `Nội dung: "${String(r.progressMade || r.obstacles || "Nhật ký phản tư").slice(0, 80)}"`,
      targetTab: "tracking",
      deepLink: `${baseDeepLink}&tab=tracking`,
      createdAt: r.createdAt || now.toISOString()
    })
  }

  // Rule 7: Đến cuối kỳ nhưng thiếu Rubric -> Nhắc hoàn thiện đánh giá
  if (!isRubricComplete) {
    pushWorkItem({
      stageNumber: 7,
      stageCode: "STAGE_7_RUBRIC_EVAL",
      stageShortName: "Đánh giá Rubric kỳ",
      taskTitle: `Hoàn thiện phiếu Đánh giá tổng kết ${term} theo Rubric`,
      reason: `Hồ sơ của học sinh chưa được chấm đủ 3 tiêu chí Rubric và nhận xét tổng kết ${term}.`,
      dataSource: `Bảng Đánh giá định kỳ theo Rubric (${term})`,
      priority: validGoals.length > 0 && consultationLogs.length > 0 ? "HIGH" : "NORMAL",
      responsibleRole: "GVCN",
      responsibleName: homeroomTeacherName,
      deadlineLabel: `Cuối ${term}`,
      deadlineDate: null,
      status: currentTermEval ? "IN_PROGRESS" : "NOT_STARTED",
      targetTab: "rubric_eval",
      actionMode: "OPEN_TAB",
      deepLink: `${baseDeepLink}&tab=rubric_eval`
    })

    if (validGoals.length > 0 && consultationLogs.length > 0) {
      smartReminders.push({
        id: `rem_rubric_${student.id}_${term}`,
        category: "RUBRIC_NEEDED",
        categoryLabel: "Phiếu đánh giá cần hoàn thiện",
        severity: "NORMAL",
        studentId: student.id,
        studentName: student.studentName,
        className: student.className,
        title: `Hoàn thiện đánh giá Rubric ${term} cho ${student.studentName}`,
        message: `Học sinh đã hoàn thành mục tiêu và tư vấn 1:1, sẵn sàng chấm phiếu Rubric tổng kết ${term}.`,
        targetTab: "rubric_eval",
        deepLink: `${baseDeepLink}&tab=rubric_eval`,
        createdAt: now.toISOString()
      })
    }
  } else if (rubricApprovalStatus !== "APPROVED") {
    // Rule 8: Đánh giá đã hoàn thành nhưng chưa duyệt -> Chuyển người duyệt
    pushWorkItem({
      stageNumber: 8,
      stageCode: "STAGE_8_APPROVE_PUBLISH",
      stageShortName: "Duyệt & Công bố",
      taskTitle: `Xác nhận duyệt kết quả Đánh giá tổng kết ${term}`,
      reason: `Phiếu đánh giá Rubric ${term} đã chấm xong 3 tiêu chí nhưng chưa được xác nhận duyệt chính thức.`,
      dataSource: `Trạng thái phê duyệt kỳ ${term} (${rubricApprovalStatus})`,
      priority: "HIGH",
      responsibleRole: "GVCN",
      responsibleName: homeroomTeacherName,
      deadlineLabel: `Tổng kết ${term}`,
      deadlineDate: null,
      status: "WAITING_APPROVAL",
      targetTab: "journey",
      actionMode: "APPROVE_RUBRIC",
      deepLink: `${baseDeepLink}&tab=journey`
    })

    smartReminders.push({
      id: `rem_approve_eval_${student.id}_${term}`,
      category: "WAITING_APPROVAL",
      categoryLabel: "Có kết quả chờ duyệt",
      severity: "HIGH",
      studentId: student.id,
      studentName: student.studentName,
      className: student.className,
      title: `Kết quả đánh giá ${term} của ${student.studentName} đang chờ duyệt`,
      message: `Phiếu Rubric ${term} đã hoàn tất, vui lòng kiểm tra và xác nhận duyệt.`,
      targetTab: "journey",
      deepLink: `${baseDeepLink}&tab=journey`,
      createdAt: currentTermEval?.updatedAt || now.toISOString()
    })
  } else if (!isPublishedToParent) {
    // Rule 9: Đã duyệt nhưng chưa công bố -> Nhắc công bố theo quy định
    pushWorkItem({
      stageNumber: 8,
      stageCode: "STAGE_8_APPROVE_PUBLISH",
      stageShortName: "Duyệt & Công bố",
      taskTitle: `Công bố kết quả đánh giá Cố vấn học tập ${term} cho PHHS`,
      reason: `Kết quả đánh giá ${term} đã được duyệt nhưng chưa công bố chính thức sang Cổng Phụ huynh.`,
      dataSource: `Trạng thái công bố kỳ ${term} (isPublishedToParent = false)`,
      priority: "HIGH",
      responsibleRole: "GVCN",
      responsibleName: homeroomTeacherName,
      deadlineLabel: "Ngay sau khi duyệt",
      deadlineDate: null,
      status: "IN_PROGRESS",
      targetTab: "journey",
      actionMode: "PUBLISH_RUBRIC",
      deepLink: `${baseDeepLink}&tab=journey`
    })
  } else {
    // Rule 10: Đã công bố -> Đề nghị chuẩn bị kế hoạch kỳ mới
    pushWorkItem({
      stageNumber: 8,
      stageCode: "STAGE_8_APPROVE_PUBLISH",
      stageShortName: "Duyệt & Công bố",
      taskTitle: nextTermPrepared
        ? `Đã hoàn tất lộ trình ${term} & sẵn sàng cho kỳ mới`
        : `Chuẩn bị kế hoạch cố vấn & định hướng mục tiêu cho kỳ tiếp theo`,
      reason: `Kết quả Cố vấn học tập ${term} đã được duyệt và công bố cho Phụ huynh học sinh.`,
      dataSource: `Hồ sơ tổng kết ${term} (Đã công bố PHHS)`,
      priority: "LOW",
      responsibleRole: "GVCN",
      responsibleName: homeroomTeacherName,
      deadlineLabel: "Đầu kỳ tiếp theo",
      deadlineDate: null,
      status: nextTermPrepared ? "COMPLETED" : "IN_PROGRESS",
      targetTab: "journey",
      actionMode: "PREPARE_NEXT_TERM",
      deepLink: `${baseDeepLink}&tab=journey`
    })
  }

  // Pick the highest priority Next Best Action
  const priorityWeight: Record<JourneyPriority, number> = {
    URGENT: 4,
    HIGH: 3,
    NORMAL: 2,
    LOW: 1
  }

  const sortedWork = [...workItems].sort((a, b) => {
    const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority]
    if (pDiff !== 0) return pDiff
    return a.stageNumber - b.stageNumber
  })

  const topWork = sortedWork[0]
  const nextBestAction: NextBestAction = topWork
    ? {
        ruleCode: `NBA_STAGE_${topWork.stageNumber}`,
        stageNumber: topWork.stageNumber,
        stageCode: topWork.stageCode,
        stageName:
          ADVISORY_JOURNEY_STAGES.find(s => s.code === topWork.stageCode)?.name ||
          topWork.stageShortName,
        title: topWork.taskTitle,
        reason: topWork.reason,
        dataSource: topWork.dataSource,
        responsibleRole: (topWork.responsibleRole as any) || "GVCN",
        responsibleName: topWork.responsibleName,
        deadlineLabel: topWork.deadlineLabel,
        deadlineDate: topWork.deadlineDate,
        priority: topWork.priority,
        status: topWork.status,
        targetTab: topWork.targetTab,
        actionMode: (topWork.actionMode as any) || "OPEN_TAB",
        deepLink: topWork.deepLink
      }
    : {
        ruleCode: "NBA_COMPLETED",
        stageNumber: 8,
        stageCode: "STAGE_8_APPROVE_PUBLISH",
        stageName: ADVISORY_JOURNEY_STAGES[7].name,
        title: "Tiếp tục duy trì theo dõi & chuẩn bị kế hoạch kỳ mới",
        reason: "Học sinh đã hoàn thành đầy đủ các mốc cố vấn học tập trong kỳ hiện tại.",
        dataSource: "Hồ sơ Cố vấn học tập 360°",
        responsibleRole: "GVCN",
        responsibleName: homeroomTeacherName,
        deadlineLabel: "Theo kế hoạch năm học",
        deadlineDate: null,
        priority: "LOW",
        status: "COMPLETED",
        targetTab: "journey",
        actionMode: "OPEN_TAB",
        deepLink: `${baseDeepLink}&tab=journey`
      }

  // Determine current active stage of the student
  const completedStagesCount = stages.filter(s => s.status === "COMPLETED").length
  const overallProgressPercent = Math.round((completedStagesCount / 8) * 100)
  const firstNonCompletedStage =
    stages.find(s => s.status !== "COMPLETED") || stages[stages.length - 1]

  return {
    studentId: student.id,
    studentCode: student.studentCode,
    studentName: student.studentName,
    classId: student.classId,
    className: student.className,
    gradeLevel: student.gradeLevel,
    statusColor,
    term,
    currentStageNumber: firstNonCompletedStage.stepNumber,
    currentStageCode: firstNonCompletedStage.code,
    currentStageName: firstNonCompletedStage.name,
    completedStagesCount,
    overallProgressPercent,
    loopCount,
    stages,
    dynamicLoops,
    nextBestAction,
    workItems,
    smartReminders,
    journeyState: {
      rubricApprovalStatus,
      approvedByName: journeyState?.approvedByName || null,
      approvedAt: journeyState?.approvedAt || null,
      isPublishedToParent,
      publishedAt: journeyState?.publishedAt || null,
      nextTermPrepared,
      currentLoopIndex: loopCount
    }
  }
}
