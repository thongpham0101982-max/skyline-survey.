import { prisma } from "@/lib/db";
import { ensureCoordinationTables } from "@/lib/coordination/schemaInit";

let schemaInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Idempotently creates the Digital Parent Meeting tables and indexes in SQLite / Turso.
 * Safe for production: uses CREATE TABLE IF NOT EXISTS & CREATE INDEX IF NOT EXISTS.
 * Never alters or drops existing SSM tables.
 */
export async function ensureParentMeetingTables(): Promise<void> {
    if (schemaInitialized) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            await ensureCoordinationTables();

            const statements = [
                `CREATE TABLE IF NOT EXISTS "parent_meetings" (
                    "id" TEXT NOT NULL PRIMARY KEY,
                    "meetingCode" TEXT NOT NULL UNIQUE,
                    "title" TEXT NOT NULL,
                    "meetingType" TEXT NOT NULL DEFAULT 'DINH_KY',
                    "academicYearId" TEXT NOT NULL,
                    "semester" TEXT NOT NULL DEFAULT 'HK1',
                    "campusId" TEXT NOT NULL,
                    "grade" TEXT,
                    "level" TEXT,
                    "startTime" DATETIME NOT NULL,
                    "endTime" DATETIME NOT NULL,
                    "location" TEXT,
                    "onlineLink" TEXT,
                    "agenda" TEXT,
                    "contentSummary" TEXT,
                    "hostUserId" TEXT NOT NULL,
                    "hostName" TEXT NOT NULL,
                    "plannerUserId" TEXT NOT NULL,
                    "plannerName" TEXT NOT NULL,
                    "status" TEXT NOT NULL DEFAULT 'DRAFT',
                    "rsvpOpenAt" DATETIME,
                    "rsvpCloseAt" DATETIME,
                    "checkInOpenAt" DATETIME,
                    "checkInCloseAt" DATETIME,
                    "allowPreQuestions" BOOLEAN NOT NULL DEFAULT 1,
                    "publishedAt" DATETIME,
                    "approvedByUserId" TEXT,
                    "approvedByName" TEXT,
                    "approvedAt" DATETIME,
                    "cancelReason" TEXT,
                    "clonedFromId" TEXT,
                    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE INDEX IF NOT EXISTS "idx_pm_year_campus_status" ON "parent_meetings"("academicYearId", "campusId", "status")`,
                `CREATE INDEX IF NOT EXISTS "idx_pm_start_status" ON "parent_meetings"("startTime", "status")`,
                `CREATE INDEX IF NOT EXISTS "idx_pm_host" ON "parent_meetings"("hostUserId")`,

                `CREATE TABLE IF NOT EXISTS "parent_meeting_classes" (
                    "id" TEXT NOT NULL PRIMARY KEY,
                    "meetingId" TEXT NOT NULL,
                    "classId" TEXT NOT NULL,
                    "className" TEXT NOT NULL,
                    "grade" TEXT,
                    "campusId" TEXT NOT NULL,
                    "homeroomTeacherId" TEXT,
                    "homeroomTeacherName" TEXT,
                    "roomOverride" TEXT,
                    "onlineLinkOverride" TEXT,
                    "preparationNotes" TEXT,
                    "keyDocumentsJson" TEXT,
                    "totalStudents" INTEGER NOT NULL DEFAULT 0,
                    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY ("meetingId") REFERENCES "parent_meetings"("id") ON DELETE CASCADE
                )`,
                `CREATE UNIQUE INDEX IF NOT EXISTS "uq_pmc_meeting_class" ON "parent_meeting_classes"("meetingId", "classId")`,
                `CREATE INDEX IF NOT EXISTS "idx_pmc_class" ON "parent_meeting_classes"("classId")`,
                `CREATE INDEX IF NOT EXISTS "idx_pmc_homeroom" ON "parent_meeting_classes"("homeroomTeacherId")`,

                `CREATE TABLE IF NOT EXISTS "parent_meeting_invitations" (
                    "id" TEXT NOT NULL PRIMARY KEY,
                    "meetingId" TEXT NOT NULL,
                    "classId" TEXT NOT NULL,
                    "studentId" TEXT NOT NULL,
                    "studentCode" TEXT,
                    "studentName" TEXT NOT NULL,
                    "parentId" TEXT NOT NULL,
                    "parentUserId" TEXT,
                    "parentName" TEXT NOT NULL,
                    "parentPhone" TEXT,
                    "parentEmail" TEXT,
                    "relationship" TEXT NOT NULL DEFAULT 'PHU_HUYNH',
                    "rsvpStatus" TEXT NOT NULL DEFAULT 'PENDING',
                    "attendeeRole" TEXT,
                    "attendeeName" TEXT,
                    "attendeePhone" TEXT,
                    "delegateRelationship" TEXT,
                    "absenceReason" TEXT,
                    "expectedHeadcount" INTEGER NOT NULL DEFAULT 1,
                    "rsvpNote" TEXT,
                    "rsvpUpdatedAt" DATETIME,
                    "notifiedAt" DATETIME,
                    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY ("meetingId") REFERENCES "parent_meetings"("id") ON DELETE CASCADE
                )`,
                `CREATE UNIQUE INDEX IF NOT EXISTS "uq_pmi_meeting_student_parent" ON "parent_meeting_invitations"("meetingId", "studentId", "parentId")`,
                `CREATE INDEX IF NOT EXISTS "idx_pmi_meeting_class_rsvp" ON "parent_meeting_invitations"("meetingId", "classId", "rsvpStatus")`,
                `CREATE INDEX IF NOT EXISTS "idx_pmi_parent_student" ON "parent_meeting_invitations"("parentId", "studentId")`,
                `CREATE INDEX IF NOT EXISTS "idx_pmi_parent_user" ON "parent_meeting_invitations"("parentUserId")`,

                `CREATE TABLE IF NOT EXISTS "parent_meeting_qr_sessions" (
                    "id" TEXT NOT NULL PRIMARY KEY,
                    "tokenHash" TEXT NOT NULL UNIQUE,
                    "qrToken" TEXT NOT NULL UNIQUE,
                    "meetingId" TEXT NOT NULL,
                    "classId" TEXT NOT NULL,
                    "studentId" TEXT NOT NULL,
                    "parentId" TEXT NOT NULL,
                    "issuedToUserId" TEXT NOT NULL,
                    "attendeeRole" TEXT NOT NULL DEFAULT 'PHU_HUYNH',
                    "attendeeName" TEXT,
                    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
                    "expiresAt" DATETIME NOT NULL,
                    "scanCount" INTEGER NOT NULL DEFAULT 0,
                    "firstScannedAt" DATETIME,
                    "lastScannedAt" DATETIME,
                    "lastScannedByUserId" TEXT,
                    "nonce" TEXT NOT NULL,
                    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY ("meetingId") REFERENCES "parent_meetings"("id") ON DELETE CASCADE
                )`,
                `CREATE INDEX IF NOT EXISTS "idx_pmqr_meeting_student_parent" ON "parent_meeting_qr_sessions"("meetingId", "studentId", "parentId")`,
                `CREATE INDEX IF NOT EXISTS "idx_pmqr_expires_status" ON "parent_meeting_qr_sessions"("expiresAt", "status")`,

                `CREATE TABLE IF NOT EXISTS "parent_meeting_attendance" (
                    "id" TEXT NOT NULL PRIMARY KEY,
                    "meetingId" TEXT NOT NULL,
                    "classId" TEXT NOT NULL,
                    "studentId" TEXT NOT NULL,
                    "studentName" TEXT,
                    "parentId" TEXT NOT NULL,
                    "qrSessionId" TEXT,
                    "checkInMethod" TEXT NOT NULL DEFAULT 'QR_SCAN',
                    "attendanceStatus" TEXT NOT NULL DEFAULT 'PRESENT',
                    "attendeeName" TEXT NOT NULL,
                    "attendeeRole" TEXT NOT NULL DEFAULT 'PHU_HUYNH',
                    "attendeeCount" INTEGER NOT NULL DEFAULT 1,
                    "relationshipNote" TEXT,
                    "manualReason" TEXT,
                    "isLate" BOOLEAN NOT NULL DEFAULT 0,
                    "checkedInAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "verifiedByUserId" TEXT NOT NULL,
                    "verifiedByName" TEXT NOT NULL,
                    "idempotencyKey" TEXT NOT NULL UNIQUE,
                    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY ("meetingId") REFERENCES "parent_meetings"("id") ON DELETE CASCADE
                )`,
                `CREATE UNIQUE INDEX IF NOT EXISTS "uq_pma_meeting_student_parent" ON "parent_meeting_attendance"("meetingId", "studentId", "parentId")`,
                `CREATE INDEX IF NOT EXISTS "idx_pma_meeting_class_status" ON "parent_meeting_attendance"("meetingId", "classId", "attendanceStatus")`,
                `CREATE INDEX IF NOT EXISTS "idx_pma_student_meeting" ON "parent_meeting_attendance"("studentId", "meetingId")`,

                `CREATE TABLE IF NOT EXISTS "parent_meeting_feedback_links" (
                    "id" TEXT NOT NULL PRIMARY KEY,
                    "feedbackCode" TEXT NOT NULL UNIQUE,
                    "meetingId" TEXT NOT NULL,
                    "classId" TEXT NOT NULL,
                    "campusId" TEXT NOT NULL,
                    "academicYearId" TEXT NOT NULL,
                    "studentId" TEXT NOT NULL,
                    "studentName" TEXT,
                    "parentId" TEXT NOT NULL,
                    "parentName" TEXT,
                    "threadId" TEXT,
                    "caseId" TEXT,
                    "stage" TEXT NOT NULL DEFAULT 'PRE_MEETING',
                    "topicGroup" TEXT NOT NULL DEFAULT 'KET_QUA_HOC_TAP',
                    "title" TEXT NOT NULL,
                    "content" TEXT NOT NULL,
                    "attachmentsJson" TEXT,
                    "visibilityScope" TEXT NOT NULL DEFAULT 'PRIVATE',
                    "isAnonymousInMinutes" BOOLEAN NOT NULL DEFAULT 1,
                    "allowShareInSummary" BOOLEAN NOT NULL DEFAULT 0,
                    "receiverUserId" TEXT NOT NULL,
                    "receiverName" TEXT NOT NULL,
                    "assigneeUserId" TEXT NOT NULL,
                    "assigneeName" TEXT NOT NULL,
                    "assigneeRole" TEXT NOT NULL DEFAULT 'GVCN',
                    "dueAt" DATETIME NOT NULL,
                    "businessStatus" TEXT NOT NULL DEFAULT 'NEW',
                    "resolutionSummary" TEXT,
                    "csatScore" INTEGER,
                    "csatComment" TEXT,
                    "csatRatedAt" DATETIME,
                    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY ("meetingId") REFERENCES "parent_meetings"("id") ON DELETE CASCADE
                )`,
                `CREATE INDEX IF NOT EXISTS "idx_pmfl_meeting_class_status" ON "parent_meeting_feedback_links"("meetingId", "classId", "businessStatus")`,
                `CREATE INDEX IF NOT EXISTS "idx_pmfl_assignee_status" ON "parent_meeting_feedback_links"("assigneeUserId", "businessStatus")`,
                `CREATE INDEX IF NOT EXISTS "idx_pmfl_parent_student" ON "parent_meeting_feedback_links"("parentId", "studentId")`,
                `CREATE INDEX IF NOT EXISTS "idx_pmfl_campus_year_topic" ON "parent_meeting_feedback_links"("campusId", "academicYearId", "topicGroup")`,

                `CREATE TABLE IF NOT EXISTS "parent_meeting_minutes" (
                    "id" TEXT NOT NULL PRIMARY KEY,
                    "meetingId" TEXT NOT NULL,
                    "classId" TEXT NOT NULL,
                    "className" TEXT,
                    "campusId" TEXT NOT NULL,
                    "academicYearId" TEXT NOT NULL,
                    "version" INTEGER NOT NULL DEFAULT 1,
                    "status" TEXT NOT NULL DEFAULT 'DRAFT',
                    "totalStudents" INTEGER NOT NULL DEFAULT 0,
                    "invitedCount" INTEGER NOT NULL DEFAULT 0,
                    "confirmedCount" INTEGER NOT NULL DEFAULT 0,
                    "presentStudentCount" INTEGER NOT NULL DEFAULT 0,
                    "actualAttendeeCount" INTEGER NOT NULL DEFAULT 0,
                    "attendanceRate" REAL NOT NULL DEFAULT 0,
                    "attendeeSummary" TEXT,
                    "presentationContent" TEXT,
                    "discussionIssues" TEXT,
                    "generalFeedbackSummary" TEXT,
                    "conclusions" TEXT,
                    "agreedActions" TEXT,
                    "nextTasksSummary" TEXT,
                    "recorderUserId" TEXT NOT NULL,
                    "recorderName" TEXT NOT NULL,
                    "approverUserId" TEXT,
                    "approverName" TEXT,
                    "approvedAt" DATETIME,
                    "approvalNote" TEXT,
                    "publishedAt" DATETIME,
                    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY ("meetingId") REFERENCES "parent_meetings"("id") ON DELETE CASCADE
                )`,
                `CREATE UNIQUE INDEX IF NOT EXISTS "uq_pmm_meeting_class" ON "parent_meeting_minutes"("meetingId", "classId")`,
                `CREATE INDEX IF NOT EXISTS "idx_pmm_campus_status" ON "parent_meeting_minutes"("campusId", "status")`,

                `CREATE TABLE IF NOT EXISTS "parent_meeting_minutes_versions" (
                    "id" TEXT NOT NULL PRIMARY KEY,
                    "minutesId" TEXT NOT NULL,
                    "versionNumber" INTEGER NOT NULL,
                    "snapshotJson" TEXT NOT NULL,
                    "changedByUserId" TEXT NOT NULL,
                    "changedByName" TEXT NOT NULL,
                    "changeSummary" TEXT,
                    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY ("minutesId") REFERENCES "parent_meeting_minutes"("id") ON DELETE CASCADE
                )`,
                `CREATE INDEX IF NOT EXISTS "idx_pmmv_minutes_ver" ON "parent_meeting_minutes_versions"("minutesId", "versionNumber")`,

                `CREATE TABLE IF NOT EXISTS "parent_meeting_tasks" (
                    "id" TEXT NOT NULL PRIMARY KEY,
                    "taskCode" TEXT NOT NULL UNIQUE,
                    "meetingId" TEXT NOT NULL,
                    "classId" TEXT NOT NULL,
                    "campusId" TEXT NOT NULL,
                    "academicYearId" TEXT NOT NULL,
                    "minutesId" TEXT,
                    "feedbackLinkId" TEXT,
                    "studentId" TEXT,
                    "studentName" TEXT,
                    "linkedWorkTaskId" TEXT,
                    "title" TEXT NOT NULL,
                    "description" TEXT,
                    "assigneeUserId" TEXT NOT NULL,
                    "assigneeName" TEXT NOT NULL,
                    "assigneeRole" TEXT NOT NULL DEFAULT 'GVCN',
                    "department" TEXT,
                    "dueAt" DATETIME NOT NULL,
                    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
                    "status" TEXT NOT NULL DEFAULT 'NEW',
                    "visibleToParents" BOOLEAN NOT NULL DEFAULT 0,
                    "evidenceUrl" TEXT,
                    "evidenceNote" TEXT,
                    "resultSummary" TEXT,
                    "completedAt" DATETIME,
                    "createdByUserId" TEXT NOT NULL,
                    "createdByName" TEXT NOT NULL,
                    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY ("meetingId") REFERENCES "parent_meetings"("id") ON DELETE CASCADE
                )`,
                `CREATE INDEX IF NOT EXISTS "idx_pmt_meeting_class_status" ON "parent_meeting_tasks"("meetingId", "classId", "status")`,
                `CREATE INDEX IF NOT EXISTS "idx_pmt_assignee_status_due" ON "parent_meeting_tasks"("assigneeUserId", "status", "dueAt")`,
                `CREATE INDEX IF NOT EXISTS "idx_pmt_campus_year" ON "parent_meeting_tasks"("campusId", "academicYearId")`,

                `CREATE TABLE IF NOT EXISTS "parent_meeting_audit_logs" (
                    "id" TEXT NOT NULL PRIMARY KEY,
                    "meetingId" TEXT,
                    "classId" TEXT,
                    "actorUserId" TEXT NOT NULL,
                    "actorName" TEXT NOT NULL,
                    "actorRole" TEXT NOT NULL,
                    "action" TEXT NOT NULL,
                    "targetType" TEXT NOT NULL,
                    "targetId" TEXT NOT NULL,
                    "metadataJson" TEXT,
                    "ipAddress" TEXT,
                    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )`,
                `CREATE INDEX IF NOT EXISTS "idx_pmal_meeting_created" ON "parent_meeting_audit_logs"("meetingId", "createdAt")`,
                `CREATE INDEX IF NOT EXISTS "idx_pmal_actor_created" ON "parent_meeting_audit_logs"("actorUserId", "createdAt")`,
            ];

            for (const sql of statements) {
                await prisma.$executeRawUnsafe(sql);
            }

            schemaInitialized = true;
        } catch (err) {
            console.error("[ParentMeetingSchemaInit] Error initializing tables:", err);
            initPromise = null;
            throw err;
        }
    })();

    return initPromise;
}

/**
 * Rollback statements for emergency tear-down in non-production or isolated rollback scenarios.
 * Does not touch any pre-existing SSM table.
 */
export const PARENT_MEETING_ROLLBACK_SQL = [
    `DROP TABLE IF EXISTS "parent_meeting_audit_logs"`,
    `DROP TABLE IF EXISTS "parent_meeting_tasks"`,
    `DROP TABLE IF EXISTS "parent_meeting_minutes_versions"`,
    `DROP TABLE IF EXISTS "parent_meeting_minutes"`,
    `DROP TABLE IF EXISTS "parent_meeting_feedback_links"`,
    `DROP TABLE IF EXISTS "parent_meeting_attendance"`,
    `DROP TABLE IF EXISTS "parent_meeting_qr_sessions"`,
    `DROP TABLE IF EXISTS "parent_meeting_invitations"`,
    `DROP TABLE IF EXISTS "parent_meeting_classes"`,
    `DROP TABLE IF EXISTS "parent_meetings"`,
];
