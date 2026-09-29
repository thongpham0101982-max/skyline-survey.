const { createClient } = require('@libsql/client');
const path = require('path');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  const res = await client.execute(`
    SELECT 
      s.id as subjectId,
      s.subjectName,
      s.subjectCode,
      c.grade,
      cmp.campusCode,
      COUNT(sge.id) as totalEntries,
      SUM(CASE WHEN sge.compositeScore < 5.0 THEN 1 ELSE 0 END) as belowAvg,
      SUM(CASE WHEN sge.compositeScore >= 5.0 THEN 1 ELSE 0 END) as atBenchmark,
      SUM(CASE WHEN sge.compositeScore >= 8.0 THEN 1 ELSE 0 END) as goodScore,
      AVG(sge.compositeScore) as avgScore
    FROM SubjectGradeEntry sge
    JOIN Class c ON sge.classId = c.id
    JOIN Campus cmp ON c.campusId = cmp.id
    JOIN Subject s ON sge.subjectId = s.id
    WHERE sge.evaluationPeriod = 'KSĐN'
      AND CAST(c.grade AS INTEGER) >= 10
    GROUP BY s.id, c.grade, cmp.campusCode
    ORDER BY cmp.campusCode, CAST(c.grade AS INTEGER), s.subjectName
  `);

  console.log("Total THPT subject/grade/campus combinations:", res.rows.length);
  
  // Group by Campus
  const byCampus = {};
  res.rows.forEach(r => {
    const cmp = r.campusCode || 'Khác';
    if (!byCampus[cmp]) byCampus[cmp] = [];
    byCampus[cmp].push(r);
  });

  for (const cmp of Object.keys(byCampus).sort()) {
    console.log(`\n================ CƠ SỞ ${cmp} (THPT) ================`);
    byCampus[cmp].forEach(r => {
      const pctBelow = ((r.belowAvg / r.totalEntries) * 100).toFixed(1);
      const pctPass = ((r.atBenchmark / r.totalEntries) * 100).toFixed(1);
      const pctGood = ((r.goodScore / r.totalEntries) * 100).toFixed(1);
      console.log(`  Khối ${r.grade} | Môn: ${r.subjectName.padEnd(25)} (${r.subjectCode}) | Tổng: ${String(r.totalEntries).padStart(3)} | <5: ${String(r.belowAvg).padStart(2)} (${pctBelow}%) | ≥5: ${String(r.atBenchmark).padStart(2)} (${pctPass}%) | 8-10: ${String(r.goodScore).padStart(2)} (${pctGood}%)`);
    });
  }
}

main().catch(console.error);
