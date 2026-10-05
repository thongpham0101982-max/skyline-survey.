const { createClient } = require('@libsql/client');
require('dotenv').config();
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function check() {
  const names = ['Sĩ Phú', 'Gia Bảo', 'Minh Anh', 'Anh Thư', 'Kiều Anh'];
  for (const name of names) {
    console.log(`\n=== SEARCHING FOR: ${name} ===`);
    const stRes = await client.execute({
      sql: `SELECT s.id, s.studentCode, s.studentName, c.className, c.grade, cmp.campusCode
            FROM Student s
            LEFT JOIN Class c ON s.classId = c.id
            LEFT JOIN Campus cmp ON c.campusId = cmp.id
            WHERE s.studentName LIKE ?`,
      args: [`%${name}%`]
    });
    console.log('Students in DB:', JSON.stringify(stRes.rows, null, 2));

    for (const st of stRes.rows) {
      const grades = await client.execute({
        sql: `SELECT sge.compositeScore, sub.subjectName, c.className
              FROM SubjectGradeEntry sge
              JOIN Subject sub ON sge.subjectId = sub.id
              LEFT JOIN Class c ON sge.classId = c.id
              WHERE sge.studentId = ? AND sge.evaluationPeriod = 'KSĐN'`,
        args: [st.id]
      });
      console.log(`Grades for ${st.studentName} (${st.studentCode}, ${st.className}):`, JSON.stringify(grades.rows, null, 2));
    }
  }
}

check().catch(console.error);
