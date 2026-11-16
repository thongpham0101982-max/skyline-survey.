import {
  extractGradeNumber,
  mapEducationSystemToStudyProgram,
  normalizeClassLevelCode,
} from "./scopeResolver"
import {
  detectTeacherGroupFromName,
  isDualGvvnGvnnSubject,
  parseTeacherSplitJson,
  resolveSlotKeyTeacherSplit,
  resolveTeacherGroup,
  type TeacherGroupCode,
} from "./teacherGroupHelper"
import type { QuotaReconcileItem, SlotRecord, TeacherAllocationDetail } from "./types"

export interface SubjectRef {
  id: string
  subjectCode?: string | null
  subjectName: string
  category?: string | null
}

export interface TeacherRef {
  id: string
  teacherCode?: string | null
  teacherName: string
  campusId?: string | null
  departmentId?: string | null
  teacherGroup?: string | null
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
  teacherSplitJson?: string | null
}

export interface TeachingAssignmentRow {
  id: string
  classId: string
  subjectId: string
  teacherId: string
  academicYearId: string
  semester: number
  weeklyPeriods?: number | null
  teacherRole?: string | null
}

export interface CtqtAssignmentRow {
  classId: string
  subjectCode: string
  primaryTeacherId: string
  delegatedTeacherId?: string | null
  academicYearId: string
  semester: number
}

