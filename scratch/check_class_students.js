const { createClient } = require('@libsql/client');
require('dotenv').config();
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function check() {
  const cls = await client.execute({
    sql: "SELECT * FROM Class WHERE id = ?",
    args: ['cmrekxm53002fhy95q1b5mqpz']
  });
  console.log('Class:', cls.rows);

  const st = await client.execute({
    sql: "SELECT * FROM Student WHERE classId = ?",
    args: ['cmrekxm53002fhy95q1b5mqpz']
  });
  console.log('Students in this class:', st.rows.map(r => `${r.studentName} (${r.studentCode})`));
}
check().catch(console.error);
