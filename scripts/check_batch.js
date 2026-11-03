const { createClient } = require('@libsql/client');
require('dotenv').config();

const url = (process.env.TURSO_DATABASE_URL || '').replace(/^libsql:\/\//, 'https://');
const authToken = process.env.TURSO_AUTH_TOKEN || '';
const client = createClient({ url, authToken });

async function main() {
  const b = await client.execute({ sql: "SELECT * FROM PreschoolInputAssessmentBatch WHERE id = 'cmv8zwv3a000513ai4eoe3gog'", args: [] });
  const p = await client.execute({ sql: "SELECT * FROM PreschoolInputAssessmentPeriod WHERE id = 'cmpyz26oe0001t6sd6zcal80e'", args: [] });
  console.log('BATCH:', JSON.stringify(b.rows[0], null, 2));
  console.log('PERIOD:', JSON.stringify(p.rows[0], null, 2));
}
main().catch(console.error);
