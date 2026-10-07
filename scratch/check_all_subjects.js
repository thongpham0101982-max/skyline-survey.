const { createClient } = require('@libsql/client');
const path = require('path');

async function main() {
  const localDbPath = path.resolve(__dirname, '../local.db').replace(/\\/g, '/');
  const client = createClient({ url: 'file:' + localDbPath });
  const subs = await client.execute('SELECT id, code, name, subjectType, sortOrder, status FROM AssessmentSubject ORDER BY sortOrder ASC');
  console.log('Total Assessment Subjects:', subs.rows.length);
  for (const s of subs.rows) {
    console.log(`- Code: ${s.code} | Name: ${s.name} | Type: ${s.subjectType || 'N/A'}`);
  }
}

main().catch(console.error);
