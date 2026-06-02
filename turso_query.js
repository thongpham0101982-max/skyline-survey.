const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  try {
    const res = await client.execute("SELECT * FROM InputAssessmentStudent ORDER BY createdAt DESC LIMIT 5");
    console.log("Recent students in Turso DB:");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  }
}

main();
