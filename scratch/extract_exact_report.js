const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  console.log('--- 1. BENCHMARKS ---');
  let benchmarks = [];
  try {
    const bmRes = await client.execute("SELECT * FROM SubjectBenchmarkConfig");
    benchmarks = bmRes.rows;
    console.log('Benchmarks count:', benchmarks.length);
  } catch (e) {
    console.log('Benchmark error:', e.message);
  }

  // Helper benchmark function
  function getBenchmark(level, grade, subjectId) {
    const isPrimary = level === 'Tiểu học' || ['2','3','4','5'].includes(String(grade));
    const defaultScore = isPrimary ? 7.0 : 6.0;
    // Check specific
    const m = benchmarks.find(b => b.grade === String(grade) && b.subjectId === subjectId);
    if (m) return m.benchmarkScore;
    const m2 = benchmarks.find(b => b.grade === String(grade) && (!b.subjectId || b.subjectId === 'ALL'));
    if (m2) return m2.benchmarkScore;
    return defaultScore;
  }

  console.log('--- 2. KHẢO SÁT ĐẦU NĂM (KSĐN) SCORES ---');
  // Query all SubjectGradeEntry for KSĐN with class and campus info
  const entriesRes = await client.execute(`
    SELECT 
      sge.id,
      sge.studentId,
      sge.subjectId,
      sge.classId,
      sge.compositeScore,
      sge.componentScores,
      c.className,
      c.grade,
      c.level,
      cmp.id as campusId,
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

  console.log('Total KSĐN entries (Khối 2-12):', entriesRes.rows.length);

  // Group by level -> subject -> grade -> campus
  const levelOrder = ['Tiểu học', 'THCS', 'THPT'];
  const dataByLevel = {
    'Tiểu học': {},
    'THCS': {},
    'THPT': {}
  };

  const allDistinctStudents = new Set();
  const studentsByLevel = {
    'Tiểu học': new Set(),
    'THCS': new Set(),
    'THPT': new Set()
  };

  for (const row of entriesRes.rows) {
    const gradeNum = parseInt(row.grade, 10);
    let level = 'Tiểu học';
    if (gradeNum >= 6 && gradeNum <= 9) level = 'THCS';
    else if (gradeNum >= 10 && gradeNum <= 12) level = 'THPT';

    allDistinctStudents.add(row.studentId);
    studentsByLevel[level].add(row.studentId);

    const subName = row.subjectName;
    const gradeStr = 'Khối ' + gradeNum;
    const campus = row.campusCode || row.campusName;

    if (!dataByLevel[level][subName]) dataByLevel[level][subName] = {};
    if (!dataByLevel[level][subName][gradeStr]) dataByLevel[level][subName][gradeStr] = {};
    if (!dataByLevel[level][subName][gradeStr][campus]) {
      dataByLevel[level][subName][gradeStr][campus] = {
        total: 0,
        belowAvg: 0,
        atBenchmark: 0,
        good: 0,
        benchmark: getBenchmark(level, gradeNum, row.subjectId)
      };
    }

    const stat = dataByLevel[level][subName][gradeStr][campus];
    stat.total++;

    const score = Number(row.compositeScore);
    if (!isNaN(score)) {
      if (score < 5.0) stat.belowAvg++;
      if (score >= stat.benchmark) stat.atBenchmark++;
      if (score >= 8.0 && score <= 10.0) stat.good++;
    }
  }

  console.log('Distinct students total (Khối 2-12):', allDistinctStudents.size);
  console.log('Tiểu học students:', studentsByLevel['Tiểu học'].size);
  console.log('THCS students:', studentsByLevel['THCS'].size);
  console.log('THPT students:', studentsByLevel['THPT'].size);

  console.log('--- 3. HỌC SINH TUYỂN MỚI & CAM KẾT ĐẦU VÀO (CKĐV) ---');
  // Check InputAssessmentStudent
  const iasAll = await client.execute(`
    SELECT * FROM InputAssessmentStudent
  `);
  console.log('Total InputAssessmentStudent records:', iasAll.rows.length);

  const completedEnroll = iasAll.rows.filter(r => r.enrollmentStatus === 'COMPLETED');
  console.log('Total completed enrolled new students:', completedEnroll.length);

  // Group enrolled by campus
  const enrollByCampus = {};
  for (const r of completedEnroll) {
    const cmp = r.admissionCampus || r.registeredCampus || 'Khác';
    if (!enrollByCampus[cmp]) enrollByCampus[cmp] = 0;
    enrollByCampus[cmp]++;
  }
  console.log('Enrolled by campus:', enrollByCampus);

  // Check committed students
  function parseCommittedSubs(r) {
    const fullText = `${r.directorNote || ''} ${r.admissionResult || ''} ${r.admissionCriteria || ''} ${r.targetType || ''}`;
    const isCommitment = /cam kết|cam ket|theo dõi|theo doi/i.test(fullText);
    if (!isCommitment) return [];

    const subs = [];
    if (/Toán|Math/i.test(fullText)) subs.push('Toán');
    if (/Tiếng Việt|Tieng Viet/i.test(fullText)) subs.push('Tiếng Việt');
    if (/Ngữ văn|Ngu van|Văn/i.test(fullText)) {
      const g = parseInt(r.grade, 10);
      if (g <= 5) subs.push('Tiếng Việt');
      else subs.push('Ngữ Văn');
    }
    if (/Anh|English|ESL/i.test(fullText)) subs.push('Tiếng Anh');
    if (/Tâm lý|Tam ly|Psychology/i.test(fullText)) subs.push('Tâm lý');

    // Also regex for "Môn cam kết: [X, Y]"
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
    if (subs.length === 0 && isCommitment) {
      // If marked commitment but no specific subject mentioned
      subs.push('Chung / Theo dõi');
    }
    return subs;
  }

  // Filter completed enroll with commitment
  const committedEnrolled = completedEnroll.filter(r => {
    const subs = parseCommittedSubs(r);
    return subs.length > 0;
  });
  console.log('Total committed enrolled students:', committedEnrolled.length);

  // Map each committed enrolled student to their KSĐN score in SubjectGradeEntry
  // Match student by studentCode or fullName
  const studentMap = {};
  for (const s of entriesRes.rows) {
    if (s.studentCode) studentMap[s.studentCode.trim().toUpperCase()] = s;
    if (s.studentName) {
      const norm = s.studentName.trim().toLowerCase();
      if (!studentMap[norm]) studentMap[norm] = [];
      studentMap[norm].push(s);
    }
  }

  // Collect mapped student details
  const mappedList = [];
  for (const r of committedEnrolled) {
    const subs = parseCommittedSubs(r);
    const code = (r.studentCode || r.enrollmentCode || '').trim().toUpperCase();
    const nameNorm = (r.fullName || '').trim().toLowerCase();

    // Find entries in KSĐN for this student
    let entries = [];
    if (code && studentMap[code]) {
      // Find all entries for this studentId
      const stId = studentMap[code].studentId;
      entries = entriesRes.rows.filter(e => e.studentId === stId);
    } else if (nameNorm && studentMap[nameNorm]) {
      const matched = studentMap[nameNorm][0];
      if (matched) {
        entries = entriesRes.rows.filter(e => e.studentId === matched.studentId);
      }
    }

    const clsName = entries[0]?.className || r.className || 'Chưa rõ';
    const campus = entries[0]?.campusCode || r.admissionCampus || r.registeredCampus || 'CS1';

    mappedList.push({
      id: r.id,
      studentCode: r.studentCode || r.enrollmentCode,
      fullName: r.fullName,
      campus,
      className: clsName,
      grade: r.grade,
      committedSubjects: subs,
      directorNote: r.directorNote,
      admissionResult: r.admissionResult,
      // KSĐV scores
      ksdvMath: r.mathScore,
      ksdvViet: r.literatureScore,
      ksdvVan: r.literatureScore,
      ksdvEng: r.totalEnglishScore || r.writtenEnglishScore || r.oralEnglishScore,
      ksdvPsychology: r.psychologyScore,
      // KSĐN entries
      ksdnEntries: entries.map(e => ({
        subjectName: e.subjectName,
        subjectCode: e.subjectCode,
        compositeScore: e.compositeScore
      }))
    });
  }

  // Write all calculated data to json
  const outPath = path.resolve(__dirname, 'exact_report_data.json');
  fs.writeFileSync(outPath, JSON.stringify({
    summary: {
      totalKSDNStudents: allDistinctStudents.size,
      studentsByLevel: {
        'Tiểu học': studentsByLevel['Tiểu học'].size,
        'THCS': studentsByLevel['THCS'].size,
        'THPT': studentsByLevel['THPT'].size
      },
      totalNewRegistered: iasAll.rows.length,
      totalNewEnrolled: completedEnroll.length,
      totalCommittedEnrolled: committedEnrolled.length,
      enrollByCampus
    },
    dataByLevel,
    mappedList
  }, null, 2));

  console.log('Saved exact report data to', outPath);
}

main().catch(console.error);
