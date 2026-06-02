const { createClient } = require('@libsql/client');
require('dotenv').config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({
  url: url,
  authToken: authToken,
});

async function main() {
  try {
    console.log("Connecting to Turso to drop and recreate unique constraints...");
    
    // Phổ thông
    await client.execute('DROP INDEX IF EXISTS "InputAssessmentStudent_studentCode_periodId_key";');
    console.log("Dropped old constraint for Phổ thông.");
    
    await client.execute('CREATE UNIQUE INDEX "InputAssessmentStudent_studentCode_periodId_batchId_key" ON "InputAssessmentStudent"("studentCode", "periodId", "batchId");');
    console.log("Created new constraint for Phổ thông.");

    // Mầm non
    await client.execute('DROP INDEX IF EXISTS "PreschoolInputAssessmentStudent_studentCode_periodId_key";');
    console.log("Dropped old constraint for Mầm non.");
    
    await client.execute('CREATE UNIQUE INDEX "PreschoolInputAssessmentStudent_studentCode_periodId_batchId_key" ON "PreschoolInputAssessmentStudent"("studentCode", "periodId", "batchId");');
    console.log("Created new constraint for Mầm non.");

    console.log("Successfully patched Turso Database!");
  } catch (error) {
    console.error("Error executing SQL:", error);
  }
}

main();
