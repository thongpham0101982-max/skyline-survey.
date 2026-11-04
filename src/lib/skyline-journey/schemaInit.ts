import * as dbMod from "@/lib/db";
const { prisma } = dbMod;

const initializedEngines = new Set<string>();
const initPromises = new Map<string, Promise<void>>();

/**
 * Idempotently creates and upgrades the Sky-Line Learning Journey tables and indexes in SQLite / Turso.
 * Safe for production: uses CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, and safe column additions.
 * Never alters, seeds unsolicited test data, or drops existing SSM tables.
 */
export async function ensureSkylineJourneyTables(): Promise<void> {
  let engineKey = "DEFAULT";
  try {
    if ("getCurrentEngine" in dbMod && typeof (dbMod as any).getCurrentEngine === "function") {
      engineKey = (dbMod as any).getCurrentEngine();
    }
  } catch {
    engineKey = "DEFAULT";
  }
  if (initializedEngines.has(engineKey)) return;
  const existingPromise = initPromises.get(engineKey);
  if (existingPromise) return existingPromise;

  const promise = (async () => {
    try {
      const createStatements = [
        `CREATE TABLE IF NOT EXISTS "skyline_journey_configs" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "academicYearId" TEXT NOT NULL,
          "subjectId" TEXT NOT NULL DEFAULT 'spec_sub_fin_edu',
          "subjectCode" TEXT NOT NULL DEFAULT 'FIN_EDU',
          "curriculumCode" TEXT DEFAULT 'TC02S',
          "programCode" TEXT NOT NULL DEFAULT 'TC02S',
          "versionId" TEXT DEFAULT 'spec_ver_fin_v1_0',
          "grade" TEXT NOT NULL,
          "educationSystem" TEXT NOT NULL DEFAULT 'HNS',
          "campusId" TEXT DEFAULT 'ALL',
          "classId" TEXT DEFAULT 'ALL',
          "isEnabled" BOOLEAN NOT NULL DEFAULT 1,
          "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED',
          "missionVersion" TEXT NOT NULL DEFAULT 'v1.0-TC02S',
          "defaultUnlockedStages" INTEGER NOT NULL DEFAULT 5,
          "approvedById" TEXT,
          "approvedByUserId" TEXT,
          "approvedByName" TEXT,
          "approvedAt" DATETIME,
          "configJson" TEXT,
          "notes" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS "idx_sjc_year_grade" ON "skyline_journey_configs"("academicYearId", "grade", "isEnabled")`,

        `CREATE TABLE IF NOT EXISTS "skyline_quest_assignments" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "academicYearId" TEXT NOT NULL,
          "assignmentId" TEXT,
          "classId" TEXT NOT NULL,
          "subjectId" TEXT NOT NULL DEFAULT 'spec_sub_fin_edu',
          "subjectCode" TEXT NOT NULL DEFAULT 'FIN_EDU',
          "programCode" TEXT NOT NULL DEFAULT 'TC02S',
          "topicId" TEXT,
          "lessonId" TEXT NOT NULL,
          "lessonCode" TEXT NOT NULL,
          "periodIndex" INTEGER NOT NULL,
          "missionVersion" TEXT NOT NULL DEFAULT 'v1.0-TC02S',
          "isUnlocked" BOOLEAN NOT NULL DEFAULT 1,
          "isExempted" BOOLEAN NOT NULL DEFAULT 0,
          "requiresTeacherConfirm" BOOLEAN NOT NULL DEFAULT 0,
          "customGuidance" TEXT,
          "teacherGuidance" TEXT,
          "dueDate" DATETIME,
          "assignedById" TEXT,
          "assignedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
          "unlockedByUserId" TEXT,
          "unlockedByName" TEXT,
          "unlockedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS "idx_sqa_class_unlocked" ON "skyline_quest_assignments"("classId", "subjectCode", "isUnlocked")`,

        `CREATE TABLE IF NOT EXISTS "skyline_quest_progress" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "studentId" TEXT NOT NULL,
          "studentCode" TEXT,
          "studentName" TEXT,
          "classId" TEXT NOT NULL,
          "campusId" TEXT,
          "academicYearId" TEXT NOT NULL,
          "subjectId" TEXT NOT NULL DEFAULT 'spec_sub_fin_edu',
          "subjectCode" TEXT NOT NULL DEFAULT 'FIN_EDU',
          "programCode" TEXT NOT NULL DEFAULT 'TC02S',
          "topicId" TEXT,
          "lessonId" TEXT NOT NULL,
          "lessonCode" TEXT NOT NULL,
          "periodIndex" INTEGER NOT NULL,
          "missionVersion" TEXT NOT NULL DEFAULT 'v1.0-TC02S',
          "status" TEXT NOT NULL DEFAULT 'READY',
          "stageStatus" TEXT NOT NULL DEFAULT 'READY',
          "hasPlayed" BOOLEAN NOT NULL DEFAULT 0,
          "autoChallengePassed" BOOLEAN NOT NULL DEFAULT 0,
          "teacherConfirmed" BOOLEAN NOT NULL DEFAULT 0,
          "attemptsCount" INTEGER NOT NULL DEFAULT 0,
          "actionPayloadJson" TEXT NOT NULL DEFAULT '{}',
          "lastActionPayloadJson" TEXT NOT NULL DEFAULT '{}',
          "worldStateJson" TEXT NOT NULL DEFAULT '{}',
          "criteriaResultJson" TEXT NOT NULL DEFAULT '[]',
          "criteriaAchievedJson" TEXT NOT NULL DEFAULT '[]',
          "studentReflection" TEXT,
          "practicalActionText" TEXT,
          "shareWithParent" BOOLEAN NOT NULL DEFAULT 1,
          "teacherFeedback" TEXT,
          "teacherRevisionNote" TEXT,
          "teacherReviewedById" TEXT,
          "teacherReviewedAt" DATETIME,
          "reviewedByUserId" TEXT,
          "reviewedByName" TEXT,
          "reviewedAt" DATETIME,
          "feathersEarned" INTEGER NOT NULL DEFAULT 0,
          "flagPlanted" BOOLEAN NOT NULL DEFAULT 0,
          "lastPlayedAt" DATETIME,
          "startedAt" DATETIME,
          "completedAt" DATETIME,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS "idx_sqp_student_year" ON "skyline_quest_progress"("studentId", "academicYearId")`,

        `CREATE TABLE IF NOT EXISTS "skyline_reward_ledger" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "idempotencyKey" TEXT NOT NULL UNIQUE,
          "studentId" TEXT NOT NULL,
          "classId" TEXT NOT NULL DEFAULT 'ALL',
          "academicYearId" TEXT NOT NULL,
          "subjectId" TEXT NOT NULL DEFAULT 'spec_sub_fin_edu',
          "subjectCode" TEXT NOT NULL DEFAULT 'FIN_EDU',
          "programCode" TEXT NOT NULL DEFAULT 'TC02S',
          "lessonCode" TEXT NOT NULL DEFAULT 'TC02S',
          "periodIndex" INTEGER NOT NULL DEFAULT 1,
          "rewardType" TEXT NOT NULL DEFAULT 'STAGE_CLEAR',
          "rewardCode" TEXT,
          "milestoneCode" TEXT NOT NULL DEFAULT 'STAGE_CLEAR',
          "title" TEXT,
          "rewardTitle" TEXT NOT NULL DEFAULT 'Phần thưởng Sky-Line',
          "description" TEXT,
          "rewardIcon" TEXT NOT NULL DEFAULT 'Feather',
          "feathers" INTEGER NOT NULL DEFAULT 1,
          "feathersEarned" INTEGER NOT NULL DEFAULT 1,
          "badgeCode" TEXT,
          "badgeName" TEXT,
          "sourceLessonId" TEXT,
          "metadataJson" TEXT NOT NULL DEFAULT '{}',
          "awardedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE INDEX IF NOT EXISTS "idx_srl_student" ON "skyline_reward_ledger"("studentId", "academicYearId")`
      ];

      for (const sql of createStatements) {
        await (prisma as any).$executeRawUnsafe(sql);
      }

      // Idempotently ensure all columns exist if tables were created by an earlier schema version
      const alterColumns = [
        `ALTER TABLE "skyline_journey_configs" ADD COLUMN "subjectId" TEXT NOT NULL DEFAULT 'spec_sub_fin_edu'`,
        `ALTER TABLE "skyline_journey_configs" ADD COLUMN "curriculumCode" TEXT DEFAULT 'TC02S'`,
        `ALTER TABLE "skyline_journey_configs" ADD COLUMN "versionId" TEXT DEFAULT 'spec_ver_fin_v1_0'`,
        `ALTER TABLE "skyline_journey_configs" ADD COLUMN "approvedById" TEXT`,
        `ALTER TABLE "skyline_journey_configs" ADD COLUMN "configJson" TEXT`,

        `ALTER TABLE "skyline_quest_assignments" ADD COLUMN "subjectId" TEXT NOT NULL DEFAULT 'spec_sub_fin_edu'`,
        `ALTER TABLE "skyline_quest_assignments" ADD COLUMN "topicId" TEXT`,
        `ALTER TABLE "skyline_quest_assignments" ADD COLUMN "customGuidance" TEXT`,
        `ALTER TABLE "skyline_quest_assignments" ADD COLUMN "assignedById" TEXT`,
        `ALTER TABLE "skyline_quest_assignments" ADD COLUMN "assignedAt" DATETIME`,

        `ALTER TABLE "skyline_quest_progress" ADD COLUMN "subjectId" TEXT NOT NULL DEFAULT 'spec_sub_fin_edu'`,
        `ALTER TABLE "skyline_quest_progress" ADD COLUMN "topicId" TEXT`,
        `ALTER TABLE "skyline_quest_progress" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'READY'`,
        `ALTER TABLE "skyline_quest_progress" ADD COLUMN "actionPayloadJson" TEXT NOT NULL DEFAULT '{}'`,
        `ALTER TABLE "skyline_quest_progress" ADD COLUMN "criteriaResultJson" TEXT NOT NULL DEFAULT '[]'`,
        `ALTER TABLE "skyline_quest_progress" ADD COLUMN "studentReflection" TEXT`,
        `ALTER TABLE "skyline_quest_progress" ADD COLUMN "teacherReviewedById" TEXT`,
        `ALTER TABLE "skyline_quest_progress" ADD COLUMN "teacherReviewedAt" DATETIME`,
        `ALTER TABLE "skyline_quest_progress" ADD COLUMN "feathersEarned" INTEGER NOT NULL DEFAULT 0`,
        `ALTER TABLE "skyline_quest_progress" ADD COLUMN "flagPlanted" BOOLEAN NOT NULL DEFAULT 0`,
        `ALTER TABLE "skyline_quest_progress" ADD COLUMN "lastPlayedAt" DATETIME`,

        `ALTER TABLE "skyline_reward_ledger" ADD COLUMN "subjectId" TEXT NOT NULL DEFAULT 'spec_sub_fin_edu'`,
        `ALTER TABLE "skyline_reward_ledger" ADD COLUMN "rewardCode" TEXT`,
        `ALTER TABLE "skyline_reward_ledger" ADD COLUMN "title" TEXT`,
        `ALTER TABLE "skyline_reward_ledger" ADD COLUMN "description" TEXT`,
        `ALTER TABLE "skyline_reward_ledger" ADD COLUMN "feathers" INTEGER NOT NULL DEFAULT 1`,
        `ALTER TABLE "skyline_reward_ledger" ADD COLUMN "badgeCode" TEXT`,
        `ALTER TABLE "skyline_reward_ledger" ADD COLUMN "badgeName" TEXT`,
        `ALTER TABLE "skyline_reward_ledger" ADD COLUMN "sourceLessonId" TEXT`
      ];

      for (const alterSql of alterColumns) {
        try {
          await (prisma as any).$executeRawUnsafe(alterSql);
        } catch {
          // Ignore "duplicate column name" when column already exists
        }
      }

      initializedEngines.add(engineKey);
    } catch (err) {
      console.error("[SkylineJourney schemaInit] Error initializing tables:", err);
      initPromises.delete(engineKey);
    }
  })();

  initPromises.set(engineKey, promise);
  return promise;
}
