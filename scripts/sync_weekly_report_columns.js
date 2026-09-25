const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

async function sync() {
  const tursoUrl = (process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || process.env.DATABASE_URL || "").trim();
  const tursoToken = (process.env.TURSO_AUTH_TOKEN || "").trim();

  const dbs = [];

  // Turso Cloud DB
  if (tursoUrl && !tursoUrl.startsWith("file:")) {
    dbs.push({
      name: "Turso Cloud",
      client: createClient({
        url: tursoUrl.replace(/^libsql:\/\//, 'https://'),
        authToken: tursoToken,
      })
    });
  }

  // Local DB
  const localDbPath = path.resolve(process.cwd(), 'local.db');
  if (fs.existsSync(localDbPath)) {
    dbs.push({
      name: "Local SQLite (local.db)",
      client: createClient({
        url: `file:${localDbPath.replace(/\\/g, '/')}`
      })
    });
  }

  // Dev DB if exists
  const devDbPath = path.resolve(process.cwd(), 'dev.db');
  if (fs.existsSync(devDbPath)) {
    dbs.push({
      name: "Dev SQLite (dev.db)",
      client: createClient({
        url: `file:${devDbPath.replace(/\\/g, '/')}`
      })
    });
  }

  for (const db of dbs) {
    console.log(`\n=== Checking & migrating on: ${db.name} ===`);
    try {
      await db.client.execute("ALTER TABLE WeeklyReportItem ADD COLUMN expectedCompletion TEXT;");
      console.log("-> SUCCESS: Added column expectedCompletion to WeeklyReportItem");
    } catch (err) {
      if (err.message && (err.message.includes("duplicate column") || err.message.includes("already exists"))) {
        console.log("-> Column expectedCompletion already exists, OK!");
      } else {
        console.warn("-> Warning / Error:", err.message);
      }
    }
  }

  console.log("\n=== COMPLETED COLUMN SYNC ===");
}

sync().catch(console.error);
