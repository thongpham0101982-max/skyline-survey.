const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL.trim().replace(/^libsql:\/\//, 'https://'),
  authToken: process.env.TURSO_AUTH_TOKEN.trim()
});

async function main() {
  console.log("=== 1. KIỂM TRA TRẠNG THÁI HIỆN TẠI ===");
  const before = await client.execute("SELECT id, subjectCode, subjectName, category, parentId, level FROM Subject WHERE subjectCode IN ('TA', 'TAv', 'TAvd', 'EPT', 'NLTD')");
  console.table(before.rows);

  const taSubject = before.rows.find(r => r.subjectCode === 'TA');
  if (!taSubject) {
    throw new Error("Không tìm thấy môn TA trong database!");
  }

  console.log("=== 2. TIẾN HÀNH CẬP NHẬT ===");
  // 1. Tách EPT độc lập hoàn toàn (parentId = null)
  await client.execute({
    sql: "UPDATE Subject SET parentId = NULL WHERE subjectCode = 'EPT'",
    args: []
  });
  console.log("✓ Đã cập nhật EPT: parentId = NULL (Môn khảo sát độc lập, không thuộc TA, không là cha của TAv/TAvd)");

  // 2. Cập nhật môn TA thuộc cả MOET và KSDV
  await client.execute({
    sql: "UPDATE Subject SET category = 'MOET, KSDV', level = 'ALL' WHERE id = ?",
    args: [taSubject.id]
  });
  console.log("✓ Đã cập nhật TA: category = 'MOET, KSDV', level = 'ALL'");

  // 3. Đảm bảo TAv có parentId là TA và level = 'ALL'
  await client.execute({
    sql: "UPDATE Subject SET parentId = ?, category = 'KSDV', level = 'ALL' WHERE subjectCode = 'TAv'",
    args: [taSubject.id]
  });
  console.log("✓ Đã cập nhật TAv: parentId = TA, category = 'KSDV', level = 'ALL'");

  // 4. Đảm bảo TAvd có parentId là TA và level = 'ALL'
  await client.execute({
    sql: "UPDATE Subject SET parentId = ?, category = 'KSDV', level = 'ALL' WHERE subjectCode = 'TAvd'",
    args: [taSubject.id]
  });
  console.log("✓ Đã cập nhật TAvd: parentId = TA, category = 'KSDV', level = 'ALL'");

  console.log("=== 3. KẾT QUẢ SAU CẬP NHẬT ===");
  const after = await client.execute("SELECT id, subjectCode, subjectName, category, parentId, level FROM Subject WHERE subjectCode IN ('TA', 'TAv', 'TAvd', 'EPT', 'NLTD')");
  console.table(after.rows);
}

main().catch(console.error);
