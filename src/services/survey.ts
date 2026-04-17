import { prisma } from "@/lib/db"

export async function getActiveSurveyPeriod() {
  return await prisma.surveyPeriod.findFirst({
    where: { isActive: true, status: 'ACTIVE' },
    orderBy: { startDate: 'desc' }
  })
}

export async function submitSurvey(data: {
  surveyPeriodId: string;
  parentId: string;
  studentId: string;
  classId: string;
  campusId: string;
  academicYearId: string;
  responses: Array<{ questionId: string; numericScore?: number; textAnswer?: string; choiceAnswer?: string; questionType: string; calculatedWeightedScore?: number }>
}) {
  const form = await prisma.surveyForm.create({
    data: {
      surveyPeriodId: data.surveyPeriodId,
      parentId: data.parentId,
      studentId: data.studentId,
      classId: data.classId,
      campusId: data.campusId,
      academicYearId: data.academicYearId,
      status: 'SUBMITTED',
      responses: {
        create: data.responses.map(r => ({
          questionId: r.questionId,
          numericScore: r.numericScore,
          textAnswer: r.textAnswer,
          choiceAnswer: r.choiceAnswer,
          calculatedWeightedScore: r.calculatedWeightedScore
        }))
      }
    }
  })
  
  // Basic sync summary trigger can be logic here
  // Omitted complex real-time recalc for brevity, would be handled efficiently in a queue
  return form
}

export async function getSurveyQuestions() {
  return await prisma.surveySection.findMany({
    include: { questions: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { sortOrder: 'asc' }
  })
}
