const { createClient } = require("@libsql/client");

const tursoUrl = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const tursoToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const client = createClient({ url: tursoUrl, authToken: tursoToken });

async function main() {
  console.log("Applying ALTER TABLE migrations to Turso...");
  
  // 1. Add categoryId column to AchievementLevel
  try {
    await client.execute("ALTER TABLE AchievementLevel ADD COLUMN categoryId TEXT");
    console.log("Added categoryId column to AchievementLevel successfully!");
  } catch (e) {
    console.log("Error or already exists categoryId:", e.message);
  }

  // 2. Create index on categoryId
  try {
    await client.execute('CREATE INDEX IF NOT EXISTS "AchievementLevel_categoryId_idx" ON "AchievementLevel"("categoryId")');
    console.log("Created index on categoryId successfully!");
  } catch (e) {
    console.log("Error creating index:", e.message);
  }
}

main().catch(console.error).finally(() => client.close());
