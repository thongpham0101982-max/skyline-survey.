const { createClient } = require('@libsql/client');
require('dotenv').config();
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

async function main() {
  const res = await client.execute(`
    SELECT u.id, u.email, u.fullName, u.role, t.position, t.departmentId 
    FROM User u 
    LEFT JOIN Teacher t ON t.userId = u.id 
    WHERE u.email LIKE 'k%' OR u.fullName LIKE 'K%' OR u.role LIKE '%ADMIN%'
    LIMIT 20
  `);
  console.table(res.rows);
}

main().catch(console.error);
