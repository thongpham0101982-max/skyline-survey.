const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const students = await prisma.inputAssessmentStudent.findMany({
        select: { studentCode: true, fullName: true, admissionResult: true, admissionCampus: true }
    });
    console.log('All Assessment Students:', JSON.stringify(students, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
