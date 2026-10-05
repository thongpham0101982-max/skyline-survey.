const fs = require('fs');
const path = require('path');

const ckdv = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));

console.log('--- AUDITING BRACKET SUBJECTS VS TABLE SUBJECTS ---');

for (let i = 0; i < ckdv.length; i++) {
  const st = ckdv[i];
  const note = st.directorNote || '';
  const m1 = note.match(/Môn cam kết:\s*\[(.*?)\]/i);
  const m2 = note.match(/Môn kiểm tra lại:\s*\[(.*?)\]/i);
  const bracket = m1 ? m1[1] : (m2 ? m2[1] : null);

  if (bracket) {
    const rawItems = bracket.split(',').map(s => s.trim()).filter(Boolean);

    let logicalSubs = [];
    if (rawItems.some(s => /anh|english|esl|ept/i.test(s))) logicalSubs.push('Tiếng Anh');
    if (rawItems.some(s => /toán|math/i.test(s))) logicalSubs.push('Toán');
    if (rawItems.some(s => /tiếng việt/i.test(s))) logicalSubs.push('Tiếng Việt');
    if (rawItems.some(s => /(?:ngữ\s*)?văn/i.test(s) && !/tiếng việt/i.test(s))) logicalSubs.push('Ngữ Văn');
    if (rawItems.some(s => /tâm lý/i.test(s))) logicalSubs.push('Tâm lý');

    const tableSubs = st.committedSubjects || [];

    if (JSON.stringify(logicalSubs.sort()) !== JSON.stringify(tableSubs.sort())) {
      console.log(`[DIFF] STT ${i + 1}: ${st.fullName} (${st.className})`);
      console.log(`       bracket: [${bracket}] -> logical: [${logicalSubs.join(', ')}]`);
      console.log(`       table:   [${tableSubs.join(', ')}]`);
    }
  } else {
    console.log(`[NO BRACKET] STT ${i + 1}: ${st.fullName} (${st.className}) | table: [${st.committedSubjects.join(', ')}] | note: ${(st.directorNote || '').replace(/\n/g, ' ')}`);
  }
}
