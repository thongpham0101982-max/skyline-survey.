const bcrypt = require('bcryptjs');
const { createClient } = require('@libsql/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');
const { PrismaClient } = require('@prisma/client');

async function testAuth() {
  const tursoUrl = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io"
  const tursoAuthToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw"
  
  const libsql = createClient({
    url: tursoUrl,
    authToken: tursoAuthToken,
  })
  const adapter = new PrismaLibSQL(libsql)
  const prisma = new PrismaClient({ adapter })
  
  const identifier = "admin@skyline.edu";
  const password = "Pnt@01011982!";

  console.log('[AUTH] Attempting login for:', identifier)
  // 1. Direct User table match (Admin / Staff)
  let user = await prisma.user.findUnique({ where: { email: identifier }, include: { campusAssignments: true } })
  console.log('[AUTH] User found in User table:', user ? 'YES' : 'NO')

  if (!user) {
    console.log("Failed: user not found");
    return;
  }

  if (user.status !== "ACTIVE") {
    console.log("Failed: user not ACTIVE");
    return;
  }

  // Validate Password
  const isValid = await bcrypt.compare(password, user.passwordHash)
  console.log('[AUTH] Password check for:', identifier, 'Result:', isValid)
  if (!isValid) {
      console.log("Failed: Password mismatch");
      return;
  }

  console.log("Success! User authenticated.");
}

testAuth().catch(console.error);
