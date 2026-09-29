const { createClient } = require('@libsql/client');
const path = require('path');
const client = createClient({ url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/') });

async function main() {
  const res = await client.execute(`
    SELECT sge.compositeScore, s.subjectName, c.className, c.grade, st.studentName 
    FROM SubjectGradeEntry sge 
    JOIN Class c ON sge.classId = c.id 
    JOIN Subject s ON sge.subjectId = s.id 
    JOIN Student st ON sge.studentId = st.id 
    WHERE st.studentName IN ('Lê Gia Lân', 'Đào Trần Thảo Linh', 'Ngô Thục Đan', 'Lê Hồ Duy Khang', 'Phan Hải Đăng', 'Nguyễn Thanh Phúc', 'ĐỖ NGUYỄN AN KHÔI')
  `);
  console.log('Found records in SubjectGradeEntry:', res.rows.length);
  res.rows.forEach(r => console.log(r));
}
main().catch(console.error);
