const { createClient } = require('@libsql/client');

async function main() {
  const db = createClient({ url: 'file:D:/SSM/skyline-survey/local.db' });
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
  console.log('Ctqt tables synced successfully to local.db!');
}

main().catch(console.error);
