const { createClient } = require('@libsql/client');
const path = require('path');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  const res = await client.execute(`
    SELECT 
      cmp.campusCode,
      s.subjectName,
      c.grade,
      COUNT(*) as total,
      SUM(CASE WHEN sge.compositeScore < 5.0 THEN 1 ELSE 0 END) as belowAvg,
      SUM(CASE WHEN sge.compositeScore >= 5.0 THEN 1 ELSE 0 END) as atBenchmark,
      SUM(CASE WHEN sge.compositeScore >= 8.0 THEN 1 ELSE 0 END) as good
    FROM SubjectGradeEntry sge
    JOIN Class c ON sge.classId = c.id
    JOIN Campus cmp ON c.campusId = cmp.id
    JOIN Subject s ON sge.subjectId = s.id
    WHERE sge.evaluationPeriod = 'KSĐN'
      AND CAST(c.grade AS INTEGER) >= 10
    GROUP BY cmp.campusCode, s.subjectName, c.grade
    ORDER BY cmp.campusCode, s.subjectName, CAST(c.grade AS INTEGER)
  `);

  console.log('=== THPT EXACT BENCHMARK >= 5.0 AUDIT ===');
  let grandTotal = 0, grandBelow = 0, grandBench = 0, grandGood = 0;
  
  const byCampus = {};

  res.rows.forEach(r => {
    grandTotal += r.total;
    grandBelow += r.belowAvg;
    grandBench += r.atBenchmark;
    grandGood += r.good;

    if (!byCampus[r.campusCode]) byCampus[r.campusCode] = { total: 0, below: 0, bench: 0, good: 0 };
    byCampus[r.campusCode].total += r.total;
    byCampus[r.campusCode].below += r.belowAvg;
    byCampus[r.campusCode].bench += r.atBenchmark;
    byCampus[r.campusCode].good += r.good;
  });

  console.log('Campus Totals:');
  Object.keys(byCampus).sort().forEach(c => {
    const d = byCampus[c];
    console.log(`[${c}]: Total=${d.total}, Below=${d.below} (${((d.below/d.total)*100).toFixed(1)}%), Bench=${d.bench} (${((d.bench/d.total)*100).toFixed(1)}%), Good=${d.good} (${((d.good/d.total)*100).toFixed(1)}%)`);
  });

  console.log(`\nGRAND TOTAL THPT: Total=${grandTotal}, Below=${grandBelow} (${((grandBelow/grandTotal)*100).toFixed(1)}%), Bench=${grandBench} (${((grandBench/grandTotal)*100).toFixed(1)}%), Good=${grandGood} (${((grandGood/grandTotal)*100).toFixed(1)}%)`);
}

main().catch(console.error);
