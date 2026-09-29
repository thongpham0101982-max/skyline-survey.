const { createClient } = require('@libsql/client');
const path = require('path');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  const subjects = await client.execute("SELECT * FROM AssessmentSubject");
  console.log("AssessmentSubject rows:", subjects.rows);

  const sasSample = await client.execute("SELECT * FROM StudentAssessmentScore LIMIT 5");
  console.log("\nStudentAssessmentScore sample scores:", sasSample.rows.map(r => ({
    studentId: r.studentId,
    subjectId: r.subjectId,
    scores: r.scores
  })));

  // Check Student table columns
  const sSchema = await client.execute("PRAGMA table_info(Student)");
  console.log("\nStudent columns:", sSchema.rows.map(r => r.name));

  // Check InputAssessmentStudent
  const iasSchema = await client.execute("PRAGMA table_info(InputAssessmentStudent)");
  console.log("\nInputAssessmentStudent columns:", iasSchema.rows.map(r => r.name));

  const iasSample = await client.execute("SELECT * FROM InputAssessmentStudent LIMIT 3");
  console.log("\nInputAssessmentStudent sample:", iasSample.rows);
}

main().catch(console.error);
