import { prisma } from "@/lib/db"
import { ensureTimetableSchema } from "./schemaInit"
import {
  buildDefaultPeriodTimes,
  dateIsoToDayOfWeek,
  formatCampusDisplayName,
  getDatesOfWeek,
  inferScopeGroupForClass,
  isDateWithinRange,
  resolveWeekParity,
  SHORT_DAY_LABELS,
  timeStringToMinutes,
} from "./scopeResolver"
import type {
  DayOfWeekCode,
  EffectivePeriodItem,
  PeriodTimeDef,
  SessionCode,
  SubstitutionActionType,
} from "./types"

function parsePeriodTimesSafe(
  rawJson: string | null | undefined,
  scopeGroup: string,
  morningPeriods: number,
  afternoonPeriods: number
): PeriodTimeDef[] {
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch {}
  }
  return buildDefaultPeriodTimes(
    (scopeGroup as any) || "TRUNG_HOC",
    morningPeriods || 4,
    afternoonPeriods ?? 4
  )
}

function findPeriodClock(
  periodTimes: PeriodTimeDef[],
  session: string,
  periodNumber: number
): { startTime: string; endTime: string } {
  const hit = periodTimes.find(
    (p) => p.session === session && Number(p.periodNumber) === Number(periodNumber)
  )
  if (hit) return { startTime: hit.startTime, endTime: hit.endTime }
  const fallback = buildDefaultPeriodTimes("TRUNG_HOC", 6, 6).find(
    (p) => p.session === session && Number(p.periodNumber) === Number(periodNumber)
  )
  return {
    startTime: fallback?.startTime || "07:30",
    endTime: fallback?.endTime || "08:15",
  }
}

/**
 * Single shared source of truth for retrieving effective schedules:
 * - Resolves PUBLISHED TimetableVersion active on each day in the requested week
 * - Resolves week parity (EVEN / ODD) from configured cycleAnchorDate
 * - Applies date-specific exceptions from `timetable_substitutions` (LEAVE, SUBSTITUTE, SWAP_PERIOD, CHANGE_ROOM, MAKEUP)
 * - For Student/Parent portals (`strictPublishedOnly = true`), NEVER leaks DRAFT / PENDING / legacy unapproved rows.
 */
