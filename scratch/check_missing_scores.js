const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const dbFile = fs.existsSync(path.resolve(__dirname, '../local.db')) 
  ? path.resolve(__dirname, '../local.db') 
  : path.resolve(__dirname, '../dev.db');

const client = createClient({
  url: 'file:' + dbFile.replace(/\\/g, '/')
});

async function main() {
  console.log('--- KIỂM TRA MỘT SỐ HỌC SINH ĐIỂN HÌNH BỊ DẤU - TRÊN ẢNH ---');

  const names = [
    'Phan Đình Phùng',
    'Phạm Thùy Gia Hân',
    'Phạm Gia Hương',
    'Lê Khánh Hà',
    'Nguyễn Thị Thu Thủy',
    'Mai Minh Minh',
    'Nguyễn Bình Phương An',
    'LÊ ĐÌNH SĨ PHÚ',
    'Đỗ An Nhiên',
    'Đỗ Nguyễn An Khôi',
    'Hà Đặng Phước Huy'
  ];

  for (const name of names) {
    console.log(`\n=================== ${name} ===================`);
    
    // 1. Kiểm tra trong InputAssessmentStudent (KSĐV)
    const cand = await client.execute(`
      SELECT *
      FROM InputAssessmentStudent
      WHERE fullName LIKE '%${name}%'
    `);
    console.log('KSĐV (InputAssessmentStudent):', cand.rows);

    // Điểm chi tiết từ StudentAssessmentScore
    if (cand.rows.length > 0) {
      const candIds = cand.rows.map(r => `'${r.id}'`).join(',');
      const scores = await client.execute(`
        SELECT sc.*, sub.code as subCode, sub.name as subName
        FROM StudentAssessmentScore sc
        JOIN AssessmentSubject sub ON sc.subjectId = sub.id
        WHERE sc.studentId IN (${candIds})
      `);
      console.log('StudentAssessmentScore for candidate:', scores.rows.map(s => ({
        subCode: s.subCode,
        subName: s.subName,
        scores: s.scores,
        comments: s.comments?.substring(0, 50)
      })));
    }

    // 2. Kiểm tra trong Student & SubjectGradeEntry (KSĐN)
    const st = await client.execute(`
      SELECT id, studentCode, studentName, classId
      FROM Student
      WHERE studentName LIKE '%${name}%'
    `);
    console.log('Student record in class:', st.rows);

    if (st.rows.length > 0) {
      const sId = st.rows[0].id;
      const grades = await client.execute(`
        SELECT ge.*, sub.subjectCode, sub.subjectName
        FROM SubjectGradeEntry ge
        JOIN Subject sub ON ge.subjectId = sub.id
        WHERE ge.studentId = '${sId}' AND ge.evaluationPeriod = 'KSĐN'
      `);
      console.log('KSĐN (SubjectGradeEntry):', grades.rows.map(g => ({
        subCode: g.subjectCode,
        subName: g.subjectName,
        compositeScore: g.compositeScore,
        componentScores: g.componentScores
      })));
    }
  }
}

main().catch(console.error);
