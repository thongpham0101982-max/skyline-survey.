require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  console.log('DB:', process.env.DATABASE_URL?.substring(0,30));
  const forms = await prisma.surveyForm.findMany({
    where: { class: { className: '9S_CS4' }, status: { in: ['SUBMITTED', 'ĐÃ HOÀN THÀNH'] } },
    include: { student: true, responses: { include: { question: { include: { section: true } } } } }
  });
  console.log('Forms:', forms.length);
  for(const f of forms) {
    console.log('Student:', f.student?.studentName);
    for(const r of f.responses) {
      console.log(' - Q:', r.question?.questionText);
      console.log('   Section:', r.question?.section?.name);
      console.log('   Type:', r.question?.questionType);
      console.log('   Score:', r.numericScore, 'Choice:', r.choiceAnswer, 'Text:', r.textAnswer?.substring(0,30));
    }
  }
}
run().catch(console.error).finally(()=>prisma.$disconnect());
