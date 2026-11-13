import {
  extractGradeNumber,
  mapEducationSystemToStudyProgram,
  normalizeClassLevelCode,
} from "./scopeResolver"
import type { QuotaReconcileItem, SlotRecord } from "./types"

export interface SubjectRef {
  id: string
  subjectCode?: string | null
  subjectName: string
}

export interface TeacherRef {
  id: string
  teacherCode?: string | null
  teacherName: string
  campusId?: string | null
  departmentId?: string | null
}

export interface SubjectQuotaRow {
  id: string
  subjectId: string
  academicYearId: string
  studyProgram: string
  quota: number
  quotaPrimary: number
  quotaMiddle: number
  quotaHigh: number
  quotaG1: number
  quotaG2: number
  quotaG3: number
  quotaG4: number
  quotaG5: number
  quotaG6: number
  quotaG7: number
  quotaG8: number
  quotaG9: number
  quotaG10: number
  quotaG11: number
  quotaG12: number
  quotaG10TN?: number | null
  quotaG10XH?: number | null
  quotaG11TN?: number | null
  quotaG11XH?: number | null
  quotaG12TN?: number | null
  quotaG12XH?: number | null
  specialNoteFlags?: string | null
}

export interface TeachingAssignmentRow {
  id: string
  classId: string
  subjectId: string
  teacherId: string
  academicYearId: string
  semester: number
}

export interface CtqtAssignmentRow {
  classId: string
  subjectCode: string
  primaryTeacherId: string
  delegatedTeacherId?: string | null
  academicYearId: string
  semester: number
}

export interface ClassForQuota {
  id: string
  className: string
  grade: string
  level: string
  educationSystem?: string | null
  homeroomTeacherId?: string | null
}

const HOMEROOM_SUBJECT_PATTERNS = [
  "CHÀO CỜ",
  "CHAO CO",
  "SINH HOẠT LỚP",
  "SINH HOAT LOP",
  "SHL",
  "SHDC",
  "SINH HOẠT DƯỚI CỜ",
  "HOẠT ĐỘNG TRẢI NGHIỆM",
  "HDTN",
]

export function isHomeroomDefaultSubject(subject: SubjectRef): boolean {
  const code = String(subject.subjectCode || "").toUpperCase()
  const name = String(subject.subjectName || "").toUpperCase()
  return HOMEROOM_SUBJECT_PATTERNS.some((p) => code === p || name.includes(p))
}

export function detectHighSchoolTrack(className?: string | null): "TN" | "XH" | null {
  const raw = String(className || "").trim().toUpperCase()
  if (!raw) return null
  if (/(?:^|[\s/\-_(.])XH(?:$|[\s/\-_).])|XÃ\s*HỘI|XA\s*HOI|\dXH\b/.test(raw)) return "XH"
  if (/(?:^|[\s/\-_(.])TN(?:$|[\s/\-_).])|TỰ\s*NHIÊN|TU\s*NHIEN|\dTN\b/.test(raw)) return "TN"
  return null
}

export function resolveGradeQuotaValue(
  row: SubjectQuotaRow | undefined,
  gradeNum: number | null,
  levelNorm: "TH" | "THCS" | "THPT" | "MN" | "OTHER",
  className?: string | null
): number {
  if (!row) return 0
  if (gradeNum && (gradeNum === 10 || gradeNum === 11 || gradeNum === 12)) {
    const track = detectHighSchoolTrack(className)
    if (track) {
      const trackKey = `quotaG${gradeNum}${track}` as keyof SubjectQuotaRow
      const trackVal = row[trackKey]
      if (trackVal !== null && trackVal !== undefined) {
        return Number(trackVal) || 0
      }
    }
  }
  if (gradeNum && gradeNum >= 1 && gradeNum <= 12) {
    const key = `quotaG${gradeNum}` as keyof SubjectQuotaRow
    const gradeSpecific = Number(row[key] || 0)
    if (gradeSpecific > 0) return gradeSpecific
  }
  if (levelNorm === "TH" && row.quotaPrimary > 0) return Number(row.quotaPrimary)
  if (levelNorm === "THCS" && row.quotaMiddle > 0) return Number(row.quotaMiddle)
  if (levelNorm === "THPT" && row.quotaHigh > 0) return Number(row.quotaHigh)
  if (row.quota > 0) return Number(row.quota)
  return 0
}

