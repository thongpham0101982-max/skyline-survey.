const fs = require('fs');

const routePath = 'src/app/api/teacher-assessments/route.ts';
let code = fs.readFileSync(routePath, 'utf8');

code = code.replace(/const filteredStudents = students; \/\/ Temporary: Return ALL students as requested by user "Hiện tất cả danh sách Học sinh theo Phân công"[\s\S]*?\/\*([\s\S]*?)\*\//, '$1');

fs.writeFileSync(routePath, code, 'utf8');
