import { requireStudentSession } from '@/lib/student-session'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import HsFormClient from './client'

export default async function HsLamPage({ params }: { params: Promise<{ formId: string }> }) {
  const session = await requireStudentSession()
  const { formId } = await params

  const form = await prisma.surveyForm.findFirst({
    where: { id: formId, studentId: session.studentId },
    include: {
      surveyPeriod: {
        include: { questions: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } }
      },
      responses: true
    }
  })

  if (!form) redirect('/hocsinh/hs-khaosat/danh-sach')
  if (form.status === 'SUBMITTED' || form.status === 'submitted') redirect('/hocsinh/hs-khaosat/danh-sach')
  if (!form.surveyPeriod?.questions?.length) redirect('/hocsinh/hs-khaosat/danh-sach')

  // Parse existing answers if any
  const initialAnswers: Record<string, any> = {}
  if (form.responses && form.responses.length > 0) {
    for (const res of form.responses) {
      if (res.numericScore !== null && res.numericScore !== undefined) {
        initialAnswers[res.questionId] = res.numericScore
      } else if (res.textAnswer) {
        try {
          initialAnswers[res.questionId] = JSON.parse(res.textAnswer)
        } catch {
          initialAnswers[res.questionId] = res.textAnswer
        }
      } else if (res.choiceAnswer) {
        if (res.choiceAnswer.includes(', ')) {
          initialAnswers[res.questionId] = res.choiceAnswer.split(', ')
        } else {
          initialAnswers[res.questionId] = res.choiceAnswer
        }
      }
    }
  }

  return (
    <HsFormClient
      formId={form.id}
      periodName={form.surveyPeriod.name}
      studentName={session.studentName}
      className={session.className}
      initialAnswers={initialAnswers}
      questions={form.surveyPeriod.questions.map(q => ({
        id: q.id, 
        questionText: q.questionText, 
        questionType: q.questionType,
        ratingMin: q.ratingScaleMin ?? 1, 
        ratingMax: q.ratingScaleMax ?? 5,
        options: q.options, 
        isRequired: q.isRequired, 
        weight: q.weight
      }))}
    />
  )
}
