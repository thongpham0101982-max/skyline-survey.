const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const teachers = await prisma.teacher.findMany({
    where: { teacherCode: { in: ['0201000095', '010111111'] } } // from the screenshot
  });
  console.log("Teachers found:", teachers.map(t => ({ name: t.teacherName, email: t.email, userId: t.userId })));
}

check().catch(console.error).finally(() => prisma.$disconnect());
