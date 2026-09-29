const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const allCommitment = await prisma.inputAssessmentStudent.findMany({
    where: {
      OR: [
        { admissionResult: { contains: 'cam kết' } },
        { admissionResult: { contains: 'cam ket' } },
        { admissionResult: { contains: 'theo dõi' } },
        { admissionResult: { contains: 'theo doi' } },
        { directorNote: { contains: 'cam kết' } },
        { directorNote: { contains: 'cam ket' } },
        { directorNote: { contains: 'theo dõi' } },
        { directorNote: { contains: 'theo doi' } },
        { directorNote: { contains: 'Môn cam kết' } },
        { directorNote: { contains: 'Mon cam ket' } },
        { targetType: { contains: 'cam kết' } },
        { targetType: { contains: 'theo dõi' } },
        { admissionCriteria: { contains: 'cam kết' } },
        { admissionCriteria: { contains: 'theo dõi' } },
      ]
    }
  });

  console.log('Total all commitment in InputAssessmentStudent:', allCommitment.length);
  const byEnrollment = {};
  for (const s of allCommitment) {
    byEnrollment[s.enrollmentStatus] = (byEnrollment[s.enrollmentStatus] || 0) + 1;
  }
  console.log('EnrollmentStatus breakdown:', byEnrollment);

  const completed = allCommitment.filter(s => s.enrollmentStatus === 'COMPLETED');
  console.log('COMPLETED count:', completed.length);

  const notCompleted = allCommitment.filter(s => s.enrollmentStatus !== 'COMPLETED');
  console.log('Not COMPLETED count:', notCompleted.length);
  for (const s of notCompleted) {
    console.log(' - Not COMPLETED:', s.fullName, '| Code:', s.studentCode || s.enrollmentCode, '| Grade:', s.grade, '| Status:', s.enrollmentStatus, '| Res:', s.admissionResult, '| Note:', s.directorNote?.substring(0, 50));
  }

  // Bây giờ xem danh sách trong route.ts thực tế đang gom được bao nhiêu học sinh
  // Đọc từ Class & Student để xem tại sao ra 83 học sinh
}

check().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
