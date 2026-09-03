const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const actionsPath = path.join(rootDir, 'src', 'app', 'teacher', 'du-gio-gvnn', 'actions.ts');
let content = fs.readFileSync(actionsPath, 'utf8');

// Remove export from synchronous helpers in "use server" file
content = content.replace('export function isEnglishDepartment', 'function isEnglishDepartment');
content = content.replace('export function isForeignOrEnglishTeacher', 'function isForeignOrEnglishTeacher');

fs.writeFileSync(actionsPath, content, 'utf8');
console.log('Fixed actions.ts synchronous exports in "use server" file');
