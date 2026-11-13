import { prisma } from "@/lib/db"
import { ensureTimetableSchema } from "./schemaInit"
import {
  buildDefaultPeriodTimes,
  doesClassBelongToScope,
  formatCampusDisplayName,
  getAllowedLevelOptionsForScope,
  getValidScopesAndCampuses,
  normalizeGradeCode,
  WORKING_DAYS_DEFAULT,
} from "./scopeResolver"
import { resolvePeriodWindow, type ExternalActiveSlot, type RoomInput, type TravelRuleInput, type BusySlotInput } from "./validator"
import type { TimetableAuthContext } from "./rbac"
import type {
  BlockRule,
  DayOfWeekCode,
  FixedSlotRule,
  LegacyDataAnomaly,
  LevelFilterCode,
  LimitsAndPriorities,
  ManageableScopeGroup,
  PeriodTimeDef,
  ScopeGroup,
  SlotRecord,
  TimetableConfigParsed,
  TimetableFilterParams,
} from "./types"

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function parseTimetableConfigRow(
  row: any | null,
  defaults: {
    academicYearId: string
    semester: number
    campusId: string
    scopeGroup: ManageableScopeGroup
    levelCode?: string
  }
): TimetableConfigParsed {
  const morningPeriods = row?.morningPeriods ?? 4
  const afternoonPeriods = row?.afternoonPeriods ?? 4
  const parsedTimes = safeJsonParse<PeriodTimeDef[]>(row?.periodTimesJson, [])
  const periodTimes =
    parsedTimes.length > 0
      ? parsedTimes
      : buildDefaultPeriodTimes(defaults.scopeGroup, morningPeriods, afternoonPeriods)

  const workingDays = safeJsonParse<DayOfWeekCode[]>(row?.workingDaysJson, WORKING_DAYS_DEFAULT)

  return {
    id: row?.id,
    academicYearId: row?.academicYearId || defaults.academicYearId,
    semester: row?.semester ?? defaults.semester,
    campusId: row?.campusId || defaults.campusId,
    scopeGroup: (row?.scopeGroup as ManageableScopeGroup) || defaults.scopeGroup,
    levelCode: row?.levelCode || defaults.levelCode || "ALL",
    workingDays: workingDays.length > 0 ? workingDays : WORKING_DAYS_DEFAULT,
    morningPeriods,
    afternoonPeriods,
    periodTimes,
    cycleWeeks: row?.cycleWeeks ?? 2,
    cycleAnchorDate: row?.cycleAnchorDate || null,
    fixedSlots: safeJsonParse<FixedSlotRule[]>(row?.fixedSlotsJson, []),
    blockRules: safeJsonParse<BlockRule[]>(row?.blockRulesJson, []),
    limitsAndPriorities: safeJsonParse<LimitsAndPriorities>(row?.limitsAndPrioritiesJson, {
      maxPeriodsPerDayPerSubject: 2,
      maxConsecutivePeriodsPerTeacher: 4,
      maxPeriodsPerDayPerTeacher: 7,
      avoidLastAfternoonForHeavySubjects: true,
      preferMorningForCoreSubjects: true,
    }),
    effectiveFrom: row?.effectiveFrom || null,
    effectiveTo: row?.effectiveTo || null,
  }
}

