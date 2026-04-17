const fs = require('fs');

// 1. Update API to include user and reason
let apiC = fs.readFileSync('src/app/api/input-assessments/route.ts', 'utf8');
apiC = apiC.replace(
  /InputAssessmentTeacherAssignment: \{ select: \{ unlockRequestStatus: true \} \},/,
  'InputAssessmentTeacherAssignment: { select: { id: true, unlockRequestStatus: true, unlockReason: true, user: { select: { fullName: true, id: true } } } },'
);
fs.writeFileSync('src/app/api/input-assessments/route.ts', apiC, 'utf8');

console.log('Fixed API');
