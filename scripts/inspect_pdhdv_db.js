const { createClient } = require("@libsql/client");
const path = require("path");

async function run() {
  const localDb = path.resolve(__dirname, "../local.db").replace(/\\/g, "/");
  const client = createClient({ url: `file:${localDb}` });
  
  const existingConfig = await client.execute("SELECT grade, columnNames FROM InputAssessmentGradeConfig WHERE subjectId = 'subj_dinh_huong_dau_vao'");
  console.log("Total PDHDV Configs in DB:", existingConfig.rows.length);
  existingConfig.rows.forEach(r => console.log(r.grade, "->", r.columnNames));
}

run().catch(console.error);