export interface SpecialAssignmentRow {
  classId: string
  teacherId: string
  academicYearId: string
  semester: number
  legacySubjectId?: string | null
  specialSubjectCode?: string | null
  specialSubjectName?: string | null
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

const SPECIAL_CODE_ALIASES: Record<string, string[]> = {
  CXXH: ["CXXH", "GCX", "GIÁO DỤC CẢM XÚC - XÃ HỘI"],
  GCX: ["GCX", "CXXH", "GIÁO DỤC CẢM XÚC - XÃ HỘI"],
  GDHN: ["GDHN", "HNG", "HƯỚNG NGHIỆP", "GIÁO DỤC HƯỚNG NGHIỆP"],
  HNG: ["HNG", "GDHN", "HƯỚNG NGHIỆP", "GIÁO DỤC HƯỚNG NGHIỆP"],
  GDGT: ["GDGT", "GIÁO DỤC GIỚI TÍNH"],
  FIN_EDU: ["FIN_EDU", "GDTC_CN", "TÀI CHÍNH", "GIÁO DỤC TÀI CHÍNH CÁ NHÂN"],
}

export function buildSubjectLookupMaps(subjects: SubjectRef[]): {
  subjectById: Map<string, SubjectRef>
  subjectByCodeOrName: Map<string, SubjectRef>
} {
  const subjectById = new Map<string, SubjectRef>()
  const subjectByCodeOrName = new Map<string, SubjectRef>()

  for (const sub of subjects) {
    subjectById.set(sub.id, sub)
    const codeKey = String(sub.subjectCode || "").trim().toUpperCase()
    const nameKey = String(sub.subjectName || "").trim().toUpperCase()
    if (codeKey) subjectByCodeOrName.set(codeKey, sub)
    if (nameKey) subjectByCodeOrName.set(nameKey, sub)
  }

  for (const [aliasKey, targets] of Object.entries(SPECIAL_CODE_ALIASES)) {
    if (subjectByCodeOrName.has(aliasKey)) continue
    for (const target of targets) {
      const hit = subjectByCodeOrName.get(target)
      if (hit) {
        subjectByCodeOrName.set(aliasKey, hit)
        break
      }
    }
  }

  return { subjectById, subjectByCodeOrName }
}

/**
 * Reconciles SubjectQuota + TeachingAssignment + CtqtTeachingAssignment + SpecialTeachingAssignment + Homeroom against scheduled slots.
 * Never invents default 2 periods or random teacher assignments.
 */
export function reconcileQuotasAndAssignments(params: {
  classes: ClassForQuota[]
  subjects: SubjectRef[]
  teachers: TeacherRef[]
  subjectQuotas: SubjectQuotaRow[]
  teachingAssignments: TeachingAssignmentRow[]
  ctqtAssignments?: CtqtAssignmentRow[]
  specialAssignments?: SpecialAssignmentRow[]
  scheduledSlots?: SlotRecord[]
  cycleWeeks?: number
}): QuotaReconcileItem[] {
  const cycleWeeks = Math.max(1, params.cycleWeeks || 2)

  const teacherById = new Map<string, TeacherRef>()
  for (const t of params.teachers) {
    teacherById.set(t.id, t)
  }

  const { subjectById, subjectByCodeOrName } = buildSubjectLookupMaps(params.subjects)
  const subjectIdByName = new Map<string, string>()
  for (const [key, sub] of subjectByCodeOrName.entries()) {
    subjectIdByName.set(key, sub.id)
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
    const matchedSub = subjectByCodeOrName.get(String(ca.subjectCode || "").trim().toUpperCase())
    if (matchedSub) {
      ctqtMap.set(`${ca.classId}::${matchedSub.id}`, ca)
    }
  }

  // Index SpecialTeachingAssignment by `${classId}::${subjectId}` (fallback when TeachingAssignment is empty)
  const specialMap = new Map<string, SpecialAssignmentRow>()
  for (const sa of params.specialAssignments || []) {
    const matchedSub =
      (sa.legacySubjectId ? subjectById.get(sa.legacySubjectId) : undefined) ||
      (sa.specialSubjectCode
        ? subjectByCodeOrName.get(sa.specialSubjectCode.trim().toUpperCase())
        : undefined) ||
      (sa.specialSubjectName
        ? subjectByCodeOrName.get(sa.specialSubjectName.trim().toUpperCase())
        : undefined)
    if (matchedSub && !specialMap.has(`${sa.classId}::${matchedSub.id}`)) {
      specialMap.set(`${sa.classId}::${matchedSub.id}`, sa)
    }
  }

  const scheduledMap = computeScheduledWeeklyMap(params.scheduledSlots || [], subjectIdByName)

  // Per-teacher & per-group (GVVN / GVNN) scheduled weekly equivalent maps
  const scheduledByTeacher = new Map<string, number>()
  const scheduledByGroup = new Map<string, number>()
  const addTeacherScheduled = (
    classId: string,
    subId: string | null | undefined,
    tId: string | null | undefined,
    tName: string | null | undefined,
    amount: number
  ) => {
    if (!classId || !subId) return
    if (tId) {
      const tk = `${classId}::${subId}::${tId}`
      scheduledByTeacher.set(tk, Math.round(((scheduledByTeacher.get(tk) || 0) + amount) * 100) / 100)
    }
    const tObj = tId ? teacherById.get(tId) : undefined
    const grp: TeacherGroupCode = tObj
      ? resolveTeacherGroup(tObj)
      : detectTeacherGroupFromName(tName)
    if (tId || tName) {
      const gk = `${classId}::${subId}::${grp}`
      scheduledByGroup.set(gk, Math.round(((scheduledByGroup.get(gk) || 0) + amount) * 100) / 100)
    }
  }

  for (const s of params.scheduledSlots || []) {
    if (!s.classId) continue
    const wt = String(s.weekType || "ALL").toUpperCase()
    const isHalf = wt === "EVEN" || wt === "ODD"
    const w = isHalf ? 0.5 : 1.0
    const mainSubId =
      s.subjectId ||
      (s.subjectName ? subjectIdByName.get(s.subjectName.trim().toUpperCase()) : null)
    addTeacherScheduled(s.classId, mainSubId, s.teacherId, s.teacherName, w)

    if (isHalf) {
      const altSubId =
        s.altSubjectId ||
        (s.altSubjectName ? subjectIdByName.get(s.altSubjectName.trim().toUpperCase()) : null)
      if (altSubId) {
        addTeacherScheduled(s.classId, altSubId, s.altTeacherId, s.altTeacherName, 0.5)
      }
    }
  }

  const items: QuotaReconcileItem[] = []

  for (const cls of params.classes) {
    const studyProgram = mapEducationSystemToStudyProgram(cls.educationSystem)
    const gradeNum = extractGradeNumber(cls.grade, cls.className)
    const levelNorm = normalizeClassLevelCode(cls.level)
    const track = detectHighSchoolTrack(cls.className)

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
      const splitMap = parseTeacherSplitJson(exactQuotaRow?.teacherSplitJson)
      const quotaSplit = resolveSlotKeyTeacherSplit(splitMap, gradeNum, track)
      const quotaGvvnPeriods = quotaSplit ? quotaSplit.gvvn : null
      const quotaGvnnPeriods = quotaSplit ? quotaSplit.gvnn : null

      const rawTaRows = taMap.get(`${cls.id}::${sub.id}`) || []
      // Deduplicate by teacherId while preserving explicit weeklyPeriods if present
      const dedupTaByTeacher = new Map<string, TeachingAssignmentRow>()
      for (const ta of rawTaRows) {
        const prev = dedupTaByTeacher.get(ta.teacherId)
        if (!prev || (prev.weeklyPeriods == null && ta.weeklyPeriods != null)) {
          dedupTaByTeacher.set(ta.teacherId, ta)
        }
      }
      const taRows = Array.from(dedupTaByTeacher.values())

      const ctqtRow = ctqtMap.get(`${cls.id}::${sub.id}`)
      const specialRow = specialMap.get(`${cls.id}::${sub.id}`)
      const scheduledWeeklyEquivalent = scheduledMap.get(`${cls.id}::${sub.id}`) || 0

      // Only surface (class, subject) pairs that have quota > 0, an active assignment, or scheduled slots
      if (
        weeklyQuota <= 0 &&
        taRows.length === 0 &&
        !ctqtRow &&
        !specialRow &&
        scheduledWeeklyEquivalent <= 0
      ) {
        continue
      }

      let primaryTeacher: TeacherRef | undefined
      let coTeacher: TeacherRef | undefined
      let assignmentSource: QuotaReconcileItem["assignmentSource"] = "MISSING"

      type RawCandidate = {
        assignmentId?: string | null
        teacher: TeacherRef
        group: TeacherGroupCode
        explicitPeriods: number | null
      }
      const rawCandidates: RawCandidate[] = []

      if (taRows.length > 0) {
        for (const ta of taRows) {
          const tObj = teacherById.get(ta.teacherId)
          if (!tObj) continue
          const explicitRole = String(ta.teacherRole || "").trim().toUpperCase()
          const grp: TeacherGroupCode =
            explicitRole === "GVNN"
              ? "GVNN"
              : explicitRole === "GVVN"
              ? "GVVN"
              : resolveTeacherGroup(tObj)
          const expP =
            ta.weeklyPeriods !== null &&
            ta.weeklyPeriods !== undefined &&
            Number.isFinite(Number(ta.weeklyPeriods))
              ? Math.max(0, Math.round(Number(ta.weeklyPeriods) * 100) / 100)
              : null
          rawCandidates.push({
            assignmentId: ta.id,
            teacher: tObj,
            group: grp,
            explicitPeriods: expP,
          })
        }
        if (
          rawCandidates.length === 1 &&
          ctqtRow?.delegatedTeacherId &&
          ctqtRow.delegatedTeacherId !== rawCandidates[0].teacher.id
        ) {
          const delT = teacherById.get(ctqtRow.delegatedTeacherId)
          if (delT) {
            rawCandidates.push({
              assignmentId: null,
              teacher: delT,
              group: resolveTeacherGroup(delT),
              explicitPeriods: null,
            })
          }
        }
        primaryTeacher = rawCandidates[0]?.teacher
        coTeacher = rawCandidates[1]?.teacher
        assignmentSource = primaryTeacher ? "TEACHING_ASSIGNMENT" : "MISSING"
      } else if (ctqtRow) {
        primaryTeacher = teacherById.get(ctqtRow.primaryTeacherId)
        if (primaryTeacher) {
          rawCandidates.push({
            assignmentId: null,
            teacher: primaryTeacher,
            group: resolveTeacherGroup(primaryTeacher),
            explicitPeriods: null,
          })
        }
        if (ctqtRow.delegatedTeacherId) {
          coTeacher = teacherById.get(ctqtRow.delegatedTeacherId)
          if (coTeacher && coTeacher.id !== primaryTeacher?.id) {
            rawCandidates.push({
              assignmentId: null,
              teacher: coTeacher,
              group: resolveTeacherGroup(coTeacher),
              explicitPeriods: null,
            })
          }
        }
        assignmentSource = primaryTeacher ? "CTQT_ASSIGNMENT" : "MISSING"
      } else if (specialRow) {
        primaryTeacher = teacherById.get(specialRow.teacherId)
        if (primaryTeacher) {
          rawCandidates.push({
            assignmentId: null,
            teacher: primaryTeacher,
            group: resolveTeacherGroup(primaryTeacher),
            explicitPeriods: null,
          })
        }
        assignmentSource = primaryTeacher ? "TEACHING_ASSIGNMENT" : "MISSING"
      } else if (homeroomIds.length > 0 && isHomeroomDefaultSubject(sub)) {
        primaryTeacher = teacherById.get(homeroomIds[0])
        if (primaryTeacher) {
          rawCandidates.push({
            assignmentId: null,
            teacher: primaryTeacher,
            group: resolveTeacherGroup(primaryTeacher),
            explicitPeriods: null,
          })
        }
        if (homeroomIds.length > 1) {
          coTeacher = teacherById.get(homeroomIds[1])
          if (coTeacher && coTeacher.id !== primaryTeacher?.id) {
            rawCandidates.push({
              assignmentId: null,
              teacher: coTeacher,
              group: resolveTeacherGroup(coTeacher),
              explicitPeriods: null,
            })
          }
        }
        assignmentSource = primaryTeacher ? "HOMEROOM" : "MISSING"
      }

      const scheduledGvvnPeriods = scheduledByGroup.get(`${cls.id}::${sub.id}::GVVN`) || 0
      const scheduledGvnnPeriods = scheduledByGroup.get(`${cls.id}::${sub.id}::GVNN`) || 0

      // Compute per-teacher assignedPeriods
      const gvvnCands = rawCandidates.filter((c) => c.group === "GVVN")
      const gvnnCands = rawCandidates.filter((c) => c.group === "GVNN")
      const hasBothGroups = gvvnCands.length > 0 && gvnnCands.length > 0

      const explicitSumAll = rawCandidates.reduce(
        (acc, c) => acc + (c.explicitPeriods ?? 0),
        0
      )
      const explicitSumGvvn = gvvnCands.reduce((acc, c) => acc + (c.explicitPeriods ?? 0), 0)
      const explicitSumGvnn = gvnnCands.reduce((acc, c) => acc + (c.explicitPeriods ?? 0), 0)
      const unexplicitGvvnCount = gvvnCands.filter((c) => c.explicitPeriods === null).length
      const unexplicitGvnnCount = gvnnCands.filter((c) => c.explicitPeriods === null).length
      const unexplicitAllCount = unexplicitGvvnCount + unexplicitGvnnCount

      // Determine group target pools for unexplicit teachers
      let defaultGvvnPool = 0
      let defaultGvnnPool = 0
      if (quotaSplit) {
        defaultGvvnPool = Math.max(0, Math.round((quotaSplit.gvvn - explicitSumGvvn) * 100) / 100)
        defaultGvnnPool = Math.max(0, Math.round((quotaSplit.gvnn - explicitSumGvnn) * 100) / 100)
      } else if (hasBothGroups) {
        const remPool = Math.max(0, Math.round((weeklyQuota - explicitSumAll) * 100) / 100)
        if (
          unexplicitGvvnCount > 0 &&
          unexplicitGvnnCount > 0 &&
          scheduledGvvnPeriods + scheduledGvnnPeriods === weeklyQuota &&
          scheduledGvvnPeriods > 0 &&
          scheduledGvnnPeriods > 0
        ) {
          defaultGvvnPool = Math.max(0, scheduledGvvnPeriods - explicitSumGvvn)
          defaultGvnnPool = Math.max(0, scheduledGvnnPeriods - explicitSumGvnn)
        } else if (unexplicitGvvnCount > 0 && unexplicitGvnnCount > 0) {
          defaultGvvnPool = Math.ceil(remPool / 2)
          defaultGvnnPool = Math.max(0, Math.round((remPool - defaultGvvnPool) * 100) / 100)
        } else if (unexplicitGvvnCount > 0) {
          defaultGvvnPool = remPool
        } else if (unexplicitGvnnCount > 0) {
          defaultGvnnPool = remPool
        }
      } else if (unexplicitAllCount > 0) {
        const remPool = Math.max(0, Math.round((weeklyQuota - explicitSumAll) * 100) / 100)
        if (gvvnCands.length > 0) defaultGvvnPool = remPool
        else defaultGvnnPool = remPool
      }

      const distributeEvenly = (pool: number, count: number): number[] => {
        if (count <= 0) return []
        if (count === 1) return [Math.round(pool * 100) / 100]
        const base = Math.floor((pool / count) * 2) / 2
        const arr = Array(count).fill(base)
        const used = base * (count - 1)
        arr[0] = Math.max(0, Math.round((pool - used) * 100) / 100)
        return arr
      }

      const gvvnShares = distributeEvenly(defaultGvvnPool, unexplicitGvvnCount)
      const gvnnShares = distributeEvenly(defaultGvnnPool, unexplicitGvnnCount)
      let gvvnShareIdx = 0
      let gvnnShareIdx = 0

      const teacherAllocations: TeacherAllocationDetail[] = rawCandidates.map((cand) => {
        const assignedPeriods =
          cand.explicitPeriods !== null
            ? cand.explicitPeriods
            : cand.group === "GVVN"
            ? gvvnShares[gvvnShareIdx++] ?? 0
            : gvnnShares[gvnnShareIdx++] ?? 0
        const tSched =
          scheduledByTeacher.get(`${cls.id}::${sub.id}::${cand.teacher.id}`) || 0
        return {
          assignmentId: cand.assignmentId || null,
          teacherId: cand.teacher.id,
          teacherCode: cand.teacher.teacherCode || "",
          teacherName: cand.teacher.teacherName,
          teacherGroup: cand.group,
          assignedPeriods,
          isExplicitPeriods: cand.explicitPeriods !== null,
          scheduledPeriods: tSched,
        }
      })

      const assignedGvvnPeriods =
        Math.round(
          teacherAllocations
            .filter((a) => a.teacherGroup === "GVVN")
            .reduce((s, a) => s + a.assignedPeriods, 0) * 100
        ) / 100
      const assignedGvnnPeriods =
        Math.round(
          teacherAllocations
            .filter((a) => a.teacherGroup === "GVNN")
            .reduce((s, a) => s + a.assignedPeriods, 0) * 100
        ) / 100

      const firstGvvn = teacherAllocations.find((a) => a.teacherGroup === "GVVN") || null
      const firstGvnn = teacherAllocations.find((a) => a.teacherGroup === "GVNN") || null

      const isDualGvvnGvnn =
        isDualGvvnGvnnSubject(sub) ||
        quotaSplit !== null ||
        (Boolean(firstGvvn) && Boolean(firstGvnn)) ||
        (scheduledGvvnPeriods > 0 && scheduledGvnnPeriods > 0)

      // Prefer GVVN as primaryTeacher and GVNN as second display teacher when both exist so order is deterministic
      if (firstGvvn && firstGvnn) {
        primaryTeacher = teacherById.get(firstGvvn.teacherId) || primaryTeacher
        coTeacher = teacherById.get(firstGvnn.teacherId) || coTeacher
      }

      const diff = Math.round((weeklyQuota - scheduledWeeklyEquivalent) * 100) / 100
      const missingWeeklyPeriods = diff > 0 ? diff : 0
      const overScheduledWeeklyPeriods = diff < 0 ? Math.abs(diff) : 0

      const missingRequiredSplitTeacher =
        quotaSplit !== null &&
        ((quotaSplit.gvvn > 0 && !firstGvvn) || (quotaSplit.gvnn > 0 && !firstGvnn))

      let status: QuotaReconcileItem["status"] = "OK"
      if (weeklyQuota <= 0 && (taRows.length > 0 || ctqtRow || specialRow)) {
        status = "NO_QUOTA_DEFINED"
      } else if (!primaryTeacher || missingRequiredSplitTeacher) {
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
        isDualGvvnGvnn,
        quotaGvvnPeriods,
        quotaGvnnPeriods,
        gvvnTeacherId: firstGvvn?.teacherId || null,
        gvvnTeacherCode: firstGvvn?.teacherCode || null,
        gvvnTeacherName: firstGvvn?.teacherName || null,
        gvnnTeacherId: firstGvnn?.teacherId || null,
        gvnnTeacherCode: firstGvnn?.teacherCode || null,
        gvnnTeacherName: firstGvnn?.teacherName || null,
        assignedGvvnPeriods,
        assignedGvnnPeriods,
        scheduledGvvnPeriods,
        scheduledGvnnPeriods,
        teacherAllocations,
      })
    }
  }

  return items
}

