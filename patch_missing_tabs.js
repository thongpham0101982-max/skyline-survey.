const fs = require('fs');
let content = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

// 1. Insert states
const states_injection = `
  // ───────── SUBJECTS & MAPPING STATE ─────────
  const [subjectsList, setSubjectsList] = useState<any[]>(initialSubjects||[]);
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);
  const [columnConfigForm, setColumnConfigForm] = useState({ subjectId: "", name: "", scoreNames: [], commentNames: [], showScoreInReport: [], showCommentInReport: [], scoreColumns: 1, commentColumns: 1 });
  const [editingSubjectId, setEditingSubjectId] = useState<string|null>(null);
  const [subjectForm, setSubjectForm] = useState({ code:"", name:"", subjectType:"", scoreColumns: 1, commentColumns: 1, status: "ACTIVE" });
  const [selGrades, setSelGrades] = useState<string[]>((grades && grades.length) ? [grades[0]]:[]);
  const [selEdus, setSelEdus] = useState<string[]>((eduSystems && eduSystems.length) ? [eduSystems[0].code]:[]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [mappingLoading, setMappingLoading] = useState(false);
`;
content = content.replace('  // ───────── CONFIGS STATE ─────────', states_injection + '\n  // ───────── CONFIGS STATE ─────────');

// 2. Insert fetchers and functions
const funcs_injection = `
  const fetchSubjects=async()=>{const r=await fetch("/api/input-assessment-categories?type=subject");if(r.ok)setSubjectsList(await r.json())};
  const fetchMappings=async()=>{setMappingLoading(true);try{const r=await fetch(\`/api/grade-subject-mappings?grades=\${selGrades.join(",")}&eduSystems=\${selEdus.join(",")}\`);if(r.ok)setMappings(await r.json())}catch(e){}setMappingLoading(false)};

  useEffect(()=>{if(selGrades.length&&selEdus.length)fetchMappings();else setMappings([])},[selGrades,selEdus]);

  const handleColumnConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = {
      type: "subject",
      id: columnConfigForm.subjectId,
      data: {
        columnNames: JSON.stringify({
          scores: columnConfigForm.scoreNames,
          comments: columnConfigForm.commentNames,
          showScoreInReport: columnConfigForm.showScoreInReport,
          showCommentInReport: columnConfigForm.showCommentInReport
        })
      }
    };
    const r = await fetch("/api/input-assessment-categories", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    if (r.ok) {
      setIsColumnConfigOpen(false);
      fetchSubjects();
    } else alert((await r.json()).error);
  };     
  
  const handleSubjectSubmit=async(e:React.FormEvent)=>{e.preventDefault();const p=editingSubjectId?{type:"subject",id:editingSubjectId,data:{name:subjectForm.name,subjectType:subjectForm.subjectType||null, scoreColumns: subjectForm.scoreColumns, commentColumns: subjectForm.commentColumns, status: subjectForm.status||"ACTIVE"}}:{type:"subject",data:{code:subjectForm.code,name:subjectForm.name,subjectType:subjectForm.subjectType||null, scoreColumns: subjectForm.scoreColumns, commentColumns: subjectForm.commentColumns, status: subjectForm.status||"ACTIVE"}};const r=await fetch("/api/input-assessment-categories",{method:editingSubjectId?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)});if(r.ok){setIsSubjectOpen(false);fetchSubjects()}else alert((await r.json()).error)};
  
  const deleteSubject=async(id:string)=>{if(!confirm("Xóa?"))return;await fetch("/api/input-assessment-categories?type=subject&id="+id,{method:"DELETE"});fetchSubjects()};
  
  const addMapping=async(sid:string)=>{const r=await fetch("/api/grade-subject-mappings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({grades:selGrades,eduSystems:selEdus,subjectId:sid})});if(r.ok)fetchMappings();else alert((await r.json()).error)};
  
  const removeMapping=async(sid:string)=>{await fetch("/api/grade-subject-mappings?subjectId="+sid+"&grades="+selGrades.join(",")+"&eduSystems="+selEdus.join(","),{method:"DELETE"});fetchMappings()};
  
  const assignedIds=[...new Set(mappings.map(m=>m.subjectId))];
  const uniqueAssigned=assignedIds.map(sid=>mappings.find(x=>x.subjectId===sid)).filter(Boolean);
  const availableSubjects=subjectsList.filter(s=>!assignedIds.includes(s.id));
  const toggleGrade=(g:string)=>setSelGrades(p=>p.includes(g)?p.filter(x=>x!==g):[...p,g]);
  const toggleEdu=(c:string)=>setSelEdus(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c]);
`;
content = content.replace('  const fetchStudents = useCallback', funcs_injection + '\n  const fetchStudents = useCallback');

