const { createClient } = require('@libsql/client');
const path = require('path');
const client = createClient({ url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/') });

async function main() {
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
  console.log(tables.rows.map(r => r.name).sort());
}
main().catch(console.error);
