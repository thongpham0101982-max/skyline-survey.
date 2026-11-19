import { describe, it, expect, beforeAll, vi } from "vitest"
import { createClient } from "@libsql/client"
import * as XLSX from "xlsx"

const { memClient, mockPrisma } = vi.hoisted(() => {
  const { createClient: createLibsqlClient } = require("@libsql/client")
  const client = createLibsqlClient({ url: ":memory:" })
  const mp: any = {
    $executeRawUnsafe: async (sql: string, ...args: any[]) => {
      const res = await client.execute({ sql, args })
      return res.rowsAffected
    },
    $queryRawUnsafe: async (sql: string, ...args: any[]) => {
      const res = await client.execute({ sql, args })
      return res.rows
    },
    $transaction: async (fn: (tx: any) => Promise<any>) => fn(mp),
    academicYear: {
      findMany: async () => [
        {
          id: "ay_2627",
          name: "2026-2027",
          status: "ACTIVE",
          startDate: new Date("2026-08-01T00:00:00Z"),
          endDate: new Date("2027-05-31T00:00:00Z"),
        },
      ],
      findUnique: async ({ where }: any) =>
        where.id === "ay_2627"
          ? {
              id: "ay_2627",
              name: "2026-2027",
              status: "ACTIVE",
              startDate: new Date("2026-08-01T00:00:00Z"),
              endDate: new Date("2027-05-31T00:00:00Z"),
            }
          : null,
    },
    campus: {
      findMany: async () => [{ id: "cp_cs1", campusCode: "CS1", campusName: "CS1", status: "ACTIVE" }],
      findUnique: async ({ where }: any) =>
        where.id === "cp_cs1" ? { id: "cp_cs1", campusCode: "CS1", campusName: "CS1" } : null,
    },
    class: {
      findMany: async () => [
        {
          id: "cls_1_2",
          className: "1/2",
          level: "Tiểu học",
          grade: "1",
          campusId: "cp_cs1",
          academicYearId: "ay_2627",
          educationSystem: "HNS",
        },
      ],
      findUnique: async ({ where }: any) =>
        where.id === "cls_1_2"
          ? {
              id: "cls_1_2",
              className: "1/2",
              level: "Tiểu học",
              grade: "1",
              campusId: "cp_cs1",
              academicYearId: "ay_2627",
              educationSystem: "HNS",
            }
          : null,
      findFirst: async () => null,
    },
    subject: {
      findMany: async () => [
        {
          id: "sub_toan",
          subjectCode: "TOA",
          subjectName: "Toán học",
          level: "PRIMARY, MIDDLE, HIGH",
          studyPrograms: "Hệ S, Hệ I",
          status: "ACTIVE",
        },
      ],
      findUnique: async ({ where }: any) =>
        where.id === "sub_toan"
          ? { id: "sub_toan", subjectCode: "TOA", subjectName: "Toán học", status: "ACTIVE" }
          : null,
    },
    subjectQuota: {
      findMany: async () => [
        {
          id: "sq_1",
          subjectId: "sub_toan",
          academicYearId: "ay_2627",
          studyProgram: "Hệ S",
          quotaG1: 3,
          quotaPrimary: 3,
          subject: {
            id: "sub_toan",
            subjectCode: "TOA",
            subjectName: "Toán học",
            level: "PRIMARY, MIDDLE, HIGH",
            studyPrograms: "Hệ S, Hệ I",
            status: "ACTIVE",
          },
        },
      ],
    },
    educationSystem: {
      findMany: async () => [{ code: "HNS", name: "Hội nhập Sky-Line" }],
    },
    teachingAssignment: {
      findFirst: async ({ where }: any) => {
        if (
          where.teacherId === "t_assigned" &&
          where.classId === "cls_1_2" &&
          where.subjectId === "sub_toan"
        ) {
          return { id: "ta_1" }
        }
        return null
      },
    },
    timetableSlot: {
      findFirst: async () => null,
    },
  }
  return { memClient: client, mockPrisma: mp }
})

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }))
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }))
vi.mock("@/lib/session", () => ({ getAdminSession: vi.fn(async () => ({})) }))
vi.mock("@/lib/permissions", () => ({ hasModulePermission: vi.fn(async () => false) }))

