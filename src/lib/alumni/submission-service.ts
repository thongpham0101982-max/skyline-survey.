import { randomUUID } from 'crypto';
import { getAlumniDb } from './alumni-db';
import { logActivity } from '@/lib/audit';

export interface EducationItem {
  degreeLevel: string;
  institutionName: string;
  majorName: string;
  specialization?: string;
  country: string;
  city?: string;
  startYear: number;
  endYear?: number | null;
  isCurrent: boolean;
  scholarshipInfo?: string;
}

export interface CareerItem {
  jobTitle: string;
  industry: string;
  organization?: string;
  workCountry: string;
  workCity?: string;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent: boolean;
}

export interface AlumniSubmissionPayload {
  personalEmail?: string;
  personalPhone?: string;
  currentResidenceCountry?: string;
  currentResidenceCity?: string;
  currentAcademicStatus?: string;
  currentCareerStatus?: string;
  currentEmployer?: string;
  currentJobTitle?: string;
  educations?: EducationItem[];
  careers?: CareerItem[];
  allowContact?: boolean;
  joinAlumniNetwork?: boolean;
  allowMediaSharing?: boolean;
  dataConsentAccepted: boolean;
}

export async function createAlumniSubmission(
  alumniId: string,
  payload: AlumniSubmissionPayload,
  ipAddress?: string,
  userAgent?: string
) {
  const db = getAlumniDb();
  const submissionId = 'sub_' + randomUUID().replace(/-/g, '');
  const submissionCode = 'SUB-' + Math.floor(100000 + Math.random() * 900000);

  const payloadJson = JSON.stringify(payload);

  await db.execute({
    sql: `INSERT INTO AlumniUpdateSubmission (
            id, alumniId, submissionCode, payload, status,
            ipAddress, userAgent, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, 'PENDING', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    args: [submissionId, alumniId, submissionCode, payloadJson, ipAddress || '127.0.0.1', userAgent || 'Portal']
  });

  await db.execute({
    sql: `UPDATE AlumniProfile
          SET verificationStatus = 'PENDING_REVIEW',
              lastSelfUpdatedAt = CURRENT_TIMESTAMP,
              personalEmail = COALESCE(?, personalEmail),
              personalPhone = COALESCE(?, personalPhone)
          WHERE id = ?`,
    args: [payload.personalEmail || null, payload.personalPhone || null, alumniId]
  });

  if (payload.dataConsentAccepted) {
    const consentId = 'cst_' + randomUUID().replace(/-/g, '');
    await db.execute({
      sql: `INSERT INTO AlumniConsentLog (id, alumniId, consentType, granted, ipAddress, timestamp)
            VALUES (?, ?, 'DATA_PROCESSING', 1, ?, CURRENT_TIMESTAMP)`,
      args: [consentId, alumniId, ipAddress || '127.0.0.1']
    });
  }

  return {
    success: true,
    submissionId,
    submissionCode,
    message: 'Thông tin của bạn đã được ghi nhận và gửi đến Ban quản trị Sky-Line để xác minh.'
  };
}

export async function reviewSubmission(
  submissionId: string,
  action: 'APPROVE' | 'REJECT' | 'NEEDS_INFO',
  reviewNotes: string,
  reviewerId: string,
  reviewerEmail: string
) {
  const db = getAlumniDb();

  const subRes = await db.execute({
    sql: `SELECT s.id, s.alumniId, s.submissionCode, s.payload, s.status,
                 a.studentCode, a.studentName
          FROM AlumniUpdateSubmission s
          JOIN AlumniProfile a ON s.alumniId = a.id
          WHERE s.id = ?`,
    args: [submissionId]
  });

  if (subRes.rows.length === 0) {
    throw new Error('Đơn cập nhật không tồn tại.');
  }

  const sub = subRes.rows[0];
  const alumniId = String(sub.alumniId);
  const payload: AlumniSubmissionPayload = JSON.parse(String(sub.payload));

  if (action === 'APPROVE') {
    await db.execute({
      sql: `UPDATE AlumniUpdateSubmission
            SET status = 'APPROVED', reviewerId = ?, reviewedAt = CURRENT_TIMESTAMP, reviewNotes = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [reviewerId, reviewNotes || 'Đã duyệt cập nhật', submissionId]
    });

    await db.execute({
      sql: `UPDATE AlumniProfile
            SET currentResidenceCountry = ?,
                currentResidenceCity = ?,
                currentAcademicStatus = ?,
                currentCareerStatus = ?,
                currentEmployer = ?,
                currentJobTitle = ?,
                allowContact = ?,
                joinAlumniNetwork = ?,
                allowMediaSharing = ?,
                dataConsentAccepted = ?,
                dataConsentDate = CURRENT_TIMESTAMP,
                verificationStatus = 'VERIFIED',
                lastVerifiedAt = CURRENT_TIMESTAMP,
                verifiedById = ?,
                updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        payload.currentResidenceCountry || 'Việt Nam',
        payload.currentResidenceCity || null,
        payload.currentAcademicStatus || 'STUDYING',
        payload.currentCareerStatus || 'WORKING',
        payload.currentEmployer || null,
        payload.currentJobTitle || null,
        payload.allowContact !== false ? 1 : 0,
        payload.joinAlumniNetwork !== false ? 1 : 0,
        payload.allowMediaSharing ? 1 : 0,
        payload.dataConsentAccepted ? 1 : 0,
        reviewerId,
        alumniId
      ]
    });

    if (payload.educations && Array.isArray(payload.educations)) {
      await db.execute({
        sql: `DELETE FROM AlumniEducation WHERE alumniId = ?`,
        args: [alumniId]
      });

      for (const edu of payload.educations) {
        const eduId = 'edu_' + randomUUID().replace(/-/g, '');
        await db.execute({
          sql: `INSERT INTO AlumniEducation (
                  id, alumniId, degreeLevel, institutionName, majorName, specialization,
                  country, city, startYear, endYear, isCurrent, scholarshipInfo, isVerified,
                  createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          args: [
            eduId,
            alumniId,
            edu.degreeLevel,
            edu.institutionName,
            edu.majorName,
            edu.specialization || null,
            edu.country || 'Việt Nam',
            edu.city || null,
            edu.startYear,
            edu.endYear || null,
            edu.isCurrent ? 1 : 0,
            edu.scholarshipInfo || null
          ]
        });
      }
    }

    if (payload.careers && Array.isArray(payload.careers)) {
      await db.execute({
        sql: `DELETE FROM AlumniCareer WHERE alumniId = ?`,
        args: [alumniId]
      });

      for (const car of payload.careers) {
        const carId = 'car_' + randomUUID().replace(/-/g, '');
        await db.execute({
          sql: `INSERT INTO AlumniCareer (
                  id, alumniId, jobTitle, industry, organization,
                  workCountry, workCity, startDate, endDate, isCurrent, isVerified,
                  createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          args: [
            carId,
            alumniId,
            car.jobTitle,
            car.industry,
            car.organization || null,
            car.workCountry || 'Việt Nam',
            car.workCity || null,
            car.startDate || null,
            car.endDate || null,
            car.isCurrent ? 1 : 0
          ]
        });
      }
    }

    await logActivity(
      reviewerId,
      reviewerEmail,
      'ALUMNI_SUBMISSION_APPROVED',
      'AlumniUpdateSubmission',
      submissionId,
      { previousStatus: sub.status },
      { alumniId, studentCode: sub.studentCode, reviewNotes }
    );
  } else if (action === 'REJECT') {
    await db.execute({
      sql: `UPDATE AlumniUpdateSubmission
            SET status = 'REJECTED', reviewerId = ?, reviewedAt = CURRENT_TIMESTAMP, reviewNotes = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [reviewerId, reviewNotes || 'Từ chối cập nhật', submissionId]
    });

    await db.execute({
      sql: `UPDATE AlumniProfile
            SET verificationStatus = 'REJECTED', updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [alumniId]
    });

    await logActivity(
      reviewerId,
      reviewerEmail,
      'ALUMNI_SUBMISSION_REJECTED',
      'AlumniUpdateSubmission',
      submissionId,
      { previousStatus: sub.status },
      { alumniId, studentCode: sub.studentCode, reviewNotes }
    );
  } else if (action === 'NEEDS_INFO') {
    await db.execute({
      sql: `UPDATE AlumniUpdateSubmission
            SET status = 'NEEDS_INFO', reviewerId = ?, reviewedAt = CURRENT_TIMESTAMP, reviewNotes = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [reviewerId, reviewNotes, submissionId]
    });

    await db.execute({
      sql: `UPDATE AlumniProfile
            SET verificationStatus = 'UNVERIFIED', updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [alumniId]
    });
  }

  return { success: true, action };
}
