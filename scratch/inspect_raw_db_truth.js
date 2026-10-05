const { createClient } = require('@libsql/client');
require('dotenv').config();
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function check() {
  console.log('--- 1. LÊ NGUYÊN KHANG IN TURSO ---');
  const khangIas = await client.execute(`SELECT * FROM InputAssessmentStudent WHERE fullName LIKE '%Lê Nguyên Khang%'`);
  console.log('IAS:', JSON.stringify(khangIas.rows, null, 2));

  for (const row of khangIas.rows) {
    const sc = await client.execute({
      sql: `SELECT sas.*, s.name as subName, s.code as subCode 
            FROM StudentAssessmentScore sas
            LEFT JOIN AssessmentSubject s ON sas.subjectId = s.id
            WHERE sas.studentId = ?`,
      args: [row.id]
    });
    console.log(`Scores for ${row.id}:`, JSON.stringify(sc.rows, null, 2));
  }

  console.log('\n--- 2. VÕ HOÀNG VI IN TURSO ---');
  const viIas = await client.execute(`SELECT * FROM InputAssessmentStudent WHERE fullName LIKE '%Võ Hoàng Vi%'`);
  console.log('IAS:', JSON.stringify(viIas.rows, null, 2));

  for (const row of viIas.rows) {
    const sc = await client.execute({
      sql: `SELECT sas.*, s.name as subName, s.code as subCode 
            FROM StudentAssessmentScore sas
            LEFT JOIN AssessmentSubject s ON sas.subjectId = s.id
            WHERE sas.studentId = ?`,
      args: [row.id]
    });
    console.log(`Scores for ${row.id}:`, JSON.stringify(sc.rows, null, 2));
  }

  console.log('\n--- 3. PHAN ANH QUÂN IN TURSO ---');
  const quanIas = await client.execute(`SELECT * FROM InputAssessmentStudent WHERE fullName LIKE '%Phan Anh Quân%'`);
  console.log('IAS:', JSON.stringify(quanIas.rows, null, 2));

  for (const row of quanIas.rows) {
    const sc = await client.execute({
      sql: `SELECT sas.*, s.name as subName, s.code as subCode 
            FROM StudentAssessmentScore sas
            LEFT JOIN AssessmentSubject s ON sas.subjectId = s.id
            WHERE sas.studentId = ?`,
      args: [row.id]
    });
    console.log(`Scores for ${row.id}:`, JSON.stringify(sc.rows, null, 2));
  }
}

check().catch(console.error);
