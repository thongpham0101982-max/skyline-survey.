const { createClient } = require('@libsql/client');
require('dotenv').config();

async function main() {
  const tursoUrl = (process.env.TURSO_DATABASE_URL || '').replace(/^libsql:\/\//, 'https://');
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  console.log('Connecting to Turso Cloud:', tursoUrl);
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

  // 1. Tạo bảng trên cả 2 database nếu chưa có
  for (const { name, db } of targets) {
    console.log(`\n--- 1. Checking & Migrating Table Schema on ${name} ---`);
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS "InputAssessmentGradeConfig" (
          "id" TEXT PRIMARY KEY,
          "academicYearId" TEXT NOT NULL,
          "periodId" TEXT DEFAULT 'ALL',
          "educationSystemId" TEXT DEFAULT 'ALL',
          "grade" TEXT NOT NULL,
          "subjectId" TEXT NOT NULL,
          "columnCount" INTEGER DEFAULT 1,
          "columnNames" TEXT,
          "columnTypes" TEXT,
          "columnMaxScores" TEXT,
          "hasCompositeColumn" INTEGER DEFAULT 1,
          "compositeColumnName" TEXT,
          "hasRemarkColumn" INTEGER DEFAULT 1,
          "formula" TEXT DEFAULT 'AVERAGE',
          "formulaCustom" TEXT,
          "weights" TEXT,
          "roundingRule" TEXT DEFAULT 'ROUND_1',
          "passScore" REAL,
          "commitmentThreshold" REAL,
          "status" TEXT DEFAULT 'ACTIVE',
          "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME,
          FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE,
          FOREIGN KEY ("subjectId") REFERENCES "AssessmentSubject"("id") ON DELETE CASCADE
        )
      `);
      console.log(`[${name}] Created / Verified table InputAssessmentGradeConfig successfully`);

      await db.execute(`
        CREATE UNIQUE INDEX IF NOT EXISTS "InputAssessmentGradeConfig_academicYearId_periodId_educationSystemId_grade_subjectId_key" 
        ON "InputAssessmentGradeConfig"("academicYearId", "periodId", "educationSystemId", "grade", "subjectId")
      `);
      console.log(`[${name}] Created / Verified unique index`);
    } catch (err) {
      console.error(`[${name}] Migration error:`, err.message);
    }
  }

  // 2. Lấy toàn bộ 60 bản ghi từ LOCAL nạp sang TURSO CLOUD
  console.log("\n--- 2. Syncing 60 Records from Local to Turso Cloud ---");
  const localRows = await localDb.execute(`SELECT * FROM "InputAssessmentGradeConfig"`);
  console.log(`Read ${localRows.rows.length} rows from local.db`);

  let synced = 0;
  for (const r of localRows.rows) {
    try {
      await cloudDb.execute({
        sql: `
          INSERT INTO "InputAssessmentGradeConfig" (
            "id", "academicYearId", "periodId", "educationSystemId", "grade", "subjectId",
            "columnCount", "columnNames", "columnTypes", "columnMaxScores",
            "hasCompositeColumn", "compositeColumnName", "hasRemarkColumn",
            "formula", "formulaCustom", "weights", "roundingRule",
            "passScore", "commitmentThreshold", "status", "createdAt", "updatedAt"
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT("academicYearId", "periodId", "educationSystemId", "grade", "subjectId")
          DO UPDATE SET
            "columnCount" = excluded."columnCount",
            "columnNames" = excluded."columnNames",
            "columnTypes" = excluded."columnTypes",
            "columnMaxScores" = excluded."columnMaxScores",
            "hasCompositeColumn" = excluded."hasCompositeColumn",
            "compositeColumnName" = excluded."compositeColumnName",
            "hasRemarkColumn" = excluded."hasRemarkColumn",
            "formula" = excluded."formula",
            "formulaCustom" = excluded."formulaCustom",
            "weights" = excluded."weights",
            "roundingRule" = excluded."roundingRule",
            "passScore" = excluded."passScore",
            "commitmentThreshold" = excluded."commitmentThreshold",
            "status" = excluded."status",
            "updatedAt" = CURRENT_TIMESTAMP
        `,
        args: [
          r.id, r.academicYearId, r.periodId, r.educationSystemId, r.grade, r.subjectId,
          r.columnCount, r.columnNames, r.columnTypes, r.columnMaxScores,
          r.hasCompositeColumn, r.compositeColumnName, r.hasRemarkColumn,
          r.formula, r.formulaCustom, r.weights, r.roundingRule,
          r.passScore, r.commitmentThreshold, r.status
        ]
      });
      synced++;
    } catch (e) {
      console.error(`Sync error for record ${r.id} (${r.grade}):`, e.message);
    }
  }

  console.log(`\n✅ Synced ${synced} / ${localRows.rows.length} records to Turso Cloud!`);

  // Kiểm tra lại trên Turso
  const cloudCount = await cloudDb.execute(`SELECT COUNT(*) as cnt FROM "InputAssessmentGradeConfig"`);
  console.log(`Total count on Turso Cloud: ${cloudCount.rows[0].cnt}`);
}

main().catch(console.error);
