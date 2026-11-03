import { getAlumniDb } from './alumni-db';

export interface AnalyticsFilter {
  campusId?: string;
  graduationYear?: number | string;
  graduationGrade?: string;
  verificationStatus?: string;
}

export async function getAlumniAnalytics(filter: AnalyticsFilter = {}) {
  const db = getAlumniDb();
  const { campusId, graduationYear, graduationGrade, verificationStatus } = filter;

  let whereClause = 'WHERE 1=1';
  const args: any[] = [];

  if (campusId && campusId !== 'all') {
    whereClause += ' AND campusId = ?';
    args.push(campusId);
  }
  if (graduationYear && graduationYear !== 'all') {
    whereClause += ' AND graduationYear = ?';
    args.push(Number(graduationYear));
  }
  if (graduationGrade && graduationGrade !== 'all') {
    whereClause += ' AND graduationGrade = ?';
    args.push(graduationGrade);
  }
  if (verificationStatus && verificationStatus !== 'all') {
    whereClause += ' AND verificationStatus = ?';
    args.push(verificationStatus);
  }

  // 1. Overall counts
  const totalRes = await db.execute({
    sql: `SELECT count(*) as total,
                 SUM(CASE WHEN verificationStatus = 'VERIFIED' THEN 1 ELSE 0 END) as verifiedCount,
                 SUM(CASE WHEN verificationStatus = 'PENDING_REVIEW' THEN 1 ELSE 0 END) as pendingCount,
                 SUM(CASE WHEN verificationStatus = 'UNVERIFIED' THEN 1 ELSE 0 END) as unverifiedCount,
                 SUM(CASE WHEN lastSelfUpdatedAt IS NOT NULL THEN 1 ELSE 0 END) as updatedCount
          FROM AlumniProfile ${whereClause}`,
    args
  });
  const summary = totalRes.rows[0];
  const total = Number(summary.total || 0);
  const updatedCount = Number(summary.updatedCount || 0);
  const updateRate = total > 0 ? Math.round((updatedCount / total) * 100) : 0;

  // 2. Status distribution (Studying / Working / Both)
  const statusRes = await db.execute({
    sql: `SELECT currentAcademicStatus, count(*) as count
          FROM AlumniProfile ${whereClause}
          GROUP BY currentAcademicStatus`,
    args
  });

  // 3. Country distribution
  const countryRes = await db.execute({
    sql: `SELECT currentResidenceCountry, count(*) as count
          FROM AlumniProfile ${whereClause}
          GROUP BY currentResidenceCountry
          ORDER BY count DESC LIMIT 8`,
    args
  });

  // 4. By Campus
  const campusRes = await db.execute({
    sql: `SELECT campusId, count(*) as total,
                 SUM(CASE WHEN lastSelfUpdatedAt IS NOT NULL THEN 1 ELSE 0 END) as updated
          FROM AlumniProfile ${whereClause}
          GROUP BY campusId`,
    args
  });

  // 5. By Graduation Year
  const yearRes = await db.execute({
    sql: `SELECT graduationYear, count(*) as total,
                 SUM(CASE WHEN verificationStatus = 'VERIFIED' THEN 1 ELSE 0 END) as verified
          FROM AlumniProfile ${whereClause}
          GROUP BY graduationYear
          ORDER BY graduationYear DESC LIMIT 6`,
    args
  });

  // 6. University distribution (from AlumniEducation)
  const uniRes = await db.execute({
    sql: `SELECT e.institutionName, count(DISTINCT e.alumniId) as count
          FROM AlumniEducation e
          JOIN AlumniProfile a ON e.alumniId = a.id
          ${whereClause.replace(/campusId/g, 'a.campusId').replace(/graduationYear/g, 'a.graduationYear').replace(/verificationStatus/g, 'a.verificationStatus')}
          GROUP BY e.institutionName
          ORDER BY count DESC LIMIT 10`,
    args
  });

  // 7. Industry / Major distribution (from AlumniCareer)
  const industryRes = await db.execute({
    sql: `SELECT c.industry, count(DISTINCT c.alumniId) as count
          FROM AlumniCareer c
          JOIN AlumniProfile a ON c.alumniId = a.id
          ${whereClause.replace(/campusId/g, 'a.campusId').replace(/graduationYear/g, 'a.graduationYear').replace(/verificationStatus/g, 'a.verificationStatus')}
          GROUP BY c.industry
          ORDER BY count DESC LIMIT 8`,
    args
  });

  return {
    total,
    verifiedCount: Number(summary.verifiedCount || 0),
    pendingCount: Number(summary.pendingCount || 0),
    unverifiedCount: Number(summary.unverifiedCount || 0),
    updatedCount,
    updateRate,
    byAcademicStatus: statusRes.rows.map(r => ({ status: String(r.currentAcademicStatus || 'OTHER'), count: Number(r.count) })),
    byCountry: countryRes.rows.map(r => ({ country: String(r.currentResidenceCountry || 'Việt Nam'), count: Number(r.count) })),
    byCampus: campusRes.rows.map(r => ({ campusId: String(r.campusId), total: Number(r.total), updated: Number(r.updated) })),
    byYear: yearRes.rows.map(r => ({ year: Number(r.graduationYear), total: Number(r.total), verified: Number(r.verified) })),
    topUniversities: uniRes.rows.map(r => ({ institutionName: String(r.institutionName), count: Number(r.count) })),
    topIndustries: industryRes.rows.map(r => ({ industry: String(r.industry), count: Number(r.count) }))
  };
}
