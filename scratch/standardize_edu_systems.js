const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config();

async function main() {
  const localDbPath = path.resolve(__dirname, '../local.db').replace(/\\/g, '/');
  const localDb = createClient({ url: 'file:' + localDbPath });

  const tursoUrl = (process.env.TURSO_DATABASE_URL || '').replace(/^libsql:\/\//, 'https://');
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  const cloudDb = createClient({
    url: tursoUrl,
    authToken: tursoToken,
  });

  const targets = [
    { name: 'LOCAL (local.db)', db: localDb },
    { name: 'CLOUD (Turso)', db: cloudDb }
  ];

  // Danh mục Hệ học chuẩn Sky-Line
  const standardSystems = [
    { code: "HNS", name: "Hội nhập Sky-Line", status: "ACTIVE" },
    { code: "HNG", name: "Hội nhập Quốc tế", status: "ACTIVE" },
    { code: "SB",  name: "Song bằng Quốc tế", status: "ACTIVE" },
    { code: "MNS", name: "Mầm non Hội nhập (S)", status: "ACTIVE" },
    { code: "MNG", name: "Mầm non Quốc tế (Global)", status: "ACTIVE" }
  ];

  for (const { name, db } of targets) {
    console.log(`\n=== Chuẩn hóa Hệ học trên ${name} ===`);

    // 1. Cập nhật các hệ học hiện có
    await db.execute(`UPDATE EducationSystem SET name = 'Hội nhập Sky-Line' WHERE code = 'HNS'`);
    await db.execute(`UPDATE EducationSystem SET name = 'Hội nhập Quốc tế' WHERE code = 'HNG'`);
    await db.execute(`UPDATE EducationSystem SET name = 'Song bằng Quốc tế' WHERE code = 'SB'`);

    // 2. Lấy danh sách AcademicYear
    const years = await db.execute(`SELECT id FROM AcademicYear`);
    for (const y of years.rows) {
      for (const sys of standardSystems) {
        const check = await db.execute({
          sql: `SELECT id FROM EducationSystem WHERE code = ? AND academicYearId = ?`,
          args: [sys.code, y.id]
        });

        if (check.rows.length === 0) {
          const id = `sys_${sys.code.toLowerCase()}_${y.id.substring(0, 10)}`;
          await db.execute({
            sql: `INSERT INTO EducationSystem (id, code, name, academicYearId, status, createdAt) VALUES (?, ?, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP)`,
            args: [id, sys.code, sys.name, y.id]
          });
          console.log(`[${name}] Đã thêm hệ học ${sys.name} (${sys.code}) cho năm học ${y.id}`);
        } else {
          await db.execute({
            sql: `UPDATE EducationSystem SET name = ? WHERE code = ? AND academicYearId = ?`,
            args: [sys.name, sys.code, y.id]
          });
        }
      }
    }

    // 3. In ra danh sách sau chuẩn hóa
    const after = await db.execute(`SELECT id, code, name, academicYearId FROM EducationSystem ORDER BY code ASC`);
    console.log(`[${name}] Danh sách hệ học sau chuẩn hóa (${after.rows.length}):`);
    after.rows.forEach(r => {
      console.log(`- [${r.code}] ${r.name} | Năm: ${r.academicYearId}`);
    });
  }

  console.log("\n✅ Hoàn tất chuẩn hóa Hệ học Sky-Line trên cả Local và Turso Cloud!");
}

main().catch(console.error);
