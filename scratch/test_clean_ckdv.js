const fs = require('fs');
const path = require('path');

const ckdv = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));

// Filter students who have valid committed subjects (exclude Chung / Theo dõi)
const validStudents = ckdv.filter(st => {
  const comms = Array.isArray(st.committedSubjects) ? st.committedSubjects : [st.committedSubjects];
  const realSubs = comms.map(s => s.trim()).filter(s => s && !s.toLowerCase().includes('chung') && !s.toLowerCase().includes('theo dõi'));
  return realSubs.length > 0;
});

console.log(`Total original: ${ckdv.length}`);
console.log(`Total valid with real committed subjects: ${validStudents.length}`);

const excluded = ckdv.filter(st => !validStudents.includes(st));
console.log('\nExcluded students (no specific committed subject):');
excluded.forEach((st, i) => {
  console.log(`${i + 1}. ${st.fullName} (${st.className}, ${st.campus}) - Note: ${(st.directorNote||'').replace(/\n/g, ' ')}`);
});
