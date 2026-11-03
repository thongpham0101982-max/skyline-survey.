const xlsx = require('xlsx');

const excelPath = 'C:/Users/thongpn/Downloads/PPCT MÔN GIÁO DỤC TÀI CHÍNH.xlsx';
const wb = xlsx.readFile(excelPath);

console.log('PPCT Sheets:', wb.SheetNames);

wb.SheetNames.forEach(sheetName => {
  const ws = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
  console.log(`\n=== SHEET: ${sheetName} (${rows.length} rows) ===`);
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    console.log(`Row ${i}:`, JSON.stringify(rows[i]));
  }
});
