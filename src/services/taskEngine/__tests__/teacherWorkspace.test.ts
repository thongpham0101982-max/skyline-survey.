import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock Prisma Client & Mailer using vi.hoisted so it is initialized before hoisted vi.mock
const mockPrisma: any = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  teacher: { findFirst: vi.fn(), findUnique: vi.fn() },
  academicYear: { findUnique: vi.fn(), findFirst: vi.fn() },
  class: { findMany: vi.fn() },
  teacherClassAssignment: { findMany: vi.fn() },
  teachingAssignment: { findMany: vi.fn() },
  ctqtTeachingAssignment: { findMany: vi.fn() },
  specialTeachingAssignment: { findMany: vi.fn() },
  learningSupportAssignment: { count: vi.fn() },
  inputAssessmentTeacherAssignment: { count: vi.fn(), findMany: vi.fn() },
  preschoolInputAssessmentTeacherAssignment: { count: vi.fn(), findMany: vi.fn() },
  inputAssessmentSessionExaminer: { count: vi.fn(), findMany: vi.fn() },
  preschoolInputAssessmentSessionExaminer: { count: vi.fn() },
  studentOrientationRecord: { count: vi.fn(), findMany: vi.fn() },
  department: { findMany: vi.fn() },
  division: { findMany: vi.fn() },
  studentApplicant: { findMany: vi.fn() },
  preschoolApplicant: { count: vi.fn() },
  studentSubjectCompetencySummary: { findMany: vi.fn(), count: vi.fn() },
  studentTermSummary: { count: vi.fn() },
  specialGradeEntry: { findMany: vi.fn() },
  student: { count: vi.fn() },
  subjectGradeEntry: { findMany: vi.fn() },
  subjectBenchmarkConfig: { findFirst: vi.fn(), findMany: vi.fn() },
  subjectQuota: { findMany: vi.fn() },
  ctqtGradeEntry: { findMany: vi.fn() },
  surveyPeriod: { findFirst: vi.fn() },
  summaryByClass: { findMany: vi.fn() },
  academicConsultationLog: { findMany: vi.fn() },
  activityRecord: { findMany: vi.fn() },
  observationRegistration: { findMany: vi.fn(), count: vi.fn() },
  observationSlot: { findMany: vi.fn() },
  teacherAcademicYearTarget: { findFirst: vi.fn() },
  studentGoal: { findMany: vi.fn() },
  studentGoalUnlock: { findMany: vi.fn() },
  studentHelpRequest: { findMany: vi.fn() },
  studentAdvisoryStatus: { findMany: vi.fn() },
  learningSupportTarget: { findMany: vi.fn() },
  workTask: { findMany: vi.fn() },
  notification: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  auditLog: { create: vi.fn() },
}))

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}))

vi.mock("@/lib/mail", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: "mock-msg-1" }),
}))

import { resolveTeacherAssignmentProfile } from "../assignmentMapper"
import { aggregateTeacherTasks } from "../index"
import { calculateTeacherProgressAndKPI } from "../kpiRulesEngine"
import {
  evaluateAndDispatchTeacherReminders,
  sanitizeMessageForExternalChannel,
} from "../reminderEngine"
import {
  detectTaskAssistantQuestionType,
  answerTeacherTaskAssistantQuery,
} from "../taskAssistantEngine"

