-- Rollback script for Sky-Line Timetable v2.0
-- Safely drops newly added v2 tables & indexes while preserving 100% of legacy TimetableSlot rows.
-- Note: To remove versioned v2 slots while keeping legacy pre-v2 rows intact, run:
--   DELETE FROM "TimetableSlot" WHERE "versionId" IS NOT NULL;
-- Additive nullable columns on "TimetableSlot" remain harmless to legacy queries, or can be dropped on SQLite >= 3.35.

DROP INDEX IF EXISTS "uq_timetable_slot_version_cell";
DROP INDEX IF EXISTS "idx_timetable_slot_version";
DROP INDEX IF EXISTS "idx_timetable_slot_teacher_day";
DROP INDEX IF EXISTS "idx_timetable_slot_coteacher_day";
DROP INDEX IF EXISTS "idx_timetable_slot_assistant_day";
DROP INDEX IF EXISTS "idx_timetable_slot_altteacher_day";
DROP INDEX IF EXISTS "idx_timetable_slot_room_day";

DROP TABLE IF EXISTS "timetable_audit_logs";
DROP TABLE IF EXISTS "timetable_substitutions";
DROP TABLE IF EXISTS "timetable_travel_rules";
DROP TABLE IF EXISTS "timetable_busy_slots";
DROP TABLE IF EXISTS "timetable_rooms";
DROP TABLE IF EXISTS "timetable_configs";
DROP TABLE IF EXISTS "timetable_versions";
