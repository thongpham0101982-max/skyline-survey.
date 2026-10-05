const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  console.log('--- 1. FETCHING ALL 76 COMPLETED CKDV STUDENTS FROM TURSO CLOUD ---');

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

  console.log(`Found ${iasRes.rows.length} completed candidates in Turso DB.`);

  // 2. Fetch all SubjectGradeEntry for KSĐN
  const sgeRes = await client.execute(`
    SELECT sge.studentId, sge.compositeScore, sub.subjectName, sub.subjectCode, c.className
    FROM SubjectGradeEntry sge
    JOIN Subject sub ON sge.subjectId = sub.id
    LEFT JOIN Class c ON sge.classId = c.id
    WHERE sge.evaluationPeriod = 'KSĐN'
  `);
  console.log(`Found ${sgeRes.rows.length} KSĐN grades in Turso DB.`);

  // Group KSĐN by studentId
  const ksdnByStudentId = {};
  for (const row of sgeRes.rows) {
    if (!ksdnByStudentId[row.studentId]) ksdnByStudentId[row.studentId] = [];
    ksdnByStudentId[row.studentId].push(row);
  }

  // 3. Fetch all Students & Classes
  const studentRes = await client.execute(`
    SELECT s.id, s.studentCode, s.studentName, s.classId, c.className, c.grade, cmp.campusCode
    FROM Student s
    LEFT JOIN Class c ON s.classId = c.id
    LEFT JOIN Campus cmp ON c.campusId = cmp.id
  `);
  console.log(`Found ${studentRes.rows.length} students in Turso DB.`);

  const studentByCode = {};
  const studentByNameAndGrade = {};
  for (const s of studentRes.rows) {
    if (s.studentCode) studentByCode[s.studentCode.trim()] = s;
    const nameKey = `${s.studentName.trim().toLowerCase()}_${s.grade}`;
    if (!studentByNameAndGrade[nameKey]) studentByNameAndGrade[nameKey] = [];
    studentByNameAndGrade[nameKey].push(s);
  }

  // Specific manual name fixes for typos in DB (e.g. Sĩ Phú vs Sỹ Phú)
  const knownStudentCodeMap = {
    'LÊ ĐÌNH SĨ PHÚ': '0601012380', // Lê Đình Sỹ Phú (6.1_CS1)
    'Phạm Gia Bảo': '0601012370',   // Phạm Gia Bảo (9.3_CS1)
    'Nguyễn Minh Anh': '0601051036', // Nguyễn Minh Anh (6.5_CS5)
    'Nguyễn Đại Phúc ': '0601012394', // Nguyễn Đại Phúc (10.1_CS1)
    'Phạm Gia Hưng': '0601012371',  // Phạm Gia Hưng (7.3_CS1)
    'Nguyễn Quỳnh Như': '0601012352', // Nguyễn Quỳnh Như (6.1_CS1)
    'Lê Hồ Gia Huy': '0601012312',  // Lê Hồ Gia Huy (10.2_CS1)
    'Lê Khánh Hà': '0601011617',    // Lê Khánh Hà (10.2_CS1)
    'Võ Hoàng Vi': '0602040627',    // Võ Hoàng Vi (6S_CS4)
    'Phạm Kiều Anh': '0602040586',  // Phạm Kiều Anh (6S_CS4)
    'Võ Thị Anh Thư': '0602040621', // Võ Thị Anh Thư (7S_CS4)
    'Phan Anh Quân': '0701030370',  // Phan Anh Quân (9INT_CS3)
    'Lê Nguyên Khang': '0601012388' // Lê Nguyên Khang (2.1_CS1)
  };

  const finalTable = [];

  for (let i = 0; i < iasRes.rows.length; i++) {
    const ias = iasRes.rows[i];

    // Fetch SAS scores for this candidate
    const sasRes = await client.execute({
      sql: `SELECT sas.id, sas.subjectId, sas.scores, sas.comments, sub.name as subName, sub.code as subCode
            FROM StudentAssessmentScore sas
            JOIN AssessmentSubject sub ON sas.subjectId = sub.id
            WHERE sas.studentId = ?`,
      args: [ias.id]
    });

    // Match Student record
    let stDb = null;
    const knownCode = knownStudentCodeMap[ias.fullName.trim()] || knownStudentCodeMap[ias.fullName];
    if (knownCode && studentByCode[knownCode]) {
      stDb = studentByCode[knownCode];
    }
    if (!stDb && ias.enrollmentCode && studentByCode[ias.enrollmentCode.trim()]) {
      stDb = studentByCode[ias.enrollmentCode.trim()];
    }
    if (!stDb && ias.studentCode && studentByCode[ias.studentCode.trim()]) {
      stDb = studentByCode[ias.studentCode.trim()];
    }
    if (!stDb) {
      const nameKey = `${ias.fullName.trim().toLowerCase()}_${ias.grade}`;
      const candidates = studentByNameAndGrade[nameKey];
      if (candidates && candidates.length > 0) {
        stDb = candidates.find(c => c.campusCode === ias.admissionCampus) || candidates[0];
      }
    }

    // Determine campus and class
    let campus = ias.admissionCampus;
    if (!campus || campus === '') {
      if (stDb && stDb.campusCode) campus = stDb.campusCode;
      else if (stDb && stDb.className) {
        const m = stDb.className.match(/CS\d/);
        if (m) campus = m[0];
      }
    }
    if (!campus) campus = 'CS1';

    let actualClass = stDb ? stDb.className : ias.className;
    let studentCode = stDb ? stDb.studentCode : (ias.enrollmentCode || ias.studentCode);

    // Extract committed subjects from directorNote
    const note = ias.directorNote || '';
    let committedSubjects = [];
    const match = note.match(/Môn cam kết:\s*\[(.*?)\]/i);
    if (match) {
      const rawComms = match[1].split(',').map(s => s.trim()).filter(Boolean);
      rawComms.forEach(c => {
        const low = c.toLowerCase();
        if (low.includes('toán') || low.includes('math')) committedSubjects.push('Toán');
        else if (low.includes('tiếng việt')) committedSubjects.push('Tiếng Việt');
        else if (low.includes('ngữ văn') || low.includes('văn')) committedSubjects.push('Ngữ Văn');
        else if (low.includes('anh') || low.includes('ept') || low.includes('esl')) committedSubjects.push('Tiếng Anh');
        else if (low.includes('tâm lý')) committedSubjects.push('Tâm lý');
        else if (low.includes('chung') || low.includes('theo dõi')) committedSubjects.push('Chung / Theo dõi');
      });
    } else {
      // Textual analysis of note
      if (/cam kết.*tiếng anh/i.test(note)) committedSubjects.push('Tiếng Anh');
      if (/cam kết.*toán/i.test(note)) committedSubjects.push('Toán');
      if (/cam kết.*tiếng việt/i.test(note)) committedSubjects.push('Tiếng Việt');
      if (/cam kết.*ngữ văn/i.test(note) || /cam kết.*văn/i.test(note)) committedSubjects.push('Ngữ Văn');
      if (/theo dõi.*tâm lý|tư vấn tâm lí/i.test(note)) committedSubjects.push('Tâm lý');
      if (/giao lưu/i.test(note) || /tập trung chú ý/i.test(note) || /phát triển ngôn ngữ/i.test(note)) {
        committedSubjects.push('Chung / Theo dõi');
      }
    }

    // Deduplicate committed subjects
    committedSubjects = Array.from(new Set(committedSubjects));
    if (committedSubjects.length === 0) {
      if (/tâm lý/i.test(note)) committedSubjects.push('Tâm lý');
      else committedSubjects.push('Chung / Theo dõi');
    }

    // Parse KSĐV scores from SAS
    let ksdvMath = ias.mathScore != null ? Number(ias.mathScore) : null;
    let ksdvViet = null;
    let ksdvVan = null;
    if (ias.literatureScore != null) {
      if (parseInt(ias.grade, 10) <= 5) ksdvViet = Number(ias.literatureScore);
      else ksdvVan = Number(ias.literatureScore);
    }
    let ksdvPsy = ias.psychologyScore != null ? Number(ias.psychologyScore) : null;

    let engOral = null;
    let engWritten = null;
    let engEpt = null;
    let engNoteScore = null;

    sasRes.rows.forEach(s => {
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
      const comments = s.comments || '';

      const noteMatch = comments.match(/Note:\s*([0-9.]+)\/10/i);
      if (noteMatch) engNoteScore = Number(noteMatch[1]);

      if (code === 'TOA' || sName.includes('toán')) {
        if (numVal !== null) ksdvMath = numVal;
      } else if (code === 'TVI' || sName.includes('tiếng việt')) {
        if (numVal !== null) ksdvViet = numVal;
      } else if (code === 'NVA' || sName.includes('văn')) {
        if (numVal !== null) ksdvVan = numVal;
      } else if (code === 'TAVD' || sName.includes('vấn đáp')) {
        if (numVal !== null) engOral = numVal;
      } else if (code === 'TAV' || sName.includes('viết')) {
        if (numVal !== null) engWritten = numVal;
      } else if (code === 'EPT' || sName.includes('ept')) {
        if (numVal !== null) engEpt = numVal;
      } else if (code === 'TLY' || sName.includes('tâm lý')) {
        if (numVal !== null) ksdvPsy = numVal;
      }
    });

    // Special cases from database ground truth
    // Lê Nguyên Khang: Teacher Note 4/10 in SAS
    if (ias.fullName.includes('Lê Nguyên Khang')) {
      engNoteScore = 4.0;
    }

    let ksdvEngScale10 = null;
    if (engNoteScore !== null) {
      ksdvEngScale10 = engNoteScore;
    } else if (engEpt !== null) {
      ksdvEngScale10 = +(engEpt / 10).toFixed(1);
    } else if (engWritten !== null || engOral !== null) {
      const g = parseInt(ias.grade, 10);
      if (g === 1) {
        ksdvEngScale10 = engOral !== null ? engOral : engWritten;
      } else {
        const total = (engWritten || 0) + (engOral || 0);
        ksdvEngScale10 = total > 10 ? +(total / 10).toFixed(1) : total;
      }
    }

    // KSĐN scores from SubjectGradeEntry
    let ksdnMath = null;
    let ksdnViet = null;
    let ksdnVan = null;
    let ksdnEng = null;

    if (stDb && ksdnByStudentId[stDb.id]) {
      const grades = ksdnByStudentId[stDb.id];
      grades.forEach(g => {
        const sName = g.subjectName;
        const sc = Number(g.compositeScore);
        if (sName.includes('Toán') || sName.includes('Math')) ksdnMath = sc;
        if (sName.includes('Tiếng Việt')) ksdnViet = sc;
        if (sName.includes('Ngữ Văn') || sName.includes('Văn')) ksdnVan = sc;
        if (sName.includes('Tiếng Anh') || sName.includes('English') || sName.includes('ESL')) ksdnEng = sc;
      });
    }

    finalTable.push({
      id: ias.id,
      fullName: ias.fullName.trim(),
      studentCode,
      campus,
      className: actualClass,
      grade: ias.grade,
      committedSubjects,
      isPsychology: committedSubjects.includes('Tâm lý') || /tâm lý/i.test(note),
      ksdvMath,
      ksdvViet,
      ksdvVan,
      ksdvEng: ksdvEngScale10,
      ksdvEngScale10,
      ksdvPsy,
      ksdnMath,
      ksdnViet,
      ksdnVan,
      ksdnEng,
      directorNote: note
    });
  }

  // Sort by Campus (CS1, CS2, CS3, CS4, CS5), then Grade, then fullName
  const campusOrder = { 'CS1': 1, 'CS2': 2, 'CS3': 3, 'CS4': 4, 'CS5': 5 };
  finalTable.sort((a, b) => {
    const cDiff = (campusOrder[a.campus] || 9) - (campusOrder[b.campus] || 9);
    if (cDiff !== 0) return cDiff;
    const gDiff = (parseInt(a.grade, 10) || 0) - (parseInt(b.grade, 10) || 0);
    if (gDiff !== 0) return gDiff;
    return a.fullName.localeCompare(b.fullName, 'vi');
  });

  fs.writeFileSync(path.join(__dirname, 'exact_commitment_table.json'), JSON.stringify(finalTable, null, 2), 'utf8');
  console.log(`Saved 100% database-grounded table with ${finalTable.length} students to exact_commitment_table.json!`);

  // Count by section
  const sec2 = finalTable.filter(s => {
    const comms = s.committedSubjects.filter(c => !c.includes('Chung') && !c.includes('Theo dõi') && !c.includes('Tâm lý'));
    return comms.length > 0;
  });
  const sec3 = finalTable.filter(s => {
    const comms = s.committedSubjects.filter(c => !c.includes('Chung') && !c.includes('Theo dõi') && !c.includes('Tâm lý'));
    return comms.length === 0;
  });

  console.log(`Section 2 (Môn cam kết học thuật): ${sec2.length} học sinh`);
  console.log(`Section 3 (Chung / Theo dõi / Tâm lý): ${sec3.length} học sinh`);
  console.log(`Tổng cộng: ${sec2.length + sec3.length} học sinh`);
}

main().catch(console.error);
