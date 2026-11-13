import {
  doWeekTypesOverlap,
  extractParticipatingTeachers,
  resolvePeriodWindow,
  type BusySlotInput,
  type ExternalActiveSlot,
  type TravelRuleInput,
} from "./validator"
import type {
  DayOfWeekCode,
  QuotaReconcileItem,
  SessionCode,
  SlotRecord,
  TimetableConfigParsed,
  WeekTypeCode,
} from "./types"

export function makeSlotCellKey(
  classId: string,
  dayOfWeek: string,
  session: string,
  periodNumber: number
): string {
  return `${classId}::${dayOfWeek}::${session}::${Number(periodNumber)}`
}

export type DraggedTimetablePayload =
  | {
      kind: "CELL_SLOT"
      sourceCellKey: string
      slot: SlotRecord
    }
  | {
      kind: "QUOTA_ACTIVITY"
      item: QuotaReconcileItem
      weekType: WeekTypeCode
    }
  | {
      kind: "SCOPE_SUBJECT"
      subjectId: string
      subjectCode: string
      subjectName: string
      useHomeroomTeacher: boolean
      weekType: WeekTypeCode
    }

export type DropEvaluationStatus =
  | "VALID"
  | "SWAP_VALID"
  | "CONFLICT"
  | "BLOCKED"
  | "OUT_OF_COLUMN"

export interface DropTargetEvaluation {
  status: DropEvaluationStatus
  reason: string | null
  resolvedSlot: SlotRecord | null
  swappedBackSlot: SlotRecord | null
}

/**
 * Recomputes scheduled counts & status for every QuotaReconcileItem in real time
 * whenever slots are dragged, swapped, or cleared on the client.
 */
export function recomputeLiveQuotaItems(
  baseQuotaItems: QuotaReconcileItem[],
  currentSlots: SlotRecord[]
): QuotaReconcileItem[] {
  const scheduledMap = new Map<string, number>()

  for (const s of currentSlots) {
    const wt = String(s.weekType || "ALL").toUpperCase()
    if (s.subjectId) {
      const k = `${s.classId}::${s.subjectId}`
      const add = wt === "ALL" ? 1 : 0.5
      scheduledMap.set(k, (scheduledMap.get(k) || 0) + add)
    }
    if (wt !== "ALL" && s.altSubjectId) {
      const altK = `${s.classId}::${s.altSubjectId}`
      scheduledMap.set(altK, (scheduledMap.get(altK) || 0) + 0.5)
    }
  }

  return baseQuotaItems.map((item) => {
    const scheduledWeeklyEquivalent =
      Math.round((scheduledMap.get(`${item.classId}::${item.subjectId}`) || 0) * 100) / 100
    const diff = Math.round((item.weeklyQuota - scheduledWeeklyEquivalent) * 100) / 100
    const missingWeeklyPeriods = diff > 0 ? diff : 0
    const overScheduledWeeklyPeriods = diff < 0 ? Math.abs(diff) : 0

    let status: QuotaReconcileItem["status"] = "OK"
    if (item.weeklyQuota <= 0) {
      status = "NO_QUOTA_DEFINED"
    } else if (!item.primaryTeacherId) {
      status = "MISSING_TEACHER"
    } else if (missingWeeklyPeriods > 0) {
      status = "UNDER_SCHEDULED"
    } else if (overScheduledWeeklyPeriods > 0) {
      status = "OVER_SCHEDULED"
    }

    return {
      ...item,
      scheduledWeeklyEquivalent,
      missingWeeklyPeriods,
      overScheduledWeeklyPeriods,
      status,
    }
  })
}

export interface ClassMetaRef {
  id: string
  className: string
  grade: string
  level: string
  homeroomTeacherId?: string | null
}

export interface TeacherMetaRef {
  id: string
  teacherCode?: string | null
  teacherName: string
}

