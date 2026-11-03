import { randomUUID } from 'crypto';
import { getAlumniDb } from './alumni-db';
import { getOrCreateActiveQrToken } from './qr-service';
import { logActivity } from '@/lib/audit';

export interface InheritFilterOptions {
  academicYearId?: string;
  campusId?: string;
  grade?: string; // '12', '9', '5'
  classId?: string;
  studentIds?: string[];
}

export interface InheritResult {
  totalFound: number;
  totalCreated: number;
  totalSkipped: number;
  skippedCodes: string[];
  createdProfiles: Array<{
    id: string;
    studentCode: string;
    studentName: string;
    className: string;
    campusId: string;
    graduationYear: number;
  }>;
}

export async function previewEligibleGraduates(options: InheritFilterOptions = {}) {
  const db = getAlumniDb();
  const { academicYearId, campusId, grade = '12', classId } = options;

  let query = `
    SELECT s.id as studentId, s.studentCode, s.studentName, s.englishName, s.gender, s.dateOfBirth,
           s.status as studentStatus, s.campusId, s.academicYearId,
           c.id as classId, c.className, c.grade, c.educationSystem,
           ay.name as academicYearName,
           ap.id as existingAlumniId, ap.verificationStatus as alumniStatus
    FROM Student s
    JOIN Class c ON s.classId = c.id
    JOIN AcademicYear ay ON s.academicYearId = ay.id
    LEFT JOIN AlumniProfile ap ON s.studentCode = ap.studentCode
    WHERE s.status = 'ACTIVE'
  `;
  const args: any[] = [];

  if (grade) {
    query += ` AND c.grade = ?`;
    args.push(grade);
  }
  if (academicYearId && academicYearId !== 'all') {
    query += ` AND s.academicYearId = ?`;
    args.push(academicYearId);
  }
  if (campusId && campusId !== 'all') {
    query += ` AND s.campusId = ?`;
    args.push(campusId);
  }
  if (classId && classId !== 'all') {
    query += ` AND s.classId = ?`;
    args.push(classId);
  }

  query += ` ORDER BY c.className ASC, s.studentName ASC`;

  const res = await db.execute({ sql: query, args });

  return res.rows.map(r => ({
    studentId: String(r.studentId),
    studentCode: String(r.studentCode),
    studentName: String(r.studentName),
    englishName: r.englishName ? String(r.englishName) : null,
    gender: r.gender ? String(r.gender) : null,
    dateOfBirth: r.dateOfBirth ? String(r.dateOfBirth) : null,
    campusId: String(r.campusId),
    className: String(r.className),
    grade: String(r.grade),
    educationSystem: r.educationSystem ? String(r.educationSystem) : 'Tiêu chuẩn',
    academicYearName: String(r.academicYearName),
    isAlreadyAlumni: Boolean(r.existingAlumniId),
    alumniStatus: r.alumniStatus ? String(r.alumniStatus) : null
  }));
}

export async function inheritStudentsToAlumni(
  options: InheritFilterOptions,
  userId: string,
  userEmail: string
): Promise<InheritResult> {
  const db = getAlumniDb();
  const eligibleList = await previewEligibleGraduates(options);

  const selectedStudents = options.studentIds && options.studentIds.length > 0
    ? eligibleList.filter(s => options.studentIds!.includes(s.studentId))
    : eligibleList;

  let totalCreated = 0;
  let totalSkipped = 0;
  const skippedCodes: string[] = [];
  const createdProfiles: any[] = [];

  for (const st of selectedStudents) {
    if (st.isAlreadyAlumni) {
      totalSkipped++;
      skippedCodes.push(st.studentCode);
      continue;
    }

    let gradYear = new Date().getFullYear();
    const parts = st.academicYearName.split('-');
    if (parts.length === 2 && !isNaN(parseInt(parts[1], 10))) {
      gradYear = parseInt(parts[1], 10);
    }

    const alumniId = 'alm_' + randomUUID().replace(/-/g, '');
    const graduationBatch = `Khóa tốt nghiệp ${gradYear}`;

    try {
      await db.execute({
        sql: `INSERT INTO AlumniProfile (
                id, studentCode, originalStudentId, studentName, englishName,
                gender, dateOfBirth, campusId, graduationGrade, graduationYear,
                graduationBatch, educationSystem, lastClassName,
                verificationStatus, currentAcademicStatus, currentCareerStatus,
                allowContact, joinAlumniNetwork, createdAt, updatedAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'UNVERIFIED', 'STUDYING', 'WORKING', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        args: [
          alumniId,
          st.studentCode,
          st.studentId,
          st.studentName,
          st.englishName,
          st.gender,
          st.dateOfBirth,
          st.campusId,
          st.grade,
          gradYear,
          graduationBatch,
          st.educationSystem,
          st.className
        ]
      });

      await getOrCreateActiveQrToken(alumniId, userId);

      totalCreated++;
      createdProfiles.push({
        id: alumniId,
        studentCode: st.studentCode,
        studentName: st.studentName,
        className: st.className,
        campusId: st.campusId,
        graduationYear: gradYear
      });
    } catch (insertErr: any) {
      if (insertErr.message?.includes('UNIQUE constraint failed')) {
        totalSkipped++;
        skippedCodes.push(st.studentCode);
      } else {
        console.error('Error inserting AlumniProfile for student:', st.studentCode, insertErr);
        throw insertErr;
      }
    }
  }

  await logActivity(
    userId,
    userEmail,
    'ALUMNI_INHERIT_BATCH',
    'AlumniProfile',
    'BATCH',
    null,
    {
      totalRequested: selectedStudents.length,
      totalCreated,
      totalSkipped,
      filter: options
    }
  );

  return {
    totalFound: selectedStudents.length,
    totalCreated,
    totalSkipped,
    skippedCodes,
    createdProfiles
  };
}
