const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_report_data.json'), 'utf8'));
const thpt = data.dataByLevel['THPT'];

console.log('Current rows in exact_report_data.json for THPT:');
Object.keys(thpt).forEach(sub => {
  Object.keys(thpt[sub]).forEach(gr => {
    Object.keys(thpt[sub][gr]).forEach(cmp => {
      const it = thpt[sub][gr][cmp];
      console.log(`[${cmp}] ${sub} (${gr}): total=${it.total}, below=${it.belowAvg}, bench=${it.atBenchmark}, good=${it.good}, benchmarkCfg=${it.benchmark}`);
    });
  });
});