function checkSinglePlacementConflict(params: {
  candidate: SlotRecord
  campusId: string
  config: TimetableConfigParsed
  otherSlots: SlotRecord[]
  teachersById: Map<string, TeacherMetaRef>
  busySlots: BusySlotInput[]
  externalActiveSlots: ExternalActiveSlot[]
  travelRules: TravelRuleInput[]
}): string | null {
  const {
    candidate,
    campusId,
    config,
    otherSlots,
    teachersById,
    busySlots,
    externalActiveSlots,
    travelRules,
  } = params

  const { participants } = extractParticipatingTeachers(candidate, teachersById)
  const candWin = resolvePeriodWindow(
    config.periodTimes || [],
    candidate.session,
    candidate.periodNumber
  )

  // 1. Class busy check
  for (const b of busySlots) {
    if (
      b.targetType === "CLASS" &&
      b.targetId === candidate.classId &&
      b.dayOfWeek === candidate.dayOfWeek &&
      b.session === candidate.session &&
      Number(b.periodNumber) === Number(candidate.periodNumber) &&
      doWeekTypesOverlap(b.weekType, candidate.weekType)
    ) {
      return b.reason ? `Lớp bận: ${b.reason}` : "Ô tiết thuộc khung lịch bận của lớp"
    }
  }

  // 2. Room conflict & room busy check
  if (candidate.roomId) {
    for (const b of busySlots) {
      if (
        b.targetType === "ROOM" &&
        b.targetId === candidate.roomId &&
        b.dayOfWeek === candidate.dayOfWeek &&
        b.session === candidate.session &&
        Number(b.periodNumber) === Number(candidate.periodNumber) &&
        doWeekTypesOverlap(b.weekType, candidate.weekType)
      ) {
        return `Phòng ${candidate.roomCode || candidate.roomName} đang bận`
      }
    }

    for (const other of otherSlots) {
      if (
        other.roomId === candidate.roomId &&
        other.dayOfWeek === candidate.dayOfWeek &&
        other.session === candidate.session &&
        Number(other.periodNumber) === Number(candidate.periodNumber) &&
        doWeekTypesOverlap(other.weekType, candidate.weekType)
      ) {
        return `Trùng phòng ${candidate.roomCode || candidate.roomName} với Lớp ${other.className}`
      }
    }
  }

  if (participants.length === 0) return null

  const travelMap = new Map<string, TravelRuleInput>()
  for (const tr of travelRules) {
    travelMap.set(`${tr.fromCampusId}::${tr.toCampusId}`, tr)
  }

  for (const pt of participants) {
    // 3. Teacher busy check
    for (const b of busySlots) {
      if (
        b.targetType === "TEACHER" &&
        b.targetId === pt.teacherId &&
        b.dayOfWeek === candidate.dayOfWeek &&
        b.session === candidate.session &&
        Number(b.periodNumber) === Number(candidate.periodNumber) &&
        doWeekTypesOverlap(b.weekType, pt.effectiveWeekType)
      ) {
        return `GV ${pt.teacherName} bận${b.reason ? `: ${b.reason}` : ""}`
      }
    }

    // 4. Same-version teacher conflict across other classes
    for (const other of otherSlots) {
      if (
        other.dayOfWeek !== candidate.dayOfWeek ||
        other.session !== candidate.session ||
        Number(other.periodNumber) !== Number(candidate.periodNumber)
      ) {
        continue
      }
      const otherPts = extractParticipatingTeachers(other, teachersById).participants
      for (const opt of otherPts) {
        if (
          opt.teacherId === pt.teacherId &&
          doWeekTypesOverlap(opt.effectiveWeekType, pt.effectiveWeekType)
        ) {
          return `Trùng GV ${pt.teacherName} đang dạy Lớp ${other.className}`
        }
      }
    }

    // 5. Cross-campus & cross-level external active schedule overlap + travel rule
    for (const ext of externalActiveSlots) {
      if (ext.slot.dayOfWeek !== candidate.dayOfWeek) continue
      const extPts = extractParticipatingTeachers(ext.slot, teachersById).participants
      const matchedExt = extPts.find(
        (ep) =>
          ep.teacherId === pt.teacherId &&
          doWeekTypesOverlap(ep.effectiveWeekType, pt.effectiveWeekType)
      )
      if (!matchedExt) continue

      const overlapsInTime =
        candWin.startMinutes < ext.endMinutes && ext.startMinutes < candWin.endMinutes
      if (overlapsInTime) {
        return `Trùng lịch GV ${pt.teacherName} tại ${ext.campusName} (Lớp ${ext.slot.className})`
      }

      if (ext.campusId && campusId && ext.campusId !== campusId) {
        const rule =
          travelMap.get(`${ext.campusId}::${campusId}`) ||
          travelMap.get(`${campusId}::${ext.campusId}`)
        const minGap = rule?.minTravelMinutes ?? 30
        if (rule && !rule.allowSameDay) {
          return `GV ${pt.teacherName} đã có lịch dạy cùng ngày tại ${ext.campusName}`
        }
        if (rule && !rule.allowSameSession && ext.slot.session === candidate.session) {
          return `GV ${pt.teacherName} không đủ điều kiện dạy cùng buổi với ${ext.campusName}`
        }
        const gapMinutes =
          candWin.startMinutes >= ext.endMinutes
            ? candWin.startMinutes - ext.endMinutes
            : ext.startMinutes - candWin.endMinutes
        if (gapMinutes < minGap) {
          return `Thiếu thời gian di chuyển (${gapMinutes}/${minGap} phút) của GV ${pt.teacherName} từ ${ext.campusName}`
        }
      }
    }
  }

  return null
}

