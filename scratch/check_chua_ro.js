const fs = require('fs');
const html = fs.readFileSync('C:/Users/thongpn/Downloads/Bao_Cao_Khao_Sat_Dau_Nam_va_76_HS_CKDV_2026.html', 'utf8');
const md = fs.readFileSync('C:/Users/thongpn/Downloads/Bao_Cao_Khao_Sat_Dau_Nam_va_76_HS_CKDV_2026.md', 'utf8');

console.log('HTML contains "Chưa rõ":', html.includes('Chưa rõ'));
console.log('MD contains "Chưa rõ":', md.includes('Chưa rõ'));