/**
 * Computes scheduled weekly equivalent periods per (classId, subjectId) from SlotRecords.
 * - weekType === "ALL" counts as 1.0 period/week
 * - weekType === "EVEN" or "ODD" counts as 0.5 period/week for subjectId,
 *   plus 0.5 period/week for altSubjectId if split even/odd in the same cell.
 */
export function computeScheduledWeeklyMap(
  slots: SlotRecord[],
  subjectByNameMap?: Map<string, string>
): Map<string, number> {
  const map = new Map<string, number>()
  const add = (classId: string, subId: string | null | undefined, amount: number) => {
    if (!classId || !subId) return
    const key = `${classId}::${subId}`
    map.set(key, Math.round(((map.get(key) || 0) + amount) * 100) / 100)
  }

  for (const s of slots) {
    if (!s.classId) continue
    const wt = String(s.weekType || "ALL").toUpperCase()
    const mainSubId =
      s.subjectId ||
      (s.subjectName && subjectByNameMap
        ? subjectByNameMap.get(s.subjectName.trim().toUpperCase())
        : null)

    if (wt === "EVEN" || wt === "ODD") {
      add(s.classId, mainSubId, 0.5)
      const altSubId =
        s.altSubjectId ||
        (s.altSubjectName && subjectByNameMap
          ? subjectByNameMap.get(s.altSubjectName.trim().toUpperCase())
          : null)
      if (altSubId) {
        add(s.classId, altSubId, 0.5)
      }
    } else {
      add(s.classId, mainSubId, 1.0)
    }
  }

  return map
}

/**
 * Reconciles SubjectQuota + TeachingAssignment + CtqtTeachingAssignment + Homeroom against scheduled slots.
 * Never invents default 2 periods or random teacher assignments.
 */
