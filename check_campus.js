const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  const c = await prisma.campus.findFirst({ where: { campusName: "Downtown Campus" } });
  if (!c) { console.log("Not found"); return; }
  
  const classCount = await prisma.class.count({ where: { campusId: c.id } });
  const teacherCount = await prisma.teacher.count({ where: { campusId: c.id } });
  const studentCount = await prisma.student.count({ where: { campusId: c.id } });
  
  console.log(JSON.stringify({ 
    id: c.id, 
    code: c.campusCode, 
    classes: classCount, 
    teachers: teacherCount, 
    students: studentCount 
  }));
}
check().finally(() => prisma.$disconnect());
