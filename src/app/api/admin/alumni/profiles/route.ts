import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAlumniDb } from '@/lib/alumni/alumni-db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const campusId = searchParams.get('campusId') || '';
  const graduationYear = searchParams.get('graduationYear') || '';
  const graduationGrade = searchParams.get('graduationGrade') || '';
  const verificationStatus = searchParams.get('verificationStatus') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '25', 10);
  const offset = (page - 1) * limit;

  const db = getAlumniDb();

  let where = 'WHERE 1=1';
  const args: any[] = [];

  if (search) {
    where += ` AND (a.studentName LIKE ? OR a.studentCode LIKE ? OR a.personalEmail LIKE ? OR a.currentEmployer LIKE ?)`;
    const searchPattern = `%${search}%`;
    args.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }
  if (campusId && campusId !== 'all') {
    where += ` AND a.campusId = ?`;
    args.push(campusId);
  }
  if (graduationYear && graduationYear !== 'all') {
    where += ` AND a.graduationYear = ?`;
    args.push(Number(graduationYear));
  }
  if (graduationGrade && graduationGrade !== 'all') {
    where += ` AND a.graduationGrade = ?`;
    args.push(graduationGrade);
  }
  if (verificationStatus && verificationStatus !== 'all') {
    where += ` AND a.verificationStatus = ?`;
    args.push(verificationStatus);
  }

  try {
    // Total count
    const countRes = await db.execute({
      sql: `SELECT count(*) as total FROM AlumniProfile a ${where}`,
      args
    });
    const total = Number(countRes.rows[0]?.total || 0);

    // Profile list with active QR token
    const listRes = await db.execute({
      sql: `SELECT a.id, a.studentCode, a.studentName, a.englishName, a.gender, a.dateOfBirth,
                   a.personalEmail, a.personalPhone, a.campusId, a.graduationGrade, a.graduationYear,
                   a.graduationBatch, a.educationSystem, a.lastClassName, a.currentResidenceCountry,
                   a.currentResidenceCity, a.currentAcademicStatus, a.currentCareerStatus,
                   a.currentEmployer, a.currentJobTitle, a.verificationStatus, a.lastVerifiedAt,
                   a.lastSelfUpdatedAt, a.allowContact, a.joinAlumniNetwork, a.createdAt,
                   q.publicToken as qrPublicToken, q.status as qrStatus, q.scanCount
            FROM AlumniProfile a
            LEFT JOIN AlumniQrToken q ON a.id = q.alumniId AND q.status = 'ACTIVE'
            ${where}
            ORDER BY a.graduationYear DESC, a.studentName ASC
            LIMIT ? OFFSET ?`,
      args: [...args, limit, offset]
    });

    const profiles = listRes.rows.map(r => ({
      id: String(r.id),
      studentCode: String(r.studentCode),
      studentName: String(r.studentName),
      englishName: r.englishName ? String(r.englishName) : null,
      gender: r.gender ? String(r.gender) : null,
      dateOfBirth: r.dateOfBirth ? String(r.dateOfBirth) : null,
      personalEmail: r.personalEmail ? String(r.personalEmail) : null,
      personalPhone: r.personalPhone ? String(r.personalPhone) : null,
      campusId: String(r.campusId),
      graduationGrade: String(r.graduationGrade),
      graduationYear: Number(r.graduationYear),
      graduationBatch: r.graduationBatch ? String(r.graduationBatch) : null,
      educationSystem: r.educationSystem ? String(r.educationSystem) : null,
      lastClassName: r.lastClassName ? String(r.lastClassName) : null,
      currentResidenceCountry: r.currentResidenceCountry ? String(r.currentResidenceCountry) : 'Việt Nam',
      currentResidenceCity: r.currentResidenceCity ? String(r.currentResidenceCity) : '',
      currentAcademicStatus: r.currentAcademicStatus ? String(r.currentAcademicStatus) : 'STUDYING',
      currentCareerStatus: r.currentCareerStatus ? String(r.currentCareerStatus) : 'WORKING',
      currentEmployer: r.currentEmployer ? String(r.currentEmployer) : '',
      currentJobTitle: r.currentJobTitle ? String(r.currentJobTitle) : '',
      verificationStatus: String(r.verificationStatus),
      lastVerifiedAt: r.lastVerifiedAt ? String(r.lastVerifiedAt) : null,
      lastSelfUpdatedAt: r.lastSelfUpdatedAt ? String(r.lastSelfUpdatedAt) : null,
      allowContact: Boolean(r.allowContact),
      joinAlumniNetwork: Boolean(r.joinAlumniNetwork),
      createdAt: String(r.createdAt),
      qrToken: r.qrPublicToken ? {
        publicToken: String(r.qrPublicToken),
        status: String(r.qrStatus),
        scanCount: Number(r.scanCount || 0)
      } : null
    }));

    return NextResponse.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: profiles
    });
  } catch (error: any) {
    console.error('Error fetching alumni profiles:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tải danh sách hồ sơ' }, { status: 500 });
  }
}
