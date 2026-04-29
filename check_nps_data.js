const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const forms = await prisma.surveyForm.findMany({
    where: { class: { className: '9S_CS4' }, status: { in: ['SUBMITTED', 'Ð? HOÀN THÀNH'] } },
    include: { responses: { include: { question: { include: { section: true } } } } }
  });
  if(forms.length > 0) {
     const form = forms[0];
     console.log('Student:', form.studentId);
     form.responses.forEach(r => {
        console.log('Section:', r.question?.section?.name, '| Type:', r.question?.questionType, '| numScore:', r.numericScore, '| choice:', r.choiceAnswer, '| text:', r.textAnswer?.substring(0, 30));
     });
  }
}
check().finally(() => prisma.$disconnect());
