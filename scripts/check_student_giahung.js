const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@libsql/client/web");
const { PrismaLibSQL } = require("@prisma/adapter-libsql");

const TURSO_URL = "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const libsql = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });

async function check() {
  const matching = await prisma.student.findMany({
    where: { studentCode: "0601010239" },
    select: { id: true, studentName: true, studentCode: true }
  });
  console.log("Student:", matching);

  const studentIds = matching.map(m => m.id);
  const summaries = await prisma.studentSubjectCompetencySummary.findMany({
    where: { studentId: { in: studentIds } },
    include: {
      subject: { select: { subjectName: true } }
    }
  });

  console.log(`Summaries count for 0601010239: ${summaries.length} môn học`);
  summaries.forEach(s => {
    console.log(`• ${s.subject?.subjectName}: ${s.subjectScore}% (Đã đánh giá ${s.evaluatedCount}/${s.totalCompetencies} năng lực)`);
  });
}

check().catch(console.error).finally(() => prisma.$disconnect());
