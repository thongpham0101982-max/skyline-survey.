const { PrismaClient } = require('./prisma/generated/client2')
const prisma = new PrismaClient()

async function main() {
  const teacher = await prisma.teacher.findUnique({
    where: { teacherCode: '0201000707' },
    include: { user: true }
  })
  console.log("TEACHER RECORD:")
  console.log(JSON.stringify(teacher, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
