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
      AND c.grade = '12'
      AND s.subjectName NOT IN ('Toán học', 'Ngữ Văn', 'Tiếng Anh', 'ESL')
    GROUP BY cmp.campusCode, s.subjectName
    ORDER BY cmp.campusCode, s.subjectName
  `);

  console.log('=== REAL DATABASE KSĐN ELECTIVE EXAMS KHỐI 12 ===');
  let grandTotal = 0;
  res.rows.forEach(r => {
    grandTotal += r.total;
    console.log(`[${r.campusCode}] ${r.subjectName}: total=${r.total}, below=${r.belowAvg}, atBenchmark=${r.atBenchmark}, good=${r.good}`);
  });
  console.log('Grand total electives Khối 12:', grandTotal);
}

main().catch(console.error);
