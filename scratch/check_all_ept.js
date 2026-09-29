const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const dbFile = fs.existsSync(path.resolve(__dirname, '../local.db')) 
  ? path.resolve(__dirname, '../local.db') 
  : path.resolve(__dirname, '../dev.db');

const client = createClient({
  url: 'file:' + dbFile.replace(/\\/g, '/')
});

async function main() {
  const eptScores = await client.execute(`
    SELECT sc.*, sub.code, sub.name, st.fullName, st.grade, st.admissionCriteria, st.admissionResult, st.directorNote
    FROM StudentAssessmentScore sc
    JOIN AssessmentSubject sub ON sc.subjectId = sub.id
    JOIN InputAssessmentStudent st ON sc.studentId = st.id
    WHERE sub.code = 'EPT' OR sub.name LIKE '%EPT%'
  `);

  console.log('Total EPT scores recorded:', eptScores.rows.length);
  eptScores.rows.forEach(r => {
    console.log(`- ${r.fullName} (Khối ${r.grade}): Scores = ${r.scores} | Note = ${r.directorNote?.substring(0, 80)}`);
  });
}

main().catch(console.error);
