import {
  ComplianceStatusItem,
  LinkedCoachingSummary,
  MonthlyObservationSummary,
  MonthlyTeacherObservationRow,
  ObservationDetailItem,
  ObservationRecordState,
  TeachingPeriodSource,
} from "./types"

export interface EngineTeacherInput {
  id: string
  teacherCode: string
  teacherName: string
  position: string | null
  positions?: string | null
  campusId: string
  campusName: string
  departmentId: string | null
  departmentName: string
  departmentBlockCM?: string | null
  divisionCodes?: string[]
  joinDate?: Date | string | null
  joinYear?: number | null
}

export interface EngineTargetInput {
  teacherId: string
  observerType: string | null
  observeeType: string | null
  requiredObserved: number
  observedUnit: string
  requiredTaught: number
  taughtUnit: string
  confirmed?: boolean
}

export interface EngineEvaluationInput {
  id: string
  registrationId: string
  slotId: string
  evaluatorId: string
  overallRating: string | null
  totalScore: number | null
  strengths: string | null
  improvements: string | null
  generalComment: string | null
  submittedAt: Date | string | null
  reEvaluationStatus: string | null
  isSupplemental: boolean
  supplementalStatus: string | null
  supplementalReviewedAt: Date | string | null
}

export interface EngineRegistrationInput {
  id: string
  slotId: string
  teacherId: string
  teacherName?: string | null
  isApproved: boolean
  approvedAt: Date | string | null
  evaluation: EngineEvaluationInput | null
}

export interface EngineObservationSlotInput {
  id: string
  teacherId: string
  teacherName?: string | null
  subjectName: string
  level: string
  grade: string
  className: string | null
  campusId: string | null
  campusName: string | null
  topic: string
  date: Date | string
  startTime: string
  endTime: string
  isDoublePeriod: boolean
  status: string
  requestOrigin: string | null
  registrations: EngineRegistrationInput[]
}

export interface EngineTimetableSlotInput {
  teacherId: string | null
  coTeacherId?: string | null
  altTeacherId?: string | null
  dayOfWeek: string
  weekType: string // ALL | EVEN | ODD
  level?: string | null
}

export interface EngineTeachingLogInput {
  teacherId: string
  lessonDate: Date | string | null
  periods?: number
}

const VN_OFFSET_MS = 7 * 60 * 60 * 1000

/**
 * Extracts YYYY-MM in Vietnam timezone (UTC+7) so that a lesson on e.g. 28/11
 * is always attributed to month 11 regardless of UTC midnight shift or approval date.
 */
export function getVietnamMonthKey(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return ""
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (Number.isNaN(d.getTime())) return ""
  const vn = new Date(d.getTime() + VN_OFFSET_MS)
  const yyyy = vn.getUTCFullYear()
  const mm = String(vn.getUTCMonth() + 1).padStart(2, "0")
  return `${yyyy}-${mm}`
}

export function getCurrentVietnamMonthKey(now: Date = new Date()): string {
  return getVietnamMonthKey(now)
}

export function formatVietnamDate(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return "—"
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (Number.isNaN(d.getTime())) return "—"
  const vn = new Date(d.getTime() + VN_OFFSET_MS)
  const dd = String(vn.getUTCDate()).padStart(2, "0")
  const mm = String(vn.getUTCMonth() + 1).padStart(2, "0")
  const yyyy = vn.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}

export function formatMonthLabelVi(monthKey: string): string {
  const m = monthKey.match(/^(\d{4})-(\d{2})$/)
  if (!m) return monthKey
  return `Tháng ${Number(m[2])}/${m[1]}`
}

