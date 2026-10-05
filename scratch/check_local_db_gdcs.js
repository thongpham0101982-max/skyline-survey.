const { createClient } = require('@libsql/client');
const client = createClient({ url: 'file:local.db' });
async function run() {
  const r = await client.execute(`
    SELECT r.id, ut.fullName as observerName, r.isApproved,
           s.id as slotId, s.date, s.status as slotStatus, s.topic, s.className, s.campusName
    FROM ObservationRegistration r
    JOIN Teacher ot ON r.teacherId = ot.id
    JOIN User ut ON ot.userId = ut.id
    JOIN ObservationSlot s ON r.slotId = s.id
    WHERE ut.fullName LIKE '%Tống Thiên Long%' OR ut.fullName LIKE '%Phạm Thị Khánh%' OR ut.fullName LIKE '%Trần Thị Thanh%'
    ORDER BY ut.fullName, s.date
  `);
  console.log(`Local DB GDCS registrations count: ${r.rows.length}`);
  console.table(r.rows);
}
run();
