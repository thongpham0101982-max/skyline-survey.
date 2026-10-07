const { createClient } = require('@libsql/client');

async function main() {
  const c = createClient({ url: 'file:local.db' });
  const subjects = await c.execute("SELECT id, subjectCode, subjectName FROM Subject WHERE status = 'ACTIVE' ORDER BY subjectName ASC");
  console.log(`Found ${subjects.rows.length} subjects:`);
  subjects.rows.forEach(s => console.log(`- [${s.id}] ${s.subjectCode}: ${s.subjectName}`));
}

main().catch(console.error);
