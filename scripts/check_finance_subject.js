const { createClient } = require('@libsql/client');
const path = require('path');

const LOCAL_DB_PATH = path.resolve(__dirname, '../local.db').replace(/\\/g, '/');
const CLOUD_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const CLOUD_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

async function check(client, name) {
  console.log(`\n=== CHECKING ${name} ===`);
  const subjects = await client.execute("SELECT * FROM SpecialSubject WHERE code = 'FIN_EDU';");
  console.log('FIN_EDU subject:', subjects.rows);
  if (subjects.rows.length > 0) {
    const sId = subjects.rows[0].id;
    const currs = await client.execute({
      sql: "SELECT * FROM SpecialCurriculum WHERE subjectId = ?;",
      args: [sId]
    });
    console.log('Curriculums:', currs.rows);
    for (const c of currs.rows) {
      const vers = await client.execute({
        sql: "SELECT id, versionCode, status FROM SpecialCurriculumVersion WHERE curriculumId = ?;",
        args: [c.id]
      });
      console.log(`  Versions for ${c.code}:`, vers.rows);
      for (const v of vers.rows) {
        const lCount = await client.execute({
          sql: "SELECT count(*) as count, grade FROM SpecialLesson WHERE versionId = ? GROUP BY grade ORDER BY grade;",
          args: [v.id]
        });
        console.log(`    Lessons for version ${v.versionCode}:`, lCount.rows);
      }
    }
  }
}

async function main() {
  const localClient = createClient({ url: `file:${LOCAL_DB_PATH}` });
  await check(localClient, 'LOCAL SQLite');

  const cloudClient = createClient({ url: CLOUD_URL, authToken: CLOUD_TOKEN });
  await check(cloudClient, 'TURSO Cloud');
}

main().catch(console.error);
