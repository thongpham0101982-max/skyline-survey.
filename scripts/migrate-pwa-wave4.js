const { createClient } = require("@libsql/client");
const path = require("path");
const fs = require("fs");

const localDbPath = path.resolve(__dirname, "../local.db").replace(/\\/g, "/");
const localClient = createClient({ url: `file:${localDbPath}` });

const rawTursoUrl = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const tursoToken = process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const tursoClient = createClient({
  url: rawTursoUrl.replace(/^libsql:\/\//, 'https://'),
  authToken: tursoToken
});

const stmts = [
  "ALTER TABLE Notification ADD COLUMN type TEXT DEFAULT 'INFORMATION'",
  "ALTER TABLE Notification ADD COLUMN category TEXT DEFAULT 'GENERAL'",
  "ALTER TABLE Notification ADD COLUMN priority TEXT DEFAULT 'NORMAL'",
  "ALTER TABLE Notification ADD COLUMN sourceModule TEXT",
  "ALTER TABLE Notification ADD COLUMN sourceId TEXT",
  "ALTER TABLE Notification ADD COLUMN expiredAt DATETIME",
  `CREATE TABLE IF NOT EXISTS PushSubscription (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    userAgent TEXT,
    deviceType TEXT DEFAULT 'MOBILE',
    isActive BOOLEAN DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS UserPreference (
    id TEXT PRIMARY KEY,
    userId TEXT UNIQUE NOT NULL,
    morningBriefEnabled BOOLEAN DEFAULT 1,
    morningBriefTime TEXT DEFAULT '07:00',
    pushNotifications BOOLEAN DEFAULT 1,
    themePreference TEXT DEFAULT 'LIGHT',
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
  )`
];

async function applyToClient(client, name) {
  console.log(`=== Applying migration to ${name} ===`);
  for (const sql of stmts) {
    try {
      await client.execute(sql);
      console.log(`[${name}] OK: ${sql.substring(0, 50)}...`);
    } catch (err) {
      if (err.message && (err.message.includes("duplicate column") || err.message.includes("already exists"))) {
        console.log(`[${name}] Already exists (skipped): ${sql.substring(0, 45)}...`);
      } else {
        console.warn(`[${name}] Warning on ${sql.substring(0, 45)}:`, err.message);
      }
    }
  }
}

async function run() {
  await applyToClient(localClient, "Local SQLite");
  try {
    await applyToClient(tursoClient, "Turso Cloud");
  } catch (e) {
    console.warn("Turso Cloud migration skipped or network error:", e.message);
  }
}

run().catch(console.error);
