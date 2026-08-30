const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@libsql/client/web");
const { PrismaLibSQL } = require("@prisma/adapter-libsql");

const TURSO_URL = "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const libsql = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });

async function inspect() {
  console.log("=== INSPECTING TURSO DB COMPETENCY DATA ===");

  // 1. Batches
  const batches = await prisma.importBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 5
  });
  console.log("Batches count:", batches.length);
  batches.forEach(b => {
    console.log(`Batch ${b.batchCode}: status=${b.status}, period=${b.assessmentPeriod}, yearId=${b.academicYearId}, totalRows=${b.totalRows}, validRows=${b.validRows}`);
  });

  // 2. Total assessments count
  const countAssessments = await prisma.studentCompetencyAssessment.count();
  const countSummaries = await prisma.studentSubjectCompetencySummary.count();
  console.log("Total StudentCompetencyAssessment:", countAssessments);
  console.log("Total StudentSubjectCompetencySummary:", countSummaries);

  // 3. Check student 0601012082
  const student = await prisma.student.findFirst({
    where: { studentCode: "0601012082" }
  });
  console.log("Student 0601012082 in DB:", student ? { id: student.id, name: student.studentName, class: student.className, yearId: student.academicYearId } : "NOT FOUND");

  if (student) {
    const studentAssessments = await prisma.studentCompetencyAssessment.findMany({
      where: { studentId: student.id }
    });
    console.log("Student assessments count:", studentAssessments.length);

    const studentSummaries = await prisma.studentSubjectCompetencySummary.findMany({
      where: { studentId: student.id }
    });
    console.log("Student summaries count:", studentSummaries.length);
    studentSummaries.forEach(s => {
      console.log(`Summary subject=${s.subjectId}, period=${s.assessmentPeriod}, yearId=${s.academicYearId}, score=${s.subjectScore}`);
    });
  }

  // 4. Sample any student that HAS assessments
  const sampleSummary = await prisma.studentSubjectCompetencySummary.findFirst();
  if (sampleSummary) {
    console.log("Sample Student with summary:", sampleSummary);
  }

  // 5. Academic Years in DB
  const years = await prisma.academicYear.findMany({ take: 5 });
  console.log("Academic Years:", years.map(y => ({ id: y.id, name: y.name, code: y.code })));
}

inspect().catch(console.error).finally(() => prisma.$disconnect());
