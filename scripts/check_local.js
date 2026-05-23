const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const tables = [
    'InputAssessmentPeriod',
    'InputAssessmentBatch',
    'InputAssessmentStudent',
    'AssessmentSubject',
    'AssessmentConfig',
    'InputAssessmentTeacherAssignment',
    'AcademicYear',
    'Campus',
    'EducationSystem'
  ];

  console.log('--- LOCAL DB STATUS ---');
  for (const table of tables) {
    try {
      const count = await prisma[table.charAt(0).toLowerCase() + table.slice(1)].count();
      console.log(`${table}: ${count}`);
    } catch (e) {
      console.log(`${table}: ERROR - ${e.message}`);
    }
  }
}

check();
