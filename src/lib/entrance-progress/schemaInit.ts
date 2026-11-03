import { prisma } from "@/lib/db";

let initializedPromise: Promise<void> | null = null;

const DDL_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "entrance_workflow_confirmations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "targetScope" TEXT NOT NULL DEFAULT 'STUDENT',
    "academicYearId" TEXT,
    "isPreschool" INTEGER NOT NULL DEFAULT 0,
    "periodId" TEXT NOT NULL,
    "batchId" TEXT,
    "studentId" TEXT,
    "assignmentId" TEXT,
    "stageNumber" INTEGER NOT NULL,
    "stageCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "deliveryStatus" TEXT DEFAULT 'NOT_SENT',
    "exceptionType" TEXT DEFAULT 'NONE',
    "documentTypes" TEXT,
    "confirmedByUserId" TEXT NOT NULL,
    "confirmedByName" TEXT NOT NULL,
    "confirmedByRole" TEXT NOT NULL,
    "confirmedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parentReadAt" DATETIME,
    "note" TEXT,
    "metadataJson" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "ewc_period_batch_stage_idx" ON "entrance_workflow_confirmations"("periodId", "batchId", "stageNumber")`,
  `CREATE INDEX IF NOT EXISTS "ewc_student_stage_idx" ON "entrance_workflow_confirmations"("studentId", "stageNumber")`,
  `CREATE INDEX IF NOT EXISTS "ewc_assignment_stage_idx" ON "entrance_workflow_confirmations"("assignmentId", "stageNumber")`,

  `CREATE TABLE IF NOT EXISTS "entrance_workflow_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "academicYearId" TEXT,
    "isPreschool" INTEGER NOT NULL DEFAULT 0,
    "periodId" TEXT NOT NULL,
    "batchId" TEXT,
    "studentId" TEXT,
    "studentCode" TEXT,
    "studentName" TEXT,
    "assignmentId" TEXT,
    "stageNumber" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "reasonOrNote" TEXT,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "ewal_period_created_idx" ON "entrance_workflow_audit_logs"("periodId", "createdAt" DESC)`,
  `CREATE INDEX IF NOT EXISTS "ewal_student_created_idx" ON "entrance_workflow_audit_logs"("studentId", "createdAt" DESC)`,
];

export async function ensureEntranceProgressSchema(): Promise<void> {
  if (!initializedPromise) {
    initializedPromise = (async () => {
      const pAny = prisma as any;
      if (typeof pAny.$executeRawUnsafe !== "function") return;
      for (const ddl of DDL_STATEMENTS) {
        try {
          await pAny.$executeRawUnsafe(ddl);
        } catch (err) {
          console.warn("[ensureEntranceProgressSchema] DDL warning:", err);
        }
      }
    })().catch((err) => {
      initializedPromise = null;
      console.error("[ensureEntranceProgressSchema] Init failed:", err);
    });
  }
  return initializedPromise;
}
