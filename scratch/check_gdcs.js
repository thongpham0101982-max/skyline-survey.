const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const usersWithRole = await prisma.user.findMany({
    where: {
      OR: [
        { role: { contains: 'GD' } },
        { role: { contains: 'CS' } },
        { role: { contains: 'ADMIN' } },
        { role: { contains: 'DIEU_HANH' } },
        { role: { contains: 'BGH' } }
      ]
    },
    select: { id: true, fullName: true, email: true, role: true, teacher: { select: { id: true, teacherCode: true, position: true } } }
  });
  console.log('Special Role Users:', JSON.stringify(usersWithRole, null, 2));

  // Find all departments
  const allDepts = await prisma.department.findMany({
    select: { id: true, name: true, blockCM: true, campus: { select: { campusName: true } } }
  });
  console.log('\nAll Departments:', allDepts);

  // Find all TeacherAcademicYearTarget
  const allTargets = await prisma.teacherAcademicYearTarget.findMany({
    include: { teacher: true }
  });
  console.log('\nAll Targets Count:', allTargets.length);
  const gdcsTargets = allTargets.filter(t => 
    t.observerType?.includes('GDCS') || 
    t.observerType?.includes('GĐCS') || 
    t.observerType?.includes('Điều hành') || 
    t.teacher?.position?.includes('GĐ') || 
    t.teacher?.position?.includes('GD')
  );
  console.log('GDCS targets:', gdcsTargets);

  // Check all ObservationRegistrations or ObservationSlots
  const slots = await prisma.observationSlot.findMany({
    include: {
      observerTeacher: true,
      teacher: true
    },
    take: 50
  });
  console.log('\nTotal ObservationSlots count:', await prisma.observationSlot.count());
  console.log('Total ObservationRegistration count:', await prisma.observationRegistration.count());

  // Check observerRegistrations
  const registrations = await prisma.observationRegistration.findMany({
    include: {
      observerTeacher: {
        include: { user: true }
      },
      slot: true
    }
  });
  console.log(`\nRegistrations count: ${registrations.length}`);
  const observerRoles = new Set();
  registrations.forEach(r => {
    observerRoles.add(`${r.observerTeacher?.fullName} | Role: ${r.observerTeacher?.user?.role} | Pos: ${r.observerTeacher?.position}`);
  });
  console.log('Distinct registered observers:', Array.from(observerRoles));
}

main().catch(console.error).finally(() => prisma.$disconnect());
