const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'local.db');
const db = new Database(dbPath, { readonly: true });

// Check grade entries for KSĐN
const entries = db.prepare(`
  SELECT 
    sge.id,
    sge.subjectId,
    sge.gradeLevel,
    sge.score,
    s.name as studentName,
    s.studentCode,
    s.campus,
    c.name as className,
    sub.name as subjectName,
    sub.code as subjectCode
  FROM SubjectGradeEntry sge
  JOIN Student s ON sge.studentId = s.id
  LEFT JOIN Class c ON s.classId = c.id
  JOIN Subject sub ON sge.subjectId = sub.id
  JOIN SurveyPeriod sp ON sge.surveyPeriodId = sp.id
  WHERE sp.name LIKE '%Đầu năm%' OR sp.code = 'KSDN_2627' OR sp.code LIKE '%KSDN%'
`).all();

console.log("Total KSDN grade entries:", entries.length);

// Let's see unique campuses and gradeLevels
const campuses = [...new Set(entries.map(e => e.campus))].filter(Boolean).sort();
const grades = [...new Set(entries.map(e => e.gradeLevel))].sort((a,b) => a - b);
console.log("Campuses:", campuses);
console.log("Grades:", grades);

// Group by Level -> Campus -> Subject -> GradeLevel
function getLevel(grade) {
  const g = parseInt(grade);
  if (g >= 1 && g <= 5) return 'Tiểu học';
  if (g >= 6 && g <= 9) return 'THCS';
  if (g >= 10 && g <= 12) return 'THPT';
  return 'Khác';
}

const levelCampusData = {};

entries.forEach(e => {
  const level = getLevel(e.gradeLevel);
  if (level === 'Khác') return;
  const campus = e.campus || 'Khác';

  if (!levelCampusData[level]) levelCampusData[level] = {};
  if (!levelCampusData[level][campus]) levelCampusData[level][campus] = [];

  levelCampusData[level][campus].push(e);
});

console.log("Levels and Campuses summary:");
for (const lvl of Object.keys(levelCampusData)) {
  console.log(`\n=== BẬC ${lvl} ===`);
  for (const cmp of Object.keys(levelCampusData[lvl])) {
    console.log(`  Cơ sở ${cmp}: ${levelCampusData[lvl][cmp].length} bài thi`);
  }
}
