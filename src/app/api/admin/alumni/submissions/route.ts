import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAlumniDb } from '@/lib/alumni/alumni-db';
import { reviewSubmission } from '@/lib/alumni/submission-service';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'PENDING';
  const campusId = searchParams.get('campusId') || '';
  const search = searchParams.get('search') || '';

  const db = getAlumniDb();

  let where = 'WHERE 1=1';
  const args: any[] = [];

  if (status && status !== 'all') {
    where += ` AND s.status = ?`;
    args.push(status);
  }
  if (campusId && campusId !== 'all') {
    where += ` AND a.campusId = ?`;
    args.push(campusId);
  }
  if (search) {
    where += ` AND (a.studentName LIKE ? OR a.studentCode LIKE ? OR s.submissionCode LIKE ?)`;
    const p = `%${search}%`;
    args.push(p, p, p);
  }

  try {
    const res = await db.execute({
      sql: `SELECT s.id, s.alumniId, s.submissionCode, s.payload, s.status,
                   s.reviewerId, s.reviewedAt, s.reviewNotes, s.ipAddress, s.createdAt,
                   a.studentCode, a.studentName, a.campusId, a.graduationYear, a.lastClassName,
                   a.personalEmail, a.personalPhone, a.currentEmployer, a.currentJobTitle
            FROM AlumniUpdateSubmission s
            JOIN AlumniProfile a ON s.alumniId = a.id
            ${where}
            ORDER BY s.createdAt DESC
            LIMIT 100`,
      args
    });

    const submissions = res.rows.map(r => ({
      id: String(r.id),
      alumniId: String(r.alumniId),
      submissionCode: String(r.submissionCode),
      status: String(r.status),
      reviewerId: r.reviewerId ? String(r.reviewerId) : null,
      reviewedAt: r.reviewedAt ? String(r.reviewedAt) : null,
      reviewNotes: r.reviewNotes ? String(r.reviewNotes) : null,
      ipAddress: r.ipAddress ? String(r.ipAddress) : null,
      createdAt: String(r.createdAt),
      studentCode: String(r.studentCode),
      studentName: String(r.studentName),
      campusId: String(r.campusId),
      graduationYear: Number(r.graduationYear),
      lastClassName: r.lastClassName ? String(r.lastClassName) : '',
      currentInfo: {
        personalEmail: r.personalEmail ? String(r.personalEmail) : '',
        personalPhone: r.personalPhone ? String(r.personalPhone) : '',
        currentEmployer: r.currentEmployer ? String(r.currentEmployer) : '',
        currentJobTitle: r.currentJobTitle ? String(r.currentJobTitle) : ''
      },
      submittedData: JSON.parse(String(r.payload || '{}'))
    }));

    return NextResponse.json({ success: true, count: submissions.length, data: submissions });
  } catch (error: any) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tải danh sách yêu cầu' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });
  }

  const user = session.user as any;

  try {
    const body = await req.json();
    const { submissionId, action, reviewNotes } = body;

    if (!submissionId || !action) {
      return NextResponse.json({ error: 'Thiếu thông tin phê duyệt' }, { status: 400 });
    }

    const result = await reviewSubmission(
      submissionId,
      action,
      reviewNotes || '',
      user.id || 'ADMIN',
      user.email || 'admin@skylineschool.edu.vn'
    );

    return NextResponse.json({
      success: true,
      message: action === 'APPROVE' ? 'Đã phê duyệt cập nhật thành công!' : 'Đã cập nhật trạng thái đơn.',
      result
    });
  } catch (error: any) {
    console.error('Error reviewing submission:', error);
    return NextResponse.json({ error: error.message || 'Lỗi kiểm duyệt đơn cập nhật' }, { status: 500 });
  }
}
