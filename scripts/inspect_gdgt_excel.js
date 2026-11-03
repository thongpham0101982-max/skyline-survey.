const xlsx = require('xlsx');

const filePath = 'C:/Users/thongpn/Downloads/PPTC - MÔN GDGT - THCS.xlsx';
const wb = xlsx.readFile(filePath);

console.log('Sheet Names:', wb.SheetNames);

let totalLessonsAll = 0;
let totalCriteriaAll = 0;
const allCodes = new Map();
const guideDocs = [];

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
  console.log(`\n================ SHEET: ${sheetName} (Total raw rows: ${rows.length}) ================`);
  
  // Find header row
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i] || [];
    const text = row.join(' ').toLowerCase();
    if (text.includes('chủ đề') || text.includes('bài học') || text.includes('tiêu chuẩn') || text.includes('mã')) {
      headerRowIdx = i;
      break;
    }
  }
  
  console.log(`Header row index: ${headerRowIdx}`);
  if (headerRowIdx >= 0) {
    console.log('Headers:', rows[headerRowIdx]);
    console.log('Sample data row 1:', rows[headerRowIdx + 1]);
    console.log('Sample data row 2:', rows[headerRowIdx + 2]);
  }

  let sheetLessons = new Set();
  let sheetCriteria = 0;

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const topic = r[0] != null ? String(r[0]).trim() : '';
    const lesson = r[1] != null ? String(r[1]).trim() : '';
    const desc = r[2] != null ? String(r[2]).trim() : '';
    const level = r[3] != null ? String(r[3]).trim() : '';
    const stdCode = r[4] != null ? String(r[4]).trim() : '';
    const guideDoc = r[5] != null ? String(r[5]).trim() : '';
    const topicCode = r[9] != null ? String(r[9]).trim() : (r[7] != null ? String(r[7]).trim() : '');
    const lessonCode = r[10] != null ? String(r[10]).trim() : (r[8] != null ? String(r[8]).trim() : '');

    if (!stdCode && !desc && !lesson) continue;

    if (stdCode) {
      if (allCodes.has(stdCode)) {
        console.log(`DUPLICATE CODE: ${stdCode} in ${sheetName} and ${allCodes.get(stdCode)}`);
      } else {
        allCodes.set(stdCode, sheetName);
      }
      sheetCriteria++;
      totalCriteriaAll++;
    }

    if (lesson || lessonCode) {
      sheetLessons.add(lessonCode || lesson);
    }

    if (guideDoc) {
      guideDocs.push({ sheet: sheetName, stdCode, guideDoc });
    }
  }

  totalLessonsAll += sheetLessons.size;
  console.log(`Sheet ${sheetName}: ${sheetLessons.size} lessons, ${sheetCriteria} criteria`);
}

console.log(`\nGrand Total Unique Lessons: ${totalLessonsAll}`);
console.log(`Grand Total Criteria: ${totalCriteriaAll}`);
console.log(`Total Guide Documents found: ${guideDocs.length}`);
if (guideDocs.length > 0) {
  console.log('Sample guide documents:', guideDocs.slice(0, 5));
}
