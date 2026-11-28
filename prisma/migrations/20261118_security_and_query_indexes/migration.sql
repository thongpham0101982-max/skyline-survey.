-- Migration: 20261118_security_and_query_indexes
-- Purpose: Add composite indexes for RBAC campus/assignment lookups, Entrance Assessment filtering, Gradebook queries, and Security AuditLog retention/queries.
-- Safe & Idempotent (CREATE INDEX IF NOT EXISTS)

CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_action_idx" ON "AuditLog"("createdAt", "action");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_targetTable_targetId_idx" ON "AuditLog"("targetTable", "targetId");

CREATE INDEX IF NOT EXISTS "InputAssessmentStudent_periodId_batchId_grade_idx" ON "InputAssessmentStudent"("periodId", "batchId", "grade");
CREATE INDEX IF NOT EXISTS "InputAssessmentStudent_admissionResult_idx" ON "InputAssessmentStudent"("admissionResult");
CREATE INDEX IF NOT EXISTS "InputAssessmentStudent_registeredCampus_admissionCampus_idx" ON "InputAssessmentStudent"("registeredCampus", "admissionCampus");

CREATE INDEX IF NOT EXISTS "SubjectGradeEntry_classId_subjectId_evaluationPeriod_idx" ON "SubjectGradeEntry"("classId", "subjectId", "evaluationPeriod");
CREATE INDEX IF NOT EXISTS "TeachingAssignment_teacherId_academicYearId_classId_subjectId_idx" ON "TeachingAssignment"("teacherId", "academicYearId", "classId", "subjectId");
CREATE INDEX IF NOT EXISTS "ParentStudentLink_parentId_status_idx" ON "ParentStudentLink"("parentId", "status");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");
