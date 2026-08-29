// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { signStudentToken } from '@/lib/student-session'
import { getDefaultAcademicYear } from '@/lib/academicYear'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { studentCode, password } = await req.json()
    const code = String(studentCode || '').trim()
    const rawPassword = String(password || '').trim()
    
    if (!code) {
      return NextResponse.json({ error: 'Vui lòng nhập Mã học sinh.' }, { status: 400 })
    }
    if (!rawPassword) {
      return NextResponse.json({ error: 'Vui lòng nhập Mật khẩu.' }, { status: 400 })
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
        dateOfBirth: true,
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
          dateOfBirth: true,
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

    // Xác thực mật khẩu
    let isValidPassword = false;
    const userAccount = await prisma.user.findFirst({
      where: {
        OR: [
          { email: code },
          { email: code.toLowerCase() },
          { email: code.toUpperCase() }
        ]
      }
    });
    if (userAccount && userAccount.passwordHash) {
      isValidPassword = await bcrypt.compare(rawPassword, userAccount.passwordHash);
    }

    // Mật khẩu mặc định là ngày sinh DDMMYYYY hoặc 123456 hoặc skyline@123
    if (!isValidPassword && student.dateOfBirth) {
      const d = new Date(student.dateOfBirth);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = String(d.getFullYear());
      const dobFormatted = `${day}${month}${year}`;
      const dobHyphen = `${day}-${month}-${year}`;
      const dobSlash = `${day}/${month}/${year}`;
      if (rawPassword === dobFormatted || rawPassword === dobHyphen || rawPassword === dobSlash) {
        isValidPassword = true;
      }
    }

    if (!isValidPassword) {
      if (rawPassword === "123456" || rawPassword === "skyline@123" || rawPassword === code) {
        isValidPassword = true;
      }
    }

    if (!isValidPassword) {
      return NextResponse.json({ error: 'Mật khẩu không chính xác. Mật khẩu mặc định là ngày sinh dạng DDMMYYYY (hoặc 123456).' }, { status: 401 });
    }
    
    const token = signStudentToken({
      studentId: student.id, 
      studentCode: student.studentCode, 
      studentName: student.studentName,
      classId: student.classId, 
      className: student.class?.className || '',
      campusId: student.campusId,
      campusName: student.campus?.campusName || '', 
      academicYearId: student.academicYearId,
      exp: Date.now() + 2 * 24 * 60 * 60 * 1000
    });
    
    const studentPayload = {
      id: student.id,
      studentCode: student.studentCode,
      studentName: student.studentName,
      classId: student.classId,
      className: student.class?.className || '',
      grade: student.class?.grade || '',
      campusId: student.campusId,
      campusName: student.campus?.campusName || ''
    };

    const res = NextResponse.json({ 
      ok: true, 
      token, 
      studentName: student.studentName,
      student: studentPayload
    });
    
    res.cookies.set('hs_token', token, { path: '/', maxAge: 2 * 24 * 60 * 60, httpOnly: true, sameSite: 'lax' });
    return res;
    
  } catch (e: any) {
    console.error('[STUDENT LOGIN ERROR]', e);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + (e?.message || 'Không thể xác thực học sinh') }, { status: 500 });
  }
}
