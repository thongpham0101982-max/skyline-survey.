const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

async function migrate() {
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

  // Dev DB
  const devDbPath = path.resolve(process.cwd(), 'dev.db');
  if (fs.existsSync(devDbPath)) {
    dbs.push({
      name: "Dev SQLite (dev.db)",
      client: createClient({
        url: `file:${devDbPath.replace(/\\/g, '/')}`
      })
    });
  }

  const ddlStatements = [
    // Create TaskGroup table
    `CREATE TABLE IF NOT EXISTS TaskGroup (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      code TEXT,
      department TEXT DEFAULT 'KT&ĐBCL',
      description TEXT,
      memberUserIds TEXT,
      leaderUserId TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    // Add groupName to TaskCategory
    `ALTER TABLE TaskCategory ADD COLUMN groupName TEXT;`,

    // Add category & taskGroup to WeeklyReportItem
    `ALTER TABLE WeeklyReportItem ADD COLUMN category TEXT;`,
    `ALTER TABLE WeeklyReportItem ADD COLUMN taskGroup TEXT;`
  ];

  const defaultGroups = [
    { id: 'tg_kt_pt', name: 'Khảo thí Phổ thông', department: 'KT&ĐBCL' },
    { id: 'tg_kt_th', name: 'Khảo thí Tổng hợp', department: 'KT&ĐBCL' },
    { id: 'tg_kt_ta', name: 'Khảo thí TA&CTQT', department: 'KT&ĐBCL' },
    { id: 'tg_dbcl_hs', name: 'ĐBCL Học sinh', department: 'KT&ĐBCL' },
    { id: 'tg_dbcl', name: 'ĐBCL', department: 'KT&ĐBCL' }
  ];

  for (const db of dbs) {
    console.log(`\n=== Running Migration on ${db.name} ===`);
    
    for (const sql of ddlStatements) {
      try {
        await db.client.execute(sql);
        console.log(`-> SUCCESS: ${sql.slice(0, 50)}...`);
      } catch (err) {
        if (err.message && (err.message.includes("duplicate column") || err.message.includes("already exists"))) {
          console.log(`-> Notice: already exists, skipped.`);
        } else {
          console.warn(`-> Warning:`, err.message);
        }
      }
    }

    // Seed default TaskGroups
    for (const g of defaultGroups) {
      try {
        await db.client.execute({
          sql: `INSERT OR IGNORE INTO TaskGroup (id, name, department, createdAt, updatedAt) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          args: [g.id, g.name, g.department]
        });
      } catch (err) {
        console.warn(`-> Seed TaskGroup warning:`, err.message);
      }
    }
    console.log(`-> Seeded 5 standard TaskGroups successfully.`);
  }

  console.log("\n=== ALL MIGRATIONS AND SEEDING COMPLETED ===");
}

migrate().catch(console.error);
