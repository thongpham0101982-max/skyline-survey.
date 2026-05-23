const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function check() {
  const questions = await prisma.surveyQuestion.findMany({
    select: { id: true, questionText: true, questionType: true }
  })
  console.log("--- ALL QUESTIONS ---")
  console.log(JSON.stringify(questions, null, 2))

  const samples = await prisma.surveyResponse.findMany({
    take: 10,
    orderBy: { createdAt: "desc" }
  })
  console.log("\n--- SAMPLE RESPONSES ---")
  console.log(JSON.stringify(samples, null, 2))
}

check().catch(e => console.error(e)).finally(() => prisma.$disconnect())
