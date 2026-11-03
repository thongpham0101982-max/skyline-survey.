const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const subjects = await prisma.specialSubject.findMany();
  console.log('SpecialSubjects in DB:');
  for (const s of subjects) {
    const assignmentsCount = await prisma.specialTeachingAssignment.count({ where: { subjectId: s.id } });
    const lessonsCount = await prisma.specialLesson.count({ where: { version: { curriculum: { subjectId: s.id } } } });
    const criteriaCount = await prisma.specialAssessmentCriterion.count({ where: { lesson: { version: { curriculum: { subjectId: s.id } } } } });
    console.log(`- [${s.code}] ${s.name}: ${lessonsCount} lessons, ${criteriaCount} criteria, ${assignmentsCount} assignments`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
