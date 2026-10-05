require('dotenv').config();
const { createClient } = require('@libsql/client');
const client = createClient({
  url: process.env.TURSO_DATABASE_URL ? process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://') : '',
  authToken: process.env.TURSO_AUTH_TOKEN
});
async function main() {
  const teachers = await client.execute(`
    SELECT t.id, u.fullName, t.teacherCode, t.position, u.role, d.name as deptName, c.campusName, tg.observerType, tg.requiredObserved
    FROM Teacher t
    JOIN User u ON t.userId = u.id
    LEFT JOIN Department d ON t.departmentId = d.id
    LEFT JOIN Campus c ON t.campusId = c.id
    LEFT JOIN TeacherAcademicYearTarget tg ON tg.teacherId = t.id AND tg.academicYearId = 'cmnseevbh0000wjbmoigji2zd'
  `);
  
  const gdcsList = teachers.rows.filter(t => {
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
  console.log('Detected GDCS teachers count:', gdcsList.length);
  console.table(gdcsList);
}
main();
