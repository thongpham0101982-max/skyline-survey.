
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const campuses = [
    { code: "CS1", name: "CS1" },
    { code: "CS2", name: "CS2" },
    { code: "CS3", name: "CS3" },
    { code: "CS4", name: "CS4" },
    { code: "CS5", name: "CS5" }
  ];
  
  for (const c of campuses) {
    await prisma.campus.upsert({
      where: { campusCode: c.code },
      update: { campusName: c.name },
      create: { campusCode: c.code, campusName: c.name },
    });
  }
  console.log("Seeded campuses: CS1, CS2, CS3, CS4, CS5");
}

main().catch(console.error).finally(() => prisma.$disconnect());