// 3. Replace placeholders with the actual UI code
const ui_code = `
      {/* ===== TAB: SUBJECTS (RESTORED) ===== */}
      {tab==="subjects"&&(
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between px-6 py-5 border-b bg-slate-50/50">
             <h3 className="font-black text-slate-800 flex items-center gap-2 text-base"><BookOpen className="w-5 h-5 text-indigo-500"/>Môn khảo sát <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs">{subjectsList.length}</span></h3>
             <button onClick={()=>{setEditingSubjectId(null);setSubjectForm({code:"",name:"",subjectType:"", scoreColumns: 1, commentColumns: 1, status: "ACTIVE"});setIsSubjectOpen(true)}} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all"><Plus className="w-3.5 h-3.5"/>Thêm mới</button>
          </div>
          {subjectsList.length===0?<Empty icon={BookOpen} text="Chưa có môn khảo sát nào" sub="Bấm Thêm mới để tạo môn khảo sát"/>:(
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-white text-slate-400 text-[10px] font-black uppercase tracking-widest border-b"><th className="px-6 py-4 text-left w-12">STT</th><th className="px-6 py-4 text-left">Mã</th><th className="px-6 py-4 text-left">Tên môn</th><th className="px-6 py-4 text-left">Loại</th><th className="px-6 py-4 text-center">Cấu hình cột</th><th className="px-6 py-4 text-left">Trạng thái</th><th className="px-6 py-4 text-center w-24">Thao tác</th></tr></thead>
              <tbody className="divide-y divide-slate-50">{subjectsList.map((s:any,i:number)=>(<tr key={s.id} className="hover:bg-indigo-50/30 transition-colors"><td className="px-6 py-4 text-slate-400 font-bold">{i+1}</td><td className="px-6 py-4 font-mono font-black text-indigo-600 bg-indigo-50/30">{s.code}</td><td className="px-6 py-4 font-black text-slate-700">{s.name}</td><td className="px-6 py-4">{s.subjectType?<span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 uppercase tracking-widest border border-blue-100">{s.subjectType}</span>:'-'}</td><td className="px-6 py-4 text-center"><button type="button" onClick={()=>{let cn={scores:[],comments:[],showScoreInReport:[],showCommentInReport:[]}; try{if(s.columnNames) cn=JSON.parse(s.columnNames);}catch(e){} setColumnConfigForm({subjectId:s.id, name:s.name, scoreNames:cn.scores||[], commentNames:cn.comments||[], showScoreInReport:cn.showScoreInReport||[], showCommentInReport:cn.showCommentInReport||[], scoreColumns: s.scoreColumns||1, commentColumns: s.commentColumns||1}); setIsColumnConfigOpen(true);}} className="text-[10px] font-bold text-indigo-600 bg-white border border-indigo-200 px-3 py-1.5 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all uppercase tracking-widest shadow-sm">{s.scoreColumns ?? 1} ĐIỂM / {s.commentColumns ?? 1} NX</button></td><td className="px-6 py-4"><span className={\`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest border \${s.status==='ACTIVE'?'bg-emerald-50 text-emerald-600 border-emerald-100':'bg-slate-50 text-slate-500 border-slate-200'}\`}>{s.status==='ACTIVE'?'Hoạt động':'Ngừng'}</span></td><td className="px-6 py-4 text-center"><div className="flex gap-1 justify-center"><button onClick={()=>{setEditingSubjectId(s.id);setSubjectForm({code:s.code,name:s.name,subjectType:s.subjectType||"", scoreColumns: s.scoreColumns ?? 1, commentColumns: s.commentColumns ?? 1, status: s.status || "ACTIVE"});setIsSubjectOpen(true)}} className="p-2 text-slate-300 hover:text-indigo-600 rounded-xl hover:bg-indigo-50 transition-colors"><Pencil className="w-4 h-4"/></button><button onClick={()=>deleteSubject(s.id)} className="p-2 text-slate-300 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-colors"><Trash2 className="w-4 h-4"/></button></div></td></tr>))}</tbody></table></div>
          )}
        </div>
      )}

      {/* ===== TAB: MAPPING (RESTORED) ===== */}
      {tab==="mapping"&&(
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="flex-1">
              <h3 className="font-black text-slate-800 mb-1 flex items-center gap-2 text-lg"><Layers className="w-6 h-6 text-indigo-500"/>Cấu hình Khối & Hệ học</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Chọn tổ hợp Khối và Hệ học để gán môn khảo sát</p>
            </div>
            
            <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-2xl w-full md:w-auto">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 w-12">Khối</span>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={()=>setSelGrades(selGrades.length===grades.length?[]:[...grades])} className={\`text-[11px] px-3 py-1.5 rounded-xl border font-black uppercase tracking-wider transition-all \${selGrades.length===grades.length?'bg-indigo-600 text-white border-indigo-600 shadow-sm':'bg-white text-slate-500 hover:border-indigo-300'}\`}>All</button>
                  {grades.map((g:string)=>(<button key={g} onClick={()=>toggleGrade(g)} className={\`text-[11px] px-3 py-1.5 rounded-xl border font-black uppercase tracking-wider transition-all \${selGrades.includes(g)?'bg-indigo-100 text-indigo-700 border-indigo-300':'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}\`}>{g}</button>))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 w-12">Hệ</span>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={()=>setSelEdus(selEdus.length===eduSystems.length?[]:eduSystems.map((e:any)=>e.code))} className={\`text-[11px] px-3 py-1.5 rounded-xl border font-black uppercase tracking-wider transition-all \${selEdus.length===eduSystems.length?'bg-fuchsia-600 text-white border-fuchsia-600 shadow-sm':'bg-white text-slate-500 hover:border-fuchsia-300'}\`}>All</button>
                  {eduSystems.map((es:any)=>(<button key={es.code} onClick={()=>toggleEdu(es.code)} className={\`text-[11px] px-3 py-1.5 rounded-xl border font-black uppercase tracking-wider transition-all \${selEdus.includes(es.code)?'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300':'bg-white text-slate-500 border-slate-200 hover:border-fuchsia-300'}\`}>{es.code}</button>))}
                </div>
              </div>
            </div>
          </div>
          
          {selGrades.length>0&&selEdus.length>0&&(
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-indigo-100 flex flex-col h-full">
                <div className="px-6 py-5 border-b bg-indigo-50/50 flex items-center justify-between">
                   <div>
                     <h4 className="font-black text-indigo-900 flex items-center gap-2 text-base"><Check className="w-5 h-5 text-indigo-500"/>Đã gán ({uniqueAssigned.length})</h4>
                     <p className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-widest mt-0.5">Sẽ xuất hiện ở form nhập điểm</p>
                   </div>
                </div>
                {mappingLoading?<div className="p-10 text-center"><Spin/></div>:uniqueAssigned.length===0?<div className="p-10 text-center text-[11px] font-black uppercase tracking-widest text-slate-300">Chưa có môn nào</div>:(
                  <div className="p-5 space-y-2.5 bg-indigo-50/10 flex-1">{uniqueAssigned.map((m:any,i:number)=>(<div key={m.subjectId} className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-5 py-4 hover:border-indigo-300 group transition-all shadow-sm"><div className="flex items-center gap-4"><div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black">{i+1}</div><div><div className="flex items-center gap-2"><span className="font-black text-slate-700">{m.subject?.name}</span>{m.subject?.subjectType&&<span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 uppercase tracking-wider">{m.subject.subjectType}</span>}</div><span className="text-[10px] font-bold font-mono text-slate-400 mt-0.5 block">{m.subject?.code}</span></div></div><button onClick={()=>removeMapping(m.subjectId)} className="p-2 text-slate-300 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-colors"><Trash2 className="w-4 h-4"/></button></div>))}</div>
                )}
              </div>
              <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-200 flex flex-col h-full">
                <div className="px-6 py-5 border-b bg-slate-50 flex items-center justify-between">
                   <div>
                     <h4 className="font-black text-slate-800 flex items-center gap-2 text-base"><Settings className="w-5 h-5 text-slate-400"/>Chưa gán ({availableSubjects.length})</h4>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Bấm để gán vào tổ hợp {selGrades.length*selEdus.length} lựa chọn</p>
                   </div>
                </div>
                {availableSubjects.length===0?<div className="p-10 text-center text-[11px] font-black uppercase tracking-widest text-slate-300">Đã gán hết</div>:(
                  <div className="p-5 space-y-2.5 bg-slate-50/30 flex-1">{availableSubjects.map((s:any)=>(<button key={s.id} onClick={()=>addMapping(s.id)} className="w-full flex items-center justify-between bg-white border border-dashed border-slate-300 rounded-2xl px-5 py-4 hover:border-emerald-400 hover:bg-emerald-50 text-left transition-all group"><div className="flex items-center gap-4"><div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 flex items-center justify-center transition-colors"><Plus className="w-4 h-4"/></div><div><div className="flex items-center gap-2"><span className="font-black text-slate-700">{s.name}</span>{s.subjectType&&<span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 uppercase tracking-wider group-hover:bg-emerald-100 group-hover:text-emerald-700">{s.subjectType}</span>}</div><span className="text-[10px] font-bold font-mono text-slate-400 mt-0.5 block">{s.code}</span></div></div><span className="text-[10px] text-emerald-600 font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Gán môn</span></button>))}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
`;

