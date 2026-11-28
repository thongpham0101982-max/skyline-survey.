import { NextRequest, NextResponse } from 'next/server';
import { renderStudentQrCodeDataUrl, getStudentVerifyUrl } from '@/lib/student/lifelong-qr';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { isParentRole, isStudentRole } from '@/lib/rbac-utils';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id as string | undefined;
    const role = String((session?.user as any)?.role || '').trim();
    if (!session?.user || !userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Vui lòng đăng nhập để truy cập mã QR học sinh' },
        { status: 401 }
      );
    }

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
        parentId: true,
        class: { select: { className: true, grade: true } },
        campus: { select: { campusName: true } },
      },
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy học sinh' }, { status: 404 });
    }

    // Kiểm soát phạm vi dữ liệu cho Phụ huynh & Học sinh (chống IDOR)
    if (isParentRole(role)) {
      const parent = await prisma.parent.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!parent || student.parentId !== parent.id) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Bạn chỉ được phép xem mã QR của con em mình' },
          { status: 403 }
        );
      }
    } else if (isStudentRole(role)) {
      const sessionStudentCode = String((session?.user as any)?.studentCode || '').trim();
      if (!sessionStudentCode || sessionStudentCode.toUpperCase() !== cleanCode.toUpperCase()) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Bạn chỉ được phép xem mã QR của chính mình' },
          { status: 403 }
        );
      }
    }

    const qrDataUrl = await renderStudentQrCodeDataUrl(cleanCode, 500);
    const verifyUrl = getStudentVerifyUrl(cleanCode);

    return NextResponse.json({
      success: true,
      data: {
        studentCode: cleanCode,
        studentName: student.studentName || '',
        className: student.class?.className || '',
        campusName: student.campus?.campusName || '',
        verifyUrl,
        qrDataUrl,
      },
    });
  } catch (error: any) {
    console.error('Error generating student QR code:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi tạo mã QR' },
      { status: 500 }
    );
  }
}
