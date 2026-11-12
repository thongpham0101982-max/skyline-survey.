import {
  buildDefaultPeriodTimes,
  SHORT_DAY_LABELS,
  timeStringToMinutes,
} from "./scopeResolver"
import type {
  QuotaReconcileItem,
  PeriodTimeDef,
  RuleStatus,
  SlotRecord,
  TimetableConfigParsed,
  ValidationIssue,
  ValidationReport,
  ValidationRuleResult,
} from "./types"

export interface BusySlotInput {
  targetType: "TEACHER" | "ROOM" | "CLASS" | string
  targetId: string
  campusId?: string | null
  dayOfWeek: string
  session: string
  periodNumber: number
  startTime?: string | null
  endTime?: string | null
  weekType?: string | null
  reason?: string | null
}

export interface RoomInput {
  id: string
  campusId: string
  roomCode: string
  roomName: string
  roomType: string
  capacity: number
  allowedSubjectIds: string[]
}

export interface TravelRuleInput {
  fromCampusId: string
  toCampusId: string
  minTravelMinutes: number
  allowSameSession: boolean
  allowSameDay: boolean
}

export interface ExternalActiveSlot {
  slot: SlotRecord
  campusId: string
  campusName: string
  scopeGroup: string
  startMinutes: number
  endMinutes: number
}

export interface ValidateTimetableInput {
  slots: SlotRecord[]
  config: TimetableConfigParsed
  campusId: string
  campusName?: string
  classes: Array<{ id: string; className: string; grade: string; level: string }>
  teachersById: Map<string, { id: string; teacherCode?: string | null; teacherName: string }>
  quotaItems?: QuotaReconcileItem[]
  rooms?: RoomInput[]
  busySlots?: BusySlotInput[]
  travelRules?: TravelRuleInput[]
  externalActiveSlots?: ExternalActiveSlot[]
}

const STATUS_LABEL_MAP: Record<RuleStatus, ValidationRuleResult["statusLabel"]> = {
  PASSED: "Đạt",
  VIOLATED: "Vi phạm",
  INSUFFICIENT_DATA: "Chưa đủ dữ liệu",
  NOT_APPLICABLE: "Không áp dụng",
}

function makeRuleResult(
  ruleCode: string,
  ruleName: string,
  status: RuleStatus,
  summary: string,
  issues: ValidationIssue[] = []
): ValidationRuleResult {
  return {
    ruleCode,
    ruleName,
    status,
    statusLabel: STATUS_LABEL_MAP[status],
    violationCount: issues.filter((i) => i.severity === "ERROR").length,
    summary,
    issues,
  }
}

export function doWeekTypesOverlap(a?: string | null, b?: string | null): boolean {
  const wa = String(a || "ALL").toUpperCase()
  const wb = String(b || "ALL").toUpperCase()
  if (wa === "ALL" || wb === "ALL") return true
  return wa === wb
}

export function resolvePeriodWindow(
  periodTimes: PeriodTimeDef[],
  session: string,
  periodNumber: number
): { startMinutes: number; endMinutes: number } {
  const found = periodTimes.find(
    (p) => p.session === session && Number(p.periodNumber) === Number(periodNumber)
  )
  if (found) {
    const sm = timeStringToMinutes(found.startTime)
    const em = timeStringToMinutes(found.endTime)
    if (sm !== null && em !== null && em > sm) {
      return { startMinutes: sm, endMinutes: em }
    }
  }
  const fallback = buildDefaultPeriodTimes("TRUNG_HOC", 6, 6).find(
    (p) => p.session === session && Number(p.periodNumber) === Number(periodNumber)
  )
  return {
    startMinutes: timeStringToMinutes(fallback?.startTime) ?? 450,
    endMinutes: timeStringToMinutes(fallback?.endTime) ?? 495,
  }
}

interface ParticipatingTeacher {
  teacherId: string
  teacherCode: string
  teacherName: string
  roleLabel: string
  effectiveWeekType: string
}

export function extractParticipatingTeachers(
  slot: SlotRecord,
  teachersById: Map<string, { id: string; teacherCode?: string | null; teacherName: string }>
): { participants: ParticipatingTeacher[]; unmappedTeacherNames: string[] } {
  const participants: ParticipatingTeacher[] = []
  const unmappedTeacherNames: string[] = []
  const seen = new Set<string>()

  const pushTeacher = (
    tid: string | null | undefined,
    tcode: string | null | undefined,
    tname: string | null | undefined,
    roleLabel: string,
    effectiveWeekType: string
  ) => {
    if (!tid) {
      if (tname && tname.trim() !== "") {
        unmappedTeacherNames.push(`${tname} (${roleLabel})`)
      }
      return
    }
    const dedupKey = `${tid}::${effectiveWeekType}`
    if (seen.has(dedupKey)) return
    seen.add(dedupKey)
    const ref = teachersById.get(tid)
    participants.push({
      teacherId: tid,
      teacherCode: tcode || ref?.teacherCode || tid,
      teacherName: tname || ref?.teacherName || tid,
      roleLabel,
      effectiveWeekType,
    })
  }

  const baseWeek = String(slot.weekType || "ALL").toUpperCase()
  pushTeacher(slot.teacherId, slot.teacherCode, slot.teacherName, "GV chính", baseWeek)
  pushTeacher(slot.coTeacherId, slot.coTeacherCode, slot.coTeacherName, "Đồng giảng", baseWeek)
  pushTeacher(
    slot.assistantTeacherId,
    slot.assistantTeacherCode,
    slot.assistantTeacherName,
    "Trợ giảng",
    baseWeek
  )

  if (slot.altTeacherId || slot.altTeacherName) {
    const altWeek = baseWeek === "EVEN" ? "ODD" : baseWeek === "ODD" ? "EVEN" : "ALL"
    pushTeacher(slot.altTeacherId, slot.altTeacherCode, slot.altTeacherName, "GV luân phiên", altWeek)
  }

  return { participants, unmappedTeacherNames }
}

