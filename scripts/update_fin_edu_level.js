const { createClient } = require('@libsql/client');
const path = require('path');

const LOCAL_DB_PATH = path.resolve(__dirname, '../local.db').replace(/\\/g, '/');
const CLOUD_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const CLOUD_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

async function updateDb(client, name) {
  await client.execute("UPDATE SpecialCurriculum SET level = 'SECONDARY' WHERE code = 'CURR_FIN_MIDDLE';");
  await client.execute("UPDATE SpecialSubject SET levels = 'PRIMARY,SECONDARY' WHERE code = 'FIN_EDU';");
  console.log(`✓ Updated CURR_FIN_MIDDLE to level=SECONDARY on ${name}`);
}

async function main() {
  await updateDb(createClient({ url: `file:${LOCAL_DB_PATH}` }), 'LOCAL SQLite');
  await updateDb(createClient({ url: CLOUD_URL, authToken: CLOUD_TOKEN }), 'TURSO Cloud');
}

main().catch(console.error);