describe("Sổ Giáo Viên & Sky-Line Task Assistant — Comprehensive Verification Suite", () => {
  const now = new Date()

  beforeEach(() => {
    vi.clearAllMocks()

    // Default safe mock implementations for multi-role teacher
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-gv-01",
      name: "Nguyễn Thị Minh Châu",
      email: "chau.ntm@skylineschool.edu.vn",
      role: "TEACHER",
      campus: { id: "campus-hill", campusCode: "HILL", campusName: "Sky-Line Hill" },
      campusAssignments: [
        {
          isPrimary: false,
          campus: { id: "campus-global", campusCode: "GLOBAL", campusName: "Sky-Line Global" },
        },
      ],
      teacher: {
        id: "teacher-01",
        userId: "user-gv-01",
        teacherCode: "GV001",
        teacherName: "Nguyễn Thị Minh Châu",
        email: "chau.ntm@skylineschool.edu.vn",
        homeroomClass: "10A1",
        position: "GVCN, GVBM, TTCM",
        positions: "GVCN,TTCM",
        campus: { id: "campus-hill", campusCode: "HILL", campusName: "Sky-Line Hill" },
        department: { id: "dept-math", departmentName: "Tổ Toán - Tin" },
        division: null,
        departmentAssignments: [
          { role: "TTCM", department: { id: "dept-math", departmentName: "Tổ Toán - Tin" } },
        ],
        divisionAssignments: [],
      },
    })

    mockPrisma.academicYear.findFirst.mockResolvedValue({
      id: "year-2026",
      yearName: "2026-2027",
      isActive: true,
    })

    // Duplicate homeroom entries from both Class.homeroomTeacherId and TeacherClassAssignment to test deduplication
    mockPrisma.class.findMany.mockResolvedValue([
      {
        id: "class-10a1",
        classCode: "10A1",
        className: "10A1",
        grade: "10",
        level: "THPT",
        campusId: "campus-hill",
        educationSystem: "CHAT_LUONG_CAO",
        homeroomTeacherId: "teacher-01,teacher-co-02",
        campus: { id: "campus-hill", campusCode: "HILL", campusName: "Sky-Line Hill" },
        _count: { students: 30 },
      },
    ])

    mockPrisma.teacherClassAssignment.findMany.mockResolvedValue([
      {
        teacherId: "teacher-01",
        roleInClass: "GVCN",
        class: {
          id: "class-10a1",
          classCode: "10A1",
          className: "10A1",
          grade: "10",
          level: "THPT",
          campusId: "campus-hill",
          educationSystem: "CHAT_LUONG_CAO",
          campus: { id: "campus-hill", campusCode: "HILL", campusName: "Sky-Line Hill" },
          _count: { students: 30 },
        },
      },
    ])

    // Duplicate TeachingAssignments to verify composite-key deduplication
    mockPrisma.teachingAssignment.findMany.mockResolvedValue([
      {
        id: "ta-1",
        classId: "class-10a1",
        subjectId: "sub-math",
        periodsPerWeek: 4,
        class: {
          id: "class-10a1",
          classCode: "10A1",
          className: "10A1",
          grade: "10",
          campusId: "campus-hill",
          campus: { id: "campus-hill", campusCode: "HILL", campusName: "Sky-Line Hill" },
        },
        subject: { id: "sub-math", code: "TOAN", name: "Toán học" },
      },
      {
        id: "ta-1-dup",
        classId: "class-10a1",
        subjectId: "sub-math",
        periodsPerWeek: 4,
        class: {
          id: "class-10a1",
          classCode: "10A1",
          className: "10A1",
          grade: "10",
          campusId: "campus-hill",
          campus: { id: "campus-hill", campusCode: "HILL", campusName: "Sky-Line Hill" },
        },
        subject: { id: "sub-math", code: "TOAN", name: "Toán học" },
      },
    ])

    mockPrisma.ctqtTeachingAssignment.findMany.mockResolvedValue([
      {
        id: "ctqt-1",
        classId: "class-10g1",
        subjectId: "sub-igcse-math",
        teacherId: "teacher-other",
        delegatedTeacherId: "teacher-01",
        class: {
          id: "class-10g1",
          className: "10G1",
          grade: "10",
          campusId: "campus-global",
          campus: { id: "campus-global", campusCode: "GLOBAL", campusName: "Sky-Line Global" },
        },
        subject: { id: "sub-igcse-math", code: "IGCSE_MATH", name: "IGCSE Mathematics" },
      },
    ])

    mockPrisma.specialTeachingAssignment.findMany.mockResolvedValue([
      {
        id: "spec-1",
        teacherId: "teacher-01",
        subjectCode: "FIN_EDU",
        grade: "10",
        classId: "class-10a1",
        campusId: "campus-hill",
        educationSystem: "ALL",
        status: "ACTIVE",
        class: { id: "class-10a1", className: "10A1" },
        campus: { id: "campus-hill", campusName: "Sky-Line Hill" },
      },
    ])

    mockPrisma.learningSupportAssignment.count.mockResolvedValue(1)
    mockPrisma.inputAssessmentTeacherAssignment.count.mockResolvedValue(1)
    mockPrisma.preschoolInputAssessmentTeacherAssignment.count.mockResolvedValue(0)
    mockPrisma.inputAssessmentSessionExaminer.count.mockResolvedValue(1)
    mockPrisma.preschoolInputAssessmentSessionExaminer.count.mockResolvedValue(0)
    mockPrisma.studentOrientationRecord.count.mockResolvedValue(1)
    mockPrisma.department.findMany.mockResolvedValue([
      { id: "dept-math", departmentName: "Tổ Toán - Tin", headTeacherId: "teacher-01" },
    ])
    mockPrisma.division.findMany.mockResolvedValue([])

    // Module 1 mocks
    mockPrisma.studentOrientationRecord.findMany.mockResolvedValue([
      {
        id: "orient-1",
        status: "DRAFT",
        psychologyReferralStatus: "NONE",
        interviewerId: "user-gv-01",
        createdAt: now,
        updatedAt: now,
        student: { fullName: "Lê Hoàng Nam", gradeApplying: "10" },
      },
    ])
    mockPrisma.inputAssessmentTeacherAssignment.findMany.mockResolvedValue([
      { id: "ia-1", grade: "10", subjectCode: "TOAN", createdAt: now },
    ])
    mockPrisma.studentApplicant.findMany.mockResolvedValue([
      { id: "app-1", gradeApplying: "10", overallStatus: "PENDING", scores: [] },
    ])
    mockPrisma.preschoolInputAssessmentTeacherAssignment.findMany.mockResolvedValue([])
    mockPrisma.inputAssessmentSessionExaminer.findMany.mockResolvedValue([])

    // Module 2 mocks
    mockPrisma.studentSubjectCompetencySummary.findMany.mockResolvedValue([
      { studentId: "hs-1" },
      { studentId: "hs-2" },
    ])
    mockPrisma.studentSubjectCompetencySummary.count.mockResolvedValue(20)
    mockPrisma.studentTermSummary.count.mockResolvedValue(25)

    // Module 3 mocks (Submitted -> WAITING approval!)
    mockPrisma.specialGradeEntry.findMany.mockResolvedValue([
      { id: "sg-1", status: "SUBMITTED", classId: "class-10a1" },
    ])

    // Module 4 mocks
    mockPrisma.student.count.mockResolvedValue(30)
    mockPrisma.subjectGradeEntry.findMany.mockResolvedValue([
      { studentId: "hs-1", period: "KSDN", compositeScore: 5.0, teacherRemark: "Cần cố gắng" },
      { studentId: "hs-1", period: "GK1", compositeScore: 5.5, teacherRemark: "Có tiến bộ" },
      { studentId: "hs-2", period: "KSDN", compositeScore: 8.0, teacherRemark: "Tốt" },
      { studentId: "hs-2", period: "GK1", compositeScore: 8.5, teacherRemark: "Rất tốt" },
    ])
    mockPrisma.subjectBenchmarkConfig.findFirst.mockResolvedValue({
      grade: "10",
      benchmarkScore: 6.0,
    })
    mockPrisma.subjectBenchmarkConfig.findMany.mockResolvedValue([
      { grade: "10", benchmarkScore: 6.0 },
    ])
    mockPrisma.subjectQuota.findMany.mockResolvedValue([
      { grade: "10", subjectId: "sub-math", passRateTarget: 85 },
    ])
    mockPrisma.ctqtGradeEntry.findMany.mockResolvedValue([
      { status: "PENDING_REVIEW" },
    ])

    // Module 5 mocks
    mockPrisma.surveyPeriod.findFirst.mockResolvedValue({
      id: "sp-1",
      periodName: "Khảo sát NPS HK1",
      startDate: now,
      endDate: new Date(now.getTime() + 5 * 86400000),
    })
    mockPrisma.summaryByClass.findMany.mockResolvedValue([
      {
        id: "sbc-1",
        className: "10A1",
        totalStudents: 30,
        surveyedStudents: 22,
        notSurveyedStudents: 8,
        participationRate: 0.733,
        npsScore: 68.5,
      },
    ])

    // Module 6 mocks
    mockPrisma.academicConsultationLog.findMany.mockResolvedValue([
      {
        id: "log-phhs-1",
        studentId: "hs-1",
        teacherId: "teacher-01",
        difficulties: "[GradePeriod: GK1] Ý KIẾN PHHS: Nhờ cô hướng dẫn thêm phần Hình học cho cháu.",
        content: "",
        nextActions: "",
        createdAt: now,
        student: { studentName: "Trần Bảo Ngọc", classId: "class-10a1", class: { className: "10A1" } },
      },
    ])

    // Module 7 mocks
    mockPrisma.activityRecord.findMany.mockResolvedValue([
      {
        id: "act-1",
        classId: "class-10a1",
        status: "DRAFT",
        createdAt: now,
        updatedAt: now,
        activity: { name: "Ngày hội STEM Sky-Line" },
        class: { className: "10A1" },
        participants: [
          { id: "p1", evalLevelId: "lvl-1", roleId: "r-1" },
          { id: "p2", evalLevelId: null, roleId: null },
        ],
      },
    ])

    // Module 8 mocks
    mockPrisma.observationRegistration.findMany.mockImplementation((args: any) => {
      // If querying valid approved & evaluated this month
      if (args?.where?.isApproved === true) {
        return Promise.resolve([
          {
            id: "reg-valid-1",
            isApproved: true,
            evaluation: { id: "eval-1" },
            slot: { date: now, isDoublePeriod: false },
          },
        ])
      }
      // Otherwise include one valid evaluated slot, one past un-evaluated slot (OVERDUE), and one waiting approval (WAITING)
      return Promise.resolve([
        {
          id: "reg-valid-1",
          slotId: "slot-valid",
          isApproved: true,
          evaluation: { id: "eval-1" },
          createdAt: now,
          slot: {
            id: "slot-valid",
            date: now,
            isDoublePeriod: false,
            startTime: "07:30",
            endTime: "08:15",
            className: "10A1",
            subjectName: "Toán học",
            teacher: { teacherName: "Nguyễn Văn A" },
          },
        },
        {
          id: "reg-overdue-1",
          slotId: "slot-past",
          isApproved: true,
          evaluation: null,
          createdAt: now,
          slot: {
            id: "slot-past",
            date: new Date(now.getTime() - 2 * 86400000),
            startTime: "08:00",
            endTime: "08:45",
            className: "10A2",
            subjectName: "Toán học",
            teacher: { teacherName: "Phạm Văn Hùng" },
          },
        },
        {
          id: "reg-waiting-1",
          slotId: "slot-future",
          isApproved: false,
          evaluation: null,
          createdAt: now,
          slot: {
            id: "slot-future",
            date: new Date(now.getTime() + 2 * 86400000),
            startTime: "09:00",
            endTime: "09:45",
            className: "11A1",
            subjectName: "Toán học",
            teacher: { teacherName: "Lê Thu Hà" },
          },
        },
      ])
    })
    mockPrisma.observationSlot.findMany.mockResolvedValue([])
    mockPrisma.teacherAcademicYearTarget.findFirst.mockResolvedValue({
      id: "target-1",
      requiredObserved: 18,
      requiredTaught: 2,
      status: "CONFIRMED",
      createdAt: now,
    })
    mockPrisma.observationRegistration.count.mockResolvedValue(2)

    // Module 9 mocks
    mockPrisma.studentGoal.findMany.mockResolvedValue([
      {
        id: "goal-1",
        studentId: "hs-1",
        signedByTeacher: false,
        status: "IN_PROGRESS",
        achievementLevel: null,
        generalGoal: "Đạt 8.0 môn Toán HK1",
        createdAt: now,
        student: { studentName: "Trần Bảo Ngọc", classId: "class-10a1", class: { className: "10A1" } },
      },
    ])
    mockPrisma.studentGoalUnlock.findMany.mockResolvedValue([
      {
        id: "unlock-1",
        status: "IN_PROGRESS",
        supportStatus: "PENDING",
        barriers: "Khó khăn bài toán thực tế",
        sevenDayAction: "Làm 5 bài tập mỗi tối",
        createdAt: now,
        goal: {
          studentId: "hs-1",
          student: { studentName: "Trần Bảo Ngọc", classId: "class-10a1", class: { className: "10A1" } },
        },
      },
    ])
    mockPrisma.studentHelpRequest.findMany.mockResolvedValue([
      {
        id: "help-1",
        studentId: "hs-1",
        status: "PENDING",
        urgency: "HIGH",
        content: "Em cần cô giải thích lại định lý Sin/Cosin",
        createdAt: now,
        student: { studentName: "Trần Bảo Ngọc", classId: "class-10a1", class: { className: "10A1" } },
      },
    ])
    mockPrisma.studentAdvisoryStatus.findMany.mockResolvedValue([
      {
        id: "adv-1",
        studentId: "hs-1",
        statusColor: "RED",
        reasonCategory: "Học lực",
        reasonDetail: "Dưới chuẩn Benchmark môn Toán",
        updatedAt: now,
        student: { studentName: "Trần Bảo Ngọc", classId: "class-10a1", class: { className: "10A1" } },
      },
    ])
    mockPrisma.learningSupportTarget.findMany.mockResolvedValue([
      {
        id: "lst-1",
        studentId: "hs-1",
        classId: "class-10a1",
        subjectId: "sub-math",
        outcome: "Nâng điểm Toán lên >= 6.5",
        reason: "Điểm KSĐN 5.0",
        createdAt: now,
        student: { studentName: "Trần Bảo Ngọc" },
        class: { className: "10A1" },
        subject: { name: "Toán học" },
        evaluations: [],
      },
    ])
    mockPrisma.workTask.findMany.mockResolvedValue([])
    mockPrisma.notification.findFirst.mockResolvedValue(null)
    mockPrisma.notification.create.mockResolvedValue({ id: "notif-1" })
    mockPrisma.auditLog.create.mockResolvedValue({ id: "audit-1" })
  })

  it("1. Assignment Mapping Service: nhận diện đa vai trò, đa cơ sở và khử trùng lặp tuyệt đối", async () => {
    const profile = await resolveTeacherAssignmentProfile("user-gv-01")
    expect(profile).not.toBeNull()
    expect(profile!.rolesDetected.isGVCN).toBe(true)
    expect(profile!.rolesDetected.isGVBM).toBe(true)
    expect(profile!.rolesDetected.isGVCTQT).toBe(true)
    expect(profile!.rolesDetected.isGVMonDacThu).toBe(true)
    expect(profile!.rolesDetected.isGVKhachMoiKhaoSat).toBe(true)
    expect(profile!.rolesDetected.isTTCM).toBe(true)

    // Dù Class.homeroomTeacherId có dấu phẩy và lặp lại ở TeacherClassAssignment, chỉ đếm 1 lớp 10A1
    expect(profile!.homeroomClasses).toHaveLength(1)
    expect(profile!.homeroomClasses[0].className).toBe("10A1")

    // Dù TeachingAssignment có 2 bản ghi trùng class-10a1 + sub-math, chỉ đếm 1
    expect(profile!.teachingAssignments).toHaveLength(1)
    expect(profile!.campuses).toHaveLength(2)
  })

  it("2. Task Aggregation Service: đồng bộ đủ 9 phân hệ và nhận diện đúng trạng thái WAITING (chờ duyệt)", async () => {
    const { tasks, counts } = await aggregateTeacherTasks("user-gv-01")

    expect(tasks.length).toBeGreaterThan(0)
    expect(counts.byModule.KHAO_SAT_DAU_VAO).toBeGreaterThan(0)
    expect(counts.byModule.LOP_CHU_NHIEM).toBeGreaterThan(0)
    expect(counts.byModule.MON_DAC_THU).toBeGreaterThan(0)
    expect(counts.byModule.CHAT_LUONG_GIANG_DAY).toBeGreaterThan(0)
    expect(counts.byModule.NPS_PHHS).toBeGreaterThan(0)
    expect(counts.byModule.Y_KIEN_PHHS).toBeGreaterThan(0)
    expect(counts.byModule.TRAI_NGHIEM).toBeGreaterThan(0)
    expect(counts.byModule.DU_GIO).toBeGreaterThan(0)
    expect(counts.byModule.CO_VAN).toBeGreaterThan(0)

    // Kiểm tra trạng thái WAITING (Chờ duyệt) cho Môn đặc thù (SUBMITTED), CTQT (PENDING_REVIEW) và Dự giờ (isApproved=false)
    const waitingTasks = tasks.filter((t) => t.status === "WAITING")
    expect(waitingTasks.length).toBeGreaterThanOrEqual(3)
    expect(counts.waitingApproval).toBe(waitingTasks.length)
  })

  it("3. Progress & KPI Rules Engine: tính toán tách biệt 6 nhóm chỉ số tiến độ & KPI mà không gộp tùy tiện", async () => {
    const profile = await resolveTeacherAssignmentProfile("user-gv-01")
    const { tasks } = await aggregateTeacherTasks("user-gv-01")
    const kpi = await calculateTeacherProgressAndKPI(profile!, tasks)

    // 1. Khối lượng
    expect(kpi.volumeProgress.gradebookEnteredCount).toBe(2)
    expect(kpi.volumeProgress.gradebookTotalExpected).toBe(30)
    expect(kpi.volumeProgress.competencyEvaluatedCount).toBe(2)
    expect(kpi.volumeProgress.competencyTotalExpected).toBe(30)

    // 2. Phê duyệt
    expect(kpi.approvalProgress.breakdown.observationsApproved).toBe(1)
    expect(kpi.approvalProgress.waitingApprovalItems).toBeGreaterThan(0)

    // 3. Tuân thủ hạn
    expect(kpi.deadlineCompliance.overdueCount).toBeGreaterThanOrEqual(1)

    // 4. Định mức KPI Dự giờ (Đã dự 1/2 tiết -> thiếu 1 tiết)
    expect(kpi.kpiAttainment.observationQuota.observedValidCount).toBe(1)
    expect(kpi.kpiAttainment.observationQuota.requiredObservedQuota).toBe(2)
    expect(kpi.kpiAttainment.observationQuota.deficitPeriods).toBe(1)
    expect(kpi.kpiAttainment.observationQuota.isObservationMet).toBe(false)

    // 5. Chất lượng giảng dạy (hs-1: 5.0 -> 5.5 dưới chuẩn 6.0 nhưng có tiến bộ; hs-2: 8.0 -> 8.5 đạt chuẩn & tiến bộ)
    expect(kpi.teachingQuality.totalStudentsEvaluated).toBe(2)
    expect(kpi.teachingQuality.passBenchmarkCount).toBe(1)
    expect(kpi.teachingQuality.underBenchmarkCount).toBe(1)
    expect(kpi.teachingQuality.passRate).toBe(50)
    expect(kpi.teachingQuality.progressRate).toBe(100) // Cả 2 HS đều tăng điểm từ KSĐN -> GK1

    // 6. Hiệu quả hỗ trợ HS
    expect(kpi.studentSupportEffectiveness.redAlertCount).toBe(1)
    expect(kpi.studentSupportEffectiveness.parentFeedbacksTotal).toBe(1)
    expect(kpi.studentSupportEffectiveness.parentFeedbacksResolvedCount).toBe(0)
  })

  it("4. Task Monitoring & Reminder Engine: bỏ qua việc WAITING, chống gửi trùng và đảm bảo Zero PII Egress", async () => {
    const res1 = await evaluateAndDispatchTeacherReminders("user-gv-01", {
      enableEmailChannel: true,
    })

    expect(res1.digestSent).toBe(true)
    expect(res1.waitingApprovalSkippedCount).toBeGreaterThanOrEqual(3)
    expect(res1.channelsDispatched).toContain("SSM")
    expect(res1.channelsDispatched).toContain("EMAIL")

    // Giả lập gọi lại trong khung giờ cooldown -> chống thông báo trùng
    mockPrisma.notification.findFirst.mockResolvedValueOnce({
      id: "existing-digest",
      message: "[DIGEST:today]",
    })
    const res2 = await evaluateAndDispatchTeacherReminders("user-gv-01", {
      enableEmailChannel: false,
    })
    expect(res2.digestSent).toBe(false)
    expect(res2.skippedReason).toBe("DIGEST_ALREADY_SENT_IN_COOLDOWN_WINDOW")

    // Kiểm tra Zero PII Egress Sanitizer
    const rawMsg = "Phản hồi ý kiến Phụ huynh em Trần Bảo Ngọc (10A1) và HS Lê Hoàng Nam"
    const scrubbed = sanitizeMessageForExternalChannel(rawMsg)
    expect(scrubbed).not.toContain("Trần Bảo Ngọc")
    expect(scrubbed).not.toContain("Lê Hoàng Nam")
  })

  it("5. Sky-Line Task Assistant: trả lời chính xác cả 8 câu hỏi trọng tâm kèm thời gian cập nhật & deepLink", async () => {
    const questions = [
      "Hôm nay tôi cần làm gì?",
      "Những nhiệm vụ nào sắp quá hạn?",
      "Tôi còn thiếu bao nhiêu đánh giá năng lực?",
      "Các môn tôi phụ trách có bao nhiêu học sinh dưới chuẩn?",
      "Tôi còn thiếu bao nhiêu tiết dự giờ để đủ KPI?",
      "Ý kiến PHHS nào chưa được giải quyết?",
      "Hoạt động trải nghiệm nào chưa hoàn thành?",
      "Hồ sơ cố vấn học tập nào cần cập nhật?",
    ]

    for (const q of questions) {
      expect(detectTaskAssistantQuestionType(q)).not.toBeNull()
      const ans = await answerTeacherTaskAssistantQuery("user-gv-01", q)
      expect(ans.matched).toBe(true)
      expect(ans.markdown.toLowerCase()).toContain("cập nhật lúc:")
      expect(ans.deepLinks.length).toBeGreaterThan(0)
    }
  })

  it("6. Trường hợp dữ liệu bất thường (Tài khoản không tồn tại): xử lý an toàn không gây lỗi crash", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.teacher.findFirst.mockResolvedValue(null)

    const profile = await resolveTeacherAssignmentProfile("non-existent-id")
    expect(profile).toBeNull()

    const reminderRes = await evaluateAndDispatchTeacherReminders("non-existent-id")
    expect(reminderRes.digestSent).toBe(false)
    expect(reminderRes.skippedReason).toBe("USER_PROFILE_NOT_FOUND")
  })

  it("7. Giải mã JSON [GVBM_FORWARD:{...}] trong Ý kiến PHHS: không hiển thị chuỗi JSON thô và phân tách đúng nhiệm vụ GVCN / GVBM", async () => {
    const now = new Date()
    mockPrisma.academicConsultationLog.findMany.mockResolvedValue([
      {
        id: "log-forward-other-gvbm",
        studentId: "hs-1",
        teacherId: "teacher-01", // GVCN là teacher-01 chuyển tiếp cho GVBM Ngữ Văn (teacher-99)
        difficulties: "[GradePeriod: GK1] Ý KIẾN PHHS: Nhờ cô môn Văn hướng dẫn thêm kỹ năng nghị luận xã hội.",
        content: "",
        nextActions:
          '[ACKNOWLEDGED] [GVBM_FORWARD:{"subjectId":"cmnmxagiy0007yiyoqmq5vy2p","subjectName":"Ngữ Văn","teacherId":"cmspfizyf000513c5uuz0p1vv","teacherName":"Nguyễn Thị Lan Hương","message":"","forwardedAt":"2026-09-23T09:40:11.033Z"}]',
        createdAt: now,
        student: {
          studentName: "Vũ Nguyễn Mai Khanh",
          classId: "class-10a1",
          class: { className: "12.1_CS1" },
        },
      },
      {
        id: "log-forward-to-me",
        studentId: "hs-2",
        teacherId: "teacher-hr-other",
        difficulties: "[GradePeriod: GK1] Ý KIẾN PHHS: Cháu còn lúng túng phần Hình học không gian.",
        content: "",
        nextActions:
          '[ACKNOWLEDGED] [GVBM_FORWARD:{"subjectId":"sub-math","subjectName":"Toán học","teacherId":"teacher-01","teacherName":"Nguyễn Văn Minh","message":"Nhờ thầy hỗ trợ thêm bài tập cho em","forwardedAt":"2026-09-23T09:40:11.033Z"}]',
        createdAt: now,
        student: {
          studentName: "Lê Hoàng Nam",
          classId: "class-10a2",
          class: { className: "10A2" },
        },
      },
    ])

    const { tasks } = await aggregateTeacherTasks("user-gv-01")

    // 1. Đối với log chuyển cho GVBM khác (teacher-99): teacher-01 (GVCN) chỉ thấy trạng thái WAITING chờ GVBM phản hồi, không bị gán nhầm task GVBM
    const wrongGvbmTask = tasks.find((t) => t.taskId === "ykph-gvbm-log-forward-other-gvbm")
    expect(wrongGvbmTask).toBeUndefined()

    const gvcnWaitingTask = tasks.find((t) => t.taskId === "ykph-gvcn-log-forward-other-gvbm")
    expect(gvcnWaitingTask).toBeDefined()
    expect(gvcnWaitingTask!.status).toBe("WAITING")
    expect(gvcnWaitingTask!.description).toContain("Nguyễn Thị Lan Hương")
    expect(gvcnWaitingTask!.description).toContain("Ngữ Văn")
    expect(gvcnWaitingTask!.description).not.toContain('"subjectName"')
    expect(gvcnWaitingTask!.description).not.toContain("forwardedAt")

    // 2. Đối với log chuyển đúng cho teacher-01 làm GVBM: hiển thị mô tả rõ ràng, không chứa JSON thô
    const myGvbmTask = tasks.find((t) => t.taskId === "ykph-gvbm-log-forward-to-me")
    expect(myGvbmTask).toBeDefined()
    expect(myGvbmTask!.status).toBe("NEW")
    expect(myGvbmTask!.title).toContain("Môn Toán học")
    expect(myGvbmTask!.description).toContain("Nhờ thầy hỗ trợ thêm bài tập cho em")
    expect(myGvbmTask!.description).toContain("Cháu còn lúng túng phần Hình học không gian.")
    expect(myGvbmTask!.description).not.toContain('"subjectId"')
    expect(myGvbmTask!.description).not.toContain("forwardedAt")
    expect(myGvbmTask!.deepLink).toContain("subjectId=sub-math")
  })
})
