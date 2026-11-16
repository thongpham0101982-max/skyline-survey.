-- Migration: WorkHub Module (Task Management, Operational Plans, Status Reports, Versioned KPIs & Digest Reminders)
-- Compatible with SQLite & Turso LibSQL

CREATE TABLE IF NOT EXISTS "workhub_task_meta" (
  "taskId" TEXT NOT NULL PRIMARY KEY,
  "taskCode" TEXT NOT NULL UNIQUE,
  "workStatus" TEXT NOT NULL DEFAULT 'ASSIGNED',
  "statusReason" TEXT,
  "planId" TEXT,
  "isAdhoc" INTEGER NOT NULL DEFAULT 0,
  "departmentId" TEXT,
  "campusId" TEXT,
  "collaboratorIdsJson" TEXT NOT NULL DEFAULT '[]',
  "reviewerUserId" TEXT,
  "parentTaskId" TEXT,
  "acceptanceCriteria" TEXT,
  "deliverables" TEXT,
  "progressPercent" INTEGER NOT NULL DEFAULT 0,
  "resultSummary" TEXT,
  "evidenceLinksJson" TEXT NOT NULL DEFAULT '[]',
  "linkedKpiId" TEXT,
  "productMetCriteria" INTEGER,
  "submittedForReviewAt" DATETIME,
  "reviewComment" TEXT,
  "recurrenceTemplateId" TEXT,
  "recurrenceInstanceKey" TEXT,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("taskId") REFERENCES "WorkTask"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "workhub_task_meta_rec_key_uq"
  ON "workhub_task_meta"("recurrenceInstanceKey")
  WHERE "recurrenceInstanceKey" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "workhub_task_meta_status_idx" ON "workhub_task_meta"("workStatus");
CREATE INDEX IF NOT EXISTS "workhub_task_meta_plan_idx" ON "workhub_task_meta"("planId");
CREATE INDEX IF NOT EXISTS "workhub_task_meta_parent_idx" ON "workhub_task_meta"("parentTaskId");
CREATE INDEX IF NOT EXISTS "workhub_task_meta_org_idx" ON "workhub_task_meta"("departmentId", "campusId");

CREATE TABLE IF NOT EXISTS "workhub_task_history" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "taskId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "fromValue" TEXT,
  "toValue" TEXT,
  "reason" TEXT,
  "metaJson" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("taskId") REFERENCES "WorkTask"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "workhub_task_history_task_idx" ON "workhub_task_history"("taskId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "workhub_recurrence_templates" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "templateCode" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL,
  "frequency" TEXT NOT NULL DEFAULT 'WEEKLY',
  "dayOfCycle" INTEGER NOT NULL DEFAULT 1,
  "dueOffsetDays" INTEGER NOT NULL DEFAULT 4,
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  "departmentId" TEXT,
  "campusId" TEXT,
  "academicYearId" TEXT,
  "planId" TEXT,
  "assignedById" TEXT NOT NULL,
  "assignedToUserId" TEXT NOT NULL,
  "collaboratorIdsJson" TEXT NOT NULL DEFAULT '[]',
  "reviewerUserId" TEXT,
  "acceptanceCriteria" TEXT,
  "deliverables" TEXT,
  "linkedKpiId" TEXT,
  "isActive" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "workhub_plans" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "planCode" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "periodType" TEXT NOT NULL DEFAULT 'MONTHLY',
  "periodLabel" TEXT NOT NULL,
  "academicYearId" TEXT,
  "departmentId" TEXT,
  "campusId" TEXT,
  "ownerUserId" TEXT NOT NULL,
  "ownerName" TEXT NOT NULL,
  "approverUserId" TEXT,
  "approverName" TEXT,
  "startDate" DATETIME NOT NULL,
  "endDate" DATETIME NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "versionNumber" INTEGER NOT NULL DEFAULT 1,
  "lastAdjustmentReason" TEXT,
  "objectivesJson" TEXT NOT NULL DEFAULT '[]',
  "approvedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "workhub_plans_org_period_idx" ON "workhub_plans"("academicYearId", "departmentId", "campusId", "status");

CREATE TABLE IF NOT EXISTS "workhub_plan_versions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "planId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "statusAtSnapshot" TEXT NOT NULL,
  "adjustmentReason" TEXT NOT NULL,
  "snapshotJson" TEXT NOT NULL,
  "changedByUserId" TEXT NOT NULL,
  "changedByName" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("planId") REFERENCES "workhub_plans"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "workhub_reports" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "reportCode" TEXT NOT NULL UNIQUE,
  "reportScope" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
  "periodType" TEXT NOT NULL DEFAULT 'WEEKLY',
  "periodKey" TEXT NOT NULL,
  "periodLabel" TEXT NOT NULL,
  "academicYearId" TEXT,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "weekNumber" INTEGER,
  "periodStart" DATETIME NOT NULL,
  "periodEnd" DATETIME NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "ownerName" TEXT NOT NULL,
  "departmentId" TEXT,
  "campusId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "isLocked" INTEGER NOT NULL DEFAULT 0,
  "versionNumber" INTEGER NOT NULL DEFAULT 1,
  "executiveCommentary" TEXT NOT NULL DEFAULT '',
  "blockersAndCauses" TEXT NOT NULL DEFAULT '',
  "supportRequests" TEXT NOT NULL DEFAULT '',
  "nextPeriodPlan" TEXT NOT NULL DEFAULT '',
  "reviewerUserId" TEXT,
  "reviewerName" TEXT,
  "reviewFeedback" TEXT,
  "submittedSnapshotAt" DATETIME,
  "approvedAt" DATETIME,
  "snapshotJson" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "workhub_reports_lookup_idx" ON "workhub_reports"("reportScope", "periodKey", "ownerUserId", "departmentId", "campusId");

CREATE TABLE IF NOT EXISTS "workhub_report_versions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "reportId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "revisionReason" TEXT NOT NULL,
  "snapshotJson" TEXT NOT NULL,
  "commentarySnapshotJson" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdByName" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("reportId") REFERENCES "workhub_reports"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "workhub_kpi_definitions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "kpiCode" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "unit" TEXT NOT NULL DEFAULT '%',
  "targetScope" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
  "evaluationCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
  "effectiveFrom" DATETIME NOT NULL,
  "effectiveTo" DATETIME,
  "targetValue" REAL NOT NULL DEFAULT 85,
  "direction" TEXT NOT NULL DEFAULT 'HIGHER_IS_BETTER',
  "formulaType" TEXT NOT NULL DEFAULT 'ON_TIME_TASK_RATE',
  "formulaConfigJson" TEXT NOT NULL DEFAULT '{}',
  "dataSourceType" TEXT NOT NULL DEFAULT 'AUTO',
  "passThreshold" REAL NOT NULL DEFAULT 85,
  "warningThreshold" REAL NOT NULL DEFAULT 70,
  "failThreshold" REAL NOT NULL DEFAULT 50,
  "weight" REAL,
  "capScorePercent" REAL NOT NULL DEFAULT 100,
  "confirmerRoleOrUserId" TEXT,
  "missingDataRule" TEXT NOT NULL DEFAULT 'EXCLUDE_REWEIGHT',
  "exceptionNote" TEXT,
  "currentVersion" INTEGER NOT NULL DEFAULT 1,
  "isActive" INTEGER NOT NULL DEFAULT 1,
  "departmentId" TEXT,
  "campusId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "workhub_kpi_versions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "kpiId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "changeReason" TEXT NOT NULL,
  "configSnapshotJson" TEXT NOT NULL,
  "changedByUserId" TEXT NOT NULL,
  "changedByName" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("kpiId") REFERENCES "workhub_kpi_definitions"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "workhub_kpi_evaluations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "kpiId" TEXT NOT NULL,
  "kpiVersion" INTEGER NOT NULL,
  "targetScope" TEXT NOT NULL,
  "targetEntityId" TEXT NOT NULL,
  "targetEntityName" TEXT NOT NULL,
  "periodKey" TEXT NOT NULL,
  "periodLabel" TEXT NOT NULL,
  "numeratorValue" REAL,
  "denominatorValue" REAL,
  "actualValue" REAL,
  "achievementScorePercent" REAL,
  "outcomeBand" TEXT NOT NULL DEFAULT 'INSUFFICIENT_DATA',
  "formulaSnapshotJson" TEXT NOT NULL,
  "sourceRecordIdsJson" TEXT NOT NULL DEFAULT '[]',
  "manualEvidenceNote" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PROVISIONAL',
  "confirmedByUserId" TEXT,
  "confirmedByName" TEXT,
  "confirmedAt" DATETIME,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("kpiId", "targetScope", "targetEntityId", "periodKey")
);

CREATE TABLE IF NOT EXISTS "workhub_reminder_settings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "dueSoonHours" INTEGER NOT NULL DEFAULT 48,
  "enableDueSoon" INTEGER NOT NULL DEFAULT 1,
  "enableOverdue" INTEGER NOT NULL DEFAULT 1,
  "enablePendingReview" INTEGER NOT NULL DEFAULT 1,
  "enableReportDeadline" INTEGER NOT NULL DEFAULT 1,
  "digestFrequency" TEXT NOT NULL DEFAULT 'DAILY_DIGEST',
  "sendEmailDigest" INTEGER NOT NULL DEFAULT 0,
  "reportDeadlineDayOfWeek" INTEGER NOT NULL DEFAULT 5,
  "updatedByName" TEXT,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "workhub_reminder_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "dedupKey" TEXT NOT NULL UNIQUE,
  "recipientUserId" TEXT NOT NULL,
  "digestType" TEXT NOT NULL,
  "itemsCount" INTEGER NOT NULL DEFAULT 0,
  "summaryText" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
