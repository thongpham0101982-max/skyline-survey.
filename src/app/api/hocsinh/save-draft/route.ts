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
      where: { 
        id: formId, 
        studentId: session.studentId, 
        status: { notIn: ['SUBMITTED', 'submitted', 'COMPLETED', 'completed'] } 
      },
      include: { surveyPeriod: { include: { questions: true } } }
    })
    if (!form) return NextResponse.json({ error: 'Phiếu khảo sát không hợp lệ hoặc đã nộp' }, { status: 404 })

    const responseData: any[] = []
    for (const [questionId, value] of Object.entries(answers)) {
      const q = form.surveyPeriod.questions.find((x: any) => x.id === questionId)
      if (!q) continue
      
      const type = q.questionType?.toUpperCase() || ''
      const isRating = ['RATING', 'NPS', 'LIKERT', 'SATISFACTION', 'SCALE_0_4'].includes(type)
      const isText = ['TEXT', 'OPEN_ENDED', 'COMMENT', 'ESSAY'].includes(type)
      const isChoice = ['CHOICE', 'MULTIPLE_CHOICE', 'DROPDOWN', 'RADIO', 'SINGLE_CHOICE'].includes(type)
      const isGrid = ['MC_GRID', 'CB_GRID', 'GRID'].includes(type)
      const isCheck = ['CHECKBOX', 'MULTI_SELECT'].includes(type)

      responseData.push({
        formId: form.id, 
        questionId,
        numericScore: isRating && value !== undefined && value !== null && !isNaN(Number(value)) ? Math.round(Number(value)) : null,
        textAnswer: (isText || isGrid) ? (typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')) : null,
        choiceAnswer: (isChoice || isCheck) ? (Array.isArray(value) ? value.join(', ') : String(value ?? '')) : null,
        calculatedWeightedScore: isRating && value !== undefined && value !== null && !isNaN(Number(value)) ? Number(value) * (q.weight || 1) : null
      })
    }

    await prisma.$transaction([
      prisma.surveyResponse.deleteMany({ where: { formId: form.id } }),
      prisma.surveyResponse.createMany({ data: responseData })
    ])

    return NextResponse.json({ ok: true, message: 'Đã lưu tạm thành công' })
  } catch (e: any) {
    console.error('Save draft error:', e)
    return NextResponse.json({ error: e.message || 'Lỗi lưu dữ liệu' }, { status: 500 })
  }
}
