require('dotenv').config();
const { createClient } = require('@libsql/client');

const cloud = createClient({
  url: process.env.TURSO_DATABASE_URL ? process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://') : '',
  authToken: process.env.TURSO_AUTH_TOKEN
});

const local = createClient({ url: 'file:local.db' });

async function syncTable(tableName, pkey = 'id') {
  console.log(`\n--- Syncing ${tableName} from Cloud to Local ---`);
  const cCountRes = await cloud.execute(`SELECT COUNT(*) as cnt FROM ${tableName}`);
  const lCountRes = await local.execute(`SELECT COUNT(*) as cnt FROM ${tableName}`);
  console.log(`Initial counts -> Cloud: ${cCountRes.rows[0].cnt} | Local: ${lCountRes.rows[0].cnt}`);

  // Fetch all rows from cloud
  const cloudRows = await cloud.execute(`SELECT * FROM ${tableName}`);
  if (cloudRows.rows.length === 0) {
    console.log(`No rows in Cloud for ${tableName}`);
    return;
  }

  const columns = cloudRows.columns;
  console.log(`Columns in ${tableName}:`, columns.length);

  // Use INSERT OR REPLACE in batches of 50
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < cloudRows.rows.length; i += batchSize) {
    const batch = cloudRows.rows.slice(i, i + batchSize);
    for (const row of batch) {
      const colNames = columns.join(', ');
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map(col => row[col]);

      try {
        await local.execute({
          sql: `INSERT OR REPLACE INTO ${tableName} (${colNames}) VALUES (${placeholders})`,
          args: values
        });
        inserted++;
      } catch (err) {
        console.error(`Error inserting into ${tableName} [id=${row[pkey]}]:`, err.message);
      }
    }
    process.stdout.write(`\rProgress: ${inserted} / ${cloudRows.rows.length}`);
  }
  console.log(`\nFinished ${tableName}. Total synced/replaced: ${inserted}`);

  const postLCount = await local.execute(`SELECT COUNT(*) as cnt FROM ${tableName}`);
  console.log(`Post-sync Local count: ${postLCount.rows[0].cnt}`);
}

async function main() {
  await local.execute("PRAGMA foreign_keys = OFF;");
  const tables = [
    'User',
    'AcademicYear',
    'Campus',
    'Department',
    'Teacher',
    'TeacherAcademicYearTarget',
    'ObservationSlot',
    'ObservationRegistration',
    'ObservationEvaluation'
  ];

  for (const t of tables) {
    await syncTable(t);
  }
  await local.execute("PRAGMA foreign_keys = ON;");
  console.log('\n=== ALL OBSERVATION TABLES SYNCED SUCCESSFULLY ===');
}

main().catch(console.error);
