const { createClient } = require('@libsql/client');
require('dotenv').config();

async function main() {
  const tursoUrl = (process.env.TURSO_DATABASE_URL || '').replace(/^libsql:\/\//, 'https://');
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  console.log('Connecting to Turso:', tursoUrl);
  const cloudDb = createClient({
    url: tursoUrl,
    authToken: tursoToken,
  });

  const localDb = createClient({
    url: process.env.LOCAL_DATABASE_URL || 'file:D:/SSM/skyline-survey/local.db',
  });

  const targets = [
    { name: 'CLOUD (Turso)', db: cloudDb },
    { name: 'LOCAL (local.db)', db: localDb }
  ];

  for (const { name, db } of targets) {
    console.log(`\n--- Checking & Migrating ${name} ---`);
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS CtqtTeachingAssignment (
          id TEXT PRIMARY KEY,
          academicYearId TEXT,
          semester INTEGER DEFAULT 1,
          classId TEXT,
          subjectCode TEXT,
          primaryTeacherId TEXT,
          delegatedTeacherId TEXT,
          status TEXT DEFAULT 'ACTIVE',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME
        )
      `);
      console.log(`[${name}] Created / Verified CtqtTeachingAssignment`);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS CtqtGradeEntry (
          id TEXT PRIMARY KEY,
          academicYearId TEXT,
          semester INTEGER DEFAULT 1,
          classId TEXT,
          studentId TEXT,
          subjectCode TEXT,
          progressScores TEXT,
          midTermScore REAL,
          endTermScore REAL,
          gpaScore REAL,
          assessmentContentEn TEXT,
          assessmentContentVi TEXT,
          ieltsScore REAL,
          commentEn TEXT,
          commentVi TEXT,
          reviewStatus TEXT DEFAULT 'DRAFT',
          reviewerNote TEXT,
          reviewedBy TEXT,
          reviewedAt DATETIME,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME
        )
      `);
      console.log(`[${name}] Created / Verified CtqtGradeEntry`);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS CtqtCompetencyEntry (
          id TEXT PRIMARY KEY,
          academicYearId TEXT,
          semester INTEGER DEFAULT 1,
          classId TEXT,
          studentId TEXT,
          communication TEXT,
          collaboration TEXT,
          responsibility TEXT,
          criticalThinking TEXT,
          creativity TEXT,
          problemSolving TEXT,
          evaluatedBy TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME
        )
      `);
      console.log(`[${name}] Created / Verified CtqtCompetencyEntry`);

      // Indexes
      await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS uq_ctqt_assignment ON CtqtTeachingAssignment (academicYearId, semester, classId, subjectCode)`);
      await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS uq_ctqt_grade ON CtqtGradeEntry (academicYearId, semester, classId, studentId, subjectCode)`);
      await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS uq_ctqt_comp ON CtqtCompetencyEntry (academicYearId, semester, classId, studentId)`);
      console.log(`[${name}] Indexes ensured!`);

      // Check count
      const test = await db.execute(`SELECT COUNT(*) as count FROM CtqtGradeEntry`);
      console.log(`[${name}] CtqtGradeEntry count:`, test.rows[0].count);
    } catch (err) {
      console.error(`[${name}] Error:`, err);
    }
  }
}

main().catch(console.error);
