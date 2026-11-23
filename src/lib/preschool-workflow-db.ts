import crypto from "crypto"
import { prisma } from "@/lib/db"

let schemaEnsured = false

/**
 * Ensures the additive B1–B13 columns and tables exist on both local SQLite and Turso Cloud.
 * Runs idempotently once per process so existing data is never touched or lost.
 */
export async function ensurePreschoolWorkflowSchema(): Promise<void> {
  if (schemaEnsured) return

  const studentAlterColumns = [
    `ALTER TABLE "PreschoolInputAssessmentStudent" ADD COLUMN "registeredCampus" TEXT`,
    `ALTER TABLE "PreschoolInputAssessmentStudent" ADD COLUMN "ownerUserId" TEXT`,
    `ALTER TABLE "PreschoolInputAssessmentStudent" ADD COLUMN "ownerUserName" TEXT`,
    `ALTER TABLE "PreschoolInputAssessmentStudent" ADD COLUMN "intakeMode" TEXT`,
    `ALTER TABLE "PreschoolInputAssessmentStudent" ADD COLUMN "appointmentAt" DATETIME`,
    `ALTER TABLE "PreschoolInputAssessmentStudent" ADD COLUMN "workflowStatus" TEXT NOT NULL DEFAULT 'DA_HEN'`,
    `ALTER TABLE "PreschoolInputAssessmentStudent" ADD COLUMN "finalApprovedOutcome" TEXT`,
    `ALTER TABLE "PreschoolInputAssessmentStudent" ADD COLUMN "parentConsultationNote" TEXT`,
    `ALTER TABLE "PreschoolInputAssessmentStudent" ADD COLUMN "parentConsultationAt" DATETIME`,
    `ALTER TABLE "PreschoolInputAssessmentStudent" ADD COLUMN "parentConsultationBy" TEXT`,
    `ALTER TABLE "PreschoolInputAssessmentStudent" ADD COLUMN "resultDeliveredAt" DATETIME`,
    `ALTER TABLE "PreschoolInputAssessmentStudent" ADD COLUMN "resultDeliveredBy" TEXT`,
    `ALTER TABLE "PreschoolInputAssessmentStudent" ADD COLUMN "resultDeliveryNote" TEXT`,
    `ALTER TABLE "PreschoolInputAssessmentStudent" ADD COLUMN "archivedAt" DATETIME`,
    `ALTER TABLE "PreschoolInputAssessmentStudent" ADD COLUMN "archivedBy" TEXT`,
    `ALTER TABLE "PreschoolInputAssessmentStudent" ADD COLUMN "archiveNote" TEXT`,
  ]

  for (const sql of studentAlterColumns) {
    try {
      await prisma.$executeRawUnsafe(sql)
    } catch {
      // Column already exists
    }
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PreschoolAssessmentRound" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentId" TEXT NOT NULL,
      "roundNumber" INTEGER NOT NULL DEFAULT 1,
      "roundType" TEXT NOT NULL DEFAULT 'KHAO_SAT_MOI',
      "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
      "scheduledAt" DATETIME,
      "actualAt" DATETIME,
      "campusId" TEXT,
      "campusName" TEXT,
      "assignedTeacherId" TEXT,
      "assignedTeacherName" TEXT,
      "assignedMedicalId" TEXT,
      "assignedMedicalName" TEXT,
      "assignedPsychologistId" TEXT,
      "assignedPsychologistName" TEXT,
      "suggestedFormCode" TEXT,
      "formCode" TEXT,
      "formVersion" TEXT DEFAULT '2026.1',
      "isAgeBoundary" BOOLEAN NOT NULL DEFAULT false,
      "ageBoundaryReason" TEXT,
      "formConfirmedBy" TEXT,
      "formConfirmedAt" DATETIME,
      "heightCm" REAL,
      "weightKg" REAL,
      "bmi" REAL,
      "physicalStatus" TEXT,
      "physicalNote" TEXT,
      "medicalUserId" TEXT,
      "medicalUserName" TEXT,
      "medicalCheckedAt" DATETIME,
      "criteriaPayloadJson" TEXT,
      "generalComment" TEXT,
      "experienceObservation" TEXT,
      "teacherSubmittedAt" DATETIME,
      "teacherSubmittedBy" TEXT,
      "psychologyPayloadJson" TEXT,
      "msTeamsReported" BOOLEAN NOT NULL DEFAULT false,
      "msTeamsReportedAt" DATETIME,
      "msTeamsReportNote" TEXT,
      "psychologistSubmittedAt" DATETIME,
      "psychologistSubmittedBy" TEXT,
      "reviewDecision" TEXT,
      "reviewComment" TEXT,
      "reviewedBy" TEXT,
      "reviewedByName" TEXT,
      "reviewedAt" DATETIME,
      "gdcsDecision" TEXT,
      "gdcsComment" TEXT,
      "gdcsUserId" TEXT,
      "gdcsUserName" TEXT,
      "gdcsApprovedAt" DATETIME,
      "issuedLetterCode" TEXT,
      "issuedLetterVersion" TEXT,
      "issuedLetterAt" DATETIME,
      "issuedLetterBy" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PreschoolAssessmentRound_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "PreschoolInputAssessmentStudent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `)

  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "PreschoolAssessmentRound_studentId_roundNumber_key" ON "PreschoolAssessmentRound"("studentId", "roundNumber")`
  )
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "PreschoolAssessmentRound_studentId_idx" ON "PreschoolAssessmentRound"("studentId")`
  )

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PreschoolWorkflowAuditLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentId" TEXT NOT NULL,
      "roundId" TEXT,
      "action" TEXT NOT NULL,
      "fromStatus" TEXT,
      "toStatus" TEXT,
      "actorId" TEXT,
      "actorName" TEXT,
      "actorRole" TEXT,
      "source" TEXT NOT NULL DEFAULT 'WEB_UI',
      "detailJson" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PreschoolWorkflowAuditLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "PreschoolInputAssessmentStudent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `)

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "PreschoolWorkflowAuditLog_studentId_idx" ON "PreschoolWorkflowAuditLog"("studentId")`
  )

  schemaEnsured = true
}

export function generateId(prefix = "psw"): string {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`
}

