import { createClient } from '@libsql/client';
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  try {
    await client.execute('ALTER TABLE "Notification" ADD COLUMN "link" TEXT;');
    console.log("Successfully added link column to Notification table.");
  } catch (err) {
    if (err.message && err.message.includes("duplicate column name")) {
      console.log("Column 'link' already exists.");
    } else {
      console.error(err);
    }
  }
}

run();
