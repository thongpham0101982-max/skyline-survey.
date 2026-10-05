const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  console.log('--- 1. CÁC KỲ ĐÁNH GIÁ TRONG SubjectGradeEntry ---');
  const sgePeriods = await client.execute({
    sql: `SELECT evaluationPeriod, academicYearId, COUNT(*) as cnt FROM SubjectGradeEntry GROUP BY evaluationPeriod, academicYearId`,
    args: []
  });
  console.log('SubjectGradeEntry periods:', sgePeriods.rows);

  console.log('\n--- 2. MẪU DỮ LIỆU SubjectGradeEntry (5 dòng) ---');
  const sgeSamples = await client.execute({
    sql: `SELECT sge.*, s.studentCode, s.studentName, sub.subjectName, c.className 
          FROM SubjectGradeEntry sge 
          JOIN Student s ON sge.studentId = s.id 
          JOIN Subject sub ON sge.subjectId = sub.id 
          JOIN Class c ON sge.classId = c.id 
          LIMIT 5`,
    args: []
  });
  console.log('SubjectGradeEntry samples:', sgeSamples.rows);

  console.log('\n--- 3. CÁC HỌC KỲ TRONG StudentTermScore ---');
  const stsSemesters = await client.execute({
    sql: `SELECT semester, COUNT(*) as cnt FROM StudentTermScore GROUP BY semester`,
    args: []
  });
  console.log('StudentTermScore semesters:', stsSemesters.rows);

  console.log('\n--- 4. MẪU DỮ LIỆU StudentTermScore (5 dòng) ---');
  const stsSamples = await client.execute({
    sql: `SELECT sts.*, s.studentCode, s.studentName, sub.subjectName, c.className 
          FROM StudentTermScore sts 
          JOIN Student s ON sts.studentId = s.id 
          JOIN Subject sub ON sts.subjectId = sub.id 
          JOIN Class c ON s.classId = c.id 
          LIMIT 5`,
    args: []
  });
  console.log('StudentTermScore samples:', stsSamples.rows);

  console.log('\n--- 5. KIỂM TRA ĐIỂM CỦA HỌC SINH Huỳnh Gia Bảo Linh TRONG MỌI BẢNG ---');
  const stsLinh = await client.execute({
    sql: `SELECT sts.semester, sub.subjectName, sts.score, sts.evaluationGrade 
          FROM StudentTermScore sts 
          JOIN Student s ON sts.studentId = s.id 
          JOIN Subject sub ON sts.subjectId = sub.id 
          WHERE s.studentCode = '0602040006' OR s.studentName LIKE '%Bảo Linh%'`,
    args: []
  });
  console.log('Điểm StudentTermScore của Bảo Linh:', stsLinh.rows);

  const sgeLinh = await client.execute({
    sql: `SELECT sge.evaluationPeriod, sub.subjectName, sge.compositeScore, sge.componentScores 
          FROM SubjectGradeEntry sge 
          JOIN Student s ON sge.studentId = s.id 
          JOIN Subject sub ON sge.subjectId = sub.id 
          WHERE s.studentCode = '0602040006' OR s.studentName LIKE '%Bảo Linh%'`,
    args: []
  });
  console.log('Điểm SubjectGradeEntry của Bảo Linh:', sgeLinh.rows);
}

main().catch(console.error);
