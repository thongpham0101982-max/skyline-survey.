import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { SurveyQuestionBuilderClient } from "./client"

export default async function SurveyQuestionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const period = await prisma.surveyPeriod.findUnique({
    where: { id },
    include: { academicYear: true, campus: true }
  })
  if (!period) return notFound()

  const questions = await prisma.surveyQuestion.findMany({
    where: { surveyPeriodId: id },
    orderBy: { sortOrder: "asc" },
    include: { section: { select: { id: true, name: true, code: true } } }
  })

  const categories = await prisma.surveySection.findMany({
    where: { status: "ACTIVE" },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, code: true, parentId: true }
  })

  return (
    <div className="min-h-screen bg-[#F3F4F6] p-3 md:p-6 font-outfit">
      <SurveyQuestionBuilderClient period={period} initialQuestions={questions} categories={categories} />
    </div>
  )
}
