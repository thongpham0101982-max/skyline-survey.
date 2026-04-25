const { PrismaClient } = require('@prisma/client')
const { createClient } = require('@libsql/client')
const { PrismaLibSQL } = require('@prisma/adapter-libsql')
require('dotenv').config()

async function test() {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN
  
  console.log('Testing with Turso URL:', tursoUrl)
  
  const libsql = createClient({
    url: tursoUrl,
    authToken: tursoToken,
  })
  const adapter = new PrismaLibSQL(libsql)
  const prisma = new PrismaClient({ adapter })

  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@skyline.edu' }
    })
    console.log('User found:', user ? user.email : 'NOT FOUND')
    console.log('User status:', user ? user.status : 'N/A')
  } catch (e) {
    console.error('Prisma Error:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

test()