export interface HydrateSlotsResult {
  slots: SlotRecord[]
  filledPrimaryCount: number
  filledAltCount: number
  updatedCount: number
}

/**
 * Automatically backfills unassigned (or all assigned when `mode === "SYNC_ALL_ASSIGNED"`)
 * primary (`teacherId`) and alternating (`altTeacherId` on `Luân phiên`) slot teachers
 * directly from canonical `quotaItems` (`TeachingAssignment` / `CtqtTeachingAssignment` / `SpecialTeachingAssignment` / `Homeroom`).
 */
export function hydrateSlotsFromAssignments(params: {
  slots: SlotRecord[]
  quotaItems: QuotaReconcileItem[]
  subjects: SubjectRef[]
  mode?: "FILL_MISSING" | "SYNC_ALL_ASSIGNED"
}): HydrateSlotsResult {
  const mode = params.mode || "FILL_MISSING"
  const { subjectById, subjectByCodeOrName } = buildSubjectLookupMaps(params.subjects)

  const quotaByClassSub = new Map<string, QuotaReconcileItem>()
  for (const q of params.quotaItems) {
    quotaByClassSub.set(`${q.classId}::${q.subjectId}`, q)
  }

  let filledPrimaryCount = 0
  let filledAltCount = 0
  let updatedCount = 0

  const allocatedFillCounter = new Map<string, number>()
  for (const s of params.slots) {
    if (s.classId && s.subjectId && s.teacherId) {
      const k = `${s.classId}::${s.subjectId}::${s.teacherId}`
      const w = s.weekType === "ODD" || s.weekType === "EVEN" ? 0.5 : 1
      allocatedFillCounter.set(k, (allocatedFillCounter.get(k) || 0) + w)
    }
  }

  const nextSlots = params.slots.map((slot) => {
    let changed = false
    const copy: SlotRecord = { ...slot }

    // 1. Primary subject resolution & teacher auto-sync
    const mainSub =
      (copy.subjectId ? subjectById.get(copy.subjectId) : undefined) ||
      (copy.subjectCode
        ? subjectByCodeOrName.get(copy.subjectCode.trim().toUpperCase())
        : undefined) ||
      (copy.subjectName
        ? subjectByCodeOrName.get(copy.subjectName.trim().toUpperCase())
        : undefined)

    if (mainSub) {
      if (!copy.subjectId) {
        copy.subjectId = mainSub.id
        copy.subjectCode = mainSub.subjectCode || copy.subjectCode || null
        changed = true
      }
      const mainQuota = quotaByClassSub.get(`${copy.classId}::${mainSub.id}`)
      const allocations = mainQuota?.teacherAllocations || []
      const isIndependentMultiTeacher =
        Boolean(mainQuota?.isDualGvvnGvnn) ||
        (allocations.length > 1 && mainQuota?.assignmentSource !== "CTQT_ASSIGNMENT")

      if (isIndependentMultiTeacher && allocations.length > 0) {
        const matchedAlloc = copy.teacherId
          ? allocations.find((a) => a.teacherId === copy.teacherId)
          : undefined

        if (matchedAlloc) {
          if (
            mode === "SYNC_ALL_ASSIGNED" &&
            (copy.teacherName !== matchedAlloc.teacherName ||
              copy.teacherCode !== (matchedAlloc.teacherCode || null))
          ) {
            copy.teacherCode = matchedAlloc.teacherCode || null
            copy.teacherName = matchedAlloc.teacherName || null
            filledPrimaryCount++
            changed = true
          }
        } else if (!copy.teacherId || mode === "SYNC_ALL_ASSIGNED") {
          // Pick the assigned teacher who still needs periods according to their allocation
          const slotWeight = copy.weekType === "ODD" || copy.weekType === "EVEN" ? 0.5 : 1
          let chosen = allocations.find((a) => {
            const used =
              allocatedFillCounter.get(`${copy.classId}::${mainSub.id}::${a.teacherId}`) || 0
            return a.assignedPeriods > 0 && used + 0.001 < a.assignedPeriods
          })
          if (!chosen && allocations.length === 1) {
            chosen = allocations[0]
          }
          if (chosen) {
            copy.teacherId = chosen.teacherId
            copy.teacherCode = chosen.teacherCode || null
            copy.teacherName = chosen.teacherName || null
            const k = `${copy.classId}::${mainSub.id}::${chosen.teacherId}`
            allocatedFillCounter.set(k, (allocatedFillCounter.get(k) || 0) + slotWeight)
            filledPrimaryCount++
            changed = true
          }
        }
      } else if (mainQuota?.primaryTeacherId) {
        const shouldFillMain =
          mode === "SYNC_ALL_ASSIGNED"
            ? copy.teacherId !== mainQuota.primaryTeacherId ||
              copy.teacherName !== mainQuota.primaryTeacherName ||
              copy.teacherCode !== mainQuota.primaryTeacherCode
            : !copy.teacherId

        if (shouldFillMain) {
          copy.teacherId = mainQuota.primaryTeacherId
          copy.teacherCode = mainQuota.primaryTeacherCode || null
          copy.teacherName = mainQuota.primaryTeacherName || null
          filledPrimaryCount++
          changed = true
        }

        if (
          !copy.coTeacherId &&
          mainQuota.coTeacherId &&
          mainQuota.assignmentSource === "CTQT_ASSIGNMENT"
        ) {
          copy.coTeacherId = mainQuota.coTeacherId
          copy.coTeacherCode = mainQuota.coTeacherCode || null
          copy.coTeacherName = mainQuota.coTeacherName || null
          changed = true
        }
      }
    }

    // 2. Alternating subject (Luân phiên) resolution & teacher auto-sync
    const hasAlt = Boolean(copy.altSubjectId || (copy.altSubjectName && copy.altSubjectName.trim()))
    if (hasAlt) {
      const altSub =
        (copy.altSubjectId ? subjectById.get(copy.altSubjectId) : undefined) ||
        (copy.altSubjectName
          ? subjectByCodeOrName.get(copy.altSubjectName.trim().toUpperCase())
          : undefined)

      if (altSub) {
        if (copy.altSubjectId !== altSub.id) {
          copy.altSubjectId = altSub.id
          changed = true
        }
        if (!copy.altSubjectName) {
          copy.altSubjectName = altSub.subjectName
          changed = true
        }

        const altQuota = quotaByClassSub.get(`${copy.classId}::${altSub.id}`)
        if (altQuota?.primaryTeacherId) {
          const shouldFillAlt =
            mode === "SYNC_ALL_ASSIGNED"
              ? copy.altTeacherId !== altQuota.primaryTeacherId ||
                copy.altTeacherName !== altQuota.primaryTeacherName ||
                copy.altTeacherCode !== altQuota.primaryTeacherCode
              : !copy.altTeacherId

          if (shouldFillAlt) {
            copy.altTeacherId = altQuota.primaryTeacherId
            copy.altTeacherCode = altQuota.primaryTeacherCode || null
            copy.altTeacherName = altQuota.primaryTeacherName || null
            filledAltCount++
            changed = true
          }
        }
      }
    }

    if (changed) {
      updatedCount++
      return copy
    }
    return slot
  })

  return {
    slots: nextSlots,
    filledPrimaryCount,
    filledAltCount,
    updatedCount,
  }
}
