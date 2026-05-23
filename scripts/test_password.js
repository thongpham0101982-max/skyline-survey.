const { PrismaClient } = require('@prisma/client')
const { createClient } = require('@libsql/client')
const { PrismaLibSQL } = require('@prisma/adapter-libsql')
const bcrypt = require('bcryptjs')
require('dotenv').config()

async function test() {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN
  
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
    
    if (user) {
      console.log('User found:', user.email)
      const passwordAttempt = 'admin'
      const isValid = await bcrypt.compare(passwordAttempt, user.passwordHash)
      console.log('Password "admin" valid?', isValid)
      console.log('Stored Hash:', user.passwordHash)
      
      // Try again with Skyline@123
      const isValid2 = await bcrypt.compare('Skyline@123', user.passwordHash)
      console.log('Password "Skyline@123" valid?', isValid2)
    } else {
      console.log('User NOT FOUND')
    }
  } catch (e) {
    console.error('Prisma Error:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

test()
