const fs = require("fs");
let content = fs.readFileSync("src/app/admin/input-assessments/client.tsx", "utf8");

const tTarget = `<select value={studentForm.hocKy} onChange={e=>setStudentForm({...studentForm,hocKy:e.target.value})} className="w-full border rounded-xl px-4 py-2.5"><option value="">-- Chọn --</option>{hkOptions.map((o)=><option key={o.id} value={o.name}>{o.name}</option>)}</select>`;

const tReplace = `<select value={studentForm.hocKy} onChange={e=>setStudentForm({...studentForm,hocKy:e.target.value})} className="w-full border rounded-xl px-4 py-2.5"><option value="">-- Chọn --</option>{hkOptions.map((o)=>{ const ay = academicYears?.find((y:any)=>y.id===o.academicYearId); const label = ay ? o.name + " (" + ay.name + ")" : o.name; return <option key={o.id} value={o.name}>{label}</option>; })}</select>`;

content = content.replace(tTarget, tReplace);

fs.writeFileSync("src/app/admin/input-assessments/client.tsx", content, "utf8");
console.log("Patched hk dropdown");
