const xlsx = require('xlsx');

const wb = xlsx.readFile('C:/Users/thongpn/Downloads/CXXH1-9.xlsx');

console.log('=== PHÂN TÍCH FILE CXXH1-9.xlsx ===\n');

wb.SheetNames.forEach(sheetName => {
  const ws = wb.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
  
  // Headers are at row 0, 1, 2
  const headerRow0 = data[0] || [];
  const headerRow1 = data[1] || [];
  const headerRow2 = data[2] || [];
  
  const rows = data.slice(3).filter(r => r && (r[0] || r[1] || r[2] || r[4]));
  
  let curTopic = '';
  let curLesson = '';
  let criteriaCount = 0;
  let missingMucCount = 0;
  const codeCount = {};
  const lessons = new Map();
  const criteriaList = [];

  rows.forEach((r, idx) => {
    if (r[0]) curTopic = String(r[0]).trim();
    if (r[1]) curLesson = String(r[1]).trim();
    
    const desc = r[2] ? String(r[2]).trim() : '';
    const muc = r[3] ? String(r[3]).trim() : '';
    const code = r[4] ? String(r[4]).trim() : '';
    
    // Năng lực assessment: Hiểu, Biết, Vận dụng
    // Check columns 6, 7, 8
    const tieuChi1 = r[6] ? String(r[6]).trim() : ''; // Hiểu
    const tieuChi2 = r[7] ? String(r[7]).trim() : ''; // Biết
    const tieuChi3 = r[8] ? String(r[8]).trim() : ''; // Vận dụng
    
    const competency = [];
    if (tieuChi1.toLowerCase() === 'x') competency.push('Hiểu');
    if (tieuChi2.toLowerCase() === 'x') competency.push('Biết');
    if (tieuChi3.toLowerCase() === 'x') competency.push('Vận dụng');

    if (!muc) missingMucCount++;
    if (code) codeCount[code] = (codeCount[code] || 0) + 1;
    
    if (!lessons.has(curLesson)) {
      lessons.set(curLesson, {
        topic: curTopic,
        lessonName: curLesson,
        lessonCode: r[15] || '',
        topicCode: r[14] || '',
        criteria: []
      });
    }

    const item = {
      rowIdx: idx + 4,
      topic: curTopic,
      lesson: curLesson,
      description: desc,
      muc: muc || '(Không có mức)',
      code: code || '(Không có mã)',
      competency: competency.join(', ') || 'Chưa tích'
    };
    lessons.get(curLesson).criteria.push(item);
    criteriaList.push(item);
    criteriaCount++;
  });

  const dupCodes = Object.entries(codeCount).filter(([k, v]) => v > 1);

  console.log(`----------------------------------------------------------------`);
  console.log(`Sheet: ${sheetName}`);
  console.log(`- Mã môn trên sheet: ${headerRow0[1] || 'N/A'}`);
  console.log(`- Số bài học: ${lessons.size}`);
  console.log(`- Tổng số tiêu chuẩn: ${criteriaCount}`);
  console.log(`- Số tiêu chuẩn thiếu "Mức": ${missingMucCount}`);
  console.log(`- Số mã tiêu chuẩn bị trùng: ${dupCodes.length}`);
  
  if (dupCodes.length > 0) {
    console.log(`  * Mẫu mã trùng:`, dupCodes.slice(0, 5).map(([c, count]) => `${c} (${count} lần)`).join(', '));
  }
  
  // Show lessons with count of criteria
  const lessonCriteriaCounts = Array.from(lessons.values()).map(l => `${l.lessonName}: ${l.criteria.length} TC`);
  console.log(`  * Phân bổ TC theo bài (${lessons.size} bài):`, lessonCriteriaCounts.slice(0, 4).join(' | '), '...');
});
