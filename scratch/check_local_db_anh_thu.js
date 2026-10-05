const { createClient } = require('@libsql/client');
const path = require('path');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  const res = await client.execute({
    sql: `SELECT id, periodId, batchId, studentCode, fullName, admissionCampus, grade, className, 
                 mathScore, writtenEnglishScore, oralEnglishScore, literatureScore, psychologyScore,
                 admissionCriteria, admissionResult, directorNote, isAbsent, createdAt
          FROM InputAssessmentStudent 
          WHERE fullName LIKE '%Anh Thư%' OR studentCode = 'HS202'`,
    args: []
  });

  console.log('Total matches found:', res.rows.length);
  for (const r of res.rows) {
    console.log('----------------------------------------------------');
    console.log('ID:', r.id, 'Code:', r.studentCode, 'Name:', r.fullName, 'Campus:', r.admissionCampus, 'Grade:', r.grade);
    console.log('PeriodId:', r.periodId, 'BatchId:', r.batchId, 'Created:', r.createdAt);
    console.log('Criteria:', r.admissionCriteria, 'Result:', r.admissionResult);
    console.log('Direct Scores: Math:', r.mathScore, 'Lit:', r.literatureScore, 'EngW:', r.writtenEnglishScore, 'EngO:', r.oralEnglishScore, 'Psy:', r.psychologyScore);
    console.log('Director Note:', r.directorNote);

    const sas = await client.execute({
      sql: `SELECT sub.code, sub.name, sas.scores 
            FROM StudentAssessmentScore sas 
            JOIN AssessmentSubject sub ON sas.subjectId = sub.id 
            WHERE sas.studentId = ?`,
      args: [r.id]
    });
    console.log('SAS scores:');
    sas.rows.forEach(s => {
      console.log('  Subject:', s.code, s.name, 'Scores:', s.scores);
    });
  }
}

main().catch(console.error);
