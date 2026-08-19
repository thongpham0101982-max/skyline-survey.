// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { signStudentToken } from '@/lib/student-session'
import { getDefaultAcademicYear } from '@/lib/academicYear'

export async function POST(req: NextRequest) {
  try {
    const { studentCode, password } = await req.json()
    const code = String(studentCode || '').trim()
    
    if (!code) {
      return NextResponse.json({ error: 'Vui lòng nhập Mã học sinh.' }, { status: 400 })
    }

    const defaultYear = await getDefaultAcademicYear(prisma).catch(() => null);
    
    let student = await prisma.student.findFirst({
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
    }).catch(() => null);

    if (!student) {
      const candidates = await prisma.student.findMany({
        where: {
          OR: [
            { studentCode: code },
            { studentCode: code.toUpperCase() },
            { studentCode: code.toLowerCase() }
          ]
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
      }).catch(() => []);

      student = candidates[0] || null;
    }
    
    if (!student) {
      return NextResponse.json({ error: 'Mã học sinh không tồn tại trong hệ thống.' }, { status: 401 })
    }

    if (student.status && student.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Tài khoản học sinh đã bị khóa hoặc ngừng hoạt động.' }, { status: 403 })
    }
    
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
    console.error('[STUDENT LOGIN ERROR]', e)
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + (e?.message || 'Không thể xác thực học sinh') }, { status: 500 })
  }
}
