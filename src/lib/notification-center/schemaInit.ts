import { prisma } from "@/lib/db";

let initializedPromise: Promise<void> | null = null;

export const NOTIFICATION_CENTER_DDL_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "ssm_notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "category" TEXT NOT NULL DEFAULT 'EXAM',
    "subType" TEXT NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "contentHtml" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "senderUnit" TEXT NOT NULL DEFAULT 'Ban KT&ĐBCL',
    "senderUserId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "academicYearId" TEXT,
    "campusId" TEXT,
    "gradeLevels" TEXT,
    "classIdsJson" TEXT,
    "subjectId" TEXT,
    "subjectName" TEXT,
    "testingPeriodId" TEXT,
    "testingPeriodName" TEXT,
    "testingSubjectExamId" TEXT,
    "testingSessionId" TEXT,
    "examScheduleMetaJson" TEXT,
    "beforeChangeJson" TEXT,
    "afterChangeJson" TEXT,
    "deepLink" TEXT,
    "targetRolesJson" TEXT NOT NULL DEFAULT '["PARENT","STUDENT"]',
    "targetScopeJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "requiresApproval" BOOLEAN NOT NULL DEFAULT 0,
    "requireAcknowledge" BOOLEAN NOT NULL DEFAULT 0,
    "acknowledgeDeadline" DATETIME,
    "allowReply" BOOLEAN NOT NULL DEFAULT 0,
    "scheduledAt" DATETIME,
    "publishedAt" DATETIME,
    "recalledAt" DATETIME,
    "recallReason" TEXT,
    "idempotencyKey" TEXT UNIQUE,
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentSuccessCount" INTEGER NOT NULL DEFAULT 0,
    "sentFailedCount" INTEGER NOT NULL DEFAULT 0,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "acknowledgedCount" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "ssm_notifications_cat_status_pub_idx" ON "ssm_notifications"("category", "status", "publishedAt")`,
  `CREATE INDEX IF NOT EXISTS "ssm_notifications_ay_campus_status_idx" ON "ssm_notifications"("academicYearId", "campusId", "status")`,
  `CREATE INDEX IF NOT EXISTS "ssm_notifications_period_exam_idx" ON "ssm_notifications"("testingPeriodId", "testingSubjectExamId")`,
  `CREATE INDEX IF NOT EXISTS "ssm_notifications_sender_status_idx" ON "ssm_notifications"("senderUserId", "status")`,

  `CREATE TABLE IF NOT EXISTS "ssm_notification_recipients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notificationId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "recipientRole" TEXT NOT NULL DEFAULT 'PARENT',
    "recipientName" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "studentId" TEXT,
    "studentName" TEXT,
    "studentCode" TEXT,
    "classId" TEXT,
    "className" TEXT,
    "gradeLevel" TEXT,
    "campusId" TEXT,
    "campusName" TEXT,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'SENT',
    "deliveredAt" DATETIME,
    "isRead" BOOLEAN NOT NULL DEFAULT 0,
    "readAt" DATETIME,
    "isAcknowledged" BOOLEAN NOT NULL DEFAULT 0,
    "acknowledgedAt" DATETIME,
    "acknowledgeNote" TEXT,
    "remindedCount" INTEGER NOT NULL DEFAULT 0,
    "lastRemindedAt" DATETIME,
    "personalMetaJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("notificationId") REFERENCES "ssm_notifications"("id") ON DELETE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ssm_notification_recipients_uq" ON "ssm_notification_recipients"("notificationId", "recipientUserId", "studentId")`,
  `CREATE INDEX IF NOT EXISTS "ssm_notification_recipients_user_read_idx" ON "ssm_notification_recipients"("recipientUserId", "isRead", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "ssm_notification_recipients_student_role_idx" ON "ssm_notification_recipients"("studentId", "recipientRole", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "ssm_notification_recipients_notif_class_idx" ON "ssm_notification_recipients"("notificationId", "classId", "isRead", "isAcknowledged")`,
  `CREATE INDEX IF NOT EXISTS "ssm_notification_recipients_campus_class_idx" ON "ssm_notification_recipients"("campusId", "classId", "isRead")`,

  `CREATE TABLE IF NOT EXISTS "ssm_notification_deliveries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notificationId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("notificationId") REFERENCES "ssm_notifications"("id") ON DELETE CASCADE,
    FOREIGN KEY ("recipientId") REFERENCES "ssm_notification_recipients"("id") ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "ssm_notification_deliveries_notif_chan_idx" ON "ssm_notification_deliveries"("notificationId", "channel", "status")`,
  `CREATE INDEX IF NOT EXISTS "ssm_notification_deliveries_recip_idx" ON "ssm_notification_deliveries"("recipientId")`,

  `CREATE TABLE IF NOT EXISTS "ssm_notification_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'EXAM',
    "subType" TEXT NOT NULL DEFAULT 'EXAM_SCHEDULE',
    "titleTemplate" TEXT NOT NULL,
    "contentTemplate" TEXT NOT NULL,
    "defaultPriority" TEXT NOT NULL DEFAULT 'NORMAL',
    "requireAcknowledge" BOOLEAN NOT NULL DEFAULT 0,
    "allowReply" BOOLEAN NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS "ssm_notification_attachments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notificationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "fileUrl" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "isSafe" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("notificationId") REFERENCES "ssm_notifications"("id") ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "ssm_notification_attachments_notif_idx" ON "ssm_notification_attachments"("notificationId")`,

  `CREATE TABLE IF NOT EXISTS "ssm_notification_approvals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notificationId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL DEFAULT 1,
    "approverUserId" TEXT,
    "approverName" TEXT,
    "approverRole" TEXT NOT NULL DEFAULT 'KT_DBCL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("notificationId") REFERENCES "ssm_notifications"("id") ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "ssm_notification_approvals_notif_status_idx" ON "ssm_notification_approvals"("notificationId", "status")`,

  `CREATE TABLE IF NOT EXISTS "ssm_notification_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL UNIQUE,
    "sourceModule" TEXT NOT NULL DEFAULT 'KHAO_THI_SO',
    "sourceId" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "notificationId" TEXT,
    "triggeredByUserId" TEXT NOT NULL,
    "errorMessage" TEXT,
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "ssm_notification_events_type_source_idx" ON "ssm_notification_events"("eventType", "sourceId")`,

  `CREATE TABLE IF NOT EXISTS "ssm_notification_read_receipts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notificationId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT,
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "readAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" DATETIME,
    "acknowledgeNote" TEXT,
    FOREIGN KEY ("notificationId") REFERENCES "ssm_notifications"("id") ON DELETE CASCADE,
    FOREIGN KEY ("recipientId") REFERENCES "ssm_notification_recipients"("id") ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "ssm_notification_read_receipts_notif_user_idx" ON "ssm_notification_read_receipts"("notificationId", "userId")`,

  `CREATE TABLE IF NOT EXISTS "ssm_notification_responses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notificationId" TEXT NOT NULL,
    "recipientId" TEXT,
    "senderUserId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "studentId" TEXT,
    "studentName" TEXT,
    "classId" TEXT,
    "className" TEXT,
    "content" TEXT NOT NULL,
    "parentResponseId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "repliedByUserId" TEXT,
    "repliedByName" TEXT,
    "repliedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("notificationId") REFERENCES "ssm_notifications"("id") ON DELETE CASCADE,
    FOREIGN KEY ("recipientId") REFERENCES "ssm_notification_recipients"("id") ON DELETE SET NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "ssm_notification_responses_notif_idx" ON "ssm_notification_responses"("notificationId", "createdAt")`,

  `CREATE TABLE IF NOT EXISTS "ssm_notification_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notificationId" TEXT,
    "actorUserId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("notificationId") REFERENCES "ssm_notifications"("id") ON DELETE SET NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "ssm_notification_audit_logs_notif_idx" ON "ssm_notification_audit_logs"("notificationId", "createdAt")`,

  `CREATE TABLE IF NOT EXISTS "ssm_notification_preferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "enableInApp" BOOLEAN NOT NULL DEFAULT 1,
    "enableEmail" BOOLEAN NOT NULL DEFAULT 0,
    "enableZaloMiniApp" BOOLEAN NOT NULL DEFAULT 0,
    "examReminderDaysJson" TEXT NOT NULL DEFAULT '[3,1]',
    "quietHoursStart" TEXT DEFAULT '22:00',
    "quietHoursEnd" TEXT DEFAULT '06:30',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

export async function ensureNotificationCenterTables(): Promise<void> {
  if (!initializedPromise) {
    initializedPromise = (async () => {
      for (const sql of NOTIFICATION_CENTER_DDL_STATEMENTS) {
        try {
          await prisma.$executeRawUnsafe(sql);
        } catch {
          // Ignore if table or index already exists
        }
      }
    })();
  }
  return initializedPromise;
}
