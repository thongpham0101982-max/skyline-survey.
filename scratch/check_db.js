const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const goalCount = await prisma.studentGoal.count();
  console.log('StudentGoal count:', goalCount);
  const sampleGoals = await prisma.studentGoal.findMany({ take: 3 });
  console.log('Sample goals:', JSON.stringify(sampleGoals, null, 2));

  const commitmentCount = await prisma.studentLearningCommitment.count();
  console.log('Commitment count:', commitmentCount);
  const sampleCommitment = await prisma.studentLearningCommitment.findFirst();
  console.log('Sample commitment:', sampleCommitment);

  const gradeCount = await prisma.subjectGradeEntry.count();
  console.log('SubjectGradeEntry count:', gradeCount);
}

check().catch(console.error).finally(() => prisma.$disconnect());
