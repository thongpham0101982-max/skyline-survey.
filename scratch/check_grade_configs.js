const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const configs = await prisma.inputAssessmentGradeConfig.findMany({
    orderBy: [{ subjectCode: 'asc' }, { grade: 'asc' }]
  });
  console.log('Total Grade Configs in DB:', configs.length);
  
  const subjects = {};
  configs.forEach(c => {
    if (!subjects[c.subjectCode]) {
      subjects[c.subjectCode] = {
        name: c.subjectName,
        grades: [],
        sampleColumns: c.columnNames,
        sampleMaxScores: c.columnMaxScores,
        compositeColumn: c.compositeColumnName
      };
    }
    subjects[c.subjectCode].grades.push(`${c.grade}-${c.educationSystem}`);
  });
  
  console.log('Subjects configured:', JSON.stringify(subjects, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
