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
    
    if (!student) return NextResponse.json({ error: `Mã học sinh "${code}" không tồn tại.` }, { status: 401 })
    if (student.status && student.status !== 'ACTIVE') return NextResponse.json({ error: 'Tài khoản đang bị khóa.' }, { status: 401 })
    
    const pwd = password ? String(password).trim() : code
    if (pwd !== student.studentCode) return NextResponse.json({ error: 'Mật khẩu không đúng.' }, { status: 401 })
    
    const pendingForm = await prisma.surveyForm.findFirst({
      where: { 
        studentId: student.id, 
        status: 'DRAFT',
        surveyPeriod: { status: 'ACTIVE' }
      },
      select: { id: true }
    })

    const token = signStudentToken({
      studentId: student.id, studentCode: student.studentCode, studentName: student.studentName,
      classId: student.classId, className: student.class?.className || '',
      campusName: student.campus?.campusName || '', exp: Date.now() + 2 * 24 * 60 * 60 * 1000 // 2 days
    })
    
    const res = NextResponse.json({ ok: true, token, formId: pendingForm?.id || null, studentName: student.studentName })
    
    // Set cookie with broad compatibility
    res.cookies.set('hs_token', token, {
      httpOnly: false, // temporarily false for compatibility check
      secure: false,   // temporarily false for compatibility check
      sameSite: 'lax',
      maxAge: 2 * 24 * 60 * 60,
      path: '/'
    })
    
    return res
  } catch (e: any) {
    return NextResponse.json({ error: 'Lỗi: ' + e.message }, { status: 500 })
  }
}
