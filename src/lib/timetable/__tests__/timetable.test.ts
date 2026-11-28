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
  parseSelectedCampusIds,
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
  hydrateSlotsFromAssignments,
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
  groupTeachersByDepartment,
  teacherMatchesDepartment,
  UNASSIGNED_DEPT_VALUE,
} from "@/lib/timetable/departmentHelper"
import {
  buildAllGradesMatrixStats,
  buildSingleGradeStats,
  computeClassSlotSummary,
} from "@/lib/timetable/gradeStatsHelper"
import {
  buildPrismaQuotaFieldsFromQd82Spec,
  computeQd82ColumnSums,
  QD82_2026_SUBJECT_STANDARDS,
} from "@/lib/timetable/curriculumStandardQd82"
import {
  buildLearnedScheduleMemory,
  computeTeacherMultiCampusPriority,
} from "@/lib/timetable/learnedScheduleMemory"
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

    // Dragging unassigned-teacher subject (primaryTeacherId: null) still places slot cleanly
    const unassignedQuota = {
      ...baseQuotas[0],
      subjectId: "sub-eng",
      subjectCode: "ENG",
      subjectName: "Academic English",
      primaryTeacherId: null,
      primaryTeacherCode: null,
      primaryTeacherName: null,
      status: "MISSING_TEACHER" as const,
    }
    const evalUnassigned = evaluateCellDropTarget({
      dragged: { kind: "QUOTA_ACTIVITY", item: unassignedQuota, weekType: "ALL" },
      targetClass: classes[0],
      dayOfWeek: "TUESDAY",
      session: "MORNING",
      periodNumber: 1,
      currentSlots,
      slotByCell,
      quotaItems: [unassignedQuota],
      teachersById,
      campusId: "cs1",
      config: cfg,
      busySlots: [],
      externalActiveSlots: [],
      travelRules: [],
      autoLockManual: true,
    })
    expect(evalUnassigned.status).toBe("VALID")
    expect(evalUnassigned.resolvedSlot?.subjectId).toBe("sub-eng")
    expect(evalUnassigned.resolvedSlot?.teacherId).toBeNull()

    // Dragging TEACHER onto that placed slot assigns primary teacher and detects conflicts if busy
    const slotsWithUnassigned = [...currentSlots, evalUnassigned.resolvedSlot!]
    const mapWithUnassigned = new Map(
      slotsWithUnassigned.map((s) => [
        makeSlotCellKey(s.classId, s.dayOfWeek, s.session, s.periodNumber),
        s,
      ])
    )
    const evalTeacherAssign = evaluateCellDropTarget({
      dragged: {
        kind: "TEACHER",
        teacherId: "gv-2",
        teacherCode: "GV02",
        teacherName: "Thầy B",
        roleMode: "PRIMARY",
      },
      targetClass: classes[0],
      dayOfWeek: "TUESDAY",
      session: "MORNING",
      periodNumber: 1,
      currentSlots: slotsWithUnassigned,
      slotByCell: mapWithUnassigned,
      quotaItems: [unassignedQuota],
      teachersById,
      campusId: "cs1",
      config: cfg,
      busySlots: [],
      externalActiveSlots: [],
      travelRules: [],
      autoLockManual: true,
    })
    expect(evalTeacherAssign.status).toBe("SWAP_VALID")
    expect(evalTeacherAssign.resolvedSlot?.teacherId).toBe("gv-2")
    expect(evalTeacherAssign.resolvedSlot?.subjectId).toBe("sub-eng")
  })

  // ==========================================================================
  // SCENARIO 12: Lọc và phân nhóm Giáo viên theo Tổ chuyên môn & Môn chuyên môn
  // ==========================================================================
  it("Scenario 12: filters teachers by Tổ chuyên môn (supporting multi-department assignments) and prioritizes mainSubjectId in optgroups", () => {
    const sampleTeachers = [
      {
        id: "gv-eng-1",
        teacherCode: "GV_ENG_01",
        teacherName: "Nguyễn Thị Anh",
        mainSubjectId: "sub-eng",
        departmentId: "dept-eng",
        departmentName: "Tổ Tiếng Anh",
        departmentIds: ["dept-eng", "dept-intl"],
      },
      {
        id: "gv-math-1",
        teacherCode: "GV_MATH_01",
        teacherName: "Trần Văn Toán",
        mainSubjectId: "sub-math",
        departmentId: "dept-nat",
        departmentName: "Tổ Khoa học Tự nhiên",
        departmentIds: ["dept-nat"],
      },
      {
        id: "gv-free",
        teacherCode: "GV_FREE_01",
        teacherName: "Lê Minh Tự Do",
        mainSubjectId: null,
        departmentId: null,
        departmentName: null,
        departmentIds: [],
      },
    ]

    // Multi-department teacher matches both primary and secondary departments
    expect(teacherMatchesDepartment(sampleTeachers[0], "dept-eng")).toBe(true)
    expect(teacherMatchesDepartment(sampleTeachers[0], "dept-intl")).toBe(true)
    expect(teacherMatchesDepartment(sampleTeachers[0], "dept-nat")).toBe(false)

    // Unassigned department filter
    expect(teacherMatchesDepartment(sampleTeachers[2], UNASSIGNED_DEPT_VALUE)).toBe(true)
    expect(teacherMatchesDepartment(sampleTeachers[1], UNASSIGNED_DEPT_VALUE)).toBe(false)

    // Grouping with prioritySubjectId = "sub-eng" puts English specialist in top group
    const groups = groupTeachersByDepartment(sampleTeachers, "sub-eng")
    expect(groups[0]?.key).toBe("__PRIORITY_SUBJECT__")
    expect(groups[0]?.teachers.map((t) => t.id)).toEqual(["gv-eng-1"])

    const deptLabels = groups.slice(1).map((g) => g.label)
    expect(deptLabels).toContain("Tổ Khoa học Tự nhiên")
    expect(deptLabels).toContain("Chưa phân Tổ chuyên môn")
  })

  // ==========================================================================
  // SCENARIO 14: Ghép môn luân phiên & gán Giáo viên cho môn luân phiên (Tuần lẻ / chẵn)
  // ==========================================================================
  it("Scenario 14: pairs alternating subjects onto half-week locked cells and validates ALT_TEACHER assignment by week parity", () => {
    const cfg = makeBaseConfig()
    const classes = [
      { id: "c-61", className: "6.1_CS1", grade: "6", level: "THCS", homeroomTeacherId: "gv-hr" },
      { id: "c-62", className: "6.2_CS1", grade: "6", level: "THCS", homeroomTeacherId: null },
    ]
    const teachersById = new Map([
      ["gv-math", { id: "gv-math", teacherCode: "0201000799", teacherName: "Nguyễn Thị Hoa" }],
      ["gv-gdcd", { id: "gv-gdcd", teacherCode: "0201000888", teacherName: "Trần Thị GDCD" }],
    ])

    // Class 6.1 has Math on Tuesday Morning P4 (ODD week, locked), and Class 6.2 has gv-gdcd teaching EVEN week at same period
    const baseSlots = [
      {
        classId: "c-61",
        className: "6.1_CS1",
        grade: "6",
        level: "THCS",
        dayOfWeek: "TUESDAY" as const,
        session: "MORNING" as const,
        periodNumber: 4,
        subjectId: "sub-math",
        subjectCode: "TOAN",
        subjectName: "Toán học",
        teacherId: "gv-math",
        teacherCode: "0201000799",
        teacherName: "Nguyễn Thị Hoa",
        weekType: "ODD" as const,
        isLocked: true,
      },
      {
        classId: "c-62",
        className: "6.2_CS1",
        grade: "6",
        level: "THCS",
        dayOfWeek: "TUESDAY" as const,
        session: "MORNING" as const,
        periodNumber: 4,
        subjectId: "sub-gdcd",
        subjectCode: "GDCD",
        subjectName: "GDCD",
        teacherId: "gv-gdcd",
        teacherCode: "0201000888",
        teacherName: "Trần Thị GDCD",
        weekType: "ODD" as const, // Teaching 6.2 on ODD week -> FREE on EVEN week!
        isLocked: true,
      },
    ]

    const slotByCell = new Map(
      baseSlots.map((s) => [makeSlotCellKey(s.classId, s.dayOfWeek, s.session, s.periodNumber), s])
    )

    // 1) Dragging a 0.5-period GDCD quota activity onto 6.1's locked ODD slot pairs it as EVEN alternating subject
    const gdcdQuota = {
      classId: "c-61",
      className: "6.1_CS1",
      grade: "6",
      level: "THCS",
      educationSystem: "HNS",
      studyProgram: "Hệ S",
      subjectId: "sub-gdcd",
      subjectCode: "GDCD",
      subjectName: "GDCD",
      weeklyQuota: 0.5,
      cycleQuota: 1,
      cycleWeeks: 2,
      scheduledWeeklyEquivalent: 0,
      missingWeeklyPeriods: 0.5,
      overScheduledWeeklyPeriods: 0,
      primaryTeacherId: null,
      primaryTeacherCode: null,
      primaryTeacherName: null,
      coTeacherId: null,
      coTeacherCode: null,
      coTeacherName: null,
      assignmentSource: "MISSING" as const,
      status: "MISSING_TEACHER" as const,
    }

    const pairEval = evaluateCellDropTarget({
      dragged: { kind: "QUOTA_ACTIVITY", item: gdcdQuota, weekType: "EVEN" },
      targetClass: classes[0],
      dayOfWeek: "TUESDAY",
      session: "MORNING",
      periodNumber: 4,
      currentSlots: baseSlots,
      slotByCell,
      quotaItems: [gdcdQuota],
      teachersById,
      campusId: "cs1",
      config: cfg,
      busySlots: [],
      externalActiveSlots: [],
      travelRules: [],
      autoLockManual: true,
    })
    expect(pairEval.status).toBe("SWAP_VALID")
    expect(pairEval.resolvedSlot?.subjectId).toBe("sub-math")
    expect(pairEval.resolvedSlot?.altSubjectId).toBe("sub-gdcd")
    expect(pairEval.resolvedSlot?.altSubjectName).toBe("GDCD")

    // 2) Dragging gv-gdcd in ALT_TEACHER mode onto 6.1 Tuesday Morning P4 succeeds because gv-gdcd only teaches 6.2 on ODD week (free on EVEN week!)
    const pairedSlots = [pairEval.resolvedSlot!, baseSlots[1]]
    const pairedMap = new Map(
      pairedSlots.map((s) => [makeSlotCellKey(s.classId, s.dayOfWeek, s.session, s.periodNumber), s])
    )
    const assignAltOk = evaluateCellDropTarget({
      dragged: {
        kind: "TEACHER",
        teacherId: "gv-gdcd",
        teacherCode: "0201000888",
        teacherName: "Trần Thị GDCD",
        roleMode: "ALT_TEACHER",
      },
      targetClass: classes[0],
      dayOfWeek: "TUESDAY",
      session: "MORNING",
      periodNumber: 4,
      currentSlots: pairedSlots,
      slotByCell: pairedMap,
      quotaItems: [gdcdQuota],
      teachersById,
      campusId: "cs1",
      config: cfg,
      busySlots: [],
      externalActiveSlots: [],
      travelRules: [],
      autoLockManual: true,
    })
    expect(assignAltOk.status).toBe("SWAP_VALID")
    expect(assignAltOk.resolvedSlot?.altTeacherId).toBe("gv-gdcd")
    expect(assignAltOk.resolvedSlot?.teacherId).toBe("gv-math")

    // 3) If gv-gdcd is ALREADY teaching 6.2 on EVEN week, ALT_TEACHER drop catches the EVEN-week conflict!
    const conflictSlots = [
      pairEval.resolvedSlot!,
      { ...baseSlots[1], weekType: "EVEN" as const },
    ]
    const conflictMap = new Map(
      conflictSlots.map((s) => [makeSlotCellKey(s.classId, s.dayOfWeek, s.session, s.periodNumber), s])
    )
    const assignAltConflict = evaluateCellDropTarget({
      dragged: {
        kind: "TEACHER",
        teacherId: "gv-gdcd",
        teacherCode: "0201000888",
        teacherName: "Trần Thị GDCD",
        roleMode: "ALT_TEACHER",
      },
      targetClass: classes[0],
      dayOfWeek: "TUESDAY",
      session: "MORNING",
      periodNumber: 4,
      currentSlots: conflictSlots,
      slotByCell: conflictMap,
      quotaItems: [gdcdQuota],
      teachersById,
      campusId: "cs1",
      config: cfg,
      busySlots: [],
      externalActiveSlots: [],
      travelRules: [],
      autoLockManual: true,
    })
    expect(assignAltConflict.status).toBe("CONFLICT")
    expect(assignAltConflict.reason).toContain("6.2_CS1")
  })

  // ==========================================================================
  // SCENARIO 15: Tự động đồng bộ GV môn luân phiên & môn chính từ Phân công giảng dạy
  // ==========================================================================
  it("Scenario 15: auto-hydrates unassigned primary and alternating (luân phiên) teachers from TeachingAssignment / SpecialAssignment and pairs 0.5-period activities in auto-scheduler", () => {
    const classes = [
      {
        id: "cls-62",
        className: "6.2_CS1",
        grade: "6",
        level: "THCS",
        educationSystem: "HNS",
      },
      {
        id: "cls-63",
        className: "6.3_CS1",
        grade: "6",
        level: "THCS",
        educationSystem: "HNS",
      },
    ]
    const subjects = [
      { id: "sub-clb", subjectCode: "CLB", subjectName: "CLB" },
      { id: "sub-cxxh", subjectCode: "GCX", subjectName: "CXXH" },
      { id: "sub-music", subjectCode: "ANA", subjectName: "Âm nhạc" },
    ]
    const teachers = [
      { id: "gv-clb", teacherCode: "0201000682", teacherName: "Huỳnh Thị Tường Vi" },
      { id: "gv-cxxh", teacherCode: "0201000086", teacherName: "Nguyễn Thị Hằng" },
      { id: "gv-music", teacherCode: "0201000092", teacherName: "Nguyễn Thị Trà Mi" },
      { id: "gv-spec-cxxh", teacherCode: "0201000175", teacherName: "Đinh Thị Phương Thanh" },
    ]

    const rawSlots = [
      {
        classId: "cls-62",
        className: "6.2_CS1",
        grade: "6",
        level: "THCS",
        dayOfWeek: "TUESDAY" as const,
        session: "AFTERNOON" as const,
        periodNumber: 1,
        subjectId: "sub-clb",
        subjectCode: "CLB",
        subjectName: "CLB",
        teacherId: "gv-clb",
        teacherCode: "0201000682",
        teacherName: "Huỳnh Thị Tường Vi",
        weekType: "ODD" as const,
        altSubjectId: null,
        altSubjectName: "CXXH", // Saved with label only and altTeacherId === null!
        altTeacherId: null,
        altTeacherCode: null,
        altTeacherName: null,
      },
      {
        classId: "cls-62",
        className: "6.2_CS1",
        grade: "6",
        level: "THCS",
        dayOfWeek: "FRIDAY" as const,
        session: "AFTERNOON" as const,
        periodNumber: 3,
        subjectId: "sub-music",
        subjectCode: "ANA",
        subjectName: "Âm nhạc",
        teacherId: null, // Unassigned on slot, but assigned in TeachingAssignment!
        teacherCode: null,
        teacherName: null,
        weekType: "ALL" as const,
      },
      {
        classId: "cls-63",
        className: "6.3_CS1",
        grade: "6",
        level: "THCS",
        dayOfWeek: "TUESDAY" as const,
        session: "AFTERNOON" as const,
        periodNumber: 2,
        subjectId: "sub-clb",
        subjectCode: "CLB",
        subjectName: "CLB",
        teacherId: "gv-clb",
        teacherCode: "0201000682",
        teacherName: "Huỳnh Thị Tường Vi",
        weekType: "ODD" as const,
        altSubjectId: "sub-cxxh",
        altSubjectName: "CXXH",
        altTeacherId: null, // No TeachingAssignment on 6.3, only SpecialTeachingAssignment!
      },
    ]

    const quotaItems = reconcileQuotasAndAssignments({
      classes,
      subjects,
      teachers,
      subjectQuotas: [
        {
          id: "q-clb",
          subjectId: "sub-clb",
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
          quotaG6: 0.5,
          quotaG7: 0,
          quotaG8: 0,
          quotaG9: 0,
          quotaG10: 0,
          quotaG11: 0,
          quotaG12: 0,
        },
        {
          id: "q-cxxh",
          subjectId: "sub-cxxh",
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
          quotaG6: 0.5,
          quotaG7: 0,
          quotaG8: 0,
          quotaG9: 0,
          quotaG10: 0,
          quotaG11: 0,
          quotaG12: 0,
        },
        {
          id: "q-music",
          subjectId: "sub-music",
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
          quotaG6: 1,
          quotaG7: 0,
          quotaG8: 0,
          quotaG9: 0,
          quotaG10: 0,
          quotaG11: 0,
          quotaG12: 0,
        },
      ],
      teachingAssignments: [
        {
          id: "ta-1",
          classId: "cls-62",
          subjectId: "sub-clb",
          teacherId: "gv-clb",
          academicYearId: "ay-2026",
          semester: 1,
        },
        {
          id: "ta-2",
          classId: "cls-62",
          subjectId: "sub-cxxh",
          teacherId: "gv-cxxh",
          academicYearId: "ay-2026",
          semester: 1,
        },
        {
          id: "ta-3",
          classId: "cls-62",
          subjectId: "sub-music",
          teacherId: "gv-music",
          academicYearId: "ay-2026",
          semester: 1,
        },
      ],
      specialAssignments: [
        {
          classId: "cls-62",
          teacherId: "gv-spec-cxxh", // TeachingAssignment on cls-62 must win over SpecialAssignment!
          academicYearId: "ay-2026",
          semester: 1,
          specialSubjectCode: "CXXH",
        },
        {
          classId: "cls-63",
          teacherId: "gv-spec-cxxh", // Fallback when TeachingAssignment is empty on cls-63!
          academicYearId: "ay-2026",
          semester: 1,
          specialSubjectCode: "CXXH",
        },
      ],
      scheduledSlots: rawSlots,
      cycleWeeks: 2,
    })

    const hydrated = hydrateSlotsFromAssignments({
      slots: rawSlots,
      quotaItems,
      subjects,
      mode: "FILL_MISSING",
    })

    expect(hydrated.filledPrimaryCount).toBe(1)
    expect(hydrated.filledAltCount).toBe(2)

    // 6.2_CS1: Luân phiên CXXH automatically gets Nguyễn Thị Hằng (TeachingAssignment priority #1)
    const slot62Alt = hydrated.slots[0]
    expect(slot62Alt.altSubjectId).toBe("sub-cxxh")
    expect(slot62Alt.altTeacherId).toBe("gv-cxxh")
    expect(slot62Alt.altTeacherCode).toBe("0201000086")
    expect(slot62Alt.altTeacherName).toBe("Nguyễn Thị Hằng")

    // 6.2_CS1: Âm nhạc automatically gets Nguyễn Thị Trà Mi
    const slot62Music = hydrated.slots[1]
    expect(slot62Music.teacherId).toBe("gv-music")
    expect(slot62Music.teacherName).toBe("Nguyễn Thị Trà Mi")

    // 6.3_CS1: Luân phiên CXXH falls back to SpecialTeachingAssignment (Đinh Thị Phương Thanh)
    const slot63Alt = hydrated.slots[2]
    expect(slot63Alt.altTeacherId).toBe("gv-spec-cxxh")
    expect(slot63Alt.altTeacherName).toBe("Đinh Thị Phương Thanh")

    // Auto-scheduler pairs CLB (0.5) + CXXH (0.5) for 6.2_CS1 into a single cell with both teachers!
    const cfg = makeBaseConfig()
    const freshQuotas62 = reconcileQuotasAndAssignments({
      classes: [classes[0]],
      subjects: [subjects[0], subjects[1]],
      teachers,
      subjectQuotas: [
        {
          id: "q-clb",
          subjectId: "sub-clb",
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
          quotaG6: 0.5,
          quotaG7: 0,
          quotaG8: 0,
          quotaG9: 0,
          quotaG10: 0,
          quotaG11: 0,
          quotaG12: 0,
        },
        {
          id: "q-cxxh",
          subjectId: "sub-cxxh",
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
          quotaG6: 0.5,
          quotaG7: 0,
          quotaG8: 0,
          quotaG9: 0,
          quotaG10: 0,
          quotaG11: 0,
          quotaG12: 0,
        },
      ],
      teachingAssignments: [
        {
          id: "ta-1",
          classId: "cls-62",
          subjectId: "sub-clb",
          teacherId: "gv-clb",
          academicYearId: "ay-2026",
          semester: 1,
        },
        {
          id: "ta-2",
          classId: "cls-62",
          subjectId: "sub-cxxh",
          teacherId: "gv-cxxh",
          academicYearId: "ay-2026",
          semester: 1,
        },
      ],
      scheduledSlots: [],
      cycleWeeks: 2,
    })

    const autoRes = runAutoScheduler({
      campusId: "cs1",
      academicYearId: "ay-2026",
      semester: 1,
      config: cfg,
      classes: [classes[0]],
      teachers,
      quotaItems: freshQuotas62,
      existingSlots: [],
    })

    expect(autoRes.outcome).toBe("COMPLETED")
    expect(autoRes.generatedSlots).toHaveLength(1)
    expect(autoRes.generatedSlots[0].altSubjectId).toBeDefined()
    expect(autoRes.generatedSlots[0].altTeacherId).toBeDefined()
  })

  it("Scenario 14: reconciles, live-tracks, hydrates, and independently auto-schedules ESL GVVN + GVNN period splits (e.g. 3 GVVN + 5 GVNN = 8 periods)", () => {
    const cfg = makeBaseConfig()
    const classes = [
      {
        id: "cls-61",
        className: "6.1_CS1",
        grade: "6",
        level: "THCS",
        educationSystem: "Hệ S",
      },
      {
        id: "cls-62",
        className: "6.2_CS1",
        grade: "6",
        level: "THCS",
        educationSystem: "Hệ S",
      },
    ]
    const subjects = [
      { id: "sub-esl", subjectCode: "ESL", subjectName: "ESL", category: "BILINGUAL" },
    ]
    const teachers = [
      {
        id: "gv-vn-1",
        teacherCode: "GVVN01",
        teacherName: "Nguyễn Thị Hồng Nhung TA",
        campusId: "cs1",
        teacherGroup: "GVVN",
      },
      {
        id: "gv-nn-1",
        teacherCode: "GVNN01",
        teacherName: "Howes Richard John",
        campusId: "cs1",
        teacherGroup: "GVNN",
      },
    ]

    // Grade 6 default split is 4 GVVN + 4 GVNN, while class 6.1_CS1 overrides to 3 GVVN + 5 GVNN
    const subjectQuotas = [
      {
        id: "sq-esl-s",
        subjectId: "sub-esl",
        academicYearId: "ay-2026",
        studyProgram: "Hệ S",
        quota: 0,
        quotaPrimary: 0,
        quotaMiddle: 32,
        quotaHigh: 0,
        quotaG1: 0,
        quotaG2: 0,
        quotaG3: 0,
        quotaG4: 0,
        quotaG5: 0,
        quotaG6: 8,
        quotaG7: 8,
        quotaG8: 8,
        quotaG9: 8,
        quotaG10: 0,
        quotaG11: 0,
        quotaG12: 0,
        teacherSplitJson: JSON.stringify({ quotaG6: { gvvn: 4, gvnn: 4 } }),
      },
    ]

    const reconciled = reconcileQuotasAndAssignments({
      classes,
      subjects,
      teachers,
      subjectQuotas,
      teachingAssignments: [
        // 6.1_CS1 has explicit 3 GVVN + 5 GVNN
        {
          id: "ta-61-vn",
          classId: "cls-61",
          subjectId: "sub-esl",
          teacherId: "gv-vn-1",
          academicYearId: "ay-2026",
          semester: 1,
          weeklyPeriods: 3,
          teacherRole: "GVVN",
        },
        {
          id: "ta-61-nn",
          classId: "cls-61",
          subjectId: "sub-esl",
          teacherId: "gv-nn-1",
          academicYearId: "ay-2026",
          semester: 1,
          weeklyPeriods: 5,
          teacherRole: "GVNN",
        },
        // 6.2_CS1 only has GVVN assigned so far -> should flag MISSING_TEACHER because quotaGvnnPeriods = 4
        {
          id: "ta-62-vn",
          classId: "cls-62",
          subjectId: "sub-esl",
          teacherId: "gv-vn-1",
          academicYearId: "ay-2026",
          semester: 1,
          teacherRole: "GVVN",
        },
      ],
      scheduledSlots: [],
      cycleWeeks: 2,
    })

    const item61 = reconciled.find((i) => i.classId === "cls-61")!
    const item62 = reconciled.find((i) => i.classId === "cls-62")!

    expect(item61.isDualGvvnGvnn).toBe(true)
    expect(item61.assignedGvvnPeriods).toBe(3)
    expect(item61.assignedGvnnPeriods).toBe(5)
    expect(item61.gvvnTeacherId).toBe("gv-vn-1")
    expect(item61.gvnnTeacherId).toBe("gv-nn-1")
    expect(item61.status).toBe("UNDER_SCHEDULED")

    // 6.2_CS1 inherits grade split 4 + 4 and detects missing GVNN!
    expect(item62.quotaGvvnPeriods).toBe(4)
    expect(item62.quotaGvnnPeriods).toBe(4)
    expect(item62.assignedGvvnPeriods).toBe(4)
    expect(item62.assignedGvnnPeriods).toBe(0)
    expect(item62.gvnnTeacherId).toBeNull()
    expect(item62.status).toBe("MISSING_TEACHER")

    // Auto-scheduler generates 3 independent GVVN slots + 5 independent GVNN slots = 8 slots for 6.1_CS1
    const autoRes = runAutoScheduler({
      campusId: "cs1",
      academicYearId: "ay-2026",
      semester: 1,
      config: cfg,
      classes: [classes[0]],
      teachers,
      quotaItems: [item61],
      existingSlots: [],
    })

    expect(autoRes.outcome).toBe("COMPLETED")
    expect(autoRes.generatedSlots).toHaveLength(8)
    const vnSlots = autoRes.generatedSlots.filter((s) => s.teacherId === "gv-vn-1")
    const nnSlots = autoRes.generatedSlots.filter((s) => s.teacherId === "gv-nn-1")
    expect(vnSlots).toHaveLength(3)
    expect(nnSlots).toHaveLength(5)
    expect(autoRes.generatedSlots.every((s) => !s.coTeacherId)).toBe(true)

    // Live recompute tracks scheduledGvvnPeriods = 3 & scheduledGvnnPeriods = 5 -> status OK
    const liveAfter = recomputeLiveQuotaItems([item61], autoRes.generatedSlots)
    expect(liveAfter[0].scheduledGvvnPeriods).toBe(3)
    expect(liveAfter[0].scheduledGvnnPeriods).toBe(5)
    expect(liveAfter[0].status).toBe("OK")

    // Hydrate in SYNC_ALL_ASSIGNED mode preserves both GVVN (3) and GVNN (5) slots without overwriting!
    const synced = hydrateSlotsFromAssignments({
      slots: autoRes.generatedSlots,
      quotaItems: [item61],
      subjects,
      mode: "SYNC_ALL_ASSIGNED",
    })
    expect(synced.slots.filter((s) => s.teacherId === "gv-vn-1")).toHaveLength(3)
    expect(synced.slots.filter((s) => s.teacherId === "gv-nn-1")).toHaveLength(5)
    expect(synced.slots.every((s) => !s.coTeacherId)).toBe(true)
  })

  it("Scenario 17: computes grade-level subject breakdown and 40-period weekly totals including paired alternating (Luân phiên) cells", () => {
    const classes = [
      { id: "cls-61", className: "6.1_CS1", grade: "6", level: "THCS", educationSystem: "HNS" },
      { id: "cls-62", className: "6.2_CS1", grade: "6", level: "THCS", educationSystem: "HNS" },
    ]
    const subjects = [
      { id: "sub-math", subjectCode: "TOA", subjectName: "Toán học" },
      { id: "sub-gdcd", subjectCode: "GDCD", subjectName: "GDCD" },
      { id: "sub-esl", subjectCode: "ESL", subjectName: "ESL" },
    ]
    const quotaItems = [
      {
        classId: "cls-61",
        className: "6.1_CS1",
        grade: "6",
        level: "THCS",
        educationSystem: "HNS",
        studyProgram: "Hệ S",
        subjectId: "sub-math",
        subjectCode: "TOA",
        subjectName: "Toán học",
        weeklyQuota: 4.5,
        cycleQuota: 9,
        cycleWeeks: 2,
        scheduledWeeklyEquivalent: 4.5,
        missingWeeklyPeriods: 0,
        overScheduledWeeklyPeriods: 0,
        primaryTeacherId: "gv-1",
        primaryTeacherCode: "GV01",
        primaryTeacherName: "GV Toán",
        coTeacherId: null,
        coTeacherCode: null,
        coTeacherName: null,
        assignmentSource: "TEACHING_ASSIGNMENT" as const,
        status: "OK" as const,
      },
      {
        classId: "cls-61",
        className: "6.1_CS1",
        grade: "6",
        level: "THCS",
        educationSystem: "HNS",
        studyProgram: "Hệ S",
        subjectId: "sub-gdcd",
        subjectCode: "GDCD",
        subjectName: "GDCD",
        weeklyQuota: 0.5,
        cycleQuota: 1,
        cycleWeeks: 2,
        scheduledWeeklyEquivalent: 0.5,
        missingWeeklyPeriods: 0,
        overScheduledWeeklyPeriods: 0,
        primaryTeacherId: "gv-2",
        primaryTeacherCode: "GV02",
        primaryTeacherName: "GV GDCD",
        coTeacherId: null,
        coTeacherCode: null,
        coTeacherName: null,
        assignmentSource: "TEACHING_ASSIGNMENT" as const,
        status: "OK" as const,
      },
      {
        classId: "cls-61",
        className: "6.1_CS1",
        grade: "6",
        level: "THCS",
        educationSystem: "HNS",
        studyProgram: "Hệ S",
        subjectId: "sub-esl",
        subjectCode: "ESL",
        subjectName: "ESL",
        weeklyQuota: 35,
        cycleQuota: 70,
        cycleWeeks: 2,
        scheduledWeeklyEquivalent: 35,
        missingWeeklyPeriods: 0,
        overScheduledWeeklyPeriods: 0,
        primaryTeacherId: "gv-3",
        primaryTeacherCode: "GV03",
        primaryTeacherName: "GV ESL",
        coTeacherId: null,
        coTeacherCode: null,
        coTeacherName: null,
        assignmentSource: "TEACHING_ASSIGNMENT" as const,
        status: "OK" as const,
      },
    ]

    // Build 39 full-week slots (4 Math + 35 ESL) + 1 paired ODD/EVEN slot (0.5 Math + 0.5 GDCD) = 40.0 periods/week!
    const slots: any[] = []
    for (let i = 0; i < 4; i++) {
      slots.push({
        classId: "cls-61",
        className: "6.1_CS1",
        grade: "6",
        level: "THCS",
        dayOfWeek: "MON",
        session: "MORNING",
        periodNumber: i + 1,
        subjectId: "sub-math",
        subjectName: "Toán học",
        weekType: "ALL",
      })
    }
    slots.push({
      classId: "cls-61",
      className: "6.1_CS1",
      grade: "6",
      level: "THCS",
      dayOfWeek: "TUE",
      session: "MORNING",
      periodNumber: 4,
      subjectId: "sub-math",
      subjectName: "Toán học",
      weekType: "ODD",
      altSubjectId: "sub-gdcd",
      altSubjectName: "GDCD",
    })
    for (let i = 0; i < 35; i++) {
      slots.push({
        classId: "cls-61",
        className: "6.1_CS1",
        grade: "6",
        level: "THCS",
        dayOfWeek: "WED",
        session: "AFTERNOON",
        periodNumber: (i % 4) + 1,
        subjectId: "sub-esl",
        subjectName: "ESL",
        weekType: "ALL",
      })
    }

    const summary = computeClassSlotSummary(slots, subjects)
    expect(summary.scheduledByClass.get("cls-61")).toBe(40)
    expect(summary.scheduledByClassSubject.get("cls-61::sub-math")).toBe(4.5)
    expect(summary.scheduledByClassSubject.get("cls-61::sub-gdcd")).toBe(0.5)

    const gradeReport = buildSingleGradeStats({
      grade: "6",
      classes,
      quotaItems: [
        ...quotaItems,
        ...quotaItems.map((q) => ({ ...q, classId: "cls-62", className: "6.2_CS1" })),
      ],
      slots,
      subjects,
      targetWeeklyPeriods: 40,
    })

    expect(gradeReport.totalGradeQuota).toBe(40)
    expect(gradeReport.totalQuotaHeS).toBe(40)
    expect(gradeReport.quotaDiffFromStandard).toBe(0)
    expect(gradeReport.classes[0].scheduledTotal).toBe(40)
    expect(gradeReport.classes[0].diffFromStandard).toBe(0)
    expect(gradeReport.classes[1].scheduledTotal).toBe(0)
    expect(gradeReport.classes[1].diffFromStandard).toBe(-40)

    // Verify explicit Hệ S & Hệ I quota columns from SubjectQuota catalog
    const dualCatalogReport = buildSingleGradeStats({
      grade: "6",
      classes,
      quotaItems,
      slots,
      subjects,
      subjectQuotas: [
        {
          id: "sq-s-math",
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
          quotaG6: 4,
          quotaG7: 0,
          quotaG8: 0,
          quotaG9: 0,
          quotaG10: 0,
          quotaG11: 0,
          quotaG12: 0,
        },
        {
          id: "sq-i-math",
          subjectId: "sub-math",
          academicYearId: "ay-2026",
          studyProgram: "Hệ I",
          quota: 0,
          quotaPrimary: 0,
          quotaMiddle: 0,
          quotaHigh: 0,
          quotaG1: 0,
          quotaG2: 0,
          quotaG3: 0,
          quotaG4: 0,
          quotaG5: 0,
          quotaG6: 3,
          quotaG7: 0,
          quotaG8: 0,
          quotaG9: 0,
          quotaG10: 0,
          quotaG11: 0,
          quotaG12: 0,
        },
      ],
      targetWeeklyPeriods: 40,
    })
    const mathRow = dualCatalogReport.subjectRows.find((r) => r.subjectId === "sub-math")!
    expect(mathRow.quotaHeS).toBe(4)
    expect(mathRow.quotaHeI).toBe(3)

    const matrix = buildAllGradesMatrixStats({
      classes,
      quotaItems: [
        ...quotaItems,
        ...quotaItems.map((q) => ({ ...q, classId: "cls-62", className: "6.2_CS1" })),
      ],
      slots,
      subjects,
      targetWeeklyPeriods: 40,
    })
    expect(matrix.gradeColumns).toHaveLength(1)
    expect(matrix.gradeColumns[0].totalQuota).toBe(40)
    expect(matrix.gradeColumns[0].avgScheduled).toBe(20)
  })

  it("Scenario 18: supports selecting all campuses, multiple campuses, or a single campus within a Bộ TKB", () => {
    const allowed = [
      { id: "cs1", campusCode: "CS1", campusName: "CS1" },
      { id: "cs3", campusCode: "CS3", campusName: "CS3" },
      { id: "cs5", campusCode: "CS5", campusName: "CS5" },
    ]

    const allRes = parseSelectedCampusIds(undefined, allowed)
    expect(allRes.isAllSelected).toBe(true)
    expect(allRes.selectedCampusIds).toEqual(["cs1", "cs3", "cs5"])
    expect(allRes.normalizedFilterValue).toBe("ALL")

    const subRes = parseSelectedCampusIds("cs5,cs1", allowed)
    expect(subRes.isAllSelected).toBe(false)
    expect(subRes.selectedCampusIds).toEqual(["cs1", "cs5"])
    expect(subRes.normalizedFilterValue).toBe("cs1,cs5")

    const singleRes = parseSelectedCampusIds("cs3", allowed)
    expect(singleRes.isAllSelected).toBe(false)
    expect(singleRes.selectedCampusIds).toEqual(["cs3"])
    expect(singleRes.normalizedFilterValue).toBe("cs3")

    const invalidRes = parseSelectedCampusIds("cs4-hill", allowed)
    expect(invalidRes.isAllSelected).toBe(true)
    expect(invalidRes.selectedCampusIds).toEqual(["cs1", "cs3", "cs5"])
  })

  it("Scenario 19: aligns with QĐ 82/2026/QĐ-SKL (40 periods/week K1–K12 for Hệ S & Hệ I), avoids level-sum fallback, and handles THPT 3×2 electives", () => {
    // 19a. Every column in QĐ 82/2026/QĐ-SKL (G1..G9, G10TN..G12XH) sums to exactly 40 periods/week
    const sums = computeQd82ColumnSums()
    for (const prog of ["Hệ S", "Hệ I"] as const) {
      for (const [col, total] of Object.entries(sums[prog])) {
        expect(total, `${prog} ${col}`).toBe(40)
      }
    }

    // 19b. When per-grade quotas are populated (e.g. SCI Hệ S: G6=2, G7=0, quotaMiddle=2),
    // Grade 7 must return 0 rather than falling back to quotaMiddle=2!
    const sciHeSFields = buildPrismaQuotaFieldsFromQd82Spec(
      QD82_2026_SUBJECT_STANDARDS.find((x) => x.subjectCode === "SCI")!.heS
    )
    const sciRow = {
      id: "sq-sci-s",
      subjectId: "sub-sci",
      academicYearId: "ay-2026",
      studyProgram: "Hệ S",
      quota: 0,
      ...sciHeSFields,
    }
    expect(resolveGradeQuotaValue(sciRow, 6, "THCS")).toBe(2)
    expect(resolveGradeQuotaValue(sciRow, 7, "THCS")).toBe(0)
    expect(resolveGradeQuotaValue(sciRow, 8, "THCS")).toBe(0)

    // 19c. Full K1–K12 grade stats with QĐ 82/2026 quotas (including Grade 10 TN & XH electives)
    const subjects = QD82_2026_SUBJECT_STANDARDS.map((e) => ({
      id: `sub-${e.subjectCode}`,
      subjectCode: e.subjectCode,
      subjectName: e.subjectCode,
    }))
    const subjectQuotas = QD82_2026_SUBJECT_STANDARDS.flatMap((e) => [
      {
        id: `sq-${e.subjectCode}-S`,
        subjectId: `sub-${e.subjectCode}`,
        academicYearId: "ay-2026",
        studyProgram: "Hệ S",
        quota: 0,
        ...buildPrismaQuotaFieldsFromQd82Spec(e.heS),
      },
      {
        id: `sq-${e.subjectCode}-I`,
        subjectId: `sub-${e.subjectCode}`,
        academicYearId: "ay-2026",
        studyProgram: "Hệ I",
        quota: 0,
        ...buildPrismaQuotaFieldsFromQd82Spec(e.heI),
      },
    ])

    const classesG10 = [
      { id: "c-101", className: "10.1_CS1", grade: "10", level: "THPT", educationSystem: "HNS" },
      { id: "c-102", className: "10.2_CS1", grade: "10", level: "THPT", educationSystem: "HNS" },
      { id: "c-10i", className: "10Compass_CS3", grade: "10", level: "THPT", educationSystem: "HNG" },
    ]
    // 10.1_CS1 picks TN electives (VLI, HHO, SHO); 10.2_CS1 picks XH electives (DLI, GKP, MTU); 10Compass_CS3 picks VLI, HHO, DLI
    const taRows = [
      ...["VLI", "HHO", "SHO"].map((code, i) => ({
        id: `ta-101-${i}`,
        classId: "c-101",
        subjectId: `sub-${code}`,
        teacherId: "t1",
        academicYearId: "ay-2026",
        semester: 1,
      })),
      ...["DLI", "GKP", "MTU"].map((code, i) => ({
        id: `ta-102-${i}`,
        classId: "c-102",
        subjectId: `sub-${code}`,
        teacherId: "t1",
        academicYearId: "ay-2026",
        semester: 1,
      })),
      ...["VLI", "HHO", "DLI"].map((code, i) => ({
        id: `ta-10i-${i}`,
        classId: "c-10i",
        subjectId: `sub-${code}`,
        teacherId: "t1",
        academicYearId: "ay-2026",
        semester: 1,
      })),
    ]

    const reconciledG10 = reconcileQuotasAndAssignments({
      classes: classesG10,
      subjects,
      teachers: [{ id: "t1", teacherCode: "GV1", teacherName: "Thầy A" }],
      subjectQuotas,
      teachingAssignments: taRows,
      scheduledSlots: [],
      cycleWeeks: 2,
    })

    const g10Stats = buildSingleGradeStats({
      grade: "10",
      classes: classesG10,
      quotaItems: reconciledG10,
      slots: [],
      subjects,
      subjectQuotas,
      targetWeeklyPeriods: 40,
    })

    expect(g10Stats.totalQuotaHeS).toBe(40)
    expect(g10Stats.totalQuotaHeI).toBe(40)
    expect(g10Stats.classes.find((c) => c.classId === "c-101")?.quotaTotal).toBe(40)
    expect(g10Stats.classes.find((c) => c.classId === "c-102")?.quotaTotal).toBe(40)
    expect(g10Stats.classes.find((c) => c.classId === "c-10i")?.quotaTotal).toBe(40)
  })

  it("Scenario 20: learns from drag-and-drop & baseline memory, clusters multi-campus teachers away from Hill travel days, and pairs TOA 4.5 + GDCD 0.5", () => {
    const campuses = [
      { id: "cs1", campusCode: "CS1", campusName: "CS1", address: "Sky-Line Riverside" },
      { id: "cs3", campusCode: "CS3", campusName: "CS3", address: "Sky-Line Global" },
      { id: "cs4", campusCode: "CS4", campusName: "CS4", address: "Sky-Line Hill" },
    ]

    const mem = buildLearnedScheduleMemory({
      campuses,
      teacherAssignmentsMeta: [
        { teacherId: "gv-hill", campusId: "cs1", level: "THCS" },
        { teacherId: "gv-hill", campusId: "cs4", level: "THCS" },
        { teacherId: "gv-urban", campusId: "cs1", level: "THCS" },
        { teacherId: "gv-urban", campusId: "cs3", level: "THCS" },
        { teacherId: "gv-local", campusId: "cs1", level: "THCS" },
      ],
    })

    // Hill multi-campus teacher gets higher priority than urban CS1-CS3 teacher, which beats single-campus teacher
    expect(computeTeacherMultiCampusPriority(mem, "gv-hill")).toBeGreaterThan(
      computeTeacherMultiCampusPriority(mem, "gv-urban")
    )
    expect(computeTeacherMultiCampusPriority(mem, "gv-urban")).toBeGreaterThan(
      computeTeacherMultiCampusPriority(mem, "gv-local")
    )

    // Auto-scheduler test: gv-hill is at CS4 Hill on THURSDAY morning; at CS1 has 2 periods of ICT (prefers clean 1-2 or 3-4 on baseline WEDNESDAY S3-S4, NOT THURSDAY)
    // Plus TOA (4.5) + GDCD (0.5) should produce 2 clean double-blocks + 1 paired alternating cell!
    const cfg = makeBaseConfig()
    const baselineSlots = [
      {
        academicYearId: "ay-2026",
        semester: 1,
        campusId: "cs1",
        level: "THCS",
        grade: "6",
        classId: "c-61",
        className: "6.1_CS1",
        dayOfWeek: "WEDNESDAY" as const,
        session: "MORNING" as const,
        periodNumber: 3,
        subjectId: "sub-ict",
        subjectCode: "ICT",
        subjectName: "Tin học / ICT",
        teacherId: "gv-hill",
        teacherCode: "GV_HILL",
        teacherName: "Thầy Hill",
        weekType: "ALL" as const,
      },
      {
        academicYearId: "ay-2026",
        semester: 1,
        campusId: "cs1",
        level: "THCS",
        grade: "6",
        classId: "c-61",
        className: "6.1_CS1",
        dayOfWeek: "WEDNESDAY" as const,
        session: "MORNING" as const,
        periodNumber: 4,
        subjectId: "sub-ict",
        subjectCode: "ICT",
        subjectName: "Tin học / ICT",
        teacherId: "gv-hill",
        teacherCode: "GV_HILL",
        teacherName: "Thầy Hill",
        weekType: "ALL" as const,
      },
    ]

    const res = runAutoScheduler({
      campusId: "cs1",
      campusName: "CS1",
      academicYearId: "ay-2026",
      semester: 1,
      config: cfg,
      classes: [{ id: "c-61", className: "6.1_CS1", grade: "6", level: "THCS" }],
      teachers: [
        { id: "gv-hill", teacherCode: "GV_HILL", teacherName: "Thầy Hill" },
        { id: "gv-math", teacherCode: "GV_TOA", teacherName: "Cô Toán" },
        { id: "gv-gdcd", teacherCode: "GV_GDCD", teacherName: "Thầy GDCD" },
      ],
      campuses,
      baselineSlots,
      teacherAssignmentsMeta: [
        { teacherId: "gv-hill", campusId: "cs1", level: "THCS" },
        { teacherId: "gv-hill", campusId: "cs4", level: "THCS" },
      ],
      externalActiveSlots: [
        {
          campusId: "cs4",
          campusName: "CS4 — Sky-Line Hill",
          scopeGroup: "HILL",
          startMinutes: 450,
          endMinutes: 545,
          slot: {
            academicYearId: "ay-2026",
            semester: 1,
            campusId: "cs4",
            level: "THCS",
            grade: "6",
            classId: "c-6hill",
            className: "6S_CS4",
            dayOfWeek: "THURSDAY",
            session: "MORNING",
            periodNumber: 1,
            subjectId: "sub-ict",
            subjectCode: "ICT",
            subjectName: "Tin học / ICT",
            teacherId: "gv-hill",
            teacherCode: "GV_HILL",
            teacherName: "Thầy Hill",
            weekType: "ALL",
          },
        },
      ],
      quotaItems: [
        {
          classId: "c-61",
          className: "6.1_CS1",
          grade: "6",
          level: "THCS",
          educationSystem: "HNS",
          studyProgram: "Hệ S",
          subjectId: "sub-ict",
          subjectCode: "ICT",
          subjectName: "Tin học / ICT",
          weeklyQuota: 2,
          cycleQuota: 4,
          cycleWeeks: 2,
          scheduledWeeklyEquivalent: 0,
          missingWeeklyPeriods: 2,
          overScheduledWeeklyPeriods: 0,
          primaryTeacherId: "gv-hill",
          primaryTeacherCode: "GV_HILL",
          primaryTeacherName: "Thầy Hill",
          coTeacherId: null,
          coTeacherCode: null,
          coTeacherName: null,
          assignmentSource: "TEACHING_ASSIGNMENT",
          status: "UNDER_SCHEDULED",
        },
        {
          classId: "c-61",
          className: "6.1_CS1",
          grade: "6",
          level: "THCS",
          educationSystem: "HNS",
          studyProgram: "Hệ S",
          subjectId: "sub-toa",
          subjectCode: "TOA",
          subjectName: "Toán học",
          weeklyQuota: 4.5,
          cycleQuota: 9,
          cycleWeeks: 2,
          scheduledWeeklyEquivalent: 0,
          missingWeeklyPeriods: 4.5,
          overScheduledWeeklyPeriods: 0,
          primaryTeacherId: "gv-math",
          primaryTeacherCode: "GV_TOA",
          primaryTeacherName: "Cô Toán",
          coTeacherId: null,
          coTeacherCode: null,
          coTeacherName: null,
          assignmentSource: "TEACHING_ASSIGNMENT",
          status: "UNDER_SCHEDULED",
        },
        {
          classId: "c-61",
          className: "6.1_CS1",
          grade: "6",
          level: "THCS",
          educationSystem: "HNS",
          studyProgram: "Hệ S",
          subjectId: "sub-gdcd",
          subjectCode: "GDCD",
          subjectName: "GDCD",
          weeklyQuota: 0.5,
          cycleQuota: 1,
          cycleWeeks: 2,
          scheduledWeeklyEquivalent: 0,
          missingWeeklyPeriods: 0.5,
          overScheduledWeeklyPeriods: 0,
          primaryTeacherId: "gv-gdcd",
          primaryTeacherCode: "GV_GDCD",
          primaryTeacherName: "Thầy GDCD",
          coTeacherId: null,
          coTeacherCode: null,
          coTeacherName: null,
          assignmentSource: "TEACHING_ASSIGNMENT",
          status: "UNDER_SCHEDULED",
        },
      ],
      existingSlots: [],
    })

    expect(res.outcome).toBe("COMPLETED")
    const ictSlots = res.generatedSlots.filter((s) => s.subjectId === "sub-ict")
    expect(ictSlots).toHaveLength(2)
    // Anchors right onto baseline WEDNESDAY Morning P3-P4 (not THURSDAY when gv-hill is at CS4 Hill!)
    expect(ictSlots.every((s) => s.dayOfWeek === "WEDNESDAY" && s.session === "MORNING")).toBe(true)
    expect(ictSlots.map((s) => s.periodNumber).sort()).toEqual([3, 4])

    // TOA (4.5) + GDCD (0.5) = 5 total physical cells (4 full TOA cells + 1 paired TOA/GDCD cell)
    expect(res.generatedSlots).toHaveLength(7) // 2 ICT + 5 TOA/GDCD
    const pairedSlot = res.generatedSlots.find((s) => s.altSubjectId === "sub-gdcd" || s.subjectId === "sub-gdcd")
    expect(pairedSlot).toBeDefined()
    expect(Boolean(pairedSlot?.altSubjectId)).toBe(true)
  })
})
