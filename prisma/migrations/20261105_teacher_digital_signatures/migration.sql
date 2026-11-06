-- =============================================================================
-- MIGRATION: 20261105_teacher_digital_signatures
-- Purpose: Add Teacher Digital Signature, Configuration, Documents & Audit Log
-- Principle: Additive (No existing tables modified, non-destructive)
-- =============================================================================

CREATE TABLE IF NOT EXISTS "teacher_signature_profiles" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "teacherId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
  "connectionStatus" TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
  "subjectDn" TEXT,
  "serialNumber" TEXT,
  "issuer" TEXT,
  "validFrom" DATETIME,
  "validTo" DATETIME,
  "lastVerifiedAt" DATETIME,
  "visualAppearanceUrl" TEXT,
  "appearanceType" TEXT NOT NULL DEFAULT 'DRAWN',
  "appearanceVersion" INTEGER NOT NULL DEFAULT 1,
  "signatureRoleText" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_tsp_teacher" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_tsp_teacher" ON "teacher_signature_profiles" ("teacherId");
CREATE INDEX IF NOT EXISTS "idx_tsp_status" ON "teacher_signature_profiles" ("connectionStatus");

CREATE TABLE IF NOT EXISTS "digital_signature_configs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "isEnabled" BOOLEAN NOT NULL DEFAULT 1,
  "allowedProviders" TEXT NOT NULL DEFAULT '["VNPT_SMARTCA","VIETTEL_CA","MISA_ESIGN","FPT_CA","MOCK_SANDBOX"]',
  "activeProvider" TEXT NOT NULL DEFAULT 'VNPT_SMARTCA',
  "providerSettings" TEXT NOT NULL DEFAULT '{}',
  "applicableForms" TEXT NOT NULL DEFAULT '["HO_SO_NANG_LUC","PHIEU_DANH_GIA_MON_HOC","PHIEU_DANH_GIA_MAM_NON","CAM_KET_HOC_TAP"]',
  "signingFlowRules" TEXT NOT NULL DEFAULT '{"order":["GVBM","GVCN","TTCM","GDCS"],"requirePreviousSigns":true}',
  "anchorSettings" TEXT NOT NULL DEFAULT '{}',
  "campusScope" TEXT NOT NULL DEFAULT '["*"]',
  "academicYearScope" TEXT NOT NULL DEFAULT '["*"]',
  "autoPublishOnCompleted" BOOLEAN NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_dsc_key" ON "digital_signature_configs" ("key");

CREATE TABLE IF NOT EXISTS "signable_documents" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "documentCode" TEXT NOT NULL UNIQUE,
  "formType" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "campusId" TEXT,
  "subjectId" TEXT,
  "term" TEXT,
  "title" TEXT NOT NULL,
  "version" TEXT NOT NULL DEFAULT '1.0',
  "versionNumber" INTEGER NOT NULL DEFAULT 1,
  "contentHash" TEXT NOT NULL,
  "contentSnapshot" TEXT NOT NULL,
  "contentStatus" TEXT NOT NULL DEFAULT 'READY_TO_SIGN',
  "publicationStatus" TEXT NOT NULL DEFAULT 'UNPUBLISHED',
  "publishedAt" DATETIME,
  "publishedById" TEXT,
  "isCompleted" BOOLEAN NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_sigdoc_student" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_sigdoc_year" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_sigdoc_class" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_sigdoc_student" ON "signable_documents" ("studentId");
CREATE INDEX IF NOT EXISTS "idx_sigdoc_class" ON "signable_documents" ("classId");
CREATE INDEX IF NOT EXISTS "idx_sigdoc_year" ON "signable_documents" ("academicYearId");
CREATE INDEX IF NOT EXISTS "idx_sigdoc_subject" ON "signable_documents" ("subjectId");
CREATE INDEX IF NOT EXISTS "idx_sigdoc_form" ON "signable_documents" ("formType");
CREATE INDEX IF NOT EXISTS "idx_sigdoc_status" ON "signable_documents" ("contentStatus", "publicationStatus");

CREATE TABLE IF NOT EXISTS "document_signatures" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "documentId" TEXT NOT NULL,
  "signerId" TEXT NOT NULL,
  "signerName" TEXT NOT NULL,
  "signerRole" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL DEFAULT 1,
  "requestStatus" TEXT NOT NULL DEFAULT 'AWAITING_AUTH',
  "requestId" TEXT NOT NULL UNIQUE,
  "transactionId" TEXT,
  "provider" TEXT NOT NULL,
  "dataHash" TEXT NOT NULL,
  "signatureValue" TEXT,
  "certificateSerial" TEXT,
  "certificateSubject" TEXT,
  "certIssuer" TEXT,
  "signedAt" DATETIME,
  "verifiedAt" DATETIME,
  "verificationResult" TEXT,
  "visualAppearanceUrl" TEXT,
  "signedPdfPath" TEXT,
  "failureReason" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "reconciliationStatus" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fk_docsig_doc" FOREIGN KEY ("documentId") REFERENCES "signable_documents" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_docsig_doc" ON "document_signatures" ("documentId");
CREATE INDEX IF NOT EXISTS "idx_docsig_signer" ON "document_signatures" ("signerId");
CREATE INDEX IF NOT EXISTS "idx_docsig_status" ON "document_signatures" ("requestStatus");
CREATE INDEX IF NOT EXISTS "idx_docsig_req" ON "document_signatures" ("requestId");

CREATE TABLE IF NOT EXISTS "signature_audit_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "documentId" TEXT,
  "signatureId" TEXT,
  "action" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "details" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_sig_audit_doc" ON "signature_audit_logs" ("documentId");
CREATE INDEX IF NOT EXISTS "idx_sig_audit_actor" ON "signature_audit_logs" ("actorId");
CREATE INDEX IF NOT EXISTS "idx_sig_audit_created" ON "signature_audit_logs" ("createdAt");
