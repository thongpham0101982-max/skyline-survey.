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
  const checkList = ['Lê Đình Sĩ Phú', 'Mai Minh Minh', 'Nguyễn Bình Phương An', 'An Khôi', 'Đỗ An Nhiên'];

  for (const name of checkList) {
    console.log(`\n================= CHECK: ${name} =================`);
    // Search in InputAssessmentStudent
    const cands = await client.execute(`SELECT * FROM InputAssessmentStudent WHERE fullName LIKE '%${name}%'`);
    console.log('InputAssessmentStudent matches:', cands.rows.length);
    for (const c of cands.rows) {
      console.log(`- Cand: ${c.fullName} | Code: ${c.studentCode || c.enrollmentCode} | Grade: ${c.grade} | Status: ${c.enrollmentStatus}`);
      const scores = await client.execute(`SELECT sc.*, sub.code, sub.name FROM StudentAssessmentScore sc JOIN AssessmentSubject sub ON sc.subjectId = sub.id WHERE sc.studentId = '${c.id}'`);
      console.log('  Scores in StudentAssessmentScore:');
      scores.rows.forEach(s => console.log(`    * ${s.code} (${s.name}): ${s.scores}`));
    }

    // Search in Student
    const students = await client.execute(`SELECT s.*, c.className FROM Student s LEFT JOIN Class c ON s.classId = c.id WHERE s.studentName LIKE '%${name}%'`);
    console.log('Student matches in system:', students.rows.length);
    for (const s of students.rows) {
      console.log(`- Student: ${s.studentName} | Code: ${s.studentCode} | Class: ${s.className}`);
      const grades = await client.execute(`SELECT ge.*, sub.subjectCode, sub.subjectName FROM SubjectGradeEntry ge JOIN Subject sub ON ge.subjectId = sub.id WHERE ge.studentId = '${s.id}' AND ge.evaluationPeriod = 'KSĐN'`);
      console.log('  KSĐN Grades in SubjectGradeEntry:');
      grades.rows.forEach(g => console.log(`    * ${g.subjectCode} (${g.subjectName}): ${g.compositeScore}`));
    }
  }
}

main().catch(console.error);
