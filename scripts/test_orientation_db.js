const { createClient } = require("@libsql/client");
const path = require("path");

async function check() {
  const localDb = path.resolve(__dirname, "../local.db").replace(/\\/g, "/");
  const client = createClient({ url: `file:${localDb}` });
  
  const catalog = await client.execute("SELECT gradeGroup, count(id) as count FROM OrientationQuestionCatalog GROUP BY gradeGroup");
  console.log("OrientationQuestionCatalog breakdown:", catalog.rows);

  const sample = await client.execute("SELECT id, gradeGroup, categoryLabel, questionText FROM OrientationQuestionCatalog LIMIT 5");
  console.log("\nSample questions:\n", sample.rows);

  const testStudent = await client.execute("SELECT id, fullName, grade FROM InputAssessmentStudent LIMIT 1");
  console.log("\nSample student:", testStudent.rows[0]);
}

check().catch(console.error);
