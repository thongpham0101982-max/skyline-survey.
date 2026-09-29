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

  const columnsToAdd = [
    { table: "TaskCategory", col: "weight", type: "REAL DEFAULT 1.0" },
    { table: "WeeklyReport", col: "directorComment", type: "TEXT" },
    { table: "WeeklyReportItem", col: "directorNote", type: "TEXT" },
    { table: "WeeklyReportItem", col: "directorRating", type: "TEXT" },
    { table: "WeeklyReportItem", col: "qualityScore", type: "REAL" },
  ];

  for (const db of dbs) {
    console.log(`\n=== Checking & migrating on: ${db.name} ===`);
    for (const c of columnsToAdd) {
      try {
        await db.client.execute(`ALTER TABLE ${c.table} ADD COLUMN ${c.col} ${c.type};`);
        console.log(`-> SUCCESS: Added column ${c.col} to ${c.table}`);
      } catch (err) {
        if (err.message && (err.message.includes("duplicate column") || err.message.includes("already exists"))) {
          console.log(`-> Column ${c.col} on ${c.table} already exists, OK!`);
        } else {
          console.warn(`-> Warning on ${c.table}.${c.col}:`, err.message);
        }
      }
    }
  }

  console.log("\n=== COMPLETED KPI & QUALITY COLUMN SYNC ===");
}

sync().catch(console.error);
