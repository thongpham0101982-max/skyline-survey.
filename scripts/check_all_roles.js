const { PrismaClient } = require('./prisma/generated/client2')
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true, fullName: true }
  })
  console.log("Current Users & Roles:")
  console.table(users)
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
