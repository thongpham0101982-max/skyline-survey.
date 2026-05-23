const fs = require('fs');
let content = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

// fix the multiple definition
content = content.replace('subjects: subjectsList, eduSystems, configs: initialConfigs', 'subjects: initialSubjects, eduSystems, configs: initialConfigs');

fs.writeFileSync('src/app/admin/input-assessments/client.tsx', content, 'utf8');
console.log("PATCH SUCCESSFUL");
