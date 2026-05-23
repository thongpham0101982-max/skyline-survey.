const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

async function check() {
  const p = await db.parent.findMany()
  console.log('Parents:', p.length)
  console.log(p.slice(0, 2))
}
check()