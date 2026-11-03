const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  console.log("=== 1. Find ANY slot with date containing '2026-10-27' or '2026-10' ===");
  const slotsDate = await client.execute(`
    SELECT s.id, s.topic, s.date, s.startTime, s.endTime, s.status, s.teacherId, t.teacherName, t.teacherCode, s.className, s.subjectName
    FROM ObservationSlot s
    LEFT JOIN Teacher t ON s.teacherId = t.id
    WHERE s.date LIKE '%2026-10-27%' OR s.topic LIKE '%Cảm xúc đến từ đâu%'
  `);
  console.log("Slots matching date or topic:", JSON.stringify(slotsDate.rows, null, 2));

  console.log("\n=== 2. Find ALL slots created in October 2026 ===");
  const octSlots = await client.execute(`
    SELECT s.id, s.topic, s.date, s.startTime, s.endTime, s.status, s.createdAt, t.teacherName, t.teacherCode, s.className, s.subjectName
    FROM ObservationSlot s
    LEFT JOIN Teacher t ON s.teacherId = t.id
    WHERE s.createdAt >= '2026-10-01'
    ORDER BY s.createdAt DESC
  `);
  console.log(`October slots count: ${octSlots.rows.length}`);
  octSlots.rows.forEach(r => {
    console.log(`- [${r.createdAt}] ID: ${r.id} | Date: ${r.date} | ${r.startTime} | ${r.teacherName} (${r.teacherCode}) | "${r.topic}" | ${r.className} | Status: ${r.status}`);
  });

  console.log("\n=== 3. Find deleted slots? Does soft delete exist or ActivityLog / AuditLog? ===");
  const auditLogs = await client.execute(`
    SELECT * FROM sqlite_master WHERE name LIKE '%Log%' OR name LIKE '%Audit%' OR name LIKE '%History%'
  `);
  console.log("Log tables:", auditLogs.rows.map(r => r.name));
}
run().catch(console.error);
