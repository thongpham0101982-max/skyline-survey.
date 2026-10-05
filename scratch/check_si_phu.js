const { createClient } = require('@libsql/client');
require('dotenv').config();
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function check() {
  const ias = await client.execute("SELECT * FROM InputAssessmentStudent WHERE fullName LIKE '%Sĩ Phú%'");
  console.log('IAS Sĩ Phú:', JSON.stringify(ias.rows, null, 2));

  const st = await client.execute("SELECT s.*, c.className FROM Student s LEFT JOIN Class c ON s.classId = c.id WHERE s.studentName LIKE '%Sĩ Phú%'");
  console.log('Student Sĩ Phú:', JSON.stringify(st.rows, null, 2));

  if (st.rows.length > 0) {
    const grades = await client.execute({
      sql: "SELECT sge.*, sub.subjectName FROM SubjectGradeEntry sge JOIN Subject sub ON sge.subjectId = sub.id WHERE sge.studentId = ?",
      args: [st.rows[0].id]
    });
    console.log('Grades Sĩ Phú:', JSON.stringify(grades.rows, null, 2));
  }
}
check().catch(console.error);
