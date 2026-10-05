require('dotenv').config();
const { createClient } = require('@libsql/client');
const client = createClient({
  url: 'file:local.db'
});

async function run() {
  const teachersRes = await client.execute(`
    SELECT t.id, t.teacherCode, t.teacherName, t.position, t.departmentId, t.campusId,
           d.name as deptName, c.campusName, tg.observerType, tg.requiredObserved, tg.observedUnit
    FROM Teacher t
    LEFT JOIN Department d ON t.departmentId = d.id
    LEFT JOIN Campus c ON t.campusId = c.id
    LEFT JOIN TeacherAcademicYearTarget tg ON tg.teacherId = t.id AND tg.academicYearId = 'cmnseevbh0000wjbmoigji2zd'
  `);

  const slotsRes = await client.execute(`
    SELECT s.id, s.date, s.isDoublePeriod, s.requestOrigin, s.description, s.topic, s.campusName, s.campusId, s.teacherId,
           c.campusName as campusRefName
    FROM ObservationSlot s
    LEFT JOIN Campus c ON s.campusId = c.id
  `);

  const regsRes = await client.execute(`
    SELECT r.id, r.slotId, r.teacherId, r.isApproved, e.id as evalId, e.reEvaluationStatus
    FROM ObservationRegistration r
    LEFT JOIN ObservationEvaluation e ON e.registrationId = r.id
  `);

  const slots = slotsRes.rows.map(s => {
    return {
      ...s,
      registrations: regsRes.rows.filter(r => r.slotId === s.id)
    };
  });

  const getSlotCampusName = (slot) => {
    if (slot.campusName) return slot.campusName;
    if (slot.campusRefName) return slot.campusRefName;
    return "Cơ sở chưa rõ";
  };

  const isSurpriseSlot = (slot) => {
    return slot.requestOrigin === "SURPRISE" ||
      (typeof slot.description === "string" && (slot.description.includes("[SURPRISE]") || slot.description.toLowerCase().includes("dự giờ đột xuất"))) ||
      (typeof slot.topic === "string" && slot.topic.toLowerCase().includes("đột xuất"));
  };

  // Test for Tống Thiên Long and Phạm Thị Khánh and Trần Thị Thanh
  const targetTeachers = teachersRes.rows.filter(t => 
    t.teacherName.includes('Tống Thiên Long') || 
    t.teacherName.includes('Phạm Thị Khánh') || 
    t.teacherName.includes('Trần Thị Thanh') ||
    t.teacherName.includes('Lê Thành Danh')
  );

  console.log('Testing ttcmMatrixData logic:');
  targetTeachers.forEach(ttcm => {
    let totalObserved = 0;
    const campusStats = {};

    slots.forEach(slot => {
      // activeMonth === "all"
      const isSurprise = isSurpriseSlot(slot);
      const increment = slot.isDoublePeriod ? 2 : 1;

      slot.registrations?.forEach((reg) => {
        if (reg.teacherId === ttcm.id && (reg.isApproved == 1 || reg.isApproved === true)) {
          const observedCampus = getSlotCampusName(slot);
          if (!campusStats[observedCampus]) campusStats[observedCampus] = 0;
          campusStats[observedCampus] += increment;
          totalObserved += increment;
        }
      });
    });

    console.log(`${ttcm.teacherName} (${ttcm.id}): Total = ${totalObserved}`, campusStats);
  });
}
run();
