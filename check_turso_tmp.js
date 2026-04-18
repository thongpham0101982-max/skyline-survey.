const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function check() {
  const tables = [
    'InputAssessmentPeriod',
    'InputAssessmentBatch',
    'InputAssessmentStudent',
    'AssessmentSubject',
    'AssessmentConfig',
    'InputAssessmentTeacherAssignment'
  ];

  console.log('--- TURSO DB STATUS ---');
  for (const table of tables) {
    try {
      const result = await client.execute(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`${table}: ${result.rows[0].count}`);
    } catch (e) {
      console.log(`${table}: ERROR (might not exist or empty)`);
    }
  }
}

check();
