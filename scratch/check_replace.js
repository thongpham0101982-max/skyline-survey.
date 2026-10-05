const fs = require('fs');
const content = fs.readFileSync('src/app/admin/xet-duyet-ket-qua/k12-client.tsx', 'utf8');
console.log('CRLF:', content.includes('\r\n'));
const target = 'if (!isGrade1) {';
const pos = content.indexOf(target);
console.log('Found pos:', pos);
if (pos !== -1) {
  console.log('Context around pos:');
  console.log(JSON.stringify(content.slice(pos - 100, pos + 200)));
}
