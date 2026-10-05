require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL ? process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://') : '',
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  // 1. Get GDCS users & teachers
  const gdcsTeachers = await client.execute(`
    SELECT u.id as userId, u.fullName, u.email, u.role, t.id as teacherId, t.teacherCode, t.position, t.departmentId, d.name as deptName, c.campusName
    FROM User u
    JOIN Teacher t ON t.userId = u.id
    LEFT JOIN Department d ON t.departmentId = d.id
    LEFT JOIN Campus c ON t.campusId = c.id
    WHERE u.role = 'GDCS' OR t.position LIKE '%GDCS%' OR t.position LIKE '%GĐCS%' OR d.name = 'GĐCS'
  `);
  console.log("=== GDCS Teachers ===");
  console.table(gdcsTeachers.rows);

  const teacherIds = gdcsTeachers.rows.map(r => `'${r.teacherId}'`).join(',');

  // 2. Registrations where GĐCS is the observer
  const registrations = await client.execute(`
    SELECT r.id as regId, r.isApproved, r.registeredAt,
           s.id as slotId, s.date, s.startTime, s.endTime, s.subjectName, s.className, s.campusName, s.isDoublePeriod, s.status as slotStatus,
           uo.fullName as observerName, c.campusName as observerCampus,
           ut.fullName as teacherTaughtName, dt.name as teacherDeptName,
           e.id as evalId, e.totalScore, e.overallRating
    FROM ObservationRegistration r
    JOIN Teacher ot ON r.teacherId = ot.id
    JOIN User uo ON ot.userId = uo.id
    LEFT JOIN Campus c ON ot.campusId = c.id
    JOIN ObservationSlot s ON r.slotId = s.id
    JOIN Teacher tt ON s.teacherId = tt.id
    JOIN User ut ON tt.userId = ut.id
    LEFT JOIN Department dt ON tt.departmentId = dt.id
    LEFT JOIN ObservationEvaluation e ON e.registrationId = r.id
    WHERE r.teacherId IN (${teacherIds})
    ORDER BY s.date ASC
  `);

  console.log(`\n=== Total Registrations as Observer by GDCS: ${registrations.rows.length} ===`);
  console.table(registrations.rows);

  // Group by GDCS and Month
  const summaryByGDCS = {};
  for (const t of gdcsTeachers.rows) {
    summaryByGDCS[t.fullName] = {
      campus: t.campusName,
      position: t.position,
      teacherCode: t.teacherCode,
      targetPerMonth: 4,
      months: {}
    };
  }

  for (const row of registrations.rows) {
    const d = new Date(row.date);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const name = row.observerName;
    if (!summaryByGDCS[name]) {
      summaryByGDCS[name] = { campus: row.observerCampus, months: {} };
    }
    if (!summaryByGDCS[name].months[m]) {
      summaryByGDCS[name].months[m] = { count: 0, evaluated: 0, details: [] };
    }
    const periods = row.isDoublePeriod ? 2 : 1;
    summaryByGDCS[name].months[m].count += periods;
    if (row.evalId) summaryByGDCS[name].months[m].evaluated += periods;
    summaryByGDCS[name].months[m].details.push({
      date: row.date ? new Date(row.date).toISOString().slice(0, 10) : 'N/A',
      teacherTaught: row.teacherTaughtName,
      subject: row.subjectName,
      className: row.className,
      campus: row.campusName,
      periods,
      rating: row.overallRating || 'Chưa đánh giá',
      score: row.totalScore
    });
  }

  console.log("\n=== TỔNG HỢP THEO GĐCS VÀ THÁNG ===");
  console.log(JSON.stringify(summaryByGDCS, null, 2));

  // Also check if any GDCS was taught (dạy)
  const taughtSlots = await client.execute(`
    SELECT s.id as slotId, s.date, s.startTime, s.endTime, s.subjectName, s.className, s.campusName,
           ut.fullName as teacherTaughtName,
           count(r.id) as observerCount
    FROM ObservationSlot s
    JOIN Teacher tt ON s.teacherId = tt.id
    JOIN User ut ON tt.userId = ut.id
    LEFT JOIN ObservationRegistration r ON r.slotId = s.id
    WHERE s.teacherId IN (${teacherIds})
    GROUP BY s.id
    ORDER BY s.date ASC
  `);
  console.log(`\n=== GDCS Teaching Slots: ${taughtSlots.rows.length} ===`);
  console.table(taughtSlots.rows);
}

main().catch(console.error);