export function mapDbSlotToRecord(
  s: any,
  teacherCodeById?: Map<string, string>,
  subjectCodeById?: Map<string, string>
): SlotRecord {
  return {
    id: s.id,
    versionId: s.versionId || null,
    academicYearId: s.academicYearId || null,
    semester: s.semester ?? 1,
    campusId: s.campusId || null,
    level: s.level,
    grade: s.grade,
    classId: s.classId || "",
    className: s.className,
    dayOfWeek: s.dayOfWeek,
    session: s.session,
    periodNumber: Number(s.periodNumber),
    subjectId: s.subjectId || null,
    subjectCode: s.subjectId ? subjectCodeById?.get(s.subjectId) || null : null,
    subjectName: s.subjectName || null,
    teacherId: s.teacherId || null,
    teacherCode: s.teacherId ? teacherCodeById?.get(s.teacherId) || null : null,
    teacherName: s.teacherName || null,
    roomId: s.roomId || null,
    roomCode: s.roomCode || null,
    roomName: s.roomName || null,
    coTeacherId: s.coTeacherId || null,
    coTeacherCode: s.coTeacherCode || (s.coTeacherId ? teacherCodeById?.get(s.coTeacherId) || null : null),
    coTeacherName: s.coTeacherName || null,
    assistantTeacherId: s.assistantTeacherId || null,
    assistantTeacherCode:
      s.assistantTeacherCode ||
      (s.assistantTeacherId ? teacherCodeById?.get(s.assistantTeacherId) || null : null),
    assistantTeacherName: s.assistantTeacherName || null,
    weekType: s.weekType || "ALL",
    altSubjectId: s.altSubjectId || null,
    altSubjectName: s.altSubjectName || null,
    altTeacherId: s.altTeacherId || null,
    altTeacherCode:
      s.altTeacherCode || (s.altTeacherId ? teacherCodeById?.get(s.altTeacherId) || null : null),
    altTeacherName: s.altTeacherName || null,
    altRoomId: s.altRoomId || null,
    altRoomName: s.altRoomName || null,
    isLocked: Boolean(s.isLocked),
    blockGroupId: s.blockGroupId || null,
    slotRevision: Number(s.slotRevision || 1),
    notes: s.notes || null,
    colorCode: s.colorCode || "#F0FDFA",
  }
}

