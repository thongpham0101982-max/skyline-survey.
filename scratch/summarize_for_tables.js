const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'exact_report_data.json'), 'utf8'));

console.log('=== SUMMARY STATS ===');
console.log(data.summary);

console.log('\n=== LEVEL DATA SAMPLES & TOTALS ===');
for (const level of ['Tiểu học', 'THCS', 'THPT']) {
  console.log(`\n================== ${level.toUpperCase()} ==================`);
  const subjects = data.dataByLevel[level];
  for (const subName of Object.keys(subjects)) {
    console.log(`--- Môn: ${subName} ---`);
    let subTotal = 0, subBelow = 0, subBench = 0, subGood = 0;
    for (const gradeStr of Object.keys(subjects[subName])) {
      const campuses = subjects[subName][gradeStr];
      for (const campus of Object.keys(campuses)) {
        const s = campuses[campus];
        subTotal += s.total;
        subBelow += s.belowAvg;
        subBench += s.atBenchmark;
        subGood += s.good;
        console.log(`  ${subName} | ${gradeStr} | ${campus} : Total=${s.total}, <5=${s.belowAvg} (${((s.belowAvg/s.total)*100).toFixed(1)}%), ĐạtChuẩn=${s.atBenchmark} (${((s.atBenchmark/s.total)*100).toFixed(1)}%), Giỏi=${s.good} (${((s.good/s.total)*100).toFixed(1)}%)`);
      }
    }
    console.log(`  >> TỔNG MÔN ${subName}: Total=${subTotal}, <5=${subBelow} (${((subBelow/subTotal)*100).toFixed(1)}%), ĐạtChuẩn=${subBench} (${((subBench/subTotal)*100).toFixed(1)}%), Giỏi=${subGood} (${((subGood/subTotal)*100).toFixed(1)}%)`);
  }
}

console.log('\n=== COMMITTED STUDENTS BY CAMPUS ===');
const byCmp = {};
for (const st of data.mappedList) {
  const cmp = st.campus || 'Khác';
  if (!byCmp[cmp]) byCmp[cmp] = [];
  byCmp[cmp].push(st);
}

for (const cmp of Object.keys(byCmp)) {
  console.log(`\nCampus ${cmp}: ${byCmp[cmp].length} students`);
  byCmp[cmp].slice(0, 5).forEach((s, idx) => {
    console.log(`  ${idx+1}. ${s.fullName} (${s.className}) | CK: ${s.committedSubjects.join(', ')} | KSĐV: Toán=${s.ksdvMath}, Văn/TV=${s.ksdvViet}, Anh=${s.ksdvEng}, TâmLý=${s.ksdvPsychology} | KSĐN: ${JSON.stringify(s.ksdnEntries)}`);
  });
}
