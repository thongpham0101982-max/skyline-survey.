-- Add 6 THPT combination columns (10 TN, 10 XH, 11 TN, 11 XH, 12 TN, 12 XH) and special note flags (*) to SubjectQuota
ALTER TABLE "SubjectQuota" ADD COLUMN "quotaG10TN" REAL;
ALTER TABLE "SubjectQuota" ADD COLUMN "quotaG10XH" REAL;
ALTER TABLE "SubjectQuota" ADD COLUMN "quotaG11TN" REAL;
ALTER TABLE "SubjectQuota" ADD COLUMN "quotaG11XH" REAL;
ALTER TABLE "SubjectQuota" ADD COLUMN "quotaG12TN" REAL;
ALTER TABLE "SubjectQuota" ADD COLUMN "quotaG12XH" REAL;
ALTER TABLE "SubjectQuota" ADD COLUMN "specialNoteFlags" TEXT DEFAULT '';
