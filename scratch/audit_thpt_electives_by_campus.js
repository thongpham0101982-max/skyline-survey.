const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  console.log('=== AUDITING ALL THPT SUBJECTS IN KSĐN ===\n');

  // Query ALL KSĐN entries for high school (grades 10, 11, 12)
  const res = await client.execute(`
    SELECT 
      cmp.campusCode,
      cmp.campusName,
      c.className,
      c.grade,
      s.subjectCode,
      s.subjectName,
      sge.compositeScore,
      sge.componentScores,
      st.studentCode,
      st.studentName
    FROM SubjectGradeEntry sge
    JOIN Class c ON sge.classId = c.id
    JOIN Campus cmp ON c.campusId = cmp.id
    JOIN Subject s ON sge.subjectId = s.id
    JOIN Student st ON sge.studentId = st.id
    WHERE sge.evaluationPeriod = 'KSĐN'
      AND CAST(c.grade AS INTEGER) >= 10
    ORDER BY cmp.campusCode, CAST(c.grade AS INTEGER), s.subjectName
  `);

  console.log(`Total THPT entries found: ${res.rows.length}`);

  // Group by Campus -> Subject -> Grade
  const byCampus = {};
  const electivesByCampus = {};

  res.rows.forEach(r => {
    const cmp = r.campusCode || 'Chưa rõ';
    const sub = r.subjectName;
    const grade = 'Khối ' + r.grade;
    const isCore = ['Toán học', 'Ngữ Văn', 'Tiếng Anh', 'ESL'].includes(sub);

    if (!byCampus[cmp]) byCampus[cmp] = {};
    if (!byCampus[cmp][sub]) byCampus[cmp][sub] = {};
    if (!byCampus[cmp][sub][grade]) {
      byCampus[cmp][sub][grade] = {
        total: 0,
        belowAvg: 0,
        atBenchmark: 0,
        good: 0,
        scores: []
      };
    }

    const item = byCampus[cmp][sub][grade];
    item.total++;
    const score = parseFloat(r.compositeScore);
    item.scores.push(score);
    if (!isNaN(score)) {
      if (score < 5.0) item.belowAvg++;
      if (score >= 5.0) item.atBenchmark++;
      if (score >= 8.0) item.good++;
    }

    if (!isCore) {
      if (!electivesByCampus[cmp]) electivesByCampus[cmp] = {};
      if (!electivesByCampus[cmp][sub]) electivesByCampus[cmp][sub] = {};
      if (!electivesByCampus[cmp][sub][grade]) {
        electivesByCampus[cmp][sub][grade] = {
          total: 0,
          belowAvg: 0,
          atBenchmark: 0,
          good: 0,
          scores: []
        };
      }
      const eItem = electivesByCampus[cmp][sub][grade];
      eItem.total++;
      if (!isNaN(score)) {
        if (score < 5.0) eItem.belowAvg++;
        if (score >= 5.0) eItem.atBenchmark++;
        if (score >= 8.0) eItem.good++;
      }
    }
  });

  console.log('\n=== 1. ALL THPT SUBJECTS BY CAMPUS ===');
  Object.keys(byCampus).sort().forEach(cmp => {
    console.log(`\n>>> CƠ SỞ: ${cmp}`);
    let cTotal = 0;
    Object.keys(byCampus[cmp]).sort().forEach(sub => {
      Object.keys(byCampus[cmp][sub]).sort().forEach(gr => {
        const d = byCampus[cmp][sub][gr];
        cTotal += d.total;
        const isElective = !['Toán học', 'Ngữ Văn', 'Tiếng Anh', 'ESL'].includes(sub);
        console.log(`  ${isElective ? '[TỰ CHỌN] ' : '[CHUNG]   '} ${sub} (${gr}): Sĩ số=${d.total} | < 5.0: ${d.belowAvg} (${((d.belowAvg/d.total)*100).toFixed(1)}%) | ≥ 5.0: ${d.atBenchmark} (${((d.atBenchmark/d.total)*100).toFixed(1)}%) | Giỏi: ${d.good} (${((d.good/d.total)*100).toFixed(1)}%)`);
      });
    });
    console.log(`  ==> TỔNG CƠ SỞ ${cmp}: ${cTotal} bài thi`);
  });

  console.log('\n=== 2. SUMMARY OF ELECTIVES ONLY (NGOÀI TOÁN - VĂN - ANH/ESL) ===');
  let grandElectivesTotal = 0;
  Object.keys(electivesByCampus).sort().forEach(cmp => {
    console.log(`\nCơ sở ${cmp}:`);
    let cmpElectives = 0;
    Object.keys(electivesByCampus[cmp]).sort().forEach(sub => {
      Object.keys(electivesByCampus[cmp][sub]).sort().forEach(gr => {
        const d = electivesByCampus[cmp][sub][gr];
        cmpElectives += d.total;
        grandElectivesTotal += d.total;
        console.log(`  - ${sub} (${gr}): ${d.total} bài (Dưới TB: ${d.belowAvg}, Đạt: ${d.atBenchmark}, Giỏi: ${d.good})`);
      });
    });
    console.log(`  => Tổng môn tự chọn ${cmp}: ${cmpElectives} bài thi`);
  });
  console.log(`\n===> TỔNG CỘNG MÔN TỰ CHỌN THPT TOÀN HỆ THỐNG: ${grandElectivesTotal} bài thi`);

  fs.writeFileSync(path.join(__dirname, 'thpt_electives_audit.json'), JSON.stringify({ byCampus, electivesByCampus }, null, 2), 'utf8');
}

main().catch(console.error);
