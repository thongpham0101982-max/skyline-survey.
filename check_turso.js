const { createClient } = require('@libsql/client');

const client = createClient({
  url: "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw",
});

async function check() {
  const tables = [
    'InputAssessmentPeriod',
    'InputAssessmentBatch',
    'InputAssessmentStudent',
    'AssessmentSubject',
    'AssessmentConfig',
    'InputAssessmentTeacherAssignment',
    'AcademicYear',
    'Campus',
    'EducationSystem'
  ];

  console.log('--- TURSO DB STATUS ---');
  for (const table of tables) {
    try {
      const result = await client.execute(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`${table}: ${result.rows[0].count}`);
    } catch (e) {
      console.log(`${table}: ERROR - ${e.message}`);
    }
  }
}

check();
