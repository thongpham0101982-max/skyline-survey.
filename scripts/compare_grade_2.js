const xlsx = require('xlsx');
const path = require('path');

const oldPath = path.resolve(__dirname, '../docs/PPCT_MON_GIAO_DUC_TAI_CHINH_2S.xlsx');
const newPath = path.resolve(__dirname, '../docs/PPCT_MON_GIAO_DUC_TAI_CHINH_2S_NEW.xlsx');

const wbOld = xlsx.readFile(oldPath);
const wbNew = xlsx.readFile(newPath);

console.log('Old Sheet Names:', wbOld.SheetNames);
console.log('New Sheet Names:', wbNew.SheetNames);

const wsOld = wbOld.Sheets['KHỐI 2S'];
const wsNew = wbNew.Sheets['KHỐI 2S'];

const rowsOld = xlsx.utils.sheet_to_json(wsOld, { header: 1 });
const rowsNew = xlsx.utils.sheet_to_json(wsNew, { header: 1 });

console.log('Header Row 0 (New):', rowsNew[0]);
console.log('Header Row 1 (New):', rowsNew[1]);
console.log('Header Row 2 (New):', rowsNew[2]);

function parseSheet(rows) {
  let currentTopic = '', currentTopicCode = '';
  let currentLesson = '', currentLessonCode = '';
  const list = [];
  
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    
    if (r[0] && r[0].toString().trim()) currentTopic = r[0].toString().trim();
    if (r[14] && r[14].toString().trim()) currentTopicCode = r[14].toString().trim();
    if (r[1] && r[1].toString().trim()) currentLesson = r[1].toString().trim();
    if (r[15] && r[15].toString().trim()) currentLessonCode = r[15].toString().trim();
    
    const desc = r[2] ? r[2].toString().trim() : '';
    const level = r[3] ? r[3].toString().trim() : '';
    const critCode = r[4] ? r[4].toString().trim() : '';
    
    if (!critCode) continue;

    // Check competency columns
    // Let's see what columns are marked
    const marks = [];
    if (r[6] && r[6].toString().trim().toLowerCase() === 'x') marks.push('Hiểu');
    if (r[7] && r[7].toString().trim().toLowerCase() === 'x') marks.push('Biết');
    if (r[8] && r[8].toString().trim().toLowerCase() === 'x') marks.push('Vận dụng');

    list.push({
      critCode,
      desc,
      level,
      topicCode: currentTopicCode,
      lessonCode: currentLessonCode,
      marks,
      compGroup: marks.join(', ')
    });
  }
  return list;
}

const oldList = parseSheet(rowsOld);
const newList = parseSheet(rowsNew);

console.log(`Old criteria count: ${oldList.length}, New criteria count: ${newList.length}`);

const oldMap = new Map(oldList.map(c => [c.critCode, c]));
const newMap = new Map(newList.map(c => [c.critCode, c]));

const changed = [];
const unchanged = [];
const notFoundInOld = [];

for (const n of newList) {
  const o = oldMap.get(n.critCode);
  if (!o) {
    notFoundInOld.push(n);
  } else {
    if (o.compGroup !== n.compGroup) {
      changed.push({
        critCode: n.critCode,
        desc: n.desc,
        level: n.level,
        topicCode: n.topicCode,
        lessonCode: n.lessonCode,
        oldComp: o.compGroup,
        newComp: n.compGroup
      });
    } else {
      unchanged.push(n.critCode);
    }
  }
}

console.log(`Changed count: ${changed.length}`);
console.log(`Unchanged count: ${unchanged.length}`);
console.log(`Not found in old: ${notFoundInOld.length}`);

console.log('\n--- DETAILED CHANGES (29 EXPECTED) ---');
changed.forEach((c, idx) => {
  console.log(`${idx + 1}. [${c.critCode}] ${c.oldComp} -> ${c.newComp} | Level: ${c.level} | ${c.desc.substring(0, 45)}...`);
});