export async function getEffectiveClassWeekSchedule(params: {
  classId: string
  referenceDateIso?: string
  academicYearId?: string
  semester?: number
  strictPublishedOnly?: boolean
}): Promise<{
  version: {
    id: string
    code: string
    name: string
    effectiveFrom: string | null
    effectiveTo: string | null
    semester: number
  } | null
  weekParity: "EVEN" | "ODD" | "ALL"
  weekDates: Record<DayOfWeekCode, string>
  periodTimes: PeriodTimeDef[]
  items: EffectivePeriodItem[]
}> {
  await ensureTimetableSchema()

  const refDate = (params.referenceDateIso || new Date().toISOString()).slice(0, 10)
  const weekDates = getDatesOfWeek(refDate)
  const strictPublishedOnly = params.strictPublishedOnly !== false

  const cls = await prisma.class.findUnique({
    where: { id: params.classId },
    select: {
      id: true,
      className: true,
      grade: true,
      level: true,
      campusId: true,
      academicYearId: true,
      campus: {
        select: { id: true, campusCode: true, campusName: true, address: true },
      },
    },
  })

  if (!cls) {
    return {
      version: null,
      weekParity: "ALL",
      weekDates,
      periodTimes: buildDefaultPeriodTimes("TRUNG_HOC", 4, 4),
      items: [],
    }
  }

  const scopeGroup = inferScopeGroupForClass(cls, cls.campus) || "TRUNG_HOC"
  const yearId = params.academicYearId || cls.academicYearId

  const publishedVersions = await prisma.timetableVersion.findMany({
    where: {
      campusId: cls.campusId,
      scopeGroup,
      academicYearId: yearId,
      ...(params.semester ? { semester: params.semester } : {}),
      status: "PUBLISHED",
    },
    orderBy: [{ versionNumber: "desc" }, { publishedAt: "desc" }],
  })

  const activeVersion =
    publishedVersions.find((v) => isDateWithinRange(refDate, v.effectiveFrom, v.effectiveTo)) ||
    publishedVersions[0] ||
    null

  const configRow = await prisma.timetableConfig.findFirst({
    where: {
      academicYearId: yearId,
      semester: activeVersion?.semester || params.semester || 1,
      campusId: cls.campusId,
      scopeGroup,
    },
  })

  const periodTimes = parsePeriodTimesSafe(
    configRow?.periodTimesJson,
    scopeGroup,
    configRow?.morningPeriods || 4,
    configRow?.afternoonPeriods ?? 4
  )

  const weekParity = resolveWeekParity(
    refDate,
    configRow?.cycleAnchorDate || null,
    configRow?.cycleWeeks || 2
  )

  if (!activeVersion && strictPublishedOnly) {
    return {
      version: null,
      weekParity,
      weekDates,
      periodTimes,
      items: [],
    }
  }

  const rawSlots = activeVersion
    ? await prisma.timetableSlot.findMany({
        where: {
          versionId: activeVersion.id,
          classId: cls.id,
          status: "ACTIVE",
        },
      })
    : []

  const dateValues = Object.values(weekDates)
  const substitutions = await prisma.timetableSubstitution.findMany({
    where: {
      classId: cls.id,
      status: "ACTIVE",
      targetDate: {
        gte: dateValues[0],
        lte: dateValues[dateValues.length - 1],
      },
    },
    orderBy: { createdAt: "asc" },
  })

  const teachersIds = Array.from(
    new Set(rawSlots.map((s) => s.teacherId).filter(Boolean) as string[])
  )
  const teacherCodeMap = new Map<string, string>()
  if (teachersIds.length > 0) {
    const tRows = await prisma.teacher.findMany({
      where: { id: { in: teachersIds } },
      select: { id: true, teacherCode: true },
    })
    tRows.forEach((t) => teacherCodeMap.set(t.id, t.teacherCode))
  }

  const campusLabel = formatCampusDisplayName(cls.campus)
  const itemsByCell = new Map<string, EffectivePeriodItem>()

  for (const s of rawSlots) {
    const dayCode = s.dayOfWeek as DayOfWeekCode
    const dateOfSlot = weekDates[dayCode]
    if (!dateOfSlot) continue

    const slotParity = resolveWeekParity(
      dateOfSlot,
      configRow?.cycleAnchorDate || null,
      configRow?.cycleWeeks || 2
    )

    const wt = String(s.weekType || "ALL").toUpperCase()
    let effSubId = s.subjectId
    let effSubName = s.subjectName
    let effTeacherId = s.teacherId
    let effTeacherCode = s.teacherId ? teacherCodeMap.get(s.teacherId) || null : null
    let effTeacherName = s.teacherName
    let effRoomId = s.roomId
    let effRoomCode = s.roomCode
    let effRoomName = s.roomName

    if (wt === "ODD" && slotParity === "EVEN") {
      if (s.altSubjectId || s.altSubjectName) {
        effSubId = s.altSubjectId
        effSubName = s.altSubjectName
        effTeacherId = s.altTeacherId
        effTeacherCode = s.altTeacherCode
        effTeacherName = s.altTeacherName
        effRoomId = s.altRoomId
        effRoomName = s.altRoomName
      } else {
        continue
      }
    } else if (wt === "EVEN" && slotParity === "ODD") {
      if (s.altSubjectId || s.altSubjectName) {
        effSubId = s.altSubjectId
        effSubName = s.altSubjectName
        effTeacherId = s.altTeacherId
        effTeacherCode = s.altTeacherCode
        effTeacherName = s.altTeacherName
        effRoomId = s.altRoomId
        effRoomName = s.altRoomName
      } else {
        continue
      }
    }

    if (!effSubId && !effSubName) continue

    const clock = findPeriodClock(periodTimes, s.session, s.periodNumber)
    const cellKey = `${dateOfSlot}::${s.session}::${s.periodNumber}`

    itemsByCell.set(cellKey, {
      slotId: s.id,
      versionId: s.versionId || null,
      campusId: cls.campusId,
      campusName: campusLabel,
      classId: cls.id,
      className: cls.className,
      grade: cls.grade,
      level: cls.level,
      date: dateOfSlot,
      dayOfWeek: dayCode,
      session: s.session as SessionCode,
      periodNumber: s.periodNumber,
      startTime: clock.startTime,
      endTime: clock.endTime,
      weekParity: slotParity,
      subjectId: effSubId || null,
      subjectName: effSubName || null,
      teacherId: effTeacherId || null,
      teacherCode: effTeacherCode,
      teacherName: effTeacherName || null,
      coTeacherId: s.coTeacherId || null,
      coTeacherCode: s.coTeacherCode || null,
      coTeacherName: s.coTeacherName || null,
      assistantTeacherId: s.assistantTeacherId || null,
      assistantTeacherCode: s.assistantTeacherCode || null,
      assistantTeacherName: s.assistantTeacherName || null,
      roomId: effRoomId || null,
      roomCode: effRoomCode || null,
      roomName: effRoomName || null,
      isSubstituted: false,
      isCancelledByLeave: false,
    })
  }

  // Apply date-based exceptions without touching base weekly slots
  for (const sub of substitutions) {
    const key = `${sub.targetDate}::${sub.session}::${sub.periodNumber}`
    const existing = itemsByCell.get(key)
    const action = sub.actionType as SubstitutionActionType

    if (action === "LEAVE") {
      if (existing) {
        existing.isSubstituted = true
        existing.substitutionAction = "LEAVE"
        existing.substitutionReason = sub.reason
        existing.isCancelledByLeave = true
      }
    } else if (action === "SUBSTITUTE") {
      if (existing) {
        existing.isSubstituted = true
        existing.substitutionAction = "SUBSTITUTE"
        existing.substitutionReason = sub.reason
        existing.teacherId = sub.substituteTeacherId || existing.teacherId
        existing.teacherCode = sub.substituteTeacherCode || existing.teacherCode
        existing.teacherName = sub.substituteTeacherName || existing.teacherName
        if (sub.newSubjectId || sub.newSubjectName) {
          existing.subjectId = sub.newSubjectId || existing.subjectId
          existing.subjectName = sub.newSubjectName || existing.subjectName
        }
        if (sub.newRoomId || sub.newRoomName) {
          existing.roomId = sub.newRoomId || existing.roomId
          existing.roomName = sub.newRoomName || existing.roomName
        }
      }
    } else if (action === "CHANGE_ROOM") {
      if (existing) {
        existing.isSubstituted = true
        existing.substitutionAction = "CHANGE_ROOM"
        existing.substitutionReason = sub.reason
        existing.roomId = sub.newRoomId || existing.roomId
        existing.roomName = sub.newRoomName || existing.roomName
      }
    } else if (action === "MAKEUP" || action === "SWAP_PERIOD") {
      const clock = findPeriodClock(periodTimes, sub.session, sub.periodNumber)
      const dayCode = (dateIsoToDayOfWeek(sub.targetDate) || sub.dayOfWeek) as DayOfWeekCode
      itemsByCell.set(key, {
        slotId: sub.slotId || existing?.slotId || null,
        versionId: sub.versionId || activeVersion?.id || null,
        campusId: cls.campusId,
        campusName: campusLabel,
        classId: cls.id,
        className: cls.className,
        grade: cls.grade,
        level: cls.level,
        date: sub.targetDate,
        dayOfWeek: dayCode,
        session: sub.session as SessionCode,
        periodNumber: sub.periodNumber,
        startTime: clock.startTime,
        endTime: clock.endTime,
        weekParity,
        subjectId: sub.newSubjectId || sub.originalSubjectId || existing?.subjectId || null,
        subjectName: sub.newSubjectName || sub.originalSubjectName || existing?.subjectName || null,
        teacherId:
          sub.substituteTeacherId || sub.originalTeacherId || existing?.teacherId || null,
        teacherCode:
          sub.substituteTeacherCode || sub.originalTeacherCode || existing?.teacherCode || null,
        teacherName:
          sub.substituteTeacherName || sub.originalTeacherName || existing?.teacherName || null,
        coTeacherId: existing?.coTeacherId || null,
        coTeacherCode: existing?.coTeacherCode || null,
        coTeacherName: existing?.coTeacherName || null,
        assistantTeacherId: existing?.assistantTeacherId || null,
        assistantTeacherCode: existing?.assistantTeacherCode || null,
        assistantTeacherName: existing?.assistantTeacherName || null,
        roomId: sub.newRoomId || sub.originalRoomId || existing?.roomId || null,
        roomCode: existing?.roomCode || null,
        roomName: sub.newRoomName || sub.originalRoomName || existing?.roomName || null,
        isSubstituted: true,
        substitutionAction: action,
        substitutionReason: sub.reason,
        isCancelledByLeave: false,
      })
    }
  }

  return {
    version: activeVersion
      ? {
          id: activeVersion.id,
          code: activeVersion.code,
          name: activeVersion.name,
          effectiveFrom: activeVersion.effectiveFrom,
          effectiveTo: activeVersion.effectiveTo,
          semester: activeVersion.semester,
        }
      : null,
    weekParity,
    weekDates,
    periodTimes,
    items: Array.from(itemsByCell.values()),
  }
}

