const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const actionsPath = path.join(rootDir, 'src', 'app', 'teacher', 'du-gio-gvnn', 'actions.ts');
let actionsContent = fs.readFileSync(actionsPath, 'utf8');

// Update isEnglishDepartment to include preschool / mầm non keywords
actionsContent = actionsContent.replace(
  'lower.includes("cambridge")',
  'lower.includes("cambridge") || lower.includes("mầm non") || lower.includes("mam non") || lower.includes("preschool") || lower.includes("kindergarten") || lower.includes("eng_pre")'
);

fs.writeFileSync(actionsPath, actionsContent, 'utf8');
console.log('actions.ts updated for 4 English departments including Mầm non');
