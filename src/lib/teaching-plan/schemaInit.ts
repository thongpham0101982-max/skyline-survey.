import { prisma } from "@/lib/db"

let schemaInitialized = false
let initPromise: Promise<void> | null = null

const DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "teaching_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "academicYearId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "subjectCode" TEXT,
    "subjectName" TEXT NOT NULL,
    "programCode" TEXT NOT NULL DEFAULT '',
    "programName" TEXT NOT NULL DEFAULT '',
    "scopeType" TEXT NOT NULL DEFAULT 'SYSTEM',
    "campusId" TEXT,
    "campusCode" TEXT,
    "title" TEXT NOT NULL,
    "activePublishedVersionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_tp_lookup" ON "teaching_plans"("academicYearId", "level", "grade", "subjectId")`,
  `CREATE INDEX IF NOT EXISTS "idx_tp_scope" ON "teaching_plans"("scopeType", "campusId", "programCode")`,

  `CREATE TABLE IF NOT EXISTS "teaching_plan_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "baseVersionId" TEXT,
    "changeSummary" TEXT,
    "reviewComment" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT,
    "updatedById" TEXT,
    "updatedByName" TEXT,
    "submittedById" TEXT,
    "submittedByName" TEXT,
    "submittedAt" DATETIME,
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "reviewedAt" DATETIME,
    "publishedById" TEXT,
    "publishedByName" TEXT,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "uq_tpv_plan_ver" ON "teaching_plan_versions"("planId", "versionNumber")`,
  `CREATE INDEX IF NOT EXISTS "idx_tpv_plan_status" ON "teaching_plan_versions"("planId", "status")`,

  `CREATE TABLE IF NOT EXISTS "teaching_plan_lessons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "versionId" TEXT NOT NULL,
    "stableLessonId" TEXT NOT NULL,
    "lessonCode" TEXT NOT NULL,
    "semester" INTEGER NOT NULL DEFAULT 1,
    "weekFrom" INTEGER NOT NULL DEFAULT 1,
    "weekTo" INTEGER NOT NULL DEFAULT 1,
    "topicName" TEXT NOT NULL,
    "lessonName" TEXT NOT NULL,
    "periodCount" INTEGER NOT NULL DEFAULT 1,
    "objectives" TEXT NOT NULL DEFAULT '',
    "adjustments" TEXT NOT NULL DEFAULT '',
    "projectNotes" TEXT NOT NULL DEFAULT '',
    "attachmentsJson" TEXT NOT NULL DEFAULT '[]',
    "isAssessmentRow" INTEGER NOT NULL DEFAULT 0,
    "assessmentConfirmed" INTEGER NOT NULL DEFAULT 0,
    "assessmentOrgNote" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "uq_tpl_version_code" ON "teaching_plan_lessons"("versionId", "lessonCode")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "uq_tpl_version_stable" ON "teaching_plan_lessons"("versionId", "stableLessonId")`,
  `CREATE INDEX IF NOT EXISTS "idx_tpl_version_sem" ON "teaching_plan_lessons"("versionId", "semester", "weekFrom")`,

  `CREATE TABLE IF NOT EXISTS "teaching_plan_periods" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "versionId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "stableLessonId" TEXT NOT NULL,
    "stablePeriodId" TEXT NOT NULL,
    "periodCode" TEXT NOT NULL,
    "periodIndexInLesson" INTEGER NOT NULL DEFAULT 1,
    "plannedWeek" INTEGER NOT NULL DEFAULT 1,
    "focus" TEXT NOT NULL DEFAULT '',
    "objectives" TEXT NOT NULL DEFAULT '',
    "expectedEvidence" TEXT NOT NULL DEFAULT '',
    "adjustments" TEXT NOT NULL DEFAULT '',
    "attachmentsJson" TEXT NOT NULL DEFAULT '[]',
    "isSkeleton" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "uq_tpp_version_code" ON "teaching_plan_periods"("versionId", "periodCode")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "uq_tpp_version_stable" ON "teaching_plan_periods"("versionId", "stablePeriodId")`,
  `CREATE INDEX IF NOT EXISTS "idx_tpp_lesson" ON "teaching_plan_periods"("lessonId", "periodIndexInLesson")`,
  `CREATE INDEX IF NOT EXISTS "idx_tpp_stable" ON "teaching_plan_periods"("stablePeriodId")`,

  `CREATE TABLE IF NOT EXISTS "timetable_teaching_plan_links" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timetableSlotId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "stableLessonId" TEXT NOT NULL,
    "stablePeriodId" TEXT NOT NULL,
    "sessionDate" TEXT NOT NULL DEFAULT '',
    "timetablePeriodNumber" INTEGER,
    "timetableSession" TEXT,
    "weekMismatchWarning" INTEGER NOT NULL DEFAULT 0,
    "weekMismatchNote" TEXT NOT NULL DEFAULT '',
    "linkedById" TEXT,
    "linkedByName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "uq_ttpl_slot_date" ON "timetable_teaching_plan_links"("timetableSlotId", "sessionDate")`,
  `CREATE INDEX IF NOT EXISTS "idx_ttpl_stable_period" ON "timetable_teaching_plan_links"("stablePeriodId")`,
  `CREATE INDEX IF NOT EXISTS "idx_ttpl_class_subj" ON "timetable_teaching_plan_links"("classId", "subjectId", "academicYearId")`,

  `CREATE TABLE IF NOT EXISTS "observation_teaching_plan_links" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "observationSlotId" TEXT NOT NULL,
    "timetableSlotId" TEXT,
    "timetablePeriodNumber" INTEGER,
    "timetableSession" TEXT,
    "planId" TEXT NOT NULL,
    "stableLessonId" TEXT NOT NULL,
    "stablePeriodId" TEXT NOT NULL,
    "snapshotLocked" INTEGER NOT NULL DEFAULT 0,
    "snapshotVersionId" TEXT,
    "snapshotVersionNumber" INTEGER,
    "snapshotLockedAt" DATETIME,
    "snapshotJson" TEXT,
    "weekMismatchWarning" INTEGER NOT NULL DEFAULT 0,
    "weekMismatchNote" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "uq_otpl_obs_slot" ON "observation_teaching_plan_links"("observationSlotId")`,
  `CREATE INDEX IF NOT EXISTS "idx_otpl_stable_period" ON "observation_teaching_plan_links"("stablePeriodId")`,
  `CREATE INDEX IF NOT EXISTS "idx_otpl_plan" ON "observation_teaching_plan_links"("planId")`,

  `CREATE TABLE IF NOT EXISTS "observation_objective_evidences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evaluationId" TEXT NOT NULL,
    "observationSlotId" TEXT NOT NULL,
    "objectiveIndex" INTEGER NOT NULL,
    "objectiveText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_OBSERVED',
    "evidenceNote" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "uq_ooe_eval_idx" ON "observation_objective_evidences"("evaluationId", "objectiveIndex")`,
  `CREATE INDEX IF NOT EXISTS "idx_ooe_slot" ON "observation_objective_evidences"("observationSlotId")`,

  `CREATE TABLE IF NOT EXISTS "teaching_plan_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "versionId" TEXT,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "detailsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_tpal_plan" ON "teaching_plan_audit_logs"("planId", "createdAt")`,
]

const ALTER_STATEMENTS = [
  `ALTER TABLE "teaching_plans" ADD COLUMN "syncToObservation" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "teaching_plans" ADD COLUMN "syncedToObservationAt" DATETIME`,
  `ALTER TABLE "teaching_plans" ADD COLUMN "syncedToObservationByName" TEXT`,
]

export async function ensureTeachingPlanSchema(): Promise<void> {
  if (schemaInitialized) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    for (const sql of DDL_STATEMENTS) {
      await prisma.$executeRawUnsafe(sql)
    }
    for (const alterSql of ALTER_STATEMENTS) {
      try {
        await prisma.$executeRawUnsafe(alterSql)
      } catch (e: any) {
        const msg = String(e?.message || "").toLowerCase()
        if (!msg.includes("duplicate column")) {
          // Ignore already-exists column errors cleanly
        }
      }
    }
    schemaInitialized = true
  })().catch((err) => {
    initPromise = null
    throw err
  })

  return initPromise
}