import { ensureTeachingPlanSchema } from "../schemaInit"
import {
  generateTeachingPlanTemplateBuffer,
  parseAndValidateTeachingPlanExcel,
} from "../excelService"
import {
  checkVersionBeforePublish,
  commitExcelImportToDraft,
  createDraftFromPublished,
  createTeachingPlan,
  getTeachingPlanCatalogs,
  getVersionDetail,
  linkPeriodToSession,
  lockObservationTeachingPlanSnapshot,
  mutateDraftVersion,
  resolveObservationTeachingPlanView,
  saveObservationObjectiveEvidences,
  transitionVersionWorkflow,
} from "../service"
import type { TeachingPlanAuthContext } from "../rbac"

const managerCtx: TeachingPlanAuthContext = {
  userId: "u_ttcm",
  actorName: "Tổ trưởng Toán TH",
  role: "TTCM",
  teacherId: "t_ttcm",
  teacherCampusId: "cp_cs1",
  allowedCampusIds: ["cp_cs1"],
  isFullAccess: true,
  canManage: true,
  canApprove: true,
  isTeacherOnly: false,
  adminSession: {} as any,
}

const assignedTeacherCtx: TeachingPlanAuthContext = {
  userId: "u_gv1",
  actorName: "Cô Lan (GV lớp 1/2)",
  role: "TEACHER",
  teacherId: "t_assigned",
  teacherCampusId: "cp_cs1",
  allowedCampusIds: ["cp_cs1"],
  isFullAccess: false,
  canManage: false,
  canApprove: false,
  isTeacherOnly: true,
  adminSession: {} as any,
}

const outsiderTeacherCtx: TeachingPlanAuthContext = {
  userId: "u_gv_other",
  actorName: "Thầy Hùng (Không dạy 1/2)",
  role: "TEACHER",
  teacherId: "t_outsider",
  teacherCampusId: "cp_cs1",
  allowedCampusIds: ["cp_cs1"],
  isFullAccess: false,
  canManage: false,
  canApprove: false,
  isTeacherOnly: true,
  adminSession: {} as any,
}

