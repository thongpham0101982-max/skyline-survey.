const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    where: {
      OR: [
        { studentName: { contains: 'Phan Đình Phùng' } },
        { studentName: { contains: 'Sĩ Phú' } },
        { studentName: { contains: 'Đỗ An Nhiên' } },
        { studentName: { contains: 'Mai Minh Minh' } },
        { studentName: { contains: 'Nguyễn Bình Phương An' } }
      ]
    },
    include: {
      class: true,
      assessmentScores: {
        include: { subject: true, assessmentPeriod: true }
      }
    }
  });

  console.log('Found students in Student table:', students.length);
  for (const s of students) {
    console.log(`\n=== Student: ${s.studentCode} | ${s.studentName} | Class: ${s.class?.className} (Grade: ${s.class?.grade}, Level: ${s.class?.level}) ===`);
    for (const sc of s.assessmentScores) {
      console.log(`  [${sc.assessmentPeriod?.name}] ${sc.subject?.name} (${sc.subject?.code}): compositeScore=${sc.compositeScore}, score=${sc.score}`);
    }
  }

  // Check InputAssessmentStudent
  const inputStudents = await prisma.inputAssessmentStudent.findMany({
    where: {
      OR: [
        { fullName: { contains: 'Phan Đình Phùng' } },
        { fullName: { contains: 'Sĩ Phú' } },
        { fullName: { contains: 'Đỗ An Nhiên' } },
        { fullName: { contains: 'Mai Minh Minh' } },
        { fullName: { contains: 'Phương An' } }
      ]
    },
    include: {
      scores: {
        include: { subject: true }
      },
      enrollmentClass: true
    }
  });

  console.log('\nFound in InputAssessmentStudent:', inputStudents.length);
  for (const inp of inputStudents) {
    console.log(`\n=== InputStudent: ${inp.studentCode || inp.enrollmentCode} | ${inp.fullName} | Status: ${inp.enrollmentStatus} | Class: ${inp.enrollmentClass?.className || inp.className} ===`);
    console.log(`  Direct: Math=${inp.mathScore}, Lit=${inp.literatureScore}, Written=${inp.writtenEnglishScore}, Oral=${inp.oralEnglishScore}, TotalEng=${inp.totalEnglishScore}, Psychology=${inp.psychologyScore}`);
    console.log(`  DirectorNote: ${inp.directorNote}`);
    console.log(`  AdmissionResult: ${inp.admissionResult}`);
    for (const sc of inp.scores) {
      console.log(`  Score item: ${sc.subject?.name || sc.subjectName} (${sc.subject?.code}) => scores: ${sc.scores}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
