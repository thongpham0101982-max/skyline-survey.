const { createClient } = require("@libsql/client");

const client = createClient({
  url: "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw"
});

async function verify() {
  const tables = [
    "ImportBatch",
    "SubjectCompetency",
    "SubjectAlias",
    "SubjectCompetencyAlias",
    "StagingCompetencyAssessment",
    "StudentCompetencyAssessment",
    "StudentSubjectCompetencySummary",
    "ImportMappingConfig"
  ];

  console.log("Checking tables in Turso Production DB...");
  for (const table of tables) {
    try {
      const res = await client.execute(`SELECT count(*) as cnt FROM "${table}"`);
      console.log(`✓ Table "${table}" exists. Rows:`, res.rows[0].cnt);
    } catch (e) {
      console.error(`✗ Table "${table}" error:`, e.message);
    }
  }
}

verify().catch(console.error);
