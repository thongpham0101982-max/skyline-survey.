const { createClient } = require("@libsql/client");
const path = require("path");

const LOCAL_DB_PATH = path.resolve(__dirname, "../local.db").replace(/\\/g, "/");

const CLOUD_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const CLOUD_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const ddlStatements = [
  // 1. SpecialSubject
  `CREATE TABLE IF NOT EXISTS "SpecialSubject" (
    "id" TEXT PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "levels" TEXT NOT NULL DEFAULT 'PRIMARY',
    "campuses" TEXT NOT NULL DEFAULT 'ALL',
    "description" TEXT,
    "icon" TEXT DEFAULT 'BookOpen',
    "color" TEXT DEFAULT '#00A19A',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "legacySubjectId" TEXT,
    FOREIGN KEY ("legacySubjectId") REFERENCES "Subject" ("id") ON DELETE SET NULL
  );`,
  `CREATE INDEX IF NOT EXISTS "SpecialSubject_status_idx" ON "SpecialSubject" ("status");`,
  `CREATE INDEX IF NOT EXISTS "SpecialSubject_code_idx" ON "SpecialSubject" ("code");`,

  // 2. SpecialCurriculum
  `CREATE TABLE IF NOT EXISTS "SpecialCurriculum" (
    "id" TEXT PRIMARY KEY,
    "subjectId" TEXT NOT NULL,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "targetGrades" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("subjectId") REFERENCES "SpecialSubject" ("id") ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "SpecialCurriculum_subjectId_idx" ON "SpecialCurriculum" ("subjectId");`,

  // 3. SpecialCurriculumVersion
  `CREATE TABLE IF NOT EXISTS "SpecialCurriculumVersion" (
    "id" TEXT PRIMARY KEY,
    "curriculumId" TEXT NOT NULL,
    "versionCode" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "description" TEXT,
    "sourceDocument" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("curriculumId") REFERENCES "SpecialCurriculum" ("id") ON DELETE CASCADE,
    UNIQUE("curriculumId", "versionCode")
  );`,
  `CREATE INDEX IF NOT EXISTS "SpecialCurriculumVersion_curriculumId_idx" ON "SpecialCurriculumVersion" ("curriculumId");`,
  `CREATE INDEX IF NOT EXISTS "SpecialCurriculumVersion_academicYearId_idx" ON "SpecialCurriculumVersion" ("academicYearId");`,

  // 4. SpecialSubjectGradeConfig
  `CREATE TABLE IF NOT EXISTS "SpecialSubjectGradeConfig" (
    "id" TEXT PRIMARY KEY,
    "versionId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "totalPeriods" INTEGER NOT NULL DEFAULT 15,
    "periodMinutes" INTEGER NOT NULL DEFAULT 35,
    "overallGoal" TEXT,
    "evalCycle" TEXT NOT NULL DEFAULT 'PER_LESSON',
    "evalScaleType" TEXT NOT NULL DEFAULT 'QUALITATIVE_3',
    "summaryFormula" TEXT NOT NULL DEFAULT 'MOST_FREQUENT',
    "isLocked" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("versionId") REFERENCES "SpecialCurriculumVersion" ("id") ON DELETE CASCADE,
    UNIQUE("versionId", "grade")
  );`,
  `CREATE INDEX IF NOT EXISTS "SpecialSubjectGradeConfig_versionId_idx" ON "SpecialSubjectGradeConfig" ("versionId");`,

  // 5. SpecialTopic
  `CREATE TABLE IF NOT EXISTS "SpecialTopic" (
    "id" TEXT PRIMARY KEY,
    "versionId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("versionId") REFERENCES "SpecialCurriculumVersion" ("id") ON DELETE CASCADE,
    UNIQUE("versionId", "grade", "code")
  );`,
  `CREATE INDEX IF NOT EXISTS "SpecialTopic_versionId_grade_idx" ON "SpecialTopic" ("versionId", "grade");`,

  // 6. SpecialLesson
  `CREATE TABLE IF NOT EXISTS "SpecialLesson" (
    "id" TEXT PRIMARY KEY,
    "versionId" TEXT NOT NULL,
    "topicId" TEXT,
    "grade" TEXT NOT NULL,
    "periodIndex" INTEGER NOT NULL,
    "lessonName" TEXT NOT NULL,
    "mainActivities" TEXT,
    "objectives" TEXT,
    "requirements" TEXT,
    "expectedProduct" TEXT,
    "isProject" BOOLEAN NOT NULL DEFAULT 0,
    "projectMinPeriods" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("versionId") REFERENCES "SpecialCurriculumVersion" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("topicId") REFERENCES "SpecialTopic" ("id") ON DELETE SET NULL,
    UNIQUE("versionId", "grade", "periodIndex")
  );`,
  `CREATE INDEX IF NOT EXISTS "SpecialLesson_versionId_grade_idx" ON "SpecialLesson" ("versionId", "grade");`,
  `CREATE INDEX IF NOT EXISTS "SpecialLesson_topicId_idx" ON "SpecialLesson" ("topicId");`,

  // 7. SpecialAssessmentCriterion
  `CREATE TABLE IF NOT EXISTS "SpecialAssessmentCriterion" (
    "id" TEXT PRIMARY KEY,
    "gradeConfigId" TEXT,
    "lessonId" TEXT,
    "competencyGroup" TEXT NOT NULL DEFAULT 'CHUNG',
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("gradeConfigId") REFERENCES "SpecialSubjectGradeConfig" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("lessonId") REFERENCES "SpecialLesson" ("id") ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "SpecialAssessmentCriterion_gradeConfigId_idx" ON "SpecialAssessmentCriterion" ("gradeConfigId");`,
  `CREATE INDEX IF NOT EXISTS "SpecialAssessmentCriterion_lessonId_idx" ON "SpecialAssessmentCriterion" ("lessonId");`,

  // 8. SpecialRubricLevel
  `CREATE TABLE IF NOT EXISTS "SpecialRubricLevel" (
    "id" TEXT PRIMARY KEY,
    "criterionId" TEXT NOT NULL,
    "levelCode" TEXT NOT NULL,
    "levelName" TEXT NOT NULL,
    "numericValue" REAL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("criterionId") REFERENCES "SpecialAssessmentCriterion" ("id") ON DELETE CASCADE,
    UNIQUE("criterionId", "levelCode")
  );`,
  `CREATE INDEX IF NOT EXISTS "SpecialRubricLevel_criterionId_idx" ON "SpecialRubricLevel" ("criterionId");`,

  // 9. SpecialTeachingAssignment
  `CREATE TABLE IF NOT EXISTS "SpecialTeachingAssignment" (
    "id" TEXT PRIMARY KEY,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "semester" INTEGER NOT NULL DEFAULT 1,
    "isLeadTeacher" BOOLEAN NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("subjectId") REFERENCES "SpecialSubject" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE CASCADE,
    UNIQUE("subjectId", "teacherId", "classId", "academicYearId", "semester")
  );`,
  `CREATE INDEX IF NOT EXISTS "SpecialTeachingAssignment_subjectId_idx" ON "SpecialTeachingAssignment" ("subjectId");`,
  `CREATE INDEX IF NOT EXISTS "SpecialTeachingAssignment_teacherId_idx" ON "SpecialTeachingAssignment" ("teacherId");`,
  `CREATE INDEX IF NOT EXISTS "SpecialTeachingAssignment_classId_idx" ON "SpecialTeachingAssignment" ("classId");`,
  `CREATE INDEX IF NOT EXISTS "SpecialTeachingAssignment_academicYearId_idx" ON "SpecialTeachingAssignment" ("academicYearId");`,

  // 10. SpecialGradeEntry
  `CREATE TABLE IF NOT EXISTS "SpecialGradeEntry" (
    "id" TEXT PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "lessonId" TEXT,
    "topicId" TEXT,
    "evalScope" TEXT NOT NULL DEFAULT 'LESSON',
    "evalResult" TEXT,
    "numericScore" REAL,
    "rubricDetails" TEXT,
    "teacherFeedback" TEXT,
    "studentProductUrl" TEXT,
    "attendanceStatus" TEXT NOT NULL DEFAULT 'PRESENT',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "lastUpdatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("assignmentId") REFERENCES "SpecialTeachingAssignment" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("lessonId") REFERENCES "SpecialLesson" ("id") ON DELETE SET NULL,
    UNIQUE("assignmentId", "studentId", "lessonId", "evalScope")
  );`,
  `CREATE INDEX IF NOT EXISTS "SpecialGradeEntry_studentId_idx" ON "SpecialGradeEntry" ("studentId");`,
  `CREATE INDEX IF NOT EXISTS "SpecialGradeEntry_assignmentId_idx" ON "SpecialGradeEntry" ("assignmentId");`,
  `CREATE INDEX IF NOT EXISTS "SpecialGradeEntry_lessonId_idx" ON "SpecialGradeEntry" ("lessonId");`,
  `CREATE INDEX IF NOT EXISTS "SpecialGradeEntry_status_idx" ON "SpecialGradeEntry" ("status");`,

  // 11. SpecialProjectGroup
  `CREATE TABLE IF NOT EXISTS "SpecialProjectGroup" (
    "id" TEXT PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "lessonId" TEXT,
    "projectName" TEXT NOT NULL,
    "topicName" TEXT,
    "description" TEXT,
    "productUrl" TEXT,
    "groupScore" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "activityRecordId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("assignmentId") REFERENCES "SpecialTeachingAssignment" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("lessonId") REFERENCES "SpecialLesson" ("id") ON DELETE SET NULL
  );`,
  `CREATE INDEX IF NOT EXISTS "SpecialProjectGroup_assignmentId_idx" ON "SpecialProjectGroup" ("assignmentId");`,
  `CREATE INDEX IF NOT EXISTS "SpecialProjectGroup_lessonId_idx" ON "SpecialProjectGroup" ("lessonId");`,

  // 12. SpecialProjectMember
  `CREATE TABLE IF NOT EXISTS "SpecialProjectMember" (
    "id" TEXT PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "roleInGroup" TEXT NOT NULL DEFAULT 'MEMBER',
    "individualEval" TEXT,
    "individualNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("groupId") REFERENCES "SpecialProjectGroup" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE,
    UNIQUE("groupId", "studentId")
  );`,
  `CREATE INDEX IF NOT EXISTS "SpecialProjectMember_groupId_idx" ON "SpecialProjectMember" ("groupId");`,
  `CREATE INDEX IF NOT EXISTS "SpecialProjectMember_studentId_idx" ON "SpecialProjectMember" ("studentId");`,

  // 13. SpecialGradeAudit
  `CREATE TABLE IF NOT EXISTS "SpecialGradeAudit" (
    "id" TEXT PRIMARY KEY,
    "gradeEntryId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("gradeEntryId") REFERENCES "SpecialGradeEntry" ("id") ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "SpecialGradeAudit_gradeEntryId_idx" ON "SpecialGradeAudit" ("gradeEntryId");`,
  `CREATE INDEX IF NOT EXISTS "SpecialGradeAudit_actorUserId_idx" ON "SpecialGradeAudit" ("actorUserId");`
];

async function applyToClient(name, client) {
  console.log(`Applying migrations to ${name}...`);
  let successCount = 0;
  for (const sql of ddlStatements) {
    try {
      await client.execute(sql);
      successCount++;
    } catch (err) {
      if (err.message && err.message.includes("already exists")) {
        successCount++;
      } else {
        console.warn(`[${name}] Warning on statement:`, err.message);
      }
    }
  }
  console.log(`[${name}] Successfully applied ${successCount}/${ddlStatements.length} statements.`);
}

async function main() {
  // 1. Local SQLite
  try {
    const localClient = createClient({ url: `file:${LOCAL_DB_PATH}` });
    await applyToClient("LOCAL SQLite", localClient);
  } catch (e) {
    console.error("Local migration error:", e);
  }

  // 2. Turso Cloud
  try {
    const cloudClient = createClient({ url: CLOUD_URL, authToken: CLOUD_TOKEN });
    await applyToClient("TURSO Cloud", cloudClient);
  } catch (e) {
    console.warn("Turso Cloud migration warning (offline or skipped):", e.message);
  }
}

main().catch(console.error);
