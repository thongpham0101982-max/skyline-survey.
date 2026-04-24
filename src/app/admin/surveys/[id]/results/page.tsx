import { Suspense } from 'react'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { ResultsDashboard as ResultsDashboardClient } from './ResultsDashboard'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ id: string }> }

async function DashboardData({ periodId, isGDCS, allowedCampusIds }: { periodId: string, isGDCS: boolean, allowedCampusIds: string[] }) {
  const period = await prisma.surveyPeriod.findUnique({
    where: { id: periodId },
    include: {
      questions: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } }
    }
  })
  if (!period) notFound()

  // Optimized fetch with selective fields and limited count
  const forms = await prisma.surveyForm.findMany({
    where: { 
      surveyPeriodId: periodId, 
      status: { in: ['SUBMITTED', 'submitted'] },
      ...(isGDCS ? { campusId: { in: allowedCampusIds } } : {})
    },
    include: {
      student: { select: { studentName: true } },
      class: { include: { campus: { select: { campusName: true } } } },
      responses: {
        select: {
          questionId: true,
          numericScore: true,
          textAnswer: true,
          choiceAnswer: true,
        }
      }
    },
    take: 1500 // Balanced limit
  })

  const totalForms = await prisma.surveyForm.count({ 
    where: { 
      surveyPeriodId: periodId, 
      ...(isGDCS ? { campusId: { in: allowedCampusIds } } : {}) 
    } 
  })

  const questionMap = new Map(period.questions.map(q => [q.id, q]))

  const serializedForms = forms.map(f => ({
    id: f.id,
    studentName: f.student?.studentName ?? '',
    className: f.class?.className ?? '',
    campusName: f.class?.campus?.campusName ?? '',
    responses: f.responses.map(r => {
      const q = questionMap.get(r.questionId)
      return {
        questionId: r.questionId,
        questionText: q?.questionText ?? '',
        questionType: q?.questionType ?? '',
        numericScore: r.numericScore,
        textAnswer: r.textAnswer,
        choiceAnswer: r.choiceAnswer,
      }
    })
  }))

  const serializedQuestions = period.questions.map(q => ({
    id: q.id,
    questionText: q.questionText,
    questionType: q.questionType,
    ratingScaleMin: q.ratingScaleMin ?? 0,
    ratingScaleMax: q.ratingScaleMax ?? 10,
    options: q.options,
  }))

  return (
    <ResultsDashboardClient
      periodId={periodId}
      periodName={period.name}
      periodCode={period.code}
      questions={serializedQuestions}
      forms={serializedForms as any}
      totalForms={totalForms}
    />
  )
}

export default async function SurveyResultsPage({ params }: PageProps) {
  const { id: periodId } = await params
  const session = await auth().catch(() => null);
  const user = session?.user as any;
  const isGDCS = user?.role === 'GDCS';
  const allowedCampusIds = Array.isArray(user?.campusIds) ? user.campusIds : [];

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
           <div className="w-16 h-16 border-4 border-[#4E79A7] border-t-transparent rounded-full animate-spin"></div>
           <div className="text-center">
              <h2 className="text-xl font-bold text-slate-800">Đang khởi tạo Dashboard báo cáo...</h2>
              <p className="text-slate-400 text-sm mt-2 font-medium italic">Hệ thống đang tổng hợp dữ liệu từ hàng ngàn phản hồi</p>
           </div>
        </div>
      }>
        <DashboardData periodId={periodId} isGDCS={isGDCS} allowedCampusIds={allowedCampusIds} />
      </Suspense>
    </div>
  )
}