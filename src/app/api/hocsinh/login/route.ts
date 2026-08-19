// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { signStudentToken } from '@/lib/student-session'
import { getDefaultAcademicYear } from '@/lib/academicYear'

export async function POST(req: NextRequest) {
  try {
    const { studentCode, password } = await req.json()
    const code = String(studentCode || '').trim()
    
    // Tìm học sinh
    const defaultYear = await getDefaultAcademicYear(prisma);
    const student = await prisma.student.findFirst({
      where: { 
        OR: [
          { studentCode: code },
          { studentCode: code.toUpperCase() },
          { studentCode: code.toLowerCase() }
        ],
        ...(defaultYear ? { academicYearId: defaultYear.id } : {})
      },
      select: { 
        id: true, 
        studentCode: true, 
        studentName: true, 
        classId: true, 
        campusId: true,
        academicYearId: true,
        status: true, 
        class: { select: { className: true, grade: true } }, 
        campus: { select: { campusName: true } } 
      }
    }) || await prisma.student.findFirst({
      where: { studentCode: code },
      orderBy: { academicYear: { startDate: 'desc' } },
      select: { 
        id: true, 
        studentCode: true, 
        studentName: true, 
        classId: true, 
        campusId: true,
        academicYearId: true,
        status: true, 
        class: { select: { className: true, grade: true } }, 
        campus: { select: { campusName: true } } 
      }
    });
    
    if (!student) return NextResponse.json({ error: 'Mã học sinh không đúng.' }, { status: 401 })
    if (student.status && student.status !== 'ACTIVE') return NextResponse.json({ error: 'Tài khoản học sinh đã bị khóa hoặc ngừng hoạt động.' }, { status: 403 })
    
    const token = signStudentToken({
      studentId: student.id, 
      studentCode: student.studentCode, 
      studentName: student.studentName,
      classId: student.classId, 
      className: student.class?.className || '',
      campusName: student.campus?.campusName || '', 
      exp: Date.now() + 2 * 24 * 60 * 60 * 1000
    })
    
    const studentPayload = {
      id: student.id,
      studentCode: student.studentCode,
      studentName: student.studentName,
      classId: student.classId,
      className: student.class?.className || '',
      grade: student.class?.grade || '',
      campusName: student.campus?.campusName || ''
    }

    const res = NextResponse.json({ 
      ok: true, 
      token, 
      studentName: student.studentName,
      student: studentPayload
    })
    
    res.cookies.set('hs_token', token, { path: '/', maxAge: 2 * 24 * 60 * 60 })
    return res
    
  } catch (e: any) {
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + e.message }, { status: 500 })
  }
}
