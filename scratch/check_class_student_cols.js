const { createClient } = require('@libsql/client');
const path = require('path');
const client = createClient({ url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/') });

async function main() {
  const cInfo = await client.execute("PRAGMA table_info(Class)");
  console.log("Class columns:", cInfo.rows.map(r => r.name));

  const sInfo = await client.execute("PRAGMA table_info(Student)");
  console.log("Student columns:", sInfo.rows.map(r => r.name));
}
main().catch(console.error);
