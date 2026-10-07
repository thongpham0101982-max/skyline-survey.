require('dotenv').config();
const { createClient } = require('@libsql/client');
const path = require('path');

async function checkDb(url, token, label) {
  console.log(`\n=== CHECKING ${label}: ${url} ===`);
  try {
    const client = createClient({ url, authToken: token });
    const years = await client.execute("SELECT id, name, status FROM AcademicYear");
    console.log('Years:', years.rows);

    const gradeEntriesCount = await client.execute("SELECT count(*) as c FROM SubjectGradeEntry");
    console.log('Total SubjectGradeEntry count:', gradeEntriesCount.rows[0].c);

    if (gradeEntriesCount.rows[0].c > 0) {
      const periods = await client.execute("SELECT evaluationPeriod, count(*) as count FROM SubjectGradeEntry GROUP BY evaluationPeriod");
      console.log('Entries by period:', periods.rows);
    }

    const assignmentsCount = await client.execute("SELECT count(*) as c FROM TeachingAssignment");
    console.log('Total TeachingAssignment count:', assignmentsCount.rows[0].c);

    const classesCount = await client.execute("SELECT count(*) as c FROM Class WHERE status = 'ACTIVE'");
    console.log('Active Class count:', classesCount.rows[0].c);
  } catch (err) {
    console.error(`Error checking ${label}:`, err.message);
  }
}

async function main() {
  const localDbPath = path.resolve(process.cwd(), 'local.db').replace(/\\/g, '/');
  await checkDb(`file:${localDbPath}`, null, 'LOCAL DB');

  const tursoUrl = process.env.TURSO_DATABASE_URL ? process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://') : null;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  if (tursoUrl) {
    await checkDb(tursoUrl, tursoToken, 'TURSO CLOUD DB');
  }
}

main().catch(console.error);
