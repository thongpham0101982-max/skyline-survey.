const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN || ""
});

async function main() {
  const countTurso = await client.execute("SELECT count(*) as cnt FROM SubjectGradeEntry WHERE evaluationPeriod = 'KSĐN'");
  console.log('Total KSĐN entries in Turso:', countTurso.rows[0].cnt);

  const distinctStudents = await client.execute("SELECT count(distinct studentId) as cnt FROM SubjectGradeEntry WHERE evaluationPeriod = 'KSĐN'");
  console.log('Distinct KSĐN students in Turso:', distinctStudents.rows[0].cnt);

  const latestUpdated = await client.execute("SELECT max(updatedAt) as maxUp, max(createdAt) as maxCr FROM SubjectGradeEntry WHERE evaluationPeriod = 'KSĐN'");
  console.log('Latest KSĐN timestamps in Turso:', latestUpdated.rows[0]);
}

main().catch(console.error);