export function normalizeLevelCategory(rawLevel?: string | null, blockCM?: string | null): string {
  const s = String(rawLevel || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
  const b = String(blockCM || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

  if (s.includes("mam non") || s === "mn" || b.includes("mam non")) return "MAM_NON"
  if (s.includes("tieu hoc") || s === "th" || s === "primary") return "TIEU_HOC"
  if (s.includes("thcs") || s.includes("trung hoc co so")) return "THCS"
  if (s.includes("thpt") || s.includes("trung hoc pho thong")) return "THPT"
  if (s.includes("song ngu") || s.includes("esl") || s.includes("gvnn") || s.includes("quoc te")) {
    return "SONG_NGU"
  }
  return "PHO_THONG"
}

export function mapDivisionCodeToLevel(code: string): string | null {
  const c = String(code || "").toUpperCase().trim()
  if (c === "MN" || c === "MAM_NON") return "Mầm non"
  if (c === "TH" || c === "TIEU_HOC") return "Tiểu học"
  if (c === "THCS") return "THCS"
  if (c === "THPT") return "THPT"
  if (c === "ESL" || c === "CTQT" || c === "SONG_NGU") return "Tiếng Anh – Song ngữ"
  return null
}

export function parsePositions(position: string | null, positionsJson?: string | null): string[] {
  const set = new Set<string>()
  if (position && position.trim()) set.add(position.trim())
  if (positionsJson) {
    try {
      const parsed = JSON.parse(positionsJson)
      if (Array.isArray(parsed)) {
        for (const p of parsed) {
          if (typeof p === "string" && p.trim()) set.add(p.trim())
        }
      }
    } catch {
      positionsJson
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((p) => set.add(p))
    }
  }
  if (set.size === 0) set.add("GV")
  return Array.from(set)
}

/**
 * Computes Sky-Line seniority label strictly per spec:
 * - Full joinDate -> exact completed years & months relative to referenceDate
 *   (academicYear.endDate for ended years, today for active years). Preserved across campus transfers.
 * - Year-only joinYear -> "Từ năm YYYY"
 * - Missing info -> "Chưa cập nhật"
 */
export function formatSkyLineSeniority(
  joinDate: Date | string | null | undefined,
  observerType?: string | null,
  referenceDate: Date = new Date(),
  joinYear?: number | null
): { label: string; isNewTeacher: boolean } {
  if (joinDate) {
    const start = joinDate instanceof Date ? joinDate : new Date(joinDate)
    if (!Number.isNaN(start.getTime())) {
      const ref = referenceDate
      let totalMonths =
        (ref.getFullYear() - start.getFullYear()) * 12 + (ref.getMonth() - start.getMonth())
      if (ref.getDate() < start.getDate()) totalMonths -= 1
      if (totalMonths < 0) totalMonths = 0

      const years = Math.floor(totalMonths / 12)
      const months = totalMonths % 12
      const isNewTeacher = totalMonths < 12

      if (years > 0 && months > 0) {
        return { label: `${years} năm ${months} tháng`, isNewTeacher }
      }
      if (years > 0) {
        return { label: `${years} năm`, isNewTeacher }
      }
      if (months > 0) {
        return { label: `${months} tháng`, isNewTeacher: true }
      }
      return { label: "< 1 tháng", isNewTeacher: true }
    }
  }

  if (joinYear && Number.isFinite(joinYear) && joinYear >= 1990 && joinYear <= 2100) {
    const refYear = referenceDate.getFullYear()
    return {
      label: `Từ năm ${joinYear}`,
      isNewTeacher: refYear - joinYear < 1,
    }
  }

  const obs = (observerType || "").trim().toLowerCase()
  const isNewTeacher = obs.includes("mới") || obs.includes("moi")
  return { label: "Chưa cập nhật", isNewTeacher }
}

/**
 * Resolves applicable Sky-Line observation quotas shared with the Observation module
 * (QĐ 06/2026/QĐ-SKL). When a teacher group has no configured target in the Observation
 * module, returns hasConfiguredObservedQuota = false so UI displays "Chưa có định mức".
 */
export function resolveTeacherQuotas(
  _teacher: EngineTeacherInput,
  target: EngineTargetInput | undefined,
  _isNewTeacher: boolean
): {
  requiredObserved: number
  observedUnit: string
  requiredTaught: number
  taughtUnit: string
  hasConfiguredObservedQuota: boolean
} {
  if (target && (target.requiredObserved > 0 || target.confirmed)) {
    return {
      requiredObserved: target.requiredObserved || 0,
      observedUnit: target.observedUnit || "tháng",
      requiredTaught: target.requiredTaught || 0,
      taughtUnit: target.taughtUnit || "tháng",
      hasConfiguredObservedQuota: target.requiredObserved > 0 || Boolean(target.confirmed),
    }
  }

  return {
    requiredObserved: 0,
    observedUnit: "tháng",
    requiredTaught: target?.requiredTaught || 0,
    taughtUnit: target?.taughtUnit || "tháng",
    hasConfiguredObservedQuota: false,
  }
}

/**
 * Evaluates whether an observation evaluation's rating/score meets Sky-Line teaching standard.
 */
export function isEvaluationPassing(
  overallRating: string | null | undefined,
  totalScore: number | null | undefined
): boolean | null {
  const rating = (overallRating || "").trim()
  if (rating) {
    const norm = rating.toLowerCase()
    if (norm.includes("không xếp loại") || norm.includes("chưa xếp loại")) {
      return null
    }
    const failKeywords = [
      "chưa đạt",
      "không đạt",
      "trung bình",
      "yếu",
      "kém",
      "cần cố gắng",
      "needs improvement",
      "developing",
      "unsatisfactory",
      "below",
    ]
    if (failKeywords.some((k) => norm.includes(k))) {
      return false
    }
    const passKeywords = [
      "giỏi",
      "tốt",
      "khá",
      "đạt",
      "xuất sắc",
      "strong practice",
      "effective practice",
      "proficient",
      "exemplary",
    ]
    if (passKeywords.some((k) => norm.includes(k))) {
      return true
    }
  }

  if (totalScore !== null && totalScore !== undefined && !Number.isNaN(totalScore)) {
    return totalScore >= 14
  }
  return null
}

/**
 * Classifies a registration + slot according to Sky-Line observation recognition rules.
 */
export function classifyObservationRecord(
  slot: Pick<EngineObservationSlotInput, "status">,
  reg: Pick<EngineRegistrationInput, "isApproved" | "evaluation"> | null
): {
  state: ObservationRecordState
  label: string
  isCountedOfficial: boolean
  isPendingReview: boolean
} {
  const slotStatus = String(slot.status || "ACTIVE").toUpperCase()

  if (slotStatus === "CANCELLED" || slotStatus === "REJECTED") {
    return {
      state: "CANCELLED_OR_REJECTED",
      label: slotStatus === "CANCELLED" ? "Đã hủy" : "Bị từ chối",
      isCountedOfficial: false,
      isPendingReview: false,
    }
  }

  if (slotStatus === "DRAFT") {
    return {
      state: "DRAFT",
      label: "Bản nháp",
      isCountedOfficial: false,
      isPendingReview: false,
    }
  }

  if (slotStatus === "PENDING_TEACHER_APPROVAL") {
    return {
      state: "PENDING_APPROVAL",
      label: "Chờ GV xác nhận",
      isCountedOfficial: false,
      isPendingReview: true,
    }
  }

  if (!reg) {
    return {
      state: "REGISTERED_NO_EVAL",
      label: "Mới mở / chưa có người dự",
      isCountedOfficial: false,
      isPendingReview: false,
    }
  }

  const ev = reg.evaluation

  if (ev?.supplementalStatus === "REJECTED") {
    return {
      state: "CANCELLED_OR_REJECTED",
      label: "Phiếu bổ sung bị từ chối",
      isCountedOfficial: false,
      isPendingReview: false,
    }
  }

  if (ev?.supplementalStatus === "NEEDS_REVISION") {
    return {
      state: "NEEDS_REVISION",
      label: "Cần chỉnh sửa phiếu",
      isCountedOfficial: false,
      isPendingReview: true,
    }
  }

  if (ev?.reEvaluationStatus === "DRAFT") {
    return {
      state: "DRAFT",
      label: "Phiếu đang lưu nháp",
      isCountedOfficial: false,
      isPendingReview: false,
    }
  }

  if (
    !reg.isApproved ||
    ev?.reEvaluationStatus === "PENDING" ||
    (ev?.isSupplemental && ev?.supplementalStatus === "PENDING")
  ) {
    return {
      state: "PENDING_APPROVAL",
      label: ev
        ? ev.isSupplemental
          ? "Phiếu bổ sung chờ duyệt"
          : ev.reEvaluationStatus === "PENDING"
            ? "Đề nghị đánh giá lại chờ duyệt"
            : "Phiếu đã gửi, chờ duyệt"
        : "Đăng ký chờ duyệt",
      isCountedOfficial: false,
      isPendingReview: true,
    }
  }

  if (!ev) {
    return {
      state: "REGISTERED_NO_EVAL",
      label: "Đã đăng ký, chưa nộp phiếu",
      isCountedOfficial: false,
      isPendingReview: false,
    }
  }

  return {
    state: "OFFICIAL_APPROVED",
    label: "Đã duyệt & ghi nhận",
    isCountedOfficial: true,
    isPendingReview: false,
  }
}

export function resolveObservationSourceRoute(slot: Pick<EngineObservationSlotInput, "level" | "subjectName" | "topic" | "requestOrigin">): string {
  const lvl = String(slot.level || "").toLowerCase()
  if (lvl.includes("mầm non") || lvl.includes("mam non")) {
    return "/admin/du-gio-mam-non"
  }
  const subj = String(slot.subjectName || "").toLowerCase()
  const topic = String(slot.topic || "").toLowerCase()
  if (
    subj.includes("esl") ||
    subj.includes("gvnn") ||
    topic.includes("foreign english") ||
    slot.requestOrigin === "FOREIGN_WALKTHROUGH"
  ) {
    return "/admin/du-gio-gvnn"
  }
  return "/admin/du-gio"
}

/**
 * Evaluates Observing compliance ("Tình trạng đi dự giờ") per QĐ 06/2026/QĐ-SKL:
 * - No configured quota -> "Chưa có định mức"
 * - Quota > 0 & 0 recorded -> "Chưa dự giờ"
 * - Quota > 0 & 0 < recorded < quota -> "Còn thiếu X tiết"
 * - Quota > 0 & recorded >= quota -> "Đủ định mức"
 */
export function evaluateObservingCompliance(
  officialObserved: number,
  requiredObserved: number,
  observedUnit: string,
  hasConfiguredQuota: boolean = requiredObserved > 0
): ComplianceStatusItem {
  if (!hasConfiguredQuota || requiredObserved <= 0) {
    return {
      code: "NO_QUOTA",
      label: "Chưa có định mức",
      tone: "slate",
      detail: "Chưa cấu hình định mức dự giờ tại phân hệ Dự giờ (QĐ 06/2026/QĐ-SKL)",
    }
  }

  const unitLabel = observedUnit || "tháng"
  if (officialObserved === 0) {
    return {
      code: "UNOBSERVED",
      label: "Chưa dự giờ",
      tone: "rose",
      detail: `Định mức ${requiredObserved} tiết/${unitLabel}`,
    }
  }

  if (officialObserved < requiredObserved) {
    const missing = requiredObserved - officialObserved
    return {
      code: "SHORTFALL",
      label: `Còn thiếu ${missing} tiết`,
      tone: "amber",
      detail: `Đã ghi nhận ${officialObserved}/${requiredObserved} tiết/${unitLabel}`,
    }
  }

  return {
    code: "COMPLIANT",
    label: "Đủ định mức",
    tone: "emerald",
    detail: `Đã ghi nhận ${officialObserved}/${requiredObserved} tiết/${unitLabel}`,
  }
}

/**
 * Evaluates Teaching compliance ("Dạy học theo quy định") from source evaluation results
 * and host teaching quota (if applicable).
 */
export function evaluateTeachingCompliance(
  officialTaughtPeriods: number,
  requiredTaught: number,
  taughtUnit: string,
  approvedHostEvals: Array<{ overallRating: string | null; totalScore: number | null }>
): ComplianceStatusItem {
  const evalResults = approvedHostEvals
    .map((ev) => isEvaluationPassing(ev.overallRating, ev.totalScore))
    .filter((v): v is boolean => v !== null)

  const hasFailEval = evalResults.some((v) => v === false)
  const hasPassEval = evalResults.some((v) => v === true)
  const isMonthlyQuota = requiredTaught > 0 && taughtUnit === "tháng"

  if (hasFailEval) {
    const failedCount = evalResults.filter((v) => v === false).length
    return {
      code: "NEEDS_IMPROVEMENT",
      label: "Cần bồi dưỡng",
      tone: "rose",
      detail: `${failedCount} phiếu đánh giá chưa đạt chuẩn`,
    }
  }

  if (isMonthlyQuota && officialTaughtPeriods < requiredTaught) {
    const missing = requiredTaught - officialTaughtPeriods
    return {
      code: officialTaughtPeriods === 0 ? "TAUGHT_UNOBSERVED" : "TAUGHT_SHORTFALL",
      label:
        officialTaughtPeriods === 0
          ? "Chưa có tiết dạy được dự"
          : `Còn thiếu ${missing} tiết dạy`,
      tone: officialTaughtPeriods === 0 ? "rose" : "amber",
      detail: `Định mức ${officialTaughtPeriods}/${requiredTaught} tiết/tháng`,
    }
  }

  if (hasPassEval) {
    return {
      code: "TEACHING_COMPLIANT",
      label: "Đạt quy định",
      tone: "emerald",
      detail: `${evalResults.length} phiếu đánh giá đạt chuẩn`,
    }
  }

  if (officialTaughtPeriods > 0) {
    return {
      code: "OBSERVED_UNRATED",
      label: "Đã dự (chưa xếp loại)",
      tone: "slate",
      detail: `${officialTaughtPeriods} tiết được dự trong tháng`,
    }
  }

  return {
    code: "NO_EVAL_YET",
    label: "Chưa có phiếu đánh giá",
    tone: "slate",
    detail:
      requiredTaught > 0
        ? `Định mức ${requiredTaught} tiết/${taughtUnit}`
        : "Chưa có lượt dự giờ trong tháng",
  }
}

const DAY_NAME_TO_JS_DAY: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  CN: 0,
  T2: 1,
  T3: 2,
  T4: 3,
  T5: 4,
  T6: 5,
  T7: 6,
}

/**
 * Counts how many times each weekday (0..6) occurs in the given YYYY-MM month.
 */
export function countWeekdaysInMonth(year: number, month: number): Record<number, number> {
  const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month - 1, day).getDay()
    counts[dow] = (counts[dow] || 0) + 1
  }
  return counts
}

