const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  try {
    const res = await client.execute("SELECT id, name FROM InputAssessmentBatch WHERE periodId = 'cmnrk8tcd00019yj31f18hjql'");
    console.log("Batches for Khảo sát lẻ:");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  }
}

main();
