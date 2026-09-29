const { createClient } = require('@libsql/client');
const path = require('path');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  const bms = await client.execute("SELECT * FROM SubjectBenchmarkConfig");
  console.log('Benchmark records:', bms.rows);
}

main().catch(console.error);
