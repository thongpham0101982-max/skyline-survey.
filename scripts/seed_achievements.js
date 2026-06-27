const { createClient } = require("@libsql/client");

const tursoUrl = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const tursoToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const categories = [
  { id: "ac_cat_1", code: "GIAI_THUONG", name: "Giải thưởng", description: "Các giải thưởng, giải thi đấu học sinh" },
  { id: "ac_cat_2", code: "HUY_CHUONG", name: "Huy chương", description: "Các huy chương Vàng, Bạc, Đồng..." },
  { id: "ac_cat_3", code: "CHUNG_NHAN", name: "Chứng nhận", description: "Các chứng nhận tham gia, chứng nhận đạt chuẩn" },
  { id: "ac_cat_4", code: "KHAC", name: "Khác", description: "Các loại thành tích và khen thưởng khác" }
];

const levels = [
  { id: "ac_lvl_1", code: "NHAT", name: "Giải Nhất", description: "Giải Nhất học sinh giỏi, giải Nhất các cuộc thi" },
  { id: "ac_lvl_2", code: "NHI", name: "Giải Nhì", description: "Giải Nhì học sinh giỏi, giải Nhì các cuộc thi" },
  { id: "ac_lvl_3", code: "BA", name: "Giải Ba", description: "Giải Ba học sinh giỏi, giải Ba các cuộc thi" },
  { id: "ac_lvl_4", code: "KHUYEN_KHICH", name: "Giải Khuyến khích", description: "Giải Khuyến khích học sinh giỏi, giải Khuyến khích các cuộc thi" },
  { id: "ac_lvl_5", code: "VANG", name: "Huy chương Vàng", description: "Huy chương Vàng các giải đấu thể thao, trí tuệ" },
  { id: "ac_lvl_6", code: "BAC", name: "Huy chương Bạc", description: "Huy chương Bạc các giải đấu thể thao, trí tuệ" },
  { id: "ac_lvl_7", code: "DONG", name: "Huy chương Đồng", description: "Huy chương Đồng các giải đấu thể thao, trí tuệ" },
  { id: "ac_lvl_8", code: "KHAC", name: "Khác / Chứng nhận", description: "Các mức giải khác hoặc chứng nhận tham gia" }
];

async function seedDb(client, dbName) {
  console.log(`Seeding database: ${dbName}...`);
  
  // Seed categories
  for (const cat of categories) {
    try {
      // Check if code exists
      const existing = await client.execute({
        sql: "SELECT id FROM AchievementCategory WHERE code = ?",
        args: [cat.code]
      });
      if (existing.rows.length === 0) {
        await client.execute({
          sql: "INSERT INTO AchievementCategory (id, code, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))",
          args: [cat.id, cat.code, cat.name, cat.description]
        });
        console.log(`- Inserted category: ${cat.name}`);
      } else {
        console.log(`- Category already exists: ${cat.name}`);
      }
    } catch (e) {
      console.error(`Error seeding category ${cat.name}:`, e.message);
    }
  }

  // Seed levels
  for (const lvl of levels) {
    try {
      // Check if code exists
      const existing = await client.execute({
        sql: "SELECT id FROM AchievementLevel WHERE code = ?",
        args: [lvl.code]
      });
      if (existing.rows.length === 0) {
        await client.execute({
          sql: "INSERT INTO AchievementLevel (id, code, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))",
          args: [lvl.id, lvl.code, lvl.name, lvl.description]
        });
        console.log(`- Inserted level: ${lvl.name}`);
      } else {
        console.log(`- Level already exists: ${lvl.name}`);
      }
    } catch (e) {
      console.error(`Error seeding level ${lvl.name}:`, e.message);
    }
  }
}

async function main() {
  // 1. Seed Turso
  const tursoClient = createClient({ url: tursoUrl, authToken: tursoToken });
  try {
    await seedDb(tursoClient, "Turso (Remote)");
  } finally {
    tursoClient.close();
  }

  // 2. Seed Local
  const localClient = createClient({ url: "file:./prisma/dev.db" });
  try {
    await seedDb(localClient, "dev.db (Local)");
  } finally {
    localClient.close();
  }
  
  console.log("All seeding complete!");
}

main().catch(console.error);
