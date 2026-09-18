const { createClient } = require('@libsql/client');
require('dotenv').config();

async function syncColumns() {
  const tursoUrl = (process.env.TURSO_DATABASE_URL || "").trim();
  const tursoToken = (process.env.TURSO_AUTH_TOKEN || "").trim();
  const libsql = createClient({
    url: tursoUrl.replace(/^libsql:\/\//, 'https://'),
    authToken: tursoToken,
  });

  console.log("=== SYNCING ADVISORY TABLE COLUMNS TO MATCH PRISMA SCHEMA ===");

  const statements = [
    // StudentGoalTrackingLog
    "ALTER TABLE StudentGoalTrackingLog ADD COLUMN evaluatedById TEXT;",
    
    // StudentReflection
    "ALTER TABLE StudentReflection ADD COLUMN period TEXT;",
    "ALTER TABLE StudentReflection ADD COLUMN feeling TEXT;",
    "ALTER TABLE StudentReflection ADD COLUMN reflectionText TEXT;",
    "ALTER TABLE StudentReflection ADD COLUMN selfRating INTEGER DEFAULT 5;",
    "ALTER TABLE StudentReflection ADD COLUMN difficulties TEXT;",
    "ALTER TABLE StudentReflection ADD COLUMN helpNeededText TEXT;",

    // StudentAdvisoryStatus
    "ALTER TABLE StudentAdvisoryStatus ADD COLUMN statusColor TEXT DEFAULT 'GREEN';",
    "ALTER TABLE StudentAdvisoryStatus ADD COLUMN reasonCategory TEXT;",
    "ALTER TABLE StudentAdvisoryStatus ADD COLUMN reasonDetail TEXT;",
    "ALTER TABLE StudentAdvisoryStatus ADD COLUMN updatedById TEXT;"
  ];

  for (const sql of statements) {
    try {
      console.log("Executing:", sql);
      await libsql.execute(sql);
      console.log("-> SUCCESS");
    } catch (err) {
      if (err.message && err.message.includes("duplicate column name")) {
        console.log("-> Column already exists, skipping.");
      } else {
        console.error("-> Error:", err.message);
      }
    }
  }

  console.log("=== SYNC COMPLETED ===");
}

syncColumns().catch(console.error);
