import { prisma } from "@/lib/db"

let schemaInitialized = false
let initPromise: Promise<void> | null = null

const ALTER_TIMETABLE_SLOT_COLUMNS = [
  `ALTER TABLE "TimetableSlot" ADD COLUMN "versionId" TEXT`,
  `ALTER TABLE "TimetableSlot" ADD COLUMN "semester" INTEGER DEFAULT 1`,
  `ALTER TABLE "TimetableSlot" ADD COLUMN "roomId" TEXT`,
  `ALTER TABLE "TimetableSlot" ADD COLUMN "roomCode" TEXT`,
  `ALTER TABLE "TimetableSlot" ADD COLUMN "roomName" TEXT`,
  `ALTER TABLE "TimetableSlot" ADD COLUMN "coTeacherId" TEXT`,
  `ALTER TABLE "TimetableSlot" ADD COLUMN "coTeacherCode" TEXT`,
  `ALTER TABLE "TimetableSlot" ADD COLUMN "coTeacherName" TEXT`,
  `ALTER TABLE "TimetableSlot" ADD COLUMN "assistantTeacherId" TEXT`,
  `ALTER TABLE "TimetableSlot" ADD COLUMN "assistantTeacherCode" TEXT`,
  `ALTER TABLE "TimetableSlot" ADD COLUMN "assistantTeacherName" TEXT`,
  `ALTER TABLE "TimetableSlot" ADD COLUMN "altSubjectId" TEXT`,
  `ALTER TABLE "TimetableSlot" ADD COLUMN "altTeacherId" TEXT`,
  `ALTER TABLE "TimetableSlot" ADD COLUMN "altTeacherCode" TEXT`,
  `ALTER TABLE "TimetableSlot" ADD COLUMN "altRoomId" TEXT`,
  `ALTER TABLE "TimetableSlot" ADD COLUMN "altRoomName" TEXT`,
  `ALTER TABLE "TimetableSlot" ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT 0`,
  `ALTER TABLE "TimetableSlot" ADD COLUMN "blockGroupId" TEXT`,
  `ALTER TABLE "TimetableSlot" ADD COLUMN "slotRevision" INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE "TimetableSlot" ADD COLUMN "notes" TEXT`,
  `ALTER TABLE "TimetableSlot" ADD COLUMN "updatedById" TEXT`,
]

