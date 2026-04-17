const fs = require('fs');
const p = 'src/app/admin/input-assessments/client.tsx';
let c = fs.readFileSync(p, 'utf8');

// Update Excel template
c = c.replace(
  '["Ma_HS_KS", "Ho ten", "Ngay sinh", "Dien khao sat", "Hinh thuc KS", "Loai tuyen sinh", "Hoc ky"]',
  '["Ma_HS_KS", "Ho ten", "Ngay sinh", "Dien khao sat", "Hinh thuc KS", "Loai tuyen sinh", "Hoc ky", "KQGD Tieu hoc", "KQ Hoc tap", "KQ Ren luyen"]'
);
c = c.replace(
  '["HS_001", "Nguyen Van A", "2010-01-15", "", "", "", ""]',
  '["HS_001", "Nguyen Van A", "2010-01-15", "", "", "", "", "", "", ""]'
);

fs.writeFileSync(p, c);
console.log('Excel template updated');