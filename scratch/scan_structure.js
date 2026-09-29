const fs = require('fs');
const content = fs.readFileSync('bao_cao_ksdn_va_ckdv_2026.html', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('<h1') || line.includes('<h2') || line.includes('<h3') || line.includes('kpi-card') || line.includes('alert') || line.includes('PHẦN') || line.includes('KẾ HOẠCH') || line.includes('LƯU Ý')) {
    console.log((idx + 1) + ': ' + line.trim().substring(0, 110));
  }
});
