import * as QRCode from 'qrcode';
import { randomUUID } from 'crypto';
import { getAlumniDb } from './alumni-db';
import { logActivity } from '@/lib/audit';

export interface QrTokenInfo {
  id: string;
  alumniId: string;
  publicToken: string;
  status: string;
  scanCount: number;
  lastScannedAt?: string | null;
  createdAt: string;
  qrDataUrl?: string;
  portalUrl: string;
}

export function getPortalBaseUrl(): string {
  const custom = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'https://ssm.skylineschool.edu.vn';
  return custom.replace(/\/$/, '');
}

export function generateOpaqueToken(): string {
  return randomUUID();
}

export async function renderQrCodeDataUrl(portalUrl: string): Promise<string> {
  return QRCode.toDataURL(portalUrl, {
    width: 320,
    margin: 2,
    color: {
      dark: '#005856',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H'
  });
}

export async function renderQrCodeSvg(portalUrl: string): Promise<string> {
  return QRCode.toString(portalUrl, {
    type: 'svg',
    margin: 2,
    color: {
      dark: '#005856',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'H'
  });
}

export async function getOrCreateActiveQrToken(alumniId: string, userId = 'SYSTEM'): Promise<QrTokenInfo> {
  const db = getAlumniDb();

  const existing = await db.execute({
    sql: `SELECT id, alumniId, publicToken, status, scanCount, lastScannedAt, createdAt
          FROM AlumniQrToken
          WHERE alumniId = ? AND status = 'ACTIVE'
          ORDER BY createdAt DESC LIMIT 1`,
    args: [alumniId]
  });

  let tokenId = '';
  let publicToken = '';
  let status = 'ACTIVE';
  let scanCount = 0;
  let lastScannedAt: string | null = null;
  let createdAt = new Date().toISOString();

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    tokenId = String(row.id);
    publicToken = String(row.publicToken);
    status = String(row.status);
    scanCount = Number(row.scanCount || 0);
    lastScannedAt = row.lastScannedAt ? String(row.lastScannedAt) : null;
    createdAt = String(row.createdAt);
  } else {
    tokenId = 'qrt_' + randomUUID().replace(/-/g, '');
    publicToken = generateOpaqueToken();

    await db.execute({
      sql: `INSERT INTO AlumniQrToken (id, alumniId, publicToken, status, scanCount, createdAt)
            VALUES (?, ?, ?, 'ACTIVE', 0, CURRENT_TIMESTAMP)`,
      args: [tokenId, alumniId, publicToken]
    });

    await logActivity(
      userId,
      'alumni-admin',
      'ALUMNI_QR_GENERATED',
      'AlumniQrToken',
      tokenId,
      null,
      { alumniId, publicToken }
    );
  }

  const portalUrl = `${getPortalBaseUrl()}/alumni/portal?token=${publicToken}`;
  const qrDataUrl = await renderQrCodeDataUrl(portalUrl);

  return {
    id: tokenId,
    alumniId,
    publicToken,
    status,
    scanCount,
    lastScannedAt,
    createdAt,
    qrDataUrl,
    portalUrl
  };
}

export async function reissueQrToken(
  alumniId: string,
  userId: string,
  userEmail: string,
  reason = 'Yêu cầu cấp lại mã QR mới'
): Promise<QrTokenInfo> {
  const db = getAlumniDb();

  await db.execute({
    sql: `UPDATE AlumniQrToken
          SET status = 'REVOKED', revokedById = ?, revokedAt = CURRENT_TIMESTAMP, revocationReason = ?
          WHERE alumniId = ? AND status = 'ACTIVE'`,
    args: [userId, reason, alumniId]
  });

  const id = 'qrt_' + randomUUID().replace(/-/g, '');
  const publicToken = generateOpaqueToken();

  await db.execute({
    sql: `INSERT INTO AlumniQrToken (id, alumniId, publicToken, status, scanCount, generatedById, createdAt)
          VALUES (?, ?, ?, 'ACTIVE', 0, ?, CURRENT_TIMESTAMP)`,
    args: [id, alumniId, publicToken, userId]
  });

  await logActivity(
    userId,
    userEmail,
    'ALUMNI_QR_REISSUED',
    'AlumniQrToken',
    id,
    { reason },
    { alumniId, publicToken }
  );

  const portalUrl = `${getPortalBaseUrl()}/alumni/portal?token=${publicToken}`;
  const qrDataUrl = await renderQrCodeDataUrl(portalUrl);

  return {
    id,
    alumniId,
    publicToken,
    status: 'ACTIVE',
    scanCount: 0,
    createdAt: new Date().toISOString(),
    qrDataUrl,
    portalUrl
  };
}

export async function validateScannedToken(publicToken: string) {
  const db = getAlumniDb();

  const tokenRes = await db.execute({
    sql: `SELECT q.id, q.alumniId, q.publicToken, q.status, q.expiresAt,
                 a.studentCode, a.studentName, a.englishName, a.gender, a.dateOfBirth,
                 a.graduationGrade, a.graduationYear, a.graduationBatch, a.campusId,
                 a.educationSystem, a.lastClassName, a.currentResidenceCountry, a.currentResidenceCity,
                 a.currentAcademicStatus, a.currentCareerStatus, a.currentEmployer, a.currentJobTitle,
                 a.verificationStatus, a.allowContact, a.joinAlumniNetwork, a.personalEmail, a.personalPhone
          FROM AlumniQrToken q
          JOIN AlumniProfile a ON q.alumniId = a.id
          WHERE q.publicToken = ?`,
    args: [publicToken]
  });

  if (tokenRes.rows.length === 0) {
    return { valid: false, error: 'Mã QR không tồn tại trên hệ thống.' };
  }

  const row = tokenRes.rows[0];

  if (row.status !== 'ACTIVE') {
    return {
      valid: false,
      error: 'Mã QR này đã bị thu hồi hoặc đã hết hiệu lực sử dụng. Vui lòng liên hệ nhà trường để được cấp lại.'
    };
  }

  if (row.expiresAt && new Date(String(row.expiresAt)).getTime() < Date.now()) {
    return { valid: false, error: 'Mã QR này đã hết hạn sử dụng.' };
  }

  db.execute({
    sql: `UPDATE AlumniQrToken
          SET scanCount = scanCount + 1, lastScannedAt = CURRENT_TIMESTAMP
          WHERE id = ?`,
    args: [row.id]
  }).catch(() => {});

  return {
    valid: true,
    alumni: {
      id: String(row.alumniId),
      studentCode: String(row.studentCode),
      studentName: String(row.studentName),
      englishName: row.englishName ? String(row.englishName) : null,
      gender: row.gender ? String(row.gender) : null,
      dateOfBirth: row.dateOfBirth ? String(row.dateOfBirth) : null,
      graduationGrade: String(row.graduationGrade),
      graduationYear: Number(row.graduationYear),
      graduationBatch: row.graduationBatch ? String(row.graduationBatch) : null,
      campusId: String(row.campusId),
      educationSystem: row.educationSystem ? String(row.educationSystem) : null,
      lastClassName: row.lastClassName ? String(row.lastClassName) : null,
      currentResidenceCountry: row.currentResidenceCountry ? String(row.currentResidenceCountry) : 'Việt Nam',
      currentResidenceCity: row.currentResidenceCity ? String(row.currentResidenceCity) : '',
      currentAcademicStatus: row.currentAcademicStatus ? String(row.currentAcademicStatus) : 'STUDYING',
      currentCareerStatus: row.currentCareerStatus ? String(row.currentCareerStatus) : 'WORKING',
      currentEmployer: row.currentEmployer ? String(row.currentEmployer) : '',
      currentJobTitle: row.currentJobTitle ? String(row.currentJobTitle) : '',
      verificationStatus: String(row.verificationStatus),
      allowContact: Boolean(row.allowContact),
      joinAlumniNetwork: Boolean(row.joinAlumniNetwork),
      personalEmail: row.personalEmail ? String(row.personalEmail) : null,
      personalPhone: row.personalPhone ? String(row.personalPhone) : null
    }
  };
}
