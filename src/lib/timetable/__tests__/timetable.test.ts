import { beforeEach, describe, expect, it, vi } from "vitest"

// Strictly mock DB, Auth, Session, Permissions, SchemaInit & Next cache — ZERO real DB reads/writes!
const { mockPrisma, mockAuth, mockGetAdminSession, mockHasModulePermission } = vi.hoisted(() => {
  const prismaObj: any = {
    campus: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    academicYear: {
      findMany: vi.fn(),
    },
    class: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    subject: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    teacher: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    subjectQuota: {
      findMany: vi.fn(),
    },
    teachingAssignment: {
      findMany: vi.fn(),
    },
    ctqtTeachingAssignment: {
      findMany: vi.fn(),
    },
    timetableVersion: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    timetableConfig: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    timetableRoom: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    timetableBusySlot: {
      findMany: vi.fn(),
    },
    timetableTravelRule: {
      findMany: vi.fn(),
    },
    timetableSlot: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    timetableSubstitution: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    timetableAuditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(async (cb: any) => cb(prismaObj)),
  }
  return {
    mockPrisma: prismaObj,
    mockAuth: vi.fn(),
    mockGetAdminSession: vi.fn(),
    mockHasModulePermission: vi.fn(),
  }
})

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}))

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}))

vi.mock("@/lib/session", () => ({
  getAdminSession: () => mockGetAdminSession(),
}))

vi.mock("@/lib/permissions", () => ({
  hasModulePermission: (...args: any[]) => mockHasModulePermission(...args),
}))

