const { createClient } = require('@libsql/client');
require('dotenv').config();
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function run() {
  const allCk = await client.execute(`
    SELECT id, studentCode, enrollmentCode, fullName, className, grade, admissionResult, directorNote, enrollmentStatus, registeredCampus, admissionCampus
    FROM InputAssessmentStudent
    WHERE admissionResult LIKE '%cam kết%' OR admissionResult LIKE '%theo dõi%' 
       OR directorNote LIKE '%cam kết%' OR directorNote LIKE '%theo dõi%' 
       OR directorNote LIKE '%Môn cam kết%'
  `);
  console.log('Total records matching "cam kết":', allCk.rows.length);

  const completed = allCk.rows.filter(r => r.enrollmentStatus === 'COMPLETED');
  console.log('Completed:', completed.length);
  const notCompleted = allCk.rows.filter(r => r.enrollmentStatus !== 'COMPLETED');
  console.log('Not completed:', notCompleted.length);

  // Group by exact admissionResult
  const byResult = {};
  allCk.rows.forEach(r => {
    byResult[r.admissionResult] = (byResult[r.admissionResult] || 0) + 1;
  });
  console.log('By admissionResult:', byResult);

  // Filter out test accounts
  const realNotComp = notCompleted.filter(r => !r.fullName.includes('Nguyen B') && r.fullName.trim() !== '');
  console.log('Real non-test Not Completed:', realNotComp.length);
  realNotComp.forEach(r => {
    console.log(` - ${r.fullName} (K${r.grade}, ${r.admissionCampus || r.registeredCampus}) | Result: ${r.admissionResult} | Status: ${r.enrollmentStatus}`);
  });

  // Check how many have admissionResult = 'Đạt cam kết'
  const datCamKetOnly = allCk.rows.filter(r => r.admissionResult === 'Đạt cam kết');
  console.log('\nExact admissionResult = "Đạt cam kết":', datCamKetOnly.length);
  console.log('  - COMPLETED:', datCamKetOnly.filter(r => r.enrollmentStatus === 'COMPLETED').length);
  console.log('  - NOT COMPLETED:', datCamKetOnly.filter(r => r.enrollmentStatus !== 'COMPLETED').length);
}

run().catch(console.error);
