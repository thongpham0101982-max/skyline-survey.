const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config();

const url = process.env.TURSO_DATABASE_URL || ('file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/'));
const authToken = process.env.TURSO_AUTH_TOKEN;
const client = createClient({ url, authToken });

async function run() {
  const res = await client.execute(`
    SELECT s.grade, s.studentCode, s.fullName, sub.name as subName, sub.code as subCode, sas.scores, sas.comments
    FROM StudentAssessmentScore sas
    JOIN InputAssessmentStudent s ON sas.studentId = s.id
    JOIN AssessmentSubject sub ON sas.subjectId = sub.id
    WHERE sub.name LIKE '%Anh%' OR sub.code LIKE '%TAv%' OR sub.code LIKE '%EPT%'
    LIMIT 100
  `);
  console.log('Sample English Scores count:', res.rows.length);
  const byGrade = {};
  for (const r of res.rows) {
    const g = r.grade || 'Unknown';
    if (!byGrade[g]) byGrade[g] = [];
    byGrade[g].push(r);
  }
  for (const [g, rows] of Object.entries(byGrade)) {
    console.log(`\n=== GRADE ${g} (${rows.length} records) ===`);
    rows.slice(0, 5).forEach(r => {
      console.log(`  ${r.studentCode} (${r.fullName}): ${r.subName} (${r.subCode}) -> ${r.scores} | cmt: ${(r.comments || '').slice(0, 40)}`);
    });
  }
}
run().catch(console.error);
