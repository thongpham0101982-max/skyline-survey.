const fs = require('fs');
let page = fs.readFileSync('src/app/teacher/input-assessments/page.tsx', 'utf8');

page = page.replace(
  /session\.user\.role !== "Teacher" && session\.user\.role !== "Admin"/,
  'session.user.role !== "TEACHER" && session.user.role !== "ADMIN" && session.user.role !== "Teacher" && session.user.role !== "Admin"'
);

fs.writeFileSync('src/app/teacher/input-assessments/page.tsx', page, 'utf8');
console.log('Fixed auth role case check');
