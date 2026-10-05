const { createClient } = require('@libsql/client');
require('dotenv').config();
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function check83() {
  // Query 1: Total records where admissionResult = 'Đạt cam kết' + something?
  // Query 2: Let's see what queries return exactly 83
  const queries = [
    `SELECT count(*) as cnt FROM InputAssessmentStudent WHERE admissionResult = 'Đạt cam kết'`,
    `SELECT count(*) as cnt FROM InputAssessmentStudent WHERE admissionResult LIKE '%cam kết%'`,
    `SELECT count(*) as cnt FROM InputAssessmentStudent WHERE directorNote LIKE '%cam kết%'`,
    `SELECT count(*) as cnt FROM InputAssessmentStudent WHERE directorNote LIKE '%Môn cam kết%'`,
    `SELECT count(*) as cnt FROM InputAssessmentStudent WHERE (admissionResult LIKE '%cam kết%' OR directorNote LIKE '%cam kết%') AND fullName NOT LIKE '%Nguyen B%' AND fullName NOT LIKE '%test%'`,
    `SELECT count(*) as cnt FROM InputAssessmentStudent WHERE (admissionResult LIKE '%cam kết%' OR directorNote LIKE '%cam kết%' OR admissionResult LIKE '%theo dõi%' OR directorNote LIKE '%theo dõi%') AND fullName NOT LIKE '%Nguyen B%' AND fullName NOT LIKE '%test%'`,
    `SELECT count(*) as cnt FROM InputAssessmentStudent WHERE (admissionResult = 'Đạt cam kết' OR directorNote LIKE '%Môn cam kết%')`,
    `SELECT count(distinct fullName) as cnt FROM InputAssessmentStudent WHERE admissionResult LIKE '%cam kết%' OR directorNote LIKE '%cam kết%'`,
    `SELECT count(*) as cnt FROM Student WHERE targetType LIKE '%cam kết%' OR targetType LIKE '%CAM_KET%'`
  ];

  for (const q of queries) {
    try {
      const res = await client.execute(q);
      console.log(res.rows[0].cnt, '->', q);
    } catch (e) {
      console.log('Error for', q, ':', e.message);
    }
  }
}

check83().catch(console.error);
