const fs = require('fs');
const path = require('path');

const ckdv = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));

console.log('--- DETAILED CHECK OF COMMITTED SUBJECTS FOR ALL 76 STUDENTS ---');

for (let i = 0; i < ckdv.length; i++) {
  const st = ckdv[i];
  const note = st.directorNote || '';
  
  // Check exact bracket first
  const m = note.match(/(?:Môn cam kết|Môn kiểm tra lại):\s*\[(.*?)\]/i);
  let bracketSubs = null;
  if (m) {
    bracketSubs = m[1].split(',').map(s => s.trim()).filter(Boolean);
  }

  console.log(`\n#${i + 1}: ${st.fullName} (${st.className}, ${st.campus})`);
  console.log(`   Table comms: [${st.committedSubjects.join(', ')}]`);
  if (bracketSubs) {
    console.log(`   Bracket raw: [${bracketSubs.join(', ')}]`);
  } else {
    console.log(`   No bracket. Note: ${note.replace(/\n/g, ' ')}`);
  }
}
