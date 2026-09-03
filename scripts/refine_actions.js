const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const actionsPath = path.join(rootDir, 'src', 'app', 'teacher', 'du-gio-gvnn', 'actions.ts');
let content = fs.readFileSync(actionsPath, 'utf8');

// Update createForeignObservationWithEvaluation input type and evaluator assignment
if (!content.includes('observerId?: string;')) {
  content = content.replace(
    'teacherId: string;',
    'observerId?: string;\n  teacherId: string;'
  );
  content = content.replace(
    'const evaluatorId = currentTeacher?.id || session.user.id;',
    'const evaluatorId = data.observerId || currentTeacher?.id || session.user.id;'
  );
}

fs.writeFileSync(actionsPath, content, 'utf8');
console.log('actions.ts updated with observerId support');
