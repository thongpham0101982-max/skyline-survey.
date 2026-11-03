const xlsx = require('xlsx');

const filePath = 'C:/Users/thongpn/Downloads/YÊU CẦU CẦN ĐẠT 2026 2027/PPTC MÔN HƯỚNG NGHIỆP.xlsx';
const wb = xlsx.readFile(filePath);

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
  console.log(`\n=================== ${sheetName} SAMPLE ROWS ===================`);
  // Print row 3 (first data row) and row 4
  for (let i = 3; i < Math.min(6, rows.length); i++) {
    const r = rows[i] || [];
    console.log(`Row ${i}:`, {
      topic: r[0],
      lesson: r[1],
      desc: r[2]?.substring(0, 40) + '...',
      muc: r[3],
      stdCode: r[4],
      doc: r[5],
      tieuchi1: r[6],
      tieuchi2: r[7],
      tieuchi3: r[8],
      tieuchi4: r[9],
      topicCode: r[14],
      lessonCode: r[15]
    });
  }
}
