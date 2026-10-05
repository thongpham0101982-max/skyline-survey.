const { createClient } = require('@libsql/client');
require('dotenv').config();
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function check() {
  const res = await client.execute(`
    SELECT st.id, st.studentCode, st.studentName, c.className, sge.compositeScore, sge.updatedAt, s.subjectName
    FROM Student st
    LEFT JOIN SubjectGradeEntry sge ON sge.studentId = st.id AND sge.evaluationPeriod = 'KSĐN'
    LEFT JOIN Subject s ON sge.subjectId = s.id
    LEFT JOIN Class c ON sge.classId = c.id
    WHERE st.studentName LIKE '%Võ Hoàng Vi%' OR st.studentCode IN ('0602040522', '0602040627')
  `);
  console.log(JSON.stringify(res.rows, null, 2));
}
check().catch(console.error);
