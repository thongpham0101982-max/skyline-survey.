const { createClient } = require('@libsql/client');
require('dotenv').config();

const url = (process.env.TURSO_DATABASE_URL || '').replace(/^libsql:\/\//, 'https://');
const authToken = process.env.TURSO_AUTH_TOKEN || '';
const client = createClient({ url, authToken });

async function main() {
  const users = await client.execute({
    sql: `SELECT u.id, u.fullName, u.email, u.role, c.campusName, c.campusCode 
          FROM User u 
          JOIN UserCampusAssignment a ON u.id = a.userId 
          JOIN Campus c ON a.campusId = c.id 
          WHERE c.campusCode = 'CS2' OR c.campusName LIKE '%CS2%' OR c.campusName LIKE '%Riverside%'`,
    args: []
  });
  console.log('CS2 USERS:', JSON.stringify(users.rows, null, 2));
}
main().catch(console.error);
