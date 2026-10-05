const fs = require('fs');
const content = fs.readFileSync('bao_cao_ksdn_va_ckdv_2026.html', 'utf8');
const regex = /<h2 class="section-title">([\s\S]*?)<\/h2>/g;
let m;
while ((m = regex.exec(content)) !== null) {
  console.log(m[1].trim());
}
