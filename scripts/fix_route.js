const fs = require('fs');
let file = fs.readFileSync('src/app/api/input-assessments/route.ts', 'utf8');

// Find the problematic block and replace it cleanly
const badBlock = "      include: {\n        batches: {\n          orderBy: { batchNumber: 'asc' }\n          },\n          campus: true,\n          assignedUser: { select: { fullName: true } }\n        }\n      },";

const goodBlock = "      include: {\n        campus: true,\n        assignedUser: { select: { fullName: true } },\n        batches: {\n          orderBy: { batchNumber: 'asc' }\n        }\n      },";

file = file.replace(badBlock, goodBlock);
fs.writeFileSync('src/app/api/input-assessments/route.ts', file, 'utf8');
console.log('Syntax fixed.');
