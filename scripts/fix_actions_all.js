const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const actionsPath = path.join(rootDir, 'src', 'app', 'teacher', 'du-gio-gvnn', 'actions.ts');
let content = fs.readFileSync(actionsPath, 'utf8');

// Replace return to ensure allDepartments and rawTeachers are passed
content = content.replace(
  'const englishTeachers = rawTeachers.filter(t => isForeignOrEnglishTeacher(t));',
  'const englishTeachers = rawTeachers;'
);

content = content.replace(
  'departments: englishDepartments,',
  'departments: allDepartments,'
);

fs.writeFileSync(actionsPath, content, 'utf8');
console.log('actions.ts updated to pass all departments and all teachers');
