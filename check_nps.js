const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function check() {
  console.log("--- SURVEY FORM STATUS COUNTS ---")
  const statusCounts = await prisma.surveyForm.groupBy({
    by: ["status"],
    _count: true
  })
  console.log(JSON.stringify(statusCounts, null, 2))

  console.log("\n--- NPS RESPONSES DATA ---")
  const npsQuestions = await prisma.surveyQuestion.findMany({
    where: { questionType: { in: ["NPS", "nps"] } },
    select: { id: true, questionText: true, ratingScaleMax: true }
  })
  console.log("NPS Questions found:", npsQuestions.length)

  for (const q of npsQuestions) {
    const responses = await prisma.surveyResponse.findMany({
      where: { questionId: q.id },
      select: { numericScore: true, formId: true }
    })
    console.log(`\nQuestion: ${q.questionText} (ID: ${q.id})`)
    console.log(`Total responses: ${responses.length}`)
    
    const scores = responses.map(r => r.numericScore).filter(s => s !== null)
    console.log("Scores found:", scores)
    
    const promoters = scores.filter(s => s >= 9).length
    const passives = scores.filter(s => s >= 7 && s <= 8).length
    const detractors = scores.filter(s => s <= 6).length
    console.log(`Calc: Promoters=${promoters}, Passives=${passives}, Detractors=${detractors}`)
    if (scores.length > 0) {
       console.log(`NPS Calculation: ((${promoters} - ${detractors}) / ${scores.length}) * 100 = ${Math.round(((promoters - detractors) / scores.length) * 100)}`)
    }
  }
}

check().catch(e => console.error(e)).finally(() => prisma.$disconnect())
