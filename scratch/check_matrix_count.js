const { createClient } = require('@libsql/client');
const path = require('path');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  const academicYearId = 'cmnseevbh0000wjbmoigji2zd';

  // 1. All active classes for 2026-2027
  const classesRes = await client.execute(`
    SELECT c.id, c.className, c.grade, c.level, c.campusId, cmp.campusCode, cmp.campusName, c.homeroomTeacherId
    FROM Class c
    JOIN Campus cmp ON c.campusId = cmp.id
    WHERE c.academicYearId = '${academicYearId}' AND c.status = 'ACTIVE'
  `);
  const classMap = {};
  classesRes.rows.forEach(c => classMap[c.id] = c);

  // 2. All active students in 2026-2027
  const studentsRes = await client.execute(`
    SELECT id, studentCode, studentName, classId
    FROM Student
    WHERE academicYearId = '${academicYearId}' AND status = 'ACTIVE'
  `);
  
  // 3. Input assessment periods for 2026-2027
  const periodsRes = await client.execute(`
    SELECT id FROM InputAssessmentPeriod WHERE academicYearId = '${academicYearId}'
  `);
  const periodIds = periodsRes.rows.map(p => p.id);

  // 4. Query InputAssessmentStudent matching commitment
  const inputCommitmentConditions = `
    (admissionResult LIKE '%cam kết%' OR admissionResult LIKE '%Cam kết%' OR
     admissionResult LIKE '%theo dõi%' OR admissionResult LIKE '%Theo dõi%' OR
     directorNote LIKE '%Môn cam kết%' OR directorNote LIKE '%Mon cam ket%' OR
     directorNote LIKE '%cam kết%' OR directorNote LIKE '%Cam kết%' OR
     directorNote LIKE '%theo dõi%' OR directorNote LIKE '%Theo dõi%' OR
     targetType LIKE '%cam kết%' OR targetType LIKE '%theo dõi%' OR
     admissionCriteria LIKE '%cam kết%' OR admissionCriteria LIKE '%theo dõi%')
  `;

  const inputRes = await client.execute(`
    SELECT * FROM InputAssessmentStudent
    WHERE ${inputCommitmentConditions}
  `);

  console.log('Total InputAssessmentStudent matching conditions:', inputRes.rows.length);

  // Helper clean
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

  const processedKeys = new Set();
  const matchedMatrix = [];

  for (const cand of inputRes.rows) {
    // Match with active student in class
    const code = (cand.studentCode || cand.enrollmentCode || '').trim().toUpperCase();
    const name = cleanString(cand.fullName);

    let matchingSt = null;
    if (code && sysCodeMap[code]) matchingSt = sysCodeMap[code];
    else if (name && sysNameMap[name]) matchingSt = sysNameMap[name][0];

    const cls = matchingSt ? classMap[matchingSt.classId] : null;

    if (!cls) continue;
    const cName = (cls.className || '').trim().toLowerCase();
    if (!cName || cName === 'chưa xếp lớp' || cName.includes('chưa xếp')) continue;

    const stKey = matchingSt.id || code || name;
    if (processedKeys.has(stKey)) continue;
    processedKeys.add(stKey);

    matchedMatrix.push({
      candName: cand.fullName,
      candCode: cand.studentCode,
      sysName: matchingSt.studentName,
      sysCode: matchingSt.studentCode,
      className: cls.className,
      grade: cls.grade,
      campus: cls.campusCode,
      enrollmentStatus: cand.enrollmentStatus
    });
  }

  console.log('--- EXACT ksdvMatrix count in current active classes ---:', matchedMatrix.length);
  const byEnroll = {};
  matchedMatrix.forEach(m => byEnroll[m.enrollmentStatus] = (byEnroll[m.enrollmentStatus] || 0) + 1);
  console.log('Breakdown by enrollmentStatus in active classes:', byEnroll);

  // What about if cand itself has className or enrollmentClass?
  const allCandWithClass = [];
  const processedCandKeys = new Set();
  for (const cand of inputRes.rows) {
    const code = (cand.studentCode || cand.enrollmentCode || '').trim().toUpperCase();
    const name = cleanString(cand.fullName);
    let matchingSt = null;
    if (code && sysCodeMap[code]) matchingSt = sysCodeMap[code];
    else if (name && sysNameMap[name]) matchingSt = sysNameMap[name][0];

    const cls = matchingSt ? classMap[matchingSt.classId] : null;
    const effectiveClass = cls?.className || cand.className;

    if (!effectiveClass || effectiveClass.toLowerCase().includes('chưa xếp') || effectiveClass === 'null') {
      // no class
    } else {
      const k = cand.id;
      if (!processedCandKeys.has(k)) {
        processedCandKeys.add(k);
        allCandWithClass.push({
          id: cand.id,
          name: cand.fullName,
          effectiveClass,
          grade: cand.grade,
          enrollmentStatus: cand.enrollmentStatus
        });
      }
    }
  }
  console.log('All candidates with an assigned class (either in Student or in InputAssessment):', allCandWithClass.length);
}

main().catch(console.error);
