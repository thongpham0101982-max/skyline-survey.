const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  console.log('Querying 76 completed CKDV students from Turso DB...');

  // 1. Get all completed candidates in InputAssessmentStudent
  const iasRes = await client.execute(`
    SELECT id, studentCode, enrollmentCode, fullName, className, grade, 
           admissionResult, directorNote, admissionCriteria, targetType, 
           enrollmentStatus, registeredCampus, admissionCampus, enrollmentClassId,
           mathScore, writtenEnglishScore, oralEnglishScore, literatureScore, psychologyScore
    FROM InputAssessmentStudent
    WHERE enrollmentStatus = 'COMPLETED'
      AND (
        admissionResult LIKE '%cam kết%' OR admissionResult LIKE '%cam ket%' OR
        admissionResult LIKE '%theo dõi%' OR admissionResult LIKE '%theo doi%' OR
        directorNote LIKE '%cam kết%' OR directorNote LIKE '%cam ket%' OR
        directorNote LIKE '%theo dõi%' OR directorNote LIKE '%theo doi%' OR
        directorNote LIKE '%Môn cam kết%' OR directorNote LIKE '%Mon cam ket%' OR
        admissionCriteria LIKE '%cam kết%' OR admissionCriteria LIKE '%cam ket%' OR
        admissionCriteria LIKE '%theo dõi%' OR admissionCriteria LIKE '%theo doi%' OR
        targetType LIKE '%cam kết%' OR targetType LIKE '%cam ket%' OR
        targetType LIKE '%theo dõi%' OR targetType LIKE '%theo doi%'
      )
    ORDER BY admissionCampus, grade, fullName
  `);

  console.log('Total completed CKDV candidates found:', iasRes.rows.length);

  // 2. For each student, get StudentAssessmentScore
  const detailedList = [];

  for (const st of iasRes.rows) {
    const scoresRes = await client.execute({
      sql: `
        SELECT sas.id, sas.subjectId, sas.scores, sas.comments,
               sub.name as subName, sub.code as subCode
        FROM StudentAssessmentScore sas
        LEFT JOIN AssessmentSubject sub ON sas.subjectId = sub.id
        WHERE sas.studentId = ?
      `,
      args: [st.id]
    });

    // 3. Find matching student in Student table & Class
    // Check by enrollmentCode, studentCode, or fullName
    let stDb = null;
    if (st.enrollmentCode) {
      const sRes = await client.execute({
        sql: `SELECT s.id, s.studentCode, s.studentName, c.className, c.grade, cmp.campusCode
              FROM Student s
              LEFT JOIN Class c ON s.classId = c.id
              LEFT JOIN Campus cmp ON c.campusId = cmp.id
              WHERE s.studentCode = ?`,
        args: [st.enrollmentCode]
      });
      if (sRes.rows.length > 0) stDb = sRes.rows[0];
    }
    if (!stDb && st.studentCode) {
      const sRes = await client.execute({
        sql: `SELECT s.id, s.studentCode, s.studentName, c.className, c.grade, cmp.campusCode
              FROM Student s
              LEFT JOIN Class c ON s.classId = c.id
              LEFT JOIN Campus cmp ON c.campusId = cmp.id
              WHERE s.studentCode = ?`,
        args: [st.studentCode]
      });
      if (sRes.rows.length > 0) stDb = sRes.rows[0];
    }
    if (!stDb) {
      const sRes = await client.execute({
        sql: `SELECT s.id, s.studentCode, s.studentName, c.className, c.grade, cmp.campusCode
              FROM Student s
              LEFT JOIN Class c ON s.classId = c.id
              LEFT JOIN Campus cmp ON c.campusId = cmp.id
              WHERE LOWER(TRIM(s.studentName)) = LOWER(TRIM(?))`,
        args: [st.fullName]
      });
      if (sRes.rows.length > 0) stDb = sRes.rows[0];
    }

    // 4. Get KSĐN scores from SubjectGradeEntry
    let ksdnScores = [];
    if (stDb) {
      const kRes = await client.execute({
        sql: `
          SELECT sge.compositeScore, sub.subjectName, sub.subjectCode, c.className
          FROM SubjectGradeEntry sge
          JOIN Subject sub ON sge.subjectId = sub.id
          LEFT JOIN Class c ON sge.classId = c.id
          WHERE sge.studentId = ? AND sge.evaluationPeriod = 'KSĐN'
        `,
        args: [stDb.id]
      });
      ksdnScores = kRes.rows;
    }

    detailedList.push({
      ias: st,
      sas: scoresRes.rows,
      studentDb: stDb,
      ksdn: ksdnScores
    });
  }

  fs.writeFileSync(path.join(__dirname, 'raw_76_turso_audit.json'), JSON.stringify(detailedList, null, 2), 'utf8');
  console.log('Saved raw_76_turso_audit.json successfully!');
}

main().catch(console.error);