/**
 * Retrieves a teacher's unified personal schedule across ALL levels (Tiểu học, Trung học, Hill)
 * and ALL campuses, including Primary, Co-teacher, Assistant, Alternating, and Date Substitutions.
 */
export async function getEffectiveTeacherWeekSchedule(params: {
  teacherId: string
  referenceDateIso?: string
  academicYearId?: string
  semester?: number
}): Promise<{
  weekDates: Record<DayOfWeekCode, string>
  items: EffectivePeriodItem[]
  campusesInvolved: Array<{ id: string; name: string }>
}> {
  await ensureTimetableSchema()

  const refDate = (params.referenceDateIso || new Date().toISOString()).slice(0, 10)
  const weekDates = getDatesOfWeek(refDate)
  const dateValues = Object.values(weekDates)

  const [campuses, publishedVersions, configs, teacher] = await Promise.all([
    prisma.campus.findMany(),
    prisma.timetableVersion.findMany({
      where: {
        status: "PUBLISHED",
        ...(params.academicYearId ? { academicYearId: params.academicYearId } : {}),
        ...(params.semester ? { semester: params.semester } : {}),
      },
      orderBy: [{ versionNumber: "desc" }],
    }),
    prisma.timetableConfig.findMany({
      where: params.academicYearId ? { academicYearId: params.academicYearId } : undefined,
    }),
    prisma.teacher.findUnique({
      where: { id: params.teacherId },
      select: { id: true, teacherCode: true, teacherName: true },
    }),
  ])

  const campusMap = new Map(campuses.map((c) => [c.id, c]))

  // Pick active version per (campusId, scopeGroup) covering refDate
  const activeVersionByScope = new Map<string, (typeof publishedVersions)[number]>()
  for (const v of publishedVersions) {
    if (!isDateWithinRange(refDate, v.effectiveFrom, v.effectiveTo)) continue
    const k = `${v.campusId}::${v.scopeGroup}`
    if (!activeVersionByScope.has(k)) {
      activeVersionByScope.set(k, v)
    }
  }

  const activeVersionIds = Array.from(activeVersionByScope.values()).map((v) => v.id)
  const configByScope = new Map<string, (typeof configs)[number]>()
  for (const cfg of configs) {
    configByScope.set(`${cfg.campusId}::${cfg.scopeGroup}`, cfg)
  }

  const rawSlots =
    activeVersionIds.length > 0
      ? await prisma.timetableSlot.findMany({
          where: {
            versionId: { in: activeVersionIds },
            status: "ACTIVE",
            OR: [
              { teacherId: params.teacherId },
              { coTeacherId: params.teacherId },
              { assistantTeacherId: params.teacherId },
              { altTeacherId: params.teacherId },
            ],
          },
        })
      : []

  const substitutions = await prisma.timetableSubstitution.findMany({
    where: {
      status: "ACTIVE",
      targetDate: {
        gte: dateValues[0],
        lte: dateValues[dateValues.length - 1],
      },
      OR: [
        { originalTeacherId: params.teacherId },
        { substituteTeacherId: params.teacherId },
      ],
    },
  })

  const versionById = new Map(Array.from(activeVersionByScope.values()).map((v) => [v.id, v]))
  const items: EffectivePeriodItem[] = []
  const involvedCampusMap = new Map<string, string>()

  for (const s of rawSlots) {
    const ver = s.versionId ? versionById.get(s.versionId) : undefined
    const cId = ver?.campusId || s.campusId || ""
    const scopeGroup = ver?.scopeGroup || "TRUNG_HOC"
    const cfg = configByScope.get(`${cId}::${scopeGroup}`)
    const dayCode = s.dayOfWeek as DayOfWeekCode
    const dateOfSlot = weekDates[dayCode]
    if (!dateOfSlot) continue

    const parity = resolveWeekParity(
      dateOfSlot,
      cfg?.cycleAnchorDate || null,
      cfg?.cycleWeeks || 2
    )
    const wt = String(s.weekType || "ALL").toUpperCase()

    const isMainParticipant =
      s.teacherId === params.teacherId ||
      s.coTeacherId === params.teacherId ||
      s.assistantTeacherId === params.teacherId
    const isAltParticipant = s.altTeacherId === params.teacherId

    let activeOnThisWeek = false
    let subId = s.subjectId
    let subName = s.subjectName

    if (wt === "ALL" && isMainParticipant) {
      activeOnThisWeek = true
    } else if ((wt === "ODD" && parity === "ODD") || (wt === "EVEN" && parity === "EVEN")) {
      if (isMainParticipant) activeOnThisWeek = true
    } else if ((wt === "ODD" && parity === "EVEN") || (wt === "EVEN" && parity === "ODD")) {
      if (isAltParticipant) {
        activeOnThisWeek = true
        subId = s.altSubjectId || s.subjectId
        subName = s.altSubjectName || s.subjectName
      }
    } else if (parity === "ALL" && (isMainParticipant || isAltParticipant)) {
      activeOnThisWeek = true
    }

    if (!activeOnThisWeek) continue

    // Check if teacher was replaced or on leave on this exact date
    const dateSub = substitutions.find(
      (sub) =>
        sub.targetDate === dateOfSlot &&
        sub.classId === s.classId &&
        sub.session === s.session &&
        Number(sub.periodNumber) === Number(s.periodNumber)
    )

    if (
      dateSub &&
      dateSub.actionType === "SUBSTITUTE" &&
      dateSub.originalTeacherId === params.teacherId &&
      dateSub.substituteTeacherId !== params.teacherId
    ) {
      // Handed over to substitute teacher on this date -> skip from active teaching or mark handed over
      continue
    }

    const periodTimes = parsePeriodTimesSafe(
      cfg?.periodTimesJson,
      scopeGroup,
      cfg?.morningPeriods || 4,
      cfg?.afternoonPeriods ?? 4
    )
    const clock = findPeriodClock(periodTimes, s.session, s.periodNumber)
    const campusLabel = formatCampusDisplayName(campusMap.get(cId))
    if (cId) involvedCampusMap.set(cId, campusLabel)

    items.push({
      slotId: s.id,
      versionId: s.versionId || null,
      campusId: cId,
      campusName: campusLabel,
      classId: s.classId || "",
      className: s.className,
      grade: s.grade,
      level: s.level,
      date: dateOfSlot,
      dayOfWeek: dayCode,
      session: s.session as SessionCode,
      periodNumber: s.periodNumber,
      startTime: clock.startTime,
      endTime: clock.endTime,
      weekParity: parity,
      subjectId: subId || null,
      subjectName: subName || null,
      teacherId: params.teacherId,
      teacherCode: teacher?.teacherCode || null,
      teacherName: teacher?.teacherName || s.teacherName || null,
      coTeacherId: s.coTeacherId || null,
      coTeacherCode: s.coTeacherCode || null,
      coTeacherName: s.coTeacherName || null,
      assistantTeacherId: s.assistantTeacherId || null,
      assistantTeacherCode: s.assistantTeacherCode || null,
      assistantTeacherName: s.assistantTeacherName || null,
      roomId: dateSub?.newRoomId || s.roomId || null,
      roomCode: s.roomCode || null,
      roomName: dateSub?.newRoomName || s.roomName || null,
      isSubstituted: Boolean(dateSub),
      substitutionAction: dateSub?.actionType as SubstitutionActionType | undefined,
      substitutionReason: dateSub?.reason,
      isCancelledByLeave: dateSub?.actionType === "LEAVE",
    })
  }

  // Add incoming SUBSTITUTE or MAKEUP assignments where this teacher is the substitute/makeup teacher
  for (const sub of substitutions) {
    if (sub.substituteTeacherId !== params.teacherId) continue
    if (sub.actionType !== "SUBSTITUTE" && sub.actionType !== "MAKEUP") continue
    const alreadyAdded = items.some(
      (i) =>
        i.date === sub.targetDate &&
        i.classId === sub.classId &&
        i.session === sub.session &&
        i.periodNumber === sub.periodNumber
    )
    if (alreadyAdded) continue

    const cObj = campusMap.get(sub.campusId)
    const campusLabel = formatCampusDisplayName(cObj)
    involvedCampusMap.set(sub.campusId, campusLabel)
    const clock = findPeriodClock(
      buildDefaultPeriodTimes("TRUNG_HOC", 4, 4),
      sub.session,
      sub.periodNumber
    )
    const dayCode = (dateIsoToDayOfWeek(sub.targetDate) || sub.dayOfWeek) as DayOfWeekCode

    items.push({
      slotId: sub.slotId || null,
      versionId: sub.versionId || null,
      campusId: sub.campusId,
      campusName: campusLabel,
      classId: sub.classId,
      className: sub.className,
      grade: "",
      level: "",
      date: sub.targetDate,
      dayOfWeek: dayCode,
      session: sub.session as SessionCode,
      periodNumber: sub.periodNumber,
      startTime: clock.startTime,
      endTime: clock.endTime,
      weekParity: "ALL",
      subjectId: sub.newSubjectId || sub.originalSubjectId || null,
      subjectName: sub.newSubjectName || sub.originalSubjectName || "Dạy thay / Dạy bù",
      teacherId: params.teacherId,
      teacherCode: teacher?.teacherCode || sub.substituteTeacherCode || null,
      teacherName: teacher?.teacherName || sub.substituteTeacherName || null,
      coTeacherId: null,
      coTeacherCode: null,
      coTeacherName: null,
      assistantTeacherId: null,
      assistantTeacherCode: null,
      assistantTeacherName: null,
      roomId: sub.newRoomId || sub.originalRoomId || null,
      roomCode: null,
      roomName: sub.newRoomName || sub.originalRoomName || null,
      isSubstituted: true,
      substitutionAction: sub.actionType as SubstitutionActionType,
      substitutionReason: sub.reason,
      isCancelledByLeave: false,
    })
  }

  return {
    weekDates,
    items,
    campusesInvolved: Array.from(involvedCampusMap.entries()).map(([id, name]) => ({ id, name })),
  }
}

