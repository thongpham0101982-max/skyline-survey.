const { createClient } = require('@libsql/client');
require('dotenv').config();

const rawUrl = (process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || process.env.DATABASE_URL || "").trim();
const TURSO_URL = rawUrl ? rawUrl.replace(/^libsql:\/\//, 'https://') : "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const TURSO_TOKEN = (process.env.TURSO_AUTH_TOKEN || "").trim();

async function init() {
  console.log('Connecting to Turso DB:', TURSO_URL);
  const client = createClient({
    url: TURSO_URL,
    authToken: TURSO_TOKEN
  });

  console.log('Creating table KnowledgeDocument...');
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "KnowledgeDocument" (
      "id" TEXT PRIMARY KEY,
      "title" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "version" TEXT NOT NULL DEFAULT '1.0',
      "schoolYear" TEXT NOT NULL DEFAULT '2026-2027',
      "effectiveDate" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "roleScope" TEXT NOT NULL,
      "campusScope" TEXT NOT NULL,
      "source" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "createdBy" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Creating table AIPendingAction...');
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "AIPendingAction" (
      "id" TEXT PRIMARY KEY,
      "actionType" TEXT NOT NULL,
      "targetEntityId" TEXT,
      "payloadJson" TEXT NOT NULL,
      "proposedByUserId" TEXT NOT NULL,
      "proposedByRole" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "expiresAt" DATETIME NOT NULL,
      "executedAt" DATETIME,
      "resultSummary" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Wave 2 Turso tables initialized successfully!');
}

init().catch(console.error);
