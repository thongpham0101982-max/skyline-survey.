const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const actionsPath = path.join(rootDir, 'src', 'app', 'teacher', 'du-gio-gvnn', 'actions.ts');
let content = fs.readFileSync(actionsPath, 'utf8');

// 1. Broaden isEnglishDepartment
const oldIsEng = `function isEnglishDepartment(deptNameOrCode?: string | null): boolean {
  if (!deptNameOrCode) return false;
  const lower = deptNameOrCode.toLowerCase();
  return (
    lower.includes("tiếng anh") ||
    lower.includes("tieng anh") ||
    lower.includes("english") ||
    lower.includes("esl") ||
    lower.includes("eng_pri") ||
    lower.includes("eng_sec") ||
    lower.includes("eng_int") ||
    lower.includes("ngoại ngữ") ||
    lower.includes("ngoai ngu")
  );
}`;

const newIsEng = `function isEnglishDepartment(deptNameOrCode?: string | null): boolean {
  if (!deptNameOrCode) return false;
  const lower = deptNameOrCode.toLowerCase();
  return (
    lower.includes("tiếng anh") ||
    lower.includes("tieng anh") ||
    lower.includes("english") ||
    lower.includes("esl") ||
    lower.includes("eng_pri") ||
    lower.includes("eng_sec") ||
    lower.includes("eng_int") ||
    lower.includes("ngoại ngữ") ||
    lower.includes("ngoai ngu") ||
    lower.includes("quốc tế") ||
    lower.includes("quoc te") ||
    lower.includes("cambridge")
  );
}`;

if (content.includes('lower.includes("ngoai ngu")')) {
  content = content.replace(oldIsEng, newIsEng);
}

// 2. Add mainSubjectRel to rawTeachers select
if (!content.includes('mainSubjectRel:')) {
  content = content.replace(
    'departmentRel: {\n          select: { id: true, code: true, name: true }\n        },',
    'departmentRel: {\n          select: { id: true, code: true, name: true, blockCM: true }\n        },\n        mainSubjectRel: {\n          select: { id: true, subjectName: true }\n        },'
  );
}

// 3. Fallback logic for englishDepartments and englishTeachers if DB has loose names
const deptFilterOld = `    const englishDepartments = allDepartments.filter(
      d => isEnglishDepartment(d.name) || isEnglishDepartment(d.code)
    );`;

const deptFilterNew = `    let englishDepartments = allDepartments.filter(
      d => isEnglishDepartment(d.name) || isEnglishDepartment(d.code)
    );
    if (englishDepartments.length === 0) {
      englishDepartments = allDepartments;
    }`;

if (content.includes(deptFilterOld)) {
  content = content.replace(deptFilterOld, deptFilterNew);
}

const teacherFilterOld = `    const englishTeachers = rawTeachers.filter(t => isForeignOrEnglishTeacher(t));`;
const teacherFilterNew = `    let englishTeachers = rawTeachers.filter(t => isForeignOrEnglishTeacher(t));
    if (englishTeachers.length === 0) {
      englishTeachers = rawTeachers;
    }`;

if (content.includes(teacherFilterOld)) {
  content = content.replace(teacherFilterOld, teacherFilterNew);
}

fs.writeFileSync(actionsPath, content, 'utf8');
console.log('actions.ts query enhanced with real DB relations & fallbacks');
