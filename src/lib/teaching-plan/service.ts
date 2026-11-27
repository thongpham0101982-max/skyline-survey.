import crypto from "crypto"
import { prisma } from "@/lib/db"
import { ensureTeachingPlanSchema } from "./schemaInit"
import {
  assertCanApprovePlan,
  assertCanLinkClassSubject,
  assertCanManagePlan,
  TeachingPlanAccessError,
  type TeachingPlanAuthContext,
} from "./rbac"
import {
  buildDeterministicSkeletonPeriodCode,
  isAssessmentLessonName,
  splitObjectiveLines,
} from "./excelService"
import type {
  ImpactedPeriodLink,
  ObjectiveEvidenceStatus,
  ObservationTeachingPlanSnapshot,
  ObservationTeachingPlanView,
  ParsedExcelLesson,
  ParsedExcelPeriod,
  PrePublishCheckResult,
  TeachingPlanAttachment,
  TeachingPlanLessonRecord,
  TeachingPlanPeriodRecord,
  TeachingPlanRecord,
  TeachingPlanScopeType,
  TeachingPlanVersionRecord,
} from "./types"

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(9).toString("hex")}`
}

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (!raw || typeof raw !== "string") return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function normalizeLevelLabel(level?: string | null): string {
  const raw = (level || "").trim()
  const norm = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
  if (norm.includes("tieu hoc") || norm === "primary" || norm === "tieu_hoc") return "Tiểu học"
  if (norm.includes("thcs") || norm === "middle") return "THCS"
  if (norm.includes("thpt") || norm === "high") return "THPT"
  if (norm.includes("mam non") || norm === "preschool" || norm === "mam_non") return "Mầm non"
  return raw
}

function levelMatchesSubjectField(levelLabel: string, subjectLevelField?: string | null): boolean {
  const f = (subjectLevelField || "").toUpperCase()
  if (!f || f.includes("ALL")) return true
  if (levelLabel === "Tiểu học") return f.includes("PRIMARY") || f.includes("TIỂU HỌC") || f.includes("TIEU_HOC")
  if (levelLabel === "THCS") return f.includes("MIDDLE") || f.includes("THCS")
  if (levelLabel === "THPT") return f.includes("HIGH") || f.includes("THPT")
  if (levelLabel === "Mầm non") return f.includes("PRESCHOOL") || f.includes("MẦM NON")
  return true
}

function normalizeGradeKey(grade?: string | null): string {
  return (grade || "")
    .trim()
    .replace(/^khối\s*/i, "")
    .replace(/^k\s*/i, "")
    .trim()
}

function normalizeProgramToken(program?: string | null): string {
  const raw = (program || "").trim()
  const upper = raw.toUpperCase()
  if (upper === "HNS" || upper.includes("HỆ S") || upper.includes("HE S") || upper.includes("HỘI NHẬP SKY-LINE")) {
    return "Hệ S"
  }
  if (upper === "HNG" || upper.includes("HỆ I") || upper.includes("HE I") || upper.includes("HỘI NHẬP QUỐC TẾ")) {
    return "Hệ I"
  }
  if (upper === "SB" || upper.includes("SONG BẰNG")) {
    return "Song bằng"
  }
  return raw
}

function mapPlanRow(r: any): TeachingPlanRecord {
  return {
    id: String(r.id),
    academicYearId: String(r.academicYearId),
    level: String(r.level),
    grade: String(r.grade),
    subjectId: String(r.subjectId),
    subjectCode: r.subjectCode ? String(r.subjectCode) : null,
    subjectName: String(r.subjectName),
    programCode: String(r.programCode || ""),
    programName: String(r.programName || ""),
    scopeType: (r.scopeType === "CAMPUS" ? "CAMPUS" : "SYSTEM") as TeachingPlanScopeType,
    campusId: r.campusId ? String(r.campusId) : null,
    campusCode: r.campusCode ? String(r.campusCode) : null,
    title: String(r.title),
    activePublishedVersionId: r.activePublishedVersionId ? String(r.activePublishedVersionId) : null,
    syncToObservation: Boolean(Number(r.syncToObservation || 0)),
    syncedToObservationAt: r.syncedToObservationAt ? String(r.syncedToObservationAt) : null,
    syncedToObservationByName: r.syncedToObservationByName ? String(r.syncedToObservationByName) : null,
    status: String(r.status || "ACTIVE"),
    createdById: r.createdById ? String(r.createdById) : null,
    createdByName: r.createdByName ? String(r.createdByName) : null,
    createdAt: r.createdAt ? String(r.createdAt) : "",
    updatedAt: r.updatedAt ? String(r.updatedAt) : "",
  }
}

function mapVersionRow(r: any): TeachingPlanVersionRecord {
  return {
    id: String(r.id),
    planId: String(r.planId),
    versionNumber: Number(r.versionNumber || 1),
    status: String(r.status || "DRAFT") as TeachingPlanVersionRecord["status"],
    revision: Number(r.revision || 1),
    baseVersionId: r.baseVersionId ? String(r.baseVersionId) : null,
    changeSummary: r.changeSummary ? String(r.changeSummary) : null,
    reviewComment: r.reviewComment ? String(r.reviewComment) : null,
    createdById: r.createdById ? String(r.createdById) : null,
    createdByName: r.createdByName ? String(r.createdByName) : null,
    updatedById: r.updatedById ? String(r.updatedById) : null,
    updatedByName: r.updatedByName ? String(r.updatedByName) : null,
    submittedById: r.submittedById ? String(r.submittedById) : null,
    submittedByName: r.submittedByName ? String(r.submittedByName) : null,
    submittedAt: r.submittedAt ? String(r.submittedAt) : null,
    reviewedById: r.reviewedById ? String(r.reviewedById) : null,
    reviewedByName: r.reviewedByName ? String(r.reviewedByName) : null,
    reviewedAt: r.reviewedAt ? String(r.reviewedAt) : null,
    publishedById: r.publishedById ? String(r.publishedById) : null,
    publishedByName: r.publishedByName ? String(r.publishedByName) : null,
    publishedAt: r.publishedAt ? String(r.publishedAt) : null,
    createdAt: r.createdAt ? String(r.createdAt) : "",
    updatedAt: r.updatedAt ? String(r.updatedAt) : "",
  }
}

export function estimateAcademicWeekFromDate(
  dateInput: Date | string,
  academicYearStart?: Date | string | null
): number | null {
  const dt = new Date(dateInput)
  if (isNaN(dt.getTime())) return null
  const start = academicYearStart ? new Date(academicYearStart) : null
  if (!start || isNaN(start.getTime())) return null
  // Academic instruction typically starts first Monday of September (or startDate if already Sep)
  const instructionStart =
    start.getMonth() < 8
      ? new Date(start.getFullYear(), 8, 1)
      : start
  const diffDays = Math.floor((dt.getTime() - instructionStart.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 1
  return Math.min(40, Math.floor(diffDays / 7) + 1)
}

/**
 * 1. Dependent Catalog Loader for Năm học -> Bậc học -> Khối -> Môn + Chương trình + Cơ sở
 */
export async function getTeachingPlanCatalogs(params: {
  academicYearId?: string
  level?: string
  grade?: string
}) {
  await ensureTeachingPlanSchema()

  const years = await prisma.academicYear.findMany({
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    select: { id: true, name: true, status: true, startDate: true, endDate: true },
  })
  const activeYear = years.find((y) => y.status === "ACTIVE") || years[0] || null
  const selectedYearId = params.academicYearId || activeYear?.id || ""

  const campuses = await prisma.campus.findMany({
    where: { status: "ACTIVE" },
    orderBy: { campusCode: "asc" },
    select: { id: true, campusCode: true, campusName: true },
  })

  // Distinct levels & grades from classes (with standard fallback)
  const classesInYear = await prisma.class.findMany({
    where: selectedYearId ? { academicYearId: selectedYearId } : undefined,
    select: { level: true, grade: true, educationSystem: true },
  })

  const allClassesFallback =
    classesInYear.length > 0
      ? classesInYear
      : await prisma.class.findMany({
          select: { level: true, grade: true, educationSystem: true },
          take: 500,
        })

  const STANDARD_GRADES: Record<string, string[]> = {
    "Tiểu học": ["1", "2", "3", "4", "5"],
    THCS: ["6", "7", "8", "9"],
    THPT: ["10", "11", "12"],
    "Mầm non": ["Nhà trẻ", "Mẫu giáo bé", "Mẫu giáo nhỡ", "Mẫu giáo lớn"],
  }

  const gradesByLevel = new Map<string, Set<string>>()
  for (const [lvl, list] of Object.entries(STANDARD_GRADES)) {
    gradesByLevel.set(lvl, new Set(list))
  }
  for (const c of allClassesFallback) {
    const lvl = normalizeLevelLabel(c.level)
    const g = normalizeGradeKey(c.grade)
    if (!lvl || !g || g.toLowerCase().includes("ko thấy")) continue
    if (!gradesByLevel.has(lvl)) gradesByLevel.set(lvl, new Set())
    gradesByLevel.get(lvl)!.add(g)
  }

  const levels = ["Tiểu học", "THCS", "THPT", "Mầm non"].filter((l) => gradesByLevel.has(l))
  const selectedLevel = params.level ? normalizeLevelLabel(params.level) : ""
  const grades = selectedLevel
    ? Array.from(gradesByLevel.get(selectedLevel) || []).sort((a, b) => {
        const na = Number(a)
        const nb = Number(b)
        if (!isNaN(na) && !isNaN(nb)) return na - nb
        return a.localeCompare(b, "vi")
      })
    : []

  const selectedGrade = params.grade ? normalizeGradeKey(params.grade) : ""
  let subjects: Array<{
    id: string
    subjectCode: string
    subjectName: string
    studyPrograms: string | null
  }> = []

  if (selectedYearId && selectedLevel && selectedGrade) {
    const gradeNum = Number(selectedGrade)
    const quotaField = !isNaN(gradeNum) && gradeNum >= 1 && gradeNum <= 12 ? `quotaG${gradeNum}` : null

    const [quotas, allActiveSubjects] = await Promise.all([
      prisma.subjectQuota.findMany({
        where: { academicYearId: selectedYearId },
        include: {
          subject: {
            select: {
              id: true,
              subjectCode: true,
              subjectName: true,
              level: true,
              studyPrograms: true,
              status: true,
            },
          },
        },
      }),
      prisma.subject.findMany({
        where: { status: "ACTIVE" },
        orderBy: { subjectName: "asc" },
        select: {
          id: true,
          subjectCode: true,
          subjectName: true,
          level: true,
          studyPrograms: true,
        },
      }),
    ])

    const configuredSubjectIds = new Set<string>()
    for (const q of quotas) {
      if (!q.subject || q.subject.status !== "ACTIVE") continue
      const gradeQuota = quotaField ? Number((q as any)[quotaField] || 0) : 0
      const levelQuota =
        selectedLevel === "Tiểu học"
          ? Number(q.quotaPrimary || 0)
          : selectedLevel === "THCS"
          ? Number(q.quotaMiddle || 0)
          : selectedLevel === "THPT"
          ? Number(q.quotaHigh || 0)
          : 0
      if (gradeQuota > 0 || (!quotaField && levelQuota > 0)) {
        configuredSubjectIds.add(q.subject.id)
      }
    }

    // Also include subjects that already have teaching assignments or teaching plans for this year/grade
    const existingPlanSubjRows = (await prisma.$queryRawUnsafe(
      `SELECT DISTINCT "subjectId" FROM "teaching_plans" WHERE "academicYearId" = ? AND "level" = ? AND "grade" = ?`,
      selectedYearId,
      selectedLevel,
      selectedGrade
    )) as Array<{ subjectId: string }>
    for (const r of existingPlanSubjRows) {
      if (r.subjectId) configuredSubjectIds.add(String(r.subjectId))
    }

    const filtered = allActiveSubjects.filter((s) => {
      if (configuredSubjectIds.size > 0) {
        return configuredSubjectIds.has(s.id) || (levelMatchesSubjectField(selectedLevel, s.level) && s.subjectCode === "TOA")
      }
      return levelMatchesSubjectField(selectedLevel, s.level)
    })

    subjects = filtered.map((s) => ({
      id: s.id,
      subjectCode: s.subjectCode,
      subjectName: s.subjectName,
      studyPrograms: s.studyPrograms,
    }))
  }

  const edSystems = selectedYearId
    ? await prisma.educationSystem.findMany({
        where: { academicYearId: selectedYearId, status: "ACTIVE" },
        orderBy: { code: "asc" },
        select: { code: true, name: true },
      })
    : []

  const programOptions = [
    { code: "", name: "Dùng chung (Mặc định)" },
    { code: "Hệ S", name: "Hệ S (Hội nhập Sky-Line)" },
    { code: "Hệ I", name: "Hệ I (Hội nhập Quốc tế)" },
    { code: "Song bằng", name: "Song bằng Quốc tế" },
  ]
  for (const es of edSystems) {
    const norm = normalizeProgramToken(es.code)
    if (!programOptions.some((p) => p.code === norm)) {
      programOptions.push({ code: es.code, name: es.name })
    }
  }

  return {
    academicYears: years,
    defaultAcademicYearId: activeYear?.id || "",
    levels,
    grades,
    subjects,
    programs: programOptions,
    campuses,
  }
}

/**
 * 2. Load plans matching (academicYearId, level, grade, subjectId) + optional program/scope filters
 */
export async function listTeachingPlans(params: {
  academicYearId: string
  level: string
  grade: string
  subjectId: string
  programCode?: string
  scopeType?: TeachingPlanScopeType
  campusId?: string
  ctx: TeachingPlanAuthContext
}) {
  await ensureTeachingPlanSchema()

  const normLevel = normalizeLevelLabel(params.level)
  const normGrade = normalizeGradeKey(params.grade)

  const rawPlans = (await prisma.$queryRawUnsafe(
    `SELECT * FROM "teaching_plans"
     WHERE "academicYearId" = ? AND "level" = ? AND "grade" = ? AND "subjectId" = ? AND "status" = 'ACTIVE'
     ORDER BY "scopeType" ASC, "programCode" ASC, "createdAt" DESC`,
    params.academicYearId,
    normLevel,
    normGrade,
    params.subjectId
  )) as any[]

  let plans = rawPlans.map(mapPlanRow)

  // Teachers (non-managers) only see plans that have a published version and are either SYSTEM or in their campus
  if (params.ctx.isTeacherOnly) {
    plans = plans.filter(
      (p) =>
        Boolean(p.activePublishedVersionId) &&
        (p.scopeType === "SYSTEM" ||
          (p.campusId && params.ctx.allowedCampusIds.includes(p.campusId)))
    )
  }

  const distinctPrograms = Array.from(
    new Set(plans.map((p) => p.programCode).filter(Boolean))
  )
  const distinctScopes = Array.from(
    new Set(plans.map((p) => (p.scopeType === "CAMPUS" ? `CAMPUS:${p.campusId || ""}` : "SYSTEM")))
  )

  const needsProgramFilter = distinctPrograms.length > 1 || (plans.length > 1 && distinctPrograms.length > 0)
  const needsScopeFilter = distinctScopes.length > 1

  let filteredPlans = plans
  if (params.programCode !== undefined && params.programCode !== "ALL") {
    filteredPlans = filteredPlans.filter((p) => p.programCode === params.programCode)
  }
  if (params.scopeType) {
    filteredPlans = filteredPlans.filter((p) => p.scopeType === params.scopeType)
  }
  if (params.campusId && params.campusId !== "ALL") {
    filteredPlans = filteredPlans.filter((p) => p.campusId === params.campusId)
  }

  // Enrich with version summaries
  const enriched = await Promise.all(
    filteredPlans.map(async (plan) => {
      const versionRows = (await prisma.$queryRawUnsafe(
        `SELECT * FROM "teaching_plan_versions" WHERE "planId" = ? ORDER BY "versionNumber" DESC`,
        plan.id
      )) as any[]
      const versions = versionRows.map(mapVersionRow)
      const activeDraft =
        versions.find((v) => v.status === "DRAFT" || v.status === "PENDING_APPROVAL") || null
      const activePublished =
        versions.find((v) => v.id === plan.activePublishedVersionId) ||
        versions.find((v) => v.status === "PUBLISHED") ||
        null

      return {
        ...plan,
        versions: params.ctx.isTeacherOnly
          ? versions.filter((v) => v.status === "PUBLISHED")
          : versions,
        activeDraft,
        activePublished,
      }
    })
  )

  return {
    plans: enriched,
    totalPlansInSlot: plans.length,
    needsProgramFilter,
    needsScopeFilter,
    availablePrograms: distinctPrograms,
  }
}

/**
 * 3. Load full version detail (lessons + nested periods)
 */
export async function getVersionDetail(versionId: string): Promise<{
  plan: TeachingPlanRecord
  version: TeachingPlanVersionRecord
  lessons: TeachingPlanLessonRecord[]
}> {
  await ensureTeachingPlanSchema()

  const vRows = (await prisma.$queryRawUnsafe(
    `SELECT * FROM "teaching_plan_versions" WHERE "id" = ? LIMIT 1`,
    versionId
  )) as any[]
  if (!vRows[0]) {
    throw new TeachingPlanAccessError("Không tìm thấy phiên bản kế hoạch dạy học.", "NOT_FOUND", 404)
  }
  const version = mapVersionRow(vRows[0])

  const pRows = (await prisma.$queryRawUnsafe(
    `SELECT * FROM "teaching_plans" WHERE "id" = ? LIMIT 1`,
    version.planId
  )) as any[]
  if (!pRows[0]) {
    throw new TeachingPlanAccessError("Không tìm thấy kế hoạch dạy học.", "NOT_FOUND", 404)
  }
  const plan = mapPlanRow(pRows[0])

  const lessonRows = (await prisma.$queryRawUnsafe(
    `SELECT * FROM "teaching_plan_lessons"
     WHERE "versionId" = ?
     ORDER BY "semester" ASC, "weekFrom" ASC, "sortOrder" ASC, "lessonCode" ASC`,
    versionId
  )) as any[]

  const periodRows = (await prisma.$queryRawUnsafe(
    `SELECT * FROM "teaching_plan_periods"
     WHERE "versionId" = ?
     ORDER BY "periodIndexInLesson" ASC, "sortOrder" ASC, "periodCode" ASC`,
    versionId
  )) as any[]

  const periodsByLesson = new Map<string, TeachingPlanPeriodRecord[]>()
  for (const r of periodRows) {
    const p: TeachingPlanPeriodRecord = {
      id: String(r.id),
      versionId: String(r.versionId),
      lessonId: String(r.lessonId),
      stableLessonId: String(r.stableLessonId),
      stablePeriodId: String(r.stablePeriodId),
      periodCode: String(r.periodCode),
      periodIndexInLesson: Number(r.periodIndexInLesson || 1),
      plannedWeek: Number(r.plannedWeek || 1),
      focus: String(r.focus || ""),
      objectives: String(r.objectives || ""),
      expectedEvidence: String(r.expectedEvidence || ""),
      adjustments: String(r.adjustments || ""),
      attachments: safeJsonParse<TeachingPlanAttachment[]>(r.attachmentsJson, []),
      isSkeleton: Boolean(Number(r.isSkeleton || 0)),
      sortOrder: Number(r.sortOrder || 0),
    }
    const list = periodsByLesson.get(p.lessonId) || []
    list.push(p)
    periodsByLesson.set(p.lessonId, list)
  }

  const lessons: TeachingPlanLessonRecord[] = lessonRows.map((r) => ({
    id: String(r.id),
    versionId: String(r.versionId),
    stableLessonId: String(r.stableLessonId),
    lessonCode: String(r.lessonCode),
    semester: Number(r.semester || 1),
    weekFrom: Number(r.weekFrom || 1),
    weekTo: Number(r.weekTo || 1),
    topicName: String(r.topicName || ""),
    lessonName: String(r.lessonName || ""),
    periodCount: Number(r.periodCount || 1),
    objectives: String(r.objectives || ""),
    adjustments: String(r.adjustments || ""),
    projectNotes: String(r.projectNotes || ""),
    attachments: safeJsonParse<TeachingPlanAttachment[]>(r.attachmentsJson, []),
    isAssessmentRow: Boolean(Number(r.isAssessmentRow || 0)),
    assessmentConfirmed: Boolean(Number(r.assessmentConfirmed || 0)),
    assessmentOrgNote: String(r.assessmentOrgNote || ""),
    sortOrder: Number(r.sortOrder || 0),
    periods: periodsByLesson.get(String(r.id)) || [],
  }))

  return { plan, version, lessons }
}

/**
 * 4. Create new Teaching Plan + Version 1 (DRAFT)
 */
export async function createTeachingPlan(params: {
  academicYearId: string
  level: string
  grade: string
  subjectId: string
  programCode?: string
  programName?: string
  scopeType: TeachingPlanScopeType
  campusId?: string | null
  title?: string
  ctx: TeachingPlanAuthContext
}) {
  await ensureTeachingPlanSchema()
  assertCanManagePlan(params.ctx, params.scopeType, params.campusId)

  const normLevel = normalizeLevelLabel(params.level)
  const normGrade = normalizeGradeKey(params.grade)
  const programCode = (params.programCode || "").trim()
  const programName = (params.programName || programCode).trim()
  const campusId = params.scopeType === "CAMPUS" ? params.campusId || null : null

  const [year, subject, campus] = await Promise.all([
    prisma.academicYear.findUnique({ where: { id: params.academicYearId } }),
    prisma.subject.findUnique({ where: { id: params.subjectId } }),
    campusId ? prisma.campus.findUnique({ where: { id: campusId } }) : Promise.resolve(null),
  ])

  if (!year) {
    throw new TeachingPlanAccessError("Năm học không tồn tại.", "VALIDATION_ERROR", 400)
  }
  if (!subject) {
    throw new TeachingPlanAccessError("Môn học không tồn tại.", "VALIDATION_ERROR", 400)
  }
  if (params.scopeType === "CAMPUS" && !campus) {
    throw new TeachingPlanAccessError("Cơ sở áp dụng không tồn tại.", "VALIDATION_ERROR", 400)
  }

  // Prevent exact duplicate plan
  const existing = (await prisma.$queryRawUnsafe(
    `SELECT "id" FROM "teaching_plans"
     WHERE "academicYearId" = ? AND "level" = ? AND "grade" = ? AND "subjectId" = ?
       AND "programCode" = ? AND "scopeType" = ? AND COALESCE("campusId", '') = ? AND "status" = 'ACTIVE'
     LIMIT 1`,
    params.academicYearId,
    normLevel,
    normGrade,
    params.subjectId,
    programCode,
    params.scopeType,
    campusId || ""
  )) as any[]

  if (existing.length > 0) {
    throw new TeachingPlanAccessError(
      "Kế hoạch dạy học cho tổ hợp Năm học / Bậc / Khối / Môn / Chương trình / Phạm vi này đã tồn tại.",
      "CONFLICT",
      409
    )
  }

  const planId = newId("tp")
  const versionId = newId("tpv")
  const title =
    (params.title || "").trim() ||
    `KHDH ${subject.subjectName} - Khối ${normGrade} (${normLevel})${programName ? ` • ${programName}` : ""}${
      campus ? ` • ${campus.campusCode}` : ""
    }`

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `INSERT INTO "teaching_plans" (
        "id", "academicYearId", "level", "grade", "subjectId", "subjectCode", "subjectName",
        "programCode", "programName", "scopeType", "campusId", "campusCode", "title",
        "status", "createdById", "createdByName"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
      planId,
      params.academicYearId,
      normLevel,
      normGrade,
      subject.id,
      subject.subjectCode,
      subject.subjectName,
      programCode,
      programName,
      params.scopeType,
      campusId,
      campus?.campusCode || null,
      title,
      params.ctx.userId,
      params.ctx.actorName
    )

    await tx.$executeRawUnsafe(
      `INSERT INTO "teaching_plan_versions" (
        "id", "planId", "versionNumber", "status", "revision",
        "createdById", "createdByName", "updatedById", "updatedByName"
      ) VALUES (?, ?, 1, 'DRAFT', 1, ?, ?, ?, ?)`,
      versionId,
      planId,
      params.ctx.userId,
      params.ctx.actorName,
      params.ctx.userId,
      params.ctx.actorName
    )

    await tx.$executeRawUnsafe(
      `INSERT INTO "teaching_plan_audit_logs" ("id", "planId", "versionId", "action", "actorId", "actorName", "detailsJson")
       VALUES (?, ?, ?, 'CREATE_PLAN', ?, ?, ?)`,
      newId("tpal"),
      planId,
      versionId,
      params.ctx.userId,
      params.ctx.actorName,
      JSON.stringify({ title, scopeType: params.scopeType, campusCode: campus?.campusCode || null })
    )
  })

  return getVersionDetail(versionId)
}

