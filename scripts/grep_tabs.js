const fs = require('fs');
const lines = fs.readFileSync('old_client.tsx', 'utf8').split('\n');
lines.forEach((l, i) => {
    if (l.includes('tab') && l.includes('===')) {
        console.log(`${i+1}: ${l.trim()}`);
    }
});
