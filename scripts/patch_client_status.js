const fs = require('fs');
let c = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

// 1. Initial State
c = c.replace(
  /useState\(\{ code:"", name:"", subjectType:"", scoreColumns: 1, commentColumns: 1 \}\)/,
  'useState({ code:"", name:"", subjectType:"", scoreColumns: 1, commentColumns: 1, status: "ACTIVE" })'
);

// 2. Add button state
c = c.replace(
  /setSubjectForm\(\{code:"",name:"",subjectType:"", scoreColumns: 1, commentColumns: 1\}\)/g,
  'setSubjectForm({code:"",name:"",subjectType:"", scoreColumns: 1, commentColumns: 1, status: "ACTIVE"})'
);

// 3. Edit button state
c = c.replace(
  /setSubjectForm\(\{code:s\.code,name:s\.name,subjectType:s\.subjectType\|\|"", scoreColumns: s\.scoreColumns \?\? 1, commentColumns: s\.commentColumns \?\? 1\}\)/g,
  'setSubjectForm({code:s.code,name:s.name,subjectType:s.subjectType||"", scoreColumns: s.scoreColumns ?? 1, commentColumns: s.commentColumns ?? 1, status: s.status || "ACTIVE"})'
);

// 4. Payload in handleSubjectSubmit
c = c.replace(
  /commentColumns: subjectForm\.commentColumns\}\}/g,
  'commentColumns: subjectForm.commentColumns, status: subjectForm.status||"ACTIVE"}}'
);

// 5. Modal UI
const statusUI = '<div><label className="block text-sm font-semibold mb-1.5">Trạng thái</label><select value={subjectForm.status} onChange={e=>setSubjectForm({...subjectForm,status:e.target.value})} className="w-full border rounded-xl px-4 py-2.5"><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Ngưng</option></select></div>';

c = c.replace(
  /onChange=\{e=>setSubjectForm\(\{\.\.\.subjectForm,commentColumns:parseInt\(e\.target\.value\)\|\|0\}\)\} className="w-full border rounded-xl px-4 py-2\.5"\/><\/div><div className="pt-4 flex justify-end gap-3">/g,
  'onChange={e=>setSubjectForm({...subjectForm,commentColumns:parseInt(e.target.value)||0})} className="w-full border rounded-xl px-4 py-2.5"/></div>' + statusUI + '<div className="pt-4 flex justify-end gap-3">'
);


fs.writeFileSync('src/app/admin/input-assessments/client.tsx', c, 'utf8');
console.log('client.tsx updated for status UI');
