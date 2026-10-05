const { createClient } = require('@libsql/client');
require('dotenv').config();
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function check() {
  const studentsToCheck = [
    { name: 'Lê Đình Sĩ Phú', grade: '6', campus: 'CS1' },
    { name: 'Phạm Gia Bảo', grade: '9', campus: 'CS1' },
    { name: 'Nguyễn Minh Anh', grade: '6', campus: 'CS5' },
    { name: 'Phạm Kiều Anh', grade: '6', campus: 'CS4' },
    { name: 'Võ Thị Anh Thư', grade: '7', campus: 'CS4' },
    { name: 'Lê Hồ Gia Huy', grade: '10', campus: 'CS1' },
    { name: 'Lê Khánh Hà', grade: '10', campus: 'CS1' }
  ];

  for (const item of studentsToCheck) {
    console.log(`\n================== ${item.name} (${item.campus}, Khối ${item.grade}) ==================`);
    // 1. IAS
    const ias = await client.execute({
      sql: `SELECT id, studentCode, enrollmentCode, fullName, className, grade, admissionResult, directorNote, admissionCampus, enrollmentClassId
            FROM InputAssessmentStudent
            WHERE fullName LIKE ? AND (admissionCampus = ? OR registeredCampus LIKE ? OR admissionCampus IS NULL OR admissionCampus = '')`,
      args: [`%${item.name}%`, item.campus, `%${item.campus}%`]
    });
    console.log('IAS rows:', JSON.stringify(ias.rows, null, 2));

    for (const r of ias.rows) {
      // SAS
      const sas = await client.execute({
        sql: `SELECT sas.id, sas.subjectId, sas.scores, sas.comments, sub.name as subName, sub.code as subCode
              FROM StudentAssessmentScore sas
              JOIN AssessmentSubject sub ON sas.subjectId = sub.id
              WHERE sas.studentId = ?`,
        args: [r.id]
      });
      console.log(`SAS scores for IAS ${r.id}:`, JSON.stringify(sas.rows, null, 2));
    }

    // 2. Student table
    const st = await client.execute({
      sql: `SELECT s.id, s.studentCode, s.studentName, c.className, c.grade, cmp.campusCode
            FROM Student s
            LEFT JOIN Class c ON s.classId = c.id
            LEFT JOIN Campus cmp ON c.campusId = cmp.id
            WHERE s.studentName LIKE ? AND (cmp.campusCode = ? OR c.grade = ?)`,
      args: [`%${item.name}%`, item.campus, item.grade]
    });
    console.log('Student rows:', JSON.stringify(st.rows, null, 2));

    for (const s of st.rows) {
      const grades = await client.execute({
        sql: `SELECT sge.compositeScore, sub.subjectName, c.className
              FROM SubjectGradeEntry sge
              JOIN Subject sub ON sge.subjectId = sub.id
              LEFT JOIN Class c ON sge.classId = c.id
              WHERE sge.studentId = ? AND sge.evaluationPeriod = 'KSĐN'`,
        args: [s.id]
      });
      console.log(`KSĐN for Student ${s.studentName} (${s.studentCode}, ${s.className}):`, JSON.stringify(grades.rows, null, 2));
    }
  }
}

check().catch(console.error);
