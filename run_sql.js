const { createClient } = require('@libsql/client');
require('dotenv').config();
async function run() {
  const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
  const tables = [
    `CREATE TABLE "ActivityCategory" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "type" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL
    )`,
    `CREATE TABLE "ActivityCatalog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "code" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "groupId" TEXT NOT NULL,
        "typeId" TEXT NOT NULL,
        "themeId" TEXT,
        "level" TEXT,
        "description" TEXT,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "ActivityCatalog_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ActivityCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "ActivityCatalog_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ActivityCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "ActivityCatalog_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "ActivityCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )`,
    `CREATE TABLE "ActivityRecord" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "catalogId" TEXT NOT NULL,
        "date" DATETIME NOT NULL,
        "semester" INTEGER,
        "academicYearId" TEXT NOT NULL,
        "levelId" TEXT,
        "formatId" TEXT,
        "organizerId" TEXT,
        "teacherId" TEXT NOT NULL,
        "locationId" TEXT,
        "status" TEXT NOT NULL DEFAULT 'DRAFT',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "ActivityRecord_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "ActivityCatalog" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "ActivityRecord_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "ActivityRecord_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )`,
    `CREATE TABLE "ActivityParticipant" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "recordId" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "roleId" TEXT,
        "evalLevelId" TEXT,
        "achievementId" TEXT,
        "absenceReasonId" TEXT,
        "note" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "ActivityParticipant_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "ActivityRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "ActivityParticipant_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE TABLE "ActivityEvidence" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "recordId" TEXT NOT NULL,
        "typeId" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "description" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ActivityEvidence_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "ActivityRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE UNIQUE INDEX "ActivityCategory_type_code_key" ON "ActivityCategory"("type", "code")`,
    `CREATE UNIQUE INDEX "ActivityCatalog_code_key" ON "ActivityCatalog"("code")`,
    `CREATE UNIQUE INDEX "ActivityParticipant_recordId_studentId_key" ON "ActivityParticipant"("recordId", "studentId")`
  ];

  for (const sql of tables) {
    try {
      await client.execute(sql);
      console.log('Success:', sql.substring(0, 40));
    } catch(e) {
      console.error('Failed:', sql.substring(0, 40), e.message);
    }
  }
}
run();
