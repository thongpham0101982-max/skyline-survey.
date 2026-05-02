const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const teachers = await prisma.teacher.findMany({
    include: { user: true }
  })

  for (const t of teachers) {
    console.log(`Teacher: ${t.teacherName}, Code: ${t.teacherCode}, User: ${t.user ? t.user.email : 'NULL'}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
