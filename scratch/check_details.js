const { createClient } = require('@libsql/client');
const path = require('path');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  const res = await client.execute(`
    SELECT sas.studentId, asub.name, asub.code, sas.scores, ias.fullName, ias.grade
    FROM StudentAssessmentScore sas
    JOIN AssessmentSubject asub ON sas.subjectId = asub.id
    JOIN InputAssessmentStudent ias ON sas.studentId = ias.id
    WHERE ias.fullName LIKE '%Phan Đình Phùng%' OR ias.fullName LIKE '%Gia Bảo%'
  `);
  console.log('Scores for Phan Đình Phùng & Gia Bảo:', res.rows);
}

main().catch(console.error);
