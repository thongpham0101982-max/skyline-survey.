const xlsx = require('xlsx');

const filePath = 'C:/Users/thongpn/Downloads/YÊU CẦU CẦN ĐẠT 2026 2027/PPTC MÔN HƯỚNG NGHIỆP.xlsx';
const wb = xlsx.readFile(filePath);

console.log('Sheet Names:', wb.SheetNames);

let totalLessonsAll = 0;
let totalCriteriaAll = 0;

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
    if (rows[headerRowIdx + 1]) {
      console.log('Row 1 after header:', rows[headerRowIdx + 1]);
    }
    if (rows[headerRowIdx + 2]) {
      console.log('Row 2 after header:', rows[headerRowIdx + 2]);
    }
  }
}