vi.mock("@/lib/timetable/schemaInit", () => ({
  ensureTimetableSchema: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

import {
  buildDefaultPeriodTimes,
  doDateRangesOverlap,
  doesClassBelongToScope,
  isHillCampus,
  mapEducationSystemToStudyProgram,
  resolveWeekParity,
} from "@/lib/timetable/scopeResolver"
import {
  requireTimetablePermission,
  TimetableAccessError,
  verifyClassesBelongToScope,
  verifyEditableVersion,
} from "@/lib/timetable/rbac"
import {
  detectHighSchoolTrack,
  reconcileQuotasAndAssignments,
  resolveGradeQuotaValue,
} from "@/lib/timetable/quotaReconciler"
import { validateTimetable } from "@/lib/timetable/validator"
import { runAutoScheduler } from "@/lib/timetable/autoScheduler"
import {
  buildBulkScopePlacement,
  evaluateCellDropTarget,
  makeSlotCellKey,
  recomputeLiveQuotaItems,
} from "@/lib/timetable/dragDropHelper"
import {
  checkProctorTimetableConflict,
  getEffectiveClassWeekSchedule,
  verifyTimetableSlotForObservation,
} from "@/lib/timetable/effectiveScheduleService"
import {
  createTimetableSubstitutionAction,
  transitionTimetableVersionStatusAction,
} from "@/app/admin/thoi-khoa-bieu/actions"
import type { TimetableConfigParsed } from "@/lib/timetable/types"

function makeBaseConfig(overrides: Partial<TimetableConfigParsed> = {}): TimetableConfigParsed {
  return {
    academicYearId: "ay-2026",
    semester: 1,
    campusId: "cs1",
    scopeGroup: "TRUNG_HOC",
    levelCode: "ALL",
    workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
    morningPeriods: 4,
    afternoonPeriods: 4,
    periodTimes: buildDefaultPeriodTimes("TRUNG_HOC", 4, 4),
    cycleWeeks: 2,
    cycleAnchorDate: "2026-09-07", // Monday of Week 1 (ODD)
    fixedSlots: [],
    blockRules: [],
    limitsAndPriorities: {},
    effectiveFrom: "2026-09-07",
    effectiveTo: null,
    ...overrides,
  }
}

describe("SSM Sky-Line Timetable v2 — 8 Acceptance Scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({
      user: { id: "u-admin", name: "Quản trị Đào tạo", email: "academic@skyline.edu.vn" },
    })
    mockGetAdminSession.mockResolvedValue({
      userId: "u-admin",
      role: "ADMIN",
      isFullAccess: true,
      isSuperAdmin: true,
      isHeadOfAcademic: false,
      allowedCampusIds: ["cs1", "cs2", "cs3", "cs5", "campus-hill-uuid"],
    })
    mockHasModulePermission.mockResolvedValue(true)
  })

  // ==========================================================================
  // SCENARIO 1: Chuyển cơ sở/cấp học không ghi đè chéo & nhận diện Hill động
  // ==========================================================================
  it("Scenario 1: dynamically detects Sky-Line Hill without hardcoding CS4 and blocks cross-campus / cross-scope writes", async () => {
    const cs1 = { id: "cs1", campusCode: "CS1", campusName: "Cơ sở 1", address: "Hải Châu" }
    const cs2 = { id: "cs2", campusCode: "CS2", campusName: "Cơ sở 2", address: "Sơn Trà" }
    const hill = {
      id: "campus-hill-uuid",
      campusCode: "SKL_HILL",
      campusName: "Sky-Line Hill",
      address: "Điện Bàn, Quảng Nam",
    }

    expect(isHillCampus(cs1)).toBe(false)
    expect(isHillCampus(hill)).toBe(true)

    // Trung học has 4 morning + 4 afternoon periods by default (never auto-changed to 5 morning)
    const defaultSecondaryCfg = makeBaseConfig()
    expect(defaultSecondaryCfg.morningPeriods).toBe(4)
    expect(defaultSecondaryCfg.afternoonPeriods).toBe(4)

    // Hill supports TH, THCS, THPT; CS1 TRUNG_HOC rejects TH classes
    const hillPrimaryClass = {
      id: "cls-hill-3a",
      className: "3A-Hill",
      campusId: hill.id,
      level: "Tiểu học",
      grade: "3",
      academicYearId: "ay-2026",
    }
    expect(doesClassBelongToScope(hillPrimaryClass, hill, "HILL", "ALL")).toBe(true)
    expect(doesClassBelongToScope(hillPrimaryClass, hill, "TRUNG_HOC", "ALL")).toBe(false)

    // Attempting to save a CS2 Primary class inside CS1 TRUNG_HOC throws SCOPE_VIOLATION
    mockPrisma.campus.findUnique.mockResolvedValueOnce(cs1)
    mockPrisma.class.findMany.mockResolvedValueOnce([
      {
        id: "cls-cs2-4a",
        className: "4A",
        campusId: cs2.id,
        academicYearId: "ay-2026",
        level: "Tiểu học",
        grade: "4",
        educationSystem: "Chất lượng cao",
        homeroomTeacherId: "gv-1",
        status: "ACTIVE",
      },
    ])

    await expect(
      verifyClassesBelongToScope({
        classIds: ["cls-cs2-4a"],
        academicYearId: "ay-2026",
        campusId: "cs1",
        scopeGroup: "TRUNG_HOC",
      })
    ).rejects.toMatchObject({
      name: "TimetableAccessError",
      code: "SCOPE_VIOLATION",
    })
  })

  // ==========================================================================
  // SCENARIO 2: Tài khoản ngoài quyền bị chặn tại server & Liên cấp không lưu
  // ==========================================================================
  it("Scenario 2: blocks unauthorized module roles, out-of-scope campus IDs, and saving LIEN_CAP as level", async () => {
    // 2a. Role without TIMETABLE permission -> FORBIDDEN
    mockHasModulePermission.mockResolvedValueOnce(false)
    await expect(
      requireTimetablePermission("canUpdate", { subModuleCode: "TIMETABLE_SCHEDULE" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" })

    // 2b. Campus-restricted user trying to mutate CS3 when only allowed CS1 -> SCOPE_VIOLATION
    mockGetAdminSession.mockResolvedValueOnce({
      userId: "u-cs1-staff",
      role: "GIAO_VU_CS",
      isFullAccess: false,
      isSuperAdmin: false,
      isHeadOfAcademic: false,
      allowedCampusIds: ["cs1"],
    })
    await expect(
      requireTimetablePermission("canUpdate", {
        subModuleCode: "TIMETABLE_SCHEDULE",
        campusIds: ["cs3"],
      })
    ).rejects.toMatchObject({ code: "SCOPE_VIOLATION" })

    // 2c. Saving with scopeGroup = "LIEN_CAP" -> SCOPE_VIOLATION
    await expect(
      requireTimetablePermission("canUpdate", {
        subModuleCode: "TIMETABLE_SCHEDULE",
        scopeGroup: "LIEN_CAP",
      })
    ).rejects.toMatchObject({ code: "SCOPE_VIOLATION" })
  })

  // ==========================================================================
  // SCENARIO 3: GV trùng giữa Tiểu học, Trung học và Hill (theo mã GV & giờ thực)
  // ==========================================================================
  it("Scenario 3: detects cross-level and cross-campus teacher conflicts between Tiểu học, Trung học, and Hill by teacherId/code and real clock times", () => {
    const cfg = makeBaseConfig({ campusId: "cs1", scopeGroup: "TRUNG_HOC" })
    const teachersById = new Map([
      ["gv-music", { id: "gv-music", teacherCode: "SKL0099", teacherName: "Nguyễn Âm Nhạc" }],
    ])

    // Slot in current Trung học draft at CS1: Monday Morning Period 1 (07:30 - 08:15 -> 450..495)
    const secondarySlot = {
      id: "slot-sec-1",
      classId: "cls-6a",
      className: "6A",
      grade: "6",
      level: "THCS",
      dayOfWeek: "MONDAY",
      session: "MORNING",
      periodNumber: 1,
      subjectId: "sub-music",
      subjectName: "Âm nhạc",
      teacherId: "gv-music",
      teacherCode: "SKL0099",
      teacherName: "Nguyễn Âm Nhạc",
      weekType: "ALL",
    }

    // Active slot in Hill Tiểu học: Monday Morning Period 1 (07:35 - 08:10 -> 455..490)
    const hillExternalSlot = {
      slot: {
        id: "slot-hill-th-1",
        classId: "cls-hill-2a",
        className: "2A-Hill",
        grade: "2",
        level: "Tiểu học",
        dayOfWeek: "MONDAY",
        session: "MORNING",
        periodNumber: 1,
        subjectId: "sub-music",
        subjectName: "Âm nhạc",
        teacherId: "gv-music",
        teacherCode: "SKL0099",
        teacherName: "Tên viết tắt khác nhưng cùng Mã GV",
        weekType: "ALL",
      },
      campusId: "campus-hill-uuid",
      campusName: "Sky-Line Hill",
      scopeGroup: "HILL",
      startMinutes: 455,
      endMinutes: 490,
    }

    const report = validateTimetable({
      slots: [secondarySlot],
      config: cfg,
      campusId: "cs1",
      campusName: "CS1",
      classes: [{ id: "cls-6a", className: "6A", grade: "6", level: "THCS" }],
      teachersById,
      externalActiveSlots: [hillExternalSlot],
    })

    const teacherRule = report.rules.find((r) => r.ruleCode === "R01_TEACHER_CONFLICT")
    expect(teacherRule?.status).toBe("VIOLATED")
    expect(teacherRule?.issues[0]?.message).toContain("SKL0099")
    expect(report.canPublish).toBe(false)
  })

  // ==========================================================================
  // SCENARIO 4: Tuần chẵn/lẻ, trợ giảng/đồng giảng và thời gian di chuyển
  // ==========================================================================
  it("Scenario 4: handles Even/Odd week parity, assistant/co-teacher conflicts, and inter-campus travel time rules", () => {
    // 4a. Week parity from anchor date 2026-09-07 (Week 1 = ODD, Week 2 = EVEN)
    expect(resolveWeekParity("2026-09-09", "2026-09-07", 2)).toBe("ODD")
    expect(resolveWeekParity("2026-09-16", "2026-09-07", 2)).toBe("EVEN")

    const cfg = makeBaseConfig()
    const teachersById = new Map([
      ["gv-main-1", { id: "gv-main-1", teacherCode: "GV01", teacherName: "GV Chính 1" }],
      ["gv-main-2", { id: "gv-main-2", teacherCode: "GV02", teacherName: "GV Chính 2" }],
      ["gv-ta", { id: "gv-ta", teacherCode: "TA01", teacherName: "Trợ Giảng Quốc Tế" }],
    ])

    // 4b. Non-overlapping EVEN and ODD slots for the same teacher at the same time -> PASSED!
    const evenOddNonOverlapping = validateTimetable({
      slots: [
        {
          classId: "cls-6a",
          className: "6A",
          grade: "6",
          level: "THCS",
          dayOfWeek: "TUESDAY",
          session: "MORNING",
          periodNumber: 2,
          subjectId: "sub-bio",
          subjectName: "Sinh học",
          teacherId: "gv-main-1",
          teacherCode: "GV01",
          teacherName: "GV Chính 1",
          weekType: "ODD",
        },
        {
          classId: "cls-6b",
          className: "6B",
          grade: "6",
          level: "THCS",
          dayOfWeek: "TUESDAY",
          session: "MORNING",
          periodNumber: 2,
          subjectId: "sub-bio",
          subjectName: "Sinh học",
          teacherId: "gv-main-1",
          teacherCode: "GV01",
          teacherName: "GV Chính 1",
          weekType: "EVEN",
        },
      ],
      config: cfg,
      campusId: "cs1",
      classes: [
        { id: "cls-6a", className: "6A", grade: "6", level: "THCS" },
        { id: "cls-6b", className: "6B", grade: "6", level: "THCS" },
      ],
      teachersById,
    })
    expect(
      evenOddNonOverlapping.rules.find((r) => r.ruleCode === "R01_TEACHER_CONFLICT")?.status
    ).toBe("PASSED")

    // 4c. Assistant teacher (`assistantTeacherId`) assigned to two classes simultaneously + insufficient travel time between CS1 and CS3
    const assistantAndTravelReport = validateTimetable({
      slots: [
        {
          classId: "cls-6a",
          className: "6A",
          grade: "6",
          level: "THCS",
          dayOfWeek: "WEDNESDAY",
          session: "MORNING",
          periodNumber: 1, // 07:30 - 08:15 (450..495)
          subjectId: "sub-ielts",
          subjectName: "Tiếng Anh",
          teacherId: "gv-main-1",
          assistantTeacherId: "gv-ta",
          assistantTeacherCode: "TA01",
          assistantTeacherName: "Trợ Giảng Quốc Tế",
          weekType: "ALL",
        },
        {
          classId: "cls-6b",
          className: "6B",
          grade: "6",
          level: "THCS",
          dayOfWeek: "WEDNESDAY",
          session: "MORNING",
          periodNumber: 1,
          subjectId: "sub-ielts",
          subjectName: "Tiếng Anh",
          teacherId: "gv-main-2",
          assistantTeacherId: "gv-ta",
          assistantTeacherCode: "TA01",
          assistantTeacherName: "Trợ Giảng Quốc Tế",
          weekType: "ALL",
        },
      ],
      config: cfg,
      campusId: "cs1",
      campusName: "CS1",
      classes: [
        { id: "cls-6a", className: "6A", grade: "6", level: "THCS" },
        { id: "cls-6b", className: "6B", grade: "6", level: "THCS" },
      ],
      teachersById,
      travelRules: [
        {
          fromCampusId: "cs1",
          toCampusId: "cs3",
          minTravelMinutes: 45,
          allowSameSession: false,
          allowSameDay: true,
        },
      ],
      externalActiveSlots: [
        {
          slot: {
            classId: "cls-cs3-7a",
            className: "7A-CS3",
            grade: "7",
            level: "THCS",
            dayOfWeek: "WEDNESDAY",
            session: "MORNING",
            periodNumber: 2, // 08:20 - 09:05 (500..545) -> only 5 mins gap after 08:15!
            subjectId: "sub-math",
            subjectName: "Toán",
            teacherId: "gv-main-1",
            teacherCode: "GV01",
            teacherName: "GV Chính 1",
            weekType: "ALL",
          },
          campusId: "cs3",
          campusName: "CS3",
          scopeGroup: "TRUNG_HOC",
          startMinutes: 500,
          endMinutes: 545,
        },
      ],
    })

    expect(
      assistantAndTravelReport.rules.find((r) => r.ruleCode === "R01_TEACHER_CONFLICT")?.status
    ).toBe("VIOLATED")
    expect(
      assistantAndTravelReport.rules.find((r) => r.ruleCode === "R02_CAMPUS_TRAVEL")?.status
    ).toBe("VIOLATED")
  })

  // ==========================================================================
  // SCENARIO 5: Đủ tiết theo phân công, giữ tiết khóa & phân biệt hết giờ
  // ==========================================================================
  it("Scenario 5: reconciles SubjectQuota with TeachingAssignment (reporting missing teachers without 2-period fallback), preserves locked slots, and distinguishes unfeasible vs completed", () => {
    const classes = [
      {
        id: "cls-8a",
        className: "8A",
        grade: "8",
        level: "THCS",
        educationSystem: "HNS",
        homeroomTeacherId: "gv-cn",
      },
    ]
    const subjects = [
      { id: "sub-math", subjectCode: "TOAN", subjectName: "Toán" },
      { id: "sub-phys", subjectCode: "LY", subjectName: "Vật lý" },
    ]
    const teachers = [
      { id: "gv-math", teacherCode: "GVM01", teacherName: "Thầy Toán" },
      { id: "gv-cn", teacherCode: "GVCN01", teacherName: "Cô Chủ Nhiệm" },
    ]

    const quotas = [
      {
        id: "q-math",
        subjectId: "sub-math",
        academicYearId: "ay-2026",
        studyProgram: "Hệ S",
        quota: 0,
        quotaPrimary: 0,
        quotaMiddle: 0,
        quotaHigh: 0,
        quotaG1: 0,
        quotaG2: 0,
        quotaG3: 0,
        quotaG4: 0,
        quotaG5: 0,
        quotaG6: 0,
        quotaG7: 0,
        quotaG8: 4, // 4 periods/week
        quotaG9: 0,
        quotaG10: 0,
        quotaG11: 0,
        quotaG12: 0,
      },
      {
        id: "q-phys",
        subjectId: "sub-phys",
        academicYearId: "ay-2026",
        studyProgram: "Hệ S",
        quota: 0,
        quotaPrimary: 0,
        quotaMiddle: 0,
        quotaHigh: 0,
        quotaG1: 0,
        quotaG2: 0,
        quotaG3: 0,
        quotaG4: 0,
        quotaG5: 0,
        quotaG6: 0,
        quotaG7: 0,
        quotaG8: 1.5, // 1.5 periods/week -> 3 periods / 2-week cycle!
        quotaG9: 0,
        quotaG10: 0,
        quotaG11: 0,
        quotaG12: 0,
      },
    ]

    // Physics intentionally has NO TeachingAssignment -> must report MISSING_TEACHER (never random teacher!)
    const reconciled = reconcileQuotasAndAssignments({
      classes,
      subjects,
      teachers,
      subjectQuotas: quotas,
      teachingAssignments: [
        {
          id: "ta-1",
          classId: "cls-8a",
          subjectId: "sub-math",
          teacherId: "gv-math",
          academicYearId: "ay-2026",
          semester: 1,
        },
      ],
      scheduledSlots: [],
      cycleWeeks: 2,
    })

    const mathQuota = reconciled.find((r) => r.subjectId === "sub-math")!
    const physQuota = reconciled.find((r) => r.subjectId === "sub-phys")!
    expect(mathQuota.weeklyQuota).toBe(4)
    expect(mathQuota.status).toBe("UNDER_SCHEDULED")
    expect(physQuota.weeklyQuota).toBe(1.5)
    expect(physQuota.cycleQuota).toBe(3)
    expect(physQuota.status).toBe("MISSING_TEACHER")
    expect(physQuota.primaryTeacherId).toBeNull()

    // Auto-scheduler preserves locked slot on MONDAY MORNING P2 and schedules remaining 3 Math periods
    const lockedSlot = {
      id: "locked-1",
      classId: "cls-8a",
      className: "8A",
      grade: "8",
      level: "THCS",
      dayOfWeek: "MONDAY",
      session: "MORNING",
      periodNumber: 2,
      subjectId: "sub-math",
      subjectName: "Toán",
      teacherId: "gv-math",
      teacherCode: "GVM01",
      teacherName: "Thầy Toán",
      weekType: "ALL",
      isLocked: true,
    }

    const schedResult = runAutoScheduler({
      campusId: "cs1",
      academicYearId: "ay-2026",
      semester: 1,
      config: makeBaseConfig(),
      classes,
      teachers,
      quotaItems: [mathQuota],
      existingSlots: [lockedSlot],
      timeLimitMs: 3000,
    })

    expect(schedResult.outcome).toBe("COMPLETED")
    expect(schedResult.lockedPreservedCount).toBe(1)
    expect(schedResult.generatedSlots).toHaveLength(4)
    const preserved = schedResult.generatedSlots.find(
      (s) => s.dayOfWeek === "MONDAY" && s.session === "MORNING" && s.periodNumber === 2
    )
    expect(preserved?.isLocked).toBe(true)
    expect(preserved?.subjectId).toBe("sub-math")
  })

  // ==========================================================================
  // SCENARIO 6: Ngoại lệ ngày không sửa lịch tuần gốc & kiểm tra trùng dạy thay
  // ==========================================================================
  it("Scenario 6: overlays date-specific substitutions without mutating weekly TimetableSlot rows and blocks busy substitute teachers", async () => {
    mockPrisma.class.findUnique.mockResolvedValue({
      id: "cls-10a",
      className: "10A",
      grade: "10",
      level: "THPT",
      campusId: "cs1",
      academicYearId: "ay-2026",
      campus: { id: "cs1", campusCode: "CS1", campusName: "Cơ sở 1", address: "Đà Nẵng" },
    })
    mockPrisma.timetableVersion.findMany.mockResolvedValue([
      {
        id: "ver-pub-1",
        code: "TKB-CS1-V1",
        name: "TKB Chính thức Đợt 1",
        campusId: "cs1",
        scopeGroup: "TRUNG_HOC",
        academicYearId: "ay-2026",
        semester: 1,
        versionNumber: 1,
        status: "PUBLISHED",
        effectiveFrom: "2026-09-07",
        effectiveTo: null,
      },
    ])
    mockPrisma.timetableConfig.findFirst.mockResolvedValue(null)
    mockPrisma.timetableSlot.findMany.mockResolvedValue([
      {
        id: "slot-mon-1",
        versionId: "ver-pub-1",
        campusId: "cs1",
        classId: "cls-10a",
        className: "10A",
        grade: "10",
        level: "THPT",
        dayOfWeek: "MONDAY",
        session: "MORNING",
        periodNumber: 1,
        subjectId: "sub-lit",
        subjectName: "Ngữ văn",
        teacherId: "gv-orig",
        teacherName: "Cô Văn Gốc",
        weekType: "ALL",
        status: "ACTIVE",
      },
    ])
    mockPrisma.teacher.findMany.mockResolvedValue([
      { id: "gv-orig", teacherCode: "GV_VAN" },
    ])

    // Week 1 (2026-09-14): SUBSTITUTE recorded on 2026-09-14
    mockPrisma.timetableSubstitution.findMany.mockResolvedValueOnce([
      {
        id: "sub-1",
        targetDate: "2026-09-14",
        actionType: "SUBSTITUTE",
        classId: "cls-10a",
        className: "10A",
        dayOfWeek: "MONDAY",
        session: "MORNING",
        periodNumber: 1,
        substituteTeacherId: "gv-sub",
        substituteTeacherCode: "GV_THAY",
        substituteTeacherName: "Thầy Dạy Thay",
        reason: "Cô Văn Gốc đi chấm thi",
        status: "ACTIVE",
      },
    ])

    const weekWithSub = await getEffectiveClassWeekSchedule({
      classId: "cls-10a",
      referenceDateIso: "2026-09-14",
      strictPublishedOnly: true,
    })
    expect(weekWithSub.items[0]?.isSubstituted).toBe(true)
    expect(weekWithSub.items[0]?.teacherCode).toBe("GV_THAY")

    // Next week (2026-09-21): no substitution -> weekly base slot remains intact!
    mockPrisma.timetableSubstitution.findMany.mockResolvedValueOnce([])
    const nextWeekOriginal = await getEffectiveClassWeekSchedule({
      classId: "cls-10a",
      referenceDateIso: "2026-09-21",
      strictPublishedOnly: true,
    })
    expect(nextWeekOriginal.items[0]?.isSubstituted).toBe(false)
    expect(nextWeekOriginal.items[0]?.teacherCode).toBe("GV_VAN")
    expect(mockPrisma.timetableSlot.update).not.toHaveBeenCalled()

    // Digital Testing proctor conflict check catches effective teaching slot on 2026-09-21 07:30-08:30
    mockPrisma.campus.findMany.mockResolvedValue([
      { id: "cs1", campusCode: "CS1", campusName: "Cơ sở 1" },
    ])
    mockPrisma.timetableConfig.findMany.mockResolvedValue([])
    mockPrisma.teacher.findUnique.mockResolvedValue({
      id: "gv-orig",
      teacherCode: "GV_VAN",
      teacherName: "Cô Văn Gốc",
    })
    mockPrisma.timetableSubstitution.findMany.mockResolvedValueOnce([])

    const proctorWarnings = await checkProctorTimetableConflict({
      teacherId: "gv-orig",
      examDate: new Date("2026-09-21T00:00:00Z"),
      startTime: "07:30",
      endTime: "08:30",
      examCampusId: "cs1",
    })
    expect(proctorWarnings.length).toBeGreaterThan(0)
    expect(proctorWarnings[0]).toContain("10A")

    // Busy substitute teacher on 2026-09-21 Morning Period 1 is rejected by createTimetableSubstitutionAction!
    mockPrisma.campus.findUnique.mockResolvedValueOnce({
      id: "cs1",
      campusCode: "CS1",
      campusName: "Cơ sở 1",
    })
    mockPrisma.class.findMany.mockResolvedValueOnce([
      {
        id: "cls-10b",
        className: "10B",
        campusId: "cs1",
        academicYearId: "ay-2026",
        level: "THPT",
        grade: "10",
        status: "ACTIVE",
      },
    ])
    mockPrisma.timetableSlot.findFirst.mockResolvedValueOnce(null)
    mockPrisma.teacher.findUnique.mockResolvedValue({
      id: "gv-orig",
      teacherCode: "GV_VAN",
      teacherName: "Cô Văn Gốc",
    })
    mockPrisma.timetableSubstitution.findMany.mockResolvedValueOnce([])

    const busySubRes = await createTimetableSubstitutionAction({
      academicYearId: "ay-2026",
      semester: 1,
      campusId: "cs1",
      scopeGroup: "TRUNG_HOC",
      targetDate: "2026-09-21",
      actionType: "SUBSTITUTE",
      classId: "cls-10b",
      session: "MORNING",
      periodNumber: 1,
      substituteTeacherId: "gv-orig", // Already teaching 10A at Morning Period 1!
      reason: "Thử gán GV đang bận đứng lớp 10A",
    })
    expect(busySubRes.success).toBe(false)
    if (!busySubRes.success) {
      expect(busySubRes.error).toContain("10A")
    }
  })

  // ==========================================================================
  // SCENARIO 7: Không ban hành lịch còn thiếu tiết hoặc lỗi bắt buộc
  // ==========================================================================
  it("Scenario 7: blocks approval and publishing when schedule is missing periods or has mandatory rule violations", () => {
    const cfg = makeBaseConfig()
    const teachersById = new Map([
      ["gv-1", { id: "gv-1", teacherCode: "GV01", teacherName: "Thầy A" }],
    ])

    const incompleteReport = validateTimetable({
      slots: [], // 0 scheduled slots while quota requires 4 periods!
      config: cfg,
      campusId: "cs1",
      classes: [{ id: "cls-9a", className: "9A", grade: "9", level: "THCS" }],
      teachersById,
      quotaItems: [
        {
          classId: "cls-9a",
          className: "9A",
          grade: "9",
          level: "THCS",
          educationSystem: "CLC",
          studyProgram: "CLC",
          subjectId: "sub-math",
          subjectCode: "TOAN",
          subjectName: "Toán",
          weeklyQuota: 4,
          cycleQuota: 8,
          cycleWeeks: 2,
          scheduledWeeklyEquivalent: 0,
          missingWeeklyPeriods: 4,
          overScheduledWeeklyPeriods: 0,
          primaryTeacherId: "gv-1",
          primaryTeacherCode: "GV01",
          primaryTeacherName: "Thầy A",
          coTeacherId: null,
          coTeacherCode: null,
          coTeacherName: null,
          assignmentSource: "TEACHING_ASSIGNMENT",
          status: "UNDER_SCHEDULED",
        },
      ],
    })

    expect(incompleteReport.canPublish).toBe(false)
    expect(incompleteReport.hasHardViolations).toBe(true)
    const quotaRule = incompleteReport.rules.find((r) => r.ruleCode === "R05_QUOTA_COMPLETENESS")
    expect(quotaRule?.status).toBe("VIOLATED")
  })

  // ==========================================================================
  // SCENARIO 8: Hai người sửa hoặc ban hành đồng thời & ngăn chồng hiệu lực
  // ==========================================================================
  it("Scenario 8: prevents concurrent overwrites via optimistic revision and blocks overlapping published effective windows", async () => {
    const authCtx = await requireTimetablePermission("canUpdate")

    // 8a. User A opens revision 3, User B already saved revision 4 -> verifyEditableVersion throws CONFLICT
    mockPrisma.timetableVersion.findUnique.mockResolvedValueOnce({
      id: "ver-draft-1",
      name: "Phương án 1",
      campusId: "cs1",
      status: "DRAFT",
      revision: 4,
    })

    await expect(verifyEditableVersion(authCtx, "ver-draft-1", 3)).rejects.toMatchObject({
      name: "TimetableAccessError",
      code: "CONFLICT",
    })

    // 8b. Editing a PUBLISHED version directly is blocked -> FORBIDDEN (must clone new version)
    mockPrisma.timetableVersion.findUnique.mockResolvedValueOnce({
      id: "ver-pub-1",
      name: "Lịch Đã Ban Hành",
      campusId: "cs1",
      status: "PUBLISHED",
      revision: 2,
    })
    await expect(verifyEditableVersion(authCtx, "ver-pub-1", 2)).rejects.toMatchObject({
      code: "FORBIDDEN",
    })

    // 8c. Concurrent transition status with stale expectedRevision -> returns conflict error
    mockPrisma.timetableVersion.findUnique.mockResolvedValueOnce({
      id: "ver-approved-1",
      code: "TKB-V2",
      name: "Phương án 2",
      academicYearId: "ay-2026",
      semester: 1,
      campusId: "cs1",
      scopeGroup: "TRUNG_HOC",
      status: "APPROVED",
      revision: 5, // DB is at rev 5 while caller sends expectedRevision: 4
      effectiveFrom: "2026-10-01",
      effectiveTo: null,
    })

    const stalePublish = await transitionTimetableVersionStatusAction({
      versionId: "ver-approved-1",
      expectedRevision: 4,
      transition: "PUBLISH",
      effectiveFrom: "2026-10-01",
    })
    expect(stalePublish.success).toBe(false)
    if (!stalePublish.success && "errorCode" in stalePublish) {
      expect(stalePublish.errorCode).toBe("CONFLICT")
    }

    // 8d. Effective date overlap helper accurately detects overlapping vs disjoint windows
    expect(doDateRangesOverlap("2026-09-01", null, "2026-10-01", "2026-12-31")).toBe(true)
    expect(doDateRangesOverlap("2026-09-01", "2026-09-30", "2026-10-01", "2026-12-31")).toBe(
      false
    )
  })

  // ==========================================================================
  // SCENARIO 9: HS/PHHS chỉ xem lịch đã ban hành & Dự giờ xác thực ở server
  // ==========================================================================
  it("Scenario 9: enforces strict PUBLISHED-only visibility for Student/Parent portals and re-verifies Observation slots on server", async () => {
    mockPrisma.class.findUnique.mockResolvedValueOnce({
      id: "cls-5a",
      className: "5A",
      grade: "5",
      level: "Tiểu học",
      campusId: "cs1",
      academicYearId: "ay-2026",
      campus: { id: "cs1", campusCode: "CS1", campusName: "Cơ sở 1" },
    })
    // No PUBLISHED version exists (only drafts in DB)
    mockPrisma.timetableVersion.findMany.mockResolvedValueOnce([])
    mockPrisma.timetableConfig.findFirst.mockResolvedValueOnce(null)

    const studentSched = await getEffectiveClassWeekSchedule({
      classId: "cls-5a",
      referenceDateIso: "2026-09-14",
      strictPublishedOnly: true,
    })
    expect(studentSched.version).toBeNull()
    expect(studentSched.items).toHaveLength(0)

    // Observation check: draft slot is rejected on server
    mockPrisma.timetableSlot.findUnique.mockResolvedValueOnce({
      id: "slot-draft-99",
      versionId: "ver-draft-99",
      campusId: "cs1",
      classId: "cls-5a",
      className: "5A",
      grade: "5",
      level: "Tiểu học",
      dayOfWeek: "TUESDAY",
      session: "MORNING",
      periodNumber: 2,
      subjectId: "sub-eng",
      subjectName: "Tiếng Anh",
      teacherId: "gv-eng",
      teacherName: "Cô Tiếng Anh",
    })
    mockPrisma.timetableVersion.findUnique.mockResolvedValueOnce({
      id: "ver-draft-99",
      status: "DRAFT",
      effectiveFrom: null,
      effectiveTo: null,
    })

    const draftObsVerify = await verifyTimetableSlotForObservation({
      slotId: "slot-draft-99",
      targetDateIso: "2026-09-15",
    })
    expect(draftObsVerify.valid).toBe(false)

    // Observation check: published slot on LEAVE date is rejected on server
    mockPrisma.timetableSlot.findUnique.mockResolvedValueOnce({
      id: "slot-pub-99",
      versionId: "ver-pub-99",
      campusId: "cs1",
      classId: "cls-5a",
      className: "5A",
      grade: "5",
      level: "Tiểu học",
      dayOfWeek: "TUESDAY",
      session: "MORNING",
      periodNumber: 2,
      subjectId: "sub-eng",
      subjectName: "Tiếng Anh",
      teacherId: "gv-eng",
      teacherName: "Cô Tiếng Anh",
    })
    mockPrisma.timetableVersion.findUnique.mockResolvedValueOnce({
      id: "ver-pub-99",
      status: "PUBLISHED",
      effectiveFrom: "2026-09-01",
      effectiveTo: "2026-12-31",
    })
    mockPrisma.timetableSubstitution.findFirst.mockResolvedValueOnce({
      id: "leave-1",
      reason: "GV nghỉ ốm",
    })

    const leaveObsVerify = await verifyTimetableSlotForObservation({
      slotId: "slot-pub-99",
      targetDateIso: "2026-09-15",
    })
    expect(leaveObsVerify.valid).toBe(false)
  })

  // ==========================================================================
  // SCENARIO 10: Tiết cố định theo cấu hình (không hardcode Thứ Hai tiết 1) & Khối tiết cùng buổi
  // ==========================================================================
  it("Scenario 10: validates configured fixed slots (without hardcoding Monday P1) and same-session block rules", () => {
    const cfg = makeBaseConfig({
      fixedSlots: [
        {
          id: "fx-shl",
          label: "Sinh hoạt lớp cuối tuần",
          subjectId: "sub-shl",
          subjectName: "Sinh hoạt lớp",
          dayOfWeek: "FRIDAY",
          session: "AFTERNOON",
          periodNumber: 4,
          assignHomeroomTeacher: true,
        },
      ],
      blockRules: [
        {
          id: "blk-lit",
          subjectId: "sub-lit",
          subjectName: "Ngữ văn",
          minConsecutive: 2,
          maxConsecutive: 2,
          requireSameSession: true,
        },
      ],
    })

    // Placing Ngữ văn as single isolated period on Friday Morning P4 + Afternoon P1 (split across lunch)
    // AND missing Friday Afternoon P4 Sinh hoạt lớp -> both R07 and R08 must be VIOLATED!
    const report = validateTimetable({
      slots: [
        {
          classId: "cls-9a",
          className: "9A",
          grade: "9",
          level: "THCS",
          dayOfWeek: "FRIDAY",
          session: "MORNING",
          periodNumber: 4,
          subjectId: "sub-lit",
          subjectName: "Ngữ văn",
          teacherId: "gv-lit",
          teacherCode: "GVL01",
          teacherName: "Cô Văn",
          weekType: "ALL",
        },
        {
          classId: "cls-9a",
          className: "9A",
          grade: "9",
          level: "THCS",
          dayOfWeek: "FRIDAY",
          session: "AFTERNOON",
          periodNumber: 1,
          subjectId: "sub-lit",
          subjectName: "Ngữ văn",
          teacherId: "gv-lit",
          teacherCode: "GVL01",
          teacherName: "Cô Văn",
          weekType: "ALL",
        },
      ],
      config: cfg,
      campusId: "cs1",
      classes: [{ id: "cls-9a", className: "9A", grade: "9", level: "THCS" }],
      teachersById: new Map([
        ["gv-lit", { id: "gv-lit", teacherCode: "GVL01", teacherName: "Cô Văn" }],
      ]),
    })

    expect(report.rules.find((r) => r.ruleCode === "R07_FIXED_SLOTS")?.status).toBe("VIOLATED")
    expect(report.rules.find((r) => r.ruleCode === "R08_BLOCK_RULES")?.status).toBe("VIOLATED")
  })

  it("Scenario 9: resolves THPT combination track quotas (10 TN, 10 XH, 11 TN, 11 XH, 12 TN, 12 XH) including explicit 0 periods", () => {
    expect(detectHighSchoolTrack("10/1 TN")).toBe("TN")
    expect(detectHighSchoolTrack("10/2 XH")).toBe("XH")
    expect(detectHighSchoolTrack("11/1 XH")).toBe("XH")
    expect(detectHighSchoolTrack("12/1 TN")).toBe("TN")
    expect(detectHighSchoolTrack("12/2 XH")).toBe("XH")
    expect(detectHighSchoolTrack("10A1")).toBeNull()

    const taBgdQuota = {
      id: "q-tabgd",
      subjectId: "sub-tabgd",
      academicYearId: "ay-2026",
      studyProgram: "Hệ S",
      quota: 0,
      quotaPrimary: 0,
      quotaMiddle: 0,
      quotaHigh: 12,
      quotaG1: 0, quotaG2: 0, quotaG3: 0, quotaG4: 0, quotaG5: 0,
      quotaG6: 0, quotaG7: 0, quotaG8: 0, quotaG9: 0,
      quotaG10: 2, quotaG11: 2, quotaG12: 4,
      quotaG10TN: 2, quotaG10XH: 2,
      quotaG11TN: 2, quotaG11XH: 0, // Explicitly 0 in 11 XH even though 11 TN / legacy G11 is 2
      quotaG12TN: 4, quotaG12XH: 4,
      specialNoteFlags: "G10TN",
    }

    expect(resolveGradeQuotaValue(taBgdQuota, 10, "THPT", "10/1 TN")).toBe(2)
    expect(resolveGradeQuotaValue(taBgdQuota, 10, "THPT", "10/2 XH")).toBe(2)
    expect(resolveGradeQuotaValue(taBgdQuota, 11, "THPT", "11/1 TN")).toBe(2)
    expect(resolveGradeQuotaValue(taBgdQuota, 11, "THPT", "11/1 XH")).toBe(0)
    expect(resolveGradeQuotaValue(taBgdQuota, 12, "THPT", "12/1 TN")).toBe(4)
    expect(resolveGradeQuotaValue(taBgdQuota, 12, "THPT", "12/2 XH")).toBe(4)
  })

  it("Scenario 12: unifies education systems into canonical 2-system model (Hệ S & Hệ I)", () => {
    expect(mapEducationSystemToStudyProgram("HNS")).toBe("Hệ S")
    expect(mapEducationSystemToStudyProgram("MNS")).toBe("Hệ S")
    expect(mapEducationSystemToStudyProgram("Hệ S")).toBe("Hệ S")

    expect(mapEducationSystemToStudyProgram("HNG")).toBe("Hệ I")
    expect(mapEducationSystemToStudyProgram("SB")).toBe("Hệ I")
    expect(mapEducationSystemToStudyProgram("MNG")).toBe("Hệ I")
    expect(mapEducationSystemToStudyProgram("Hệ Song Bằng")).toBe("Hệ I")
    expect(mapEducationSystemToStudyProgram("Hệ S Quốc tế")).toBe("Hệ I")
    expect(mapEducationSystemToStudyProgram("Hệ I")).toBe("Hệ I")
  })

  it("Scenario 13: evaluates drag-and-drop conflict preview, live quota counts, and bulk Bộ TKB setup placement", () => {
    const cfg = makeBaseConfig()
    const teachersById = new Map([
      ["gv-1", { id: "gv-1", teacherCode: "GV001", teacherName: "Triệu Thùy Trang" }],
      ["gv-2", { id: "gv-2", teacherCode: "GV002", teacherName: "Nguyễn Thị Mơ" }],
    ])

    const classes = [
      { id: "c1", className: "1.1_CS1", grade: "1", level: "TIEU_HOC", homeroomTeacherId: "gv-1" },
      { id: "c2", className: "1.2_CS1", grade: "1", level: "TIEU_HOC", homeroomTeacherId: "gv-2" },
    ]

    const baseQuotas = [
      {
        classId: "c1",
        className: "1.1_CS1",
        grade: "1",
        level: "TIEU_HOC",
        educationSystem: "HNS",
        studyProgram: "Hệ S",
        subjectId: "sub-math",
        subjectCode: "TOAN",
        subjectName: "Toán học",
        weeklyQuota: 4,
        cycleQuota: 8,
        cycleWeeks: 2,
        scheduledWeeklyEquivalent: 0,
        missingWeeklyPeriods: 4,
        overScheduledWeeklyPeriods: 0,
        primaryTeacherId: "gv-1",
        primaryTeacherCode: "GV001",
        primaryTeacherName: "Triệu Thùy Trang",
        coTeacherId: null,
        coTeacherCode: null,
        coTeacherName: null,
        assignmentSource: "TEACHING_ASSIGNMENT" as const,
        status: "UNDER_SCHEDULED" as const,
      },
    ]

    // Bulk apply HĐTN across the entire Bộ TKB using Homeroom Teachers & lock
    const bulk = buildBulkScopePlacement({
      targetClasses: classes,
      subjectId: "sub-hdtn",
      subjectCode: "HDTN",
      subjectName: "HĐTN/ GDCĐ",
      dayOfWeek: "MONDAY",
      session: "MORNING",
      periodNumber: 1,
      weekType: "ALL",
      useHomeroomTeacher: true,
      lockPlacedSlots: true,
      overwriteUnlocked: true,
      currentSlots: [],
      quotaItems: baseQuotas,
      teachersById,
      campusId: "cs1",
      config: cfg,
      busySlots: [],
      externalActiveSlots: [],
      travelRules: [],
    })

    expect(bulk.appliedCount).toBe(2)
    expect(bulk.nextSlots.every((s) => s.isLocked)).toBe(true)
    expect(bulk.nextSlots.find((s) => s.classId === "c1")?.teacherId).toBe("gv-1")
    expect(bulk.nextSlots.find((s) => s.classId === "c2")?.teacherId).toBe("gv-2")

    // Suppose gv-1 is also teaching Class 1.2 at MONDAY MORNING Period 2
    const currentSlots = [
      ...bulk.nextSlots,
      {
        classId: "c2",
        className: "1.2_CS1",
        grade: "1",
        level: "TIEU_HOC",
        dayOfWeek: "MONDAY",
        session: "MORNING",
        periodNumber: 2,
        subjectId: "sub-math",
        subjectName: "Toán học",
        teacherId: "gv-1",
        teacherCode: "GV001",
        teacherName: "Triệu Thùy Trang",
        weekType: "ALL",
        isLocked: false,
      },
    ]
    const slotByCell = new Map(
      currentSlots.map((s) => [
        makeSlotCellKey(s.classId, s.dayOfWeek, s.session, s.periodNumber),
        s,
      ])
    )

    // Dragging Toán học (gv-1) onto c1 MONDAY MORNING P1 (locked) -> BLOCKED
    const evalLocked = evaluateCellDropTarget({
      dragged: { kind: "QUOTA_ACTIVITY", item: baseQuotas[0], weekType: "ALL" },
      targetClass: classes[0],
      dayOfWeek: "MONDAY",
      session: "MORNING",
      periodNumber: 1,
      currentSlots,
      slotByCell,
      quotaItems: baseQuotas,
      teachersById,
      campusId: "cs1",
      config: cfg,
      busySlots: [],
      externalActiveSlots: [],
      travelRules: [],
      autoLockManual: true,
    })
    expect(evalLocked.status).toBe("BLOCKED")

    // Dragging Toán học (gv-1) onto c1 MONDAY MORNING P2 -> CONFLICT (gv-1 teaching 1.2_CS1)
    const evalConflict = evaluateCellDropTarget({
      dragged: { kind: "QUOTA_ACTIVITY", item: baseQuotas[0], weekType: "ALL" },
      targetClass: classes[0],
      dayOfWeek: "MONDAY",
      session: "MORNING",
      periodNumber: 2,
      currentSlots,
      slotByCell,
      quotaItems: baseQuotas,
      teachersById,
      campusId: "cs1",
      config: cfg,
      busySlots: [],
      externalActiveSlots: [],
      travelRules: [],
      autoLockManual: true,
    })
    expect(evalConflict.status).toBe("CONFLICT")
    expect(evalConflict.reason).toContain("1.2_CS1")

    // Dragging Toán học (gv-1) onto c1 MONDAY MORNING P3 -> VALID & auto-locked
    const evalValid = evaluateCellDropTarget({
      dragged: { kind: "QUOTA_ACTIVITY", item: baseQuotas[0], weekType: "ALL" },
      targetClass: classes[0],
      dayOfWeek: "MONDAY",
      session: "MORNING",
      periodNumber: 3,
      currentSlots,
      slotByCell,
      quotaItems: baseQuotas,
      teachersById,
      campusId: "cs1",
      config: cfg,
      busySlots: [],
      externalActiveSlots: [],
      travelRules: [],
      autoLockManual: true,
    })
    expect(evalValid.status).toBe("VALID")
    expect(evalValid.resolvedSlot?.isLocked).toBe(true)

    const recomputed = recomputeLiveQuotaItems(baseQuotas, [
      ...currentSlots,
      evalValid.resolvedSlot!,
    ])
    expect(recomputed[0].scheduledWeeklyEquivalent).toBe(1)
    expect(recomputed[0].missingWeeklyPeriods).toBe(3)
  })
})
