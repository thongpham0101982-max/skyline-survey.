const fs = require("fs");

// Update questions page.tsx to pass categories
const pageContent = `import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { SurveyQuestionBuilderClient } from "./client"

export default async function SurveyQuestionsPage({ params }) {
  const { id } = await params
  
  const period = await prisma.surveyPeriod.findUnique({ where: { id } })
  if (!period) return notFound()

  const questions = await prisma.surveyQuestion.findMany({
    where: { surveyPeriodId: id },
    orderBy: { sortOrder: "asc" },
    include: { section: { select: { id: true, name: true } } }
  })

  const categories = await prisma.surveySection.findMany({
    where: { status: "ACTIVE" },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, code: true }
  })

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      <div className="mb-4 pl-1">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Studio Tao/Chinh Sua Form</h1>
        <p className="text-sm font-semibold text-indigo-600 mt-1 uppercase tracking-wider bg-indigo-50 inline-block px-3 py-1 rounded-full border border-indigo-200 shadow-sm">Target: {period.name}</p>
      </div>
      <SurveyQuestionBuilderClient surveyPeriodId={period.id} initialQuestions={questions} categories={categories} />
    </div>
  )
}
`;

fs.writeFileSync("src/app/admin/surveys/[id]/questions/page.tsx", pageContent, "utf8");
console.log("page.tsx updated OK");
