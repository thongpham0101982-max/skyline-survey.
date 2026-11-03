import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAlumniAnalytics } from '@/lib/alumni/analytics-service';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const campusId = searchParams.get('campusId') || undefined;
  const graduationYear = searchParams.get('graduationYear') || undefined;
  const graduationGrade = searchParams.get('graduationGrade') || undefined;
  const verificationStatus = searchParams.get('verificationStatus') || undefined;

  try {
    const data = await getAlumniAnalytics({
      campusId,
      graduationYear,
      graduationGrade,
      verificationStatus
    });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching alumni analytics:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tải báo cáo phân tích' }, { status: 500 });
  }
}
