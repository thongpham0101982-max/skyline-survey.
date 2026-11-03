const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function checkAudit() {
  const info = await client.execute(`PRAGMA table_info(AuditLog)`);
  console.log("AuditLog columns:", info.rows.map(r => r.name));

  const logs = await client.execute(`
    SELECT * FROM AuditLog 
    WHERE targetTable LIKE '%Observation%' OR action LIKE '%OBSERVATION%'
    ORDER BY createdAt DESC LIMIT 30
  `);
  console.log("AuditLogs count:", logs.rows.length);
  logs.rows.forEach(r => {
    console.log(r);
  });
}
checkAudit().catch(console.error);
