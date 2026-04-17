const fs = require('fs');

// 1. Fix API
let apiC = fs.readFileSync('src/app/api/input-assessments/route.ts', 'utf8');
apiC = apiC.replace(/assignments: \{ select: \{ unlockRequestStatus: true \} \},/, 'InputAssessmentTeacherAssignment: { select: { unlockRequestStatus: true } },');
fs.writeFileSync('src/app/api/input-assessments/route.ts', apiC, 'utf8');

// 2. Fix Client
let clientC = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');
clientC = clientC.replace(/const pendingCount = p\.assignments\?\.filter/g, 'const pendingCount = p.InputAssessmentTeacherAssignment?.filter');
fs.writeFileSync('src/app/admin/input-assessments/client.tsx', clientC, 'utf8');

console.log('Fixed relation name');
