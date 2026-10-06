const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config();

const defaultLocalDbPath = path.resolve(__dirname, '..', 'local.db').replace(/\\/g, '/');

const tursoUrl = process.env.TURSO_DATABASE_URL
  ? process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://')
  : 'https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io';
const tursoToken = process.env.TURSO_AUTH_TOKEN || '';

const cloudClient = createClient({
  url: tursoUrl,
  authToken: tursoToken
});

const localClient = createClient({
  url: `file:${defaultLocalDbPath}`
});

const DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "TextbookPublisher" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL UNIQUE,
    "website" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "TextbookPublisher_status_idx" ON "TextbookPublisher"("status");`,

  `CREATE TABLE IF NOT EXISTS "TextbookSeries" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL UNIQUE,
    "publisherId" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("publisherId") REFERENCES "TextbookPublisher"("id") ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "TextbookSeries_publisherId_idx" ON "TextbookSeries"("publisherId");`,
  `CREATE INDEX IF NOT EXISTS "TextbookSeries_status_idx" ON "TextbookSeries"("status");`,

  `CREATE TABLE IF NOT EXISTS "TextbookSource" (
    "id" TEXT PRIMARY KEY,
    "sourceName" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "allowedDomains" TEXT NOT NULL,
    "downloadAllowed" BOOLEAN NOT NULL DEFAULT 0,
    "aiIndexAllowed" BOOLEAN NOT NULL DEFAULT 1,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "TextbookSource_status_idx" ON "TextbookSource"("status");`,

  `CREATE TABLE IF NOT EXISTS "Textbook" (
    "id" TEXT PRIMARY KEY,
    "title" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "schoolYearId" TEXT,
    "seriesId" TEXT NOT NULL,
    "publisherId" TEXT NOT NULL,
    "sourceId" TEXT,
    "volume" TEXT DEFAULT 'TAP_1',
    "editionYear" INTEGER DEFAULT 2024,
    "isbn" TEXT,
    "coverUrl" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'UPLOAD_PDF',
    "sourceUrl" TEXT,
    "fileUrl" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileHash" TEXT,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "totalPages" INTEGER NOT NULL DEFAULT 0,
    "licenseNote" TEXT,
    "processingStatus" TEXT NOT NULL DEFAULT 'NEW',
    "aiIndexStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE,
    FOREIGN KEY ("schoolYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL,
    FOREIGN KEY ("seriesId") REFERENCES "TextbookSeries"("id") ON DELETE RESTRICT,
    FOREIGN KEY ("publisherId") REFERENCES "TextbookPublisher"("id") ON DELETE RESTRICT,
    FOREIGN KEY ("sourceId") REFERENCES "TextbookSource"("id") ON DELETE SET NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Textbook_composite_unique_idx" ON "Textbook"("subjectId", "grade", "seriesId", "publisherId", "volume", "editionYear");`,
  `CREATE INDEX IF NOT EXISTS "Textbook_subjectId_idx" ON "Textbook"("subjectId");`,
  `CREATE INDEX IF NOT EXISTS "Textbook_grade_idx" ON "Textbook"("grade");`,
  `CREATE INDEX IF NOT EXISTS "Textbook_seriesId_idx" ON "Textbook"("seriesId");`,
  `CREATE INDEX IF NOT EXISTS "Textbook_processingStatus_idx" ON "Textbook"("processingStatus");`,
  `CREATE INDEX IF NOT EXISTS "Textbook_fileHash_idx" ON "Textbook"("fileHash");`,

  `CREATE TABLE IF NOT EXISTS "TextbookChapter" (
    "id" TEXT PRIMARY KEY,
    "textbookId" TEXT NOT NULL,
    "chapterNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("textbookId") REFERENCES "Textbook"("id") ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "TextbookChapter_textbookId_idx" ON "TextbookChapter"("textbookId");`,
  `CREATE INDEX IF NOT EXISTS "TextbookChapter_sortOrder_idx" ON "TextbookChapter"("sortOrder");`,

  `CREATE TABLE IF NOT EXISTS "TextbookLesson" (
    "id" TEXT PRIMARY KEY,
    "chapterId" TEXT NOT NULL,
    "lessonNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "pageStart" INTEGER NOT NULL,
    "pageEnd" INTEGER NOT NULL,
    "summary" TEXT,
    "keywords" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("chapterId") REFERENCES "TextbookChapter"("id") ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "TextbookLesson_chapterId_idx" ON "TextbookLesson"("chapterId");`,
  `CREATE INDEX IF NOT EXISTS "TextbookLesson_pageStart_pageEnd_idx" ON "TextbookLesson"("pageStart", "pageEnd");`,

  `CREATE TABLE IF NOT EXISTS "TextbookPage" (
    "id" TEXT PRIMARY KEY,
    "textbookId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "pageText" TEXT NOT NULL,
    "hasImages" BOOLEAN NOT NULL DEFAULT 0,
    "isOcr" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("textbookId") REFERENCES "Textbook"("id") ON DELETE CASCADE
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "TextbookPage_textbookId_pageNumber_key" ON "TextbookPage"("textbookId", "pageNumber");`,
  `CREATE INDEX IF NOT EXISTS "TextbookPage_textbookId_idx" ON "TextbookPage"("textbookId");`,

  `CREATE TABLE IF NOT EXISTS "TextbookChunk" (
    "id" TEXT PRIMARY KEY,
    "textbookId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "chapterId" TEXT,
    "lessonId" TEXT,
    "pageStart" INTEGER NOT NULL,
    "pageEnd" INTEGER NOT NULL,
    "chunkText" TEXT NOT NULL,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "embedding" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("textbookId") REFERENCES "Textbook"("id") ON DELETE CASCADE,
    FOREIGN KEY ("lessonId") REFERENCES "TextbookLesson"("id") ON DELETE SET NULL
  );`,
  `CREATE INDEX IF NOT EXISTS "TextbookChunk_textbookId_idx" ON "TextbookChunk"("textbookId");`,
  `CREATE INDEX IF NOT EXISTS "TextbookChunk_subjectId_grade_idx" ON "TextbookChunk"("subjectId", "grade");`,
  `CREATE INDEX IF NOT EXISTS "TextbookChunk_chapterId_idx" ON "TextbookChunk"("chapterId");`,
  `CREATE INDEX IF NOT EXISTS "TextbookChunk_lessonId_idx" ON "TextbookChunk"("lessonId");`,

  `CREATE TABLE IF NOT EXISTS "TextbookProcessingJob" (
    "id" TEXT PRIMARY KEY,
    "textbookId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "payloadJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("textbookId") REFERENCES "Textbook"("id") ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "TextbookProcessingJob_textbookId_idx" ON "TextbookProcessingJob"("textbookId");`,
  `CREATE INDEX IF NOT EXISTS "TextbookProcessingJob_status_idx" ON "TextbookProcessingJob"("status");`
];

const ALTER_STATEMENTS = [
  `ALTER TABLE "ObservationSlot" ADD COLUMN "textbookId" TEXT;`,
  `ALTER TABLE "ObservationSlot" ADD COLUMN "chapterId" TEXT;`,
  `ALTER TABLE "ObservationSlot" ADD COLUMN "lessonId" TEXT;`,
  `ALTER TABLE "ObservationSlot" ADD COLUMN "lessonPageNumber" INTEGER;`,

  `ALTER TABLE "LearningSupportTarget" ADD COLUMN "textbookId" TEXT;`,
  `ALTER TABLE "LearningSupportTarget" ADD COLUMN "chapterId" TEXT;`,
  `ALTER TABLE "LearningSupportTarget" ADD COLUMN "lessonId" TEXT;`,
  `ALTER TABLE "LearningSupportTarget" ADD COLUMN "academicTopic" TEXT;`,

  `ALTER TABLE "AcademicConsultationLog" ADD COLUMN "subjectId" TEXT;`,
  `ALTER TABLE "AcademicConsultationLog" ADD COLUMN "textbookId" TEXT;`,
  `ALTER TABLE "AcademicConsultationLog" ADD COLUMN "chapterId" TEXT;`,
  `ALTER TABLE "AcademicConsultationLog" ADD COLUMN "lessonId" TEXT;`,
  `ALTER TABLE "AcademicConsultationLog" ADD COLUMN "academicTopic" TEXT;`
];

async function applyMigrations(client, name) {
  console.log(`\n=== Migrating ${name} ===`);
  for (const sql of DDL_STATEMENTS) {
    try {
      await client.execute(sql);
    } catch (e) {
      console.warn(`[${name}] DDL note:`, e.message);
    }
  }

  for (const sql of ALTER_STATEMENTS) {
    try {
      await client.execute(sql);
    } catch (e) {
      if (!e.message.includes('duplicate column') && !e.message.includes('already exists')) {
        console.warn(`[${name}] Alter note:`, e.message);
      }
    }
  }

  // Seed default Publishers, Series, and Sources if none exist
  try {
    const res = await client.execute('SELECT COUNT(*) as count FROM TextbookPublisher');
    const count = Number(res.rows[0]?.count || 0);
    if (count === 0) {
      console.log(`[${name}] Seeding default publishers, series and sources...`);
      const now = new Date().toISOString();
      const pub1Id = 'pub_nxbgdvn_' + Date.now();
      const pub2Id = 'pub_nxbsp_' + (Date.now() + 1);

      await client.execute({
        sql: `INSERT INTO TextbookPublisher (id, name, code, website, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [pub1Id, 'Nhà xuất bản Giáo dục Việt Nam', 'NXB_GDVN', 'https://www.nxbgd.vn', 'ACTIVE', now, now]
      });

      await client.execute({
        sql: `INSERT INTO TextbookPublisher (id, name, code, website, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [pub2Id, 'Nhà xuất bản Đại học Sư phạm', 'NXB_DHSP', 'https://nxbdhsp.edu.vn', 'ACTIVE', now, now]
      });

      const seriesList = [
        ['series_kntt', 'Kết nối tri thức với cuộc sống', 'KNTT', pub1Id, 'Bộ sách Kết nối tri thức với cuộc sống - NXBGDVN'],
        ['series_ctst', 'Chân trời sáng tạo', 'CTST', pub1Id, 'Bộ sách Chân trời sáng tạo - NXBGDVN'],
        ['series_canhdieu', 'Cánh Diều', 'CANH_DIEU', pub2Id, 'Bộ sách Cánh Diều - NXB ĐH Sư phạm & VEPIC']
      ];

      for (const [id, sname, scode, pid, desc] of seriesList) {
        await client.execute({
          sql: `INSERT INTO TextbookSeries (id, name, code, publisherId, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [id, sname, scode, pid, desc, 'ACTIVE', now, now]
        });
      }

      const sourcesList = [
        ['src_hanhtrangso', 'Hành Trang Số - NXB Giáo Dục Việt Nam', 'PUBLISHER_PORTAL', 'https://hanhtrangso.nxbgd.vn', JSON.stringify(['hanhtrangso.nxbgd.vn', 'taphuan.nxbgd.vn']), 1, 1, 1],
        ['src_hoclieucd', 'Học Liệu Cánh Diều', 'PUBLISHER_PORTAL', 'https://hoclieucanhdieu.vn', JSON.stringify(['hoclieucanhdieu.vn', 'canhdieu.vn']), 1, 1, 0],
        ['src_internal', 'Kho lưu trữ nội bộ Sky-Line', 'INTERNAL_STORAGE', 'http://localhost:3000', JSON.stringify(['localhost', '127.0.0.1', 'skylineschool.edu.vn']), 1, 1, 1]
      ];

      for (const [id, sname, stype, burl, adom, dl, ai, sync] of sourcesList) {
        await client.execute({
          sql: `INSERT INTO TextbookSource (id, sourceName, sourceType, baseUrl, allowedDomains, downloadAllowed, aiIndexAllowed, syncEnabled, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [id, sname, stype, burl, adom, dl, ai, sync, 'ACTIVE', now, now]
        });
      }
      console.log(`[${name}] Default seed completed.`);
    }
  } catch (e) {
    console.error(`[${name}] Seed error:`, e.message);
  }
}

async function runAll() {
  await applyMigrations(localClient, 'Local SQLite (local.db)');
  try {
    await applyMigrations(cloudClient, 'Turso Cloud');
  } catch (err) {
    console.warn('Turso cloud migration note/skip:', err.message);
  }
  console.log('\nAll migrations executed successfully!');
}

runAll().then(() => process.exit(0)).catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
