const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  console.log('--- Recalculating with exact benchmark: Tiểu học >= 7.0, THCS/THPT >= 5.0 ---');

  const entriesRes = await client.execute(`
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

  const dataByLevel = {
    'Tiểu học': {},
    'THCS': {},
    'THPT': {}
  };

  for (const row of entriesRes.rows) {
    const gradeNum = parseInt(row.grade, 10);
    let level = 'Tiểu học';
    let benchThreshold = 7.0; // Chuẩn Tiểu học: Toán, Tiếng Việt, Tiếng Anh từ 7 trở lên

    if (gradeNum >= 6 && gradeNum <= 9) {
      level = 'THCS';
      benchThreshold = 5.0; // THCS chuẩn là 5.0
    } else if (gradeNum >= 10 && gradeNum <= 12) {
      level = 'THPT';
      benchThreshold = 5.0; // THPT chuẩn là 5.0
    }

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
        benchThreshold
      };
    }

    const stat = dataByLevel[level][subName][gradeStr][campus];
    stat.total++;

    const score = Number(row.compositeScore);
    if (!isNaN(score)) {
      if (score < 5.0) stat.belowAvg++;
      if (score >= benchThreshold) stat.atBenchmark++;
      if (score >= 8.0 && score <= 10.0) stat.good++;
    }
  }

  // Load commitments from exact_commitment_table.json
  const commitments = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'exact_commitment_table.json'), 'utf8'));

  // Generate markdown tables
  function generateLevelMarkdown(levelName, benchDesc) {
    const subs = dataByLevel[levelName];
    let md = `### BẬC ${levelName.toUpperCase()} (Quy chuẩn Đạt chuẩn: ${benchDesc})\n\n`;
    md += `| STT | Môn | Khối | Cơ sở | Số HS khảo sát | Số HS < 5.0 (Dưới TB) | Tỷ lệ < 5.0 | Số HS Đạt chuẩn (${benchDesc}) | Tỷ lệ Đạt chuẩn | Số HS Giỏi (8-10) | Tỷ lệ Giỏi |\n`;
    md += `| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

    let stt = 1;
    let levelTotal = 0, levelBelow = 0, levelBench = 0, levelGood = 0;

    for (const subName of Object.keys(subs)) {
      let subTotal = 0, subBelow = 0, subBench = 0, subGood = 0;

      for (const gradeStr of Object.keys(subs[subName])) {
        const campuses = subs[subName][gradeStr];
        for (const cmp of Object.keys(campuses)) {
          const s = campuses[cmp];
          subTotal += s.total;
          subBelow += s.belowAvg;
          subBench += s.atBenchmark;
          subGood += s.good;

          const belowPct = s.total > 0 ? ((s.belowAvg / s.total) * 100).toFixed(1) + '%' : '0.0%';
          const benchPct = s.total > 0 ? ((s.atBenchmark / s.total) * 100).toFixed(1) + '%' : '0.0%';
          const goodPct = s.total > 0 ? ((s.good / s.total) * 100).toFixed(1) + '%' : '0.0%';

          md += `| ${stt++} | ${subName} | ${gradeStr} | ${cmp} | ${s.total} | ${s.belowAvg} | ${belowPct} | ${s.atBenchmark} | ${benchPct} | ${s.good} | ${goodPct} |\n`;
        }
      }

      levelTotal += subTotal;
      levelBelow += subBelow;
      levelBench += subBench;
      levelGood += subGood;

      const subBelowPct = subTotal > 0 ? ((subBelow / subTotal) * 100).toFixed(1) + '%' : '0.0%';
      const subBenchPct = subTotal > 0 ? ((subBench / subTotal) * 100).toFixed(1) + '%' : '0.0%';
      const subGoodPct = subTotal > 0 ? ((subGood / subTotal) * 100).toFixed(1) + '%' : '0.0%';

      md += `| **-** | **${subName}** | **Toàn khối** | **TỔNG CƠ SỞ** | **${subTotal}** | **${subBelow}** | **${subBelowPct}** | **${subBench}** | **${subBenchPct}** | **${subGood}** | **${subGoodPct}** |\n`;
    }

    const levBelowPct = levelTotal > 0 ? ((levelBelow / levelTotal) * 100).toFixed(1) + '%' : '0.0%';
    const levBenchPct = levelTotal > 0 ? ((levelBench / levelTotal) * 100).toFixed(1) + '%' : '0.0%';
    const levGoodPct = levelTotal > 0 ? ((levelGood / levelTotal) * 100).toFixed(1) + '%' : '0.0%';

    md += `| **TỔNG** | **BẬC ${levelName.toUpperCase()}** | **TOÀN BẬC** | **TỔNG HỆ THỐNG** | **${levelTotal}** | **${levelBelow}** | **${levBelowPct}** | **${levelBench}** | **${levBenchPct}** | **${levelGood}** | **${levGoodPct}** |\n\n`;

    return md;
  }

  const thMd = generateLevelMarkdown('Tiểu học', '≥ 7.0');
  const thcsMd = generateLevelMarkdown('THCS', '≥ 5.0');
  const thptMd = generateLevelMarkdown('THPT', '≥ 5.0');

  fs.writeFileSync(path.resolve(__dirname, 'exact_tables_updated_benchmark.md'), `${thMd}\n\n${thcsMd}\n\n${thptMd}`);
  console.log('Saved exact_tables_updated_benchmark.md');
}

main().catch(console.error);
