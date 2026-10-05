const fs = require('fs');

// HTML check
const html = fs.readFileSync('d:/SSM/skyline-survey/bao_cao_ksdn_va_ckdv_2026.html', 'utf8');
const lines = html.split('\n');
const idx = lines.findIndex(l => l.includes('Lê Nguyên Khang'));
console.log('HTML lines:');
for (let i = idx; i <= idx + 8; i++) {
  console.log(lines[i]);
}

// MD check
const md = fs.readFileSync('C:/Users/thongpn/Downloads/Bao_Cao_Khao_Sat_Dau_Nam_va_76_HS_CKDV_2026.md', 'utf8');
const mdLines = md.split('\n');
const mdIdx = mdLines.findIndex(l => l.includes('Lê Nguyên Khang'));
console.log('\nMD lines:');
for (let i = mdIdx; i <= mdIdx + 2; i++) {
  console.log(mdLines[i]);
}
