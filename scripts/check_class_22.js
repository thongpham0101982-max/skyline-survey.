const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function checkClass22() {
  console.log("=== Find Class 2.2_CS1 ===");
  const classes = await client.execute(`SELECT * FROM Class WHERE className LIKE '%2.2%CS1%' OR className = '2.2_CS1'`);
  console.log("Classes:", classes.rows);

  if (classes.rows.length > 0) {
    const classId = classes.rows[0].id;
    console.log("\n=== Teaching assignments for 2.2_CS1 ===");
    const tas = await client.execute({
      sql: `SELECT ta.*, t.teacherName, t.teacherCode, s.subjectName 
            FROM TeachingAssignment ta 
            LEFT JOIN Teacher t ON ta.teacherId = t.id 
            LEFT JOIN Subject s ON ta.subjectId = s.id 
            WHERE ta.classId = ?`,
      args: [classId]
    });
    console.log("TeachingAssignment:", tas.rows);

    console.log("\n=== SpecialTeachingAssignment for 2.2_CS1 ===");
    const stas = await client.execute({
      sql: `SELECT sta.*, t.teacherName, t.teacherCode 
            FROM SpecialTeachingAssignment sta 
            LEFT JOIN Teacher t ON sta.teacherId = t.id 
            WHERE sta.classId = ?`,
      args: [classId]
    });
    console.log("SpecialTeachingAssignment:", stas.rows);
  }

  console.log("\n=== Who is assigned to spec_sub_cxxh in grade 2? ===");
  const allSel2 = await client.execute(`
    SELECT sta.*, t.teacherName, t.teacherCode, c.className 
    FROM SpecialTeachingAssignment sta 
    LEFT JOIN Teacher t ON sta.teacherId = t.id 
    LEFT JOIN Class c ON sta.classId = c.id 
    WHERE sta.subjectId = 'spec_sub_cxxh' OR sta.subjectId LIKE '%sel%' OR sta.subjectId LIKE '%cxxh%'
  `);
  console.log("All SEL/CXXH assignments:", allSel2.rows);

  console.log("\n=== All Teaching Assignments for SEL subject in Subject table ===");
  const selSubs = await client.execute(`SELECT * FROM Subject WHERE subjectName LIKE '%SEL%' OR subjectName LIKE '%Cảm xúc%'`);
  console.log("SEL Subjects:", selSubs.rows);
  if (selSubs.rows.length > 0) {
    const subIds = selSubs.rows.map(s => `'${s.id}'`).join(',');
    const selTas = await client.execute(`
      SELECT ta.*, t.teacherName, t.teacherCode, c.className 
      FROM TeachingAssignment ta 
      LEFT JOIN Teacher t ON ta.teacherId = t.id 
      LEFT JOIN Class c ON ta.classId = c.id 
      WHERE ta.subjectId IN (${subIds})
    `);
    console.log("TeachingAssignment for SEL subjects:", selTas.rows);
  }
}

checkClass22().catch(console.error);
