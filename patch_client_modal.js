const fs = require('fs');
let c = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

const regex = /<option value="Thực hành">Thực hành<\/option><\/select><\/div><div className="pt-4 flex justify-end gap-3">/g;

const modalInputs = `
<option value="Thực hành">Thực hành</option></select></div>
<div>
  <label className="block text-sm font-semibold mb-1.5">Số cột điểm</label>
  <input type="number" min="0" value={subjectForm.scoreColumns} onChange={e=>setSubjectForm({...subjectForm,scoreColumns:parseInt(e.target.value)||0})} className="w-full border rounded-xl px-4 py-2.5"/>
</div>
<div>
  <label className="block text-sm font-semibold mb-1.5">Số cột nhận xét</label>
  <input type="number" min="0" value={subjectForm.commentColumns} onChange={e=>setSubjectForm({...subjectForm,commentColumns:parseInt(e.target.value)||0})} className="w-full border rounded-xl px-4 py-2.5"/>
</div>
<div>
  <label className="block text-sm font-semibold mb-1.5">Trạng thái</label>
  <select value={subjectForm.status} onChange={e=>setSubjectForm({...subjectForm,status:e.target.value})} className="w-full border rounded-xl px-4 py-2.5">
    <option value="ACTIVE">Hoạt động</option>
    <option value="INACTIVE">Ngưng</option>
  </select>
</div>
<div className="pt-4 flex justify-end gap-3">
`.replace(/\n/g, '');

c = c.replace(regex, modalInputs);

// Also need to handle states because previous script patch_client_status.js actually successfully replaced states?
// Let's check status state just in case.
if(!c.match(/status: "ACTIVE"/)) {
    c = c.replace(
      /useState\(\{ code:"", name:"", subjectType:"", scoreColumns: 1, commentColumns: 1 \}\)/,
      'useState({ code:"", name:"", subjectType:"", scoreColumns: 1, commentColumns: 1, status: "ACTIVE" })'
    );

    c = c.replace(
      /setSubjectForm\(\{code:"",name:"",subjectType:"", scoreColumns: 1, commentColumns: 1\}\)/g,
      'setSubjectForm({code:"",name:"",subjectType:"", scoreColumns: 1, commentColumns: 1, status: "ACTIVE"})'
    );

    c = c.replace(
      /setSubjectForm\(\{code:s\.code,name:s\.name,subjectType:s\.subjectType\|\|"", scoreColumns: s\.scoreColumns \?\? 1, commentColumns: s\.commentColumns \?\? 1\}\)/g,
      'setSubjectForm({code:s.code,name:s.name,subjectType:s.subjectType||"", scoreColumns: s.scoreColumns ?? 1, commentColumns: s.commentColumns ?? 1, status: s.status || "ACTIVE"})'
    );

    c = c.replace(
      /commentColumns: subjectForm\.commentColumns\}\}/g,
      'commentColumns: subjectForm.commentColumns, status: subjectForm.status||"ACTIVE"}}'
    );
}

fs.writeFileSync('src/app/admin/input-assessments/client.tsx', c, 'utf8');
console.log('Modal fully patched');
