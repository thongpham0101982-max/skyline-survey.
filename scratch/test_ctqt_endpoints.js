const path = require('path');
const { createClient } = require('@libsql/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');
const { PrismaClient } = require('@prisma/client');
const { CTQT_LEVEL_CONFIGS, detectCtqtLevel } = require('../src/lib/ctqt/config.ts');
const { generateCtqtTemplate, parseCtqtExcel } = require('../src/lib/ctqt/excelService.ts');

async function testCtqt() {
  console.log('Testing CTQT module...');

  // 1. Level detection
  console.log('Level for 1.2INT_CS5:', detectCtqtLevel('1.2INT_CS5'));
  console.log('Level for 6UK:', detectCtqtLevel('6UK'));
  console.log('Level for 10INT_CS3:', detectCtqtLevel('10INT_CS3'));

  // 2. Connect DB
  const localDbPath = path.resolve(__dirname, '../local.db').replace(/\\/g, '/');
  const client = createClient({ url: `file:${localDbPath}` });
  const adapter = new PrismaLibSQL(client);
  const prisma = new PrismaClient({ adapter });

  // 3. Find a class
  const cls = await prisma.class.findFirst({
    where: { className: { contains: 'INT' } },
    include: { students: { take: 3 } }
  });

  if (cls) {
    console.log(`Testing Excel template generation for class: ${cls.className}...`);
    const buffer = generateCtqtTemplate(
      cls.className,
      cls.grade,
      cls.level,
      cls.students.map((s, idx) => ({
        id: s.id,
        studentCode: s.studentCode,
        studentName: s.studentName,
        englishName: s.englishName || 'SampleName',
        dateOfBirth: s.dateOfBirth,
        gender: s.gender,
        className: cls.className
      }))
    );
    console.log(`Generated Excel buffer size: ${buffer.length} bytes`);

    // 4. Test parsing that buffer
    const parsed = parseCtqtExcel(buffer);
    console.log(`Parsed Excel sheets: ${parsed.grades.length} grade entries, ${parsed.competencies.length} competency entries.`);
  }

  // 5. Query count on new tables
  const assignCount = await prisma.ctqtTeachingAssignment.count();
  const gradeCount = await prisma.ctqtGradeEntry.count();
  const compCount = await prisma.ctqtCompetencyEntry.count();
  console.log(`Current DB counts: Assignments: ${assignCount}, Grades: ${gradeCount}, Competencies: ${compCount}`);

  await prisma.$disconnect();
  console.log('CTQT test completed successfully!');
}

testCtqt().catch(console.error);
