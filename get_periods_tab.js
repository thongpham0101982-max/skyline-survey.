const fs = require('fs');
const lines = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('tab==="periods"'));
if (start !== -1) {
    console.log(lines.slice(start, start + 30).join('\n'));
} else {
    console.log("NOT FOUND");
}