/**
 * Shared Validation Engine used across:
 * 1) Auto-scheduler
 * 2) Excel Import preview & commit
 * 3) Drag & drop / manual save
 * 4) Approval & Publish gate
 */
export function validateTimetable(input: ValidateTimetableInput): ValidationReport {
  const periodTimes =
    input.config.periodTimes?.length > 0
      ? input.config.periodTimes
      : buildDefaultPeriodTimes(
          input.config.scopeGroup,
          input.config.morningPeriods || 4,
          input.config.afternoonPeriods ?? 4
        )

  const activeSlots = input.slots.filter(
    (s) => s.subjectId || s.subjectName || s.teacherId || s.teacherName
  )

  // =========================================================================
  // RULE 1: Trùng giáo viên toàn hệ thống (GV chính, đồng giảng, trợ giảng, luân phiên)
  // Kiểm tra theo mã GV + khung giờ thực tế liên cấp, liên cơ sở
  // =========================================================================
  const rule1Issues: ValidationIssue[] = []
  let hasUnmappedTeacher = false

  interface TeacherOccurrence {
    teacherId: string
    teacherCode: string
    teacherName: string
    roleLabel: string
    weekType: string
    campusId: string
    campusName: string
    classId: string
    className: string
    dayOfWeek: string
    session: string
    periodNumber: number
    startMinutes: number
    endMinutes: number
    isExternal: boolean
  }

  const occByTeacherDay = new Map<string, TeacherOccurrence[]>()
  const pushOcc = (occ: TeacherOccurrence) => {
    const key = `${occ.teacherId}::${occ.dayOfWeek}`
    const list = occByTeacherDay.get(key) || []
    list.push(occ)
    occByTeacherDay.set(key, list)
  }

  for (const s of activeSlots) {
    const { participants, unmappedTeacherNames } = extractParticipatingTeachers(
      s,
      input.teachersById
    )
    if (unmappedTeacherNames.length > 0) {
      hasUnmappedTeacher = true
      for (const rawName of unmappedTeacherNames) {
        rule1Issues.push({
          ruleCode: "R01_TEACHER_CONFLICT",
          severity: "WARNING",
          message: `Lớp ${s.className} (${SHORT_DAY_LABELS[s.dayOfWeek] || s.dayOfWeek} - ${s.session === "MORNING" ? "Sáng" : "Chiều"} T${s.periodNumber}): ${rawName} chưa gắn mã giáo viên định danh.`,
          classId: s.classId,
          className: s.className,
          dayOfWeek: s.dayOfWeek,
          session: s.session,
          periodNumber: s.periodNumber,
        })
      }
    }

    const win = resolvePeriodWindow(periodTimes, s.session, s.periodNumber)
    for (const p of participants) {
      pushOcc({
        teacherId: p.teacherId,
        teacherCode: p.teacherCode,
        teacherName: p.teacherName,
        roleLabel: p.roleLabel,
        weekType: p.effectiveWeekType,
        campusId: s.campusId || input.campusId,
        campusName: input.campusName || input.campusId,
        classId: s.classId,
        className: s.className,
        dayOfWeek: s.dayOfWeek,
        session: s.session,
        periodNumber: s.periodNumber,
        startMinutes: win.startMinutes,
        endMinutes: win.endMinutes,
        isExternal: false,
      })
    }
  }

  for (const ext of input.externalActiveSlots || []) {
    const { participants } = extractParticipatingTeachers(ext.slot, input.teachersById)
    for (const p of participants) {
      pushOcc({
        teacherId: p.teacherId,
        teacherCode: p.teacherCode,
        teacherName: p.teacherName,
        roleLabel: p.roleLabel,
        weekType: p.effectiveWeekType,
        campusId: ext.campusId,
        campusName: ext.campusName,
        classId: ext.slot.classId,
        className: ext.slot.className,
        dayOfWeek: ext.slot.dayOfWeek,
        session: ext.slot.session,
        periodNumber: ext.slot.periodNumber,
        startMinutes: ext.startMinutes,
        endMinutes: ext.endMinutes,
        isExternal: true,
      })
    }
  }

  for (const [, list] of occByTeacherDay) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]
        const b = list[j]
        if (a.isExternal && b.isExternal) continue
        if (!doWeekTypesOverlap(a.weekType, b.weekType)) continue

        const timeOverlaps = a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes
        if (timeOverlaps) {
          const local = a.isExternal ? b : a
          const other = a.isExternal ? a : b
          const crossScopeNote =
            a.campusId !== b.campusId
              ? ` [Liên cơ sở: ${other.campusName}]`
              : other.isExternal
              ? ` [Liên cấp tại ${other.campusName}]`
              : ""

          rule1Issues.push({
            ruleCode: "R01_TEACHER_CONFLICT",
            severity: "ERROR",
            message: `Trùng lịch GV ${local.teacherName} (${local.teacherCode}, ${local.roleLabel}): Lớp ${local.className} và Lớp ${other.className}${crossScopeNote} vào ${SHORT_DAY_LABELS[local.dayOfWeek] || local.dayOfWeek} (${local.session === "MORNING" ? "Sáng" : "Chiều"} Tiết ${local.periodNumber}).`,
            classId: local.classId,
            className: local.className,
            teacherId: local.teacherId,
            teacherCode: local.teacherCode,
            teacherName: local.teacherName,
            dayOfWeek: local.dayOfWeek,
            session: local.session,
            periodNumber: local.periodNumber,
            conflictingCampusId: other.campusId,
            conflictingClassName: other.className,
          })
        }
      }
    }
  }

  const r1ErrorCount = rule1Issues.filter((i) => i.severity === "ERROR").length
  const r1Status: RuleStatus =
    r1ErrorCount > 0
      ? "VIOLATED"
      : hasUnmappedTeacher || activeSlots.length === 0
      ? "INSUFFICIENT_DATA"
      : "PASSED"

  const rule1 = makeRuleResult(
    "R01_TEACHER_CONFLICT",
    "Không trùng lịch giáo viên toàn hệ thống (GV chính, đồng giảng, trợ giảng, luân phiên)",
    r1Status,
    r1ErrorCount > 0
      ? `Phát hiện ${r1ErrorCount} xung đột giờ dạy giáo viên.`
      : hasUnmappedTeacher
      ? "Có tiết học chưa gắn mã giáo viên định danh để đối chiếu toàn hệ thống."
      : activeSlots.length === 0
      ? "Chưa có tiết xếp lịch để kiểm tra."
      : "Không có xung đột lịch giáo viên nội bộ, liên cấp và liên cơ sở.",
    rule1Issues
  )

  // =========================================================================
  // RULE 2: Thời gian di chuyển liên cơ sở theo giờ thực tế
  // =========================================================================
  const rule2Issues: ValidationIssue[] = []
  const travelMap = new Map<string, TravelRuleInput>()
  for (const tr of input.travelRules || []) {
    travelMap.set(`${tr.fromCampusId}::${tr.toCampusId}`, tr)
  }

  let crossCampusPairChecked = 0
  for (const [, list] of occByTeacherDay) {
    const distinctCampuses = new Set(list.map((o) => o.campusId))
    if (distinctCampuses.size <= 1) continue

    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]
        const b = list[j]
        if (a.campusId === b.campusId) continue
        if (a.isExternal && b.isExternal) continue
        if (!doWeekTypesOverlap(a.weekType, b.weekType)) continue

        crossCampusPairChecked++
        const first = a.startMinutes <= b.startMinutes ? a : b
        const second = first === a ? b : a
        const rule =
          travelMap.get(`${first.campusId}::${second.campusId}`) ||
          travelMap.get(`${second.campusId}::${first.campusId}`) || {
            fromCampusId: first.campusId,
            toCampusId: second.campusId,
            minTravelMinutes: 40,
            allowSameSession: false,
            allowSameDay: true,
          }

        if (!rule.allowSameDay) {
          rule2Issues.push({
            ruleCode: "R02_CAMPUS_TRAVEL",
            severity: "ERROR",
            message: `GV ${first.teacherName} (${first.teacherCode}) dạy 2 cơ sở (${first.campusName} -> ${second.campusName}) trong cùng ${SHORT_DAY_LABELS[first.dayOfWeek] || first.dayOfWeek}, vi phạm quy định không di chuyển trong ngày.`,
            teacherId: first.teacherId,
            teacherCode: first.teacherCode,
            teacherName: first.teacherName,
            dayOfWeek: first.dayOfWeek,
          })
          continue
        }

        if (!rule.allowSameSession && first.session === second.session) {
          rule2Issues.push({
            ruleCode: "R02_CAMPUS_TRAVEL",
            severity: "ERROR",
            message: `GV ${first.teacherName} (${first.teacherCode}) dạy liên cơ sở trong cùng buổi ${first.session === "MORNING" ? "Sáng" : "Chiều"} ${SHORT_DAY_LABELS[first.dayOfWeek] || first.dayOfWeek} (Lớp ${first.className} -> Lớp ${second.className}).`,
            teacherId: first.teacherId,
            teacherCode: first.teacherCode,
            teacherName: first.teacherName,
            dayOfWeek: first.dayOfWeek,
            session: first.session,
          })
          continue
        }

        const gapMinutes = second.startMinutes - first.endMinutes
        if (gapMinutes >= 0 && gapMinutes < rule.minTravelMinutes) {
          rule2Issues.push({
            ruleCode: "R02_CAMPUS_TRAVEL",
            severity: "ERROR",
            message: `GV ${first.teacherName} (${first.teacherCode}) chỉ có ${gapMinutes} phút di chuyển giữa ${first.campusName} và ${second.campusName} vào ${SHORT_DAY_LABELS[first.dayOfWeek] || first.dayOfWeek} (yêu cầu tối thiểu ${rule.minTravelMinutes} phút).`,
            teacherId: first.teacherId,
            teacherCode: first.teacherCode,
            teacherName: first.teacherName,
            dayOfWeek: first.dayOfWeek,
          })
        }
      }
    }
  }

  const rule2 = makeRuleResult(
    "R02_CAMPUS_TRAVEL",
    "Đảm bảo thời gian di chuyển giữa các cơ sở",
    rule2Issues.length > 0
      ? "VIOLATED"
      : crossCampusPairChecked === 0
      ? "NOT_APPLICABLE"
      : "PASSED",
    rule2Issues.length > 0
      ? `Phát hiện ${rule2Issues.length} vi phạm thời gian di chuyển liên cơ sở.`
      : crossCampusPairChecked === 0
      ? "Không có giáo viên dạy liên cơ sở trong cùng ngày ở phạm vi đang kiểm tra."
      : `Tất cả ${crossCampusPairChecked} cặp ca dạy liên cơ sở đều đủ thời gian di chuyển.`,
    rule2Issues
  )

  // =========================================================================
  // RULE 3: Không trùng ô tiết của lớp học
  // =========================================================================
  const rule3Issues: ValidationIssue[] = []
  const classCellMap = new Map<string, SlotRecord[]>()
  for (const s of activeSlots) {
    const key = `${s.classId}::${s.dayOfWeek}::${s.session}::${s.periodNumber}`
    const arr = classCellMap.get(key) || []
    arr.push(s)
    classCellMap.set(key, arr)
  }

  for (const [, arr] of classCellMap) {
    if (arr.length <= 1) continue
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        if (doWeekTypesOverlap(arr[i].weekType, arr[j].weekType)) {
          rule3Issues.push({
            ruleCode: "R03_CLASS_CONFLICT",
            severity: "ERROR",
            message: `Lớp ${arr[i].className} bị xếp chồng ${arr.length} hoạt động tại ${SHORT_DAY_LABELS[arr[i].dayOfWeek] || arr[i].dayOfWeek} (${arr[i].session === "MORNING" ? "Sáng" : "Chiều"} Tiết ${arr[i].periodNumber}).`,
            classId: arr[i].classId,
            className: arr[i].className,
            dayOfWeek: arr[i].dayOfWeek,
            session: arr[i].session,
            periodNumber: arr[i].periodNumber,
          })
        }
      }
    }
  }

  const rule3 = makeRuleResult(
    "R03_CLASS_CONFLICT",
    "Không trùng tiết của cùng lớp / nhóm học sinh",
    rule3Issues.length > 0 ? "VIOLATED" : activeSlots.length === 0 ? "INSUFFICIENT_DATA" : "PASSED",
    rule3Issues.length > 0
      ? `Phát hiện ${rule3Issues.length} ô tiết bị xếp trùng trên cùng lớp.`
      : activeSlots.length === 0
      ? "Chưa có tiết xếp lịch để kiểm tra."
      : "Mỗi ô tiết của lớp chỉ có duy nhất 1 hoạt động hiệu lực.",
    rule3Issues
  )

  // =========================================================================
  // RULE 4: Phòng học & Phòng chức năng (không trùng phòng + phù hợp môn học)
  // =========================================================================
  const rule4Issues: ValidationIssue[] = []
  const roomById = new Map<string, RoomInput>()
  for (const r of input.rooms || []) {
    roomById.set(r.id, r)
  }

  const slotsWithRooms = activeSlots.filter((s) => s.roomId || s.roomCode)
  const roomCellMap = new Map<string, SlotRecord[]>()
  for (const s of slotsWithRooms) {
    const rKey = s.roomId || s.roomCode || ""
    const cellKey = `${rKey}::${s.dayOfWeek}::${s.session}::${s.periodNumber}`
    const list = roomCellMap.get(cellKey) || []
    list.push(s)
    roomCellMap.set(cellKey, list)

    if (s.roomId && roomById.has(s.roomId)) {
      const room = roomById.get(s.roomId)!
      if (
        room.allowedSubjectIds.length > 0 &&
        s.subjectId &&
        !room.allowedSubjectIds.includes(s.subjectId)
      ) {
        rule4Issues.push({
          ruleCode: "R04_ROOM_CONFLICT_AND_FIT",
          severity: "ERROR",
          message: `Phòng chức năng ${room.roomName} (${room.roomCode}) không cấu hình cho môn ${s.subjectName || s.subjectId} (Lớp ${s.className}).`,
          classId: s.classId,
          className: s.className,
          roomId: room.id,
          roomCode: room.roomCode,
          dayOfWeek: s.dayOfWeek,
          session: s.session,
          periodNumber: s.periodNumber,
        })
      }
    }
  }

  for (const [, arr] of roomCellMap) {
    if (arr.length <= 1) continue
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        if (arr[i].classId !== arr[j].classId && doWeekTypesOverlap(arr[i].weekType, arr[j].weekType)) {
          rule4Issues.push({
            ruleCode: "R04_ROOM_CONFLICT_AND_FIT",
            severity: "ERROR",
            message: `Trùng phòng ${arr[i].roomName || arr[i].roomCode} giữa Lớp ${arr[i].className} và Lớp ${arr[j].className} vào ${SHORT_DAY_LABELS[arr[i].dayOfWeek] || arr[i].dayOfWeek} (${arr[i].session === "MORNING" ? "Sáng" : "Chiều"} Tiết ${arr[i].periodNumber}).`,
            classId: arr[i].classId,
            className: arr[i].className,
            roomId: arr[i].roomId || undefined,
            roomCode: arr[i].roomCode || undefined,
            dayOfWeek: arr[i].dayOfWeek,
            session: arr[i].session,
            periodNumber: arr[i].periodNumber,
          })
        }
      }
    }
  }

  const rule4 = makeRuleResult(
    "R04_ROOM_CONFLICT_AND_FIT",
    "Không trùng phòng học và đúng loại phòng chức năng",
    rule4Issues.length > 0
      ? "VIOLATED"
      : (input.rooms?.length || 0) === 0 && slotsWithRooms.length === 0
      ? "NOT_APPLICABLE"
      : "PASSED",
    rule4Issues.length > 0
      ? `Phát hiện ${rule4Issues.length} xung đột hoặc sai loại phòng học.`
      : (input.rooms?.length || 0) === 0 && slotsWithRooms.length === 0
      ? "Chưa gán phòng chức năng cho các tiết trong phạm vi này."
      : "Phân bổ phòng học và phòng chức năng hợp lệ.",
    rule4Issues
  )

  // =========================================================================
  // RULE 5: Đủ định mức số tiết theo tuần / chu kỳ và đủ phân công giáo viên
  // =========================================================================
  const rule5Issues: ValidationIssue[] = []
  let r5Status: RuleStatus = "INSUFFICIENT_DATA"
  let r5Summary = "Chưa có dữ liệu đối chiếu định mức SubjectQuota và phân công."

  if (input.quotaItems && input.quotaItems.length > 0) {
    const missingTeacherItems = input.quotaItems.filter((q) => q.status === "MISSING_TEACHER")
    const underItems = input.quotaItems.filter((q) => q.missingWeeklyPeriods > 0)
    const overItems = input.quotaItems.filter((q) => q.overScheduledWeeklyPeriods > 0)

    for (const m of missingTeacherItems) {
      rule5Issues.push({
        ruleCode: "R05_QUOTA_COMPLETENESS",
        severity: "WARNING",
        message: `Lớp ${m.className} - môn ${m.subjectName}: định mức ${m.weeklyQuota} tiết/tuần nhưng chưa có phân công giáo viên.`,
        classId: m.classId,
        className: m.className,
      })
    }

    for (const u of underItems) {
      rule5Issues.push({
        ruleCode: "R05_QUOTA_COMPLETENESS",
        severity: "ERROR",
        message: `Lớp ${u.className} - môn ${u.subjectName}: thiếu ${u.missingWeeklyPeriods} tiết/tuần (đã xếp ${u.scheduledWeeklyEquivalent}/${u.weeklyQuota} tiết/tuần; chu kỳ ${u.cycleWeeks} tuần cần ${u.cycleQuota} tiết).`,
        classId: u.classId,
        className: u.className,
      })
    }

    for (const o of overItems) {
      rule5Issues.push({
        ruleCode: "R05_QUOTA_COMPLETENESS",
        severity: "ERROR",
        message: `Lớp ${o.className} - môn ${o.subjectName}: vượt ${o.overScheduledWeeklyPeriods} tiết/tuần so với định mức (${o.scheduledWeeklyEquivalent}/${o.weeklyQuota}).`,
        classId: o.classId,
        className: o.className,
      })
    }

    if (underItems.length > 0 || overItems.length > 0) {
      r5Status = "VIOLATED"
      r5Summary = `Còn ${underItems.length} môn-lớp thiếu tiết và ${overItems.length} môn-lớp vượt định mức.`
    } else if (missingTeacherItems.length > 0) {
      r5Status = "INSUFFICIENT_DATA"
      r5Summary = `Có ${missingTeacherItems.length} môn-lớp thiếu dữ liệu phân công giáo viên.`
    } else {
      r5Status = "PASSED"
      r5Summary = `Tất cả ${input.quotaItems.length} môn-lớp đạt đúng định mức tiết/tuần và chu kỳ.`
    }
  }

  const rule5 = makeRuleResult(
    "R05_QUOTA_COMPLETENESS",
    "Đủ số tiết theo định mức SubjectQuota và chu kỳ tuần",
    r5Status,
    r5Summary,
    rule5Issues
  )

  // =========================================================================
  // RULE 6: Lịch bận của giáo viên, lớp, phòng
  // =========================================================================
  const rule6Issues: ValidationIssue[] = []
  const busyList = input.busySlots || []
  for (const bs of busyList) {
    for (const s of activeSlots) {
      if (s.dayOfWeek !== bs.dayOfWeek) continue
      if (s.session !== bs.session || Number(s.periodNumber) !== Number(bs.periodNumber)) continue
      if (!doWeekTypesOverlap(s.weekType, bs.weekType)) continue

      if (bs.targetType === "TEACHER") {
        const { participants } = extractParticipatingTeachers(s, input.teachersById)
        const hit = participants.find((p) => p.teacherId === bs.targetId)
        if (hit) {
          rule6Issues.push({
            ruleCode: "R06_BUSY_SLOTS",
            severity: "ERROR",
            message: `GV ${hit.teacherName} (${hit.teacherCode}) có lịch báo bận vào ${SHORT_DAY_LABELS[s.dayOfWeek] || s.dayOfWeek} (${s.session === "MORNING" ? "Sáng" : "Chiều"} Tiết ${s.periodNumber})${bs.reason ? `: ${bs.reason}` : ""}.`,
            classId: s.classId,
            className: s.className,
            teacherId: hit.teacherId,
            teacherCode: hit.teacherCode,
            teacherName: hit.teacherName,
            dayOfWeek: s.dayOfWeek,
            session: s.session,
            periodNumber: s.periodNumber,
          })
        }
      } else if (bs.targetType === "ROOM" && s.roomId === bs.targetId) {
        rule6Issues.push({
          ruleCode: "R06_BUSY_SLOTS",
          severity: "ERROR",
          message: `Phòng ${s.roomName || s.roomCode} đang khóa lịch bận vào ${SHORT_DAY_LABELS[s.dayOfWeek] || s.dayOfWeek} (${s.session === "MORNING" ? "Sáng" : "Chiều"} Tiết ${s.periodNumber}).`,
          classId: s.classId,
          className: s.className,
          roomId: s.roomId,
          dayOfWeek: s.dayOfWeek,
          session: s.session,
          periodNumber: s.periodNumber,
        })
      } else if (bs.targetType === "CLASS" && s.classId === bs.targetId) {
        rule6Issues.push({
          ruleCode: "R06_BUSY_SLOTS",
          severity: "ERROR",
          message: `Lớp ${s.className} đang có lịch bận vào ${SHORT_DAY_LABELS[s.dayOfWeek] || s.dayOfWeek} (${s.session === "MORNING" ? "Sáng" : "Chiều"} Tiết ${s.periodNumber}).`,
          classId: s.classId,
          className: s.className,
          dayOfWeek: s.dayOfWeek,
          session: s.session,
          periodNumber: s.periodNumber,
        })
      }
    }
  }

  const rule6 = makeRuleResult(
    "R06_BUSY_SLOTS",
    "Tuân thủ lịch bận của giáo viên, phòng học và lớp học",
    rule6Issues.length > 0 ? "VIOLATED" : busyList.length === 0 ? "NOT_APPLICABLE" : "PASSED",
    rule6Issues.length > 0
      ? `Phát hiện ${rule6Issues.length} tiết xếp vào khung giờ báo bận.`
      : busyList.length === 0
      ? "Chưa khai báo ràng buộc lịch bận cho phạm vi này."
      : `Đã kiểm tra ${busyList.length} khung giờ bận — không có vi phạm.`,
    rule6Issues
  )

  // =========================================================================
  // RULE 7: Tiết cố định theo cấu hình (không hardcode Thứ Hai Tiết 1)
  // =========================================================================
  const rule7Issues: ValidationIssue[] = []
  const fixedRules = input.config.fixedSlots || []
  for (const fr of fixedRules) {
    for (const cls of input.classes) {
      if (fr.appliesToGrades && fr.appliesToGrades.length > 0) {
        if (!fr.appliesToGrades.includes(cls.grade)) continue
      }
      const match = activeSlots.find(
        (s) =>
          s.classId === cls.id &&
          s.dayOfWeek === fr.dayOfWeek &&
          s.session === fr.session &&
          Number(s.periodNumber) === Number(fr.periodNumber)
      )
      const matchesSubject =
        match &&
        ((fr.subjectId && match.subjectId === fr.subjectId) ||
          (fr.subjectName &&
            String(match.subjectName || "").trim().toUpperCase() ===
              fr.subjectName.trim().toUpperCase()))

      if (!matchesSubject) {
        rule7Issues.push({
          ruleCode: "R07_FIXED_SLOTS",
          severity: "ERROR",
          message: `Lớp ${cls.className}: thiếu tiết cố định "${fr.subjectName}" tại ${SHORT_DAY_LABELS[fr.dayOfWeek] || fr.dayOfWeek} (${fr.session === "MORNING" ? "Sáng" : "Chiều"} Tiết ${fr.periodNumber}).`,
          classId: cls.id,
          className: cls.className,
          dayOfWeek: fr.dayOfWeek,
          session: fr.session,
          periodNumber: fr.periodNumber,
        })
      }
    }
  }

  const rule7 = makeRuleResult(
    "R07_FIXED_SLOTS",
    "Đúng vị trí các tiết cố định theo cấu hình",
    rule7Issues.length > 0 ? "VIOLATED" : fixedRules.length === 0 ? "NOT_APPLICABLE" : "PASSED",
    rule7Issues.length > 0
      ? `Phát hiện ${rule7Issues.length} ô tiết cố định chưa đúng cấu hình.`
      : fixedRules.length === 0
      ? "Chưa cấu hình tiết cố định bắt buộc cho phạm vi này."
      : "Tất cả tiết cố định đều khớp cấu hình.",
    rule7Issues
  )

  // =========================================================================
  // RULE 8: Khối tiết liên tiếp (tiết đôi / block cùng buổi)
  // =========================================================================
  const rule8Issues: ValidationIssue[] = []
  const blockRules = input.config.blockRules || []
  for (const br of blockRules) {
    for (const cls of input.classes) {
      if (br.appliesToGrades && br.appliesToGrades.length > 0 && !br.appliesToGrades.includes(cls.grade)) {
        continue
      }
      const clsSubSlots = activeSlots.filter(
        (s) =>
          s.classId === cls.id &&
          ((br.subjectId && s.subjectId === br.subjectId) ||
            (br.subjectName &&
              String(s.subjectName || "").toUpperCase() === br.subjectName.toUpperCase()))
      )
      if (clsSubSlots.length < br.minConsecutive) continue

      // Group by dayOfWeek + session
      const byDaySession = new Map<string, number[]>()
      for (const s of clsSubSlots) {
        const key = br.requireSameSession ? `${s.dayOfWeek}::${s.session}` : s.dayOfWeek
        const list = byDaySession.get(key) || []
        list.push(Number(s.periodNumber))
        byDaySession.set(key, list)
      }

      let hasValidBlock = false
      for (const [, periods] of byDaySession) {
        periods.sort((a, b) => a - b)
        let streak = 1
        for (let k = 1; k < periods.length; k++) {
          if (periods[k] === periods[k - 1] + 1) {
            streak++
            if (streak >= br.minConsecutive && streak <= br.maxConsecutive) {
              hasValidBlock = true
            }
          } else {
            streak = 1
          }
        }
      }

      if (!hasValidBlock) {
        rule8Issues.push({
          ruleCode: "R08_BLOCK_RULES",
          severity: "ERROR",
          message: `Lớp ${cls.className} - môn ${br.subjectName || br.subjectCode}: yêu cầu khối ${br.minConsecutive} tiết liên tiếp${br.requireSameSession ? " trong cùng buổi" : ""} nhưng đang xếp rời rạc.`,
          classId: cls.id,
          className: cls.className,
        })
      }
    }
  }

  const rule8 = makeRuleResult(
    "R08_BLOCK_RULES",
    "Cấu trúc khối tiết liên tiếp (tiết đôi cùng buổi)",
    rule8Issues.length > 0 ? "VIOLATED" : blockRules.length === 0 ? "NOT_APPLICABLE" : "PASSED",
    rule8Issues.length > 0
      ? `Phát hiện ${rule8Issues.length} vi phạm cấu trúc khối tiết.`
      : blockRules.length === 0
      ? "Chưa cấu hình ràng buộc khối tiết liên tiếp."
      : "Tất cả khối tiết đều đúng cấu trúc và cùng buổi.",
    rule8Issues
  )

  // =========================================================================
  // RULE 9: Giới hạn số tiết tối đa/ngày của môn học và giáo viên
  // =========================================================================
  const rule9Issues: ValidationIssue[] = []
  const maxSubPerDay = input.config.limitsAndPriorities?.maxPeriodsPerDayPerSubject || 2
  const maxTeacherConsecutive =
    input.config.limitsAndPriorities?.maxConsecutivePeriodsPerTeacher || 4
  const maxTeacherPerDay = input.config.limitsAndPriorities?.maxPeriodsPerDayPerTeacher || 7

  // Check subject per class per day
  const subDayCount = new Map<string, { count: number; clsName: string; subName: string; day: string }>()
  for (const s of activeSlots) {
    if (!s.subjectId && !s.subjectName) continue
    const subKey = s.subjectId || s.subjectName!
    const key = `${s.classId}::${subKey}::${s.dayOfWeek}`
    const weight = String(s.weekType || "ALL").toUpperCase() === "ALL" ? 1 : 0.5
    const cur = subDayCount.get(key) || {
      count: 0,
      clsName: s.className,
      subName: s.subjectName || subKey,
      day: s.dayOfWeek,
    }
    cur.count += weight
    subDayCount.set(key, cur)
  }

  for (const [, v] of subDayCount) {
    if (v.count > maxSubPerDay) {
      rule9Issues.push({
        ruleCode: "R09_DAILY_AND_CONSECUTIVE_LIMITS",
        severity: "WARNING",
        message: `Lớp ${v.clsName}: môn ${v.subName} xếp ${v.count} tiết trong ${SHORT_DAY_LABELS[v.day] || v.day} (vượt ngưỡng khuyến nghị ${maxSubPerDay} tiết/ngày).`,
        className: v.clsName,
        dayOfWeek: v.day,
      })
    }
  }

  for (const [, list] of occByTeacherDay) {
    const localInvolved = list.some((o) => !o.isExternal)
    if (!localInvolved) continue
    if (list.length > maxTeacherPerDay) {
      const sample = list[0]
      rule9Issues.push({
        ruleCode: "R09_DAILY_AND_CONSECUTIVE_LIMITS",
        severity: "WARNING",
        message: `GV ${sample.teacherName} (${sample.teacherCode}) có ${list.length} tiết trong ${SHORT_DAY_LABELS[sample.dayOfWeek] || sample.dayOfWeek} (vượt giới hạn ${maxTeacherPerDay} tiết/ngày).`,
        teacherId: sample.teacherId,
        teacherCode: sample.teacherCode,
        teacherName: sample.teacherName,
        dayOfWeek: sample.dayOfWeek,
      })
    }

    // Check consecutive within same session
    for (const sess of ["MORNING", "AFTERNOON"]) {
      const pNums = Array.from(
        new Set(list.filter((o) => o.session === sess).map((o) => o.periodNumber))
      ).sort((a, b) => a - b)
      let streak = 1
      for (let k = 1; k < pNums.length; k++) {
        if (pNums[k] === pNums[k - 1] + 1) {
          streak++
          if (streak > maxTeacherConsecutive) {
            const sample = list[0]
            rule9Issues.push({
              ruleCode: "R09_DAILY_AND_CONSECUTIVE_LIMITS",
              severity: "WARNING",
              message: `GV ${sample.teacherName} (${sample.teacherCode}) dạy quá ${maxTeacherConsecutive} tiết liên tiếp vào buổi ${sess === "MORNING" ? "Sáng" : "Chiều"} ${SHORT_DAY_LABELS[sample.dayOfWeek] || sample.dayOfWeek}.`,
              teacherId: sample.teacherId,
              teacherCode: sample.teacherCode,
              teacherName: sample.teacherName,
              dayOfWeek: sample.dayOfWeek,
              session: sess,
            })
            break
          }
        } else {
          streak = 1
        }
      }
    }
  }

  const rule9 = makeRuleResult(
    "R09_DAILY_AND_CONSECUTIVE_LIMITS",
    "Giới hạn số tiết/ngày và số tiết dạy liên tiếp",
    rule9Issues.length > 0 ? "VIOLATED" : activeSlots.length === 0 ? "INSUFFICIENT_DATA" : "PASSED",
    rule9Issues.length > 0
      ? `Có ${rule9Issues.length} cảnh báo vượt giới hạn tiết/ngày hoặc tiết liên tiếp.`
      : activeSlots.length === 0
      ? "Chưa có tiết xếp lịch để kiểm tra."
      : "Tải giảng dạy trong ngày và theo buổi nằm trong ngưỡng cấu hình.",
    rule9Issues
  )

  // =========================================================================
  // RULE 10: Nằm trong khung ngày học & khung tiết Sáng/Chiều đã cấu hình
  // =========================================================================
  const rule10Issues: ValidationIssue[] = []
  const allowedDays = new Set<string>(input.config.workingDays || [])
  const maxMorning = input.config.morningPeriods || 4
  const maxAfternoon = input.config.afternoonPeriods ?? 4

  for (const s of activeSlots) {
    if (!allowedDays.has(s.dayOfWeek)) {
      rule10Issues.push({
        ruleCode: "R10_FRAME_BOUNDARY",
        severity: "ERROR",
        message: `Lớp ${s.className}: tiết ${s.subjectName || ""} nằm ở ${SHORT_DAY_LABELS[s.dayOfWeek] || s.dayOfWeek} ngoài khung ngày học đã cấu hình.`,
        classId: s.classId,
        className: s.className,
        dayOfWeek: s.dayOfWeek,
        session: s.session,
        periodNumber: s.periodNumber,
      })
    }
    const maxP = s.session === "MORNING" ? maxMorning : maxAfternoon
    if (Number(s.periodNumber) < 1 || Number(s.periodNumber) > maxP) {
      rule10Issues.push({
        ruleCode: "R10_FRAME_BOUNDARY",
        severity: "ERROR",
        message: `Lớp ${s.className}: ${s.session === "MORNING" ? "Sáng" : "Chiều"} Tiết ${s.periodNumber} vượt ngoài khung cấu hình (${maxMorning} tiết sáng, ${maxAfternoon} tiết chiều).`,
        classId: s.classId,
        className: s.className,
        dayOfWeek: s.dayOfWeek,
        session: s.session,
        periodNumber: s.periodNumber,
      })
    }
  }

  const rule10 = makeRuleResult(
    "R10_FRAME_BOUNDARY",
    "Tuân thủ khung ngày học và số tiết Sáng/Chiều theo cấu hình",
    rule10Issues.length > 0 ? "VIOLATED" : activeSlots.length === 0 ? "INSUFFICIENT_DATA" : "PASSED",
    rule10Issues.length > 0
      ? `Phát hiện ${rule10Issues.length} tiết nằm ngoài khung giờ cấu hình.`
      : activeSlots.length === 0
      ? "Chưa có tiết xếp lịch để kiểm tra."
      : `Tất cả tiết nằm gọn trong khung ${maxMorning} tiết sáng, ${maxAfternoon} tiết chiều.`,
    rule10Issues
  )

  const rules = [rule1, rule2, rule3, rule4, rule5, rule6, rule7, rule8, rule9, rule10]
  const allIssues = rules.flatMap((r) => r.issues)
  const hasHardViolations = allIssues.some((i) => i.severity === "ERROR")
  const hasInsufficientData = rules.some((r) => r.status === "INSUFFICIENT_DATA")

  return {
    canPublish: !hasHardViolations && !hasInsufficientData && activeSlots.length > 0,
    hasHardViolations,
    hasInsufficientData,
    checkedAt: new Date().toISOString(),
    rules,
    allIssues,
  }
}
