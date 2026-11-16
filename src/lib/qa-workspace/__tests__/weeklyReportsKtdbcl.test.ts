import { beforeEach, describe, expect, it, vi } from "vitest"

const mockSendEmail = vi.fn()
const mockNotificationCreate = vi.fn()
const mockDepartmentFindMany = vi.fn()
const mockTaskGroupFindMany = vi.fn()
const mockUserFindMany = vi.fn()
const mockWeeklyReportFindMany = vi.fn()
const mockWorkTaskFindMany = vi.fn()
const mockTaskCategoryFindMany = vi.fn()
const mockExecuteRawUnsafe = vi.fn()
const mockQueryRawUnsafe = vi.fn()

vi.mock("@/lib/mail", () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
}))

vi.mock("@/lib/db", () => ({
  prisma: {
    notification: {
      create: (...args: any[]) => mockNotificationCreate(...args),
    },
    department: {
      findMany: (...args: any[]) => mockDepartmentFindMany(...args),
    },
    taskGroup: {
      findMany: (...args: any[]) => mockTaskGroupFindMany(...args),
    },
    user: {
      findMany: (...args: any[]) => mockUserFindMany(...args),
    },
    weeklyReport: {
      findMany: (...args: any[]) => mockWeeklyReportFindMany(...args),
    },
    workTask: {
      findMany: (...args: any[]) => mockWorkTaskFindMany(...args),
    },
    taskCategory: {
      findMany: (...args: any[]) => mockTaskCategoryFindMany(...args),
    },
    $executeRawUnsafe: (...args: any[]) => mockExecuteRawUnsafe(...args),
    $queryRawUnsafe: (...args: any[]) => mockQueryRawUnsafe(...args),
  },
}))

import {
  computeWeeksOfMonthSync,
  getVietnamDateParts,
  isKtdbclRoleCode,
  isUserAuthorizedForKtdbclWeeklyReports,
  resolveCurrentWeekInMonth,
} from "../weeklyReportSchema"
import {
  computeEfficiencyAndQualityMetrics,
  isReportItemPastDue,
} from "../weeklyAiQualityAgent"
import {
  dispatchDirectorSummaryReport,
  dispatchKtdbclWednesdayReminders,
  sendExplanationSubmittedToLeadershipEmail,
  sendOverdueExplanationRequestEmail,
  sendReportItemsCompletedEmail,
} from "../weeklyReportEmailService"

