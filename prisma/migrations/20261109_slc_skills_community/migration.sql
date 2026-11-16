-- Cộng đồng sáng tạo & Skills môn học (Sky-Line Connect v4)
ALTER TABLE "slc_posts" ADD COLUMN "departmentId" TEXT;
ALTER TABLE "slc_posts" ADD COLUMN "departmentName" TEXT;
ALTER TABLE "slc_posts" ADD COLUMN "videoUrl" TEXT;
ALTER TABLE "slc_posts" ADD COLUMN "demoUrl" TEXT;
ALTER TABLE "slc_posts" ADD COLUMN "topicName" TEXT;
ALTER TABLE "slc_posts" ADD COLUMN "previousStatus" TEXT;
ALTER TABLE "slc_posts" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "slc_posts" ADD COLUMN "deletedById" TEXT;
ALTER TABLE "slc_posts" ADD COLUMN "collaboratorIdsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "slc_posts" ADD COLUMN "collaboratorNamesJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "slc_posts" ADD COLUMN "linkedSkillId" TEXT;
ALTER TABLE "slc_posts" ADD COLUMN "appliedCount" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "slc_posts_departmentId_status_idx" ON "slc_posts"("departmentId", "status");

CREATE TABLE IF NOT EXISTS "slc_skills" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "postId" TEXT,
  "parentSkillId" TEXT,
  "originalAuthorId" TEXT,
  "originalAuthorName" TEXT,
  "authorId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "campusId" TEXT,
  "campusName" TEXT,
  "departmentId" TEXT,
  "departmentName" TEXT,
  "collaboratorsJson" TEXT NOT NULL DEFAULT '[]',
  "name" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "workCategory" TEXT NOT NULL DEFAULT 'ACTIVITY_DESIGN',
  "subjectCode" TEXT NOT NULL,
  "subjectName" TEXT NOT NULL,
  "gradeLevelsJson" TEXT NOT NULL DEFAULT '[]',
  "topicOrLesson" TEXT,
  "tagsJson" TEXT NOT NULL DEFAULT '[]',
  "prerequisites" TEXT,
  "inputFieldsJson" TEXT NOT NULL DEFAULT '[]',
  "aiSystemPrompt" TEXT NOT NULL,
  "workflowStepsJson" TEXT NOT NULL DEFAULT '[]',
  "principlesAndLimits" TEXT,
  "outputStructure" TEXT,
  "evaluationCriteria" TEXT,
  "referencesJson" TEXT NOT NULL DEFAULT '[]',
  "samplePrompt" TEXT,
  "sampleOutput" TEXT,
  "compatiblePlatformsJson" TEXT NOT NULL DEFAULT '["SSM_INTERNAL","GEMINI","CHATGPT"]',
  "usageGuide" TEXT,
  "isExecutableOnSsm" BOOLEAN NOT NULL DEFAULT 0,
  "packageAttachmentId" TEXT,
  "packageMetaJson" TEXT NOT NULL DEFAULT '{}',
  "externalUrl" TEXT,
  "currentVersion" TEXT NOT NULL DEFAULT '1.0',
  "publishedVersionId" TEXT,
  "visibility" TEXT NOT NULL DEFAULT 'SYSTEM',
  "groupId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "previousStatus" TEXT,
  "creationSource" TEXT NOT NULL DEFAULT 'FORM',
  "evidenceBriefId" TEXT,
  "assignedReviewerId" TEXT,
  "assignedReviewerName" TEXT,
  "reviewedById" TEXT,
  "reviewedByName" TEXT,
  "reviewNote" TEXT,
  "reviewedAt" DATETIME,
  "publishedAt" DATETIME,
  "appliedCount" INTEGER NOT NULL DEFAULT 0,
  "saveCount" INTEGER NOT NULL DEFAULT 0,
  "runCount" INTEGER NOT NULL DEFAULT 0,
  "avgRating" REAL NOT NULL DEFAULT 0,
  "validRatingCount" INTEGER NOT NULL DEFAULT 0,
  "deletedAt" DATETIME,
  "deletedById" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_skills_code_key" ON "slc_skills"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "slc_skills_postId_key" ON "slc_skills"("postId");
CREATE INDEX IF NOT EXISTS "slc_skills_status_visibility_workCategory_idx" ON "slc_skills"("status", "visibility", "workCategory");
CREATE INDEX IF NOT EXISTS "slc_skills_subjectCode_status_idx" ON "slc_skills"("subjectCode", "status");
CREATE INDEX IF NOT EXISTS "slc_skills_authorId_status_idx" ON "slc_skills"("authorId", "status");
CREATE INDEX IF NOT EXISTS "slc_skills_campusId_status_idx" ON "slc_skills"("campusId", "status");
CREATE INDEX IF NOT EXISTS "slc_skills_departmentId_status_idx" ON "slc_skills"("departmentId", "status");

