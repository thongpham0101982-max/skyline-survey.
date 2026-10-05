const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  console.log('--- EXTRACTING ALL DATA DIRECTLY FROM TURSO CLOUD ---');

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

  console.log(`Total KSĐN entries (Khối 2-12): ${entriesRes.rows.length}`);

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

  const allDistinctStudents = new Set();
  const studentsByLevel = {
    'Tiểu học': new Set(),
    'THCS': new Set(),
    'THPT': new Set()
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

  console.log(`Distinct students total: ${allDistinctStudents.size}`);
  console.log('Students by level:', {
    'Tiểu học': studentsByLevel['Tiểu học'].size,
    'THCS': studentsByLevel['THCS'].size,
    'THPT': studentsByLevel['THPT'].size
  });
  console.log('Totals by Level:', totalsByLevel);

  // Load existing exact_report_data.json
  const existingPath = path.join(__dirname, 'exact_report_data.json');
  const existing = JSON.parse(fs.readFileSync(existingPath, 'utf8'));

  existing.summary.totalKSDNStudents = allDistinctStudents.size;
  existing.summary.studentsByLevel = {
    'Tiểu học': studentsByLevel['Tiểu học'].size,
    'THCS': studentsByLevel['THCS'].size,
    'THPT': studentsByLevel['THPT'].size
  };
  existing.dataByLevel = dataByLevel;
  existing.totalsByLevel = totalsByLevel;

  fs.writeFileSync(existingPath, JSON.stringify(existing, null, 2), 'utf8');
  console.log('Successfully updated exact_report_data.json with live Turso Cloud data!');
}

main().catch(console.error);
