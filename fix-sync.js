const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const teachers = await prisma.teacher.findMany({
    include: { user: true }
  })

  let fixedCount = 0;
  for (const t of teachers) {
    if (t.user && t.user.email !== t.teacherCode) {
      console.log(`Mismatch found for ${t.teacherName}: Teacher Code = ${t.teacherCode}, User Email = ${t.user.email}`);
      // Let's update Teacher.teacherCode to match User.email since User.email is their account login.
      await prisma.teacher.update({
        where: { id: t.id },
        data: { teacherCode: t.user.email }
      });
      fixedCount++;
      console.log(`Fixed ${t.teacherName} -> new teacherCode: ${t.user.email}`);
    }
    
    // Also, sync teacherName with user.fullName if they are different
    if (t.user && t.user.fullName !== t.teacherName) {
      console.log(`Name mismatch found for ${t.teacherCode}: Teacher Name = ${t.teacherName}, User Name = ${t.user.fullName}`);
      await prisma.teacher.update({
        where: { id: t.id },
        data: { teacherName: t.user.fullName }
      });
      console.log(`Fixed name for ${t.teacherCode} -> new teacherName: ${t.user.fullName}`);
    }
  }
  console.log('Total fixed:', fixedCount);
}

main().catch(console.error).finally(() => prisma.$disconnect())
