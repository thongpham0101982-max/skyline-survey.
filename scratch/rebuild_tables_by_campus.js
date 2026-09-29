const fs = require('fs');
const path = require('path');

const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_report_data.json'), 'utf8'));
const dataByLevel = d.dataByLevel;

// Structure: level -> campus -> array of rows
const levels = ['Tiểu học', 'THCS', 'THPT'];
const campusList = ['CS1', 'CS2', 'CS3', 'CS4', 'CS5'];

const structured = {};

levels.forEach(lvl => {
  structured[lvl] = {};
  const lvlData = dataByLevel[lvl] || {};

  // Find all subjects
  for (const sub of Object.keys(lvlData)) {
    const subData = lvlData[sub];
    for (const grade of Object.keys(subData)) {
      const gradeData = subData[grade];
      for (const campus of Object.keys(gradeData)) {
        if (!structured[lvl][campus]) structured[lvl][campus] = [];
        const item = gradeData[campus];
        structured[lvl][campus].push({
          subject: sub,
          grade: grade,
          total: item.total,
          belowAvg: item.belowAvg,
          atBenchmark: item.atBenchmark,
          good: item.good,
          benchmark: item.benchmark
        });
      }
    }
  }
});

// Helper for sorting subjects: Toán -> Tiếng Việt -> Ngữ Văn -> Tiếng Anh -> ESL -> Maths -> Khoa học -> Tự nhiên -> Xã hội -> Khác
const subjectPriority = {
  'Toán học': 1,
  'Maths': 2,
  'Tiếng Việt': 3,
  'Ngữ Văn': 4,
  'Tiếng Anh': 5,
  'ESL': 6,
  'Vật lí': 7,
  'Hóa học': 8,
  'Sinh học': 9,
  'Lịch sử': 10,
  'Địa lí': 11,
  'GD Kinh tế & Pháp luật': 12,
  'Tin học / ICT': 13
};

function sortRows(rows) {
  return rows.sort((a, b) => {
    const pA = subjectPriority[a.subject] || 99;
    const pB = subjectPriority[b.subject] || 99;
    if (pA !== pB) return pA - pB;
    // then sort by grade
    const gA = parseInt(a.grade.replace(/\D/g, '')) || 0;
    const gB = parseInt(b.grade.replace(/\D/g, '')) || 0;
    return gA - gB;
  });
}

// Inspect results
for (const lvl of levels) {
  console.log(`\n=================== BẬC ${lvl.toUpperCase()} ===================`);
  const campuses = Object.keys(structured[lvl]).sort();
  for (const cmp of campuses) {
    const rows = sortRows(structured[lvl][cmp]);
    const totalEntries = rows.reduce((sum, r) => sum + r.total, 0);
    console.log(`  * Cơ sở ${cmp}: ${rows.length} hàng dữ liệu môn/khối | Tổng ${totalEntries} lượt thi`);
  }
}
