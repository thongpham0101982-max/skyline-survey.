require('dotenv').config();
const { createClient } = require('@libsql/client');
const client = createClient({
  url: process.env.TURSO_DATABASE_URL ? process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://') : '',
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function run() {
  const teachersRes = await client.execute(`
    SELECT t.id, u.fullName as teacherName, t.teacherCode, u.email, t.position, u.role, c.campusName, tg.requiredObserved, tg.observedUnit
    FROM Teacher t
    JOIN User u ON t.userId = u.id
    LEFT JOIN Campus c ON t.campusId = c.id
    LEFT JOIN TeacherAcademicYearTarget tg ON tg.teacherId = t.id AND tg.academicYearId = 'cmnseevbh0000wjbmoigji2zd'
  `);

  const gdcsTeachers = teachersRes.rows.filter(t => {
    const pos = (t.position || '').toUpperCase();
    const role = (t.role || '').toUpperCase();
    return pos.includes('GĐCS') || pos.includes('GDCS') || pos.includes('GIÁM ĐỐC') || role === 'GDCS';
  });

  const slotsRes = await client.execute(`
    SELECT s.id, s.date, s.startTime, s.endTime, s.subjectName, s.className, s.campusName, s.isDoublePeriod, s.status,
           ut.fullName as hostTeacherName, ut.email as hostEmail,
           r.id as regId, r.teacherId as observerId, r.isApproved,
           e.id as evalId, e.totalScore, e.overallRating, e.reEvaluationStatus
    FROM ObservationRegistration r
    JOIN ObservationSlot s ON r.slotId = s.id
    JOIN Teacher tt ON s.teacherId = tt.id
    JOIN User ut ON tt.userId = ut.id
    LEFT JOIN ObservationEvaluation e ON e.registrationId = r.id
  `);

  const activeM = '2026-09';
  const data = gdcsTeachers.map(g => {
    const homeCampus = g.campusName || 'Chưa rõ CS';
    const reqObserved = g.requiredObserved || 4;
    let totalAttended = 0, internalCount = 0, crossCount = 0, evaluatedCount = 0, pendingCount = 0, totalScoreSum = 0;
    const details = [];

    slotsRes.rows.forEach(s => {
      if (s.observerId !== g.id) return;
      if (!s.isApproved) return;
      if (activeM !== 'all') {
        const d = new Date(s.date);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (m !== activeM) return;
      }
      const inc = s.isDoublePeriod ? 2 : 1;
      totalAttended += inc;
      const isInternal = s.campusName === homeCampus;
      if (isInternal) internalCount += inc; else crossCount += inc;

      const hasEval = s.evalId && s.reEvaluationStatus !== 'DRAFT';
      if (hasEval) {
        evaluatedCount += inc;
        if (s.totalScore) totalScoreSum += (s.totalScore * inc);
      } else {
        pendingCount += inc;
      }

      details.push({
        date: s.date ? new Date(s.date).toISOString().slice(0, 10) : 'N/A',
        time: s.startTime,
        hostTeacher: s.hostTeacherName,
        subject: s.subjectName,
        className: s.className,
        campus: s.campusName,
        isInternal,
        periods: inc,
        evaluated: !!hasEval,
        score: s.totalScore,
        rating: s.overallRating
      });
    });

    const progressPct = Math.round((totalAttended / reqObserved) * 100);
    const avgScore = evaluatedCount > 0 ? (totalScoreSum / evaluatedCount).toFixed(1) : null;

    return {
      name: g.teacherName,
      campus: homeCampus,
      reqObserved,
      totalAttended,
      internalCount,
      crossCount,
      evaluatedCount,
      pendingCount,
      avgScore,
      progressPct,
      detailsCount: details.length
    };
  });

  console.table(data);
}

run();
