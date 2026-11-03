const { createClient } = require('@libsql/client');
const path = require('path');

const LOCAL_DB_PATH = path.resolve(__dirname, '../local.db').replace(/\\/g, '/');
const CLOUD_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const CLOUD_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const SQL_CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS "SpecialTeachingLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "assignmentId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "taughtDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedPeriods" INTEGER NOT NULL DEFAULT 1,
  "notes" TEXT,
  "attendanceCount" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SpecialTeachingLog_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "SpecialTeachingAssignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SpecialTeachingLog_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "SpecialLesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
`;

const SQL_CREATE_INDEX_1 = `
CREATE UNIQUE INDEX IF NOT EXISTS "SpecialTeachingLog_assignmentId_lessonId_key" ON "SpecialTeachingLog"("assignmentId", "lessonId");
`;

const SQL_CREATE_INDEX_2 = `
CREATE INDEX IF NOT EXISTS "SpecialTeachingLog_assignmentId_idx" ON "SpecialTeachingLog"("assignmentId");
`;

const SQL_CREATE_INDEX_3 = `
CREATE INDEX IF NOT EXISTS "SpecialTeachingLog_lessonId_idx" ON "SpecialTeachingLog"("lessonId");
`;

async function migrateOnClient(client, label) {
  console.log(`Migrating SpecialTeachingLog on ${label}...`);
  await client.execute(SQL_CREATE_TABLE);
  await client.execute(SQL_CREATE_INDEX_1);
  await client.execute(SQL_CREATE_INDEX_2);
  await client.execute(SQL_CREATE_INDEX_3);
  console.log(`✓ SpecialTeachingLog migrated successfully on ${label}`);
}

async function main() {
  const localClient = createClient({ url: `file:${LOCAL_DB_PATH}` });
  await migrateOnClient(localClient, 'LOCAL SQLite');

  try {
    const cloudClient = createClient({ url: CLOUD_URL, authToken: CLOUD_TOKEN });
    await migrateOnClient(cloudClient, 'TURSO Cloud');
  } catch (err) {
    console.warn('Turso Cloud migration warning:', err.message);
  }
}

main().catch(console.error);
