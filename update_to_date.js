const fs = require('fs');
let client = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

client = client.split('type="datetime-local"').join('type="date"');
client = client.replace('toISOString().slice(0, 16)', 'toISOString().slice(0, 10)');
client = client.split("toLocaleString('vi-VN')").join("toLocaleDateString('vi-VN')");

fs.writeFileSync('src/app/admin/input-assessments/client.tsx', client, 'utf8');
console.log('UI updated for date only.');
