const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function check() {
  const q5 = await prisma.surveyQuestion.findFirst({
    where: { questionText: { contains: "4 năng lực" } }
  })
  console.log("--- Q5 CONFIG ---")
  console.log(JSON.stringify(q5, null, 2))
}

check().catch(e => console.error(e)).finally(() => prisma.$disconnect())
