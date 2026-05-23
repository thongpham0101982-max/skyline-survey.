const fs = require('fs');
let c = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

if (!c.includes('isColumnConfigOpen')) {
    // 1. Add states
    c = c.replace(
        /const \[isSubjectOpen, setIsSubjectOpen\] = useState\(false\);/,
        'const [isSubjectOpen, setIsSubjectOpen] = useState(false);\n  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);\n  const [columnConfigForm, setColumnConfigForm] = useState({ subjectId: "", name: "", scoreNames: [], commentNames: [], scoreColumns: 1, commentColumns: 1 });'
    );

    // 2. Add open function for Column Config
    const handlerStr = `
  const handleColumnConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = {
      type: "subject",
      id: columnConfigForm.subjectId,
      data: {
        columnNames: JSON.stringify({
          scores: columnConfigForm.scoreNames,
          comments: columnConfigForm.commentNames
        })
      }
    };
    const r = await fetch("/api/input-assessment-categories", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    if (r.ok) {
      setIsColumnConfigOpen(false);
      fetchSubjects();
    } else alert((await r.json()).error);
  };
    `.replace(/\n/g, ' ');

    c = c.replace(/const handleSubjectSubmit/, handlerStr + '\n  const handleSubjectSubmit');

    // 3. Update the Span to a clickable Button
    c = c.replace(
        /<td className="px-5 py-3 text-center"><span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">\{s\.scoreColumns \?\? 1\} cột điểm \/ \{s\.commentColumns \?\? 1\} cột NX<\/span><\/td>/g,
        '<td className="px-5 py-3 text-center"><button type="button" onClick={()=>{let cn={scores:[],comments:[]}; try{if(s.columnNames) cn=JSON.parse(s.columnNames);}catch(e){} setColumnConfigForm({subjectId:s.id, name:s.name, scoreNames:cn.scores||[], commentNames:cn.comments||[], scoreColumns: s.scoreColumns||1, commentColumns: s.commentColumns||1}); setIsColumnConfigOpen(true);}} className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm">{s.scoreColumns ?? 1} cột điểm / {s.commentColumns ?? 1} cột NX</button></td>'
    );

    // 4. Add the Column Config Modal
    const configModal = `
      {/* COLUMN CONFIG MODAL */}
      {isColumnConfigOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-lg">Đặt tên cột phân hệ: {columnConfigForm.name}</h3>
              <button type="button" onClick={() => setIsColumnConfigOpen(false)} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleColumnConfigSubmit} className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              
              <div>
                <h4 className="font-bold text-indigo-800 mb-3 flex items-center gap-2 border-b pb-2"><BookOpen className="w-4 h-4"/> Đặt tên {columnConfigForm.scoreColumns} Cột Điểm</h4>
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({length: columnConfigForm.scoreColumns}).map((_, i) => (
                    <div key={'s'+i}>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tên Cột điểm {i+1}</label>
                      <input 
                        value={columnConfigForm.scoreNames[i] || ''} 
                        onChange={e => {
                          const n = [...columnConfigForm.scoreNames];
                          n[i] = e.target.value;
                          setColumnConfigForm({...columnConfigForm, scoreNames: n});
                        }} 
                        placeholder={'Điểm ' + (i+1)}
                        className="w-full border rounded-lg px-3 py-2 text-sm font-medium focus:border-indigo-500 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-emerald-800 mt-6 mb-3 flex items-center gap-2 border-b pb-2"><Layers className="w-4 h-4"/> Đặt tên {columnConfigForm.commentColumns} Cột Nhận Xét</h4>
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({length: columnConfigForm.commentColumns}).map((_, i) => (
                    <div key={'c'+i}>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tên Cột nhận xét {i+1}</label>
                      <input 
                        value={columnConfigForm.commentNames[i] || ''} 
                        onChange={e => {
                          const n = [...columnConfigForm.commentNames];
                          n[i] = e.target.value;
                          setColumnConfigForm({...columnConfigForm, commentNames: n});
                        }} 
                        placeholder={'Nhận xét ' + (i+1)}
                        className="w-full border rounded-lg px-3 py-2 text-sm font-medium focus:border-emerald-500 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 mt-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button type="button" onClick={() => setIsColumnConfigOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium">Hủy</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 font-medium">Lưu Cấu Hình</button>
              </div>
            </form>
          </div>
        </div>
      )}
    `.replace(/\n/g, ' ');

    c = c.replace(/\{\/\* STUDENT MODAL \*\/\}/, configModal + '{/* STUDENT MODAL */}');

    fs.writeFileSync('src/app/admin/input-assessments/client.tsx', c, 'utf8');
}
console.log('Admin UI modified for column config');
