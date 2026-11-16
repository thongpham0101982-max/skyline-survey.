import { describe, it, expect, vi, beforeEach } from "vitest"

const mockPrisma = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  taskGroup: {
    findUnique: vi.fn(),
  },
  workTask: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  notification: {
    create: vi.fn(),
  },
}))

const mockSendEmail = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ success: true, messageId: "mock-mail-id" })
)

const mockAuth = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    user: {
      id: "user-assigner",
      fullName: "Trưởng ban KT&ĐBCL",
      email: "truongban@skylineschool.edu.vn",
      role: "ADMIN",
    },
  })
)

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}))

vi.mock("@/lib/mail", () => ({
  sendEmail: mockSendEmail,
}))

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/session", () => ({
  getOperationalScope: vi.fn().mockResolvedValue({
    isManager: true,
    isSuperAdmin: true,
  }),
}))

import {
  sendQaTaskAssignmentEmails,
  sendQaTaskConfirmationFeedbackEmail,
  sendQaWorkflowTransitionEmails,
} from "../emailService"
import {
  createQaWorkspaceTask,
  confirmAndAcceptQaTask,
  rejectOrFeedbackQaTask,
  transitionTaskWorkflow,
} from "@/app/admin/tasks/qa_workspace_actions"

describe("QA Workspace | KT&ĐBCL — Email Notification & Task Confirmation Workflow (Mocked)", () => {
  const staffDirectory: Record<string, any> = {
    "user-assigner": {
      id: "user-assigner",
      fullName: "Trưởng ban KT&ĐBCL",
      email: "truongban@skylineschool.edu.vn",
      role: "ADMIN",
      teacher: null,
    },
    "user-primary": {
      id: "user-primary",
      fullName: "Nguyễn Thị Minh Châu",
      email: "chauntm@skylineschool.edu.vn",
      role: "TEACHER",
      teacher: {
        email: "chauntm@skylineschool.edu.vn",
        departmentRel: { name: "KT&ĐBCL", code: "KT-ĐBCL" },
      },
    },
    "user-collab": {
      id: "user-collab",
      fullName: "Trần Văn Hùng",
      email: "hungtv",
      role: "TEACHER",
      teacher: {
        email: "hungtv",
        departmentRel: { name: "KT&ĐBCL", code: "KT-ĐBCL" },
      },
    },
    "user-reviewer": {
      id: "user-reviewer",
      fullName: "Lê Hoàng Nam",
      email: "namlh@skylineschool.edu.vn",
      role: "TBP",
      teacher: null,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.user.findMany.mockImplementation(async ({ where }: any) => {
      const ids: string[] = where?.id?.in || []
      return ids.map((id) => staffDirectory[id]).filter(Boolean)
    })
    mockPrisma.notification.create.mockResolvedValue({ id: "notif-mock" })
  })

  it("1. sendQaTaskAssignmentEmails gửi email cho Người phụ trách chính (yêu cầu xác nhận), Người phối hợp và Người duyệt (khử trùng lặp)", async () => {
    const res = await sendQaTaskAssignmentEmails({
      taskId: "task-qa-001",
      title: "Rà soát ma trận đề kiểm tra cuối kỳ Khối 9",
      description: "Kiểm tra tính cân đối mức độ nhận thức",
      category: "Khảo thí & Đề kiểm tra",
      taskGroupName: "Khảo thí Phổ thông",
      assignmentMode: "GROUP",
      priority: "HIGH",
      startDate: "2026-11-16",
      endDate: "2026-11-20",
      reviewDueDate: "2026-11-21",
      requiresApproval: true,
      deliverables: "Biên bản rà soát ma trận đề",
      completionCriteria: "Đủ 100% môn thi",
      requiredEvidences: "Link Google Drive biên bản",
      checklist: [
        { id: "s1", title: "Thu thập ma trận từ TTCM", completed: false },
        { id: "s2", title: "Đối chiếu chuẩn đầu ra", completed: false, dependsOnStepId: "s1" },
      ],
      assignerUserId: "user-assigner",
      assignerName: "Trưởng ban KT&ĐBCL",
      primaryAssigneeId: "user-primary",
      collaboratorUserIds: ["user-collab", "user-primary"], // user-primary trùng lặp phải được lọc
      groupMemberUserIds: ["user-collab"],
      reviewerUserId: "user-reviewer",
    })

    expect(res.sentCount).toBe(3)
    expect(mockSendEmail).toHaveBeenCalledTimes(3)

    // Email 1: Người phụ trách chính nhận yêu cầu xác nhận kèm link action=confirm
    const primaryCall = mockSendEmail.mock.calls.find(
      (c) => c[0].to === "chauntm@skylineschool.edu.vn"
    )?.[0]
    expect(primaryCall).toBeDefined()
    expect(primaryCall.subject).toContain("[Giao việc & Yêu cầu xác nhận]")
    expect(primaryCall.html).toContain("action=confirm")
    expect(primaryCall.html).toContain("Xác nhận nhận việc")
    expect(primaryCall.html).toContain("Thu thập ma trận từ TTCM")

    // Email 2: Người phối hợp (tự động chuẩn hóa username hungtv -> hungtv@skylineschool.edu.vn)
    const collabCall = mockSendEmail.mock.calls.find(
      (c) => c[0].to === "hungtv@skylineschool.edu.vn"
    )?.[0]
    expect(collabCall).toBeDefined()
    expect(collabCall.subject).toContain("[Phối hợp công việc KT&ĐBCL]")

    // Email 3: Người duyệt nghiệm thu
    const reviewerCall = mockSendEmail.mock.calls.find(
      (c) => c[0].to === "namlh@skylineschool.edu.vn"
    )?.[0]
    expect(reviewerCall).toBeDefined()
    expect(reviewerCall.subject).toContain("[Phân công duyệt nghiệm thu]")
  })

  it("2. createQaWorkspaceTask không gửi email khi lưu ở trạng thái Nháp (isDraft = true) và gửi đầy đủ khi phát hành", async () => {
    mockPrisma.workTask.create.mockResolvedValue({
      id: "task-draft-01",
      title: "Dự thảo kế hoạch khảo sát",
      category: "Đảm bảo chất lượng",
      startDate: new Date("2026-11-16"),
      endDate: new Date("2026-11-25"),
      progress: "PENDING",
      acceptanceStatus: "WAITING_CONFIRMATION",
    })

    const draftRes = await createQaWorkspaceTask({
      title: "Dự thảo kế hoạch khảo sát",
      category: "Đảm bảo chất lượng",
      assignmentMode: "INDIVIDUAL",
      assignedToUserId: "user-primary",
      collaboratorUserIds: ["user-collab"],
      startDate: "2026-11-16",
      endDate: "2026-11-25",
      isDraft: true,
    })

    expect(draftRes.success).toBe(true)
    expect(draftRes.emailsSentCount).toBe(0)
    expect(mockSendEmail).not.toHaveBeenCalled()

    // Phát hành chính thức
    mockPrisma.workTask.create.mockResolvedValue({
      id: "task-live-01",
      title: "Triển khai khảo sát hài lòng PHHS",
      category: "Đảm bảo chất lượng",
      startDate: new Date("2026-11-16"),
      endDate: new Date("2026-11-25"),
      progress: "PENDING",
      acceptanceStatus: "WAITING_CONFIRMATION",
    })

    const liveRes = await createQaWorkspaceTask({
      title: "Triển khai khảo sát hài lòng PHHS",
      category: "Đảm bảo chất lượng",
      assignmentMode: "INDIVIDUAL",
      assignedToUserId: "user-primary",
      collaboratorUserIds: ["user-collab"],
      startDate: "2026-11-16",
      endDate: "2026-11-25",
      isDraft: false,
    })

    expect(liveRes.success).toBe(true)
    expect(liveRes.emailsSentCount).toBe(2)
    expect(mockSendEmail).toHaveBeenCalledTimes(2)
  })

  it("3. confirmAndAcceptQaTask & rejectOrFeedbackQaTask cập nhật trạng thái xác nhận và báo email về cho Người giao việc", async () => {
    mockAuth.mockResolvedValueOnce({
      user: {
        id: "user-primary",
        fullName: "Nguyễn Thị Minh Châu",
        email: "chauntm@skylineschool.edu.vn",
        role: "TEACHER",
      },
    })

    mockPrisma.workTask.findUnique.mockResolvedValue({
      id: "task-confirm-01",
      title: "Thẩm định đề thi thử IELTS",
      category: "Khảo thí Quốc tế",
      assignedById: "user-assigner",
      assignedToUserId: "user-primary",
      endDate: new Date("2026-11-22"),
      progress: "PENDING",
      acceptanceStatus: "WAITING_CONFIRMATION",
      taskGroup: null,
    })
    mockPrisma.workTask.update.mockResolvedValue({ id: "task-confirm-01" })

    const acceptRes = await confirmAndAcceptQaTask("task-confirm-01")
    expect(acceptRes.success).toBe(true)
    expect(mockPrisma.workTask.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "task-confirm-01" },
        data: expect.objectContaining({
          acceptanceStatus: "ACCEPTED",
          progress: "IN_PROGRESS",
        }),
      })
    )
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect(mockSendEmail.mock.calls[0][0].to).toBe("truongban@skylineschool.edu.vn")
    expect(mockSendEmail.mock.calls[0][0].subject).toContain("[Đã xác nhận nhận việc]")

    // Phản hồi / đề xuất điều chỉnh
    vi.clearAllMocks()
    mockPrisma.user.findMany.mockImplementation(async ({ where }: any) => {
      const ids: string[] = where?.id?.in || []
      return ids.map((id) => staffDirectory[id]).filter(Boolean)
    })
    mockAuth.mockResolvedValueOnce({
      user: {
        id: "user-primary",
        fullName: "Nguyễn Thị Minh Châu",
        email: "chauntm@skylineschool.edu.vn",
        role: "TEACHER",
      },
    })
    mockPrisma.workTask.findUnique.mockResolvedValue({
      id: "task-confirm-01",
      title: "Thẩm định đề thi thử IELTS",
      category: "Khảo thí Quốc tế",
      assignedById: "user-assigner",
      assignedToUserId: "user-primary",
      endDate: new Date("2026-11-22"),
      progress: "PENDING",
      acceptanceStatus: "WAITING_CONFIRMATION",
    })
    mockPrisma.workTask.update.mockResolvedValue({ id: "task-confirm-01" })

    const fbRes = await rejectOrFeedbackQaTask(
      "task-confirm-01",
      "Đề xuất gia hạn thêm 2 ngày để đối chiếu ngân hàng đề Cambridge"
    )
    expect(fbRes.success).toBe(true)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect(mockSendEmail.mock.calls[0][0].subject).toContain("[Phản hồi nhận việc]")
    expect(mockSendEmail.mock.calls[0][0].html).toContain("Đề xuất gia hạn thêm 2 ngày")
  })

  it("4. transitionTaskWorkflow gửi email khi Báo cáo hoàn thành chờ duyệt (PENDING_REVIEW) và khi Nghiệm thu hoàn thành (COMPLETED)", async () => {
    // Thành viên nộp kết quả hoàn thành -> gửi mail cho Người giao / Người duyệt
    mockAuth.mockResolvedValueOnce({
      user: {
        id: "user-primary",
        fullName: "Nguyễn Thị Minh Châu",
        email: "chauntm@skylineschool.edu.vn",
        role: "TEACHER",
      },
    })
    mockPrisma.workTask.findUnique.mockResolvedValue({
      id: "task-review-01",
      title: "Tổng hợp phổ điểm giữa HK1",
      category: "Báo cáo & Thống kê",
      assignedById: "user-assigner",
      assignedToUserId: "user-primary",
      endDate: new Date("2026-11-20"),
      progress: "IN_PROGRESS",
      acceptanceStatus: "ACCEPTED",
      acceptedAt: new Date(),
      completedAt: null,
      staffNote: null,
      taskGroup: null,
    })
    mockPrisma.workTask.update.mockResolvedValue({ id: "task-review-01" })

    const submitRes = await transitionTaskWorkflow("task-review-01", {
      toStatus: "PENDING_REVIEW",
      resultSummary: "Đã hoàn thành bảng phân tích phổ điểm 12 khối lớp.",
      evidenceLinks: ["https://drive.google.com/file/d/pho-diem-hk1"] as any,
    })

    expect(submitRes.success).toBe(true)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect(mockSendEmail.mock.calls[0][0].to).toBe("truongban@skylineschool.edu.vn")
    expect(mockSendEmail.mock.calls[0][0].subject).toContain("[Chờ duyệt hoàn thành]")
    expect(mockSendEmail.mock.calls[0][0].html).toContain("tab=review")
    expect(mockSendEmail.mock.calls[0][0].html).toContain("pho-diem-hk1")

    // Người duyệt bấm xác nhận hoàn thành nghiệm thu -> gửi mail thông báo cho thành viên thực hiện
    vi.clearAllMocks()
    mockPrisma.user.findMany.mockImplementation(async ({ where }: any) => {
      const ids: string[] = where?.id?.in || []
      return ids.map((id) => staffDirectory[id]).filter(Boolean)
    })
    mockAuth.mockResolvedValueOnce({
      user: {
        id: "user-assigner",
        fullName: "Trưởng ban KT&ĐBCL",
        email: "truongban@skylineschool.edu.vn",
        role: "ADMIN",
      },
    })
    mockPrisma.workTask.findUnique.mockResolvedValue({
      id: "task-review-01",
      title: "Tổng hợp phổ điểm giữa HK1",
      category: "Báo cáo & Thống kê",
      assignedById: "user-assigner",
      assignedToUserId: "user-primary",
      endDate: new Date("2026-11-20"),
      progress: "IN_PROGRESS",
      acceptanceStatus: "ACCEPTED",
      acceptedAt: new Date(),
      completedAt: null,
      staffNote: "Đã nộp",
      taskGroup: null,
    })
    mockPrisma.workTask.update.mockResolvedValue({ id: "task-review-01" })

    const approveRes = await transitionTaskWorkflow("task-review-01", {
      toStatus: "COMPLETED",
      reviewRating: "XUAT_SAC",
      reviewComment: "Số liệu đầy đủ, biểu đồ trực quan đạt chuẩn.",
    })

    expect(approveRes.success).toBe(true)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect(mockSendEmail.mock.calls[0][0].to).toBe("chauntm@skylineschool.edu.vn")
    expect(mockSendEmail.mock.calls[0][0].subject).toContain("[Đã hoàn thành công việc]")
    expect(mockSendEmail.mock.calls[0][0].html).toContain("Số liệu đầy đủ")
  })
})
