const fs = require('fs');
const lines = fs.readFileSync('old_client.tsx', 'utf8').split('\n');
const found = lines.findIndex(l => l.includes('tab==="mapping"') || l.includes('tab === "mapping"'));
if (found !== -1) {
    console.log(lines.slice(found, found + 20).join('\n'));
} else {
    console.log("NOT FOUND");
}
