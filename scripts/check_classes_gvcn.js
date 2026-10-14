const { createClient } = require('@libsql/client');

const client = createClient({
  url: "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw"
});

async function main() {
  const catRes = await client.execute("SELECT id, code, name, description FROM ActivityCatalog WHERE name LIKE '%Cố Đô%' OR code LIKE '%THPT-01%'");
  console.log('Catalog found:', catRes.rows.length);
  for (const c of catRes.rows) {
    console.log('ID:', c.id);
    console.log('Code:', c.code);
    console.log('Name:', c.name);
    console.log('Meta:', c.description);
  }
}

main().catch(console.error);
