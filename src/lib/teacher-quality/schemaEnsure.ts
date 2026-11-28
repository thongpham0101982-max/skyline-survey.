import { prisma } from "@/lib/db"

let teacherQualitySchemaEnsured = false

/**
 * Ensures additive columns and tables for Teacher Achievements & Development exist
 * on both local SQLite and Turso Cloud. Runs idempotently once per process and never
 * seeds or mutates existing records.
 */
export async function ensureTeacherQualitySchema(): Promise<void> {
  if (teacherQualitySchemaEnsured) return

  const teacherAlterColumns = [
    `ALTER TABLE "Teacher" ADD COLUMN "joinDate" DATETIME`,
    `ALTER TABLE "Teacher" ADD COLUMN "joinYear" INTEGER`,
  ]
  for (const sql of teacherAlterColumns) {
    try {
      await prisma.$executeRawUnsafe(sql)
    } catch {
      // Column already exists
    }
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TeacherDevelopmentPlan" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "teacherId" TEXT NOT NULL,
      "academicYearId" TEXT,
      "campusId" TEXT,
      "departmentId" TEXT,
      "observationSlotId" TEXT,
      "observationEvaluationId" TEXT,
      "sourceMonth" TEXT,
      "requestSource" TEXT NOT NULL DEFAULT 'DIRECT',
      "batchGroupId" TEXT,
      "activityType" TEXT,
      "improvementNeeds" TEXT NOT NULL,
      "developmentActivity" TEXT NOT NULL,
      "mentorTeacherId" TEXT,
      "mentorName" TEXT,
      "dueDate" DATETIME,
      "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
      "postCoachingNotes" TEXT,
      "applicationNotes" TEXT,
      "nextSupportNeeds" TEXT,
      "followUpSlotId" TEXT,
      "followUpEvaluationId" TEXT,
      "outcomeRating" TEXT,
      "completedAt" DATETIME,
      "createdById" TEXT,
      "createdByName" TEXT,
      "updatedById" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const devPlanAlterColumns = [
    `ALTER TABLE "TeacherDevelopmentPlan" ADD COLUMN "requestSource" TEXT NOT NULL DEFAULT 'DIRECT'`,
    `ALTER TABLE "TeacherDevelopmentPlan" ADD COLUMN "batchGroupId" TEXT`,
    `ALTER TABLE "TeacherDevelopmentPlan" ADD COLUMN "activityType" TEXT`,
    `ALTER TABLE "TeacherDevelopmentPlan" ADD COLUMN "applicationNotes" TEXT`,
    `ALTER TABLE "TeacherDevelopmentPlan" ADD COLUMN "nextSupportNeeds" TEXT`,
    `ALTER TABLE "TeacherDevelopmentPlan" ADD COLUMN "followUpSlotId" TEXT`,
    `ALTER TABLE "TeacherDevelopmentPlan" ADD COLUMN "followUpEvaluationId" TEXT`,
  ]
  for (const sql of devPlanAlterColumns) {
    try {
      await prisma.$executeRawUnsafe(sql)
    } catch {
      // Column already exists
    }
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TeacherRecognition" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "teacherId" TEXT NOT NULL,
      "academicYearId" TEXT NOT NULL,
      "campusId" TEXT,
      "departmentId" TEXT,
      "groupType" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "issuingAuthority" TEXT,
      "awardScope" TEXT,
      "eventBatch" TEXT,
      "teacherRole" TEXT,
      "participantCount" INTEGER,
      "resultSummary" TEXT,
      "recordedDate" TEXT,
      "dedupKey" TEXT,
      "notes" TEXT,
      "createdById" TEXT,
      "createdByName" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const indexStatements = [
    `CREATE INDEX IF NOT EXISTS "TeacherDevelopmentPlan_teacherId_idx" ON "TeacherDevelopmentPlan"("teacherId")`,
    `CREATE INDEX IF NOT EXISTS "TeacherDevelopmentPlan_academicYearId_idx" ON "TeacherDevelopmentPlan"("academicYearId")`,
    `CREATE INDEX IF NOT EXISTS "TeacherDevelopmentPlan_observationEvaluationId_idx" ON "TeacherDevelopmentPlan"("observationEvaluationId")`,
    `CREATE INDEX IF NOT EXISTS "TeacherDevelopmentPlan_status_idx" ON "TeacherDevelopmentPlan"("status")`,
    `CREATE INDEX IF NOT EXISTS "TeacherDevelopmentPlan_sourceMonth_idx" ON "TeacherDevelopmentPlan"("sourceMonth")`,
    `CREATE INDEX IF NOT EXISTS "TeacherDevelopmentPlan_batchGroupId_idx" ON "TeacherDevelopmentPlan"("batchGroupId")`,
    `CREATE INDEX IF NOT EXISTS "TeacherRecognition_teacherId_idx" ON "TeacherRecognition"("teacherId")`,
    `CREATE INDEX IF NOT EXISTS "TeacherRecognition_academicYearId_idx" ON "TeacherRecognition"("academicYearId")`,
    `CREATE INDEX IF NOT EXISTS "TeacherRecognition_groupType_idx" ON "TeacherRecognition"("groupType")`,
  ]

  for (const sql of indexStatements) {
    try {
      await prisma.$executeRawUnsafe(sql)
    } catch {
      // Ignore if exists
    }
  }

  teacherQualitySchemaEnsured = true
}
