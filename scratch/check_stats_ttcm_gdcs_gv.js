require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL ? process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://') : '',
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  // 1. Fetch Teachers and Users
  const teachersRes = await client.execute(`
    SELECT t.id, t.teacherCode, u.fullName, u.email, u.role, t.position, t.departmentId, d.name as deptName, c.campusName,
           t.requiredObserved, t.observedUnit, t.requiredTaught, t.taughtUnit
    FROM Teacher t
    JOIN User u ON t.userId = u.id
    LEFT JOIN Department d ON t.departmentId = d.id
    LEFT JOIN Campus c ON t.campusId = c.id
  `);

  // 2. Fetch Department Assignments
  const deptAssignRes = await client.execute(`
    SELECT da.teacherId, da.position, da.departmentId, d.name as deptName
    FROM TeacherDepartmentAssignment da
    JOIN Department d ON da.departmentId = d.id
  `);
  const assignMap = new Map();
  deptAssignRes.rows.forEach(r => {
    if (!assignMap.has(r.teacherId)) assignMap.set(r.teacherId, []);
    assignMap.get(r.teacherId).push(r);
  });

  // 3. Fetch Slots, Registrations, Evaluations
  const slotsRes = await client.execute(`
    SELECT s.id, s.date, s.startTime, s.endTime, s.subjectName, s.className, s.campusName, s.isDoublePeriod, s.status, s.teacherId as hostTeacherId,
           s.requestOrigin, s.description, s.topic
    FROM ObservationSlot s
  `);
  const slotMap = new Map();
  slotsRes.rows.forEach(s => slotMap.set(s.id, s));

  const regsRes = await client.execute(`
    SELECT r.id as regId, r.slotId, r.teacherId as observerId, r.isApproved,
           e.id as evalId, e.totalScore, e.overallRating, e.reEvaluationStatus
    FROM ObservationRegistration r
    LEFT JOIN ObservationEvaluation e ON e.registrationId = r.id
  `);

  console.log(`Loaded ${teachersRes.rows.length} teachers, ${slotsRes.rows.length} slots, ${regsRes.rows.length} registrations.`);

  // Classify teachers into:
  // - GĐCS
  // - TTCM
  // - GV (Giáo viên còn lại)
  const gdcsList = [];
  const ttcmList = [];
  const gvList = [];

  teachersRes.rows.forEach(t => {
    const posUpper = (t.position || '').toUpperCase();
    const roleUpper = (t.role || '').toUpperCase();
    const deptUpper = (t.deptName || '').toUpperCase();
    const daList = assignMap.get(t.id) || [];

    const isGDCS = ['GDCS', 'GĐCS', 'GD_CS', 'GĐ_CS'].includes(posUpper) ||
                   posUpper.includes('GIÁM ĐỐC') || posUpper.includes('GIAM DOC') ||
                   roleUpper === 'GDCS' || deptUpper === 'GĐCS' ||
                   daList.some(da => (da.position || '').toUpperCase().includes('GĐCS') || (da.deptName || '').toUpperCase() === 'GĐCS');

    const isTTCM = !isGDCS && (
                   ['TTCM', 'TO_TRUONG', 'TO_PHO', 'TPCM'].includes(posUpper) ||
                   posUpper.includes('TỔ TRƯỞNG') || posUpper.includes('TO TRUONG') ||
                   posUpper.includes('TỔ PHÓ') || posUpper.includes('TO PHO') ||
                   roleUpper === 'TTCM' ||
                   daList.some(da => {
                     const p = (da.position || '').toUpperCase();
                     return p.includes('TTCM') || p.includes('TỔ TRƯỞNG') || p.includes('TỔ PHÓ');
                   }));

    if (isGDCS) {
      gdcsList.push(t);
    } else if (isTTCM) {
      ttcmList.push(t);
    } else {
      gvList.push(t);
    }
  });

  console.log(`\nPhân nhóm nhân sự:`);
  console.log(`- GĐCS (Giám đốc cơ sở): ${gdcsList.length}`);
  console.log(`- TTCM (Tổ trưởng / Tổ phó chuyên môn): ${ttcmList.length}`);
  console.log(`- GV (Giáo viên giảng dạy): ${gvList.length}`);

  // Helper to compute stats for a group of teachers
  function computeGroupStats(teacherList, groupName) {
    let totalAssignedOrAttended = 0; // Số tiết đăng ký/tham gia dự
    let totalEvaluated = 0;          // Số tiết đã hoàn tất phiếu đánh giá
    let totalPending = 0;            // Số tiết chờ hoàn tất phiếu
    let totalSurprise = 0;           // Số tiết dự đột xuất
    let totalInternal = 0;           // Dự nội bộ cơ sở
    let totalCross = 0;              // Dự chéo cơ sở
    let sumScore = 0;
    let evalCountForScore = 0;

    const teacherStats = teacherList.map(t => {
      const myRegs = regsRes.rows.filter(r => r.observerId === t.id && (r.isApproved || r.evalId));
      let attended = 0;
      let evaluated = 0;
      let pending = 0;
      let surprise = 0;
      let internal = 0;
      let cross = 0;

      myRegs.forEach(r => {
        const slot = slotMap.get(r.slotId);
        if (!slot) return;
        const inc = slot.isDoublePeriod ? 2 : 1;
        const isSurprise = slot.requestOrigin === 'SURPRISE' || (slot.description && slot.description.includes('đột xuất')) || (slot.topic && slot.topic.includes('đột xuất'));
        const hasEval = r.evalId && r.reEvaluationStatus !== 'DRAFT';
        const isInternal = slot.campusName === t.campusName;

        attended += inc;
        if (isSurprise) surprise += inc;
        if (isInternal) internal += inc; else cross += inc;

        if (hasEval) {
          evaluated += inc;
          if (r.totalScore !== null && r.totalScore !== undefined) {
            sumScore += (r.totalScore * inc);
            evalCountForScore += inc;
          }
        } else {
          pending += inc;
        }
      });

      totalAssignedOrAttended += attended;
      totalEvaluated += evaluated;
      totalPending += pending;
      totalSurprise += surprise;
      totalInternal += internal;
      totalCross += cross;

      return {
        id: t.id,
        name: t.fullName,
        code: t.teacherCode,
        campus: t.campusName || 'N/A',
        dept: t.deptName || 'N/A',
        attended,
        evaluated,
        pending,
        surprise,
        internal,
        cross
      };
    });

    const avgScore = evalCountForScore > 0 ? (sumScore / evalCountForScore).toFixed(2) : 'N/A';

    return {
      groupName,
      count: teacherList.length,
      totalAssignedOrAttended,
      totalEvaluated,
      totalPending,
      totalSurprise,
      totalInternal,
      totalCross,
      avgScore,
      teacherStats
    };
  }

  const gdcsStats = computeGroupStats(gdcsList, 'GĐCS (Giám đốc Cơ sở)');
  const ttcmStats = computeGroupStats(ttcmList, 'TTCM (Tổ trưởng Chuyên môn)');
  const gvStats = computeGroupStats(gvList, 'GV (Giáo viên Bộ môn)');

  console.log('\n======================================================');
  console.log('TỔNG HỢP TOÀN HỆ THỐNG VỀ TIẾT DỰ GIỜ THEO 3 NHÓM');
  console.log('======================================================');
  console.table([
    {
      'Nhóm vai trò': gdcsStats.groupName,
      'Số lượng': gdcsStats.count,
      'Tổng tiết dự': gdcsStats.totalAssignedOrAttended,
      'Đã hoàn thành phiếu': gdcsStats.totalEvaluated,
      'Chờ hoàn thành': gdcsStats.totalPending,
      'Đột xuất': gdcsStats.totalSurprise,
      'Nội bộ CS': gdcsStats.totalInternal,
      'Chéo CS': gdcsStats.totalCross,
      'Điểm TB': gdcsStats.avgScore
    },
    {
      'Nhóm vai trò': ttcmStats.groupName,
      'Số lượng': ttcmStats.count,
      'Tổng tiết dự': ttcmStats.totalAssignedOrAttended,
      'Đã hoàn thành phiếu': ttcmStats.totalEvaluated,
      'Chờ hoàn thành': ttcmStats.totalPending,
      'Đột xuất': ttcmStats.totalSurprise,
      'Nội bộ CS': ttcmStats.totalInternal,
      'Chéo CS': ttcmStats.totalCross,
      'Điểm TB': ttcmStats.avgScore
    },
    {
      'Nhóm vai trò': gvStats.groupName,
      'Số lượng': gvStats.count,
      'Tổng tiết dự': gvStats.totalAssignedOrAttended,
      'Đã hoàn thành phiếu': gvStats.totalEvaluated,
      'Chờ hoàn thành': gvStats.totalPending,
      'Đột xuất': gvStats.totalSurprise,
      'Nội bộ CS': gvStats.totalInternal,
      'Chéo CS': gvStats.totalCross,
      'Điểm TB': gvStats.avgScore
    }
  ]);

  console.log('\n=== CHI TIẾT GĐCS ===');
  console.table(gdcsStats.teacherStats.filter(t => t.attended > 0 || gdcsList.length <= 10).map(t => ({
    'Họ và tên': t.name,
    'Mã': t.code,
    'Cơ sở': t.campus,
    'Tổng tiết dự': t.attended,
    'Đã đánh giá': t.evaluated,
    'Chưa nộp phiếu': t.pending,
    'Đột xuất': t.surprise,
    'Nội bộ': t.internal,
    'Chéo CS': t.cross
  })));

  console.log('\n=== TOP TTCM CÓ TIẾT DỰ ===');
  console.table(ttcmStats.teacherStats.filter(t => t.attended > 0).sort((a,b) => b.attended - a.attended).map(t => ({
    'Họ và tên': t.name,
    'Mã': t.code,
    'Tổ CM': t.dept,
    'Cơ sở': t.campus,
    'Tổng tiết dự': t.attended,
    'Đã đánh giá': t.evaluated,
    'Chưa nộp phiếu': t.pending
  })));
}

main().catch(console.error);
