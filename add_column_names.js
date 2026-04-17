const fs = require('fs');
let c = fs.readFileSync('prisma/schema.prisma', 'utf8');

if (!c.includes('columnNames')) {
    c = c.replace(
      /commentColumns\s+Int\s+@default\(1\)/,
      'commentColumns  Int                   @default(1)\n  columnNames     String?               // JSON string'
    );
    fs.writeFileSync('prisma/schema.prisma', c, 'utf8');
}
console.log('Schema updated');
