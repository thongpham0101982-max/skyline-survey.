const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function run() {
  const res = await client.execute(`
    SELECT sge.id, sge.studentId, sge.subjectId, sge.compositeScore, sge.createdAt, sge.updatedAt,
           s.subjectName, st.studentCode, st.studentName, c.className
    FROM SubjectGradeEntry sge
    JOIN Subject s ON sge.subjectId = s.id
    JOIN Student st ON sge.studentId = st.id
    JOIN Class c ON sge.classId = c.id
    WHERE sge.evaluationPeriod = 'KSĐN'
    ORDER BY sge.updatedAt DESC
    LIMIT 20
  `);
  console.log('Latest 20 KSĐN updated rows:');
  console.log(JSON.stringify(res.rows, null, 2));
}
run().catch(console.error);
