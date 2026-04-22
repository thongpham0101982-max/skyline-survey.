import { requireStudentSession } from '@/lib/student-session'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'

export default async function NewSurveyRedirectPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ periodId: string }> 
}) {
  const session = await requireStudentSession()
  const { periodId } = await searchParams

  if (!periodId) {
    redirect('/hocsinh/hs-khaosat/danh-sach')
  }

  const period = await prisma.surveyPeriod.findFirst({
    where: {
      id: periodId,
      status: 'ACTIVE',
      OR: [
        { targetAudience: 'HocSinh' },
        { targetAudience: 'HS' },
        { targetAudience: 'Học sinh' },
        { targetAudience: 'hocsinh' }
      ]
    }
  })

  if (!period) {
    redirect('/hocsinh/hs-khaosat/danh-sach')
  }

  const existingForm = await prisma.surveyForm.findFirst({
    where: {
      studentId: session.studentId,
      surveyPeriodId: periodId,
      parentId: null
    }
  })

  if (existingForm) {
    redirect(`/hocsinh/hs-khaosat/lam/${existingForm.id}`)
  }

  const newForm = await prisma.surveyForm.create({
    data: {
      surveyPeriodId: periodId,
      studentId: session.studentId,
      classId: session.classId,
      campusId: (session as any).campusId || '',
      academicYearId: (session as any).academicYearId || 'AY-2026',
      status: 'DRAFT'
    }
  })

  redirect(`/hocsinh/hs-khaosat/lam/${newForm.id}`)
}
