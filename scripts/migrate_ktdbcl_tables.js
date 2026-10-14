const { createClient } = require("@libsql/client");
const path = require("path");

const LOCAL_DB_PATH = path.resolve(__dirname, "../local.db").replace(/\\/g, "/");
const CLOUD_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const CLOUD_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const statements = [
  `CREATE TABLE IF NOT EXISTS "KtdbclAnnouncement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'THONG_BAO_CHUNG',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "targetScope" TEXT NOT NULL DEFAULT 'ALL',
    "targetCampusIds" TEXT,
    "targetDeptIds" TEXT,
    "targetLevels" TEXT,
    "attachments" TEXT,
    "isPublished" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "creatorName" TEXT,
    "pinned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "KtdbclAnnouncement_code_key" ON "KtdbclAnnouncement"("code");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclAnnouncement_category_idx" ON "KtdbclAnnouncement"("category");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclAnnouncement_priority_idx" ON "KtdbclAnnouncement"("priority");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclAnnouncement_publishedAt_idx" ON "KtdbclAnnouncement"("publishedAt");`,

  `CREATE TABLE IF NOT EXISTS "KtdbclAnnouncementRead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "userRole" TEXT,
    "campusCode" TEXT,
    "readAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("announcementId") REFERENCES "KtdbclAnnouncement"("id") ON DELETE CASCADE
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "KtdbclAnnouncementRead_announcementId_userId_key" ON "KtdbclAnnouncementRead"("announcementId", "userId");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclAnnouncementRead_userId_idx" ON "KtdbclAnnouncementRead"("userId");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclAnnouncementRead_announcementId_idx" ON "KtdbclAnnouncementRead"("announcementId");`,

  `CREATE TABLE IF NOT EXISTS "KtdbclRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'KHAC',
    "requestType" TEXT NOT NULL DEFAULT 'CAU_HOI',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "content" TEXT NOT NULL,
    "attachments" TEXT,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderRole" TEXT,
    "senderEmail" TEXT,
    "senderPhone" TEXT,
    "teacherId" TEXT,
    "campusId" TEXT,
    "campusCode" TEXT,
    "departmentId" TEXT,
    "departmentName" TEXT,
    "assignedToId" TEXT,
    "assignedToName" TEXT,
    "assignedAt" DATETIME,
    "aiCategorySuggestion" TEXT,
    "aiUrgencyScore" INTEGER DEFAULT 0,
    "aiSummary" TEXT,
    "rating" INTEGER,
    "ratingFeedback" TEXT,
    "resolvedAt" DATETIME,
    "reopenedAt" DATETIME,
    "refModule" TEXT,
    "refRecordId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "KtdbclRequest_requestCode_key" ON "KtdbclRequest"("requestCode");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclRequest_status_idx" ON "KtdbclRequest"("status");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclRequest_senderId_idx" ON "KtdbclRequest"("senderId");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclRequest_campusId_idx" ON "KtdbclRequest"("campusId");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclRequest_category_idx" ON "KtdbclRequest"("category");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclRequest_assignedToId_idx" ON "KtdbclRequest"("assignedToId");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclRequest_createdAt_idx" ON "KtdbclRequest"("createdAt");`,

  `CREATE TABLE IF NOT EXISTS "KtdbclMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" TEXT,
    "isInternalNote" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("requestId") REFERENCES "KtdbclRequest"("id") ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "KtdbclMessage_requestId_idx" ON "KtdbclMessage"("requestId");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclMessage_senderId_idx" ON "KtdbclMessage"("senderId");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclMessage_createdAt_idx" ON "KtdbclMessage"("createdAt");`,

  `CREATE TABLE IF NOT EXISTS "KtdbclKnowledgeItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'QUY_CHE_CHUNG',
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "keywords" TEXT,
    "attachments" TEXT,
    "isPublished" INTEGER NOT NULL DEFAULT 1,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "usefulCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "KtdbclKnowledgeItem_category_idx" ON "KtdbclKnowledgeItem"("category");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclKnowledgeItem_isPublished_idx" ON "KtdbclKnowledgeItem"("isPublished");`,

  `CREATE TABLE IF NOT EXISTS "KtdbclAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("requestId") REFERENCES "KtdbclRequest"("id") ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "KtdbclAuditLog_requestId_idx" ON "KtdbclAuditLog"("requestId");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclAuditLog_actorId_idx" ON "KtdbclAuditLog"("actorId");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclAuditLog_createdAt_idx" ON "KtdbclAuditLog"("createdAt");`
];

async function applyMigrations(client, name) {
  console.log(`Applying KTDBCL migrations on ${name}...`);
  for (const sql of statements) {
    await client.execute(sql);
  }
  console.log(`[${name}] Migrations applied successfully.`);
}

async function main() {
  const localClient = createClient({ url: `file:${LOCAL_DB_PATH}` });
  await applyMigrations(localClient, "LOCAL SQLite");

  try {
    const cloudClient = createClient({ url: CLOUD_URL, authToken: CLOUD_TOKEN });
    await applyMigrations(cloudClient, "TURSO Cloud");
  } catch (err) {
    console.warn("Turso cloud migration warning:", err.message);
  }
}

main().catch(console.error);
