const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  const info = await client.execute(`PRAGMA table_info(SpecialTeachingAssignment)`);
  console.log("Columns:", info.rows.map(r => r.name));

  const rows = await client.execute(`SELECT * FROM SpecialTeachingAssignment WHERE teacherId = 'cmqgdj4br0002hs5x7j3eyxmc'`);
  console.log("Rows for Hang:", JSON.stringify(rows.rows, null, 2));
}
run();
