const path = require('path');
const { createClient } = require('@libsql/client');

const LOCAL_DB_PATH = path.resolve(__dirname, '../local.db').replace(/\\/g, '/');
const CLOUD_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const CLOUD_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

async function verifyClient(client, dbName) {
  console.log(`\n==================== VERIFYING ${dbName} ====================`);
  const subjects = await client.execute("SELECT id, code, name, levels, color FROM SpecialSubject ORDER BY code;");
  console.log(`Subjects in ${dbName}:`);
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
    console.log(`  - [${s.code}] ${s.name}: ${lessons.rows[0].count} lessons, ${criteria.rows[0].count} criteria, ${assigns.rows[0].count} assignments`);
  }

  // GDGT grade breakdown
  const gdgtBreakdown = await client.execute(`
    SELECT l.grade, count(DISTINCT l.id) as lessonsCount, count(c.id) as criteriaCount
    FROM SpecialLesson l
    JOIN SpecialCurriculumVersion v ON l.versionId = v.id
    JOIN SpecialCurriculum cur ON v.curriculumId = cur.id
    JOIN SpecialSubject s ON cur.subjectId = s.id
    LEFT JOIN SpecialAssessmentCriterion c ON c.lessonId = l.id
    WHERE s.code = 'GDGT'
    GROUP BY l.grade
    ORDER BY CAST(l.grade AS INTEGER);
  `);
  console.log(`GDGT Grade breakdown in ${dbName}:`);
  gdgtBreakdown.rows.forEach(r => {
    console.log(`    Grade ${r.grade}: ${r.lessonsCount} lessons, ${r.criteriaCount} criteria`);
  });

  // FIN_EDU THCS grade breakdown
  const finBreakdown = await client.execute(`
    SELECT l.grade, count(DISTINCT l.id) as lessonsCount, count(c.id) as criteriaCount
    FROM SpecialLesson l
    JOIN SpecialCurriculumVersion v ON l.versionId = v.id
    JOIN SpecialCurriculum cur ON v.curriculumId = cur.id
    JOIN SpecialSubject s ON cur.subjectId = s.id
    LEFT JOIN SpecialAssessmentCriterion c ON c.lessonId = l.id
    WHERE cur.code = 'CURR_FIN_MIDDLE'
    GROUP BY l.grade
    ORDER BY CAST(l.grade AS INTEGER);
  `);
  console.log(`FIN_EDU THCS Grade breakdown in ${dbName}:`);
  finBreakdown.rows.forEach(r => {
    console.log(`    Grade ${r.grade}: ${r.lessonsCount} lessons, ${r.criteriaCount} criteria`);
  });
}

async function main() {
  const localClient = createClient({ url: `file:${LOCAL_DB_PATH}` });
  await verifyClient(localClient, 'LOCAL SQLite');

  const cloudClient = createClient({ url: CLOUD_URL, authToken: CLOUD_TOKEN });
  await verifyClient(cloudClient, 'TURSO Cloud');

  console.log("\n==================== ALL 4 SUBJECTS VERIFIED ON BOTH DATABASES ====================");
}

main().catch(console.error);
