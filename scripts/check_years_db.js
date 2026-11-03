const { PrismaClient } = require('@prisma/client')
const { createClient } = require('@libsql/client')
const { PrismaLibSQL } = require('@prisma/adapter-libsql')
require('dotenv').config()

async function main() {
  const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN

  const libsql = createClient({
    url: tursoUrl,
    authToken: tursoToken,
  })
  const adapter = new PrismaLibSQL(libsql)
  const prisma = new PrismaClient({ adapter })

  try {
    const rawYears = await prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' }
    });
    console.log("Academic Years ordered by startDate desc:", rawYears)
  } finally {
    await prisma.$disconnect()
  }
}

main()
