import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { ResultsDashboardClient } from './client'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ id: string }> }

export default async function SurveyResultsPage({ params }: PageProps) {
  const { id: periodId } = await params

  const period = await prisma.surveyPeriod.findUnique({
    where: { id: periodId },
    include: {
      questions: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } }
    }
  })
  if (!period) notFound()

  // Fetch all submitted forms with responses, class, campus info
  const forms = await prisma.surveyForm.findMany({
    where: { surveyPeriodId: periodId, status: { in: ['SUBMITTED', 'submitted'] } },
    include: {
      student: true,
      class: { include: { campus: true } },
      responses: { include: { question: true } }
    }
  })

  // Total forms (all statuses) for completion rate
  const totalForms = await prisma.surveyForm.count({ where: { surveyPeriodId: periodId } })

  // Serialize for client
  const serializedForms = forms.map(f => ({
    id: f.id,
    studentId: f.studentId,
    studentName: f.student?.studentName ?? '',
    classId: f.classId,
    className: f.class?.className ?? '',
    campusId: f.class?.campusId ?? f.campusId,
    campusName: f.class?.campus?.campusName ?? '',
    submittedAt: f.submissionDateTime?.toISOString() ?? null,
    responses: f.responses.map(r => ({
      questionId: r.questionId,
      questionText: r.question?.questionText ?? '',
      questionType: r.question?.questionType ?? '',
      numericScore: r.numericScore,
      textAnswer: r.textAnswer,
      choiceAnswer: r.choiceAnswer,
    }))
  }))

  const serializedQuestions = period.questions.map(q => ({
    id: q.id,
    questionText: q.questionText,
    questionType: q.questionType,
    ratingScaleMin: q.ratingScaleMin ?? 0,
    ratingScaleMax: q.ratingScaleMax ?? 10,
    options: q.options,
    weight: q.weight,
  }))

  return (
    <ResultsDashboardClient
      periodId={periodId}
      periodName={period.name}
      periodCode={period.code}
      questions={serializedQuestions}
      forms={serializedForms}
      totalForms={totalForms}
    />
  )
}
