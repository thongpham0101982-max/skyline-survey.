const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config();

const url = process.env.TURSO_DATABASE_URL || ('file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/'));
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function run() {
  const st = await client.execute("SELECT * FROM InputAssessmentStudent WHERE studentCode = 'HS105' OR fullName LIKE '%Lê Nguyên Khang%'");
  console.log('Student count:', st.rows.length);
  for (const s of st.rows) {
    console.log('Student:', { id: s.id, code: s.studentCode, name: s.fullName, grade: s.grade, className: s.className, oralEnglishScore: s.oralEnglishScore, writtenEnglishScore: s.writtenEnglishScore, totalEnglishScore: s.totalEnglishScore });
    const scores = await client.execute({ sql: "SELECT sas.*, sub.name as subName, sub.code as subCode, sub.columnNames as subColumnNames FROM StudentAssessmentScore sas LEFT JOIN AssessmentSubject sub ON sas.subjectId = sub.id WHERE sas.studentId = ?", args: [s.id] });
    console.log('Scores:');
    scores.rows.forEach(r => {
      console.log(' - Subject:', r.subName, 'Code:', r.subCode, 'Scores:', r.scores, 'Comments:', r.comments);
    });
  }

  const subs = await client.execute("SELECT id, code, name, scoreColumns, columnNames FROM AssessmentSubject WHERE name LIKE '%Anh%' OR code LIKE '%ENG%' OR code LIKE '%EPT%' OR code LIKE '%TAV%'");
  console.log('\nEnglish AssessmentSubjects:');
  subs.rows.forEach(r => console.log(' ', r.id, r.code, r.name, 'columnNames:', r.columnNames));
}
run().catch(console.error);
