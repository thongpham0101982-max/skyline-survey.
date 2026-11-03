const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const teacherCount = await prisma.teacher.count();
  console.log("Total Teachers:", teacherCount);

  const sampleTeachers = await prisma.teacher.findMany({
    take: 20,
    include: {
      user: {
        select: { id: true, fullName: true, email: true, role: true }
      }
    }
  });
  console.log("\nSample Teachers (first 20):");
  sampleTeachers.forEach(t => {
    console.log(`  - [${t.id}] ${t.teacherName} | email: ${t.email || t.user?.email} | pos: ${t.position || t.positions || 'N/A'} | deptId: ${t.departmentId || 'N/A'}`);
  });

  // Check unique departments or positions or roles
  const teachersWithPos = await prisma.teacher.findMany({
    where: {
      OR: [
        { position: { not: null } },
        { positions: { not: null } }
      ]
    },
    select: { id: true, teacherName: true, position: true, positions: true }
  });
  console.log("\nTeachers with position/positions count:", teachersWithPos.length);
  const posSet = new Set();
  teachersWithPos.forEach(t => {
    if (t.position) posSet.add(t.position);
    if (t.positions) posSet.add(t.positions);
  });
  console.log("Positions:", Array.from(posSet));

  // Check users with TLHN or Tâm lý in name or role or email
  const searchUsers = await prisma.user.findMany({
    where: {
      OR: [
        { fullName: { contains: "Tâm lý" } },
        { fullName: { contains: "tâm lý" } },
        { role: { contains: "TLHN" } },
        { email: { contains: "tlhn" } },
        { email: { contains: "tamly" } }
      ]
    },
    select: { id: true, fullName: true, email: true, role: true }
  });
  console.log("\nSearch Users matching 'Tâm lý' or 'TLHN':", searchUsers);

  // Check all subjects
  const subjects = await prisma.assessmentSubject.findMany({
    select: { id: true, name: true, code: true }
  });
  console.log("\nAssessment Subjects:", subjects);

  // Check special subjects
  const specSubjects = await prisma.specialSubject.findMany({
    select: { id: true, name: true, code: true }
  });
  console.log("\nSpecial Subjects:", specSubjects);
}

main().catch(console.error).finally(() => prisma.$disconnect());
