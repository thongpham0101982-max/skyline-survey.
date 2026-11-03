import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCoordinationDashboardData } from '@/lib/coordination/coordinationService';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập để tiếp tục.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const viewMode = (searchParams.get('viewMode') as 'GVCN' | 'GVBM' | 'PARENT' | 'ADMIN_QA') || undefined;

    const data = await getCoordinationDashboardData({
      userId: session.user.id,
      userRole: (session.user as { role?: string }).role || 'PARENT',
      viewMode,
      academicYearId: searchParams.get('academicYearId') || undefined,
      periodId: searchParams.get('periodId') || undefined,
      campusId: searchParams.get('campusId') || undefined,
      level: searchParams.get('level') || undefined,
      programType: searchParams.get('programType') || undefined,
      grade: searchParams.get('grade') || undefined,
      classId: searchParams.get('classId') || undefined,
      subjectId: searchParams.get('subjectId') || undefined,
      departmentId: searchParams.get('departmentId') || undefined,
      teacherId: searchParams.get('teacherId') || undefined,
      studentId: searchParams.get('studentId') || undefined,
      status: searchParams.get('status') || undefined,
      topic: searchParams.get('topic') || undefined,
      fromDate: searchParams.get('fromDate') || undefined,
      toDate: searchParams.get('toDate') || undefined,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Lỗi khi tải dữ liệu Dashboard.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