export async function loadScopedWorkspaceContext(
  filters: TimetableFilterParams,
  authCtx: TimetableAuthContext,
  options?: {
    includeLienCapLookup?: boolean
    loadExternalActiveSlots?: boolean
  }
) {
  await ensureTimetableSchema()

  const [allCampuses, academicYears, allSubjects, teachers, rawSchedulableFlags] = await Promise.all([
    prisma.campus.findMany({ orderBy: { campusCode: "asc" } }),
    prisma.academicYear.findMany({ orderBy: [{ startDate: "desc" }, { name: "desc" }] }),
    prisma.subject.findMany({ orderBy: { subjectName: "asc" } }),
    prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        teacherCode: true,
        teacherName: true,
        campusId: true,
        departmentId: true,
        departmentRel: { select: { name: true, blockCM: true } },
      },
      orderBy: { teacherName: "asc" },
    }),
    typeof (prisma as any)?.$queryRawUnsafe === "function"
      ? (prisma as any)
          .$queryRawUnsafe(`SELECT "id", "isTimetableSchedulable" FROM "Subject"`)
          .catch(() => [] as any[])
      : Promise.resolve([] as any[]),
  ])

  const schedulableById = new Map<string, boolean>()
  if (Array.isArray(rawSchedulableFlags)) {
    for (const row of rawSchedulableFlags) {
      if (row?.id) {
        const val = row.isTimetableSchedulable
        schedulableById.set(
          String(row.id),
          val === undefined || val === null ? true : Boolean(Number(val))
        )
      }
    }
  }

  const subjects = allSubjects.filter((s: any) => {
    const catTokens = String(s?.category || "")
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean)
    if (catTokens.length > 0 && catTokens.every((t) => t === "KSDV")) {
      return false
    }
    if (typeof s?.isTimetableSchedulable === "boolean") {
      return s.isTimetableSchedulable
    }
    if (schedulableById.has(s.id)) {
      return schedulableById.get(s.id)!
    }
    return true
  })

  const activeYear =
    (filters.academicYearId && academicYears.find((y) => y.id === filters.academicYearId)) ||
    academicYears.find((y) => y.status === "ACTIVE" && !(y as any).isOff) ||
    academicYears[0]

  const selectedYearId = activeYear?.id || ""
  const semester = filters.semester === 2 ? 2 : 1

  const allYearClasses = selectedYearId
    ? await prisma.class.findMany({
        where: {
          academicYearId: selectedYearId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          className: true,
          campusId: true,
          level: true,
          grade: true,
          educationSystem: true,
          homeroomTeacherId: true,
          academicYearId: true,
          status: true,
        },
        orderBy: [{ grade: "asc" }, { className: "asc" }],
      })
    : []

  const catalog = getValidScopesAndCampuses(
    allCampuses,
    allYearClasses,
    authCtx.allowedCampusIds,
    authCtx.isFullAccess,
    Boolean(options?.includeLienCapLookup)
  )

  const requestedScope = filters.scopeGroup
  const selectedScopeGroup: ScopeGroup =
    requestedScope && catalog.validScopes.some((s) => s.code === requestedScope)
      ? requestedScope
      : catalog.validScopes[0]?.code || "TRUNG_HOC"

  const allowedCampusesForScope = catalog.campusesByScope[selectedScopeGroup] || []
  const selectedCampusObj =
    (filters.campusId && allowedCampusesForScope.find((c) => c.id === filters.campusId)) ||
    allowedCampusesForScope[0] ||
    null

  const selectedCampusId = selectedCampusObj?.id || ""

  // Strict campus access enforcement if client explicitly passed an unauthorized campusId
  if (
    filters.campusId &&
    !authCtx.isFullAccess &&
    !authCtx.allowedCampusIds.includes(filters.campusId)
  ) {
    // Already guarded by requireTimetablePermission when campusIds is passed, double-ensured here
  }

  const campusAllScopeClasses = selectedCampusObj
    ? allYearClasses.filter(
        (c) =>
          c.campusId === selectedCampusId &&
          doesClassBelongToScope(c, selectedCampusObj, selectedScopeGroup, "ALL")
      )
    : []

  const levelOptions = getAllowedLevelOptionsForScope(selectedScopeGroup, campusAllScopeClasses)
  const selectedLevelCode: LevelFilterCode =
    filters.levelCode && levelOptions.some((o) => o.code === filters.levelCode)
      ? filters.levelCode
      : levelOptions[0]?.code || "ALL"

  // Strict scope class filtering — ZERO fallback to out-of-scope classes!
  const levelFilteredClasses = selectedCampusObj
    ? campusAllScopeClasses.filter((c) =>
        doesClassBelongToScope(c, selectedCampusObj, selectedScopeGroup, selectedLevelCode)
      )
    : []

  const availableGrades = Array.from(
    new Set(levelFilteredClasses.map((c) => c.grade).filter(Boolean))
  )

  const selectedGrade =
    filters.grade && filters.grade !== "ALL" && availableGrades.includes(filters.grade)
      ? filters.grade
      : "ALL"

  const gradeFilteredClasses =
    selectedGrade === "ALL"
      ? levelFilteredClasses
      : levelFilteredClasses.filter((c) => c.grade === selectedGrade)

  const selectedClassId =
    filters.classId &&
    filters.classId !== "ALL" &&
    gradeFilteredClasses.some((c) => c.id === filters.classId)
      ? filters.classId
      : "ALL"

  const manageableScope: ManageableScopeGroup =
    selectedScopeGroup === "LIEN_CAP" ? "TRUNG_HOC" : selectedScopeGroup

  const [versions, configRow, rawRooms, rawBusySlots, rawTravelRules] = selectedCampusId
    ? await Promise.all([
        selectedScopeGroup === "LIEN_CAP"
          ? prisma.timetableVersion.findMany({
              where: {
                academicYearId: selectedYearId,
                semester,
                campusId: selectedCampusId,
              },
              orderBy: [{ updatedAt: "desc" }],
            })
          : prisma.timetableVersion.findMany({
              where: {
                academicYearId: selectedYearId,
                semester,
                campusId: selectedCampusId,
                scopeGroup: manageableScope,
              },
              orderBy: [{ versionNumber: "desc" }, { updatedAt: "desc" }],
            }),
        prisma.timetableConfig.findFirst({
          where: {
            academicYearId: selectedYearId,
            semester,
            campusId: selectedCampusId,
            scopeGroup: manageableScope,
          },
        }),
        prisma.timetableRoom.findMany({
          where: { campusId: selectedCampusId, status: "ACTIVE" },
          orderBy: { roomCode: "asc" },
        }),
        prisma.timetableBusySlot.findMany({
          where: { academicYearId: selectedYearId, semester, status: "ACTIVE" },
        }),
        prisma.timetableTravelRule.findMany({
          where: { academicYearId: selectedYearId },
        }),
      ])
    : [[], null, [], [], []]

  const selectedVersion =
    (filters.versionId && versions.find((v) => v.id === filters.versionId)) ||
    versions.find((v) => v.status === "DRAFT") ||
    versions.find((v) => v.status === "PUBLISHED") ||
    versions[0] ||
    null

  const config = parseTimetableConfigRow(configRow, {
    academicYearId: selectedYearId,
    semester,
    campusId: selectedCampusId,
    scopeGroup: manageableScope,
  })

  const teacherCodeById = new Map(teachers.map((t) => [t.id, t.teacherCode]))
  const subjectCodeById = new Map(allSubjects.map((s) => [s.id, s.subjectCode || ""]))

  const rooms: RoomInput[] = rawRooms.map((r) => ({
    id: r.id,
    campusId: r.campusId,
    roomCode: r.roomCode,
    roomName: r.roomName,
    roomType: r.roomType,
    capacity: r.capacity,
    allowedSubjectIds: safeJsonParse<string[]>(r.allowedSubjectIdsJson, []),
  }))

  const busySlots: BusySlotInput[] = rawBusySlots.map((b) => ({
    targetType: b.targetType,
    targetId: b.targetId,
    campusId: b.campusId,
    dayOfWeek: b.dayOfWeek,
    session: b.session,
    periodNumber: b.periodNumber,
    startTime: b.startTime,
    endTime: b.endTime,
    weekType: b.weekType,
    reason: b.reason,
  }))

  const travelRules: TravelRuleInput[] = rawTravelRules.map((tr) => ({
    fromCampusId: tr.fromCampusId,
    toCampusId: tr.toCampusId,
    minTravelMinutes: tr.minTravelMinutes,
    allowSameSession: tr.allowSameSession,
    allowSameDay: tr.allowSameDay,
  }))

  let externalActiveSlots: ExternalActiveSlot[] = []
  if (options?.loadExternalActiveSlots && selectedYearId) {
    const otherActiveVersions = await prisma.timetableVersion.findMany({
      where: {
        academicYearId: selectedYearId,
        semester,
        status: { in: ["PUBLISHED", "APPROVED"] },
        ...(selectedVersion ? { id: { not: selectedVersion.id } } : {}),
        NOT:
          selectedCampusId && selectedScopeGroup !== "LIEN_CAP"
            ? { campusId: selectedCampusId, scopeGroup: manageableScope }
            : undefined,
      },
    })

    if (otherActiveVersions.length > 0) {
      const [otherConfigs, otherSlots] = await Promise.all([
        prisma.timetableConfig.findMany({
          where: { academicYearId: selectedYearId, semester },
        }),
        prisma.timetableSlot.findMany({
          where: {
            versionId: { in: otherActiveVersions.map((v) => v.id) },
            status: "ACTIVE",
          },
        }),
      ])

      const cfgMap = new Map(otherConfigs.map((c) => [`${c.campusId}::${c.scopeGroup}`, c]))
      const verMap = new Map(otherActiveVersions.map((v) => [v.id, v]))
      const campusMap = new Map(allCampuses.map((c) => [c.id, c]))

      externalActiveSlots = otherSlots.map((os) => {
        const ver = os.versionId ? verMap.get(os.versionId) : undefined
        const cId = ver?.campusId || os.campusId || ""
        const sg = (ver?.scopeGroup || "TRUNG_HOC") as ManageableScopeGroup
        const cfgRow = cfgMap.get(`${cId}::${sg}`)
        const parsedCfg = parseTimetableConfigRow(cfgRow || null, {
          academicYearId: selectedYearId,
          semester,
          campusId: cId,
          scopeGroup: sg,
        })
        const win = resolvePeriodWindow(parsedCfg.periodTimes, os.session, os.periodNumber)
        return {
          slot: mapDbSlotToRecord(os, teacherCodeById, subjectCodeById),
          campusId: cId,
          campusName: formatCampusDisplayName(campusMap.get(cId)),
          scopeGroup: sg,
          startMinutes: win.startMinutes,
          endMinutes: win.endMinutes,
        }
      })
    }
  }

  return {
    allCampuses,
    academicYears,
    activeYear,
    selectedYearId,
    semester,
    subjects,
    teachers,
    teacherCodeById,
    subjectCodeById,
    catalog,
    selectedScopeGroup,
    manageableScope,
    selectedCampusObj,
    selectedCampusId,
    levelOptions,
    selectedLevelCode,
    availableGrades,
    selectedGrade,
    selectedClassId,
    campusAllScopeClasses,
    inScopeClasses: gradeFilteredClasses,
    versions,
    selectedVersion,
    config,
    rooms,
    rawRooms,
    busySlots,
    rawBusySlots,
    travelRules,
    rawTravelRules,
    externalActiveSlots,
  }
}

