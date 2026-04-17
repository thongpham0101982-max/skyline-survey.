const { PrismaClient } = require('@prisma/client');
const d = new PrismaClient();

async function main() {
  const forms = await d.surveyForm.findMany({
    take: 5,
    include: {
      parent: { select: { parentName: true } },
      student: { select: { studentName: true } },
      class: { select: { className: true } },
      surveyPeriod: { select: { name: true } }
    }
  });
  
  console.log('EXISTING FORMS:');
  forms.forEach(f => {
    console.log(f.surveyPeriod.name + ' | ' + f.class.className + ' | ' + f.student.studentName + ' | ' + f.parent.parentName + ' | status:' + f.status);
  });

  // Get form counts by period
  const periods = await d.surveyPeriod.findMany();
  for (const p of periods) {
    const count = await d.surveyForm.count({ where: { surveyPeriodId: p.id } });
    console.log('\nPeriod: ' + p.name + ' -> ' + count + ' forms');
  }
}

main().finally(() => d.$disconnect());
