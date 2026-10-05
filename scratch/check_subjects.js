const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const subjects = await prisma.subject.findMany({
    select: { id: true, subjectCode: true, subjectName: true }
  });
  console.log('Total subjects:', subjects.length);
  subjects.forEach(s => console.log(`${s.subjectCode} | ${s.subjectName}`));
}

main().finally(() => prisma.$disconnect());
