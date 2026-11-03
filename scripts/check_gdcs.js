const { createClient } = require('@libsql/client');
require('dotenv').config();

const url = (process.env.TURSO_DATABASE_URL || '').replace(/^libsql:\/\//, 'https://');
const authToken = process.env.TURSO_AUTH_TOKEN || '';
const client = createClient({ url, authToken });

async function main() {
  const users = await client.execute({
    sql: `SELECT u.id, u.fullName, u.email, u.role, c.campusCode, c.campusName 
          FROM User u 
          LEFT JOIN UserCampusAssignment a ON u.id = a.userId 
          LEFT JOIN Campus c ON a.campusId = c.id 
          WHERE u.role LIKE '%GDCS%' OR u.role LIKE '%BGH%' OR u.role LIKE '%ADMIN%' OR u.role LIKE '%CAMPUS%'
          ORDER BY c.campusCode, u.fullName`,
    args: []
  });
  console.log('GĐCS / BGH USERS:', JSON.stringify(users.rows, null, 2));

  const campuses = await client.execute({
    sql: `SELECT c.id, c.campusCode, c.campusName, u.fullName as managerName, u.email as managerEmail
          FROM Campus c
          LEFT JOIN User u ON c.managerId = u.id`,
    args: []
  });
  console.log('CAMPUSES & MANAGERS:', JSON.stringify(campuses.rows, null, 2));
}
main().catch(console.error);