const CREATE_TABLES_AND_INDEXES = [
  `CREATE UNIQUE INDEX IF NOT EXISTS "uq_timetable_slot_version_cell" ON "TimetableSlot"("versionId", "classId", "dayOfWeek", "session", "periodNumber") WHERE "versionId" IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS "idx_timetable_slot_version" ON "TimetableSlot"("versionId")`,
  `CREATE INDEX IF NOT EXISTS "idx_timetable_slot_teacher_day" ON "TimetableSlot"("teacherId", "dayOfWeek", "session", "periodNumber")`,
  `CREATE INDEX IF NOT EXISTS "idx_timetable_slot_coteacher_day" ON "TimetableSlot"("coTeacherId", "dayOfWeek")`,
  `CREATE INDEX IF NOT EXISTS "idx_timetable_slot_assistant_day" ON "TimetableSlot"("assistantTeacherId", "dayOfWeek")`,
  `CREATE INDEX IF NOT EXISTS "idx_timetable_slot_altteacher_day" ON "TimetableSlot"("altTeacherId", "dayOfWeek")`,
  `CREATE INDEX IF NOT EXISTS "idx_timetable_slot_room_day" ON "TimetableSlot"("roomId", "dayOfWeek", "session", "periodNumber")`,

  `CREATE TABLE IF NOT EXISTS "timetable_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "semester" INTEGER NOT NULL DEFAULT 1,
    "scopeGroup" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "levelCode" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TEXT,
    "effectiveTo" TEXT,
    "baseVersionId" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "reviewComment" TEXT,
    "notes" TEXT,
    "submittedById" TEXT,
    "submittedByName" TEXT,
    "submittedAt" DATETIME,
    "approvedById" TEXT,
    "approvedByName" TEXT,
    "approvedAt" DATETIME,
    "publishedById" TEXT,
    "publishedByName" TEXT,
    "publishedAt" DATETIME,
    "returnedById" TEXT,
    "returnedByName" TEXT,
    "returnedAt" DATETIME,
    "expiredAt" DATETIME,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "uq_timetable_versions_code" ON "timetable_versions"("code")`,
  `CREATE INDEX IF NOT EXISTS "idx_timetable_versions_scope_status" ON "timetable_versions"("academicYearId", "semester", "campusId", "scopeGroup", "status")`,
  `CREATE INDEX IF NOT EXISTS "idx_timetable_versions_effective" ON "timetable_versions"("campusId", "status", "effectiveFrom", "effectiveTo")`,

  `CREATE TABLE IF NOT EXISTS "timetable_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "academicYearId" TEXT NOT NULL,
    "semester" INTEGER NOT NULL DEFAULT 1,
    "campusId" TEXT NOT NULL,
    "scopeGroup" TEXT NOT NULL,
    "levelCode" TEXT NOT NULL DEFAULT 'ALL',
    "workingDaysJson" TEXT NOT NULL DEFAULT '["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"]',
    "morningPeriods" INTEGER NOT NULL DEFAULT 4,
    "afternoonPeriods" INTEGER NOT NULL DEFAULT 4,
    "periodTimesJson" TEXT NOT NULL DEFAULT '[]',
    "cycleWeeks" INTEGER NOT NULL DEFAULT 2,
    "cycleAnchorDate" TEXT,
    "fixedSlotsJson" TEXT NOT NULL DEFAULT '[]',
    "blockRulesJson" TEXT NOT NULL DEFAULT '[]',
    "limitsAndPrioritiesJson" TEXT NOT NULL DEFAULT '{}',
    "effectiveFrom" TEXT,
    "effectiveTo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "updatedById" TEXT,
    "updatedByName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "uq_timetable_configs_scope" ON "timetable_configs"("academicYearId", "semester", "campusId", "scopeGroup", "levelCode")`,

  `CREATE TABLE IF NOT EXISTS "timetable_rooms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campusId" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "roomType" TEXT NOT NULL DEFAULT 'CLASSROOM',
    "capacity" INTEGER NOT NULL DEFAULT 35,
    "allowedSubjectIdsJson" TEXT NOT NULL DEFAULT '[]',
    "assignedClassId" TEXT,
    "effectiveFrom" TEXT,
    "effectiveTo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "uq_timetable_rooms_campus_code" ON "timetable_rooms"("campusId", "roomCode")`,
  `CREATE INDEX IF NOT EXISTS "idx_timetable_rooms_campus_type" ON "timetable_rooms"("campusId", "roomType", "status")`,

  `CREATE TABLE IF NOT EXISTS "timetable_busy_slots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "academicYearId" TEXT NOT NULL,
    "semester" INTEGER NOT NULL DEFAULT 1,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "campusId" TEXT,
    "dayOfWeek" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "weekType" TEXT NOT NULL DEFAULT 'ALL',
    "reason" TEXT,
    "effectiveFrom" TEXT,
    "effectiveTo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_timetable_busy_target" ON "timetable_busy_slots"("academicYearId", "semester", "targetType", "targetId", "status")`,

  `CREATE TABLE IF NOT EXISTS "timetable_travel_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "academicYearId" TEXT NOT NULL,
    "fromCampusId" TEXT NOT NULL,
    "toCampusId" TEXT NOT NULL,
    "minTravelMinutes" INTEGER NOT NULL DEFAULT 40,
    "allowSameSession" BOOLEAN NOT NULL DEFAULT 0,
    "allowSameDay" BOOLEAN NOT NULL DEFAULT 1,
    "effectiveFrom" TEXT,
    "effectiveTo" TEXT,
    "notes" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "uq_timetable_travel_pair" ON "timetable_travel_rules"("academicYearId", "fromCampusId", "toCampusId")`,

  `CREATE TABLE IF NOT EXISTS "timetable_substitutions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "academicYearId" TEXT NOT NULL,
    "semester" INTEGER NOT NULL DEFAULT 1,
    "campusId" TEXT NOT NULL,
    "versionId" TEXT,
    "slotId" TEXT,
    "targetDate" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "originalSubjectId" TEXT,
    "originalSubjectName" TEXT,
    "originalTeacherId" TEXT,
    "originalTeacherCode" TEXT,
    "originalTeacherName" TEXT,
    "originalRoomId" TEXT,
    "originalRoomName" TEXT,
    "newSubjectId" TEXT,
    "newSubjectName" TEXT,
    "substituteTeacherId" TEXT,
    "substituteTeacherCode" TEXT,
    "substituteTeacherName" TEXT,
    "newRoomId" TEXT,
    "newRoomName" TEXT,
    "swapTargetDate" TEXT,
    "swapDayOfWeek" TEXT,
    "swapSession" TEXT,
    "swapPeriodNumber" INTEGER,
    "swapSlotId" TEXT,
    "beforeSnapshotJson" TEXT NOT NULL DEFAULT '{}',
    "afterSnapshotJson" TEXT NOT NULL DEFAULT '{}',
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "cancelledById" TEXT,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_timetable_sub_date_campus" ON "timetable_substitutions"("targetDate", "campusId", "status")`,
  `CREATE INDEX IF NOT EXISTS "idx_timetable_sub_class_date" ON "timetable_substitutions"("classId", "targetDate", "status")`,
  `CREATE INDEX IF NOT EXISTS "idx_timetable_sub_orig_teacher_date" ON "timetable_substitutions"("originalTeacherId", "targetDate", "status")`,
  `CREATE INDEX IF NOT EXISTS "idx_timetable_sub_new_teacher_date" ON "timetable_substitutions"("substituteTeacherId", "targetDate", "status")`,

  `CREATE TABLE IF NOT EXISTS "timetable_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "versionId" TEXT,
    "campusId" TEXT,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_timetable_audit_version" ON "timetable_audit_logs"("versionId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "idx_timetable_audit_campus" ON "timetable_audit_logs"("campusId", "createdAt")`,
]

/**
 * Idempotently runs additive DDL for Timetable v2.
 * Never mutates, deletes, or inserts test/sample records.
 */
export async function ensureTimetableSchema(): Promise<void> {
  if (schemaInitialized) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      const pAny = prisma as any
      if (!pAny || typeof pAny.$executeRawUnsafe !== "function") {
        schemaInitialized = true
        return
      }

      for (const sql of ALTER_TIMETABLE_SLOT_COLUMNS) {
        try {
          await pAny.$executeRawUnsafe(sql)
        } catch (err: any) {
          const msg = String(err?.message || "").toLowerCase()
          if (msg.includes("duplicate column") || msg.includes("already exists")) {
            continue
          }
          // In mocked unit-test environments, ignore no-such-table if mock returns empty
          if (msg.includes("no such table")) {
            continue
          }
          throw err
        }
      }

      for (const sql of CREATE_TABLES_AND_INDEXES) {
        await pAny.$executeRawUnsafe(sql)
      }

      schemaInitialized = true
    } catch (err) {
      console.error("[TimetableSchemaInit] Failed to ensure timetable schema:", err)
      initPromise = null
      throw err
    }
  })()

  return initPromise
}

export function resetTimetableSchemaInitFlagForTest() {
  schemaInitialized = false
  initPromise = null
}
