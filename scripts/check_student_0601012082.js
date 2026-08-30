const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@libsql/client/web");
const { PrismaLibSQL } = require("@prisma/adapter-libsql");

const TURSO_URL = "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const libsql = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });

async function checkStudent() {
  const staging = await prisma.stagingCompetencyAssessment.findMany({
    where: { rawStudentCode: "0601012082" },
    take: 10
  });

  console.log("Staging records for 0601012082 count:", staging.length);
  staging.forEach(s => {
    console.log(`Row ${s.rowNumber}: sub=${s.rawSubject} (id=${s.subjectId}), comp=${s.rawCompetency} (id=${s.competencyId}), percent=${s.competencyPercent}, status=${s.validationStatus}`);
  });

  // What subjects were present for 0601012082?
  const allStagingSub = await prisma.stagingCompetencyAssessment.findMany({
    where: { rawStudentCode: "0601012082" },
    select: { rawSubject: true, rawCompetency: true, subjectId: true, competencyId: true, validationStatus: true }
  });
  console.log("All staging subjects for 0601012082:", allStagingSub);
}

checkStudent().catch(console.error).finally(() => prisma.$disconnect());
