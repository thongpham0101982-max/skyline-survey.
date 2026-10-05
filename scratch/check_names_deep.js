const { createClient } = require('@libsql/client');
const path = require('path');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  const names = ['Lê Bảo Trâm', 'Trần Minh Huy', 'Nguyễn Ngọc Minh', 'Phú', 'Anh Minh'];
  for (const n of names) {
    const r = await client.execute({
      sql: `SELECT sge.compositeScore, s.subjectName, st.studentName, st.studentCode, c.className 
            FROM SubjectGradeEntry sge 
            JOIN Subject s ON sge.subjectId=s.id 
            JOIN Student st ON sge.studentId=st.id 
            JOIN Class c ON sge.classId=c.id 
            WHERE LOWER(st.studentName) LIKE ? AND sge.evaluationPeriod='KSĐN'`,
      args: [`%${n.toLowerCase()}%`]
    });
    console.log(`=== ${n} (${r.rows.length} rows) ===`);
    r.rows.forEach(row => console.log(`   ${row.studentName} (${row.className}, ${row.studentCode}): ${row.subjectName} = ${row.compositeScore}`));
  }
}

main().catch(console.error);
