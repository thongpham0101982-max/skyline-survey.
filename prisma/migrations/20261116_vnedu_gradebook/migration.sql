-- Migration: vnEdu Gradebook Config, Versioning, Student vnEduCode, and Direct Excel Import
-- Compatible with SQLite & Turso LibSQL

-- 1. Student: add vnEduCode with unique index per academicYearId (NULLs allowed in SQLite)
ALTER TABLE "Student" ADD COLUMN "vnEduCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Student_vnEduCode_academicYearId_key"
  ON "Student"("vnEduCode", "academicYearId")
  WHERE "vnEduCode" IS NOT NULL;

-- 2. SubjectGradeConfig: add program, configType, columnsJson, rating, confirmationStatus, versioning
ALTER TABLE "SubjectGradeConfig" ADD COLUMN "program" TEXT NOT NULL DEFAULT 'ALL';
ALTER TABLE "SubjectGradeConfig" ADD COLUMN "configType" TEXT NOT NULL DEFAULT 'INTERNAL';
ALTER TABLE "SubjectGradeConfig" ADD COLUMN "columnsJson" TEXT;
ALTER TABLE "SubjectGradeConfig" ADD COLUMN "hasRatingColumn" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SubjectGradeConfig" ADD COLUMN "ratingColumnName" TEXT DEFAULT 'Xếp loại';
ALTER TABLE "SubjectGradeConfig" ADD COLUMN "ratingScaleJson" TEXT;
ALTER TABLE "SubjectGradeConfig" ADD COLUMN "confirmationStatus" TEXT NOT NULL DEFAULT 'CONFIRMED';
ALTER TABLE "SubjectGradeConfig" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "SubjectGradeConfig" ADD COLUMN "isActive" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "SubjectGradeConfig" ADD COLUMN "updatedById" TEXT;
ALTER TABLE "SubjectGradeConfig" ADD COLUMN "updatedByName" TEXT;
ALTER TABLE "SubjectGradeConfig" ADD COLUMN "changeNote" TEXT;

DROP INDEX IF EXISTS "SubjectGradeConfig_academicYearId_grade_subjectId_evaluationPeriod_key";
CREATE INDEX IF NOT EXISTS "SubjectGradeConfig_scope_idx"
  ON "SubjectGradeConfig"("academicYearId", "program", "grade", "subjectId", "evaluationPeriod", "configType", "isActive");
CREATE UNIQUE INDEX IF NOT EXISTS "SubjectGradeConfig_active_scope_uq"
  ON "SubjectGradeConfig"("academicYearId", "program", "grade", COALESCE("subjectId", ''), "evaluationPeriod", "configType")
  WHERE "isActive" = 1;

-- 3. SubjectGradeConfigVersion: version history snapshots
CREATE TABLE IF NOT EXISTS "SubjectGradeConfigVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "configId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshotJson" TEXT NOT NULL,
  "changedById" TEXT,
  "changedByName" TEXT,
  "changeNote" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("configId") REFERENCES "SubjectGradeConfig"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "SubjectGradeConfigVersion_configId_version_key"
  ON "SubjectGradeConfigVersion"("configId", "version");
CREATE INDEX IF NOT EXISTS "SubjectGradeConfigVersion_configId_idx"
  ON "SubjectGradeConfigVersion"("configId");

-- 4. SubjectGradeEntry: add configType, configId, configVersion, ratingValue, sourceType
ALTER TABLE "SubjectGradeEntry" ADD COLUMN "configType" TEXT NOT NULL DEFAULT 'INTERNAL';
ALTER TABLE "SubjectGradeEntry" ADD COLUMN "configId" TEXT;
ALTER TABLE "SubjectGradeEntry" ADD COLUMN "configVersion" INTEGER;
ALTER TABLE "SubjectGradeEntry" ADD COLUMN "ratingValue" TEXT;
ALTER TABLE "SubjectGradeEntry" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'MANUAL';

DROP INDEX IF EXISTS "SubjectGradeEntry_studentId_subjectId_evaluationPeriod_academicYearId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "SubjectGradeEntry_studentId_subjectId_evaluationPeriod_academicYearId_configType_key"
  ON "SubjectGradeEntry"("studentId", "subjectId", "evaluationPeriod", "academicYearId", "configType");

-- 5. VnEduImportSession & VnEduImportLog & VnEduSubjectMappingHint
CREATE TABLE IF NOT EXISTS "VnEduImportSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "academicYearId" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "uploadedByName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PARSED',
  "mode" TEXT NOT NULL DEFAULT 'FILL_EMPTY',
  "fileNamesJson" TEXT NOT NULL DEFAULT '[]',
  "summaryJson" TEXT,
  "idempotencyKey" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "committedAt" DATETIME
);
CREATE UNIQUE INDEX IF NOT EXISTS "VnEduImportSession_idempotencyKey_key"
  ON "VnEduImportSession"("idempotencyKey")
  WHERE "idempotencyKey" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "VnEduImportSession_academicYearId_createdAt_idx"
  ON "VnEduImportSession"("academicYearId", "createdAt");

CREATE TABLE IF NOT EXISTS "VnEduImportLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "sheetName" TEXT NOT NULL,
  "rowIndex" INTEGER NOT NULL,
  "sourceSubjectName" TEXT,
  "targetSubjectId" TEXT,
  "configId" TEXT,
  "configVersion" INTEGER,
  "classId" TEXT,
  "studentId" TEXT,
  "vnEduCode" TEXT,
  "confirmedById" TEXT,
  "confirmedByName" TEXT,
  "importedById" TEXT NOT NULL,
  "importedByName" TEXT,
  "action" TEXT NOT NULL,
  "beforeJson" TEXT,
  "afterJson" TEXT,
  "reason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("sessionId") REFERENCES "VnEduImportSession"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "VnEduImportLog_sessionId_idx"
  ON "VnEduImportLog"("sessionId");
CREATE INDEX IF NOT EXISTS "VnEduImportLog_academicYearId_studentId_idx"
  ON "VnEduImportLog"("academicYearId", "studentId");

CREATE TABLE IF NOT EXISTS "VnEduSubjectMappingHint" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "academicYearId" TEXT NOT NULL,
  "sourceSubjectNormalized" TEXT NOT NULL,
  "sourceSubjectRaw" TEXT NOT NULL,
  "targetSubjectId" TEXT NOT NULL,
  "lastUsedById" TEXT,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "VnEduSubjectMappingHint_academicYearId_sourceSubjectNormalized_key"
  ON "VnEduSubjectMappingHint"("academicYearId", "sourceSubjectNormalized");
