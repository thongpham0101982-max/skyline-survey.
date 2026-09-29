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
  const res = await client.execute(`
    SELECT *
    FROM InputAssessmentStudent
    WHERE studentCode LIKE '%HS701020166%' OR enrollmentCode LIKE '%HS701020166%' OR fullName LIKE '%Trần Minh Huy%'
  `);

  console.log('Result for Trần Minh Huy:');
  console.log(JSON.stringify(res.rows, null, 2));

  // Kiểm tra điểm chi tiết trong InputAssessmentStudentScore nếu có
  try {
    const scores = await client.execute(`
      SELECT * FROM InputAssessmentStudentScore WHERE studentId = '${res.rows[0].id}'
    `);
    console.log('Scores:');
    console.log(JSON.stringify(scores.rows, null, 2));
  } catch (e) {
    console.log('No InputAssessmentStudentScore table or error:', e.message);
  }
}

main().catch(console.error);
