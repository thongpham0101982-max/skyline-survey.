import { NextResponse } from 'next/server'
import { getStudentSession } from '@/lib/student-session'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getStudentSession()
    if (!session || !session.studentId) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }

    const student = await prisma.student.findUnique({
      where: { id: session.studentId },
      include: { class: true, campus: true }
    })

    if (!student) {
      return NextResponse.json({
        id: session.studentId,
        studentId: session.studentId,
        studentCode: session.studentCode,
        studentName: session.studentName,
        className: session.className || '',
        campusName: session.campusName || '',
        grade: session.className ? (session.className.match(/\d+/) || ['11'])[0] : '11'
      })
    }

    const cName = student.class?.className || session.className || ''
    const gradeVal = student.class?.grade || (cName ? (cName.match(/\d+/) || ['11'])[0] : '11')

    return NextResponse.json({
      id: student.id,
      studentId: student.id,
      studentCode: student.studentCode,
      studentName: student.studentName,
      className: cName,
      campusName: student.campus?.campusName || session.campusName || '',
      grade: gradeVal
    })
  } catch (error: any) {
    console.error("GET /api/hocsinh/me error:", error)
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 })
  }
}
