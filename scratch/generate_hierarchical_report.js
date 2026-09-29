const fs = require('fs');
const path = require('path');

const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_report_data.json'), 'utf8'));
const dataByLevel = d.dataByLevel;

const levels = [
  { key: 'Tiểu học', title: '3.1. BẬC TIỂU HỌC (Chuẩn Đạt: Toán, Tiếng Việt, Tiếng Anh từ 7.0 trở lên)', benchmarkText: 'Điểm Chuẩn (≥ 7.0)' },
  { key: 'THCS', title: '3.2. BẬC THCS (Chuẩn Đạt: Các môn từ 5.0 trở lên)', benchmarkText: 'Điểm Chuẩn (≥ 5.0)' },
  { key: 'THPT', title: '3.3. BẬC THPT (Chuẩn Đạt: Các môn từ 5.0 trở lên)', benchmarkText: 'Điểm Chuẩn (≥ 5.0)' }
];

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
    const gA = parseInt(a.grade.replace(/\D/g, '')) || 0;
    const gB = parseInt(b.grade.replace(/\D/g, '')) || 0;
    return gA - gB;
  });
}

function pct(num, den) {
  if (!den || den === 0) return '0.0%';
  return ((num / den) * 100).toFixed(1) + '%';
}

let mdOutput = '## PHẦN 3: BÁO CÁO THỐNG KÊ CHI TIẾT TÁCH RIÊNG THEO BẬC HỌC & CƠ SỞ\n\n';

levels.forEach(lvlObj => {
  const lvl = lvlObj.key;
  const lvlData = dataByLevel[lvl] || {};

  // Group by campus
  const campusMap = {};
  for (const sub of Object.keys(lvlData)) {
    for (const grade of Object.keys(lvlData[sub])) {
      for (const campus of Object.keys(lvlData[sub][grade])) {
        if (!campusMap[campus]) campusMap[campus] = [];
        const item = lvlData[sub][grade][campus];
        campusMap[campus].push({
          subject: sub,
          grade: grade,
          total: item.total,
          belowAvg: item.belowAvg,
          atBenchmark: item.atBenchmark,
          good: item.good
        });
      }
    }
  }

  mdOutput += `### ${lvlObj.title}\n\n`;

  let lvlTotal = 0;
  let lvlBelow = 0;
  let lvlBench = 0;
  let lvlGood = 0;

  const sortedCampuses = Object.keys(campusMap).sort();

  sortedCampuses.forEach(cmp => {
    const rows = sortRows(campusMap[cmp]);
    const cmpTotal = rows.reduce((s, r) => s + r.total, 0);
    const cmpBelow = rows.reduce((s, r) => s + r.belowAvg, 0);
    const cmpBench = rows.reduce((s, r) => s + r.atBenchmark, 0);
    const cmpGood = rows.reduce((s, r) => s + r.good, 0);

    lvlTotal += cmpTotal;
    lvlBelow += cmpBelow;
    lvlBench += cmpBench;
    lvlGood += cmpGood;

    mdOutput += `#### Cơ sở ${cmp} - Bậc ${lvl} (Tổng: ${cmpTotal.toLocaleString('vi-VN')} bài thi)\n\n`;
    mdOutput += `| STT | Môn | Khối | Số HS khảo sát | Điểm dưới TB (< 5.0) | Tỷ lệ < 5.0 | ${lvlObj.benchmarkText} | Tỷ lệ Đạt chuẩn | Điểm 8 đến 10 (Giỏi) | Tỷ lệ Giỏi |\n`;
    mdOutput += `| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

    rows.forEach((r, idx) => {
      mdOutput += `| ${idx + 1} | ${r.subject} | ${r.grade} | ${r.total} | ${r.belowAvg} | ${pct(r.belowAvg, r.total)} | ${r.atBenchmark} | ${pct(r.atBenchmark, r.total)} | ${r.good} | ${pct(r.good, r.total)} |\n`;
    });

    // Campus Total Row
    mdOutput += `| **-** | **TỔNG CƠ SỞ ${cmp}** | **Toàn khối** | **${cmpTotal.toLocaleString('vi-VN')}** | **${cmpBelow.toLocaleString('vi-VN')}** | **${pct(cmpBelow, cmpTotal)}** | **${cmpBench.toLocaleString('vi-VN')}** | **${pct(cmpBench, cmpTotal)}** | **${cmpGood.toLocaleString('vi-VN')}** | **${pct(cmpGood, cmpTotal)}** |\n\n`;
  });

  // Level Grand Total
  mdOutput += `> [!NOTE]\n`;
  mdOutput += `> **TỔNG KẾT TOÀN BẬC ${lvl.toUpperCase()} (TẤT CẢ CƠ SỞ):**\n`;
  mdOutput += `> * Tổng lượt bài thi: **${lvlTotal.toLocaleString('vi-VN')} lượt**\n`;
  mdOutput += `> * Đạt chuẩn: **${lvlBench.toLocaleString('vi-VN')} bài** (**${pct(lvlBench, lvlTotal)}**)\n`;
  mdOutput += `> * Dưới trung bình: **${lvlBelow.toLocaleString('vi-VN')} bài** (**${pct(lvlBelow, lvlTotal)}**)\n`;
  mdOutput += `> * Đạt Giỏi (8-10): **${lvlGood.toLocaleString('vi-VN')} bài** (**${pct(lvlGood, lvlTotal)}**)\n\n`;
  mdOutput += `---\n\n`;
});

const outMdSnippetPath = path.join(__dirname, 'section3_separated_by_campus.md');
fs.writeFileSync(outMdSnippetPath, mdOutput, 'utf8');
console.log("Successfully generated Section 3 separated by Level and Campus to:", outMdSnippetPath);
