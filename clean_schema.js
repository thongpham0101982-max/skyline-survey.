const fs = require('fs');

// Fix Schema
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
if(schema.charCodeAt(0) === 0xFEFF) {
  schema = schema.slice(1);
}
if(!schema.includes('  startDate      DateTime?')) {
    schema = schema.replace('academicYearId String\n  description', 'academicYearId String\n  startDate      DateTime?\n  endDate        DateTime?\n  description');
}
fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
console.log('Schema cleaned & updated');
