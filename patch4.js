const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
schema = schema.replace('subjectName String', 'subjectName String\n  studyPrograms String?  @default("H? S")');
fs.writeFileSync('prisma/schema.prisma', schema);
console.log('Schema updated.');
