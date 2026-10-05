const fs = require('fs');

const html = fs.readFileSync('d:/SSM/skyline-survey/bao_cao_ksdn_va_ckdv_2026.html', 'utf8');
const md = fs.readFileSync('C:/Users/thongpn/Downloads/Bao_Cao_Khao_Sat_Dau_Nam_va_76_HS_CKDV_2026.md', 'utf8');

console.log('HTML contains "Chung / Theo dõi" in table:');
console.log('  badge-sub: ' + html.includes('Chung / Theo dõi'));
console.log('MD table contains "Chung / Theo dõi":');
console.log('  in table pipe: ' + md.includes('| **Chung / Theo dõi** |'));

const names = ['Nguyễn Thanh Phúc', 'ĐỖ NGUYỄN AN KHÔI', 'Phan Hải Đăng', 'Nguyễn Hoàng Đạt', 'Nguyễn Hoàng Phúc', 'Nguyễn Đặng Bảo Trâm'];
console.log('\nChecking 6 students with no specific committed subject:');
names.forEach(n => {
  const inHtmlTable = html.includes('<strong>' + n + '</strong>');
  console.log(`  ${n} in HTML table: ${inHtmlTable}`);
});
