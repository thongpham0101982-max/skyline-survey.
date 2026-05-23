const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const db = new PrismaClient()

async function check() {
  const u = await db.user.findUnique({ where: { email: 'PH_S-005' }})
  if (!u) {
    console.log('USER NOT FOUND IN DB')
    return
  }
  console.log('User found:', u.email, 'Hash:', u.passwordHash, 'Role:', u.role)
  const match = await bcrypt.compare('S-005', u.passwordHash)
  console.log('Password match:', match)
}
check()