const fs = require('fs');
let route = fs.readFileSync('src/app/api/teacher-assessments/route.ts', 'utf8');

route = route.replace(
  /where: \{ teacherUserId: session\.user\.id \},/,
  'where: { userId: session.user.id },'
);

fs.writeFileSync('src/app/api/teacher-assessments/route.ts', route, 'utf8');
console.log('Fixed API query for user ID');
