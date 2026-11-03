const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const excelPath = 'C:/Users/thongpn/Downloads/CXXH1-9.xlsx';
const wb = xlsx.readFile(excelPath);

console.log('=== CHUẨN HÓA DỮ LIỆU CXXH KHỐI 1 ĐẾN 9 ===');

const result = {
  grades: {}
};

wb.SheetNames.forEach(sheetName => {
  const gradeMatch = sheetName.match(/Khoi(\d+)S/i);
  if (!gradeMatch) return;
  const grade = gradeMatch[1];
  
  const ws = wb.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
  
  const rawRows = data.slice(3);
  let curTopic = '';
  let curLesson = '';
  let curTopicCode = '';
  let curLessonCode = '';
  
  const topicsMap = new Map();
  let totalCriteria = 0;
  
  rawRows.forEach((r, idx) => {
    // Only process rows that have real description
    const desc = r[2] ? String(r[2]).trim() : '';
    if (!desc) return; // Skip ghost / empty rows like row 138+ in Khoi9S
    
    if (r[0] && String(r[0]).trim()) {
      curTopic = String(r[0]).trim().replace(/\r\n/g, ' ');
    }
    if (r[1] && String(r[1]).trim()) {
      curLesson = String(r[1]).trim().replace(/\r\n/g, ' ');
    }
    
    if (r[14] && String(r[14]).trim()) curTopicCode = String(r[14]).trim();
    if (r[15] && String(r[15]).trim()) curLessonCode = String(r[15]).trim();
    
    const muc = r[3] ? String(r[3]).trim() : null;
    const sourceCode = r[4] ? String(r[4]).trim() : '';
    
    // Competency from columns 6, 7, 8 (Hiểu, Biết, Vận dụng)
    const tieuChi1 = r[6] ? String(r[6]).trim().toLowerCase() : '';
    const tieuChi2 = r[7] ? String(r[7]).trim().toLowerCase() : '';
    const tieuChi3 = r[8] ? String(r[8]).trim().toLowerCase() : '';
    
    const comps = [];
    if (tieuChi1 === 'x') comps.push('Hiểu');
    if (tieuChi2 === 'x') comps.push('Biết');
    if (tieuChi3 === 'x') comps.push('Vận dụng');
    
    if (!topicsMap.has(curTopic)) {
      topicsMap.set(curTopic, {
        topicName: curTopic,
        topicCode: curTopicCode,
        lessons: new Map()
      });
    }
    
    const topicObj = topicsMap.get(curTopic);
    if (!topicObj.lessons.has(curLesson)) {
      topicObj.lessons.set(curLesson, {
        lessonName: curLesson,
        lessonCode: curLessonCode,
        criteria: []
      });
    }
    
    const lessonObj = topicObj.lessons.get(curLesson);
    lessonObj.criteria.push({
      criterionIndex: lessonObj.criteria.length + 1,
      sourceCode,
      description: desc,
      programLevel: muc,
      competencies: comps.length > 0 ? comps : ['Chung'],
      competencyGroup: comps.join(', ') || 'Chung'
    });
    
    totalCriteria++;
  });
  
  // Format topic and lesson arrays
  const formattedTopics = [];
  let lessonCounter = 0;
  for (const [tName, tObj] of topicsMap.entries()) {
    const lessonsArr = [];
    for (const [lName, lObj] of tObj.lessons.entries()) {
      lessonCounter++;
      lessonsArr.push({
        lessonIndex: lessonCounter,
        lessonName: lName,
        lessonCode: lObj.lessonCode || `L_${grade}_${lessonCounter}`,
        criteriaCount: lObj.criteria.length,
        criteria: lObj.criteria
      });
    }
    formattedTopics.push({
      topicName: tName,
      topicCode: tObj.topicCode || `T_${grade}_${formattedTopics.length + 1}`,
      lessons: lessonsArr
    });
  }
  
  result.grades[grade] = {
    grade,
    sheetName,
    topicsCount: formattedTopics.length,
    lessonsCount: lessonCounter,
    criteriaCount: totalCriteria,
    topics: formattedTopics
  };
  
  console.log(`- Khối ${grade}: ${formattedTopics.length} chủ đề, ${lessonCounter} bài học, ${totalCriteria} tiêu chuẩn.`);
});

const outPath = path.resolve(__dirname, 'cxxh_normalized_curriculum.json');
fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');
console.log(`\nĐã xuất dữ liệu chuẩn hóa thành công: ${outPath}`);
