const fs = require('fs');
let api = fs.readFileSync('src/app/api/input-assessments/route.ts', 'utf8');

api = api.replace(
    'include: {\n          batches: {\n            orderBy: { batchNumber: \\'asc\\' }\n          }\n        },',
    'include: {\n          batches: {\n            orderBy: { batchNumber: \\'asc\\' }\n          },\n          campus: true,\n          assignedUser: { select: { fullName: true } }\n        },'
);

// Fallback if formatting was slightly different
if (!api.includes('campus: true,')) {
    api = api.replace(
        'include: {\n        batches:',
        'include: {\n        campus: true,\n        assignedUser: { select: { fullName: true } },\n        batches:'
    );
}

fs.writeFileSync('src/app/api/input-assessments/route.ts', api, 'utf8');
console.log('GET API updated to include relations!');
