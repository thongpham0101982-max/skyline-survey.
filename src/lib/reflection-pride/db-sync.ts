import { prisma } from "@/lib/db"

let reflectionPrideTablesInitialized = false

export async function ensureReflectionPrideTables() {
  if (reflectionPrideTablesInitialized) return

  const ddlStatements = [
    `CREATE TABLE IF NOT EXISTS "reflection_pride_periods" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "code" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "academicYearId" TEXT NOT NULL,
      "semester" TEXT NOT NULL DEFAULT 'HK1',
      "criteriaVersion" TEXT NOT NULL DEFAULT 'v2026.1',
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "startDate" DATETIME NOT NULL,
      "endDate" DATETIME NOT NULL,
      "extendedUntil" DATETIME,
      "publishedAt" DATETIME,
      "targetGradesJson" TEXT NOT NULL DEFAULT '["4","5","6","7","8","9","10","11","12"]',
      "targetCampusIdsJson" TEXT NOT NULL DEFAULT '["ALL"]',
      "targetClassIdsJson" TEXT NOT NULL DEFAULT '["ALL"]',
      "ip21TargetRate" REAL NOT NULL DEFAULT 90.0,
      "ip21PassThreshold" REAL NOT NULL DEFAULT 72.0,
      "minNpsAnonSample" INTEGER NOT NULL DEFAULT 5,
      "description" TEXT,
      "createdByUserId" TEXT,
      "createdByName" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS "idx_rp_periods_ay_sem" ON "reflection_pride_periods" ("academicYearId", "semester", "status");`,
    `CREATE TABLE IF NOT EXISTS "student_quality_reflections" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "periodId" TEXT NOT NULL,
      "academicYearId" TEXT NOT NULL,
      "semester" TEXT NOT NULL DEFAULT 'HK1',
      "campusId" TEXT NOT NULL,
      "classId" TEXT NOT NULL,
      "gradeLevel" TEXT NOT NULL,
      "studentId" TEXT NOT NULL,
      "studentCode" TEXT NOT NULL,
      "studentName" TEXT NOT NULL,
      "criteriaVersion" TEXT NOT NULL DEFAULT 'v2026.1',
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "currentStep" INTEGER NOT NULL DEFAULT 1,
      "academicSnapshotJson" TEXT NOT NULL DEFAULT '{}',
      "achievementsReflection" TEXT NOT NULL DEFAULT '',
      "improvementsReflection" TEXT NOT NULL DEFAULT '',
      "selectedHighlightTagsJson" TEXT NOT NULL DEFAULT '[]',
      "criteriaRatingsJson" TEXT NOT NULL DEFAULT '{}',
      "q1PatriotismScore" REAL NOT NULL DEFAULT 0,
      "q2CompassionScore" REAL NOT NULL DEFAULT 0,
      "q3DiligenceScore" REAL NOT NULL DEFAULT 0,
      "q4HonestyScore" REAL NOT NULL DEFAULT 0,
      "q5PrideScore" REAL NOT NULL DEFAULT 0,
      "ip21Score16" REAL NOT NULL DEFAULT 0,
      "ip21Percent" REAL NOT NULL DEFAULT 0,
      "ip21Passed" INTEGER NOT NULL DEFAULT 0,
      "extendedScore20" REAL NOT NULL DEFAULT 0,
      "extendedPercent" REAL NOT NULL DEFAULT 0,
      "evidenceText" TEXT,
      "evidenceLinksJson" TEXT NOT NULL DEFAULT '[]',
      "overallSelfComment" TEXT,
      "developmentGoalsJson" TEXT NOT NULL DEFAULT '[]',
      "supportRequestText" TEXT,
      "submittedAt" DATETIME,
      "hasCompletedPrideNps" INTEGER NOT NULL DEFAULT 0,
      "gvcnComment" TEXT,
      "gvcnStrengthsNote" TEXT,
      "gvcnGuidanceNote" TEXT,
      "gvcnReviewedById" TEXT,
      "gvcnReviewedByName" TEXT,
      "gvcnReviewedAt" DATETIME,
      "cvhtLinkedGoalId" TEXT,
      "cvhtLinkedLogId" TEXT,
      "cvhtSyncStatus" TEXT NOT NULL DEFAULT 'NONE',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("periodId", "studentId")
    );`,
    `CREATE INDEX IF NOT EXISTS "idx_sqr_ay_campus_grade_class" ON "student_quality_reflections" ("academicYearId", "semester", "campusId", "gradeLevel", "classId");`,
    `CREATE INDEX IF NOT EXISTS "idx_sqr_student_ay" ON "student_quality_reflections" ("studentId", "academicYearId");`,
    `CREATE INDEX IF NOT EXISTS "idx_sqr_period_class_status" ON "student_quality_reflections" ("periodId", "classId", "status");`,
    `CREATE TABLE IF NOT EXISTS "pride_nps_anonymous_responses" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "periodId" TEXT NOT NULL,
      "academicYearId" TEXT NOT NULL,
      "semester" TEXT NOT NULL DEFAULT 'HK1',
      "campusId" TEXT NOT NULL,
      "classId" TEXT NOT NULL,
      "gradeLevel" TEXT NOT NULL,
      "criteriaVersion" TEXT NOT NULL DEFAULT 'v2026.1',
      "submissionTokenHash" TEXT NOT NULL UNIQUE,
      "npsScore" INTEGER NOT NULL,
      "npsGroup" TEXT NOT NULL,
      "prideDriversJson" TEXT NOT NULL DEFAULT '[]',
      "proudMomentText" TEXT,
      "improvementSuggestion" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS "idx_pnps_period_scope" ON "pride_nps_anonymous_responses" ("periodId", "campusId", "gradeLevel", "classId");`,
    `CREATE INDEX IF NOT EXISTS "idx_pnps_ay_sem_campus" ON "pride_nps_anonymous_responses" ("academicYearId", "semester", "campusId");`,
    `CREATE TABLE IF NOT EXISTS "reflection_task_reminder_logs" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "periodId" TEXT NOT NULL,
      "classId" TEXT NOT NULL,
      "studentId" TEXT NOT NULL,
      "studentName" TEXT,
      "remindedByUserId" TEXT NOT NULL,
      "remindedByName" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS "idx_rtrl_period_class" ON "reflection_task_reminder_logs" ("periodId", "classId", "studentId");`
  ]

  for (const sql of ddlStatements) {
    try {
      await prisma.$executeRawUnsafe(sql)
    } catch (err) {
      console.error("[ReflectionPrideSync] DDL warning:", err)
    }
  }

  reflectionPrideTablesInitialized = true
}
