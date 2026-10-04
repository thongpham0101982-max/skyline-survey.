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
  `CREATE TABLE IF NOT EXISTS DeviceSession (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    deviceId TEXT NOT NULL,
    deviceName TEXT NOT NULL,
    deviceType TEXT DEFAULT 'MOBILE',
    browser TEXT,
    os TEXT,
    ipAddress TEXT,
    userAgent TEXT,
    lastActiveAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'ACTIVE',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_device_session_user_device ON DeviceSession(userId, deviceId)",
  "CREATE INDEX IF NOT EXISTS idx_device_session_user ON DeviceSession(userId)",
  "CREATE INDEX IF NOT EXISTS idx_device_session_device ON DeviceSession(deviceId)"
];

async function applyToClient(client, name) {
  console.log(`=== Applying migration to ${name} ===`);
  for (const sql of stmts) {
    try {
      await client.execute(sql);
      console.log(`[${name}] OK: ${sql.substring(0, 50)}...`);
    } catch (err) {
      if (err.message && (err.message.includes("duplicate") || err.message.includes("already exists"))) {
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
  } catch (err) {
    console.error("Turso error:", err.message);
  }
  console.log("Wave 7 migration complete!");
}

run().catch(console.error);
