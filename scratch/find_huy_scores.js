const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const dbFile = fs.existsSync(path.resolve(__dirname, '../local.db')) 
  ? path.resolve(__dirname, '../local.db') 
  : path.resolve(__dirname, '../dev.db');

const client = createClient({
  url: 'file:' + dbFile.replace(/\\/g, '/')
});

async function main() {
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%Score%' OR name LIKE '%Assessment%' OR name LIKE '%Grade%')");
  console.log('Tables:', tables.rows.map(r => r.name));

  // Kiểm tra điểm của học sinh này trong các bảng
  for (const t of tables.rows) {
    try {
      const q = await client.execute(`SELECT * FROM ${t.name} WHERE studentId = 'cmt6l475w0002gzo197zwrv2b' OR studentId = 'cmt3v8xoh000395s06zusjdg7' LIMIT 5`);
      if (q.rows.length > 0) {
        console.log(`Table ${t.name}:`, JSON.stringify(q.rows, null, 2));
      }
    } catch {}
  }

  // Tìm trong Student / GradeEntry cho học sinh này
  const st = await client.execute("SELECT * FROM Student WHERE studentCode = '0601051052' OR studentName LIKE '%Trần Minh Huy%'");
  console.log('Student in Student table:', st.rows);
  if (st.rows.length > 0) {
    const sId = st.rows[0].id;
    const entries = await client.execute(`SELECT * FROM GradeEntry WHERE studentId = '${sId}'`);
    console.log('GradeEntry for Trần Minh Huy:', entries.rows);
  }
}

main().catch(console.error);
