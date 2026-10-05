const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  const entries = await p.subjectGradeEntry.findMany({
    where: { evaluationPeriod: 'KSĐN' },
    select: { subject: { select: { id: true, subjectCode: true, subjectName: true } } },
    distinct: ['subjectId']
  });
  console.log('Entries subjects count:', entries.length);
  entries.forEach(e => console.log('Entry:', e.subject?.subjectCode, '-', e.subject?.subjectName));

  const configs = await p.subjectGradeConfig.findMany({
    where: { evaluationPeriod: 'KSĐN' },
    select: { subject: { select: { id: true, subjectCode: true, subjectName: true } } },
    distinct: ['subjectId']
  });
  console.log('Configs subjects count:', configs.length);
  configs.forEach(c => console.log('Config:', c.subject?.subjectCode, '-', c.subject?.subjectName));

  const allActive = await p.subject.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, subjectCode: true, subjectName: true }
  });
  console.log('All active subjects count in DB:', allActive.length);
}

run().finally(() => p.$disconnect());
