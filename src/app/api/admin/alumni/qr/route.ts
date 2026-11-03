import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAlumniDb } from '@/lib/alumni/alumni-db';
import { reissueQrToken, getOrCreateActiveQrToken, getPortalBaseUrl } from '@/lib/alumni/qr-service';
import { logActivity } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'ACTIVE';
  const campusId = searchParams.get('campusId') || '';
  const graduationYear = searchParams.get('graduationYear') || '';
  const search = searchParams.get('search') || '';

  const db = getAlumniDb();

  let where = 'WHERE 1=1';
  const args: any[] = [];

  if (status && status !== 'all') {
    where += ` AND q.status = ?`;
    args.push(status);
  }
  if (campusId && campusId !== 'all') {
    where += ` AND a.campusId = ?`;
    args.push(campusId);
  }
  if (graduationYear && graduationYear !== 'all') {
    where += ` AND a.graduationYear = ?`;
    args.push(Number(graduationYear));
  }
  if (search) {
    where += ` AND (a.studentName LIKE ? OR a.studentCode LIKE ?)`;
    const p = `%${search}%`;
    args.push(p, p);
  }

  try {
    const res = await db.execute({
      sql: `SELECT q.id, q.alumniId, q.publicToken, q.status, q.scanCount, q.lastScannedAt,
                   q.revocationReason, q.createdAt,
                   a.studentCode, a.studentName, a.campusId, a.graduationYear, a.lastClassName
            FROM AlumniQrToken q
            JOIN AlumniProfile a ON q.alumniId = a.id
            ${where}
            ORDER BY q.createdAt DESC
            LIMIT 100`,
      args
    });

    const baseUrl = getPortalBaseUrl();
    const tokens = res.rows.map(r => ({
      id: String(r.id),
      alumniId: String(r.alumniId),
      studentCode: String(r.studentCode),
      studentName: String(r.studentName),
      campusId: String(r.campusId),
      graduationYear: Number(r.graduationYear),
      lastClassName: r.lastClassName ? String(r.lastClassName) : '',
      publicToken: String(r.publicToken),
      status: String(r.status),
      scanCount: Number(r.scanCount || 0),
      lastScannedAt: r.lastScannedAt ? String(r.lastScannedAt) : null,
      revocationReason: r.revocationReason ? String(r.revocationReason) : null,
      createdAt: String(r.createdAt),
      portalUrl: `${baseUrl}/alumni/portal?token=${r.publicToken}`
    }));

    return NextResponse.json({ success: true, count: tokens.length, data: tokens });
  } catch (error: any) {
    console.error('Error fetching QR tokens:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tải danh sách mã QR' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });
  }

  const user = session.user as any;
  const db = getAlumniDb();

  try {
    const body = await req.json();
    const { action, alumniId, reason } = body;

    if (action === 'REISSUE') {
      if (!alumniId) {
        return NextResponse.json({ error: 'Thiếu thông tin alumniId' }, { status: 400 });
      }
      const token = await reissueQrToken(
        alumniId,
        user.id || 'ADMIN',
        user.email || 'admin@skylineschool.edu.vn',
        reason || 'Cấp lại mã QR mới từ Admin'
      );
      return NextResponse.json({ success: true, message: 'Đã cấp lại mã QR mới thành công', data: token });
    }

    if (action === 'REVOKE') {
      if (!alumniId) {
        return NextResponse.json({ error: 'Thiếu thông tin alumniId' }, { status: 400 });
      }
      await db.execute({
        sql: `UPDATE AlumniQrToken
              SET status = 'REVOKED', revokedById = ?, revokedAt = CURRENT_TIMESTAMP, revocationReason = ?
              WHERE alumniId = ? AND status = 'ACTIVE'`,
        args: [user.id || 'ADMIN', reason || 'Thu hồi bởi quản trị viên', alumniId]
      });

      await logActivity(
        user.id || 'ADMIN',
        user.email || 'admin@skylineschool.edu.vn',
        'ALUMNI_QR_REVOKED',
        'AlumniQrToken',
        alumniId,
        { reason }
      );

      return NextResponse.json({ success: true, message: 'Đã thu hồi mã QR thành công' });
    }

    if (action === 'GET_OR_CREATE') {
      const token = await getOrCreateActiveQrToken(alumniId, user.id || 'ADMIN');
      return NextResponse.json({ success: true, data: token });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling QR action:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xử lý mã QR' }, { status: 500 });
  }
}
