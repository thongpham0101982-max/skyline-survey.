const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN || ""
});

async function main() {
  const exams = await client.execute("SELECT id, name, code, academicYearId FROM Exam LIMIT 20");
  console.log('Exams:');
  exams.rows.forEach(e => console.log(' -', e.id, '|', e.code, '|', e.name));

  const examStudentsCount = await client.execute("SELECT count(*) as cnt FROM ExamStudent");
  console.log('\nTotal ExamStudent count:', examStudentsCount.rows[0].cnt);

  const commitments = await client.execute("SELECT count(*) as cnt FROM StudentLearningCommitment");
  console.log('Total StudentLearningCommitment count:', commitments.rows[0].cnt);

  const students = await client.execute("SELECT count(*) as cnt FROM Student");
  console.log('Total Student count:', students.rows[0].cnt);
}

main().catch(console.error);
