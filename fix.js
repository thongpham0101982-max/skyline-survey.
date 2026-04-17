const fs = require('fs');
let content = fs.readFileSync('src/app/api/input-assessments/route.ts', 'utf8');

content = content.replace(
    'orderBy: { batchNumber: \'asc\' }',
    'orderBy: { batchNumber: \'asc\' }\n          },\n          campus: true,\n          assignedUser: { select: { fullName: true } }'
);

fs.writeFileSync('src/app/api/input-assessments/route.ts', content, 'utf8');
