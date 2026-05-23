const fs = require('fs');
const lines = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8').split('\n');
const found = lines.findIndex(l => l.includes('tab==="periods"'));
if (found !== -1) {
    console.log(lines.slice(found, found + 40).join('\n'));
} else {
    console.log("NOT FOUND");
}
