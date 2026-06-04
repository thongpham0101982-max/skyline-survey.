const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const years = await prisma.academicYear.findMany();
  console.log('Years in DB:', years);
}
check();
