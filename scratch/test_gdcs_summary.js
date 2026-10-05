require('dotenv').config();
const { createClient } = require('@libsql/client');
const client = createClient({
  url: process.env.TURSO_DATABASE_URL ? process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://') : '',
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function testGdcsSummary() {
  const teachers = await client.execute(`
    SELECT t.id, u.fullName, t.teacherCode, t.position, u.role, u.email, d.name as deptName, c.campusName, tg.observerType, tg.requiredObserved
    FROM Teacher t
    JOIN User u ON t.userId = u.id
    LEFT JOIN Department d ON t.departmentId = d.id
    LEFT JOIN Campus c ON t.campusId = c.id
    LEFT JOIN TeacherAcademicYearTarget tg ON tg.teacherId = t.id AND tg.academicYearId = 'cmnseevbh0000wjbmoigji2zd'
  `);
  
  const gdcsTeachers = teachers.rows.filter(t => {
    const posUpper = (t.position || '').toUpperCase();
    const roleUpper = (t.role || '').toUpperCase();
    const obsUpper = (t.observerType || '').toUpperCase();
    const deptName = (t.deptName || '').toUpperCase();
    return (
      ['GDCS', 'GĐCS', 'GD_CS', 'GĐ_CS'].includes(posUpper) ||
      posUpper.includes('GIÁM ĐỐC') || posUpper.includes('GIAM DOC') ||
      roleUpper === 'GDCS' ||
      obsUpper === 'GĐCS' || obsUpper === 'GDCS' || obsUpper.includes('GIÁM ĐỐC') ||
      deptName === 'GĐCS'
    );
  });

  const slots = await client.execute(`
    SELECT s.id, s.date, s.startTime, s.endTime, s.subjectName, s.className, s.campusName, s.isDoublePeriod, s.status as slotStatus,
           s.teacherId as hostTeacherId, ut.fullName as hostTeacherName,
           r.id as regId, r.teacherId as observerId, r.isApproved,
           e.id as evalId, e.totalScore, e.overallRating, e.reEvaluationStatus
    FROM ObservationRegistration r
    JOIN ObservationSlot s ON r.slotId = s.id
    JOIN Teacher tt ON s.teacherId = tt.id
    JOIN User ut ON tt.userId = ut.id
    LEFT JOIN ObservationEvaluation e ON e.registrationId = r.id
  `);

  console.log('Total slots with registrations:', slots.rows.length);

  // Group by GDCS for month '2026-09'
  const targetMonth = '2026-09';
  const result = gdcsTeachers.map(g => {
    const gSlots = slots.rows.filter(s => {
      if (s.observerId !== g.id) return false;
      if (!s.date) return false;
      const d = new Date(s.date);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return m === targetMonth;
    });

    let totalAttended = 0;
    let internalCount = 0;
    let crossCount = 0;
    let evaluatedCount = 0;
    let pendingCount = 0;
    let totalScoreSum = 0;

    const details = gSlots.map(s => {
      const inc = s.isDoublePeriod ? 2 : 1;
      totalAttended += inc;
      const isInternal = s.campusName === g.campusName;
      if (isInternal) internalCount += inc; else crossCount += inc;

      const hasEval = s.evalId && s.reEvaluationStatus !== 'DRAFT';
      if (hasEval) {
        evaluatedCount += inc;
        if (s.totalScore) totalScoreSum += (s.totalScore * inc);
      } else {
        pendingCount += inc;
      }

      return {
        id: s.id,
        date: s.date ? new Date(s.date).toISOString().slice(0, 10) : 'N/A',
        teacherName: s.hostTeacherName,
        subject: s.subjectName,
        className: s.className,
        campusName: s.campusName,
        isInternal,
        periods: inc,
        evaluated: !!hasEval,
        score: s.totalScore,
        rating: s.overallRating
      };
    });

    const target = g.requiredObserved || 4;
    const progressPct = Math.round((totalAttended / target) * 100);
    const avgScore = evaluatedCount > 0 ? (totalScoreSum / evaluatedCount).toFixed(1) : null;

    let status = 'Chưa thực hiện';
    if (totalAttended >= target && pendingCount === 0) status = 'Đạt chỉ tiêu';
    else if (totalAttended >= target && pendingCount > 0) status = 'Vượt số lượng (Chờ hoàn tất phiếu)';
    else if (totalAttended > 0) status = 'Đang thực hiện';

    return {
      id: g.id,
      name: g.fullName,
      teacherCode: g.teacherCode,
      position: g.position,
      campus: g.campusName,
      target,
      totalAttended,
      internalCount,
      crossCount,
      evaluatedCount,
      pendingCount,
      avgScore,
      progressPct,
      status,
      details
    };
  });

  console.table(result.map(r => ({
    name: r.name,
    campus: r.campus,
    target: r.target,
    attended: r.totalAttended,
    internal: r.internalCount,
    cross: r.crossCount,
    evaluated: r.evaluatedCount,
    pending: r.pendingCount,
    avgScore: r.avgScore,
    progress: `${r.progressPct}%`,
    status: r.status
  })));
}

testGdcsSummary();
