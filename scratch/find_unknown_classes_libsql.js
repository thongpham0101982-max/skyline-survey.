const { createClient } = require('@libsql/client');
const path = require('path');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

const names = [
  'Đỗ An Nhiên', 'Hà Đặng Phước Huy', 'Lê Đình Sĩ Phú', 'LÊ ĐÌNH SĨ PHÚ', 'Nguyễn Daniil',
  'Lê Gia Lân', 'Đào Trần Thảo Linh', 'Nguyễn Thanh Phúc', 'Đỗ Nguyễn An Khôi', 'ĐỖ NGUYỄN AN KHÔI',
  'Phan Hải Đăng', 'Lê Hồ Duy Khang', 'Sangadziev Aron', 'Govorushko Mikhail',
  'Ngô Huỳnh Anh Minh', 'Vũ Đức Thịnh'
];

async function main() {
  console.log("=== TRA CỨU HỌC SINH CÓ LỚP 'CHƯA RÕ' TRÊN LOCAL.DB ===");
  
  // 1. Classes map
  const classesRes = await client.execute("SELECT id, className, grade, campusId FROM Class");
  const classMap = {};
  classesRes.rows.forEach(c => classMap[c.id] = c);

  // 2. Campuses map
  const campusRes = await client.execute("SELECT id, campusName, campusCode FROM Campus");
  const campusMap = {};
  campusRes.rows.forEach(cp => campusMap[cp.id] = cp);

  for (const name of names) {
    const clean = name.trim().toLowerCase();
    
    // Check in Student table
    const stRes = await client.execute({
      sql: "SELECT id, studentCode, studentName, classId, campusId, status FROM Student WHERE LOWER(studentName) LIKE ?",
      args: [`%${clean}%`]
    });

    // Check in InputAssessmentStudent
    const inpRes = await client.execute({
      sql: "SELECT id, studentCode, enrollmentCode, fullName, className, enrollmentClassId, admissionCampus, registeredCampus, admissionResult, directorNote, targetType, admissionCriteria, mathScore, literatureScore, writtenEnglishScore, oralEnglishScore, psychologyScore FROM InputAssessmentStudent WHERE LOWER(fullName) LIKE ?",
      args: [`%${clean}%`]
    });

    console.log(`\n--------------------------------------------------`);
    console.log(`🔎 TÌM KIẾM: "${name}"`);
    console.log(`[Student Table] (${stRes.rows.length} records):`);
    for (const s of stRes.rows) {
      const cls = classMap[s.classId];
      const cp = campusMap[s.campusId];
      // Check grades
      const gradeRes = await client.execute({
        sql: "SELECT s.subjectName, g.compositeScore, g.evaluationPeriod FROM SubjectGradeEntry g JOIN Subject s ON g.subjectId = s.id WHERE g.studentId = ? AND g.evaluationPeriod = 'KSĐN'",
        args: [s.id]
      });
      console.log(`  -> Mã: ${s.studentCode} | Tên: ${s.studentName} | Lớp: ${cls?.className || s.classId} (Khối ${cls?.grade}) | Cơ sở: ${cp?.campusName || cp?.campusCode} | Trạng thái: ${s.status}`);
      console.log(`     Điểm KSĐN:`, gradeRes.rows.map(g => `${g.subjectName}: ${g.compositeScore}`).join(', ') || 'Chưa có điểm KSĐN');
    }

    console.log(`[InputAssessmentStudent Table] (${inpRes.rows.length} records):`);
    for (const inp of inpRes.rows) {
      const enrCls = classMap[inp.enrollmentClassId];
      console.log(`  -> Mã: ${inp.studentCode || inp.enrollmentCode} | Tên: ${inp.fullName} | Lớp hồ sơ: ${inp.className} | Lớp xếp: ${enrCls?.className || inp.enrollmentClassId} | Cơ sở: ${inp.admissionCampus || inp.registeredCampus}`);
      console.log(`     KQ/Ghi chú: ${inp.admissionResult || ''} | ${inp.directorNote || ''}`);
      console.log(`     Điểm KSĐV: Toán: ${inp.mathScore} | Văn: ${inp.literatureScore} | Anh Viết: ${inp.writtenEnglishScore} | Anh Nói: ${inp.oralEnglishScore} | EPT: ${inp.eptScore} | Tâm lý: ${inp.psychologyScore}`);
    }
  }
}

main().catch(console.error);
