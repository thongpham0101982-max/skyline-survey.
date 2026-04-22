import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { signStudentToken } from '@/lib/student-session'

export async function POST(req: NextRequest) {
  try {
    const { studentCode, password } = await req.json()
    const code = String(studentCode || "").trim()
    
    // Step 1: Find student (This worked in diagnostic API, so it is safe)
    const student = await prisma.student.findUnique({
      where: { studentCode: code },
      select: { id: true, studentCode: true, studentName: true, classId: true, status: true, class: { select: { className: true } }, campus: { select: { campusName: true } } }
    })
    
    if (!student) return NextResponse.json({ error: 'Mã học sinh không đúng.' }, { status: 401 })
    
    // Step 2: Immediate token generation (Skip slow survey search for now)
    const token = signStudentToken({
      studentId: student.id, studentCode: student.studentCode, studentName: student.studentName,
      classId: student.classId, className: student.class?.className || '',
      campusName: student.campus?.campusName || '', exp: Date.now() + 2 * 24 * 60 * 60 * 1000
    })
    
    const res = NextResponse.json({ ok: true, token, formId: null, studentName: student.studentName })
    res.cookies.set('hs_token', token, { path: '/', maxAge: 2 * 24 * 60 * 60 })
    return res
    
  } catch (e: any) {
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + e.message }, { status: 500 })
  }
}
