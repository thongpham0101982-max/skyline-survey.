-- Rollback: 20261118_security_and_query_indexes
-- Purpose: Safely drop composite indexes added in 20261118_security_and_query_indexes without affecting any table data.

DROP INDEX IF EXISTS "AuditLog_createdAt_action_idx";
DROP INDEX IF EXISTS "AuditLog_userId_createdAt_idx";
DROP INDEX IF EXISTS "AuditLog_targetTable_targetId_idx";

DROP INDEX IF EXISTS "InputAssessmentStudent_periodId_batchId_grade_idx";
DROP INDEX IF EXISTS "InputAssessmentStudent_admissionResult_idx";
DROP INDEX IF EXISTS "InputAssessmentStudent_registeredCampus_admissionCampus_idx";

DROP INDEX IF EXISTS "SubjectGradeEntry_classId_subjectId_evaluationPeriod_idx";
DROP INDEX IF EXISTS "TeachingAssignment_teacherId_academicYearId_classId_subjectId_idx";
DROP INDEX IF EXISTS "ParentStudentLink_parentId_status_idx";
DROP INDEX IF EXISTS "PasswordResetToken_expiresAt_idx";
