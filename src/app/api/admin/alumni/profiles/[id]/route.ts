import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAlumniDb } from '@/lib/alumni/alumni-db';
import { getOrCreateActiveQrToken } from '@/lib/alumni/qr-service';
import { logActivity } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });
  }

  const { id } = await params;
  const db = getAlumniDb();

  try {
    const profileRes = await db.execute({
      sql: `SELECT * FROM AlumniProfile WHERE id = ? OR studentCode = ?`,
      args: [id, id]
    });

    if (profileRes.rows.length === 0) {
      return NextResponse.json({ error: 'Hồ sơ không tồn tại' }, { status: 404 });
    }

    const row = profileRes.rows[0];
    const alumniId = String(row.id);

    // Fetch Educations
    const eduRes = await db.execute({
      sql: `SELECT * FROM AlumniEducation WHERE alumniId = ? ORDER BY startYear DESC`,
      args: [alumniId]
    });

    // Fetch Careers
    const carRes = await db.execute({
      sql: `SELECT * FROM AlumniCareer WHERE alumniId = ? ORDER BY isCurrent DESC, startDate DESC`,
      args: [alumniId]
    });

    // Fetch Active QR Token info
    const qrInfo = await getOrCreateActiveQrToken(alumniId);

    // Fetch Submissions history
    const subRes = await db.execute({
      sql: `SELECT id, submissionCode, status, reviewerId, reviewedAt, reviewNotes, createdAt
            FROM AlumniUpdateSubmission
            WHERE alumniId = ?
            ORDER BY createdAt DESC LIMIT 10`,
      args: [alumniId]
    });

    return NextResponse.json({
      success: true,
      data: {
        ...row,
        educations: eduRes.rows,
        careers: carRes.rows,
        qrToken: qrInfo,
        submissions: subRes.rows
      }
    });
  } catch (error: any) {
    console.error('Error fetching alumni detail:', error);
    return NextResponse.json({ error: error.message || 'Lỗi truy xuất hồ sơ' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });
  }

  const { id } = await params;
  const db = getAlumniDb();

  try {
    const body = await req.json();
    const {
      personalEmail,
      personalPhone,
      currentResidenceCountry,
      currentResidenceCity,
      currentAcademicStatus,
      currentCareerStatus,
      currentEmployer,
      currentJobTitle,
      verificationStatus,
      allowContact,
      joinAlumniNetwork,
      allowMediaSharing
    } = body;

    await db.execute({
      sql: `UPDATE AlumniProfile
            SET personalEmail = ?,
                personalPhone = ?,
                currentResidenceCountry = ?,
                currentResidenceCity = ?,
                currentAcademicStatus = ?,
                currentCareerStatus = ?,
                currentEmployer = ?,
                currentJobTitle = ?,
                verificationStatus = COALESCE(?, verificationStatus),
                allowContact = ?,
                joinAlumniNetwork = ?,
                allowMediaSharing = ?,
                updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        personalEmail || null,
        personalPhone || null,
        currentResidenceCountry || 'Việt Nam',
        currentResidenceCity || null,
        currentAcademicStatus || 'STUDYING',
        currentCareerStatus || 'WORKING',
        currentEmployer || null,
        currentJobTitle || null,
        verificationStatus || null,
        allowContact !== false ? 1 : 0,
        joinAlumniNetwork !== false ? 1 : 0,
        allowMediaSharing ? 1 : 0,
        id
      ]
    });

    const user = session.user as any;
    await logActivity(
      user.id || 'ADMIN',
      user.email || 'admin@skylineschool.edu.vn',
      'ALUMNI_PROFILE_UPDATED',
      'AlumniProfile',
      id,
      null,
      body
    );

    return NextResponse.json({ success: true, message: 'Đã cập nhật hồ sơ thành công' });
  } catch (error: any) {
    console.error('Error updating alumni profile:', error);
    return NextResponse.json({ error: error.message || 'Lỗi cập nhật hồ sơ' }, { status: 500 });
  }
}
