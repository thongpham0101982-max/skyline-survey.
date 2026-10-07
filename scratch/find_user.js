require('dotenv').config();
const { createClient } = require('@libsql/client');
const path = require('path');

async function main() {
  const localDbPath = path.resolve(process.cwd(), 'local.db').replace(/\\/g, '/');
  const client = createClient({ url: `file:${localDbPath}` });
  const res = await client.execute("SELECT id, email, fullName, role, status FROM User WHERE email LIKE '%P0601021437%'");
  console.log(res.rows);
}

main().catch(console.error);
