const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  console.log('--- RECALCULATING EXACT REPORT DATA FROM LOCAL.DB ---');

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

  console.log('Total entries:', entriesRes.rows.length);

  const dataByLevel = {
    'Tiểu học': {},
    'THCS': {},
    'THPT': {}
  };

  const totalsByLevel = {
    'Tiểu học': { total: 0, belowAvg: 0, atBenchmark: 0, good: 0 },
    'THCS': { total: 0, belowAvg: 0, atBenchmark: 0, good: 0 },
    'THPT': { total: 0, belowAvg: 0, atBenchmark: 0, good: 0 }
  };

  for (const row of entriesRes.rows) {
    const gradeNum = parseInt(row.grade, 10);
    let level = 'Tiểu học';
    let benchThreshold = 7.0; // Tiểu học: >= 7.0

    if (gradeNum >= 6 && gradeNum <= 9) {
      level = 'THCS';
      benchThreshold = 5.0; // THCS: >= 5.0
    } else if (gradeNum >= 10 && gradeNum <= 12) {
      level = 'THPT';
      benchThreshold = 5.0; // THPT: >= 5.0
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
        benchmark: benchThreshold
      };
    }

    const stat = dataByLevel[level][subName][gradeStr][campus];
    stat.total++;
    totalsByLevel[level].total++;

    const score = parseFloat(row.compositeScore);
    if (!isNaN(score)) {
      if (score < 5.0) {
        stat.belowAvg++;
        totalsByLevel[level].belowAvg++;
      }
      if (score >= benchThreshold) {
        stat.atBenchmark++;
        totalsByLevel[level].atBenchmark++;
      }
      if (score >= 8.0 && score <= 10.0) {
        stat.good++;
        totalsByLevel[level].good++;
      }
    }
  }

  console.log('Totals by Level:');
  console.log(totalsByLevel);

  // Load existing reportData to keep other metadata if any
  const existing = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_report_data.json'), 'utf8'));
  existing.dataByLevel = dataByLevel;
  existing.totalsByLevel = totalsByLevel;

  fs.writeFileSync(path.join(__dirname, 'exact_report_data.json'), JSON.stringify(existing, null, 2), 'utf8');
  console.log('Successfully updated exact_report_data.json with exact benchmarks (Primary >= 7.0, Secondary/High >= 5.0)!');
}

main().catch(console.error);
