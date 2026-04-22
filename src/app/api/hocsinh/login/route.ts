import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { signStudentToken } from '@/lib/student-session'

export async function POST(req: NextRequest) {
  try {
    const { studentCode, password } = await req.json()
    if (!studentCode) return NextResponse.json({ error: 'Vui lòng nhập mã học sinh' }, { status: 400 })
    const code = String(studentCode).trim()
    
    const student = await prisma.student.findUnique({
      where: { studentCode: code },
      include: { class: true, campus: true }
    })
    
    if (!student || student.status !== 'ACTIVE')
      return NextResponse.json({ error: 'Mã học sinh không tồn tại hoặc đã bị khóa' }, { status: 401 })
    
    const pwd = password ? String(password).trim() : code
    if (pwd !== student.studentCode)
      return NextResponse.json({ error: 'Mật khẩu không đúng. Mặc định là mã học sinh.' }, { status: 401 })
    
    // Find the first assigned survey that is not yet submitted
    const pendingForm = await prisma.surveyForm.findFirst({
      where: {
        studentId: student.id,
        status: 'DRAFT',
        surveyPeriod: { status: 'ACTIVE', isActive: true, targetAudience: 'HocSinh' }
      },
      select: { id: true }
    })

    const token = signStudentToken({
      studentId: student.id, studentCode: student.studentCode, studentName: student.studentName,
      classId: student.classId, className: student.class?.className || '',
      campusName: student.campus?.campusName || '', exp: Date.now() + 8 * 60 * 60 * 1000
    })
    
    const res = NextResponse.json({ ok: true, formId: pendingForm?.id || null })
    res.cookies.set('hs_token', token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 8 * 60 * 60, path: '/'
    })
    return res
  } catch (e: any) {
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + e.message }, { status: 500 })
  }
}
