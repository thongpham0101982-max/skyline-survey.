const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function run() {
  const downtownId = "cmniq6a8c0001tu2agu3vbm6d";
  
  // Final safety check
  const classCount = await prisma.class.count({ where: { campusId: downtownId } });
  const teacherCount = await prisma.teacher.count({ where: { campusId: downtownId } });
  const studentCount = await prisma.student.count({ where: { campusId: downtownId } });
  
  if (classCount === 0 && teacherCount === 0 && studentCount === 0) {
    await prisma.campus.delete({ where: { id: downtownId } });
    console.log("Deleted");
  } else {
    console.log("Still has data: " + JSON.stringify({ classes: classCount, teachers: teacherCount, students: studentCount }));
  }
}
run().finally(() => prisma.$disconnect());
