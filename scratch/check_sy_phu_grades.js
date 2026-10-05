const { createClient } = require('@libsql/client');
require('dotenv').config();
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function check() {
  const grades = await client.execute(
    "SELECT sge.compositeScore, sub.subjectName, c.className FROM SubjectGradeEntry sge JOIN Student s ON sge.studentId = s.id JOIN Subject sub ON sge.subjectId = sub.id LEFT JOIN Class c ON sge.classId = c.id WHERE s.studentCode = '0601012380' AND sge.evaluationPeriod = 'KSĐN'"
  );
  console.log('Grades for Lê Đình Sỹ Phú (0601012380):', grades.rows);
}
check().catch(console.error);
