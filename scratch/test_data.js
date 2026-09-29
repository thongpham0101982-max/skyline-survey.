const fs = require('fs');
const path = require('path');

const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_report_data.json'), 'utf8'));
const sample = d.dataByLevel['Tiểu học']['Tiếng Việt']['Khối 2']['CS1'];
console.log("Sample stats object:", sample);