/**
 * 5. Create a new DRAFT cloned from the active PUBLISHED version (preserving stableLessonId & stablePeriodId!)
 */
export async function createDraftFromPublished(planId: string, ctx: TeachingPlanAuthContext) {
  await ensureTeachingPlanSchema()

  const planRows = (await prisma.$queryRawUnsafe(
    `SELECT * FROM "teaching_plans" WHERE "id" = ? LIMIT 1`,
    planId
  )) as any[]
  if (!planRows[0]) {
    throw new TeachingPlanAccessError("Không tìm thấy kế hoạch dạy học.", "NOT_FOUND", 404)
  }
  const plan = mapPlanRow(planRows[0])
  assertCanManagePlan(ctx, plan.scopeType, plan.campusId)

  const existingVersions = (await prisma.$queryRawUnsafe(
    `SELECT * FROM "teaching_plan_versions" WHERE "planId" = ? ORDER BY "versionNumber" DESC`,
    planId
  )) as any[]

  const openDraft = existingVersions.find((v) => v.status === "DRAFT")
  if (openDraft) {
    return getVersionDetail(String(openDraft.id))
  }
  const pendingVer = existingVersions.find((v) => v.status === "PENDING_APPROVAL")
  if (pendingVer) {
    throw new TeachingPlanAccessError(
      `Đang có phiên bản v${pendingVer.versionNumber} ở trạng thái Chờ duyệt. Vui lòng duyệt hoặc yêu cầu chỉnh sửa trước khi tạo bản nháp mới.`,
      "CONFLICT",
      409
    )
  }

  const maxVersionNum = existingVersions.reduce(
    (max, v) => Math.max(max, Number(v.versionNumber || 0)),
    0
  )
  const baseVersionId =
    plan.activePublishedVersionId ||
    (existingVersions.find((v) => v.status === "PUBLISHED")?.id
      ? String(existingVersions.find((v) => v.status === "PUBLISHED").id)
      : null)

  const newVersionId = newId("tpv")
  const nextVersionNumber = maxVersionNum + 1

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `INSERT INTO "teaching_plan_versions" (
        "id", "planId", "versionNumber", "status", "revision", "baseVersionId",
        "createdById", "createdByName", "updatedById", "updatedByName"
      ) VALUES (?, ?, ?, 'DRAFT', 1, ?, ?, ?, ?, ?)`,
      newVersionId,
      planId,
      nextVersionNumber,
      baseVersionId,
      ctx.userId,
      ctx.actorName,
      ctx.userId,
      ctx.actorName
    )

    if (baseVersionId) {
      const baseLessons = (await tx.$queryRawUnsafe(
        `SELECT * FROM "teaching_plan_lessons" WHERE "versionId" = ? ORDER BY "sortOrder" ASC`,
        baseVersionId
      )) as any[]
      const basePeriods = (await tx.$queryRawUnsafe(
        `SELECT * FROM "teaching_plan_periods" WHERE "versionId" = ? ORDER BY "sortOrder" ASC`,
        baseVersionId
      )) as any[]

      const oldToNewLessonId = new Map<string, string>()
      for (const l of baseLessons) {
        const clonedLessonId = newId("tpl")
        oldToNewLessonId.set(String(l.id), clonedLessonId)
        await tx.$executeRawUnsafe(
          `INSERT INTO "teaching_plan_lessons" (
            "id", "versionId", "stableLessonId", "lessonCode", "semester", "weekFrom", "weekTo",
            "topicName", "lessonName", "periodCount", "objectives", "adjustments", "projectNotes",
            "attachmentsJson", "isAssessmentRow", "assessmentConfirmed", "assessmentOrgNote", "sortOrder"
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          clonedLessonId,
          newVersionId,
          String(l.stableLessonId),
          String(l.lessonCode),
          Number(l.semester),
          Number(l.weekFrom),
          Number(l.weekTo),
          String(l.topicName),
          String(l.lessonName),
          Number(l.periodCount),
          String(l.objectives || ""),
          String(l.adjustments || ""),
          String(l.projectNotes || ""),
          String(l.attachmentsJson || "[]"),
          Number(l.isAssessmentRow || 0),
          Number(l.assessmentConfirmed || 0),
          String(l.assessmentOrgNote || ""),
          Number(l.sortOrder || 0)
        )
      }

      for (const p of basePeriods) {
        const clonedLessonId = oldToNewLessonId.get(String(p.lessonId))
        if (!clonedLessonId) continue
        await tx.$executeRawUnsafe(
          `INSERT INTO "teaching_plan_periods" (
            "id", "versionId", "lessonId", "stableLessonId", "stablePeriodId", "periodCode",
            "periodIndexInLesson", "plannedWeek", "focus", "objectives", "expectedEvidence",
            "adjustments", "attachmentsJson", "isSkeleton", "sortOrder"
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          newId("tpp"),
          newVersionId,
          clonedLessonId,
          String(p.stableLessonId),
          String(p.stablePeriodId),
          String(p.periodCode),
          Number(p.periodIndexInLesson),
          Number(p.plannedWeek),
          String(p.focus || ""),
          String(p.objectives || ""),
          String(p.expectedEvidence || ""),
          String(p.adjustments || ""),
          String(p.attachmentsJson || "[]"),
          Number(p.isSkeleton || 0),
          Number(p.sortOrder || 0)
        )
      }
    }

    await tx.$executeRawUnsafe(
      `INSERT INTO "teaching_plan_audit_logs" ("id", "planId", "versionId", "action", "actorId", "actorName", "detailsJson")
       VALUES (?, ?, ?, 'CREATE_DRAFT', ?, ?, ?)`,
      newId("tpal"),
      planId,
      newVersionId,
      ctx.userId,
      ctx.actorName,
      JSON.stringify({ versionNumber: nextVersionNumber, baseVersionId })
    )
  })

  return getVersionDetail(newVersionId)
}

