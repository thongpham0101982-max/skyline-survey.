const fs = require('fs');
const path = require('path');

const ckdv = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));

console.log("Checking 76 students English scores:");
ckdv.forEach((st, i) => {
  if (st.isPsychology) return;
  const committed = Array.isArray(st.committedSubjects) ? st.committedSubjects.join(', ') : (st.committedSubjects || '');
  if (committed.includes('Tiếng Anh') || st.ksdvEngScale10 != null || st.ksdvEngDetails != null) {
    console.log(`${i+1}. [${st.campus}] ${st.fullName} (${st.className}, Khối ${st.grade}):`);
    console.log(`   Committed: ${committed}`);
    console.log(`   ksdvEngDetails:`, st.ksdvEngDetails);
    console.log(`   ksdvEngScale10:`, st.ksdvEngScale10);
    console.log(`   ksdnEng:`, st.ksdnEng);
  }
});
