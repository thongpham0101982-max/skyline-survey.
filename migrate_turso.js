const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

require('dotenv').config({ path: path.join(__dirname, '.env') });

async function runMigration() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("Missing Turso credentials in .env");
    process.exit(1);
  }

  const client = createClient({ url, authToken });
  const sqlFile = path.join(__dirname, 'migrate.sql');
  const sqlText = fs.readFileSync(sqlFile, 'utf-8');

  const statements = sqlText.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} statements to execute.`);
  
  try {
    await client.executeMultiple(sqlText);
    console.log("Migration executed successfully!");
  } catch (err) {
    console.error("Error executing migration:", err);
  }
}

runMigration();
