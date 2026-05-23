const fs = require('fs');
let c = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

c = c.replace(
  /const \[subjectForm, setSubjectForm\] = useState\(\{ code:"", name:"", subjectType:"" \}\);/,
  'const [subjectForm, setSubjectForm] = useState({ code:"", name:"", subjectType:"", scoreColumns: 1, commentColumns: 1 });'
);

c = c.replace(
  /const p=editingSubjectId\?\{type:"subject",id:editingSubjectId,data:\{name:subjectForm\.name,subjectType:subjectForm\.subjectType\|\|null\}\}:\{type:"subject",data:\{code:subjectForm\.code,name:subjectForm\.name,subjectType:subjectForm\.subjectType\|\|null\}\};/,
  'const p=editingSubjectId?{type:"subject",id:editingSubjectId,data:{name:subjectForm.name,subjectType:subjectForm.subjectType||null, scoreColumns: subjectForm.scoreColumns, commentColumns: subjectForm.commentColumns}}:{type:"subject",data:{code:subjectForm.code,name:subjectForm.name,subjectType:subjectForm.subjectType||null, scoreColumns: subjectForm.scoreColumns, commentColumns: subjectForm.commentColumns}};'
);

c = c.replace(
  /setSubjectForm\(\{code:"",name:"",subjectType:""\}\)/g,
  'setSubjectForm({code:"",name:"",subjectType:"", scoreColumns: 1, commentColumns: 1})'
);

c = c.replace(
  /setSubjectForm\(\{code:s\.code,name:s\.name,subjectType:s\.subjectType\|\|""\}\)/g,
  'setSubjectForm({code:s.code,name:s.name,subjectType:s.subjectType||"", scoreColumns: s.scoreColumns ?? 1, commentColumns: s.commentColumns ?? 1})'
);

const modalStr = '<div><label className="block text-sm font-semibold mb-1.5">S? c?t ði?m</label><input type="number" min="0" value={subjectForm.scoreColumns} onChange={e=>setSubjectForm({...subjectForm,scoreColumns:parseInt(e.target.value)||0})} className="w-full border rounded-xl px-4 py-2.5"/></div><div><label className="block text-sm font-semibold mb-1.5">S? c?t nh?n xét</label><input type="number" min="0" value={subjectForm.commentColumns} onChange={e=>setSubjectForm({...subjectForm,commentColumns:parseInt(e.target.value)||0})} className="w-full border rounded-xl px-4 py-2.5"/></div>';

c = c.replace(
  /<option value="Th?c hành">Th?c hành<\/option><\/select><\/div><div className="pt-4 flex justify-end gap-3">/g,
  '<option value="Th?c hành">Th?c hành</option></select></div>' + modalStr + '<div className="pt-4 flex justify-end gap-3">'
);

fs.writeFileSync('src/app/admin/input-assessments/client.tsx', c);
console.log('client.tsx updated');
