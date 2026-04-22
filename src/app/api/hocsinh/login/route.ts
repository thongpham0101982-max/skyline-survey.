import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { signStudentToken } from '@/lib/student-session'

export async function POST(req: NextRequest) {
  try {
    const { studentCode, password } = await req.json()
    if (!studentCode) return NextResponse.json({ error: 'Vui long nhap ma hoc sinh' }, { status: 400 })
    const code = String(studentCode).trim()
    const student = await prisma.student.findUnique({
      where: { studentCode: code },
      include: { class: true, campus: true }
    })
    if (!student || student.status !== 'ACTIVE')
      return NextResponse.json({ error: 'Ma hoc sinh khong ton tai hoac da bi khoa' }, { status: 401 })
    const pwd = password ? String(password).trim() : code
    if (pwd !== student.studentCode)
      return NextResponse.json({ error: 'Mat khau khong dung. Mac dinh la ma hoc sinh.' }, { status: 401 })
    const token = signStudentToken({
      studentId: student.id, studentCode: student.studentCode, studentName: student.studentName,
      classId: student.classId, className: student.class?.className || '',
      campusName: student.campus?.campusName || '', exp: Date.now() + 8 * 60 * 60 * 1000
    })
    const res = NextResponse.json({ ok: true })
    res.cookies.set('hs_token', token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 8 * 60 * 60, path: '/'
    })
    return res
  } catch (e: any) {
    return NextResponse.json({ error: 'Loi he thong: ' + e.message }, { status: 500 })
  }
}
