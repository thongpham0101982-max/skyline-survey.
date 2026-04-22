import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyStudentToken } from '@/lib/student-session'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('hs_token')?.value
    if (!token) return NextResponse.json({ error: 'Chua dang nhap' }, { status: 401 })
    const session = verifyStudentToken(token)
    if (!session) return NextResponse.json({ error: 'Phien het han, vui long dang nhap lai' }, { status: 401 })

    const { formId, answers } = await req.json()
    if (!formId || !answers) return NextResponse.json({ error: 'Thieu du lieu' }, { status: 400 })

    const form = await prisma.surveyForm.findFirst({
      where: { id: formId, studentId: session.studentId, status: { in: ['DRAFT', 'PENDING', 'pending'] } },
      include: { surveyPeriod: { include: { questions: true } } }
    })
    if (!form) return NextResponse.json({ error: 'Phieu khao sat khong hop le hoac da nop' }, { status: 404 })

    const responseData: any[] = []
    for (const [questionId, value] of Object.entries(answers)) {
      const q = form.surveyPeriod.questions.find((x: any) => x.id === questionId)
      if (!q) continue
      responseData.push({
        formId: form.id, questionId,
        numericScore: q.questionType === 'RATING' ? Number(value) : null,
        textAnswer: q.questionType === 'TEXT' ? String(value) : null,
        choiceAnswer: q.questionType === 'CHOICE' ? String(value) : null,
        calculatedWeightedScore: q.questionType === 'RATING' ? Number(value) * q.weight : null
      })
    }

    await prisma.$transaction([
      prisma.surveyResponse.createMany({ data: responseData, skipDuplicates: true }),
      prisma.surveyForm.update({ where: { id: formId }, data: { status: 'SUBMITTED', submissionDateTime: new Date() } })
    ])

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Submit error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
