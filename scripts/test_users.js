const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'ADMIN' }
  });
  console.log("Admin Users:", users.map(u => ({ username: u.username, role: u.role, campusIds: u.campusIds })));
  
  const gdcs = await prisma.user.findMany({
    where: { role: 'GDCS' }
  });
  console.log("GDCS Users:", gdcs.map(u => ({ username: u.username, role: u.role, campusIds: u.campusIds })));
}
main().finally(()=>prisma.$disconnect());
