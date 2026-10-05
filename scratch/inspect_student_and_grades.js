const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const student = await prisma.student.findFirst({
    where: { studentCode: '0602040006' },
    include: {
      class: {
        include: {
          teachers: { include: { teacher: true } },
          teachingAssignments: { include: { teacher: true } }
        }
      },
      termScores: { include: { subject: true } },
      termSummaries: true,
      subjectGradeEntries: { include: { subject: true } }
    }
  });

  if (!student) {
    console.log('Student not found by code 0602040006');
    const anyStudent = await prisma.student.findFirst({
      include: {
        class: true,
        termScores: { include: { subject: true }, take: 5 },
        subjectGradeEntries: { include: { subject: true }, take: 5 }
      }
    });
    console.log('Sample student:', anyStudent ? {
      code: anyStudent.studentCode,
      name: anyStudent.studentName,
      className: anyStudent.class?.className,
      classHomeroomTeacherId: anyStudent.class?.homeroomTeacherId
    } : 'None');
    return;
  }

  console.log('=== STUDENT INFO ===');
  console.log({
    id: student.id,
    name: student.studentName,
    code: student.studentCode,
    classId: student.classId,
    className: student.class?.className,
    classGrade: student.class?.grade,
    classCampusId: student.class?.campusId,
    homeroomTeacherId: student.class?.homeroomTeacherId,
    classTeachers: student.class?.teachers,
    teachingAssignments: student.class?.teachingAssignments
  });

  if (student.class?.homeroomTeacherId) {
    const t = await prisma.teacher.findUnique({ where: { id: student.class.homeroomTeacherId } });
    const u = await prisma.user.findUnique({ where: { id: student.class.homeroomTeacherId } });
    console.log('Lookup homeroomTeacherId:', { teacher: t?.teacherName, user: u?.fullName });
  }

  // Look for any teaching assignment in this class
  const allTa = await prisma.teachingAssignment.findMany({
    where: { classId: student.classId },
    include: { teacher: true }
  });
  console.log('All teaching assignments in class:', allTa);

  // Look for TeacherClassAssignment
  const tca = await prisma.teacherClassAssignment.findMany({
    where: { classId: student.classId },
    include: { teacher: true }
  });
  console.log('All TeacherClassAssignment in class:', tca);

  console.log('=== TERM SCORES (HK1, HK2, CN) ===');
  console.log('Count:', student.termScores.length);
  student.termScores.forEach(ts => {
    console.log(`[${ts.semester}] ${ts.subject?.subjectName} (${ts.subject?.subjectCode}): score=${ts.score}, eval=${ts.evaluationGrade}`);
  });

  console.log('=== TERM SUMMARIES ===');
  console.log(student.termSummaries);

  console.log('=== SUBJECT GRADE ENTRIES (PERIODIC EXAMS) ===');
  console.log('Count:', student.subjectGradeEntries.length);
  const evalPeriods = [...new Set(student.subjectGradeEntries.map(e => e.evaluationPeriod))];
  console.log('Available Evaluation Periods:', evalPeriods);
  student.subjectGradeEntries.forEach(sge => {
    console.log(`[Period: ${sge.evaluationPeriod}] ${sge.subject?.subjectName}: composite=${sge.compositeScore}, components=${sge.componentScores}`);
  });

  // Check all available evaluation periods in the database across all students
  const allPeriods = await prisma.subjectGradeEntry.findMany({
    select: { evaluationPeriod: true },
    distinct: ['evaluationPeriod']
  });
  console.log('All distinct evaluation periods in DB:', allPeriods.map(p => p.evaluationPeriod));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
