const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  // 1. Fetch all AssessmentSubjects
  const asubRes = await client.execute("SELECT * FROM AssessmentSubject");
  const asubMap = {};
  asubRes.rows.forEach(s => asubMap[s.id] = s);

  // 2. Fetch all StudentAssessmentScore
  const sasRes = await client.execute("SELECT * FROM StudentAssessmentScore");
  const sasByStudent = {};
  for (const r of sasRes.rows) {
    if (!sasByStudent[r.studentId]) sasByStudent[r.studentId] = [];
    const sub = asubMap[r.subjectId];
    let scoreVal = null;
    try {
      const parsed = JSON.parse(r.scores);
      if (Array.isArray(parsed)) {
        scoreVal = parsed.find(x => x !== undefined && x !== '' && x !== null);
      } else {
        scoreVal = parsed;
      }
    } catch {
      scoreVal = r.scores;
    }
    sasByStudent[r.studentId].push({
      subjectId: r.subjectId,
      subjectCode: sub?.code,
      subjectName: sub?.name,
      rawScores: r.scores,
      scoreVal: scoreVal !== null && !isNaN(Number(scoreVal)) ? Number(scoreVal) : scoreVal
    });
  }

  // 3. Fetch all KSĐN entries
  const ksdnRes = await client.execute(`
    SELECT 
      sge.id,
      sge.studentId,
      sge.subjectId,
      sge.classId,
      sge.compositeScore,
      c.className,
      c.grade,
      c.level,
      cmp.campusCode,
      cmp.campusName,
      s.subjectCode,
      s.subjectName,
      st.studentCode,
      st.studentName
    FROM SubjectGradeEntry sge
    JOIN Class c ON sge.classId = c.id
    JOIN Campus cmp ON c.campusId = cmp.id
    JOIN Subject s ON sge.subjectId = s.id
    JOIN Student st ON sge.studentId = st.id
    WHERE sge.evaluationPeriod = 'KSĐN'
      AND CAST(c.grade AS INTEGER) BETWEEN 2 AND 12
  `);

  // Map students by code and clean name
  function clean(str) {
    if (!str) return '';
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
  }

  const ksdnByCode = {};
  const ksdnByName = {};
  for (const row of ksdnRes.rows) {
    if (row.studentCode) {
      const c = row.studentCode.trim().toUpperCase();
      if (!ksdnByCode[c]) ksdnByCode[c] = [];
      ksdnByCode[c].push(row);
    }
    if (row.studentName) {
      const n = clean(row.studentName);
      if (!ksdnByName[n]) ksdnByName[n] = [];
      ksdnByName[n].push(row);
    }
  }

  // 4. InputAssessmentStudent
  const iasRes = await client.execute("SELECT * FROM InputAssessmentStudent WHERE enrollmentStatus = 'COMPLETED'");
  
  function parseCommittedSubs(r) {
    const fullText = `${r.directorNote || ''} ${r.admissionResult || ''} ${r.admissionCriteria || ''} ${r.targetType || ''}`;
    const isCommitment = /cam kết|cam ket|theo dõi|theo doi/i.test(fullText);
    if (!isCommitment) return [];

    const subs = [];
    const m = fullText.match(/(?:Môn cam kết|Mon cam ket|Cam kết|Môn kiểm tra lại):\s*\[?([^\]\r\n]+)\]?/i);
    if (m && m[1]) {
      const parts = m[1].split(/[,;]/).map(s => s.trim().toLowerCase());
      for (const p of parts) {
        if (p.includes('toán') && !subs.includes('Toán')) subs.push('Toán');
        if (p.includes('tiếng việt') && !subs.includes('Tiếng Việt')) subs.push('Tiếng Việt');
        if ((p.includes('văn') || p.includes('ngữ văn')) && !subs.includes('Ngữ Văn') && !subs.includes('Tiếng Việt')) {
          const g = parseInt(r.grade, 10);
          if (g <= 5) subs.push('Tiếng Việt');
          else subs.push('Ngữ Văn');
        }
        if ((p.includes('anh') || p.includes('english')) && !subs.includes('Tiếng Anh')) subs.push('Tiếng Anh');
        if (p.includes('tâm lý') && !subs.includes('Tâm lý')) subs.push('Tâm lý');
      }
    }
    if (subs.length === 0) {
      if (/Toán|Math/i.test(fullText)) subs.push('Toán');
      if (/Tiếng Việt|Tieng Viet/i.test(fullText)) subs.push('Tiếng Việt');
      if (/Ngữ văn|Ngu van|Văn/i.test(fullText)) {
        const g = parseInt(r.grade, 10);
        if (g <= 5) subs.push('Tiếng Việt');
        else subs.push('Ngữ Văn');
      }
      if (/Anh|English|ESL/i.test(fullText)) subs.push('Tiếng Anh');
      if (/Tâm lý|Tam ly|Psychology/i.test(fullText)) subs.push('Tâm lý');
    }
    if (subs.length === 0 && isCommitment) {
      subs.push('Chung / Theo dõi');
    }
    return subs;
  }

  const finalCommitmentList = [];

  for (const r of iasRes.rows) {
    const subs = parseCommittedSubs(r);
    if (subs.length === 0) continue;

    // Get entrance scores
    const entranceScores = sasByStudent[r.id] || [];
    let ksdvMath = r.mathScore;
    let ksdvViet = r.literatureScore;
    let ksdvVan = r.literatureScore;
    let ksdvEng = r.totalEnglishScore || r.writtenEnglishScore || r.oralEnglishScore;
    let ksdvPsy = r.psychologyScore;

    for (const sc of entranceScores) {
      const code = (sc.subjectCode || '').toUpperCase();
      const sname = (sc.subjectName || '').toLowerCase();
      if (code === 'TOA' || sname.includes('toán')) ksdvMath = sc.scoreVal;
      else if (code === 'TVI' || sname.includes('tiếng việt')) ksdvViet = sc.scoreVal;
      else if (code === 'NVA' || sname.includes('ngữ văn')) ksdvVan = sc.scoreVal;
      else if (code === 'TA' || code === 'TAV' || code === 'TAVD' || code === 'EPT' || sname.includes('anh')) {
        if (!ksdvEng) ksdvEng = sc.scoreVal;
      } else if (code === 'TLY' || sname.includes('tâm lý')) {
        ksdvPsy = sc.scoreVal || 'Đã khảo sát';
      }
    }

    // Match with KSĐN entries
    const code = (r.studentCode || r.enrollmentCode || '').trim().toUpperCase();
    const nameNorm = clean(r.fullName);
    let matchedKsdn = [];
    if (code && ksdnByCode[code]) matchedKsdn = ksdnByCode[code];
    else if (nameNorm && ksdnByName[nameNorm]) matchedKsdn = ksdnByName[nameNorm];

    const cls = matchedKsdn[0]?.className || r.className || 'Chưa rõ';
    const campus = matchedKsdn[0]?.campusCode || r.admissionCampus || r.registeredCampus || 'CS1';

    // Build specific score map for Toán, Tiếng Việt, Tiếng Anh, Ngữ Văn
    let ksdnMath = null, ksdnViet = null, ksdnVan = null, ksdnEng = null;
    for (const e of matchedKsdn) {
      const sname = (e.subjectName || '').toLowerCase();
      const scode = (e.subjectCode || '').toUpperCase();
      if (scode === 'TOA' || sname.includes('toán')) ksdnMath = e.compositeScore;
      else if (scode === 'TVI' || sname.includes('tiếng việt')) ksdnViet = e.compositeScore;
      else if (scode === 'NVA' || sname.includes('ngữ văn') || (sname.includes('văn') && !sname.includes('tiếng việt'))) ksdnVan = e.compositeScore;
      else if (scode === 'TA' || scode === 'ESL' || sname.includes('anh')) ksdnEng = e.compositeScore;
    }

    finalCommitmentList.push({
      id: r.id,
      fullName: r.fullName,
      studentCode: r.studentCode || r.enrollmentCode,
      campus,
      className: cls,
      grade: r.grade,
      committedSubjects: subs,
      isPsychology: subs.includes('Tâm lý'),
      ksdvMath,
      ksdvViet,
      ksdvVan,
      ksdvEng,
      ksdvPsy,
      ksdnMath,
      ksdnViet,
      ksdnVan,
      ksdnEng,
      directorNote: r.directorNote
    });
  }

  console.log('Final committed enrolled list length:', finalCommitmentList.length);

  fs.writeFileSync(path.resolve(__dirname, 'exact_commitment_table.json'), JSON.stringify(finalCommitmentList, null, 2));
  console.log('Saved exact_commitment_table.json');
}

main().catch(console.error);
