const fs = require('fs');
const p = 'src/app/admin/input-assessments/client.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1. Add 3 new CAT_TYPES
c = c.replace(
  '  { key: "LOAI_TUYEN_SINH", label: "Loại tuyển sinh", color: "bg-amber-100 text-amber-700 border-amber-200" },\n]',
  '  { key: "LOAI_TUYEN_SINH", label: "Loại tuyển sinh", color: "bg-amber-100 text-amber-700 border-amber-200" },\n  { key: "KQGD_TIEU_HOC", label: "KQGD Bậc Tiểu học", color: "bg-rose-100 text-rose-700 border-rose-200" },\n  { key: "KQ_HOC_TAP", label: "KQ Học tập (Trung học)", color: "bg-blue-100 text-blue-700 border-blue-200" },\n  { key: "KQ_REN_LUYEN", label: "KQ Rèn luyện", color: "bg-teal-100 text-teal-700 border-teal-200" },\n]'
);

// 2. Add new fields to student form state
c = c.replace(
  'hocKy:"",periodId:"",batchId:""',
  'hocKy:"",kqgdTieuHoc:"",kqHocTap:"",kqRenLuyen:"",periodId:"",batchId:""'
);

// 3. Add new fields to handleOpenNewStudent
c = c.replace(
  'hocKy:"",periodId:studentPeriodId',
  'hocKy:"",kqgdTieuHoc:"",kqHocTap:"",kqRenLuyen:"",periodId:studentPeriodId'
);

// 4. Add new fields to edit student populate
c = c.replace(
  'hocKy:s.hocKy||"",periodId:s.periodId',
  'hocKy:s.hocKy||"",kqgdTieuHoc:s.kqgdTieuHoc||"",kqHocTap:s.kqHocTap||"",kqRenLuyen:s.kqRenLuyen||"",periodId:s.periodId'
);

// 5. Add config options
c = c.replace(
  'const ltsOptions=configsList.filter',
  'const kqgdThOptions=configsList.filter(c=>c.categoryType==="KQGD_TIEU_HOC");\n  const kqhtOptions=configsList.filter(c=>c.categoryType==="KQ_HOC_TAP");\n  const kqrlOptions=configsList.filter(c=>c.categoryType==="KQ_REN_LUYEN");\n  const ltsOptions=configsList.filter'
);

// 6. Add COLUMN_MAP entries
c = c.replace(
  '"Lop": "className"',
  '"KQGD Tieu hoc": "kqgdTieuHoc", "kqgdTieuHoc": "kqgdTieuHoc",\n    "KQ Hoc tap": "kqHocTap", "kqHocTap": "kqHocTap",\n    "KQ Ren luyen": "kqRenLuyen", "kqRenLuyen": "kqRenLuyen",\n    "Lop": "className"'
);

fs.writeFileSync(p, c);
console.log('Step 3 done - CAT_TYPES + options + form state');