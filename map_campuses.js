const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  const cs1 = await prisma.campus.findFirst({ where: { campusCode: "CS1" } });
  const downtown = await prisma.campus.findFirst({ where: { campusName: "Downtown Campus" } });
  
  if (!cs1 || !downtown) {
    console.log(JSON.stringify({ error: "One of the campuses not found", cs1: !!cs1, downtown: !!downtown }));
    return;
  }
  
  console.log(JSON.stringify({ cs1Id: cs1.id, downtownId: downtown.id }));
}
check().finally(() => prisma.$disconnect());
