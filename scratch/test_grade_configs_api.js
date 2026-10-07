const { createClient } = require('@libsql/client');
const path = require('path');

async function test() {
  const localDbPath = path.resolve(__dirname, '../local.db').replace(/\\/g, '/');
  const client = createClient({ url: 'file:' + localDbPath });

  console.log("=== KIỂM TRA BẢNG CẤU HÌNH FILE ĐIỂM KSDV TRONG DATABASE ===");

  // 1. Tổng số bản ghi cấu hình
  const totalRes = await client.execute("SELECT COUNT(*) as count FROM InputAssessmentGradeConfig");
  console.log(`- Tổng số bản ghi đã cấu hình: ${totalRes.rows[0].count}`);

  // 2. Thống kê theo Khối 1
  const k1Res = await client.execute(`
    SELECT c.id, c.grade, c.periodId, s.name as subName, s.code as subCode, c.columnCount, c.compositeColumnName, c.passScore, c.commitmentThreshold
    FROM InputAssessmentGradeConfig c
    LEFT JOIN AssessmentSubject s ON c.subjectId = s.id
    WHERE c.grade = 'Khối 1'
    ORDER BY c.periodId ASC, s.code ASC
  `);

  console.log("\n=== CẤU HÌNH CHI TIẾT KHỐI 1 THEO MỐC THỜI GIAN ===");
  k1Res.rows.forEach(r => {
    console.log(`[Mốc: ${r.periodId || 'ALL'}] Môn: ${r.subName} (${r.subCode}) | Số cột: ${r.columnCount} | Tổng: ${r.compositeColumnName} | Đạt: ${r.passScore}đ | Cam kết: ${r.commitmentThreshold}đ`);
  });

  // 3. Thống kê mẫu các khối 2-12
  const k212Res = await client.execute(`
    SELECT DISTINCT c.grade, COUNT(*) as subCount
    FROM InputAssessmentGradeConfig c
    WHERE c.grade != 'Khối 1'
    GROUP BY c.grade
    ORDER BY c.grade ASC
  `);

  console.log("\n=== SỐ LƯỢNG CẤU HÌNH CÁC KHỐI KHÁC (K2 - K12) ===");
  k212Res.rows.forEach(r => {
    console.log(`Khối: ${r.grade} -> ${r.subCount} môn cấu hình`);
  });
}

test().catch(console.error);
