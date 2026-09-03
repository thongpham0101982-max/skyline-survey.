const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const depts = await prisma.department.findMany({
    select: { id: true, code: true, name: true, blockCM: true, status: true }
  });
  console.log('=== ALL DEPARTMENTS IN DB ===');
  console.log(JSON.stringify(depts, null, 2));

  const teachers = await prisma.teacher.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      teacherCode: true,
      teacherName: true,
      position: true,
      departmentId: true,
      departmentRel: { select: { id: true, code: true, name: true } },
      departmentAssignments: {
        select: {
          departmentId: true,
          position: true,
          department: { select: { id: true, code: true, name: true } }
        }
      },
      mainSubjectRel: { select: { id: true, subjectName: true } }
    },
    take: 50
  });

  console.log('=== SAMPLE TEACHERS (50) ===');
  console.log(JSON.stringify(teachers, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
