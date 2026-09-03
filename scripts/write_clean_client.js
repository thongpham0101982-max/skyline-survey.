const fs = require('fs');
const path = require('path');
const target = path.join(__dirname, '..', 'src', 'app', 'teacher', 'du-gio-gvnn', 'client.tsx');
fs.writeFileSync(target, '', 'utf8');
console.log('Target emptied for fresh write');
