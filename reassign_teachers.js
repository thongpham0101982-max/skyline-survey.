const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  const downtownId = "cmniq6a8c0001tu2agu3vbm6d";
  const cs1Id = "cmnofie5n0000uhvs2ifqj6pr";
  
  const result = await prisma.teacher.updateMany({
    where: { campusId: downtownId },
    data: { campusId: cs1Id }
  });
  
  console.log(JSON.stringify({ updated: result.count }));
}
run().finally(() => prisma.$disconnect());
