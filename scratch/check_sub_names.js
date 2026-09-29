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
  const sub1 = await client.execute("SELECT * FROM AssessmentSubject WHERE id = 'cmnsc2g1z00029n1akpi8v2bj' OR id = 'cmnsd5o3q003c14k5yaxusq9d'");
  console.log('AssessmentSubjects:', sub1.rows);

  const sub2 = await client.execute("SELECT * FROM Subject WHERE id = 'cmnsc2g1z00029n1akpi8v2bj' OR id = 'cmnsd5o3q003c14k5yaxusq9d'");
  console.log('Subjects:', sub2.rows);

  // Xem điểm khảo sát đầu năm (KSDN) của em này
  const sId = 'cmt6m44rm0002y3y9afjga987';
  const gradeEntries = await client.execute(`SELECT * FROM SubjectGradeEntry WHERE studentId = '${sId}'`);
  console.log('SubjectGradeEntry for Trần Minh Huy:', gradeEntries.rows);
}

main().catch(console.error);
