import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { ResultsDashboard as ResultsDashboardClient } from './ResultsDashboard'

export const dynamic = 'force-dynamic'

interface PageProps { params: Promise<{ id: string }> }

export default async function SurveyResultsPage({ params }: PageProps) {
  try {
    const { id: periodId } = await params
    const session = await auth().catch(() => null);
    const user = session?.user as any;
    const isGDCS = user?.role === 'GDCS';
    const allowedCampusIds = Array.isArray(user?.campusIds) ? user.campusIds : [];

    const period = await prisma.surveyPeriod.findUnique({
      where: { id: periodId },
      include: {
        questions: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } }
      }
    })
    if (!period) notFound()

    // LIMIT the number of records to 2000 for safety on Vercel
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
      take: 2000
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
  } catch (error: any) {
    console.error("SurveyResultsPage Error:", error);
    return (
      <div className="p-20 text-center bg-white min-h-screen flex flex-col items-center justify-center">
        <div className="bg-red-50 p-10 rounded-3xl border border-red-100 max-w-2xl">
          <h1 className="text-3xl font-black text-red-600 tracking-tight">Lỗi tải dữ liệu báo cáo</h1>
          <p className="text-slate-600 mt-4 font-medium">{error.message || "Đã xảy ra lỗi không xác định"}</p>
          <pre className="mt-8 p-6 bg-white rounded-2xl text-left overflow-auto text-[10px] font-mono text-slate-400 border border-slate-100">
            {error.stack}
          </pre>
        </div>
      </div>
    )
  }
}