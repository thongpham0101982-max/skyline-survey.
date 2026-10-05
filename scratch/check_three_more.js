const { createClient } = require('@libsql/client');
require('dotenv').config();
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function check() {
  // 1. Phạm Gia Bảo in Grade 9 CS1
  console.log('=== PHẠM GIA BẢO ===');
  const pgb = await client.execute(
    "SELECT s.id, s.studentCode, s.studentName, c.className, c.grade FROM Student s JOIN Class c ON s.classId = c.id WHERE s.studentName LIKE '%Gia Bảo%' AND c.grade = '9'"
  );
  console.log('Students:', pgb.rows);
  for (const s of pgb.rows) {
    const g = await client.execute({
      sql: "SELECT sge.compositeScore, sub.subjectName, c.className FROM SubjectGradeEntry sge JOIN Subject sub ON sge.subjectId = sub.id LEFT JOIN Class c ON sge.classId = c.id WHERE sge.studentId = ? AND sge.evaluationPeriod = 'KSĐN'",
      args: [s.id]
    });
    console.log(`Grades for ${s.studentName} (${s.className}):`, g.rows);
  }

  // 2. Nguyễn Minh Anh in Grade 6 CS5
  console.log('\n=== NGUYỄN MINH ANH ===');
  const nma = await client.execute(
    "SELECT s.id, s.studentCode, s.studentName, c.className, c.grade, cmp.campusCode FROM Student s JOIN Class c ON s.classId = c.id JOIN Campus cmp ON c.campusId = cmp.id WHERE s.studentName LIKE '%Minh Anh%' AND c.grade = '6'"
  );
  console.log('Students:', nma.rows);
  for (const s of nma.rows) {
    const g = await client.execute({
      sql: "SELECT sge.compositeScore, sub.subjectName, c.className FROM SubjectGradeEntry sge JOIN Subject sub ON sge.subjectId = sub.id LEFT JOIN Class c ON sge.classId = c.id WHERE sge.studentId = ? AND sge.evaluationPeriod = 'KSĐN'",
      args: [s.id]
    });
    console.log(`Grades for ${s.studentName} (${s.className}):`, g.rows);
  }

  // 3. Phạm Kiều Anh in Grade 6 CS4
  console.log('\n=== PHẠM KIỀU ANH ===');
  const pkaIas = await client.execute(
    "SELECT * FROM InputAssessmentStudent WHERE fullName LIKE '%Kiều Anh%'"
  );
  console.log('IAS:', pkaIas.rows);
  if (pkaIas.rows.length > 0) {
    const sas = await client.execute({
      sql: "SELECT sas.*, sub.name as subName, sub.code as subCode FROM StudentAssessmentScore sas JOIN AssessmentSubject sub ON sas.subjectId = sub.id WHERE sas.studentId = ?",
      args: [pkaIas.rows[0].id]
    });
    console.log('SAS:', sas.rows);
  }
}

check().catch(console.error);
