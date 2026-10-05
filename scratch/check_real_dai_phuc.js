const { createClient } = require('@libsql/client');
require('dotenv').config();
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function check() {
  const r1 = await client.execute("SELECT s.*, c.className FROM Student s LEFT JOIN Class c ON s.classId = c.id WHERE s.studentName LIKE '%Đại Phúc%'");
  console.log('Students with Đại Phúc:', JSON.stringify(r1.rows, null, 2));

  const r2 = await client.execute("SELECT s.*, c.className FROM Student s LEFT JOIN Class c ON s.classId = c.id WHERE s.studentCode = '0601012381'");
  console.log('Student with code 0601012381:', JSON.stringify(r2.rows, null, 2));

  const r3 = await client.execute("SELECT * FROM InputAssessmentStudent WHERE fullName LIKE '%Đại Phúc%'");
  console.log('IAS Đại Phúc:', JSON.stringify(r3.rows, null, 2));

  if (r1.rows.length > 0) {
    const sId = r1.rows[0].id;
    const scores = await client.execute({
      sql: "SELECT sge.compositeScore, sub.subjectName, c.className FROM SubjectGradeEntry sge JOIN Subject sub ON sge.subjectId = sub.id LEFT JOIN Class c ON sge.classId = c.id WHERE sge.studentId = ? AND sge.evaluationPeriod = 'KSĐN'",
      args: [sId]
    });
    console.log('KSĐN for real Đại Phúc:', JSON.stringify(scores.rows, null, 2));
  }
}
check().catch(console.error);
