const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const url = (process.env.TURSO_DATABASE_URL || '').trim().replace(/^libsql:\/\//, 'https://');
const authToken = (process.env.TURSO_AUTH_TOKEN || '').trim();

const client = createClient({ url, authToken });

async function main() {
  await client.execute(`
    UPDATE Subject 
    SET subjectCode = 'ACE', subjectName = 'Academic English' 
    WHERE subjectCode = 'Academic English'
  `);
  console.log('Fixed ACE code and name successfully.');
}

main().catch(console.error);
