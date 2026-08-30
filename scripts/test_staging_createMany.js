const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@libsql/client/web");
const { PrismaLibSQL } = require("@prisma/adapter-libsql");
const crypto = require("crypto");

const TURSO_URL = "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const libsql = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });

async function testInsert() {
  const batch = await prisma.importBatch.create({
    data: {
      batchCode: "TEST_" + Date.now(),
      fileName: "test.xlsx",
      academicYearId: "AY-2026",
      semester: 1,
      assessmentPeriod: "MID_TERM",
      status: "STAGED",
    }
  });

  console.log("Created test batch:", batch.id);

  // Test createMany with id
  const testData = [
    {
      id: crypto.randomUUID(),
      batchId: batch.id,
      rowNumber: 1,
      rawYear: "2025-2026",
      rawStudentCode: "0601010234",
      rawStudentName: "Ngô Nguyên Ngọc Bảo",
      rawClass: "6/1",
      rawSubject: "KHTN",
      rawCompetency: "Nhận thức",
      validationStatus: "VALID",
    }
  ];

  try {
    const res = await prisma.stagingCompetencyAssessment.createMany({
      data: testData,
    });
    console.log("createMany with id succeeded! Count:", res.count);
  } catch (err) {
    console.error("createMany with id failed:", err.message);
  }

  // Test createMany WITHOUT id
  const testDataNoId = [
    {
      batchId: batch.id,
      rowNumber: 2,
      rawYear: "2025-2026",
      rawStudentCode: "0601010234",
      rawStudentName: "Ngô Nguyên Ngọc Bảo",
      rawClass: "6/1",
      rawSubject: "KHTN",
      rawCompetency: "Nhận thức",
      validationStatus: "VALID",
    }
  ];

  try {
    const res2 = await prisma.stagingCompetencyAssessment.createMany({
      data: testDataNoId,
    });
    console.log("createMany WITHOUT id succeeded! Count:", res2.count);
  } catch (err) {
    console.error("createMany WITHOUT id failed:", err.message);
  }

  // Cleanup test batch
  await prisma.importBatch.delete({ where: { id: batch.id } });
  console.log("Cleaned up test batch.");
}

testInsert().catch(console.error).finally(() => prisma.$disconnect());
