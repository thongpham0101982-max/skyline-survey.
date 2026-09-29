require('d:/SSM/skyline-survey/node_modules/dotenv').config({ path: 'd:/SSM/skyline-survey/.env' });
const { PrismaClient } = require('d:/SSM/skyline-survey/node_modules/@prisma/client');
const prisma = new PrismaClient();

const names = [
  'Đỗ An Nhiên', 'Hà Đặng Phước Huy', 'Lê Đình Sĩ Phú', 'LÊ ĐÌNH SĨ PHÚ', 'Nguyễn Daniil',
  'Lê Gia Lân', 'Đào Trần Thảo Linh', 'Nguyễn Thanh Phúc', 'Đỗ Nguyễn An Khôi', 'ĐỖ NGUYỄN AN KHÔI',
  'Phan Hải Đăng', 'Lê Hồ Duy Khang', 'Sangadziev Aron', 'Govorushko Mikhail',
  'Ngô Huỳnh Anh Minh', 'Vũ Đức Thịnh'
];

async function check() {
  const ay = await prisma.academicYear.findFirst({
    where: { status: 'ACTIVE' }
  });
  console.log('Active AY:', ay?.id, ay?.name);

  for (const name of names) {
    const students = await prisma.student.findMany({
      where: {
        studentName: { contains: name.trim() }
      },
      include: {
        class: true,
        campus: true
      }
    });

    const inputStudents = await prisma.inputAssessmentStudent.findMany({
      where: {
        fullName: { contains: name.trim() }
      },
      include: {
        enrollmentClass: true,
        scores: { include: { subject: true } }
      }
    });

    // Also look up grades in subjectGradeEntry for currentPeriod (KSĐN)
    const stIds = students.map(s => s.id);
    const grades = await prisma.subjectGradeEntry.findMany({
      where: {
        studentId: { in: stIds },
        evaluationPeriod: 'KSĐN'
      },
      include: {
        subject: true
      }
    });

    console.log('\n=============================================');
    console.log('HỌC SINH: ' + name);
    console.log('Student Table:', students.map(s => ({
      code: s.studentCode,
      class: s.class?.className,
      grade: s.class?.grade,
      campus: s.campus?.campusName || s.campus?.campusCode,
      status: s.status
    })));
    console.log('Input Table:', inputStudents.map(s => ({
      code: s.studentCode || s.enrollmentCode,
      class: s.className,
      enrClass: s.enrollmentClass?.className,
      result: s.admissionResult,
      note: s.directorNote,
      math: s.mathScore,
      lit: s.literatureScore,
      engWritten: s.writtenEnglishScore,
      engOral: s.oralEnglishScore,
      ept: s.eptScore,
      psy: s.psychologyScore
    })));
    console.log('KSĐN Grades:', grades.map(g => ({
      sub: g.subject?.subjectName,
      score: g.compositeScore
    })));
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
