const xlsx = require('xlsx');
const path = require('path');

const filePath = path.resolve(__dirname, '../docs/PPCT_MON_GIAO_DUC_TAI_CHINH_2S.xlsx');
const wb = xlsx.readFile(filePath);
console.log('Sheet Names:', wb.SheetNames);
const ws = wb.Sheets['KHỐI 2S'];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });

let currentTopic = '', currentTopicCode = '';
let currentLesson = '', currentLessonCode = '';
const topics = new Map();
const lessons = new Map();
const criteria = [];
const descMap = new Map();
const codeSet = new Set();
const duplicateCodes = [];

for (let i = 3; i < rows.length; i++) {
  const r = rows[i];
  if (!r || r.length === 0) continue;
  
  if (r[0] && r[0].toString().trim()) {
    currentTopic = r[0].toString().trim();
  }
  if (r[14] && r[14].toString().trim()) {
    currentTopicCode = r[14].toString().trim();
  }
  if (r[1] && r[1].toString().trim()) {
    currentLesson = r[1].toString().trim();
  }
  if (r[15] && r[15].toString().trim()) {
    currentLessonCode = r[15].toString().trim();
  }

  const desc = r[2] ? r[2].toString().trim() : '';
  const level = r[3] ? r[3].toString().trim() : '';
  const critCode = r[4] ? r[4].toString().trim() : '';
  
  if (!critCode) continue;

  if (codeSet.has(critCode)) {
    duplicateCodes.push(critCode);
  }
  codeSet.add(critCode);

  let compGroup = '';
  // Check Columns 6, 7, 8 (TIÊU CHÍ 1 = Hiểu, TIÊU CHÍ 2 = Biết, TIÊU CHÍ 3 = Vận dụng)
  if (r[6] && r[6].toString().trim().toLowerCase() === 'x') compGroup = 'Hiểu';
  else if (r[7] && r[7].toString().trim().toLowerCase() === 'x') compGroup = 'Biết';
  else if (r[8] && r[8].toString().trim().toLowerCase() === 'x') compGroup = 'Vận dụng';

  if (!topics.has(currentTopicCode)) {
    topics.set(currentTopicCode, { code: currentTopicCode, name: currentTopic });
  }
  if (!lessons.has(currentLessonCode)) {
    lessons.set(currentLessonCode, { code: currentLessonCode, name: currentLesson, topicCode: currentTopicCode });
  }

  criteria.push({
    critCode,
    desc,
    level,
    compGroup,
    lessonCode: currentLessonCode,
    topicCode: currentTopicCode
  });

  if (!descMap.has(desc)) descMap.set(desc, []);
  descMap.get(desc).push(critCode);
}

console.log('Total Topics:', topics.size);
for (const [k, v] of topics.entries()) console.log(`  Topic [${k}]: ${v.name}`);
console.log('\nTotal Lessons:', lessons.size);
let lIdx = 1;
for (const [k, v] of lessons.entries()) {
  const critCount = criteria.filter(c => c.lessonCode === k).length;
  console.log(`  Lesson ${lIdx++} [${k}] (Topic: ${v.topicCode}): ${v.name} -> ${critCount} criteria`);
}
console.log('\nTotal Criteria:', criteria.length);
console.log('Duplicate Codes (should be 0):', duplicateCodes.length, duplicateCodes);

console.log('\n=== Check Duplicate Descriptions (Warnings) ===');
let dupDescCount = 0;
for (const [d, codes] of descMap.entries()) {
  if (codes.length > 1) {
    dupDescCount++;
    console.log(`- Cảnh báo mô tả trùng (${codes.length} lần) [${codes.join(', ')}]:`);
    console.log(`  "${d}"`);
  }
}
console.log(`Tổng số mô tả bị trùng lặp trong file nguồn: ${dupDescCount}`);

console.log('\n=== Competency Groups Breakdown ===');
const compCounts = {};
criteria.forEach(c => {
  compCounts[c.compGroup || 'Chưa phân loại'] = (compCounts[c.compGroup || 'Chưa phân loại'] || 0) + 1;
});
console.log(compCounts);
