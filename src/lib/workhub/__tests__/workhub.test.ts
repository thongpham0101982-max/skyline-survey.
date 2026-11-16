import { beforeEach, describe, expect, it, vi } from "vitest"
import { createClient, Client } from "@libsql/client"

let memClient: Client
let memTasks: any[] = []
let memComments: any[] = []
let memAttachments: any[] = []
let memNotifications: any[] = []
let memAuditLogs: any[] = []
let memUsers: any[] = []
let memDepartments: any[] = []
let memCampuses: any[] = []
let memTeachers: any[] = []

vi.mock("@/lib/mail", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}))

vi.mock("@/lib/session", () => ({
  getOperationalScope: vi.fn().mockResolvedValue({}),
}))

vi.mock("@/lib/db", () => {
  return {
    prisma: {
      $executeRawUnsafe: async (sql: string, ...args: any[]) => {
        // Strip foreign key clause in ephemeral memory test since WorkTask is in JS array
        const cleanedSql = sql.replace(/,\s*FOREIGN KEY\s*\("taskId"\)[^)]+\)\s*ON DELETE CASCADE/gi, "")
        await memClient.execute({ sql: cleanedSql, args })
        return 1
      },
      $queryRawUnsafe: async (sql: string, ...args: any[]) => {
        const res = await memClient.execute({ sql, args })
        return res.rows as any[]
      },
      workTask: {
        create: async ({ data }: any) => {
          const rec = {
            id: `wt_${memTasks.length + 1}_${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            completedAt: null,
            ...data,
          }
          memTasks.push(rec)
          return rec
        },
        findUnique: async ({ where }: any) => {
          const found = memTasks.find((t) => t.id === where.id)
          if (!found) return null
          return {
            ...found,
            attachments: memAttachments.filter((a) => a.taskId === found.id),
          }
        },
        update: async ({ where, data }: any) => {
          const idx = memTasks.findIndex((t) => t.id === where.id)
          if (idx === -1) throw new Error("Task not found")
          memTasks[idx] = { ...memTasks[idx], ...data, updatedAt: new Date() }
          return memTasks[idx]
        },
        findMany: async ({ where }: any) => {
          return memTasks
            .filter((t) => {
              if (where?.academicYearId && t.academicYearId !== where.academicYearId) return false
              if (where?.OR) {
                return where.OR.some((cond: any) => {
                  if (cond.assignedToUserId?.in) {
                    return cond.assignedToUserId.in.includes(t.assignedToUserId)
                  }
                  if (cond.assignedToUserId) return t.assignedToUserId === cond.assignedToUserId
                  if (cond.assignedById) return t.assignedById === cond.assignedById
                  if (cond.collaborators?.contains) {
                    return String(t.collaborators || "").includes(cond.collaborators.contains)
                  }
                  return false
                })
              }
              return true
            })
            .map((t) => ({
              ...t,
              assignedBy: memUsers.find((u) => u.id === t.assignedById) || {
                id: t.assignedById,
                fullName: "Người giao",
              },
              assignedToUser: memUsers.find((u) => u.id === t.assignedToUserId) || null,
              attachments: memAttachments.filter((a) => a.taskId === t.id),
              comments: memComments.filter((c) => c.taskId === t.id),
            }))
        },
      },
      taskComment: {
        create: async ({ data }: any) => {
          const c = { id: `cmt_${memComments.length + 1}`, createdAt: new Date(), ...data }
          memComments.push(c)
          return c
        },
        findMany: async ({ where }: any) => memComments.filter((c) => c.taskId === where.taskId),
      },
      taskAttachment: {
        create: async ({ data }: any) => {
          const a = { id: `att_${memAttachments.length + 1}`, createdAt: new Date(), ...data }
          memAttachments.push(a)
          return a
        },
        findMany: async ({ where }: any) =>
          memAttachments.filter((a) => a.taskId === where.taskId),
      },
      notification: {
        create: async ({ data }: any) => {
          const n = { id: `ntf_${memNotifications.length + 1}`, ...data }
          memNotifications.push(n)
          return n
        },
      },
      auditLog: {
        create: async ({ data }: any) => {
          const al = { id: `aud_${memAuditLogs.length + 1}`, ...data }
          memAuditLogs.push(al)
          return al
        },
      },
      department: {
        findMany: async () => memDepartments,
        findUnique: async ({ where }: any) =>
          memDepartments.find((d) => d.id === where.id) || null,
      },
      campus: {
        findMany: async () => memCampuses,
        findUnique: async ({ where }: any) => memCampuses.find((c) => c.id === where.id) || null,
      },
      user: {
        findMany: async ({ where }: any) => {
          if (where?.id?.in) return memUsers.filter((u) => where.id.in.includes(u.id))
          return memUsers
        },
        findUnique: async ({ where }: any) => memUsers.find((u) => u.id === where.id) || null,
      },
      teacher: {
        findMany: async ({ where }: any) => {
          if (where?.OR) {
            return memTeachers.filter((t) =>
              where.OR.some((c: any) => c.departmentId === t.departmentId)
            )
          }
          if (where?.campusId) return memTeachers.filter((t) => t.campusId === where.campusId)
          return memTeachers
        },
      },
    },
  }
})

import {
  computeWorkHubDeadlineTruth,
  createRecurrenceTemplateAndGenerateInstance,
  createWorkHubTask,
  executeWorkHubTaskTransition,
  generateTaskForRecurrencePeriod,
  getWorkHubTaskHistory,
  listScopedWorkHubTasks,
  selectCanonicalStatisticalTasks,
} from "../taskEngine"
import {
  createWorkHubPlan,
  getWorkHubPlanVersions,
  updateOrApproveWorkHubPlan,
} from "../planEngine"
import {
  reviewOrReviseWorkHubReport,
  saveOrSubmitWorkHubReport,
} from "../reportEngine"
import {
  calculateKpiFormulaFromSources,
  computeKpiScorecardSummary,
  evaluateKpiOutcomeBand,
  evaluateTargetWorkHubKpis,
  recordOrConfirmKpiEvaluation,
  saveWorkHubKpiDefinition,
} from "../kpiEngine"
import {
  buildWorkHubDashboardData,
  dispatchWorkHubDigestReminders,
  generateWorkHubAiReportAssist,
} from "../dashboardAndAiEngine"
import { APP_CATEGORIES } from "@/config/modules"
import {
  buildWorkHubReportDocumentHtml,
  buildWorkHubReportWorkbook,
} from "../exportUtils"
import { WorkHubForbiddenError, WorkHubValidationError } from "../permissions"
import type { WorkHubActorScope } from "../types"

const deptHeadA: WorkHubActorScope = {
  userId: "u_head_a",
  userName: "Trưởng Phòng Đào tạo A",
  email: "heada@skylineschool.edu.vn",
  roleCode: "TTCM",
  roleTier: "DEPARTMENT_HEAD",
  isSuperAdmin: false,
  isExecutive: false,
  isDepartmentHead: true,
  isCampusHead: false,
  canAssignTasks: true,
  canViewOrgTracking: true,
  canManageSettings: false,
  canManageKpiDefinitions: true,
  primaryDepartmentId: "dept_a",
  primaryDepartmentName: "Phòng Đào tạo A",
  primaryCampusId: "camp_1",
  primaryCampusName: "Cơ sở Hill",
  managedDepartmentIds: ["dept_a"],
  managedCampusIds: ["camp_1"],
  scopedUserIds: ["u_head_a", "u_staff_a1", "u_staff_a2"],
}

const staffA1: WorkHubActorScope = {
  userId: "u_staff_a1",
  userName: "Chuyên viên Nguyễn Văn An",
  email: "annv@skylineschool.edu.vn",
  roleCode: "TEACHER",
  roleTier: "INDIVIDUAL",
  isSuperAdmin: false,
  isExecutive: false,
  isDepartmentHead: false,
  isCampusHead: false,
  canAssignTasks: false,
  canViewOrgTracking: false,
  canManageSettings: false,
  canManageKpiDefinitions: false,
  primaryDepartmentId: "dept_a",
  primaryDepartmentName: "Phòng Đào tạo A",
  primaryCampusId: "camp_1",
  primaryCampusName: "Cơ sở Hill",
  managedDepartmentIds: [],
  managedCampusIds: ["camp_1"],
  scopedUserIds: ["u_staff_a1"],
}

const staffDeptB: WorkHubActorScope = {
  userId: "u_staff_b1",
  userName: "Nhân sự Phòng B",
  email: "b1@skylineschool.edu.vn",
  roleCode: "TEACHER",
  roleTier: "INDIVIDUAL",
  isSuperAdmin: false,
  isExecutive: false,
  isDepartmentHead: false,
  isCampusHead: false,
  canAssignTasks: false,
  canViewOrgTracking: false,
  canManageSettings: false,
  canManageKpiDefinitions: false,
  primaryDepartmentId: "dept_b",
  primaryDepartmentName: "Phòng Khảo thí B",
  primaryCampusId: "camp_2",
  primaryCampusName: "Cơ sở Global",
  managedDepartmentIds: [],
  managedCampusIds: ["camp_2"],
  scopedUserIds: ["u_staff_b1"],
}

const execAdmin: WorkHubActorScope = {
  userId: "u_exec",
  userName: "Ban Điều hành Hệ thống",
  email: "exec@skylineschool.edu.vn",
  roleCode: "ADMIN",
  roleTier: "EXECUTIVE",
  isSuperAdmin: true,
  isExecutive: true,
  isDepartmentHead: false,
  isCampusHead: false,
  canAssignTasks: true,
  canViewOrgTracking: true,
  canManageSettings: true,
  canManageKpiDefinitions: true,
  primaryDepartmentId: null,
  primaryDepartmentName: null,
  primaryCampusId: null,
  primaryCampusName: null,
  managedDepartmentIds: null,
  managedCampusIds: null,
  scopedUserIds: null,
}

describe("WorkHub End-to-End Verification Suite (All 8 Required Flows)", () => {
  beforeEach(async () => {
    memClient = createClient({ url: ":memory:" })
    const schemaMod = await import("../schemaInit")
    schemaMod.resetWorkHubSchemaInitForTest()
    await schemaMod.ensureWorkHubSchema()

    memTasks = []
    memComments = []
    memAttachments = []
    memNotifications = []
    memAuditLogs = []
    memDepartments = [
      { id: "dept_a", code: "DT_A", name: "Phòng Đào tạo A", divisionCode: "BP_TRUNG_HOC" },
      { id: "dept_b", code: "KT_B", name: "Phòng Khảo thí B", divisionCode: "BAN_KT_DBCL" },
    ]
    memCampuses = [
      { id: "camp_1", campusCode: "CS1", campusName: "Cơ sở Hill" },
      { id: "camp_2", campusCode: "CS2", campusName: "Cơ sở Global" },
    ]
    memUsers = [
      {
        id: "u_head_a",
        fullName: "Trưởng Phòng Đào tạo A",
        role: "TTCM",
        teacher: { departmentId: "dept_a", campusId: "camp_1" },
      },
      {
        id: "u_staff_a1",
        fullName: "Chuyên viên Nguyễn Văn An",
        role: "TEACHER",
        teacher: { departmentId: "dept_a", campusId: "camp_1" },
      },
      {
        id: "u_staff_a2",
        fullName: "Giáo viên Lê Thị Bình",
        role: "TEACHER",
        teacher: { departmentId: "dept_a", campusId: "camp_1" },
      },
      {
        id: "u_staff_b1",
        fullName: "Nhân sự Phòng B",
        role: "TEACHER",
        teacher: { departmentId: "dept_b", campusId: "camp_2" },
      },
    ]
    memTeachers = [
      {
        userId: "u_staff_a1",
        teacherName: "Chuyên viên Nguyễn Văn An",
        departmentId: "dept_a",
        campusId: "camp_1",
        departmentRel: { name: "Phòng Đào tạo A" },
      },
      {
        userId: "u_staff_a2",
        teacherName: "Giáo viên Lê Thị Bình",
        departmentId: "dept_a",
        campusId: "camp_1",
        departmentRel: { name: "Phòng Đào tạo A" },
      },
    ]
  })

  it("Flow 1 & 2: Task lifecycle (100% != Completed, Submit -> Revision -> IN_PROGRESS -> Complete, Pause/Cancel reason, Deadline change & History)", async () => {
    const created = await createWorkHubTask(deptHeadA, {
      title: "Xây dựng ngân hàng câu hỏi Học kỳ I",
      description: "Biên soạn 120 câu hỏi chuẩn hóa",
      departmentId: "dept_a",
      campusId: "camp_1",
      assignedToUserId: "u_staff_a1",
      reviewerUserId: "u_head_a",
      startDate: "2026-11-01",
      endDate: "2026-11-10",
      priority: "HIGH",
      acceptanceCriteria: "Đủ ma trận đặc tả",
      deliverables: "Bộ đề PDF + Đáp án",
    })

    // 1. Staff updates progress to 100% -> MUST STILL BE IN_PROGRESS (NOT COMPLETED!)
    const prog100 = await executeWorkHubTaskTransition(staffA1, {
      taskId: created.taskId,
      action: "UPDATE_PROGRESS",
      progressPercent: 100,
      resultSummary: "Đã biên soạn xong bản đầu tiên",
    })
    expect(prog100.progressPercent).toBe(100)
    expect(prog100.workStatus).toBe("IN_PROGRESS")

    // 2. Staff tries to self-approve -> MUST BE FORBIDDEN
    await expect(
      executeWorkHubTaskTransition(staffA1, {
        taskId: created.taskId,
        action: "APPROVE_COMPLETE",
      })
    ).rejects.toThrow(WorkHubForbiddenError)

    // 3. Submit for review -> PENDING_REVIEW
    const sub1 = await executeWorkHubTaskTransition(staffA1, {
      taskId: created.taskId,
      action: "SUBMIT_FOR_REVIEW",
      resultSummary: "Đã hoàn thiện 120 câu hỏi gửi duyệt",
    })
    expect(sub1.workStatus).toBe("PENDING_REVIEW")

    // 4. Reviewer requests revision -> MUST require feedback & return to IN_PROGRESS
    await expect(
      executeWorkHubTaskTransition(deptHeadA, {
        taskId: created.taskId,
        action: "REQUEST_REVISION",
        reviewComment: "",
      })
    ).rejects.toThrow(WorkHubValidationError)

    const rev = await executeWorkHubTaskTransition(deptHeadA, {
      taskId: created.taskId,
      action: "REQUEST_REVISION",
      reviewComment: "Cần bổ sung hướng dẫn chấm câu tự luận số 5",
    })
    expect(rev.workStatus).toBe("IN_PROGRESS")

    // 5. Pause without reason -> MUST FAIL; with reason -> PAUSED -> RESUME
    await expect(
      executeWorkHubTaskTransition(deptHeadA, {
        taskId: created.taskId,
        action: "PAUSE",
        reason: "",
      })
    ).rejects.toThrow(WorkHubValidationError)

    const paused = await executeWorkHubTaskTransition(deptHeadA, {
      taskId: created.taskId,
      action: "PAUSE",
      reason: "Chờ tổ chuyên môn thống nhất biểu điểm",
    })
    expect(paused.workStatus).toBe("PAUSED")

    await executeWorkHubTaskTransition(deptHeadA, {
      taskId: created.taskId,
      action: "RESUME",
    })

    // 6. Change deadline requires reason & logs history
    await executeWorkHubTaskTransition(deptHeadA, {
      taskId: created.taskId,
      action: "CHANGE_DEADLINE",
      newEndDate: "2026-11-25",
      reason: "Gia hạn thêm theo lịch kiểm tra chung",
    })

    // 7. Re-submit and Reviewer approves completion
    await executeWorkHubTaskTransition(staffA1, {
      taskId: created.taskId,
      action: "SUBMIT_FOR_REVIEW",
      resultSummary: "Đã bổ sung hướng dẫn chấm đầy đủ",
    })
    const completed = await executeWorkHubTaskTransition(deptHeadA, {
      taskId: created.taskId,
      action: "APPROVE_COMPLETE",
      reviewComment: "Nghiệm thu đạt chuẩn",
      productMetCriteria: true,
    })
    expect(completed.workStatus).toBe("COMPLETED")

    // 8. Verify automatic overdue computation (cannot be forged) & full history trail
    const overdueCheck = computeWorkHubDeadlineTruth({
      workStatus: "IN_PROGRESS",
      endDate: "2026-11-05",
      referenceNow: new Date("2026-11-16T10:00:00Z"),
    })
    expect(overdueCheck.isOverdue).toBe(true)

    const history = await getWorkHubTaskHistory(created.taskId)
    expect(history.length).toBeGreaterThanOrEqual(7)
    expect(history.some((h) => h.eventType === "DEADLINE_CHANGED")).toBe(true)
    expect(history.some((h) => h.eventType === "REVISION_REQUESTED")).toBe(true)
    expect(history.some((h) => h.eventType === "APPROVED_COMPLETED")).toBe(true)
    expect(memAuditLogs.length).toBeGreaterThanOrEqual(6)
  })

  it("Flow 3: Work Plans versioning & Weekly/Monthly Reports snapshot freeze, lock on approval, revision versioning, and missing submitter identification", async () => {
    // 1. Create Plan -> Approve -> Adjust (requires reason & increments version)
    const plan = await createWorkHubPlan(deptHeadA, {
      title: "Kế hoạch chuyên môn Tháng 11/2026",
      periodType: "MONTHLY",
      periodLabel: "Tháng 11/2026",
      departmentId: "dept_a",
      campusId: "camp_1",
      startDate: "2026-11-01",
      endDate: "2026-11-30",
      objectives: [{ id: "o1", title: "Hoàn thành 100% đề kiểm tra", targetMetric: "100%" }],
    })

    const approvedPlan = await updateOrApproveWorkHubPlan(deptHeadA, {
      planId: plan.planId,
      mode: "APPROVE",
    })
    expect(approvedPlan.status).toBe("APPROVED")

    await expect(
      updateOrApproveWorkHubPlan(deptHeadA, {
        planId: plan.planId,
        mode: "UPDATE_OR_ADJUST",
        title: "Sửa không có lý do",
      })
    ).rejects.toThrow(WorkHubValidationError)

    const adjustedPlan = await updateOrApproveWorkHubPlan(deptHeadA, {
      planId: plan.planId,
      mode: "UPDATE_OR_ADJUST",
      title: "Kế hoạch chuyên môn Tháng 11/2026 (Điều chỉnh)",
      adjustmentReason: "Bổ sung đợt khảo sát tiếng Anh",
    })
    expect(adjustedPlan.status).toBe("ADJUSTED")
    expect(adjustedPlan.versionNumber).toBe(2)
    const planVersions = await getWorkHubPlanVersions(deptHeadA, plan.planId)
    expect(planVersions.length).toBe(1)

    // 2. Staff A1 submits personal weekly report (Staff A2 has NOT submitted)
    const staffRep = await saveOrSubmitWorkHubReport(staffA1, {
      reportScope: "INDIVIDUAL",
      periodType: "MONTHLY",
      year: 2026,
      month: 11,
      executiveCommentary: "Hoàn thành nhiệm vụ trọng tâm trong tháng",
      blockersAndCauses: "Không có",
      supportRequests: "Cần cấp thêm tài khoản phần mềm chấm",
      nextPeriodPlan: "Chuẩn bị đề cuối kỳ",
      submitNow: true,
    })
    expect(staffRep.status).toBe("SUBMITTED")

    // 3. Dept Head approves & locks Staff A1's report
    const locked = await reviewOrReviseWorkHubReport(deptHeadA, {
      reportId: staffRep.reportId,
      action: "APPROVE",
      feedbackOrReason: "Đồng ý chốt số liệu",
    })
    expect(locked.status).toBe("APPROVED")
    expect(locked.isLocked).toBe(true)

    // Editing a locked report directly MUST fail
    await expect(
      saveOrSubmitWorkHubReport(staffA1, {
        reportId: staffRep.reportId,
        reportScope: "INDIVIDUAL",
        periodType: "MONTHLY",
        year: 2026,
        month: 11,
        executiveCommentary: "Cố tình sửa khi đã khóa",
        blockersAndCauses: "",
        supportRequests: "",
        nextPeriodPlan: "",
        submitNow: true,
      })
    ).rejects.toThrow(WorkHubValidationError)

    // Creating a new revision version requires reason and unlocks v2
    const revised = await reviewOrReviseWorkHubReport(staffA1, {
      reportId: staffRep.reportId,
      action: "CREATE_NEW_VERSION",
      feedbackOrReason: "Bổ sung minh chứng nghiệm thu đợt 2",
    })
    expect(revised.versionNumber).toBe(2)
    expect(revised.isLocked).toBe(false)

    // 4. Department consolidated report explicitly identifies Staff A2 as missing (without coercing to 0!)
    const deptRep = await saveOrSubmitWorkHubReport(deptHeadA, {
      reportScope: "DEPARTMENT",
      periodType: "MONTHLY",
      year: 2026,
      month: 11,
      departmentId: "dept_a",
      executiveCommentary: "Báo cáo tổng hợp Phòng Đào tạo A",
      blockersAndCauses: "",
      supportRequests: "",
      nextPeriodPlan: "",
      submitNow: true,
    })
    expect(deptRep.snapshot.submissionRollup?.expectedUsersCount).toBe(2)
    expect(
      deptRep.snapshot.submissionRollup?.missingUsers.some(
        (u) => u.fullName === "Giáo viên Lê Thị Bình"
      )
    ).toBe(true)
  })

  it("Flow 4: KPI engine — 3 evaluation directions, denominator = 0 -> 'Chưa đủ dữ liệu', weight check, and versioned immutability of confirmed KPIs", async () => {
    // 1. Denominator = 0 MUST return 'Chưa đủ dữ liệu' (NEVER 0 or 100%)
    const zeroDenom = calculateKpiFormulaFromSources({
      formulaType: "ON_TIME_TASK_RATE",
      formulaConfig: {
        numeratorDescription: "CV đúng hạn",
        denominatorDescription: "Tổng CV",
        includedTaskFilter: "ALL_ASSIGNED_LEAF",
        excludeCancelled: true,
        excludePaused: false,
      },
      unit: "%",
      canonicalTasks: [],
      periodStart: new Date("2026-11-01T00:00:00Z"),
      periodEnd: new Date("2026-11-30T23:59:59Z"),
    })
    expect(zeroDenom.actualValue).toBeNull()
    expect(zeroDenom.actualDisplay).toBe("Chưa đủ dữ liệu")

    // 2. Three directions: HIGHER_IS_BETTER, LOWER_IS_BETTER, WITHIN_RANGE
    expect(
      evaluateKpiOutcomeBand({
        actualValue: 92,
        direction: "HIGHER_IS_BETTER",
        targetValue: 85,
        passThreshold: 85,
        warningThreshold: 70,
        capScorePercent: 100,
      }).outcomeBand
    ).toBe("PASS")

    expect(
      evaluateKpiOutcomeBand({
        actualValue: 3, // 3% overdue <= 5% passThreshold -> PASS!
        direction: "LOWER_IS_BETTER",
        targetValue: 5,
        passThreshold: 5,
        warningThreshold: 12,
        capScorePercent: 100,
      }).outcomeBand
    ).toBe("PASS")

    expect(
      evaluateKpiOutcomeBand({
        actualValue: 10, // within [5, 15] -> PASS!
        direction: "WITHIN_RANGE",
        targetValue: 10,
        passThreshold: 5,
        warningThreshold: 15,
        capScorePercent: 100,
        rangeMin: 5,
        rangeMax: 15,
      }).outcomeBand
    ).toBe("PASS")

    // 3. Create KPI v1 -> Enter manual value -> Confirm -> Update KPI formula/target to v2 -> Confirmed period MUST retain v1 target & result!
    const createdKpi = await saveWorkHubKpiDefinition(execAdmin, {
      kpiCode: "KPI-MANUAL-01",
      name: "Tỷ lệ hài lòng chuyên môn",
      purpose: "Đo mức độ phản hồi tích cực",
      unit: "%",
      targetScope: "INDIVIDUAL",
      evaluationCycle: "MONTHLY",
      effectiveFrom: "2026-01-01",
      targetValue: 85,
      direction: "HIGHER_IS_BETTER",
      formulaType: "MANUAL_METRIC",
      dataSourceType: "MANUAL",
      passThreshold: 85,
      warningThreshold: 70,
      failThreshold: 50,
      weight: 60,
    })

    await recordOrConfirmKpiEvaluation(deptHeadA, {
      kpiId: createdKpi.id,
      targetScope: "INDIVIDUAL",
      targetEntityId: "u_staff_a1",
      periodKey: "2026-M11",
      periodLabel: "Tháng 11/2026",
      periodStart: "2026-11-01T00:00:00Z",
      periodEnd: "2026-11-30T23:59:59Z",
      mode: "SAVE_MANUAL_VALUE",
      manualActualValue: 88,
      manualEvidenceNote: "Biên bản khảo sát số 12/BB-DT",
    })

    await recordOrConfirmKpiEvaluation(deptHeadA, {
      kpiId: createdKpi.id,
      targetScope: "INDIVIDUAL",
      targetEntityId: "u_staff_a1",
      periodKey: "2026-M11",
      periodLabel: "Tháng 11/2026",
      periodStart: "2026-11-01T00:00:00Z",
      periodEnd: "2026-11-30T23:59:59Z",
      mode: "CONFIRM_RESULT",
    })

    // Now update KPI target to 95% in v2
    const v2 = await saveWorkHubKpiDefinition(execAdmin, {
      id: createdKpi.id,
      kpiCode: "KPI-MANUAL-01",
      name: "Tỷ lệ hài lòng chuyên môn",
      purpose: "Nâng chuẩn kỳ sau",
      unit: "%",
      targetScope: "INDIVIDUAL",
      evaluationCycle: "MONTHLY",
      effectiveFrom: "2026-01-01",
      targetValue: 95,
      direction: "HIGHER_IS_BETTER",
      formulaType: "MANUAL_METRIC",
      dataSourceType: "MANUAL",
      passThreshold: 95,
      warningThreshold: 80,
      failThreshold: 60,
      weight: 60,
      changeReason: "Tăng chuẩn chất lượng từ tháng 12",
    })
    expect(v2.versionNumber).toBe(2)

    // Re-querying confirmed 2026-M11 MUST still show v1, targetValue 85, and PASS!
    const novEval = await evaluateTargetWorkHubKpis(deptHeadA, {
      targetScope: "INDIVIDUAL",
      targetEntityId: "u_staff_a1",
      periodKey: "2026-M11",
      periodLabel: "Tháng 11/2026",
      periodStart: "2026-11-01T00:00:00Z",
      periodEnd: "2026-11-30T23:59:59Z",
    })
    const lockedItem = novEval.evaluations.find((e) => e.kpiId === createdKpi.id)!
    expect(lockedItem.status).toBe("CONFIRMED")
    expect(lockedItem.kpiVersion).toBe(1)
    expect(lockedItem.targetValue).toBe(85)
    expect(lockedItem.outcomeBand).toBe("PASS")

    // Weight validation warning when weight != 100% (60% != 100%)
    const sc = computeKpiScorecardSummary(novEval.evaluations)
    expect(sc.isWeightSumValid).toBe(false)
    expect(sc.weightValidationWarning).toContain("60%")
  })

  it("Flow 5 & 6: Cross-department/campus RBAC enforcement & Non-double-counting of Parent-Child and Multi-Collaborator tasks", async () => {
    // Parent task + 2 Child tasks with multiple collaborators in Dept A
    const parent = await createWorkHubTask(deptHeadA, {
      title: "Tổ chức kỳ thi thử THPT",
      departmentId: "dept_a",
      campusId: "camp_1",
      assignedToUserId: "u_staff_a1",
      collaboratorIds: ["u_staff_a2"],
      startDate: "2026-11-01",
      endDate: "2026-11-28",
    })
    await createWorkHubTask(deptHeadA, {
      title: "Việc con 1: In sao đề thi",
      parentTaskId: parent.taskId,
      departmentId: "dept_a",
      campusId: "camp_1",
      assignedToUserId: "u_staff_a1",
      collaboratorIds: ["u_staff_a2"],
      startDate: "2026-11-05",
      endDate: "2026-11-15",
    })
    await createWorkHubTask(deptHeadA, {
      title: "Việc con 2: Bố trí phòng thi",
      parentTaskId: parent.taskId,
      departmentId: "dept_a",
      campusId: "camp_1",
      assignedToUserId: "u_staff_a2",
      collaboratorIds: ["u_staff_a1"],
      startDate: "2026-11-10",
      endDate: "2026-11-20",
    })

    const deptATasks = await listScopedWorkHubTasks(deptHeadA)
    expect(deptATasks.length).toBe(3)

    // Canonical statistical filter MUST return ONLY the 2 leaf child tasks (not 3, and not 4 due to collaborators!)
    const canonical = selectCanonicalStatisticalTasks(deptATasks)
    expect(canonical.length).toBe(2)
    expect(canonical.some((t) => t.id === parent.taskId)).toBe(false)

    // Cross-department / Cross-campus access check: Staff in Dept B (Campus 2) MUST see 0 tasks of Dept A and get 403 on Dept A KPIs
    const deptBVisible = await listScopedWorkHubTasks(staffDeptB)
    expect(deptBVisible.length).toBe(0)

    await expect(
      evaluateTargetWorkHubKpis(staffDeptB, {
        targetScope: "DEPARTMENT",
        targetEntityId: "dept_a",
        periodKey: "2026-M11",
        periodLabel: "Tháng 11/2026",
        periodStart: "2026-11-01T00:00:00Z",
        periodEnd: "2026-11-30T23:59:59Z",
      })
    ).rejects.toThrow(WorkHubForbiddenError)
  })

  it("Flow 7 & 8: Vietnamese Word/Excel/PDF HTML export integrity, Recurring anti-duplicate, Digest notification deduplication & AI evidence audit", async () => {
    // 1. Recurring task anti-duplicate check
    const rec = await createRecurrenceTemplateAndGenerateInstance(deptHeadA, {
      title: "Rà soát hồ sơ chuyên môn tuần",
      category: "Định kỳ",
      frequency: "WEEKLY",
      assignedToUserId: "u_staff_a1",
      periodKey: "2026-W47",
      periodStartDate: "2026-11-16",
    })
    expect(rec.duplicateSkipped).toBe(false)
    expect(rec.generatedTaskId).toBeTruthy()

    const duplicateAttempt = await generateTaskForRecurrencePeriod(deptHeadA, {
      templateId: rec.templateId,
      periodKey: "2026-W47",
      periodStartDate: "2026-11-16",
    })
    expect(duplicateAttempt.duplicateSkipped).toBe(true)

    // 2. Digest notification batching & anti-duplicate check
    await createWorkHubTask(deptHeadA, {
      title: "Việc quá hạn cần nhắc gộp 1",
      assignedToUserId: "u_staff_a1",
      startDate: "2026-11-01",
      endDate: "2026-11-05",
    })
    await createWorkHubTask(deptHeadA, {
      title: "Việc quá hạn cần nhắc gộp 2",
      assignedToUserId: "u_staff_a1",
      startDate: "2026-11-01",
      endDate: "2026-11-06",
    })

    const notifBefore = memNotifications.length
    const digestRun1 = await dispatchWorkHubDigestReminders({
      referenceNow: new Date("2026-11-16T08:00:00Z"),
    })
    // 2 overdue tasks for u_staff_a1 MUST be batched into ONLY 1 digest notification!
    expect(digestRun1.notificationsSent).toBe(1)
    expect(memNotifications.length - notifBefore).toBe(1)

    // Running again on the same day MUST skip duplicate!
    const digestRun2 = await dispatchWorkHubDigestReminders({
      referenceNow: new Date("2026-11-16T14:00:00Z"),
    })
    expect(digestRun2.notificationsSent).toBe(0)
    expect(digestRun2.duplicatesSkipped).toBe(1)

    // 3. AI Report Assistant detects missing evidence & numeric contradiction
    const repRes = await saveOrSubmitWorkHubReport(staffA1, {
      reportScope: "INDIVIDUAL",
      periodType: "WEEKLY",
      year: 2026,
      month: 11,
      weekNumber: 3,
      executiveCommentary: "Trong tuần không có việc quá hạn, hoàn thành 99 công việc xuất sắc.",
      blockersAndCauses: "",
      supportRequests: "",
      nextPeriodPlan: "",
      submitNow: false,
    })

    const tasksForAi = await listScopedWorkHubTasks(staffA1)
    const aiAudit = await generateWorkHubAiReportAssist({
      actor: staffA1,
      snapshot: repRes.snapshot,
      scopedTasks: tasksForAi,
      currentDraft: {
        executiveCommentary: "Trong tuần không có việc quá hạn, hoàn thành 99 công việc xuất sắc.",
        blockersAndCauses: "",
        supportRequests: "",
        nextPeriodPlan: "",
      },
    })
    expect(aiAudit.auditAlerts.some((a) => a.refCode === "MISMATCH_OVERDUE")).toBe(true)
    expect(aiAudit.auditAlerts.some((a) => a.refCode === "MISMATCH_COMPLETED")).toBe(true)

    // 4. Vietnamese Export verification (UTF-8 BOM + full Vietnamese diacritics preserved)
    const sampleReport = {
      id: repRes.reportId,
      reportCode: "BCC-202611-0001",
      reportScope: "INDIVIDUAL" as const,
      periodType: "WEEKLY" as const,
      periodKey: "2026-M11-W3",
      periodLabel: "Tuần 3 • Tháng 11/2026",
      academicYearId: null,
      year: 2026,
      month: 11,
      weekNumber: 3,
      periodStart: "2026-11-15T00:00:00Z",
      periodEnd: "2026-11-21T23:59:59Z",
      ownerUserId: staffA1.userId,
      ownerName: "Chuyên viên Nguyễn Văn An",
      departmentId: "dept_a",
      departmentName: "Phòng Đào tạo A",
      campusId: "camp_1",
      campusName: "Cơ sở Hill",
      status: "SUBMITTED" as const,
      isLocked: false,
      versionNumber: 1,
      executiveCommentary: "Đã hoàn tất thẩm định đề kiểm tra Tiếng Việt & Toán học.",
      blockersAndCauses: "Chờ phản hồi từ tổ chuyên môn",
      supportRequests: "Hỗ trợ phòng máy tính",
      nextPeriodPlan: "Nghiệm thu ngân hàng câu hỏi",
      reviewerUserId: null,
      reviewerName: null,
      reviewFeedback: null,
      submittedSnapshotAt: "2026-11-16T10:00:00Z",
      approvedAt: null,
      snapshot: repRes.snapshot,
      createdAt: "2026-11-16T10:00:00Z",
      updatedAt: "2026-11-16T10:00:00Z",
    }

    const docHtml = buildWorkHubReportDocumentHtml(sampleReport)
    expect(docHtml.startsWith("\uFEFF")).toBe(true)
    expect(docHtml).toContain("Chuyên viên Nguyễn Văn An")
    expect(docHtml).toContain("Đã hoàn tất thẩm định đề kiểm tra Tiếng Việt &amp; Toán học.")

    const wb = buildWorkHubReportWorkbook(sampleReport)
    expect(wb.SheetNames).toContain("Tong_Hop_Bao_Cao")
    expect(wb.SheetNames).toContain("Cong_Viec_Nguon")
  })

  it("6. Consolidates WorkHub into QA Workspace • KT&ĐBCL without overlapping menus and tracks group + individual task/report progress", async () => {
    expect(APP_CATEGORIES.some((c) => c.id === "WORKHUB")).toBe(false)
    const qaCat = APP_CATEGORIES.find((c) => c.id === "OTHER")!
    expect(qaCat).toBeDefined()
    expect(qaCat.modules.map((m) => m.code)).toEqual([
      "WORKHUB_OVERVIEW",
      "TASKS",
      "WORKHUB_PLANS",
      "WEEKLY_REPORTS",
      "WORKHUB_KPIS",
    ])

    await createWorkHubTask(deptHeadA, {
      title: "Thẩm định ma trận đề HK1",
      assignedToUserId: "u_staff_a1",
      startDate: "2026-11-10",
      endDate: "2026-11-25",
    })

    const dash = await buildWorkHubDashboardData(deptHeadA, {
      periodType: "WEEKLY",
      year: 2026,
      month: 11,
      weekNumber: 2,
    })

    expect(Array.isArray(dash.groupProgressMatrix)).toBe(true)
    expect(dash.groupProgressMatrix.length).toBeGreaterThanOrEqual(5)
    expect(Array.isArray(dash.memberProgressMatrix)).toBe(true)

    const staffRow = dash.memberProgressMatrix.find((m: any) => m.userId === "u_staff_a1")
    expect(staffRow).toBeDefined()
    expect(staffRow!.totalTasks).toBe(1)
    expect(staffRow!.inProgressTasks).toBe(1)
    expect(staffRow!.hasSubmittedReport).toBe(false)
  })
})
