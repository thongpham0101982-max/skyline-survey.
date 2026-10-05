const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL.trim().replace(/^libsql:\/\//, 'https://'),
  authToken: process.env.TURSO_AUTH_TOKEN.trim()
});

async function main() {
  const res = await client.execute("SELECT id, subjectCode, subjectName, category, parentId, level, evaluationType FROM Subject WHERE subjectCode IN ('TA', 'TAV', 'TAv', 'TAvd', 'EPT', 'NLTD')");
  console.table(res.rows);
}
main().catch(console.error);