export function reconcileQuotasAndAssignments(params: {
  classes: ClassForQuota[]
  subjects: SubjectRef[]
  teachers: TeacherRef[]
  subjectQuotas: SubjectQuotaRow[]
  teachingAssignments: TeachingAssignmentRow[]
  ctqtAssignments?: CtqtAssignmentRow[]
  scheduledSlots?: SlotRecord[]
  cycleWeeks?: number
}): QuotaReconcileItem[] {
  const cycleWeeks = Math.max(1, params.cycleWeeks || 2)

  const teacherById = new Map<string, TeacherRef>()
  for (const t of params.teachers) {
    teacherById.set(t.id, t)
  }

  const subjectById = new Map<string, SubjectRef>()
  const subjectByCode = new Map<string, SubjectRef>()
  const subjectIdByName = new Map<string, string>()
  for (const sub of params.subjects) {
    subjectById.set(sub.id, sub)
    if (sub.subjectCode) subjectByCode.set(sub.subjectCode.trim().toUpperCase(), sub)
    if (sub.subjectName) subjectIdByName.set(sub.subjectName.trim().toUpperCase(), sub.id)
  }

  // Index SubjectQuota by `${subjectId}::${studyProgram}`
  const quotaMap = new Map<string, SubjectQuotaRow>()
  for (const q of params.subjectQuotas) {
    quotaMap.set(`${q.subjectId}::${q.studyProgram}`, q)
  }

  // Index TeachingAssignment by `${classId}::${subjectId}` (supports multiple teachers -> primary + coTeacher)
  const taMap = new Map<string, TeachingAssignmentRow[]>()
  for (const ta of params.teachingAssignments) {
    const key = `${ta.classId}::${ta.subjectId}`
    const arr = taMap.get(key) || []
    arr.push(ta)
    taMap.set(key, arr)
  }

  // Index CTQT assignments by `${classId}::${subjectId}`
  const ctqtMap = new Map<string, CtqtAssignmentRow>()
  for (const ca of params.ctqtAssignments || []) {
    const matchedSub = subjectByCode.get(String(ca.subjectCode || "").trim().toUpperCase())
    if (matchedSub) {
      ctqtMap.set(`${ca.classId}::${matchedSub.id}`, ca)
    }
  }

  const scheduledMap = computeScheduledWeeklyMap(params.scheduledSlots || [], subjectIdByName)

  const items: QuotaReconcileItem[] = []

  for (const cls of params.classes) {
    const studyProgram = mapEducationSystemToStudyProgram(cls.educationSystem)
    const gradeNum = extractGradeNumber(cls.grade, cls.className)
    const levelNorm = normalizeClassLevelCode(cls.level)

    const homeroomIds = String(cls.homeroomTeacherId || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)

    for (const sub of params.subjects) {
      const exactQuotaRow =
        quotaMap.get(`${sub.id}::${studyProgram}`) ||
        quotaMap.get(`${sub.id}::DEFAULT`) ||
        (studyProgram === "DEFAULT" ? quotaMap.get(`${sub.id}::Hệ S`) : undefined)

      const weeklyQuota = resolveGradeQuotaValue(exactQuotaRow, gradeNum, levelNorm, cls.className)
      const taRows = taMap.get(`${cls.id}::${sub.id}`) || []
      const ctqtRow = ctqtMap.get(`${cls.id}::${sub.id}`)
      const scheduledWeeklyEquivalent = scheduledMap.get(`${cls.id}::${sub.id}`) || 0

      // Only surface (class, subject) pairs that have quota > 0, an active assignment, or scheduled slots
      if (weeklyQuota <= 0 && taRows.length === 0 && !ctqtRow && scheduledWeeklyEquivalent <= 0) {
        continue
      }

      let primaryTeacher: TeacherRef | undefined
      let coTeacher: TeacherRef | undefined
      let assignmentSource: QuotaReconcileItem["assignmentSource"] = "MISSING"

      if (taRows.length > 0) {
        primaryTeacher = teacherById.get(taRows[0].teacherId)
        if (taRows.length > 1) {
          coTeacher = teacherById.get(taRows[1].teacherId)
        } else if (ctqtRow?.delegatedTeacherId && ctqtRow.delegatedTeacherId !== taRows[0].teacherId) {
          coTeacher = teacherById.get(ctqtRow.delegatedTeacherId)
        }
        assignmentSource = primaryTeacher ? "TEACHING_ASSIGNMENT" : "MISSING"
      } else if (ctqtRow) {
        primaryTeacher = teacherById.get(ctqtRow.primaryTeacherId)
        if (ctqtRow.delegatedTeacherId) {
          coTeacher = teacherById.get(ctqtRow.delegatedTeacherId)
        }
        assignmentSource = primaryTeacher ? "CTQT_ASSIGNMENT" : "MISSING"
      } else if (homeroomIds.length > 0 && isHomeroomDefaultSubject(sub)) {
        primaryTeacher = teacherById.get(homeroomIds[0])
        if (homeroomIds.length > 1) {
          coTeacher = teacherById.get(homeroomIds[1])
        }
        assignmentSource = primaryTeacher ? "HOMEROOM" : "MISSING"
      }

      const diff = Math.round((weeklyQuota - scheduledWeeklyEquivalent) * 100) / 100
      const missingWeeklyPeriods = diff > 0 ? diff : 0
      const overScheduledWeeklyPeriods = diff < 0 ? Math.abs(diff) : 0

      let status: QuotaReconcileItem["status"] = "OK"
      if (weeklyQuota <= 0 && (taRows.length > 0 || ctqtRow)) {
        status = "NO_QUOTA_DEFINED"
      } else if (!primaryTeacher) {
        status = "MISSING_TEACHER"
      } else if (missingWeeklyPeriods > 0) {
        status = "UNDER_SCHEDULED"
      } else if (overScheduledWeeklyPeriods > 0) {
        status = "OVER_SCHEDULED"
      }

      items.push({
        classId: cls.id,
        className: cls.className,
        grade: cls.grade,
        level: cls.level,
        educationSystem: cls.educationSystem || "",
        studyProgram,
        subjectId: sub.id,
        subjectCode: sub.subjectCode || "",
        subjectName: sub.subjectName,
        weeklyQuota,
        cycleQuota: Math.round(weeklyQuota * cycleWeeks * 100) / 100,
        cycleWeeks,
        scheduledWeeklyEquivalent,
        missingWeeklyPeriods,
        overScheduledWeeklyPeriods,
        primaryTeacherId: primaryTeacher?.id || null,
        primaryTeacherCode: primaryTeacher?.teacherCode || null,
        primaryTeacherName: primaryTeacher?.teacherName || null,
        coTeacherId: coTeacher?.id || null,
        coTeacherCode: coTeacher?.teacherCode || null,
        coTeacherName: coTeacher?.teacherName || null,
        assignmentSource,
        status,
      })
    }
  }

  return items
}
