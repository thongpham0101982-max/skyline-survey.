const xlsx = require('xlsx');

const filePath = 'C:/Users/thongpn/Downloads/PPTC - MÔN GDGT - THCS.xlsx';
const wb = xlsx.readFile(filePath);

let grandTotalLessons = 0;
let grandTotalCriteria = 0;
const perSheet = [];

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
  
  // Headers are at row 2
  // Data starts at row 3
  let currentTopic = '';
  let currentTopicCode = '';
  let currentLesson = '';
  let currentLessonCode = '';

  const lessonsMap = new Map();
  const criteriaList = [];

  for (let i = 3; i < rows.length; i++) {
    const r = rows[i] || [];
    const topic = r[0] != null ? String(r[0]).trim() : '';
    const lesson = r[1] != null ? String(r[1]).trim() : '';
    const desc = r[2] != null ? String(r[2]).trim() : '';
    const level = r[3] != null ? String(r[3]).trim() : '';
    const stdCode = r[4] != null ? String(r[4]).trim() : '';
    const guideDoc = r[5] != null ? String(r[5]).trim() : '';
    const crit1 = r[6] != null ? String(r[6]).trim() : '';
    const crit2 = r[7] != null ? String(r[7]).trim() : '';
    const crit3 = r[8] != null ? String(r[8]).trim() : '';
    const topicCode = r[9] != null ? String(r[9]).trim() : '';
    const lessonCode = r[10] != null ? String(r[10]).trim() : '';

    if (!stdCode && !desc && !lesson) continue;

    if (topic) currentTopic = topic;
    if (topicCode) currentTopicCode = topicCode;
    if (lesson) currentLesson = lesson;
    if (lessonCode) currentLessonCode = lessonCode;

    const lKey = currentLessonCode || currentLesson;
    if (!lessonsMap.has(lKey)) {
      lessonsMap.set(lKey, {
        topic: currentTopic,
        topicCode: currentTopicCode,
        lesson: currentLesson,
        lessonCode: currentLessonCode,
        criteriaCount: 0
      });
    }

    lessonsMap.get(lKey).criteriaCount++;
    criteriaList.push({
      lessonKey: lKey,
      stdCode,
      desc,
      level,
      guideDoc,
      crit1,
      crit2,
      crit3
    });
  }

  grandTotalLessons += lessonsMap.size;
  grandTotalCriteria += criteriaList.length;

  perSheet.push({
    sheet: sheetName,
    lessonsCount: lessonsMap.size,
    criteriaCount: criteriaList.length,
    lessons: Array.from(lessonsMap.values())
  });
}

console.log('=== EXACT COUNT SUMMARY ===');
console.log('Total Lessons:', grandTotalLessons, '(Prompt states: 40 bài học)');
console.log('Total Criteria:', grandTotalCriteria, '(Prompt states: 160 mã tiêu chuẩn)');
perSheet.forEach(s => {
  console.log(`- ${s.sheet}: ${s.lessonsCount} lessons, ${s.criteriaCount} criteria`);
  s.lessons.forEach((l, idx) => {
    console.log(`   [${l.lessonCode}] ${l.lesson} (${l.criteriaCount} criteria) [Topic: ${l.topicCode} - ${l.topic}]`);
  });
});
