import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { previewEligibleGraduates, inheritStudentsToAlumni } from '@/lib/alumni/inherit-service';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const academicYearId = searchParams.get('academicYearId') || undefined;
  const campusId = searchParams.get('campusId') || undefined;
  const grade = searchParams.get('grade') || '12';
  const classId = searchParams.get('classId') || undefined;

  try {
    const list = await previewEligibleGraduates({
      academicYearId,
      campusId,
      grade,
      classId
    });
    return NextResponse.json({ success: true, count: list.length, data: list });
  } catch (error: any) {
    console.error('Error previewing eligible graduates:', error);
    return NextResponse.json({ error: error.message || 'Lỗi kiểm tra hồ sơ' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { academicYearId, campusId, grade = '12', classId, studentIds } = body;

    const user = session.user as any;
    const result = await inheritStudentsToAlumni(
      { academicYearId, campusId, grade, classId, studentIds },
      user.id || 'ADMIN',
      user.email || 'admin@skylineschool.edu.vn'
    );

    return NextResponse.json({
      success: true,
      message: `Đã chuyển đổi thành công ${result.totalCreated} hồ sơ sang phân hệ Alumni (Bỏ qua ${result.totalSkipped} hồ sơ đã tồn tại).`,
      result
    });
  } catch (error: any) {
    console.error('Error inheriting students to alumni:', error);
    return NextResponse.json({ error: error.message || 'Lỗi kế thừa hồ sơ' }, { status: 500 });
  }
}
