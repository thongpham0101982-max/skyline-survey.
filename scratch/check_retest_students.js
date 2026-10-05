const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hs = await prisma.inputAssessmentStudent.findMany({
    where: { 
      OR: [
        { fullName: { contains: 'Anh Thư' } },
        { studentCode: { contains: '202' } }
      ]
    },
    include: {
      period: true,
      batch: true,
      scores: {
        include: { subject: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  });
  console.log('Records found:', hs.length);
  hs.forEach((h, i) => {
    console.log('=== Record', i + 1, 'name:', h.fullName, 'code:', h.studentCode, 'id:', h.id, 'createdAt:', h.createdAt, 'admissionResult:', h.admissionResult);
    console.log('  Direct scores: math:', h.mathScore, 'lit:', h.literatureScore, 'engW:', h.writtenEnglishScore, 'engO:', h.oralEnglishScore, 'psy:', h.psychologyScore);
    console.log('  SAS scores count:', h.scores?.length);
    h.scores?.forEach(s => {
      console.log('    Subject:', s.subject?.name, 'code:', s.subject?.code, 'scores:', s.scores);
    });
    console.log('  Note:', h.directorNote);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
