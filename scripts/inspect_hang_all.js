const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function inspectHang() {
  const teacherId = 'cmqgdj4br0002hs5x7j3eyxmc'; // Nguyễn Thị Hằng
  const userId = 'cmqgdj3xg0000hs5x9rlaiu8b';

  console.log("=== 1. Teaching Assignments ===");
  const ta = await client.execute({
    sql: `SELECT ta.*, c.className, s.subjectName 
          FROM TeachingAssignment ta 
          LEFT JOIN Class c ON ta.classId = c.id 
          LEFT JOIN Subject s ON ta.subjectId = s.id 
          WHERE ta.teacherId = ?`,
    args: [teacherId]
  });
  console.log("TeachingAssignment:", ta.rows);

  console.log("=== 2. SpecialSubjectTeacherAssignment ===");
  try {
    const ssta = await client.execute({
      sql: `SELECT ssta.*, c.className 
            FROM SpecialSubjectTeacherAssignment ssta 
            LEFT JOIN Class c ON ssta.classId = c.id 
            WHERE ssta.teacherId = ?`,
      args: [teacherId]
    });
    console.log("SpecialSubjectTeacherAssignment:", ssta.rows);
  } catch (e) {
    console.log("Error querying SpecialSubjectTeacherAssignment:", e.message);
  }

  console.log("=== 3. SpecialSubjectTeachingLog ===");
  try {
    const logs = await client.execute({
      sql: `SELECT l.*, c.className 
            FROM SpecialSubjectTeachingLog l 
            LEFT JOIN Class c ON l.classId = c.id 
            WHERE l.teacherId = ? 
            ORDER BY l.teachingDate DESC`,
      args: [teacherId]
    });
    console.log("SpecialSubjectTeachingLog:", logs.rows);
  } catch (e) {
    console.log("Error querying SpecialSubjectTeachingLog:", e.message);
  }

  console.log("=== 4. Check all tables with teacherId = hangId ===");
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  for (const t of tables.rows) {
    const cols = await client.execute(`PRAGMA table_info("${t.name}")`);
    const hasTeacherId = cols.rows.some(c => c.name === 'teacherId');
    if (hasTeacherId) {
      const count = await client.execute({
        sql: `SELECT COUNT(*) as cnt FROM "${t.name}" WHERE teacherId = ?`,
        args: [teacherId]
      });
      if (count.rows[0].cnt > 0) {
        console.log(`Table ${t.name} has ${count.rows[0].cnt} rows for Hang`);
      }
    }
  }

  console.log("=== 5. Check Notifications for Thuy or Hang ===");
  try {
    const notifs = await client.execute({
      sql: `SELECT * FROM Notification WHERE userId IN (?, ?) OR content LIKE '%Cảm xúc đến từ đâu%' OR title LIKE '%Cảm xúc đến từ đâu%' ORDER BY createdAt DESC LIMIT 10`,
      args: [userId, 'cmq0cphe30000gj8v9cioat6n'] // Thuy userId
    });
    console.log("Notifications:", notifs.rows);
  } catch (e) {
    console.log("Error querying Notification:", e.message);
  }
}

inspectHang().catch(console.error);
