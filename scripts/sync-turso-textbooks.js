const { createClient } = require('@libsql/client');
require('dotenv').config();

async function syncToTurso() {
  console.log('Connecting to Local SQLite and Turso Cloud...');
  const local = createClient({ url: 'file:local.db' });
  const cloud = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  // 1. Lấy thông tin Publisher trên Turso Cloud
  const tursoPubsRes = await cloud.execute('SELECT id, code FROM TextbookPublisher');
  const cloudPubMap = {};
  tursoPubsRes.rows.forEach(r => { cloudPubMap[r.code] = r.id; });
  console.log('Turso Publisher map:', cloudPubMap);

  const localPubsRes = await local.execute('SELECT id, code FROM TextbookPublisher');
  const localPubMap = {};
  localPubsRes.rows.forEach(r => { localPubMap[r.id] = r.code; });

  // 2. Lấy toàn bộ sách từ Local
  const booksRes = await local.execute('SELECT * FROM Textbook');
  console.log(`Found ${booksRes.rows.length} books in Local DB to sync...`);

  let syncedBooks = 0;
  for (const b of booksRes.rows) {
    const pubCode = localPubMap[b.publisherId] || 'NXB_GDVN';
    const targetPublisherId = cloudPubMap[pubCode] || b.publisherId;

    const insertBookSql = `
      INSERT INTO Textbook (
        id, title, subjectId, grade, seriesId, publisherId,
        volume, editionYear, fileUrl, storageKey, fileSize, totalPages,
        processingStatus, aiIndexStatus, coverUrl, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        subjectId = excluded.subjectId,
        grade = excluded.grade,
        seriesId = excluded.seriesId,
        publisherId = excluded.publisherId,
        fileUrl = excluded.fileUrl,
        storageKey = excluded.storageKey,
        fileSize = excluded.fileSize,
        totalPages = excluded.totalPages,
        processingStatus = excluded.processingStatus,
        coverUrl = excluded.coverUrl,
        updatedAt = excluded.updatedAt
    `;

    const args = [
      b.id, b.title, b.subjectId, b.grade, b.seriesId, targetPublisherId,
      b.volume, b.editionYear, b.fileUrl, b.storageKey, b.fileSize, b.totalPages,
      b.processingStatus, b.aiIndexStatus, b.coverUrl, b.createdAt, b.updatedAt
    ];

    try {
      await cloud.execute({ sql: insertBookSql, args });
      syncedBooks++;
    } catch (err) {
      console.error(`Failed to sync book ${b.id}:`, err.message);
    }
  }
  console.log(`✓ Synced ${syncedBooks}/${booksRes.rows.length} books to Turso Cloud.`);

  // 3. Sync Chapters
  const chRes = await local.execute('SELECT * FROM TextbookChapter');
  console.log(`Syncing ${chRes.rows.length} chapters...`);
  let syncedCh = 0;
  for (const ch of chRes.rows) {
    const sql = `
      INSERT INTO TextbookChapter (id, textbookId, chapterNumber, title, sortOrder, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        chapterNumber = excluded.chapterNumber,
        title = excluded.title,
        sortOrder = excluded.sortOrder,
        updatedAt = excluded.updatedAt
    `;
    try {
      await cloud.execute({ sql, args: [ch.id, ch.textbookId, ch.chapterNumber, ch.title, ch.sortOrder, ch.createdAt, ch.updatedAt] });
      syncedCh++;
    } catch (e) {
      console.error(`Failed chapter ${ch.id}:`, e.message);
    }
  }
  console.log(`✓ Synced ${syncedCh}/${chRes.rows.length} chapters to Turso Cloud.`);

  // 4. Sync Lessons
  const lsRes = await local.execute('SELECT * FROM TextbookLesson');
  console.log(`Syncing ${lsRes.rows.length} lessons...`);
  let syncedLs = 0;
  for (const ls of lsRes.rows) {
    const sql = `
      INSERT INTO TextbookLesson (id, chapterId, lessonNumber, title, pageStart, pageEnd, sortOrder, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        lessonNumber = excluded.lessonNumber,
        title = excluded.title,
        pageStart = excluded.pageStart,
        pageEnd = excluded.pageEnd,
        sortOrder = excluded.sortOrder,
        updatedAt = excluded.updatedAt
    `;
    try {
      await cloud.execute({ sql, args: [ls.id, ls.chapterId, ls.lessonNumber, ls.title, ls.pageStart, ls.pageEnd, ls.sortOrder, ls.createdAt, ls.updatedAt] });
      syncedLs++;
    } catch (e) {
      console.error(`Failed lesson ${ls.id}:`, e.message);
    }
  }
  console.log(`✓ Synced ${syncedLs}/${lsRes.rows.length} lessons to Turso Cloud.`);

  // Verify Cloud Count
  const countRes = await cloud.execute('SELECT COUNT(*) as total FROM Textbook');
  console.log(`\n===========================================`);
  console.log(`TURSO CLOUD TOTAL TEXTBOOKS NOW: ${countRes.rows[0].total}`);
  console.log(`===========================================`);
}

syncToTurso().catch(console.error);
