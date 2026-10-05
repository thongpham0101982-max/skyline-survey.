const { createClient } = require('@libsql/client');
require('dotenv').config();
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function check() {
  const res = await client.execute(`
    SELECT id, studentCode, fullName, className, grade, admissionResult, directorNote, targetType, admissionCriteria
    FROM InputAssessmentStudent
    WHERE fullName IN ('Phan Anh Quân', 'Đoàn Ngọc Thảo Chloe', 'Lecomte Mailys Mộc Yên', 'Huỳnh Hoàng An')
  `);
  for (const r of res.rows) {
    console.log('=== ' + r.fullName + ' ===');
    console.log('  admissionResult:', r.admissionResult);
    console.log('  directorNote:', r.directorNote);
  }
}
check().catch(console.error);
