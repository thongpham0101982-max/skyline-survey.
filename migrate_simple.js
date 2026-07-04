const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function runMigration() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("Missing Turso credentials in .env");
    process.exit(1);
  }

  const client = createClient({ url, authToken });
  
  try {
    // 1. Add column
    await client.execute(`ALTER TABLE "SubjectQuota" ADD COLUMN "studyProgram" TEXT NOT NULL DEFAULT 'DEFAULT';`);
    console.log("Added column studyProgram");
  } catch (err) {
    if (!err.message.includes("duplicate column name")) {
      console.error("Error adding column:", err);
      return;
    }
    console.log("Column already exists, ignoring.");
  }

  try {
    // 2. Drop old index
    await client.execute(`DROP INDEX IF EXISTS "SubjectQuota_subjectId_academicYearId_key";`);
    console.log("Dropped old unique index");
  } catch (err) {
    console.error("Error dropping index:", err);
  }

  try {
    // 3. Create new index
    await client.execute(`CREATE UNIQUE INDEX "SubjectQuota_subjectId_academicYearId_studyProgram_key" ON "SubjectQuota"("subjectId", "academicYearId", "studyProgram");`);
    console.log("Created new unique index");
  } catch (err) {
    if (!err.message.includes("already exists")) {
      console.error("Error creating index:", err);
    }
  }

  console.log("Migration simple executed successfully!");
}

runMigration();