/**
 * Used by Digital Testing (`checkProctorScheduleConflict`) to check actual effective schedule
 * on the exact exam date & clock interval (`startTime` - `endTime`), including cross-campus travel.
 */
export async function checkProctorTimetableConflict(params: {
  teacherId: string
  examDate: Date
  startTime: string
  endTime: string
  examCampusId?: string | null
}): Promise<string[]> {
  const isoDate = params.examDate.toISOString().slice(0, 10)
  const { items } = await getEffectiveTeacherWeekSchedule({
    teacherId: params.teacherId,
    referenceDateIso: isoDate,
  })

  const dayItems = items.filter((i) => i.date === isoDate && !i.isCancelledByLeave)
  if (dayItems.length === 0) return []

  const examStart = timeStringToMinutes(params.startTime) ?? 450
  const examEnd = timeStringToMinutes(params.endTime) ?? 510
  const warnings: string[] = []

  for (const item of dayItems) {
    const slotStart = timeStringToMinutes(item.startTime) ?? 450
    const slotEnd = timeStringToMinutes(item.endTime) ?? 495

    if (examStart < slotEnd && slotStart < examEnd) {
      warnings.push(
        `Trùng lịch giảng dạy thực tế (${SHORT_DAY_LABELS[item.dayOfWeek] || item.dayOfWeek} ${item.startTime}–${item.endTime}, Tiết ${item.periodNumber} ${item.session === "MORNING" ? "Sáng" : "Chiều"} - Lớp ${item.className}, ${item.campusName})`
      )
      continue
    }

    if (params.examCampusId && item.campusId && params.examCampusId !== item.campusId) {
      const gap = slotEnd <= examStart ? examStart - slotEnd : slotStart - examEnd
      if (gap >= 0 && gap < 40) {
        warnings.push(
          `Không đủ thời gian di chuyển liên cơ sở (${gap} phút) giữa ca dạy Lớp ${item.className} (${item.campusName}, ${item.startTime}–${item.endTime}) và ca coi thi`
        )
      }
    }
  }

  return warnings
}

