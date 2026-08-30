const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@libsql/client/web");
const { PrismaLibSQL } = require("@prisma/adapter-libsql");

const TURSO_URL = "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const libsql = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });

async function testScopedProfileQuery() {
  const classId = "cmnoeo32g00013gfgwiuy0h0q"; // Class 2.1_CS1
  console.time("Query class students");

  const students = await prisma.student.findMany({
    where: {
      classId,
      NOT: { studentCode: { startsWith: "2" } }
    },
    include: {
      class: { select: { className: true, grade: true, classCode: true } },
      campus: { select: { campusName: true } },
      academicYear: { select: { name: true } },
      learningCommitments: true,
      careerOrientations: true,
      highlightComments: true,
      studentTransfers: true,
      achievements: {
        include: {
          achievement: {
            include: { exam: { include: { round: true, category: true } } }
          }
        }
      },
      termScores: { include: { subject: true } },
      termSummaries: true,
    },
    orderBy: { studentName: "asc" }
  });

  console.timeEnd("Query class students");
  console.log(`Fetched ${students.length} students in class 2.1_CS1`);

  const studentIds = students.map(s => s.id);
  const studentCodesArr = students.map(s => s.studentCode).filter(Boolean);

  console.time("Query scoped participants");
  const participants = await prisma.activityParticipant.findMany({
    where: {
      OR: [
        { studentId: { in: studentIds } },
        { student: { studentCode: { in: studentCodesArr } } }
      ]
    },
    include: {
      record: {
        include: { catalog: { include: { group: true } } }
      }
    }
  });
  console.timeEnd("Query scoped participants");
  console.log(`Fetched ${participants.length} scoped participants`);
}

testScopedProfileQuery().catch(console.error).finally(() => prisma.$disconnect());
