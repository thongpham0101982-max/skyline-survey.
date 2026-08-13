import { NextResponse } from 'next/server'
import { getStudentSession } from '@/lib/student-session'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

function jsonResponse(data: any, status = 200) {
  const res = NextResponse.json(data, { status })
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  return res
}

export async function GET() {
  try {
    const session = await getStudentSession()
    if (!session || !session.studentId) {
      return jsonResponse({ error: 'Chưa đăng nhập' }, 401)
    }

    const student = await prisma.student.findUnique({
      where: { id: session.studentId },
      include: { class: true, campus: true }
    })

    if (!student) {
      return jsonResponse({
        id: session.studentId,
        studentId: session.studentId,
        studentCode: session.studentCode,
        studentName: session.studentName,
        className: session.className || '',
        campusName: session.campusName || '',
        grade: session.className ? (session.className.match(/\d+/) || ['8'])[0] : '8'
      })
    }

    const cName = student.class?.className || session.className || ''
    const gradeVal = student.class?.grade || (cName ? (cName.match(/\d+/) || ['8'])[0] : '8')

    return jsonResponse({
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
    return jsonResponse({ error: error.message || 'Lỗi server' }, 500)
  }
}
