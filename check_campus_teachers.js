const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  const teachers = await prisma.teacher.findMany({ 
    where: { campusId: "cmniq6a8c0001tu2agu3vbm6d" },
    select: { fullName: true, teacherCode: true }
  });
  console.log(JSON.stringify(teachers));
}
check().finally(() => prisma.$disconnect());
