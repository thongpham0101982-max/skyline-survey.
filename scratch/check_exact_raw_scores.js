const { createClient } = require('@libsql/client');
const path = require('path');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  const names = ['Nguyễn Gia Bảo', 'Phạm Gia Bảo', 'Đỗ Thành Nguyên', 'Phan Đình Phùng', 'Phan Anh Quân', 'Đoàn Ngọc Thảo Chloe'];
  for (const name of names) {
    const res = await client.execute({
      sql: `
        SELECT s.id, s.fullName, s.studentCode, s.admissionCampus, sub.name as subjectName, sub.code as subjectCode, sas.scores
        FROM InputAssessmentStudent s
        JOIN StudentAssessmentScore sas ON s.id = sas.studentId
        JOIN AssessmentSubject sub ON sas.subjectId = sub.id
        WHERE s.fullName LIKE ?
      `,
      args: [`%${name}%`]
    });
    console.log(`\n=== Student: ${name} ===`);
    res.rows.forEach(r => {
      console.log(`  Subject: ${r.subjectName} (${r.subjectCode}) -> scores: ${r.scores}`);
    });
  }
}

main().catch(console.error);
