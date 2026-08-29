const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, fullName: true }, take: 20 });
  console.log('Sample Users & Roles:');
  console.table(users);

  const permissions = await prisma.permission.findMany({ take: 50 });
  console.log('Total Permissions in DB:', permissions.length);
  console.log('Sample Permissions:', permissions.slice(0, 10));

  const distinctRolesInPerm = await prisma.permission.findMany({ distinct: ['roleCode'], select: { roleCode: true } });
  console.log('Distinct roleCodes in Permission table:', distinctRolesInPerm.map(p => p.roleCode));
}

inspect().catch(console.error).finally(() => prisma.$disconnect());
