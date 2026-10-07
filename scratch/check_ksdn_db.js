const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const years = await prisma.academicYear.findMany();
  console.log('Years:', years.map(y => ({ id: y.id, name: y.name, status: y.status })));

  const entriesCount = await prisma.subjectGradeEntry.count();
  console.log('Total subjectGradeEntry:', entriesCount);

  if (entriesCount > 0) {
    const periods = await prisma.subjectGradeEntry.groupBy({
      by: ['evaluationPeriod', 'academicYearId'],
      _count: { id: true }
    });
    console.log('Entries by period:', JSON.stringify(periods, null, 2));

    const sample = await prisma.subjectGradeEntry.findFirst({
      where: { compositeScore: { not: null } },
      include: { class: true, subject: true }
    });
    console.log('Sample entry with score:', {
      period: sample?.evaluationPeriod,
      score: sample?.compositeScore,
      className: sample?.class?.className,
      subjectName: sample?.subject?.subjectName,
      academicYearId: sample?.academicYearId
    });
  }

  // Check TermGrade or other grade tables
  try {
    const termGradeCount = await prisma.termGrade?.count();
    console.log('Total termGrade:', termGradeCount);
    if (termGradeCount > 0) {
      const tgPeriods = await prisma.termGrade.groupBy({
        by: ['term'],
        _count: { id: true }
      });
      console.log('TermGrade by term:', tgPeriods);
    }
  } catch (e) {
    console.log('No termGrade or error:', e.message);
  }

  // Check InputAssessmentStudent or entrance assessment
  try {
    const inputCount = await prisma.inputAssessmentStudent?.count();
    console.log('Total inputAssessmentStudent:', inputCount);
  } catch (e) {
    console.log('Error inputAssessmentStudent:', e.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
