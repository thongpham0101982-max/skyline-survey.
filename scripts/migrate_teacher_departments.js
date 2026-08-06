const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Migrating existing teacher departments...');
  const teachers = await prisma.teacher.findMany({
    where: { departmentId: { not: null } }
  });
  console.log(`Found ${teachers.length} teachers with departmentId.`);

  let count = 0;
  for (const t of teachers) {
    if (!t.departmentId) continue;
    await prisma.teacherDepartmentAssignment.upsert({
      where: {
        teacherId_departmentId: {
          teacherId: t.id,
          departmentId: t.departmentId
        }
      },
      create: {
        teacherId: t.id,
        departmentId: t.departmentId,
        position: t.position || 'GV',
        isPrimary: true
      },
      update: {
        isPrimary: true,
        position: t.position || 'GV'
      }
    });
    count++;
  }
  console.log(`Successfully migrated ${count} teacher department assignments.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
