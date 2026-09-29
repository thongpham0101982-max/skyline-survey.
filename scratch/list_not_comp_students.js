const { createClient } = require('@libsql/client');
const path = require('path');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  const notComp = await client.execute(`
    SELECT id, studentCode, enrollmentCode, fullName, className, grade, admissionResult, directorNote, admissionCriteria, targetType, enrollmentStatus, registeredCampus, admissionCampus
    FROM InputAssessmentStudent
    WHERE (enrollmentStatus IS NULL OR enrollmentStatus != 'COMPLETED')
      AND fullName NOT LIKE '%Nguyen B%'
      AND (
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

  console.log('--- 9/7 Valid Not Completed Students with CKĐV ---');
  notComp.rows.forEach((r, idx) => {
    console.log(`${idx + 1}. ${r.fullName} | Khối: ${r.grade} | Cơ sở: ${r.admissionCampus || r.registeredCampus || 'Chưa rõ'} | Môn: ${r.directorNote?.replace(/[\r\n]+/g, ' ').substring(0, 45)}`);
  });
}

main().catch(console.error);
