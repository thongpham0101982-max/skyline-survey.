const { createClient } = require('@libsql/client');
const path = require('path');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  // Check tables
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
  console.log("Tables:", tables.rows.map(r => r.name));

  // Check StudentAssessmentScore columns
  const schema = await client.execute("PRAGMA table_info(StudentAssessmentScore)");
  console.log("\nStudentAssessmentScore columns:", schema.rows.map(r => `${r.name} (${r.type})`));

  // Check some sample records for English in StudentAssessmentScore
  const engScores = await client.execute(`
    SELECT * FROM StudentAssessmentScore 
    WHERE subjectName LIKE '%Anh%' OR subjectCode LIKE '%ENG%' OR subjectCode LIKE '%EPT%'
    LIMIT 10
  `);
  console.log("\nSample English StudentAssessmentScore:", engScores.rows);
}

main().catch(console.error);