/**
 * Computes monthly scheduled teaching periods per teacher from active TimetableSlot rows.
 * Handles weekType ("ALL", "EVEN", "ODD") and primary/co/alt teacher slots.
 */
export function computeMonthlyTimetablePeriodsByTeacher(
  timetableSlots: EngineTimetableSlotInput[],
  monthKey: string
): Map<string, { monthlyPeriods: number; weeklyPeriods: number }> {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/)
  const year = match ? Number(match[1]) : new Date().getFullYear()
  const month = match ? Number(match[2]) : new Date().getMonth() + 1
  const weekdayCounts = countWeekdaysInMonth(year, month)

  const acc = new Map<string, { monthlyPeriods: number; weeklyPeriods: number }>()

  const addForTeacher = (teacherId: string | null | undefined, dow: number, weekType: string) => {
    if (!teacherId) return
    const occurrences = weekdayCounts[dow] || 0
    const wt = String(weekType || "ALL").toUpperCase()
    const monthlyIncrement = wt === "EVEN" || wt === "ODD" ? occurrences * 0.5 : occurrences
    const weeklyIncrement = wt === "EVEN" || wt === "ODD" ? 0.5 : 1

    const cur = acc.get(teacherId) || { monthlyPeriods: 0, weeklyPeriods: 0 }
    cur.monthlyPeriods += monthlyIncrement
    cur.weeklyPeriods += weeklyIncrement
    acc.set(teacherId, cur)
  }

  for (const slot of timetableSlots) {
    const dow = DAY_NAME_TO_JS_DAY[String(slot.dayOfWeek || "").toUpperCase().trim()]
    if (dow === undefined) continue
    addForTeacher(slot.teacherId, dow, slot.weekType)
    if (slot.coTeacherId && slot.coTeacherId !== slot.teacherId) {
      addForTeacher(slot.coTeacherId, dow, slot.weekType)
    }
    if (slot.altTeacherId && slot.altTeacherId !== slot.teacherId) {
      addForTeacher(slot.altTeacherId, dow, "ODD")
    }
  }

  for (const [tid, val] of acc.entries()) {
    acc.set(tid, {
      monthlyPeriods: Math.round(val.monthlyPeriods),
      weeklyPeriods: Math.round(val.weeklyPeriods * 10) / 10,
    })
  }

  return acc
}

