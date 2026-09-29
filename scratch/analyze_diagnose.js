const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'diagnose_76_ksdv_full.json'), 'utf8'));

console.log(`Total students: ${data.length}`);

// Let's see what unique subject codes exist in sasScores
const allCodes = new Set();
data.forEach(d => {
  d.sasScores.forEach(s => allCodes.add(`${s.code} (${s.name})`));
});
console.log('All subject codes found in SAS:', Array.from(allCodes));

// Check each student
const studentsWithIssues = [];
const studentsWithScores = [];

data.forEach((s, idx) => {
  const comm = Array.isArray(s.committed) ? s.committed.join(', ') : (s.committed || '');
  const sasMap = {};
  s.sasScores.forEach(sc => {
    let val = sc.scores;
    try {
      const parsed = JSON.parse(sc.scores);
      val = parsed;
    } catch (e) {}
    sasMap[sc.code] = { name: sc.name, val };
  });

  // Calculate actual potential entrance scores from all sources
  // Math: sasMap['TOA'] or s.iasFields.mathScore
  let math = null;
  if (sasMap['TOA'] && sasMap['TOA'].val) {
    const v = Array.isArray(sasMap['TOA'].val) ? sasMap['TOA'].val[0] : sasMap['TOA'].val;
    if (v != null && v !== '') math = parseFloat(v);
  }
  if (math == null && s.iasFields.mathScore != null) math = parseFloat(s.iasFields.mathScore);

  // Viet: sasMap['TVI'] or sasMap['NVA'] (if grade <= 5) or s.iasFields.literatureScore
  let viet = null;
  if (sasMap['TVI'] && sasMap['TVI'].val) {
    const v = Array.isArray(sasMap['TVI'].val) ? sasMap['TVI'].val[0] : sasMap['TVI'].val;
    if (v != null && v !== '') viet = parseFloat(v);
  }

  // Van: sasMap['NVA'] or s.iasFields.literatureScore
  let van = null;
  if (sasMap['NVA'] && sasMap['NVA'].val) {
    const v = Array.isArray(sasMap['NVA'].val) ? sasMap['NVA'].val[0] : sasMap['NVA'].val;
    if (v != null && v !== '') van = parseFloat(v);
  }
  if (van == null && s.iasFields.literatureScore != null) van = parseFloat(s.iasFields.literatureScore);

  // English:
  // TAv (written, scale 70), TAvd (oral, scale 30), EPT (scale 100), or iasFields.writtenEnglishScore / oralEnglishScore
  let engWritten = null;
  let engOral = null;
  let engEpt = null;
  if (sasMap['TAv'] && sasMap['TAv'].val) {
    const v = Array.isArray(sasMap['TAv'].val) ? sasMap['TAv'].val[0] : sasMap['TAv'].val;
    if (v != null && v !== '') engWritten = parseFloat(v);
  }
  if (engWritten == null && s.iasFields.writtenEnglishScore != null) engWritten = parseFloat(s.iasFields.writtenEnglishScore);

  if (sasMap['TAvd'] && sasMap['TAvd'].val) {
    const v = Array.isArray(sasMap['TAvd'].val) ? sasMap['TAvd'].val[0] : sasMap['TAvd'].val;
    if (v != null && v !== '') engOral = parseFloat(v);
  }
  if (engOral == null && s.iasFields.oralEnglishScore != null) engOral = parseFloat(s.iasFields.oralEnglishScore);

  if (sasMap['EPT'] && sasMap['EPT'].val) {
    const v = Array.isArray(sasMap['EPT'].val) ? sasMap['EPT'].val[0] : sasMap['EPT'].val;
    if (v != null && v !== '') engEpt = parseFloat(v);
  }

  let engTotal = null;
  let engScale10 = null;
  if (engEpt != null && !isNaN(engEpt)) {
    engTotal = engEpt;
    engScale10 = +(engEpt / 10).toFixed(1);
  } else if (engWritten != null || engOral != null) {
    engTotal = (engWritten || 0) + (engOral || 0);
    engScale10 = +(engTotal / 10).toFixed(1);
  }

  // Check what is missing according to commitment
  const missingCommitted = [];
  if (comm.includes('Toán') && math == null) missingCommitted.push('Toán');
  if (comm.includes('Tiếng Việt') && viet == null) missingCommitted.push('Tiếng Việt');
  if (comm.includes('Ngữ Văn') && van == null) missingCommitted.push('Ngữ Văn');
  if (comm.includes('Tiếng Anh') && engTotal == null) missingCommitted.push('Tiếng Anh');

  const totalRawScores = s.sasScores.length;

  const item = {
    idx: idx + 1,
    name: s.name,
    campus: s.campus,
    grade: s.grade,
    className: s.className,
    committed: comm,
    isPsychology: s.isPsychology,
    totalRawScores,
    math, viet, van, engTotal, engScale10,
    missingCommitted,
    admissionCriteria: s.iasFields.admissionCriteria,
    admissionResult: s.iasFields.admissionResult,
    directorNote: s.iasFields.directorNote,
    sasKeys: Object.keys(sasMap)
  };

  if (missingCommitted.length > 0 || (math == null && viet == null && van == null && engTotal == null && !s.isPsychology)) {
    studentsWithIssues.push(item);
  } else {
    studentsWithScores.push(item);
  }
});

console.log(`\n=== RESULT SUMMARY ===`);
console.log(`Students with complete scores for committed subjects: ${studentsWithScores.length}`);
console.log(`Students with missing entrance scores or issues: ${studentsWithIssues.length}\n`);

studentsWithIssues.forEach(it => {
  console.log(`[${it.idx}] ${it.name} | ${it.campus} | Lớp: ${it.className} (Khối ${it.grade})`);
  console.log(`    Cam kết: [${it.committed}]`);
  console.log(`    Thiếu môn CK: [${it.missingCommitted.join(', ')}]`);
  console.log(`    Điểm hiện có: Toán=${it.math}, TV=${it.viet}, Văn=${it.van}, AnhTotal=${it.engTotal} (Scale10=${it.engScale10})`);
  console.log(`    Tiêu chí: ${it.admissionCriteria} | Kết quả: ${it.admissionResult}`);
  console.log(`    Ghi chú: ${JSON.stringify(it.directorNote)}`);
  console.log(`    SAS keys: ${it.sasKeys.join(', ')}`);
  console.log('----------------------------------------------------');
});
