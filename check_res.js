const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const forms = await prisma.surveyForm.findMany({
    where: { class: { className: '9S_CS4' } },
    include: { responses: { include: { question: true } }, student: true }
  });
  console.log('All forms:', forms.length);
  forms.forEach(f => console.log(f.student.studentName, f.status));
}
check().finally(() => prisma.$disconnect());
