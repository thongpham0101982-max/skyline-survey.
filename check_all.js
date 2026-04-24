const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function check() {
  const allResponses = await prisma.surveyResponse.count()
  console.log(`Total survey responses in DB: ${allResponses}`)

  const samples = await prisma.surveyResponse.findMany({
    take: 5,
    include: { question: true }
  })
  console.log("Sample responses:", JSON.stringify(samples, null, 2))
}

check().catch(e => console.error(e)).finally(() => prisma.$disconnect())
