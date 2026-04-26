const { createClient } = require('@libsql/client');

async function fixDatabase() {
  const tursoUrl = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io"
  const tursoAuthToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw"
  
  const client = createClient({
    url: tursoUrl,
    authToken: tursoAuthToken,
  })

  try {
    console.log("Creating UserCampusAssignment table...");
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "UserCampusAssignment" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "campusId" TEXT NOT NULL,
          CONSTRAINT "UserCampusAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "UserCampusAssignment_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    
    console.log("Creating unique index...");
    await client.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UserCampusAssignment_userId_campusId_key" ON "UserCampusAssignment"("userId", "campusId");
    `);

    console.log("Successfully patched Turso database schema!");
  } catch (error) {
    console.error("Error updating database:", error);
  }
}

fixDatabase();
