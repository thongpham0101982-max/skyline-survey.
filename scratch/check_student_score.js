require('dotenv').config();
const { createClient } = require('@libsql/client');
const client = createClient({
  url: process.env.TURSO_DATABASE_URL ? process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://') : '',
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  // Find student Le Nguyen Khang
  const student = await client.execute(`
    SELECT s.id, s.studentCode, s.studentName, s.grade, s.classId, s.academicYearId
    FROM Student s
    WHERE s.studentName LIKE '%Lê Nguyên Khang%' OR s.studentCode LIKE '%105%'
  `);
  console.log("Student:", student.rows);

  if (student.rows.length > 0) {
    const sId = student.rows[0].id;
    // Check all ExamResult / InputAssessment / StudentAssessment for this student
    const tables = ['InputAssessmentScore', 'ExamResult', 'StudentScore', 'InputAssessmentStudent'];
    for (const t of tables) {
      try {
        const res = await client.execute(`SELECT * FROM ${t} WHERE studentId = '${sId}' LIMIT 5`);
        console.log(`Found in ${t}:`, res.rows.length);
        if (res.rows.length > 0) console.log(res.rows);
      } catch (e) {
        // Table might not exist
      }
    }

    // Let's check schema for assessment scores
    const scores = await client.execute(`
      SELECT sc.*, sub.name as subName, sub.code as subCode
      FROM StudentAssessmentScore sc
      LEFT JOIN AssessmentSubject sub ON sc.subjectId = sub.id
      WHERE sc.studentId = '${sId}'
    `);
    console.log("StudentAssessmentScores:", scores.rows);
  }
}

main().catch(console.error);
