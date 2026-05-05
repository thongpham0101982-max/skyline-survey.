const fs = require('fs');  
const fp = 'src/app/admin/input-assessments/client.tsx';  
const c = fs.readFileSync(fp, 'utf8');  
const arr = c.split('\n');  
const si = arr.findIndex(l => l.includes('OTHER TABS PLACEHOLDERS'));  
console.log('Block start:', si+1, arr[si]);  