/**
 * Read-only audit of legacy unversioned TimetableSlot rows (`versionId IS NULL`).
 * Never mutates or guesses fixes on existing operational rows.
 */
export async function auditLegacyUnversionedSlots(params: {
  allowedCampusIds: string[]
  isFullAccess: boolean
}): Promise<{ totalLegacyRows: number; anomalies: LegacyDataAnomaly[] }> {
  await ensureTimetableSchema()

  const legacyRows = await prisma.timetableSlot.findMany({
    where: {
      versionId: null,
      ...(params.isFullAccess
        ? {}
        : { campusId: { in: params.allowedCampusIds } }),
    },
    take: 1000,
  })

  if (legacyRows.length === 0) {
    return { totalLegacyRows: 0, anomalies: [] }
  }

  const classIds = Array.from(new Set(legacyRows.map((r) => r.classId).filter(Boolean) as string[]))
  const classes =
    classIds.length > 0
      ? await prisma.class.findMany({
          where: { id: { in: classIds } },
          select: { id: true, className: true, campusId: true, grade: true, level: true },
        })
      : []
  const classMap = new Map(classes.map((c) => [c.id, c]))

  const campusMismatch: LegacyDataAnomaly["sampleItems"] = []
  let campusMismatchCount = 0

  const gradeMismatch: LegacyDataAnomaly["sampleItems"] = []
  let gradeMismatchCount = 0

  const invalidLienCap: LegacyDataAnomaly["sampleItems"] = []
  let invalidLienCapCount = 0

  const missingYear: LegacyDataAnomaly["sampleItems"] = []
  let missingYearCount = 0

  const missingRefs: LegacyDataAnomaly["sampleItems"] = []
  let missingRefsCount = 0

  const cellGroups = new Map<string, typeof legacyRows>()

  for (const r of legacyRows) {
    const cls = r.classId ? classMap.get(r.classId) : undefined

    if (cls && r.campusId && r.campusId !== cls.campusId) {
      campusMismatchCount++
      if (campusMismatch.length < 8) {
        campusMismatch.push({
          slotId: r.id,
          className: r.className,
          detail: `Slot đang gắn campusId=${r.campusId} nhưng Lớp ${cls.className} thuộc campusId=${cls.campusId}`,
        })
      }
    }

    if (cls && r.grade && normalizeGradeCode(r.grade) !== normalizeGradeCode(cls.grade, cls.className)) {
      gradeMismatchCount++
      if (gradeMismatch.length < 8) {
        gradeMismatch.push({
          slotId: r.id,
          className: r.className,
          detail: `Slot ghi khối "${r.grade}" nhưng Lớp ${cls.className} thuộc khối "${cls.grade}"`,
        })
      }
    }

    if (r.level === "LIEN_CAP") {
      invalidLienCapCount++
      if (invalidLienCap.length < 8) {
        invalidLienCap.push({
          slotId: r.id,
          className: r.className,
          detail: `Lưu level="LIEN_CAP" trực tiếp trên bản ghi tiết học`,
        })
      }
    }

    if (!r.academicYearId) {
      missingYearCount++
      if (missingYear.length < 8) {
        missingYear.push({
          slotId: r.id,
          className: r.className,
          detail: `Thiếu academicYearId (${r.dayOfWeek} - T${r.periodNumber})`,
        })
      }
    }

    if ((r.subjectName && !r.subjectId) || (r.teacherName && !r.teacherId)) {
      missingRefsCount++
      if (missingRefs.length < 8) {
        missingRefs.push({
          slotId: r.id,
          className: r.className,
          detail: `Môn "${r.subjectName || "—"}" / GV "${r.teacherName || "—"}" chưa gắn mã ID chuẩn`,
        })
      }
    }

    if (r.classId) {
      const ck = `${r.classId}::${r.dayOfWeek}::${r.session}::${r.periodNumber}`
      const g = cellGroups.get(ck) || []
      g.push(r)
      cellGroups.set(ck, g)
    }
  }

  const duplicateSamples: LegacyDataAnomaly["sampleItems"] = []
  let duplicateGroupCount = 0
  for (const [, arr] of cellGroups) {
    if (arr.length > 1) {
      duplicateGroupCount++
      if (duplicateSamples.length < 8) {
        duplicateSamples.push({
          slotId: arr[0].id,
          className: arr[0].className,
          detail: `Trùng ${arr.length} bản ghi tại ${arr[0].dayOfWeek} - ${arr[0].session} Tiết ${arr[0].periodNumber}`,
        })
      }
    }
  }

  const anomalies: LegacyDataAnomaly[] = []
  if (campusMismatchCount > 0) {
    anomalies.push({
      anomalyType: "CAMPUS_MISMATCH",
      count: campusMismatchCount,
      description: "Tiết lịch cũ lưu lệch mã cơ sở so với hồ sơ lớp học",
      sampleItems: campusMismatch,
    })
  }
  if (duplicateGroupCount > 0) {
    anomalies.push({
      anomalyType: "DUPLICATE_CELL",
      count: duplicateGroupCount,
      description: "Ô tiết lịch cũ bị ghi trùng nhiều dòng cho cùng lớp - thứ - buổi - tiết",
      sampleItems: duplicateSamples,
    })
  }
  if (gradeMismatchCount > 0) {
    anomalies.push({
      anomalyType: "GRADE_MISMATCH",
      count: gradeMismatchCount,
      description: "Tiết lịch cũ ghi sai mã khối (ví dụ mặc định K1 cho lớp khối khác)",
      sampleItems: gradeMismatch,
    })
  }
  if (invalidLienCapCount > 0) {
    anomalies.push({
      anomalyType: "INVALID_LEVEL_LIEN_CAP",
      count: invalidLienCapCount,
      description: "Tiết lịch cũ lưu 'LIEN_CAP' như một cấp học thay vì chế độ tra cứu",
      sampleItems: invalidLienCap,
    })
  }
  if (missingYearCount > 0) {
    anomalies.push({
      anomalyType: "MISSING_ACADEMIC_YEAR",
      count: missingYearCount,
      description: "Tiết lịch cũ thiếu khóa ngoại năm học (academicYearId = null)",
      sampleItems: missingYear,
    })
  }
  if (missingRefsCount > 0) {
    anomalies.push({
      anomalyType: "MISSING_TEACHER_OR_SUBJECT_ID",
      count: missingRefsCount,
      description: "Tiết lịch cũ chỉ lưu tên văn bản, thiếu teacherId hoặc subjectId",
      sampleItems: missingRefs,
    })
  }

  return { totalLegacyRows: legacyRows.length, anomalies }
}
