const xlsx = require('xlsx');
const path = require('path');

const filePath = path.resolve(__dirname, '../docs/PPCT_MON_GIAO_DUC_TAI_CHINH_3S.xlsx');
const wb = xlsx.readFile(filePath);
const ws = wb.Sheets['KHỐI 3S'];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });

const topics = new Map();
let curTCode = '', curTName = '';
let curLCode = '', curLName = '';
let lCount = 0;
let cCount = 0;

for (let i = 3; i < rows.length; i++) {
  const r = rows[i] || [];
  const topic = r[0] ? String(r[0]).trim() : '';
  const lesson = r[1] ? String(r[1]).trim() : '';
  const desc = r[2] ? String(r[2]).trim() : '';
  const stdCode = r[4] ? String(r[4]).trim() : '';

  if (!stdCode && !desc) continue;

  if (topic) {
    curTName = topic.replace(/\r\n/g, ' ').replace(/\n/g, ' ').trim();
    const m = curTName.match(/Chủ\s*đề\s*(\d+)/i);
    curTCode = m ? `TC03S.${String(m[1]).padStart(2, '0')}` : (r[14] || 'TC03S.01');
  }
  if (!curTCode) curTCode = 'TC03S.01';

  if (!topics.has(curTCode)) {
    topics.set(curTCode, { code: curTCode, name: curTName, lessons: new Map() });
  }

  if (lesson) {
    lCount++;
    curLName = lesson.replace(/\r\n/g, ' ').replace(/\n/g, ' ').trim();
    curLCode = `${curTCode}.${String(lCount).padStart(4, '0')}`;
  }

  const tObj = topics.get(curTCode);
  if (!tObj.lessons.has(curLCode)) {
    tObj.lessons.set(curLCode, { code: curLCode, name: curLName, criteria: [] });
  }

  cCount++;
  tObj.lessons.get(curLCode).criteria.push(stdCode);
}

console.log('Total Topics:', topics.size);
for (const [k, v] of topics.entries()) {
  console.log(`- [${k}] ${v.name} (${v.lessons.size} bài)`);
  for (const [lk, lv] of v.lessons.entries()) {
    console.log(`    * [${lk}] ${lv.name} (${lv.criteria.length} tiêu chuẩn)`);
  }
}
console.log('Total Criteria:', cCount);
