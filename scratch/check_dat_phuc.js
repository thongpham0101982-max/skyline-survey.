const { createClient } = require('@libsql/client');
require('dotenv').config();
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function check() {
  const res = await client.execute(`
    SELECT ias.* 
    FROM InputAssessmentStudent ias
    WHERE ias.fullName IN ('Nguyễn Hoàng Đạt', 'Nguyễn Hoàng Phúc')
  `);
  console.log(JSON.stringify(res.rows, null, 2));
}
check().catch(console.error);
