const { createClient } = require('@libsql/client');
const path = require('path');

const LOCAL_DB_PATH = path.resolve(__dirname, '../local.db').replace(/\\/g, '/');
const client = createClient({ url: `file:${LOCAL_DB_PATH}` });

async function check() {
  const classes = await client.execute({
    sql: `SELECT id, className, grade, campusId, homeroomTeacherId FROM "Class" WHERE grade IN ('3', 3) AND status = 'ACTIVE';`
  });
  console.log('Active Grade 3 classes count:', classes.rows.length);
  for (const c of classes.rows) {
    console.log(`- ${c.className} (ID: ${c.id}, Campus: ${c.campusId}, Teacher: ${c.homeroomTeacherId})`);
  }

  const existingAssign = await client.execute({
    sql: `SELECT a.id, c.className, c.grade, a.teacherId 
          FROM "SpecialTeachingAssignment" a
          JOIN "Class" c ON a.classId = c.id
          WHERE a.subjectId = 'spec_sub_fin_edu' AND c.grade IN ('3', 3);`
  });
  console.log('Existing FIN_EDU assignments for Grade 3:', existingAssign.rows.length);

  const cfg = await client.execute({
    sql: `SELECT * FROM "SpecialSubjectGradeConfig" WHERE grade = '3' AND versionId = 'spec_ver_fin_v1_0';`
  });
  console.log('Grade 3 config in spec_ver_fin_v1_0:', cfg.rows);
}

check().catch(console.error);
