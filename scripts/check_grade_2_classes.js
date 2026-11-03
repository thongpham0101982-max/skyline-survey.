const { createClient } = require("@libsql/client");
const path = require("path");

const LOCAL_DB_PATH = path.resolve(__dirname, "../local.db").replace(/\\/g, "/");
const client = createClient({ url: `file:${LOCAL_DB_PATH}` });

async function check() {
  const classes = await client.execute({
    sql: `SELECT id, className, grade, campusId, homeroomTeacherId FROM "Class" WHERE grade IN ('2', 2) AND status = 'ACTIVE';`
  });
  console.log("Active Grade 2 classes:", classes.rows.length);
  for (const c of classes.rows) {
    console.log(`- ${c.className} (ID: ${c.id}, Campus: ${c.campusId}, Teacher: ${c.homeroomTeacherId})`);
  }

  const existingAssign = await client.execute({
    sql: `SELECT * FROM "SpecialTeachingAssignment" WHERE subjectId = 'spec_sub_fin_edu';`
  });
  console.log("Total FIN_EDU assignments:", existingAssign.rows.length);

  // Check GradeConfig for Grade 2
  const cfg = await client.execute({
    sql: `SELECT * FROM "SpecialSubjectGradeConfig" WHERE grade = '2' AND versionId = 'spec_ver_fin_v1_0';`
  });
  console.log("Grade 2 config in spec_ver_fin_v1_0:", cfg.rows);
}

check().catch(console.error);
