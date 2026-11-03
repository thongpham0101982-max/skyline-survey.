const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const periods = await prisma.inputAssessmentPeriod.findMany({
    select: { id: true, name: true, description: true }
  });
  console.log('All inputAssessmentPeriod names:', periods.map(p => ({ id: p.id, name: p.name })));
  
  const batches = await prisma.inputAssessmentBatch.findMany({
    where: { name: { contains: 'CHUYEN' } }
  });
  console.log('Batches with CHUYEN:', batches.map(b => ({ id: b.id, name: b.name, periodId: b.periodId })));

  const students = await prisma.inputAssessmentStudent.findMany({
    where: {
      OR: [
        { admissionCriteria: { contains: 'Chuyển hệ' } },
        { targetType: { contains: 'Chuyển hệ' } },
        { period: { name: { contains: 'Chuyển hệ' } } }
      ]
    },
    select: {
      id: true,
      studentCode: true,
      fullName: true,
      className: true,
      surveySystem: true,
      surveyFormType: true,
      registeredCampus: true,
      targetType: true,
      period: { select: { id: true, name: true } },
      batch: { select: { id: true, name: true } }
    }
  });
  console.log('Students matching Chuyển hệ:', students.length);
  if (students.length > 0) {
    console.log(students);
  }
}

main().finally(() => prisma.$disconnect());
