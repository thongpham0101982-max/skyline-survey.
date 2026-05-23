const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

async function check() {
  const users = await db.user.findMany({ where: { role: 'PARENT' }})
  console.log('Total parent users:', users.length)
  if (users.length > 0) console.log(users.map(u => u.email).slice(0, 5))
}
check()