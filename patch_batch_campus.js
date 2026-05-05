const fs = require("fs");
const file_path = "src/app/admin/input-assessments/client.tsx";
let content = fs.readFileSync(file_path, "utf-8");

content = content.replace(
    /const \[bForm, setBForm\] = useState\(\{ batchNumber:"1", name:"", startDate:"", endDate:"", status:"ACTIVE" \}\)/g,
    'const [bForm, setBForm] = useState({ batchNumber:"1", name:"", startDate:"", endDate:"", status:"ACTIVE", campusId:"" })'
);

content = content.replace(
    /setBForm\(\{ batchNumber: String\(nextBatchNum\), name:"", startDate:"", endDate:"", status:"ACTIVE" \}\);/g,
    'setBForm({ batchNumber: String(nextBatchNum), name:"", startDate:"", endDate:"", status:"ACTIVE", campusId:"" });'
);

content = content.replace(
    /const openEditBatch = \(b:Batch\) => \{ setTargetPeriodId\(b\.periodId\); setEditB\(b\); setBForm\(\{ batchNumber:String\(b\.batchNumber\), name:b\.name, startDate:b\.startDate\?\.slice\(0,10\)\|\|"", endDate:b\.endDate\?\.slice\(0,10\)\|\|"", status:b\.status \}\); setBModal\(true\) \}/g,
    'const openEditBatch = (b:Batch) => { setTargetPeriodId(b.periodId); setEditB(b); setBForm({ batchNumber:String(b.batchNumber), name:b.name, startDate:b.startDate?.slice(0,10)||"", endDate:b.endDate?.slice(0,10)||"", status:b.status, campusId:b.campusId||"" }); setBModal(true) }'
);

const modalContentTarget = '<div className="grid grid-cols-2 gap-3"><Field label="Từ ngày"><input type="date" value={bForm.startDate} onChange={e=>setBForm(f=>({...f,startDate:e.target.value}))} className={inp}/></Field><Field label="Đến ngày"><input type="date" value={bForm.endDate} onChange={e=>setBForm(f=>({...f,endDate:e.target.value}))} className={inp}/></Field></div>';

const modalContentReplacement = `<div className="grid grid-cols-2 gap-3"><Field label="Từ ngày"><input type="date" value={bForm.startDate} onChange={e=>setBForm(f=>({...f,startDate:e.target.value}))} className={inp}/></Field><Field label="Đến ngày"><input type="date" value={bForm.endDate} onChange={e=>setBForm(f=>({...f,endDate:e.target.value}))} className={inp}/></Field></div>
           <Field label="Cơ sở">
              <select value={bForm.campusId} onChange={e=>setBForm(f=>({...f,campusId:e.target.value}))} className={inp}>
                 <option value="">-- Chọn cơ sở --</option>
                 {campuses.map(c=><option key={c.id} value={c.id}>{c.campusName}</option>)}
              </select>
           </Field>`;

content = content.replace(modalContentTarget, modalContentReplacement);

fs.writeFileSync(file_path, content, "utf-8");
console.log("Patched client.tsx for batch campusId");