/**
 * Main pure aggregation function building all rows for the monthly teacher observation table.
 * - Includes EVERY teacher in scope, even those with 0 observation slots in the month.
 * - Attributes slots strictly by actual observation date (slot.date in VN timezone).
 * - Counts host taught-observed periods once per unique slot (multiple observers = 1 taught lesson).
 * - Counts observer periods per approved & evaluated registration.
 * - Tracks pending forms separately.
 */
export function aggregateMonthlyObservationRows(params: {
  monthKey: string
  teachers: EngineTeacherInput[]
  targets: EngineTargetInput[]
  slots: EngineObservationSlotInput[]
  timetableSlots: EngineTimetableSlotInput[]
  teachingLogs: EngineTeachingLogInput[]
  coachingByEvaluationId: Map<string, LinkedCoachingSummary>
  coachingCountByTeacherId: Map<string, number>
  referenceDate?: Date
}): {
  rows: MonthlyTeacherObservationRow[]
  summary: MonthlyObservationSummary
  periodSourceSummary: {
    source: "TEACHING_LOG" | "TIMETABLE" | "MIXED" | "NONE"
    columnHeaderNote: string
  }
} {
  const {
    monthKey,
    teachers,
    targets,
    slots,
    timetableSlots,
    teachingLogs,
    coachingByEvaluationId,
    coachingCountByTeacherId,
    referenceDate = new Date(),
  } = params

  const targetByTeacher = new Map(targets.map((t) => [t.teacherId, t]))
  const teacherNameMap = new Map(teachers.map((t) => [t.id, t.teacherName]))

  // 1. Teaching logs in selected month (if any)
  const teachingLogPeriodsByTeacher = new Map<string, number>()
  for (const log of teachingLogs) {
    if (!log.teacherId || getVietnamMonthKey(log.lessonDate) !== monthKey) continue
    teachingLogPeriodsByTeacher.set(
      log.teacherId,
      (teachingLogPeriodsByTeacher.get(log.teacherId) || 0) + (log.periods || 1)
    )
  }

  // 2. Timetable periods in selected month
  const timetablePeriodsByTeacher = computeMonthlyTimetablePeriodsByTeacher(timetableSlots, monthKey)

  // 3. Filter observation slots strictly by actual observation date (slot.date) in monthKey
  const monthSlots = slots.filter((slot) => getVietnamMonthKey(slot.date) === monthKey)

  // Group slots by host teacher and registrations by observer teacher
  const hostSlotsByTeacher = new Map<string, EngineObservationSlotInput[]>()
  const observerEntriesByTeacher = new Map<
    string,
    Array<{ slot: EngineObservationSlotInput; reg: EngineRegistrationInput }>
  >()

  for (const slot of monthSlots) {
    const hList = hostSlotsByTeacher.get(slot.teacherId) || []
    hList.push(slot)
    hostSlotsByTeacher.set(slot.teacherId, hList)

    for (const reg of slot.registrations || []) {
      const oList = observerEntriesByTeacher.get(reg.teacherId) || []
      oList.push({ slot, reg })
      observerEntriesByTeacher.set(reg.teacherId, oList)
    }
  }

  let logSourceCount = 0
  let timetableSourceCount = 0

  const rows: MonthlyTeacherObservationRow[] = teachers.map((teacher) => {
    const target = targetByTeacher.get(teacher.id)
    const seniority = formatSkyLineSeniority(
      teacher.joinDate,
      target?.observerType,
      referenceDate,
      teacher.joinYear
    )
    const quotas = resolveTeacherQuotas(teacher, target, seniority.isNewTeacher)
    const positions = parsePositions(teacher.position, teacher.positions)

    // Teaching periods in month: prefer Sổ theo dõi giảng dạy, fallback to Thời khóa biểu
    const loggedPeriods = teachingLogPeriodsByTeacher.get(teacher.id) || 0
    const ttInfo = timetablePeriodsByTeacher.get(teacher.id)
    let monthlyTeachingPeriods = 0
    let teachingPeriodSource: TeachingPeriodSource = "NONE"
    let teachingPeriodSourceLabel = "Chưa có dữ liệu TKB"
    let weeklyTimetablePeriods = ttInfo?.weeklyPeriods || 0

    if (loggedPeriods > 0) {
      monthlyTeachingPeriods = loggedPeriods
      teachingPeriodSource = "TEACHING_LOG"
      teachingPeriodSourceLabel = "Sổ theo dõi giảng dạy"
      logSourceCount++
    } else if (ttInfo && ttInfo.monthlyPeriods > 0) {
      monthlyTeachingPeriods = ttInfo.monthlyPeriods
      teachingPeriodSource = "TIMETABLE"
      teachingPeriodSourceLabel = "Số tiết theo TKB"
      timetableSourceCount++
    }

    // Build HOST details (GV dạy được dự)
    // Rule: 1 tiết có nhiều người dự vẫn tính là 1 tiết được dự của GV dạy (dedupe by slot.id)
    const hostSlots = hostSlotsByTeacher.get(teacher.id) || []
    const taughtDetails: ObservationDetailItem[] = []
    const pendingDetails: ObservationDetailItem[] = []
    const countedHostSlotIds = new Set<string>()
    const approvedHostEvals: Array<{ overallRating: string | null; totalScore: number | null }> = []
    let taughtObservedOfficial = 0
    let pendingAsHostCount = 0

    for (const slot of hostSlots) {
      const regs = slot.registrations || []
      const sourceRoute = resolveObservationSourceRoute(slot)
      const periodWeight = slot.isDoublePeriod ? 2 : 1
      const timeRange =
        slot.startTime && slot.endTime ? `${slot.startTime} – ${slot.endTime}` : slot.startTime || "—"

      if (regs.length === 0) {
        const cls = classifyObservationRecord(slot, null)
        const item: ObservationDetailItem = {
          slotId: slot.id,
          registrationId: null,
          evaluationId: null,
          role: "HOST",
          actualDate: slot.date instanceof Date ? slot.date.toISOString() : String(slot.date),
          actualDateVi: formatVietnamDate(slot.date),
          monthKey,
          timeRange,
          isDoublePeriod: slot.isDoublePeriod,
          periodWeight,
          campusName: slot.campusName || teacher.campusName,
          level: slot.level || "—",
          grade: slot.grade || "—",
          className: slot.className || slot.grade || "—",
          subjectName: slot.subjectName || "—",
          topic: slot.topic || "—",
          hostTeacherId: slot.teacherId,
          hostTeacherName: slot.teacherName || teacher.teacherName,
          observerTeacherId: null,
          observerTeacherName: null,
          slotStatus: slot.status,
          requestOrigin: slot.requestOrigin,
          recordState: cls.state,
          recordStateLabel: cls.label,
          isCountedOfficial: false,
          isPendingReview: cls.isPendingReview,
          approvedAt: null,
          submittedAt: null,
          overallRating: null,
          totalScore: null,
          teachingCompliancePass: null,
          strengths: null,
          improvements: null,
          generalComment: null,
          sourceRoute,
          canCreateCoaching: false,
          linkedCoaching: null,
        }
        taughtDetails.push(item)
        if (cls.isPendingReview) {
          pendingAsHostCount++
          pendingDetails.push(item)
        }
        continue
      }

      let slotHasOfficialEval = false
      for (const reg of regs) {
        const cls = classifyObservationRecord(slot, reg)
        const ev = reg.evaluation
        const evalPass = ev ? isEvaluationPassing(ev.overallRating, ev.totalScore) : null
        const linkedCoaching = ev ? coachingByEvaluationId.get(ev.id) || null : null

        const item: ObservationDetailItem = {
          slotId: slot.id,
          registrationId: reg.id,
          evaluationId: ev?.id || null,
          role: "HOST",
          actualDate: slot.date instanceof Date ? slot.date.toISOString() : String(slot.date),
          actualDateVi: formatVietnamDate(slot.date),
          monthKey,
          timeRange,
          isDoublePeriod: slot.isDoublePeriod,
          periodWeight,
          campusName: slot.campusName || teacher.campusName,
          level: slot.level || "—",
          grade: slot.grade || "—",
          className: slot.className || slot.grade || "—",
          subjectName: slot.subjectName || "—",
          topic: slot.topic || "—",
          hostTeacherId: slot.teacherId,
          hostTeacherName: slot.teacherName || teacher.teacherName,
          observerTeacherId: reg.teacherId,
          observerTeacherName: reg.teacherName || teacherNameMap.get(reg.teacherId) || "Người dự",
          slotStatus: slot.status,
          requestOrigin: slot.requestOrigin,
          recordState: cls.state,
          recordStateLabel: cls.label,
          isCountedOfficial: cls.isCountedOfficial,
          isPendingReview: cls.isPendingReview,
          approvedAt: reg.approvedAt
            ? reg.approvedAt instanceof Date
              ? reg.approvedAt.toISOString()
              : String(reg.approvedAt)
            : null,
          submittedAt: ev?.submittedAt
            ? ev.submittedAt instanceof Date
              ? ev.submittedAt.toISOString()
              : String(ev.submittedAt)
            : null,
          overallRating: ev?.overallRating || null,
          totalScore: ev?.totalScore ?? null,
          teachingCompliancePass: evalPass,
          strengths: ev?.strengths || null,
          improvements: ev?.improvements || null,
          generalComment: ev?.generalComment || null,
          sourceRoute,
          canCreateCoaching: cls.isCountedOfficial && Boolean(ev?.id),
          linkedCoaching,
        }

        taughtDetails.push(item)

        if (cls.isCountedOfficial && ev) {
          slotHasOfficialEval = true
          approvedHostEvals.push({
            overallRating: ev.overallRating,
            totalScore: ev.totalScore,
          })
        } else if (cls.isPendingReview) {
          pendingAsHostCount++
          pendingDetails.push(item)
        }
      }

      if (slotHasOfficialEval && !countedHostSlotIds.has(slot.id)) {
        countedHostSlotIds.add(slot.id)
        taughtObservedOfficial += periodWeight
      }
    }

    // Build OBSERVER details (GV đi dự)
    const observerEntries = observerEntriesByTeacher.get(teacher.id) || []
    const observedDetails: ObservationDetailItem[] = []
    let observedOfficial = 0
    let pendingAsObserverCount = 0

    for (const { slot, reg } of observerEntries) {
      const cls = classifyObservationRecord(slot, reg)
      const ev = reg.evaluation
      const evalPass = ev ? isEvaluationPassing(ev.overallRating, ev.totalScore) : null
      const sourceRoute = resolveObservationSourceRoute(slot)
      const periodWeight = slot.isDoublePeriod ? 2 : 1
      const timeRange =
        slot.startTime && slot.endTime ? `${slot.startTime} – ${slot.endTime}` : slot.startTime || "—"
      const linkedCoaching = ev ? coachingByEvaluationId.get(ev.id) || null : null

      const item: ObservationDetailItem = {
        slotId: slot.id,
        registrationId: reg.id,
        evaluationId: ev?.id || null,
        role: "OBSERVER",
        actualDate: slot.date instanceof Date ? slot.date.toISOString() : String(slot.date),
        actualDateVi: formatVietnamDate(slot.date),
        monthKey,
        timeRange,
        isDoublePeriod: slot.isDoublePeriod,
        periodWeight,
        campusName: slot.campusName || "—",
        level: slot.level || "—",
        grade: slot.grade || "—",
        className: slot.className || slot.grade || "—",
        subjectName: slot.subjectName || "—",
        topic: slot.topic || "—",
        hostTeacherId: slot.teacherId,
        hostTeacherName: slot.teacherName || teacherNameMap.get(slot.teacherId) || "GV dạy",
        observerTeacherId: reg.teacherId,
        observerTeacherName: teacher.teacherName,
        slotStatus: slot.status,
        requestOrigin: slot.requestOrigin,
        recordState: cls.state,
        recordStateLabel: cls.label,
        isCountedOfficial: cls.isCountedOfficial,
        isPendingReview: cls.isPendingReview,
        approvedAt: reg.approvedAt
          ? reg.approvedAt instanceof Date
            ? reg.approvedAt.toISOString()
            : String(reg.approvedAt)
          : null,
        submittedAt: ev?.submittedAt
          ? ev.submittedAt instanceof Date
            ? ev.submittedAt.toISOString()
            : String(ev.submittedAt)
          : null,
        overallRating: ev?.overallRating || null,
        totalScore: ev?.totalScore ?? null,
        teachingCompliancePass: evalPass,
        strengths: ev?.strengths || null,
        improvements: ev?.improvements || null,
        generalComment: ev?.generalComment || null,
        sourceRoute,
        canCreateCoaching: cls.isCountedOfficial && Boolean(ev?.id),
        linkedCoaching,
      }

      observedDetails.push(item)
      if (cls.isCountedOfficial) {
        observedOfficial += periodWeight
      } else if (cls.isPendingReview) {
        pendingAsObserverCount++
        pendingDetails.push(item)
      }
    }

    // Sort details chronologically (newest actualDate first)
    const sortByActualDateDesc = (a: ObservationDetailItem, b: ObservationDetailItem) =>
      b.actualDate.localeCompare(a.actualDate)
    taughtDetails.sort(sortByActualDateDesc)
    observedDetails.sort(sortByActualDateDesc)
    pendingDetails.sort(sortByActualDateDesc)

    const observingCompliance = evaluateObservingCompliance(
      observedOfficial,
      quotas.requiredObserved,
      quotas.observedUnit,
      quotas.hasConfiguredObservedQuota
    )

    const teachingCompliance = evaluateTeachingCompliance(
      taughtObservedOfficial,
      quotas.requiredTaught,
      quotas.taughtUnit,
      approvedHostEvals
    )

    const observedQuotaDisplay =
      quotas.hasConfiguredObservedQuota && quotas.requiredObserved > 0
        ? `${observedOfficial}/${quotas.requiredObserved} tiết`
        : `${observedOfficial} tiết`

    const teacherLevels = Array.from(
      new Set(
        [
          ...(teacher.divisionCodes || []).map(mapDivisionCodeToLevel).filter(Boolean),
          ...(teacher.departmentBlockCM === "Mầm Non" ? ["Mầm non"] : []),
          ...hostSlots.map((s) => s.level).filter(Boolean),
        ] as string[]
      )
    )

    return {
      teacherId: teacher.id,
      teacherCode: teacher.teacherCode,
      teacherName: teacher.teacherName,
      position: teacher.position || "GV",
      positions,
      campusId: teacher.campusId,
      campusName: teacher.campusName,
      departmentId: teacher.departmentId,
      departmentName: teacher.departmentName,
      levels: teacherLevels,
      joinDate: teacher.joinDate
        ? teacher.joinDate instanceof Date
          ? teacher.joinDate.toISOString()
          : String(teacher.joinDate)
        : null,
      joinYear: teacher.joinYear ?? null,
      seniorityLabel: seniority.label,
      isNewTeacher: seniority.isNewTeacher,

      monthlyTeachingPeriods,
      teachingPeriodSource,
      teachingPeriodSourceLabel,
      weeklyTimetablePeriods,

      taughtObservedOfficial,
      taughtObservedQuota: quotas.requiredTaught,
      taughtObservedUnit: quotas.taughtUnit,
      taughtObservedTotalSlots: hostSlots.length,

      observedOfficial,
      observedQuota: quotas.requiredObserved,
      observedUnit: quotas.observedUnit,
      hasConfiguredObservedQuota: quotas.hasConfiguredObservedQuota,
      observedQuotaDisplay,

      pendingFormsCount: pendingAsHostCount + pendingAsObserverCount,
      pendingAsHostCount,
      pendingAsObserverCount,

      observingCompliance,
      teachingCompliance,

      coachingPlansCount: coachingCountByTeacherId.get(teacher.id) || 0,

      taughtDetails,
      observedDetails,
      pendingDetails,
    }
  })

  // Summary metrics
  const summary: MonthlyObservationSummary = {
    totalTeachers: rows.length,
    observedCompliantCount: rows.filter((r) => r.observingCompliance.code === "COMPLIANT").length,
    unobservedCount: rows.filter((r) => r.observingCompliance.code === "UNOBSERVED").length,
    shortfallCount: rows.filter((r) => r.observingCompliance.code === "SHORTFALL").length,
    noQuotaCount: rows.filter((r) => r.observingCompliance.code === "NO_QUOTA").length,
    teachingCompliantCount: rows.filter((r) => r.teachingCompliance.code === "TEACHING_COMPLIANT").length,
    teachingNeedsCoachingCount: rows.filter((r) => r.teachingCompliance.code === "NEEDS_IMPROVEMENT").length,
    totalTaughtObservedPeriods: rows.reduce((s, r) => s + r.taughtObservedOfficial, 0),
    totalObservedPeriods: rows.reduce((s, r) => s + r.observedOfficial, 0),
    totalPendingForms: rows.reduce((s, r) => s + r.pendingFormsCount, 0),
    linkedCoachingCount: rows.reduce((s, r) => s + r.coachingPlansCount, 0),
  }

  let periodSourceSummary: {
    source: "TEACHING_LOG" | "TIMETABLE" | "MIXED" | "NONE"
    columnHeaderNote: string
  } = { source: "NONE", columnHeaderNote: "Số tiết theo TKB" }

  if (logSourceCount > 0 && timetableSourceCount > 0) {
    periodSourceSummary = {
      source: "MIXED",
      columnHeaderNote: "Sổ giảng dạy / TKB",
    }
  } else if (logSourceCount > 0) {
    periodSourceSummary = {
      source: "TEACHING_LOG",
      columnHeaderNote: "Sổ theo dõi giảng dạy",
    }
  } else if (timetableSourceCount > 0) {
    periodSourceSummary = {
      source: "TIMETABLE",
      columnHeaderNote: "Số tiết theo TKB",
    }
  }

  return { rows, summary, periodSourceSummary }
}
