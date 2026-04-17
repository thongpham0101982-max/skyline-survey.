const fs = require("fs");
let content = fs.readFileSync("src/app/admin/input-assessments/client.tsx", "utf8");

// Fix CAT_TYPES
content = content.replace(/{ key: "KQGD_TIEU_HOC".+/, '{ key: "KQGD_TIEU_HOC", label: "Hồ sơ CT Bộ (Khối 1-5)", color: "bg-rose-100 text-rose-700 border-rose-200" },');
content = content.replace(/{ key: "KQ_HOC_TAP".+/, '{ key: "KQ_HOC_TAP", label: "Hồ sơ CT Bộ (Khối 6-12)", color: "bg-orange-100 text-orange-700 border-orange-200" },\n  { key: "HS_CT_QUOC_TE", label: "Hồ sơ CT Quốc tế", color: "bg-blue-100 text-blue-700 border-blue-200" },');

// Fix options declarations
content = content.replace(/const kqhtOptions=configsList\.filter\(c=>c\.categoryType==="KQ_HOC_TAP"\);/, 'const kqhtOptions=configsList.filter(c=>c.categoryType==="KQ_HOC_TAP");\n  const hsQuocTeOptions=configsList.filter(c=>c.categoryType==="HS_CT_QUOC_TE");');

// Fix form state reset
content = content.replace(/kqHocTap:"",/, 'kqHocTap:"",hoSoCtQuocTe:"",');

// Fix the render in table cell:
content = content.replace(/\{s\.kqgdTieuHoc && <div className="text-xs flex items-center gap-2"><span className="text-slate-500 w-14">CT Bộ:<\/span><span className="font-medium text-rose-700 bg-rose-50 px-1\.5 py-0\.5 rounded truncate max-w-\[120px\] block border border-rose-100">\{s\.kqgdTieuHoc\}<\/span><\/div>\}/, '{s.kqgdTieuHoc && <div className="text-xs flex items-center gap-2"><span className="text-slate-500 w-14">CT Bộ:</span><span className="font-medium text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded truncate max-w-[120px] block border border-rose-100" title={"Hồ sơ CT Bộ (Tiểu học)"}>{s.kqgdTieuHoc}</span></div>}\n                            {s.kqHocTap && <div className="text-xs flex items-center gap-2"><span className="text-slate-500 w-14">CT Bộ:</span><span className="font-medium text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded truncate max-w-[120px] block border border-orange-100" title={"Hồ sơ CT Bộ (Trung học)"}>{s.kqHocTap}</span></div>}');

// Fix the render "Quốc Tế" to use hoSoCtQuocTe
content = content.replace(/\{s\.kqHocTap && <div className="text-xs flex items-center gap-2"><span className="text-slate-500 w-14">Quốc tế:<\/span><span className="font-medium text-blue-700 bg-blue-50 px-1\.5 py-0\.5 rounded truncate max-w-\[120px\] block border border-blue-100">\{s\.kqHocTap\}<\/span><\/div>\}/, '{s.hoSoCtQuocTe && <div className="text-xs flex items-center gap-2"><span className="text-slate-500 w-14">Quốc tế:</span><span className="font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded truncate max-w-[120px] block border border-blue-100">{s.hoSoCtQuocTe}</span></div>}');

// Fix the form fields!
// The form previously had 3 fields:
// 1. Hồ sơ CT Bộ (kqgdTieuHoc) -> we replace with conditional CT BO
// 2. Hồ sơ CT Quốc tế (kqHocTap) -> we replace with hoSoCtQuocTe
// 3. KQ Rèn luyện (kqRenLuyen) -> stays the same

const formBo = `<div><label className="block text-sm font-semibold mb-1.5">Hồ sơ CT Bộ</label>{['1','2','3','4','5'].includes(studentForm.grade) ? <select value={studentForm.kqgdTieuHoc} onChange={e=>setStudentForm({...studentForm,kqgdTieuHoc:e.target.value})} className="w-full border rounded-xl px-4 py-2.5 bg-rose-50 border-rose-200"><option value="">-- Chọn --</option>{kqgdThOptions.map((o)=><option key={o.id} value={o.name}>{o.name}</option>)}</select> : <select value={studentForm.kqHocTap} onChange={e=>setStudentForm({...studentForm,kqHocTap:e.target.value})} className="w-full border rounded-xl px-4 py-2.5 bg-orange-50 border-orange-200"><option value="">-- Chọn --</option>{kqhtOptions.map((o)=><option key={o.id} value={o.name}>{o.name}</option>)}</select>}</div>`;

const formQuocTe = `<div><label className="block text-sm font-semibold mb-1.5">Hồ sơ CT Quốc tế</label><select value={studentForm.hoSoCtQuocTe} onChange={e=>setStudentForm({...studentForm,hoSoCtQuocTe:e.target.value})} className="w-full border rounded-xl px-4 py-2.5"><option value="">-- Chọn --</option>{hsQuocTeOptions.map((o)=><option key={o.id} value={o.name}>{o.name}</option>)}</select></div>`;

const oldBo = /<div><label className="block text-sm font-semibold mb-1\.5">Hồ sơ CT Bộ<\/label><select value=\{studentForm\.kqgdTieuHoc\}.+?<\/select><\/div>/;
const oldQuocTe = /<div><label className="block text-sm font-semibold mb-1\.5">Hồ sơ CT Quốc tế<\/label><select value=\{studentForm\.kqHocTap\}.+?<\/select><\/div>/;

content = content.replace(oldBo, formBo);
content = content.replace(oldQuocTe, formQuocTe);

fs.writeFileSync("src/app/admin/input-assessments/client.tsx", content, "utf8");
console.log("Patched full client TSX logic");
