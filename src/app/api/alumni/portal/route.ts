import { NextRequest, NextResponse } from 'next/server';
import { validateScannedToken } from '@/lib/alumni/qr-service';
import { createAlumniSubmission } from '@/lib/alumni/submission-service';
import { getAlumniDb } from '@/lib/alumni/alumni-db';

// Simple in-memory rate limiting map for public portal submissions
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (entry.count >= limit) {
    return false;
  }
  entry.count++;
  return true;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Mã token không được để trống' }, { status: 400 });
  }

  try {
    const result = await validateScannedToken(token);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    const a = result.alumni!;
    const db = getAlumniDb();

    // Fetch existing verified educations & careers for initial form pre-fill
    const eduRes = await db.execute({
      sql: `SELECT degreeLevel, institutionName, majorName, specialization, country, city, startYear, endYear, isCurrent, scholarshipInfo
            FROM AlumniEducation WHERE alumniId = ? ORDER BY startYear DESC`,
      args: [a.id]
    });

    const carRes = await db.execute({
      sql: `SELECT jobTitle, industry, organization, workCountry, workCity, startDate, endDate, isCurrent
            FROM AlumniCareer WHERE alumniId = ? ORDER BY isCurrent DESC`,
      args: [a.id]
    });

    // Mask sensitive contact info for privacy until verified
    const maskedEmail = a.personalEmail
      ? a.personalEmail.replace(/^(.)(.*)(.@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 5)) + c)
      : null;
    const maskedPhone = a.personalPhone
      ? a.personalPhone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')
      : null;

    return NextResponse.json({
      success: true,
      data: {
        alumniId: a.id,
        studentCode: a.studentCode,
        studentName: a.studentName,
        englishName: a.englishName,
        graduationGrade: a.graduationGrade,
        graduationYear: a.graduationYear,
        graduationBatch: a.graduationBatch,
        campusId: a.campusId,
        educationSystem: a.educationSystem,
        lastClassName: a.lastClassName,
        currentResidenceCountry: a.currentResidenceCountry,
        currentResidenceCity: a.currentResidenceCity,
        currentAcademicStatus: a.currentAcademicStatus,
        currentCareerStatus: a.currentCareerStatus,
        currentEmployer: a.currentEmployer,
        currentJobTitle: a.currentJobTitle,
        verificationStatus: a.verificationStatus,
        allowContact: a.allowContact,
        joinAlumniNetwork: a.joinAlumniNetwork,
        maskedEmail,
        maskedPhone,
        educations: eduRes.rows,
        careers: carRes.rows
      }
    });
  } catch (error: any) {
    console.error('Error validating alumni token:', error);
    return NextResponse.json({ error: error.message || 'Lỗi kiểm tra mã QR' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Bạn đã gửi yêu cầu quá nhiều lần. Vui lòng chờ 1 phút trước khi thử lại.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { token, payload, verificationKey } = body;

    if (!token || !payload) {
      return NextResponse.json({ error: 'Dữ liệu gửi lên không hợp lệ' }, { status: 400 });
    }

    const check = await validateScannedToken(token);
    if (!check.valid || !check.alumni) {
      return NextResponse.json({ error: check.error || 'Token không hợp lệ' }, { status: 403 });
    }

    const alumni = check.alumni;

    // Optional Identity Verification Challenge:
    // If student DOB exists, verify either year of birth or studentCode
    if (verificationKey) {
      const cleanKey = String(verificationKey).trim().toLowerCase();
      const codeMatch = cleanKey === alumni.studentCode.toLowerCase();
      let yearMatch = false;
      if (alumni.dateOfBirth) {
        const y = new Date(alumni.dateOfBirth).getFullYear().toString();
        yearMatch = cleanKey === y;
      }
      if (!codeMatch && !yearMatch) {
        return NextResponse.json(
          { error: 'Thông tin xác thực danh tính (Mã HS hoặc Năm sinh) không khớp.' },
          { status: 400 }
        );
      }
    }

    const userAgent = req.headers.get('user-agent') || 'MobileBrowser';
    const result = await createAlumniSubmission(alumni.id, payload, ip, userAgent);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error submitting alumni update:', error);
    return NextResponse.json({ error: error.message || 'Lỗi gửi cập nhật' }, { status: 500 });
  }
}
