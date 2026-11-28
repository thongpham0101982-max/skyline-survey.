-- Sky-Line SSM Migration: PVDH (Khối 1–12) & Cấu hình File điểm Khảo sát đầu vào
-- Additive & Non-Destructive: Preserves 100% of existing StudentOrientationRecord, InputAssessmentGradeConfig,
-- AssessmentSubject, StudentAssessmentScore, and TCI records.

-- 1. Optional contentCategory attribute on AssessmentSubject (distinguishes Môn khảo sát vs Nội dung phỏng vấn)
ALTER TABLE "AssessmentSubject" ADD COLUMN "contentCategory" TEXT;

-- 2. PVDH Templates (PVDH-01 .. PVDH-05)
CREATE TABLE IF NOT EXISTS "pvdh_templates" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "contentCategory" TEXT NOT NULL DEFAULT 'ORIENTATION_INTERVIEW',
  "gradeGroup" TEXT NOT NULL,
  "gradesJson" TEXT NOT NULL DEFAULT '[]',
  "educationSystemsJson" TEXT NOT NULL DEFAULT '["ALL"]',
  "campusIdsJson" TEXT NOT NULL DEFAULT '["ALL"]',
  "periodIdsJson" TEXT NOT NULL DEFAULT '["ALL"]',
  "effectiveFrom" TEXT,
  "effectiveTo" TEXT,
  "priorityOrder" INTEGER NOT NULL DEFAULT 100,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
  "currentVersionCode" TEXT NOT NULL DEFAULT 'v1.0',
  "sourceNote" TEXT DEFAULT 'Mẫu đề xuất phục vụ triển khai',
  "createdById" TEXT,
  "createdByName" TEXT,
  "updatedById" TEXT,
  "updatedByName" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_pvdh_templates_status_prio" ON "pvdh_templates"("status", "priorityOrder");
CREATE INDEX IF NOT EXISTS "idx_pvdh_templates_group_status" ON "pvdh_templates"("gradeGroup", "status");

-- 3. PVDH Template Versions (Immutable once referenced by finalized records)
CREATE TABLE IF NOT EXISTS "pvdh_template_versions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "templateId" TEXT NOT NULL,
  "templateCode" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL DEFAULT 1,
  "versionCode" TEXT NOT NULL DEFAULT 'v1.0',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "nameSnapshot" TEXT NOT NULL,
  "purposeText" TEXT,
  "gradesJson" TEXT NOT NULL DEFAULT '[]',
  "educationSystemsJson" TEXT NOT NULL DEFAULT '["ALL"]',
  "campusIdsJson" TEXT NOT NULL DEFAULT '["ALL"]',
  "periodIdsJson" TEXT NOT NULL DEFAULT '["ALL"]',
  "effectiveFrom" TEXT,
  "effectiveTo" TEXT,
  "priorityOrder" INTEGER NOT NULL DEFAULT 100,
  "sectionsJson" TEXT NOT NULL DEFAULT '[]',
  "fieldsJson" TEXT NOT NULL DEFAULT '[]',
  "exportLayoutJson" TEXT NOT NULL DEFAULT '{}',
  "changeSummary" TEXT,
  "createdById" TEXT,
  "createdByName" TEXT,
  "publishedAt" DATETIME,
  "publishedById" TEXT,
  "publishedByName" TEXT,
  "deactivatedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_pvdh_tpl_ver_code_num" ON "pvdh_template_versions"("templateCode", "versionNumber");
CREATE INDEX IF NOT EXISTS "idx_pvdh_tpl_ver_tpl_status" ON "pvdh_template_versions"("templateId", "status");

