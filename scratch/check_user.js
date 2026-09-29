const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { fullName: { contains: 'Vân' } },
        { email: { contains: 'van' } },
        { role: { contains: 'QLCM' } }
      ]
    },
    include: {
      teacher: {
        include: {
          departmentRel: true,
          campus: true,
          departmentAssignments: true
        }
      }
    }
  });
  console.log("USERS:", JSON.stringify(users.map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    email: u.email,
    role: u.role,
    teacher: u.teacher ? {
      id: u.teacher.id,
      code: u.teacher.code,
      name: u.teacher.name,
      position: u.teacher.position,
      campus: u.teacher.campus,
      campusId: u.teacher.campusId,
      departmentRel: u.teacher.departmentRel,
      departmentAssignments: u.teacher.departmentAssignments
    } : null
  })), null, 2));

  // Also check campuses
  const campuses = await prisma.campus.findMany();
  console.log("CAMPUSES:", JSON.stringify(campuses, null, 2));

  // Check teachers with Vân
  const teachersWithVan = await prisma.teacher.findMany({
    where: { name: { contains: 'Vân' } },
    include: { user: true, campus: true, departmentRel: true, departmentAssignments: true }
  });
  console.log("TEACHERS WITH VÂN:", JSON.stringify(teachersWithVan, null, 2));

  // Check roles
  const roles = await prisma.role.findMany();
  console.log("ROLES:", JSON.stringify(roles, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
