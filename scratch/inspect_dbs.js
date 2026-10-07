const { createClient } = require('@libsql/client');
const path = require('path');

const TURSO_URL = "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";
const defaultLocalDbPath = path.resolve(process.cwd(), 'local.db').replace(/\\/g, '/');

async function run() {
  const cloudClient = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  const localClient = createClient({ url: `file:${defaultLocalDbPath}` });

  console.log('--- Checking Cloud DB ---');
  try {
    const res = await cloudClient.execute('SELECT * FROM InputAssessmentGradeConfig LIMIT 50;');
    console.log(`Cloud DB has ${res.rows.length} grade configs.`);
    if (res.rows.length > 0) {
      console.log('Sample rows:', res.rows.slice(0, 3));
    }
  } catch (e) {
    console.error('Cloud DB query error:', e.message);
  }

  console.log('\n--- Checking Local DB ---');
  try {
    const res = await localClient.execute('SELECT * FROM InputAssessmentGradeConfig LIMIT 50;');
    console.log(`Local DB has ${res.rows.length} grade configs.`);
  } catch (e) {
    console.error('Local DB query error:', e.message);
  }
}

run().catch(console.error);
