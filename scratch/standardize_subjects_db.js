const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const url = (process.env.TURSO_DATABASE_URL || '').trim().replace(/^libsql:\/\//, 'https://');
const authToken = (process.env.TURSO_AUTH_TOKEN || '').trim();

const client = createClient({ url, authToken });

async function main() {
  console.log('--- 1. Cập nhật INT-CORE và INT-MATH ---');
  await client.execute({
    sql: "UPDATE Subject SET subjectName = ? WHERE subjectCode = 'INT-CORE'",
    args: ['Core Competencies các môn Học Song ngữ']
  });
  await client.execute({
    sql: "UPDATE Subject SET evaluationType = 'SCORE' WHERE subjectCode = 'INT-MATH'",
    args: []
  });

  console.log('--- 2. Cập nhật evaluationType chuẩn cho các môn Đánh giá/Nhận xét ---');
  await client.execute({
    sql: "UPDATE Subject SET evaluationType = 'GRADE' WHERE subjectCode IN ('AM_NHAC', 'ANA', 'MI_THUAT', 'MTU', 'GTC', 'HDTNHN', 'HTT', 'TND', 'INT-READ')",
    args: []
  });

  console.log('--- 3. Kiểm tra danh sách sau chuẩn hóa ---');
  const res = await client.execute('SELECT subjectCode, subjectName, category, evaluationType FROM Subject ORDER BY category, subjectCode');
  
  console.log('\n=== DANH SÁCH 54 MÔN HỌC ĐÃ CHUẨN HÓA TRONG HỆ THỐNG ===');
  let currentCat = '';
  res.rows.forEach(r => {
    if (r.category !== currentCat) {
      currentCat = r.category;
      console.log(`\n--- NHÓM: ${currentCat} ---`);
    }
    console.log(`  [${r.subjectCode.padEnd(16)}] | ${r.subjectName.padEnd(40)} | Eval: ${r.evaluationType}`);
  });
}

main().catch(console.error);
