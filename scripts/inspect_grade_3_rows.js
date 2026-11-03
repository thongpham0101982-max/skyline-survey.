const xlsx = require('xlsx');
const path = require('path');
const wb = xlsx.readFile(path.resolve('./docs/PPCT_MON_GIAO_DUC_TAI_CHINH_3S.xlsx'));
const ws = wb.Sheets['KHỐI 3S'];
const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
for (let i = 0; i < rows.length; i++) {
  const r = rows[i] || [];
  console.log(`Row ${i+1}: Col0(Topic): "${r[0]||''}" | Col1(Lesson): "${r[1]||''}" | Col3(Muc): "${r[3]||''}" | Col4(CritCode): "${r[4]||''}" | C6(H): "${r[6]||''}" | C7(B): "${r[7]||''}" | C8(VD): "${r[8]||''}" | Col14(TCode): "${r[14]||''}" | Col15(LCode): "${r[15]||''}"`);
}
