const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'raw_76_turso_audit.json'), 'utf8'));

console.log(`Analyzing ${data.length} students from pure Turso DB...\n`);

let withCommittedSubjects = [];
let chungMonitoring = [];

data.forEach((item, idx) => {
  const ias = item.ias;
  const sas = item.sas;
  const ksdn = item.ksdn;
  const stDb = item.studentDb;

  const note = ias.directorNote || '';
  
  // Extract committed subjects from note
  // Common patterns:
  // "Môn cam kết: [Môn Toán, Tiếng Anh]"
  // "Môn cam kết: [EPT]"
  // "Môn cam kết: [Tiếng Việt]"
  // "Môn cam kết: [Chung/ Theo dõi]" or empty/general
  const match = note.match(/Môn cam kết:\s*\[(.*?)\]/i);
  let commSubStr = match ? match[1].trim() : '';

  // Parse SAS scores
  const sasScores = {};
  sas.forEach(s => {
    let val = null;
    try {
      const p = JSON.parse(s.scores);
      if (Array.isArray(p)) val = p[0];
      else val = p;
    } catch(e) {
      val = s.scores;
    }
    sasScores[s.subCode || s.subName] = {
      name: s.subName,
      code: s.subCode,
      score: val,
      comments: s.comments
    };
  });

  const studentSummary = {
    idx: idx + 1,
    fullName: ias.fullName,
    grade: ias.grade,
    campus: ias.admissionCampus,
    actualClass: stDb ? stDb.className : ias.className,
    studentCode: stDb ? stDb.studentCode : (ias.enrollmentCode || ias.studentCode),
    directorNote: note.replace(/\n/g, ' ').trim(),
    committedSubjectsExtracted: commSubStr,
    sasScores,
    ksdnScores: ksdn.map(k => `${k.subjectName}: ${k.compositeScore}`).join(', ')
  };

  if (!commSubStr || commSubStr.toLowerCase().includes('chung') || commSubStr.toLowerCase().includes('theo dõi')) {
    chungMonitoring.push(studentSummary);
  } else {
    withCommittedSubjects.push(studentSummary);
  }
});

console.log(`Students with specific academic committed subjects: ${withCommittedSubjects.length}`);
console.log(`Students with Chung / Theo dõi: ${chungMonitoring.length}`);
console.log(`Total: ${withCommittedSubjects.length + chungMonitoring.length}`);

console.log('\n--- 6 CHUNG / THEO DÕI STUDENTS ---');
chungMonitoring.forEach(s => {
  console.log(`${s.idx}. ${s.fullName} (${s.actualClass || s.grade}) - Note: "${s.directorNote}" - Extracted: "${s.committedSubjectsExtracted}"`);
});

console.log('\n--- SAMPLE 10 STUDENTS WITH COMMITTED SUBJECTS ---');
withCommittedSubjects.slice(0, 10).forEach(s => {
  console.log(`${s.idx}. ${s.fullName} (${s.actualClass}) | Committed: [${s.committedSubjectsExtracted}] | KSĐN: [${s.ksdnScores}]`);
});
