const { PrismaClient } = require('@prisma/client');
const d = new PrismaClient();

async function main() {
  console.log('=== DB COUNTS ===');
  console.log('students:', await d.student.count());
  console.log('parents:', await d.parent.count());
  console.log('links:', await d.parentStudentLink.count());
  console.log('classes:', await d.class.count());
  console.log('forms:', await d.surveyForm.count());
  console.log('periods:', await d.surveyPeriod.count());

  console.log('\n=== CLASSES WITH STUDENT COUNTS ===');
  const classes = await d.class.findMany({
    include: { _count: { select: { students: true } } },
    orderBy: { className: 'asc' }
  });
  classes.forEach(c => console.log('  ' + c.className + ': ' + c._count.students + ' students'));

  console.log('\n=== SAMPLE: FIRST CLASS WITH STUDENTS + PARENTS ===');
  const cls = await d.class.findFirst({
    include: {
      students: {
        take: 3,
        include: { parents: { include: { parent: true } } }
      }
    }
  });
  if (cls) {
    console.log('Class:', cls.className);
    for (const s of cls.students) {
      console.log('  Student:', s.studentName, '| parentLinks:', s.parents.length);
      for (const pl of s.parents) {
        console.log('    -> parentId:', pl.parentId, '| name:', pl.parent ? pl.parent.parentName : 'NULL');
      }
    }
  }

  console.log('\n=== SURVEY PERIODS ===');
  const periods = await d.surveyPeriod.findMany();
  periods.forEach(p => console.log('  ' + p.id + ' | ' + p.name + ' | active:' + p.isActive));
}

main().finally(() => d.$disconnect());