/**
 * Server-side verifier for Classroom Observation (`/teacher/du-gio`) when prefilling or linking a Timetable slot.
 */
export async function verifyTimetableSlotForObservation(params: {
  slotId: string
  targetDateIso?: string
}) {
  await ensureTimetableSchema()
  const slot = await prisma.timetableSlot.findUnique({
    where: { id: params.slotId },
  })
  if (!slot || !slot.classId) {
    return { valid: false as const, error: "Không tìm thấy tiết thời khóa biểu đã chọn." }
  }

  if (slot.versionId) {
    const ver = await prisma.timetableVersion.findUnique({ where: { id: slot.versionId } })
    if (!ver || ver.status !== "PUBLISHED") {
      return {
        valid: false as const,
        error: "Tiết thời khóa biểu thuộc phiên bản chưa ban hành, không thể đăng ký dự giờ chính thức.",
      }
    }
    if (params.targetDateIso && !isDateWithinRange(params.targetDateIso, ver.effectiveFrom, ver.effectiveTo)) {
      return {
        valid: false as const,
        error: "Ngày dự giờ nằm ngoài khoảng hiệu lực của phiên bản thời khóa biểu này.",
      }
    }
  }

  if (params.targetDateIso) {
    const leaveRecord = await prisma.timetableSubstitution.findFirst({
      where: {
        classId: slot.classId,
        targetDate: params.targetDateIso.slice(0, 10),
        session: slot.session,
        periodNumber: slot.periodNumber,
        status: "ACTIVE",
        actionType: "LEAVE",
      },
    })
    if (leaveRecord) {
      return {
        valid: false as const,
        error: `Tiết học ngày ${params.targetDateIso.slice(0, 10)} đã ghi nhận báo nghỉ (${leaveRecord.reason}).`,
      }
    }
  }

  return {
    valid: true as const,
    slot: {
      id: slot.id,
      campusId: slot.campusId,
      classId: slot.classId,
      className: slot.className,
      grade: slot.grade,
      level: slot.level,
      dayOfWeek: slot.dayOfWeek,
      session: slot.session,
      periodNumber: slot.periodNumber,
      subjectId: slot.subjectId,
      subjectName: slot.subjectName,
      teacherId: slot.teacherId,
      teacherName: slot.teacherName,
    },
  }
}
