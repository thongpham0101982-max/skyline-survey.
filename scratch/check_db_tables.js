const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN || ""
});

async function main() {
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log('Tables in Turso:');
  tables.rows.forEach(r => console.log(' -', r.name));
}

main().catch(console.error);