content = content.replace('{["mapping", "subjects", "reports"].includes(tab) && (\n        <Empty icon={GraduationCap} text="Đang xây dựng" sub="Phần này sẽ sớm được hoàn thiện"/>\n      )}', ui_code + '\n      {/* ===== OTHER TABS PLACEHOLDERS ===== */}\n      {["reports"].includes(tab) && (\n        <Empty icon={GraduationCap} text="Đang xây dựng" sub="Phần này sẽ sớm được hoàn thiện"/>\n      )}');

// 4. Insert Modals for Subjects
const modal_injection = `
      <Modal open={isSubjectOpen} onClose={()=>setIsSubjectOpen(false)} title="Thông tin Môn Khảo sát" footer={<><button onClick={()=>setIsSubjectOpen(false)} className="flex-1 py-3 text-xs font-black uppercase text-slate-400">Hủy</button> <button onClick={handleSubjectSubmit} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100">Hoàn tất</button></>}>
        <div className="space-y-4">
           <Field label="Mã Môn" required><input value={subjectForm.code} onChange={e=>setSubjectForm(f=>({...f,code:e.target.value.toUpperCase()}))} className={inp}/></Field>
           <Field label="Tên Môn" required><input value={subjectForm.name} onChange={e=>setSubjectForm(f=>({...f,name:e.target.value}))} className={inp}/></Field>
           <Field label="Phân loại (Anh văn)"><select value={subjectForm.subjectType} onChange={e=>setSubjectForm(f=>({...f,subjectType:e.target.value}))} className={inp}><option value="">-- Môn bình thường --</option><option value="VIET_NAM">Tiếng Anh (GV VN)</option><option value="NUOC_NGOAI">Tiếng Anh (GV Nước ngoài)</option></select></Field>
           <div className="grid grid-cols-2 gap-3"><Field label="Số cột Điểm"><input type="number" min="0" max="5" value={subjectForm.scoreColumns} onChange={e=>setSubjectForm(f=>({...f,scoreColumns:parseInt(e.target.value)||0}))} className={inp}/></Field><Field label="Số cột Nhận xét"><input type="number" min="0" max="5" value={subjectForm.commentColumns} onChange={e=>setSubjectForm(f=>({...f,commentColumns:parseInt(e.target.value)||0}))} className={inp}/></Field></div>
           <Field label="Trạng thái"><select value={subjectForm.status} onChange={e=>setSubjectForm(f=>({...f,status:e.target.value}))} className={inp}><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Ngừng</option></select></Field>
        </div>
      </Modal>

      <Modal open={isColumnConfigOpen} onClose={()=>setIsColumnConfigOpen(false)} title={\`Cấu hình cột: \${columnConfigForm.name}\`} footer={<><button onClick={()=>setIsColumnConfigOpen(false)} className="flex-1 py-3 text-xs font-black uppercase text-slate-400">Hủy</button> <button onClick={handleColumnConfigSubmit} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100">Lưu cấu hình</button></>}>
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
           <div>
              <h4 className="text-sm font-black text-slate-700 mb-3 border-b pb-2">Tên cột Điểm (Tối đa {columnConfigForm.scoreColumns})</h4>
              <div className="space-y-3">
                 {Array.from({length: columnConfigForm.scoreColumns}).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 w-16">Cột {i+1}</span>
                       <input value={columnConfigForm.scoreNames[i]||""} onChange={e=>{const n=[...columnConfigForm.scoreNames];n[i]=e.target.value;setColumnConfigForm(f=>({...f,scoreNames:n}))}} placeholder="Vd: Điểm viết" className={inp}/>
                       <label className="flex items-center gap-1 text-[10px] font-black text-indigo-600 whitespace-nowrap"><input type="checkbox" checked={columnConfigForm.showScoreInReport[i]||false} onChange={e=>{const r=[...columnConfigForm.showScoreInReport];r[i]=e.target.checked;setColumnConfigForm(f=>({...f,showScoreInReport:r}))}} className="rounded text-indigo-600"/> Lên Phiếu</label>
                    </div>
                 ))}
              </div>
           </div>
           <div>
              <h4 className="text-sm font-black text-slate-700 mb-3 border-b pb-2">Tên cột Nhận xét (Tối đa {columnConfigForm.commentColumns})</h4>
              <div className="space-y-3">
                 {Array.from({length: columnConfigForm.commentColumns}).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 w-16">NX {i+1}</span>
                       <input value={columnConfigForm.commentNames[i]||""} onChange={e=>{const n=[...columnConfigForm.commentNames];n[i]=e.target.value;setColumnConfigForm(f=>({...f,commentNames:n}))}} placeholder="Vd: Nhận xét chung" className={inp}/>
                       <label className="flex items-center gap-1 text-[10px] font-black text-indigo-600 whitespace-nowrap"><input type="checkbox" checked={columnConfigForm.showCommentInReport[i]||false} onChange={e=>{const r=[...columnConfigForm.showCommentInReport];r[i]=e.target.checked;setColumnConfigForm(f=>({...f,showCommentInReport:r}))}} className="rounded text-indigo-600"/> Lên Phiếu</label>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </Modal>
`;
content = content.replace('{/* ============= MODALS ============= */}', '{/* ============= MODALS ============= */}\n' + modal_injection);

fs.writeFileSync('src/app/admin/input-assessments/client.tsx', content, 'utf8');
console.log("PATCH SUCCESSFUL");