export async function appendPreschoolAuditLog(params: {
  studentId: string
  roundId?: string | null
  action: string
  fromStatus?: string | null
  toStatus?: string | null
  actorId?: string | null
  actorName?: string | null
  actorRole?: string | null
  source?: "WEB_UI" | "EMAIL_QUICK_APPROVE" | "SYSTEM"
  detail?: Record<string, any> | null
}): Promise<void> {
  await ensurePreschoolWorkflowSchema()
  const id = generateId("plog")
  const nowIso = new Date().toISOString()
  await prisma.$executeRawUnsafe(
    `INSERT INTO "PreschoolWorkflowAuditLog"
      ("id", "studentId", "roundId", "action", "fromStatus", "toStatus", "actorId", "actorName", "actorRole", "source", "detailJson", "createdAt")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    params.studentId,
    params.roundId || null,
    params.action,
    params.fromStatus || null,
    params.toStatus || null,
    params.actorId || null,
    params.actorName || null,
    params.actorRole || null,
    params.source || "WEB_UI",
    params.detail ? JSON.stringify(params.detail) : null,
    nowIso
  )
}

export async function getStudentRounds(studentId: string): Promise<any[]> {
  await ensurePreschoolWorkflowSchema()
  return prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "PreschoolAssessmentRound" WHERE "studentId" = ? ORDER BY "roundNumber" ASC`,
    studentId
  )
}

export async function getStudentAuditLogs(studentId: string): Promise<any[]> {
  await ensurePreschoolWorkflowSchema()
  return prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "PreschoolWorkflowAuditLog" WHERE "studentId" = ? ORDER BY "createdAt" DESC LIMIT 100`,
    studentId
  )
}

export async function getWorkflowStudentRow(studentId: string): Promise<any | null> {
  await ensurePreschoolWorkflowSchema()
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM "PreschoolInputAssessmentStudent" WHERE "id" = ? LIMIT 1`,
    studentId
  )
  return rows[0] || null
}
