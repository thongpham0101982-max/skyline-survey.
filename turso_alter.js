const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  try {
    await client.execute("ALTER TABLE AcademicYear ADD COLUMN isOff BOOLEAN NOT NULL DEFAULT 0;");
    console.log("Successfully added isOff column to AcademicYear table!");
  } catch (err) {
    if (err.message.includes("duplicate column name")) {
      console.log("Column already exists.");
    } else {
      console.error(err);
    }
  }
}

main();
