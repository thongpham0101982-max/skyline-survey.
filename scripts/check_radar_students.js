const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@libsql/client/web");
const { PrismaLibSQL } = require("@prisma/adapter-libsql");

const TURSO_URL = "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const libsql = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });

async function check() {
  const summaries = await prisma.studentSubjectCompetencySummary.findMany({
    take: 10,
    include: {
      student: { select: { studentCode: true, studentName: true, class: { select: { className: true } } } },
      subject: { select: { subjectCode: true, subjectName: true } },
    }
  });

  console.log("Top 10 students with radar summaries in DB:");
  summaries.forEach(s => {
    console.log(`Student: ${s.student?.studentCode} - ${s.student?.studentName} (${s.student?.class?.className}), Subject: ${s.subject?.subjectName}, Score: ${s.subjectScore}, Period: ${s.assessmentPeriod}`);
  });

  // Check how many unique students have summaries
  const allSummaries = await prisma.studentSubjectCompetencySummary.findMany({
    select: { studentId: true, assessmentPeriod: true, academicYearId: true }
  });
  const uniqueStudents = new Set(allSummaries.map(s => s.studentId));
  console.log(`Total unique students with summaries: ${uniqueStudents.size}`);
  console.log(`Periods present in summaries:`, Array.from(new Set(allSummaries.map(s => s.assessmentPeriod))));
  console.log(`Years present in summaries:`, Array.from(new Set(allSummaries.map(s => s.academicYearId))));
}

check().catch(console.error).finally(() => prisma.$disconnect());
