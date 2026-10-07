const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const subs = await prisma.assessmentSubject.findMany();
  console.log("Subjects in DB:", subs.map(s => ({ code: s.code, name: s.name, id: s.id })));
  
  const configs = await prisma.inputAssessmentGradeConfig.findMany({
    where: { grade: 'Khối 1' }
  });
  console.log("\nConfigs Khối 1 count:", configs.length);
  for (const c of configs) {
    const s = subs.find(x => x.id === c.subjectId);
    console.log(` - Period: [${c.periodId || 'ALL'}] | Subject: ${s ? s.name + ' (' + s.code + ')' : c.subjectId} | Composite: ${c.compositeColumnName}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