describe("Kế hoạch dạy học & Liên kết Dự giờ SSM (E2E In-Memory)", () => {
  beforeAll(async () => {
    await ensureTeachingPlanSchema()
    // Create minimal Class, Teacher, TimetableSlot, ObservationSlot tables in memory for JOINs
    await memClient.execute(`CREATE TABLE IF NOT EXISTS "Class" ("id" TEXT PRIMARY KEY, "className" TEXT)`)
    await memClient.execute(`CREATE TABLE IF NOT EXISTS "Teacher" ("id" TEXT PRIMARY KEY, "teacherName" TEXT)`)
    await memClient.execute(`CREATE TABLE IF NOT EXISTS "TimetableSlot" ("id" TEXT PRIMARY KEY, "teacherId" TEXT)`)
    await memClient.execute(
      `CREATE TABLE IF NOT EXISTS "ObservationSlot" ("id" TEXT PRIMARY KEY, "className" TEXT, "date" TEXT, "teacherId" TEXT)`
    )
    await memClient.execute(`INSERT INTO "Class" VALUES ('cls_1_2', '1/2')`)
    await memClient.execute(`INSERT INTO "Teacher" VALUES ('t_assigned', 'Cô Lan')`)
    await memClient.execute(`INSERT INTO "TimetableSlot" VALUES ('tkb_1_2_t3', 't_assigned')`)
    await memClient.execute(
      `INSERT INTO "ObservationSlot" VALUES ('obs_pending', '1/2', '2026-10-12', 't_assigned')`
    )
    await memClient.execute(
      `INSERT INTO "ObservationSlot" VALUES ('obs_started', '1/2', '2026-10-12', 't_assigned')`
    )
    await memClient.execute(
      `INSERT INTO "ObservationSlot" VALUES ('obs_legacy_old', '1/2', '2025-11-10', 't_assigned')`
    )
  })

  let planId = ""
  let v1Id = ""
  let v2Id = ""
  let stablePeriodB10T2 = ""
  let stablePeriodB10T3 = ""

  it("1. Danh mục phụ thuộc Tiểu học -> Khối 1 -> Toán hoạt động chính xác", async () => {
    const cat1 = await getTeachingPlanCatalogs({ academicYearId: "ay_2627", level: "Tiểu học" })
    expect(cat1.grades).toEqual(["1", "2", "3", "4", "5"])

    const cat2 = await getTeachingPlanCatalogs({
      academicYearId: "ay_2627",
      level: "Tiểu học",
      grade: "1",
    })
    expect(cat2.subjects.some((s) => s.subjectCode === "TOA")).toBe(true)

    const catThcs = await getTeachingPlanCatalogs({ academicYearId: "ay_2627", level: "THCS" })
    expect(catThcs.grades).toEqual(["6", "7", "8", "9"])
  })

  it("2. Nhập file mẫu cho 2 bài, 9 tiết; nhập lại giữ nguyên số bản ghi; báo lỗi sai mã bài & sai khối", async () => {
    const created = await createTeachingPlan({
      academicYearId: "ay_2627",
      level: "Tiểu học",
      grade: "1",
      subjectId: "sub_toan",
      programCode: "Hệ S",
      programName: "Hệ S",
      scopeType: "SYSTEM",
      ctx: managerCtx,
    })
    planId = created.plan.id
    v1Id = created.version.id

    // Generate valid sample workbook (2 lessons, 9 periods)
    const sampleBuf = generateTeachingPlanTemplateBuffer({
      academicYearName: "2026-2027",
      grade: "1",
      subjectName: "Toán học",
      programName: "Hệ S",
      scopeLabel: "Toàn hệ thống",
    })

    const preview1 = parseAndValidateTeachingPlanExcel(sampleBuf, {
      academicYearName: "2026-2027",
      grade: "1",
      subjectCode: "TOA",
      subjectName: "Toán học",
      programCode: "Hệ S",
      programName: "Hệ S",
      scopeType: "SYSTEM",
      existingLessons: [],
    })
    expect(preview1.valid).toBe(true)
    expect(preview1.lessons).toHaveLength(2)
    expect(preview1.periods).toHaveLength(9)
    expect(preview1.summary.lessonsAdded).toBe(2)
    expect(preview1.summary.periodsAdded).toBe(9)

    const afterImport1 = await commitExcelImportToDraft({
      versionId: v1Id,
      expectedRevision: created.version.revision,
      lessons: preview1.lessons,
      periods: preview1.periods,
      ctx: managerCtx,
    })
    expect(afterImport1.lessons).toHaveLength(2)
    expect(afterImport1.lessons.reduce((s, l) => s + l.periods.length, 0)).toBe(9)

    const b10 = afterImport1.lessons.find((l) => l.lessonCode === "TOAN1-B10")!
    const t2 = b10.periods.find((p) => p.periodIndexInLesson === 2)!
    const t3 = b10.periods.find((p) => p.periodIndexInLesson === 3)!
    stablePeriodB10T2 = t2.stablePeriodId
    stablePeriodB10T3 = t3.stablePeriodId

    // Re-import exact same file -> 0 duplicates, all unchanged, same stable IDs
    const preview2 = parseAndValidateTeachingPlanExcel(sampleBuf, {
      academicYearName: "2026-2027",
      grade: "1",
      subjectCode: "TOA",
      subjectName: "Toán học",
      programCode: "Hệ S",
      programName: "Hệ S",
      scopeType: "SYSTEM",
      existingLessons: afterImport1.lessons,
    })
    expect(preview2.valid).toBe(true)
    expect(preview2.summary.lessonsUnchanged).toBe(2)
    expect(preview2.summary.periodsUnchanged).toBe(9)

    const afterImport2 = await commitExcelImportToDraft({
      versionId: v1Id,
      expectedRevision: afterImport1.version.revision,
      lessons: preview2.lessons,
      periods: preview2.periods,
      ctx: managerCtx,
    })
    expect(afterImport2.lessons).toHaveLength(2)
    expect(afterImport2.lessons.reduce((s, l) => s + l.periods.length, 0)).toBe(9)
    const t2After = afterImport2.lessons
      .find((l) => l.lessonCode === "TOAN1-B10")!
      .periods.find((p) => p.periodIndexInLesson === 2)!
    expect(t2After.stablePeriodId).toBe(stablePeriodB10T2)

    // Invalid file: wrong grade + invalid Mã bài in Chi_tiet_tiet
    const badWb = XLSX.read(sampleBuf, { type: "buffer" })
    badWb.Sheets["Thong_tin"]["B3"] = { t: "s", v: "2" } // Wrong grade (2 instead of 1)
    badWb.Sheets["Chi_tiet_tiet"]["B2"] = { t: "s", v: "MA_BAI_KHONG_TON_TAI" }
    const badBuf = Buffer.from(XLSX.write(badWb, { type: "buffer", bookType: "xlsx" }))

    const badPreview = parseAndValidateTeachingPlanExcel(badBuf, {
      academicYearName: "2026-2027",
      grade: "1",
      subjectCode: "TOA",
      subjectName: "Toán học",
      programCode: "Hệ S",
      programName: "Hệ S",
      scopeType: "SYSTEM",
    })
    expect(badPreview.valid).toBe(false)
    expect(badPreview.errors.some((e) => e.sheet === "Thong_tin" && e.column.includes("Khối"))).toBe(true)
    expect(
      badPreview.errors.some(
        (e) => e.sheet === "Chi_tiet_tiet" && e.row === 2 && e.column === "Mã bài"
      )
    ).toBe(true)
  })

  it("3. Phân quyền chặt tại API & quy trình Gửi duyệt -> Công bố", async () => {
    // Outsider teacher cannot edit draft
    const detailV1 = await getVersionDetail(v1Id)
    await expect(
      mutateDraftVersion({
        versionId: v1Id,
        expectedRevision: detailV1.version.revision,
        operation: { type: "DELETE_LESSON", lessonId: detailV1.lessons[0].id },
        ctx: outsiderTeacherCtx,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 })

    // Stale revision conflict check
    await expect(
      mutateDraftVersion({
        versionId: v1Id,
        expectedRevision: 999,
        operation: { type: "DELETE_LESSON", lessonId: detailV1.lessons[0].id },
        ctx: managerCtx,
      })
    ).rejects.toMatchObject({ code: "CONFLICT", status: 409 })

    // Submit & Publish v1
    await transitionVersionWorkflow({ versionId: v1Id, action: "SUBMIT", ctx: managerCtx })
    const pub = await transitionVersionWorkflow({ versionId: v1Id, action: "PUBLISH", ctx: managerCtx })
    expect(pub.detail.version.status).toBe("PUBLISHED")
  })

  it("4. Gắn buổi dạy lớp 1/2 tiết 3 TKB với Bài 10 - Tiết 2/6; chặn GV ngoài phân công", async () => {
    // Outsider teacher blocked from linking class 1/2
    await expect(
      linkPeriodToSession({
        timetableSlotId: "tkb_1_2_t3",
        observationSlotId: "obs_pending",
        classId: "cls_1_2",
        subjectId: "sub_toan",
        academicYearId: "ay_2627",
        sessionDate: "2026-10-12",
        timetablePeriodNumber: 3,
        timetableSession: "MORNING",
        planId,
        stablePeriodId: stablePeriodB10T2,
        ctx: outsiderTeacherCtx,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 })

    // Assigned teacher links obs_pending & obs_started to Bài 10 - Tiết 2/6 on Tiết 3 TKB
    await linkPeriodToSession({
      timetableSlotId: "tkb_1_2_t3",
      observationSlotId: "obs_pending",
      classId: "cls_1_2",
      subjectId: "sub_toan",
      academicYearId: "ay_2627",
      sessionDate: "2026-10-12",
      timetablePeriodNumber: 3,
      timetableSession: "MORNING",
      planId,
      stablePeriodId: stablePeriodB10T2,
      ctx: assignedTeacherCtx,
    })

    await linkPeriodToSession({
      timetableSlotId: "tkb_1_2_t3",
      observationSlotId: "obs_started",
      classId: "cls_1_2",
      subjectId: "sub_toan",
      academicYearId: "ay_2627",
      sessionDate: "2026-10-12",
      timetablePeriodNumber: 3,
      timetableSession: "MORNING",
      planId,
      stablePeriodId: stablePeriodB10T2,
      ctx: assignedTeacherCtx,
    })

    const view = await resolveObservationTeachingPlanView("obs_pending")
    expect(view.linked).toBe(true)
    expect(view.sourceMode).toBe("LIVE_PUBLISHED")
    expect(view.data?.timetablePeriodNumber).toBe(3)
    expect(view.data?.periodIndexInLesson).toBe(2)
    expect(view.data?.totalPeriodsInLesson).toBe(6)
    expect(view.data?.lessonName).toContain("Bài 10")
  })

  it("5. Sửa YCCĐ Tiết 2/6: trước công bố dùng cũ, sau công bố phiếu chờ dùng mới, phiếu đã bắt đầu giữ bản chụp + lưu minh chứng YCCĐ", async () => {
    // Lock snapshot on obs_started (simulates observation started / evaluation opened)
    const lockedView = await lockObservationTeachingPlanSnapshot("obs_started")
    expect(lockedView.snapshotLocked).toBe(true)
    expect(lockedView.sourceMode).toBe("FROZEN_SNAPSHOT")
    const originalObjective = lockedView.data!.objectives

    // Record per-objective observation evidence including "Chưa quan sát được"
    const evView = await saveObservationObjectiveEvidences({
      evaluationId: "eval_started_1",
      observationSlotId: "obs_started",
      evidences: [
        {
          objectiveIndex: 0,
          objectiveText: lockedView.data!.objectiveLines[0],
          status: "OBSERVED_MET",
          evidenceNote: "HS hoàn thành phiếu luyện tập 5/5 phép tính.",
        },
        {
          objectiveIndex: 1,
          objectiveText: lockedView.data!.objectiveLines[1] || "Nêu bài toán cộng",
          status: "NOT_OBSERVED",
          evidenceNote: "",
        },
      ],
    })
    expect(evView.evidences[0].status).toBe("OBSERVED_MET")
    expect(evView.evidences[1].status).toBe("NOT_OBSERVED")

    // Create Draft v2 from Published v1 & edit Tiết 2/6 objectives
    const draftV2 = await createDraftFromPublished(planId, managerCtx)
    v2Id = draftV2.version.id
    const b10V2 = draftV2.lessons.find((l) => l.lessonCode === "TOAN1-B10")!
    const t2V2 = b10V2.periods.find((p) => p.stablePeriodId === stablePeriodB10T2)!

    const newObjectives = "- Tính nhẩm nhanh phép cộng phạm vi 6 (Cập nhật v2).\n- Nêu bài toán từ tranh và kiểm chứng bằng que tính."
    await mutateDraftVersion({
      versionId: v2Id,
      expectedRevision: draftV2.version.revision,
      operation: {
        type: "UPDATE_PERIOD",
        periodId: t2V2.id,
        objectives: newObjectives,
      },
      ctx: managerCtx,
    })

    // BEFORE publish: obs_pending MUST still show v1 old content!
    const beforePubView = await resolveObservationTeachingPlanView("obs_pending")
    expect(beforePubView.data?.objectives).toBe(originalObjective)
    expect(beforePubView.data?.versionNumber).toBe(1)

    // PUBLISH v2
    await transitionVersionWorkflow({ versionId: v2Id, action: "PUBLISH", ctx: managerCtx })

    // AFTER publish: obs_pending (unstarted) gets v2 NEW content!
    const afterPubPending = await resolveObservationTeachingPlanView("obs_pending")
    expect(afterPubPending.data?.objectives).toBe(newObjectives)
    expect(afterPubPending.data?.versionNumber).toBe(2)

    // AFTER publish: obs_started (locked) STILL holds v1 frozen snapshot!
    const afterPubStarted = await resolveObservationTeachingPlanView("obs_started", "eval_started_1")
    expect(afterPubStarted.sourceMode).toBe("FROZEN_SNAPSHOT")
    expect(afterPubStarted.data?.objectives).toBe(originalObjective)
    expect(afterPubStarted.data?.versionNumber).toBe(1)
  })

  it("6. Đổi tuần dự kiến tạo cảnh báo lệch lịch; bỏ tiết có lịch dự yêu cầu chọn tiết thay thế; phiếu cũ hoạt động bình thường", async () => {
    // Draft v3: shift plannedWeek of Tiết 2/6 from 6 -> 7
    const draftV3 = await createDraftFromPublished(planId, managerCtx)
    const b10V3 = draftV3.lessons.find((l) => l.lessonCode === "TOAN1-B10")!
    const t2V3 = b10V3.periods.find((p) => p.stablePeriodId === stablePeriodB10T2)!
    await mutateDraftVersion({
      versionId: draftV3.version.id,
      expectedRevision: draftV3.version.revision,
      operation: {
        type: "UPDATE_PERIOD",
        periodId: t2V3.id,
        plannedWeek: 7,
      },
      ctx: managerCtx,
    })

    const pubV3 = await transitionVersionWorkflow({
      versionId: draftV3.version.id,
      action: "PUBLISH",
      ctx: managerCtx,
    })
    expect(pubV3.warnings.length).toBeGreaterThan(0)
    const warnedView = await resolveObservationTeachingPlanView("obs_pending")
    expect(warnedView.weekMismatchWarning).toBe(true)
    expect(warnedView.weekMismatchNote).toContain("Tuần 6")
    expect(warnedView.weekMismatchNote).toContain("Tuần 7")

    // Draft v4: delete Tiết 2/6 -> check detects impacted obs_pending -> publish requires replacement
    const draftV4 = await createDraftFromPublished(planId, managerCtx)
    const b10V4 = draftV4.lessons.find((l) => l.lessonCode === "TOAN1-B10")!
    const t2V4 = b10V4.periods.find((p) => p.stablePeriodId === stablePeriodB10T2)!
    await mutateDraftVersion({
      versionId: draftV4.version.id,
      expectedRevision: draftV4.version.revision,
      operation: { type: "DELETE_PERIOD", periodId: t2V4.id },
      ctx: managerCtx,
    })

    const checkV4 = await checkVersionBeforePublish(draftV4.version.id)
    expect(checkV4.canPublish).toBe(false)
    expect(checkV4.impactedLinks.some((x) => x.targetId === "obs_pending")).toBe(true)

    // Publish without replacement must fail
    await expect(
      transitionVersionWorkflow({ versionId: draftV4.version.id, action: "PUBLISH", ctx: managerCtx })
    ).rejects.toMatchObject({ code: "CONFLICT", status: 409 })

    // Publish with replacement (Tiết 3/6) succeeds and remaps obs_pending
    await transitionVersionWorkflow({
      versionId: draftV4.version.id,
      action: "PUBLISH",
      periodReplacements: { [stablePeriodB10T2]: stablePeriodB10T3 },
      ctx: managerCtx,
    })
    const remappedView = await resolveObservationTeachingPlanView("obs_pending")
    expect(remappedView.data?.stablePeriodId).toBe(stablePeriodB10T3)
    expect(remappedView.data?.periodIndexInLesson).toBe(3)

    // Legacy observation without teaching plan link still works cleanly
    const legacyView = await resolveObservationTeachingPlanView("obs_legacy_old")
    expect(legacyView.linked).toBe(false)
    expect(legacyView.sourceMode).toBe("UNLINKED")
    expect(legacyView.data).toBeNull()
  })
})
