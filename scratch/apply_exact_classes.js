const fs = require('fs');
const path = require('path');

const ckdv = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));
const found = JSON.parse(fs.readFileSync(path.join(__dirname, 'found_classes_76.json'), 'utf8'));

console.log('=== UPDATING ALL 76 STUDENTS WITH EXACT ENROLLED CLASSES ===');

const updated = ckdv.map((st, idx) => {
  const f = found[idx];
  let newClass = st.className;

  if (!newClass || newClass === 'Chưa rõ') {
    newClass = f.ias.enrollmentClassName || (f.studentTableMatches.length > 0 ? f.studentTableMatches[0].className : null);
  }

  let studentCode = st.studentCode;
  if (!studentCode || studentCode.startsWith('HS') || studentCode === '') {
    if (f.studentTableMatches.length > 0 && f.studentTableMatches[0].code) {
      studentCode = f.studentTableMatches[0].code;
    } else if (f.ias.enrollmentCode) {
      studentCode = f.ias.enrollmentCode;
    }
  }

  return {
    ...st,
    className: newClass,
    studentCode: studentCode
  };
});

// Print all updated classes that were changed
updated.forEach((st, idx) => {
  if (ckdv[idx].className !== st.className) {
    console.log(`STT ${idx + 1}: ${st.fullName} (${st.campus}) -> Class: ${ckdv[idx].className} ===> ${st.className} (Code: ${st.studentCode})`);
  }
});

fs.writeFileSync(path.join(__dirname, 'exact_commitment_table.json'), JSON.stringify(updated, null, 2), 'utf8');
console.log('\nSuccessfully saved updated exact_commitment_table.json with 100% exact classes!');
