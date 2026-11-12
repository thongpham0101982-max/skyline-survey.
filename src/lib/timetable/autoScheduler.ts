import { buildDefaultPeriodTimes } from "./scopeResolver"
import type { QuotaReconcileItem } from "./types"
import {
  doWeekTypesOverlap,
  resolvePeriodWindow,
  validateTimetable,
  type BusySlotInput,
  type ExternalActiveSlot,
  type RoomInput,
  type TravelRuleInput,
} from "./validator"
import type {
  AutoScheduleOutcome,
  AutoScheduleResult,
  DayOfWeekCode,
  SessionCode,
  SlotRecord,
  TimetableConfigParsed,
  UnscheduledActivity,
  WeekTypeCode,
} from "./types"

export interface AutoScheduleInput {
  campusId: string
  campusName?: string
  academicYearId: string
  semester: number
  versionId?: string | null
  config: TimetableConfigParsed
  classes: Array<{
    id: string
    className: string
    grade: string
    level: string
    homeroomTeacherId?: string | null
  }>
  teachers: Array<{
    id: string
    teacherCode?: string | null
    teacherName: string
  }>
  quotaItems: QuotaReconcileItem[]
  existingSlots: SlotRecord[]
  rooms?: RoomInput[]
  busySlots?: BusySlotInput[]
  travelRules?: TravelRuleInput[]
  externalActiveSlots?: ExternalActiveSlot[]
  timeLimitMs?: number
}

interface PlacementUnit {
  unitId: string
  classId: string
  className: string
  grade: string
  level: string
  subjectId: string
  subjectCode: string
  subjectName: string
  teacherId: string
  teacherCode: string
  teacherName: string
  coTeacherId: string | null
  coTeacherCode: string | null
  coTeacherName: string | null
  weekType: WeekTypeCode
  blockSize: 1 | 2
}

interface CandidateCell {
  dayOfWeek: DayOfWeekCode
  session: SessionCode
  periodNumber: number
  roomId: string | null
  roomCode: string | null
  roomName: string | null
}

const OUTCOME_LABELS: Record<AutoScheduleOutcome, string> = {
  COMPLETED: "Đã xếp đủ 100% số tiết hợp lệ",
  PARTIAL: "Đã xếp một phần — còn hoạt động bị chặn bởi ràng buộc hoặc thiếu dữ liệu",
  TIME_LIMIT_REACHED: "Hết thời gian tìm kiếm cho phép (chưa kết luận vô nghiệm)",
  UNFEASIBLE: "Không tồn tại phương án thỏa mãn đồng thời các ràng buộc cứng",
}

const SUBJECT_PALETTE = [
  "#F0FDFA",
  "#ECFDF5",
  "#F8FAFC",
  "#FEFCE8",
  "#F0F9FF",
  "#FDF2F8",
]

function pickPaletteColor(codeOrName: string): string {
  let hash = 0
  for (let i = 0; i < codeOrName.length; i++) {
    hash = (hash * 31 + codeOrName.charCodeAt(i)) >>> 0
  }
  return SUBJECT_PALETTE[hash % SUBJECT_PALETTE.length]
}

