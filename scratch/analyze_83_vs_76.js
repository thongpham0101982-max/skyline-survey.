const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const dbFile = path.resolve(__dirname, '../local.db');
const client = createClient({
  url: 'file:' + dbFile.replace(/\\/g, '/')
});

async function main() {
  const academicYearId = 'cmnseevbh0000wjbmoigji2zd';

  const classesRes = await client.execute(`
    SELECT c.id, c.className, c.grade, c.level, c.campusId, cmp.campusCode, cmp.campusName, c.homeroomTeacherId
    FROM Class c
    JOIN Campus cmp ON c.campusId = cmp.id
    WHERE c.academicYearId = '${academicYearId}' AND c.status = 'ACTIVE'
  `);
  const classMap = {};
  classesRes.rows.forEach(c => classMap[c.id] = c);

  const studentsRes = await client.execute(`
    SELECT id, studentCode, studentName, classId, dateOfBirth, status
    FROM Student
    WHERE academicYearId = '${academicYearId}' AND status = 'ACTIVE'
  `);

  const inputRes = await client.execute(`SELECT * FROM InputAssessmentStudent`);
  console.log('Total InputAssessmentStudent in DB:', inputRes.rows.length);

  const cleanString = (str) => {
    if (!str) return '';
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
  };

  const sysCodeMap = {};
  const sysNameMap = {};
  studentsRes.rows.forEach(st => {
    if (st.studentCode) sysCodeMap[st.studentCode.trim().toUpperCase()] = st;
    if (st.studentName) {
      const n = cleanString(st.studentName);
      if (!sysNameMap[n]) sysNameMap[n] = [];
      sysNameMap[n].push(st);
    }
  });

  const isCommitmentCandidate = (cand) => {
    const text = `${cand.admissionResult || ''} ${cand.directorNote || ''} ${cand.admissionCriteria || ''} ${cand.targetType || ''}`.toLowerCase();
    return text.includes('cam kết') || text.includes('cam ket') || text.includes('theo dõi') || text.includes('theo doi') || text.includes('môn cam kết') || text.includes('mon cam ket');
  };

  const allCommittedCands = inputRes.rows.filter(isCommitmentCandidate);
  console.log('Total commitment candidates in InputAssessmentStudent:', allCommittedCands.length);

  // Group by enrollmentStatus
  const statusCounts = {};
  allCommittedCands.forEach(c => {
    statusCounts[c.enrollmentStatus] = (statusCounts[c.enrollmentStatus] || 0) + 1;
  });
  console.log('EnrollmentStatus breakdown of commitment cands:', statusCounts);

  const matchedList = [];
  const unmatchedList = [];

  for (const cand of allCommittedCands) {
    const code = (cand.studentCode || cand.enrollmentCode || '').trim().toUpperCase();
    const name = cleanString(cand.fullName);

    let matchingSt = null;
    if (code && sysCodeMap[code]) matchingSt = sysCodeMap[code];
    else if (name && sysNameMap[name]) matchingSt = sysNameMap[name][0];

    const cls = matchingSt ? classMap[matchingSt.classId] : null;

    const item = {
      candId: cand.id,
      candName: cand.fullName,
      candCode: cand.studentCode || cand.enrollmentCode,
      grade: cand.grade,
      enrollmentStatus: cand.enrollmentStatus,
      admissionResult: cand.admissionResult,
      directorNote: cand.directorNote,
      psychologyScore: cand.psychologyScore,
      matched: !!matchingSt,
      matchedClassName: cls?.className || cand.className || 'Chưa xếp lớp',
      matchedCampus: cls?.campusCode || cand.registeredCampus || cand.admissionCampus || ''
    };

    if (cls && cls.className && !cls.className.toLowerCase().includes('chưa xếp')) {
      matchedList.push(item);
    } else {
      unmatchedList.push(item);
    }
  }

  console.log('\n--- MATCHED WITH ACTIVE CLASS (75/76 HS):', matchedList.length);
  console.log('--- UNMATCHED (11 HS):', unmatchedList.length);

  console.log('\nChi tiết các học sinh UNMATCHED:');
  unmatchedList.forEach((u, idx) => {
    console.log(`${idx + 1}. ${u.candName} (Khối ${u.grade}) - Trạng thái: ${u.enrollmentStatus} - Lớp: ${u.matchedClassName} - Cơ sở: ${u.matchedCampus}`);
    console.log(`   KQ: ${u.admissionResult} | Ghi chú: ${u.directorNote?.substring(0, 80)}`);
  });

  // Check psychology commitment
  console.log('\n--- CHECK CAM KẾT TÂM LÝ ---');
  matchedList.forEach(st => {
    const note = st.directorNote || '';
    const res = st.admissionResult || '';
    const isPsy = /tâm lý|tam ly|psychology|tập trung|hành vi/i.test(note) || /tâm lý|tam ly|psychology/i.test(res);
    if (isPsy) {
      console.log(`[TÂM LÝ] ${st.candName} (${st.matchedClassName}) -> KQ: ${res} | Note: ${note.substring(0, 100)}`);
    }
  });
}

main().catch(console.error);
