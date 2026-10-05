const { createClient } = require('@libsql/client');
require('dotenv').config();

const TURSO_URL = process.env.TURSO_DATABASE_URL || "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || "";

const client = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN
});

async function main() {
  console.log('--- 1. TÌM HỌC SINH 0602040006 (Huỳnh Gia Bảo Linh) ---');
  const studentRes = await client.execute({
    sql: `SELECT s.*, c.className, c.grade, c.campusId, c.homeroomTeacherId 
          FROM Student s 
          LEFT JOIN Class c ON s.classId = c.id 
          WHERE s.studentCode = '0602040006' OR s.studentName LIKE '%Bảo Linh%'`,
    args: []
  });
  console.log('Học sinh tìm thấy:', studentRes.rows);

  if (studentRes.rows.length === 0) {
    console.log('Không tìm thấy học sinh với mã 0602040006');
    return;
  }

  const student = studentRes.rows[0];
  const classId = student.classId;

  console.log('\n--- 2. TÌM THÔNG TIN GVCN CỦA LỚP ---');
  console.log('Class ID:', classId, 'Class Name:', student.className, 'homeroomTeacherId:', student.homeroomTeacherId);

  // Check Class homeroomTeacherId in Teacher / User
  if (student.homeroomTeacherId) {
    const tRes = await client.execute({
      sql: `SELECT * FROM Teacher WHERE id = ? OR userId = ?`,
      args: [student.homeroomTeacherId, student.homeroomTeacherId]
    });
    console.log('Teacher by homeroomTeacherId:', tRes.rows);

    const uRes = await client.execute({
      sql: `SELECT id, fullName, email, role FROM User WHERE id = ?`,
      args: [student.homeroomTeacherId]
    });
    console.log('User by homeroomTeacherId:', uRes.rows);
  }

  // Check TeacherClassAssignment
  const tcaRes = await client.execute({
    sql: `SELECT tca.*, t.teacherName, t.teacherCode, t.email, t.userId 
          FROM TeacherClassAssignment tca 
          JOIN Teacher t ON tca.teacherId = t.id 
          WHERE tca.classId = ?`,
    args: [classId]
  });
  console.log('TeacherClassAssignment trong lớp:', tcaRes.rows);

  // Check TeachingAssignment
  const taRes = await client.execute({
    sql: `SELECT ta.*, t.teacherName, t.teacherCode 
          FROM TeachingAssignment ta 
          LEFT JOIN Teacher t ON ta.teacherId = t.id 
          WHERE ta.classId = ?`,
    args: [classId]
  });
  console.log('TeachingAssignment trong lớp:', taRes.rows);

  // Check all teachers having homeroomClass matching className
  const hrRes = await client.execute({
    sql: `SELECT id, teacherCode, teacherName, homeroomClass, email FROM Teacher WHERE homeroomClass LIKE ?`,
    args: [`%${student.className}%`]
  });
  console.log('Teacher có homeroomClass khớp tên lớp:', hrRes.rows);

  console.log('\n--- 3. ĐIỂM HỌC BẠ ĐỊNH KỲ (HK1, HK2, CN) - StudentTermScore ---');
  const termScoresRes = await client.execute({
    sql: `SELECT sts.*, sub.subjectCode, sub.subjectName 
          FROM StudentTermScore sts 
          JOIN Subject sub ON sts.subjectId = sub.id 
          WHERE sts.studentId = ? 
          ORDER BY sts.semester, sub.subjectName`,
    args: [student.id]
  });
  console.log('Số bản ghi StudentTermScore:', termScoresRes.rows.length);
  termScoresRes.rows.forEach(r => {
    console.log(`[${r.semester}] ${r.subjectName} (${r.subjectCode}): score=${r.score}, grade=${r.evaluationGrade}`);
  });

  console.log('\n--- 4. TỔNG KẾT HỌC KỲ (StudentTermSummary) ---');
  const termSummaryRes = await client.execute({
    sql: `SELECT * FROM StudentTermSummary WHERE studentId = ?`,
    args: [student.id]
  });
  console.log('StudentTermSummary:', termSummaryRes.rows);

  console.log('\n--- 5. ĐIỂM KIỂM TRA ĐỊNH KỲ (SubjectGradeEntry) ---');
  const sgeRes = await client.execute({
    sql: `SELECT sge.*, sub.subjectCode, sub.subjectName 
          FROM SubjectGradeEntry sge 
          JOIN Subject sub ON sge.subjectId = sub.id 
          WHERE sge.studentId = ? 
          ORDER BY sge.evaluationPeriod, sub.subjectName`,
    args: [student.id]
  });
  console.log('Số bản ghi SubjectGradeEntry:', sgeRes.rows.length);
  sgeRes.rows.forEach(r => {
    console.log(`[Period: ${r.evaluationPeriod}] ${r.subjectName} (${r.subjectCode}): composite=${r.compositeScore}, components=${r.componentScores}`);
  });

  console.log('\n--- 6. CÁC KỲ ĐÁNH GIÁ (evaluationPeriod) CÓ TRONG SubjectGradeEntry TOÀN HỆ THỐNG ---');
  const allPeriodsRes = await client.execute({
    sql: `SELECT DISTINCT evaluationPeriod, COUNT(*) as count FROM SubjectGradeEntry GROUP BY evaluationPeriod`,
    args: []
  });
  console.log('Tất cả kỳ đánh giá trong SubjectGradeEntry:', allPeriodsRes.rows);

  console.log('\n--- 7. CÁC KỲ THI ĐỊNH KỲ TRONG BẢNG Exam / ExamStudent ---');
  const examStudentRes = await client.execute({
    sql: `SELECT es.*, e.name as examName, e.code as examCode, ec.name as categoryName 
          FROM ExamStudent es 
          JOIN Exam e ON es.examId = e.id 
          LEFT JOIN ExamCategory ec ON e.categoryId = ec.id 
          WHERE es.studentId = ?`,
    args: [student.id]
  });
  console.log('ExamStudent của học sinh:', examStudentRes.rows);

  const allExamsRes = await client.execute({
    sql: `SELECT e.id, e.name, e.code, ec.name as categoryName, COUNT(es.id) as studentCount 
          FROM Exam e 
          LEFT JOIN ExamCategory ec ON e.categoryId = ec.id 
          LEFT JOIN ExamStudent es ON e.id = es.examId 
          GROUP BY e.id LIMIT 10`,
    args: []
  });
  console.log('Các kỳ thi Exam mẫu trong hệ thống:', allExamsRes.rows);
}

main().catch(console.error);