export function runAutoScheduler(input: AutoScheduleInput): AutoScheduleResult {
  const startedAt = Date.now()
  const timeLimitMs = Math.max(500, Math.min(25_000, input.timeLimitMs ?? 6_000))

  const teachersById = new Map(input.teachers.map((t) => [t.id, t]))
  const classById = new Map(input.classes.map((c) => [c.id, c]))

  const workingDays: DayOfWeekCode[] =
    input.config.workingDays?.length > 0
      ? input.config.workingDays
      : ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
  const morningCount = input.config.morningPeriods || 4
  const afternoonCount = input.config.afternoonPeriods ?? 4
  const periodTimes =
    input.config.periodTimes?.length > 0
      ? input.config.periodTimes
      : buildDefaultPeriodTimes(input.config.scopeGroup, morningCount, afternoonCount)

  const travelMap = new Map<string, TravelRuleInput>()
  for (const tr of input.travelRules || []) {
    travelMap.set(`${tr.fromCampusId}::${tr.toCampusId}`, tr)
  }

  // 1. Preserve locked slots + materialize configured fixed slots
  const placedSlots: SlotRecord[] = []
  let lockedPreservedCount = 0

  for (const s of input.existingSlots) {
    if (s.isLocked && (s.subjectId || s.subjectName)) {
      placedSlots.push({ ...s })
      lockedPreservedCount++
    }
  }

  for (const fr of input.config.fixedSlots || []) {
    for (const cls of input.classes) {
      if (fr.appliesToGrades && fr.appliesToGrades.length > 0 && !fr.appliesToGrades.includes(cls.grade)) {
        continue
      }
      const alreadyOccupied = placedSlots.some(
        (p) =>
          p.classId === cls.id &&
          p.dayOfWeek === fr.dayOfWeek &&
          p.session === fr.session &&
          Number(p.periodNumber) === Number(fr.periodNumber)
      )
      if (alreadyOccupied) continue

      const homeroomId = String(cls.homeroomTeacherId || "")
        .split(",")[0]
        ?.trim()
      const hrTeacher = homeroomId ? teachersById.get(homeroomId) : undefined

      placedSlots.push({
        versionId: input.versionId || null,
        academicYearId: input.academicYearId,
        semester: input.semester,
        campusId: input.campusId,
        level: cls.level,
        grade: cls.grade,
        classId: cls.id,
        className: cls.className,
        dayOfWeek: fr.dayOfWeek,
        session: fr.session,
        periodNumber: fr.periodNumber,
        subjectId: fr.subjectId || null,
        subjectName: fr.subjectName,
        teacherId: fr.assignHomeroomTeacher && hrTeacher ? hrTeacher.id : null,
        teacherCode: fr.assignHomeroomTeacher && hrTeacher ? hrTeacher.teacherCode || null : null,
        teacherName: fr.assignHomeroomTeacher && hrTeacher ? hrTeacher.teacherName : null,
        weekType: fr.weekType || "ALL",
        isLocked: true,
        colorCode: "#F0FDFA",
      })
    }
  }

  // 2. Calculate already-placed weekly weight per (classId, subjectId)
  const placedWeight = new Map<string, number>()
  for (const s of placedSlots) {
    if (!s.subjectId) continue
    const key = `${s.classId}::${s.subjectId}`
    const w = String(s.weekType || "ALL").toUpperCase() === "ALL" ? 1 : 0.5
    placedWeight.set(key, (placedWeight.get(key) || 0) + w)
  }

  const unscheduledActivities: UnscheduledActivity[] = []
  const unitsToPlace: PlacementUnit[] = []
  let requiredUnitCount = 0

  const blockRuleBySubId = new Map<string, { minConsecutive: number }>()
  for (const br of input.config.blockRules || []) {
    if (br.subjectId && br.minConsecutive >= 2) {
      blockRuleBySubId.set(br.subjectId, { minConsecutive: 2 })
    }
  }

  for (const q of input.quotaItems) {
    if (q.weeklyQuota <= 0) continue
    const cls = classById.get(q.classId)
    if (!cls) continue

    const already = placedWeight.get(`${q.classId}::${q.subjectId}`) || 0
    let remaining = Math.round((q.weeklyQuota - already) * 100) / 100
    if (remaining <= 0) continue

    if (!q.primaryTeacherId) {
      const missingCount = Math.ceil(remaining)
      requiredUnitCount += missingCount
      unscheduledActivities.push({
        classId: q.classId,
        className: q.className,
        subjectId: q.subjectId,
        subjectName: q.subjectName,
        teacherId: null,
        teacherCode: null,
        teacherName: null,
        weekType: remaining % 1 !== 0 ? "ODD" : "ALL",
        missingPeriods: remaining,
        reasonCode: "MISSING_TEACHER_ASSIGNMENT",
        reasonDetail: `Môn ${q.subjectName} (định mức ${q.weeklyQuota} tiết/tuần) chưa được phân công giáo viên giảng dạy.`,
      })
      continue
    }

    const blockRule = blockRuleBySubId.get(q.subjectId)
    if (blockRule && remaining >= 2) {
      unitsToPlace.push({
        unitId: `${q.classId}::${q.subjectId}::BLOCK`,
        classId: q.classId,
        className: q.className,
        grade: cls.grade,
        level: cls.level,
        subjectId: q.subjectId,
        subjectCode: q.subjectCode,
        subjectName: q.subjectName,
        teacherId: q.primaryTeacherId,
        teacherCode: q.primaryTeacherCode || q.primaryTeacherId,
        teacherName: q.primaryTeacherName || q.primaryTeacherId,
        coTeacherId: q.coTeacherId,
        coTeacherCode: q.coTeacherCode,
        coTeacherName: q.coTeacherName,
        weekType: "ALL",
        blockSize: 2,
      })
      requiredUnitCount += 2
      remaining = Math.round((remaining - 2) * 100) / 100
    }

    while (remaining >= 1) {
      unitsToPlace.push({
        unitId: `${q.classId}::${q.subjectId}::W_${remaining}`,
        classId: q.classId,
        className: q.className,
        grade: cls.grade,
        level: cls.level,
        subjectId: q.subjectId,
        subjectCode: q.subjectCode,
        subjectName: q.subjectName,
        teacherId: q.primaryTeacherId,
        teacherCode: q.primaryTeacherCode || q.primaryTeacherId,
        teacherName: q.primaryTeacherName || q.primaryTeacherId,
        coTeacherId: q.coTeacherId,
        coTeacherCode: q.coTeacherCode,
        coTeacherName: q.coTeacherName,
        weekType: "ALL",
        blockSize: 1,
      })
      requiredUnitCount += 1
      remaining = Math.round((remaining - 1) * 100) / 100
    }

    if (remaining >= 0.5) {
      unitsToPlace.push({
        unitId: `${q.classId}::${q.subjectId}::HALF`,
        classId: q.classId,
        className: q.className,
        grade: cls.grade,
        level: cls.level,
        subjectId: q.subjectId,
        subjectCode: q.subjectCode,
        subjectName: q.subjectName,
        teacherId: q.primaryTeacherId,
        teacherCode: q.primaryTeacherCode || q.primaryTeacherId,
        teacherName: q.primaryTeacherName || q.primaryTeacherId,
        coTeacherId: q.coTeacherId,
        coTeacherCode: q.coTeacherCode,
        coTeacherName: q.coTeacherName,
        weekType: "ODD",
        blockSize: 1,
      })
      requiredUnitCount += 1
    }
  }

  // Helper to check if a single period placement is valid against current state
  const allCells: Array<{ dayOfWeek: DayOfWeekCode; session: SessionCode; periodNumber: number }> = []
  for (const day of workingDays) {
    for (let p = 1; p <= morningCount; p++) {
      allCells.push({ dayOfWeek: day, session: "MORNING", periodNumber: p })
    }
    for (let p = 1; p <= afternoonCount; p++) {
      allCells.push({ dayOfWeek: day, session: "AFTERNOON", periodNumber: p })
    }
  }

  const maxSubPerDay = input.config.limitsAndPriorities?.maxPeriodsPerDayPerSubject || 2
  const functionalRoomsBySubject = new Map<string, RoomInput[]>()
  for (const r of input.rooms || []) {
    if (r.allowedSubjectIds && r.allowedSubjectIds.length > 0) {
      for (const sid of r.allowedSubjectIds) {
        const list = functionalRoomsBySubject.get(sid) || []
        list.push(r)
        functionalRoomsBySubject.set(sid, list)
      }
    }
  }

  function checkSingleCellFeasibility(
    unit: PlacementUnit,
    dayOfWeek: DayOfWeekCode,
    session: SessionCode,
    periodNumber: number,
    currentSlots: SlotRecord[],
    ignoreDailySubjectLimit: boolean = false
  ): { ok: boolean; room?: RoomInput | null; reason?: UnscheduledActivity["reasonCode"] } {
    // 1. Class free? (Allow pairing an ODD half-week unit with an EVEN half-week unit in the same cell? Better place on free cell or non-overlapping weekType)
    const classHit = currentSlots.find(
      (s) =>
        s.classId === unit.classId &&
        s.dayOfWeek === dayOfWeek &&
        s.session === session &&
        Number(s.periodNumber) === periodNumber &&
        doWeekTypesOverlap(s.weekType, unit.weekType)
    )
    if (classHit) return { ok: false, reason: "CLASS_FULL" }

    // 2. Busy slot check (class & teachers)
    const unitTeacherIds = [unit.teacherId, unit.coTeacherId].filter(Boolean) as string[]
    for (const bs of input.busySlots || []) {
      if (bs.dayOfWeek !== dayOfWeek || bs.session !== session || Number(bs.periodNumber) !== periodNumber) {
        continue
      }
      if (!doWeekTypesOverlap(bs.weekType, unit.weekType)) continue
      if (bs.targetType === "CLASS" && bs.targetId === unit.classId) {
        return { ok: false, reason: "CLASS_FULL" }
      }
      if (bs.targetType === "TEACHER" && unitTeacherIds.includes(bs.targetId)) {
        return { ok: false, reason: "TEACHER_BUSY_OR_CONFLICT" }
      }
    }

    // 3. Daily subject limit
    if (!ignoreDailySubjectLimit) {
      const sameSubToday = currentSlots.filter(
        (s) =>
          s.classId === unit.classId &&
          s.subjectId === unit.subjectId &&
          s.dayOfWeek === dayOfWeek &&
          doWeekTypesOverlap(s.weekType, unit.weekType)
      ).length
      if (sameSubToday + 1 > maxSubPerDay) {
        return { ok: false, reason: "DAILY_LIMIT_REACHED" }
      }
    }

    // 4. Teacher conflict & inter-campus travel check (local + external)
    const candidateWin = resolvePeriodWindow(periodTimes, session, periodNumber)

    for (const tid of unitTeacherIds) {
      // Check local currentSlots
      for (const s of currentSlots) {
        if (s.dayOfWeek !== dayOfWeek) continue
        if (!doWeekTypesOverlap(s.weekType, unit.weekType)) continue
        const sInvolved =
          s.teacherId === tid ||
          s.coTeacherId === tid ||
          s.assistantTeacherId === tid ||
          s.altTeacherId === tid
        if (!sInvolved) continue

        const sWin = resolvePeriodWindow(periodTimes, s.session, s.periodNumber)
        if (candidateWin.startMinutes < sWin.endMinutes && sWin.startMinutes < candidateWin.endMinutes) {
          return { ok: false, reason: "TEACHER_BUSY_OR_CONFLICT" }
        }
      }

      // Check external system-wide slots (cross-level & cross-campus)
      for (const ext of input.externalActiveSlots || []) {
        if (ext.slot.dayOfWeek !== dayOfWeek) continue
        if (!doWeekTypesOverlap(ext.slot.weekType, unit.weekType)) continue
        const extInvolved =
          ext.slot.teacherId === tid ||
          ext.slot.coTeacherId === tid ||
          ext.slot.assistantTeacherId === tid ||
          ext.slot.altTeacherId === tid
        if (!extInvolved) continue

        if (
          candidateWin.startMinutes < ext.endMinutes &&
          ext.startMinutes < candidateWin.endMinutes
        ) {
          return { ok: false, reason: "TEACHER_BUSY_OR_CONFLICT" }
        }

        if (ext.campusId !== input.campusId) {
          const firstStart = Math.min(candidateWin.startMinutes, ext.startMinutes)
          const firstEnd =
            firstStart === candidateWin.startMinutes ? candidateWin.endMinutes : ext.endMinutes
          const secondStart =
            firstStart === candidateWin.startMinutes ? ext.startMinutes : candidateWin.startMinutes
          const rule =
            travelMap.get(`${input.campusId}::${ext.campusId}`) ||
            travelMap.get(`${ext.campusId}::${input.campusId}`) || {
              fromCampusId: input.campusId,
              toCampusId: ext.campusId,
              minTravelMinutes: 40,
              allowSameSession: false,
              allowSameDay: true,
            }

          if (!rule.allowSameDay) {
            return { ok: false, reason: "TRAVEL_TIME_CONFLICT" }
          }
          if (!rule.allowSameSession && ext.slot.session === session) {
            return { ok: false, reason: "TRAVEL_TIME_CONFLICT" }
          }
          if (secondStart - firstEnd < rule.minTravelMinutes) {
            return { ok: false, reason: "TRAVEL_TIME_CONFLICT" }
          }
        }
      }
    }

    // 5. Functional room requirement (if subject has dedicated functional rooms configured)
    const candidateRooms = functionalRoomsBySubject.get(unit.subjectId)
    if (candidateRooms && candidateRooms.length > 0) {
      const freeRoom = candidateRooms.find((rm) => {
        const roomBusy = (input.busySlots || []).some(
          (bs) =>
            bs.targetType === "ROOM" &&
            bs.targetId === rm.id &&
            bs.dayOfWeek === dayOfWeek &&
            bs.session === session &&
            Number(bs.periodNumber) === periodNumber &&
            doWeekTypesOverlap(bs.weekType, unit.weekType)
        )
        if (roomBusy) return false
        const roomTaken = currentSlots.some(
          (s) =>
            s.roomId === rm.id &&
            s.dayOfWeek === dayOfWeek &&
            s.session === session &&
            Number(s.periodNumber) === periodNumber &&
            doWeekTypesOverlap(s.weekType, unit.weekType)
        )
        return !roomTaken
      })
      if (!freeRoom) {
        return { ok: false, reason: "NO_SUITABLE_ROOM" }
      }
      return { ok: true, room: freeRoom }
    }

    return { ok: true, room: null }
  }

  function listCandidatesForUnit(
    unit: PlacementUnit,
    currentSlots: SlotRecord[]
  ): { candidates: CandidateCell[]; dominantFailureReason: UnscheduledActivity["reasonCode"] } {
    const candidates: CandidateCell[] = []
    const reasonTally = new Map<UnscheduledActivity["reasonCode"], number>()

    if (unit.blockSize === 2) {
      for (const day of workingDays) {
        for (const sess of ["MORNING", "AFTERNOON"] as SessionCode[]) {
          const maxP = sess === "MORNING" ? morningCount : afternoonCount
          for (let p = 1; p < maxP; p++) {
            const c1 = checkSingleCellFeasibility(unit, day, sess, p, currentSlots, true)
            if (!c1.ok) {
              if (c1.reason) reasonTally.set(c1.reason, (reasonTally.get(c1.reason) || 0) + 1)
              continue
            }
            const c2 = checkSingleCellFeasibility(unit, day, sess, p + 1, currentSlots, true)
            if (!c2.ok) {
              if (c2.reason) reasonTally.set(c2.reason, (reasonTally.get(c2.reason) || 0) + 1)
              continue
            }
            if (c1.room && c2.room && c1.room.id !== c2.room.id) {
              reasonTally.set("NO_SUITABLE_ROOM", (reasonTally.get("NO_SUITABLE_ROOM") || 0) + 1)
              continue
            }
            candidates.push({
              dayOfWeek: day,
              session: sess,
              periodNumber: p,
              roomId: c1.room?.id || null,
              roomCode: c1.room?.roomCode || null,
              roomName: c1.room?.roomName || null,
            })
          }
        }
      }
    } else {
      for (const cell of allCells) {
        const res = checkSingleCellFeasibility(
          unit,
          cell.dayOfWeek,
          cell.session,
          cell.periodNumber,
          currentSlots,
          false
        )
        if (res.ok) {
          candidates.push({
            dayOfWeek: cell.dayOfWeek,
            session: cell.session,
            periodNumber: cell.periodNumber,
            roomId: res.room?.id || null,
            roomCode: res.room?.roomCode || null,
            roomName: res.room?.roomName || null,
          })
        } else if (res.reason) {
          reasonTally.set(res.reason, (reasonTally.get(res.reason) || 0) + 1)
        }
      }
    }

    // Score candidates: prefer morning for core subjects, spread across days
    const preferMorning = input.config.limitsAndPriorities?.preferMorningForCoreSubjects !== false
    candidates.sort((a, b) => {
      if (preferMorning && a.session !== b.session) {
        return a.session === "MORNING" ? -1 : 1
      }
      return a.periodNumber - b.periodNumber
    })

    let dominant: UnscheduledActivity["reasonCode"] =
      unit.blockSize === 2 ? "BLOCK_CONSTRAINT_UNSATISFIED" : "TEACHER_BUSY_OR_CONFLICT"
    let bestCount = 0
    for (const [r, cnt] of reasonTally) {
      if (cnt > bestCount) {
        bestCount = cnt
        dominant = r
      }
    }

    return { candidates, dominantFailureReason: dominant }
  }

  // Sort units: blockSize=2 first, then teachers with heavier total load (degree heuristic)
  const teacherLoadCount = new Map<string, number>()
  for (const u of unitsToPlace) {
    teacherLoadCount.set(u.teacherId, (teacherLoadCount.get(u.teacherId) || 0) + u.blockSize)
  }

  const remainingUnits = [...unitsToPlace].sort((a, b) => {
    if (a.blockSize !== b.blockSize) return b.blockSize - a.blockSize
    return (teacherLoadCount.get(b.teacherId) || 0) - (teacherLoadCount.get(a.teacherId) || 0)
  })

  let timedOut = false
  let placedUnitPeriods = 0

  // Dynamic MRV loop with bounded local swap/backtrack repair
  while (remainingUnits.length > 0) {
    if (Date.now() - startedAt >= timeLimitMs) {
      timedOut = true
      break
    }

    // Pick unit with fewest legal candidates (MRV)
    let bestIdx = 0
    let bestEval = listCandidatesForUnit(remainingUnits[0], placedSlots)

    const scanLimit = Math.min(remainingUnits.length, 40)
    for (let i = 1; i < scanLimit; i++) {
      const ev = listCandidatesForUnit(remainingUnits[i], placedSlots)
      if (ev.candidates.length < bestEval.candidates.length) {
        bestIdx = i
        bestEval = ev
        if (ev.candidates.length === 0) break
      }
    }

    const [unit] = remainingUnits.splice(bestIdx, 1)

    if (bestEval.candidates.length > 0) {
      const chosen = bestEval.candidates[0]
      const blockGroupId = unit.blockSize === 2 ? `BLK_${unit.classId}_${unit.subjectId}_${chosen.dayOfWeek}` : null

      for (let offset = 0; offset < unit.blockSize; offset++) {
        placedSlots.push({
          versionId: input.versionId || null,
          academicYearId: input.academicYearId,
          semester: input.semester,
          campusId: input.campusId,
          level: unit.level,
          grade: unit.grade,
          classId: unit.classId,
          className: unit.className,
          dayOfWeek: chosen.dayOfWeek,
          session: chosen.session,
          periodNumber: chosen.periodNumber + offset,
          subjectId: unit.subjectId,
          subjectCode: unit.subjectCode,
          subjectName: unit.subjectName,
          teacherId: unit.teacherId,
          teacherCode: unit.teacherCode,
          teacherName: unit.teacherName,
          coTeacherId: unit.coTeacherId,
          coTeacherCode: unit.coTeacherCode,
          coTeacherName: unit.coTeacherName,
          roomId: chosen.roomId,
          roomCode: chosen.roomCode,
          roomName: chosen.roomName,
          weekType: unit.weekType,
          isLocked: false,
          blockGroupId,
          colorCode: pickPaletteColor(unit.subjectCode || unit.subjectName),
        })
      }
      placedUnitPeriods += unit.blockSize
      continue
    }

    // Try 1-step swap repair for single-period units before recording unscheduled
    let repaired = false
    if (unit.blockSize === 1 && Date.now() - startedAt < timeLimitMs) {
      const unlockedClassSlots = placedSlots.filter(
        (s) => s.classId === unit.classId && !s.isLocked && !s.blockGroupId
      )
      for (const existing of unlockedClassSlots) {
        const withoutExisting = placedSlots.filter((s) => s !== existing)
        const tryPlaceUnit = checkSingleCellFeasibility(
          unit,
          existing.dayOfWeek as DayOfWeekCode,
          existing.session as SessionCode,
          existing.periodNumber,
          withoutExisting,
          false
        )
        if (!tryPlaceUnit.ok || !existing.subjectId || !existing.teacherId) continue

        const displacedUnit: PlacementUnit = {
          unitId: "DISPLACED",
          classId: existing.classId,
          className: existing.className,
          grade: existing.grade,
          level: existing.level,
          subjectId: existing.subjectId,
          subjectCode: existing.subjectCode || "",
          subjectName: existing.subjectName || "",
          teacherId: existing.teacherId,
          teacherCode: existing.teacherCode || existing.teacherId,
          teacherName: existing.teacherName || existing.teacherId,
          coTeacherId: existing.coTeacherId || null,
          coTeacherCode: existing.coTeacherCode || null,
          coTeacherName: existing.coTeacherName || null,
          weekType: (existing.weekType as WeekTypeCode) || "ALL",
          blockSize: 1,
        }

        const withNewUnit: SlotRecord[] = [
          ...withoutExisting,
          {
            versionId: input.versionId || null,
            academicYearId: input.academicYearId,
            semester: input.semester,
            campusId: input.campusId,
            level: unit.level,
            grade: unit.grade,
            classId: unit.classId,
            className: unit.className,
            dayOfWeek: existing.dayOfWeek,
            session: existing.session,
            periodNumber: existing.periodNumber,
            subjectId: unit.subjectId,
            subjectCode: unit.subjectCode,
            subjectName: unit.subjectName,
            teacherId: unit.teacherId,
            teacherCode: unit.teacherCode,
            teacherName: unit.teacherName,
            coTeacherId: unit.coTeacherId,
            coTeacherCode: unit.coTeacherCode,
            coTeacherName: unit.coTeacherName,
            roomId: tryPlaceUnit.room?.id || null,
            roomCode: tryPlaceUnit.room?.roomCode || null,
            roomName: tryPlaceUnit.room?.roomName || null,
            weekType: unit.weekType,
            isLocked: false,
            colorCode: pickPaletteColor(unit.subjectCode || unit.subjectName),
          },
        ]

        const altEval = listCandidatesForUnit(displacedUnit, withNewUnit)
        if (altEval.candidates.length > 0) {
          const altCell = altEval.candidates[0]
          placedSlots.length = 0
          placedSlots.push(
            ...withNewUnit,
            {
              ...existing,
              dayOfWeek: altCell.dayOfWeek,
              session: altCell.session,
              periodNumber: altCell.periodNumber,
              roomId: altCell.roomId,
              roomCode: altCell.roomCode,
              roomName: altCell.roomName,
            }
          )
          placedUnitPeriods += 1
          repaired = true
          break
        }
      }
    }

    if (!repaired) {
      const reasonMessages: Record<UnscheduledActivity["reasonCode"], string> = {
        MISSING_TEACHER_ASSIGNMENT: "Chưa có phân công giáo viên.",
        TEACHER_BUSY_OR_CONFLICT: `GV ${unit.teacherName} (${unit.teacherCode}) bị kẹt lịch dạy hoặc lịch báo bận ở tất cả các tiết trống còn lại của Lớp ${unit.className}.`,
        TRAVEL_TIME_CONFLICT: `GV ${unit.teacherName} (${unit.teacherCode}) không đủ thời gian di chuyển liên cơ sở cho các ô tiết còn trống của Lớp ${unit.className}.`,
        CLASS_FULL: `Lớp ${unit.className} không còn ô tiết trống trong khung cấu hình.`,
        NO_SUITABLE_ROOM: `Không còn phòng chức năng phù hợp còn trống cho môn ${unit.subjectName}.`,
        BLOCK_CONSTRAINT_UNSATISFIED: `Không tìm được 2 tiết liên tiếp cùng buổi còn trống đồng thời cho Lớp ${unit.className} và GV ${unit.teacherName}.`,
        DAILY_LIMIT_REACHED: `Các ngày còn tiết trống đều đã chạm giới hạn số tiết/ngày của môn ${unit.subjectName}.`,
        TIME_LIMIT_EXHAUSTED: "Hết thời gian tìm kiếm trước khi xếp hoạt động này.",
      }

      unscheduledActivities.push({
        classId: unit.classId,
        className: unit.className,
        subjectId: unit.subjectId,
        subjectName: unit.subjectName,
        teacherId: unit.teacherId,
        teacherCode: unit.teacherCode,
        teacherName: unit.teacherName,
        weekType: unit.weekType,
        missingPeriods: unit.weekType === "ALL" ? unit.blockSize : 0.5,
        reasonCode: bestEval.dominantFailureReason,
        reasonDetail: reasonMessages[bestEval.dominantFailureReason],
      })
    }
  }

  // Record remaining units if timed out
  if (timedOut && remainingUnits.length > 0) {
    for (const u of remainingUnits) {
      unscheduledActivities.push({
        classId: u.classId,
        className: u.className,
        subjectId: u.subjectId,
        subjectName: u.subjectName,
        teacherId: u.teacherId,
        teacherCode: u.teacherCode,
        teacherName: u.teacherName,
        weekType: u.weekType,
        missingPeriods: u.weekType === "ALL" ? u.blockSize : 0.5,
        reasonCode: "TIME_LIMIT_EXHAUSTED",
        reasonDetail: `Hết giới hạn thời gian tìm kiếm (${timeLimitMs} ms) trước khi duyệt tới hoạt động này.`,
      })
    }
  }

  const elapsedMs = Date.now() - startedAt

  const validationReport = validateTimetable({
    slots: placedSlots,
    config: input.config,
    campusId: input.campusId,
    campusName: input.campusName,
    classes: input.classes,
    teachersById,
    rooms: input.rooms,
    busySlots: input.busySlots,
    travelRules: input.travelRules,
    externalActiveSlots: input.externalActiveSlots,
  })

  let outcome: AutoScheduleOutcome = "COMPLETED"
  if (timedOut) {
    outcome = "TIME_LIMIT_REACHED"
  } else if (unscheduledActivities.length > 0) {
    outcome = placedUnitPeriods > 0 ? "PARTIAL" : "UNFEASIBLE"
  }

  return {
    outcome,
    outcomeLabel: OUTCOME_LABELS[outcome],
    elapsedMs,
    generatedSlots: placedSlots,
    placedCount: placedUnitPeriods,
    requiredCount: requiredUnitCount,
    lockedPreservedCount,
    unscheduledActivities,
    validationReport,
  }
}
