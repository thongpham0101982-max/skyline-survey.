const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function run() {
  const raw76 = JSON.parse(fs.readFileSync(path.join(__dirname, 'raw_76_turso_audit.json'), 'utf8'));

  console.log(`Checking KSĐV and KSĐN ground-truth for all ${raw76.length} students...\n`);

  const results = [];

  for (let i = 0; i < raw76.length; i++) {
    const item = raw76[i];
    const ias = item.ias;
    const sas = item.sas;

    // 1. Identify committed subjects
    const note = ias.directorNote || '';
    let commList = [];
    const match = note.match(/Môn cam kết:\s*\[(.*?)\]/i);
    if (match) {
      commList = match[1].split(',').map(s => s.trim()).filter(Boolean);
    } else {
      // Check textual note
      if (/cam kết.*tiếng anh/i.test(note)) commList.push('Tiếng Anh');
      if (/cam kết.*toán/i.test(note)) commList.push('Toán');
      if (/cam kết.*tiếng việt/i.test(note)) commList.push('Tiếng Việt');
      if (/cam kết.*ngữ văn|văn/i.test(note)) commList.push('Ngữ Văn');
    }

    // Standardize commList into: 'Toán', 'Tiếng Việt', 'Ngữ Văn', 'Tiếng Anh', 'Tâm lý'
    const stdComms = new Set();
    commList.forEach(c => {
      const low = c.toLowerCase();
      if (low.includes('toán') || low.includes('math')) stdComms.add('Toán');
      else if (low.includes('tiếng việt')) stdComms.add('Tiếng Việt');
      else if (low.includes('văn')) stdComms.add('Ngữ Văn');
      else if (low.includes('anh') || low.includes('ept') || low.includes('esl')) stdComms.add('Tiếng Anh');
      else if (low.includes('tâm lý')) stdComms.add('Tâm lý');
    });

    // 2. Parse KSĐV scores from SAS
    const ksdvScores = {
      math: null,
      viet: null,
      van: null,
      eng: null,
      psy: null
    };

    // Also check direct columns in IAS
    if (ias.mathScore != null) ksdvScores.math = Number(ias.mathScore);
    if (ias.literatureScore != null) {
      if (parseInt(ias.grade, 10) <= 5) ksdvScores.viet = Number(ias.literatureScore);
      else ksdvScores.van = Number(ias.literatureScore);
    }
    if (ias.psychologyScore != null) ksdvScores.psy = Number(ias.psychologyScore);

    // Now inspect SAS rows
    let engWritten = null;
    let engOral = null;
    let engEpt = null;
    let engNoteScore = null;

    sas.forEach(s => {
      let val = null;
      try {
        const p = JSON.parse(s.scores);
        if (Array.isArray(p)) val = p[0];
        else val = p;
      } catch (e) {
        val = s.scores;
      }

      const numVal = (val !== null && val !== '' && !isNaN(val)) ? Number(val) : null;
      const code = (s.subCode || '').toUpperCase();
      const sName = (s.subName || '').toLowerCase();

      // Check comments for teacher note like "Note: 4/10" or "41/100"
      const comments = s.comments || '';
      const noteMatch = comments.match(/Note:\s*([0-9.]+)\/10/i);
      if (noteMatch) {
        engNoteScore = Number(noteMatch[1]);
      }

      if (code === 'TOA' || sName.includes('toán')) {
        if (numVal !== null) ksdvScores.math = numVal;
      } else if (code === 'TVI' || sName.includes('tiếng việt')) {
        if (numVal !== null) ksdvScores.viet = numVal;
      } else if (code === 'NVA' || sName.includes('văn')) {
        if (numVal !== null) ksdvScores.van = numVal;
      } else if (code === 'TAVD' || sName.includes('vấn đáp')) {
        if (numVal !== null) engOral = numVal;
      } else if (code === 'TAV' || sName.includes('viết')) {
        if (numVal !== null) engWritten = numVal;
      } else if (code === 'EPT' || sName.includes('ept')) {
        if (numVal !== null) engEpt = numVal;
      } else if (code === 'TLY' || sName.includes('tâm lý')) {
        if (numVal !== null) ksdvScores.psy = numVal;
      }
    });

    // Calculate English KSĐV score
    if (engNoteScore !== null) {
      ksdvScores.eng = engNoteScore;
    } else if (engEpt !== null) {
      // EPT score out of 100 -> convert to 10
      ksdvScores.eng = +(engEpt / 10).toFixed(1);
    } else if (engWritten !== null || engOral !== null) {
      // If both, or oral/written
      // Let's check how it's scored in the school system:
      // Grade 1: oral only (out of 10)
      // Grade 2-5: oral (30) + written (70) -> / 10
      // Grade 6-12: oral (30) + written (70) -> / 10
      const total = (engWritten || 0) + (engOral || 0);
      if (parseInt(ias.grade, 10) === 1) {
        ksdvScores.eng = engOral !== null ? engOral : (engWritten !== null ? engWritten : null);
      } else {
        if (total > 10) {
          ksdvScores.eng = +(total / 10).toFixed(1);
        } else {
          ksdvScores.eng = total;
        }
      }
    }

    // 3. Match Student & KSĐN scores directly from Turso
    // First find the Student record
    let stDb = null;
    // Check by studentCode or enrollmentCode or name + campus
    const sSearch = await client.execute({
      sql: `SELECT s.id, s.studentCode, s.studentName, c.className, c.grade, cmp.campusCode
            FROM Student s
            LEFT JOIN Class c ON s.classId = c.id
            LEFT JOIN Campus cmp ON c.campusId = cmp.id
            WHERE s.studentCode = ? OR s.studentCode = ? OR (LOWER(TRIM(s.studentName)) = LOWER(TRIM(?)) AND cmp.campusCode = ?)`,
      args: [ias.enrollmentCode || '', ias.studentCode || '', ias.fullName, ias.admissionCampus]
    });
    if (sSearch.rows.length > 0) {
      // Prioritize exact name match
      stDb = sSearch.rows.find(r => r.studentName.trim().toLowerCase() === ias.fullName.trim().toLowerCase()) || sSearch.rows[0];
    } else {
      // Search by name only
      const sByName = await client.execute({
        sql: `SELECT s.id, s.studentCode, s.studentName, c.className, c.grade, cmp.campusCode
              FROM Student s
              LEFT JOIN Class c ON s.classId = c.id
              LEFT JOIN Campus cmp ON c.campusId = cmp.id
              WHERE LOWER(TRIM(s.studentName)) = LOWER(TRIM(?))`,
        args: [ias.fullName]
      });
      if (sByName.rows.length > 0) stDb = sByName.rows[0];
    }

    const ksdnScores = {
      math: null,
      viet: null,
      van: null,
      eng: null
    };

    if (stDb) {
      const grades = await client.execute({
        sql: `SELECT sge.compositeScore, sub.subjectName
              FROM SubjectGradeEntry sge
              JOIN Subject sub ON sge.subjectId = sub.id
              WHERE sge.studentId = ? AND sge.evaluationPeriod = 'KSĐN'`,
        args: [stDb.id]
      });
      grades.rows.forEach(g => {
        const sName = g.subjectName;
        const sc = Number(g.compositeScore);
        if (sName.includes('Toán') || sName.includes('Math')) ksdnScores.math = sc;
        if (sName.includes('Tiếng Việt')) ksdnScores.viet = sc;
        if (sName.includes('Ngữ Văn') || sName.includes('Văn')) ksdnScores.van = sc;
        if (sName.includes('Tiếng Anh') || sName.includes('English') || sName.includes('ESL')) ksdnScores.eng = sc;
      });
    }

    results.push({
      stt: i + 1,
      id: ias.id,
      fullName: ias.fullName,
      studentCode: stDb ? stDb.studentCode : (ias.enrollmentCode || ias.studentCode),
      campus: ias.admissionCampus,
      grade: ias.grade,
      className: stDb ? stDb.className : ias.className,
      directorNote: note.replace(/\n/g, ' ').trim(),
      committedSubjects: Array.from(stdComms),
      isPsychology: stdComms.has('Tâm lý') || /tâm lý/i.test(note),
      ksdvScores,
      ksdnScores
    });
  }

  fs.writeFileSync(path.join(__dirname, 'pure_ground_truth_76.json'), JSON.stringify(results, null, 2), 'utf8');
  console.log('Saved pure_ground_truth_76.json!');
}

run().catch(console.error);
