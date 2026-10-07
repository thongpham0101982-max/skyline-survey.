const { createClient } = require('@libsql/client');
const path = require('path');
const client = createClient({ url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/') });

async function main() {
  const r1 = await client.execute("PRAGMA table_info(AssessmentSubject)");
  console.log("AssessmentSubject columns:", r1.rows.map(x => `${x.name} (${x.type})`));
  
  const r2 = await client.execute("PRAGMA table_info(StudentAssessmentScore)");
  console.log("StudentAssessmentScore columns:", r2.rows.map(x => `${x.name} (${x.type})`));

  const subjects = await client.execute("SELECT id, code, name, subjectType, scoreColumns FROM AssessmentSubject LIMIT 20");
  console.log("Existing AssessmentSubjects:", subjects.rows);
  const r3 = await client.execute("PRAGMA table_info(SubjectGradeConfig)");
  console.log("SubjectGradeConfig columns:", r3.rows.map(x => `${x.name} (${x.type})`));

  const sampleConfigs = await client.execute("SELECT * FROM SubjectGradeConfig LIMIT 2");
  console.log("Sample SubjectGradeConfig:", sampleConfigs.rows);
}
main().catch(console.error);
