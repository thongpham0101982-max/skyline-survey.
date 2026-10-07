const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  const pAny = prisma;
  const configs = await pAny.inputAssessmentGradeConfig.findMany();
  console.log('Total configs:', configs.length);
  
  const subjects = await pAny.assessmentSubject.findMany();
  const subMap = new Map(subjects.map(s => [s.id, s]));

  const grouped = {};
  for (const c of configs) {
    const s = subMap.get(c.subjectId);
    const key = s ? `${s.code} - ${s.name}` : c.subjectId;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({
      grade: c.grade,
      sys: c.educationSystemId,
      cols: JSON.parse(c.columnNames || '[]'),
      maxScores: JSON.parse(c.columnMaxScores || '[]'),
      composite: c.compositeColumnName,
      formula: c.formula
    });
  }

  for (const [sub, list] of Object.entries(grouped)) {
    console.log(`\n=== MÔN: ${sub} (${list.length} configs) ===`);
    console.log(`Sample columns:`, list[0]?.cols);
    console.log(`Sample maxScores:`, list[0]?.maxScores);
    console.log(`Sample composite:`, list[0]?.composite);
    console.log(`Grades configured:`, list.map(x => `${x.grade}(${x.sys})`).join(', '));
  }
}

inspect().catch(console.error).finally(() => prisma.$disconnect());
