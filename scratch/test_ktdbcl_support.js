const { createClient } = require('@libsql/client');
require('dotenv').config();
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function run() {
  const inputK12 = await client.execute(`
    SELECT id, studentCode, enrollmentCode, fullName, className, grade, admissionResult, directorNote, enrollmentStatus, admissionCampus
    FROM InputAssessmentStudent
    WHERE (
      admissionResult LIKE '%cam kết%' OR admissionResult LIKE '%Cam kết%' OR
      directorNote LIKE '%Môn cam kết%' OR directorNote LIKE '%Mon cam ket%' OR
      directorNote LIKE '%cam kết%' OR directorNote LIKE '%Cam kết%'
    )
  `);
  console.log('K12 inputStudents count:', inputK12.rows.length);

  const preschool = await client.execute(`
    SELECT id, studentCode, enrollmentCode, fullName, className, grade, admissionResult, directorNote, enrollmentStatus, admissionCampus
    FROM PreschoolInputAssessmentStudent
    WHERE (
      admissionResult LIKE '%cam kết%' OR admissionResult LIKE '%Cam kết%' OR
      directorNote LIKE '%Môn cam kết%' OR directorNote LIKE '%Mon cam ket%' OR
      directorNote LIKE '%cam kết%' OR directorNote LIKE '%Cam kết%'
    )
  `);
  console.log('Preschool count:', preschool.rows.length);

  // Filter out test accounts
  const realK12 = inputK12.rows.filter(r => !r.fullName.includes('Nguyen B') && r.fullName.trim() !== '');
  console.log('Real K12 count:', realK12.length);

  console.log('Total K12 + Preschool:', inputK12.rows.length + preschool.rows.length);
  console.log('Total Real K12 + Preschool:', realK12.length + preschool.rows.length);

  // Group realK12 by enrollmentStatus
  const byEnroll = {};
  realK12.forEach(r => {
    byEnroll[r.enrollmentStatus] = (byEnroll[r.enrollmentStatus] || 0) + 1;
  });
  console.log('Real K12 by enrollmentStatus:', byEnroll);
}

run().catch(console.error);
