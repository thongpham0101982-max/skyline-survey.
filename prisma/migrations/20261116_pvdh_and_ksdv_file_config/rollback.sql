-- Rollback script for PVDH (Khối 1–12) & KSDV File Configuration
-- Safely removes newly added PVDH and KSDV File Config tables & indexes while preserving 100% of legacy
-- StudentOrientationRecord, InputAssessmentGradeConfig, AssessmentSubject, StudentAssessmentScore, and TCI data.

DROP INDEX IF EXISTS "idx_ksdv_export_map_tpl_order";
DROP INDEX IF EXISTS "uq_ksdv_export_map_target";
DROP TABLE IF EXISTS "ksdv_export_mappings";

DROP INDEX IF EXISTS "idx_ksdv_file_tpl_type_status";
DROP INDEX IF EXISTS "idx_ksdv_file_tpl_subject_status";
DROP INDEX IF EXISTS "uq_ksdv_file_tpl_code_ver";
DROP TABLE IF EXISTS "ksdv_file_templates";

DROP INDEX IF EXISTS "idx_pvdh_audit_student";
DROP INDEX IF EXISTS "idx_pvdh_audit_entity";
DROP TABLE IF EXISTS "pvdh_audit_logs";

DROP INDEX IF EXISTS "idx_pvdh_handover_student_code";
DROP INDEX IF EXISTS "idx_pvdh_handover_gvcn_status";
DROP INDEX IF EXISTS "idx_pvdh_handover_class_status";
DROP INDEX IF EXISTS "idx_pvdh_handover_record";
DROP TABLE IF EXISTS "pvdh_handovers";

DROP INDEX IF EXISTS "idx_pvdh_doc_student_period";
DROP INDEX IF EXISTS "idx_pvdh_doc_record";
DROP TABLE IF EXISTS "pvdh_generated_documents";

DROP INDEX IF EXISTS "idx_pvdh_review_student";
DROP INDEX IF EXISTS "idx_pvdh_review_record";
DROP TABLE IF EXISTS "pvdh_review_histories";

DROP INDEX IF EXISTS "idx_pvdh_record_parent_interviewer";
DROP INDEX IF EXISTS "idx_pvdh_record_student_interviewer";
DROP INDEX IF EXISTS "idx_pvdh_record_period_campus_status";
DROP INDEX IF EXISTS "idx_pvdh_record_student_latest";
DROP INDEX IF EXISTS "uq_pvdh_record_student_period_attempt";
DROP TABLE IF EXISTS "pvdh_assessment_records";

DROP INDEX IF EXISTS "idx_pvdh_tpl_ver_tpl_status";
DROP INDEX IF EXISTS "uq_pvdh_tpl_ver_code_num";
DROP TABLE IF EXISTS "pvdh_template_versions";

DROP INDEX IF EXISTS "idx_pvdh_templates_group_status";
DROP INDEX IF EXISTS "idx_pvdh_templates_status_prio";
DROP TABLE IF EXISTS "pvdh_templates";

-- Note: Nullable column "contentCategory" on "AssessmentSubject" is harmless to legacy queries.
-- On SQLite >= 3.35, uncomment below if full column removal is desired:
-- ALTER TABLE "AssessmentSubject" DROP COLUMN "contentCategory";