/**
 * 6. Commit validated Excel import into a DRAFT version (idempotent upsert by lessonCode & periodCode)
 * - Reuses stableLessonId / stablePeriodId across versions of the same plan
 * - Preserves lessons/periods absent in the uploaded file
 * - Runs in a single DB transaction
 */
export async function commitExcelImportToDraft(params: {
  versionId: string
  expectedRevision?: number
  lessons: ParsedExcelLesson[]
  periods: ParsedExcelPeriod[]
  ctx: TeachingPlanAuthContext
}) {
  await ensureTeachingPlanSchema()

  const detail = await getVersionDetail(params.versionId)
  assertCanManagePlan(params.ctx, detail.plan.scopeType, detail.plan.campusId)

  if (detail.version.status !== "DRAFT") {
    throw new TeachingPlanAccessError(
      "Chỉ có thể nhập Excel vào phiên bản đang ở trạng thái Nháp.",
      "CONFLICT",
      409
    )
  }
  if (
    params.expectedRevision !== undefined &&
    params.expectedRevision !== detail.version.revision
  ) {
    throw new TeachingPlanAccessError(
      "Phiên bản này vừa được người khác cập nhật. Vui lòng tải lại trước khi nhập Excel.",
      "CONFLICT",
      409
    )
  }

  // Build stable ID lookup across ALL versions of this plan so re-imports & skeleton upgrades keep stable IDs!
  const historicalLessons = (await prisma.$queryRawUnsafe(
    `SELECT l."lessonCode", l."stableLessonId"
     FROM "teaching_plan_lessons" l
     JOIN "teaching_plan_versions" v ON v."id" = l."versionId"
     WHERE v."planId" = ?`,
    detail.plan.id
  )) as Array<{ lessonCode: string; stableLessonId: string }>

  const historicalPeriods = (await prisma.$queryRawUnsafe(
    `SELECT p."periodCode", p."stablePeriodId"
     FROM "teaching_plan_periods" p
     JOIN "teaching_plan_versions" v ON v."id" = p."versionId"
     WHERE v."planId" = ?`,
    detail.plan.id
  )) as Array<{ periodCode: string; stablePeriodId: string }>

  const stableLessonByCode = new Map<string, string>()
  for (const hl of historicalLessons) {
    stableLessonByCode.set(String(hl.lessonCode), String(hl.stableLessonId))
  }
  const stablePeriodByCode = new Map<string, string>()
  for (const hp of historicalPeriods) {
    stablePeriodByCode.set(String(hp.periodCode), String(hp.stablePeriodId))
  }

  const currentLessonByCode = new Map<string, TeachingPlanLessonRecord>()
  const currentPeriodByCode = new Map<string, TeachingPlanPeriodRecord>()
  for (const l of detail.lessons) {
    currentLessonByCode.set(l.lessonCode, l)
    for (const p of l.periods) {
      currentPeriodByCode.set(p.periodCode, p)
    }
  }

  await prisma.$transaction(async (tx) => {
    const lessonIdByCode = new Map<string, { id: string; stableLessonId: string }>()
    let sortIdx = detail.lessons.length

    for (const l of params.lessons) {
      const existing = currentLessonByCode.get(l.lessonCode)
      if (existing) {
        lessonIdByCode.set(l.lessonCode, {
          id: existing.id,
          stableLessonId: existing.stableLessonId,
        })
        await tx.$executeRawUnsafe(
          `UPDATE "teaching_plan_lessons"
           SET "semester" = ?, "weekFrom" = ?, "weekTo" = ?, "topicName" = ?, "lessonName" = ?,
               "periodCount" = ?, "objectives" = ?, "adjustments" = ?, "projectNotes" = ?,
               "isAssessmentRow" = ?, "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = ?`,
          l.semester,
          l.weekFrom,
          l.weekTo,
          l.topicName,
          l.lessonName,
          l.periodCount,
          l.objectives,
          l.adjustments,
          l.projectNotes || existing.projectNotes,
          l.isAssessmentRow ? 1 : 0,
          existing.id
        )
      } else {
        const id = newId("tpl")
        const stableLessonId = stableLessonByCode.get(l.lessonCode) || newId("sl")
        stableLessonByCode.set(l.lessonCode, stableLessonId)
        lessonIdByCode.set(l.lessonCode, { id, stableLessonId })
        sortIdx++
        await tx.$executeRawUnsafe(
          `INSERT INTO "teaching_plan_lessons" (
            "id", "versionId", "stableLessonId", "lessonCode", "semester", "weekFrom", "weekTo",
            "topicName", "lessonName", "periodCount", "objectives", "adjustments", "projectNotes",
            "isAssessmentRow", "sortOrder"
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id,
          params.versionId,
          stableLessonId,
          l.lessonCode,
          l.semester,
          l.weekFrom,
          l.weekTo,
          l.topicName,
          l.lessonName,
          l.periodCount,
          l.objectives,
          l.adjustments,
          l.projectNotes,
          l.isAssessmentRow ? 1 : 0,
          sortIdx
        )
      }
    }

    for (const p of params.periods) {
      const parent = lessonIdByCode.get(p.lessonCode)
      if (!parent) continue
      const existing = currentPeriodByCode.get(p.periodCode)
      if (existing) {
        await tx.$executeRawUnsafe(
          `UPDATE "teaching_plan_periods"
           SET "lessonId" = ?, "stableLessonId" = ?, "periodIndexInLesson" = ?, "plannedWeek" = ?,
               "focus" = ?, "objectives" = ?, "expectedEvidence" = ?, "adjustments" = ?,
               "isSkeleton" = ?, "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = ?`,
          parent.id,
          parent.stableLessonId,
          p.periodIndexInLesson,
          p.plannedWeek,
          p.focus,
          p.objectives,
          p.expectedEvidence,
          p.adjustments,
          p.isSkeleton ? 1 : 0,
          existing.id
        )
      } else {
        const stablePeriodId = stablePeriodByCode.get(p.periodCode) || newId("sp")
        stablePeriodByCode.set(p.periodCode, stablePeriodId)
        await tx.$executeRawUnsafe(
          `INSERT INTO "teaching_plan_periods" (
            "id", "versionId", "lessonId", "stableLessonId", "stablePeriodId", "periodCode",
            "periodIndexInLesson", "plannedWeek", "focus", "objectives", "expectedEvidence",
            "adjustments", "isSkeleton", "sortOrder"
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          newId("tpp"),
          params.versionId,
          parent.id,
          parent.stableLessonId,
          stablePeriodId,
          p.periodCode,
          p.periodIndexInLesson,
          p.plannedWeek,
          p.focus,
          p.objectives,
          p.expectedEvidence,
          p.adjustments,
          p.isSkeleton ? 1 : 0,
          p.periodIndexInLesson
        )
      }
    }

    await tx.$executeRawUnsafe(
      `UPDATE "teaching_plan_versions"
       SET "revision" = "revision" + 1, "updatedById" = ?, "updatedByName" = ?, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = ?`,
      params.ctx.userId,
      params.ctx.actorName,
      params.versionId
    )

    await tx.$executeRawUnsafe(
      `INSERT INTO "teaching_plan_audit_logs" ("id", "planId", "versionId", "action", "actorId", "actorName", "detailsJson")
       VALUES (?, ?, ?, 'IMPORT_EXCEL', ?, ?, ?)`,
      newId("tpal"),
      detail.plan.id,
      params.versionId,
      params.ctx.userId,
      params.ctx.actorName,
      JSON.stringify({ lessonCount: params.lessons.length, periodCount: params.periods.length })
    )
  })

  return getVersionDetail(params.versionId)
}

/**
 * 7. Direct draft mutations (create/update/delete lesson or period) with optimistic concurrency check
 */
export async function mutateDraftVersion(params: {
  versionId: string
  expectedRevision: number
  operation:
    | {
        type: "UPSERT_LESSON"
        lessonId?: string
        lessonCode: string
        semester: number
        weekFrom: number
        weekTo: number
        topicName: string
        lessonName: string
        periodCount: number
        objectives?: string
        adjustments?: string
        projectNotes?: string
        attachments?: TeachingPlanAttachment[]
        assessmentConfirmed?: boolean
        assessmentOrgNote?: string
      }
    | {
        type: "UPDATE_PERIOD"
        periodId: string
        periodIndexInLesson?: number
        plannedWeek?: number
        focus?: string
        objectives?: string
        expectedEvidence?: string
        adjustments?: string
        attachments?: TeachingPlanAttachment[]
      }
    | { type: "DELETE_LESSON"; lessonId: string }
    | { type: "DELETE_PERIOD"; periodId: string }
  ctx: TeachingPlanAuthContext
}) {
  await ensureTeachingPlanSchema()

  const detail = await getVersionDetail(params.versionId)
  assertCanManagePlan(params.ctx, detail.plan.scopeType, detail.plan.campusId)

  if (detail.version.status !== "DRAFT") {
    throw new TeachingPlanAccessError(
      "Chỉ có thể chỉnh sửa phiên bản đang ở trạng thái Nháp.",
      "CONFLICT",
      409
    )
  }
  if (detail.version.revision !== params.expectedRevision) {
    throw new TeachingPlanAccessError(
      "Phát hiện xung đột chỉnh sửa: phiên bản này vừa được người khác cập nhật. Vui lòng tải lại dữ liệu mới nhất.",
      "CONFLICT",
      409
    )
  }

  const op = params.operation

  await prisma.$transaction(async (tx) => {
    if (op.type === "UPSERT_LESSON") {
      const code = op.lessonCode.trim()
      if (!code || !op.topicName.trim() || !op.lessonName.trim()) {
        throw new TeachingPlanAccessError("Thiếu mã bài, chủ đề hoặc tên bài.", "VALIDATION_ERROR", 400)
      }
      if (op.semester !== 1 && op.semester !== 2) {
        throw new TeachingPlanAccessError("Học kỳ phải là 1 hoặc 2.", "VALIDATION_ERROR", 400)
      }
      if (op.weekFrom <= 0 || op.weekTo < op.weekFrom) {
        throw new TeachingPlanAccessError("Khoảng tuần không hợp lệ.", "VALIDATION_ERROR", 400)
      }
      if (op.periodCount <= 0) {
        throw new TeachingPlanAccessError("Số tiết phải lớn hơn 0.", "VALIDATION_ERROR", 400)
      }

      const isAssess = isAssessmentLessonName(op.lessonName) || isAssessmentLessonName(op.topicName)
      const attachmentsJson = JSON.stringify(op.attachments || [])

      if (op.lessonId) {
        const existing = detail.lessons.find((l) => l.id === op.lessonId)
        if (!existing) {
          throw new TeachingPlanAccessError("Không tìm thấy bài học cần sửa.", "NOT_FOUND", 404)
        }
        await tx.$executeRawUnsafe(
          `UPDATE "teaching_plan_lessons"
           SET "lessonCode" = ?, "semester" = ?, "weekFrom" = ?, "weekTo" = ?,
               "topicName" = ?, "lessonName" = ?, "periodCount" = ?, "objectives" = ?,
               "adjustments" = ?, "projectNotes" = ?, "attachmentsJson" = ?,
               "isAssessmentRow" = ?, "assessmentConfirmed" = ?, "assessmentOrgNote" = ?,
               "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = ?`,
          code,
          op.semester,
          op.weekFrom,
          op.weekTo,
          op.topicName.trim(),
          op.lessonName.trim(),
          op.periodCount,
          op.objectives ?? existing.objectives,
          op.adjustments ?? existing.adjustments,
          op.projectNotes ?? existing.projectNotes,
          attachmentsJson,
          isAssess ? 1 : 0,
          op.assessmentConfirmed !== undefined
            ? op.assessmentConfirmed
              ? 1
              : 0
            : existing.assessmentConfirmed
            ? 1
            : 0,
          op.assessmentOrgNote ?? existing.assessmentOrgNote,
          op.lessonId
        )

        // Ensure skeleton periods exist up to periodCount
        const existingIdx = new Set(existing.periods.map((p) => p.periodIndexInLesson))
        for (let idx = 1; idx <= op.periodCount; idx++) {
          if (!existingIdx.has(idx)) {
            const pCode = buildDeterministicSkeletonPeriodCode(code, idx)
            await tx.$executeRawUnsafe(
              `INSERT INTO "teaching_plan_periods" (
                "id", "versionId", "lessonId", "stableLessonId", "stablePeriodId", "periodCode",
                "periodIndexInLesson", "plannedWeek", "isSkeleton", "sortOrder"
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
              newId("tpp"),
              params.versionId,
              existing.id,
              existing.stableLessonId,
              newId("sp"),
              pCode,
              idx,
              op.weekFrom,
              idx
            )
          }
        }
      } else {
        const lessonId = newId("tpl")
        const stableLessonId = newId("sl")
        await tx.$executeRawUnsafe(
          `INSERT INTO "teaching_plan_lessons" (
            "id", "versionId", "stableLessonId", "lessonCode", "semester", "weekFrom", "weekTo",
            "topicName", "lessonName", "periodCount", "objectives", "adjustments", "projectNotes",
            "attachmentsJson", "isAssessmentRow", "assessmentConfirmed", "assessmentOrgNote", "sortOrder"
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          lessonId,
          params.versionId,
          stableLessonId,
          code,
          op.semester,
          op.weekFrom,
          op.weekTo,
          op.topicName.trim(),
          op.lessonName.trim(),
          op.periodCount,
          op.objectives || "",
          op.adjustments || "",
          op.projectNotes || "",
          attachmentsJson,
          isAssess ? 1 : 0,
          op.assessmentConfirmed ? 1 : 0,
          op.assessmentOrgNote || "",
          detail.lessons.length + 1
        )
        for (let idx = 1; idx <= op.periodCount; idx++) {
          const pCode = buildDeterministicSkeletonPeriodCode(code, idx)
          await tx.$executeRawUnsafe(
            `INSERT INTO "teaching_plan_periods" (
              "id", "versionId", "lessonId", "stableLessonId", "stablePeriodId", "periodCode",
              "periodIndexInLesson", "plannedWeek", "isSkeleton", "sortOrder"
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
            newId("tpp"),
            params.versionId,
            lessonId,
            stableLessonId,
            newId("sp"),
            pCode,
            idx,
            op.weekFrom,
            idx
          )
        }
      }
    } else if (op.type === "UPDATE_PERIOD") {
      const parentLesson = detail.lessons.find((l) =>
        l.periods.some((p) => p.id === op.periodId)
      )
      const period = parentLesson?.periods.find((p) => p.id === op.periodId)
      if (!parentLesson || !period) {
        throw new TeachingPlanAccessError("Không tìm thấy tiết học cần chỉnh sửa.", "NOT_FOUND", 404)
      }

      const nextWeek = op.plannedWeek ?? period.plannedWeek
      if (nextWeek < parentLesson.weekFrom || nextWeek > parentLesson.weekTo) {
        throw new TeachingPlanAccessError(
          `Tuần dự kiến (${nextWeek}) phải nằm trong khoảng tuần của bài (Tuần ${parentLesson.weekFrom}–${parentLesson.weekTo}).`,
          "VALIDATION_ERROR",
          400
        )
      }
      const nextFocus = op.focus !== undefined ? op.focus.trim() : period.focus
      const nextObjectives = op.objectives !== undefined ? op.objectives.trim() : period.objectives
      const nextEvidence =
        op.expectedEvidence !== undefined ? op.expectedEvidence.trim() : period.expectedEvidence
      const nextAdjustments =
        op.adjustments !== undefined ? op.adjustments.trim() : period.adjustments
      const nextIndex = op.periodIndexInLesson ?? period.periodIndexInLesson
      const nextAttachments = op.attachments !== undefined ? op.attachments : period.attachments
      const nextIsSkeleton = !nextFocus || !nextObjectives ? 1 : 0

      await tx.$executeRawUnsafe(
        `UPDATE "teaching_plan_periods"
         SET "periodIndexInLesson" = ?, "plannedWeek" = ?, "focus" = ?, "objectives" = ?,
             "expectedEvidence" = ?, "adjustments" = ?, "attachmentsJson" = ?, "isSkeleton" = ?,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = ?`,
        nextIndex,
        nextWeek,
        nextFocus,
        nextObjectives,
        nextEvidence,
        nextAdjustments,
        JSON.stringify(nextAttachments),
        nextIsSkeleton,
        op.periodId
      )
    } else if (op.type === "DELETE_LESSON") {
      await tx.$executeRawUnsafe(
        `DELETE FROM "teaching_plan_periods" WHERE "lessonId" = ?`,
        op.lessonId
      )
      await tx.$executeRawUnsafe(
        `DELETE FROM "teaching_plan_lessons" WHERE "id" = ?`,
        op.lessonId
      )
    } else if (op.type === "DELETE_PERIOD") {
      await tx.$executeRawUnsafe(
        `DELETE FROM "teaching_plan_periods" WHERE "id" = ?`,
        op.periodId
      )
    }

    await tx.$executeRawUnsafe(
      `UPDATE "teaching_plan_versions"
       SET "revision" = "revision" + 1, "updatedById" = ?, "updatedByName" = ?, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = ?`,
      params.ctx.userId,
      params.ctx.actorName,
      params.versionId
    )
  })

  return getVersionDetail(params.versionId)
}

/**
 * 8. Pre-publish validation + Impact analysis on future timetable sessions & unstarted observations
 */
export async function checkVersionBeforePublish(
  versionId: string
): Promise<PrePublishCheckResult> {
  await ensureTeachingPlanSchema()
  const detail = await getVersionDetail(versionId)

  const missingPeriodFields: PrePublishCheckResult["missingPeriodFields"] = []
  const incompletePeriodWarnings: PrePublishCheckResult["incompletePeriodWarnings"] = []
  const unconfirmedAssessments: PrePublishCheckResult["unconfirmedAssessments"] = []
  const draftPeriodByStableId = new Map<
    string,
    { period: TeachingPlanPeriodRecord; lesson: TeachingPlanLessonRecord }
  >()

  for (const lesson of detail.lessons) {
    if (lesson.isAssessmentRow && !lesson.assessmentConfirmed) {
      const hasIncomplete =
        !lesson.objectives.trim() ||
        lesson.periods.some((p) => p.isSkeleton || !p.focus.trim() || !p.objectives.trim())
      if (hasIncomplete) {
        unconfirmedAssessments.push({
          lessonId: lesson.id,
          lessonCode: lesson.lessonCode,
          lessonName: lesson.lessonName,
          reason: "Dòng ĐÁNH GIÁ còn thiếu thông tin chi tiết — cần xác nhận cách tổ chức trước khi công bố.",
        })
      }
    }

    for (const period of lesson.periods) {
      draftPeriodByStableId.set(period.stablePeriodId, { period, lesson })
      // Skip strict missing-field check for confirmed assessment rows without period breakdown
      if (lesson.isAssessmentRow && lesson.assessmentConfirmed) continue

      const missing: string[] = []
      if (!lesson.periodCount || lesson.periodCount <= 0) missing.push("Số tiết của bài")
      if (!period.plannedWeek || period.plannedWeek <= 0) missing.push("Tuần dự kiến")

      if (missing.length > 0) {
        missingPeriodFields.push({
          lessonCode: lesson.lessonCode,
          lessonName: lesson.lessonName,
          periodCode: period.periodCode,
          periodIndexInLesson: period.periodIndexInLesson,
          missingFields: missing,
        })
      }

      const optionalMissing: string[] = []
      if (!period.focus.trim()) optionalMissing.push("Trọng tâm tiết")
      if (!period.objectives.trim()) optionalMissing.push("Yêu cầu cần đạt")
      if (optionalMissing.length > 0) {
        incompletePeriodWarnings.push({
          lessonCode: lesson.lessonCode,
          lessonName: lesson.lessonName,
          periodCode: period.periodCode,
          periodIndexInLesson: period.periodIndexInLesson,
          missingFields: optionalMissing,
        })
      }
    }
  }

  // Compare against currently published version for removed/merged stablePeriodIds & shifted plannedWeeks
  const impactedLinks: ImpactedPeriodLink[] = []
  const weekShiftWarnings: PrePublishCheckResult["weekShiftWarnings"] = []

  const compareVersionId = detail.plan.activePublishedVersionId || detail.version.baseVersionId
  if (compareVersionId && compareVersionId !== versionId) {
    const prevDetail = await getVersionDetail(compareVersionId).catch(() => null)
    if (prevDetail) {
      const prevPeriodMap = new Map<
        string,
        { period: TeachingPlanPeriodRecord; lesson: TeachingPlanLessonRecord }
      >()
      for (const l of prevDetail.lessons) {
        for (const p of l.periods) {
          prevPeriodMap.set(p.stablePeriodId, { period: p, lesson: l })
        }
      }

      const removedStableIds: string[] = []
      const shiftedWeekMap = new Map<string, { oldWeek: number; newWeek: number; periodCode: string }>()

      for (const [stableId, prevItem] of prevPeriodMap.entries()) {
        const nextItem = draftPeriodByStableId.get(stableId)
        if (!nextItem) {
          removedStableIds.push(stableId)
        } else if (nextItem.period.plannedWeek !== prevItem.period.plannedWeek) {
          shiftedWeekMap.set(stableId, {
            oldWeek: prevItem.period.plannedWeek,
            newWeek: nextItem.period.plannedWeek,
            periodCode: nextItem.period.periodCode,
          })
        }
      }

      const todayIso = new Date().toISOString().slice(0, 10)

      if (removedStableIds.length > 0) {
        const placeholders = removedStableIds.map(() => "?").join(",")
        const ttLinks = (await prisma.$queryRawUnsafe(
          `SELECT l.*, c."className", t."teacherName"
           FROM "timetable_teaching_plan_links" l
           LEFT JOIN "Class" c ON c."id" = l."classId"
           LEFT JOIN "TimetableSlot" ts ON ts."id" = l."timetableSlotId"
           LEFT JOIN "Teacher" t ON t."id" = ts."teacherId"
           WHERE l."stablePeriodId" IN (${placeholders})
             AND (l."sessionDate" = '' OR l."sessionDate" >= ?)`,
          ...removedStableIds,
          todayIso
        )) as any[]

        for (const row of ttLinks) {
          const prev = prevPeriodMap.get(String(row.stablePeriodId))
          impactedLinks.push({
            linkType: "TIMETABLE",
            linkId: String(row.id),
            targetId: String(row.timetableSlotId),
            className: String(row.className || ""),
            teacherName: String(row.teacherName || ""),
            sessionDate: row.sessionDate ? String(row.sessionDate) : null,
            timetablePeriodNumber: row.timetablePeriodNumber ? Number(row.timetablePeriodNumber) : null,
            oldStablePeriodId: String(row.stablePeriodId),
            oldPeriodCode: prev?.period.periodCode || "",
            oldLessonName: prev?.lesson.lessonName || "",
            oldPeriodIndexInLesson: prev?.period.periodIndexInLesson || 1,
          })
        }

        const obsLinks = (await prisma.$queryRawUnsafe(
          `SELECT l.*, o."className", o."date" as "obsDate", t."teacherName"
           FROM "observation_teaching_plan_links" l
           JOIN "ObservationSlot" o ON o."id" = l."observationSlotId"
           LEFT JOIN "Teacher" t ON t."id" = o."teacherId"
           WHERE l."stablePeriodId" IN (${placeholders})
             AND l."snapshotLocked" = 0`,
          ...removedStableIds
        )) as any[]

        for (const row of obsLinks) {
          const prev = prevPeriodMap.get(String(row.stablePeriodId))
          impactedLinks.push({
            linkType: "OBSERVATION",
            linkId: String(row.id),
            targetId: String(row.observationSlotId),
            className: String(row.className || ""),
            teacherName: String(row.teacherName || ""),
            sessionDate: row.obsDate ? String(row.obsDate).slice(0, 10) : null,
            timetablePeriodNumber: row.timetablePeriodNumber ? Number(row.timetablePeriodNumber) : null,
            oldStablePeriodId: String(row.stablePeriodId),
            oldPeriodCode: prev?.period.periodCode || "",
            oldLessonName: prev?.lesson.lessonName || "",
            oldPeriodIndexInLesson: prev?.period.periodIndexInLesson || 1,
          })
        }
      }

      if (shiftedWeekMap.size > 0) {
        const shiftedIds = Array.from(shiftedWeekMap.keys())
        const placeholders = shiftedIds.map(() => "?").join(",")
        const obsShifted = (await prisma.$queryRawUnsafe(
          `SELECT l."observationSlotId", l."stablePeriodId", o."className", o."date" as "obsDate"
           FROM "observation_teaching_plan_links" l
           JOIN "ObservationSlot" o ON o."id" = l."observationSlotId"
           WHERE l."stablePeriodId" IN (${placeholders}) AND l."snapshotLocked" = 0`,
          ...shiftedIds
        )) as any[]

        for (const row of obsShifted) {
          const info = shiftedWeekMap.get(String(row.stablePeriodId))!
          weekShiftWarnings.push({
            linkType: "OBSERVATION",
            targetId: String(row.observationSlotId),
            className: String(row.className || ""),
            sessionDate: row.obsDate ? String(row.obsDate).slice(0, 10) : null,
            periodCode: info.periodCode,
            oldWeek: info.oldWeek,
            newWeek: info.newWeek,
          })
        }
      }
    }
  }

  return {
    canPublish:
      missingPeriodFields.length === 0 &&
      unconfirmedAssessments.length === 0 &&
      impactedLinks.length === 0,
    missingPeriodFields,
    incompletePeriodWarnings,
    unconfirmedAssessments,
    impactedLinks,
    weekShiftWarnings,
  }
}

/**
 * 9. Workflow transitions: SUBMIT | REQUEST_CHANGES | PUBLISH (transactional)
 */
export async function transitionVersionWorkflow(params: {
  versionId: string
  action: "SUBMIT" | "REQUEST_CHANGES" | "PUBLISH"
  comment?: string
  periodReplacements?: Record<string, string>
  confirmedAssessmentLessonIds?: string[]
  ctx: TeachingPlanAuthContext
}) {
  await ensureTeachingPlanSchema()

  const detail = await getVersionDetail(params.versionId)

  if (params.action === "SUBMIT") {
    assertCanManagePlan(params.ctx, detail.plan.scopeType, detail.plan.campusId)
    if (detail.version.status !== "DRAFT") {
      throw new TeachingPlanAccessError(
        "Chỉ phiên bản Nháp mới có thể gửi duyệt.",
        "CONFLICT",
        409
      )
    }
    if (detail.lessons.length === 0) {
      throw new TeachingPlanAccessError(
        "Kế hoạch chưa có nội dung bài dạy nào để gửi duyệt.",
        "VALIDATION_ERROR",
        400
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `UPDATE "teaching_plan_versions"
         SET "status" = 'PENDING_APPROVAL',
             "submittedById" = ?, "submittedByName" = ?, "submittedAt" = CURRENT_TIMESTAMP,
             "changeSummary" = COALESCE(?, "changeSummary"),
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = ?`,
        params.ctx.userId,
        params.ctx.actorName,
        params.comment || null,
        params.versionId
      )
      await tx.$executeRawUnsafe(
        `INSERT INTO "teaching_plan_audit_logs" ("id", "planId", "versionId", "action", "actorId", "actorName", "detailsJson")
         VALUES (?, ?, ?, 'SUBMIT', ?, ?, ?)`,
        newId("tpal"),
        detail.plan.id,
        params.versionId,
        params.ctx.userId,
        params.ctx.actorName,
        JSON.stringify({ comment: params.comment || "" })
      )
    })

    return { detail: await getVersionDetail(params.versionId), warnings: [] }
  }

  if (params.action === "REQUEST_CHANGES") {
    assertCanApprovePlan(params.ctx, detail.plan.scopeType, detail.plan.campusId)
    if (detail.version.status !== "PENDING_APPROVAL") {
      throw new TeachingPlanAccessError(
        "Chỉ phiên bản Chờ duyệt mới có thể yêu cầu chỉnh sửa.",
        "CONFLICT",
        409
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `UPDATE "teaching_plan_versions"
         SET "status" = 'DRAFT',
             "reviewComment" = ?,
             "reviewedById" = ?, "reviewedByName" = ?, "reviewedAt" = CURRENT_TIMESTAMP,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = ?`,
        params.comment || "Cần bổ sung, chỉnh sửa nội dung trước khi công bố.",
        params.ctx.userId,
        params.ctx.actorName,
        params.versionId
      )
      await tx.$executeRawUnsafe(
        `INSERT INTO "teaching_plan_audit_logs" ("id", "planId", "versionId", "action", "actorId", "actorName", "detailsJson")
         VALUES (?, ?, ?, 'REQUEST_CHANGES', ?, ?, ?)`,
        newId("tpal"),
        detail.plan.id,
        params.versionId,
        params.ctx.userId,
        params.ctx.actorName,
        JSON.stringify({ comment: params.comment || "" })
      )
    })

    return { detail: await getVersionDetail(params.versionId), warnings: [] }
  }

  // PUBLISH
  assertCanApprovePlan(params.ctx, detail.plan.scopeType, detail.plan.campusId)
  if (detail.version.status !== "DRAFT" && detail.version.status !== "PENDING_APPROVAL") {
    throw new TeachingPlanAccessError(
      "Phiên bản này không ở trạng thái có thể công bố.",
      "CONFLICT",
      409
    )
  }

  // Apply assessment confirmations first if supplied
  const confirmedSet = new Set(params.confirmedAssessmentLessonIds || [])
  if (confirmedSet.size > 0) {
    for (const lid of confirmedSet) {
      await prisma.$executeRawUnsafe(
        `UPDATE "teaching_plan_lessons" SET "assessmentConfirmed" = 1 WHERE "id" = ? AND "versionId" = ?`,
        lid,
        params.versionId
      )
    }
  }

  const check = await checkVersionBeforePublish(params.versionId)

  if (check.missingPeriodFields.length > 0) {
    throw new TeachingPlanAccessError(
      `Còn ${check.missingPeriodFields.length} tiết chưa đủ thông tin bắt buộc (số tiết của bài, tuần dự kiến). Vui lòng hoàn thiện trước khi công bố.`,
      "VALIDATION_ERROR",
      400
    )
  }
  if (check.unconfirmedAssessments.length > 0) {
    throw new TeachingPlanAccessError(
      `Còn ${check.unconfirmedAssessments.length} dòng ĐÁNH GIÁ cần xác nhận cách tổ chức trước khi công bố.`,
      "VALIDATION_ERROR",
      400
    )
  }

  const replacements = params.periodReplacements || {}
  const missingReplacements = check.impactedLinks.filter(
    (item) => !replacements[item.oldStablePeriodId]
  )
  if (missingReplacements.length > 0) {
    throw new TeachingPlanAccessError(
      `Có ${missingReplacements.length} buổi dạy / phiếu dự giờ tương lai đang gắn với tiết bị bỏ hoặc gộp. Vui lòng chọn tiết thay thế trước khi công bố.`,
      "CONFLICT",
      409
    )
  }

  // Validate replacement targets exist in this version
  const latestDetail = await getVersionDetail(params.versionId)
  const targetByStablePeriod = new Map<
    string,
    { stableLessonId: string; periodCode: string; plannedWeek: number }
  >()
  for (const l of latestDetail.lessons) {
    for (const p of l.periods) {
      targetByStablePeriod.set(p.stablePeriodId, {
        stableLessonId: l.stableLessonId,
        periodCode: p.periodCode,
        plannedWeek: p.plannedWeek,
      })
    }
  }

  for (const [oldId, newStableId] of Object.entries(replacements)) {
    if (!targetByStablePeriod.has(newStableId)) {
      throw new TeachingPlanAccessError(
        `Tiết thay thế '${newStableId}' cho tiết '${oldId}' không tồn tại trong phiên bản sắp công bố.`,
        "VALIDATION_ERROR",
        400
      )
    }
  }

  await prisma.$transaction(async (tx) => {
    // 1. Remap impacted future timetable & unstarted observation links
    for (const [oldStablePeriodId, newStablePeriodId] of Object.entries(replacements)) {
      const target = targetByStablePeriod.get(newStablePeriodId)!
      await tx.$executeRawUnsafe(
        `UPDATE "timetable_teaching_plan_links"
         SET "stablePeriodId" = ?, "stableLessonId" = ?, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "planId" = ? AND "stablePeriodId" = ?`,
        newStablePeriodId,
        target.stableLessonId,
        detail.plan.id,
        oldStablePeriodId
      )
      await tx.$executeRawUnsafe(
        `UPDATE "observation_teaching_plan_links"
         SET "stablePeriodId" = ?, "stableLessonId" = ?, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "planId" = ? AND "stablePeriodId" = ? AND "snapshotLocked" = 0`,
        newStablePeriodId,
        target.stableLessonId,
        detail.plan.id,
        oldStablePeriodId
      )
    }

    // 2. Flag week shift warnings on unstarted observations (never mutating date/time!)
    for (const warn of check.weekShiftWarnings) {
      const note = `Tuần dự kiến của tiết ${warn.periodCode} đã đổi từ Tuần ${warn.oldWeek} sang Tuần ${warn.newWeek}. Vui lòng kiểm tra lệch lịch (đổi ngày/giờ dự thực hiện qua quy trình đổi lịch hiện có).`
      await tx.$executeRawUnsafe(
        `UPDATE "observation_teaching_plan_links"
         SET "weekMismatchWarning" = 1, "weekMismatchNote" = ?, "updatedAt" = CURRENT_TIMESTAMP
         WHERE "observationSlotId" = ? AND "snapshotLocked" = 0`,
        note,
        warn.targetId
      )
    }

    // 3. Archive previous published versions & publish this version
    await tx.$executeRawUnsafe(
      `UPDATE "teaching_plan_versions"
       SET "status" = 'ARCHIVED', "updatedAt" = CURRENT_TIMESTAMP
       WHERE "planId" = ? AND "status" = 'PUBLISHED'`,
      detail.plan.id
    )

    await tx.$executeRawUnsafe(
      `UPDATE "teaching_plan_versions"
       SET "status" = 'PUBLISHED',
           "publishedById" = ?, "publishedByName" = ?, "publishedAt" = CURRENT_TIMESTAMP,
           "reviewedById" = ?, "reviewedByName" = ?, "reviewedAt" = CURRENT_TIMESTAMP,
           "reviewComment" = COALESCE(?, "reviewComment"),
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = ?`,
      params.ctx.userId,
      params.ctx.actorName,
      params.ctx.userId,
      params.ctx.actorName,
      params.comment || null,
      params.versionId
    )

    await tx.$executeRawUnsafe(
      `UPDATE "teaching_plans"
       SET "activePublishedVersionId" = ?, "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = ?`,
      params.versionId,
      detail.plan.id
    )

    await tx.$executeRawUnsafe(
      `INSERT INTO "teaching_plan_audit_logs" ("id", "planId", "versionId", "action", "actorId", "actorName", "detailsJson")
       VALUES (?, ?, ?, 'PUBLISH', ?, ?, ?)`,
      newId("tpal"),
      detail.plan.id,
      params.versionId,
      params.ctx.userId,
      params.ctx.actorName,
      JSON.stringify({
        versionNumber: detail.version.versionNumber,
        replacementsCount: Object.keys(replacements).length,
        weekShiftWarningsCount: check.weekShiftWarnings.length,
      })
    )
  })

  return {
    detail: await getVersionDetail(params.versionId),
    warnings: check.weekShiftWarnings,
  }
}

/**
 * 10. Resolve applicable published Teaching Plan(s) for a specific class & subject
 * Priority:
 *  1) Published CAMPUS plan for cls.campusId matching cls.educationSystem/program
 *  2) Published SYSTEM plan matching cls.educationSystem/program (or generic programCode='')
 * If multiple plans match at the winning priority tier, requiresSelection = true.
 */
export async function resolveApplicablePlansForClass(params: {
  classId: string
  subjectId: string
  academicYearId?: string
}) {
  await ensureTeachingPlanSchema()

  const cls = await prisma.class.findUnique({
    where: { id: params.classId },
    select: {
      id: true,
      className: true,
      level: true,
      grade: true,
      campusId: true,
      academicYearId: true,
      educationSystem: true,
    },
  })
  if (!cls) {
    throw new TeachingPlanAccessError("Không tìm thấy lớp học.", "NOT_FOUND", 404)
  }

  const yearId = params.academicYearId || cls.academicYearId
  const normLevel = normalizeLevelLabel(cls.level)
  const normGrade = normalizeGradeKey(cls.grade)
  const classProgram = normalizeProgramToken(cls.educationSystem)

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT * FROM "teaching_plans"
     WHERE "academicYearId" = ? AND "level" = ? AND "grade" = ? AND "subjectId" = ?
       AND "status" = 'ACTIVE' AND "activePublishedVersionId" IS NOT NULL
       AND COALESCE("syncToObservation", 0) = 1`,
    yearId,
    normLevel,
    normGrade,
    params.subjectId
  )) as any[]

  const allPublished = rows.map(mapPlanRow)
  const matchesProgram = (p: TeachingPlanRecord) =>
    !p.programCode ||
    !classProgram ||
    normalizeProgramToken(p.programCode) === classProgram ||
    normalizeProgramToken(p.programName) === classProgram

  const campusExact = allPublished.filter(
    (p) => p.scopeType === "CAMPUS" && p.campusId === cls.campusId && matchesProgram(p)
  )
  const systemMatch = allPublished.filter(
    (p) => p.scopeType === "SYSTEM" && matchesProgram(p)
  )

  const candidates =
    campusExact.length > 0
      ? campusExact
      : systemMatch.length > 0
      ? systemMatch
      : allPublished.filter(
          (p) => p.scopeType === "SYSTEM" || p.campusId === cls.campusId
        )

  return {
    classInfo: cls,
    candidates,
    recommendedPlan: candidates.length === 1 ? candidates[0] : null,
    requiresSelection: candidates.length > 1,
  }
}

/**
 * 11. Link a Timetable session (and optionally an ObservationSlot) to a Teaching Plan period
 * Enforces teacher assignment & plan scope/grade/subject/year match at API level!
 */
export async function linkPeriodToSession(params: {
  timetableSlotId?: string | null
  observationSlotId?: string | null
  classId: string
  subjectId: string
  academicYearId?: string
  sessionDate?: string
  timetablePeriodNumber?: number | null
  timetableSession?: string | null
  planId: string
  stablePeriodId: string
  ctx: TeachingPlanAuthContext
}) {
  await ensureTeachingPlanSchema()

  const cls = await prisma.class.findUnique({
    where: { id: params.classId },
    select: {
      id: true,
      className: true,
      level: true,
      grade: true,
      campusId: true,
      academicYearId: true,
      educationSystem: true,
    },
  })
  if (!cls) {
    throw new TeachingPlanAccessError("Không tìm thấy lớp học.", "NOT_FOUND", 404)
  }

  const yearId = params.academicYearId || cls.academicYearId

  // RBAC: Verify teacher assignment or manager campus scope
  await assertCanLinkClassSubject({
    ctx: params.ctx,
    classId: cls.id,
    subjectId: params.subjectId,
    academicYearId: yearId,
    campusId: cls.campusId,
  })

  // Validate plan matches class's year, grade, subject, program, and scope
  const planRows = (await prisma.$queryRawUnsafe(
    `SELECT * FROM "teaching_plans" WHERE "id" = ? LIMIT 1`,
    params.planId
  )) as any[]
  if (!planRows[0]) {
    throw new TeachingPlanAccessError("Kế hoạch dạy học không tồn tại.", "NOT_FOUND", 404)
  }
  const plan = mapPlanRow(planRows[0])
  if (!plan.activePublishedVersionId) {
    throw new TeachingPlanAccessError(
      "Chỉ có thể gắn tiết từ Kế hoạch dạy học đã được công bố.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (plan.academicYearId !== yearId) {
    throw new TeachingPlanAccessError(
      "Kế hoạch dạy học không khớp năm học của lớp.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (normalizeGradeKey(plan.grade) !== normalizeGradeKey(cls.grade)) {
    throw new TeachingPlanAccessError(
      "Kế hoạch dạy học không khớp khối của lớp.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (plan.subjectId !== params.subjectId) {
    throw new TeachingPlanAccessError(
      "Kế hoạch dạy học không khớp môn học.",
      "VALIDATION_ERROR",
      400
    )
  }
  if (plan.scopeType === "CAMPUS" && plan.campusId !== cls.campusId) {
    throw new TeachingPlanAccessError(
      "Kế hoạch dạy học này chỉ áp dụng cho cơ sở khác.",
      "SCOPE_VIOLATION",
      403
    )
  }
  const classProg = normalizeProgramToken(cls.educationSystem)
  if (
    plan.programCode &&
    classProg &&
    normalizeProgramToken(plan.programCode) !== classProg &&
    normalizeProgramToken(plan.programName) !== classProg
  ) {
    throw new TeachingPlanAccessError(
      `Kế hoạch dạy học thuộc chương trình '${plan.programName || plan.programCode}', không phù hợp với chương trình '${classProg}' của lớp ${cls.className}.`,
      "VALIDATION_ERROR",
      400
    )
  }

  // Verify period exists in the active published version
  const periodRows = (await prisma.$queryRawUnsafe(
    `SELECT p.*, l."lessonCode", l."lessonName", l."periodCount"
     FROM "teaching_plan_periods" p
     JOIN "teaching_plan_lessons" l ON l."id" = p."lessonId"
     WHERE p."versionId" = ? AND p."stablePeriodId" = ?
     LIMIT 1`,
    plan.activePublishedVersionId,
    params.stablePeriodId
  )) as any[]
  if (!periodRows[0]) {
    throw new TeachingPlanAccessError(
      "Tiết học được chọn không tồn tại trong phiên bản đang công bố của kế hoạch.",
      "NOT_FOUND",
      404
    )
  }
  const periodRow = periodRows[0]
  const stableLessonId = String(periodRow.stableLessonId)

  // Check if sessionDate week mismatches plannedWeek (warning only)
  let weekMismatchWarning = 0
  let weekMismatchNote = ""
  if (params.sessionDate) {
    const yearObj = await prisma.academicYear.findUnique({
      where: { id: yearId },
      select: { startDate: true },
    })
    const actualWeek = estimateAcademicWeekFromDate(params.sessionDate, yearObj?.startDate)
    const plannedWeek = Number(periodRow.plannedWeek || 0)
    if (actualWeek && plannedWeek && actualWeek !== plannedWeek) {
      weekMismatchWarning = 1
      weekMismatchNote = `Ngày dạy rơi vào Tuần ${actualWeek} (kế hoạch dự kiến Tuần ${plannedWeek}).`
    }
  }

  const dateKey = (params.sessionDate || "").slice(0, 10)

  await prisma.$transaction(async (tx) => {
    if (params.timetableSlotId) {
      const existingTt = (await tx.$queryRawUnsafe(
        `SELECT "id" FROM "timetable_teaching_plan_links" WHERE "timetableSlotId" = ? AND "sessionDate" = ? LIMIT 1`,
        params.timetableSlotId,
        dateKey
      )) as any[]
      if (existingTt[0]) {
        await tx.$executeRawUnsafe(
          `UPDATE "timetable_teaching_plan_links"
           SET "planId" = ?, "stableLessonId" = ?, "stablePeriodId" = ?,
               "timetablePeriodNumber" = ?, "timetableSession" = ?,
               "weekMismatchWarning" = ?, "weekMismatchNote" = ?,
               "linkedById" = ?, "linkedByName" = ?, "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = ?`,
          plan.id,
          stableLessonId,
          params.stablePeriodId,
          params.timetablePeriodNumber ?? null,
          params.timetableSession ?? null,
          weekMismatchWarning,
          weekMismatchNote,
          params.ctx.userId,
          params.ctx.actorName,
          String(existingTt[0].id)
        )
      } else {
        await tx.$executeRawUnsafe(
          `INSERT INTO "timetable_teaching_plan_links" (
            "id", "timetableSlotId", "classId", "academicYearId", "subjectId",
            "planId", "stableLessonId", "stablePeriodId", "sessionDate",
            "timetablePeriodNumber", "timetableSession",
            "weekMismatchWarning", "weekMismatchNote", "linkedById", "linkedByName"
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          newId("ttpl"),
          params.timetableSlotId,
          cls.id,
          yearId,
          params.subjectId,
          plan.id,
          stableLessonId,
          params.stablePeriodId,
          dateKey,
          params.timetablePeriodNumber ?? null,
          params.timetableSession ?? null,
          weekMismatchWarning,
          weekMismatchNote,
          params.ctx.userId,
          params.ctx.actorName
        )
      }
    }

    if (params.observationSlotId) {
      const existingObs = (await tx.$queryRawUnsafe(
        `SELECT "id", "snapshotLocked" FROM "observation_teaching_plan_links" WHERE "observationSlotId" = ? LIMIT 1`,
        params.observationSlotId
      )) as any[]
      if (existingObs[0]) {
        if (Number(existingObs[0].snapshotLocked || 0) === 1) {
          throw new TeachingPlanAccessError(
            "Phiếu dự giờ đã bắt đầu / đã chốt bản chụp kế hoạch, không thể thay đổi liên kết tiết.",
            "CONFLICT",
            409
          )
        }
        await tx.$executeRawUnsafe(
          `UPDATE "observation_teaching_plan_links"
           SET "timetableSlotId" = ?, "timetablePeriodNumber" = ?, "timetableSession" = ?,
               "planId" = ?, "stableLessonId" = ?, "stablePeriodId" = ?,
               "weekMismatchWarning" = ?, "weekMismatchNote" = ?,
               "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = ?`,
          params.timetableSlotId ?? null,
          params.timetablePeriodNumber ?? null,
          params.timetableSession ?? null,
          plan.id,
          stableLessonId,
          params.stablePeriodId,
          weekMismatchWarning,
          weekMismatchNote,
          String(existingObs[0].id)
        )
      } else {
        await tx.$executeRawUnsafe(
          `INSERT INTO "observation_teaching_plan_links" (
            "id", "observationSlotId", "timetableSlotId", "timetablePeriodNumber", "timetableSession",
            "planId", "stableLessonId", "stablePeriodId",
            "snapshotLocked", "weekMismatchWarning", "weekMismatchNote", "createdById", "createdByName"
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
          newId("otpl"),
          params.observationSlotId,
          params.timetableSlotId ?? null,
          params.timetablePeriodNumber ?? null,
          params.timetableSession ?? null,
          plan.id,
          stableLessonId,
          params.stablePeriodId,
          weekMismatchWarning,
          weekMismatchNote,
          params.ctx.userId,
          params.ctx.actorName
        )
      }
    }
  })

  return {
    linked: true,
    planId: plan.id,
    stableLessonId,
    stablePeriodId: params.stablePeriodId,
    weekMismatchWarning: Boolean(weekMismatchWarning),
    weekMismatchNote,
  }
}

/**
 * 12. Resolve Teaching Plan view for an ObservationSlot
 * - Before observation starts (snapshotLocked=0): live-reads from activePublishedVersionId
 * - After observation starts (snapshotLocked=1): returns immutable frozen snapshotJson
 * - Legacy observations without link: returns { linked: false, sourceMode: 'UNLINKED' }
 */
export async function resolveObservationTeachingPlanView(
  observationSlotId: string,
  evaluationId?: string | null
): Promise<ObservationTeachingPlanView> {
  await ensureTeachingPlanSchema()

  const linkRows = (await prisma.$queryRawUnsafe(
    `SELECT * FROM "observation_teaching_plan_links" WHERE "observationSlotId" = ? LIMIT 1`,
    observationSlotId
  )) as any[]

  if (!linkRows[0]) {
    return {
      linked: false,
      snapshotLocked: false,
      snapshotLockedAt: null,
      sourceMode: "UNLINKED",
      weekMismatchWarning: false,
      weekMismatchNote: "",
      data: null,
      evidences: [],
    }
  }

  const link = linkRows[0]
  const snapshotLocked = Boolean(Number(link.snapshotLocked || 0))
  let data: ObservationTeachingPlanSnapshot | null = null

  if (snapshotLocked && link.snapshotJson) {
    data = safeJsonParse<ObservationTeachingPlanSnapshot | null>(link.snapshotJson, null)
  } else {
    // Live-resolve from activePublishedVersionId!
    const planRows = (await prisma.$queryRawUnsafe(
      `SELECT * FROM "teaching_plans" WHERE "id" = ? LIMIT 1`,
      String(link.planId)
    )) as any[]
    const plan = planRows[0] ? mapPlanRow(planRows[0]) : null

    if (plan?.activePublishedVersionId) {
      const verRows = (await prisma.$queryRawUnsafe(
        `SELECT * FROM "teaching_plan_versions" WHERE "id" = ? LIMIT 1`,
        plan.activePublishedVersionId
      )) as any[]
      const periodRows = (await prisma.$queryRawUnsafe(
        `SELECT p.*, l."lessonCode", l."lessonName", l."topicName", l."semester",
                l."periodCount", l."objectives" as "lessonObjectives",
                l."adjustments" as "lessonAdjustments", l."projectNotes"
         FROM "teaching_plan_periods" p
         JOIN "teaching_plan_lessons" l ON l."id" = p."lessonId"
         WHERE p."versionId" = ? AND p."stablePeriodId" = ?
         LIMIT 1`,
        plan.activePublishedVersionId,
        String(link.stablePeriodId)
      )) as any[]

      if (verRows[0] && periodRows[0]) {
        const pr = periodRows[0]
        const objText = String(pr.objectives || "").trim() || String(pr.lessonObjectives || "").trim()
        data = {
          planId: plan.id,
          planTitle: plan.title,
          versionId: plan.activePublishedVersionId,
          versionNumber: Number(verRows[0].versionNumber || 1),
          stableLessonId: String(pr.stableLessonId),
          lessonCode: String(pr.lessonCode),
          lessonName: String(pr.lessonName),
          topicName: String(pr.topicName),
          semester: Number(pr.semester || 1),
          stablePeriodId: String(pr.stablePeriodId),
          periodCode: String(pr.periodCode),
          periodIndexInLesson: Number(pr.periodIndexInLesson || 1),
          totalPeriodsInLesson: Number(pr.periodCount || 1),
          plannedWeek: Number(pr.plannedWeek || 1),
          focus: String(pr.focus || ""),
          objectives: objText,
          objectiveLines: splitObjectiveLines(objText),
          expectedEvidence: String(pr.expectedEvidence || ""),
          adjustments: String(pr.adjustments || ""),
          lessonAdjustments: String(pr.lessonAdjustments || ""),
          projectNotes: String(pr.projectNotes || ""),
          timetableSlotId: link.timetableSlotId ? String(link.timetableSlotId) : null,
          timetablePeriodNumber: link.timetablePeriodNumber
            ? Number(link.timetablePeriodNumber)
            : null,
          timetableSession: link.timetableSession ? String(link.timetableSession) : null,
        }
      }
    }
  }

  // Load saved objective evidences if evaluationId provided
  const savedEvidences = evaluationId
    ? ((await prisma.$queryRawUnsafe(
        `SELECT * FROM "observation_objective_evidences" WHERE "evaluationId" = ? ORDER BY "objectiveIndex" ASC`,
        evaluationId
      )) as any[])
    : []

  const savedByIdx = new Map<number, any>()
  for (const ev of savedEvidences) {
    savedByIdx.set(Number(ev.objectiveIndex), ev)
  }

  const lines = data?.objectiveLines || []
  const evidences = lines.map((text, idx) => {
    const saved = savedByIdx.get(idx)
    return {
      objectiveIndex: idx,
      objectiveText: saved ? String(saved.objectiveText) : text,
      status: (saved?.status || "NOT_OBSERVED") as ObjectiveEvidenceStatus,
      evidenceNote: saved ? String(saved.evidenceNote || "") : "",
    }
  })

  return {
    linked: true,
    snapshotLocked,
    snapshotLockedAt: link.snapshotLockedAt ? String(link.snapshotLockedAt) : null,
    sourceMode: snapshotLocked ? "FROZEN_SNAPSHOT" : "LIVE_PUBLISHED",
    weekMismatchWarning: Boolean(Number(link.weekMismatchWarning || 0)),
    weekMismatchNote: String(link.weekMismatchNote || ""),
    data,
    evidences,
  }
}

/**
 * 13. Freeze immutable snapshot when observation starts / evaluation begins or submits
 */
export async function lockObservationTeachingPlanSnapshot(
  observationSlotId: string
): Promise<ObservationTeachingPlanView> {
  await ensureTeachingPlanSchema()

  const current = await resolveObservationTeachingPlanView(observationSlotId)
  if (!current.linked || current.snapshotLocked || !current.data) {
    return current
  }

  await prisma.$executeRawUnsafe(
    `UPDATE "observation_teaching_plan_links"
     SET "snapshotLocked" = 1,
         "snapshotVersionId" = ?,
         "snapshotVersionNumber" = ?,
         "snapshotLockedAt" = CURRENT_TIMESTAMP,
         "snapshotJson" = ?,
         "updatedAt" = CURRENT_TIMESTAMP
     WHERE "observationSlotId" = ? AND "snapshotLocked" = 0`,
    current.data.versionId,
    current.data.versionNumber,
    JSON.stringify(current.data),
    observationSlotId
  )

  return resolveObservationTeachingPlanView(observationSlotId)
}

/**
 * 14. Save per-objective observation evidence (with "Chưa quan sát được" = NOT_OBSERVED)
 */
export async function saveObservationObjectiveEvidences(params: {
  evaluationId: string
  observationSlotId: string
  evidences: Array<{
    objectiveIndex: number
    objectiveText: string
    status: ObjectiveEvidenceStatus
    evidenceNote: string
  }>
}) {
  await ensureTeachingPlanSchema()

  // Also ensure the observation snapshot is locked when evaluation evidence is recorded
  await lockObservationTeachingPlanSnapshot(params.observationSlotId)

  await prisma.$transaction(async (tx) => {
    for (const item of params.evidences) {
      const validStatus: ObjectiveEvidenceStatus =
        item.status === "OBSERVED_MET" || item.status === "OBSERVED_PARTIAL"
          ? item.status
          : "NOT_OBSERVED"
      const existing = (await tx.$queryRawUnsafe(
        `SELECT "id" FROM "observation_objective_evidences" WHERE "evaluationId" = ? AND "objectiveIndex" = ? LIMIT 1`,
        params.evaluationId,
        item.objectiveIndex
      )) as any[]

      if (existing[0]) {
        await tx.$executeRawUnsafe(
          `UPDATE "observation_objective_evidences"
           SET "objectiveText" = ?, "status" = ?, "evidenceNote" = ?, "updatedAt" = CURRENT_TIMESTAMP
           WHERE "id" = ?`,
          item.objectiveText,
          validStatus,
          item.evidenceNote || "",
          String(existing[0].id)
        )
      } else {
        await tx.$executeRawUnsafe(
          `INSERT INTO "observation_objective_evidences" (
            "id", "evaluationId", "observationSlotId", "objectiveIndex", "objectiveText", "status", "evidenceNote"
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          newId("ooe"),
          params.evaluationId,
          params.observationSlotId,
          item.objectiveIndex,
          item.objectiveText,
          validStatus,
          item.evidenceNote || ""
        )
      }
    }
  })

  return resolveObservationTeachingPlanView(params.observationSlotId, params.evaluationId)
}