/**
 * Evaluates dropping `dragged` onto `(targetClass, dayOfWeek, session, periodNumber)`.
 */
export function evaluateCellDropTarget(params: {
  dragged: DraggedTimetablePayload
  targetClass: ClassMetaRef
  dayOfWeek: DayOfWeekCode
  session: SessionCode
  periodNumber: number
  currentSlots: SlotRecord[]
  slotByCell: Map<string, SlotRecord>
  quotaItems: QuotaReconcileItem[]
  teachersById: Map<string, TeacherMetaRef>
  campusId: string
  config: TimetableConfigParsed
  busySlots: BusySlotInput[]
  externalActiveSlots: ExternalActiveSlot[]
  travelRules: TravelRuleInput[]
  autoLockManual: boolean
}): DropTargetEvaluation {
  const {
    dragged,
    targetClass,
    dayOfWeek,
    session,
    periodNumber,
    currentSlots,
    slotByCell,
    quotaItems,
    teachersById,
    campusId,
    config,
    busySlots,
    externalActiveSlots,
    travelRules,
    autoLockManual,
  } = params

  const targetKey = makeSlotCellKey(targetClass.id, dayOfWeek, session, periodNumber)
  const existingTargetSlot = slotByCell.get(targetKey) || null

  if (dragged.kind === "CELL_SLOT") {
    if (dragged.sourceCellKey === targetKey) {
      return {
        status: "OUT_OF_COLUMN",
        reason: null,
        resolvedSlot: null,
        swappedBackSlot: null,
      }
    }
    if (dragged.slot.classId !== targetClass.id) {
      return {
        status: "OUT_OF_COLUMN",
        reason: "Chỉ di chuyển / hoán đổi ô tiết trong cùng một lớp học",
        resolvedSlot: null,
        swappedBackSlot: null,
      }
    }
    if (dragged.slot.isLocked || existingTargetSlot?.isLocked) {
      return {
        status: "BLOCKED",
        reason: "Ô tiết đang khóa cố định",
        resolvedSlot: null,
        swappedBackSlot: null,
      }
    }

    const [, srcDay, srcSession, srcPeriodStr] = dragged.sourceCellKey.split("::")
    const movedSlot: SlotRecord = {
      ...dragged.slot,
      dayOfWeek,
      session,
      periodNumber,
      isLocked: autoLockManual ? true : Boolean(dragged.slot.isLocked),
    }

    const swappedBackSlot: SlotRecord | null = existingTargetSlot
      ? {
          ...existingTargetSlot,
          dayOfWeek: srcDay as DayOfWeekCode,
          session: srcSession as SessionCode,
          periodNumber: Number(srcPeriodStr),
        }
      : null

    const remainingSlots = currentSlots.filter((s) => {
      const k = makeSlotCellKey(s.classId, s.dayOfWeek, s.session, s.periodNumber)
      return k !== dragged.sourceCellKey && k !== targetKey
    })

    const fwdConflict = checkSinglePlacementConflict({
      candidate: movedSlot,
      campusId,
      config,
      otherSlots: swappedBackSlot ? [...remainingSlots, swappedBackSlot] : remainingSlots,
      teachersById,
      busySlots,
      externalActiveSlots,
      travelRules,
    })

    if (fwdConflict) {
      return {
        status: "CONFLICT",
        reason: fwdConflict,
        resolvedSlot: movedSlot,
        swappedBackSlot,
      }
    }

    if (swappedBackSlot) {
      const backConflict = checkSinglePlacementConflict({
        candidate: swappedBackSlot,
        campusId,
        config,
        otherSlots: [...remainingSlots, movedSlot],
        teachersById,
        busySlots,
        externalActiveSlots,
        travelRules,
      })
      if (backConflict) {
        return {
          status: "CONFLICT",
          reason: `Chiều hoán đổi ngược: ${backConflict}`,
          resolvedSlot: movedSlot,
          swappedBackSlot,
        }
      }
    }

    return {
      status: swappedBackSlot ? "SWAP_VALID" : "VALID",
      reason: swappedBackSlot ? `Hoán đổi với ${swappedBackSlot.subjectName}` : null,
      resolvedSlot: movedSlot,
      swappedBackSlot,
    }
  }

  if (dragged.kind === "QUOTA_ACTIVITY") {
    if (dragged.item.classId !== targetClass.id) {
      return {
        status: "OUT_OF_COLUMN",
        reason: `Hoạt động này của Lớp ${dragged.item.className}`,
        resolvedSlot: null,
        swappedBackSlot: null,
      }
    }
    if (existingTargetSlot?.isLocked) {
      return {
        status: "BLOCKED",
        reason: "Ô tiết đang khóa cố định",
        resolvedSlot: null,
        swappedBackSlot: null,
      }
    }

    const q = dragged.item
    const candidate: SlotRecord = {
      classId: targetClass.id,
      className: targetClass.className,
      grade: targetClass.grade,
      level: targetClass.level,
      dayOfWeek,
      session,
      periodNumber,
      subjectId: q.subjectId,
      subjectCode: q.subjectCode,
      subjectName: q.subjectName,
      teacherId: q.primaryTeacherId,
      teacherCode: q.primaryTeacherCode,
      teacherName: q.primaryTeacherName,
      coTeacherId: q.coTeacherId,
      coTeacherCode: q.coTeacherCode,
      coTeacherName: q.coTeacherName,
      weekType: dragged.weekType,
      isLocked: autoLockManual,
    }

    const otherSlots = currentSlots.filter(
      (s) => makeSlotCellKey(s.classId, s.dayOfWeek, s.session, s.periodNumber) !== targetKey
    )

    const conflict = checkSinglePlacementConflict({
      candidate,
      campusId,
      config,
      otherSlots,
      teachersById,
      busySlots,
      externalActiveSlots,
      travelRules,
    })

    if (conflict) {
      return {
        status: "CONFLICT",
        reason: conflict,
        resolvedSlot: candidate,
        swappedBackSlot: null,
      }
    }

    return {
      status: existingTargetSlot ? "SWAP_VALID" : "VALID",
      reason: existingTargetSlot ? `Thay thế ${existingTargetSlot.subjectName}` : null,
      resolvedSlot: candidate,
      swappedBackSlot: null,
    }
  }

  // kind === "SCOPE_SUBJECT"
  if (existingTargetSlot?.isLocked) {
    return {
      status: "BLOCKED",
      reason: "Ô tiết đang khóa cố định",
      resolvedSlot: null,
      swappedBackSlot: null,
    }
  }

  const matchedQuota = quotaItems.find(
    (q) => q.classId === targetClass.id && q.subjectId === dragged.subjectId
  )

  let teacherId: string | null = matchedQuota?.primaryTeacherId || null
  let teacherCode: string | null = matchedQuota?.primaryTeacherCode || null
  let teacherName: string | null = matchedQuota?.primaryTeacherName || null
  let coTeacherId: string | null = matchedQuota?.coTeacherId || null
  let coTeacherCode: string | null = matchedQuota?.coTeacherCode || null
  let coTeacherName: string | null = matchedQuota?.coTeacherName || null

  if (dragged.useHomeroomTeacher || !teacherId) {
    const hrId = String(targetClass.homeroomTeacherId || "")
      .split(",")[0]
      ?.trim()
    const hrRef = hrId ? teachersById.get(hrId) : undefined
    if (dragged.useHomeroomTeacher && hrRef) {
      teacherId = hrRef.id
      teacherCode = hrRef.teacherCode || null
      teacherName = hrRef.teacherName
      coTeacherId = null
      coTeacherCode = null
      coTeacherName = null
    }
  }

  const candidate: SlotRecord = {
    classId: targetClass.id,
    className: targetClass.className,
    grade: targetClass.grade,
    level: targetClass.level,
    dayOfWeek,
    session,
    periodNumber,
    subjectId: dragged.subjectId,
    subjectCode: dragged.subjectCode,
    subjectName: dragged.subjectName,
    teacherId,
    teacherCode,
    teacherName,
    coTeacherId,
    coTeacherCode,
    coTeacherName,
    weekType: dragged.weekType,
    isLocked: autoLockManual,
  }

  const otherSlots = currentSlots.filter(
    (s) => makeSlotCellKey(s.classId, s.dayOfWeek, s.session, s.periodNumber) !== targetKey
  )

  const conflict = checkSinglePlacementConflict({
    candidate,
    campusId,
    config,
    otherSlots,
    teachersById,
    busySlots,
    externalActiveSlots,
    travelRules,
  })

  if (conflict) {
    return {
      status: "CONFLICT",
      reason: conflict,
      resolvedSlot: candidate,
      swappedBackSlot: null,
    }
  }

  return {
    status: existingTargetSlot ? "SWAP_VALID" : "VALID",
    reason: !teacherId
      ? "Chưa có phân công GV cho môn này ở lớp đích"
      : existingTargetSlot
      ? `Thay thế ${existingTargetSlot.subjectName}`
      : null,
    resolvedSlot: candidate,
    swappedBackSlot: null,
  }
}

