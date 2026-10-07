const { createClient } = require('@libsql/client');
const path = require('path');

const TURSO_URL = "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

async function run() {
  const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  const subs = await client.execute('SELECT id, code, name, subjectType FROM AssessmentSubject;');
  const subMap = new Map(subs.rows.map(r => [r.id, r]));

  const configs = await client.execute('SELECT * FROM InputAssessmentGradeConfig;');
  console.log(`Total configs: ${configs.rows.length}`);

  const bySubject = {};
  for (const c of configs.rows) {
    const s = subMap.get(c.subjectId) || { code: c.subjectId, name: c.subjectId };
    const key = `${s.code} - ${s.name}`;
    if (!bySubject[key]) bySubject[key] = [];
    bySubject[key].push(c);
  }

  for (const [key, list] of Object.entries(bySubject)) {
    console.log(`\n========================================`);
    console.log(`MÔN: ${key} (${list.length} configs)`);
    console.log(`Grades:`, list.map(x => x.grade).join(', '));
    console.log(`Column count:`, list[0].columnCount);
    console.log(`Column names:`, list[0].columnNames);
    console.log(`Column types:`, list[0].columnTypes);
    console.log(`Column max scores:`, list[0].columnMaxScores);
    console.log(`Composite col:`, list[0].compositeColumnName, `(Formula: ${list[0].formula})`);
  }
}

run().catch(console.error);
