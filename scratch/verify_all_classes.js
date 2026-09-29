const fs = require('fs');
const path = require('path');

const found = JSON.parse(fs.readFileSync(path.join(__dirname, 'found_classes_76.json'), 'utf8'));

let stillUnknown = 0;
found.forEach(r => {
  let resolvedClass = r.currentClass;
  if (!resolvedClass || resolvedClass === 'Chưa rõ') {
    resolvedClass = r.ias.enrollmentClassName || (r.studentTableMatches.length > 0 ? r.studentTableMatches[0].className : null);
  }
  let resolvedCode = r.studentTableMatches.length > 0 ? r.studentTableMatches[0].code : r.ias.enrollmentCode;
  
  if (!resolvedClass || resolvedClass === 'Chưa rõ') {
    stillUnknown++;
    console.log('STILL UNKNOWN:', r.fullName);
  }
});

console.log('Still unknown count:', stillUnknown);
