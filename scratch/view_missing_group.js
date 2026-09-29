const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table_updated.json'), 'utf8'));

const missingGroup = data.filter(s => s.ksdvStatus !== 'Đủ điểm');
console.log(`Total non-complete students: ${missingGroup.length}\n`);

missingGroup.forEach((s, i) => {
  const comm = Array.isArray(s.committedSubjects) ? s.committedSubjects.join(', ') : (s.committedSubjects || '');
  console.log(`${i+1}. [${s.campus}] ${s.fullName} - ${s.className} (Khối ${s.grade}): ${s.ksdvStatus}`);
  console.log(`   Cam kết: ${comm}`);
  console.log(`   Điểm KSĐV: Toán=${s.ksdvMath}, TV=${s.ksdvViet}, Văn=${s.ksdvVan}, Anh=${s.ksdvEngScale10} (Tổng ${s.ksdvEngTotal})`);
  console.log(`   Điểm KSĐN: Toán=${s.ksdnMath}, TV=${s.ksdnViet}, Văn=${s.ksdnVan}, Anh=${s.ksdnEng}`);
  console.log(`   Lý do: ${s.missingReason}\n`);
});
