require('dotenv').config();
const { createClient } = require('@libsql/client');
const client = createClient({
  url: process.env.TURSO_DATABASE_URL ? process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://') : '',
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function run() {
  const r = await client.execute(`
    SELECT s.id, s.date, s.createdAt, s.topic, s.campusName, u.fullName as hostName, uo.fullName as observerName
    FROM ObservationRegistration r
    JOIN ObservationSlot s ON r.slotId = s.id
    JOIN Teacher ot ON r.teacherId = ot.id
    JOIN User uo ON ot.userId = uo.id
    JOIN Teacher ht ON s.teacherId = ht.id
    JOIN User u ON ht.userId = u.id
    WHERE uo.fullName IN ('Tống Thiên Long', 'Phạm Thị Khánh', 'Trần Thị Thanh')
    ORDER BY s.date ASC
  `);
  console.table(r.rows);
}
run();
