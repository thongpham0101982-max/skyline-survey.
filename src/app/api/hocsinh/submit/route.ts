import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyStudentToken } from '@/lib/student-session'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('hs_token')?.value
    if (!token) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    const session = verifyStudentToken(token)
    if (!session) return NextResponse.json({ error: 'Phiên hết hạn, vui lòng đăng nhập lại' }, { status: 401 })

    const { formId, answers } = await req.json()
    if (!formId || !answers) return NextResponse.json({ error: 'Thiếu dữ liệu' }, { status: 400 })

    const form = await prisma.surveyForm.findFirst({
      where: { id: formId, studentId: session.studentId, status: { in: ['DRAFT', 'PENDING', 'pending'] } },
      include: { surveyPeriod: { include: { questions: true } } }
    })
    if (!form) return NextResponse.json({ error: 'Phiếu khảo sát không hợp lệ hoặc đã nộp' }, { status: 404 })

    const responseData: any[] = []
    for (const [questionId, value] of Object.entries(answers)) {
      const q = form.surveyPeriod.questions.find((x: any) => x.id === questionId)
      if (!q) continue
      
      const type = q.questionType?.toUpperCase()
      const isRating = ['RATING', 'NPS', 'LIKERT', 'SATISFACTION'].includes(type)
      const isText = ['TEXT', 'OPEN_ENDED', 'COMMENT', 'ESSAY'].includes(type)
      const isChoice = ['CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN', 'RADIO', 'CHECKBOX', 'MULTI_SELECT'].includes(type)
      const isGrid = ['MC_GRID', 'CB_GRID', 'GRID'].includes(type)

      responseData.push({
        formId: form.id, 
        questionId,
        numericScore: isRating ? Number(value) : null,
        textAnswer: (isText || isGrid) ? (typeof value === 'object' ? JSON.stringify(value) : String(value)) : null,
        choiceAnswer: isChoice ? (Array.isArray(value) ? value.join(', ') : String(value)) : null,
        calculatedWeightedScore: isRating ? Number(value) * q.weight : null
      })
    }

    await prisma.$transaction([
      prisma.surveyResponse.deleteMany({ where: { formId: form.id } }),
      prisma.surveyResponse.createMany({ data: responseData }),
      prisma.surveyForm.update({ where: { id: formId }, data: { status: 'SUBMITTED', submissionDateTime: new Date() } })
    ])

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Submit error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
