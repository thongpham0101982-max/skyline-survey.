import { describe, it, expect, vi, beforeEach } from "vitest"

const mockStore = {
  notifications: [] as any[],
  recipients: [] as any[],
  deliveries: [] as any[],
  events: [] as any[],
  readReceipts: [] as any[],
  responses: [] as any[],
  auditLogs: [] as any[],
  attachments: [] as any[],
  approvals: [] as any[],
  testingPeriods: [] as any[],
  testingSubjectExams: [] as any[],
  testingSessions: [] as any[],
  testingCandidateResults: [] as any[],
  students: [] as any[],
}

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}))

vi.mock("@/lib/student-session", () => ({
  getStudentSession: vi.fn().mockResolvedValue(null),
}))

vi.mock("@/lib/notification-center/schemaInit", () => ({
  ensureNotificationCenterTables: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/db", () => {
  const prismaMock: any = {
    $executeRawUnsafe: vi.fn().mockResolvedValue(0),
    $queryRawUnsafe: vi.fn().mockResolvedValue([]),
    notification: {
      create: vi.fn().mockResolvedValue({ id: "legacy_notif_1" }),
    },
    ssmNotification: {
      create: vi.fn(async ({ data }: any) => {
        const record = {
          id: data.id || `notif_${mockStore.notifications.length + 1}`,
          ...data,
          totalRecipients: data.totalRecipients || 0,
          sentSuccessCount: data.sentSuccessCount || 0,
          sentFailedCount: data.sentFailedCount || 0,
          readCount: data.readCount || 0,
          acknowledgedCount: data.acknowledgedCount || 0,
          replyCount: data.replyCount || 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        mockStore.notifications.push(record)
        return record
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        return (
          mockStore.notifications.find(
            (n) =>
              (where.id && n.id === where.id) ||
              (where.code && n.code === where.code) ||
              (where.idempotencyKey && n.idempotencyKey === where.idempotencyKey)
          ) || null
        )
      }),
      findMany: vi.fn(async () => mockStore.notifications),
      count: vi.fn(async () => mockStore.notifications.length),
      update: vi.fn(async ({ where, data }: any) => {
        const idx = mockStore.notifications.findIndex((n) => n.id === where.id)
        if (idx === -1) throw new Error("Notification not found")
        mockStore.notifications[idx] = { ...mockStore.notifications[idx], ...data, updatedAt: new Date() }
        return mockStore.notifications[idx]
      }),
    },
    ssmNotificationRecipient: {
      findFirst: vi.fn(async ({ where }: any) => {
        return (
          mockStore.recipients.find(
            (r) =>
              (!where.id || r.id === where.id) &&
              (!where.notificationId || r.notificationId === where.notificationId) &&
              (!where.recipientUserId || r.recipientUserId === where.recipientUserId) &&
              (!where.studentId || r.studentId === where.studentId) &&
              (!where.recipientRole || r.recipientRole === where.recipientRole)
          ) || null
        )
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        return mockStore.recipients.find((r) => r.id === where.id) || null
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return mockStore.recipients.filter((r) => {
          if (where?.notificationId && r.notificationId !== where.notificationId) return false
          if (where?.isRead !== undefined && r.isRead !== where.isRead) return false
          return true
        })
      }),
      create: vi.fn(async ({ data }: any) => {
        const rec = {
          id: data.id || `rec_${mockStore.recipients.length + 1}`,
          deliveryStatus: "SENT",
          isRead: false,
          isAcknowledged: false,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        mockStore.recipients.push(rec)
        return rec
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const idx = mockStore.recipients.findIndex((r) => r.id === where.id)
        if (idx === -1) throw new Error("Recipient not found")
        mockStore.recipients[idx] = { ...mockStore.recipients[idx], ...data, updatedAt: new Date() }
        return mockStore.recipients[idx]
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0
        mockStore.recipients.forEach((r, i) => {
          if (!where?.notificationId || r.notificationId === where.notificationId) {
            mockStore.recipients[i] = { ...r, ...data, updatedAt: new Date() }
            count++
          }
        })
        return { count }
      }),
      count: vi.fn(async ({ where }: any) => {
        return mockStore.recipients.filter((r) => {
          if (where?.notificationId && r.notificationId !== where.notificationId) return false
          if (where?.isRead !== undefined && r.isRead !== where.isRead) return false
          if (where?.isAcknowledged !== undefined && r.isAcknowledged !== where.isAcknowledged) return false
          return true
        }).length
      }),
    },
    ssmNotificationDelivery: {
      create: vi.fn(async ({ data }: any) => {
        const del = { id: `del_${mockStore.deliveries.length + 1}`, ...data, createdAt: new Date() }
        mockStore.deliveries.push(del)
        return del
      }),
      count: vi.fn(async ({ where }: any) => {
        return mockStore.deliveries.filter(
          (d) =>
            (!where?.notificationId || d.notificationId === where.notificationId) &&
            (!where?.status || d.status === where.status)
        ).length
      }),
    },
    ssmNotificationEvent: {
      findUnique: vi.fn(async ({ where }: any) => {
        return mockStore.events.find((e) => e.idempotencyKey === where.idempotencyKey) || null
      }),
      create: vi.fn(async ({ data }: any) => {
        const ev = { id: `ev_${mockStore.events.length + 1}`, ...data, createdAt: new Date() }
        mockStore.events.push(ev)
        return ev
      }),
    },
    ssmNotificationReadReceipt: {
      create: vi.fn(async ({ data }: any) => {
        const rr = { id: `rr_${mockStore.readReceipts.length + 1}`, ...data }
        mockStore.readReceipts.push(rr)
        return rr
      }),
    },
    ssmNotificationResponse: {
      create: vi.fn(async ({ data }: any) => {
        const resp = { id: `resp_${mockStore.responses.length + 1}`, ...data, createdAt: new Date() }
        mockStore.responses.push(resp)
        return resp
      }),
      count: vi.fn(async ({ where }: any) => {
        return mockStore.responses.filter((r) => r.notificationId === where.notificationId).length
      }),
    },
    ssmNotificationAuditLog: {
      create: vi.fn(async ({ data }: any) => {
        const log = { id: `log_${mockStore.auditLogs.length + 1}`, ...data, createdAt: new Date() }
        mockStore.auditLogs.push(log)
        return log
      }),
    },
    ssmNotificationAttachment: {
      create: vi.fn(async ({ data }: any) => {
        const att = { id: `att_${mockStore.attachments.length + 1}`, ...data, createdAt: new Date() }
        mockStore.attachments.push(att)
        return att
      }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    ssmNotificationApproval: {
      create: vi.fn(async ({ data }: any) => {
        const app = { id: `app_${mockStore.approvals.length + 1}`, ...data, createdAt: new Date() }
        mockStore.approvals.push(app)
        return app
      }),
    },
    testingPeriod: {
      findUnique: vi.fn(async ({ where }: any) => {
        return mockStore.testingPeriods.find((p) => p.id === where.id) || null
      }),
    },
    testingSubjectExam: {
      findUnique: vi.fn(async ({ where }: any) => {
        return mockStore.testingSubjectExams.find((e) => e.id === where.id) || null
      }),
    },
    testingSession: {
      findUnique: vi.fn(async ({ where }: any) => {
        return mockStore.testingSessions.find((s) => s.id === where.id) || null
      }),
      findFirst: vi.fn(async () => mockStore.testingSessions[0] || null),
    },
    testingCandidateResult: {
      findMany: vi.fn(async () => mockStore.testingCandidateResults),
    },
    student: {
      findMany: vi.fn(async ({ where }: any) => {
        return mockStore.students.filter((s) => {
          if (where?.classId?.in && !where.classId.in.includes(s.classId)) return false
          return true
        })
      }),
    },
  }
  return { prisma: prismaMock }
})

import {
  assertSenderPermissions,
  createOrPublishNotification,
  triggerExamNotificationEvent,
  listNotificationsForViewer,
  interactWithNotification,
  transitionNotificationWorkflow,
  NotificationActorContext,
} from "../notificationCenterService"
import {
  sanitizeNotificationHtml,
  validateNotificationAttachment,
} from "../constants"

describe("Trung tâm Thông báo & Liên lạc (Notification & Communication Center) — 11 Mandatory Scenarios", () => {
  const ktdbclActor: NotificationActorContext = {
    userId: "user_ktdbcl_1",
    userEmail: "ktdbcl@skylineschool.edu.vn",
    userName: "Ban KT&ĐBCL",
    role: "KTDBCL",
    isSuperAdmin: false,
    isAdmin: false,
    isKTDBCL: true,
    isTeacher: false,
    isGVCN: false,
    isGVBM: false,
    isParent: false,
    isStudent: false,
    allowedCampusIds: ["campus_cs1"],
    teacherId: null,
    homeroomClassIds: [],
    subjectAssignments: [],
    parentId: null,
    linkedStudents: [],
    studentProfile: null,
  }

  const gvcnActor: NotificationActorContext = {
    userId: "user_gvcn_1",
    userEmail: "gvcn9a1@skylineschool.edu.vn",
    userName: "Cô Nguyễn Thị Minh (GVCN 9A1)",
    role: "TEACHER",
    isSuperAdmin: false,
    isAdmin: false,
    isKTDBCL: false,
    isTeacher: true,
    isGVCN: true,
    isGVBM: false,
    isParent: false,
    isStudent: false,
    allowedCampusIds: ["campus_cs1"],
    teacherId: "teacher_gvcn_1",
    homeroomClassIds: ["class_9A1"],
    subjectAssignments: [
      {
        classId: "class_9A1",
        className: "9/1",
        grade: "9",
        campusId: "campus_cs1",
        subjectId: "subj_math",
        subjectName: "Toán học",
      },
    ],
    parentId: null,
    linkedStudents: [],
    studentProfile: null,
  }

  const gvbmActor: NotificationActorContext = {
    userId: "user_gvbm_1",
    userEmail: "gvbmtoan@skylineschool.edu.vn",
    userName: "Thầy Trần Văn Hùng (GVBM Toán)",
    role: "TEACHER",
    isSuperAdmin: false,
    isAdmin: false,
    isKTDBCL: false,
    isTeacher: true,
    isGVCN: false,
    isGVBM: true,
    isParent: false,
    isStudent: false,
    allowedCampusIds: ["campus_cs1"],
    teacherId: "teacher_gvbm_1",
    homeroomClassIds: [],
    subjectAssignments: [
      {
        classId: "class_9A1",
        className: "9/1",
        grade: "9",
        campusId: "campus_cs1",
        subjectId: "subj_math",
        subjectName: "Toán học",
      },
    ],
    parentId: null,
    linkedStudents: [],
    studentProfile: null,
  }

  const parentActor: NotificationActorContext = {
    userId: "user_parent_1",
    userEmail: "phhs@skylineschool.edu.vn",
    userName: "PHHS Lê Văn An",
    role: "PARENT",
    isSuperAdmin: false,
    isAdmin: false,
    isKTDBCL: false,
    isTeacher: false,
    isGVCN: false,
    isGVBM: false,
    isParent: true,
    isStudent: false,
    allowedCampusIds: ["campus_cs1"],
    teacherId: null,
    homeroomClassIds: [],
    subjectAssignments: [],
    parentId: "parent_1",
    linkedStudents: [
      {
        studentId: "student_1",
        studentCode: "HS001",
        studentName: "Lê Minh Khôi",
        classId: "class_9A1",
        className: "9/1",
        grade: "9",
        campusId: "campus_cs1",
        campusName: "Sky-Line Hill",
        relationship: "Cha",
      },
    ],
    studentProfile: null,
  }

  const studentActor: NotificationActorContext = {
    userId: "STUDENT:student_1",
    userEmail: "hs001@skylineschool.edu.vn",
    userName: "Học sinh Lê Minh Khôi",
    role: "STUDENT",
    isSuperAdmin: false,
    isAdmin: false,
    isKTDBCL: false,
    isTeacher: false,
    isGVCN: false,
    isGVBM: false,
    isParent: false,
    isStudent: true,
    allowedCampusIds: ["campus_cs1"],
    teacherId: null,
    homeroomClassIds: [],
    subjectAssignments: [],
    parentId: null,
    linkedStudents: [
      {
        studentId: "student_1",
        studentCode: "HS001",
        studentName: "Lê Minh Khôi",
        classId: "class_9A1",
        className: "9/1",
        grade: "9",
        campusId: "campus_cs1",
        campusName: "Sky-Line Hill",
        relationship: "Bản thân",
      },
    ],
    studentProfile: {
      studentId: "student_1",
      studentCode: "HS001",
      studentName: "Lê Minh Khôi",
      classId: "class_9A1",
      className: "9/1",
      grade: "9",
      campusId: "campus_cs1",
      campusName: "Sky-Line Hill",
      relationship: "Bản thân",
    },
  }

  beforeEach(() => {
    mockStore.notifications.length = 0
    mockStore.recipients.length = 0
    mockStore.deliveries.length = 0
    mockStore.events.length = 0
    mockStore.readReceipts.length = 0
    mockStore.responses.length = 0
    mockStore.auditLogs.length = 0
    mockStore.attachments.length = 0
    mockStore.approvals.length = 0
    mockStore.testingPeriods = [
      {
        id: "period_gk2",
        code: "KT-GK2-2026",
        name: "Kiểm tra Giữa Học kỳ II (2025-2026)",
        semester: "HK2",
        campusId: "campus_cs1",
        gradeLevels: "9",
        academicYear: { id: "ay_2526", name: "2025-2026" },
      },
    ]
    mockStore.testingSubjectExams = []
    mockStore.testingSessions = [
      {
        id: "sess_1",
        classId: "class_9A1",
        roomName: "Phòng 302 - Nhà B",
        startTime: "07:30",
        endTime: "09:00",
        examDate: new Date("2026-04-25T07:30:00Z"),
      },
    ]
    mockStore.testingCandidateResults = []
    mockStore.students = [
      {
        id: "student_1",
        studentCode: "HS001",
        studentName: "Lê Minh Khôi",
        classId: "class_9A1",
        campusId: "campus_cs1",
        email: "hs001@skylineschool.edu.vn",
        class: {
          id: "class_9A1",
          className: "9/1",
          grade: "9",
          campusId: "campus_cs1",
        },
        campus: { id: "campus_cs1", campusCode: "CS1", campusName: "Sky-Line Hill" },
        parents: [
          {
            parent: {
              id: "parent_1",
              userId: "user_parent_1",
              parentName: "PHHS Lê Văn An",
              email: "phhs@skylineschool.edu.vn",
            },
          },
        ],
      },
    ]
  })

  it("1. Kiểm tra quyền tạo và gửi thông báo của Ban KT&ĐBCL, GVCN, GVBM, PHHS, HS", () => {
    // Ban KT&ĐBCL được phép phát hành mọi thông báo Khảo thí và Kết quả học tập
    expect(() =>
      assertSenderPermissions(ktdbclActor, {
        category: "EXAM",
        subType: "EXAM_SCHEDULE",
        action: "PUBLISH",
      })
    ).not.toThrow()

    // GVCN được phép gửi thông báo đến lớp chủ nhiệm của mình
    expect(() =>
      assertSenderPermissions(gvcnActor, {
        category: "TEACHER",
        subType: "GVCN_ANNOUNCEMENT",
        classIds: ["class_9A1"],
        action: "PUBLISH",
      })
    ).not.toThrow()

    // GVBM được phép gửi thông báo môn học đúng lớp và môn phân công
    expect(() =>
      assertSenderPermissions(gvbmActor, {
        category: "TEACHER",
        subType: "GVBM_STUDY_GUIDE",
        classIds: ["class_9A1"],
        subjectId: "subj_math",
        action: "PUBLISH",
      })
    ).not.toThrow()

    // PHHS và Học sinh bị chặn quyền phát hành thông báo (HTTP 403)
    expect(() =>
      assertSenderPermissions(parentActor, {
        category: "TEACHER",
        subType: "GVCN_ANNOUNCEMENT",
        classIds: ["class_9A1"],
        action: "PUBLISH",
      })
    ).toThrow(/không có quyền phát hành/)

    expect(() =>
      assertSenderPermissions(studentActor, {
        category: "EXAM",
        subType: "EXAM_SCHEDULE",
        classIds: ["class_9A1"],
        action: "PUBLISH",
      })
    ).toThrow(/không có quyền phát hành/)
  })

  it("2. PHHS chỉ xem được thông báo của con mình (Chống IDOR qua tham số studentId)", async () => {
    // Khi PHHS cố tình truyền studentId của học sinh khác ("student_999_other"), hệ thống ném lỗi 403
    await expect(
      listNotificationsForViewer(parentActor, {
        mode: "INBOX",
        studentId: "student_999_other",
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN_STUDENT_ACCESS",
      status: 403,
    })
  })

  it("3. GVBM không gửi được thông báo ngoài lớp hoặc môn được phân công; không được tự ý đổi lịch thi/công bố điểm", () => {
    // GVBM gửi sang lớp 9A2 (không thuộc phân công) -> Bị chặn 403
    expect(() =>
      assertSenderPermissions(gvbmActor, {
        category: "TEACHER",
        subType: "GVBM_STUDY_GUIDE",
        classIds: ["class_9A2_unassigned"],
        subjectId: "subj_math",
        action: "PUBLISH",
      })
    ).toThrow(/phạm vi phân công/)

    // GVBM gửi môn Ngữ văn (không thuộc phân công) -> Bị chặn 403
    expect(() =>
      assertSenderPermissions(gvbmActor, {
        category: "TEACHER",
        subType: "GVBM_STUDY_GUIDE",
        classIds: ["class_9A1"],
        subjectId: "subj_literature_unassigned",
        action: "PUBLISH",
      })
    ).toThrow(/phạm vi phân công/)

    // Giáo viên không được tự ý phát hành thông báo thay đổi lịch kiểm tra chính thức hoặc công bố điểm chưa duyệt
    expect(() =>
      assertSenderPermissions(gvcnActor, {
        category: "EXAM",
        subType: "EXAM_SCHEDULE_CHANGE",
        classIds: ["class_9A1"],
        action: "PUBLISH",
      })
    ).toThrow(/không được phép tự ý phát hành/)
  })

  it("4. Không phát hành được thông báo điểm chưa duyệt; khi đã duyệt không lộ điểm cá nhân ngoài màn hình chi tiết", async () => {
    // Khi chưa có kết quả nào đạt trạng thái APPROVED -> Hệ thống từ chối phát hành (400)
    mockStore.testingCandidateResults = [
      { id: "res_1", studentId: "student_1", classId: "class_9A1", approvalStatus: "PENDING", finalScore: 9.5 },
    ]
    await expect(
      triggerExamNotificationEvent(ktdbclActor, {
        eventType: "EVENT_EXAM_RESULT_PUBLISHED",
        testingPeriodId: "period_gk2",
      })
    ).rejects.toMatchObject({
      code: "UNAPPROVED_EXAM_RESULTS",
      status: 400,
    })

    // Khi kết quả đã được phê duyệt (APPROVED) -> Phát hành thành công nhưng summary/content không chứa điểm số cá nhân (9.5)
    mockStore.testingCandidateResults = [
      { id: "res_1", studentId: "student_1", classId: "class_9A1", approvalStatus: "APPROVED", finalScore: 9.5 },
    ]
    const approvedRes = await triggerExamNotificationEvent(ktdbclActor, {
      eventType: "EVENT_EXAM_RESULT_PUBLISHED",
      testingPeriodId: "period_gk2",
    })
    expect(approvedRes.deduplicated).toBe(false)
    expect(approvedRes.notification?.summary).not.toContain("9.5")
    expect(approvedRes.notification?.deepLink).toBe("/parent/grades")
  })

  it("5. Không gửi trùng thông báo khi sự kiện khảo thí lặp lại (Idempotency Key)", async () => {
    const firstTrigger = await triggerExamNotificationEvent(ktdbclActor, {
      eventType: "EVENT_EXAM_SCHEDULE_PUBLISHED",
      testingPeriodId: "period_gk2",
    })
    expect(firstTrigger.deduplicated).toBe(false)

    const duplicateTrigger = await triggerExamNotificationEvent(ktdbclActor, {
      eventType: "EVENT_EXAM_SCHEDULE_PUBLISHED",
      testingPeriodId: "period_gk2",
    })
    expect(duplicateTrigger.deduplicated).toBe(true)
    // Đảm bảo chỉ có đúng 1 bản ghi thông báo được tạo
    expect(mockStore.notifications.length).toBe(1)
  })

  it("6. Không mất thông báo khi một kênh phụ (Email / Zalo) gặp lỗi", async () => {
    // Giả lập kênh EMAIL gặp lỗi khi gửi nhưng kênh chính IN_APP vẫn thành công
    const res = await createOrPublishNotification(ktdbclActor, {
      title: "Thông báo Lịch thi Giữa kỳ II",
      contentHtml: "<p>Nội dung lịch thi chính thức</p>",
      category: "EXAM",
      subType: "EXAM_SCHEDULE",
      classIds: ["class_9A1"],
      channels: ["IN_APP", "EMAIL"],
      simulateChannelFailure: ["EMAIL"],
      action: "PUBLISH",
    })

    // Thông báo vẫn được tạo, phân phối cho người nhận qua IN_APP và ghi nhận trạng thái PARTIALLY_FAILED để theo dõi kênh phụ
    expect(res.notification.status).toBe("PARTIALLY_FAILED")
    expect(res.notification.sentSuccessCount).toBeGreaterThan(0)
    expect(mockStore.recipients.length).toBeGreaterThan(0)
    expect(mockStore.recipients[0].deliveryStatus).toBe("SENT")
  })

  it("7 & 8. Trạng thái đã đọc ghi nhận chính xác VÀ Xác nhận thông báo hoạt động độc lập với trạng thái đã đọc", async () => {
    const createRes = await createOrPublishNotification(ktdbclActor, {
      title: "Thông báo Cần xác nhận của PHHS",
      contentHtml: "<p>Đề nghị Quý Phụ huynh xác nhận đã nắm lịch kiểm tra.</p>",
      category: "EXAM",
      subType: "EXAM_SCHEDULE",
      classIds: ["class_9A1"],
      requireAcknowledge: true,
      allowReply: true,
      action: "PUBLISH",
    })
    const notifId = createRes.notification.id

    // Bước 1: Phụ huynh mở đọc thông báo (MARK_READ)
    const readRes = await interactWithNotification(parentActor, {
      notificationId: notifId,
      studentId: "student_1",
      action: "MARK_READ",
    })
    expect(readRes.success).toBe(true)

    const parentRecipientAfterRead = mockStore.recipients.find(
      (r) => r.notificationId === notifId && r.recipientRole === "PARENT"
    )
    expect(parentRecipientAfterRead.isRead).toBe(true)
    // QUAN TRỌNG (Mục 8): Đã đọc KHÔNG tự động đánh dấu Đã xác nhận (isAcknowledged vẫn là false)
    expect(parentRecipientAfterRead.isAcknowledged).toBe(false)
    expect(mockStore.readReceipts.length).toBe(1)

    // Bước 2: Phụ huynh nhấn nút "Xác nhận đã xem thông báo" (ACKNOWLEDGE)
    const ackRes = await interactWithNotification(parentActor, {
      notificationId: notifId,
      studentId: "student_1",
      action: "ACKNOWLEDGE",
      acknowledgeNote: "Gia đình đã nắm rõ lịch thi của con.",
    })
    expect(ackRes.success).toBe(true)

    const parentRecipientAfterAck = mockStore.recipients.find(
      (r) => r.notificationId === notifId && r.recipientRole === "PARENT"
    )
    expect(parentRecipientAfterAck.isAcknowledged).toBe(true)
    expect(parentRecipientAfterAck.acknowledgedAt).toBeInstanceOf(Date)
  })

  it("9. Thu hồi thông báo cập nhật đúng trạng thái RECALLED và lưu Audit Log", async () => {
    const createRes = await createOrPublishNotification(ktdbclActor, {
      title: "Thông báo cần thu hồi để đính chính phòng thi",
      contentHtml: "<p>Phòng thi 201</p>",
      category: "EXAM",
      subType: "EXAM_SCHEDULE",
      classIds: ["class_9A1"],
      action: "PUBLISH",
    })
    const notifId = createRes.notification.id

    const recallRes = await transitionNotificationWorkflow(ktdbclActor, {
      notificationId: notifId,
      action: "RECALL",
      comment: "Đính chính sơ đồ phòng kiểm tra tầng 3",
    })
    expect(recallRes.notification.status).toBe("RECALLED")
    expect(recallRes.notification.recallReason).toBe("Đính chính sơ đồ phòng kiểm tra tầng 3")

    const recallAudit = mockStore.auditLogs.find(
      (l) => l.notificationId === notifId && l.action === "RECALL"
    )
    expect(recallAudit).toBeDefined()
    expect(recallAudit.note).toBe("Đính chính sơ đồ phòng kiểm tra tầng 3")
  })

  it("10. Truy cập trực tiếp thao tác quản trị khi không có quyền bị chặn (403)", async () => {
    const createRes = await createOrPublishNotification(ktdbclActor, {
      title: "Thông báo Khảo thí cấp Hệ thống",
      contentHtml: "<p>Nội dung</p>",
      category: "EXAM",
      subType: "EXAM_SCHEDULE",
      classIds: ["class_9A1"],
      action: "PUBLISH",
    })
    const notifId = createRes.notification.id

    // Học sinh cố tình gọi workflow RECALL -> bị chặn 403
    await expect(
      transitionNotificationWorkflow(studentActor, {
        notificationId: notifId,
        action: "RECALL",
        comment: "Hack recall",
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN_RECALL",
      status: 403,
    })

    // Giáo viên cố tình gọi trigger sự kiện khảo thí tự động của Ban KT&ĐBCL -> bị chặn 403
    await expect(
      triggerExamNotificationEvent(gvbmActor, {
        eventType: "EVENT_EXAM_SCHEDULE_PUBLISHED",
        testingPeriodId: "period_gk2",
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN_EVENT_TRIGGER",
      status: 403,
    })
  })

  it("11. Bảo mật chống XSS trong nội dung thông báo và kiểm tra định dạng/dung lượng tệp đính kèm", () => {
    const maliciousHtml = `<p onclick="evil()">Thông báo <script>alert('xss')</script><a href="javascript:stealCookie()">Link độc</a><iframe src="https://evil.com"></iframe></p>`
    const cleanHtml = sanitizeNotificationHtml(maliciousHtml)
    expect(cleanHtml).not.toContain("<script")
    expect(cleanHtml).not.toContain("onclick=")
    expect(cleanHtml).not.toContain("javascript:")
    expect(cleanHtml).not.toContain("<iframe")
    expect(cleanHtml).toContain("Thông báo")

    // Kiểm tra tệp đính kèm hợp lệ (.pdf < 15MB)
    expect(
      validateNotificationAttachment({
        fileName: "Lich-kiem-tra-HK2.pdf",
        fileType: "application/pdf",
        fileSize: 2 * 1024 * 1024,
      }).valid
    ).toBe(true)

    // Chặn tệp thực thi nguy hiểm (.exe, .js, .html)
    expect(
      validateNotificationAttachment({
        fileName: "malware.exe",
        fileType: "application/x-msdownload",
        fileSize: 1024,
      }).valid
    ).toBe(false)

    // Chặn tệp vượt quá 15MB
    expect(
      validateNotificationAttachment({
        fileName: "oversized.pdf",
        fileType: "application/pdf",
        fileSize: 20 * 1024 * 1024,
      }).valid
    ).toBe(false)
  })
})