-- 4. PVDH Assessment Records (Qualitative interview records, version-pinned, supports multi-attempt & split interviewers)
CREATE TABLE IF NOT EXISTS "pvdh_assessment_records" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "studentId" TEXT NOT NULL,
  "studentCode" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "batchId" TEXT,
  "campusId" TEXT,
  "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  "isLatestAttempt" BOOLEAN NOT NULL DEFAULT 1,
  "gradeAtCreation" TEXT NOT NULL,
  "educationSystemAtCreation" TEXT DEFAULT 'ALL',
  "templateId" TEXT NOT NULL,
  "templateVersionId" TEXT NOT NULL,
  "templateCode" TEXT NOT NULL,
  "templateVersionNumber" INTEGER NOT NULL DEFAULT 1,
  "templateVersionCode" TEXT NOT NULL DEFAULT 'v1.0',
  "interviewDate" TEXT,
  "studentInterviewerUserId" TEXT,
  "studentInterviewerName" TEXT,
  "studentInterviewerTitle" TEXT,
  "studentInterviewDate" TEXT,
  "studentSectionStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  "studentCompletedAt" DATETIME,
  "parentFullName" TEXT,
  "parentRelationship" TEXT,
  "parentContactChannel" TEXT,
  "parentInterviewerUserId" TEXT,
  "parentInterviewerName" TEXT,
  "parentInterviewerTitle" TEXT,
  "parentInterviewDate" TEXT,
  "parentSectionStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  "parentCompletedAt" DATETIME,
  "studentResponsesJson" TEXT NOT NULL DEFAULT '{}',
  "obsStrengthsInterests" TEXT,
  "obsCommunicationStyle" TEXT,
  "obsParticipationLevel" TEXT,
  "obsSupportNeeds" TEXT,
  "teacherSectionStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  "parentResponsesJson" TEXT NOT NULL DEFAULT '{}',
  "teacherSummaryJson" TEXT NOT NULL DEFAULT '{}',
  "planStrengthsPriority" TEXT,
  "planGoalsActionsText" TEXT,
  "followUpActionsJson" TEXT NOT NULL DEFAULT '[]',
  "planCoordinator" TEXT,
  "planReviewDate" TEXT,
  "planFurtherTopicsJson" TEXT NOT NULL DEFAULT '[]',
  "planFurtherOtherText" TEXT,
  "planReferralReason" TEXT,
  "planReferralReceiver" TEXT,
  "planHandoverNotes" TEXT,
  "internalSensitiveNotes" TEXT,
  "orientationSectionStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  "workflowStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  "isLocked" BOOLEAN NOT NULL DEFAULT 0,
  "confirmationType" TEXT,
  "confirmedByUserId" TEXT,
  "confirmedByName" TEXT,
  "confirmedByRole" TEXT,
  "signatureImageBase64" TEXT,
  "confirmedAt" DATETIME,
  "confirmedSnapshotJson" TEXT,
  "confirmedSnapshotHash" TEXT,
  "returnReason" TEXT,
  "returnedByUserId" TEXT,
  "returnedByName" TEXT,
  "returnedAt" DATETIME,
  "reopenReason" TEXT,
  "reopenedByUserId" TEXT,
  "reopenedByName" TEXT,
  "reopenedAt" DATETIME,
  "templateMigrationHistoryJson" TEXT NOT NULL DEFAULT '[]',
  "publishedForParentSummary" TEXT,
  "isPublishedToParent" BOOLEAN NOT NULL DEFAULT 0,
  "lockVersion" INTEGER NOT NULL DEFAULT 1,
  "createdById" TEXT,
  "updatedById" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_pvdh_record_student_period_attempt"
  ON "pvdh_assessment_records"("studentId", "periodId", "attemptNumber");
CREATE INDEX IF NOT EXISTS "idx_pvdh_record_student_latest"
  ON "pvdh_assessment_records"("studentId", "isLatestAttempt");
CREATE INDEX IF NOT EXISTS "idx_pvdh_record_period_campus_status"
  ON "pvdh_assessment_records"("periodId", "campusId", "workflowStatus");
CREATE INDEX IF NOT EXISTS "idx_pvdh_record_student_interviewer"
  ON "pvdh_assessment_records"("studentInterviewerUserId");
CREATE INDEX IF NOT EXISTS "idx_pvdh_record_parent_interviewer"
  ON "pvdh_assessment_records"("parentInterviewerUserId");

