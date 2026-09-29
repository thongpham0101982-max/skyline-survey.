const { createClient } = require('@libsql/client');
const path = require('path');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  const qAll = await client.execute(`
    SELECT id, studentCode, enrollmentCode, fullName, className, grade, admissionResult, directorNote, admissionCriteria, targetType, enrollmentStatus, registeredCampus, admissionCampus, periodId
    FROM InputAssessmentStudent
    WHERE (
      admissionResult LIKE '%cam kết%' OR admissionResult LIKE '%cam ket%' OR
      admissionResult LIKE '%theo dõi%' OR admissionResult LIKE '%theo doi%' OR
      directorNote LIKE '%cam kết%' OR directorNote LIKE '%cam ket%' OR
      directorNote LIKE '%theo dõi%' OR directorNote LIKE '%theo doi%' OR
      directorNote LIKE '%Môn cam kết%' OR directorNote LIKE '%Mon cam ket%' OR
      admissionCriteria LIKE '%cam kết%' OR admissionCriteria LIKE '%cam ket%' OR
      admissionCriteria LIKE '%theo dõi%' OR admissionCriteria LIKE '%theo doi%' OR
      targetType LIKE '%cam kết%' OR targetType LIKE '%cam ket%' OR
      targetType LIKE '%theo dõi%' OR targetType LIKE '%theo doi%' OR
      targetType LIKE '%CAM_KET%' OR targetType LIKE '%THEO_DOI%'
    )
  `);

  console.log('=== All 86 Commitment Records ===');
  console.log('Completed count:', qAll.rows.filter(r => r.enrollmentStatus === 'COMPLETED').length);
  console.log('Not Completed count:', qAll.rows.filter(r => r.enrollmentStatus !== 'COMPLETED').length);

  // Check if any of the not completed actually attend school (in Student table)
  const systemStudents = await client.execute("SELECT id, studentCode, studentName, classId, status FROM Student WHERE status='ACTIVE'");
  const sysMap = {};
  systemStudents.rows.forEach(s => {
    if (s.studentCode) sysMap[s.studentCode.trim().toUpperCase()] = s;
    if (s.studentName) sysMap[s.studentName.trim().toLowerCase()] = s;
  });

  console.log('\n--- The 10 "Not Completed" students: do they exist in Student table? ---');
  const notComp = qAll.rows.filter(r => r.enrollmentStatus !== 'COMPLETED');
  let attendedInNotComp = 0;
  notComp.forEach(r => {
    const c = (r.studentCode || r.enrollmentCode || '').trim().toUpperCase();
    const n = (r.fullName || '').trim().toLowerCase();
    const inSys = sysMap[c] || sysMap[n];
    if (inSys) attendedInNotComp++;
    console.log(`  ${r.fullName} (Grade ${r.grade}) -> In Student table: ${inSys ? 'YES (classId: ' + inSys.classId + ')' : 'NO'}`);
  });

  console.log('Attended among Not Completed:', attendedInNotComp);

  // Total attended in Student table:
  // 76 completed + attendedInNotComp = ?
  const totalAttendedFromCommitments = 76 + attendedInNotComp;
  console.log(`76 completed + ${attendedInNotComp} attending from not-completed = ${totalAttendedFromCommitments}`);

  // What about 86 minus test accounts?
  // If 86 minus 3 test/bogus records = 83!
  // Let's check if there are 83 valid student records in total!
  const valid83 = qAll.rows.filter(r => !r.fullName.includes('Nguyen B') && r.fullName.trim() !== '');
  console.log('Valid non-test records count:', valid83.length);

  // Also check if any record in Student table has learning commitment or targetType
}

main().catch(console.error);
