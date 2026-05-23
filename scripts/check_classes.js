const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const classes = await prisma.class.findMany({
    include: { academicYear: { select: { id: true, name: true } } }
  });
  console.log("Classes:", JSON.stringify(classes.map(c => ({ id: c.id, name: c.className, yearId: c.academicYearId, year: c.academicYear?.name })), null, 2));
  
  const years = await prisma.academicYear.findMany({ select: { id: true, name: true, status: true } });
  console.log("Years:", JSON.stringify(years, null, 2));
  await prisma.$disconnect();
}
main();
