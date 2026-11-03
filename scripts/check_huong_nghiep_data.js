const xlsx = require('xlsx');

const filePath = 'C:/Users/thongpn/Downloads/YÊU CẦU CẦN ĐẠT 2026 2027/PPTC MÔN HƯỚNG NGHIỆP.xlsx';
const wb = xlsx.readFile(filePath);

let grandTotalLessons = 0;
let grandTotalCriteria = 0;
const summary = [];

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
  
  // Headers are at row 2
  // Col 0: Chủ đề
  // Col 1: Bài học
  // Col 2: Mô tả chi tiết
  // Col 3: Mức
  // Col 4: Mã tiêu chuẩn
  // Col 5: Tài liệu hướng dẫn
  // Col 6-13: Tiêu chí 1-8
  // Col 14: Mã chủ đề
  // Col 15: Mã bài học

  const lessonsSet = new Set();
  const criteriaList = [];
  const topicsSet = new Set();

  for (let i = 3; i < rows.length; i++) {
    const r = rows[i] || [];
    const topic = r[0] != null ? String(r[0]).trim() : '';
    const lesson = r[1] != null ? String(r[1]).trim() : '';
    const desc = r[2] != null ? String(r[2]).trim() : '';
    const level = r[3] != null ? String(r[3]).trim() : '';
    const stdCode = r[4] != null ? String(r[4]).trim() : '';
    const guideDoc = r[5] != null ? String(r[5]).trim() : '';
    const topicCode = r[14] != null ? String(r[14]).trim() : '';
    const lessonCode = r[15] != null ? String(r[15]).trim() : '';

    // Ignore completely empty rows or rows where stdCode is empty or formula remnants
    if (!stdCode && !lesson && !desc) continue;
    if (stdCode && !desc && !lesson) {
      // check if it's dummy
      console.log(`[${sheetName}] Ghost row at ${i}: stdCode=${stdCode}`);
      continue;
    }

    if (topic) topicsSet.add(topic);
    if (lesson || lessonCode) {
      lessonsSet.add(`${topicCode || topic}__${lessonCode || lesson}`);
    }

    if (stdCode || desc) {
      criteriaList.push({
        rowIdx: i,
        topic,
        lesson,
        desc,
        level,
        stdCode,
        guideDoc,
        topicCode,
        lessonCode
      });
    }
  }

  // Count unique lessons
  // In Excel, topic and lesson cells might be merged or only filled on the first row of each lesson!
  grandTotalLessons += lessonsSet.size;
  grandTotalCriteria += criteriaList.length;

  summary.push({
    sheet: sheetName,
    rawRows: rows.length,
    topicsCount: topicsSet.size,
    lessonsCount: lessonsSet.size,
    criteriaCount: criteriaList.length
  });
}

console.log('Summary by sheet:', summary);
console.log('Grand Total Unique Lessons (naive):', grandTotalLessons);
console.log('Grand Total Criteria:', grandTotalCriteria);
