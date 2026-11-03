const { createClient } = require('@libsql/client');

const CLOUD_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const CLOUD_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const client = createClient({ url: CLOUD_URL, authToken: CLOUD_TOKEN });

async function main() {
  console.log("=== CHECKING DEPARTMENTS ===");
  const depts = await client.execute("SELECT id, name, code FROM Department;");
  console.log(`Departments (${depts.rows.length}):`);
  depts.rows.forEach(d => console.log(`  [${d.id}] ${d.code} - ${d.name}`));

  console.log("\n=== CHECKING TEACHERS IN TLHN OR TAM LY ===");
  const teachers = await client.execute(`
    SELECT t.id, t.teacherName, t.email, t.position, t.positions, t.departmentId, d.name as deptName, u.fullName as uName, u.email as uEmail, u.role as uRole
    FROM Teacher t
    LEFT JOIN Department d ON t.departmentId = d.id
    LEFT JOIN User u ON t.userId = u.id
    WHERE t.position LIKE '%TLHN%' 
       OR t.positions LIKE '%TLHN%' 
       OR d.name LIKE '%TLHN%'
       OR d.name LIKE '%Tâm lý%'
       OR d.name LIKE '%tâm lý%'
       OR t.teacherName LIKE '%Tâm lý%'
       OR u.fullName LIKE '%Tâm lý%'
       OR u.role LIKE '%TLHN%'
       OR u.email LIKE '%tlhn%';
  `);
  console.log(`Matching teachers (${teachers.rows.length}):`);
  teachers.rows.forEach(t => {
    console.log(`  - [${t.id}] ${t.teacherName} | email: ${t.email || t.uEmail} | dept: ${t.deptName} | pos: ${t.position} / ${t.positions} | role: ${t.uRole}`);
  });

  console.log("\n=== ALL DISTINCT DEPARTMENTS IN TEACHER TABLE ===");
  const teacherDepts = await client.execute(`
    SELECT DISTINCT d.id, d.name, d.code, count(t.id) as teacherCount
    FROM Teacher t
    LEFT JOIN Department d ON t.departmentId = d.id
    GROUP BY d.id;
  `);
  teacherDepts.rows.forEach(td => {
    console.log(`  Dept: ${td.name || 'NULL'} (${td.code || 'NO_CODE'}) - count: ${td.teacherCount}`);
  });

  console.log("\n=== CHECKING ALL TEACHERS IN THE SYSTEM (first 40) ===");
  const allTeachers = await client.execute(`
    SELECT t.id, t.teacherName, t.email, t.position, d.name as deptName
    FROM Teacher t
    LEFT JOIN Department d ON t.departmentId = d.id
    LIMIT 40;
  `);
  allTeachers.rows.forEach(t => {
    console.log(`  ${t.teacherName} (${t.email}) - Dept: ${t.deptName || 'None'} - Pos: ${t.position || 'None'}`);
  });
}

main().catch(console.error);
