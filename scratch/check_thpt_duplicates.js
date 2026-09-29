const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_report_data.json'), 'utf8'));

console.log('THPT Subjects in exact_report_data.json:');
const thpt = data.dataByLevel['THPT'];
console.log(Object.keys(thpt));

console.log('\nBreakdown of all THPT entries:');
Object.keys(thpt).forEach(sub => {
  const grades = thpt[sub];
  Object.keys(grades).forEach(g => {
    Object.keys(grades[g]).forEach(cmp => {
      const it = grades[g][cmp];
      console.log(`[${cmp}] ${sub} (${g}): total=${it.total}, below=${it.belowAvg}, bench=${it.atBenchmark}, good=${it.good}`);
    });
  });
});