CREATE TABLE IF NOT EXISTS "slc_skill_versions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "skillId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "changelog" TEXT NOT NULL,
  "snapshotJson" TEXT NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "reviewerId" TEXT,
  "reviewerName" TEXT,
  "reviewNote" TEXT,
  "reviewedAt" DATETIME,
  "createdById" TEXT NOT NULL,
  "createdByName" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "slc_skill_versions_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "slc_skills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "slc_skill_versions_skillId_createdAt_idx" ON "slc_skill_versions"("skillId", "createdAt");
CREATE INDEX IF NOT EXISTS "slc_skill_versions_skillId_status_idx" ON "slc_skill_versions"("skillId", "status");

CREATE TABLE IF NOT EXISTS "slc_skill_work_categories" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT 1,
  "updatedBy" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_skill_work_categories_code_key" ON "slc_skill_work_categories"("code");

CREATE TABLE IF NOT EXISTS "slc_skill_evidence_briefs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "teacherId" TEXT,
  "userId" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "campusId" TEXT,
  "departmentId" TEXT,
  "academicYearId" TEXT NOT NULL,
  "academicYearName" TEXT,
  "evaluationPeriod" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "className" TEXT NOT NULL,
  "gradeLevel" TEXT NOT NULL,
  "subjectId" TEXT,
  "subjectCode" TEXT NOT NULL,
  "subjectName" TEXT NOT NULL,
  "topicOrLesson" TEXT,
  "sourcesStatusJson" TEXT NOT NULL DEFAULT '[]',
  "deterministicStatsJson" TEXT NOT NULL DEFAULT '{}',
  "aiInterpretationJson" TEXT NOT NULL DEFAULT '{}',
  "proposedActionsJson" TEXT NOT NULL DEFAULT '[]',
  "teacherConfirmedJson" TEXT NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'REVIEWED',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "slc_skill_evidence_briefs_userId_createdAt_idx" ON "slc_skill_evidence_briefs"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "slc_skill_evidence_briefs_classId_subjectCode_academicYearId_idx" ON "slc_skill_evidence_briefs"("classId", "subjectCode", "academicYearId");

CREATE TABLE IF NOT EXISTS "slc_skill_runs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "skillId" TEXT NOT NULL,
  "skillVersion" TEXT NOT NULL DEFAULT '1.0',
  "runnerUserId" TEXT NOT NULL,
  "runnerName" TEXT NOT NULL,
  "runnerCampusId" TEXT,
  "academicYearId" TEXT,
  "evaluationPeriod" TEXT,
  "classId" TEXT,
  "className" TEXT,
  "subjectCode" TEXT,
  "inputValuesJson" TEXT NOT NULL DEFAULT '{}',
  "boundContextSummaryJson" TEXT NOT NULL DEFAULT '{}',
  "outputText" TEXT,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "errorMessage" TEXT,
  "aiModel" TEXT,
  "promptTokens" INTEGER NOT NULL DEFAULT 0,
  "completionTokens" INTEGER NOT NULL DEFAULT 0,
  "estimatedCostUsd" REAL NOT NULL DEFAULT 0,
  "durationMs" INTEGER NOT NULL DEFAULT 0,
  "clientRequestId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "slc_skill_runs_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "slc_skills" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_skill_runs_runnerUserId_clientRequestId_key" ON "slc_skill_runs"("runnerUserId", "clientRequestId");
CREATE INDEX IF NOT EXISTS "slc_skill_runs_skillId_createdAt_idx" ON "slc_skill_runs"("skillId", "createdAt");
CREATE INDEX IF NOT EXISTS "slc_skill_runs_runnerUserId_createdAt_idx" ON "slc_skill_runs"("runnerUserId", "createdAt");

CREATE TABLE IF NOT EXISTS "slc_applied_confirmations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "postId" TEXT,
  "skillId" TEXT,
  "userId" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "campusId" TEXT,
  "campusName" TEXT,
  "classOrGrade" TEXT,
  "subjectCode" TEXT,
  "feedbackText" TEXT,
  "evidenceUrl" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "slc_applied_confirmations_targetType_targetId_userId_key" ON "slc_applied_confirmations"("targetType", "targetId", "userId");
CREATE INDEX IF NOT EXISTS "slc_applied_confirmations_targetType_targetId_idx" ON "slc_applied_confirmations"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "slc_applied_confirmations_userId_createdAt_idx" ON "slc_applied_confirmations"("userId", "createdAt");
