const fs = require('fs');
const path = require('path');

const raw76 = JSON.parse(fs.readFileSync(path.join(__dirname, 'raw_76_turso_audit.json'), 'utf8'));
const table76 = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));

// Map table76 by normalized name
const tableMap = {};
table76.forEach(st => {
  tableMap[st.fullName.trim().toLowerCase()] = st;
});

console.log('--- COMPARING TURSO RAW DB vs CURRENT EXACT COMMITMENT TABLE ---');

const discrepancies = [];

raw76.forEach((item, idx) => {
  const ias = item.ias;
  const sas = item.sas;
  const ksdn = item.ksdn;
  const stDb = item.studentDb;

  const normName = ias.fullName.trim().toLowerCase();
  const tbl = tableMap[normName];

  if (!tbl) {
    discrepancies.push({
      type: 'MISSING_IN_TABLE',
      name: ias.fullName,
      campus: ias.admissionCampus,
      grade: ias.grade
    });
    return;
  }

  // Parse SAS raw scores
  const rawScores = {};
  sas.forEach(s => {
    let val = null;
    try {
      const p = JSON.parse(s.scores);
      if (Array.isArray(p)) val = p[0];
      else val = p;
    } catch (e) {
      val = s.scores;
    }
    rawScores[s.subCode || s.subName] = {
      val,
      name: s.subName,
      code: s.subCode,
      comments: s.comments
    };
  });

  // Extract directorNote committed subjects
  const note = ias.directorNote || '';
  const match = note.match(/Môn cam kết:\s*\[(.*?)\]/i);
  let commRaw = match ? match[1].trim() : '';

  // Compare committed subjects in tbl vs commRaw
  const tblComms = (tbl.committedSubjects || []).join(', ');

  // Compare KSĐN scores in Turso vs tbl
  const ksdnTurso = {};
  ksdn.forEach(k => {
    const sName = k.subjectName;
    const score = Number(k.compositeScore);
    if (sName.includes('Toán') || sName.includes('Math')) ksdnTurso.math = score;
    if (sName.includes('Tiếng Việt')) ksdnTurso.viet = score;
    if (sName.includes('Ngữ Văn') || sName.includes('Văn')) ksdnTurso.van = score;
    if (sName.includes('Tiếng Anh') || sName.includes('English') || sName.includes('ESL')) ksdnTurso.eng = score;
  });

  const studentDiff = {
    idx: idx + 1,
    name: ias.fullName,
    campus: ias.admissionCampus,
    classTurso: stDb ? stDb.className : ias.className,
    classTbl: tbl.className,
    directorNote: note.replace(/\n/g, ' ').substring(0, 100),
    commRaw,
    tblComms,
    rawScores,
    tblKsdv: {
      math: tbl.ksdvMath,
      viet: tbl.ksdvViet,
      van: tbl.ksdvVan,
      eng: tbl.ksdvEngScale10,
      psy: tbl.ksdvPsy
    },
    tursoKsdn: ksdnTurso,
    tblKsdn: {
      math: tbl.ksdnMath,
      viet: tbl.ksdnViet,
      van: tbl.ksdnVan,
      eng: tbl.ksdnEng
    }
  };

  discrepancies.push(studentDiff);
});

fs.writeFileSync(path.join(__dirname, 'db_vs_table_audit.json'), JSON.stringify(discrepancies, null, 2), 'utf8');
console.log('Saved db_vs_table_audit.json!');

// Summary of discrepancies
let scoreMismatches = 0;
let commMismatches = 0;
discrepancies.forEach(d => {
  // Check KSĐN mismatch
  const kTurso = d.tursoKsdn;
  const kTbl = d.tblKsdn;
  const hasKsdnMismatch = 
    (kTurso.math !== undefined && kTurso.math !== kTbl.math) ||
    (kTurso.viet !== undefined && kTurso.viet !== kTbl.viet) ||
    (kTurso.van !== undefined && kTurso.van !== kTbl.van) ||
    (kTurso.eng !== undefined && kTurso.eng !== kTbl.eng);
  
  if (hasKsdnMismatch) {
    scoreMismatches++;
    console.log(`[KSĐN MISMATCH] ${d.name}: Turso=${JSON.stringify(kTurso)} vs Table=${JSON.stringify(kTbl)}`);
  }
});

console.log(`Total KSĐN score mismatches: ${scoreMismatches}`);
