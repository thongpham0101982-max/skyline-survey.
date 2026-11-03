import { NextRequest, NextResponse } from 'next/server';
import { renderStudentQrCodeDataUrl, getStudentVerifyUrl } from '@/lib/student/lifelong-qr';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    if (!code) {
      return NextResponse.json({ success: false, error: 'Thiếu mã học sinh' }, { status: 400 });
    }

    const cleanCode = decodeURIComponent(code).trim();
    const student = await prisma.student.findFirst({
      where: { studentCode: cleanCode },
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        gender: true,
        class: { select: { className: true, grade: true } },
        campus: { select: { campusName: true } },
      },
    });

    const qrDataUrl = await renderStudentQrCodeDataUrl(cleanCode, 500);
    const verifyUrl = getStudentVerifyUrl(cleanCode);

    return NextResponse.json({
      success: true,
      data: {
        studentCode: cleanCode,
        studentName: student?.studentName || '',
        className: student?.class?.className || '',
        campusName: student?.campus?.campusName || '',
        verifyUrl,
        qrDataUrl,
      },
    });
  } catch (error: any) {
    console.error('Error generating student QR code:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi tạo mã QR: ' + error.message },
      { status: 500 }
    );
  }
}
