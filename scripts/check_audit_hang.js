const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function checkAudit() {
  console.log("=== 1. AuditLog entries for ObservationSlot or ObservationRegistration ===");
  const logs = await client.execute(`
    SELECT * FROM AuditLog 
    WHERE targetTable IN ('ObservationSlot', 'ObservationRegistration') 
       OR action LIKE '%OBSERVATION%' 
       OR details LIKE '%Hằng%' 
       OR details LIKE '%Cảm xúc%' 
    ORDER BY createdAt DESC LIMIT 30
  `);
  console.log("AuditLogs count:", logs.rows.length);
  logs.rows.forEach(r => {
    console.log(`[${r.createdAt}] Action: ${r.action} | Target: ${r.targetTable} | ID: ${r.targetId} | User: ${r.userId} | Details: ${r.details}`);
  });

  console.log("\n=== 2. Check SpecialTeachingLog ===");
  const stl = await client.execute(`
    SELECT stl.*, sl.lessonName, sl.grade, sl.periodIndex
    FROM SpecialTeachingLog stl
    LEFT JOIN SpecialLesson sl ON stl.lessonId = sl.id
    ORDER BY stl.updatedAt DESC LIMIT 20
  `);
  console.log("SpecialTeachingLogs:", JSON.stringify(stl.rows, null, 2));
}

checkAudit().catch(console.error);
