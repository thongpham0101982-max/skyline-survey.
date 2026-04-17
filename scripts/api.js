const fs = require('fs');
const p = 'src/app/api/input-assessment-students/route.ts';
let c = fs.readFileSync(p, 'utf8');

// Add new fields after hocKy in all create/update blocks
c = c.split('hocKy: d.hocKy || null,').join('hocKy: d.hocKy || null,\n              kqgdTieuHoc: d.kqgdTieuHoc || null,\n              kqHocTap: d.kqHocTap || null,\n              kqRenLuyen: d.kqRenLuyen || null,');

c = c.split('hocKy: data.hocKy || null,\n           psychologyScore').join('hocKy: data.hocKy || null,\n           kqgdTieuHoc: data.kqgdTieuHoc || null,\n           kqHocTap: data.kqHocTap || null,\n           kqRenLuyen: data.kqRenLuyen || null,\n           psychologyScore');

c = c.split('hocKy: data.hocKy || null,\n         psychologyScore').join('hocKy: data.hocKy || null,\n         kqgdTieuHoc: data.kqgdTieuHoc || null,\n         kqHocTap: data.kqHocTap || null,\n         kqRenLuyen: data.kqRenLuyen || null,\n         psychologyScore');

fs.writeFileSync(p, c);
console.log('API updated with 3 new fields');