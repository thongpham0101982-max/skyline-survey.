const path = require('path');
const { createClient } = require('@libsql/client');

const LOCAL_DB_PATH = path.resolve(__dirname, '../local.db').replace(/\\/g, '/');
const CLOUD_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const CLOUD_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

async function verifyClient(client, label) {
  console.log(`\n=== VERIFYING ${label} ===`);
  const subjects = await client.execute('SELECT id, code, name FROM SpecialSubject;');
  console.log('Subjects found:', subjects.rows);

  for (const s of subjects.rows) {
    const lessons = await client.execute({
      sql: `SELECT count(*) as count FROM SpecialLesson l 
            JOIN SpecialCurriculumVersion v ON l.versionId = v.id 
            JOIN SpecialCurriculum c ON v.curriculumId = c.id 
            WHERE c.subjectId = ?;`,
      args: [s.id]
    });
    const criteria = await client.execute({
      sql: `SELECT count(*) as count FROM SpecialAssessmentCriterion cr 
            JOIN SpecialLesson l ON cr.lessonId = l.id 
            JOIN SpecialCurriculumVersion v ON l.versionId = v.id 
            JOIN SpecialCurriculum c ON v.curriculumId = c.id 
            WHERE c.subjectId = ?;`,
      args: [s.id]
    });
    const assigns = await client.execute({
      sql: `SELECT count(*) as count FROM SpecialTeachingAssignment WHERE subjectId = ?;`,
      args: [s.id]
    });
    console.log(`- [${s.code}] ${s.name}: ${lessons.rows[0].count} lessons, ${criteria.rows[0].count} criteria, ${assigns.rows[0].count} assignments`);
  }
}

async function main() {
  const localClient = createClient({ url: `file:${LOCAL_DB_PATH}` });
  await verifyClient(localClient, 'LOCAL SQLite');

  const cloudClient = createClient({ url: CLOUD_URL, authToken: CLOUD_TOKEN });
  await verifyClient(cloudClient, 'TURSO Cloud');
}

main().catch(console.error);
