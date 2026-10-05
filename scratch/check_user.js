const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({ url: 'file:local.db' });

async function main() {
  const teachers = await client.execute(`
    SELECT t.teacherCode, t.teacherName, t.position, u.role, d.name as deptName, d.code as deptCode, d.divisionCode, d.blockCM
    FROM Teacher t
    JOIN User u ON t.userId = u.id
    LEFT JOIN Department d ON t.departmentId = d.id
    JOIN Campus c ON t.campusId = c.id
    WHERE c.campusCode = 'CS4'
    ORDER BY d.divisionCode, d.name, t.teacherName
  `);

  console.log("=== CS4 TEACHERS BY DEPT & DIVISION ===");
  teachers.rows.forEach(t => {
    console.log(`${t.teacherCode} | ${t.teacherName} | Role: ${t.role} | Pos: ${t.position} | Dept: ${t.deptName} | Div: ${t.divisionCode} | Block: ${t.blockCM}`);
  });
}

main().catch(console.error);
