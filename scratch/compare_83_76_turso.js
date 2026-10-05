const { createClient } = require('@libsql/client');
require('dotenv').config();
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function compare83and76() {
  // Query all candidates with any commitment / monitoring note or result
  const res = await client.execute(`
    SELECT id, studentCode, enrollmentCode, fullName, className, grade, admissionResult, directorNote, admissionCriteria, targetType, enrollmentStatus, registeredCampus, admissionCampus, createdAt
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
      targetType LIKE '%theo dõi%' OR targetType LIKE '%theo doi%'
    )
  `);

  console.log('Total candidate rows found:', res.rows.length);

  // Group by enrollmentStatus
  const completed = res.rows.filter(r => r.enrollmentStatus === 'COMPLETED');
  console.log('Completed (đã hoàn tất nhập học):', completed.length);

  const notCompleted = res.rows.filter(r => r.enrollmentStatus !== 'COMPLETED');
  console.log('Not Completed (chưa hoàn tất nhập học / bỏ học / chưa nộp hồ sơ):', notCompleted.length);

  // Exclude test accounts like Nguyen B
  const validTotal = res.rows.filter(r => !r.fullName.includes('Nguyen B') && r.fullName.trim() !== '');
  console.log('Valid total records (excluding test):', validTotal.length);

  // Check unique students by name
  const uniqueNames = new Set(validTotal.map(r => r.fullName.trim().toLowerCase()));
  console.log('Unique student names count:', uniqueNames.size);

  console.log('\n--- The difference between total candidates (83~85) and completed (76) ---');
  notCompleted.forEach((r, idx) => {
    console.log(`${idx + 1}. ${r.fullName} (Khối ${r.grade}, ${r.admissionCampus || r.registeredCampus || 'Chưa rõ'}) | Status: ${r.enrollmentStatus || 'NULL'} | Result: ${r.admissionResult}`);
  });
}

compare83and76().catch(console.error);
