const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@libsql/client/web");
const { PrismaLibSQL } = require("@prisma/adapter-libsql");

const TURSO_URL = "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const libsql = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });

async function testStudents() {
  const classes = await prisma.class.findMany({
    take: 5,
    select: { id: true, className: true, grade: true, campusId: true, academicYearId: true }
  });
  console.log("Sample Classes:", classes);

  if (classes.length > 0) {
    const c = classes[0];
    const studentsInClass = await prisma.student.findMany({
      where: { classId: c.id },
      take: 5,
      select: { id: true, studentName: true, studentCode: true, academicYearId: true, classId: true }
    });
    console.log(`Students in class ${c.className} (${c.id}):`, studentsInClass);
  }
}

testStudents().catch(console.error).finally(() => prisma.$disconnect());
