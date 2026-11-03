const fs = require('fs');
const xlsx = require('xlsx');

console.log('=== 1. AUDIT SCHEMA.PRISMA ===');
const schemaContent = fs.readFileSync('d:/SSM/skyline-survey/prisma/schema.prisma', 'utf8');
const lines = schemaContent.split('\n');

const matchedModels = [];
lines.forEach((line, idx) => {
  if (line.trim().startsWith('model ')) {
    const modelName = line.trim().split(/\s+/)[1];
    if (
      modelName.includes('Special') ||
      modelName.includes('Career') ||
      modelName.includes('Advisory') ||
      modelName.includes('Orientation') ||
      modelName.includes('Student') ||
      modelName.includes('Class') ||
      modelName.includes('TeachingAssignment')
    ) {
      matchedModels.push({ line: idx + 1, name: modelName });
    }
  }
});
console.log('Matched Models in schema.prisma:', matchedModels);

// Check CareerOrientation model details
let inCareerModel = false;
let careerModelLines = [];
lines.forEach((line) => {
  if (line.trim().startsWith('model CareerOrientation')) inCareerModel = true;
  if (inCareerModel) {
    careerModelLines.push(line);
    if (line.trim() === '}') inCareerModel = false;
  }
});
console.log('\n--- CareerOrientation Model Definition ---');
console.log(careerModelLines.join('\n'));

// Check SpecialSubject models details
const specialModelNames = [
  'SpecialSubject',
  'SpecialCurriculum',
  'SpecialCurriculumVersion',
  'SpecialSubjectGradeConfig',
  'SpecialTopic',
  'SpecialLesson',
  'SpecialAssessmentCriterion',
  'SpecialTeachingAssignment',
  'SpecialGradeEntry',
  'SpecialGradeAudit'
];
console.log('\n--- Special Models verified:');
specialModelNames.forEach(m => {
  const found = matchedModels.some(item => item.name === m);
  console.log(`  ${m}: ${found ? 'EXISTS' : 'NOT FOUND'}`);
});

console.log('\n=== 2. AUDIT HUONG NGHIEP EXCEL FILE ===');
const wb = xlsx.readFile('C:/Users/thongpn/Downloads/YÊU CẦU CẦN ĐẠT 2026 2027/PPTC MÔN HƯỚNG NGHIỆP.xlsx');
let totalLessons = 0;
let totalCriteria = 0;
const perSheet = [];

wb.SheetNames.forEach(sheetName => {
  const ws = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
  
  let currentTopic = '';
  let currentTopicCode = '';
  let currentLesson = '';
  let currentLessonCode = '';
  
  const sheetLessons = new Map();
  const criteria = [];
  
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i] || [];
    const topic = r[0] != null ? String(r[0]).trim() : '';
    const lesson = r[1] != null ? String(r[1]).trim() : '';
    const desc = r[2] != null ? String(r[2]).trim() : '';
    const level = r[3] != null ? String(r[3]).trim() : '';
    const stdCode = r[4] != null ? String(r[4]).trim() : '';
    const guideDoc = r[5] != null ? String(r[5]).trim() : '';
    const criteria1to8 = r.slice(6, 14).map(c => c != null ? String(c).trim() : '').filter(Boolean);
    const topicCode = r[14] != null ? String(r[14]).trim() : '';
    const lessonCode = r[15] != null ? String(r[15]).trim() : '';
    
    if (topic) currentTopic = topic;
    if (topicCode) currentTopicCode = topicCode;
    if (lesson) currentLesson = lesson;
    if (lessonCode) currentLessonCode = lessonCode;
    
    if (!stdCode && !desc) continue;
    
    const lessonKey = currentLessonCode || currentLesson;
    if (!sheetLessons.has(lessonKey)) {
      sheetLessons.set(lessonKey, {
        topic: currentTopic,
        topicCode: currentTopicCode,
        lesson: currentLesson,
        lessonCode: currentLessonCode,
        criteriaCount: 0
      });
    }
    
    sheetLessons.get(lessonKey).criteriaCount++;
    criteria.push({
      lessonKey,
      stdCode,
      desc,
      level,
      guideDoc,
      criteria1to8
    });
  }
  
  totalLessons += sheetLessons.size;
  totalCriteria += criteria.length;
  perSheet.push({
    sheet: sheetName,
    lessonsCount: sheetLessons.size,
    criteriaCount: criteria.length,
    lessons: Array.from(sheetLessons.values())
  });
});

console.log(`Summary: ${perSheet.length} sheets, ${totalLessons} lessons, ${totalCriteria} criteria`);
perSheet.forEach(s => {
  console.log(`- ${s.sheet}: ${s.lessonsCount} lessons, ${s.criteriaCount} criteria`);
  s.lessons.forEach(l => {
    console.log(`   [${l.lessonCode || 'NO_CODE'}] ${l.lesson.substring(0, 35)}... (${l.criteriaCount} criteria) [Topic: ${l.topicCode || l.topic}]`);
  });
});
