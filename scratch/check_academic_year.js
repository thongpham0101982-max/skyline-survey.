require('dotenv').config();
const { createClient } = require('@libsql/client');
const client = createClient({
  url: process.env.TURSO_DATABASE_URL ? process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://') : '',
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function run() {
  const r = await client.execute(`
    SELECT r.id, ut.fullName as observerName, r.isApproved,
           s.id as slotId, s.date, s.status as slotStatus, s.topic, s.className, s.campusName,
           s.academicYearId,
           ay.name as yearName, ay.status as yearStatus
    FROM ObservationRegistration r
    JOIN Teacher ot ON r.teacherId = ot.id
    JOIN User ut ON ot.userId = ut.id
    JOIN ObservationSlot s ON r.slotId = s.id
    LEFT JOIN AcademicYear ay ON s.academicYearId = ay.id
    WHERE ut.fullName LIKE '%Tống Thiên Long%' OR ut.fullName LIKE '%Phạm Thị Khánh%' OR ut.fullName LIKE '%Trần Thị Thanh%'
  `);
  console.table(r.rows);
}
run();
