const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const client = createClient({
  url: "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw",
});

async function run() {
  const email = 'admin@skyline.edu';
  const password = 'admin'; // Keeping it simple for now
  
  const hash = await bcrypt.hash(password, 10);
  console.log(`Setting password for ${email} to "${password}"`);
  console.log(`New Hash: ${hash}`);
  
  await client.execute({
    sql: "UPDATE User SET passwordHash = ? WHERE email = ?",
    args: [hash, email]
  });
  
  const result = await client.execute({
    sql: "SELECT passwordHash FROM User WHERE email = ?",
    args: [email]
  });
  
  const storedHash = result.rows[0].passwordHash;
  console.log(`Stored Hash in DB: ${storedHash}`);
  
  const isMatch = await bcrypt.compare(password, storedHash);
  console.log(`Match verification: ${isMatch}`);
}

run();
