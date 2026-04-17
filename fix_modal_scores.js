const fs = require('fs');
let c = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

c = c.replace(/sc\?\.score \|\| '-'/g, "(() => { try { return JSON.parse(sc?.scores)[0] || '-' } catch(e) { return '-' } })()");
c = c.replace(/sc\?\.score2 \|\| '-'/g, "('-')");

fs.writeFileSync('src/app/admin/input-assessments/client.tsx', c, 'utf8');
console.log('Fixed parsing in modal');