export interface BulkScopePlacementResult {
  nextSlots: SlotRecord[]
  appliedCount: number
  skippedLockedCount: number
  skippedConflictCount: number
  conflictMessages: string[]
}

/**
 * Applies a subject to multiple classes in the Bộ thời khóa biểu (e.g. entire Grade or entire Scope)
 * at `(dayOfWeek, session, periodNumber)`, resolving each class's own assigned teacher or Homeroom Teacher.
 */
export function buildBulkScopePlacement(params: {
  targetClasses: ClassMetaRef[]
  subjectId: string
  subjectCode: string
  subjectName: string
  dayOfWeek: DayOfWeekCode
  session: SessionCode
  periodNumber: number
  weekType: WeekTypeCode
  useHomeroomTeacher: boolean
  lockPlacedSlots: boolean
  overwriteUnlocked: boolean
  currentSlots: SlotRecord[]
  quotaItems: QuotaReconcileItem[]
  teachersById: Map<string, TeacherMetaRef>
  campusId: string
  config: TimetableConfigParsed
  busySlots: BusySlotInput[]
  externalActiveSlots: ExternalActiveSlot[]
  travelRules: TravelRuleInput[]
}): BulkScopePlacementResult {
  const {
    targetClasses,
    subjectId,
    subjectCode,
    subjectName,
    dayOfWeek,
    session,
    periodNumber,
    weekType,
    useHomeroomTeacher,
    lockPlacedSlots,
    overwriteUnlocked,
    currentSlots,
    quotaItems,
    teachersById,
    campusId,
    config,
    busySlots,
    externalActiveSlots,
    travelRules,
  } = params

  let workingSlots = [...currentSlots]
  let appliedCount = 0
  let skippedLockedCount = 0
  let skippedConflictCount = 0
  const conflictMessages: string[] = []

  for (const cls of targetClasses) {
    const cKey = makeSlotCellKey(cls.id, dayOfWeek, session, periodNumber)
    const existing = workingSlots.find(
      (s) => makeSlotCellKey(s.classId, s.dayOfWeek, s.session, s.periodNumber) === cKey
    )

    if (existing?.isLocked) {
      // Allow updating lock/subject only if it's already the exact same subject, otherwise preserve locked slot
      if (existing.subjectId === subjectId) {
        continue
      }
      skippedLockedCount++
      continue
    }

    if (existing && !overwriteUnlocked) {
      continue
    }

    const matchedQuota = quotaItems.find(
      (q) => q.classId === cls.id && q.subjectId === subjectId
    )

    let teacherId: string | null = matchedQuota?.primaryTeacherId || null
    let teacherCode: string | null = matchedQuota?.primaryTeacherCode || null
    let teacherName: string | null = matchedQuota?.primaryTeacherName || null
    let coTeacherId: string | null = matchedQuota?.coTeacherId || null
    let coTeacherCode: string | null = matchedQuota?.coTeacherCode || null
    let coTeacherName: string | null = matchedQuota?.coTeacherName || null

    if (useHomeroomTeacher) {
      const hrId = String(cls.homeroomTeacherId || "")
        .split(",")[0]
        ?.trim()
      const hrRef = hrId ? teachersById.get(hrId) : undefined
      if (hrRef) {
        teacherId = hrRef.id
        teacherCode = hrRef.teacherCode || null
        teacherName = hrRef.teacherName
        coTeacherId = null
        coTeacherCode = null
        coTeacherName = null
      }
    }

    const candidate: SlotRecord = {
      classId: cls.id,
      className: cls.className,
      grade: cls.grade,
      level: cls.level,
      dayOfWeek,
      session,
      periodNumber,
      subjectId,
      subjectCode,
      subjectName,
      teacherId,
      teacherCode,
      teacherName,
      coTeacherId,
      coTeacherCode,
      coTeacherName,
      weekType,
      isLocked: lockPlacedSlots,
    }

    const others = workingSlots.filter(
      (s) => makeSlotCellKey(s.classId, s.dayOfWeek, s.session, s.periodNumber) !== cKey
    )

    const conflict = checkSinglePlacementConflict({
      candidate,
      campusId,
      config,
      otherSlots: others,
      teachersById,
      busySlots,
      externalActiveSlots,
      travelRules,
    })

    if (conflict) {
      skippedConflictCount++
      conflictMessages.push(`Lớp ${cls.className}: ${conflict}`)
      continue
    }

    workingSlots = [...others, candidate]
    appliedCount++
  }

  return {
    nextSlots: workingSlots,
    appliedCount,
    skippedLockedCount,
    skippedConflictCount,
    conflictMessages,
  }
}
