const { createClient } = require('@libsql/client');
const path = require('path');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  const subjects = await client.execute("SELECT * FROM AssessmentSubject");
  console.log('AssessmentSubject records:', subjects.rows);

  const matched = await client.execute(`
    SELECT sas.studentId, sas.subjectId, sas.scores, asub.name, asub.code, ias.fullName, ias.grade
    FROM StudentAssessmentScore sas
    JOIN AssessmentSubject asub ON sas.subjectId = asub.id
    JOIN InputAssessmentStudent ias ON sas.studentId = ias.id
    LIMIT 10
  `);
  console.log('Matched entrance assessment scores:', matched.rows);
}

main().catch(console.error);