-- 5. PVDH Review & Reopen History
CREATE TABLE IF NOT EXISTS "pvdh_review_histories" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "recordId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "reasonOrNote" TEXT,
  "beforeSnapshotJson" TEXT,
  "afterSnapshotJson" TEXT,
  "actorUserId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "actorRole" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_pvdh_review_record" ON "pvdh_review_histories"("recordId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_pvdh_review_student" ON "pvdh_review_histories"("studentId", "createdAt");

-- 6. PVDH Generated Documents (Version-pinned PDF/HTML snapshots)
CREATE TABLE IF NOT EXISTS "pvdh_generated_documents" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "recordId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "templateCode" TEXT NOT NULL,
  "templateVersionCode" TEXT NOT NULL,
  "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  "documentStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  "format" TEXT NOT NULL DEFAULT 'PDF',
  "fileName" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "fileSha256" TEXT NOT NULL,
  "fileSizeBytes" INTEGER NOT NULL DEFAULT 0,
  "snapshotJson" TEXT NOT NULL,
  "generatedByUserId" TEXT NOT NULL,
  "generatedByName" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_pvdh_doc_record" ON "pvdh_generated_documents"("recordId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_pvdh_doc_student_period" ON "pvdh_generated_documents"("studentId", "periodId");

-- 7. PVDH Handovers to GVCN after Enrollment
CREATE TABLE IF NOT EXISTS "pvdh_handovers" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "recordId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "enrolledStudentId" TEXT,
  "studentCode" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "campusId" TEXT,
  "targetClassId" TEXT NOT NULL,
  "targetClassName" TEXT NOT NULL,
  "targetGvcnTeacherId" TEXT,
  "targetGvcnUserId" TEXT,
  "targetGvcnName" TEXT,
  "handoverSnapshotJson" TEXT NOT NULL,
  "includeSensitiveNotes" BOOLEAN NOT NULL DEFAULT 0,
  "handoverNote" TEXT,
  "handedOverByUserId" TEXT NOT NULL,
  "handedOverByName" TEXT NOT NULL,
  "handedOverAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "receiveStatus" TEXT NOT NULL DEFAULT 'PENDING_RECEIPT',
  "acknowledgedByUserId" TEXT,
  "acknowledgedByName" TEXT,
  "acknowledgedAt" DATETIME,
  "gvcnFeedbackNote" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_pvdh_handover_record" ON "pvdh_handovers"("recordId");
CREATE INDEX IF NOT EXISTS "idx_pvdh_handover_class_status" ON "pvdh_handovers"("targetClassId", "receiveStatus");
CREATE INDEX IF NOT EXISTS "idx_pvdh_handover_gvcn_status" ON "pvdh_handovers"("targetGvcnUserId", "receiveStatus");
CREATE INDEX IF NOT EXISTS "idx_pvdh_handover_student_code" ON "pvdh_handovers"("studentCode");

-- 8. PVDH & KSDV File Config Audit Logs (No PII/health dump in logs)
CREATE TABLE IF NOT EXISTS "pvdh_audit_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "studentId" TEXT,
  "recordId" TEXT,
  "templateCode" TEXT,
  "versionCode" TEXT,
  "action" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "actorRole" TEXT,
  "summary" TEXT,
  "metadataJson" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_pvdh_audit_entity" ON "pvdh_audit_logs"("entityType", "entityId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_pvdh_audit_student" ON "pvdh_audit_logs"("studentId", "createdAt");

-- 9. 3-Layer Input Assessment File Templates & Export Mappings
CREATE TABLE IF NOT EXISTS "ksdv_file_templates" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "resultType" TEXT NOT NULL,
  "contentCategory" TEXT NOT NULL DEFAULT 'SUBJECT_SCORE',
  "subjectId" TEXT,
  "subjectCode" TEXT NOT NULL,
  "subjectName" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL DEFAULT 'ALL',
  "periodIdsJson" TEXT NOT NULL DEFAULT '["ALL"]',
  "educationSystemsJson" TEXT NOT NULL DEFAULT '["ALL"]',
  "campusIdsJson" TEXT NOT NULL DEFAULT '["ALL"]',
  "gradesJson" TEXT NOT NULL DEFAULT '["ALL"]',
  "effectiveFrom" TEXT,
  "effectiveTo" TEXT,
  "priorityOrder" INTEGER NOT NULL DEFAULT 100,
  "versionNumber" INTEGER NOT NULL DEFAULT 1,
  "versionCode" TEXT NOT NULL DEFAULT 'v1.0',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "schemaConfigJson" TEXT NOT NULL DEFAULT '{}',
  "exportFormat" TEXT NOT NULL DEFAULT 'HTML_PDF',
  "pageSize" TEXT NOT NULL DEFAULT 'A4',
  "pageOrientation" TEXT NOT NULL DEFAULT 'PORTRAIT',
  "copyCount" INTEGER NOT NULL DEFAULT 1,
  "signatureBlocksJson" TEXT NOT NULL DEFAULT '[]',
  "fileNamePattern" TEXT NOT NULL DEFAULT '{subjectCode}_{studentCode}_{periodCode}_v{version}',
  "sampleFileMetaJson" TEXT,
  "sourceVerified" BOOLEAN NOT NULL DEFAULT 1,
  "missingSourceNote" TEXT,
  "createdById" TEXT,
  "createdByName" TEXT,
  "publishedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_ksdv_file_tpl_code_ver" ON "ksdv_file_templates"("code", "versionNumber");
CREATE INDEX IF NOT EXISTS "idx_ksdv_file_tpl_subject_status" ON "ksdv_file_templates"("subjectCode", "status");
CREATE INDEX IF NOT EXISTS "idx_ksdv_file_tpl_type_status" ON "ksdv_file_templates"("resultType", "status");

CREATE TABLE IF NOT EXISTS "ksdv_export_mappings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "fileTemplateId" TEXT NOT NULL,
  "fieldKey" TEXT NOT NULL,
  "sourcePath" TEXT NOT NULL,
  "targetFormat" TEXT NOT NULL DEFAULT 'HTML_PDF',
  "targetRef" TEXT NOT NULL,
  "dataType" TEXT NOT NULL DEFAULT 'TEXT',
  "formatPattern" TEXT,
  "isRequired" BOOLEAN NOT NULL DEFAULT 0,
  "emptyValuePolicy" TEXT NOT NULL DEFAULT 'KEEP_BLANK',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_ksdv_export_map_target"
  ON "ksdv_export_mappings"("fileTemplateId", "targetFormat", "targetRef");
CREATE INDEX IF NOT EXISTS "idx_ksdv_export_map_tpl_order"
  ON "ksdv_export_mappings"("fileTemplateId", "sortOrder");