describe("Ban KT&ĐBCL Weekly Reports & Quality Governance Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendEmail.mockResolvedValue({ success: true })
    mockNotificationCreate.mockResolvedValue({ id: "notif_1" })
    mockExecuteRawUnsafe.mockResolvedValue(1)
    mockQueryRawUnsafe.mockResolvedValue([])
    mockTaskCategoryFindMany.mockResolvedValue([
      { id: "c1", name: "Kiểm tra định kì", weight: 1.5 },
    ])
    mockWorkTaskFindMany.mockResolvedValue([])
  })

  it("identifies Wednesday 14:00 Vietnam time (07:00 UTC) and resolves active week in month", () => {
    // 2026-11-18T07:00:00Z is Wednesday 14:00 in Asia/Ho_Chi_Minh (+07:00)
    const wedUtc = new Date("2026-11-18T07:00:00.000Z")
    const vn = getVietnamDateParts(wedUtc)
    expect(vn.year).toBe(2026)
    expect(vn.month).toBe(11)
    expect(vn.day).toBe(18)
    expect(vn.dayOfWeek).toBe(3) // Wednesday
    expect(vn.hour).toBe(14)

    const weeks = computeWeeksOfMonthSync(11, 2026)
    expect(weeks.length).toBeGreaterThanOrEqual(4)
    const active = resolveCurrentWeekInMonth(wedUtc)
    expect(active.month).toBe(11)
    expect(active.weekNumber).toBe(3) // Week 3 of Nov 2026 (16/11 - 20/11)
  })

  it("computes Group & Individual efficiency, KPI grades, and overdue flags accurately", () => {
    const refNow = new Date("2026-11-19T08:00:00+07:00")
    const members = [
      {
        id: "u_thang",
        fullName: "Dương Xuân Thắng",
        email: "thangdx@skylineschool.edu.vn",
        role: "KT_DBCL",
        position: "Chuyên viên KT",
        isDirector: false,
        isManager: false,
        departmentId: "dept_kt",
        departmentName: "KT&ĐBCL",
        campusName: "Hệ thống",
        specialistGroups: ["Khảo thí Phổ thông"],
        teacherId: "t1",
      },
      {
        id: "u_lan",
        fullName: "Nguyễn Minh Lan",
        email: "lannm@skylineschool.edu.vn",
        role: "KT_DBCL",
        position: "Chuyên viên ĐBCL",
        isDirector: false,
        isManager: false,
        departmentId: "dept_kt",
        departmentName: "KT&ĐBCL",
        campusName: "Hệ thống",
        specialistGroups: ["ĐBCL"],
        teacherId: "t2",
      },
    ]

    const itemMetaMap = new Map()
    itemMetaMap.set("item_1", {
      itemId: "item_1",
      reportId: "r_1",
      userId: "u_thang",
      confirmStatus: "DIRECTOR_CONFIRMED",
      isOverdue: false,
    })
    itemMetaMap.set("item_2", {
      itemId: "item_2",
      reportId: "r_2",
      userId: "u_lan",
      confirmStatus: "OVERDUE_EXPLANATION_REQUIRED",
      isOverdue: true,
    })

    const reports = [
      {
        id: "r_1",
        userId: "u_thang",
        weekNumber: 3,
        month: 11,
        year: 2026,
        status: "REVIEWED",
        items: [
          {
            id: "item_1",
            mainTask: "Kiểm tra định kì",
            workContent: "Hoàn thành đề và ma trận giữa kỳ",
            taskGroup: "Khảo thí Phổ thông",
            expectedCompletion: "18/11/2026",
            progress: "COMPLETED",
            directorRating: "EXCELLENT",
            qualityScore: 9.5,
          },
        ],
      },
      {
        id: "r_2",
        userId: "u_lan",
        weekNumber: 3,
        month: 11,
        year: 2026,
        status: "SUBMITTED",
        items: [
          {
            id: "item_2",
            mainTask: "Rà soát khảo sát PHHS",
            workContent: "Tổng hợp phiếu khảo sát đợt 1",
            taskGroup: "ĐBCL",
            expectedCompletion: "12/11/2026",
            progress: "DOING",
          },
        ],
      },
    ]

    expect(
      isReportItemPastDue(
        { progress: "DOING", expectedCompletion: "12/11/2026" },
        null,
        refNow,
        2026,
        11
      )
    ).toBe(true)

    const result = computeEfficiencyAndQualityMetrics({
      scopeType: "WEEKLY",
      weekNumber: 3,
      month: 11,
      year: 2026,
      expectedWeeksCount: 1,
      members,
      taskGroupNames: ["Khảo thí Phổ thông", "ĐBCL"],
      reports,
      itemMetaMap,
      referenceNow: refNow,
    })

    expect(result.departmentSummary.totalMembers).toBe(2)
    expect(result.departmentSummary.submittedMembers).toBe(2)
    expect(result.departmentSummary.confirmedItems).toBe(1)
    expect(result.departmentSummary.overdueItems).toBe(1)
    expect(result.departmentSummary.pendingExplanations).toBe(1)

    const thangAnalysis = result.individualAnalyses.find((i) => i.userId === "u_thang")!
    expect(thangAnalysis.kpiGrade).toBe("A")
    expect(thangAnalysis.efficiencyScore).toBeGreaterThanOrEqual(90)

    const lanAnalysis = result.individualAnalyses.find((i) => i.userId === "u_lan")!
    expect(lanAnalysis.overdueCount).toBe(1)
    expect(lanAnalysis.pendingExplanationCount).toBe(1)
  })

  it("sends Wednesday 14:00 email reminders only to unsubmitted Ban KT&ĐBCL members", async () => {
    mockDepartmentFindMany.mockResolvedValue([
      { id: "d_kt", code: "KT-ĐBCL", name: "KT&ĐBCL", divisionCode: "BAN_KT_DBCL" },
    ])
    mockTaskGroupFindMany.mockResolvedValue([
      { id: "g1", name: "Khảo thí Phổ thông", department: "KT&ĐBCL", memberUserIds: '["u1","u2"]' },
    ])
    mockUserFindMany.mockResolvedValue([
      {
        id: "u1",
        fullName: "Chuyên viên Đã Nộp",
        email: "u1@skylineschool.edu.vn",
        role: "KT_DBCL",
        teacher: null,
      },
      {
        id: "u2",
        fullName: "Chuyên viên Chưa Nộp",
        email: "u2@skylineschool.edu.vn",
        role: "KT_DBCL",
        teacher: null,
      },
    ])
    mockWeeklyReportFindMany.mockResolvedValue([{ userId: "u1" }])

    const res = await dispatchKtdbclWednesdayReminders({
      weekNumber: 3,
      month: 11,
      year: 2026,
      force: true,
      triggeredBy: "TEST_CRON",
    })

    expect(res.success).toBe(true)
    expect(res.totalStaff).toBe(2)
    expect(res.submittedCount).toBe(1)
    expect(res.pendingCount).toBe(1)
    expect(res.emailSentCount).toBe(1)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect(mockSendEmail.mock.calls[0][0].to).toBe("u2@skylineschool.edu.vn")
    expect(mockSendEmail.mock.calls[0][0].subject).toContain("Thứ Tư 14:00")
  })

  it("compiles and dispatches Weekly & Monthly Executive Reports to Giám đốc Ban", async () => {
    mockDepartmentFindMany.mockResolvedValue([
      { id: "d_kt", code: "KT-ĐBCL", name: "KT&ĐBCL", divisionCode: "BAN_KT_DBCL" },
    ])
    mockTaskGroupFindMany.mockResolvedValue([])
    mockUserFindMany.mockResolvedValue([
      {
        id: "u_director",
        fullName: "Giám đốc Ban KT&ĐBCL",
        email: "gdb.ktdbcl@skylineschool.edu.vn",
        role: "ADMIN",
        teacher: { id: "td", position: "Giám đốc Ban", email: "gdb.ktdbcl@skylineschool.edu.vn" },
      },
    ])
    mockWeeklyReportFindMany.mockResolvedValue([
      {
        id: "rep_1",
        userId: "u_director",
        weekNumber: 3,
        month: 11,
        year: 2026,
        status: "SUBMITTED",
        items: [
          {
            id: "it_1",
            mainTask: "Duyệt kế hoạch khảo thí",
            workContent: "Phê duyệt ma trận đề thi toàn hệ thống",
            taskGroup: "Khảo thí Tổng hợp",
            progress: "COMPLETED",
          },
        ],
      },
    ])

    const res = await dispatchDirectorSummaryReport({
      scopeType: "WEEKLY",
      weekNumber: 3,
      month: 11,
      year: 2026,
      force: true,
    })

    expect(res.success).toBe(true)
    expect(res.emailSentCount).toBe(1)
    expect(res.recipientEmails).toContain("gdb.ktdbcl@skylineschool.edu.vn")
    expect(mockSendEmail.mock.calls[0][0].subject).toContain("Báo cáo Giám đốc Ban KT&ĐBCL")
  })

  it("sends Completion Confirmation, Overdue Explanation Request, and Submitted Explanation emails", async () => {
    const completedRes = await sendReportItemsCompletedEmail({
      staffUser: {
        id: "u_staff",
        fullName: "Trần Thị Minh",
        email: "minhtt@skylineschool.edu.vn",
      },
      reviewerName: "Giám đốc Ban",
      reviewerRoleLabel: "Giám đốc Ban KT&ĐBCL",
      weekNumber: 3,
      month: 11,
      year: 2026,
      items: [
        {
          mainTask: "Thẩm định đề Tiếng Anh",
          workContent: "Rà soát 12 đề IELTS/Cambridge",
          taskGroup: "Khảo thí TA&CTQT",
          qualityScore: 9.5,
          directorRating: "EXCELLENT",
          reviewNote: "Hoàn thành xuất sắc trước hạn",
        },
      ],
    })
    expect(completedRes.emailSent).toBe(true)

    const overdueRes = await sendOverdueExplanationRequestEmail({
      staffUser: {
        id: "u_staff",
        fullName: "Trần Thị Minh",
        email: "minhtt@skylineschool.edu.vn",
      },
      requestedByName: "Quản lý Khảo thí",
      requestedByRoleLabel: "Quản lý Ban KT&ĐBCL",
      weekNumber: 3,
      month: 11,
      year: 2026,
      explanationRequestNote: "Vui lòng giải trình lý do chậm bàn giao file tổng hợp điểm.",
      explanationDueDate: "Trước 16:00 ngày 20/11/2026",
      items: [
        {
          mainTask: "Tổng hợp phổ điểm",
          workContent: "Chậm nộp phổ điểm khối 9",
          taskGroup: "Khảo thí Phổ thông",
          expectedCompletion: "15/11/2026",
          progress: "DOING",
        },
      ],
    })
    expect(overdueRes.emailSent).toBe(true)

    mockUserFindMany.mockResolvedValueOnce([
      {
        id: "u_gdb",
        fullName: "Giám đốc Ban",
        email: "gdb@skylineschool.edu.vn",
        teacher: null,
      },
    ])
    const explainSubmittedRes = await sendExplanationSubmittedToLeadershipEmail({
      staffName: "Trần Thị Minh",
      weekNumber: 3,
      month: 11,
      year: 2026,
      mainTask: "Tổng hợp phổ điểm",
      workContent: "Chậm nộp phổ điểm khối 9",
      explanationText: "Đợi điểm phúc khảo bổ sung từ cơ sở, cam kết hoàn tất chiều nay.",
      recoveryDate: "20/11/2026",
      recipientUserIds: ["u_gdb"],
    })
    expect(explainSubmittedRes.emailSentCount).toBe(1)
    expect(mockSendEmail).toHaveBeenCalledTimes(3)
  })

  it("restricts Weekly Reports exclusively to BP/Tổ chuyên môn Ban KT&ĐBCL and blocks all other departments", async () => {
    expect(isKtdbclRoleCode("KT_DBCL")).toBe(true)
    expect(isKtdbclRoleCode("ADMIN")).toBe(true)
    expect(isKtdbclRoleCode("TTCM")).toBe(false)
    expect(isKtdbclRoleCode("TBP")).toBe(false)
    expect(isKtdbclRoleCode("TEACHER")).toBe(false)
    expect(isKtdbclRoleCode("GV_MN")).toBe(false)

    mockDepartmentFindMany.mockResolvedValue([
      { id: "dept_kt", code: "KT-ĐBCL", name: "KT&ĐBCL", divisionCode: "BAN_KT_DBCL" },
    ])
    mockTaskGroupFindMany.mockResolvedValue([])
    mockUserFindMany.mockResolvedValue([
      {
        id: "u_kt_member",
        fullName: "Chuyên viên Khảo thí",
        email: "kt@skylineschool.edu.vn",
        role: "TEACHER",
        teacher: {
          id: "t_kt",
          departmentId: "dept_kt",
          departmentRel: { id: "dept_kt", name: "KT&ĐBCL", code: "KT-ĐBCL", divisionCode: "BAN_KT_DBCL" },
        },
      },
    ])

    // Member of Tổ KT&ĐBCL (even with TEACHER role) -> ALLOWED
    await expect(
      isUserAuthorizedForKtdbclWeeklyReports("u_kt_member", "TEACHER")
    ).resolves.toBe(true)

    // TTCM / Teacher of Tổ Toán / other departments -> BLOCKED
    await expect(
      isUserAuthorizedForKtdbclWeeklyReports("u_math_ttcm", "TTCM")
    ).resolves.toBe(false)
    await expect(
      isUserAuthorizedForKtdbclWeeklyReports("u_english_teacher", "TEACHER")
    ).resolves.toBe(false)
  })
})
