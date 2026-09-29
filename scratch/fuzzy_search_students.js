const { createClient } = require('@libsql/client');
const path = require('path');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

function removeVietnameseTones(str) {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  return str.toLowerCase().trim();
}

const targetNames = [
  'Anh Minh', 'Minh'
];

async function main() {
  const classesRes = await client.execute("SELECT id, className, grade, campusId FROM Class");
  const classMap = {};
  classesRes.rows.forEach(c => classMap[c.id] = c);

  const campusRes = await client.execute("SELECT id, campusName, campusCode FROM Campus");
  const campusMap = {};
  campusRes.rows.forEach(cp => campusMap[cp.id] = cp);

  // Get all students
  const allStRes = await client.execute("SELECT id, studentCode, studentName, classId, campusId, status FROM Student");
  // Get all InputAssessmentStudent
  const allInpRes = await client.execute("SELECT id, studentCode, enrollmentCode, fullName, className, enrollmentClassId, admissionCampus, registeredCampus, admissionResult, directorNote, mathScore, literatureScore, writtenEnglishScore, oralEnglishScore, psychologyScore FROM InputAssessmentStudent");
  
  // Try PreschoolInputAssessmentStudent if exists
  let allPreRes = { rows: [] };
  try {
    allPreRes = await client.execute("SELECT id, studentCode, enrollmentCode, fullName, className, enrollmentClassId, admissionCampus, registeredCampus, admissionResult, directorNote FROM PreschoolInputAssessmentStudent");
  } catch (e) {
    console.log("No PreschoolInputAssessmentStudent table or error:", e.message);
  }

  for (const tName of targetNames) {
    const normTarget = removeVietnameseTones(tName);
    console.log(`\n========================================`);
    console.log(`🔎 TÌM KIẾM MỜ: "${tName}" (chuẩn: ${normTarget})`);

    const matchSt = allStRes.rows.filter(s => removeVietnameseTones(s.studentName || '').includes(normTarget));
    console.log(`[Student Table] (${matchSt.length} matches):`);
    for (const s of matchSt) {
      const cls = classMap[s.classId];
      const cp = campusMap[s.campusId];
      const gradeRes = await client.execute({
        sql: "SELECT s.subjectName, g.compositeScore, g.evaluationPeriod FROM SubjectGradeEntry g JOIN Subject s ON g.subjectId = s.id WHERE g.studentId = ? AND g.evaluationPeriod = 'KSĐN'",
        args: [s.id]
      });
      console.log(`  -> Mã: ${s.studentCode} | Tên: ${s.studentName} | Lớp: ${cls?.className || 'Chưa rõ'} | Khối: ${cls?.grade} | CS: ${cp?.campusName || cp?.campusCode}`);
      console.log(`     Điểm KSĐN:`, gradeRes.rows.map(g => `${g.subjectName}: ${g.compositeScore}`).join(', ') || 'Chưa có điểm KSĐN');
    }

    const matchInp = allInpRes.rows.filter(s => removeVietnameseTones(s.fullName || '').includes(normTarget));
    console.log(`[Input Table] (${matchInp.length} matches):`);
    for (const inp of matchInp) {
      const enrCls = classMap[inp.enrollmentClassId];
      console.log(`  -> Mã: ${inp.studentCode || inp.enrollmentCode} | Tên: ${inp.fullName} | Lớp: ${enrCls?.className || inp.className} | CS: ${inp.admissionCampus || inp.registeredCampus}`);
      console.log(`     KQ/Note: ${inp.admissionResult || ''} | ${inp.directorNote || ''}`);
      console.log(`     Điểm KSĐV: Toán: ${inp.mathScore} | Văn: ${inp.literatureScore} | AnhV: ${inp.writtenEnglishScore} | AnhN: ${inp.oralEnglishScore} | TL: ${inp.psychologyScore}`);
    }

    const matchPre = allPreRes.rows.filter(s => removeVietnameseTones(s.fullName || '').includes(normTarget));
    if (matchPre.length > 0) {
      console.log(`[Preschool Table] (${matchPre.length} matches):`);
      for (const pre of matchPre) {
        const enrCls = classMap[pre.enrollmentClassId];
        console.log(`  -> Mã: ${pre.studentCode || pre.enrollmentCode} | Tên: ${pre.fullName} | Lớp: ${enrCls?.className || pre.className} | CS: ${pre.admissionCampus || pre.registeredCampus}`);
      }
    }
  }
}

main().catch(console.error);
