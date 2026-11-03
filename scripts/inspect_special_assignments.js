const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function inspectSpecial() {
  const teacherId = 'cmqgdj4br0002hs5x7j3eyxmc'; // Nguyễn Thị Hằng

  console.log("=== SpecialTeachingAssignment ===");
  const sta = await client.execute({
    sql: `SELECT sta.*, c.className, ss.name as specialSubjectName, ss.code as specialSubjectCode
          FROM SpecialTeachingAssignment sta
          LEFT JOIN Class c ON sta.classId = c.id
          LEFT JOIN SpecialSubject ss ON sta.specialSubjectId = ss.id
          WHERE sta.teacherId = ?`,
    args: [teacherId]
  });
  console.log("SpecialTeachingAssignment rows:", JSON.stringify(sta.rows, null, 2));

  console.log("\n=== SpecialSubjectTeachingLog / SpecialLessonLog ===");
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'Special%'");
  console.log("Special tables:", tables.rows.map(r => r.name));

  for (const t of tables.rows) {
    const res = await client.execute(`SELECT * FROM "${t.name}" WHERE json(?) IN (SELECT teacherId FROM "${t.name}") OR 1=1 LIMIT 2`, [teacherId]);
    console.log(`Sample from ${t.name}:`, res.columns);
  }
}

inspectSpecial().catch(console.error);
