const fs = require('fs');
const path = require('path');

const ckdv = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));

let fixedCount = 0;

for (const st of ckdv) {
  const note = st.directorNote || '';
  const m = note.match(/(?:Môn cam kết|Môn kiểm tra lại):\s*\[(.*?)\]/i);

  if (m) {
    const rawItems = m[1].split(',').map(s => s.trim()).filter(Boolean);
    const validSubs = [];
    
    // Check if bracket contains EPT / English
    if (rawItems.some(s => /anh|english|esl|ept/i.test(s))) validSubs.push('Tiếng Anh');
    if (rawItems.some(s => /toán|math/i.test(s))) validSubs.push('Toán');
    if (rawItems.some(s => /tiếng việt/i.test(s))) validSubs.push('Tiếng Việt');
    if (rawItems.some(s => /(?:ngữ\s*)?văn/i.test(s) && !/tiếng việt/i.test(s))) validSubs.push('Ngữ Văn');
    if (rawItems.some(s => /tâm lý/i.test(s))) validSubs.push('Tâm lý');

    if (validSubs.length > 0) {
      if (JSON.stringify(validSubs.sort()) !== JSON.stringify(st.committedSubjects.sort())) {
        console.log(`[FIX BRACKET] ${st.fullName} (${st.className}): old=[${st.committedSubjects.join(', ')}] -> new=[${validSubs.join(', ')}] (bracket: [${m[1]}])`);
        st.committedSubjects = validSubs;
        fixedCount++;
      }
    }
  } else {
    // No bracket, check note text
    if (st.fullName === 'Đoàn Ngọc Thảo Chloe') {
      console.log(`[FIX NOTE] Đoàn Ngọc Thảo Chloe: old=[${st.committedSubjects.join(', ')}] -> new=[Tiếng Việt]`);
      st.committedSubjects = ['Tiếng Việt'];
      fixedCount++;
    } else if (st.fullName === 'Lecomte Mailys Mộc Yên') {
      console.log(`[FIX NOTE] Lecomte Mailys Mộc Yên: old=[${st.committedSubjects.join(', ')}] -> new=[Tiếng Việt]`);
      st.committedSubjects = ['Tiếng Việt'];
      fixedCount++;
    } else if (st.fullName === 'Huỳnh Hoàng An') {
      console.log(`[FIX NOTE] Huỳnh Hoàng An: old=[${st.committedSubjects.join(', ')}] -> new=[Toán, Tiếng Việt]`);
      st.committedSubjects = ['Toán', 'Tiếng Việt'];
      fixedCount++;
    } else if (st.fullName === 'Nguyễn Thanh Phúc') {
      // Note: "Không cần cam kết nhưng gvta sẽ phải tương tác kĩ với PH" -> Chung / Theo dõi
      console.log(`[FIX NOTE] Nguyễn Thanh Phúc: old=[${st.committedSubjects.join(', ')}] -> new=[Chung / Theo dõi]`);
      st.committedSubjects = ['Chung / Theo dõi'];
      fixedCount++;
    }
  }

  // Update missingCommitted based on new committedSubjects
  const missing = [];
  for (const sub of st.committedSubjects) {
    if (sub === 'Toán' && st.ksdvMath == null) missing.push('Toán');
    if (sub === 'Tiếng Việt' && st.ksdvViet == null) missing.push('Tiếng Việt');
    if (sub === 'Ngữ Văn' && st.ksdvVan == null) missing.push('Ngữ Văn');
    if (sub === 'Tiếng Anh' && st.ksdvEngScale10 == null) missing.push('Tiếng Anh');
  }
  st.missingCommitted = missing;
  if (missing.length === 0) {
    st.ksdvStatus = 'Đủ điểm';
    st.missingReason = '';
  } else {
    st.ksdvStatus = 'Thiếu môn CKĐV';
  }
}

console.log(`Total fixed: ${fixedCount}`);
fs.writeFileSync(path.join(__dirname, 'exact_commitment_table.json'), JSON.stringify(ckdv, null, 2), 'utf8');
console.log('Saved exact_commitment_table.json!');
