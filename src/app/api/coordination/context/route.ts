import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { resolveUserCoordinationContext } from '@/lib/coordination/coordinationService';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập để tiếp tục.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get('academicYearId') || undefined;
    const studentId = searchParams.get('studentId') || undefined;

    const context = await resolveUserCoordinationContext({
      userId: session.user.id,
      role: (session.user as { role?: string }).role || 'PARENT',
      academicYearId,
      studentId,
    });

    return NextResponse.json({ success: true, data: context });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi khi tải ngữ cảnh phân công.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
