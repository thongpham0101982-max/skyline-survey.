const fs = require('fs');
const path = require('path');

const ckdv = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));

ckdv.forEach((st, i) => {
  const d = st.ksdvEngDetails;
  if (!d) return;
  console.log(`${i+1}. ${st.fullName} (${st.campus}, ${st.className}, Khối ${st.grade})`);
  console.log(`   Written: ${d.written}, Oral: ${d.oral}, EPT: ${d.ept}, TotalScore: ${d.totalScore}, Scale10: ${d.scale10}`);
});
