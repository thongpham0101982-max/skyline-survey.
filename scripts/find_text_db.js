const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function findText() {
  try {
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    console.log(`Checking ${tables.rows.length} tables...`);
    
    for (const row of tables.rows) {
      const tableName = row.name;
      const cols = await client.execute(`PRAGMA table_info("${tableName}")`);
      const textCols = cols.rows.filter(c => c.type === 'TEXT').map(c => `"${c.name}"`);
      if (textCols.length === 0) continue;

      const whereClauses = textCols.map(c => `${c} LIKE '%Cảm xúc đến từ đâu%'`).join(" OR ");
      const q = `SELECT * FROM "${tableName}" WHERE ${whereClauses}`;
      try {
        const res = await client.execute(q);
        if (res.rows.length > 0) {
          console.log(`Found in table [${tableName}]:`, JSON.stringify(res.rows, null, 2));
        }
      } catch (e) {
        // ignore
      }
    }
  } catch (err) {
    console.error(err);
  }
}
findText();
