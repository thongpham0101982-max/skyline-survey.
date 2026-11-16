-- =============================================================================
-- SKY-LINE CONNECT (V2.1) — CỘNG ĐỒNG CÙNG SÁNG TẠO ("GÓP MỘT MẢNH SÁNG TẠO")
-- Additive migration for contribution pieces, help requests, status history,
-- and anti-spam post bump tracking ("Đang sôi nổi").
-- =============================================================================

ALTER TABLE "slc_feature_configs" ADD COLUMN "bumpCooldownMinutes" INTEGER NOT NULL DEFAULT 30;

ALTER TABLE "slc_posts" ADD COLUMN "lastBumpedAt" DATETIME NOT NULL DEFAULT '2026-01-01T00:00:00.000Z';
UPDATE "slc_posts" SET "lastBumpedAt" = COALESCE("publishedAt", "createdAt") WHERE "lastBumpedAt" = '2026-01-01T00:00:00.000Z';
ALTER TABLE "slc_posts" ADD COLUMN "bumpEventsJson" TEXT NOT NULL DEFAULT '[]';
CREATE INDEX IF NOT EXISTS "slc_posts_status_visibility_lastBumpedAt_id_idx" ON "slc_posts"("status", "visibility", "lastBumpedAt", "id");

ALTER TABLE "slc_comments" ADD COLUMN "contributionType" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "slc_comments" ADD COLUMN "linksJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "slc_comments" ADD COLUMN "linkedProjectId" TEXT;
ALTER TABLE "slc_comments" ADD COLUMN "developmentItemNote" TEXT;
ALTER TABLE "slc_comments" ADD COLUMN "appliedChangeNote" TEXT;
ALTER TABLE "slc_comments" ADD COLUMN "helpRequestId" TEXT;
ALTER TABLE "slc_comments" ADD COLUMN "statusHistoryJson" TEXT NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS "slc_help_requests" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "postId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "authorAvatar" TEXT,
  "campusId" TEXT,
  "campusName" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "supportType" TEXT NOT NULL DEFAULT 'EXPERIMENT',
  "subjectCode" TEXT,
  "gradeLevel" TEXT,
  "expectedTimeframe" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "connectedUserId" TEXT,
  "connectedUserName" TEXT,
  "connectedCommentId" TEXT,
  "connectedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "slc_help_requests_postId_fkey" FOREIGN KEY ("postId") REFERENCES "slc_posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "slc_help_requests_postId_status_createdAt_idx" ON "slc_help_requests"("postId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "slc_help_requests_status_supportType_createdAt_idx" ON "slc_help_requests"("status", "supportType", "createdAt");
CREATE INDEX IF NOT EXISTS "slc_help_requests_authorId_idx" ON "slc_help_requests"("authorId");
