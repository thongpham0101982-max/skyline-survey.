const { createClient } = require("@libsql/client");

const tursoUrl = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const tursoToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

async function cleanupDb(client, dbName) {
  console.log(`Cleaning up duplicates in ${dbName}...`);
  try {
    // Fetch all assignments
    const res = await client.execute("SELECT id, periodId, batchId, grade, userId, createdAt FROM PreschoolInputAssessmentTeacherAssignment");
    const assignments = res.rows;
    
    // Group assignments by periodId, batchId, grade
    const groups = {};
    for (const a of assignments) {
      const key = `${a.periodId}_${a.batchId || "null"}_${a.grade}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(a);
    }
    
    let deletedCount = 0;
    for (const key in groups) {
      const list = groups[key];
      if (list.length > 1) {
        // Keep the first one, delete the rest
        const toKeep = list[0];
        const toDelete = list.slice(1);
        
        console.log(`Group ${key} has ${list.length} assignments. Keeping: ${toKeep.id}`);
        for (const item of toDelete) {
          await client.execute({
            sql: "DELETE FROM PreschoolInputAssessmentTeacherAssignment WHERE id = ?",
            args: [item.id]
          });
          deletedCount++;
        }
      }
    }
    console.log(`Successfully deleted ${deletedCount} duplicate assignments in ${dbName}!`);
  } catch (e) {
    console.error(`Error during cleanup in ${dbName}:`, e.message);
  }
}

async function main() {
  // 1. Clean Turso
  const tursoClient = createClient({ url: tursoUrl, authToken: tursoToken });
  try {
    await cleanupDb(tursoClient, "Turso (Remote)");
  } finally {
    tursoClient.close();
  }

  // 2. Clean Local
  const localClient = createClient({ url: "file:./prisma/dev.db" });
  try {
    await cleanupDb(localClient, "dev.db (Local)");
  } finally {
    localClient.close();
  }
}

main().catch(console.error);
