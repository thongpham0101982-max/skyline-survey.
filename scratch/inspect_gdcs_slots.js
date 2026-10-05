require('dotenv').config();
const { createClient } = require('@libsql/client');
const client = createClient({
  url: process.env.TURSO_DATABASE_URL ? process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://') : '',
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  const res = await client.execute(`
    SELECT s.id, s.date, s.status, s.academicYearId, s.campusId, s.campusName, s.level, s.targetDeptId,
           r.teacherId, t.teacherName, r.isApproved, s.createdAt
    FROM ObservationRegistration r
    JOIN ObservationSlot s ON r.slotId = s.id
    JOIN Teacher t ON r.teacherId = t.id
    WHERE t.teacherName LIKE '%Lê Thành Danh%'
    ORDER BY s.date
  `);
  console.log(JSON.stringify(res.rows, null, 2));
}
main();
