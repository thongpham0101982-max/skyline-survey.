import { prisma } from "@/lib/db"

let schemaInitialized = false
let initPromise: Promise<void> | null = null

const DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "StudentNameChangeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "academicYearId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentCode" TEXT NOT NULL,
    "vnEduCode" TEXT,
    "oldName" TEXT NOT NULL,
    "newName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT,
    "requestedByName" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedByName" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedByName" TEXT,
    "approvedAt" DATETIME,
    "rejectReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "StudentNameChangeRequest_academicYearId_idx" ON "StudentNameChangeRequest"("academicYearId")`,
  `CREATE INDEX IF NOT EXISTS "StudentNameChangeRequest_campusId_idx" ON "StudentNameChangeRequest"("campusId")`,
  `CREATE INDEX IF NOT EXISTS "StudentNameChangeRequest_classId_idx" ON "StudentNameChangeRequest"("classId")`,
  `CREATE INDEX IF NOT EXISTS "StudentNameChangeRequest_studentId_idx" ON "StudentNameChangeRequest"("studentId")`,
  `CREATE INDEX IF NOT EXISTS "StudentNameChangeRequest_status_idx" ON "StudentNameChangeRequest"("status")`,
]

export async function ensureStudentNameChangeSchema(): Promise<void> {
  if (schemaInitialized) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    for (const stmt of DDL_STATEMENTS) {
      await prisma.$executeRawUnsafe(stmt)
    }
    schemaInitialized = true
  })().catch((err) => {
    initPromise = null
    throw err
  })

  return initPromise
}
