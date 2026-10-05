const { createClient } = require('@libsql/client');
require('dotenv').config();
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function check() {
  const names = ['Nguyễn Thanh Phúc', 'ĐỖ NGUYỄN AN KHÔI', 'Phan Hải Đăng', 'Nguyễn Hoàng Đạt', 'Nguyễn Hoàng Phúc', 'Nguyễn Đặng Bảo Trâm'];
  const res = await client.execute({
    sql: `SELECT id, studentCode, fullName, className, grade, admissionResult, admissionCriteria, directorNote, targetType 
          FROM InputAssessmentStudent 
          WHERE fullName IN (?, ?, ?, ?, ?, ?)`,
    args: names
  });
  console.log(JSON.stringify(res.rows, null, 2));
}
check().catch(console.error);
